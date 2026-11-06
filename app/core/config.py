"""Configuración de la aplicación, leída de variables de entorno.

Única fuente de verdad de la configuración. Nadie más define `Settings`.
"""

from __future__ import annotations

import logging
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

log = logging.getLogger(__name__)

Entorno = Literal["desarrollo", "pruebas", "staging", "produccion"]

# Valores que aparecen en ejemplos y plantillas; jamás válidos fuera de desarrollo.
SECRETOS_DE_EJEMPLO = frozenset(
    {
        "dev-secret-key",
        "cambia-este-secreto-en-produccion",
        "your-super-secret-key-change-in-production",
        "solo-para-desarrollo-local-no-usar-en-produccion-0123456789",
        # La de .github/workflows/ci.yml: es pública, así que no sirve fuera de pruebas.
        "clave-solo-para-ci-de-github-actions-sin-valor-real-0123456789",
    }
)
SECRET_KEY_LONGITUD_MINIMA = 32


class Settings(BaseSettings):
    """Variables de entorno de Carta. Ver `.env.example` para la lista comentada."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    ENTORNO: Entorno = "desarrollo"
    DOMINIO: str = "localhost"

    # Base de datos
    DATABASE_URL: str = "postgresql+asyncpg://carta:carta_dev_password@localhost:5432/carta_db"
    # Base que migran y vacían las pruebas (`tests/bd_pruebas.py`); la aplicación no la usa.
    TEST_DATABASE_URL: str | None = None
    DATABASE_ECHO: bool = False
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 10

    # Firma de cookies y tokens
    SECRET_KEY: str = "dev-secret-key"
    JWT_ALGORITMO: str = "HS256"
    INVITADO_VIGENCIA_HORAS: int = 6
    PERSONAL_VIGENCIA_HORAS: int = 12

    # Almacenamiento de archivos (S3 compatible: Cloudflare R2). Sin endpoint = carpeta local.
    R2_ENDPOINT: str | None = None
    R2_ACCESS_KEY_ID: str | None = None
    R2_SECRET_ACCESS_KEY: str | None = None
    R2_BUCKET_PUBLICO: str | None = None
    R2_BUCKET_PRIVADO: str | None = None
    R2_URL_PUBLICA: str | None = None
    ALMACEN_LOCAL_RUTA: str = "./datos"

    # Importación de menús (API de Claude)
    ANTHROPIC_API_KEY: str | None = None
    IMPORTACION_MODELO: str = "claude-opus-5-5"

    # Operadores (Firebase Auth). Sin proyecto, ningún token de operador es válido.
    FIREBASE_PROJECT_ID: str | None = None
    # Orígenes que el SDK web de Firebase Auth necesita en la CSP (02 §12), separados por
    # espacios o comas; sólo `https://host[:puerto]`. Vacíos = la política de 02 §12 tal cual.
    # Valores de staging en 04 §11 (fila T-1.2).
    FIREBASE_CSP_CONNECT_SRC: str = ""
    FIREBASE_CSP_SCRIPT_SRC: str = ""
    FIREBASE_CSP_FRAME_SRC: str = ""

    # Observabilidad
    SENTRY_DSN: str | None = None

    # PWA construida que sirve la propia API (T-0.6). Relativa al directorio de trabajo:
    # `frontend/dist` en el repositorio y en la imagen (`WORKDIR /app`).
    FRONTEND_DIST: str = "frontend/dist"

    @field_validator("DATABASE_URL")
    @classmethod
    def _normalizar_driver(cls, url: str) -> str:
        """Garantiza el driver asíncrono (ADR-009). Acepta `postgresql://` y `postgres://`."""
        for prefijo in ("postgresql://", "postgres://"):
            if url.startswith(prefijo):
                log.warning("DATABASE_URL sin driver asíncrono; se usa postgresql+asyncpg://")
                return "postgresql+asyncpg://" + url[len(prefijo) :]
        return url

    @model_validator(mode="after")
    def _secreto_seguro_fuera_de_desarrollo(self) -> Settings:
        if self.ENTORNO in ("staging", "produccion") and (
            self.SECRET_KEY in SECRETOS_DE_EJEMPLO
            or len(self.SECRET_KEY) < SECRET_KEY_LONGITUD_MINIMA
        ):
            raise ValueError(
                "SECRET_KEY de ejemplo o demasiado corto para "
                f"ENTORNO={self.ENTORNO}: genera uno con `openssl rand -base64 32`."
            )
        return self

    @property
    def es_desarrollo(self) -> bool:
        return self.ENTORNO in ("desarrollo", "pruebas")

    @property
    def database_url_sync(self) -> str:
        """URL sin driver asíncrono, para `psql` y herramientas síncronas."""
        return self.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1)

    @property
    def almacen_en_nube(self) -> bool:
        return bool(self.R2_ENDPOINT and self.R2_ACCESS_KEY_ID and self.R2_SECRET_ACCESS_KEY)


settings = Settings()
