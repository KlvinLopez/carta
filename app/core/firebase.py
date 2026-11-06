"""Verificación del ID token de Firebase Auth del operador (`/api/v1/admin`, US-15).

Sin el SDK de Firebase Admin (ADR-012: sin SDKs propietarios de nube): PyJWT contra las
llaves públicas que Google publica para `securetoken@system.gserviceaccount.com`, con las
comprobaciones de la documentación de Firebase («Verify ID tokens using a third-party JWT
library»):

- cabecera: `alg = RS256` y un `kid` que esté entre las llaves vigentes;
- `aud` = `FIREBASE_PROJECT_ID` e `iss` = `https://securetoken.google.com/<proyecto>`;
- `exp` en el futuro, `iat` y `auth_time` en el pasado;
- `sub` (el `uid`) no vacío y de 128 caracteres como mucho.

Decisiones:

- **Siempre 401, nunca 500.** Un token malo, una llave desconocida o Google sin responder
  terminan en `ErrorCarta` 401 con la envoltura única: `TOKEN_EXPIRADO` si sólo expiró (el
  panel renueva el token y reintenta) y `SIN_CREDENCIAL` en lo demás (04_API_Spec §1.2).
  El motivo exacto va al log, nunca al cliente.
- **Cerrado por defecto.** Sin `FIREBASE_PROJECT_ID` ningún token es válido (y no se llama a
  Google): un despliegue sin configurar no deja entrar a nadie.
- **Caché de llaves por `Cache-Control: max-age`** (Google rota las llaves y anuncia su
  vigencia ahí). Un `kid` desconocido con la caché vigente **no** vuelve a pedir las llaves:
  si no, cualquiera forzaría una petición a Google por cada token inventado. Si la caché
  venció y Google no responde, se siguen usando las llaves anteriores hasta
  `VIGENCIA_MAXIMA_LLAVES_VENCIDAS`: un corte de Google no saca a los operadores del panel.
  Tras un fallo no se reintenta en `REINTENTO_TRAS_FALLO` segundos, para que un corte no
  haga esperar el `timeout` a cada petición.
- **Cliente HTTP inyectable** (`httpx.AsyncClient`) con tiempo de espera corto
  (`TIEMPO_ESPERA_LLAVES`); las pruebas usan `httpx.MockTransport` y llaves propias.
- **Proveedores:** `google.com` → `google`; `password`/`emailLink` → `email_link` (el
  enlace por correo de Firebase firma con `password`; el proyecto sólo habilita Google y el
  enlace). Cualquier otro (anónimo, teléfono, token propio) → 401.

`obtener_verificador` es la dependencia de FastAPI; las pruebas de rutas la sustituyen con
`app.dependency_overrides` por un verificador falso (brief de T-1.2).
"""

from __future__ import annotations

import asyncio
import logging
import re
import time
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any, Literal

import httpx
import jwt
from cryptography.x509 import load_pem_x509_certificate

from app.core.config import settings
from app.core.errores import ErrorCarta

log = logging.getLogger("carta.firebase")

URL_LLAVES = (
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
)
EMISOR = "https://securetoken.google.com/{proyecto}"
ALGORITMO = "RS256"
TIEMPO_ESPERA_LLAVES = 3.0  # segundos: conectar + leer; el operador espera esta petición
VIGENCIA_POR_DEFECTO = 300  # s, si Google no manda `max-age`
VIGENCIA_MAXIMA = 24 * 3600  # s: tope a un `max-age` absurdo
VIGENCIA_MAXIMA_LLAVES_VENCIDAS = 6 * 3600  # s de gracia si Google no responde
REINTENTO_TRAS_FALLO = 30  # s sin volver a pedir las llaves tras un fallo
TOLERANCIA_RELOJ = 5  # s de desfase entre nuestro reloj y el de Google
LARGO_MAXIMO_UID = 128  # `usuario.firebase_uid VARCHAR(128)`
LARGO_MAXIMO_TOKEN = 8192  # un ID token real ronda 1 KB

Proveedor = Literal["google", "email_link"]
PROVEEDORES: dict[str, Proveedor] = {
    "google.com": "google",
    "password": "email_link",
    "emailLink": "email_link",
}

MENSAJE_SIN_CREDENCIAL = "Necesitas iniciar sesión para hacer esto."
MENSAJE_TOKEN_EXPIRADO = "Tu sesión expiró; vuelve a iniciar sesión."

_RE_MAX_AGE = re.compile(r"(?:^|[,\s])max-age=(\d+)", re.IGNORECASE)


@dataclass(frozen=True)
class IdentidadFirebase:
    """Lo que la API usa del token: nada más (sin correo ni foto en el servidor)."""

    uid: str
    proveedor: Proveedor
    nombre: str | None = None


def sin_credencial(motivo: str) -> ErrorCarta:
    """401 uniforme; `motivo` sólo va al log."""
    log.info("token de operador rechazado: %s", motivo)
    return ErrorCarta("SIN_CREDENCIAL", MENSAJE_SIN_CREDENCIAL, 401)


def vigencia_de(cache_control: str | None) -> int:
    """Segundos de `max-age` en `Cache-Control`, acotados a [0, VIGENCIA_MAXIMA]."""
    if not cache_control:
        return VIGENCIA_POR_DEFECTO
    if "no-store" in cache_control.lower() or "no-cache" in cache_control.lower():
        return 0
    encontrado = _RE_MAX_AGE.search(cache_control)
    if not encontrado:
        return VIGENCIA_POR_DEFECTO
    return min(int(encontrado.group(1)), VIGENCIA_MAXIMA)


class VerificadorFirebase:
    """Verifica ID tokens de un proyecto de Firebase. Una instancia por proceso."""

    def __init__(
        self,
        proyecto: str | None,
        cliente_http: httpx.AsyncClient | None = None,
        reloj: Callable[[], float] = time.time,
        url_llaves: str = URL_LLAVES,
    ) -> None:
        self.proyecto = proyecto or None
        self._cliente_http = cliente_http
        self._reloj = reloj
        self._url_llaves = url_llaves
        self._llaves: dict[str, Any] = {}
        self._vence_en = 0.0
        self._proximo_intento = 0.0
        self._candado = asyncio.Lock()

    # -- llaves ------------------------------------------------------------------------

    async def _descargar(self) -> tuple[dict[str, Any], int]:
        if self._cliente_http is not None:
            respuesta = await self._cliente_http.get(self._url_llaves, timeout=TIEMPO_ESPERA_LLAVES)
        else:
            async with httpx.AsyncClient(timeout=TIEMPO_ESPERA_LLAVES) as cliente:
                respuesta = await cliente.get(self._url_llaves)
        respuesta.raise_for_status()
        certificados = respuesta.json()
        if not isinstance(certificados, Mapping) or not certificados:
            raise ValueError("respuesta de llaves vacía o con otra forma")
        llaves = {
            str(kid): load_pem_x509_certificate(str(pem).encode()).public_key()
            for kid, pem in certificados.items()
        }
        return llaves, vigencia_de(respuesta.headers.get("cache-control"))

    async def _llaves_vigentes(self) -> dict[str, Any]:
        if self._reloj() < self._vence_en:
            return self._llaves
        async with self._candado:
            ahora = self._reloj()
            if ahora < self._vence_en:  # otra petición las renovó mientras esperábamos
                return self._llaves
            if ahora >= self._proximo_intento:
                try:
                    llaves, vigencia = await self._descargar()
                except Exception as error:  # red, tiempo, 5xx, JSON o PEM inválidos
                    # Sin respiro, con Google caído cada petición esperaría el `timeout`
                    # completo, en fila detrás del candado.
                    self._proximo_intento = ahora + REINTENTO_TRAS_FALLO
                    log.error(
                        "no se pudieron obtener las llaves de Firebase (%s)", type(error).__name__
                    )
                else:
                    self._llaves = llaves
                    self._vence_en = ahora + vigencia
                    return llaves
            if self._llaves and ahora < self._vence_en + VIGENCIA_MAXIMA_LLAVES_VENCIDAS:
                log.warning("llaves de Firebase vencidas en uso mientras Google no responde")
                return self._llaves
            raise sin_credencial("llaves no disponibles")

    # -- token -------------------------------------------------------------------------

    async def verificar(self, token: str) -> IdentidadFirebase:
        if not self.proyecto:
            raise sin_credencial("FIREBASE_PROJECT_ID sin configurar")
        if not token or len(token) > LARGO_MAXIMO_TOKEN:
            raise sin_credencial("token vacío o demasiado largo")
        try:
            cabecera = jwt.get_unverified_header(token)
        except jwt.PyJWTError:
            raise sin_credencial("token mal formado") from None
        if cabecera.get("alg") != ALGORITMO:
            raise sin_credencial("algoritmo no permitido")
        kid = cabecera.get("kid")
        if not isinstance(kid, str):
            raise sin_credencial("token sin kid")

        llave = (await self._llaves_vigentes()).get(kid)
        if llave is None:
            raise sin_credencial("kid desconocido")

        try:
            reclamos: dict[str, Any] = jwt.decode(
                token,
                key=llave,
                algorithms=[ALGORITMO],
                audience=self.proyecto,
                issuer=EMISOR.format(proyecto=self.proyecto),
                leeway=TOLERANCIA_RELOJ,
                options={"require": ["exp", "iat", "aud", "iss", "sub", "auth_time"]},
            )
        except jwt.ExpiredSignatureError:
            log.info("token de operador rechazado: expirado")
            raise ErrorCarta("TOKEN_EXPIRADO", MENSAJE_TOKEN_EXPIRADO, 401) from None
        except jwt.PyJWTError as error:
            raise sin_credencial(type(error).__name__) from None

        return self._identidad(reclamos)

    def _identidad(self, reclamos: Mapping[str, Any]) -> IdentidadFirebase:
        ahora = self._reloj()
        uid = reclamos.get("sub")
        if not isinstance(uid, str) or not uid or len(uid) > LARGO_MAXIMO_UID:
            raise sin_credencial("sub inválido")
        auth_time = reclamos.get("auth_time")
        if (
            not isinstance(auth_time, int | float)
            or isinstance(auth_time, bool)
            or auth_time > ahora + TOLERANCIA_RELOJ
        ):
            raise sin_credencial("auth_time inválido o en el futuro")
        firebase = reclamos.get("firebase")
        proveedor_token = (
            firebase.get("sign_in_provider") if isinstance(firebase, Mapping) else None
        )
        proveedor = PROVEEDORES.get(proveedor_token) if isinstance(proveedor_token, str) else None
        if proveedor is None:
            raise sin_credencial("proveedor no permitido")
        nombre_token = reclamos.get("name")
        nombre = nombre_token.strip()[:100] if isinstance(nombre_token, str) else ""
        return IdentidadFirebase(uid=uid, proveedor=proveedor, nombre=nombre or None)


_verificador: VerificadorFirebase | None = None


def obtener_verificador() -> VerificadorFirebase:
    """Dependencia de FastAPI: el verificador del proceso (la caché de llaves es suya)."""
    global _verificador
    if _verificador is None or _verificador.proyecto != (settings.FIREBASE_PROJECT_ID or None):
        _verificador = VerificadorFirebase(settings.FIREBASE_PROJECT_ID)
    return _verificador


__all__ = [
    "IdentidadFirebase",
    "Proveedor",
    "VerificadorFirebase",
    "obtener_verificador",
    "sin_credencial",
    "vigencia_de",
]
