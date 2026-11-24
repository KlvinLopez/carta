"""Sesión de mesa y miembro vistos por el comensal (`/api/v1/p`, US-01, US-02, US-03).

Contrato de T-2.1, publicado antes de las rutas reales (contrato primero, 04 §2). El comensal
es anónimo: ningún campo pide ni devuelve datos personales (regla dura 10); el alias es un
apodo que el propio comensal elige y puede quedarse en «Comensal N».

Los campos que la Fase 3 añada (mi orden, ítems de los demás, comandas, el ciclo)
entran como opcionales: es un cambio compatible (04_API_Spec §1.6). Los publicó T-3.0; los
llenan T-3.2 (orden y comandas), T-3.10 (entrada) y T-3.12 (última acción). La cuenta con la propina es
de un miembro y tiene su propia ruta con su `ETag` (`GET /p/cuenta`, T-3.8): no va aquí, porque
esta foto se comparte entre los miembros de la mesa (ronda de revisión de T-3.0, B1).
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, StringConstraints

from app.schemas.comun import SIN_CONTROL, Entrada, Esquema
from app.schemas.orden import ComandaDeSesion, ItemDeMiembro, MiOrden

# Una sesión que el comensal todavía puede usar. `cerrada` y `cancelada` nunca salen en un
# 200: la ruta responde 410 `SESION_CERRADA` (INV-11, 03 §5). Con el ciclo de la mesa (Spec
# 001), «cuenta cerrada» y «pagada» siguen vivas: los miembros ven su cuenta (AC-29.5).
EstadoSesionViva = Literal["activa", "lista_para_enviar", "cuenta_cerrada", "pagada"]
RolMiembro = Literal["host", "miembro"]
# `listo` cuando el miembro confirmó su orden; desde la Spec 001, también el estado de su
# cuenta. Un comensal retirado no aparece en la lista.
EstadoMiembro = Literal["armando", "listo", "cuenta_cerrada", "pagada", "flotante"]

MAX_ALIAS = 24  # `miembro_sesion.alias VARCHAR(24)`, AC-03.2
# El código del QR mide 22 caracteres (`secrets.token_urlsafe(16)`); se acepta cualquier texto
# hasta este tope y lo que no exista es 404 `MESA_NO_ENCONTRADA`, nunca 422: un código mal
# copiado y uno revocado se ven igual (AC-01.3).
MAX_CODIGO_MESA = 200

ColorAvatar = Annotated[
    str, Field(pattern=r"^#[0-9A-F]{6}$", examples=["#B8860B"], description="`#RRGGBB`")
]
Alias = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_ALIAS),
    SIN_CONTROL,
]


class MesaDeSesion(Esquema):
    numero: int = Field(examples=[7])
    capacidad: int = Field(examples=[4])


class RestauranteDeSesion(Esquema):
    """Lo justo para la tarjeta de bienvenida y para pedir el menú por `slug` (T-2.2)."""

    id: UUID
    nombre: str = Field(examples=["La Ceiba"])
    slug: str = Field(examples=["la-ceiba"], description="Para `GET /api/v1/p/menu/{slug}`.")
    logo_url: str | None = None
    tema: str = Field(examples=["vino"])


class SesionResumen(Esquema):
    id: UUID
    estado: EstadoSesionViva
    mesa: MesaDeSesion
    restaurante: RestauranteDeSesion


class MiembroRespuesta(Esquema):
    """Un comensal de la sesión: alias, color de avatar estable y si abrió la mesa."""

    id: UUID
    alias: str = Field(examples=["Comensal 2"])
    color_avatar: ColorAvatar
    rol: RolMiembro


class EntrarCuerpo(Entrada):
    """`POST /p/sesion/entrar`: el código que trae el QR (`/m/{codigo_mesa}`)."""

    codigo_mesa: str = Field(
        min_length=1, max_length=MAX_CODIGO_MESA, examples=["Jx3k9QwLmN2pR7sT4vY8zA"]
    )


class EntrarRespuesta(BaseModel):
    """Sesión creada o reanudada y el miembro que la cookie `carta_invitado` identifica."""

    sesion: SesionResumen
    miembro: MiembroRespuesta


class MiembroCambios(Entrada):
    """`PATCH /p/miembro`: el alias nuevo (1–24 caracteres, sin datos reales, AC-03.2)."""

    alias: Alias = Field(examples=["Sofía"])


class MiembroDeSesion(MiembroRespuesta):
    estado: EstadoMiembro
    items: list[ItemDeMiembro] | None = Field(
        default=None,
        description="Su orden en modo consulta, platillo por platillo (F3-1, AC-09.1).",
    )


def _sin_default(esquema: dict[str, Any]) -> None:
    esquema.pop("default", None)


class SesionEstado(BaseModel):
    """`GET /p/sesion`: lo que el sondeo de 3 s pinta (AC-02.3). `yo` es el miembro de la
    cookie; los demás datos son iguales para toda la mesa."""

    id: UUID
    estado: EstadoSesionViva
    mesa: MesaDeSesion
    yo: UUID
    listos: int = Field(ge=0, examples=[1])
    total_miembros: int = Field(ge=1, le=12, examples=[3])
    miembros: list[MiembroDeSesion] = Field(description="En orden de llegada; el `host` primero.")
    # Fase 3 (contrato de T-3.0; opcionales hasta que la tarea dueña los llene).
    entrada_cerrada: bool = Field(
        default=False,
        description="AC-33.1: con la entrada cerrada, los miembros siguen pidiendo (T-3.10).",
        # Opcional en el contrato (sin `default` publicado): los tipos generados lo dejan
        # opcional hasta que T-3.10 lo llene, y los datos simulados de la Fase 2 siguen valiendo.
        json_schema_extra=_sin_default,
    )
    ultima_accion_en: datetime | None = Field(
        default=None, description="Hora de la última acción de comensales o personal."
    )
    mi_orden: MiOrden | None = None
    comandas: list[ComandaDeSesion] = Field(default_factory=list)
