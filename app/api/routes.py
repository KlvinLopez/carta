"""API routes for Carta."""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import (
    get_db_session,
    Restaurante,
    Platillo,
    CategoriaMenu,
)
from app.schemas import (
    RestauranteCreate,
    RestauranteResponse,
    RestauranteUpdate,
    PlatilloCreate,
    PlatilloResponse,
    PlatilloUpdate,
)

router = APIRouter()


# ============================================================================
# RESTAURANTE ROUTES
# ============================================================================


@router.get("/restaurantes", response_model=List[RestauranteResponse])
async def list_restaurantes(
    skip: int = 0,
    limit: int = 100,
    activo: bool = True,
    session: AsyncSession = Depends(get_db_session),
):
    """List all restaurants."""
    query = select(Restaurante).where(Restaurante.activo == activo)
    result = await session.execute(query.offset(skip).limit(limit))
    restaurantes = result.scalars().all()
    return restaurantes


@router.post("/restaurantes", response_model=RestauranteResponse, status_code=status.HTTP_201_CREATED)
async def create_restaurante(
    restaurante: RestauranteCreate,
    session: AsyncSession = Depends(get_db_session),
):
    """Create a new restaurant."""
    db_restaurante = Restaurante(**restaurante.model_dump())
    session.add(db_restaurante)
    await session.commit()
    await session.refresh(db_restaurante)
    return db_restaurante


@router.get("/restaurantes/{restaurante_id}", response_model=RestauranteResponse)
async def get_restaurante(
    restaurante_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    """Get a specific restaurant."""
    result = await session.execute(
        select(Restaurante).where(Restaurante.id == restaurante_id)
    )
    restaurante = result.scalar_one_or_none()
    if not restaurante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurante no encontrado",
        )
    return restaurante


@router.put("/restaurantes/{restaurante_id}", response_model=RestauranteResponse)
async def update_restaurante(
    restaurante_id: UUID,
    restaurante_update: RestauranteUpdate,
    session: AsyncSession = Depends(get_db_session),
):
    """Update a restaurant."""
    result = await session.execute(
        select(Restaurante).where(Restaurante.id == restaurante_id)
    )
    db_restaurante = result.scalar_one_or_none()
    if not db_restaurante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurante no encontrado",
        )

    update_data = restaurante_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_restaurante, field, value)

    await session.commit()
    await session.refresh(db_restaurante)
    return db_restaurante


@router.delete("/restaurantes/{restaurante_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_restaurante(
    restaurante_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    """Soft delete a restaurant."""
    result = await session.execute(
        select(Restaurante).where(Restaurante.id == restaurante_id)
    )
    db_restaurante = result.scalar_one_or_none()
    if not db_restaurante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurante no encontrado",
        )

    db_restaurante.activo = False
    await session.commit()


# ============================================================================
# PLATILLO ROUTES
# ============================================================================


@router.get(
    "/restaurantes/{restaurante_id}/platillos",
    response_model=List[PlatilloResponse],
)
async def list_platillos(
    restaurante_id: UUID,
    skip: int = 0,
    limit: int = 100,
    activo: bool = True,
    session: AsyncSession = Depends(get_db_session),
):
    """List all dishes for a restaurant."""
    # Verify restaurant exists
    result = await session.execute(
        select(Restaurante).where(Restaurante.id == restaurante_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurante no encontrado",
        )

    query = select(Platillo).where(
        (Platillo.restaurante_id == restaurante_id) &
        (Platillo.activo == activo)
    )
    result = await session.execute(query.offset(skip).limit(limit))
    platillos = result.scalars().all()
    return platillos


@router.post(
    "/restaurantes/{restaurante_id}/platillos",
    response_model=PlatilloResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_platillo(
    restaurante_id: UUID,
    platillo: PlatilloCreate,
    session: AsyncSession = Depends(get_db_session),
):
    """Create a new dish for a restaurant."""
    # Verify restaurant exists
    result = await session.execute(
        select(Restaurante).where(Restaurante.id == restaurante_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurante no encontrado",
        )

    db_platillo = Platillo(**platillo.model_dump())
    session.add(db_platillo)
    await session.commit()
    await session.refresh(db_platillo)
    return db_platillo


@router.get("/platillos/{platillo_id}", response_model=PlatilloResponse)
async def get_platillo(
    platillo_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    """Get a specific dish."""
    result = await session.execute(
        select(Platillo).where(Platillo.id == platillo_id)
    )
    platillo = result.scalar_one_or_none()
    if not platillo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Platillo no encontrado",
        )
    return platillo


@router.put("/platillos/{platillo_id}", response_model=PlatilloResponse)
async def update_platillo(
    platillo_id: UUID,
    platillo_update: PlatilloUpdate,
    session: AsyncSession = Depends(get_db_session),
):
    """Update a dish."""
    result = await session.execute(
        select(Platillo).where(Platillo.id == platillo_id)
    )
    db_platillo = result.scalar_one_or_none()
    if not db_platillo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Platillo no encontrado",
        )

    update_data = platillo_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_platillo, field, value)

    await session.commit()
    await session.refresh(db_platillo)
    return db_platillo


@router.delete("/platillos/{platillo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_platillo(
    platillo_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    """Soft delete a dish."""
    result = await session.execute(
        select(Platillo).where(Platillo.id == platillo_id)
    )
    db_platillo = result.scalar_one_or_none()
    if not db_platillo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Platillo no encontrado",
        )

    db_platillo.activo = False
    await session.commit()


# ============================================================================
# HEALTH CHECK
# ============================================================================


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "0.1.0"}
