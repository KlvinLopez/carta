"""Categorías y platillos vistos por el operador (`/api/v1/admin`, US-16, US-17, US-27).

Las respuestas (`CategoriaRespuesta`, `PlatilloRespuesta`) son el contrato de T-1.1. Los
cuerpos de entrada (T-1.3) heredan de `Entrada` (un campo desconocido como `restaurante_id`
es 422, regla dura 5) y espejan los CHECK de la base (`ck_platillo_precio`,
`ck_platillo_nivel_picante`, los NOT NULL y los nombres no vacíos) para que un dato inválido
sea 422 y no un 500 de PostgreSQL (AC-16.2).

Longitudes: `max_length` cuenta puntos de código, igual que `VARCHAR(n)` de PostgreSQL, nunca
bytes; un grafema compuesto (👨‍👩‍👧‍👦 = 7 puntos de código) cuenta lo que ocupa en la columna,
así que un nombre que no cabe es 422 y no `StringDataRightTruncation` (fila T-1.3 de 04 §11).
"""

from __future__ import annotations

import math
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Annotated, Any, ClassVar
from uuid import UUID

from pydantic import BeforeValidator, Field, StringConstraints, model_validator

from app.db.models import TipoImagen
from app.schemas.comun import (
    PRECIO_MAXIMO,
    SIN_CONTROL,
    SIN_CONTROL_SALVO_SALTOS,
    Entrada,
    Esquema,
    Nombre100,
    Nombre200,
    Precio,
)

# ---------------------------------------------------------------------------
# Respuestas (contrato de T-1.1)
# ---------------------------------------------------------------------------


class CategoriaRespuesta(Esquema):
    id: UUID
    nombre: str
    orden: int
    activa: bool


class PlatilloRespuesta(Esquema):
    """Platillo con su imagen resuelta (foto → ilustración por categoría, 02 §8)."""

    id: UUID
    categoria_id: UUID | None = None
    nombre: str
    descripcion: str | None = None
    precio: Precio
    imagen_tipo: TipoImagen
    foto_thumb_url: str | None = None
    foto_detalle_url: str | None = None
    ilustracion_clave: str | None = None
    alergenos: list[str]
    etiquetas: list[str]
    calorias: int | None = None
    nivel_picante: int = Field(ge=0, le=5)
    destacado: bool
    orden: int
    disponible: bool
    no_disponible_desde: datetime | None = None
    activo: bool
    creado_en: datetime
    actualizado_en: datetime


# ---------------------------------------------------------------------------
# Tipos de entrada
# ---------------------------------------------------------------------------

CENTAVOS = Decimal("0.01")


def _cuantizar_precio(valor: object) -> object:
    """`1.005` → `1.01` (`ROUND_HALF_UP`) antes de validar el rango: `NUMERIC(10,2)`
    redondearía en silencio, y un `float` se lee por su texto (`str(1.005)`), no por su
    binario. `NaN`/`Infinity` no son precio. Lo que no es número lo rechaza Pydantic."""
    if isinstance(valor, bool):
        return valor  # Pydantic lo rechaza como `decimal_type`
    if isinstance(valor, float):
        if not math.isfinite(valor):
            raise ValueError("el precio debe ser un número finito")
        valor = str(valor)
    if isinstance(valor, int | str | Decimal):
        try:
            decimal = Decimal(str(valor).strip())
        except InvalidOperation:
            return valor
        if not decimal.is_finite():
            raise ValueError("el precio debe ser un número finito")
        return decimal.quantize(CENTAVOS, rounding=ROUND_HALF_UP)
    return valor


# AC-16.2 y `ck_platillo_precio` (`precio >= 0`): un platillo puede costar 0 (tortillas,
# agua). Tope de `NUMERIC(10,2)`: 99,999,999.99.
PrecioEntrada = Annotated[
    Decimal,
    Field(ge=0, le=PRECIO_MAXIMO, examples=[145.5]),
    BeforeValidator(_cuantizar_precio),
]

# Textos largos: recortados, sin caracteres de control salvo el salto de línea.
Descripcion = Annotated[
    str, StringConstraints(strip_whitespace=True, max_length=1000), SIN_CONTROL_SALVO_SALTOS
]
# Clave de alérgeno o etiqueta (`"lacteos"`, `"vegetariano"`), como en la importación.
ClaveMenu = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40), SIN_CONTROL
]
MAX_CLAVES = 30


def _sin_claves_repetidas(claves: list[str]) -> list[str]:
    return list(dict.fromkeys(claves))


# Las repetidas se quitan en el modelo, después de recortar cada clave.
Claves = Annotated[list[ClaveMenu], Field(max_length=MAX_CLAVES)]
NivelPicante = Annotated[int, Field(ge=0, le=5)]  # `ck_platillo_nivel_picante`
Calorias = Annotated[int, Field(ge=0, le=100_000)]  # cabe en `INTEGER`


class SinNulosEnCambios(Entrada):
    """`PATCH`: un campo ausente no cambia; uno presente con `null` en una columna NOT NULL
    es 422 aquí, no un `NotNullViolation` en la base."""

    no_nulos: ClassVar[frozenset[str]] = frozenset()

    @model_validator(mode="after")
    def _sin_nulos(self) -> Any:
        nulos = sorted(
            c for c in self.no_nulos if c in self.model_fields_set and getattr(self, c) is None
        )
        if nulos:
            raise ValueError(f"no pueden ser null: {', '.join(nulos)}")
        return self


# ---------------------------------------------------------------------------
# Categorías
# ---------------------------------------------------------------------------


class CategoriaCrear(Entrada):
    nombre: Nombre100


class CategoriaCambios(SinNulosEnCambios):
    """`PATCH /categorias/{id}`: sólo los campos presentes cambian."""

    no_nulos = frozenset({"nombre", "activa"})

    nombre: Nombre100 | None = None
    activa: bool | None = None


# ---------------------------------------------------------------------------
# Platillos
# ---------------------------------------------------------------------------


class PlatilloCrear(Entrada):
    """`POST /restaurantes/{rid}/platillos`. El restaurante sale de la ruta (regla dura 5);
    el orden, al final de su categoría; la imagen, de T-1.4."""

    categoria_id: UUID | None = None
    nombre: Nombre200
    descripcion: Descripcion | None = None
    precio: PrecioEntrada
    alergenos: Claves = Field(default_factory=list)
    etiquetas: Claves = Field(default_factory=list)
    calorias: Calorias | None = None
    nivel_picante: NivelPicante = 0
    destacado: bool = False
    disponible: bool = True

    @model_validator(mode="after")
    def _deduplicar(self) -> PlatilloCrear:
        self.alergenos = _sin_claves_repetidas(self.alergenos)
        self.etiquetas = _sin_claves_repetidas(self.etiquetas)
        return self


class PlatilloCambios(SinNulosEnCambios):
    """`PATCH /platillos/{id}`: sólo los campos presentes cambian. `disponible` es el
    interruptor de agotado (US-27); `activo` reactiva un platillo dado de baja (la baja es
    `DELETE`, regla dura 9). `categoria_id: null` lo deja sin categoría."""

    no_nulos = frozenset(
        {
            "nombre",
            "precio",
            "alergenos",
            "etiquetas",
            "nivel_picante",
            "destacado",
            "disponible",
            "activo",
        }
    )

    categoria_id: UUID | None = None
    nombre: Nombre200 | None = None
    descripcion: Descripcion | None = None
    precio: PrecioEntrada | None = None
    alergenos: Claves | None = None
    etiquetas: Claves | None = None
    calorias: Calorias | None = None
    nivel_picante: NivelPicante | None = None
    destacado: bool | None = None
    disponible: bool | None = None
    activo: bool | None = None

    @model_validator(mode="after")
    def _deduplicar(self) -> PlatilloCambios:
        if self.alergenos is not None:
            self.alergenos = _sin_claves_repetidas(self.alergenos)
        if self.etiquetas is not None:
            self.etiquetas = _sin_claves_repetidas(self.etiquetas)
        return self
