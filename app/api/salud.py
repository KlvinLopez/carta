"""Rutas de infraestructura, fuera de `/api/v1` y sin autenticación (04_API_Spec §1.1).

- `GET /health`: el proceso vive. Lo usan el `HEALTHCHECK` de la imagen y UptimeRobot.
- `GET /ready`: la base responde a `SELECT 1` y, cuando el almacén es R2 (T-1.4), los dos
  buckets responden a un `HEAD` en ≤ 3 s. Lo usa el despliegue antes de enviar tráfico.
  Responde `{"db":"ok"}` (y `"almacen":"ok"` con R2): la prueba de humo busca `"db":"ok"`.
  Si el procesador de importaciones corre en este worker (T-1.9), añade
  `"procesador": {"ultimo_ciclo_hace_s": n}` y responde 503 `PROCESADOR_DETENIDO` si el bucle
  no da señales (revisión de T-1.9, A4: el *healthcheck* reinicia el contenedor).

Ambas aceptan `HEAD` (muchas sondas lo usan). `/ready` cuesta cuatro viajes a la base
(pre-ping del pool, `BEGIN`, `SELECT 1`, `ROLLBACK`): se acepta, es una sonda cada pocos
segundos, no una ruta de tráfico.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errores import ErrorCarta
from app.db import get_db_session
from app.services import procesador
from app.services.assets import Almacen, ErrorAlmacen, obtener_almacen

log = logging.getLogger("carta.salud")

router = APIRouter(tags=["infraestructura"])

# Una base que acepta la conexión TCP y no contesta no debe colgar la sonda 60 s
# (timeout por defecto de asyncpg): el despliegue necesita el 503 pronto.
READY_TIMEOUT_SEGUNDOS = 3.0


async def health() -> dict[str, str]:
    return {"status": "ok"}


async def ready(
    sesion: AsyncSession = Depends(get_db_session),
    almacen: Almacen = Depends(obtener_almacen),
) -> dict[str, Any]:
    try:
        await asyncio.wait_for(sesion.execute(text("SELECT 1")), timeout=READY_TIMEOUT_SEGUNDOS)
    except Exception as error:
        # El motivo real (host, credenciales, pool) va al log, nunca al cuerpo; y sólo el tipo:
        # el mensaje de asyncpg puede traer host, puerto y usuario.
        log.error("la base de datos no responde: %s", type(error).__name__)
        raise ErrorCarta("BASE_NO_DISPONIBLE", "La base de datos no responde.", 503) from error
    estado: dict[str, Any] = {"db": "ok"}
    if almacen.en_nube:  # el almacén local no se sondea (sólo desarrollo y pruebas)
        try:
            await asyncio.wait_for(almacen.comprobar(), timeout=READY_TIMEOUT_SEGUNDOS)
        except (ErrorAlmacen, TimeoutError) as error:
            log.error("el almacén no responde: %s", error.args[0] if error.args else "plazo")
            raise ErrorCarta("ALMACEN_NO_DISPONIBLE", "El almacén no responde.", 503) from error
        estado["almacen"] = "ok"
    del_procesador = procesador.estado()
    if del_procesador is not None:
        if not del_procesador["vivo"]:
            log.error("el procesador de importaciones no da señales: %s", del_procesador)
            raise ErrorCarta(
                "PROCESADOR_DETENIDO", "El procesador de importaciones no responde.", 503
            )
        estado["procesador"] = {"ultimo_ciclo_hace_s": del_procesador["ultimo_ciclo_hace_s"]}
    return estado


def _publicar(ruta: str, endpoint: Any) -> None:
    """Una ruta GET+HEAD atiende las peticiones (y da `Allow: GET, HEAD` en el 405); va fuera
    del esquema porque con dos métodos FastAPI repite el `operation_id` y avisa en cada
    `pytest`. Una segunda ruta sólo GET, registrada después y nunca alcanzada, publica la
    operación en `/openapi.json` una sola vez."""
    router.add_api_route(ruta, endpoint, methods=["GET", "HEAD"], include_in_schema=False)
    router.add_api_route(ruta, endpoint, methods=["GET"])


_publicar("/health", health)
_publicar("/ready", ready)
