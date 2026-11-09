"""Operador: `/api/v1/admin/*`, `Authorization: Bearer <Firebase ID token>` (T-1.2).

Todo el router depende de `operador_actual` (AC-15.1): sin token válido, 401 con la
envoltura única antes de validar nada más. `restaurantes.py` y `menu.py` (T-1.3) tienen las
rutas reales de restaurantes, categorías y platillos, y `fotos.py` (T-1.4) la foto del platillo, `mesas.py` (T-1.5) las mesas y su PDF de QR, aisladas por restaurante
(`app.api.admin.dependencias`); `ejemplos.py` publica el resto del contrato de la Fase 1 con
datos de ejemplo (T-1.1) hasta que cada tarea ponga sus rutas reales: exigen el token y,
además, `solo_desarrollo` las esconde (404) fuera de desarrollo y pruebas: con un token
válido cualquiera recibiría datos inventados para un `{rid}` ajeno y podría subir archivos
sin validar (revisión de T-1.2, A1). Siguen en `/openapi.json`.
"""

from fastapi import APIRouter, Depends

from app.api.admin import ejemplos, fotos, menu, mesas, restaurantes
from app.api.admin.dependencias import no_encontrado, operador_actual
from app.core.config import settings
from app.schemas.comun import errores


async def solo_desarrollo() -> None:
    """404 fuera de desarrollo/pruebas para las rutas que todavía devuelven ejemplos."""
    if not settings.es_desarrollo:
        raise no_encontrado()


# Toda ruta del operador puede responder 401 (sin token), 404 (no existe o es de otro
# restaurante) y 422 con la envoltura de 04_API_Spec §1.2; declararlo aquí sustituye el
# `HTTPValidationError` que FastAPI publicaría por defecto y que la API nunca responde.
router = APIRouter(
    tags=["operador"], responses=errores(401, 404, 422), dependencies=[Depends(operador_actual)]
)
router.include_router(restaurantes.router)
router.include_router(menu.router)
router.include_router(fotos.router)
router.include_router(mesas.router)
router.include_router(ejemplos.router, dependencies=[Depends(solo_desarrollo)])

__all__ = ["router", "solo_desarrollo"]
