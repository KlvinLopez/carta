"""T-0.7 (revisión): `scripts/predespliegue.py`, el comando previo al despliegue.

`alembic upgrade head` a secas falla cuando la base tiene una revisión que el código no
conoce: es lo que pasa al volver por etiqueta a una versión anterior a una migración nueva
(rollback). Railway no despliega si el comando previo falla, así que el rollback quedaría
imposible. El script migra como siempre y, sólo en ese caso, avisa y sale con 0.

Cada prueba corre en su propia base desechable (`bd_pruebas.base_desechable`).
"""

from __future__ import annotations

import os
import subprocess
import sys

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from tests.bd_pruebas import RAIZ, alembic, base_desechable

SCRIPT = RAIZ / "scripts" / "predespliegue.py"
AVISO = "la base va por delante del código"


def _correr(*orden: str, url: str) -> subprocess.CompletedProcess[str]:
    entorno = {**os.environ, "DATABASE_URL": url}
    entorno.pop("TEST_DATABASE_URL", None)
    return subprocess.run(
        list(orden), cwd=RAIZ, env=entorno, capture_output=True, text=True, timeout=120
    )


def _predespliegue(url: str) -> subprocess.CompletedProcess[str]:
    return _correr(sys.executable, str(SCRIPT), url=url)


async def _consulta(url: str, sql: str) -> list[tuple[object, ...]]:
    motor = create_async_engine(url, poolclass=NullPool)
    try:
        async with motor.connect() as conexion:
            return [tuple(fila) for fila in await conexion.execute(text(sql))]
    finally:
        await motor.dispose()


async def _ejecutar(url: str, sql: str) -> None:
    motor = create_async_engine(url, poolclass=NullPool)
    try:
        async with motor.begin() as conexion:
            await conexion.execute(text(sql))
    finally:
        await motor.dispose()


def _head() -> str:
    salida = alembic("heads", url="postgresql+asyncpg://sin:uso@localhost/nada").stdout
    return salida.split()[0]


TABLAS = (
    "SELECT table_name FROM information_schema.tables "
    "WHERE table_schema = 'public' ORDER BY table_name"
)


async def test_base_vacia_queda_en_head(url_bd: str) -> None:
    async with base_desechable(url_bd, "pre_vacia") as url:
        resultado = _predespliegue(url)
        assert resultado.returncode == 0, resultado.stderr
        assert await _consulta(url, "SELECT version_num FROM alembic_version") == [(_head(),)]
        assert ("restaurante",) in await _consulta(url, TABLAS)


async def test_base_en_head_sale_0_sin_cambios(url_bd: str) -> None:
    async with base_desechable(url_bd, "pre_head") as url:
        alembic("upgrade", "head", url=url)
        antes = await _consulta(url, TABLAS)
        resultado = _predespliegue(url)
        assert resultado.returncode == 0, resultado.stderr
        assert await _consulta(url, TABLAS) == antes
        assert await _consulta(url, "SELECT version_num FROM alembic_version") == [(_head(),)]
        assert AVISO not in resultado.stdout + resultado.stderr


async def test_base_por_delante_del_codigo_avisa_y_no_migra(url_bd: str) -> None:
    async with base_desechable(url_bd, "pre_futura") as url:
        alembic("upgrade", "head", url=url)
        await _ejecutar(url, "UPDATE alembic_version SET version_num = '0002_futura'")
        antes = await _consulta(url, TABLAS)

        resultado = _predespliegue(url)

        assert resultado.returncode == 0, resultado.stderr
        assert await _consulta(url, "SELECT version_num FROM alembic_version") == [("0002_futura",)]
        assert await _consulta(url, TABLAS) == antes
        lineas = [linea for linea in resultado.stdout.splitlines() if AVISO in linea]
        assert lineas, resultado.stdout + resultado.stderr
        assert lineas[0].startswith('{"ts"'), "el aviso sale en JSON por línea"
        assert "0002_futura" in lineas[0]


async def test_alembic_a_secas_falla_con_la_base_por_delante(url_bd: str) -> None:
    """Por qué existe el script: sin él, el rollback por etiqueta muere en el comando previo."""
    async with base_desechable(url_bd, "pre_alembic") as url:
        alembic("upgrade", "head", url=url)
        await _ejecutar(url, "UPDATE alembic_version SET version_num = '0002_futura'")
        resultado = _correr(sys.executable, "-m", "alembic", "upgrade", "head", url=url)
        assert resultado.returncode != 0
        assert "0002_futura" in resultado.stdout + resultado.stderr


def test_base_inalcanzable_sale_con_error() -> None:
    resultado = _correr(
        sys.executable, str(SCRIPT), url="postgresql+asyncpg://carta:x@127.0.0.1:1/nada"
    )
    assert resultado.returncode != 0
