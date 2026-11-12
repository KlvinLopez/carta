# Decisiones Arquitectónicas (ADR)

Registro de decisiones técnicas del MVP de Carta. Cada una documenta el contexto, la decisión, las alternativas descartadas con su razón, y cómo verificar que la decisión se está respetando.

| ADR | Título | Estado |
|---|---|---|
| [001](ADR-001-monolito.md) | Monolito modular en un solo servicio | Aceptada |
| [002](ADR-002-pwa-vs-nativa.md) | PWA web para el comensal, no app nativa | Aceptada |
| [003](ADR-003-identidad-invitado.md) | Identidad de invitado con token firmado | Aceptada |
| [004](ADR-004-sondeo-vs-websockets.md) | Sondeo con ETag en lugar de WebSockets | Aceptada |
| [005](ADR-005-pipeline-3d.md) | Generación local + revisión humana obligatoria | Aceptada |
| [006](ADR-006-formatos-3d.md) | Formatos GLB y USDZ con presupuesto de peso | Aceptada |
| [007](ADR-007-almacenamiento-assets.md) | Cloud Storage público/privado con URLs firmadas | Aceptada |
| [008](ADR-008-esquema-espanol.md) | Conservar nomenclatura en español | Aceptada |
| [009](ADR-009-driver-async.md) | Corregir el motor de base de datos a asyncpg | Aceptada (bloqueante) |
| [010](ADR-010-hosting-frontend.md) | Frontend estático servido por la propia API | Aceptada; enmendada por ADR-012 (los estáticos los sirve Caddy, mismo dominio y despliegue) |
| [011](ADR-011-sin-ar-en-v1.md) | Sin realidad aumentada ni 3D en la v1; el platillo se representa con foto | Aceptada · 2026-11-02 |
| [012](ADR-012-un-servidor-portable.md) | Un solo servidor con Docker Compose, imagen portable, Cloudflare delante | Aceptada · 2026-11-02; el primer destino lo decide ADR-015 |
| [013](ADR-013-personal-con-pin.md) | El personal entra con nombre y PIN; el capitán es un mesero con opciones extra | Aceptada · 2026-11-02 |
| [014](ADR-014-importacion-menu-con-llm.md) | Alta self-service: el PDF se convierte en borrador de menú con un modelo de lenguaje | Aceptada · 2026-11-02 |
| [015](ADR-015-primer-despliegue-railway.md) | Primer despliegue en Railway; la VM como camino de ahorro y Cloud Run como camino de escala | Aceptada · 2026-11-05 |
| [016](ADR-016-service-worker-red-primero.md) | Service worker: la red manda, la copia es el respaldo, y nunca se toma una mesa a la fuerza | Propuesta · 2026-11-12 (espera a Calvin) |

**Pospuestas a v2 por ADR-011:** 005 y 006 (3D). **Vigentes:** 001, 002, 003, 004, 008, 009; 007 en espíritu (dos buckets) sobre R2.

El plan vigente para construir la v1 está en [`docs/plan/`](../../plan/README.md).

## Cómo escribir un ADR nuevo

1. Copiar la estructura de cualquiera de los anteriores: Contexto → Decisión → Alternativas → Consecuencias → Verificación.
2. Numerar de forma consecutiva; nunca reutilizar un número.
3. Un ADR no se edita una vez aceptado. Si la decisión cambia, se escribe uno nuevo que lo supersede y se marca el anterior como `Superseded by ADR-0XX`.
4. Toda alternativa descartada debe llevar el motivo. Un ADR sin alternativas no es una decisión, es una nota.
