"""Personal (mesero y capitán) visto por el operador (`/api/v1/admin`, US-26).

El PIN entra por `PersonalCrear` y `PinNuevo` y **nunca sale** (regla dura 11, INV-7): ningún
esquema de respuesta tiene `pin` ni `pin_hash`.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.db.models import RolPersonal
from app.schemas.comun import Esquema

Pin = Field(pattern=r"^[0-9]{4,6}$", description="4 a 6 dígitos (AC-26.1)")


class PersonalRespuesta(Esquema):
    id: UUID
    nombre: str
    rol: RolPersonal
    activo: bool
    ultimo_acceso_en: datetime | None = None
    creado_en: datetime


class PersonalCrear(BaseModel):
    nombre: str = Field(min_length=1, max_length=60)
    rol: RolPersonal = RolPersonal.mesero
    pin: str = Pin


class PersonalCambios(BaseModel):
    """`PATCH /personal/{id}`. `activo = false` revoca su sesión (AC-26.3)."""

    nombre: str | None = Field(default=None, min_length=1, max_length=60)
    rol: RolPersonal | None = None
    activo: bool | None = None


class PinNuevo(BaseModel):
    pin: str = Pin
