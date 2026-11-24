"""Comensal: `/api/v1/p/*`, cookie `carta_invitado` (ADR-003, 02 §5.1).

`sesion.py` tiene las rutas de la sesión de mesa (T-2.1), `menu.py` las del menú público
(T-2.2), `eventos.py` la analítica del teléfono (T-2.3) y `contrato.py` las rutas de la
Fase 3 declaradas por T-3.0 (responden 404 hasta que su tarea las implementa). Ya no quedan rutas de ejemplo: T-2.3
borró `ejemplos.py` y `solo_desarrollo`.

Toda ruta usa `tope.RutaComensal`, que cuenta la petición en `limites` antes de leer el cuerpo
(T-2.3, 04_API_Spec §1.5): 120 por minuto por miembro con cookie válida, 600 por IP sin ella
(y `entrar` siempre en la IP), en la memoria de cada worker.
"""

from fastapi import APIRouter

from app.api.publico import contrato, eventos, menu, sesion
from app.schemas.comun import errores

# Toda ruta del comensal puede responder 422 (cuerpo o ruta inválidos) y 429 (límite de tasa,
# T-2.3) con la envoltura de 04_API_Spec §1.2, y 400/408/413 por el tope del cuerpo;
# declararlo aquí sustituye el `HTTPValidationError` que FastAPI publicaría por defecto y que
# la API nunca responde. El tope del cuerpo está en `tope.py`.
router = APIRouter(
    tags=["comensal"],
    responses=errores(400, 408, 413, 422, 429),
)
router.include_router(sesion.router)
router.include_router(menu.router)
router.include_router(eventos.router)
# Rutas de la Fase 3 sólo declaradas (T-3.0): cada tarea borra las suyas al implementarlas.
router.include_router(contrato.router)

__all__ = ["router"]
