"""Comensal: `/api/v1/p/*`, cookie `carta_invitado` (ADR-003). Rutas desde la Fase 2."""

from fastapi import APIRouter

router = APIRouter(tags=["comensal"])

__all__ = ["router"]
