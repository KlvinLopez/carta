"""Rutas de infraestructura, fuera de `/api/v1` y sin autenticación (04_API_Spec §1.1).

- `GET /health`: el proceso vive. Lo usan el `HEALTHCHECK` de la imagen y UptimeRobot.
- `GET /ready`: la base responde a `SELECT 1`. Lo usa el despliegue antes de enviar tráfico.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errores import ErrorCarta
from app.db import get_db_session

log = logging.getLogger("carta.salud")

router = APIRouter(tags=["infraestructura"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready")
async def ready(sesion: AsyncSession = Depends(get_db_session)) -> dict[str, str]:
    try:
        await sesion.execute(text("SELECT 1"))
    except Exception as error:
        # El motivo real (host, credenciales, pool) va al log, nunca al cuerpo.
        log.error("la base de datos no responde: %s", type(error).__name__)
        raise ErrorCarta("BASE_NO_DISPONIBLE", "La base de datos no responde.", 503) from error
    return {"db": "ok"}
