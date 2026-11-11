"""Sesión de mesa y miembro vistos por el comensal (`/api/v1/p`, US-01, US-02, US-03).

Contrato de T-2.1, publicado antes de las rutas reales (contrato primero, 04 §2). El comensal
es anónimo: ningún campo pide ni devuelve datos personales (regla dura 10); el alias es un
apodo que el propio comensal elige y puede quedarse en «Comensal N».

Los campos que la Fase 3 añada (mi orden, ítems de los demás, comandas) entran como
opcionales: es un cambio compatible (04_API_Spec §1.6).
"""

from __future__ import annotations

from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, Field, StringConstraints

from app.schemas.comun import SIN_CONTROL, Entrada, Esquema

# Una sesión que el comensal todavía puede usar. `cerrada` y `cancelada` nunca salen en un
# 200: la ruta responde 410 `SESION_CERRADA` (INV-11, 03 §5).
EstadoSesionViva = Literal["activa", "lista_para_enviar"]
RolMiembro = Literal["host", "miembro"]
# `listo` cuando el miembro confirmó su orden (Fase 3); hasta entonces todos `armando`.
EstadoMiembro = Literal["armando", "listo"]

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
