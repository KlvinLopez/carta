"""Mesas y su código QR vistos por el operador (`/api/v1/admin`, US-21)."""

from __future__ import annotations

from uuid import UUID

from pydantic import Field, computed_field

from app.core.enlaces import url_de_mesa
from app.schemas.comun import Entrada, Esquema

# Topes (T-1.5): por llamada y activas por restaurante. El PDF de QR admite las mismas 500.
MAX_MESAS_POR_LLAMADA = 100
MAX_MESAS_ACTIVAS = 500


class MesaRespuesta(Esquema):
    id: UUID
    numero: int
    # Opaco, ≥ 22 caracteres (`secrets.token_urlsafe(16)`); va en el QR como /m/<codigo>.
    codigo_publico: str
    capacidad: int
    activa: bool

    @computed_field(  # type: ignore[prop-decorator]
        description="`https://{DOMINIO}/m/{codigo_publico}`: la dirección que lleva el QR.",
        examples=["https://carta.cooking/m/Jx3k9QwLmN2pR7sT4vY8zA"],
    )
    @property
    def url_publica(self) -> str:
        return url_de_mesa(self.codigo_publico)


class MesasCrear(Entrada):
    """`POST /restaurantes/{rid}/mesas`: crea `cantidad` mesas numeradas a continuación."""

    cantidad: int = Field(ge=1, le=MAX_MESAS_POR_LLAMADA)
    capacidad: int = Field(default=4, ge=1, le=50)
