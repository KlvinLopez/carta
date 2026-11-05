"""Envoltura de error única y manejadores de excepciones (`docs/mvp/04_API_Spec.md` §1.2).

Toda respuesta de error de la API tiene la forma::

    {"error": {"codigo": "...", "mensaje": "...", "detalles": {}, "request_id": "..."}}

Nunca salen trazas ni mensajes de la base de datos: lo que el cliente no debe ver se registra
en el log (con el mismo `request_id`) y el cuerpo lleva un mensaje genérico.
"""

from __future__ import annotations

import logging
from collections.abc import Mapping
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.peticion import request_id_valido
from app.core.registro import request_id_actual

log = logging.getLogger("carta.errores")

CABECERA_REQUEST_ID = "X-Request-ID"

# Código de negocio por estado HTTP cuando la excepción no trae uno propio.
CODIGOS_POR_HTTP: dict[int, str] = {
    400: "PAYLOAD_INVALIDO",
    401: "SIN_CREDENCIAL",
    403: "ACCION_NO_PERMITIDA",
    404: "RECURSO_NO_ENCONTRADO",
    405: "METODO_NO_PERMITIDO",
    409: "CONFLICTO",
    413: "ARCHIVO_EXCEDE_LIMITE",
    415: "TIPO_NO_SOPORTADO",
    422: "PAYLOAD_INVALIDO",
    429: "DEMASIADAS_PETICIONES",
    500: "ERROR_INTERNO",
}

# Mensajes para la persona, en español, cuando la excepción no trae uno propio.
MENSAJES_POR_HTTP: dict[int, str] = {
    400: "No pudimos entender la petición.",
    401: "Necesitas identificarte para hacer esto.",
    403: "No tienes permiso para hacer esto.",
    404: "No encontramos lo que buscas.",
    405: "Este método no está permitido aquí.",
    409: "La operación choca con el estado actual.",
    413: "El archivo es demasiado grande.",
    415: "Este tipo de archivo no está permitido.",
    422: "Revisa los datos enviados.",
    429: "Demasiadas peticiones; espera un momento.",
}
MENSAJE_ERROR_INTERNO = "Algo salió mal de nuestro lado. Inténtalo de nuevo en un momento."
MENSAJE_GENERICO = "No pudimos completar la petición."


class ErrorCarta(Exception):
    """Error de negocio con código estable, mensaje para la persona y estado HTTP.

    `codigo` y `mensaje` son texto nuestro y siempre salen al cliente. `detalles` sale sólo
    en 4xx; en 5xx va al log (puede describir infraestructura) y el cuerpo lleva `{}`.
    """

    def __init__(
        self,
        codigo: str,
        mensaje: str,
        http: int = 400,
        detalles: Mapping[str, Any] | None = None,
    ) -> None:
        super().__init__(mensaje)
        self.codigo = codigo
        self.mensaje = mensaje
        self.http = http
        self.detalles: dict[str, Any] = dict(detalles or {})

    def envoltura(self, request_id: str | None = None) -> dict[str, Any]:
        return envoltura(self.codigo, self.mensaje, self.detalles, request_id)


def envoltura(
    codigo: str,
    mensaje: str,
    detalles: Mapping[str, Any] | None = None,
    request_id: str | None = None,
) -> dict[str, Any]:
    """La única forma de cuerpo de error que publica la API."""
    return {
        "error": {
            "codigo": codigo,
            "mensaje": mensaje,
            "detalles": dict(detalles or {}),
            "request_id": request_id,
        }
    }


def codigo_por_http(http: int) -> str:
    if http in CODIGOS_POR_HTTP:
        return CODIGOS_POR_HTTP[http]
    return "ERROR_INTERNO" if http >= 500 else "ERROR_HTTP"


def mensaje_por_http(http: int) -> str:
    return MENSAJE_ERROR_INTERNO if http >= 500 else MENSAJES_POR_HTTP.get(http, MENSAJE_GENERICO)


def request_id_de(request: Request) -> str | None:
    """El `request_id` de la petición, de más a menos fiable.

    1. `request.state`, que fija `MiddlewareRequestId`.
    2. La variable de contexto, mientras el middleware sigue activo.
    3. La cabecera entrante (saneada): el caso de un middleware más externo que falló antes
       de que el nuestro corriera; sin esto el 500 saldría con `request_id: null`.
    """
    valor = getattr(request.state, "request_id", None)
    if isinstance(valor, str):
        return valor
    return request_id_actual.get() or request_id_valido(request.headers.get("x-request-id"))


def _respuesta(
    request: Request,
    http: int,
    codigo: str,
    mensaje: str,
    detalles: Mapping[str, Any] | None = None,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    request_id = request_id_de(request)
    cabeceras = dict(headers or {})
    if request_id:
        cabeceras[CABECERA_REQUEST_ID] = request_id
    return JSONResponse(
        status_code=http,
        content=envoltura(codigo, mensaje, detalles, request_id),
        headers=cabeceras,
    )


# Los manejadores reciben `Exception` por la firma que exige Starlette; cada uno comprueba
# el tipo concreto que registró `registrar_manejadores`.


async def manejar_error_carta(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, ErrorCarta)
    if exc.http >= 500:
        log.error(
            "error de negocio %s: %s",
            exc.codigo,
            exc.detalles,
            extra={"request_id": request_id_de(request), "codigo": exc.codigo, "http": exc.http},
        )
        return _respuesta(request, exc.http, exc.codigo, exc.mensaje)
    return _respuesta(request, exc.http, exc.codigo, exc.mensaje, exc.detalles)


async def manejar_http_exception(request: Request, exc: Exception) -> JSONResponse:
    """`HTTPException` de FastAPI/Starlette (incluidos 404 y 405 del enrutador).

    El `mensaje` es siempre el nuestro por estado HTTP: el `detail` del framework viene en
    inglés («Not authenticated», «There was an error parsing the body») y no distinguimos de
    forma fiable el nuestro del suyo. El `detail` va al log. Las cabeceras de la excepción
    (`Allow`, `WWW-Authenticate`, `Retry-After`) se conservan.
    """
    assert isinstance(exc, StarletteHTTPException)
    http = exc.status_code
    codigo = codigo_por_http(http)
    extra = {"request_id": request_id_de(request), "codigo": codigo, "http": http}
    if http >= 500:
        log.error("HTTPException %s: %s", http, exc.detail, extra=extra)
    else:
        log.info("HTTPException %s: %s", http, exc.detail, extra=extra)
    return _respuesta(request, http, codigo, mensaje_por_http(http), None, exc.headers)


async def manejar_validacion(request: Request, exc: Exception) -> JSONResponse:
    """Validación del payload (Pydantic): 422 con el campo, el mensaje y el tipo de cada error.

    No se devuelve `input` ni `ctx`: repetir lo que mandó el cliente filtraría PINs o tokens
    al log del navegador y a Sentry.
    """
    assert isinstance(exc, RequestValidationError)
    errores = [
        {
            "campo": ".".join(str(parte) for parte in error.get("loc", ())),
            "mensaje": error.get("msg", ""),
            "tipo": error.get("type", ""),
        }
        for error in exc.errors()
    ]
    return _respuesta(
        request, 422, "PAYLOAD_INVALIDO", MENSAJES_POR_HTTP[422], {"errores": errores}
    )


async def manejar_no_controlada(request: Request, exc: Exception) -> JSONResponse:
    """Cualquier excepción que nadie atrapó: traza al log, cuerpo genérico al cliente.

    Corre en `ServerErrorMiddleware`, por fuera del middleware de `request_id` y después de
    que éste reinició la variable de contexto: el `request_id` se toma de `request.state`.
    La traza que uvicorn volvería a escribir la descarta `FiltroTrazaDuplicada`.
    """
    log.exception(
        "excepción no controlada en %s %s",
        request.method,
        request.url.path,
        extra={"request_id": request_id_de(request), "codigo": "ERROR_INTERNO", "http": 500},
    )
    return _respuesta(request, 500, "ERROR_INTERNO", MENSAJE_ERROR_INTERNO)


def registrar_manejadores(app: FastAPI) -> None:
    app.add_exception_handler(ErrorCarta, manejar_error_carta)
    app.add_exception_handler(StarletteHTTPException, manejar_http_exception)
    app.add_exception_handler(RequestValidationError, manejar_validacion)
    app.add_exception_handler(Exception, manejar_no_controlada)
