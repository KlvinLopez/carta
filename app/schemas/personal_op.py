"""Personal (mesero y capitán) y el dueño desde su panel: piso, comandas, ciclo, entrada y
correcciones (`/api/v1/op` y `/api/v1/admin/restaurantes/{rid}/...`; contrato de T-3.0).

Las acciones sobre una mesa llevan la **sesión que el personal está viendo** (`sesion_id` en
el cuerpo) y responden 409 `SESION_NO_VIGENTE` si ya no es la viva (ADR-017 punto 11): un
mesero con la pantalla vieja no limpia la mesa del grupo siguiente. Toda acción pasa por el
punto único de permisos (T-3.13); sin permiso, 404 como cualquier ruta del rol (AC-36.3).
**No existe ruta para editar permisos** en la v1 (AC-36.7), ni para cobrar, repartir o
reportar propinas (AC-37.9), ni para capturar descuentos (AC-37.11).
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, StrictBool, StringConstraints

from app.schemas.ciclo import (
    CuentaComensal,
    EstadoMesa,
    MarcaTiempo,
    SolicitudOp,
)
from app.schemas.comun import Entrada, Esquema, Precio
from app.schemas.orden import EstadoComanda
from app.schemas.sesion import ColorAvatar

RolPersonal = Literal["mesero", "capitan"]
# Spec 001 §5 (fija en la v1). El dueño los tiene todos.
Permiso = Literal[
    "cerrar_cuenta_comensal",
    "cerrar_cuentas_mesa",
    "validar_pago",
    "mesa_limpia",
    "reabrir",
    "cancelar_item",
    "pasar_cuenta",
    "quitar_comensal",
    "resolver_solicitud",
    "cambiar_entrada",
    "liberar_con_cargos",
    "regenerar_codigo",
    "marcar_agotado",
    "editar_orden",
    "cambiar_permisos_meseros",
]
Pin = Annotated[str, StringConstraints(pattern=r"^[0-9]{4,6}$")]


# --- Entrar con PIN (T-3.4) -------------------------------------------------------------


class PersonaParaEntrar(Esquema):
    id: UUID
    nombre: str = Field(examples=["Marisol"])


class PersonalDelRestaurante(Esquema):
    """`GET /op/personal/{slug}`: los nombres activos para la pantalla de entrada (sin PIN)."""

    restaurante_nombre: str = Field(examples=["La Ceiba"])
    personas: list[PersonaParaEntrar]


class EntrarPersonal(Entrada):
    """`POST /op/entrar`: también sirve para **cambiar de persona** en una tablet compartida
    (AC-39.4): la cookie nueva sustituye a la anterior y cada acción queda a su nombre."""

    slug: str = Field(min_length=1, max_length=100, examples=["la-ceiba"])
    personal_id: UUID
    pin: Pin = Field(examples=["1234"])


class PersonaOp(Esquema):
    id: UUID
    nombre: str = Field(examples=["Marisol"])
    rol: RolPersonal


class RestauranteOp(Esquema):
    id: UUID
    nombre: str = Field(examples=["La Ceiba"])
    slug: str = Field(examples=["la-ceiba"])


class SesionPersonal(Esquema):
    """Quién está operando y qué puede hacer (las opciones sin permiso no se muestran)."""

    persona: PersonaOp | None = Field(
        description="`null` cuando opera el dueño desde su panel (sin PIN, AC-36.6)."
    )
    restaurante: RestauranteOp
    permisos: list[Permiso]


# --- Piso: mesas, comandas, llamadas (T-3.4, T-3.12) -------------------------------------


class AjustesEstatus(Esquema):
    """Umbrales por restaurante: el teléfono calcula el color y el recordatorio con la hora de
    la última acción (ADR-018 punto 4.4; AC-30.6, AC-30.7)."""

    amarillo_min: int = Field(examples=[20])
    rojo_min: int = Field(examples=[40])
    recordatorio_min: int = Field(examples=[30])


class ComandaResumenOp(Esquema):
    id: UUID
    secuencia: int = Field(ge=1)
    estado: EstadoComanda
    creada_en: datetime


class MesaOp(Esquema):
    """Una mesa en la lista del personal. `sesion_id` es la sesión viva (la que se manda al
    actuar); `null` con la mesa libre."""

    id: UUID
    numero: int = Field(examples=[7])
    capacidad: int = Field(examples=[4])
    estado: EstadoMesa
    sesion_id: UUID | None = None
    abierta_en: datetime | None = Field(default=None, description="Primer escaneo (AC-29.1).")
    ultima_accion_en: datetime | None = Field(
        default=None, description="Para el estatus verde, amarillo y rojo del teléfono."
    )
    comensales: int = Field(ge=0, default=0)
    listos: int = Field(ge=0, default=0)
    entrada_cerrada: bool = False
    solicitudes_pendientes: int = Field(ge=0, default=0)
    avisos_pagado: int = Field(ge=0, default=0, description="Cuentas con «ya pagué».")
    llamadas_pendientes: int = Field(ge=0, default=0)
    ultima_comanda: ComandaResumenOp | None = None


class MesasOp(Esquema):
    """`GET /op/mesas` (y `GET /admin/restaurantes/{rid}/mesas-vivo`), con `ETag`."""

    yo: SesionPersonal
    ajustes: AjustesEstatus
    mesas: list[MesaOp]


class ItemComandaOp(Esquema):
    item_id: UUID
    nombre: str = Field(examples=["Enchiladas suizas"])
    cantidad: int = Field(ge=1)
    notas: str | None = None
    estado: Literal["vigente", "cancelado_personal"] = "vigente"


class ComensalEnComanda(Esquema):
    miembro_id: UUID
    alias: str = Field(examples=["Ana"])
    items: list[ItemComandaOp]


class ComandaOp(Esquema):
    """Una comanda para el personal, por comensal (US-13)."""

    id: UUID
    mesa_id: UUID
    mesa_numero: int = Field(examples=[7])
    sesion_id: UUID
    secuencia: int = Field(ge=1)
    estado: EstadoComanda
    creada_en: datetime
    atendida_en: datetime | None = None
    servida_en: datetime | None = None
    atendida_por: str | None = Field(default=None, examples=["Marisol"])
    total_estimado: Precio
    num_comensales: int = Field(ge=1)
    por_comensal: list[ComensalEnComanda]


class LlamadaOp(Esquema):
    id: UUID
    mesa_id: UUID
    mesa_numero: int = Field(examples=[7])
    motivo: str = Field(examples=["atencion"])
    creada_en: datetime
    atendida_en: datetime | None = None


class ComandasOp(Esquema):
    """`GET /op/comandas`, con `ETag`."""

    comandas: list[ComandaOp]
    llamadas: list[LlamadaOp]


class MiembroOp(Esquema):
    """Un comensal visto por el personal. Dos con el mismo alias se distinguen por color y
    `numero_alias` («Ana ●1», «Ana ●2», AC-31.9)."""

    id: UUID
    alias: str = Field(examples=["Ana"])
    color_avatar: ColorAvatar
    numero_alias: int | None = Field(default=None, ge=1, examples=[1])
    cuenta: CuentaComensal


class MesaDetalleOp(Esquema):
    """`GET /op/mesas/{mesa_id}` y la respuesta de toda acción sobre la mesa."""

    mesa: MesaOp
    miembros: list[MiembroOp]
    comandas: list[ComandaOp]
    llamadas: list[LlamadaOp]
    solicitudes: list[SolicitudOp]
    historial: list[MarcaTiempo] = Field(description="Pasos del ciclo con hora y autor (US-35).")


class PlatilloOp(Esquema):
    """Búsqueda rápida de «Agotado» (US-27)."""

    id: UUID
    nombre: str = Field(examples=["Pozole rojo"])
    categoria: str | None = Field(default=None, examples=["Platos fuertes"])
    disponible: bool
    no_disponible_desde: datetime | None = None
    no_disponible_por: str | None = Field(default=None, examples=["Marisol"])


class DisponibleCuerpo(Entrada):
    disponible: StrictBool


class ResumenTurno(Esquema):
    """`GET /op/resumen` (capitán): el turno de hoy (US-26)."""

    desde: datetime
    comandas: int = Field(ge=0)
    comandas_servidas: int = Field(ge=0)
    mesas_atendidas: int = Field(ge=0)
    llamadas: int = Field(ge=0)
    atencion_media_s: int | None = Field(
        default=None, description="De `creada_en` a `atendida_en`."
    )


# --- Cuerpos de las acciones sobre una mesa (T-3.11, T-3.7) ------------------------------


class SobreSesion(Entrada):
    """La sesión que el personal está viendo; 409 `SESION_NO_VIGENTE` si ya no es la viva."""

    sesion_id: UUID


class EntradaMesa(SobreSesion):
    """Cerrar o abrir la entrada de la mesa (AC-33.1, AC-33.5)."""

    cerrada: StrictBool


class LiberarMesa(SobreSesion):
    """Liberar la mesa. `con_cargos` exige el permiso `liberar_con_cargos` y la deja
    «liberada sin pago verificado» (AC-29.12); sin cargos la libera cualquiera."""

    con_cargos: StrictBool = False


class PasarCuenta(SobreSesion):
    """Pasar todos los cargos de un comensal a otro, sin aceptación (AC-31.7)."""

    destino_miembro_id: UUID
