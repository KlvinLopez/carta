"""Entorno de Alembic en modo asíncrono (asyncpg).

La URL sale de `app.core.config.settings` (variable `DATABASE_URL`; las pruebas la fijan en el
entorno del subproceso para no dejar la contraseña en `argv`), salvo que se pase `-x url=...`
por línea de comandos.
La URL **no** pasa por `alembic.ini`: ConfigParser interpreta `%` y una contraseña con
`%40` rompería `upgrade head` antes de conectar.
"""

import asyncio
import os
import re
from logging.config import fileConfig

from alembic import context
from sqlalchemy import Connection, text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.db import models  # noqa: F401  (registra los modelos en Base.metadata)
from app.db.database import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

URL = context.get_x_argument(as_dictionary=True).get("url") or settings.DATABASE_URL

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Modo sin conexión: emite el SQL en lugar de ejecutarlo."""
    context.configure(
        url=URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# Dos `upgrade head` a la vez sobre la misma base (varias corridas de pruebas, dos réplicas
# arrancando) chocan en `CREATE TYPE`: el candado de la transacción serializa a quien migre.
CANDADO_MIGRACION = 7_245_001

# Un host inalcanzable no debe retener 60 s (timeout por defecto de asyncpg) al paso previo
# al despliegue ni a las pruebas.
CONEXION_TIMEOUT_SEGUNDOS = 10

# Un `ALTER TABLE` espera un candado fuerte; con tráfico, una consulta larga lo encola y detrás
# se encola todo lo demás. Mejor que la migración falle pronto y `predespliegue.py` salga ≠ 0
# (el despliegue se detiene y producción sigue sirviendo). Se fijan tras tomar el candado de
# migración, que sí puede esperar a otra migración. `MIGRACION_LOCK_TIMEOUT` sólo para pruebas.
LOCK_TIMEOUT = os.environ.get("MIGRACION_LOCK_TIMEOUT", "10s")
STATEMENT_TIMEOUT = "5min"
if not re.fullmatch(r"[0-9]{1,6}(ms|s|min)", LOCK_TIMEOUT):
    raise SystemExit(f"MIGRACION_LOCK_TIMEOUT inválido: {LOCK_TIMEOUT!r}")


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        connection.execute(
            text("SELECT pg_advisory_xact_lock(:candado)"), {"candado": CANDADO_MIGRACION}
        )
        connection.execute(text(f"SET LOCAL lock_timeout = '{LOCK_TIMEOUT}'"))
        connection.execute(text(f"SET LOCAL statement_timeout = '{STATEMENT_TIMEOUT}'"))
        context.run_migrations()


async def run_async_migrations() -> None:
    motor = create_async_engine(
        URL, poolclass=NullPool, connect_args={"timeout": CONEXION_TIMEOUT_SEGUNDOS}
    )
    async with motor.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await motor.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
