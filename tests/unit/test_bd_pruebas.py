"""T-0.4: la base de pruebas se elige con salvaguardas y la aplicación corre sobre ella.

`url_de_pruebas()` decide contra qué base se migra, se vacía y se escribe: tiene que negarse
ante cualquier base cuyo nombre no lleve el segmento `test`, fuera de desarrollo/pruebas, o
derivada de un servidor que no sea local.
"""

from __future__ import annotations

import pytest
from sqlalchemy.engine import make_url

from app.core.config import settings
from app.db.database import engine
from tests import conftest
from tests.bd_pruebas import url_de_pruebas

URL_DESARROLLO = "postgresql+asyncpg://carta:clave@localhost:5432/carta_db"
URL_PRUEBAS_ESPERADA = "postgresql+asyncpg://carta:clave@localhost:5432/carta_test"


@pytest.mark.parametrize(
    "url",
    [
        "postgresql://carta:clave@localhost:5432/carta_test",
        "postgres://carta:clave@localhost:5432/carta_test",
        "postgresql+psycopg://carta:clave@localhost:5432/carta_test",
        "postgresql+psycopg2://carta:clave@localhost:5432/carta_test",
        "postgresql+asyncpg://carta:clave@localhost:5432/carta_test",
    ],
)
def test_usa_test_database_url_y_normaliza_el_driver(
    monkeypatch: pytest.MonkeyPatch, url: str
) -> None:
    monkeypatch.setattr(settings, "TEST_DATABASE_URL", url)
    assert url_de_pruebas() == URL_PRUEBAS_ESPERADA


def test_test_database_url_es_un_campo_de_settings() -> None:
    """`.env.example` la documenta como línea de `.env`: `Settings` debe leerla, no ignorarla."""
    assert "TEST_DATABASE_URL" in type(settings).model_fields


@pytest.mark.parametrize("host", ["localhost", "127.0.0.1", "[::1]", "db", "postgres"])
def test_sin_test_database_url_deriva_carta_test_del_servidor_local(
    monkeypatch: pytest.MonkeyPatch, host: str
) -> None:
    """`uv run pytest` sin variables: la base de pruebas vive junto a la de desarrollo."""
    monkeypatch.setattr(settings, "TEST_DATABASE_URL", None)
    monkeypatch.setattr(settings, "DATABASE_URL", URL_DESARROLLO.replace("localhost", host))
    assert url_de_pruebas() == URL_PRUEBAS_ESPERADA.replace("localhost", host)


def test_sin_test_database_url_no_deriva_de_un_servidor_remoto(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Con la URL de staging en `.env` no se migra ni vacía `<remoto>/carta_test`."""
    monkeypatch.setattr(settings, "TEST_DATABASE_URL", None)
    monkeypatch.setattr(settings, "DATABASE_URL", URL_DESARROLLO.replace("localhost", "bd.staging"))
    with pytest.raises(pytest.exit.Exception, match="TEST_DATABASE_URL"):
        url_de_pruebas()


@pytest.mark.parametrize(
    "url",
    [
        "postgresql+asyncpg://carta:clave@localhost:5432/carta_db",
        "postgresql+asyncpg://carta:clave@localhost:5432/carta_produccion",
        "postgresql+asyncpg://carta:clave@localhost:5432/carta_latest",
        "postgresql+asyncpg://carta:clave@localhost:5432/contest_prod",
        "postgresql+asyncpg://carta:clave@localhost:5432/",
    ],
)
def test_se_niega_a_usar_una_base_sin_el_segmento_test(
    monkeypatch: pytest.MonkeyPatch, url: str
) -> None:
    monkeypatch.setattr(settings, "TEST_DATABASE_URL", url)
    with pytest.raises(pytest.exit.Exception, match="Me niego"):
        url_de_pruebas()


@pytest.mark.parametrize("entorno", ["staging", "produccion"])
def test_se_niega_fuera_de_desarrollo_y_pruebas(
    monkeypatch: pytest.MonkeyPatch, entorno: str
) -> None:
    monkeypatch.setattr(settings, "TEST_DATABASE_URL", URL_PRUEBAS_ESPERADA)
    monkeypatch.setattr(settings, "ENTORNO", entorno)
    with pytest.raises(pytest.exit.Exception, match=entorno):
        url_de_pruebas()


def test_la_aplicacion_corre_sobre_la_base_de_pruebas() -> None:
    """El motor global nació después de fijar `DATABASE_URL`: ninguna prueba toca `carta_db`."""
    base_de_pruebas = make_url(conftest.URL_PRUEBAS).database
    assert base_de_pruebas and "test" in base_de_pruebas
    assert engine.url.database == base_de_pruebas
    assert make_url(settings.DATABASE_URL).database == base_de_pruebas
