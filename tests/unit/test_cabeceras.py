"""T-0.6: construcción de las cabeceras de seguridad a partir de `Settings`."""

from __future__ import annotations

import pytest

from app.core.cabeceras import (
    CSP_SIN_IMAGENES_EXTERNAS,
    HSTS,
    cabeceras_seguridad,
    origen_imagenes,
    politica_csp,
)
from app.core.config import Settings

CSP_02_12 = (
    "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; "
    "img-src 'self'; manifest-src 'self'; connect-src 'self'"
)


def _ajustes(**valores: object) -> Settings:
    base: dict[str, object] = {"ENTORNO": "pruebas", "SECRET_KEY": "x" * 43}
    base.update(valores)
    return Settings(_env_file=None, **base)  # type: ignore[arg-type]


def test_la_csp_es_la_de_02_12_sin_nonces() -> None:
    assert CSP_SIN_IMAGENES_EXTERNAS == CSP_02_12
    assert "unsafe-inline" not in CSP_SIN_IMAGENES_EXTERNAS
    assert "nonce" not in CSP_SIN_IMAGENES_EXTERNAS


@pytest.mark.parametrize(
    ("url", "origen"),
    [
        (None, None),
        ("", None),
        ("   ", None),
        ("https://img.carta.mx", "https://img.carta.mx"),
        ("https://img.carta.mx/", "https://img.carta.mx"),
        ("https://img.carta.mx/fotos/platillos/", "https://img.carta.mx"),
        ("https://pub-0123abcd.r2.dev", "https://pub-0123abcd.r2.dev"),
        ("http://localhost:9000/carta-publico", "http://localhost:9000"),
        ("HTTPS://IMG.Carta.MX", "https://img.carta.mx"),
        # Lo que no es un origen limpio no entra en una cabecera.
        ("img.carta.mx", None),
        ("ftp://img.carta.mx", None),
        ("https://img.carta.mx; script-src *", None),
        ("https://img.carta.mx https://otro", None),
        ("https://usuario:clave@img.carta.mx", None),
        ("https://img.carta\n.mx", "https://img.carta.mx"),  # urlsplit quita \n, \r y \t
        ("https://img.carta.mx\n", "https://img.carta.mx"),
    ],
)
def test_origen_de_imagenes_desde_r2_url_publica(url: str | None, origen: str | None) -> None:
    assert origen_imagenes(url) == origen


def test_politica_csp_con_y_sin_origen_de_imagenes() -> None:
    assert politica_csp(None) == CSP_02_12
    assert politica_csp("https://img.carta.mx") == CSP_02_12.replace(
        "img-src 'self'", "img-src 'self' https://img.carta.mx"
    )


@pytest.mark.parametrize("entorno", ["desarrollo", "pruebas"])
def test_sin_hsts_donde_se_corre_por_http(entorno: str) -> None:
    cabeceras = cabeceras_seguridad(_ajustes(ENTORNO=entorno))
    assert "Strict-Transport-Security" not in cabeceras
    assert set(cabeceras) == {
        "Content-Security-Policy",
        "X-Content-Type-Options",
        "Referrer-Policy",
        "Permissions-Policy",
    }


@pytest.mark.parametrize("entorno", ["staging", "produccion"])
def test_hsts_un_anio_con_subdominios_fuera_de_desarrollo(entorno: str) -> None:
    cabeceras = cabeceras_seguridad(_ajustes(ENTORNO=entorno))
    assert cabeceras["Strict-Transport-Security"] == HSTS == "max-age=31536000; includeSubDomains"
    assert "preload" not in HSTS


def test_permissions_policy_sin_camara_microfono_ni_ubicacion() -> None:
    politica = cabeceras_seguridad(_ajustes())["Permissions-Policy"]
    for permiso in ("camera", "microphone", "geolocation"):
        assert f"{permiso}=()" in politica


def test_las_cabeceras_son_ascii_y_sin_saltos_de_linea() -> None:
    for nombre, valor in cabeceras_seguridad(_ajustes(R2_URL_PUBLICA="https://img.x.mx")).items():
        nombre.encode("ascii")
        valor.encode("ascii")
        assert "\n" not in valor and "\r" not in valor
