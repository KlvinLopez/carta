"""T-1.5: mesas del operador y revocación de códigos (US-21, AC-21.1, AC-21.3).

Rutas reales de `/api/v1/admin`: crear N mesas con un código de 128 bits cada una, listar,
regenerar con revocación inmediata y aislamiento por restaurante (ajena = inexistente).
La revocación se prueba también con `mesas.mesa_por_codigo`, la función que usará la ruta
pública de la Fase 2.
"""

from __future__ import annotations

import re
from typing import Any
from uuid import UUID

import httpx
import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import Mesa, Restaurante
from app.schemas.comun import ErrorRespuesta
from app.schemas.mesa import MAX_MESAS_ACTIVAS, MAX_MESAS_POR_LLAMADA
from app.services import mesas
from tests.conftest import Fabrica

A = "/api/v1/admin"
UUID_X = "00000000-0000-4000-8000-0000000000aa"
URLSAFE = re.compile(r"^[A-Za-z0-9_-]{22,}$")


def _codigo(respuesta: httpx.Response) -> str:
    codigo: str = ErrorRespuesta.model_validate(respuesta.json()).error.codigo
    return codigo


def _sin_id(respuesta: httpx.Response) -> dict[str, Any]:
    cuerpo: dict[str, Any] = respuesta.json()
    cuerpo["error"].pop("request_id", None)
    return cuerpo


@pytest.fixture
async def ajeno(fabrica_restaurante: Fabrica, fabrica_operador: Fabrica) -> Restaurante:
    restaurante: Restaurante = await fabrica_restaurante()
    await fabrica_operador(restaurante)
    return restaurante


async def _crear(
    cliente: AsyncClient, rid: UUID, cabecera: dict[str, str], cantidad: int, **extra: Any
) -> httpx.Response:
    return await cliente.post(
        f"{A}/restaurantes/{rid}/mesas", json={"cantidad": cantidad, **extra}, headers=cabecera
    )


# ===========================================================================
# AC-21.1 · crear mesas con código único no adivinable
# ===========================================================================


@pytest.mark.ac("AC-21.1")
async def test_crear_mesas_numera_a_continuacion_con_codigos_de_128_bits(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    sesion: AsyncSession,
) -> None:
    respuesta = await _crear(cliente, restaurante.id, cabecera_operador, 3, capacidad=6)
    assert respuesta.status_code == 201, respuesta.text
    creadas = respuesta.json()
    assert [m["numero"] for m in creadas] == [1, 2, 3]
    assert {m["capacidad"] for m in creadas} == {6}
    assert all(m["activa"] for m in creadas)
    codigos = [m["codigo_publico"] for m in creadas]
    assert len(set(codigos)) == 3
    assert all(URLSAFE.match(c) for c in codigos)  # token_urlsafe(16) = 22 caracteres
    for m in creadas:
        assert m["url_publica"] == f"https://{settings.DOMINIO}/m/{m['codigo_publico']}"

    segunda = await _crear(cliente, restaurante.id, cabecera_operador, 2)
    assert [m["numero"] for m in segunda.json()] == [4, 5]  # a continuación
    guardadas = (
        await sesion.scalars(select(Mesa).where(Mesa.restaurante_id == restaurante.id))
    ).all()
    assert len(guardadas) == 5
    assert all(m.codigo_revocado_en is None for m in guardadas)


@pytest.mark.ac("AC-21.1")
async def test_la_numeracion_no_reutiliza_el_numero_de_una_mesa_dada_de_baja(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_mesa: Fabrica,
) -> None:
    await fabrica_mesa(restaurante, numero=7, activa=False)
    respuesta = await _crear(cliente, restaurante.id, cabecera_operador, 2)
    assert [m["numero"] for m in respuesta.json()] == [8, 9]


@pytest.mark.ac("AC-21.1")
@pytest.mark.parametrize(
    "cuerpo",
    [
        {"cantidad": 0},
        {"cantidad": MAX_MESAS_POR_LLAMADA + 1},
        {"cantidad": 2, "capacidad": 0},
        {"cantidad": 2, "capacidad": 51},
        {"cantidad": "dos"},
        {},
        {"cantidad": 2, "restaurante_id": UUID_X},
        {"cantidad": 2, "codigo_publico": "elegido-por-el-cliente-0123456789"},
        {"cantidad": 2, "activa": False},
    ],
)
async def test_un_cuerpo_invalido_es_422_y_no_crea_nada(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    sesion: AsyncSession,
    cuerpo: dict[str, Any],
) -> None:
    respuesta = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/mesas", json=cuerpo, headers=cabecera_operador
    )
    assert respuesta.status_code == 422, respuesta.text
    assert _codigo(respuesta) == "PAYLOAD_INVALIDO"
    total = await sesion.scalar(select(func.count()).select_from(Mesa))
    assert total == 0


@pytest.mark.ac("AC-21.1")
async def test_el_tope_de_mesas_activas_es_422_y_no_deja_a_medias(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    sesion: AsyncSession,
) -> None:
    for _ in range(MAX_MESAS_ACTIVAS // MAX_MESAS_POR_LLAMADA):
        assert (await _crear(cliente, restaurante.id, cabecera_operador, 100)).status_code == 201
    respuesta = await _crear(cliente, restaurante.id, cabecera_operador, 1)
    assert respuesta.status_code == 422
    assert _codigo(respuesta) == "PAYLOAD_INVALIDO"
    total = await sesion.scalar(
        select(func.count()).select_from(Mesa).where(Mesa.restaurante_id == restaurante.id)
    )
    assert total == MAX_MESAS_ACTIVAS


@pytest.mark.ac("AC-21.1")
async def test_los_topes_cuentan_solo_las_activas(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    sesion: AsyncSession,
) -> None:
    for _ in range(5):
        await _crear(cliente, restaurante.id, cabecera_operador, 100)
    una = (await sesion.scalars(select(Mesa).where(Mesa.restaurante_id == restaurante.id))).first()
    assert una is not None
    una.activa = False
    await sesion.commit()
    respuesta = await _crear(cliente, restaurante.id, cabecera_operador, 1)
    assert respuesta.status_code == 201
    assert respuesta.json()[0]["numero"] == 501


@pytest.mark.ac("AC-21.1")
async def test_un_codigo_que_ya_existe_se_descarta_y_se_genera_otro(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_mesa: Fabrica,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    ocupado = "ocupado-ocupado-ocupado-0123"
    await fabrica_mesa(restaurante, codigo_publico=ocupado)
    # 1.er intento: choca con la base; 2.º intento: dos libres.
    secuencia = iter(
        [
            ocupado,
            "nuevo-nuevo-nuevo-nuevo-01",
            "otro-otro-otro-otro-otro-02",
            "y-otro-mas-0123456789-3",
        ]
    )
    monkeypatch.setattr(mesas, "nuevo_codigo", lambda: next(secuencia))
    respuesta = await _crear(cliente, restaurante.id, cabecera_operador, 2)
    assert respuesta.status_code == 201, respuesta.text
    assert ocupado not in {m["codigo_publico"] for m in respuesta.json()}


@pytest.mark.ac("AC-21.1")
async def test_nuevo_codigo_usa_128_bits_y_no_se_repite() -> None:
    codigos = {mesas.nuevo_codigo() for _ in range(2000)}
    assert len(codigos) == 2000
    assert all(URLSAFE.match(c) and len(c) == 22 for c in codigos)


@pytest.mark.ac("AC-21.1")
async def test_listar_en_orden_con_filtro_y_sin_las_de_otro_restaurante(
    cliente: AsyncClient,
    restaurante: Restaurante,
    ajeno: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_mesa: Fabrica,
) -> None:
    await fabrica_mesa(restaurante, numero=3)
    await fabrica_mesa(restaurante, numero=1)
    await fabrica_mesa(restaurante, numero=2, activa=False)
    await fabrica_mesa(ajeno, numero=1)
    url = f"{A}/restaurantes/{restaurante.id}/mesas"
    todas = (await cliente.get(url, headers=cabecera_operador)).json()
    assert [m["numero"] for m in todas] == [1, 2, 3]
    activas = (await cliente.get(url, params={"activa": True}, headers=cabecera_operador)).json()
    assert [m["numero"] for m in activas] == [1, 3]
    inactivas = (await cliente.get(url, params={"activa": False}, headers=cabecera_operador)).json()
    assert [m["numero"] for m in inactivas] == [2]
    assert (
        await cliente.get(url, params={"limit": 0}, headers=cabecera_operador)
    ).status_code == 422


@pytest.mark.ac("AC-21.1")
async def test_un_restaurante_ajeno_es_404_igual_que_uno_inexistente(
    cliente: AsyncClient,
    ajeno: Restaurante,
    cabecera_operador: dict[str, str],
    sesion: AsyncSession,
) -> None:
    ajena = await cliente.get(f"{A}/restaurantes/{ajeno.id}/mesas", headers=cabecera_operador)
    nada = await cliente.get(f"{A}/restaurantes/{UUID_X}/mesas", headers=cabecera_operador)
    assert ajena.status_code == nada.status_code == 404
    assert _sin_id(ajena) == _sin_id(nada)
    creada = await _crear(cliente, ajeno.id, cabecera_operador, 2)
    assert creada.status_code == 404
    assert await sesion.scalar(select(func.count()).select_from(Mesa)) == 0


@pytest.mark.ac("AC-21.1")
async def test_sin_token_es_401(cliente: AsyncClient, restaurante: Restaurante) -> None:
    url = f"{A}/restaurantes/{restaurante.id}/mesas"
    assert (await cliente.get(url)).status_code == 401
    assert (await cliente.post(url, json={"cantidad": 1})).status_code == 401
    assert (await cliente.post(f"{A}/mesas/{UUID_X}/regenerar-codigo")).status_code == 401


# ===========================================================================
# AC-21.3 · regenerar revoca el código anterior de inmediato
# ===========================================================================


@pytest.mark.ac("AC-21.3")
async def test_regenerar_revoca_el_codigo_anterior_de_inmediato(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_mesa: Fabrica,
    sesion: AsyncSession,
) -> None:
    mesa = await fabrica_mesa(restaurante)
    otra = await fabrica_mesa(restaurante)
    viejo, de_la_otra = mesa.codigo_publico, otra.codigo_publico
    assert (await mesas.mesa_por_codigo(sesion, viejo)) is not None

    respuesta = await cliente.post(
        f"{A}/mesas/{mesa.id}/regenerar-codigo", headers=cabecera_operador
    )
    assert respuesta.status_code == 200, respuesta.text
    cuerpo = respuesta.json()
    nuevo = cuerpo["codigo_publico"]
    assert nuevo != viejo and URLSAFE.match(nuevo)
    assert cuerpo["id"] == str(mesa.id) and cuerpo["numero"] == mesa.numero
    assert cuerpo["url_publica"] == f"https://{settings.DOMINIO}/m/{nuevo}"

    # El viejo ya no resuelve; el nuevo sí; la otra mesa sigue igual.
    assert await mesas.mesa_por_codigo(sesion, viejo) is None
    resuelta = await mesas.mesa_por_codigo(sesion, nuevo)
    assert resuelta is not None and resuelta.id == mesa.id
    assert (await mesas.mesa_por_codigo(sesion, de_la_otra)) is not None
    await sesion.refresh(mesa)
    assert mesa.codigo_revocado_en is not None

    listadas = (
        await cliente.get(f"{A}/restaurantes/{restaurante.id}/mesas", headers=cabecera_operador)
    ).json()
    assert {m["codigo_publico"] for m in listadas} == {nuevo, de_la_otra}


@pytest.mark.ac("AC-21.3")
async def test_regenerar_dos_veces_deja_solo_el_ultimo(
    cliente: AsyncClient,
    mesa: Mesa,
    cabecera_operador: dict[str, str],
    sesion: AsyncSession,
) -> None:
    primero = mesa.codigo_publico
    a = await cliente.post(f"{A}/mesas/{mesa.id}/regenerar-codigo", headers=cabecera_operador)
    b = await cliente.post(f"{A}/mesas/{mesa.id}/regenerar-codigo", headers=cabecera_operador)
    codigos = [primero, a.json()["codigo_publico"], b.json()["codigo_publico"]]
    assert len(set(codigos)) == 3
    assert [await mesas.mesa_por_codigo(sesion, c) is not None for c in codigos] == [
        False,
        False,
        True,
    ]


@pytest.mark.ac("AC-21.3")
async def test_una_mesa_ajena_es_404_igual_que_una_inexistente(
    cliente: AsyncClient,
    ajeno: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_mesa: Fabrica,
    sesion: AsyncSession,
) -> None:
    de_otro = await fabrica_mesa(ajeno)
    codigo = de_otro.codigo_publico
    ajena = await cliente.post(
        f"{A}/mesas/{de_otro.id}/regenerar-codigo", headers=cabecera_operador
    )
    nada = await cliente.post(f"{A}/mesas/{UUID_X}/regenerar-codigo", headers=cabecera_operador)
    assert ajena.status_code == nada.status_code == 404
    assert _sin_id(ajena) == _sin_id(nada)
    assert (await mesas.mesa_por_codigo(sesion, codigo)) is not None  # no se tocó
    malo = await cliente.post(f"{A}/mesas/no-es-uuid/regenerar-codigo", headers=cabecera_operador)
    assert malo.status_code == 422


@pytest.mark.ac("AC-21.3")
async def test_mesa_por_codigo_solo_resuelve_mesas_activas_de_restaurantes_activos(
    sesion: AsyncSession,
    restaurante: Restaurante,
    fabrica_mesa: Fabrica,
    fabrica_restaurante: Fabrica,
) -> None:
    viva = await fabrica_mesa(restaurante)
    baja = await fabrica_mesa(restaurante, activa=False)
    cerrado = await fabrica_restaurante(activo=False)
    de_cerrado = await fabrica_mesa(cerrado)

    assert (await mesas.mesa_por_codigo(sesion, viva.codigo_publico)) is not None
    assert await mesas.mesa_por_codigo(sesion, baja.codigo_publico) is None
    assert await mesas.mesa_por_codigo(sesion, de_cerrado.codigo_publico) is None
    assert await mesas.mesa_por_codigo(sesion, "no-existe-0123456789abcdef") is None
    assert await mesas.mesa_por_codigo(sesion, "") is None
    assert await mesas.mesa_por_codigo(sesion, "x" * 5000) is None
    assert await mesas.mesa_por_codigo(sesion, viva.codigo_publico.upper()) is None


# ===========================================================================
# Revisión de maestra · A3 (atomicidad, lote) y B1 (mesa inactiva)
# ===========================================================================


@pytest.mark.ac("AC-21.1")
async def test_si_falla_la_insercion_no_queda_ninguna_mesa(
    sesion: AsyncSession, restaurante: Restaurante, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def repetidos(sesion: AsyncSession, cuantos: int) -> list[str]:
        return ["repetido-repetido-repetido-0"] * cuantos  # viola el UNIQUE a la tercera

    monkeypatch.setattr(mesas, "_codigos_libres", repetidos)
    rid = restaurante.id  # `rollback()` expira los objetos
    with pytest.raises(IntegrityError):
        await mesas.crear_mesas(sesion, rid, 3, 4)
    await sesion.rollback()
    total = await sesion.scalar(
        select(func.count()).select_from(Mesa).where(Mesa.restaurante_id == rid)
    )
    assert total == 0


@pytest.mark.ac("AC-21.1")
async def test_codigos_repetidos_dentro_del_lote_se_regeneran(
    sesion: AsyncSession, restaurante: Restaurante, monkeypatch: pytest.MonkeyPatch
) -> None:
    secuencia = iter(["a" * 22, "a" * 22, "b" * 22, "c" * 22])  # 1.er intento repite, 2.º no
    monkeypatch.setattr(mesas, "nuevo_codigo", lambda: next(secuencia))
    creadas = await mesas.crear_mesas(sesion, restaurante.id, 2, 4)
    assert sorted(m.codigo_publico for m in creadas) == ["b" * 22, "c" * 22]


@pytest.mark.ac("AC-21.3")
async def test_regenerar_una_mesa_inactiva_es_409_y_no_cambia_el_codigo(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_mesa: Fabrica,
    sesion: AsyncSession,
) -> None:
    baja = await fabrica_mesa(restaurante, activa=False)
    codigo = baja.codigo_publico
    respuesta = await cliente.post(
        f"{A}/mesas/{baja.id}/regenerar-codigo", headers=cabecera_operador
    )
    assert respuesta.status_code == 409, respuesta.text
    assert _codigo(respuesta) == "MESA_INACTIVA"
    await sesion.refresh(baja)
    assert baja.codigo_publico == codigo and baja.codigo_revocado_en is None
