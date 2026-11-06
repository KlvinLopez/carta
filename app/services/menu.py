"""Categorías y platillos del operador (US-16, AC-16.1 a AC-16.3). Sin FastAPI (regla dura 2).

- El restaurante llega ya validado contra el operador (`restaurante_del_operador`,
  `categoria_del_operador`, `platillo_del_operador`): aquí nunca sale del cuerpo (regla 5).
- Una categoría de otro restaurante en `categoria_id` es «no existe»: 404 (regla 6). La FK
  compuesta de INV-10 lo respalda en la base.
- Desactivar es `activo/activa = false`, nunca `DELETE` (regla dura 9, AC-16.3);
  `disponible` es otro interruptor (agotado, US-27).
- Reordenar recibe ids en el orden nuevo: los enviados quedan primero (1, 2, …) y los que no
  se enviaron, después, en su orden anterior. Un id ajeno o inexistente es 404 y uno de otra
  categoría es 422; en ambos casos no se mueve nada (una sola transacción, filas bloqueadas
  con `FOR UPDATE` en orden de id para que dos reordenamientos a la vez no se intercalen).
- Toda escritura invalida la caché del menú después del `commit()` (`cache_menu`).
- Los `IntegrityError` que queden (nombre de categoría repetido entre las activas, carreras)
  los traduce `app.core.errores` (409/422/404).
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errores import ErrorCarta, mensaje_por_http
from app.db.models import CategoriaMenu, Platillo, Restaurante
from app.services import operadores
from app.services.cache_menu import CacheMenu, cache_menu


def _no_encontrado() -> ErrorCarta:
    return ErrorCarta("RECURSO_NO_ENCONTRADO", mensaje_por_http(404), 404)


def _cache(cache: CacheMenu | None) -> CacheMenu:
    return cache if cache is not None else cache_menu


async def invalidar_menu(
    sesion: AsyncSession, restaurante_id: UUID, cache: CacheMenu | None = None
) -> None:
    """Invalida el menú público del restaurante (por su `slug`)."""
    slug = await sesion.scalar(select(Restaurante.slug).where(Restaurante.id == restaurante_id))
    if slug is not None:
        await _cache(cache).invalidar(slug)


# ---------------------------------------------------------------------------
# Búsqueda aislada por operador
# ---------------------------------------------------------------------------


async def categoria_del_usuario(
    sesion: AsyncSession, usuario_id: UUID, categoria_id: UUID
) -> CategoriaMenu | None:
    """La categoría si es de un restaurante visible para el operador; `None` si no."""
    categoria = await sesion.get(CategoriaMenu, categoria_id)
    if categoria is None:
        return None
    if await operadores.restaurante_del_usuario(sesion, usuario_id, categoria.restaurante_id):
        return categoria
    return None


async def _exigir_categoria(sesion: AsyncSession, restaurante_id: UUID, categoria_id: UUID) -> None:
    existe = await sesion.scalar(
        select(CategoriaMenu.id).where(
            CategoriaMenu.id == categoria_id, CategoriaMenu.restaurante_id == restaurante_id
        )
    )
    if existe is None:
        raise _no_encontrado()


# ---------------------------------------------------------------------------
# Categorías
# ---------------------------------------------------------------------------


async def listar_categorias(
    sesion: AsyncSession,
    restaurante_id: UUID,
    activa: bool | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[CategoriaMenu]:
    consulta = select(CategoriaMenu).where(CategoriaMenu.restaurante_id == restaurante_id)
    if activa is not None:
        consulta = consulta.where(CategoriaMenu.activa.is_(activa))
    consulta = consulta.order_by(CategoriaMenu.orden, CategoriaMenu.nombre, CategoriaMenu.id)
    return list(await sesion.scalars(consulta.offset(skip).limit(limit)))


async def crear_categoria(
    sesion: AsyncSession, restaurante_id: UUID, nombre: str, cache: CacheMenu | None = None
) -> CategoriaMenu:
    """Al final de la lista (`orden = max + 1`)."""
    ultimo = await sesion.scalar(
        select(func.coalesce(func.max(CategoriaMenu.orden), 0)).where(
            CategoriaMenu.restaurante_id == restaurante_id
        )
    )
    categoria = CategoriaMenu(restaurante_id=restaurante_id, nombre=nombre, orden=(ultimo or 0) + 1)
    sesion.add(categoria)
    await sesion.commit()
    await sesion.refresh(categoria)
    await invalidar_menu(sesion, restaurante_id, cache)
    return categoria


async def cambiar_categoria(
    sesion: AsyncSession,
    categoria: CategoriaMenu,
    cambios: dict[str, Any],
    cache: CacheMenu | None = None,
) -> CategoriaMenu:
    for campo, valor in cambios.items():
        setattr(categoria, campo, valor)
    await sesion.commit()
    await sesion.refresh(categoria)
    await invalidar_menu(sesion, categoria.restaurante_id, cache)
    return categoria


async def desactivar_categoria(
    sesion: AsyncSession, categoria: CategoriaMenu, cache: CacheMenu | None = None
) -> None:
    """Baja lógica (regla dura 9); sus platillos conservan la categoría."""
    await cambiar_categoria(sesion, categoria, {"activa": False}, cache)


def _ordenar(enviados: Sequence[UUID], filas: Sequence[Any]) -> list[Any]:
    """Los enviados primero, en su orden; los demás después, en el orden que tenían."""
    por_id = {fila.id: fila for fila in filas}
    resto = sorted((f for f in filas if f.id not in set(enviados)), key=lambda f: (f.orden, f.id))
    nuevo = [por_id[i] for i in enviados] + resto
    for posicion, fila in enumerate(nuevo, start=1):
        if fila.orden != posicion:
            fila.orden = posicion
    return nuevo


async def reordenar_categorias(
    sesion: AsyncSession, restaurante_id: UUID, ids: Sequence[UUID], cache: CacheMenu | None = None
) -> list[CategoriaMenu]:
    filas = list(
        await sesion.scalars(
            select(CategoriaMenu)
            .where(CategoriaMenu.restaurante_id == restaurante_id)
            .order_by(CategoriaMenu.id)
            .with_for_update()
        )
    )
    if not set(ids) <= {f.id for f in filas}:
        await sesion.rollback()
        raise _no_encontrado()
    nuevo = _ordenar(ids, filas)
    await sesion.commit()
    await invalidar_menu(sesion, restaurante_id, cache)
    return nuevo


# ---------------------------------------------------------------------------
# Platillos
# ---------------------------------------------------------------------------


async def listar_platillos(
    sesion: AsyncSession,
    restaurante_id: UUID,
    activo: bool | None = True,
    categoria_id: UUID | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[Platillo]:
    """Por categoría (en su orden; sin categoría al final) y luego por `orden`."""
    consulta = (
        select(Platillo)
        .outerjoin(CategoriaMenu, CategoriaMenu.id == Platillo.categoria_id)
        .where(Platillo.restaurante_id == restaurante_id)
    )
    if activo is not None:
        consulta = consulta.where(Platillo.activo.is_(activo))
    if categoria_id is not None:
        consulta = consulta.where(Platillo.categoria_id == categoria_id)
    consulta = consulta.order_by(
        CategoriaMenu.orden.asc().nulls_last(),
        Platillo.categoria_id,
        Platillo.orden,
        Platillo.nombre,
        Platillo.id,
    )
    return list(await sesion.scalars(consulta.offset(skip).limit(limit)))


def _disponibilidad(platillo: Platillo, disponible: bool) -> None:
    if platillo.disponible is disponible:
        return
    platillo.disponible = disponible
    # Lo marca el operador, no el personal: `no_disponible_por` queda vacío (US-27).
    platillo.no_disponible_desde = None if disponible else datetime.now(UTC)
    platillo.no_disponible_por = None


async def _siguiente_orden(
    sesion: AsyncSession, restaurante_id: UUID, categoria_id: UUID | None
) -> int:
    filtro = (
        Platillo.categoria_id.is_(None)
        if categoria_id is None
        else Platillo.categoria_id == categoria_id
    )
    ultimo = await sesion.scalar(
        select(func.coalesce(func.max(Platillo.orden), 0)).where(
            Platillo.restaurante_id == restaurante_id, filtro
        )
    )
    return int(ultimo or 0) + 1


async def crear_platillo(
    sesion: AsyncSession,
    restaurante_id: UUID,
    datos: dict[str, Any],
    cache: CacheMenu | None = None,
) -> Platillo:
    categoria_id: UUID | None = datos.get("categoria_id")
    if categoria_id is not None:
        await _exigir_categoria(sesion, restaurante_id, categoria_id)
    disponible = datos.pop("disponible", True)
    platillo = Platillo(
        **datos,
        restaurante_id=restaurante_id,
        orden=await _siguiente_orden(sesion, restaurante_id, categoria_id),
    )
    if not disponible:
        _disponibilidad(platillo, False)
    sesion.add(platillo)
    await sesion.commit()
    await sesion.refresh(platillo)
    await invalidar_menu(sesion, restaurante_id, cache)
    return platillo


async def cambiar_platillo(
    sesion: AsyncSession,
    platillo: Platillo,
    cambios: dict[str, Any],
    cache: CacheMenu | None = None,
) -> Platillo:
    if "categoria_id" in cambios and cambios["categoria_id"] != platillo.categoria_id:
        nueva = cambios.pop("categoria_id")
        if nueva is not None:
            await _exigir_categoria(sesion, platillo.restaurante_id, nueva)
        # Antes de asignar: el autoflush de la consulta contaría al propio platillo.
        orden = await _siguiente_orden(sesion, platillo.restaurante_id, nueva)
        platillo.categoria_id = nueva
        platillo.orden = orden
    cambios.pop("categoria_id", None)
    if "disponible" in cambios:
        _disponibilidad(platillo, cambios.pop("disponible"))
    for campo, valor in cambios.items():
        setattr(platillo, campo, valor)
    await sesion.commit()
    await sesion.refresh(platillo)
    await invalidar_menu(sesion, platillo.restaurante_id, cache)
    return platillo


async def desactivar_platillo(
    sesion: AsyncSession, platillo: Platillo, cache: CacheMenu | None = None
) -> None:
    """Baja lógica (regla dura 9, AC-16.3): las órdenes que lo citan siguen intactas."""
    await cambiar_platillo(sesion, platillo, {"activo": False}, cache)


async def reordenar_platillos(
    sesion: AsyncSession, restaurante_id: UUID, ids: Sequence[UUID], cache: CacheMenu | None = None
) -> list[Platillo]:
    """Reordena dentro de **una** categoría (la de los ids enviados; `null` cuenta como una)."""
    enviados = list(
        await sesion.scalars(
            select(Platillo).where(Platillo.restaurante_id == restaurante_id, Platillo.id.in_(ids))
        )
    )
    if len(enviados) != len(ids):
        raise _no_encontrado()
    categorias = {p.categoria_id for p in enviados}
    if len(categorias) != 1:
        raise ErrorCarta(
            "PAYLOAD_INVALIDO",
            "Sólo se reordenan platillos de una misma categoría.",
            422,
            {
                "errores": [
                    {
                        "campo": "body.ids",
                        "mensaje": "ids de varias categorías",
                        "tipo": "categorias_distintas",
                    }
                ]
            },
        )
    (categoria_id,) = categorias
    filtro = (
        Platillo.categoria_id.is_(None)
        if categoria_id is None
        else Platillo.categoria_id == categoria_id
    )
    filas = list(
        await sesion.scalars(
            select(Platillo)
            .where(Platillo.restaurante_id == restaurante_id, filtro)
            .order_by(Platillo.id)
            .with_for_update()
        )
    )
    # Entre la primera lectura y el candado otro pudo mover un platillo de categoría.
    if not set(ids) <= {f.id for f in filas}:
        await sesion.rollback()
        raise ErrorCarta("CONFLICTO", mensaje_por_http(409), 409)
    _ordenar(ids, filas)
    await sesion.commit()
    # Una sola lectura recarga `actualizado_en` (expirado por el `commit`) de todas las filas.
    nuevo = list(
        await sesion.scalars(
            select(Platillo)
            .where(Platillo.restaurante_id == restaurante_id, filtro)
            .order_by(Platillo.orden, Platillo.id)
        )
    )
    await invalidar_menu(sesion, restaurante_id, cache)
    return nuevo
