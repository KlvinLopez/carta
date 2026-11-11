"""Tope del cuerpo de las rutas del comensal (revisión de T-2.1, A3).

FastAPI lee y valida el JSON **antes** de las dependencias: sin esto un anónimo hacía leer
30 MB a `PATCH /p/miembro` antes del 401 (y `entrar` leía 5 MB para dar 422). La clase de ruta
de T-1.9 (`app.api.admin.subidas.ruta_con_tope`) corta antes de leer: `Content-Length` mayor
→ 413 sin leer nada; *chunked* que pasa del tope → 413; más de 10 s → 408. 16 KiB sobran para
estas rutas y para un lote de 50 eventos (T-2.3).
"""

from fastapi.routing import APIRoute

from app.api.admin.subidas import ruta_con_tope

MAX_CUERPO_COMENSAL = 16 * 1024
PLAZO_CUERPO_COMENSAL_SEGUNDOS = 10.0


def _plazo() -> float:
    return PLAZO_CUERPO_COMENSAL_SEGUNDOS  # se lee en cada petición: las pruebas lo acortan


RutaComensal: type[APIRoute] = ruta_con_tope(MAX_CUERPO_COMENSAL, _plazo)
