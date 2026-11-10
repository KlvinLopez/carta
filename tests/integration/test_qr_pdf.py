"""T-1.5: PDF imprimible con el QR de cada mesa (US-21, AC-21.2).

El QR de cada tarjeta se extrae del PDF (imágenes incrustadas, con `pypdf`) y se decodifica
con `zxing-cpp`: la URL tiene que ser exactamente `https://{DOMINIO}/m/{codigo}`. El logo se
prueba con un transporte falso de httpx; nada de estas pruebas sale a la red.
"""

from __future__ import annotations

import asyncio
import io
import ipaddress
import math
import re
import socket
import threading
from typing import Any
from uuid import UUID

import httpx
import pytest
import zxingcpp
from httpx import AsyncClient
from PIL import Image
from pypdf import PdfReader

from app.core.config import settings
from app.core.errores import ErrorCarta
from app.db.models import Mesa, Restaurante, Usuario
from app.schemas.comun import ErrorRespuesta
from app.schemas.mesa import MAX_MESAS_ACTIVAS
from app.services import mesas, qr_pdf
from app.services.qr_pdf import TarjetaQR
from tests.auth_pruebas import cabecera_de
from tests.conftest import Fabrica

A = "/api/v1/admin"
UUID_X = "00000000-0000-4000-8000-0000000000aa"


PUBLICA = "93.184.216.34"


def resolver_a(monkeypatch: pytest.MonkeyPatch, *ips: str) -> None:
    """Todo nombre resuelve a `ips` (`socket.getaddrinfo`, que usa `loop.getaddrinfo`)."""

    def falso(host: Any, puerto: Any, *args: Any, **kwargs: Any) -> list[Any]:
        return [
            (
                socket.AF_INET6 if ":" in ip else socket.AF_INET,
                socket.SOCK_STREAM,
                6,
                "",
                (ip, 443, 0, 0) if ":" in ip else (ip, 443),
            )
            for ip in ips
        ]

    monkeypatch.setattr(socket, "getaddrinfo", falso)


@pytest.fixture(autouse=True)
def sin_dns(monkeypatch: pytest.MonkeyPatch) -> None:
    """Nada sale a la red: todo nombre resuelve a una IP pública y la red real es un
    `transporte` falso. Las pruebas de la defensa SSRF cambian la respuesta con `resolver_a`."""
    resolver_a(monkeypatch, PUBLICA)


def _png(ancho: int = 120, alto: int = 40, color: str = "#4F1728") -> bytes:
    salida = io.BytesIO()
    Image.new("RGB", (ancho, alto), color).save(salida, format="PNG")
    return salida.getvalue()


def _decodificar(pdf: bytes) -> list[str]:
    """Los textos de todos los QR del PDF, en orden de aparición."""
    textos: list[str] = []
    for pagina in PdfReader(io.BytesIO(pdf)).pages:
        for imagen in pagina.images:
            for lectura in zxingcpp.read_barcodes(imagen.image):
                textos.append(lectura.text)
    return textos


def _texto(pdf: bytes) -> str:
    return "\n".join(p.extract_text() for p in PdfReader(io.BytesIO(pdf)).pages)


def _sin_id(respuesta: httpx.Response) -> dict[str, Any]:
    cuerpo: dict[str, Any] = respuesta.json()
    cuerpo["error"].pop("request_id", None)
    return cuerpo


def _url(codigo: str) -> str:
    return f"https://{settings.DOMINIO}/m/{codigo}"


async def _descargar(
    cliente: AsyncClient, restaurante: Restaurante | UUID | str, cabecera: dict[str, str]
) -> httpx.Response:
    rid = restaurante.id if isinstance(restaurante, Restaurante) else restaurante
    return await cliente.get(f"{A}/restaurantes/{rid}/mesas/qr.pdf", headers=cabecera)


@pytest.fixture
async def ocho_mesas(restaurante: Restaurante, fabrica_mesa: Fabrica) -> list[Mesa]:
    return [await fabrica_mesa(restaurante, numero=n) for n in range(1, 9)]


# ===========================================================================
# AC-21.2 · PDF con los QR de todas las mesas
# ===========================================================================


@pytest.mark.ac("AC-21.2")
async def test_el_pdf_trae_un_qr_por_mesa_con_la_url_exacta(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    ocho_mesas: list[Mesa],
) -> None:
    respuesta = await _descargar(cliente, restaurante, cabecera_operador)
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.headers["content-type"] == "application/pdf"
    assert respuesta.headers["cache-control"] == "private, no-store"
    pdf = respuesta.content
    assert pdf.startswith(b"%PDF-")
    assert len(PdfReader(io.BytesIO(pdf)).pages) == math.ceil(len(ocho_mesas) / 4)
    assert sorted(_decodificar(pdf)) == sorted(_url(m.codigo_publico) for m in ocho_mesas)


@pytest.mark.ac("AC-21.2")
async def test_cada_tarjeta_dice_mesa_n_el_restaurante_y_la_leyenda(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    ocho_mesas: list[Mesa],
) -> None:
    pdf = (await _descargar(cliente, restaurante, cabecera_operador)).content
    texto = _texto(pdf)
    for n in range(1, 9):
        assert f"Mesa {n}" in texto
    assert texto.count("Escanea para ver la carta · Carta") == 8
    assert texto.count(restaurante.nombre) == 8


@pytest.mark.ac("AC-21.2")
async def test_solo_las_mesas_activas_y_solo_las_del_restaurante(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_mesa: Fabrica,
    fabrica_restaurante: Fabrica,
    fabrica_operador: Fabrica,
) -> None:
    viva = await fabrica_mesa(restaurante, numero=1)
    baja = await fabrica_mesa(restaurante, numero=2, activa=False)
    otro = await fabrica_restaurante()
    await fabrica_operador(otro)
    ajena = await fabrica_mesa(otro, numero=3)
    pdf = (await _descargar(cliente, restaurante, cabecera_operador)).content
    assert _decodificar(pdf) == [_url(viva.codigo_publico)]
    assert baja.codigo_publico.encode() not in pdf and ajena.codigo_publico.encode() not in pdf


@pytest.mark.ac("AC-21.2")
async def test_un_codigo_regenerado_sale_en_el_pdf_y_el_viejo_no(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    mesa: Mesa,
) -> None:
    viejo = mesa.codigo_publico
    nuevo = (
        await cliente.post(f"{A}/mesas/{mesa.id}/regenerar-codigo", headers=cabecera_operador)
    ).json()["codigo_publico"]
    pdf = (await _descargar(cliente, restaurante, cabecera_operador)).content
    assert _decodificar(pdf) == [_url(nuevo)]
    assert _url(viejo) not in _decodificar(pdf)


@pytest.mark.ac("AC-21.2")
async def test_sin_mesas_activas_es_409_y_no_un_pdf_vacio(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    fabrica_mesa: Fabrica,
) -> None:
    await fabrica_mesa(restaurante, activa=False)
    respuesta = await _descargar(cliente, restaurante, cabecera_operador)
    assert respuesta.status_code == 409
    assert ErrorRespuesta.model_validate(respuesta.json()).error.codigo == "CONFLICTO"


@pytest.mark.ac("AC-21.2")
async def test_el_pdf_de_un_restaurante_ajeno_es_404_igual_que_uno_inexistente(
    cliente: AsyncClient,
    cabecera_operador: dict[str, str],
    fabrica_restaurante: Fabrica,
    fabrica_operador: Fabrica,
    fabrica_mesa: Fabrica,
) -> None:
    otro = await fabrica_restaurante()
    await fabrica_operador(otro)
    await fabrica_mesa(otro)
    ajeno = await _descargar(cliente, otro, cabecera_operador)
    nada = await _descargar(cliente, UUID_X, cabecera_operador)
    assert ajeno.status_code == nada.status_code == 404
    assert _sin_id(ajeno) == _sin_id(nada)
    assert (await cliente.get(f"{A}/restaurantes/{otro.id}/mesas/qr.pdf")).status_code == 401


@pytest.mark.ac("AC-21.2")
async def test_el_nombre_del_archivo_sale_del_slug_nunca_del_nombre_del_restaurante(
    cliente: AsyncClient,
    fabrica_restaurante: Fabrica,
    fabrica_operador: Fabrica,
    fabrica_mesa: Fabrica,
    sesion: Any,
) -> None:
    malo = 'Tacos "El Güero"; filename=../../etc/passwd\r\nX-Inyectado: 1'
    restaurante = await fabrica_restaurante(nombre=malo, slug="tacos-el-guero")
    operador = await fabrica_operador(restaurante)
    await fabrica_mesa(restaurante)
    usuario = await sesion.get(Usuario, operador.usuario_id)
    respuesta = await _descargar(cliente, restaurante, cabecera_de(usuario.firebase_uid))
    assert respuesta.status_code == 200, respuesta.text
    disposicion = respuesta.headers["content-disposition"]
    assert disposicion == 'attachment; filename="qr-mesas-tacos-el-guero.pdf"'
    assert "passwd" not in disposicion and "Inyectado" not in str(respuesta.headers)
    # Un nombre con caracteres fuera de WinAnsi no rompe el PDF.
    assert respuesta.content.startswith(b"%PDF-")


@pytest.mark.ac("AC-21.2")
@pytest.mark.parametrize(
    ("slug", "esperado"),
    [
        ("la-ceiba", "qr-mesas-la-ceiba.pdf"),
        ('a"b/../c d\r\n', "qr-mesas-abcd.pdf"),
        ("ñ", "qr-mesas.pdf"),
        ("", "qr-mesas.pdf"),
        ("x" * 200, f"qr-mesas-{'x' * 60}.pdf"),
    ],
)
def test_nombre_de_archivo_solo_deja_letras_digitos_y_guiones(slug: str, esperado: str) -> None:
    assert qr_pdf.nombre_de_archivo(slug) == esperado
    assert re.fullmatch(r"[a-z0-9.-]+", esperado)


@pytest.mark.ac("AC-21.2")
async def test_con_logo_las_tarjetas_lo_llevan_y_el_qr_sigue_leyendose(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    mesa: Mesa,
    sesion: Any,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    restaurante.logo_url = "https://img.carta.mx/logo.png"
    await sesion.commit()
    pedidos: list[str | None] = []

    async def logo(url: str | None, **_: Any) -> bytes | None:
        pedidos.append(url)
        return _png()

    monkeypatch.setattr(qr_pdf, "descargar_logo", logo)
    pdf = (await _descargar(cliente, restaurante, cabecera_operador)).content
    assert pedidos == ["https://img.carta.mx/logo.png"]
    assert _decodificar(pdf) == [_url(mesa.codigo_publico)]
    imagenes = sum(len(p.images) for p in PdfReader(io.BytesIO(pdf)).pages)
    assert imagenes == 2  # el QR y el logo


@pytest.mark.ac("AC-21.2")
async def test_un_logo_http_no_se_descarga_ni_aparece_en_el_pdf(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    mesa: Mesa,
    sesion: Any,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    restaurante.logo_url = "http://interno.local/logo-secreto.png"
    await sesion.commit()

    def no_debe_resolver(*args: Any, **kwargs: Any) -> None:
        raise AssertionError("no debía resolver nada")

    monkeypatch.setattr(socket, "getaddrinfo", no_debe_resolver)
    respuesta = await _descargar(cliente, restaurante, cabecera_operador)
    assert respuesta.status_code == 200
    assert b"interno.local" not in respuesta.content
    assert "interno.local" not in _texto(respuesta.content)
    assert sum(len(p.images) for p in PdfReader(io.BytesIO(respuesta.content)).pages) == 1


# ===========================================================================
# Unidad: generar_pdf, logo y topes
# ===========================================================================


def _tarjetas(n: int) -> list[TarjetaQR]:
    return [TarjetaQR(i, f"codigo-de-prueba-{i:06d}-abcdef") for i in range(1, n + 1)]


@pytest.mark.ac("AC-21.2")
def test_el_pdf_sin_comprimir_solo_lleva_lo_que_se_imprime() -> None:
    pdf = qr_pdf.generar_pdf("Casa Ceiba", _png(), _tarjetas(2), comprimir=False)
    for prohibido in (b"http://", b"logo_url", b"comensal", b"slug"):
        assert prohibido not in pdf, prohibido
    # Metadatos fijos: autor anónimo y fecha constante (`invariant`), nada del restaurante.
    assert b"/Author (anonymous)" in pdf and b"D:20000101000000" in pdf
    assert b"Casa Ceiba" in pdf  # el nombre sí se imprime; es lo único del restaurante
    assert b"codigo-de-prueba-000001" not in pdf  # el código sólo va dentro del QR (imagen)
    assert _decodificar(pdf) == [
        _url("codigo-de-prueba-000001-abcdef"),
        _url("codigo-de-prueba-000002-abcdef"),
    ]


@pytest.mark.ac("AC-21.2")
def test_el_pdf_es_determinista_y_trae_las_cuatro_tarjetas_por_hoja() -> None:
    a = qr_pdf.generar_pdf("Casa Ceiba", None, _tarjetas(5))
    b = qr_pdf.generar_pdf("Casa Ceiba", None, _tarjetas(5))
    assert a == b  # `invariant`: sin fecha ni identificadores al azar
    assert len(PdfReader(io.BytesIO(a)).pages) == 2


@pytest.mark.ac("AC-21.2")
def test_nombres_largos_y_fuera_de_winansi_caben_y_no_rompen() -> None:
    nombre = "Restaurante " + "Extraordinariamente Largo " * 8 + "日本語 Ωmega \x00\x07"
    pdf = qr_pdf.generar_pdf(nombre, None, _tarjetas(1))
    assert _decodificar(pdf) == [_url("codigo-de-prueba-000001-abcdef")]
    assert "…" in _texto(pdf) or "?" in _texto(pdf)


@pytest.mark.ac("AC-21.2")
def test_los_topes_del_pdf() -> None:
    assert MAX_MESAS_ACTIVAS == 500
    pdf = qr_pdf.generar_pdf("Casa", None, _tarjetas(MAX_MESAS_ACTIVAS))
    assert len(PdfReader(io.BytesIO(pdf)).pages) == 125
    with pytest.raises(ErrorCarta) as excedido:
        qr_pdf.generar_pdf("Casa", None, _tarjetas(MAX_MESAS_ACTIVAS + 1))
    assert excedido.value.http == 422
    with pytest.raises(ErrorCarta) as vacio:
        qr_pdf.generar_pdf("Casa", None, [])
    assert vacio.value.http == 409


class Transporte(httpx.AsyncBaseTransport):
    def __init__(self, respuesta: httpx.Response | Exception) -> None:
        self.respuesta = respuesta
        self.pedidos: list[httpx.Request] = []

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        self.pedidos.append(request)
        if isinstance(self.respuesta, Exception):
            raise self.respuesta
        return self.respuesta


URL_LOGO = "https://img.carta.mx/logos/ceiba.png"


@pytest.mark.ac("AC-21.2")
async def test_un_logo_https_valido_se_descarga_sin_seguir_redirecciones() -> None:
    transporte = Transporte(httpx.Response(200, content=_png()))
    assert await qr_pdf.descargar_logo(URL_LOGO, transporte=transporte) == _png()
    assert len(transporte.pedidos) == 1
    redirige = Transporte(httpx.Response(302, headers={"location": "https://10.0.0.1/x"}))
    assert await qr_pdf.descargar_logo(URL_LOGO, transporte=redirige) is None
    assert len(redirige.pedidos) == 1  # no siguió


@pytest.mark.ac("AC-21.2")
@pytest.mark.parametrize(
    "url",
    [
        None,
        "",
        "http://img.carta.mx/logo.png",
        "ftp://img.carta.mx/logo.png",
        "javascript:alert(1)",
        "https://",
        "https://usuario:clave@img.carta.mx/logo.png",
        "https://img.carta.mx:8443/logo.png",
        "https://localhost/logo.png",
        "https://127.0.0.1/logo.png",
        "https://10.0.0.5/logo.png",
        "https://192.168.1.10/logo.png",
        "https://169.254.169.254/latest/meta-data",
        "https://[::1]/logo.png",
        "https://[fd00::1]/logo.png",
    ],
)
async def test_un_logo_inseguro_ni_siquiera_se_pide(url: str | None) -> None:
    transporte = Transporte(httpx.Response(200, content=_png()))
    assert await qr_pdf.descargar_logo(url, transporte=transporte) is None
    assert transporte.pedidos == []


@pytest.mark.ac("AC-21.2")
@pytest.mark.parametrize(
    "respuesta",
    [
        httpx.Response(404),
        httpx.Response(500, content=b"x"),
        httpx.Response(200, content=b"x" * (qr_pdf.MAX_BYTES_LOGO + 1)),
        httpx.Response(200, content=b"x", headers={"content-length": "99999999"}),
        httpx.ConnectTimeout("lento"),
        httpx.ConnectError("sin red"),
        httpx.ReadError("cortado"),
    ],
)
async def test_si_el_logo_falla_la_tarjeta_sale_sin_logo(
    respuesta: httpx.Response | Exception,
) -> None:
    assert await qr_pdf.descargar_logo(URL_LOGO, transporte=Transporte(respuesta)) is None
    pdf = await qr_pdf.pdf_de_mesas(
        "Casa", URL_LOGO, _tarjetas(1), transporte=Transporte(respuesta)
    )
    assert _decodificar(pdf) == [_url("codigo-de-prueba-000001-abcdef")]


@pytest.mark.ac("AC-21.2")
def test_preparar_logo_rechaza_lo_que_no_es_imagen_o_es_enorme() -> None:
    assert qr_pdf.preparar_logo(None) is None
    assert qr_pdf.preparar_logo(b"") is None
    assert qr_pdf.preparar_logo(b"%PDF-1.4 no es imagen") is None
    assert qr_pdf.preparar_logo(b"<svg xmlns='http://www.w3.org/2000/svg'/>") is None
    assert qr_pdf.preparar_logo(_png()[:60]) is None  # truncada
    enorme = io.BytesIO()
    Image.new("1", (5000, 5000)).save(enorme, format="PNG")  # unos KB, 25 millones de píxeles
    assert len(enorme.getvalue()) < qr_pdf.MAX_BYTES_LOGO
    assert qr_pdf.preparar_logo(enorme.getvalue()) is None
    grande = qr_pdf.preparar_logo(_png(3000, 1000))
    assert grande is not None
    with Image.open(io.BytesIO(grande)) as imagen:
        assert max(imagen.size) == qr_pdf.LADO_LOGO_PX


# ===========================================================================
# Revisión de maestra · A1: hilo propio y un PDF a la vez
# ===========================================================================


@pytest.mark.ac("AC-21.2")
async def test_la_generacion_corre_en_su_propio_hilo(monkeypatch: pytest.MonkeyPatch) -> None:
    hilos: dict[str, str] = {}
    original = qr_pdf.generar_pdf
    preparar = qr_pdf.preparar_logo

    def generar(*args: Any, **kwargs: Any) -> bytes:
        hilos["generar"] = threading.current_thread().name
        return original(*args, **kwargs)

    def logo(datos: bytes | None) -> bytes | None:
        hilos["logo"] = threading.current_thread().name
        return preparar(datos)

    monkeypatch.setattr(qr_pdf, "generar_pdf", generar)
    monkeypatch.setattr(qr_pdf, "preparar_logo", logo)
    pdf = await qr_pdf.pdf_de_mesas(
        "Casa", URL_LOGO, _tarjetas(1), transporte=Transporte(httpx.Response(200, content=_png()))
    )
    assert pdf.startswith(b"%PDF-")
    principal = threading.current_thread().name
    assert hilos["generar"].startswith("qr_pdf") and hilos["logo"].startswith("qr_pdf")
    assert hilos["generar"] != principal and hilos["logo"] != principal


@pytest.mark.ac("AC-21.2")
async def test_dos_pdf_a_la_vez_el_segundo_espera_o_503(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    mesa: Mesa,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(qr_pdf, "ESPERA_TURNO_SEG", 0.2)
    turno = qr_pdf._semaforo()
    await turno.acquire()  # «otro PDF en curso» que no termina
    try:
        ocupado = await _descargar(cliente, restaurante, cabecera_operador)
    finally:
        turno.release()
    assert ocupado.status_code == 503, ocupado.text
    assert ErrorRespuesta.model_validate(ocupado.json()).error.codigo == "SERVICIO_OCUPADO"
    libre = await _descargar(cliente, restaurante, cabecera_operador)
    assert libre.status_code == 200
    assert _decodificar(libre.content) == [_url(mesa.codigo_publico)]


@pytest.mark.ac("AC-21.2")
async def test_el_turno_se_libera_aunque_falle_la_generacion(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def falla(*args: Any, **kwargs: Any) -> bytes:
        raise RuntimeError("boom")

    monkeypatch.setattr(qr_pdf, "generar_pdf", falla)
    with pytest.raises(RuntimeError):
        await qr_pdf.pdf_de_mesas("Casa", None, _tarjetas(1))
    assert not qr_pdf._semaforo().locked()


# ===========================================================================
# Revisión de maestra · A2: la defensa SSRF por DNS
# ===========================================================================


@pytest.mark.ac("AC-21.2")
@pytest.mark.parametrize(
    "ips",
    [
        ["10.0.0.5"],
        ["127.0.0.1"],
        ["169.254.169.254"],
        ["100.64.0.1"],
        ["192.168.0.10"],
        ["fd00::1"],
        ["fe80::1"],
        ["::1"],
        ["64:ff9b::7f00:1"],  # NAT64 de 127.0.0.1
        ["64:ff9b::a00:5"],  # NAT64 de 10.0.0.5
        ["::7f00:1"],  # IPv4-compatible de 127.0.0.1
        ["::ffff:10.0.0.1"],  # IPv4 mapeada
        ["2002:7f00:1::"],  # 6to4 de 127.0.0.1
        ["2001:0:4136:e378:8000:63bf:3fff:fdd2"],  # Teredo con cliente 192.0.2.45
        [PUBLICA, "10.0.0.5"],  # mezcla: basta una interna
        ["10.0.0.5", PUBLICA],
        [],
    ],
)
async def test_un_host_que_resuelve_a_ip_no_publica_no_se_pide(
    monkeypatch: pytest.MonkeyPatch, ips: list[str]
) -> None:
    resolver_a(monkeypatch, *ips)

    class Espia:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            raise AssertionError("no debía abrir ninguna conexión")

    monkeypatch.setattr(qr_pdf.httpx, "AsyncClient", Espia)
    assert await qr_pdf._ip_validada("img.carta.mx") is None
    assert await qr_pdf.descargar_logo(URL_LOGO) is None
    transporte = Transporte(httpx.Response(200, content=_png()))
    assert (
        await qr_pdf.descargar_logo(URL_LOGO, transporte=transporte) is None
    )  # también con transporte
    assert transporte.pedidos == []


@pytest.mark.ac("AC-21.2")
async def test_un_fallo_de_dns_es_sin_logo(monkeypatch: pytest.MonkeyPatch) -> None:
    def no_existe(*args: Any, **kwargs: Any) -> None:
        raise socket.gaierror("sin DNS")

    monkeypatch.setattr(socket, "getaddrinfo", no_existe)
    assert await qr_pdf._ip_validada("img.carta.mx") is None
    assert await qr_pdf.descargar_logo(URL_LOGO) is None


@pytest.mark.ac("AC-21.2")
async def test_todas_globales_conecta_a_la_ip_validada_con_el_nombre_en_host_y_sni(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    v6 = "2606:2800:220:1:248:1893:25c8:1946"
    resolver_a(monkeypatch, PUBLICA, v6)
    assert await qr_pdf._ip_validada("img.carta.mx") == PUBLICA
    transporte = Transporte(httpx.Response(200, content=_png()))
    assert await qr_pdf.descargar_logo(URL_LOGO + "?v=2", transporte=transporte) == _png()
    (pedido,) = transporte.pedidos
    # Sin segunda resolución (anti *rebinding*): se conecta a la IP; el nombre viaja aparte.
    assert pedido.url.host == PUBLICA and pedido.url.path == "/logos/ceiba.png"
    assert pedido.url.query == b"v=2"
    assert pedido.headers["host"] == "img.carta.mx"
    assert pedido.extensions["sni_hostname"] == "img.carta.mx"
    resolver_a(monkeypatch, v6)
    transporte = Transporte(httpx.Response(200, content=_png()))
    assert await qr_pdf.descargar_logo(URL_LOGO, transporte=transporte) == _png()
    assert transporte.pedidos[0].url.host == v6


@pytest.mark.ac("AC-21.2")
@pytest.mark.parametrize(
    ("ip", "publica"),
    [
        ("8.8.8.8", True),
        ("2606:4700:4700::1111", True),
        ("64:ff9b::808:808", True),  # NAT64 de 8.8.8.8
        ("::ffff:8.8.8.8", True),
        ("0.0.0.0", False),
        ("::", False),
        ("::1", False),
        ("224.0.0.1", False),
        ("64:ff9b::7f00:1", False),
        ("::7f00:1", False),
        ("::ffff:127.0.0.1", False),
        ("2002:c0a8:101::", False),  # 6to4 de 192.168.1.1
    ],
)
def test_ip_publica(ip: str, publica: bool) -> None:
    assert qr_pdf._ip_publica(ipaddress.ip_address(ip)) is publica


@pytest.mark.ac("AC-21.2")
def test_el_logo_solo_se_decodifica_como_png_jpeg_o_webp() -> None:
    def en(formato: str) -> bytes:
        salida = io.BytesIO()
        Image.new("RGB", (30, 30), "#4F1728").save(salida, format=formato)
        return salida.getvalue()

    for aceptado in ("PNG", "JPEG", "WEBP"):
        assert qr_pdf.preparar_logo(en(aceptado)) is not None, aceptado
    for rechazado in ("GIF", "BMP", "TIFF", "PDF", "ICO", "PPM"):
        assert qr_pdf.preparar_logo(en(rechazado)) is None, rechazado


# ===========================================================================
# Revisión de maestra · A3, B2, B3: huecos de pruebas
# ===========================================================================


class Trozos(httpx.AsyncByteStream):
    def __init__(self, trozos: list[bytes]) -> None:
        self.trozos = trozos

    async def __aiter__(self) -> Any:
        for trozo in self.trozos:
            yield trozo


@pytest.mark.ac("AC-21.2")
async def test_un_logo_sin_content_length_que_pasa_de_1_mb_se_descarta() -> None:
    assert qr_pdf.MAX_BYTES_LOGO == 1_000_000
    pasado = httpx.Response(200, stream=Trozos([b"x" * 100_000] * 11))  # 1 100 000 B
    assert "content-length" not in pasado.headers
    assert await qr_pdf.descargar_logo(URL_LOGO, transporte=Transporte(pasado)) is None
    justo = httpx.Response(200, stream=Trozos([b"x" * 99_999] * 10 + [b"x" * 9]))
    assert await qr_pdf.descargar_logo(URL_LOGO, transporte=Transporte(justo)) == b"x" * 999_999
    exacto = httpx.Response(200, stream=Trozos([b"x" * 100_000] * 10))
    assert (
        len(await qr_pdf.descargar_logo(URL_LOGO, transporte=Transporte(exacto)) or b"")
        == 1_000_000
    )


class Colgado(httpx.AsyncBaseTransport):
    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        await asyncio.Event().wait()  # nunca responde
        raise AssertionError


@pytest.mark.ac("AC-21.2")
async def test_el_plazo_total_del_logo_corta_un_servidor_colgado(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    assert qr_pdf.PLAZO_LOGO_SEG == 3.0
    assert (qr_pdf.PLAZOS_HTTP.connect, qr_pdf.PLAZOS_HTTP.read) == (1.0, 2.0)
    monkeypatch.setattr(qr_pdf, "PLAZO_LOGO_SEG", 0.2)
    assert await qr_pdf.descargar_logo(URL_LOGO, transporte=Colgado()) is None


@pytest.mark.ac("AC-21.2")
def test_el_nombre_con_n_y_acentos_se_imprime() -> None:
    pdf = qr_pdf.generar_pdf("Café Piñata Güero", None, _tarjetas(1))
    assert "Café Piñata Güero" in _texto(pdf)


@pytest.mark.ac("AC-21.2")
def test_cien_mesas_dan_cien_qr_distintos_con_su_url() -> None:
    tarjetas = _tarjetas(100)
    textos = _decodificar(qr_pdf.generar_pdf("Casa", None, tarjetas))
    assert len(set(textos)) == 100
    assert sorted(textos) == sorted(_url(t.codigo_publico) for t in tarjetas)


@pytest.mark.ac("AC-21.2")
def test_el_logo_sale_en_todas_las_tarjetas() -> None:
    pdf = qr_pdf.generar_pdf("Casa", _png(), _tarjetas(8), comprimir=False)
    usos = re.findall(rb"/(FormXob\.\w+) Do", pdf)
    repetidos = {nombre: usos.count(nombre) for nombre in set(usos)}
    assert len(repetidos) == 9  # 8 QR distintos y un logo
    assert sorted(repetidos.values()) == [1] * 8 + [8]  # el logo, una vez por tarjeta


@pytest.mark.ac("AC-21.2")
async def test_por_la_ruta_real_el_pdf_sin_comprimir_no_trae_logo_url_ni_slug(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    mesa: Mesa,
    sesion: Any,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    restaurante.logo_url = "https://img.carta.mx/logo-secreto.png"
    restaurante.slug = "slug-distintivo-xyz"
    await sesion.commit()

    async def logo(url: str | None, **_: Any) -> bytes | None:
        return _png()

    original = qr_pdf.generar_pdf
    monkeypatch.setattr(qr_pdf, "descargar_logo", logo)
    monkeypatch.setattr(qr_pdf, "generar_pdf", lambda *a, **k: original(*a, comprimir=False))
    respuesta = await _descargar(cliente, restaurante, cabecera_operador)
    assert respuesta.status_code == 200
    pdf = respuesta.content
    assert restaurante.nombre.encode() in pdf  # el PDF sí quedó legible
    for prohibido in (b"logo-secreto", b"img.carta.mx", b"slug-distintivo", b"https://"):
        assert prohibido not in pdf, prohibido
    assert "slug-distintivo-xyz" in respuesta.headers["content-disposition"]  # sólo en el nombre


# ===========================================================================
# Revisión de maestra · A5: el PDF no imprime un código ya revocado
# ===========================================================================


@pytest.mark.ac("AC-21.3")
async def test_si_se_regenera_un_codigo_mientras_se_genera_el_pdf_sale_con_el_nuevo(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    mesa: Mesa,
    sesion: Any,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    viejo = mesa.codigo_publico
    original = qr_pdf.pdf_de_mesas
    llamadas: list[int] = []

    async def con_carrera(*args: Any, **kwargs: Any) -> bytes:
        pdf = await original(*args, **kwargs)
        llamadas.append(1)
        if len(llamadas) == 1:  # alguien regenera justo cuando termina la primera vuelta
            await mesas.regenerar_codigo(sesion, mesa.id, restaurante.id)
        return pdf

    monkeypatch.setattr(qr_pdf, "pdf_de_mesas", con_carrera)
    respuesta = await _descargar(cliente, restaurante, cabecera_operador)
    assert respuesta.status_code == 200, respuesta.text
    assert len(llamadas) == 2
    await sesion.refresh(mesa)
    assert mesa.codigo_publico != viejo
    assert _decodificar(respuesta.content) == [_url(mesa.codigo_publico)]
    assert _url(viejo) not in _decodificar(respuesta.content)


@pytest.mark.ac("AC-21.3")
async def test_si_el_codigo_sigue_cambiando_es_409_codigos_cambiados(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    mesa: Mesa,
    sesion: Any,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    original = qr_pdf.pdf_de_mesas

    async def siempre(*args: Any, **kwargs: Any) -> bytes:
        pdf = await original(*args, **kwargs)
        await mesas.regenerar_codigo(sesion, mesa.id, restaurante.id)
        return pdf

    monkeypatch.setattr(qr_pdf, "pdf_de_mesas", siempre)
    respuesta = await _descargar(cliente, restaurante, cabecera_operador)
    assert respuesta.status_code == 409
    assert ErrorRespuesta.model_validate(respuesta.json()).error.codigo == "CODIGOS_CAMBIADOS"
