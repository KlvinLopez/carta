"""Orden personal del comensal (US-10, US-11, US-12; contrato de T-3.0, rutas de T-3.2).

El precio nunca viene del cliente (regla dura 4): `ItemCrear` sólo lleva el platillo, la
cantidad y la nota; el servidor lee el precio de la base al agregar y lo congela al confirmar.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, StringConstraints

from app.schemas.comun import SIN_CONTROL, Entrada, Esquema, Precio

MAX_NOTA = 140  # AC-10.1, `ck_item_orden_notas`
MAX_CANTIDAD = 99

Nota = Annotated[str, StringConstraints(strip_whitespace=True, max_length=MAX_NOTA), SIN_CONTROL]
EstadoOrden = Literal["armando", "confirmada", "enviada", "cerrada"]
EstadoComanda = Literal["abierta", "atendida", "servida", "cancelada"]


class ItemCrear(Entrada):
    """`POST /p/orden/items`. Sin precio: lo pone el servidor."""

    platillo_id: UUID
    cantidad: int = Field(default=1, ge=1, le=MAX_CANTIDAD, examples=[1])
    notas: Nota | None = Field(default=None, examples=["Sin cebolla"])


class ItemCambios(Entrada):
    """`PATCH /p/orden/items/{item_id}`: cantidad o nota (sólo con la orden armando)."""

    cantidad: int | None = Field(default=None, ge=1, le=MAX_CANTIDAD)
    notas: Nota | None = None


class ItemDeOrden(Esquema):
    id: UUID
    platillo_id: UUID
    nombre: str = Field(examples=["Enchiladas suizas"])
    cantidad: int = Field(ge=1, examples=[2])
    notas: str | None = None
    precio_unitario: Precio
    subtotal: Precio


class MiOrden(Esquema):
    """La orden viva del miembro: `armando` hasta confirmar; después, bloqueada (INV-3)."""

    id: UUID
    estado: EstadoOrden
    items: list[ItemDeOrden]
    subtotal: Precio


class ItemDeMiembro(Esquema):
    """Lo que los demás ven de la orden de un comensal, en modo consulta (F3-1, AC-09.1)."""

    nombre: str = Field(examples=["Flan napolitano"])
    cantidad: int = Field(ge=1, examples=[1])
    notas: str | None = None


class ComandaDeSesion(Esquema):
    """Cada ronda confirmada de la mesa (AC-29.2) y en qué va."""

    id: UUID
    secuencia: int = Field(ge=1, examples=[1])
    estado: EstadoComanda
    creada_en: datetime


class LlamadaRespuesta(Esquema):
    """`POST /p/llamar-mesero` (T-3.3): una por minuto por sesión (AC-12.3)."""

    id: UUID
    creada_en: datetime
