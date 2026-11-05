"""Motor de base de datos y sesiones.

Provisional hasta T-0.2 (motor asíncrono con asyncpg, sin `create_all`).
La configuración vive en `app.core.config`.
"""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from app.core.config import settings

Base = declarative_base()

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


async def init_db() -> None:
    """Se elimina en T-0.2: el esquema se crea sólo con migraciones de Alembic (regla dura 3)."""


async def close_db() -> None:
    await engine.dispose()
