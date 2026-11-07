"""T-0.1: la configuración normaliza el driver y rechaza secretos débiles fuera de desarrollo."""

import pytest
from pydantic import ValidationError

from app.core.config import SECRET_KEY_LONGITUD_MINIMA, Settings

SECRETO_FUERTE = "x" * SECRET_KEY_LONGITUD_MINIMA
R2_COMPLETO = {
    "R2_ENDPOINT": "https://cuenta.r2.cloudflarestorage.com",
    "R2_ACCESS_KEY_ID": "id",
    "R2_SECRET_ACCESS_KEY": "secreta",
    "R2_BUCKET_PUBLICO": "carta-publico",
    "R2_BUCKET_PRIVADO": "carta-privado",
    "R2_URL_PUBLICA": "https://img.carta.cooking",
}


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
        crear(ENTORNO=entorno, SECRET_KEY=secreto, **R2_COMPLETO)


def test_secreto_fuerte_arranca_en_produccion() -> None:
    s = crear(ENTORNO="produccion", SECRET_KEY=SECRETO_FUERTE, **R2_COMPLETO)
    assert not s.es_desarrollo


def test_variables_desconocidas_se_ignoran() -> None:
    # `ENTORNO` explícito: en CI el entorno trae `ENTORNO=pruebas` y `crear` sólo ignora `.env`.
    s = crear(ENTORNO="desarrollo", REDIS_URL="redis://no-existe", GEMMA_MODEL_PATH="/x")
    assert s.ENTORNO == "desarrollo"
    assert not hasattr(s, "REDIS_URL") and not hasattr(s, "GEMMA_MODEL_PATH")


def test_almacen_en_nube_solo_con_las_seis_variables() -> None:
    assert not crear().almacen_en_nube
    assert crear(**R2_COMPLETO).almacen_en_nube
    # Sólo el origen público: el almacén local arma sus URL con él (desarrollo).
    assert not crear(R2_URL_PUBLICA="http://localhost:9000/fotos").almacen_en_nube


# ---------------------------------------------------------------------------
# T-1.4 · fuera de desarrollo, R2 completo (la imagen no puede escribir en /app)
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-17.2")
@pytest.mark.parametrize("entorno", ["staging", "produccion"])
@pytest.mark.parametrize("falta", [None, *R2_COMPLETO])
def test_staging_y_produccion_no_arrancan_sin_r2(entorno: str, falta: str | None) -> None:
    valores = {k: v for k, v in R2_COMPLETO.items() if k != falta} if falta else {}
    with pytest.raises(ValidationError, match="R2_") as error:
        crear(ENTORNO=entorno, SECRET_KEY=SECRETO_FUERTE, **valores)
    mensaje = str(error.value)
    assert "ALMACEN_LOCAL_RUTA" in mensaje
    if falta:
        assert falta in mensaje.split("Faltan ")[1].split(" para")[0]


@pytest.mark.parametrize("entorno", ["staging", "produccion"])
def test_las_r2_vacias_cuentan_como_ausentes(entorno: str) -> None:
    """`.env.example` las trae vacías: en staging eso es «falta», no un R2 con texto vacío."""
    with pytest.raises(ValidationError, match="R2_ENDPOINT"):
        crear(ENTORNO=entorno, SECRET_KEY=SECRETO_FUERTE, **{**R2_COMPLETO, "R2_ENDPOINT": "  "})


@pytest.mark.parametrize("falta", [k for k in R2_COMPLETO if k != "R2_URL_PUBLICA"])
def test_medio_r2_falla_tambien_en_desarrollo(falta: str) -> None:
    valores = {k: v for k, v in R2_COMPLETO.items() if k != falta}
    with pytest.raises(ValidationError, match=falta):
        crear(ENTORNO="desarrollo", **valores)


def test_desarrollo_sin_r2_usa_el_almacen_local() -> None:
    s = crear(ENTORNO="desarrollo", **{k: "" for k in R2_COMPLETO})
    assert not s.almacen_en_nube
    assert s.R2_ENDPOINT is None and s.R2_URL_PUBLICA is None


def test_r2_url_publica_por_https_fuera_de_desarrollo_y_sin_barra_final() -> None:
    with pytest.raises(ValidationError, match="https"):
        crear(
            ENTORNO="staging",
            SECRET_KEY=SECRETO_FUERTE,
            **{**R2_COMPLETO, "R2_URL_PUBLICA": "http://img.carta.cooking"},
        )
    s = crear(**{**R2_COMPLETO, "R2_URL_PUBLICA": "https://img.carta.cooking/"})
    assert s.R2_URL_PUBLICA == "https://img.carta.cooking"


def test_la_llave_secreta_de_r2_no_sale_en_repr() -> None:
    s = crear(**R2_COMPLETO)
    assert "secreta" not in repr(s)
    assert s.R2_SECRET_ACCESS_KEY is not None
    assert s.R2_SECRET_ACCESS_KEY.get_secret_value() == "secreta"


def test_un_error_de_arranque_no_vuelca_secretos() -> None:
    """Revisión A4: el `ValidationError` imprimía `input_value={…}` con la cola de los
    secretos en el log del despliegue."""
    centinelas = {
        "R2_SECRET_ACCESS_KEY": "CENTINELA-R2-SECRETO",
        "ANTHROPIC_API_KEY": "sk-ant-CENTINELA-ANTHROPIC",
        "CLOUDFLARE_API_TOKEN": "CENTINELA-CLOUDFLARE",
    }
    casos = [
        {"ENTORNO": "staging", "SECRET_KEY": SECRETO_FUERTE, "R2_ENDPOINT": "https://x"},
        {
            "ENTORNO": "produccion",
            "SECRET_KEY": SECRETO_FUERTE,
            **R2_COMPLETO,
            "R2_URL_PUBLICA": "http://img.carta.cooking",
        },
        {"ENTORNO": "staging", "SECRET_KEY": "corto", **R2_COMPLETO},
    ]
    for caso in casos:
        with pytest.raises(ValidationError) as error:
            crear(**{**caso, **centinelas})
        texto = str(error.value) + repr(error.value)
        for valor in centinelas.values():
            assert valor not in texto
            assert valor[-8:] not in texto
