"""Rutas de la Fase 2 que todavía devuelven ejemplos (contrato primero, 04 §2).

Publican en `/openapi.json` la forma final de cada respuesta para que el frontend (carril E)
genere sus tipos (`npm --prefix frontend run tipos`) y trabaje con datos simulados mientras el
backend se construye. Las de T-2.1 (`sesion/entrar`, `sesion`, `miembro`) ya son reales
(`app.api.publico.sesion`). Cada tarea sustituye sus rutas por las reales y las borra de aquí:

| Rutas | Tarea |
|---|---|
| `menu/{slug}`, `platillos/{platillo_id}` | T-2.2 |
| `eventos` | T-2.3 |

No leen ni escriben la base. `solo_desarrollo` (en `app.api.publico`) las esconde (404) fuera
de desarrollo y pruebas: nadie en staging o producción debe recibir datos inventados.
"""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Response, status

from app.api.publico.tope import RutaComensal
from app.db.models import TipoImagen
from app.schemas.comun import errores
from app.schemas.eventos import EventosLote
from app.schemas.menu_publico import (
    CategoriaPublica,
    MenuPublico,
    PlatilloDetalle,
    PlatilloPublico,
    RestaurantePublico,
)

router = APIRouter(route_class=RutaComensal)

# ---------------------------------------------------------------------------
# Datos de ejemplo (fijos: el frontend puede compararlos en sus pruebas)
# ---------------------------------------------------------------------------

MOMENTO = datetime(2026, 11, 11, 20, 0, tzinfo=UTC)
ID_CATEGORIA = UUID("00000000-0000-4000-8000-000000000101")
ID_PLATILLO = UUID("00000000-0000-4000-8000-000000000201")
ETAG_EJEMPLO = '"ejemplo-0001"'

# El sondeo y el menú responden 304 sin cuerpo cuando `If-None-Match` coincide (02 §6).
SIN_CAMBIOS: dict[int | str, dict[str, Any]] = {
    304: {"description": "Sin cambios desde el `ETag` de `If-None-Match`."}
}


def _platillo() -> PlatilloPublico:
    return PlatilloPublico(
        id=ID_PLATILLO,
        categoria_id=ID_CATEGORIA,
        nombre="Guacamole de la casa",
        descripcion="Con totopos y queso fresco",
        precio=Decimal("145.00"),
        disponible=True,
        imagen_tipo=TipoImagen.ilustracion_categoria,
        ilustracion_clave="entradas",
        alergenos=["lacteos"],
        etiquetas=["vegetariano"],
        nivel_picante=1,
        destacado=True,
        orden=1,
    )


# ---------------------------------------------------------------------------
# T-2.2 · menú público (US-04)
# ---------------------------------------------------------------------------


@router.get(
    "/menu/{slug}",
    response_model=MenuPublico,
    responses={**SIN_CAMBIOS, **errores(404)},
)
async def menu(slug: str, response: Response) -> MenuPublico:
    """Menú activo por categorías. Público, sin cookie, cacheable en el borde (02 §4)."""
    response.headers["ETag"] = ETAG_EJEMPLO
    return MenuPublico(
        restaurante=RestaurantePublico(nombre="La Ceiba", slug=slug, logo_url=None, tema="vino"),
        categorias=[
            CategoriaPublica(id=ID_CATEGORIA, nombre="Entradas", orden=1, platillos=[_platillo()])
        ],
        destacados=[ID_PLATILLO],
        actualizado_en=MOMENTO,
    )


@router.get("/platillos/{platillo_id}", response_model=PlatilloDetalle, responses=errores(404))
async def platillo(platillo_id: UUID) -> PlatilloDetalle:
    """Detalle de un platillo activo."""
    return PlatilloDetalle(
        **_platillo().model_dump(exclude={"id"}), id=platillo_id, categoria_nombre="Entradas"
    )


# ---------------------------------------------------------------------------
# T-2.3 · analítica (US-24)
# ---------------------------------------------------------------------------


@router.post("/eventos", status_code=status.HTTP_202_ACCEPTED, responses=errores(401))
async def eventos(cuerpo: EventosLote) -> Response:
    """Lote de hasta 50 eventos. `202` siempre que el cuerpo sea válido."""
    return Response(status_code=status.HTTP_202_ACCEPTED)
