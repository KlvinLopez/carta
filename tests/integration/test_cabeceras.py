"""T-0.6: cabeceras de seguridad (02_Arquitectura_v1 §12) en **todas** las respuestas.

Estáticos, SPA, API, errores manejados (404, 405, 422) y el 500 de una excepción no controlada
(que `ServerErrorMiddleware` envía por fuera de todo middleware) llevan CSP, `X-Frame-Options`,
`nosniff`, `Referrer-Policy` y `Permissions-Policy`; HSTS sólo fuera de desarrollo y pruebas.
Toda envoltura de error lleva `Cache-Control: no-store`. Los valores se comparan con literales.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import pytest
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from httpx import ASGITransport, AsyncClient
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.core.cabeceras import (
    RUTAS_DOCS,
    MiddlewareCabecerasSeguridad,
    cabeceras_seguridad,
)
from app.core.config import Settings, settings
from app.core.peticion import MiddlewareRequestId
from app.main import app, create_app
from tests.dist_pruebas import construir_dist

CSP = (
    "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; "
    "img-src 'self'; manifest-src 'self'; connect-src 'self'; "
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
)
HSTS = "max-age=31536000; includeSubDomains"
CABECERAS_SIEMPRE = {
    "content-security-policy": CSP,
    "x-frame-options": "DENY",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
}


def _cliente_de(aplicacion: FastAPI) -> AsyncClient:
    transporte = ASGITransport(app=aplicacion, raise_app_exceptions=False)
    return AsyncClient(transport=transporte, base_url="http://pruebas")


@pytest.fixture
def aplicacion(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> FastAPI:
    """La aplicación real con un dist mínimo, más una ruta que falla a propósito."""
    monkeypatch.setattr(settings, "FRONTEND_DIST", str(construir_dist(tmp_path / "dist")))
    monkeypatch.setattr(settings, "R2_URL_PUBLICA", None)
    # Como en CI: fuera de desarrollo no hay /docs (localmente ENTORNO es desarrollo).
    monkeypatch.setattr(settings, "ENTORNO", "pruebas")
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
    ("metodo", "ruta", "estado", "cuerpo"),
    [
        ("GET", "/health", 200, None),  # API, JSON
        ("HEAD", "/health", 200, None),
        ("GET", "/", 200, None),  # SPA, index.html
        ("GET", "/m/abc", 200, None),
        ("GET", "/assets/Area-a1b2c3d4.js", 200, None),  # estático inmutable
        ("GET", "/fonts/DMSans-variable-latin.woff2", 200, None),
        ("GET", "/manifest.webmanifest", 200, None),
        ("GET", "/assets/no-existe.js", 404, None),  # error de StaticFiles, envoltura
        ("GET", "/api/v1/nada", 404, None),  # 404 del enrutador
        ("DELETE", "/health", 405, None),  # HTTPException con cabeceras propias (Allow)
        ("POST", "/api/v1/admin/restaurantes", 401, {}),  # sin token (T-1.2), antes del 422
        ("GET", "/explota", 500, None),  # excepción no controlada: ServerErrorMiddleware
        ("GET", "/openapi.json", 200, None),
        ("GET", "/docs", 404, None),  # fuera de desarrollo no se publica
    ],
)
async def test_toda_respuesta_lleva_las_cabeceras_de_seguridad(
    cliente_app: AsyncClient, metodo: str, ruta: str, estado: int, cuerpo: Any
) -> None:
    respuesta = await cliente_app.request(metodo, ruta, json=cuerpo)
    assert respuesta.status_code == estado, respuesta.text
    _comprobar(respuesta)


@pytest.mark.parametrize(
    ("metodo", "ruta", "estado", "cuerpo"),
    [
        ("GET", "/assets/no-existe.js", 404, None),
        ("GET", "/fonts/no-existe.woff2", 404, None),
        ("GET", "/api/v1/nada", 404, None),
        ("GET", "/no-existe.txt", 404, None),
        ("DELETE", "/health", 405, None),
        ("POST", "/api/v1/admin/restaurantes", 401, {}),
        ("GET", "/explota", 500, None),
    ],
)
async def test_los_errores_no_son_cacheables(
    cliente_app: AsyncClient, metodo: str, ruta: str, estado: int, cuerpo: Any
) -> None:
    """Cloudflare cachea por defecto los 404 de `.js`, `.css` y `.woff2`: en el solape de un
    despliegue, un 404 cacheado en el borde dejaría a todos sin ese trozo."""
    respuesta = await cliente_app.request(metodo, ruta, json=cuerpo)
    assert respuesta.status_code == estado, respuesta.text
    assert respuesta.headers["cache-control"] == "no-store"
    assert "error" in respuesta.json()


async def test_el_500_conserva_la_envoltura_y_el_request_id_con_las_cabeceras(
    cliente_app: AsyncClient,
) -> None:
    respuesta = await cliente_app.get("/explota", headers={"X-Request-ID": "rid-cab"})
    assert respuesta.status_code == 500
    assert respuesta.json()["error"]["codigo"] == "ERROR_INTERNO"
    assert respuesta.headers["X-Request-ID"] == "rid-cab"
    _comprobar(respuesta)


def test_el_manejador_del_500_registrado_es_el_envuelto(aplicacion: FastAPI) -> None:
    """Un `add_exception_handler(Exception, ...)` posterior lo pisaría en silencio."""
    manejador = aplicacion.exception_handlers[Exception]
    assert getattr(manejador, "__name__", "") == "manejar_500_con_cabeceras"
    assert app.exception_handlers[Exception].__name__ == "manejar_500_con_cabeceras"


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
    assert respuesta.headers["cache-control"] == "no-store"
    _comprobar(respuesta)


async def test_csp_incluye_el_dominio_publico_de_r2_cuando_settings_lo_tiene(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "FRONTEND_DIST", str(construir_dist(tmp_path / "dist")))
    monkeypatch.setattr(settings, "R2_URL_PUBLICA", "https://img.carta.mx/fotos/")
    async with _cliente_de(create_app()) as cliente:
        spa = await cliente.get("/")
        api = await cliente.get("/health")
    esperada = CSP.replace("img-src 'self'", "img-src 'self' https://img.carta.mx")
    assert spa.headers["content-security-policy"] == esperada
    assert api.headers["content-security-policy"] == esperada


async def test_hsts_en_staging_y_produccion() -> None:
    """Fuera de desarrollo y pruebas la aplicación va por HTTPS (Railway o Caddy): HSTS."""
    for entorno in ("staging", "produccion"):
        # Sin validar: un `Settings` de staging válido exige R2 desde T-1.4 (no es lo probado).
        ajustes = Settings.model_construct(ENTORNO=entorno, SECRET_KEY="x" * 43)
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
        assert respuesta.headers["content-security-policy"] == CSP


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
        return JSONResponse({"ok": True}, headers={"Content-Security-Policy": "default-src *"})

    async with _cliente_de(aplicacion) as cliente:
        respuesta = await cliente.get("/")
    assert respuesta.headers["content-security-policy"] == CSP
    assert respuesta.headers.get_list("content-security-policy") == [CSP]


# --- /docs: sólo en desarrollo, y sólo ahí sin CSP ------------------------------------------


async def test_en_desarrollo_docs_existe_y_solo_esas_rutas_salen_sin_csp(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "FRONTEND_DIST", str(construir_dist(tmp_path / "dist")))
    monkeypatch.setattr(settings, "ENTORNO", "desarrollo")
    async with _cliente_de(create_app()) as cliente:
        docs = await cliente.get("/docs")
        redoc = await cliente.get("/redoc")
        salud = await cliente.get("/health")
        spa = await cliente.get("/")
    assert docs.status_code == 200 and "swagger" in docs.text.lower()
    assert redoc.status_code == 200
    for sin_csp in (docs, redoc):
        assert "content-security-policy" not in sin_csp.headers
        assert sin_csp.headers["x-frame-options"] == "DENY"
        assert sin_csp.headers["x-content-type-options"] == "nosniff"
    _comprobar(salud)
    _comprobar(spa)
    assert RUTAS_DOCS == {"/docs", "/docs/oauth2-redirect", "/redoc"}


async def test_fuera_de_desarrollo_docs_y_redoc_no_existen_pero_openapi_si(
    cliente_app: AsyncClient,
) -> None:
    for ruta in ("/docs", "/redoc", "/docs/oauth2-redirect"):
        respuesta = await cliente_app.get(ruta)
        assert respuesta.status_code == 404, ruta
        assert respuesta.json()["error"]["codigo"] == "RECURSO_NO_ENCONTRADO"
        _comprobar(respuesta)
    assert (await cliente_app.get("/openapi.json")).status_code == 200


# --- detrás de un proxy -------------------------------------------------------------------


async def test_detras_del_proxy_el_esquema_es_el_de_x_forwarded_proto() -> None:
    """La imagen fija `FORWARDED_ALLOW_IPS=*`: con el middleware de uvicorn configurado así,
    `X-Forwarded-Proto: https` desde la IP del proxy convierte el `scheme` en `https` (307 con
    `Location: https://`, cookies `Secure`, URLs de QR correctas)."""
    aplicacion = FastAPI()

    @aplicacion.get("/esquema")
    async def esquema(request: Request) -> dict[str, str]:
        return {"scheme": request.url.scheme, "host": request.client.host if request.client else ""}

    envuelta = ProxyHeadersMiddleware(aplicacion, trusted_hosts="*")
    transporte = ASGITransport(app=envuelta, raise_app_exceptions=False, client=("10.0.0.5", 1234))
    async with AsyncClient(transport=transporte, base_url="http://pruebas") as cliente:
        respuesta = await cliente.get(
            "/esquema", headers={"X-Forwarded-Proto": "https", "X-Forwarded-For": "203.0.113.9"}
        )
    assert respuesta.json() == {"scheme": "https", "host": "203.0.113.9"}
