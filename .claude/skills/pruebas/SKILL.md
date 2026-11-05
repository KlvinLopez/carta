---
name: pruebas
description: Cómo se escribe una prueba en Carta con la infraestructura de tests/conftest.py (base PostgreSQL real migrada, transacción por prueba, cliente httpx sobre la app, fábricas restaurante/operador/mesa, marcador ac). Úsala antes de escribir o cambiar cualquier archivo en tests/, o cuando el usuario diga "/pruebas", "escribe la prueba de", "agrega una fixture".
---

# /pruebas — una prueba que corre igual aquí y en CI

> Lo que dejó T-0.4: la aplicación entera corre sobre la base de pruebas, cada prueba vive en una
> transacción que se revierte y todas comparten un solo bucle de eventos. Lo comprueban
> `tests/unit/test_bd_pruebas.py` y `tests/integration/test_infraestructura_pruebas.py`.

## 1. Qué te da `tests/conftest.py`

| Fixture | Qué es | Cuándo usarla |
|---|---|---|
| `sesion` | `AsyncSession` sobre la transacción de la prueba; los `commit()` del código son *savepoints* | Pruebas de servicios y consultas |
| `cliente` | `AsyncClient` de httpx sobre `app.main.app` con `get_db_session` sustituido por `sesion` | Pruebas de rutas: lo que creas con las fábricas lo ve la petición |
| `restaurante`, `operador`, `mesa` | Un restaurante, su dueño (`propietario` con `usuario`) y una mesa, coherentes con `app/db/models.py` | Casi todas las pruebas de Fase 1 en adelante |
| `fabrica_restaurante`, `fabrica_operador`, `fabrica_mesa` | Las mismas fábricas como funciones (`await fabrica_mesa(restaurante, numero=7)`) | Cuando necesitas varios o valores concretos |
| `motor_pruebas` | Motor de la sesión de pruebas (`NullPool`) | Sólo para mirar la base desde **otra** conexión (carreras, aislamiento) |
| `esquema_migrado`, `url_bd` | Base migrada a `head` con la CLI de Alembic | Pruebas de esquema o que corren Alembic |

Las fábricas viven en `tests/fabricas.py` (una función `crear_<entidad>(sesion, ...)` por entidad; `flush`, nunca `commit`). Si una tarea necesita otra entidad (categoría, platillo, personal), **agrégala ahí** con el mismo patrón y su fixture en `conftest.py`.

## 2. Reglas

1. **Nunca crees el esquema desde los modelos ni toques `carta_db`.** La URL la decide `tests.bd_pruebas.url_de_pruebas()` (`TEST_DATABASE_URL`, o `carta_test` junto a `DATABASE_URL`); se niega si la base no se llama *test* o `ENTORNO` no es desarrollo/pruebas.
2. **No importes `app.db` ni `app.main` antes que `conftest.py`** en nada que pytest cargue antes (plugins, `conftest` de subcarpetas): el motor global nace de `settings.DATABASE_URL` al importar `app.db`, y `conftest.py` fija esa URL primero.
3. **No importes `tests.conftest` desde una prueba** salvo para constantes (`URL_PRUEBAS`, `Fabrica`); las funciones compartidas van en `tests/bd_pruebas.py` o `tests/fabricas.py`.
4. **No abras tu propio bucle ni cierres el pool** (`asyncio.run`, `close_db()`): todo corre en el bucle de sesión de pytest-asyncio (`asyncio_default_fixture_loop_scope` y `asyncio_default_test_loop_scope` en `pyproject.toml`).
5. **Lo que no debe sobrevivir, no sobrevive:** no limpies tablas a mano; si una prueba necesita que algo quede confirmado de verdad (otra conexión debe verlo), dilo en el docstring y borra lo que creaste en un `finally`.
6. **Cada prueba de criterio lleva `@pytest.mark.ac("AC-x.y")`** (regla dura 15); `uv run python scripts/verificar_trazabilidad.py --tarea T-x.y --estricto` lo comprueba. Nada de `skip` ni `xfail`.
7. **Variables de entorno:** una prueba que dependa de `ENTORNO` o `SECRET_KEY` los fija explícitamente (`monkeypatch` o `Settings(_env_file=None, ENTORNO=...)`); CI corre con `ENTORNO=pruebas`.
8. **El guard de Bash lee el texto de los comandos:** una prueba que mencione `create_all(`, `downgrade base` o `DROP TABLE` se escribe con Write/Edit, no con `cat <<EOF`.

## 3. Esqueleto

```python
"""T-x.y: <qué protege>."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Mesa, Restaurante


@pytest.mark.ac("AC-x.y")
async def test_<criterio>(cliente: AsyncClient, sesion: AsyncSession, restaurante: Restaurante, mesa: Mesa) -> None:
    respuesta = await cliente.get(f"/api/v1/p/mesas/{mesa.codigo_publico}")
    assert respuesta.status_code == 200
```

## 4. Verificar

```bash
uv run pytest -q                                     # todo en verde, local
ENTORNO=pruebas uv run pytest -q                     # como en CI
env -u TEST_DATABASE_URL uv run pytest -q            # sin variables: deriva carta_test
uv run python scripts/verificar_trazabilidad.py --tarea T-x.y --estricto
```

El CI (`.github/workflows/ci.yml`) corre lo mismo sobre PostgreSQL 16 en cada push a `master`, `agente/**` y `claude/**` y en cada PR.
