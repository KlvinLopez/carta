"""T-2.2: `GET /p/platillos/{id}` (AC-04.1, AC-04.2, AC-04.4).

Público, sin cookie. Un platillo activo de una categoría y un restaurante activos; cualquier
otro caso (inexistente, de baja, de categoría de baja, sin categoría, de restaurante de baja)
da el mismo 404.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient, Response

from app.db.models import CategoriaMenu, Platillo, Restaurante
from app.schemas.menu_publico import PlatilloDetalle
from tests.conftest import Fabrica
from tests.integration.test_menu import CAMPOS_PLATILLO
from tests.invitado_pruebas import sin_request_id

P = "/api/v1/p"
A = "/api/v1/admin"


async def _detalle(cliente: AsyncClient, id_: UUID | str, **cabeceras: str) -> Response:
    return await cliente.get(f"{P}/platillos/{id_}", headers=cabeceras)


@pytest.mark.ac("AC-04.2")
async def test_el_detalle_es_publico_y_trae_el_nombre_de_la_categoria(
    cliente: AsyncClient,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    fabrica_platillo: Fabrica,
) -> None:
    plato: Platillo = await fabrica_platillo(
        restaurante,
        categoria,
        nombre="Tuétano asado",
        descripcion="Con sal de mar",
        calorias=640,
        nivel_picante=2,
        alergenos=["lacteos"],
        etiquetas=["picante"],
        foto_thumb_url="https://x/t.jpg",
        foto_detalle_url="https://x/d.jpg",
        destacado=True,
    )
    respuesta = await _detalle(cliente, plato.id)  # sin cookie
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.headers["content-type"] == "application/json"
    assert respuesta.headers["cache-control"] == "private, no-cache"
    assert respuesta.headers["etag"].startswith('"')
    cuerpo = respuesta.json()
    PlatilloDetalle.model_validate(cuerpo)
    assert set(cuerpo) == CAMPOS_PLATILLO | {"categoria_nombre"}
    assert cuerpo["categoria_nombre"] == categoria.nombre
    assert cuerpo["categoria_id"] == str(categoria.id)
    assert cuerpo["nombre"] == "Tuétano asado"
    assert cuerpo["descripcion"] == "Con sal de mar"
    assert cuerpo["precio"] == 100.0
    assert cuerpo["calorias"] == 640
    assert cuerpo["nivel_picante"] == 2
    assert cuerpo["alergenos"] == ["lacteos"]
    assert cuerpo["etiquetas"] == ["picante"]
    assert cuerpo["foto_detalle_url"] == "https://x/d.jpg"
    assert cuerpo["destacado"] is True


@pytest.mark.ac("AC-04.2")
async def test_el_detalle_coincide_con_el_platillo_del_menu(
    cliente: AsyncClient, restaurante: Restaurante, platillo: Platillo
) -> None:
    menu = (await cliente.get(f"{P}/menu/{restaurante.slug}")).json()
    en_menu = menu["categorias"][0]["platillos"][0]
    detalle = (await _detalle(cliente, platillo.id)).json()
    assert {k: v for k, v in detalle.items() if k != "categoria_nombre"} == en_menu


@pytest.mark.ac("AC-04.1")
async def test_ningun_campo_interno_sale_en_el_detalle(
    cliente: AsyncClient,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    fabrica_platillo: Fabrica,
) -> None:
    plato: Platillo = await fabrica_platillo(
        restaurante, categoria, foto_original_url="https://x/original.jpg"
    )
    texto = (await _detalle(cliente, plato.id)).text
    for prohibido in (
        "restaurante_id",
        "activo",
        "no_disponible",
        "foto_original_url",
        '"foto_url"',
        "creado_en",
        "actualizado_en",
        str(restaurante.id),
        "original.jpg",
    ):
        assert prohibido not in texto, prohibido


@pytest.mark.ac("AC-04.4")
async def test_un_platillo_no_disponible_se_ve_marcado_en_el_detalle(
    cliente: AsyncClient,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    fabrica_platillo: Fabrica,
) -> None:
    plato: Platillo = await fabrica_platillo(restaurante, categoria, disponible=False)
    respuesta = await _detalle(cliente, plato.id)
    assert respuesta.status_code == 200
    assert respuesta.json()["disponible"] is False


# ---------------------------------------------------------------------------
# 404: todo lo que no se ve en el menú tampoco se ve aquí, con el mismo cuerpo
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-04.1")
async def test_inexistente_inactivo_y_sin_categoria_activa_dan_el_mismo_404(
    cliente: AsyncClient,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    fabrica_restaurante: Fabrica,
    fabrica_categoria: Fabrica,
    fabrica_platillo: Fabrica,
) -> None:
    de_baja = await fabrica_platillo(restaurante, categoria, activo=False)
    cat_baja = await fabrica_categoria(restaurante, activa=False)
    en_cat_baja = await fabrica_platillo(restaurante, cat_baja)  # el platillo sigue activo
    sin_categoria = await fabrica_platillo(restaurante, None)
    rest_baja: Restaurante = await fabrica_restaurante(activo=False)
    cat_rest_baja = await fabrica_categoria(rest_baja)
    de_rest_baja = await fabrica_platillo(rest_baja, cat_rest_baja)

    esperado = sin_request_id((await _detalle(cliente, uuid4())).json())
    assert esperado["error"]["codigo"] == "RECURSO_NO_ENCONTRADO"
    for ocultos in (de_baja, en_cat_baja, sin_categoria, de_rest_baja):
        respuesta = await _detalle(cliente, ocultos.id)
        assert respuesta.status_code == 404, ocultos.nombre
        assert respuesta.headers["cache-control"] == "no-store"
        assert sin_request_id(respuesta.json()) == esperado


@pytest.mark.ac("AC-04.1")
async def test_un_id_mal_formado_es_422_y_nunca_500(cliente: AsyncClient) -> None:
    for malo in ("no-es-un-uuid", "123", "%00", "a" * 300):
        respuesta = await cliente.get(f"{P}/platillos/{malo}")
        assert respuesta.status_code == 422, malo
        assert respuesta.json()["error"]["codigo"] == "PAYLOAD_INVALIDO"


@pytest.mark.ac("AC-04.1")
async def test_un_platillo_se_ve_aunque_otro_restaurante_tenga_platillos(
    cliente: AsyncClient,
    categoria: CategoriaMenu,
    restaurante: Restaurante,
    fabrica_restaurante: Fabrica,
    fabrica_categoria: Fabrica,
    fabrica_platillo: Fabrica,
) -> None:
    """El detalle se pide por id (UUID v4 de 122 bits, como el del menú); no cruza nada."""
    ajeno: Restaurante = await fabrica_restaurante()
    cat_ajena = await fabrica_categoria(ajeno, nombre="Ajena")
    otro: Platillo = await fabrica_platillo(ajeno, cat_ajena, nombre="Del otro")
    propio: Platillo = await fabrica_platillo(restaurante, categoria, nombre="Mío")
    assert (await _detalle(cliente, propio.id)).json()["categoria_nombre"] == categoria.nombre
    cuerpo: dict[str, Any] = (await _detalle(cliente, otro.id)).json()
    assert cuerpo["categoria_nombre"] == "Ajena" and cuerpo["nombre"] == "Del otro"


# ---------------------------------------------------------------------------
# ETag y 304; cambios del operador
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-04.2")
@pytest.mark.parametrize("condicion", ["{etag}", "W/{etag}", '"otro", {etag}', "*"])
async def test_if_none_match_vigente_responde_304_sin_cuerpo(
    cliente: AsyncClient, platillo: Platillo, condicion: str
) -> None:
    primera = await _detalle(cliente, platillo.id)
    etag = primera.headers["etag"]
    segunda = await _detalle(cliente, platillo.id, **{"If-None-Match": condicion.format(etag=etag)})
    assert segunda.status_code == 304
    assert segunda.content == b""
    assert segunda.headers["etag"] == etag
    assert segunda.headers["cache-control"] == "private, no-cache"


@pytest.mark.ac("AC-04.4")
async def test_tras_un_patch_el_detalle_cambia_de_inmediato(
    cliente: AsyncClient, platillo: Platillo, cabecera_operador: dict[str, str]
) -> None:
    antes = await _detalle(cliente, platillo.id)
    cambio = await cliente.patch(
        f"{A}/platillos/{platillo.id}",
        json={"disponible": False, "precio": "199.90"},
        headers=cabecera_operador,
    )
    assert cambio.status_code == 200, cambio.text
    despues = await _detalle(cliente, platillo.id, **{"If-None-Match": antes.headers["etag"]})
    assert despues.status_code == 200
    assert despues.headers["etag"] != antes.headers["etag"]
    assert despues.json()["disponible"] is False
    assert despues.json()["precio"] == 199.9


@pytest.mark.ac("AC-04.1")
async def test_dar_de_baja_el_platillo_o_su_categoria_lo_quita_del_detalle(
    cliente: AsyncClient,
    platillo: Platillo,
    categoria: CategoriaMenu,
    cabecera_operador: dict[str, str],
) -> None:
    assert (await _detalle(cliente, platillo.id)).status_code == 200
    baja = await cliente.delete(f"{A}/categorias/{categoria.id}", headers=cabecera_operador)
    assert baja.status_code == 204
    assert (await _detalle(cliente, platillo.id)).status_code == 404
