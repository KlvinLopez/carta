"""T-0.6: la API sirve `frontend/dist` sin proxy delante (ADR-010, ADR-015).

`/` y las rutas de la SPA devuelven `index.html` sin caché (y 304 al revalidar); `/assets/*` y
`/fonts/*` un año e inmutables; los archivos sueltos del dist (manifest, íconos) con su tipo;
lo que no existe, lo oculto y lo que queda fuera del dist es 404 con la envoltura de error,
nunca `index.html`. Sin dist la aplicación arranca igual.

El dist no se construye aquí: cada prueba arma uno mínimo en `tmp_path`
(`tests.dist_pruebas.construir_dist`) y apunta `Settings.FRONTEND_DIST` ahí antes de
`create_app()`. Los valores de caché se comparan con los literales del brief.
"""

from __future__ import annotations

import mimetypes
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import create_app
from tests.dist_pruebas import construir_dist

INMUTABLE = "public, max-age=31536000, immutable"
REVALIDAR = "no-cache"

RUTAS_SPA = [
    "/",
    "/m",
    "/m/abcdefghijklmnopqrstuvwxyz",
    "/m/%ZZ",
    "/staff/la-taqueria",
    "/staff/la-taqueria/comandas",
    "/admin",
    "/admin/lo/que/sea",
    "/admin?pestana=menu",
]


def _error(cuerpo: dict[str, Any]) -> dict[str, Any]:
    assert set(cuerpo) == {"error"}, cuerpo
    error = cuerpo["error"]
    assert isinstance(error, dict)
    assert set(error) == {"codigo", "mensaje", "detalles", "request_id"}
    return error


@pytest.fixture
def dist(tmp_path: Path) -> Path:
    return construir_dist(tmp_path / "dist")


@pytest.fixture
def app_con_dist(dist: Path, monkeypatch: pytest.MonkeyPatch) -> FastAPI:
    monkeypatch.setattr(settings, "FRONTEND_DIST", str(dist))
    return create_app()


@pytest.fixture
async def cliente_spa(app_con_dist: FastAPI) -> AsyncIterator[AsyncClient]:
    transporte = ASGITransport(app=app_con_dist, raise_app_exceptions=False)
    async with AsyncClient(transport=transporte, base_url="http://pruebas") as c:
        yield c


async def _llamar_crudo(aplicacion: FastAPI, path: str) -> tuple[int, bytes]:
    """Llama a la aplicación con un `scope` ASGI escrito a mano: httpx normaliza `..` y los
    escapes antes de enviar, y aquí hace falta que lleguen tal cual los dejaría uvicorn."""
    capturado: dict[str, Any] = {"cuerpo": b""}
    mensajes = [
        {"type": "http.request", "body": b"", "more_body": False},
        {"type": "http.disconnect"},
    ]

    async def receive() -> dict[str, Any]:
        return mensajes.pop(0) if len(mensajes) > 1 else mensajes[0]

    async def send(mensaje: dict[str, Any]) -> None:
        if mensaje["type"] == "http.response.start":
            capturado["estado"] = mensaje["status"]
        else:
            capturado["cuerpo"] += mensaje.get("body", b"")

    scope = {
        "type": "http",
        "asgi": {"version": "3.0", "spec_version": "2.4"},
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": path,
        "raw_path": path.encode(),
        "query_string": b"",
        "root_path": "",
        "headers": [(b"host", b"pruebas")],
        "client": ("127.0.0.1", 1234),
        "server": ("pruebas", 80),
    }
    await aplicacion(scope, receive, send)
    return capturado["estado"], capturado["cuerpo"]


# --- SPA ----------------------------------------------------------------------------------


@pytest.mark.parametrize("ruta", RUTAS_SPA)
async def test_rutas_de_la_spa_devuelven_index_sin_cache(
    cliente_spa: AsyncClient, ruta: str
) -> None:
    respuesta = await cliente_spa.get(ruta)
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.headers["content-type"].startswith("text/html")
    assert '<div id="app">' in respuesta.text
    assert respuesta.headers["cache-control"] == REVALIDAR
    assert respuesta.headers["etag"]


async def test_head_de_la_raiz_responde_sin_cuerpo(cliente_spa: AsyncClient) -> None:
    respuesta = await cliente_spa.head("/")
    assert respuesta.status_code == 200
    assert respuesta.content == b""
    assert respuesta.headers["cache-control"] == REVALIDAR


@pytest.mark.parametrize("ruta", ["/", "/m/abc", "/manifest.webmanifest", "/icono.svg"])
async def test_index_y_archivos_sueltos_responden_304_al_revalidar(
    cliente_spa: AsyncClient, ruta: str
) -> None:
    primera = await cliente_spa.get(ruta)
    assert primera.status_code == 200
    por_etag = await cliente_spa.get(ruta, headers={"If-None-Match": primera.headers["etag"]})
    assert por_etag.status_code == 304
    assert por_etag.content == b""
    assert por_etag.headers["cache-control"] == REVALIDAR
    assert por_etag.headers["etag"] == primera.headers["etag"]
    por_fecha = await cliente_spa.get(
        ruta, headers={"If-Modified-Since": primera.headers["last-modified"]}
    )
    assert por_fecha.status_code == 304
    otra = await cliente_spa.get(ruta, headers={"If-None-Match": '"otra-version"'})
    assert otra.status_code == 200


async def test_ruta_de_la_spa_con_porcentaje_mal_codificado_llega_tal_cual(
    app_con_dist: FastAPI,
) -> None:
    """`/m/%ZZ` no es un escape válido: uvicorn lo deja literal y React Router lo absorbe; el
    servidor no debe responder 400 ni 404."""
    estado, cuerpo = await _llamar_crudo(app_con_dist, "/m/%ZZ")
    assert estado == 200
    assert b'<div id="app">' in cuerpo


@pytest.mark.parametrize("metodo", ["post", "put", "delete"])
async def test_la_spa_solo_responde_a_get_y_head(cliente_spa: AsyncClient, metodo: str) -> None:
    respuesta = await cliente_spa.request(metodo.upper(), "/m/abc")
    assert respuesta.status_code == 404
    assert _error(respuesta.json())["codigo"] == "RECURSO_NO_ENCONTRADO"


# --- estáticos ----------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("ruta", "tipo"),
    [
        ("/assets/Area-a1b2c3d4.js", "text/javascript"),
        ("/assets/index-e5f6a7b8.css", "text/css"),
        ("/fonts/DMSans-variable-latin.woff2", "font/woff2"),
    ],
)
async def test_assets_y_fuentes_con_cache_de_un_anio(
    cliente_spa: AsyncClient, ruta: str, tipo: str
) -> None:
    respuesta = await cliente_spa.get(ruta)
    assert respuesta.status_code == 200
    assert respuesta.headers["content-type"].startswith(tipo)
    assert respuesta.headers["cache-control"] == INMUTABLE
    assert respuesta.headers["etag"]


def test_las_fuentes_tienen_tipo_aunque_el_sistema_no_traiga_mime_types(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """`python:3.12-slim` no trae /etc/mime.types: el módulo registra `.woff2` y `.woff`."""
    monkeypatch.setattr(mimetypes, "knownfiles", [])
    mimetypes.init([])
    import importlib

    import app.core.estaticos as estaticos

    importlib.reload(estaticos)
    assert mimetypes.guess_type("DMSans.woff2") == ("font/woff2", None)
    assert mimetypes.guess_type("DMSans.woff") == ("font/woff", None)


async def test_asset_revalidado_responde_304_y_conserva_la_cache(cliente_spa: AsyncClient) -> None:
    primera = await cliente_spa.get("/assets/Area-a1b2c3d4.js")
    segunda = await cliente_spa.get(
        "/assets/Area-a1b2c3d4.js", headers={"If-None-Match": primera.headers["etag"]}
    )
    assert segunda.status_code == 304
    assert segunda.content == b""
    assert segunda.headers["cache-control"] == INMUTABLE


@pytest.mark.parametrize(
    ("ruta", "tipo"),
    [
        ("/manifest.webmanifest", "application/manifest+json"),
        ("/icono.svg", "image/svg+xml"),
    ],
)
async def test_archivos_sueltos_del_dist_con_su_tipo(
    cliente_spa: AsyncClient, ruta: str, tipo: str
) -> None:
    respuesta = await cliente_spa.get(ruta)
    assert respuesta.status_code == 200
    assert respuesta.headers["content-type"].startswith(tipo)
    assert respuesta.headers["cache-control"] == REVALIDAR


@pytest.mark.parametrize(
    "ruta",
    [
        "/assets/no-existe.js",
        "/fonts/no-existe.woff2",
        "/assets/",
        "/no-existe.txt",
        "/index.html.bak",
        "/otra/ruta",
        "/wp-admin",
        "/.env",
        "/assets/..%2Findex.html",
    ],
)
async def test_lo_que_no_existe_es_404_con_la_envoltura_no_index(
    cliente_spa: AsyncClient, ruta: str
) -> None:
    respuesta = await cliente_spa.get(ruta)
    assert respuesta.status_code == 404, respuesta.text
    assert respuesta.headers["content-type"].startswith("application/json")
    error = _error(respuesta.json())
    assert error["codigo"] == "RECURSO_NO_ENCONTRADO"
    assert error["request_id"] == respuesta.headers["X-Request-ID"]
    assert "<div" not in respuesta.text


@pytest.mark.parametrize(
    "ruta",
    [
        "/.oculto",
        "/.vite/manifest.json",
        "/assets/.oculto.js",
        "/assets/.vite/manifest.json",
        "/fonts/.DS_Store",
    ],
)
async def test_nada_oculto_se_sirve_aunque_exista_en_el_dist(
    cliente_spa: AsyncClient, dist: Path, ruta: str
) -> None:
    for relativa in (
        ".oculto",
        ".vite/manifest.json",
        "assets/.oculto.js",
        "assets/.vite/manifest.json",
        "fonts/.DS_Store",
    ):
        archivo = dist / relativa
        archivo.parent.mkdir(parents=True, exist_ok=True)
        archivo.write_text("secreto-del-dist", encoding="utf-8")
    respuesta = await cliente_spa.get(ruta)
    assert respuesta.status_code == 404, ruta
    assert _error(respuesta.json())["codigo"] == "RECURSO_NO_ENCONTRADO"
    assert "secreto-del-dist" not in respuesta.text


@pytest.mark.parametrize(
    "path",
    [
        "/..",
        "/../secreto.txt",
        "/dist/../secreto.txt",
        "/assets/../index.html",
        "/assets/../../secreto.txt",
        "/fonts/../../secreto.txt",
    ],
)
async def test_traversal_fuera_del_dist_es_404(
    app_con_dist: FastAPI, dist: Path, path: str
) -> None:
    """Un archivo plantado un nivel por encima del dist no se alcanza por ninguna ruta."""
    (dist.parent / "secreto.txt").write_text("SECRETO-FUERA-DEL-DIST", encoding="utf-8")
    estado, cuerpo = await _llamar_crudo(app_con_dist, path)
    assert estado == 404
    assert b"RECURSO_NO_ENCONTRADO" in cuerpo
    assert b"<div" not in cuerpo
    assert b"SECRETO-FUERA-DEL-DIST" not in cuerpo


async def test_un_directorio_del_dist_no_se_sirve(cliente_spa: AsyncClient) -> None:
    """`/assets` sin barra: el enrutador redirige a `/assets/` (`redirect_slashes`, como con
    cualquier ruta) y ahí el montaje responde 404; nunca un listado ni `index.html`."""
    redireccion = await cliente_spa.get("/assets")
    assert redireccion.status_code == 307
    assert redireccion.headers["location"].endswith("/assets/")
    respuesta = await cliente_spa.get("/assets/")
    assert respuesta.status_code == 404
    assert _error(respuesta.json())["codigo"] == "RECURSO_NO_ENCONTRADO"


@pytest.mark.parametrize("ruta", ["/api/v1/nada", "/api/v1/p/nada", "/api/nada"])
async def test_api_inexistente_sigue_siendo_404_json(cliente_spa: AsyncClient, ruta: str) -> None:
    respuesta = await cliente_spa.get(ruta)
    assert respuesta.status_code == 404
    assert _error(respuesta.json())["codigo"] == "RECURSO_NO_ENCONTRADO"


async def test_metodo_no_permitido_en_rutas_propias_se_conserva(cliente_spa: AsyncClient) -> None:
    """El respaldo de la SPA no pisa el 405 de una ruta que sí existe con otro método."""
    respuesta = await cliente_spa.delete("/health")
    assert respuesta.status_code == 405
    assert _error(respuesta.json())["codigo"] == "METODO_NO_PERMITIDO"


async def test_salud_y_contrato_siguen_disponibles(cliente_spa: AsyncClient) -> None:
    assert (await cliente_spa.get("/health")).json() == {"status": "ok"}
    openapi = await cliente_spa.get("/openapi.json")
    assert openapi.status_code == 200
    assert "/health" in openapi.json()["paths"]


# --- configuración del dist -----------------------------------------------------------------


async def test_frontend_dist_relativo_se_resuelve_desde_el_directorio_de_trabajo(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """En la imagen `WORKDIR /app` y `FRONTEND_DIST=frontend/dist`; aquí se simula con otro cwd."""
    raiz = tmp_path / "trabajo"
    construir_dist(raiz / "frontend" / "dist")
    (raiz / "frontend" / "dist" / "index.html").write_text(
        '<div id="app">MARCADOR-PROPIO</div>', encoding="utf-8"
    )
    monkeypatch.chdir(raiz)
    monkeypatch.setattr(settings, "FRONTEND_DIST", "frontend/dist")
    transporte = ASGITransport(app=create_app(), raise_app_exceptions=False)
    async with AsyncClient(transport=transporte, base_url="http://pruebas") as cliente:
        respuesta = await cliente.get("/")
    assert respuesta.status_code == 200
    assert "MARCADOR-PROPIO" in respuesta.text


async def test_sin_dist_la_api_arranca_y_la_raiz_explica(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "FRONTEND_DIST", str(tmp_path / "no-existe"))
    aplicacion = create_app()
    transporte = ASGITransport(app=aplicacion, raise_app_exceptions=False)
    async with AsyncClient(transport=transporte, base_url="http://pruebas") as cliente:
        raiz = await cliente.get("/")
        asset = await cliente.get("/assets/Area-a1b2c3d4.js")
        manifest = await cliente.get("/manifest.webmanifest")
        salud = await cliente.get("/health")

    assert raiz.status_code == 404
    error = _error(raiz.json())
    assert error["codigo"] == "FRONTEND_NO_CONSTRUIDO"
    assert "frontend no construido" in error["mensaje"].lower()
    assert asset.status_code == 404
    assert _error(asset.json())["codigo"] == "RECURSO_NO_ENCONTRADO"
    assert manifest.status_code == 404
    assert salud.status_code == 200


def test_la_ruta_del_dist_es_configurable_y_por_defecto_frontend_dist() -> None:
    assert type(settings).model_fields["FRONTEND_DIST"].default == "frontend/dist"
