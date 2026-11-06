"""Restaurante visto por su operador (`/api/v1/admin/restaurantes`, US-15)."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, Field, StringConstraints, model_validator

from app.schemas.comun import Esquema, Nombre200

Tema = Literal["vino", "verde", "azul", "ocre", "cafe"]


class RestauranteRespuesta(Esquema):
    """Lo que el panel muestra de un restaurante. Sin `plan` ni `horarios` (sin uso en v1)."""

    id: UUID
    nombre: str
    slug: str
    direccion: str | None = None
    telefono: str | None = None
    email: str | None = None
    logo_url: str | None = None
    tema: Tema
    activo: bool
    creado_en: datetime


# ---------------------------------------------------------------------------
# Entradas (T-1.2). Ninguna lleva `restaurante_id`, `plan`, `horarios` ni `activo`: el
# restaurante sale de la ruta (regla dura 5) y el resto no lo decide el operador en la v1.
# Los topes espejan las columnas y los CHECK de la base para que un exceso sea 422 y no 500.
# ---------------------------------------------------------------------------

PATRON_SLUG = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
LARGO_MAXIMO_SLUG = 60

Slug = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True, min_length=2, max_length=LARGO_MAXIMO_SLUG, pattern=PATRON_SLUG
    ),
]
Telefono = Annotated[str, StringConstraints(strip_whitespace=True, max_length=20)]
Correo = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]
UrlLogo = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]
Direccion = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]


class RestauranteCrear(BaseModel):
    """`POST /admin/restaurantes`. Sin `slug`, se deriva del nombre (único, con sufijo)."""

    nombre: Nombre200
    slug: Slug | None = Field(
        default=None, description="Si ya existe, 409 `CONFLICTO`. Sin él se deriva del nombre."
    )
    direccion: Direccion | None = None
    telefono: Telefono | None = None
    email: Correo | None = None
    tema: Tema = "vino"


class RestauranteCambios(BaseModel):
    """`PATCH /admin/restaurantes/{rid}`: sólo los campos enviados cambian."""

    nombre: Nombre200 | None = None
    slug: Slug | None = None
    direccion: Direccion | None = None
    telefono: Telefono | None = None
    email: Correo | None = None
    logo_url: UrlLogo | None = None
    tema: Tema | None = None

    @model_validator(mode="after")
    def _sin_nulos_en_obligatorios(self) -> RestauranteCambios:
        for campo in ("nombre", "slug", "tema"):
            if campo in self.model_fields_set and getattr(self, campo) is None:
                raise ValueError(f"{campo} no puede ser nulo")
        return self
