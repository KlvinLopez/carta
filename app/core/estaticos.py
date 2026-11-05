"""La API sirve la PWA construida (`frontend/dist`), sin proxy delante (ADR-010, ADR-015).

Qué se sirve y con qué caché:

- `/assets/*` y `/fonts/*` (nombres con hash, o fuentes que no cambian):
  `Cache-Control: public, max-age=31536000, immutable`.
- `index.html` para `/` y las rutas de la SPA (`/m/*`, `/staff/*`, `/admin*`):
  `Cache-Control: no-cache` (el navegador revalida siempre; `FileResponse` pone `ETag`).
- Los archivos sueltos de la raíz del dist (`manifest.webmanifest`, íconos): `no-cache`.

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

Nota: `/docs` carga Swagger UI desde un CDN con un script en línea; la CSP de 02 §12 lo
bloquea en el navegador. `/openapi.json` (lo que usa `npm run tipos`) no se ve afectado.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

from fastapi import FastAPI
from starlette.exceptions import HTTPException
from starlette.responses import FileResponse, Response
from starlette.staticfiles import StaticFiles
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.errores import ErrorCarta

log = logging.getLogger("carta.estaticos")

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
            respuesta = self._indice()
        else:
            archivo = self._archivo_de_la_raiz(ruta)
            if archivo is None:
                raise HTTPException(status_code=404)
            respuesta = FileResponse(archivo, headers={"Cache-Control": CACHE_REVALIDAR})
        await respuesta(scope, receive, send)

    def _indice(self) -> Response:
        if not self.indice.is_file():
            raise ErrorCarta("FRONTEND_NO_CONSTRUIDO", MENSAJE_SIN_FRONTEND, 404)
        return FileResponse(
            self.indice, media_type="text/html", headers={"Cache-Control": CACHE_REVALIDAR}
        )

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
