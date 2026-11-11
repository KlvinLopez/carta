"""Sesión de mesa del comensal (T-2.1): `POST /p/sesion/entrar`, `GET /p/sesion` y
`PATCH /p/miembro`. La lógica vive en `app.services.sesion`; aquí sólo cookie y cabeceras.

Ninguna respuesta se guarda en el navegador ni en el borde (`Cache-Control: private,
no-store`, 02 §4). El sondeo de 3 s compara el `ETag` a mano: el cliente guarda el último y lo
manda en `If-None-Match`; con 304 conserva lo que ya pintó.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.seguridad import (
    Invitado,
    emitir_token_invitado,
    invitado_actual,
    invitado_opcional,
    poner_cookie_invitado,
)
from app.db import get_db_session
from app.schemas.comun import errores
from app.schemas.sesion import (
    EntrarCuerpo,
    EntrarRespuesta,
    MesaDeSesion,
    MiembroCambios,
    MiembroRespuesta,
    RestauranteDeSesion,
    SesionEstado,
    SesionResumen,
)
from app.services import sesion as servicio

router = APIRouter()

SIN_CACHE = "private, no-store"


@router.post("/sesion/entrar", response_model=EntrarRespuesta, responses=errores(404, 409, 410))
async def entrar(
    cuerpo: EntrarCuerpo,
    request: Request,
    response: Response,
    sesion: AsyncSession = Depends(get_db_session),
) -> EntrarRespuesta:
    """Crea o reanuda la sesión de la mesa y emite la cookie `carta_invitado` (6 h).

    404 `MESA_NO_ENCONTRADA` para un código desconocido, revocado o de una mesa o restaurante
    dados de baja, siempre con el mismo cuerpo (AC-01.3, AC-21.3); 409 `SESION_LLENA` con 12
    comensales (AC-02.5). Una cookie vigente de esta misma sesión reanuda al miembro (AC-01.4);
    una vieja o ajena se ignora y se entra como comensal nuevo."""
    entrada = await servicio.entrar(sesion, cuerpo.codigo_mesa, invitado_opcional(request))
    poner_cookie_invitado(response, emitir_token_invitado(entrada.invitado))
    response.headers["Cache-Control"] = SIN_CACHE
    return EntrarRespuesta(
        sesion=SesionResumen(
            id=entrada.sesion.id,
            estado=entrada.sesion.estado,  # type: ignore[arg-type]  # viva: `unirse` lo garantiza
            mesa=MesaDeSesion.model_validate(entrada.mesa),
            restaurante=RestauranteDeSesion.model_validate(entrada.restaurante),
        ),
        miembro=MiembroRespuesta.model_validate(entrada.miembro),
    )


@router.get(
    "/sesion",
    response_model=SesionEstado,
    responses={
        304: {"description": "Sin cambios desde el `ETag` de `If-None-Match`."},
        **errores(401, 410),
    },
)
async def estado_de_sesion(
    request: Request,
    invitado: Invitado = Depends(invitado_actual),
    sesion: AsyncSession = Depends(get_db_session),
) -> Response:
    """Estado de la mesa para el sondeo de 3 s (AC-02.3), con `ETag`; 304 si no cambió. Con
    el estado en memoria (≤ 2 s) no consulta la base. 410 `SESION_CERRADA` cuando la sesión
    ya no está viva (la app muestra «la mesa se cerró» y deja de sondear)."""
    foto = await servicio.estado(sesion, invitado)
    etag = foto.etag(invitado.miembro_id)
    cabeceras = {"ETag": etag, "Cache-Control": SIN_CACHE}
    if servicio.coincide_etag(request.headers.get("if-none-match"), etag):
        return Response(status_code=304, headers=cabeceras)
    cuerpo = SesionEstado.model_validate(foto.cuerpo(invitado.miembro_id))
    return Response(
        content=cuerpo.model_dump_json(),
        media_type="application/json",
        headers=cabeceras,
    )


@router.patch("/miembro", response_model=MiembroRespuesta, responses=errores(401, 410))
async def cambiar_alias(
    cuerpo: MiembroCambios,
    response: Response,
    invitado: Invitado = Depends(invitado_actual),
    sesion: AsyncSession = Depends(get_db_session),
) -> MiembroRespuesta:
    """Cambia el alias (1–24 caracteres, AC-03.2). Uno de la lista de bloqueo es 422
    `ALIAS_NO_PERMITIDO` y el anterior se conserva (AC-03.3)."""
    miembro = await servicio.cambiar_alias(sesion, invitado, cuerpo.alias)
    response.headers["Cache-Control"] = SIN_CACHE
    return MiembroRespuesta.model_validate(miembro)
