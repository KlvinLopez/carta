"""Tipos compartidos por los esquemas de la API v1 (contrato de `docs/plan/02_Arquitectura_v1.md`)."""

from __future__ import annotations

from decimal import Decimal
from typing import Annotated, Any
from uuid import UUID

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    PlainSerializer,
    StringConstraints,
    WithJsonSchema,
)

# Dinero: `Decimal` en el servidor (NUMERIC(10,2) en la base); número en JSON, que es lo que
# lee el frontend (`"precio": 145.0`, 03 §2.2). Nunca se acepta del cliente al pedir (regla
# dura 4): sólo sale.
PRECIO_MAXIMO = Decimal("99999999.99")  # NUMERIC(10,2)
Precio = Annotated[
    Decimal,
    PlainSerializer(float, return_type=float, when_used="json"),
    Field(ge=0, le=PRECIO_MAXIMO, max_digits=10, decimal_places=2, examples=[145.0]),
    # Al serializar, el esquema conserva los límites (el serializador a `float` los perdería).
    WithJsonSchema(
        {"type": "number", "minimum": 0, "maximum": float(PRECIO_MAXIMO), "examples": [145.0]},
        mode="serialization",
    ),
]


# Textos recortados y no vacíos: espejan los CHECK `length(btrim(x)) > 0` de la base para que
# un nombre en blanco sea 422 y no un 500 por `IntegrityError`.
def _texto(maximo: int) -> StringConstraints:
    return StringConstraints(strip_whitespace=True, min_length=1, max_length=maximo)


Nombre60 = Annotated[str, _texto(60)]
Nombre100 = Annotated[str, _texto(100)]
Nombre200 = Annotated[str, _texto(200)]


class Esquema(BaseModel):
    """Base de las respuestas: se construyen desde los modelos ORM (`from_attributes`)."""

    model_config = ConfigDict(from_attributes=True)


def _sin_repetidos(ids: list[UUID]) -> list[UUID]:
    if len(set(ids)) != len(ids):
        raise ValueError("los ids no pueden repetirse")
    return ids


class Reordenar(BaseModel):
    """Cuerpo de `POST .../reordenar`: los ids en el orden nuevo, sin repetir."""

    ids: Annotated[list[UUID], Field(min_length=1, max_length=500), AfterValidator(_sin_repetidos)]


# ---------------------------------------------------------------------------
# Envoltura de error (docs/mvp/04_API_Spec.md §1.2): la única forma de error que responde la
# API (`app/core/errores.py`). Se publica en el contrato para que el frontend la tipe.
# ---------------------------------------------------------------------------


class ErrorDeCampo(BaseModel):
    """Un error de validación: nunca lleva el valor enviado."""

    campo: str = Field(examples=["body.nombre"])
    mensaje: str = Field(examples=["String should have at least 1 character"])
    tipo: str = Field(examples=["string_too_short"])


class DetalleError(BaseModel):
    codigo: str = Field(examples=["RECURSO_NO_ENCONTRADO"])
    mensaje: str = Field(examples=["No encontramos lo que buscas."])
    # En 422 `PAYLOAD_INVALIDO` trae `errores: list[ErrorDeCampo]`; en los demás, `{}`.
    detalles: dict[str, Any]
    request_id: str | None = Field(examples=["01J8XW3Q4T5R6Y7Z"])


class ErrorRespuesta(BaseModel):
    """`{"error": {"codigo", "mensaje", "detalles", "request_id"}}`."""

    error: DetalleError

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "error": {
                        "codigo": "MESA_NO_ENCONTRADA",
                        "mensaje": "No encontramos esta mesa.",
                        "detalles": {},
                        "request_id": "01J8XW3Q4T5R6Y7Z",
                    }
                },
                {
                    "error": {
                        "codigo": "PAYLOAD_INVALIDO",
                        "mensaje": "Revisa los datos enviados.",
                        "detalles": {
                            "errores": [
                                {
                                    "campo": "body.nombre",
                                    "mensaje": "String should have at least 1 character",
                                    "tipo": "string_too_short",
                                }
                            ]
                        },
                        "request_id": "01J8XW3Q4T5R6Y7Z",
                    }
                },
            ]
        }
    )


def errores(*codigos: int) -> dict[int | str, dict[str, Any]]:
    """`responses=` de FastAPI con la envoltura para cada código HTTP."""
    descripciones = {
        401: "Falta la credencial o expiró",
        404: "No existe o no es de tu restaurante (nunca 403, AC-15.3)",
        409: "Choca con el estado actual",
        413: "El archivo es demasiado grande",
        415: "Tipo de archivo no permitido",
        422: "Datos inválidos (`PAYLOAD_INVALIDO`, con `detalles.errores[]`)",
    }
    return {
        codigo: {"model": ErrorRespuesta, "description": descripciones[codigo]}
        for codigo in codigos
    }
