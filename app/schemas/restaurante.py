"""Restaurante visto por su operador (`/api/v1/admin/restaurantes`, US-15)."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from app.schemas.comun import Esquema

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
