"""T-1.2: el verificador real del ID token de Firebase (`app/core/firebase.py`).

Sin red ni credenciales: llaves RSA propias publicadas como certificados x509 por un
`httpx.MockTransport` que imita a `securetoken@system.gserviceaccount.com`, y tokens firmados
aquí. El reloj es inyectable para probar la caché por `Cache-Control`.
"""

from __future__ import annotations

import time
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
import jwt
import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

from app.core.errores import ErrorCarta
from app.core.firebase import URL_LLAVES, VerificadorFirebase, vigencia_de

PROYECTO = "carta-staging"
EMISOR = f"https://securetoken.google.com/{PROYECTO}"


def _llave() -> rsa.RSAPrivateKey:
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _certificado(llave: rsa.RSAPrivateKey) -> str:
    nombre = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "securetoken.system")])
    ahora = datetime.now(UTC)
    certificado = (
        x509.CertificateBuilder()
        .subject_name(nombre)
        .issuer_name(nombre)
        .public_key(llave.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(ahora - timedelta(days=1))
        .not_valid_after(ahora + timedelta(days=1))
        .sign(llave, hashes.SHA256())
    )
    return certificado.public_bytes(serialization.Encoding.PEM).decode()


LLAVE = _llave()
OTRA_LLAVE = _llave()
CERTIFICADOS = {"kid-1": _certificado(LLAVE)}


class Google:
    """`MockTransport` que cuenta las descargas y puede fallar a voluntad."""

    def __init__(self, cache_control: str = "public, max-age=3600") -> None:
        self.descargas = 0
        self.cache_control = cache_control
        self.falla: Exception | int | None = None
        self.certificados: dict[str, str] = dict(CERTIFICADOS)

    def __call__(self, peticion: httpx.Request) -> httpx.Response:
        assert str(peticion.url) == URL_LLAVES
        self.descargas += 1
        if isinstance(self.falla, Exception):
            raise self.falla
        if isinstance(self.falla, int):
            return httpx.Response(self.falla, text="error")
        return httpx.Response(
            200, json=self.certificados, headers={"Cache-Control": self.cache_control}
        )


class Reloj:
    def __init__(self) -> None:
        self.ahora = time.time()

    def __call__(self) -> float:
        return self.ahora


def _verificador(
    google: Google, reloj: Reloj | None = None, proyecto: str | None = PROYECTO
) -> VerificadorFirebase:
    cliente = httpx.AsyncClient(transport=httpx.MockTransport(google))
    return VerificadorFirebase(proyecto, cliente_http=cliente, reloj=reloj or time.time)


def _token(
    llave: rsa.RSAPrivateKey = LLAVE,
    kid: str | None = "kid-1",
    algoritmo: str = "RS256",
    sin: tuple[str, ...] = (),
    **reclamos: Any,
) -> str:
    ahora = int(time.time())
    datos: dict[str, Any] = {
        "iss": EMISOR,
        "aud": PROYECTO,
        "sub": "uid-operador-1",
        "iat": ahora - 10,
        "exp": ahora + 3600,
        "auth_time": ahora - 60,
        "name": "Calvin",
        "firebase": {"sign_in_provider": "google.com"},
    }
    datos.update(reclamos)
    for clave in sin:
        datos.pop(clave)
    cabeceras = {"kid": kid} if kid is not None else {}
    return jwt.encode(datos, llave, algorithm=algoritmo, headers=cabeceras)


async def _rechazo(verificador: VerificadorFirebase, token: str) -> ErrorCarta:
    with pytest.raises(ErrorCarta) as error:
        await verificador.verificar(token)
    assert error.value.http == 401
    return error.value


# ---------------------------------------------------------------------------
# Token válido
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-15.1")
async def test_un_token_valido_da_la_identidad() -> None:
    identidad = await _verificador(Google()).verificar(_token())
    assert identidad.uid == "uid-operador-1"
    assert identidad.proveedor == "google"
    assert identidad.nombre == "Calvin"


@pytest.mark.parametrize(
    ("proveedor_token", "proveedor"),
    [("google.com", "google"), ("password", "email_link"), ("emailLink", "email_link")],
)
async def test_google_y_enlace_por_correo(proveedor_token: str, proveedor: str) -> None:
    token = _token(firebase={"sign_in_provider": proveedor_token})
    assert (await _verificador(Google()).verificar(token)).proveedor == proveedor


async def test_el_nombre_es_opcional_y_se_recorta() -> None:
    verificador = _verificador(Google())
    assert (await verificador.verificar(_token(sin=("name",)))).nombre is None
    assert (await verificador.verificar(_token(name="  "))).nombre is None
    assert (await verificador.verificar(_token(name="x" * 300))).nombre == "x" * 100


# ---------------------------------------------------------------------------
# Rechazos: siempre 401 con la envoltura única
# ---------------------------------------------------------------------------

AHORA = int(time.time())
RECHAZOS: dict[str, dict[str, Any]] = {
    "audiencia de otro proyecto": {"aud": "otro-proyecto"},
    "emisor de otro proyecto": {"iss": "https://securetoken.google.com/otro-proyecto"},
    "emisor ajeno": {"iss": "https://accounts.google.com"},
    "sub vacío": {"sub": ""},
    "sub de 129": {"sub": "u" * 129},
    "sub no es texto": {"sub": 123},
    "auth_time en el futuro": {"auth_time": AHORA + 3600},
    "auth_time no numérico": {"auth_time": "ayer"},
    "emitido en el futuro": {"iat": AHORA + 3600},
    "proveedor anónimo": {"firebase": {"sign_in_provider": "anonymous"}},
    "proveedor teléfono": {"firebase": {"sign_in_provider": "phone"}},
    "token propio": {"firebase": {"sign_in_provider": "custom"}},
    "sin bloque firebase": {"firebase": None},
}


@pytest.mark.ac("AC-15.1")
@pytest.mark.parametrize("reclamos", list(RECHAZOS.values()), ids=list(RECHAZOS))
async def test_reclamos_invalidos_son_401(reclamos: dict[str, Any]) -> None:
    error = await _rechazo(_verificador(Google()), _token(**reclamos))
    assert error.codigo == "SIN_CREDENCIAL"


@pytest.mark.ac("AC-15.1")
@pytest.mark.parametrize("falta", ["exp", "iat", "aud", "iss", "sub", "auth_time"])
async def test_reclamos_obligatorios(falta: str) -> None:
    await _rechazo(_verificador(Google()), _token(sin=(falta,)))


@pytest.mark.ac("AC-15.1")
async def test_un_token_expirado_es_token_expirado() -> None:
    ahora = int(time.time())
    token = _token(exp=ahora - 60, iat=ahora - 3700, auth_time=ahora - 3700)
    error = await _rechazo(_verificador(Google()), token)
    assert error.codigo == "TOKEN_EXPIRADO"


@pytest.mark.ac("AC-15.1")
@pytest.mark.parametrize(
    "token",
    [
        pytest.param(lambda: _token(llave=OTRA_LLAVE), id="firmado con otra llave"),
        pytest.param(lambda: _token(kid="kid-que-no-existe"), id="kid desconocido"),
        pytest.param(lambda: _token(kid=None), id="sin kid"),
        pytest.param(
            lambda: jwt.encode({"sub": "x"}, "s" * 32, algorithm="HS256", headers={"kid": "kid-1"}),
            id="HS256 con el kid bueno",
        ),
        pytest.param(
            lambda: jwt.encode({"sub": "x"}, None, algorithm="none", headers={"kid": "kid-1"}),
            id="alg none",
        ),
        pytest.param(lambda: "no-es-un-jwt", id="basura"),
        pytest.param(lambda: "", id="vacío"),
        pytest.param(lambda: "a" * 9000, id="demasiado largo"),
    ],
)
async def test_firma_y_cabecera_invalidas_son_401(token: Any) -> None:
    error = await _rechazo(_verificador(Google()), token())
    assert error.codigo == "SIN_CREDENCIAL"


async def test_un_token_alterado_es_401() -> None:
    cabecera, cuerpo, firma = _token().split(".")
    otro_cuerpo = _token(sub="uid-de-otra-persona").split(".")[1]
    await _rechazo(_verificador(Google()), f"{cabecera}.{otro_cuerpo}.{firma}")
    assert cuerpo != otro_cuerpo


@pytest.mark.ac("AC-15.1")
async def test_sin_proyecto_configurado_nadie_entra_y_no_se_llama_a_google() -> None:
    google = Google()
    for proyecto in (None, ""):
        await _rechazo(_verificador(google, proyecto=proyecto), _token())
    assert google.descargas == 0


# ---------------------------------------------------------------------------
# Google no responde: 401, nunca 500
# ---------------------------------------------------------------------------


@pytest.mark.ac("AC-15.1")
@pytest.mark.parametrize(
    "falla",
    [
        httpx.ConnectTimeout("sin respuesta"),
        httpx.ReadTimeout("lento"),
        httpx.ConnectError("sin red"),
        500,
        503,
        404,
    ],
    ids=["timeout al conectar", "timeout al leer", "sin red", "500", "503", "404"],
)
async def test_google_sin_responder_es_401(falla: Exception | int) -> None:
    google = Google()
    google.falla = falla
    error = await _rechazo(_verificador(google), _token())
    assert error.codigo == "SIN_CREDENCIAL"


@pytest.mark.parametrize(
    "certificados",
    [{}, {"kid-1": "no es un PEM"}, ["lista"]],
    ids=["vacío", "PEM inválido", "otra forma"],
)
async def test_llaves_ilegibles_son_401(certificados: Any) -> None:
    google = Google()
    google.certificados = certificados
    await _rechazo(_verificador(google), _token())


async def test_el_tiempo_de_espera_es_corto() -> None:
    """La petición a Google lleva un `timeout` explícito de pocos segundos."""
    vistos: list[Any] = []

    def transporte(peticion: httpx.Request) -> httpx.Response:
        vistos.append(peticion.extensions["timeout"])
        return httpx.Response(200, json=CERTIFICADOS)

    cliente = httpx.AsyncClient(transport=httpx.MockTransport(transporte))
    await VerificadorFirebase(PROYECTO, cliente_http=cliente).verificar(_token())
    assert vistos and all(0 < v <= 5 for v in vistos[0].values())


# ---------------------------------------------------------------------------
# Caché de llaves por Cache-Control
# ---------------------------------------------------------------------------


async def test_las_llaves_se_cachean_lo_que_dice_max_age() -> None:
    google, reloj = Google("public, max-age=600, must-revalidate"), Reloj()
    verificador = _verificador(google, reloj)
    await verificador.verificar(_token())
    reloj.ahora += 599
    await verificador.verificar(_token())
    assert google.descargas == 1
    reloj.ahora += 2
    await verificador.verificar(_token())
    assert google.descargas == 2


async def test_un_kid_desconocido_no_fuerza_otra_descarga_con_la_cache_vigente() -> None:
    google = Google()
    verificador = _verificador(google)
    await verificador.verificar(_token())
    for _ in range(5):
        await _rechazo(verificador, _token(kid="inventado"))
    assert google.descargas == 1


async def test_una_llave_nueva_se_acepta_al_renovar() -> None:
    google, reloj = Google("max-age=60"), Reloj()
    verificador = _verificador(google, reloj)
    await verificador.verificar(_token())
    google.certificados = {"kid-2": _certificado(OTRA_LLAVE)}
    reloj.ahora += 61
    assert (await verificador.verificar(_token(llave=OTRA_LLAVE, kid="kid-2"))).uid
    await _rechazo(verificador, _token())  # la llave retirada ya no vale


async def test_si_google_cae_se_usan_las_llaves_anteriores_un_tiempo() -> None:
    google, reloj = Google("max-age=60"), Reloj()
    verificador = _verificador(google, reloj)
    await verificador.verificar(_token())
    google.falla = httpx.ConnectTimeout("caído")
    reloj.ahora += 120
    assert (await verificador.verificar(_token())).uid == "uid-operador-1"
    reloj.ahora += 7 * 3600  # más allá de la gracia
    await _rechazo(verificador, _token())


async def test_tras_un_fallo_no_se_vuelve_a_pedir_las_llaves_enseguida() -> None:
    """Con Google caído, cada petición no debe esperar el `timeout` de una descarga nueva."""
    google, reloj = Google("max-age=60"), Reloj()
    verificador = _verificador(google, reloj)
    await verificador.verificar(_token())
    google.falla = httpx.ConnectTimeout("caído")
    reloj.ahora += 61
    for _ in range(5):
        assert (await verificador.verificar(_token())).uid  # llaves anteriores
    assert google.descargas == 2
    reloj.ahora += 31
    google.falla = None
    await verificador.verificar(_token())
    assert google.descargas == 3


async def test_sin_llaves_y_con_google_caido_se_falla_rapido() -> None:
    google, reloj = Google(), Reloj()
    google.falla = httpx.ConnectTimeout("caído")
    verificador = _verificador(google, reloj)
    for _ in range(5):
        await _rechazo(verificador, _token())
    assert google.descargas == 1


@pytest.mark.parametrize(
    ("cabecera", "segundos"),
    [
        ("public, max-age=19830, must-revalidate, no-transform", 19830),
        ("max-age=0", 0),
        ("no-store", 0),
        ("no-cache, max-age=600", 0),
        ("public", 300),
        (None, 300),
        ("max-age=999999999", 24 * 3600),
        ("s-maxage=100", 300),
    ],
)
def test_vigencia_de_cache_control(cabecera: str | None, segundos: int) -> None:
    assert vigencia_de(cabecera) == segundos
