"""Caché del menú público (`GET /api/v1/p/menu/{slug}`, 02 §4 y §9). Sin FastAPI.

Dos capas, por `slug`:

- **En proceso, 30 s** (`CacheMenu`): el menú ya armado que guarda T-2.x. Cada worker tiene
  la suya; `invalidar` borra la de este worker y las demás caducan solas en ≤ 30 s (sin
  Redis, 02 §9).
- **Cloudflare, `s-maxage=60`**: `invalidar` purga la URL del menú por la API de Cloudflare
  sólo cuando `Settings` trae `CLOUDFLARE_ZONE_ID` y `CLOUDFLARE_API_TOKEN`. La purga nunca
  hace fallar la escritura del operador: un error o un plazo vencido (3 s en total) se
  registra y el borde caduca solo.

Toda escritura del menú (`app.services.menu`) llama a `invalidar` después del `commit()`.
El cliente HTTP de la purga es inyectable (`PurgadorCloudflare(cliente=...)`) para probarlo
con `httpx.MockTransport`.
"""

from __future__ import annotations

import asyncio
import logging
import time
from collections import OrderedDict
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import settings

log = logging.getLogger("carta.cache_menu")

VIGENCIA_SEGUNDOS = 30.0
MAX_ENTRADAS = 2000  # un menú por restaurante; el más viejo sale primero
PLAZO_PURGA_SEGUNDOS = 3.0
API_CLOUDFLARE = "https://api.cloudflare.com/client/v4"


def url_del_menu(slug: str, dominio: str | None = None) -> str:
    """La URL pública que cachea el borde (02 §4)."""
    return f"https://{dominio or settings.DOMINIO}/api/v1/p/menu/{slug}"


class PurgadorCloudflare:
    """`POST /zones/{zona}/purge_cache` con `{"files": [...]}`. Nunca lanza."""

    def __init__(
        self,
        zona: str,
        token: str,
        cliente: httpx.AsyncClient | None = None,
        plazo: float = PLAZO_PURGA_SEGUNDOS,
    ) -> None:
        self.zona = zona
        self._token = token
        self._cliente = cliente
        self.plazo = plazo

    async def purgar(self, urls: Iterable[str]) -> bool:
        archivos = sorted(set(urls))
        if not archivos:
            return True
        try:
            async with asyncio.timeout(self.plazo):
                if self._cliente is not None:
                    respuesta = await self._enviar(self._cliente, archivos)
                else:
                    async with httpx.AsyncClient(timeout=self.plazo) as cliente:
                        respuesta = await self._enviar(cliente, archivos)
        except Exception as error:  # red, plazo, TLS…: el borde caduca solo en 60 s
            log.warning(
                "purga de Cloudflare fallida: %s",
                type(error).__name__,
                extra={"codigo": "PURGA_FALLIDA"},
            )
            return False
        if respuesta.is_success:
            return True
        # El cuerpo de Cloudflare no se registra: puede repetir datos de la cuenta.
        log.warning(
            "purga de Cloudflare rechazada",
            extra={"codigo": "PURGA_FALLIDA", "http": respuesta.status_code},
        )
        return False

    async def _enviar(self, cliente: httpx.AsyncClient, archivos: list[str]) -> httpx.Response:
        return await cliente.post(
            f"{API_CLOUDFLARE}/zones/{self.zona}/purge_cache",
            json={"files": archivos},
            headers={"Authorization": f"Bearer {self._token}"},
        )


def purgador_desde_settings() -> PurgadorCloudflare | None:
    """`None` sin credenciales: sólo se invalida la caché en proceso."""
    if not (settings.CLOUDFLARE_ZONE_ID and settings.CLOUDFLARE_API_TOKEN):
        return None
    return PurgadorCloudflare(
        settings.CLOUDFLARE_ZONE_ID, settings.CLOUDFLARE_API_TOKEN.get_secret_value()
    )


@dataclass
class _Entrada:
    valor: Any
    vence: float


class CacheMenu:
    """Caché en proceso por `slug` con vigencia fija y purga del borde al invalidar.

    `purgador` explícito (pruebas) o, si es `None`, el de `Settings` en cada invalidación
    (así un cambio de configuración en pruebas no exige reconstruir la caché).
    """

    def __init__(
        self,
        vigencia: float = VIGENCIA_SEGUNDOS,
        reloj: Callable[[], float] = time.monotonic,
        purgador: PurgadorCloudflare | None = None,
        max_entradas: int = MAX_ENTRADAS,
    ) -> None:
        self.vigencia = vigencia
        self.reloj = reloj
        self.purgador = purgador
        self.max_entradas = max_entradas
        self._entradas: OrderedDict[str, _Entrada] = OrderedDict()
        self.invalidaciones = 0  # cuántas veces se invalidó (diagnóstico y pruebas)

    def obtener(self, slug: str) -> Any | None:
        entrada = self._entradas.get(slug)
        if entrada is None:
            return None
        if entrada.vence <= self.reloj():
            del self._entradas[slug]
            return None
        return entrada.valor

    def guardar(self, slug: str, valor: Any) -> None:
        self._entradas.pop(slug, None)
        self._entradas[slug] = _Entrada(valor, self.reloj() + self.vigencia)
        while len(self._entradas) > self.max_entradas:
            self._entradas.popitem(last=False)

    def invalidar_local(self, *slugs: str) -> None:
        for slug in slugs:
            self._entradas.pop(slug, None)

    async def invalidar(self, *slugs: str) -> None:
        """Borra el menú de este worker y lo purga del borde. Nunca lanza."""
        self.invalidaciones += 1
        self.invalidar_local(*slugs)
        purgador = self.purgador or purgador_desde_settings()
        if purgador is not None:
            await purgador.purgar(url_del_menu(slug) for slug in slugs)

    def vaciar(self) -> None:
        self._entradas.clear()


cache_menu = CacheMenu()
