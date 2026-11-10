"""Categorías y platillos del operador (02 §5.3, US-16, AC-16.1 a AC-16.3, T-1.3).

Cada ruta resuelve su recurso con una dependencia `*_del_operador` (ajeno = inexistente =
404, AC-15.3) y delega en `app.services.menu`, que no conoce FastAPI. El restaurante sale
de `{rid}` validado o del propio recurso, nunca del cuerpo (regla dura 5). `DELETE` es baja
lógica (regla dura 9, AC-16.3).
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.admin.dependencias import (
    categoria_del_operador,
    platillo_del_operador,
    restaurante_del_operador,
)
from app.db import CategoriaMenu, Platillo, Restaurante, get_db_session
from app.schemas.comun import Reordenar, errores
from app.schemas.menu import (
    CategoriaCambios,
    CategoriaCrear,
    CategoriaRespuesta,
    PlatilloCambios,
    PlatilloCrear,
    PlatilloRespuesta,
)
from app.services import menu

router = APIRouter()

# Paginación acotada: `limit=-1` o `skip=-1` son 422, no un 500 de PostgreSQL.
Skip = Query(0, ge=0, le=100_000)
Limit = Query(50, ge=1, le=100)


# ---------------------------------------------------------------------------
# Categorías
# ---------------------------------------------------------------------------


@router.get("/restaurantes/{rid}/categorias", response_model=list[CategoriaRespuesta])
async def listar_categorias(
    activa: bool | None = None,
    skip: int = Skip,
    limit: int = Limit,
    restaurante: Restaurante = Depends(restaurante_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> list[CategoriaMenu]:
    """En su orden; `activa` filtra (sin él, todas: el operador reactiva las dadas de baja)."""
    return await menu.listar_categorias(sesion, restaurante.id, activa, skip, limit)


@router.post(
    "/restaurantes/{rid}/categorias",
    response_model=CategoriaRespuesta,
    status_code=status.HTTP_201_CREATED,
    responses=errores(409),  # nombre repetido entre las activas
)
async def crear_categoria(
    datos: CategoriaCrear,
    restaurante: Restaurante = Depends(restaurante_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> CategoriaMenu:
    return await menu.crear_categoria(sesion, restaurante.id, datos.nombre)


@router.post("/restaurantes/{rid}/categorias/reordenar", response_model=list[CategoriaRespuesta])
async def reordenar_categorias(
    datos: Reordenar,
    restaurante: Restaurante = Depends(restaurante_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> list[CategoriaMenu]:
    """Los ids enviados quedan primero, en ese orden; uno ajeno o inexistente es 404."""
    return await menu.reordenar_categorias(sesion, restaurante.id, datos.ids)


@router.patch(
    "/categorias/{categoria_id}", response_model=CategoriaRespuesta, responses=errores(409)
)
async def cambiar_categoria(
    cambios: CategoriaCambios,
    categoria: CategoriaMenu = Depends(categoria_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> CategoriaMenu:
    """Nombre o `activa` (reactivar); sólo cambian los campos enviados."""
    return await menu.cambiar_categoria(sesion, categoria, cambios.model_dump(exclude_unset=True))


@router.delete("/categorias/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
async def desactivar_categoria(
    categoria: CategoriaMenu = Depends(categoria_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> None:
    """Baja lógica (`activa = false`)."""
    await menu.desactivar_categoria(sesion, categoria)


# ---------------------------------------------------------------------------
# Platillos
# ---------------------------------------------------------------------------


@router.get("/restaurantes/{rid}/platillos", response_model=list[PlatilloRespuesta])
async def listar_platillos(
    activo: bool | None = True,
    categoria_id: UUID | None = None,
    skip: int = Skip,
    limit: int = Limit,
    restaurante: Restaurante = Depends(restaurante_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> list[Platillo]:
    """Activos por defecto (`activo=false` lista las bajas)."""
    return await menu.listar_platillos(sesion, restaurante.id, activo, categoria_id, skip, limit)


@router.post(
    "/restaurantes/{rid}/platillos",
    response_model=PlatilloRespuesta,
    status_code=status.HTTP_201_CREATED,
)
async def crear_platillo(
    datos: PlatilloCrear,
    restaurante: Restaurante = Depends(restaurante_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> Platillo:
    return await menu.crear_platillo(sesion, restaurante.id, datos.model_dump())


@router.post(
    "/restaurantes/{rid}/platillos/reordenar",
    response_model=list[PlatilloRespuesta],
    responses=errores(409),  # otro movió un platillo de categoría a la vez
)
async def reordenar_platillos(
    datos: Reordenar,
    restaurante: Restaurante = Depends(restaurante_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> list[Platillo]:
    """Dentro de una categoría: ids de varias categorías son 422; uno ajeno, 404."""
    return await menu.reordenar_platillos(sesion, restaurante.id, datos.ids)


@router.patch("/platillos/{platillo_id}", response_model=PlatilloRespuesta)
async def cambiar_platillo(
    cambios: PlatilloCambios,
    platillo: Platillo = Depends(platillo_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> Platillo:
    """Edita, marca `disponible` o reactiva (`activo: true`); sólo cambian los enviados."""
    return await menu.cambiar_platillo(sesion, platillo, cambios.model_dump(exclude_unset=True))


@router.delete("/platillos/{platillo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def desactivar_platillo(
    platillo: Platillo = Depends(platillo_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> None:
    """Baja lógica (`activo = false`, AC-16.3): las órdenes que lo citan no cambian."""
    await menu.desactivar_platillo(sesion, platillo)
