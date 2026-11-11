"""Rutas de la Fase 2 que todavía devuelven ejemplos (contrato primero, 04 §2).

Publican en `/openapi.json` la forma final de cada respuesta para que el frontend (carril E)
genere sus tipos (`npm --prefix frontend run tipos`) y trabaje con datos simulados mientras el
backend se construye. Las de T-2.1 (`sesion/entrar`, `sesion`, `miembro`) y las de T-2.2
(`menu/{slug}`, `platillos/{id}`) ya son reales (`app.api.publico.sesion` y
`app.api.publico.menu`). Cada tarea sustituye sus rutas por las reales y las borra de aquí:

| Rutas | Tarea |
|---|---|
| `eventos` | T-2.3 |

No leen ni escriben la base. `solo_desarrollo` (en `app.api.publico`) las esconde (404) fuera
de desarrollo y pruebas: nadie en staging o producción debe recibir datos inventados.
"""

from __future__ import annotations

from fastapi import APIRouter, Response, status

from app.api.publico.tope import RutaComensal
from app.schemas.comun import errores
from app.schemas.eventos import EventosLote

router = APIRouter(route_class=RutaComensal)


# ---------------------------------------------------------------------------
# T-2.3 · analítica (US-24)
# ---------------------------------------------------------------------------


@router.post("/eventos", status_code=status.HTTP_202_ACCEPTED, responses=errores(401))
async def eventos(cuerpo: EventosLote) -> Response:
    """Lote de hasta 50 eventos. `202` siempre que el cuerpo sea válido."""
    return Response(status_code=status.HTTP_202_ACCEPTED)
