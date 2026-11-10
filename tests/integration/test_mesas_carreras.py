"""T-1.5 (revisión, A3): altas y regeneraciones con conexiones reales (`FOR UPDATE`).

Los datos se confirman de verdad y se borran en `finally` (receta de carreras de /pruebas).
La conexión A toma el candado sin confirmar; el servicio corre en la conexión B y tiene que
esperar. «Esperar» se comprueba con `asyncio.wait(timeout=…)`, sin dormir.
"""

from __future__ import annotations

import asyncio
import secrets
from collections.abc import AsyncIterator
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.core.errores import ErrorCarta
from app.db.models import Mesa, Restaurante
from app.schemas.mesa import MAX_MESAS_ACTIVAS
from app.services import mesas

ESPERA = 0.5


@pytest.fixture
async def fabrica(motor_pruebas: AsyncEngine) -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    yield async_sessionmaker(motor_pruebas, expire_on_commit=False)


@pytest.fixture
async def restaurante_confirmado(
    fabrica: async_sessionmaker[AsyncSession],
) -> AsyncIterator[Restaurante]:
    async with fabrica() as s:
        restaurante = Restaurante(nombre="Carrera", slug=f"carrera-{uuid4().hex[:8]}")
        s.add(restaurante)
        await s.commit()
    try:
        yield restaurante
    finally:
        async with fabrica() as s:
            await s.execute(
                text("DELETE FROM mesa WHERE restaurante_id = :r"), {"r": restaurante.id}
            )
            await s.execute(text("DELETE FROM restaurante WHERE id = :r"), {"r": restaurante.id})
            await s.commit()


async def _con_mesas(
    fabrica: async_sessionmaker[AsyncSession], restaurante: Restaurante, cuantas: int
) -> None:
    async with fabrica() as s:
        s.add_all(
            Mesa(
                restaurante_id=restaurante.id,
                numero=n,
                codigo_publico=secrets.token_urlsafe(16),
            )
            for n in range(1, cuantas + 1)
        )
        await s.commit()


@pytest.mark.ac("AC-21.1")
async def test_dos_altas_simultaneas_no_pasan_del_tope_ni_repiten_numero(
    fabrica: async_sessionmaker[AsyncSession], restaurante_confirmado: Restaurante
) -> None:
    rid = restaurante_confirmado.id
    await _con_mesas(fabrica, restaurante_confirmado, MAX_MESAS_ACTIVAS - 60)

    async def alta() -> list[Mesa]:
        async with fabrica() as s:
            return await mesas.crear_mesas(s, rid, 60, 4)

    resultados = await asyncio.gather(alta(), alta(), return_exceptions=True)
    exitos = [r for r in resultados if isinstance(r, list)]
    errores = [r for r in resultados if isinstance(r, ErrorCarta)]
    assert len(exitos) == 1 and len(errores) == 1, resultados
    assert errores[0].http == 422
    async with fabrica() as s:
        numeros = list(await s.scalars(select(Mesa.numero).where(Mesa.restaurante_id == rid)))
    assert len(numeros) == MAX_MESAS_ACTIVAS and len(set(numeros)) == len(numeros)
    assert max(numeros) == MAX_MESAS_ACTIVAS


@pytest.mark.ac("AC-21.1")
async def test_crear_espera_el_candado_del_restaurante(
    fabrica: async_sessionmaker[AsyncSession], restaurante_confirmado: Restaurante
) -> None:
    rid = restaurante_confirmado.id
    async with fabrica() as a:
        await a.scalar(select(Restaurante.id).where(Restaurante.id == rid).with_for_update())

        async def alta_b() -> list[Mesa]:
            async with fabrica() as b:
                return await mesas.crear_mesas(b, rid, 2, 4)

        tarea = asyncio.create_task(alta_b())
        hecho, _ = await asyncio.wait({tarea}, timeout=ESPERA)
        assert not hecho, "B tenía que esperar el candado de A"
        await a.commit()
    assert [m.numero for m in await asyncio.wait_for(tarea, timeout=10)] == [1, 2]


@pytest.mark.ac("AC-21.3")
async def test_regenerar_espera_el_candado_de_la_mesa_y_deja_un_solo_codigo_vigente(
    fabrica: async_sessionmaker[AsyncSession], restaurante_confirmado: Restaurante
) -> None:
    rid = restaurante_confirmado.id
    await _con_mesas(fabrica, restaurante_confirmado, 1)
    async with fabrica() as s:
        mesa = (await s.scalars(select(Mesa).where(Mesa.restaurante_id == rid))).one()
    viejo = mesa.codigo_publico

    async with fabrica() as a:
        await a.scalar(select(Mesa.id).where(Mesa.id == mesa.id).with_for_update())

        async def regenera() -> Mesa:
            async with fabrica() as b:
                return await mesas.regenerar_codigo(b, mesa.id, rid)

        tarea = asyncio.create_task(regenera())
        hecho, _ = await asyncio.wait({tarea}, timeout=ESPERA)
        assert not hecho, "B tenía que esperar el candado de A"
        await a.commit()
    await asyncio.wait_for(tarea, timeout=10)

    # Dos regeneraciones a la vez: ambas responden, y sólo el último código vale.
    primera, segunda = await asyncio.gather(regenera(), regenera())
    async with fabrica() as s:
        vigente = await s.scalar(select(Mesa.codigo_publico).where(Mesa.id == mesa.id))
        total = await s.scalar(select(func.count()).select_from(Mesa).where(Mesa.id == mesa.id))
        resueltos = [
            await mesas.mesa_por_codigo(s, c)
            for c in (viejo, primera.codigo_publico, segunda.codigo_publico)
        ]
    assert total == 1
    assert vigente in {primera.codigo_publico, segunda.codigo_publico}
    assert sum(r is not None for r in resueltos) == 1  # uno solo resuelve
    assert resueltos[0] is None
