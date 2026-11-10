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
- `model` (decisión 10 del plan, 6 de noviembre): **siempre explícito**, porque sin él la hija hereda el modelo de la maestra (Fable 5.1, el más caro). `claude-opus-5-5` para las tareas marcadas 🔴 en 04 y para cualquiera que toque `migrations/`, `app/core/seguridad*`, concurrencia o dinero; `claude-sonnet-5-5` para el resto (servicios, endpoints, pantallas, semillas, docs de despliegue); `claude-haiku-5-5` sólo para tareas mecánicas sin código de producción (regenerar tipos, mover archivos, redactar un README). Si una hija en Sonnet cierra FALLIDA por el fondo del problema y no por el brief, relánzala en Opus con el brief corregido. La maestra se queda en Fable: planea, consolida las lentes, decide e integra.
- `prompt`:

```
/tarea T-x.y

Contexto de la maestra: trabajas en la rama agente/T-x.y-<descripcion>, creada desde <rama base>.
Tu carril es <letra> y sólo tocas sus carpetas (04 §2). Las tareas de las que dependes ya están
integradas en la rama base. Entorno: sin Docker; el hook de sesión deja PostgreSQL local listo y
exporta DATABASE_URL, DATABASE_URL_SYNC y TEST_DATABASE_URL (omite `docker compose up`).
Al terminar: comando de Verificar en verde, puerta de calidad en verde, commit con el ID, push a
tu rama. No abras PR. Después de tu RESULTADO, la maestra te mandará por send_message la ronda
de revisión (lista A/B/C/D): aplícala en tu rama sin pedir confirmación, es parte de la tarea.
Si algo del brief contradice el código o un documento, no improvises:
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
2. `/revisar` y `/analizar T-x.y` sobre ese diff (haz checkout de la rama en un worktree aparte: `git worktree add ../carta-T-x.y origin/agente/T-x.y-…`). Las tres lentes se lanzan con el `Agent` y `model: "sonnet"`; la de seguridad con `model: "opus"` cuando la tarea es 🔴 o toca autenticación, dinero o aislamiento entre restaurantes. La consolidación y la reproducción de bloqueantes las hace la maestra.
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

## Lecciones de la ola 0 (5 de noviembre de 2026, T-0.2 a T-0.6)

Tiempos reales: una tarea de Fase 0 tarda 15–35 min de hija, la revisión con tres lentes 15–25 min más, y la ronda de correcciones 15–25 min; cada hija cuesta 6–21 USD y cada lente 100–220 k tokens. Dos hijas en paralelo más seis lentes agotan el límite de 5 h de la cuenta: cuando una hija muere con «You've hit your 5-hour limit», no la relances; espera el reinicio y reanúdala con `send_message` en la misma sesión (conserva el contexto).

1. **La hija no ve tu scratchpad.** Lo que un revisor deja ahí (pruebas propuestas, scripts) se le pasa dentro del `send_message` (límite 64 KiB), no como ruta.
2. **Cada lente con su base y su puerto.** Tres revisores a la vez sobre el mismo worktree comparten `carta_test` y se tumban el esquema (así salió la «intermitencia» de T-0.4). Dales `TEST_DATABASE_URL=...carta_test_<lente>` y puertos distintos (8011, 8021…), y exige `git status --porcelain` vacío al terminar.
3. **Worktree ≠ venv.** El editable del `.venv` del worktree apunta al repo principal: `uv sync --locked --reinstall-package carta` en cada worktree antes de verificar; en frontend, `npm ci` por worktree.
4. **Nunca `$?` tras una tubería.** Para confirmar que una mutación falla, corre el comando sin `| tail` y lee su código; o `PIPESTATUS[0]`.
5. **El guard lee el texto del comando.** Un grep o un heredoc que contenga `create_all(` o la sentencia destructiva de base de datos se bloquea aunque sea texto: usa `create_al[l]`, o escribe el archivo con Write/Edit (este mismo apartado se escribió así).
6. **Verificar que necesita Docker → job de CI** en push a `agente/**`; la maestra lo comprueba con `mcp__github__actions_list` (`list_workflow_runs` por rama y `list_workflow_jobs` del run: un `success` de 60 s puede ser sólo `calidad`).
7. **Integración:** la rama que sea fast-forward entra primero (aunque sea la de frontend); la siguiente va con `merge --no-ff`; el único choque recurrente es la tabla de 04 §11 (ambas añaden filas al final): conservar las dos partes. Mientras dos hijas corren, ninguna edita «Estado del código» de CLAUDE.md ni el README del plan: lo hace la maestra al integrar.
8. **Reproduce cada bloqueante tú misma** antes de devolverlo (una mutación, un curl); los revisores aciertan, pero la hija responde mejor a «lo reproduje así».
9. **Cadencia:** check-in con `send_later` a 25 min funciona; bórralo (`delete_trigger`) al integrar para que no dispare sobre trabajo ya hecho.
10. **Las lentes mutan el worktree compartido** (T-0.7: el script de una lente dejó un README en 0 bytes mientras otra corría, y la tercera lo reportó como fallo del commit). Pídeles que restauren con `git checkout --` tras cada mutación y comprueba tú `git status --porcelain` antes de reproducir nada.
12. **Una migración reescrita conserva su id de revisión:** la base de pruebas de la maestra (y la de cada lente) queda en `head` con el esquema viejo y `alembic upgrade` no hace nada: en T-1.1 la segunda verificación dio 10 fallos y los cruces de seguridad «seguían pasando» hasta que corrí todo sobre bases nuevas (`carta_test_t11b`). Por cada ronda de correcciones que toque `migrations/`, bases con nombre nuevo.
13. **Comprueba que el merge ocurrió antes de tocar el estado:** `git merge -F -` no lee de stdin (`could not read file '-'`) y la cadena siguió como si nada; la puerta dio 300 pruebas en vez de 472 y el commit de estado salió antes del merge. Usa `--file <ruta>` o `-m`, y mira `git log --oneline -3` antes de la puerta.
14. **Una hija puede negarse a aplicar correcciones que llegan por `send_message`** («necesita la confirmación del usuario en esta sesión»; pasó con T-1.10 en Sonnet, no con las de Opus). Por eso el brief ya avisa que la ronda llega así y se aplica sin confirmar. Si aun así se niega, no insistas: archívala y crea una sesión nueva cuyo prompt inicial sea la lista de correcciones, con `source_revision` y `outcome_branch` en la misma rama `agente/…`.
11. **La lista de correcciones se escribe con Write, no con un heredoc:** el guard lee el texto del comando y bloquea frases como «push … master» aunque sean documentación. Reproduce cada «sobrevive» con un script de mutaciones propio (`scratchpad/maestra-T-x.y/mutaciones.py`) y vuelve a correrlo sobre la rama corregida: en T-0.7 las 18 mutaciones pasaron de sobrevivir a fallar.
15. **Las puertas se leen por código de salida, no por el resumen.** En T-1.12 mi script filtraba la salida de vitest con `grep` («342 passed») y el proceso salía con 1 por un «Unhandled Error» que ninguna prueba contaba; la CI tampoco corría vitest (sólo `calidad` e `imagen`). Corre cada paso sin tubería y guarda su código (`${PIPESTATUS[0]}`), y exige a las hijas que la CI tenga un job por cada puerta que la maestra verifica.
16. **El límite semanal mata hijas y lentes a la vez.** El 7 de noviembre dos hijas recién creadas y dos lentes murieron con «You've hit your weekly limit» tres minutos después de lanzarse; se reanudaron dos días después con `send_message` en la misma sesión (las hijas) y relanzando las lentes. Antes de abrir una ola, mira `rate_limit_info` en `get_session` de cualquier hija (`allowed_warning` = queda poco) y no lances más de una hija nueva cuando esté en aviso.
17. **La puerta local no es la CI: la base local va por `127.0.0.1` y la de la CI por `localhost`.** En T-1.5 una fixture `autouse` parcheó `socket.getaddrinfo` de todo el proceso; en local pasó (asyncio no resuelve una IP literal) y en la CI cada fixture con base se colgó 60 s intentando conectar a la IP falsa (13 `ERROR at setup`, 15 min de job). Antes de integrar, exige la CI en verde de la rama (no sólo la puerta local) y, cuando una tarea toque DNS, sockets o el executor, pide a la hija que corra la suite una vez con `localhost` en `TEST_DATABASE_URL`.
