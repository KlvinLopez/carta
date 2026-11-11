"""T-2.3: analítica del piloto (US-24) — `scan` al entrar y `POST /p/eventos`.

- AC-24.1: se registran los eventos de 01 §7 que tocan a esta fase: `scan` (servidor, al
  entrar) y `menu_view`, `dish_view`, `search`, `filter` (el teléfono).
- AC-24.2: ninguna fila guarda una IP en claro (sólo `ip_hash` con sal diaria) ni el *user
  agent* completo, y ninguna línea de log lleva la IP.
- Un fallo de analítica nunca tumba `entrar` ni `eventos` (04_API_Spec §2.6).
"""

from __future__ import annotations

import hashlib
import logging
from datetime import UTC, date, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.datastructures import Headers
from starlette.requests import Request

from app.api.publico import limites
from app.api.publico.eventos import origen_de
from app.db.models import EventoAnalitica, Mesa, MiembroSesion, Platillo, Restaurante
from app.services import analitica
from app.services import sesion as servicio_sesion
from tests.conftest import Fabrica
from tests.invitado_pruebas import P, con_token, entrar, token_de

IP = "198.51.101.77"
IP_CF = "173.245.48.10"
UA_IPHONE = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1"
)
UA_ANDROID = (
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/130.0.0.0 Mobile Safari/537.36"
)
# HMAC-SHA256 de IP con la sal de cada día y SECRET_KEY = "llave-de-prueba-" + "k" * 32,
# calculados aparte con hmac/hashlib (vector fijo).
HASH_1_ENERO = "cc54c76815ed69030d5820903507aa6a354d6d40ef1c5572234b7069154cc0c6"
HASH_2_ENERO = "eb1265f43f3a5479c1c7560234baf3480816f524fe3ea14c524a9586f833feeb"
POR_CLOUDFLARE = {
    "X-Forwarded-For": f"10.9.9.9, {IP}, {IP_CF}",
    "CF-Connecting-IP": IP,
    "User-Agent": UA_IPHONE,
}


async def _eventos(sesion: AsyncSession, **filtro: Any) -> list[EventoAnalitica]:
    consulta = select(EventoAnalitica).filter_by(**filtro).order_by(EventoAnalitica.id)
    return list((await sesion.scalars(consulta)).all())


async def _entrar(cliente: AsyncClient, mesa: Mesa, **cabeceras: str) -> tuple[Any, str]:
    respuesta = await cliente.post(
        f"{P}/sesion/entrar", json={"codigo_mesa": mesa.codigo_publico}, headers=cabeceras
    )
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json(), token_de(respuesta)


async def _lote(cliente: AsyncClient, token: str, eventos: list[dict[str, Any]], **cab: str) -> int:
    respuesta = await cliente.post(
        f"{P}/eventos", json={"eventos": eventos}, headers={**con_token(token), **cab}
    )
    assert respuesta.status_code == 202, respuesta.text
    assert respuesta.content == b""
    return respuesta.status_code


# ---------------------------------------------------------------------------
# AC-24.1 · scan al entrar
# ---------------------------------------------------------------------------


class Reloj:
    def __init__(self) -> None:
        self.ahora = 9000.0

    def __call__(self) -> float:
        return self.ahora


@pytest.fixture
def reloj(monkeypatch: pytest.MonkeyPatch) -> Reloj:
    r = Reloj()
    for limitador in (limites.scan_por_miembro, limites.eventos_por_token, limites.por_token):
        monkeypatch.setattr(limitador, "reloj", r)
    return r


@pytest.mark.ac("AC-24.1")
async def test_entrar_registra_scan_con_mesa_sesion_y_miembro(
    cliente: AsyncClient, sesion: AsyncSession, mesa: Mesa, restaurante: Restaurante, reloj: Reloj
) -> None:
    cuerpo, token = await _entrar(cliente, mesa, **POR_CLOUDFLARE)
    # Reanudar con la cookie pasado un minuto es otro escaneo.
    reloj.ahora += 60
    respuesta, _ = await entrar(cliente, mesa.codigo_publico, token)
    assert respuesta.status_code == 200
    filas = await _eventos(sesion, restaurante_id=restaurante.id)
    assert [f.tipo for f in filas] == ["scan", "scan"]
    for fila in filas:
        assert fila.mesa_id == mesa.id
        assert str(fila.sesion_id) == cuerpo["sesion"]["id"]
        assert str(fila.miembro_id) == cuerpo["miembro"]["id"]
        assert fila.platillo_id is None
        assert fila.propiedades == {}
    assert filas[0].user_agent_fam == "ios-safari"
    assert filas[1].user_agent_fam == "bot"  # httpx manda `python-httpx/…`


@pytest.mark.ac("AC-24.1")
async def test_recargar_no_escribe_un_scan_cada_vez_pero_el_miembro_nuevo_siempre(
    cliente: AsyncClient, sesion: AsyncSession, mesa: Mesa, restaurante: Restaurante, reloj: Reloj
) -> None:
    """B1: 20 `entrar` seguidos con la misma cookie → un `scan` de ese miembro; otro miembro
    nuevo en el mismo instante tiene el suyo."""
    cuerpo, token = await _entrar(cliente, mesa)
    for _ in range(19):
        respuesta, _ = await entrar(cliente, mesa.codigo_publico, token)
        assert respuesta.status_code == 200
    otro, _ = await _entrar(cliente, mesa)
    filas = await _eventos(sesion, restaurante_id=restaurante.id, tipo="scan")
    assert sorted(str(f.miembro_id) for f in filas) == sorted(
        [cuerpo["miembro"]["id"], otro["miembro"]["id"]]
    )


@pytest.mark.ac("AC-24.1")
async def test_entrar_fallido_no_registra_nada(
    cliente: AsyncClient, sesion: AsyncSession, restaurante: Restaurante
) -> None:
    respuesta = await cliente.post(f"{P}/sesion/entrar", json={"codigo_mesa": "x" * 30})
    assert respuesta.status_code == 404
    assert await _eventos(sesion, restaurante_id=restaurante.id) == []


# ---------------------------------------------------------------------------
# AC-24.1 · eventos del teléfono
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-24.1")
async def test_eventos_del_telefono_se_guardan_con_lo_que_dice_el_token(
    cliente: AsyncClient,
    sesion: AsyncSession,
    mesa: Mesa,
    restaurante: Restaurante,
    platillo: Platillo,
) -> None:
    cuerpo, token = await _entrar(cliente, mesa)
    await _lote(
        cliente,
        token,
        [
            {"tipo": "menu_view"},
            {"tipo": "dish_view", "platillo_id": str(platillo.id)},
            {"tipo": "search"},
            {"tipo": "filter"},
        ],
        **{"User-Agent": UA_ANDROID},
    )
    filas = await _eventos(sesion, restaurante_id=restaurante.id)
    tipos = [f.tipo for f in filas]
    assert tipos == ["scan", "menu_view", "dish_view", "search", "filter"]
    for fila in filas[1:]:
        assert fila.mesa_id == mesa.id
        assert str(fila.sesion_id) == cuerpo["sesion"]["id"]
        assert str(fila.miembro_id) == cuerpo["miembro"]["id"]
        assert fila.user_agent_fam == "android-chrome"
    assert filas[2].platillo_id == platillo.id
    assert [f.platillo_id for f in filas if f.tipo != "dish_view"] == [None] * 4


@pytest.mark.ac("AC-24.1")
async def test_dish_view_de_otro_restaurante_o_inexistente_se_descarta(
    cliente: AsyncClient,
    sesion: AsyncSession,
    mesa: Mesa,
    restaurante: Restaurante,
    platillo: Platillo,
    fabrica_restaurante: Fabrica,
    fabrica_platillo: Fabrica,
) -> None:
    ajeno = await fabrica_platillo(await fabrica_restaurante())
    _, token = await _entrar(cliente, mesa)
    await _lote(
        cliente,
        token,
        [
            {"tipo": "dish_view", "platillo_id": str(ajeno.id)},
            {"tipo": "dish_view", "platillo_id": str(uuid4())},
            {"tipo": "dish_view"},
            {"tipo": "menu_view", "platillo_id": str(ajeno.id)},  # se guarda sin platillo
            {"tipo": "dish_view", "platillo_id": str(platillo.id)},
        ],
    )
    filas = await _eventos(sesion, restaurante_id=restaurante.id)
    assert [(f.tipo, f.platillo_id) for f in filas] == [
        ("scan", None),
        ("menu_view", None),
        ("dish_view", platillo.id),
    ]
    assert await _eventos(sesion, restaurante_id=ajeno.restaurante_id) == []


@pytest.mark.ac("AC-24.1")
async def test_la_hora_del_telefono_se_acota_a_la_del_servidor(
    cliente: AsyncClient, sesion: AsyncSession, mesa: Mesa, restaurante: Restaurante
) -> None:
    _, token = await _entrar(cliente, mesa)
    antes = datetime.now(UTC)
    hace_un_rato = antes - timedelta(minutes=5)
    await _lote(
        cliente,
        token,
        [
            {"tipo": "menu_view", "ocurrido_en": hace_un_rato.isoformat()},
            {"tipo": "search", "ocurrido_en": (antes + timedelta(days=3)).isoformat()},
            {"tipo": "filter", "ocurrido_en": "2020-01-01T00:00:00"},
        ],
    )
    despues = datetime.now(UTC)
    filas = (await _eventos(sesion, restaurante_id=restaurante.id))[1:]
    assert filas[0].ocurrido_en == hace_un_rato
    assert antes <= filas[1].ocurrido_en <= despues  # el futuro se vuelve «ahora»
    limite = filas[2].ocurrido_en - (antes - timedelta(hours=6))
    assert timedelta(0) <= limite <= despues - antes  # nunca más de 6 h atrás


async def test_eventos_sin_cookie_es_401_y_no_guarda(
    cliente: AsyncClient, sesion: AsyncSession, restaurante: Restaurante
) -> None:
    respuesta = await cliente.post(f"{P}/eventos", json={"eventos": [{"tipo": "menu_view"}]})
    assert respuesta.status_code == 401
    assert respuesta.json()["error"]["codigo"] == "SIN_CREDENCIAL"
    assert await _eventos(sesion, restaurante_id=restaurante.id) == []


async def test_mas_de_120_eventos_por_minuto_se_descartan_en_silencio(
    cliente: AsyncClient, sesion: AsyncSession, mesa: Mesa, restaurante: Restaurante
) -> None:
    _, token = await _entrar(cliente, mesa)
    lote = [{"tipo": "menu_view"}] * 50
    for _ in range(3):  # 150: el tercer lote no cabe
        await _lote(cliente, token, lote)
    await _lote(cliente, token, [{"tipo": "search"}] * 20)  # 120 justos: sí cabe
    filas = await _eventos(sesion, restaurante_id=restaurante.id)
    assert len([f for f in filas if f.tipo == "menu_view"]) == 100
    assert len([f for f in filas if f.tipo == "search"]) == 20


# ---------------------------------------------------------------------------
# AC-24.2 · sin IP en claro
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-24.2")
async def test_ninguna_fila_contiene_una_ip(
    cliente: AsyncClient,
    sesion: AsyncSession,
    mesa: Mesa,
    restaurante: Restaurante,
    platillo: Platillo,
) -> None:
    _, token = await _entrar(cliente, mesa, **POR_CLOUDFLARE)
    await _lote(
        cliente,
        token,
        [{"tipo": "menu_view"}, {"tipo": "dish_view", "platillo_id": str(platillo.id)}],
        **POR_CLOUDFLARE,
    )
    texto = await sesion.scalar(
        text(
            "SELECT string_agg(row_to_json(e)::text, '\n') FROM evento_analitica e "
            "WHERE restaurante_id = :rid"
        ),
        {"rid": restaurante.id},
    )
    assert texto is not None and texto.count('"tipo"') == 3
    for prohibido in (IP, IP_CF, "10.9.9.9", "198.51.101", "iPhone", "Mozilla", UA_IPHONE):
        assert prohibido not in texto, prohibido
    filas = await _eventos(sesion, restaurante_id=restaurante.id)
    hashes = {f.ip_hash for f in filas}
    assert len(hashes) == 1  # misma IP, mismo día: se pueden contar únicos
    (ip_hash,) = hashes
    assert ip_hash is not None and len(ip_hash) == 64
    assert ip_hash != hashlib.sha256(IP.encode()).hexdigest()  # con sal, no un hash pelón
    assert ip_hash == analitica.hash_ip(IP, dia=filas[0].ocurrido_en.astimezone(UTC).date())


@pytest.mark.ac("AC-24.2")
def test_la_sal_cambia_cada_dia_y_depende_de_la_llave(monkeypatch: pytest.MonkeyPatch) -> None:
    hoy, manana = date(2026, 11, 11), date(2026, 11, 12)
    assert analitica.hash_ip(IP, dia=hoy) == analitica.hash_ip(IP, dia=hoy)
    assert analitica.hash_ip(IP, dia=hoy) != analitica.hash_ip(IP, dia=manana)
    assert analitica.hash_ip(IP, dia=hoy) != analitica.hash_ip("198.51.101.78", dia=hoy)
    antes = analitica.hash_ip(IP, dia=hoy)
    monkeypatch.setattr(analitica.settings, "SECRET_KEY", "otra-llave-" + "x" * 40)
    assert analitica.hash_ip(IP, dia=hoy) != antes
    assert analitica.hash_ip(None, dia=hoy) is None


@pytest.mark.ac("AC-24.2")
@pytest.mark.parametrize(
    ("ua", "familia"),
    [
        (UA_IPHONE, "ios-safari"),
        (UA_IPHONE.replace("Version/18.1", "CriOS/130.0"), "ios-chrome"),
        ("Mozilla/5.0 (iPhone; CPU iPhone OS 18_1) FxiOS/132.0 Mobile/15E148", "ios-firefox"),
        (UA_ANDROID, "android-chrome"),
        (
            UA_ANDROID.replace("Chrome/130.0.0.0 Mobile", "SamsungBrowser/26.0 Chrome/122"),
            "samsung",
        ),
        ("Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0", "android-firefox"),
        (
            "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0",
            "edge",
        ),
        ("Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/18.1 Safari/605.1.15", "safari"),
        ("Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0", "firefox"),
        ("Googlebot/2.1 (+http://www.google.com/bot.html)", "bot"),
        ("python-httpx/0.28", "bot"),
        ("curl/8.0", "bot"),
        ("Wget/1.21", "bot"),
        ("Mozilla/5.0 (compatible; bingbot/2.0)", "bot"),
        ("Mozilla/5.0 (compatible; AhrefsBot/7.0)", "bot"),
        ("Mozilla/5.0 (compatible; Yahoo! Slurp)", "bot"),
        ("Mozilla/5.0 (X11) AppleWebKit/537.36 HeadlessChrome/130.0 Safari/537.36", "bot"),
        (
            "Mozilla/5.0 (Linux; Android 11) Chrome/130 Mobile Safari/537.36 Chrome-Lighthouse",
            "bot",
        ),
        ("k6/0.50 (https://k6.io/)", "bot"),
        ("GOOGLEBOT", "bot"),
        ("Mozilla/5.0 (compatible; YandexSpider)", "bot"),
        ("Mozilla/5.0 (compatible; MJ12Crawler)", "bot"),
        ("Mozilla/5.0 (iPhone; CPU iPhone OS 18_1) AppleWebKit/605.1.15 Mobile/15E148", "ios-otro"),
        (
            UA_ANDROID.replace("Mobile Safari/537.36", "Mobile Safari/537.36 EdgA/130.0"),
            "android-edge",
        ),
        ("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Version/4.0", "android-otro"),
        ("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36", "chrome"),
        ("A" * 600 + " Firefox/1", "otro"),
        ("algo raro <script>", "otro"),
        ("x" * 10_000, "otro"),
        ("", None),
        (None, None),
    ],
)
def test_familia_del_navegador_es_de_una_lista_cerrada(ua: str | None, familia: str | None) -> None:
    resultado = analitica.familia_user_agent(ua)
    assert resultado == familia
    assert resultado is None or (resultado in analitica.FAMILIAS and len(resultado) <= 60)


@pytest.mark.ac("AC-24.2")
async def test_ninguna_linea_de_log_lleva_la_ip(
    cliente: AsyncClient, mesa: Mesa, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.DEBUG):
        _, token = await _entrar(cliente, mesa, **POR_CLOUDFLARE)
        await _lote(cliente, token, [{"tipo": "menu_view"}], **POR_CLOUDFLARE)
        await cliente.get(f"{P}/sesion", headers={**con_token(token), **POR_CLOUDFLARE})
    assert caplog.records
    for registro in caplog.records:
        linea = registro.getMessage() + repr(registro.__dict__)
        for prohibido in (IP, IP_CF, "10.9.9.9", "iPhone"):
            assert prohibido not in linea, (prohibido, registro.name)


# ---------------------------------------------------------------------------
# Un fallo de analítica nunca tumba la petición
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-24.1")
async def test_si_la_base_rechaza_el_scan_entrar_responde_200_y_el_miembro_queda(
    cliente: AsyncClient,
    sesion: AsyncSession,
    mesa: Mesa,
    restaurante: Restaurante,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Un error real de la base (un `ip_hash` de 65 caracteres no cabe en la columna): el
    `INSERT` falla después del `commit()` de `entrar`; la respuesta sale 200 con su cookie y
    el miembro existe."""
    monkeypatch.setattr(analitica, "hash_ip", lambda ip, *, dia: "f" * 65)
    with caplog.at_level(logging.WARNING, logger="carta.analitica"):
        cuerpo, token = await _entrar(cliente, mesa, **POR_CLOUDFLARE)
    assert token
    miembro = await sesion.get(MiembroSesion, cuerpo["miembro"]["id"])
    assert miembro is not None
    assert await _eventos(sesion, restaurante_id=restaurante.id) == []
    avisos = [r for r in caplog.records if r.name == "carta.analitica"]
    assert len(avisos) == 1
    # Sólo la clase del error: ni el mensaje de la base ni valores de la fila.
    assert avisos[0].getMessage() == "analítica: no se registró scan (DBAPIError)"
    assert getattr(avisos[0], "codigo", None) == "ANALITICA_FALLIDA"
    # La sesión de la mesa sigue sirviendo.
    assert (await cliente.get(f"{P}/sesion", headers=con_token(token))).status_code == 200


@pytest.mark.ac("AC-24.1")
async def test_si_la_analitica_explota_eventos_responde_202(
    cliente: AsyncClient,
    sesion: AsyncSession,
    mesa: Mesa,
    restaurante: Restaurante,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _, token = await _entrar(cliente, mesa)

    def explota(*_: Any, **__: Any) -> Any:
        raise RuntimeError("se cayó")

    monkeypatch.setattr(analitica, "familia_user_agent", explota)
    await _lote(cliente, token, [{"tipo": "menu_view"}])
    assert [f.tipo for f in await _eventos(sesion, restaurante_id=restaurante.id)] == ["scan"]
    # Y `entrar` tampoco se cae con la analítica rota.
    respuesta, _ = await entrar(cliente, mesa.codigo_publico, token)
    assert respuesta.status_code == 200


async def test_el_lote_con_una_sesion_de_otro_restaurante_no_guarda(
    cliente: AsyncClient,
    sesion: AsyncSession,
    mesa: Mesa,
    restaurante: Restaurante,
    fabrica_restaurante: Fabrica,
) -> None:
    """B6 j: una sesión REAL del restaurante A con `restaurante_id` de B: 0 guardados y
    ninguna fila en ninguno de los dos (reglas duras 5 y 6)."""
    cuerpo, _ = await _entrar(cliente, mesa)
    otro = await fabrica_restaurante()
    # El `rollback()` del servicio expira lo cargado (regla 21 de /pruebas): ids antes.
    otro_id, propio_id = otro.id, restaurante.id
    guardados = await analitica.registrar_lote(
        sesion,
        restaurante_id=otro_id,
        sesion_id=UUID(cuerpo["sesion"]["id"]),
        miembro_id=UUID(cuerpo["miembro"]["id"]),
        eventos=[analitica.EventoCliente("menu_view")],
        origen=analitica.Origen(ip=IP, user_agent=None),
    )
    assert guardados == 0
    assert await _eventos(sesion, restaurante_id=otro_id) == []
    assert [f.tipo for f in await _eventos(sesion, restaurante_id=propio_id)] == ["scan"]


def test_la_ip_de_analitica_y_la_del_limite_son_la_misma() -> None:
    """`ip_hash` usa el mismo cubo que el límite (IPv6 por `/64`)."""
    cabeceras = Headers(headers={"x-forwarded-for": "2001:db8:1:2::9"})
    assert limites.ip_del_cliente(cabeceras, None) == ("2001:db8:1:2::/64")


# ---------------------------------------------------------------------------
# Revisión de la maestra (B6)
# ---------------------------------------------------------------------------


async def test_el_evento_121_en_un_minuto_se_descarta_y_el_120_cabe(
    cliente: AsyncClient, sesion: AsyncSession, mesa: Mesa, restaurante: Restaurante, reloj: Reloj
) -> None:
    _, token = await _entrar(cliente, mesa)
    for cuantos in (50, 50, 19):
        await _lote(cliente, token, [{"tipo": "menu_view"}] * cuantos)
    await _lote(cliente, token, [{"tipo": "search"}])  # el 120: cabe
    await _lote(cliente, token, [{"tipo": "filter"}])  # el 121: se descarta
    filas = await _eventos(sesion, restaurante_id=restaurante.id)
    assert len([f for f in filas if f.tipo != "scan"]) == 120
    assert [f.tipo for f in filas].count("search") == 1
    assert [f.tipo for f in filas].count("filter") == 0
    reloj.ahora += 60
    await _lote(cliente, token, [{"tipo": "filter"}])  # pasado el minuto, otra vez cabe
    assert [f.tipo for f in await _eventos(sesion, restaurante_id=restaurante.id)].count(
        "filter"
    ) == 1


async def test_el_limite_de_eventos_es_por_miembro(
    cliente: AsyncClient, sesion: AsyncSession, mesa: Mesa, restaurante: Restaurante, reloj: Reloj
) -> None:
    _, ana = await _entrar(cliente, mesa)
    beto_cuerpo, beto = await _entrar(cliente, mesa)
    for _ in range(3):
        await _lote(cliente, ana, [{"tipo": "menu_view"}] * 40)  # 120: agotado
    await _lote(cliente, beto, [{"tipo": "search"}] * 50)
    filas = await _eventos(sesion, restaurante_id=restaurante.id, tipo="search")
    assert len(filas) == 50
    assert {str(f.miembro_id) for f in filas} == {beto_cuerpo["miembro"]["id"]}


async def test_lote_de_0_es_422_y_el_de_50_es_202(
    cliente: AsyncClient, sesion: AsyncSession, mesa: Mesa, restaurante: Restaurante
) -> None:
    _, token = await _entrar(cliente, mesa)
    vacio = await cliente.post(f"{P}/eventos", json={"eventos": []}, headers=con_token(token))
    assert vacio.status_code == 422
    await _lote(cliente, token, [{"tipo": "menu_view"}] * 50)
    filas = await _eventos(sesion, restaurante_id=restaurante.id, tipo="menu_view")
    assert len(filas) == 50


@pytest.mark.ac("AC-24.2")
async def test_el_ip_hash_usa_la_sal_del_dia_utc_del_evento(
    sesion: AsyncSession, mesa: Mesa, restaurante: Restaurante, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Vector fijo: con esta llave, la misma IP a un segundo antes y después de la medianoche
    UTC da estos dos hashes (atrapa el día local en vez del UTC y un cambio de algoritmo)."""
    monkeypatch.setattr(analitica.settings, "SECRET_KEY", "llave-de-prueba-" + "k" * 32)
    sesion_mesa, miembro = await _sesion_y_miembro(sesion, mesa)
    for ahora in (
        datetime(2026, 1, 1, 23, 59, 59, tzinfo=UTC),
        datetime(2026, 1, 2, 0, 0, 1, tzinfo=UTC),
    ):
        assert await analitica.registrar_scan(
            sesion,
            restaurante_id=restaurante.id,
            mesa_id=mesa.id,
            sesion_id=sesion_mesa,
            miembro_id=miembro,
            origen=analitica.Origen(ip=IP, user_agent=None),
            ahora=ahora,
        )
    filas = await _eventos(sesion, restaurante_id=restaurante.id)
    assert [f.ip_hash for f in filas] == [HASH_1_ENERO, HASH_2_ENERO]


async def _sesion_y_miembro(sesion: AsyncSession, mesa: Mesa) -> tuple[UUID, UUID]:
    entrada = await servicio_sesion.entrar(sesion, mesa.codigo_publico, None)
    return entrada.sesion.id, entrada.miembro.id


async def test_un_evento_sin_hora_se_guarda_con_la_del_servidor(
    sesion: AsyncSession, mesa: Mesa, restaurante: Restaurante
) -> None:
    sesion_mesa, miembro = await _sesion_y_miembro(sesion, mesa)
    ahora = datetime(2026, 11, 11, 12, 0, tzinfo=UTC)
    guardados = await analitica.registrar_lote(
        sesion,
        restaurante_id=restaurante.id,
        sesion_id=sesion_mesa,
        miembro_id=miembro,
        eventos=[analitica.EventoCliente("menu_view")],
        origen=analitica.Origen(ip=None, user_agent=None),
        ahora=ahora,
    )
    assert guardados == 1
    (fila,) = await _eventos(sesion, restaurante_id=restaurante.id)
    assert fila.ocurrido_en == ahora
    assert fila.ip_hash is None


async def test_registrar_lote_devuelve_cuantos_guardo(
    sesion: AsyncSession, mesa: Mesa, restaurante: Restaurante, platillo: Platillo
) -> None:
    sesion_mesa, miembro = await _sesion_y_miembro(sesion, mesa)
    guardados = await analitica.registrar_lote(
        sesion,
        restaurante_id=restaurante.id,
        sesion_id=sesion_mesa,
        miembro_id=miembro,
        eventos=[
            analitica.EventoCliente("menu_view"),
            analitica.EventoCliente("dish_view", platillo.id),
            analitica.EventoCliente("dish_view", uuid4()),  # descartado
            analitica.EventoCliente("dish_view"),  # descartado
            analitica.EventoCliente("search"),
        ],
        origen=analitica.Origen(ip=IP, user_agent=None),
    )
    assert guardados == 3
    assert len(await _eventos(sesion, restaurante_id=restaurante.id)) == 3


@pytest.mark.parametrize("cual", ["scan", "lote"])
async def test_tras_un_fallo_de_la_analitica_la_sesion_sigue_sirviendo(
    sesion: AsyncSession,
    mesa: Mesa,
    restaurante: Restaurante,
    monkeypatch: pytest.MonkeyPatch,
    cual: str,
) -> None:
    sesion_mesa, miembro = await _sesion_y_miembro(sesion, mesa)
    monkeypatch.setattr(analitica, "hash_ip", lambda ip, *, dia: "f" * 65)
    origen = analitica.Origen(ip=IP, user_agent=None)
    if cual == "scan":
        resultado: object = await analitica.registrar_scan(
            sesion,
            restaurante_id=restaurante.id,
            mesa_id=mesa.id,
            sesion_id=sesion_mesa,
            miembro_id=miembro,
            origen=origen,
        )
        assert resultado is False
    else:
        resultado = await analitica.registrar_lote(
            sesion,
            restaurante_id=restaurante.id,
            sesion_id=sesion_mesa,
            miembro_id=miembro,
            eventos=[analitica.EventoCliente("menu_view")],
            origen=origen,
        )
        assert resultado == 0
    assert (await sesion.execute(text("select 1"))).scalar() == 1
    assert analitica.turnos.en_curso == 0  # el cupo se devolvió


def test_hash_ip_vacia_es_none() -> None:
    assert analitica.hash_ip("", dia=date(2026, 11, 11)) is None


def test_origen_sin_client_ni_cabeceras_no_tiene_ip() -> None:
    alcance: dict[str, Any] = {"type": "http", "method": "POST", "path": "/", "headers": []}
    origen = origen_de(Request(alcance))
    assert origen.ip is None
    assert origen.user_agent is None
