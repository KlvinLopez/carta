"""Lectura de un archivo `multipart/form-data` sin retener la base ni leer de más (T-1.4, T-1.9).

Lo comparten la foto del platillo (`fotos.py`) y la importación de la carta
(`importaciones.py`). La ruta recibe `Request` y lee el cuerpo ella misma, **después** del
401 y del 404: con `archivo: UploadFile = File(...)` FastAPI leería (y escribiría a disco) el
multipart entero antes de resolver las dependencias (revisión de T-1.1, C4). Topes:

1. `Content-Length` declarado mayor que `Limites.max_cuerpo` → 413 **sin leer nada**
   (`limite_por_cabecera`, como dependencia antes de las del recurso).
2. Al leer en *streaming* se cuentan los bytes: un cliente *chunked* o con un
   `Content-Length` mentiroso se corta en cuanto pasa el tope (413).
3. Toda la lectura tiene un plazo (408 `SUBIDA_INCOMPLETA`); un cliente que se va a medias
   es 400; un campo que no sea `archivo`, 422; un multipart roto, 400.

La ruta suelta la sesión (`await sesion.close()`) **antes** de llamar a `leer_archivo`
(revisión de T-1.4, A2): con la conexión retenida, 20 subidas lentas agotaban el pool.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncGenerator, Awaitable, Callable, Coroutine
from dataclasses import dataclass
from typing import Any

from fastapi import Request
from fastapi.routing import APIRoute
from starlette.datastructures import UploadFile
from starlette.formparsers import MultiPartException, MultiPartParser
from starlette.requests import ClientDisconnect
from starlette.responses import Response

from app.core.errores import ErrorCarta

log = logging.getLogger("carta.subidas")

CAMPO = "archivo"
MARGEN_MULTIPART = 64 * 1024  # el marco del multipart (límites, cabeceras de la parte)


@dataclass(frozen=True)
class Limites:
    """Tope del archivo en bytes y los mensajes para la persona."""

    max_archivo: int
    mensaje_tamano: str
    mensaje_campo: str

    @property
    def max_cuerpo(self) -> int:
        return self.max_archivo + MARGEN_MULTIPART


def demasiado_grande(limites: Limites) -> ErrorCarta:
    return ErrorCarta(
        "ARCHIVO_EXCEDE_LIMITE", limites.mensaje_tamano, 413, {"max_bytes": limites.max_archivo}
    )


def campo_invalido(mensaje: str, tipo: str = "archivo_requerido") -> ErrorCarta:
    return ErrorCarta(
        "PAYLOAD_INVALIDO",
        mensaje,
        422,
        {"errores": [{"campo": f"body.{CAMPO}", "mensaje": mensaje, "tipo": tipo}]},
    )


def limite_por_cabecera(limites: Limites) -> Callable[[Request], Awaitable[None]]:
    """Dependencia: 413 por `Content-Length` antes de leer un solo byte del cuerpo."""

    async def dependencia(request: Request) -> None:
        declarado = request.headers.get("content-length")
        if declarado is None:
            return  # *chunked*: lo corta la lectura (`_con_tope`)
        if not declarado.strip().isdigit():
            raise ErrorCarta("PAYLOAD_INVALIDO", "Content-Length inválido.", 400)
        if int(declarado) > limites.max_cuerpo:
            raise demasiado_grande(limites)

    return dependencia


async def _con_tope(request: Request, limites: Limites) -> AsyncGenerator[bytes, None]:
    leidos = 0
    async for trozo in request.stream():
        leidos += len(trozo)
        if leidos > limites.max_cuerpo:
            raise demasiado_grande(limites)
        yield trozo


async def leer_archivo(request: Request, limites: Limites, plazo: float) -> bytes:
    """Los bytes del único campo `archivo` del multipart, con los topes del docstring. El
    nombre y el `Content-Type` de la parte se ignoran: el tipo sale del contenido."""
    tipo = request.headers.get("content-type", "")
    if not tipo.lower().startswith("multipart/form-data"):
        raise campo_invalido(limites.mensaje_campo)
    parser = MultiPartParser(
        request.headers, _con_tope(request, limites), max_files=1, max_fields=0
    )
    try:
        async with asyncio.timeout(plazo):
            formulario = await parser.parse()
    except TimeoutError as error:
        raise ErrorCarta(
            "SUBIDA_INCOMPLETA", "La subida tardó demasiado; inténtalo de nuevo.", 408
        ) from error
    except ClientDisconnect as error:
        log.info("el cliente cortó la subida")
        raise ErrorCarta("PAYLOAD_INVALIDO", "La subida se interrumpió.", 400) from error
    except MultiPartException as error:
        if "Too many" in error.message:  # otro campo además de `archivo`
            raise campo_invalido(
                "Sólo se acepta el campo `archivo`.", "campo_no_permitido"
            ) from error
        raise ErrorCarta("PAYLOAD_INVALIDO", "El multipart está mal formado.", 400) from error
    try:
        claves = list(formulario.keys())
        archivo = formulario.get(CAMPO)
        if any(clave != CAMPO for clave in claves):
            raise campo_invalido("Sólo se acepta el campo `archivo`.", "campo_no_permitido")
        if not isinstance(archivo, UploadFile):
            raise campo_invalido(limites.mensaje_campo)
        datos = await archivo.read(limites.max_archivo + 1)
    finally:
        await formulario.close()
    if len(datos) > limites.max_archivo:
        raise demasiado_grande(limites)
    if not datos:
        raise campo_invalido("El archivo está vacío.", "archivo_vacio")
    return datos


def cuerpo_multipart(titulo: str, descripcion: str) -> dict[str, Any]:
    """`openapi_extra` con el cuerpo de la subida (un solo campo `archivo` binario)."""
    return {
        "requestBody": {
            "required": True,
            "content": {
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "title": titulo,
                        "required": [CAMPO],
                        "properties": {
                            CAMPO: {
                                "type": "string",
                                "format": "binary",
                                "description": descripcion,
                            }
                        },
                        "additionalProperties": False,
                    }
                }
            },
        }
    }


# ---------------------------------------------------------------------------
# Cuerpos JSON con tope (revisión de T-1.9, A2)
# ---------------------------------------------------------------------------


def ruta_con_tope(maximo: int, plazo: float) -> type[APIRoute]:
    """Clase de ruta que lee el cuerpo **antes** que FastAPI con un tope de `maximo` bytes:
    `Content-Length` mayor → 413 sin leer nada; *chunked* que pasa del tope → 413 al pasarlo;
    más de `plazo` segundos → 408. FastAPI lee y valida el cuerpo JSON antes de cualquier
    dependencia, así que una dependencia llegaría tarde. Lo leído queda en la petición y la
    validación de Pydantic sigue igual (y el contrato publica el mismo esquema)."""

    limites = Limites(
        max_archivo=maximo,
        mensaje_tamano=f"El cuerpo pasa de {maximo // (1024 * 1024)} MB.",
        mensaje_campo="",
    )

    async def leer(request: Request) -> None:
        declarado = request.headers.get("content-length")
        if declarado is not None:
            if not declarado.strip().isdigit():
                raise ErrorCarta("PAYLOAD_INVALIDO", "Content-Length inválido.", 400)
            if int(declarado) > maximo:  # sin el margen del multipart: es el cuerpo entero
                raise demasiado_grande(limites)
        partes: list[bytes] = []
        leidos = 0
        try:
            async with asyncio.timeout(plazo):
                async for trozo in request.stream():
                    leidos += len(trozo)
                    if leidos > maximo:
                        raise demasiado_grande(limites)
                    partes.append(trozo)
        except TimeoutError as error:
            raise ErrorCarta(
                "SUBIDA_INCOMPLETA", "La petición tardó demasiado; inténtalo de nuevo.", 408
            ) from error
        except ClientDisconnect as error:
            raise ErrorCarta("PAYLOAD_INVALIDO", "La petición se interrumpió.", 400) from error
        request._body = b"".join(partes)  # `Request.body()` lo devuelve sin volver a leer

    class RutaConTope(APIRoute):
        def get_route_handler(self) -> Callable[[Request], Coroutine[Any, Any, Response]]:
            original = super().get_route_handler()

            async def manejador(request: Request) -> Response:
                await leer(request)
                return await original(request)

            return manejador

    return RutaConTope
