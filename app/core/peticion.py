"""Middleware ASGI de `request_id` y línea de log por petición.

- Lee `X-Request-ID` si viene (y es sano); si no, genera uno.
- Lo deja en `request.state.request_id`, en la variable de contexto del registro y en la
  cabecera `X-Request-ID` de la respuesta.
- Al terminar escribe una línea JSON con método, ruta, estado y latencia en milisegundos.

Es ASGI puro (no `BaseHTTPMiddleware`) para no romper la propagación de contexto ni las
respuestas en streaming. Si la petición termina en una excepción no controlada, la línea
sale con estado 500 y la excepción sigue su camino hasta el manejador de `app.core.errores`.

Debe ser el middleware **más externo** (el último `add_middleware` en `create_app`): uno
más externo que lance o responda por su cuenta saldría sin cabecera ni línea de acceso.
`app.core.errores.request_id_de` cubre ese caso leyendo la cabecera entrante.

La ruta se registra con `ruta_para_log`: toda ruta de la SPA del comensal (`/m/…`) sale como
`/m/<codigo>`, porque el código es la credencial de la mesa (T-2.3, nota de T-2.4). Ni el log
ni la analítica guardan IPs.

Dos detalles de la medición: la latencia incluye las `BackgroundTasks` (corren antes de que
la aplicación devuelva el control); y si una excepción ocurre después de `http.response.start`
la línea lleva el estado ya enviado, no 500 (en la v1 no hay respuestas en streaming).
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
_FORMATO_VALIDO = re.compile(rf"[A-Za-z0-9._-]{{1,{LONGITUD_MAXIMA}}}")


# `/m`, `/m/<lo que sea>` y variantes con barras de más (`//m/x`) o mayúsculas: la SPA del
# comensal.
_RUTA_COMENSAL = re.compile(r"/+m(?:/.*)?", re.DOTALL | re.IGNORECASE)
# Un segmento con la forma exacta de un código de mesa (`secrets.token_urlsafe(16)`: 22
# caracteres) en cualquier otra ruta (`/x/m/<codigo>`, `/api/v1/p/menu/<codigo>`…). Un UUID
# (36) o un `slug` con otra longitud no casan.
_SEGMENTO_CODIGO = re.compile(r"(?<![^/])[A-Za-z0-9_-]{22}(?![^/])")
RUTA_COMENSAL_TACHADA = "/m/<codigo>"
CODIGO_TACHADO = "<codigo>"


def ruta_para_log(ruta: str | None) -> str | None:
    """La ruta tal como se puede escribir en un log: sin el código de mesa (T-2.3)."""
    if ruta is None:
        return None
    if _RUTA_COMENSAL.fullmatch(ruta):
        return RUTA_COMENSAL_TACHADA
    return _SEGMENTO_CODIGO.sub(CODIGO_TACHADO, ruta)


def generar_request_id() -> str:
    return uuid.uuid4().hex


def request_id_valido(valor: str | None) -> str | None:
    """El valor entrante si es seguro para cabeceras y logs; `None` si no sirve.

    `fullmatch`, no `match` con `$`: `$` aceptaría un salto de línea final.
    """
    if valor and _FORMATO_VALIDO.fullmatch(valor):
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
            ruta = ruta_para_log(scope.get("path"))
            log.info(
                "%s %s %s",
                scope.get("method", "-"),
                ruta or "-",
                estado,
                extra={
                    "request_id": request_id,
                    "metodo": scope.get("method"),
                    "ruta": ruta,
                    "estado": estado,
                    "latencia_ms": latencia_ms,
                },
            )
            request_id_actual.reset(token)
