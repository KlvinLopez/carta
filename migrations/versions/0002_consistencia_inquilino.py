"""INV-10: ninguna fila mezcla restaurantes (ni sesiones).

`docs/plan/03_Datos_v1.md` §5. Las reglas duras 5 y 6 viven en los servicios; esto es la
defensa en profundidad en la base:

- `UNIQUE (id, restaurante_id)` en los padres que otras tablas referencian junto con su
  restaurante: `sesion_grupal`, `mesa`, `categoria_menu`, `personal_restaurante`, `platillo`;
  y `UNIQUE (id, sesion_id)` en `miembro_sesion`, que no tiene `restaurante_id` pero sí sesión.
- Las llaves foráneas simples hacia esos padres pasan a ser compuestas `(x_id, clave)` →
  `padre(id, clave)`, con `clave` = `restaurante_id` (desde `sesion_grupal`, `platillo`,
  `comanda`, `llamada_mesero` y `evento_analitica`) o `sesion_id` (el miembro, desde
  `orden_personal` y `llamada_mesero`; en `evento_analitica`, con `sesion_id` también
  `SET NULL`, una compuesta dejaría `miembro_id` colgando al borrar la sesión, así que ahí
  sigue simple). Conservan el nombre y la acción
  `ON DELETE` de la simple que sustituyen; las `SET NULL` usan la lista de columnas de
  PostgreSQL 15+ (`SET NULL (x_id)`) para no anular la clave compartida.
- `item_orden` no tiene `restaurante_id`: el trigger `tr_item_orden_mismo_restaurante` compara
  el restaurante del platillo con el de la sesión de la orden.
- Ningún padre puede romper la relación desde su lado. `restaurante_id` es inmutable en
  `platillo` (su categoría es opcional) y en `sesion_grupal` (sin comandas ni llamadas, cambiar
  a la vez `mesa_id` y `restaurante_id` la mudaría de restaurante con sus órdenes e ítems, que
  no tienen `restaurante_id`); `sesion_id` es inmutable en `miembro_sesion` (como ya lo era en
  `orden_personal` y `comanda`, 0001). Los demás padres (`mesa`, `categoria_menu`,
  `personal_restaurante`) no pueden cambiar de restaurante mientras tengan hijos: las FK
  compuestas no admiten cambiar la clave referenciada.

Si `upgrade` falla con una violación de llave foránea, hay filas de 0001 que ya mezclan
restaurantes; esta consulta las muestra (una por tabla hija, mismo patrón para las demás):

    SELECT c.id FROM comanda c JOIN sesion_grupal s ON s.id = c.sesion_id
    WHERE s.restaurante_id <> c.restaurante_id;

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

# (padre, clave): cada padre lleva `UNIQUE (id, clave)` (nombre por la convención de
# `app/db/database.py`: `uq_<padre>_id_<clave>`).
PADRES = (
    ("sesion_grupal", "restaurante_id"),
    ("mesa", "restaurante_id"),
    ("categoria_menu", "restaurante_id"),
    ("personal_restaurante", "restaurante_id"),
    ("platillo", "restaurante_id"),
    ("miembro_sesion", "sesion_id"),
)

# (tabla, columna, padre, clave, ON DELETE): cada FK simple `columna → padre.id` que pasa a
# compuesta `(columna, clave) → padre(id, clave)`.
R = "restaurante_id"
S = "sesion_id"
FK_COMPUESTAS = (
    ("sesion_grupal", "mesa_id", "mesa", R, "CASCADE"),
    ("sesion_grupal", "cerrada_por_personal_id", "personal_restaurante", R, "SET NULL"),
    ("platillo", "categoria_id", "categoria_menu", R, "SET NULL"),
    ("platillo", "no_disponible_por", "personal_restaurante", R, "SET NULL"),
    ("orden_personal", "miembro_id", "miembro_sesion", S, "CASCADE"),
    ("comanda", "sesion_id", "sesion_grupal", R, "CASCADE"),
    ("comanda", "mesa_id", "mesa", R, "CASCADE"),
    ("comanda", "atendida_por_personal_id", "personal_restaurante", R, "SET NULL"),
    ("llamada_mesero", "sesion_id", "sesion_grupal", R, "CASCADE"),
    ("llamada_mesero", "mesa_id", "mesa", R, "CASCADE"),
    ("llamada_mesero", "miembro_id", "miembro_sesion", S, "SET NULL"),
    ("llamada_mesero", "atendida_por_personal_id", "personal_restaurante", R, "SET NULL"),
    ("evento_analitica", "mesa_id", "mesa", R, "SET NULL"),
    ("evento_analitica", "sesion_id", "sesion_grupal", R, "SET NULL"),
    ("evento_analitica", "platillo_id", "platillo", R, "SET NULL"),
)


def _ondelete_compuesta(columna: str, accion: str) -> str:
    # `SET NULL` a secas anularía también la clave compartida (NOT NULL en casi todas las
    # tablas) y el borrado del padre fallaría.
    return f"SET NULL ({columna})" if accion == "SET NULL" else accion


# INV-10 para `item_orden`: el platillo es del mismo restaurante que la sesión de la orden.
# Si la orden o el platillo no existen se devuelve NEW y falla la llave foránea, que es el
# error verdadero. Sin `FOR SHARE`: el `restaurante_id` del platillo y el de la sesión son
# inmutables (triggers de abajo) y el `sesion_id` de la orden también (0001), así que lo
# leído no cambia bajo nuestros pies.
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

# INV-10 desde el padre: mover un platillo o una sesión a otro restaurante dejaría a sus
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
SQL_TR_SESION_RESTAURANTE_INMUTABLE = """
CREATE TRIGGER tr_sesion_restaurante_inmutable
    BEFORE UPDATE OF restaurante_id ON sesion_grupal
    FOR EACH ROW EXECUTE FUNCTION fn_restaurante_id_inmutable();
"""
# El miembro no cambia de sesión: su orden y sus llamadas se quedarían en la otra (la
# función `fn_sesion_id_inmutable` es de 0001 y se queda al bajar).
SQL_TR_MIEMBRO_SESION_INMUTABLE = """
CREATE TRIGGER tr_miembro_sesion_inmutable
    BEFORE UPDATE OF sesion_id ON miembro_sesion
    FOR EACH ROW EXECUTE FUNCTION fn_sesion_id_inmutable();
"""

TRIGGERS = (
    ("tr_item_orden_mismo_restaurante", "item_orden"),
    ("tr_platillo_restaurante_inmutable", "platillo"),
    ("tr_sesion_restaurante_inmutable", "sesion_grupal"),
    ("tr_miembro_sesion_inmutable", "miembro_sesion"),
)
# Sólo las funciones que crea esta migración.
FUNCIONES = ("fn_item_orden_mismo_restaurante", "fn_restaurante_id_inmutable")


def upgrade() -> None:
    for padre, clave in PADRES:
        op.create_unique_constraint(f"uq_{padre}_id_{clave}", padre, ["id", clave])
    for tabla, columna, padre, clave, accion in FK_COMPUESTAS:
        nombre = f"fk_{tabla}_{columna}"
        op.drop_constraint(nombre, tabla, type_="foreignkey")
        op.create_foreign_key(
            nombre,
            tabla,
            padre,
            [columna, clave],
            ["id", clave],
            ondelete=_ondelete_compuesta(columna, accion),
        )
    op.execute(SQL_FN_ITEM_ORDEN_MISMO_RESTAURANTE)
    op.execute(SQL_TR_ITEM_ORDEN_MISMO_RESTAURANTE)
    op.execute(SQL_FN_RESTAURANTE_ID_INMUTABLE)
    op.execute(SQL_TR_PLATILLO_RESTAURANTE_INMUTABLE)
    op.execute(SQL_TR_SESION_RESTAURANTE_INMUTABLE)
    op.execute(SQL_TR_MIEMBRO_SESION_INMUTABLE)


def downgrade() -> None:
    for trigger, tabla in TRIGGERS:
        op.execute(f"DROP TRIGGER IF EXISTS {trigger} ON {tabla}")
    for funcion in FUNCIONES:
        op.execute(f"DROP FUNCTION IF EXISTS {funcion}()")
    for tabla, columna, padre, _clave, accion in reversed(FK_COMPUESTAS):
        nombre = f"fk_{tabla}_{columna}"
        op.drop_constraint(nombre, tabla, type_="foreignkey")
        op.create_foreign_key(nombre, tabla, padre, [columna], ["id"], ondelete=accion)
    for padre, clave in reversed(PADRES):
        op.drop_constraint(f"uq_{padre}_id_{clave}", padre, type_="unique")
