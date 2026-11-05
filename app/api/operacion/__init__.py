"""Personal (mesero y capitán): `/api/v1/op/*`, cookie `carta_personal` (ADR-013). Fase 3."""

from fastapi import APIRouter

router = APIRouter(tags=["personal"])

__all__ = ["router"]
