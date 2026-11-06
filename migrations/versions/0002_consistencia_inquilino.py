"""INV-10: ninguna fila mezcla restaurantes.

`docs/plan/03_Datos_v1.md` §5. Las reglas duras 5 y 6 viven en los servicios; esto es la
defensa en profundidad en la base:

- `UNIQUE (id, restaurante_id)` en los padres que otras tablas referencian junto con su
  restaurante: `sesion_grupal`, `mesa`, `categoria_menu`, `personal_restaurante`, `platillo`.
- Las llaves foráneas simples hacia esos padres pasan a ser compuestas `(x_id, restaurante_id)`
  desde `sesion_grupal`, `comanda`, `llamada_mesero` y `platillo`. Conservan el nombre y la
  acción `ON DELETE` de la simple que sustituyen; las `SET NULL` usan la lista de columnas de
  PostgreSQL 15+ (`SET NULL (x_id)`) para no anular `restaurante_id`, que es `NOT NULL`.
- `item_orden` no tiene `restaurante_id`: el trigger `tr_item_orden_mismo_restaurante` compara
  el restaurante del platillo con el de la sesión de la orden.
- El padre no puede romper la relación desde su lado: `restaurante_id` es inmutable en
  `platillo`, cuya categoría es opcional. Los demás padres ya no pueden cambiar de
  restaurante: las FK compuestas no admiten cambiar la clave referenciada mientras haya
  hijos, y `sesion_grupal` tiene su propia FK compuesta hacia `mesa` (`mesa_id` NOT NULL).

Revision ID: 0002_consistencia_inquilino
Revises: 0001_base_v1
Create Date: 2026-11-06
"""

from collections.abc import Sequence

from alembic import op

revision = "0002_consistencia_inquilino"
down_revision: str | None = "0001_base_v1"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

# Padres con `UNIQUE (id, restaurante_id)` (nombre según la convención de `app/db/database.py`).
PADRES = ("sesion_grupal", "mesa", "categoria_menu", "personal_restaurante", "platillo")

# (tabla, columna, padre, ON DELETE): cada FK simple `columna → padre.id` que pasa a compuesta.
FK_COMPUESTAS = (
    ("sesion_grupal", "mesa_id", "mesa", "CASCADE"),
    ("sesion_grupal", "cerrada_por_personal_id", "personal_restaurante", "SET NULL"),
    ("platillo", "categoria_id", "categoria_menu", "SET NULL"),
    ("platillo", "no_disponible_por", "personal_restaurante", "SET NULL"),
    ("comanda", "sesion_id", "sesion_grupal", "CASCADE"),
    ("comanda", "mesa_id", "mesa", "CASCADE"),
    ("comanda", "atendida_por_personal_id", "personal_restaurante", "SET NULL"),
    ("llamada_mesero", "sesion_id", "sesion_grupal", "CASCADE"),
    ("llamada_mesero", "mesa_id", "mesa", "CASCADE"),
    ("llamada_mesero", "atendida_por_personal_id", "personal_restaurante", "SET NULL"),
)


def _ondelete_compuesta(columna: str, accion: str) -> str:
    # `SET NULL` a secas anularía también `restaurante_id` (NOT NULL) y el borrado fallaría.
    return f"SET NULL ({columna})" if accion == "SET NULL" else accion


# INV-10 para `item_orden`: el platillo es del mismo restaurante que la sesión de la orden.
# Si la orden o el platillo no existen se devuelve NEW y falla la llave foránea, que es el
# error verdadero. Sin `FOR SHARE`: el `restaurante_id` del platillo y el de la sesión no
# pueden cambiar (trigger de abajo y FK compuesta hacia `mesa`), ni el `sesion_id` de la
# orden (0001), así que lo leído no cambia bajo nuestros pies.
SQL_FN_ITEM_ORDEN_MISMO_RESTAURANTE = """
CREATE OR REPLACE FUNCTION fn_item_orden_mismo_restaurante()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_restaurante_platillo UUID;
    v_restaurante_sesion   UUID;
BEGIN
    SELECT restaurante_id INTO v_restaurante_platillo FROM platillo WHERE id = NEW.platillo_id;
    SELECT s.restaurante_id INTO v_restaurante_sesion
        FROM orden_personal o JOIN sesion_grupal s ON s.id = o.sesion_id
        WHERE o.id = NEW.orden_id;

    IF v_restaurante_platillo IS NULL OR v_restaurante_sesion IS NULL THEN
        RETURN NEW;
    END IF;
    IF v_restaurante_platillo <> v_restaurante_sesion THEN
        RAISE EXCEPTION 'El platillo % no es del restaurante de la orden % (INV-10)',
            NEW.platillo_id, NEW.orden_id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;
"""
SQL_TR_ITEM_ORDEN_MISMO_RESTAURANTE = """
CREATE TRIGGER tr_item_orden_mismo_restaurante
    BEFORE INSERT OR UPDATE OF orden_id, platillo_id ON item_orden
    FOR EACH ROW EXECUTE FUNCTION fn_item_orden_mismo_restaurante();
"""

# INV-10 desde el padre: mover un platillo sin categoría a otro restaurante dejaría a sus
# ítems de orden (que no tienen `restaurante_id`) mezclando restaurantes.
SQL_FN_RESTAURANTE_ID_INMUTABLE = """
CREATE OR REPLACE FUNCTION fn_restaurante_id_inmutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW.restaurante_id IS DISTINCT FROM OLD.restaurante_id THEN
        RAISE EXCEPTION '% no puede cambiar de restaurante (INV-10)', TG_TABLE_NAME
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;
"""
SQL_TR_PLATILLO_RESTAURANTE_INMUTABLE = """
CREATE TRIGGER tr_platillo_restaurante_inmutable
    BEFORE UPDATE OF restaurante_id ON platillo
    FOR EACH ROW EXECUTE FUNCTION fn_restaurante_id_inmutable();
"""

TRIGGERS = (
    ("tr_item_orden_mismo_restaurante", "item_orden"),
    ("tr_platillo_restaurante_inmutable", "platillo"),
)
FUNCIONES = ("fn_item_orden_mismo_restaurante", "fn_restaurante_id_inmutable")


def upgrade() -> None:
    for padre in PADRES:
        op.create_unique_constraint(
            f"uq_{padre}_id_restaurante_id", padre, ["id", "restaurante_id"]
        )
    for tabla, columna, padre, accion in FK_COMPUESTAS:
        nombre = f"fk_{tabla}_{columna}"
        op.drop_constraint(nombre, tabla, type_="foreignkey")
        op.create_foreign_key(
            nombre,
            tabla,
            padre,
            [columna, "restaurante_id"],
            ["id", "restaurante_id"],
            ondelete=_ondelete_compuesta(columna, accion),
        )
    op.execute(SQL_FN_ITEM_ORDEN_MISMO_RESTAURANTE)
    op.execute(SQL_TR_ITEM_ORDEN_MISMO_RESTAURANTE)
    op.execute(SQL_FN_RESTAURANTE_ID_INMUTABLE)
    op.execute(SQL_TR_PLATILLO_RESTAURANTE_INMUTABLE)


def downgrade() -> None:
    for trigger, tabla in TRIGGERS:
        op.execute(f"DROP TRIGGER IF EXISTS {trigger} ON {tabla}")
    for funcion in FUNCIONES:
        op.execute(f"DROP FUNCTION IF EXISTS {funcion}()")
    for tabla, columna, padre, accion in reversed(FK_COMPUESTAS):
        nombre = f"fk_{tabla}_{columna}"
        op.drop_constraint(nombre, tabla, type_="foreignkey")
        op.create_foreign_key(nombre, tabla, padre, [columna], ["id"], ondelete=accion)
    for padre in reversed(PADRES):
        op.drop_constraint(f"uq_{padre}_id_restaurante_id", padre, type_="unique")
