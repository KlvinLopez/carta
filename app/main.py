"""Aplicación FastAPI de Carta.

Sin middleware de CORS: la PWA se sirve desde el mismo dominio que la API (ADR-010, ADR-015).
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import __version__
from app.api import router as router_api_v1
from app.api.salud import router as router_salud
from app.core.errores import registrar_manejadores
from app.core.peticion import MiddlewareRequestId
from app.core.registro import configurar_registro
from app.db import close_db


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Arranque y apagado. El esquema lo crean las migraciones, no la aplicación."""
    yield
    await close_db()


def create_app() -> FastAPI:
    configurar_registro()

    app = FastAPI(
        title="Carta API",
        description="Menú visual por QR, orden compartida en la mesa y comanda directa al personal.",
        version=__version__,
        lifespan=lifespan,
    )

    app.add_middleware(MiddlewareRequestId)
    registrar_manejadores(app)

    app.include_router(router_salud)
    app.include_router(router_api_v1, prefix="/api/v1")

    @app.get("/", include_in_schema=False)
    async def raiz() -> dict[str, str]:
        # T-0.6 sirve aquí la PWA (`frontend/dist`).
        return {"name": "Carta API", "version": __version__, "docs": "/docs"}

    return app


app = create_app()
