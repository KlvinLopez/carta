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

**Procesado** fuera del bucle de eventos (`asyncio.to_thread`), de uno en uno
(`PROCESOS_SIMULTANEOS`) y con espera acotada (`PLAZO_COLA_SEGUNDOS` → 503
`SERVICIO_OCUPADO`). La imagen se decodifica una vez (el JPEG ya reducido con `draft`), se
reduce en el sitio a 1200 px y todo lo demás (orientación EXIF, modo, conversión del perfil
ICC a sRGB, miniatura sacada del detalle) trabaja en pequeño. Las variantes salen sin EXIF,
XMP ni perfil (ya están en sRGB). Una proporción de más de 1:10 es 422.

**Memoria** (pico residente del proceso, `VmHWM`, con ~88 MB de módulos cargados; medido
en la revisión de T-1.4 y vigilado por `tests/unit/test_assets.py`):

| Archivo (≤ 15 MB) | Antes | Ahora |
|---|---|---|
| PNG RGBA 7000 × 7000 (49 MP) | 908 MB | ~330 MB |
| PNG gris 16 bits 7000 × 7000 | 721 MB | ~208 MB |
| JPEG progresivo 8000 × 6100 | 241 MB | ~248 MB |
| HEIC 8064 × 6048 (iPhone, 48 MP) | 697 MB | ~439 MB |

El HEIC es el peor caso y no baja más: libheif decodifica la imagen entera (no hay
decodificación reducida). Presupuesto: ~440 MB × `PROCESOS_SIMULTANEOS` × workers; con 2
procesos y 2 workers serían ~1,76 GB (> 1,5 GB), así que `PROCESOS_SIMULTANEOS = 1`:
~0,9 GB en el peor momento con dos workers.

**Sin conexión a la base mientras se sube** (revisión A2): la ruta suelta la sesión antes de
leer el cuerpo y `poner_foto` sólo toma una al final para escribir. Las subidas a R2 van en
hilos propios (`_hilos_almacen`, para no ocupar el *executor* de Pillow), con conexión 3 s,
lectura 10 s, dos intentos y un plazo total de `PLAZO_ALMACEN_SEGUNDOS` → 503
`ALMACEN_NO_DISPONIBLE`. `/ready` reutiliza su sonda `VIGENCIA_SONDA_SEGUNDOS`.

**Huérfanos.** Cada foto nueva deja en el bucket público las variantes de la anterior (las
URL viejas siguen sirviendo al menú en caché) y en el privado su original; un fallo a medias
puede dejar variantes sin original. Nadie los enlaza; la limpieza es de una tarea de
retención (nota en T-4.1), no de esta API.

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
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from functools import partial
from pathlib import Path
from typing import Any
from uuid import UUID

import boto3
import pillow_heif
from botocore.config import Config
from PIL import Image, ImageCms, ImageOps
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, settings
from app.core.errores import ErrorCarta, mensaje_por_http
from app.db.models import Platillo, TipoImagen
from app.services import menu, operadores
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

PROCESOS_SIMULTANEOS = 1  # ver «Memoria» en el docstring del módulo
PROPORCION_MAXIMA = 10  # 1:10; una «foto» de 1 × 20 000 no es un platillo (C3)
TAMANOS = {"miniatura": 400, "detalle": 1200}  # lado largo, en px (AC-17.2)
CALIDAD_WEBP = 82
CACHE_INMUTABLE = "public, max-age=31536000, immutable"
PLAZO_SONDA_SEGUNDOS = 3.0  # `/ready`: HEAD al bucket
VIGENCIA_SONDA_SEGUNDOS = 20.0  # `/ready` es anónimo: una sonda real cada 20 s, no por llamada
PLAZO_ALMACEN_SEGUNDOS = 25.0  # las tres subidas juntas; Cloudflare corta a los 100 s
PLAZO_COLA_SEGUNDOS = 15.0  # espera máxima por el semáforo de Pillow
HILOS_ALMACEN = 8

MENSAJE_TIPO = "Sube una foto JPG, PNG o HEIC."
MENSAJE_INVALIDA = "No pudimos leer la imagen; puede estar dañada. Prueba con otra foto."
MENSAJE_PIXELES = "La imagen tiene demasiados píxeles; sube una foto de hasta 50 megapíxeles."
MENSAJE_ALMACEN = "No pudimos guardar la foto en este momento. Inténtalo de nuevo."
MENSAJE_OCUPADO = "Hay muchas fotos en cola; inténtalo en un momento."

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


def _error_proporcion() -> ErrorCarta:
    return ErrorCarta(
        "IMAGEN_NO_VALIDA",
        "La imagen es demasiado alargada; sube una foto con proporción de hasta 1:10.",
        422,
    )


def _error_pixeles() -> ErrorCarta:
    return ErrorCarta("ARCHIVO_EXCEDE_LIMITE", MENSAJE_PIXELES, 413, {"max_pixeles": MAX_PIXELES})


def _a_rgb(imagen: Image.Image) -> Image.Image:
    """RGB, o RGBA si la imagen trae transparencia (WebP la conserva). Se llama con la imagen
    ya reducida: ninguna conversión ocurre a tamaño completo."""
    if imagen.mode in ("RGB", "RGBA"):
        return imagen
    if imagen.mode in ("LA", "PA") or (imagen.mode == "P" and "transparency" in imagen.info):
        return imagen.convert("RGBA")
    if imagen.mode in ("I;16", "I;16B", "I;16L", "I;16N", "I"):
        # Gris de 16 bits (0–65535): a 8 bits dividiendo, no recortando (si no, todo blanco).
        return imagen.convert("I").point(lambda v: v / 256).convert("L").convert("RGB")
    return imagen.convert("RGB")


SRGB = ImageCms.createProfile("sRGB")


def _a_srgb(imagen: Image.Image, icc: bytes | None) -> Image.Image:
    """Convierte del perfil embebido (Display P3 en un iPhone, Adobe RGB…) a sRGB, que es lo
    que el navegador supone para una imagen sin perfil. La variante sale sin perfil. Un perfil
    roto o incompatible con el modo se ignora (la imagen se queda como estaba)."""
    if not icc:
        return imagen
    try:
        origen = ImageCms.ImageCmsProfile(io.BytesIO(icc))
        convertida = ImageCms.profileToProfile(imagen, origen, SRGB, outputMode=imagen.mode)
    except Exception as error:  # perfil corrupto, gris en una imagen RGB…
        log.info("perfil de color ignorado: %s", type(error).__name__)
        return imagen
    return convertida if convertida is not None else imagen


def _webp(imagen: Image.Image, nombre: str) -> Variante:
    salida = io.BytesIO()
    # Sin `exif`, `xmp` ni `icc_profile`: las variantes públicas no llevan metadatos de la
    # cámara y ya están en sRGB (`_a_srgb`).
    imagen.save(salida, "WEBP", quality=CALIDAD_WEBP, method=4, exif=b"")
    return Variante(nombre, salida.getvalue(), imagen.width, imagen.height)


_DIECISEIS_BITS = frozenset({"I;16", "I;16B", "I;16L", "I;16N"})
_PALETA = frozenset({"1", "P", "PA"})


def _reducir_en_sitio(imagen: Image.Image, lado: int) -> Image.Image:
    """La imagen recién cargada, reducida a `lado` px de lado largo sin ninguna copia a
    tamaño completo; el original se libera en cuanto hay una reducida (revisión A1: copiar
    por variante y convertir a tamaño completo llevaba un PNG RGBA de 49 MP a 908 MB).

    - Primero una reducción por factor entero hasta ~2× el destino. En RGBA/LA se usa la
      del núcleo de Pillow: la pública (`reduce`, y `resize`/`thumbnail`) premultiplica el
      alfa en una copia completa (+196 MB a 49 MP). Promediar sin premultiplicar mezcla el
      color de los píxeles transparentes en los bordes al reducir: aceptable en una foto.
    - Paleta y 1 bit: vecino más cercano hasta 2× (promediar índices de paleta no tiene
      sentido) y conversión a RGB/RGBA ya en pequeño.
    - 16 bits: el núcleo no los reduce; `thumbnail` sin `reducing_gap` remuestrea directo.
    - Después, `thumbnail` LANCZOS al tamaño final, sobre la imagen ya pequeña."""
    ancho, alto = imagen.size
    if imagen.mode in _DIECISEIS_BITS:
        imagen.thumbnail((lado, lado), Image.Resampling.LANCZOS, reducing_gap=None)
        return imagen
    if imagen.mode in _PALETA:
        imagen.thumbnail((lado * 2, lado * 2), Image.Resampling.NEAREST)
        pequena = _a_rgb(imagen)
    else:
        factor = max(ancho, alto) // (lado * 2)
        if factor < 2:
            pequena = imagen
        elif imagen.mode in ("RGBA", "LA"):
            pequena = imagen._new(imagen.im.reduce((factor, factor), (0, 0, ancho, alto)))
        else:
            pequena = imagen.reduce(factor)
    if pequena is not imagen:
        imagen.close()  # libera el original decodificado; `pequena` conserva `info`
    pequena.thumbnail((lado, lado), Image.Resampling.LANCZOS)
    return pequena


def procesar_foto(datos: bytes) -> FotoProcesada:
    """Valida por contenido y genera las variantes WebP. Lanza `ErrorCarta` 413/415/422.

    Síncrona y pesada: `poner_foto` la llama en un hilo con el semáforo. Memoria: la imagen
    se decodifica una vez (el JPEG ya reducido con `draft`), se reduce en el sitio a 1200 px
    y todo lo demás (orientación, modo, color, miniatura) trabaja sobre esa copia pequeña."""
    if len(datos) > MAX_BYTES:
        raise ErrorCarta("ARCHIVO_EXCEDE_LIMITE", "El archivo pasa de 15 MB.", 413)
    formato = formato_por_firma(datos)
    if formato is None:
        raise _error_tipo()
    lado = TAMANOS["detalle"]
    try:
        with Image.open(io.BytesIO(datos), formats=[formato.pillow]) as imagen:
            ancho, alto = imagen.size
            if ancho < 1 or alto < 1:
                raise _error_invalida()
            if ancho * alto > MAX_PIXELES:
                raise _error_pixeles()
            if max(ancho, alto) > PROPORCION_MAXIMA * min(ancho, alto):
                raise _error_proporcion()
            if formato is JPEG and max(ancho, alto) > lado:
                # Decodifica ya reducido (1/2, 1/4, 1/8): `draft` nunca baja de la caja
                # pedida, que es la del detalle con la proporción de la foto.
                escala = lado / max(ancho, alto)
                imagen.draft("RGB", (math.ceil(ancho * escala), math.ceil(alto * escala)))
            imagen.load()
            icc = imagen.info.get("icc_profile")
            exif = imagen.getexif()  # antes de liberar el original
            reducida = _reducir_en_sitio(imagen, lado)
            if reducida is not imagen and exif:
                reducida.info["exif"] = exif.tobytes()
            orientada = ImageOps.exif_transpose(reducida)  # `info` sigue con su EXIF
            detalle = _a_srgb(_a_rgb(orientada), icc)
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
    miniatura = detalle.copy()  # del detalle (≤ 1200 px), nunca del original
    miniatura.thumbnail((TAMANOS["miniatura"],) * 2, Image.Resampling.LANCZOS)
    return FotoProcesada(
        formato=formato,
        ancho=ancho,
        alto=alto,
        huella_original=hashlib.sha256(datos).hexdigest(),
        variantes=(_webp(miniatura, "miniatura"), _webp(detalle, "detalle")),
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
    async def borrar_publico(self, clave: str) -> None:
        """Borra del bucket público. Un objeto ausente no es error. Lanza `ErrorAlmacen`."""

    @abstractmethod
    async def borrar_privado(self, clave: str) -> None:
        """Borra del bucket privado. Un objeto ausente no es error. Lanza `ErrorAlmacen`."""

    @abstractmethod
    async def leer_privado(self, clave: str, maximo: int) -> bytes:
        """Lee del bucket privado (el procesador de importaciones, T-1.9). Lanza `ErrorAlmacen`
        si no responde, la clave no existe o el objeto pasa de `maximo` bytes (se lee a lo
        sumo `maximo + 1`)."""

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

    async def _borrar(self, bucket: str, clave: str) -> None:
        try:
            # `ruta` valida la clave (sin `..` ni `/` inicial): no sale de la raíz del bucket.
            await asyncio.to_thread(self.ruta(bucket, clave).unlink, missing_ok=True)
        except OSError as error:
            raise ErrorAlmacen(type(error).__name__) from error

    async def borrar_publico(self, clave: str) -> None:
        await self._borrar("publico", clave)

    async def borrar_privado(self, clave: str) -> None:
        await self._borrar("privado", clave)

    async def leer_privado(self, clave: str, maximo: int) -> bytes:
        def leer() -> bytes:
            with self.ruta("privado", clave).open("rb") as archivo:
                return archivo.read(maximo + 1)

        try:
            datos = await asyncio.to_thread(leer)
        except OSError as error:
            raise ErrorAlmacen(type(error).__name__) from error
        if len(datos) > maximo:
            raise ErrorAlmacen("ObjetoDemasiadoGrande")
        return datos

    async def comprobar(self) -> None:
        return None  # `/ready` sólo sondea el almacén en la nube


# Hilos propios para boto3 (síncrono): un R2 colgado no ocupa el *executor* por defecto, que
# comparten Pillow (`asyncio.to_thread`) y la resolución de nombres. Si vence el plazo de
# `poner_foto`, el hilo sigue hasta su `read_timeout` y termina solo.
_hilos_almacen = ThreadPoolExecutor(max_workers=HILOS_ALMACEN, thread_name_prefix="almacen")


async def _en_hilo_almacen(funcion: Any, /, **argumentos: Any) -> Any:
    bucle = asyncio.get_running_loop()
    return await bucle.run_in_executor(_hilos_almacen, partial(funcion, **argumentos))


def _config_s3(conexion: float, lectura: float, intentos: int) -> Config:
    return Config(
        region_name="auto",  # R2
        signature_version="s3v4",
        s3={"addressing_style": "path"},
        connect_timeout=conexion,
        read_timeout=lectura,
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
        plazo_conexion: float = 3.0,
        plazo_lectura: float = 10.0,
        intentos: int = 2,
    ) -> None:
        super().__init__(url_publica)
        self.bucket_publico = bucket_publico
        self.bucket_privado = bucket_privado
        self.plazo_sonda = plazo_sonda
        # `/ready`: el último resultado de la sonda y cuándo; una sola sonda en vuelo.
        self._sondeado_en = -math.inf
        self._sondeo_error: ErrorAlmacen | None = None
        self._candado_sonda = asyncio.Lock()
        credenciales: dict[str, Any] = {
            "endpoint_url": endpoint,
            "aws_access_key_id": llave_id,
            "aws_secret_access_key": llave_secreta,
        }
        sesion = boto3.session.Session()
        # Conexión 3 s, lectura 10 s, dos intentos: con R2 colgado una subida falla en ≤ 25 s
        # (`PLAZO_ALMACEN_SEGUNDOS`), no en los 45–115 s de la primera entrega (revisión A3).
        configuracion = _config_s3(plazo_conexion, plazo_lectura, intentos)
        self._cliente = sesion.client("s3", config=configuracion, **credenciales)
        # La sonda no reintenta: `/ready` necesita la respuesta en `plazo_sonda`.
        sonda = _config_s3(plazo_sonda, plazo_sonda, 1)
        self._sonda = sesion.client("s3", config=sonda, **credenciales)

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
            await _en_hilo_almacen(
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

    async def _quitar(self, bucket: str, clave: str) -> None:
        try:
            async with asyncio.timeout(PLAZO_ALMACEN_SEGUNDOS):
                await _en_hilo_almacen(
                    self._cliente.delete_object, Bucket=bucket, Key=_validar_clave(clave)
                )
        except ValueError:
            raise
        except Exception as error:  # red, credenciales, bucket (S3 no falla si el objeto falta)
            log.error("el almacén no borró en %s: %s", bucket, type(error).__name__)
            raise ErrorAlmacen(type(error).__name__) from error

    async def borrar_publico(self, clave: str) -> None:
        await self._quitar(self.bucket_publico, clave)

    async def borrar_privado(self, clave: str) -> None:
        await self._quitar(self.bucket_privado, clave)

    async def leer_privado(self, clave: str, maximo: int) -> bytes:
        def leer() -> bytes:
            respuesta = self._cliente.get_object(
                Bucket=self.bucket_privado, Key=_validar_clave(clave)
            )
            cuerpo = respuesta["Body"]
            try:
                datos: bytes = cuerpo.read(maximo + 1)
            finally:
                cuerpo.close()
            return datos

        try:
            resultado: bytes = await _en_hilo_almacen(leer)
        except Exception as error:  # red, credenciales, clave inexistente: el motivo al log
            log.error("el almacén no entregó %s: %s", self.bucket_privado, type(error).__name__)
            raise ErrorAlmacen(type(error).__name__) from error
        if len(resultado) > maximo:
            raise ErrorAlmacen("ObjetoDemasiadoGrande")
        return resultado

    async def comprobar(self) -> None:
        """`HEAD` a los dos buckets, como mucho una vez cada `VIGENCIA_SONDA_SEGUNDOS`:
        `/ready` no tiene autenticación y cada `HEAD` es una operación facturable de R2
        (revisión B2). El resultado (bueno o malo) se reutiliza mientras está vigente y las
        llamadas que llegan durante una sonda esperan a esa misma sonda."""
        async with self._candado_sonda:
            bucle = asyncio.get_running_loop()
            if bucle.time() - self._sondeado_en >= VIGENCIA_SONDA_SEGUNDOS:
                self._sondeo_error = await self._sondear()
                self._sondeado_en = bucle.time()
            if self._sondeo_error is not None:
                raise self._sondeo_error

    async def _sondear(self) -> ErrorAlmacen | None:
        async def cabeza(bucket: str) -> None:
            await _en_hilo_almacen(self._sonda.head_bucket, Bucket=bucket)

        try:
            async with asyncio.timeout(self.plazo_sonda):
                await asyncio.gather(cabeza(self.bucket_publico), cabeza(self.bucket_privado))
        except Exception as error:
            return ErrorAlmacen(type(error).__name__ or "plazo")
        return None


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


def claves_de(restaurante_id: UUID, platillo_id: UUID, foto: FotoProcesada) -> dict[str, str]:
    """Dónde va cada archivo. Variantes por hash de **su** contenido (inmutables)."""
    base = f"platillos/{restaurante_id}"
    claves = {v.nombre: f"{base}/{v.huella[:32]}-{v.ancho}x{v.alto}.webp" for v in foto.variantes}
    claves["original"] = (
        f"originales/{restaurante_id}/{platillo_id}/{foto.huella_original}.{foto.formato.extension}"
    )
    return claves


async def _procesar_en_cola(datos: bytes) -> FotoProcesada:
    """Pillow en un hilo, de `PROCESOS_SIMULTANEOS` en `PROCESOS_SIMULTANEOS`; quien espera
    más de `PLAZO_COLA_SEGUNDOS` recibe 503 en vez de quedarse colgado (revisión A2 c)."""
    try:
        async with asyncio.timeout(PLAZO_COLA_SEGUNDOS):
            await _semaforo.acquire()
    except TimeoutError as error:
        raise ErrorCarta("SERVICIO_OCUPADO", MENSAJE_OCUPADO, 503) from error
    try:
        return await asyncio.to_thread(procesar_foto, datos)
    finally:
        _semaforo.release()


async def poner_foto(
    sesion: AsyncSession,
    usuario_id: UUID,
    platillo_id: UUID,
    restaurante_id: UUID,
    datos: bytes,
    almacen: Almacen,
    cache: CacheMenu | None = None,
) -> Platillo:
    """Procesa, sube las tres piezas y deja el platillo con `imagen_tipo = 'foto'`.

    **Sin conexión a la base mientras trabaja** (revisión A2): la ruta suelta la sesión
    antes de leer el cuerpo, y aquí Pillow y las subidas corren sin ella; sólo al final se
    vuelve a cargar el platillo (404 si en medio dejó de existir o de ser del operador), se
    escribe y se confirma. Así una subida lenta no retiene una conexión del pool.

    Primero el almacén y después la base: si la base fallara, quedan archivos huérfanos
    (inofensivos, nadie los enlaza); al revés, el menú apuntaría a una foto inexistente."""
    foto = await _procesar_en_cola(datos)
    claves = claves_de(restaurante_id, platillo_id, foto)
    por_nombre = {v.nombre: v for v in foto.variantes}
    try:
        async with asyncio.timeout(PLAZO_ALMACEN_SEGUNDOS):
            miniatura, detalle, _ = await asyncio.gather(
                almacen.guardar_publico(
                    claves["miniatura"],
                    por_nombre["miniatura"].datos,
                    "image/webp",
                    CACHE_INMUTABLE,
                ),
                almacen.guardar_publico(
                    claves["detalle"], por_nombre["detalle"].datos, "image/webp", CACHE_INMUTABLE
                ),
                almacen.guardar_privado(claves["original"], datos, foto.formato.tipo_mime),
            )
    except (ErrorAlmacen, TimeoutError) as error:
        log.error("no se pudo guardar la foto: %s", type(error).__name__)
        raise ErrorCarta("ALMACEN_NO_DISPONIBLE", MENSAJE_ALMACEN, 503) from error
    platillo = await operadores.platillo_del_usuario(sesion, usuario_id, platillo_id)
    if platillo is None:
        raise ErrorCarta("RECURSO_NO_ENCONTRADO", mensaje_por_http(404), 404)
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
