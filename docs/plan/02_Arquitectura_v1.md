# Carta v1 — Arquitectura

**Versión:** 1.0 · **Fecha:** 2 de noviembre de 2026 · **ADRs:** [012](../mvp/adr/ADR-012-un-servidor-portable.md), [013](../mvp/adr/ADR-013-personal-con-pin.md), [014](../mvp/adr/ADR-014-importacion-menu-con-llm.md); siguen vigentes [001](../mvp/adr/ADR-001-monolito.md), [002](../mvp/adr/ADR-002-pwa-vs-nativa.md), [003](../mvp/adr/ADR-003-identidad-invitado.md), [004](../mvp/adr/ADR-004-sondeo-vs-websockets.md), [008](../mvp/adr/ADR-008-esquema-espanol.md), [009](../mvp/adr/ADR-009-driver-async.md), [010](../mvp/adr/ADR-010-hosting-frontend.md).

---

## 1. Principios

1. **Un servidor, una imagen, una base.** Todo corre en una máquina virtual con Docker Compose. Lo que se agrega después se agrega porque un número lo pidió (§11).
2. **Portable.** La aplicación no usa ningún SDK propietario de nube: PostgreSQL, almacenamiento compatible con S3 y variables de entorno. La misma imagen corre en la VM, en Cloud Run o en ECS.
3. **Las lecturas no tocan el servidor.** El menú es público y cacheable en el borde (Cloudflare); los sondeos responden `304` sin ir a la base. Una ola de tráfico (el video viral de Alerta Roja MX) la absorbe el borde; las escrituras están acotadas por las mesas físicas.
4. **Costo determinista.** Una VM cuesta lo mismo con 10 que con 10,000 visitas. Nada de facturas sorpresa en una fase donde no hay ingresos.
5. **Operable por una persona desde el teléfono.** Panel de administración, monitoreo y despliegue accesibles sin computadora.
6. **Confianza desde el primer día.** Dominio propio con HTTPS, página de quién está detrás, aviso de privacidad.

---

## 2. Diagrama

```mermaid
flowchart LR
  subgraph Usuarios
    C["Comensal<br/>navegador del celular"]
    P["Personal<br/>celular"]
    O["Operador<br/>celular o computadora"]
  end

  CF["Cloudflare (gratis)<br/>DNS · TLS · CDN · límites de tasa · WAF básico"]

  subgraph VM["Una VM · Docker Compose"]
    CADDY["Caddy<br/>HTTPS · estáticos de la PWA · proxy /api"]
    APP["carta-api<br/>FastAPI · uvicorn (N workers)"]
    PG[("PostgreSQL 16")]
    BK["respaldo<br/>pg_dump nocturno"]
  end

  R2[("Cloudflare R2<br/>S3 compatible · egreso gratis<br/>fotos públicas · originales privados · respaldos")]
  LLM["API de Claude<br/>PDF → borrador de menú"]
  FB["Firebase Auth<br/>sólo operadores"]
  SEN["Sentry · UptimeRobot<br/>errores · disponibilidad"]

  C --> CF
  P --> CF
  O --> CF
  CF --> CADDY
  CADDY --> APP
  APP --> PG
  APP -->|sube variantes| R2
  C -.->|fotos por CDN| R2
  APP -->|importación| LLM
  APP -->|verifica token| FB
  APP --> SEN
  BK --> PG
  BK --> R2
```

**Dos entornos en una VM:** `staging` y `prod` como dos stacks de Compose (puertos distintos, bases distintas en la misma instancia de PostgreSQL, subdominios distintos). Cada push a `master` despliega staging; cada etiqueta `v*` promueve la misma imagen a prod.

---

## 3. Stack

| Capa | Elección | Por qué |
|---|---|---|
| Lenguaje y API | Python 3.12 · FastAPI · SQLAlchemy 2 async · asyncpg · Alembic · Pydantic v2 · `uv` | Ya decidido en el paquete MVP; `uv` sustituye a pip/venv por velocidad y bloqueo de versiones |
| Calidad | `ruff` (lint **y** formato) · `mypy` · `pytest` | Un solo formateador; `black` se retira |
| Base de datos | PostgreSQL 16 en la misma VM (contenedor con volumen) | Transacciones ACID entre sesión, orden y comanda; cero costo adicional |
| Archivos | Cloudflare R2 (API S3) · en desarrollo, carpeta local o MinIO | 10 GB gratis y **egreso gratis**: las fotos son lo que más tráfico genera |
| Frontend | Vite · React 18 · TypeScript · una SPA con tres áreas (`/m`, `/staff`, `/admin`) con *code splitting* · PWA | El prototipo ya está en React; tres áreas en un build evitan tres pipelines |
| Servidor web | Caddy 2 | HTTPS automático, sirve los estáticos, proxy a la API, cabeceras de seguridad en 10 líneas |
| Borde | Cloudflare plan gratuito (proxy naranja) | DNS, TLS, caché del menú y estáticos, límites de tasa, protección DDoS |
| Autenticación | Comensal: JWT de invitado en cookie (ADR-003) · Personal: PIN → cookie de 12 h (ADR-013) · Operador: Firebase Auth (Google y enlace por correo) | Tres audiencias, tres mecanismos, ninguno comparte credenciales |
| IA | API de Claude: `claude-opus-5-5` con documento PDF y salida estructurada | Ver §7 |
| Correo | Resend (3,000 correos/mes gratis) | Enlaces de acceso del operador y avisos |
| Monitoreo | Sentry (gratis) · UptimeRobot (gratis) · logs JSON con `request_id` | Ver 05 |
| CI/CD | GitHub Actions → imagen en GHCR → `ssh` a la VM → `docker compose pull && up` | Sin agentes ni runners propios |
| Infraestructura como código | `deploy/` con `docker-compose.prod.yml`, `Caddyfile`, `cloud-init.yml` para crear la VM | Terraform de GCP se archiva en `terraform/` para la Etapa 2 |

**Qué se retira del TDD de agosto:** Redis/Memorystore (caché e idempotencia van en proceso y en PostgreSQL), Cloud Run y Cloud SQL (Etapa 2), VPC y conector, worker 3D y cola, conversión USDZ, `black`.

---

## 4. Cómo se sirve cada cosa

| Petición | Ruta | Quién responde | Caché |
|---|---|---|---|
| PWA y estáticos | `/`, `/m/*`, `/staff/*`, `/admin/*`, `/assets/*` | Caddy desde `frontend/dist` | Cloudflare 1 año (nombres con hash); `index.html` sin caché |
| Menú público | `GET /api/v1/p/menu/{slug}` | API, **sin cookie**, `Cache-Control: public, max-age=30, s-maxage=60` + `ETag` | Cloudflare 60 s; purga por API al editar un platillo |
| Fotos de platillos | `https://img.<dominio>/...` | R2 detrás de Cloudflare | 1 año, nombres inmutables por hash |
| Sondeo del comensal | `GET /api/v1/p/sesion` cada 3 s con `If-None-Match` | API; `304` si el ETag coincide (ETag en memoria, invalidado al escribir) | Nunca en el borde (`Cache-Control: private, no-store`) |
| Sondeo del personal | `GET /api/v1/op/mesas` cada 5 s | API; igual | Igual |
| Escrituras | `POST/PATCH/DELETE` | API → PostgreSQL | — |
| Importación de PDF | `POST /api/v1/admin/.../importaciones` | API encola en `importacion_menu`; un *task* en proceso llama a la API de Claude | — |

El menú se sirve **por `slug` del restaurante y sin depender de la cookie** justamente para que el borde pueda cachearlo. La sesión del comensal sólo necesita el menú para precios al agregar, y esos se leen siempre de la base (regla dura 4).

---

## 5. API v1

Convenciones (prefijos, envoltura de error, idempotencia, versionado) como en [`04_API_Spec.md` §1](../mvp/04_API_Spec.md), con dos cambios: la idempotencia se guarda en la tabla `clave_idempotencia` en lugar de Redis, y el prefijo `/op` lo usa el personal con cookie `carta_personal`.

### 5.1 Comensal `/api/v1/p` (cookie `carta_invitado`)

| Método y ruta | Qué hace | Historia |
|---|---|---|
| `POST /sesion/entrar` `{codigo}` | Crea o reanuda sesión y miembro; emite cookie | US-01, US-02 |
| `GET /sesion` | Estado de la mesa: miembros, estados, mi orden, comandas y su estado. ETag | US-02, US-11, US-12 |
| `PATCH /miembro` `{alias}` | Cambiar alias | US-03 |
| `GET /menu/{slug}` | Menú activo por categorías. Público, cacheable | US-04 |
| `GET /platillos/{id}` | Detalle | US-04 |
| `POST /orden/items` · `PATCH /orden/items/{id}` · `DELETE /orden/items/{id}` | Mi orden | US-10 |
| `POST /orden/confirmar` · `POST /orden/deshacer` | `Idempotency-Key` | US-11, US-12 |
| `POST /llamar-mesero` | 1 por minuto por sesión | US-12 |
| `POST /eventos` | Lotes de hasta 50 eventos | US-24 |

### 5.2 Personal `/api/v1/op` (cookie `carta_personal`)

| Método y ruta | Qué hace | Historia |
|---|---|---|
| `GET /personal/{slug}` | Lista de nombres activos para la pantalla de entrada (sin PIN) | US-26 |
| `POST /entrar` `{slug, personal_id, pin}` | Cookie de 12 h. Límite 5/min | US-26 |
| `POST /salir` | Cierra sesión | US-26 |
| `GET /mesas` | Mesas con estado y tiempos. ETag | US-28 |
| `GET /mesas/{id}` | Comanda(s) de la mesa por comensal, llamadas | US-13 |
| `GET /comandas?estado=abierta` | Comandas y llamadas pendientes. ETag | US-13, US-14 |
| `POST /comandas/{id}/atender` · `POST /comandas/{id}/servir` | Transiciones | US-13 |
| `POST /llamadas/{id}/atender` | | US-14 |
| `POST /mesas/{id}/liberar` | Cierra la sesión de la mesa | US-28 |
| `GET /platillos?q=` · `POST /platillos/{id}/disponible` `{disponible}` | Agotado / de vuelta | US-27 |
| `GET /resumen` | Sólo capitán: métricas del turno | US-26 |

### 5.3 Operador `/api/v1/admin` (`Authorization: Bearer <Firebase ID token>`)

| Método y ruta | Qué hace | Historia |
|---|---|---|
| `POST /restaurantes` | Alta: crea restaurante y al operador como propietario | US-15 |
| `GET /restaurantes` · `GET /restaurantes/{rid}` · `PATCH /restaurantes/{rid}` | Mis restaurantes; nombre, logo, slug | US-15 |
| `POST /restaurantes/{rid}/importaciones` (multipart) · `GET .../importaciones/{id}` · `POST .../importaciones/{id}/confirmar` · `POST .../importaciones/{id}/reintentar` | Importar menú desde PDF | US-25 |
| `GET/POST /restaurantes/{rid}/categorias` · `PATCH/DELETE /categorias/{id}` · `POST .../categorias/reordenar` | Categorías | US-16 |
| `GET/POST /restaurantes/{rid}/platillos` · `PATCH/DELETE /platillos/{id}` · `POST .../platillos/reordenar` | Platillos (`DELETE` = desactivar) | US-16 |
| `POST /platillos/{id}/foto` · `DELETE /platillos/{id}/foto` | Foto con variantes | US-17 |
| `GET/POST /restaurantes/{rid}/mesas` · `POST /mesas/{id}/regenerar` · `GET /restaurantes/{rid}/mesas/qr.pdf` | Mesas y QR | US-21 |
| `GET/POST /restaurantes/{rid}/personal` · `PATCH /personal/{id}` · `POST /personal/{id}/pin` | Personal y PIN | US-26 |
| `GET /restaurantes/{rid}/resumen` | Escaneos y órdenes de hoy y de la semana | US-24 |
| `GET /restaurantes/{rid}/mesas-vivo` | Misma vista que `/op/mesas`, con permisos de operador | US-13 |

### 5.4 Infraestructura

`GET /health` (proceso vivo), `GET /ready` (base y almacenamiento accesibles), `GET /openapi.json`, páginas `/acerca`, `/privacidad`, `/terminos` servidas como estáticos.

---

## 6. Tiempo real: sondeo con ETag, adaptativo

Se mantiene el ADR-004 (sin WebSockets) con una mejora: el intervalo se adapta.

| Pantalla | Visible y activa | Visible sin cambios > 2 min | Pestaña oculta |
|---|---|---|---|
| Comensal `/sesion` | 3 s | 10 s | pausa; al volver, una petición inmediata |
| Personal `/mesas` | 5 s | 5 s | pausa; al volver, inmediata + aviso si hubo comandas nuevas |

El ETag de la sesión se calcula con `max(actualizado_en)` de sesión, miembros, órdenes y comandas de esa mesa, y se guarda en un diccionario en memoria por `sesion_id`, invalidado por el propio servicio al escribir. Con un solo proceso de API (varios *workers* de uvicorn comparten la base pero no la memoria) el diccionario puede estar desactualizado como mucho un ciclo de sondeo: por eso el ETag en memoria tiene vida máxima de 2 s y después se recalcula con una consulta por índice (< 1 ms).

---

## 7. Importar el menú desde un PDF

```mermaid
sequenceDiagram
  participant O as Operador
  participant A as API
  participant D as PostgreSQL
  participant S as R2 privado
  participant L as API de Claude

  O->>A: POST importaciones (PDF)
  A->>A: valida tipo por contenido, ≤ 20 MB, ≤ 30 páginas
  A->>S: guarda el original
  A->>D: INSERT importacion_menu (pendiente)
  A-->>O: 202 {id}
  A->>A: tarea en segundo plano
  A->>D: UPDATE procesando
  A->>L: documento PDF + instrucciones + esquema de salida
  L-->>A: JSON validado (categorías, platillos, precios, confianza)
  A->>D: UPDATE listo + resultado
  loop cada 3 s
    O->>A: GET importaciones/{id}
  end
  O->>O: revisa y corrige la tabla
  O->>A: POST confirmar (JSON revisado)
  A->>D: INSERT categorías y platillos en una transacción
```

- **Modelo:** `claude-opus-5-5` con el PDF como bloque `document` (hasta 32 MB y 600 páginas; nuestro límite es 30 páginas) y **salida estructurada** (`output_config.format` + `client.messages.parse()` contra un esquema Pydantic). Opus 5.5 por defecto porque las cartas son desordenadas (dos columnas, precios con "$" y sin él, variantes "chico/grande") y el costo es de una sola vez por restaurante. Si el costo importa más, `claude-haiku-5-5` es la alternativa; se mide con las 5 cartas de prueba.
- **Costo:** una carta de 10 páginas ≈ 15–30 mil tokens de entrada y ~5 mil de salida → **≈ $0.15–0.25 USD por importación** con Opus 5.5 (≈ $0.01 con Haiku 5.5). Diez restaurantes: menos de $3.
- **Salida:** `categorias[] → platillos[] {nombre, descripcion, precio, precio_confianza (alta|media|baja), alergenos_sugeridos[], etiquetas_sugeridas[], variantes[]}`. Lo marcado `baja` se resalta en la tabla.
- **El operador siempre revisa.** Nada entra al menú sin confirmar (AC-25.3). Esto es la "validación manual primero" de la plática: con 10 restaurantes vemos qué falla antes de automatizar más.
- **Seguridad:** el PDF se trata como no confiable (validación por *magic bytes*, sin ejecutar nada), se guarda en el bucket privado y las instrucciones al modelo dicen que el documento es datos, no instrucciones.
- **Reintentos:** 3, con pausa exponencial; tras el tercero, `fallido` con causa legible.

---

## 8. Imagen del platillo

| Prioridad | Fuente | v1 |
|---|---|---|
| 1 | **Foto tomada por el restaurante** con la guía de captura del panel (luz natural, fondo neutro, desde arriba a 45°). El servidor genera miniatura 400 px y detalle 1200 px en WebP. | Sí |
| 2 | **Ilustración de respaldo por categoría** (entradas, sopas, tacos, pastas, postres, bebidas…): un juego de ~20 ilustraciones de estilo plano/low-poly, estáticas, de la marca. Cero costo, cero latencia. | Sí |
| 3 | **Ilustración generada por IA** a partir de nombre y descripción, estilo cartoon/low-poly uniforme. Primero en servidor detrás de una bandera (centavos por imagen, un día de trabajo); después, experimento **en el dispositivo del operador** con WebGPU, que es lo que se pidió: funciona en computadoras con GPU y en teléfonos recientes, tarda decenas de segundos y pesa cientos de MB de descarga la primera vez. | v1.1 |
| 4 | **Modelo 3D a partir de las fotos**, generado localmente en el dispositivo del operador y revisado antes de publicar (INV-5 sigue vigente). | v2 |

Decisión de diseño: `platillo.imagen_tipo ∈ {foto, ilustracion_categoria, ilustracion_generada}` para medir cuántos platillos quedan sin foto antes de invertir en la opción 3.

---

## 9. Decisiones por tema de diseño de sistemas

Los 44 temas del mazo "System Design Basics", con la decisión de la v1 y qué la cambiaría.

| Tema | Decisión v1 | Cambia cuando |
|---|---|---|
| Cliente / servidor | PWA (SPA) + API JSON; el servidor nunca renderiza HTML de negocio | — |
| Bases de datos | Una PostgreSQL 16; esquema en español; migraciones Alembic | — |
| Caché | Menú en Cloudflare (60 s) y en proceso (30 s); ETags en memoria (2 s); sin Redis | > 3 instancias de API → Redis |
| Colas | Tabla `importacion_menu` + tarea en proceso; sin broker | > 500 trabajos/día o trabajos > 5 min → worker aparte (tabla con `SKIP LOCKED` ya diseñada) |
| Escalar | Vertical primero (2 → 4 → 8 vCPU); horizontal después (§11) | p95 > 300 ms sostenido con CPU > 70 % |
| Consistencia vs disponibilidad | Consistencia fuerte en órdenes y comandas (transacciones, `FOR UPDATE`); el menú tolera 60 s de desfase | — |
| Diseño de API | REST, `/api/v1`, envoltura de error única, `Idempotency-Key` en escrituras visibles para el personal | — |
| Replicación y sharding | Ninguno. Respaldos diarios + PITR por WAL archivado en R2 | SLA contractual → réplica administrada |
| Límites de tasa | Cloudflare (por IP, en el borde) + en proceso por token/IP (`slowapi`) | — |
| Tiempo real | Sondeo adaptativo con ETag (§6) | Latencia pedida < 1 s → SSE |
| CDN y borde | Cloudflare gratis para estáticos, menú y fotos (R2) | — |
| Búsqueda | En el cliente (menú ≤ 300 platillos, sin acentos); en el servidor `ILIKE` con `unaccent` para el personal | — |
| Microservicios vs monolito | Monolito modular (ADR-001) | — |
| Observabilidad | Logs JSON con `request_id`, Sentry, UptimeRobot, `/metrics` básico | Varias instancias → Prometheus/Grafana Cloud gratis |
| Balanceo de carga | Ninguno: Cloudflare → una VM | 2+ VMs → balanceador de Cloudflare o del proveedor |
| DNS y enrutamiento | Cloudflare DNS; `carta.<tld>`, `staging.`, `img.` | — |
| Autenticación y autorización | Tres identidades (§3); `restaurante_id` siempre del token; recurso ajeno → 404 | — |
| Control de concurrencia | `SELECT … FOR UPDATE` sobre la sesión al confirmar; índices únicos parciales (INV-1, INV-2); trigger de inmutabilidad (INV-3) | — |
| Generación de IDs | UUID v4 en la base; `codigo_publico` de mesa con 128 bits (`secrets.token_urlsafe(16)`) | — |
| Feed / timeline | No aplica | — |
| Búsqueda geoespacial | No aplica en v1 | Directorio de restaurantes (v3) |
| Notificaciones | Ninguna *push*: el sondeo cubre al comensal y al personal; sonido en el navegador del personal | Push web para el personal (v2) |
| Almacenamiento de objetos | R2 público (variantes, nombres por hash) y privado (originales, PDFs, respaldos) con URLs firmadas 15 min | — |
| Procesamiento de flujos | No aplica; analítica por consultas SQL diarias | > 10 M eventos → BigQuery/ClickHouse |
| Consenso distribuido | No aplica (una base) | — |
| Multi-región y DR | Una región; RPO ≤ 24 h con `pg_dump` diario (≤ 5 min con WAL a R2), RTO ≤ 2 h con `cloud-init` + restauración | — |
| Estrategias de despliegue | Imagen inmutable por commit; `compose pull && up` con `--wait`; migraciones compatibles hacia atrás (expandir → usar → contraer); *rollback* = etiqueta anterior | — |
| Resiliencia | Tiempos de espera en toda llamada externa (Claude 120 s, R2 10 s, Firebase 5 s); reintentos con pausa; el menú y la sesión siguen funcionando si Claude o Firebase caen | — |
| Estructuras probabilísticas | No aplica | — |
| Idempotencia y reintentos | `Idempotency-Key` 24 h en PostgreSQL; comanda única por `(sesion_id, secuencia)`; el cliente reintenta `POST` sólo con la misma clave | — |
| Kubernetes | No. Compose en una VM | Nunca en el piloto; Cloud Run/ECS antes que Kubernetes |
| Docker | Imagen multi-etapa (build del frontend → imagen Python slim, usuario sin privilegios, `HEALTHCHECK`) | — |
| Linux | Ubuntu LTS mínimo; SSH sólo con llave; `ufw` 22/80/443; actualizaciones automáticas de seguridad; `fail2ban` | — |
| Números de latencia | Objetivos en §10 | — |
| CI/CD | GitHub Actions: lint, tipos, pruebas con PostgreSQL, build, pruebas de la PWA, presupuesto de bundle → imagen → despliegue a staging → etiqueta a prod | — |
| Redes | Cloudflare proxy → Caddy :443; API y PostgreSQL sólo en la red interna de Compose | — |
| Seguridad (fundamentos) | Modelo STRIDE de `08_Security_Compliance.md` vigente; lista en 05 | — |
| Vulnerabilidades comunes | OWASP Top 10 revisado por el agente `revisor-seguridad` en cada PR; `pip-audit`, `npm audit`, Dependabot | — |
| Criptografía | TLS 1.3; JWT HS256 con secreto de 256 bits en variable de entorno; PIN con Argon2id; tokens de dispositivo sólo como hash | — |
| Proteger la pila | Secretos fuera del repo, `.env` 600 en la VM, GitHub secret scanning, dependencias fijadas (`uv.lock`, `package-lock.json`) | — |
| Red team / pentest | `/revisar` adversarial en cada PR; pentest externo antes de pagos (v2) | — |
| Protegerte a ti mismo | 2FA en GitHub, Cloudflare, proveedor de VM, Google; gestor de contraseñas; cuenta de servicio aparte para CI | — |
| Respuesta a incidentes | Procedimiento de `08_Security_Compliance.md` §8; *runbook* en 05 | — |

---

## 10. Capacidad y objetivos de latencia

### 10.1 Forma del tráfico

| Fuente | Cálculo | Por restaurante en pico | 10 restaurantes | 100 restaurantes |
|---|---|---|---|---|
| Comensales activos | 40 mesas × 3 personas | 120 | 1,200 | 12,000 |
| Sondeo del comensal | 1 petición / 3 s · 90 % responde `304` | 40 rps | 400 rps | 4,000 rps |
| Sondeo del personal | 6 dispositivos / 5 s | 1.2 rps | 12 rps | 120 rps |
| Lecturas de menú | 1 por escaneo, 60 s en el borde | ≈ 0 al origen | ≈ 0 | ≈ 0 |
| Escrituras (ítems, confirmaciones, eventos) | ~10 por comensal por visita en ~40 min | 0.5 rps | 5 rps | 50 rps |
| Fotos | ~2 MB por sesión, desde R2 | 0 al origen | 0 | 0 |

**Costo de un `304`:** verificar la cookie, leer el ETag en memoria o hacer una consulta por índice. ~0.3–0.5 ms de CPU. Una API en uvicorn con 2 *workers* en 2 vCPU sostiene ≈ 1,500–2,500 rps de este tipo, es decir, **unos 40–60 restaurantes en pico simultáneo en una VM de $10**. Con 4 vCPU, ~100. Son estimaciones: la tarea T-4.4 las sustituye por mediciones.

### 10.2 Objetivos (SLOs)

| Indicador | Objetivo | Dónde se mide |
|---|---|---|
| Menú visible (p75, 4G, teléfono medio) | ≤ 3 s | Lighthouse móvil + campo |
| `GET /p/menu` desde el borde (p95) | ≤ 100 ms | k6 desde fuera |
| Sondeo `304` en el origen (p95 / p99) | ≤ 30 ms / ≤ 80 ms | k6 + logs de Caddy |
| Lecturas con cuerpo en el origen (p95 / p99) | ≤ 150 ms / ≤ 400 ms | k6 |
| Escrituras (confirmar, agregar) (p95 / p99) | ≤ 300 ms / ≤ 800 ms | k6 |
| Tasa de error 5xx | < 0.1 % | Sentry + Caddy |
| Disponibilidad en horario de servicio (12:00–00:00) | ≥ 99.5 % | UptimeRobot |
| Comandas perdidas | 0 | Consulta diaria (G1) |

### 10.3 Pruebas de carga (k6, tarea T-4.4)

| Escenario | Carga | Lo que prueba |
|---|---|---|
| Ráfaga de escaneos | 100 `entrar` en 60 s | Creación de sesión, cookies, caché del menú |
| Sondeo sostenido | 1,000 clientes `GET /p/sesion` cada 3 s durante 10 min | p95/p99 de `304`, CPU, conexiones |
| Confirmaciones | 50 `confirmar` por minuto con 20 % de reintentos con la misma clave | Idempotencia, `FOR UPDATE`, creación única de comanda |
| Personal | 100 dispositivos `GET /op/mesas` cada 5 s | ETag con consultas por restaurante |
| Mixto realista | 10 restaurantes en pico, 30 min | Todo junto; se registra en `docs/plan/perf/` |

Se corre contra staging **antes del primer restaurante** y se repite cada vez que cambie algo del camino crítico. Palancas en orden: `workers` de uvicorn = vCPU, `pool_size` 10 por worker, índices de 03 §5, sondeo adaptativo, ETag en memoria, VM más grande.

---

## 11. Costo y crecimiento

### 11.1 Costo mensual

| Concepto | Arranque (1–10 restaurantes) | 50–100 restaurantes |
|---|---|---|
| VM 2 vCPU / 4 GB (Hetzner en Ashburn o Vultr en Ciudad de México) | 8–12 USD | 24–48 USD (4–8 vCPU) |
| Cloudflare (DNS, CDN, TLS, R2 hasta 10 GB) | 0 | 0–5 |
| Dominio | ~1 | ~1 |
| Sentry, UptimeRobot, Resend, Firebase Auth | 0 | 0–26 |
| API de Claude (importaciones) | < 3 | < 25 |
| **Total** | **≈ 10–15 USD** | **≈ 30–100 USD** |

Comparación: el diseño de agosto costaba 130–160 USD desde el primer día; la propuesta de octubre (Cloud Run + Cloud SQL), 15–35.

### 11.2 Qué proveedor

Análisis completo, con pros, contras y precios de Vercel, Netlify, Railway, Render, Fly.io, DigitalOcean, Cloud Run, AWS y VPS, en [`06_Hosting.md`](06_Hosting.md). Resumen ([ADR-015](../mvp/adr/ADR-015-primer-despliegue-railway.md), propuesta):

- **Primer despliegue: Railway.** Misma imagen Docker, PostgreSQL con volumen, respaldo a R2 como servicio con horario, Cloudflare delante. ≈ 5–10 USD/mes al arrancar, 20–25 con 10 restaurantes. Sin servidor que administrar.
- **Camino de ahorro: la VM con Compose** de esta sección y del ADR-012 (6–12 USD/mes, costo fijo), cuando la factura de Railway pase de ~40 USD sostenidos o se quiera control total. Hetzner es el más barato; Vultr tiene Ciudad de México; DigitalOcean es el más documentado.
- **Camino de escala: Google Cloud** (Cloud Run + Cloud SQL, región en Querétaro, `terraform/` ya apunta ahí) cuando un disparador de §11.3 lo pida. El equivalente en AWS exige más configuración; si llega un crédito de AWS, la misma imagen corre en App Runner en un día.
- **Nunca para la API:** Vercel y Netlify (funciones serverless sin proceso de larga duración, cobro por invocación, sin PostgreSQL).

### 11.3 Disparadores de crecimiento

| Señal | Qué se hace | Cuesta |
|---|---|---|
| CPU > 70 % sostenido en pico o p95 fuera de objetivo | VM más grande (minutos, sin cambiar nada) | +10–40 USD |
| > 60 restaurantes activos | Segunda VM de API + PostgreSQL administrado (Neon, Supabase, Cloud SQL) + balanceador | +50–100 USD |
| Primer contrato con SLA | PostgreSQL administrado con alta disponibilidad; alertas 24/7 | +50 USD |
| > 3 instancias de API | Redis para ETags, caché y límites compartidos | +15 USD |
| Importaciones > 500/día o trabajos largos (3D) | Worker aparte con la tabla `SKIP LOCKED` del TDD | +10 USD |
| Operación cansa a una persona | Mudar la imagen a Cloud Run + Cloud SQL con el Terraform existente | 40–80 USD |
| Pagos (v2) | Procesador con tokenización; los datos de tarjeta nunca tocan el servidor | comisión |

---

## 12. Seguridad (resumen)

El modelo de amenazas A1–A12 de [`08_Security_Compliance.md`](../mvp/08_Security_Compliance.md) sigue vigente. Lo que cambia o se agrega:

| Tema | v1 |
|---|---|
| PIN del personal | 4–6 dígitos, Argon2id, 5 intentos/min por restaurante+IP, bloqueo progresivo, mensaje uniforme; el operador desactiva a la persona para revocar |
| PDF subido | Validación por contenido, límite de tamaño y páginas, bucket privado, nunca se ejecuta ni se renderiza en el servidor; el modelo recibe instrucciones de tratarlo como datos |
| Datos sensibles del comensal | Ninguno en el servidor: los filtros de alérgenos viven en `localStorage` |
| Multi-tenant | `restaurante_id` del token; prueba parametrizada "otro restaurante → 404" sobre **todos** los endpoints; usuario de base sin permiso de alterar esquema |
| Registros | Cloudflare y Caddy guardan IPs 30 días para investigar abusos; se declara en el aviso de privacidad |
| Cabeceras | HSTS, CSP sin `unsafe-inline` (Vite con nonces), `nosniff`, `Referrer-Policy`, `Permissions-Policy` sin cámara ni ubicación |
| Secretos | `.env` en la VM con permisos 600; GitHub Secrets para CI; rotación trimestral del secreto JWT |
| Ley | Nueva LFPDPPP de 2025; aviso de privacidad revisado por abogado antes del primer restaurante |

La lista completa de verificación está en [05_Operacion.md §6](05_Operacion.md).

---

## 13. Qué cambia respecto a los documentos de agosto

| Documento | Cambio |
|---|---|
| `02_TDD.md` §2, §8, §9 | Diagrama y costos de esta sección; sin `worker/`; `frontend/` con Vite + React |
| `03_Data_Model.md` | Ver `03_Datos_v1.md`: sin `modelo_3d`, `trabajo_modelo_3d`, `dispositivo_restaurante`; nuevas `personal_restaurante`, `importacion_menu`, `clave_idempotencia`; migración base única |
| `04_API_Spec.md` | §5 de este documento sustituye a sus secciones 2–4; convenciones de §1 vigentes |
| `05_3D_Pipeline.md` | Pospuesto completo (v2) |
| `07_Test_Strategy.md` | Vigente; las pruebas de campo (§5) sin los pasos de AR |
| `08_Security_Compliance.md` | Vigente; agrega §12 de este documento |
| ADR-005, ADR-006, ADR-007 | Pospuestos (3D). ADR-007 se conserva en espíritu: dos buckets, público y privado |
| ADR-010 | Enmienda: los estáticos los sirve Caddy, no FastAPI; mismo dominio y mismo despliegue |
