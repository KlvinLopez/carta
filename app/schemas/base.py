"""Base Pydantic schemas for request/response validation."""

from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class TimestampMixin(BaseModel):
    """Mixin for models with timestamps."""

    creado_en: datetime
    actualizado_en: Optional[datetime] = None


class UUIDMixin(BaseModel):
    """Mixin for models with UUID primary keys."""

    id: UUID


class RestauranteBase(BaseModel):
    """Base restaurant schema."""

    nombre: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=100)
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    logo_url: Optional[str] = None
    tema: str = Field(default="vino", pattern="^(vino|verde|azul|ocre|cafe)$")
    plan: str = Field(default="gratis", pattern="^(gratis|pro|enterprise)$")
    horarios: dict = Field(default_factory=dict)
    activo: bool = True

    model_config = ConfigDict(from_attributes=True)


class RestauranteCreate(RestauranteBase):
    """Schema for creating restaurants."""

    pass


class RestauranteUpdate(BaseModel):
    """Schema for updating restaurants."""

    nombre: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    logo_url: Optional[str] = None
    tema: Optional[str] = None
    plan: Optional[str] = None
    horarios: Optional[dict] = None
    activo: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


class RestauranteResponse(RestauranteBase, UUIDMixin, TimestampMixin):
    """Schema for restaurant responses."""

    pass


class PlatilloBase(BaseModel):
    """Base dish schema."""

    restaurante_id: UUID
    categoria_id: Optional[UUID] = None
    nombre: str = Field(..., min_length=1, max_length=200)
    descripcion: Optional[str] = None
    precio: float = Field(..., gt=0)
    foto_url: Optional[str] = None
    modelo_3d_url: Optional[str] = None
    alergenos: list = Field(default_factory=list)
    etiquetas: list = Field(default_factory=list)
    calorias: Optional[int] = None
    nivel_picante: int = Field(default=0, ge=0, le=5)
    destacado: bool = False
    activo: bool = True

    model_config = ConfigDict(from_attributes=True)


class PlatilloCreate(PlatilloBase):
    """Schema for creating dishes."""

    pass


class PlatilloUpdate(BaseModel):
    """Schema for updating dishes."""

    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    precio: Optional[float] = None
    foto_url: Optional[str] = None
    modelo_3d_url: Optional[str] = None
    alergenos: Optional[list] = None
    etiquetas: Optional[list] = None
    calorias: Optional[int] = None
    nivel_picante: Optional[int] = None
    destacado: Optional[bool] = None
    activo: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


class PlatilloResponse(PlatilloBase, UUIDMixin, TimestampMixin):
    """Schema for dish responses."""

    pass


class UsuarioBase(BaseModel):
    """Base user schema."""

    nombre_display: Optional[str] = None
    plan: str = Field(default="gratis", pattern="^(gratis|premium)$")
    perfil_alimentario: dict = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class UsuarioCreate(UsuarioBase):
    """Schema for creating users."""

    firebase_uid: str
    provider: str = Field(..., pattern="^(google|apple)$")


class UsuarioResponse(UsuarioBase, UUIDMixin):
    """Schema for user responses."""

    firebase_uid: str
    provider: str
    ultimo_login: datetime

    pass


class MesaBase(BaseModel):
    """Base table schema."""

    restaurante_id: UUID
    numero: int = Field(..., gt=0)
    qr_code: str
    nfc_id: Optional[str] = None
    capacidad: int = Field(default=4, gt=0)
    activa: bool = True

    model_config = ConfigDict(from_attributes=True)


class MesaCreate(MesaBase):
    """Schema for creating tables."""

    pass


class MesaResponse(MesaBase, UUIDMixin):
    """Schema for table responses."""

    pass
