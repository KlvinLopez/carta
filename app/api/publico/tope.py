"""Tope del cuerpo y límite de tasa de las rutas del comensal (revisión de T-2.1, A3; T-2.3).

FastAPI lee y valida el JSON **antes** de las dependencias: sin esto un anónimo hacía leer
30 MB a `PATCH /p/miembro` antes del 401 (y `entrar` leía 5 MB para dar 422). La clase de ruta
de T-1.9 (`app.api.admin.subidas.ruta_con_tope`) corta antes de leer: `Content-Length` mayor
→ 413 sin leer nada; *chunked* que pasa del tope → 413; más de 10 s → 408. 16 KiB sobran para
estas rutas y para un lote de 50 eventos (T-2.3).

Antes que nada, la petición cuenta en su cubo de `app.api.publico.limites` (T-2.3): una
limitada recibe 429 sin que se lea ni se valide su cuerpo, y un JSON roto, un cuerpo de más o
un 401 también cuentan. `RutaEntrar` cuenta siempre en el cubo de la IP (acuña identidades).
"""

from collections.abc import Callable, Coroutine
from typing import Any

from fastapi import Request, Response
from fastapi.routing import APIRoute

from app.api.admin.subidas import ruta_con_tope
from app.api.publico import limites

MAX_CUERPO_COMENSAL = 16 * 1024
PLAZO_CUERPO_COMENSAL_SEGUNDOS = 10.0


def _plazo() -> float:
    return PLAZO_CUERPO_COMENSAL_SEGUNDOS  # se lee en cada petición: las pruebas lo acortan


_RutaConTope: type[APIRoute] = ruta_con_tope(MAX_CUERPO_COMENSAL, _plazo)


class RutaComensal(_RutaConTope):  # type: ignore[misc,valid-type]
    solo_ip = False

    def get_route_handler(self) -> Callable[[Request], Coroutine[Any, Any, Response]]:
        con_tope = super().get_route_handler()
        solo_ip = self.solo_ip

        async def manejador(request: Request) -> Response:
            limites.contar(request, solo_ip=solo_ip)
            return await con_tope(request)

        return manejador


class RutaEntrar(RutaComensal):
    """`POST /p/sesion/entrar`: siempre en el cubo de la IP."""

    solo_ip = True
