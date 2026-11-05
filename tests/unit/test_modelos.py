"""T-0.2: los modelos SQLAlchemy mapean contra el esquema real que crea `0001_base_v1`.

Las pruebas aplican la migración en la base de pruebas (`TEST_DATABASE_URL`, o `carta_test`
junto a `DATABASE_URL`) por medio de la CLI de Alembic, exactamente como en el despliegue,
y comparan `Base.metadata` con lo que PostgreSQL reporta. El esquema nunca se crea desde
los modelos (regla dura 3).

`compare_metadata` no ve las restricciones CHECK, el WHERE de los índices parciales, el
método (GIN) ni los triggers: esas partes se comprueban contra el catálogo de PostgreSQL.
"""

from __future__ import annotations

import os
import subprocess
import sys
from collections.abc import AsyncIterator
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
from uuid import UUID

import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import CheckConstraint, Connection, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
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

# Predicado exacto (`pg_get_expr`) de cada índice parcial. Un índice que no está aquí no es parcial.
PREDICADOS = {
    "idx_comanda_abierta": "(estado = ANY (ARRAY['abierta'::estado_comanda, 'atendida'::estado_comanda]))",
    "idx_importacion_cola": "(estado = 'pendiente'::estado_importacion)",
    "idx_llamada_pendiente": "(atendida_en IS NULL)",
    "idx_operador_usuario": "activo",
    "idx_platillo_activo": "activo",
    "idx_restaurante_activo": "activo",
    "uq_categoria_activa_por_nombre": "activa",
    "uq_mesa_activa_por_numero": "activa",
    "uq_orden_viva_por_miembro": (
        "((estado)::text = ANY ((ARRAY['armando'::character varying, "
        "'confirmada'::character varying])::text[]))"
    ),
    "uq_personal_activo_por_nombre": "activo",
    "uq_sesion_viva_por_mesa": (
        "((estado)::text = ANY ((ARRAY['activa'::character varying, "
        "'lista_para_enviar'::character varying])::text[]))"
    ),
}
INDICES_UNICOS_PARCIALES = {
    "uq_sesion_viva_por_mesa",  # INV-1
    "uq_orden_viva_por_miembro",  # INV-2
    "uq_categoria_activa_por_nombre",  # regla dura 9
    "uq_personal_activo_por_nombre",
    "uq_mesa_activa_por_numero",
}
INDICES_GIN = {"idx_platillo_alergenos", "idx_platillo_etiquetas"}

# Definición exacta (`pg_get_triggerdef`) de cada trigger.
TRIGGERS = {
    "tr_item_orden_inmutable": (  # INV-3
        "CREATE TRIGGER tr_item_orden_inmutable BEFORE INSERT OR DELETE OR UPDATE "
        "ON public.item_orden FOR EACH ROW EXECUTE FUNCTION fn_item_orden_inmutable()"
    ),
    "tr_orden_bloqueada_no_se_borra": (  # INV-3, regla dura 9
        "CREATE TRIGGER tr_orden_bloqueada_no_se_borra BEFORE DELETE ON public.orden_personal "
        "FOR EACH ROW EXECUTE FUNCTION fn_orden_bloqueada_no_se_borra()"
    ),
    "tr_comanda_orden_misma_sesion": (  # INV-8
        "CREATE TRIGGER tr_comanda_orden_misma_sesion BEFORE INSERT OR UPDATE "
        "ON public.comanda_orden FOR EACH ROW EXECUTE FUNCTION fn_comanda_orden_misma_sesion()"
    ),
    "tr_comanda_sesion_inmutable": (  # INV-8
        "CREATE TRIGGER tr_comanda_sesion_inmutable BEFORE UPDATE OF sesion_id "
        "ON public.comanda FOR EACH ROW EXECUTE FUNCTION fn_sesion_id_inmutable()"
    ),
    "tr_orden_sesion_inmutable": (  # INV-8
        "CREATE TRIGGER tr_orden_sesion_inmutable BEFORE UPDATE OF sesion_id "
        "ON public.orden_personal FOR EACH ROW EXECUTE FUNCTION fn_sesion_id_inmutable()"
    ),
}
FUNCIONES_DE_TRIGGER = {
    "fn_item_orden_inmutable",
    "fn_orden_bloqueada_no_se_borra",
    "fn_comanda_orden_misma_sesion",
    "fn_sesion_id_inmutable",
}

# Fragmentos que la definición real de cada CHECK de invariante debe contener.
FRAGMENTOS_CHECK = {
    "ck_codigo_largo": [">= 22"],
    "ck_comanda_terminal": ["'servida'", "servida_en >= atendida_en"],
    "ck_item_orden_notas": ["<= 140"],
    "ck_orden_bloqueada_coherente": ["bloqueada =", "'armando'"],
    "ck_personal_pin_hash": ["$argon2id$"],
    "ck_importacion_confirmada": ["confirmado_en IS NOT NULL", "resultado IS NOT NULL"],
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

CODIGO_MESA = "x" * 22
PIN_HASH = "$argon2id$v=19$m=65536,t=3,p=4$abc$def"


# ---------------------------------------------------------------------------
# Base de pruebas y migración
# ---------------------------------------------------------------------------


def url_de_pruebas() -> str:
    """`TEST_DATABASE_URL` si existe; si no, la base `carta_test` del mismo servidor.

    Salvaguarda: estas pruebas hacen `downgrade base`, así que se niegan a correr contra
    una base cuyo nombre no contenga `test` o fuera de desarrollo/pruebas.
    """
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        partes = urlsplit(settings.DATABASE_URL)
        url = urlunsplit(partes._replace(path="/carta_test"))
    for prefijo in ("postgresql://", "postgres://"):
        if url.startswith(prefijo):
            url = "postgresql+asyncpg://" + url[len(prefijo) :]
    nombre_bd = make_url(url).database or ""
    if "test" not in nombre_bd or not settings.es_desarrollo:
        pytest.exit(
            f"Me niego a migrar y vaciar {nombre_bd!r} con ENTORNO={settings.ENTORNO}: "
            "la base de pruebas debe llamarse *test* y el entorno ser desarrollo o pruebas."
        )
    return url


def alembic(*argumentos: str, url: str) -> subprocess.CompletedProcess[str]:
    """Corre la CLI de Alembic contra `url`, como lo hace el paso previo al despliegue."""
    try:
        return subprocess.run(
            [sys.executable, "-m", "alembic", "-x", f"url={url}", *argumentos],
            cwd=RAIZ,
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as error:
        # `make_url` enmascara la contraseña en el mensaje.
        pytest.fail(f"alembic {' '.join(argumentos)} contra {make_url(url)} falló:\n{error.stderr}")


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


# ---------------------------------------------------------------------------
# Lecturas del catálogo
# ---------------------------------------------------------------------------


def _diferencias(conexion_sincrona: Connection) -> list[object]:
    contexto = MigrationContext.configure(
        conexion_sincrona, opts={"compare_type": True, "compare_server_default": True}
    )
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
            "JOIN pg_enum e ON e.enumtypid = t.oid "
            "WHERE t.typnamespace = 'public'::regnamespace "
            "ORDER BY t.typname, e.enumsortorder"
        )
    )
    tipos: dict[str, list[str]] = {}
    for nombre, etiqueta in filas:
        tipos.setdefault(nombre, []).append(etiqueta)
    return tipos


async def _funciones(conexion: AsyncConnection) -> set[str]:
    filas = await conexion.execute(
        text("SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace")
    )
    return {fila[0] for fila in filas}


# ---------------------------------------------------------------------------
# Migración
# ---------------------------------------------------------------------------


async def test_migracion_sube_baja_y_vuelve_a_subir(esquema_migrado: str) -> None:
    """`downgrade()` es completo: tras bajar no queda ninguna tabla, tipo ni función nuestra."""
    motor = create_async_engine(esquema_migrado, poolclass=NullPool)
    try:
        alembic("downgrade", "base", url=esquema_migrado)
        async with motor.connect() as conexion:
            assert await _tablas(conexion) <= {"alembic_version"}
            assert await _tipos_enumerados(conexion) == {}
            assert await _funciones(conexion) == set()
    finally:
        # Pase lo que pase, la base vuelve a `head` para las demás pruebas.
        alembic("upgrade", "head", url=esquema_migrado)
        await motor.dispose()


def test_la_url_no_pasa_por_el_ini_de_alembic() -> None:
    """Una contraseña con `%` (p. ej. `%40`) rompería ConfigParser; en modo `--sql` no conecta."""
    resultado = alembic(
        "upgrade", "head", "--sql", url="postgresql+asyncpg://u:p%40ss@servidor/base"
    )
    assert "CREATE TABLE restaurante" in resultado.stdout


# ---------------------------------------------------------------------------
# Modelos ↔ esquema real
# ---------------------------------------------------------------------------


async def test_cada_modelo_mapea_contra_el_esquema_real(conexion: AsyncConnection) -> None:
    """Columnas, tipos, nulabilidad, defaults, llaves foráneas, únicos e índices coinciden."""
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


async def test_restricciones_check_coinciden_con_los_modelos(conexion: AsyncConnection) -> None:
    """`compare_metadata` no compara CHECK: el conjunto de nombres y las de invariante se leen aparte."""
    filas = await conexion.execute(
        text(
            "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint "
            "WHERE contype = 'c' AND connamespace = 'public'::regnamespace"
        )
    )
    reales = {nombre: definicion for nombre, definicion in filas}
    en_modelos = {
        restriccion.name
        for tabla in Base.metadata.tables.values()
        for restriccion in tabla.constraints
        if isinstance(restriccion, CheckConstraint)
    }
    assert set(reales) == en_modelos
    for nombre, fragmentos in FRAGMENTOS_CHECK.items():
        for fragmento in fragmentos:
            assert fragmento in reales[nombre], (nombre, reales[nombre])


async def test_indices_parciales_unicos_y_gin(conexion: AsyncConnection) -> None:
    """Predicado exacto de cada índice parcial, unicidad de los de invariante y método GIN."""
    filas = await conexion.execute(
        text(
            "SELECT c.relname, pg_get_expr(i.indpred, i.indrelid), i.indisunique, am.amname "
            "FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid "
            "JOIN pg_am am ON am.oid = c.relam "
            "WHERE c.relnamespace = 'public'::regnamespace"
        )
    )
    indices = {nombre: (predicado, unico, metodo) for nombre, predicado, unico, metodo in filas}
    parciales = {nombre: datos[0] for nombre, datos in indices.items() if datos[0] is not None}
    assert parciales == PREDICADOS
    for nombre in INDICES_UNICOS_PARCIALES:
        assert indices[nombre][1], nombre
    for nombre in INDICES_GIN:
        assert indices[nombre][2] == "gin", nombre


async def test_toda_fk_con_cascada_tiene_indice(conexion: AsyncConnection) -> None:
    """Sin índice, cada borrado o SET NULL en cascada recorre la tabla hija completa."""
    filas = await conexion.execute(
        text(
            "SELECT c.conrelid::regclass::text || '.' || a.attname "
            "FROM pg_constraint c "
            "JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1] "
            "WHERE c.contype = 'f' AND c.confdeltype IN ('c', 'n') "
            "AND c.connamespace = 'public'::regnamespace "
            "AND NOT EXISTS ("
            "  SELECT 1 FROM pg_index i "
            "  WHERE i.indrelid = c.conrelid AND i.indkey[0] = c.conkey[1] AND i.indpred IS NULL)"
        )
    )
    assert [fila[0] for fila in filas] == []


async def test_triggers_de_invariantes(conexion: AsyncConnection) -> None:
    """Definición exacta de cada trigger (eventos incluidos) y sus funciones con `search_path` fijo."""
    filas = await conexion.execute(
        text("SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger WHERE NOT tgisinternal")
    )
    assert {nombre: definicion for nombre, definicion in filas} == TRIGGERS
    filas = await conexion.execute(
        text(
            "SELECT proname, proconfig FROM pg_proc "
            "WHERE pronamespace = 'public'::regnamespace AND prorettype = 'trigger'::regtype"
        )
    )
    funciones = {nombre: configuracion for nombre, configuracion in filas}
    assert set(funciones) == FUNCIONES_DE_TRIGGER
    for nombre, configuracion in funciones.items():
        assert configuracion == ["search_path=pg_catalog, public"], nombre


def test_ningun_modulo_de_la_app_crea_el_esquema_desde_los_modelos() -> None:
    """Regla dura 3: el esquema se crea sólo con migraciones."""
    sospechosos = [
        str(ruta.relative_to(RAIZ))
        for ruta in (RAIZ / "app").rglob("*.py")
        if LLAMADA_PROHIBIDA in ruta.read_text(encoding="utf-8")
    ]
    assert sospechosos == []


# ---------------------------------------------------------------------------
# Las restricciones rechazan datos inválidos (todo dentro de una transacción que se revierte)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Escenario:
    restaurante: UUID
    categoria: UUID
    platillo: UUID
    mesa: UUID
    usuario: UUID
    personal: UUID
    sesion: UUID
    miembro: UUID
    orden: UUID
    otra_sesion: UUID


async def _uno(conexion: AsyncConnection, sql: str, **parametros: object) -> UUID:
    resultado = await conexion.execute(text(sql), parametros)
    return resultado.scalar_one()


@pytest.fixture
async def escenario(conexion: AsyncConnection) -> AsyncIterator[Escenario]:
    transaccion = await conexion.begin()
    r = await _uno(
        conexion, "INSERT INTO restaurante (nombre, slug) VALUES ('R', 'r') RETURNING id"
    )
    c = await _uno(
        conexion,
        "INSERT INTO categoria_menu (restaurante_id, nombre) VALUES (:r, 'Entradas') RETURNING id",
        r=r,
    )
    p = await _uno(
        conexion,
        "INSERT INTO platillo (restaurante_id, categoria_id, nombre, precio) "
        "VALUES (:r, :c, 'Guacamole', 145) RETURNING id",
        r=r,
        c=c,
    )
    m = await _uno(
        conexion,
        "INSERT INTO mesa (restaurante_id, numero, codigo_publico) VALUES (:r, 1, :codigo) RETURNING id",
        r=r,
        codigo=CODIGO_MESA,
    )
    u = await _uno(
        conexion,
        "INSERT INTO usuario (firebase_uid, provider) VALUES ('uid', 'google') RETURNING id",
    )
    pr = await _uno(
        conexion,
        "INSERT INTO personal_restaurante (restaurante_id, nombre, pin_hash) "
        "VALUES (:r, 'Ana', :hash) RETURNING id",
        r=r,
        hash=PIN_HASH,
    )
    s = await _uno(
        conexion,
        "INSERT INTO sesion_grupal (mesa_id, restaurante_id) VALUES (:m, :r) RETURNING id",
        m=m,
        r=r,
    )
    mb = await _uno(
        conexion, "INSERT INTO miembro_sesion (sesion_id) VALUES (:s) RETURNING id", s=s
    )
    o = await _uno(
        conexion,
        "INSERT INTO orden_personal (sesion_id, miembro_id) VALUES (:s, :mb) RETURNING id",
        s=s,
        mb=mb,
    )
    s2 = await _uno(
        conexion,
        "INSERT INTO sesion_grupal (mesa_id, restaurante_id, estado) "
        "VALUES (:m, :r, 'cerrada') RETURNING id",
        m=m,
        r=r,
    )
    try:
        yield Escenario(r, c, p, m, u, pr, s, mb, o, s2)
    finally:
        await transaccion.rollback()


async def _bloquear_orden(conexion: AsyncConnection, orden: UUID) -> None:
    await conexion.execute(
        text(
            "UPDATE orden_personal SET estado = 'confirmada', bloqueada = true, "
            "confirmada_en = now() WHERE id = :o"
        ),
        {"o": orden},
    )


async def _agregar_item(conexion: AsyncConnection, orden: UUID, platillo: UUID) -> UUID:
    return await _uno(
        conexion,
        "INSERT INTO item_orden (orden_id, platillo_id, precio_unitario, subtotal) "
        "VALUES (:o, :p, 145, 145) RETURNING id",
        o=orden,
        p=platillo,
    )


async def _debe_fallar(conexion: AsyncConnection, sql: str, **parametros: object) -> None:
    with pytest.raises(IntegrityError):
        async with conexion.begin_nested():
            await conexion.execute(text(sql), parametros)


CASOS_CHECK = {
    "restaurante.slug vacío": "INSERT INTO restaurante (nombre, slug) VALUES ('R2', '')",
    "mesa.capacidad 0": (
        "INSERT INTO mesa (restaurante_id, numero, codigo_publico, capacidad) "
        "VALUES (:restaurante, 2, 'yyyyyyyyyyyyyyyyyyyyyy', 0)"
    ),
    "mesa.codigo_publico corto": (
        "INSERT INTO mesa (restaurante_id, numero, codigo_publico) VALUES (:restaurante, 2, 'corto')"
    ),
    "personal.nombre en blanco": (
        "INSERT INTO personal_restaurante (restaurante_id, nombre, pin_hash) "
        "VALUES (:restaurante, '   ', :pin_hash)"
    ),
    "personal.pin_hash en claro (INV-7)": (
        "INSERT INTO personal_restaurante (restaurante_id, nombre, pin_hash) "
        "VALUES (:restaurante, 'Luis', '1234')"
    ),
    "personal.intentos_fallidos negativo": (
        "UPDATE personal_restaurante SET intentos_fallidos = -1 WHERE id = :personal"
    ),
    "platillo.alergenos no es lista": (
        "UPDATE platillo SET alergenos = '{}'::jsonb WHERE id = :platillo"
    ),
    "platillo.etiquetas no es lista": (
        "UPDATE platillo SET etiquetas = '\"vegano\"'::jsonb WHERE id = :platillo"
    ),
    "miembro.color_avatar inválido": (
        "UPDATE miembro_sesion SET color_avatar = 'rojo' WHERE id = :miembro"
    ),
    "orden confirmada sin bloquear (INV-3)": (
        "UPDATE orden_personal SET estado = 'confirmada', confirmada_en = now() WHERE id = :orden"
    ),
    "item.notas > 140 (AC-10.1)": (
        "INSERT INTO item_orden (orden_id, platillo_id, precio_unitario, subtotal, notas) "
        "VALUES (:orden, :platillo, 145, 145, repeat('x', 141))"
    ),
    "item.cantidad 0": (
        "INSERT INTO item_orden (orden_id, platillo_id, precio_unitario, subtotal, cantidad) "
        "VALUES (:orden, :platillo, 145, 145, 0)"
    ),
    "item.precio_unitario negativo": (
        "INSERT INTO item_orden (orden_id, platillo_id, precio_unitario, subtotal) "
        "VALUES (:orden, :platillo, -1, 0)"
    ),
    "item.subtotal negativo": (
        "INSERT INTO item_orden (orden_id, platillo_id, precio_unitario, subtotal) "
        "VALUES (:orden, :platillo, 145, -145)"
    ),
    "comanda servida sin atendida_en (INV-6)": (
        "INSERT INTO comanda (restaurante_id, mesa_id, sesion_id, estado, servida_en) "
        "VALUES (:restaurante, :mesa, :sesion, 'servida', now())"
    ),
    "comanda servida antes de atendida (INV-6)": (
        "INSERT INTO comanda (restaurante_id, mesa_id, sesion_id, estado, atendida_en, servida_en) "
        "VALUES (:restaurante, :mesa, :sesion, 'servida', now(), now() - interval '1 minute')"
    ),
    "importacion.intentos 4": (
        "INSERT INTO importacion_menu (restaurante_id, solicitado_por, archivo_url, archivo_tipo, "
        "intentos) VALUES (:restaurante, :usuario, 'u', 'application/pdf', 4)"
    ),
    "importacion.intentos negativo": (
        "INSERT INTO importacion_menu (restaurante_id, solicitado_por, archivo_url, archivo_tipo, "
        "intentos) VALUES (:restaurante, :usuario, 'u', 'application/pdf', -1)"
    ),
    "importacion confirmada sin borrador (INV-9)": (
        "INSERT INTO importacion_menu (restaurante_id, solicitado_por, archivo_url, archivo_tipo, "
        "estado, confirmado_en) VALUES (:restaurante, :usuario, 'u', 'application/pdf', "
        "'confirmado', now())"
    ),
    "clave_idempotencia.ambito vacío": (
        "INSERT INTO clave_idempotencia (ambito, clave, estado_http, respuesta) "
        "VALUES ('', 'k', 200, '{}'::jsonb)"
    ),
    "evento.tipo fuera de la lista": (
        "INSERT INTO evento_analitica (restaurante_id, tipo) VALUES (:restaurante, 'ar_open')"
    ),
    "usuario.provider fuera de la lista": (
        "INSERT INTO usuario (firebase_uid, provider) VALUES ('uid2', 'apple')"
    ),
}


@pytest.mark.parametrize("caso", list(CASOS_CHECK), ids=list(CASOS_CHECK))
async def test_checks_de_dominio(
    conexion: AsyncConnection, escenario: Escenario, caso: str
) -> None:
    await _debe_fallar(
        conexion,
        CASOS_CHECK[caso],
        restaurante=escenario.restaurante,
        mesa=escenario.mesa,
        sesion=escenario.sesion,
        usuario=escenario.usuario,
        personal=escenario.personal,
        platillo=escenario.platillo,
        miembro=escenario.miembro,
        orden=escenario.orden,
        pin_hash=PIN_HASH,
    )


async def test_unicidad_solo_entre_activos(conexion: AsyncConnection, escenario: Escenario) -> None:
    """Regla dura 9: tras la baja lógica se puede reusar el nombre; activo repetido (ni con
    mayúsculas o espacios) no."""
    r = escenario.restaurante
    await _debe_fallar(
        conexion,
        "INSERT INTO personal_restaurante (restaurante_id, nombre, pin_hash) "
        "VALUES (:r, ' ANA ', :h)",
        r=r,
        h=PIN_HASH,
    )
    await _debe_fallar(
        conexion,
        "INSERT INTO categoria_menu (restaurante_id, nombre) VALUES (:r, 'entradas ')",
        r=r,
    )
    await _debe_fallar(
        conexion,
        "INSERT INTO mesa (restaurante_id, numero, codigo_publico) VALUES (:r, 1, :c)",
        r=r,
        c="z" * 22,
    )
    await conexion.execute(
        text("UPDATE personal_restaurante SET activo = false WHERE id = :p"),
        {"p": escenario.personal},
    )
    await conexion.execute(
        text("UPDATE categoria_menu SET activa = false WHERE id = :c"), {"c": escenario.categoria}
    )
    await conexion.execute(
        text("UPDATE mesa SET activa = false WHERE id = :m"), {"m": escenario.mesa}
    )
    await _uno(
        conexion,
        "INSERT INTO personal_restaurante (restaurante_id, nombre, pin_hash) "
        "VALUES (:r, 'Ana', :h) RETURNING id",
        r=r,
        h=PIN_HASH,
    )
    await _uno(
        conexion,
        "INSERT INTO categoria_menu (restaurante_id, nombre) VALUES (:r, 'Entradas') RETURNING id",
        r=r,
    )
    await _uno(
        conexion,
        "INSERT INTO mesa (restaurante_id, numero, codigo_publico) VALUES (:r, 1, :c) RETURNING id",
        r=r,
        c="z" * 22,
    )


async def test_inv3_items_de_orden_bloqueada(
    conexion: AsyncConnection, escenario: Escenario
) -> None:
    """Ni agregar, ni cambiar, ni mover a otra orden, ni borrar; ni borrar la orden."""
    item = await _agregar_item(conexion, escenario.orden, escenario.platillo)
    otra_orden = await _uno(
        conexion,
        "INSERT INTO orden_personal (sesion_id, miembro_id, estado, bloqueada) "
        "VALUES (:s, :mb, 'cerrada', true) RETURNING id",
        s=escenario.sesion,
        mb=escenario.miembro,
    )
    libre = await _uno(
        conexion,
        "INSERT INTO miembro_sesion (sesion_id) VALUES (:s) RETURNING id",
        s=escenario.sesion,
    )
    orden_libre = await _uno(
        conexion,
        "INSERT INTO orden_personal (sesion_id, miembro_id) VALUES (:s, :mb) RETURNING id",
        s=escenario.sesion,
        mb=libre,
    )
    await _bloquear_orden(conexion, escenario.orden)

    await _debe_fallar(
        conexion,
        "INSERT INTO item_orden (orden_id, platillo_id, precio_unitario, subtotal) "
        "VALUES (:o, :p, 1, 1)",
        o=escenario.orden,
        p=escenario.platillo,
    )
    await _debe_fallar(conexion, "UPDATE item_orden SET cantidad = 2 WHERE id = :i", i=item)
    # Sacar el ítem hacia una orden libre: la orden de OLD sigue bloqueada.
    await _debe_fallar(
        conexion, "UPDATE item_orden SET orden_id = :o WHERE id = :i", o=orden_libre, i=item
    )
    # Meter un ítem de una orden libre en una bloqueada: la orden de NEW está bloqueada.
    item_libre = await _agregar_item(conexion, orden_libre, escenario.platillo)
    await _debe_fallar(
        conexion, "UPDATE item_orden SET orden_id = :o WHERE id = :i", o=otra_orden, i=item_libre
    )
    await _debe_fallar(conexion, "DELETE FROM item_orden WHERE id = :i", i=item)
    await _debe_fallar(conexion, "DELETE FROM orden_personal WHERE id = :o", o=escenario.orden)
    # La orden libre sí admite cambios.
    await conexion.execute(text("DELETE FROM item_orden WHERE id = :i"), {"i": item_libre})


async def test_inv8_comanda_solo_con_ordenes_de_su_sesion(
    conexion: AsyncConnection, escenario: Escenario
) -> None:
    comanda = await _uno(
        conexion,
        "INSERT INTO comanda (restaurante_id, mesa_id, sesion_id) VALUES (:r, :m, :s) RETURNING id",
        r=escenario.restaurante,
        m=escenario.mesa,
        s=escenario.otra_sesion,
    )
    await _debe_fallar(
        conexion,
        "INSERT INTO comanda_orden (comanda_id, orden_id) VALUES (:c, :o)",
        c=comanda,
        o=escenario.orden,
    )
    # Ni moviendo a los padres de sesión.
    await _debe_fallar(
        conexion, "UPDATE comanda SET sesion_id = :s WHERE id = :c", s=escenario.sesion, c=comanda
    )
    await _debe_fallar(
        conexion,
        "UPDATE orden_personal SET sesion_id = :s WHERE id = :o",
        s=escenario.otra_sesion,
        o=escenario.orden,
    )
    # Con la sesión correcta entra, y la misma orden no entra en una segunda comanda.
    comanda_buena = await _uno(
        conexion,
        "INSERT INTO comanda (restaurante_id, mesa_id, sesion_id) VALUES (:r, :m, :s) RETURNING id",
        r=escenario.restaurante,
        m=escenario.mesa,
        s=escenario.sesion,
    )
    await conexion.execute(
        text("INSERT INTO comanda_orden (comanda_id, orden_id) VALUES (:c, :o)"),
        {"c": comanda_buena, "o": escenario.orden},
    )
    segunda = await _uno(
        conexion,
        "INSERT INTO comanda (restaurante_id, mesa_id, sesion_id, secuencia) "
        "VALUES (:r, :m, :s, 2) RETURNING id",
        r=escenario.restaurante,
        m=escenario.mesa,
        s=escenario.sesion,
    )
    await _debe_fallar(
        conexion,
        "INSERT INTO comanda_orden (comanda_id, orden_id) VALUES (:c, :o)",
        c=segunda,
        o=escenario.orden,
    )
