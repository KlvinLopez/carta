"""T-2.1: `/openapi.json` publica el contrato completo de la Fase 2 desde el primer día.

Contrato primero (04 §2): el frontend del comensal (carril E) genera sus tipos con
`npm --prefix frontend run tipos` y trabaja contra estos esquemas mientras T-2.1 a T-2.3 ponen
las rutas reales. Las rutas están en 02_Arquitectura_v1 §5.1.
"""

from __future__ import annotations

from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app

P = "/api/v1/p"

# (método, ruta, esquema de la respuesta 2xx o None si no tiene cuerpo JSON)
CONTRATO_FASE_2 = [
    # T-2.1 · sesión y miembro (US-01, US-02, US-03)
    ("post", "/sesion/entrar", "EntrarRespuesta"),
    ("get", "/sesion", "SesionEstado"),
    ("patch", "/miembro", "MiembroRespuesta"),
    # T-2.2 · menú público (US-04)
    ("get", "/menu/{slug}", "MenuPublico"),
    ("get", "/platillos/{platillo_id}", "PlatilloDetalle"),
    # T-2.3 · analítica (US-24)
    ("post", "/eventos", None),
]

# Campos que una respuesta del comensal jamás publica: internos del restaurante o del
# operador, y nada que identifique a una persona (regla dura 10).
PROHIBIDOS = {
    "PlatilloPublico": {
        "activo",
        "restaurante_id",
        "no_disponible_por",
        "no_disponible_desde",
        "foto_original_url",
        "foto_url",
        "creado_en",
        "actualizado_en",
    },
    "RestaurantePublico": {"id", "plan", "horarios", "email", "telefono", "activo"},
    "RestauranteDeSesion": {"plan", "horarios", "email", "telefono", "activo"},
    "MiembroRespuesta": {"usuario_id", "sesion_id", "unido_en"},
    "SesionEstado": {"restaurante_id", "mesa_id", "codigo_publico"},
    "MesaDeSesion": {"id", "codigo_publico", "activa"},
}


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
    CONTRATO_FASE_2,
    ids=[f"{m.upper()} {r}" for m, r, _ in CONTRATO_FASE_2],
)
def test_cada_ruta_de_la_fase_2_esta_en_el_contrato(
    openapi: dict[str, Any], metodo: str, ruta: str, esquema: str | None
) -> None:
    rutas = openapi["paths"]
    assert P + ruta in rutas, ruta
    assert metodo in rutas[P + ruta], (metodo, ruta)
    assert _esquema_2xx(rutas[P + ruta][metodo]) == esquema


@pytest.mark.parametrize("esquema", list(PROHIBIDOS))
def test_las_respuestas_no_publican_campos_internos(openapi: dict[str, Any], esquema: str) -> None:
    propiedades = set(openapi["components"]["schemas"][esquema]["properties"])
    assert not propiedades & PROHIBIDOS[esquema]


def test_los_errores_del_comensal_usan_la_envoltura(openapi: dict[str, Any]) -> None:
    """Cada código de error declarado apunta a `ErrorRespuesta`, nunca al
    `HTTPValidationError` de FastAPI (que la API nunca responde)."""
    for ruta, operaciones in openapi["paths"].items():
        if not ruta.startswith(P):
            continue
        for metodo, operacion in operaciones.items():
            for codigo, respuesta in operacion["responses"].items():
                if codigo[0] not in "45":
                    continue
                esquema = respuesta["content"]["application/json"]["schema"]
                assert esquema == {"$ref": "#/components/schemas/ErrorRespuesta"}, (
                    metodo,
                    ruta,
                    codigo,
                )


@pytest.mark.parametrize(
    ("metodo", "ruta", "codigos"),
    [
        ("post", "/sesion/entrar", {"404", "409", "410", "422", "429"}),
        ("get", "/sesion", {"304", "401", "410", "429"}),
        ("patch", "/miembro", {"401", "410", "422", "429"}),
        ("get", "/menu/{slug}", {"304", "404", "429"}),
        ("get", "/platillos/{platillo_id}", {"404", "429"}),
        ("post", "/eventos", {"401", "422", "429"}),
    ],
)
def test_cada_ruta_declara_sus_errores(
    openapi: dict[str, Any], metodo: str, ruta: str, codigos: set[str]
) -> None:
    assert codigos <= set(openapi["paths"][P + ruta][metodo]["responses"])


def test_el_precio_del_menu_sale_como_numero(openapi: dict[str, Any]) -> None:
    precio = openapi["components"]["schemas"]["PlatilloPublico"]["properties"]["precio"]
    assert precio["type"] == "number"


def test_el_color_del_avatar_es_hex_de_seis_digitos(openapi: dict[str, Any]) -> None:
    color = openapi["components"]["schemas"]["MiembroRespuesta"]["properties"]["color_avatar"]
    assert color["pattern"] == "^#[0-9A-F]{6}$"


def test_los_eventos_del_telefono_no_incluyen_los_del_servidor(openapi: dict[str, Any]) -> None:
    """`order_confirm`, `waiter_call`, `staff_*`… los registra el servidor (M3, G1)."""
    tipo = openapi["components"]["schemas"]["EventoEntrada"]["properties"]["tipo"]
    assert set(tipo["enum"]) == {"menu_view", "dish_view", "search", "filter"}
    lote = openapi["components"]["schemas"]["EventosLote"]["properties"]["eventos"]
    assert lote["maxItems"] == 50


# ---------------------------------------------------------------------------
# Las rutas de ejemplo responden en desarrollo y se esconden fuera
# ---------------------------------------------------------------------------


async def test_el_menu_de_ejemplo_responde_con_el_esquema(cliente: AsyncClient) -> None:
    respuesta = await cliente.get(f"{P}/menu/la-ceiba")
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["restaurante"]["slug"] == "la-ceiba"
    assert cuerpo["categorias"][0]["platillos"][0]["precio"] == 145.0
    assert respuesta.headers["etag"]


async def test_eventos_de_ejemplo_responde_202_y_valida_el_lote(cliente: AsyncClient) -> None:
    respuesta = await cliente.post(f"{P}/eventos", json={"eventos": [{"tipo": "menu_view"}]})
    assert respuesta.status_code == 202
    demasiados = {"eventos": [{"tipo": "menu_view"}] * 51}
    assert (await cliente.post(f"{P}/eventos", json=demasiados)).status_code == 422
    servidor = {"eventos": [{"tipo": "order_confirm"}]}
    assert (await cliente.post(f"{P}/eventos", json=servidor)).status_code == 422


@pytest.mark.parametrize("entorno", ["staging", "produccion"])
async def test_las_rutas_de_ejemplo_son_404_fuera_de_desarrollo(
    cliente: AsyncClient, monkeypatch: pytest.MonkeyPatch, entorno: str
) -> None:
    monkeypatch.setattr(settings, "ENTORNO", entorno)
    for metodo, ruta, cuerpo in [
        ("GET", f"{P}/menu/la-ceiba", None),
        ("GET", f"{P}/platillos/00000000-0000-4000-8000-000000000201", None),
        ("POST", f"{P}/eventos", {"eventos": [{"tipo": "menu_view"}]}),
    ]:
        respuesta = await cliente.request(metodo, ruta, json=cuerpo)
        assert respuesta.status_code == 404, (metodo, ruta)
        assert respuesta.json()["error"]["codigo"] == "RECURSO_NO_ENCONTRADO"
