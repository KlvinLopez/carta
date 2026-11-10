"""La API sirve la PWA construida (`frontend/dist`), sin proxy delante (ADR-010, ADR-015).

Qué se sirve y con qué caché:

- `/assets/*` y `/fonts/*` (nombres con hash, o fuentes que no cambian):
  `Cache-Control: public, max-age=31536000, immutable`.
- `index.html` para `/` y las rutas de la SPA (`/m/*`, `/staff/*`, `/admin*`):
  `Cache-Control: no-cache` (el navegador revalida siempre y recibe 304 si no cambió).
- Los archivos sueltos de la raíz del dist (`manifest.webmanifest`, íconos): `no-cache`.
- Nada oculto: ningún segmento que empiece por `.` se sirve (`.vite/`, `.env`).

Qué no:

- `/api/...` sin ruta sigue siendo 404 JSON; un asset inexistente también (envoltura de
  `app.core.errores`), nunca `index.html`.
- Cualquier otra ruta (`/wp-admin`, `/otra`) es 404 JSON: la SPA sólo vive bajo sus prefijos.
- Sólo `GET` y `HEAD`; nada fuera del dist (`..`, dotfiles, directorios).

Cómo: dos montajes de `StaticFiles` para `/assets` y `/fonts`, y `RespaldoSpa` como
`router.default`, el ASGI al que Starlette recurre **cuando ninguna ruta coincide** (en lugar
de su `not_found`). Así `/health`, `/docs` y la API conservan sus 405 (un montaje en `/` o una
ruta comodín los taparía), y una ruta de la SPA con `%` mal codificado (`/m/%ZZ`) llega aquí
tal cual y recibe `index.html`: React Router absorbe el `decodeURI` fallido.

Si el dist no existe la aplicación arranca igual (aviso en el log): `/` responde 404 con la
envoltura y el código `FRONTEND_NO_CONSTRUIDO`; `/assets/*` 404 (`check_dir=False`).

`/docs` y `/redoc` sólo existen en desarrollo (ver `app.core.cabeceras.RUTAS_DOCS`).
"""

from __future__ import annotations

import logging
import mimetypes
import os
from email.utils import parsedate_to_datetime
from pathlib import Path

from fastapi import FastAPI
from starlette.datastructures import Headers
from starlette.exceptions import HTTPException
from starlette.responses import FileResponse, Response
from starlette.staticfiles import NotModifiedResponse, StaticFiles
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.errores import ErrorCarta

log = logging.getLogger("carta.estaticos")

# `python:3.12-slim` no trae /etc/mime.types: sin esto las fuentes saldrían como octet-stream.
mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("font/woff", ".woff")

CACHE_INMUTABLE = "public, max-age=31536000, immutable"
CACHE_REVALIDAR = "no-cache"
PREFIJOS_SPA = ("/m", "/staff", "/admin")
CARPETAS_INMUTABLES = ("assets", "fonts")
MENSAJE_SIN_FRONTEND = (
    "Frontend no construido: falta index.html en FRONTEND_DIST "
    "(`npm --prefix frontend run build`, o usa la imagen de Docker)."
)


def es_ruta_spa(ruta: str) -> bool:
    if ruta == "/":
        return True
    return any(ruta == prefijo or ruta.startswith(prefijo + "/") for prefijo in PREFIJOS_SPA)


class EstaticosInmutables(StaticFiles):
    """`StaticFiles` cuyos archivos (y sus 304) llevan caché de un año.

    Se monta con `check_dir=False` para que la aplicación arranque sin dist; `StaticFiles`
    vuelve a comprobar el directorio en la primera petición y lanzaría `RuntimeError` (500):
    aquí un directorio ausente es un 404 normal.
    """

    async def check_config(self) -> None:
        if self.directory is not None and not os.path.isdir(self.directory):
            raise HTTPException(status_code=404)
        await super().check_config()

    async def get_response(self, path: str, scope: Scope) -> Response:
        # Nada oculto (`.vite/manifest.json`, `.DS_Store`): un segmento con punto inicial es 404.
        if any(segmento.startswith(".") for segmento in path.split(os.sep) if segmento):
            raise HTTPException(status_code=404)
        respuesta = await super().get_response(path, scope)
        respuesta.headers["Cache-Control"] = CACHE_INMUTABLE
        return respuesta


class RespaldoSpa:
    """ASGI para lo que ninguna ruta atendió: `index.html`, un archivo de la raíz del dist o 404."""

    def __init__(self, dist: Path, no_encontrado: ASGIApp) -> None:
        self.dist = dist
        self.indice = dist / "index.html"
        self._no_encontrado = no_encontrado

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self._no_encontrado(scope, receive, send)
            return
        if scope["method"] not in ("GET", "HEAD"):
            raise HTTPException(status_code=404)

        ruta = _ruta_sin_root_path(scope)
        if es_ruta_spa(ruta):
            if not self.indice.is_file():
                raise ErrorCarta("FRONTEND_NO_CONSTRUIDO", MENSAJE_SIN_FRONTEND, 404)
            archivo = self.indice
        else:
            candidato = self._archivo_de_la_raiz(ruta)
            if candidato is None:
                raise HTTPException(status_code=404)
            archivo = candidato
        respuesta: Response = _respuesta_revalidable(archivo, scope)
        await respuesta(scope, receive, send)

    def _archivo_de_la_raiz(self, ruta: str) -> Path | None:
        """`/manifest.webmanifest`, `/icono.svg`…: un archivo regular directamente en el dist."""
        nombre = ruta[1:]
        if not nombre or "/" in nombre or nombre.startswith("."):
            return None
        candidato = self.dist / nombre
        try:
            if candidato.is_file() and candidato.resolve().parent == self.dist.resolve():
                return candidato
        except (OSError, ValueError):
            return None
        return None


def _respuesta_revalidable(archivo: Path, scope: Scope) -> Response:
    """`FileResponse` con `no-cache`, o 304 si el navegador ya tiene esta versión.

    `FileResponse` sola no mira `If-None-Match`; se calcula aquí con sus mismas cabeceras
    (`ETag`, `Last-Modified`), como hace `StaticFiles`.
    """
    stat_result = os.stat(archivo)
    media_type = "text/html" if archivo.name == "index.html" else None
    respuesta = FileResponse(
        archivo,
        stat_result=stat_result,
        media_type=media_type,
        headers={"Cache-Control": CACHE_REVALIDAR},
    )
    if _no_modificado(respuesta.headers, Headers(scope=scope)):
        return NotModifiedResponse(respuesta.headers)
    return respuesta


def _no_modificado(respuesta: Headers, peticion: Headers) -> bool:
    etag = respuesta.get("etag")
    if_none_match = peticion.get("if-none-match")
    if etag and if_none_match:
        etags = [e.strip().removeprefix("W/") for e in if_none_match.split(",")]
        if "*" in etags or etag.removeprefix("W/") in etags:
            return True
    if_modified_since = peticion.get("if-modified-since")
    last_modified = respuesta.get("last-modified")
    if if_modified_since and last_modified:
        try:
            return parsedate_to_datetime(last_modified) <= parsedate_to_datetime(if_modified_since)
        except (TypeError, ValueError):
            return False
    return False


def _ruta_sin_root_path(scope: Scope) -> str:
    ruta: str = scope["path"]
    root_path: str = scope.get("root_path", "")
    if root_path and ruta.startswith(root_path):
        return ruta[len(root_path) :] or "/"
    return ruta


def montar_frontend(app: FastAPI, dist: Path) -> None:
    """Monta el dist en la aplicación. Se llama al final de `create_app`, después de las rutas."""
    if not (dist / "index.html").is_file():
        log.warning("frontend no construido: no existe %s; `/` responderá 404", dist / "index.html")
    for carpeta in CARPETAS_INMUTABLES:
        app.mount(
            f"/{carpeta}",
            EstaticosInmutables(directory=dist / carpeta, check_dir=False),
            name=carpeta,
        )
    app.router.default = RespaldoSpa(dist, app.router.not_found)
