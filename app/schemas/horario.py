"""Horario del restaurante (US-38, Spec 001; columnas de la migración 0004).

La estructura guarda una **lista de tramos por día** y una versión (costura de la Spec 001 §7:
la v1 edita un tramo por día; «rechazar esta noche» y fechas especiales son de la v1.1 y sólo
añaden campos). Un tramo que cierra antes de abrir cierra en la madrugada del día siguiente
(AC-38.5): «18:00 a 02:00». Sin horario (`null`, en la base `{}`) se admite siempre (AC-38.4).
La evaluación al escanear es de T-3.10 y el editor del panel de T-3.19.
"""

from __future__ import annotations

from typing import Annotated, Literal
from zoneinfo import available_timezones

from pydantic import AfterValidator, Field, model_validator

from app.schemas.comun import Entrada, Esquema

DiaSemana = Literal["lun", "mar", "mie", "jue", "vie", "sab", "dom"]
FueraDeHorario = Literal["pedir_aprobacion", "rechazar"]
HoraDelDia = Annotated[
    str,
    Field(pattern=r"^([01][0-9]|2[0-3]):[0-5][0-9]$", examples=["18:00"], description="`HH:MM`"),
]
MAX_TRAMOS_POR_DIA = 4
VERSION_HORARIO = 1


def _zona_iana(valor: str) -> str:
    if valor not in available_timezones():
        raise ValueError("Zona horaria desconocida: usa un nombre IANA, como America/Mexico_City.")
    return valor


ZonaHoraria = Annotated[
    str,
    Field(min_length=1, max_length=64, examples=["America/Mexico_City"]),
    AfterValidator(_zona_iana),
]


class Tramo(Esquema):
    """Un tramo de apertura. `cierra` < `abre` = cierra en la madrugada siguiente (AC-38.5)."""

    abre: HoraDelDia
    cierra: HoraDelDia = Field(examples=["02:00"])

    @model_validator(mode="after")
    def _no_vacio(self) -> Tramo:
        if self.abre == self.cierra:
            raise ValueError("Un tramo no puede abrir y cerrar a la misma hora.")
        return self


class Horario(Esquema):
    """Días y tramos en que el QR admite comensales, en la zona del restaurante. Un día que
    no aparece (o con lista vacía) está cerrado."""

    version: int = Field(default=VERSION_HORARIO, ge=1, le=VERSION_HORARIO)
    dias: dict[DiaSemana, list[Tramo]] = Field(
        examples=[
            {
                "lun": [{"abre": "13:00", "cierra": "23:00"}],
                "vie": [{"abre": "18:00", "cierra": "02:00"}],
            }
        ]
    )

    @model_validator(mode="after")
    def _tope_de_tramos(self) -> Horario:
        for dia, tramos in self.dias.items():
            if len(tramos) > MAX_TRAMOS_POR_DIA:
                raise ValueError(f"Como mucho {MAX_TRAMOS_POR_DIA} tramos por día ({dia}).")
        return self


class HorarioRestaurante(Esquema):
    """Lo que el panel muestra del horario (T-3.19)."""

    horario: Horario | None = Field(description="`null` = sin horario: se admite siempre.")
    zona_horaria: str = Field(examples=["America/Mexico_City"])
    fuera_de_horario: FueraDeHorario = Field(
        description="Al escanear fuera del horario: dejar una solicitud (por defecto) o rechazar."
    )


class HorarioCambios(Entrada):
    """`PATCH` parcial del horario (T-3.19): sólo cambia lo que viene."""

    horario: Horario | None = None
    zona_horaria: ZonaHoraria | None = None
    fuera_de_horario: FueraDeHorario | None = None
