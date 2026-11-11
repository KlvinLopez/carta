# Carta — Desarrollo guiado por especificación (spec-driven) con agentes

**Versión:** 1.0 · **Fecha:** 5 de noviembre de 2026

> La idea central: **la especificación es la fuente de verdad y el código la sigue.** El agente no adivina qué construir; lee una spec con criterios verificables, planea contra ella, implementa, y una prueba demuestra cada criterio. Lo que no está en la spec no se construye; lo que la spec dice mal se corrige en la spec, no en el código.

---

## 1. Qué ya tenemos y qué falta

Las metodologías spec-driven (Spec Kit de GitHub, el flujo *requirements → design → tasks* de Kiro, los *specs* de Amazon) comparten cinco etapas. Carta ya cubre casi todas con artefactos que viven en el repo:

| Etapa | Qué es | En Carta | Estado |
|---|---|---|---|
| **Constitución** | Principios que no se negocian | `CLAUDE.md` (reglas duras, qué NO construir), ADRs | ✓ |
| **Especificación** | Qué y por qué, en criterios verificables, sin decidir cómo | `docs/plan/01_Alcance_v1.md` (roles, historias US-25–28) + `docs/mvp/01_PRD.md` §7 (US-01–24 con criterios EARS) | ✓ |
| **Plan técnico** | Cómo: arquitectura, datos, contratos | `02_Arquitectura_v1.md`, `03_Datos_v1.md`, `/openapi.json` (contrato primero) | ✓ |
| **Tareas** | Pasos pequeños, ordenados, cada uno con verificación | `04_Fases_y_Tareas.md` (44 briefs con comando de **Verificar**) | ✓ |
| **Implementación y verificación** | Código que demuestra los criterios | `/tarea`, `/revisar`, puerta de calidad, `/compound` | ✓ |
| **Trazabilidad** | Saber qué criterio cubre qué prueba, automáticamente | marcador `@pytest.mark.ac(...)` + `scripts/verificar_trazabilidad.py` | **nuevo** |
| **Contrato ejecutable** | Que la API cumpla el OpenAPI que publica | pruebas de contrato con `schemathesis` (T-4.9) | **nuevo** |
| **Features nuevas** | Especificar antes de planear cuando algo no está en el plan | `/especificar` → `docs/specs/NNN-<nombre>/spec.md` | **nuevo** |
| **Compuerta de integración** | Nada se integra sin spec, pruebas y revisión | `/analizar` + plantilla de PR | **nuevo** |
| **Orquestación** | Varias sesiones trabajando en paralelo sin pisarse | `/orquestar` (sesión maestra e hijas) | **nuevo** |
| **Portabilidad de las reglas** | Que cualquier herramienta de IA lea las mismas reglas | `AGENTS.md` → `CLAUDE.md` | **nuevo** |

---

## 2. Dos ciclos

### 2.1 Tarea del plan (lo normal durante la v1)

La spec ya existe: el brief en 04 cita sus criterios (AC-xx.y), que a su vez están en 01 o en el PRD. El ciclo es el de `CLAUDE.md`:

```mermaid
flowchart LR
  A["/tarea T-x.y<br/>lee brief + criterios"] --> B["plan mode<br/>archivos · pruebas por criterio · verificación"]
  B --> C["pruebas primero<br/>@pytest.mark.ac('AC-x.y')"]
  C --> D["implementar"]
  D --> E["Verificar + puerta de calidad"]
  E --> F["/revisar · /analizar"]
  F --> G["PR con la plantilla"]
  G --> H["/compound<br/>según el resultado"]
  H --> I["cerrar la sesión<br/>la siguiente tarea arranca en una nueva"]
```

**Una tarea, una sesión.** La sesión termina con `/compound` y se cierra; la siguiente tarea arranca en una sesión nueva, con el contexto limpio y la memoria ya actualizada (`CLAUDE.md`, skills, hooks, tests, ADRs). Así cada sesión llega sabiendo más que la anterior y ninguna arrastra el ruido de la anterior.

### 2.3 Cierre obligatorio según el resultado

Toda sesión de trabajo termina con `/compound` y una etiqueta de resultado en su último mensaje. No hay sesión que "simplemente acaba".

| Resultado | Cuándo | Qué hace `/compound` | Qué hace la maestra |
|---|---|---|---|
| **TERMINADA** | Verificar y puerta de calidad en verde, commit con el ID, push a su rama | Guarda las lecciones (test, regla, skill, hook, ADR); actualiza el estado en `docs/plan/README.md` si la tarea cierra una fase | `/revisar` + `/analizar`, PR, integra, archiva la sesión |
| **BLOQUEADA** | El brief contradice un documento o el código, falta una dependencia, falta una decisión de Calvin | Fila en `04 §11` con la contradicción exacta y la decisión que se necesita; nada de código a medias en la rama | Resuelve o escala a Calvin; corrige el brief; relanza en una sesión nueva |
| **FALLIDA** | Tras tres intentos la verificación sigue en rojo, o el enfoque del brief no funciona | Fila en `04 §11` con qué se intentó y qué hipótesis quedaron; **la prueba que falla se queda** (nunca `skip` ni `xfail`) y la rama se sube como `wip/T-x.y` | Decide: brief nuevo, dividir la tarea, o ADR si el problema es de diseño |

Formato del último mensaje de toda sesión hija:

```
RESULTADO: TERMINADA | BLOQUEADA | FALLIDA
Qué quedó: …
Qué lo verifica: <comando>
Compound: <qué se guardó y dónde, o "sin lecciones nuevas">
Siguiente: …
```

La maestra lee esa etiqueta para decidir; una hija sin etiqueta se considera BLOQUEADA. Por qué no es un hook: un hook de `Stop` se dispararía en cada turno, no al final de la tarea; la regla vive en `/tarea`, `/orquestar` y en el brief de arranque de cada hija.

### 2.2 Feature nueva o cambio de alcance (fuera del plan)

Cuando alguien pide algo que no está en 04 (o un brief resulta ambiguo), **no se improvisa en el código**:

```mermaid
flowchart LR
  A["/especificar<br/>docs/specs/NNN-nombre/spec.md"] --> B["hasta 5 preguntas<br/>[ACLARAR] el resto"]
  B --> C["¿toca 02 o 03?<br/>sí → actualizar + ADR si es costoso"]
  C --> D["tareas nuevas en 04<br/>con el formato del brief"]
  D --> E["ciclo 2.1"]
```

La spec se escribe **antes** del plan y **sin** decisiones de implementación. Cuando entra al plan, sus criterios se citan desde el brief igual que los del PRD.

---

## 3. Qué hace buena una spec para un agente

1. **Criterios EARS**, uno por línea, con ID estable (`AC-29.3`): `CUANDO <evento>, EL sistema DEBERÁ <respuesta medible>`. Un criterio = una prueba (o un paso manual documentado en `docs/piloto/ensayo.md`).
2. **Un escenario concreto por criterio** (Dado / Cuando / Entonces) con datos reales de la semilla: "Dado La Ceiba con 22 platillos y la mesa 7 con 3 comensales…". Los agentes fallan más por datos vagos que por lógica.
3. **Sin cómo.** Nada de tablas, endpoints ni librerías en la spec; eso va en 02/03. Si la spec dice "usar Redis", está mal escrita.
4. **Lo que NO hace**, explícito. Es lo que evita que el agente "mejore" cosas.
5. **Máximo 5 `[ACLARAR]`.** Si hay más, la feature no está lista para especificarse: falta una conversación.
6. **Métrica o señal de éxito** si la feature existe para mover un número (M1–M5, G1–G2).
7. **Trazable:** la spec dice a qué historia pertenece y el brief cita los criterios; la prueba lleva el marcador; el script lo comprueba.

Plantilla en `.claude/skills/especificar/SKILL.md`.

---

## 4. Trazabilidad y contrato ejecutable

| Mecanismo | Cómo | Cuándo falla |
|---|---|---|
| **Marcador de criterio** | `@pytest.mark.ac("AC-25.3")` sobre la prueba (varios IDs permitidos); en vitest, `// @ac AC-05.1` en la línea de arriba del `it(`, `test(` o `describe(` (un criterio que sólo vive en la pantalla no tiene prueba de backend) | — |
| **Verificador** | `uv run python scripts/verificar_trazabilidad.py --tarea T-1.9` lista los criterios del brief y qué prueba los cubre; `--estricto` sale con 1 si falta alguno | En `/analizar` y en CI para la fase cerrada (T-4.9) |
| **Contrato** | `schemathesis run http://localhost:8000/openapi.json` genera peticiones válidas e inválidas desde el OpenAPI y exige que la API responda como declara (códigos, esquemas, envoltura de error) | T-4.9 en CI; antes, a mano en `/analizar` |
| **Camino crítico** | Playwright: escanear → menú → orden en grupo → comanda en el teléfono del personal | T-4.7, contra staging |
| **Reglas duras mecánicas** | `grep` en CI: `fastapi` en `app/services/`, `create_all`, secretos | T-0.4 |

---

## 5. Prácticas de desarrollo con IA que adoptamos

| Práctica | Por qué |
|---|---|
| **Tareas de 2–4 h con un comando de verificación** | Un agente con un objetivo verificable termina; uno con "construye el módulo de órdenes" divaga |
| **Contrato primero** (`app/schemas/` + `/openapi.json` al inicio de la fase) | Permite paralelizar frontend y backend sin esperar |
| **Pruebas primero, marcadas con el criterio** | La prueba es la spec ejecutable; el marcador es la trazabilidad |
| **Plan mode antes de tocar código** | Separa pensar de escribir; el plan se revisa en 2 minutos, el código en 20 |
| **Contexto corto**: `CLAUDE.md` ≤ 150 líneas, detalle en skills | Un agente con 5,000 líneas de instrucciones ignora la mitad |
| **Subagentes con una sola lente** (explorar, implementar, 3 revisores) | Contexto limpio por rol; revisión adversarial real |
| **Un carril por agente, un worktree por rama** | Dos agentes en los mismos archivos pierden trabajo |
| **Un commit por tarea con su ID** | El historial es el registro de qué spec produjo qué código |
| **ADR para cada decisión costosa** | El agente de la semana que viene no rediscute lo decidido |
| **`/compound` al cerrar** | Cada sesión deja test, regla, skill, hook o ADR: la bola de nieve |
| **Medir, no creer** (k6, Lighthouse, `EXPLAIN ANALYZE`) | Los agentes afirman con seguridad; los números no |
| **Nunca "refactoriza todo" a medio vuelo** | Lección de Alerta Roja MX: el rediseño total en medio del flujo rompe integraciones |
| **Revisar diffs, no prosa** | El resumen del agente dice lo que cree que hizo; el diff dice lo que hizo |
| **Hooks para lo que no puede fallar** | Una regla en texto se olvida; un hook no |

---

## 6. Sesión maestra y sesiones hijas

Cuando hay varias tareas independientes (una ola de 04 §3), una **sesión maestra** coordina y **sesiones hijas** ejecutan. Protocolo completo en `.claude/skills/orquestar/SKILL.md`; en resumen:

```mermaid
flowchart TB
  M["Sesión maestra<br/>/orquestar · lee 04 §3 · no implementa"]
  M -->|"create_session · prompt: /tarea T-1.3 · rama agente/T-1.3-menu"| H1["Hija A · carril A"]
  M -->|"/tarea T-1.8 · agente/T-1.8-extraccion"| H2["Hija B · carril B"]
  M -->|"/tarea T-1.10 · agente/T-1.10-acceso"| H3["Hija C · carril C"]
  H1 -->|"commit + push"| R1["rama A"]
  H2 --> R2["rama B"]
  H3 --> R3["rama C"]
  R1 --> V["Maestra: /revisar · /analizar · PR · integrar en orden backend → frontend"]
  R2 --> V
  R3 --> V
  V --> E["Actualiza estado en docs/plan/README · siguiente ola"]
```

Reglas:
- **Máximo tres hijas a la vez**, una por carril; nunca dos en el mismo carril.
- La maestra **no escribe código**: crea sesiones, vigila (`get_session`, `list_events`), revisa, integra y actualiza el estado. Si una hija se atasca, la maestra le manda el contexto que falta (`send_message`) o la archiva y relanza con un brief corregido.
- Cada hija arranca con el mismo entorno (hook de sesión incluido), su rama y el prompt `/tarea T-x.y`. No necesita saber que existen las otras. Termina con `/compound` y la etiqueta de resultado de §2.3; después se archiva. **Nunca se reutiliza una sesión hija para otra tarea.**
- Los PR los abre la maestra con la plantilla, **sólo con permiso explícito de Calvin** en cada ola; la integración sigue el orden de dependencias de 04.
- Cada hija consume cuota de uso; una ola de tres tareas medianas son unas 6–12 h de agente. La maestra reporta al final de cada ola: qué se integró, qué quedó bloqueado y qué aprendimos.

---

## 7. Sin IDE: cómo se ve el día a día

- **Claude Code en la nube** (lo que estás usando) es el entorno principal: sesión maestra desde el teléfono o el navegador, hijas en paralelo, hook de arranque que deja todo listo.
- **GitHub** es donde se revisa: PRs con la plantilla, `/code-review` integrado, diffs legibles en el teléfono. El PR es la unidad de revisión humana; la conversación con el agente es la unidad de trabajo.
- **Antigravity (o cualquier IDE con agente)** es opcional y encaja sin cambiar nada: abre el repo, lee `AGENTS.md` (que apunta a `CLAUDE.md`), y sirve para ver la app corriendo (`npm run dev`, Vite con recarga), revisar diffs grandes con comodidad y hacer ajustes visuales pequeños del frontend. Dos reglas: **las mismas instrucciones** (no crees reglas propias del IDE que `CLAUDE.md` no tenga) y **nunca dos agentes en el mismo carril al mismo tiempo**, sea en la nube o en el IDE.
- **La vista previa de la app** en sesiones en la nube: la sesión puede levantar `uvicorn` y `vite` y anunciar el puerto para verla desde el teléfono (T-0.5 en adelante).

## 8. Cierre de fase y handover de sesión

Una fase o una sesión maestra se cierra **limpia** o no se cierra. «Limpia» significa que la siguiente sesión arranca desde `master` sin nada volando: ni ramas, ni PRs, ni check-ins, ni decisiones a medias. Las dos listas de abajo son la puerta; se pasan en orden y se marcan en el reporte de cierre. Lo que no se pueda cerrar se **anota con dueño y fecha** en 04 §11 (fila «Pendientes al cierre de la Fase N»): un pendiente anotado no vuela; uno sin anotar, sí.

### 8.1 Salida limpia (quien cierra)

1. **Código.** Todo en `master` por PR fusionado; la rama de trabajo apunta a `master` (sin commits sin subir, `git status --porcelain` vacío). Ninguna rama `agente/*` viva: las fusionadas se borran; una no fusionada se fusiona o se borra con su razón en 04 §11.
2. **PRs.** Ninguno abierto de la fase, ni de bots (Dependabot: fusionado, cerrado con motivo o con regla en `.github/dependabot.yml`). Suscripciones a PRs y check-ins (`send_later`, `list_triggers`) cancelados.
3. **Sesiones.** Todas las hijas archivadas. Sin worktrees (`git worktree list` sólo la raíz). Las bases y archivos locales de la sesión son efímeros: no hace falta borrarlos, pero no deben guardar nada que la siguiente necesite.
4. **Documentos al día.** CLAUDE.md «Estado del código» (≤ 150 líneas), `docs/plan/README.md` §Estado, 04 §11 con una fila por tarea y por ronda de revisión, `deploy/*/README.md` con los valores reales no secretos. Lecciones en el skill que toque (`/orquestar`, `/desplegar`, `/pruebas`…), nunca sólo en el chat.
5. **Decisiones.** Ninguna «pendiente de la maestra» ni «pendiente de Calvin» sin resolver o sin fila con dueño y fecha. Las que cambian el alcance van a `/especificar`; las que cambian una regla, a un ADR.
6. **Operación.** Staging y producción responden (`/health`, `/ready`); la etiqueta `v*` publicada si la fase cambió código de producción; secretos sólo en Railway, el gestor de contraseñas y el formulario seguro; variables no secretas documentadas.
7. **Reporte de cierre** al usuario: entregable observable de la fase cumplido (cómo se comprobó), tabla de tareas, decisiones tomadas, pendientes anotados y propuesta de la siguiente ola, más el **mensaje de arranque** literal para la sesión nueva.

### 8.2 Entrada limpia (quien arranca)

1. `git fetch` y `git status`: en `master`, al día, sin ramas `agente/*` ni PRs abiertos que no sean tuyos; si los hay, primero se cierran (8.1), no se construye encima.
2. Lee en orden `docs/plan/README.md` §Estado, CLAUDE.md «Estado del código», las últimas filas de 04 §11 y «Pendientes al cierre» de la fase anterior.
3. Comprueba el entorno: hook de sesión en verde, `uv run pytest -q` y la puerta del frontend pasan sobre `master`; staging responde.
4. Confirma el modelo y el presupuesto: `rate_limit_info` de cualquier sesión (`allowed_warning` = una hija a la vez) y los modelos por rol de README §Decisiones.
5. Sólo entonces: elige la ola con `/orquestar` y lanza la primera hija.
