"""Motor asíncrono de base de datos y sesiones.

El esquema se crea y cambia sólo con migraciones de Alembic (regla dura 3):
aquí no hay `create_all` ni ninguna inicialización del esquema.
La configuración vive en `app.core.config`.
"""

from collections.abc import AsyncIterator

from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# Nombres deterministas para las restricciones que el DDL del plan deja sin nombre.
# Los índices y los CHECK llevan siempre nombre explícito (los de docs/plan/03_Datos_v1.md).
CONVENCION_DE_NOMBRES = {
    "pk": "pk_%(table_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
}


class Base(DeclarativeBase):
    """Base declarativa de todos los modelos de Carta."""

    metadata = MetaData(naming_convention=CONVENCION_DE_NOMBRES)


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    pool_pre_ping=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
)

async_session = async_sessionmaker(engine, expire_on_commit=False)


async def get_db_session() -> AsyncIterator[AsyncSession]:
    """Dependencia de FastAPI: una sesión por petición."""
    async with async_session() as session:
        yield session


async def close_db() -> None:
    """Cierra el pool de conexiones al apagar la aplicación."""
    await engine.dispose()
