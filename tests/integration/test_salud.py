"""T-0.3: salud del proceso, disponibilidad de la base, envoltura de error y `request_id`.

Corre contra la aplicación real (`app.main.app`) con la fixture `cliente` de `tests/conftest.py`
(httpx en modo ASGI sobre la base de pruebas, transacción por prueba); `/ready` hace `SELECT 1`
en esa misma sesión.
Los caminos que no se pueden provocar desde fuera (base caída, `ErrorCarta`, excepción no
controlada) usan una aplicación nueva de `create_app()` con una ruta ad hoc o una sesión falsa.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from collections.abc import AsyncIterator
from typing import Any

import pytest
from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient
from pydantic import BaseModel, Field
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.errores import ErrorCarta
from app.core.peticion import MiddlewareRequestId
from app.core.registro import NOMBRE_MANEJADOR, FormateadorJson, request_id_actual
from app.db import get_db_session
from app.main import app, create_app

CLAVES_ERROR = {"codigo", "mensaje", "detalles", "request_id"}


def _cliente_de(aplicacion: FastAPI) -> AsyncClient:
    transporte = ASGITransport(app=aplicacion, raise_app_exceptions=False)
    return AsyncClient(transport=transporte, base_url="http://pruebas")


def _error(respuesta_json: dict[str, object]) -> dict[str, Any]:
    assert set(respuesta_json) == {"error"}, respuesta_json
    error = respuesta_json["error"]
    assert isinstance(error, dict)
    assert set(error) == CLAVES_ERROR
    assert isinstance(error["detalles"], dict)
    return error


def _linea(registro: logging.LogRecord) -> dict[str, Any]:
    linea: dict[str, Any] = json.loads(FormateadorJson().format(registro))
    return linea


class _SesionFalsa:
    """Sustituto de `AsyncSession` cuyo `execute` hace lo que la prueba necesite."""

    def __init__(self, al_ejecutar: Any) -> None:
        self._al_ejecutar = al_ejecutar

    async def execute(self, *_: Any, **__: Any) -> None:
        await self._al_ejecutar()


def _app_con_sesion(al_ejecutar: Any) -> FastAPI:
    aplicacion = create_app()

    async def sesion_falsa() -> AsyncIterator[_SesionFalsa]:
        yield _SesionFalsa(al_ejecutar)

    aplicacion.dependency_overrides[get_db_session] = sesion_falsa
    return aplicacion


# --- salud -------------------------------------------------------------------------------


async def test_health_responde_que_el_proceso_vive(cliente: AsyncClient) -> None:
    respuesta = await cliente.get("/health")
    assert respuesta.status_code == 200
    assert respuesta.json() == {"status": "ok"}


@pytest.mark.parametrize("ruta", ["/health", "/ready"])
async def test_salud_acepta_head(cliente: AsyncClient, ruta: str) -> None:
    respuesta = await cliente.head(ruta)
    assert respuesta.status_code == 200
    assert respuesta.content == b""


async def test_ready_comprueba_la_base(cliente: AsyncClient) -> None:
    respuesta = await cliente.get("/ready")
    assert respuesta.status_code == 200
    assert respuesta.json() == {"db": "ok"}


async def test_ready_con_la_base_caida_devuelve_503_sin_el_motivo(
    caplog: pytest.LogCaptureFixture,
) -> None:
    async def falla() -> None:
        raise OSError("connection to 127.0.0.1:5432 failed: password authentication failed")

    aplicacion = _app_con_sesion(falla)
    with caplog.at_level("ERROR", logger="carta.salud"):
        async with _cliente_de(aplicacion) as cliente:
            respuesta = await cliente.get("/ready")

    assert respuesta.status_code == 503
    error = _error(respuesta.json())
    assert error["codigo"] == "BASE_NO_DISPONIBLE"
    assert error["mensaje"] == "La base de datos no responde."
    assert error["detalles"] == {}
    assert error["request_id"] == respuesta.headers["X-Request-ID"]
    for fuga in ("5432", "password", "OSError", "127.0.0.1"):
        assert fuga not in respuesta.text
    registros = [r for r in caplog.records if r.name == "carta.salud"]
    assert len(registros) == 1
    assert registros[0].getMessage() == "la base de datos no responde: OSError"


async def test_ready_con_la_base_colgada_devuelve_503_pronto() -> None:
    async def se_cuelga() -> None:
        await asyncio.sleep(10)

    aplicacion = _app_con_sesion(se_cuelga)
    inicio = time.perf_counter()
    async with _cliente_de(aplicacion) as cliente:
        respuesta = await cliente.get("/ready")
    assert time.perf_counter() - inicio < 5
    assert respuesta.status_code == 503
    assert _error(respuesta.json())["codigo"] == "BASE_NO_DISPONIBLE"


# --- envoltura de error -------------------------------------------------------------------


async def test_ruta_inexistente_devuelve_404_con_la_envoltura(cliente: AsyncClient) -> None:
    respuesta = await cliente.get("/api/v1/nada")
    assert respuesta.status_code == 404
    error = _error(respuesta.json())
    assert error["codigo"] == "RECURSO_NO_ENCONTRADO"
    assert error["request_id"]
    assert error["request_id"] == respuesta.headers["X-Request-ID"]


async def test_metodo_no_permitido_lleva_la_envoltura_y_allow(cliente: AsyncClient) -> None:
    respuesta = await cliente.delete("/health")
    assert respuesta.status_code == 405
    assert _error(respuesta.json())["codigo"] == "METODO_NO_PERMITIDO"
    permitidos = {m.strip() for m in respuesta.headers["allow"].split(",")}
    assert permitidos == {"GET", "HEAD"}


async def test_http_exception_conserva_cabeceras_y_usa_nuestro_mensaje() -> None:
    aplicacion = create_app()

    async def sin_credencial() -> None:
        raise HTTPException(401, detail="Not authenticated", headers={"WWW-Authenticate": "Bearer"})

    aplicacion.add_api_route("/privado", sin_credencial)
    async with _cliente_de(aplicacion) as cliente:
        respuesta = await cliente.get("/privado")

    assert respuesta.status_code == 401
    assert respuesta.headers["www-authenticate"] == "Bearer"
    error = _error(respuesta.json())
    assert error["codigo"] == "SIN_CREDENCIAL"
    assert error["mensaje"] == "Necesitas identificarte para hacer esto."
    assert "Not authenticated" not in respuesta.text


async def test_http_exception_de_una_ruta_usa_la_envoltura() -> None:
    """El `detail` (inglés del framework o texto nuestro) va al log; el cuerpo lleva el nuestro."""
    aplicacion = create_app()

    async def no_existe() -> None:
        raise HTTPException(status_code=404, detail="Restaurante no encontrado")

    aplicacion.add_api_route("/no-existe", no_existe)
    async with _cliente_de(aplicacion) as cliente:
        respuesta = await cliente.get("/no-existe")

    assert respuesta.status_code == 404
    error = _error(respuesta.json())
    assert error["codigo"] == "RECURSO_NO_ENCONTRADO"
    assert error["mensaje"] == "No encontramos lo que buscas."


class _Credencial(BaseModel):
    pin: str = Field(min_length=20)


def _app_con_validacion() -> FastAPI:
    aplicacion = create_app()

    async def valida(credencial: _Credencial) -> dict[str, str]:
        return {"ok": "si"}

    aplicacion.add_api_route("/valida", valida, methods=["POST"])
    return aplicacion


@pytest.mark.parametrize(
    ("peticion", "campo", "tipo"),
    [
        ({"json": {}}, "body.pin", "missing"),
        ({"json": {"pin": 123}}, "body.pin", "string_type"),
        ({"json": {"pin": "pin-secreto-1234"}}, "body.pin", "string_too_short"),
        (
            {"content": b'{"pin": ', "headers": {"content-type": "application/json"}},
            "body",
            "json_invalid",
        ),
    ],
)
async def test_validacion_devuelve_422_payload_invalido(
    peticion: dict[str, Any], campo: str, tipo: str
) -> None:
    async with _cliente_de(_app_con_validacion()) as cliente:
        respuesta = await cliente.post("/valida", **peticion)

    assert respuesta.status_code == 422
    error = _error(respuesta.json())
    assert error["codigo"] == "PAYLOAD_INVALIDO"
    assert error["mensaje"] == "Revisa los datos enviados."
    errores = error["detalles"]["errores"]
    assert isinstance(errores, list) and errores
    assert any(e["campo"].startswith(campo) and e["tipo"] == tipo for e in errores), errores
    # Los detalles describen el campo y el problema, nunca repiten lo que mandó el cliente.
    assert all(set(e) == {"campo", "mensaje", "tipo"} for e in errores)
    assert "pin-secreto-1234" not in respuesta.text


async def test_error_carta_sale_con_la_envoltura() -> None:
    aplicacion = create_app()

    async def orden_vacia() -> None:
        raise ErrorCarta("ORDEN_VACIA", "Tu orden está vacía.", 409, {"orden": "o1"})

    aplicacion.add_api_route("/orden-vacia", orden_vacia)
    async with _cliente_de(aplicacion) as cliente:
        respuesta = await cliente.get("/orden-vacia", headers={"X-Request-ID": "rid-409"})

    assert respuesta.status_code == 409
    error = _error(respuesta.json())
    assert error["codigo"] == "ORDEN_VACIA"
    assert error["mensaje"] == "Tu orden está vacía."
    assert error["detalles"] == {"orden": "o1"}
    assert error["request_id"] == "rid-409" == respuesta.headers["X-Request-ID"]


async def test_error_carta_5xx_se_registra_y_no_publica_detalles(
    caplog: pytest.LogCaptureFixture,
) -> None:
    aplicacion = create_app()

    async def almacen_caido() -> None:
        raise ErrorCarta(
            "ALMACEN_NO_DISPONIBLE", "No pudimos guardar la foto.", 503, {"dsn": "s3://u:p@h/b"}
        )

    aplicacion.add_api_route("/almacen", almacen_caido)
    with caplog.at_level("ERROR", logger="carta.errores"):
        async with _cliente_de(aplicacion) as cliente:
            respuesta = await cliente.get("/almacen", headers={"X-Request-ID": "rid-503"})

    assert respuesta.status_code == 503
    error = _error(respuesta.json())
    assert error["codigo"] == "ALMACEN_NO_DISPONIBLE"
    assert error["mensaje"] == "No pudimos guardar la foto."
    assert error["detalles"] == {}
    assert "s3://" not in respuesta.text
    registros = [r for r in caplog.records if r.name == "carta.errores"]
    assert len(registros) == 1
    linea = _linea(registros[0])
    assert linea["codigo"] == "ALMACEN_NO_DISPONIBLE"
    assert linea["request_id"] == "rid-503"
    assert "s3://u:p@h/b" in linea["mensaje"]


async def test_excepcion_no_controlada_devuelve_500_sin_traza(
    caplog: pytest.LogCaptureFixture,
) -> None:
    aplicacion: FastAPI = create_app()

    async def explota() -> None:
        raise RuntimeError("detalle interno que jamás debe salir")

    aplicacion.add_api_route("/explota", explota)
    with caplog.at_level("INFO"):
        async with _cliente_de(aplicacion) as cliente:
            respuesta = await cliente.get("/explota", headers={"X-Request-ID": "rid-500"})

    assert respuesta.status_code == 500
    error = _error(respuesta.json())
    assert error["codigo"] == "ERROR_INTERNO"
    assert error["request_id"] == "rid-500"
    assert respuesta.headers["X-Request-ID"] == "rid-500"
    cuerpo = respuesta.text
    for fuga in ("detalle interno", "RuntimeError", "Traceback", "File "):
        assert fuga not in cuerpo

    # Exactamente una traza, la nuestra, con request_id; y la línea de acceso con 500.
    con_traza = [r for r in caplog.records if r.exc_info]
    assert len(con_traza) == 1
    assert con_traza[0].name == "carta.errores"
    linea = _linea(con_traza[0])
    assert "RuntimeError" in linea["excepcion"]
    assert linea["request_id"] == "rid-500"
    accesos = [r for r in caplog.records if r.name == "carta.peticion"]
    assert len(accesos) == 1
    assert _linea(accesos[0])["estado"] == 500


# --- request_id ---------------------------------------------------------------------------


async def test_request_id_entrante_se_respeta(cliente: AsyncClient) -> None:
    respuesta = await cliente.get("/api/v1/nada", headers={"X-Request-ID": "abc-123_XYZ"})
    assert respuesta.headers["X-Request-ID"] == "abc-123_XYZ"
    assert _error(respuesta.json())["request_id"] == "abc-123_XYZ"


async def test_request_id_se_genera_si_no_viene(cliente: AsyncClient) -> None:
    primera = await cliente.get("/health")
    segunda = await cliente.get("/health")
    assert primera.headers["X-Request-ID"]
    assert primera.headers["X-Request-ID"] != segunda.headers["X-Request-ID"]


@pytest.mark.parametrize(
    "sucio", ["", "con espacios", "x" * 200, "salto\nde\nlinea", "abc\n", "con/barra"]
)
async def test_request_id_invalido_se_sustituye(cliente: AsyncClient, sucio: str) -> None:
    respuesta = await cliente.get("/health", headers={"X-Request-ID": sucio})
    devuelto = respuesta.headers["X-Request-ID"]
    assert devuelto and devuelto != sucio


async def test_contextvar_se_reinicia_al_terminar(cliente: AsyncClient) -> None:
    await cliente.get("/health", headers={"X-Request-ID": "rid-a"})
    assert request_id_actual.get() is None


async def test_middleware_request_id_es_el_mas_externo() -> None:
    assert app.user_middleware[0].cls is MiddlewareRequestId


async def test_middleware_externo_que_lanza_conserva_el_request_id_del_cliente() -> None:
    class Rompe:
        def __init__(self, app: ASGIApp) -> None:
            self.app = app

        async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
            raise RuntimeError("middleware externo roto")

    aplicacion = create_app()
    aplicacion.add_middleware(Rompe)  # queda por fuera de MiddlewareRequestId
    async with _cliente_de(aplicacion) as cliente:
        respuesta = await cliente.get("/health", headers={"X-Request-ID": "rid-ext"})

    assert respuesta.status_code == 500
    error = _error(respuesta.json())
    assert error["codigo"] == "ERROR_INTERNO"
    assert error["request_id"] == "rid-ext"
    assert respuesta.headers["X-Request-ID"] == "rid-ext"
    assert "middleware externo roto" not in respuesta.text


async def test_cada_peticion_deja_una_linea_json(
    cliente: AsyncClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level("INFO", logger="carta.peticion"):
        await cliente.get("/api/v1/nada", headers={"X-Request-ID": "rid-log"})
    registros = [r for r in caplog.records if r.name == "carta.peticion"]
    assert len(registros) == 1
    linea = _linea(registros[0])
    assert linea["request_id"] == "rid-log"
    assert linea["ruta"] == "/api/v1/nada"
    assert linea["metodo"] == "GET"
    assert linea["estado"] == 404
    assert isinstance(linea["latencia_ms"], int | float) and linea["latencia_ms"] >= 0


# --- configuración de la aplicación -------------------------------------------------------


async def test_sin_cors(cliente: AsyncClient) -> None:
    respuesta = await cliente.get("/health", headers={"Origin": "https://otro.example"})
    assert "access-control-allow-origin" not in respuesta.headers
    assert not any(m.cls.__name__ == "CORSMiddleware" for m in app.user_middleware)


def test_create_app_configura_el_registro_una_sola_vez() -> None:
    create_app()
    create_app()
    raiz = logging.getLogger()
    manejadores = [h for h in raiz.handlers if h.get_name() == NOMBRE_MANEJADOR]
    assert len(manejadores) == 1
    assert isinstance(manejadores[0].formatter, FormateadorJson)
    assert logging.getLogger("uvicorn.access").disabled
