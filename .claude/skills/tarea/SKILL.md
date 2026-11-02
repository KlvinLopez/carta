---
name: tarea
description: Ejecuta una tarea del plan de Carta (T-x.y) de principio a fin — leer el brief, planear, implementar, verificar, calidad y commit con el ID. Úsala cuando el usuario diga "haz la tarea T-1.4", "/tarea T-0.1" o pida ejecutar una tarea del plan.
argument-hint: T-x.y
---

# /tarea $ARGUMENTS

Ejecuta **una** tarea de `docs/plan/04_Fases_y_Tareas.md`. Si `$ARGUMENTS` está vacío, pregunta cuál.

## 1. Leer (sin tocar código)

1. Encuentra el brief de `$ARGUMENTS` en `docs/plan/04_Fases_y_Tareas.md`. Si no existe, detente y dilo.
2. Lee `docs/plan/01_Alcance_v1.md` y las secciones de `02_Arquitectura_v1.md` y `03_Datos_v1.md` que el brief cite. Para criterios EARS, `docs/mvp/01_PRD.md` §7 y `01_Alcance_v1.md` §6. Para convenciones de API, `docs/mvp/04_API_Spec.md` §1.
3. Comprueba que las tareas de **Depende de** están hechas (`git log --oneline | grep "T-x.y"`). Si falta alguna, detente y dilo.
4. Comprueba que las carpetas que vas a tocar pertenecen al **carril** de la tarea (04 §2). Si necesitas tocar otra, anótalo para el PR.
5. Si el brief contradice un documento o el código real, **detente**, explica la contradicción y propón el cambio al documento. No improvises.

## 2. Planear

Entra en plan mode. Escribe el plan con: archivos que se crean o cambian, pruebas que se agregan (una por criterio de aceptación del brief), cómo se cumple el comando de **Verificar**, y qué no está en alcance. Pide aprobación.

## 3. Trabajar

- Rama `agente/$ARGUMENTS-<descripcion>` desde `master` (o el *worktree* que el usuario indique).
- Primero las pruebas del brief (que fallen), después la implementación.
- Para un paso aislado y bien definido, delega al subagente `implementador` con el fragmento del brief; para buscar en el repo, al `explorador`. Mantén tu contexto limpio.
- Respeta las reglas duras de `CLAUDE.md` (español en el dominio, servicios sin FastAPI, precio desde la base, `restaurante_id` del token, 404 para recursos ajenos).
- Frontend: sigue `/diseno-visual`.

## 4. Verificar

1. El comando **Verificar** del brief en verde.
2. `uv run ruff check . && uv run ruff format --check . && uv run mypy app && uv run pytest -q` en verde (y `npm --prefix frontend test` si tocaste frontend).
3. Lee tu diff como si fueras otra persona: ¿qué haría que CI lo rechazara? Arréglalo antes.

## 5. Cerrar

1. Commit: `$ARGUMENTS: <qué se construyó>` (sin mencionar modelos de IA en el mensaje).
2. Si el plan estaba mal, corrígelo en 04 y añade la fila en §11 en el mismo commit o en uno `docs:`.
3. Sugiere `/revisar` antes del PR y `/compound` antes de cerrar la sesión.
4. Resume al usuario en tres líneas: qué quedó, qué comando lo verifica, qué sigue.
