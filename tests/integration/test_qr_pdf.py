"""T-1.5: PDF imprimible con el QR de cada mesa (US-21, AC-21.2).

El QR de cada tarjeta se extrae del PDF (imágenes incrustadas, con `pypdf`) y se decodifica
con `zxing-cpp`: la URL tiene que ser exactamente `https://{DOMINIO}/m/{codigo}`. El logo se
prueba con un transporte falso de httpx; nada de estas pruebas sale a la red.
"""

from __future__ import annotations

import io
import math
import re
from typing import Any
from uuid import UUID

import httpx
import pytest
import zxingcpp
from httpx import AsyncClient
from PIL import Image
from pypdf import PdfReader

from app.core.config import settings
from app.db.models import Mesa, Restaurante
from app.schemas.comun import ErrorRespuesta
from app.schemas.mesa import MAX_MESAS_ACTIVAS
from app.services import qr_pdf
from app.services.qr_pdf import TarjetaQR
from tests.conftest import Fabrica

A = "/api/v1/admin"
UUID_X = "00000000-0000-4000-8000-0000000000aa"


@pytest.fixture(autouse=True)
def sin_red(monkeypatch: pytest.MonkeyPatch) -> None:
    """Ningún logo se descarga de verdad: sin DNS, `descargar_logo` devuelve `None`."""

    async def no_resuelve(host: str) -> bool:
        return False

    monkeypatch.setattr(qr_pdf, "_resuelve_a_publico", no_resuelve)


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
    for r in (ajeno, nada):
        r.json()["error"].pop("request_id", None)
    assert ajeno.json()["error"]["codigo"] == nada.json()["error"]["codigo"]
    assert ajeno.json()["error"]["mensaje"] == nada.json()["error"]["mensaje"]
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
    from app.db.models import Usuario
    from tests.auth_pruebas import cabecera_de

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
        ('a"b/../c d\r\n', "qr-mesas-abc-d.pdf"[:0] + "qr-mesas-abcd.pdf"),
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

    async def no_debe_resolver(host: str) -> bool:
        raise AssertionError(f"no debía resolver {host}")

    monkeypatch.setattr(qr_pdf, "_resuelve_a_publico", no_debe_resolver)
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
    from app.core.errores import ErrorCarta

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
