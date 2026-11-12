# Especificaciones de features fuera del plan

Aquí viven las specs de lo que **no está** en `docs/plan/04_Fases_y_Tareas.md`: features nuevas, cambios de alcance o briefs que resultaron ambiguos y hubo que especificar de nuevo. Se escriben con `/especificar` **antes** de planear y de tocar código (`docs/plan/07_Spec_Driven.md` §2.2).

| Spec | Nombre | Estado | Entró al plan como |
|---|---|---|---|
| [001](001-ciclo-de-la-mesa/spec.md) | Ciclo de vida de la mesa y del comensal | borrador (v4, final) | — (propuesta: T-3.0, T-3.8, T-3.10 a T-3.13, T-3.15, T-3.16, T-3.18 y T-3.19, Fase 3) |

Convenciones:
- Carpeta `NNN-nombre-en-espanol/` con `spec.md` (numeración consecutiva desde `001`).
- Los criterios usan IDs `AC-NN.y` con un número de historia nuevo (`US-NN`, continúa después de US-28) para que `scripts/verificar_trazabilidad.py` los rastree cuando entren al plan.
- Una spec aprobada no se edita para cambiar su sentido: se escribe otra que la sustituye y se enlaza.
