"""T-2.1: `POST /p/sesion/entrar` (US-01, US-02, US-03).

Crea o reanuda la sesión de la mesa y el miembro; emite la cookie `carta_invitado`. Las
carreras (INV-1, INV-11 y el tope de 12) corren con conexiones reales (`motor_pruebas`) y
datos confirmados de verdad, que se borran al terminar (receta de `/pruebas` §3).
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.core.config import settings
from app.core.errores import ErrorCarta
from app.core.seguridad import Invitado, verificar_token_invitado
from app.db.models import Mesa, MiembroSesion, Restaurante, SesionGrupal
from app.services import sesion as servicio
from tests.fabricas import codigo_de_mesa
from tests.invitado_pruebas import (
    P,
    entrar,
    estado,
    set_cookie_invitado,
    sin_request_id,
)

A = "/api/v1/admin"


@pytest.fixture(autouse=True)
def _cache_limpia() -> None:
    servicio.cache_estados.vaciar()


async def _miembros(sesion: AsyncSession, sesion_id: str | UUID) -> list[MiembroSesion]:
    filas = await sesion.scalars(
        select(MiembroSesion)
        .where(MiembroSesion.sesion_id == UUID(str(sesion_id)))
        .order_by(MiembroSesion.unido_en, MiembroSesion.id)
        .execution_options(populate_existing=True)
    )
    return list(filas.all())


# ---------------------------------------------------------------------------
# Entrar por primera vez: token, sesión nueva y host (AC-01.2, AC-02.2, AC-03.1)
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-01.2", "AC-02.2", "AC-03.1")
async def test_el_primero_abre_la_sesion_como_host_con_cookie_de_seis_horas(
    cliente: AsyncClient, sesion: AsyncSession, restaurante: Restaurante, mesa: Mesa
) -> None:
    respuesta, token = await entrar(cliente, mesa.codigo_publico)
    assert respuesta.status_code == 200, respuesta.text
    cuerpo = respuesta.json()
    assert cuerpo["sesion"]["estado"] == "activa"
    assert cuerpo["sesion"]["mesa"] == {"numero": mesa.numero, "capacidad": mesa.capacidad}
    assert cuerpo["sesion"]["restaurante"] == {
        "id": str(restaurante.id),
        "nombre": restaurante.nombre,
        "slug": restaurante.slug,
        "logo_url": restaurante.logo_url,
        "tema": restaurante.tema,
    }
    assert cuerpo["miembro"]["alias"] == "Comensal 1"
    assert cuerpo["miembro"]["rol"] == "host"
    assert cuerpo["miembro"]["color_avatar"] == servicio.COLORES[0]
    assert respuesta.headers["cache-control"] == "private, no-store"

    galleta = set_cookie_invitado(respuesta)["carta_invitado"]
    assert galleta["max-age"] == "21600"
    assert galleta["httponly"] and galleta["secure"]
    assert galleta["samesite"].lower() == "lax"
    assert galleta["path"] == "/api/v1/p"

    assert token is not None
    invitado = verificar_token_invitado(token)
    assert invitado == Invitado(
        UUID(cuerpo["miembro"]["id"]), UUID(cuerpo["sesion"]["id"]), restaurante.id
    )
    grupal = await sesion.get(SesionGrupal, invitado.sesion_id)
    assert grupal is not None and grupal.mesa_id == mesa.id
    assert grupal.restaurante_id == restaurante.id


@pytest.mark.ac("AC-01.2")
async def test_entrar_no_pide_ni_acepta_datos_personales(cliente: AsyncClient, mesa: Mesa) -> None:
    """El cuerpo es sólo el código: cualquier otro campo (nombre, teléfono…) es 422."""
    respuesta = await cliente.post(
        f"{P}/sesion/entrar",
        json={"codigo_mesa": mesa.codigo_publico, "nombre": "Ana", "telefono": "5555555555"},
    )
    assert respuesta.status_code == 422
    assert respuesta.json()["error"]["codigo"] == "PAYLOAD_INVALIDO"


@pytest.mark.ac("AC-02.1", "AC-03.1")
async def test_los_siguientes_se_unen_a_la_misma_sesion_con_alias_y_color_propios(
    cliente: AsyncClient, sesion: AsyncSession, mesa: Mesa
) -> None:
    respuestas = [(await entrar(cliente, mesa.codigo_publico))[0] for _ in range(3)]
    sesiones = {r.json()["sesion"]["id"] for r in respuestas}
    assert len(sesiones) == 1
    miembros = [r.json()["miembro"] for r in respuestas]
    assert [m["alias"] for m in miembros] == ["Comensal 1", "Comensal 2", "Comensal 3"]
    assert [m["rol"] for m in miembros] == ["host", "miembro", "miembro"]
    assert [m["color_avatar"] for m in miembros] == list(servicio.COLORES[:3])
    en_base = await _miembros(sesion, sesiones.pop())
    assert [m.color_avatar for m in en_base] == list(servicio.COLORES[:3])


def test_los_doce_colores_son_distintos_y_hex() -> None:
    assert len(set(servicio.COLORES)) == servicio.MAX_MIEMBROS == 12
    for color in servicio.COLORES:
        assert len(color) == 7 and color[0] == "#"
        assert color[1:] == color[1:].upper()
        int(color[1:], 16)


# ---------------------------------------------------------------------------
# Volver a abrir la URL (AC-01.4)
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-01.4", "AC-03.1")
async def test_volver_con_la_cookie_reanuda_la_misma_identidad(
    cliente: AsyncClient, sesion: AsyncSession, mesa: Mesa
) -> None:
    primera, token = await entrar(cliente, mesa.codigo_publico)
    await entrar(cliente, mesa.codigo_publico)  # otro comensal
    otra_vez, token_nuevo = await entrar(cliente, mesa.codigo_publico, token)
    assert otra_vez.status_code == 200
    assert otra_vez.json()["miembro"] == primera.json()["miembro"]
    assert otra_vez.json()["sesion"]["id"] == primera.json()["sesion"]["id"]
    assert token_nuevo is not None  # cookie renovada, misma identidad
    assert verificar_token_invitado(token_nuevo) == verificar_token_invitado(token or "")
    assert len(await _miembros(sesion, primera.json()["sesion"]["id"])) == 2


@pytest.mark.ac("AC-01.4", "AC-02.5")
async def test_reanudar_funciona_aunque_la_sesion_este_llena(
    cliente: AsyncClient, mesa: Mesa
) -> None:
    _, token = await entrar(cliente, mesa.codigo_publico)
    for _ in range(11):
        await entrar(cliente, mesa.codigo_publico)
    respuesta, _ = await entrar(cliente, mesa.codigo_publico, token)
    assert respuesta.status_code == 200
    assert respuesta.json()["miembro"]["alias"] == "Comensal 1"


@pytest.mark.ac("AC-01.4")
async def test_una_cookie_de_otra_mesa_o_invalida_entra_como_nuevo(
    cliente: AsyncClient, fabrica_mesa: Any, restaurante: Restaurante, mesa: Mesa
) -> None:
    otra_mesa = await fabrica_mesa(restaurante)
    _, de_otra_mesa = await entrar(cliente, otra_mesa.codigo_publico)
    await entrar(cliente, mesa.codigo_publico)
    respuesta, _ = await entrar(cliente, mesa.codigo_publico, de_otra_mesa)
    assert respuesta.status_code == 200
    assert respuesta.json()["miembro"]["alias"] == "Comensal 2"
    basura, _ = await entrar(cliente, mesa.codigo_publico, "no.es.jwt")
    assert basura.status_code == 200
    assert basura.json()["miembro"]["alias"] == "Comensal 3"


@pytest.mark.ac("AC-01.4", "AC-02.2")
async def test_con_la_sesion_cerrada_volver_a_escanear_abre_una_nueva(
    cliente: AsyncClient, sesion: AsyncSession, mesa: Mesa
) -> None:
    primera, token = await entrar(cliente, mesa.codigo_publico)
    sesion_id = UUID(primera.json()["sesion"]["id"])
    await sesion.execute(
        update(SesionGrupal).where(SesionGrupal.id == sesion_id).values(estado="cerrada")
    )
    await sesion.commit()
    respuesta, _ = await entrar(cliente, mesa.codigo_publico, token)
    assert respuesta.status_code == 200
    assert respuesta.json()["sesion"]["id"] != str(sesion_id)
    assert respuesta.json()["miembro"]["rol"] == "host"
    assert respuesta.json()["miembro"]["alias"] == "Comensal 1"


# ---------------------------------------------------------------------------
# Máximo 12 (AC-02.5)
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-02.5")
async def test_el_decimotercero_recibe_409_sesion_llena(
    cliente: AsyncClient, sesion: AsyncSession, mesa: Mesa
) -> None:
    for n in range(1, 13):
        respuesta, _ = await entrar(cliente, mesa.codigo_publico)
        assert respuesta.status_code == 200, n
    sesion_id = respuesta.json()["sesion"]["id"]
    decimotercero, token = await entrar(cliente, mesa.codigo_publico)
    assert decimotercero.status_code == 409
    assert decimotercero.json()["error"]["codigo"] == "SESION_LLENA"
    assert "set-cookie" not in decimotercero.headers
    assert token is None
    assert len(await _miembros(sesion, sesion_id)) == 12


# ---------------------------------------------------------------------------
# Códigos inválidos (AC-01.3) y revocación (AC-21.3)
# ---------------------------------------------------------------------------


async def _error_404(cliente: AsyncClient, codigo: str) -> dict[str, Any]:
    respuesta, _ = await entrar(cliente, codigo)
    assert respuesta.status_code == 404, (codigo, respuesta.text)
    assert "set-cookie" not in respuesta.headers
    assert respuesta.headers["cache-control"] == "no-store"
    return sin_request_id(respuesta.json())


@pytest.mark.ac("AC-01.3")
async def test_codigos_invalidos_son_404_con_el_mismo_cuerpo(
    cliente: AsyncClient,
    sesion: AsyncSession,
    fabrica_restaurante: Any,
    fabrica_mesa: Any,
    restaurante: Restaurante,
) -> None:
    """Desconocido, de una mesa dada de baja o de un restaurante dado de baja: el mismo
    cuerpo, así que nadie distingue un código que existe (aquí o en otro restaurante) de uno
    inventado."""
    inexistente = await _error_404(cliente, codigo_de_mesa())
    assert inexistente == {
        "error": {
            "codigo": "MESA_NO_ENCONTRADA",
            "mensaje": "No encontramos esta mesa.",
            "detalles": {},
        }
    }
    dada_de_baja = await fabrica_mesa(restaurante, activa=False)
    otro = await fabrica_restaurante(activo=False)
    de_restaurante_inactivo = await fabrica_mesa(otro)
    for codigo in (
        dada_de_baja.codigo_publico,
        de_restaurante_inactivo.codigo_publico,
        "corto",
        "x" * 200,
        "' OR 1=1 --",
    ):
        assert await _error_404(cliente, codigo) == inexistente, codigo
    assert await sesion.scalar(select(func.count()).select_from(SesionGrupal).where(
        SesionGrupal.mesa_id.in_([dada_de_baja.id, de_restaurante_inactivo.id])
    )) == 0  # fmt: skip


@pytest.mark.parametrize("cuerpo", [{}, {"codigo_mesa": ""}, {"codigo_mesa": "x" * 201}])
async def test_un_cuerpo_sin_codigo_es_422(cliente: AsyncClient, cuerpo: dict[str, Any]) -> None:
    respuesta = await cliente.post(f"{P}/sesion/entrar", json=cuerpo)
    assert respuesta.status_code == 422


@pytest.mark.ac("AC-21.3", "AC-01.3")
async def test_tras_regenerar_el_codigo_viejo_es_404_y_la_sesion_abierta_sigue(
    cliente: AsyncClient,
    mesa: Mesa,
    cabecera_operador: dict[str, str],
) -> None:
    """Decisión de T-2.1 (04 §11): regenerar mata el código, no la sesión. El código viejo
    da exactamente el 404 de un código inexistente; quien ya estaba sigue en la mesa y el
    código nuevo entra a la misma sesión viva."""
    viejo = mesa.codigo_publico
    dentro, token = await entrar(cliente, viejo)
    assert token is not None
    regenerada = await cliente.post(
        f"{A}/mesas/{mesa.id}/regenerar-codigo", headers=cabecera_operador
    )
    assert regenerada.status_code == 200, regenerada.text
    nuevo = regenerada.json()["codigo_publico"]
    assert nuevo != viejo

    assert await _error_404(cliente, viejo) == await _error_404(cliente, codigo_de_mesa())
    # Ni con su propia cookie vigente se entra por el código viejo.
    revocado, _ = await entrar(cliente, viejo, token)
    assert revocado.status_code == 404

    sigue = await estado(cliente, token)
    assert sigue.status_code == 200
    assert sigue.json()["id"] == dentro.json()["sesion"]["id"]

    con_nuevo, _ = await entrar(cliente, nuevo)
    assert con_nuevo.status_code == 200
    assert con_nuevo.json()["sesion"]["id"] == dentro.json()["sesion"]["id"]
    assert con_nuevo.json()["miembro"]["alias"] == "Comensal 2"


@pytest.mark.parametrize("entorno", ["staging", "produccion"])
async def test_las_rutas_reales_responden_fuera_de_desarrollo(
    cliente: AsyncClient, mesa: Mesa, monkeypatch: pytest.MonkeyPatch, entorno: str
) -> None:
    """Las rutas de T-2.1 no están detrás de `solo_desarrollo` (sí las de ejemplo)."""
    monkeypatch.setattr(settings, "ENTORNO", entorno)
    respuesta, token = await entrar(cliente, mesa.codigo_publico)
    assert respuesta.status_code == 200
    assert token is not None
    assert (await estado(cliente, token)).status_code == 200


# ---------------------------------------------------------------------------
# Unirse a una sesión cerrada (INV-11) y actividad
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-02.1")
async def test_unirse_a_una_sesion_cerrada_es_410(
    sesion: AsyncSession, cliente: AsyncClient, mesa: Mesa
) -> None:
    respuesta, _ = await entrar(cliente, mesa.codigo_publico)
    sesion_id = UUID(respuesta.json()["sesion"]["id"])
    for estado_final in ("cerrada", "cancelada"):
        await sesion.execute(
            update(SesionGrupal).where(SesionGrupal.id == sesion_id).values(estado=estado_final)
        )
        await sesion.commit()
        with pytest.raises(ErrorCarta) as error:
            await servicio.unirse(sesion, sesion_id)
        assert (error.value.http, error.value.codigo) == (410, "SESION_CERRADA")
        await sesion.rollback()


@pytest.mark.ac("AC-02.4")
async def test_entrar_cuenta_como_actividad(
    cliente: AsyncClient, sesion: AsyncSession, mesa: Mesa
) -> None:
    respuesta, _ = await entrar(cliente, mesa.codigo_publico)
    sesion_id = UUID(respuesta.json()["sesion"]["id"])
    hace_dos_horas = datetime.now(UTC) - timedelta(hours=2)
    await sesion.execute(
        update(SesionGrupal)
        .where(SesionGrupal.id == sesion_id)
        .values(ultima_actividad_en=hace_dos_horas)
    )
    await sesion.commit()
    await entrar(cliente, mesa.codigo_publico)
    grupal = await sesion.scalar(
        select(SesionGrupal)
        .where(SesionGrupal.id == sesion_id)
        .execution_options(populate_existing=True)
    )
    assert grupal is not None
    assert grupal.ultima_actividad_en > hace_dos_horas + timedelta(hours=1)


# ---------------------------------------------------------------------------
# Carreras con conexiones reales
# ---------------------------------------------------------------------------


@pytest.fixture
async def mesa_real(motor_pruebas: AsyncEngine) -> AsyncIterator[dict[str, Any]]:
    """Restaurante y mesa confirmados de verdad; al final se borra el restaurante (arrastra
    mesa, sesiones y miembros)."""
    fabrica = async_sessionmaker(motor_pruebas, expire_on_commit=False)
    async with fabrica() as s:
        restaurante = Restaurante(nombre="Carrera", slug=f"carrera-{uuid4().hex[:8]}")
        s.add(restaurante)
        await s.flush()
        mesa = Mesa(restaurante_id=restaurante.id, numero=1, codigo_publico=codigo_de_mesa())
        s.add(mesa)
        await s.commit()
    try:
        yield {"fabrica": fabrica, "restaurante": restaurante, "mesa": mesa}
    finally:
        async with fabrica() as s:
            await s.execute(delete(Restaurante).where(Restaurante.id == restaurante.id))
            await s.commit()


async def _sesiones_de(fabrica: async_sessionmaker[AsyncSession], mesa: Mesa) -> list[SesionGrupal]:
    async with fabrica() as s:
        return list(
            (
                await s.scalars(
                    select(SesionGrupal)
                    .where(SesionGrupal.mesa_id == mesa.id)
                    .order_by(SesionGrupal.inicio)
                )
            ).all()
        )


async def _esperar_bloqueo(fabrica: async_sessionmaker[AsyncSession], pid: int) -> None:
    """Hasta que la conexión `pid` esté esperando un candado (máximo 5 s)."""
    async with fabrica() as s:
        for _ in range(500):
            esperando = await s.scalar(
                text("SELECT wait_event_type = 'Lock' FROM pg_stat_activity WHERE pid = :pid"),
                {"pid": pid},
            )
            if esperando:
                return
            await s.rollback()
            await asyncio.sleep(0.01)
    raise AssertionError("la otra conexión nunca esperó el candado")


@pytest.mark.ac("AC-02.1", "AC-02.2")
async def test_carrera_a_cierra_y_abre_otra_mientras_b_se_une(
    mesa_real: dict[str, Any],
) -> None:
    """INV-11: A cierra la sesión viva y abre otra en la misma transacción; B entra a la mesa
    a la vez y queda esperando el candado de la vieja. Al confirmar A, B vuelve a comprobar,
    ve la vieja cerrada y se une a la nueva: nunca a la cerrada."""
    fabrica, mesa = mesa_real["fabrica"], mesa_real["mesa"]
    async with fabrica() as s:
        vieja = SesionGrupal(mesa_id=mesa.id, restaurante_id=mesa.restaurante_id)
        s.add(vieja)
        await s.commit()

    async with fabrica() as a, fabrica() as b:
        # A: cierra la vieja y abre la nueva, sin confirmar todavía.
        await a.execute(
            update(SesionGrupal).where(SesionGrupal.id == vieja.id).values(estado="cerrada")
        )
        nueva = SesionGrupal(mesa_id=mesa.id, restaurante_id=mesa.restaurante_id)
        a.add(nueva)
        await a.flush()
        pid_b = await b.scalar(text("SELECT pg_backend_pid()"))
        tarea_b = asyncio.create_task(servicio.entrar(b, mesa.codigo_publico))
        await _esperar_bloqueo(fabrica, int(pid_b or 0))
        await a.commit()
        resultado = await asyncio.wait_for(tarea_b, timeout=10)

    assert resultado.sesion.id == nueva.id
    assert resultado.miembro.sesion_id == nueva.id
    assert resultado.miembro.rol == "host"
    sesiones = await _sesiones_de(fabrica, mesa)
    assert [(s.id, s.estado) for s in sesiones] == [(vieja.id, "cerrada"), (nueva.id, "activa")]
    async with fabrica() as s:
        en_vieja = await s.scalar(
            select(func.count())
            .select_from(MiembroSesion)
            .where(MiembroSesion.sesion_id == vieja.id)
        )
    assert en_vieja == 0


@pytest.mark.ac("AC-02.1", "AC-02.2")
async def test_dos_que_abren_la_mesa_a_la_vez_quedan_en_una_sola_sesion(
    mesa_real: dict[str, Any],
) -> None:
    """INV-1: los dos crean sesión; el índice único rechaza la segunda, que relee y se une
    a la que ganó. Un host, un miembro."""
    fabrica, mesa = mesa_real["fabrica"], mesa_real["mesa"]
    async with fabrica() as a, fabrica() as b:
        resultados = await asyncio.gather(
            servicio.entrar(a, mesa.codigo_publico), servicio.entrar(b, mesa.codigo_publico)
        )
    assert resultados[0].sesion.id == resultados[1].sesion.id
    assert sorted(r.miembro.rol for r in resultados) == ["host", "miembro"]
    assert sorted(r.miembro.alias or "" for r in resultados) == ["Comensal 1", "Comensal 2"]
    assert len(await _sesiones_de(fabrica, mesa)) == 1


@pytest.mark.ac("AC-02.5")
async def test_dos_que_entran_por_el_lugar_doce_no_pasan_de_doce(
    mesa_real: dict[str, Any],
) -> None:
    """El tope necesita serializar las uniones (`FOR NO KEY UPDATE`): con 11 dentro, dos a la
    vez dan un 200 y un 409, nunca 13."""
    fabrica, mesa = mesa_real["fabrica"], mesa_real["mesa"]
    async with fabrica() as s:
        for _ in range(11):
            await servicio.entrar(s, mesa.codigo_publico)
    async with fabrica() as a, fabrica() as b:
        resultados = await asyncio.gather(
            servicio.entrar(a, mesa.codigo_publico),
            servicio.entrar(b, mesa.codigo_publico),
            return_exceptions=True,
        )
    errores = [r for r in resultados if isinstance(r, ErrorCarta)]
    assert len(errores) == 1, resultados
    assert errores[0].codigo == "SESION_LLENA"
    (grupal,) = await _sesiones_de(fabrica, mesa)
    async with fabrica() as s:
        cuantos = await s.scalar(
            select(func.count())
            .select_from(MiembroSesion)
            .where(MiembroSesion.sesion_id == grupal.id)
        )
    assert cuantos == 12
