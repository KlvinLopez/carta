## Tarea

`T-x.y` — <título del brief en `docs/plan/04_Fases_y_Tareas.md`> (o `Spec NNN` si es una feature nueva)

## Qué cambia

<Dos o tres frases. Qué puede hacer alguien ahora que antes no.>

## Compuerta de especificación

- [ ] El comando de **Verificar** del brief pasa: `<comando>`
- [ ] Puerta de calidad en verde: `uv run ruff check . && uv run ruff format --check . && uv run mypy app && uv run pytest -q` (+ `npm --prefix frontend test` si toca frontend)
- [ ] Cada criterio del brief tiene prueba con `@pytest.mark.ac(...)` o paso manual: `uv run python scripts/verificar_trazabilidad.py --tarea T-x.y --estricto`
- [ ] `/revisar` hecho; hallazgos bloqueantes resueltos (los menores, abajo)
- [ ] `/analizar T-x.y` hecho: nada fuera de la spec, contrato al día
- [ ] Si la tarea toca `app/api/` o `app/schemas/`: `/openapi.json` actualizado y `npm run tipos` sin cambios pendientes
- [ ] Si toca pantallas: captura adjunta y checklist de `/diseno-visual`
- [ ] Si el plan estaba mal: 04 corregido y fila en §11
- [ ] Sin secretos, sin `create_all`, sin FastAPI en `app/services/`

## Hallazgos menores anotados

- …

## Cómo probarlo a mano

1. …
