"""Imágenes de prueba generadas al vuelo (T-1.4): nada binario en el repositorio.

Cada función devuelve los bytes de un archivo real del formato pedido. `heic` usa el
codificador de `pillow-heif`, el mismo paquete que la aplicación usa para leerlos.
"""

from __future__ import annotations

import io
import struct
import zlib

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


def png_constante(ancho: int, alto: int, tipo_color: int = 6, bits: int = 8) -> bytes:
    """PNG enorme de un solo color escrito fila a fila con zlib, sin tenerlo en memoria:
    `tipo_color` 6 = RGBA, 2 = RGB, 0 = gris (con `bits` 16, gris de 16 bits). Medio gris,
    para que las variantes no sean blancas ni negras."""
    canales = {0: 1, 2: 3, 6: 4}[tipo_color]
    muestra = b"\x80\x00" if bits == 16 else b"\x80"
    fila = b"\x00" + muestra * canales * ancho  # filtro 0 + píxeles
    compresor = zlib.compressobj(9)
    datos = b"".join(compresor.compress(fila) for _ in range(alto)) + compresor.flush()

    def trozo(tipo: bytes, contenido: bytes) -> bytes:
        crc = zlib.crc32(tipo + contenido) & 0xFFFFFFFF
        return struct.pack(">I", len(contenido)) + tipo + contenido + struct.pack(">I", crc)

    cabecera = struct.pack(">IIBBBBB", ancho, alto, bits, tipo_color, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + trozo(b"IHDR", cabecera)
        + trozo(b"IDAT", datos)
        + trozo(b"IEND", b"")
    )


def perfil_rgb_lineal() -> bytes:
    """Perfil ICC v2 RGB con primarios sRGB y gamma 1,0 (lineal): un perfil distinto de sRGB
    que LittleCMS acepta, para probar la conversión a sRGB sin traer un Display P3 de fuera.
    Un valor de 60 en este espacio es ~137 en sRGB."""

    def s15(valor: float) -> bytes:
        return struct.pack(">i", round(valor * 65536))

    def xyz(x: float, y: float, z: float) -> bytes:
        return b"XYZ \0\0\0\0" + s15(x) + s15(y) + s15(z)

    texto = b"Carta RGB lineal\0"
    etiquetas = [
        (b"desc", b"desc\0\0\0\0" + struct.pack(">I", len(texto)) + texto + b"\0" * 79),
        (b"wtpt", xyz(0.9642, 1.0, 0.8249)),
        (b"rXYZ", xyz(0.4361, 0.2225, 0.0139)),
        (b"gXYZ", xyz(0.3851, 0.7169, 0.0971)),
        (b"bXYZ", xyz(0.1431, 0.0606, 0.7141)),
        (b"rTRC", b"curv\0\0\0\0" + struct.pack(">IH", 1, 256) + b"\0\0"),
    ]
    etiquetas += [(b"gTRC", etiquetas[-1][1]), (b"bTRC", etiquetas[-1][1])]
    tabla, cuerpo = b"", b""
    desplazamiento = 128 + 4 + 12 * len(etiquetas)
    for firma, datos in etiquetas:
        tabla += firma + struct.pack(">II", desplazamiento + len(cuerpo), len(datos))
        cuerpo += datos + b"\0" * (-len(datos) % 4)
    tamano = desplazamiento + len(cuerpo)
    cabecera = (
        struct.pack(">I", tamano)
        + b"\0" * 4
        + bytes([2, 0x10, 0, 0])
        + b"mntrRGB XYZ "
        + b"\0" * 12
        + b"acsp"
        + b"\0" * 24
        + b"\0" * 4
        + s15(0.9642)
        + s15(1.0)
        + s15(0.8249)
        + b"\0" * 48
    )
    assert len(cabecera) == 128
    return cabecera + struct.pack(">I", len(etiquetas)) + tabla + cuerpo


def jpeg_con_perfil(color: tuple[int, int, int], icc: bytes | None) -> bytes:
    salida = io.BytesIO()
    Image.new("RGB", (64, 48), color).save(salida, "JPEG", quality=95, icc_profile=icc)
    return salida.getvalue()


def abrir(datos: bytes) -> Image.Image:
    imagen = Image.open(io.BytesIO(datos))
    imagen.load()
    return imagen
