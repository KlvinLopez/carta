"""PDF imprimible con el QR de cada mesa (US-21, AC-21.2). Sin FastAPI (regla dura 2).

Una tarjeta por mesa, cuatro por hoja A4: logo (si hay), nombre del restaurante, «Mesa 7»,
el QR a `https://{DOMINIO}/m/{codigo}` y la leyenda «Escanea para ver la carta · Carta».

- **El PDF sólo lleva lo que se imprime.** Ni la URL del logo, ni el slug, ni nada del
  comensal (no hay datos del comensal en el servidor, regla dura 10). Los metadatos son
  fijos (`invariant`): sin fecha ni autor.
- **Logo:** se descarga con plazo corto y tamaño acotado, sólo si es `https` con un host
  público (sin credenciales, puerto 443, sin seguir redirecciones). Cualquier falla —red,
  tamaño, formato, imagen enorme— deja la tarjeta sin logo; nunca rompe el PDF. El host se
  resuelve antes de conectar y se rechazan las direcciones no globales; entre esa resolución
  y la conexión un DNS hostil podría cambiar de respuesta (*rebinding*): el riesgo queda
  acotado porque lo que se descarga sólo se lee como imagen y no se devuelve a nadie.
- **Fuentes:** Helvetica estándar de PDF. El repo sólo trae las de marca en `woff2`
  (`frontend/public/fonts`), que ReportLab no incrusta; los caracteres fuera de WinAnsi se
  imprimen como `?`.
- La generación (QR + maquetado) es CPU pura: va en un hilo (`asyncio.to_thread`) para no
  detener el bucle de eventos. Tope: `MAX_MESAS_ACTIVAS` tarjetas.
"""

from __future__ import annotations

import asyncio
import io
import ipaddress
import logging
import re
import socket
from collections.abc import Sequence
from dataclasses import dataclass
from urllib.parse import urlsplit

import httpx
import qrcode
from PIL import Image
from qrcode.constants import ERROR_CORRECT_M
from reportlab.lib.colors import Color, HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen.canvas import Canvas

from app.core.enlaces import url_de_mesa
from app.core.errores import ErrorCarta
from app.schemas.mesa import MAX_MESAS_ACTIVAS

log = logging.getLogger(__name__)

PLAZO_LOGO_SEG = 3.0
MAX_BYTES_LOGO = 1_000_000
MAX_PIXELES_LOGO = 16_000_000
LADO_LOGO_PX = 400

LEYENDA = "Escanea para ver la carta · Carta"
VINO = HexColor("#4F1728")
CARBON = HexColor("#1A1A1A")
GUIA = Color(0.75, 0.75, 0.75)

ANCHO_HOJA, ALTO_HOJA = A4
ANCHO, ALTO = ANCHO_HOJA / 2, ALTO_HOJA / 2  # cuatro tarjetas por hoja
MARGEN = 24.0
LADO_QR = 190.0


@dataclass(frozen=True)
class TarjetaQR:
    numero: int
    codigo_publico: str


# ---------------------------------------------------------------------------
# Logo
# ---------------------------------------------------------------------------


def _url_de_logo_valida(url: str) -> str | None:
    """El host si `url` es https sin credenciales, puerto 443 y host que no es una IP privada."""
    try:
        partes = urlsplit(url.strip())
        host = partes.hostname
        puerto = partes.port
    except ValueError:
        return None
    if partes.scheme != "https" or not host or partes.username or partes.password:
        return None
    if puerto not in (None, 443) or host.lower() in ("localhost", "localhost."):
        return None
    try:
        return host if ipaddress.ip_address(host).is_global else None
    except ValueError:
        return host  # un nombre; se resuelve después


async def _resuelve_a_publico(host: str) -> bool:
    """Todas las direcciones del host son globales (ni loopback, ni privadas, ni *link-local*)."""
    try:
        bucle = asyncio.get_running_loop()
        informacion = await bucle.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
        return bool(informacion) and all(
            ipaddress.ip_address(i[4][0]).is_global for i in informacion
        )
    except (OSError, ValueError):
        return False


async def descargar_logo(
    url: str | None, *, transporte: httpx.AsyncBaseTransport | None = None
) -> bytes | None:
    """Los bytes del logo, o `None` si no hay, no es seguro bajarlo o falla algo."""
    if not url:
        return None
    host = _url_de_logo_valida(url)
    if host is None:
        return None
    try:
        async with asyncio.timeout(PLAZO_LOGO_SEG + 1):
            if transporte is None and not await _resuelve_a_publico(host):
                return None
            async with (
                httpx.AsyncClient(
                    transport=transporte,
                    timeout=PLAZO_LOGO_SEG,
                    follow_redirects=False,
                    trust_env=False,
                ) as cliente,
                cliente.stream("GET", url.strip()) as respuesta,
            ):
                if respuesta.status_code != 200:
                    return None
                declarado = respuesta.headers.get("content-length", "")
                if declarado.isdigit() and int(declarado) > MAX_BYTES_LOGO:
                    return None
                cuerpo = bytearray()
                async for trozo in respuesta.aiter_bytes():
                    cuerpo += trozo
                    if len(cuerpo) > MAX_BYTES_LOGO:
                        return None
                return bytes(cuerpo)
    except (httpx.HTTPError, TimeoutError, OSError):
        log.info("logo no disponible para el PDF de QR")
        return None


def preparar_logo(datos: bytes | None) -> bytes | None:
    """PNG de a lo más 400 px de lado, o `None` si no es una imagen que se pueda leer."""
    if not datos:
        return None
    try:
        with Image.open(io.BytesIO(datos)) as imagen:
            ancho, alto = imagen.size
            if ancho <= 0 or alto <= 0 or ancho * alto > MAX_PIXELES_LOGO:
                return None
            imagen.load()
            rgba = imagen.convert("RGBA")
        rgba.thumbnail((LADO_LOGO_PX, LADO_LOGO_PX))
        salida = io.BytesIO()
        rgba.save(salida, format="PNG")
        return salida.getvalue()
    except Exception:  # Pillow lanza de todo con un archivo hostil o truncado
        return None


# ---------------------------------------------------------------------------
# Maquetado
# ---------------------------------------------------------------------------


def _latin(texto: str) -> str:
    limpio = "".join(c if c.isprintable() else " " for c in texto).strip()
    return limpio.encode("cp1252", "replace").decode("cp1252")


def _ajustado(texto: str, fuente: str, tamano: float, ancho_max: float) -> tuple[str, float]:
    """El texto con el tamaño más grande (hasta 9 pt) que cabe; si ni así, con «…»."""
    while tamano > 9 and stringWidth(texto, fuente, tamano) > ancho_max:
        tamano -= 1
    while len(texto) > 1 and stringWidth(texto, fuente, tamano) > ancho_max:
        texto = texto[:-2].rstrip() + "…"
    return texto, tamano


def _imagen_qr(url: str) -> Image.Image:
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=8, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    return qr.make_image(fill_color="black", back_color="white").get_image().convert("1")


def _tarjeta(
    pdf: Canvas, x: float, y: float, nombre: str, logo: ImageReader | None, t: TarjetaQR
) -> None:
    centro = x + ANCHO / 2
    utiles = ANCHO - 2 * MARGEN
    # guías de corte, tenues y punteadas
    pdf.setStrokeColor(GUIA)
    pdf.setLineWidth(0.5)
    pdf.setDash(3, 3)
    pdf.rect(x, y, ANCHO, ALTO)
    pdf.setDash()

    if logo is not None:
        ancho, alto = logo.getSize()
        escala = min(160 / ancho, 44 / alto)
        pdf.drawImage(
            logo,
            centro - ancho * escala / 2,
            y + ALTO - 28 - alto * escala,
            ancho * escala,
            alto * escala,
            mask="auto",
        )

    texto, tamano = _ajustado(_latin(nombre) or "Restaurante", "Helvetica-Bold", 16, utiles)
    pdf.setFillColor(CARBON)
    pdf.setFont("Helvetica-Bold", tamano)
    pdf.drawCentredString(centro, y + ALTO - 100, texto)

    pdf.setFillColor(VINO)
    pdf.setFont("Helvetica-Bold", 44)
    pdf.drawCentredString(centro, y + ALTO - 156, f"Mesa {t.numero}")

    pdf.drawImage(
        ImageReader(_imagen_qr(url_de_mesa(t.codigo_publico))),
        centro - LADO_QR / 2,
        y + 62,
        LADO_QR,
        LADO_QR,
    )

    pdf.setFillColor(CARBON)
    pdf.setFont("Helvetica", 11)
    pdf.drawCentredString(centro, y + 36, LEYENDA)


def generar_pdf(
    restaurante: str,
    logo_png: bytes | None,
    tarjetas: Sequence[TarjetaQR],
    *,
    comprimir: bool = True,
) -> bytes:
    """El PDF; síncrono y sin tocar la base (corre en un hilo). `comprimir=False` deja los
    flujos legibles para las pruebas que buscan texto que no debe estar."""
    if not tarjetas:
        raise ErrorCarta("CONFLICTO", "Crea al menos una mesa antes de imprimir los códigos.", 409)
    if len(tarjetas) > MAX_MESAS_ACTIVAS:
        raise ErrorCarta(
            "PAYLOAD_INVALIDO",
            f"El PDF admite hasta {MAX_MESAS_ACTIVAS} mesas.",
            422,
        )
    salida = io.BytesIO()
    pdf = Canvas(
        salida,
        pagesize=A4,
        pageCompression=1 if comprimir else 0,
        invariant=1,
    )
    pdf.setTitle("Códigos QR de las mesas")
    logo = ImageReader(io.BytesIO(logo_png)) if logo_png else None
    for n, tarjeta in enumerate(tarjetas):
        posicion = n % 4
        if n and posicion == 0:
            pdf.showPage()
        x = (posicion % 2) * ANCHO
        y = ALTO - (posicion // 2) * ALTO  # fila de arriba primero
        _tarjeta(pdf, x, y, restaurante, logo, tarjeta)
    pdf.save()
    return salida.getvalue()


async def pdf_de_mesas(
    nombre: str,
    logo_url: str | None,
    tarjetas: Sequence[TarjetaQR],
    *,
    transporte: httpx.AsyncBaseTransport | None = None,
) -> bytes:
    """Descarga el logo (si hay) y arma el PDF fuera del bucle de eventos."""
    if not tarjetas:
        raise ErrorCarta("CONFLICTO", "Crea al menos una mesa antes de imprimir los códigos.", 409)
    crudo = await descargar_logo(logo_url, transporte=transporte)
    logo = await asyncio.to_thread(preparar_logo, crudo)
    return await asyncio.to_thread(generar_pdf, nombre, logo, tarjetas)


def nombre_de_archivo(slug: str) -> str:
    """Nombre seguro para `Content-Disposition`: sólo `[a-z0-9-]` del slug, nunca el nombre
    del restaurante en crudo."""
    limpio = re.sub(r"[^a-z0-9-]", "", slug.lower())[:60].strip("-")
    return f"qr-mesas-{limpio}.pdf" if limpio else "qr-mesas.pdf"
