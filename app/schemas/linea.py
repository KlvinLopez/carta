"""Mensajes de las líneas de avisos (ADR-018): `GET /p/sesion/eventos`, `GET /op/eventos` y
`GET /admin/eventos`, todas `text/event-stream`.

Cada mensaje sale como `event: <evento>` y `data: <JSON>` con uno de estos esquemas (el campo
`evento` repite el nombre). **Ningún aviso lleva datos del negocio**: sólo la versión (el
`ETag` de quien escucha) o el motivo del cierre; para ver el estado, el teléfono lo pide con
su lectura de siempre (`GET /p/sesion`, `GET /op/mesas`) y su `If-None-Match`.

- `hola`: al conectar, **después** de suscribirse, con el ETag vigente y la ventana de
  reconexión que fija el servidor (ADR-018 punto 8).
- `cambio`: con cada aviso de la base, con el ETag nuevo de quien escucha.
- `latido`: sólo tras 25 s sin ningún otro mensaje; lleva el ETag si T-3.20 lo adopta
  (decisión 4.2 del ADR-018), si no, `null`.
- `fin`: quien escucha ya no vale (o una línea más nueva la reemplazó) y la línea se cierra.
  Al cumplir su vida (10 min ± 20 %) la línea se cierra sin `fin`, con `retry: 3000`.
"""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, Field, RootModel

Etag = Annotated[str, Field(min_length=1, max_length=200, examples=['"5f2b9c0e1a"'])]

MotivoFin = Literal[
    "reemplazada",  # 3 líneas por miembro: la más nueva cierra la más antigua
    "retirado",  # el personal quitó al comensal o pasó su cuenta
    "sesion_cerrada",  # mesa limpia o liberada: el pase queda sin efecto (AC-30.4)
    "pase_vencido",  # 24 h sin usarse (AC-30.5, T-3.12)
    "persona_inactiva",  # el personal fue dado de baja
    "sesion_revocada",  # cambio de PIN o de rol (sello `sesiones_desde`, AC-26.3)
    "restaurante_inactivo",
    "acceso_revocado",  # el operador perdió el acceso al restaurante (línea del panel, T-3.7)
]


class Hola(BaseModel):
    evento: Literal["hola"]
    etag: Etag
    ventana_reconexion_s: int = Field(
        ge=5,
        le=600,
        examples=[42],
        description="Tras un corte masivo, esperar al azar hasta estos segundos (ADR-018 §8).",
    )


class Cambio(BaseModel):
    evento: Literal["cambio"]
    etag: Etag


class Latido(BaseModel):
    evento: Literal["latido"]
    etag: Etag | None = Field(
        default=None, description="Versión vigente si T-3.20 adopta el latido con versión."
    )


class Fin(BaseModel):
    evento: Literal["fin"]
    motivo: MotivoFin


class MensajeLinea(
    RootModel[Annotated[Hola | Cambio | Latido | Fin, Field(discriminator="evento")]]
):
    """Un mensaje de la línea: `event:` = `evento`, `data:` = este JSON."""
