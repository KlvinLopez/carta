# ADR-009 — Corregir el motor de base de datos a asyncpg

**Estado:** aceptada · **Fecha:** 2026-08-30 · **Prioridad:** bloqueante (Fase 0)

## Contexto
El código actual en `app/db/database.py` llama a `create_async_engine` con `DATABASE_URL = postgresql://…` y `pyproject.toml` declara `psycopg2-binary`, que es un driver **síncrono**. En esa combinación la aplicación falla al arrancar con `InvalidRequestError: The asyncio extension requires an async driver`. Es decir: **el backend actual no levanta**.

## Decisión
1. Sustituir `psycopg2-binary` por `asyncpg==0.29.0` en las dependencias de ejecución.
2. Exigir el prefijo `postgresql+asyncpg://` en `DATABASE_URL`, con normalización defensiva en `Settings`: si la URL llega sin driver, se reescribe automáticamente y se registra una advertencia.
3. Mantener `psycopg2-binary` sólo como dependencia de desarrollo, porque Alembic lo usa para migraciones síncronas.
4. Ajustar `max_overflow` a 10; el valor actual `0` provoca esperas bajo pico con `pool_size=20`.

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| Pasar todo a SQLAlchemy síncrono | Desperdicia el modelo de concurrencia de FastAPI y limita el rendimiento con sondeo frecuente. |
| `psycopg` v3 en modo async | Válido, pero `asyncpg` tiene mejor rendimiento con PostgreSQL puro y es el camino más documentado con SQLAlchemy 2.0. |

## Consecuencias
- **Positivas:** la aplicación arranca; se elimina el primer obstáculo de cualquier persona que clone el repositorio.
- **Negativas:** dos drivers en el proyecto (uno para runtime, otro para Alembic). Es la práctica estándar y está documentada en `CLAUDE.md`.

## Verificación
`T-0.2`: `uvicorn app.main:app` arranca y `GET /health` devuelve 200 con `db: "ok"`.
