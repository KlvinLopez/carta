"""Fábricas mínimas de datos de prueba, coherentes con `app/db/models.py`.

Cada función recibe la `AsyncSession` transaccional de `conftest.py`, inserta con los
modelos reales (nunca con SQL que esquive los CHECK) y termina con `commit()`: con
`join_transaction_mode="create_savepoint"` eso sólo libera un *savepoint* (nada sale de la
transacción de la prueba, que se revierte al terminar), pero deja lo creado a salvo de un
`rollback()` del código bajo prueba, que vuelve al último *savepoint*.
Los valores por defecto son únicos por llamada para que varias fábricas convivan en una
misma prueba (slug, `codigo_publico`, `firebase_uid`).
"""

from __future__ import annotations

import secrets
from decimal import Decimal
from functools import cache
from itertools import count
from typing import Any

from argon2 import PasswordHasher, Type
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    CategoriaMenu,
    ImportacionMenu,
    Mesa,
    OperadorRestaurante,
    PersonalRestaurante,
    Platillo,
    Restaurante,
    RolOperador,
    Usuario,
)

_contador = count(1)

# `mesa.codigo_publico` exige al menos 22 caracteres (CHECK `ck_codigo_largo`, 03 §3).
LARGO_CODIGO_MESA = 22


def codigo_de_mesa() -> str:
    """Código público opaco, como el que irá en el QR (base64url, 22 caracteres)."""
    return secrets.token_urlsafe(16)[:LARGO_CODIGO_MESA]


async def crear_restaurante(sesion: AsyncSession, **valores: Any) -> Restaurante:
    n = next(_contador)
    datos: dict[str, Any] = {"nombre": f"Restaurante {n}", "slug": f"restaurante-{n}"}
    datos.update(valores)
    restaurante = Restaurante(**datos)
    sesion.add(restaurante)
    await sesion.commit()
    return restaurante


async def crear_usuario(sesion: AsyncSession, **valores: Any) -> Usuario:
    n = next(_contador)
    datos: dict[str, Any] = {"firebase_uid": f"uid-{n}", "provider": "google"}
    datos.update(valores)
    usuario = Usuario(**datos)
    sesion.add(usuario)
    await sesion.commit()
    return usuario


async def crear_operador(
    sesion: AsyncSession,
    restaurante: Restaurante,
    usuario: Usuario | None = None,
    rol: RolOperador = RolOperador.propietario,
    **valores: Any,
) -> OperadorRestaurante:
    """Operador (dueño por defecto) del restaurante; crea el `usuario` si no se pasa."""
    if usuario is None:
        usuario = await crear_usuario(sesion)
    operador = OperadorRestaurante(
        usuario_id=usuario.id, restaurante_id=restaurante.id, rol=rol, **valores
    )
    sesion.add(operador)
    await sesion.commit()
    return operador


async def crear_mesa(sesion: AsyncSession, restaurante: Restaurante, **valores: Any) -> Mesa:
    datos: dict[str, Any] = {
        "restaurante_id": restaurante.id,
        "numero": next(_contador),
        "codigo_publico": codigo_de_mesa(),
    }
    datos.update(valores)
    mesa = Mesa(**datos)
    sesion.add(mesa)
    await sesion.commit()
    return mesa


async def crear_categoria(
    sesion: AsyncSession, restaurante: Restaurante, **valores: Any
) -> CategoriaMenu:
    n = next(_contador)
    datos: dict[str, Any] = {
        "restaurante_id": restaurante.id,
        "nombre": f"Categoría {n}",
        "orden": n,
    }
    datos.update(valores)
    categoria = CategoriaMenu(**datos)
    sesion.add(categoria)
    await sesion.commit()
    return categoria


async def crear_platillo(
    sesion: AsyncSession,
    restaurante: Restaurante,
    categoria: CategoriaMenu | None = None,
    **valores: Any,
) -> Platillo:
    n = next(_contador)
    datos: dict[str, Any] = {
        "restaurante_id": restaurante.id,
        "categoria_id": categoria.id if categoria is not None else None,
        "nombre": f"Platillo {n}",
        "precio": Decimal("100.00"),
        "orden": n,
    }
    datos.update(valores)
    platillo = Platillo(**datos)
    sesion.add(platillo)
    await sesion.commit()
    await sesion.refresh(platillo)
    return platillo


async def crear_importacion(
    sesion: AsyncSession,
    restaurante: Restaurante,
    solicitado_por: Usuario,
    **valores: Any,
) -> ImportacionMenu:
    """Importación (T-1.9); `pendiente` y sin archivo en el almacén salvo que se pase. Para
    una `listo`, `estado=EstadoImportacion.listo, resultado={...}` (un borrador válido)."""
    datos: dict[str, Any] = {
        "restaurante_id": restaurante.id,
        "solicitado_por": solicitado_por.id,
        "archivo_url": f"importaciones/{restaurante.id}/{next(_contador)}.pdf",
        "archivo_tipo": "application/pdf",
        "paginas": 1,
    }
    datos.update(valores)
    importacion = ImportacionMenu(**datos)
    sesion.add(importacion)
    await sesion.commit()
    await sesion.refresh(importacion)
    return importacion


@cache
def hash_de_pin_de_prueba() -> str:
    """Hash Argon2id de `"1234"` con parámetros mínimos (t=1, m=8 KiB): válido para
    `ck_personal_pin_hash` sin pagar los 64 MiB del servicio en cada fábrica."""
    return PasswordHasher(type=Type.ID, time_cost=1, memory_cost=8, parallelism=1).hash("1234")


async def crear_personal(
    sesion: AsyncSession, restaurante: Restaurante, **valores: Any
) -> PersonalRestaurante:
    """Mesero activo con el PIN `1234` (T-1.6). Pasa `pin_hash=` para otro hash."""
    n = next(_contador)
    datos: dict[str, Any] = {
        "restaurante_id": restaurante.id,
        "nombre": f"Persona {n}",
        "pin_hash": hash_de_pin_de_prueba(),
    }
    datos.update(valores)
    persona = PersonalRestaurante(**datos)
    sesion.add(persona)
    await sesion.commit()
    await sesion.refresh(persona)
    return persona
