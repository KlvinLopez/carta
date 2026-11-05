"""T-0.6: los archivos de la imagen y de las variantes de despliegue dicen lo que el brief exige.

Lo que de verdad prueba la imagen (`docker build`, `docker run`, `curl`) corre en el job
`imagen` de `.github/workflows/ci.yml`: en las sesiones de agente no hay daemon de Docker.
Aquí se comprueba lo que sí se puede sin Docker: que la configuración de registro del
supervisor de uvicorn produce JSON y no duplica manejadores, que el compose y el workflow son
YAML válido con la forma esperada, y que el `Dockerfile` y `.dockerignore` llevan lo acordado.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import yaml

RAIZ = Path(__file__).resolve().parents[2]
DOCKERFILE = RAIZ / "Dockerfile"
DOCKERIGNORE = RAIZ / ".dockerignore"
LOG_CONFIG = RAIZ / "deploy" / "uvicorn_log.json"
COMPOSE_VPS = RAIZ / "deploy" / "vps" / "docker-compose.yml"
CI = RAIZ / ".github" / "workflows" / "ci.yml"
RESPALDAR = RAIZ / "deploy" / "respaldo" / "respaldar.sh"


# --- registro del supervisor de uvicorn ---------------------------------------------------


def test_log_config_del_supervisor_produce_json_por_linea_sin_duplicar_manejadores() -> None:
    """Con `--workers N` uvicorn configura el registro con `--log-config` en el padre y en
    cada hijo; luego `configurar_registro()` corre al importar la aplicación. Las dos cosas
    deben dejar **un** manejador JSON en el raíz y nada de texto plano."""
    programa = """
import json, logging, logging.config, sys
logging.config.dictConfig(json.load(open(sys.argv[1], encoding="utf-8")))
logging.getLogger("uvicorn.error").info("Started parent process [%d]", 1)
logging.getLogger("uvicorn.error").error("Exception in ASGI application")
logging.getLogger("uvicorn.access").info("esto no debe salir")
from app.core.registro import NOMBRE_MANEJADOR, configurar_registro
configurar_registro()
logging.getLogger("uvicorn").warning("Started server process [%d]", 2)
raiz = logging.getLogger()
print(json.dumps({"manejadores": [h.get_name() for h in raiz.handlers]}))
"""
    resultado = subprocess.run(
        [sys.executable, "-c", programa, str(LOG_CONFIG)],
        capture_output=True,
        text=True,
        cwd=RAIZ,
        timeout=30,
        check=False,
    )
    assert resultado.returncode == 0, resultado.stderr
    lineas = [json.loads(linea) for linea in resultado.stdout.splitlines() if linea.strip()]
    mensajes = [linea.get("mensaje") for linea in lineas]
    assert "Started parent process [1]" in mensajes
    assert "Started server process [2]" in mensajes
    assert "esto no debe salir" not in mensajes
    assert "Exception in ASGI application" not in mensajes
    assert mensajes.count("Started server process [2]") == 1
    assert lineas[-1] == {"manejadores": ["carta_json"]}
    for linea in lineas[:-1]:
        assert {"ts", "nivel", "logger", "mensaje", "request_id"} <= set(linea)


def test_log_config_reutiliza_el_formateador_de_la_aplicacion() -> None:
    config = json.loads(LOG_CONFIG.read_text(encoding="utf-8"))
    assert config["version"] == 1
    assert config["disable_existing_loggers"] is False
    formateadores = {f.get("()") for f in config["formatters"].values()}
    assert formateadores == {"app.core.registro.FormateadorJson"}
    assert config["loggers"]["uvicorn.access"]["propagate"] is False


# --- Dockerfile y .dockerignore -----------------------------------------------------------


def test_dockerfile_multietapa_segun_el_brief() -> None:
    texto = DOCKERFILE.read_text(encoding="utf-8")
    assert re.search(r"^FROM node:22-slim AS \w+", texto, re.MULTILINE)
    assert re.search(r"^FROM python:3\.12-slim", texto, re.MULTILINE)
    assert "ghcr.io/astral-sh/uv:0.11.32" in texto
    assert "uv sync --locked --no-dev" in texto
    assert re.search(r"^USER \w+", texto, re.MULTILINE)
    assert "PYTHONIOENCODING=utf-8" in texto and "PYTHONUNBUFFERED=1" in texto
    assert re.search(r"^HEALTHCHECK .*", texto, re.MULTILINE)
    assert "/health" in texto
    assert "--log-config deploy/uvicorn_log.json" in texto
    assert "${WORKERS:-2}" in texto
    assert "alembic upgrade" not in texto  # la migración la corre el despliegue, no el CMD
    assert "frontend/dist" in texto


def test_dockerignore_deja_fuera_secretos_datos_y_lo_que_no_entra_en_la_imagen() -> None:
    lineas = {
        linea.strip()
        for linea in DOCKERIGNORE.read_text(encoding="utf-8").splitlines()
        if linea.strip() and not linea.startswith("#")
    }
    for patron in (
        ".env*",
        "datos/",
        ".venv/",
        "frontend/node_modules/",
        "frontend/dist/",
        "tests/",
        "docs/",
        "prototipo/",
        "marketing/",
        "terraform/",
        ".git/",
    ):
        assert patron in lineas, patron
    # Lo que sí tiene que entrar no está ignorado.
    for necesario in ("app/", "migrations/", "frontend/src/", "deploy/", "uv.lock"):
        assert necesario not in lineas, necesario


# --- deploy/ ------------------------------------------------------------------------------


def test_compose_de_la_vm_es_valido_y_tiene_la_forma_acordada() -> None:
    compose = yaml.safe_load(COMPOSE_VPS.read_text(encoding="utf-8"))
    servicios = compose["services"]
    assert set(servicios) >= {"caddy", "api", "postgres", "migracion", "respaldo"}
    assert "caddy" in servicios["caddy"].get("profiles", []), "caddy es opcional (perfil)"
    assert (
        servicios["api"]["depends_on"]["migracion"]["condition"] == "service_completed_successfully"
    )
    assert servicios["migracion"]["depends_on"]["postgres"]["condition"] == "service_healthy"
    assert "alembic" in " ".join(servicios["migracion"]["command"])
    assert any("postgresql/data" in v for v in servicios["postgres"]["volumes"])
    for nombre in ("api", "migracion", "respaldo"):
        for env_file in servicios[nombre]["env_file"]:
            assert env_file["required"] is False, "`docker compose config` sin .env debe pasar"
    texto = COMPOSE_VPS.read_text(encoding="utf-8")
    assert "password" not in texto.lower().replace("postgres_password", "")


def test_ci_tiene_el_job_imagen_con_el_verificar_del_brief() -> None:
    ci = yaml.safe_load(CI.read_text(encoding="utf-8"))
    imagen = ci["jobs"]["imagen"]
    assert "needs" not in imagen, "corre en paralelo con `calidad`"
    pasos = "\n".join(paso.get("run", "") for paso in imagen["steps"])
    for fragmento in (
        "docker build -t carta:test .",
        "docker run -d -p 8000:8000 --env-file .env.example -e ENTORNO=pruebas",
        "curl -sf localhost:8000/health",
        '<div id="app"',
        "content-security-policy",
        "docker compose -f deploy/vps/docker-compose.yml config",
    ):
        assert fragmento in pasos, fragmento


def test_script_de_respaldo_falla_pronto_y_no_trae_secretos() -> None:
    texto = RESPALDAR.read_text(encoding="utf-8")
    assert texto.startswith("#!/bin/sh")
    assert "set -eu" in texto
    assert "pg_dump" in texto and "age" in texto and "rclone" in texto
    for variable in ("DATABASE_URL", "RESPALDO_CLAVE_AGE", "R2_BUCKET_PRIVADO", "RESPALDO_DIAS"):
        assert variable in texto, variable
    assert not re.search(r"(AKIA|age1[a-z0-9]{50,})", texto)
    resultado = subprocess.run(["sh", "-n", str(RESPALDAR)], capture_output=True, text=True)
    assert resultado.returncode == 0, resultado.stderr
