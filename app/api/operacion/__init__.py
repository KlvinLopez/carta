"""Personal (mesero y capitán): `/api/v1/op/*`, cookie `carta_personal` (ADR-013). Fase 3.

`contrato.py` declara las rutas de la fase (T-3.0); responden 404 hasta que T-3.4 y T-3.11
las implementan (y la cookie del personal).
"""

from fastapi import APIRouter

from app.api.operacion import contrato
from app.schemas.comun import errores

# Como en las demás audiencias: el 422 sale con la envoltura, nunca el `HTTPValidationError`.
router = APIRouter(tags=["personal"], responses=errores(422))
router.include_router(contrato.router)

__all__ = ["router"]
