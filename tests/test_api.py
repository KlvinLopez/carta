"""Tests for API routes."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.main import create_app
from app.db import Base, get_db_session
from app.schemas import RestauranteCreate


# Create in-memory SQLite database for testing
@pytest.fixture
async def test_db():
    """Create test database."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    TestingSessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async def override_get_db():
        async with TestingSessionLocal() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db_session] = override_get_db

    yield app

    await engine.dispose()


@pytest.fixture
async def client(test_db):
    """Create async test client."""
    async with AsyncClient(app=test_db, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health_check(client):
    """Test health check endpoint."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_root_endpoint(client):
    """Test root endpoint."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Carta API"
    assert "version" in data


@pytest.mark.asyncio
async def test_create_restaurante(client):
    """Test creating a restaurant."""
    restaurante_data = {
        "nombre": "La Trattoria",
        "slug": "la-trattoria",
        "direccion": "Calle Principal 123",
        "telefono": "+34 900 123 456",
        "email": "info@latrattoria.es",
        "tema": "vino",
        "plan": "pro",
    }

    response = await client.post("/api/v1/restaurantes", json=restaurante_data)
    assert response.status_code == 201
    data = response.json()
    assert data["nombre"] == restaurante_data["nombre"]
    assert data["slug"] == restaurante_data["slug"]
    assert "id" in data
    assert data["activo"] is True


@pytest.mark.asyncio
async def test_list_restaurantes(client):
    """Test listing restaurants."""
    # Create a restaurant first
    restaurante_data = {
        "nombre": "La Trattoria",
        "slug": "la-trattoria",
        "tema": "vino",
    }
    await client.post("/api/v1/restaurantes", json=restaurante_data)

    # List restaurants
    response = await client.get("/api/v1/restaurantes")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0


@pytest.mark.asyncio
async def test_get_restaurante(client):
    """Test getting a specific restaurant."""
    # Create a restaurant
    restaurante_data = {
        "nombre": "La Trattoria",
        "slug": "la-trattoria",
        "tema": "vino",
    }
    create_response = await client.post("/api/v1/restaurantes", json=restaurante_data)
    restaurante_id = create_response.json()["id"]

    # Get the restaurant
    response = await client.get(f"/api/v1/restaurantes/{restaurante_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == restaurante_id
    assert data["nombre"] == restaurante_data["nombre"]


@pytest.mark.asyncio
async def test_get_nonexistent_restaurante(client):
    """Test getting a non-existent restaurant."""
    import uuid

    fake_id = str(uuid.uuid4())
    response = await client.get(f"/api/v1/restaurantes/{fake_id}")
    assert response.status_code == 404
