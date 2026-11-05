"""T-0.3: salud del proceso, disponibilidad de la base, envoltura de error y `request_id`.

Corre contra la aplicación real (`app.main.app`) con httpx en modo ASGI; `/ready` consulta la
base de `DATABASE_URL` con `SELECT 1`, así que necesita PostgreSQL levantado (no el esquema).
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator

import pytest
from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient

from app.main import app, create_app

CLAVES_ERROR = {"codigo", "mensaje", "detalles", "request_id"}


@pytest.fixture
async def cliente() -> AsyncIterator[AsyncClient]:
    transporte = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transporte, base_url="http://pruebas") as c:
        yield c


def _error(respuesta_json: dict[str, object]) -> dict[str, object]:
    assert set(respuesta_json) == {"error"}, respuesta_json
    error = respuesta_json["error"]
    assert isinstance(error, dict)
    assert set(error) == CLAVES_ERROR
    assert isinstance(error["detalles"], dict)
    return error


async def test_health_responde_que_el_proceso_vive(cliente: AsyncClient) -> None:
    respuesta = await cliente.get("/health")
    assert respuesta.status_code == 200
    assert respuesta.json() == {"status": "ok"}


async def test_ready_comprueba_la_base(cliente: AsyncClient) -> None:
    respuesta = await cliente.get("/ready")
    assert respuesta.status_code == 200
    assert respuesta.json() == {"db": "ok"}


async def test_ruta_inexistente_devuelve_404_con_la_envoltura(cliente: AsyncClient) -> None:
    respuesta = await cliente.get("/api/v1/nada")
    assert respuesta.status_code == 404
    error = _error(respuesta.json())
    assert error["codigo"] == "RECURSO_NO_ENCONTRADO"
    assert error["request_id"]
    assert error["request_id"] == respuesta.headers["X-Request-ID"]


async def test_metodo_no_permitido_tambien_lleva_la_envoltura(cliente: AsyncClient) -> None:
    respuesta = await cliente.delete("/health")
    assert respuesta.status_code == 405
    assert _error(respuesta.json())["codigo"] == "METODO_NO_PERMITIDO"


async def test_validacion_devuelve_422_payload_invalido(cliente: AsyncClient) -> None:
    respuesta = await cliente.post("/api/v1/admin/restaurantes", json={"slug": "x"})
    assert respuesta.status_code == 422
    error = _error(respuesta.json())
    assert error["codigo"] == "PAYLOAD_INVALIDO"
    errores = error["detalles"]["errores"]  # type: ignore[index]
    assert isinstance(errores, list) and errores
    assert any(e["campo"] == "body.nombre" for e in errores)
    # Los detalles describen el campo y el problema, nunca repiten lo que mandó el cliente.
    assert all(set(e) == {"campo", "mensaje", "tipo"} for e in errores)


async def test_http_exception_de_una_ruta_usa_la_envoltura() -> None:
    """Un `HTTPException` con `detail` propio conserva ese texto como `mensaje`."""
    aplicacion: FastAPI = create_app()

    async def no_existe() -> None:
        raise HTTPException(status_code=404, detail="Restaurante no encontrado")

    aplicacion.add_api_route("/no-existe", no_existe)
    transporte = ASGITransport(app=aplicacion, raise_app_exceptions=False)
    async with AsyncClient(transport=transporte, base_url="http://pruebas") as cliente:
        respuesta = await cliente.get("/no-existe")

    assert respuesta.status_code == 404
    error = _error(respuesta.json())
    assert error["codigo"] == "RECURSO_NO_ENCONTRADO"
    assert error["mensaje"] == "Restaurante no encontrado"


async def test_excepcion_no_controlada_devuelve_500_sin_traza() -> None:
    aplicacion: FastAPI = create_app()

    async def explota() -> None:
        raise RuntimeError("detalle interno que jamás debe salir")

    aplicacion.add_api_route("/explota", explota)
    transporte = ASGITransport(app=aplicacion, raise_app_exceptions=False)
    async with AsyncClient(transport=transporte, base_url="http://pruebas") as cliente:
        respuesta = await cliente.get("/explota", headers={"X-Request-ID": "rid-500"})

    assert respuesta.status_code == 500
    error = _error(respuesta.json())
    assert error["codigo"] == "ERROR_INTERNO"
    assert error["request_id"] == "rid-500"
    assert respuesta.headers["X-Request-ID"] == "rid-500"
    cuerpo = respuesta.text
    for fuga in ("detalle interno", "RuntimeError", "Traceback", "File "):
        assert fuga not in cuerpo


async def test_request_id_entrante_se_respeta(cliente: AsyncClient) -> None:
    respuesta = await cliente.get("/api/v1/nada", headers={"X-Request-ID": "abc-123_XYZ"})
    assert respuesta.headers["X-Request-ID"] == "abc-123_XYZ"
    assert _error(respuesta.json())["request_id"] == "abc-123_XYZ"


async def test_request_id_se_genera_si_no_viene(cliente: AsyncClient) -> None:
    primera = await cliente.get("/health")
    segunda = await cliente.get("/health")
    assert primera.headers["X-Request-ID"]
    assert primera.headers["X-Request-ID"] != segunda.headers["X-Request-ID"]


@pytest.mark.parametrize("sucio", ["", "con espacios", "x" * 200, "salto\nde\nlinea", "con/barra"])
async def test_request_id_invalido_se_sustituye(cliente: AsyncClient, sucio: str) -> None:
    respuesta = await cliente.get("/health", headers={"X-Request-ID": sucio})
    devuelto = respuesta.headers["X-Request-ID"]
    assert devuelto and devuelto != sucio


async def test_cada_peticion_deja_una_linea_json(
    cliente: AsyncClient, caplog: pytest.LogCaptureFixture
) -> None:
    from app.core.registro import FormateadorJson

    with caplog.at_level("INFO", logger="carta.peticion"):
        await cliente.get("/api/v1/nada", headers={"X-Request-ID": "rid-log"})
    registros = [r for r in caplog.records if r.name == "carta.peticion"]
    assert len(registros) == 1
    linea = json.loads(FormateadorJson().format(registros[0]))
    assert linea["request_id"] == "rid-log"
    assert linea["ruta"] == "/api/v1/nada"
    assert linea["metodo"] == "GET"
    assert linea["estado"] == 404
    assert isinstance(linea["latencia_ms"], int | float) and linea["latencia_ms"] >= 0
