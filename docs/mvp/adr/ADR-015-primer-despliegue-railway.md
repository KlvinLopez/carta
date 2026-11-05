# ADR-015 — Primer despliegue en Railway; la VM queda como camino de ahorro y Cloud Run como camino de escala

**Estado:** aceptada (Calvin, 2026-11-05) · **Fecha:** 2026-11-05 · **Complementa:** ADR-012 (portabilidad, Cloudflare delante, sin Redis, sin SDKs propietarios: todo sigue vigente) · **Enmienda:** ADR-010 vuelve a su forma original (la API sirve los estáticos)

## Contexto
ADR-012 fijó una VM con Docker Compose como primer destino por costo y control. Al comparar con las plataformas de contenedores (análisis en `docs/plan/06_Hosting.md`), la diferencia de costo durante el piloto es de 5–15 USD/mes, mientras que la diferencia de operación es completa: en una VM, una sola persona que no ha administrado servidores asume SSH, parches, disco, reinicios y seguridad del host. La restricción dominante del proyecto es la fricción, no esos dólares.

## Decisión
1. **El primer despliegue se hace en Railway**: un servicio para la API (desde el `Dockerfile`), un servicio de PostgreSQL con volumen, un servicio con horario para el respaldo a R2, variables de entorno en el panel, dominio propio detrás de Cloudflare. Staging y producción son dos *environments* del mismo proyecto.
2. **La imagen es agnóstica del destino.** La API sirve también `frontend/dist` con cabeceras de caché (ADR-010 original); Caddy se usa sólo en la variante de VM. Ningún archivo de la aplicación sabe en qué proveedor corre.
3. **La VM con Compose sigue documentada y lista** en `deploy/vps/` (T-0.7 la deja escrita, no ejecutada). Se adopta cuando la factura de Railway supere ~40 USD/mes sostenidos o cuando se quiera control total.
4. **Cloud Run + Cloud SQL** sigue siendo el destino de escala según los disparadores de `docs/plan/02_Arquitectura_v1.md` §11.3.
5. Los respaldos de la base **no dependen del proveedor**: `pg_dump` cifrado a R2 todas las noches, con restauración probada mensualmente, igual que en ADR-012.

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| VM con Compose desde el día uno (ADR-012) | Más barata, pero la operación recae en una persona sin experiencia; es el mismo tipo de fragilidad que tumbó a Alerta Roja MX. Queda como segundo paso |
| Render | Factura fija y PostgreSQL con respaldos incluidos, pero instancias más chicas por el mismo precio y sin escala automática. Segunda opción válida |
| Fly.io | Región en Querétaro, pero PostgreSQL lo operas tú y la facturación cambió en 2026; más operación que Railway |
| Vercel o Netlify | Funciones serverless: sin proceso de larga duración, cobro por invocación, sin PostgreSQL. No sirven para la API |
| Cloud Run + Cloud SQL | Es el camino de escala; para empezar tiene demasiadas piezas |

## Consecuencias
- **Positivas:** primer despliegue en menos de una hora sin tocar un servidor; escala vertical automática ante un pico; logs y métricas sin instalar nada; la misma imagen migra a cualquier otro destino.
- **Negativas:** cobro por uso (≈ 1.5–2× una VM a partir de ~50 restaurantes); sin región en México (irrelevante con Cloudflare delante); dependencia de un proveedor pequeño (mitigada por la portabilidad y los respaldos propios).
- **En el plan:** T-0.6 y T-0.7 cambian de redacción (ver registro de cambios de `04_Fases_y_Tareas.md`); 05_Operacion §2 describe Railway y deja la VM en un anexo.

## Verificación
`curl -sf https://staging.<dominio>/health` responde desde Railway; `docker build . && docker run -p 8000:8000 carta` sirve `/` (PWA) y `/api/v1/...` sin ningún proveedor; `deploy/vps/README.md` existe y `docker compose -f deploy/vps/docker-compose.yml config` es válido.
