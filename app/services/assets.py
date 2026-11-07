"""Fotos de platillos y almacén de archivos (US-17, AC-17.1 a AC-17.3, 02 §4 y §8; T-1.4).

Sin FastAPI (regla dura 2): la ruta (`app.api.admin.fotos`) lee el multipart con su límite y
llama a `poner_foto` / `quitar_foto` con el platillo ya validado contra el operador.

**Almacén** (`Almacen`): dos buckets, ambos por protocolo S3 (ADR-012; ningún SDK propio de
Cloudflare, `boto3` es sólo el cliente del protocolo):

- **público** (`R2_BUCKET_PUBLICO`, servido por Cloudflare en `R2_URL_PUBLICA`): las variantes
  WebP, con nombre por hash de su contenido y `Cache-Control: public, max-age=31536000,
  immutable` (02 §4). Una foto nueva nunca pisa una URL vieja.
- **privado** (`R2_BUCKET_PRIVADO`): el original tal como llegó (AC-17.2, «conservar el
  original»), bajo `originales/<restaurante>/<platillo>/<sha256>.<ext>`.

`AlmacenLocal` escribe lo mismo en `ALMACEN_LOCAL_RUTA/{publico,privado}/` (sólo desarrollo y
pruebas: `Settings` exige R2 fuera de ahí). `obtener_almacen()` da el de `Settings`; las
pruebas lo sustituyen con `app.dependency_overrides`.

**Validación por contenido** (AC-17.1, AC-17.3): la extensión, el nombre y el `Content-Type`
del cliente no cuentan. El tipo sale de la firma (*magic bytes*: JPEG `FF D8 FF`, PNG
`89 50 4E 47 0D 0A 1A 0A`, HEIC `ftyp` + marca HEIF) y Pillow abre el archivo **sólo** con
el decodificador de ese tipo; cualquier otra cosa (un PDF renombrado `.jpg`, un GIF, un
WebP) es 415 `TIPO_NO_SOPORTADO`. Una firma buena con contenido roto es 422
`IMAGEN_NO_VALIDA`. Más de `MAX_PIXELES` (bomba de descompresión: pocos KB que se abren en
gigapíxeles) es 413 antes de decodificar. Nada se sube al almacén hasta que la imagen se
decodificó entera (AC-17.3: «no almacenarlo»).

**Procesado** fuera del bucle de eventos (`asyncio.to_thread`) y con un semáforo de
`PROCESOS_SIMULTANEOS`: un HEIC de 48 MP ocupa ~150 MB decodificado; sin tope, diez subidas
a la vez tumbarían el contenedor. El JPEG se decodifica ya reducido (`draft`). Orientación
EXIF aplicada; las variantes salen sin EXIF (ni GPS ni modelo de cámara).

**Quitar la foto** (`DELETE`) vuelve a `ilustracion_categoria` y vacía las URL del platillo,
pero **no borra** ningún archivo: el original se conserva en el bucket privado (03 §7:
«vida del platillo + 6 meses», lo borra la limpieza de retención, no la API) y las variantes
públicas siguen sirviendo a quien tenga el menú en caché (≤ 60 s en el borde). La regla dura
9 es de filas con historial, no de archivos; esto es lo mismo por prudencia.

Toda escritura del platillo invalida la caché del menú (`menu.confirmar`, como en T-1.3).
"""

from __future__ import annotations

import asyncio
import hashlib
import io
import logging
import math
import os
import re
import tempfile
import warnings
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import boto3
import pillow_heif
from botocore.config import Config
from PIL import Image, ImageOps
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, settings
from app.core.errores import ErrorCarta
from app.db.models import Platillo, TipoImagen
from app.services import menu
from app.services.cache_menu import CacheMenu
from app.services.ilustraciones import clave_para_categoria

log = logging.getLogger("carta.assets")

pillow_heif.register_heif_opener()

# ---------------------------------------------------------------------------
# Límites
# ---------------------------------------------------------------------------

MAX_BYTES = 15 * 1024 * 1024
"""AC-17.1: hasta 15 MB por archivo."""

MAX_PIXELES = 50_000_000
"""Un teléfono de 48 MP (8064 × 6048 ≈ 48.8 MP) cabe; una bomba de descompresión, no."""

# Pillow avisa por encima de `MAX_IMAGE_PIXELS` y falla por encima del doble. Se acota para
# todo el proceso (el valor por defecto, ~89 MP, deja pasar ~179 MP antes de fallar); la
# comprobación propia de `procesar_foto` corta antes, en `MAX_PIXELES`.
Image.MAX_IMAGE_PIXELS = MAX_PIXELES
# Y el aviso pasa a error: así una imagen sobre el tope nunca llega a decodificarse, aunque
# alguien abra una con Pillow fuera de `procesar_foto`.
warnings.filterwarnings("error", category=Image.DecompressionBombWarning)

PROCESOS_SIMULTANEOS = 2
TAMANOS = {"miniatura": 400, "detalle": 1200}  # lado largo, en px (AC-17.2)
CALIDAD_WEBP = 82
CACHE_INMUTABLE = "public, max-age=31536000, immutable"
PLAZO_SONDA_SEGUNDOS = 3.0  # `/ready`: HEAD al bucket

MENSAJE_TIPO = "Sube una foto JPG, PNG o HEIC."
MENSAJE_INVALIDA = "No pudimos leer la imagen; puede estar dañada. Prueba con otra foto."
MENSAJE_PIXELES = "La imagen tiene demasiados píxeles; sube una foto de hasta 50 megapíxeles."
MENSAJE_ALMACEN = "No pudimos guardar la foto en este momento. Inténtalo de nuevo."

# ---------------------------------------------------------------------------
# Tipo por contenido
# ---------------------------------------------------------------------------

# Marcas ISO-BMFF de HEIF/HEIC (las de una foto de iPhone son `heic` y `mif1`). AVIF (`avif`)
# es otro formato y no entra.
MARCAS_HEIF = frozenset({b"heic", b"heix", b"hevc", b"hevx", b"heim", b"heis", b"mif1", b"msf1"})


@dataclass(frozen=True)
class Formato:
    pillow: str  # el único decodificador con el que se abre
    extension: str
    tipo_mime: str


JPEG = Formato("JPEG", "jpg", "image/jpeg")
PNG = Formato("PNG", "png", "image/png")
HEIF = Formato("HEIF", "heic", "image/heic")


def formato_por_firma(datos: bytes) -> Formato | None:
    """El formato que dicen los primeros bytes, o `None` si no es JPEG, PNG ni HEIC."""
    if datos.startswith(b"\xff\xd8\xff"):
        return JPEG
    if datos.startswith(b"\x89PNG\r\n\x1a\n"):
        return PNG
    if len(datos) >= 12 and datos[4:8] == b"ftyp" and datos[8:12] in MARCAS_HEIF:
        return HEIF
    return None


# ---------------------------------------------------------------------------
# Procesado (síncrono; corre en un hilo)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Variante:
    nombre: str  # "miniatura" | "detalle"
    datos: bytes
    ancho: int
    alto: int

    @property
    def huella(self) -> str:
        return hashlib.sha256(self.datos).hexdigest()


@dataclass(frozen=True)
class FotoProcesada:
    formato: Formato
    ancho: int
    alto: int
    huella_original: str
    variantes: tuple[Variante, ...]


def _error_tipo() -> ErrorCarta:
    return ErrorCarta("TIPO_NO_SOPORTADO", MENSAJE_TIPO, 415)


def _error_invalida() -> ErrorCarta:
    return ErrorCarta("IMAGEN_NO_VALIDA", MENSAJE_INVALIDA, 422)


def _error_pixeles() -> ErrorCarta:
    return ErrorCarta("ARCHIVO_EXCEDE_LIMITE", MENSAJE_PIXELES, 413, {"max_pixeles": MAX_PIXELES})


def _a_rgb(imagen: Image.Image) -> Image.Image:
    """RGB, o RGBA si la imagen trae transparencia (WebP la conserva)."""
    if imagen.mode in ("RGB", "RGBA"):
        return imagen
    if imagen.mode in ("LA", "PA") or (imagen.mode == "P" and "transparency" in imagen.info):
        return imagen.convert("RGBA")
    if imagen.mode in ("I;16", "I;16B", "I;16L", "I"):
        # PNG de 16 bits en gris: a 8 bits sin saturar a blanco.
        return imagen.point(lambda v: v / 256).convert("L").convert("RGB")
    return imagen.convert("RGB")


def _variante(imagen: Image.Image, nombre: str, lado: int) -> Variante:
    copia = imagen.copy()
    copia.thumbnail((lado, lado), Image.Resampling.LANCZOS)  # nunca agranda
    salida = io.BytesIO()
    # `exif=b""` y sin `xmp`: las variantes públicas no llevan metadatos de la cámara.
    copia.save(salida, "WEBP", quality=CALIDAD_WEBP, method=4, exif=b"")
    return Variante(nombre, salida.getvalue(), copia.width, copia.height)


def procesar_foto(datos: bytes) -> FotoProcesada:
    """Valida por contenido y genera las variantes WebP. Lanza `ErrorCarta` 413/415/422.

    Síncrona y pesada: llámala con `asyncio.to_thread` (lo hace `poner_foto`)."""
    if len(datos) > MAX_BYTES:
        raise ErrorCarta("ARCHIVO_EXCEDE_LIMITE", "El archivo pasa de 15 MB.", 413)
    formato = formato_por_firma(datos)
    if formato is None:
        raise _error_tipo()
    try:
        with Image.open(io.BytesIO(datos), formats=[formato.pillow]) as imagen:
            if imagen.width < 1 or imagen.height < 1:
                raise _error_invalida()
            if imagen.width * imagen.height > MAX_PIXELES:
                raise _error_pixeles()
            ancho, alto = imagen.size
            lado = TAMANOS["detalle"]
            if formato is JPEG and max(ancho, alto) > lado:
                # Decodifica ya reducido (1/2, 1/4, 1/8) si sobra para el detalle: menos
                # memoria y tiempo. `draft` nunca baja de la caja pedida, que es la del
                # detalle con la proporción de la foto (una caja cuadrada no reduciría nada
                # en una foto apaisada).
                escala = lado / max(ancho, alto)
                imagen.draft("RGB", (math.ceil(ancho * escala), math.ceil(alto * escala)))
            imagen.load()
            orientada = ImageOps.exif_transpose(imagen)
            lista = _a_rgb(orientada)
    except ErrorCarta:
        raise
    except (Image.DecompressionBombError, Image.DecompressionBombWarning) as error:
        raise _error_pixeles() from error
    except Image.UnidentifiedImageError as error:
        # La firma decía JPEG/PNG/HEIC pero su decodificador no lo reconoce.
        raise _error_invalida() from error
    except Exception as error:  # truncada, corrupta, chunk inválido…: nunca un 500
        log.info("imagen ilegible: %s", type(error).__name__)
        raise _error_invalida() from error
    variantes = tuple(_variante(lista, nombre, lado) for nombre, lado in TAMANOS.items())
    return FotoProcesada(
        formato=formato,
        ancho=ancho,
        alto=alto,
        huella_original=hashlib.sha256(datos).hexdigest(),
        variantes=variantes,
    )


# ---------------------------------------------------------------------------
# Almacén
# ---------------------------------------------------------------------------

_CLAVE_VALIDA = re.compile(r"^[a-z0-9][a-z0-9._-]*(/[a-z0-9][a-z0-9._-]*)*$")


def _validar_clave(clave: str) -> str:
    """Claves nuestras, pero por si acaso: nada de `..`, `/` inicial ni mayúsculas."""
    if not _CLAVE_VALIDA.fullmatch(clave) or ".." in clave:
        raise ValueError(f"clave de almacén inválida: {clave!r}")
    return clave


class ErrorAlmacen(Exception):
    """El almacén no respondió o rechazó la operación (red, credenciales, bucket)."""


class Almacen(ABC):
    """Dos buckets: público (variantes, con URL) y privado (originales, sin URL)."""

    en_nube: bool = False

    def __init__(self, url_publica: str) -> None:
        self.url_base = url_publica.rstrip("/")

    def url_publica(self, clave: str) -> str:
        return f"{self.url_base}/{_validar_clave(clave)}"

    @abstractmethod
    async def guardar_publico(
        self, clave: str, datos: bytes, tipo_mime: str, cache_control: str
    ) -> str:
        """Sube al bucket público y devuelve la URL pública. Lanza `ErrorAlmacen`."""

    @abstractmethod
    async def guardar_privado(self, clave: str, datos: bytes, tipo_mime: str) -> None:
        """Sube al bucket privado. Lanza `ErrorAlmacen`."""

    @abstractmethod
    async def comprobar(self) -> None:
        """`/ready`: los buckets responden. Lanza `ErrorAlmacen`."""


class AlmacenLocal(Almacen):
    """Carpeta local (`<raiz>/publico/…`, `<raiz>/privado/…`). Sólo desarrollo y pruebas.

    Escribe cada archivo con nombre temporal y `os.replace`: nunca queda uno a medias."""

    def __init__(self, raiz: Path | str, url_publica: str = "/almacen") -> None:
        super().__init__(url_publica)
        self.raiz = Path(raiz)

    def ruta(self, bucket: str, clave: str) -> Path:
        return self.raiz / bucket / _validar_clave(clave)

    def _escribir(self, destino: Path, datos: bytes) -> None:
        destino.parent.mkdir(parents=True, exist_ok=True)
        descriptor, temporal = tempfile.mkstemp(dir=destino.parent, prefix=".subiendo-")
        try:
            with os.fdopen(descriptor, "wb") as archivo:
                archivo.write(datos)
            os.replace(temporal, destino)
        except BaseException:
            Path(temporal).unlink(missing_ok=True)
            raise

    async def _guardar(self, bucket: str, clave: str, datos: bytes) -> None:
        try:
            await asyncio.to_thread(self._escribir, self.ruta(bucket, clave), datos)
        except OSError as error:
            raise ErrorAlmacen(type(error).__name__) from error

    async def guardar_publico(
        self, clave: str, datos: bytes, tipo_mime: str, cache_control: str
    ) -> str:
        await self._guardar("publico", clave, datos)
        return self.url_publica(clave)

    async def guardar_privado(self, clave: str, datos: bytes, tipo_mime: str) -> None:
        await self._guardar("privado", clave, datos)

    async def comprobar(self) -> None:
        return None  # `/ready` sólo sondea el almacén en la nube


def _config_s3(plazo: float, intentos: int) -> Config:
    return Config(
        region_name="auto",  # R2
        signature_version="s3v4",
        s3={"addressing_style": "path"},
        connect_timeout=plazo,
        read_timeout=plazo,
        retries={"max_attempts": intentos, "mode": "standard"},
        # R2 no necesita las sumas CRC que botocore ≥ 1.36 añade por defecto.
        request_checksum_calculation="when_required",
        response_checksum_validation="when_required",
    )


class AlmacenS3(Almacen):
    """R2 (o cualquier S3) con `boto3`. El cliente es síncrono: cada llamada va en un hilo."""

    en_nube = True

    def __init__(
        self,
        endpoint: str,
        llave_id: str,
        llave_secreta: str,
        bucket_publico: str,
        bucket_privado: str,
        url_publica: str,
        plazo_sonda: float = PLAZO_SONDA_SEGUNDOS,
    ) -> None:
        super().__init__(url_publica)
        self.bucket_publico = bucket_publico
        self.bucket_privado = bucket_privado
        self.plazo_sonda = plazo_sonda
        credenciales: dict[str, Any] = {
            "endpoint_url": endpoint,
            "aws_access_key_id": llave_id,
            "aws_secret_access_key": llave_secreta,
        }
        sesion = boto3.session.Session()
        self._cliente = sesion.client("s3", config=_config_s3(10.0, 3), **credenciales)
        # La sonda no reintenta: `/ready` necesita la respuesta en `plazo_sonda`.
        self._sonda = sesion.client("s3", config=_config_s3(plazo_sonda, 1), **credenciales)

    @classmethod
    def desde_settings(cls, config: Settings) -> AlmacenS3:
        assert config.R2_SECRET_ACCESS_KEY is not None  # `almacen_en_nube` lo garantiza
        return cls(
            endpoint=str(config.R2_ENDPOINT),
            llave_id=str(config.R2_ACCESS_KEY_ID),
            llave_secreta=config.R2_SECRET_ACCESS_KEY.get_secret_value(),
            bucket_publico=str(config.R2_BUCKET_PUBLICO),
            bucket_privado=str(config.R2_BUCKET_PRIVADO),
            url_publica=str(config.R2_URL_PUBLICA),
        )

    async def _poner(self, bucket: str, clave: str, datos: bytes, **extra: str) -> None:
        try:
            await asyncio.to_thread(
                self._cliente.put_object,
                Bucket=bucket,
                Key=_validar_clave(clave),
                Body=datos,
                **extra,
            )
        except Exception as error:  # red, credenciales, bucket: el motivo sólo al log
            log.error("el almacén rechazó %s: %s", bucket, type(error).__name__)
            raise ErrorAlmacen(type(error).__name__) from error

    async def guardar_publico(
        self, clave: str, datos: bytes, tipo_mime: str, cache_control: str
    ) -> str:
        await self._poner(
            self.bucket_publico, clave, datos, ContentType=tipo_mime, CacheControl=cache_control
        )
        return self.url_publica(clave)

    async def guardar_privado(self, clave: str, datos: bytes, tipo_mime: str) -> None:
        await self._poner(self.bucket_privado, clave, datos, ContentType=tipo_mime)

    async def comprobar(self) -> None:
        async def cabeza(bucket: str) -> None:
            await asyncio.to_thread(self._sonda.head_bucket, Bucket=bucket)

        try:
            async with asyncio.timeout(self.plazo_sonda):
                await asyncio.gather(cabeza(self.bucket_publico), cabeza(self.bucket_privado))
        except Exception as error:
            raise ErrorAlmacen(type(error).__name__) from error


_almacen: Almacen | None = None


def obtener_almacen() -> Almacen:
    """El almacén de `Settings` (uno por proceso). En la ruta va con `Depends`, así las
    pruebas lo cambian con `app.dependency_overrides[obtener_almacen]`."""
    global _almacen
    if _almacen is None:
        if settings.almacen_en_nube:
            _almacen = AlmacenS3.desde_settings(settings)
        else:
            _almacen = AlmacenLocal(
                settings.ALMACEN_LOCAL_RUTA, settings.R2_URL_PUBLICA or "/almacen"
            )
    return _almacen


# ---------------------------------------------------------------------------
# Platillo
# ---------------------------------------------------------------------------

_semaforo = asyncio.Semaphore(PROCESOS_SIMULTANEOS)


def claves_de(platillo: Platillo, foto: FotoProcesada) -> dict[str, str]:
    """Dónde va cada archivo. Variantes por hash de **su** contenido (inmutables)."""
    base = f"platillos/{platillo.restaurante_id}"
    claves = {v.nombre: f"{base}/{v.huella[:32]}-{v.ancho}x{v.alto}.webp" for v in foto.variantes}
    claves["original"] = (
        f"originales/{platillo.restaurante_id}/{platillo.id}/"
        f"{foto.huella_original}.{foto.formato.extension}"
    )
    return claves


async def poner_foto(
    sesion: AsyncSession,
    platillo: Platillo,
    datos: bytes,
    almacen: Almacen,
    cache: CacheMenu | None = None,
) -> Platillo:
    """Procesa, sube las tres piezas y deja el platillo con `imagen_tipo = 'foto'`.

    Primero el almacén y después la base: si la base fallara, quedan archivos huérfanos
    (inofensivos, nadie los enlaza); al revés, el menú apuntaría a una foto inexistente."""
    async with _semaforo:
        foto = await asyncio.to_thread(procesar_foto, datos)
    claves = claves_de(platillo, foto)
    por_nombre = {v.nombre: v for v in foto.variantes}
    try:
        miniatura, detalle, _ = await asyncio.gather(
            almacen.guardar_publico(
                claves["miniatura"], por_nombre["miniatura"].datos, "image/webp", CACHE_INMUTABLE
            ),
            almacen.guardar_publico(
                claves["detalle"], por_nombre["detalle"].datos, "image/webp", CACHE_INMUTABLE
            ),
            almacen.guardar_privado(claves["original"], datos, foto.formato.tipo_mime),
        )
    except ErrorAlmacen as error:
        raise ErrorCarta("ALMACEN_NO_DISPONIBLE", MENSAJE_ALMACEN, 503) from error
    platillo.imagen_tipo = TipoImagen.foto
    platillo.foto_thumb_url = miniatura
    platillo.foto_detalle_url = detalle
    platillo.foto_url = detalle  # columna de los documentos de agosto: la imagen principal
    platillo.foto_original_url = claves["original"]  # clave del bucket privado, sin URL
    await menu.confirmar(sesion, platillo.restaurante_id, cache)
    await sesion.refresh(platillo)
    return platillo


async def quitar_foto(
    sesion: AsyncSession, platillo: Platillo, cache: CacheMenu | None = None
) -> Platillo:
    """Vuelve a la ilustración de la categoría. No borra archivos (ver el docstring)."""
    if platillo.imagen_tipo is TipoImagen.foto:
        platillo.imagen_tipo = TipoImagen.ilustracion_categoria
    platillo.foto_url = platillo.foto_thumb_url = platillo.foto_detalle_url = None
    platillo.foto_original_url = None
    if platillo.ilustracion_clave is None:
        nombre = await menu.nombre_de_categoria(sesion, platillo.categoria_id)
        platillo.ilustracion_clave = clave_para_categoria(nombre)
    await menu.confirmar(sesion, platillo.restaurante_id, cache)
    await sesion.refresh(platillo)
    return platillo
