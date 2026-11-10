"""URLs públicas que Carta imprime o comparte (el QR de cada mesa)."""

from __future__ import annotations

from app.core.config import settings


def url_de_mesa(codigo_publico: str) -> str:
    """`https://{DOMINIO}/m/{codigo}`: lo que lleva el QR de la mesa. El código es
    `token_urlsafe` (letras, dígitos, `-` y `_`), así que va tal cual en la ruta."""
    return f"https://{settings.DOMINIO}/m/{codigo_publico}"
