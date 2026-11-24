"""Fase 3: ciclo de la mesa (Spec 001, ADR-017), costuras de la v1.1 y disparador de avisos
(ADR-018). `docs/plan/03_Datos_v1.md` §2.4.

**Sólo expansión** (05_Operacion §3, «expandir → usar → contraer»): producción corre `v0.1.0`
y un rollback del código deja la base en `0004`. Nada se renombra ni se borra; toda columna
nueva es nula o tiene valor por defecto constante (`ADD COLUMN` sin reescribir la tabla); los
CHECK que cambian sólo **amplían** la lista de valores; las tablas nuevas no las lee ni escribe
el código de la Fase 2. Por qué el código viejo no nota cada cambio:

- `sesion_grupal.estado` admite además `cuenta_cerrada` y `pagada` (vivos: el índice
  `uq_sesion_viva_por_mesa` los cubre, INV-1). El código de la Fase 2 sólo escribe `activa` y
  `cerrada`; «limpia» es el `cerrada` de siempre y «liberada sin pago verificado» una marca
  (`liberada_sin_pago`) sobre una sesión `cerrada`.
- `miembro_sesion.estado` admite además `cuenta_cerrada`, `pagada`, `flotante` y `retirado`
  (`activo` es «pidiendo»); `desconectado` se conserva. El código viejo no lee ese estado.
- `item_orden`: quién lo pidió, origen y «cancelado por el personal», con valores por
  defecto (`comensal`, `vigente`). INV-3 se ajusta **una sola vez** (ADR-017 punto 8): en un
  ítem de una orden confirmada sólo cabe el paso `vigente → cancelado_personal`, con autor y
  hora y sin tocar ninguna otra columna, mientras ninguna comanda de su orden esté atendida o
  servida. Todo lo que el trigger viejo rechazaba lo sigue rechazando.
- `restaurante`: zona horaria (por defecto `America/Mexico_City`), ajuste «fuera de horario»
  (por defecto `pedir_aprobacion`) y un CHECK de que `horarios` sea un objeto (su valor por
  defecto `{}` = «sin horario», AC-38.4). `RestauranteRespuesta` no publica esas columnas.
- Tablas nuevas: `solicitud_entrada`, `marca_ciclo` (marcas de tiempo con autor, sin
  sobrescribir), `ajuste_restaurante` (valores del piloto), `permiso_rol` (Spec 001 §5),
  `reparto_cargo` y `movimiento_cargo` (costura de traspasos). Al crear un restaurante, el
  trigger `tr_restaurante_siembra` siembra sus ajustes y permisos (AC-36.4), también con el
  código viejo; esta migración siembra los restaurantes que ya existen.
- **Avisos (ADR-018):** `fn_avisar_cambio` emite, en la misma transacción que la escritura,
  `pg_notify('carta_mesa', <sesion_id>)` y `pg_notify('carta_restaurante', <restaurante_id>)`
  sobre la lista cerrada de tablas de 03 §2.4. Nadie escucha todavía (T-3.20), pero un `NOTIFY`
  **tiene costo aunque no haya oyentes**: toma un candado global al confirmar. Medido sin
  ninguna escucha con `UPDATE` de `ultima_actividad_en` (lente adversarial de la revisión de la
  maestra, 24 de noviembre de 2026, `bench.py` sobre una base local): con 16 conexiones de 6000
  a 3300 transacciones/s (p50 de 2.2 a 4.5 ms); con 64, de 4850 a 1700–2160 (p50 de 12 a
  27–33 ms). Por eso `sesion_grupal` no avisa por `ultima_actividad_en` (no cambia nada de lo
  que ven la mesa ni el personal) ni `personal_restaurante` por cada intento de PIN.

Revision ID: 0004_ciclo_de_la_mesa
Revises: 0003_personal_sesiones_desde
Create Date: 2026-11-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0004_ciclo_de_la_mesa"
down_revision: str | None = "0003_personal_sesiones_desde"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

# ---------------------------------------------------------------------------
# Listas cerradas (copiadas en `app/db/models.py`; una migración es una foto y no importa `app`)
# ---------------------------------------------------------------------------

ESTADOS_SESION_ANTES = ("activa", "lista_para_enviar", "cerrada", "cancelada")
ESTADOS_SESION = (*ESTADOS_SESION_ANTES, "cuenta_cerrada", "pagada")
VIVOS_ANTES = ("activa", "lista_para_enviar")
VIVOS = (*VIVOS_ANTES, "cuenta_cerrada", "pagada")
ESTADOS_MIEMBRO_ANTES = ("activo", "desconectado")
ESTADOS_MIEMBRO = (*ESTADOS_MIEMBRO_ANTES, "cuenta_cerrada", "pagada", "flotante", "retirado")
PASOS_CICLO = (
    "primer_escaneo",
    "comanda",
    "cuenta_cerrada_comensal",
    "cuenta_reabierta_comensal",
    "cuenta_cerrada_mesa",
    "mesa_reabierta",
    "pago_avisado",
    "pago_validado",
    "mesa_pagada",
    "mesa_limpia",
    "liberada_sin_cargos",
    "liberada_con_cargos",
    "comensal_retirado",
    "comensal_flotante",
    "cuenta_pasada",
    "item_cancelado",
    "entrada_cerrada",
    "entrada_abierta",
    "todo_bien",
    "solicitud_aprobada",
    "solicitud_rechazada",
)
# Spec 001 §5 (fija en la v1, AC-36.7): (permiso, mesero, capitán). El dueño puede todo y no
# tiene filas: opera desde su panel (AC-36.6). `editar_orden` y `cambiar_permisos_meseros`
# son de la v1.1 y ya quedan sembrados (costura, Spec 001 §7).
PERMISOS = (
    ("cerrar_cuenta_comensal", True, True),
    ("cerrar_cuentas_mesa", True, True),
    ("validar_pago", True, True),
    ("mesa_limpia", True, True),
    ("reabrir", True, True),
    ("cancelar_item", True, True),
    ("pasar_cuenta", True, True),
    ("quitar_comensal", True, True),
    ("resolver_solicitud", True, True),
    ("cambiar_entrada", False, True),
    ("liberar_con_cargos", False, False),
    ("regenerar_codigo", False, False),
    ("marcar_agotado", True, True),
    ("editar_orden", True, True),
    ("cambiar_permisos_meseros", False, False),
)

# Tablas que observa el disparador de avisos (03 §2.4, lista cerrada).
TABLAS_CON_AVISO = (
    "sesion_grupal",
    "miembro_sesion",
    "orden_personal",
    "item_orden",
    "comanda",
    "comanda_orden",
    "llamada_mesero",
    "reparto_cargo",
    "movimiento_cargo",
    "solicitud_entrada",
    "marca_ciclo",
    "mesa",
    "restaurante",
    "ajuste_restaurante",
    "permiso_rol",
)
# `personal_restaurante` avisa sólo por lo que revalida la línea del personal (AC-40.11), no
# por cada intento de PIN ni por `ultimo_acceso_en`.
COLUMNAS_AVISO_PERSONAL = ("activo", "rol", "sesiones_desde", "nombre")
# `sesion_grupal` avisa por toda columna salvo `ultima_actividad_en` (la escriben `entrar` al
# reanudar y el alias, sin cambiar lo que se ve). Toda columna nueva de `sesion_grupal` entra
# aquí: `tests/integration/test_disparador_avisos.py` lo compara con el catálogo.
COLUMNAS_AVISO_SESION = (
    "id",
    "mesa_id",
    "restaurante_id",
    "estado",
    "inicio",
    "fin",
    "cerrada_por_personal_id",
    "entrada_cerrada",
    "liberada_sin_pago",
    "cuenta_cerrada_en",
    "pagada_en",
    "cerrada_por_usuario_id",
)


def _lista(valores: Sequence[str]) -> str:
    return ", ".join(f"'{v}'" for v in valores)


def _valores_permisos(restaurante: str) -> str:
    """`SELECT` con una fila por rol y permiso para el restaurante dado (expresión SQL)."""
    filas = ", ".join(
        f"('{rol}', '{permiso}', {'true' if permitido else 'false'})"
        for permiso, mesero, capitan in PERMISOS
        for rol, permitido in (("mesero", mesero), ("capitan", capitan))
    )
    return (
        "INSERT INTO permiso_rol (restaurante_id, rol, permiso, permitido) "
        f"SELECT {restaurante}, v.rol::rol_personal, v.permiso, v.permitido "
        f"FROM (VALUES {filas}) AS v (rol, permiso, permitido)"
    )


# ---------------------------------------------------------------------------
# Funciones y triggers
# ---------------------------------------------------------------------------

# INV-3, ajustada una vez (ADR-017 punto 8). Igual que en 0001, salvo dos salidas:
# - el paso de un ítem `vigente` a `cancelado_personal` sin cambiar ninguna otra columna (se
#   comparan las filas como JSON sin las columnas de la cancelación, así que una columna futura
#   queda inmutable sin tocar esto), **con autor** (una persona o un operador, ADR-017 punto 11) y
#   sólo si ninguna comanda de su orden la empezó la cocina. Las comandas se leen con
#   `FOR SHARE`: un `atender` concurrente espera a que esto confirme, y una cancelación que llega
#   después de `atender` lo ve y falla;
# - el `SET NULL` de un autor (`pedido_por_miembro_id`, `cancelado_por_*`) cuando una llave
#   foránea lo hace en cascada (`pg_trigger_depth() > 1`); escrito a mano, sigue prohibido.
# Fuera de la orden confirmada también se exige el autor al cancelar.
COLUMNAS_CANCELACION = (
    "estado",
    "cancelado_en",
    "cancelado_por_personal_id",
    "cancelado_por_usuario_id",
)
COLUMNAS_AUTOR_ITEM = (
    "pedido_por_miembro_id",
    "cancelado_por_personal_id",
    "cancelado_por_usuario_id",
)
SQL_FN_ITEM_ORDEN_INMUTABLE = f"""
CREATE OR REPLACE FUNCTION fn_item_orden_inmutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_bloqueada BOOLEAN;
    v_estado_comanda estado_comanda;
BEGIN
    IF TG_OP <> 'DELETE'
        AND NEW.estado = 'cancelado_personal'
        AND (TG_OP = 'INSERT' OR OLD.estado <> 'cancelado_personal')
        AND num_nonnulls(NEW.cancelado_por_personal_id, NEW.cancelado_por_usuario_id) <> 1
    THEN
        RAISE EXCEPTION 'Cancelar un ítem exige quién lo canceló (ADR-017 punto 11)'
            USING ERRCODE = 'check_violation';
    END IF;

    IF TG_OP = 'UPDATE'
        AND pg_trigger_depth() > 1
        AND (to_jsonb(NEW) - ARRAY[{_lista(COLUMNAS_AUTOR_ITEM)}])
            = (to_jsonb(OLD) - ARRAY[{_lista(COLUMNAS_AUTOR_ITEM)}])
        AND (NEW.pedido_por_miembro_id IS NULL
             OR NEW.pedido_por_miembro_id = OLD.pedido_por_miembro_id)
        AND (NEW.cancelado_por_personal_id IS NULL
             OR NEW.cancelado_por_personal_id = OLD.cancelado_por_personal_id)
        AND (NEW.cancelado_por_usuario_id IS NULL
             OR NEW.cancelado_por_usuario_id = OLD.cancelado_por_usuario_id)
    THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE'
        AND NEW.orden_id = OLD.orden_id
        AND OLD.estado = 'vigente'
        AND NEW.estado = 'cancelado_personal'
        AND (to_jsonb(NEW) - ARRAY[{_lista(COLUMNAS_CANCELACION)}])
            = (to_jsonb(OLD) - ARRAY[{_lista(COLUMNAS_CANCELACION)}])
    THEN
        PERFORM 1 FROM orden_personal WHERE id = NEW.orden_id FOR SHARE;
        FOR v_estado_comanda IN
            SELECT c.estado FROM comanda c
            JOIN comanda_orden co ON co.comanda_id = c.id
            WHERE co.orden_id = NEW.orden_id
            FOR SHARE OF c
        LOOP
            IF v_estado_comanda IN ('atendida', 'servida') THEN
                RAISE EXCEPTION 'La cocina ya empezó la comanda de este ítem (INV-3)'
                    USING ERRCODE = 'check_violation';
            END IF;
        END LOOP;
        RETURN NEW;
    END IF;

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
# El cuerpo de 0001, para `downgrade()`.
SQL_FN_ITEM_ORDEN_INMUTABLE_0001 = """
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

# AC-35.1/35.2 y ADR-017 punto 11: una marca nace con su autor y no se sobrescribe ni se borra.
# Sólo una llave foránea en cascada (`pg_trigger_depth() > 1`) puede poner un autor en NULL (se
# borró la persona o el usuario) o borrar la marca (se purgó la sesión, 03 §7); escrito a mano,
# no.
COLUMNAS_AUTOR_MARCA = ("autor_personal_id", "autor_usuario_id")
SQL_FN_MARCA_CICLO_INMUTABLE = f"""
CREATE OR REPLACE FUNCTION fn_marca_ciclo_inmutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- «Sin sobrescribir» es también «sin inventar»: la hora es la de la transacción que
        -- escribe la marca, nunca una que traiga quien la escribe (AC-35.2).
        NEW.ocurrido_en := now();
        IF (NEW.autor = 'personal' AND NEW.autor_personal_id IS NULL)
            OR (NEW.autor = 'operador' AND NEW.autor_usuario_id IS NULL)
        THEN
            RAISE EXCEPTION 'Una marca del personal o del operador exige quién (AC-35.1)'
                USING ERRCODE = 'check_violation';
        END IF;
        RETURN NEW;
    END IF;
    IF pg_trigger_depth() > 1 THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        IF (to_jsonb(NEW) - ARRAY[{_lista(COLUMNAS_AUTOR_MARCA)}])
                = (to_jsonb(OLD) - ARRAY[{_lista(COLUMNAS_AUTOR_MARCA)}])
            AND (NEW.autor_personal_id IS NULL OR NEW.autor_personal_id = OLD.autor_personal_id)
            AND (NEW.autor_usuario_id IS NULL OR NEW.autor_usuario_id = OLD.autor_usuario_id)
        THEN
            RETURN NEW;
        END IF;
    END IF;
    RAISE EXCEPTION 'Una marca de tiempo no se sobrescribe ni se borra (AC-35.2)'
        USING ERRCODE = 'check_violation';
END;
$$;
"""
SQL_TR_MARCA_CICLO_INMUTABLE = """
CREATE TRIGGER tr_marca_ciclo_inmutable
    BEFORE INSERT OR UPDATE OR DELETE ON marca_ciclo
    FOR EACH ROW EXECUTE FUNCTION fn_marca_ciclo_inmutable();
"""

# INV-10 en las columnas de 0004 que no pueden ser una FK compuesta porque su tabla no guarda
# la clave (`item_orden` y `miembro_sesion` no tienen `restaurante_id`; el ítem no guarda su
# sesión): la persona del personal es del restaurante de la sesión, el miembro que pidió es de
# la sesión de la orden y el cargo repartido o movido es de la sesión de la fila. Las filas de
# las que depende se leen con `FOR SHARE` (una mudanza concurrente espera). Sesión, orden y
# miembro no cambian de sesión ni de restaurante (0001, 0002 y aquí `reparto_cargo` y
# `movimiento_cargo`); la persona sí podría, de ahí el candado.
SQL_FN_MISMA_SESION_0004 = """
CREATE OR REPLACE FUNCTION fn_autores_de_la_sesion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_fila JSONB := to_jsonb(NEW);
    v_sesion UUID;
    v_restaurante UUID;
    v_columna TEXT;
    v_id UUID;
    v_de UUID;
BEGIN
    IF TG_TABLE_NAME = 'item_orden' THEN
        SELECT o.sesion_id INTO v_sesion FROM orden_personal o WHERE o.id = NEW.orden_id;
    ELSIF TG_TABLE_NAME = 'miembro_sesion' THEN
        v_sesion := NEW.sesion_id;
    ELSE
        v_sesion := (v_fila ->> 'sesion_id')::UUID;
    END IF;
    IF v_sesion IS NULL THEN
        RETURN NEW;  -- falla la llave foránea, que es el error verdadero
    END IF;
    SELECT s.restaurante_id INTO v_restaurante FROM sesion_grupal s WHERE s.id = v_sesion;

    -- Personas del personal (TG_ARGV): del restaurante de la sesión.
    FOR i IN 0 .. TG_NARGS - 1 LOOP
        v_columna := TG_ARGV[i];
        v_id := (v_fila ->> v_columna)::UUID;
        CONTINUE WHEN v_id IS NULL;
        IF v_columna LIKE '%_por_personal_id' THEN
            SELECT p.restaurante_id INTO v_de FROM personal_restaurante p WHERE p.id = v_id FOR SHARE;
            IF v_de IS DISTINCT FROM v_restaurante THEN
                RAISE EXCEPTION '% es de otro restaurante (INV-10)', v_columna
                    USING ERRCODE = 'foreign_key_violation';
            END IF;
        ELSIF v_columna = 'pedido_por_miembro_id' THEN
            SELECT m.sesion_id INTO v_de FROM miembro_sesion m WHERE m.id = v_id;
            IF v_de IS DISTINCT FROM v_sesion THEN
                RAISE EXCEPTION 'El miembro que pidió es de otra sesión (INV-10)'
                    USING ERRCODE = 'foreign_key_violation';
            END IF;
        ELSIF v_columna = 'item_id' THEN
            SELECT o.sesion_id INTO v_de FROM item_orden it
            JOIN orden_personal o ON o.id = it.orden_id WHERE it.id = v_id;
            IF v_de IS DISTINCT FROM v_sesion THEN
                RAISE EXCEPTION 'El cargo es de otra sesión (INV-10)'
                    USING ERRCODE = 'foreign_key_violation';
            END IF;
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$;
"""
# (trigger, tabla, eventos, columnas que comprueba)
TRIGGERS_MISMA_SESION = (
    (
        "tr_item_orden_autores",
        "item_orden",
        "INSERT OR UPDATE OF orden_id, pedido_por_miembro_id, cancelado_por_personal_id",
        ("pedido_por_miembro_id", "cancelado_por_personal_id"),
    ),
    (
        "tr_miembro_sesion_autores",
        "miembro_sesion",
        "INSERT OR UPDATE OF cuenta_cerrada_por_personal_id, pago_validado_por_personal_id",
        ("cuenta_cerrada_por_personal_id", "pago_validado_por_personal_id"),
    ),
    (
        "tr_reparto_cargo_autores",
        "reparto_cargo",
        "INSERT OR UPDATE OF item_id",
        ("item_id",),
    ),
    (
        "tr_movimiento_cargo_autores",
        "movimiento_cargo",
        "INSERT OR UPDATE OF item_id, propuesto_por_personal_id",
        ("item_id", "propuesto_por_personal_id"),
    ),
)


def _sql_tr_misma_sesion(trigger: str, tabla: str, eventos: str, columnas: Sequence[str]) -> str:
    argumentos = ", ".join(f"'{c}'" for c in columnas)
    return (
        f"CREATE TRIGGER {trigger} BEFORE {eventos} ON {tabla} "
        f"FOR EACH ROW EXECUTE FUNCTION fn_autores_de_la_sesion({argumentos})"
    )


# La solicitud no se muda: ni de restaurante ni de mesa (como `sesion_grupal` en 0002), y su
# miembro es de su sesión. Cuando la cascada anula la sesión (se borró), el miembro no cambia y
# se acepta: la FK del miembro lo anula después, al borrarse los miembros de esa sesión.
SQL_FN_SOLICITUD_COHERENTE = """
CREATE OR REPLACE FUNCTION fn_solicitud_entrada_coherente()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF TG_OP = 'UPDATE'
        AND (NEW.restaurante_id IS DISTINCT FROM OLD.restaurante_id
             OR NEW.mesa_id IS DISTINCT FROM OLD.mesa_id)
    THEN
        RAISE EXCEPTION 'Una solicitud no cambia de mesa ni de restaurante (INV-10)'
            USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.miembro_id IS NOT NULL
        AND (TG_OP = 'INSERT'
             OR NEW.miembro_id IS DISTINCT FROM OLD.miembro_id
             OR (NEW.sesion_id IS DISTINCT FROM OLD.sesion_id AND NEW.sesion_id IS NOT NULL))
        AND NEW.sesion_id IS DISTINCT FROM (
            SELECT m.sesion_id FROM miembro_sesion m WHERE m.id = NEW.miembro_id)
    THEN
        RAISE EXCEPTION 'El miembro de una solicitud es de su sesión (INV-10)'
            USING ERRCODE = 'foreign_key_violation';
    END IF;
    RETURN NEW;
END;
$$;
"""
SQL_TR_SOLICITUD_COHERENTE = """
CREATE TRIGGER tr_solicitud_entrada_coherente
    BEFORE INSERT OR UPDATE ON solicitud_entrada
    FOR EACH ROW EXECUTE FUNCTION fn_solicitud_entrada_coherente();
"""
# `sesion_id` inmutable en las tablas del reparto (la función es de 0001).
TRIGGERS_SESION_INMUTABLE = (
    ("tr_reparto_cargo_sesion_inmutable", "reparto_cargo"),
    ("tr_movimiento_cargo_sesion_inmutable", "movimiento_cargo"),
)


# AC-36.4: todo restaurante nace con sus ajustes del piloto y la tabla de permisos de §5, lo
# cree quien lo cree (también el código de la Fase 2, que no sabe de estas tablas).
SQL_FN_RESTAURANTE_SIEMBRA = f"""
CREATE OR REPLACE FUNCTION fn_restaurante_siembra()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    INSERT INTO ajuste_restaurante (restaurante_id) VALUES (NEW.id);
    {_valores_permisos("NEW.id")};
    RETURN NULL;
END;
$$;
"""
SQL_TR_RESTAURANTE_SIEMBRA = """
CREATE TRIGGER tr_restaurante_siembra
    AFTER INSERT ON restaurante
    FOR EACH ROW EXECUTE FUNCTION fn_restaurante_siembra();
"""

# ADR-018 punto 1 y 03 §2.4. `SECURITY INVOKER` (por omisión) y `search_path` fijo; el aviso
# lleva sólo un id de la propia fila (o de su padre, leído por llave: `item_orden` y
# `comanda_orden` no guardan la sesión), siempre convertido a `uuid` antes de ser texto: nunca
# un texto calculado de otra fuente. `pg_notify` pliega los avisos iguales de una transacción
# y los entrega al confirmar; si se deshace, no sale ninguno. Un UPDATE avisa por la fila vieja
# y por la nueva (sólo difieren si cambia una clave). Al borrar en cascada el padre ya no
# existe: el aviso que dependa de él se omite, y el del padre ya salió por su propio trigger.
SQL_FN_AVISAR_CAMBIO = f"""
CREATE OR REPLACE FUNCTION fn_avisar_cambio()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_filas JSONB[] := ARRAY[]::JSONB[];
    v_fila JSONB;
    v_sesion UUID;
    v_restaurante UUID;
    v_viva UUID;
BEGIN
    IF TG_OP <> 'DELETE' THEN
        v_filas := v_filas || to_jsonb(NEW);
    END IF;
    IF TG_OP <> 'INSERT' THEN
        v_filas := v_filas || to_jsonb(OLD);
    END IF;

    FOREACH v_fila IN ARRAY v_filas LOOP
        v_sesion := NULL;
        v_restaurante := NULL;
        CASE TG_TABLE_NAME
            WHEN 'sesion_grupal' THEN
                v_sesion := (v_fila ->> 'id')::UUID;
                v_restaurante := (v_fila ->> 'restaurante_id')::UUID;
            WHEN 'comanda', 'llamada_mesero', 'solicitud_entrada', 'marca_ciclo' THEN
                v_sesion := (v_fila ->> 'sesion_id')::UUID;
                v_restaurante := (v_fila ->> 'restaurante_id')::UUID;
            WHEN 'miembro_sesion', 'orden_personal', 'reparto_cargo', 'movimiento_cargo' THEN
                v_sesion := (v_fila ->> 'sesion_id')::UUID;
            WHEN 'item_orden' THEN
                SELECT o.sesion_id INTO v_sesion
                FROM orden_personal o WHERE o.id = (v_fila ->> 'orden_id')::UUID;
            WHEN 'comanda_orden' THEN
                SELECT c.sesion_id, c.restaurante_id INTO v_sesion, v_restaurante
                FROM comanda c WHERE c.id = (v_fila ->> 'comanda_id')::UUID;
            WHEN 'mesa' THEN
                v_restaurante := (v_fila ->> 'restaurante_id')::UUID;
                FOR v_viva IN
                    SELECT s.id FROM sesion_grupal s
                    WHERE s.mesa_id = (v_fila ->> 'id')::UUID AND s.estado IN ({_lista(VIVOS)})
                LOOP
                    PERFORM pg_notify('carta_mesa', v_viva::TEXT);
                END LOOP;
            WHEN 'restaurante', 'ajuste_restaurante' THEN
                v_restaurante := COALESCE(v_fila ->> 'restaurante_id', v_fila ->> 'id')::UUID;
                FOR v_viva IN
                    SELECT s.id FROM sesion_grupal s
                    WHERE s.restaurante_id = v_restaurante AND s.estado IN ({_lista(VIVOS)})
                LOOP
                    PERFORM pg_notify('carta_mesa', v_viva::TEXT);
                END LOOP;
            WHEN 'personal_restaurante', 'permiso_rol' THEN
                v_restaurante := (v_fila ->> 'restaurante_id')::UUID;
            ELSE
                RAISE EXCEPTION 'Tabla sin canal de avisos: %', TG_TABLE_NAME;
        END CASE;

        IF v_restaurante IS NULL AND v_sesion IS NOT NULL THEN
            SELECT s.restaurante_id INTO v_restaurante FROM sesion_grupal s WHERE s.id = v_sesion;
        END IF;
        IF v_sesion IS NOT NULL THEN
            PERFORM pg_notify('carta_mesa', v_sesion::TEXT);
        END IF;
        IF v_restaurante IS NOT NULL THEN
            PERFORM pg_notify('carta_restaurante', v_restaurante::TEXT);
        END IF;
    END LOOP;
    RETURN NULL;
END;
$$;
"""


def _sql_tr_aviso(tabla: str) -> str:
    if tabla == "personal_restaurante":
        eventos = f"INSERT OR DELETE OR UPDATE OF {', '.join(COLUMNAS_AVISO_PERSONAL)}"
    elif tabla == "sesion_grupal":
        eventos = f"INSERT OR DELETE OR UPDATE OF {', '.join(COLUMNAS_AVISO_SESION)}"
    else:
        eventos = "INSERT OR UPDATE OR DELETE"
    return (
        f"CREATE TRIGGER tr_aviso_{tabla} AFTER {eventos} ON {tabla} "
        "FOR EACH ROW EXECUTE FUNCTION fn_avisar_cambio()"
    )


TABLAS_TRIGGER_AVISO = (*TABLAS_CON_AVISO, "personal_restaurante")
FUNCIONES_NUEVAS = (
    "fn_avisar_cambio",
    "fn_restaurante_siembra",
    "fn_marca_ciclo_inmutable",
    "fn_autores_de_la_sesion",
    "fn_solicitud_entrada_coherente",
)


# ---------------------------------------------------------------------------
# Columnas repetidas
# ---------------------------------------------------------------------------


def _id() -> sa.Column:
    return sa.Column(
        "id",
        postgresql.UUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("gen_random_uuid()"),
    )


def _uuid(nombre: str, *, nullable: bool = True) -> sa.Column:
    return sa.Column(nombre, postgresql.UUID(as_uuid=True), nullable=nullable)


def _marca(nombre: str, *, ahora: bool = False) -> sa.Column:
    if ahora:
        return sa.Column(
            nombre, sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        )
    return sa.Column(nombre, sa.DateTime(timezone=True), nullable=True)


def _fk_usuario(tabla: str, columna: str) -> sa.ForeignKeyConstraint:
    return sa.ForeignKeyConstraint(
        [columna], ["usuario.id"], name=f"fk_{tabla}_{columna}", ondelete="SET NULL"
    )


def _fk_personal_simple(tabla: str, columna: str) -> sa.ForeignKeyConstraint:
    return sa.ForeignKeyConstraint(
        [columna], ["personal_restaurante.id"], name=f"fk_{tabla}_{columna}", ondelete="SET NULL"
    )


def _fk_personal_inquilino(tabla: str, columna: str) -> sa.ForeignKeyConstraint:
    """INV-10: `(columna, restaurante_id) → personal_restaurante(id, restaurante_id)`."""
    return sa.ForeignKeyConstraint(
        [columna, "restaurante_id"],
        ["personal_restaurante.id", "personal_restaurante.restaurante_id"],
        name=f"fk_{tabla}_{columna}",
        ondelete=f"SET NULL ({columna})",
    )


def _check(tabla: str, nombre: str, condicion: str) -> None:
    """CHECK en una tabla existente: `NOT VALID` y después `VALIDATE` (no bloquea escrituras
    mientras recorre la tabla, skill `/migracion`)."""
    op.execute(f"ALTER TABLE {tabla} ADD CONSTRAINT {nombre} CHECK ({condicion}) NOT VALID")
    op.execute(f"ALTER TABLE {tabla} VALIDATE CONSTRAINT {nombre}")


def _cambiar_check(tabla: str, nombre: str, condicion: str) -> None:
    op.execute(f"ALTER TABLE {tabla} DROP CONSTRAINT {nombre}")
    _check(tabla, nombre, condicion)


def _indice_vivo(estados: Sequence[str]) -> None:
    """INV-1 sobre la lista de estados vivos. Se construye con otro nombre, se borra el viejo y
    se renombra: en ningún momento falta el índice único."""
    op.execute(
        "CREATE UNIQUE INDEX uq_sesion_viva_por_mesa_nuevo ON sesion_grupal (mesa_id) "
        f"WHERE estado IN ({_lista(estados)})"
    )
    op.execute("DROP INDEX uq_sesion_viva_por_mesa")
    op.execute("ALTER INDEX uq_sesion_viva_por_mesa_nuevo RENAME TO uq_sesion_viva_por_mesa")


# ---------------------------------------------------------------------------
# upgrade / downgrade
# ---------------------------------------------------------------------------


def upgrade() -> None:
    # --- restaurante: horario, zona horaria y ajuste fuera de horario (US-38) ---------------
    op.add_column(
        "restaurante",
        sa.Column(
            "zona_horaria",
            sa.String(64),
            server_default="America/Mexico_City",
            nullable=False,
        ),
    )
    op.add_column(
        "restaurante",
        sa.Column(
            "fuera_de_horario",
            sa.String(20),
            server_default="pedir_aprobacion",
            nullable=False,
        ),
    )
    _check("restaurante", "ck_restaurante_zona_horaria", "length(btrim(zona_horaria)) > 0")
    _check(
        "restaurante",
        "ck_restaurante_fuera_de_horario",
        "fuera_de_horario IN ('pedir_aprobacion', 'rechazar')",
    )
    _check("restaurante", "ck_restaurante_horarios_objeto", "jsonb_typeof(horarios) = 'object'")

    # --- sesion_grupal: estados vivos del ciclo, entrada y liberación (US-29, US-33) ---------
    _cambiar_check(
        "sesion_grupal", "ck_sesion_grupal_estado", f"estado IN ({_lista(ESTADOS_SESION)})"
    )
    _indice_vivo(VIVOS)
    for columna in ("entrada_cerrada", "liberada_sin_pago"):
        op.add_column(
            "sesion_grupal",
            sa.Column(columna, sa.Boolean(), server_default=sa.text("false"), nullable=False),
        )
    op.add_column("sesion_grupal", _marca("cuenta_cerrada_en"))
    op.add_column("sesion_grupal", _marca("pagada_en"))
    op.add_column("sesion_grupal", _uuid("cerrada_por_usuario_id"))
    op.create_foreign_key(
        "fk_sesion_grupal_cerrada_por_usuario_id",
        "sesion_grupal",
        "usuario",
        ["cerrada_por_usuario_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("idx_sesion_cerrada_por_usuario", "sesion_grupal", ["cerrada_por_usuario_id"])
    _check(
        "sesion_grupal",
        "ck_sesion_grupal_liberada",
        "NOT liberada_sin_pago OR estado = 'cerrada'",
    )
    _check(
        "sesion_grupal",
        "ck_sesion_grupal_marcas_ciclo",
        "(estado <> 'cuenta_cerrada' OR cuenta_cerrada_en IS NOT NULL) "
        "AND (estado <> 'pagada' OR pagada_en IS NOT NULL)",
    )

    # --- miembro_sesion: estado de la cuenta y propina declarada (US-29, US-37) -------------
    _cambiar_check(
        "miembro_sesion", "ck_miembro_sesion_estado", f"estado IN ({_lista(ESTADOS_MIEMBRO)})"
    )
    op.add_column("miembro_sesion", sa.Column("propina_centavos", sa.Integer(), nullable=True))
    for columna in ("cuenta_cerrada_en", "aviso_pagado_en", "pago_validado_en", "retirado_en"):
        op.add_column("miembro_sesion", _marca(columna))
    for accion in ("cuenta_cerrada", "pago_validado"):
        personal = f"{accion}_por_personal_id"
        usuario = f"{accion}_por_usuario_id"
        op.add_column("miembro_sesion", _uuid(personal))
        op.add_column("miembro_sesion", _uuid(usuario))
        op.create_foreign_key(
            f"fk_miembro_sesion_{personal}",
            "miembro_sesion",
            "personal_restaurante",
            [personal],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_foreign_key(
            f"fk_miembro_sesion_{usuario}",
            "miembro_sesion",
            "usuario",
            [usuario],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_index(f"idx_miembro_{personal}", "miembro_sesion", [personal])
        op.create_index(f"idx_miembro_{usuario}", "miembro_sesion", [usuario])
        _check(
            "miembro_sesion",
            f"ck_miembro_sesion_{accion}_un_autor",
            f"num_nonnulls({personal}, {usuario}) <= 1",
        )
    _check("miembro_sesion", "ck_miembro_sesion_propina", "propina_centavos >= 0")
    _check(
        "miembro_sesion",
        "ck_miembro_sesion_cuenta_cerrada",
        "estado NOT IN ('cuenta_cerrada', 'pagada') OR cuenta_cerrada_en IS NOT NULL",
    )
    _check(
        "miembro_sesion",
        "ck_miembro_sesion_pagada",
        "estado <> 'pagada' OR pago_validado_en IS NOT NULL",
    )
    _check(
        "miembro_sesion",
        "ck_miembro_sesion_retirado",
        "estado <> 'retirado' OR retirado_en IS NOT NULL",
    )

    # --- item_orden: quién pidió, origen y cancelado por el personal (US-31, costura) -------
    op.add_column("item_orden", _uuid("pedido_por_miembro_id"))
    op.create_foreign_key(
        "fk_item_orden_pedido_por_miembro_id",
        "item_orden",
        "miembro_sesion",
        ["pedido_por_miembro_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("idx_item_pedido_por", "item_orden", ["pedido_por_miembro_id"])
    op.add_column(
        "item_orden",
        sa.Column("origen", sa.String(12), server_default="comensal", nullable=False),
    )
    op.add_column(
        "item_orden",
        sa.Column("estado", sa.String(20), server_default="vigente", nullable=False),
    )
    op.add_column("item_orden", _marca("cancelado_en"))
    op.add_column("item_orden", _uuid("cancelado_por_personal_id"))
    op.add_column("item_orden", _uuid("cancelado_por_usuario_id"))
    op.create_foreign_key(
        "fk_item_orden_cancelado_por_personal_id",
        "item_orden",
        "personal_restaurante",
        ["cancelado_por_personal_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_item_orden_cancelado_por_usuario_id",
        "item_orden",
        "usuario",
        ["cancelado_por_usuario_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("idx_item_cancelado_por_personal", "item_orden", ["cancelado_por_personal_id"])
    op.create_index("idx_item_cancelado_por_usuario", "item_orden", ["cancelado_por_usuario_id"])
    _check("item_orden", "ck_item_orden_origen", "origen IN ('comensal', 'personal')")
    _check(
        "item_orden",
        "ck_item_orden_cancelado",
        "(estado = 'vigente' AND cancelado_en IS NULL AND cancelado_por_personal_id IS NULL "
        "AND cancelado_por_usuario_id IS NULL) OR (estado = 'cancelado_personal' "
        "AND cancelado_en IS NOT NULL "
        "AND num_nonnulls(cancelado_por_personal_id, cancelado_por_usuario_id) <= 1)",
    )
    op.execute(SQL_FN_ITEM_ORDEN_INMUTABLE)

    # --- comanda: destino de la FK compuesta de `marca_ciclo` (INV-10) -----------------------
    # Índice único sobre una tabla con filas: bloquea escrituras en `comanda` mientras se
    # construye (casi vacía en producción: la Fase 2 no crea comandas). `sesion_id` ya es
    # inmutable en `comanda` (0001).
    op.create_unique_constraint("uq_comanda_id_sesion_id", "comanda", ["id", "sesion_id"])

    # --- tablas nuevas ----------------------------------------------------------------------
    op.create_table(
        "ajuste_restaurante",
        sa.Column("restaurante_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("max_comensales", sa.SmallInteger(), server_default="12", nullable=False),
        sa.Column("estatus_amarillo_min", sa.SmallInteger(), server_default="20", nullable=False),
        sa.Column("estatus_rojo_min", sa.SmallInteger(), server_default="40", nullable=False),
        sa.Column("recordatorio_min", sa.SmallInteger(), server_default="30", nullable=False),
        sa.Column("rojo_aprobacion_min", sa.SmallInteger(), server_default="120", nullable=False),
        sa.Column("solicitudes_por_mesa", sa.SmallInteger(), server_default="5", nullable=False),
        sa.Column(
            "solicitudes_por_restaurante", sa.SmallInteger(), server_default="20", nullable=False
        ),
        sa.Column("vigencia_solicitud_min", sa.SmallInteger(), server_default="10", nullable=False),
        _marca("actualizado_en", ahora=True),
        sa.ForeignKeyConstraint(
            ["restaurante_id"],
            ["restaurante.id"],
            name="fk_ajuste_restaurante_restaurante_id",
            ondelete="CASCADE",
        ),
        sa.CheckConstraint("max_comensales BETWEEN 1 AND 12", name="ck_ajuste_max_comensales"),
        sa.CheckConstraint(
            "estatus_amarillo_min > 0 AND estatus_rojo_min > estatus_amarillo_min",
            name="ck_ajuste_estatus",
        ),
        sa.CheckConstraint(
            "recordatorio_min > 0 AND rojo_aprobacion_min > 0 AND vigencia_solicitud_min > 0",
            name="ck_ajuste_minutos",
        ),
        sa.CheckConstraint(
            "solicitudes_por_mesa > 0 AND solicitudes_por_restaurante >= solicitudes_por_mesa",
            name="ck_ajuste_solicitudes",
        ),
        sa.PrimaryKeyConstraint("restaurante_id", name="pk_ajuste_restaurante"),
    )

    rol_personal = postgresql.ENUM("mesero", "capitan", name="rol_personal", create_type=False)
    op.create_table(
        "permiso_rol",
        sa.Column("restaurante_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rol", rol_personal, nullable=False),
        sa.Column("permiso", sa.String(40), nullable=False),
        sa.Column("permitido", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(
            ["restaurante_id"],
            ["restaurante.id"],
            name="fk_permiso_rol_restaurante_id",
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            f"permiso IN ({_lista([p for p, _, _ in PERMISOS])})", name="ck_permiso_rol_permiso"
        ),
        sa.PrimaryKeyConstraint("restaurante_id", "rol", "permiso", name="pk_permiso_rol"),
    )

    op.create_table(
        "solicitud_entrada",
        _id(),
        sa.Column("restaurante_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("mesa_id", postgresql.UUID(as_uuid=True), nullable=False),
        _uuid("sesion_id"),
        sa.Column("alias", sa.String(24), nullable=False),
        sa.Column("motivo", sa.String(20), nullable=False),
        sa.Column("estado", sa.String(12), server_default="pendiente", nullable=False),
        _marca("creada_en", ahora=True),
        sa.Column("vence_en", sa.DateTime(timezone=True), nullable=False),
        _marca("resuelta_en"),
        _uuid("resuelta_por_personal_id"),
        _uuid("resuelta_por_usuario_id"),
        _uuid("miembro_id"),
        sa.ForeignKeyConstraint(
            ["restaurante_id"],
            ["restaurante.id"],
            name="fk_solicitud_entrada_restaurante_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["mesa_id", "restaurante_id"],
            ["mesa.id", "mesa.restaurante_id"],
            name="fk_solicitud_entrada_mesa_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["sesion_id", "restaurante_id"],
            ["sesion_grupal.id", "sesion_grupal.restaurante_id"],
            name="fk_solicitud_entrada_sesion_id",
            ondelete="SET NULL (sesion_id)",
        ),
        _fk_personal_inquilino("solicitud_entrada", "resuelta_por_personal_id"),
        _fk_usuario("solicitud_entrada", "resuelta_por_usuario_id"),
        # Simple y no compuesta: al borrar la sesión, su FK anula `sesion_id` antes de que se
        # borren sus miembros, y una compuesta `(miembro_id, sesion_id)` ya no encontraría la
        # fila y dejaría `miembro_id` colgando. Que el miembro sea de la sesión de la solicitud
        # lo comprueba `tr_solicitud_entrada_coherente` (INV-10).
        sa.ForeignKeyConstraint(
            ["miembro_id"],
            ["miembro_sesion.id"],
            name="fk_solicitud_entrada_miembro_id",
            ondelete="SET NULL",
        ),
        sa.CheckConstraint("length(btrim(alias)) > 0", name="ck_solicitud_alias"),
        sa.CheckConstraint(
            "motivo IN ('entrada_cerrada', 'rojo', 'fuera_de_horario')", name="ck_solicitud_motivo"
        ),
        sa.CheckConstraint(
            "estado IN ('pendiente', 'aprobada', 'rechazada', 'vencida')",
            name="ck_solicitud_estado",
        ),
        sa.CheckConstraint(
            "(estado = 'pendiente') = (resuelta_en IS NULL) "
            "AND num_nonnulls(resuelta_por_personal_id, resuelta_por_usuario_id) <= 1",
            name="ck_solicitud_resuelta",
        ),
        sa.CheckConstraint("vence_en > creada_en", name="ck_solicitud_vence"),
        sa.PrimaryKeyConstraint("id", name="pk_solicitud_entrada"),
    )
    op.create_index(
        "idx_solicitud_restaurante", "solicitud_entrada", ["restaurante_id", "creada_en"]
    )
    op.create_index("idx_solicitud_mesa", "solicitud_entrada", ["mesa_id", "creada_en"])
    op.create_index("idx_solicitud_sesion", "solicitud_entrada", ["sesion_id"])
    op.create_index(
        "idx_solicitud_resuelta_por_personal", "solicitud_entrada", ["resuelta_por_personal_id"]
    )
    op.create_index(
        "idx_solicitud_resuelta_por_usuario", "solicitud_entrada", ["resuelta_por_usuario_id"]
    )
    op.create_index("idx_solicitud_miembro", "solicitud_entrada", ["miembro_id"])
    op.create_index(
        "idx_solicitud_pendiente",
        "solicitud_entrada",
        ["restaurante_id", "mesa_id"],
        postgresql_where=sa.text("estado = 'pendiente'"),
    )
    # Purga de 03 §7: 24 h después de vencer su plazo (las resueltas antes esperan, como mucho,
    # la vigencia de 10 min de más).
    op.create_index("idx_solicitud_purga", "solicitud_entrada", ["vence_en"])

    op.create_table(
        "marca_ciclo",
        _id(),
        sa.Column("restaurante_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sesion_id", postgresql.UUID(as_uuid=True), nullable=False),
        _uuid("miembro_id"),
        _uuid("comanda_id"),
        sa.Column("paso", sa.String(30), nullable=False),
        sa.Column("autor", sa.String(10), nullable=False),
        _uuid("autor_personal_id"),
        _uuid("autor_usuario_id"),
        _marca("ocurrido_en", ahora=True),
        sa.ForeignKeyConstraint(
            ["restaurante_id"],
            ["restaurante.id"],
            name="fk_marca_ciclo_restaurante_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["sesion_id", "restaurante_id"],
            ["sesion_grupal.id", "sesion_grupal.restaurante_id"],
            name="fk_marca_ciclo_sesion_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["miembro_id", "sesion_id"],
            ["miembro_sesion.id", "miembro_sesion.sesion_id"],
            name="fk_marca_ciclo_miembro_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["comanda_id", "sesion_id"],
            ["comanda.id", "comanda.sesion_id"],
            name="fk_marca_ciclo_comanda_id",
            ondelete="CASCADE",
        ),
        _fk_personal_inquilino("marca_ciclo", "autor_personal_id"),
        _fk_usuario("marca_ciclo", "autor_usuario_id"),
        sa.CheckConstraint(f"paso IN ({_lista(PASOS_CICLO)})", name="ck_marca_ciclo_paso"),
        sa.CheckConstraint(
            "(autor IN ('comensal', 'sistema') AND autor_personal_id IS NULL "
            "AND autor_usuario_id IS NULL) "
            "OR (autor = 'personal' AND autor_usuario_id IS NULL) "
            "OR (autor = 'operador' AND autor_personal_id IS NULL)",
            name="ck_marca_ciclo_autor",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_marca_ciclo"),
    )
    op.create_index("idx_marca_sesion", "marca_ciclo", ["sesion_id", "ocurrido_en"])
    op.create_index("idx_marca_restaurante", "marca_ciclo", ["restaurante_id", "ocurrido_en"])
    op.create_index("idx_marca_miembro", "marca_ciclo", ["miembro_id"])
    op.create_index("idx_marca_comanda", "marca_ciclo", ["comanda_id"])
    op.create_index("idx_marca_autor_personal", "marca_ciclo", ["autor_personal_id"])
    op.create_index("idx_marca_autor_usuario", "marca_ciclo", ["autor_usuario_id"])

    op.create_table(
        "reparto_cargo",
        _id(),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sesion_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("miembro_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("parte_pb", sa.Integer(), server_default="10000", nullable=False),
        sa.Column("posicion", sa.SmallInteger(), server_default="1", nullable=False),
        _marca("creado_en", ahora=True),
        sa.ForeignKeyConstraint(
            ["item_id"], ["item_orden.id"], name="fk_reparto_cargo_item_id", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["sesion_id"],
            ["sesion_grupal.id"],
            name="fk_reparto_cargo_sesion_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["miembro_id", "sesion_id"],
            ["miembro_sesion.id", "miembro_sesion.sesion_id"],
            name="fk_reparto_cargo_miembro_id",
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint("item_id", "miembro_id", name="uq_reparto_cargo_item_id_miembro_id"),
        sa.CheckConstraint("parte_pb BETWEEN 1 AND 10000", name="ck_reparto_cargo_parte"),
        sa.CheckConstraint("posicion >= 1", name="ck_reparto_cargo_posicion"),
        sa.PrimaryKeyConstraint("id", name="pk_reparto_cargo"),
    )
    op.create_index("idx_reparto_sesion", "reparto_cargo", ["sesion_id"])
    op.create_index("idx_reparto_miembro", "reparto_cargo", ["miembro_id"])

    op.create_table(
        "movimiento_cargo",
        _id(),
        sa.Column("sesion_id", postgresql.UUID(as_uuid=True), nullable=False),
        _uuid("item_id"),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("de_miembro_id", postgresql.UUID(as_uuid=True), nullable=False),
        _uuid("a_miembro_id"),
        _uuid("propuesto_por_personal_id"),
        _uuid("propuesto_por_usuario_id"),
        _uuid("propuesto_por_miembro_id"),
        _uuid("aceptado_por_miembro_id"),
        _marca("aceptado_en"),
        _marca("creado_en", ahora=True),
        sa.ForeignKeyConstraint(
            ["sesion_id"],
            ["sesion_grupal.id"],
            name="fk_movimiento_cargo_sesion_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["item_id"], ["item_orden.id"], name="fk_movimiento_cargo_item_id", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["de_miembro_id", "sesion_id"],
            ["miembro_sesion.id", "miembro_sesion.sesion_id"],
            name="fk_movimiento_cargo_de_miembro_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["a_miembro_id", "sesion_id"],
            ["miembro_sesion.id", "miembro_sesion.sesion_id"],
            name="fk_movimiento_cargo_a_miembro_id",
            ondelete="CASCADE",
        ),
        _fk_personal_simple("movimiento_cargo", "propuesto_por_personal_id"),
        _fk_usuario("movimiento_cargo", "propuesto_por_usuario_id"),
        sa.ForeignKeyConstraint(
            ["propuesto_por_miembro_id", "sesion_id"],
            ["miembro_sesion.id", "miembro_sesion.sesion_id"],
            name="fk_movimiento_cargo_propuesto_por_miembro_id",
            ondelete="SET NULL (propuesto_por_miembro_id)",
        ),
        sa.ForeignKeyConstraint(
            ["aceptado_por_miembro_id", "sesion_id"],
            ["miembro_sesion.id", "miembro_sesion.sesion_id"],
            name="fk_movimiento_cargo_aceptado_por_miembro_id",
            ondelete="SET NULL (aceptado_por_miembro_id)",
        ),
        sa.CheckConstraint("tipo IN ('pasar_cuenta', 'flotante')", name="ck_movimiento_cargo_tipo"),
        sa.CheckConstraint(
            "num_nonnulls(propuesto_por_personal_id, propuesto_por_usuario_id, "
            "propuesto_por_miembro_id) <= 1",
            name="ck_movimiento_cargo_proponente",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_movimiento_cargo"),
    )
    for columna in (
        "sesion_id",
        "item_id",
        "de_miembro_id",
        "a_miembro_id",
        "propuesto_por_personal_id",
        "propuesto_por_usuario_id",
        "propuesto_por_miembro_id",
        "aceptado_por_miembro_id",
    ):
        op.create_index(f"idx_movimiento_{columna}", "movimiento_cargo", [columna])

    # --- siembra de los restaurantes existentes y de los nuevos (AC-36.4) -------------------
    op.execute("INSERT INTO ajuste_restaurante (restaurante_id) SELECT id FROM restaurante")
    op.execute(_valores_permisos("r.id").replace("FROM (VALUES", "FROM restaurante r, (VALUES"))
    op.execute(SQL_FN_RESTAURANTE_SIEMBRA)
    op.execute(SQL_TR_RESTAURANTE_SIEMBRA)
    op.execute(SQL_FN_MARCA_CICLO_INMUTABLE)
    op.execute(SQL_TR_MARCA_CICLO_INMUTABLE)
    op.execute(SQL_FN_MISMA_SESION_0004)
    for trigger, tabla, eventos, columnas in TRIGGERS_MISMA_SESION:
        op.execute(_sql_tr_misma_sesion(trigger, tabla, eventos, columnas))
    op.execute(SQL_FN_SOLICITUD_COHERENTE)
    op.execute(SQL_TR_SOLICITUD_COHERENTE)
    for trigger, tabla in TRIGGERS_SESION_INMUTABLE:
        op.execute(
            f"CREATE TRIGGER {trigger} BEFORE UPDATE OF sesion_id ON {tabla} "
            "FOR EACH ROW EXECUTE FUNCTION fn_sesion_id_inmutable()"
        )

    # --- disparador de avisos (ADR-018), al final: la siembra de arriba no avisa ------------
    op.execute(SQL_FN_AVISAR_CAMBIO)
    for tabla in TABLAS_TRIGGER_AVISO:
        op.execute(_sql_tr_aviso(tabla))


def downgrade() -> None:
    for tabla in TABLAS_TRIGGER_AVISO:
        op.execute(f"DROP TRIGGER IF EXISTS tr_aviso_{tabla} ON {tabla}")
    op.execute("DROP TRIGGER IF EXISTS tr_marca_ciclo_inmutable ON marca_ciclo")
    for trigger, tabla, _eventos, _columnas in TRIGGERS_MISMA_SESION:
        op.execute(f"DROP TRIGGER IF EXISTS {trigger} ON {tabla}")
    op.execute("DROP TRIGGER IF EXISTS tr_solicitud_entrada_coherente ON solicitud_entrada")
    for trigger, tabla in TRIGGERS_SESION_INMUTABLE:
        op.execute(f"DROP TRIGGER IF EXISTS {trigger} ON {tabla}")
    op.execute("DROP TRIGGER IF EXISTS tr_restaurante_siembra ON restaurante")
    for funcion in FUNCIONES_NUEVAS:
        op.execute(f"DROP FUNCTION IF EXISTS {funcion}()")
    op.execute(SQL_FN_ITEM_ORDEN_INMUTABLE_0001)

    for tabla in (
        "movimiento_cargo",
        "reparto_cargo",
        "marca_ciclo",
        "solicitud_entrada",
        "permiso_rol",
        "ajuste_restaurante",
    ):
        op.drop_table(tabla)
    op.drop_constraint("uq_comanda_id_sesion_id", "comanda", type_="unique")

    # item_orden
    for nombre in ("ck_item_orden_cancelado", "ck_item_orden_origen"):
        op.drop_constraint(nombre, "item_orden", type_="check")
    for columna in (
        "cancelado_por_usuario_id",
        "cancelado_por_personal_id",
        "cancelado_en",
        "estado",
        "origen",
        "pedido_por_miembro_id",
    ):
        op.drop_column("item_orden", columna)  # sus índices y FK caen con la columna

    # miembro_sesion: una fila con un estado nuevo no cabría en el CHECK de 0003; vuelve a
    # `activo` (la información del ciclo se pierde al bajar, como las columnas).
    for nombre in (
        "ck_miembro_sesion_retirado",
        "ck_miembro_sesion_pagada",
        "ck_miembro_sesion_cuenta_cerrada",
        "ck_miembro_sesion_propina",
        "ck_miembro_sesion_pago_validado_un_autor",
        "ck_miembro_sesion_cuenta_cerrada_un_autor",
    ):
        op.drop_constraint(nombre, "miembro_sesion", type_="check")
    for columna in (
        "pago_validado_por_usuario_id",
        "pago_validado_por_personal_id",
        "cuenta_cerrada_por_usuario_id",
        "cuenta_cerrada_por_personal_id",
        "retirado_en",
        "pago_validado_en",
        "aviso_pagado_en",
        "cuenta_cerrada_en",
        "propina_centavos",
    ):
        op.drop_column("miembro_sesion", columna)
    op.execute(
        f"UPDATE miembro_sesion SET estado = 'activo' "
        f"WHERE estado NOT IN ({_lista(ESTADOS_MIEMBRO_ANTES)})"
    )
    _cambiar_check(
        "miembro_sesion",
        "ck_miembro_sesion_estado",
        f"estado IN ({_lista(ESTADOS_MIEMBRO_ANTES)})",
    )

    # sesion_grupal: una sesión «cuenta cerrada» o «pagada» vuelve a `activa` (sigue viva y el
    # código de la Fase 2 la ve como abierta).
    for nombre in ("ck_sesion_grupal_marcas_ciclo", "ck_sesion_grupal_liberada"):
        op.drop_constraint(nombre, "sesion_grupal", type_="check")
    for columna in (
        "cerrada_por_usuario_id",
        "pagada_en",
        "cuenta_cerrada_en",
        "liberada_sin_pago",
        "entrada_cerrada",
    ):
        op.drop_column("sesion_grupal", columna)
    op.execute(
        "UPDATE sesion_grupal SET estado = 'activa' WHERE estado IN ('cuenta_cerrada', 'pagada')"
    )
    _cambiar_check(
        "sesion_grupal", "ck_sesion_grupal_estado", f"estado IN ({_lista(ESTADOS_SESION_ANTES)})"
    )
    _indice_vivo(VIVOS_ANTES)

    # restaurante
    for nombre in (
        "ck_restaurante_horarios_objeto",
        "ck_restaurante_fuera_de_horario",
        "ck_restaurante_zona_horaria",
    ):
        op.drop_constraint(nombre, "restaurante", type_="check")
    op.drop_column("restaurante", "fuera_de_horario")
    op.drop_column("restaurante", "zona_horaria")
