"""Fixtures compartidas: base PostgreSQL real migrada, transacción por prueba y cliente HTTP.

Cómo se apunta la aplicación a la base de pruebas
-------------------------------------------------
`app.db.database` crea el motor con `settings.DATABASE_URL` **al importarse**. Este archivo se
importa antes que cualquier módulo de pruebas, así que aquí, antes de tocar `app.db` o
`app.main`, se fija `DATABASE_URL` (variable de entorno y `settings`) a la URL de pruebas que
devuelve `tests.bd_pruebas.url_de_pruebas()` (`TEST_DATABASE_URL`, o `carta_test` junto a
`DATABASE_URL` local). Así todo lo que la aplicación conecte en una prueba —aunque esquive la
dependencia `get_db_session`— cae en la base de pruebas, nunca en la de desarrollo.
`uv run pytest` sin variables funciona: el valor por defecto de `Settings` apunta a
`carta_db` local y de ahí se deriva `carta_test`.

Transacción por prueba
----------------------
Un solo motor (`motor_pruebas`) y un solo bucle de eventos para toda la sesión de pruebas
(`asyncio_default_fixture_loop_scope = "session"` y `asyncio_default_test_loop_scope =
"session"` en `pyproject.toml`): una conexión asyncpg sólo sirve en el bucle donde nació. Cada
prueba toma una conexión, abre una transacción y la revierte al terminar. `sesion` es una
`AsyncSession` sobre esa conexión con `join_transaction_mode="create_savepoint"`: sus
`commit()` sólo liberan un *savepoint* y sus `rollback()` vuelven al último, así que lo que
las fábricas ya confirmaron sobrevive a un `rollback()` del código bajo prueba. `cliente`
sustituye `get_db_session` por **una sesión nueva por petición** sobre la misma conexión
(como en producción: una petición que revienta no contamina a la siguiente); lo que crean las
fábricas lo ve la petición y nada sobrevive a la prueba.

Esquema
-------
Lo crea la CLI de Alembic, como en el despliegue; nunca los modelos (regla dura 3). La base
compartida sólo recibe `upgrade head` (idempotente y serializado por un candado en
`migrations/env.py`); las pruebas que destruyen el esquema usan `bd_pruebas.base_desechable`.
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncConnection,
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.core.config import settings
from tests.bd_pruebas import alembic, url_de_pruebas

URL_PRUEBAS = url_de_pruebas()
os.environ["DATABASE_URL"] = URL_PRUEBAS
settings.DATABASE_URL = URL_PRUEBAS

# Sólo después de fijar la URL: importar cualquier `app.db.*` crea el motor global de la
# aplicación, que así nace ya sobre la base de pruebas.
from app.core.firebase import obtener_verificador  # noqa: E402
from app.db.database import close_db, get_db_session  # noqa: E402
from app.db.models import Mesa, OperadorRestaurante, Restaurante, Usuario  # noqa: E402
from app.main import app  # noqa: E402
from tests import fabricas  # noqa: E402
from tests.auth_pruebas import VERIFICADOR_DE_PRUEBA, cabecera_de  # noqa: E402

# Una segunda conexión que choque con una fila sin confirmar de la prueba no debe esperar
# hasta el final de la transacción (cuelgue sin diagnóstico): mejor un error pronto.
AJUSTES_DE_SESION_PG = {"lock_timeout": "5s", "statement_timeout": "30s"}

# ---------------------------------------------------------------------------
# Base de pruebas y migración
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def url_bd() -> str:
    return URL_PRUEBAS


@pytest.fixture(scope="session")
def esquema_migrado(url_bd: str) -> str:
    """Base de pruebas en `head`. Idempotente; si falla, termina la sesión de pruebas entera
    en lugar de repetir el mismo error en cada prueba que dependa de la base."""
    alembic("upgrade", "head", url=url_bd, fatal=True)
    return url_bd


@pytest.fixture(scope="session")
async def motor_pruebas(esquema_migrado: str) -> AsyncIterator[AsyncEngine]:
    """Motor de la sesión de pruebas. `NullPool`: cada prueba abre y cierra su conexión."""
    motor = create_async_engine(
        esquema_migrado,
        poolclass=NullPool,
        connect_args={"server_settings": AJUSTES_DE_SESION_PG},
    )
    try:
        yield motor
    finally:
        await motor.dispose()
        # El motor global de la aplicación (mismo bucle) se cierra con la sesión de pruebas.
        await close_db()


# ---------------------------------------------------------------------------
# Transacción por prueba
# ---------------------------------------------------------------------------


@pytest.fixture
async def conexion_pruebas(motor_pruebas: AsyncEngine) -> AsyncIterator[AsyncConnection]:
    """Conexión con una transacción exterior que siempre se revierte."""
    async with motor_pruebas.connect() as conexion:
        transaccion = await conexion.begin()
        try:
            yield conexion
        finally:
            await transaccion.rollback()


@pytest.fixture
def fabrica_sesion(conexion_pruebas: AsyncConnection) -> async_sessionmaker[AsyncSession]:
    """Sesiones sobre la transacción de la prueba; `commit()` y `rollback()` son *savepoints*."""
    return async_sessionmaker(
        bind=conexion_pruebas,
        expire_on_commit=False,
        join_transaction_mode="create_savepoint",
    )


@pytest.fixture
async def sesion(fabrica_sesion: async_sessionmaker[AsyncSession]) -> AsyncIterator[AsyncSession]:
    """La sesión de la prueba: para las fábricas y para mirar lo que hizo el código."""
    async with fabrica_sesion() as sesion:
        yield sesion


@pytest.fixture
async def cliente(
    fabrica_sesion: async_sessionmaker[AsyncSession], sesion: AsyncSession
) -> AsyncIterator[AsyncClient]:
    """Cliente httpx sobre la aplicación real. Cada petición recibe su propia sesión sobre la
    transacción de la prueba: una petición que falla en la base no contamina a la siguiente,
    y comparte con `sesion` todo lo que las fábricas crearon."""

    async def sesion_por_peticion() -> AsyncIterator[AsyncSession]:
        async with fabrica_sesion() as sesion_peticion:
            yield sesion_peticion

    app.dependency_overrides[get_db_session] = sesion_por_peticion
    # El token del operador lo verifica `VerificadorDePrueba` (`tests/auth_pruebas.py`):
    # `cabecera_operador` o `cabecera_de(uid)` dan la cabecera `Authorization`.
    app.dependency_overrides[obtener_verificador] = lambda: VERIFICADOR_DE_PRUEBA
    transporte = ASGITransport(app=app, raise_app_exceptions=False)
    try:
        async with AsyncClient(transport=transporte, base_url="http://pruebas") as c:
            yield c
    finally:
        app.dependency_overrides.pop(get_db_session, None)
        app.dependency_overrides.pop(obtener_verificador, None)


# ---------------------------------------------------------------------------
# Fábricas
# ---------------------------------------------------------------------------

Fabrica = Callable[..., Awaitable[Any]]


@pytest.fixture
def fabrica_restaurante(sesion: AsyncSession) -> Fabrica:
    async def _crear(**valores: Any) -> Restaurante:
        return await fabricas.crear_restaurante(sesion, **valores)

    return _crear


@pytest.fixture
def fabrica_operador(sesion: AsyncSession) -> Fabrica:
    async def _crear(restaurante: Restaurante, **valores: Any) -> OperadorRestaurante:
        return await fabricas.crear_operador(sesion, restaurante, **valores)

    return _crear


@pytest.fixture
def fabrica_mesa(sesion: AsyncSession) -> Fabrica:
    async def _crear(restaurante: Restaurante, **valores: Any) -> Mesa:
        return await fabricas.crear_mesa(sesion, restaurante, **valores)

    return _crear


@pytest.fixture
async def restaurante(fabrica_restaurante: Fabrica) -> Restaurante:
    restaurante: Restaurante = await fabrica_restaurante()
    return restaurante


@pytest.fixture
async def operador(fabrica_operador: Fabrica, restaurante: Restaurante) -> OperadorRestaurante:
    """Dueño (`propietario`) del `restaurante`, con su `usuario`."""
    operador: OperadorRestaurante = await fabrica_operador(restaurante)
    return operador


@pytest.fixture
async def cabecera_operador(sesion: AsyncSession, operador: OperadorRestaurante) -> dict[str, str]:
    """`Authorization` del dueño del `restaurante` (con el `cliente` de esta prueba)."""
    usuario = await sesion.get(Usuario, operador.usuario_id)
    assert usuario is not None
    return cabecera_de(usuario.firebase_uid)


@pytest.fixture
async def mesa(fabrica_mesa: Fabrica, restaurante: Restaurante) -> Mesa:
    mesa: Mesa = await fabrica_mesa(restaurante)
    return mesa
