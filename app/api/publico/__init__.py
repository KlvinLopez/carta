"""Comensal: `/api/v1/p/*`, cookie `carta_invitado` (ADR-003, 02 §5.1).

`sesion.py` tiene las rutas reales de la sesión de mesa (T-2.1). `ejemplos.py` publica el
resto del contrato de la Fase 2 con datos de ejemplo (T-2.1, contrato primero)
hasta que cada tarea ponga sus rutas reales; `solo_desarrollo` las esconde (404) fuera de
desarrollo y pruebas. Siguen en `/openapi.json`.
"""

from fastapi import APIRouter, Depends

from app.api.publico import ejemplos, sesion
from app.core.config import settings
from app.core.errores import ErrorCarta, mensaje_por_http
from app.schemas.comun import errores


async def solo_desarrollo() -> None:
    """404 fuera de desarrollo/pruebas para las rutas que todavía devuelven ejemplos."""
    if not settings.es_desarrollo:
        raise ErrorCarta("RECURSO_NO_ENCONTRADO", mensaje_por_http(404), 404)


# Toda ruta del comensal puede responder 422 (cuerpo o ruta inválidos) y 429 (límite de tasa,
# T-2.3) con la envoltura de 04_API_Spec §1.2; declararlo aquí sustituye el
# `HTTPValidationError` que FastAPI publicaría por defecto y que la API nunca responde.
router = APIRouter(tags=["comensal"], responses=errores(422, 429))
router.include_router(sesion.router)
router.include_router(ejemplos.router, dependencies=[Depends(solo_desarrollo)])

__all__ = ["router", "solo_desarrollo"]
