"""Menú público del comensal (`GET /api/v1/p/menu/{slug}`, `GET /api/v1/p/platillos/{id}`,
US-04). Contrato de T-2.2, publicado por T-2.1 (contrato primero, 04 §2).

Público y cacheable en el borde (02 §4): no lleva nada del comensal ni nada interno del
restaurante (`activo`, `no_disponible_por`, `foto_original_url`, `restaurante_id`). Sólo salen
platillos activos de categorías activas (AC-04.1); uno agotado sale con `disponible = false`
(AC-04.4). Búsqueda y filtros se resuelven en el teléfono sobre este menú (04_API_Spec §2.2).
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.db.models import TipoImagen
from app.schemas.comun import Esquema, Precio

MAX_DESTACADOS = 3  # «Top 3 del chef» (01 §3.2)


class RestaurantePublico(Esquema):
    nombre: str = Field(examples=["La Ceiba"])
    slug: str = Field(examples=["la-ceiba"])
    logo_url: str | None = None
    tema: str = Field(examples=["vino"])


class PlatilloPublico(Esquema):
    """Un platillo del menú con su imagen resuelta (foto → ilustración por categoría, 02 §8)."""

    id: UUID
    categoria_id: UUID | None = None
    nombre: str = Field(examples=["Guacamole de la casa"])
    descripcion: str | None = None
    precio: Precio
    disponible: bool = Field(description="`false` = «Agotado hoy»: se ve atenuado, no se pide.")
    imagen_tipo: TipoImagen
    foto_thumb_url: str | None = None
    foto_detalle_url: str | None = None
    ilustracion_clave: str | None = Field(
        None, description="Con `imagen_tipo = ilustracion_categoria` (20 claves, T-1.4)."
    )
    alergenos: list[str] = Field(examples=[["lacteos"]])
    etiquetas: list[str] = Field(examples=[["vegetariano"]])
    calorias: int | None = None
    nivel_picante: int = Field(ge=0, le=5)
    destacado: bool
    orden: int


class CategoriaPublica(Esquema):
    id: UUID
    nombre: str = Field(examples=["Entradas"])
    orden: int
    platillos: list[PlatilloPublico] = Field(description="Por `orden`, sólo los activos.")


class MenuPublico(BaseModel):
    restaurante: RestaurantePublico
    categorias: list[CategoriaPublica] = Field(description="Por `orden`, sólo las activas.")
    destacados: list[UUID] = Field(
        max_length=MAX_DESTACADOS,
        description="Hasta 3 ids de platillos con `destacado`, en el orden del menú.",
    )
    actualizado_en: datetime = Field(description="Cambio más reciente del menú.")


class PlatilloDetalle(PlatilloPublico):
    """`GET /p/platillos/{id}`: lo mismo que en el menú más el nombre de su categoría."""

    categoria_nombre: str | None = None
