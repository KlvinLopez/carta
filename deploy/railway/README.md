# Railway — estructura del proyecto (ADR-015, 05_Operacion §2)

Qué hay que crear en Railway y qué valor va en cada sitio. **T-0.7 lo ejecuta** (necesita la cuenta, la tarjeta, el dominio y la zona de Cloudflare, que crea Calvin); aquí sólo queda escrito. Nada de `app/` sabe que corre en Railway: la imagen es la misma que en `deploy/vps/`.

## Proyecto `carta`, dos *environments*: `staging` y `produccion`

Cada *environment* tiene sus propios tres servicios y sus propias variables; nada se comparte entre ambos.

| Servicio | Origen | Qué configurar |
|---|---|---|
| `postgres` | Plantilla oficial PostgreSQL 16 **con volumen** | Nada más; expone `DATABASE_URL` como variable del servicio. |
| `api` | Este repositorio, construido con el `Dockerfile` de la raíz | `staging` sigue la rama `master` (despliegue automático); `produccion` **no** sigue ninguna rama: lo despliega CI con `railway up --environment produccion` en cada etiqueta `v*`. *Healthcheck path* `/health`. *Pre-deploy command* `uv run alembic upgrade head` (corre con la imagen nueva antes de recibir tráfico; si falla, no se despliega). *Restart policy* «on failure». Dominio propio (abajo). |
| `respaldo` | Este repositorio, `deploy/respaldo/Dockerfile` (*root directory* `deploy/respaldo`) | *Cron schedule* `0 4 * * *` (UTC). Sin dominio ni puerto. |

`railway.toml` (lo añade T-0.7 en la raíz) deja lo del servicio `api` en el repositorio:

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 60
preDeployCommand = ["uv", "run", "alembic", "upgrade", "head"]
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 5
```

## Variables (panel → servicio → *Variables*)

Servicio `api`: todas las de `.env.example`.

| Variable | Valor en Railway |
|---|---|
| `ENTORNO` | `staging` o `produccion` |
| `DOMINIO` | `staging.<dominio>` o `<dominio>` |
| `DATABASE_URL` | referencia: `${{Postgres.DATABASE_URL}}` (Railway la entrega como `postgresql://`; `Settings` le pone `+asyncpg`) |
| `SECRET_KEY` | `openssl rand -base64 32` (distinto por *environment*; `Settings` rechaza los de ejemplo y los cortos) |
| `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_PUBLICO`, `R2_BUCKET_PRIVADO`, `R2_URL_PUBLICA` | del panel de Cloudflare R2 (un par de buckets por *environment*); `R2_URL_PUBLICA` es el origen que entra en la CSP (`img-src`) |
| `ANTHROPIC_API_KEY`, `FIREBASE_PROJECT_ID`, `SENTRY_DSN` | de cada proveedor |
| `WORKERS` | `2` (el `CMD` de la imagen lo lee; subir con la RAM del plan) |
| `PORT` | la pone Railway; la imagen escucha en `${PORT:-8000}` |
| `FORWARDED_ALLOW_IPS` | `*`, fijada en la imagen (no hace falta ponerla): uvicorn sólo confía `X-Forwarded-*` desde 127.0.0.1 y detrás del proxy de Railway vería `http` y la IP del proxy. El contenedor sólo es alcanzable a través de ese proxy |

Servicio `respaldo`: `DATABASE_URL` (misma referencia), `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_PRIVADO`, `ENTORNO`, `RESPALDO_CLAVE_AGE` (llave pública de `age`), `RESPALDO_DIAS=30`.

Secreto en GitHub (sólo uno): `RAILWAY_TOKEN`, para `.github/workflows/deploy.yml` (T-0.7).

## Valores reales de Carta (6 de noviembre de 2026; nada de esto es secreto)

| Qué | Valor |
|---|---|
| Dominio y zona de Cloudflare | `carta.cooking` (zona activa, plan Free, SSL/TLS en *Full (strict)*, *Always Use HTTPS* apagado hasta T-0.7) |
| Proyecto en Railway | `carta` (cuenta con tarjeta; `RAILWAY_TOKEN` ya guardado como secreto del repositorio) |
| Buckets R2 | `carta-publico-staging`, `carta-privado-staging`, `carta-publico-produccion`, `carta-privado-produccion` |
| Origen público de imágenes (`R2_URL_PUBLICA`) | staging: `https://img-staging.carta.cooking` · producción: `https://img.carta.cooking` (dominios propios conectados a los buckets públicos, TLS mínimo 1.2; las URL `r2.dev` quedan apagadas: tienen límite de tasa y no pasan por la caché) |
| Ciclo de vida de los buckets privados | regla `respaldos-90-dias`: borra bajo el prefijo `respaldos/` a los 90 días (red de seguridad de la poda de 30 días de `deploy/respaldo/respaldar.sh`; las fotos originales viven fuera de ese prefijo y no caducan) |
| Tokens S3 de R2 (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) | *Account API tokens* con permiso *Object Read & Write*, uno por ambiente, limitados a sus dos buckets; los valores sólo en el panel de Railway |
| Llave de respaldo (`RESPALDO_CLAVE_AGE`) | la pública `age1…` generada por Calvin; la privada vive fuera de todo servidor |

Quién hace qué en T-0.7: la sesión maestra opera Cloudflare (DNS, caché, límite de tasa) con el conector oficial; la hija de T-0.7 deja `railway.toml`, `deploy.yml` y este README listos; Calvin pega las variables en el panel de Railway.

## Dominio y Cloudflare

1. Railway → servicio `api` → *Settings* → *Networking* → *Custom domain*: `staging.<dominio>` en `staging`, `<dominio>` en `produccion`. Railway muestra el `CNAME` a crear.
2. Cloudflare → DNS: esos `CNAME` con proxy activado; `CNAME img` al dominio público del bucket R2.
3. Cloudflare → SSL/TLS: *Full (strict)*. HSTS lo manda la aplicación (sólo en `staging` y `produccion`), no hace falta activarlo en Cloudflare. **Decisión consciente:** `includeSubDomains` desde el apex `<dominio>` obliga a HTTPS en **todos** los subdominios de la zona durante un año (`img.`, `staging.` y cualquier otro que exista o se cree); no pongas en esa zona nada que deba servirse por HTTP.
4. Cloudflare → *Rules*: caché para `/api/v1/p/menu/*` (respeta el `ETag` de la API), límite de tasa (p. ej. 300 peticiones/min por IP), *Bot Fight Mode*.

## Comprobar

```bash
curl -sf https://staging.<dominio>/health            # {"status":"ok"}
curl -sI https://staging.<dominio>/ | grep -i -e strict-transport -e content-security-policy
```

Rollback: panel → servicio `api` → *Deployments* → *Redeploy* de la versión anterior (o `railway redeploy`). Logs, reinicio y rollback funcionan desde el navegador del teléfono.
