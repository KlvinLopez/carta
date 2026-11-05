---
name: orquestar
description: Protocolo de la sesión maestra de Carta — elige la siguiente ola de tareas de docs/plan/04, crea una sesión hija por tarea (una por carril, máximo tres), las vigila, revisa e integra sus ramas en orden y actualiza el estado del plan. Úsala cuando el usuario pida coordinar varias tareas en paralelo, "sé la sesión maestra", o "/orquestar".
argument-hint: fase u ola (p. ej. "Fase 1" o "T-0.2 T-0.3")
---

# /orquestar $ARGUMENTS

La maestra **coordina, no implementa**. Si te descubres editando `app/` o `frontend/`, detente y crea una hija.

## 0. Antes de empezar

1. `git fetch origin && git log --oneline origin/master -15` y `docs/plan/README.md` §Estado: qué tareas ya están integradas (`git log --oneline | grep -o "T-[0-9]\.[0-9]*" | sort -u`).
2. Lee `docs/plan/04_Fases_y_Tareas.md` §2 (carriles) y §3 (olas). Elige la ola: las tareas cuyas dependencias ya están integradas, **una por carril, máximo tres a la vez**.
3. Confirma con el usuario la ola y el presupuesto (cada hija consume cuota; una tarea mediana son 2–4 h de agente). **No abras PRs sin permiso explícito** en esta misma conversación.

## 1. Lanzar una hija por tarea

Para cada tarea `T-x.y`, con `mcp__claude-code-remote__create_session` (mismo entorno; no uses `plan` como `permission_mode`, se quedaría esperando aprobación):

- `title`: `T-x.y · <título del brief>`
- `outcome_branch`: `agente/T-x.y-<descripcion-corta>`
- `prompt`:

```
/tarea T-x.y

Contexto de la maestra: trabajas en la rama agente/T-x.y-<descripcion>, creada desde <rama base>.
Tu carril es <letra> y sólo tocas sus carpetas (04 §2). Las tareas de las que dependes ya están
integradas en la rama base. Entorno: sin Docker; el hook de sesión deja PostgreSQL local listo y
exporta DATABASE_URL, DATABASE_URL_SYNC y TEST_DATABASE_URL (omite `docker compose up`).
Al terminar: comando de Verificar en verde, puerta de calidad en verde, commit con el ID, push a
tu rama. No abras PR. Si algo del brief contradice el código o un documento, no improvises:
cierra como BLOQUEADA. Termina SIEMPRE con /compound y el bloque:
RESULTADO: TERMINADA | BLOQUEADA | FALLIDA / Qué quedó / Qué lo verifica / Compound / Siguiente.
```

Hasta que el plan esté integrado en `master`, la rama base es `claude/gifted-allen-rqjiup` (`source_revision` en `create_session`). Guarda `session_id` ↔ tarea ↔ rama en una tabla en tu respuesta (es tu estado).

## 2. Vigilar

- Cada 20–30 min (o con `send_later` si está disponible): `get_session` para el estado y `list_events` con `kinds: ["assistant","result"]` para los últimos mensajes.
- Hija atascada (pide algo que el brief debía tener, o lleva > 1 h sin commits): mándale el contexto con `send_message`; si repite, `interrupt_session`, corrige el brief en 04 y relanza.
- Hija que termina: lee su último mensaje y toma la etiqueta `RESULTADO:` (sin etiqueta = BLOQUEADA). Comprueba que la rama existe en `origin`, que el último commit lleva el ID y que hubo `/compound` (commit `compound:` o la línea "sin lecciones nuevas").
- **BLOQUEADA:** lee la fila que dejó en 04 §11; resuelve tú (corrige el brief, aporta el contexto) o escala a Calvin con la pregunta exacta; relanza **en una sesión nueva**. **FALLIDA:** decide entre brief nuevo, dividir la tarea o ADR; nunca relances el mismo brief sin cambiarlo.

## 3. Revisar e integrar (en orden backend → frontend dentro de la ola)

Para cada rama terminada, en la maestra:
1. `git fetch origin agente/T-x.y-…` y `git diff origin/master...origin/agente/T-x.y-… --stat`.
2. `/revisar` y `/analizar T-x.y` sobre ese diff (haz checkout de la rama en un worktree aparte: `git worktree add ../carta-T-x.y origin/agente/T-x.y-…`).
3. Hallazgos bloqueantes → de vuelta a la hija con `send_message` (es su rama). Hallazgos menores → anótalos en el PR.
4. Con permiso del usuario: abre el PR con `.github/pull_request_template.md`, espera CI y `/code-review`, integra (*squash*) en el orden de dependencias. Si dos ramas chocan en `app/schemas/` o `frontend/src/compartido/`, integra primero la de backend y pide a la hija de frontend que haga `git merge origin/master`.
5. `archive_session` de la hija integrada. Una sesión hija nunca se reutiliza para otra tarea: la siguiente arranca limpia con la memoria ya actualizada.

## 4. Cerrar la ola

1. Actualiza `docs/plan/README.md` §Estado y, si una hija corrigió un brief, verifica que la fila esté en 04 §11.
2. `/compound` con lo aprendido **sobre orquestar** (briefs que faltaron contexto, choques de carriles, tiempos reales).
3. Reporte al usuario: tabla tarea · rama · estado · PR · tiempo · bloqueos, y la propuesta de la siguiente ola.

## Límites

- Nunca dos hijas en el mismo carril.
- Nunca `git push --force` ni push a `master`: todo entra por PR.
- Si el usuario lleva más de 4 h sin escribir, no abras olas nuevas: termina la actual y reporta.
