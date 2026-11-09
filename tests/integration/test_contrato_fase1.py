"""T-1.1: `/openapi.json` publica el contrato completo de la Fase 1 desde el primer día.

Contrato primero (04 §2): el frontend (carril C) genera sus tipos con
`npm --prefix frontend run tipos` y trabaja contra estos esquemas mientras T-1.2 a T-1.9
ponen las rutas reales. Las rutas están en 02_Arquitectura_v1 §5.3.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import EstadoImportacion, OperadorRestaurante, Restaurante, Usuario
from app.main import app
from app.schemas.comun import ErrorRespuesta, Reordenar
from app.schemas.importacion import ResultadoImportacion
from app.schemas.menu import CategoriaCambios, CategoriaCrear
from app.schemas.personal import PersonalCambios, PersonalCrear
from tests.conftest import Fabrica

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


@pytest.fixture(autouse=True)
def _con_token_del_operador(request: pytest.FixtureRequest) -> None:
    """Desde T-1.2 todo `/admin` exige token: las pruebas que usan `cliente` hablan como el
    dueño de `restaurante` (`cabecera_operador`)."""
    if "cliente" in request.fixturenames:
        cliente: AsyncClient = request.getfixturevalue("cliente")
        cliente.headers.update(request.getfixturevalue("cabecera_operador"))


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
]  # las importaciones ya son reales (T-1.9): tests/integration/test_importaciones.py


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
        json={"nombre": "Tostada", "precio": 55.5},
    )
    assert creado.status_code == 201, creado.text
    assert creado.json()["precio"] == 55.5
    assert creado.json()["imagen_tipo"] == "ilustracion_categoria"


@pytest.mark.parametrize(
    "ruta", [f"/restaurantes/{UUID_X}/importaciones/{UUID_X}", f"/restaurantes/{UUID_X}/mesas"]
)
async def test_los_ejemplos_fuera_de_desarrollo_piden_token_y_no_existen(
    cliente: AsyncClient,
    cabecera_operador: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
    ruta: str,
) -> None:
    """Fuera de desarrollo un ejemplo pide token (401) y, con él, no existe (404): revisión
    de T-1.2, A1."""
    monkeypatch.setattr(settings, "ENTORNO", "staging")
    del cliente.headers["Authorization"]
    respuesta = await cliente.get(A + ruta)
    assert respuesta.status_code == 401
    assert respuesta.json()["error"]["codigo"] == "SIN_CREDENCIAL"
    con_token = await cliente.get(A + ruta, headers=cabecera_operador)
    assert con_token.status_code == 404
    assert con_token.json()["error"]["codigo"] == "RECURSO_NO_ENCONTRADO"


# ---------------------------------------------------------------------------
# B3 · El contrato de errores es la envoltura que responde la API (04_API_Spec §1.2)
# ---------------------------------------------------------------------------


def _operaciones_admin(openapi: dict[str, Any]) -> list[tuple[str, str, dict[str, Any]]]:
    return [
        (metodo, ruta, operacion)
        for ruta, item in openapi["paths"].items()
        if ruta.startswith(A)
        for metodo, operacion in item.items()
    ]


def test_ninguna_operacion_publica_el_error_de_validacion_de_fastapi(
    openapi: dict[str, Any],
) -> None:
    assert "HTTPValidationError" not in str(openapi)
    assert "ErrorRespuesta" in openapi["components"]["schemas"]


def test_toda_operacion_del_operador_declara_401_404_y_422_con_la_envoltura(
    openapi: dict[str, Any],
) -> None:
    operaciones = _operaciones_admin(openapi)
    assert len(operaciones) >= len(CONTRATO_FASE_1)
    for metodo, ruta, operacion in operaciones:
        for codigo in ("401", "404", "422"):
            esquema = operacion["responses"][codigo]["content"]["application/json"]["schema"]
            assert esquema["$ref"].endswith("/ErrorRespuesta"), (metodo, ruta, codigo)


@pytest.mark.parametrize(
    ("metodo", "ruta", "codigos"),
    [
        ("post", "/restaurantes/{rid}/importaciones", {"413", "415"}),
        ("post", "/platillos/{platillo_id}/foto", {"413", "415"}),
        ("post", "/restaurantes/{rid}/importaciones/{importacion_id}/confirmar", {"409"}),
    ],
)
def test_las_rutas_declaran_sus_errores_propios(
    openapi: dict[str, Any], metodo: str, ruta: str, codigos: set[str]
) -> None:
    assert codigos <= set(openapi["paths"][A + ruta][metodo]["responses"])


@pytest.mark.parametrize(
    "ruta", ["/restaurantes/no-es-un-uuid/categorias", "/restaurantes/x/importaciones/y"]
)
async def test_un_422_real_cumple_el_esquema_publicado(cliente: AsyncClient, ruta: str) -> None:
    respuesta = await cliente.get(A + ruta)
    assert respuesta.status_code == 422, respuesta.text
    cuerpo = ErrorRespuesta.model_validate(respuesta.json())
    assert cuerpo.error.codigo == "PAYLOAD_INVALIDO"
    assert cuerpo.error.detalles["errores"][0]["campo"].startswith("path.")


async def test_un_422_de_cuerpo_cumple_el_esquema_publicado(cliente: AsyncClient) -> None:
    respuesta = await cliente.patch(f"{A}/categorias/no-es-un-uuid", json={"nombre": ""})
    assert respuesta.status_code == 422
    cuerpo = ErrorRespuesta.model_validate(respuesta.json())
    assert {e["campo"] for e in cuerpo.error.detalles["errores"]} >= {"path.categoria_id"}


async def test_un_404_real_cumple_el_esquema_publicado(cliente: AsyncClient) -> None:
    respuesta = await cliente.get(f"{A}/restaurantes/{UUID_X}")
    assert respuesta.status_code == 404
    assert ErrorRespuesta.model_validate(respuesta.json()).error.codigo == "RECURSO_NO_ENCONTRADO"


# ---------------------------------------------------------------------------
# B5 · El borrador de importación viene de un PDF ajeno o de un modelo: todo tiene tope
# ---------------------------------------------------------------------------


def _platillo_importado(**cambios: Any) -> dict[str, Any]:
    return {"nombre": "Sopa", "precio": 90, "precio_confianza": "alta", **cambios}


def _resultado(**cambios: Any) -> dict[str, Any]:
    datos: dict[str, Any] = {
        "moneda": "MXN",
        "categorias": [{"nombre": "Entradas", "orden": 1, "platillos": [_platillo_importado()]}],
        "avisos": [],
    }
    datos.update(cambios)
    return datos


def _con_platillo(**cambios: Any) -> dict[str, Any]:
    return _resultado(
        categorias=[
            {"nombre": "Entradas", "orden": 1, "platillos": [_platillo_importado(**cambios)]}
        ]
    )


TOPES_IMPORTACION = {
    "101 categorías": _resultado(
        categorias=[{"nombre": f"C{n}", "orden": n, "platillos": []} for n in range(101)]
    ),
    "501 platillos": _resultado(
        categorias=[
            {
                "nombre": "Entradas",
                "orden": 1,
                "platillos": [_platillo_importado(nombre=f"P{n}") for n in range(501)],
            }
        ]
    ),
    "21 variantes": _con_platillo(variantes=[{"nombre": f"V{n}", "precio": 1} for n in range(21)]),
    "31 alérgenos": _con_platillo(alergenos_sugeridos=[f"a{n}" for n in range(31)]),
    "31 etiquetas": _con_platillo(etiquetas_sugeridas=[f"e{n}" for n in range(31)]),
    "etiqueta de 41": _con_platillo(etiquetas_sugeridas=["x" * 41]),
    "51 avisos": _resultado(avisos=[f"aviso {n}" for n in range(51)]),
    "aviso de 501": _resultado(avisos=["x" * 501]),
    "descripción de 1001": _con_platillo(descripcion="x" * 1001),
    "nombre de platillo de 201": _con_platillo(nombre="x" * 201),
    "nombre de platillo en blanco": _con_platillo(nombre="   "),
    "orden > 10 000": _resultado(
        categorias=[{"nombre": "Entradas", "orden": 10_001, "platillos": []}]
    ),
    "orden > int4": _resultado(
        categorias=[{"nombre": "Entradas", "orden": 2**31, "platillos": []}]
    ),
    "página 0": _con_platillo(pagina=0),
    "página > 10 000": _con_platillo(pagina=10_001),
    "moneda minúscula": _resultado(moneda="mxn"),
    "moneda con salto": _resultado(moneda="MXN\n"),
    "precio negativo": _con_platillo(precio=-1),
    "precio > NUMERIC(10,2)": _con_platillo(precio=100_000_000),
    "confianza inventada": _con_platillo(precio_confianza="segura"),
}


@pytest.mark.parametrize("caso", list(TOPES_IMPORTACION), ids=list(TOPES_IMPORTACION))
def test_el_borrador_de_importacion_tiene_topes(caso: str) -> None:
    with pytest.raises(ValidationError):
        ResultadoImportacion.model_validate(TOPES_IMPORTACION[caso])


def test_el_borrador_en_el_limite_pasa() -> None:
    ResultadoImportacion.model_validate(
        _resultado(
            categorias=[{"nombre": f"C{n}", "orden": 10_000, "platillos": []} for n in range(99)]
            + [
                {
                    "nombre": "Entradas",
                    "orden": 0,
                    "platillos": [
                        _platillo_importado(
                            nombre="x" * 200,
                            descripcion="x" * 1000,
                            pagina=10_000,
                            variantes=[{"nombre": f"V{n}", "precio": 1} for n in range(20)],
                            alergenos_sugeridos=["x" * 40] * 30,
                        )
                    ]
                    * 500,
                }
            ],
            avisos=["x" * 500] * 50,
        )
    )


async def test_confirmar_un_borrador_sin_topes_es_422(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    operador: OperadorRestaurante,
    cabecera_operador: dict[str, str],
    fabrica_importacion: Fabrica,
) -> None:
    """Con una importación `listo` real (T-1.9): un `{rid}` inventado sería 404 antes del cuerpo."""
    usuario = await sesion.get(Usuario, operador.usuario_id)
    importacion = await fabrica_importacion(
        restaurante, usuario, estado=EstadoImportacion.listo, resultado=CONFIRMACION
    )
    respuesta = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/importaciones/{importacion.id}/confirmar",
        json=TOPES_IMPORTACION["orden > int4"],
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 422


# ---------------------------------------------------------------------------
# B6 · Los esquemas de entrada no son más laxos que los CHECK de la base
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "construir",
    [
        lambda: PersonalCrear(nombre="   ", pin="1234"),
        lambda: PersonalCambios(nombre=" \t "),
        lambda: CategoriaCrear(nombre="  "),
        lambda: CategoriaCambios(nombre=""),
        lambda: PersonalCrear(nombre="x" * 61, pin="1234"),
        lambda: Reordenar(ids=[UUID_X, UUID_X]),
    ],
    ids=[
        "personal en blanco",
        "cambio de personal en blanco",
        "categoria en blanco",
        "cambio de categoria vacio",
        "personal de 61",
        "ids repetidos",
    ],
)
def test_entradas_invalidas_se_rechazan_antes_de_la_base(construir: Any) -> None:
    with pytest.raises(ValidationError):
        construir()


def test_los_nombres_se_recortan() -> None:
    assert PersonalCrear(nombre="  Ana  ", pin="1234").nombre == "Ana"
    assert CategoriaCrear(nombre=" Postres ").nombre == "Postres"


async def test_reordenar_con_ids_repetidos_es_422(
    cliente: AsyncClient, restaurante: Restaurante
) -> None:
    # Con un `{rid}` ajeno sería 404 antes de mirar el cuerpo (T-1.3: la ruta ya es real).
    respuesta = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/categorias/reordenar", json={"ids": [UUID_X, UUID_X]}
    )
    assert respuesta.status_code == 422


# ---------------------------------------------------------------------------
# C1 · El CRUD heredado no toma el restaurante del cuerpo ni responde 500
# ---------------------------------------------------------------------------


async def test_el_platillo_heredado_es_del_restaurante_de_la_ruta(
    cliente: AsyncClient, restaurante: Restaurante, fabrica_restaurante: Any
) -> None:
    ajeno = await fabrica_restaurante()
    # Desde la revisión de T-1.2 un `restaurante_id` en el cuerpo es 422 (`extra="forbid"`).
    con_restaurante = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/platillos",
        json={"restaurante_id": str(ajeno.id), "nombre": "Tostada", "precio": 10},
    )
    assert con_restaurante.status_code == 422, con_restaurante.text
    creado = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/platillos", json={"nombre": "Tostada", "precio": 10}
    )
    assert creado.status_code == 201, creado.text
    listado = await cliente.get(f"{A}/restaurantes/{restaurante.id}/platillos")
    assert creado.json()["id"] in {p["id"] for p in listado.json()}
    del_ajeno = await cliente.get(f"{A}/restaurantes/{ajeno.id}/platillos")
    assert del_ajeno.status_code == 404  # desde T-1.2 el restaurante ajeno no existe (AC-15.3)


async def test_una_categoria_ajena_es_404_y_no_500(
    cliente: AsyncClient, restaurante: Restaurante, fabrica_restaurante: Any, sesion: Any
) -> None:
    from app.db.models import CategoriaMenu

    ajeno = await fabrica_restaurante()
    categoria = CategoriaMenu(restaurante_id=ajeno.id, nombre="Ajena")
    sesion.add(categoria)
    await sesion.commit()
    respuesta = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/platillos",
        json={
            "categoria_id": str(categoria.id),
            "nombre": "Tostada",
            "precio": 10,
        },
    )
    assert respuesta.status_code == 404, respuesta.text
    assert respuesta.json()["error"]["codigo"] == "RECURSO_NO_ENCONTRADO"


async def test_un_precio_negativo_al_editar_es_422_y_no_500(
    cliente: AsyncClient, restaurante: Restaurante
) -> None:
    creado = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/platillos",
        json={"nombre": "Tostada", "precio": 10},
    )
    respuesta = await cliente.patch(
        f"{A}/platillos/{creado.json()['id']}", json={"precio": -1, "nivel_picante": 9}
    )
    assert respuesta.status_code == 422, respuesta.text
    assert respuesta.json()["error"]["codigo"] == "PAYLOAD_INVALIDO"


async def test_un_slug_repetido_es_409(cliente: AsyncClient, restaurante: Restaurante) -> None:
    respuesta = await cliente.post(
        f"{A}/restaurantes", json={"nombre": "Otro", "slug": restaurante.slug}
    )
    assert respuesta.status_code == 409
    assert respuesta.json()["error"]["codigo"] == "CONFLICTO"


# ---------------------------------------------------------------------------
# D2 · Campos exactos de cada respuesta (el frontend genera sus tipos de aquí)
# ---------------------------------------------------------------------------

# (propiedades, obligatorias) de 03 §1–§2 y 02 §5.3/§7/§8.
CAMPOS = {
    "PlatilloRespuesta": (
        {
            "id",
            "categoria_id",
            "nombre",
            "descripcion",
            "precio",
            "imagen_tipo",
            "foto_thumb_url",
            "foto_detalle_url",
            "ilustracion_clave",
            "alergenos",
            "etiquetas",
            "calorias",
            "nivel_picante",
            "destacado",
            "orden",
            "disponible",
            "no_disponible_desde",
            "activo",
            "creado_en",
            "actualizado_en",
        },
        {
            "id",
            "nombre",
            "precio",
            "imagen_tipo",
            "alergenos",
            "etiquetas",
            "nivel_picante",
            "destacado",
            "orden",
            "disponible",
            "activo",
            "creado_en",
            "actualizado_en",
        },
    ),
    "MesaRespuesta": (
        {"id", "numero", "codigo_publico", "url_publica", "capacidad", "activa"},
        {"id", "numero", "codigo_publico", "url_publica", "capacidad", "activa"},
    ),
    "PersonalRespuesta": (
        {"id", "nombre", "rol", "activo", "ultimo_acceso_en", "creado_en"},
        {"id", "nombre", "rol", "activo", "creado_en"},
    ),
    "CategoriaRespuesta": (
        {"id", "nombre", "orden", "activa"},
        {"id", "nombre", "orden", "activa"},
    ),
    "ImportacionRespuesta": (
        {
            "id",
            "estado",
            "archivo_tipo",
            "paginas",
            "intentos",
            "error_mensaje",
            "resultado",
            "creado_en",
            "iniciado_en",
            "finalizado_en",
            "confirmado_en",
        },
        {"id", "estado", "archivo_tipo", "intentos", "creado_en"},
    ),
    "PlatilloImportado-Output": (
        {
            "nombre",
            "descripcion",
            "precio",
            "precio_confianza",
            "variantes",
            "alergenos_sugeridos",
            "etiquetas_sugeridas",
            "pagina",
        },
        {"nombre", "precio_confianza"},
    ),
    "RestauranteRespuesta": (
        {
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
        },
        {"id", "nombre", "slug", "tema", "activo", "creado_en"},
    ),
    "DetalleError": (
        {"codigo", "mensaje", "detalles", "request_id"},
        {"codigo", "mensaje", "detalles", "request_id"},
    ),
    # Cuerpos de entrada de T-1.3 (revisión, B8): ni `restaurante_id`, ni `orden`, ni imagen.
    "PlatilloCrear": (
        {
            "categoria_id",
            "nombre",
            "descripcion",
            "precio",
            "alergenos",
            "etiquetas",
            "calorias",
            "nivel_picante",
            "destacado",
            "disponible",
        },
        {"nombre", "precio"},
    ),
    "PlatilloCambios": (
        {
            "categoria_id",
            "nombre",
            "descripcion",
            "precio",
            "alergenos",
            "etiquetas",
            "calorias",
            "nivel_picante",
            "destacado",
            "disponible",
            "activo",
        },
        set(),
    ),
    "CategoriaCrear": ({"nombre"}, {"nombre"}),
    "CategoriaCambios": ({"nombre", "activa"}, set()),
    "Reordenar": ({"ids"}, {"ids"}),
}


@pytest.mark.parametrize("esquema", list(CAMPOS))
def test_esquemas_fase1_exponen_los_campos_de_03(openapi: dict[str, Any], esquema: str) -> None:
    definicion = openapi["components"]["schemas"][esquema]
    propiedades, obligatorias = CAMPOS[esquema]
    assert set(definicion["properties"]) == propiedades
    assert set(definicion.get("required", [])) == obligatorias


def test_los_limites_numericos_estan_en_el_contrato(openapi: dict[str, Any]) -> None:
    esquemas = openapi["components"]["schemas"]
    picante = esquemas["PlatilloRespuesta"]["properties"]["nivel_picante"]
    assert (picante["minimum"], picante["maximum"]) == (0, 5)
    precio = esquemas["PlatilloRespuesta"]["properties"]["precio"]
    assert (precio["type"], precio["minimum"], precio["maximum"]) == ("number", 0, 99999999.99)
    confianza = esquemas["PlatilloImportado-Output"]["properties"]["precio_confianza"]
    assert confianza["enum"] == ["alta", "media", "baja"]
    imagen = esquemas["TipoImagen"]
    assert imagen["enum"] == ["foto", "ilustracion_categoria", "ilustracion_generada"]


# ---------------------------------------------------------------------------
# D3 · Toda ruta del operador de 02 §5.3 (Fase 1) está en el contrato
# ---------------------------------------------------------------------------

ARQUITECTURA = Path(__file__).resolve().parents[2] / "docs" / "plan" / "02_Arquitectura_v1.md"
# Historias de la Fase 1 (04 §5). US-24 (`/resumen`) y US-13 (`/mesas-vivo`) llegan después.
HISTORIAS_FASE_1 = {"US-15", "US-16", "US-17", "US-21", "US-25", "US-26"}


def _rutas_de_la_arquitectura() -> set[tuple[str, str]]:
    texto = ARQUITECTURA.read_text(encoding="utf-8")
    seccion = texto.split("### 5.3")[1].split("### 5.4")[0]
    rutas: set[tuple[str, str]] = set()
    for fila in seccion.splitlines():
        celdas = [c.strip() for c in fila.strip().strip("|").split("|")]
        if len(celdas) != 3 or celdas[2] not in HISTORIAS_FASE_1:
            continue
        for metodos, ruta in re.findall(r"`([A-Z/]+) (\S+?)`", celdas[0]):
            ruta = ruta.replace("...", "/restaurantes/{rid}")
            for metodo in metodos.split("/"):
                rutas.add((metodo.lower(), re.sub(r"\{[^}]+\}", "{}", ruta)))
    return rutas


def test_toda_ruta_de_la_fase_1_en_02_esta_en_openapi(openapi: dict[str, Any]) -> None:
    documentadas = _rutas_de_la_arquitectura()
    assert len(documentadas) >= 25  # la tabla se leyó de verdad
    publicadas = {
        (metodo, re.sub(r"\{[^}]+\}", "{}", ruta[len(A) :]))
        for metodo, ruta, _ in _operaciones_admin(openapi)
    }
    assert documentadas - publicadas == set()
    # Y la lista a mano de este archivo no se queda atrás de la documentación.
    a_mano = {(m, re.sub(r"\{[^}]+\}", "{}", r)) for m, r, _ in CONTRATO_FASE_1}
    assert documentadas == a_mano
