# ADR-012 — Un solo servidor con Docker Compose, imagen portable, Cloudflare delante

**Estado:** aceptada · **Fecha:** 2026-11-02 · **Decide:** Calvin · **Enmienda:** ADR-001 (sigue siendo monolito; cambia dónde corre), ADR-007 (dos buckets, pero en R2), ADR-010 (los estáticos los sirve Caddy)

## Contexto
El TDD de agosto desplegaba en Cloud Run con Cloud SQL, Memorystore, VPC y conector (~130–160 USD/mes desde el primer día). La propuesta del 26 de octubre lo reducía a Cloud Run + Cloud SQL (~15–35 USD). El objetivo ahora es más estricto: **la primera versión con un solo servidor, lo más barata posible, operable por una persona que no conoce la nube, y que escale sin rehacer nada.** Además, la forma del tráfico de Carta es favorable: las lecturas (menú, fotos) son cacheables en el borde y las escrituras están acotadas por mesas físicas.

## Decisión
1. **Una máquina virtual** (2 vCPU / 4 GB al arrancar) con Docker Compose: Caddy (HTTPS y estáticos), la API en uvicorn con N workers, PostgreSQL 16 y un contenedor de respaldo. Staging y producción son dos stacks en la misma VM.
2. **Cloudflare (plan gratuito) delante:** DNS, TLS, caché del menú y estáticos, límites de tasa y protección básica. **Cloudflare R2** para fotos, originales y respaldos (API S3, egreso gratis).
3. **La aplicación es portable:** sin SDKs propietarios; PostgreSQL, S3 compatible y variables de entorno. La misma imagen corre en la VM, en Cloud Run o en ECS.
4. **Sin Redis:** caché del menú en proceso (30 s) y en el borde (60 s); ETags en memoria con vida de 2 s; idempotencia en la tabla `clave_idempotencia`; límites de tasa en proceso y en Cloudflare.
5. **Crecimiento por disparadores** (`docs/plan/02_Arquitectura_v1.md` §11.3): vertical primero; segunda VM y base administrada a partir de ~60 restaurantes; Redis a partir de 3 instancias; Cloud Run cuando la operación canse a una persona. **Cuando haga falta nube administrada, Google Cloud** (Cloud Run es el producto más simple, hay región en Querétaro y el Terraform existente apunta ahí).
6. **Despliegue** con GitHub Actions: imagen por commit en GHCR → `ssh` → migraciones → `compose up --wait`. Rollback = etiqueta anterior.

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| Cloud Run + Cloud SQL (propuesta del 26 de octubre) | 2–3 veces más caro al arrancar, más piezas que aprender, y el costo varía con el tráfico (un video viral puede generar una factura) |
| PaaS (Fly.io, Railway, Render) | Más simple que una VM al principio, pero la base administrada cuesta 15–25 USD y el proveedor es menos conocido; una VM con Compose se entiende completa y se mueve a cualquier lado |
| Kubernetes | Nunca para un piloto de una persona |
| Serverless puro (funciones) | Arranques en frío en el camino del comensal; transacciones multi-tabla incómodas |
| Alojar PostgreSQL administrado desde el día uno (Neon, Supabase) | Buena opción a partir de ~10 restaurantes; al arrancar, duplica el costo sin necesidad |

## Consecuencias
- **Positivas:** 10–15 USD/mes; un `docker compose up` reproduce todo; latencia predecible; costo que no depende del tráfico; una persona puede operarlo desde el teléfono (rollback y reinicio con un comando o un botón).
- **Negativas:** un punto único de fallo (mitigado con respaldos diarios probados, `cloud-init` para recrear la VM en < 1 h y Cloudflare que absorbe las lecturas); las actualizaciones del sistema operativo las hace uno (automáticas para seguridad); sin SLA hasta la Etapa 2.
- **Lección de Alerta Roja MX aplicada:** dominio propio y HTTPS desde el día uno; el borde absorbe la virabilidad; el panel y el despliegue son accesibles desde el teléfono para no depender de una computadora ni de la luz de casa.

## Verificación
- `docker compose -f deploy/docker-compose.prod.yml config` válido; `curl https://staging.<dominio>/health` → 200.
- `grep -rl "google.cloud\|boto3.client('lambda'\|redis" app/ | wc -l` = 0 (sólo S3 compatible vía `boto3`).
- Prueba de carga de `docs/plan/02_Arquitectura_v1.md` §10.3 en verde en una VM de 2 vCPU con 10 restaurantes en pico.
