"""SQLAlchemy database models for Carta (Fase 1)."""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    DateTime,
    Numeric,
    Text,
    ForeignKey,
    JSON,
    UniqueConstraint,
    Index,
    func,
    event,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base


class Restaurante(Base):
    """Restaurant entity with branding and subscription info."""

    __tablename__ = "restaurante"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(200), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    direccion = Column(Text)
    telefono = Column(String(20))
    email = Column(String(200))
    logo_url = Column(String(500))
    tema = Column(
        String(20),
        nullable=False,
        default="vino",
        comment="vino|verde|azul|ocre|cafe",
    )
    plan = Column(
        String(20),
        nullable=False,
        default="gratis",
        comment="gratis|pro|enterprise",
    )
    horarios = Column(JSON, default={})
    activo = Column(Boolean, default=True, nullable=False)
    creado_en = Column(DateTime(timezone=True), nullable=False, default=func.now())
    actualizado_en = Column(
        DateTime(timezone=True), nullable=False, default=func.now(), onupdate=func.now()
    )

    # Relationships
    categorias = relationship(
        "CategoriaMenu", back_populates="restaurante", cascade="all, delete-orphan"
    )
    platillos = relationship(
        "Platillo", back_populates="restaurante", cascade="all, delete-orphan"
    )
    mesas = relationship(
        "Mesa", back_populates="restaurante", cascade="all, delete-orphan"
    )
    sesiones = relationship(
        "SesionGrupal", back_populates="restaurante", cascade="all, delete-orphan"
    )
    escaneos = relationship(
        "Escaneo", back_populates="restaurante", cascade="all, delete-orphan"
    )
    anuncios = relationship(
        "AdRestaurante", back_populates="restaurante", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_restaurante_slug", "slug"),
        Index("idx_restaurante_activo", "activo", postgresql_where=activo == True),
    )


class CategoriaMenu(Base):
    """Menu category (e.g., Entradas, Platos Fuertes, Postres)."""

    __tablename__ = "categoria_menu"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    restaurante_id = Column(
        UUID(as_uuid=True), ForeignKey("restaurante.id", ondelete="CASCADE"),
        nullable=False
    )
    nombre = Column(String(100), nullable=False)
    orden = Column(Integer, default=0, nullable=False)
    activa = Column(Boolean, default=True, nullable=False)

    # Relationships
    restaurante = relationship("Restaurante", back_populates="categorias")
    platillos = relationship(
        "Platillo", back_populates="categoria", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("restaurante_id", "nombre"),
        Index("idx_categoria_restaurante", "restaurante_id"),
    )


class Platillo(Base):
    """Individual dish/menu item."""

    __tablename__ = "platillo"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    restaurante_id = Column(
        UUID(as_uuid=True), ForeignKey("restaurante.id", ondelete="CASCADE"),
        nullable=False
    )
    categoria_id = Column(
        UUID(as_uuid=True),
        ForeignKey("categoria_menu.id", ondelete="SET NULL"),
        nullable=True,
    )
    nombre = Column(String(200), nullable=False)
    descripcion = Column(Text)
    precio = Column(Numeric(10, 2), nullable=False)
    foto_url = Column(String(500))
    modelo_3d_url = Column(String(500))
    alergenos = Column(JSON, default=[])  # Array of allergen strings
    etiquetas = Column(JSON, default=[])  # Tags like "vegano", "picante", etc
    calorias = Column(Integer)
    nivel_picante = Column(
        Integer, default=0, comment="0-5 scale"
    )  # 0-5 spice level
    destacado = Column(Boolean, default=False, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    creado_en = Column(DateTime(timezone=True), nullable=False, default=func.now())
    actualizado_en = Column(
        DateTime(timezone=True), nullable=False, default=func.now(), onupdate=func.now()
    )

    # Relationships
    restaurante = relationship("Restaurante", back_populates="platillos")
    categoria = relationship("CategoriaMenu", back_populates="platillos")
    items_orden = relationship(
        "ItemOrden", back_populates="platillo", cascade="all, delete-orphan"
    )
    vistas = relationship(
        "VistaPlatillo", back_populates="platillo", cascade="all, delete-orphan"
    )
    anuncios = relationship(
        "AdRestaurante", back_populates="platillo", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_platillo_restaurante", "restaurante_id"),
        Index("idx_platillo_categoria", "categoria_id"),
        Index(
            "idx_platillo_activo",
            "restaurante_id",
            "activo",
            postgresql_where=activo == True,
        ),
        Index("idx_platillo_alergenos", "alergenos", postgresql_using="gin"),
        Index("idx_platillo_etiquetas", "etiquetas", postgresql_using="gin"),
    )


class Mesa(Base):
    """Physical table with QR code and NFC identification."""

    __tablename__ = "mesa"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    restaurante_id = Column(
        UUID(as_uuid=True), ForeignKey("restaurante.id", ondelete="CASCADE"),
        nullable=False
    )
    numero = Column(Integer, nullable=False)
    qr_code = Column(String(100), unique=True, nullable=False)
    nfc_id = Column(String(100))
    capacidad = Column(Integer, default=4)
    activa = Column(Boolean, default=True, nullable=False)

    # Relationships
    restaurante = relationship("Restaurante", back_populates="mesas")
    sesiones = relationship(
        "SesionGrupal", back_populates="mesa", cascade="all, delete-orphan"
    )
    escaneos = relationship(
        "Escaneo", back_populates="mesa", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("restaurante_id", "numero"),
        Index("idx_mesa_qr", "qr_code"),
        Index("idx_mesa_restaurante", "restaurante_id"),
    )


class Usuario(Base):
    """User with Firebase authentication and dietary preferences."""

    __tablename__ = "usuario"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    firebase_uid = Column(String(128), unique=True, nullable=False)
    provider = Column(String(20), nullable=False, comment="google|apple")
    nombre_display = Column(String(100))
    plan = Column(
        String(20),
        nullable=False,
        default="gratis",
        comment="gratis|premium",
    )
    perfil_alimentario = Column(JSON, default={})  # Allergies, diet, preferences
    creado_en = Column(DateTime(timezone=True), nullable=False, default=func.now())
    ultimo_login = Column(DateTime(timezone=True), nullable=False, default=func.now())

    # Relationships
    miembros_sesion = relationship(
        "MiembroSesion", back_populates="usuario", cascade="all, delete-orphan"
    )
    escaneos = relationship(
        "Escaneo", back_populates="usuario", cascade="all, delete-orphan"
    )
    vistas = relationship(
        "VistaPlatillo", back_populates="usuario", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_usuario_firebase", "firebase_uid"),
        Index("idx_usuario_plan", "plan"),
    )


class SesionGrupal(Base):
    """Group dining session at a table."""

    __tablename__ = "sesion_grupal"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mesa_id = Column(
        UUID(as_uuid=True), ForeignKey("mesa.id", ondelete="CASCADE"), nullable=False
    )
    restaurante_id = Column(
        UUID(as_uuid=True), ForeignKey("restaurante.id", ondelete="CASCADE"),
        nullable=False
    )
    estado = Column(
        String(20),
        nullable=False,
        default="activa",
        comment="activa|cerrada|cancelada",
    )
    inicio = Column(DateTime(timezone=True), nullable=False, default=func.now())
    fin = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    mesa = relationship("Mesa", back_populates="sesiones")
    restaurante = relationship("Restaurante", back_populates="sesiones")
    miembros = relationship(
        "MiembroSesion", back_populates="sesion", cascade="all, delete-orphan"
    )
    ordenes = relationship(
        "OrdenPersonal", back_populates="sesion", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_sesion_mesa", "mesa_id"),
        Index(
            "idx_sesion_activa",
            "mesa_id",
            "estado",
            postgresql_where=estado == "activa",
        ),
        Index("idx_sesion_restaurante", "restaurante_id"),
    )


class MiembroSesion(Base):
    """Individual member within a group session."""

    __tablename__ = "miembro_sesion"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sesion_id = Column(
        UUID(as_uuid=True), ForeignKey("sesion_grupal.id", ondelete="CASCADE"),
        nullable=False
    )
    usuario_id = Column(
        UUID(as_uuid=True),
        ForeignKey("usuario.id", ondelete="SET NULL"),
        nullable=True,
    )
    rol = Column(
        String(20),
        nullable=False,
        default="miembro",
        comment="host|miembro",
    )
    estado = Column(
        String(20),
        nullable=False,
        default="activo",
        comment="activo|desconectado",
    )
    unido_en = Column(DateTime(timezone=True), nullable=False, default=func.now())

    # Relationships
    sesion = relationship("SesionGrupal", back_populates="miembros")
    usuario = relationship("Usuario", back_populates="miembros_sesion")
    ordenes = relationship(
        "OrdenPersonal", back_populates="miembro", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_miembro_sesion", "sesion_id"),
        Index("idx_miembro_usuario", "usuario_id"),
    )


class OrdenPersonal(Base):
    """Individual's order within a group session."""

    __tablename__ = "orden_personal"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sesion_id = Column(
        UUID(as_uuid=True), ForeignKey("sesion_grupal.id", ondelete="CASCADE"),
        nullable=False
    )
    miembro_id = Column(
        UUID(as_uuid=True), ForeignKey("miembro_sesion.id", ondelete="CASCADE"),
        nullable=False
    )
    estado = Column(
        String(20),
        nullable=False,
        default="armando",
        comment="armando|confirmada|enviada|cerrada",
    )
    total = Column(Numeric(10, 2), default=0)
    creada_en = Column(DateTime(timezone=True), nullable=False, default=func.now())
    confirmada_en = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    sesion = relationship("SesionGrupal", back_populates="ordenes")
    miembro = relationship("MiembroSesion", back_populates="ordenes")
    items = relationship(
        "ItemOrden", back_populates="orden", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_orden_sesion", "sesion_id"),
        Index("idx_orden_miembro", "miembro_id"),
    )


class ItemOrden(Base):
    """Individual dish item within an order."""

    __tablename__ = "item_orden"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    orden_id = Column(
        UUID(as_uuid=True), ForeignKey("orden_personal.id", ondelete="CASCADE"),
        nullable=False
    )
    platillo_id = Column(
        UUID(as_uuid=True), ForeignKey("platillo.id", ondelete="CASCADE"),
        nullable=False
    )
    cantidad = Column(Integer, nullable=False, default=1)
    notas = Column(Text)  # e.g., "sin cebolla", "extra picante"
    precio_unitario = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)

    # Relationships
    orden = relationship("OrdenPersonal", back_populates="items")
    platillo = relationship("Platillo", back_populates="items_orden")

    __table_args__ = (
        Index("idx_item_orden", "orden_id"),
        Index("idx_item_platillo", "platillo_id"),
    )


class Escaneo(Base):
    """QR scan event for analytics."""

    __tablename__ = "escaneo"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mesa_id = Column(
        UUID(as_uuid=True), ForeignKey("mesa.id", ondelete="CASCADE"), nullable=False
    )
    restaurante_id = Column(
        UUID(as_uuid=True), ForeignKey("restaurante.id", ondelete="CASCADE"),
        nullable=False
    )
    usuario_id = Column(
        UUID(as_uuid=True),
        ForeignKey("usuario.id", ondelete="SET NULL"),
        nullable=True,
    )
    user_agent = Column(String(500))
    ip_hash = Column(String(64))  # Hash only, not actual IP
    timestamp = Column(DateTime(timezone=True), nullable=False, default=func.now())

    # Relationships
    mesa = relationship("Mesa", back_populates="escaneos")
    restaurante = relationship("Restaurante", back_populates="escaneos")
    usuario = relationship("Usuario", back_populates="escaneos")
    vistas = relationship(
        "VistaPlatillo", back_populates="escaneo", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_escaneo_restaurante", "restaurante_id"),
        Index("idx_escaneo_mesa", "mesa_id"),
        Index("idx_escaneo_timestamp", "restaurante_id", "timestamp"),
    )


class VistaPlatillo(Base):
    """Individual dish view tracking for analytics."""

    __tablename__ = "vista_platillo"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    platillo_id = Column(
        UUID(as_uuid=True), ForeignKey("platillo.id", ondelete="CASCADE"),
        nullable=False
    )
    escaneo_id = Column(
        UUID(as_uuid=True),
        ForeignKey("escaneo.id", ondelete="SET NULL"),
        nullable=True,
    )
    usuario_id = Column(
        UUID(as_uuid=True),
        ForeignKey("usuario.id", ondelete="SET NULL"),
        nullable=True,
    )
    duracion_ms = Column(Integer)
    abrio_3d = Column(Boolean, default=False)
    abrio_detalle = Column(Boolean, default=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=func.now())

    # Relationships
    platillo = relationship("Platillo", back_populates="vistas")
    escaneo = relationship("Escaneo", back_populates="vistas")
    usuario = relationship("Usuario", back_populates="vistas")

    __table_args__ = (
        Index("idx_vista_platillo", "platillo_id"),
        Index("idx_vista_timestamp", "platillo_id", "timestamp"),
    )


class AdRestaurante(Base):
    """Restaurant promotions and ads."""

    __tablename__ = "ad_restaurante"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    restaurante_id = Column(
        UUID(as_uuid=True), ForeignKey("restaurante.id", ondelete="CASCADE"),
        nullable=False
    )
    platillo_id = Column(
        UUID(as_uuid=True), ForeignKey("platillo.id", ondelete="CASCADE"),
        nullable=False
    )
    tipo = Column(
        String(20),
        nullable=False,
        comment="destacar|2x1|descuento|combo",
    )
    estado = Column(
        String(20),
        nullable=False,
        default="activa",
        comment="activa|pausada|terminada",
    )
    presupuesto_diario = Column(Numeric(10, 2))
    gastado_total = Column(Numeric(10, 2), default=0)
    clicks = Column(Integer, default=0)
    ordenes_extra = Column(Integer, default=0)
    inicio = Column(DateTime(timezone=True), nullable=False)
    fin = Column(DateTime(timezone=True), nullable=True)
    creado_en = Column(DateTime(timezone=True), nullable=False, default=func.now())

    # Relationships
    restaurante = relationship("Restaurante", back_populates="anuncios")
    platillo = relationship("Platillo", back_populates="anuncios")

    __table_args__ = (
        Index("idx_ad_restaurante", "restaurante_id"),
        Index(
            "idx_ad_activa",
            "restaurante_id",
            "estado",
            postgresql_where=estado == "activa",
        ),
    )
