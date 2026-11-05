"""Middleware ASGI de `request_id` y línea de log por petición.

- Lee `X-Request-ID` si viene (y es sano); si no, genera uno.
- Lo deja en `request.state.request_id`, en la variable de contexto del registro y en la
  cabecera `X-Request-ID` de la respuesta.
- Al terminar escribe una línea JSON con método, ruta, estado y latencia en milisegundos.

Es ASGI puro (no `BaseHTTPMiddleware`) para no romper la propagación de contexto ni las
respuestas en streaming. Si la petición termina en una excepción no controlada, la línea
sale con estado 500 y la excepción sigue su camino hasta el manejador de `app.core.errores`.
"""

from __future__ import annotations

import logging
import re
import time
import uuid

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.registro import request_id_actual

log = logging.getLogger("carta.peticion")

CABECERA = "X-Request-ID"
LONGITUD_MAXIMA = 64
_FORMATO_VALIDO = re.compile(rf"^[A-Za-z0-9._-]{{1,{LONGITUD_MAXIMA}}}$")


def generar_request_id() -> str:
    return uuid.uuid4().hex


def request_id_valido(valor: str | None) -> str | None:
    """El valor entrante si es seguro para cabeceras y logs; `None` si no sirve."""
    if valor and _FORMATO_VALIDO.match(valor):
        return valor
    return None


class MiddlewareRequestId:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        entrante = Headers(scope=scope).get(CABECERA.lower())
        request_id = request_id_valido(entrante) or generar_request_id()
        scope.setdefault("state", {})["request_id"] = request_id
        token = request_id_actual.set(request_id)

        inicio = time.perf_counter()
        estado = 500  # si nadie llega a responder, fue una excepción no controlada

        async def enviar(mensaje: Message) -> None:
            nonlocal estado
            if mensaje["type"] == "http.response.start":
                estado = mensaje["status"]
                cabeceras = MutableHeaders(raw=list(mensaje.get("headers", [])))
                cabeceras[CABECERA] = request_id
                mensaje = {**mensaje, "headers": cabeceras.raw}
            await send(mensaje)

        try:
            await self.app(scope, receive, enviar)
        finally:
            latencia_ms = round((time.perf_counter() - inicio) * 1000, 2)
            log.info(
                "%s %s %s",
                scope.get("method", "-"),
                scope.get("path", "-"),
                estado,
                extra={
                    "request_id": request_id,
                    "metodo": scope.get("method"),
                    "ruta": scope.get("path"),
                    "estado": estado,
                    "latencia_ms": latencia_ms,
                },
            )
            request_id_actual.reset(token)
