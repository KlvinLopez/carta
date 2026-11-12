"""T-2.2 (ronda de revisión, A1/A2/B1): vuelo único por `slug`, lecturas anteriores a una
escritura y tiempos de caché que nunca pasan de 30 s contando desde que se armó el menú."""

from __future__ import annotations

import asyncio
import re
from collections.abc import Iterator
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import event, update
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.db.models import Platillo, Restaurante
from app.services import menu_publico as servicio
from app.services.cache_menu import cache_menu
from tests.menu_pruebas import Reloj, reloj_falso

P = "/api/v1/p"
SIMULTANEAS = 40


class Sentencias:
    """Las sentencias `FROM restaurante` que llegan a la base (una por armado del menú)."""

    def __init__(self, motor: AsyncEngine) -> None:
        self.cuantas = 0
        self._motor = motor.sync_engine
        event.listen(self._motor, "before_cursor_execute", self._contar)

    def _contar(self, _c: Any, _cur: Any, sentencia: str, *_: Any) -> None:
        if re.search(r"FROM restaurante\b", sentencia):
            self.cuantas += 1

    def cerrar(self) -> None:
        event.remove(self._motor, "before_cursor_execute", self._contar)


@pytest.fixture
def sentencias(motor_pruebas: AsyncEngine) -> Iterator[Sentencias]:
    contador = Sentencias(motor_pruebas)
    try:
        yield contador
    finally:
        contador.cerrar()
        assert servicio._vuelos == {}, "el mapa de vuelos debe quedar vacío"


def _pausar_el_primer_armado(
    monkeypatch: pytest.MonkeyPatch, *, falla: Exception | None = None
) -> tuple[asyncio.Event, asyncio.Event]:
    """El primer `_armar` lee la base y se detiene hasta `suelta`; `leyo` avisa que ya leyó."""
    original = servicio._armar
    leyo, suelta = asyncio.Event(), asyncio.Event()
    primero = {"pendiente": True}

    async def _armar(*args: Any, **kwargs: Any) -> Any:
        if not primero["pendiente"]:
            return await original(*args, **kwargs)
        primero["pendiente"] = False
        if falla is not None:
            leyo.set()
            await suelta.wait()
            raise falla
        viejo = await original(*args, **kwargs)
        leyo.set()
        await suelta.wait()
        return viejo

    monkeypatch.setattr(servicio, "_armar", _armar)
    return leyo, suelta


@pytest.fixture(autouse=True)
def reloj() -> Iterator[Reloj]:
    yield from reloj_falso()


def _nombre(foto: servicio.FotoMenu) -> str:
    import json

    return str(json.loads(foto.cuerpo)["categorias"][0]["platillos"][0]["nombre"])


# ===========================================================================
# A2 · vuelo único
# ===========================================================================


@pytest.mark.ac("AC-04.1")
async def test_40_peticiones_simultaneas_con_la_cache_fria_leen_la_base_una_vez(
    sesion: AsyncSession, restaurante: Restaurante, platillo: Platillo, sentencias: Sentencias
) -> None:
    fotos = await asyncio.gather(*(servicio.menu(sesion, restaurante.slug) for _ in range(40)))
    assert sentencias.cuantas == 1
    assert len({f.etag for f in fotos}) == 1
    assert all(f.almacenable for f in fotos)
    await servicio.menu(sesion, restaurante.slug)  # y la siguiente sale de la caché
    assert sentencias.cuantas == 1


@pytest.mark.ac("AC-04.1")
async def test_por_http_las_simultaneas_comparten_una_lectura(
    cliente: AsyncClient,
    restaurante: Restaurante,
    platillo: Platillo,
    sentencias: Sentencias,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    original = servicio._armar

    async def _lenta(*args: Any, **kwargs: Any) -> Any:
        await asyncio.sleep(0.05)  # que todas lleguen mientras se arma
        return await original(*args, **kwargs)

    monkeypatch.setattr(servicio, "_armar", _lenta)
    # Las peticiones HTTP de la prueba comparten una conexión: la primera arma, el resto espera.
    respuestas = await asyncio.gather(
        *(cliente.get(f"{P}/menu/{restaurante.slug}") for _ in range(10))
    )
    assert {r.status_code for r in respuestas} == {200}
    assert len({r.headers["etag"] for r in respuestas}) == 1
    assert sentencias.cuantas == 1


@pytest.mark.ac("AC-04.1")
async def test_slugs_distintos_no_se_esperan_entre_si(
    sesion: AsyncSession,
    restaurante: Restaurante,
    platillo: Platillo,
    fabrica_restaurante: Fabrica,
    fabrica_categoria: Fabrica,
    fabrica_platillo: Fabrica,
    sentencias: Sentencias,
) -> None:
    otro: Restaurante = await fabrica_restaurante()
    await fabrica_platillo(otro, await fabrica_categoria(otro))
    a, b = await asyncio.gather(
        servicio.menu(sesion, restaurante.slug), servicio.menu(sesion, otro.slug)
    )
    assert a.etag != b.etag
    assert sentencias.cuantas == 2


@pytest.mark.ac("AC-04.1")
async def test_si_armar_falla_el_error_llega_a_todos_y_el_slug_no_se_atasca(
    sesion: AsyncSession,
    restaurante: Restaurante,
    platillo: Platillo,
    monkeypatch: pytest.MonkeyPatch,
    sentencias: Sentencias,
) -> None:
    leyo, suelta = _pausar_el_primer_armado(monkeypatch, falla=RuntimeError("base caída"))
    tareas = [asyncio.create_task(servicio.menu(sesion, restaurante.slug)) for _ in range(6)]
    await leyo.wait()
    suelta.set()
    resultados = await asyncio.gather(*tareas, return_exceptions=True)
    assert all(isinstance(r, RuntimeError) and str(r) == "base caída" for r in resultados)
    assert servicio._vuelos == {}
    foto = await servicio.menu(sesion, restaurante.slug)  # la siguiente reintenta y funciona
    assert foto.almacenable


@pytest.mark.ac("AC-04.1")
async def test_un_404_del_armado_llega_a_todos_los_que_esperan(
    sesion: AsyncSession, monkeypatch: pytest.MonkeyPatch, sentencias: Sentencias
) -> None:
    leyo, suelta = _pausar_el_primer_armado(monkeypatch, falla=servicio.no_encontrado())
    tareas = [asyncio.create_task(servicio.menu(sesion, "no-existe")) for _ in range(5)]
    await leyo.wait()
    suelta.set()
    resultados = await asyncio.gather(*tareas, return_exceptions=True)
    assert all(getattr(r, "http", None) == 404 for r in resultados), resultados


@pytest.mark.ac("AC-04.1")
async def test_si_se_cancela_quien_arma_los_demas_no_se_cuelgan_ni_se_cancelan(
    sesion: AsyncSession,
    restaurante: Restaurante,
    platillo: Platillo,
    monkeypatch: pytest.MonkeyPatch,
    sentencias: Sentencias,
) -> None:
    leyo, suelta = _pausar_el_primer_armado(monkeypatch)
    primera = asyncio.create_task(servicio.menu(sesion, restaurante.slug))
    await leyo.wait()
    otras = [asyncio.create_task(servicio.menu(sesion, restaurante.slug)) for _ in range(4)]
    await asyncio.sleep(0)  # que lleguen al vuelo
    primera.cancel()
    resultados = await asyncio.wait_for(asyncio.gather(*otras, return_exceptions=True), 10)
    with pytest.raises(asyncio.CancelledError):
        await primera
    assert all(isinstance(r, servicio.FotoMenu) for r in resultados), resultados
    assert not suelta.is_set()


@pytest.mark.ac("AC-04.1")
async def test_si_se_cancela_uno_que_espera_el_vuelo_sigue(
    sesion: AsyncSession,
    restaurante: Restaurante,
    platillo: Platillo,
    monkeypatch: pytest.MonkeyPatch,
    sentencias: Sentencias,
) -> None:
    leyo, suelta = _pausar_el_primer_armado(monkeypatch)
    primera = asyncio.create_task(servicio.menu(sesion, restaurante.slug))
    await leyo.wait()
    impaciente = asyncio.create_task(servicio.menu(sesion, restaurante.slug))
    paciente = asyncio.create_task(servicio.menu(sesion, restaurante.slug))
    await asyncio.sleep(0)
    impaciente.cancel()
    suelta.set()
    assert isinstance(await primera, servicio.FotoMenu)
    assert isinstance(await paciente, servicio.FotoMenu)
    with pytest.raises(asyncio.CancelledError):
        await impaciente


# ===========================================================================
# A1 · una lectura anterior al commit no se puede cachear
# ===========================================================================


@pytest.mark.ac("AC-04.4")
async def test_por_http_una_lectura_anterior_a_la_escritura_sale_no_store(
    cliente: AsyncClient,
    restaurante: Restaurante,
    platillo: Platillo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    nombre_inicial = platillo.nombre
    original = servicio._armar

    una_vez = {"pendiente": True}

    async def _leer_y_que_otro_escriba(*args: Any, **kwargs: Any) -> Any:
        viejo = await original(*args, **kwargs)
        if not una_vez["pendiente"]:
            return viejo
        una_vez["pendiente"] = False
        await args[0].execute(  # la escritura de otra petición, confirmada y ya invalidada
            update(Platillo).where(Platillo.id == platillo.id).values(nombre="Después")
        )
        await args[0].commit()
        cache_menu.invalidar(restaurante.slug)
        return viejo

    monkeypatch.setattr(servicio, "_armar", _leer_y_que_otro_escriba)
    primera = await cliente.get(f"{P}/menu/{restaurante.slug}")
    assert primera.status_code == 200
    assert primera.json()["categorias"][0]["platillos"][0]["nombre"] == nombre_inicial
    assert primera.headers["cache-control"] == "no-store"
    assert "public" not in primera.headers["cache-control"]
    assert cache_menu.obtener(restaurante.slug) is None
    siguiente = await cliente.get(f"{P}/menu/{restaurante.slug}")
    assert siguiente.json()["categorias"][0]["platillos"][0]["nombre"] == "Después"
    assert siguiente.headers["cache-control"] == "public, max-age=30, s-maxage=30"
    assert siguiente.headers["etag"] != primera.headers["etag"]


@pytest.mark.ac("AC-04.4")
async def test_los_que_esperan_un_vuelo_invalidado_tampoco_reciben_copia_cacheable(
    sesion: AsyncSession,
    restaurante: Restaurante,
    platillo: Platillo,
    monkeypatch: pytest.MonkeyPatch,
    sentencias: Sentencias,
) -> None:
    nombre_inicial = platillo.nombre
    leyo, suelta = _pausar_el_primer_armado(monkeypatch)
    tareas = [asyncio.create_task(servicio.menu(sesion, restaurante.slug)) for _ in range(5)]
    await leyo.wait()  # el primero ya leyó el menú viejo y está detenido
    await sesion.execute(update(Platillo).where(Platillo.id == platillo.id).values(nombre="Nuevo"))
    await sesion.commit()
    cache_menu.invalidar(restaurante.slug)
    suelta.set()
    fotos = await asyncio.gather(*tareas)
    assert [f.almacenable for f in fotos] == [False] * 5
    assert {f.cabecera_cache() for f in fotos} == {"no-store"}
    assert {_nombre(f) for f in fotos} == {nombre_inicial}
    assert cache_menu.obtener(restaurante.slug) is None
    leidas = sentencias.cuantas
    siguiente = await servicio.menu(sesion, restaurante.slug)  # la siguiente vuelve a leer
    assert sentencias.cuantas == leidas + 1
    assert _nombre(siguiente) == "Nuevo" and siguiente.almacenable


# ===========================================================================
# B1 · edad + s-maxage <= 30 (revisión de T-2.7: antes 60; ver AC-04.4 en el servicio)
# ===========================================================================


def _foto(edad: float, reloj: Reloj) -> servicio.FotoMenu:
    return servicio.FotoMenu(cuerpo=b"{}", etag='"x"', construido=reloj() - edad)


@pytest.mark.ac("AC-04.1")
@pytest.mark.parametrize("edad", [0.0, 0.5, 9.99, 20.9, 29.5, 29.999, 30.0])
def test_la_edad_mas_el_s_maxage_nunca_pasa_de_30(edad: float, reloj: Reloj) -> None:
    cabecera = _foto(edad, reloj).cabecera_cache()
    m = re.fullmatch(r"public, max-age=(\d+), s-maxage=(\d+)", cabecera)
    assert m, cabecera
    max_age, s_maxage = int(m[1]), int(m[2])
    assert edad + s_maxage <= 30
    assert edad + max_age <= 30


@pytest.mark.ac("AC-04.1")
@pytest.mark.parametrize(
    ("edad", "esperado"),
    [
        (0.0, "public, max-age=30, s-maxage=30"),
        (0.5, "public, max-age=29, s-maxage=29"),
        (9.99, "public, max-age=20, s-maxage=20"),
        (20.9, "public, max-age=9, s-maxage=9"),
        (29.999, "public, max-age=0, s-maxage=0"),
        (45.0, "public, max-age=0, s-maxage=0"),  # un armado lento, fuera de la caché
        (75.0, "public, max-age=0, s-maxage=0"),
    ],
)
def test_los_tiempos_exactos_por_edad(edad: float, esperado: str, reloj: Reloj) -> None:
    assert _foto(edad, reloj).cabecera_cache() == esperado


@pytest.mark.ac("AC-04.4")
def test_una_copia_no_almacenable_sale_no_store(reloj: Reloj) -> None:
    foto = servicio.FotoMenu(b"{}", '"x"', reloj(), almacenable=False)
    assert foto.cabecera_cache() == "no-store"


@pytest.mark.ac("AC-04.4")
async def test_la_edad_de_la_copia_cuenta_desde_antes_de_leer_la_base(
    cliente: AsyncClient,
    restaurante: Restaurante,
    platillo: Platillo,
    reloj: Reloj,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Revisión del PR de T-2.7: el reloj de la copia se tomaba al terminar de armarla. Un
    armado lento (2 s) dejaba servir el menú 30 s contados desde el final, es decir 32 s desde
    que se leyó la base, y se comía el margen de AC-04.4 (30 s de copia + 25 s del turno del
    comensal)."""
    original = servicio._armar
    armados = 0

    async def _armar_lento(*args: Any, **kwargs: Any) -> Any:
        nonlocal armados
        armados += 1
        leido = await original(*args, **kwargs)
        reloj.avanzar(2)  # lo que tardó la lectura
        return leido

    monkeypatch.setattr(servicio, "_armar", _armar_lento)
    primera = await cliente.get(f"{P}/menu/{restaurante.slug}")
    assert primera.status_code == 200
    assert primera.headers["cache-control"] == "public, max-age=28, s-maxage=28"
    reloj.avanzar(27.9)  # 29.9 s desde la lectura: la copia de este worker sigue valiendo
    assert (await cliente.get(f"{P}/menu/{restaurante.slug}")).status_code == 200
    assert armados == 1
    reloj.avanzar(0.2)  # 30.1 s desde la lectura: ya no
    assert (await cliente.get(f"{P}/menu/{restaurante.slug}")).status_code == 200
    assert armados == 2


# Fixture `Fabrica` sólo para anotar tipos
from tests.conftest import Fabrica  # noqa: E402
