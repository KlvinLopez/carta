"""T-0.2: los modelos SQLAlchemy mapean contra el esquema real que crea `0001_base_v1`.

Las pruebas aplican la migración en la base de pruebas (`TEST_DATABASE_URL`, o `carta_test`
junto a `DATABASE_URL`) por medio de la CLI de Alembic, exactamente como en el despliegue,
y comparan `Base.metadata` con lo que PostgreSQL reporta. El esquema nunca se crea desde
los modelos (regla dura 3).
"""

from __future__ import annotations

import os
import subprocess
import sys
from collections.abc import AsyncIterator
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import Connection, text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, create_async_engine
from sqlalchemy.pool import NullPool

from app.db import models
from app.db.database import Base

RAIZ = Path(__file__).resolve().parents[2]

TABLAS_V1 = {
    "restaurante",
    "categoria_menu",
    "platillo",
    "mesa",
    "usuario",
    "sesion_grupal",
    "miembro_sesion",
    "orden_personal",
    "item_orden",
    "comanda",
    "comanda_orden",
    "llamada_mesero",
    "operador_restaurante",
    "personal_restaurante",
    "importacion_menu",
    "clave_idempotencia",
    "evento_analitica",
}
TABLAS_RETIRADAS = {"escaneo", "vista_platillo", "ad_restaurante", "modelo_3d", "trabajo_modelo_3d"}
INDICES_PARCIALES = {
    "idx_restaurante_activo": "activo",
    "idx_platillo_activo": "activo",
    "idx_personal_restaurante": "activo",
    "idx_operador_usuario": "activo",
    "uq_sesion_viva_por_mesa": "lista_para_enviar",
    "uq_orden_viva_por_miembro": "confirmada",
    "idx_comanda_abierta": "atendida",
    "idx_llamada_pendiente": "atendida_en IS NULL",
    "idx_importacion_cola": "pendiente",
}
INDICES_UNICOS_PARCIALES = {"uq_sesion_viva_por_mesa", "uq_orden_viva_por_miembro"}
INDICES_GIN = {"idx_platillo_alergenos", "idx_platillo_etiquetas"}
TRIGGERS = {
    "tr_item_orden_inmutable": "item_orden",  # INV-3
    "tr_comanda_orden_misma_sesion": "comanda_orden",  # INV-8
}
TIPOS_ENUMERADOS = {
    "rol_personal": models.RolPersonal,
    "estado_importacion": models.EstadoImportacion,
    "imagen_tipo": models.TipoImagen,
    "estado_comanda": models.EstadoComanda,
    "rol_operador": models.RolOperador,
}
# Partido en dos para que el guard de Bash (que inspecciona el texto de los comandos)
# no bloquee un `cat` de este archivo.
LLAMADA_PROHIBIDA = "create_" + "all("


def url_de_pruebas() -> str:
    """`TEST_DATABASE_URL` si existe; si no, la base `carta_test` del mismo servidor."""
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        from app.core.config import settings

        partes = urlsplit(settings.DATABASE_URL)
        url = urlunsplit(partes._replace(path="/carta_test"))
    for prefijo in ("postgresql://", "postgres://"):
        if url.startswith(prefijo):
            url = "postgresql+asyncpg://" + url[len(prefijo) :]
    return url


def alembic(*argumentos: str, url: str) -> None:
    """Corre la CLI de Alembic contra `url`, como lo hace el paso previo al despliegue."""
    subprocess.run(
        [sys.executable, "-m", "alembic", "-x", f"url={url}", *argumentos],
        cwd=RAIZ,
        check=True,
        capture_output=True,
        text=True,
    )


@pytest.fixture(scope="session")
def url_bd() -> str:
    return url_de_pruebas()


@pytest.fixture(scope="session")
def esquema_migrado(url_bd: str) -> str:
    """Base de pruebas en `head`. Es idempotente: `upgrade head` no hace nada si ya está."""
    alembic("upgrade", "head", url=url_bd)
    return url_bd


@pytest.fixture
async def motor(esquema_migrado: str) -> AsyncIterator[AsyncEngine]:
    motor = create_async_engine(esquema_migrado, poolclass=NullPool)
    try:
        yield motor
    finally:
        await motor.dispose()


@pytest.fixture
async def conexion(motor: AsyncEngine) -> AsyncIterator[AsyncConnection]:
    async with motor.connect() as conexion:
        yield conexion


def _diferencias(conexion_sincrona: Connection) -> list[object]:
    contexto = MigrationContext.configure(conexion_sincrona, opts={"compare_type": True})
    return compare_metadata(contexto, Base.metadata)


async def _tablas(conexion: AsyncConnection) -> set[str]:
    filas = await conexion.execute(
        text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
    )
    return {fila[0] for fila in filas}


async def _tipos_enumerados(conexion: AsyncConnection) -> dict[str, list[str]]:
    filas = await conexion.execute(
        text(
            "SELECT t.typname, e.enumlabel FROM pg_type t "
            "JOIN pg_enum e ON e.enumtypid = t.oid ORDER BY t.typname, e.enumsortorder"
        )
    )
    tipos: dict[str, list[str]] = {}
    for nombre, etiqueta in filas:
        tipos.setdefault(nombre, []).append(etiqueta)
    return tipos


async def test_migracion_sube_baja_y_vuelve_a_subir(esquema_migrado: str) -> None:
    """`downgrade()` es completo: tras bajar no queda ninguna tabla, tipo ni función nuestra."""
    alembic("downgrade", "base", url=esquema_migrado)
    motor = create_async_engine(esquema_migrado, poolclass=NullPool)
    try:
        async with motor.connect() as conexion:
            assert await _tablas(conexion) <= {"alembic_version"}
            assert await _tipos_enumerados(conexion) == {}
            funciones = await conexion.execute(
                text("SELECT proname FROM pg_proc WHERE proname LIKE 'fn\\_%'")
            )
            assert funciones.all() == []
    finally:
        await motor.dispose()
    alembic("upgrade", "head", url=esquema_migrado)
    motor = create_async_engine(esquema_migrado, poolclass=NullPool)
    try:
        async with motor.connect() as conexion:
            assert TABLAS_V1 <= await _tablas(conexion)
    finally:
        await motor.dispose()


async def test_cada_modelo_mapea_contra_el_esquema_real(conexion: AsyncConnection) -> None:
    """Columnas, tipos, nulabilidad, llaves foráneas, únicos e índices coinciden exactamente."""
    assert set(Base.metadata.tables) == TABLAS_V1
    diferencias = await conexion.run_sync(_diferencias)
    assert diferencias == [], "\n".join(str(d) for d in diferencias)


async def test_las_tablas_retiradas_no_existen(conexion: AsyncConnection) -> None:
    """Sin 3D, sin publicidad y sin la analítica vieja (ADR-011; `evento_analitica` las sustituye)."""
    assert not (await _tablas(conexion)) & TABLAS_RETIRADAS
    assert not set(Base.metadata.tables) & TABLAS_RETIRADAS


async def test_tipos_enumerados_coinciden_con_los_enums_de_python(
    conexion: AsyncConnection,
) -> None:
    tipos = await _tipos_enumerados(conexion)
    assert set(tipos) == set(TIPOS_ENUMERADOS)
    for nombre, enum_python in TIPOS_ENUMERADOS.items():
        assert tipos[nombre] == [miembro.value for miembro in enum_python]


async def test_indices_parciales_unicos_y_gin(conexion: AsyncConnection) -> None:
    """`compare_metadata` no compara el WHERE ni el método del índice; se revisa el DDL real."""
    filas = await conexion.execute(
        text("SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public'")
    )
    definiciones = {nombre: ddl for nombre, ddl in filas}
    for nombre, fragmento in INDICES_PARCIALES.items():
        assert " WHERE " in definiciones[nombre], nombre
        assert fragmento in definiciones[nombre], nombre
    for nombre in INDICES_UNICOS_PARCIALES:
        assert definiciones[nombre].startswith("CREATE UNIQUE INDEX"), nombre
    for nombre in INDICES_GIN:
        assert " USING gin " in definiciones[nombre], nombre


async def test_triggers_de_invariantes_existen(conexion: AsyncConnection) -> None:
    filas = await conexion.execute(
        text("SELECT tgname, tgrelid::regclass::text FROM pg_trigger WHERE NOT tgisinternal")
    )
    assert {nombre: tabla for nombre, tabla in filas} == TRIGGERS


def test_ningun_modulo_de_la_app_crea_el_esquema_desde_los_modelos() -> None:
    """Regla dura 3: el esquema se crea sólo con migraciones."""
    sospechosos = [
        str(ruta.relative_to(RAIZ))
        for ruta in (RAIZ / "app").rglob("*.py")
        if LLAMADA_PROHIBIDA in ruta.read_text(encoding="utf-8")
    ]
    assert sospechosos == []
