"""Operador: `/api/v1/admin/*`, `Authorization: Bearer <Firebase ID token>` (T-1.2).

Todo el router depende de `operador_actual` (AC-15.1): sin token válido, 401 con la
envoltura única antes de validar nada más. `restaurantes.py` tiene las rutas reales de
restaurantes y el CRUD heredado de platillos, aislados por restaurante
(`app.api.admin.dependencias`); `ejemplos.py` publica el resto del contrato de la Fase 1 con
datos de ejemplo (T-1.1) hasta que cada tarea ponga sus rutas reales: no leen la base, pero
también exigen el token.
"""

from fastapi import APIRouter, Depends

from app.api.admin import ejemplos, restaurantes
from app.api.admin.dependencias import operador_actual
from app.schemas.comun import errores

# Toda ruta del operador puede responder 401 (sin token), 404 (no existe o es de otro
# restaurante) y 422 con la envoltura de 04_API_Spec §1.2; declararlo aquí sustituye el
# `HTTPValidationError` que FastAPI publicaría por defecto y que la API nunca responde.
router = APIRouter(
    tags=["operador"], responses=errores(401, 404, 422), dependencies=[Depends(operador_actual)]
)
router.include_router(restaurantes.router)
router.include_router(ejemplos.router)

__all__ = ["router"]
