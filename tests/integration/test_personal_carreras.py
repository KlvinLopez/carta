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
from app.db.models import Mesa, PersonalRestaurante, Restaurante, RolPersonal
from app.services import mesas, personal
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
                text("DELETE FROM mesa WHERE restaurante_id = :r"), {"r": restaurante.id}
            )
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


async def _persona(
    fabrica: async_sessionmaker[AsyncSession], restaurante: Restaurante, **valores: object
) -> PersonalRestaurante:
    async with fabrica() as s:
        persona = PersonalRestaurante(
            restaurante_id=restaurante.id,
            nombre=str(valores.pop("nombre", "Ana")),
            pin_hash=hash_de_pin_de_prueba(),
            **valores,  # type: ignore[arg-type]
        )
        s.add(persona)
        await s.commit()
    return persona


@pytest.mark.ac("AC-26.3")
async def test_una_baja_pedida_sobre_una_persona_precargada_no_se_pierde(
    fabrica: async_sessionmaker[AsyncSession], restaurante_confirmado: Restaurante
) -> None:
    """A1 de la revisión: `b` ya cargó a la persona (como `personal_del_operador`); `a` la
    reactiva; la baja que pide `b` después tiene que verse con el estado fresco."""
    persona = await _persona(fabrica, restaurante_confirmado, activo=False)
    rid = restaurante_confirmado.id
    async with fabrica() as a, fabrica() as b:
        cargada = await b.get(PersonalRestaurante, persona.id)
        assert cargada is not None and cargada.activo is False
        await personal.cambiar_personal(a, persona.id, rid, activo=True)
        antes = (await personal.cambiar_personal(a, persona.id, rid, nombre="Ana")).sesiones_desde
        await personal.cambiar_personal(b, persona.id, rid, activo=False)
    async with fabrica() as s:
        final = await s.get(PersonalRestaurante, persona.id)
        assert final is not None
        assert final.activo is False
        assert final.sesiones_desde > antes  # la baja revocó


@pytest.mark.ac("AC-26.3")
async def test_un_cambio_de_rol_sobre_una_persona_precargada_tampoco_se_pierde(
    fabrica: async_sessionmaker[AsyncSession], restaurante_confirmado: Restaurante
) -> None:
    persona = await _persona(fabrica, restaurante_confirmado)  # mesero
    rid = restaurante_confirmado.id
    async with fabrica() as a, fabrica() as b:
        cargada = await b.get(PersonalRestaurante, persona.id)
        assert cargada is not None and cargada.rol == RolPersonal.mesero
        await personal.cambiar_personal(a, persona.id, rid, rol=RolPersonal.capitan)
        sello = (await personal.cambiar_personal(a, persona.id, rid, nombre="Ana")).sesiones_desde
        await personal.cambiar_personal(b, persona.id, rid, rol=RolPersonal.mesero)
    async with fabrica() as s:
        final = await s.get(PersonalRestaurante, persona.id)
        assert final is not None
        assert final.rol == RolPersonal.mesero
        assert final.sesiones_desde > sello


@pytest.mark.ac("AC-26.1")
async def test_doble_clic_al_reactivar_cerca_del_tope_da_dos_200(
    fabrica: async_sessionmaker[AsyncSession],
    restaurante_confirmado: Restaurante,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(personal, "MAX_PERSONAL_ACTIVO", 2)
    await _persona(fabrica, restaurante_confirmado, nombre="Uno")
    baja = await _persona(fabrica, restaurante_confirmado, nombre="Dos", activo=False)
    rid = restaurante_confirmado.id
    async with fabrica() as a, fabrica() as b:
        for s in (a, b):  # las dos peticiones ya cargaron a la persona inactiva
            await s.get(PersonalRestaurante, baja.id)
        # El primer clic confirma; el segundo llega con la persona ya cargada como inactiva.
        primero = await personal.cambiar_personal(a, baja.id, rid, activo=True)
        segundo = await personal.cambiar_personal(b, baja.id, rid, activo=True)
    assert primero.activo and segundo.activo
    async with fabrica() as s:
        activos = await s.scalar(
            select(func.count())
            .select_from(PersonalRestaurante)
            .where(PersonalRestaurante.restaurante_id == rid, PersonalRestaurante.activo)
        )
        assert activos == 2


@pytest.mark.ac("AC-21.3")
async def test_regenerar_el_codigo_de_una_mesa_precargada_ve_que_ya_esta_de_baja(
    fabrica: async_sessionmaker[AsyncSession], restaurante_confirmado: Restaurante
) -> None:
    """Mismo defecto que A1 en `mesas.regenerar_codigo`."""
    async with fabrica() as s:
        mesa = Mesa(
            restaurante_id=restaurante_confirmado.id, numero=1, codigo_publico=mesas.nuevo_codigo()
        )
        s.add(mesa)
        await s.commit()
    async with fabrica() as a, fabrica() as b:
        cargada = await b.get(Mesa, mesa.id)
        assert cargada is not None and cargada.activa is True
        (viva,) = (await a.scalars(select(Mesa).where(Mesa.id == mesa.id))).all()
        viva.activa = False
        await a.commit()
        with pytest.raises(ErrorCarta) as error:
            await mesas.regenerar_codigo(b, mesa.id, restaurante_confirmado.id)
    assert error.value.codigo == "MESA_INACTIVA"
    async with fabrica() as s:
        final = await s.get(Mesa, mesa.id)
        assert final is not None and final.codigo_publico == mesa.codigo_publico
