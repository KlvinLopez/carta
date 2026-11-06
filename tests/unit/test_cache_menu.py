"""T-1.3: caché del menú en proceso (30 s) y purga de Cloudflare (`app/services/cache_menu.py`)."""

from __future__ import annotations

import asyncio
import json
from collections.abc import Iterable

import httpx
import pytest
from pydantic import SecretStr, ValidationError

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
    cache.invalidar("a")
    await cache.esperar_purgas()
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
    cache = CacheMenu(ventana=0)
    cache.invalidar("la-ceiba", "la-ceiba")
    await cache.esperar_purgas()
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


# --- A6 · generación por slug ------------------------------------------------------------


@pytest.mark.ac("AC-16.1")
def test_un_menu_leido_antes_de_invalidar_no_se_guarda() -> None:
    """La carrera lectura/escritura: la lectura toma la generación, consulta la base, una
    escritura invalida en medio y la lectura guarda después. Sin generación quedaría 30 s."""
    cache = CacheMenu()
    leida = cache.generacion("la-ceiba")
    cache.invalidar("la-ceiba")  # la escritura confirma e invalida mientras la lectura consulta
    assert cache.guardar("la-ceiba", {"menu": "viejo"}, leida) is False
    assert cache.obtener("la-ceiba") is None
    nueva = cache.generacion("la-ceiba")
    assert nueva == leida + 1
    assert cache.guardar("la-ceiba", {"menu": "nuevo"}, nueva) is True
    assert cache.obtener("la-ceiba") == {"menu": "nuevo"}


def test_la_generacion_es_por_slug() -> None:
    cache = CacheMenu()
    g = cache.generacion("otro")
    cache.invalidar("la-ceiba")
    assert cache.guardar("otro", 1, g) is True
    assert cache.generacion("otro") == g


async def test_las_purgas_seguidas_salen_juntas_y_lo_que_llega_durante_una_purga_no_se_pierde() -> (
    None
):
    llamadas: list[list[str]] = []
    liberar = asyncio.Event()

    class Purgador(PurgadorCloudflare):
        async def purgar(self, urls: Iterable[str]) -> bool:
            llamadas.append(sorted(urls))
            if len(llamadas) == 1:
                await liberar.wait()
            return True

    cache = CacheMenu(purgador=Purgador("z", "t"), ventana=0.01)
    cache.invalidar("a")
    cache.invalidar("b")
    await asyncio.sleep(0.05)  # la primera purga (a, b) está en vuelo
    cache.invalidar("c")
    liberar.set()
    await cache.esperar_purgas()
    assert [[u.rsplit("/", 1)[1] for u in llamada] for llamada in llamadas] == [["a", "b"], ["c"]]


def test_invalidar_sin_bucle_no_falla() -> None:
    cache = CacheMenu()
    cache.guardar("a", 1)
    cache.invalidar("a")  # fuera de un bucle de eventos: sólo la caché local
    assert cache.obtener("a") is None


# --- B2 · el id de zona va en la URL: sólo 32 hex -----------------------------------------


@pytest.mark.parametrize(
    "zona",
    ["../../accounts/x?y=", "zona-pruebas", "A" * 32, "a" * 31, "a" * 33, "a" * 32 + "/x"],
)
def test_un_id_de_zona_que_no_es_hexadecimal_se_rechaza(zona: str) -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, CLOUDFLARE_ZONE_ID=zona)  # type: ignore[call-arg]


def test_un_id_de_zona_valido_o_vacio_se_acepta() -> None:
    assert Settings(_env_file=None, CLOUDFLARE_ZONE_ID="0" * 32).CLOUDFLARE_ZONE_ID == "0" * 32  # type: ignore[call-arg]
    vacio = Settings(_env_file=None, CLOUDFLARE_ZONE_ID="", CLOUDFLARE_API_TOKEN="")  # type: ignore[call-arg]
    assert (vacio.CLOUDFLARE_ZONE_ID, vacio.CLOUDFLARE_API_TOKEN, vacio.purga_cloudflare) == (
        None,
        None,
        False,
    )
