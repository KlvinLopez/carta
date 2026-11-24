"""Rutas de contrato de la Fase 3 (T-3.0): declaradas en `/openapi.json`, sin implementar.

Contrato primero (04 §2): el frontend (carriles E y H) genera sus tipos de aquí y trabaja con
datos simulados validados con Ajv (`frontend/src/mocks/`) mientras las tareas del backend ponen
las rutas reales. Los datos de ejemplo viven **sólo en el contrato** (los `examples` de cada
esquema), nunca en una respuesta: una ruta de contrato responde siempre el mismo 404 que una
ruta que no existe (`RECURSO_NO_ENCONTRADO`), en todo entorno, **después** de la autenticación
que ya existe para su audiencia (cookie del comensal, token del operador y su restaurante).
Así lo que entra a `master` y se despliega en staging no responde datos falsos ni abre nada
sin autenticación (precedente: `ejemplos.py` de T-1.1, retirado en T-1.6).

Cada tarea que implementa una ruta **borra su declaración** de la lista correspondiente
(`app/api/{publico,operacion,admin}/contrato.py`) y la pone real con el mismo método, ruta y
esquemas; `tests/unit/test_contrato_ciclo.py` comprueba que el contrato sigue completo.
"""

import re
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from inspect import Parameter, Signature
from typing import Annotated, Any, NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.errores import ErrorCarta
from app.schemas.comun import errores

MAX_IDEMPOTENCY_KEY = 200
# Tope del cuerpo de las rutas de contrato de `/op` y `/admin` (el del comensal: `tope.py`).
TOPE_CUERPO = 16 * 1024
PLAZO_CUERPO = 10.0
REF_ERROR = "#/components/schemas/ErrorRespuesta"
# Los que el router del comensal declara para todas sus rutas (`app/api/publico/__init__.py`).
CODIGOS_DE_LINEA = (400, 408, 413, 422, 429)


class RespuestaEventos(JSONResponse):
    """`text/event-stream` (ADR-018): sólo para que el contrato publique el tipo de las líneas
    (hereda de `JSONResponse` para que FastAPI no añada `type: string` junto al esquema)."""

    media_type = "text/event-stream"


@dataclass(frozen=True)
class RutaDeContrato:
    metodo: str
    ruta: str
    tarea: str
    resumen: str
    cuerpo: type[BaseModel] | None = None
    respuesta: Any = None
    estado: int = 200
    errores: Sequence[int] = ()
    etag: bool = False
    eventos: bool = False
    idempotente: bool = False
    consulta: dict[str, Any] = field(default_factory=dict)


def sin_implementar() -> ErrorCarta:
    """El mismo 404 que una ruta inexistente: el contrato no responde datos."""
    return ErrorCarta("RECURSO_NO_ENCONTRADO", "No encontramos lo que buscas.", 404)


def _parametros(definicion: RutaDeContrato) -> list[Parameter]:
    parametros = [
        Parameter(
            nombre,
            Parameter.KEYWORD_ONLY,
            annotation=str if nombre == "slug" else UUID,
        )
        for nombre in re.findall(r"\{(\w+)\}", definicion.ruta)
    ]
    for nombre, tipo in definicion.consulta.items():
        parametros.append(Parameter(nombre, Parameter.KEYWORD_ONLY, annotation=tipo, default=None))
    if definicion.cuerpo is not None:
        parametros.append(Parameter("cuerpo", Parameter.KEYWORD_ONLY, annotation=definicion.cuerpo))
    if definicion.idempotente:
        parametros.append(
            Parameter(
                "idempotency_key",
                Parameter.KEYWORD_ONLY,
                annotation=Annotated[
                    str | None,
                    Header(alias="Idempotency-Key", max_length=MAX_IDEMPOTENCY_KEY),
                ],
                default=None,
            )
        )
    return parametros


def registrar(
    router: APIRouter,
    definiciones: Sequence[RutaDeContrato],
    *,
    dependencias: Sequence[Callable[..., Any]] = (),
    error: Callable[[], ErrorCarta] = sin_implementar,
) -> None:
    """Declara cada ruta con sus esquemas; el manejador sólo lanza `error()`."""
    for definicion in definiciones:

        async def manejador(**_: Any) -> NoReturn:
            raise error()

        manejador.__signature__ = Signature(_parametros(definicion))  # type: ignore[attr-defined]
        respuestas: dict[int | str, dict[str, Any]] = {}
        if definicion.etag:
            respuestas[304] = {"description": "Sin cambios desde el `ETag` de `If-None-Match`."}
        if definicion.eventos:
            respuestas[200] = {
                "model": definicion.respuesta,
                "description": "Línea de avisos: `event:` = `evento` y `data:` = este JSON.",
            }
        if definicion.eventos:
            # Un error de la línea sale como JSON con la envoltura, no como evento: se declara
            # con su tipo propio (si no, FastAPI le pondría `text/event-stream`), también los
            # códigos que el router de la audiencia declara para todas sus rutas.
            for codigo, datos in errores(*CODIGOS_DE_LINEA, *definicion.errores).items():
                respuestas[codigo] = {
                    "description": datos["description"],
                    "content": {"application/json": {"schema": {"$ref": REF_ERROR}}},
                }
        else:
            respuestas.update(errores(*definicion.errores))
        router.add_api_route(
            definicion.ruta,
            manejador,
            methods=[definicion.metodo.upper()],
            name=f"contrato:{definicion.metodo}:{definicion.ruta}",
            summary=definicion.resumen,
            description=(
                f"{definicion.resumen}\n\nContrato de T-3.0; la implementa **{definicion.tarea}**. "
                "Hasta entonces responde 404."
            ),
            response_model=None if definicion.eventos else definicion.respuesta,
            response_class=RespuestaEventos if definicion.eventos else JSONResponse,
            status_code=definicion.estado,
            responses=respuestas,
            dependencies=[Depends(d) for d in dependencias],
        )
