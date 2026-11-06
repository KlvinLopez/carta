"""T-1.3: categorías y platillos del operador (US-16, AC-16.1 a AC-16.3).

Cubre: crear, editar, reordenar y desactivar categorías y platillos con las rutas reales de
`/api/v1/admin` (AC-16.1); las validaciones de AC-16.2 como 422 y nunca 500 (nombre,
precio cuantizado, picante, paginación, nulos en `PATCH`); la baja lógica con historial de
órdenes (AC-16.3); el aislamiento por operador de las rutas por id de categoría; la
invalidación de la caché del menú en cada escritura, y la traducción de `IntegrityError`.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from collections.abc import Iterator
from decimal import Decimal
from typing import Any
from uuid import UUID

import httpx
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errores import ErrorCarta
from app.db.models import (
    CategoriaMenu,
    ItemOrden,
    Mesa,
    MiembroSesion,
    OrdenPersonal,
    Platillo,
    Restaurante,
    SesionGrupal,
)
from app.schemas.comun import ErrorRespuesta
from app.services import menu
from app.services.cache_menu import CacheMenu, PurgadorCloudflare, cache_menu
from tests.conftest import Fabrica

A = "/api/v1/admin"
UUID_X = "00000000-0000-4000-8000-0000000000aa"
FAMILIA = "\U0001f468‍\U0001f469‍\U0001f467‍\U0001f466"  # 1 grafema, 7 puntos


def _codigo(respuesta: httpx.Response) -> str:
    codigo: str = ErrorRespuesta.model_validate(respuesta.json()).error.codigo
    return codigo


# ---------------------------------------------------------------------------
# Caché: cada prueba empieza vacía y con un Cloudflare falso que anota las purgas
# ---------------------------------------------------------------------------


class CloudflareFalso:
    def __init__(self) -> None:
        self.peticiones: list[httpx.Request] = []
        self.respuesta: httpx.Response | Exception = httpx.Response(200, json={"success": True})
        self.demora = 0.0

    async def __call__(self, peticion: httpx.Request) -> httpx.Response:
        self.peticiones.append(peticion)
        if self.demora:
            await asyncio.sleep(self.demora)
        if isinstance(self.respuesta, Exception):
            raise self.respuesta
        return self.respuesta

    @property
    def urls(self) -> list[str]:
        return [u for p in self.peticiones for u in json.loads(p.content)["files"]]


@pytest.fixture(autouse=True)
def cloudflare() -> Iterator[CloudflareFalso]:
    falso = CloudflareFalso()
    cliente = httpx.AsyncClient(transport=httpx.MockTransport(falso))
    anterior, ventana = cache_menu.purgador, cache_menu.ventana
    cache_menu.purgador = PurgadorCloudflare("zona-pruebas", "token-pruebas", cliente=cliente)
    cache_menu.ventana = 0.01  # la purga sale en segundo plano; `esperar_purgas()` la espera
    cache_menu.vaciar()
    try:
        yield falso
    finally:
        cache_menu.cancelar_purgas()
        cache_menu.purgador, cache_menu.ventana = anterior, ventana
        cache_menu.vaciar()


def _url_menu(restaurante: Restaurante) -> str:
    return f"https://{settings.DOMINIO}/api/v1/p/menu/{restaurante.slug}"


@pytest.fixture
async def ajeno(fabrica_restaurante: Fabrica, fabrica_operador: Fabrica) -> Restaurante:
    restaurante: Restaurante = await fabrica_restaurante()
    await fabrica_operador(restaurante)
    return restaurante


# ===========================================================================
# AC-16.1 · crear, editar, reordenar y desactivar categorías
# ===========================================================================


@pytest.mark.ac("AC-16.1")
async def test_crear_y_listar_categorias_en_orden(
    cliente: AsyncClient, restaurante: Restaurante, cabecera_operador: dict[str, str]
) -> None:
    for nombre in ("Entradas", " Fuertes ", "Postres"):
        creada = await cliente.post(
            f"{A}/restaurantes/{restaurante.id}/categorias",
            json={"nombre": nombre},
            headers=cabecera_operador,
        )
        assert creada.status_code == 201, creada.text
    lista = await cliente.get(
        f"{A}/restaurantes/{restaurante.id}/categorias", headers=cabecera_operador
    )
    assert lista.status_code == 200
    assert [(c["nombre"], c["orden"], c["activa"]) for c in lista.json()] == [
        ("Entradas", 1, True),
        ("Fuertes", 2, True),
        ("Postres", 3, True),
    ]
    assert lista.headers["cache-control"] == "private, no-store"


@pytest.mark.ac("AC-16.1")
async def test_editar_desactivar_y_reactivar_una_categoria(
    cliente: AsyncClient,
    sesion: AsyncSession,
    categoria: CategoriaMenu,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    editada = await cliente.patch(
        f"{A}/categorias/{categoria.id}", json={"nombre": "Botanas"}, headers=cabecera_operador
    )
    assert editada.status_code == 200, editada.text
    assert editada.json()["nombre"] == "Botanas"

    baja = await cliente.delete(f"{A}/categorias/{categoria.id}", headers=cabecera_operador)
    assert baja.status_code == 204
    assert baja.content == b""
    await sesion.refresh(categoria)
    await sesion.refresh(platillo)
    assert categoria.activa is False  # baja lógica: la fila sigue
    assert platillo.categoria_id == categoria.id  # sus platillos no se tocan

    activas = await cliente.get(
        f"{A}/restaurantes/{categoria.restaurante_id}/categorias",
        params={"activa": "true"},
        headers=cabecera_operador,
    )
    assert activas.json() == []
    vuelta = await cliente.patch(
        f"{A}/categorias/{categoria.id}", json={"activa": True}, headers=cabecera_operador
    )
    assert vuelta.json()["activa"] is True


@pytest.mark.ac("AC-16.1")
async def test_reordenar_categorias(
    cliente: AsyncClient,
    restaurante: Restaurante,
    fabrica_categoria: Fabrica,
    cabecera_operador: dict[str, str],
) -> None:
    a, b, c, d = [await fabrica_categoria(restaurante, nombre=n) for n in "ABCD"]
    respuesta = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/categorias/reordenar",
        json={"ids": [str(c.id), str(a.id)]},
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 200, respuesta.text
    # Los enviados primero; los demás después, en el orden que tenían.
    assert [(x["nombre"], x["orden"]) for x in respuesta.json()] == [
        ("C", 1),
        ("A", 2),
        ("B", 3),
        ("D", 4),
    ]
    lista = await cliente.get(
        f"{A}/restaurantes/{restaurante.id}/categorias", headers=cabecera_operador
    )
    assert [x["id"] for x in lista.json()] == [str(f.id) for f in (c, a, b, d)]


@pytest.mark.ac("AC-16.1")
@pytest.mark.parametrize("cual", ["ajena", "inexistente"])
async def test_reordenar_con_una_categoria_ajena_no_mueve_nada(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    ajeno: Restaurante,
    fabrica_categoria: Fabrica,
    cabecera_operador: dict[str, str],
    cual: str,
) -> None:
    a = await fabrica_categoria(restaurante, nombre="A", orden=1)
    b = await fabrica_categoria(restaurante, nombre="B", orden=2)
    suya = await fabrica_categoria(ajeno, nombre="Suya", orden=1)
    intrusa = str(suya.id) if cual == "ajena" else UUID_X
    respuesta = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/categorias/reordenar",
        json={"ids": [str(b.id), intrusa, str(a.id)]},
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 404
    assert _codigo(respuesta) == "RECURSO_NO_ENCONTRADO"
    for fila in (a, b, suya):
        await sesion.refresh(fila)
    assert (a.orden, b.orden, suya.orden) == (1, 2, 1)


@pytest.mark.ac("AC-16.1")
@pytest.mark.ac("AC-15.3")
@pytest.mark.parametrize(("metodo", "cuerpo"), [("PATCH", {"nombre": "Robada"}), ("DELETE", None)])
async def test_una_categoria_ajena_es_404_igual_que_una_inexistente(
    cliente: AsyncClient,
    sesion: AsyncSession,
    ajeno: Restaurante,
    fabrica_categoria: Fabrica,
    cabecera_operador: dict[str, str],
    metodo: str,
    cuerpo: dict[str, Any] | None,
) -> None:
    suya = await fabrica_categoria(ajeno, nombre="Suya")
    errores = []
    for categoria_id in (suya.id, UUID_X):
        respuesta = await cliente.request(
            metodo, f"{A}/categorias/{categoria_id}", json=cuerpo, headers=cabecera_operador
        )
        assert respuesta.status_code == 404
        errores.append({k: v for k, v in respuesta.json()["error"].items() if k != "request_id"})
    assert errores[0] == errores[1]
    await sesion.refresh(suya)
    assert (suya.nombre, suya.activa) == ("Suya", True)


@pytest.mark.ac("AC-16.1")
async def test_una_categoria_de_un_restaurante_inactivo_no_existe(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    cabecera_operador: dict[str, str],
) -> None:
    restaurante.activo = False
    await sesion.commit()
    respuesta = await cliente.patch(
        f"{A}/categorias/{categoria.id}", json={"nombre": "X"}, headers=cabecera_operador
    )
    assert respuesta.status_code == 404


# ===========================================================================
# AC-16.1 · crear, editar, reordenar y desactivar platillos
# ===========================================================================


@pytest.mark.ac("AC-16.1")
async def test_crear_platillo_completo(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    fabrica_platillo: Fabrica,
    cabecera_operador: dict[str, str],
) -> None:
    await fabrica_platillo(restaurante, categoria, orden=7)
    respuesta = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/platillos",
        json={
            "categoria_id": str(categoria.id),
            "nombre": "  Guacamole  ",
            "descripcion": "Con totopos\ny queso",
            "precio": 145.5,
            "alergenos": ["lacteos", "lacteos", " nueces "],
            "etiquetas": ["vegetariano"],
            "calorias": 420,
            "nivel_picante": 2,
            "destacado": True,
        },
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 201, respuesta.text
    cuerpo = respuesta.json()
    assert cuerpo["nombre"] == "Guacamole"
    assert cuerpo["precio"] == 145.5
    assert cuerpo["alergenos"] == ["lacteos", "nueces"]
    assert cuerpo["orden"] == 8  # al final de su categoría
    assert (cuerpo["disponible"], cuerpo["activo"], cuerpo["destacado"]) == (True, True, True)
    assert cuerpo["imagen_tipo"] == "ilustracion_categoria"
    fila = await sesion.get(Platillo, UUID(cuerpo["id"]))
    assert fila is not None
    assert (fila.restaurante_id, fila.precio) == (restaurante.id, Decimal("145.50"))


@pytest.mark.ac("AC-16.1")
async def test_editar_un_platillo_cambia_solo_lo_enviado(
    cliente: AsyncClient,
    sesion: AsyncSession,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    respuesta = await cliente.patch(
        f"{A}/platillos/{platillo.id}",
        json={"precio": "88.8", "descripcion": None, "nivel_picante": 5},
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 200, respuesta.text
    await sesion.refresh(platillo)
    assert (platillo.precio, platillo.descripcion, platillo.nivel_picante) == (
        Decimal("88.80"),
        None,
        5,
    )
    assert platillo.nombre.startswith("Platillo")


@pytest.mark.ac("AC-16.1")
async def test_mover_un_platillo_de_categoria_lo_pone_al_final(
    cliente: AsyncClient,
    restaurante: Restaurante,
    platillo: Platillo,
    fabrica_categoria: Fabrica,
    fabrica_platillo: Fabrica,
    cabecera_operador: dict[str, str],
) -> None:
    otra = await fabrica_categoria(restaurante)
    await fabrica_platillo(restaurante, otra, orden=3)
    movido = await cliente.patch(
        f"{A}/platillos/{platillo.id}",
        json={"categoria_id": str(otra.id)},
        headers=cabecera_operador,
    )
    assert (movido.json()["categoria_id"], movido.json()["orden"]) == (str(otra.id), 4)
    sin_categoria = await cliente.patch(
        f"{A}/platillos/{platillo.id}", json={"categoria_id": None}, headers=cabecera_operador
    )
    assert sin_categoria.json()["categoria_id"] is None


@pytest.mark.ac("AC-16.1")
@pytest.mark.ac("AC-15.3")
@pytest.mark.parametrize("metodo", ["POST", "PATCH"])
async def test_una_categoria_ajena_en_el_cuerpo_es_404(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    platillo: Platillo,
    ajeno: Restaurante,
    fabrica_categoria: Fabrica,
    cabecera_operador: dict[str, str],
    metodo: str,
) -> None:
    suya = await fabrica_categoria(ajeno)
    categoria_original = platillo.categoria_id
    ruta = (
        f"{A}/restaurantes/{restaurante.id}/platillos"
        if metodo == "POST"
        else f"{A}/platillos/{platillo.id}"
    )
    respuesta = await cliente.request(
        metodo,
        ruta,
        json={"nombre": "Sope", "precio": 10, "categoria_id": str(suya.id)},
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 404, respuesta.text
    await sesion.refresh(platillo)
    assert (platillo.categoria_id, platillo.nombre) != (suya.id, "Sope")
    assert platillo.categoria_id == categoria_original


@pytest.mark.ac("AC-16.1")
async def test_marcar_disponible_es_un_interruptor_aparte(
    cliente: AsyncClient,
    sesion: AsyncSession,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    agotado = await cliente.patch(
        f"{A}/platillos/{platillo.id}", json={"disponible": False}, headers=cabecera_operador
    )
    assert agotado.status_code == 200
    assert agotado.json()["disponible"] is False
    assert agotado.json()["no_disponible_desde"] is not None
    assert agotado.json()["activo"] is True  # agotado no es baja
    de_vuelta = await cliente.patch(
        f"{A}/platillos/{platillo.id}", json={"disponible": True}, headers=cabecera_operador
    )
    assert (de_vuelta.json()["disponible"], de_vuelta.json()["no_disponible_desde"]) == (
        True,
        None,
    )
    await sesion.refresh(platillo)
    assert platillo.no_disponible_por is None


@pytest.mark.ac("AC-16.1")
async def test_reordenar_platillos_dentro_de_su_categoria(
    cliente: AsyncClient,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    fabrica_platillo: Fabrica,
    cabecera_operador: dict[str, str],
) -> None:
    a, b, c = [await fabrica_platillo(restaurante, categoria, nombre=n) for n in "ABC"]
    respuesta = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/platillos/reordenar",
        json={"ids": [str(c.id), str(a.id)]},
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 200, respuesta.text
    assert [(p["nombre"], p["orden"]) for p in respuesta.json()] == [
        ("C", 1),
        ("A", 2),
        ("B", 3),
    ]
    lista = await cliente.get(
        f"{A}/restaurantes/{restaurante.id}/platillos",
        params={"categoria_id": str(categoria.id)},
        headers=cabecera_operador,
    )
    assert [p["id"] for p in lista.json()] == [str(f.id) for f in (c, a, b)]


@pytest.mark.ac("AC-16.1")
async def test_reordenar_platillos_de_dos_categorias_es_422_y_no_mueve_nada(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    fabrica_categoria: Fabrica,
    fabrica_platillo: Fabrica,
    cabecera_operador: dict[str, str],
) -> None:
    otra = await fabrica_categoria(restaurante)
    a = await fabrica_platillo(restaurante, categoria, orden=1)
    b = await fabrica_platillo(restaurante, categoria, orden=2)
    c = await fabrica_platillo(restaurante, otra, orden=1)
    respuesta = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/platillos/reordenar",
        json={"ids": [str(b.id), str(c.id), str(a.id)]},
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 422
    assert _codigo(respuesta) == "PAYLOAD_INVALIDO"
    for fila in (a, b, c):
        await sesion.refresh(fila)
    assert (a.orden, b.orden, c.orden) == (1, 2, 1)


@pytest.mark.ac("AC-16.1")
@pytest.mark.ac("AC-15.3")
async def test_reordenar_con_un_platillo_ajeno_es_404(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    platillo: Platillo,
    ajeno: Restaurante,
    fabrica_platillo: Fabrica,
    cabecera_operador: dict[str, str],
) -> None:
    suyo = await fabrica_platillo(ajeno, orden=9)
    respuesta = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/platillos/reordenar",
        json={"ids": [str(suyo.id), str(platillo.id)]},
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 404
    await sesion.refresh(suyo)
    assert suyo.orden == 9


@pytest.mark.ac("AC-16.1")
async def test_listar_platillos_activos_por_defecto_y_las_bajas_aparte(
    cliente: AsyncClient,
    restaurante: Restaurante,
    platillo: Platillo,
    fabrica_platillo: Fabrica,
    cabecera_operador: dict[str, str],
) -> None:
    baja = await fabrica_platillo(restaurante, activo=False)
    ruta = f"{A}/restaurantes/{restaurante.id}/platillos"
    activos = await cliente.get(ruta, headers=cabecera_operador)
    assert {p["id"] for p in activos.json()} == {str(platillo.id)}
    bajas = await cliente.get(ruta, params={"activo": "false"}, headers=cabecera_operador)
    assert {p["id"] for p in bajas.json()} == {str(baja.id)}


# ===========================================================================
# AC-16.2 · validaciones: 422, nunca 500
# ===========================================================================

INVALIDOS_AL_CREAR: dict[str, dict[str, Any]] = {
    "sin nombre": {"precio": 10},
    "nombre vacío": {"nombre": "", "precio": 10},
    "nombre en blanco": {"nombre": "   ", "precio": 10},
    "nombre de 201": {"nombre": "x" * 201, "precio": 10},
    "nombre con NUL": {"nombre": "Sopa\x00", "precio": 10},
    "29 familias (203 puntos de código)": {"nombre": FAMILIA * 29, "precio": 10},
    "sin precio": {"nombre": "Sopa"},
    "precio negativo": {"nombre": "Sopa", "precio": -0.01},
    "precio sobre el tope": {"nombre": "Sopa", "precio": 100_000_000},
    "precio que redondea sobre el tope": {"nombre": "Sopa", "precio": "99999999.995"},
    "precio texto": {"nombre": "Sopa", "precio": "mucho"},
    "precio booleano": {"nombre": "Sopa", "precio": True},
    "precio infinito": {"nombre": "Sopa", "precio": "Infinity"},
    "picante 6": {"nombre": "Sopa", "precio": 10, "nivel_picante": 6},
    "picante -1": {"nombre": "Sopa", "precio": 10, "nivel_picante": -1},
    "calorías negativas": {"nombre": "Sopa", "precio": 10, "calorias": -1},
    "calorías fuera de INTEGER": {"nombre": "Sopa", "precio": 10, "calorias": 2**31},
    "31 alérgenos": {"nombre": "Sopa", "precio": 10, "alergenos": [f"a{n}" for n in range(31)]},
    "alérgeno de 41": {"nombre": "Sopa", "precio": 10, "alergenos": ["x" * 41]},
    "descripción de 1001": {"nombre": "Sopa", "precio": 10, "descripcion": "x" * 1001},
    "restaurante_id en el cuerpo": {"nombre": "Sopa", "precio": 10, "restaurante_id": UUID_X},
    "campo desconocido": {"nombre": "Sopa", "precio": 10, "orden": 1},
}


@pytest.mark.ac("AC-16.2")
@pytest.mark.parametrize("cuerpo", INVALIDOS_AL_CREAR.values(), ids=INVALIDOS_AL_CREAR.keys())
async def test_un_platillo_invalido_es_422(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    cuerpo: dict[str, Any],
) -> None:
    respuesta = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/platillos", json=cuerpo, headers=cabecera_operador
    )
    assert respuesta.status_code == 422, respuesta.text
    error = ErrorRespuesta.model_validate(respuesta.json()).error
    assert error.codigo == "PAYLOAD_INVALIDO"
    assert error.detalles["errores"]
    assert await sesion.scalar(select(Platillo.id).where(Platillo.nombre == "Sopa")) is None


@pytest.mark.ac("AC-16.2")
async def test_un_precio_nan_es_422(
    cliente: AsyncClient, restaurante: Restaurante, cabecera_operador: dict[str, str]
) -> None:
    respuesta = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/platillos",
        content=b'{"nombre": "Sopa", "precio": NaN}',
        headers={**cabecera_operador, "Content-Type": "application/json"},
    )
    assert respuesta.status_code == 422, respuesta.text


VALIDOS_EN_EL_LIMITE: dict[str, tuple[dict[str, Any], str, Any]] = {
    "precio 0": ({"precio": 0}, "precio", 0.0),
    "precio tope": ({"precio": 99999999.99}, "precio", 99999999.99),
    "1.005 redondea hacia arriba": ({"precio": 1.005}, "precio", 1.01),
    "2.675 (binario 2.67499…) redondea a 2.68": ({"precio": 2.675}, "precio", 2.68),
    "texto 10.125": ({"precio": "10.125"}, "precio", 10.13),
    "nombre de 200": ({"nombre": "x" * 200}, "nombre", "x" * 200),
    "28 familias (196 puntos de código)": ({"nombre": FAMILIA * 28}, "nombre", FAMILIA * 28),
    "picante 5": ({"nivel_picante": 5}, "nivel_picante", 5),
    "picante 0": ({"nivel_picante": 0}, "nivel_picante", 0),
}


@pytest.mark.ac("AC-16.2")
@pytest.mark.parametrize(
    ("cambio", "campo", "esperado"),
    VALIDOS_EN_EL_LIMITE.values(),
    ids=VALIDOS_EN_EL_LIMITE.keys(),
)
async def test_los_limites_validos_se_aceptan(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    cambio: dict[str, Any],
    campo: str,
    esperado: Any,
) -> None:
    respuesta = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/platillos",
        json={"nombre": "Sopa", "precio": 10, **cambio},
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 201, respuesta.text
    assert respuesta.json()[campo] == esperado


INVALIDOS_AL_EDITAR: dict[str, dict[str, Any]] = {
    "nombre null": {"nombre": None},
    "precio null": {"precio": None},
    "disponible null": {"disponible": None},
    "activo null": {"activo": None},
    "alergenos null": {"alergenos": None},
    "precio negativo": {"precio": -1},
    "picante 6": {"nivel_picante": 6},
    "nombre en blanco": {"nombre": " "},
    "restaurante_id": {"restaurante_id": UUID_X},
    "imagen_tipo": {"imagen_tipo": "foto"},
}


@pytest.mark.ac("AC-16.2")
@pytest.mark.parametrize("cuerpo", INVALIDOS_AL_EDITAR.values(), ids=INVALIDOS_AL_EDITAR.keys())
async def test_editar_con_datos_invalidos_es_422_y_no_cambia(
    cliente: AsyncClient,
    sesion: AsyncSession,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
    cuerpo: dict[str, Any],
) -> None:
    antes = (platillo.nombre, platillo.precio, platillo.nivel_picante)
    respuesta = await cliente.patch(
        f"{A}/platillos/{platillo.id}", json=cuerpo, headers=cabecera_operador
    )
    assert respuesta.status_code == 422, respuesta.text
    assert _codigo(respuesta) == "PAYLOAD_INVALIDO"
    await sesion.refresh(platillo)
    assert (platillo.nombre, platillo.precio, platillo.nivel_picante) == antes


@pytest.mark.ac("AC-16.2")
@pytest.mark.parametrize(
    "cuerpo",
    [{}, {"nombre": ""}, {"nombre": "x" * 101}, {"nombre": None}, {"activa": None}, {"orden": 2}],
    ids=["sin nombre", "vacío", "101", "nombre null", "activa null", "orden"],
)
async def test_una_categoria_invalida_es_422(
    cliente: AsyncClient,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    cabecera_operador: dict[str, str],
    cuerpo: dict[str, Any],
) -> None:
    if cuerpo:
        editada = await cliente.patch(
            f"{A}/categorias/{categoria.id}", json=cuerpo, headers=cabecera_operador
        )
        assert editada.status_code == 422, editada.text
    if "activa" not in cuerpo:
        creada = await cliente.post(
            f"{A}/restaurantes/{restaurante.id}/categorias", json=cuerpo, headers=cabecera_operador
        )
        assert creada.status_code == 422, creada.text


@pytest.mark.ac("AC-16.2")
@pytest.mark.parametrize("ruta", ["platillos", "categorias"])
@pytest.mark.parametrize(
    "params",
    [{"limit": -1}, {"limit": 0}, {"limit": 101}, {"skip": -1}, {"limit": "x"}],
    ids=["limit -1", "limit 0", "limit 101", "skip -1", "limit texto"],
)
async def test_la_paginacion_fuera_de_rango_es_422(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    ruta: str,
    params: dict[str, Any],
) -> None:
    respuesta = await cliente.get(
        f"{A}/restaurantes/{restaurante.id}/{ruta}", params=params, headers=cabecera_operador
    )
    assert respuesta.status_code == 422, respuesta.text


@pytest.mark.ac("AC-16.2")
@pytest.mark.parametrize(
    "ids",
    [[], [UUID_X, UUID_X], ["no-es-uuid"], [UUID_X] * 501],
    ids=["vacía", "repetidos", "no uuid", "501"],
)
async def test_reordenar_con_una_lista_invalida_es_422(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    ids: list[str],
) -> None:
    for recurso in ("categorias", "platillos"):
        respuesta = await cliente.post(
            f"{A}/restaurantes/{restaurante.id}/{recurso}/reordenar",
            json={"ids": ids},
            headers=cabecera_operador,
        )
        assert respuesta.status_code == 422, (recurso, respuesta.text)


# ===========================================================================
# AC-16.3 · desactivación lógica, nunca borrado físico
# ===========================================================================


async def _orden_con(sesion: AsyncSession, mesa: Mesa, platillo: Platillo) -> ItemOrden:
    sesion_grupal = SesionGrupal(mesa_id=mesa.id, restaurante_id=mesa.restaurante_id)
    sesion.add(sesion_grupal)
    await sesion.flush()
    miembro = MiembroSesion(sesion_id=sesion_grupal.id)
    sesion.add(miembro)
    await sesion.flush()
    orden = OrdenPersonal(sesion_id=sesion_grupal.id, miembro_id=miembro.id)
    sesion.add(orden)
    await sesion.flush()
    item = ItemOrden(
        orden_id=orden.id,
        platillo_id=platillo.id,
        precio_unitario=platillo.precio,
        subtotal=platillo.precio,
    )
    sesion.add(item)
    await sesion.commit()
    return item


@pytest.mark.ac("AC-16.3")
async def test_desactivar_un_platillo_con_historial_no_lo_borra(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    platillo: Platillo,
    mesa: Mesa,
    cabecera_operador: dict[str, str],
) -> None:
    item = await _orden_con(sesion, mesa, platillo)
    respuesta = await cliente.delete(f"{A}/platillos/{platillo.id}", headers=cabecera_operador)
    assert respuesta.status_code == 204, respuesta.text
    await sesion.refresh(platillo)
    await sesion.refresh(item)
    assert platillo.activo is False
    assert item.platillo_id == platillo.id  # el historial sigue apuntando al platillo

    activos = await cliente.get(
        f"{A}/restaurantes/{restaurante.id}/platillos", headers=cabecera_operador
    )
    assert activos.json() == []
    reactivado = await cliente.patch(
        f"{A}/platillos/{platillo.id}", json={"activo": True}, headers=cabecera_operador
    )
    assert reactivado.json()["activo"] is True


@pytest.mark.ac("AC-16.3")
async def test_desactivar_dos_veces_sigue_siendo_204(
    cliente: AsyncClient, platillo: Platillo, cabecera_operador: dict[str, str]
) -> None:
    for _ in range(2):
        respuesta = await cliente.delete(f"{A}/platillos/{platillo.id}", headers=cabecera_operador)
        assert respuesta.status_code == 204


@pytest.mark.ac("AC-16.3")
def test_no_hay_borrado_fisico_en_el_servicio_ni_en_las_rutas() -> None:
    """Regla dura 9: ni `sesion.delete(...)` ni la sentencia `delete` de SQLAlchemy."""
    import re
    from pathlib import Path

    raiz = Path(__file__).resolve().parents[2]
    for archivo in ("app/services/menu.py", "app/api/admin/menu.py"):
        texto = (raiz / archivo).read_text(encoding="utf-8")
        assert not re.search(r"\bsesion\.delete\(|\bsession\.delete\(", texto), archivo
        importaciones = re.findall(r"^from sqlalchemy[\w.]* import (.+)$", texto, re.M)
        assert all("delete" not in linea for linea in importaciones), archivo


# ===========================================================================
# Caché del menú: toda escritura la invalida (en proceso y en Cloudflare)
# ===========================================================================


@pytest.mark.ac("AC-16.1")
async def test_toda_escritura_invalida_el_menu(
    cliente: AsyncClient,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
    cloudflare: CloudflareFalso,
) -> None:
    rid = restaurante.id
    escrituras: list[tuple[str, str, dict[str, Any] | None]] = [
        ("POST", f"/restaurantes/{rid}/categorias", {"nombre": "Nueva"}),
        ("PATCH", f"/categorias/{categoria.id}", {"nombre": "Otra"}),
        ("POST", f"/restaurantes/{rid}/categorias/reordenar", {"ids": [str(categoria.id)]}),
        ("POST", f"/restaurantes/{rid}/platillos", {"nombre": "Sope", "precio": 30}),
        ("PATCH", f"/platillos/{platillo.id}", {"disponible": False}),
        ("POST", f"/restaurantes/{rid}/platillos/reordenar", {"ids": [str(platillo.id)]}),
        ("DELETE", f"/platillos/{platillo.id}", None),
        ("DELETE", f"/categorias/{categoria.id}", None),
        ("PATCH", f"/restaurantes/{rid}", {"nombre": "Nuevo nombre"}),
    ]
    for metodo, ruta, cuerpo in escrituras:
        cache_menu.guardar(restaurante.slug, {"menu": "viejo"})
        antes = len(cloudflare.peticiones)
        respuesta = await cliente.request(metodo, A + ruta, json=cuerpo, headers=cabecera_operador)
        assert respuesta.status_code < 300, (metodo, ruta, respuesta.text)
        await cache_menu.esperar_purgas()
        assert cache_menu.obtener(restaurante.slug) is None, (metodo, ruta)
        assert len(cloudflare.peticiones) == antes + 1, (metodo, ruta)
    peticion = cloudflare.peticiones[0]
    assert peticion.method == "POST"
    assert str(peticion.url) == (
        "https://api.cloudflare.com/client/v4/zones/zona-pruebas/purge_cache"
    )
    assert peticion.headers["authorization"] == "Bearer token-pruebas"
    assert set(cloudflare.urls) == {_url_menu(restaurante)}


@pytest.mark.ac("AC-16.1")
async def test_leer_no_invalida(
    cliente: AsyncClient,
    restaurante: Restaurante,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
    cloudflare: CloudflareFalso,
) -> None:
    cache_menu.guardar(restaurante.slug, {"menu": 1})
    for ruta in ("platillos", "categorias"):
        await cliente.get(f"{A}/restaurantes/{restaurante.id}/{ruta}", headers=cabecera_operador)
    await cache_menu.esperar_purgas()
    assert cache_menu.obtener(restaurante.slug) == {"menu": 1}
    assert cloudflare.peticiones == []


@pytest.mark.ac("AC-16.1")
async def test_una_escritura_rechazada_no_invalida(
    cliente: AsyncClient,
    platillo: Platillo,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    cloudflare: CloudflareFalso,
) -> None:
    cache_menu.guardar(restaurante.slug, {"menu": 1})
    respuesta = await cliente.patch(
        f"{A}/platillos/{platillo.id}", json={"precio": -1}, headers=cabecera_operador
    )
    assert respuesta.status_code == 422
    await cache_menu.esperar_purgas()
    assert cache_menu.obtener(restaurante.slug) == {"menu": 1}
    assert cloudflare.peticiones == []


@pytest.mark.ac("AC-16.1")
async def test_cambiar_el_slug_invalida_el_viejo_y_el_nuevo(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    cloudflare: CloudflareFalso,
) -> None:
    viejo = restaurante.slug
    respuesta = await cliente.patch(
        f"{A}/restaurantes/{restaurante.id}",
        json={"slug": "la-nueva-casa"},
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 200, respuesta.text
    await cache_menu.esperar_purgas()
    assert len(cloudflare.peticiones) == 1  # una sola llamada con las dos URL
    assert set(cloudflare.urls) == {
        f"https://{settings.DOMINIO}/api/v1/p/menu/{viejo}",
        f"https://{settings.DOMINIO}/api/v1/p/menu/la-nueva-casa",
    }


@pytest.mark.ac("AC-16.1")
@pytest.mark.parametrize(
    "falla",
    [
        httpx.Response(500, text="caído"),
        httpx.Response(403, json={"success": False, "errors": [{"code": 10000}]}),
        httpx.ConnectError("sin red"),
        httpx.ReadTimeout("lento"),
    ],
    ids=["500", "403", "sin red", "timeout"],
)
async def test_si_cloudflare_falla_la_escritura_igual_se_guarda(
    cliente: AsyncClient,
    sesion: AsyncSession,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
    cloudflare: CloudflareFalso,
    caplog: pytest.LogCaptureFixture,
    falla: httpx.Response | Exception,
) -> None:
    cloudflare.respuesta = falla
    with caplog.at_level(logging.WARNING, logger="carta.cache_menu"):
        respuesta = await cliente.patch(
            f"{A}/platillos/{platillo.id}", json={"nombre": "Pozole"}, headers=cabecera_operador
        )
        await cache_menu.esperar_purgas()
    assert respuesta.status_code == 200, respuesta.text
    await sesion.refresh(platillo)
    assert platillo.nombre == "Pozole"
    assert len(cloudflare.peticiones) == 1
    registros = [r for r in caplog.records if r.name == "carta.cache_menu"]
    assert [getattr(r, "codigo", None) for r in registros] == ["PURGA_FALLIDA"]
    assert registros[0].getMessage().startswith("purga de Cloudflare")
    texto = " ".join(r.getMessage() for r in registros)
    assert "token-pruebas" not in texto and "caído" not in texto


# ===========================================================================
# IntegrityError → envoltura (UNIQUE 409); el detalle no sale ni al log
# ===========================================================================


@pytest.mark.ac("AC-16.2")
async def test_un_nombre_de_categoria_repetido_es_409(
    cliente: AsyncClient,
    restaurante: Restaurante,
    fabrica_categoria: Fabrica,
    cabecera_operador: dict[str, str],
    caplog: pytest.LogCaptureFixture,
    cloudflare: CloudflareFalso,
) -> None:
    await fabrica_categoria(restaurante, nombre="Bebidas Secretas")
    with caplog.at_level(logging.INFO, logger="carta.errores"):
        respuesta = await cliente.post(
            f"{A}/restaurantes/{restaurante.id}/categorias",
            json={"nombre": "  bebidas secretas "},
            headers=cabecera_operador,
        )
    assert respuesta.status_code == 409, respuesta.text
    error = ErrorRespuesta.model_validate(respuesta.json()).error
    assert (error.codigo, error.mensaje) == (
        "CONFLICTO",
        "Ya tienes una categoría activa con ese nombre.",
    )
    assert respuesta.headers["cache-control"] == "no-store"
    registros = " ".join(r.getMessage() for r in caplog.records)
    assert "uq_categoria_activa_por_nombre" in registros
    assert "ecretas" not in registros  # nunca los parámetros
    await cache_menu.esperar_purgas()
    assert cloudflare.peticiones == []  # nada cambió, nada se purga


@pytest.mark.ac("AC-16.2")
async def test_reactivar_con_un_nombre_ocupado_es_409(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    fabrica_categoria: Fabrica,
    cabecera_operador: dict[str, str],
) -> None:
    vieja = await fabrica_categoria(restaurante, nombre="Postres", activa=False)
    await fabrica_categoria(restaurante, nombre="Postres")
    respuesta = await cliente.patch(
        f"{A}/categorias/{vieja.id}", json={"activa": True}, headers=cabecera_operador
    )
    assert respuesta.status_code == 409
    await sesion.refresh(vieja)
    assert vieja.activa is False
    # Una baja libera el nombre: se puede crear otra «Postres» después de dar de baja ésta.
    nueva = await cliente.patch(
        f"{A}/categorias/{vieja.id}",
        json={"nombre": "Postres viejos", "activa": True},
        headers=cabecera_operador,
    )
    assert nueva.status_code == 200


# ===========================================================================
# Revisión de la maestra (T-1.3)
# ===========================================================================

# --- A1 · precios que desbordan `quantize` o redondean a 0 → 422, nunca 500 ---------------

PRECIOS_FUERA_DE_RANGO = ["1e26", "1e30", 1e30, "9" * 30, "1E+999999999999", -1e30, "-0.001"]
PRECIOS_MAL_ESCRITOS = ["１２", "+5", "1,5", " ", "-0"]  # B6: sólo dígitos ASCII, sin signo


@pytest.mark.ac("AC-16.2")
@pytest.mark.parametrize("metodo", ["POST", "PATCH"])
@pytest.mark.parametrize(
    "precio", PRECIOS_FUERA_DE_RANGO + PRECIOS_MAL_ESCRITOS, ids=lambda p: repr(p)[:20]
)
async def test_un_precio_fuera_de_rango_o_mal_escrito_es_422(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
    metodo: str,
    precio: Any,
) -> None:
    ruta = (
        f"{A}/restaurantes/{restaurante.id}/platillos"
        if metodo == "POST"
        else f"{A}/platillos/{platillo.id}"
    )
    respuesta = await cliente.request(
        metodo, ruta, json={"nombre": "Sopa", "precio": precio}, headers=cabecera_operador
    )
    assert respuesta.status_code == 422, respuesta.text
    error = ErrorRespuesta.model_validate(respuesta.json()).error
    assert [e["campo"] for e in error.detalles["errores"]] == ["body.precio"]
    await sesion.refresh(platillo)
    assert platillo.precio == Decimal("100.00")


# --- A2 · restaurante ajeno en las rutas por {rid} y listados sin datos ajenos ----------

RUTAS_RID_DEL_MENU = [
    ("GET", "/restaurantes/{rid}/categorias", None),
    ("POST", "/restaurantes/{rid}/categorias", {"nombre": "Intrusa"}),
    ("POST", "/restaurantes/{rid}/categorias/reordenar", {"ids": ["{cid}"]}),
    ("POST", "/restaurantes/{rid}/platillos/reordenar", {"ids": ["{pid}"]}),
]


@pytest.mark.ac("AC-15.3")
@pytest.mark.ac("AC-16.1")
@pytest.mark.parametrize(("metodo", "ruta", "cuerpo"), RUTAS_RID_DEL_MENU)
async def test_un_restaurante_ajeno_es_404_en_categorias_y_reordenar(
    cliente: AsyncClient,
    sesion: AsyncSession,
    ajeno: Restaurante,
    fabrica_categoria: Fabrica,
    fabrica_platillo: Fabrica,
    cabecera_operador: dict[str, str],
    metodo: str,
    ruta: str,
    cuerpo: dict[str, Any] | None,
) -> None:
    c1 = await fabrica_categoria(ajeno, nombre="Primera", orden=1)
    c2 = await fabrica_categoria(ajeno, nombre="Segunda", orden=2)
    p1 = await fabrica_platillo(ajeno, c1, orden=1)
    p2 = await fabrica_platillo(ajeno, c1, orden=2)
    texto = json.dumps(cuerpo).replace("{cid}", str(c2.id)).replace("{pid}", str(p2.id))
    errores = []
    for rid in (ajeno.id, UUID_X):
        respuesta = await cliente.request(
            metodo,
            A + ruta.format(rid=rid),
            json=json.loads(texto),
            headers=cabecera_operador,
        )
        assert respuesta.status_code == 404, respuesta.text
        errores.append({k: v for k, v in respuesta.json()["error"].items() if k != "request_id"})
    assert errores[0] == errores[1]
    for fila in (c1, c2, p1, p2):
        await sesion.refresh(fila)
    assert (c1.orden, c2.orden, p1.orden, p2.orden) == (1, 2, 1, 2)
    intrusas = await sesion.scalar(
        select(CategoriaMenu.id).where(CategoriaMenu.nombre == "Intrusa")
    )
    assert intrusas is None


@pytest.mark.ac("AC-15.3")
@pytest.mark.ac("AC-16.1")
async def test_los_listados_no_incluyen_datos_de_otro_restaurante(
    cliente: AsyncClient,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    platillo: Platillo,
    ajeno: Restaurante,
    fabrica_categoria: Fabrica,
    fabrica_platillo: Fabrica,
    cabecera_operador: dict[str, str],
) -> None:
    suya = await fabrica_categoria(ajeno, orden=0)
    await fabrica_platillo(ajeno, suya, orden=0)
    await fabrica_platillo(ajeno, orden=0, activo=False)
    base = f"{A}/restaurantes/{restaurante.id}"
    categorias = await cliente.get(f"{base}/categorias", headers=cabecera_operador)
    assert [c["id"] for c in categorias.json()] == [str(categoria.id)]
    for params in ({}, {"activo": "false"}, {"categoria_id": str(suya.id)}):
        platillos = await cliente.get(f"{base}/platillos", params=params, headers=cabecera_operador)
        esperado = [str(platillo.id)] if not params else []
        assert [p["id"] for p in platillos.json()] == esperado, params


# --- A3 · paginación, filtros y orden ------------------------------------------------


@pytest.mark.ac("AC-16.1")
async def test_listar_pagina_filtra_y_ordena(
    cliente: AsyncClient,
    restaurante: Restaurante,
    fabrica_categoria: Fabrica,
    fabrica_platillo: Fabrica,
    cabecera_operador: dict[str, str],
) -> None:
    # Categorías con `orden` contrario al alfabético y al de creación.
    tercera = await fabrica_categoria(restaurante, nombre="A tercera", orden=30)
    primera = await fabrica_categoria(restaurante, nombre="C primera", orden=10)
    segunda = await fabrica_categoria(restaurante, nombre="B segunda", orden=20)
    esperado = []
    for categoria in (primera, segunda, tercera):
        despues = await fabrica_platillo(restaurante, categoria, nombre="a", orden=2)
        antes = await fabrica_platillo(restaurante, categoria, nombre="z", orden=1)
        esperado += [antes, despues]
    suelto = await fabrica_platillo(restaurante, nombre="0 sin categoría", orden=0)
    esperado.append(suelto)  # sin categoría al final
    ids = [str(p.id) for p in esperado]
    base = f"{A}/restaurantes/{restaurante.id}"

    async def listar(recurso: str, **params: Any) -> list[str]:
        r = await cliente.get(f"{base}/{recurso}", params=params, headers=cabecera_operador)
        assert r.status_code == 200, r.text
        return [x["id"] for x in r.json()]

    assert await listar("platillos") == ids
    assert await listar("platillos", limit=2) == ids[:2]
    assert await listar("platillos", skip=2, limit=2) == ids[2:4]
    assert await listar("platillos", skip=6) == ids[6:]
    assert await listar("platillos", categoria_id=str(segunda.id)) == ids[2:4]
    cats = [str(c.id) for c in (primera, segunda, tercera)]
    assert await listar("categorias") == cats
    assert await listar("categorias", limit=2) == cats[:2]
    assert await listar("categorias", skip=1, limit=1) == cats[1:2]
    assert await listar("categorias", skip=2) == cats[2:]


@pytest.mark.ac("AC-16.1")
async def test_reordenar_conserva_el_orden_previo_de_los_no_enviados(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    fabrica_categoria: Fabrica,
    fabrica_platillo: Fabrica,
    cabecera_operador: dict[str, str],
) -> None:
    categoria.orden = 5
    await sesion.commit()
    # Nombres en orden inverso al alfabético y `orden` con huecos: manda `orden`.
    z, y, x, w = [
        await fabrica_platillo(restaurante, categoria, nombre=n, orden=o)
        for n, o in (("z", 10), ("y", 20), ("x", 30), ("w", 40))
    ]
    respuesta = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/platillos/reordenar",
        json={"ids": [str(x.id)]},
        headers=cabecera_operador,
    )
    assert [(p["id"], p["orden"]) for p in respuesta.json()] == [
        (str(x.id), 1),
        (str(z.id), 2),
        (str(y.id), 3),
        (str(w.id), 4),
    ]
    cz, cy, cx = [
        await fabrica_categoria(restaurante, nombre=n, orden=o)
        for n, o in (("z", 10), ("y", 20), ("x", 30))
    ]
    respuesta = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/categorias/reordenar",
        json={"ids": [str(cx.id)]},
        headers=cabecera_operador,
    )
    # `categoria` (fixture, `orden` 5) queda la segunda.
    assert [c["id"] for c in respuesta.json()] == [
        str(cx.id),
        str(categoria.id),
        str(cz.id),
        str(cy.id),
    ]
    assert [c["orden"] for c in respuesta.json()] == [1, 2, 3, 4]


# --- A5 · categoría inactiva -----------------------------------------------------------


@pytest.mark.ac("AC-16.2")
@pytest.mark.parametrize("metodo", ["POST", "PATCH"])
async def test_un_platillo_no_entra_en_una_categoria_dada_de_baja(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    platillo: Platillo,
    fabrica_categoria: Fabrica,
    cabecera_operador: dict[str, str],
    metodo: str,
) -> None:
    baja = await fabrica_categoria(restaurante, activa=False)
    categoria_original = platillo.categoria_id
    ruta = (
        f"{A}/restaurantes/{restaurante.id}/platillos"
        if metodo == "POST"
        else f"{A}/platillos/{platillo.id}"
    )
    respuesta = await cliente.request(
        metodo,
        ruta,
        json={"nombre": "Sope", "precio": 10, "categoria_id": str(baja.id)},
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 422, respuesta.text
    error = ErrorRespuesta.model_validate(respuesta.json()).error
    assert error.codigo == "PAYLOAD_INVALIDO"
    assert "dada de baja" in error.mensaje
    assert [e["campo"] for e in error.detalles["errores"]] == ["body.categoria_id"]
    await sesion.refresh(platillo)
    assert platillo.categoria_id == categoria_original
    assert await sesion.scalar(select(Platillo.id).where(Platillo.nombre == "Sope")) is None


@pytest.mark.ac("AC-16.3")
async def test_desactivar_una_categoria_no_desactiva_sus_platillos(
    cliente: AsyncClient,
    sesion: AsyncSession,
    categoria: CategoriaMenu,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    respuesta = await cliente.delete(f"{A}/categorias/{categoria.id}", headers=cabecera_operador)
    assert respuesta.status_code == 204
    await sesion.refresh(platillo)
    assert (platillo.activo, platillo.disponible, platillo.categoria_id) == (
        True,
        True,
        categoria.id,
    )


# --- B1 · `Reordenar` rechaza campos desconocidos --------------------------------------


@pytest.mark.ac("AC-15.3")
@pytest.mark.parametrize("recurso", ["categorias", "platillos"])
async def test_reordenar_con_restaurante_id_en_el_cuerpo_es_422(
    cliente: AsyncClient,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    platillo: Platillo,
    ajeno: Restaurante,
    cabecera_operador: dict[str, str],
    recurso: str,
) -> None:
    ident = categoria.id if recurso == "categorias" else platillo.id
    respuesta = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/{recurso}/reordenar",
        json={"ids": [str(ident)], "restaurante_id": str(ajeno.id)},
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 422, respuesta.text


# --- B4 · la purga no demora la escritura y se agrupa ---------------------------------


@pytest.mark.ac("AC-16.1")
async def test_la_escritura_no_espera_a_cloudflare(
    cliente: AsyncClient,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
    cloudflare: CloudflareFalso,
) -> None:
    cloudflare.demora = 10.0
    assert cache_menu.purgador is not None
    cache_menu.purgador.plazo = 10.0
    inicio = time.perf_counter()
    respuesta = await cliente.patch(
        f"{A}/platillos/{platillo.id}", json={"nombre": "Rápido"}, headers=cabecera_operador
    )
    duracion = time.perf_counter() - inicio
    assert respuesta.status_code == 200
    # Holgura para CI: sin el cambio tardaría los 10 s de Cloudflare.
    assert duracion < 0.5, duracion


@pytest.mark.ac("AC-16.1")
async def test_tres_escrituras_seguidas_son_una_purga(
    cliente: AsyncClient,
    restaurante: Restaurante,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
    cloudflare: CloudflareFalso,
) -> None:
    cache_menu.ventana = 0.3
    for nombre in ("Uno", "Dos", "Tres"):
        respuesta = await cliente.patch(
            f"{A}/platillos/{platillo.id}", json={"nombre": nombre}, headers=cabecera_operador
        )
        assert respuesta.status_code == 200
    await cache_menu.esperar_purgas()
    assert len(cloudflare.peticiones) == 1
    assert cloudflare.urls == [_url_menu(restaurante)]


# --- B6 · validaciones laxas ------------------------------------------------------------

INVISIBLES = {
    "ancho cero": "​​",
    "marcas bidi": "‮⁦‏",
    "BOM y ZWJ": "﻿‍",
}


@pytest.mark.ac("AC-16.2")
@pytest.mark.parametrize("nombre", INVISIBLES.values(), ids=INVISIBLES.keys())
async def test_un_nombre_sin_nada_visible_es_422(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    nombre: str,
) -> None:
    base = f"{A}/restaurantes/{restaurante.id}"
    platillo = await cliente.post(
        f"{base}/platillos", json={"nombre": nombre, "precio": 1}, headers=cabecera_operador
    )
    categoria = await cliente.post(
        f"{base}/categorias", json={"nombre": nombre}, headers=cabecera_operador
    )
    assert (platillo.status_code, categoria.status_code) == (422, 422)


@pytest.mark.ac("AC-16.2")
async def test_el_formato_invisible_se_quita_y_los_emojis_compuestos_se_conservan(
    cliente: AsyncClient, restaurante: Restaurante, cabecera_operador: dict[str, str]
) -> None:
    respuesta = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/platillos",
        json={"nombre": "​Sopa‮ de la casa " + FAMILIA, "precio": 1},
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 201, respuesta.text
    assert respuesta.json()["nombre"] == "Sopa de la casa " + FAMILIA


@pytest.mark.ac("AC-16.2")
@pytest.mark.parametrize("picante", ["3", True, 2.0], ids=["texto", "booleano", "decimal"])
async def test_el_picante_es_un_entero_estricto(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    picante: Any,
) -> None:
    respuesta = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/platillos",
        json={"nombre": "Sopa", "precio": 1, "nivel_picante": picante},
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 422, respuesta.text


@pytest.mark.ac("AC-16.2")
@pytest.mark.parametrize("metodo", ["POST", "PATCH"])
async def test_las_claves_se_normalizan_antes_de_quitar_repetidas(
    cliente: AsyncClient,
    restaurante: Restaurante,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
    metodo: str,
) -> None:
    ruta = (
        f"{A}/restaurantes/{restaurante.id}/platillos"
        if metodo == "POST"
        else f"{A}/platillos/{platillo.id}"
    )
    respuesta = await cliente.request(
        metodo,
        ruta,
        json={
            "nombre": "Sopa",
            "precio": 1,
            "alergenos": ["a", "a", "A", " Frutos   Secos ", "frutos secos"],
            "etiquetas": ["Vegano", "vegano "],
        },
        headers=cabecera_operador,
    )
    assert respuesta.status_code in (200, 201), respuesta.text
    assert respuesta.json()["alergenos"] == ["a", "frutos secos"]
    assert respuesta.json()["etiquetas"] == ["vegano"]


# --- B7 · huecos de pruebas --------------------------------------------------------------


@pytest.mark.ac("AC-16.2")
@pytest.mark.parametrize("nombre", ["Sopa\x00", "\x07Sopa", "So\x1bpa"])
async def test_un_caracter_de_control_en_la_categoria_es_422(
    cliente: AsyncClient,
    restaurante: Restaurante,
    categoria: CategoriaMenu,
    cabecera_operador: dict[str, str],
    nombre: str,
) -> None:
    creada = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/categorias",
        json={"nombre": nombre},
        headers=cabecera_operador,
    )
    editada = await cliente.patch(
        f"{A}/categorias/{categoria.id}", json={"nombre": nombre}, headers=cabecera_operador
    )
    assert (creada.status_code, editada.status_code) == (422, 422)


# --- B7 · servicio: invalida después del commit; rechaza antes de tocar la base ----------


class CacheQueAnota(CacheMenu):
    def __init__(self, eventos: list[str]) -> None:
        super().__init__()
        self.eventos = eventos

    def invalidar(self, *slugs: str) -> None:
        self.eventos.append("invalidar")
        super().invalidar(*slugs)


@pytest.mark.ac("AC-16.1")
async def test_el_servicio_invalida_despues_del_commit(
    sesion: AsyncSession, restaurante: Restaurante, platillo: Platillo
) -> None:
    from sqlalchemy import event

    eventos: list[str] = []

    def al_confirmar(_sesion: Any) -> None:
        eventos.append("commit")

    event.listen(sesion.sync_session, "after_commit", al_confirmar)
    try:
        cache = CacheQueAnota(eventos)
        await menu.cambiar_platillo(sesion, platillo, {"nombre": "Tamal"}, cache)
        await menu.crear_categoria(sesion, restaurante.id, "Nueva", cache)
    finally:
        event.remove(sesion.sync_session, "after_commit", al_confirmar)
        cache.cancelar_purgas()
    assert eventos == ["commit", "invalidar", "commit", "invalidar"]


@pytest.mark.ac("AC-16.1")
async def test_el_servicio_rechaza_una_categoria_ajena_o_de_baja_sin_escribir(
    sesion: AsyncSession,
    restaurante: Restaurante,
    ajeno: Restaurante,
    fabrica_categoria: Fabrica,
) -> None:
    suya = await fabrica_categoria(ajeno)
    baja = await fabrica_categoria(restaurante, activa=False)
    cache = CacheMenu()
    for categoria_id, http in ((suya.id, 404), (baja.id, 422)):
        with pytest.raises(ErrorCarta) as error:
            await menu.crear_platillo(
                sesion,
                restaurante.id,
                {"nombre": "Fantasma", "precio": Decimal(1), "categoria_id": categoria_id},
                cache,
            )
        assert error.value.http == http
    assert not sesion.new and cache.invalidaciones == 0
    assert await sesion.scalar(select(Platillo.id).where(Platillo.nombre == "Fantasma")) is None


def test_un_null_en_un_campo_obligatorio_del_patch_es_error_de_validacion() -> None:
    from pydantic import ValidationError

    from app.schemas.menu import CategoriaCambios, PlatilloCambios

    for esquema, campo in ((PlatilloCambios, "precio"), (CategoriaCambios, "activa")):
        with pytest.raises(ValidationError, match=f"no pueden ser null: {campo}"):
            esquema.model_validate({campo: None})
    assert PlatilloCambios.model_validate({"descripcion": None}).descripcion is None
