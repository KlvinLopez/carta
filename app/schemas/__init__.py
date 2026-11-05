"""Pydantic schemas for request/response validation."""

from app.schemas.base import (
    MesaBase,
    MesaCreate,
    MesaResponse,
    PlatilloBase,
    PlatilloCreate,
    PlatilloResponse,
    PlatilloUpdate,
    RestauranteBase,
    RestauranteCreate,
    RestauranteResponse,
    RestauranteUpdate,
    UsuarioBase,
    UsuarioCreate,
    UsuarioResponse,
)

__all__ = [
    "RestauranteBase",
    "RestauranteCreate",
    "RestauranteUpdate",
    "RestauranteResponse",
    "PlatilloBase",
    "PlatilloCreate",
    "PlatilloUpdate",
    "PlatilloResponse",
    "UsuarioBase",
    "UsuarioCreate",
    "UsuarioResponse",
    "MesaBase",
    "MesaCreate",
    "MesaResponse",
]
