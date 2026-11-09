"""Mesas y códigos QR del operador (US-21, AC-21.1 a AC-21.3, T-1.5).

El restaurante sale de `{rid}` validado (`restaurante_del_operador`) y la mesa por id de
`mesa_del_operador`: ajena = inexistente = 404 (regla dura 6, AC-15.3). La lógica vive en
`app.services.mesas` y `app.services.qr_pdf`, que no conocen FastAPI.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.admin.dependencias import no_encontrado, operador_actual, restaurante_del_operador
from app.db import Mesa, Restaurante, Usuario, get_db_session
from app.schemas.comun import errores
from app.schemas.mesa import MAX_MESAS_ACTIVAS, MesaRespuesta, MesasCrear
from app.services import mesas, qr_pdf

router = APIRouter()


async def mesa_del_operador(
    mesa_id: UUID,
    usuario: Usuario = Depends(operador_actual),
    sesion: AsyncSession = Depends(get_db_session),
) -> Mesa:
    mesa = await mesas.mesa_del_usuario(sesion, usuario.id, mesa_id)
    if mesa is None:
        raise no_encontrado()
    return mesa


@router.get("/restaurantes/{rid}/mesas", response_model=list[MesaRespuesta])
async def listar_mesas(
    activa: bool | None = None,
    skip: int = Query(0, ge=0, le=100_000),
    limit: int = Query(MAX_MESAS_ACTIVAS, ge=1, le=MAX_MESAS_ACTIVAS),
    restaurante: Restaurante = Depends(restaurante_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> list[Mesa]:
    """Por número; `activa` filtra (sin él, todas)."""
    return list(await mesas.listar_mesas(sesion, restaurante.id, activa, skip, limit))


@router.post(
    "/restaurantes/{rid}/mesas",
    response_model=list[MesaRespuesta],
    status_code=status.HTTP_201_CREATED,
)
async def crear_mesas(
    datos: MesasCrear,
    restaurante: Restaurante = Depends(restaurante_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> list[Mesa]:
    """Crea `cantidad` mesas numeradas a continuación, con un código de 128 bits cada una."""
    return await mesas.crear_mesas(sesion, restaurante.id, datos.cantidad, datos.capacidad)


@router.post("/mesas/{mesa_id}/regenerar-codigo", response_model=MesaRespuesta)
async def regenerar_codigo(
    mesa: Mesa = Depends(mesa_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> Mesa:
    """Código nuevo; el anterior deja de funcionar de inmediato (AC-21.3)."""
    return await mesas.regenerar_codigo(sesion, mesa.id, mesa.restaurante_id)


@router.get(
    "/restaurantes/{rid}/mesas/qr.pdf",
    response_class=Response,
    responses={
        200: {"content": {"application/pdf": {}}, "description": "Tarjetas con QR"},
        **errores(409),  # sin mesas activas
    },
)
async def descargar_qr(
    restaurante: Restaurante = Depends(restaurante_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> Response:
    """Una tarjeta por mesa activa, cuatro por hoja A4 (AC-21.2)."""
    activas = await mesas.mesas_activas(sesion, restaurante.id)
    tarjetas = [qr_pdf.TarjetaQR(m.numero, m.codigo_publico) for m in activas]
    nombre, logo, slug = restaurante.nombre, restaurante.logo_url, restaurante.slug
    # La sesión se suelta antes de descargar el logo y maquetar: no retiene la conexión.
    await sesion.rollback()
    pdf = await qr_pdf.pdf_de_mesas(nombre, logo, tarjetas)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{qr_pdf.nombre_de_archivo(slug)}"',
            "Cache-Control": "private, no-store",
        },
    )
