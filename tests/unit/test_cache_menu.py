"""T-1.3: caché del menú en proceso (30 s) y purga de Cloudflare (`app/services/cache_menu.py`)."""

from __future__ import annotations

import asyncio
import json

import httpx
import pytest
from pydantic import SecretStr

from app.core.config import Settings, settings
from app.services import cache_menu as modulo
from app.services.cache_menu import CacheMenu, PurgadorCloudflare, purgador_desde_settings

ClienteReal = httpx.AsyncClient  # antes de que una prueba sustituya `httpx.AsyncClient`


class Reloj:
    def __init__(self) -> None:
        self.ahora = 1000.0

    def __call__(self) -> float:
        return self.ahora


@pytest.mark.ac("AC-16.1")
def test_la_entrada_vive_30_segundos() -> None:
    reloj = Reloj()
    cache = CacheMenu(reloj=reloj)
    cache.guardar("la-ceiba", {"v": 1})
    reloj.ahora += 29.9
    assert cache.obtener("la-ceiba") == {"v": 1}
    reloj.ahora += 0.1
    assert cache.obtener("la-ceiba") is None
    assert cache.obtener("otro") is None


def test_el_tamano_esta_acotado() -> None:
    cache = CacheMenu(max_entradas=2)
    for slug in ("a", "b", "c"):
        cache.guardar(slug, slug)
    assert (cache.obtener("a"), cache.obtener("b"), cache.obtener("c")) == (None, "b", "c")


@pytest.mark.ac("AC-16.1")
async def test_invalidar_sin_credenciales_solo_borra_lo_local(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "CLOUDFLARE_ZONE_ID", None)
    monkeypatch.setattr(settings, "CLOUDFLARE_API_TOKEN", None)
    llamadas: list[httpx.Request] = []

    def prohibido(peticion: httpx.Request) -> httpx.Response:  # pragma: no cover
        llamadas.append(peticion)
        return httpx.Response(200)

    monkeypatch.setattr(
        modulo.httpx,
        "AsyncClient",
        lambda **_: ClienteReal(transport=httpx.MockTransport(prohibido)),
    )
    cache = CacheMenu()
    cache.guardar("a", 1)
    cache.guardar("b", 2)
    await cache.invalidar("a")
    assert (cache.obtener("a"), cache.obtener("b")) == (None, 2)
    assert llamadas == []
    assert purgador_desde_settings() is None


@pytest.mark.parametrize(
    ("zona", "token"),
    [("zona", None), (None, "token"), ("", "token")],
    ids=["sin token", "sin zona", "zona vacía"],
)
def test_hacen_falta_las_dos_credenciales(
    monkeypatch: pytest.MonkeyPatch, zona: str | None, token: str | None
) -> None:
    monkeypatch.setattr(settings, "CLOUDFLARE_ZONE_ID", zona)
    monkeypatch.setattr(settings, "CLOUDFLARE_API_TOKEN", SecretStr(token) if token else None)
    assert purgador_desde_settings() is None
    assert settings.purga_cloudflare is False


@pytest.mark.ac("AC-16.1")
async def test_con_credenciales_purga_la_url_del_menu(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "CLOUDFLARE_ZONE_ID", "z123")
    monkeypatch.setattr(settings, "CLOUDFLARE_API_TOKEN", SecretStr("tok-secreto"))
    monkeypatch.setattr(settings, "DOMINIO", "carta.example")
    recibidas: list[httpx.Request] = []

    def cloudflare(peticion: httpx.Request) -> httpx.Response:
        recibidas.append(peticion)
        return httpx.Response(200, json={"success": True})

    monkeypatch.setattr(
        modulo.httpx,
        "AsyncClient",
        lambda **_: ClienteReal(transport=httpx.MockTransport(cloudflare)),
    )
    assert settings.purga_cloudflare is True
    await CacheMenu().invalidar("la-ceiba", "la-ceiba")
    (peticion,) = recibidas
    assert str(peticion.url) == "https://api.cloudflare.com/client/v4/zones/z123/purge_cache"
    assert peticion.headers["authorization"] == "Bearer tok-secreto"
    assert json.loads(peticion.content) == {
        "files": ["https://carta.example/api/v1/p/menu/la-ceiba"]
    }


async def test_la_purga_respeta_su_plazo_y_no_lanza() -> None:
    async def lento(peticion: httpx.Request) -> httpx.Response:
        await asyncio.sleep(5)
        return httpx.Response(200)  # pragma: no cover

    cliente = httpx.AsyncClient(transport=httpx.MockTransport(lento))
    purgador = PurgadorCloudflare("z", "t", cliente=cliente, plazo=0.05)
    assert await purgador.purgar(["https://x/api/v1/p/menu/a"]) is False


async def test_sin_urls_no_llama() -> None:
    purgador = PurgadorCloudflare("z", "t", cliente=None)
    assert await purgador.purgar([]) is True


def test_el_token_no_aparece_en_la_configuracion() -> None:
    config = Settings(_env_file=None, CLOUDFLARE_API_TOKEN="tok-secreto")  # type: ignore[call-arg]
    assert "tok-secreto" not in repr(config)
