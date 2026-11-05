"""T-0.6: cabeceras de seguridad (02_Arquitectura_v1 §12) en **todas** las respuestas.

Estáticos, SPA, API, errores manejados y el 500 de una excepción no controlada (que
`ServerErrorMiddleware` envía por fuera de todo middleware) llevan CSP, `nosniff`,
`Referrer-Policy` y `Permissions-Policy`; HSTS sólo fuera de desarrollo y pruebas.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.cabeceras import (
    CSP_SIN_IMAGENES_EXTERNAS,
    HSTS,
    PERMISSIONS_POLICY,
    REFERRER_POLICY,
    MiddlewareCabecerasSeguridad,
    cabeceras_seguridad,
)
from app.core.config import Settings, settings
from app.core.peticion import MiddlewareRequestId
from app.main import app, create_app
from tests.dist_pruebas import construir_dist

CABECERAS_SIEMPRE = {
    "content-security-policy": CSP_SIN_IMAGENES_EXTERNAS,
    "x-content-type-options": "nosniff",
    "referrer-policy": REFERRER_POLICY,
    "permissions-policy": PERMISSIONS_POLICY,
}


def _cliente_de(aplicacion: FastAPI) -> AsyncClient:
    transporte = ASGITransport(app=aplicacion, raise_app_exceptions=False)
    return AsyncClient(transport=transporte, base_url="http://pruebas")


@pytest.fixture
def aplicacion(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> FastAPI:
    """La aplicación real con un dist mínimo, más dos rutas que fallan a propósito."""
    monkeypatch.setattr(settings, "FRONTEND_DIST", str(construir_dist(tmp_path / "dist")))
    monkeypatch.setattr(settings, "R2_URL_PUBLICA", None)
    aplicacion = create_app()

    async def explota() -> None:
        raise RuntimeError("detalle interno")

    aplicacion.add_api_route("/explota", explota)
    return aplicacion


@pytest.fixture
async def cliente_app(aplicacion: FastAPI) -> AsyncIterator[AsyncClient]:
    async with _cliente_de(aplicacion) as c:
        yield c


def _comprobar(respuesta: Any) -> None:
    for nombre, valor in CABECERAS_SIEMPRE.items():
        assert respuesta.headers.get(nombre) == valor, (nombre, dict(respuesta.headers))
    # En pruebas (y desarrollo) la aplicación corre por HTTP: sin HSTS.
    assert "strict-transport-security" not in respuesta.headers


@pytest.mark.parametrize(
    ("metodo", "ruta", "estado"),
    [
        ("GET", "/health", 200),  # API, JSON
        ("HEAD", "/health", 200),
        ("GET", "/", 200),  # SPA, index.html
        ("GET", "/m/abc", 200),
        ("GET", "/assets/Area-a1b2c3d4.js", 200),  # estático inmutable
        ("GET", "/fonts/DMSans-variable-latin.woff2", 200),
        ("GET", "/manifest.webmanifest", 200),
        ("GET", "/assets/no-existe.js", 404),  # error de StaticFiles, envoltura
        ("GET", "/api/v1/nada", 404),  # 404 del enrutador
        ("DELETE", "/health", 405),  # HTTPException con cabeceras propias (Allow)
        ("GET", "/explota", 500),  # excepción no controlada: ServerErrorMiddleware
        ("GET", "/openapi.json", 200),
    ],
)
async def test_toda_respuesta_lleva_las_cabeceras_de_seguridad(
    cliente_app: AsyncClient, metodo: str, ruta: str, estado: int
) -> None:
    respuesta = await cliente_app.request(metodo, ruta)
    assert respuesta.status_code == estado, respuesta.text
    _comprobar(respuesta)


async def test_el_500_conserva_la_envoltura_y_el_request_id_con_las_cabeceras(
    cliente_app: AsyncClient,
) -> None:
    respuesta = await cliente_app.get("/explota", headers={"X-Request-ID": "rid-cab"})
    assert respuesta.status_code == 500
    assert respuesta.json()["error"]["codigo"] == "ERROR_INTERNO"
    assert respuesta.headers["X-Request-ID"] == "rid-cab"
    _comprobar(respuesta)


async def test_asset_304_tambien_lleva_las_cabeceras(cliente_app: AsyncClient) -> None:
    primera = await cliente_app.get("/assets/Area-a1b2c3d4.js")
    segunda = await cliente_app.get(
        "/assets/Area-a1b2c3d4.js", headers={"If-None-Match": primera.headers["etag"]}
    )
    assert segunda.status_code == 304
    _comprobar(segunda)


async def test_sin_dist_el_404_de_la_raiz_lleva_las_cabeceras(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "FRONTEND_DIST", str(tmp_path / "no-existe"))
    async with _cliente_de(create_app()) as cliente:
        respuesta = await cliente.get("/")
    assert respuesta.status_code == 404
    _comprobar(respuesta)


async def test_csp_incluye_el_dominio_publico_de_r2_cuando_settings_lo_tiene(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "FRONTEND_DIST", str(construir_dist(tmp_path / "dist")))
    monkeypatch.setattr(settings, "R2_URL_PUBLICA", "https://img.carta.mx/fotos/")
    async with _cliente_de(create_app()) as cliente:
        spa = await cliente.get("/")
        api = await cliente.get("/health")
    esperada = CSP_SIN_IMAGENES_EXTERNAS.replace(
        "img-src 'self'", "img-src 'self' https://img.carta.mx"
    )
    assert spa.headers["content-security-policy"] == esperada
    assert api.headers["content-security-policy"] == esperada


async def test_hsts_en_staging_y_produccion() -> None:
    """Fuera de desarrollo y pruebas la aplicación va por HTTPS (Railway o Caddy): HSTS."""
    for entorno in ("staging", "produccion"):
        ajustes = Settings(_env_file=None, ENTORNO=entorno, SECRET_KEY="x" * 43)  # type: ignore[call-arg]
        cabeceras = cabeceras_seguridad(ajustes)
        assert cabeceras["Strict-Transport-Security"] == HSTS

        aplicacion = FastAPI()
        aplicacion.add_middleware(MiddlewareCabecerasSeguridad, cabeceras=cabeceras)

        @aplicacion.get("/")
        async def raiz() -> dict[str, str]:
            return {"ok": "si"}

        async with _cliente_de(aplicacion) as cliente:
            respuesta = await cliente.get("/")
        assert respuesta.headers["strict-transport-security"] == HSTS
        assert respuesta.headers["content-security-policy"] == CSP_SIN_IMAGENES_EXTERNAS


def test_el_middleware_de_cabeceras_queda_por_dentro_del_de_request_id() -> None:
    """`MiddlewareRequestId` sigue siendo el más externo (regla de CLAUDE.md); el de cabeceras
    va justo después."""
    clases = [m.cls for m in app.user_middleware]
    assert clases[0] is MiddlewareRequestId
    assert clases[1] is MiddlewareCabecerasSeguridad
    assert clases.count(MiddlewareCabecerasSeguridad) == 1


async def test_el_middleware_pisa_una_cabecera_que_una_ruta_intente_relajar() -> None:
    aplicacion = FastAPI()
    aplicacion.add_middleware(MiddlewareCabecerasSeguridad, cabeceras=cabeceras_seguridad(settings))

    @aplicacion.get("/")
    async def relajada() -> Any:
        from fastapi.responses import JSONResponse

        return JSONResponse({"ok": True}, headers={"Content-Security-Policy": "default-src *"})

    async with _cliente_de(aplicacion) as cliente:
        respuesta = await cliente.get("/")
    assert respuesta.headers["content-security-policy"] == CSP_SIN_IMAGENES_EXTERNAS
    assert respuesta.headers.get_list("content-security-policy") == [CSP_SIN_IMAGENES_EXTERNAS]
