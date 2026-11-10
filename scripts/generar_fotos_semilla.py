"""Genera las fotos de muestra de la semilla de desarrollo (T-1.7).

    uv run python scripts/generar_fotos_semilla.py

No son fotografías de comida: son composiciones sintéticas (plato, fondo y motas con un tono
propio por platillo) generadas con Pillow, deterministas y de unos pocos KB, que bastan para
ver el menú con foto y probar las variantes WebP sin depender de derechos de imagen ni de
red. Las fotos reales de un restaurante las sube el operador desde el panel. Los nombres de
archivo son los `slug_foto` de `scripts/seed.py`. Volver a correrlo reescribe los mismos bytes.
"""

from __future__ import annotations

import colorsys
import hashlib
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

RAIZ = Path(__file__).resolve().parents[1]
DESTINO = RAIZ / "tests" / "fixtures" / "fotos"
ANCHO, ALTO = 960, 720
LIMITE_BYTES = 200 * 1024


def _color(tono: float, saturacion: float, valor: float) -> tuple[int, int, int]:
    r, g, b = colorsys.hsv_to_rgb(tono % 1.0, saturacion, valor)
    return int(r * 255), int(g * 255), int(b * 255)


def componer(slug: str) -> Image.Image:
    semilla = int.from_bytes(hashlib.sha256(slug.encode()).digest()[:8], "big")
    azar = random.Random(semilla)
    tono = (semilla % 360) / 360
    imagen = Image.new("RGB", (ANCHO, ALTO), _color(tono + 0.5, 0.25, 0.30))
    pintor = ImageDraw.Draw(imagen)
    for _ in range(40):  # motas desenfocadas: el fondo de una mesa de madera
        x, y, r = azar.randrange(ANCHO), azar.randrange(ALTO), azar.randrange(30, 120)
        pintor.ellipse(
            (x - r, y - r, x + r, y + r), fill=_color(tono + 0.5, 0.3, azar.uniform(0.2, 0.4))
        )
    imagen = imagen.filter(ImageFilter.GaussianBlur(24))
    pintor = ImageDraw.Draw(imagen)
    cx, cy = ANCHO // 2, ALTO // 2
    pintor.ellipse((cx - 300, cy - 300, cx + 300, cy + 300), fill=_color(0.1, 0.05, 0.96))
    pintor.ellipse((cx - 240, cy - 240, cx + 240, cy + 240), fill=_color(0.1, 0.08, 0.90))
    for _ in range(14):  # el platillo: manchas de color alrededor del centro
        x, y = cx + azar.randrange(-170, 170), cy + azar.randrange(-170, 170)
        r = azar.randrange(30, 80)
        pintor.ellipse(
            (x - r, y - r, x + r, y + r),
            fill=_color(tono + azar.uniform(-0.06, 0.06), 0.65, azar.uniform(0.55, 0.9)),
        )
    return imagen.filter(ImageFilter.GaussianBlur(2))


def main(slugs: list[str]) -> int:
    DESTINO.mkdir(parents=True, exist_ok=True)
    for slug in slugs:
        ruta = DESTINO / f"{slug}.jpg"
        componer(slug).save(ruta, "JPEG", quality=78, optimize=True)
        assert ruta.stat().st_size <= LIMITE_BYTES, ruta
    print(f"{len(slugs)} fotos en {DESTINO}")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(RAIZ))
    from scripts.seed import PLATILLOS

    sys.exit(main([p.slug_foto for p in PLATILLOS if p.slug_foto]))
