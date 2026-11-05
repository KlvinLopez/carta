"""Operador: `/api/v1/admin/*`, `Authorization: Bearer <Firebase ID token>` desde T-1.2.

Hoy `restaurantes.py` es el CRUD heredado, sin autenticación ni aislamiento por restaurante;
T-1.2 lo pone detrás del token y T-1.3 lo reescribe contra 02 §5.3. Mientras tanto la
dependencia `solo_desarrollo` lo esconde (404, regla dura 6) fuera de desarrollo y pruebas:
staging se publica en T-0.7, antes de la autenticación. **T-1.2 quita `solo_desarrollo`.**
"""

from fastapi import APIRouter, Depends

from app.api.admin import restaurantes
from app.core.config import settings
from app.core.errores import ErrorCarta, mensaje_por_http


async def solo_desarrollo() -> None:
    """404 fuera de desarrollo/pruebas: el CRUD heredado no tiene credencial todavía."""
    if not settings.es_desarrollo:
        raise ErrorCarta("RECURSO_NO_ENCONTRADO", mensaje_por_http(404), 404)


router = APIRouter(tags=["operador"])
router.include_router(restaurantes.router, dependencies=[Depends(solo_desarrollo)])

__all__ = ["router", "solo_desarrollo"]
