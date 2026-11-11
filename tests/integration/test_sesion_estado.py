"""T-2.1: `GET /p/sesion` (AC-02.3) con ETag en memoria (02 §6) y cierre por inactividad
de 3 h (AC-02.4)."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.core.seguridad import Invitado, emitir_token_invitado
from app.db.models import Mesa, OrdenPersonal, Restaurante, SesionGrupal
from app.main import app
from app.services import sesion as servicio
from tests.fabricas import codigo_de_mesa
from tests.invitado_pruebas import cambiar_alias, entrar, estado


@pytest.fixture(autouse=True)
def _cache_limpia() -> None:
    servicio.cache_estados.vaciar()


async def _mesa_con(cliente: AsyncClient, mesa: Mesa, cuantos: int) -> list[dict[str, Any]]:
    """`cuantos` comensales dentro; cada uno con su `token` y su `miembro`."""
    dentro = []
    for _ in range(cuantos):
        respuesta, token = await entrar(cliente, mesa.codigo_publico)
        dentro.append({"token": token, **respuesta.json()})
    return dentro


async def _poner(sesion: AsyncSession, sesion_id: str, **valores: Any) -> None:
    await sesion.execute(
        update(SesionGrupal).where(SesionGrupal.id == UUID(sesion_id)).values(**valores)
    )
    await sesion.commit()
    servicio.cache_estados.invalidar(UUID(sesion_id))


# ---------------------------------------------------------------------------
# Estado de la mesa (AC-02.3)
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-02.3")
async def test_cada_miembro_ve_avatar_y_estado_de_todos(cliente: AsyncClient, mesa: Mesa) -> None:
    ana, beto = await _mesa_con(cliente, mesa, 2)
    respuesta = await estado(cliente, ana["token"])
    assert respuesta.status_code == 200
    assert respuesta.headers["cache-control"] == "private, no-store"
    assert respuesta.json() == {
        "id": ana["sesion"]["id"],
        "estado": "activa",
        "mesa": {"numero": mesa.numero, "capacidad": mesa.capacidad},
        "yo": ana["miembro"]["id"],
        "listos": 0,
        "total_miembros": 2,
        "miembros": [
            {**ana["miembro"], "estado": "armando"},
            {**beto["miembro"], "estado": "armando"},
        ],
    }
    de_beto = await estado(cliente, beto["token"])
    assert de_beto.json()["yo"] == beto["miembro"]["id"]
    assert de_beto.json()["miembros"] == respuesta.json()["miembros"]


@pytest.mark.ac("AC-02.3")
async def test_quien_confirmo_su_orden_sale_listo(
    cliente: AsyncClient, sesion: AsyncSession, mesa: Mesa
) -> None:
    ana, beto = await _mesa_con(cliente, mesa, 2)
    sesion.add(
        OrdenPersonal(
            sesion_id=UUID(beto["sesion"]["id"]),
            miembro_id=UUID(beto["miembro"]["id"]),
            estado="confirmada",
            bloqueada=True,
        )
    )
    await sesion.commit()
    servicio.cache_estados.invalidar(UUID(beto["sesion"]["id"]))
    cuerpo = (await estado(cliente, ana["token"])).json()
    assert cuerpo["listos"] == 1
    assert [m["estado"] for m in cuerpo["miembros"]] == ["armando", "listo"]


@pytest.mark.ac("AC-02.3")
async def test_un_cambio_se_ve_en_el_siguiente_sondeo(cliente: AsyncClient, mesa: Mesa) -> None:
    """Entrar y cambiar el alias invalidan la memoria: el siguiente sondeo ya lo trae."""
    (ana,) = await _mesa_con(cliente, mesa, 1)
    primera = await estado(cliente, ana["token"])
    (beto,) = await _mesa_con(cliente, mesa, 1)
    segunda = await estado(cliente, ana["token"])
    assert segunda.json()["total_miembros"] == 2
    assert segunda.headers["etag"] != primera.headers["etag"]
    await cambiar_alias(cliente, beto["token"], {"alias": "Beto"})
    tercera = await estado(cliente, ana["token"])
    assert tercera.json()["miembros"][1]["alias"] == "Beto"
    assert tercera.headers["etag"] not in (primera.headers["etag"], segunda.headers["etag"])


# ---------------------------------------------------------------------------
# ETag y 304 (02 §6)
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-02.3")
async def test_con_if_none_match_igual_responde_304_sin_cuerpo(
    cliente: AsyncClient, mesa: Mesa
) -> None:
    (ana,) = await _mesa_con(cliente, mesa, 1)
    primera = await estado(cliente, ana["token"])
    etag = primera.headers["etag"]
    assert etag.startswith('"') and etag.endswith('"')
    segunda = await estado(cliente, ana["token"], **{"If-None-Match": etag})
    assert segunda.status_code == 304
    assert segunda.content == b""
    assert segunda.headers["etag"] == etag
    assert segunda.headers["cache-control"] == "private, no-store"
    for variante in (f"W/{etag}", f'"otro", {etag}', "*"):
        assert (
            await estado(cliente, ana["token"], **{"If-None-Match": variante})
        ).status_code == 304
    distinto = await estado(cliente, ana["token"], **{"If-None-Match": '"otro"'})
    assert distinto.status_code == 200


@pytest.mark.ac("AC-02.3")
async def test_el_304_en_memoria_no_toca_la_base(
    cliente: AsyncClient, mesa: Mesa, monkeypatch: pytest.MonkeyPatch
) -> None:
    (ana,) = await _mesa_con(cliente, mesa, 1)
    etag = (await estado(cliente, ana["token"])).headers["etag"]

    async def sin_base(*_: object, **__: object) -> None:
        raise AssertionError("el sondeo consultó la base con la foto fresca")

    monkeypatch.setattr(servicio, "leer_estado", sin_base)
    assert (await estado(cliente, ana["token"], **{"If-None-Match": etag})).status_code == 304
    assert (await estado(cliente, ana["token"])).status_code == 200


async def test_el_etag_es_de_cada_miembro(cliente: AsyncClient, mesa: Mesa) -> None:
    """El cuerpo lleva `yo`: el ETag de Ana no vale para Beto."""
    ana, beto = await _mesa_con(cliente, mesa, 2)
    etag_ana = (await estado(cliente, ana["token"])).headers["etag"]
    otra = await estado(cliente, beto["token"], **{"If-None-Match": etag_ana})
    assert otra.status_code == 200
    assert otra.headers["etag"] != etag_ana


async def test_el_sondeo_no_cuenta_como_actividad(
    cliente: AsyncClient, sesion: AsyncSession, mesa: Mesa
) -> None:
    (ana,) = await _mesa_con(cliente, mesa, 1)
    hace_dos_horas = datetime.now(UTC) - timedelta(hours=2)
    await _poner(sesion, ana["sesion"]["id"], ultima_actividad_en=hace_dos_horas)
    await estado(cliente, ana["token"])
    grupal = await sesion.scalar(
        select(SesionGrupal)
        .where(SesionGrupal.id == UUID(ana["sesion"]["id"]))
        .execution_options(populate_existing=True)
    )
    assert grupal is not None and grupal.ultima_actividad_en == hace_dos_horas


# ---------------------------------------------------------------------------
# Credencial y sesión cerrada
# ---------------------------------------------------------------------------


async def test_sin_cookie_es_401_sin_credencial(cliente: AsyncClient) -> None:
    respuesta = await cliente.get("/api/v1/p/sesion")
    assert respuesta.status_code == 401
    assert respuesta.json()["error"]["codigo"] == "SIN_CREDENCIAL"


async def test_un_token_manipulado_es_401(cliente: AsyncClient, mesa: Mesa) -> None:
    (ana,) = await _mesa_con(cliente, mesa, 1)
    cabecera, carga, firma = ana["token"].split(".")
    respuesta = await estado(cliente, f"{cabecera}.{carga}.{firma[::-1]}")
    assert respuesta.status_code == 401
    assert respuesta.json()["error"]["codigo"] == "TOKEN_INVALIDO"


async def test_un_token_vencido_es_401_token_expirado(cliente: AsyncClient, mesa: Mesa) -> None:
    (ana,) = await _mesa_con(cliente, mesa, 1)
    vencido = emitir_token_invitado(
        Invitado(
            UUID(ana["miembro"]["id"]),
            UUID(ana["sesion"]["id"]),
            UUID(ana["sesion"]["restaurante"]["id"]),
        ),
        ahora=datetime.now(UTC) - timedelta(hours=6, seconds=1),
    )
    respuesta = await estado(cliente, vencido)
    assert respuesta.status_code == 401
    assert respuesta.json()["error"]["codigo"] == "TOKEN_EXPIRADO"


async def test_un_miembro_de_otra_sesion_o_restaurante_es_401(
    cliente: AsyncClient, fabrica_mesa: Any, restaurante: Restaurante, mesa: Mesa
) -> None:
    """Aun con un token bien firmado, el miembro tiene que ser de esa sesión y de ese
    restaurante (regla dura 5)."""
    (ana,) = await _mesa_con(cliente, mesa, 1)
    otra = await fabrica_mesa(restaurante)
    (beto,) = await _mesa_con(cliente, otra, 1)
    sesion_ana = UUID(ana["sesion"]["id"])
    for invitado in (
        Invitado(UUID(beto["miembro"]["id"]), sesion_ana, restaurante.id),
        Invitado(UUID(ana["miembro"]["id"]), sesion_ana, uuid4()),
    ):
        for _ in range(2):  # de la base y de la memoria
            respuesta = await estado(cliente, emitir_token_invitado(invitado))
            assert respuesta.status_code == 401, invitado
            assert respuesta.json()["error"]["codigo"] == "TOKEN_INVALIDO"


@pytest.mark.parametrize("estado_final", ["cerrada", "cancelada"])
async def test_con_la_sesion_cerrada_el_sondeo_es_410(
    cliente: AsyncClient, sesion: AsyncSession, mesa: Mesa, estado_final: str
) -> None:
    (ana,) = await _mesa_con(cliente, mesa, 1)
    await _poner(sesion, ana["sesion"]["id"], estado=estado_final)
    respuesta = await estado(cliente, ana["token"])
    assert respuesta.status_code == 410
    assert respuesta.json()["error"]["codigo"] == "SESION_CERRADA"


# ---------------------------------------------------------------------------
# Memoria de estados (unidad)
# ---------------------------------------------------------------------------


def _foto(sesion_id: UUID, huella: str = "h") -> servicio.FotoEstado:
    return servicio.FotoEstado(sesion_id, uuid4(), {}, huella, frozenset())


def test_la_memoria_caduca_a_los_dos_segundos() -> None:
    reloj = [100.0]
    cache = servicio.CacheEstados(reloj=lambda: reloj[0])
    assert cache.vida == 2.0
    sesion_id = uuid4()
    cache.guardar(_foto(sesion_id), cache.generacion(sesion_id))
    reloj[0] = 101.9
    assert cache.obtener(sesion_id) is not None
    reloj[0] = 102.0
    assert cache.obtener(sesion_id) is None


def test_una_lectura_anterior_a_una_escritura_no_se_guarda() -> None:
    cache = servicio.CacheEstados()
    sesion_id = uuid4()
    generacion = cache.generacion(sesion_id)  # empieza la lectura
    cache.invalidar(sesion_id)  # alguien escribe mientras
    cache.guardar(_foto(sesion_id), generacion)  # la lectura vieja llega tarde
    assert cache.obtener(sesion_id) is None
    cache.guardar(_foto(sesion_id, "nueva"), cache.generacion(sesion_id))
    foto = cache.obtener(sesion_id)
    assert foto is not None and foto.huella == "nueva"


def test_la_memoria_no_crece_sin_limite() -> None:
    cache = servicio.CacheEstados(maximo=10)
    for _ in range(50):
        sesion_id = uuid4()
        cache.guardar(_foto(sesion_id), 0)
        cache.invalidar(uuid4())
    assert len(cache._fotos) <= 10
    assert len(cache._generaciones) <= 11


@pytest.mark.parametrize(
    ("cabecera", "coincide"),
    [
        (None, False),
        ("", False),
        ('"abc"', True),
        ('W/"abc"', True),
        ('"x", "abc"', True),
        ("*", True),
        ('"abcd"', False),
        ("abc", False),
    ],
)
def test_coincide_etag(cabecera: str | None, coincide: bool) -> None:
    assert servicio.coincide_etag(cabecera, '"abc"') is coincide


# ---------------------------------------------------------------------------
# Cierre por inactividad (AC-02.4)
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-02.4")
async def test_tres_horas_sin_actividad_cierran_la_sesion(
    cliente: AsyncClient,
    sesion: AsyncSession,
    fabrica_mesa: Any,
    restaurante: Restaurante,
    mesa: Mesa,
) -> None:
    ahora = datetime.now(UTC)
    mesas = [mesa] + [await fabrica_mesa(restaurante) for _ in range(3)]
    dentro = [(await _mesa_con(cliente, m, 1))[0] for m in mesas]
    vieja, casi, lista, cerrada = (d["sesion"]["id"] for d in dentro)
    await _poner(sesion, vieja, ultima_actividad_en=ahora - timedelta(hours=3, minutes=1))
    await _poner(sesion, casi, ultima_actividad_en=ahora - timedelta(hours=2, minutes=59))
    await _poner(
        sesion,
        lista,
        estado="lista_para_enviar",
        ultima_actividad_en=ahora - timedelta(hours=4),
    )
    await _poner(sesion, cerrada, estado="cerrada", ultima_actividad_en=ahora - timedelta(hours=9))

    cerradas = await servicio.cerrar_inactivas(sesion, ahora=ahora)
    assert set(cerradas) == {UUID(vieja), UUID(lista)}
    filas = {
        str(s.id): s
        for s in await sesion.scalars(
            select(SesionGrupal)
            .where(SesionGrupal.id.in_([UUID(x) for x in (vieja, casi, lista, cerrada)]))
            .execution_options(populate_existing=True)
        )
    }
    assert filas[vieja].estado == filas[lista].estado == "cerrada"
    assert filas[vieja].fin == ahora
    assert filas[casi].estado == "activa" and filas[casi].fin is None
    assert filas[cerrada].fin is None  # no se toca lo ya cerrado

    assert (await estado(cliente, dentro[0]["token"])).status_code == 410
    assert (await estado(cliente, dentro[1]["token"])).status_code == 200
    # Volver a escanear la mesa cerrada abre una sesión nueva.
    respuesta, _ = await entrar(cliente, mesa.codigo_publico, dentro[0]["token"])
    assert respuesta.json()["sesion"]["id"] != vieja


@pytest.mark.ac("AC-02.4")
async def test_el_cierre_invalida_la_memoria_del_sondeo(
    cliente: AsyncClient, sesion: AsyncSession, mesa: Mesa
) -> None:
    (ana,) = await _mesa_con(cliente, mesa, 1)
    assert (await estado(cliente, ana["token"])).status_code == 200  # foto en memoria
    await sesion.execute(
        update(SesionGrupal)
        .where(SesionGrupal.id == UUID(ana["sesion"]["id"]))
        .values(ultima_actividad_en=datetime.now(UTC) - timedelta(hours=4))
    )
    await sesion.commit()
    await servicio.cerrar_inactivas(sesion)
    assert (await estado(cliente, ana["token"])).status_code == 410


@pytest.mark.ac("AC-02.4")
async def test_la_tarea_periodica_cierra_por_lotes(
    fabrica_sesion: async_sessionmaker[AsyncSession],
    sesion: AsyncSession,
    cliente: AsyncClient,
    fabrica_mesa: Any,
    restaurante: Restaurante,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    ahora = datetime.now(UTC)
    ids = []
    for _ in range(5):
        (dentro,) = await _mesa_con(cliente, await fabrica_mesa(restaurante), 1)
        ids.append(dentro["sesion"]["id"])
        await _poner(sesion, dentro["sesion"]["id"], ultima_actividad_en=ahora - timedelta(hours=5))
    cierre = servicio.CierreInactivas(fabrica_sesion, lote=2, reloj=lambda: ahora)
    assert await cierre.ciclo() == 5
    assert await cierre.ciclo() == 0


@pytest.fixture
async def mesas_reales(motor_pruebas: AsyncEngine) -> AsyncIterator[dict[str, Any]]:
    """Restaurante con 6 sesiones vencidas, confirmadas de verdad; se borran al final."""
    fabrica = async_sessionmaker(motor_pruebas, expire_on_commit=False)
    vencida = datetime.now(UTC) - timedelta(hours=5)
    async with fabrica() as s:
        restaurante = Restaurante(nombre="Cierre", slug=f"cierre-{uuid4().hex[:8]}")
        s.add(restaurante)
        await s.flush()
        sesiones = []
        for numero in range(1, 7):
            mesa = Mesa(
                restaurante_id=restaurante.id, numero=numero, codigo_publico=codigo_de_mesa()
            )
            s.add(mesa)
            await s.flush()
            grupal = SesionGrupal(
                mesa_id=mesa.id, restaurante_id=restaurante.id, ultima_actividad_en=vencida
            )
            s.add(grupal)
            sesiones.append(grupal)
        await s.commit()
    try:
        yield {"fabrica": fabrica, "sesiones": [g.id for g in sesiones]}
    finally:
        async with fabrica() as s:
            await s.execute(delete(Restaurante).where(Restaurante.id == restaurante.id))
            await s.commit()


@pytest.mark.ac("AC-02.4")
async def test_dos_workers_cerrando_a_la_vez_no_se_estorban(
    mesas_reales: dict[str, Any],
) -> None:
    """Con N workers la tarea corre en cada uno: `SKIP LOCKED` reparte las filas, ninguna se
    cierra dos veces y ninguno espera al otro."""
    fabrica, ids = mesas_reales["fabrica"], set(mesas_reales["sesiones"])
    async with fabrica() as a, fabrica() as b:
        uno, otro = await asyncio.wait_for(
            asyncio.gather(servicio.cerrar_inactivas(a), servicio.cerrar_inactivas(b)),
            timeout=10,
        )
    # Otra corrida de la suite (su *lifespan* real) podría cerrar alguna también: lo que
    # importa es que ninguna se cierre dos veces y que al final estén todas cerradas.
    mias = set(uno) & ids, set(otro) & ids
    assert not mias[0] & mias[1]
    assert mias[0] or mias[1]
    async with fabrica() as s:
        estados = set(
            (await s.scalars(select(SesionGrupal.estado).where(SesionGrupal.id.in_(ids)))).all()
        )
    assert estados == {"cerrada"}


@pytest.mark.ac("AC-02.4")
async def test_una_sesion_en_uso_se_salta_y_no_se_cierra(
    mesas_reales: dict[str, Any],
) -> None:
    """Si alguien tiene la sesión bloqueada (está entrando), el cierre la salta en vez de
    esperarlo; al confirmar con actividad nueva, ya no está vencida."""
    fabrica, ids = mesas_reales["fabrica"], mesas_reales["sesiones"]
    en_uso = ids[0]
    async with fabrica() as quien_entra, fabrica() as cierre:
        await servicio.unirse(quien_entra, en_uso)
        cerradas = await asyncio.wait_for(servicio.cerrar_inactivas(cierre), timeout=5)
        await quien_entra.execute(
            update(SesionGrupal)
            .where(SesionGrupal.id == en_uso)
            .values(ultima_actividad_en=datetime.now(UTC))
        )
        await quien_entra.commit()
    assert en_uso not in cerradas
    async with fabrica() as s:
        estados = dict(
            (
                await s.execute(
                    select(SesionGrupal.id, SesionGrupal.estado).where(SesionGrupal.id.in_(ids))
                )
            ).all()
        )
    assert estados.pop(en_uso) == "activa"
    assert set(estados.values()) == {"cerrada"}


# ---------------------------------------------------------------------------
# Tarea de fondo: arranca con la app, se relanza si muere
# ---------------------------------------------------------------------------


async def test_el_lifespan_arranca_y_detiene_el_cierre(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.services.procesador import Procesador

    eventos: list[str] = []
    arranco = asyncio.Event()

    async def correr(self: servicio.CierreInactivas) -> None:
        eventos.append("arranca")
        arranco.set()
        try:
            await asyncio.Event().wait()
        finally:
            eventos.append("se detiene")

    async def quieto(self: Procesador) -> None:
        await asyncio.Event().wait()

    monkeypatch.setattr(servicio.CierreInactivas, "correr", correr)
    monkeypatch.setattr(Procesador, "correr", quieto)
    async with app.router.lifespan_context(app):
        await asyncio.wait_for(arranco.wait(), timeout=5)
        assert eventos == ["arranca"]
    assert eventos == ["arranca", "se detiene"]


async def test_si_la_tarea_muere_se_relanza(
    fabrica_sesion: async_sessionmaker[AsyncSession], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(servicio, "PAUSA_REINICIO_SEGUNDOS", 0.0)
    corridas: list[int] = []
    segunda = asyncio.Event()

    async def correr(self: servicio.CierreInactivas) -> None:
        corridas.append(len(corridas) + 1)
        if len(corridas) == 1:
            raise RuntimeError("se cayó")
        segunda.set()
        await asyncio.Event().wait()

    monkeypatch.setattr(servicio.CierreInactivas, "correr", correr)
    cierre = servicio.CierreInactivas(fabrica_sesion)
    cierre.iniciar()
    try:
        await asyncio.wait_for(segunda.wait(), timeout=5)
    finally:
        await cierre.detener()
    assert corridas == [1, 2]


async def test_un_ciclo_que_falla_no_mata_la_tarea(
    fabrica_sesion: async_sessionmaker[AsyncSession], monkeypatch: pytest.MonkeyPatch
) -> None:
    ciclos: list[str] = []
    otra_vez = asyncio.Event()

    async def ciclo(self: servicio.CierreInactivas) -> int:
        ciclos.append("ciclo")
        if len(ciclos) == 1:
            raise RuntimeError("base caída")
        otra_vez.set()
        return 0

    monkeypatch.setattr(servicio.CierreInactivas, "ciclo", ciclo)
    cierre = servicio.CierreInactivas(fabrica_sesion, intervalo=0.0)
    cierre.iniciar()
    try:
        await asyncio.wait_for(otra_vez.wait(), timeout=5)
    finally:
        await cierre.detener()
    assert len(ciclos) >= 2
