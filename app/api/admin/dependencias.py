"""Autenticación del operador y aislamiento por restaurante (US-15, AC-15.1 a AC-15.3).

- `identidad_firebase`: `Authorization: Bearer <ID token>` verificado por
  `app.core.firebase` (401 con la envoltura única si falta o no vale).
- `operador_actual`: la cuenta (`usuario`) del operador; se crea en su primer acceso. Todo
  el router de `/admin` depende de ella (AC-15.1).
- `restaurante_del_operador(rid)`: el restaurante de la ruta si el operador lo tiene
  asignado; si no existe o es ajeno, 404 idéntico (AC-15.3, regla dura 6). El
  `restaurante_id` sale de aquí, nunca del cuerpo (regla dura 5).
- `platillo_del_operador(platillo_id)`: lo mismo para las rutas por id de platillo.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errores import ErrorCarta, mensaje_por_http
from app.core.firebase import (
    IdentidadFirebase,
    VerificadorFirebase,
    obtener_verificador,
    sin_credencial,
)
from app.db import Platillo, Restaurante, Usuario, get_db_session
from app.services import operadores

# `auto_error=False`: el 401 lo da `identidad_firebase` con la envoltura única. Publica el
# esquema `bearer` en `/openapi.json` para que el frontend sepa cómo autenticarse.
esquema_bearer = HTTPBearer(
    auto_error=False,
    scheme_name="FirebaseIdToken",
    description="ID token de Firebase Auth del operador (Google o enlace por correo).",
)


def no_encontrado() -> ErrorCarta:
    return ErrorCarta("RECURSO_NO_ENCONTRADO", mensaje_por_http(404), 404)


async def identidad_firebase(
    credenciales: HTTPAuthorizationCredentials | None = Depends(esquema_bearer),
    verificador: VerificadorFirebase = Depends(obtener_verificador),
) -> IdentidadFirebase:
    if credenciales is None or not credenciales.credentials.strip():
        raise sin_credencial("sin Authorization: Bearer")
    return await verificador.verificar(credenciales.credentials.strip())


async def operador_actual(
    identidad: IdentidadFirebase = Depends(identidad_firebase),
    sesion: AsyncSession = Depends(get_db_session),
) -> Usuario:
    return await operadores.usuario_de_identidad(
        sesion, identidad.uid, identidad.proveedor, identidad.nombre
    )


async def restaurante_del_operador(
    rid: UUID,
    usuario: Usuario = Depends(operador_actual),
    sesion: AsyncSession = Depends(get_db_session),
) -> Restaurante:
    restaurante = await operadores.restaurante_del_usuario(sesion, usuario.id, rid)
    if restaurante is None:
        raise no_encontrado()
    return restaurante


async def platillo_del_operador(
    platillo_id: UUID,
    usuario: Usuario = Depends(operador_actual),
    sesion: AsyncSession = Depends(get_db_session),
) -> Platillo:
    platillo = await operadores.platillo_del_usuario(sesion, usuario.id, platillo_id)
    if platillo is None:
        raise no_encontrado()
    return platillo
