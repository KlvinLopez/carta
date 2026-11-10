"""Llaves, certificados y tokens propios para probar el verificador real de Firebase (T-1.2).

Imita a `securetoken@system.gserviceaccount.com` con un `httpx.MockTransport` (`Google`) y
firma ID tokens con llaves RSA generadas aquí: sin red ni credenciales. Lo usan
`tests/unit/test_firebase.py` y las pruebas de rutas que necesitan el verificador real.
"""

from __future__ import annotations

import time
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
import jwt
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

from app.core.firebase import URL_LLAVES, VerificadorFirebase

PROYECTO = "carta-staging"
EMISOR = f"https://securetoken.google.com/{PROYECTO}"


def llave_rsa() -> rsa.RSAPrivateKey:
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def certificado(llave: rsa.RSAPrivateKey) -> str:
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


LLAVE = llave_rsa()
OTRA_LLAVE = llave_rsa()
CERTIFICADOS = {"kid-1": certificado(LLAVE)}


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


def verificador_real(
    google: Google, reloj: Reloj | None = None, proyecto: str | None = PROYECTO
) -> VerificadorFirebase:
    cliente = httpx.AsyncClient(transport=httpx.MockTransport(google))
    return VerificadorFirebase(proyecto, cliente_http=cliente, reloj=reloj or time.time)


def token_firmado(
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
