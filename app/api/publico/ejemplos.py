"""Rutas de la Fase 2 que todavía devuelven ejemplos (contrato primero, 04 §2).

Publican en `/openapi.json` la forma final de cada respuesta para que el frontend (carril E)
genere sus tipos (`npm --prefix frontend run tipos`) y trabaje con datos simulados mientras el
backend se construye. Cada tarea sustituye sus rutas por las reales y las borra de aquí:

| Rutas | Tarea |
|---|---|
| `sesion/entrar`, `sesion`, `miembro` | T-2.1 |
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
from app.schemas.sesion import (
    EntrarCuerpo,
    EntrarRespuesta,
    MesaDeSesion,
    MiembroCambios,
    MiembroDeSesion,
    MiembroRespuesta,
    RestauranteDeSesion,
    SesionEstado,
    SesionResumen,
)

router = APIRouter()

# ---------------------------------------------------------------------------
# Datos de ejemplo (fijos: el frontend puede compararlos en sus pruebas)
# ---------------------------------------------------------------------------

MOMENTO = datetime(2026, 11, 11, 20, 0, tzinfo=UTC)
ID_RESTAURANTE = UUID("00000000-0000-4000-8000-000000000001")
ID_SESION = UUID("00000000-0000-4000-8000-000000000601")
ID_MIEMBRO = UUID("00000000-0000-4000-8000-000000000701")
ID_OTRO_MIEMBRO = UUID("00000000-0000-4000-8000-000000000702")
ID_CATEGORIA = UUID("00000000-0000-4000-8000-000000000101")
ID_PLATILLO = UUID("00000000-0000-4000-8000-000000000201")
ETAG_EJEMPLO = '"ejemplo-0001"'

# El sondeo y el menú responden 304 sin cuerpo cuando `If-None-Match` coincide (02 §6).
SIN_CAMBIOS: dict[int | str, dict[str, Any]] = {
    304: {"description": "Sin cambios desde el `ETag` de `If-None-Match`."}
}

MESA = MesaDeSesion(numero=7, capacidad=4)


def _miembro(alias: str = "Comensal 1") -> MiembroRespuesta:
    return MiembroRespuesta(id=ID_MIEMBRO, alias=alias, color_avatar="#4F1728", rol="host")


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
# T-2.1 · sesión y miembro (US-01, US-02, US-03)
# ---------------------------------------------------------------------------


@router.post("/sesion/entrar", response_model=EntrarRespuesta, responses=errores(404, 409, 410))
async def entrar(cuerpo: EntrarCuerpo) -> EntrarRespuesta:
    """Crea o reanuda la sesión de la mesa y emite la cookie `carta_invitado`."""
    return EntrarRespuesta(
        sesion=SesionResumen(
            id=ID_SESION,
            estado="activa",
            mesa=MESA,
            restaurante=RestauranteDeSesion(
                id=ID_RESTAURANTE, nombre="La Ceiba", slug="la-ceiba", logo_url=None, tema="vino"
            ),
        ),
        miembro=_miembro(),
    )


@router.get(
    "/sesion",
    response_model=SesionEstado,
    responses={**SIN_CAMBIOS, **errores(401, 410)},
)
async def estado_de_sesion(response: Response) -> SesionEstado:
    """Estado de la mesa para el sondeo de 3 s, con `ETag`."""
    response.headers["ETag"] = ETAG_EJEMPLO
    return SesionEstado(
        id=ID_SESION,
        estado="activa",
        mesa=MESA,
        yo=ID_MIEMBRO,
        listos=0,
        total_miembros=2,
        miembros=[
            MiembroDeSesion(**_miembro().model_dump(), estado="armando"),
            MiembroDeSesion(
                id=ID_OTRO_MIEMBRO,
                alias="Comensal 2",
                color_avatar="#B8860B",
                rol="miembro",
                estado="armando",
            ),
        ],
    )


@router.patch("/miembro", response_model=MiembroRespuesta, responses=errores(401, 410))
async def cambiar_alias(cuerpo: MiembroCambios) -> MiembroRespuesta:
    """Cambia el alias; uno de la lista de bloqueo es 422 `ALIAS_NO_PERMITIDO`."""
    return _miembro(cuerpo.alias)


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
