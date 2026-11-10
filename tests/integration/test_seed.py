"""T-1.7: `scripts/seed.py`, la semilla de desarrollo (03_Datos_v1 §8).

Sin criterio EARS en 01_PRD §7 (es herramienta de desarrollo): ninguna prueba lleva `ac` y la
trazabilidad estricta no aplica (nota en 04 §11). Se corre `sembrar` contra la base de pruebas
con la sesión transaccional del skill /pruebas y un almacén local temporal; el rechazo fuera
de desarrollo se prueba con `main()`.
"""

from __future__ import annotations

import ast
from pathlib import Path

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import (
    CategoriaMenu,
    EstadoImportacion,
    ImportacionMenu,
    Mesa,
    OperadorRestaurante,
    PersonalRestaurante,
    Platillo,
    Restaurante,
    RolPersonal,
    TipoImagen,
)
from app.services import assets, personal
from scripts import seed
from tests.conftest import Fabrica

ESPERADO = {"platillo": 22, "mesa": 8, "personal_restaurante": 3, "importacion_menu": 1}


async def _restaurante_semilla(sesion: AsyncSession) -> Restaurante:
    return (await sesion.scalars(select(Restaurante).where(Restaurante.slug == seed.SLUG))).one()


async def test_dos_corridas_dejan_los_mismos_conteos(
    sesion: AsyncSession, almacen: assets.AlmacenLocal
) -> None:
    primera = await seed.sembrar(sesion, almacen)
    antes = await seed.conteos(sesion)
    segunda = await seed.sembrar(sesion, almacen)
    despues = await seed.conteos(sesion)

    assert antes == despues == ESPERADO
    assert primera.restaurante_id != segunda.restaurante_id  # se recreó
    total = await sesion.scalar(
        select(func.count()).select_from(Restaurante).where(Restaurante.slug == seed.SLUG)
    )
    assert total == 1
    categorias = await sesion.scalar(
        select(func.count())
        .select_from(CategoriaMenu)
        .where(CategoriaMenu.restaurante_id == segunda.restaurante_id)
    )
    assert categorias == 4
    assert len(segunda.mesas) == 8
    codigos = set(
        await sesion.scalars(
            select(Mesa.codigo_publico).where(Mesa.restaurante_id == segunda.restaurante_id)
        )
    )
    assert {url.rsplit("/m/", 1)[1] for _, url in segunda.mesas} == codigos


async def test_no_toca_otros_restaurantes(
    sesion: AsyncSession, almacen: assets.AlmacenLocal, fabrica_restaurante: Fabrica
) -> None:
    ajeno = await fabrica_restaurante(nombre="Ajeno", slug="ajeno-no-borrar")
    await seed.sembrar(sesion, almacen)
    await seed.sembrar(sesion, almacen)
    assert await sesion.get(Restaurante, ajeno.id) is not None


async def test_fotos_con_variantes_e_ilustracion_en_el_resto(
    sesion: AsyncSession, almacen: assets.AlmacenLocal
) -> None:
    resumen = await seed.sembrar(sesion, almacen)
    platillos = list(
        await sesion.scalars(
            select(Platillo).where(Platillo.restaurante_id == resumen.restaurante_id)
        )
    )
    con_foto = [p for p in platillos if p.imagen_tipo is TipoImagen.foto]
    sin_foto = [p for p in platillos if p.imagen_tipo is not TipoImagen.foto]
    assert (len(con_foto), len(sin_foto)) == (18, 4)
    assert resumen.con_foto == 18
    # Las 4 sin foto usan la ilustración de su categoría (nunca una URL de foto).
    assert all(p.ilustracion_clave and p.foto_detalle_url is None for p in sin_foto)
    # Cada foto tiene su miniatura y su detalle WebP en el almacén y el original en el privado.
    publico = Path(almacen.raiz) / "publico" / "platillos" / str(resumen.restaurante_id)
    assert len(list(publico.glob("*.webp"))) == 18 * 2
    for p in con_foto:
        assert p.foto_thumb_url and p.foto_detalle_url
        assert almacen.ruta("privado", p.foto_original_url or "").is_file()
    # Un platillo agotado y precios que vienen de la base como Decimal.
    assert sum(1 for p in platillos if not p.disponible) == 1
    assert all(p.precio > 0 for p in platillos)


async def test_pin_solo_como_hash_argon2id(
    sesion: AsyncSession, almacen: assets.AlmacenLocal
) -> None:
    resumen = await seed.sembrar(sesion, almacen)
    filas = list(
        await sesion.scalars(
            select(PersonalRestaurante).where(
                PersonalRestaurante.restaurante_id == resumen.restaurante_id
            )
        )
    )
    assert sorted(f.rol.value for f in filas) == ["capitan", "mesero", "mesero"]
    assert RolPersonal.capitan in {f.rol for f in filas}
    for fila in filas:
        assert fila.pin_hash.startswith("$argon2id$")
        assert seed.PIN_DESARROLLO not in fila.pin_hash
        assert await personal.verificar_pin(fila.pin_hash, seed.PIN_DESARROLLO)
        assert not await personal.verificar_pin(fila.pin_hash, "0000")


async def test_operador_importacion_y_usuario_reutilizado(
    sesion: AsyncSession, almacen: assets.AlmacenLocal
) -> None:
    await seed.sembrar(sesion, almacen)
    resumen = await seed.sembrar(sesion, almacen)
    operadores = list(
        await sesion.scalars(
            select(OperadorRestaurante).where(
                OperadorRestaurante.restaurante_id == resumen.restaurante_id
            )
        )
    )
    assert len(operadores) == 1 and operadores[0].activo
    importacion = await sesion.get(ImportacionMenu, resumen.importacion_id)
    assert importacion is not None
    assert importacion.estado is EstadoImportacion.listo
    assert importacion.confirmado_en is None  # el operador la confirma desde el panel
    assert importacion.resultado is not None
    assert [c["nombre"] for c in importacion.resultado["categorias"]] == list(seed.CATEGORIAS)
    assert almacen.ruta("privado", importacion.archivo_url).is_file()


def test_fuera_de_desarrollo_se_niega_sin_tocar_nada(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    for entorno in ("staging", "produccion", "pruebas"):
        monkeypatch.setattr(settings, "ENTORNO", entorno)
        assert seed.main() == seed.CODIGO_SALIDA_ENTORNO == 2
        assert "sólo corre con ENTORNO=desarrollo" in capsys.readouterr().err


def test_el_script_no_importa_fastapi() -> None:
    arbol = ast.parse(Path(seed.__file__).read_text("utf-8"))
    modulos = {
        (n.module or "") if isinstance(n, ast.ImportFrom) else a.name
        for n in ast.walk(arbol)
        if isinstance(n, ast.Import | ast.ImportFrom)
        for a in (n.names if isinstance(n, ast.Import) else [None])
    }
    assert not {m for m in modulos if m.split(".")[0] in {"fastapi", "starlette"}}
