"""T-0.3: el formateador JSON no pierde líneas y el filtro quita la traza duplicada de uvicorn."""

from __future__ import annotations

import json
import logging

from app.core.registro import FiltroTrazaDuplicada, FormateadorJson, request_id_actual


def _registro(mensaje: str = "hola", **extra: object) -> logging.LogRecord:
    registro = logging.LogRecord("carta.prueba", logging.INFO, "x.py", 1, mensaje, (), None)
    for clave, valor in extra.items():
        setattr(registro, clave, valor)
    return registro


def test_linea_json_con_campos_extra_y_sin_ascii_forzado() -> None:
    linea = json.loads(
        FormateadorJson().format(_registro("petición ñ", metodo="GET", ruta="/x", estado=200))
    )
    assert linea["mensaje"] == "petición ñ"
    assert linea["nivel"] == "INFO" and linea["logger"] == "carta.prueba"
    assert (linea["metodo"], linea["ruta"], linea["estado"]) == ("GET", "/x", 200)
    assert linea["request_id"] is None
    assert "\\u00f1" not in FormateadorJson().format(_registro("ñ"))


def test_request_id_sale_de_la_variable_de_contexto() -> None:
    token = request_id_actual.set("rid-ctx")
    try:
        assert json.loads(FormateadorJson().format(_registro()))["request_id"] == "rid-ctx"
    finally:
        request_id_actual.reset(token)


def test_exc_info_va_en_excepcion() -> None:
    try:
        raise ValueError("detalle")
    except ValueError:
        registro = _registro("falló")
        registro.exc_info = __import__("sys").exc_info()
    linea = json.loads(FormateadorJson().format(registro))
    assert "ValueError: detalle" in linea["excepcion"]
    assert "Traceback" in linea["excepcion"]


class _Rebelde:
    def __str__(self) -> str:
        raise RuntimeError("no me serialices")


def test_valor_no_serializable_no_tira_la_linea() -> None:
    linea = json.loads(FormateadorJson().format(_registro(objeto=_Rebelde())))
    assert linea["objeto"].startswith("<class")


def test_estructura_circular_deja_una_linea_minima() -> None:
    circular: dict[str, object] = {}
    circular["yo"] = circular
    linea = json.loads(FormateadorJson().format(_registro("evento", ciclo=circular)))
    assert linea["mensaje"] == "evento"
    assert "error_formato" in linea
    assert "ciclo" not in linea


def test_filtro_descarta_la_traza_de_uvicorn_y_deja_el_resto() -> None:
    filtro = FiltroTrazaDuplicada()
    assert not filtro.filter(_registro("Exception in ASGI application"))
    assert filtro.filter(_registro("Application startup complete."))
