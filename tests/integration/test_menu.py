"""T-2.2: `GET /p/menu/{slug}` (AC-04.1, AC-04.2, AC-04.4).

Público, sin cookie, cacheable en el borde: qué sale (sólo platillos activos de categorías
activas, el agotado marcado), el `ETag` que cambia con el contenido, el `304`, la caché de 30 s
por worker y lo que sirve cada worker después de un `PATCH` (con varios, la memoria de otro no
ve la invalidación).
"""

from __future__ import annotations

import json
from collections.abc import Iterator
from decimal import Decimal
from typing import Any
from uuid import UUID

import pytest
from httpx import AsyncClient, Response
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CategoriaMenu, Platillo, Restaurante
from app.schemas.menu_publico import MenuPublico
from app.services import menu_publico as servicio
from app.services.cache_menu import cache_menu
from tests.conftest import Fabrica
from tests.invitado_pruebas import sin_request_id

P = "/api/v1/p"
A = "/api/v1/admin"
CACHE_LITERAL = "public, max-age=30, s-maxage=60"
INEXISTENTE = "no-existe-este-restaurante"

CAMPOS_PLATILLO = {
    "id",
    "categoria_id",
    "nombre",
    "descripcion",
    "precio",
    "disponible",
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
}


class Reloj:
    """Reloj monótono falso de `cache_menu`: la edad de la copia local se controla a mano."""

    def __init__(self) -> None:
        self.ahora = 1000.0

    def __call__(self) -> float:
        return self.ahora

    def avanzar(self, segundos: float) -> None:
        self.ahora += segundos


@pytest.fixture(autouse=True)
def reloj() -> Iterator[Reloj]:
    falso = Reloj()
    anterior, ventana = cache_menu.reloj, cache_menu.ventana
    cache_menu.reloj = falso
    cache_menu.ventana = 0.01
    cache_menu.vaciar()
    try:
        yield falso
    finally:
        cache_menu.cancelar_purgas()
        cache_menu.reloj, cache_menu.ventana = anterior, ventana
        cache_menu.vaciar()


class Lecturas:
    """Cuenta cuántas veces el servicio fue a la base (`_armar`)."""

    def __init__(self, monkeypatch: pytest.MonkeyPatch) -> None:
        self.cuantas = 0
        self._original = servicio._armar

        async def _contar(*args: Any, **kwargs: Any) -> Any:
            self.cuantas += 1
            return await self._original(*args, **kwargs)

        monkeypatch.setattr(servicio, "_armar", _contar)


@pytest.fixture
def lecturas(monkeypatch: pytest.MonkeyPatch) -> Lecturas:
    return Lecturas(monkeypatch)


async def _menu(cliente: AsyncClient, restaurante: Restaurante, **cabeceras: str) -> Response:
    return await cliente.get(f"{P}/menu/{restaurante.slug}", headers=cabeceras)


def _nombres(cuerpo: dict[str, Any]) -> list[list[str]]:
    return [[p["nombre"] for p in c["platillos"]] for c in cuerpo["categorias"]]


# ===========================================================================
# AC-04.1 · qué sale
# ===========================================================================


@pytest.mark.ac("AC-04.1", "AC-04.2")
async def test_el_menu_es_publico_y_sale_con_el_contrato(
    cliente: AsyncClient, restaurante: Restaurante, categoria: CategoriaMenu, platillo: Platillo
) -> None:
    respuesta = await _menu(cliente, restaurante)  # sin cookie
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.headers["content-type"] == "application/json"
    assert respuesta.headers["cache-control"] == CACHE_LITERAL
    assert respuesta.headers["etag"].startswith('"')
    cuerpo = respuesta.json()
    MenuPublico.model_validate(cuerpo)
    assert set(cuerpo) == {"restaurante", "categorias", "destacados", "actualizado_en"}
    assert cuerpo["restaurante"] == {
        "nombre": restaurante.nombre,
        "slug": restaurante.slug,
        "logo_url": None,
        "tema": "vino",
    }
    [grupo] = cuerpo["categorias"]
    assert set(grupo) == {"id", "nombre", "orden", "platillos"}
    assert grupo["id"] == str(categoria.id)
    [salido] = grupo["platillos"]
    assert set(salido) == CAMPOS_PLATILLO
    assert salido["id"] == str(platillo.id)
    assert salido["nombre"] == platillo.nombre
    assert salido["precio"] == 100.0  # número, no texto (contrato)
    assert salido["disponible"] is True


@pytest.mark.ac("AC-04.1")
async def test_una_cookie_invalida_no_cambia_el_menu(
    cliente: AsyncClient, restaurante: Restaurante, platillo: Platillo
) -> None:
    sin = await _menu(cliente, restaurante)
    con = await _menu(cliente, restaurante, Cookie="carta_invitado=basura")
    assert con.status_code == 200
    assert con.json() == sin.json()


@pytest.mark.ac("AC-04.1")
async def test_ningun_campo_interno_sale_en_el_menu(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    fabrica_platillo: Fabrica,
) -> None:
    await fabrica_platillo(
        restaurante,
        categoria,
        foto_url="https://x/o.jpg",
        foto_original_url="https://x/original.jpg",
        foto_thumb_url="https://x/t.jpg",
        foto_detalle_url="https://x/d.jpg",
    )
    texto = (await _menu(cliente, restaurante)).text
    for prohibido in (
        "restaurante_id",
        "activo",
        "no_disponible",
        "foto_original_url",
        '"foto_url"',
        "creado_en",
        str(restaurante.id),
        "original.jpg",
        "direccion",
        "telefono",
        "email",
    ):
        assert prohibido not in texto, prohibido
    assert "https://x/t.jpg" in texto and "https://x/d.jpg" in texto


@pytest.mark.ac("AC-04.1")
async def test_categorias_y_platillos_salen_por_orden(
    cliente: AsyncClient,
    restaurante: Restaurante,
    fabrica_categoria: Fabrica,
    fabrica_platillo: Fabrica,
) -> None:
    postres = await fabrica_categoria(restaurante, nombre="Postres", orden=3)
    entradas = await fabrica_categoria(restaurante, nombre="Entradas", orden=1)
    fuertes = await fabrica_categoria(restaurante, nombre="Fuertes", orden=2)
    await fabrica_platillo(restaurante, postres, nombre="Flan", orden=1)
    await fabrica_platillo(restaurante, entradas, nombre="Sopa", orden=2)
    await fabrica_platillo(restaurante, entradas, nombre="Ceviche", orden=1)
    await fabrica_platillo(restaurante, fuertes, nombre="Asado", orden=1)
    cuerpo = (await _menu(cliente, restaurante)).json()
    assert [c["nombre"] for c in cuerpo["categorias"]] == ["Entradas", "Fuertes", "Postres"]
    assert _nombres(cuerpo) == [["Ceviche", "Sopa"], ["Asado"], ["Flan"]]


@pytest.mark.ac("AC-04.1")
async def test_un_platillo_inactivo_no_aparece(
    cliente: AsyncClient,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    fabrica_platillo: Fabrica,
) -> None:
    await fabrica_platillo(restaurante, categoria, nombre="Visible", orden=1)
    await fabrica_platillo(restaurante, categoria, nombre="De baja", orden=2, activo=False)
    cuerpo = (await _menu(cliente, restaurante)).json()
    assert _nombres(cuerpo) == [["Visible"]]
    assert "De baja" not in json.dumps(cuerpo)


@pytest.mark.ac("AC-04.1")
async def test_los_platillos_de_una_categoria_inactiva_no_aparecen(
    cliente: AsyncClient,
    restaurante: Restaurante,
    fabrica_categoria: Fabrica,
    fabrica_platillo: Fabrica,
) -> None:
    viva = await fabrica_categoria(restaurante, nombre="Viva", orden=1)
    baja = await fabrica_categoria(restaurante, nombre="Baja", orden=2, activa=False)
    await fabrica_platillo(restaurante, viva, nombre="Arriba")
    await fabrica_platillo(restaurante, baja, nombre="Oculto", activo=True)  # sigue activo
    cuerpo = (await _menu(cliente, restaurante)).json()
    assert [c["nombre"] for c in cuerpo["categorias"]] == ["Viva"]
    assert "Oculto" not in json.dumps(cuerpo)


@pytest.mark.ac("AC-04.1")
async def test_una_categoria_sin_platillos_visibles_y_un_platillo_sin_categoria_no_salen(
    cliente: AsyncClient,
    restaurante: Restaurante,
    fabrica_categoria: Fabrica,
    fabrica_platillo: Fabrica,
) -> None:
    await fabrica_categoria(restaurante, nombre="Vacía", orden=1)
    sin_platillos = await fabrica_categoria(restaurante, nombre="Sólo baja", orden=2)
    await fabrica_platillo(restaurante, sin_platillos, nombre="Baja", activo=False)
    await fabrica_platillo(restaurante, None, nombre="Huérfano")
    cuerpo = (await _menu(cliente, restaurante)).json()
    assert cuerpo["categorias"] == []
    assert cuerpo["destacados"] == []
    assert (await _menu(cliente, restaurante)).status_code == 200


@pytest.mark.ac("AC-04.1")
async def test_no_se_mezclan_restaurantes(
    cliente: AsyncClient,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    fabrica_restaurante: Fabrica,
    fabrica_categoria: Fabrica,
    fabrica_platillo: Fabrica,
) -> None:
    ajeno: Restaurante = await fabrica_restaurante()
    cat_ajena = await fabrica_categoria(ajeno, nombre="Ajena")
    await fabrica_platillo(ajeno, cat_ajena, nombre="Secreto del otro")
    await fabrica_platillo(restaurante, categoria, nombre="Mío")
    propio = (await _menu(cliente, restaurante)).json()
    otro = (await _menu(cliente, ajeno)).json()
    assert _nombres(propio) == [["Mío"]]
    assert _nombres(otro) == [["Secreto del otro"]]


@pytest.mark.ac("AC-04.1")
async def test_los_destacados_son_los_tres_primeros_visibles_en_orden_del_menu(
    cliente: AsyncClient,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    fabrica_platillo: Fabrica,
) -> None:
    uno = await fabrica_platillo(restaurante, categoria, nombre="Uno", orden=1, destacado=True)
    await fabrica_platillo(restaurante, categoria, nombre="Normal", orden=2)
    dos = await fabrica_platillo(restaurante, categoria, nombre="Dos", orden=3, destacado=True)
    await fabrica_platillo(
        restaurante, categoria, nombre="Baja", orden=4, destacado=True, activo=False
    )
    tres = await fabrica_platillo(restaurante, categoria, nombre="Tres", orden=5, destacado=True)
    await fabrica_platillo(restaurante, categoria, nombre="Cuatro", orden=6, destacado=True)
    cuerpo = (await _menu(cliente, restaurante)).json()
    assert cuerpo["destacados"] == [str(uno.id), str(dos.id), str(tres.id)]


@pytest.mark.ac("AC-04.1")
async def test_el_actualizado_en_es_el_cambio_mas_reciente(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    fabrica_platillo: Fabrica,
) -> None:
    viejo = await fabrica_platillo(restaurante, categoria, nombre="Viejo")
    nuevo = await fabrica_platillo(restaurante, categoria, nombre="Nuevo")
    await sesion.refresh(viejo)
    await sesion.refresh(nuevo)
    cuerpo = (await _menu(cliente, restaurante)).json()
    esperado = max(restaurante.actualizado_en, viejo.actualizado_en, nuevo.actualizado_en)
    assert cuerpo["actualizado_en"].startswith(esperado.strftime("%Y-%m-%dT%H:%M:%S"))


# ===========================================================================
# AC-04.4 · el agotado aparece marcado
# ===========================================================================


@pytest.mark.ac("AC-04.4")
async def test_un_platillo_no_disponible_aparece_marcado(
    cliente: AsyncClient,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    fabrica_platillo: Fabrica,
) -> None:
    await fabrica_platillo(restaurante, categoria, nombre="Hay", orden=1)
    await fabrica_platillo(restaurante, categoria, nombre="Agotado", orden=2, disponible=False)
    [grupo] = (await _menu(cliente, restaurante)).json()["categorias"]
    assert [(p["nombre"], p["disponible"]) for p in grupo["platillos"]] == [
        ("Hay", True),
        ("Agotado", False),
    ]


# ===========================================================================
# 404: inexistente, inactivo y sin forma de slug son el mismo
# ===========================================================================


@pytest.mark.ac("AC-04.1")
async def test_restaurante_inexistente_e_inactivo_dan_el_mismo_404(
    cliente: AsyncClient,
    sesion: AsyncSession,
    fabrica_restaurante: Fabrica,
    fabrica_categoria: Fabrica,
    fabrica_platillo: Fabrica,
) -> None:
    inactivo: Restaurante = await fabrica_restaurante(activo=False)
    categoria = await fabrica_categoria(inactivo)
    await fabrica_platillo(inactivo, categoria)
    de_baja = await _menu(cliente, inactivo)
    ninguno = await cliente.get(f"{P}/menu/{INEXISTENTE}")
    assert de_baja.status_code == ninguno.status_code == 404
    assert sin_request_id(de_baja.json()) == sin_request_id(ninguno.json())
    assert de_baja.json()["error"]["codigo"] == "RECURSO_NO_ENCONTRADO"
    assert de_baja.headers["cache-control"] == ninguno.headers["cache-control"] == "no-store"


@pytest.mark.ac("AC-04.1")
@pytest.mark.parametrize(
    "slug",
    [
        "a%00b",  # NUL: el driver lo rechazaría con 500
        "%00",
        "La-Ceiba",  # mayúsculas: ningún slug las tiene
        "con%20espacio",
        "guion-",
        "-guion",
        "doble--guion",
        "x" * 61,
        "a%C3%B1o",
        "..%2Fadmin",
    ],
)
async def test_un_slug_sin_forma_valida_es_404_y_no_se_consulta(
    cliente: AsyncClient, monkeypatch: pytest.MonkeyPatch, slug: str
) -> None:
    async def _no(*_: Any, **__: Any) -> None:
        raise AssertionError("un slug sin forma de slug no se consulta")

    monkeypatch.setattr(servicio, "_armar", _no)
    respuesta = await cliente.get(f"{P}/menu/{slug}")
    assert respuesta.status_code == 404
    assert respuesta.json()["error"]["codigo"] == "RECURSO_NO_ENCONTRADO"


@pytest.mark.ac("AC-04.1")
async def test_un_404_no_se_guarda_en_la_cache(
    cliente: AsyncClient, lecturas: Lecturas, fabrica_restaurante: Fabrica
) -> None:
    for _ in range(2):
        assert (await cliente.get(f"{P}/menu/{INEXISTENTE}")).status_code == 404
    assert lecturas.cuantas == 2
    nuevo: Restaurante = await fabrica_restaurante(slug=INEXISTENTE)
    assert (await _menu(cliente, nuevo)).status_code == 200  # el 404 anterior no estorba


# ===========================================================================
# ETag, 304 y caché de 30 s
# ===========================================================================


@pytest.mark.ac("AC-04.1")
@pytest.mark.parametrize(
    "condicion",
    [
        "{etag}",
        "W/{etag}",
        '"otro", {etag}',
        "*",
    ],
)
async def test_if_none_match_vigente_responde_304_sin_cuerpo(
    cliente: AsyncClient, restaurante: Restaurante, platillo: Platillo, condicion: str
) -> None:
    primera = await _menu(cliente, restaurante)
    etag = primera.headers["etag"]
    segunda = await _menu(cliente, restaurante, **{"If-None-Match": condicion.format(etag=etag)})
    assert segunda.status_code == 304
    assert segunda.content == b""
    assert segunda.headers["etag"] == etag
    assert segunda.headers["cache-control"] == CACHE_LITERAL


@pytest.mark.ac("AC-04.1")
async def test_if_none_match_viejo_devuelve_el_menu_completo(
    cliente: AsyncClient, restaurante: Restaurante, platillo: Platillo
) -> None:
    respuesta = await _menu(cliente, restaurante, **{"If-None-Match": '"viejo"'})
    assert respuesta.status_code == 200
    assert respuesta.json()["categorias"]


@pytest.mark.ac("AC-04.1")
async def test_el_304_dentro_de_la_vigencia_no_toca_la_base(
    cliente: AsyncClient, restaurante: Restaurante, platillo: Platillo, lecturas: Lecturas
) -> None:
    primera = await _menu(cliente, restaurante)
    for _ in range(3):
        repetida = await _menu(cliente, restaurante, **{"If-None-Match": primera.headers["etag"]})
        assert repetida.status_code == 304
    assert (await _menu(cliente, restaurante)).content == primera.content
    assert lecturas.cuantas == 1  # sólo la primera fue a la base


@pytest.mark.ac("AC-04.1")
async def test_la_cache_vence_a_los_30_segundos(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    platillo: Platillo,
    lecturas: Lecturas,
    reloj: Reloj,
) -> None:
    await _menu(cliente, restaurante)
    reloj.avanzar(29)
    await _menu(cliente, restaurante)
    assert lecturas.cuantas == 1
    reloj.avanzar(2)  # 31 s
    await _menu(cliente, restaurante)
    assert lecturas.cuantas == 2


@pytest.mark.ac("AC-04.1")
async def test_el_etag_es_estable_si_el_contenido_no_cambia(
    cliente: AsyncClient, restaurante: Restaurante, platillo: Platillo, reloj: Reloj
) -> None:
    primero = (await _menu(cliente, restaurante)).headers["etag"]
    reloj.avanzar(45)  # la copia caducó y se vuelve a armar
    assert (await _menu(cliente, restaurante)).headers["etag"] == primero


# ===========================================================================
# Tras un PATCH, el ETag cambia en la siguiente petición (el Verificar de la tarea)
# ===========================================================================


@pytest.mark.ac("AC-04.4", "AC-04.1")
async def test_tras_un_patch_de_un_platillo_el_etag_cambia(
    cliente: AsyncClient,
    restaurante: Restaurante,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    antes = await _menu(cliente, restaurante)
    cambio = await cliente.patch(
        f"{A}/platillos/{platillo.id}",
        json={"nombre": "Nombre nuevo", "precio": "120.50"},
        headers=cabecera_operador,
    )
    assert cambio.status_code == 200, cambio.text
    despues = await _menu(cliente, restaurante)  # inmediatamente, sin esperar los 30 s
    assert despues.headers["etag"] != antes.headers["etag"]
    assert despues.json()["categorias"][0]["platillos"][0]["nombre"] == "Nombre nuevo"
    assert despues.json()["categorias"][0]["platillos"][0]["precio"] == 120.5
    # El ETag anterior ya no vale: el comensal recibe el menú nuevo, no un 304.
    revalidado = await _menu(cliente, restaurante, **{"If-None-Match": antes.headers["etag"]})
    assert revalidado.status_code == 200


@pytest.mark.ac("AC-04.4")
async def test_marcar_agotado_se_ve_en_la_siguiente_peticion(
    cliente: AsyncClient,
    restaurante: Restaurante,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    antes = await _menu(cliente, restaurante)
    cambio = await cliente.patch(
        f"{A}/platillos/{platillo.id}", json={"disponible": False}, headers=cabecera_operador
    )
    assert cambio.status_code == 200
    despues = await _menu(cliente, restaurante)
    assert despues.headers["etag"] != antes.headers["etag"]
    assert despues.json()["categorias"][0]["platillos"][0]["disponible"] is False


@pytest.mark.ac("AC-04.1")
async def test_dar_de_baja_un_platillo_lo_quita_en_la_siguiente_peticion(
    cliente: AsyncClient,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    platillo: Platillo,
    fabrica_platillo: Fabrica,
    cabecera_operador: dict[str, str],
) -> None:
    await fabrica_platillo(restaurante, categoria, nombre="Se queda", orden=99)
    antes = await _menu(cliente, restaurante)
    baja = await cliente.delete(f"{A}/platillos/{platillo.id}", headers=cabecera_operador)
    assert baja.status_code == 204
    despues = await _menu(cliente, restaurante)
    assert despues.headers["etag"] != antes.headers["etag"]
    assert _nombres(despues.json()) == [["Se queda"]]


@pytest.mark.ac("AC-04.1")
async def test_renombrar_o_dar_de_baja_una_categoria_cambia_el_etag(
    cliente: AsyncClient,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    """`categoria_menu` no tiene `actualizado_en`: el ETag no puede depender de eso."""
    inicial = (await _menu(cliente, restaurante)).headers["etag"]
    nombre = await cliente.patch(
        f"{A}/categorias/{categoria.id}", json={"nombre": "Otro nombre"}, headers=cabecera_operador
    )
    assert nombre.status_code == 200, nombre.text
    renombrada = await _menu(cliente, restaurante)
    assert renombrada.headers["etag"] != inicial
    assert renombrada.json()["categorias"][0]["nombre"] == "Otro nombre"
    baja = await cliente.delete(f"{A}/categorias/{categoria.id}", headers=cabecera_operador)
    assert baja.status_code == 204
    sin = await _menu(cliente, restaurante)
    assert sin.json()["categorias"] == []
    assert sin.headers["etag"] not in {inicial, renombrada.headers["etag"]}


@pytest.mark.ac("AC-04.1")
async def test_cambiar_el_logo_del_restaurante_se_ve_en_la_siguiente_peticion(
    cliente: AsyncClient,
    restaurante: Restaurante,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    antes = await _menu(cliente, restaurante)
    cambio = await cliente.patch(
        f"{A}/restaurantes/{restaurante.id}",
        json={"logo_url": "https://ejemplo.mx/logo.png"},
        headers=cabecera_operador,
    )
    assert cambio.status_code == 200, cambio.text
    despues = await _menu(cliente, restaurante)
    assert despues.headers["etag"] != antes.headers["etag"]
    assert despues.json()["restaurante"]["logo_url"] == "https://ejemplo.mx/logo.png"


# ===========================================================================
# Carreras y varios workers
# ===========================================================================


@pytest.mark.ac("AC-04.4")
async def test_un_menu_leido_antes_de_una_escritura_no_se_guarda(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    platillo: Platillo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """La lectura arma el menú viejo, una escritura confirma e invalida mientras tanto, y
    la lectura termina: lo viejo no se queda 30 s (la generación se toma antes de leer)."""
    nombre_inicial = platillo.nombre
    original = servicio._armar
    una_vez = {"pendiente": True}

    async def _armar_y_escribir(*args: Any, **kwargs: Any) -> Any:
        viejo = await original(*args, **kwargs)
        if una_vez["pendiente"]:
            una_vez["pendiente"] = False
            await args[0].execute(  # la escritura de otra petición, ya confirmada
                update(Platillo).where(Platillo.id == platillo.id).values(nombre="Después")
            )
            await args[0].commit()
            cache_menu.invalidar(restaurante.slug)  # lo que hace T-1.3 tras el commit
        return viejo

    monkeypatch.setattr(servicio, "_armar", _armar_y_escribir)
    primera = await _menu(cliente, restaurante)  # respondió con lo que leyó antes del cambio
    assert primera.json()["categorias"][0]["platillos"][0]["nombre"] == nombre_inicial
    siguiente = await _menu(cliente, restaurante)
    assert siguiente.json()["categorias"][0]["platillos"][0]["nombre"] == "Después"
    assert siguiente.headers["etag"] != primera.headers["etag"]


@pytest.mark.ac("AC-04.4")
async def test_otro_worker_sirve_su_copia_hasta_30_s_pero_el_borde_no_la_guarda_60_mas(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    platillo: Platillo,
    reloj: Reloj,
) -> None:
    """Con N workers el `PATCH` invalida sólo la memoria de uno. Aquí el cambio entra a la
    base sin invalidar (lo atendió otro worker): este worker sigue con su copia, pero cada
    respuesta descuenta la edad de la copia, así que el borde nunca guarda un menú más de
    60 s contando desde que se armó (y el navegador, 30)."""
    nombre_inicial = platillo.nombre
    inicial = await _menu(cliente, restaurante)
    assert inicial.headers["cache-control"] == CACHE_LITERAL
    await sesion.execute(update(Platillo).where(Platillo.id == platillo.id).values(nombre="Nuevo"))
    await sesion.commit()
    reloj.avanzar(20)
    viejo = await _menu(cliente, restaurante)
    assert viejo.json()["categorias"][0]["platillos"][0]["nombre"] == nombre_inicial
    assert viejo.headers["etag"] == inicial.headers["etag"]
    assert viejo.headers["cache-control"] == "public, max-age=10, s-maxage=40"
    revalidado = await _menu(cliente, restaurante, **{"If-None-Match": inicial.headers["etag"]})
    assert revalidado.status_code == 304
    assert revalidado.headers["cache-control"] == "public, max-age=10, s-maxage=40"
    reloj.avanzar(11)  # 31 s: la copia caducó
    nuevo = await _menu(cliente, restaurante)
    assert nuevo.json()["categorias"][0]["platillos"][0]["nombre"] == "Nuevo"
    assert nuevo.headers["etag"] != inicial.headers["etag"]
    assert nuevo.headers["cache-control"] == CACHE_LITERAL


@pytest.mark.ac("AC-04.4")
@pytest.mark.parametrize(
    ("edad", "esperado"),
    [
        (0, CACHE_LITERAL),
        (0.9, CACHE_LITERAL),
        (1, "public, max-age=29, s-maxage=59"),
        (15, "public, max-age=15, s-maxage=45"),
        (29.9, "public, max-age=1, s-maxage=31"),
    ],
)
async def test_los_tiempos_de_cache_descuentan_la_edad_de_la_copia(
    cliente: AsyncClient,
    restaurante: Restaurante,
    platillo: Platillo,
    reloj: Reloj,
    edad: float,
    esperado: str,
) -> None:
    await _menu(cliente, restaurante)
    reloj.avanzar(edad)
    assert (await _menu(cliente, restaurante)).headers["cache-control"] == esperado


@pytest.mark.ac("AC-04.1")
async def test_el_cuerpo_del_menu_es_el_mismo_para_cualquiera_con_o_sin_cache(
    cliente: AsyncClient, restaurante: Restaurante, platillo: Platillo
) -> None:
    a = await _menu(cliente, restaurante)
    b = await _menu(cliente, restaurante)  # de la copia
    assert a.content == b.content
    cache_menu.vaciar()
    c = await _menu(cliente, restaurante)  # de la base
    assert c.content == a.content and c.headers["etag"] == a.headers["etag"]


@pytest.mark.ac("AC-04.1")
async def test_el_precio_sale_con_dos_decimales_de_la_base(
    cliente: AsyncClient,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    fabrica_platillo: Fabrica,
) -> None:
    await fabrica_platillo(restaurante, categoria, precio=Decimal("245.50"))
    [plato] = (await _menu(cliente, restaurante)).json()["categorias"][0]["platillos"]
    assert plato["precio"] == 245.5
    assert UUID(plato["id"])
