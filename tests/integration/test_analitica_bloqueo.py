"""T-2.3 (revisión de la maestra, A1): con `evento_analitica` bloqueada la analítica no
tumba al comensal ni por latencia ni por agotar el pool.

Dos conexiones reales (receta de carreras de `/pruebas` §3): el restaurante y la mesa se
confirman de verdad, la aplicación usa su propio pool (sin la transacción de la prueba) y
otra conexión toma `ACCESS EXCLUSIVE` sobre la tabla (lo que haría una migración o un
`VACUUM FULL`). Mientras tanto 40 lotes de eventos simultáneos, el sondeo y una entrada nueva
responden a tiempo: cada escritura de analítica espera como mucho `lock_timeout` (1 s) y sólo
`MAX_ESCRITURAS_SIMULTANEAS` ocupan conexión; las demás se descartan en silencio.
"""

from __future__ import annotations

import asyncio
import time
from collections.abc import AsyncIterator
from typing import Any
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient, Response
from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.db.models import EventoAnalitica, Mesa, Restaurante
from app.main import app
from app.services import analitica
from app.services.sesion import cache_estados
from tests.fabricas import codigo_de_mesa
from tests.invitado_pruebas import P, con_token, token_de


@pytest.fixture
async def mesa_real(motor_pruebas: AsyncEngine) -> AsyncIterator[dict[str, Any]]:
    """Restaurante y dos mesas confirmados de verdad; al final se borra el restaurante (arrastra
    mesas, sesiones, miembros y eventos)."""
    fabrica = async_sessionmaker(motor_pruebas, expire_on_commit=False)
    async with fabrica() as s:
        restaurante = Restaurante(nombre="Bloqueo", slug=f"bloqueo-{uuid4().hex[:8]}")
        s.add(restaurante)
        await s.flush()
        mesas = [
            Mesa(restaurante_id=restaurante.id, numero=n, codigo_publico=codigo_de_mesa())
            for n in (1, 2)
        ]
        s.add_all(mesas)
        await s.commit()
    try:
        yield {"fabrica": fabrica, "restaurante": restaurante, "mesas": mesas}
    finally:
        cache_estados.vaciar()
        async with fabrica() as s:
            await s.execute(delete(Restaurante).where(Restaurante.id == restaurante.id))
            await s.commit()


async def _cronometrado(peticion: Any) -> tuple[Response, float]:
    inicio = time.perf_counter()
    respuesta = await peticion
    return respuesta, time.perf_counter() - inicio


async def test_con_la_tabla_bloqueada_el_comensal_sigue_respondiendo_a_tiempo(
    motor_pruebas: AsyncEngine, mesa_real: dict[str, Any]
) -> None:
    mesa, otra = mesa_real["mesas"]
    transporte = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transporte, base_url="http://pruebas") as c:
        entrada = await c.post(f"{P}/sesion/entrar", json={"codigo_mesa": mesa.codigo_publico})
        assert entrada.status_code == 200
        cookie = con_token(token_de(entrada))

        async with motor_pruebas.connect() as candado:
            await candado.begin()
            await candado.execute(text("LOCK TABLE evento_analitica IN ACCESS EXCLUSIVE MODE"))
            try:
                lote = {"eventos": [{"tipo": "menu_view"}]}
                inicio = time.perf_counter()
                # Sin plazos ni cupo, esto esperaba al candado: el `wait_for` lo hace fallar
                # en vez de colgar la suite.
                resultados = await asyncio.wait_for(
                    asyncio.gather(
                        *(
                            _cronometrado(c.post(f"{P}/eventos", json=lote, headers=cookie))
                            for _ in range(40)
                        ),
                        _cronometrado(c.get(f"{P}/sesion", headers=cookie)),
                        _cronometrado(
                            c.post(f"{P}/sesion/entrar", json={"codigo_mesa": otra.codigo_publico})
                        ),
                    ),
                    timeout=10,
                )
                total = time.perf_counter() - inicio
            finally:
                await candado.rollback()

    eventos, (sondeo, t_sondeo), (nueva, t_nueva) = resultados[:40], resultados[40], resultados[41]
    assert [r.status_code for r, _ in eventos] == [202] * 40
    assert max(t for _, t in eventos) < 3
    assert sondeo.status_code == 200 and t_sondeo < 3, (sondeo.status_code, t_sondeo)
    assert nueva.status_code == 200 and t_nueva < 3, (nueva.status_code, t_nueva)
    assert total < 4
    assert analitica.turnos.en_curso == 0
    # Nada de lo que llegó con la tabla bloqueada quedó a medias; el `scan` de la primera
    # entrada (antes del candado) sí está.
    async with mesa_real["fabrica"]() as s:
        tipos = (
            await s.execute(
                select(EventoAnalitica.tipo, func.count())
                .where(EventoAnalitica.restaurante_id == mesa_real["restaurante"].id)
                .group_by(EventoAnalitica.tipo)
            )
        ).all()
    assert dict(tipos) == {"scan": 1}
