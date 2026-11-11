# Imagen portable de Carta (T-0.6, ADR-015): una sola imagen sirve la API y la PWA, sin proxy
# delante y sin saber en qué proveedor corre (Railway hoy; VM con Compose en deploy/vps/).
#
#   docker build -t carta .
#   docker run -p 8000:8000 --env-file .env carta
#
# La migración NO corre aquí: la corre el comando previo al despliegue
# (`uv run python scripts/predespliegue.py`, T-0.7) o el servicio `migracion` de
# deploy/vps/docker-compose.yml.

# ---------- Etapa 1: la PWA (frontend/dist) ----------
FROM node:22-slim@sha256:5ec23b7c622b00547753bc6ffd78085dd868a68aeb41c8e0a1418f033e13d96d AS frontend
WORKDIR /src/frontend
ENV CI=true
COPY frontend/package.json frontend/package-lock.json ./
# El build necesita las devDependencies (tsc, vite): sin --omit=dev.
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
# La configuración web de Firebase Auth se hornea en el bundle (frontend/src/admin/acceso/proveedor.ts
# lee import.meta.env.VITE_FIREBASE_*): Railway pasa las variables del servicio como build args;
# a mano, `docker build --build-arg VITE_FIREBASE_API_KEY=… …`. Sin ellas la imagen se construye
# igual y el panel del operador dice «acceso sin configurar». No son secretos: viajan al navegador.
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_APP_ID
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
RUN npm run build

# ---------- Etapa 2: la API ----------
FROM python:3.15-slim@sha256:65a65fc7b30b06cb6df4930fd4650697cb23f4c2698ab81fc87e4b031bc36928 AS api
COPY --from=ghcr.io/astral-sh/uv:0.11.32@sha256:df4cae8f3a96d175e2e5f992e597550000edbe78fdc2594d5cd8de1a217f504c /uv /uvx /bin/

# PYTHONIOENCODING: con stdout no UTF-8 una ruta con acento perdería su línea de acceso.
ENV PYTHONIOENCODING=utf-8 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_CACHE_DIR=/tmp/uv-cache \
    PATH="/app/.venv/bin:$PATH"

RUN groupadd --system carta \
    && useradd --system --gid carta --home-dir /app --shell /usr/sbin/nologin carta

WORKDIR /app

# Dependencias primero: la capa se reutiliza mientras no cambien pyproject.toml ni uv.lock.
# Sin `--mount=type=cache` (T-0.7): el builder de Railway rechaza los cache mounts que no llevan
# `id=s/<id-del-servicio>-<ruta>`, y ese id ataría la imagen a un proveedor. `--no-cache` deja la
# caché de uv fuera de la capa.
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project --no-cache

# Sólo lo que la imagen necesita (ver .dockerignore para lo que nunca entra).
COPY README.md alembic.ini ./
COPY app/ app/
COPY migrations/ migrations/
COPY scripts/ scripts/
COPY deploy/uvicorn_log.json deploy/uvicorn_log.json
RUN uv sync --locked --no-dev --no-cache

COPY --from=frontend /src/frontend/dist frontend/dist

# En tiempo de ejecución `uv run` no sincroniza ni escribe nada: el entorno ya está completo y
# el usuario no tiene permiso de escritura sobre /app (el código es de root, sólo lectura).
# FORWARDED_ALLOW_IPS=*: uvicorn sólo confía X-Forwarded-* desde 127.0.0.1; detrás del proxy de
# Railway o de Caddy `request.url.scheme` sería `http` y `request.client.host` la IP del proxy
# (307 con Location http://, cookies Secure, URLs de QR, límite por IP). El contenedor sólo es
# alcanzable a través de ese proxy, así que confiar en todos los orígenes es correcto aquí.
ENV UV_NO_SYNC=1 \
    FORWARDED_ALLOW_IPS=*

USER carta
EXPOSE 8000

# GET a /health con la librería estándar (la imagen no trae curl). PORT lo pone Railway.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c 'import os, sys, urllib.request as u; sys.exit(0 if u.urlopen("http://127.0.0.1:%s/health" % os.environ.get("PORT", "8000"), timeout=3).status == 200 else 1)'

# `exec` deja a uvicorn como PID 1 (recibe SIGTERM y apaga a los workers con gracia).
# --log-config: con --workers N el supervisor escribiría texto plano; el JSON lo deja en una
# línea JSON por evento con el mismo formateador de la aplicación (deploy/uvicorn_log.json).
# WORKERS debe ser un entero ≥ 1: uvicorn con `--workers abc` moriría con una traza poco clara.
CMD ["sh", "-c", "case \"${WORKERS:-2}\" in ''|*[!0-9]*|0) echo \"WORKERS debe ser un entero >= 1, no '${WORKERS:-}'\" >&2; exit 1;; esac; exec uvicorn app.main:app --host 0.0.0.0 --port \"${PORT:-8000}\" --workers \"${WORKERS:-2}\" --log-config deploy/uvicorn_log.json"]
