"""Ayudantes de las pruebas del menú público (T-2.2): reloj a mano de `cache_menu`."""

from __future__ import annotations

from collections.abc import Iterator

from app.services.cache_menu import cache_menu


class Reloj:
    """Reloj monótono falso de `cache_menu`: la edad de la copia local se controla a mano."""

    def __init__(self) -> None:
        self.ahora = 1000.0

    def __call__(self) -> float:
        return self.ahora

    def avanzar(self, segundos: float) -> None:
        self.ahora += segundos


def reloj_falso() -> Iterator[Reloj]:
    """Cuerpo de la fixture `reloj` (autouse en cada archivo): caché vacía y reloj a mano."""
    falso = Reloj()
    anterior, ventana = cache_menu.reloj, cache_menu.ventana
    cache_menu.reloj = falso
    cache_menu.ventana = 0.01
    cache_menu.vaciar()
    try:
        yield falso
    finally:
        cache_menu.cancelar_purgas()
        cache_menu.reloj, cache_menu.ventana = anterior, ventana
        cache_menu.vaciar()
