"""T-1.6: altas de personal que compiten, con conexiones reales (`FOR UPDATE` y UNIQUE).

Los datos se confirman de verdad y se borran en `finally` (receta de carreras de /pruebas).
La conexión A toma el candado sin confirmar; el servicio corre en la conexión B y tiene que
esperar. «Esperar» se comprueba con `asyncio.wait(timeout=…)`, sin dormir.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.core.errores import ErrorCarta
from app.db.models import PersonalRestaurante, Restaurante, RolPersonal
from app.services import personal
from tests.fabricas import hash_de_pin_de_prueba

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
                text("DELETE FROM personal_restaurante WHERE restaurante_id = :r"),
                {"r": restaurante.id},
            )
            await s.execute(text("DELETE FROM restaurante WHERE id = :r"), {"r": restaurante.id})
            await s.commit()


async def _total(fabrica: async_sessionmaker[AsyncSession], restaurante: Restaurante) -> int:
    async with fabrica() as s:
        total = await s.scalar(
            select(func.count())
            .select_from(PersonalRestaurante)
            .where(PersonalRestaurante.restaurante_id == restaurante.id)
        )
        return total or 0


@pytest.mark.ac("AC-26.1")
async def test_dos_altas_con_el_mismo_nombre_una_gana_y_la_otra_es_409(
    fabrica: async_sessionmaker[AsyncSession], restaurante_confirmado: Restaurante
) -> None:
    """A inserta «Ana» sin confirmar; B pide el mismo nombre y espera; al confirmar A, B recibe
    el 409 `CONFLICTO` (no un 500 ni una segunda fila)."""
    async with fabrica() as a, fabrica() as b:
        a.add(
            PersonalRestaurante(
                restaurante_id=restaurante_confirmado.id,
                nombre="Ana",
                pin_hash=hash_de_pin_de_prueba(),
            )
        )
        await a.flush()
        tarea = asyncio.create_task(
            personal.crear_personal(
                b, restaurante_confirmado.id, " ana", RolPersonal.mesero, "1234"
            )
        )
        hecho, _ = await asyncio.wait({tarea}, timeout=ESPERA)
        assert not hecho  # B espera a A
        await a.commit()
        with pytest.raises(ErrorCarta) as error:
            await tarea
    assert (error.value.http, error.value.codigo) == (409, "CONFLICTO")
    assert await _total(fabrica, restaurante_confirmado) == 1


@pytest.mark.ac("AC-26.1")
async def test_el_indice_unico_ataja_al_nombre_aunque_nadie_tome_el_candado(
    fabrica: async_sessionmaker[AsyncSession], restaurante_confirmado: Restaurante
) -> None:
    """Sin pasar por el servicio: dos inserciones del mismo nombre activo, la segunda espera
    al índice `uq_personal_activo_por_nombre` y falla al confirmar la primera."""
    async with fabrica() as a, fabrica() as b:
        for s, nombre in ((a, "Ana"), (b, "ANA ")):
            s.add(
                PersonalRestaurante(
                    restaurante_id=restaurante_confirmado.id,
                    nombre=nombre,
                    pin_hash=hash_de_pin_de_prueba(),
                )
            )
        await a.flush()
        segunda = asyncio.create_task(b.flush())
        hecho, _ = await asyncio.wait({segunda}, timeout=ESPERA)
        assert not hecho
        await a.commit()
        with pytest.raises(IntegrityError):
            await segunda


@pytest.mark.ac("AC-26.1")
async def test_dos_altas_a_la_vez_no_pasan_del_tope(
    fabrica: async_sessionmaker[AsyncSession],
    restaurante_confirmado: Restaurante,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(personal, "MAX_PERSONAL_ACTIVO", 1)
    async with fabrica() as a, fabrica() as b:
        # A toma el candado del restaurante; B (otro nombre) espera y luego ve el tope lleno.
        await personal._bloquear_restaurante(a, restaurante_confirmado.id)
        tarea = asyncio.create_task(
            personal.crear_personal(
                b, restaurante_confirmado.id, "Luis", RolPersonal.mesero, "1234"
            )
        )
        hecho, _ = await asyncio.wait({tarea}, timeout=ESPERA)
        assert not hecho
        a.add(
            PersonalRestaurante(
                restaurante_id=restaurante_confirmado.id,
                nombre="Ana",
                pin_hash=hash_de_pin_de_prueba(),
            )
        )
        await a.commit()
        with pytest.raises(ErrorCarta) as error:
            await tarea
    assert (error.value.http, error.value.codigo) == (422, "PAYLOAD_INVALIDO")
    assert await _total(fabrica, restaurante_confirmado) == 1


@pytest.mark.ac("AC-26.3")
async def test_desactivar_y_reasignar_el_pin_a_la_vez_dejan_una_baja_con_el_pin_nuevo(
    fabrica: async_sessionmaker[AsyncSession], restaurante_confirmado: Restaurante
) -> None:
    """Dos escrituras sobre la misma persona se serializan con `FOR UPDATE`: ninguna se pierde."""
    async with fabrica() as s:
        persona = PersonalRestaurante(
            restaurante_id=restaurante_confirmado.id,
            nombre="Ana",
            pin_hash=hash_de_pin_de_prueba(),
        )
        s.add(persona)
        await s.commit()
    async with fabrica() as a, fabrica() as b:
        await personal._persona_bloqueada(a, persona.id, restaurante_confirmado.id)
        tarea = asyncio.create_task(
            personal.reasignar_pin(b, persona.id, restaurante_confirmado.id, "5678")
        )
        hecho, _ = await asyncio.wait({tarea}, timeout=ESPERA)
        assert not hecho
        a_persona = await personal._persona_bloqueada(a, persona.id, restaurante_confirmado.id)
        a_persona.activo = False
        await a.commit()
        await tarea
    async with fabrica() as s:
        final = await s.get(PersonalRestaurante, persona.id)
        assert final is not None
        assert final.activo is False
        assert await personal.verificar_pin(final.pin_hash, "5678") is True
