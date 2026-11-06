"""T-1.3: `IntegrityError` → envoltura única (`app/core/errores.py`, `manejar_integridad`).

Los errores son reales (PostgreSQL vía asyncpg), no simulados: así la prueba falla si
SQLAlchemy o asyncpg cambian dónde dejan el SQLSTATE o el nombre de la restricción.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Awaitable, Callable
from decimal import Decimal
from typing import Any

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request

from app.core.errores import manejar_integridad, restriccion_de, sqlstate_de
from app.db.models import CategoriaMenu, Platillo, Restaurante
from app.schemas.comun import ErrorRespuesta
from tests.conftest import Fabrica

SECRETO = "Valor-Que-No-Debe-Salir"


def _peticion() -> Request:
    return Request({"type": "http", "method": "POST", "path": "/x", "headers": [], "state": {}})


async def _capturar(sesion: AsyncSession, accion: Callable[[], Awaitable[Any]]) -> IntegrityError:
    try:
        async with sesion.begin_nested():
            await accion()
    except IntegrityError as error:
        return error
    raise AssertionError("la base no rechazó la sentencia")


async def _violar_unique(sesion: AsyncSession, restaurante: Restaurante) -> IntegrityError:
    sesion.add(CategoriaMenu(restaurante_id=restaurante.id, nombre=SECRETO))
    await sesion.commit()

    async def accion() -> None:
        sesion.add(CategoriaMenu(restaurante_id=restaurante.id, nombre=SECRETO.lower()))
        await sesion.flush()

    return await _capturar(sesion, accion)


async def _violar_check(sesion: AsyncSession, restaurante: Restaurante) -> IntegrityError:
    async def accion() -> None:
        sesion.add(Platillo(restaurante_id=restaurante.id, nombre=SECRETO, precio=Decimal(-1)))
        await sesion.flush()

    return await _capturar(sesion, accion)


async def _violar_not_null(sesion: AsyncSession, restaurante: Restaurante) -> IntegrityError:
    async def accion() -> None:
        await sesion.execute(
            text("INSERT INTO platillo (restaurante_id, nombre, precio) VALUES (:r, :n, NULL)"),
            {"r": restaurante.id, "n": SECRETO},
        )

    return await _capturar(sesion, accion)


async def _violar_fk(sesion: AsyncSession, restaurante: Restaurante, ajena: Any) -> IntegrityError:
    async def accion() -> None:
        sesion.add(
            Platillo(
                restaurante_id=restaurante.id,
                categoria_id=ajena.id,  # INV-10: categoría de otro restaurante
                nombre=SECRETO,
                precio=Decimal(1),
            )
        )
        await sesion.flush()

    return await _capturar(sesion, accion)


@pytest.mark.ac("AC-16.2")
@pytest.mark.parametrize(
    ("caso", "http", "codigo", "sqlstate"),
    [
        ("unique", 409, "CONFLICTO", "23505"),
        ("check", 422, "PAYLOAD_INVALIDO", "23514"),
        ("not_null", 422, "PAYLOAD_INVALIDO", "23502"),
        ("fk", 404, "RECURSO_NO_ENCONTRADO", "23503"),
    ],
)
async def test_cada_restriccion_tiene_su_respuesta(
    sesion: AsyncSession,
    restaurante: Restaurante,
    fabrica_restaurante: Fabrica,
    fabrica_categoria: Fabrica,
    caplog: pytest.LogCaptureFixture,
    caso: str,
    http: int,
    codigo: str,
    sqlstate: str,
) -> None:
    if caso == "unique":
        error = await _violar_unique(sesion, restaurante)
    elif caso == "check":
        error = await _violar_check(sesion, restaurante)
    elif caso == "not_null":
        error = await _violar_not_null(sesion, restaurante)
    else:
        ajena = await fabrica_categoria(await fabrica_restaurante())
        error = await _violar_fk(sesion, restaurante, ajena)
    assert sqlstate_de(error) == sqlstate
    assert SECRETO.lower() in str(error).lower()  # el texto de la excepción trae los parámetros…

    with caplog.at_level(logging.INFO, logger="carta.errores"):
        respuesta = await manejar_integridad(_peticion(), error)
    assert respuesta.status_code == http
    cuerpo = json.loads(bytes(respuesta.body))
    assert ErrorRespuesta.model_validate(cuerpo).error.codigo == codigo
    assert respuesta.headers["cache-control"] == "no-store"
    registros = " ".join(r.getMessage() for r in caplog.records)
    assert SECRETO not in registros and SECRETO not in json.dumps(cuerpo)  # …y no sale
    assert SECRETO.lower() not in registros
    if caso != "not_null":  # NOT NULL no tiene nombre de restricción
        assert restriccion_de(error) is not None
        assert restriccion_de(error) in registros


async def test_un_sqlstate_desconocido_es_500_sin_detalles(
    sesion: AsyncSession, restaurante: Restaurante, caplog: pytest.LogCaptureFixture
) -> None:
    error = await _violar_check(sesion, restaurante)
    error.orig.sqlstate = "23P01"  # type: ignore[union-attr]  # exclusion_violation
    with caplog.at_level(logging.ERROR, logger="carta.errores"):
        respuesta = await manejar_integridad(_peticion(), error)
    assert respuesta.status_code == 500
    cuerpo = json.loads(bytes(respuesta.body))
    assert cuerpo["error"]["codigo"] == "ERROR_INTERNO"
    assert SECRETO not in " ".join(r.getMessage() for r in caplog.records)
