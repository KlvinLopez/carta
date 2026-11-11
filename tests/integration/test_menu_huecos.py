"""T-2.2 (ronda de revisión, B2): lo que las pruebas del menú dejaban pasar.

Cada prueba falla con una mutación concreta del servicio o de las rutas (orden, imagen,
destacados, cookies, entorno, versión del ETag por campo, forma del slug, límites)."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import CategoriaMenu, Platillo, Restaurante
from app.services import menu_publico as servicio
from app.services.ilustraciones import clave_para_categoria
from tests import imagenes_pruebas as img
from tests.conftest import Fabrica
from tests.menu_pruebas import Reloj, reloj_falso

P = "/api/v1/p"
A = "/api/v1/admin"


@pytest.fixture(autouse=True)
def reloj() -> Iterator[Reloj]:
    yield from reloj_falso()


async def _menu(cliente: AsyncClient, restaurante: Restaurante, **cabeceras: str) -> Any:
    return await cliente.get(f"{P}/menu/{restaurante.slug}", headers=cabeceras)


# ===========================================================================
# a · orden
# ===========================================================================


@pytest.mark.ac("AC-04.1")
async def test_el_orden_manda_sobre_el_alfabeto_y_los_empates_se_resuelven_por_nombre(
    cliente: AsyncClient,
    restaurante: Restaurante,
    fabrica_categoria: Fabrica,
    fabrica_platillo: Fabrica,
) -> None:
    alfa = await fabrica_categoria(restaurante, nombre="Alfa", orden=2)
    zeta = await fabrica_categoria(restaurante, nombre="Zeta", orden=1)
    beta = await fabrica_categoria(restaurante, nombre="Beta", orden=5)
    gama = await fabrica_categoria(restaurante, nombre="Gama", orden=5)  # empata con Beta
    zafiro = await fabrica_categoria(restaurante, nombre="Zafiro", orden=5)
    delta = await fabrica_categoria(restaurante, nombre="Delta", orden=5)
    for nombre in ("Zumo", "Tamal", "Sopa", "Pozole", "Flan", "Atole"):  # todos con orden 1
        await fabrica_platillo(restaurante, zeta, nombre=nombre, orden=1)
    await fabrica_platillo(restaurante, zeta, nombre="Mole", orden=0)  # orden menor, va primero
    for categoria in (alfa, beta, gama, zafiro, delta):
        await fabrica_platillo(restaurante, categoria, nombre=f"De {categoria.nombre}")
    cuerpo = (await _menu(cliente, restaurante)).json()
    assert [c["nombre"] for c in cuerpo["categorias"]] == [
        "Zeta",
        "Alfa",
        "Beta",
        "Delta",
        "Gama",
        "Zafiro",
    ]
    assert [c["orden"] for c in cuerpo["categorias"]] == [1, 2, 5, 5, 5, 5]
    assert [p["nombre"] for p in cuerpo["categorias"][0]["platillos"]] == [
        "Mole",
        "Atole",
        "Flan",
        "Pozole",
        "Sopa",
        "Tamal",
        "Zumo",
    ]
    assert [p["orden"] for p in cuerpo["categorias"][0]["platillos"]] == [0, 1, 1, 1, 1, 1, 1]


@pytest.mark.ac("AC-04.1")
async def test_reordenar_categorias_con_la_api_cambia_el_menu_y_el_etag(
    cliente: AsyncClient,
    restaurante: Restaurante,
    fabrica_categoria: Fabrica,
    fabrica_platillo: Fabrica,
    cabecera_operador: dict[str, str],
) -> None:
    uno = await fabrica_categoria(restaurante, nombre="Uno", orden=1)
    dos = await fabrica_categoria(restaurante, nombre="Dos", orden=2)
    await fabrica_platillo(restaurante, uno)
    await fabrica_platillo(restaurante, dos)
    antes = await _menu(cliente, restaurante)
    assert [c["nombre"] for c in antes.json()["categorias"]] == ["Uno", "Dos"]
    cambio = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/categorias/reordenar",
        json={"ids": [str(dos.id), str(uno.id)]},
        headers=cabecera_operador,
    )
    assert cambio.status_code == 200, cambio.text
    despues = await _menu(cliente, restaurante)
    assert [c["nombre"] for c in despues.json()["categorias"]] == ["Dos", "Uno"]
    assert despues.headers["etag"] != antes.headers["etag"]


# ===========================================================================
# b · imagen, tema, orden y precio (AC-04.2)
# ===========================================================================


@pytest.mark.ac("AC-04.2")
async def test_el_menu_trae_foto_o_ilustracion_con_cada_campo(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    fabrica_platillo: Fabrica,
) -> None:
    await sesion.execute(
        update(Restaurante).where(Restaurante.id == restaurante.id).values(tema="ocre")
    )
    await sesion.commit()
    await fabrica_platillo(
        restaurante,
        categoria,
        nombre="Con foto",
        orden=1,
        precio=Decimal("99.99"),
        imagen_tipo="foto",
        foto_thumb_url="https://fotos.test/t.webp",
        foto_detalle_url="https://fotos.test/d.webp",
        ilustracion_clave=None,
    )
    await fabrica_platillo(
        restaurante,
        categoria,
        nombre="Con dibujo",
        orden=2,
        precio=Decimal("0.50"),
        imagen_tipo="ilustracion_categoria",
        ilustracion_clave="postres",
        foto_thumb_url=None,
        foto_detalle_url=None,
    )
    cuerpo = (await _menu(cliente, restaurante)).json()
    assert cuerpo["restaurante"]["tema"] == "ocre"
    con_foto, con_dibujo = cuerpo["categorias"][0]["platillos"]
    assert (con_foto["imagen_tipo"], con_foto["ilustracion_clave"]) == ("foto", None)
    assert con_foto["foto_thumb_url"] == "https://fotos.test/t.webp"
    assert con_foto["foto_detalle_url"] == "https://fotos.test/d.webp"
    assert con_foto["precio"] == 99.99 and con_foto["orden"] == 1
    assert (con_dibujo["imagen_tipo"], con_dibujo["ilustracion_clave"]) == (
        "ilustracion_categoria",
        "postres",
    )
    assert con_dibujo["foto_thumb_url"] is None and con_dibujo["foto_detalle_url"] is None
    assert con_dibujo["precio"] == 0.5 and con_dibujo["orden"] == 2
    assert cuerpo["categorias"][0]["orden"] == categoria.orden


# ===========================================================================
# c · Top 3
# ===========================================================================


@pytest.mark.ac("AC-04.1")
async def test_los_destacados_siguen_el_orden_del_menu_entre_categorias_y_incluyen_agotados(
    cliente: AsyncClient,
    restaurante: Restaurante,
    fabrica_categoria: Fabrica,
    fabrica_platillo: Fabrica,
) -> None:
    segunda = await fabrica_categoria(restaurante, nombre="Segunda", orden=2)
    primera = await fabrica_categoria(restaurante, nombre="Primera", orden=1)
    de_segunda = await fabrica_platillo(restaurante, segunda, orden=1, destacado=True)
    agotado = await fabrica_platillo(
        restaurante, primera, orden=2, destacado=True, disponible=False
    )
    de_primera = await fabrica_platillo(restaurante, primera, orden=1, destacado=True)
    cuerpo = (await _menu(cliente, restaurante)).json()
    assert cuerpo["destacados"] == [str(de_primera.id), str(agotado.id), str(de_segunda.id)]


# ===========================================================================
# d · sin cookie de verdad
# ===========================================================================


@pytest.mark.ac("AC-04.1")
async def test_ni_el_menu_ni_el_detalle_ponen_cookie_ni_vary_cookie(
    cliente: AsyncClient, restaurante: Restaurante, platillo: Platillo
) -> None:
    for ruta in (f"{P}/menu/{restaurante.slug}", f"{P}/platillos/{platillo.id}"):
        respuesta = await cliente.get(ruta, headers={"Cookie": "carta_invitado=x"})
        assert respuesta.status_code == 200
        assert "set-cookie" not in respuesta.headers
        assert "cookie" not in respuesta.headers.get("vary", "").lower()


# ===========================================================================
# e · las rutas reales responden fuera de desarrollo
# ===========================================================================


@pytest.mark.ac("AC-04.1")
@pytest.mark.parametrize("entorno", ["staging", "produccion"])
async def test_menu_y_detalle_responden_fuera_de_desarrollo(
    cliente: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    restaurante: Restaurante,
    platillo: Platillo,
    entorno: str,
) -> None:
    monkeypatch.setattr(settings, "ENTORNO", entorno)
    assert (await _menu(cliente, restaurante)).status_code == 200
    assert (await cliente.get(f"{P}/platillos/{platillo.id}")).status_code == 200


# ===========================================================================
# f · el ETag se mueve con cada campo
# ===========================================================================


@pytest.mark.ac("AC-04.4", "AC-04.1")
@pytest.mark.parametrize(
    "cambio",
    [
        {"precio": "130.00"},
        {"descripcion": "Otra descripción"},
        {"alergenos": ["nueces"]},
        {"etiquetas": ["vegano"]},
        {"nivel_picante": 3},
        {"calorias": 420},
        {"nombre": "Otro nombre"},
        {"destacado": True},
        {"disponible": False},
    ],
)
async def test_cada_campo_del_platillo_mueve_el_etag_del_menu_y_del_detalle(
    cliente: AsyncClient,
    platillo: Platillo,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    cambio: dict[str, Any],
) -> None:
    menu_antes = (await _menu(cliente, restaurante)).headers["etag"]
    detalle_antes = (await cliente.get(f"{P}/platillos/{platillo.id}")).headers["etag"]
    hecho = await cliente.patch(
        f"{A}/platillos/{platillo.id}", json=cambio, headers=cabecera_operador
    )
    assert hecho.status_code == 200, hecho.text
    menu_despues = await _menu(cliente, restaurante)
    detalle_despues = await cliente.get(f"{P}/platillos/{platillo.id}")
    assert menu_despues.headers["etag"] != menu_antes
    assert detalle_despues.headers["etag"] != detalle_antes
    campo, valor = next(iter(cambio.items()))
    en_menu = menu_despues.json()["categorias"][0]["platillos"][0][campo]
    assert en_menu == (float(valor) if campo == "precio" else valor)


@pytest.mark.ac("AC-04.1")
async def test_renombrar_la_categoria_mueve_el_etag_aunque_la_ilustracion_no_cambie(
    cliente: AsyncClient,
    restaurante: Restaurante,
    fabrica_categoria: Fabrica,
    fabrica_platillo: Fabrica,
    cabecera_operador: dict[str, str],
) -> None:
    categoria = await fabrica_categoria(restaurante, nombre="Postres")
    plato = await fabrica_platillo(restaurante, categoria, ilustracion_clave="postres")
    nuevo = "Postres de la casa"
    assert clave_para_categoria(nuevo) == clave_para_categoria(categoria.nombre) == "postres"
    antes = await _menu(cliente, restaurante)
    hecho = await cliente.patch(
        f"{A}/categorias/{categoria.id}", json={"nombre": nuevo}, headers=cabecera_operador
    )
    assert hecho.status_code == 200, hecho.text
    despues = await _menu(cliente, restaurante)
    [salido] = despues.json()["categorias"][0]["platillos"]
    assert salido["ilustracion_clave"] == "postres"  # la ilustración no se movió
    assert despues.json()["categorias"][0]["nombre"] == nuevo
    assert despues.headers["etag"] != antes.headers["etag"]
    detalle = await cliente.get(f"{P}/platillos/{plato.id}")
    assert detalle.json()["categoria_nombre"] == nuevo


@pytest.mark.ac("AC-04.2", "AC-04.1")
async def test_subir_y_quitar_la_foto_mueve_el_etag(
    cliente: AsyncClient,
    restaurante: Restaurante,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    sin_foto = await _menu(cliente, restaurante)
    subida = await cliente.post(
        f"{A}/platillos/{platillo.id}/foto",
        files={"archivo": ("foto.jpg", img.jpeg(800, 600), "image/jpeg")},
        headers=cabecera_operador,
    )
    assert subida.status_code == 200, subida.text
    con_foto = await _menu(cliente, restaurante)
    plato = con_foto.json()["categorias"][0]["platillos"][0]
    assert plato["imagen_tipo"] == "foto"
    assert plato["foto_thumb_url"] and plato["foto_detalle_url"]
    assert plato["foto_thumb_url"] != plato["foto_detalle_url"]
    assert con_foto.headers["etag"] != sin_foto.headers["etag"]
    quitada = await cliente.delete(f"{A}/platillos/{platillo.id}/foto", headers=cabecera_operador)
    assert quitada.status_code == 200, quitada.text
    sin_otra_vez = await _menu(cliente, restaurante)
    assert sin_otra_vez.headers["etag"] not in {
        sin_foto.headers["etag"],
        con_foto.headers["etag"],
    } or (sin_otra_vez.json()["categorias"][0]["platillos"][0]["imagen_tipo"] != "foto")
    assert sin_otra_vez.json()["categorias"][0]["platillos"][0]["foto_thumb_url"] is None


# ===========================================================================
# g · el slug se compara completo
# ===========================================================================


@pytest.mark.ac("AC-04.1")
@pytest.mark.parametrize("slug", ["a%0A", "ab%0A", "a%20", "%E3%80%80", "a%0D%0A"])
async def test_un_slug_con_salto_de_linea_o_espacio_al_final_es_404(
    cliente: AsyncClient,
    fabrica_restaurante: Fabrica,
    monkeypatch: pytest.MonkeyPatch,
    slug: str,
) -> None:
    await fabrica_restaurante(slug="a")
    await fabrica_restaurante(slug="ab")

    async def _no(*_: Any, **__: Any) -> None:
        raise AssertionError("un slug sin forma de slug no se consulta")

    monkeypatch.setattr(servicio, "_armar", _no)
    respuesta = await cliente.get(f"{P}/menu/{slug}")
    assert respuesta.status_code == 404
    assert respuesta.json()["error"]["codigo"] == "RECURSO_NO_ENCONTRADO"


# ===========================================================================
# h · actualizado_en
# ===========================================================================


@pytest.mark.ac("AC-04.1")
async def test_el_actualizado_en_es_el_del_platillo_mas_reciente(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    fabrica_platillo: Fabrica,
) -> None:
    viejo = await fabrica_platillo(restaurante, categoria, nombre="Viejo")
    nuevo = await fabrica_platillo(restaurante, categoria, nombre="Nuevo")
    for plato, fecha in (
        (viejo, datetime(2031, 1, 2, 3, 4, 5, tzinfo=UTC)),
        (nuevo, datetime(2031, 5, 6, 7, 8, 9, tzinfo=UTC)),
    ):
        await sesion.execute(
            update(Platillo).where(Platillo.id == plato.id).values(actualizado_en=fecha)
        )
    await sesion.commit()
    cuerpo = (await _menu(cliente, restaurante)).json()
    assert datetime.fromisoformat(cuerpo["actualizado_en"]) == datetime(
        2031, 5, 6, 7, 8, 9, tzinfo=UTC
    )


# ===========================================================================
# i · casos límite
# ===========================================================================


@pytest.mark.ac("AC-04.1")
async def test_un_restaurante_sin_categorias_responde_200_con_el_menu_vacio(
    cliente: AsyncClient, restaurante: Restaurante
) -> None:
    respuesta = await _menu(cliente, restaurante)
    assert respuesta.status_code == 200
    assert respuesta.json()["categorias"] == []
    assert respuesta.json()["destacados"] == []
    assert respuesta.json()["restaurante"]["slug"] == restaurante.slug


@pytest.mark.ac("AC-04.1")
async def test_el_etag_de_otro_restaurante_no_da_304(
    cliente: AsyncClient,
    restaurante: Restaurante,
    platillo: Platillo,
    fabrica_restaurante: Fabrica,
    fabrica_categoria: Fabrica,
    fabrica_platillo: Fabrica,
) -> None:
    ajeno: Restaurante = await fabrica_restaurante()
    await fabrica_platillo(ajeno, await fabrica_categoria(ajeno), nombre="Ajeno")
    de_otro = (await _menu(cliente, ajeno)).headers["etag"]
    respuesta = await _menu(cliente, restaurante, **{"If-None-Match": de_otro})
    assert respuesta.status_code == 200
    assert respuesta.headers["etag"] != de_otro


@pytest.mark.ac("AC-04.1")
async def test_los_textos_salen_integros_sin_escapar_ni_recortar(
    cliente: AsyncClient,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    fabrica_platillo: Fabrica,
) -> None:
    texto = 'Tacos "al pastor" 🌮 <b>ñandú</b> & más \\ \' </script>'
    plato = await fabrica_platillo(restaurante, categoria, nombre=texto, descripcion=texto)
    salido = (await _menu(cliente, restaurante)).json()["categorias"][0]["platillos"][0]
    assert salido["nombre"] == salido["descripcion"] == texto
    detalle = (await cliente.get(f"{P}/platillos/{plato.id}")).json()
    assert detalle["nombre"] == detalle["descripcion"] == texto


@pytest.mark.ac("AC-04.1")
@pytest.mark.parametrize("ruta", ["menu/{slug}", "platillos/{plato}"])
async def test_un_get_con_content_length_enorme_es_413_sin_leer(
    cliente: AsyncClient, restaurante: Restaurante, platillo: Platillo, ruta: str
) -> None:
    url = f"{P}/" + ruta.format(slug=restaurante.slug, plato=platillo.id)
    respuesta = await cliente.get(url, headers={"Content-Length": str(30 * 1024 * 1024)})
    assert respuesta.status_code == 413
    assert respuesta.json()["error"]["codigo"] == "ARCHIVO_EXCEDE_LIMITE"
