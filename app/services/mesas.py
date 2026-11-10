"""Mesas y códigos QR del operador (US-21, AC-21.1 a AC-21.3). Sin FastAPI (regla dura 2).

- El restaurante llega ya validado contra el operador (`restaurante_del_operador`); el id de
  una mesa se resuelve con `mesa_del_usuario`: ajena = inexistente = 404 (regla dura 6).
- `codigo_publico = secrets.token_urlsafe(16)` (22 caracteres, 128 bits). La base lo exige
  único; antes de insertar se descartan los que ya existan (reintento acotado). Crear N mesas
  es una sola transacción: o salen todas o ninguna.
- Topes: `MAX_MESAS_POR_LLAMADA` (el esquema) y `MAX_MESAS_ACTIVAS` por restaurante, que es
  también el máximo del PDF. Crear bloquea la fila del restaurante (`FOR UPDATE`): dos altas a
  la vez no repiten número ni se pasan del tope.
- El número continúa tras el mayor que haya tenido el restaurante, activa o no: un QR
  impreso de una mesa dada de baja nunca se confunde con el de una mesa nueva.
- Regenerar guarda el código nuevo y `codigo_revocado_en`; el anterior deja de resolver en el
  mismo `commit()` (`mesa_por_codigo` sólo conoce el vigente). Las sesiones ya abiertas en la
  mesa no se tocan aquí: eso es de la Fase 2.
- Sin borrado físico (regla dura 9): `activa = false`. `mesa_por_codigo` sólo devuelve mesas
  activas de restaurantes activos; la ruta pública de la Fase 2 (`POST /p/sesion/entrar`,
  404 `MESA_NO_ENCONTRADA`) la usa tal cual.
"""

from __future__ import annotations

import secrets
from collections.abc import Sequence
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errores import ErrorCarta, mensaje_por_http
from app.db.models import Mesa, Restaurante
from app.schemas.mesa import MAX_MESAS_ACTIVAS
from app.services import operadores, qr_pdf

INTENTOS_DE_CODIGO = 3


def _no_encontrado() -> ErrorCarta:
    return ErrorCarta("RECURSO_NO_ENCONTRADO", mensaje_por_http(404), 404)


def _invalido(campo: str, mensaje: str, tipo: str) -> ErrorCarta:
    return ErrorCarta(
        "PAYLOAD_INVALIDO",
        mensaje,
        422,
        {"errores": [{"campo": campo, "mensaje": mensaje, "tipo": tipo}]},
    )


def nuevo_codigo() -> str:
    """128 bits de `secrets`; el único generador de códigos de mesa."""
    return secrets.token_urlsafe(16)


async def _codigos_libres(sesion: AsyncSession, cuantos: int) -> list[str]:
    """`cuantos` códigos que no existen aún. Chocar es astronómicamente raro; aun así se
    reintenta en vez de confiar en que el UNIQUE tire la transacción entera."""
    for _ in range(INTENTOS_DE_CODIGO):
        codigos = {nuevo_codigo() for _ in range(cuantos)}
        if len(codigos) < cuantos:
            continue
        ocupados = set(
            await sesion.scalars(
                select(Mesa.codigo_publico).where(Mesa.codigo_publico.in_(codigos))
            )
        )
        if not ocupados:
            return list(codigos)
    raise ErrorCarta("ERROR_INTERNO", "No pudimos generar los códigos. Intenta de nuevo.", 500)


async def mesa_del_usuario(sesion: AsyncSession, usuario_id: UUID, mesa_id: UUID) -> Mesa | None:
    """La mesa si es de un restaurante visible para el operador; `None` si no."""
    mesa = await sesion.get(Mesa, mesa_id)
    if mesa is None:
        return None
    if await operadores.restaurante_del_usuario(sesion, usuario_id, mesa.restaurante_id):
        return mesa
    return None


async def listar_mesas(
    sesion: AsyncSession,
    restaurante_id: UUID,
    activa: bool | None = None,
    skip: int = 0,
    limit: int = MAX_MESAS_ACTIVAS,
) -> Sequence[Mesa]:
    consulta = select(Mesa).where(Mesa.restaurante_id == restaurante_id)
    if activa is not None:
        consulta = consulta.where(Mesa.activa == activa)
    consulta = consulta.order_by(Mesa.numero, Mesa.id).offset(skip).limit(limit)
    return (await sesion.scalars(consulta)).all()


async def mesas_activas(sesion: AsyncSession, restaurante_id: UUID) -> Sequence[Mesa]:
    return await listar_mesas(sesion, restaurante_id, True)


async def crear_mesas(
    sesion: AsyncSession, restaurante_id: UUID, cantidad: int, capacidad: int
) -> list[Mesa]:
    """Crea `cantidad` mesas numeradas a continuación, todas o ninguna (AC-21.1)."""
    # Serializa las altas del restaurante: el número y el tope se calculan sobre lo ya visto.
    bloqueado = await sesion.scalar(
        select(Restaurante.id).where(Restaurante.id == restaurante_id).with_for_update()
    )
    if bloqueado is None:
        raise _no_encontrado()
    activas = await sesion.scalar(
        select(func.count())
        .select_from(Mesa)
        .where(Mesa.restaurante_id == restaurante_id, Mesa.activa.is_(True))
    )
    if (activas or 0) + cantidad > MAX_MESAS_ACTIVAS:
        raise _invalido(
            "body.cantidad",
            f"Cada restaurante puede tener hasta {MAX_MESAS_ACTIVAS} mesas activas.",
            "limite_de_mesas",
        )
    ultimo = await sesion.scalar(
        select(func.max(Mesa.numero)).where(Mesa.restaurante_id == restaurante_id)
    )
    codigos = await _codigos_libres(sesion, cantidad)
    mesas = [
        Mesa(
            restaurante_id=restaurante_id,
            numero=(ultimo or 0) + n,
            codigo_publico=codigo,
            capacidad=capacidad,
        )
        for n, codigo in enumerate(codigos, start=1)
    ]
    sesion.add_all(mesas)
    await sesion.commit()
    return mesas


async def regenerar_codigo(sesion: AsyncSession, mesa_id: UUID, restaurante_id: UUID) -> Mesa:
    """Código nuevo; el anterior queda revocado en el mismo `commit()` (AC-21.3).

    `restaurante_id` es el de la mesa ya validada contra el operador; la fila se vuelve a
    leer con `FOR UPDATE` para que dos regeneraciones no se pisen."""
    mesa = await sesion.scalar(
        select(Mesa)
        .where(Mesa.id == mesa_id, Mesa.restaurante_id == restaurante_id)
        .with_for_update()
    )
    if mesa is None:
        raise _no_encontrado()
    if not mesa.activa:
        raise ErrorCarta(
            "MESA_INACTIVA", "Esa mesa está dada de baja; no tiene código que regenerar.", 409
        )
    mesa.codigo_publico = (await _codigos_libres(sesion, 1))[0]
    mesa.codigo_revocado_en = datetime.now(UTC)
    await sesion.commit()
    return mesa


async def pdf_de_qr(
    sesion: AsyncSession, restaurante_id: UUID, nombre: str, logo_url: str | None
) -> bytes:
    """El PDF de las mesas activas con los códigos **vigentes al terminar** (AC-21.3).

    Generar tarda segundos; si alguien regenera un código (o da de alta/baja una mesa) a
    mitad, la tarjeta saldría con un código ya revocado. Al terminar se vuelven a leer las
    mesas: si algo cambió se genera otra vez, una sola, y si cambia de nuevo, 409
    `CODIGOS_CAMBIADOS`. La sesión se suelta (`rollback`) antes de cada generación: no
    retiene la conexión mientras se baja el logo y se maqueta. `nombre` y `logo_url` se leen
    antes porque el `rollback` expira los objetos."""

    async def foto() -> list[qr_pdf.TarjetaQR]:
        activas = await mesas_activas(sesion, restaurante_id)
        tarjetas = [qr_pdf.TarjetaQR(m.numero, m.codigo_publico) for m in activas]
        await sesion.rollback()
        return tarjetas

    tarjetas = await foto()
    for _ in range(2):
        pdf = await qr_pdf.pdf_de_mesas(nombre, logo_url, tarjetas)
        despues = await foto()
        if despues == tarjetas:
            return pdf
        tarjetas = despues
    raise ErrorCarta(
        "CODIGOS_CAMBIADOS",
        "Se regeneró un código mientras se preparaba el PDF; vuelve a pedirlo.",
        409,
    )


async def mesa_por_codigo(sesion: AsyncSession, codigo: str) -> Mesa | None:
    """La mesa **activa** (de un restaurante activo) cuyo código vigente es `codigo`.

    Un código revocado, de una mesa dada de baja o desconocido da `None`: la ruta pública
    responde 404 `MESA_NO_ENCONTRADA` sin distinguir cuál de los tres fue."""
    if not codigo or len(codigo) > 100:
        return None
    return await sesion.scalar(
        select(Mesa)
        .join(Restaurante, Restaurante.id == Mesa.restaurante_id)
        .where(
            Mesa.codigo_publico == codigo,
            Mesa.activa.is_(True),
            Restaurante.activo.is_(True),
        )
    )
