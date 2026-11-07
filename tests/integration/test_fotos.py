"""T-1.4: fotos de platillos (US-17, AC-17.1 a AC-17.3).

Cubre `POST /admin/platillos/{id}/foto` y `DELETE …/foto` de punta a punta con el almacén
local (carpeta temporal, fixture `almacen` de `conftest.py`) y con un S3 falso (moto en modo
servidor en 127.0.0.1: nada sale a la red): formatos aceptados por contenido (JPG, PNG y un
HEIC convertido), un PDF renombrado `.jpg` rechazado con 415, variantes WebP de 400 y
1200 px con nombre por hash y `Cache-Control` inmutable, el original intacto en el bucket
privado, orientación EXIF, bomba de descompresión, límites de tamaño por `Content-Length`
(antes de leer), en *streaming* y con un `Content-Length` mentiroso, campos de más, ajeno →
404, invalidación del menú y `/ready` con el almacén.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import socket
import threading
from collections.abc import Iterator
from pathlib import Path
from typing import Any
from uuid import UUID

import boto3
import httpx
import pytest
from httpx import AsyncClient
from moto.server import ThreadedMotoServer
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CategoriaMenu, Platillo, Restaurante, TipoImagen
from app.main import app
from app.schemas.comun import ErrorRespuesta
from app.services import assets
from app.services.assets import Almacen, AlmacenLocal, AlmacenS3, ErrorAlmacen, obtener_almacen
from app.services.cache_menu import cache_menu
from tests import imagenes_pruebas as img
from tests.auth_pruebas import cabecera_de
from tests.conftest import URL_FOTOS_PRUEBAS, Fabrica

A = "/api/v1/admin"
UUID_X = "00000000-0000-4000-8000-0000000000aa"
MB = 1024 * 1024


def _error(respuesta: httpx.Response) -> dict[str, Any]:
    cuerpo: dict[str, Any] = ErrorRespuesta.model_validate(respuesta.json()).model_dump()["error"]
    return cuerpo


def _archivos(almacen: AlmacenLocal, bucket: str) -> dict[str, bytes]:
    raiz = almacen.raiz / bucket
    if not raiz.exists():
        return {}
    return {
        str(p.relative_to(raiz)): p.read_bytes()
        for p in sorted(raiz.rglob("*"))
        if p.is_file() and not p.name.startswith(".")
    }


async def _subir(
    cliente: AsyncClient,
    platillo_id: UUID | str,
    datos: bytes,
    cabecera: dict[str, str],
    nombre: str = "foto.jpg",
    tipo: str = "image/jpeg",
    **extra: Any,
) -> httpx.Response:
    return await cliente.post(
        f"{A}/platillos/{platillo_id}/foto",
        files={"archivo": (nombre, datos, tipo)},
        headers=cabecera,
        **extra,
    )


@pytest.fixture(autouse=True)
def cache_limpia() -> Iterator[None]:
    """Sin Cloudflare en estas pruebas: sólo se mira la generación del menú."""
    anterior = cache_menu.purgador
    cache_menu.purgador = None
    cache_menu.vaciar()
    try:
        yield
    finally:
        cache_menu.cancelar_purgas()
        cache_menu.purgador = anterior
        cache_menu.vaciar()


@pytest.fixture
async def ajeno(fabrica_restaurante: Fabrica, fabrica_operador: Fabrica) -> Restaurante:
    restaurante: Restaurante = await fabrica_restaurante()
    await fabrica_operador(restaurante)
    return restaurante


# ===========================================================================
# AC-17.1 · JPG, PNG y HEIC hasta 15 MB (por contenido)
# ===========================================================================


@pytest.mark.ac("AC-17.1", "AC-17.2")
async def test_un_jpg_queda_como_foto_con_sus_variantes(
    cliente: AsyncClient,
    sesion: AsyncSession,
    almacen: AlmacenLocal,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    original = img.jpeg(2400, 1600)
    respuesta = await _subir(cliente, platillo.id, original, cabecera_operador)
    assert respuesta.status_code == 200, respuesta.text
    cuerpo = respuesta.json()
    assert cuerpo["imagen_tipo"] == "foto"
    assert cuerpo["id"] == str(platillo.id)

    publicos = _archivos(almacen, "publico")
    assert len(publicos) == 2
    medidas = {}
    for clave, datos in publicos.items():
        # Nombre por hash del contenido de la propia variante (inmutable en el borde).
        assert clave.startswith(f"platillos/{platillo.restaurante_id}/")
        assert Path(clave).name.startswith(hashlib.sha256(datos).hexdigest()[:32])
        assert clave.endswith(".webp")
        variante = img.abrir(datos)
        assert variante.format == "WEBP"
        medidas[f"{URL_FOTOS_PRUEBAS}/{clave}"] = variante.size
    assert medidas == {
        cuerpo["foto_thumb_url"]: (400, 267),
        cuerpo["foto_detalle_url"]: (1200, 800),
    }

    privados = _archivos(almacen, "privado")
    clave_original = f"originales/{platillo.restaurante_id}/{platillo.id}/"
    clave_original += f"{hashlib.sha256(original).hexdigest()}.jpg"
    assert privados == {clave_original: original}  # el original, byte a byte

    await sesion.refresh(platillo)
    assert platillo.imagen_tipo is TipoImagen.foto
    assert platillo.foto_detalle_url == cuerpo["foto_detalle_url"]
    assert platillo.foto_url == cuerpo["foto_detalle_url"]
    assert platillo.foto_thumb_url == cuerpo["foto_thumb_url"]
    assert platillo.foto_original_url == clave_original  # clave privada, no una URL pública
    assert respuesta.headers["cache-control"] == "private, no-store"


@pytest.mark.ac("AC-17.1", "AC-17.2")
async def test_un_heic_se_convierte_a_webp(
    cliente: AsyncClient,
    almacen: AlmacenLocal,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    original = img.heic(1600, 1200)
    assert original[4:12] == b"ftypheic"
    respuesta = await _subir(
        cliente, platillo.id, original, cabecera_operador, "IMG_0001.HEIC", "image/heic"
    )
    assert respuesta.status_code == 200, respuesta.text
    tamanos = sorted(img.abrir(d).size for d in _archivos(almacen, "publico").values())
    assert tamanos == [(400, 300), (1200, 900)]
    assert all(img.abrir(d).format == "WEBP" for d in _archivos(almacen, "publico").values())
    (clave, datos), *_ = _archivos(almacen, "privado").items()
    assert clave.endswith(".heic") and datos == original
    detalle = img.abrir(
        _archivos(almacen, "publico")[
            respuesta.json()["foto_detalle_url"].split(f"{URL_FOTOS_PRUEBAS}/")[1]
        ]
    )
    assert _parece(detalle.convert("RGB").getpixel((100, 450)), img.ROJO)


@pytest.mark.ac("AC-17.1")
async def test_un_png_con_transparencia_la_conserva(
    cliente: AsyncClient,
    almacen: AlmacenLocal,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    respuesta = await _subir(
        cliente, platillo.id, img.png(900, 600), cabecera_operador, "logo.png", "image/png"
    )
    assert respuesta.status_code == 200, respuesta.text
    variantes = [img.abrir(d) for d in _archivos(almacen, "publico").values()]
    # 900 px no se agranda a 1200: el detalle se queda en 900.
    assert sorted(v.size for v in variantes) == [(400, 267), (900, 600)]
    assert all(v.mode == "RGBA" for v in variantes)
    assert next(iter(_archivos(almacen, "privado"))).endswith(".png")


@pytest.mark.ac("AC-17.1")
@pytest.mark.parametrize("modo", ["L", "P", "I;16", "CMYK", "LA"])
async def test_otros_modos_de_color_tambien_entran(
    cliente: AsyncClient, platillo: Platillo, cabecera_operador: dict[str, str], modo: str
) -> None:
    if modo == "CMYK":
        import io

        salida = io.BytesIO()
        img.mitades(300, 200).convert("CMYK").save(salida, "JPEG")
        datos = salida.getvalue()
    else:
        datos = img.png(300, 200, modo)
    respuesta = await _subir(cliente, platillo.id, datos, cabecera_operador)
    assert respuesta.status_code == 200, respuesta.text


@pytest.mark.ac("AC-17.1")
async def test_el_tipo_sale_del_contenido_no_del_nombre_ni_del_content_type(
    cliente: AsyncClient, platillo: Platillo, cabecera_operador: dict[str, str]
) -> None:
    """Un JPG real llamado `menu.pdf` y declarado `application/pdf` es un JPG."""
    respuesta = await _subir(
        cliente, platillo.id, img.jpeg(600, 400), cabecera_operador, "menu.pdf", "application/pdf"
    )
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json()["imagen_tipo"] == "foto"


@pytest.mark.ac("AC-17.1")
async def test_quince_mb_exactos_entran_y_un_byte_mas_es_413(
    cliente: AsyncClient,
    almacen: AlmacenLocal,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    base = img.jpeg(1600, 1200)
    # Un JPEG con relleno tras el fin de imagen: válido y de 15 MB justos.
    justo = base + b"\0" * (15 * MB - len(base))
    assert len(justo) == 15 * MB
    respuesta = await _subir(cliente, platillo.id, justo, cabecera_operador)
    assert respuesta.status_code == 200, respuesta.text

    otro = await _subir(cliente, platillo.id, justo + b"\0", cabecera_operador)
    assert otro.status_code == 413
    assert _error(otro)["codigo"] == "ARCHIVO_EXCEDE_LIMITE"
    assert len(_archivos(almacen, "privado")) == 1  # el de 15 MB + 1 no se guardó


# ===========================================================================
# AC-17.2 · variantes, orientación, metadatos, original, idempotencia
# ===========================================================================


def _parece(pixel: Any, color: tuple[int, int, int], margen: int = 40) -> bool:
    return all(abs(a - b) <= margen for a, b in zip(pixel[:3], color, strict=True))


@pytest.mark.ac("AC-17.2")
async def test_la_orientacion_exif_se_aplica_y_los_metadatos_no_salen(
    cliente: AsyncClient,
    almacen: AlmacenLocal,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    # 300 × 200 guardada «acostada» (orientación 6 = girar 90° a la derecha al mostrar).
    original = img.jpeg(300, 200, orientacion=6, marca="CamaraSecreta")
    respuesta = await _subir(cliente, platillo.id, original, cabecera_operador)
    assert respuesta.status_code == 200, respuesta.text
    for datos in _archivos(almacen, "publico").values():
        variante = img.abrir(datos)
        assert variante.size == (200, 300)  # de pie
        # La mitad izquierda (roja) del archivo queda arriba tras girar a la derecha.
        assert _parece(variante.convert("RGB").getpixel((100, 30)), img.ROJO)
        assert _parece(variante.convert("RGB").getpixel((100, 270)), img.AZUL)
        assert not variante.getexif()
        assert b"CamaraSecreta" not in datos
    # XMP tampoco (hoy Pillow no lo copia a WebP; esto avisa si un día lo hace).
    otra = await _subir(
        cliente, platillo.id, img.jpeg_con_xmp("UbicacionSecreta"), cabecera_operador
    )
    assert otra.status_code == 200
    detalle = otra.json()["foto_detalle_url"].removeprefix(f"{URL_FOTOS_PRUEBAS}/")
    assert b"UbicacionSecreta" not in _archivos(almacen, "publico")[detalle]
    # El original se guarda tal cual, con su EXIF (bucket privado).
    assert b"CamaraSecreta" in next(iter(_archivos(almacen, "privado").values()))


@pytest.mark.ac("AC-17.2")
async def test_la_misma_foto_da_las_mismas_claves_y_otra_no_borra_la_anterior(
    cliente: AsyncClient,
    sesion: AsyncSession,
    almacen: AlmacenLocal,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    primera = img.jpeg(800, 600)
    a = (await _subir(cliente, platillo.id, primera, cabecera_operador)).json()
    b = (await _subir(cliente, platillo.id, primera, cabecera_operador)).json()
    assert (a["foto_thumb_url"], a["foto_detalle_url"]) == (
        b["foto_thumb_url"],
        b["foto_detalle_url"],
    )
    assert len(_archivos(almacen, "publico")) == 2

    c = (
        await _subir(cliente, platillo.id, img.jpeg(800, 600, calidad=60), cabecera_operador)
    ).json()
    assert c["foto_detalle_url"] != a["foto_detalle_url"]
    # La URL vieja sigue sirviendo a quien tenga el menú en caché (nombres inmutables).
    assert len(_archivos(almacen, "publico")) == 4
    assert len(_archivos(almacen, "privado")) == 2


@pytest.mark.ac("AC-17.2")
async def test_quitar_la_foto_vuelve_a_la_ilustracion_y_conserva_el_original(
    cliente: AsyncClient,
    sesion: AsyncSession,
    almacen: AlmacenLocal,
    fabrica_categoria: Fabrica,
    fabrica_platillo: Fabrica,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
) -> None:
    postres: CategoriaMenu = await fabrica_categoria(restaurante, nombre="Postres")
    platillo: Platillo = await fabrica_platillo(restaurante, postres)  # fábrica: sin clave
    assert (
        await _subir(cliente, platillo.id, img.jpeg(800, 600), cabecera_operador)
    ).status_code == 200
    antes = (_archivos(almacen, "publico"), _archivos(almacen, "privado"))

    respuesta = await cliente.delete(f"{A}/platillos/{platillo.id}/foto", headers=cabecera_operador)
    assert respuesta.status_code == 200, respuesta.text
    cuerpo = respuesta.json()
    assert cuerpo["imagen_tipo"] == "ilustracion_categoria"
    assert cuerpo["foto_thumb_url"] is None and cuerpo["foto_detalle_url"] is None
    assert cuerpo["ilustracion_clave"] == "postres"
    await sesion.refresh(platillo)
    assert platillo.foto_url is None and platillo.foto_original_url is None
    # Ningún archivo se borra: el original se conserva (03 §7) y las variantes siguen ahí.
    assert (_archivos(almacen, "publico"), _archivos(almacen, "privado")) == antes

    # Quitarla otra vez no falla.
    otra = await cliente.delete(f"{A}/platillos/{platillo.id}/foto", headers=cabecera_operador)
    assert otra.status_code == 200
    assert otra.json()["imagen_tipo"] == "ilustracion_categoria"


@pytest.mark.ac("AC-17.2")
async def test_subir_y_quitar_invalidan_el_menu(
    cliente: AsyncClient,
    restaurante: Restaurante,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    generacion = cache_menu.generacion(restaurante.slug)
    assert (
        await _subir(cliente, platillo.id, img.jpeg(500, 400), cabecera_operador)
    ).status_code == 200
    assert cache_menu.generacion(restaurante.slug) == generacion + 1
    assert (
        await cliente.delete(f"{A}/platillos/{platillo.id}/foto", headers=cabecera_operador)
    ).status_code == 200
    assert cache_menu.generacion(restaurante.slug) == generacion + 2
    # Un rechazo no escribe nada y no invalida.
    assert (await _subir(cliente, platillo.id, img.PDF, cabecera_operador)).status_code == 415
    assert cache_menu.generacion(restaurante.slug) == generacion + 2


@pytest.mark.ac("AC-17.2")
async def test_pillow_corre_fuera_del_bucle_de_eventos(
    cliente: AsyncClient,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    hilos: list[int] = []
    real = assets.procesar_foto

    def espia(datos: bytes) -> assets.FotoProcesada:
        hilos.append(threading.get_ident())
        return real(datos)

    monkeypatch.setattr(assets, "procesar_foto", espia)
    respuesta = await _subir(cliente, platillo.id, img.jpeg(500, 400), cabecera_operador)
    assert respuesta.status_code == 200
    assert hilos and hilos[0] != threading.get_ident()


# ===========================================================================
# AC-17.3 · lo que no es una imagen válida se rechaza con un mensaje claro y no se guarda
# ===========================================================================


@pytest.mark.ac("AC-17.3")
async def test_un_pdf_renombrado_jpg_es_415_y_no_se_guarda(
    cliente: AsyncClient,
    sesion: AsyncSession,
    almacen: AlmacenLocal,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    respuesta = await _subir(
        cliente, platillo.id, img.PDF, cabecera_operador, "foto.jpg", "image/jpeg"
    )
    assert respuesta.status_code == 415
    error = _error(respuesta)
    assert error["codigo"] == "TIPO_NO_SOPORTADO"
    assert error["mensaje"] == "Sube una foto JPG, PNG o HEIC."
    assert respuesta.headers["cache-control"] == "no-store"
    assert _archivos(almacen, "publico") == {} and _archivos(almacen, "privado") == {}
    await sesion.refresh(platillo)
    assert platillo.imagen_tipo is TipoImagen.ilustracion_categoria
    assert platillo.foto_detalle_url is None


TIPOS_NO_ADMITIDOS = {
    "gif": img.en_formato("GIF"),
    "webp": img.en_formato("WEBP"),
    "bmp": img.en_formato("BMP"),
    "tiff": img.en_formato("TIFF"),
    "texto": b"hola, soy una foto",
    "svg": b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    "avif": b"\x00\x00\x00\x1cftypavif\x00\x00\x00\x00avifmif1miaf",
    "zip": b"PK\x03\x04" + b"\0" * 64,
}


@pytest.mark.ac("AC-17.3")
@pytest.mark.parametrize("nombre", list(TIPOS_NO_ADMITIDOS))
async def test_otros_formatos_son_415(
    cliente: AsyncClient,
    almacen: AlmacenLocal,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
    nombre: str,
) -> None:
    respuesta = await _subir(cliente, platillo.id, TIPOS_NO_ADMITIDOS[nombre], cabecera_operador)
    assert respuesta.status_code == 415, respuesta.text
    assert _error(respuesta)["codigo"] == "TIPO_NO_SOPORTADO"
    assert _archivos(almacen, "privado") == {}


def _truncado() -> bytes:
    datos = img.jpeg(800, 600)
    return datos[: len(datos) // 3]


ROTOS = {
    "jpeg_truncado": _truncado(),
    "firma_jpeg_y_basura": b"\xff\xd8\xff\xe0" + b"\x13" * 500,
    "firma_png_y_basura": b"\x89PNG\r\n\x1a\n" + b"\x00" * 200,
    "png_truncado": img.png(300, 200)[:120],
    "heic_sin_contenido": b"\x00\x00\x00\x18ftypheic\x00\x00\x00\x00mif1heic",
    # Firma buena (`ftyp` + `mif1`), contenido que el decodificador HEIF no sabe leer (es
    # AV1). pillow-heif lo intenta primero y falla igual con o sin `formats=`, así que esto
    # no prueba la restricción de decodificador: es otro caso de «firma buena, contenido roto».
    "avif_disfrazado_de_heic": img.avif_como_heif(),
}


@pytest.mark.ac("AC-17.3")
@pytest.mark.parametrize("nombre", list(ROTOS))
async def test_una_imagen_rota_es_422_y_no_se_guarda(
    cliente: AsyncClient,
    almacen: AlmacenLocal,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
    nombre: str,
) -> None:
    respuesta = await _subir(cliente, platillo.id, ROTOS[nombre], cabecera_operador)
    assert respuesta.status_code == 422, respuesta.text
    error = _error(respuesta)
    assert error["codigo"] == "IMAGEN_NO_VALIDA"
    assert "dañada" in error["mensaje"]
    assert _archivos(almacen, "publico") == {} and _archivos(almacen, "privado") == {}


@pytest.mark.ac("AC-17.3")
async def test_un_archivo_vacio_es_422(
    cliente: AsyncClient, platillo: Platillo, cabecera_operador: dict[str, str]
) -> None:
    respuesta = await _subir(cliente, platillo.id, b"", cabecera_operador)
    assert respuesta.status_code == 422
    assert _error(respuesta)["detalles"]["errores"][0]["tipo"] == "archivo_vacio"


@pytest.mark.ac("AC-17.3")
@pytest.mark.parametrize(("ancho", "alto"), [(8000, 7000), (12000, 12000)])
async def test_una_bomba_de_descompresion_es_413_nunca_500(
    cliente: AsyncClient,
    almacen: AlmacenLocal,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
    ancho: int,
    alto: int,
) -> None:
    """56 MP y 144 MP en pocos KB: los corta la comprobación propia (`MAX_PIXELES`) antes de
    decodificar; las otras dos capas (`Image.MAX_IMAGE_PIXELS` y el aviso como error) se
    prueban por separado en `tests/unit/test_assets.py`."""
    bomba = img.bomba_png(ancho, alto)
    assert len(bomba) < 200_000
    respuesta = await _subir(cliente, platillo.id, bomba, cabecera_operador, "b.png", "image/png")
    assert respuesta.status_code == 413, respuesta.text
    error = _error(respuesta)
    assert error["codigo"] == "ARCHIVO_EXCEDE_LIMITE"
    assert "megapíxeles" in error["mensaje"]
    assert _archivos(almacen, "privado") == {}


# ===========================================================================
# El cuerpo: campos, multipart y límites antes de leer
# ===========================================================================


@pytest.mark.ac("AC-17.3")
async def test_un_campo_de_mas_es_422_como_extra_forbid(
    cliente: AsyncClient,
    almacen: AlmacenLocal,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    respuesta = await cliente.post(
        f"{A}/platillos/{platillo.id}/foto",
        files={"archivo": ("f.jpg", img.jpeg(400, 300), "image/jpeg")},
        data={"restaurante_id": UUID_X},
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 422
    detalle = _error(respuesta)["detalles"]["errores"][0]
    assert detalle == {
        "campo": "body.archivo",
        "mensaje": "Sólo se acepta el campo `archivo`.",
        "tipo": "campo_no_permitido",
    }
    assert _archivos(almacen, "privado") == {}


@pytest.mark.parametrize(
    "envio",
    [
        {"files": {"foto": ("f.jpg", b"\xff\xd8\xff", "image/jpeg")}},  # otro nombre
        {
            "files": [
                ("archivo", ("a.jpg", b"1", "image/jpeg")),
                ("archivo", ("b.jpg", b"2", "image/jpeg")),
            ]
        },
        {"data": {"archivo": "no-es-un-archivo"}, "files": {"x": ("x", b"", "text/plain")}},
        {"json": {"archivo": "base64..."}},
        {},
    ],
    ids=["otro_nombre", "dos_archivos", "texto_en_vez_de_archivo", "json", "sin_cuerpo"],
)
@pytest.mark.ac("AC-17.3")
async def test_sin_el_archivo_en_su_campo_es_422(
    cliente: AsyncClient,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
    envio: dict[str, Any],
) -> None:
    respuesta = await cliente.post(
        f"{A}/platillos/{platillo.id}/foto", headers=cabecera_operador, **envio
    )
    assert respuesta.status_code == 422, respuesta.text
    assert _error(respuesta)["codigo"] == "PAYLOAD_INVALIDO"


@pytest.mark.ac("AC-17.3")
async def test_un_multipart_mal_formado_es_400(
    cliente: AsyncClient, platillo: Platillo, cabecera_operador: dict[str, str]
) -> None:
    respuesta = await cliente.post(
        f"{A}/platillos/{platillo.id}/foto",
        content=b"--otro\r\nbasura sin cabeceras",
        headers={**cabecera_operador, "Content-Type": "multipart/form-data"},  # sin boundary
    )
    assert respuesta.status_code == 400
    assert _error(respuesta)["codigo"] == "PAYLOAD_INVALIDO"


# --- límites crudos: el ASGI a mano, porque httpx siempre pone el Content-Length real ---


class Cuerpo:
    """`receive` ASGI que entrega `trozos` y cuenta cuántos le pidieron."""

    def __init__(self, trozos: list[bytes]) -> None:
        self.trozos = trozos
        self.pedidos = 0

    async def __call__(self) -> dict[str, Any]:
        self.pedidos += 1
        if self.pedidos <= len(self.trozos):
            mas = self.pedidos < len(self.trozos)
            return {"type": "http.request", "body": self.trozos[self.pedidos - 1], "more_body": mas}
        await asyncio.sleep(0)
        return {"type": "http.disconnect"}


async def _crudo(
    ruta: str, cabeceras: dict[str, str], cuerpo: Cuerpo
) -> tuple[int, dict[str, Any]]:
    capturado: dict[str, Any] = {"cuerpo": b""}

    async def send(mensaje: dict[str, Any]) -> None:
        if mensaje["type"] == "http.response.start":
            capturado["estado"] = mensaje["status"]
        else:
            capturado["cuerpo"] += mensaje.get("body", b"")

    scope = {
        "type": "http",
        "asgi": {"version": "3.0", "spec_version": "2.4"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": ruta,
        "raw_path": ruta.encode(),
        "query_string": b"",
        "root_path": "",
        "headers": [(b"host", b"pruebas")]
        + [(k.lower().encode(), v.encode()) for k, v in cabeceras.items()],
        "client": ("127.0.0.1", 1234),
        "server": ("pruebas", 80),
    }
    await app(scope, cuerpo, send)
    return capturado["estado"], json.loads(capturado["cuerpo"] or b"{}")


MULTIPART = "multipart/form-data; boundary=limite"


def _inicio_multipart() -> bytes:
    return (
        b'--limite\r\nContent-Disposition: form-data; name="archivo"; filename="f.jpg"\r\n'
        b"Content-Type: image/jpeg\r\n\r\n"
    )


@pytest.mark.ac("AC-17.1")
async def test_content_length_de_mas_es_413_sin_leer_el_cuerpo(
    cliente: AsyncClient, platillo: Platillo, cabecera_operador: dict[str, str]
) -> None:
    cuerpo = Cuerpo([b"x" * MB] * 20)
    estado, respuesta = await _crudo(
        f"{A}/platillos/{platillo.id}/foto",
        {**cabecera_operador, "content-type": MULTIPART, "content-length": str(20 * MB)},
        cuerpo,
    )
    assert estado == 413
    assert respuesta["error"]["codigo"] == "ARCHIVO_EXCEDE_LIMITE"
    assert cuerpo.pedidos == 0  # ni un byte leído


@pytest.mark.ac("AC-17.1")
async def test_sin_content_length_se_corta_al_pasar_el_limite(
    cliente: AsyncClient,
    almacen: AlmacenLocal,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    """*Chunked*: se cuentan los bytes al leer y se corta en cuanto pasan de 15 MB + marco."""
    cuerpo = Cuerpo([_inicio_multipart()] + [b"\xff" * MB] * 40)
    estado, respuesta = await _crudo(
        f"{A}/platillos/{platillo.id}/foto",
        {**cabecera_operador, "content-type": MULTIPART},
        cuerpo,
    )
    assert estado == 413
    assert respuesta["error"]["codigo"] == "ARCHIVO_EXCEDE_LIMITE"
    assert cuerpo.pedidos <= 17  # 15 MB + marco: no se leen los 40
    assert _archivos(almacen, "privado") == {}


@pytest.mark.ac("AC-17.1")
async def test_un_content_length_mentiroso_no_sirve_para_colar_mas(
    cliente: AsyncClient,
    almacen: AlmacenLocal,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    """Declara 1 KB y manda 40 MB: el tope cuenta lo que llega, no lo que se declaró."""
    cuerpo = Cuerpo([_inicio_multipart()] + [b"\xff" * MB] * 40)
    estado, _ = await _crudo(
        f"{A}/platillos/{platillo.id}/foto",
        {**cabecera_operador, "content-type": MULTIPART, "content-length": "1024"},
        cuerpo,
    )
    assert estado == 413
    assert cuerpo.pedidos <= 17
    assert _archivos(almacen, "privado") == {}


@pytest.mark.parametrize("valor", ["-1", "abc", "1e9", " "])
@pytest.mark.ac("AC-17.3")
async def test_un_content_length_invalido_es_400(
    cliente: AsyncClient, platillo: Platillo, cabecera_operador: dict[str, str], valor: str
) -> None:
    cuerpo = Cuerpo([b"x"])
    estado, respuesta = await _crudo(
        f"{A}/platillos/{platillo.id}/foto",
        {**cabecera_operador, "content-type": MULTIPART, "content-length": valor},
        cuerpo,
    )
    assert estado == 400
    assert respuesta["error"]["codigo"] == "PAYLOAD_INVALIDO"
    assert cuerpo.pedidos == 0


@pytest.mark.ac("AC-17.3")
async def test_sin_token_es_401_sin_leer_el_cuerpo(
    cliente: AsyncClient, platillo: Platillo
) -> None:
    cuerpo = Cuerpo([b"x" * MB] * 20)
    estado, respuesta = await _crudo(
        f"{A}/platillos/{platillo.id}/foto",
        {"content-type": MULTIPART, "content-length": str(20 * MB)},
        cuerpo,
    )
    assert estado == 401
    assert cuerpo.pedidos == 0


# ===========================================================================
# Aislamiento (AC-15.3): ajeno o inexistente → 404 idéntico, sin leer ni guardar nada
# ===========================================================================


@pytest.mark.ac("AC-17.3")
async def test_el_platillo_ajeno_es_404_igual_que_uno_inexistente(
    cliente: AsyncClient,
    sesion: AsyncSession,
    almacen: AlmacenLocal,
    ajeno: Restaurante,
    fabrica_platillo: Fabrica,
    cabecera_operador: dict[str, str],
) -> None:
    suyo: Platillo = await fabrica_platillo(ajeno)
    cuerpos = []
    for pid in (suyo.id, UUID_X):
        respuesta = await _subir(cliente, pid, img.jpeg(400, 300), cabecera_operador)
        assert respuesta.status_code == 404
        cuerpos.append({k: v for k, v in _error(respuesta).items() if k != "request_id"})
        quitar = await cliente.delete(f"{A}/platillos/{pid}/foto", headers=cabecera_operador)
        assert quitar.status_code == 404
    assert cuerpos[0] == cuerpos[1]
    assert _archivos(almacen, "publico") == {} and _archivos(almacen, "privado") == {}
    await sesion.refresh(suyo)
    assert suyo.imagen_tipo is TipoImagen.ilustracion_categoria


@pytest.mark.ac("AC-17.3")
async def test_el_ajeno_es_404_antes_de_leer_el_cuerpo(
    cliente: AsyncClient,
    ajeno: Restaurante,
    fabrica_platillo: Fabrica,
    cabecera_operador: dict[str, str],
) -> None:
    suyo: Platillo = await fabrica_platillo(ajeno)
    cuerpo = Cuerpo([_inicio_multipart(), b"\xff" * MB])
    estado, _ = await _crudo(
        f"{A}/platillos/{suyo.id}/foto", {**cabecera_operador, "content-type": MULTIPART}, cuerpo
    )
    assert estado == 404
    assert cuerpo.pedidos == 0


@pytest.mark.ac("AC-17.3")
async def test_el_dueno_del_otro_restaurante_si_puede(
    cliente: AsyncClient,
    sesion: AsyncSession,
    ajeno: Restaurante,
    fabrica_platillo: Fabrica,
) -> None:
    """El 404 de arriba es por restaurante, no porque la ruta no funcione con otro usuario."""
    from sqlalchemy import select

    from app.db.models import OperadorRestaurante, Usuario

    suyo: Platillo = await fabrica_platillo(ajeno)
    uid = await sesion.scalar(
        select(Usuario.firebase_uid)
        .join(OperadorRestaurante, OperadorRestaurante.usuario_id == Usuario.id)
        .where(OperadorRestaurante.restaurante_id == ajeno.id)
    )
    assert uid is not None
    respuesta = await _subir(cliente, suyo.id, img.jpeg(400, 300), cabecera_de(uid))
    assert respuesta.status_code == 200, respuesta.text


# ===========================================================================
# Almacén caído
# ===========================================================================


class AlmacenCaido(AlmacenLocal):
    async def guardar_publico(
        self, clave: str, datos: bytes, tipo_mime: str, cache_control: str
    ) -> str:
        raise ErrorAlmacen("ConnectTimeout")


@pytest.mark.ac("AC-17.3")
async def test_si_el_almacen_falla_es_503_y_el_platillo_no_cambia(
    cliente: AsyncClient,
    sesion: AsyncSession,
    tmp_path: Path,
    restaurante: Restaurante,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    app.dependency_overrides[obtener_almacen] = lambda: AlmacenCaido(tmp_path, URL_FOTOS_PRUEBAS)
    generacion = cache_menu.generacion(restaurante.slug)
    respuesta = await _subir(cliente, platillo.id, img.jpeg(400, 300), cabecera_operador)
    assert respuesta.status_code == 503
    error = _error(respuesta)
    assert error["codigo"] == "ALMACEN_NO_DISPONIBLE"
    assert error["detalles"] == {}
    await sesion.refresh(platillo)
    assert platillo.imagen_tipo is TipoImagen.ilustracion_categoria
    assert cache_menu.generacion(restaurante.slug) == generacion


# ===========================================================================
# R2 por protocolo S3 (moto en 127.0.0.1)
# ===========================================================================

PUBLICO, PRIVADO = "carta-publico-pruebas", "carta-privado-pruebas"
URL_R2 = "https://img.carta.pruebas"


@pytest.fixture(scope="module")
def s3_falso() -> Iterator[str]:
    servidor = ThreadedMotoServer(ip_address="127.0.0.1", port=0, verbose=False)
    servidor.start()
    host, puerto = servidor.get_host_and_port()
    endpoint = f"http://{host}:{puerto}"
    admin = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id="prueba",
        aws_secret_access_key="prueba",
        region_name="us-east-1",
    )
    admin.create_bucket(Bucket=PUBLICO)
    admin.create_bucket(Bucket=PRIVADO)
    try:
        yield endpoint
    finally:
        servidor.stop()


def _s3(endpoint: str, **cambios: Any) -> AlmacenS3:
    datos: dict[str, Any] = {
        "endpoint": endpoint,
        "llave_id": "prueba",
        "llave_secreta": "prueba",
        "bucket_publico": PUBLICO,
        "bucket_privado": PRIVADO,
        "url_publica": URL_R2,
    }
    datos.update(cambios)
    return AlmacenS3(**datos)


def _cliente_s3(endpoint: str) -> Any:
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id="prueba",
        aws_secret_access_key="prueba",
        region_name="us-east-1",
    )


@pytest.mark.ac("AC-17.1", "AC-17.2")
async def test_con_r2_las_variantes_van_al_bucket_publico_inmutables(
    cliente: AsyncClient,
    s3_falso: str,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    almacen = _s3(s3_falso)
    app.dependency_overrides[obtener_almacen] = lambda: almacen
    original = img.heic(1300, 900)
    respuesta = await _subir(
        cliente, platillo.id, original, cabecera_operador, "x.heic", "image/heic"
    )
    assert respuesta.status_code == 200, respuesta.text
    cuerpo = respuesta.json()
    s3 = _cliente_s3(s3_falso)
    for url in (cuerpo["foto_thumb_url"], cuerpo["foto_detalle_url"]):
        assert url.startswith(f"{URL_R2}/platillos/{platillo.restaurante_id}/")
        clave = url.removeprefix(f"{URL_R2}/")
        objeto = s3.get_object(Bucket=PUBLICO, Key=clave)
        assert objeto["CacheControl"] == "public, max-age=31536000, immutable"
        assert objeto["ContentType"] == "image/webp"
        assert img.abrir(objeto["Body"].read()).format == "WEBP"
    privados = s3.list_objects_v2(Bucket=PRIVADO)["Contents"]
    assert len(privados) == 1
    guardado = s3.get_object(Bucket=PRIVADO, Key=privados[0]["Key"])
    assert guardado["Body"].read() == original
    assert guardado["ContentType"] == "image/heic"
    assert "CacheControl" not in guardado  # el original no es público ni cacheable
    # El original nunca va al bucket público.
    publicas = {o["Key"] for o in s3.list_objects_v2(Bucket=PUBLICO)["Contents"]}
    assert privados[0]["Key"] not in publicas


@pytest.mark.ac("AC-17.2")
async def test_ready_comprueba_r2_cuando_lo_hay(cliente: AsyncClient, s3_falso: str) -> None:
    app.dependency_overrides[obtener_almacen] = lambda: _s3(s3_falso)
    respuesta = await cliente.get("/ready")
    assert respuesta.status_code == 200
    assert respuesta.json() == {"db": "ok", "almacen": "ok"}
    assert '"db":"ok"' in respuesta.text  # lo que busca la prueba de humo (ci.yml, deploy.yml)


@pytest.mark.ac("AC-17.3")
async def test_ready_sin_r2_no_sondea_el_almacen_local(cliente: AsyncClient) -> None:
    respuesta = await cliente.get("/ready")
    assert respuesta.status_code == 200
    assert respuesta.json() == {"db": "ok"}


def _puerto_cerrado() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


@pytest.mark.parametrize("caso", ["bucket_inexistente", "servidor_apagado"])
@pytest.mark.ac("AC-17.3")
async def test_ready_es_503_si_r2_no_responde(
    cliente: AsyncClient, s3_falso: str, caso: str
) -> None:
    almacen = (
        _s3(s3_falso, bucket_privado="no-existe")
        if caso == "bucket_inexistente"
        else _s3(f"http://127.0.0.1:{_puerto_cerrado()}")
    )
    app.dependency_overrides[obtener_almacen] = lambda: almacen
    respuesta = await cliente.get("/ready")
    assert respuesta.status_code == 503
    assert _error(respuesta)["codigo"] == "ALMACEN_NO_DISPONIBLE"


@pytest.mark.ac("AC-17.3")
async def test_ready_no_espera_mas_que_su_plazo_a_un_r2_colgado(
    cliente: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Un servidor que acepta la conexión y nunca contesta: 503 en el plazo, no 60 s."""
    from app.api import salud

    abiertas: list[socket.socket] = []
    oyente = socket.socket()
    oyente.bind(("127.0.0.1", 0))
    oyente.listen()
    oyente.settimeout(0.1)
    parar = threading.Event()

    def aceptar() -> None:
        while not parar.is_set():
            try:
                conexion, _ = oyente.accept()
                abiertas.append(conexion)
            except TimeoutError:
                continue

    hilo = threading.Thread(target=aceptar, daemon=True)
    hilo.start()
    try:
        monkeypatch.setattr(salud, "READY_TIMEOUT_SEGUNDOS", 0.5)
        almacen = _s3(f"http://127.0.0.1:{oyente.getsockname()[1]}", plazo_sonda=0.4)
        app.dependency_overrides[obtener_almacen] = lambda: almacen
        inicio = asyncio.get_running_loop().time()
        respuesta = await cliente.get("/ready")
        assert respuesta.status_code == 503
        assert asyncio.get_running_loop().time() - inicio < 2.5
    finally:
        parar.set()
        hilo.join()
        for conexion in abiertas:
            conexion.close()
        oyente.close()


def test_obtener_almacen_elige_por_settings(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    from app.core.config import settings

    monkeypatch.setattr(assets, "_almacen", None)
    monkeypatch.setattr(settings, "ALMACEN_LOCAL_RUTA", str(tmp_path))
    local = obtener_almacen()
    assert isinstance(local, AlmacenLocal) and not local.en_nube
    assert obtener_almacen() is local  # uno por proceso

    monkeypatch.setattr(assets, "_almacen", None)
    for nombre, valor in {
        "R2_ENDPOINT": "http://127.0.0.1:9",
        "R2_ACCESS_KEY_ID": "id",
        "R2_SECRET_ACCESS_KEY": "secreta",
        "R2_BUCKET_PUBLICO": PUBLICO,
        "R2_BUCKET_PRIVADO": PRIVADO,
        "R2_URL_PUBLICA": URL_R2,
    }.items():
        from pydantic import SecretStr

        monkeypatch.setattr(settings, nombre, SecretStr(valor) if "SECRET" in nombre else valor)
    nube: Almacen = obtener_almacen()
    assert isinstance(nube, AlmacenS3) and nube.en_nube
    assert (nube.bucket_publico, nube.bucket_privado, nube.url_base) == (PUBLICO, PRIVADO, URL_R2)
    monkeypatch.setattr(assets, "_almacen", None)


# ===========================================================================
# Contrato
# ===========================================================================


def test_el_contrato_publica_el_multipart_y_sus_errores() -> None:
    operacion = app.openapi()["paths"][f"{A}/platillos/{{platillo_id}}/foto"]["post"]
    esquema = operacion["requestBody"]["content"]["multipart/form-data"]["schema"]
    assert operacion["requestBody"]["required"] is True
    assert esquema["required"] == ["archivo"]
    assert esquema["properties"]["archivo"] == {
        "type": "string",
        "format": "binary",
        "description": "JPG, PNG o HEIC de hasta 15 MB (se valida el contenido).",
    }
    assert esquema["additionalProperties"] is False
    assert {"400", "401", "404", "408", "413", "415", "422", "503"} <= set(operacion["responses"])
    for codigo in ("400", "408", "503"):
        esquema = operacion["responses"][codigo]["content"]["application/json"]["schema"]
        assert esquema["$ref"].endswith("/ErrorRespuesta")
    assert operacion["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith(
        "/PlatilloRespuesta"
    )


# ===========================================================================
# Ilustración por categoría (02 §8): la clave se asigna al crear, mover y renombrar
# ===========================================================================


@pytest.mark.ac("AC-17.2")
async def test_la_ilustracion_sigue_a_la_categoria(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    fabrica_categoria: Fabrica,
    cabecera_operador: dict[str, str],
) -> None:
    tacos: CategoriaMenu = await fabrica_categoria(restaurante, nombre="Tacos al pastor")
    bebidas: CategoriaMenu = await fabrica_categoria(restaurante, nombre="Bebidas frías")
    creado = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/platillos",
        json={"nombre": "Taco de suadero", "precio": 25, "categoria_id": str(tacos.id)},
        headers=cabecera_operador,
    )
    assert creado.status_code == 201, creado.text
    assert creado.json()["ilustracion_clave"] == "tacos"
    assert creado.json()["imagen_tipo"] == "ilustracion_categoria"
    pid = creado.json()["id"]

    sin = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/platillos",
        json={"nombre": "Especial", "precio": 10},
        headers=cabecera_operador,
    )
    assert sin.json()["ilustracion_clave"] == "general"

    movido = await cliente.patch(
        f"{A}/platillos/{pid}", json={"categoria_id": str(bebidas.id)}, headers=cabecera_operador
    )
    assert movido.json()["ilustracion_clave"] == "bebidas"
    suelto = await cliente.patch(
        f"{A}/platillos/{pid}", json={"categoria_id": None}, headers=cabecera_operador
    )
    assert suelto.json()["ilustracion_clave"] == "general"
    await cliente.patch(
        f"{A}/platillos/{pid}", json={"categoria_id": str(bebidas.id)}, headers=cabecera_operador
    )

    # Renombrar la categoría arrastra a sus platillos; los de otra categoría no cambian.
    otro = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/platillos",
        json={"nombre": "Taco de tripa", "precio": 25, "categoria_id": str(tacos.id)},
        headers=cabecera_operador,
    )
    renombrada = await cliente.patch(
        f"{A}/categorias/{bebidas.id}", json={"nombre": "Postres"}, headers=cabecera_operador
    )
    assert renombrada.status_code == 200, renombrada.text
    lista = await cliente.get(
        f"{A}/restaurantes/{restaurante.id}/platillos", headers=cabecera_operador
    )
    claves = {p["id"]: p["ilustracion_clave"] for p in lista.json()}
    assert claves[pid] == "postres"
    assert claves[otro.json()["id"]] == "tacos"


@pytest.mark.ac("AC-17.2")
async def test_la_foto_manda_sobre_la_ilustracion_y_la_clave_se_conserva(
    cliente: AsyncClient, platillo: Platillo, cabecera_operador: dict[str, str]
) -> None:
    """Con foto, `imagen_tipo = foto`; la clave queda para cuando la quiten (02 §8)."""
    respuesta = await _subir(cliente, platillo.id, img.jpeg(500, 400), cabecera_operador)
    assert respuesta.json()["imagen_tipo"] == "foto"
    quitada = await cliente.delete(f"{A}/platillos/{platillo.id}/foto", headers=cabecera_operador)
    assert quitada.json()["ilustracion_clave"] is not None


# ===========================================================================
# Revisión de la maestra: conexión, plazos, almacén colgado, sonda, cola, desarrollo
# ===========================================================================


def _multipart_completo(datos: bytes) -> bytes:
    return _inicio_multipart() + datos + b"\r\n--limite--\r\n"


class CuerpoQueMira(Cuerpo):
    """Antes de entregar el primer byte, anota si alguna sesión de la petición sigue en una
    transacción (es decir, retiene una conexión del pool)."""

    def __init__(self, trozos: list[bytes], sesiones: list[AsyncSession]) -> None:
        super().__init__(trozos)
        self.sesiones = sesiones
        self.en_transaccion: list[bool] | None = None

    async def __call__(self) -> dict[str, Any]:
        if self.en_transaccion is None:
            self.en_transaccion = [s.in_transaction() for s in self.sesiones]
        return await super().__call__()


@pytest.mark.ac("AC-17.1")
async def test_la_conexion_se_suelta_antes_de_leer_el_cuerpo(
    cliente: AsyncClient,
    sesion: AsyncSession,
    fabrica_sesion: Any,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
) -> None:
    """Revisión A2: con la sesión abierta mientras llega el cuerpo, 20 subidas lentas
    agotaban el pool y toda la API caía."""
    from app.db.database import get_db_session

    sesiones: list[AsyncSession] = []

    async def espia() -> Any:
        async with fabrica_sesion() as s:
            sesiones.append(s)
            yield s

    app.dependency_overrides[get_db_session] = espia
    cuerpo = CuerpoQueMira([_multipart_completo(img.jpeg(500, 400))], sesiones)
    estado, respuesta = await _crudo(
        f"{A}/platillos/{platillo.id}/foto",
        {**cabecera_operador, "content-type": MULTIPART},
        cuerpo,
    )
    assert estado == 200, respuesta
    assert sesiones, "la ruta no usó la sesión"
    assert cuerpo.en_transaccion == [False] * len(sesiones)
    await sesion.refresh(platillo)
    assert platillo.imagen_tipo is TipoImagen.foto


class CuerpoQueSeCalla(Cuerpo):
    """Manda el inicio del multipart y después no manda nada más (un 4G que se cae)."""

    async def __call__(self) -> dict[str, Any]:
        self.pedidos += 1
        if self.pedidos == 1:
            return {"type": "http.request", "body": _inicio_multipart(), "more_body": True}
        await asyncio.Event().wait()
        raise AssertionError("inalcanzable")


@pytest.mark.ac("AC-17.3")
async def test_una_subida_que_no_termina_es_408(
    cliente: AsyncClient,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.api.admin import fotos

    monkeypatch.setattr(fotos, "PLAZO_SUBIDA_SEGUNDOS", 0.2)
    estado, respuesta = await _crudo(
        f"{A}/platillos/{platillo.id}/foto",
        {**cabecera_operador, "content-type": MULTIPART},
        CuerpoQueSeCalla([]),
    )
    assert estado == 408
    error = ErrorRespuesta.model_validate(respuesta).error
    assert (error.codigo, error.mensaje) == (
        "SUBIDA_INCOMPLETA",
        "La subida tardó demasiado; inténtalo de nuevo.",
    )


class CuerpoQueSeCorta(Cuerpo):
    """Un trozo y después la desconexión del cliente (`http.disconnect` a media subida)."""

    async def __call__(self) -> dict[str, Any]:
        self.pedidos += 1
        if self.pedidos == 1:
            return {"type": "http.request", "body": _inicio_multipart(), "more_body": True}
        return {"type": "http.disconnect"}


@pytest.mark.ac("AC-17.3")
async def test_una_subida_cortada_por_el_cliente_es_400_y_no_500(
    cliente: AsyncClient, platillo: Platillo, cabecera_operador: dict[str, str]
) -> None:
    estado, respuesta = await _crudo(
        f"{A}/platillos/{platillo.id}/foto",
        {**cabecera_operador, "content-type": MULTIPART},
        CuerpoQueSeCorta([]),
    )
    assert estado == 400
    assert respuesta["error"]["mensaje"] == "La subida se interrumpió."


@pytest.mark.ac("AC-17.3")
async def test_con_la_cola_llena_es_503_servicio_ocupado(
    cliente: AsyncClient,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(assets, "PLAZO_COLA_SEGUNDOS", 0.1)
    semaforo = asyncio.Semaphore(1)
    monkeypatch.setattr(assets, "_semaforo", semaforo)
    await semaforo.acquire()  # otra foto ocupa el único proceso
    try:
        respuesta = await _subir(cliente, platillo.id, img.jpeg(400, 300), cabecera_operador)
    finally:
        semaforo.release()
    assert respuesta.status_code == 503
    assert _error(respuesta)["codigo"] == "SERVICIO_OCUPADO"
    assert _error(respuesta)["mensaje"] == "Hay muchas fotos en cola; inténtalo en un momento."


@pytest.mark.ac("AC-17.2")
async def test_el_semaforo_nunca_deja_pasar_mas_procesos_de_los_debidos(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(assets, "_semaforo", asyncio.Semaphore(2))
    candado = threading.Lock()
    estado = {"ahora": 0, "maximo": 0}
    real = assets.procesar_foto

    def espia(datos: bytes) -> assets.FotoProcesada:
        with candado:
            estado["ahora"] += 1
            estado["maximo"] = max(estado["maximo"], estado["ahora"])
        try:
            threading.Event().wait(0.05)
            return real(datos)
        finally:
            with candado:
                estado["ahora"] -= 1

    monkeypatch.setattr(assets, "procesar_foto", espia)
    datos = img.jpeg(300, 200)
    await asyncio.gather(*(assets._procesar_en_cola(datos) for _ in range(6)))
    assert estado["maximo"] == 2


@pytest.fixture
def socket_mudo() -> Iterator[str]:
    """Un servidor que acepta conexiones y nunca contesta (un R2 colgado)."""
    abiertas: list[socket.socket] = []
    oyente = socket.socket()
    oyente.bind(("127.0.0.1", 0))
    oyente.listen()
    oyente.settimeout(0.1)
    parar = threading.Event()

    def aceptar() -> None:
        while not parar.is_set():
            try:
                conexion, _ = oyente.accept()
                abiertas.append(conexion)
            except TimeoutError:
                continue

    hilo = threading.Thread(target=aceptar, daemon=True)
    hilo.start()
    try:
        yield f"http://127.0.0.1:{oyente.getsockname()[1]}"
    finally:
        parar.set()
        hilo.join()
        for conexion in abiertas:
            conexion.close()
        oyente.close()


@pytest.mark.ac("AC-17.3")
async def test_con_r2_colgado_la_subida_es_503_dentro_de_su_plazo(
    cliente: AsyncClient,
    sesion: AsyncSession,
    socket_mudo: str,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Revisión A3: antes, 45–115 s (plazos de 10 s × 3 intentos en el executor común)."""
    monkeypatch.setattr(assets, "PLAZO_ALMACEN_SEGUNDOS", 0.5)
    almacen = _s3(socket_mudo, plazo_conexion=0.2, plazo_lectura=0.3, intentos=1)
    app.dependency_overrides[obtener_almacen] = lambda: almacen
    bucle = asyncio.get_running_loop()
    inicio = bucle.time()
    respuesta = await _subir(cliente, platillo.id, img.jpeg(400, 300), cabecera_operador)
    assert respuesta.status_code == 503
    assert bucle.time() - inicio < 1.5
    assert _error(respuesta)["codigo"] == "ALMACEN_NO_DISPONIBLE"
    await sesion.refresh(platillo)
    assert platillo.imagen_tipo is TipoImagen.ilustracion_categoria


@pytest.mark.ac("AC-17.3")
@pytest.mark.parametrize("caso", ["servidor_apagado", "bucket_inexistente"])
async def test_con_r2_caido_la_subida_es_503_y_el_platillo_no_cambia(
    cliente: AsyncClient,
    sesion: AsyncSession,
    s3_falso: str,
    restaurante: Restaurante,
    platillo: Platillo,
    cabecera_operador: dict[str, str],
    caso: str,
) -> None:
    """Revisión A5: con una subclase de `AlmacenLocal` no se veía que un error de boto3 sin
    traducir en `AlmacenS3._poner` daba 500."""
    almacen = (
        _s3(f"http://127.0.0.1:{_puerto_cerrado()}", intentos=1)
        if caso == "servidor_apagado"
        else _s3(s3_falso, bucket_publico="no-existe", intentos=1)
    )
    app.dependency_overrides[obtener_almacen] = lambda: almacen
    generacion = cache_menu.generacion(restaurante.slug)
    respuesta = await _subir(cliente, platillo.id, img.jpeg(400, 300), cabecera_operador)
    assert respuesta.status_code == 503
    error = ErrorRespuesta.model_validate(respuesta.json()).error
    assert error.codigo == "ALMACEN_NO_DISPONIBLE"
    assert error.detalles == {}
    await sesion.refresh(platillo)
    assert platillo.imagen_tipo is TipoImagen.ilustracion_categoria
    assert platillo.foto_detalle_url is None
    assert cache_menu.generacion(restaurante.slug) == generacion


@pytest.mark.ac("AC-17.3")
async def test_ready_no_sondea_r2_en_cada_llamada(cliente: AsyncClient, s3_falso: str) -> None:
    """Revisión B2: `/ready` es anónimo y cada `HEAD` a R2 se factura."""
    almacen = _s3(s3_falso)
    cabezas: list[str] = []
    real = almacen._sonda.head_bucket

    def contar(**argumentos: Any) -> Any:
        cabezas.append(argumentos["Bucket"])
        return real(**argumentos)

    almacen._sonda.head_bucket = contar  # type: ignore[method-assign]
    app.dependency_overrides[obtener_almacen] = lambda: almacen
    # Tres a la vez esperan la misma sonda (directo al almacén: peticiones simultáneas
    # compartirían la única conexión de la prueba); después, dos `/ready` reales.
    await asyncio.gather(*(almacen.comprobar() for _ in range(3)))
    respuestas = [await cliente.get("/ready") for _ in range(2)]
    assert [r.status_code for r in respuestas] == [200, 200], [r.text for r in respuestas]
    assert sorted(cabezas) == sorted([PUBLICO, PRIVADO])  # una sola sonda para las cinco


async def test_en_desarrollo_el_almacen_local_se_sirve_en_almacen(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """C1: en desarrollo las URL `/almacen/…` de `AlmacenLocal` cargan; fuera, no existen."""
    from app.core.config import settings
    from app.main import create_app

    clave = "platillos/r/abc-400x300.webp"
    destino = tmp_path / "publico" / clave
    destino.parent.mkdir(parents=True)
    destino.write_bytes(img.en_formato("WEBP"))
    monkeypatch.setattr(settings, "ALMACEN_LOCAL_RUTA", str(tmp_path))
    for entorno, esperado in (("desarrollo", 200), ("pruebas", 404), ("staging", 404)):
        monkeypatch.setattr(settings, "ENTORNO", entorno)
        aplicacion = create_app()
        transporte = httpx.ASGITransport(app=aplicacion, raise_app_exceptions=False)
        async with AsyncClient(transport=transporte, base_url="http://pruebas") as c:
            respuesta = await c.get(f"/almacen/{clave}")
        assert respuesta.status_code == esperado, entorno
        if esperado == 200:
            assert respuesta.headers["content-type"] == "image/webp"
            assert "content-security-policy" in respuesta.headers
