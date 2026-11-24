"""Rutas de contrato del personal de la Fase 3 (T-3.0; ver `app/api/contrato.py`).

La cookie `carta_personal` la pone T-3.4: hasta entonces toda ruta de `/op` responde el 404 de
una ruta que no existe. `ACCIONES_MESA` es la misma lista que el panel del dueño monta bajo
`/admin/restaurantes/{rid}/pedidos` (T-3.7): mismas acciones y cuerpos, otra autenticación.
"""

from fastapi import APIRouter

from app.api.contrato import RutaDeContrato, registrar
from app.schemas.linea import MensajeLinea
from app.schemas.personal_op import (
    ComandaOp,
    ComandasOp,
    DisponibleCuerpo,
    EntradaMesa,
    EntrarPersonal,
    LiberarMesa,
    LlamadaOp,
    MesaDetalleOp,
    MesasOp,
    PasarCuenta,
    PersonalDelRestaurante,
    PlatilloOp,
    ResumenTurno,
    SesionPersonal,
    SobreSesion,
)

ERRORES_OP = (401, 404, 409, 422, 429)


def _accion(
    ruta: str, tarea: str, resumen: str, cuerpo: type | None = SobreSesion
) -> RutaDeContrato:
    return RutaDeContrato(
        "post", ruta, tarea, resumen, cuerpo=cuerpo, respuesta=MesaDetalleOp, errores=ERRORES_OP
    )


# Comandas y llamadas (T-3.4): también las usa el dueño desde su panel.
ACCIONES_PISO = [
    RutaDeContrato(
        "post",
        "/comandas/{comanda_id}/atender",
        "T-3.4",
        "Atender una comanda",
        respuesta=ComandaOp,
        errores=ERRORES_OP,
    ),
    RutaDeContrato(
        "post",
        "/comandas/{comanda_id}/servir",
        "T-3.4",
        "Marcar una comanda servida",
        respuesta=ComandaOp,
        errores=ERRORES_OP,
    ),
    RutaDeContrato(
        "post",
        "/llamadas/{llamada_id}/atender",
        "T-3.4",
        "Atender una llamada",
        respuesta=LlamadaOp,
        errores=ERRORES_OP,
    ),
]

# Ciclo, entrada y correcciones (T-3.11 sobre los servicios de T-3.8, T-3.10 y T-3.12). Todas
# llevan la sesión que se está viendo y responden el detalle de la mesa al día.
ACCIONES_MESA = [
    _accion(
        "/mesas/{mesa_id}/cuentas/cerrar",
        "T-3.11",
        "Cerrar las cuentas de toda la mesa (atajo, AC-29.4)",
    ),
    _accion(
        "/mesas/{mesa_id}/limpia",
        "T-3.11",
        "Mesa limpia: termina la sesión y libera a todos (AC-29.9)",
    ),
    _accion("/mesas/{mesa_id}/reabrir", "T-3.11", "Reabrir la mesa antes de «pagada» (AC-29.11)"),
    _accion(
        "/mesas/{mesa_id}/liberar",
        "T-3.11",
        "Liberar la mesa; con cargos, sólo con permiso (AC-29.12)",
        LiberarMesa,
    ),
    _accion(
        "/mesas/{mesa_id}/todo-bien",
        "T-3.11",
        "«Todo bien con la mesa»: cuenta como acción (AC-30.7)",
    ),
    _accion(
        "/mesas/{mesa_id}/entrada",
        "T-3.11",
        "Cerrar o abrir la entrada de la mesa (AC-33.1, AC-33.5)",
        EntradaMesa,
    ),
    _accion(
        "/miembros/{miembro_id}/cuenta/cerrar",
        "T-3.11",
        "Cerrar la cuenta de un comensal por él (AC-31.3)",
    ),
    _accion(
        "/miembros/{miembro_id}/cuenta/reabrir",
        "T-3.11",
        "Reabrir la cuenta de un comensal (AC-29.11)",
    ),
    _accion(
        "/miembros/{miembro_id}/pago/validar",
        "T-3.11",
        "Validar el pago; la propina se anota a quien valida (AC-29.8, AC-37.7)",
    ),
    _accion("/miembros/{miembro_id}/quitar", "T-3.11", "Quitar a un comensal sin cargos (AC-31.1)"),
    _accion(
        "/miembros/{miembro_id}/flotante",
        "T-3.11",
        "«Perdió su lugar»: su cuenta queda flotante (AC-31.8)",
    ),
    _accion(
        "/miembros/{miembro_id}/pasar-cuenta",
        "T-3.11",
        "Pasar la cuenta a otro comensal (AC-31.7)",
        PasarCuenta,
    ),
    _accion(
        "/items/{item_id}/cancelar", "T-3.11", "Cancelar un ítem que la cocina no empezó (AC-31.5)"
    ),
    _accion(
        "/solicitudes/{solicitud_id}/aprobar",
        "T-3.11",
        "Aprobar una solicitud de entrada (AC-33.3)",
        None,
    ),
    _accion(
        "/solicitudes/{solicitud_id}/rechazar",
        "T-3.11",
        "Rechazar una solicitud de entrada (AC-33.3)",
        None,
    ),
]

RUTAS_PERSONAL = [
    RutaDeContrato(
        "get",
        "/personal/{slug}",
        "T-3.4",
        "Nombres activos para la pantalla de entrada (sin PIN)",
        respuesta=PersonalDelRestaurante,
        errores=(404, 429),
    ),
    RutaDeContrato(
        "post",
        "/entrar",
        "T-3.4",
        "Entrar (o cambiar de persona) con PIN; cookie de 12 h",
        cuerpo=EntrarPersonal,
        respuesta=SesionPersonal,
        errores=(401, 404, 422, 429),
    ),
    RutaDeContrato("post", "/salir", "T-3.4", "Salir", estado=204, errores=(401,)),
    RutaDeContrato(
        "get",
        "/eventos",
        "T-3.4",
        "Línea de avisos del restaurante (`text/event-stream`)",
        respuesta=MensajeLinea,
        eventos=True,
        errores=(401, 404, 429),
    ),
    RutaDeContrato(
        "get",
        "/mesas",
        "T-3.4",
        "Mesas con su estado, tiempos y hora de la última acción",
        respuesta=MesasOp,
        etag=True,
        errores=(401, 404, 429),
    ),
    RutaDeContrato(
        "get",
        "/mesas/{mesa_id}",
        "T-3.4",
        "Detalle de una mesa: comensales, cuentas, comandas",
        respuesta=MesaDetalleOp,
        errores=(401, 404, 429),
    ),
    RutaDeContrato(
        "get",
        "/comandas",
        "T-3.4",
        "Comandas y llamadas pendientes",
        respuesta=ComandasOp,
        etag=True,
        errores=(401, 404, 429),
        consulta={"estado": str | None},
    ),
    *ACCIONES_PISO,
    RutaDeContrato(
        "get",
        "/platillos",
        "T-3.4",
        "Búsqueda rápida de platillos para «Agotado»",
        respuesta=list[PlatilloOp],
        errores=(401, 404, 429),
        consulta={"q": str | None},
    ),
    RutaDeContrato(
        "post",
        "/platillos/{platillo_id}/disponible",
        "T-3.4",
        "Marcar agotado o de vuelta",
        cuerpo=DisponibleCuerpo,
        respuesta=PlatilloOp,
        errores=ERRORES_OP,
    ),
    RutaDeContrato(
        "get",
        "/resumen",
        "T-3.4",
        "Resumen del turno (capitán)",
        respuesta=ResumenTurno,
        errores=(401, 404, 429),
    ),
    *ACCIONES_MESA,
]

router = APIRouter()
registrar(router, RUTAS_PERSONAL)
