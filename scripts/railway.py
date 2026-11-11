"""Operación del environment `staging` de Railway desde una sesión (T-0.9).

    uv run python scripts/railway.py estado [--estricto]
    uv run python scripts/railway.py despliegues api [-n 10]
    uv run python scripts/railway.py logs api [--despliegue ID] [--tipo ejecucion|construccion|http]
                                              [-n 100] [--filtro TEXTO]
    uv run python scripts/railway.py variables api
    uv run python scripts/railway.py variable api WORKERS 2 [--sin-desplegar | --esperar]
    uv run python scripts/railway.py redesplegar api [--esperar]
    uv run python scripts/railway.py esperar api [--plazo 600]
    uv run python scripts/railway.py dominios api

Habla con la API GraphQL pública de Railway (`https://backboard.railway.com/graphql/v2`) con un
*project token* del environment `staging`. El token nunca vive en el repositorio ni en el chat:

- En una sesión en la nube lo inyecta el proxy de la sesión (un *network secret* para
  `backboard.railway.com`, cabecera `Project-Access-Token`); este script no lo ve ni lo manda.
- En cualquier otro sitio se lee de la variable de entorno `RAILWAY_TOKEN_STAGING`.

Límites que el script hace cumplir (el skill `/railway` cuenta el porqué):

1. **Sólo staging.** Antes de cualquier consulta pregunta a Railway de qué proyecto y environment
   es el token y se niega si no es `carta` / `staging`. Producción se despliega con el PR de
   `VERSION` y la aprobación de Calvin en GitHub (`deploy/README.md` §3), nunca desde aquí.
2. **Los secretos no se leen.** La API devuelve en claro toda variable sin sellar; aquí sólo se
   muestra el valor de las que están en `VARIABLES_NO_SECRETAS`. El resto sale como «oculta»
   (o «sellada» si Railway ya no la entrega), y `logs` tacha esos valores si aparecen.
3. **Escribir es sólo dejar staging como dice la guía.** `variable` cambia una variable que el
   servicio ya tiene y sólo al valor que `deploy/railway/README.md` fija para staging
   (`VALOR_FIJO`) o a un entero dentro de su rango (`VALOR_EN_RANGO`): corrige una errata, pero
   no puede apuntar staging a otro dominio, otro bucket u otro proyecto de Firebase.
4. **Sólo `api` y `respaldo` se operan.** La base se mira, no se toca.
5. **Lo que llega de Railway es texto ajeno.** Logs y mensajes de commit salen en una línea,
   sin caracteres de control y acotados; son datos, nunca instrucciones.

Sale con 0 si todo fue bien, 1 si `estado --estricto` encontró avisos o un despliegue esperado
no terminó en `SUCCESS`, 2 si Railway rechazó la petición, la orden no está permitida o el uso
es incorrecto, y 130 si se interrumpe.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import ssl
import sys
import time
import unicodedata
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Any

import httpx

URL_API = "https://backboard.railway.com/graphql/v2"
CABECERA_TOKEN = "Project-Access-Token"
VARIABLE_TOKEN = "RAILWAY_TOKEN_STAGING"
PROYECTO_PERMITIDO = "carta"
ENVIRONMENT_PERMITIDO = "staging"
RAMA_DE_STAGING = "master"
SERVICIOS_OPERABLES = ("api", "respaldo")
PLAZO_PETICION_S = 30.0
PAUSA_ESPERA_S = 10.0
PLAZO_MAXIMO_S = 3600.0
FALLOS_TOLERADOS = 3
TOPE_LINEA = 2000

# Lo que `variable` puede escribir. Los valores fijos son los que la guía de Railway manda poner
# en staging (pasos C y D): con ellos se corrige una errata y nada más. Cambiar uno de verdad
# (otro proyecto de Firebase, otro dominio) es un PR a esta tabla, que Calvin revisa.
_FIREBASE = "carta-staging-743b1"
VALOR_FIJO: dict[str, str] = {
    "ENTORNO": "staging",
    "PORT": "8000",
    "DOMINIO": "staging.carta.cooking",
    "R2_BUCKET_PUBLICO": "carta-publico-staging",
    "R2_BUCKET_PRIVADO": "carta-privado-staging",
    "R2_URL_PUBLICA": "https://img-staging.carta.cooking",
    "FIREBASE_PROJECT_ID": _FIREBASE,
    "FIREBASE_CSP_CONNECT_SRC": (
        "https://identitytoolkit.googleapis.com https://securetoken.googleapis.com"
    ),
    "FIREBASE_CSP_SCRIPT_SRC": "https://apis.google.com",
    "FIREBASE_CSP_FRAME_SRC": f"https://{_FIREBASE}.firebaseapp.com",
    "VITE_FIREBASE_AUTH_DOMAIN": f"{_FIREBASE}.firebaseapp.com",
    "VITE_FIREBASE_PROJECT_ID": _FIREBASE,
    "RESPALDO_CLAVE_AGE": "age1snv8uknzuhdupcpkh8dljw39979dlcjdr0x9p5ck68xgeqn09y6qj267mk",
}
VALOR_EN_RANGO: dict[str, range] = {"WORKERS": range(1, 9), "RESPALDO_DIAS": range(1, 366)}
# Se muestran pero no se cambian desde aquí (su valor no está en la guía).
SOLO_LECTURA = frozenset({"VITE_FIREBASE_APP_ID", "CLOUDFLARE_ZONE_ID"})
# Lo único cuyo valor se enseña. Quedan fuera a propósito `VITE_FIREBASE_API_KEY` (pública, pero
# con forma de llave: no hace falta en ningún chat), `R2_ENDPOINT` (lleva el id de la cuenta) y
# `R2_ACCESS_KEY_ID`. Una variable nueva que no sea secreta se añade aquí en un PR.
VARIABLES_NO_SECRETAS = frozenset(VALOR_FIJO) | frozenset(VALOR_EN_RANGO) | SOLO_LECTURA
# Las que la guía manda sellar (paso C.5): si la API las entrega, están sin sellar y `estado`
# lo avisa (sin mostrar el valor).
DEBEN_ESTAR_SELLADAS = frozenset(
    {"SECRET_KEY", "R2_SECRET_ACCESS_KEY", "CLOUDFLARE_API_TOKEN", "ANTHROPIC_API_KEY"}
)

ESTADOS_DE_FALLO = frozenset({"FAILED", "CRASHED"})
# Todo lo demás (también un estado que Railway invente mañana) cuenta como terminado: `esperar`
# nunca se queda mirando un estado que no conoce.
ESTADOS_EN_CURSO = frozenset({"INITIALIZING", "QUEUED", "WAITING", "BUILDING", "DEPLOYING"})
ESTADOS_REPETIBLES = frozenset({"SUCCESS"}) | ESTADOS_DE_FALLO
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


class ErrorTransitorio(ErrorRailway):
    """Red caída, 5xx o límite de tasa: repetir más tarde puede funcionar."""


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
    ramas: tuple[str, ...]
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
    # httpx no sigue redirecciones por defecto: el token no sale de backboard.railway.com.
    return httpx.Client(
        headers=cabeceras, timeout=PLAZO_PETICION_S, verify=ssl.create_default_context()
    )


class Railway:
    """Las operaciones de `/railway`. Toda operación pasa primero por `contexto()`."""

    def __init__(
        self,
        cliente: httpx.Client,
        *,
        dormir: Callable[[float], None] = time.sleep,
        reloj: Callable[[], float] = time.monotonic,
    ) -> None:
        self._cliente = cliente
        self._dormir = dormir
        self._reloj = reloj
        self._contexto: Contexto | None = None

    # ── Transporte ──────────────────────────────────────────────────────────

    def _consultar(self, consulta: str, variables: dict[str, Any] | None = None) -> dict[str, Any]:
        try:
            respuesta = self._cliente.post(
                URL_API, json={"query": consulta, "variables": variables or {}}
            )
        except httpx.HTTPError as error:
            raise ErrorTransitorio(
                f"no se pudo hablar con Railway ({type(error).__name__})"
            ) from error
        codigo = respuesta.status_code
        if codigo in (401, 403):
            raise ErrorRailway(SIN_ACCESO)
        if codigo == 429:
            espera = respuesta.headers.get("Retry-After", "")
            cuando = f"en {espera} s" if espera.isdigit() else "más tarde"
            raise ErrorTransitorio(
                f"Railway limita las peticiones (429; 1000 por hora): reintenta {cuando}"
            )
        if codigo >= 500:
            raise ErrorTransitorio(f"Railway respondió {codigo}")
        try:
            cuerpo = respuesta.json()
        except ValueError as error:
            raise ErrorRailway(f"Railway respondió {codigo} sin JSON") from error
        if not isinstance(cuerpo, dict):
            raise ErrorRailway(f"Railway respondió {codigo} sin datos")
        errores = cuerpo.get("errors")
        if errores:
            lista = errores if isinstance(errores, list) else [errores]
            mensajes = [
                str(e.get("message", "error sin mensaje")) if isinstance(e, dict) else str(e)
                for e in lista
            ]
            if any("not authorized" in m.lower() for m in mensajes):
                raise ErrorRailway(SIN_ACCESO)
            raise ErrorRailway("Railway rechazó la consulta: " + "; ".join(mensajes))
        datos = cuerpo.get("data")
        if codigo >= 400 or not isinstance(datos, dict):
            raise ErrorRailway(f"Railway respondió {codigo} sin datos")
        return datos

    def contexto(self) -> Contexto:
        """De qué proyecto y environment es el token. Se niega si no es `carta` / `staging`."""
        if self._contexto is None:
            token = self._consultar(CONSULTA_TOKEN)["projectToken"]
            contexto = Contexto(
                proyecto_id=token["projectId"],
                proyecto=token["project"]["name"],
                environment_id=token["environmentId"],
                environment=token["environment"]["name"],
            )
            if (
                contexto.environment != ENVIRONMENT_PERMITIDO
                or contexto.proyecto != PROYECTO_PERMITIDO
            ):
                raise ErrorRailway(
                    f"el token es del proyecto «{contexto.proyecto}», environment "
                    f"«{contexto.environment}», y esta herramienta sólo opera "
                    f"«{PROYECTO_PERMITIDO}» / «{ENVIRONMENT_PERMITIDO}». Producción se publica "
                    "con el PR de VERSION y la aprobación de Calvin en GitHub "
                    "(deploy/README.md §3)."
                )
            self._contexto = contexto
        return self._contexto

    # ── Lecturas ────────────────────────────────────────────────────────────

    def servicios(self) -> list[Servicio]:
        contexto = self.contexto()
        environment = self._consultar(CONSULTA_SERVICIOS, {"environment": contexto.environment_id})[
            "environment"
        ]
        disparadores: dict[str, list[dict[str, Any]]] = {}
        for arista in environment["deploymentTriggers"]["edges"]:
            disparadores.setdefault(arista["node"]["serviceId"], []).append(arista["node"])
        servicios = []
        for arista in environment["serviceInstances"]["edges"]:
            nodo = arista["node"]
            propios = disparadores.get(nodo["serviceId"], [])
            ultimo = nodo.get("latestDeployment") or {}
            servicios.append(
                Servicio(
                    id=nodo["serviceId"],
                    nombre=nodo["serviceName"],
                    ramas=tuple(str(d["branch"]) for d in propios),
                    espera_ci=all(d["checkSuites"] is True for d in propios) if propios else None,
                    cron=nodo.get("cronSchedule"),
                    despliegue_id=ultimo.get("id"),
                    despliegue_estado=ultimo.get("status"),
                    despliegue_fecha=ultimo.get("createdAt"),
                )
            )
        return sorted(servicios, key=lambda s: s.nombre.lower())

    def servicio(self, nombre: str) -> Servicio:
        """Por nombre exacto; sin distinguir mayúsculas sólo si no hay duda."""
        servicios = self.servicios()
        exactos = [s for s in servicios if s.nombre == nombre]
        parecidos = [s for s in servicios if s.nombre.lower() == nombre.lower()]
        if len(exactos) == 1:
            return exactos[0]
        if not exactos and len(parecidos) == 1:
            return parecidos[0]
        disponibles = ", ".join(s.nombre for s in servicios) or "ninguno"
        if exactos or parecidos:
            raise ErrorRailway(f"«{nombre}» es ambiguo en staging (hay: {disponibles})")
        raise ErrorRailway(f"no hay un servicio «{nombre}» en staging (hay: {disponibles})")

    def servicio_operable(self, nombre: str) -> Servicio:
        """El servicio, sólo si es de los que esta herramienta cambia o redespliega."""
        servicio = self.servicio(nombre)
        if servicio.nombre not in SERVICIOS_OPERABLES:
            raise ErrorRailway(
                f"«{servicio.nombre}» no se cambia ni se redespliega desde aquí "
                f"(sólo {' y '.join(SERVICIOS_OPERABLES)}): la base se opera en el panel"
            )
        return servicio

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
        return dict(despliegue)

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

    def valores_ocultos(self, servicio: Servicio) -> list[str]:
        """Valores que no deben verse aunque un log los traiga (los más largos primero)."""
        en_claro = self._variables_en_claro(servicio)
        ocultos = {
            valor
            for nombre, valor in en_claro.items()
            if nombre not in VARIABLES_NO_SECRETAS
            and isinstance(valor, str)
            and len(valor) >= 8
            and "${{" not in valor
        }
        return sorted(ocultos, key=len, reverse=True)

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
        if servicio.nombre not in SERVICIOS_OPERABLES:
            raise ErrorRailway(f"«{servicio.nombre}» no se cambia desde aquí")
        if nombre not in self._variables_en_claro(servicio):
            raise ErrorRailway(
                f"{servicio.nombre} no tiene la variable {nombre}: aquí sólo se corrige una "
                "que ya existe; las nuevas se crean en el panel"
            )
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
        if servicio.nombre not in SERVICIOS_OPERABLES:
            raise ErrorRailway(f"«{servicio.nombre}» no se redespliega desde aquí")
        if servicio.despliegue_id is None:
            raise ErrorRailway(f"«{servicio.nombre}» no tiene ningún despliegue que repetir")
        if servicio.despliegue_estado in ESTADOS_EN_CURSO:
            raise ErrorRailway(
                f"«{servicio.nombre}» ya tiene un despliegue en curso "
                f"({servicio.despliegue_estado}): usa `esperar {servicio.nombre}`"
            )
        if servicio.despliegue_estado not in ESTADOS_REPETIBLES:
            raise ErrorRailway(
                f"el último despliegue de «{servicio.nombre}» está en "
                f"{servicio.despliegue_estado} y no se repite desde aquí: míralo en el panel"
            )
        datos = self._consultar(MUTACION_REDESPLEGAR, {"id": servicio.despliegue_id})
        return dict(datos["deploymentRedeploy"])

    def esperar(
        self,
        nombre: str,
        *,
        distinto_de: str | None,
        plazo_s: float,
        dormir: Callable[[float], None] | None = None,
        reloj: Callable[[], float] | None = None,
        avisar: Callable[[str], None] = lambda _linea: None,
    ) -> Servicio:
        """Espera a que el último despliegue del servicio termine.

        Con `distinto_de`, espera primero a que aparezca un despliegue nuevo (el que provocó
        un cambio de variable): sin eso se daría por bueno el despliegue anterior. Un fallo
        transitorio de Railway a mitad de la espera no la aborta (hasta `FALLOS_TOLERADOS`
        seguidos).
        """
        if not (math.isfinite(plazo_s) and 0 < plazo_s <= PLAZO_MAXIMO_S):
            raise ErrorRailway(f"el plazo va de 1 a {PLAZO_MAXIMO_S:.0f} segundos")
        dormir = dormir or self._dormir
        reloj = reloj or self._reloj
        limite = reloj() + plazo_s
        visto: tuple[str | None, str | None] | None = None
        fallos = 0
        while True:
            try:
                servicio = self.servicio(nombre)
            except ErrorTransitorio:
                fallos += 1
                if fallos > FALLOS_TOLERADOS:
                    raise
            else:
                fallos = 0
                actual = (servicio.despliegue_id, servicio.despliegue_estado)
                if actual != visto:
                    avisar(f"{servicio.nombre}: {resumen_despliegue(servicio)}")
                    visto = actual
                es_nuevo = distinto_de is None or servicio.despliegue_id != distinto_de
                terminado = (
                    servicio.despliegue_id is not None
                    and servicio.despliegue_estado not in ESTADOS_EN_CURSO
                )
                if es_nuevo and terminado:
                    return servicio
            if reloj() >= limite:
                estado = visto[1] if visto else "desconocido"
                raise ErrorRailway(
                    f"«{nombre}» no terminó de desplegar en {plazo_s:.0f} s "
                    f"(último estado: {estado})"
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
    """Se niega (sin repetir el valor) si el cambio saca a staging de lo que dice la guía."""
    if nombre in VALOR_EN_RANGO:
        rango = VALOR_EN_RANGO[nombre]
        es_entero = valor.isdigit() and str(int(valor)) == valor
        if not es_entero or int(valor) not in rango:
            raise ErrorRailway(f"{nombre} admite un entero de {rango.start} a {rango.stop - 1}")
        return
    if nombre in VALOR_FIJO:
        if valor != VALOR_FIJO[nombre]:
            raise ErrorRailway(
                f"{nombre} sólo admite el valor que la guía fija para staging "
                "(deploy/railway/README.md, pasos C y D): para otro valor, cambia VALOR_FIJO "
                "de scripts/railway.py en un PR o hazlo en el panel"
            )
        return
    if nombre in SOLO_LECTURA:
        raise ErrorRailway(f"{nombre} se lee pero no se cambia desde aquí: hazlo en el panel")
    raise ErrorRailway(
        f"{nombre} no está entre las variables que se cambian desde aquí: un secreto va en el "
        "panel de Railway; si no es secreto, añádelo a scripts/railway.py en un PR"
    )


# ── Presentación ────────────────────────────────────────────────────────────

_ESPACIOS_RAROS = dict.fromkeys(map(ord, "\t\n\r\x0b\x0c\x85  "), " ")


def limpio(texto: str, tope: int = TOPE_LINEA) -> str:
    """Una sola línea imprimible: sin controles ni marcas de formato Unicode, y acotada.

    Lo que llega de Railway (logs, mensajes de commit, nombres) es texto de terceros: no puede
    traer secuencias de terminal, saltos que imiten otra línea ni un megabyte de relleno.
    """
    recortado = texto[: tope * 4].translate(_ESPACIOS_RAROS)
    visible = "".join(c for c in recortado if unicodedata.category(c)[0] != "C")
    return visible if len(visible) <= tope else visible[:tope] + "…"


def censurar(texto: str, ocultos: Sequence[str]) -> str:
    for valor in ocultos:
        texto = texto.replace(valor, "«oculto»")
    return texto


# El código de una mesa es su credencial (va en la ruta `/m/<codigo>` de la PWA): ni el log
# HTTP de Railway ni un log viejo de la API deben traerlo a la sesión.
CODIGO_TACHADO = "<codigo>"
_RUTA_COMENSAL = re.compile(r"/+m/[^\s\"'?#]+", re.IGNORECASE)
_FORMA_DE_CODIGO = re.compile(r"[A-Za-z0-9_-]{22}")  # `secrets.token_urlsafe(16)`


def tachar_rutas_comensal(texto: str) -> str:
    """Toda ruta `/m/…` de un texto (mayúsculas, barras de más, prefijos) sin su código."""
    return _RUTA_COMENSAL.sub(f"/m/{CODIGO_TACHADO}", texto)


def ruta_sin_codigo(ruta: object) -> str:
    """La ruta de una petición sin el código de mesa: `/m/…` entero y, además, cualquier
    segmento con la forma exacta de un código (alguien lo pegó en otra ruta). Un UUID o el
    nombre de un archivo no tienen esa forma y se quedan."""
    camino, separador, consulta = tachar_rutas_comensal(str(ruta)).partition("?")
    segmentos = [
        CODIGO_TACHADO if _FORMA_DE_CODIGO.fullmatch(segmento) else segmento
        for segmento in camino.split("/")
    ]
    return "/".join(segmentos) + separador + consulta


def _hora(marca: object) -> str:
    return str(marca or "-")[:19]


def _fecha(marca: object) -> str:
    return str(marca or "")[:16].replace("T", " ") or "—"


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
    `logger mensaje clave=valor…`, sin los campos que repiten la hora y el nivel. Si una clave
    viene dos veces, la primera encabeza y las demás se ven como `clave=valor`.
    """
    texto = str(linea.get("message") or "")
    if not texto.strip():
        cabeza: dict[str, str] = {}
        resto: list[str] = []
        for atributo in linea.get("attributes") or []:
            clave, valor = str(atributo["key"]), _valor_json(atributo["value"])
            if clave in ("logger", "mensaje") and clave not in cabeza:
                cabeza[clave] = str(valor)
            elif clave not in ("level", "ts", "nivel") and valor is not None:
                resto.append(f"{clave}={valor}")
        texto = " ".join([*(cabeza[c] for c in ("logger", "mensaje") if c in cabeza), *resto])
    return limpio(
        f"{_hora(linea.get('timestamp'))} {linea.get('severity') or '-'} {texto}"
    ).rstrip()


def _valor_json(crudo: object) -> Any:
    try:
        return json.loads(str(crudo))
    except (ValueError, RecursionError):
        return crudo


def avisos(servicios: Sequence[Servicio], sin_sellar: dict[str, list[str]]) -> list[str]:
    """Lo que no está como dice `deploy/railway/README.md`."""
    if not servicios:
        return ["staging no tiene ningún servicio: ¿el token es de otro proyecto?"]
    lista = []
    presentes = {servicio.nombre for servicio in servicios}
    for esperado in SERVICIOS_OPERABLES:
        if esperado not in presentes:
            lista.append(f"falta el servicio «{esperado}» en staging")
    for servicio in servicios:
        estado = servicio.despliegue_estado
        if estado in ESTADOS_DE_FALLO:
            lista.append(
                f"{servicio.nombre}: el último despliegue terminó en {estado}; "
                f"mira `logs {servicio.nombre}`"
            )
        elif servicio.nombre == "api" and estado != "SUCCESS" and estado not in ESTADOS_EN_CURSO:
            lista.append(f"api: no tiene un despliegue activo (estado: {estado or 'ninguno'})")
        if servicio.nombre in SERVICIOS_OPERABLES and not servicio.ramas:
            lista.append(
                f"{servicio.nombre}: no sigue ninguna rama (sin fuente conectada): un merge a "
                f"{RAMA_DE_STAGING} no llega a staging"
            )
        for rama in servicio.ramas:
            if rama != RAMA_DE_STAGING:
                lista.append(
                    f"{servicio.nombre}: sigue la rama «{rama}», no «{RAMA_DE_STAGING}» "
                    "(Settings → Source → Branch): un merge a master no llega a staging"
                )
        if servicio.espera_ci is False:
            lista.append(f"{servicio.nombre}: Wait for CI está apagado")
        for nombre in sin_sellar.get(servicio.nombre, []):
            lista.append(f"{servicio.nombre}: {nombre} está sin sellar (Variables → ⋮ → Seal)")
    return lista


def _tabla(filas: Sequence[Sequence[str]]) -> list[str]:
    celdas = [list(fila) for fila in filas]
    anchos = [max(len(fila[i]) for fila in celdas) for i in range(len(celdas[0]))]
    return [
        "  ".join(c.ljust(a) for c, a in zip(fila, anchos, strict=True)).rstrip() for fila in celdas
    ]


def orden_estado(railway: Railway, args: argparse.Namespace, salida: Callable[[str], None]) -> int:
    contexto = railway.contexto()
    servicios = railway.servicios()
    salida(f"Railway · proyecto {contexto.proyecto} · environment {contexto.environment}")
    filas = [("servicio", "rama", "espera CI", "último despliegue", "cron")]
    for s in servicios:
        ci = "—" if s.espera_ci is None else ("sí" if s.espera_ci else "no")
        filas.append(
            (s.nombre, ", ".join(s.ramas) or "—", ci, resumen_despliegue(s), s.cron or "—")
        )
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
        crudo = d.get("meta")
        meta: dict[str, Any] = crudo if isinstance(crudo, dict) else {}
        mensaje = str(meta.get("commitMessage") or meta.get("skippedReason") or "").splitlines()
        filas.append(
            (
                str(d["id"]),
                str(d["status"]),
                _fecha(d.get("createdAt")),
                str(meta.get("branch") or "—"),
                str(meta.get("commitHash") or "—")[:7],
                limpio(mensaje[0] if mensaje else "")[:70],
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
    ocultos = railway.valores_ocultos(servicio)
    salida(f"# {servicio.nombre} · despliegue {despliegue_id} · {args.tipo} · {len(lineas)} líneas")
    for linea in lineas:
        if args.tipo == "http":
            texto = (
                f"{_hora(linea.get('timestamp'))} {linea.get('httpStatus')} "
                f"{linea.get('method')} {ruta_sin_codigo(linea.get('path'))} "
                f"{linea.get('totalDuration')} ms "
                f"{linea.get('requestId')}"
            )
        else:
            texto = tachar_rutas_comensal(linea_de_log(linea))
        salida(censurar(texto, ocultos))
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
    if args.sin_desplegar and args.esperar:
        raise ErrorRailway("--sin-desplegar y --esperar no van juntos: no habría qué esperar")
    comprobar_escritura(args.nombre, args.valor)  # antes de la red: lo rechazado no sale de aquí
    servicio = railway.servicio_operable(args.servicio)
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
    servicio = railway.servicio_operable(args.servicio)
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
        r"^(CERTIFICATE_STATUS_TYPE|DETECTED_CDN_PROVIDER|DNS_RECORD_(TYPE|STATUS))_",
        "",
        str(valor),
    )


def _plazo(texto: str) -> float:
    try:
        plazo = float(texto)
    except ValueError:
        plazo = math.nan
    if not (math.isfinite(plazo) and 1 <= plazo <= PLAZO_MAXIMO_S):
        raise argparse.ArgumentTypeError(f"el plazo va de 1 a {PLAZO_MAXIMO_S:.0f} segundos")
    return plazo


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
    logs.add_argument("--filtro", help="filtro de Railway, p. ej. @level:error")
    logs.set_defaults(funcion=orden_logs)

    variables = ordenes.add_parser("variables", help="variables de un servicio, secretos ocultos")
    variables.add_argument("servicio")
    variables.set_defaults(funcion=orden_variables)

    variable = ordenes.add_parser("variable", help="deja una variable como dice la guía de staging")
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
        orden.add_argument("--plazo", type=_plazo, default=600.0, help="segundos de espera (600)")

    dominios = ordenes.add_parser("dominios", help="dominios de un servicio y su estado")
    dominios.add_argument("servicio")
    dominios.set_defaults(funcion=orden_dominios)
    return parser


def main(
    argv: Sequence[str] | None = None,
    *,
    cliente: httpx.Client | None = None,
    salida: Callable[[str], None] = print,
    dormir: Callable[[float], None] = time.sleep,
    reloj: Callable[[], float] = time.monotonic,
) -> int:
    args = crear_parser().parse_args(argv)  # un uso incorrecto sale con 2 (SystemExit de argparse)
    propio: httpx.Client | None = None

    def emitir(linea: str) -> None:
        salida(limpio(linea))

    try:
        if cliente is None:
            cliente = propio = crear_cliente()
        return int(args.funcion(Railway(cliente, dormir=dormir, reloj=reloj), args, emitir))
    except ErrorRailway as error:
        print(f"railway: {limpio(str(error))}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("railway: interrumpido", file=sys.stderr)
        return 130
    except Exception as error:  # noqa: BLE001
        # Railway cambió la forma de una respuesta (o el entorno está roto): una línea con el
        # tipo del fallo, nunca una traza con datos dentro.
        print(
            f"railway: respuesta inesperada de Railway ({type(error).__name__}); revisa el "
            "esquema por introspección (skill /railway)",
            file=sys.stderr,
        )
        return 2
    finally:
        if propio is not None:
            propio.close()


if __name__ == "__main__":
    raise SystemExit(main())
