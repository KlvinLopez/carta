"""Importación del menú desde un PDF o una foto (02 §5.3 y §7, US-25, AC-25.1 a AC-25.4; T-1.9).

- `POST /restaurantes/{rid}/importaciones` (multipart, un campo `archivo`): 202 con la
  importación `pendiente`. 401 y 404 **antes de leer el cuerpo**; sin llave de la API, 503
  `IMPORTACION_NO_DISPONIBLE` sin crear nada; la sesión se suelta antes de leer el cuerpo
  (`app.api.admin.subidas`). El trabajo lo hace `app.services.importaciones`.
- `GET …/importaciones/{importacion_id}`: el estado, para el sondeo cada 3 s del asistente.
- `POST …/confirmar` con el borrador revisado: crea el menú (AC-25.3, INV-9); 409 si ya se
  confirmó o no está `listo`.
- `POST …/reintentar`: una importación `fallido` vuelve a la cola (AC-25.4); 409 si no.

Una importación de otro restaurante es 404 idéntico a una inexistente (AC-15.3).
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.admin import subidas
from app.api.admin.dependencias import operador_actual, restaurante_del_operador
from app.core.errores import ErrorCarta
from app.db import ImportacionMenu, Restaurante, Usuario, get_db_session
from app.schemas.comun import errores
from app.schemas.importacion import ImportacionRespuesta, ResultadoImportacion
from app.services import importaciones, procesador
from app.services.assets import Almacen, obtener_almacen
from app.services.importacion_menu import MENSAJE_NO_DISPONIBLE, importacion_disponible

router = APIRouter()

PLAZO_SUBIDA_SEGUNDOS = 60.0  # 20 MB en 60 s ≈ 2,8 Mbit/s

LIMITES = subidas.Limites(
    max_archivo=importaciones.MAX_BYTES,
    mensaje_tamano="Tu carta pasa de 20 MB; súbela más ligera.",
    mensaje_campo="Envía tu carta como multipart/form-data en el campo `archivo`.",
)
limite_por_cabecera = subidas.limite_por_cabecera(LIMITES)


def _exigir_disponible() -> None:
    """Sin `ANTHROPIC_API_KEY` no es culpa del operador: 503 y nada se crea."""
    if not importacion_disponible():
        raise ErrorCarta("IMPORTACION_NO_DISPONIBLE", MENSAJE_NO_DISPONIBLE, 503)


async def importacion_del_operador(
    importacion_id: UUID,
    restaurante: Restaurante = Depends(restaurante_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> ImportacionMenu:
    return await importaciones.obtener(sesion, restaurante.id, importacion_id)


@router.post(
    "/restaurantes/{rid}/importaciones",
    response_model=ImportacionRespuesta,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(limite_por_cabecera)],
    responses=errores(400, 408, 413, 415, 503),
    openapi_extra=subidas.cuerpo_multipart(
        "CartaImportada", "PDF (hasta 30 páginas), JPG o PNG de hasta 20 MB."
    ),
)
async def crear_importacion(
    request: Request,
    usuario: Usuario = Depends(operador_actual),
    restaurante: Restaurante = Depends(restaurante_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
    almacen: Almacen = Depends(obtener_almacen),
) -> ImportacionMenu:
    """Valida el archivo por su contenido, lo guarda en el bucket privado y crea la
    importación `pendiente` (AC-25.1). La lectura corre en segundo plano."""
    _exigir_disponible()
    usuario_id, restaurante_id = usuario.id, restaurante.id
    await sesion.close()  # la conexión vuelve al pool mientras llega el cuerpo
    datos = await subidas.leer_archivo(request, LIMITES, PLAZO_SUBIDA_SEGUNDOS)
    importacion = await importaciones.crear_importacion(
        sesion, usuario_id, restaurante_id, datos, almacen
    )
    procesador.despertar()
    return importacion


@router.get(
    "/restaurantes/{rid}/importaciones/{importacion_id}", response_model=ImportacionRespuesta
)
async def consultar_importacion(
    importacion: ImportacionMenu = Depends(importacion_del_operador),
) -> ImportacionMenu:
    return importacion


@router.post(
    "/restaurantes/{rid}/importaciones/{importacion_id}/confirmar",
    response_model=ImportacionRespuesta,
    responses=errores(409),
)
async def confirmar_importacion(
    revisado: ResultadoImportacion,
    importacion: ImportacionMenu = Depends(importacion_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> ImportacionMenu:
    """Crea las categorías y los platillos del borrador revisado (AC-25.3, INV-9)."""
    return await importaciones.confirmar(
        sesion, importacion.restaurante_id, importacion.id, revisado
    )


@router.post(
    "/restaurantes/{rid}/importaciones/{importacion_id}/reintentar",
    response_model=ImportacionRespuesta,
    status_code=status.HTTP_202_ACCEPTED,
    responses=errores(409, 503),
)
async def reintentar_importacion(
    importacion: ImportacionMenu = Depends(importacion_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> ImportacionMenu:
    _exigir_disponible()
    resultado = await importaciones.reintentar(sesion, importacion.restaurante_id, importacion.id)
    procesador.despertar()
    return resultado
