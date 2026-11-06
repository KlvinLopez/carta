"""CRUD heredado de restaurantes y platillos (temporal).

Sin autenticación ni aislamiento por restaurante todavía: T-1.2 lo pone detrás del token
del operador y T-1.3 lo reescribe contra 02_Arquitectura_v1 §5.3. Los 404 que lanza salen
con la envoltura única por el manejador de `app.core.errores`.

Desde T-1.1 sus rutas, métodos y esquemas de respuesta ya son los del contrato v1
(`{rid}`, `PATCH`, `app.schemas.{restaurante,menu}`), para que `/openapi.json` publique la
forma final; los cuerpos de entrada siguen siendo los heredados hasta T-1.2 y T-1.3. Las
demás rutas de la Fase 1 devuelven ejemplos desde `app.api.admin.ejemplos`.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import (
    Platillo,
    Restaurante,
    get_db_session,
)
from app.schemas import (
    PlatilloCreate,
    PlatilloUpdate,
    RestauranteCreate,
    RestauranteUpdate,
)
from app.schemas.menu import PlatilloRespuesta
from app.schemas.restaurante import RestauranteRespuesta

router = APIRouter()


# ============================================================================
# RESTAURANTE ROUTES
# ============================================================================


@router.get("/restaurantes", response_model=list[RestauranteRespuesta])
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


@router.post(
    "/restaurantes", response_model=RestauranteRespuesta, status_code=status.HTTP_201_CREATED
)
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


@router.get("/restaurantes/{rid}", response_model=RestauranteRespuesta)
async def get_restaurante(
    rid: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    """Get a specific restaurant."""
    result = await session.execute(select(Restaurante).where(Restaurante.id == rid))
    restaurante = result.scalar_one_or_none()
    if not restaurante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurante no encontrado",
        )
    return restaurante


@router.patch("/restaurantes/{rid}", response_model=RestauranteRespuesta)
async def update_restaurante(
    rid: UUID,
    restaurante_update: RestauranteUpdate,
    session: AsyncSession = Depends(get_db_session),
):
    """Update a restaurant."""
    result = await session.execute(select(Restaurante).where(Restaurante.id == rid))
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


# ============================================================================
# PLATILLO ROUTES
# ============================================================================


@router.get(
    "/restaurantes/{rid}/platillos",
    response_model=list[PlatilloRespuesta],
)
async def list_platillos(
    rid: UUID,
    skip: int = 0,
    limit: int = 100,
    activo: bool = True,
    session: AsyncSession = Depends(get_db_session),
):
    """List all dishes for a restaurant."""
    # Verify restaurant exists
    result = await session.execute(select(Restaurante).where(Restaurante.id == rid))
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurante no encontrado",
        )

    query = select(Platillo).where((Platillo.restaurante_id == rid) & (Platillo.activo == activo))
    result = await session.execute(query.offset(skip).limit(limit))
    platillos = result.scalars().all()
    return platillos


@router.post(
    "/restaurantes/{rid}/platillos",
    response_model=PlatilloRespuesta,
    status_code=status.HTTP_201_CREATED,
)
async def create_platillo(
    rid: UUID,
    platillo: PlatilloCreate,
    session: AsyncSession = Depends(get_db_session),
):
    """Create a new dish for a restaurant."""
    # Verify restaurant exists
    result = await session.execute(select(Restaurante).where(Restaurante.id == rid))
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


@router.patch("/platillos/{platillo_id}", response_model=PlatilloRespuesta)
async def update_platillo(
    platillo_id: UUID,
    platillo_update: PlatilloUpdate,
    session: AsyncSession = Depends(get_db_session),
):
    """Update a dish."""
    result = await session.execute(select(Platillo).where(Platillo.id == platillo_id))
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
    result = await session.execute(select(Platillo).where(Platillo.id == platillo_id))
    db_platillo = result.scalar_one_or_none()
    if not db_platillo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Platillo no encontrado",
        )

    db_platillo.activo = False
    await session.commit()
