"""Mesas y su código QR vistos por el operador (`/api/v1/admin`, US-21)."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.comun import Esquema


class MesaRespuesta(Esquema):
    id: UUID
    numero: int
    # Opaco, ≥ 22 caracteres (`secrets.token_urlsafe(16)`); va en el QR como /m/<codigo>.
    codigo_publico: str
    url_publica: str = Field(examples=["https://carta.cooking/m/Jx3k9QwLmN2pR7sT4vY8zA"])
    capacidad: int
    activa: bool


class MesasCrear(BaseModel):
    """`POST /restaurantes/{rid}/mesas`: crea `cantidad` mesas numeradas a continuación."""

    cantidad: int = Field(ge=1, le=100)
    capacidad: int = Field(default=4, ge=1, le=50)
