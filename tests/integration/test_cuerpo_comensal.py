"""T-2.1 (revisión, A3): las rutas del comensal acotan el cuerpo **antes** de leerlo.

FastAPI lee y valida el JSON antes de las dependencias: sin el tope un anónimo hacía leer
30 MB a `PATCH /p/miembro` antes del 401. Se llama a la app con un `scope` ASGI a mano y un
`receive` que cuenta cuántos trozos le pidieron (receta de `/pruebas` §3b')."""

from __future__ import annotations

import asyncio
import json
from typing import Any

import pytest
from httpx import AsyncClient

from app.api.publico import tope
from app.db.models import Mesa
from app.main import app
from tests.invitado_pruebas import P, entrar

JSON = {"content-type": "application/json"}


class Cuerpo:
    """`receive` ASGI que entrega `trozos` y cuenta cuántos le pidieron."""

    def __init__(self, trozos: list[bytes]) -> None:
        self.trozos = trozos
        self.pedidos = 0

    async def __call__(self) -> dict[str, Any]:
        self.pedidos += 1
        if self.pedidos <= len(self.trozos):
            mas = self.pedidos < len(self.trozos)
            return {"type": "http.request", "body": self.trozos[self.pedidos - 1], "more_body": mas}
        await asyncio.sleep(0)
        return {"type": "http.disconnect"}


class CuerpoQueSeCalla(Cuerpo):
    """Manda un trozo y después nada (un 4G que se cae)."""

    async def __call__(self) -> dict[str, Any]:
        self.pedidos += 1
        if self.pedidos == 1:
            return {"type": "http.request", "body": b'{"codigo_mesa":', "more_body": True}
        await asyncio.Event().wait()
        raise AssertionError("inalcanzable")


async def _crudo(
    metodo: str, ruta: str, cabeceras: dict[str, str], cuerpo: Cuerpo
) -> tuple[int, dict[str, Any]]:
    capturado: dict[str, Any] = {"cuerpo": b""}

    async def send(mensaje: dict[str, Any]) -> None:
        if mensaje["type"] == "http.response.start":
            capturado["estado"] = mensaje["status"]
        else:
            capturado["cuerpo"] += mensaje.get("body", b"")

    scope = {
        "type": "http",
        "asgi": {"version": "3.0", "spec_version": "2.4"},
        "http_version": "1.1",
        "method": metodo,
        "scheme": "http",
        "path": ruta,
        "raw_path": ruta.encode(),
        "query_string": b"",
        "root_path": "",
        "headers": [(b"host", b"pruebas")]
        + [(k.lower().encode(), v.encode()) for k, v in cabeceras.items()],
        "client": ("127.0.0.1", 1234),
        "server": ("pruebas", 80),
    }
    await app(scope, cuerpo, send)
    return capturado["estado"], json.loads(capturado["cuerpo"] or b"{}")


def test_el_tope_es_de_16_kib_y_10_segundos() -> None:
    assert tope.MAX_CUERPO_COMENSAL == 16384
    assert tope.PLAZO_CUERPO_COMENSAL_SEGUNDOS == 10.0


RUTAS = [("POST", f"{P}/sesion/entrar"), ("PATCH", f"{P}/miembro"), ("POST", f"{P}/eventos")]


@pytest.mark.ac("AC-01.2")
@pytest.mark.parametrize(("metodo", "ruta"), RUTAS)
async def test_content_length_de_mas_es_413_sin_leer(
    cliente: AsyncClient, metodo: str, ruta: str
) -> None:
    """Sin cookie y con 30 MB declarados: 413 y ni un trozo leído (antes del 401)."""
    cuerpo = Cuerpo([b"x" * 1024])
    estado, respuesta = await _crudo(
        metodo, ruta, {**JSON, "content-length": str(30 * 1024 * 1024)}, cuerpo
    )
    assert estado == 413
    assert respuesta["error"]["codigo"] == "ARCHIVO_EXCEDE_LIMITE"
    assert respuesta["error"]["mensaje"] == "El cuerpo pasa de 16 KB."
    assert cuerpo.pedidos == 0


@pytest.mark.parametrize(("metodo", "ruta"), RUTAS)
async def test_chunked_que_pasa_el_tope_es_413_al_pasarlo(
    cliente: AsyncClient, metodo: str, ruta: str
) -> None:
    cuerpo = Cuerpo([b"x" * 8192] * 100)  # 800 KB sin Content-Length
    estado, respuesta = await _crudo(metodo, ruta, JSON, cuerpo)
    assert estado == 413
    assert respuesta["error"]["codigo"] == "ARCHIVO_EXCEDE_LIMITE"
    assert cuerpo.pedidos == 3  # 8 KB, 16 KB y el que pasa; nunca los 100


async def test_un_cuerpo_que_no_termina_es_408(
    cliente: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(tope, "PLAZO_CUERPO_COMENSAL_SEGUNDOS", 0.2)
    estado, respuesta = await _crudo("POST", f"{P}/sesion/entrar", JSON, CuerpoQueSeCalla([]))
    assert estado == 408
    assert respuesta["error"]["codigo"] == "SUBIDA_INCOMPLETA"


async def test_un_content_length_invalido_es_400(cliente: AsyncClient) -> None:
    cuerpo = Cuerpo([b"{}"])
    estado, _ = await _crudo("POST", f"{P}/sesion/entrar", {**JSON, "content-length": "-1"}, cuerpo)
    assert estado == 400
    assert cuerpo.pedidos == 0


@pytest.mark.ac("AC-01.2")
async def test_dentro_del_tope_entrar_sigue_funcionando(cliente: AsyncClient, mesa: Mesa) -> None:
    """Contraprueba: el tope no rompe la ruta ni el cuerpo que llega a Pydantic."""
    respuesta, token = await entrar(cliente, mesa.codigo_publico)
    assert respuesta.status_code == 200
    assert token is not None
    justo = {"codigo_mesa": "a" * 200, "x": "y" * (tope.MAX_CUERPO_COMENSAL - 260)}
    casi = await cliente.post(f"{P}/sesion/entrar", json=justo)
    assert casi.status_code == 422  # leído entero y validado (campo extra), no 413


def test_el_contrato_declara_400_408_y_413() -> None:
    documento = app.openapi()
    for metodo, ruta in RUTAS:
        respuestas = documento["paths"][ruta][metodo.lower()]["responses"]
        assert {"400", "408", "413"} <= set(respuestas), ruta
