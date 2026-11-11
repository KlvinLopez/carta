"""Comensal: `/api/v1/p/*`, cookie `carta_invitado` (ADR-003, 02 §5.1).

`sesion.py` tiene las rutas de la sesión de mesa (T-2.1), `menu.py` las del menú público
(T-2.2) y `eventos.py` la analítica del teléfono (T-2.3). Ya no quedan rutas de ejemplo: T-2.3
borró `ejemplos.py` y `solo_desarrollo`.

Toda ruta pasa por `limites.limite_comensal` (T-2.3, 04_API_Spec §1.5): 120 peticiones por
minuto por miembro con cookie válida, 600 por IP sin ella, en la memoria de cada worker.
"""

from fastapi import APIRouter, Depends

from app.api.publico import eventos, menu, sesion
from app.api.publico.limites import limite_comensal
from app.schemas.comun import errores

# Toda ruta del comensal puede responder 422 (cuerpo o ruta inválidos) y 429 (límite de tasa,
# T-2.3) con la envoltura de 04_API_Spec §1.2, y 400/408/413 por el tope del cuerpo;
# declararlo aquí sustituye el `HTTPValidationError` que FastAPI publicaría por defecto y que
# la API nunca responde. El tope del cuerpo está en `tope.py`.
router = APIRouter(
    tags=["comensal"],
    responses=errores(400, 408, 413, 422, 429),
    dependencies=[Depends(limite_comensal)],
)
router.include_router(sesion.router)
router.include_router(menu.router)
router.include_router(eventos.router)

__all__ = ["router"]
