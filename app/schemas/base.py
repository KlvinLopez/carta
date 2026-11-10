"""Base Pydantic schemas for request/response validation."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TimestampMixin(BaseModel):
    """Mixin for models with timestamps."""

    creado_en: datetime
    actualizado_en: datetime | None = None


class UUIDMixin(BaseModel):
    """Mixin for models with UUID primary keys."""

    id: UUID


class UsuarioBase(BaseModel):
    """Base user schema."""

    nombre_display: str | None = None
    plan: str = Field(default="gratis", pattern="^(gratis|premium)$")

    model_config = ConfigDict(from_attributes=True)


class UsuarioCreate(UsuarioBase):
    """Schema for creating users."""

    firebase_uid: str
    provider: str = Field(..., pattern="^(google|email_link)$")


class UsuarioResponse(UsuarioBase, UUIDMixin):
    """Schema for user responses."""

    firebase_uid: str
    provider: str
    ultimo_login: datetime

    pass


class MesaBase(BaseModel):
    """Base table schema. Sin `restaurante_id`: sale de la ruta (regla dura 5)."""

    numero: int = Field(..., gt=0)
    codigo_publico: str
    nfc_id: str | None = None
    capacidad: int = Field(default=4, gt=0)
    activa: bool = True

    model_config = ConfigDict(from_attributes=True)


class MesaCreate(MesaBase):
    """Schema for creating tables."""

    pass


class MesaResponse(MesaBase, UUIDMixin):
    """Schema for table responses."""

    restaurante_id: UUID
