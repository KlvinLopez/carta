"""T-1.1: las invariantes de `docs/plan/03_Datos_v1.md` §5 se sostienen en la base.

Cada prueba intenta violar una invariante con SQL real (lo que haría un servicio con un bug)
y espera `IntegrityError`; después comprueba que el camino legítimo sí pasa, para que la
prueba no se cumpla con una base que lo rechaza todo. Todo corre en la transacción de la
prueba (`conexion_pruebas`, se revierte al final) salvo la carrera de INV-3, que necesita
datos confirmados de verdad y dos conexiones asyncpg distintas (receta en el skill `/pruebas`).

Marcadores: INV-1 → AC-02.1 (una sesión por mesa), INV-2 → AC-10.1 (la orden personal),
INV-3 → AC-11.1 (confirmar congela), INV-7 → AC-26.1 (PIN), INV-8 → AC-12.1 (la comanda de la
sesión), INV-10 → AC-15.2 (cada operador sólo ve lo suyo).
"""

from __future__ import annotations

import asyncio
import re
import time
from dataclasses import dataclass
from uuid import UUID

import pytest
from argon2 import PasswordHasher
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

PIN_HASH = "$argon2id$v=19$m=65536,t=3,p=4$abc$def"
ESPERA_CONFIRMACION = 1.0  # segundos que la conexión 1 retiene la orden sin confirmar


# ---------------------------------------------------------------------------
# Datos: dos restaurantes completos, cada uno con su mesa, sesión, orden, menú y personal
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Inquilino:
    restaurante: UUID
    categoria: UUID
    platillo: UUID
    mesa: UUID
    personal: UUID
    sesion: UUID
    miembro: UUID
    orden: UUID


async def _uno(conexion: AsyncConnection, sql: str, **parametros: object) -> UUID:
    resultado = await conexion.execute(text(sql), parametros)
    valor: UUID = resultado.scalar_one()
    return valor


async def _ejecutar(conexion: AsyncConnection, sql: str, **parametros: object) -> None:
    await conexion.execute(text(sql), parametros)


async def _debe_fallar(conexion: AsyncConnection, sql: str, **parametros: object) -> None:
    """La sentencia viola una restricción; el *savepoint* deja la transacción usable."""
    with pytest.raises(IntegrityError):
        async with conexion.begin_nested():
            await conexion.execute(text(sql), parametros)


async def _crear_inquilino(conexion: AsyncConnection, n: int, sufijo: str = "") -> Inquilino:
    r = await _uno(
        conexion,
        "INSERT INTO restaurante (nombre, slug) VALUES (:n, :s) RETURNING id",
        n=f"R{n}",
        s=f"inv-{n}{sufijo}",
    )
    c = await _uno(
        conexion,
        "INSERT INTO categoria_menu (restaurante_id, nombre) VALUES (:r, 'Entradas') RETURNING id",
        r=r,
    )
    p = await _uno(
        conexion,
        "INSERT INTO platillo (restaurante_id, categoria_id, nombre, precio) "
        "VALUES (:r, :c, 'Guacamole', 145) RETURNING id",
        r=r,
        c=c,
    )
    m = await _uno(
        conexion,
        "INSERT INTO mesa (restaurante_id, numero, codigo_publico) VALUES (:r, 1, :codigo) "
        "RETURNING id",
        r=r,
        codigo=f"codigo-de-mesa-{n}{sufijo}".ljust(22, "x"),
    )
    pr = await _uno(
        conexion,
        "INSERT INTO personal_restaurante (restaurante_id, nombre, pin_hash) "
        "VALUES (:r, 'Ana', :h) RETURNING id",
        r=r,
        h=PIN_HASH,
    )
    s = await _uno(
        conexion,
        "INSERT INTO sesion_grupal (mesa_id, restaurante_id) VALUES (:m, :r) RETURNING id",
        m=m,
        r=r,
    )
    mb = await _uno(
        conexion, "INSERT INTO miembro_sesion (sesion_id) VALUES (:s) RETURNING id", s=s
    )
    o = await _uno(
        conexion,
        "INSERT INTO orden_personal (sesion_id, miembro_id) VALUES (:s, :mb) RETURNING id",
        s=s,
        mb=mb,
    )
    return Inquilino(r, c, p, m, pr, s, mb, o)


@pytest.fixture
async def uno(conexion_pruebas: AsyncConnection) -> Inquilino:
    return await _crear_inquilino(conexion_pruebas, 1)


@pytest.fixture
async def otro(conexion_pruebas: AsyncConnection, uno: Inquilino) -> Inquilino:
    return await _crear_inquilino(conexion_pruebas, 2)


async def _agregar_item(conexion: AsyncConnection, orden: UUID, platillo: UUID) -> UUID:
    return await _uno(
        conexion,
        "INSERT INTO item_orden (orden_id, platillo_id, precio_unitario, subtotal) "
        "VALUES (:o, :p, 145, 145) RETURNING id",
        o=orden,
        p=platillo,
    )


async def _bloquear_orden(conexion: AsyncConnection, orden: UUID) -> None:
    await _ejecutar(
        conexion,
        "UPDATE orden_personal SET estado = 'confirmada', bloqueada = true, "
        "confirmada_en = now() WHERE id = :o",
        o=orden,
    )


# ---------------------------------------------------------------------------
# INV-1 · una sesión viva por mesa
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-02.1")
async def test_inv1_una_sesion_viva_por_mesa(
    conexion_pruebas: AsyncConnection, uno: Inquilino
) -> None:
    c = conexion_pruebas
    for estado in ("activa", "lista_para_enviar"):
        await _debe_fallar(
            c,
            "INSERT INTO sesion_grupal (mesa_id, restaurante_id, estado) VALUES (:m, :r, :e)",
            m=uno.mesa,
            r=uno.restaurante,
            e=estado,
        )
    # Ni pasando a viva una sesión cerrada mientras otra sigue viva.
    cerrada = await _uno(
        c,
        "INSERT INTO sesion_grupal (mesa_id, restaurante_id, estado) "
        "VALUES (:m, :r, 'cerrada') RETURNING id",
        m=uno.mesa,
        r=uno.restaurante,
    )
    await _debe_fallar(c, "UPDATE sesion_grupal SET estado = 'activa' WHERE id = :s", s=cerrada)
    # Al cerrar la viva, la mesa admite una sesión nueva.
    await _ejecutar(
        c, "UPDATE sesion_grupal SET estado = 'cerrada', fin = now() WHERE id = :s", s=uno.sesion
    )
    await _uno(
        c,
        "INSERT INTO sesion_grupal (mesa_id, restaurante_id) VALUES (:m, :r) RETURNING id",
        m=uno.mesa,
        r=uno.restaurante,
    )


# ---------------------------------------------------------------------------
# INV-2 · una orden viva por miembro
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-10.1")
async def test_inv2_una_orden_viva_por_miembro(
    conexion_pruebas: AsyncConnection, uno: Inquilino
) -> None:
    c = conexion_pruebas
    await _debe_fallar(
        c,
        "INSERT INTO orden_personal (sesion_id, miembro_id) VALUES (:s, :mb)",
        s=uno.sesion,
        mb=uno.miembro,
    )
    # Confirmada sigue viva: tampoco admite una segunda.
    await _bloquear_orden(c, uno.orden)
    await _debe_fallar(
        c,
        "INSERT INTO orden_personal (sesion_id, miembro_id) VALUES (:s, :mb)",
        s=uno.sesion,
        mb=uno.miembro,
    )
    # Enviada ya no está viva: el miembro puede empezar otra (AC-12.4).
    await _ejecutar(c, "UPDATE orden_personal SET estado = 'enviada' WHERE id = :o", o=uno.orden)
    await _uno(
        c,
        "INSERT INTO orden_personal (sesion_id, miembro_id) VALUES (:s, :mb) RETURNING id",
        s=uno.sesion,
        mb=uno.miembro,
    )


# ---------------------------------------------------------------------------
# INV-3 · ítems inmutables tras confirmar
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-11.1")
async def test_inv3_orden_bloqueada_no_admite_insert_update_ni_delete(
    conexion_pruebas: AsyncConnection, uno: Inquilino
) -> None:
    c = conexion_pruebas
    item = await _agregar_item(c, uno.orden, uno.platillo)
    await _bloquear_orden(c, uno.orden)

    await _debe_fallar(
        c,
        "INSERT INTO item_orden (orden_id, platillo_id, precio_unitario, subtotal) "
        "VALUES (:o, :p, 1, 1)",
        o=uno.orden,
        p=uno.platillo,
    )
    await _debe_fallar(c, "UPDATE item_orden SET cantidad = 2 WHERE id = :i", i=item)
    await _debe_fallar(c, "UPDATE item_orden SET precio_unitario = 1 WHERE id = :i", i=item)
    await _debe_fallar(c, "DELETE FROM item_orden WHERE id = :i", i=item)
    # Ni borrar la orden confirmada (con sus ítems en cascada).
    await _debe_fallar(c, "DELETE FROM orden_personal WHERE id = :o", o=uno.orden)
    # Ni desbloquearla sin volver a `armando` (CHECK de coherencia).
    await _debe_fallar(c, "UPDATE orden_personal SET bloqueada = false WHERE id = :o", o=uno.orden)
    # Deshacer la confirmación (AC-11.3) vuelve a permitir cambios.
    await _ejecutar(
        c,
        "UPDATE orden_personal SET estado = 'armando', bloqueada = false, confirmada_en = NULL "
        "WHERE id = :o",
        o=uno.orden,
    )
    await _ejecutar(c, "UPDATE item_orden SET cantidad = 2 WHERE id = :i", i=item)


@pytest.mark.ac("AC-11.1")
async def test_inv3_mover_un_item_no_lo_saca_ni_lo_mete_en_una_orden_bloqueada(
    conexion_pruebas: AsyncConnection, uno: Inquilino
) -> None:
    c = conexion_pruebas
    item = await _agregar_item(c, uno.orden, uno.platillo)
    otro_miembro = await _uno(
        c, "INSERT INTO miembro_sesion (sesion_id) VALUES (:s) RETURNING id", s=uno.sesion
    )
    orden_libre = await _uno(
        c,
        "INSERT INTO orden_personal (sesion_id, miembro_id) VALUES (:s, :mb) RETURNING id",
        s=uno.sesion,
        mb=otro_miembro,
    )
    item_libre = await _agregar_item(c, orden_libre, uno.platillo)
    await _bloquear_orden(c, uno.orden)

    # Sacarlo: la orden de OLD está bloqueada.
    await _debe_fallar(
        c, "UPDATE item_orden SET orden_id = :o WHERE id = :i", o=orden_libre, i=item
    )
    # Meterlo: la orden de NEW está bloqueada.
    await _debe_fallar(
        c, "UPDATE item_orden SET orden_id = :o WHERE id = :i", o=uno.orden, i=item_libre
    )
    # Entre órdenes libres sí se mueve.
    await _ejecutar(c, "DELETE FROM item_orden WHERE id = :i", i=item_libre)


@pytest.mark.ac("AC-11.1")
async def test_inv3_carrera_confirmar_mientras_otro_agrega(motor_pruebas: AsyncEngine) -> None:
    """La conexión 1 bloquea la orden sin confirmar; la 2 inserta un ítem. El trigger toma
    `FOR SHARE` sobre la orden: la 2 espera a que la 1 confirme, ve `bloqueada = true` y
    recibe `IntegrityError`. Sin `FOR SHARE` la 2 vería la orden libre y el ítem entraría en
    una orden confirmada.

    Datos confirmados de verdad (otra conexión debe verlos); se borran en el `finally`.
    `lock_timeout` de `motor_pruebas` (5 s) convierte un cuelgue en un error con diagnóstico.
    """
    async with motor_pruebas.connect() as c:
        async with c.begin():
            datos = await _crear_inquilino(c, 9, sufijo=f"-carrera-{time.monotonic_ns()}")

    bloqueada = asyncio.Event()

    async def confirma() -> None:
        async with motor_pruebas.connect() as c1:
            async with c1.begin():
                await _bloquear_orden(c1, datos.orden)
                bloqueada.set()
                await asyncio.sleep(ESPERA_CONFIRMACION)

    async def agrega() -> float:
        await bloqueada.wait()
        async with motor_pruebas.connect() as c2:
            inicio = time.monotonic()
            try:
                async with c2.begin():
                    await _agregar_item(c2, datos.orden, datos.platillo)
            finally:
                espera = time.monotonic() - inicio
        return espera

    try:
        resultados = await asyncio.gather(confirma(), agrega(), return_exceptions=True)
        assert resultados[0] is None, resultados[0]
        assert isinstance(resultados[1], IntegrityError), resultados[1]
        assert "INV-3" in str(resultados[1])
        async with motor_pruebas.connect() as c:
            items = await c.execute(
                text("SELECT count(*) FROM item_orden WHERE orden_id = :o"), {"o": datos.orden}
            )
            assert items.scalar_one() == 0
    finally:
        async with motor_pruebas.connect() as c:
            async with c.begin():
                # Una orden bloqueada no se borra (INV-3): primero se deshace la confirmación.
                await _ejecutar(
                    c,
                    "UPDATE orden_personal SET estado = 'armando', bloqueada = false, "
                    "confirmada_en = NULL WHERE id = :o",
                    o=datos.orden,
                )
                await _ejecutar(c, "DELETE FROM restaurante WHERE id = :r", r=datos.restaurante)
        async with motor_pruebas.connect() as c:
            quedan = await c.execute(
                text("SELECT count(*) FROM restaurante WHERE id = :r"), {"r": datos.restaurante}
            )
            assert quedan.scalar_one() == 0


@pytest.mark.ac("AC-11.1")
async def test_inv3_la_segunda_conexion_espera_a_la_primera(motor_pruebas: AsyncEngine) -> None:
    """Contraprueba de la carrera: si la conexión 1 **no** confirma (rollback), la 2 espera
    igual, ve la orden libre y su ítem entra. Demuestra que la 2 esperó por la fila y que el
    rechazo de la prueba anterior viene de la confirmación, no de otra cosa."""
    async with motor_pruebas.connect() as c:
        async with c.begin():
            datos = await _crear_inquilino(c, 8, sufijo=f"-espera-{time.monotonic_ns()}")

    bloqueada = asyncio.Event()

    async def se_arrepiente() -> None:
        async with motor_pruebas.connect() as c1:
            transaccion = await c1.begin()
            await _bloquear_orden(c1, datos.orden)
            bloqueada.set()
            await asyncio.sleep(ESPERA_CONFIRMACION)
            await transaccion.rollback()

    async def agrega() -> float:
        await bloqueada.wait()
        async with motor_pruebas.connect() as c2:
            inicio = time.monotonic()
            async with c2.begin():
                await _agregar_item(c2, datos.orden, datos.platillo)
            return time.monotonic() - inicio

    try:
        _, espera = await asyncio.gather(se_arrepiente(), agrega())
        assert espera >= ESPERA_CONFIRMACION * 0.8, espera
    finally:
        async with motor_pruebas.connect() as c:
            async with c.begin():
                await _ejecutar(c, "DELETE FROM sesion_grupal WHERE id = :s", s=datos.sesion)
                await _ejecutar(c, "DELETE FROM restaurante WHERE id = :r", r=datos.restaurante)


# ---------------------------------------------------------------------------
# INV-7 · el PIN nunca se guarda en claro
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-26.1")
@pytest.mark.parametrize(
    "pin_hash",
    ["1234", "123456", "$argon2i$v=19$m=65536,t=3,p=4$abc$def", "$2b$12$bcrypt", ""],
)
async def test_inv7_solo_entra_un_hash_argon2id(
    conexion_pruebas: AsyncConnection, uno: Inquilino, pin_hash: str
) -> None:
    c = conexion_pruebas
    await _debe_fallar(
        c,
        "INSERT INTO personal_restaurante (restaurante_id, nombre, pin_hash) "
        "VALUES (:r, 'Luis', :h)",
        r=uno.restaurante,
        h=pin_hash,
    )
    await _debe_fallar(
        c,
        "UPDATE personal_restaurante SET pin_hash = :h WHERE id = :p",
        h=pin_hash,
        p=uno.personal,
    )


@pytest.mark.ac("AC-26.1")
async def test_inv7_un_hash_real_de_argon2_cffi_entra(
    conexion_pruebas: AsyncConnection, uno: Inquilino
) -> None:
    hash_real = PasswordHasher().hash("1234")
    nuevo = await _uno(
        conexion_pruebas,
        "INSERT INTO personal_restaurante (restaurante_id, nombre, pin_hash) "
        "VALUES (:r, 'Luis', :h) RETURNING id",
        r=uno.restaurante,
        h=hash_real,
    )
    guardado = await conexion_pruebas.execute(
        text("SELECT pin_hash FROM personal_restaurante WHERE id = :p"), {"p": nuevo}
    )
    valor = guardado.scalar_one()
    assert valor.startswith("$argon2id$")
    assert "1234" not in valor.split("$")[-1]


# ---------------------------------------------------------------------------
# INV-8 · una comanda sólo agrupa órdenes de su sesión
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-12.1")
async def test_inv8_comanda_solo_con_ordenes_de_su_sesion(
    conexion_pruebas: AsyncConnection, uno: Inquilino
) -> None:
    c = conexion_pruebas
    otra_sesion = await _uno(
        c,
        "INSERT INTO sesion_grupal (mesa_id, restaurante_id, estado) "
        "VALUES (:m, :r, 'cerrada') RETURNING id",
        m=uno.mesa,
        r=uno.restaurante,
    )
    miembro_otra = await _uno(
        c, "INSERT INTO miembro_sesion (sesion_id) VALUES (:s) RETURNING id", s=otra_sesion
    )
    orden_otra = await _uno(
        c,
        "INSERT INTO orden_personal (sesion_id, miembro_id) VALUES (:s, :mb) RETURNING id",
        s=otra_sesion,
        mb=miembro_otra,
    )
    comanda = await _uno(
        c,
        "INSERT INTO comanda (restaurante_id, mesa_id, sesion_id) VALUES (:r, :m, :s) RETURNING id",
        r=uno.restaurante,
        m=uno.mesa,
        s=uno.sesion,
    )
    # Insertar una orden de otra sesión.
    await _debe_fallar(
        c,
        "INSERT INTO comanda_orden (comanda_id, orden_id) VALUES (:c, :o)",
        c=comanda,
        o=orden_otra,
    )
    # La propia entra...
    await _ejecutar(
        c,
        "INSERT INTO comanda_orden (comanda_id, orden_id) VALUES (:c, :o)",
        c=comanda,
        o=uno.orden,
    )
    # ...y no se puede cambiar por una de otra sesión con UPDATE.
    await _debe_fallar(
        c,
        "UPDATE comanda_orden SET orden_id = :otra WHERE comanda_id = :c AND orden_id = :o",
        otra=orden_otra,
        c=comanda,
        o=uno.orden,
    )
    # Ni moviendo a los padres de sesión.
    await _debe_fallar(
        c, "UPDATE comanda SET sesion_id = :s WHERE id = :c", s=otra_sesion, c=comanda
    )
    await _debe_fallar(
        c, "UPDATE orden_personal SET sesion_id = :s WHERE id = :o", s=otra_sesion, o=uno.orden
    )
    # Una orden se cobra en una sola comanda.
    segunda = await _uno(
        c,
        "INSERT INTO comanda (restaurante_id, mesa_id, sesion_id, secuencia) "
        "VALUES (:r, :m, :s, 2) RETURNING id",
        r=uno.restaurante,
        m=uno.mesa,
        s=uno.sesion,
    )
    await _debe_fallar(
        c,
        "INSERT INTO comanda_orden (comanda_id, orden_id) VALUES (:c, :o)",
        c=segunda,
        o=uno.orden,
    )


# ---------------------------------------------------------------------------
# INV-10 · ninguna fila mezcla restaurantes
# ---------------------------------------------------------------------------

# Cada caso usa ids de `uno` (:r, :m, :s, :c, :p, :pr, :o) mezclados con uno de `otro`
# (:r2, :m2, :s2, :c2, :p2, :pr2). La misma sentencia con los ids de `uno` pasa
# (`test_inv10_el_mismo_restaurante_si_pasa`).
CASOS_MEZCLA = {
    "sesion con mesa ajena": (
        "INSERT INTO sesion_grupal (mesa_id, restaurante_id, estado) VALUES (:m2, :r, 'cerrada')"
    ),
    "sesion cerrada por personal ajeno": (
        "UPDATE sesion_grupal SET cerrada_por_personal_id = :pr2 WHERE id = :s"
    ),
    "platillo en categoria ajena": (
        "INSERT INTO platillo (restaurante_id, categoria_id, nombre, precio) "
        "VALUES (:r, :c2, 'Sopa', 90)"
    ),
    "platillo movido a categoria ajena": ("UPDATE platillo SET categoria_id = :c2 WHERE id = :p"),
    "platillo agotado por personal ajeno": (
        "UPDATE platillo SET disponible = false, no_disponible_desde = now(), "
        "no_disponible_por = :pr2 WHERE id = :p"
    ),
    "comanda con sesion ajena": (
        "INSERT INTO comanda (restaurante_id, mesa_id, sesion_id) VALUES (:r, :m, :s2)"
    ),
    "comanda con mesa ajena": (
        "INSERT INTO comanda (restaurante_id, mesa_id, sesion_id) VALUES (:r, :m2, :s)"
    ),
    "comanda de otro restaurante sobre mi sesion": (
        "INSERT INTO comanda (restaurante_id, mesa_id, sesion_id) VALUES (:r2, :m2, :s)"
    ),
    "comanda atendida por personal ajeno": (
        "INSERT INTO comanda (restaurante_id, mesa_id, sesion_id, estado, atendida_en, "
        "atendida_por_personal_id) VALUES (:r, :m, :s, 'atendida', now(), :pr2)"
    ),
    "llamada con sesion ajena": (
        "INSERT INTO llamada_mesero (restaurante_id, mesa_id, sesion_id) VALUES (:r, :m, :s2)"
    ),
    "llamada con mesa ajena": (
        "INSERT INTO llamada_mesero (restaurante_id, mesa_id, sesion_id) VALUES (:r, :m2, :s)"
    ),
    "llamada atendida por personal ajeno": (
        "INSERT INTO llamada_mesero (restaurante_id, mesa_id, sesion_id, atendida_en, "
        "atendida_por_personal_id) VALUES (:r, :m, :s, now(), :pr2)"
    ),
    "item con platillo ajeno": (
        "INSERT INTO item_orden (orden_id, platillo_id, precio_unitario, subtotal) "
        "VALUES (:o, :p2, 1, 1)"
    ),
    "platillo cambiado de restaurante": (
        "UPDATE platillo SET categoria_id = NULL, restaurante_id = :r2 WHERE id = :p"
    ),
    "sesion cambiada de restaurante": (
        "UPDATE sesion_grupal SET restaurante_id = :r2 WHERE id = :s"
    ),
    "mesa con sesiones cambiada de restaurante": (
        "UPDATE mesa SET restaurante_id = :r2 WHERE id = :m"
    ),
    "categoria con platillos cambiada de restaurante": (
        "UPDATE categoria_menu SET restaurante_id = :r2 WHERE id = :c"
    ),
}


def _parametros(sql: str, uno: Inquilino, otro: Inquilino) -> dict[str, UUID]:
    """Sólo los parámetros que la sentencia usa (`:r` no es prefijo de `:r2`)."""
    ids = {
        "r": uno.restaurante,
        "m": uno.mesa,
        "s": uno.sesion,
        "c": uno.categoria,
        "p": uno.platillo,
        "pr": uno.personal,
        "o": uno.orden,
        "r2": otro.restaurante,
        "m2": otro.mesa,
        "s2": otro.sesion,
        "c2": otro.categoria,
        "p2": otro.platillo,
        "pr2": otro.personal,
    }
    return {nombre: ids[nombre] for nombre in set(re.findall(r":(\w+)", sql))}


@pytest.mark.ac("AC-15.2")
@pytest.mark.parametrize("caso", list(CASOS_MEZCLA), ids=list(CASOS_MEZCLA))
async def test_inv10_ninguna_fila_mezcla_restaurantes(
    conexion_pruebas: AsyncConnection, uno: Inquilino, otro: Inquilino, caso: str
) -> None:
    sql = CASOS_MEZCLA[caso]
    await _debe_fallar(conexion_pruebas, sql, **_parametros(sql, uno, otro))


# Las mismas sentencias con los ids de `uno` (o sin cambio de restaurante) sí pasan.
CASOS_MISMO_RESTAURANTE = {
    "sesion con mesa propia": (
        "INSERT INTO sesion_grupal (mesa_id, restaurante_id, estado) VALUES (:m, :r, 'cerrada')"
    ),
    "sesion cerrada por personal propio": (
        "UPDATE sesion_grupal SET cerrada_por_personal_id = :pr WHERE id = :s"
    ),
    "platillo en categoria propia": (
        "INSERT INTO platillo (restaurante_id, categoria_id, nombre, precio) "
        "VALUES (:r, :c, 'Sopa', 90)"
    ),
    "platillo sin categoria": (
        "INSERT INTO platillo (restaurante_id, nombre, precio) VALUES (:r, 'Pan', 20)"
    ),
    "platillo agotado por personal propio": (
        "UPDATE platillo SET disponible = false, no_disponible_desde = now(), "
        "no_disponible_por = :pr WHERE id = :p"
    ),
    "comanda propia atendida por personal propio": (
        "INSERT INTO comanda (restaurante_id, mesa_id, sesion_id, estado, atendida_en, "
        "atendida_por_personal_id) VALUES (:r, :m, :s, 'atendida', now(), :pr)"
    ),
    "llamada propia atendida por personal propio": (
        "INSERT INTO llamada_mesero (restaurante_id, mesa_id, sesion_id, atendida_en, "
        "atendida_por_personal_id) VALUES (:r, :m, :s, now(), :pr)"
    ),
    "item con platillo propio": (
        "INSERT INTO item_orden (orden_id, platillo_id, precio_unitario, subtotal) "
        "VALUES (:o, :p, 1, 1)"
    ),
    "platillo editado sin cambiar de restaurante": (
        "UPDATE platillo SET restaurante_id = :r, nombre = 'Guacamole grande' WHERE id = :p"
    ),
}


@pytest.mark.ac("AC-15.2")
@pytest.mark.parametrize("caso", list(CASOS_MISMO_RESTAURANTE), ids=list(CASOS_MISMO_RESTAURANTE))
async def test_inv10_el_mismo_restaurante_si_pasa(
    conexion_pruebas: AsyncConnection, uno: Inquilino, otro: Inquilino, caso: str
) -> None:
    sql = CASOS_MISMO_RESTAURANTE[caso]
    async with conexion_pruebas.begin_nested():
        await conexion_pruebas.execute(text(sql), _parametros(sql, uno, otro))


@pytest.mark.ac("AC-15.2")
async def test_inv10_mover_un_item_a_un_platillo_ajeno(
    conexion_pruebas: AsyncConnection, uno: Inquilino, otro: Inquilino
) -> None:
    item = await _agregar_item(conexion_pruebas, uno.orden, uno.platillo)
    await _debe_fallar(
        conexion_pruebas,
        "UPDATE item_orden SET platillo_id = :p2 WHERE id = :i",
        p2=otro.platillo,
        i=item,
    )
    # Ni a la orden de otro restaurante con su platillo de siempre.
    await _debe_fallar(
        conexion_pruebas,
        "UPDATE item_orden SET orden_id = :o2 WHERE id = :i",
        o2=otro.orden,
        i=item,
    )


@pytest.mark.ac("AC-15.2")
async def test_inv10_set_null_conserva_el_restaurante(
    conexion_pruebas: AsyncConnection, uno: Inquilino
) -> None:
    """`ON DELETE SET NULL (col)`: al borrar el padre se anula sólo su columna. Con `SET NULL`
    a secas se anularía también `restaurante_id` (NOT NULL) y el borrado fallaría."""
    c = conexion_pruebas
    comanda = await _uno(
        c,
        "INSERT INTO comanda (restaurante_id, mesa_id, sesion_id, estado, atendida_en, "
        "atendida_por_personal_id) VALUES (:r, :m, :s, 'atendida', now(), :pr) RETURNING id",
        r=uno.restaurante,
        m=uno.mesa,
        s=uno.sesion,
        pr=uno.personal,
    )
    llamada = await _uno(
        c,
        "INSERT INTO llamada_mesero (restaurante_id, mesa_id, sesion_id, atendida_en, "
        "atendida_por_personal_id) VALUES (:r, :m, :s, now(), :pr) RETURNING id",
        r=uno.restaurante,
        m=uno.mesa,
        s=uno.sesion,
        pr=uno.personal,
    )
    await _ejecutar(
        c,
        "UPDATE platillo SET disponible = false, no_disponible_por = :pr WHERE id = :p",
        pr=uno.personal,
        p=uno.platillo,
    )
    await _ejecutar(
        c,
        "UPDATE sesion_grupal SET cerrada_por_personal_id = :pr WHERE id = :s",
        pr=uno.personal,
        s=uno.sesion,
    )
    await _ejecutar(c, "DELETE FROM personal_restaurante WHERE id = :pr", pr=uno.personal)
    await _ejecutar(c, "DELETE FROM categoria_menu WHERE id = :c", c=uno.categoria)

    filas = {
        "comanda": await c.execute(
            text("SELECT restaurante_id, atendida_por_personal_id FROM comanda WHERE id = :x"),
            {"x": comanda},
        ),
        "llamada": await c.execute(
            text(
                "SELECT restaurante_id, atendida_por_personal_id FROM llamada_mesero WHERE id = :x"
            ),
            {"x": llamada},
        ),
        "platillo_personal": await c.execute(
            text("SELECT restaurante_id, no_disponible_por FROM platillo WHERE id = :x"),
            {"x": uno.platillo},
        ),
        "platillo_categoria": await c.execute(
            text("SELECT restaurante_id, categoria_id FROM platillo WHERE id = :x"),
            {"x": uno.platillo},
        ),
        "sesion": await c.execute(
            text("SELECT restaurante_id, cerrada_por_personal_id FROM sesion_grupal WHERE id = :x"),
            {"x": uno.sesion},
        ),
    }
    for nombre, resultado in filas.items():
        assert tuple(resultado.one()) == (uno.restaurante, None), nombre


@pytest.mark.ac("AC-15.2")
async def test_inv10_borrar_la_sesion_borra_sus_comandas_y_llamadas(
    conexion_pruebas: AsyncConnection, uno: Inquilino
) -> None:
    """Las FK compuestas conservan el `ON DELETE CASCADE` de las simples que sustituyen."""
    c = conexion_pruebas
    await _ejecutar(
        c,
        "INSERT INTO comanda (restaurante_id, mesa_id, sesion_id) VALUES (:r, :m, :s)",
        r=uno.restaurante,
        m=uno.mesa,
        s=uno.sesion,
    )
    await _ejecutar(
        c,
        "INSERT INTO llamada_mesero (restaurante_id, mesa_id, sesion_id) VALUES (:r, :m, :s)",
        r=uno.restaurante,
        m=uno.mesa,
        s=uno.sesion,
    )
    await _ejecutar(c, "DELETE FROM mesa WHERE id = :m", m=uno.mesa)
    for tabla in ("sesion_grupal", "comanda", "llamada_mesero"):
        quedan = await c.execute(
            text(f"SELECT count(*) FROM {tabla} WHERE restaurante_id = :r"),
            {"r": uno.restaurante},
        )
        assert quedan.scalar_one() == 0, tabla
