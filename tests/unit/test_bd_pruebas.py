"""T-0.4: la base de pruebas se elige con salvaguardas y la aplicación corre sobre ella.

`url_de_pruebas()` decide contra qué base se migra, se vacía y se escribe: tiene que negarse
ante cualquier base que no se llame *test* o fuera de desarrollo/pruebas, porque las pruebas
bajan el esquema completo (`downgrade base`).
"""

from __future__ import annotations

import pytest
from sqlalchemy.engine import make_url

from app.core.config import settings
from app.db.database import engine
from tests import conftest
from tests.bd_pruebas import url_de_pruebas

URL_DESARROLLO = "postgresql+asyncpg://carta:clave@servidor:5432/carta_db"


def test_usa_test_database_url_y_normaliza_el_driver(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TEST_DATABASE_URL", "postgresql://carta:clave@servidor:5432/carta_test")
    assert url_de_pruebas() == "postgresql+asyncpg://carta:clave@servidor:5432/carta_test"


def test_sin_test_database_url_deriva_carta_test_del_mismo_servidor(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """`uv run pytest` sin variables: la base de pruebas vive junto a la de desarrollo."""
    monkeypatch.delenv("TEST_DATABASE_URL", raising=False)
    monkeypatch.setattr(settings, "DATABASE_URL", URL_DESARROLLO)
    assert url_de_pruebas() == "postgresql+asyncpg://carta:clave@servidor:5432/carta_test"


@pytest.mark.parametrize(
    "url",
    [
        "postgresql+asyncpg://carta:clave@servidor:5432/carta_db",
        "postgresql+asyncpg://carta:clave@servidor:5432/carta_produccion",
        "postgresql+asyncpg://carta:clave@servidor:5432/",
    ],
)
def test_se_niega_a_usar_una_base_que_no_se_llame_test(
    monkeypatch: pytest.MonkeyPatch, url: str
) -> None:
    monkeypatch.setenv("TEST_DATABASE_URL", url)
    with pytest.raises(pytest.exit.Exception, match="Me niego"):
        url_de_pruebas()


@pytest.mark.parametrize("entorno", ["staging", "produccion"])
def test_se_niega_fuera_de_desarrollo_y_pruebas(
    monkeypatch: pytest.MonkeyPatch, entorno: str
) -> None:
    monkeypatch.setenv("TEST_DATABASE_URL", "postgresql+asyncpg://c:c@servidor:5432/carta_test")
    monkeypatch.setattr(settings, "ENTORNO", entorno)
    with pytest.raises(pytest.exit.Exception, match=entorno):
        url_de_pruebas()


def test_la_aplicacion_corre_sobre_la_base_de_pruebas() -> None:
    """El motor global nació después de fijar `DATABASE_URL`: ninguna prueba toca `carta_db`."""
    base_de_pruebas = make_url(conftest.URL_PRUEBAS).database
    assert base_de_pruebas and "test" in base_de_pruebas
    assert engine.url.database == base_de_pruebas
    assert make_url(settings.DATABASE_URL).database == base_de_pruebas
