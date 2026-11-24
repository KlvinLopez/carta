"""Rutas de contrato del comensal de la Fase 3 (T-3.0; ver `app/api/contrato.py`).

Todas pasan por `RutaComensal` (límite de tasa y tope del cuerpo) y, salvo `GET /solicitud`
(cookie propia `carta_solicitud`, T-3.10), exigen la cookie del invitado: sin ella, 401; con
ella, el 404 de una ruta que todavía no existe. Cada tarea borra aquí lo que implementa.
"""

from fastapi import APIRouter

from app.api.contrato import RutaDeContrato, registrar
from app.api.publico.tope import RutaComensal
from app.core.seguridad import invitado_actual
from app.schemas.ciclo import CerrarMiCuenta, CuentaComensal, PropinaDeclarada, SolicitudEstado
from app.schemas.linea import MensajeLinea
from app.schemas.orden import ItemCambios, ItemCrear, LlamadaRespuesta, MiOrden

CON_COOKIE = [
    # T-3.20 · línea de avisos de la mesa (ADR-018)
    RutaDeContrato(
        "get",
        "/sesion/eventos",
        "T-3.20",
        "Línea de avisos de la mesa (`text/event-stream`): `hola`, `cambio`, `latido`, `fin`",
        respuesta=MensajeLinea,
        eventos=True,
        errores=(401, 410),
    ),
    # T-3.2 · mi orden, confirmar y rondas
    RutaDeContrato(
        "post",
        "/orden/items",
        "T-3.2",
        "Agrega un platillo a mi orden; el precio lo pone el servidor",
        cuerpo=ItemCrear,
        respuesta=MiOrden,
        estado=201,
        errores=(401, 404, 409, 410),
    ),
    RutaDeContrato(
        "patch",
        "/orden/items/{item_id}",
        "T-3.2",
        "Cambia cantidad o nota de un ítem de mi orden",
        cuerpo=ItemCambios,
        respuesta=MiOrden,
        errores=(401, 404, 409, 410),
    ),
    RutaDeContrato(
        "delete",
        "/orden/items/{item_id}",
        "T-3.2",
        "Quita un ítem de mi orden",
        respuesta=MiOrden,
        errores=(401, 404, 409, 410),
    ),
    RutaDeContrato(
        "post",
        "/orden/confirmar",
        "T-3.2",
        "Confirma mi orden (`Idempotency-Key`); si todos están listos sale la comanda",
        respuesta=MiOrden,
        idempotente=True,
        errores=(401, 409, 410),
    ),
    RutaDeContrato(
        "post",
        "/orden/deshacer",
        "T-3.2",
        "Deshace mi confirmación mientras no haya comanda",
        respuesta=MiOrden,
        errores=(401, 409, 410),
    ),
    # T-3.3 · llamada
    RutaDeContrato(
        "post",
        "/llamar-mesero",
        "T-3.3",
        "Llama al mesero (una por minuto por sesión, `Idempotency-Key`)",
        respuesta=LlamadaRespuesta,
        estado=201,
        idempotente=True,
        errores=(401, 410),
    ),
    # T-3.8 · mi cuenta y mi propina declarada
    RutaDeContrato(
        "get",
        "/cuenta",
        "T-3.8",
        "Mi cuenta: partidas, consumo, propina declarada y total (AC-29.6)",
        respuesta=CuentaComensal,
        etag=True,
        errores=(401, 410),
    ),
    RutaDeContrato(
        "post",
        "/cuenta/cerrar",
        "T-3.8",
        "Cierro mi cuenta con mi propina declarada (AC-29.3, AC-37.5)",
        cuerpo=CerrarMiCuenta,
        respuesta=CuentaComensal,
        errores=(401, 409, 410),
    ),
    RutaDeContrato(
        "put",
        "/cuenta/propina",
        "T-3.8",
        "Cambio mi propina declarada hasta que el personal valide el pago (AC-37.8)",
        cuerpo=PropinaDeclarada,
        respuesta=CuentaComensal,
        errores=(401, 409, 410),
    ),
    RutaDeContrato(
        "post",
        "/cuenta/ya-pague",
        "T-3.8",
        "«Ya pagué»: un aviso al personal, no un pago (AC-29.7)",
        respuesta=CuentaComensal,
        errores=(401, 409, 410),
    ),
    # T-3.10 · una mesa a la vez
    RutaDeContrato(
        "post",
        "/mesa/salir",
        "T-3.10",
        "Salir de la mesa sin cargos validados sin pagar (AC-34.4)",
        estado=204,
        errores=(401, 409, 410),
    ),
]

SIN_COOKIE = [
    # T-3.10 · espera de una solicitud de entrada (cookie `carta_solicitud`, 10 min)
    RutaDeContrato(
        "get",
        "/solicitud",
        "T-3.10",
        "Estado de mi solicitud de entrada; aprobada, emite la cookie de invitado",
        respuesta=SolicitudEstado,
        etag=True,
        errores=(404,),
    ),
]

router = APIRouter(route_class=RutaComensal)
registrar(router, CON_COOKIE, dependencias=[invitado_actual])
registrar(router, SIN_COOKIE)

RUTAS = [*CON_COOKIE, *SIN_COOKIE]
