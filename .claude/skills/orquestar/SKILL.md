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
La sesión arranca con HEAD suelto sobre la rama base: antes del primer commit crea tu rama
con `git checkout -b agente/T-x.y-<descripcion>` (si no, el push falla con «src refspec does not
match»). El Bash de la hija bloquea `sleep`: para esperar la CI, un bucle con la API de runs.
Si algo del brief contradice el código o un documento, no improvises:
cierra como BLOQUEADA. Termina SIEMPRE con /compound y el bloque:
RESULTADO: TERMINADA | BLOQUEADA | FALLIDA / Qué quedó / Qué lo verifica / Compound / Siguiente.
```

La rama base de cada hija es **la rama de la propia maestra** (`source_revision` en `create_session`), no `master`: ahí están ya integradas las tareas de las que depende y que todavía esperan el «abre el PR». Empuja la rama de la maestra antes de crear la hija. Guarda `session_id` ↔ tarea ↔ rama en una tabla en tu respuesta (es tu estado).

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
4. Ronda aplicada y verificada (puertas por código de salida, mutaciones propias otra vez, CI de la rama en verde): `git merge --no-ff origin/agente/T-x.y-…` en la rama de la maestra, en el orden de dependencias; regenera el contrato del frontend (`npm --prefix frontend run contrato` y `run tipos` con uvicorn en el 8000), puertas de backend y frontend, commit de estado (CLAUDE.md, README del plan, fila «Maestra (integración de T-x.y)» en 04 §11, notas en los briefs de las tareas que heredan algo) y push de la rama de la maestra. Si dos ramas chocan en `app/schemas/` o `frontend/src/compartido/`, integra primero la de backend y pide a la hija de frontend que fusione la rama de la maestra.
5. **Avisa a Calvin con el resumen y espera su «abre el PR».** Sólo entonces: PR de la rama de la maestra con `.github/pull_request_template.md`, CI y `/code-review`. Nunca un PR por iniciativa propia.
6. `archive_session` de la hija cuando su trabajo esté en `master`. Una sesión hija nunca se reutiliza para otra tarea: la siguiente arranca limpia con la memoria ya actualizada.

## 4. Cerrar la ola

1. Actualiza `docs/plan/README.md` §Estado y, si una hija corrigió un brief, verifica que la fila esté en 04 §11.
2. `/compound` con lo aprendido **sobre orquestar** (briefs que faltaron contexto, choques de carriles, tiempos reales).
3. Reporte al usuario: tabla tarea · rama · estado · PR · tiempo · bloqueos, y la propuesta de la siguiente ola.
4. Si la ola cierra una fase o la sesión termina: pasa la **salida limpia** de `docs/plan/07_Spec_Driven.md` §8.1 (ramas `agente/*` fusionadas **conservadas** como registro, por decisión de Calvin del 11 de noviembre; PRs de la fase y de bots resueltos, check-ins y suscripciones cancelados, hijas archivadas, worktrees quitados, documentos y decisiones al día, staging y producción respondiendo) y entrega el mensaje de arranque literal de la siguiente sesión. Lo que no cierre, a 04 §11 con dueño y fecha.

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
18. **Una herramienta de desarrollo se revisa como producto.** En T-1.7 la guarda de entorno vivía sólo en `main()`, el borrado se confirmaba antes de comprobar que los archivos de entrada existían (la imagen Docker lleva `scripts/` sin `tests/`), una FK `ON DELETE RESTRICT` de la Fase 2 rompía la cascada y cada corrida dejaba 55 archivos huérfanos en el almacén que ninguna prueba veía porque cada una usa un `tmp_path`. Para un script que borra: guarda en el servicio (no sólo en `main`), entradas comprobadas antes de borrar, cascadas revisadas en `models.py`, idempotencia de filas **y** de archivos, y una prueba que corra dos veces con el mismo almacén.
19. **Una prueba que compara contra lo que el propio código calculó no detecta nada:** `resumen.con_foto == 18` sobrevivió a un `con_foto = 18` constante y la prueba «usuario reutilizado» no afirmaba el reuso. La lente de pruebas lo encuentra en minutos con mutaciones: pídele siempre la tabla «mutación → prueba que cae» y convierte cada «SOBREVIVE» en un ítem B.
20. **Un script corrido en un worktree importa el `app` de `/home/user/carta`, no el de la rama:** la sesión lleva `/home/user/carta` en `sys.path` justo después del directorio del script, así que `uv run python scripts/seed.py` en `/home/user/carta-T-1.7` cargó el `assets.py` viejo (sin `borrar_publico`) y el Verificar falló aunque pytest (que pone la raíz del worktree primero) pasaba. En T-1.7 el segundo Verificar dio `AttributeError` por esto, no por el código. Scripts en un worktree siempre con `PYTHONPATH=<worktree>` (y `uv sync --locked --reinstall-package carta` antes de la puerta); pytest no lo necesita. `mypy app` ignora `files=` de `pyproject.toml`: cuando una hija amplía `files`, la CI y los documentos pasan a `uv run mypy` sin argumento, y eso lo hace la maestra en el commit de estado.
21. **La parte operativa también se orquesta, pero con Calvin al teclado.** El entorno bloquea cualquier comando que dispare un despliegue a producción (el push de una etiqueta `v*`): la etiqueta la publica Calvin desde GitHub → Releases y la maestra sigue la corrida con `actions_list`. En Railway un servicio tiene nombre único en el proyecto pero sólo existe en los environments donde se creó o se importó con **Sync**; un «Empty Service» con nombre repetido falla y la plantilla de Postgres crea `Postgres-xxxx`. Cloudflare sí se opera desde la maestra con su conector (DNS, SSL, reglas). Cuando la API rechaza tokens válidos, reprodúcelo con un usuario temporal de Firebase por REST (la apiKey pública del bundle) y levanta la API en local con las mismas variables: así se acotó en minutos un `FIREBASE_PROJECT_ID` sin sufijo.

## Lecciones de la Fase 2, primera ola (11 de noviembre de 2026, T-0.9, T-2.1, T-2.2, T-2.4)

Tiempos reales: la hija de T-2.1 en Opus, 34 min la tarea y 25 min la ronda; las de T-2.2 y T-2.4 en Sonnet, unos 15 min la tarea y otros tantos la ronda, entre 1.6 y 3.8 USD cada una. Con el límite semanal en aviso, una hija a la vez alcanzó para cuatro tareas en un día.

22. **El límite de 5 h también mata a las lentes a media revisión.** A las 09:12 UTC murieron cuatro agentes de lente; se reanudaron tras el reinicio con `SendMessage` al mismo id de agente (conservan lo leído; relanzarlos lo repite todo). Como la maestra también queda parada, deja un `send_later` de seguro unos minutos después de la hora de reinicio que da `rate_limit_info`, y bórralo si no hizo falta.
23. **Lo que escribe la maestra también pasa por las lentes.** T-0.9 (`scripts/railway.py`) la hizo la maestra sin hija y las lentes de seguridad y adversarial la cambiaron de fondo: «no secreta» no es «inocua» (una variable de CSP o de bucket apuntada a otro sitio es un ataque), así que escribir quedó en «dejar la variable como dice la guía». Una herramienta con credenciales se revisa como una tarea 🔴, y las lentes trabajan sin tocar la API real (transporte simulado).
24. **Toda caché nueva se ataca antes de integrar** con uvicorn real y dos workers o más: una ráfaga simultánea con la caché fría (T-2.2: 500 peticiones dieron 222 errores 500 por agotar el pool, sin vuelo único) y una escritura a mitad de una lectura (T-2.2: una lectura vieja salía con `public, s-maxage=60`; T-2.1: el recién llegado recibía 401 de la memoria de otro worker). Las pruebas de la hija, con un solo proceso, no lo ven.
25. **La trazabilidad estricta puede dar verde por las pruebas de otra tarea.** T-2.4 (sólo frontend) salía «0 criterios sin cobertura» gracias a las pruebas de backend de T-2.1. Desde el adelanto de T-4.9 el script cuenta también `// @ac AC-x.y` sobre un `it` de vitest: en una tarea de frontend, mira que la lista de pruebas de cada criterio incluya archivos de `frontend/src/`.
26. **En una tarea de frontend, la maestra pasa la pantalla en un navegador real contra el backend real** (Playwright ya instalado; uvicorn con dos workers sobre una base propia sembrada, API y PWA en el mismo origen): es lo único que ve la CSP, la cookie `HttpOnly`, el `localStorage` y la consola de verdad. Pero el guion se revisa antes de creerle: `innerText` aplica `text-transform` (un sobretítulo en mayúsculas no casa con el texto del código; usa `textContent` o un localizador por rol) y un color que va en una propiedad CSS personalizada no aparece en el `backgroundColor` del contenedor. Dos «fallos» de la primera pasada de T-2.4 eran del guion.
27. **Cuando la maestra añade un commit a su rama con una hija viva** (el adelanto de T-4.9 durante la ronda de T-2.4), se lo dice en la lista de correcciones: «fusiona `origin/<rama de la maestra>` antes de la ronda». Así la integración sigue sin choques.
28. **Calvin puede no estar.** Cada integración se avisa y espera el «abre el PR»; las preguntas de producto que salen de las lentes van a la fila de la tarea en 04 §11 como «Pendiente de Calvin» con fecha y el comportamiento actual intacto, y a las 4 h sin respuesta se termina lo que está en curso y no se abre otra ola (límite de arriba).
