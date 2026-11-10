"""Semilla de desarrollo (T-1.7, 03_Datos_v1 §8): el restaurante «La Ceiba» listo para usarse.

    uv run python scripts/seed.py

Crea, **a través de los servicios reales** (así las invariantes, los hashes y la ilustración de
cada categoría quedan como en producción): un restaurante con 4 categorías y 22 platillos (18
con foto de muestra y 4 con la ilustración de su categoría), 8 mesas con su código público, un
operador, 3 personas del personal (2 meseros y 1 capitán) y una importación de ejemplo en estado
`listo` con la carta `tests/fixtures/menus/la-ceiba.pdf` (sin llamar a la API de Claude: el
borrador sale de la respuesta grabada).

**Idempotente:** localiza el restaurante por su `slug` fijo, lo borra con todo lo suyo (cascada
de la base) y lo recrea; dos corridas dejan los mismos conteos. Es el único borrado físico del
proyecto y **sólo corre con `ENTORNO=desarrollo`**: en cualquier otro entorno se niega con
código de salida 2 antes de tocar la base. El usuario del operador se conserva (no es del
restaurante) y se reutiliza.

Sin FastAPI. El PIN de desarrollo sólo vale en una base de desarrollo y se imprime una vez, al
final. Fotos: `tests/fixtures/fotos/*.jpg` (las genera `scripts/generar_fotos_semilla.py`).
"""

from __future__ import annotations

import asyncio
import json
import sys
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.enlaces import url_de_mesa
from app.db.models import (
    EstadoImportacion,
    ImportacionMenu,
    Mesa,
    PersonalRestaurante,
    Platillo,
    Restaurante,
    RolPersonal,
    SesionGrupal,
)
from app.schemas.importacion import ResultadoImportacion
from app.services import assets, importaciones, menu, mesas, operadores, personal

RAIZ = Path(__file__).resolve().parents[1]
FOTOS = RAIZ / "tests" / "fixtures" / "fotos"
MENUS = RAIZ / "tests" / "fixtures" / "menus"

SLUG = "la-ceiba"
NOMBRE = "La Ceiba"
FIREBASE_UID_OPERADOR = "dev-operador-la-ceiba"  # fijo; sólo existe en bases de desarrollo
PROVEEDOR_OPERADOR = "google"
NOMBRE_OPERADOR = "Operador de La Ceiba"
# 03 §8: «PIN `1234`». Sólo desarrollo: el seed se niega a correr en otro entorno, y el PIN se
# guarda hasheado (Argon2id) como cualquier otro.
PIN_DESARROLLO = "1234"
PERSONAL = (
    ("Lupita", RolPersonal.mesero),
    ("Chema", RolPersonal.mesero),
    ("Marisol", RolPersonal.capitan),
)
MESAS = 8
CAPACIDAD_MESA = 4
CODIGO_SALIDA_ENTORNO = 2


@dataclass(frozen=True)
class PlatilloSemilla:
    categoria: str
    nombre: str
    descripcion: str
    precio: int
    alergenos: tuple[str, ...]
    etiquetas: tuple[str, ...]
    slug_foto: str | None  # `tests/fixtures/fotos/<slug_foto>.jpg`; None = ilustración
    destacado: bool = False
    disponible: bool = True


CATEGORIAS = ("Para empezar", "Platos fuertes", "Postres", "Bebidas")

# Los 20 platillos de la carta de `la-ceiba.pdf` (con precio al «M.P.» del pescado) y dos más.
PLATILLOS = (
    PlatilloSemilla(
        "Para empezar",
        "Guacamole de la casa",
        "Aguacate, chile serrano, totopos de maíz azul",
        145,
        (),
        ("vegetariano",),
        "guacamole-de-la-casa",
        destacado=True,
    ),
    PlatilloSemilla(
        "Para empezar",
        "Tostadas de atún",
        "Atún aleta amarilla, chipotle, aguacate, ajonjolí (3 pzas)",
        185,
        ("pescado", "ajonjoli"),
        (),
        "tostadas-de-atun",
    ),
    PlatilloSemilla(
        "Para empezar",
        "Esquites con tuétano",
        "Elote criollo, epazote, mayonesa de chile pasilla",
        120,
        (),
        (),
        "esquites-con-tuetano",
    ),
    PlatilloSemilla(
        "Para empezar",
        "Sopa de tortilla",
        "Caldo de jitomate asado, queso panela, crema, chicharrón",
        110,
        (),
        (),
        "sopa-de-tortilla",
    ),
    PlatilloSemilla(
        "Para empezar",
        "Tuétanos a la leña",
        "Con salsa verde cruda y tortillas de maíz azul",
        210,
        (),
        (),
        "tuetanos-a-la-lena",
    ),
    PlatilloSemilla(
        "Para empezar",
        "Ensalada de nopales",
        "Nopal asado, jitomate, cebolla morada, queso fresco, aderezo de limón",
        105,
        ("lacteos",),
        ("vegetariano",),
        "ensalada-de-nopales",
    ),
    PlatilloSemilla(
        "Platos fuertes",
        "Mole negro de Oaxaca",
        "Pierna de pato confitada, arroz blanco, plátano macho",
        385,
        (),
        (),
        "mole-negro-de-oaxaca",
        destacado=True,
    ),
    PlatilloSemilla(
        "Platos fuertes",
        "Pescado zarandeado",
        "Robalo entero, adobo de chile guajillo, cebolla morada",
        340,
        (),
        (),
        "pescado-zarandeado",
    ),
    PlatilloSemilla(
        "Platos fuertes",
        "Costilla braseada",
        "Reducción de tamarindo, puré de camote, cebollitas cambray",
        420,
        (),
        (),
        "costilla-braseada",
    ),
    PlatilloSemilla(
        "Platos fuertes",
        "Chile en nogada",
        "Temporada · Picadillo de res y cerdo, nogada de Castilla, granada",
        360,
        ("nueces", "lacteos"),
        ("temporada",),
        "chile-en-nogada",
    ),
    PlatilloSemilla(
        "Platos fuertes",
        "Enchiladas suizas",
        "Pollo deshebrado, salsa verde cremosa, queso gratinado",
        215,
        ("lacteos",),
        (),
        "enchiladas-suizas",
    ),
    # Agotado a propósito: así el menú de desarrollo muestra también ese estado.
    PlatilloSemilla(
        "Platos fuertes",
        "Pulpo a las brasas",
        "Papas cambray, pimentón de la Vera, alioli de chile de árbol",
        395,
        ("mariscos", "huevo"),
        (),
        "pulpo-a-las-brasas",
        disponible=False,
    ),
    PlatilloSemilla(
        "Platos fuertes",
        "Milanesa de res",
        "Con frijoles refritos, arroz rojo y ensalada de nopales",
        245,
        (),
        (),
        "milanesa-de-res",
    ),
    PlatilloSemilla(
        "Postres",
        "Flan de cajeta",
        "Con nuez garapiñada",
        95,
        ("huevo", "lacteos", "nueces"),
        ("vegetariano",),
        "flan-de-cajeta",
    ),
    PlatilloSemilla(
        "Postres",
        "Pastel de elote",
        "Helado de vainilla de Papantla",
        105,
        (),
        (),
        "pastel-de-elote",
    ),
    PlatilloSemilla(
        "Postres", "Churros", "Chocolate de metate o cajeta (6 pzas)", 90, (), (), "churros"
    ),
    PlatilloSemilla(
        "Postres",
        "Nieve de limón",
        "Sorbete de limón real con ralladura y menta",
        85,
        (),
        ("vegetariano",),
        "nieve-de-limon",
    ),
    PlatilloSemilla("Bebidas", "Agua del día", "Jamaica, horchata o tamarindo", 45, (), (), None),
    PlatilloSemilla("Bebidas", "Limonada", "Natural o mineral", 55, (), (), None),
    PlatilloSemilla("Bebidas", "Café de olla", "Canela y piloncillo", 60, (), (), None),
    PlatilloSemilla(
        "Bebidas",
        "Mezcal de la casa",
        "Espadín joven, Santiago Matatlán, 2 oz",
        140,
        (),
        (),
        "mezcal-de-la-casa",
    ),
    PlatilloSemilla(
        "Bebidas",
        "Cerveza artesanal",
        "Pregunte por la selección del mes",
        95,
        ("gluten",),
        (),
        None,
    ),
)


@dataclass(frozen=True)
class Resumen:
    restaurante_id: UUID
    platillos: int
    con_foto: int
    mesas: list[tuple[int, str]]  # (número, URL del QR)
    personal: int
    importacion_id: UUID
    firebase_uid: str


class EntornoNoPermitido(Exception):
    """La semilla borra filas: sólo en desarrollo (y en la base de pruebas)."""


class ArchivosFaltantes(Exception):
    """Falta un archivo de `tests/fixtures/` (la imagen Docker no los lleva): no se borra nada."""


ENTORNOS_PERMITIDOS = ("desarrollo", "pruebas")


def exigir_entorno() -> None:
    if settings.ENTORNO not in ENTORNOS_PERMITIDOS:
        raise EntornoNoPermitido(settings.ENTORNO)


def exigir_archivos() -> None:
    """Todo lo que `sembrar` lee, comprobado **antes** de borrar: si falta algo, la semilla
    anterior se queda en vez de borrarla y morir sin recrearla."""
    necesarios = [
        MENUS / "la-ceiba.pdf",
        MENUS / "la-ceiba.respuesta.json",
        *(FOTOS / f"{p.slug_foto}.jpg" for p in PLATILLOS if p.slug_foto),
    ]
    faltan = [f"{r.parent.name}/{r.name}" for r in necesarios if not r.is_file()]
    if faltan:
        raise ArchivosFaltantes(", ".join(faltan))


async def _claves_del_almacen(
    sesion: AsyncSession, almacen: assets.Almacen
) -> tuple[list[str], list[str]]:
    """(públicas, privadas) del restaurante semilla actual, leídas antes de borrar sus filas."""
    rid = select(Restaurante.id).where(Restaurante.slug == SLUG).scalar_subquery()
    prefijo = almacen.url_base + "/"
    publicas: list[str] = []
    privadas: list[str] = []
    filas = await sesion.execute(
        select(
            Platillo.foto_thumb_url, Platillo.foto_detalle_url, Platillo.foto_original_url
        ).where(Platillo.restaurante_id == rid)
    )
    for miniatura, detalle, original in filas:
        publicas += [u.removeprefix(prefijo) for u in (miniatura, detalle) if u]
        if original:
            privadas.append(original)
    privadas += list(
        await sesion.scalars(
            select(ImportacionMenu.archivo_url).where(ImportacionMenu.restaurante_id == rid)
        )
    )
    return sorted(set(publicas)), sorted(set(privadas))


async def _borrar_del_almacen(
    almacen: assets.Almacen, publicas: list[str], privadas: list[str]
) -> int:
    """Sin huérfanos entre corridas. Si el almacén falla, avisa y sigue: no bloquea la semilla.
    Devuelve cuántas claves no se pudieron borrar."""
    fallidas = 0
    for clave in publicas:
        try:
            await almacen.borrar_publico(clave)
        except (assets.ErrorAlmacen, ValueError):
            fallidas += 1
    for clave in privadas:
        try:
            await almacen.borrar_privado(clave)
        except (assets.ErrorAlmacen, ValueError):
            fallidas += 1
    if fallidas:
        print(
            f"Aviso: {fallidas} archivos del almacén anterior no se pudieron borrar.",
            file=sys.stderr,
        )
    return fallidas


async def borrar_semilla(sesion: AsyncSession, almacen: assets.Almacen) -> bool:
    """Borra **sólo** el restaurante `SLUG` y sus archivos del almacén. Es el único borrado
    físico del proyecto: `exigir_entorno` lo limita a desarrollo.

    Primero sus `sesion_grupal` (arrastran miembros, órdenes, ítems y comandas por cascada):
    `item_orden.platillo_id` es `ON DELETE RESTRICT`, así que con una sesión de la Fase 2 el
    `DELETE` del restaurante chocaría con sus propios ítems. Todo en una transacción; los
    archivos se borran después de confirmarla."""
    exigir_entorno()
    publicas, privadas = await _claves_del_almacen(sesion, almacen)
    rid = select(Restaurante.id).where(Restaurante.slug == SLUG).scalar_subquery()
    await sesion.execute(delete(SesionGrupal).where(SesionGrupal.restaurante_id == rid))
    resultado = await sesion.execute(delete(Restaurante).where(Restaurante.slug == SLUG))
    await sesion.commit()
    await _borrar_del_almacen(almacen, publicas, privadas)
    return bool(resultado.rowcount)  # type: ignore[attr-defined]


def borrador_de_ejemplo() -> ResultadoImportacion:
    """El borrador de `la-ceiba.pdf`: la respuesta grabada de la API (T-1.8), sin llamarla."""
    grabada: dict[str, Any] = json.loads((MENUS / "la-ceiba.respuesta.json").read_text("utf-8"))
    texto = next(b["text"] for b in grabada["content"] if b["type"] == "text")
    return ResultadoImportacion.model_validate_json(texto)


async def sembrar(sesion: AsyncSession, almacen: assets.Almacen) -> Resumen:
    """Borra y recrea el restaurante semilla con los servicios reales."""
    exigir_entorno()
    exigir_archivos()
    await borrar_semilla(sesion, almacen)

    usuario = await operadores.usuario_de_identidad(
        sesion, FIREBASE_UID_OPERADOR, PROVEEDOR_OPERADOR, NOMBRE_OPERADOR
    )
    restaurante = await operadores.crear_restaurante(
        sesion, usuario, {"nombre": NOMBRE, "slug": SLUG}
    )
    rid, uid = restaurante.id, usuario.id

    categorias = {n: (await menu.crear_categoria(sesion, rid, n)).id for n in CATEGORIAS}
    con_foto = 0
    for p in PLATILLOS:
        platillo = await menu.crear_platillo(
            sesion,
            rid,
            {
                "categoria_id": categorias[p.categoria],
                "nombre": p.nombre,
                "descripcion": p.descripcion,
                "precio": Decimal(p.precio),
                "alergenos": list(p.alergenos),
                "etiquetas": list(p.etiquetas),
                "destacado": p.destacado,
                "disponible": p.disponible,
            },
        )
        if p.slug_foto is not None:
            foto = (FOTOS / f"{p.slug_foto}.jpg").read_bytes()
            await assets.poner_foto(sesion, uid, platillo.id, rid, foto, almacen)
            con_foto += 1

    creadas = await mesas.crear_mesas(sesion, rid, MESAS, CAPACIDAD_MESA)
    for nombre, rol in PERSONAL:
        await personal.crear_personal(sesion, rid, nombre, rol, PIN_DESARROLLO)

    # La importación pasa por los servicios de T-1.9 hasta `pendiente`; el paso a `listo` es el
    # del procesador, que aquí no corre: se le da el borrador grabado en lugar de llamar a la API.
    importacion = await importaciones.crear_importacion(
        sesion, uid, rid, (MENUS / "la-ceiba.pdf").read_bytes(), almacen
    )
    ahora = datetime.now(UTC)
    importacion.estado = EstadoImportacion.listo
    importacion.resultado = borrador_de_ejemplo().model_dump(mode="json")
    importacion.modelo = "semilla"
    importacion.iniciado_en = importacion.finalizado_en = ahora
    await sesion.commit()

    return Resumen(
        restaurante_id=rid,
        platillos=len(PLATILLOS),
        con_foto=con_foto,
        mesas=[(m.numero, url_de_mesa(m.codigo_publico)) for m in creadas],
        personal=len(PERSONAL),
        importacion_id=importacion.id,
        firebase_uid=FIREBASE_UID_OPERADOR,
    )


async def conteos(sesion: AsyncSession) -> dict[str, int]:
    """Filas del restaurante semilla, para comprobar la idempotencia."""
    rid = select(Restaurante.id).where(Restaurante.slug == SLUG).scalar_subquery()
    resultado: dict[str, int] = {}
    for modelo in (Platillo, Mesa, PersonalRestaurante, ImportacionMenu):
        resultado[modelo.__tablename__] = int(
            await sesion.scalar(
                select(func.count()).select_from(modelo).where(modelo.restaurante_id == rid)
            )
            or 0
        )
    return resultado


def informe(resumen: Resumen) -> str:
    lineas = [
        f"Semilla lista: {NOMBRE} ({SLUG}), {resumen.platillos} platillos "
        f"({resumen.con_foto} con foto), {len(resumen.mesas)} mesas, {resumen.personal} personas "
        "del personal, 1 importación en estado «listo».",
        "",
        "Mesas (QR):",
        *(f"  mesa {n}: {url}" for n, url in resumen.mesas),
        "",
        f"Operador: firebase_uid {resumen.firebase_uid} (ver README, «Semilla de desarrollo»).",
        f"PIN del personal (sólo desarrollo): {PIN_DESARROLLO}",
    ]
    return "\n".join(lineas)


async def _correr() -> Resumen:
    # Importar la base aquí: así `main` se niega antes de crear el motor.
    from app.db.database import async_session, close_db

    try:
        async with async_session() as sesion:
            return await sembrar(sesion, assets.obtener_almacen())
    finally:
        await close_db()


def main() -> int:
    if settings.ENTORNO != "desarrollo":
        print(
            f"scripts/seed.py borra y recrea «{SLUG}»: sólo corre con ENTORNO=desarrollo "
            f"(ahora es «{settings.ENTORNO}»). No se tocó nada.",
            file=sys.stderr,
        )
        return CODIGO_SALIDA_ENTORNO
    try:
        exigir_archivos()
    except ArchivosFaltantes as error:
        print(f"Faltan archivos de la semilla ({error}). No se tocó nada.", file=sys.stderr)
        return 1
    try:
        resumen = asyncio.run(_correr())
    except IntegrityError as error:
        print(
            "No se pudo recrear el restaurante semilla: la base tiene datos que lo referencian "
            f"({type(error.orig).__name__}). Recrea la base de desarrollo.",
            file=sys.stderr,
        )
        return 1
    print(informe(resumen))
    return 0


if __name__ == "__main__":
    sys.exit(main())
