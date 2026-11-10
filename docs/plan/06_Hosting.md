# Carta v1 — Dónde alojar la primera versión

**Versión:** 1.0 · **Fecha:** 5 de noviembre de 2026 · **Decisión:** [ADR-015](../mvp/adr/ADR-015-primer-despliegue-railway.md) (aceptada el 5 de noviembre de 2026) · **Contexto:** [02 §11](02_Arquitectura_v1.md)

> Los precios son los publicados en noviembre de 2026 según fuentes de terceros y cambian seguido; **confírmalos en la página de cada proveedor antes de dar la tarjeta.** Lo que no cambia es la forma de cobrar de cada uno, que es lo que decide.

---

## 1. Qué necesita Carta de un proveedor

| Necesidad | Por qué | Qué descarta |
|---|---|---|
| **Un proceso que vive todo el tiempo** | El procesador de importaciones, la limpieza de idempotencia y el cierre de sesiones por inactividad corren dentro de la API (sin cola externa) | Funciones serverless que mueren al responder |
| **Muchas peticiones pequeñas y constantes** | Sondeo cada 3 s por comensal y cada 5 s por mesero: cientos de peticiones por segundo que responden `304` en menos de 1 ms | Cobro por invocación |
| **PostgreSQL con transacciones** | `FOR UPDATE` al confirmar, índices parciales, triggers | Bases "serverless" que facturan por consulta cuando se sondea |
| **Costo fijo y bajo, sin sorpresas** | No hay ingresos; una persona paga de su bolsillo | Cobro por uso sin tope |
| **Operable sin ser experto en nube** | Una persona; despliegue desde el teléfono si hace falta | Kubernetes y redes privadas |
| **Portable** | ADR-012: imagen Docker + PostgreSQL + S3 compatible | SDKs propietarios |
| **Cerca de México** | Latencia ~60 ms es aceptable porque el borde (Cloudflare) sirve menú y fotos | Nada; es un empate menor |

---

## 2. Las opciones

### Vercel
Lo que es: plataforma de frontend con funciones serverless. Python/FastAPI se despliega "sin configuración", con *Fluid compute* para atender varias peticiones por instancia.

- **A favor:** despliegue desde GitHub en minutos; plan Hobby gratis (no comercial) y Pro a 20 USD con 20 USD de crédito; red de borde excelente para el frontend.
- **En contra:** **no es un servidor**: cada petición es una invocación con duración máxima y sin estado garantizado entre llamadas; las tareas en segundo plano de FastAPI pueden morir con la instancia; no hay PostgreSQL propio (se contrata aparte, p. ej. Neon); el cobro por CPU activa e invocaciones castiga justo el patrón de Carta (sondeo constante); sin región en México.
- **Precio:** 0 USD en Hobby (sólo uso personal) o 20 USD + uso en Pro; más la base de datos aparte (0–19 USD).
- **Veredicto:** **no para la API.** Serviría para el frontend estático, pero partir frontend y API en dos dominios rompe "un dominio, un despliegue" (cookies, CORS) sin ganar nada que Cloudflare no dé ya.

### Netlify
Lo que usó Alerta Roja MX: **Netlify Drop** publica un HTML estático arrastrándolo al navegador. Para un mapa estático fue la decisión correcta y la lección vale: *publica en minutos lo mínimo que resuelve el dolor*.

- **A favor:** gratis para estáticos; despliegue en segundos.
- **En contra:** mismo modelo de funciones serverless que Vercel para cualquier backend; sin PostgreSQL; su subdominio genérico fue justo lo que alimentó los rumores de "sitio falso" en esa historia (lección: dominio propio desde el día uno).
- **Veredicto:** no para Carta. Sí vale la lección de velocidad.

### Railway
Lo que es: plataforma que corre contenedores de larga duración con PostgreSQL incluido, desplegando desde GitHub o un Dockerfile. Cobra por los recursos que de verdad consumes, por segundo.

- **A favor:** la experiencia más cercana a "tener un servidor sin administrarlo": `Dockerfile` → servicio; PostgreSQL con volumen en dos clics; variables de entorno, logs, métricas y dominio propio con TLS desde el panel; servicios con horario (cron) para el respaldo; escala vertical automática hasta el límite del plan y réplicas en Pro; funciona bien con el patrón de sondeo (no cobra por petición); migrar fuera es `pg_dump` + el mismo Dockerfile.
- **En contra:** cobro por uso (RAM ≈ 10 USD/GB-mes, CPU ≈ 20 USD/vCPU-mes, volumen ≈ 0.15–0.25 USD/GB): barato al arrancar pero **1.5–2× el costo de una VM a partir de ~50 restaurantes**; el plan Hobby exige tarjeta desde marzo de 2026; sin región en México (EE. UU. oeste y este, Europa, Singapur); los respaldos de volumen dependen del plan, así que se mantiene el respaldo propio a R2; cambios de precios en 2025–2026.
- **Precio estimado para Carta:** Hobby 5 USD/mes (incluye 5 USD de uso). API + PostgreSQL en reposo consumen ~0.5 GB y casi nada de CPU → **≈ 5–10 USD/mes** al arrancar; **≈ 20–25 USD/mes** con 10 restaurantes en pico; ≈ 60–90 USD con 100.
- **Veredicto:** **la opción con menos fricción para una persona que no quiere administrar un servidor**, al costo de pagar por uso.

### Render
Lo que es: plataforma de contenedores y servicios web con precio fijo por instancia y PostgreSQL administrado con respaldos.

- **A favor:** precio **fijo y predecible**; PostgreSQL administrado con respaldos diarios en los planes de pago; despliegue desde GitHub; TLS y dominio propio; *cron jobs* y *background workers* como servicios.
- **En contra:** el plan gratuito duerme el servicio tras 15 min (inútil para un restaurante); el PostgreSQL gratuito caduca a los 30 días; instancias pequeñas (Starter 512 MB / 0.5 CPU) que se quedan cortas antes que una VM del mismo precio; sin región en México; reestructuró sus planes de equipo en abril de 2026.
- **Precio estimado:** servicio Starter 7 USD + PostgreSQL básico 6–7 USD → **≈ 13–14 USD/mes** al arrancar; ≈ 25–45 USD con 10 restaurantes (instancia Standard); más al crecer.
- **Veredicto:** segunda opción si se quiere PaaS con factura fija. Un poco más caro y menos flexible que Railway al principio; más predecible después.

### Fly.io
Lo que es: máquinas virtuales ligeras (Firecracker) en muchas regiones, desplegadas con `flyctl` y un Dockerfile.

- **A favor:** **tiene región en Querétaro (`qro`)**, la única de esta lista en México; máquinas muy baratas (2–5 USD); escala a cero y réplicas por región; buen ajuste para Docker.
- **En contra:** más cercano a administrar infraestructura que Railway o Render (`flyctl`, volúmenes, `fly.toml`); PostgreSQL "administrado" de Fly es reciente y caro para esta escala, y el no administrado lo operas tú (lo que quita la ventaja sobre la VM); en 2026 agregaron cobros por instantáneas de volúmenes y tráfico entre regiones que hicieron menos predecible la factura; curva de aprendizaje mayor.
- **Precio estimado:** máquina 1 vCPU / 1 GB ≈ 5–7 USD + PostgreSQL propio en otra máquina con volumen ≈ 5–10 USD → **≈ 10–17 USD/mes**; con PostgreSQL administrado, 40+ USD.
- **Veredicto:** interesante por Querétaro y precio, pero exige más operación que la VM sin dar PostgreSQL administrado barato. Para después, si la latencia importara.

### DigitalOcean App Platform
Lo que es: PaaS de DigitalOcean (contenedores + PostgreSQL administrado).

- **A favor:** precio fijo; PostgreSQL administrado con respaldos; buena documentación; si ya se usa un Droplet, mismo proveedor.
- **En contra:** PostgreSQL administrado desde ~15 USD; instancias básicas pequeñas; sin México; menos fluido que Railway para desplegar.
- **Precio estimado:** 5 USD (básico) + 15 USD (PostgreSQL) → **≈ 20 USD/mes**.
- **Veredicto:** correcto pero sin ventaja clara sobre Railway o Render.

### Google Cloud Run + Cloud SQL
Lo que es: contenedores sin servidor que escalan a cero y PostgreSQL administrado, en Google Cloud (región en Querétaro).

- **A favor:** escala automática real (de 0 a N instancias) con cobro por uso; región en México; PostgreSQL administrado con PITR; el repositorio ya tiene Terraform para esto; crédito inicial de Google Cloud.
- **En contra:** **más piezas y conceptos** (cuenta de facturación, proyecto, IAM, Artifact Registry, conector de Cloud SQL, dominio por balanceador en Querétaro); arranques en frío si se escala a cero (mitigable con 1 instancia mínima, que cuesta); Cloud SQL es el componente caro (12–40 USD) y la instancia compartida no tiene SLA; las tareas en segundo plano en Cloud Run requieren "CPU siempre asignada" (cuesta más) o un Cloud Run Job aparte.
- **Precio estimado:** **≈ 15–35 USD/mes** al arrancar (análisis del 26 de octubre); ≈ 70–125 con 10 restaurantes.
- **Veredicto:** el destino cuando un disparador de [02 §11.3](02_Arquitectura_v1.md) lo pida. No para empezar: es la opción con más fricción para quien no conoce la nube.

### AWS (App Runner, ECS Fargate, Lightsail)
- **App Runner / Fargate + RDS:** equivalentes de Cloud Run + Cloud SQL con más configuración (VPC, roles IAM, balanceador) y RDS más caro al arrancar. Región en Querétaro (mx-central-1) desde 2025.
- **Lightsail:** una VM simplificada (5–12 USD) con PostgreSQL administrado opcional (15 USD). Es una VM con otro nombre; sin Querétaro en Lightsail.
- **Veredicto:** sólo si llega un crédito de AWS. La misma imagen corre ahí en un día.

### VPS con Docker Compose (Hetzner, Vultr, DigitalOcean Droplet) — el ADR-012
Lo que es: una máquina virtual tuya con Docker; Caddy, la API, PostgreSQL y el respaldo en un `docker-compose.yml`.

- **A favor:** **el más barato** (Hetzner CX22 2 vCPU / 4 GB ≈ 4.5–6 USD tras el alza de abril de 2026; Vultr en Ciudad de México ≈ 12 USD; DigitalOcean ≈ 24 USD por lo mismo); costo **fijo** independientemente del tráfico; control total; `docker compose up` reproduce todo en cualquier proveedor; 20 TB de tráfico incluidos en Hetzner.
- **En contra:** **tú eres la operación**: SSH, parches del sistema (automatizables), disco, reinicios, respaldos (scriptados en `deploy/`), seguridad del host; un solo punto de fallo; escalar es redimensionar a mano (minutos) y no hay escala automática ante un pico; la primera configuración toma 1–2 h aunque `cloud-init` la reduzca.
- **Precio estimado:** **≈ 6–12 USD/mes** al arrancar; 24–48 USD con 100 restaurantes.
- **Veredicto:** la opción óptima en costo y control; la peor en fricción inicial para alguien que no ha administrado servidores.

---

## 3. Comparación

| | Vercel / Netlify | **Railway** | Render | Fly.io | DO App Platform | Cloud Run + SQL | **VPS + Compose** |
|---|---|---|---|---|---|---|---|
| Proceso de larga duración y tareas en segundo plano | ✗ | ✓ | ✓ | ✓ | ✓ | parcial (CPU siempre asignada) | ✓ |
| PostgreSQL incluido | ✗ (aparte) | ✓ (volumen) | ✓ (administrado) | ✓ (lo operas) | ✓ (administrado) | ✓ (administrado) | ✓ (lo operas) |
| Cobro por petición | sí | no | no | no | no | sí (por instancia-segundo) | no |
| Costo mes 1 | 0–20 + BD | **5–10** | 13–14 | 10–17 | 20 | 15–35 | **6–12** |
| Costo con 10 restaurantes | — | 20–25 | 25–45 | 20–30 | 30–45 | 70–125 | 8–12 |
| Costo con 100 restaurantes | — | 60–90 | 60–100 | 40–60 | 60–100 | 150+ | 24–48 |
| Factura predecible | no | media | **sí** | media | sí | no | **sí** |
| Operación que recae en ti | poca | **mínima** | mínima | media | mínima | media | **toda** |
| Fricción del primer despliegue | baja | **muy baja** | baja | media | baja | **alta** | media-alta |
| Región en México | ✗ | ✗ | ✗ | **✓ Querétaro** | ✗ | **✓ Querétaro** | Vultr CDMX |
| Escala ante un pico sin tocar nada | ✓ | ✓ (vertical) | ✗ | ✓ | ✗ | **✓** | ✗ |
| Portabilidad (misma imagen en otro lado) | baja | **alta** | alta | alta | alta | alta | **alta** |
| Respaldos de la base | depende | propios (R2) | incluidos | propios | incluidos | incluidos + PITR | propios (R2) |

---

## 4. Recomendación

**Primer despliegue en Railway; la VM queda como el camino de ahorro y Cloud Run como el de escala.** Razones, en orden:

1. **Tu restricción más fuerte es la fricción, no los 5 dólares.** Entre una VM (6–12 USD) y Railway (5–10 al arrancar, 20–25 con 10 restaurantes) la diferencia durante el piloto es menor que una comida, y Railway te quita por completo la administración de un servidor: sin SSH, sin parches, sin Docker daemon, sin disco lleno a las 3 de la mañana. Es exactamente la clase de fragilidad que tiró a Alerta Roja MX (infraestructura dependiente de una persona y de su luz).
2. **Es la misma imagen.** El `Dockerfile` de T-0.6 corre igual en Railway, en una VM con Compose y en Cloud Run. Elegir Railway hoy no cierra ninguna puerta: mudarse a la VM cuando la factura pase de ~40 USD/mes es un `pg_dump`, un `docker compose up` y un cambio de DNS. ADR-012 (portable, Cloudflare delante, sin Redis, sin SDKs propietarios) sigue completo.
3. **Escala sola ante un pico.** Railway sube los recursos del servicio hasta el límite del plan sin intervención; la VM se queda plana hasta que la redimensiones. Con Cloudflare absorbiendo las lecturas, eso cubre un video viral sin que estés despierto.
4. **Vercel y Netlify no sirven para la API** por diseño (funciones que mueren, cobro por invocación, sin estado). Render es la alternativa seria si prefieres factura fija; Fly.io, si la región de Querétaro llegara a importar.
5. **Cloud Run es para después**, cuando los disparadores de 02 §11.3 lo pidan y ya conozcas la nube con Railway de por medio.

**Lo que cambia en el plan** (ADR-015): T-0.6 deja la imagen lista para cualquier destino (la API sirve también el frontend, como el ADR-010 original); T-0.7 despliega en Railway y deja documentado el camino de VM en `deploy/vps/` sin ejecutarlo. Cloudflare sigue delante (DNS, caché del menú, límites de tasa) apuntando al dominio de Railway. El respaldo a R2 se mantiene como servicio con horario en Railway.

**Confirmado por Calvin el 5 de noviembre de 2026:** Railway como primer destino. La VM (más barata, operada por uno mismo) sigue documentada en `05_Operacion.md` Anexo A por si cambia la decisión.

---

## Fuentes consultadas (noviembre de 2026)

Railway: [MakerKit calculadora](https://makerkit.dev/pricing-calculator/railway), [Server Compass](https://servercompass.app/blog/railway-pricing-what-youll-actually-pay), [FrontDesk Review](https://frontdeskreview.com/software/managed-postgres/railway/), [DEV: reseña 2026](https://dev.to/build996/railway-app-review-2026-the-best-heroku-alternative-for-developers-1j8o). Comparativas PaaS: [DEV: Fly vs Railway vs Render 2026](https://dev.to/whoffagents/flyio-vs-railway-vs-render-in-2026-where-to-deploy-your-ai-saas-with-real-numbers-3b0f), [DEV: para desarrolladores solos](https://dev.to/devtoolpicks/railway-vs-render-vs-flyio-for-solo-developers-in-2026-5ddf), [Encore: Render vs Railway](https://encore.dev/articles/render-vs-railway), [sota.io: comparación de precios](https://sota.io/blog/railway-vs-render-vs-fly-pricing-2026). Vercel: [límites de funciones](https://vercel.com/docs/functions/limitations?from=graph), [plataformas serverless](https://vercel.com/i/serverless-computing-platforms), [Kuberns: Python en Vercel](https://kuberns.com/blogs/vercel-python/) (competidor; leer con cautela). VPS: [Bitdoze: DO vs Vultr vs Hetzner](https://www.bitdoze.com/digitalocean-vs-vultr-vs-hetzner/), [DEV: Hetzner vs DigitalOcean 2026 tras el alza](https://dev.to/dmaxdev/hetzner-vs-digitalocean-2026-real-numbers-after-the-price-hike-35g0), [apicalculators: comparación VPS 2026](https://apicalculators.com/blog/cloud-vps-cost-comparison-2026). Cloud Run y Cloud SQL: análisis del 26 de octubre en `docs/propuestas/`.
