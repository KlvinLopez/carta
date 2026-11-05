"""API v1: tres audiencias, tres prefijos (02_Arquitectura_v1 §5, 04_API_Spec §1.1).

`router` se monta en `/api/v1` desde `app.main`; las rutas de infraestructura (`/health`,
`/ready`) viven en `app.api.salud` y se montan aparte, sin prefijo.
"""

from fastapi import APIRouter

from app.api.admin import router as router_admin
from app.api.operacion import router as router_operacion
from app.api.publico import router as router_publico

router = APIRouter()
router.include_router(router_publico, prefix="/p")
router.include_router(router_operacion, prefix="/op")
router.include_router(router_admin, prefix="/admin")

__all__ = ["router"]
