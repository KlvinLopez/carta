"""Cabeceras de seguridad en toda respuesta (02_Arquitectura_v1 §12).

La imagen no lleva proxy delante (ADR-015): la propia API pone CSP, `nosniff`,
`Referrer-Policy`, `Permissions-Policy` y HSTS en **todas** las respuestas: estáticos, SPA,
API, errores manejados y el 500 de una excepción no controlada.

Decisiones:

- **CSP por `'self'`, sin nonces** (02 §12, decidido en la revisión de T-0.5): la build de
  Vite no inyecta estilos ni scripts en línea. `img-src` suma el origen público de R2 cuando
  `Settings.R2_URL_PUBLICA` lo tiene (las fotos de los platillos se sirven desde ahí); de la
  URL sólo se toma `esquema://host[:puerto]`, y si no es un origen limpio se ignora: una
  variable mal puesta no debe abrir la política ni romper la cabecera.
- **HSTS sólo en `staging` y `produccion`.** Ahí la aplicación siempre va por HTTPS (el
  proxy del proveedor o Caddy, con Cloudflare delante). En desarrollo y pruebas corre por HTTP: el navegador
  ignora HSTS sin TLS, pero un `curl -I` en `localhost` sugeriría lo contrario y una
  cabecera «de adorno» confunde más de lo que protege. Un año e `includeSubDomains`, sin
  `preload` (exige registrarse en la lista de los navegadores y es irreversible en la práctica).
- `frame-ancestors 'none'`, `base-uri 'self'` y `form-action 'self'` van explícitas:
  `default-src` no las cubre. `X-Frame-Options: DENY` para los navegadores sin
  `frame-ancestors`.
- El 500 de una excepción no controlada lo envía `ServerErrorMiddleware`, **por fuera** de
  todo middleware (ver `app.core.errores`): `registrar_cabeceras_seguridad` envuelve ese
  manejador para que también ese 500 las lleve.
- Toda envoltura de error lleva `Cache-Control: no-store` (`app.core.errores._respuesta`):
  Cloudflare cachea por defecto los 404 de `.js`, `.css` y `.woff2`, y en el solape de un
  despliegue un 404 cacheado en el borde dejaría a todos sin ese trozo.

`MiddlewareCabecerasSeguridad` es ASGI puro, como `MiddlewareRequestId`, y se añade **antes**
que él en `create_app` (queda por dentro; el de `request_id` sigue siendo el más externo).
Las cabeceras se calculan una vez al crear la aplicación, no por petición.
"""

from __future__ import annotations

import inspect
import logging
import re
from collections.abc import Iterable, Mapping
from typing import Any
from urllib.parse import urlsplit

from fastapi import FastAPI, Request, Response
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import Settings

log = logging.getLogger("carta.cabeceras")

HSTS = "max-age=31536000; includeSubDomains"
REFERRER_POLICY = "strict-origin-when-cross-origin"
PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=()"

# Sólo host (letras, dígitos, puntos y guiones) y puerto opcional: nada que pueda colarse
# como otra directiva o romper la cabecera.
_HOST_VALIDO = re.compile(r"[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::\d{1,5})?")


def origen_imagenes(url_publica: str | None) -> str | None:
    """Origen (`esquema://host[:puerto]`) de `R2_URL_PUBLICA` para `img-src`, o `None`.

    Acepta `http` y `https` (en desarrollo puede ser un S3 local). Credenciales, espacios,
    `;` o cualquier otra cosa que no sea un origen limpio devuelven `None` con un aviso en el
    log: la política se queda en `'self'` y las fotos no cargan, que es visible y seguro.
    """
    if not url_publica or not url_publica.strip():
        return None
    try:
        partes = urlsplit(url_publica.strip())
    except ValueError:
        partes = None
    if (
        partes is None
        or partes.scheme not in ("http", "https")
        or not partes.netloc
        or "@" in partes.netloc
        or not _HOST_VALIDO.fullmatch(partes.netloc.lower())
    ):
        log.warning("R2_URL_PUBLICA no es un origen válido; img-src se queda en 'self'")
        return None
    return f"{partes.scheme}://{partes.netloc.lower()}"


def origenes_https(lista: str | None, variable: str = "FIREBASE_CSP_*") -> tuple[str, ...]:
    """Orígenes `https://host[:puerto]` de una lista separada por espacios o comas.

    Para abrir la CSP a Firebase Auth desde `Settings` (02 §12, T-1.2). Cada entrada debe
    ser un origen limpio por HTTPS (sin ruta salvo `/`, sin comodines, sin credenciales ni
    `;`); las demás se descartan con un aviso: una variable mal puesta no abre la política.
    Sin repetidos y en el orden dado.
    """
    if not lista:
        return ()
    origenes: list[str] = []
    for entrada in re.split(r"[\s,]+", lista.strip()):
        if not entrada:
            continue
        try:
            partes = urlsplit(entrada)
        except ValueError:
            partes = None
        if (
            partes is None
            or partes.scheme != "https"
            or "@" in partes.netloc
            or partes.path not in ("", "/")
            or partes.query
            or partes.fragment
            or not _HOST_VALIDO.fullmatch(partes.netloc.lower())
        ):
            log.warning("%s: se ignora una entrada que no es un origen https limpio", variable)
            continue
        origen = f"https://{partes.netloc.lower()}"
        if origen not in origenes:
            origenes.append(origen)
    return tuple(origenes)


def _fuente(origenes: Iterable[str]) -> str:
    return " ".join(("'self'", *origenes))


def politica_csp(
    origen_imagenes_externas: str | None,
    *,
    connect_src: Iterable[str] = (),
    script_src: Iterable[str] = (),
    frame_src: Iterable[str] = (),
) -> str:
    """La política exacta de 02 §12, con el origen de R2 en `img-src` y los de Firebase Auth
    en `connect-src`, `script-src` y `frame-src` cuando `Settings` los trae.

    Sin orígenes de Firebase la política es la de 02 §12 al pie de la letra (sin `frame-src`:
    `default-src 'self'` ya lo cubre)."""
    img_src = "'self'" if not origen_imagenes_externas else f"'self' {origen_imagenes_externas}"
    marcos = tuple(frame_src)
    directivas = [
        "default-src 'self'",
        f"script-src {_fuente(script_src)}",
        "style-src 'self'",
        "font-src 'self'",
        f"img-src {img_src}",
        "manifest-src 'self'",
        f"connect-src {_fuente(connect_src)}",
    ]
    if marcos:
        # El SDK de Firebase Auth abre un iframe oculto de `<proyecto>.firebaseapp.com`.
        directivas.append(f"frame-src {_fuente(marcos)}")
    directivas += [
        # `default-src` no cubre estas tres: sin `frame-ancestors` la pantalla de PIN se
        # podría embeber en un iframe ajeno (clickjacking).
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
    ]
    return "; ".join(directivas)


CSP_SIN_IMAGENES_EXTERNAS = politica_csp(None)


def cabeceras_seguridad(ajustes: Settings) -> dict[str, str]:
    """Las cabeceras que lleva toda respuesta en este entorno."""
    cabeceras = {
        "Content-Security-Policy": politica_csp(
            origen_imagenes(ajustes.R2_URL_PUBLICA),
            connect_src=origenes_https(
                ajustes.FIREBASE_CSP_CONNECT_SRC, "FIREBASE_CSP_CONNECT_SRC"
            ),
            script_src=origenes_https(ajustes.FIREBASE_CSP_SCRIPT_SRC, "FIREBASE_CSP_SCRIPT_SRC"),
            frame_src=origenes_https(ajustes.FIREBASE_CSP_FRAME_SRC, "FIREBASE_CSP_FRAME_SRC"),
        ),
        # Navegadores sin `frame-ancestors`; los demás ignoran esta cabecera cuando hay CSP.
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": REFERRER_POLICY,
        "Permissions-Policy": PERMISSIONS_POLICY,
    }
    if not ajustes.es_desarrollo:
        cabeceras["Strict-Transport-Security"] = HSTS
    return cabeceras


def poner_cabeceras(destino: MutableHeaders, cabeceras: Mapping[str, str]) -> None:
    """Fija (no añade) cada cabecera: una ruta no puede relajar la política."""
    for nombre, valor in cabeceras.items():
        destino[nombre] = valor


# La documentación interactiva de FastAPI (Swagger desde un CDN, con un script en línea) no
# funciona bajo la CSP. Fuera de desarrollo no se publica (`create_app`); en desarrollo estas
# rutas, y sólo éstas, salen sin CSP (las demás cabeceras se conservan).
RUTAS_DOCS = frozenset({"/docs", "/docs/oauth2-redirect", "/redoc"})


class MiddlewareCabecerasSeguridad:
    def __init__(
        self, app: ASGIApp, cabeceras: Mapping[str, str], sin_csp: Iterable[str] = ()
    ) -> None:
        self.app = app
        self.cabeceras = dict(cabeceras)
        self.sin_csp = frozenset(sin_csp)
        self.cabeceras_sin_csp = {
            k: v for k, v in self.cabeceras.items() if k.lower() != "content-security-policy"
        }

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        a_poner = self.cabeceras_sin_csp if scope["path"] in self.sin_csp else self.cabeceras

        async def enviar(mensaje: Message) -> None:
            if mensaje["type"] == "http.response.start":
                cabeceras = MutableHeaders(raw=list(mensaje.get("headers", [])))
                poner_cabeceras(cabeceras, a_poner)
                mensaje = {**mensaje, "headers": cabeceras.raw}
            await send(mensaje)

        await self.app(scope, receive, enviar)


def registrar_cabeceras_seguridad(
    app: FastAPI, cabeceras: Mapping[str, str], sin_csp: Iterable[str] = ()
) -> None:
    """Añade el middleware y envuelve el manejador del 500 para que ese camino también las lleve.

    Llámala después de `registrar_manejadores` (necesita el manejador de `Exception`) y antes
    de `add_middleware(MiddlewareRequestId)`. Un `add_exception_handler(Exception, ...)`
    posterior pisaría la envoltura en silencio: lo vigila una prueba por el nombre del manejador.
    """
    app.add_middleware(MiddlewareCabecerasSeguridad, cabeceras=cabeceras, sin_csp=sin_csp)

    manejador_original = app.exception_handlers[Exception]

    async def manejar_500_con_cabeceras(request: Request, exc: Exception) -> Response:
        respuesta: Any = manejador_original(request, exc)
        if inspect.isawaitable(respuesta):
            respuesta = await respuesta
        poner_cabeceras(respuesta.headers, cabeceras)
        return respuesta  # type: ignore[no-any-return]

    app.add_exception_handler(Exception, manejar_500_con_cabeceras)
