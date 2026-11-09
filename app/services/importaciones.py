"""Importaciones del menú: subir, consultar, reintentar y confirmar (US-25, T-1.9). Sin FastAPI.

La extracción la hace `app.services.importacion_menu` (T-1.8) y la corre el procesador en
segundo plano (`app.services.procesador`); aquí vive lo que piden las rutas.

**Subir** (`crear_importacion`, AC-25.1). El tipo sale del contenido (firma), nunca del
nombre ni del `Content-Type` de la parte: PDF, JPEG o PNG; lo demás es 415. Se rechaza antes
del 202 todo lo que el servicio de extracción rechazaría: un PDF de más de 30 páginas es 413
y uno cifrado, ilegible o sin páginas, 422 (`ArchivoNoValido.motivo`). Una imagen que pase de
`LADO_MAXIMO` px de lado largo, de 5 MB (el límite de la API por imagen) o que venga girada
por EXIF se reescala con Pillow a ≤ 2576 px y se guarda como JPEG: es la resolución que
aprovecha el modelo, y así una foto de 20 MB cabe (AC-25.1). Más de 50 MP es 413 antes de
decodificar (el tope de `assets`); una imagen que no decodifica, 422. Pillow corre en un hilo
con el semáforo de las fotos (`assets`: el presupuesto de memoria es por proceso). Lo que se
guarda en el bucket privado (`importaciones/<restaurante>/<id>.<ext>`) es exactamente lo que
leerá el modelo; `archivo_url` lleva esa **clave**, no una URL. Primero el almacén y después
la fila: si la base fallara queda un archivo huérfano (inofensivo); al revés, el procesador
encontraría una importación sin archivo.

**Reintentar** sólo una importación `fallido` y con menos de `MAX_CORRIDAS` corridas
(`intentos`, `ck_importacion_intentos`): vuelve a `pendiente`. Si no, 409.

**Confirmar** (AC-25.3, INV-9): en una transacción, con la fila de la importación bloqueada
(`FOR UPDATE`: dos confirmaciones a la vez no crean dos menús; la segunda ve `confirmado` y
recibe 409). Sólo se confirma una importación `listo`. El cuerpo es el borrador revisado:
precios como en el alta de platillos (T-1.3), todos con precio, nombres de categoría sin
repetir en la importación y nombres de platillo sin repetir dentro de su categoría (422 con
el campo), a lo sumo `MAX_PLATILLOS_POR_CONFIRMACION` platillos. Cada categoría se crea al
final de las del restaurante, salvo que ya exista una **activa** con el mismo nombre
(`lower(btrim(nombre))`, como `uq_categoria_activa_por_nombre`): entonces sus platillos se
agregan al final de ésa. Los platillos salen con `imagen_tipo = 'ilustracion_categoria'` y la
`ilustracion_clave` de su categoría; los alérgenos y etiquetas sugeridos pasan a ser los del
platillo (el operador ya los revisó). `platillo` no tiene variantes (03 §2): se agregan como
una línea al final de la descripción («Chica $45 · Grande $65»), recortada a 1000 caracteres.
La importación guarda en `resultado` el borrador revisado (lo que entró al menú). Al final,
`menu.confirmar` (commit e invalidar la caché del menú).
"""

from __future__ import annotations

import asyncio
import io
import logging
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from PIL import Image, ImageOps
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errores import ErrorCarta, mensaje_por_http
from app.db.models import (
    CategoriaMenu,
    EstadoImportacion,
    ImportacionMenu,
    Platillo,
    TipoImagen,
)
from app.schemas.importacion import PlatilloImportado, ResultadoImportacion
from app.schemas.menu import _sin_claves_repetidas
from app.services import assets, menu, operadores
from app.services.assets import Almacen, ErrorAlmacen
from app.services.cache_menu import CacheMenu
from app.services.ilustraciones import clave_para_categoria
from app.services.importacion_menu import (
    MAXIMO_PAGINAS,
    TAMANO_MAXIMO_IMAGEN,
    TAMANO_MAXIMO_PDF,
    ArchivoNoValido,
    contar_paginas,
)

log = logging.getLogger("carta.importaciones")

MAX_BYTES = TAMANO_MAXIMO_PDF
"""AC-25.1: hasta 20 MB, PDF o imagen (la imagen se reescala antes de guardarla)."""

LADO_MAXIMO = 2576  # px de lado largo: la resolución que aprovecha el modelo
CALIDAD_JPEG = 85
MAX_CORRIDAS = 3  # `ck_importacion_intentos` (0–3): veces que el procesador la toma
MAX_PLATILLOS_POR_CONFIRMACION = 1000  # 30 páginas × ~30 platillos; el borrador admite más
MAX_DESCRIPCION = 1000  # como `Descripcion` del alta de platillos (T-1.3)
ORIENTACION_EXIF = 0x0112

MENSAJE_TIPO = "Sube tu carta en PDF, JPG o PNG."
MENSAJE_IMAGEN = "No pudimos leer la imagen; puede estar dañada. Prueba con otra foto o un PDF."
MENSAJE_PIXELES = "La imagen tiene demasiados píxeles; sube una foto de hasta 50 megapíxeles."
MENSAJE_ALMACEN = "No pudimos guardar tu carta en este momento. Inténtalo de nuevo."
MENSAJE_YA_CONFIRMADA = "Esta carta ya se confirmó; sus platillos ya están en tu menú."
MENSAJE_NO_LISTA = "Esta carta todavía no está lista para confirmar."
MENSAJE_NO_REINTENTABLE = "Sólo se puede reintentar una lectura que falló."
MENSAJE_SIN_CORRIDAS = (
    "Ya intentamos leer esta carta 3 veces. Sube otro archivo o captura el menú a mano."
)


# ---------------------------------------------------------------------------
# Archivo (síncrono; corre en un hilo)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ArchivoPreparado:
    """Lo que se guarda y leerá el modelo."""

    datos: bytes
    tipo_mime: str
    extension: str
    paginas: int


def _error_tipo() -> ErrorCarta:
    return ErrorCarta("TIPO_NO_SOPORTADO", MENSAJE_TIPO, 415)


def _error_imagen() -> ErrorCarta:
    return ErrorCarta("ARCHIVO_NO_VALIDO", MENSAJE_IMAGEN, 422)


def _error_pixeles() -> ErrorCarta:
    return ErrorCarta(
        "ARCHIVO_EXCEDE_LIMITE", MENSAJE_PIXELES, 413, {"max_pixeles": assets.MAX_PIXELES}
    )


def traducir_archivo_no_valido(error: ArchivoNoValido) -> ErrorCarta:
    """Tamaño o páginas → 413; contenido (vacío, firma, cifrado, ilegible) → 422."""
    if error.motivo == "paginas":
        return ErrorCarta("ARCHIVO_EXCEDE_LIMITE", str(error), 413, {"max_paginas": MAXIMO_PAGINAS})
    if error.motivo == "tamano":
        return ErrorCarta("ARCHIVO_EXCEDE_LIMITE", str(error), 413, {"max_bytes": MAX_BYTES})
    return ErrorCarta("ARCHIVO_NO_VALIDO", str(error), 422)


def _sobre_blanco(imagen: Image.Image) -> Image.Image:
    """RGB para el JPEG; la transparencia queda sobre blanco (papel)."""
    imagen = assets._a_rgb(imagen)
    if imagen.mode != "RGBA":
        return imagen
    fondo = Image.new("RGB", imagen.size, "white")
    fondo.paste(imagen, mask=imagen.getchannel("A"))
    return fondo


def _preparar_imagen(datos: bytes, formato: assets.Formato) -> ArchivoPreparado:
    try:
        with Image.open(io.BytesIO(datos), formats=[formato.pillow]) as imagen:
            ancho, alto = imagen.size
            if ancho * alto > assets.MAX_PIXELES:
                raise _error_pixeles()
            girada = imagen.getexif().get(ORIENTACION_EXIF, 1) not in (1, None)
            if max(ancho, alto) <= LADO_MAXIMO and len(datos) <= TAMANO_MAXIMO_IMAGEN:
                if not girada:
                    imagen.load()  # decodifica entera: una imagen rota es 422 antes del 202
                    return ArchivoPreparado(datos, formato.tipo_mime, formato.extension, 1)
            if formato is assets.JPEG:
                imagen.draft("RGB", (LADO_MAXIMO, LADO_MAXIMO))
            imagen.load()
            pequena = assets._reducir_en_sitio(imagen, LADO_MAXIMO)
            derecha = ImageOps.exif_transpose(pequena)
            salida = io.BytesIO()
            _sobre_blanco(derecha).save(salida, "JPEG", quality=CALIDAD_JPEG, optimize=True)
    except ErrorCarta:
        raise
    except (Image.DecompressionBombError, Image.DecompressionBombWarning) as error:
        raise _error_pixeles() from error
    except Exception as error:  # truncada, basura tras la firma, perfil roto…
        log.info("importacion: imagen ilegible (%s)", type(error).__name__)
        raise _error_imagen() from error
    jpeg = salida.getvalue()
    if len(jpeg) > TAMANO_MAXIMO_IMAGEN:  # pragma: no cover - 2576² en JPEG 85 ronda 2 MB
        raise _error_imagen()
    return ArchivoPreparado(jpeg, assets.JPEG.tipo_mime, assets.JPEG.extension, 1)


def preparar_archivo(datos: bytes) -> ArchivoPreparado:
    """Valida por contenido y deja el archivo listo para el modelo. Lanza `ErrorCarta`
    413/415/422. Síncrona: pypdf y Pillow corren en un hilo."""
    if len(datos) > MAX_BYTES:
        raise ErrorCarta(
            "ARCHIVO_EXCEDE_LIMITE",
            "Tu carta pasa de 20 MB; súbela más ligera.",
            413,
            {"max_bytes": MAX_BYTES},
        )
    if datos.startswith(b"%PDF-"):
        try:
            paginas = contar_paginas(datos)
        except ArchivoNoValido as error:
            raise traducir_archivo_no_valido(error) from error
        return ArchivoPreparado(datos, "application/pdf", "pdf", paginas)
    formato = assets.formato_por_firma(datos)
    if formato not in (assets.JPEG, assets.PNG):  # HEIC no: la API no lo lee
        raise _error_tipo()
    assert formato is not None
    return _preparar_imagen(datos, formato)


async def _preparar_en_cola(datos: bytes) -> ArchivoPreparado:
    """En un hilo. Las imágenes comparten el semáforo de las fotos (`assets`): el presupuesto
    de memoria de Pillow es por proceso; quien espera más de `PLAZO_COLA_SEGUNDOS`, 503."""
    if datos.startswith(b"%PDF-"):
        return await asyncio.to_thread(preparar_archivo, datos)
    try:
        async with asyncio.timeout(assets.PLAZO_COLA_SEGUNDOS):
            await assets._semaforo.acquire()
    except TimeoutError as error:
        raise ErrorCarta("SERVICIO_OCUPADO", assets.MENSAJE_OCUPADO, 503) from error
    try:
        return await asyncio.to_thread(preparar_archivo, datos)
    finally:
        assets._semaforo.release()


# ---------------------------------------------------------------------------
# Subir, consultar y reintentar
# ---------------------------------------------------------------------------


def _no_encontrada() -> ErrorCarta:
    return ErrorCarta("RECURSO_NO_ENCONTRADO", mensaje_por_http(404), 404)


def clave_del_archivo(restaurante_id: UUID, importacion_id: UUID, extension: str) -> str:
    return f"importaciones/{restaurante_id}/{importacion_id}.{extension}"


async def crear_importacion(
    sesion: AsyncSession,
    usuario_id: UUID,
    restaurante_id: UUID,
    datos: bytes,
    almacen: Almacen,
) -> ImportacionMenu:
    """Valida, guarda el archivo y crea la importación `pendiente` (AC-25.1).

    Llega **sin conexión retenida** (la ruta soltó la sesión antes de leer el cuerpo): la
    validación y el almacén corren sin ella y sólo al final se vuelve a comprobar que el
    restaurante siga siendo del operador (404 si no) y se escribe la fila."""
    archivo = await _preparar_en_cola(datos)
    importacion_id = uuid4()
    clave = clave_del_archivo(restaurante_id, importacion_id, archivo.extension)
    try:
        async with asyncio.timeout(assets.PLAZO_ALMACEN_SEGUNDOS):
            await almacen.guardar_privado(clave, archivo.datos, archivo.tipo_mime)
    except (ErrorAlmacen, TimeoutError) as error:
        log.error("importacion: no se pudo guardar el archivo: %s", type(error).__name__)
        raise ErrorCarta("ALMACEN_NO_DISPONIBLE", MENSAJE_ALMACEN, 503) from error
    if await operadores.restaurante_del_usuario(sesion, usuario_id, restaurante_id) is None:
        raise _no_encontrada()
    importacion = ImportacionMenu(
        id=importacion_id,
        restaurante_id=restaurante_id,
        solicitado_por=usuario_id,
        archivo_url=clave,
        archivo_tipo=archivo.tipo_mime,
        paginas=archivo.paginas,
        estado=EstadoImportacion.pendiente,
    )
    sesion.add(importacion)
    await sesion.commit()
    await sesion.refresh(importacion)
    log.info(
        "importacion: creada %s (%s, %d páginas, %d bytes)",
        importacion.id,
        archivo.tipo_mime,
        archivo.paginas,
        len(archivo.datos),
    )
    return importacion


async def obtener(
    sesion: AsyncSession, restaurante_id: UUID, importacion_id: UUID, *, bloquear: bool = False
) -> ImportacionMenu:
    """La importación si es de ese restaurante; 404 idéntico si no existe o es ajena."""
    consulta = select(ImportacionMenu).where(
        ImportacionMenu.id == importacion_id, ImportacionMenu.restaurante_id == restaurante_id
    )
    if bloquear:
        consulta = consulta.with_for_update().execution_options(populate_existing=True)
    importacion = await sesion.scalar(consulta)
    if importacion is None:
        raise _no_encontrada()
    return importacion


async def reintentar(
    sesion: AsyncSession, restaurante_id: UUID, importacion_id: UUID
) -> ImportacionMenu:
    """`fallido` → `pendiente` (AC-25.4). 409 si no falló o ya agotó sus corridas."""
    importacion = await obtener(sesion, restaurante_id, importacion_id, bloquear=True)
    if importacion.estado is not EstadoImportacion.fallido:
        await sesion.rollback()
        raise ErrorCarta("IMPORTACION_NO_REINTENTABLE", MENSAJE_NO_REINTENTABLE, 409)
    if importacion.intentos >= MAX_CORRIDAS:
        await sesion.rollback()
        raise ErrorCarta(
            "IMPORTACION_SIN_REINTENTOS", MENSAJE_SIN_CORRIDAS, 409, {"intentos": MAX_CORRIDAS}
        )
    importacion.estado = EstadoImportacion.pendiente
    importacion.error_mensaje = None
    importacion.resultado = None
    importacion.iniciado_en = None
    importacion.finalizado_en = None
    await sesion.commit()
    await sesion.refresh(importacion)
    return importacion


# ---------------------------------------------------------------------------
# Confirmar
# ---------------------------------------------------------------------------


def _invalido(campo: str, mensaje: str, tipo: str) -> ErrorCarta:
    return ErrorCarta(
        "PAYLOAD_INVALIDO",
        mensaje,
        422,
        {"errores": [{"campo": campo, "mensaje": mensaje, "tipo": tipo}]},
    )


def _llave_nombre(nombre: str) -> str:
    """«  Tacos  al Pastor» y «tacos al pastor» son el mismo nombre."""
    return " ".join(nombre.split()).casefold()


def validar_revisado(revisado: ResultadoImportacion) -> None:
    """Lo que el esquema no puede decir: precio presente, nombres sin repetir, tope total.
    El primer problema sale como 422 con el campo (`body.categorias.<i>…`)."""
    total = sum(len(c.platillos) for c in revisado.categorias)
    if total == 0:
        raise _invalido(
            "body.categorias", "El borrador no tiene ningún platillo que confirmar.", "vacio"
        )
    if total > MAX_PLATILLOS_POR_CONFIRMACION:
        raise _invalido(
            "body.categorias",
            f"Se pueden confirmar hasta {MAX_PLATILLOS_POR_CONFIRMACION} platillos a la vez; "
            "confirma la carta en partes.",
            "demasiados_platillos",
        )
    categorias_vistas: set[str] = set()
    for i, categoria in enumerate(revisado.categorias):
        llave = _llave_nombre(categoria.nombre)
        if llave in categorias_vistas:
            raise _invalido(
                f"body.categorias.{i}.nombre",
                f"La categoría «{categoria.nombre}» está repetida; únelas o cambia el nombre.",
                "nombre_repetido",
            )
        categorias_vistas.add(llave)
        platillos_vistos: set[str] = set()
        for j, platillo in enumerate(categoria.platillos):
            base = f"body.categorias.{i}.platillos.{j}"
            if platillo.precio is None:
                raise _invalido(
                    f"{base}.precio",
                    f"Falta el precio de «{platillo.nombre}».",
                    "precio_requerido",
                )
            llave = _llave_nombre(platillo.nombre)
            if llave in platillos_vistos:
                raise _invalido(
                    f"{base}.nombre",
                    f"«{platillo.nombre}» está repetido en «{categoria.nombre}».",
                    "nombre_repetido",
                )
            platillos_vistos.add(llave)


def _precio_texto(precio: Decimal) -> str:
    entero = precio == precio.to_integral_value()
    return f"${precio:,.0f}" if entero else f"${precio:,.2f}"


def descripcion_con_variantes(platillo: PlatilloImportado) -> str | None:
    """La descripción y, en otra línea, las variantes («Chica $45 · Grande $65»)."""
    texto = platillo.descripcion or ""
    if platillo.variantes:
        linea = " · ".join(f"{v.nombre} {_precio_texto(v.precio)}" for v in platillo.variantes)
        texto = f"{texto}\n{linea}" if texto else linea
    if len(texto) > MAX_DESCRIPCION:
        texto = texto[: MAX_DESCRIPCION - 1].rstrip() + "…"
    return texto or None


async def _categorias_activas(
    sesion: AsyncSession, restaurante_id: UUID, nombres: Sequence[str]
) -> dict[str, CategoriaMenu]:
    """Las categorías activas del restaurante con esos nombres, por `lower(btrim(nombre))`."""
    llaves = {nombre.strip().lower() for nombre in nombres}
    filas = await sesion.scalars(
        select(CategoriaMenu).where(
            CategoriaMenu.restaurante_id == restaurante_id,
            CategoriaMenu.activa.is_(True),
            func.lower(func.btrim(CategoriaMenu.nombre)).in_(llaves),
        )
    )
    return {fila.nombre.strip().lower(): fila for fila in filas}


async def _siguiente_orden(sesion: AsyncSession, consulta: Any) -> int:
    ultimo = await sesion.scalar(consulta)
    return int(ultimo or 0) + 1


async def confirmar(
    sesion: AsyncSession,
    restaurante_id: UUID,
    importacion_id: UUID,
    revisado: ResultadoImportacion,
    cache: CacheMenu | None = None,
    ahora: datetime | None = None,
) -> ImportacionMenu:
    """Crea categorías y platillos del borrador revisado en una transacción (AC-25.3)."""
    importacion = await obtener(sesion, restaurante_id, importacion_id, bloquear=True)
    if importacion.estado is EstadoImportacion.confirmado:
        await sesion.rollback()
        raise ErrorCarta("IMPORTACION_YA_CONFIRMADA", MENSAJE_YA_CONFIRMADA, 409)
    if importacion.estado is not EstadoImportacion.listo:
        estado = importacion.estado.value  # antes del `rollback()`, que lo expira
        await sesion.rollback()
        raise ErrorCarta("IMPORTACION_NO_LISTA", MENSAJE_NO_LISTA, 409, {"estado": estado})
    try:
        validar_revisado(revisado)
    except ErrorCarta:
        await sesion.rollback()
        raise

    existentes = await _categorias_activas(
        sesion, restaurante_id, [c.nombre for c in revisado.categorias]
    )
    orden_categoria = await _siguiente_orden(
        sesion,
        select(func.max(CategoriaMenu.orden)).where(CategoriaMenu.restaurante_id == restaurante_id),
    )
    # Orden de la carta: por `orden` y, a igual `orden`, como vinieron.
    ordenadas = sorted(enumerate(revisado.categorias), key=lambda par: (par[1].orden, par[0]))
    for _, importada in ordenadas:
        categoria = existentes.get(importada.nombre.strip().lower())
        if categoria is None:
            categoria = CategoriaMenu(
                restaurante_id=restaurante_id, nombre=importada.nombre, orden=orden_categoria
            )
            orden_categoria += 1
            sesion.add(categoria)
            await sesion.flush()
            orden_platillo = 1
        else:
            orden_platillo = await _siguiente_orden(
                sesion,
                select(func.max(Platillo.orden)).where(Platillo.categoria_id == categoria.id),
            )
        ilustracion = clave_para_categoria(categoria.nombre)
        for platillo in importada.platillos:
            assert platillo.precio is not None  # `validar_revisado`
            sesion.add(
                Platillo(
                    restaurante_id=restaurante_id,
                    categoria_id=categoria.id,
                    nombre=platillo.nombre,
                    descripcion=descripcion_con_variantes(platillo),
                    precio=platillo.precio,
                    imagen_tipo=TipoImagen.ilustracion_categoria,
                    ilustracion_clave=ilustracion,
                    alergenos=_sin_claves_repetidas(list(platillo.alergenos_sugeridos)),
                    etiquetas=_sin_claves_repetidas(list(platillo.etiquetas_sugeridas)),
                    orden=orden_platillo,
                )
            )
            orden_platillo += 1

    importacion.estado = EstadoImportacion.confirmado
    importacion.confirmado_en = ahora or datetime.now(UTC)
    importacion.resultado = revisado.model_dump(mode="json")
    await menu.confirmar(sesion, restaurante_id, cache)
    await sesion.refresh(importacion)
    log.info(
        "importacion: confirmada %s (%d categorías, %d platillos)",
        importacion.id,
        len(revisado.categorias),
        sum(len(c.platillos) for c in revisado.categorias),
    )
    return importacion
