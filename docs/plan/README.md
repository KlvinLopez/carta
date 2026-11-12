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
| 0 · Cimientos y primer despliegue | `https://staging.<dominio>/health` responde desde un teléfono | T-0.1 a T-0.7 integradas (6 de noviembre: 300 pruebas backend, 70 de frontend, CI con `docker build`, comando previo y humo). Parte operativa de T-0.7 hecha el 11 de noviembre: staging y producción en Railway, Cloudflare (DNS, HTTPS, reglas) y `v0.0.1` desplegado; `https://carta.cooking/health` y `/ready` responden. T-0.9 (11 de noviembre): la maestra opera staging de Railway con `scripts/railway.py` y el skill `/railway` |
| 1 · Restaurante y menú | Un restaurante sube su PDF y ve su menú con fotos y sus QR impresos | En curso: T-1.1, T-1.2, T-1.8 y T-1.10 integradas (6 de noviembre: INV-10, acceso del operador con Firebase, extracción del menú con la API de Claude, panel del operador; 790 pruebas backend, 185 de frontend). T-1.3 integrada (965 pruebas backend). T-1.11 integrada (284 pruebas de frontend). T-1.4 integrada (7 de noviembre: fotos con variantes WebP, almacén local y S3; 1116 pruebas backend). T-1.12 integrada (10 de noviembre: pantalla Menú del operador, 390 pruebas de frontend, job `frontend` en CI). T-1.5 integrada (10 de noviembre: mesas y PDF de QR; 1257 pruebas backend). T-1.9 integrada (10 de noviembre: importaciones con procesador en segundo plano; 1350 pruebas backend). T-1.6 integrada (10 de noviembre: personal y PIN con Argon2id, migración 0003; 1419 pruebas backend). Fase 1 cerrada el 11 de noviembre: recorrido real del operador en staging con dos cartas, menos de 10 min cada una (S4 < 15 min); `v0.0.1` en producción (Railway + Cloudflare). Sigue la Fase 2 (T-2.1 primero) |
| 2 · Comensal | Un comensal escanea y ve el menú en su teléfono | En curso: T-2.1 integrada (11 de noviembre: token de invitado, sesión de mesa con sondeo por ETag, alias y cierre por inactividad; contrato de la fase publicado). T-2.2 integrada (11 de noviembre: menú público por `slug` cacheable en el borde con ETag y vuelo único, y detalle de platillo; 1999 pruebas backend, 565 de frontend). T-2.4 integrada (11 de noviembre: entrada del comensal en `/m/:codigo` con bienvenida, alias, sondeo de 3 s con ETag y pantallas de fallo; 2004 pruebas backend, 690 de frontend). Primera ola en `master` por el PR 11 (11 de noviembre) y desplegada en staging. T-2.3 integrada (11 de noviembre: eventos de analítica sin IP en claro, límites de tasa del comensal en memoria y log sin código de mesa; 2187 pruebas backend). T-2.5 integrada (11 de noviembre: menú del comensal con búsqueda, filtros en el teléfono y analítica sin texto libre; 797 pruebas de frontend). T-2.6 en `master` (11 de noviembre, PR 13 y 15: detalle del platillo como capa sobre el menú, volver con la misma posición y un `dish_view` por platillo y minuto; 885 pruebas de frontend). T-2.7 integrada (12 de noviembre: service worker con copia del menú sin conexión, navegación red primero, menú que se actualiza cada 25 s y contrato vigilado en la CI; 1025 pruebas de frontend, 2187 de backend). **Código de la fase completo.** Para cerrarla faltan el entregable observable (Calvin escanea un QR de staging y ve el menú), la medición de AC-01.1 con Lighthouse contra staging y la decisión sobre T-2.8 (propuesta, espera a Calvin) |
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
| 10 | Modelos por rol: la sesión maestra (planear, revisar, integrar) corre en Claude Fable 5.1; las hijas que implementan corren en Opus 5.5 (tareas 🔴, migraciones, seguridad, concurrencia) o Sonnet 5.5 (el resto), y Haiku 5.5 sólo para tareas mecánicas sin código de producción; las lentes de `/revisar` en Sonnet (seguridad en Opus para tareas 🔴). Ahorro: Opus cuesta 2.5× menos que Fable, Sonnet 5×, Haiku 100× (6 de noviembre) | skill `/orquestar` §1 y §3 |
