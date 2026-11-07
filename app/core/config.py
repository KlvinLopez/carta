"""Configuración de la aplicación, leída de variables de entorno.

Única fuente de verdad de la configuración. Nadie más define `Settings`.
"""

from __future__ import annotations

import logging
from typing import Literal

from pydantic import Field, SecretStr, field_validator, model_validator
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

# Las seis variables de R2: todas o ninguna (T-1.4).
VARIABLES_R2 = (
    "R2_ENDPOINT",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_PUBLICO",
    "R2_BUCKET_PRIVADO",
    "R2_URL_PUBLICA",
)


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

    # Almacenamiento de archivos (S3 compatible: Cloudflare R2, ADR-012; T-1.4). Sin endpoint
    # = carpeta local (`ALMACEN_LOCAL_RUTA`), sólo en desarrollo y pruebas: dentro de la imagen
    # `/app` es de root y de sólo lectura, así que en staging y producción las seis `R2_*`
    # son obligatorias y el arranque falla sin ellas. Vacías (como en `.env.example`) = sin R2.
    # `R2_URL_PUBLICA` es el origen del bucket público (`https://img.<dominio>`, 02 §4).
    R2_ENDPOINT: str | None = None
    R2_ACCESS_KEY_ID: str | None = None
    R2_SECRET_ACCESS_KEY: SecretStr | None = None  # ni `repr(settings)` ni Sentry la muestran
    R2_BUCKET_PUBLICO: str | None = None
    R2_BUCKET_PRIVADO: str | None = None
    R2_URL_PUBLICA: str | None = None
    ALMACEN_LOCAL_RUTA: str = "./datos"

    # Importación de menús (API de Claude)
    # `SecretStr`: ni `repr(settings)` ni Sentry la muestran; vacía = importación apagada.
    ANTHROPIC_API_KEY: SecretStr | None = None
    IMPORTACION_MODELO: str = "claude-opus-5-5"

    # Operadores (Firebase Auth). Sin proyecto, ningún token de operador es válido.
    FIREBASE_PROJECT_ID: str | None = None
    # Orígenes que el SDK web de Firebase Auth necesita en la CSP (02 §12), separados por
    # espacios o comas; sólo `https://host[:puerto]`. Vacíos = la política de 02 §12 tal cual.
    # Valores de staging en 04 §11 (fila T-1.2).
    FIREBASE_CSP_CONNECT_SRC: str = ""
    FIREBASE_CSP_SCRIPT_SRC: str = ""
    FIREBASE_CSP_FRAME_SRC: str = ""

    # Purga del menú público en Cloudflare al editarlo (T-1.3, 02 §4). Sin las dos, sólo se
    # invalida la caché en proceso y el borde sirve lo viejo hasta su `s-maxage` (60 s).
    # El token sólo necesita el permiso «Zone · Cache Purge» de esa zona.
    # El id de zona va dentro de la URL de la API: 32 hex, nada más (revisión de T-1.3, B2).
    CLOUDFLARE_ZONE_ID: str | None = Field(None, pattern=r"^[0-9a-f]{32}$")
    CLOUDFLARE_API_TOKEN: SecretStr | None = None

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

    @field_validator("CLOUDFLARE_ZONE_ID", "CLOUDFLARE_API_TOKEN", *VARIABLES_R2, mode="before")
    @classmethod
    def _vacio_es_ninguno(cls, valor: object) -> object:
        """`CLOUDFLARE_ZONE_ID=` o `R2_ENDPOINT=` vacíos (como en `.env.example`) son «sin
        purga» y «sin R2», no un error."""
        if isinstance(valor, str):
            valor = valor.strip()
            return valor or None
        return valor

    @field_validator("R2_URL_PUBLICA")
    @classmethod
    def _sin_barra_final(cls, valor: str | None) -> str | None:
        """Las URL de las fotos se arman como `R2_URL_PUBLICA + "/" + clave`."""
        return valor.rstrip("/") if valor else valor

    @model_validator(mode="after")
    def _almacen_completo(self) -> Settings:
        """Fuera de desarrollo/pruebas, R2 entero; en cualquier entorno, R2 entero o nada.

        Sin esto la API arrancaría en staging con el almacén local en `/app/datos` (sólo
        lectura) y cada foto daría 500; o con medio R2 y fallaría en la primera subida. En
        desarrollo `R2_URL_PUBLICA` sola vale: es la base de las URL del almacén local."""
        presentes = [n for n in VARIABLES_R2 if getattr(self, n) and n != "R2_URL_PUBLICA"]
        faltan = [nombre for nombre in VARIABLES_R2 if not getattr(self, nombre)]
        if faltan and (presentes or self.ENTORNO in ("staging", "produccion")):
            raise ValueError(
                f"Faltan {', '.join(faltan)} para ENTORNO={self.ENTORNO}: fuera de desarrollo "
                "las fotos van a R2 (la imagen no puede escribir en ALMACEN_LOCAL_RUTA) y R2 "
                "necesita las seis variables R2_* (ver .env.example)."
            )
        if (
            self.R2_URL_PUBLICA
            and self.ENTORNO in ("staging", "produccion")
            and not self.R2_URL_PUBLICA.startswith("https://")
        ):
            raise ValueError("R2_URL_PUBLICA debe empezar con https:// fuera de desarrollo.")
        return self

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
    def purga_cloudflare(self) -> bool:
        return bool(self.CLOUDFLARE_ZONE_ID and self.CLOUDFLARE_API_TOKEN)

    @property
    def almacen_en_nube(self) -> bool:
        """R2 configurado (el validador garantiza que entonces están las seis variables)."""
        return all(getattr(self, nombre) for nombre in VARIABLES_R2)


settings = Settings()
