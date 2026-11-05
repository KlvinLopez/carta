"""Base de datos de pruebas: qué URL se usa y cómo se migra.

Funciones puras (sin fixtures) que `tests/conftest.py` convierte en fixtures y que algunas
pruebas usan directamente (p. ej. `tests/unit/test_modelos.py` baja y vuelve a subir el
esquema con la CLI de Alembic). Viven aparte de `conftest.py` porque pytest desaconseja
importar `conftest` como módulo.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import pytest
from sqlalchemy.engine import make_url

from app.core.config import settings

RAIZ = Path(__file__).resolve().parents[1]


def url_de_pruebas() -> str:
    """`TEST_DATABASE_URL` si existe; si no, la base `carta_test` del mismo servidor.

    Salvaguarda: las pruebas migran, vacían (`downgrade base`) y escriben en esta base, así
    que se niegan a correr contra una cuyo nombre no contenga `test` o fuera de
    desarrollo/pruebas.
    """
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        partes = urlsplit(settings.DATABASE_URL)
        url = urlunsplit(partes._replace(path="/carta_test"))
    for prefijo in ("postgresql://", "postgres://"):
        if url.startswith(prefijo):
            url = "postgresql+asyncpg://" + url[len(prefijo) :]
    nombre_bd = make_url(url).database or ""
    if "test" not in nombre_bd or not settings.es_desarrollo:
        pytest.exit(
            f"Me niego a migrar y vaciar {nombre_bd!r} con ENTORNO={settings.ENTORNO}: "
            "la base de pruebas debe llamarse *test* y el entorno ser desarrollo o pruebas."
        )
    return url


def alembic(*argumentos: str, url: str) -> subprocess.CompletedProcess[str]:
    """Corre la CLI de Alembic contra `url`, como lo hace el paso previo al despliegue."""
    try:
        return subprocess.run(
            [sys.executable, "-m", "alembic", "-x", f"url={url}", *argumentos],
            cwd=RAIZ,
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as error:
        # `make_url` enmascara la contraseña en el mensaje.
        pytest.fail(f"alembic {' '.join(argumentos)} contra {make_url(url)} falló:\n{error.stderr}")
