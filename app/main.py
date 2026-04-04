"""Main FastAPI application for Carta."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db, close_db
from app.api import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    await init_db()
    print("✓ Database initialized")
    yield
    # Shutdown
    await close_db()
    print("✓ Database connections closed")


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    app = FastAPI(
        title="Carta API",
        description="Intelligent Restaurant Menu Platform",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure properly in production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API routes
    app.include_router(router, prefix="/api/v1")

    # Root endpoint
    @app.get("/")
    async def root():
        return {
            "name": "Carta API",
            "version": "0.1.0",
            "docs": "/docs",
            "status": "running",
        }

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
