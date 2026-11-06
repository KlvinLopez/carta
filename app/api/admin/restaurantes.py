"""Restaurantes del operador (US-15, T-1.2).

Todo pasa por el token del operador (`operador_actual` en el router de `/admin`) y por el
aislamiento por restaurante: el restaurante sale de `{rid}` validado contra el operador
(`restaurante_del_operador`), nunca del cuerpo (regla dura 5); uno ajeno o inexistente
responde el mismo 404 (AC-15.3). Las categorías y los platillos viven en `menu.py` (T-1.3).
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.admin.dependencias import operador_actual, restaurante_del_operador
from app.db import Restaurante, Usuario, get_db_session
from app.schemas.comun import errores
from app.schemas.restaurante import RestauranteCambios, RestauranteCrear, RestauranteRespuesta
from app.services import operadores
from app.services.cache_menu import cache_menu

router = APIRouter()

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
    """Nombre, logo, slug y datos de contacto; sólo cambian los campos enviados.

    El menú público muestra nombre y logo y vive bajo el `slug`: se invalida el anterior y
    el nuevo (T-1.3)."""
    slug_anterior = restaurante.slug
    cambiado = await operadores.actualizar_restaurante(
        sesion, restaurante, cambios.model_dump(exclude_unset=True)
    )
    await cache_menu.invalidar(*{slug_anterior, cambiado.slug})
    return cambiado
