"""Operador: `/api/v1/admin/*`, `Authorization: Bearer <Firebase ID token>` (T-1.2).

Todo el router depende de `operador_actual` (AC-15.1): sin token válido, 401 con la
envoltura única antes de validar nada más. `restaurantes.py` y `menu.py` (T-1.3) tienen las
rutas de restaurantes, categorías y platillos, `fotos.py` (T-1.4) la foto del platillo,
`mesas.py` (T-1.5) las mesas y su PDF de QR, `importaciones.py` (T-1.9) la importación de la
carta y `personal.py` (T-1.6) el personal y su PIN, todas aisladas por restaurante
(`app.api.admin.dependencias`). Ya no quedan rutas de ejemplo (`ejemplos.py` y
`solo_desarrollo` se quitaron con T-1.6).
"""

from fastapi import APIRouter, Depends

from app.api.admin import fotos, importaciones, menu, mesas, personal, restaurantes
from app.api.admin.dependencias import operador_actual
from app.schemas.comun import errores

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
router.include_router(importaciones.router)
router.include_router(personal.router)

__all__ = ["router"]
