"""T-1.8 (opcional): extracción con la API real de Claude sobre las cartas de prueba.

No corre por defecto (`addopts = -m "not live"` en pyproject) y se salta sin `ANTHROPIC_API_KEY`.
Cuesta dinero: ≈ 0.15–0.25 USD por carta con Opus 5.5 (02 §5).

    ANTHROPIC_API_KEY=... uv run pytest tests/live/test_importacion_live.py -q -m live

Toma cada carta de `tests/fixtures/menus/` (y de `externas/`, si se descargaron) que tenga un
`<nombre>.esperado.json` anotado a mano y exige que ≥ 90 % de los precios salgan con confianza
`alta` y el valor correcto (ADR-014). Los precios sin valor fijo (`null` en lo esperado, como
"M.P.") nunca deben salir con confianza `alta`.
"""

from __future__ import annotations

import json
import os
import unicodedata
from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest

from app.schemas.importacion import PlatilloImportado, ResultadoImportacion
from app.services.importacion_menu import extraer_menu

MENUS = Path(__file__).resolve().parent.parent / "fixtures" / "menus"
UMBRAL = 0.9

pytestmark = [
    pytest.mark.live,
    pytest.mark.skipif(not os.environ.get("ANTHROPIC_API_KEY"), reason="sin ANTHROPIC_API_KEY"),
    pytest.mark.timeout(400),
]


def _cartas() -> list[Path]:
    pdfs = sorted(MENUS.glob("*.pdf")) + sorted((MENUS / "externas").glob("*.pdf"))
    return [pdf for pdf in pdfs if pdf.with_suffix(".esperado.json").exists()]


def _clave(texto: str) -> str:
    sin_acentos = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return " ".join(sin_acentos.lower().split())


def _medir(resultado: ResultadoImportacion, esperado: list[dict[str, Any]]) -> dict[str, Any]:
    leidos: dict[str, PlatilloImportado] = {
        _clave(p.nombre): p for c in resultado.categorias for p in c.platillos
    }
    con_precio = [e for e in esperado if e["precio"] is not None]
    aciertos, fallos = 0, []
    for e in con_precio:
        p = leidos.get(_clave(e["nombre"]))
        if p and p.precio == Decimal(str(e["precio"])) and p.precio_confianza == "alta":
            aciertos += 1
        else:
            fallos.append((e["nombre"], e["precio"], p and (p.precio, p.precio_confianza)))
    sin_precio_en_alta = [
        e["nombre"]
        for e in esperado
        if e["precio"] is None
        and (p := leidos.get(_clave(e["nombre"])))
        and p.precio_confianza == "alta"
    ]
    return {
        "precision": aciertos / len(con_precio),
        "fallos": fallos,
        "sin_precio_en_alta": sin_precio_en_alta,
    }


@pytest.mark.ac("AC-25.2", "AC-25.5")
@pytest.mark.parametrize("pdf", _cartas(), ids=lambda p: p.stem)
async def test_precision_de_precios_con_la_api_real(pdf: Path) -> None:
    esperado = json.loads(pdf.with_suffix(".esperado.json").read_text("utf-8"))

    resultado = await extraer_menu(pdf.read_bytes(), "application/pdf")
    medida = _medir(resultado, esperado)

    print(f"{pdf.stem}: precisión {medida['precision']:.0%}; fallos {medida['fallos']}")
    assert medida["sin_precio_en_alta"] == []
    assert medida["precision"] >= UMBRAL, medida["fallos"]
