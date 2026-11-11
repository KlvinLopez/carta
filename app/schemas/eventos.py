"""Eventos de analítica que manda el teléfono (`POST /api/v1/p/eventos`, US-24). Contrato
de T-2.3, publicado por T-2.1 (contrato primero, 04 §2).

El teléfono sólo manda lo que únicamente él ve (abrir el menú, abrir un platillo, buscar,
filtrar). Los eventos de la orden, la comanda y el personal (`scan`, `item_add`,
`order_confirm`, `waiter_call`, `staff_*`, `dish_sold_out`…, 01 §7) los registra el servidor
al hacer la acción: así un cliente no puede inflar M3 ni G1. Ampliar la lista es un cambio
compatible. Ningún campo lleva texto libre del comensal (regla dura 10): el término de una
búsqueda no sale del teléfono.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from app.schemas.comun import Entrada

MAX_EVENTOS_POR_LOTE = 50  # 04_API_Spec §2.6

TipoEventoCliente = Literal["menu_view", "dish_view", "search", "filter"]


class EventoEntrada(Entrada):
    tipo: TipoEventoCliente
    platillo_id: UUID | None = Field(None, description="Con `dish_view`.")
    ocurrido_en: datetime | None = Field(
        None, description="Hora del teléfono; el servidor la acota a la suya."
    )


class EventosLote(Entrada):
    """Responde `202` sin cuerpo: un fallo de analítica nunca se ve en la app."""

    eventos: list[EventoEntrada] = Field(min_length=1, max_length=MAX_EVENTOS_POR_LOTE)
