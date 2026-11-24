"""Ciclo de la mesa y cuenta de cada comensal (Spec 001, ADR-017; contrato de T-3.0).

**Dinero en centavos enteros** (Spec 001 §7: la cuenta se calcula sobre el reparto del cargo, en
centavos, y el resto del redondeo va a la última fila). El precio nunca viene del cliente
(regla dura 4): ningún cuerpo de entrada lleva precio, monto, descuento ni cupón (AC-37.11).
La propina es un **dato declarado** por el comensal, nunca dinero que Carta reciba, guarde o
reparta (AC-37.9); el personal ve el consumo, la propina y el total a cobrar, que nunca baja del
consumo (AC-37.6).

**Sin datos del comensal en las marcas ni en la propina** (AC-35.5, regla dura 10): ni alias, ni
IP, ni cookie. El autor de un paso es «comensal», «sistema» o el nombre de la persona del
personal o del operador que lo hizo (que es del restaurante, no del comensal).
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, model_validator

from app.schemas.comun import Entrada, Esquema, Precio

# Centavos: `INTEGER` en la base (≤ 21 millones de pesos por cuenta, de sobra).
Centavos = Annotated[int, Field(ge=0, le=2_000_000_000, examples=[48000])]
# La propina que declara el comensal: hasta 1 millón de pesos [supuesto: muy por encima de
# cualquier cuenta real], para que consumo + propina quepa en el total (`Centavos`) y nunca dé
# un 500 al armar la cuenta (ronda de revisión de T-3.0, D2).
PROPINA_MAXIMA_CENTAVOS = 100_000_000
CentavosPropina = Annotated[int, Field(ge=0, le=PROPINA_MAXIMA_CENTAVOS, examples=[7200])]

# La mesa vista por el personal: `abierta` agrupa los `activa`/`lista_para_enviar` de la base;
# «limpia» y «liberada» terminan la sesión y la mesa vuelve a `libre` (Spec 001 §0).
EstadoMesa = Literal["libre", "abierta", "cuenta_cerrada", "pagada"]
# La cuenta de un comensal (Spec 001 §0): `pidiendo` es el `activo` de la base.
EstadoCuenta = Literal["pidiendo", "cuenta_cerrada", "pagada", "flotante", "retirado"]
TipoAutor = Literal["comensal", "personal", "operador", "sistema"]
PasoCiclo = Literal[
    "primer_escaneo",
    "comanda",
    "cuenta_cerrada_comensal",
    "cuenta_reabierta_comensal",
    "cuenta_cerrada_mesa",
    "mesa_reabierta",
    "pago_avisado",
    "pago_validado",
    "mesa_pagada",
    "mesa_limpia",
    "liberada_sin_cargos",
    "liberada_con_cargos",
    "comensal_retirado",
    "comensal_flotante",
    "cuenta_pasada",
    "item_cancelado",
    "entrada_cerrada",
    "entrada_abierta",
    "todo_bien",
    "solicitud_aprobada",
    "solicitud_rechazada",
]
EstadoPartida = Literal["vigente", "cancelado_personal"]
OrigenPartida = Literal["comensal", "personal"]
MotivoSolicitud = Literal["entrada_cerrada", "rojo", "fuera_de_horario"]
EstadoSolicitud = Literal["pendiente", "aprobada", "rechazada", "vencida"]


class Autor(Esquema):
    """Quién hizo un paso. `nombre` sólo para el personal o el operador (p. ej. «Marisol»):
    nunca el alias del comensal."""

    tipo: TipoAutor
    nombre: str | None = Field(default=None, examples=["Marisol"])

    @model_validator(mode="after")
    def _sin_nombre_del_comensal(self) -> Autor:
        # AC-35.5: del comensal (o del sistema) no sale ningún nombre, ni su alias.
        if self.nombre is not None and self.tipo not in ("personal", "operador"):
            raise ValueError("Sólo el personal o el operador llevan nombre.")
        return self


class AccionRegistrada(Esquema):
    """Cuándo y quién (AC-29.8, AC-31.3: «Marisol cerró tu cuenta»)."""

    en: datetime
    por: Autor


class Responsable(Esquema):
    """Una fila del reparto del cargo (Spec 001 §7). En la v1 siempre una, al 100 %."""

    miembro_id: UUID
    parte_pb: int = Field(
        ge=1, le=10000, examples=[10000], description="Parte en puntos base (10000 = 100 %)."
    )
    importe_centavos: Centavos


class Partida(Esquema):
    """Un cargo de la cuenta: quién lo pidió y quién responde (en la v1, la misma persona)."""

    item_id: UUID
    platillo_id: UUID
    nombre: str = Field(examples=["Enchiladas suizas"])
    cantidad: int = Field(ge=1, examples=[2])
    notas: str | None = None
    precio_unitario: Precio
    subtotal_centavos: Centavos
    pidio: UUID | None = Field(description="Miembro que lo pidió.")
    origen: OrigenPartida = "comensal"
    estado: EstadoPartida = "vigente"
    cancelada: AccionRegistrada | None = Field(
        default=None, description="Si el personal la canceló: cuándo y quién (AC-31.5)."
    )
    responde: list[Responsable]


class CuentaComensal(Esquema):
    """La cuenta de un comensal: un **total estimado**, no comprobante (Spec 001 §6).

    `consumo_centavos` suma las partidas vigentes según el reparto; la propina es `null`
    mientras no se declare (el personal ve 0, AC-37.6); `total_a_cobrar_centavos` = consumo +
    propina, nunca menos que el consumo."""

    miembro_id: UUID
    estado: EstadoCuenta
    partidas: list[Partida]
    consumo_centavos: Centavos
    propina_centavos: Centavos | None = None
    total_a_cobrar_centavos: Centavos
    cerrada: AccionRegistrada | None = None
    aviso_pagado_en: datetime | None = Field(
        default=None, description="«Ya pagué»: sólo un aviso al personal (AC-29.7)."
    )
    pago_validado: AccionRegistrada | None = Field(
        default=None, description="Quién validó el pago; a esa persona se anota la propina."
    )


class PropinaDeclarada(Entrada):
    """`PUT /p/cuenta/propina`: cambiar la propina declarada hasta que el personal valide el
    pago (AC-37.8). Sólo el monto calculado en el teléfono sobre el consumo (AC-37.4)."""

    propina_centavos: CentavosPropina


class CerrarMiCuenta(Entrada):
    """`POST /p/cuenta/cerrar` (AC-29.3, AC-37.5). Con ítems sin confirmar, 409
    `PENDIENTES_SIN_CONFIRMAR` salvo que diga qué hacer con ellos."""

    propina_centavos: CentavosPropina | None = Field(
        default=None, description="Propina declarada; `null` = sin propina elegida."
    )
    pendientes: Literal["confirmar", "descartar"] | None = None


class MarcaTiempo(Esquema):
    """Un paso del ciclo con hora y autor, sin sobrescribir (AC-35.1, AC-35.2). Sin alias,
    IP ni cookie (AC-35.5)."""

    paso: PasoCiclo
    ocurrido_en: datetime
    autor: Autor
    miembro_id: UUID | None = Field(default=None, description="Cuenta a la que se refiere.")
    comanda_id: UUID | None = None


class SolicitudEstado(Esquema):
    """`GET /p/solicitud`: la pantalla de espera de quien pidió entrar (T-3.10, F3-4). Con
    `aprobada`, la misma respuesta emite la cookie de invitado."""

    estado: EstadoSolicitud
    motivo: MotivoSolicitud
    alias: str = Field(examples=["Luis"])
    mesa_numero: int = Field(examples=[7])
    restaurante_nombre: str = Field(examples=["La Ceiba"])
    vence_en: datetime


class SolicitudOp(Esquema):
    """Una solicitud de entrada vista por el personal (AC-33.8)."""

    id: UUID
    mesa_id: UUID
    mesa_numero: int = Field(examples=[7])
    alias: str = Field(examples=["Luis"])
    motivo: MotivoSolicitud
    creada_en: datetime
    vence_en: datetime
