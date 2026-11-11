"""Menú público del comensal (T-2.2, US-04): `GET /p/menu/{slug}` y `GET /p/platillos/{id}`.

Sin cookie: el menú es público por `slug` y lo cachea el borde (02 §4; Cloudflare tiene la
regla de caché para `/api/v1/p/menu/*`). La lógica vive en `app.services.menu_publico`.

- **Menú:** `ETag` (hash del contenido) y `Cache-Control: public, max-age=30, s-maxage=60`
  (menos, mientras envejece la copia de este worker: ver el servicio). Con `If-None-Match`
  vigente responde `304` sin cuerpo y, si la copia es de este worker, sin tocar la base.
- **Detalle:** `ETag` y `Cache-Control: private, no-cache`: el borde no lo guarda (la purga
  del operador sólo borra la URL del menú) y el navegador lo revalida con un `304` barato.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.publico.tope import RutaComensal
from app.db import get_db_session
from app.schemas.comun import errores
from app.schemas.menu_publico import MenuPublico, PlatilloDetalle
from app.services import menu_publico as servicio
from app.services.sesion import coincide_etag

router = APIRouter(route_class=RutaComensal)

SIN_CAMBIOS: dict[int | str, dict[str, Any]] = {
    304: {"description": "Sin cambios desde el `ETag` de `If-None-Match`."}
}
CACHE_DETALLE = "private, no-cache"


@router.get(
    "/menu/{slug}",
    response_model=MenuPublico,
    responses={**SIN_CAMBIOS, **errores(404)},
)
async def menu(
    slug: str, request: Request, sesion: AsyncSession = Depends(get_db_session)
) -> Response:
    """Menú activo por categorías de un restaurante. Público, sin cookie, cacheable en el
    borde. Restaurante inexistente o inactivo: el mismo 404 (`RECURSO_NO_ENCONTRADO`)."""
    foto = await servicio.menu(sesion, slug)
    cabeceras = {"ETag": foto.etag, "Cache-Control": foto.cabecera_cache()}
    if coincide_etag(request.headers.get("if-none-match"), foto.etag):
        return Response(status_code=304, headers=cabeceras)
    return Response(content=foto.cuerpo, media_type="application/json", headers=cabeceras)


@router.get(
    "/platillos/{platillo_id}",
    response_model=PlatilloDetalle,
    responses={**SIN_CAMBIOS, **errores(404)},
)
async def platillo(
    platillo_id: UUID, request: Request, sesion: AsyncSession = Depends(get_db_session)
) -> Response:
    """Detalle de un platillo activo (de una categoría y un restaurante activos)."""
    foto = await servicio.detalle(sesion, platillo_id)
    cabeceras = {"ETag": foto.etag, "Cache-Control": CACHE_DETALLE}
    if coincide_etag(request.headers.get("if-none-match"), foto.etag):
        return Response(status_code=304, headers=cabeceras)
    return Response(content=foto.cuerpo, media_type="application/json", headers=cabeceras)
