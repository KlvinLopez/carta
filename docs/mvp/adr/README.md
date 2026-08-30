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
| [010](ADR-010-hosting-frontend.md) | Frontend estático servido por la propia API | Aceptada |

## Cómo escribir un ADR nuevo

1. Copiar la estructura de cualquiera de los anteriores: Contexto → Decisión → Alternativas → Consecuencias → Verificación.
2. Numerar de forma consecutiva; nunca reutilizar un número.
3. Un ADR no se edita una vez aceptado. Si la decisión cambia, se escribe uno nuevo que lo supersede y se marca el anterior como `Superseded by ADR-0XX`.
4. Toda alternativa descartada debe llevar el motivo. Un ADR sin alternativas no es una decisión, es una nota.
