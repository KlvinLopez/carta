"""Categorías y platillos vistos por el operador (`/api/v1/admin`, US-16, US-17, US-27).

El menú público del comensal (`/p/menu/{slug}`, Fase 2) publica su propio esquema en T-2.x.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.db.models import TipoImagen
from app.schemas.comun import Esquema, Precio


class CategoriaRespuesta(Esquema):
    id: UUID
    nombre: str
    orden: int
    activa: bool


class CategoriaCrear(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)


class CategoriaCambios(BaseModel):
    """`PATCH /categorias/{id}`: sólo los campos presentes cambian."""

    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    activa: bool | None = None


class PlatilloRespuesta(Esquema):
    """Platillo con su imagen resuelta (foto → ilustración por categoría, 02 §8)."""

    id: UUID
    categoria_id: UUID | None = None
    nombre: str
    descripcion: str | None = None
    precio: Precio
    imagen_tipo: TipoImagen
    foto_thumb_url: str | None = None
    foto_detalle_url: str | None = None
    ilustracion_clave: str | None = None
    alergenos: list[str]
    etiquetas: list[str]
    calorias: int | None = None
    nivel_picante: int = Field(ge=0, le=5)
    destacado: bool
    orden: int
    disponible: bool
    no_disponible_desde: datetime | None = None
    activo: bool
    creado_en: datetime
    actualizado_en: datetime
