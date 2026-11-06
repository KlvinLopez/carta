"""Tipos compartidos por los esquemas de la API v1 (contrato de `docs/plan/02_Arquitectura_v1.md`)."""

from __future__ import annotations

from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer

# Dinero: `Decimal` en el servidor (NUMERIC(10,2) en la base); número en JSON, que es lo que
# lee el frontend (`"precio": 145.0`, 03 §2.2). Nunca se acepta del cliente al pedir (regla
# dura 4): sólo sale.
Precio = Annotated[
    Decimal,
    PlainSerializer(float, return_type=float, when_used="json"),
    Field(ge=0, max_digits=10, decimal_places=2, examples=[145.0]),
]


class Esquema(BaseModel):
    """Base de las respuestas: se construyen desde los modelos ORM (`from_attributes`)."""

    model_config = ConfigDict(from_attributes=True)


class Reordenar(BaseModel):
    """Cuerpo de `POST .../reordenar`: los ids en el orden nuevo."""

    ids: list[UUID] = Field(min_length=1, max_length=500)
