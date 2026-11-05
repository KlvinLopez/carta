"""T-0.1: la configuración normaliza el driver y rechaza secretos débiles fuera de desarrollo."""

import pytest
from pydantic import ValidationError

from app.core.config import SECRET_KEY_LONGITUD_MINIMA, Settings

SECRETO_FUERTE = "x" * SECRET_KEY_LONGITUD_MINIMA


def crear(**valores: object) -> Settings:
    """Settings sin leer `.env`, para que las pruebas no dependan de la máquina."""
    return Settings(_env_file=None, **valores)  # type: ignore[call-arg]


@pytest.mark.parametrize(
    "url",
    [
        "postgresql://u:p@h:5432/db",
        "postgres://u:p@h:5432/db",
        "postgresql+asyncpg://u:p@h:5432/db",
    ],
)
def test_database_url_siempre_usa_asyncpg(url: str) -> None:
    s = crear(DATABASE_URL=url)
    assert s.DATABASE_URL == "postgresql+asyncpg://u:p@h:5432/db"
    assert s.database_url_sync == "postgresql://u:p@h:5432/db"


def test_secreto_de_ejemplo_se_acepta_en_desarrollo() -> None:
    s = crear(ENTORNO="desarrollo", SECRET_KEY="dev-secret-key")
    assert s.es_desarrollo


@pytest.mark.parametrize("entorno", ["staging", "produccion"])
@pytest.mark.parametrize(
    "secreto",
    [
        "dev-secret-key",
        "corto",
        "y" * (SECRET_KEY_LONGITUD_MINIMA - 1),
        # La de .github/workflows/ci.yml es pública aunque mida más de 32.
        "clave-solo-para-ci-de-github-actions-sin-valor-real-0123456789",
    ],
)
def test_secreto_debil_falla_fuera_de_desarrollo(entorno: str, secreto: str) -> None:
    with pytest.raises(ValidationError, match="SECRET_KEY"):
        crear(ENTORNO=entorno, SECRET_KEY=secreto)


def test_secreto_fuerte_arranca_en_produccion() -> None:
    s = crear(ENTORNO="produccion", SECRET_KEY=SECRETO_FUERTE)
    assert not s.es_desarrollo


def test_variables_desconocidas_se_ignoran() -> None:
    # `ENTORNO` explícito: en CI el entorno trae `ENTORNO=pruebas` y `crear` sólo ignora `.env`.
    s = crear(ENTORNO="desarrollo", REDIS_URL="redis://no-existe", GEMMA_MODEL_PATH="/x")
    assert s.ENTORNO == "desarrollo"
    assert not hasattr(s, "REDIS_URL") and not hasattr(s, "GEMMA_MODEL_PATH")


def test_almacen_en_nube_solo_con_credenciales_completas() -> None:
    assert not crear().almacen_en_nube
    assert not crear(R2_ENDPOINT="https://r2").almacen_en_nube
    assert crear(
        R2_ENDPOINT="https://r2", R2_ACCESS_KEY_ID="id", R2_SECRET_ACCESS_KEY="s"
    ).almacen_en_nube
