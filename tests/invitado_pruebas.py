"""Ayudantes de las pruebas del comensal (T-2.1): entrar a una mesa y hablar como invitado.

La cookie `carta_invitado` es `Secure` y el cliente de pruebas va por `http://pruebas`, así
que httpx no la reenvía sola: cada petición la manda en la cabecera `Cookie` explícita.
"""

from __future__ import annotations

from http.cookies import SimpleCookie
from typing import Any

from httpx import AsyncClient, Response

from app.core.seguridad import COOKIE_INVITADO

P = "/api/v1/p"


def set_cookie_invitado(respuesta: Response) -> SimpleCookie:
    """La cabecera `Set-Cookie` de la cookie del invitado, ya analizada."""
    for valor in respuesta.headers.get_list("set-cookie"):
        galleta: SimpleCookie = SimpleCookie()
        galleta.load(valor)
        if COOKIE_INVITADO in galleta:
            return galleta
    raise AssertionError(f"la respuesta no trae {COOKIE_INVITADO}: {respuesta.headers}")


def token_de(respuesta: Response) -> str:
    return set_cookie_invitado(respuesta)[COOKIE_INVITADO].value


def con_token(token: str | None) -> dict[str, str]:
    return {"Cookie": f"{COOKIE_INVITADO}={token}"} if token else {}


async def entrar(
    cliente: AsyncClient, codigo: str, token: str | None = None
) -> tuple[Response, str | None]:
    """`POST /p/sesion/entrar`; regresa la respuesta y el token nuevo (o `None` si falló)."""
    respuesta = await cliente.post(
        f"{P}/sesion/entrar", json={"codigo_mesa": codigo}, headers=con_token(token)
    )
    nuevo = token_de(respuesta) if respuesta.status_code == 200 else None
    return respuesta, nuevo


async def estado(cliente: AsyncClient, token: str, **cabeceras: str) -> Response:
    return await cliente.get(f"{P}/sesion", headers={**con_token(token), **cabeceras})


async def cambiar_alias(cliente: AsyncClient, token: str, cuerpo: Any) -> Response:
    return await cliente.patch(f"{P}/miembro", json=cuerpo, headers=con_token(token))


def sin_request_id(cuerpo: dict[str, Any]) -> dict[str, Any]:
    """La envoltura de error sin `request_id` (cambia en cada petición)."""
    error = dict(cuerpo["error"])
    error.pop("request_id")
    return {"error": error}
