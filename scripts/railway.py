"""Operación del environment `staging` de Railway desde una sesión (T-0.9).

    uv run python scripts/railway.py estado [--estricto]
    uv run python scripts/railway.py despliegues api [-n 10]
    uv run python scripts/railway.py logs api [--despliegue ID] [--tipo ejecucion|construccion|http]
                                              [-n 100] [--filtro TEXTO]
    uv run python scripts/railway.py variables api
    uv run python scripts/railway.py variable api WORKERS 2 [--sin-desplegar] [--esperar]
    uv run python scripts/railway.py redesplegar api [--esperar]
    uv run python scripts/railway.py esperar api [--plazo 600]
    uv run python scripts/railway.py dominios api

Habla con la API GraphQL pública de Railway (`https://backboard.railway.com/graphql/v2`) con un
*project token* del environment `staging`. El token nunca vive en el repositorio ni en el chat:

- En una sesión en la nube lo inyecta el proxy de la sesión (un *network secret* para
  `backboard.railway.com`, cabecera `Project-Access-Token`); este script no lo ve ni lo manda.
- En cualquier otro sitio se lee de la variable de entorno `RAILWAY_TOKEN_STAGING`.

Tres límites que el script hace cumplir (el skill `/railway` cuenta el porqué):

1. **Sólo staging.** Antes de cualquier consulta pregunta a Railway de qué environment es el
   token y se niega si no es `staging`. Producción se despliega con el PR de `VERSION` y la
   aprobación de Calvin en GitHub (`deploy/README.md` §3), nunca desde aquí.
2. **Los secretos no se leen.** La API devuelve en claro toda variable sin sellar; aquí sólo se
   muestra el valor de las que están en `VARIABLES_NO_SECRETAS`. El resto sale como «oculta»
   (o «sellada» si Railway ya no la entrega).
3. **Los secretos no se escriben.** `variable` sólo cambia nombres de `VARIABLES_NO_SECRETAS`
   que no estén en `SOLO_LECTURA`; un secreto se cambia en el panel de Railway.

Sale con 0 si todo fue bien, 1 si `estado --estricto` encontró avisos o un despliegue esperado
no terminó en `SUCCESS`, y 2 si Railway rechazó la petición o el uso es incorrecto.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import ssl
import sys
import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Any

import httpx

URL_API = "https://backboard.railway.com/graphql/v2"
CABECERA_TOKEN = "Project-Access-Token"
VARIABLE_TOKEN = "RAILWAY_TOKEN_STAGING"
ENVIRONMENT_PERMITIDO = "staging"
RAMA_DE_STAGING = "master"
PLAZO_PETICION_S = 30.0
PAUSA_ESPERA_S = 10.0

# Variables cuyo valor se puede mostrar y cambiar: configuración que ya está escrita en
# `deploy/railway/README.md`. Una variable nueva que no sea secreta se añade aquí en un PR; lo
# que no está, no se lee. Quedan fuera a propósito `VITE_FIREBASE_API_KEY` (pública, pero con
# forma de llave: no hace falta en ningún chat), `R2_ENDPOINT` (lleva el id de la cuenta) y
# `R2_ACCESS_KEY_ID`.
VARIABLES_NO_SECRETAS = frozenset(
    {
        "ENTORNO",
        "DOMINIO",
        "PORT",
        "WORKERS",
        "R2_BUCKET_PUBLICO",
        "R2_BUCKET_PRIVADO",
        "R2_URL_PUBLICA",
        "FIREBASE_PROJECT_ID",
        "FIREBASE_CSP_CONNECT_SRC",
        "FIREBASE_CSP_SCRIPT_SRC",
        "FIREBASE_CSP_FRAME_SRC",
        "VITE_FIREBASE_AUTH_DOMAIN",
        "VITE_FIREBASE_PROJECT_ID",
        "VITE_FIREBASE_APP_ID",
        "CLOUDFLARE_ZONE_ID",
        "RESPALDO_CLAVE_AGE",
        "RESPALDO_DIAS",
    }
)
# Se leen pero no se cambian desde aquí: `ENTORNO=desarrollo` abriría las rutas de desarrollo
# y `PORT` es donde Railway hace el healthcheck.
SOLO_LECTURA = frozenset({"ENTORNO", "PORT"})
# Las que la guía manda sellar (deploy/railway/README.md, paso C.5): si la API las entrega,
# están sin sellar y `estado` lo avisa (sin mostrar el valor).
DEBEN_ESTAR_SELLADAS = frozenset(
    {"SECRET_KEY", "R2_SECRET_ACCESS_KEY", "CLOUDFLARE_API_TOKEN", "ANTHROPIC_API_KEY"}
)

ESTADOS_DE_FALLO = frozenset({"FAILED", "CRASHED"})
ESTADOS_TERMINALES = ESTADOS_DE_FALLO | {"SUCCESS", "REMOVED", "SKIPPED", "SLEEPING"}
TIPOS_DE_LOG = ("ejecucion", "construccion", "http")

CONSULTA_TOKEN = """
query {
  projectToken { projectId environmentId project { name } environment { name } }
}
"""
CONSULTA_SERVICIOS = """
query($environment: String!) {
  environment(id: $environment) {
    serviceInstances {
      edges { node {
        serviceId serviceName cronSchedule
        latestDeployment { id status createdAt }
      } }
    }
    deploymentTriggers {
      edges { node { serviceId branch checkSuites } }
    }
  }
}
"""
CONSULTA_DESPLIEGUES = """
query($n: Int!, $entrada: DeploymentListInput!) {
  deployments(first: $n, input: $entrada) {
    edges { node { id status createdAt meta } }
  }
}
"""
CONSULTA_DESPLIEGUE = """
query($id: String!) {
  deployment(id: $id) { id status environmentId serviceId }
}
"""
CONSULTA_LOGS_EJECUCION = """
query($despliegue: String!, $n: Int, $filtro: String) {
  deploymentLogs(deploymentId: $despliegue, limit: $n, filter: $filtro) {
    timestamp severity message attributes { key value }
  }
}
"""
CONSULTA_LOGS_CONSTRUCCION = """
query($despliegue: String!, $n: Int, $filtro: String) {
  buildLogs(deploymentId: $despliegue, limit: $n, filter: $filtro) {
    timestamp severity message attributes { key value }
  }
}
"""
CONSULTA_LOGS_HTTP = """
query($despliegue: String!, $n: Int, $filtro: String) {
  httpLogs(deploymentId: $despliegue, limit: $n, filter: $filtro) {
    timestamp method path httpStatus totalDuration requestId
  }
}
"""
CONSULTA_VARIABLES = """
query($proyecto: String!, $environment: String!, $servicio: String!) {
  variables(
    projectId: $proyecto, environmentId: $environment, serviceId: $servicio, unrendered: true
  )
}
"""
MUTACION_VARIABLE = """
mutation($entrada: VariableUpsertInput!) {
  variableUpsert(input: $entrada)
}
"""
MUTACION_REDESPLEGAR = """
mutation($id: String!) {
  deploymentRedeploy(id: $id) { id status }
}
"""
CONSULTA_DOMINIOS = """
query($proyecto: String!, $environment: String!, $servicio: String!) {
  domains(projectId: $proyecto, environmentId: $environment, serviceId: $servicio) {
    serviceDomains { domain targetPort }
    customDomains {
      domain targetPort
      status {
        verified certificateStatus cdnProvider
        dnsRecords { fqdn recordType requiredValue currentValue status }
      }
    }
  }
}
"""

SIN_ACCESO = (
    "Railway no aceptó el token. En una sesión en la nube falta el network secret de "
    f"backboard.railway.com (cabecera {CABECERA_TOKEN}); fuera de ella, exporta "
    f"{VARIABLE_TOKEN} con un project token del environment staging."
)


class ErrorRailway(Exception):
    """Fallo que se cuenta a quien opera en una línea, sin traza."""


@dataclass(frozen=True)
class Contexto:
    proyecto_id: str
    proyecto: str
    environment_id: str
    environment: str


@dataclass(frozen=True)
class Servicio:
    id: str
    nombre: str
    rama: str | None
    espera_ci: bool | None
    cron: str | None
    despliegue_id: str | None
    despliegue_estado: str | None
    despliegue_fecha: str | None


def crear_cliente(entorno: dict[str, str] | None = None) -> httpx.Client:
    """Cliente HTTP: respeta el proxy y la CA del entorno; el token sólo si viene por variable."""
    entorno = dict(os.environ) if entorno is None else entorno
    cabeceras = {"Content-Type": "application/json"}
    token = entorno.get(VARIABLE_TOKEN, "").strip()
    if token:
        cabeceras[CABECERA_TOKEN] = token
    # `create_default_context` lee SSL_CERT_FILE: la CA del proxy de la sesión en la nube.
    return httpx.Client(
        headers=cabeceras, timeout=PLAZO_PETICION_S, verify=ssl.create_default_context()
    )


class Railway:
    """Las operaciones de `/railway`. Toda operación pasa primero por `contexto()`."""

    def __init__(self, cliente: httpx.Client) -> None:
        self._cliente = cliente
        self._contexto: Contexto | None = None

    # ── Transporte ──────────────────────────────────────────────────────────

    def _consultar(self, consulta: str, variables: dict[str, Any] | None = None) -> dict[str, Any]:
        try:
            respuesta = self._cliente.post(
                URL_API, json={"query": consulta, "variables": variables or {}}
            )
        except httpx.HTTPError as error:
            raise ErrorRailway(f"no se pudo hablar con Railway ({type(error).__name__})") from error
        if respuesta.status_code in (401, 403):
            raise ErrorRailway(SIN_ACCESO)
        try:
            cuerpo = respuesta.json()
        except ValueError as error:
            raise ErrorRailway(f"Railway respondió {respuesta.status_code} sin JSON") from error
        errores = cuerpo.get("errors") if isinstance(cuerpo, dict) else None
        if errores:
            mensajes = [str(e.get("message", "error sin mensaje")) for e in errores]
            if any("not authorized" in m.lower() for m in mensajes):
                raise ErrorRailway(SIN_ACCESO)
            raise ErrorRailway("Railway rechazó la consulta: " + "; ".join(mensajes))
        datos = cuerpo.get("data") if isinstance(cuerpo, dict) else None
        if respuesta.status_code >= 400 or not isinstance(datos, dict):
            raise ErrorRailway(f"Railway respondió {respuesta.status_code} sin datos")
        return datos

    def contexto(self) -> Contexto:
        """De qué proyecto y environment es el token. Se niega si no es staging."""
        if self._contexto is None:
            token = self._consultar(CONSULTA_TOKEN)["projectToken"]
            contexto = Contexto(
                proyecto_id=token["projectId"],
                proyecto=token["project"]["name"],
                environment_id=token["environmentId"],
                environment=token["environment"]["name"],
            )
            if contexto.environment != ENVIRONMENT_PERMITIDO:
                raise ErrorRailway(
                    f"el token es del environment «{contexto.environment}» y esta herramienta "
                    f"sólo opera «{ENVIRONMENT_PERMITIDO}». Producción se publica con el PR de "
                    "VERSION y la aprobación de Calvin en GitHub (deploy/README.md §3)."
                )
            self._contexto = contexto
        return self._contexto

    # ── Lecturas ────────────────────────────────────────────────────────────

    def servicios(self) -> list[Servicio]:
        contexto = self.contexto()
        environment = self._consultar(CONSULTA_SERVICIOS, {"environment": contexto.environment_id})[
            "environment"
        ]
        disparadores = {
            arista["node"]["serviceId"]: arista["node"]
            for arista in environment["deploymentTriggers"]["edges"]
        }
        servicios = []
        for arista in environment["serviceInstances"]["edges"]:
            nodo = arista["node"]
            disparador = disparadores.get(nodo["serviceId"])
            ultimo = nodo.get("latestDeployment") or {}
            servicios.append(
                Servicio(
                    id=nodo["serviceId"],
                    nombre=nodo["serviceName"],
                    rama=disparador["branch"] if disparador else None,
                    espera_ci=disparador["checkSuites"] if disparador else None,
                    cron=nodo.get("cronSchedule"),
                    despliegue_id=ultimo.get("id"),
                    despliegue_estado=ultimo.get("status"),
                    despliegue_fecha=ultimo.get("createdAt"),
                )
            )
        return sorted(servicios, key=lambda s: s.nombre.lower())

    def servicio(self, nombre: str) -> Servicio:
        servicios = self.servicios()
        for servicio in servicios:
            if servicio.nombre.lower() == nombre.lower():
                return servicio
        disponibles = ", ".join(s.nombre for s in servicios) or "ninguno"
        raise ErrorRailway(f"no hay un servicio «{nombre}» en staging (hay: {disponibles})")

    def despliegues(self, servicio: Servicio, n: int) -> list[dict[str, Any]]:
        contexto = self.contexto()
        entrada = {
            "projectId": contexto.proyecto_id,
            "environmentId": contexto.environment_id,
            "serviceId": servicio.id,
        }
        datos = self._consultar(CONSULTA_DESPLIEGUES, {"n": n, "entrada": entrada})
        return [arista["node"] for arista in datos["deployments"]["edges"]]

    def despliegue(self, despliegue_id: str) -> dict[str, Any]:
        """Un despliegue por id, sólo si es de staging (el token no debería ver otro)."""
        contexto = self.contexto()
        despliegue = self._consultar(CONSULTA_DESPLIEGUE, {"id": despliegue_id})["deployment"]
        if despliegue["environmentId"] != contexto.environment_id:
            raise ErrorRailway(f"el despliegue {despliegue_id} no es de staging")
        return despliegue

    def logs(
        self, despliegue_id: str, tipo: str, n: int, filtro: str | None
    ) -> list[dict[str, Any]]:
        self.despliegue(despliegue_id)
        consulta, campo = {
            "ejecucion": (CONSULTA_LOGS_EJECUCION, "deploymentLogs"),
            "construccion": (CONSULTA_LOGS_CONSTRUCCION, "buildLogs"),
            "http": (CONSULTA_LOGS_HTTP, "httpLogs"),
        }[tipo]
        datos = self._consultar(consulta, {"despliegue": despliegue_id, "n": n, "filtro": filtro})
        return list(datos[campo])

    def _variables_en_claro(self, servicio: Servicio) -> dict[str, str | None]:
        """Lo que entrega la API: **incluye secretos sin sellar**. Nunca se imprime tal cual."""
        contexto = self.contexto()
        datos = self._consultar(
            CONSULTA_VARIABLES,
            {
                "proyecto": contexto.proyecto_id,
                "environment": contexto.environment_id,
                "servicio": servicio.id,
            },
        )
        return dict(datos["variables"])

    def variables(self, servicio: Servicio) -> list[tuple[str, str]]:
        """Pares (nombre, texto mostrable): el valor sólo de las no secretas."""
        en_claro = self._variables_en_claro(servicio)
        return [
            (nombre, presentar_variable(nombre, en_claro[nombre])) for nombre in sorted(en_claro)
        ]

    def sin_sellar(self, servicio: Servicio) -> list[str]:
        """Nombres que la guía manda sellar y que la API todavía entrega en claro."""
        en_claro = self._variables_en_claro(servicio)
        return sorted(n for n in DEBEN_ESTAR_SELLADAS if en_claro.get(n) is not None)

    def dominios(self, servicio: Servicio) -> dict[str, Any]:
        contexto = self.contexto()
        datos = self._consultar(
            CONSULTA_DOMINIOS,
            {
                "proyecto": contexto.proyecto_id,
                "environment": contexto.environment_id,
                "servicio": servicio.id,
            },
        )
        return dict(datos["domains"])

    # ── Escrituras ──────────────────────────────────────────────────────────

    def cambiar_variable(
        self, servicio: Servicio, nombre: str, valor: str, *, sin_desplegar: bool
    ) -> None:
        comprobar_escritura(nombre, valor)
        contexto = self.contexto()
        entrada = {
            "projectId": contexto.proyecto_id,
            "environmentId": contexto.environment_id,
            "serviceId": servicio.id,
            "name": nombre,
            "value": valor,
            "skipDeploys": sin_desplegar,
        }
        if self._consultar(MUTACION_VARIABLE, {"entrada": entrada})["variableUpsert"] is not True:
            raise ErrorRailway(f"Railway no confirmó el cambio de {nombre}")

    def redesplegar(self, servicio: Servicio) -> dict[str, Any]:
        """Repite el último despliegue del servicio (misma fuente, variables de ahora)."""
        self.contexto()
        if servicio.despliegue_id is None:
            raise ErrorRailway(f"«{servicio.nombre}» no tiene ningún despliegue que repetir")
        datos = self._consultar(MUTACION_REDESPLEGAR, {"id": servicio.despliegue_id})
        return dict(datos["deploymentRedeploy"])

    def esperar(
        self,
        nombre: str,
        *,
        distinto_de: str | None,
        plazo_s: float,
        dormir: Callable[[float], None] = time.sleep,
        reloj: Callable[[], float] = time.monotonic,
        avisar: Callable[[str], None] = lambda _linea: None,
    ) -> Servicio:
        """Espera a que el último despliegue del servicio termine.

        Con `distinto_de`, espera primero a que aparezca un despliegue nuevo (el que provocó
        un cambio de variable): sin eso se daría por bueno el despliegue anterior.
        """
        limite = reloj() + plazo_s
        visto: tuple[str | None, str | None] | None = None
        while True:
            servicio = self.servicio(nombre)
            actual = (servicio.despliegue_id, servicio.despliegue_estado)
            if actual != visto:
                avisar(f"{servicio.nombre}: {resumen_despliegue(servicio)}")
                visto = actual
            es_nuevo = distinto_de is None or servicio.despliegue_id != distinto_de
            if es_nuevo and servicio.despliegue_estado in ESTADOS_TERMINALES:
                return servicio
            if reloj() >= limite:
                raise ErrorRailway(
                    f"«{nombre}» no terminó de desplegar en {plazo_s:.0f} s "
                    f"(último estado: {servicio.despliegue_estado})"
                )
            dormir(PAUSA_ESPERA_S)


# ── Reglas de variables (puras) ─────────────────────────────────────────────


def presentar_variable(nombre: str, valor: str | None) -> str:
    if valor is None:
        return "«sellada»"
    if nombre not in VARIABLES_NO_SECRETAS:
        if nombre in DEBEN_ESTAR_SELLADAS:
            return "«oculta» · SIN SELLAR: séllala en el panel (⋮ → Seal)"
        return "«oculta»"
    return valor


def comprobar_escritura(nombre: str, valor: str) -> None:
    if nombre in SOLO_LECTURA:
        raise ErrorRailway(f"{nombre} no se cambia desde aquí (sólo lectura): hazlo en el panel")
    if nombre not in VARIABLES_NO_SECRETAS:
        raise ErrorRailway(
            f"{nombre} no está en la lista de variables no secretas de scripts/railway.py: "
            "un secreto se cambia en el panel de Railway; si no es secreto, añádelo a "
            "VARIABLES_NO_SECRETAS en un PR"
        )
    if not valor.strip():
        raise ErrorRailway(f"{nombre} no puede quedar vacía desde aquí")
    if len(valor) > 2000 or re.search(r"[\x00-\x1f\x7f]", valor):
        raise ErrorRailway(f"el valor de {nombre} es demasiado largo o trae saltos de línea")
    if "${{" in valor:
        raise ErrorRailway(
            f"el valor de {nombre} no puede ser una referencia ${{{{…}}}}: copiaría otra variable"
        )


# ── Presentación ────────────────────────────────────────────────────────────


def _fecha(marca: str | None) -> str:
    return (marca or "")[:16].replace("T", " ") or "—"


def resumen_despliegue(servicio: Servicio) -> str:
    if servicio.despliegue_id is None:
        return "sin despliegues"
    return (
        f"{servicio.despliegue_estado} {_fecha(servicio.despliegue_fecha)} "
        f"({servicio.despliegue_id[:8]})"
    )


def linea_de_log(linea: dict[str, Any]) -> str:
    """Una línea de log legible.

    La API de Carta escribe JSON por línea con la clave `mensaje`; Railway lo parte en
    `attributes` (valores en JSON) y deja `message` vacío. Aquí se vuelve a armar:
    `logger mensaje clave=valor…`, sin los campos que repiten la hora y el nivel.
    """
    texto = str(linea.get("message") or "")
    if not texto.strip():
        atributos = {a["key"]: _valor_json(a["value"]) for a in linea.get("attributes") or []}
        partes = [
            str(atributos.pop(clave)) for clave in ("logger", "mensaje") if clave in atributos
        ]
        partes += [
            f"{clave}={valor}"
            for clave, valor in atributos.items()
            if clave not in ("level", "ts", "nivel") and valor is not None
        ]
        texto = " ".join(partes)
    return f"{str(linea['timestamp'])[:19]} {linea.get('severity') or '-'} {texto}".rstrip()


def _valor_json(crudo: str) -> Any:
    try:
        return json.loads(crudo)
    except ValueError:
        return crudo


def avisos(servicios: Sequence[Servicio], sin_sellar: dict[str, list[str]]) -> list[str]:
    """Lo que no está como dice `deploy/railway/README.md`."""
    lista = []
    for servicio in servicios:
        if servicio.despliegue_estado in ESTADOS_DE_FALLO:
            lista.append(
                f"{servicio.nombre}: el último despliegue terminó en "
                f"{servicio.despliegue_estado}; mira `logs {servicio.nombre}`"
            )
        if servicio.rama is not None and servicio.rama != RAMA_DE_STAGING:
            lista.append(
                f"{servicio.nombre}: sigue la rama «{servicio.rama}», no «{RAMA_DE_STAGING}» "
                "(Settings → Source → Branch): un merge a master no llega a staging"
            )
        if servicio.espera_ci is False:
            lista.append(f"{servicio.nombre}: Wait for CI está apagado")
        for nombre in sin_sellar.get(servicio.nombre, []):
            lista.append(f"{servicio.nombre}: {nombre} está sin sellar (Variables → ⋮ → Seal)")
    return lista


def _tabla(filas: Sequence[Sequence[str]]) -> list[str]:
    anchos = [max(len(fila[i]) for fila in filas) for i in range(len(filas[0]))]
    return [
        "  ".join(c.ljust(a) for c, a in zip(fila, anchos, strict=True)).rstrip() for fila in filas
    ]


def orden_estado(railway: Railway, args: argparse.Namespace, salida: Callable[[str], None]) -> int:
    contexto = railway.contexto()
    servicios = railway.servicios()
    salida(f"Railway · proyecto {contexto.proyecto} · environment {contexto.environment}")
    filas = [("servicio", "rama", "espera CI", "último despliegue", "cron")]
    for s in servicios:
        ci = "—" if s.espera_ci is None else ("sí" if s.espera_ci else "no")
        filas.append((s.nombre, s.rama or "—", ci, resumen_despliegue(s), s.cron or "—"))
    for linea in _tabla(filas):
        salida(linea)
    sin_sellar = {s.nombre: railway.sin_sellar(s) for s in servicios}
    lista = avisos(servicios, sin_sellar)
    if not lista:
        salida("Sin avisos.")
        return 0
    salida("Avisos:")
    for aviso in lista:
        salida(f"  - {aviso}")
    return 1 if args.estricto else 0


def orden_despliegues(
    railway: Railway, args: argparse.Namespace, salida: Callable[[str], None]
) -> int:
    servicio = railway.servicio(args.servicio)
    filas = [("id", "estado", "creado", "rama", "commit", "mensaje")]
    for d in railway.despliegues(servicio, args.n):
        meta = d.get("meta") or {}
        mensaje = str(meta.get("commitMessage") or meta.get("skippedReason") or "").splitlines()
        filas.append(
            (
                d["id"],
                d["status"],
                _fecha(d.get("createdAt")),
                str(meta.get("branch") or "—"),
                str(meta.get("commitHash") or "—")[:7],
                (mensaje[0] if mensaje else "")[:70],
            )
        )
    for linea in _tabla(filas):
        salida(linea)
    return 0


def orden_logs(railway: Railway, args: argparse.Namespace, salida: Callable[[str], None]) -> int:
    servicio = railway.servicio(args.servicio)
    despliegue_id = args.despliegue or servicio.despliegue_id
    if despliegue_id is None:
        raise ErrorRailway(f"«{servicio.nombre}» no tiene despliegues")
    lineas = railway.logs(despliegue_id, args.tipo, args.n, args.filtro)
    salida(f"# {servicio.nombre} · despliegue {despliegue_id} · {args.tipo} · {len(lineas)} líneas")
    for linea in lineas:
        if args.tipo == "http":
            salida(
                f"{linea['timestamp'][:19]} {linea['httpStatus']} {linea['method']} "
                f"{linea['path']} {linea['totalDuration']} ms {linea['requestId']}"
            )
        else:
            salida(linea_de_log(linea))
    return 0


def orden_variables(
    railway: Railway, args: argparse.Namespace, salida: Callable[[str], None]
) -> int:
    servicio = railway.servicio(args.servicio)
    pares = railway.variables(servicio)
    salida(f"# variables de {servicio.nombre} en staging ({len(pares)})")
    for linea in _tabla([(nombre, texto) for nombre, texto in pares] or [("(ninguna)", "")]):
        salida(linea)
    return 0


def orden_variable(
    railway: Railway, args: argparse.Namespace, salida: Callable[[str], None]
) -> int:
    servicio = railway.servicio(args.servicio)
    railway.cambiar_variable(servicio, args.nombre, args.valor, sin_desplegar=args.sin_desplegar)
    if args.sin_desplegar:
        salida(
            f"{args.nombre} cambiada en {servicio.nombre}; se aplicará en el próximo despliegue."
        )
        return 0
    salida(f"{args.nombre} cambiada en {servicio.nombre}; Railway redespliega (2 a 4 min).")
    if not args.esperar:
        return 0
    return _esperar(railway, servicio.nombre, servicio.despliegue_id, args.plazo, salida)


def orden_redesplegar(
    railway: Railway, args: argparse.Namespace, salida: Callable[[str], None]
) -> int:
    servicio = railway.servicio(args.servicio)
    nuevo = railway.redesplegar(servicio)
    salida(f"{servicio.nombre}: redespliegue {nuevo['id']} ({nuevo['status']})")
    if not args.esperar:
        return 0
    return _esperar(railway, servicio.nombre, servicio.despliegue_id, args.plazo, salida)


def orden_esperar(railway: Railway, args: argparse.Namespace, salida: Callable[[str], None]) -> int:
    return _esperar(railway, args.servicio, None, args.plazo, salida)


def _esperar(
    railway: Railway,
    nombre: str,
    distinto_de: str | None,
    plazo_s: float,
    salida: Callable[[str], None],
) -> int:
    servicio = railway.esperar(nombre, distinto_de=distinto_de, plazo_s=plazo_s, avisar=salida)
    return 0 if servicio.despliegue_estado == "SUCCESS" else 1


def orden_dominios(
    railway: Railway, args: argparse.Namespace, salida: Callable[[str], None]
) -> int:
    servicio = railway.servicio(args.servicio)
    dominios = railway.dominios(servicio)
    if not dominios["customDomains"] and not dominios["serviceDomains"]:
        salida(f"{servicio.nombre} no tiene dominios.")
        return 0
    for dominio in dominios["serviceDomains"]:
        salida(f"{dominio['domain']} (de Railway) → puerto {dominio.get('targetPort') or '—'}")
    for dominio in dominios["customDomains"]:
        estado = dominio["status"]
        salida(
            f"{dominio['domain']} → puerto {dominio.get('targetPort') or '—'} · "
            f"verificado: {'sí' if estado['verified'] else 'NO'} · "
            f"certificado: {_sin_prefijo(estado['certificateStatus'])} · "
            f"CDN: {_sin_prefijo(estado.get('cdnProvider') or '—')}"
        )
        for registro in estado["dnsRecords"]:
            salida(
                f"  {_sin_prefijo(registro['recordType'])} {registro['fqdn']} → "
                f"{registro['requiredValue']} · visto: {registro['currentValue'] or '—'} · "
                f"{_sin_prefijo(registro['status'])}"
            )
    return 0


def _sin_prefijo(valor: str) -> str:
    """`CERTIFICATE_STATUS_TYPE_VALID` → `VALID`; `DNS_RECORD_TYPE_CNAME` → `CNAME`."""
    return re.sub(
        r"^(CERTIFICATE_STATUS_TYPE|DETECTED_CDN_PROVIDER|DNS_RECORD_(TYPE|STATUS))_", "", valor
    )


def crear_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="railway.py", description="Opera el environment staging de Railway (T-0.9)."
    )
    ordenes = parser.add_subparsers(dest="orden", required=True)

    estado = ordenes.add_parser(
        "estado", help="servicios, rama que siguen, último despliegue y avisos"
    )
    estado.add_argument("--estricto", action="store_true", help="sale con 1 si hay avisos")
    estado.set_defaults(funcion=orden_estado)

    despliegues = ordenes.add_parser("despliegues", help="últimos despliegues de un servicio")
    despliegues.add_argument("servicio")
    despliegues.add_argument("-n", type=int, default=10, choices=range(1, 51), metavar="1-50")
    despliegues.set_defaults(funcion=orden_despliegues)

    logs = ordenes.add_parser("logs", help="logs de un despliegue (por defecto, el último)")
    logs.add_argument("servicio")
    logs.add_argument("--despliegue", help="id del despliegue (ver `despliegues`)")
    logs.add_argument("--tipo", choices=TIPOS_DE_LOG, default="ejecucion")
    logs.add_argument("-n", type=int, default=100, choices=range(1, 1001), metavar="1-1000")
    logs.add_argument("--filtro", help="texto que deben contener las líneas")
    logs.set_defaults(funcion=orden_logs)

    variables = ordenes.add_parser("variables", help="variables de un servicio, secretos ocultos")
    variables.add_argument("servicio")
    variables.set_defaults(funcion=orden_variables)

    variable = ordenes.add_parser("variable", help="cambia una variable no secreta")
    variable.add_argument("servicio")
    variable.add_argument("nombre")
    variable.add_argument("valor")
    variable.add_argument("--sin-desplegar", action="store_true", help="no redesplegar ahora")
    variable.set_defaults(funcion=orden_variable)

    redesplegar = ordenes.add_parser("redesplegar", help="repite el último despliegue")
    redesplegar.add_argument("servicio")
    redesplegar.set_defaults(funcion=orden_redesplegar)

    esperar = ordenes.add_parser("esperar", help="espera a que termine el despliegue en curso")
    esperar.add_argument("servicio")
    esperar.set_defaults(funcion=orden_esperar)

    for orden in (variable, redesplegar):
        orden.add_argument("--esperar", action="store_true", help="espera al despliegue nuevo")
    for orden in (variable, redesplegar, esperar):
        orden.add_argument("--plazo", type=float, default=600.0, help="segundos de espera (600)")

    dominios = ordenes.add_parser("dominios", help="dominios de un servicio y su estado")
    dominios.add_argument("servicio")
    dominios.set_defaults(funcion=orden_dominios)
    return parser


def main(
    argv: Sequence[str] | None = None,
    *,
    cliente: httpx.Client | None = None,
    salida: Callable[[str], None] = print,
) -> int:
    args = crear_parser().parse_args(argv)
    propio = cliente is None
    cliente = crear_cliente() if cliente is None else cliente
    try:
        return int(args.funcion(Railway(cliente), args, salida))
    except ErrorRailway as error:
        print(f"railway: {error}", file=sys.stderr)
        return 2
    except (KeyError, TypeError, IndexError) as error:
        # Railway cambió la forma de una respuesta: una línea, no una traza con datos dentro.
        print(
            f"railway: respuesta inesperada de Railway ({type(error).__name__}); revisa el "
            "esquema por introspección (skill /railway)",
            file=sys.stderr,
        )
        return 2
    finally:
        if propio:
            cliente.close()


if __name__ == "__main__":
    raise SystemExit(main())
