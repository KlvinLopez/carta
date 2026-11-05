"""T-0.3: `ErrorCarta` y la envoltura de error única de `docs/mvp/04_API_Spec.md` §1.2."""

from __future__ import annotations

import pytest

from app.core.errores import ErrorCarta, codigo_por_http, envoltura, mensaje_por_http

CLAVES = {"codigo", "mensaje", "detalles", "request_id"}


def test_error_carta_guarda_codigo_mensaje_y_http() -> None:
    error = ErrorCarta("MESA_NO_ENCONTRADA", "No encontramos esta mesa.", 404)
    assert error.codigo == "MESA_NO_ENCONTRADA"
    assert error.mensaje == "No encontramos esta mesa."
    assert error.http == 404
    assert error.detalles == {}
    assert str(error) == "No encontramos esta mesa."


def test_error_carta_produce_la_envoltura_unica() -> None:
    error = ErrorCarta("SESION_YA_ENVIADA", "La orden ya se envió.", 409, {"sesion": "abc"})
    cuerpo = error.envoltura("01J8XW3Q4T5R6Y7Z")
    assert set(cuerpo) == {"error"}
    assert set(cuerpo["error"]) == CLAVES
    assert cuerpo["error"] == {
        "codigo": "SESION_YA_ENVIADA",
        "mensaje": "La orden ya se envió.",
        "detalles": {"sesion": "abc"},
        "request_id": "01J8XW3Q4T5R6Y7Z",
    }


def test_envoltura_sin_detalles_lleva_diccionario_vacio_y_request_id_nulo() -> None:
    cuerpo = envoltura("ERROR_INTERNO", "Algo salió mal.")
    assert cuerpo["error"]["detalles"] == {}
    assert cuerpo["error"]["request_id"] is None


def test_envoltura_copia_los_detalles() -> None:
    detalles = {"campo": "x"}
    cuerpo = envoltura("PAYLOAD_INVALIDO", "Revisa los datos.", detalles, "rid")
    detalles["campo"] = "cambiado"
    assert cuerpo["error"]["detalles"] == {"campo": "x"}


@pytest.mark.parametrize(
    ("http", "codigo"),
    [
        (404, "RECURSO_NO_ENCONTRADO"),
        (405, "METODO_NO_PERMITIDO"),
        (422, "PAYLOAD_INVALIDO"),
        (429, "DEMASIADAS_PETICIONES"),
        (500, "ERROR_INTERNO"),
        (503, "ERROR_INTERNO"),
        (418, "ERROR_HTTP"),
    ],
)
def test_codigo_por_http(http: int, codigo: str) -> None:
    assert codigo_por_http(http) == codigo


@pytest.mark.parametrize(
    ("http", "mensaje"),
    [
        (404, "No encontramos lo que buscas."),
        (500, "Algo salió mal de nuestro lado. Inténtalo de nuevo en un momento."),
        (503, "Algo salió mal de nuestro lado. Inténtalo de nuevo en un momento."),
        (418, "No pudimos completar la petición."),
    ],
)
def test_mensaje_por_http(http: int, mensaje: str) -> None:
    assert mensaje_por_http(http) == mensaje
