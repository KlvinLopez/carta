"""Operadores y sus restaurantes (US-15). Sin FastAPI: lo usan las dependencias de `/admin`.

- `usuario_de_identidad` resuelve la cuenta del operador a partir del `uid` de Firebase y la
  crea en el primer acceso (`INSERT ... ON CONFLICT DO NOTHING`: dos primeras peticiones a
  la vez no chocan).
- Un operador ve sólo los restaurantes donde tiene una fila **activa** en
  `operador_restaurante` y el restaurante está activo (AC-15.2); cualquier otro es «no
  existe» para él (AC-15.3), y quien llama responde 404.
- `crear_restaurante` crea el restaurante y al operador como `propietario` en una sola
  transacción, con un `slug` único: el pedido (409 si ya existe) o uno derivado del nombre
  (`la-querencia`, `la-querencia-2`, ...).
"""

from __future__ import annotations

import re
import secrets
import unicodedata
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errores import ErrorCarta
from app.db.models import OperadorRestaurante, Platillo, Restaurante, RolOperador, Usuario

# Renovar `ultimo_login` en cada petición sería una escritura por petición.
INTERVALO_ULTIMO_LOGIN = timedelta(hours=1)
LARGO_BASE_SLUG = 50  # deja sitio al sufijo dentro de los 60 de `RestauranteCrear`
INTENTOS_SLUG = 5
MENSAJE_SLUG_OCUPADO = "Esa dirección ya la usa otro restaurante; elige otra."


def slug_desde(nombre: str) -> str:
    """`"Café La Querencia!"` → `"cafe-la-querencia"`; `"restaurante"` si no queda nada."""
    sin_acentos = unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode()
    base = re.sub(r"[^a-z0-9]+", "-", sin_acentos.lower()).strip("-")
    base = base[:LARGO_BASE_SLUG].strip("-")
    return base if len(base) >= 2 else "restaurante"


# ---------------------------------------------------------------------------
# Usuario
# ---------------------------------------------------------------------------


async def usuario_de_identidad(
    sesion: AsyncSession, uid: str, proveedor: str, nombre: str | None = None
) -> Usuario:
    """El `usuario` del `uid` de Firebase; lo crea en el primer acceso."""
    usuario = await sesion.scalar(select(Usuario).where(Usuario.firebase_uid == uid))
    if usuario is None:
        await sesion.execute(
            insert(Usuario)
            .values(firebase_uid=uid, provider=proveedor, nombre_display=nombre)
            .on_conflict_do_nothing(index_elements=[Usuario.firebase_uid])
        )
        await sesion.commit()
        usuario = await sesion.scalar(select(Usuario).where(Usuario.firebase_uid == uid))
        if usuario is None:  # pragma: no cover - sólo si alguien lo borra entre medias
            raise ErrorCarta("SIN_CREDENCIAL", "Necesitas iniciar sesión para hacer esto.", 401)
        return usuario
    if usuario.ultimo_login < datetime.now(UTC) - INTERVALO_ULTIMO_LOGIN:
        usuario.ultimo_login = datetime.now(UTC)
        await sesion.commit()
    return usuario


# ---------------------------------------------------------------------------
# Restaurantes del operador
# ---------------------------------------------------------------------------


def _visibles_para(usuario_id: UUID) -> Any:
    return (
        select(Restaurante)
        .join(OperadorRestaurante, OperadorRestaurante.restaurante_id == Restaurante.id)
        .where(
            OperadorRestaurante.usuario_id == usuario_id,
            OperadorRestaurante.activo.is_(True),
            Restaurante.activo.is_(True),
        )
    )


async def restaurantes_del_usuario(sesion: AsyncSession, usuario_id: UUID) -> list[Restaurante]:
    resultado = await sesion.scalars(
        _visibles_para(usuario_id).order_by(Restaurante.creado_en, Restaurante.id)
    )
    return list(resultado)


async def restaurante_del_usuario(
    sesion: AsyncSession, usuario_id: UUID, restaurante_id: UUID
) -> Restaurante | None:
    """El restaurante si el operador lo tiene asignado; `None` si no existe o es ajeno."""
    resultado: Restaurante | None = await sesion.scalar(
        _visibles_para(usuario_id).where(Restaurante.id == restaurante_id)
    )
    return resultado


async def platillo_del_usuario(
    sesion: AsyncSession, usuario_id: UUID, platillo_id: UUID
) -> Platillo | None:
    """El platillo si es de un restaurante del operador; `None` si no existe o es ajeno."""
    visibles = _visibles_para(usuario_id).with_only_columns(Restaurante.id)
    resultado: Platillo | None = await sesion.scalar(
        select(Platillo).where(
            Platillo.id == platillo_id, Platillo.restaurante_id.in_(visibles.scalar_subquery())
        )
    )
    return resultado


async def _slug_libre(sesion: AsyncSession, base: str) -> str:
    ocupados = set(
        await sesion.scalars(
            select(Restaurante.slug).where(
                or_(Restaurante.slug == base, Restaurante.slug.like(f"{base}-%"))
            )
        )
    )
    if base not in ocupados:
        return base
    n = 2
    while f"{base}-{n}" in ocupados:
        n += 1
    return f"{base}-{n}"


def _es_slug_repetido(error: IntegrityError) -> bool:
    return getattr(error.orig, "sqlstate", None) == "23505" and "slug" in str(error.orig)


async def crear_restaurante(
    sesion: AsyncSession, usuario: Usuario, datos: dict[str, Any]
) -> Restaurante:
    """Restaurante + su operador `propietario`, con `slug` único. 409 si el pedido existe."""
    pedido: str | None = datos.pop("slug", None)
    for intento in range(INTENTOS_SLUG):
        if pedido is not None:
            slug = pedido
        elif intento < INTENTOS_SLUG - 1:
            slug = await _slug_libre(sesion, slug_desde(datos["nombre"]))
        else:  # carreras repetidas con el mismo nombre: un sufijo al azar
            slug = f"{slug_desde(datos['nombre'])}-{secrets.token_hex(3)}"
        restaurante = Restaurante(**datos, slug=slug)
        try:
            async with sesion.begin_nested():
                sesion.add(restaurante)
                await sesion.flush()
                sesion.add(
                    OperadorRestaurante(
                        usuario_id=usuario.id,
                        restaurante_id=restaurante.id,
                        rol=RolOperador.propietario,
                    )
                )
                await sesion.flush()
        except IntegrityError as error:
            if not _es_slug_repetido(error):
                raise
            if pedido is not None:
                raise ErrorCarta("CONFLICTO", MENSAJE_SLUG_OCUPADO, 409) from None
            continue
        await sesion.commit()
        await sesion.refresh(restaurante)
        return restaurante
    raise ErrorCarta("CONFLICTO", MENSAJE_SLUG_OCUPADO, 409)  # pragma: no cover


async def actualizar_restaurante(
    sesion: AsyncSession, restaurante: Restaurante, cambios: dict[str, Any]
) -> Restaurante:
    for campo, valor in cambios.items():
        setattr(restaurante, campo, valor)
    try:
        await sesion.commit()
    except IntegrityError as error:
        await sesion.rollback()
        if _es_slug_repetido(error):
            raise ErrorCarta("CONFLICTO", MENSAJE_SLUG_OCUPADO, 409) from None
        raise
    await sesion.refresh(restaurante)
    return restaurante
