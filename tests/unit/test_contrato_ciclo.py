"""T-3.0: `/openapi.json` publica el contrato completo de la Fase 3 desde el primer día.

Contrato primero (04 §2): los carriles E y H generan sus tipos con
`npm --prefix frontend run sincronizar` y trabajan con datos simulados validados con Ajv
mientras el backend pone las rutas reales. Aquí se fija:

- que cada ruta de la fase está en el contrato con sus esquemas (`CONTRATO_FASE_3`); la tarea
  que la implementa conserva método, ruta y esquema;
- lo que **no** existe: editar permisos (AC-36.7), cobrar, repartir o reportar propinas
  (AC-37.9) y capturar descuentos o cualquier monto (AC-37.11);
- que las marcas de tiempo y la propina no llevan nada del comensal (AC-35.5);
- que una ruta de contrato no responde datos ni abre nada sin autenticación, en ningún entorno.
"""

from __future__ import annotations

import re
from collections.abc import Iterator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.db.models import Mesa, Restaurante
from app.main import app
from tests.invitado_pruebas import con_token, entrar

P, OP, A = "/api/v1/p", "/api/v1/op", "/api/v1/admin"
R = "/restaurantes/{rid}"
UUID_X = "00000000-0000-4000-8000-0000000000aa"

# (método, ruta, esquema 2xx; `None` sin cuerpo; `evento:` para las líneas text/event-stream)
ACCIONES_MESA = [
    ("post", "/mesas/{mesa_id}/cuentas/cerrar"),
    ("post", "/mesas/{mesa_id}/limpia"),
    ("post", "/mesas/{mesa_id}/reabrir"),
    ("post", "/mesas/{mesa_id}/liberar"),
    ("post", "/mesas/{mesa_id}/todo-bien"),
    ("post", "/mesas/{mesa_id}/entrada"),
    ("post", "/miembros/{miembro_id}/cuenta/cerrar"),
    ("post", "/miembros/{miembro_id}/cuenta/reabrir"),
    ("post", "/miembros/{miembro_id}/pago/validar"),
    ("post", "/miembros/{miembro_id}/quitar"),
    ("post", "/miembros/{miembro_id}/flotante"),
    ("post", "/miembros/{miembro_id}/pasar-cuenta"),
    ("post", "/items/{item_id}/cancelar"),
    ("post", "/solicitudes/{solicitud_id}/aprobar"),
    ("post", "/solicitudes/{solicitud_id}/rechazar"),
]
ACCIONES_PISO = [
    ("post", "/comandas/{comanda_id}/atender", "ComandaOp"),
    ("post", "/comandas/{comanda_id}/servir", "ComandaOp"),
    ("post", "/llamadas/{llamada_id}/atender", "LlamadaOp"),
]
CONTRATO_FASE_3 = [
    # Comensal
    ("get", f"{P}/sesion", "SesionEstado"),
    ("get", f"{P}/sesion/eventos", "evento:MensajeLinea"),
    ("get", f"{P}/solicitud", "SolicitudEstado"),
    ("post", f"{P}/orden/items", "MiOrden"),
    ("patch", f"{P}/orden/items/{{item_id}}", "MiOrden"),
    ("delete", f"{P}/orden/items/{{item_id}}", "MiOrden"),
    ("post", f"{P}/orden/confirmar", "MiOrden"),
    ("post", f"{P}/orden/deshacer", "MiOrden"),
    ("post", f"{P}/llamar-mesero", "LlamadaRespuesta"),
    ("get", f"{P}/cuenta", "CuentaComensal"),
    ("post", f"{P}/cuenta/cerrar", "CuentaComensal"),
    ("put", f"{P}/cuenta/propina", "CuentaComensal"),
    ("post", f"{P}/cuenta/ya-pague", "CuentaComensal"),
    ("post", f"{P}/mesa/salir", None),
    # Personal
    ("get", f"{OP}/personal/{{slug}}", "PersonalDelRestaurante"),
    ("post", f"{OP}/entrar", "SesionPersonal"),
    ("post", f"{OP}/salir", None),
    ("get", f"{OP}/eventos", "evento:MensajeLinea"),
    ("get", f"{OP}/mesas", "MesasOp"),
    ("get", f"{OP}/mesas/{{mesa_id}}", "MesaDetalleOp"),
    ("get", f"{OP}/comandas", "ComandasOp"),
    ("get", f"{OP}/platillos", "PlatilloOp[]"),
    ("post", f"{OP}/platillos/{{platillo_id}}/disponible", "PlatilloOp"),
    ("get", f"{OP}/resumen", "ResumenTurno"),
    *((m, f"{OP}{r}", e) for m, r, e in ACCIONES_PISO),
    *((m, f"{OP}{r}", "MesaDetalleOp") for m, r in ACCIONES_MESA),
    # Dueño desde su panel (T-3.7)
    ("get", f"{A}{R}/mesas-vivo", "MesasOp"),
    ("get", f"{A}{R}/mesas-vivo/{{mesa_id}}", "MesaDetalleOp"),
    ("get", f"{A}{R}/comandas", "ComandasOp"),
    ("post", f"{A}{R}/linea", None),
    ("get", f"{A}/eventos", "evento:MensajeLinea"),
    *((m, f"{A}{R}/pedidos{r}", e) for m, r, e in ACCIONES_PISO),
    *((m, f"{A}{R}/pedidos{r}", "MesaDetalleOp") for m, r in ACCIONES_MESA),
]


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
        contenido = respuesta.get("content", {})
        if "text/event-stream" in contenido:
            return "evento:" + contenido["text/event-stream"]["schema"]["$ref"].rsplit("/", 1)[-1]
        esquema = contenido.get("application/json", {}).get("schema")
        if not esquema:
            return None
        if esquema.get("type") == "array":
            return esquema["items"]["$ref"].rsplit("/", 1)[-1] + "[]"
        return str(esquema["$ref"].rsplit("/", 1)[-1])
    return None


@pytest.mark.parametrize(
    ("metodo", "ruta", "esquema"),
    CONTRATO_FASE_3,
    ids=[f"{m.upper()} {r}" for m, r, _ in CONTRATO_FASE_3],
)
def test_cada_ruta_de_la_fase_3_esta_en_el_contrato(
    openapi: dict[str, Any], metodo: str, ruta: str, esquema: str | None
) -> None:
    assert ruta in openapi["paths"], ruta
    assert metodo in openapi["paths"][ruta], (metodo, ruta)
    assert _esquema_2xx(openapi["paths"][ruta][metodo]) == esquema


def _esquemas(openapi: dict[str, Any]) -> dict[str, Any]:
    esquemas: dict[str, Any] = openapi["components"]["schemas"]
    return esquemas


def _propiedades(openapi: dict[str, Any], nombre: str, vistos: set[str] | None = None) -> set[str]:
    """Todos los nombres de propiedad de un esquema, siguiendo sus `$ref`."""
    vistos = set() if vistos is None else vistos
    if nombre in vistos:
        return set()
    vistos.add(nombre)
    nombres: set[str] = set()

    def recorrer(nodo: Any) -> None:
        if isinstance(nodo, dict):
            if "$ref" in nodo:
                nombres.update(_propiedades(openapi, nodo["$ref"].rsplit("/", 1)[-1], vistos))
            for clave, valor in nodo.get("properties", {}).items():
                nombres.add(clave)
                recorrer(valor)
            for clave, valor in nodo.items():
                if clave != "properties":
                    recorrer(valor)
        elif isinstance(nodo, list):
            for valor in nodo:
                recorrer(valor)

    recorrer(_esquemas(openapi)[nombre])
    return nombres


def _cuerpos(openapi: dict[str, Any]) -> Iterator[tuple[str, str, str]]:
    """(método, ruta, esquema) de cada cuerpo de entrada JSON del contrato."""
    for ruta, operaciones in openapi["paths"].items():
        for metodo, operacion in operaciones.items():
            contenido = operacion.get("requestBody", {}).get("content", {})
            esquema = contenido.get("application/json", {}).get("schema", {})
            if "$ref" in esquema:
                yield metodo, ruta, esquema["$ref"].rsplit("/", 1)[-1]


# ---------------------------------------------------------------------------
# Lo que no existe en la v1
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-36.7")
def test_no_existe_ruta_para_editar_permisos(openapi: dict[str, Any]) -> None:
    for ruta, operaciones in openapi["paths"].items():
        if "permis" in ruta:
            assert set(operaciones) <= {"get"}, ruta
    for metodo, ruta, esquema in _cuerpos(openapi):
        assert not {"permiso", "permisos", "permitido"} & _propiedades(openapi, esquema), (
            metodo,
            ruta,
        )


@pytest.mark.ac("AC-36.7")
def test_quien_entra_lee_sus_permisos_sin_poder_cambiarlos(openapi: dict[str, Any]) -> None:
    """Los permisos sólo salen (para no mostrar lo que no puede hacer), nunca entran."""
    permisos = _esquemas(openapi)["SesionPersonal"]["properties"]["permisos"]
    valores = set(
        _esquemas(openapi)["Permiso"]["enum"]
        if "$ref" in permisos["items"]
        else permisos["items"]["enum"]
    )
    assert {"mesa_limpia", "liberar_con_cargos", "cambiar_entrada"} <= valores
    assert "cambiar_permisos_meseros" in valores  # sembrado (v1.1) pero sin ruta que lo use


PALABRAS_PROHIBIDAS_PROPINA = ("cobr", "repart", "report", "liquid", "pagar", "propinas")


@pytest.mark.ac("AC-37.9")
def test_no_existe_ruta_que_cobre_reparta_o_reporte_propinas(openapi: dict[str, Any]) -> None:
    for ruta, operaciones in openapi["paths"].items():
        minuscula = ruta.lower()
        assert not [p for p in PALABRAS_PROHIBIDAS_PROPINA if p in minuscula], ruta
        if "propina" in minuscula:
            # Sólo declarar la propia propina, como dato (AC-37.5, AC-37.8).
            assert (ruta, set(operaciones)) == (f"{P}/cuenta/propina", {"put"})


@pytest.mark.ac("AC-37.9")
def test_la_propina_declarada_es_solo_un_dato_en_centavos(openapi: dict[str, Any]) -> None:
    propina = _esquemas(openapi)["PropinaDeclarada"]
    assert set(propina["properties"]) == {"propina_centavos"}
    assert propina["properties"]["propina_centavos"]["minimum"] == 0
    assert propina["properties"]["propina_centavos"]["type"] == "integer"
    cuenta = _esquemas(openapi)["CuentaComensal"]["properties"]
    assert {"consumo_centavos", "propina_centavos", "total_a_cobrar_centavos"} <= set(cuenta)


PALABRAS_DESCUENTO = ("descuent", "cupon", "cupón", "cortesia", "promocion", "bonific")
# Ningún cuerpo de entrada lleva dinero salvo la propina declarada (regla dura 4, AC-37.11).
CAMPOS_DE_DINERO = {
    "precio",
    "precio_unitario",
    "monto",
    "importe",
    "total",
    "subtotal",
    "descuento",
}


@pytest.mark.ac("AC-37.11")
def test_no_hay_forma_de_capturar_un_descuento(openapi: dict[str, Any]) -> None:
    for ruta in openapi["paths"]:
        assert not [p for p in PALABRAS_DESCUENTO if p in ruta.lower()], ruta
    for nombre in _esquemas(openapi):
        assert not [p for p in PALABRAS_DESCUENTO if p in nombre.lower()], nombre
    for metodo, ruta, esquema in _cuerpos(openapi):
        if not (ruta.startswith(P) or ruta.startswith(OP) or "/pedidos/" in ruta):
            continue  # el operador sí fija el precio de su menú en `/admin` (US-16)
        campos = _propiedades(openapi, esquema)
        assert not campos & CAMPOS_DE_DINERO, (metodo, ruta, campos & CAMPOS_DE_DINERO)
        assert not [c for c in campos if "centavos" in c and c != "propina_centavos"], ruta


@pytest.mark.ac("AC-37.11")
def test_el_total_a_cobrar_nunca_baja_del_consumo_por_contrato(openapi: dict[str, Any]) -> None:
    """Sin descuentos, la única pieza que se suma al consumo es la propina, nunca negativa."""
    cuenta = _esquemas(openapi)["CuentaComensal"]["properties"]
    for campo in ("consumo_centavos", "total_a_cobrar_centavos"):
        assert cuenta[campo]["minimum"] == 0
    propina = cuenta["propina_centavos"]["anyOf"]
    assert {"type": "null"} in propina
    assert [p["minimum"] for p in propina if p.get("type") == "integer"] == [0]


# ---------------------------------------------------------------------------
# AC-35.5 · nada del comensal en las marcas ni en la propina
# ---------------------------------------------------------------------------

DATOS_DEL_COMENSAL = {
    "alias",
    "ip",
    "ip_hash",
    "cookie",
    "user_agent",
    "user_agent_fam",
    "color_avatar",
}
ESQUEMAS_SIN_DATOS_DEL_COMENSAL = (
    "MarcaTiempo",
    "PropinaDeclarada",
    "CerrarMiCuenta",
    "CuentaComensal",
    "Partida",
    "Responsable",
    "AccionRegistrada",
    "Autor",
)


@pytest.mark.ac("AC-35.5")
@pytest.mark.parametrize("esquema", ESQUEMAS_SIN_DATOS_DEL_COMENSAL)
def test_marcas_y_propina_sin_datos_del_comensal(openapi: dict[str, Any], esquema: str) -> None:
    campos = _propiedades(openapi, esquema)
    assert not campos & DATOS_DEL_COMENSAL, campos & DATOS_DEL_COMENSAL
    assert not [c for c in campos if "cookie" in c or c.startswith("ip")]


@pytest.mark.ac("AC-35.5")
def test_el_autor_de_un_paso_es_un_tipo_y_nunca_el_alias(openapi: dict[str, Any]) -> None:
    autor = _esquemas(openapi)["Autor"]["properties"]
    assert set(autor) == {"tipo", "nombre"}
    assert set(autor["tipo"]["enum"]) == {"comensal", "personal", "operador", "sistema"}


# ---------------------------------------------------------------------------
# Líneas de avisos (ADR-018) y acciones por sesión (ADR-017 punto 11)
# ---------------------------------------------------------------------------


def test_las_lineas_de_avisos_no_llevan_datos_del_negocio(openapi: dict[str, Any]) -> None:
    esquemas = _esquemas(openapi)
    assert set(esquemas["Hola"]["properties"]) == {"evento", "etag", "ventana_reconexion_s"}
    assert set(esquemas["Cambio"]["properties"]) == {"evento", "etag"}
    assert set(esquemas["Latido"]["properties"]) == {"evento", "etag"}
    assert set(esquemas["Fin"]["properties"]) == {"evento", "motivo"}
    assert esquemas["MensajeLinea"]["discriminator"]["propertyName"] == "evento"
    for ruta in (f"{P}/sesion/eventos", f"{OP}/eventos", f"{A}/eventos"):
        assert set(openapi["paths"][ruta]) == {"get"}
        # La mesa o el restaurante salen del token: sin parámetros de ruta ni de consulta.
        assert not openapi["paths"][ruta]["get"].get("parameters"), ruta


@pytest.mark.parametrize(("metodo", "ruta"), ACCIONES_MESA, ids=[r for _, r in ACCIONES_MESA])
def test_las_acciones_sobre_la_mesa_llevan_la_sesion_que_se_ve(
    openapi: dict[str, Any], metodo: str, ruta: str
) -> None:
    for prefijo in (OP, f"{A}{R}/pedidos"):
        operacion = openapi["paths"][prefijo + ruta][metodo]
        cuerpo = operacion.get("requestBody")
        if ruta.startswith("/solicitudes/"):
            assert cuerpo is None  # la solicitud se identifica sola y puede no haber sesión
            continue
        esquema = cuerpo["content"]["application/json"]["schema"]["$ref"].rsplit("/", 1)[-1]
        assert "sesion_id" in _esquemas(openapi)[esquema]["required"], (prefijo, ruta)
        assert "409" in operacion["responses"], (prefijo, ruta)


def test_los_errores_de_la_fase_usan_la_envoltura(openapi: dict[str, Any]) -> None:
    for metodo, ruta, _ in CONTRATO_FASE_3:
        for codigo, respuesta in openapi["paths"][ruta][metodo]["responses"].items():
            if codigo[0] in "45":
                esquema = respuesta["content"]["application/json"]["schema"]
                assert esquema == {"$ref": "#/components/schemas/ErrorRespuesta"}, (ruta, codigo)


def test_el_pin_es_de_4_a_6_digitos(openapi: dict[str, Any]) -> None:
    pin = _esquemas(openapi)["EntrarPersonal"]["properties"]["pin"]
    assert re.fullmatch(pin["pattern"], "1234") and re.fullmatch(pin["pattern"], "123456")
    assert not re.fullmatch(pin["pattern"], "123") and not re.fullmatch(pin["pattern"], "１２３４")


# ---------------------------------------------------------------------------
# Una ruta de contrato no responde datos ni abre nada sin autenticación
# ---------------------------------------------------------------------------


def _llenar(ruta: str) -> str:
    return re.sub(r"\{(\w+)\}", lambda m: "la-ceiba" if m.group(1) == "slug" else UUID_X, ruta)


RUTAS_DE_CONTRATO = [
    (m, r)
    for m, r, _ in CONTRATO_FASE_3
    if r not in {f"{P}/sesion"}  # ya existe (T-2.1)
]


# Un cuerpo **válido** por esquema de entrada de la fase (ronda de revisión, B10): con `{}`
# FastAPI respondería 422 antes de llegar al manejador y una ruta que devolviera datos de
# ejemplo con un cuerpo bueno pasaría desapercibida. Un esquema de entrada nuevo sin su cuerpo
# aquí rompe `test_cada_cuerpo_de_la_fase_tiene_su_ejemplo_valido`.
CUERPOS_VALIDOS: dict[str, dict[str, Any]] = {
    "ItemCrear": {"platillo_id": UUID_X, "cantidad": 1, "notas": "Sin cebolla"},
    "ItemCambios": {"cantidad": 2},
    "CerrarMiCuenta": {"propina_centavos": 7200, "pendientes": "confirmar"},
    "PropinaDeclarada": {"propina_centavos": 7200},
    "EntrarPersonal": {"slug": "la-ceiba", "personal_id": UUID_X, "pin": "1234"},
    "DisponibleCuerpo": {"disponible": False},
    "SobreSesion": {"sesion_id": UUID_X},
    "LiberarMesa": {"sesion_id": UUID_X, "con_cargos": True},
    "EntradaMesa": {"sesion_id": UUID_X, "cerrada": True},
    "PasarCuenta": {"sesion_id": UUID_X, "destino_miembro_id": UUID_X},
}


def _esquema_de_entrada(metodo: str, ruta: str) -> str | None:
    cuerpo = app.openapi()["paths"][ruta][metodo].get("requestBody")
    if cuerpo is None:
        return None
    return str(cuerpo["content"]["application/json"]["schema"]["$ref"].rsplit("/", 1)[-1])


def _cuerpo(metodo: str, ruta: str) -> dict[str, Any] | None:
    esquema = _esquema_de_entrada(metodo, ruta)
    return None if esquema is None else CUERPOS_VALIDOS[esquema]


def test_cada_cuerpo_de_la_fase_tiene_su_ejemplo_valido() -> None:
    from pydantic import TypeAdapter

    import app.schemas.ciclo as ciclo
    import app.schemas.orden as orden
    import app.schemas.personal_op as personal_op

    usados = {_esquema_de_entrada(m, r) for m, r in RUTAS_DE_CONTRATO} - {None}
    assert usados == set(CUERPOS_VALIDOS)
    for nombre, cuerpo in CUERPOS_VALIDOS.items():
        modelo = next(getattr(m, nombre) for m in (ciclo, orden, personal_op) if hasattr(m, nombre))
        TypeAdapter(modelo).validate_python(cuerpo)  # el cuerpo de la prueba es válido


@pytest.fixture(params=["desarrollo", "staging", "produccion"])
def entorno(request: pytest.FixtureRequest, monkeypatch: pytest.MonkeyPatch) -> str:
    monkeypatch.setattr(settings, "ENTORNO", request.param)
    return str(request.param)


async def test_sin_credencial_ninguna_ruta_de_contrato_responde_datos(
    cliente: AsyncClient, entorno: str
) -> None:
    """Con un cuerpo válido: el comensal y el dueño, 401; `/op` (sin cookie del personal hasta
    T-3.4) y la espera de una solicitud, el 404 de una ruta inexistente. Nunca 422 ni 2xx."""
    for metodo, ruta in RUTAS_DE_CONTRATO:
        respuesta = await cliente.request(metodo, _llenar(ruta), json=_cuerpo(metodo, ruta))
        esperado = 404 if ruta.startswith(OP) or ruta == f"{P}/solicitud" else 401
        assert respuesta.status_code == esperado, (entorno, metodo, ruta, respuesta.text)
        codigo = "RECURSO_NO_ENCONTRADO" if esperado == 404 else "SIN_CREDENCIAL"
        assert respuesta.json()["error"]["codigo"] == codigo


async def test_con_credencial_una_ruta_de_contrato_es_un_404(
    cliente: AsyncClient,
    entorno: str,
    restaurante: Restaurante,
    mesa: Mesa,
    cabecera_operador: dict[str, str],
) -> None:
    """Con la cookie del comensal o el token del dueño (y su propio restaurante) y un cuerpo
    válido, el mismo 404 que una ruta que no existe: nada de datos de ejemplo, en ningún
    entorno."""
    _, token = await entrar(cliente, mesa.codigo_publico)
    assert token is not None
    for metodo, ruta in RUTAS_DE_CONTRATO:
        if ruta == f"{A}/eventos":
            continue  # abre con el pase de línea, que no existe todavía: 401 (arriba)
        cabeceras = con_token(token) if ruta.startswith(P) else cabecera_operador
        url = _llenar(ruta).replace(f"/restaurantes/{UUID_X}", f"/restaurantes/{restaurante.id}")
        respuesta = await cliente.request(
            metodo, url, json=_cuerpo(metodo, ruta), headers=cabeceras
        )
        assert respuesta.status_code == 404, (entorno, metodo, ruta, respuesta.text)
        assert respuesta.json()["error"]["codigo"] == "RECURSO_NO_ENCONTRADO"


def _dependencias(dependant: Any) -> set[str]:
    nombres: set[str] = set()
    for sub in dependant.dependencies:
        nombres.add(getattr(sub.call, "__name__", ""))
        nombres |= _dependencias(sub)
    return nombres


def test_las_rutas_del_dueno_comprueban_su_restaurante() -> None:
    """B11: toda ruta de contrato bajo `/admin/restaurantes/{rid}` depende de
    `restaurante_del_operador` (un `{rid}` ajeno da 404 antes del manejador, regla dura 6).
    Por HTTP no se distingue (toda ruta de contrato da 404): la prueba de «restaurante ajeno →
    404» con datos reales la pone T-3.7 al implementarlas."""
    from tests.integration.test_auth_admin import rutas_api

    del_dueno = {r for _, r, _ in CONTRATO_FASE_3 if r.startswith(f"{A}/restaurantes/")}
    vistas: set[str] = set()
    for ruta, api, heredadas in rutas_api():
        if ruta not in del_dueno:
            continue
        vistas.add(ruta)
        nombres = _dependencias(api.dependant) | {
            getattr(d.dependency, "__name__", "") for d in heredadas
        }
        assert "restaurante_del_operador" in nombres, ruta
    assert vistas == del_dueno


# ---------------------------------------------------------------------------
# B13 · listas cerradas: ni rutas ni campos de entrada de más
# ---------------------------------------------------------------------------

# Lo que ya existía antes de la Fase 3 (Fases 1 y 2), escrito a mano.
RUTAS_ANTERIORES = {
    ("post", f"{P}/sesion/entrar"),
    ("get", f"{P}/sesion"),
    ("patch", f"{P}/miembro"),
    ("get", f"{P}/menu/{{slug}}"),
    ("get", f"{P}/platillos/{{platillo_id}}"),
    ("post", f"{P}/eventos"),
    ("get", f"{A}/restaurantes"),
    ("post", f"{A}/restaurantes"),
    ("get", f"{A}/restaurantes/{{rid}}"),
    ("patch", f"{A}/restaurantes/{{rid}}"),
    ("get", f"{A}/restaurantes/{{rid}}/categorias"),
    ("post", f"{A}/restaurantes/{{rid}}/categorias"),
    ("post", f"{A}/restaurantes/{{rid}}/categorias/reordenar"),
    ("patch", f"{A}/categorias/{{categoria_id}}"),
    ("delete", f"{A}/categorias/{{categoria_id}}"),
    ("get", f"{A}/restaurantes/{{rid}}/platillos"),
    ("post", f"{A}/restaurantes/{{rid}}/platillos"),
    ("post", f"{A}/restaurantes/{{rid}}/platillos/reordenar"),
    ("patch", f"{A}/platillos/{{platillo_id}}"),
    ("delete", f"{A}/platillos/{{platillo_id}}"),
    ("post", f"{A}/platillos/{{platillo_id}}/foto"),
    ("delete", f"{A}/platillos/{{platillo_id}}/foto"),
    ("get", f"{A}/restaurantes/{{rid}}/mesas"),
    ("post", f"{A}/restaurantes/{{rid}}/mesas"),
    ("post", f"{A}/mesas/{{mesa_id}}/regenerar-codigo"),
    ("get", f"{A}/restaurantes/{{rid}}/mesas/qr.pdf"),
    ("post", f"{A}/restaurantes/{{rid}}/importaciones"),
    ("get", f"{A}/restaurantes/{{rid}}/importaciones/{{importacion_id}}"),
    ("post", f"{A}/restaurantes/{{rid}}/importaciones/{{importacion_id}}/reintentar"),
    ("post", f"{A}/restaurantes/{{rid}}/importaciones/{{importacion_id}}/confirmar"),
    ("get", f"{A}/restaurantes/{{rid}}/personal"),
    ("post", f"{A}/restaurantes/{{rid}}/personal"),
    ("patch", f"{A}/personal/{{personal_id}}"),
    ("post", f"{A}/personal/{{personal_id}}/pin"),
}


@pytest.mark.ac("AC-36.7")
@pytest.mark.ac("AC-37.9")
@pytest.mark.ac("AC-37.11")
def test_el_contrato_de_la_fase_no_tiene_rutas_de_mas(openapi: dict[str, Any]) -> None:
    """Ninguna ruta para editar permisos, cobrar, repartir o reportar propinas ni capturar
    descuentos puede colarse con otro nombre: la API es exactamente lo de antes más la fase."""
    publicadas = {
        (metodo, ruta)
        for ruta, operaciones in openapi["paths"].items()
        if ruta.startswith(("/api/v1/p/", "/api/v1/op/", "/api/v1/admin/"))
        for metodo in operaciones
    }
    esperadas = RUTAS_ANTERIORES | {(m, r) for m, r, _ in CONTRATO_FASE_3}
    assert publicadas - esperadas == set(), "rutas de más"
    assert esperadas - publicadas == set(), "rutas que faltan"


# Campos de cada cuerpo de entrada de la fase, escritos a mano: un `descuento` o una `rebaja`
# en `CerrarMiCuenta` (o un permiso que se cuele en un cuerpo) rompe esto.
CAMPOS_DE_ENTRADA = {
    "ItemCrear": {"platillo_id", "cantidad", "notas"},
    "ItemCambios": {"cantidad", "notas"},
    "CerrarMiCuenta": {"propina_centavos", "pendientes"},
    "PropinaDeclarada": {"propina_centavos"},
    "EntrarPersonal": {"slug", "personal_id", "pin"},
    "DisponibleCuerpo": {"disponible"},
    "SobreSesion": {"sesion_id"},
    "LiberarMesa": {"sesion_id", "con_cargos"},
    "EntradaMesa": {"sesion_id", "cerrada"},
    "PasarCuenta": {"sesion_id", "destino_miembro_id"},
}


@pytest.mark.ac("AC-36.7")
@pytest.mark.ac("AC-37.11")
def test_los_cuerpos_de_entrada_son_los_esperados(openapi: dict[str, Any]) -> None:
    usados = {_esquema_de_entrada(m, r) for m, r in RUTAS_DE_CONTRATO} - {None}
    assert usados == set(CAMPOS_DE_ENTRADA)
    for nombre, campos in CAMPOS_DE_ENTRADA.items():
        assert set(_esquemas(openapi)[nombre]["properties"]) == campos, nombre


# ---------------------------------------------------------------------------
# Ronda de revisión de T-3.0 (B1, B3, B4, B5)
# ---------------------------------------------------------------------------


def test_la_foto_compartida_de_la_mesa_no_lleva_la_cuenta_de_nadie(openapi: dict[str, Any]) -> None:
    """B1: `GET /p/sesion` se cachea por sesión y se comparte entre sus miembros; la cuenta
    con la propina es de uno solo y vive en `GET /p/cuenta`, con su propio `ETag`."""
    sesion = _esquemas(openapi)["SesionEstado"]["properties"]
    assert "mi_cuenta" not in sesion
    assert not {"propina_centavos", "consumo_centavos"} & _propiedades(openapi, "SesionEstado")
    assert "304" in openapi["paths"][f"{P}/cuenta"]["get"]["responses"]


@pytest.mark.ac("AC-35.5")
@pytest.mark.parametrize("tipo", ["comensal", "sistema"])
def test_el_comensal_y_el_sistema_no_llevan_nombre(tipo: str) -> None:
    """B3: «no hay alias, nombre, IP ni cookie» en una marca del comensal."""
    from pydantic import ValidationError

    from app.schemas.ciclo import Autor

    with pytest.raises(ValidationError):
        Autor(tipo=tipo, nombre="Ana")  # type: ignore[arg-type]
    assert Autor(tipo=tipo).nombre is None  # type: ignore[arg-type]
    assert Autor(tipo="personal", nombre="Marisol").nombre == "Marisol"


GRANDE = b"{" + b'"x": "' + b"a" * (32 * 1024) + b'"}'


@pytest.mark.parametrize(
    "ruta",
    [
        f"{OP}/entrar",
        f"{OP}/mesas/{UUID_X}/liberar",
        f"{A}/restaurantes/{UUID_X}/pedidos/mesas/{UUID_X}/limpia",
    ],
)
async def test_un_cuerpo_grande_es_413_antes_de_leerlo(cliente: AsyncClient, ruta: str) -> None:
    """B4: tope de 16 KiB por `Content-Length` en los routers de contrato de `/op` y `/admin`
    (sin token: el tope va antes de la autenticación y de la validación)."""
    respuesta = await cliente.post(
        ruta, content=GRANDE, headers={"Content-Type": "application/json"}
    )
    assert respuesta.status_code == 413, respuesta.text


def test_los_parametros_de_consulta_tienen_cota(openapi: dict[str, Any]) -> None:
    """B5: la tarea que implemente la ruta hereda la cota del contrato."""
    comandas = {p["name"]: p for p in openapi["paths"][f"{OP}/comandas"]["get"]["parameters"]}
    estado = next(e for e in comandas["estado"]["schema"]["anyOf"] if "enum" in e)
    assert set(estado["enum"]) == {"abierta", "atendida", "servida"}
    platillos = {p["name"]: p for p in openapi["paths"][f"{OP}/platillos"]["get"]["parameters"]}
    q = next(e for e in platillos["q"]["schema"]["anyOf"] if e.get("type") == "string")
    assert q["maxLength"] == 80


def test_la_propina_declarada_cabe_en_el_total(openapi: dict[str, Any]) -> None:
    """D2: consumo + propina nunca pasa del tope del total (la respuesta daría 500)."""
    propina = _esquemas(openapi)["PropinaDeclarada"]["properties"]["propina_centavos"]
    total = _esquemas(openapi)["CuentaComensal"]["properties"]["total_a_cobrar_centavos"]
    assert propina["maximum"] * 2 <= total["maximum"]


# ---------------------------------------------------------------------------
# Ronda 3 de revisión (C5)
# ---------------------------------------------------------------------------


def test_la_zona_horaria_se_valida_contra_iana_una_sola_vez() -> None:
    """C5: el conjunto de zonas se lee del disco una vez por proceso."""
    from pydantic import ValidationError

    from app.schemas import horario
    from app.schemas.horario import HorarioCambios

    assert HorarioCambios(zona_horaria="America/Mexico_City").zona_horaria == "America/Mexico_City"
    with pytest.raises(ValidationError):
        HorarioCambios(zona_horaria="Marte/Olympus")
    antes = horario._zonas_iana.cache_info().misses
    HorarioCambios(zona_horaria="Europe/Madrid")
    assert horario._zonas_iana.cache_info().misses == antes
