"""Modelos SQLAlchemy de Carta v1.

Fuente de verdad del esquema: `docs/plan/03_Datos_v1.md` (y el DDL de agosto en
`docs/mvp/03_Data_Model.md` §3 para comanda, comanda_orden, llamada_mesero,
operador_restaurante y evento_analitica). Las migraciones `0001_base_v1` y
`0002_consistencia_inquilino` (INV-10) crean exactamente este esquema;
`tests/unit/test_modelos.py` comprueba que ambos coinciden.

Convenciones:
- Dominio en español (ADR-008). Tipos enumerados de PostgreSQL con el mismo nombre que en el DDL.
- `id` UUID generado en la base (`gen_random_uuid()`, nativo desde PostgreSQL 13) y también
  en el cliente, para poder usar el id antes del `flush`.
- Sin borrado físico de entidades con historial: `activo = false` (regla dura 9).
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

# ---------------------------------------------------------------------------
# Tipos enumerados (CREATE TYPE ... AS ENUM en la migración)
# ---------------------------------------------------------------------------


class RolPersonal(enum.StrEnum):
    mesero = "mesero"
    capitan = "capitan"


class EstadoImportacion(enum.StrEnum):
    pendiente = "pendiente"
    procesando = "procesando"
    listo = "listo"
    confirmado = "confirmado"
    fallido = "fallido"


class TipoImagen(enum.StrEnum):
    foto = "foto"
    ilustracion_categoria = "ilustracion_categoria"
    ilustracion_generada = "ilustracion_generada"


class EstadoComanda(enum.StrEnum):
    abierta = "abierta"
    atendida = "atendida"
    servida = "servida"
    cancelada = "cancelada"


class RolOperador(enum.StrEnum):
    propietario = "propietario"
    gerente = "gerente"
    carta_ops = "carta_ops"


def _enum_pg(tipo: type[enum.StrEnum], nombre: str) -> Enum:
    """Enum de PostgreSQL que guarda los *valores* del StrEnum, no los nombres de sus miembros."""
    return Enum(tipo, name=nombre, values_callable=lambda e: [m.value for m in e])


# Estados que siguen siendo VARCHAR con CHECK (como en el esquema de Fase 1).
ESTADOS_SESION = ("activa", "lista_para_enviar", "cerrada", "cancelada")
ESTADOS_ORDEN = ("armando", "confirmada", "enviada", "cerrada")
TIPOS_EVENTO = (
    "scan",
    "menu_view",
    "dish_view",
    "search",
    "filter",
    "item_add",
    "item_remove",
    "order_confirm",
    "order_unconfirm",
    "session_ready",
    "waiter_call",
    "staff_attend",
    "staff_serve",
    "dish_sold_out",
)


def _lista_sql(valores: tuple[str, ...]) -> str:
    return ", ".join(f"'{v}'" for v in valores)


# ---------------------------------------------------------------------------
# Columnas repetidas
# ---------------------------------------------------------------------------


def _id_uuid() -> Mapped[uuid.UUID]:
    return mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )


def _fk_uuid(destino: str, *, ondelete: str, nullable: bool = False) -> Mapped[Any]:
    return mapped_column(
        UUID(as_uuid=True), ForeignKey(destino, ondelete=ondelete), nullable=nullable
    )


def _uuid_nulo() -> Mapped[Any]:
    """Columna UUID nula cuya llave foránea es compuesta (en `__table_args__`)."""
    return mapped_column(UUID(as_uuid=True), nullable=True)


def _fk_inquilino(columna: str, padre: str, *, ondelete: str) -> ForeignKeyConstraint:
    """INV-10: `(columna, restaurante_id) → padre(id, restaurante_id)`.

    El nombre es el de la FK simple que sustituye (`fk_<tabla>_<columna>`, por convención).
    `SET NULL` lleva la lista de columnas de PostgreSQL 15+ para no anular `restaurante_id`.
    """
    accion = f"SET NULL ({columna})" if ondelete == "SET NULL" else ondelete
    return ForeignKeyConstraint(
        [columna, "restaurante_id"], [f"{padre}.id", f"{padre}.restaurante_id"], ondelete=accion
    )


def _unico_con_restaurante() -> UniqueConstraint:
    """`UNIQUE (id, restaurante_id)`: destino de las FK compuestas de INV-10."""
    return UniqueConstraint("id", "restaurante_id")


def _marca_tiempo(*, nullable: bool = False, al_actualizar: bool = False) -> Mapped[Any]:
    if nullable:
        return mapped_column(DateTime(timezone=True), nullable=True)
    return mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now() if al_actualizar else None,
    )


# ---------------------------------------------------------------------------
# Catálogo
# ---------------------------------------------------------------------------


class Restaurante(Base):
    __tablename__ = "restaurante"

    id: Mapped[uuid.UUID] = _id_uuid()
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    direccion: Mapped[str | None] = mapped_column(Text)
    telefono: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(200))
    logo_url: Mapped[str | None] = mapped_column(String(500))
    tema: Mapped[str] = mapped_column(
        String(20), nullable=False, default="vino", server_default="vino"
    )
    plan: Mapped[str] = mapped_column(
        String(20), nullable=False, default="gratis", server_default="gratis"
    )
    horarios: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    activo: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    creado_en: Mapped[datetime] = _marca_tiempo()
    actualizado_en: Mapped[datetime] = _marca_tiempo(al_actualizar=True)

    categorias: Mapped[list[CategoriaMenu]] = relationship(back_populates="restaurante")
    platillos: Mapped[list[Platillo]] = relationship(back_populates="restaurante")
    mesas: Mapped[list[Mesa]] = relationship(back_populates="restaurante")
    personal: Mapped[list[PersonalRestaurante]] = relationship(back_populates="restaurante")
    operadores: Mapped[list[OperadorRestaurante]] = relationship(back_populates="restaurante")
    importaciones: Mapped[list[ImportacionMenu]] = relationship(back_populates="restaurante")

    __table_args__ = (
        CheckConstraint(
            "tema IN ('vino', 'verde', 'azul', 'ocre', 'cafe')", name="ck_restaurante_tema"
        ),
        CheckConstraint("plan IN ('gratis', 'pro', 'enterprise')", name="ck_restaurante_plan"),
        CheckConstraint("slug <> ''", name="ck_restaurante_slug"),
        Index("idx_restaurante_activo", "activo", postgresql_where=text("activo")),
    )


class CategoriaMenu(Base):
    __tablename__ = "categoria_menu"

    id: Mapped[uuid.UUID] = _id_uuid()
    restaurante_id: Mapped[uuid.UUID] = _fk_uuid("restaurante.id", ondelete="CASCADE")
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    orden: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    activa: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )

    restaurante: Mapped[Restaurante] = relationship(back_populates="categorias")
    platillos: Mapped[list[Platillo]] = relationship(
        back_populates="categoria",
        primaryjoin="CategoriaMenu.id == foreign(Platillo.categoria_id)",
    )

    __table_args__ = (
        _unico_con_restaurante(),
        # Regla dura 9: la baja es lógica, así que el nombre sólo es único entre las activas.
        Index(
            "uq_categoria_activa_por_nombre",
            "restaurante_id",
            text("lower(btrim(nombre))"),
            unique=True,
            postgresql_where=text("activa"),
        ),
        Index("idx_categoria_restaurante", "restaurante_id"),
    )


class PersonalRestaurante(Base):
    """Mesero o capitán; entra con PIN. El PIN nunca se guarda en claro (regla dura 11)."""

    __tablename__ = "personal_restaurante"

    id: Mapped[uuid.UUID] = _id_uuid()
    restaurante_id: Mapped[uuid.UUID] = _fk_uuid("restaurante.id", ondelete="CASCADE")
    nombre: Mapped[str] = mapped_column(String(60), nullable=False)
    rol: Mapped[RolPersonal] = mapped_column(
        _enum_pg(RolPersonal, "rol_personal"),
        nullable=False,
        default=RolPersonal.mesero,
        server_default=RolPersonal.mesero.value,
    )
    pin_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    activo: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    intentos_fallidos: Mapped[int] = mapped_column(
        SmallInteger, nullable=False, default=0, server_default="0"
    )
    bloqueado_hasta: Mapped[datetime | None] = _marca_tiempo(nullable=True)
    ultimo_acceso_en: Mapped[datetime | None] = _marca_tiempo(nullable=True)
    creado_en: Mapped[datetime] = _marca_tiempo()
    actualizado_en: Mapped[datetime] = _marca_tiempo(al_actualizar=True)

    restaurante: Mapped[Restaurante] = relationship(back_populates="personal")

    __table_args__ = (
        _unico_con_restaurante(),
        CheckConstraint("length(btrim(nombre)) > 0", name="ck_personal_nombre"),
        CheckConstraint("intentos_fallidos >= 0", name="ck_personal_intentos"),
        # INV-7 verificable en la base: sólo entra un hash Argon2id, nunca el PIN.
        CheckConstraint("pin_hash LIKE '$argon2id$%'", name="ck_personal_pin_hash"),
        # Regla dura 9: se puede recontratar a "Ana" después de darla de baja.
        Index(
            "uq_personal_activo_por_nombre",
            "restaurante_id",
            text("lower(btrim(nombre))"),
            unique=True,
            postgresql_where=text("activo"),
        ),
        Index("idx_personal_restaurante", "restaurante_id"),
    )


class Platillo(Base):
    __tablename__ = "platillo"

    id: Mapped[uuid.UUID] = _id_uuid()
    restaurante_id: Mapped[uuid.UUID] = _fk_uuid("restaurante.id", ondelete="CASCADE")
    categoria_id: Mapped[uuid.UUID | None] = _uuid_nulo()
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text)
    precio: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    # Imagen: foto (recomendada) → ilustración por categoría → generada (v1.1). ADR-011.
    foto_url: Mapped[str | None] = mapped_column(String(500))
    foto_thumb_url: Mapped[str | None] = mapped_column(String(500))
    foto_detalle_url: Mapped[str | None] = mapped_column(String(500))
    foto_original_url: Mapped[str | None] = mapped_column(String(500))
    imagen_tipo: Mapped[TipoImagen] = mapped_column(
        _enum_pg(TipoImagen, "imagen_tipo"),
        nullable=False,
        default=TipoImagen.ilustracion_categoria,
        server_default=TipoImagen.ilustracion_categoria.value,
    )
    ilustracion_clave: Mapped[str | None] = mapped_column(String(40))
    alergenos: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    etiquetas: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    calorias: Mapped[int | None] = mapped_column(Integer)
    nivel_picante: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    destacado: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    orden: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    # Disponibilidad en vivo (la marca el personal); distinta de `activo` (lo decide el operador).
    disponible: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    no_disponible_desde: Mapped[datetime | None] = _marca_tiempo(nullable=True)
    no_disponible_por: Mapped[uuid.UUID | None] = _uuid_nulo()
    activo: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    creado_en: Mapped[datetime] = _marca_tiempo()
    actualizado_en: Mapped[datetime] = _marca_tiempo(al_actualizar=True)

    restaurante: Mapped[Restaurante] = relationship(back_populates="platillos")
    categoria: Mapped[CategoriaMenu | None] = relationship(
        back_populates="platillos",
        primaryjoin="foreign(Platillo.categoria_id) == CategoriaMenu.id",
    )

    __table_args__ = (
        _unico_con_restaurante(),
        _fk_inquilino("categoria_id", "categoria_menu", ondelete="SET NULL"),
        _fk_inquilino("no_disponible_por", "personal_restaurante", ondelete="SET NULL"),
        CheckConstraint("precio >= 0", name="ck_platillo_precio"),
        CheckConstraint("nivel_picante BETWEEN 0 AND 5", name="ck_platillo_nivel_picante"),
        CheckConstraint("jsonb_typeof(alergenos) = 'array'", name="ck_platillo_alergenos_lista"),
        CheckConstraint("jsonb_typeof(etiquetas) = 'array'", name="ck_platillo_etiquetas_lista"),
        Index("idx_platillo_restaurante", "restaurante_id"),
        Index("idx_platillo_no_disponible_por", "no_disponible_por"),
        Index("idx_platillo_categoria_orden", "categoria_id", "orden"),
        Index("idx_platillo_activo", "restaurante_id", "activo", postgresql_where=text("activo")),
        Index("idx_platillo_alergenos", "alergenos", postgresql_using="gin"),
        Index("idx_platillo_etiquetas", "etiquetas", postgresql_using="gin"),
    )


# ---------------------------------------------------------------------------
# Mesa y sesión
# ---------------------------------------------------------------------------


class Mesa(Base):
    __tablename__ = "mesa"

    id: Mapped[uuid.UUID] = _id_uuid()
    restaurante_id: Mapped[uuid.UUID] = _fk_uuid("restaurante.id", ondelete="CASCADE")
    numero: Mapped[int] = mapped_column(Integer, nullable=False)
    # Código del QR: ≥ 22 caracteres (≥ 128 bits de entropía), revocable.
    codigo_publico: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    codigo_revocado_en: Mapped[datetime | None] = _marca_tiempo(nullable=True)
    nfc_id: Mapped[str | None] = mapped_column(String(100))
    capacidad: Mapped[int] = mapped_column(Integer, nullable=False, default=4, server_default="4")
    activa: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )

    restaurante: Mapped[Restaurante] = relationship(back_populates="mesas")
    sesiones: Mapped[list[SesionGrupal]] = relationship(
        back_populates="mesa", primaryjoin="Mesa.id == foreign(SesionGrupal.mesa_id)"
    )

    __table_args__ = (
        _unico_con_restaurante(),
        CheckConstraint("length(codigo_publico) >= 22", name="ck_codigo_largo"),
        CheckConstraint("capacidad > 0", name="ck_mesa_capacidad"),
        # Regla dura 9: el número sólo es único entre las mesas activas.
        Index(
            "uq_mesa_activa_por_numero",
            "restaurante_id",
            "numero",
            unique=True,
            postgresql_where=text("activa"),
        ),
        Index("idx_mesa_restaurante", "restaurante_id"),
    )


class Usuario(Base):
    """Cuenta de operador (Firebase). En la v1 el comensal no tiene cuenta."""

    __tablename__ = "usuario"

    id: Mapped[uuid.UUID] = _id_uuid()
    firebase_uid: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    provider: Mapped[str] = mapped_column(String(20), nullable=False)
    nombre_display: Mapped[str | None] = mapped_column(String(100))
    plan: Mapped[str] = mapped_column(
        String(20), nullable=False, default="gratis", server_default="gratis"
    )
    creado_en: Mapped[datetime] = _marca_tiempo()
    ultimo_login: Mapped[datetime] = _marca_tiempo()

    operaciones: Mapped[list[OperadorRestaurante]] = relationship(back_populates="usuario")

    __table_args__ = (
        CheckConstraint("provider IN ('google', 'email_link')", name="ck_usuario_provider"),
        CheckConstraint("plan IN ('gratis', 'premium')", name="ck_usuario_plan"),
    )


class SesionGrupal(Base):
    __tablename__ = "sesion_grupal"

    id: Mapped[uuid.UUID] = _id_uuid()
    mesa_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    restaurante_id: Mapped[uuid.UUID] = _fk_uuid("restaurante.id", ondelete="CASCADE")
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, default="activa", server_default="activa"
    )
    inicio: Mapped[datetime] = _marca_tiempo()
    fin: Mapped[datetime | None] = _marca_tiempo(nullable=True)
    ultima_actividad_en: Mapped[datetime] = _marca_tiempo()
    cerrada_por_personal_id: Mapped[uuid.UUID | None] = _uuid_nulo()

    mesa: Mapped[Mesa] = relationship(
        back_populates="sesiones", primaryjoin="foreign(SesionGrupal.mesa_id) == Mesa.id"
    )
    miembros: Mapped[list[MiembroSesion]] = relationship(back_populates="sesion")
    ordenes: Mapped[list[OrdenPersonal]] = relationship(back_populates="sesion")
    comandas: Mapped[list[Comanda]] = relationship(
        back_populates="sesion", primaryjoin="SesionGrupal.id == foreign(Comanda.sesion_id)"
    )

    __table_args__ = (
        _unico_con_restaurante(),
        _fk_inquilino("mesa_id", "mesa", ondelete="CASCADE"),
        _fk_inquilino("cerrada_por_personal_id", "personal_restaurante", ondelete="SET NULL"),
        CheckConstraint(
            f"estado IN ({_lista_sql(ESTADOS_SESION)})", name="ck_sesion_grupal_estado"
        ),
        Index("idx_sesion_mesa", "mesa_id"),
        Index("idx_sesion_restaurante", "restaurante_id"),
        Index("idx_sesion_cerrada_por", "cerrada_por_personal_id"),
        # INV-1: una sesión viva por mesa.
        Index(
            "uq_sesion_viva_por_mesa",
            "mesa_id",
            unique=True,
            postgresql_where=text("estado IN ('activa', 'lista_para_enviar')"),
        ),
    )


class MiembroSesion(Base):
    """Comensal anónimo dentro de una sesión. `usuario_id` siempre nulo en la v1."""

    __tablename__ = "miembro_sesion"

    id: Mapped[uuid.UUID] = _id_uuid()
    sesion_id: Mapped[uuid.UUID] = _fk_uuid("sesion_grupal.id", ondelete="CASCADE")
    usuario_id: Mapped[uuid.UUID | None] = _fk_uuid(
        "usuario.id", ondelete="SET NULL", nullable=True
    )
    rol: Mapped[str] = mapped_column(
        String(20), nullable=False, default="miembro", server_default="miembro"
    )
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, default="activo", server_default="activo"
    )
    alias: Mapped[str | None] = mapped_column(String(24))
    color_avatar: Mapped[str | None] = mapped_column(String(7))
    unido_en: Mapped[datetime] = _marca_tiempo()

    sesion: Mapped[SesionGrupal] = relationship(back_populates="miembros")
    ordenes: Mapped[list[OrdenPersonal]] = relationship(back_populates="miembro")

    __table_args__ = (
        CheckConstraint("rol IN ('host', 'miembro')", name="ck_miembro_sesion_rol"),
        CheckConstraint("estado IN ('activo', 'desconectado')", name="ck_miembro_sesion_estado"),
        CheckConstraint(
            "color_avatar IS NULL OR color_avatar ~ '^#[0-9A-Fa-f]{6}$'",
            name="ck_miembro_sesion_color",
        ),
        Index("idx_miembro_sesion", "sesion_id"),
        Index("idx_miembro_usuario", "usuario_id"),
    )


# ---------------------------------------------------------------------------
# Orden y comanda
# ---------------------------------------------------------------------------


class OrdenPersonal(Base):
    __tablename__ = "orden_personal"

    id: Mapped[uuid.UUID] = _id_uuid()
    sesion_id: Mapped[uuid.UUID] = _fk_uuid("sesion_grupal.id", ondelete="CASCADE")
    miembro_id: Mapped[uuid.UUID] = _fk_uuid("miembro_sesion.id", ondelete="CASCADE")
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, default="armando", server_default="armando"
    )
    total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=0, server_default="0"
    )
    # INV-3: al confirmar, `bloqueada = true` y el trigger rechaza cambios en sus ítems.
    bloqueada: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    creada_en: Mapped[datetime] = _marca_tiempo()
    confirmada_en: Mapped[datetime | None] = _marca_tiempo(nullable=True)

    sesion: Mapped[SesionGrupal] = relationship(back_populates="ordenes")
    miembro: Mapped[MiembroSesion] = relationship(back_populates="ordenes")
    items: Mapped[list[ItemOrden]] = relationship(back_populates="orden")

    __table_args__ = (
        CheckConstraint(
            f"estado IN ({_lista_sql(ESTADOS_ORDEN)})", name="ck_orden_personal_estado"
        ),
        # INV-3: `bloqueada` sigue al estado; no se puede confirmar sin bloquear.
        CheckConstraint("bloqueada = (estado <> 'armando')", name="ck_orden_bloqueada_coherente"),
        Index("idx_orden_sesion", "sesion_id"),
        Index("idx_orden_miembro", "miembro_id"),
        # INV-2: una orden viva por miembro.
        Index(
            "uq_orden_viva_por_miembro",
            "miembro_id",
            unique=True,
            postgresql_where=text("estado IN ('armando', 'confirmada')"),
        ),
    )


class ItemOrden(Base):
    """Ítem de una orden. El precio se lee de la base al agregar y se congela (regla dura 4)."""

    __tablename__ = "item_orden"

    id: Mapped[uuid.UUID] = _id_uuid()
    orden_id: Mapped[uuid.UUID] = _fk_uuid("orden_personal.id", ondelete="CASCADE")
    platillo_id: Mapped[uuid.UUID] = _fk_uuid("platillo.id", ondelete="RESTRICT")
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    notas: Mapped[str | None] = mapped_column(Text)
    precio_unitario: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    orden: Mapped[OrdenPersonal] = relationship(back_populates="items")
    platillo: Mapped[Platillo] = relationship()

    __table_args__ = (
        CheckConstraint("cantidad > 0", name="ck_item_orden_cantidad"),
        CheckConstraint(
            "notas IS NULL OR length(notas) <= 140", name="ck_item_orden_notas"
        ),  # AC-10.1
        CheckConstraint("precio_unitario >= 0", name="ck_item_orden_precio"),
        CheckConstraint("subtotal >= 0", name="ck_item_orden_subtotal"),
        Index("idx_item_orden", "orden_id"),
        Index("idx_item_platillo", "platillo_id"),
    )


class Comanda(Base):
    """Pedido de la mesa enviado al personal: abierta → atendida → servida (o cancelada)."""

    __tablename__ = "comanda"

    id: Mapped[uuid.UUID] = _id_uuid()
    restaurante_id: Mapped[uuid.UUID] = _fk_uuid("restaurante.id", ondelete="CASCADE")
    mesa_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    sesion_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    secuencia: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    estado: Mapped[EstadoComanda] = mapped_column(
        _enum_pg(EstadoComanda, "estado_comanda"),
        nullable=False,
        default=EstadoComanda.abierta,
        server_default=EstadoComanda.abierta.value,
    )
    total_estimado: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=0, server_default="0"
    )
    num_comensales: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default="1"
    )
    creada_en: Mapped[datetime] = _marca_tiempo()
    atendida_en: Mapped[datetime | None] = _marca_tiempo(nullable=True)
    servida_en: Mapped[datetime | None] = _marca_tiempo(nullable=True)
    atendida_por_personal_id: Mapped[uuid.UUID | None] = _uuid_nulo()
    nota_cancelacion: Mapped[str | None] = mapped_column(Text)

    sesion: Mapped[SesionGrupal] = relationship(
        back_populates="comandas", primaryjoin="foreign(Comanda.sesion_id) == SesionGrupal.id"
    )
    ordenes: Mapped[list[OrdenPersonal]] = relationship(secondary="comanda_orden", viewonly=True)

    __table_args__ = (
        _fk_inquilino("sesion_id", "sesion_grupal", ondelete="CASCADE"),
        _fk_inquilino("mesa_id", "mesa", ondelete="CASCADE"),
        _fk_inquilino("atendida_por_personal_id", "personal_restaurante", ondelete="SET NULL"),
        UniqueConstraint("sesion_id", "secuencia"),
        # INV-6: el estado terminal exige su marca de tiempo.
        CheckConstraint(
            "(estado = 'abierta' AND atendida_en IS NULL AND servida_en IS NULL) OR "
            "(estado = 'atendida' AND atendida_en IS NOT NULL AND servida_en IS NULL) OR "
            "(estado = 'servida' AND atendida_en IS NOT NULL AND servida_en >= atendida_en) OR "
            "(estado = 'cancelada')",
            name="ck_comanda_terminal",
        ),
        Index("idx_comanda_restaurante", "restaurante_id"),
        Index("idx_comanda_atendida_por", "atendida_por_personal_id"),
        Index(
            "idx_comanda_abierta",
            "restaurante_id",
            "creada_en",
            postgresql_where=text("estado IN ('abierta', 'atendida')"),
        ),
        Index("idx_comanda_mesa", "mesa_id", "creada_en"),
    )


class ComandaOrden(Base):
    """Órdenes personales incluidas en una comanda (INV-8: sólo de la misma sesión, trigger)."""

    __tablename__ = "comanda_orden"

    comanda_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("comanda.id", ondelete="CASCADE"), primary_key=True
    )
    orden_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orden_personal.id", ondelete="CASCADE"), primary_key=True
    )

    # Una orden personal se cobra en una sola comanda (INV-8 ampliada).
    __table_args__ = (UniqueConstraint("orden_id"),)


class LlamadaMesero(Base):
    __tablename__ = "llamada_mesero"

    id: Mapped[uuid.UUID] = _id_uuid()
    restaurante_id: Mapped[uuid.UUID] = _fk_uuid("restaurante.id", ondelete="CASCADE")
    mesa_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    sesion_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    miembro_id: Mapped[uuid.UUID | None] = _fk_uuid(
        "miembro_sesion.id", ondelete="SET NULL", nullable=True
    )
    motivo: Mapped[str] = mapped_column(
        String(40), nullable=False, default="atencion", server_default="atencion"
    )
    atendida_en: Mapped[datetime | None] = _marca_tiempo(nullable=True)
    atendida_por_personal_id: Mapped[uuid.UUID | None] = _uuid_nulo()
    creada_en: Mapped[datetime] = _marca_tiempo()

    __table_args__ = (
        _fk_inquilino("sesion_id", "sesion_grupal", ondelete="CASCADE"),
        _fk_inquilino("mesa_id", "mesa", ondelete="CASCADE"),
        _fk_inquilino("atendida_por_personal_id", "personal_restaurante", ondelete="SET NULL"),
        Index("idx_llamada_restaurante", "restaurante_id"),
        Index("idx_llamada_mesa", "mesa_id"),
        Index("idx_llamada_sesion", "sesion_id"),
        Index("idx_llamada_miembro", "miembro_id"),
        Index("idx_llamada_atendida_por", "atendida_por_personal_id"),
        Index(
            "idx_llamada_pendiente",
            "restaurante_id",
            "creada_en",
            postgresql_where=text("atendida_en IS NULL"),
        ),
    )


# ---------------------------------------------------------------------------
# Acceso del operador e importación
# ---------------------------------------------------------------------------


class OperadorRestaurante(Base):
    __tablename__ = "operador_restaurante"

    id: Mapped[uuid.UUID] = _id_uuid()
    usuario_id: Mapped[uuid.UUID] = _fk_uuid("usuario.id", ondelete="CASCADE")
    restaurante_id: Mapped[uuid.UUID] = _fk_uuid("restaurante.id", ondelete="CASCADE")
    rol: Mapped[RolOperador] = mapped_column(
        _enum_pg(RolOperador, "rol_operador"),
        nullable=False,
        default=RolOperador.gerente,
        server_default=RolOperador.gerente.value,
    )
    activo: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    creado_en: Mapped[datetime] = _marca_tiempo()

    usuario: Mapped[Usuario] = relationship(back_populates="operaciones")
    restaurante: Mapped[Restaurante] = relationship(back_populates="operadores")

    __table_args__ = (
        UniqueConstraint("usuario_id", "restaurante_id"),
        Index("idx_operador_usuario", "usuario_id", postgresql_where=text("activo")),
        Index("idx_operador_restaurante", "restaurante_id"),
    )


class ImportacionMenu(Base):
    """PDF convertido en borrador de menú. Nada entra al menú sin confirmación (INV-9)."""

    __tablename__ = "importacion_menu"

    id: Mapped[uuid.UUID] = _id_uuid()
    restaurante_id: Mapped[uuid.UUID] = _fk_uuid("restaurante.id", ondelete="CASCADE")
    solicitado_por: Mapped[uuid.UUID] = _fk_uuid("usuario.id", ondelete="RESTRICT")
    archivo_url: Mapped[str] = mapped_column(String(500), nullable=False)
    archivo_tipo: Mapped[str] = mapped_column(String(40), nullable=False)
    paginas: Mapped[int | None] = mapped_column(SmallInteger)
    estado: Mapped[EstadoImportacion] = mapped_column(
        _enum_pg(EstadoImportacion, "estado_importacion"),
        nullable=False,
        default=EstadoImportacion.pendiente,
        server_default=EstadoImportacion.pendiente.value,
    )
    modelo: Mapped[str | None] = mapped_column(String(60))
    resultado: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    tokens_entrada: Mapped[int | None] = mapped_column(Integer)
    tokens_salida: Mapped[int | None] = mapped_column(Integer)
    intentos: Mapped[int] = mapped_column(
        SmallInteger, nullable=False, default=0, server_default="0"
    )
    error_mensaje: Mapped[str | None] = mapped_column(Text)
    iniciado_en: Mapped[datetime | None] = _marca_tiempo(nullable=True)
    finalizado_en: Mapped[datetime | None] = _marca_tiempo(nullable=True)
    confirmado_en: Mapped[datetime | None] = _marca_tiempo(nullable=True)
    creado_en: Mapped[datetime] = _marca_tiempo()

    restaurante: Mapped[Restaurante] = relationship(back_populates="importaciones")

    __table_args__ = (
        CheckConstraint("intentos BETWEEN 0 AND 3", name="ck_importacion_intentos"),
        # INV-9 en la base: confirmado exige marca de tiempo y borrador.
        CheckConstraint(
            "estado <> 'confirmado' OR (confirmado_en IS NOT NULL AND resultado IS NOT NULL)",
            name="ck_importacion_confirmada",
        ),
        Index("idx_importacion_cola", "creado_en", postgresql_where=text("estado = 'pendiente'")),
        Index("idx_importacion_solicitado_por", "solicitado_por"),
        Index("idx_importacion_restaurante", "restaurante_id", "creado_en"),
    )


# ---------------------------------------------------------------------------
# Soporte y analítica
# ---------------------------------------------------------------------------


class ClaveIdempotencia(Base):
    """Respuesta guardada por `Idempotency-Key` (sustituye a Redis). Se purga a las 24 h."""

    __tablename__ = "clave_idempotencia"

    ambito: Mapped[str] = mapped_column(String(80), primary_key=True)
    clave: Mapped[str] = mapped_column(String(80), primary_key=True)
    estado_http: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    respuesta: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    creada_en: Mapped[datetime] = _marca_tiempo()

    __table_args__ = (
        CheckConstraint("ambito <> ''", name="ck_idempotencia_ambito"),
        Index("idx_idempotencia_purga", "creada_en"),
    )


class EventoAnalitica(Base):
    """Eventos del piloto. Sin IP en claro ni user agent completo (regla dura 10)."""

    __tablename__ = "evento_analitica"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    restaurante_id: Mapped[uuid.UUID] = _fk_uuid("restaurante.id", ondelete="CASCADE")
    mesa_id: Mapped[uuid.UUID | None] = _fk_uuid("mesa.id", ondelete="SET NULL", nullable=True)
    sesion_id: Mapped[uuid.UUID | None] = _fk_uuid(
        "sesion_grupal.id", ondelete="SET NULL", nullable=True
    )
    miembro_id: Mapped[uuid.UUID | None] = _fk_uuid(
        "miembro_sesion.id", ondelete="SET NULL", nullable=True
    )
    platillo_id: Mapped[uuid.UUID | None] = _fk_uuid(
        "platillo.id", ondelete="SET NULL", nullable=True
    )
    tipo: Mapped[str] = mapped_column(String(40), nullable=False)
    propiedades: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    ip_hash: Mapped[str | None] = mapped_column(String(64))
    user_agent_fam: Mapped[str | None] = mapped_column(String(60))
    ocurrido_en: Mapped[datetime] = _marca_tiempo()

    __table_args__ = (
        CheckConstraint(f"tipo IN ({_lista_sql(TIPOS_EVENTO)})", name="ck_tipo_evento"),
        Index("idx_evento_restaurante_fecha", "restaurante_id", "ocurrido_en"),
        Index("idx_evento_tipo", "tipo", "ocurrido_en"),
        Index("idx_evento_sesion", "sesion_id"),
        Index("idx_evento_mesa", "mesa_id"),
        Index("idx_evento_miembro", "miembro_id"),
        Index("idx_evento_platillo", "platillo_id"),
    )
