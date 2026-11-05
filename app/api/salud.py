"""Rutas de infraestructura, fuera de `/api/v1` y sin autenticación (04_API_Spec §1.1).

- `GET /health`: el proceso vive. Lo usan el `HEALTHCHECK` de la imagen y UptimeRobot.
- `GET /ready`: la base responde a `SELECT 1`. Lo usa el despliegue antes de enviar tráfico.

Ambas aceptan `HEAD` (muchas sondas lo usan). `/ready` cuesta cuatro viajes a la base
(pre-ping del pool, `BEGIN`, `SELECT 1`, `ROLLBACK`): se acepta, es una sonda cada pocos
segundos, no una ruta de tráfico.
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errores import ErrorCarta
from app.db import get_db_session

log = logging.getLogger("carta.salud")

router = APIRouter(tags=["infraestructura"])

# Una base que acepta la conexión TCP y no contesta no debe colgar la sonda 60 s
# (timeout por defecto de asyncpg): el despliegue necesita el 503 pronto.
READY_TIMEOUT_SEGUNDOS = 3.0


@router.api_route("/health", methods=["GET", "HEAD"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.api_route("/ready", methods=["GET", "HEAD"])
async def ready(sesion: AsyncSession = Depends(get_db_session)) -> dict[str, str]:
    try:
        await asyncio.wait_for(sesion.execute(text("SELECT 1")), timeout=READY_TIMEOUT_SEGUNDOS)
    except Exception as error:
        # El motivo real (host, credenciales, pool) va al log, nunca al cuerpo; y sólo el tipo:
        # el mensaje de asyncpg puede traer host, puerto y usuario.
        log.error("la base de datos no responde: %s", type(error).__name__)
        raise ErrorCarta("BASE_NO_DISPONIBLE", "La base de datos no responde.", 503) from error
    return {"db": "ok"}
