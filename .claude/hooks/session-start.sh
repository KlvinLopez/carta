#!/bin/bash
# SessionStart: deja una sesión de Claude Code en la nube lista para correr lint y pruebas de Carta.
# - Instala dependencias de Python con uv (Python 3.12) en .venv
# - Levanta un PostgreSQL 16 local (sin Docker) y crea las bases de desarrollo y pruebas
# - Exporta DATABASE_URL, DATABASE_URL_SYNC y TEST_DATABASE_URL para la sesión
# Idempotente: se puede correr varias veces. Sólo actúa en sesiones remotas.

set -uo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

raiz="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$raiz" || exit 0
registro="$raiz/.claude/session-start.log"
: > "$registro"
log() { echo "[carta] $*" | tee -a "$registro"; }

# ── 1. Python y dependencias ─────────────────────────────────────────────────
if command -v uv >/dev/null 2>&1; then
  if [ ! -x .venv/bin/python ]; then
    log "creando .venv con Python 3.12"
    uv venv --python 3.12 .venv >>"$registro" 2>&1 || log "no se pudo crear .venv (ver $registro)"
  fi
  if [ -x .venv/bin/python ]; then
    if [ -f uv.lock ]; then
      log "uv sync"
      uv sync --frozen >>"$registro" 2>&1 || uv sync >>"$registro" 2>&1 || log "uv sync falló (ver $registro)"
    else
      log "instalando dependencias desde pyproject.toml"
      if ! uv pip install --python .venv/bin/python -e ".[dev]" >>"$registro" 2>&1; then
        # Si el paquete no se puede construir (pyproject viejo), instala sólo las dependencias.
        uv pip install --python .venv/bin/python -r pyproject.toml --extra dev >>"$registro" 2>&1 \
          || log "instalación de dependencias falló (ver $registro)"
      fi
    fi
  fi
else
  log "uv no está instalado; omito Python"
fi

# ── 2. PostgreSQL local (sin Docker) ─────────────────────────────────────────
PG_BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
PGPORT="${CARTA_PGPORT:-5432}"
# PostgreSQL se niega a correr como root: si somos root, usamos el usuario del sistema `postgres`.
if [ "$(id -u)" = "0" ] && id postgres >/dev/null 2>&1; then
  PGDATA="/var/lib/postgresql/carta"
  como_pg() { runuser -u postgres -- "$@"; }
else
  PGDATA="${HOME}/.carta-pg"
  como_pg() { "$@"; }
fi
if [ -n "$PG_BIN" ] && [ -x "$PG_BIN/pg_ctl" ]; then
  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    log "inicializando PostgreSQL en $PGDATA"
    mkdir -p "$PGDATA" && { [ "$(id -u)" != "0" ] || chown postgres:postgres "$PGDATA"; }
    como_pg "$PG_BIN/initdb" -D "$PGDATA" -U postgres --auth=trust -E UTF8 >>"$registro" 2>&1 || log "initdb falló (ver $registro)"
  fi
  if ! "$PG_BIN/pg_isready" -q -h 127.0.0.1 -p "$PGPORT" 2>/dev/null; then
    log "arrancando PostgreSQL en el puerto $PGPORT"
    como_pg "$PG_BIN/pg_ctl" -D "$PGDATA" -o "-p $PGPORT -k /tmp -c listen_addresses=127.0.0.1" -l "$PGDATA/postgres.log" -w start >>"$registro" 2>&1 || log "pg_ctl start falló (ver $registro)"
  fi
  if "$PG_BIN/pg_isready" -q -h 127.0.0.1 -p "$PGPORT" 2>/dev/null; then
    psql="$PG_BIN/psql -h 127.0.0.1 -p $PGPORT -U postgres -v ON_ERROR_STOP=0 -q"
    $psql -tc "SELECT 1 FROM pg_roles WHERE rolname='carta'" | grep -q 1 || $psql -c "CREATE ROLE carta LOGIN PASSWORD 'carta_dev_password' SUPERUSER" >>"$registro" 2>&1
    for db in carta_db carta_test; do
      $psql -tc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1 || $psql -c "CREATE DATABASE $db OWNER carta" >>"$registro" 2>&1
    done
    log "PostgreSQL listo: carta_db y carta_test en 127.0.0.1:$PGPORT"
  fi
else
  log "PostgreSQL no está instalado en esta imagen; las pruebas de integración necesitarán docker compose"
fi

# ── 3. Variables de entorno para la sesión ──────────────────────────────────
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  {
    echo "export DATABASE_URL='postgresql+asyncpg://carta:carta_dev_password@127.0.0.1:${PGPORT}/carta_db'"
    echo "export DATABASE_URL_SYNC='postgresql://carta:carta_dev_password@127.0.0.1:${PGPORT}/carta_db'"
    echo "export TEST_DATABASE_URL='postgresql+asyncpg://carta:carta_dev_password@127.0.0.1:${PGPORT}/carta_test'"
    echo "export SECRET_KEY='solo-para-desarrollo-local-no-usar-en-produccion-0123456789'"
    echo "export ENTORNO='desarrollo'"
    echo "export PYTHONPATH=\"$raiz\""
    echo "export PATH=\"$raiz/.venv/bin:\$PATH\""
  } >> "$CLAUDE_ENV_FILE"
fi
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
fi

log "listo. Comandos: uv run ruff check app · uv run pytest -q · uv run uvicorn app.main:app --port 8000"
exit 0
