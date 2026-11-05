"""Base de datos de pruebas: qué URL se usa, cómo se migra y cómo se crea una desechable.

Funciones puras (sin fixtures) que `tests/conftest.py` convierte en fixtures y que algunas
pruebas usan directamente (p. ej. `tests/unit/test_modelos.py` baja y vuelve a subir el
esquema con la CLI de Alembic en una base propia). Viven aparte de `conftest.py` porque pytest
desaconseja importar `conftest` como módulo.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings

RAIZ = Path(__file__).resolve().parents[1]

# `test` como segmento del nombre: `carta_test`, `test_carta`, `carta_test_mig_42`; no `carta_latest`.
PATRON_NOMBRE_DE_PRUEBAS = re.compile(r"(^|_)test(_|$)")
# Sin `TEST_DATABASE_URL`, `carta_test` sólo se deriva de un servidor local: con la URL de
# staging en `.env` se migraría y vaciaría `<remoto>/carta_test` si existiera.
HOSTS_LOCALES = frozenset({"localhost", "127.0.0.1", "::1", "db", "postgres"})
DRIVERS_SINCRONOS = (
    "postgresql+psycopg2://",
    "postgresql+psycopg://",
    "postgresql://",
    "postgres://",
)


def _con_asyncpg(url: str) -> str:
    for prefijo in DRIVERS_SINCRONOS:
        if url.startswith(prefijo):
            return "postgresql+asyncpg://" + url[len(prefijo) :]
    return url


def url_de_pruebas() -> str:
    """`TEST_DATABASE_URL` (entorno o `.env`) si existe; si no, `carta_test` del servidor local.

    Salvaguardas: las pruebas migran, vacían y escriben en esta base, así que se niegan a
    correr contra una cuyo nombre no lleve el segmento `test`, fuera de desarrollo/pruebas, o
    derivada de un servidor que no sea local.
    """
    url = settings.TEST_DATABASE_URL
    if not url:
        base = make_url(settings.DATABASE_URL)
        if base.host not in HOSTS_LOCALES:
            pytest.exit(
                f"DATABASE_URL apunta a {base.host!r}, que no es local: define TEST_DATABASE_URL "
                "explícitamente para decir contra qué base corren las pruebas.",
                returncode=3,
            )
        url = base.set(database="carta_test").render_as_string(hide_password=False)
    url = _con_asyncpg(url)
    nombre_bd = make_url(url).database or ""
    if not PATRON_NOMBRE_DE_PRUEBAS.search(nombre_bd) or not settings.es_desarrollo:
        pytest.exit(
            f"Me niego a migrar y vaciar {nombre_bd!r} con ENTORNO={settings.ENTORNO}: "
            "la base de pruebas debe llevar `test` en el nombre (p. ej. carta_test) y el "
            "entorno ser desarrollo o pruebas.",
            returncode=3,
        )
    return url


def alembic(*argumentos: str, url: str, fatal: bool = False) -> subprocess.CompletedProcess[str]:
    """Corre la CLI de Alembic contra `url`, como lo hace el paso previo al despliegue.

    La URL viaja por el entorno (`DATABASE_URL`, que `migrations/env.py` lee), no por `argv`:
    así la contraseña no queda en `ps`, en `/proc/*/cmdline` ni en el informe de pytest.
    Con `fatal=True` un fallo termina la sesión de pruebas entera (`pytest.exit`): sirve para
    la migración inicial, donde cada prueba dependiente repetiría el mismo error.
    """
    entorno = {**os.environ, "DATABASE_URL": url}
    entorno.pop("TEST_DATABASE_URL", None)
    resultado = subprocess.run(
        [sys.executable, "-m", "alembic", *argumentos],
        cwd=RAIZ,
        env=entorno,
        capture_output=True,
        text=True,
    )
    if resultado.returncode != 0:
        # `make_url(...)` enmascara la contraseña.
        orden = f"alembic {' '.join(argumentos)} contra {make_url(url)}"
        if fatal:
            ultima = (resultado.stderr.strip().splitlines() or ["(sin salida)"])[-1]
            pytest.exit(f"{orden} falló: {ultima}", returncode=3)
        pytest.fail(f"{orden} falló:\n{resultado.stderr}", pytrace=False)
    return resultado


@asynccontextmanager
async def base_desechable(url_servidor: str, sufijo: str) -> AsyncIterator[str]:
    """Base vacía y propia del proceso (`carta_test_<sufijo>_<pid>`) en el servidor de pruebas.

    Para pruebas que destruyen el esquema (`downgrade base`): así nunca tocan la base
    compartida y varias corridas de pytest a la vez no se tumban entre sí. Se crea desde una
    conexión AUTOCOMMIT (`CREATE DATABASE` no admite transacción) y se borra al salir, pase lo
    que pase. `carta` es superusuario en la base local y en el servicio de CI.
    """
    servidor = make_url(url_servidor)
    nombre = f"carta_test_{sufijo}_{os.getpid()}"
    motor = create_async_engine(servidor, poolclass=NullPool, isolation_level="AUTOCOMMIT")
    try:
        async with motor.connect() as conexion:
            await conexion.execute(text(f'CREATE DATABASE "{nombre}" TEMPLATE template0'))
        try:
            yield servidor.set(database=nombre).render_as_string(hide_password=False)
        finally:
            async with motor.connect() as conexion:
                await conexion.execute(text(f'DROP DATABASE IF EXISTS "{nombre}" WITH (FORCE)'))
    finally:
        await motor.dispose()
