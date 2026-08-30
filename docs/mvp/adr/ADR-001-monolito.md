# ADR-001 — Monolito modular en un solo servicio

**Estado:** aceptada · **Fecha:** 2026-08-30 · **Decide:** Calvin

## Contexto
El MVP debe servir a 5–10 restaurantes con un equipo de una persona más asistencia de IA. Existen tres superficies (comensal, comandas, back-office), un pipeline asíncrono de 3D y una API.

## Decisión
Un único servicio FastAPI desplegado en Cloud Run, organizado internamente en paquetes por audiencia (`api/publico`, `api/operacion`, `api/admin`) y una capa de servicios sin dependencias de framework. El worker 3D es el único proceso separado, porque su perfil de recursos es radicalmente distinto.

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| Microservicios por dominio | Multiplica despliegues, observabilidad y modos de fallo sin ningún beneficio a esta escala. |
| Serverless por función | Arranques en frío en el camino crítico del comensal; dificulta transacciones multi-tabla. |
| Monolito sin modularizar | Barato hoy, caro cuando haya que extraer el módulo de pagos en v2. |

## Consecuencias
- **Positivas:** un despliegue, una migración, un log. Transacciones ACID entre sesión, orden y comanda sin coordinación distribuida.
- **Negativas:** un fallo afecta a todas las superficies. Se mitiga con readiness checks y con que Comandas tolera trabajar en modo degradado.
- **Reversible:** sí. La capa de servicios no importa FastAPI, así que extraer un módulo es mover archivos y añadir un transporte.

## Verificación
`app/services/*.py` no debe importar `fastapi`. Prueba en CI: `grep -rl "import fastapi" app/services/ | wc -l` debe devolver `0`.
