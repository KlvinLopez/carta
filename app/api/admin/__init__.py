"""Operador: `/api/v1/admin/*`, `Authorization: Bearer <Firebase ID token>` desde T-1.2.

Hoy `restaurantes.py` es el CRUD heredado, sin autenticación ni aislamiento por restaurante;
T-1.2 lo pone detrás del token y T-1.3 lo reescribe contra 02 §5.3.
"""

from fastapi import APIRouter

from app.api.admin import restaurantes

router = APIRouter(tags=["operador"])
router.include_router(restaurantes.router)

__all__ = ["router"]
