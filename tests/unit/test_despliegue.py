"""T-0.6 y T-0.7: los archivos de la imagen y del despliegue dicen lo que el brief exige.

Lo que de verdad prueba la imagen (`docker build`, `docker run`, `curl`) corre en el job
`imagen` de `.github/workflows/ci.yml`: en las sesiones de agente no hay daemon de Docker.
Aquí se comprueba lo que sí se puede sin Docker: que la configuración de registro del
supervisor de uvicorn produce JSON y no duplica manejadores, que el compose, cloud-init y el
workflow son YAML válido con la forma acordada (pyyaml, dependencia de desarrollo), y que el
`Dockerfile`, `.dockerignore` y el Caddyfile llevan lo acordado (instrucción por instrucción,
no por `grep`).

T-0.7 añade el despliegue a Railway: `.github/workflows/deploy.yml` (producción en etiquetas
`v*`, imagen en GHCR), `.railwayignore`, la guía `deploy/railway/README.md` y el traslado de
`terraform/` a `deploy/etapa2-gcp/`. No hay `railway.toml`: Railway dejó de leer «Config as
Code» en servicios nuevos (docs.railway.com/config-as-code/reference, 04 §11), así que la
configuración del servicio vive en el panel y la guía dice exactamente qué poner.
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
CLOUD_INIT = RAIZ / "deploy" / "vps" / "cloud-init.yml"
CADDYFILE = RAIZ / "deploy" / "vps" / "Caddyfile"
CI = RAIZ / ".github" / "workflows" / "ci.yml"
DEPLOY = RAIZ / ".github" / "workflows" / "deploy.yml"
RESPALDAR = RAIZ / "deploy" / "respaldo" / "respaldar.sh"
DOCKERFILE_RESPALDO = RAIZ / "deploy" / "respaldo" / "Dockerfile"
RAILWAYIGNORE = RAIZ / ".railwayignore"
GUIA_RAILWAY = RAIZ / "deploy" / "railway" / "README.md"
GUIA_DESPLIEGUE = RAIZ / "deploy" / "README.md"
OPERACION = RAIZ / "docs" / "plan" / "05_Operacion.md"
DEPENDABOT = RAIZ / ".github" / "dependabot.yml"
PYPROJECT = RAIZ / "pyproject.toml"
PREDESPLIEGUE = "uv run python scripts/predespliegue.py"
ETAPA2 = RAIZ / "deploy" / "etapa2-gcp"
ACCION_POR_SHA = r"[\w.-]+/[\w.-]+@[0-9a-f]{40}"
DIGEST = r"@sha256:[0-9a-f]{64}"
LLAVE_PUBLICA_AGE = "age1snv8uknzuhdupcpkh8dljw39979dlcjdr0x9p5ck68xgeqn09y6qj267mk"


def instrucciones_dockerfile(texto: str) -> list[tuple[str, str]]:
    """`[(INSTRUCCION, argumentos)]` con las continuaciones `\\` unidas y sin comentarios."""
    lineas: list[str] = []
    pendiente = ""
    for cruda in texto.splitlines():
        linea = cruda.rstrip()
        if not pendiente and (not linea.strip() or linea.lstrip().startswith("#")):
            continue
        if linea.endswith("\\"):
            pendiente += linea[:-1] + " "
            continue
        lineas.append((pendiente + linea).strip())
        pendiente = ""
    resultado = []
    for linea in lineas:
        nombre, _, argumentos = linea.partition(" ")
        resultado.append((nombre.upper(), argumentos.strip()))
    return resultado


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


def test_dockerfile_multietapa_instruccion_por_instruccion() -> None:
    texto = DOCKERFILE.read_text(encoding="utf-8")
    # Sin `# syntax=`: no estaba fijado y sin cache mounts no hace falta (T-0.7).
    assert not texto.lstrip().startswith("# syntax=")
    instrucciones = instrucciones_dockerfile(texto)
    froms = [arg for ins, arg in instrucciones if ins == "FROM"]
    # Toda imagen externa, también una etapa intermedia nueva, con digest.
    for desde in froms:
        assert re.search(DIGEST + r"( AS \w+)?$", desde), desde
    for arg in (a for i, a in instrucciones if i == "COPY" and a.startswith("--from=")):
        origen = arg.split()[0].removeprefix("--from=")
        if origen not in {"frontend"}:  # las etapas propias no llevan digest
            assert re.search(DIGEST + "$", origen), origen
    # Tag legible (Dependabot lo sigue) + digest fijo (T-0.7): el build es reproducible.
    assert re.fullmatch(r"node:22-slim" + DIGEST + r" AS frontend", froms[0]), froms[0]
    assert re.fullmatch(r"python:3\.12-slim" + DIGEST + r" AS api", froms[-1]), froms[-1]

    copias = [arg for ins, arg in instrucciones if ins == "COPY"]
    assert any(
        re.match(r"--from=ghcr\.io/astral-sh/uv:0\.11\.32" + DIGEST + " ", arg) for arg in copias
    )
    assert not any(arg.split()[-2] == "." for arg in copias), "ninguna COPY con origen `.`"
    assert any("frontend/dist" in arg for arg in copias)

    runs = [arg for ins, arg in instrucciones if ins == "RUN"]
    syncs = [arg for arg in runs if "uv sync" in arg]
    assert syncs and all("--locked" in arg and "--no-dev" in arg for arg in syncs)
    assert not any("alembic upgrade" in arg for arg in runs)
    # Railway rechaza los cache mounts sin `id=s/<servicio>-…` (T-0.7): ninguno.
    assert not any("type=cache" in arg for arg in runs)
    assert all("--no-cache" in arg for arg in syncs), "la caché de uv no entra en la capa"

    usuarios = [arg for ins, arg in instrucciones if ins == "USER"]
    assert usuarios and usuarios[-1] not in ("root", "0")

    envs = " ".join(arg for ins, arg in instrucciones if ins == "ENV")
    for variable in ("PYTHONIOENCODING=utf-8", "PYTHONUNBUFFERED=1", "FORWARDED_ALLOW_IPS=*"):
        assert variable in envs, variable

    (healthcheck,) = [arg for ins, arg in instrucciones if ins == "HEALTHCHECK"]
    assert "/health" in healthcheck and "urlopen" in healthcheck

    (cmd,) = [arg for ins, arg in instrucciones if ins == "CMD"]
    partes = json.loads(cmd)
    assert partes[:2] == ["sh", "-c"]
    guion = partes[2]
    assert guion.startswith("case ")
    assert "exec uvicorn app.main:app" in guion
    assert '--workers "${WORKERS:-2}"' in guion
    assert '--port "${PORT:-8000}"' in guion
    assert "--log-config deploy/uvicorn_log.json" in guion
    assert "alembic" not in guion


def test_el_cmd_rechaza_workers_no_numerico_y_acepta_un_entero() -> None:
    instrucciones = instrucciones_dockerfile(DOCKERFILE.read_text(encoding="utf-8"))
    (cmd,) = [arg for ins, arg in instrucciones if ins == "CMD"]
    guion = json.loads(cmd)[2].replace("exec uvicorn", "exec echo uvicorn")
    entorno_base = {"PATH": "/usr/bin:/bin"}
    for malo in ("abc", "0", "2x", "-1"):
        r = subprocess.run(
            ["sh", "-c", guion],
            env={**entorno_base, "WORKERS": malo},
            capture_output=True,
            text=True,
        )
        assert r.returncode == 1, malo
        assert "WORKERS" in r.stderr
    r = subprocess.run(
        ["sh", "-c", guion],
        env={**entorno_base, "WORKERS": "4", "PORT": "9000"},
        capture_output=True,
        text=True,
    )
    assert r.returncode == 0
    assert "--port 9000 --workers 4" in r.stdout
    # Sin WORKERS, o vacía, vale el valor por defecto del brief: 2.
    for entorno in (entorno_base, {**entorno_base, "WORKERS": ""}):
        r = subprocess.run(["sh", "-c", guion], env=entorno, capture_output=True, text=True)
        assert r.returncode == 0 and "--port 8000 --workers 2" in r.stdout


def test_dockerignore_deja_fuera_secretos_datos_y_lo_que_no_entra_en_la_imagen() -> None:
    lineas = [
        linea.strip()
        for linea in DOCKERIGNORE.read_text(encoding="utf-8").splitlines()
        if linea.strip() and not linea.startswith("#")
    ]
    assert not any(linea.startswith("!") for linea in lineas), "sin excepciones que reabran algo"
    patrones = set(lineas)
    # Los patrones van anclados a la raíz: lo que puede vivir en subcarpetas lleva `**/`.
    for patron in (
        "**/.env*",
        "datos/",
        ".venv/",
        "frontend/node_modules/",
        "frontend/dist/",
        "**/__pycache__/",
        "**/*.pyc",
        "**/.pytest_cache/",
        "**/.mypy_cache/",
        "**/.ruff_cache/",
        "**/.vite/",
        "tests/",
        "docs/",
        "prototipo/",
        "marketing/",
        "deploy/etapa2-gcp/",
        ".git/",
    ):
        assert patron in patrones, patron
    assert ".env*" not in patrones and "__pycache__/" not in patrones, (
        "sin `**/` no cubre subcarpetas"
    )
    for necesario in ("app/", "migrations/", "frontend/src/", "deploy/", "uv.lock", "frontend/"):
        assert necesario not in patrones, necesario


def test_ningun_archivo_de_app_sabe_en_que_proveedor_corre() -> None:
    for archivo in (RAIZ / "app").rglob("*.py"):
        texto = archivo.read_text(encoding="utf-8").lower()
        for proveedor in ("railway", "hetzner", "cloud run", "vultr"):
            assert proveedor not in texto, (archivo, proveedor)


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
    assert " ".join(servicios["migracion"]["command"]) == PREDESPLIEGUE
    assert any("postgresql/data" in v for v in servicios["postgres"]["volumes"])
    assert "ports" not in servicios["postgres"], "la base no se expone fuera del stack"
    assert all(str(p).startswith("127.0.0.1:") for p in servicios["api"]["ports"])
    assert servicios["postgres"]["environment"]["POSTGRES_PASSWORD"] == "${POSTGRES_PASSWORD:-}"
    # La imagen se construye si no está en el registro; `config` no necesita .env.
    for nombre in ("api", "migracion"):
        assert servicios[nombre]["build"] == {"context": "../..", "dockerfile": "Dockerfile"}
    for nombre in ("api", "migracion", "respaldo"):
        assert "env_file" not in servicios[nombre], "cada servicio recibe sólo sus variables"
    entorno_api = servicios["api"]["environment"]
    entorno_respaldo = servicios["respaldo"]["environment"]
    assert "POSTGRES_PASSWORD" not in entorno_api and "RESPALDO_CLAVE_AGE" not in entorno_api
    assert "SECRET_KEY" not in entorno_respaldo and "ANTHROPIC_API_KEY" not in entorno_respaldo
    assert {"DATABASE_URL", "SECRET_KEY", "ENTORNO", "WORKERS", "R2_URL_PUBLICA"} <= set(
        entorno_api
    )
    assert {"DATABASE_URL", "RESPALDO_CLAVE_AGE", "RESPALDO_DIAS", "R2_BUCKET_PRIVADO"} <= set(
        entorno_respaldo
    )
    texto = COMPOSE_VPS.read_text(encoding="utf-8")
    assert "password" not in texto.lower().replace("postgres_password", "")


def test_cloud_init_endurece_la_vm_y_programa_el_respaldo() -> None:
    texto = CLOUD_INIT.read_text(encoding="utf-8")
    assert texto.splitlines()[0] == "#cloud-config"
    config = yaml.safe_load(texto)
    assert config["ssh_pwauth"] is False
    assert config["disable_root"] is True
    permitidos = {
        linea.removeprefix("ufw allow ").strip()
        for linea in config["runcmd"]
        if isinstance(linea, str) and linea.startswith("ufw allow ")
    }
    assert permitidos <= {"22/tcp", "80/tcp", "443/tcp", "443/udp"}
    assert any("ufw --force enable" in str(linea) for linea in config["runcmd"])
    cron = [a for a in config["write_files"] if a["path"] == "/etc/cron.d/carta-respaldo"]
    assert cron and "docker compose run --rm respaldo" in cron[0]["content"]
    assert "0 4 * * * carta" in cron[0]["content"]
    assert not re.search(r"ssh-ed25519 AAAA", texto), "sin llaves reales"


def test_caddyfile_solo_hace_proxy_y_tls() -> None:
    texto = CADDYFILE.read_text(encoding="utf-8")
    directivas = [
        linea.strip().split()[0]
        for linea in texto.splitlines()
        if linea.strip() and not linea.strip().startswith("#")
    ]
    assert "header" not in directivas, "las cabeceras las pone la aplicación"
    assert "reverse_proxy api:8000" in texto
    assert "{$DOMINIO}" in texto


def test_ci_tiene_el_job_imagen_con_el_verificar_del_brief() -> None:
    texto = CI.read_text(encoding="utf-8")
    ci = yaml.safe_load(texto)
    imagen = ci["jobs"]["imagen"]
    assert "needs" not in imagen, "corre en paralelo con `calidad`"
    pasos = "\n".join(paso.get("run", "") for paso in imagen["steps"])
    for fragmento in (
        "docker build -t carta:test .",
        "docker run -d -p 127.0.0.1:8000:8000 --env-file .env.example -e ENTORNO=pruebas",
        "curl -sf localhost:8000/health",
        '<div id="app"',
        "content-security-policy",
        "docker compose -f deploy/vps/docker-compose.yml config",
        "content-type: font/woff2",
        "cache-control: no-store",
        "docker build -t carta-respaldo:test deploy/respaldo",
        "docker exec carta-test uv run python scripts/predespliegue.py",
    ):
        assert fragmento in pasos, fragmento
    for job in ci["jobs"].values():
        for paso in job["steps"]:
            assert "secrets." not in json.dumps(paso), "los jobs no usan secretos"
            if "uses" in paso:
                assert re.fullmatch(ACCION_POR_SHA, paso["uses"]), paso["uses"]


def test_script_de_respaldo_falla_pronto_y_no_trae_secretos() -> None:
    texto = RESPALDAR.read_text(encoding="utf-8")
    assert texto.startswith("#!/bin/sh")
    assert "set -eu" in texto
    assert "pg_dump" in texto and "age" in texto and "rclone" in texto
    for variable in (
        "DATABASE_URL",
        "RESPALDO_CLAVE_AGE",
        "R2_BUCKET_PRIVADO",
        "RESPALDO_DIAS",
        "PGPASSWORD",
    ):
        assert variable in texto, variable
    assert not re.search(r"(AKIA|age1[a-z0-9]{50,})", texto)
    resultado = subprocess.run(["sh", "-n", str(RESPALDAR)], capture_output=True, text=True)
    assert resultado.returncode == 0, resultado.stderr


def test_imagen_de_respaldo_fija_su_base_por_digest() -> None:
    instrucciones = instrucciones_dockerfile(DOCKERFILE_RESPALDO.read_text(encoding="utf-8"))
    (base,) = [arg for ins, arg in instrucciones if ins == "FROM"]
    assert re.fullmatch(r"alpine:3\.22" + DIGEST, base), base


# --- T-0.7: Railway ----------------------------------------------------------------------


def _deploy() -> dict:
    flujo = yaml.safe_load(DEPLOY.read_text(encoding="utf-8"))
    assert isinstance(flujo, dict)
    return flujo


def _disparadores(flujo: dict) -> dict:
    # PyYAML (YAML 1.1) lee la clave `on` como el booleano True.
    disparadores = flujo.get("on", flujo.get(True))
    assert isinstance(disparadores, dict)
    return disparadores


def _pasos(job: dict) -> str:
    return "\n".join(paso.get("run", "") for paso in job["steps"])


def _checkouts(job: dict) -> list[dict]:
    return [p for p in job["steps"] if p.get("uses", "").startswith("actions/checkout@")]


def test_no_hay_config_as_code_de_railway() -> None:
    """Railway no lee `railway.toml`/`railway.json` en servicios nuevos y deja de leerlos en
    todos el 2026-12-01: un archivo así sería configuración muerta que parece viva."""
    for nombre in ("railway.toml", "railway.json"):
        assert not (RAIZ / nombre).exists(), nombre


def test_deploy_dispara_en_etiquetas_v_y_a_mano_con_la_etiqueta() -> None:
    disparadores = _disparadores(_deploy())
    assert set(disparadores) == {"push", "workflow_dispatch"}
    assert disparadores["push"] == {"tags": ["v*"]}, "sólo etiquetas: nada de ramas"
    entrada = disparadores["workflow_dispatch"]["inputs"]["etiqueta"]
    assert entrada["required"] is True and entrada["type"] == "string"


def test_deploy_trabajos_permisos_y_secretos_minimos() -> None:
    texto = DEPLOY.read_text(encoding="utf-8")
    assert set(re.findall(r"secrets\.(\w+)", texto)) == {"RAILWAY_TOKEN"}
    flujo = _deploy()
    assert flujo["permissions"] == {"contents": "read"}
    assert flujo["concurrency"]["cancel-in-progress"] is False, "un despliegue nunca cancela otro"
    # Con `shell: bash` explícito GitHub usa `bash -eo pipefail`: un `curl | grep` roto falla.
    assert flujo["defaults"] == {"run": {"shell": "bash"}}
    trabajos = flujo["jobs"]
    assert set(trabajos) == {"verificar", "produccion", "humo", "publicar"}
    assert trabajos["verificar"]["permissions"] == {"contents": "read", "actions": "read"}
    assert trabajos["humo"]["permissions"] == {"contents": "read"}
    assert trabajos["publicar"]["permissions"] == {"contents": "read", "packages": "write"}
    assert "permissions" not in trabajos["produccion"], "hereda contents: read"
    # RAILWAY_TOKEN es secreto del Environment `produccion` de GitHub, no del repositorio.
    assert trabajos["produccion"]["environment"] == {
        "name": "produccion",
        "url": "https://carta.cooking",
    }
    for nombre, job in trabajos.items():
        if nombre != "produccion":
            assert "environment" not in job, nombre
            assert "RAILWAY_TOKEN" not in json.dumps(job), nombre


def test_deploy_pasos_sin_interpolar_en_run_y_acciones_por_sha() -> None:
    for nombre, job in _deploy()["jobs"].items():
        for paso in job["steps"]:
            if "uses" in paso:
                assert re.fullmatch(ACCION_POR_SHA, paso["uses"]), paso["uses"]
            # Inyección: nada se interpola dentro de un `run`; todo viaja por `env`.
            assert "${{" not in paso.get("run", ""), (nombre, paso.get("name"))
        for checkout in _checkouts(job):
            assert checkout["with"]["persist-credentials"] is False, nombre


def test_deploy_cada_trabajo_saca_el_commit_verificado() -> None:
    trabajos = _deploy()["jobs"]
    (propio,) = _checkouts(trabajos["verificar"])
    assert propio["with"]["ref"].startswith("refs/tags/")
    assert propio["with"]["fetch-depth"] == 0, "merge-base necesita la historia"
    for nombre in ("produccion", "humo", "publicar"):
        for checkout in _checkouts(trabajos[nombre]):
            assert checkout["with"]["ref"] == "${{ needs.verificar.outputs.sha }}", nombre
    assert _checkouts(trabajos["produccion"]) and _checkouts(trabajos["publicar"])


def test_deploy_exige_ci_en_verde_master_y_etiqueta_semver() -> None:
    trabajos = _deploy()["jobs"]
    assert trabajos["produccion"]["needs"] == "verificar"
    assert trabajos["humo"]["needs"] == "produccion"
    # `:latest` en GHCR sólo se mueve si producción quedó desplegada.
    assert {"verificar", "produccion"} <= set(trabajos["publicar"]["needs"])
    pasos = trabajos["verificar"]["steps"]
    (ci,) = [p for p in pasos if "actions/workflows/ci.yml/runs" in p.get("run", "")]
    assert "status=success" in ci["run"]
    assert re.search(r"if \[.*\]; then.*\n.*exit 1", ci["run"], re.S), ci["run"]
    guion = _pasos(trabajos["verificar"])
    assert 'merge-base --is-ancestor "$SHA" origin/master' in guion
    assert "exit 1" in guion.split("merge-base --is-ancestor", 1)[1]
    (validar,) = [p for p in pasos if "=~" in p.get("run", "")]
    patron = re.search(r"\[\[ \"\$ETIQUETA\" =~ (\S+) \]\]", validar["run"])
    assert patron, validar["run"]
    # En el `=~` de bash `$` es el final de la cadena; en Python `\Z`.
    expresion = re.compile(patron.group(1).removesuffix("$") + r"\Z")
    for buena in ("v0.0.1", "v1.2.3", "v1.0.0-rc.1"):
        assert expresion.match(buena), buena
    malas = ("v1", "1.0.0", "v1.0.0;rm", "v1.0.0 x", "main", "v1.0.0\n")
    for mala in (*malas, "xv1.0.0", "a v1.0.0", "v1.0.0-"):
        assert not expresion.search(mala), mala


def test_deploy_instala_la_cli_fijada_y_despliega_sin_tragarse_errores() -> None:
    trabajos = _deploy()["jobs"]
    produccion = trabajos["produccion"]
    texto = json.dumps(produccion)
    assert re.search(r'"RAILWAY_CLI_VERSION": "\d+\.\d+\.\d+"', texto)
    assert re.search(r'"RAILWAY_CLI_SHA256": "[0-9a-f]{64}"', texto)
    guion = _pasos(produccion)
    assert "sha256sum -c" in guion
    assert "railway up --environment produccion --service api" in guion
    # Staging no se despliega desde aquí: lo hace Railway desde la rama del panel.
    assert "staging" not in guion
    for nombre in ("produccion", "humo"):
        for paso in trabajos[nombre]["steps"]:
            assert "continue-on-error" not in paso, (nombre, paso.get("name"))
            guion = paso.get("run", "")
            assert "|| true" not in guion and "set +e" not in guion, (nombre, paso.get("name"))
        assert "continue-on-error" not in trabajos[nombre]


def test_humo_en_su_propio_trabajo_contra_la_url_de_la_variable() -> None:
    humo = _deploy()["jobs"]["humo"]
    assert humo["env"]["URL_PRODUCCION"] == "https://carta.cooking"
    assert "secrets." not in json.dumps(humo)
    guion = _pasos(humo)
    curls = [linea for linea in guion.splitlines() if "curl " in linea]
    assert curls and all('"$URL_PRODUCCION' in linea for linea in curls), curls
    assert "https://carta.cooking" not in guion, "la URL sale de la variable"
    for fragmento in ('/health"', '/ready"', "content-security-policy", "strict-transport"):
        assert fragmento in guion, fragmento
    assert 'curl -sI "$URL_PRODUCCION/" | grep -i content-security-policy' in guion


def test_publicar_sube_la_imagen_a_ghcr_con_la_etiqueta_y_latest() -> None:
    publicar = _deploy()["jobs"]["publicar"]
    guion = _pasos(publicar)
    assert "docker login ghcr.io" in guion and "--password-stdin" in guion
    assert publicar["env"]["IMAGEN"] == "ghcr.io/klvinlopez/carta"
    assert publicar["env"]["IMAGEN_RESPALDO"] == "ghcr.io/klvinlopez/carta-respaldo"
    lineas = {linea.strip() for linea in guion.splitlines()}
    for push in (
        'docker push "$IMAGEN:$ETIQUETA"',
        'docker push "$IMAGEN:latest"',
        'docker push "$IMAGEN_RESPALDO:$ETIQUETA"',
        'docker push "$IMAGEN_RESPALDO:latest"',
    ):
        assert push in lineas, push
    assert "org.opencontainers.image.source" in guion
    ultimo = publicar["steps"][-1]
    assert "docker logout" in ultimo["run"] and ultimo["if"] == "always()"


def test_dependabot_vigila_actions_y_las_dos_imagenes_docker() -> None:
    config = yaml.safe_load(DEPENDABOT.read_text(encoding="utf-8"))
    vigilados = {(u["package-ecosystem"], u["directory"]) for u in config["updates"]}
    assert {
        ("github-actions", "/"),
        ("docker", "/"),
        ("docker", "/deploy/respaldo"),
    } <= vigilados


def test_build_system_fijado() -> None:
    """El segundo `uv sync` construye `carta` con el backend de `[build-system]`, que no está
    en `uv.lock`: sin versión exacta, el build de la imagen no es reproducible."""
    import tomllib

    requisitos = tomllib.loads(PYPROJECT.read_text(encoding="utf-8"))["build-system"]["requires"]
    assert requisitos and all("==" in r for r in requisitos), requisitos


def test_railwayignore_no_deja_fuera_nada_que_copie_el_dockerfile() -> None:
    patrones = {
        linea.strip()
        for linea in RAILWAYIGNORE.read_text(encoding="utf-8").splitlines()
        if linea.strip() and not linea.startswith("#")
    }
    for pesado in (
        "/marketing/",
        "/docs/",
        "/prototipo/",
        "/stitch/",
        "/tests/",
        "/datos/",
        "/.venv/",
        "**/.env*",
    ):
        assert pesado in patrones, pesado
    # Sintaxis de .gitignore: una carpeta sin `/` delante coincide a cualquier profundidad
    # (`pruebas/` taparía frontend/src/pruebas/). Todas ancladas salvo las `**/`.
    for patron in patrones:
        assert patron.startswith(("/", "**/")), patron
    instrucciones = instrucciones_dockerfile(DOCKERFILE.read_text(encoding="utf-8"))
    copiados = {
        origen.rstrip("/")
        for ins, arg in instrucciones
        if ins == "COPY" and not arg.startswith("--from")
        for origen in arg.split()[:-1]
    }
    copiados |= {"Dockerfile", "uv.lock", "pyproject.toml", "scripts/predespliegue.py"}
    for ruta in copiados:
        for patron in patrones:
            limpio = patron.strip("/")
            assert not (ruta == limpio or ruta.startswith(limpio + "/")), (ruta, patron)


def test_terraform_vive_en_el_anexo_de_la_etapa_2() -> None:
    assert not (RAIZ / "terraform").exists()
    assert (ETAPA2 / "main.tf").is_file()
    assert "no se usa en la v1" in (ETAPA2 / "README.md").read_text(encoding="utf-8")


def test_el_comando_previo_es_el_script_de_predespliegue() -> None:
    """`alembic upgrade head` a secas falla cuando la base va por delante del código (rollback
    por etiqueta); el comando previo es `scripts/predespliegue.py` en todos los sitios."""
    assert (RAIZ / "scripts" / "predespliegue.py").is_file()
    for archivo in (GUIA_RAILWAY, GUIA_DESPLIEGUE, OPERACION):
        texto = archivo.read_text(encoding="utf-8")
        assert PREDESPLIEGUE in texto, archivo
        assert "`uv run alembic upgrade head`" not in texto, archivo


def test_guias_de_despliegue_dicen_que_poner() -> None:
    guia = GUIA_RAILWAY.read_text(encoding="utf-8")
    for fragmento in (
        "/health",
        "0 4 * * *",
        "${{Postgres.DATABASE_URL}}",
        "staging.carta.cooking",
        "claude/gifted-allen-rqjiup",
        "carta-publico-staging",
        "carta-privado-produccion",
        "https://img-staging.carta.cooking",
        "https://img.carta.cooking",
        "RESPALDO_DIAS=30",
        "WORKERS=2",
        "/deploy/respaldo/**",
        "Wait for CI",
        "openssl rand -base64 32",
        "RandomNumberGenerator",
        "Account ID",
        "TXT",
        "Environments",
        "Environment secrets",
    ):
        assert fragmento in guia, fragmento
    pasos = GUIA_DESPLIEGUE.read_text(encoding="utf-8")
    for fragmento in ("git tag", "git push origin", "Rollback", "deploy.yml", "workflow_dispatch"):
        assert fragmento in pasos, fragmento
    # La llave PÚBLICA de age de Calvin va escrita (la misma en los dos ambientes).
    assert guia.count(f"RESPALDO_CLAVE_AGE={LLAVE_PUBLICA_AGE}") == 2


PALABRA_SECRETA = re.compile(r"TOKEN|SECRET|KEY|PASSWORD|CLAVE", re.I)
VALOR_LARGO = re.compile(r"[A-Za-z0-9_+/=-]{32,}")
PERMITIDOS = re.compile(r"<[^>]*>|\$\{\{[^}]*\}\}|" + re.escape(LLAVE_PUBLICA_AGE))
TOKEN_GITHUB = re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}")
UUID = re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", re.I)


def test_guias_de_despliegue_no_traen_secretos() -> None:
    archivos = [*sorted((RAIZ / "deploy").rglob("*.md")), OPERACION]
    for archivo in archivos:
        for numero, linea in enumerate(archivo.read_text(encoding="utf-8").splitlines(), 1):
            donde = f"{archivo.relative_to(RAIZ)}:{numero}"
            assert "AGE-SECRET-KEY-" not in linea.upper(), donde
            assert not TOKEN_GITHUB.search(linea), donde
            assert not UUID.search(linea), donde
            if PALABRA_SECRETA.search(linea):
                assert not VALOR_LARGO.search(PERMITIDOS.sub("", linea)), donde
            otras = set(re.findall(r"age1[a-z0-9]{50,}", linea)) - {LLAVE_PUBLICA_AGE}
            assert not otras, donde
