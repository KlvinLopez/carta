# Carta MVP — Paquete de Diseño Técnico

> **Propósito.** Este paquete contiene todo lo necesario para construir el MVP de Carta sin ambigüedad. Está escrito para que una instancia de Claude Code **sin contexto previo** pueda leerlo y construir el sistema completo, y para que una persona pueda auditar cada decisión y su justificación.

**Versión:** 1.0 · **Fecha:** 30 de agosto de 2026 · **Estado:** listo para construcción

---

## Decisiones fundacionales (bloqueadas)

Estas cuatro decisiones definen todo lo demás. Cambiar cualquiera invalida partes del paquete.

| # | Decisión | Valor | Documento |
|---|---|---|---|
| D1 | **Alcance del MVP** | Comensal AR + orden. Sin pagos, sin app de mesero, sin analytics de admin. | [01_PRD](01_PRD.md) |
| D2 | **Origen de modelos 3D** | Servicio curado por el equipo Carta **+** generación asistida con modelo local image-to-3D, con revisión humana obligatoria antes de publicar. | [05_3D_Pipeline](05_3D_Pipeline.md) |
| D3 | **Quién construye** | Calvin + Claude Code. Los documentos son blueprints autocontenidos con rutas exactas y comandos de verificación. | [06_Implementation_Plan](06_Implementation_Plan.md) |
| D4 | **Cliente del comensal** | PWA web (no app nativa). Cero fricción de descarga; AR vía `<model-viewer>`. | [ADR-002](adr/ADR-002-pwa-vs-nativa.md) |

---

## Orden de lectura

**Si vas a construir (Claude Code o dev):**

1. [`/CLAUDE.md`](../../CLAUDE.md) — reglas de trabajo, comandos, convenciones. **Empieza aquí.**
2. [`06_Implementation_Plan.md`](06_Implementation_Plan.md) — qué construir, en qué orden, cómo verificar cada paso.
3. [`03_Data_Model.md`](03_Data_Model.md) y [`04_API_Spec.md`](04_API_Spec.md) — contratos exactos.
4. [`02_TDD.md`](02_TDD.md) — cuando necesites entender el porqué de una pieza.

**Si vas a evaluar producto o inversión:**

1. [`01_PRD.md`](01_PRD.md) — problema, alcance, métricas de éxito.
2. [`02_TDD.md`](02_TDD.md) §1–§3 — arquitectura en una página.
3. [`08_Security_Compliance.md`](08_Security_Compliance.md) — riesgo legal y de datos.

---

## Índice de documentos

| Documento | Contenido | Líneas aprox. |
|---|---|---|
| [01_PRD.md](01_PRD.md) | Problema, objetivos, personas, alcance/no-alcance, 24 user stories con criterios EARS, métricas de éxito | 480 |
| [02_TDD.md](02_TDD.md) | Arquitectura C4, componentes, flujos secuenciales, requisitos no funcionales, plan de capacidad | 520 |
| [03_Data_Model.md](03_Data_Model.md) | Entidades, DDL completo, índices, migraciones, deltas contra Fase 1 | 420 |
| [04_API_Spec.md](04_API_Spec.md) | 28 endpoints con contratos, errores, idempotencia, rate limits | 460 |
| [openapi.yaml](openapi.yaml) | Especificación OpenAPI 3.1 ejecutable | 700 |
| [05_3D_Pipeline.md](05_3D_Pipeline.md) | Pipeline de assets: vía curada + generación local asistida, gate de revisión, formatos GLB/USDZ | 380 |
| [06_Implementation_Plan.md](06_Implementation_Plan.md) | 7 fases, 58 tareas con rutas exactas y comando de verificación por tarea | 620 |
| [07_Test_Strategy.md](07_Test_Strategy.md) | Pirámide de pruebas, fixtures, criterios de cobertura, pruebas de campo en piloto | 300 |
| [08_Security_Compliance.md](08_Security_Compliance.md) | LFPDPPP, datos anónimos, retención, amenazas y mitigaciones | 340 |
| [adr/](adr/) | 10 decisiones arquitectónicas con alternativas y trade-offs | — |

---

## Qué NO está en este paquete (deliberadamente)

- **Pagos y comisión 1.8%.** Fuera del MVP. El diseño existe en `docs/Carta_Screens_Spec.md` (P05) y se retoma en v2.
- **App de mesero (P06–P08).** El mesero del piloto opera con su flujo actual + la Vista de Comandas.
- **Panel admin completo (P09, P12–P16).** El MVP incluye únicamente back-office mínimo: platillos, fotos, 3D, mesas/QR y comandas.
- **Perfil portable del mesero (P19–P20).** Depende de la app de mesero.
- **Onboarding de restaurante self-service (P21).** En el piloto el alta la hace el equipo Carta a mano.

Todo esto está diseñado y documentado; sólo está fuera de alcance de la primera versión. Ver [01_PRD §4](01_PRD.md#4-fuera-de-alcance-no-goals).

---

## Convención de trazabilidad

Cada requisito tiene un ID estable que se referencia en todos los documentos:

- `US-xx` — User story (PRD)
- `AC-xx.y` — Criterio de aceptación EARS de esa story
- `NFR-xx` — Requisito no funcional (TDD)
- `ADR-xxx` — Decisión arquitectónica
- `T-x.y` — Tarea de implementación (fase x, tarea y)

Cualquier línea de código del MVP debe poder rastrearse a un `US-xx`. Si no puede, probablemente no debería existir.
