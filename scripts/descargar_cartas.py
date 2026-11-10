"""Descarga las cartas reales de prueba a tests/fixtures/menus/externas/ (carpeta ignorada por git).

Son documentos públicos de terceros con derechos de autor: se usan sólo como datos de prueba
locales y no se suben al repositorio. Las fuentes están en tests/fixtures/menus/README.md.

Uso: uv run python scripts/descargar_cartas.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import httpx

DESTINO = Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "menus" / "externas"

CARTAS: dict[str, str] = {
    # Máximo Bistrot (CDMX): 50 páginas, un platillo por página. Caso límite: excede el máximo de 30.
    "maximo-bistrot.pdf": (
        "https://www.maximobistrot.com.mx/wp-content/uploads/2026/04/Menu-Web-14-Abril.pdf"
    ),
    # Carta "México Lindo y Qué Rico" (Orizaba, Veracruz): 6 páginas escaneadas sin texto extraíble.
    "mexico-lindo-orizaba.pdf": (
        "https://orizaba.travel/wp-content/uploads/2024/12/Carta-Mexico-Lindo-y-que-rico.pdf"
    ),
    # La Cantina Palacio (Gastronomía Palacio de Hierro): 9 páginas con texto, diseño editorial.
    "palacio-cantina.pdf": (
        "https://www.elpalaciodehierro.com/on/demandware.static/-/Library-Sites-palacio-content-global/default/PDF/Menus/comida-cantina.pdf"
    ),
}


def main() -> int:
    DESTINO.mkdir(parents=True, exist_ok=True)
    fallos = 0
    with httpx.Client(
        follow_redirects=True, timeout=60, headers={"User-Agent": "Mozilla/5.0"}
    ) as cliente:
        for nombre, url in CARTAS.items():
            ruta = DESTINO / nombre
            if ruta.exists() and ruta.stat().st_size > 0:
                print(f"ya existe: {ruta}")
                continue
            try:
                respuesta = cliente.get(url)
                respuesta.raise_for_status()
                if not respuesta.content.startswith(b"%PDF"):
                    raise ValueError("la respuesta no es un PDF")
                ruta.write_bytes(respuesta.content)
                print(f"descargado: {ruta} ({len(respuesta.content) // 1024} KB)")
            except Exception as error:  # noqa: BLE001 — se informa y se sigue con la siguiente
                fallos += 1
                print(f"falló {nombre}: {error}", file=sys.stderr)
    return 1 if fallos else 0


if __name__ == "__main__":
    raise SystemExit(main())
