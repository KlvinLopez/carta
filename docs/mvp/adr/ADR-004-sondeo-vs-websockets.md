# ADR-004 — Sondeo con ETag en lugar de WebSockets

**Estado:** aceptada · **Fecha:** 2026-08-30

## Contexto
Dos pantallas necesitan datos casi en vivo: el progreso de la sesión grupal ("3 de 4 listos", AC-02.3, ≤ 3 s) y la Vista de Comandas (AC-13.4, ≤ 5 s). La red dentro de un restaurante es irregular.

## Decisión
Sondeo HTTP condicional. El cliente pide cada 3 s (comensal) o 5 s (comandas) con cabecera `If-None-Match`; el servidor responde `304 Not Modified` cuando no hay cambios. El ETag se calcula a partir de `max(actualizado_en)` de las filas relevantes.

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| WebSockets | Requiere gestionar reconexión, estado por conexión y afinidad; Cloud Run los soporta pero el costo de complejidad no se paga con 200 sesiones. |
| Server-Sent Events | Más simple que WS, pero sigue exigiendo conexiones largas y se comporta mal tras proxies de redes de restaurante. |
| Sondeo largo (long polling) | Ocupa una instancia por cliente en espera; peor economía en Cloud Run. |

## Consecuencias
- **Positivas:** sin estado, sin reconexión, se recupera solo tras un corte de red. Un `304` cuesta microsegundos y no toca la base si el ETag está en Redis.
- **Negativas:** hasta 3 s de latencia percibida y tráfico constante de bajo volumen. Ambos dentro de los criterios de aceptación.
- **Coste estimado:** 200 sesiones × 20 peticiones/min ≈ 4 000 rpm, con >90% resueltas como `304`.

## Verificación
Prueba de carga con k6: 200 clientes sondeando 3 s durante 10 min mantienen p95 ≤ 200 ms y ≥ 90% de respuestas `304`.
