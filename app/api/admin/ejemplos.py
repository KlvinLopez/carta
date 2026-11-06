"""Rutas de la Fase 1 que todavía devuelven ejemplos (contrato primero, 04 §2).

Publican en `/openapi.json` la forma final de cada respuesta para que el frontend (carril C)
genere sus tipos y trabaje con datos simulados mientras el backend se construye. Cada tarea
sustituye sus rutas por las reales y las borra de aquí:

| Rutas | Tarea |
|---|---|
| categorías, `platillos/reordenar` | T-1.3 |
| `platillos/{id}/foto` | T-1.4 |
| mesas y `qr.pdf` | T-1.5 |
| personal y PIN | T-1.6 |
| importaciones | T-1.9 |

No leen ni escriben la base. Exigen el token del operador como todo `/admin` (T-1.2) y
`solo_desarrollo` las esconde (404) fuera de desarrollo y pruebas.
"""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, File, Response, UploadFile, status

from app.db.models import EstadoImportacion, RolPersonal, TipoImagen
from app.schemas.comun import Reordenar, errores
from app.schemas.importacion import (
    CategoriaImportada,
    ImportacionRespuesta,
    PlatilloImportado,
    ResultadoImportacion,
    VarianteImportada,
)
from app.schemas.menu import (
    CategoriaCambios,
    CategoriaCrear,
    CategoriaRespuesta,
    PlatilloRespuesta,
)
from app.schemas.mesa import MesaRespuesta, MesasCrear
from app.schemas.personal import PersonalCambios, PersonalCrear, PersonalRespuesta, PinNuevo

router = APIRouter()

# ---------------------------------------------------------------------------
# Datos de ejemplo (fijos: el frontend puede compararlos en sus pruebas)
# ---------------------------------------------------------------------------

MOMENTO = datetime(2026, 11, 6, 12, 0, tzinfo=UTC)
ID_CATEGORIA = UUID("00000000-0000-4000-8000-000000000101")
ID_PLATILLO = UUID("00000000-0000-4000-8000-000000000201")
ID_MESA = UUID("00000000-0000-4000-8000-000000000301")
ID_PERSONAL = UUID("00000000-0000-4000-8000-000000000401")
ID_IMPORTACION = UUID("00000000-0000-4000-8000-000000000501")
CODIGO_MESA = "Jx3k9QwLmN2pR7sT4vY8zA"
URL_EJEMPLO = "https://carta.cooking"

# Un PDF de una página en blanco: lo justo para que el navegador lo abra.
PDF_EJEMPLO = (
    b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 288 432]>>endobj\n"
    b"trailer<</Root 1 0 R>>\n%%EOF\n"
)


def _categoria(categoria_id: UUID = ID_CATEGORIA, **cambios: object) -> CategoriaRespuesta:
    datos: dict[str, object] = {
        "id": categoria_id,
        "nombre": "Entradas",
        "orden": 1,
        "activa": True,
    }
    datos.update({k: v for k, v in cambios.items() if v is not None})
    return CategoriaRespuesta.model_validate(datos)


def _platillo(platillo_id: UUID = ID_PLATILLO, **cambios: object) -> PlatilloRespuesta:
    datos: dict[str, object] = {
        "id": platillo_id,
        "categoria_id": ID_CATEGORIA,
        "nombre": "Guacamole de la casa",
        "descripcion": "Con totopos y queso fresco",
        "precio": Decimal("145.00"),
        "imagen_tipo": TipoImagen.ilustracion_categoria,
        "ilustracion_clave": "entradas",
        "alergenos": ["lacteos"],
        "etiquetas": ["vegetariano"],
        "nivel_picante": 1,
        "destacado": False,
        "orden": 1,
        "disponible": True,
        "activo": True,
        "creado_en": MOMENTO,
        "actualizado_en": MOMENTO,
    }
    datos.update(cambios)
    return PlatilloRespuesta.model_validate(datos)


def _mesa(mesa_id: UUID = ID_MESA, numero: int = 1, capacidad: int = 4) -> MesaRespuesta:
    return MesaRespuesta(
        id=mesa_id,
        numero=numero,
        codigo_publico=CODIGO_MESA,
        url_publica=f"{URL_EJEMPLO}/m/{CODIGO_MESA}",
        capacidad=capacidad,
        activa=True,
    )


def _personal(personal_id: UUID = ID_PERSONAL, **cambios: object) -> PersonalRespuesta:
    datos: dict[str, object] = {
        "id": personal_id,
        "nombre": "Ana",
        "rol": RolPersonal.mesero,
        "activo": True,
        "ultimo_acceso_en": None,
        "creado_en": MOMENTO,
    }
    datos.update({k: v for k, v in cambios.items() if v is not None})
    return PersonalRespuesta.model_validate(datos)


RESULTADO_EJEMPLO = ResultadoImportacion(
    moneda="MXN",
    categorias=[
        CategoriaImportada(
            nombre="Entradas",
            orden=1,
            platillos=[
                PlatilloImportado(
                    nombre="Guacamole de la casa",
                    descripcion="Con totopos y queso fresco",
                    precio=Decimal("145.00"),
                    precio_confianza="alta",
                    variantes=[
                        VarianteImportada(nombre="Para compartir", precio=Decimal("220.00"))
                    ],
                    alergenos_sugeridos=["lacteos"],
                    etiquetas_sugeridas=["vegetariano"],
                    pagina=1,
                )
            ],
        )
    ],
    avisos=["La página 3 parece ser la carta de vinos y se omitió."],
)


def _importacion(
    importacion_id: UUID = ID_IMPORTACION,
    estado: EstadoImportacion = EstadoImportacion.listo,
    resultado: ResultadoImportacion | None = RESULTADO_EJEMPLO,
) -> ImportacionRespuesta:
    terminada = estado in (EstadoImportacion.listo, EstadoImportacion.confirmado)
    return ImportacionRespuesta(
        id=importacion_id,
        estado=estado,
        archivo_tipo="application/pdf",
        paginas=3,
        intentos=1 if estado != EstadoImportacion.pendiente else 0,
        resultado=resultado if terminada else None,
        creado_en=MOMENTO,
        iniciado_en=MOMENTO if estado != EstadoImportacion.pendiente else None,
        finalizado_en=MOMENTO if terminada else None,
        confirmado_en=MOMENTO if estado == EstadoImportacion.confirmado else None,
    )


# ---------------------------------------------------------------------------
# Categorías y orden de platillos (T-1.3)
# ---------------------------------------------------------------------------


@router.get("/restaurantes/{rid}/categorias", response_model=list[CategoriaRespuesta])
async def listar_categorias(rid: UUID) -> list[CategoriaRespuesta]:
    return [_categoria()]


@router.post(
    "/restaurantes/{rid}/categorias",
    response_model=CategoriaRespuesta,
    status_code=status.HTTP_201_CREATED,
)
async def crear_categoria(rid: UUID, datos: CategoriaCrear) -> CategoriaRespuesta:
    return _categoria(nombre=datos.nombre)


@router.post("/restaurantes/{rid}/categorias/reordenar", response_model=list[CategoriaRespuesta])
async def reordenar_categorias(rid: UUID, datos: Reordenar) -> list[CategoriaRespuesta]:
    return [_categoria(i, orden=n) for n, i in enumerate(datos.ids, start=1)]


@router.patch("/categorias/{categoria_id}", response_model=CategoriaRespuesta)
async def editar_categoria(categoria_id: UUID, datos: CategoriaCambios) -> CategoriaRespuesta:
    return _categoria(categoria_id, nombre=datos.nombre, activa=datos.activa)


@router.delete("/categorias/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
async def desactivar_categoria(categoria_id: UUID) -> None:
    return None


@router.post("/restaurantes/{rid}/platillos/reordenar", response_model=list[PlatilloRespuesta])
async def reordenar_platillos(rid: UUID, datos: Reordenar) -> list[PlatilloRespuesta]:
    return [_platillo(i, orden=n) for n, i in enumerate(datos.ids, start=1)]


# ---------------------------------------------------------------------------
# Fotos (T-1.4)
# ---------------------------------------------------------------------------


@router.post(
    "/platillos/{platillo_id}/foto", response_model=PlatilloRespuesta, responses=errores(413, 415)
)
async def subir_foto(platillo_id: UUID, archivo: UploadFile = File(...)) -> PlatilloRespuesta:
    base = f"{URL_EJEMPLO}/img/platillos/{platillo_id}"
    return _platillo(
        platillo_id,
        imagen_tipo=TipoImagen.foto,
        foto_thumb_url=f"{base}-400.webp",
        foto_detalle_url=f"{base}-1200.webp",
    )


@router.delete("/platillos/{platillo_id}/foto", response_model=PlatilloRespuesta)
async def quitar_foto(platillo_id: UUID) -> PlatilloRespuesta:
    return _platillo(platillo_id)


# ---------------------------------------------------------------------------
# Mesas y QR (T-1.5)
# ---------------------------------------------------------------------------


@router.get("/restaurantes/{rid}/mesas", response_model=list[MesaRespuesta])
async def listar_mesas(rid: UUID) -> list[MesaRespuesta]:
    return [_mesa()]


@router.post(
    "/restaurantes/{rid}/mesas",
    response_model=list[MesaRespuesta],
    status_code=status.HTTP_201_CREATED,
)
async def crear_mesas(rid: UUID, datos: MesasCrear) -> list[MesaRespuesta]:
    return [
        _mesa(UUID(int=ID_MESA.int + n), numero=n, capacidad=datos.capacidad)
        for n in range(1, datos.cantidad + 1)
    ]


@router.post("/mesas/{mesa_id}/regenerar", response_model=MesaRespuesta)
async def regenerar_codigo(mesa_id: UUID) -> MesaRespuesta:
    return _mesa(mesa_id)


@router.get(
    "/restaurantes/{rid}/mesas/qr.pdf",
    response_class=Response,
    responses={200: {"content": {"application/pdf": {}}, "description": "Tarjetas con QR"}},
)
async def descargar_qr(rid: UUID) -> Response:
    return Response(content=PDF_EJEMPLO, media_type="application/pdf")


# ---------------------------------------------------------------------------
# Personal y PIN (T-1.6)
# ---------------------------------------------------------------------------


@router.get("/restaurantes/{rid}/personal", response_model=list[PersonalRespuesta])
async def listar_personal(rid: UUID) -> list[PersonalRespuesta]:
    return [_personal(), _personal(UUID(int=ID_PERSONAL.int + 1), nombre="Luis", rol="capitan")]


@router.post(
    "/restaurantes/{rid}/personal",
    response_model=PersonalRespuesta,
    status_code=status.HTTP_201_CREATED,
)
async def crear_personal(rid: UUID, datos: PersonalCrear) -> PersonalRespuesta:
    return _personal(nombre=datos.nombre, rol=datos.rol)


@router.patch("/personal/{personal_id}", response_model=PersonalRespuesta)
async def editar_personal(personal_id: UUID, datos: PersonalCambios) -> PersonalRespuesta:
    return _personal(personal_id, nombre=datos.nombre, rol=datos.rol, activo=datos.activo)


@router.post("/personal/{personal_id}/pin", status_code=status.HTTP_204_NO_CONTENT)
async def cambiar_pin(personal_id: UUID, datos: PinNuevo) -> None:
    return None


# ---------------------------------------------------------------------------
# Importación de PDF (T-1.9)
# ---------------------------------------------------------------------------


@router.post(
    "/restaurantes/{rid}/importaciones",
    response_model=ImportacionRespuesta,
    status_code=status.HTTP_202_ACCEPTED,
    responses=errores(413, 415),
)
async def crear_importacion(rid: UUID, archivo: UploadFile = File(...)) -> ImportacionRespuesta:
    return _importacion(estado=EstadoImportacion.pendiente)


@router.get(
    "/restaurantes/{rid}/importaciones/{importacion_id}", response_model=ImportacionRespuesta
)
async def consultar_importacion(rid: UUID, importacion_id: UUID) -> ImportacionRespuesta:
    return _importacion(importacion_id)


@router.post(
    "/restaurantes/{rid}/importaciones/{importacion_id}/confirmar",
    response_model=ImportacionRespuesta,
    responses=errores(409),  # ya confirmada (T-1.9: confirmar dos veces → 409)
)
async def confirmar_importacion(
    rid: UUID, importacion_id: UUID, revisado: ResultadoImportacion
) -> ImportacionRespuesta:
    return _importacion(importacion_id, EstadoImportacion.confirmado, revisado)


@router.post(
    "/restaurantes/{rid}/importaciones/{importacion_id}/reintentar",
    response_model=ImportacionRespuesta,
    status_code=status.HTTP_202_ACCEPTED,
    responses=errores(409),  # sólo una importación `fallido` se reintenta
)
async def reintentar_importacion(rid: UUID, importacion_id: UUID) -> ImportacionRespuesta:
    return _importacion(importacion_id, EstadoImportacion.pendiente)
