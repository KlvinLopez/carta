"""Foto del platillo (02 §5.3, US-17, AC-17.1 a AC-17.3; T-1.4).

`POST /platillos/{platillo_id}/foto` (`multipart/form-data`, un solo campo `archivo`) y
`DELETE /platillos/{platillo_id}/foto`. El platillo sale de `platillo_del_operador` (ajeno =
inexistente = 404, AC-15.3); el trabajo lo hace `app.services.assets`.

**El cuerpo no se lee hasta después del 401 y del 404.** Si la ruta declarara
`archivo: UploadFile = File(...)`, FastAPI leería y guardaría en disco el multipart entero
antes de resolver las dependencias (revisión de T-1.1, C4). Aquí la ruta recibe `Request` y
lee el cuerpo ella misma, con dos topes:

1. `Content-Length` declarado mayor que `MAX_CUERPO` → 413 **sin leer nada** (dependencia
   `limite_por_cabecera`, antes de `platillo_del_operador`).
2. Al leer en *streaming*, se cuentan los bytes que llegan: un cliente sin `Content-Length`
   (*chunked*) o con uno mentiroso se corta en cuanto pasa `MAX_CUERPO` (413). El servidor
   (uvicorn) ya no entrega más bytes de los declarados; esto cubre lo demás.

**La conexión a la base se suelta antes de leer** (revisión A2): resueltos el 401 y el 404,
la ruta cierra la sesión (la conexión vuelve al pool) y sólo `assets.poner_foto` vuelve a
tomar una al final, para escribir. Con la sesión abierta, 20 subidas lentas dejaban el pool
entero en `idle in transaction` y toda la API caía. Además la lectura entera tiene un plazo
(`PLAZO_SUBIDA_SEGUNDOS`, 408 `SUBIDA_INCOMPLETA`) y un cliente que se va a medias es 400.

`MAX_CUERPO` = 15 MB del archivo + 64 KB para el marco del multipart; después, el archivo en
sí se mide contra los 15 MB exactos (`assets.MAX_BYTES`). Un campo que no sea `archivo` es
422 (como `extra="forbid"` en los cuerpos JSON, revisión de T-1.2, B2); un multipart roto,
400 (04_API_Spec §1.2).
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncGenerator
from typing import Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.datastructures import UploadFile
from starlette.formparsers import MultiPartException, MultiPartParser
from starlette.requests import ClientDisconnect

from app.api.admin.dependencias import operador_actual, platillo_del_operador
from app.core.errores import ErrorCarta
from app.db import Platillo, Usuario, get_db_session
from app.schemas.comun import errores
from app.schemas.menu import PlatilloRespuesta
from app.services import assets
from app.services.assets import Almacen, obtener_almacen

log = logging.getLogger("carta.fotos")

router = APIRouter()

CAMPO = "archivo"
MARGEN_MULTIPART = 64 * 1024
MAX_CUERPO = assets.MAX_BYTES + MARGEN_MULTIPART
PLAZO_SUBIDA_SEGUNDOS = 60.0  # 15 MB en 60 s = 2 Mbit/s; un 4G malo que tarde más, reintenta

MENSAJE_TAMANO = "La foto pasa de 15 MB; súbela más pequeña."
MENSAJE_CAMPO = "Envía la foto como multipart/form-data en el campo `archivo`."


def _demasiado_grande() -> ErrorCarta:
    return ErrorCarta("ARCHIVO_EXCEDE_LIMITE", MENSAJE_TAMANO, 413, {"max_bytes": assets.MAX_BYTES})


def _campo_invalido(mensaje: str = MENSAJE_CAMPO, tipo: str = "archivo_requerido") -> ErrorCarta:
    return ErrorCarta(
        "PAYLOAD_INVALIDO",
        mensaje,
        422,
        {"errores": [{"campo": f"body.{CAMPO}", "mensaje": mensaje, "tipo": tipo}]},
    )


async def limite_por_cabecera(request: Request) -> None:
    """413 por `Content-Length` antes de leer un solo byte del cuerpo."""
    declarado = request.headers.get("content-length")
    if declarado is None:
        return  # *chunked*: lo corta la lectura (`_con_tope`)
    if not declarado.strip().isdigit():
        raise ErrorCarta("PAYLOAD_INVALIDO", "Content-Length inválido.", 400)
    if int(declarado) > MAX_CUERPO:
        raise _demasiado_grande()


async def _con_tope(request: Request) -> AsyncGenerator[bytes, None]:
    leidos = 0
    async for trozo in request.stream():
        leidos += len(trozo)
        if leidos > MAX_CUERPO:
            raise _demasiado_grande()
        yield trozo


async def leer_archivo(request: Request) -> bytes:
    """Los bytes del único campo `archivo` del multipart, con los topes del docstring."""
    tipo = request.headers.get("content-type", "")
    if not tipo.lower().startswith("multipart/form-data"):
        raise _campo_invalido()
    parser = MultiPartParser(request.headers, _con_tope(request), max_files=1, max_fields=0)
    try:
        async with asyncio.timeout(PLAZO_SUBIDA_SEGUNDOS):
            formulario = await parser.parse()
    except TimeoutError as error:
        raise ErrorCarta(
            "SUBIDA_INCOMPLETA", "La subida tardó demasiado; inténtalo de nuevo.", 408
        ) from error
    except ClientDisconnect as error:
        log.info("el cliente cortó la subida")
        raise ErrorCarta("PAYLOAD_INVALIDO", "La subida se interrumpió.", 400) from error
    except MultiPartException as error:
        if "Too many" in error.message:  # otro campo además de `archivo`
            raise _campo_invalido(
                "Sólo se acepta el campo `archivo`.", "campo_no_permitido"
            ) from error
        raise ErrorCarta("PAYLOAD_INVALIDO", "El multipart está mal formado.", 400) from error
    try:
        claves = list(formulario.keys())
        archivo = formulario.get(CAMPO)
        if any(clave != CAMPO for clave in claves):
            raise _campo_invalido("Sólo se acepta el campo `archivo`.", "campo_no_permitido")
        if not isinstance(archivo, UploadFile):
            raise _campo_invalido()
        datos = await archivo.read(assets.MAX_BYTES + 1)
    finally:
        await formulario.close()
    if len(datos) > assets.MAX_BYTES:
        raise _demasiado_grande()
    if not datos:
        raise _campo_invalido("El archivo está vacío.", "archivo_vacio")
    return datos


CUERPO_MULTIPART: dict[str, Any] = {
    "requestBody": {
        "required": True,
        "content": {
            "multipart/form-data": {
                "schema": {
                    "type": "object",
                    "title": "FotoPlatillo",
                    "required": [CAMPO],
                    "properties": {
                        CAMPO: {
                            "type": "string",
                            "format": "binary",
                            "description": "JPG, PNG o HEIC de hasta 15 MB (se valida el contenido).",
                        }
                    },
                    "additionalProperties": False,
                }
            }
        },
    }
}


@router.post(
    "/platillos/{platillo_id}/foto",
    response_model=PlatilloRespuesta,
    dependencies=[Depends(limite_por_cabecera)],
    responses=errores(400, 408, 413, 415, 503),
    openapi_extra=CUERPO_MULTIPART,
)
async def subir_foto(
    request: Request,
    usuario: Usuario = Depends(operador_actual),
    platillo: Platillo = Depends(platillo_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
    almacen: Almacen = Depends(obtener_almacen),
) -> Platillo:
    """Valida por contenido, genera miniatura (400 px) y detalle (1200 px) en WebP, guarda
    el original en el bucket privado y deja `imagen_tipo = 'foto'` (AC-17.1, AC-17.2)."""
    usuario_id, platillo_id, restaurante_id = usuario.id, platillo.id, platillo.restaurante_id
    await sesion.close()  # la conexión vuelve al pool mientras llega el cuerpo (A2)
    datos = await leer_archivo(request)
    return await assets.poner_foto(sesion, usuario_id, platillo_id, restaurante_id, datos, almacen)


@router.delete("/platillos/{platillo_id}/foto", response_model=PlatilloRespuesta)
async def quitar_foto(
    platillo: Platillo = Depends(platillo_del_operador),
    sesion: AsyncSession = Depends(get_db_session),
) -> Platillo:
    """Vuelve a la ilustración de la categoría; los archivos se conservan."""
    return await assets.quitar_foto(sesion, platillo)
