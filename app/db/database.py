"""Database configuration and session management."""

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings from environment variables."""

    DATABASE_URL: str = "postgresql://user:password@localhost:5432/carta_db"
    DATABASE_ECHO: bool = False
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "dev-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# Create declarative base for models
Base = declarative_base()

# Database engine - using async PostgreSQL driver
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    future=True,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=0,
)

# Session factory
async_session = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db_session() -> AsyncSession:
    """Dependency for FastAPI to get database session."""
    async with async_session() as session:
        yield session


async def init_db():
    """Initialize database - create all tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Close database connections."""
    await engine.dispose()
