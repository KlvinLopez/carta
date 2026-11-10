"""T-1.9: importaciones del menú, de la subida a la confirmación (US-25, AC-25.1, AC-25.3, AC-25.4, INV-9).

La API de Claude es el SDK real sobre un transporte simulado (`ApiFalsa` de T-1.8, con las
respuestas grabadas de `tests/fixtures/menus/`); el procesador corre a mano (`ciclo()`), sin
dormir. Las pruebas de rutas usan `cliente` (una petición a la vez, regla 19 de /pruebas);
las de concurrencia (dos procesadores, dos confirmaciones) usan conexiones propias de
`motor_pruebas` con datos confirmados de verdad que se borran al final.
"""

from __future__ import annotations

import asyncio
import functools
import io
import subprocess
import sys
import time
from collections.abc import AsyncIterator, Iterator
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient
from PIL import Image
from pydantic import SecretStr, ValidationError
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.api.admin import importaciones as rutas_importaciones
from app.core.config import settings
from app.core.errores import ErrorCarta
from app.db.models import (
    CategoriaMenu,
    EstadoImportacion,
    ImportacionMenu,
    OperadorRestaurante,
    Platillo,
    Restaurante,
    TipoImagen,
    Usuario,
)
from app.main import app
from app.schemas.importacion import PlatilloImportado, ResultadoImportacion
from app.services import assets, importacion_menu, importaciones, procesador
from app.services.assets import AlmacenLocal, ErrorAlmacen
from app.services.importacion_menu import Extraccion, extraer_menu_detallado
from app.services.procesador import PLAZO_CORRIDA_SEGUNDOS, PLAZO_RECUPERACION, Procesador
from tests import imagenes_pruebas as img
from tests.conftest import Fabrica
from tests.integration.test_fotos import Cuerpo, CuerpoQueMira, _crudo
from tests.pdf_pruebas import pdf_con_xref_gigante
from tests.unit.test_importacion import (
    LLAVE_DE_PRUEBA,
    MENUS,
    ApiFalsa,
    error_api,
    grabada,
    ok,
    pdf,
    pdf_de_tamano,
)

A = "/api/v1/admin"
MB = 1024 * 1024
PDF_LA_CEIBA = (MENUS / "la-ceiba.pdf").read_bytes()
MULTIPART = "multipart/form-data; boundary=limite"


def _multipart(datos: bytes, nombre: str = "carta.pdf", tipo: str = "application/pdf") -> bytes:
    return (
        b"--limite\r\n"
        + f'Content-Disposition: form-data; name="archivo"; filename="{nombre}"\r\n'.encode()
        + f"Content-Type: {tipo}\r\n\r\n".encode()
        + datos
        + b"\r\n--limite--\r\n"
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def con_llave(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Hay llave (falsa: la API es `ApiFalsa`) y las pausas de reintento no llevan azar."""
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", SecretStr(LLAVE_DE_PRUEBA))
    monkeypatch.setattr(importacion_menu.random, "uniform", lambda _a, _b: 0.0)
    yield


@pytest.fixture
async def usuario(sesion: AsyncSession, operador: OperadorRestaurante) -> Usuario:
    encontrado = await sesion.get(Usuario, operador.usuario_id)
    assert encontrado is not None
    return encontrado


def _procesador(
    fabrica: async_sessionmaker[AsyncSession], almacen: AlmacenLocal, api: ApiFalsa
) -> Procesador:
    extraer = functools.partial(extraer_menu_detallado, dormir=api.dormir, reloj=api.reloj)
    return Procesador(fabrica, almacen, cliente=api.cliente, extraer=extraer)


async def _subir(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera: dict[str, str],
    datos: bytes = PDF_LA_CEIBA,
    nombre: str = "carta.pdf",
    tipo: str = "application/pdf",
) -> Any:
    return await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/importaciones",
        files={"archivo": (nombre, datos, tipo)},
        headers=cabecera,
    )


def _ruta(restaurante: Restaurante, importacion_id: Any, accion: str = "") -> str:
    base = f"{A}/restaurantes/{restaurante.id}/importaciones/{importacion_id}"
    return f"{base}/{accion}" if accion else base


def _borrador_valido() -> dict[str, Any]:
    return {
        "moneda": "MXN",
        "categorias": [
            {
                "nombre": "Tacos",
                "orden": 1,
                "platillos": [
                    {"nombre": "Pastor", "precio": 22, "precio_confianza": "alta"},
                    {"nombre": "Suadero", "precio": 24, "precio_confianza": "alta"},
                ],
            },
            {
                "nombre": "Bebidas",
                "orden": 2,
                "platillos": [{"nombre": "Horchata", "precio": 35, "precio_confianza": "media"}],
            },
        ],
        "avisos": [],
    }


async def _lista(
    fabrica_importacion: Fabrica, restaurante: Restaurante, usuario: Usuario
) -> ImportacionMenu:
    importacion: ImportacionMenu = await fabrica_importacion(
        restaurante,
        usuario,
        estado=EstadoImportacion.listo,
        intentos=1,
        resultado=_borrador_valido(),
    )
    return importacion


async def _platillos(sesion: AsyncSession, restaurante: Restaurante) -> list[Platillo]:
    return list(
        await sesion.scalars(
            select(Platillo)
            .where(Platillo.restaurante_id == restaurante.id)
            .order_by(Platillo.categoria_id, Platillo.orden)
            .execution_options(populate_existing=True)
        )
    )


def _error_de(respuesta: Any) -> tuple[str, str]:
    error = respuesta.json()["error"]
    return error["codigo"], error["mensaje"]


# ---------------------------------------------------------------------------
# Verificar del brief: subir → listo → confirmar crea los platillos; dos veces → 409
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-25.1", "AC-25.3")
async def test_flujo_completo_subir_procesar_y_confirmar(
    cliente: AsyncClient,
    sesion: AsyncSession,
    fabrica_sesion: async_sessionmaker[AsyncSession],
    almacen: AlmacenLocal,
    restaurante: Restaurante,
    usuario: Usuario,
    cabecera_operador: dict[str, str],
) -> None:
    inicio = time.perf_counter()
    subida = await _subir(cliente, restaurante, cabecera_operador)
    # AC-25.1 pide ≤ 1 s; aquí con holgura para CI (revisión B8), la cifra la mide la carga.
    assert time.perf_counter() - inicio < 3.0
    assert subida.status_code == 202, subida.text
    cuerpo = subida.json()
    assert cuerpo["estado"] == "pendiente"
    assert cuerpo["archivo_tipo"] == "application/pdf"
    assert cuerpo["paginas"] == 1
    assert cuerpo["intentos"] == 0
    assert cuerpo["resultado"] is None
    assert not {"archivo_url", "modelo", "tokens_entrada", "tokens_salida"} & set(cuerpo)

    fila = await sesion.get(ImportacionMenu, UUID(cuerpo["id"]))
    assert fila is not None
    assert fila.solicitado_por == usuario.id
    assert fila.archivo_url == f"importaciones/{restaurante.id}/{fila.id}.pdf"
    assert (almacen.raiz / "privado" / fila.archivo_url).read_bytes() == PDF_LA_CEIBA

    api = ApiFalsa(ok(grabada("la-ceiba")))
    assert await _procesador(fabrica_sesion, almacen, api).ciclo() == 1
    assert len(api.peticiones) == 1

    consulta = await cliente.get(_ruta(restaurante, fila.id), headers=cabecera_operador)
    assert consulta.status_code == 200
    estado = consulta.json()
    assert estado["estado"] == "listo"
    assert estado["intentos"] == 1
    assert estado["iniciado_en"] is not None and estado["finalizado_en"] is not None
    borrador = estado["resultado"]
    assert len(borrador["categorias"]) == 4
    await sesion.refresh(fila)
    assert fila.modelo == "claude-opus-5-5"
    assert fila.tokens_entrada and fila.tokens_salida
    # INV-9 / AC-25.3: con el borrador listo, el menú sigue vacío.
    assert await _platillos(sesion, restaurante) == []

    # El borrador tal cual trae un precio «M.P.» vacío: 422 con el campo exacto.
    sin_precio = await cliente.post(
        _ruta(restaurante, fila.id, "confirmar"), json=borrador, headers=cabecera_operador
    )
    assert sin_precio.status_code == 422, sin_precio.text
    (problema,) = sin_precio.json()["error"]["detalles"]["errores"]
    assert problema["campo"] == "body.categorias.1.platillos.1.precio"
    assert problema["tipo"] == "precio_requerido"
    assert await _platillos(sesion, restaurante) == []

    # El operador lo captura y confirma.
    borrador["categorias"][1]["platillos"][1]["precio"] = 420
    confirmada = await cliente.post(
        _ruta(restaurante, fila.id, "confirmar"), json=borrador, headers=cabecera_operador
    )
    assert confirmada.status_code == 200, confirmada.text
    assert confirmada.json()["estado"] == "confirmado"
    assert confirmada.json()["confirmado_en"] is not None

    platillos = await _platillos(sesion, restaurante)
    assert len(platillos) == 20
    assert {p.imagen_tipo for p in platillos} == {TipoImagen.ilustracion_categoria}
    por_nombre = {p.nombre: p for p in platillos}
    assert por_nombre["Pescado zarandeado"].precio == Decimal("420.00")
    assert por_nombre["Guacamole de la casa"].precio == Decimal("145.00")
    assert por_nombre["Flan de cajeta"].alergenos == ["huevo", "lacteos", "nueces"]
    assert por_nombre["Flan de cajeta"].ilustracion_clave == "postres"
    assert por_nombre["Café de olla"].ilustracion_clave == "bebidas"
    assert por_nombre["Mole negro de Oaxaca"].ilustracion_clave == "general"  # «Platos fuertes»
    agua = por_nombre["Agua del día"]
    assert agua.descripcion is not None and " · " in agua.descripcion.splitlines()[-1]
    categorias = list(
        await sesion.scalars(
            select(CategoriaMenu)
            .where(CategoriaMenu.restaurante_id == restaurante.id)
            .order_by(CategoriaMenu.orden)
        )
    )
    assert [c.nombre for c in categorias] == [
        "Para empezar",
        "Platos fuertes",
        "Postres",
        "Bebidas",
    ]
    entradas = [p for p in platillos if p.categoria_id == categorias[0].id]
    assert [p.orden for p in entradas] == [1, 2, 3, 4, 5]

    otra_vez = await cliente.post(
        _ruta(restaurante, fila.id, "confirmar"), json=borrador, headers=cabecera_operador
    )
    assert otra_vez.status_code == 409
    assert otra_vez.json()["error"]["codigo"] == "IMPORTACION_YA_CONFIRMADA"
    assert len(await _platillos(sesion, restaurante)) == 20


@pytest.mark.ac("AC-25.1")
async def test_un_pdf_de_40_paginas_es_413(
    cliente: AsyncClient,
    sesion: AsyncSession,
    almacen: AlmacenLocal,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
) -> None:
    respuesta = await _subir(cliente, restaurante, cabecera_operador, pdf(40))
    assert respuesta.status_code == 413, respuesta.text
    codigo, mensaje = _error_de(respuesta)
    assert codigo == "ARCHIVO_EXCEDE_LIMITE"
    assert "40 páginas" in mensaje and "30" in mensaje
    assert respuesta.json()["error"]["detalles"] == {"max_paginas": 30}
    assert await sesion.scalar(select(func.count()).select_from(ImportacionMenu)) == 0
    assert not (almacen.raiz / "privado").exists()


# ---------------------------------------------------------------------------
# AC-25.1 · Subida
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-25.1")
async def test_sin_llave_es_503_y_no_crea_nada(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", None)
    respuesta = await _subir(cliente, restaurante, cabecera_operador)
    assert respuesta.status_code == 503
    assert _error_de(respuesta) == (
        "IMPORTACION_NO_DISPONIBLE",
        "La importación no está disponible por ahora.",
    )
    assert "retry-after" not in respuesta.headers
    assert await sesion.scalar(select(func.count()).select_from(ImportacionMenu)) == 0


@pytest.mark.ac("AC-25.1")
@pytest.mark.parametrize(
    ("datos", "nombre", "tipo"),
    [
        (b"GIF89a" + b"\0" * 64, "carta.pdf", "application/pdf"),
        (b"PK\x03\x04" + b"\0" * 64, "carta.docx", "application/pdf"),
        (img.heic(64, 48), "carta.heic", "image/heic"),
        (b"Hola, soy un menu en texto", "carta.txt", "text/plain"),
    ],
    ids=["gif-como-pdf", "zip", "heic", "texto"],
)
async def test_el_tipo_se_decide_por_contenido_415(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    datos: bytes,
    nombre: str,
    tipo: str,
) -> None:
    respuesta = await _subir(cliente, restaurante, cabecera_operador, datos, nombre, tipo)
    assert respuesta.status_code == 415, respuesta.text
    assert _error_de(respuesta) == ("TIPO_NO_SOPORTADO", "Sube tu carta en PDF, JPG o PNG.")


@pytest.mark.ac("AC-25.1")
async def test_un_pdf_con_nombre_de_foto_se_acepta_como_pdf(
    cliente: AsyncClient, restaurante: Restaurante, cabecera_operador: dict[str, str]
) -> None:
    respuesta = await _subir(
        cliente, restaurante, cabecera_operador, PDF_LA_CEIBA, "../../foto.jpg", "image/jpeg"
    )
    assert respuesta.status_code == 202, respuesta.text
    assert respuesta.json()["archivo_tipo"] == "application/pdf"


@pytest.mark.ac("AC-25.1")
@pytest.mark.parametrize(
    ("datos", "texto"),
    [
        (pdf(2, cifrar="clave"), "contraseña"),
        (b"%PDF-1.4\nesto no es un pdf\n%%EOF", "dañado"),
        (img.jpeg(400, 300)[:300], "dañada"),
    ],
    ids=["cifrado", "pdf-ilegible", "jpeg-truncado"],
)
async def test_contenido_invalido_es_422(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    datos: bytes,
    texto: str,
) -> None:
    respuesta = await _subir(cliente, restaurante, cabecera_operador, datos)
    assert respuesta.status_code == 422, respuesta.text
    codigo, mensaje = _error_de(respuesta)
    assert codigo == "ARCHIVO_NO_VALIDO"
    assert texto in mensaje


@pytest.mark.ac("AC-25.1")
async def test_una_bomba_de_pixeles_es_413_sin_decodificar(
    cliente: AsyncClient, restaurante: Restaurante, cabecera_operador: dict[str, str]
) -> None:
    respuesta = await _subir(
        cliente, restaurante, cabecera_operador, img.bomba_png(10_000, 6_000), "x.png", "image/png"
    )
    assert respuesta.status_code == 413, respuesta.text
    assert respuesta.json()["error"]["detalles"] == {"max_pixeles": 50_000_000}


def _ruido_png(ancho: int, alto: int) -> bytes:
    """PNG que no comprime (ruido): ~3 bytes por píxel."""
    import os

    salida = io.BytesIO()
    Image.frombytes("RGB", (ancho, alto), os.urandom(ancho * alto * 3)).save(salida, "PNG")
    return salida.getvalue()


@pytest.mark.ac("AC-25.1")
async def test_una_foto_grande_se_reescala_a_2576_px_en_jpeg(
    cliente: AsyncClient,
    sesion: AsyncSession,
    almacen: AlmacenLocal,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
) -> None:
    grande = _ruido_png(3200, 2000)
    assert 5 * MB < len(grande) <= 20 * MB  # pasa del límite de la API; cabe en AC-25.1
    respuesta = await _subir(cliente, restaurante, cabecera_operador, grande, "c.png", "image/png")
    assert respuesta.status_code == 202, respuesta.text
    assert respuesta.json()["archivo_tipo"] == "image/jpeg"
    fila = await sesion.get(ImportacionMenu, UUID(respuesta.json()["id"]))
    assert fila is not None and fila.archivo_url.endswith(".jpg")
    guardado = (almacen.raiz / "privado" / fila.archivo_url).read_bytes()
    assert len(guardado) <= 5 * MB
    with Image.open(io.BytesIO(guardado)) as imagen:
        assert imagen.format == "JPEG"
        assert imagen.size == (2576, 1610)


@pytest.mark.ac("AC-25.1")
async def test_una_foto_girada_por_exif_se_guarda_derecha(
    cliente: AsyncClient,
    sesion: AsyncSession,
    almacen: AlmacenLocal,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
) -> None:
    girada = img.jpeg(800, 600, orientacion=6)
    respuesta = await _subir(cliente, restaurante, cabecera_operador, girada, "c.jpg", "image/jpeg")
    assert respuesta.status_code == 202, respuesta.text
    fila = await sesion.get(ImportacionMenu, UUID(respuesta.json()["id"]))
    assert fila is not None
    with Image.open(io.BytesIO((almacen.raiz / "privado" / fila.archivo_url).read_bytes())) as i:
        assert i.size == (600, 800)


@pytest.mark.ac("AC-25.1")
async def test_una_foto_pequena_se_guarda_tal_cual(
    cliente: AsyncClient,
    sesion: AsyncSession,
    almacen: AlmacenLocal,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
) -> None:
    foto = img.png(900, 600)
    respuesta = await _subir(cliente, restaurante, cabecera_operador, foto, "c.png", "image/png")
    assert respuesta.status_code == 202, respuesta.text
    assert respuesta.json()["archivo_tipo"] == "image/png"
    fila = await sesion.get(ImportacionMenu, UUID(respuesta.json()["id"]))
    assert fila is not None
    assert (almacen.raiz / "privado" / fila.archivo_url).read_bytes() == foto


@pytest.mark.ac("AC-25.1")
async def test_content_length_de_mas_es_413_sin_leer_el_cuerpo(
    cliente: AsyncClient, restaurante: Restaurante, cabecera_operador: dict[str, str]
) -> None:
    cuerpo = Cuerpo([b"x" * MB] * 21)
    estado, respuesta = await _crudo(
        f"{A}/restaurantes/{restaurante.id}/importaciones",
        {**cabecera_operador, "content-type": MULTIPART, "content-length": str(21 * MB)},
        cuerpo,
    )
    assert estado == 413
    assert respuesta["error"]["codigo"] == "ARCHIVO_EXCEDE_LIMITE"
    assert cuerpo.pedidos == 0


@pytest.mark.ac("AC-25.1")
async def test_sin_content_length_se_corta_al_pasar_de_20_mb(
    cliente: AsyncClient, restaurante: Restaurante, cabecera_operador: dict[str, str]
) -> None:
    inicio = _multipart(b"")[: -len(b"\r\n--limite--\r\n")]
    cuerpo = Cuerpo([inicio] + [b"x" * MB] * 25)
    estado, respuesta = await _crudo(
        f"{A}/restaurantes/{restaurante.id}/importaciones",
        {**cabecera_operador, "content-type": MULTIPART},
        cuerpo,
    )
    assert estado == 413, respuesta
    # Trozos de 1 MB tras el inicio del multipart: el tope (20 MB + 64 KB) cae en el 22.º.
    assert cuerpo.pedidos <= 20 + 2


@pytest.mark.ac("AC-25.1")
@pytest.mark.parametrize("caso", ["sin-token", "restaurante-ajeno", "sin-llave"])
async def test_401_404_y_503_antes_de_leer_el_cuerpo(
    cliente: AsyncClient,
    fabrica_restaurante: Fabrica,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
    caso: str,
) -> None:
    rid = restaurante.id
    cabeceras: dict[str, str] = {"content-type": MULTIPART, **cabecera_operador}
    esperado = {"sin-token": 401, "restaurante-ajeno": 404, "sin-llave": 503}[caso]
    if caso == "sin-token":
        del cabeceras["Authorization"]
    elif caso == "restaurante-ajeno":
        rid = (await fabrica_restaurante()).id
    else:
        monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", SecretStr("  "))
    cuerpo = Cuerpo([_multipart(PDF_LA_CEIBA)])
    estado, _ = await _crudo(f"{A}/restaurantes/{rid}/importaciones", cabeceras, cuerpo)
    assert estado == esperado
    assert cuerpo.pedidos == 0


@pytest.mark.ac("AC-25.1")
async def test_la_conexion_se_suelta_antes_de_leer_el_cuerpo(
    cliente: AsyncClient,
    fabrica_sesion: async_sessionmaker[AsyncSession],
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
) -> None:
    from app.db.database import get_db_session

    sesiones: list[AsyncSession] = []

    async def espia() -> AsyncIterator[AsyncSession]:
        async with fabrica_sesion() as s:
            sesiones.append(s)
            yield s

    app.dependency_overrides[get_db_session] = espia
    cuerpo = CuerpoQueMira([_multipart(PDF_LA_CEIBA)], sesiones)
    estado, respuesta = await _crudo(
        f"{A}/restaurantes/{restaurante.id}/importaciones",
        {**cabecera_operador, "content-type": MULTIPART},
        cuerpo,
    )
    assert estado == 202, respuesta
    assert sesiones
    assert cuerpo.en_transaccion == [False] * len(sesiones)


@pytest.mark.ac("AC-25.1")
async def test_otro_campo_ademas_de_archivo_es_422(
    cliente: AsyncClient, restaurante: Restaurante, cabecera_operador: dict[str, str]
) -> None:
    respuesta = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/importaciones",
        files={"archivo": ("c.pdf", PDF_LA_CEIBA, "application/pdf")},
        data={"restaurante_id": str(uuid4())},
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 422
    sin_archivo = await cliente.post(
        f"{A}/restaurantes/{restaurante.id}/importaciones",
        files={"otro": ("c.pdf", PDF_LA_CEIBA, "application/pdf")},
        headers=cabecera_operador,
    )
    assert sin_archivo.status_code == 422


@pytest.mark.ac("AC-25.1")
async def test_la_subida_que_no_termina_es_408(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from tests.integration.test_fotos import CuerpoQueSeCalla

    monkeypatch.setattr(rutas_importaciones, "PLAZO_SUBIDA_SEGUNDOS", 0.2)
    estado, respuesta = await _crudo(
        f"{A}/restaurantes/{restaurante.id}/importaciones",
        {**cabecera_operador, "content-type": MULTIPART},
        CuerpoQueSeCalla([]),
    )
    assert estado == 408
    assert respuesta["error"]["codigo"] == "SUBIDA_INCOMPLETA"


@pytest.mark.ac("AC-25.1")
async def test_almacen_caido_es_503_sin_fila(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    tmp_path: Any,
) -> None:
    from app.services.assets import ErrorAlmacen, obtener_almacen

    class PrivadoCaido(AlmacenLocal):
        async def guardar_privado(self, clave: str, datos: bytes, tipo_mime: str) -> None:
            raise ErrorAlmacen("ConnectTimeout")

    app.dependency_overrides[obtener_almacen] = lambda: PrivadoCaido(tmp_path / "caido")
    respuesta = await _subir(cliente, restaurante, cabecera_operador)
    assert respuesta.status_code == 503
    assert respuesta.json()["error"]["codigo"] == "ALMACEN_NO_DISPONIBLE"
    assert await sesion.scalar(select(func.count()).select_from(ImportacionMenu)) == 0


# ---------------------------------------------------------------------------
# AC-25.3 / INV-9 · Confirmar
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-25.3")
@pytest.mark.parametrize(
    "estado", [EstadoImportacion.pendiente, EstadoImportacion.procesando, EstadoImportacion.fallido]
)
async def test_solo_se_confirma_una_importacion_lista(
    cliente: AsyncClient,
    sesion: AsyncSession,
    fabrica_importacion: Fabrica,
    restaurante: Restaurante,
    usuario: Usuario,
    cabecera_operador: dict[str, str],
    estado: EstadoImportacion,
) -> None:
    importacion = await fabrica_importacion(restaurante, usuario, estado=estado)
    respuesta = await cliente.post(
        _ruta(restaurante, importacion.id, "confirmar"),
        json=_borrador_valido(),
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 409
    assert respuesta.json()["error"]["codigo"] == "IMPORTACION_NO_LISTA"
    assert await _platillos(sesion, restaurante) == []


def _con(cambio: Any) -> dict[str, Any]:
    borrador = _borrador_valido()
    cambio(borrador)
    return borrador


def _demasiados(b: dict[str, Any]) -> None:
    b["categorias"] = [
        {
            "nombre": f"Cat {n}",
            "orden": n,
            "platillos": [
                {"nombre": f"P{m}", "precio": 1, "precio_confianza": "alta"} for m in range(101)
            ],
        }
        for n in range(10)
    ]


@pytest.mark.ac("AC-25.3")
@pytest.mark.parametrize(
    ("borrador", "campo", "tipo"),
    [
        (
            _con(lambda b: b["categorias"][1].update(nombre="  TACOS ")),
            "body.categorias.1.nombre",
            "nombre_repetido",
        ),
        (
            _con(lambda b: b["categorias"][0]["platillos"][1].update(nombre="pastor")),
            "body.categorias.0.platillos.1.nombre",
            "nombre_repetido",
        ),
        (
            _con(lambda b: b["categorias"][1]["platillos"][0].update(precio=None)),
            "body.categorias.1.platillos.0.precio",
            "precio_requerido",
        ),
        (_con(lambda b: b.update(categorias=[])), "body.categorias", "vacio"),
        (_con(_demasiados), "body", "demasiados_platillos"),
    ],
    ids=["categoria-repetida", "platillo-repetido", "sin-precio", "vacio", "mas-de-1000"],
)
async def test_el_borrador_revisado_se_valida_con_el_campo(
    cliente: AsyncClient,
    sesion: AsyncSession,
    fabrica_importacion: Fabrica,
    restaurante: Restaurante,
    usuario: Usuario,
    cabecera_operador: dict[str, str],
    borrador: dict[str, Any],
    campo: str,
    tipo: str,
) -> None:
    importacion = await _lista(fabrica_importacion, restaurante, usuario)
    respuesta = await cliente.post(
        _ruta(restaurante, importacion.id, "confirmar"), json=borrador, headers=cabecera_operador
    )
    assert respuesta.status_code == 422, respuesta.text
    (error,) = respuesta.json()["error"]["detalles"]["errores"]
    assert (error["campo"], error["tipo"]) == (campo, tipo)
    assert await _platillos(sesion, restaurante) == []
    await sesion.refresh(importacion)
    assert importacion.estado is EstadoImportacion.listo


@pytest.mark.ac("AC-25.3")
@pytest.mark.parametrize(
    "cambio",
    [
        lambda b: b["categorias"][0]["platillos"][0].update(precio="1e3"),
        lambda b: b["categorias"][0]["platillos"][0].update(precio=-1),
        lambda b: b["categorias"][0]["platillos"][0].update(precio=100_000_000),
        lambda b: b["categorias"][0]["platillos"][0].update(restaurante_id=str(uuid4())),
        lambda b: b.update(restaurante_id=str(uuid4())),
    ],
    ids=["notacion-cientifica", "negativo", "fuera-de-rango", "campo-extra", "campo-extra-raiz"],
)
async def test_precios_y_campos_desconocidos_son_422(
    cliente: AsyncClient,
    fabrica_importacion: Fabrica,
    restaurante: Restaurante,
    usuario: Usuario,
    cabecera_operador: dict[str, str],
    cambio: Any,
) -> None:
    importacion = await _lista(fabrica_importacion, restaurante, usuario)
    respuesta = await cliente.post(
        _ruta(restaurante, importacion.id, "confirmar"),
        json=_con(cambio),
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 422, respuesta.text


@pytest.mark.ac("AC-25.3")
async def test_el_precio_se_cuantiza_y_las_claves_se_normalizan(
    cliente: AsyncClient,
    sesion: AsyncSession,
    fabrica_importacion: Fabrica,
    restaurante: Restaurante,
    usuario: Usuario,
    cabecera_operador: dict[str, str],
) -> None:
    def cambio(b: dict[str, Any]) -> None:
        b["categorias"][0]["platillos"][0].update(
            precio=10.005,
            alergenos_sugeridos=["Lacteos", " lacteos "],
            etiquetas_sugeridas=["picante"],
            descripcion="Con piña",
            variantes=[{"nombre": "Orden", "precio": 110}, {"nombre": "Media", "precio": 57.5}],
        )

    importacion = await _lista(fabrica_importacion, restaurante, usuario)
    respuesta = await cliente.post(
        _ruta(restaurante, importacion.id, "confirmar"),
        json=_con(cambio),
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 200, respuesta.text
    pastor = next(p for p in await _platillos(sesion, restaurante) if p.nombre == "Pastor")
    assert pastor.precio == Decimal("10.01")
    assert pastor.alergenos == ["lacteos"]
    assert pastor.etiquetas == ["picante"]
    assert pastor.descripcion == "Con piña\nOrden $110 · Media $57.50"
    assert pastor.ilustracion_clave == "tacos"
    assert pastor.disponible and pastor.activo
    assert respuesta.json()["resultado"]["categorias"][0]["platillos"][0]["precio"] == 10.01


@pytest.mark.ac("AC-25.3")
async def test_una_categoria_activa_con_el_mismo_nombre_se_reutiliza(
    cliente: AsyncClient,
    sesion: AsyncSession,
    fabrica_categoria: Fabrica,
    fabrica_platillo: Fabrica,
    fabrica_importacion: Fabrica,
    restaurante: Restaurante,
    usuario: Usuario,
    cabecera_operador: dict[str, str],
) -> None:
    tacos = await fabrica_categoria(restaurante, nombre="tacos", orden=1)
    await fabrica_platillo(restaurante, tacos, nombre="Bistec", orden=1)
    await fabrica_categoria(restaurante, nombre="Bebidas", orden=2, activa=False)
    importacion = await _lista(fabrica_importacion, restaurante, usuario)
    respuesta = await cliente.post(
        _ruta(restaurante, importacion.id, "confirmar"),
        json=_borrador_valido(),
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 200, respuesta.text
    categorias = list(
        await sesion.scalars(
            select(CategoriaMenu)
            .where(CategoriaMenu.restaurante_id == restaurante.id)
            .order_by(CategoriaMenu.orden, CategoriaMenu.activa)
        )
    )
    assert [(c.nombre, c.orden, c.activa) for c in categorias] == [
        ("tacos", 1, True),
        ("Bebidas", 2, False),
        ("Bebidas", 3, True),  # la inactiva no se reutiliza: se crea al final
    ]
    en_tacos = [p for p in await _platillos(sesion, restaurante) if p.categoria_id == tacos.id]
    assert [(p.nombre, p.orden) for p in en_tacos] == [("Bistec", 1), ("Pastor", 2), ("Suadero", 3)]


@pytest.mark.ac("AC-25.3")
async def test_confirmar_invalida_la_cache_del_menu(
    cliente: AsyncClient,
    fabrica_importacion: Fabrica,
    restaurante: Restaurante,
    usuario: Usuario,
    cabecera_operador: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.services.cache_menu import cache_menu

    invalidados: list[str] = []
    monkeypatch.setattr(cache_menu, "invalidar", invalidados.append)
    importacion = await _lista(fabrica_importacion, restaurante, usuario)
    respuesta = await cliente.post(
        _ruta(restaurante, importacion.id, "confirmar"),
        json=_borrador_valido(),
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 200
    assert invalidados == [restaurante.slug]


@pytest.mark.ac("AC-25.3")
async def test_el_procesador_nunca_escribe_en_el_menu(
    sesion: AsyncSession,
    fabrica_sesion: async_sessionmaker[AsyncSession],
    fabrica_importacion: Fabrica,
    almacen: AlmacenLocal,
    restaurante: Restaurante,
    usuario: Usuario,
) -> None:
    importacion = await fabrica_importacion(restaurante, usuario)
    await almacen.guardar_privado(importacion.archivo_url, PDF_LA_CEIBA, "application/pdf")
    api = ApiFalsa(ok(grabada("la-ceiba")))
    await _procesador(fabrica_sesion, almacen, api).ciclo()
    await sesion.refresh(importacion)
    assert importacion.estado is EstadoImportacion.listo
    assert importacion.confirmado_en is None
    assert await _platillos(sesion, restaurante) == []
    assert await sesion.scalar(select(func.count()).select_from(CategoriaMenu)) == 0


# ---------------------------------------------------------------------------
# AC-15.3 · Ajena = inexistente
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-25.3")
@pytest.mark.parametrize(
    ("metodo", "accion"), [("GET", ""), ("POST", "confirmar"), ("POST", "reintentar")]
)
async def test_una_importacion_ajena_es_404_igual_que_una_inexistente(
    cliente: AsyncClient,
    sesion: AsyncSession,
    fabrica_restaurante: Fabrica,
    fabrica_operador: Fabrica,
    fabrica_importacion: Fabrica,
    restaurante: Restaurante,
    usuario: Usuario,
    cabecera_operador: dict[str, str],
    metodo: str,
    accion: str,
) -> None:
    otro = await fabrica_restaurante()
    otro_dueno = await fabrica_operador(otro)
    usuario_otro = await sesion.get(Usuario, otro_dueno.usuario_id)
    ajena = await _lista(fabrica_importacion, otro, usuario_otro)
    cuerpo = {"json": _borrador_valido()} if accion == "confirmar" else {}
    respuestas = [
        # la de otro restaurante por la ruta del mío, por la del otro, y una que no existe
        await cliente.request(
            metodo, _ruta(restaurante, ajena.id, accion), headers=cabecera_operador, **cuerpo
        ),
        await cliente.request(
            metodo, _ruta(otro, ajena.id, accion), headers=cabecera_operador, **cuerpo
        ),
        await cliente.request(
            metodo, _ruta(restaurante, uuid4(), accion), headers=cabecera_operador, **cuerpo
        ),
    ]
    assert [r.status_code for r in respuestas] == [404, 404, 404]
    assert len({_error_de(r) for r in respuestas}) == 1
    await sesion.refresh(ajena)
    assert ajena.estado is EstadoImportacion.listo


# ---------------------------------------------------------------------------
# AC-25.4 · Falla, causa legible y reintento
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-25.4")
async def test_una_extraccion_fallida_explica_la_causa_y_se_reintenta(
    cliente: AsyncClient,
    sesion: AsyncSession,
    fabrica_sesion: async_sessionmaker[AsyncSession],
    almacen: AlmacenLocal,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
) -> None:
    subida = await _subir(cliente, restaurante, cabecera_operador)
    importacion_id = subida.json()["id"]
    api = ApiFalsa(error_api(400, "invalid_request_error"), ok(grabada("la-ceiba")))
    trabajador = _procesador(fabrica_sesion, almacen, api)
    await trabajador.ciclo()

    fallida = (
        await cliente.get(_ruta(restaurante, importacion_id), headers=cabecera_operador)
    ).json()
    assert fallida["estado"] == "fallido"
    assert fallida["error_mensaje"] == (
        "El servicio de lectura rechazó la carta. Revisa que el archivo se abra bien o "
        "captura el menú a mano."
    )
    assert fallida["resultado"] is None

    otra = await cliente.post(
        _ruta(restaurante, importacion_id, "reintentar"), headers=cabecera_operador
    )
    assert otra.status_code == 202, otra.text
    assert otra.json()["estado"] == "pendiente"
    assert otra.json()["error_mensaje"] is None
    assert otra.json()["intentos"] == 1

    await trabajador.ciclo()
    lista = (
        await cliente.get(_ruta(restaurante, importacion_id), headers=cabecera_operador)
    ).json()
    assert lista["estado"] == "listo"
    assert lista["intentos"] == 2
    assert lista["error_mensaje"] is None


@pytest.mark.ac("AC-25.4")
async def test_una_llave_rechazada_deja_fallido_reintentable(
    sesion: AsyncSession,
    fabrica_sesion: async_sessionmaker[AsyncSession],
    fabrica_importacion: Fabrica,
    almacen: AlmacenLocal,
    restaurante: Restaurante,
    usuario: Usuario,
) -> None:
    importacion = await fabrica_importacion(restaurante, usuario)
    await almacen.guardar_privado(importacion.archivo_url, PDF_LA_CEIBA, "application/pdf")
    api = ApiFalsa(error_api(401, "authentication_error"))
    await _procesador(fabrica_sesion, almacen, api).ciclo()
    await sesion.refresh(importacion)
    assert importacion.estado is EstadoImportacion.fallido
    assert importacion.error_mensaje == "La importación no está disponible por ahora."
    vuelta = await importaciones.reintentar(sesion, restaurante.id, importacion.id)
    assert vuelta.estado is EstadoImportacion.pendiente


@pytest.mark.ac("AC-25.4")
async def test_un_archivo_que_falta_en_el_almacen_es_fallido_legible(
    sesion: AsyncSession,
    fabrica_sesion: async_sessionmaker[AsyncSession],
    fabrica_importacion: Fabrica,
    almacen: AlmacenLocal,
    restaurante: Restaurante,
    usuario: Usuario,
) -> None:
    importacion = await fabrica_importacion(restaurante, usuario)
    api = ApiFalsa()
    await _procesador(fabrica_sesion, almacen, api).ciclo()
    await sesion.refresh(importacion)
    assert importacion.estado is EstadoImportacion.fallido
    assert importacion.error_mensaje == (
        "No pudimos abrir el archivo que subiste. Inténtalo de nuevo en un momento."
    )
    assert api.peticiones == []


@pytest.mark.ac("AC-25.4")
@pytest.mark.parametrize(
    ("estado", "intentos", "codigo"),
    [
        (EstadoImportacion.listo, 1, "IMPORTACION_NO_REINTENTABLE"),
        (EstadoImportacion.pendiente, 0, "IMPORTACION_NO_REINTENTABLE"),
        (EstadoImportacion.procesando, 1, "IMPORTACION_NO_REINTENTABLE"),
        (EstadoImportacion.fallido, 3, "IMPORTACION_SIN_REINTENTOS"),
    ],
)
async def test_reintentar_solo_una_fallida_con_corridas(
    cliente: AsyncClient,
    sesion: AsyncSession,
    fabrica_importacion: Fabrica,
    restaurante: Restaurante,
    usuario: Usuario,
    cabecera_operador: dict[str, str],
    estado: EstadoImportacion,
    intentos: int,
    codigo: str,
) -> None:
    valores: dict[str, Any] = {"estado": estado, "intentos": intentos}
    if estado is EstadoImportacion.listo:
        valores["resultado"] = _borrador_valido()
    importacion = await fabrica_importacion(restaurante, usuario, **valores)
    respuesta = await cliente.post(
        _ruta(restaurante, importacion.id, "reintentar"), headers=cabecera_operador
    )
    assert respuesta.status_code == 409
    assert respuesta.json()["error"]["codigo"] == codigo
    await sesion.refresh(importacion)
    assert importacion.estado is estado


@pytest.mark.ac("AC-25.4")
async def test_reintentar_sin_llave_es_503(
    cliente: AsyncClient,
    sesion: AsyncSession,
    fabrica_importacion: Fabrica,
    restaurante: Restaurante,
    usuario: Usuario,
    cabecera_operador: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    importacion = await fabrica_importacion(
        restaurante, usuario, estado=EstadoImportacion.fallido, intentos=1
    )
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", None)
    respuesta = await cliente.post(
        _ruta(restaurante, importacion.id, "reintentar"), headers=cabecera_operador
    )
    assert respuesta.status_code == 503
    await sesion.refresh(importacion)
    assert importacion.estado is EstadoImportacion.fallido


# ---------------------------------------------------------------------------
# Procesador: recuperación, escritura protegida, conexión suelta, apagado
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-25.4")
@pytest.mark.parametrize(("minutos", "se_toma"), [(5, True), (3, False)])
async def test_una_importacion_atascada_en_procesando_se_recupera_pasado_el_plazo(
    sesion: AsyncSession,
    fabrica_sesion: async_sessionmaker[AsyncSession],
    fabrica_importacion: Fabrica,
    almacen: AlmacenLocal,
    restaurante: Restaurante,
    usuario: Usuario,
    minutos: int,
    se_toma: bool,
) -> None:
    assert PLAZO_CORRIDA_SEGUNDOS == 180.0
    assert timedelta(seconds=240) == PLAZO_RECUPERACION
    assert timedelta(seconds=PLAZO_CORRIDA_SEGUNDOS + 60) == PLAZO_RECUPERACION
    importacion = await fabrica_importacion(
        restaurante,
        usuario,
        estado=EstadoImportacion.procesando,
        intentos=1,
        iniciado_en=datetime.now(UTC) - timedelta(minutes=minutos),
    )
    await almacen.guardar_privado(importacion.archivo_url, PDF_LA_CEIBA, "application/pdf")
    api = ApiFalsa(ok(grabada("la-ceiba")))
    assert await _procesador(fabrica_sesion, almacen, api).ciclo() == int(se_toma)
    await sesion.refresh(importacion)
    if se_toma:
        assert (importacion.estado, importacion.intentos) == (EstadoImportacion.listo, 2)
    else:
        assert (importacion.estado, importacion.intentos) == (EstadoImportacion.procesando, 1)


@pytest.mark.ac("AC-25.4")
async def test_una_atascada_que_agoto_sus_corridas_pasa_a_fallido(
    sesion: AsyncSession,
    fabrica_sesion: async_sessionmaker[AsyncSession],
    fabrica_importacion: Fabrica,
    almacen: AlmacenLocal,
    restaurante: Restaurante,
    usuario: Usuario,
) -> None:
    importacion = await fabrica_importacion(
        restaurante,
        usuario,
        estado=EstadoImportacion.procesando,
        intentos=3,
        iniciado_en=datetime.now(UTC) - timedelta(hours=1),
    )
    api = ApiFalsa()
    assert await _procesador(fabrica_sesion, almacen, api).ciclo() == 0
    await sesion.refresh(importacion)
    assert importacion.estado is EstadoImportacion.fallido
    assert importacion.intentos == 3
    assert importacion.error_mensaje is not None and "varios intentos" in importacion.error_mensaje
    assert api.peticiones == []


@pytest.mark.ac("AC-25.4")
async def test_una_escritura_tardia_no_pisa_a_quien_la_recupero(
    sesion: AsyncSession,
    fabrica_sesion: async_sessionmaker[AsyncSession],
    fabrica_importacion: Fabrica,
    almacen: AlmacenLocal,
    restaurante: Restaurante,
    usuario: Usuario,
) -> None:
    importacion = await fabrica_importacion(restaurante, usuario)
    trabajador = _procesador(fabrica_sesion, almacen, ApiFalsa())
    tomada = await trabajador.tomar()
    assert tomada is not None and tomada.id == importacion.id
    # Otro procesador la recuperó (otro `iniciado_en`) y ya la terminó.
    await sesion.execute(
        text("UPDATE importacion_menu SET iniciado_en = now() - interval '1 s' WHERE id = :i"),
        {"i": importacion.id},
    )
    await sesion.commit()
    assert not await trabajador._terminar(tomada, fallido="tarde")
    await sesion.refresh(importacion)
    assert importacion.estado is EstadoImportacion.procesando
    assert importacion.error_mensaje is None


class FabricaQueCuenta:
    """`async_sessionmaker` que cuenta las sesiones abiertas en cada momento."""

    def __init__(self, fabrica: async_sessionmaker[AsyncSession]) -> None:
        self.fabrica = fabrica
        self.abiertas = 0

    def __call__(self) -> Any:
        externa = self

        class Envoltura:
            async def __aenter__(self) -> AsyncSession:
                externa.abiertas += 1
                self.sesion = externa.fabrica()
                return await self.sesion.__aenter__()

            async def __aexit__(self, *exc: Any) -> None:
                await self.sesion.__aexit__(*exc)
                externa.abiertas -= 1

        return Envoltura()


@pytest.mark.ac("AC-25.4")
async def test_no_se_retiene_la_conexion_mientras_se_llama_a_la_api(
    fabrica_sesion: async_sessionmaker[AsyncSession],
    fabrica_importacion: Fabrica,
    almacen: AlmacenLocal,
    restaurante: Restaurante,
    usuario: Usuario,
) -> None:
    importacion = await fabrica_importacion(restaurante, usuario)
    await almacen.guardar_privado(importacion.archivo_url, PDF_LA_CEIBA, "application/pdf")
    contadora = FabricaQueCuenta(fabrica_sesion)
    abiertas_durante: list[int] = []
    resultado = ResultadoImportacion.model_validate(_borrador_valido())

    async def extraer(datos: bytes, tipo: str, **_: Any) -> Extraccion:
        abiertas_durante.append(contadora.abiertas)
        return Extraccion(resultado, "claude-opus-5-5", 10, 20, 1, 1)

    trabajador = Procesador(contadora, almacen, extraer=extraer)  # type: ignore[arg-type]
    assert await trabajador.ciclo() == 1
    assert abiertas_durante == [0]


@pytest.mark.ac("AC-25.4")
async def test_un_apagado_a_media_corrida_la_devuelve_a_la_cola(
    sesion: AsyncSession,
    fabrica_sesion: async_sessionmaker[AsyncSession],
    fabrica_importacion: Fabrica,
    almacen: AlmacenLocal,
    restaurante: Restaurante,
    usuario: Usuario,
) -> None:
    importacion = await fabrica_importacion(restaurante, usuario)
    await almacen.guardar_privado(importacion.archivo_url, PDF_LA_CEIBA, "application/pdf")
    dentro = asyncio.Event()

    async def extraer(datos: bytes, tipo: str, **_: Any) -> Extraccion:
        dentro.set()
        await asyncio.Event().wait()  # una llamada a la API que no termina
        raise AssertionError("inalcanzable")

    trabajador = Procesador(fabrica_sesion, almacen, extraer=extraer)
    tarea = asyncio.create_task(trabajador.procesar_una())
    await dentro.wait()
    tarea.cancel()
    with pytest.raises(asyncio.CancelledError):
        await tarea
    await sesion.refresh(importacion)
    assert importacion.estado is EstadoImportacion.pendiente
    assert importacion.intentos == 0
    assert importacion.iniciado_en is None


@pytest.mark.ac("AC-25.4")
async def test_un_error_inesperado_deja_fallido_y_no_procesando(
    sesion: AsyncSession,
    fabrica_sesion: async_sessionmaker[AsyncSession],
    fabrica_importacion: Fabrica,
    almacen: AlmacenLocal,
    restaurante: Restaurante,
    usuario: Usuario,
) -> None:
    importacion = await fabrica_importacion(restaurante, usuario)
    await almacen.guardar_privado(importacion.archivo_url, PDF_LA_CEIBA, "application/pdf")

    async def extraer(datos: bytes, tipo: str, **_: Any) -> Extraccion:
        raise RuntimeError("algo raro")

    await Procesador(fabrica_sesion, almacen, extraer=extraer).ciclo()
    await sesion.refresh(importacion)
    assert importacion.estado is EstadoImportacion.fallido
    assert importacion.error_mensaje == (
        "Algo salió mal al leer tu carta. Intenta de nuevo o captura el menú a mano."
    )


@pytest.mark.ac("AC-25.1")
async def test_el_bucle_despierta_con_una_subida_y_sobrevive_a_un_error(
    fabrica_sesion: async_sessionmaker[AsyncSession], almacen: AlmacenLocal
) -> None:
    trabajador = Procesador(fabrica_sesion, almacen)
    ciclos: list[int] = []
    primero, segundo = asyncio.Event(), asyncio.Event()

    async def ciclo() -> int:
        ciclos.append(len(ciclos))
        if len(ciclos) == 1:
            primero.set()
            raise RuntimeError("base caída")
        segundo.set()
        return 0

    trabajador.ciclo = ciclo  # type: ignore[method-assign]
    procesador.instalar(trabajador)
    try:
        tarea = asyncio.create_task(trabajador.correr())
        await primero.wait()
        procesador.despertar()  # sin esperar los 10 s
        await segundo.wait()
        tarea.cancel()
        with pytest.raises(asyncio.CancelledError):
            await tarea
    finally:
        procesador.instalar(None)
    assert ciclos == [0, 1]


async def test_el_lifespan_arranca_y_detiene_el_procesador(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    eventos: list[str] = []
    arranco = asyncio.Event()

    async def correr(self: Procesador) -> None:
        eventos.append("arranca")
        arranco.set()
        try:
            await asyncio.Event().wait()
        finally:
            eventos.append("se detiene")

    monkeypatch.setattr(Procesador, "correr", correr)
    async with app.router.lifespan_context(app):
        await arranco.wait()
        assert eventos == ["arranca"]
        assert procesador._procesador is not None
    assert eventos == ["arranca", "se detiene"]
    assert procesador._procesador is None


# ---------------------------------------------------------------------------
# Concurrencia con conexiones reales (receta de carreras de /pruebas)
# ---------------------------------------------------------------------------


@pytest.fixture
async def real(motor_pruebas: AsyncEngine) -> AsyncIterator[dict[str, Any]]:
    """Restaurante, usuario y dos importaciones confirmados de verdad; se borran al final."""
    fabrica = async_sessionmaker(motor_pruebas, expire_on_commit=False)
    async with fabrica() as s:
        restaurante = Restaurante(nombre="Carrera", slug=f"carrera-{uuid4().hex[:8]}")
        usuario = Usuario(firebase_uid=f"uid-carrera-{uuid4().hex[:8]}", provider="google")
        s.add_all([restaurante, usuario])
        await s.flush()
        s.add(OperadorRestaurante(usuario_id=usuario.id, restaurante_id=restaurante.id))
        filas = [
            ImportacionMenu(
                restaurante_id=restaurante.id,
                solicitado_por=usuario.id,
                archivo_url=f"importaciones/{restaurante.id}/{n}.pdf",
                archivo_tipo="application/pdf",
                creado_en=datetime.now(UTC) - timedelta(seconds=10 - n),
            )
            for n in range(2)
        ]
        s.add_all(filas)
        await s.commit()
    try:
        yield {"fabrica": fabrica, "restaurante": restaurante, "usuario": usuario, "filas": filas}
    finally:
        async with fabrica() as s:
            parametros = {"r": restaurante.id}
            for tabla in (
                "importacion_menu",
                "platillo",
                "categoria_menu",
                "operador_restaurante",
            ):
                await s.execute(text(f"DELETE FROM {tabla} WHERE restaurante_id = :r"), parametros)
            await s.execute(text("DELETE FROM restaurante WHERE id = :r"), parametros)
            await s.execute(text("DELETE FROM usuario WHERE id = :u"), {"u": usuario.id})
            await s.commit()


@pytest.mark.ac("AC-25.1")
async def test_skip_locked_salta_la_fila_que_otro_procesador_tiene_tomada(
    real: dict[str, Any], tmp_path: Any
) -> None:
    fabrica = real["fabrica"]
    primera, segunda = real["filas"]
    almacen = AlmacenLocal(tmp_path / "a")
    async with fabrica() as otra:
        # La conexión A tiene la primera bloqueada y sin confirmar (a media toma).
        await otra.execute(
            text("SELECT id FROM importacion_menu WHERE id = :i FOR UPDATE"), {"i": primera.id}
        )
        tomada = await Procesador(fabrica, almacen).tomar()  # conexión B: no espera
        assert tomada is not None and tomada.id == segunda.id
        await otra.rollback()


@pytest.mark.ac("AC-25.1")
async def test_dos_procesadores_a_la_vez_no_procesan_la_misma_importacion(
    real: dict[str, Any], tmp_path: Any
) -> None:
    fabrica = real["fabrica"]
    almacen = AlmacenLocal(tmp_path / "a")
    for fila in real["filas"]:
        await almacen.guardar_privado(fila.archivo_url, PDF_LA_CEIBA, "application/pdf")
    llamadas: list[str] = []
    ambos_dentro = asyncio.Event()
    resultado = ResultadoImportacion.model_validate(_borrador_valido())

    def extractor(nombre: str) -> Any:
        async def extraer(datos: bytes, tipo: str, **_: Any) -> Extraccion:
            llamadas.append(nombre)
            if len(llamadas) == 2:
                ambos_dentro.set()
            await ambos_dentro.wait()  # los dos procesadores trabajan a la vez
            return Extraccion(resultado, "claude-opus-5-5", 1, 1, 1, 1)

        return extraer

    uno = Procesador(fabrica, almacen, extraer=extractor("uno"))
    dos = Procesador(fabrica, almacen, extraer=extractor("dos"))
    hechas = await asyncio.gather(uno.procesar_una(), dos.procesar_una())
    assert hechas == [True, True]
    assert sorted(llamadas) == ["dos", "uno"]
    async with fabrica() as s:
        filas = list(
            await s.scalars(
                select(ImportacionMenu).where(
                    ImportacionMenu.restaurante_id == real["restaurante"].id
                )
            )
        )
    assert {(f.estado, f.intentos) for f in filas} == {(EstadoImportacion.listo, 1)}
    assert await uno.ciclo() + await dos.ciclo() == 0


@pytest.mark.ac("AC-25.3")
async def test_dos_confirmaciones_a_la_vez_crean_un_solo_menu(real: dict[str, Any]) -> None:
    fabrica = real["fabrica"]
    restaurante = real["restaurante"]
    fila = real["filas"][0]
    async with fabrica() as s:
        await s.execute(
            text(
                "UPDATE importacion_menu SET estado = 'listo', resultado = '{}'::jsonb "
                "WHERE id = :i"
            ),
            {"i": fila.id},
        )
        await s.commit()
    revisado = ResultadoImportacion.model_validate(_borrador_valido())

    async def confirmar() -> Any:
        async with fabrica() as s:
            return await importaciones.confirmar(s, restaurante.id, fila.id, revisado)

    resultados = await asyncio.gather(confirmar(), confirmar(), return_exceptions=True)
    errores = [r for r in resultados if isinstance(r, ErrorCarta)]
    assert len(errores) == 1 and errores[0].http == 409
    assert errores[0].codigo == "IMPORTACION_YA_CONFIRMADA"
    async with fabrica() as s:
        cuantos = await s.scalar(
            select(func.count())
            .select_from(Platillo)
            .where(Platillo.restaurante_id == restaurante.id)
        )
    assert cuantos == 3


# ===========================================================================
# Revisión de la maestra (A1–A5, B1, B4, B6)
# ===========================================================================

RAIZ = Path(__file__).resolve().parents[2]

# Pico de memoria con `VmHWM` en un subproceso aislado (regla 20 de /pruebas).
MEDIR_PDF = """
import sys, threading
sys.path.insert(0, {raiz!r})
from app.services.importacion_menu import ArchivoNoValido, contar_paginas
datos = open(sys.argv[1], "rb").read()
motivos = []
def contar():
    try:
        contar_paginas(datos)
        motivos.append("ok")
    except ArchivoNoValido as error:
        motivos.append(error.motivo)
hilos = [threading.Thread(target=contar) for _ in range(4)]
for h in hilos: h.start()
for h in hilos: h.join()
print(",".join(motivos))
pico = [l for l in open("/proc/self/status") if l.startswith("VmHWM:")][0]
print(int(pico.split()[1]) // 1024)
"""


@pytest.mark.ac("AC-25.1")
async def test_un_pdf_con_xref_de_1_gib_es_422_y_no_se_lleva_la_memoria(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    tmp_path: Path,
) -> None:
    """A1: 1 MB en disco que pypdf descomprimía a 1 GiB (480 MB con cuatro a la vez)."""
    hostil = pdf_con_xref_gigante()
    assert len(hostil) < 2 * MB
    respuesta = await _subir(cliente, restaurante, cabecera_operador, hostil)
    assert respuesta.status_code == 422, respuesta.text
    assert respuesta.json()["error"]["codigo"] == "ARCHIVO_NO_VALIDO"

    ruta = tmp_path / "xref.pdf"
    ruta.write_bytes(hostil)
    salida = subprocess.run(
        [sys.executable, "-I", "-c", MEDIR_PDF.format(raiz=str(RAIZ)), str(ruta)],
        capture_output=True,
        text=True,
        timeout=50,
        check=True,
    )
    motivos, pico = salida.stdout.strip().splitlines()[-2:]
    assert motivos == "contenido,contenido,contenido,contenido"
    assert int(pico) < 200, f"pico de {pico} MB"


@pytest.mark.ac("AC-25.1")
async def test_con_la_cola_de_pillow_y_pypdf_llena_es_503(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A1: el PDF también pasa por el semáforo de `assets` (antes iba directo a un hilo)."""
    monkeypatch.setattr(assets, "PLAZO_COLA_SEGUNDOS", 0.05)
    await assets._semaforo.acquire()
    try:
        respuesta = await _subir(cliente, restaurante, cabecera_operador)
    finally:
        assets._semaforo.release()
    assert respuesta.status_code == 503
    assert _error_de(respuesta) == (
        "SERVICIO_OCUPADO",
        "Hay muchas fotos en cola; inténtalo en un momento.",
    )
    assert await sesion.scalar(select(func.count()).select_from(ImportacionMenu)) == 0


@pytest.mark.ac("AC-25.1")
async def test_con_tres_en_curso_la_cuarta_es_409_sin_leer_el_cuerpo(
    cliente: AsyncClient,
    fabrica_importacion: Fabrica,
    restaurante: Restaurante,
    usuario: Usuario,
    cabecera_operador: dict[str, str],
) -> None:
    await fabrica_importacion(restaurante, usuario)
    await fabrica_importacion(restaurante, usuario)
    # Las terminadas no cuentan.
    await fabrica_importacion(restaurante, usuario, estado=EstadoImportacion.fallido, intentos=1)
    await _lista(fabrica_importacion, restaurante, usuario)
    cuerpo = Cuerpo([_multipart(PDF_LA_CEIBA)])
    ruta = f"{A}/restaurantes/{restaurante.id}/importaciones"
    cabeceras = {**cabecera_operador, "content-type": MULTIPART}
    estado, respuesta = await _crudo(ruta, cabeceras, cuerpo)
    assert estado == 202, respuesta  # dos en curso: cabe la tercera

    cuerpo = Cuerpo([_multipart(PDF_LA_CEIBA)])
    estado, respuesta = await _crudo(ruta, cabeceras, cuerpo)
    assert estado == 409
    assert respuesta["error"]["codigo"] == "IMPORTACION_EN_CURSO"
    assert respuesta["error"]["detalles"] == {"max_en_curso": 3}
    assert cuerpo.pedidos == 0


@pytest.mark.ac("AC-25.1")
async def test_dos_subidas_a_la_vez_con_dos_en_curso_una_entra_y_otra_409(
    real: dict[str, Any], tmp_path: Path
) -> None:
    """A1: el cupo se vuelve a contar con la fila del restaurante bloqueada."""
    fabrica = real["fabrica"]
    almacen = AlmacenLocal(tmp_path / "a")

    async def subir() -> Any:
        async with fabrica() as s:
            return await importaciones.crear_importacion(
                s, real["usuario"].id, real["restaurante"].id, PDF_LA_CEIBA, almacen
            )

    resultados = await asyncio.gather(subir(), subir(), return_exceptions=True)
    creadas = [r for r in resultados if isinstance(r, ImportacionMenu)]
    errores = [r for r in resultados if isinstance(r, ErrorCarta)]
    assert len(creadas) == 1 and len(errores) == 1, resultados
    assert (errores[0].http, errores[0].codigo) == (409, "IMPORTACION_EN_CURSO")


# --- A2 · Cuerpo de confirmar -------------------------------------------------------------


async def _crudo_json(ruta: str, cabeceras: dict[str, str], cuerpo: Cuerpo) -> Any:
    return await _crudo(ruta, {**cabeceras, "content-type": "application/json"}, cuerpo)


@pytest.mark.ac("AC-25.3")
async def test_confirmar_con_content_length_de_mas_es_413_sin_leer(
    cliente: AsyncClient,
    fabrica_importacion: Fabrica,
    restaurante: Restaurante,
    usuario: Usuario,
    cabecera_operador: dict[str, str],
) -> None:
    importacion = await _lista(fabrica_importacion, restaurante, usuario)
    cuerpo = Cuerpo([b"x" * MB] * 3)
    estado, respuesta = await _crudo_json(
        _ruta(restaurante, importacion.id, "confirmar"),
        {**cabecera_operador, "content-length": str(2 * MB + 1)},
        cuerpo,
    )
    assert estado == 413
    assert respuesta["error"]["codigo"] == "ARCHIVO_EXCEDE_LIMITE"
    assert cuerpo.pedidos == 0


@pytest.mark.ac("AC-25.3")
async def test_confirmar_sin_content_length_se_corta_al_pasar_de_2_mb(
    cliente: AsyncClient,
    fabrica_importacion: Fabrica,
    restaurante: Restaurante,
    usuario: Usuario,
    cabecera_operador: dict[str, str],
) -> None:
    importacion = await _lista(fabrica_importacion, restaurante, usuario)
    cuerpo = Cuerpo([b"x" * MB] * 10)
    estado, _ = await _crudo_json(
        _ruta(restaurante, importacion.id, "confirmar"), cabecera_operador, cuerpo
    )
    assert estado == 413
    assert cuerpo.pedidos == 3  # 1 MB, 2 MB, y el tercero pasa del tope


@pytest.mark.ac("AC-25.3")
async def test_un_aviso_enorme_es_422_rapido(
    cliente: AsyncClient,
    fabrica_importacion: Fabrica,
    restaurante: Restaurante,
    usuario: Usuario,
    cabecera_operador: dict[str, str],
) -> None:
    importacion = await _lista(fabrica_importacion, restaurante, usuario)
    borrador = _borrador_valido() | {"avisos": ["x" * int(1.9 * MB)]}
    inicio = time.perf_counter()
    respuesta = await cliente.post(
        _ruta(restaurante, importacion.id, "confirmar"), json=borrador, headers=cabecera_operador
    )
    assert time.perf_counter() - inicio < 0.5
    assert respuesta.status_code == 422
    (error,) = respuesta.json()["error"]["detalles"]["errores"]
    assert (error["campo"], error["tipo"]) == ("body.avisos.0", "string_too_long")


def test_el_tope_total_se_cuenta_antes_de_validar_cada_platillo() -> None:
    def borrador(platillos: int) -> dict[str, Any]:
        por_categoria = [143] * 7 if platillos == 1001 else [100] * 10
        return {
            "categorias": [
                {
                    "nombre": f"C{n}",
                    "orden": n,
                    # Platillos inválidos a propósito: si se validaran, el error sería otro.
                    "platillos": [{"nombre": ""}] * cuantos,
                }
                for n, cuantos in enumerate(por_categoria)
            ]
        }

    with pytest.raises(ValidationError) as error:
        ResultadoImportacion.model_validate(borrador(1001))
    (detalle,) = error.value.errors()
    assert detalle["type"] == "demasiados_platillos"
    assert detalle["msg"] == "Caben hasta 1000 platillos; reduce la carta a 1000 platillos."
    # 1000 justos no llegan al tope: fallan los platillos, no el total.
    with pytest.raises(ValidationError) as error:
        ResultadoImportacion.model_validate(borrador(1000))
    assert {d["type"] for d in error.value.errors()} != {"demasiados_platillos"}


# --- A4 · El procesador no muere en silencio y /ready lo dice ---------------------------


@pytest.mark.ac("AC-25.4")
async def test_una_cancelacion_espuria_no_mata_el_bucle(
    fabrica_sesion: async_sessionmaker[AsyncSession],
    almacen: AlmacenLocal,
    caplog: pytest.LogCaptureFixture,
) -> None:
    trabajador = Procesador(fabrica_sesion, almacen)
    llamadas: list[int] = []
    segunda = asyncio.Event()

    async def tomar() -> None:
        llamadas.append(1)
        if len(llamadas) == 1:
            trabajador.despertar()  # para no esperar los 10 s del intervalo
            raise asyncio.CancelledError  # un futuro interno cancelado, no la tarea
        segunda.set()
        return None

    trabajador.tomar = tomar  # type: ignore[assignment,method-assign]
    tarea = trabajador.iniciar()
    async with asyncio.timeout(2):
        await segunda.wait()
    assert not tarea.done()
    assert "cancelación espuria" in caplog.text
    await trabajador.detener()
    assert tarea.done()


@pytest.mark.ac("AC-25.4")
async def test_la_tarea_que_muere_sin_apagado_se_relanza(
    fabrica_sesion: async_sessionmaker[AsyncSession],
    almacen: AlmacenLocal,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    monkeypatch.setattr(procesador, "PAUSA_REINICIO_SEGUNDOS", 0.0)
    trabajador = Procesador(fabrica_sesion, almacen)
    arranques: list[int] = []
    arranco, relanzada = asyncio.Event(), asyncio.Event()

    async def correr() -> None:
        arranques.append(1)
        (arranco if len(arranques) == 1 else relanzada).set()
        await asyncio.Event().wait()

    trabajador.correr = correr  # type: ignore[method-assign]
    primera = trabajador.iniciar()
    await arranco.wait()
    primera.cancel()  # alguien la cancela sin que sea el apagado
    await relanzada.wait()
    assert "se relanza" in caplog.text
    assert trabajador._tarea is not None and trabajador._tarea is not primera
    await trabajador.detener()
    assert arranques == [1, 1]


def test_el_intervalo_y_el_latido_son_los_del_brief() -> None:
    assert procesador.INTERVALO_SEGUNDOS == 10.0
    assert procesador.LATIDO_MAXIMO_SEGUNDOS == 30.0
    assert procesador.PAUSA_REINICIO_SEGUNDOS == 5.0


@pytest.mark.ac("AC-25.4")
async def test_ready_dice_si_el_procesador_esta_detenido(
    cliente: AsyncClient,
    fabrica_sesion: async_sessionmaker[AsyncSession],
    almacen: AlmacenLocal,
) -> None:
    trabajador = Procesador(fabrica_sesion, almacen)
    procesador.instalar(trabajador)
    try:
        trabajador._latido -= 31  # el bucle no da señales hace 31 s
        detenido = await cliente.get("/ready")
        assert detenido.status_code == 503
        assert detenido.json()["error"]["codigo"] == "PROCESADOR_DETENIDO"

        trabajador._corrida_desde = trabajador._latido  # una corrida larga en marcha: vivo
        assert (await cliente.get("/ready")).status_code == 200
        trabajador._corrida_desde = None

        await trabajador.ciclo()
        vivo = await cliente.get("/ready")
        assert vivo.status_code == 200
        assert vivo.json() == {"db": "ok", "procesador": {"ultimo_ciclo_hace_s": 0}}
    finally:
        procesador.instalar(None)
    sin_procesador = await cliente.get("/ready")
    assert sin_procesador.json() == {"db": "ok"}


@pytest.mark.ac("AC-25.1")
async def test_un_aviso_durante_el_ciclo_no_se_pierde(
    fabrica_sesion: async_sessionmaker[AsyncSession], almacen: AlmacenLocal
) -> None:
    """B5: antes el aviso se limpiaba después del ciclo y una subida a media corrida
    esperaba los 10 s."""
    trabajador = Procesador(fabrica_sesion, almacen)
    ciclos: list[int] = []
    segundo = asyncio.Event()

    async def ciclo() -> int:
        ciclos.append(1)
        if len(ciclos) == 1:
            trabajador.despertar()  # llega una subida mientras el ciclo trabaja
        else:
            segundo.set()
        return 0

    trabajador.ciclo = ciclo  # type: ignore[method-assign]
    trabajador.iniciar()
    async with asyncio.timeout(2):  # no espera los 10 s del intervalo
        await segundo.wait()
    await trabajador.detener()


# --- A5 · Pruebas que dejaban pasar mutaciones --------------------------------------------


@pytest.mark.ac("AC-25.3")
async def test_una_categoria_de_otro_restaurante_con_el_mismo_nombre_no_se_reutiliza(
    cliente: AsyncClient,
    sesion: AsyncSession,
    fabrica_restaurante: Fabrica,
    fabrica_categoria: Fabrica,
    fabrica_importacion: Fabrica,
    restaurante: Restaurante,
    usuario: Usuario,
    cabecera_operador: dict[str, str],
) -> None:
    otro = await fabrica_restaurante()
    ajena = await fabrica_categoria(otro, nombre="Tacos", orden=1)
    importacion = await _lista(fabrica_importacion, restaurante, usuario)
    respuesta = await cliente.post(
        _ruta(restaurante, importacion.id, "confirmar"),
        json=_borrador_valido(),
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 200, respuesta.text
    propios = await _platillos(sesion, restaurante)
    assert len(propios) == 3
    assert ajena.id not in {p.categoria_id for p in propios}
    cruzados = await sesion.scalar(
        select(func.count()).select_from(Platillo).where(Platillo.categoria_id == ajena.id)
    )
    assert cruzados == 0


@pytest.mark.ac("AC-25.1", "AC-25.4")
async def test_subir_y_reintentar_despiertan_al_procesador(
    cliente: AsyncClient,
    sesion: AsyncSession,
    fabrica_sesion: async_sessionmaker[AsyncSession],
    almacen: AlmacenLocal,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
) -> None:
    trabajador = Procesador(fabrica_sesion, almacen)
    procesador.instalar(trabajador)
    try:
        assert not trabajador._aviso.is_set()
        subida = await _subir(cliente, restaurante, cabecera_operador)
        assert subida.status_code == 202
        assert trabajador._aviso.is_set()

        trabajador._aviso.clear()
        await sesion.execute(
            text("UPDATE importacion_menu SET estado = 'fallido', intentos = 1 WHERE id = :i"),
            {"i": UUID(subida.json()["id"])},
        )
        await sesion.commit()
        otra = await cliente.post(
            _ruta(restaurante, subida.json()["id"], "reintentar"), headers=cabecera_operador
        )
        assert otra.status_code == 202
        assert trabajador._aviso.is_set()
    finally:
        procesador.instalar(None)


@pytest.mark.ac("AC-25.1")
async def test_20_mb_exactos_entran_y_un_byte_mas_es_413(
    cliente: AsyncClient,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
) -> None:
    justo = pdf_de_tamano(20 * MB)
    entra = await _subir(cliente, restaurante, cabecera_operador, justo)
    assert entra.status_code == 202, entra.text
    sobra = await _subir(cliente, restaurante, cabecera_operador, justo + b"\n")
    assert sobra.status_code == 413
    assert sobra.json()["error"]["detalles"] == {"max_bytes": 20 * MB}


@pytest.mark.ac("AC-25.1")
async def test_una_foto_llega_al_modelo_como_bloque_image_jpeg(
    cliente: AsyncClient,
    fabrica_sesion: async_sessionmaker[AsyncSession],
    almacen: AlmacenLocal,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
) -> None:
    subida = await _subir(
        cliente, restaurante, cabecera_operador, img.jpeg(800, 600), "c.jpg", "image/jpeg"
    )
    assert subida.status_code == 202
    api = ApiFalsa(ok(grabada("la-ceiba")))
    assert await _procesador(fabrica_sesion, almacen, api).ciclo() == 1
    (bloque, _) = api.peticiones[0]["messages"][0]["content"]
    assert bloque["type"] == "image"
    assert bloque["source"]["media_type"] == "image/jpeg"
    estado = await cliente.get(_ruta(restaurante, subida.json()["id"]), headers=cabecera_operador)
    assert estado.json()["estado"] == "listo"


@pytest.mark.ac("AC-25.1")
async def test_un_png_transparente_grande_queda_sobre_blanco(
    cliente: AsyncClient,
    sesion: AsyncSession,
    almacen: AlmacenLocal,
    restaurante: Restaurante,
    cabecera_operador: dict[str, str],
) -> None:
    salida = io.BytesIO()
    Image.new("RGBA", (3000, 2000), (0, 0, 0, 0)).save(salida, "PNG")
    subida = await _subir(
        cliente, restaurante, cabecera_operador, salida.getvalue(), "c.png", "image/png"
    )
    assert subida.status_code == 202, subida.text
    fila = await sesion.get(ImportacionMenu, UUID(subida.json()["id"]))
    assert fila is not None
    with Image.open(io.BytesIO((almacen.raiz / "privado" / fila.archivo_url).read_bytes())) as i:
        assert i.mode == "RGB"
        r, g, b = i.getpixel((10, 10))  # type: ignore[misc]
        assert min(r, g, b) >= 250  # blanco (JPEG puede mover un punto)


@pytest.mark.ac("AC-25.1")
async def test_la_cola_es_fifo(
    fabrica_sesion: async_sessionmaker[AsyncSession],
    fabrica_importacion: Fabrica,
    almacen: AlmacenLocal,
    restaurante: Restaurante,
    usuario: Usuario,
) -> None:
    ahora = datetime.now(UTC)
    nueva = await fabrica_importacion(restaurante, usuario, creado_en=ahora)
    vieja = await fabrica_importacion(restaurante, usuario, creado_en=ahora - timedelta(minutes=1))
    trabajador = Procesador(fabrica_sesion, almacen)
    primera, segunda = await trabajador.tomar(), await trabajador.tomar()
    assert primera is not None and segunda is not None
    assert (primera.id, segunda.id) == (vieja.id, nueva.id)


def test_la_descripcion_con_variantes_se_recorta_a_1000() -> None:
    platillo = PlatilloImportado.model_validate(
        {
            "nombre": "Agua",
            "descripcion": "d" * 990,
            "precio": 30,
            "precio_confianza": "alta",
            "variantes": [{"nombre": "Grande", "precio": 50}],
        }
    )
    texto = importaciones.descripcion_con_variantes(platillo)
    assert texto is not None
    assert len(texto) == 1000
    assert texto.endswith("…")


@pytest.mark.ac("AC-25.1")
async def test_si_le_quitan_el_restaurante_mientras_sube_es_404_sin_fila(
    cliente: AsyncClient,
    sesion: AsyncSession,
    restaurante: Restaurante,
    operador: OperadorRestaurante,
    cabecera_operador: dict[str, str],
) -> None:
    class CuerpoQueRevoca(Cuerpo):
        async def __call__(self) -> dict[str, Any]:
            if self.pedidos == 0:
                await sesion.execute(
                    text("DELETE FROM operador_restaurante WHERE id = :o"), {"o": operador.id}
                )
                await sesion.commit()
            return await super().__call__()

    estado, respuesta = await _crudo(
        f"{A}/restaurantes/{restaurante.id}/importaciones",
        {**cabecera_operador, "content-type": MULTIPART},
        CuerpoQueRevoca([_multipart(PDF_LA_CEIBA)]),
    )
    assert estado == 404, respuesta
    assert await sesion.scalar(select(func.count()).select_from(ImportacionMenu)) == 0


@pytest.mark.ac("AC-25.4")
async def test_una_corrida_que_pasa_su_plazo_queda_fallido(
    sesion: AsyncSession,
    fabrica_sesion: async_sessionmaker[AsyncSession],
    fabrica_importacion: Fabrica,
    almacen: AlmacenLocal,
    restaurante: Restaurante,
    usuario: Usuario,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    importacion = await fabrica_importacion(restaurante, usuario)
    await almacen.guardar_privado(importacion.archivo_url, PDF_LA_CEIBA, "application/pdf")
    monkeypatch.setattr(procesador, "PLAZO_CORRIDA_SEGUNDOS", 0.05)

    async def extraer(datos: bytes, tipo: str, **_: Any) -> Extraccion:
        await asyncio.Event().wait()  # la API nunca contesta
        raise AssertionError("inalcanzable")

    assert await Procesador(fabrica_sesion, almacen, extraer=extraer).ciclo() == 1
    await sesion.refresh(importacion)
    assert importacion.estado is EstadoImportacion.fallido
    assert importacion.intentos == 1


@pytest.mark.ac("AC-25.3")
async def test_un_fallo_a_media_confirmacion_no_deja_nada(
    cliente: AsyncClient,
    sesion: AsyncSession,
    fabrica_importacion: Fabrica,
    restaurante: Restaurante,
    usuario: Usuario,
    cabecera_operador: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    original = importaciones.descripcion_con_variantes
    llamadas: list[int] = []

    def falla_en_el_segundo(platillo: Any) -> str | None:
        llamadas.append(1)
        if len(llamadas) == 2:
            raise RuntimeError("se cayó a media transacción")
        return original(platillo)

    monkeypatch.setattr(importaciones, "descripcion_con_variantes", falla_en_el_segundo)
    importacion = await _lista(fabrica_importacion, restaurante, usuario)
    respuesta = await cliente.post(
        _ruta(restaurante, importacion.id, "confirmar"),
        json=_borrador_valido(),
        headers=cabecera_operador,
    )
    assert respuesta.status_code == 500
    assert await _platillos(sesion, restaurante) == []
    assert await sesion.scalar(select(func.count()).select_from(CategoriaMenu)) == 0
    await sesion.refresh(importacion)
    assert importacion.estado is EstadoImportacion.listo


@pytest.mark.ac("AC-25.4")
async def test_dos_reintentos_a_la_vez_uno_202_y_otro_409(real: dict[str, Any]) -> None:
    fabrica = real["fabrica"]
    fila = real["filas"][0]
    async with fabrica() as s:
        await s.execute(
            text("UPDATE importacion_menu SET estado = 'fallido', intentos = 1 WHERE id = :i"),
            {"i": fila.id},
        )
        await s.commit()

    async def reintentar() -> Any:
        async with fabrica() as s:
            return await importaciones.reintentar(s, real["restaurante"].id, fila.id)

    resultados = await asyncio.gather(reintentar(), reintentar(), return_exceptions=True)
    errores = [r for r in resultados if isinstance(r, ErrorCarta)]
    assert len(errores) == 1, resultados
    assert (errores[0].http, errores[0].codigo) == (409, "IMPORTACION_NO_REINTENTABLE")


@pytest.mark.ac("AC-25.3")
async def test_dos_confirmaciones_de_importaciones_distintas_no_chocan(
    real: dict[str, Any],
) -> None:
    """B1: misma categoría nueva y `orden` consecutivos con dos confirmaciones a la vez."""
    fabrica = real["fabrica"]
    restaurante = real["restaurante"]
    async with fabrica() as s:
        await s.execute(
            text(
                "UPDATE importacion_menu SET estado = 'listo', resultado = '{}'::jsonb "
                "WHERE restaurante_id = :r"
            ),
            {"r": restaurante.id},
        )
        await s.commit()
    una = ResultadoImportacion.model_validate(_borrador_valido())
    otra = ResultadoImportacion.model_validate(
        {
            "categorias": [
                {
                    "nombre": "Tacos",
                    "orden": 1,
                    "platillos": [
                        {"nombre": "Campechano", "precio": 30, "precio_confianza": "alta"}
                    ],
                },
                {
                    "nombre": "Postres",
                    "orden": 2,
                    "platillos": [{"nombre": "Flan", "precio": 50, "precio_confianza": "alta"}],
                },
            ]
        }
    )

    async def confirmar(fila: ImportacionMenu, revisado: ResultadoImportacion) -> Any:
        async with fabrica() as s:
            return await importaciones.confirmar(s, restaurante.id, fila.id, revisado)

    resultados = await asyncio.gather(
        confirmar(real["filas"][0], una), confirmar(real["filas"][1], otra), return_exceptions=True
    )
    assert all(isinstance(r, ImportacionMenu) for r in resultados), resultados
    async with fabrica() as s:
        categorias = list(
            await s.scalars(
                select(CategoriaMenu)
                .where(CategoriaMenu.restaurante_id == restaurante.id)
                .order_by(CategoriaMenu.orden)
            )
        )
        tacos = next(c for c in categorias if c.nombre == "Tacos")
        en_tacos = await s.scalar(
            select(func.count()).select_from(Platillo).where(Platillo.categoria_id == tacos.id)
        )
    assert sorted(c.nombre for c in categorias) == ["Bebidas", "Postres", "Tacos"]
    assert [c.orden for c in categorias] == [1, 2, 3]
    assert en_tacos == 3


# --- B4 · Lo que no es culpa del archivo no gasta corridas ---------------------------------


@pytest.mark.ac("AC-25.4")
@pytest.mark.parametrize(
    ("respuesta", "con_archivo", "intentos"),
    [
        (error_api(401, "authentication_error"), True, 0),
        (error_api(529, "overloaded_error"), True, 0),
        (None, False, 0),  # el almacén no tiene el archivo
        (error_api(400, "invalid_request_error"), True, 1),  # rechazo: sí cuenta
    ],
    ids=["llave", "api-caida", "sin-archivo", "rechazo"],
)
async def test_una_falla_ajena_al_archivo_no_cuenta_como_corrida(
    sesion: AsyncSession,
    fabrica_sesion: async_sessionmaker[AsyncSession],
    fabrica_importacion: Fabrica,
    almacen: AlmacenLocal,
    restaurante: Restaurante,
    usuario: Usuario,
    respuesta: Any,
    con_archivo: bool,
    intentos: int,
) -> None:
    importacion = await fabrica_importacion(restaurante, usuario)
    if con_archivo:
        await almacen.guardar_privado(importacion.archivo_url, PDF_LA_CEIBA, "application/pdf")
    pasos = [respuesta] * 3 if respuesta is not None else []
    await _procesador(fabrica_sesion, almacen, ApiFalsa(*pasos)).ciclo()
    await sesion.refresh(importacion)
    assert importacion.estado is EstadoImportacion.fallido
    assert importacion.intentos == intentos


# --- B6 · Leer del bucket privado tiene tope ----------------------------------------------


async def test_leer_privado_no_lee_mas_del_tope(almacen: AlmacenLocal) -> None:
    await almacen.guardar_privado("importaciones/x/a.pdf", b"x" * 11, "application/pdf")
    assert await almacen.leer_privado("importaciones/x/a.pdf", 11) == b"x" * 11
    with pytest.raises(ErrorAlmacen):
        await almacen.leer_privado("importaciones/x/a.pdf", 10)
