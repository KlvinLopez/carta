"""Esquema base de Carta v1.

Crea de una vez el esquema final descrito en `docs/plan/03_Datos_v1.md` (no existe ninguna
base en producción, así que no hay secuencia 0001–0008 de agosto): tipos enumerados, 17 tablas,
índices parciales, los triggers de INV-3 e INV-8 y su `downgrade()` completo.
Los tres usuarios de base (`carta_migrador`, `carta_app`, `carta_lector`) se crean aparte con
`scripts/usuarios_bd.sql`, porque los roles son globales al servidor y no parte del esquema.

Revision ID: 0001_base_v1
Revises:
Create Date: 2026-11-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_base_v1"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

# ---------------------------------------------------------------------------
# Tipos enumerados: se crean y borran explícitamente (create_type=False en las columnas)
# ---------------------------------------------------------------------------

rol_personal = postgresql.ENUM("mesero", "capitan", name="rol_personal", create_type=False)
rol_operador = postgresql.ENUM(
    "propietario", "gerente", "carta_ops", name="rol_operador", create_type=False
)
imagen_tipo = postgresql.ENUM(
    "foto", "ilustracion_categoria", "ilustracion_generada", name="imagen_tipo", create_type=False
)
estado_comanda = postgresql.ENUM(
    "abierta", "atendida", "servida", "cancelada", name="estado_comanda", create_type=False
)
estado_importacion = postgresql.ENUM(
    "pendiente",
    "procesando",
    "listo",
    "confirmado",
    "fallido",
    name="estado_importacion",
    create_type=False,
)
TIPOS_ENUMERADOS = (rol_personal, rol_operador, imagen_tipo, estado_comanda, estado_importacion)

# Tipos de evento de analítica de la v1 (docs/plan/01_Alcance_v1.md §7).
TIPOS_EVENTO = (
    "scan",
    "menu_view",
    "dish_view",
    "search",
    "filter",
    "item_add",
    "item_remove",
    "order_confirm",
    "order_unconfirm",
    "session_ready",
    "waiter_call",
    "staff_attend",
    "staff_serve",
    "dish_sold_out",
)


# ---------------------------------------------------------------------------
# Columnas repetidas
# ---------------------------------------------------------------------------


def _id_uuid() -> sa.Column:
    return sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False)


def _fk(
    tabla: str, columna: str, destino: str, *, ondelete: str, nullable: bool = False
) -> sa.Column:
    return sa.Column(
        columna,
        sa.UUID(),
        sa.ForeignKey(destino, name=f"fk_{tabla}_{columna}", ondelete=ondelete),
        nullable=nullable,
    )


def _ahora(columna: str) -> sa.Column:
    return sa.Column(
        columna, sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
    )


def _marca(columna: str) -> sa.Column:
    return sa.Column(columna, sa.DateTime(timezone=True), nullable=True)


def _booleano(columna: str, valor: bool) -> sa.Column:
    return sa.Column(
        columna, sa.Boolean(), server_default=sa.text("true" if valor else "false"), nullable=False
    )


def _jsonb(columna: str, valor: str) -> sa.Column:
    return sa.Column(
        columna, postgresql.JSONB(), server_default=sa.text(f"'{valor}'::jsonb"), nullable=False
    )


def _lista_sql(valores: Sequence[str]) -> str:
    return ", ".join(f"'{v}'" for v in valores)


# ---------------------------------------------------------------------------
# Triggers de invariantes
# ---------------------------------------------------------------------------

# Todas las funciones fijan `search_path`: una tabla temporal `pg_temp.orden_personal`
# no puede suplantar a la real y anular una invariante.
#
# INV-3: los ítems de una orden confirmada (`bloqueada = true`) no se tocan.
# - Mira la orden de NEW y la de OLD: mover un ítem a otra orden no lo saca de la bloqueada.
# - `FOR SHARE` bloquea la fila de la orden: si otra transacción la está confirmando
#   (UPDATE ... bloqueada = true sin commit), esta espera y después ve el valor nuevo.
SQL_FN_ITEM_ORDEN_INMUTABLE = """
CREATE OR REPLACE FUNCTION fn_item_orden_inmutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_bloqueada BOOLEAN;
BEGIN
    FOR v_bloqueada IN
        SELECT bloqueada FROM orden_personal
        WHERE id IN (NEW.orden_id, OLD.orden_id)
        FOR SHARE
    LOOP
        IF v_bloqueada THEN
            RAISE EXCEPTION 'La orden está confirmada y no admite cambios (INV-3)'
                USING ERRCODE = 'check_violation';
        END IF;
    END LOOP;
    RETURN COALESCE(NEW, OLD);
END;
$$;
"""
SQL_TR_ITEM_ORDEN_INMUTABLE = """
CREATE TRIGGER tr_item_orden_inmutable
    BEFORE INSERT OR UPDATE OR DELETE ON item_orden
    FOR EACH ROW EXECUTE FUNCTION fn_item_orden_inmutable();
"""

# INV-3 y regla dura 9: una orden confirmada no se borra (ni en cascada desde su sesión).
SQL_FN_ORDEN_BLOQUEADA_NO_SE_BORRA = """
CREATE OR REPLACE FUNCTION fn_orden_bloqueada_no_se_borra()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF OLD.bloqueada THEN
        RAISE EXCEPTION 'La orden está confirmada y no se puede borrar (INV-3)'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
END;
$$;
"""
SQL_TR_ORDEN_BLOQUEADA_NO_SE_BORRA = """
CREATE TRIGGER tr_orden_bloqueada_no_se_borra
    BEFORE DELETE ON orden_personal
    FOR EACH ROW EXECUTE FUNCTION fn_orden_bloqueada_no_se_borra();
"""

# INV-8: una comanda sólo agrupa órdenes de su propia sesión.
# Si la comanda o la orden no existen se devuelve NEW y falla la llave foránea, que es el
# error verdadero; el mensaje de INV-8 se reserva para sesiones distintas.
SQL_FN_COMANDA_ORDEN_MISMA_SESION = """
CREATE OR REPLACE FUNCTION fn_comanda_orden_misma_sesion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_sesion_comanda UUID;
    v_sesion_orden   UUID;
BEGIN
    SELECT sesion_id INTO v_sesion_comanda FROM comanda WHERE id = NEW.comanda_id;
    SELECT sesion_id INTO v_sesion_orden FROM orden_personal WHERE id = NEW.orden_id;

    IF v_sesion_comanda IS NULL OR v_sesion_orden IS NULL THEN
        RETURN NEW;
    END IF;
    IF v_sesion_comanda <> v_sesion_orden THEN
        RAISE EXCEPTION 'La orden % no pertenece a la sesión de la comanda % (INV-8)',
            NEW.orden_id, NEW.comanda_id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;
"""
SQL_TR_COMANDA_ORDEN_MISMA_SESION = """
CREATE TRIGGER tr_comanda_orden_misma_sesion
    BEFORE INSERT OR UPDATE ON comanda_orden
    FOR EACH ROW EXECUTE FUNCTION fn_comanda_orden_misma_sesion();
"""

# INV-8 por el otro lado: `sesion_id` es inmutable en comanda y en orden_personal, de modo que
# la relación comanda ↔ órdenes no se rompe moviendo a los padres de sesión.
SQL_FN_SESION_ID_INMUTABLE = """
CREATE OR REPLACE FUNCTION fn_sesion_id_inmutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW.sesion_id IS DISTINCT FROM OLD.sesion_id THEN
        RAISE EXCEPTION '% no puede cambiar de sesión (INV-8)', TG_TABLE_NAME
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;
"""
SQL_TR_COMANDA_SESION_INMUTABLE = """
CREATE TRIGGER tr_comanda_sesion_inmutable
    BEFORE UPDATE OF sesion_id ON comanda
    FOR EACH ROW EXECUTE FUNCTION fn_sesion_id_inmutable();
"""
SQL_TR_ORDEN_SESION_INMUTABLE = """
CREATE TRIGGER tr_orden_sesion_inmutable
    BEFORE UPDATE OF sesion_id ON orden_personal
    FOR EACH ROW EXECUTE FUNCTION fn_sesion_id_inmutable();
"""


def upgrade() -> None:
    conexion = op.get_bind()
    for tipo in TIPOS_ENUMERADOS:
        tipo.create(conexion, checkfirst=False)

    # ── Catálogo ────────────────────────────────────────────────────────────
    op.create_table(
        "restaurante",
        _id_uuid(),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("direccion", sa.Text(), nullable=True),
        sa.Column("telefono", sa.String(20), nullable=True),
        sa.Column("email", sa.String(200), nullable=True),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("tema", sa.String(20), server_default="vino", nullable=False),
        sa.Column("plan", sa.String(20), server_default="gratis", nullable=False),
        _jsonb("horarios", "{}"),
        _booleano("activo", True),
        _ahora("creado_en"),
        _ahora("actualizado_en"),
        sa.CheckConstraint(
            "tema IN ('vino', 'verde', 'azul', 'ocre', 'cafe')", name="ck_restaurante_tema"
        ),
        sa.CheckConstraint("plan IN ('gratis', 'pro', 'enterprise')", name="ck_restaurante_plan"),
        sa.CheckConstraint("slug <> ''", name="ck_restaurante_slug"),
        sa.PrimaryKeyConstraint("id", name="pk_restaurante"),
        sa.UniqueConstraint("slug", name="uq_restaurante_slug"),
    )
    op.create_index(
        "idx_restaurante_activo", "restaurante", ["activo"], postgresql_where=sa.text("activo")
    )

    op.create_table(
        "categoria_menu",
        _id_uuid(),
        _fk("categoria_menu", "restaurante_id", "restaurante.id", ondelete="CASCADE"),
        sa.Column("nombre", sa.String(100), nullable=False),
        sa.Column("orden", sa.Integer(), server_default="0", nullable=False),
        _booleano("activa", True),
        sa.PrimaryKeyConstraint("id", name="pk_categoria_menu"),
    )
    # Regla dura 9: la baja es lógica, así que el nombre sólo es único entre las activas.
    op.create_index(
        "uq_categoria_activa_por_nombre",
        "categoria_menu",
        ["restaurante_id", sa.text("lower(btrim(nombre))")],
        unique=True,
        postgresql_where=sa.text("activa"),
    )
    op.create_index("idx_categoria_restaurante", "categoria_menu", ["restaurante_id"])

    # ── Acceso: operador (cuenta) y personal (PIN) ───────────────────────────
    op.create_table(
        "usuario",
        _id_uuid(),
        sa.Column("firebase_uid", sa.String(128), nullable=False),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("nombre_display", sa.String(100), nullable=True),
        sa.Column("plan", sa.String(20), server_default="gratis", nullable=False),
        _ahora("creado_en"),
        _ahora("ultimo_login"),
        sa.CheckConstraint("provider IN ('google', 'email_link')", name="ck_usuario_provider"),
        sa.CheckConstraint("plan IN ('gratis', 'premium')", name="ck_usuario_plan"),
        sa.PrimaryKeyConstraint("id", name="pk_usuario"),
        sa.UniqueConstraint("firebase_uid", name="uq_usuario_firebase_uid"),
    )

    op.create_table(
        "operador_restaurante",
        _id_uuid(),
        _fk("operador_restaurante", "usuario_id", "usuario.id", ondelete="CASCADE"),
        _fk("operador_restaurante", "restaurante_id", "restaurante.id", ondelete="CASCADE"),
        sa.Column("rol", rol_operador, server_default="gerente", nullable=False),
        _booleano("activo", True),
        _ahora("creado_en"),
        sa.PrimaryKeyConstraint("id", name="pk_operador_restaurante"),
        sa.UniqueConstraint(
            "usuario_id", "restaurante_id", name="uq_operador_restaurante_usuario_id_restaurante_id"
        ),
    )
    op.create_index(
        "idx_operador_usuario",
        "operador_restaurante",
        ["usuario_id"],
        postgresql_where=sa.text("activo"),
    )
    op.create_index("idx_operador_restaurante", "operador_restaurante", ["restaurante_id"])

    op.create_table(
        "personal_restaurante",
        _id_uuid(),
        _fk("personal_restaurante", "restaurante_id", "restaurante.id", ondelete="CASCADE"),
        sa.Column("nombre", sa.String(60), nullable=False),
        sa.Column("rol", rol_personal, server_default="mesero", nullable=False),
        sa.Column("pin_hash", sa.String(255), nullable=False),  # Argon2id; nunca el PIN
        _booleano("activo", True),
        sa.Column("intentos_fallidos", sa.SmallInteger(), server_default="0", nullable=False),
        _marca("bloqueado_hasta"),
        _marca("ultimo_acceso_en"),
        _ahora("creado_en"),
        _ahora("actualizado_en"),
        sa.CheckConstraint("length(btrim(nombre)) > 0", name="ck_personal_nombre"),
        sa.CheckConstraint("intentos_fallidos >= 0", name="ck_personal_intentos"),
        # INV-7 verificable en la base: sólo entra un hash Argon2id, nunca el PIN.
        sa.CheckConstraint("pin_hash LIKE '$argon2id$%'", name="ck_personal_pin_hash"),
        sa.PrimaryKeyConstraint("id", name="pk_personal_restaurante"),
    )
    # Regla dura 9: se puede recontratar a "Ana" después de darla de baja.
    op.create_index(
        "uq_personal_activo_por_nombre",
        "personal_restaurante",
        ["restaurante_id", sa.text("lower(btrim(nombre))")],
        unique=True,
        postgresql_where=sa.text("activo"),
    )
    op.create_index("idx_personal_restaurante", "personal_restaurante", ["restaurante_id"])

    # ── Platillo (referencia a personal_restaurante por `no_disponible_por`) ──
    op.create_table(
        "platillo",
        _id_uuid(),
        _fk("platillo", "restaurante_id", "restaurante.id", ondelete="CASCADE"),
        _fk("platillo", "categoria_id", "categoria_menu.id", ondelete="SET NULL", nullable=True),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("precio", sa.Numeric(10, 2), nullable=False),
        sa.Column("foto_url", sa.String(500), nullable=True),
        sa.Column("foto_thumb_url", sa.String(500), nullable=True),
        sa.Column("foto_detalle_url", sa.String(500), nullable=True),
        sa.Column("foto_original_url", sa.String(500), nullable=True),
        sa.Column(
            "imagen_tipo", imagen_tipo, server_default="ilustracion_categoria", nullable=False
        ),
        sa.Column("ilustracion_clave", sa.String(40), nullable=True),
        _jsonb("alergenos", "[]"),
        _jsonb("etiquetas", "[]"),
        sa.Column("calorias", sa.Integer(), nullable=True),
        sa.Column("nivel_picante", sa.Integer(), server_default="0", nullable=False),
        _booleano("destacado", False),
        sa.Column("orden", sa.Integer(), server_default="0", nullable=False),
        _booleano("disponible", True),
        _marca("no_disponible_desde"),
        _fk(
            "platillo",
            "no_disponible_por",
            "personal_restaurante.id",
            ondelete="SET NULL",
            nullable=True,
        ),
        _booleano("activo", True),
        _ahora("creado_en"),
        _ahora("actualizado_en"),
        sa.CheckConstraint("precio >= 0", name="ck_platillo_precio"),
        sa.CheckConstraint("nivel_picante BETWEEN 0 AND 5", name="ck_platillo_nivel_picante"),
        sa.CheckConstraint("jsonb_typeof(alergenos) = 'array'", name="ck_platillo_alergenos_lista"),
        sa.CheckConstraint("jsonb_typeof(etiquetas) = 'array'", name="ck_platillo_etiquetas_lista"),
        sa.PrimaryKeyConstraint("id", name="pk_platillo"),
    )
    op.create_index("idx_platillo_restaurante", "platillo", ["restaurante_id"])
    op.create_index("idx_platillo_no_disponible_por", "platillo", ["no_disponible_por"])
    op.create_index("idx_platillo_categoria_orden", "platillo", ["categoria_id", "orden"])
    op.create_index(
        "idx_platillo_activo",
        "platillo",
        ["restaurante_id", "activo"],
        postgresql_where=sa.text("activo"),
    )
    op.create_index("idx_platillo_alergenos", "platillo", ["alergenos"], postgresql_using="gin")
    op.create_index("idx_platillo_etiquetas", "platillo", ["etiquetas"], postgresql_using="gin")

    # ── Mesa y sesión ────────────────────────────────────────────────────────
    op.create_table(
        "mesa",
        _id_uuid(),
        _fk("mesa", "restaurante_id", "restaurante.id", ondelete="CASCADE"),
        sa.Column("numero", sa.Integer(), nullable=False),
        sa.Column("codigo_publico", sa.String(100), nullable=False),
        _marca("codigo_revocado_en"),
        sa.Column("nfc_id", sa.String(100), nullable=True),
        sa.Column("capacidad", sa.Integer(), server_default="4", nullable=False),
        _booleano("activa", True),
        sa.CheckConstraint("length(codigo_publico) >= 22", name="ck_codigo_largo"),
        sa.CheckConstraint("capacidad > 0", name="ck_mesa_capacidad"),
        sa.PrimaryKeyConstraint("id", name="pk_mesa"),
        sa.UniqueConstraint("codigo_publico", name="uq_mesa_codigo_publico"),
    )
    # Regla dura 9: el número sólo es único entre las mesas activas.
    op.create_index(
        "uq_mesa_activa_por_numero",
        "mesa",
        ["restaurante_id", "numero"],
        unique=True,
        postgresql_where=sa.text("activa"),
    )
    op.create_index("idx_mesa_restaurante", "mesa", ["restaurante_id"])

    op.create_table(
        "sesion_grupal",
        _id_uuid(),
        _fk("sesion_grupal", "mesa_id", "mesa.id", ondelete="CASCADE"),
        _fk("sesion_grupal", "restaurante_id", "restaurante.id", ondelete="CASCADE"),
        sa.Column("estado", sa.String(20), server_default="activa", nullable=False),
        _ahora("inicio"),
        _marca("fin"),
        _ahora("ultima_actividad_en"),
        _fk(
            "sesion_grupal",
            "cerrada_por_personal_id",
            "personal_restaurante.id",
            ondelete="SET NULL",
            nullable=True,
        ),
        sa.CheckConstraint(
            "estado IN ('activa', 'lista_para_enviar', 'cerrada', 'cancelada')",
            name="ck_sesion_grupal_estado",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_sesion_grupal"),
    )
    op.create_index("idx_sesion_mesa", "sesion_grupal", ["mesa_id"])
    op.create_index("idx_sesion_restaurante", "sesion_grupal", ["restaurante_id"])
    op.create_index("idx_sesion_cerrada_por", "sesion_grupal", ["cerrada_por_personal_id"])
    # INV-1: una sesión viva por mesa.
    op.create_index(
        "uq_sesion_viva_por_mesa",
        "sesion_grupal",
        ["mesa_id"],
        unique=True,
        postgresql_where=sa.text("estado IN ('activa', 'lista_para_enviar')"),
    )

    op.create_table(
        "miembro_sesion",
        _id_uuid(),
        _fk("miembro_sesion", "sesion_id", "sesion_grupal.id", ondelete="CASCADE"),
        _fk("miembro_sesion", "usuario_id", "usuario.id", ondelete="SET NULL", nullable=True),
        sa.Column("rol", sa.String(20), server_default="miembro", nullable=False),
        sa.Column("estado", sa.String(20), server_default="activo", nullable=False),
        sa.Column("alias", sa.String(24), nullable=True),
        sa.Column("color_avatar", sa.String(7), nullable=True),
        _ahora("unido_en"),
        sa.CheckConstraint("rol IN ('host', 'miembro')", name="ck_miembro_sesion_rol"),
        sa.CheckConstraint("estado IN ('activo', 'desconectado')", name="ck_miembro_sesion_estado"),
        sa.CheckConstraint(
            "color_avatar IS NULL OR color_avatar ~ '^#[0-9A-Fa-f]{6}$'",
            name="ck_miembro_sesion_color",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_miembro_sesion"),
    )
    op.create_index("idx_miembro_sesion", "miembro_sesion", ["sesion_id"])
    op.create_index("idx_miembro_usuario", "miembro_sesion", ["usuario_id"])

    # ── Orden ────────────────────────────────────────────────────────────────
    op.create_table(
        "orden_personal",
        _id_uuid(),
        _fk("orden_personal", "sesion_id", "sesion_grupal.id", ondelete="CASCADE"),
        _fk("orden_personal", "miembro_id", "miembro_sesion.id", ondelete="CASCADE"),
        sa.Column("estado", sa.String(20), server_default="armando", nullable=False),
        sa.Column("total", sa.Numeric(10, 2), server_default="0", nullable=False),
        _booleano("bloqueada", False),
        _ahora("creada_en"),
        _marca("confirmada_en"),
        sa.CheckConstraint(
            "estado IN ('armando', 'confirmada', 'enviada', 'cerrada')",
            name="ck_orden_personal_estado",
        ),
        # INV-3: `bloqueada` sigue al estado; no se puede confirmar sin bloquear.
        sa.CheckConstraint(
            "bloqueada = (estado <> 'armando')", name="ck_orden_bloqueada_coherente"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_orden_personal"),
    )
    op.execute(SQL_FN_ORDEN_BLOQUEADA_NO_SE_BORRA)
    op.execute(SQL_TR_ORDEN_BLOQUEADA_NO_SE_BORRA)
    op.execute(SQL_FN_SESION_ID_INMUTABLE)
    op.execute(SQL_TR_ORDEN_SESION_INMUTABLE)
    op.create_index("idx_orden_sesion", "orden_personal", ["sesion_id"])
    op.create_index("idx_orden_miembro", "orden_personal", ["miembro_id"])
    # INV-2: una orden viva por miembro.
    op.create_index(
        "uq_orden_viva_por_miembro",
        "orden_personal",
        ["miembro_id"],
        unique=True,
        postgresql_where=sa.text("estado IN ('armando', 'confirmada')"),
    )

    op.create_table(
        "item_orden",
        _id_uuid(),
        _fk("item_orden", "orden_id", "orden_personal.id", ondelete="CASCADE"),
        _fk("item_orden", "platillo_id", "platillo.id", ondelete="RESTRICT"),
        sa.Column("cantidad", sa.Integer(), server_default="1", nullable=False),
        sa.Column("notas", sa.Text(), nullable=True),
        sa.Column("precio_unitario", sa.Numeric(10, 2), nullable=False),
        sa.Column("subtotal", sa.Numeric(10, 2), nullable=False),
        sa.CheckConstraint("cantidad > 0", name="ck_item_orden_cantidad"),
        sa.CheckConstraint("notas IS NULL OR length(notas) <= 140", name="ck_item_orden_notas"),
        sa.CheckConstraint("precio_unitario >= 0", name="ck_item_orden_precio"),
        sa.CheckConstraint("subtotal >= 0", name="ck_item_orden_subtotal"),
        sa.PrimaryKeyConstraint("id", name="pk_item_orden"),
    )
    op.create_index("idx_item_orden", "item_orden", ["orden_id"])
    op.create_index("idx_item_platillo", "item_orden", ["platillo_id"])
    op.execute(SQL_FN_ITEM_ORDEN_INMUTABLE)
    op.execute(SQL_TR_ITEM_ORDEN_INMUTABLE)

    # ── Comanda y llamadas ───────────────────────────────────────────────────
    op.create_table(
        "comanda",
        _id_uuid(),
        _fk("comanda", "restaurante_id", "restaurante.id", ondelete="CASCADE"),
        _fk("comanda", "mesa_id", "mesa.id", ondelete="CASCADE"),
        _fk("comanda", "sesion_id", "sesion_grupal.id", ondelete="CASCADE"),
        sa.Column("secuencia", sa.Integer(), server_default="1", nullable=False),
        sa.Column("estado", estado_comanda, server_default="abierta", nullable=False),
        sa.Column("total_estimado", sa.Numeric(10, 2), server_default="0", nullable=False),
        sa.Column("num_comensales", sa.Integer(), server_default="1", nullable=False),
        _ahora("creada_en"),
        _marca("atendida_en"),
        _marca("servida_en"),
        _fk(
            "comanda",
            "atendida_por_personal_id",
            "personal_restaurante.id",
            ondelete="SET NULL",
            nullable=True,
        ),
        sa.Column("nota_cancelacion", sa.Text(), nullable=True),
        # INV-6: el estado terminal exige su marca de tiempo.
        sa.CheckConstraint(
            "(estado = 'abierta' AND atendida_en IS NULL AND servida_en IS NULL) OR "
            "(estado = 'atendida' AND atendida_en IS NOT NULL AND servida_en IS NULL) OR "
            "(estado = 'servida' AND atendida_en IS NOT NULL AND servida_en >= atendida_en) OR "
            "(estado = 'cancelada')",
            name="ck_comanda_terminal",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_comanda"),
        sa.UniqueConstraint("sesion_id", "secuencia", name="uq_comanda_sesion_id_secuencia"),
    )
    op.execute(SQL_TR_COMANDA_SESION_INMUTABLE)
    op.create_index("idx_comanda_restaurante", "comanda", ["restaurante_id"])
    op.create_index("idx_comanda_atendida_por", "comanda", ["atendida_por_personal_id"])
    op.create_index(
        "idx_comanda_abierta",
        "comanda",
        ["restaurante_id", "creada_en"],
        postgresql_where=sa.text("estado IN ('abierta', 'atendida')"),
    )
    op.create_index("idx_comanda_mesa", "comanda", ["mesa_id", "creada_en"])

    op.create_table(
        "comanda_orden",
        _fk("comanda_orden", "comanda_id", "comanda.id", ondelete="CASCADE"),
        _fk("comanda_orden", "orden_id", "orden_personal.id", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("comanda_id", "orden_id", name="pk_comanda_orden"),
        # Una orden personal se cobra en una sola comanda.
        sa.UniqueConstraint("orden_id", name="uq_comanda_orden_orden_id"),
    )
    op.execute(SQL_FN_COMANDA_ORDEN_MISMA_SESION)
    op.execute(SQL_TR_COMANDA_ORDEN_MISMA_SESION)

    op.create_table(
        "llamada_mesero",
        _id_uuid(),
        _fk("llamada_mesero", "restaurante_id", "restaurante.id", ondelete="CASCADE"),
        _fk("llamada_mesero", "mesa_id", "mesa.id", ondelete="CASCADE"),
        _fk("llamada_mesero", "sesion_id", "sesion_grupal.id", ondelete="CASCADE"),
        _fk(
            "llamada_mesero", "miembro_id", "miembro_sesion.id", ondelete="SET NULL", nullable=True
        ),
        sa.Column("motivo", sa.String(40), server_default="atencion", nullable=False),
        _marca("atendida_en"),
        _fk(
            "llamada_mesero",
            "atendida_por_personal_id",
            "personal_restaurante.id",
            ondelete="SET NULL",
            nullable=True,
        ),
        _ahora("creada_en"),
        sa.PrimaryKeyConstraint("id", name="pk_llamada_mesero"),
    )
    op.create_index("idx_llamada_restaurante", "llamada_mesero", ["restaurante_id"])
    op.create_index("idx_llamada_mesa", "llamada_mesero", ["mesa_id"])
    op.create_index("idx_llamada_sesion", "llamada_mesero", ["sesion_id"])
    op.create_index("idx_llamada_miembro", "llamada_mesero", ["miembro_id"])
    op.create_index("idx_llamada_atendida_por", "llamada_mesero", ["atendida_por_personal_id"])
    op.create_index(
        "idx_llamada_pendiente",
        "llamada_mesero",
        ["restaurante_id", "creada_en"],
        postgresql_where=sa.text("atendida_en IS NULL"),
    )

    # ── Importación de PDF ───────────────────────────────────────────────────
    op.create_table(
        "importacion_menu",
        _id_uuid(),
        _fk("importacion_menu", "restaurante_id", "restaurante.id", ondelete="CASCADE"),
        _fk("importacion_menu", "solicitado_por", "usuario.id", ondelete="RESTRICT"),
        sa.Column("archivo_url", sa.String(500), nullable=False),  # bucket privado
        sa.Column("archivo_tipo", sa.String(40), nullable=False),
        sa.Column("paginas", sa.SmallInteger(), nullable=True),
        sa.Column("estado", estado_importacion, server_default="pendiente", nullable=False),
        sa.Column("modelo", sa.String(60), nullable=True),
        sa.Column("resultado", postgresql.JSONB(), nullable=True),
        sa.Column("tokens_entrada", sa.Integer(), nullable=True),
        sa.Column("tokens_salida", sa.Integer(), nullable=True),
        sa.Column("intentos", sa.SmallInteger(), server_default="0", nullable=False),
        sa.Column("error_mensaje", sa.Text(), nullable=True),
        _marca("iniciado_en"),
        _marca("finalizado_en"),
        _marca("confirmado_en"),
        _ahora("creado_en"),
        sa.CheckConstraint("intentos BETWEEN 0 AND 3", name="ck_importacion_intentos"),
        # INV-9 en la base: confirmado exige marca de tiempo y borrador.
        sa.CheckConstraint(
            "estado <> 'confirmado' OR (confirmado_en IS NOT NULL AND resultado IS NOT NULL)",
            name="ck_importacion_confirmada",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_importacion_menu"),
    )
    op.create_index("idx_importacion_solicitado_por", "importacion_menu", ["solicitado_por"])
    op.create_index(
        "idx_importacion_cola",
        "importacion_menu",
        ["creado_en"],
        postgresql_where=sa.text("estado = 'pendiente'"),
    )
    op.create_index(
        "idx_importacion_restaurante", "importacion_menu", ["restaurante_id", "creado_en"]
    )

    # ── Soporte y analítica ──────────────────────────────────────────────────
    op.create_table(
        "clave_idempotencia",
        sa.Column("ambito", sa.String(80), nullable=False),
        sa.Column("clave", sa.String(80), nullable=False),
        sa.Column("estado_http", sa.SmallInteger(), nullable=False),
        sa.Column("respuesta", postgresql.JSONB(), nullable=False),
        _ahora("creada_en"),
        sa.CheckConstraint("ambito <> ''", name="ck_idempotencia_ambito"),
        sa.PrimaryKeyConstraint("ambito", "clave", name="pk_clave_idempotencia"),
    )
    op.create_index("idx_idempotencia_purga", "clave_idempotencia", ["creada_en"])

    op.create_table(
        "evento_analitica",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        _fk("evento_analitica", "restaurante_id", "restaurante.id", ondelete="CASCADE"),
        _fk("evento_analitica", "mesa_id", "mesa.id", ondelete="SET NULL", nullable=True),
        _fk(
            "evento_analitica", "sesion_id", "sesion_grupal.id", ondelete="SET NULL", nullable=True
        ),
        _fk(
            "evento_analitica",
            "miembro_id",
            "miembro_sesion.id",
            ondelete="SET NULL",
            nullable=True,
        ),
        _fk("evento_analitica", "platillo_id", "platillo.id", ondelete="SET NULL", nullable=True),
        sa.Column("tipo", sa.String(40), nullable=False),
        _jsonb("propiedades", "{}"),
        sa.Column("ip_hash", sa.String(64), nullable=True),  # SHA-256 con sal; nunca IP en claro
        sa.Column("user_agent_fam", sa.String(60), nullable=True),
        _ahora("ocurrido_en"),
        sa.CheckConstraint(f"tipo IN ({_lista_sql(TIPOS_EVENTO)})", name="ck_tipo_evento"),
        sa.PrimaryKeyConstraint("id", name="pk_evento_analitica"),
    )
    op.create_index(
        "idx_evento_restaurante_fecha", "evento_analitica", ["restaurante_id", "ocurrido_en"]
    )
    op.create_index("idx_evento_tipo", "evento_analitica", ["tipo", "ocurrido_en"])
    op.create_index("idx_evento_sesion", "evento_analitica", ["sesion_id"])
    op.create_index("idx_evento_mesa", "evento_analitica", ["mesa_id"])
    op.create_index("idx_evento_miembro", "evento_analitica", ["miembro_id"])
    op.create_index("idx_evento_platillo", "evento_analitica", ["platillo_id"])


# Orden inverso de dependencias: cada tabla antes que las que referencia.
TABLAS_EN_ORDEN_DE_BORRADO = (
    "evento_analitica",
    "clave_idempotencia",
    "importacion_menu",
    "llamada_mesero",
    "comanda_orden",
    "comanda",
    "item_orden",
    "orden_personal",
    "miembro_sesion",
    "sesion_grupal",
    "mesa",
    "platillo",
    "personal_restaurante",
    "operador_restaurante",
    "usuario",
    "categoria_menu",
    "restaurante",
)


TRIGGERS = (
    ("tr_comanda_orden_misma_sesion", "comanda_orden"),
    ("tr_comanda_sesion_inmutable", "comanda"),
    ("tr_orden_sesion_inmutable", "orden_personal"),
    ("tr_orden_bloqueada_no_se_borra", "orden_personal"),
    ("tr_item_orden_inmutable", "item_orden"),
)
FUNCIONES = (
    "fn_comanda_orden_misma_sesion",
    "fn_sesion_id_inmutable",
    "fn_orden_bloqueada_no_se_borra",
    "fn_item_orden_inmutable",
)


def downgrade() -> None:
    for trigger, tabla in TRIGGERS:
        op.execute(f"DROP TRIGGER IF EXISTS {trigger} ON {tabla}")
    for funcion in FUNCIONES:
        op.execute(f"DROP FUNCTION IF EXISTS {funcion}()")
    # `drop_table` elimina también los índices y las restricciones de cada tabla.
    for tabla in TABLAS_EN_ORDEN_DE_BORRADO:
        op.drop_table(tabla)
    conexion = op.get_bind()
    for tipo in reversed(TIPOS_ENUMERADOS):
        tipo.drop(conexion, checkfirst=False)
