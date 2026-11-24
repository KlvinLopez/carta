"""T-3.0: el disparador de avisos del ADR-018 (`fn_avisar_cambio`, migración 0004).

Con `LISTEN` en otra conexión, cada tabla de la lista cerrada de 03 §2.4 emite **un** aviso por
canal al confirmar (`carta_mesa` con la sesión, `carta_restaurante` con el restaurante) y
ninguno si la transacción se deshace; el aviso sólo lleva el id. Y la lista no se puede
quedar corta: toda tabla del esquema está clasificada (avisa o es excepción con su porqué) y
lo que lee `leer_estado` (la foto que pinta el comensal) avisa. T-3.4 añade aquí la lectura
del estado del personal (`LECTORES`).

Las pruebas de avisos necesitan datos **confirmados**: `NOTIFY` sólo se entrega al confirmar,
y la transacción por prueba de `tests/conftest.py` nunca confirma. La fixture `mesa_viva`
confirma su escenario con su propia conexión y lo borra al terminar (skill `/pruebas` §3).
"""

from __future__ import annotations

import asyncio
import re
import time
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import dataclass
from typing import Any

import asyncpg
import pytest
from sqlalchemy import event, text
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import Base
from app.db.models import Mesa, MiembroSesion, Restaurante, SesionGrupal
from app.services import sesion as servicio_sesion

CANALES = ("carta_mesa", "carta_restaurante")

# 03 §2.4: lo que ven la mesa y el personal avisa; el resto es excepción con su porqué.
OBSERVADAS = {
    "sesion_grupal",
    "miembro_sesion",
    "orden_personal",
    "item_orden",
    "comanda",
    "comanda_orden",
    "llamada_mesero",
    "reparto_cargo",
    "movimiento_cargo",
    "solicitud_entrada",
    "marca_ciclo",
    "mesa",
    "restaurante",
    "ajuste_restaurante",
    "permiso_rol",
    "personal_restaurante",
}
EXCEPCIONES = {
    "platillo": "el menú no viaja por la línea: es público, cacheable y se refresca (ADR-016)",
    "categoria_menu": "ídem: parte del menú público",
    "evento_analitica": "no cambia lo que ve una mesa ni el personal",
    "clave_idempotencia": "respuestas guardadas; no es estado de la mesa",
    "importacion_menu": "sólo la ve el operador, que pregunta mientras espera (ADR-018 §10)",
    "usuario": "cuenta del operador; no la lee ninguna línea",
    "operador_restaurante": "no la lee ninguna línea (T-3.7 la añade si su línea la revalida)",
}


def _url_asyncpg(url_bd: str) -> str:
    return url_bd.replace("postgresql+asyncpg://", "postgresql://", 1)


# ---------------------------------------------------------------------------
# Escenario confirmado: un restaurante con una mesa viva y todo lo que cuelga de ella
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class MesaViva:
    restaurante: uuid.UUID
    usuario: uuid.UUID
    mesa: uuid.UUID
    platillo: uuid.UUID
    personal: uuid.UUID
    sesion: uuid.UUID
    miembro: uuid.UUID
    orden: uuid.UUID
    item: uuid.UUID
    comanda: uuid.UUID
    llamada: uuid.UUID


async def _crear(conexion: asyncpg.Connection) -> MesaViva:
    sufijo = uuid.uuid4().hex[:12]
    uno = conexion.fetchval
    r = await uno(
        "INSERT INTO restaurante (nombre, slug) VALUES ('Aviso', $1) RETURNING id",
        f"aviso-{sufijo}",
    )
    u = await uno(
        "INSERT INTO usuario (firebase_uid, provider) VALUES ($1, 'google') RETURNING id",
        f"aviso-{sufijo}",
    )
    m = await uno(
        "INSERT INTO mesa (restaurante_id, numero, codigo_publico) VALUES ($1, 7, $2) RETURNING id",
        r,
        f"aviso-{sufijo}-" + "x" * 16,
    )
    p = await uno(
        "INSERT INTO platillo (restaurante_id, nombre, precio) VALUES ($1, 'Flan', 60) RETURNING id",
        r,
    )
    pr = await uno(
        "INSERT INTO personal_restaurante (restaurante_id, nombre, pin_hash) "
        "VALUES ($1, 'Marisol', '$argon2id$v=19$m=65536,t=3,p=4$abc$def') RETURNING id",
        r,
    )
    s = await uno(
        "INSERT INTO sesion_grupal (mesa_id, restaurante_id) VALUES ($1, $2) RETURNING id", m, r
    )
    mb = await uno("INSERT INTO miembro_sesion (sesion_id) VALUES ($1) RETURNING id", s)
    o = await uno(
        "INSERT INTO orden_personal (sesion_id, miembro_id) VALUES ($1, $2) RETURNING id", s, mb
    )
    it = await uno(
        "INSERT INTO item_orden (orden_id, platillo_id, precio_unitario, subtotal, "
        "pedido_por_miembro_id) VALUES ($1, $2, 60, 60, $3) RETURNING id",
        o,
        p,
        mb,
    )
    c = await uno(
        "INSERT INTO comanda (restaurante_id, mesa_id, sesion_id) VALUES ($1, $2, $3) RETURNING id",
        r,
        m,
        s,
    )
    ll = await uno(
        "INSERT INTO llamada_mesero (restaurante_id, mesa_id, sesion_id, miembro_id) "
        "VALUES ($1, $2, $3, $4) RETURNING id",
        r,
        m,
        s,
        mb,
    )
    return MesaViva(r, u, m, p, pr, s, mb, o, it, c, ll)


async def _borrar(conexion: asyncpg.Connection, datos: MesaViva) -> None:
    # La orden sigue `armando` (no bloqueada): borrar la sesión arrastra órdenes e ítems, y
    # después el restaurante su platillo (ya sin ítems que lo retengan, INV-4).
    await conexion.execute("DELETE FROM sesion_grupal WHERE restaurante_id = $1", datos.restaurante)
    await conexion.execute("DELETE FROM restaurante WHERE id = $1", datos.restaurante)
    await conexion.execute("DELETE FROM usuario WHERE id = $1", datos.usuario)


@pytest.fixture
async def mesa_viva(esquema_migrado: str) -> AsyncIterator[MesaViva]:
    """Datos confirmados de verdad (los avisos sólo salen al confirmar); se borran al final."""
    conexion = await asyncpg.connect(_url_asyncpg(esquema_migrado))
    try:
        async with conexion.transaction():
            datos = await _crear(conexion)
        yield datos
        async with conexion.transaction():
            await _borrar(conexion, datos)
        assert (
            await conexion.fetchval(
                "SELECT count(*) FROM restaurante WHERE id = $1", datos.restaurante
            )
            == 0
        )
    finally:
        await conexion.close()


class Oyente:
    """Una conexión con `LISTEN` en los dos canales que junta lo que llega."""

    def __init__(self, conexion: asyncpg.Connection) -> None:
        self.conexion = conexion
        self.recibidos: list[tuple[str, str]] = []

    def _al_recibir(self, _c: object, _pid: int, canal: str, carga: str) -> None:
        self.recibidos.append((canal, carga))

    async def escuchar(self) -> None:
        for canal in CANALES:
            await self.conexion.add_listener(canal, self._al_recibir)

    async def esperar(self, cuantos: int, plazo: float = 3.0) -> list[tuple[str, str]]:
        """Espera hasta tener `cuantos` avisos y después da una vuelta más para ver que no
        llega ninguno de sobra (los avisos llegan cuando la conexión vuelve a estar libre)."""
        limite = time.monotonic() + plazo
        while len(self.recibidos) < cuantos and time.monotonic() < limite:
            await self.conexion.execute("SELECT 1")
            await asyncio.sleep(0.02)
        for _ in range(5):
            await self.conexion.execute("SELECT 1")
            await asyncio.sleep(0.02)
        return list(self.recibidos)


@pytest.fixture
async def oyente(esquema_migrado: str) -> AsyncIterator[Oyente]:
    conexion = await asyncpg.connect(_url_asyncpg(esquema_migrado))
    try:
        oyente = Oyente(conexion)
        await oyente.escuchar()
        yield oyente
    finally:
        await conexion.close()


@pytest.fixture
async def escritor(esquema_migrado: str) -> AsyncIterator[asyncpg.Connection]:
    conexion = await asyncpg.connect(_url_asyncpg(esquema_migrado))
    try:
        yield conexion
    finally:
        await conexion.close()


# ---------------------------------------------------------------------------
# Una escritura por tabla observada y los avisos que debe producir
# ---------------------------------------------------------------------------

Escritura = Callable[[asyncpg.Connection, MesaViva], Awaitable[Any]]


def _sql(sentencia: str, *campos: str) -> Escritura:
    async def escribir(conexion: asyncpg.Connection, d: MesaViva) -> Any:
        return await conexion.execute(sentencia, *(getattr(d, c) for c in campos))

    return escribir


# tabla → (escritura, ¿avisa a la mesa?). Todas avisan al restaurante.
ESCRITURAS: dict[str, tuple[Escritura, bool]] = {
    "sesion_grupal": (
        _sql("UPDATE sesion_grupal SET ultima_actividad_en = now() WHERE id = $1", "sesion"),
        True,
    ),
    "miembro_sesion": (
        _sql("UPDATE miembro_sesion SET alias = 'Ana' WHERE id = $1", "miembro"),
        True,
    ),
    "orden_personal": (_sql("UPDATE orden_personal SET total = 60 WHERE id = $1", "orden"), True),
    "item_orden": (
        _sql("UPDATE item_orden SET cantidad = 2, subtotal = 120 WHERE id = $1", "item"),
        True,
    ),
    "comanda": (_sql("UPDATE comanda SET num_comensales = 2 WHERE id = $1", "comanda"), True),
    "comanda_orden": (
        _sql(
            "INSERT INTO comanda_orden (comanda_id, orden_id) VALUES ($1, $2)", "comanda", "orden"
        ),
        True,
    ),
    "llamada_mesero": (
        _sql("UPDATE llamada_mesero SET motivo = 'cuenta' WHERE id = $1", "llamada"),
        True,
    ),
    "reparto_cargo": (
        _sql(
            "INSERT INTO reparto_cargo (item_id, sesion_id, miembro_id) VALUES ($1, $2, $3)",
            "item",
            "sesion",
            "miembro",
        ),
        True,
    ),
    "movimiento_cargo": (
        _sql(
            "INSERT INTO movimiento_cargo (sesion_id, tipo, de_miembro_id, "
            "propuesto_por_personal_id) VALUES ($1, 'flotante', $2, $3)",
            "sesion",
            "miembro",
            "personal",
        ),
        True,
    ),
    "solicitud_entrada": (
        _sql(
            "INSERT INTO solicitud_entrada (restaurante_id, mesa_id, sesion_id, alias, motivo, "
            "vence_en) VALUES ($1, $2, $3, 'Luis', 'entrada_cerrada', "
            "now() + interval '10 minutes')",
            "restaurante",
            "mesa",
            "sesion",
        ),
        True,
    ),
    "marca_ciclo": (
        _sql(
            "INSERT INTO marca_ciclo (restaurante_id, sesion_id, paso, autor, autor_personal_id) "
            "VALUES ($1, $2, 'todo_bien', 'personal', $3)",
            "restaurante",
            "sesion",
            "personal",
        ),
        True,
    ),
    # Las de abajo avisan además a la sesión viva de la mesa o del restaurante (03 §2.4).
    "mesa": (_sql("UPDATE mesa SET capacidad = 6 WHERE id = $1", "mesa"), True),
    "restaurante": (
        _sql("UPDATE restaurante SET nombre = 'Aviso 2' WHERE id = $1", "restaurante"),
        True,
    ),
    "ajuste_restaurante": (
        _sql(
            "UPDATE ajuste_restaurante SET max_comensales = 10 WHERE restaurante_id = $1",
            "restaurante",
        ),
        True,
    ),
    "permiso_rol": (
        _sql(
            "UPDATE permiso_rol SET permitido = true "
            "WHERE restaurante_id = $1 AND rol = 'mesero' AND permiso = 'cambiar_entrada'",
            "restaurante",
        ),
        False,
    ),
    "personal_restaurante": (
        _sql("UPDATE personal_restaurante SET rol = 'capitan' WHERE id = $1", "personal"),
        False,
    ),
}


def _esperados(datos: MesaViva, a_la_mesa: bool) -> list[tuple[str, str]]:
    esperados = [("carta_restaurante", str(datos.restaurante))]
    if a_la_mesa:
        esperados.append(("carta_mesa", str(datos.sesion)))
    return sorted(esperados)


def test_cada_tabla_observada_tiene_su_escritura_de_prueba() -> None:
    assert set(ESCRITURAS) == OBSERVADAS


@pytest.mark.parametrize("tabla", sorted(ESCRITURAS))
async def test_cada_tabla_observada_avisa_una_vez_por_canal_al_confirmar(
    tabla: str, mesa_viva: MesaViva, oyente: Oyente, escritor: asyncpg.Connection
) -> None:
    escribir, a_la_mesa = ESCRITURAS[tabla]
    async with escritor.transaction():
        await escribir(escritor, mesa_viva)
        # La misma escritura dos veces en la transacción: PostgreSQL pliega los avisos iguales.
        if tabla not in _SOLO_UNA_VEZ:
            await escribir(escritor, mesa_viva)
        assert await oyente.esperar(0, plazo=0) == []  # nada antes de confirmar
    esperados = _esperados(mesa_viva, a_la_mesa)
    recibidos = await oyente.esperar(len(esperados))
    assert sorted(recibidos) == esperados
    # El aviso sólo lleva un id: un UUID, nada del negocio.
    for _canal, carga in recibidos:
        assert str(uuid.UUID(carga)) == carga


# Inserciones que chocarían consigo mismas (llave primaria o única) si se repiten.
_SOLO_UNA_VEZ = {"comanda_orden", "reparto_cargo"}


@pytest.mark.parametrize("tabla", sorted(ESCRITURAS))
async def test_si_la_transaccion_se_deshace_no_sale_ningun_aviso(
    tabla: str, mesa_viva: MesaViva, oyente: Oyente, escritor: asyncpg.Connection
) -> None:
    escribir, _ = ESCRITURAS[tabla]
    transaccion = escritor.transaction()
    await transaccion.start()
    await escribir(escritor, mesa_viva)
    await transaccion.rollback()
    assert await oyente.esperar(1, plazo=0.3) == []


async def test_borrar_y_mover_tambien_avisan(
    mesa_viva: MesaViva, oyente: Oyente, escritor: asyncpg.Connection
) -> None:
    """DELETE avisa por la fila vieja (quitar la llamada atendida, por ejemplo)."""
    async with escritor.transaction():
        await escritor.execute("DELETE FROM llamada_mesero WHERE id = $1", mesa_viva.llamada)
    esperados = _esperados(mesa_viva, True)
    assert sorted(await oyente.esperar(len(esperados))) == esperados


async def test_una_mesa_sin_sesion_viva_avisa_solo_al_restaurante(
    mesa_viva: MesaViva, oyente: Oyente, escritor: asyncpg.Connection
) -> None:
    async with escritor.transaction():
        await escritor.execute(
            "UPDATE sesion_grupal SET estado = 'cerrada', fin = now() WHERE id = $1",
            mesa_viva.sesion,
        )
    await oyente.esperar(2)
    oyente.recibidos.clear()
    async with escritor.transaction():
        await escritor.execute("UPDATE mesa SET capacidad = 2 WHERE id = $1", mesa_viva.mesa)
    assert await oyente.esperar(1) == [("carta_restaurante", str(mesa_viva.restaurante))]


async def test_los_intentos_de_pin_no_avisan(
    mesa_viva: MesaViva, oyente: Oyente, escritor: asyncpg.Connection
) -> None:
    """`personal_restaurante` avisa sólo por lo que revalida la línea (activo, rol, sello de
    sesiones y nombre), no por cada intento de PIN ni por el último acceso."""
    async with escritor.transaction():
        await escritor.execute(
            "UPDATE personal_restaurante SET intentos_fallidos = 1, ultimo_acceso_en = now() "
            "WHERE id = $1",
            mesa_viva.personal,
        )
    assert await oyente.esperar(1, plazo=0.3) == []
    async with escritor.transaction():
        await escritor.execute(
            "UPDATE personal_restaurante SET sesiones_desde = now() WHERE id = $1",
            mesa_viva.personal,
        )
    assert await oyente.esperar(1) == [("carta_restaurante", str(mesa_viva.restaurante))]


async def test_un_restaurante_nuevo_avisa_con_su_siembra(
    oyente: Oyente, escritor: asyncpg.Connection
) -> None:
    """Crear un restaurante (y su siembra de ajustes y permisos) es un solo aviso."""
    async with escritor.transaction():
        nuevo = await escritor.fetchval(
            "INSERT INTO restaurante (nombre, slug) VALUES ('Nuevo', $1) RETURNING id",
            f"nuevo-{uuid.uuid4().hex[:12]}",
        )
    try:
        assert await oyente.esperar(1) == [("carta_restaurante", str(nuevo))]
    finally:
        async with escritor.transaction():
            await escritor.execute("DELETE FROM restaurante WHERE id = $1", nuevo)


# ---------------------------------------------------------------------------
# La lista no se queda corta
# ---------------------------------------------------------------------------


def test_toda_tabla_avisa_o_es_excepcion_con_su_porque() -> None:
    """Una tabla nueva sin clasificar rompe esto: hay que decidir si la ve una mesa."""
    tablas = set(Base.metadata.tables)
    assert not OBSERVADAS & set(EXCEPCIONES)
    assert OBSERVADAS | set(EXCEPCIONES) == tablas
    assert all(motivo.strip() for motivo in EXCEPCIONES.values())


async def test_cada_tabla_observada_tiene_el_disparador_en_la_base(sesion: AsyncSession) -> None:
    filas = await sesion.execute(
        text(
            "SELECT c.relname FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid "
            "JOIN pg_proc p ON p.oid = t.tgfoid "
            "WHERE NOT t.tgisinternal AND p.proname = 'fn_avisar_cambio'"
        )
    )
    assert {fila[0] for fila in filas} == OBSERVADAS


async def test_la_funcion_no_es_security_definer_y_fija_su_search_path(
    sesion: AsyncSession,
) -> None:
    fila = (
        await sesion.execute(
            text(
                "SELECT prosecdef, proconfig, prosrc FROM pg_proc "
                "WHERE proname = 'fn_avisar_cambio' AND pronamespace = 'public'::regnamespace"
            )
        )
    ).one()
    assert fila.prosecdef is False
    assert fila.proconfig == ["search_path=pg_catalog, public"]
    # Sólo avisa por los dos canales y siempre con un id convertido a UUID.
    assert set(re.findall(r"pg_notify\('([a-z_]+)'", fila.prosrc)) == set(CANALES)
    assert re.findall(r"pg_notify\('[a-z_]+', ([^)]*)\)", fila.prosrc) == [
        "v_viva::TEXT",
        "v_viva::TEXT",
        "v_sesion::TEXT",
        "v_restaurante::TEXT",
    ]


async def _lee_estado_del_comensal(
    sesion: AsyncSession, restaurante: Restaurante, mesa: Mesa
) -> None:
    grupal = SesionGrupal(mesa_id=mesa.id, restaurante_id=restaurante.id)
    sesion.add(grupal)
    await sesion.flush()
    sesion.add(MiembroSesion(sesion_id=grupal.id, alias="Ana", color_avatar="#B8860B"))
    await sesion.flush()
    await servicio_sesion.leer_estado(sesion, grupal.id)


# Lo que pinta cada línea de avisos. T-3.4 añade la lectura del estado del personal
# (`GET /op/mesas`) y T-3.7 la del panel del dueño.
LECTORES: dict[str, Callable[[AsyncSession, Restaurante, Mesa], Awaitable[None]]] = {
    "leer_estado (comensal)": _lee_estado_del_comensal,
}


@pytest.mark.parametrize("lector", list(LECTORES))
async def test_lo_que_leen_las_lineas_avisa(
    lector: str, sesion: AsyncSession, restaurante: Restaurante, mesa: Mesa
) -> None:
    """Falla si la foto de una línea lee una tabla que no avisa y no es excepción: esa
    escritura no llegaría a nadie (03 §2.4)."""
    leidas: set[str] = set()

    def anotar(_c: Any, _cursor: Any, sentencia: str, *_args: Any) -> None:
        if sentencia.lstrip().upper().startswith("SELECT"):
            leidas.update(re.findall(r"\b(?:FROM|JOIN)\s+([a-z_]+)", sentencia))

    event.listen(Engine, "before_cursor_execute", anotar)
    try:
        await LECTORES[lector](sesion, restaurante, mesa)
    finally:
        event.remove(Engine, "before_cursor_execute", anotar)
    assert leidas, "la captura de SQL no vio ninguna lectura"
    assert leidas <= set(Base.metadata.tables), leidas
    sin_aviso = leidas - OBSERVADAS
    assert not sin_aviso, f"{lector} lee tablas que no avisan: {sorted(sin_aviso)}"
