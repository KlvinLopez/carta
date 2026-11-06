"""Restaurante visto por su operador (`/api/v1/admin/restaurantes`, US-15)."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal
from urllib.parse import urlsplit
from uuid import UUID

from pydantic import AfterValidator, Field, StringConstraints, model_validator

from app.schemas.comun import (
    SIN_CONTROL,
    SIN_CONTROL_SALVO_SALTOS,
    Entrada,
    Esquema,
    Nombre200,
)

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
# restaurante sale de la ruta (regla dura 5) y el resto no lo decide el operador en la v1;
# mandarlos es 422 (`Entrada`, `extra="forbid"`).
# Los topes espejan las columnas y los CHECK de la base para que un exceso sea 422 y no 500.
# ---------------------------------------------------------------------------

PATRON_SLUG = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
LARGO_MAXIMO_SLUG = 60
# El `slug` va en URLs públicas (`/m/...`, `/staff/<slug>`) y en enlaces que se comparten:
# nada que se confunda con una ruta de la aplicación o con la marca (revisión de T-1.2, B3).
SLUGS_RESERVADOS = frozenset(
    {
        "admin",
        "api",
        "m",
        "staff",
        "assets",
        "fonts",
        "health",
        "ready",
        "static",
        "carta",
        "docs",
        "redoc",
        "openapi",
        "acerca",
        "privacidad",
        "terminos",
    }
)


def _no_reservado(slug: str) -> str:
    if slug in SLUGS_RESERVADOS:
        raise ValueError("esa dirección está reservada")
    return slug


def _url_https(url: str) -> str:
    """Sólo `https://host/...`: nada de `javascript:`, `data:`, `http:` ni credenciales
    (revisión de T-1.2, B1). T-1.4 la restringe al origen de R2 al subir el logo."""
    partes = urlsplit(url)
    if partes.scheme != "https" or not partes.hostname or "@" in partes.netloc:
        raise ValueError("el logo debe ser una URL https")
    return url


Slug = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True, min_length=2, max_length=LARGO_MAXIMO_SLUG, pattern=PATRON_SLUG
    ),
    AfterValidator(_no_reservado),
]
Telefono = Annotated[str, StringConstraints(strip_whitespace=True, max_length=20), SIN_CONTROL]
Correo = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200), SIN_CONTROL]
UrlLogo = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=500),
    SIN_CONTROL,
    AfterValidator(_url_https),
]
Direccion = Annotated[
    str, StringConstraints(strip_whitespace=True, max_length=500), SIN_CONTROL_SALVO_SALTOS
]


class RestauranteCrear(Entrada):
    """`POST /admin/restaurantes`. Sin `slug`, se deriva del nombre (único, con sufijo)."""

    nombre: Nombre200
    slug: Slug | None = Field(
        default=None, description="Si ya existe, 409 `CONFLICTO`. Sin él se deriva del nombre."
    )
    direccion: Direccion | None = None
    telefono: Telefono | None = None
    email: Correo | None = None
    tema: Tema = "vino"


class RestauranteCambios(Entrada):
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
