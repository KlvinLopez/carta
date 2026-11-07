"""Imágenes de prueba generadas al vuelo (T-1.4): nada binario en el repositorio.

Cada función devuelve los bytes de un archivo real del formato pedido. `heic` usa el
codificador de `pillow-heif`, el mismo paquete que la aplicación usa para leerlos.
"""

from __future__ import annotations

import io

import pillow_heif
from PIL import Image

pillow_heif.register_heif_opener()

ROJO = (200, 30, 30)
AZUL = (30, 30, 200)

# Un PDF mínimo de una página (como el que sube un operador al equivocarse de botón).
PDF = (
    b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 288 432]>>endobj\n"
    b"trailer<</Root 1 0 R>>\n%%EOF\n"
)


def mitades(ancho: int, alto: int, modo: str = "RGB") -> Image.Image:
    """Mitad izquierda roja y derecha azul: deja ver si la orientación se aplicó."""
    imagen = Image.new(modo, (ancho, alto), ROJO if modo == "RGB" else (*ROJO, 255))
    derecha = Image.new(modo, (ancho - ancho // 2, alto), AZUL if modo == "RGB" else (*AZUL, 128))
    imagen.paste(derecha, (ancho // 2, 0))
    return imagen


def jpeg(
    ancho: int = 2400,
    alto: int = 1600,
    orientacion: int | None = None,
    marca: str | None = None,
    calidad: int = 85,
) -> bytes:
    exif = Image.Exif()
    if orientacion is not None:
        exif[0x0112] = orientacion
    if marca is not None:
        exif[0x010F] = marca  # Make: un dato de la cámara que no debe salir en las variantes
    salida = io.BytesIO()
    mitades(ancho, alto).save(salida, "JPEG", quality=calidad, exif=exif.tobytes())
    return salida.getvalue()


def png(ancho: int = 900, alto: int = 600, modo: str = "RGBA") -> bytes:
    salida = io.BytesIO()
    imagen = mitades(ancho, alto, "RGBA") if modo == "RGBA" else mitades(ancho, alto).convert(modo)
    imagen.save(salida, "PNG")
    return salida.getvalue()


def heic(ancho: int = 1600, alto: int = 1200) -> bytes:
    salida = io.BytesIO()
    mitades(ancho, alto).save(salida, "HEIF", quality=60)
    return salida.getvalue()


def en_formato(formato: str, ancho: int = 64, alto: int = 48) -> bytes:
    """GIF, WEBP, BMP, TIFF…: imágenes válidas de un formato que la API no acepta."""
    salida = io.BytesIO()
    mitades(ancho, alto).save(salida, formato)
    return salida.getvalue()


def avif_como_heif() -> bytes:
    """Un AVIF real con la marca principal cambiada a `mif1` (la de los HEIC): la firma dice
    HEIF y sólo el decodificador HEIF debe intentarlo (Pillow lo abriría como AVIF)."""
    salida = io.BytesIO()
    mitades(64, 48).save(salida, "AVIF")
    datos = salida.getvalue()
    return datos[:8] + b"mif1" + datos[12:]


def jpeg_con_xmp(texto: str) -> bytes:
    salida = io.BytesIO()
    mitades(300, 200).save(salida, "JPEG", xmp=f"<x:xmpmeta>{texto}</x:xmpmeta>".encode())
    return salida.getvalue()


def bomba_png(ancho: int, alto: int) -> bytes:
    """Muchos píxeles en pocos bytes (1 bit por píxel, todo igual: se comprime a casi nada)."""
    salida = io.BytesIO()
    Image.new("1", (ancho, alto), 0).save(salida, "PNG", optimize=True)
    return salida.getvalue()


def abrir(datos: bytes) -> Image.Image:
    imagen = Image.open(io.BytesIO(datos))
    imagen.load()
    return imagen
