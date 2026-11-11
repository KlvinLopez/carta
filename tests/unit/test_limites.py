"""T-2.3: IP del cliente detrás del proxy y de Cloudflare, y la ventana móvil en memoria.

La IP decide el cubo del límite de quien no trae cookie y el `ip_hash` de la analítica. Un
cliente puede escribir lo que quiera en `X-Forwarded-For` y en `CF-Connecting-IP`; sólo el
último salto (el que anota el proxy de la plataforma) y, si ese salto es Cloudflare,
`CF-Connecting-IP` (que Cloudflare sobrescribe) deciden.
"""

from __future__ import annotations

import asyncio
from typing import Any

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.api.publico import limites
from app.api.publico.limites import VentanaMovil, ip_del_cliente

CF = "173.245.48.10"  # rango de Cloudflare
CF6 = "2606:4700::6810:1"
PUBLICA = "203.0.114.7"  # pública (no es de Cloudflare)
OTRA = "198.51.101.9"


class Reloj:
    def __init__(self) -> None:
        self.ahora = 1000.0

    def __call__(self) -> float:
        return self.ahora


@pytest.mark.parametrize(
    ("cabeceras", "par", "esperada"),
    [
        # Sin proxy (pruebas, desarrollo): el par de la conexión.
        ({}, "127.0.0.1", "127.0.0.1"),
        ({}, None, limites.DESCONOCIDA),
        # El proxy de la plataforma anotó la IP que se le conectó al final.
        ({"x-forwarded-for": PUBLICA}, "10.0.0.2", PUBLICA),
        # Lo de la izquierda lo escribió el cliente: no cuenta.
        ({"x-forwarded-for": f"1.1.1.1, 8.8.8.8, {PUBLICA}"}, "10.0.0.2", PUBLICA),
        # Saltos internos de la plataforma a la derecha se saltan (privadas, CGNAT, loopback).
        ({"x-forwarded-for": f"9.9.9.9, {PUBLICA}, 10.1.2.3, 100.64.0.7"}, "10.0.0.2", PUBLICA),
        # Llegó por Cloudflare: manda CF-Connecting-IP.
        ({"x-forwarded-for": f"6.6.6.6, {OTRA}, {CF}", "cf-connecting-ip": OTRA}, "10.0.0.2", OTRA),
        ({"x-forwarded-for": CF6, "cf-connecting-ip": OTRA}, "10.0.0.2", OTRA),
        # CF-Connecting-IP sin pasar por Cloudflare: falsificada, se ignora.
        ({"x-forwarded-for": PUBLICA, "cf-connecting-ip": OTRA}, "10.0.0.2", PUBLICA),
        ({"cf-connecting-ip": OTRA}, "127.0.0.1", "127.0.0.1"),
        # Cloudflare sin CF-Connecting-IP válida: la del borde (más estricto, nunca más laxo).
        ({"x-forwarded-for": CF, "cf-connecting-ip": "no-es-ip"}, "10.0.0.2", CF),
        ({"x-forwarded-for": CF}, "10.0.0.2", CF),
        # IPv6 por /64: un teléfono no cambia de cubo rotando su sufijo.
        ({"x-forwarded-for": "2001:db8:1:2::abcd"}, "10.0.0.2", "2001:db8:1:2::/64"),
        (
            {"x-forwarded-for": CF, "cf-connecting-ip": "2001:db8:1:2:ffff::1"},
            None,
            "2001:db8:1:2::/64",
        ),
        # Puertos y corchetes, IPv4 mapeada en IPv6.
        ({"x-forwarded-for": f"{PUBLICA}:5555"}, None, PUBLICA),
        ({"x-forwarded-for": "[2001:db8:1:2::1]:443"}, None, "2001:db8:1:2::/64"),
        ({"x-forwarded-for": f"::ffff:{PUBLICA}"}, None, PUBLICA),
        # Basura a la derecha: nada del encabezado es de fiar, se usa el par.
        ({"x-forwarded-for": f"{PUBLICA}, basura"}, "127.0.0.1", "127.0.0.1"),
        ({"x-forwarded-for": "fe80::1%eth0"}, "127.0.0.1", "127.0.0.1"),
        ({"x-forwarded-for": ""}, "127.0.0.1", "127.0.0.1"),
    ],
)
def test_ip_del_cliente(cabeceras: dict[str, str], par: str | None, esperada: str) -> None:
    assert ip_del_cliente(cabeceras, par) == esperada


def test_un_cliente_que_falsifica_las_cabeceras_no_elige_su_cubo() -> None:
    """Directo al origen (sin Cloudflare) el proxy anota la IP real al final: rotar lo que el
    cliente escribe a la izquierda o en `CF-Connecting-IP` no cambia el cubo."""
    cubos = {
        ip_del_cliente(
            {
                "x-forwarded-for": f"10.{n}.0.1, {n}.{n}.{n}.{n}, {PUBLICA}",
                "cf-connecting-ip": f"5.5.5.{n}",
            },
            "10.0.0.2",
        )
        for n in range(1, 60)
    }
    assert cubos == {PUBLICA}


def test_los_rangos_de_cloudflare_son_los_publicados() -> None:
    assert len(limites.RANGOS_CLOUDFLARE) == 22
    assert {str(r) for r in limites.RANGOS_CLOUDFLARE} >= {"173.245.48.0/20", "2606:4700::/32"}


# ---------------------------------------------------------------------------
# Ventana móvil
# ---------------------------------------------------------------------------


def test_la_peticion_121_dentro_de_cualquier_minuto_es_rechazada() -> None:
    reloj = Reloj()
    ventana = VentanaMovil(120, 60, reloj=reloj)
    for _ in range(120):
        assert ventana.intentar("a") is None
        reloj.ahora += 0.4  # 120 en 48 s
    espera = ventana.intentar("a")
    assert espera is not None
    assert espera == pytest.approx(60 - 48)
    # Al vencer la primera marca cabe una más, no 120 de golpe (no es ventana fija).
    reloj.ahora = 1000.0 + 60.0001
    assert ventana.intentar("a") is None
    assert ventana.intentar("a") is not None


def test_lo_rechazado_no_cuenta_y_otra_clave_no_se_ve_afectada() -> None:
    reloj = Reloj()
    ventana = VentanaMovil(3, 60, reloj=reloj)
    for _ in range(3):
        assert ventana.intentar("a") is None
    for _ in range(50):
        assert ventana.intentar("a") is not None
    assert ventana.intentar("b") is None
    reloj.ahora += 60.001
    for _ in range(3):
        assert ventana.intentar("a") is None


def test_peso_cuenta_varios_intentos_y_no_anota_si_no_caben() -> None:
    reloj = Reloj()
    ventana = VentanaMovil(120, 60, reloj=reloj)
    assert ventana.intentar("a", 50) is None
    assert ventana.intentar("a", 50) is None
    assert ventana.intentar("a", 50) is not None  # 150 > 120
    assert ventana.intentar("a", 20) is None  # lo rechazado no se anotó
    assert ventana.intentar("a", 1) is not None
    assert ventana.intentar("b", 121) == 60


def test_las_claves_quietas_se_olvidan_y_hay_un_tope() -> None:
    reloj = Reloj()
    ventana = VentanaMovil(5, 60, max_claves=100, reloj=reloj)
    for n in range(100):
        ventana.intentar(f"k{n}")
    assert len(ventana) == 100
    ventana.intentar("otra")
    assert len(ventana) == 100  # se olvidó la más vieja
    reloj.ahora += 61
    ventana.intentar("nueva")
    assert len(ventana) < 100  # la purga va quitando las vencidas


async def test_rafaga_simultanea_en_un_worker_deja_pasar_exactamente_el_limite() -> None:
    limites.vaciar()

    def peticion() -> Request:
        alcance: dict[str, Any] = {
            "type": "http",
            "method": "GET",
            "path": "/api/v1/p/menu/x",
            "headers": [(b"x-forwarded-for", PUBLICA.encode())],
            "client": ("10.0.0.2", 1234),
            "query_string": b"",
        }
        return Request(alcance)

    async def una() -> bool:
        await asyncio.sleep(0)
        try:
            await limites.limite_comensal(peticion())
        except HTTPException as error:
            assert error.status_code == 429
            assert int(error.headers["Retry-After"]) >= 1  # type: ignore[index]
            return False
        return True

    try:
        resultados = await asyncio.gather(*(una() for _ in range(limites.LIMITE_POR_IP + 50)))
        assert sum(resultados) == 600
    finally:
        limites.vaciar()
