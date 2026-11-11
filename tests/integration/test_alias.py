"""T-2.1: `PATCH /p/miembro` — alias editable de hasta 24 caracteres (AC-03.2) con lista de
bloqueo básica que conserva el anterior (AC-03.3)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import pytest
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Mesa, MiembroSesion, SesionGrupal
from app.services import sesion as servicio
from tests.invitado_pruebas import cambiar_alias, entrar, estado


@pytest.fixture(autouse=True)
def _cache_limpia() -> None:
    servicio.cache_estados.vaciar()


@pytest.fixture
async def comensal(cliente: AsyncClient, mesa: Mesa) -> dict[str, Any]:
    respuesta, token = await entrar(cliente, mesa.codigo_publico)
    return {"token": token, **respuesta.json()}


async def _alias_en_base(sesion: AsyncSession, miembro_id: str) -> str | None:
    return await sesion.scalar(
        select(MiembroSesion.alias)
        .where(MiembroSesion.id == UUID(miembro_id))
        .execution_options(populate_existing=True)
    )


@pytest.mark.parametrize(
    "alias",
    ["Sofía", "x" * 24, "Tía Lupe 🌮", "  Beto  ", "Mesa del fondo", "👨‍👩‍👧‍👦 familia"],
)
@pytest.mark.ac("AC-03.2")
async def test_el_alias_se_cambia_sin_datos_reales(
    cliente: AsyncClient, sesion: AsyncSession, comensal: dict[str, Any], alias: str
) -> None:
    respuesta = await cambiar_alias(cliente, comensal["token"], {"alias": alias})
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json() == {**comensal["miembro"], "alias": alias.strip()}
    assert respuesta.headers["cache-control"] == "private, no-store"
    assert await _alias_en_base(sesion, comensal["miembro"]["id"]) == alias.strip()


@pytest.mark.parametrize(
    "cuerpo",
    [
        {"alias": "x" * 25},
        {"alias": ""},
        {"alias": "   "},
        {"alias": "​​"},
        {"alias": "Ana\x00"},
        {"alias": "Ana\nBeto"},
        {"alias": None},
        {},
        {"alias": "Ana", "color_avatar": "#000000"},
        {"alias": "Ana", "rol": "host"},
    ],
)
@pytest.mark.ac("AC-03.2")
async def test_un_alias_invalido_es_422_y_conserva_el_anterior(
    cliente: AsyncClient, sesion: AsyncSession, comensal: dict[str, Any], cuerpo: dict[str, Any]
) -> None:
    respuesta = await cambiar_alias(cliente, comensal["token"], cuerpo)
    assert respuesta.status_code == 422
    assert respuesta.json()["error"]["codigo"] == "PAYLOAD_INVALIDO"
    assert await _alias_en_base(sesion, comensal["miembro"]["id"]) == "Comensal 1"


@pytest.mark.parametrize(
    "alias",
    ["Puto", "PENDEJO", "p u t o", "P.U.T.O", "P3nd3j0", "pendejos", "El Pendejote",
     "chíngada", "cabrón", "Hijueputa", "fuck", "Sh1t", "putas", "nazi"],
)  # fmt: skip
@pytest.mark.ac("AC-03.3")
async def test_un_alias_de_la_lista_de_bloqueo_es_422_y_conserva_el_anterior(
    cliente: AsyncClient, sesion: AsyncSession, comensal: dict[str, Any], alias: str
) -> None:
    respuesta = await cambiar_alias(cliente, comensal["token"], {"alias": alias})
    assert respuesta.status_code == 422
    assert respuesta.json()["error"]["codigo"] == "ALIAS_NO_PERMITIDO"
    assert await _alias_en_base(sesion, comensal["miembro"]["id"]) == "Comensal 1"
    visto = (await estado(cliente, comensal["token"])).json()["miembros"][0]["alias"]
    assert visto == "Comensal 1"


@pytest.mark.parametrize(
    "alias",
    ["Computadora", "Ridículo", "Cabra", "Pitonisa", "Disputa", "Culinaria", "Naomi", "Shiitake",
     "Pinchos", "Mamá", "Perrito", "Ana Puentes"],
)  # fmt: skip
@pytest.mark.ac("AC-03.3")
def test_la_lista_no_bloquea_palabras_comunes(alias: str) -> None:
    """Contraprueba: la lista compara palabras, no subcadenas cortas («computadora»)."""
    assert servicio.alias_permitido(alias), alias


@pytest.mark.ac("AC-02.4")
async def test_cambiar_el_alias_cuenta_como_actividad(
    cliente: AsyncClient, sesion: AsyncSession, comensal: dict[str, Any]
) -> None:
    sesion_id = UUID(comensal["sesion"]["id"])
    hace_dos_horas = datetime.now(UTC) - timedelta(hours=2)
    await sesion.execute(
        update(SesionGrupal)
        .where(SesionGrupal.id == sesion_id)
        .values(ultima_actividad_en=hace_dos_horas)
    )
    await sesion.commit()
    await cambiar_alias(cliente, comensal["token"], {"alias": "Sofía"})
    actividad = await sesion.scalar(
        select(SesionGrupal.ultima_actividad_en)
        .where(SesionGrupal.id == sesion_id)
        .execution_options(populate_existing=True)
    )
    assert actividad is not None and actividad > hace_dos_horas + timedelta(hours=1)


async def test_sin_cookie_es_401(cliente: AsyncClient) -> None:
    respuesta = await cliente.patch("/api/v1/p/miembro", json={"alias": "Ana"})
    assert respuesta.status_code == 401
    assert respuesta.json()["error"]["codigo"] == "SIN_CREDENCIAL"


async def test_con_la_sesion_cerrada_es_410_y_no_cambia(
    cliente: AsyncClient, sesion: AsyncSession, comensal: dict[str, Any]
) -> None:
    await sesion.execute(
        update(SesionGrupal)
        .where(SesionGrupal.id == UUID(comensal["sesion"]["id"]))
        .values(estado="cerrada")
    )
    await sesion.commit()
    respuesta = await cambiar_alias(cliente, comensal["token"], {"alias": "Sofía"})
    assert respuesta.status_code == 410
    assert respuesta.json()["error"]["codigo"] == "SESION_CERRADA"
    assert await _alias_en_base(sesion, comensal["miembro"]["id"]) == "Comensal 1"


async def test_cada_quien_cambia_solo_su_alias(
    cliente: AsyncClient, sesion: AsyncSession, mesa: Mesa, comensal: dict[str, Any]
) -> None:
    otro, token_otro = await entrar(cliente, mesa.codigo_publico)
    assert token_otro is not None
    await cambiar_alias(cliente, token_otro, {"alias": "Beto"})
    assert await _alias_en_base(sesion, comensal["miembro"]["id"]) == "Comensal 1"
    assert await _alias_en_base(sesion, otro.json()["miembro"]["id"]) == "Beto"
