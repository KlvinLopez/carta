"""T-0.6: construcción de las cabeceras de seguridad a partir de `Settings`.

Los valores van como literales (los del brief y de 02 §12), no como las constantes del módulo:
una constante cambiada a `max-age=60` pasaría una prueba que la importa.
"""

from __future__ import annotations

from typing import Any

import pytest

from app.core.cabeceras import (
    CSP_SIN_IMAGENES_EXTERNAS,
    HSTS,
    MiddlewareCabecerasSeguridad,
    cabeceras_seguridad,
    origen_imagenes,
    politica_csp,
)
from app.core.config import Settings

# La política exacta de 02 §12 (sin el origen de R2).
CSP_02_12 = (
    "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; "
    "img-src 'self'; manifest-src 'self'; connect-src 'self'; "
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
)
HSTS_02_12 = "max-age=31536000; includeSubDomains"


def _ajustes(**valores: object) -> Settings:
    base: dict[str, object] = {"ENTORNO": "pruebas", "SECRET_KEY": "x" * 43}
    base.update(valores)
    return Settings(_env_file=None, **base)  # type: ignore[arg-type]


def test_la_csp_es_la_de_02_12_sin_nonces() -> None:
    assert CSP_SIN_IMAGENES_EXTERNAS == CSP_02_12
    assert "unsafe-inline" not in CSP_SIN_IMAGENES_EXTERNAS
    assert "nonce" not in CSP_SIN_IMAGENES_EXTERNAS


def test_la_csp_lleva_las_directivas_que_default_src_no_cubre() -> None:
    directivas = {
        d.split(" ", 1)[0]: d.split(" ", 1)[1] for d in CSP_SIN_IMAGENES_EXTERNAS.split("; ")
    }
    assert directivas["frame-ancestors"] == "'none'"
    assert directivas["base-uri"] == "'self'"
    assert directivas["form-action"] == "'self'"


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


def test_valores_literales_del_brief_y_de_02_12() -> None:
    cabeceras = cabeceras_seguridad(_ajustes(ENTORNO="produccion"))
    assert cabeceras == {
        "Content-Security-Policy": CSP_02_12,
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        "Strict-Transport-Security": HSTS_02_12,
    }


@pytest.mark.parametrize("entorno", ["desarrollo", "pruebas"])
def test_sin_hsts_donde_se_corre_por_http(entorno: str) -> None:
    cabeceras = cabeceras_seguridad(_ajustes(ENTORNO=entorno))
    assert "Strict-Transport-Security" not in cabeceras
    assert set(cabeceras) == {
        "Content-Security-Policy",
        "X-Frame-Options",
        "X-Content-Type-Options",
        "Referrer-Policy",
        "Permissions-Policy",
    }


@pytest.mark.parametrize("entorno", ["staging", "produccion"])
def test_hsts_un_anio_con_subdominios_fuera_de_desarrollo(entorno: str) -> None:
    cabeceras = cabeceras_seguridad(_ajustes(ENTORNO=entorno))
    assert cabeceras["Strict-Transport-Security"] == HSTS_02_12
    assert HSTS == HSTS_02_12
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


# ---------------------------------------------------------------------------
# T-1.2 · La CSP se abre a Firebase Auth desde `Settings` (02 §12), cerrada por defecto
# ---------------------------------------------------------------------------

# Los valores de staging documentados en 04 §11 (fila T-1.2) y en `.env.example`.
FIREBASE_STAGING = {
    "FIREBASE_CSP_CONNECT_SRC": (
        "https://identitytoolkit.googleapis.com https://securetoken.googleapis.com"
    ),
    "FIREBASE_CSP_SCRIPT_SRC": "https://apis.google.com",
    "FIREBASE_CSP_FRAME_SRC": "https://carta-staging.firebaseapp.com",
}
CSP_STAGING_CON_FIREBASE = (
    "default-src 'self'; script-src 'self' https://apis.google.com; style-src 'self'; "
    "font-src 'self'; img-src 'self'; manifest-src 'self'; "
    "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com; "
    "frame-src 'self' https://carta-staging.firebaseapp.com; "
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
)


def test_sin_firebase_en_settings_la_csp_es_la_de_02_12() -> None:
    for entorno in ("pruebas", "staging", "produccion"):
        cabeceras = cabeceras_seguridad(_ajustes(ENTORNO=entorno))
        assert cabeceras["Content-Security-Policy"] == CSP_02_12
        assert "frame-src" not in cabeceras["Content-Security-Policy"]


def test_la_csp_de_staging_abre_solo_los_origenes_de_firebase() -> None:
    cabeceras = cabeceras_seguridad(_ajustes(ENTORNO="staging", **FIREBASE_STAGING))
    assert cabeceras["Content-Security-Policy"] == CSP_STAGING_CON_FIREBASE
    assert "unsafe-inline" not in cabeceras["Content-Security-Policy"]


def test_firebase_y_r2_conviven_en_la_csp() -> None:
    csp = cabeceras_seguridad(_ajustes(R2_URL_PUBLICA="https://img.carta.mx", **FIREBASE_STAGING))[
        "Content-Security-Policy"
    ]
    assert csp == CSP_STAGING_CON_FIREBASE.replace(
        "img-src 'self'", "img-src 'self' https://img.carta.mx"
    )


def test_las_listas_aceptan_comas_y_quitan_repetidos() -> None:
    csp = cabeceras_seguridad(
        _ajustes(
            FIREBASE_CSP_CONNECT_SRC=(
                " https://identitytoolkit.googleapis.com/,https://securetoken.googleapis.com ,"
                "https://IDENTITYTOOLKIT.googleapis.com"
            )
        )
    )["Content-Security-Policy"]
    assert (
        "connect-src 'self' https://identitytoolkit.googleapis.com "
        "https://securetoken.googleapis.com;" in csp
    )


@pytest.mark.parametrize(
    "entrada",
    [
        "http://identitytoolkit.googleapis.com",  # sin TLS
        "https://*.googleapis.com",  # comodín
        "*",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "data:",
        "https://securetoken.googleapis.com/v1/token",  # con ruta
        "https://usuario:clave@apis.google.com",
        "https://apis.google.com?x=1",
        "https://apis.google.com;script-src",
        "apis.google.com",  # sin esquema
    ],
)
def test_una_entrada_que_no_es_un_origen_https_limpio_no_abre_la_csp(entrada: str) -> None:
    csp = cabeceras_seguridad(
        _ajustes(
            FIREBASE_CSP_CONNECT_SRC=entrada,
            FIREBASE_CSP_SCRIPT_SRC=entrada,
            FIREBASE_CSP_FRAME_SRC=entrada,
        )
    )["Content-Security-Policy"]
    assert csp == CSP_02_12


def test_una_entrada_mala_no_tira_las_buenas() -> None:
    csp = cabeceras_seguridad(
        _ajustes(FIREBASE_CSP_SCRIPT_SRC="https://*.google.com https://apis.google.com")
    )["Content-Security-Policy"]
    assert "script-src 'self' https://apis.google.com;" in csp


# ---------------------------------------------------------------------------
# Revisión de T-1.2 (B4) · Respuestas autenticadas: `private, no-store`
# ---------------------------------------------------------------------------


async def _respuesta(ruta: str, cabeceras_app: list[tuple[bytes, bytes]]) -> dict[str, str]:
    async def app(scope: Any, receive: Any, send: Any) -> None:
        await send({"type": "http.response.start", "status": 200, "headers": cabeceras_app})
        await send({"type": "http.response.body", "body": b"{}"})

    middleware = MiddlewareCabecerasSeguridad(app, cabeceras={"X-Content-Type-Options": "nosniff"})
    enviados: list[dict[str, Any]] = []

    async def send(mensaje: dict[str, Any]) -> None:
        enviados.append(mensaje)

    async def receive() -> dict[str, Any]:
        return {"type": "http.request", "body": b""}

    await middleware({"type": "http", "path": ruta}, receive, send)
    return {k.decode().lower(): v.decode() for k, v in enviados[0]["headers"]}


@pytest.mark.parametrize(
    "ruta",
    ["/api/v1/admin", "/api/v1/admin/restaurantes", "/api/v1/op/mesas", "/api/v1/op"],
)
async def test_las_rutas_autenticadas_salen_privadas_y_sin_cache(ruta: str) -> None:
    assert (await _respuesta(ruta, []))["cache-control"] == "private, no-store"


@pytest.mark.parametrize(
    "ruta", ["/health", "/api/v1/p/menu/la-querencia", "/assets/app.js", "/api/v1/administrador"]
)
async def test_las_demas_rutas_no_cambian_su_cache(ruta: str) -> None:
    assert "cache-control" not in await _respuesta(ruta, [])


async def test_una_ruta_privada_que_pone_su_cache_la_conserva() -> None:
    cabeceras = await _respuesta("/api/v1/admin/x", [(b"cache-control", b"no-store")])
    assert cabeceras["cache-control"] == "no-store"
