"""Importación del menú desde un PDF (`/api/v1/admin/.../importaciones`, US-25, ADR-014).

`ResultadoImportacion` es a la vez el borrador que guarda `importacion_menu.resultado`, la
salida estructurada que se le pide al modelo (T-1.8) y el cuerpo de `confirmar` tras la
revisión del operador (03 §2.2). Nada entra al menú sin esa confirmación (INV-9).
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.db.models import EstadoImportacion
from app.schemas.comun import Esquema, Precio

Confianza = Literal["alta", "media", "baja"]


class VarianteImportada(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    precio: Precio


class PlatilloImportado(BaseModel):
    nombre: str = Field(min_length=1, max_length=200)
    descripcion: str | None = None
    # `None` si la carta no muestra precio: el operador lo pone al revisar.
    precio: Precio | None = None
    precio_confianza: Confianza
    variantes: list[VarianteImportada] = Field(default_factory=list)
    alergenos_sugeridos: list[str] = Field(default_factory=list)
    etiquetas_sugeridas: list[str] = Field(default_factory=list)
    pagina: int | None = Field(default=None, ge=1)


class CategoriaImportada(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    orden: int = Field(ge=0)
    platillos: list[PlatilloImportado]


class ResultadoImportacion(BaseModel):
    moneda: str = Field(default="MXN", min_length=3, max_length=3)
    categorias: list[CategoriaImportada]
    avisos: list[str] = Field(default_factory=list)


class ImportacionRespuesta(Esquema):
    """Estado de una importación. Sin `archivo_url` (bucket privado) ni tokens ni modelo."""

    id: UUID
    estado: EstadoImportacion
    archivo_tipo: str
    paginas: int | None = None
    intentos: int
    error_mensaje: str | None = None
    resultado: ResultadoImportacion | None = None
    creado_en: datetime
    iniciado_en: datetime | None = None
    finalizado_en: datetime | None = None
    confirmado_en: datetime | None = None
