"""Importación del menú desde un PDF (`/api/v1/admin/.../importaciones`, US-25, ADR-014).

`ResultadoImportacion` es a la vez el borrador que guarda `importacion_menu.resultado`, la
salida estructurada que se le pide al modelo (T-1.8) y el cuerpo de `confirmar` tras la
revisión del operador (03 §2.2). Nada entra al menú sin esa confirmación (INV-9).

Todo lo de aquí viene de un PDF ajeno o de un modelo de lenguaje: cada lista y cada texto
tiene tope, y los enteros caben en `INTEGER` (un valor mayor daría 500 al guardar). Topes:

| Qué | Tope | Por qué |
|---|---|---|
| categorías | 100 | una carta real tiene menos de 30 |
| platillos por categoría | 500 | holgado para una carta de 30 páginas |
| variantes por platillo | 20 | chico/mediano/grande, por persona/para compartir… |
| alérgenos, etiquetas sugeridos | 30 cada uno, 40 caracteres | claves cortas (`lacteos`, `vegano`) |
| avisos | 50, 500 caracteres | mensajes al operador |
| nombres | 100 (categoría y variante), 200 (platillo) | los `VARCHAR` de la base |
| descripción | 1000 | párrafo largo de carta |
| `orden`, `pagina` | 0–10 000 y 1–10 000 | ≤ 30 páginas por importación |
| `moneda` | `^[A-Z]{3}$` | ISO 4217 |
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, Field, StringConstraints

from app.db.models import EstadoImportacion
from app.schemas.comun import Esquema, Nombre100, Nombre200, Precio

Confianza = Literal["alta", "media", "baja"]
MAX_CATEGORIAS = 100
MAX_PLATILLOS = 500
MAX_VARIANTES = 20
MAX_SUGERIDOS = 30
MAX_AVISOS = 50
MAX_POSICION = 10_000

Clave = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
Aviso = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
Descripcion = Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)]


class VarianteImportada(BaseModel):
    nombre: Nombre100
    precio: Precio


class PlatilloImportado(BaseModel):
    nombre: Nombre200
    descripcion: Descripcion | None = None
    # `None` si la carta no muestra precio: el operador lo pone al revisar.
    precio: Precio | None = None
    precio_confianza: Confianza
    variantes: list[VarianteImportada] = Field(default_factory=list, max_length=MAX_VARIANTES)
    alergenos_sugeridos: list[Clave] = Field(default_factory=list, max_length=MAX_SUGERIDOS)
    etiquetas_sugeridas: list[Clave] = Field(default_factory=list, max_length=MAX_SUGERIDOS)
    pagina: int | None = Field(default=None, ge=1, le=MAX_POSICION)


class CategoriaImportada(BaseModel):
    nombre: Nombre100
    orden: int = Field(ge=0, le=MAX_POSICION)
    platillos: list[PlatilloImportado] = Field(max_length=MAX_PLATILLOS)


class ResultadoImportacion(BaseModel):
    moneda: str = Field(default="MXN", pattern=r"^[A-Z]{3}$")
    categorias: list[CategoriaImportada] = Field(max_length=MAX_CATEGORIAS)
    avisos: list[Aviso] = Field(default_factory=list, max_length=MAX_AVISOS)


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
