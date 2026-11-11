"""Analítica del teléfono (T-2.3, US-24): `POST /p/eventos`.

Exige la cookie de invitado (restaurante, sesión y miembro salen del token, regla dura 5) y
responde **202 sin cuerpo** a todo lote válido: si la base falla o el miembro ya mandó más de
`LIMITE_EVENTOS_POR_TOKEN` eventos en el último minuto, el lote se descarta en silencio
(04_API_Spec §2.6: un fallo de analítica nunca se ve en la app). El límite general de 120
peticiones por minuto (`limites.limite_comensal`) sí responde 429.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.publico import limites
from app.api.publico.tope import RutaComensal
from app.core.seguridad import Invitado, invitado_actual
from app.db import get_db_session
from app.schemas.comun import errores
from app.schemas.eventos import EventosLote
from app.services import analitica

router = APIRouter(route_class=RutaComensal)


def origen_de(request: Request) -> analitica.Origen:
    """IP (ya como cubo) y *user agent* de la petición para `ip_hash` y la familia."""
    ip = limites.ip_de_peticion(request)
    return analitica.Origen(
        ip=None if ip == limites.DESCONOCIDA else ip,
        user_agent=request.headers.get("user-agent"),
    )


@router.post("/eventos", status_code=status.HTTP_202_ACCEPTED, responses=errores(401))
async def eventos(
    cuerpo: EventosLote,
    request: Request,
    invitado: Invitado = Depends(invitado_actual),
    sesion: AsyncSession = Depends(get_db_session),
) -> Response:
    """Lote de hasta 50 eventos. `202` siempre que el cuerpo sea válido."""
    # La descripción de arriba es parte del contrato publicado (frontend/src/compartido/
    # api.d.ts): sin cookie válida es 401 (declarado en `responses`).
    sin_cuerpo = Response(
        status_code=status.HTTP_202_ACCEPTED, headers={"Cache-Control": "no-store"}
    )
    if limites.eventos_por_token.intentar(str(invitado.miembro_id), len(cuerpo.eventos)):
        return sin_cuerpo
    await analitica.registrar_lote(
        sesion,
        restaurante_id=invitado.restaurante_id,
        sesion_id=invitado.sesion_id,
        miembro_id=invitado.miembro_id,
        eventos=[
            analitica.EventoCliente(e.tipo, e.platillo_id, e.ocurrido_en) for e in cuerpo.eventos
        ],
        origen=origen_de(request),
    )
    return sin_cuerpo
