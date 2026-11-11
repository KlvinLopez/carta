"""T-2.3: límites de tasa del comensal (04_API_Spec §1.5) por HTTP.

- 120 peticiones por minuto por miembro (cookie válida); la 121 es 429.
- 600 por minuto por IP para lo que llega **sin** cookie válida.
- El uso normal (sondeo de 3 s, reentrada tras un 401, una mesa entera detrás de la misma IP)
  nunca toca el límite.

Las cuentas viven en la memoria de cada worker (sin Redis): con N workers el límite efectivo
es hasta N veces el nominal (fila T-2.3 de 04 §11). Aquí corre un solo proceso.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest
from httpx import AsyncClient, Response

from app.api.publico import limites
from app.core.seguridad import Invitado, emitir_token_invitado
from app.db.models import Mesa, Restaurante
from tests.conftest import Fabrica
from tests.invitado_pruebas import P, con_token, entrar, estado, sin_request_id


class Reloj:
    def __init__(self) -> None:
        self.ahora = 5000.0

    def __call__(self) -> float:
        return self.ahora


@pytest.fixture
def reloj(monkeypatch: pytest.MonkeyPatch) -> Reloj:
    """Reloj a mano para los tres limitadores (el `cliente` ya los vació)."""
    r = Reloj()
    for limitador in (limites.por_token, limites.por_ip, limites.eventos_por_token):
        monkeypatch.setattr(limitador, "reloj", r)
    return r


def _es_429(respuesta: Response) -> None:
    assert respuesta.status_code == 429, respuesta.text
    assert sin_request_id(respuesta.json()) == {
        "error": {
            "codigo": "DEMASIADAS_PETICIONES",
            "mensaje": "Demasiadas peticiones; espera un momento.",
            "detalles": {},
        }
    }
    assert respuesta.headers["cache-control"] == "no-store"
    assert int(respuesta.headers["retry-after"]) >= 1


async def test_la_peticion_121_en_un_minuto_con_el_mismo_token_es_429(
    cliente: AsyncClient, mesa: Mesa, reloj: Reloj
) -> None:
    _, token = await entrar(cliente, mesa.codigo_publico)  # 1 (cuenta en el cubo de la IP)
    assert token
    for n in range(120):
        assert (await estado(cliente, token)).status_code == 200, n
        reloj.ahora += 0.25  # 120 en 30 s (0.25 es exacto en binario)
    respuesta = await estado(cliente, token)
    _es_429(respuesta)
    assert respuesta.headers["retry-after"] == "30"  # la primera vence a los 60 s
    # Toda ruta del comensal comparte el cubo del miembro.
    _es_429(
        await cliente.post(
            f"{P}/eventos", json={"eventos": [{"tipo": "menu_view"}]}, headers=con_token(token)
        )
    )
    _es_429(await cliente.patch(f"{P}/miembro", json={"alias": "Ana"}, headers=con_token(token)))
    # Al pasar el minuto vuelve a responder.
    reloj.ahora += 30.01
    assert (await estado(cliente, token)).status_code == 200


async def test_el_limite_de_un_miembro_no_toca_a_otro_de_la_misma_mesa(
    cliente: AsyncClient, mesa: Mesa, reloj: Reloj
) -> None:
    _, ana = await entrar(cliente, mesa.codigo_publico)
    _, beto = await entrar(cliente, mesa.codigo_publico)
    assert ana and beto
    for _ in range(120):
        await estado(cliente, ana)
    _es_429(await estado(cliente, ana))
    assert (await estado(cliente, beto)).status_code == 200


async def test_sondeo_de_3s_con_lo_demas_de_una_visita_nunca_toca_el_limite(
    cliente: AsyncClient, mesa: Mesa, restaurante: Restaurante, reloj: Reloj
) -> None:
    """Una visita de 30 minutos: sondeo cada 3 s, el menú, el alias, lotes de eventos y una
    reentrada tras un 401 (cookie perdida). Ni un 429."""
    respuesta, token = await entrar(cliente, mesa.codigo_publico)
    assert respuesta.status_code == 200 and token
    for segundo in range(0, 30 * 60, 3):
        reloj.ahora += 3
        respuestas = [await estado(cliente, token)]
        if segundo % 30 == 0:
            respuestas.append(await cliente.get(f"{P}/menu/{restaurante.slug}"))
            lote = {"eventos": [{"tipo": "menu_view"}, {"tipo": "search"}]}
            respuestas.append(
                await cliente.post(f"{P}/eventos", json=lote, headers=con_token(token))
            )
        if segundo == 600:
            respuestas.append(
                await cliente.patch(
                    f"{P}/miembro", json={"alias": "Sofía"}, headers=con_token(token)
                )
            )
        if segundo == 900:  # se perdió la cookie: 401 y reentrada anónima
            respuestas.append(await cliente.get(f"{P}/sesion"))
            respuesta, token = await entrar(cliente, mesa.codigo_publico)
            respuestas.append(respuesta)
            assert token
        assert all(r.status_code != 429 for r in respuestas), [r.status_code for r in respuestas]


async def test_sondeo_en_rafaga_de_un_cliente_que_reintenta_rapido_si_toca_el_limite(
    cliente: AsyncClient, mesa: Mesa, reloj: Reloj
) -> None:
    """El mismo teléfono sondeando cada 0.4 s (un error de programación del cliente): 150 por
    minuto, se le corta."""
    _, token = await entrar(cliente, mesa.codigo_publico)
    assert token
    codigos = []
    for _ in range(150):
        codigos.append((await estado(cliente, token)).status_code)
        reloj.ahora += 0.4
    assert codigos.count(429) > 0
    assert codigos[:120] == [200] * 120


async def test_una_mesa_entera_detras_de_la_misma_ip_no_choca_con_el_limite_por_ip(
    cliente: AsyncClient, restaurante: Restaurante, fabrica_mesa: Fabrica, reloj: Reloj
) -> None:
    """36 comensales en 3 mesas salen por la IP del restaurante y sondean 20 veces cada uno
    (720 peticiones con token en el mismo minuto, más que las 600 por IP): las peticiones con
    cookie válida no cuentan en el cubo de la IP."""
    tokens = []
    for numero in (1, 2, 3):
        mesa = await fabrica_mesa(restaurante, numero=numero)
        for _ in range(12):
            respuesta, token = await entrar(cliente, mesa.codigo_publico)
            assert respuesta.status_code == 200 and token
            tokens.append(token)
    for _ in range(20):
        for token in tokens:
            assert (await estado(cliente, token)).status_code == 200
        reloj.ahora += 3
    assert len(limites.por_ip) == 1  # sólo las 36 entradas, en un cubo


async def test_la_peticion_601_sin_cookie_desde_una_ip_es_429_y_otra_ip_sigue(
    cliente: AsyncClient, reloj: Reloj
) -> None:
    """Sin cookie (el menú, el detalle, `entrar`) cuenta la IP. Un `slug` imposible da 404 sin
    tocar la base: lo que se mide es el límite."""
    for n in range(600):
        assert (await cliente.get(f"{P}/menu/no-existe")).status_code == 404, n
    _es_429(await cliente.get(f"{P}/menu/no-existe"))
    _es_429(await cliente.post(f"{P}/sesion/entrar", json={"codigo_mesa": "x" * 30}))
    # Detrás de la plataforma, otra IP tiene su cubo.
    otra = {"X-Forwarded-For": "198.51.101.9"}
    assert (await cliente.get(f"{P}/menu/no-existe", headers=otra)).status_code == 404


async def test_un_token_falso_o_vencido_cuenta_en_el_cubo_de_la_ip(
    cliente: AsyncClient, monkeypatch: pytest.MonkeyPatch, reloj: Reloj
) -> None:
    monkeypatch.setattr(limites, "por_ip", limites.VentanaMovil(5, reloj=reloj))
    for n in range(5):
        respuesta = await cliente.get(f"{P}/sesion", headers=con_token(f"falso.{n}.x"))
        assert respuesta.status_code == 401
    _es_429(await cliente.get(f"{P}/sesion", headers=con_token("otro.falso.x")))


async def test_cabeceras_falsificadas_no_eligen_el_cubo_fuera_de_cloudflare(
    cliente: AsyncClient, monkeypatch: pytest.MonkeyPatch, reloj: Reloj
) -> None:
    """Un cliente que entra directo al origen escribe lo que quiera a la izquierda de
    `X-Forwarded-For` y en `CF-Connecting-IP`; el proxy anota su IP real al final (aquí
    203.0.114.7). Todas sus peticiones caen en el mismo cubo."""
    monkeypatch.setattr(limites, "por_ip", limites.VentanaMovil(5, reloj=reloj))
    for n in range(5):
        falsas = {
            "X-Forwarded-For": f"{n}.{n}.{n}.{n}, 203.0.114.7",
            "CF-Connecting-IP": f"9.9.9.{n}",
        }
        assert (await cliente.get(f"{P}/menu/no-existe", headers=falsas)).status_code == 404
    falsas = {"X-Forwarded-For": "8.8.8.8, 203.0.114.7", "CF-Connecting-IP": "1.1.1.1"}
    _es_429(await cliente.get(f"{P}/menu/no-existe", headers=falsas))


async def test_por_cloudflare_cada_comensal_tiene_su_cubo(
    cliente: AsyncClient, monkeypatch: pytest.MonkeyPatch, reloj: Reloj
) -> None:
    """Por Cloudflare (último salto en sus rangos) cuenta `CF-Connecting-IP`, que Cloudflare
    sobrescribe: dos comensales detrás del mismo borde no comparten cubo."""
    monkeypatch.setattr(limites, "por_ip", limites.VentanaMovil(3, reloj=reloj))

    def via_cf(ip: str) -> dict[str, str]:
        return {"X-Forwarded-For": f"6.6.6.6, {ip}, 173.245.48.10", "CF-Connecting-IP": ip}

    for _ in range(3):
        assert (
            await cliente.get(f"{P}/menu/no-existe", headers=via_cf("198.51.101.1"))
        ).status_code == 404
    _es_429(await cliente.get(f"{P}/menu/no-existe", headers=via_cf("198.51.101.1")))
    assert (
        await cliente.get(f"{P}/menu/no-existe", headers=via_cf("198.51.101.2"))
    ).status_code == 404


async def test_fuera_de_p_no_hay_limite_del_comensal(
    cliente: AsyncClient, monkeypatch: pytest.MonkeyPatch, reloj: Reloj
) -> None:
    monkeypatch.setattr(limites, "por_ip", limites.VentanaMovil(1, reloj=reloj))
    for _ in range(5):
        assert (await cliente.get("/health")).status_code == 200
    assert len(limites.por_ip) == 0


# ---------------------------------------------------------------------------
# Revisión de la maestra (A2, A3, B4, B6 l)
# ---------------------------------------------------------------------------


async def _agotar_ip(cliente: AsyncClient, **cabeceras: str) -> None:
    for n in range(600):
        respuesta = await cliente.get(f"{P}/menu/no-existe", headers=cabeceras)
        assert respuesta.status_code == 404, n


async def test_x_forwarded_for_en_dos_lineas_no_elige_el_cubo(
    cliente: AsyncClient, reloj: Reloj
) -> None:
    """A2: el cliente pone su línea primero y el proxy añade la suya como línea nueva; rotar
    la primera no cambia el cubo: la 601 es 429."""
    for n in range(601):
        cabeceras = [
            ("X-Forwarded-For", f"{n % 250}.{n // 250}.0.1"),
            ("X-Forwarded-For", "8.8.8.8"),
        ]
        respuesta = await cliente.get(f"{P}/menu/no-existe", headers=cabeceras)
        if n < 600:
            assert respuesta.status_code == 404, n
    _es_429(respuesta)


async def test_entrar_con_cookie_valida_tambien_paga_en_el_cubo_de_la_ip(
    cliente: AsyncClient, mesa: Mesa, fabrica_mesa: Fabrica, restaurante: Restaurante, reloj: Reloj
) -> None:
    """A3: `entrar` acuña identidades; con la IP agotada, una cookie válida no lo salva."""
    _, token = await entrar(cliente, mesa.codigo_publico)  # 1 en el cubo de la IP
    assert token
    for n in range(599):
        assert (await cliente.get(f"{P}/menu/no-existe")).status_code == 404, n
    otra = await fabrica_mesa(restaurante)
    _es_429(
        await cliente.post(
            f"{P}/sesion/entrar",
            json={"codigo_mesa": otra.codigo_publico},
            headers=con_token(token),
        )
    )
    # Lo demás con cookie sigue en el cubo del miembro.
    assert (await estado(cliente, token)).status_code == 200


async def test_52_comensales_tras_una_ip_entran_recargan_y_sondean_sin_429(
    cliente: AsyncClient, restaurante: Restaurante, fabrica_mesa: Fabrica, reloj: Reloj
) -> None:
    """Uso normal con `entrar` en el cubo de la IP: 52 comensales en 5 mesas entran, cada uno
    recarga la bienvenida dos veces (otro `entrar` con su cookie) y sondean un minuto."""
    tokens: list[tuple[str, str]] = []
    for numero in range(1, 6):
        mesa = await fabrica_mesa(restaurante, numero=numero)
        for _ in range(12 if numero < 5 else 4):
            respuesta, token = await entrar(cliente, mesa.codigo_publico)
            assert respuesta.status_code == 200 and token
            tokens.append((mesa.codigo_publico, token))
    assert len(tokens) == 52
    for codigo, token in tokens:
        for _ in range(2):
            respuesta, _ = await entrar(cliente, codigo, token)
            assert respuesta.status_code == 200
    for _ in range(20):
        for _, token in tokens:
            assert (await estado(cliente, token)).status_code == 200
        reloj.ahora += 3


async def test_un_json_roto_cuenta_y_la_601_es_429_sin_leer_el_cuerpo(
    cliente: AsyncClient, reloj: Reloj
) -> None:
    """B4: la cuenta va en la clase de ruta, antes de leer y validar el cuerpo."""
    for n in range(600):
        respuesta = await cliente.post(
            f"{P}/sesion/entrar",
            content=b'{"codigo_mesa":',
            headers={"content-type": "application/json"},
        )
        assert respuesta.status_code == 422, n
    respuesta = await cliente.post(
        f"{P}/sesion/entrar",
        content=b'{"codigo_mesa":',
        headers={"content-type": "application/json"},
    )
    _es_429(respuesta)
    grande = b"x" * (20 * 1024)
    _es_429(await cliente.post(f"{P}/sesion/entrar", content=grande))


async def test_un_token_vencido_cuenta_en_el_cubo_de_la_ip(
    cliente: AsyncClient, mesa: Mesa, monkeypatch: pytest.MonkeyPatch, reloj: Reloj
) -> None:
    respuesta, token = await entrar(cliente, mesa.codigo_publico)
    assert token
    cuerpo = respuesta.json()
    vencido = emitir_token_invitado(
        Invitado(
            UUID(cuerpo["miembro"]["id"]),
            UUID(cuerpo["sesion"]["id"]),
            UUID(cuerpo["sesion"]["restaurante"]["id"]),
        ),
        ahora=datetime.now(UTC) - timedelta(hours=7),
    )
    monkeypatch.setattr(limites, "por_ip", limites.VentanaMovil(3, reloj=reloj))
    for _ in range(3):
        assert (await estado(cliente, vencido)).status_code == 401
    _es_429(await estado(cliente, vencido))
    assert (await estado(cliente, token)).status_code == 200  # el vigente va por su miembro
