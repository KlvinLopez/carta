"""Restaurantes del operador (US-15, T-1.2) y el CRUD heredado de platillos (hasta T-1.3).

Todo pasa por el token del operador (`operador_actual` en el router de `/admin`) y por el
aislamiento por restaurante: el restaurante sale de `{rid}` validado contra el operador
(`restaurante_del_operador`) o del platillo (`platillo_del_operador`), nunca del cuerpo
(regla dura 5); uno ajeno o inexistente responde el mismo 404 (AC-15.3).

Las rutas de platillos siguen con los cuerpos heredados (`PlatilloCreate`, `PlatilloUpdate`)
hasta que T-1.3 las reescriba con `app/services/menu.py`.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.admin.dependencias import (
    operador_actual,
    platillo_del_operador,
    restaurante_del_operador,
)
from app.core.errores import ErrorCarta, mensaje_por_http
from app.db import Platillo, Restaurante, Usuario, get_db_session
from app.schemas import PlatilloCreate, PlatilloUpdate
from app.schemas.comun import errores
from app.schemas.menu import PlatilloRespuesta
from app.schemas.restaurante import RestauranteCambios, RestauranteCrear, RestauranteRespuesta
from app.services import operadores

router = APIRouter()

# SQLSTATE → respuesta. Una FK compuesta violada (categoría de otro restaurante, INV-10) es un
# recurso que no existe para quien pregunta: 404, nunca 403 ni 500 (regla dura 6).
RESPUESTA_POR_SQLSTATE = {
    "23503": (404, "RECURSO_NO_ENCONTRADO"),  # foreign_key_violation
    "23505": (409, "CONFLICTO"),  # unique_violation
    "23514": (422, "PAYLOAD_INVALIDO"),  # check_violation (precio < 0, picante > 5…)
    "23502": (422, "PAYLOAD_INVALIDO"),  # not_null_violation
}


async def _confirmar(session: AsyncSession) -> None:
    """`commit()` que convierte las violaciones de restricciones en la envoltura de error.

    Temporal: T-1.3 pone el manejador de `IntegrityError` en `app/core/errores.py`.
    """
    try:
        await session.commit()
    except IntegrityError as error:
        await session.rollback()
        respuesta = RESPUESTA_POR_SQLSTATE.get(getattr(error.orig, "sqlstate", None) or "")
        if respuesta is None:
            raise
        http, codigo = respuesta
        raise ErrorCarta(codigo, mensaje_por_http(http), http) from None


# ============================================================================
# Restaurantes (02 §5.3, US-15)
# ============================================================================


@router.get("/restaurantes", response_model=list[RestauranteRespuesta])
async def listar_restaurantes(
    usuario: Usuario = Depends(operador_actual),
    sesion: AsyncSession = Depends(get_db_session),
) -> list[Restaurante]:
    """Los restaurantes del operador (AC-15.2). Lista vacía si todavía no tiene ninguno."""
    return await operadores.restaurantes_del_usuario(sesion, usuario.id)


@router.post(
    "/restaurantes",
    response_model=RestauranteRespuesta,
    status_code=status.HTTP_201_CREATED,
    responses=errores(409),
)
async def crear_restaurante(
    datos: RestauranteCrear,
    usuario: Usuario = Depends(operador_actual),
    sesion: AsyncSession = Depends(get_db_session),
) -> Restaurante:
    """Alta: crea el restaurante y al operador como `propietario`, con `slug` único."""
    return await operadores.crear_restaurante(sesion, usuario, datos.model_dump())


@router.get("/restaurantes/{rid}", response_model=RestauranteRespuesta)
async def ver_restaurante(
    restaurante: Restaurante = Depends(restaurante_del_operador),
) -> Restaurante:
    return restaurante


@router.patch("/restaurantes/{rid}", response_model=RestauranteRespuesta, responses=errores(409))
async def cambiar_restaurante(
    cambios: RestauranteCambios,
    restaurante: Restaurante = Depends(restaurante_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> Restaurante:
    """Nombre, logo, slug y datos de contacto; sólo cambian los campos enviados."""
    return await operadores.actualizar_restaurante(
        sesion, restaurante, cambios.model_dump(exclude_unset=True)
    )


# ============================================================================
# Platillos: CRUD heredado (T-1.3 lo reescribe)
# ============================================================================


@router.get("/restaurantes/{rid}/platillos", response_model=list[PlatilloRespuesta])
async def list_platillos(
    skip: int = 0,
    limit: int = 100,
    activo: bool = True,
    restaurante: Restaurante = Depends(restaurante_del_operador),
    session: AsyncSession = Depends(get_db_session),
):
    """List all dishes for a restaurant."""
    query = select(Platillo).where(
        (Platillo.restaurante_id == restaurante.id) & (Platillo.activo == activo)
    )
    result = await session.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


@router.post(
    "/restaurantes/{rid}/platillos",
    response_model=PlatilloRespuesta,
    status_code=status.HTTP_201_CREATED,
)
async def create_platillo(
    platillo: PlatilloCreate,
    restaurante: Restaurante = Depends(restaurante_del_operador),
    session: AsyncSession = Depends(get_db_session),
):
    """Create a new dish for a restaurant."""
    # Regla dura 5: el restaurante sale de la ruta validada contra el operador.
    db_platillo = Platillo(**platillo.model_dump(), restaurante_id=restaurante.id)
    session.add(db_platillo)
    await _confirmar(session)
    await session.refresh(db_platillo)
    return db_platillo


@router.patch("/platillos/{platillo_id}", response_model=PlatilloRespuesta)
async def update_platillo(
    platillo_update: PlatilloUpdate,
    db_platillo: Platillo = Depends(platillo_del_operador),
    session: AsyncSession = Depends(get_db_session),
):
    """Update a dish."""
    update_data = platillo_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_platillo, field, value)

    await _confirmar(session)
    await session.refresh(db_platillo)
    return db_platillo


@router.delete("/platillos/{platillo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_platillo(
    db_platillo: Platillo = Depends(platillo_del_operador),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    """Soft delete a dish."""
    db_platillo.activo = False
    await session.commit()
