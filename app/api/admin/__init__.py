"""Operador: `/api/v1/admin/*`, `Authorization: Bearer <Firebase ID token>` desde T-1.2.

Hoy `restaurantes.py` es el CRUD heredado, sin autenticación ni aislamiento por restaurante;
T-1.2 lo pone detrás del token y T-1.3 lo reescribe contra 02 §5.3. `ejemplos.py` publica el
resto del contrato de la Fase 1 con datos de ejemplo (T-1.1) hasta que cada tarea ponga sus
rutas reales. Mientras tanto la dependencia `solo_desarrollo` esconde ambos (404, regla
dura 6) fuera de desarrollo y pruebas: staging se publica en T-0.7, antes de la
autenticación; `/openapi.json` sí los describe. **T-1.2 quita `solo_desarrollo`.**
"""

from fastapi import APIRouter, Depends

from app.api.admin import ejemplos, restaurantes
from app.core.config import settings
from app.core.errores import ErrorCarta, mensaje_por_http
from app.schemas.comun import errores


async def solo_desarrollo() -> None:
    """404 fuera de desarrollo/pruebas: el CRUD heredado no tiene credencial todavía."""
    if not settings.es_desarrollo:
        raise ErrorCarta("RECURSO_NO_ENCONTRADO", mensaje_por_http(404), 404)


# Toda ruta del operador puede responder 401 (sin token, desde T-1.2), 404 (no existe o es de
# otro restaurante) y 422 con la envoltura de 04_API_Spec §1.2; declararlo aquí sustituye el
# `HTTPValidationError` que FastAPI publicaría por defecto y que la API nunca responde.
router = APIRouter(tags=["operador"], responses=errores(401, 404, 422))
router.include_router(restaurantes.router, dependencies=[Depends(solo_desarrollo)])
router.include_router(ejemplos.router, dependencies=[Depends(solo_desarrollo)])

__all__ = ["router", "solo_desarrollo"]
