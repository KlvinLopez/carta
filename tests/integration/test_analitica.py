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
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.publico import limites
from app.db.models import EventoAnalitica, Mesa, MiembroSesion, Platillo, Restaurante
from app.services import analitica
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


@pytest.mark.ac("AC-24.1")
async def test_entrar_registra_scan_con_mesa_sesion_y_miembro(
    cliente: AsyncClient, sesion: AsyncSession, mesa: Mesa, restaurante: Restaurante
) -> None:
    cuerpo, token = await _entrar(cliente, mesa, **POR_CLOUDFLARE)
    # Reanudar con la cookie es otro escaneo (el `ip_hash` permite contarlos únicos).
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


async def test_el_lote_con_un_token_de_sesion_ajena_al_restaurante_no_guarda(
    sesion: AsyncSession, restaurante: Restaurante, fabrica_restaurante: Fabrica
) -> None:
    """El servicio comprueba que la sesión sea del restaurante (no confía en sus argumentos)."""
    otro = await fabrica_restaurante()
    guardados = await analitica.registrar_lote(
        sesion,
        restaurante_id=otro.id,
        sesion_id=uuid4(),
        miembro_id=uuid4(),
        eventos=[analitica.EventoCliente("menu_view")],
        origen=analitica.Origen(ip=IP, user_agent=None),
    )
    assert guardados == 0
    assert await _eventos(sesion, restaurante_id=otro.id) == []


def test_la_ip_de_analitica_y_la_del_limite_son_la_misma() -> None:
    """`ip_hash` usa el mismo cubo que el límite (IPv6 por `/64`)."""
    assert limites.ip_del_cliente({"x-forwarded-for": "2001:db8:1:2::9"}, None) == (
        "2001:db8:1:2::/64"
    )
