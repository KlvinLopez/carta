"""Rutas de contrato del dueño de la Fase 3 (T-3.0; ver `app/api/contrato.py`): pedidos en vivo
desde el panel (T-3.7) con las mismas acciones del personal (`ACCIONES_PISO` y
`ACCIONES_MESA`, bajo `/restaurantes/{rid}/pedidos`) y la línea de avisos del panel.

El router de `/admin` ya exige el token (`operador_actual`) y cada ruta comprueba su
restaurante con `restaurante_del_operador` (regla dura 6: el ajeno da 404) antes del 404 del
contrato. `GET /admin/eventos` no lleva token (`EventSource` no manda `Authorization`): abre
con el pase de línea que canjea `POST /restaurantes/{rid}/linea` (ADR-018 punto 9) y, mientras
no exista, responde 401 como sin pase.
"""

from dataclasses import replace

from fastapi import APIRouter

from app.api.admin.dependencias import restaurante_del_operador
from app.api.admin.subidas import ruta_con_tope
from app.api.contrato import PLAZO_CUERPO, TOPE_CUERPO, RutaDeContrato, registrar
from app.api.operacion.contrato import ACCIONES_MESA, ACCIONES_PISO
from app.core.errores import ErrorCarta
from app.schemas.linea import MensajeLinea
from app.schemas.personal_op import ComandasOp, MesaDetalleOp, MesasOp

R = "/restaurantes/{rid}"

RUTAS_DUENO = [
    RutaDeContrato(
        "get",
        f"{R}/mesas-vivo",
        "T-3.7",
        "Mesas en vivo, como `GET /op/mesas` (AC-36.6)",
        respuesta=MesasOp,
        etag=True,
        errores=(429,),
    ),
    RutaDeContrato(
        "get",
        f"{R}/mesas-vivo/{{mesa_id}}",
        "T-3.7",
        "Detalle de una mesa en vivo",
        respuesta=MesaDetalleOp,
    ),
    RutaDeContrato(
        "get",
        f"{R}/comandas",
        "T-3.7",
        "Comandas y llamadas pendientes",
        respuesta=ComandasOp,
        etag=True,
    ),
    RutaDeContrato(
        "post",
        f"{R}/linea",
        "T-3.7",
        "Canjea el token por el pase de la línea del panel (cookie de vida corta)",
        estado=204,
        errores=(429,),
    ),
    *(
        replace(accion, ruta=f"{R}/pedidos{accion.ruta}", tarea="T-3.7", errores=(409, 429))
        for accion in (*ACCIONES_PISO, *ACCIONES_MESA)
    ),
]

LINEA_DEL_PANEL = [
    RutaDeContrato(
        "get",
        "/eventos",
        "T-3.7",
        "Línea de avisos del panel del dueño (`text/event-stream`), con el pase de línea",
        respuesta=MensajeLinea,
        eventos=True,
        errores=(401, 404, 422, 429),
    ),
]


def _sin_pase() -> ErrorCarta:
    return ErrorCarta("SIN_CREDENCIAL", "Necesitas identificarte para hacer esto.", 401)


router = APIRouter(route_class=ruta_con_tope(TOPE_CUERPO, PLAZO_CUERPO))  # B4
registrar(router, RUTAS_DUENO, dependencias=[restaurante_del_operador])

router_linea = APIRouter(tags=["operador"])
registrar(router_linea, LINEA_DEL_PANEL, error=_sin_pase)
