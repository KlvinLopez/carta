"""T-0.9: `scripts/railway.py` opera sólo staging y nunca enseña ni escribe un secreto.

Railway de mentira = `httpx.MockTransport`: cada prueba ve qué consultas salieron y con qué
variables. Los valores «secretos» de aquí son inventados; lo que se comprueba es que no
aparezcan en ninguna salida.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

import httpx
import pytest

from scripts import railway

PROYECTO = "p-1"
STAGING = "e-staging"
API = "s-api"
RESPALDO = "s-respaldo"
POSTGRES = "s-postgres"
SECRETO_SIN_SELLAR = "sk-ant-valor-que-no-debe-verse"
URL_BASE_CON_CLAVE = "postgresql://railway:clave-de-la-base@postgres.railway.internal/railway"

VARIABLES_API: dict[str, str | None] = {
    "ANTHROPIC_API_KEY": SECRETO_SIN_SELLAR,
    "SECRET_KEY": None,
    "R2_SECRET_ACCESS_KEY": None,
    "R2_ACCESS_KEY_ID": "id-de-acceso-r2-que-no-debe-verse",
    "R2_ENDPOINT": "https://cuenta-que-no-debe-verse.r2.cloudflarestorage.com",
    "VITE_FIREBASE_API_KEY": "AIza-llave-web-que-no-debe-verse",
    "DATABASE_URL": "${{Postgres.DATABASE_URL}}",
    "PGPASSWORD": "clave-de-la-base",
    "VARIABLE_DESCONOCIDA": "quien-sabe-que-es",
    "DOMINIO": "staging.carta.cooking",
    "ENTORNO": "staging",
    "WORKERS": "2",
}
OCULTOS = (
    SECRETO_SIN_SELLAR,
    "id-de-acceso-r2-que-no-debe-verse",
    "cuenta-que-no-debe-verse",
    "AIza-llave-web-que-no-debe-verse",
    "clave-de-la-base",
    "quien-sabe-que-es",
    "Postgres.DATABASE_URL",
)


def _instancia(servicio: str, nombre: str, estado: str, despliegue: str, cron: str | None = None):
    return {
        "node": {
            "serviceId": servicio,
            "serviceName": nombre,
            "cronSchedule": cron,
            "latestDeployment": {
                "id": despliegue,
                "status": estado,
                "createdAt": "2026-11-11T08:07:35.290Z",
            },
        }
    }


def _disparador(servicio: str, rama: str, espera_ci: bool = True) -> dict[str, Any]:
    return {"node": {"serviceId": servicio, "branch": rama, "checkSuites": espera_ci}}


class RailwayFalso:
    """Responde como la API de Railway y guarda cada petición."""

    def __init__(self, environment: str = "staging") -> None:
        self.environment = environment
        self.peticiones: list[dict[str, Any]] = []
        self.cabeceras: list[httpx.Headers] = []
        self.instancias = [
            _instancia(API, "api", "SUCCESS", "d-api-1"),
            _instancia(RESPALDO, "respaldo", "SUCCESS", "d-resp-1", cron="0 4 * * *"),
            _instancia(POSTGRES, "Postgres", "SUCCESS", "d-pg-1"),
        ]
        self.disparadores = [_disparador(API, "master"), _disparador(RESPALDO, "master")]
        self.variables: dict[str, dict[str, str | None]] = {
            API: dict(VARIABLES_API),
            RESPALDO: {"R2_SECRET_ACCESS_KEY": None, "RESPALDO_DIAS": "30"},
            POSTGRES: {"PGPASSWORD": "clave-de-la-base"},
        }
        self.despliegue_environment = STAGING
        self.respuesta_forzada: httpx.Response | None = None
        self.al_listar_servicios: Callable[[], None] | None = None
        self.confirma_variables = True

    def cliente(self) -> httpx.Client:
        return httpx.Client(transport=httpx.MockTransport(self._manejar))

    def consultas(self) -> list[str]:
        return [" ".join(p["query"].split()) for p in self.peticiones]

    def campos(self) -> list[str]:
        """El campo raíz de cada consulta, en orden (`projectToken`, `variables`…)."""
        raices = []
        for consulta in self.consultas():
            cuerpo = consulta.split("{", 1)[1].strip()
            raices.append(cuerpo.split("(", 1)[0].split("{", 1)[0].split()[0])
        return raices

    def _manejar(self, peticion: httpx.Request) -> httpx.Response:
        assert str(peticion.url) == "https://backboard.railway.com/graphql/v2"
        assert peticion.method == "POST"
        cuerpo = json.loads(peticion.content)
        self.peticiones.append(cuerpo)
        self.cabeceras.append(peticion.headers)
        if self.respuesta_forzada is not None:
            return self.respuesta_forzada
        return httpx.Response(200, json={"data": self._datos(cuerpo)})

    def _datos(self, cuerpo: dict[str, Any]) -> dict[str, Any]:
        consulta, variables = cuerpo["query"], cuerpo["variables"]
        if "projectToken" in consulta:
            return {
                "projectToken": {
                    "projectId": PROYECTO,
                    "environmentId": STAGING,
                    "project": {"name": "carta"},
                    "environment": {"name": self.environment},
                }
            }
        if "serviceInstances" in consulta:
            assert variables == {"environment": STAGING}
            if self.al_listar_servicios is not None:
                self.al_listar_servicios()
            return {
                "environment": {
                    "serviceInstances": {"edges": self.instancias},
                    "deploymentTriggers": {"edges": self.disparadores},
                }
            }
        if "variableUpsert" in consulta:
            entrada = variables["entrada"]
            if not self.confirma_variables:
                return {"variableUpsert": False}
            self.variables[entrada["serviceId"]][entrada["name"]] = entrada["value"]
            return {"variableUpsert": True}
        if "variables(" in consulta:
            assert "unrendered: true" in consulta, "sin `unrendered` la base llega con su clave"
            assert variables["proyecto"] == PROYECTO and variables["environment"] == STAGING
            return {"variables": self.variables[variables["servicio"]]}
        if "deploymentRedeploy" in consulta:
            return {"deploymentRedeploy": {"id": "d-nuevo", "status": "INITIALIZING"}}
        if "deployments(" in consulta:
            return {
                "deployments": {
                    "edges": [
                        {
                            "node": {
                                "id": "d-api-1",
                                "status": "SUCCESS",
                                "createdAt": "2026-11-11T08:07:35.290Z",
                                "meta": {
                                    "branch": "master",
                                    "commitHash": "a2089c11ee27b8f552fdf27e44f50c1c143ca905",
                                    "commitMessage": "Merge pull request #10\n\ncuerpo",
                                },
                            }
                        }
                    ]
                }
            }
        if "deployment(" in consulta:
            return {
                "deployment": {
                    "id": variables["id"],
                    "status": "SUCCESS",
                    "environmentId": self.despliegue_environment,
                    "serviceId": API,
                }
            }
        if "deploymentLogs" in consulta or "buildLogs" in consulta:
            campo = "deploymentLogs" if "deploymentLogs" in consulta else "buildLogs"
            assert "attributes { key value }" in " ".join(consulta.split())
            linea = {
                "timestamp": "2026-11-11T04:01:31.000Z",
                "severity": "error",
                "message": campo,
                "attributes": [],
            }
            return {campo: [linea]}
        if "httpLogs" in consulta:
            return {
                "httpLogs": [
                    {
                        "timestamp": "2026-11-11T04:01:31.000Z",
                        "method": "GET",
                        "path": "/health",
                        "httpStatus": 200,
                        "totalDuration": 3,
                        "requestId": "req-1",
                    }
                ]
            }
        if "domains(" in consulta:
            return {
                "domains": {
                    "serviceDomains": [],
                    "customDomains": [
                        {
                            "domain": "staging.carta.cooking",
                            "targetPort": 8000,
                            "status": {
                                "verified": True,
                                "certificateStatus": "CERTIFICATE_STATUS_TYPE_VALID",
                                "cdnProvider": "DETECTED_CDN_PROVIDER_CLOUDFLARE",
                                "dnsRecords": [
                                    {
                                        "fqdn": "staging.carta.cooking",
                                        "recordType": "DNS_RECORD_TYPE_CNAME",
                                        "requiredValue": "abc.up.railway.app",
                                        "currentValue": "",
                                        "status": "DNS_RECORD_STATUS_REQUIRES_UPDATE",
                                    }
                                ],
                            },
                        }
                    ],
                }
            }
        raise AssertionError(f"consulta inesperada: {consulta}")


def correr(falso: RailwayFalso, *argv: str) -> tuple[int, str]:
    lineas: list[str] = []
    with falso.cliente() as cliente:
        codigo = railway.main(list(argv), cliente=cliente, salida=lineas.append)
    return codigo, "\n".join(lineas)


# ── Sólo staging ─────────────────────────────────────────────────────────────

ORDENES = [
    ("estado",),
    ("despliegues", "api"),
    ("logs", "api"),
    ("variables", "api"),
    ("variable", "api", "WORKERS", "3"),
    ("redesplegar", "api"),
    ("esperar", "api"),
    ("dominios", "api"),
]


@pytest.mark.parametrize("orden", ORDENES, ids=lambda orden: orden[0])
@pytest.mark.parametrize("environment", ["produccion", "production", "Staging", "staging-2", ""])
def test_un_token_que_no_es_de_staging_no_pasa_de_la_primera_consulta(
    orden: tuple[str, ...], environment: str, capsys: pytest.CaptureFixture[str]
) -> None:
    falso = RailwayFalso(environment=environment)
    codigo, salida = correr(falso, *orden)
    assert codigo == 2
    assert salida == ""
    assert falso.campos() == ["projectToken"], "ni lecturas ni escrituras con otro environment"
    error = capsys.readouterr().err
    assert "sólo opera «staging»" in error and "VERSION" in error


def test_las_ordenes_cubren_todo_el_parser() -> None:
    """Si alguien añade una orden, la prueba de arriba tiene que conocerla."""
    acciones = railway.crear_parser()._subparsers._group_actions[0]  # type: ignore[union-attr]
    assert set(acciones.choices) == {orden[0] for orden in ORDENES}  # type: ignore[arg-type]


def test_toda_orden_pregunta_primero_de_que_environment_es_el_token() -> None:
    for orden in ORDENES:
        falso = RailwayFalso()
        codigo, _ = correr(falso, *orden)
        assert codigo == 0, orden
        assert falso.campos()[0] == "projectToken", orden


# ── El token ─────────────────────────────────────────────────────────────────


def test_sin_variable_de_entorno_no_se_manda_ninguna_cabecera_de_token() -> None:
    """En la nube la pone el proxy de la sesión: mandar una propia la pisaría o la filtraría."""
    with railway.crear_cliente({}) as cliente:
        assert "project-access-token" not in cliente.headers
        assert "authorization" not in cliente.headers


def test_con_la_variable_el_token_viaja_en_project_access_token_y_no_se_imprime(
    capsys: pytest.CaptureFixture[str],
) -> None:
    with railway.crear_cliente({"RAILWAY_TOKEN_STAGING": " token-de-prueba \n"}) as cliente:
        assert cliente.headers["Project-Access-Token"] == "token-de-prueba"
        assert "authorization" not in cliente.headers
    # `RAILWAY_TOKEN` a secas es el de producción (secreto del Environment de GitHub): no se lee.
    with railway.crear_cliente({"RAILWAY_TOKEN": "token-de-produccion"}) as cliente:
        assert "project-access-token" not in cliente.headers
    salida = capsys.readouterr()
    assert "token-de-prueba" not in salida.out + salida.err


@pytest.mark.parametrize(
    "respuesta",
    [
        httpx.Response(401, json={"errors": [{"message": "Unauthorized"}]}),
        httpx.Response(403, text="forbidden"),
        httpx.Response(200, json={"errors": [{"message": "Not Authorized"}]}),
    ],
    ids=["401", "403", "errors-not-authorized"],
)
def test_sin_acceso_explica_donde_va_el_token(
    respuesta: httpx.Response, capsys: pytest.CaptureFixture[str]
) -> None:
    falso = RailwayFalso()
    falso.respuesta_forzada = respuesta
    codigo, salida = correr(falso, "estado")
    assert (codigo, salida) == (2, "")
    error = capsys.readouterr().err
    assert "backboard.railway.com" in error and "RAILWAY_TOKEN_STAGING" in error
    assert "Project-Access-Token" in error


@pytest.mark.parametrize(
    ("respuesta", "esperado"),
    [
        (
            httpx.Response(200, json={"errors": [{"message": "Cannot query field x"}]}),
            "Cannot query",
        ),
        (httpx.Response(502, text="<html>bad gateway</html>"), "502"),
        (httpx.Response(200, json={"data": None}), "sin datos"),
        (httpx.Response(500, json={"data": {"projectToken": {}}}), "500"),
    ],
    ids=["graphql", "html", "data-null", "500-con-data"],
)
def test_un_error_de_railway_sale_en_una_linea_y_con_codigo_2(
    respuesta: httpx.Response, esperado: str, capsys: pytest.CaptureFixture[str]
) -> None:
    falso = RailwayFalso()
    falso.respuesta_forzada = respuesta
    codigo, _ = correr(falso, "estado")
    assert codigo == 2
    error = capsys.readouterr().err
    assert error.startswith("railway: ") and esperado in error
    assert error.count("\n") == 1 and "Traceback" not in error


@pytest.mark.parametrize(
    "datos",
    [
        {"projectToken": None},
        {"projectToken": {"projectId": PROYECTO}},
        {"otraCosa": 1},
        {"projectToken": {"projectId": PROYECTO, "environmentId": STAGING, "project": []}},
    ],
)
def test_una_respuesta_con_otra_forma_no_acaba_en_traza(
    datos: dict[str, Any], capsys: pytest.CaptureFixture[str]
) -> None:
    falso = RailwayFalso()
    falso.respuesta_forzada = httpx.Response(200, json={"data": datos})
    codigo, salida = correr(falso, "variables", "api")
    assert (codigo, salida) == (2, "")
    error = capsys.readouterr().err
    assert error.startswith("railway: respuesta inesperada de Railway")
    assert error.count("\n") == 1 and "Traceback" not in error


def test_una_caida_de_red_no_ensena_la_url_ni_una_traza(
    capsys: pytest.CaptureFixture[str],
) -> None:
    def sin_red(peticion: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("no route to host", request=peticion)

    with httpx.Client(transport=httpx.MockTransport(sin_red)) as cliente:
        codigo = railway.main(["estado"], cliente=cliente, salida=lambda _linea: None)
    assert codigo == 2
    assert capsys.readouterr().err == "railway: no se pudo hablar con Railway (ConnectError)\n"


# ── Variables: leer ──────────────────────────────────────────────────────────


def test_variables_muestra_solo_las_no_secretas() -> None:
    falso = RailwayFalso()
    codigo, salida = correr(falso, "variables", "api")
    assert codigo == 0
    lineas = {linea.split()[0]: linea for linea in salida.splitlines()[1:]}
    assert set(lineas) == set(VARIABLES_API)
    assert lineas["DOMINIO"].split() == ["DOMINIO", "staging.carta.cooking"]
    assert lineas["WORKERS"].split() == ["WORKERS", "2"]
    assert lineas["SECRET_KEY"].split() == ["SECRET_KEY", "«sellada»"]
    for nombre in ("R2_ACCESS_KEY_ID", "R2_ENDPOINT", "VITE_FIREBASE_API_KEY", "DATABASE_URL"):
        assert lineas[nombre].split() == [nombre, "«oculta»"], nombre
    assert lineas["PGPASSWORD"].split() == ["PGPASSWORD", "«oculta»"]
    assert lineas["VARIABLE_DESCONOCIDA"].split() == ["VARIABLE_DESCONOCIDA", "«oculta»"]
    assert "SIN SELLAR" in lineas["ANTHROPIC_API_KEY"]
    for oculto in OCULTOS:
        assert oculto not in salida, oculto


def test_ningun_nombre_con_pinta_de_secreto_esta_en_la_lista_visible() -> None:
    """La lista es explícita: se compara con literales, no con una regla que pueda aflojarse."""
    assert railway.VARIABLES_NO_SECRETAS == {
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
    assert railway.SOLO_LECTURA == {"ENTORNO", "PORT"}
    assert railway.DEBEN_ESTAR_SELLADAS == {
        "SECRET_KEY",
        "R2_SECRET_ACCESS_KEY",
        "CLOUDFLARE_API_TOKEN",
        "ANTHROPIC_API_KEY",
    }
    assert not railway.DEBEN_ESTAR_SELLADAS & railway.VARIABLES_NO_SECRETAS


# ── Variables: escribir ──────────────────────────────────────────────────────


def test_variable_cambia_una_no_secreta_y_deja_que_railway_redespliegue() -> None:
    falso = RailwayFalso()
    codigo, salida = correr(falso, "variable", "API", "WORKERS", "3")
    assert codigo == 0 and "redespliega" in salida
    assert falso.campos() == ["projectToken", "environment", "variableUpsert"]
    assert falso.peticiones[-1]["variables"] == {
        "entrada": {
            "projectId": PROYECTO,
            "environmentId": STAGING,
            "serviceId": API,
            "name": "WORKERS",
            "value": "3",
            "skipDeploys": False,
        }
    }


def test_variable_sin_desplegar_pide_skip_deploys() -> None:
    falso = RailwayFalso()
    codigo, salida = correr(falso, "variable", "respaldo", "RESPALDO_DIAS", "45", "--sin-desplegar")
    assert codigo == 0 and "próximo despliegue" in salida
    entrada = falso.peticiones[-1]["variables"]["entrada"]
    assert entrada["serviceId"] == RESPALDO and entrada["skipDeploys"] is True
    assert falso.variables[RESPALDO]["RESPALDO_DIAS"] == "45"


@pytest.mark.parametrize(
    ("nombre", "valor", "motivo"),
    [
        ("SECRET_KEY", "x" * 44, "no está en la lista"),
        ("ANTHROPIC_API_KEY", "sk-ant-otra", "no está en la lista"),
        ("R2_SECRET_ACCESS_KEY", "abc", "no está en la lista"),
        ("R2_ACCESS_KEY_ID", "abc", "no está en la lista"),
        ("DATABASE_URL", "postgresql://u:p@h/b", "no está en la lista"),
        ("VITE_FIREBASE_API_KEY", "AIza", "no está en la lista"),
        ("VARIABLE_NUEVA", "1", "no está en la lista"),
        ("workers", "3", "no está en la lista"),
        ("ENTORNO", "desarrollo", "sólo lectura"),
        ("PORT", "9000", "sólo lectura"),
        ("WORKERS", "", "vacía"),
        ("WORKERS", "   ", "vacía"),
        ("WORKERS", "2\nSECRET_KEY=x", "saltos de línea"),
        ("WORKERS", "x" * 2001, "demasiado largo"),
        ("DOMINIO", "${{SECRET_KEY}}", "referencia"),
        ("DOMINIO", "a${{Postgres.DATABASE_URL}}b", "referencia"),
    ],
)
def test_variable_se_niega_antes_de_mandar_nada(
    nombre: str, valor: str, motivo: str, capsys: pytest.CaptureFixture[str]
) -> None:
    falso = RailwayFalso()
    codigo, salida = correr(falso, "variable", "api", nombre, valor)
    assert (codigo, salida) == (2, "")
    assert "variableUpsert" not in falso.campos()
    assert falso.variables[API] == VARIABLES_API
    error = capsys.readouterr().err
    assert motivo in error
    if valor.strip():
        assert valor not in error, "el valor rechazado tampoco se repite en el error"


# ── Estado y avisos ──────────────────────────────────────────────────────────


def test_estado_sano_no_tiene_avisos_y_no_ensena_ningun_valor() -> None:
    falso = RailwayFalso()
    falso.variables[API]["ANTHROPIC_API_KEY"] = None
    for estricto in ((), ("--estricto",)):
        codigo, salida = correr(falso, "estado", *estricto)
        assert codigo == 0
        assert "proyecto carta · environment staging" in salida
        assert "Sin avisos." in salida and "Avisos:" not in salida
        for oculto in (*OCULTOS, "staging.carta.cooking"):
            assert oculto not in salida


def test_estado_avisa_de_lo_que_no_esta_como_dice_la_guia() -> None:
    falso = RailwayFalso()
    falso.instancias[1] = _instancia(RESPALDO, "respaldo", "CRASHED", "d-resp-2", cron="0 4 * * *")
    falso.disparadores = [
        _disparador(API, "claude/otra-rama"),
        _disparador(RESPALDO, "master", espera_ci=False),
    ]
    codigo, salida = correr(falso, "estado")
    assert codigo == 0, "sin --estricto los avisos no cambian el código de salida"
    avisos = [linea.strip() for linea in salida.split("Avisos:")[1].splitlines() if linea.strip()]
    assert len(avisos) == 4
    assert any(a.startswith("- api: sigue la rama «claude/otra-rama», no «master»") for a in avisos)
    assert "- api: ANTHROPIC_API_KEY está sin sellar (Variables → ⋮ → Seal)" in avisos
    assert any(a.startswith("- respaldo: el último despliegue terminó en CRASHED") for a in avisos)
    assert "- respaldo: Wait for CI está apagado" in avisos
    assert SECRETO_SIN_SELLAR not in salida

    codigo, _ = correr(falso, "estado", "--estricto")
    assert codigo == 1


def test_un_servicio_sin_disparador_no_avisa_de_rama() -> None:
    """`Postgres` sale de una imagen: no sigue ninguna rama y eso no es un aviso."""
    servicio = railway.Servicio(POSTGRES, "Postgres", None, None, None, "d", "SUCCESS", None)
    assert railway.avisos([servicio], {}) == []
    fallido = railway.Servicio(API, "api", "master", True, None, "d", "FAILED", None)
    assert len(railway.avisos([fallido], {})) == 1


# ── Despliegues, logs, redesplegar, dominios ─────────────────────────────────


def test_despliegues_lista_con_rama_commit_y_primera_linea_del_mensaje() -> None:
    falso = RailwayFalso()
    codigo, salida = correr(falso, "despliegues", "api", "-n", "3")
    assert codigo == 0
    assert falso.peticiones[-1]["variables"] == {
        "n": 3,
        "entrada": {"projectId": PROYECTO, "environmentId": STAGING, "serviceId": API},
    }
    fila = salida.splitlines()[1]
    assert fila.split()[:5] == ["d-api-1", "SUCCESS", "2026-11-11", "08:07", "master"]
    assert "a2089c1 " in fila and "Merge pull request #10" in fila and "cuerpo" not in salida


@pytest.mark.parametrize(
    ("tipo", "campo"),
    [("ejecucion", "deploymentLogs"), ("construccion", "buildLogs"), ("http", "httpLogs")],
)
def test_logs_del_ultimo_despliegue_por_defecto(tipo: str, campo: str) -> None:
    falso = RailwayFalso()
    codigo, salida = correr(falso, "logs", "api", "--tipo", tipo, "-n", "20", "--filtro", "error")
    assert codigo == 0
    assert falso.campos() == ["projectToken", "environment", "deployment", campo]
    assert falso.peticiones[-1]["variables"] == {
        "despliegue": "d-api-1",
        "n": 20,
        "filtro": "error",
    }
    assert "despliegue d-api-1" in salida.splitlines()[0]
    esperado = "200 GET /health 3 ms req-1" if tipo == "http" else f"error {campo}"
    assert salida.splitlines()[1] == f"2026-11-11T04:01:31 {esperado}"


def test_logs_de_un_despliegue_que_no_es_de_staging_se_rechazan(
    capsys: pytest.CaptureFixture[str],
) -> None:
    falso = RailwayFalso()
    falso.despliegue_environment = "e-produccion"
    codigo, salida = correr(falso, "logs", "api", "--despliegue", "d-ajeno")
    assert (codigo, salida) == (2, "")
    assert falso.campos()[-1] == "deployment", "no llegó a pedir los logs"
    assert "d-ajeno no es de staging" in capsys.readouterr().err


def test_redesplegar_repite_el_ultimo_despliegue_del_servicio() -> None:
    falso = RailwayFalso()
    codigo, salida = correr(falso, "redesplegar", "respaldo")
    assert codigo == 0 and "d-nuevo" in salida
    assert falso.campos() == ["projectToken", "environment", "deploymentRedeploy"]
    assert falso.peticiones[-1]["variables"] == {"id": "d-resp-1"}


def test_redesplegar_un_servicio_sin_despliegues_no_manda_la_mutacion(
    capsys: pytest.CaptureFixture[str],
) -> None:
    falso = RailwayFalso()
    falso.instancias[0]["node"]["latestDeployment"] = None
    codigo, _ = correr(falso, "redesplegar", "api")
    assert codigo == 2 and "deploymentRedeploy" not in falso.campos()
    assert "no tiene ningún despliegue" in capsys.readouterr().err


def test_un_servicio_que_no_existe_dice_cuales_hay(capsys: pytest.CaptureFixture[str]) -> None:
    falso = RailwayFalso()
    codigo, _ = correr(falso, "dominios", "web")
    assert codigo == 2
    assert "(hay: api, Postgres, respaldo)" in capsys.readouterr().err


def test_dominios_dice_verificacion_certificado_y_registros() -> None:
    falso = RailwayFalso()
    codigo, salida = correr(falso, "dominios", "api")
    assert codigo == 0
    assert salida.splitlines() == [
        "staging.carta.cooking → puerto 8000 · verificado: sí · certificado: VALID · "
        "CDN: CLOUDFLARE",
        "  CNAME staging.carta.cooking → abc.up.railway.app · visto: — · REQUIRES_UPDATE",
    ]


# ── Esperar ──────────────────────────────────────────────────────────────────


class Reloj:
    def __init__(self) -> None:
        self.ahora = 0.0
        self.pausas: list[float] = []

    def dormir(self, segundos: float) -> None:
        self.pausas.append(segundos)
        self.ahora += segundos


def _esperar(falso: RailwayFalso, reloj: Reloj, distinto_de: str | None, plazo: float = 600.0):
    with falso.cliente() as cliente:
        return railway.Railway(cliente).esperar(
            "api",
            distinto_de=distinto_de,
            plazo_s=plazo,
            dormir=reloj.dormir,
            reloj=lambda: reloj.ahora,
        )


def test_esperar_no_da_por_bueno_el_despliegue_anterior() -> None:
    """Tras cambiar una variable el despliegue nuevo tarda en aparecer: el viejo, en SUCCESS,
    no cuenta."""
    falso, reloj = RailwayFalso(), Reloj()
    etapas = iter(
        [
            ("d-api-1", "SUCCESS"),
            ("d-api-1", "SUCCESS"),
            ("d-api-2", "BUILDING"),
            ("d-api-2", "DEPLOYING"),
            ("d-api-2", "SUCCESS"),
        ]
    )

    def avanzar() -> None:
        despliegue, estado = next(etapas)
        falso.instancias[0] = _instancia(API, "api", estado, despliegue)

    falso.al_listar_servicios = avanzar
    servicio = _esperar(falso, reloj, distinto_de="d-api-1")
    assert (servicio.despliegue_id, servicio.despliegue_estado) == ("d-api-2", "SUCCESS")
    assert reloj.pausas == [10.0] * 4


@pytest.mark.parametrize(("estado", "codigo"), [("SUCCESS", 0), ("FAILED", 1), ("CRASHED", 1)])
def test_la_orden_esperar_sale_con_1_si_el_despliegue_no_termino_bien(
    estado: str, codigo: int
) -> None:
    falso = RailwayFalso()
    falso.instancias[0] = _instancia(API, "api", estado, "d-api-9")
    assert correr(falso, "esperar", "api")[0] == codigo


def test_esperar_se_rinde_al_pasar_el_plazo() -> None:
    falso, reloj = RailwayFalso(), Reloj()
    falso.instancias[0] = _instancia(API, "api", "BUILDING", "d-api-2")
    with pytest.raises(railway.ErrorRailway, match="no terminó de desplegar en 25 s"):
        _esperar(falso, reloj, distinto_de=None, plazo=25.0)
    assert reloj.pausas == [10.0, 10.0, 10.0]


def test_un_log_json_de_la_api_se_vuelve_a_armar_desde_los_atributos() -> None:
    """Railway parte el JSON de `app/core/registro.py` y deja `message` vacío."""
    linea = {
        "timestamp": "2026-11-11T08:40:54.442Z",
        "severity": "info",
        "message": "",
        "attributes": [
            {"key": "level", "value": '"info"'},
            {"key": "ts", "value": '"2026-11-11T08:40:54.442+00:00"'},
            {"key": "nivel", "value": '"INFO"'},
            {"key": "logger", "value": '"carta.peticion"'},
            {"key": "mensaje", "value": '"GET /health 200"'},
            {"key": "request_id", "value": '"802ae9a8"'},
            {"key": "restaurante_id", "value": "null"},
            {"key": "estado", "value": "200"},
            {"key": "latencia_ms", "value": "0.38"},
            {"key": "raro", "value": "no es json"},
        ],
    }
    assert railway.linea_de_log(linea) == (
        "2026-11-11T08:40:54 info carta.peticion GET /health 200 "
        "request_id=802ae9a8 estado=200 latencia_ms=0.38 raro=no es json"
    )
    plano = {"timestamp": "2026-11-11T04:01:31.000Z", "severity": None, "message": "pg_dump: error"}
    assert railway.linea_de_log(plano) == "2026-11-11T04:01:31 - pg_dump: error"


@pytest.mark.parametrize("nombre", ["ap", "a", "apis", "api ", "respald", "post"])
def test_el_servicio_se_elige_por_nombre_exacto(nombre: str) -> None:
    """`redesplegar a` no puede acabar redesplegando `api`."""
    falso = RailwayFalso()
    codigo, _ = correr(falso, "redesplegar", nombre)
    assert codigo == 2
    assert "deploymentRedeploy" not in falso.campos()


def test_si_railway_no_confirma_el_cambio_de_variable_sale_con_error(
    capsys: pytest.CaptureFixture[str],
) -> None:
    falso = RailwayFalso()
    falso.confirma_variables = False
    codigo, salida = correr(falso, "variable", "api", "WORKERS", "3")
    assert (codigo, salida) == (2, "")
    assert "no confirmó el cambio de WORKERS" in capsys.readouterr().err


# ── Documentos ───────────────────────────────────────────────────────────────

RAIZ = Path(__file__).resolve().parents[2]
SKILL = RAIZ / ".claude" / "skills" / "railway" / "SKILL.md"
GUIA = RAIZ / "deploy" / "README.md"


def test_el_skill_y_la_guia_nombran_todas_las_ordenes_y_los_limites() -> None:
    skill = SKILL.read_text(encoding="utf-8")
    guia = GUIA.read_text(encoding="utf-8")
    assert skill.startswith("---\nname: railway\n")
    for orden in (orden[0] for orden in ORDENES):
        assert f"scripts/railway.py {orden}" in skill, orden
        assert f"scripts/railway.py {orden}" in guia, orden
    for texto in (skill, guia):
        assert "backboard.railway.com" in texto and "Project-Access-Token" in texto
        assert "RAILWAY_TOKEN_STAGING" in texto and "VARIABLES_NO_SECRETAS" in texto
        assert "VERSION" in texto, "producción sólo por el PR de VERSION"
    for campo in (
        "projectToken",
        "deploymentTriggers",
        "deployments(",
        "deploymentLogs",
        "buildLogs",
        "httpLogs",
        "unrendered: true",
        "variableUpsert",
        "deploymentRedeploy",
        "domains(",
    ):
        assert campo in skill, campo
        assert campo in Path(railway.__file__).read_text(encoding="utf-8"), campo
