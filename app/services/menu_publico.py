"""Menú público del comensal (T-2.2, US-04). Sin FastAPI.

`menu(slug)` arma `MenuPublico` y lo guarda 30 s en `cache_menu` (T-1.3); `detalle(id)` lee un
platillo. Ninguno depende de la cookie ni del comensal: el menú es público por `slug` y lo
cachea el borde (02 §4).

**Qué sale** (AC-04.1, AC-04.4): platillos `activo` de categorías `activa` de un restaurante
`activo`, por `categoria.orden`, `platillo.orden`; uno agotado sale con `disponible = false`.
Una categoría sin platillos visibles no sale (una pestaña vacía no sirve a nadie) y un
platillo sin categoría tampoco (el menú se agrupa por categoría). Restaurante inexistente o
inactivo, y un `slug` sin forma de `slug`, dan el mismo 404 (los segundos sin consultar la base:
un NUL en el texto reventaría el driver).

**Versión del contenido**: el `ETag` es el hash del cuerpo servido. `categoria_menu` no tiene
`actualizado_en`, así que `max(actualizado_en)` no vería un cambio de nombre o de orden de
categoría; el hash del contenido sí, y nunca depende del tiempo.

**Varios workers**: `invalidar` sólo toca la memoria del worker que atendió el `PATCH`; los
demás sirven su copia hasta 30 s. Para que el borde no la guarde otros 30 s, cada respuesta
descuenta la edad de la copia local de sus tiempos (`FotoMenu.cabecera_cache`): una copia de
hace 20 s sale con `max-age=10, s-maxage=10`, y ni el borde ni el navegador conservan un menú
más de 30 s contando desde que se armó.

**AC-04.4 de punta a punta** (revisión de T-2.7): un cambio debe verse en ≤ 60 s. Ninguna copia
anterior al cambio vive más de 30 s (este módulo) y el comensal vuelve a pedir el menú cada
25 s mientras lo ve (`INTERVALO_MENU_MS` en el frontend): 30 + 25 = 55 s. Con `s-maxage=60` el
peor caso eran 60 s de copia vieja en el borde más el turno del teléfono.
"""

from __future__ import annotations

import asyncio
import hashlib
import math
import re
from dataclasses import dataclass, replace
from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errores import ErrorCarta, mensaje_por_http
from app.db.models import CategoriaMenu, Platillo, Restaurante
from app.schemas.menu_publico import (
    MAX_DESTACADOS,
    CategoriaPublica,
    MenuPublico,
    PlatilloDetalle,
    PlatilloPublico,
    RestaurantePublico,
)
from app.schemas.restaurante import LARGO_MAXIMO_SLUG, PATRON_SLUG
from app.services.cache_menu import cache_menu

MAX_AGE_SEGUNDOS = 30
# Igual que `max-age`: el borde no guarda el menú más que el navegador (ver «AC-04.4» arriba).
S_MAXAGE_SEGUNDOS = 30
# Lo que tarda en salir la respuesta: un menú recién armado lleva los tiempos completos.
HOLGURA_SEGUNDOS = 0.05
SIN_ALMACENAR = "no-store"

_SLUG = re.compile(PATRON_SLUG)


def no_encontrado() -> ErrorCarta:
    """El mismo 404 para lo que no existe, está dado de baja o no tiene forma válida."""
    return ErrorCarta("RECURSO_NO_ENCONTRADO", mensaje_por_http(404), 404)


def _etag(cuerpo: bytes) -> str:
    return f'"{hashlib.sha256(cuerpo).hexdigest()[:32]}"'


@dataclass(frozen=True)
class FotoMenu:
    """El menú ya serializado. `construido` es el reloj de `cache_menu` justo antes de leerlo.
    `almacenable = False`: una escritura confirmó mientras se leía, así que esta copia ya es
    vieja y ni el borde ni el navegador deben guardarla."""

    cuerpo: bytes
    etag: str
    construido: float
    almacenable: bool = True

    def edad(self) -> float:
        return max(0.0, cache_menu.reloj() - self.construido)

    def cabecera_cache(self) -> str:
        """`public, max-age=30, s-maxage=30` recién armado; menos mientras envejece la copia
        local (ver el docstring del módulo), de modo que `edad + s-maxage <= 30`. Una copia
        no almacenable sale `no-store`."""
        if not self.almacenable:
            return SIN_ALMACENAR
        edad = math.ceil(max(0.0, self.edad() - HOLGURA_SEGUNDOS))
        return (
            f"public, max-age={max(0, MAX_AGE_SEGUNDOS - edad)}, "
            f"s-maxage={max(0, S_MAXAGE_SEGUNDOS - edad)}"
        )


def _publico(platillo: Platillo) -> PlatilloPublico:
    return PlatilloPublico(
        id=platillo.id,
        categoria_id=platillo.categoria_id,
        nombre=platillo.nombre,
        descripcion=platillo.descripcion,
        precio=platillo.precio,
        disponible=platillo.disponible,
        imagen_tipo=platillo.imagen_tipo,
        foto_thumb_url=platillo.foto_thumb_url,
        foto_detalle_url=platillo.foto_detalle_url,
        ilustracion_clave=platillo.ilustracion_clave,
        alergenos=list(platillo.alergenos),
        etiquetas=list(platillo.etiquetas),
        calorias=platillo.calorias,
        nivel_picante=platillo.nivel_picante,
        destacado=platillo.destacado,
        orden=platillo.orden,
    )


def _slug_valido(slug: str) -> bool:
    return len(slug) <= LARGO_MAXIMO_SLUG and _SLUG.fullmatch(slug) is not None


async def _armar(sesion: AsyncSession, slug: str) -> MenuPublico:
    restaurante = (
        await sesion.execute(
            select(Restaurante).where(Restaurante.slug == slug, Restaurante.activo.is_(True))
        )
    ).scalar_one_or_none()
    if restaurante is None:
        raise no_encontrado()
    filas = (
        await sesion.execute(
            select(CategoriaMenu, Platillo)
            .join(Platillo, Platillo.categoria_id == CategoriaMenu.id)
            .where(
                CategoriaMenu.restaurante_id == restaurante.id,
                CategoriaMenu.activa.is_(True),
                Platillo.restaurante_id == restaurante.id,
                Platillo.activo.is_(True),
            )
            .order_by(
                CategoriaMenu.orden,
                CategoriaMenu.nombre,
                CategoriaMenu.id,
                Platillo.orden,
                Platillo.nombre,
                Platillo.id,
            )
        )
    ).all()
    categorias: dict[UUID, CategoriaPublica] = {}
    destacados: list[UUID] = []
    momento: datetime = restaurante.actualizado_en
    for categoria, platillo in filas:
        grupo = categorias.get(categoria.id)
        if grupo is None:
            grupo = categorias[categoria.id] = CategoriaPublica(
                id=categoria.id, nombre=categoria.nombre, orden=categoria.orden, platillos=[]
            )
        grupo.platillos.append(_publico(platillo))
        if platillo.destacado and len(destacados) < MAX_DESTACADOS:
            destacados.append(platillo.id)
        momento = max(momento, platillo.actualizado_en)
    return MenuPublico(
        restaurante=RestaurantePublico(
            nombre=restaurante.nombre,
            slug=restaurante.slug,
            logo_url=restaurante.logo_url,
            tema=restaurante.tema,
        ),
        categorias=list(categorias.values()),
        destacados=destacados,
        actualizado_en=momento,
    )


# `slug` → vuelo en curso. `None` en el resultado = quien armaba se canceló: reintenta el resto.
_vuelos: dict[str, asyncio.Future[FotoMenu | None]] = {}


async def _armar_y_guardar(sesion: AsyncSession, slug: str) -> FotoMenu:
    generacion = cache_menu.generacion(slug)
    # El reloj se toma **antes** de leer la base: la edad de la copia cuenta desde el dato, no
    # desde que terminó de armarse. Con un armado lento, contarla desde el final dejaba servir
    # el menú más de 30 s desde la lectura y se comía el margen de AC-04.4.
    leido = cache_menu.reloj()
    armado = await _armar(sesion, slug)
    cuerpo = armado.model_dump_json().encode()
    foto = FotoMenu(cuerpo=cuerpo, etag=_etag(cuerpo), construido=leido)
    if not cache_menu.guardar(slug, foto, generacion, desde=leido):
        return replace(foto, almacenable=False)
    return foto


async def menu(sesion: AsyncSession, slug: str) -> FotoMenu:
    """El menú del restaurante `slug`, de la caché de este worker si tiene ≤ 30 s.

    **Vuelo único por `slug`:** con la caché fría o recién caducada, las peticiones
    simultáneas esperan a la primera en lugar de armar el menú entera cada una (40 lecturas
    iguales agotaban el pool). Si quien armaba falla, el error llega a todos y el `slug` no
    queda atascado; si se cancela (el cliente cuelga), los demás reintentan sin cancelarse.

    La generación se toma **antes** de consultar la base: si una escritura confirma y
    `invalidar` corre mientras se lee, `guardar` descarta lo leído y la respuesta sale
    `no-store` (si no, el borde guardaría 30 s un menú anterior al `commit`). Un 404 no se
    guarda."""
    if not _slug_valido(slug):
        raise no_encontrado()
    while True:
        guardado = cache_menu.obtener(slug)
        if isinstance(guardado, FotoMenu):
            return guardado
        vuelo = _vuelos.get(slug)
        if vuelo is None:
            break
        resultado = await asyncio.shield(vuelo)  # el error de quien armaba llega aquí
        if resultado is not None:
            return resultado
    vuelo = asyncio.get_running_loop().create_future()
    _vuelos[slug] = vuelo
    try:
        foto = await _armar_y_guardar(sesion, slug)
    except asyncio.CancelledError:
        vuelo.set_result(None)
        raise
    except BaseException as error:
        vuelo.set_exception(error)
        vuelo.exception()  # sin nadie esperando, que no se registre «nunca recuperada»
        raise
    else:
        vuelo.set_result(foto)
        return foto
    finally:
        if _vuelos.get(slug) is vuelo:
            del _vuelos[slug]


@dataclass(frozen=True)
class FotoDetalle:
    cuerpo: bytes
    etag: str


async def detalle(sesion: AsyncSession, platillo_id: UUID) -> FotoDetalle:
    """`GET /p/platillos/{id}`: un platillo activo de una categoría y un restaurante activos
    (404 en cualquier otro caso, el mismo cuerpo que un id inexistente)."""
    fila = (
        await sesion.execute(
            select(Platillo, CategoriaMenu.nombre)
            .join(CategoriaMenu, Platillo.categoria_id == CategoriaMenu.id)
            .join(Restaurante, Restaurante.id == Platillo.restaurante_id)
            .where(
                Platillo.id == platillo_id,
                Platillo.activo.is_(True),
                CategoriaMenu.activa.is_(True),
                CategoriaMenu.restaurante_id == Platillo.restaurante_id,
                Restaurante.activo.is_(True),
            )
        )
    ).one_or_none()
    if fila is None:
        raise no_encontrado()
    platillo, categoria_nombre = fila
    modelo = PlatilloDetalle(**_publico(platillo).model_dump(), categoria_nombre=categoria_nombre)
    cuerpo = modelo.model_dump_json().encode()
    return FotoDetalle(cuerpo=cuerpo, etag=_etag(cuerpo))
