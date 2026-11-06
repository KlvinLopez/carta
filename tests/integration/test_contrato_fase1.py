"""T-1.1: `/openapi.json` publica el contrato completo de la Fase 1 desde el primer día.

Contrato primero (04 §2): el frontend (carril C) genera sus tipos con
`npm --prefix frontend run tipos` y trabaja contra estos esquemas mientras T-1.2 a T-1.9
ponen las rutas reales. Las rutas están en 02_Arquitectura_v1 §5.3.
"""

from __future__ import annotations

from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.db.models import Restaurante
from app.main import app

A = "/api/v1/admin"

# (método, ruta, esquema de la respuesta 2xx o None si no tiene cuerpo JSON)
CONTRATO_FASE_1 = [
    # T-1.2 · restaurantes (US-15)
    ("get", "/restaurantes", "RestauranteRespuesta[]"),
    ("post", "/restaurantes", "RestauranteRespuesta"),
    ("get", "/restaurantes/{rid}", "RestauranteRespuesta"),
    ("patch", "/restaurantes/{rid}", "RestauranteRespuesta"),
    # T-1.3 · categorías y platillos (US-16)
    ("get", "/restaurantes/{rid}/categorias", "CategoriaRespuesta[]"),
    ("post", "/restaurantes/{rid}/categorias", "CategoriaRespuesta"),
    ("post", "/restaurantes/{rid}/categorias/reordenar", "CategoriaRespuesta[]"),
    ("patch", "/categorias/{categoria_id}", "CategoriaRespuesta"),
    ("delete", "/categorias/{categoria_id}", None),
    ("get", "/restaurantes/{rid}/platillos", "PlatilloRespuesta[]"),
    ("post", "/restaurantes/{rid}/platillos", "PlatilloRespuesta"),
    ("post", "/restaurantes/{rid}/platillos/reordenar", "PlatilloRespuesta[]"),
    ("patch", "/platillos/{platillo_id}", "PlatilloRespuesta"),
    ("delete", "/platillos/{platillo_id}", None),
    # T-1.4 · fotos (US-17)
    ("post", "/platillos/{platillo_id}/foto", "PlatilloRespuesta"),
    ("delete", "/platillos/{platillo_id}/foto", "PlatilloRespuesta"),
    # T-1.5 · mesas y QR (US-21)
    ("get", "/restaurantes/{rid}/mesas", "MesaRespuesta[]"),
    ("post", "/restaurantes/{rid}/mesas", "MesaRespuesta[]"),
    ("post", "/mesas/{mesa_id}/regenerar", "MesaRespuesta"),
    ("get", "/restaurantes/{rid}/mesas/qr.pdf", None),
    # T-1.6 · personal y PIN (US-26)
    ("get", "/restaurantes/{rid}/personal", "PersonalRespuesta[]"),
    ("post", "/restaurantes/{rid}/personal", "PersonalRespuesta"),
    ("patch", "/personal/{personal_id}", "PersonalRespuesta"),
    ("post", "/personal/{personal_id}/pin", None),
    # T-1.9 · importación (US-25)
    ("post", "/restaurantes/{rid}/importaciones", "ImportacionRespuesta"),
    ("get", "/restaurantes/{rid}/importaciones/{importacion_id}", "ImportacionRespuesta"),
    (
        "post",
        "/restaurantes/{rid}/importaciones/{importacion_id}/confirmar",
        "ImportacionRespuesta",
    ),
    (
        "post",
        "/restaurantes/{rid}/importaciones/{importacion_id}/reintentar",
        "ImportacionRespuesta",
    ),
]

# Campos que una respuesta jamás publica.
PROHIBIDOS = {
    "PersonalRespuesta": {"pin", "pin_hash", "intentos_fallidos", "bloqueado_hasta"},  # INV-7
    "ImportacionRespuesta": {"archivo_url", "tokens_entrada", "tokens_salida", "modelo"},
    "RestauranteRespuesta": {"plan", "horarios"},
}

UUID_X = "00000000-0000-4000-8000-0000000000aa"


@pytest.fixture(scope="module")
async def openapi() -> dict[str, Any]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://pruebas") as c:
        respuesta = await c.get("/openapi.json")
    assert respuesta.status_code == 200
    documento: dict[str, Any] = respuesta.json()
    return documento


def _esquema_2xx(operacion: dict[str, Any]) -> str | None:
    for codigo, respuesta in operacion["responses"].items():
        if not codigo.startswith("2"):
            continue
        contenido = respuesta.get("content", {}).get("application/json")
        if not contenido or not contenido.get("schema"):
            return None
        esquema = contenido["schema"]
        if esquema.get("type") == "array":
            return esquema["items"]["$ref"].rsplit("/", 1)[-1] + "[]"
        return str(esquema["$ref"].rsplit("/", 1)[-1])
    return None


@pytest.mark.parametrize(
    ("metodo", "ruta", "esquema"),
    CONTRATO_FASE_1,
    ids=[f"{m.upper()} {r}" for m, r, _ in CONTRATO_FASE_1],
)
def test_cada_ruta_de_la_fase_1_esta_en_el_contrato(
    openapi: dict[str, Any], metodo: str, ruta: str, esquema: str | None
) -> None:
    rutas = openapi["paths"]
    assert A + ruta in rutas, ruta
    assert metodo in rutas[A + ruta], (metodo, ruta)
    assert _esquema_2xx(rutas[A + ruta][metodo]) == esquema


def test_el_verificar_de_t11_encuentra_las_importaciones(openapi: dict[str, Any]) -> None:
    assert "/api/v1/admin/restaurantes/{rid}/importaciones" in openapi["paths"]


@pytest.mark.parametrize("esquema", list(PROHIBIDOS))
def test_las_respuestas_no_publican_campos_internos(openapi: dict[str, Any], esquema: str) -> None:
    propiedades = set(openapi["components"]["schemas"][esquema]["properties"])
    assert not propiedades & PROHIBIDOS[esquema]


def test_las_subidas_son_multipart(openapi: dict[str, Any]) -> None:
    for ruta in ("/restaurantes/{rid}/importaciones", "/platillos/{platillo_id}/foto"):
        cuerpo = openapi["paths"][A + ruta]["post"]["requestBody"]["content"]
        assert list(cuerpo) == ["multipart/form-data"], ruta


def test_el_pdf_de_qr_se_declara_como_pdf(openapi: dict[str, Any]) -> None:
    respuesta = openapi["paths"][A + "/restaurantes/{rid}/mesas/qr.pdf"]["get"]["responses"]
    assert "application/pdf" in respuesta["200"]["content"]


def test_el_precio_sale_como_numero(openapi: dict[str, Any]) -> None:
    precio = openapi["components"]["schemas"]["PlatilloRespuesta"]["properties"]["precio"]
    assert precio["type"] == "number"


# ---------------------------------------------------------------------------
# Las rutas de ejemplo responden con su esquema
# ---------------------------------------------------------------------------

PDF = ("menu.pdf", b"%PDF-1.4\n%%EOF\n", "application/pdf")
CONFIRMACION = {
    "moneda": "MXN",
    "categorias": [
        {
            "nombre": "Entradas",
            "orden": 1,
            "platillos": [
                {"nombre": "Sopa", "precio": 90, "precio_confianza": "alta", "pagina": 1}
            ],
        }
    ],
}
EJEMPLOS: list[tuple[str, str, int, dict[str, Any]]] = [
    ("get", f"/restaurantes/{UUID_X}/categorias", 200, {}),
    ("post", f"/restaurantes/{UUID_X}/categorias", 201, {"json": {"nombre": "Postres"}}),
    ("post", f"/restaurantes/{UUID_X}/categorias/reordenar", 200, {"json": {"ids": [UUID_X]}}),
    ("patch", f"/categorias/{UUID_X}", 200, {"json": {"activa": False}}),
    ("delete", f"/categorias/{UUID_X}", 204, {}),
    ("post", f"/restaurantes/{UUID_X}/platillos/reordenar", 200, {"json": {"ids": [UUID_X]}}),
    ("post", f"/platillos/{UUID_X}/foto", 200, {"files": {"archivo": PDF}}),
    ("delete", f"/platillos/{UUID_X}/foto", 200, {}),
    ("get", f"/restaurantes/{UUID_X}/mesas", 200, {}),
    ("post", f"/restaurantes/{UUID_X}/mesas", 201, {"json": {"cantidad": 3}}),
    ("post", f"/mesas/{UUID_X}/regenerar", 200, {}),
    ("get", f"/restaurantes/{UUID_X}/mesas/qr.pdf", 200, {}),
    ("get", f"/restaurantes/{UUID_X}/personal", 200, {}),
    (
        "post",
        f"/restaurantes/{UUID_X}/personal",
        201,
        {"json": {"nombre": "Eva", "rol": "capitan", "pin": "123456"}},
    ),
    ("patch", f"/personal/{UUID_X}", 200, {"json": {"activo": False}}),
    ("post", f"/personal/{UUID_X}/pin", 204, {"json": {"pin": "4321"}}),
    ("post", f"/restaurantes/{UUID_X}/importaciones", 202, {"files": {"archivo": PDF}}),
    ("get", f"/restaurantes/{UUID_X}/importaciones/{UUID_X}", 200, {}),
    (
        "post",
        f"/restaurantes/{UUID_X}/importaciones/{UUID_X}/confirmar",
        200,
        {"json": CONFIRMACION},
    ),
    ("post", f"/restaurantes/{UUID_X}/importaciones/{UUID_X}/reintentar", 202, {}),
]


def _claves(valor: Any) -> set[str]:
    """Todas las claves de un JSON, a cualquier profundidad."""
    if isinstance(valor, dict):
        return set(valor) | {c for v in valor.values() for c in _claves(v)}
    if isinstance(valor, list):
        return {c for v in valor for c in _claves(v)}
    return set()


@pytest.mark.parametrize(
    ("metodo", "ruta", "estado", "cuerpo"),
    EJEMPLOS,
    ids=[f"{m.upper()} {r.replace(UUID_X, 'x')}" for m, r, _, _ in EJEMPLOS],
)
async def test_las_rutas_de_ejemplo_responden(
    cliente: AsyncClient, metodo: str, ruta: str, estado: int, cuerpo: dict[str, Any]
) -> None:
    respuesta = await cliente.request(metodo.upper(), A + ruta, **cuerpo)
    assert respuesta.status_code == estado, respuesta.text
    if estado == 204:
        assert respuesta.content == b""
    elif ruta.endswith("qr.pdf"):
        assert respuesta.headers["content-type"] == "application/pdf"
        assert respuesta.content.startswith(b"%PDF-")
    else:
        assert not _claves(respuesta.json()) & {"pin", "pin_hash", "archivo_url"}


async def test_el_pin_mal_formado_es_422(cliente: AsyncClient) -> None:
    for pin in ("123", "1234567", "12a4"):
        respuesta = await cliente.post(
            f"{A}/restaurantes/{UUID_X}/personal", json={"nombre": "Eva", "pin": pin}
        )
        assert respuesta.status_code == 422, pin


async def test_la_confirmacion_devuelve_el_borrador_revisado(cliente: AsyncClient) -> None:
    respuesta = await cliente.post(
        f"{A}/restaurantes/{UUID_X}/importaciones/{UUID_X}/confirmar", json=CONFIRMACION
    )
    cuerpo = respuesta.json()
    assert cuerpo["estado"] == "confirmado"
    assert cuerpo["confirmado_en"] is not None
    assert cuerpo["resultado"]["categorias"][0]["platillos"][0]["precio"] == 90.0


async def test_el_crud_heredado_responde_con_el_esquema_v1(
    cliente: AsyncClient, restaurante: Restaurante
) -> None:
    respuesta = await cliente.get(f"{A}/restaurantes/{restaurante.id}")
    assert respuesta.status_code == 200
    assert set(respuesta.json()) == {
        "id",
        "nombre",
        "slug",
        "direccion",
        "telefono",
        "email",
        "logo_url",
        "tema",
        "activo",
        "creado_en",
    }
    creado = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/platillos",
        json={"restaurante_id": str(restaurante.id), "nombre": "Tostada", "precio": 55.5},
    )
    assert creado.status_code == 201, creado.text
    assert creado.json()["precio"] == 55.5
    assert creado.json()["imagen_tipo"] == "ilustracion_categoria"


@pytest.mark.parametrize(
    "ruta", [f"/restaurantes/{UUID_X}/importaciones/{UUID_X}", f"/restaurantes/{UUID_X}/mesas"]
)
async def test_los_ejemplos_se_esconden_fuera_de_desarrollo(
    cliente: AsyncClient, monkeypatch: pytest.MonkeyPatch, ruta: str
) -> None:
    monkeypatch.setattr(settings, "ENTORNO", "staging")
    respuesta = await cliente.get(A + ruta)
    assert respuesta.status_code == 404
    assert respuesta.json()["error"]["codigo"] == "RECURSO_NO_ENCONTRADO"
