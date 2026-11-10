"""Personal (mesero y capitán) visto por el operador (`/api/v1/admin`, US-26).

El PIN entra por `PersonalCrear` y `PinNuevo` y **nunca sale** (regla dura 11, INV-7): ningún
esquema de respuesta tiene `pin`, `pin_hash`, `intentos_fallidos` ni `sesiones_desde`. En los
esquemas de entrada el campo `pin` no entra en el `repr` (`repr=False`), así que un
`print(modelo)` o un registro con el modelo completo tampoco lo escribe.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field, StrictBool

from app.db.models import RolPersonal
from app.schemas.comun import Entrada, Esquema, Nombre60

# Tope de personal activo por restaurante (T-1.6): sobrado para un local con turnos y lo
# bastante bajo para que el listado de entrada de la Fase 3 (`GET /op/personal/{slug}`)
# quepa en una pantalla de teléfono y en una sola respuesta.
MAX_PERSONAL_ACTIVO = 50

PIN_LARGO_MINIMO = 4
PIN_LARGO_MAXIMO = 6


def _pin() -> str:
    # `[0-9]` es ASCII (no `\d`, que admitiría dígitos árabes o de ancho completo) y `$` no
    # tolera un salto de línea final.
    return Field(  # type: ignore[no-any-return]
        pattern=rf"^[0-9]{{{PIN_LARGO_MINIMO},{PIN_LARGO_MAXIMO}}}$",
        description="Sólo dígitos, de 4 a 6 (AC-26.1); `0123` vale. No se devuelve nunca.",
        repr=False,
    )


class PersonalRespuesta(Esquema):
    id: UUID
    nombre: str
    rol: RolPersonal
    activo: bool
    ultimo_acceso_en: datetime | None = None
    creado_en: datetime


class PersonalCrear(Entrada):
    """`POST /restaurantes/{rid}/personal`: el operador elige el PIN y se lo dice a la persona;
    la respuesta no lo repite."""

    nombre: Nombre60
    rol: RolPersonal = RolPersonal.mesero
    pin: str = _pin()


class PersonalCambios(Entrada):
    """`PATCH /personal/{id}`. `activo = false` da de baja a la persona y revoca su sesión
    (AC-26.3); `activo = true` la reactiva (sus sesiones anteriores siguen sin valer).
    Cambiar el rol también revoca la sesión vigente: su cookie lleva el rol anterior."""

    nombre: Nombre60 | None = None
    rol: RolPersonal | None = None
    activo: StrictBool | None = None


class PinNuevo(Entrada):
    """`POST /personal/{id}/pin`: reasigna el PIN, revoca su sesión y limpia el bloqueo."""

    pin: str = _pin()
