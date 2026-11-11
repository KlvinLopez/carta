"""Credenciales de la API. Hoy, el token del comensal (invitado, T-2.1); el del personal lo
añade el carril G en la Fase 3 (T-3.4) en este mismo módulo.

**Token de invitado** (ADR-003, 04_API_Spec §1.1, AC-01.2): JWT HS256 firmado con
`SECRET_KEY`, 6 h (`INVITADO_VIGENCIA_HORAS`), en la cookie `carta_invitado`
(`HttpOnly; Secure; SameSite=Lax; Path=/api/v1/p`). No lleva nada personal: identifica al
miembro, su sesión y su restaurante (regla dura 5: `restaurante_id` sale de aquí).

- `aud = "carta:invitado"` e `iss = "carta"`: un token de otra audiencia (el del personal,
  T-3.4) firmado con la misma llave no pasa por invitado, ni al revés.
- El algoritmo es fijo: `alg: none` o uno distinto del de `Settings` es 401.
- 401 `SIN_CREDENCIAL` sin cookie; 401 `TOKEN_EXPIRADO` vencido; 401 `TOKEN_INVALIDO`
  manipulado, mal formado o de otra audiencia. Los tres sin pistas en el cuerpo.

`invitado_actual` sólo verifica la firma: **no consulta la base**, para que el sondeo de 3 s
pueda responder 304 desde la memoria (02 §6). Lo que depende del estado (sesión cerrada →
410) lo decide cada servicio con la fila en la mano.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import jwt
from fastapi import Request, Response

from app.core.config import settings
from app.core.errores import ErrorCarta

COOKIE_INVITADO = "carta_invitado"
RUTA_COOKIE_INVITADO = "/api/v1/p"
AUDIENCIA_INVITADO = "carta:invitado"
EMISOR = "carta"
# Un token con más de esto no es nuestro: la cookie nunca crece así (4 KB es el tope del
# navegador) y no gastamos CPU en decodificarlo.
LARGO_MAXIMO_TOKEN = 1024


@dataclass(frozen=True)
class Invitado:
    """Lo que el token afirma; ya verificado (firma, audiencia y vigencia)."""

    miembro_id: UUID
    sesion_id: UUID
    restaurante_id: UUID


def _ahora() -> datetime:
    return datetime.now(UTC)


def vigencia_invitado() -> timedelta:
    return timedelta(hours=settings.INVITADO_VIGENCIA_HORAS)


def emitir_token_invitado(invitado: Invitado, *, ahora: datetime | None = None) -> str:
    momento = ahora or _ahora()
    carga: dict[str, Any] = {
        "iss": EMISOR,
        "aud": AUDIENCIA_INVITADO,
        "sub": str(invitado.miembro_id),
        "sid": str(invitado.sesion_id),
        "rid": str(invitado.restaurante_id),
        "iat": int(momento.timestamp()),
        "exp": int((momento + vigencia_invitado()).timestamp()),
    }
    return jwt.encode(carga, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITMO)


def _invalido() -> ErrorCarta:
    return ErrorCarta("TOKEN_INVALIDO", "Tu acceso a la mesa no es válido; vuelve a escanear.", 401)


def verificar_token_invitado(token: str) -> Invitado:
    """El invitado del token, o `ErrorCarta` 401. Nunca deja pasar una excepción de `jwt`."""
    if not token or len(token) > LARGO_MAXIMO_TOKEN:
        raise _invalido()
    try:
        carga = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITMO],
            audience=AUDIENCIA_INVITADO,
            issuer=EMISOR,
            options={"require": ["exp", "iat", "iss", "aud", "sub", "sid", "rid"]},
        )
    except jwt.ExpiredSignatureError as error:
        raise ErrorCarta(
            "TOKEN_EXPIRADO", "Tu acceso a la mesa venció; vuelve a escanear el QR.", 401
        ) from error
    except jwt.PyJWTError as error:
        raise _invalido() from error
    try:
        return Invitado(
            miembro_id=UUID(str(carga["sub"])),
            sesion_id=UUID(str(carga["sid"])),
            restaurante_id=UUID(str(carga["rid"])),
        )
    except (ValueError, TypeError) as error:
        raise _invalido() from error


def poner_cookie_invitado(response: Response, token: str) -> None:
    """`Set-Cookie` del invitado. `Secure` siempre: los navegadores lo aceptan en
    `localhost`, y en staging y producción la app sólo va por HTTPS."""
    response.set_cookie(
        COOKIE_INVITADO,
        token,
        max_age=int(vigencia_invitado().total_seconds()),
        path=RUTA_COOKIE_INVITADO,
        secure=True,
        httponly=True,
        samesite="lax",
    )


def token_de_peticion(request: Request) -> str | None:
    return request.cookies.get(COOKIE_INVITADO) or None


async def invitado_actual(request: Request) -> Invitado:
    """Dependencia de FastAPI para las rutas del comensal que exigen la cookie."""
    token = token_de_peticion(request)
    if token is None:
        raise ErrorCarta("SIN_CREDENCIAL", "Escanea el QR de tu mesa para entrar.", 401)
    return verificar_token_invitado(token)


def invitado_opcional(request: Request) -> Invitado | None:
    """El invitado si trae una cookie válida; `None` si no trae o no vale (para `entrar`,
    donde una cookie vieja o ajena no es un error: se entra como nuevo)."""
    token = token_de_peticion(request)
    if token is None:
        return None
    try:
        return verificar_token_invitado(token)
    except ErrorCarta:
        return None
