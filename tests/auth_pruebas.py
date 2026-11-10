"""Autenticación del operador en pruebas de rutas (T-1.2).

`conftest.cliente` sustituye `app.core.firebase.obtener_verificador` por
`VerificadorDePrueba` (*dependency override*, como pide el brief): el token
`prueba:<firebase_uid>[:<proveedor>]` identifica a ese usuario sin llamar a Google. Lo demás
es 401, como con el verificador real. El verificador real se prueba aparte, con llaves
propias y `httpx.MockTransport` (`tests/unit/test_firebase.py`).
"""

from __future__ import annotations

from typing import get_args

from app.core.firebase import IdentidadFirebase, Proveedor, VerificadorFirebase, sin_credencial

PREFIJO = "prueba:"


def token_de(uid: str, proveedor: Proveedor = "google") -> str:
    return f"{PREFIJO}{uid}:{proveedor}"


def cabecera_de(uid: str, proveedor: Proveedor = "google") -> dict[str, str]:
    return {"Authorization": f"Bearer {token_de(uid, proveedor)}"}


class VerificadorDePrueba(VerificadorFirebase):
    def __init__(self) -> None:
        super().__init__(proyecto="carta-pruebas")

    async def verificar(self, token: str) -> IdentidadFirebase:
        if not token.startswith(PREFIJO):
            raise sin_credencial("token de prueba inválido")
        uid, _, proveedor = token.removeprefix(PREFIJO).partition(":")
        if not uid or proveedor not in get_args(Proveedor):
            raise sin_credencial("token de prueba inválido")
        return IdentidadFirebase(uid=uid, proveedor=proveedor)  # type: ignore[arg-type]


VERIFICADOR_DE_PRUEBA = VerificadorDePrueba()
