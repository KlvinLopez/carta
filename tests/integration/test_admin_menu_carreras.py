"""T-1.3 (revisión, A4): reordenar con dos conexiones reales (`FOR UPDATE` y la rama 409).

Los datos se confirman de verdad (otra conexión tiene que verlos) y se borran en `finally`
(receta de carreras del skill /pruebas). La conexión A toma el candado y cambia filas sin
confirmar; el servicio corre en la conexión B y tiene que esperar y leer lo que A confirmó.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.core.errores import ErrorCarta
from app.db.models import CategoriaMenu, Platillo, Restaurante
from app.services import menu
from app.services.cache_menu import CacheMenu

ESPERA = 0.5  # lo que A retiene el candado


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
                text("DELETE FROM platillo WHERE restaurante_id = :r"), {"r": restaurante.id}
            )
            await s.execute(
                text("DELETE FROM categoria_menu WHERE restaurante_id = :r"), {"r": restaurante.id}
            )
            await s.execute(text("DELETE FROM restaurante WHERE id = :r"), {"r": restaurante.id})
            await s.commit()


async def _ordenes(
    fabrica: async_sessionmaker[AsyncSession], modelo: type, ids: list[UUID]
) -> list[UUID]:
    async with fabrica() as s:
        filas = await s.scalars(select(modelo).where(modelo.id.in_(ids)).order_by(modelo.orden))
        return [f.id for f in filas]


@pytest.mark.ac("AC-16.1")
async def test_dos_reordenamientos_simultaneos_no_se_intercalan(
    fabrica: async_sessionmaker[AsyncSession], restaurante_confirmado: Restaurante
) -> None:
    rid = restaurante_confirmado.id
    async with fabrica() as s:
        a, b, c, d = (
            CategoriaMenu(restaurante_id=rid, nombre=n, orden=i) for i, n in enumerate("ABCD", 1)
        )
        s.add_all([a, b, c, d])
        await s.commit()
    ids = [a.id, b.id, c.id, d.id]

    async with fabrica() as sesion_a:
        # A: candado sobre todas y orden nuevo D, C, B, A sin confirmar.
        filas = list(
            await sesion_a.scalars(
                select(CategoriaMenu)
                .where(CategoriaMenu.restaurante_id == rid)
                .order_by(CategoriaMenu.id)
                .with_for_update()
            )
        )
        for fila in filas:
            fila.orden = 5 - "ABCD".index(fila.nombre)
        await sesion_a.flush()

        async def reordenar_b() -> list[UUID]:
            async with fabrica() as sesion_b:
                # B sólo manda B; el resto tiene que quedar en el orden que dejó A.
                nuevo = await menu.reordenar_categorias(sesion_b, rid, [b.id], CacheMenu())
                return [f.id for f in nuevo]

        tarea_b = asyncio.create_task(reordenar_b())
        await asyncio.sleep(ESPERA)
        assert not tarea_b.done(), "B tenía que esperar el candado de A"
        await sesion_a.commit()
        resultado_b = await asyncio.wait_for(tarea_b, timeout=10)

    # Con candado B lee lo que confirmó A (D, C, A después de B). Sin él, el orden previo.
    assert resultado_b == [b.id, d.id, c.id, a.id]
    assert await _ordenes(fabrica, CategoriaMenu, ids) == [b.id, d.id, c.id, a.id]


@pytest.mark.ac("AC-16.1")
async def test_reordenar_platillos_con_otro_que_lo_movio_de_categoria_es_409(
    fabrica: async_sessionmaker[AsyncSession], restaurante_confirmado: Restaurante
) -> None:
    rid = restaurante_confirmado.id
    async with fabrica() as s:
        origen = CategoriaMenu(restaurante_id=rid, nombre="Origen", orden=1)
        destino = CategoriaMenu(restaurante_id=rid, nombre="Destino", orden=2)
        s.add_all([origen, destino])
        await s.flush()
        p1, p2 = (
            Platillo(
                restaurante_id=rid, categoria_id=origen.id, nombre=n, precio=Decimal(1), orden=i
            )
            for i, n in enumerate(("Uno", "Dos"), 1)
        )
        s.add_all([p1, p2])
        await s.commit()

    async with fabrica() as sesion_a:
        # A mueve p1 a otra categoría y retiene la fila sin confirmar.
        movido = await sesion_a.get(Platillo, p1.id, with_for_update=True)
        assert movido is not None
        movido.categoria_id = destino.id
        await sesion_a.flush()

        async def reordenar_b() -> None:
            async with fabrica() as sesion_b:
                await menu.reordenar_platillos(sesion_b, rid, [p2.id, p1.id], CacheMenu())

        tarea_b = asyncio.create_task(reordenar_b())
        await asyncio.sleep(ESPERA)
        assert not tarea_b.done(), "B tenía que esperar el candado de A"
        await sesion_a.commit()
        with pytest.raises(ErrorCarta) as error:
            await asyncio.wait_for(tarea_b, timeout=10)

    assert (error.value.http, error.value.codigo) == (409, "CONFLICTO")
    async with fabrica() as s:
        filas = {
            f.id: f for f in await s.scalars(select(Platillo).where(Platillo.restaurante_id == rid))
        }
    # Nada a medias: p2 conserva su orden y p1 queda donde lo dejó A.
    assert (filas[p1.id].categoria_id, filas[p1.id].orden, filas[p2.id].orden) == (destino.id, 1, 2)
