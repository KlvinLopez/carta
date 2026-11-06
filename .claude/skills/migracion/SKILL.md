---
name: migracion
description: Lista de comprobación para escribir o cambiar una migración de Alembic en Carta (tablas, índices, CHECK, triggers de invariantes, downgrade) y la prueba que la valida contra el esquema real. Úsala antes de tocar migrations/ o app/db/models.py, o cuando el usuario diga "/migracion", "nueva migración", "agrega una columna".
---

# /migracion — una migración que la revisión no rompa

> Lo que aprendió T-0.2: tres revisores rompieron la primera versión con SQL real. Todo lo de abajo
> salió de ahí y lo comprueba `tests/unit/test_modelos.py`.

## 1. Antes

1. El esquema está en `docs/plan/03_Datos_v1.md`. Si tu cambio no está ahí, primero el documento (y fila en `04 §11`).
2. Modelo (`app/db/models.py`, `Mapped[]`) y migración se escriben **los dos a mano** y deben coincidir; `alembic revision --autogenerate` sólo sirve de borrador para comparar.
3. Sin base en producción (Fase 0): la migración `0001_base_v1` se edita en sitio. Con base en producción: una migración nueva `NNNN_descripcion.py` con `downgrade()` completo.

## 2. Al escribir el DDL

- **Toda FK con `ON DELETE CASCADE` o `SET NULL` lleva un índice** cuya primera columna es la FK; los parciales no cuentan.
- **CHECK de dominio en la base**, con nombre `ck_<tabla>_<qué>`: rangos, listas JSONB (`jsonb_typeof(...) = 'array'`), cadenas no vacías, formatos (`~ '^#[0-9A-Fa-f]{6}$'`), estados terminales con su marca de tiempo. Pydantic valida la entrada; la base es la última línea.
- **Baja lógica (regla dura 9):** nada de `UNIQUE (restaurante_id, nombre)`. Índice único parcial `WHERE activo` sobre `lower(btrim(nombre))`.
- **Tipos enumerados:** se crean y borran explícitamente (`postgresql.ENUM(..., create_type=False)` + `tipo.create()` / `tipo.drop()`).
- **Triggers de invariantes** (`fn_*` + `tr_*`):
  - `SET search_path = pg_catalog, public` en la función (una tabla temporal no debe suplantar a la real);
  - en UPDATE vigila la fila de **OLD y de NEW** (mover un ítem de orden es un UPDATE);
  - si la invariante depende de otra fila, léela con **`FOR SHARE`** para que una escritura concurrente te haga esperar;
  - si la relación se puede romper desde el padre (cambiar `sesion_id`), haz el padre inmutable con `BEFORE UPDATE OF columna`;
  - si borrar en cascada saltaría la invariante, `BEFORE DELETE` en el padre.
- `downgrade()` en orden inverso: triggers → funciones → tablas (hijas antes que padres) → tipos. Tras bajar no debe quedar nada nuestro en `public`.
- **Consistencia de inquilino (INV-10, `0002`):** una FK hacia un padre con `restaurante_id` es compuesta, `(x_id, restaurante_id) → padre(id, restaurante_id)`, y el padre lleva `UNIQUE (id, restaurante_id)`. Si la acción es `SET NULL`, escríbela **`SET NULL (x_id)`** (PostgreSQL 15+): a secas anula también `restaurante_id` (NOT NULL) y el borrado del padre falla. En el modelo: `ForeignKeyConstraint` en `__table_args__` (helper `_fk_inquilino`) y relaciones con `primaryjoin="... == foreign(Hijo.x_id)"`, o el ORM querría escribir `restaurante_id` desde dos relaciones. SQLAlchemy 2.1 refleja `SET NULL (x_id)` y `compare_metadata` lo distingue de `SET NULL`. Tabla nueva con `restaurante_id` y FK a otro padre del restaurante: compuesta desde el primer día.
- **Migración nueva sobre una ya publicada:** su propia prueba de bajar a la anterior y volver (`test_0002_baja_a_0001_y_vuelve_a_subir`), comprobando el texto exacto de lo que restaura (`pg_get_constraintdef`).

## 3. Alembic y la URL

- La URL de conexión **nunca pasa por `alembic.ini`** (`config.set_main_option`): ConfigParser interpreta `%` y una contraseña con `%40` rompe `upgrade head`. `migrations/env.py` crea el motor con `create_async_engine(URL, poolclass=NullPool)`.
- Las pruebas apuntan a otra base con `-x url=...`.

## 4. La prueba (`tests/unit/test_modelos.py`)

`compare_metadata` **no ve** CHECK, el `WHERE` de los índices parciales, el método (GIN) ni los triggers. Por eso la prueba lee el catálogo aparte. Al cambiar el esquema, actualiza:

| Qué cambió | Dónde en la prueba |
|---|---|
| Índice parcial | `PREDICADOS` (texto exacto de `pg_get_expr`; cópialo de la base) y, si es único, `INDICES_UNICOS_PARCIALES` |
| Trigger | `TRIGGERS` (texto exacto de `pg_get_triggerdef`) y `FUNCIONES_DE_TRIGGER` |
| CHECK | el nombre debe existir en el modelo (`CheckConstraint(..., name=...)`); si es de invariante, `FRAGMENTOS_CHECK`; una fila en `CASOS_CHECK` con un valor inválido |
| Tabla | `TABLAS_V1` y el escenario (`escenario`) si hace falta para las pruebas de datos |
| FK compuesta de INV-10 | `FK_INQUILINO` (texto exacto) y, si el padre es nuevo, `PADRES_INQUILINO` |
| Invariante (comportamiento) | `tests/integration/test_invariantes.py`: el caso que la viola **y** el legítimo que pasa, con `@pytest.mark.ac` |

## Verificar

```bash
uv run alembic upgrade head && uv run alembic downgrade -1 && uv run alembic upgrade head
uv run pytest -q tests/unit/test_modelos.py
```

El guard de Bash bloquea `alembic downgrade base` fuera de pruebas; contra la base local usa `downgrade -1` las veces necesarias. También bloquea cualquier comando cuyo texto contenga la llamada prohibida de la regla 3, aunque sea un script de exploración del scratchpad: escríbelo con Write y crea las tablas con DDL crudo.

Si cambias una migración que ya aplicaste en local (o la mutas a mano para comprobar que una prueba falla), la base queda con restos que su `downgrade` no conoce: quítalos a mano (`DROP TRIGGER ...`) y rehaz bajar/subir en `carta_db` **y** en `carta_test` (`uv run alembic -x url=$TEST_DATABASE_URL ...`).
