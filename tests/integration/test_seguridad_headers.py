"""T-2.3: cabeceras de seguridad y logs en las rutas del comensal.

- Las respuestas nuevas de esta tarea (202 de `eventos`, 429 del límite) llevan las mismas
  cabeceras de seguridad que el resto (`app/core/cabeceras.py`, T-0.6, 02 §12); el 429 sale
  con la envoltura, `Cache-Control: no-store` y `Retry-After`.
- El log de acceso nunca escribe el código de la mesa: toda ruta `/m/…` sale como
  `/m/<codigo>` (nota de T-2.4), tampoco en la traza de un 500.
Los valores se comparan con literales.
"""

from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api.publico import limites
from app.core.config import settings
from app.core.peticion import ruta_para_log
from app.db.models import Mesa
from app.main import create_app
from tests.dist_pruebas import construir_dist
from tests.invitado_pruebas import P, con_token, entrar

CSP = (
    "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; "
    "img-src 'self'; manifest-src 'self'; connect-src 'self'; "
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
)
CABECERAS = {
    "content-security-policy": CSP,
    "x-frame-options": "DENY",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
}
CODIGO = "Zx9_secreto-de-la-mesa-123"


def _comprobar(respuesta: Any) -> None:
    for nombre, valor in CABECERAS.items():
        assert respuesta.headers.get(nombre) == valor, (nombre, dict(respuesta.headers))


@pytest.fixture
def sin_r2(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "R2_URL_PUBLICA", None)


async def test_202_de_eventos_y_429_del_limite_llevan_las_cabeceras(
    cliente: AsyncClient, mesa: Mesa, monkeypatch: pytest.MonkeyPatch
) -> None:
    _, token = await entrar(cliente, mesa.codigo_publico)
    assert token
    lote = {"eventos": [{"tipo": "menu_view"}]}
    aceptado = await cliente.post(f"{P}/eventos", json=lote, headers=con_token(token))
    assert aceptado.status_code == 202
    assert aceptado.headers["cache-control"] == "no-store"
    _comprobar_sin_img(aceptado)

    monkeypatch.setattr(limites, "por_token", limites.VentanaMovil(1))
    assert (await cliente.get(f"{P}/sesion", headers=con_token(token))).status_code == 200
    rechazado = await cliente.get(f"{P}/sesion", headers=con_token(token))
    assert rechazado.status_code == 429
    _comprobar_sin_img(rechazado)
    assert rechazado.headers["cache-control"] == "no-store"
    assert rechazado.headers["retry-after"] == "60"
    assert rechazado.headers["x-request-id"] == rechazado.json()["error"]["request_id"]


def _comprobar_sin_img(respuesta: Any) -> None:
    """Como `_comprobar`, sin fijar `img-src` (depende de `R2_URL_PUBLICA` del entorno)."""
    for nombre, valor in CABECERAS.items():
        if nombre == "content-security-policy":
            assert respuesta.headers[nombre].startswith("default-src 'self'; script-src 'self'")
            assert "frame-ancestors 'none'" in respuesta.headers[nombre]
        else:
            assert respuesta.headers.get(nombre) == valor, nombre


# ---------------------------------------------------------------------------
# El código de la mesa no llega al log
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("ruta", "esperada"),
    [
        (f"/m/{CODIGO}", "/m/<codigo>"),
        ("/m", "/m/<codigo>"),
        ("/m/", "/m/<codigo>"),
        (f"//m/{CODIGO}", "/m/<codigo>"),
        (f"/m/{CODIGO}/otra/cosa", "/m/<codigo>"),
        (f"/m/{CODIGO}\n", "/m/<codigo>"),
        ("/menu", "/menu"),
        ("/mx/abc", "/mx/abc"),
        ("/api/v1/p/sesion", "/api/v1/p/sesion"),
        ("/admin/m/abc", "/admin/m/abc"),
        (None, None),
    ],
)
def test_ruta_para_log(ruta: str | None, esperada: str | None) -> None:
    assert ruta_para_log(ruta) == esperada


@pytest.fixture
def aplicacion(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, sin_r2: None) -> FastAPI:
    """La aplicación con un dist mínimo (la SPA responde `/m/…`) y una ruta que falla."""
    monkeypatch.setattr(settings, "FRONTEND_DIST", str(construir_dist(tmp_path / "dist")))
    monkeypatch.setattr(settings, "ENTORNO", "pruebas")
    aplicacion = create_app()

    async def explota() -> None:
        raise RuntimeError("detalle interno")

    aplicacion.add_api_route("/m/{codigo}/explota", explota)
    return aplicacion


@pytest.fixture
async def cliente_app(aplicacion: FastAPI) -> AsyncIterator[AsyncClient]:
    transporte = ASGITransport(app=aplicacion, raise_app_exceptions=False)
    async with AsyncClient(transport=transporte, base_url="http://pruebas") as c:
        yield c


async def test_el_log_de_acceso_tacha_el_codigo_de_la_mesa(
    cliente_app: AsyncClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.INFO):
        respuesta = await cliente_app.get(f"/m/{CODIGO}")
        assert respuesta.status_code == 200
        _comprobar(respuesta)
        assert (await cliente_app.get(f"/m/{CODIGO}/explota")).status_code == 500
    acceso = [r for r in caplog.records if r.name == "carta.peticion"]
    assert len(acceso) == 2
    assert acceso[0].getMessage() == "GET /m/<codigo> 200"
    assert getattr(acceso[0], "ruta", None) == "/m/<codigo>"
    assert acceso[1].getMessage() == "GET /m/<codigo> 500"
    for registro in caplog.records:
        if registro.name.startswith("httpx"):
            continue  # el cliente de la prueba, no la aplicación
        texto = registro.getMessage() + json.dumps(registro.__dict__, default=str)
        assert CODIGO not in texto, registro.name
