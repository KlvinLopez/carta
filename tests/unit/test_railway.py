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
        self.proyecto = "carta"

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
                    "project": {"name": self.proyecto},
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
    assert "«carta» / «staging»" in error and "VERSION" in error


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


def test_las_listas_de_variables_son_explicitas() -> None:
    """Se comparan con literales, no con una regla que pueda aflojarse."""
    assert railway.VALOR_FIJO == {
        "ENTORNO": "staging",
        "PORT": "8000",
        "DOMINIO": "staging.carta.cooking",
        "R2_BUCKET_PUBLICO": "carta-publico-staging",
        "R2_BUCKET_PRIVADO": "carta-privado-staging",
        "R2_URL_PUBLICA": "https://img-staging.carta.cooking",
        "FIREBASE_PROJECT_ID": "carta-staging-743b1",
        "FIREBASE_CSP_CONNECT_SRC": (
            "https://identitytoolkit.googleapis.com https://securetoken.googleapis.com"
        ),
        "FIREBASE_CSP_SCRIPT_SRC": "https://apis.google.com",
        "FIREBASE_CSP_FRAME_SRC": "https://carta-staging-743b1.firebaseapp.com",
        "VITE_FIREBASE_AUTH_DOMAIN": "carta-staging-743b1.firebaseapp.com",
        "VITE_FIREBASE_PROJECT_ID": "carta-staging-743b1",
        "RESPALDO_CLAVE_AGE": "age1snv8uknzuhdupcpkh8dljw39979dlcjdr0x9p5ck68xgeqn09y6qj267mk",
    }
    assert railway.VALOR_EN_RANGO == {"WORKERS": range(1, 9), "RESPALDO_DIAS": range(1, 366)}
    assert railway.SOLO_LECTURA == {"VITE_FIREBASE_APP_ID", "CLOUDFLARE_ZONE_ID"}
    assert railway.VARIABLES_NO_SECRETAS == {
        "ENTORNO",
        "PORT",
        "DOMINIO",
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
    assert railway.DEBEN_ESTAR_SELLADAS == {
        "SECRET_KEY",
        "R2_SECRET_ACCESS_KEY",
        "CLOUDFLARE_API_TOKEN",
        "ANTHROPIC_API_KEY",
    }
    assert not railway.DEBEN_ESTAR_SELLADAS & railway.VARIABLES_NO_SECRETAS
    assert railway.SERVICIOS_OPERABLES == ("api", "respaldo")
    assert (railway.PROYECTO_PERMITIDO, railway.ENVIRONMENT_PERMITIDO) == ("carta", "staging")
    assert railway.RAMA_DE_STAGING == "master"


# ── Variables: escribir ──────────────────────────────────────────────────────


def test_variable_cambia_una_no_secreta_y_deja_que_railway_redespliegue() -> None:
    falso = RailwayFalso()
    codigo, salida = correr(falso, "variable", "API", "WORKERS", "3")
    assert codigo == 0 and "redespliega" in salida
    assert falso.campos() == ["projectToken", "environment", "variables", "variableUpsert"]
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


NO_LISTADA = "no está entre las variables"
FIJA = "sólo admite el valor que la guía fija"


@pytest.mark.parametrize(
    ("nombre", "valor", "motivo"),
    [
        ("SECRET_KEY", "x" * 44, NO_LISTADA),
        ("ANTHROPIC_API_KEY", "sk-ant-otra", NO_LISTADA),
        ("R2_SECRET_ACCESS_KEY", "abc", NO_LISTADA),
        ("R2_ACCESS_KEY_ID", "abc", NO_LISTADA),
        ("R2_ENDPOINT", "https://x.r2.cloudflarestorage.com", NO_LISTADA),
        ("DATABASE_URL", "postgresql://u:p@h/b", NO_LISTADA),
        ("VITE_FIREBASE_API_KEY", "AIza", NO_LISTADA),
        ("VARIABLE_NUEVA", "1", NO_LISTADA),
        ("workers", "3", NO_LISTADA),
        ("VITE_FIREBASE_APP_ID", "1:2:web:abc", "se lee pero no se cambia"),
        ("CLOUDFLARE_ZONE_ID", "0" * 32, "se lee pero no se cambia"),
        ("ENTORNO", "desarrollo", FIJA),
        ("ENTORNO", "produccion", FIJA),
        ("PORT", "9000", FIJA),
        ("DOMINIO", "carta.cooking", FIJA),
        ("DOMINIO", "staging.carta.cooking ", FIJA),
        ("DOMINIO", "Staging.carta.cooking", FIJA),
        ("DOMINIO", "a\u2028b", FIJA),
        ("DOMINIO", "${{SECRET_KEY}}", FIJA),
        ("FIREBASE_PROJECT_ID", "carta-staging", FIJA),
        ("FIREBASE_PROJECT_ID", "proyecto-de-otro", FIJA),
        ("FIREBASE_CSP_SCRIPT_SRC", "https://evil.example", FIJA),
        ("FIREBASE_CSP_SCRIPT_SRC", "https://apis.google.com https://evil.example", FIJA),
        ("FIREBASE_CSP_FRAME_SRC", "https://carta-produccion.firebaseapp.com", FIJA),
        ("R2_BUCKET_PRIVADO", "carta-privado-produccion", FIJA),
        ("R2_URL_PUBLICA", "https://img.carta.cooking", FIJA),
        ("RESPALDO_CLAVE_AGE", "age1xxxx", FIJA),
        ("WORKERS", "", "entero de 1 a 8"),
        ("WORKERS", "0", "entero de 1 a 8"),
        ("WORKERS", "9", "entero de 1 a 8"),
        ("WORKERS", "abc", "entero de 1 a 8"),
        ("WORKERS", "100000", "entero de 1 a 8"),
        ("WORKERS", " 3", "entero de 1 a 8"),
        ("WORKERS", "3 ", "entero de 1 a 8"),
        ("WORKERS", "03", "entero de 1 a 8"),
        ("WORKERS", "3\n", "entero de 1 a 8"),
        ("WORKERS", "3\u200b", "entero de 1 a 8"),
        ("WORKERS", "\u202e3", "entero de 1 a 8"),
        ("WORKERS", "\uff13", "entero de 1 a 8"),
        ("WORKERS", "2\nSECRET_KEY=x", "entero de 1 a 8"),
        ("WORKERS", "${{SECRET_KEY}}", "entero de 1 a 8"),
        ("RESPALDO_DIAS", "0", "entero de 1 a 365"),
        ("RESPALDO_DIAS", "366", "entero de 1 a 365"),
        ("RESPALDO_DIAS", "30.5", "entero de 1 a 365"),
    ],
)
def test_variable_se_niega_sin_mandar_nada(
    nombre: str, valor: str, motivo: str, capsys: pytest.CaptureFixture[str]
) -> None:
    falso = RailwayFalso()
    codigo, salida = correr(falso, "variable", "api", nombre, valor)
    assert (codigo, salida) == (2, "")
    assert falso.peticiones == [], "lo rechazado no llega a salir hacia Railway"
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


def test_la_base_sin_disparador_no_es_un_aviso_pero_un_fallo_si() -> None:
    """`Postgres` sale de una imagen: no sigue ninguna rama y eso no es un aviso."""
    base = railway.Servicio(POSTGRES, "Postgres", (), None, None, "d", "SUCCESS", None)
    api = railway.Servicio(API, "api", ("master",), True, None, "d", "SUCCESS", None)
    respaldo = railway.Servicio(
        RESPALDO, "respaldo", ("master",), True, "0 4 * * *", "d", "SUCCESS", None
    )
    assert railway.avisos([api, base, respaldo], {}) == []
    fallido = railway.Servicio(API, "api", ("master",), True, None, "d", "FAILED", None)
    assert railway.avisos([fallido, base, respaldo], {}) == [
        "api: el último despliegue terminó en FAILED; mira `logs api`"
    ]


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
    # La última consulta trae las variables del servicio: sólo para tachar secretos del log.
    assert falso.campos() == ["projectToken", "environment", "deployment", campo, "variables"]
    assert falso.peticiones[-2]["variables"] == {
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


# ── Segunda ronda: lentes de seguridad y adversarial ────────────────────────


def _alterar(falso: RailwayFalso, campo: str, cambiar: Callable[[dict[str, Any]], None]) -> None:
    """Deja que Railway responda con una forma rara en el campo raíz `campo`."""
    original = falso._datos

    def datos(cuerpo: dict[str, Any]) -> dict[str, Any]:
        respuesta = original(cuerpo)
        if campo in respuesta:
            cambiar(respuesta)
        return respuesta

    falso._datos = datos  # type: ignore[method-assign]


def _correr_con_reloj(falso: RailwayFalso, reloj: Reloj, *argv: str) -> tuple[int, str]:
    lineas: list[str] = []
    with falso.cliente() as cliente:
        codigo = railway.main(
            list(argv),
            cliente=cliente,
            salida=lineas.append,
            dormir=reloj.dormir,
            reloj=lambda: reloj.ahora,
        )
    return codigo, "\n".join(lineas)


def _sano() -> RailwayFalso:
    falso = RailwayFalso()
    falso.variables[API]["ANTHROPIC_API_KEY"] = None
    return falso


def test_el_token_de_otro_proyecto_tampoco_pasa(capsys: pytest.CaptureFixture[str]) -> None:
    falso = RailwayFalso()
    falso.proyecto = "otro"
    codigo, _ = correr(falso, "estado")
    assert codigo == 2 and falso.campos() == ["projectToken"]
    assert "«carta» / «staging»" in capsys.readouterr().err


# ── Escribir es sólo dejar staging como dice la guía ─────────────────────────


@pytest.mark.parametrize(
    ("nombre", "valor"),
    [
        ("WORKERS", "1"),
        ("WORKERS", "8"),
        ("RESPALDO_DIAS", "1"),
        ("RESPALDO_DIAS", "365"),
        ("ENTORNO", "staging"),
        ("PORT", "8000"),
        ("DOMINIO", "staging.carta.cooking"),
        ("R2_BUCKET_PUBLICO", "carta-publico-staging"),
        ("R2_BUCKET_PRIVADO", "carta-privado-staging"),
        ("R2_URL_PUBLICA", "https://img-staging.carta.cooking"),
        ("FIREBASE_PROJECT_ID", "carta-staging-743b1"),
        (
            "FIREBASE_CSP_CONNECT_SRC",
            "https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
        ),
        ("FIREBASE_CSP_SCRIPT_SRC", "https://apis.google.com"),
        ("FIREBASE_CSP_FRAME_SRC", "https://carta-staging-743b1.firebaseapp.com"),
        ("VITE_FIREBASE_AUTH_DOMAIN", "carta-staging-743b1.firebaseapp.com"),
        ("VITE_FIREBASE_PROJECT_ID", "carta-staging-743b1"),
        ("RESPALDO_CLAVE_AGE", "age1snv8uknzuhdupcpkh8dljw39979dlcjdr0x9p5ck68xgeqn09y6qj267mk"),
    ],
)
def test_variable_corrige_una_errata_al_valor_de_la_guia(nombre: str, valor: str) -> None:
    falso = RailwayFalso()
    falso.variables[API][nombre] = "errata"
    codigo, _ = correr(falso, "variable", "api", nombre, valor, "--sin-desplegar")
    assert codigo == 0
    assert falso.variables[API][nombre] == valor


def test_los_valores_fijos_son_los_de_la_guia_de_railway() -> None:
    guia = (RAIZ / "deploy" / "railway" / "README.md").read_text(encoding="utf-8")
    de_firebase = {n for n, v in railway.VALOR_FIJO.items() if "carta-staging-743b1" in v}
    assert de_firebase == {
        "FIREBASE_PROJECT_ID",
        "FIREBASE_CSP_FRAME_SRC",
        "VITE_FIREBASE_AUTH_DOMAIN",
        "VITE_FIREBASE_PROJECT_ID",
    }
    assert "carta-staging-743b1" in guia
    for nombre, valor in railway.VALOR_FIJO.items():
        if nombre not in de_firebase:
            assert f"{nombre}={valor}" in guia, nombre


def test_variable_solo_corrige_una_que_el_servicio_ya_tiene(
    capsys: pytest.CaptureFixture[str],
) -> None:
    falso = RailwayFalso()
    codigo, _ = correr(falso, "variable", "respaldo", "WORKERS", "2")  # WORKERS es de api
    assert codigo == 2 and "variableUpsert" not in falso.campos()
    assert "respaldo no tiene la variable WORKERS" in capsys.readouterr().err


@pytest.mark.parametrize(
    "orden",
    [
        ("variable", "Postgres", "WORKERS", "2"),
        ("redesplegar", "Postgres"),
        ("redesplegar", "postgres"),
    ],
)
def test_la_base_se_mira_pero_no_se_opera(
    orden: tuple[str, ...], capsys: pytest.CaptureFixture[str]
) -> None:
    falso = RailwayFalso()
    falso.variables[POSTGRES]["WORKERS"] = "1"
    codigo, _ = correr(falso, *orden)
    assert codigo == 2
    assert not {"variableUpsert", "deploymentRedeploy"} & set(falso.campos())
    assert "sólo api y respaldo" in capsys.readouterr().err
    assert correr(falso, "variables", "Postgres")[0] == 0, "mirar sí se puede"


def test_sin_desplegar_y_esperar_no_van_juntos(capsys: pytest.CaptureFixture[str]) -> None:
    falso = RailwayFalso()
    codigo, _ = correr(falso, "variable", "api", "WORKERS", "3", "--sin-desplegar", "--esperar")
    assert codigo == 2 and falso.peticiones == []
    assert "no van juntos" in capsys.readouterr().err


# ── Nunca una traza ──────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("errores", "mensaje"),
    [
        (["boom"], "boom"),
        ("texto", "texto"),
        ([None], "None"),
        ({"message": "uno solo"}, "uno solo"),
        ([7, {"message": "dos"}, {"otra": 1}], "7; dos; error sin mensaje"),
    ],
)
def test_un_errors_con_otra_forma_no_acaba_en_traza(
    errores: object, mensaje: str, capsys: pytest.CaptureFixture[str]
) -> None:
    falso = RailwayFalso()
    falso.respuesta_forzada = httpx.Response(200, json={"errors": errores})
    assert correr(falso, "estado")[0] == 2
    assert capsys.readouterr().err == f"railway: Railway rechazó la consulta: {mensaje}\n"


def test_datos_con_formas_raras_salen_en_una_linea(capsys: pytest.CaptureFixture[str]) -> None:
    casos: list[tuple[tuple[str, ...], str, Callable[[dict[str, Any]], None]]] = [
        (
            ("estado",),
            "environment",
            lambda d: d["environment"]["serviceInstances"]["edges"][0]["node"].update(
                serviceName=None
            ),
        ),
        (
            ("estado",),
            "environment",
            lambda d: d["environment"]["serviceInstances"]["edges"][0]["node"].update(
                latestDeployment="x"
            ),
        ),
        (("variables", "api"), "variables", lambda d: d.update(variables=["a=b", "c"])),
        (("dominios", "api"), "domains", lambda d: d.update(domains=None)),
    ]
    for orden, campo, cambiar in casos:
        falso = RailwayFalso()
        _alterar(falso, campo, cambiar)
        assert correr(falso, *orden)[0] == 2, orden
        error = capsys.readouterr().err
        assert error.startswith("railway: respuesta inesperada de Railway"), error
        assert error.count("\n") == 1 and "Traceback" not in error


@pytest.mark.parametrize("meta", ["texto", ["a"], 5, None])
def test_un_meta_que_no_es_objeto_no_rompe_el_listado(meta: object) -> None:
    falso = RailwayFalso()
    _alterar(falso, "deployments", lambda d: d["deployments"]["edges"][0]["node"].update(meta=meta))
    codigo, salida = correr(falso, "despliegues", "api")
    assert codigo == 0 and salida.splitlines()[1].split()[:2] == ["d-api-1", "SUCCESS"]


def test_un_atributo_con_json_abismal_no_tumba_los_logs() -> None:
    falso = RailwayFalso()
    _alterar(
        falso,
        "deploymentLogs",
        lambda d: d["deploymentLogs"][0].update(
            message="", attributes=[{"key": "a", "value": "[" * 200_000}]
        ),
    )
    codigo, salida = correr(falso, "logs", "api")
    assert codigo == 0 and len(salida.splitlines()[1]) == 2001


def test_ctrl_c_sale_con_130_y_sin_traza(capsys: pytest.CaptureFixture[str]) -> None:
    def interrumpir(_peticion: httpx.Request) -> httpx.Response:
        raise KeyboardInterrupt

    with httpx.Client(transport=httpx.MockTransport(interrumpir)) as cliente:
        codigo = railway.main(["estado"], cliente=cliente, salida=lambda _linea: None)
    assert codigo == 130
    assert capsys.readouterr().err == "railway: interrumpido\n"


def test_el_limite_de_tasa_se_dice_con_su_espera(capsys: pytest.CaptureFixture[str]) -> None:
    falso = RailwayFalso()
    falso.respuesta_forzada = httpx.Response(429, text="Too Many", headers={"Retry-After": "60"})
    assert correr(falso, "estado")[0] == 2
    assert capsys.readouterr().err == (
        "railway: Railway limita las peticiones (429; 1000 por hora): reintenta en 60 s\n"
    )


# ── Estado: los verdes engañosos ─────────────────────────────────────────────


def test_estado_estricto_no_da_verde_con_staging_vacio() -> None:
    falso = RailwayFalso()
    falso.instancias, falso.disparadores = [], []
    codigo, salida = correr(falso, "estado", "--estricto")
    assert codigo == 1 and "staging no tiene ningún servicio" in salida


def test_estado_avisa_si_falta_un_servicio() -> None:
    falso = _sano()
    falso.instancias = [i for i in falso.instancias if i["node"]["serviceName"] != "respaldo"]
    codigo, salida = correr(falso, "estado", "--estricto")
    assert codigo == 1 and "- falta el servicio «respaldo» en staging" in salida


def test_estado_avisa_si_api_no_sigue_ninguna_rama() -> None:
    falso = _sano()
    falso.disparadores = [_disparador(RESPALDO, "master")]
    codigo, salida = correr(falso, "estado", "--estricto")
    assert codigo == 1 and "- api: no sigue ninguna rama (sin fuente conectada)" in salida


@pytest.mark.parametrize("orden", [("otra", "master"), ("master", "otra")])
def test_estado_ve_todas_las_ramas_de_un_servicio(orden: tuple[str, str]) -> None:
    falso = _sano()
    falso.disparadores = [
        _disparador(API, orden[0]),
        _disparador(API, orden[1]),
        _disparador(RESPALDO, "master"),
    ]
    codigo, salida = correr(falso, "estado", "--estricto")
    assert codigo == 1 and "- api: sigue la rama «otra», no «master»" in salida


def test_la_rama_se_compara_tal_cual() -> None:
    falso = _sano()
    falso.disparadores = [_disparador(API, "Master"), _disparador(RESPALDO, "master")]
    codigo, salida = correr(falso, "estado", "--estricto")
    assert codigo == 1 and "«Master»" in salida


@pytest.mark.parametrize("estado", ["REMOVED", "SKIPPED", "SLEEPING", "NEEDS_APPROVAL"])
def test_estado_avisa_si_api_no_tiene_un_despliegue_activo(estado: str) -> None:
    falso = _sano()
    falso.instancias[0] = _instancia(API, "api", estado, "d-x")
    codigo, salida = correr(falso, "estado", "--estricto")
    assert codigo == 1 and f"- api: no tiene un despliegue activo (estado: {estado})" in salida


def test_estado_avisa_si_api_nunca_se_desplego() -> None:
    falso = _sano()
    falso.instancias[0]["node"]["latestDeployment"] = None
    codigo, salida = correr(falso, "estado", "--estricto")
    assert codigo == 1 and "- api: no tiene un despliegue activo (estado: ninguno)" in salida


@pytest.mark.parametrize("estado", ["INITIALIZING", "BUILDING", "DEPLOYING"])
def test_un_despliegue_en_curso_no_es_un_aviso(estado: str) -> None:
    falso = _sano()
    falso.instancias[0] = _instancia(API, "api", estado, "d-x")
    assert correr(falso, "estado", "--estricto")[0] == 0


def test_con_dos_servicios_que_solo_difieren_en_mayusculas_gana_el_exacto(
    capsys: pytest.CaptureFixture[str],
) -> None:
    falso = RailwayFalso()
    falso.instancias.append(_instancia("s-API", "API", "SUCCESS", "d-API-1"))
    assert correr(falso, "despliegues", "API")[0] == 0
    assert falso.peticiones[-1]["variables"]["entrada"]["serviceId"] == "s-API"
    assert correr(falso, "despliegues", "api")[0] == 0
    assert falso.peticiones[-1]["variables"]["entrada"]["serviceId"] == API
    assert correr(falso, "despliegues", "Api")[0] == 2
    assert "«Api» es ambiguo" in capsys.readouterr().err


# ── Redesplegar ──────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("estado", "motivo"),
    [
        ("INITIALIZING", "usa `esperar api`"),
        ("QUEUED", "usa `esperar api`"),
        ("WAITING", "usa `esperar api`"),
        ("BUILDING", "usa `esperar api`"),
        ("DEPLOYING", "usa `esperar api`"),
        ("REMOVED", "no se repite desde aquí"),
        ("SKIPPED", "no se repite desde aquí"),
        ("SLEEPING", "no se repite desde aquí"),
    ],
)
def test_redesplegar_solo_repite_un_despliegue_terminado(
    estado: str, motivo: str, capsys: pytest.CaptureFixture[str]
) -> None:
    falso = RailwayFalso()
    falso.instancias[0] = _instancia(API, "api", estado, "d-x")
    assert correr(falso, "redesplegar", "api")[0] == 2
    assert "deploymentRedeploy" not in falso.campos()
    assert motivo in capsys.readouterr().err


@pytest.mark.parametrize("estado", ["SUCCESS", "FAILED", "CRASHED"])
def test_redesplegar_repite_un_despliegue_bueno_o_fallido(estado: str) -> None:
    falso = RailwayFalso()
    falso.instancias[0] = _instancia(API, "api", estado, "d-x")
    assert correr(falso, "redesplegar", "api")[0] == 0
    assert falso.peticiones[-1]["variables"] == {"id": "d-x"}


# ── Esperar ──────────────────────────────────────────────────────────────────


@pytest.mark.parametrize("plazo", ["nan", "inf", "-inf", "0", "0.5", "3601", "1e999", "diez", ""])
def test_un_plazo_que_no_es_finito_y_razonable_es_uso_incorrecto(plazo: str) -> None:
    falso = RailwayFalso()
    with falso.cliente() as cliente, pytest.raises(SystemExit) as salida:
        railway.main(["esperar", "api", f"--plazo={plazo}"], cliente=cliente)
    assert salida.value.code == 2 and falso.peticiones == []


@pytest.mark.parametrize("plazo", [float("nan"), float("inf"), 0.0, -5.0, 3600.5])
def test_esperar_no_acepta_un_plazo_sin_fin(plazo: float) -> None:
    falso, reloj = RailwayFalso(), Reloj()
    with pytest.raises(railway.ErrorRailway, match="el plazo va de 1 a 3600"):
        _esperar(falso, reloj, distinto_de=None, plazo=plazo)
    assert reloj.pausas == [] and falso.peticiones == []


def test_esperar_se_rinde_justo_al_cumplirse_el_plazo() -> None:
    falso, reloj = RailwayFalso(), Reloj()
    falso.instancias[0] = _instancia(API, "api", "BUILDING", "d-api-2")
    with pytest.raises(railway.ErrorRailway, match="último estado: BUILDING"):
        _esperar(falso, reloj, distinto_de=None, plazo=20.0)
    assert reloj.pausas == [10.0, 10.0]


@pytest.mark.parametrize(
    "estado", ["REMOVED", "SKIPPED", "SLEEPING", "NEEDS_APPROVAL", "ESTADO_QUE_NO_EXISTE"]
)
def test_esperar_no_se_queda_mirando_un_estado_que_no_avanza(estado: str) -> None:
    falso, reloj = RailwayFalso(), Reloj()
    falso.instancias[0] = _instancia(API, "api", estado, "d-api-2")
    servicio = _esperar(falso, reloj, distinto_de="d-api-1")
    assert servicio.despliegue_estado == estado and reloj.pausas == []
    assert _correr_con_reloj(falso, reloj, "esperar", "api")[0] == 1


@pytest.mark.parametrize("estado", ["INITIALIZING", "QUEUED", "WAITING", "BUILDING", "DEPLOYING"])
def test_esperar_sigue_mientras_el_despliegue_esta_en_curso(estado: str) -> None:
    falso, reloj = RailwayFalso(), Reloj()
    falso.instancias[0] = _instancia(API, "api", estado, "d-api-2")
    with pytest.raises(railway.ErrorRailway, match="no terminó de desplegar en 30 s"):
        _esperar(falso, reloj, distinto_de=None, plazo=30.0)
    assert reloj.pausas == [10.0, 10.0, 10.0]


@pytest.mark.parametrize(
    ("orden", "final", "codigo"),
    [
        (("variable", "api", "WORKERS", "3", "--esperar"), "SUCCESS", 0),
        (("redesplegar", "api", "--esperar"), "SUCCESS", 0),
        (("variable", "api", "WORKERS", "3", "--esperar"), "FAILED", 1),
        (("redesplegar", "api", "--esperar"), "CRASHED", 1),
    ],
)
def test_esperar_tras_un_cambio_sigue_al_despliegue_nuevo(
    orden: tuple[str, ...], final: str, codigo: int
) -> None:
    falso, reloj = RailwayFalso(), Reloj()

    def avanzar() -> None:
        if len(reloj.pausas) == 2:
            falso.instancias[0] = _instancia(API, "api", "BUILDING", "d-api-2")
        if len(reloj.pausas) == 3:
            falso.instancias[0] = _instancia(API, "api", final, "d-api-2")

    falso.al_listar_servicios = avanzar
    obtenido, salida = _correr_con_reloj(falso, reloj, *orden)
    assert obtenido == codigo
    assert reloj.pausas == [10.0, 10.0, 10.0], "el despliegue viejo, en SUCCESS, no se da por bueno"
    assert f"api: {final}" in salida and "(d-api-2)" in salida


def _con_fallos(falso: RailwayFalso, fallan: set[int], fallo: str) -> httpx.MockTransport:
    """Las peticiones cuyo número (desde 1) está en `fallan` fallan como dice `fallo`."""
    cuenta = {"n": 0}

    def manejar(peticion: httpx.Request) -> httpx.Response:
        cuenta["n"] += 1
        if cuenta["n"] not in fallan:
            return falso._manejar(peticion)
        if fallo == "timeout":
            raise httpx.ReadTimeout("lento", request=peticion)
        if fallo == "429":
            return httpx.Response(429, headers={"Retry-After": "60"})
        return httpx.Response(502, text="<html>bad gateway</html>")

    return httpx.MockTransport(manejar)


@pytest.mark.parametrize("fallo", ["502", "429", "timeout"])
def test_un_fallo_transitorio_a_mitad_de_la_espera_no_la_aborta(fallo: str) -> None:
    falso, reloj = RailwayFalso(), Reloj()
    falso.instancias[0] = _instancia(API, "api", "BUILDING", "d-api-2")

    def avanzar() -> None:
        if len(reloj.pausas) >= 4:
            falso.instancias[0] = _instancia(API, "api", "SUCCESS", "d-api-2")

    falso.al_listar_servicios = avanzar
    # 1 projectToken, 2 primer sondeo; 3, 4 y 5 fallan seguidos; el 6 ya ve el SUCCESS.
    with httpx.Client(transport=_con_fallos(falso, {3, 4, 5}, fallo)) as cliente:
        codigo = railway.main(
            ["esperar", "api"],
            cliente=cliente,
            salida=lambda _linea: None,
            dormir=reloj.dormir,
            reloj=lambda: reloj.ahora,
        )
    assert codigo == 0 and reloj.pausas == [10.0] * 4


def test_cuatro_fallos_seguidos_si_abortan_la_espera(capsys: pytest.CaptureFixture[str]) -> None:
    falso, reloj = RailwayFalso(), Reloj()
    falso.instancias[0] = _instancia(API, "api", "BUILDING", "d-api-2")
    with httpx.Client(transport=_con_fallos(falso, {3, 4, 5, 6}, "502")) as cliente:
        codigo = railway.main(
            ["esperar", "api"],
            cliente=cliente,
            salida=lambda _linea: None,
            dormir=reloj.dormir,
            reloj=lambda: reloj.ahora,
        )
    assert codigo == 2 and reloj.pausas == [10.0] * 4
    assert capsys.readouterr().err == "railway: Railway respondió 502\n"


def test_un_rechazo_que_no_es_transitorio_aborta_la_espera_a_la_primera() -> None:
    falso, reloj = RailwayFalso(), Reloj()
    falso.instancias[0] = _instancia(API, "api", "BUILDING", "d-api-2")

    def manejar(peticion: httpx.Request) -> httpx.Response:
        if len(falso.peticiones) >= 2:
            return httpx.Response(401, json={"errors": [{"message": "Unauthorized"}]})
        return falso._manejar(peticion)

    with httpx.Client(transport=httpx.MockTransport(manejar)) as cliente:
        codigo = railway.main(
            ["esperar", "api"],
            cliente=cliente,
            salida=lambda _linea: None,
            dormir=reloj.dormir,
            reloj=lambda: reloj.ahora,
        )
    assert codigo == 2 and reloj.pausas == [10.0]


# ── Lo que llega de Railway es texto ajeno ───────────────────────────────────


def test_un_mensaje_de_commit_hostil_sale_limpio_y_recortado() -> None:
    falso = RailwayFalso()
    hostil = "fix\x1b[2J\x1b[8moculto‮txt " + "y" * 200
    _alterar(
        falso,
        "deployments",
        lambda d: d["deployments"]["edges"][0]["node"]["meta"].update(commitMessage=hostil),
    )
    codigo, salida = correr(falso, "despliegues", "api")
    assert codigo == 0 and "\x1b" not in salida and "‮" not in salida
    mensaje = salida.splitlines()[1].split("a2089c1  ")[1]
    assert len(mensaje) == 70 and mensaje.startswith("fix[2J[8mocultotxt yyy")


def test_un_log_con_saltos_no_puede_imitar_otra_linea() -> None:
    falso = RailwayFalso()
    _alterar(
        falso,
        "deploymentLogs",
        lambda d: d["deploymentLogs"][0].update(
            message="ok\n2026-11-11T00:00:00 info FALSA\x1b[31m\r otra\x85más"
        ),
    )
    codigo, salida = correr(falso, "logs", "api")
    assert codigo == 0 and len(salida.splitlines()) == 2
    assert salida.splitlines()[1] == (
        "2026-11-11T04:01:31 error ok 2026-11-11T00:00:00 info FALSA[31m  otra más"
    )


def test_una_linea_de_log_gigante_se_acota() -> None:
    linea = {"timestamp": "2026-11-11T04:01:31Z", "severity": "info", "message": "x" * 1_000_000}
    acotada = railway.linea_de_log(linea)
    assert len(acotada) == 2001 and acotada.endswith("x…")


def test_las_variables_no_pueden_romper_la_tabla() -> None:
    falso = RailwayFalso()
    falso.variables[API]["\x1b[2JRARA"] = "v"
    falso.variables[API]["WORKERS"] = "2\nSECRET_KEY  «sellada»"
    codigo, salida = correr(falso, "variables", "api")
    assert codigo == 0 and "\x1b" not in salida
    lineas = salida.splitlines()
    assert len(lineas) == 1 + len(falso.variables[API])
    assert sum(linea.startswith("SECRET_KEY") for linea in lineas) == 1


def test_un_log_sin_hora_no_rompe_el_listado() -> None:
    falso = RailwayFalso()
    _alterar(falso, "httpLogs", lambda d: d["httpLogs"][0].update(timestamp=None))
    codigo, salida = correr(falso, "logs", "api", "--tipo", "http")
    assert codigo == 0 and salida.splitlines()[1] == "- 200 GET /health 3 ms req-1"
    sin_hora = {"timestamp": None, "severity": "info", "message": "hola"}
    assert railway.linea_de_log(sin_hora) == "- info hola"


def test_una_clave_repetida_en_los_atributos_no_esconde_la_primera() -> None:
    linea = {
        "timestamp": "2026-11-11T04:01:31Z",
        "severity": "info",
        "message": "",
        "attributes": [
            {"key": "mensaje", "value": '"real"'},
            {"key": "mensaje", "value": '"falso"'},
        ],
    }
    assert railway.linea_de_log(linea) == "2026-11-11T04:01:31 info real mensaje=falso"


def test_una_linea_sin_mensaje_no_deja_espacio_al_final() -> None:
    vacia = {"timestamp": "2026-11-11T04:01:31Z", "severity": "info", "message": ""}
    assert railway.linea_de_log(vacia) == "2026-11-11T04:01:31 info"


def test_logs_tacha_el_valor_de_un_secreto_sin_sellar_si_aparece() -> None:
    falso = RailwayFalso()
    _alterar(
        falso,
        "deploymentLogs",
        lambda d: d["deploymentLogs"][0].update(
            message=f"llave={SECRETO_SIN_SELLAR} dominio=staging.carta.cooking"
        ),
    )
    codigo, salida = correr(falso, "logs", "api")
    assert codigo == 0 and SECRETO_SIN_SELLAR not in salida
    assert salida.splitlines()[1] == (
        "2026-11-11T04:01:31 error llave=«oculto» dominio=staging.carta.cooking"
    )


def test_cambiar_variable_comprueba_por_si_misma_aunque_no_pase_por_la_orden() -> None:
    """La regla vive en el servicio, no sólo en la orden: quien llame directo tampoco escribe."""
    falso = RailwayFalso()
    with falso.cliente() as cliente:
        operador = railway.Railway(cliente)
        api = operador.servicio("api")
        antes = len(falso.peticiones)
        for nombre, valor in (("DOMINIO", "carta.cooking"), ("SECRET_KEY", "x"), ("WORKERS", "9")):
            with pytest.raises(railway.ErrorRailway):
                operador.cambiar_variable(api, nombre, valor, sin_desplegar=True)
        assert len(falso.peticiones) == antes
        base = operador.servicio("Postgres")
        for accion in (
            lambda: operador.cambiar_variable(base, "WORKERS", "2", sin_desplegar=True),
            lambda: operador.redesplegar(base),
        ):
            with pytest.raises(railway.ErrorRailway, match="Postgres"):
                accion()
    assert not {"variableUpsert", "deploymentRedeploy"} & set(falso.campos())
