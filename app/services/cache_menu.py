"""Caché del menú público (`GET /api/v1/p/menu/{slug}`, 02 §4 y §9). Sin FastAPI.

Dos capas, por `slug`:

- **En proceso, 30 s** (`CacheMenu`): el menú ya armado que guarda T-2.x. Cada worker tiene
  la suya; `invalidar` borra la de este worker y las demás caducan solas en ≤ 30 s (sin
  Redis, 02 §9).
- **Cloudflare, `s-maxage=60`**: `invalidar` programa la purga de la URL del menú por la API
  de Cloudflare sólo cuando `Settings` trae `CLOUDFLARE_ZONE_ID` y `CLOUDFLARE_API_TOKEN`.

**Generación por `slug`** (revisión de T-1.3, A6): `invalidar` la incrementa. Quien arma el
menú toma `generacion(slug)` **antes** de consultar la base y la pasa a `guardar`; si en
medio hubo una escritura, la entrada se descarta (si no, un menú leído antes del `commit` y
guardado después quedaría 30 s). T-2.1 pone la generación (o `max(actualizado_en)`) en el
ETag y no rellena el borde con una entrada de otra generación.

**La purga va fuera de la petición** (B4): `invalidar` es síncrona y deja el `slug` en una
cola; una tarea en segundo plano espera `ventana` (200 ms), junta los `slug` pendientes y
hace **una** llamada. Nunca hace fallar ni demorar la escritura: un error o un plazo vencido
(3 s) se registra (`PURGA_FALLIDA`) y el borde caduca solo. Una purga pendiente al apagar el
proceso se pierde (el borde caduca en 60 s). Las pruebas esperan la cola con
`esperar_purgas()`. El cliente HTTP de la purga es inyectable
(`PurgadorCloudflare(cliente=...)`) para probarlo con `httpx.MockTransport`.
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
VENTANA_PURGA_SEGUNDOS = 0.2  # junta las purgas de escrituras seguidas
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
    generacion: int


class CacheMenu:
    """Caché en proceso por `slug` con vigencia fija, generación y purga agrupada del borde.

    `purgador` explícito (pruebas) o, si es `None`, el de `Settings` en cada purga (así un
    cambio de configuración en pruebas no exige reconstruir la caché).
    """

    def __init__(
        self,
        vigencia: float = VIGENCIA_SEGUNDOS,
        reloj: Callable[[], float] = time.monotonic,
        purgador: PurgadorCloudflare | None = None,
        max_entradas: int = MAX_ENTRADAS,
        ventana: float = VENTANA_PURGA_SEGUNDOS,
    ) -> None:
        self.vigencia = vigencia
        self.reloj = reloj
        self.purgador = purgador
        self.max_entradas = max_entradas
        self.ventana = ventana
        self._entradas: OrderedDict[str, _Entrada] = OrderedDict()
        self._generaciones: dict[str, int] = {}
        self._pendientes: set[str] = set()
        self._tarea: asyncio.Task[None] | None = None
        self.invalidaciones = 0  # cuántas veces se invalidó (diagnóstico y pruebas)

    # --- lectura y escritura locales -------------------------------------------------

    def generacion(self, slug: str) -> int:
        return self._generaciones.get(slug, 0)

    def obtener(self, slug: str) -> Any | None:
        entrada = self._entradas.get(slug)
        if entrada is None:
            return None
        if entrada.vence <= self.reloj() or entrada.generacion != self.generacion(slug):
            del self._entradas[slug]
            return None
        return entrada.valor

    def guardar(self, slug: str, valor: Any, generacion: int | None = None) -> bool:
        """Guarda el menú armado. `generacion` es la que se leyó antes de consultar la base:
        si cambió en medio, no se guarda (`False`)."""
        vigente = self.generacion(slug)
        if generacion is not None and generacion != vigente:
            return False
        self._entradas.pop(slug, None)
        self._entradas[slug] = _Entrada(valor, self.reloj() + self.vigencia, vigente)
        while len(self._entradas) > self.max_entradas:
            self._entradas.popitem(last=False)
        return True

    def vaciar(self) -> None:
        self._entradas.clear()

    # --- invalidación ----------------------------------------------------------------

    def invalidar(self, *slugs: str) -> None:
        """Borra el menú de este worker, sube su generación y programa la purga del borde.
        Síncrona y nunca lanza: se llama después del `commit()`."""
        self.invalidaciones += 1
        for slug in slugs:
            self._entradas.pop(slug, None)
            self._generaciones[slug] = self.generacion(slug) + 1
        self._pendientes.update(slugs)
        if self._tarea is None or self._tarea.done():
            try:
                self._tarea = asyncio.get_running_loop().create_task(self._purgar_pendientes())
            except RuntimeError:  # sin bucle (script síncrono): sólo la caché local
                self._pendientes.clear()

    async def _purgar_pendientes(self) -> None:
        # Lo que se invalide mientras sale una purga entra en la vuelta siguiente: entre la
        # comprobación del `while` y el fin de la tarea no hay `await`, así que `invalidar`
        # no puede quedar en medio.
        while self._pendientes:
            await asyncio.sleep(self.ventana)
            slugs, self._pendientes = self._pendientes, set()
            purgador = self.purgador or purgador_desde_settings()
            if purgador is not None:
                await purgador.purgar(url_del_menu(slug) for slug in slugs)

    async def esperar_purgas(self) -> None:
        """Espera a que salga la purga pendiente (pruebas)."""
        while self._tarea is not None and not self._tarea.done():
            await self._tarea

    def cancelar_purgas(self) -> None:
        if self._tarea is not None and not self._tarea.done():
            self._tarea.cancel()
        self._tarea = None
        self._pendientes.clear()


cache_menu = CacheMenu()
