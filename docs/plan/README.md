# Carta v1 — Plan maestro

**Versión:** 1.0 · **Fecha:** 2 de noviembre de 2026 · **Estado:** vigente · **Sustituye a:** `docs/propuestas/2026-10-26_revision_y_plan_de_despliegue.md` y, donde se contradigan, a `docs/mvp/06_Implementation_Plan.md`.

> Este plan existe para que **varios agentes de Claude Code construyan Carta v1 en sesiones separadas** sin pisarse y sin perder contexto. Cada tarea es un brief autocontenido; cada decisión estructural tiene su ADR; cada regla que no puede fallar tiene un hook.

---

## Qué es Carta v1 en una frase

Un restaurante sube su menú en PDF y en minutos tiene un menú visual por QR; los comensales arman su orden juntos desde sus teléfonos y el mesero la recibe en el suyo. **Sin pagos, sin 3D ni realidad aumentada, sin cuenta para el comensal.**

La v1 responde una pregunta distinta a la del paquete de agosto (que giraba en torno al 3D):

> ¿Un menú visual con orden compartida y comanda directa al personal mejora la experiencia de la mesa, y el restaurante lo adopta y lo conserva?

Ver [ADR-011](../mvp/adr/ADR-011-sin-ar-en-v1.md).

---

## Documentos de este plan

| Doc | Qué contiene | Quién lo lee |
|---|---|---|
| [01_Alcance_v1.md](01_Alcance_v1.md) | Qué entra y qué no, por rol. Qué pasa con cada pantalla del prototipo. Hipótesis y métricas de la v1. | Todos, antes de cualquier tarea |
| [02_Arquitectura_v1.md](02_Arquitectura_v1.md) | Un servidor, portable. Stack, diagrama, API v1, decisiones por tema de diseño de sistemas, capacidad y SLOs (p95/p99), costo, escalado por disparadores, seguridad. | Backend, infra, revisores |
| [03_Datos_v1.md](03_Datos_v1.md) | Esquema v1: tablas que se conservan, nuevas, pospuestas; migración base; invariantes. | Backend |
| [04_Fases_y_Tareas.md](04_Fases_y_Tareas.md) | **Las tareas, como briefs para agentes.** Fases, carriles, dependencias, olas de paralelización, criterio de terminado. | El agente que ejecuta una tarea |
| [05_Operacion.md](05_Operacion.md) | Despliegue, respaldos, monitoreo, pruebas de carga, respuesta a incidentes. | Infra, piloto |
| [06_Hosting.md](06_Hosting.md) | Dónde alojar la primera versión: pros, contras y precios de cada opción; recomendación (ADR-015). | Calvin, infra |
| [07_Spec_Driven.md](07_Spec_Driven.md) | Cómo trabajamos: spec-driven con agentes, trazabilidad criterio → prueba, sesión maestra e hijas, prácticas de desarrollo con IA. | Todos |

Los documentos de `docs/mvp/` (PRD, TDD, modelo de datos, API, seguridad, ADR 001–010) **siguen siendo la base**: las convenciones de API, el formato de error, los criterios EARS de las historias que la v1 conserva y el modelo de amenazas no se repiten aquí. Este plan sólo dice qué cambia.

---

## Cómo se usa con agentes

1. **Una sesión = una tarea** (`T-x.y`). El agente arranca con `/tarea T-x.y`, que lee el brief, planea, implementa, verifica y hace commit con el ID.
2. **Carriles.** Las tareas se agrupan en carriles con dueño de carpetas distinto (ver 04 §2). Dos agentes pueden trabajar carriles distintos en paralelo, cada uno en su *worktree* y su rama `agente/T-x.y-descripcion`.
3. **Contrato primero.** El backend publica `app/schemas/` y `/openapi.json` al inicio de cada fase; el frontend genera sus tipos desde ahí. Así los carriles de frontend no esperan al backend terminado.
4. **Revisión antes de integrar.** `/revisar` lanza tres revisores (seguridad, pruebas, adversarial) sobre el diff. Los hallazgos bloqueantes se resuelven antes del PR.
5. **Cierre con `/compound`.** Cada sesión termina guardando lo aprendido donde corresponde: test, regla en `CLAUDE.md`, skill, hook o ADR.
6. **Si el plan está mal, se corrige el plan**, no se improvisa en el código. Fila en el registro de cambios de 04 §11.
7. **Lo que no está en el plan se especifica primero** con `/especificar` (spec en `docs/specs/`), y `/analizar` comprueba antes del PR que spec, contrato, código y pruebas cuenten lo mismo. Cada prueba de criterio lleva `@pytest.mark.ac("AC-x.y")`.
8. **Varias tareas a la vez:** una sesión maestra con `/orquestar` crea una sesión hija por tarea (una por carril, máximo tres), revisa e integra. Detalle en [07_Spec_Driven.md](07_Spec_Driven.md).

---

## Estado

| Fase | Entregable observable | Estado |
|---|---|---|
| 0 · Cimientos y primer despliegue | `https://staging.<dominio>/health` responde desde un teléfono | En curso: T-0.1 a T-0.5 integradas (5 de noviembre); T-0.6 en marcha; T-0.7 espera las cuentas de Railway y Cloudflare |
| 1 · Restaurante y menú | Un restaurante sube su PDF y ve su menú con fotos y sus QR impresos | Pendiente |
| 2 · Comensal | Un comensal escanea y ve el menú en su teléfono | Pendiente |
| 3 · Orden en grupo, comandas y personal | La mesa arma la orden junta y el mesero la recibe | Pendiente |
| 4 · Beta y piloto | Seguridad, respaldos, carga medida, primer restaurante real | Pendiente |
| 5 · Después | Ilustraciones generadas, 3D local, pagos, cuenta, analítica | No ahora |

---

## Decisiones tomadas el 2 de noviembre de 2026

| # | Decisión | Dónde |
|---|---|---|
| 1 | Tipografía: DM Serif Display + DM Sans | `CLAUDE.md`, skill `/diseno-visual` |
| 2 | Sin realidad aumentada ni 3D en v1; el platillo se representa con foto (recomendada) o ilustración de respaldo | ADR-011 |
| 3 | Un solo servidor, imagen Docker portable; Cloudflare delante; nube administrada sólo cuando un disparador lo pida | ADR-012 |
| 4 | Tres roles: comensal (anónimo), personal (mesero y capitán con PIN), operador (dueño/gerente con cuenta) | ADR-013 |
| 5 | Alta self-service: el operador sube su PDF y un modelo de lenguaje lo convierte en borrador de menú que él revisa | ADR-014 |
| 6 | El plan se ejecuta por fases con entregable observable y se despliega desde la Fase 0 | 04 |
| 7 | Compound Engineering: ciclo planear → trabajar → revisar → compound, con skills, agentes y hooks en `.claude/` | `CLAUDE.md` |
| 8 | Primer despliegue en Railway; VM como camino de ahorro, Cloud Run como camino de escala (5 de noviembre) | ADR-015, `06_Hosting.md` |
| 9 | Spec-driven: una tarea por sesión; toda sesión cierra con `/compound` y una etiqueta de resultado (5 de noviembre) | `07_Spec_Driven.md` §2.3 |
