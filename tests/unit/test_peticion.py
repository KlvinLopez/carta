"""T-0.3: saneado del `X-Request-ID` entrante."""

from __future__ import annotations

import pytest

from app.core.peticion import LONGITUD_MAXIMA, generar_request_id, request_id_valido


@pytest.mark.parametrize(
    ("valor", "esperado"),
    [
        ("abc-123_XYZ.9", "abc-123_XYZ.9"),
        ("a" * LONGITUD_MAXIMA, "a" * LONGITUD_MAXIMA),
        ("a" * (LONGITUD_MAXIMA + 1), None),
        ("abc\n", None),
        ("", None),
        (None, None),
        ("con espacio", None),
        ("ñ", None),
    ],
)
def test_request_id_valido(valor: str | None, esperado: str | None) -> None:
    assert request_id_valido(valor) == esperado


def test_request_id_generado_es_valido_y_unico() -> None:
    uno, dos = generar_request_id(), generar_request_id()
    assert request_id_valido(uno) == uno
    assert uno != dos
