"""T-1.7: `scripts/seed.py`, la semilla de desarrollo (03_Datos_v1 §8).

Sin criterio EARS en 01_PRD §7 (es herramienta de desarrollo): ninguna prueba lleva `ac` y la
trazabilidad estricta no aplica (nota en 04 §11). Se corre `sembrar` contra la base de pruebas
con la sesión transaccional del skill /pruebas y un almacén local temporal; el rechazo fuera
de desarrollo se prueba con `main()`.
"""

from __future__ import annotations

import ast
import logging
from pathlib import Path
from uuid import UUID

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import (
    CategoriaMenu,
    Comanda,
    EstadoImportacion,
    ImportacionMenu,
    ItemOrden,
    Mesa,
    MiembroSesion,
    OperadorRestaurante,
    OrdenPersonal,
    PersonalRestaurante,
    Platillo,
    Restaurante,
    RolPersonal,
    SesionGrupal,
    TipoImagen,
    Usuario,
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
    assert resumen.con_foto == len(con_foto)
    assert resumen.platillos == len(platillos)
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
    primera = await seed.sembrar(sesion, almacen)
    usuario_id = (
        await sesion.scalars(
            select(OperadorRestaurante.usuario_id).where(
                OperadorRestaurante.restaurante_id == primera.restaurante_id
            )
        )
    ).one()
    resumen = await seed.sembrar(sesion, almacen)
    operadores = list(
        await sesion.scalars(
            select(OperadorRestaurante).where(
                OperadorRestaurante.restaurante_id == resumen.restaurante_id
            )
        )
    )
    assert len(operadores) == 1 and operadores[0].activo
    # El `usuario` se conserva: el restaurante recreado apunta al mismo y no hay otro.
    assert operadores[0].usuario_id == usuario_id
    assert (
        await sesion.scalar(
            select(func.count())
            .select_from(Usuario)
            .where(Usuario.firebase_uid == seed.FIREBASE_UID_OPERADOR)
        )
        == 1
    )
    importacion = await sesion.get(ImportacionMenu, resumen.importacion_id)
    assert importacion is not None
    assert importacion.estado is EstadoImportacion.listo
    assert importacion.confirmado_en is None  # el operador la confirma desde el panel
    assert importacion.resultado is not None
    assert [c["nombre"] for c in importacion.resultado["categorias"]] == list(seed.CATEGORIAS)
    assert almacen.ruta("privado", importacion.archivo_url).is_file()


def test_main_fuera_de_desarrollo_se_niega_sin_correr_nada(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    llamadas: list[str] = []

    async def espia() -> seed.Resumen:
        llamadas.append("correr")
        raise AssertionError("no debía correr")

    monkeypatch.setattr(seed, "_correr", espia)
    for entorno in ("staging", "produccion", "pruebas"):
        monkeypatch.setattr(settings, "ENTORNO", entorno)
        assert seed.main() == seed.CODIGO_SALIDA_ENTORNO == 2
        assert "sólo corre con ENTORNO=desarrollo" in capsys.readouterr().err
    assert llamadas == []


async def test_el_servicio_tambien_se_niega_fuera_de_desarrollo(
    sesion: AsyncSession, almacen: assets.AlmacenLocal, monkeypatch: pytest.MonkeyPatch
) -> None:
    await seed.sembrar(sesion, almacen)
    antes = await seed.conteos(sesion)
    for entorno in ("staging", "produccion"):
        monkeypatch.setattr(settings, "ENTORNO", entorno)
        with pytest.raises(seed.EntornoNoPermitido):
            await seed.sembrar(sesion, almacen)
        with pytest.raises(seed.EntornoNoPermitido):
            await seed.borrar_semilla(sesion, almacen)
    monkeypatch.setattr(settings, "ENTORNO", "desarrollo")
    assert await seed.conteos(sesion) == antes  # nada se borró


async def test_sin_archivos_no_borra_la_semilla_anterior(
    sesion: AsyncSession,
    almacen: assets.AlmacenLocal,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    await seed.sembrar(sesion, almacen)
    monkeypatch.setattr(seed, "MENUS", tmp_path)  # sin PDF ni respuesta grabada
    monkeypatch.setattr(settings, "ENTORNO", "desarrollo")  # la CI corre con otro
    with pytest.raises(seed.ArchivosFaltantes):
        await seed.sembrar(sesion, almacen)
    assert await seed.conteos(sesion) == ESPERADO  # la semilla anterior sigue ahí
    assert seed.main() == 1
    assert "Faltan archivos de la semilla" in capsys.readouterr().err


def test_main_traduce_un_error_de_integridad_y_el_exito(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setattr(settings, "ENTORNO", "desarrollo")  # la CI corre con otro

    async def choca() -> seed.Resumen:
        raise IntegrityError("DELETE", {}, Exception("fk"))

    monkeypatch.setattr(seed, "_correr", choca)
    assert seed.main() == 1
    assert "Recrea la base de desarrollo" in capsys.readouterr().err

    resumen = seed.Resumen(
        restaurante_id=UUID(int=1),
        platillos=22,
        con_foto=18,
        mesas=[(1, "https://localhost/m/x")],
        personal=3,
        importacion_id=UUID(int=2),
        firebase_uid=seed.FIREBASE_UID_OPERADOR,
    )

    async def bien() -> seed.Resumen:
        return resumen

    monkeypatch.setattr(seed, "_correr", bien)
    assert seed.main() == 0
    assert "PIN del personal" in capsys.readouterr().out


async def test_resembrar_con_datos_de_la_fase_2_no_choca(
    sesion: AsyncSession,
    almacen: assets.AlmacenLocal,
    fabrica_restaurante: Fabrica,
    fabrica_mesa: Fabrica,
) -> None:
    """`item_orden.platillo_id` es RESTRICT: sin borrar antes las sesiones, el DELETE del
    restaurante chocaría con sus propios ítems."""
    ajeno = await fabrica_restaurante()
    mesa_ajena = await fabrica_mesa(ajeno)
    sesion_ajena = SesionGrupal(mesa_id=mesa_ajena.id, restaurante_id=ajeno.id)
    sesion.add(sesion_ajena)
    await sesion.commit()

    primera = await seed.sembrar(sesion, almacen)
    mesa = (
        await sesion.scalars(select(Mesa).where(Mesa.restaurante_id == primera.restaurante_id))
    ).first()
    platillo = (
        await sesion.scalars(
            select(Platillo).where(Platillo.restaurante_id == primera.restaurante_id)
        )
    ).first()
    assert mesa is not None and platillo is not None
    grupal = SesionGrupal(mesa_id=mesa.id, restaurante_id=primera.restaurante_id)
    sesion.add(grupal)
    await sesion.flush()
    miembro = MiembroSesion(sesion_id=grupal.id)
    sesion.add(miembro)
    await sesion.flush()
    orden = OrdenPersonal(sesion_id=grupal.id, miembro_id=miembro.id)
    sesion.add(orden)
    await sesion.flush()
    sesion.add(
        ItemOrden(orden_id=orden.id, platillo_id=platillo.id, precio_unitario=10, subtotal=10)
    )
    sesion.add(Comanda(restaurante_id=primera.restaurante_id, mesa_id=mesa.id, sesion_id=grupal.id))
    await sesion.commit()

    await seed.sembrar(sesion, almacen)
    assert await seed.conteos(sesion) == ESPERADO
    assert await sesion.get(SesionGrupal, sesion_ajena.id) is not None  # la de otro, intacta
    assert await sesion.scalar(select(func.count()).select_from(ItemOrden)) == 0


def _archivos(raiz: Path) -> set[str]:
    return {str(r.relative_to(raiz)) for r in raiz.rglob("*") if r.is_file()}


async def test_segunda_corrida_no_acumula_archivos_en_el_almacen(
    sesion: AsyncSession, almacen: assets.AlmacenLocal
) -> None:
    await seed.sembrar(sesion, almacen)
    primera = _archivos(almacen.raiz)
    assert len(primera) == 18 * 3 + 1  # miniatura, detalle y original por foto, más el PDF
    await seed.sembrar(sesion, almacen)
    segunda = _archivos(almacen.raiz)
    assert len(segunda) == len(primera)
    assert primera.isdisjoint(segunda)  # las claves de la primera corrida ya no existen


async def test_el_pin_no_aparece_en_registros_ni_en_hashes(
    sesion: AsyncSession, almacen: assets.AlmacenLocal, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.DEBUG)
    await seed.sembrar(sesion, almacen)
    assert seed.PIN_DESARROLLO not in caplog.text
    hashes = await sesion.scalars(select(PersonalRestaurante.pin_hash))
    assert all(seed.PIN_DESARROLLO not in h for h in hashes)


def test_el_script_no_importa_fastapi() -> None:
    arbol = ast.parse(Path(seed.__file__).read_text("utf-8"))
    modulos = {
        (n.module or "") if isinstance(n, ast.ImportFrom) else a.name
        for n in ast.walk(arbol)
        if isinstance(n, ast.Import | ast.ImportFrom)
        for a in (n.names if isinstance(n, ast.Import) else [None])
    }
    assert not {m for m in modulos if m.split(".")[0] in {"fastapi", "starlette"}}
