"""T-2.3: IP del cliente detrás del proxy y de Cloudflare, y la ventana móvil en memoria.

La IP decide el cubo del límite de quien no trae cookie y el `ip_hash` de la analítica. Un
cliente puede escribir lo que quiera en `X-Forwarded-For` y en `CF-Connecting-IP`; sólo el
último salto público (el que anota el proxy de la plataforma) y, si ese salto es Cloudflare,
`CF-Connecting-IP` (que Cloudflare sobrescribe) deciden.
"""

from __future__ import annotations

import asyncio
import ipaddress
from typing import Any

import pytest
from fastapi import HTTPException
from starlette.datastructures import Headers
from starlette.requests import Request

from app.api.publico import limites
from app.api.publico.limites import DESCONOCIDA, VentanaMovil, ip_del_cliente

CF = "173.245.48.10"  # rango de Cloudflare
CF6 = "2606:4700::6810:1"
PUBLICA = "203.0.114.7"  # pública (no es de Cloudflare)
OTRA = "198.51.101.9"


class Reloj:
    def __init__(self) -> None:
        self.ahora = 1000.0

    def __call__(self) -> float:
        return self.ahora


def _ip(cabeceras: dict[str, str], par: str | None) -> str:
    return ip_del_cliente(Headers(headers=cabeceras), par)


@pytest.mark.parametrize(
    ("cabeceras", "par", "esperada"),
    [
        # Sin X-Forwarded-For (pruebas, desarrollo): el par de la conexión.
        ({}, "127.0.0.1", "127.0.0.1"),
        ({}, None, DESCONOCIDA),
        ({}, "no-es-ip", DESCONOCIDA),
        # El proxy de la plataforma anotó la IP que se le conectó al final.
        ({"x-forwarded-for": PUBLICA}, "10.0.0.2", PUBLICA),
        # Lo de la izquierda lo escribió el cliente: no cuenta.
        ({"x-forwarded-for": f"1.1.1.1, 8.8.8.8, {PUBLICA}"}, "10.0.0.2", PUBLICA),
        # Saltos internos de la plataforma a la derecha se saltan.
        ({"x-forwarded-for": f"9.9.9.9, {PUBLICA}, 10.1.2.3, 100.64.0.7"}, "10.0.0.2", PUBLICA),
        ({"x-forwarded-for": f"9.9.9.9, {PUBLICA}, 172.16.0.1, 192.168.1.1"}, None, PUBLICA),
        ({"x-forwarded-for": f"9.9.9.9, {PUBLICA}, 127.0.0.1, 169.254.1.1"}, None, PUBLICA),
        ({"x-forwarded-for": f"9.9.9.9, {PUBLICA}, fd00::1, fe80::1, ::1"}, None, PUBLICA),
        # Sólo los rangos explícitos son internos (B2a): Teredo, 6to4, NAT64 y 198.18/15 no
        # son saltos de la plataforma y el recorrido no sigue a lo que escribió el cliente.
        ({"x-forwarded-for": "6.6.6.6, 2001::1"}, None, "2001::/64"),
        ({"x-forwarded-for": "6.6.6.6, 2002:c000:204::1"}, None, "2002:c000:204::/64"),
        ({"x-forwarded-for": "6.6.6.6, 64:ff9b:1::1"}, None, "64:ff9b:1::/64"),
        ({"x-forwarded-for": "6.6.6.6, 198.18.0.5"}, None, "198.18.0.5"),
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
        # Cabecera presente pero inservible (B2b): DESCONOCIDA, nunca el par (que con
        # FORWARDED_ALLOW_IPS=* es lo que escribió el cliente).
        ({"x-forwarded-for": f"{PUBLICA}, basura"}, "6.6.6.6", DESCONOCIDA),
        ({"x-forwarded-for": "fe80::1%eth0"}, "6.6.6.6", DESCONOCIDA),
        ({"x-forwarded-for": ""}, "6.6.6.6", DESCONOCIDA),
        ({"x-forwarded-for": f"{PUBLICA},"}, "6.6.6.6", DESCONOCIDA),
        ({"x-forwarded-for": f"{PUBLICA}, 1.2.3.4é"}, "6.6.6.6", DESCONOCIDA),
        ({"x-forwarded-for": "1" * 46}, "6.6.6.6", DESCONOCIDA),
    ],
)
def test_ip_del_cliente(cabeceras: dict[str, str], par: str | None, esperada: str) -> None:
    assert _ip(cabeceras, par) == esperada


def test_x_forwarded_for_en_varias_lineas_se_une_en_orden() -> None:
    """Si el proxy añade su salto como línea nueva, gana la última línea, no la primera
    (que escribe el cliente)."""
    cabeceras = Headers(raw=[(b"x-forwarded-for", b"1.1.1.1"), (b"x-forwarded-for", b"8.8.8.8")])
    assert ip_del_cliente(cabeceras, "6.6.6.6") == "8.8.8.8"
    cabeceras = Headers(
        raw=[
            (b"x-forwarded-for", b"9.9.9.9, 1.1.1.1"),
            (b"x-forwarded-for", f"{CF}".encode()),
            (b"cf-connecting-ip", OTRA.encode()),
        ]
    )
    assert ip_del_cliente(cabeceras, None) == OTRA


def test_un_cliente_que_falsifica_las_cabeceras_no_elige_su_cubo() -> None:
    """Directo al origen (sin Cloudflare) el proxy anota la IP real al final: rotar lo que el
    cliente escribe a la izquierda o en `CF-Connecting-IP` no cambia el cubo."""
    cubos = {
        _ip(
            {
                "x-forwarded-for": f"10.{n}.0.1, {n}.{n}.{n}.{n}, {PUBLICA}",
                "cf-connecting-ip": f"5.5.5.{n}",
            },
            "10.0.0.2",
        )
        for n in range(1, 60)
    }
    assert cubos == {PUBLICA}


@pytest.mark.parametrize("rango", limites.RANGOS_CLOUDFLARE, ids=str)
def test_cada_rango_de_cloudflare_entero_y_nada_mas(
    rango: ipaddress.IPv4Network | ipaddress.IPv6Network,
) -> None:
    """Primera y última dirección del rango confían en CF-Connecting-IP; las vecinas no."""
    for dentro in (rango.network_address, rango.broadcast_address):
        assert _ip({"x-forwarded-for": str(dentro), "cf-connecting-ip": OTRA}, None) == OTRA
    for fuera in (rango.network_address - 1, rango.broadcast_address + 1):
        if any(fuera in otro for otro in limites.RANGOS_CLOUDFLARE):
            continue  # 104.16.0.0/13 y 104.24.0.0/14 son contiguos
        assert _ip({"x-forwarded-for": str(fuera), "cf-connecting-ip": OTRA}, None) != OTRA


def test_los_rangos_de_cloudflare_son_los_publicados() -> None:
    assert {str(r) for r in limites.RANGOS_CLOUDFLARE} == {
        "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22",
        "141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20",
        "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
        "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22", "2400:cb00::/32",
        "2606:4700::/32", "2803:f800::/32", "2405:b500::/32", "2405:8100::/32",
        "2a06:98c0::/29", "2c0f:f248::/32",
    }  # fmt: skip


# ---------------------------------------------------------------------------
# Ventana móvil
# ---------------------------------------------------------------------------


def test_la_peticion_121_dentro_de_cualquier_minuto_es_rechazada() -> None:
    reloj = Reloj()
    ventana = VentanaMovil(120, 60, reloj=reloj)
    for _ in range(120):
        assert ventana.intentar("a") is None
        reloj.ahora += 0.25  # 120 en 30 s
    espera = ventana.intentar("a")
    assert espera == pytest.approx(30)
    # Al vencer la primera marca cabe una más, no 120 de golpe (no es ventana fija).
    reloj.ahora = 1000.0 + 60.0
    assert ventana.intentar("a") is None
    assert ventana.intentar("a") is not None


def test_una_marca_de_exactamente_60_s_ya_no_cuenta() -> None:
    reloj = Reloj()
    ventana = VentanaMovil(2, 60, reloj=reloj)
    assert ventana.intentar("a") is None
    assert ventana.intentar("a") is None
    reloj.ahora = 1000.0 + 59.999
    assert ventana.intentar("a") == pytest.approx(0.001, abs=1e-6)
    reloj.ahora = 1000.0 + 60.0
    assert ventana.intentar("a") is None


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


def test_la_clave_activa_sobrevive_al_tope_de_claves() -> None:
    reloj = Reloj()
    ventana = VentanaMovil(2, 60, max_claves=3, reloj=reloj)
    for clave in ("a", "b", "c", "a"):
        assert ventana.intentar(clave) is None
    assert ventana.intentar("d") is None  # olvida la más quieta: `b`, no `a`
    assert ventana.intentar("a") is not None  # `a` conserva sus dos marcas
    assert ventana.intentar("b") is None
    assert ventana.intentar("b") is None  # `b` empezó de cero


def test_vaciar_vacia_todos_los_limitadores() -> None:
    todos = (
        limites.por_token,
        limites.por_ip,
        limites.eventos_por_token,
        limites.scan_por_miembro,
    )
    for limitador in todos:
        limitador.intentar("x")
    limites.vaciar()
    assert [len(limitador) for limitador in todos] == [0, 0, 0, 0]


def _peticion(cabeceras: list[tuple[bytes, bytes]]) -> Request:
    alcance: dict[str, Any] = {
        "type": "http",
        "method": "GET",
        "path": "/api/v1/p/menu/x",
        "headers": cabeceras,
        "client": ("10.0.0.2", 1234),
        "query_string": b"",
    }
    return Request(alcance)


async def test_rafaga_simultanea_en_un_worker_deja_pasar_exactamente_el_limite() -> None:
    async def una() -> bool:
        await asyncio.sleep(0)
        try:
            limites.contar(_peticion([(b"x-forwarded-for", PUBLICA.encode())]))
        except HTTPException as error:
            assert error.status_code == 429
            assert int(error.headers["Retry-After"]) >= 1  # type: ignore[index]
            return False
        return True

    resultados = await asyncio.gather(*(una() for _ in range(limites.LIMITE_POR_IP + 50)))
    assert sum(resultados) == 600


def test_sin_client_ni_cabecera_la_ip_es_desconocida() -> None:
    alcance: dict[str, Any] = {"type": "http", "method": "GET", "path": "/", "headers": []}
    assert limites.ip_de_peticion(Request(alcance)) == DESCONOCIDA
