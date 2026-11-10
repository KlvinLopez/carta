"""Personal y PIN del operador (US-26, AC-26.3, T-1.6).

El restaurante sale de `{rid}` validado (`restaurante_del_operador`) y la persona por id de
`personal_del_operador`: ajena = inexistente = 404 (regla dura 6, AC-15.3). El PIN entra en el
cuerpo y no sale nunca: ni en las respuestas, ni en los errores (`manejar_validacion` no
devuelve `input`), ni en el log. La lógica vive en `app.services.personal`, sin FastAPI.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.admin.dependencias import no_encontrado, operador_actual, restaurante_del_operador
from app.db import PersonalRestaurante, Restaurante, Usuario, get_db_session
from app.schemas.comun import errores
from app.schemas.personal import PersonalCambios, PersonalCrear, PersonalRespuesta, PinNuevo
from app.services import personal

router = APIRouter()


async def personal_del_operador(
    personal_id: UUID,
    usuario: Usuario = Depends(operador_actual),
    sesion: AsyncSession = Depends(get_db_session),
) -> PersonalRestaurante:
    persona = await personal.personal_del_usuario(sesion, usuario.id, personal_id)
    if persona is None:
        raise no_encontrado()
    return persona


@router.get("/restaurantes/{rid}/personal", response_model=list[PersonalRespuesta])
async def listar_personal(
    activo: bool | None = None,
    restaurante: Restaurante = Depends(restaurante_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> list[PersonalRestaurante]:
    """Activos primero, por nombre; `activo` filtra (sin él, todos)."""
    return list(await personal.listar_personal(sesion, restaurante.id, activo))


@router.post(
    "/restaurantes/{rid}/personal",
    response_model=PersonalRespuesta,
    status_code=status.HTTP_201_CREATED,
    responses=errores(409),  # nombre repetido entre los activos
)
async def crear_personal(
    datos: PersonalCrear,
    restaurante: Restaurante = Depends(restaurante_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> PersonalRestaurante:
    """Alta con el PIN que elige el operador (4–6 dígitos); la respuesta no lo repite."""
    return await personal.crear_personal(sesion, restaurante.id, datos.nombre, datos.rol, datos.pin)


@router.patch(
    "/personal/{personal_id}",
    response_model=PersonalRespuesta,
    responses=errores(409),  # nombre repetido entre los activos
)
async def editar_personal(
    datos: PersonalCambios,
    persona: PersonalRestaurante = Depends(personal_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> PersonalRestaurante:
    """Nombre, rol y alta/baja. Dar de baja, reactivar o cambiar el rol revoca de inmediato
    la sesión vigente de la persona (AC-26.3)."""
    return await personal.cambiar_personal(
        sesion,
        persona.id,
        persona.restaurante_id,
        nombre=datos.nombre,
        rol=datos.rol,
        activo=datos.activo,
    )


@router.post("/personal/{personal_id}/pin", status_code=status.HTTP_204_NO_CONTENT)
async def cambiar_pin(
    datos: PinNuevo,
    persona: PersonalRestaurante = Depends(personal_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> Response:
    """Reasigna el PIN y revoca la sesión vigente. Sin cuerpo de respuesta."""
    await personal.reasignar_pin(sesion, persona.id, persona.restaurante_id, datos.pin)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
