# Variante de VM con Docker Compose (anexo, ADR-012)

**Lista pero no ejecutada.** El primer destino es Railway (ADR-015, `deploy/railway/README.md`); esto se adopta cuando la factura de Railway supere ~40 USD/mes sostenidos o se quiera control total. Los pasos completos están en `docs/plan/05_Operacion.md` Anexo A.

| Archivo | Qué es |
|---|---|
| `cloud-init.yml` | Crea la VM: usuario `carta` con Docker, `ufw`, `fail2ban`, actualizaciones automáticas, clona el repositorio en `/opt/carta` y deja el cron del respaldo (04:00 UTC). Pega tu llave SSH antes de usarlo. |
| `docker-compose.yml` | `postgres` (volumen) → `migracion` (`scripts/predespliegue.py`: `alembic upgrade head` salvo en un rollback con la base por delante; termina) → `api` (la misma imagen que en Railway, 2 workers, sólo en `127.0.0.1:8000`); `caddy` opcional con el perfil `caddy`; `respaldo` con el perfil `respaldo` (lo lanza el cron del host con `docker compose run --rm respaldo`). |
| `Caddyfile` | HTTPS automático para `$DOMINIO` y proxy a `api:8000`. No toca cabeceras: las pone la aplicación. |

## Variables (`/opt/carta/deploy/vps/.env`, permisos 600)

Las de `.env.example` más las que interpola el compose. Cada servicio recibe sólo las suyas (lista explícita en `docker-compose.yml`): `respaldo` no ve `SECRET_KEY` ni `ANTHROPIC_API_KEY`; `api` no ve `POSTGRES_PASSWORD` ni `RESPALDO_CLAVE_AGE`.

| Variable | Qué es |
|---|---|
| `POSTGRES_PASSWORD` | Obligatoria; `POSTGRES_USER`/`POSTGRES_DB` por defecto `carta`/`carta_db` |
| `DATABASE_URL` | `postgresql+asyncpg://carta:<POSTGRES_PASSWORD>@postgres:5432/carta_db` (el host es el servicio `postgres`) |
| `IMAGEN`, `IMAGEN_TAG` | Imagen de la API: `ghcr.io/klvinlopez/carta` + SHA o etiqueta; rollback = la etiqueta anterior. La publica `.github/workflows/deploy.yml` (trabajo `publicar`) en cada etiqueta `v*`, con `:<etiqueta>` y `:latest`; el paquete nace privado (ver `deploy/README.md` §5). Si la imagen no existe, `docker compose up --build` la construye desde la raíz del repositorio clonado |
| `IMAGEN_RESPALDO` | Imagen del respaldo (`ghcr.io/klvinlopez/carta-respaldo`, también la publica `deploy.yml`); si no existe, se construye de `deploy/respaldo/` |
| `WORKERS`, `PUERTO_API` | Workers de uvicorn (2) y puerto local de la API (8000; 8001 para un segundo stack) |
| `DOMINIO` | Para Caddy |
| `ENTORNO`, `SECRET_KEY`, `R2_*`, `ANTHROPIC_API_KEY`, `IMPORTACION_MODELO`, `FIREBASE_PROJECT_ID`, `SENTRY_DSN` | Las de `.env.example` |
| `RESPALDO_CLAVE_AGE`, `RESPALDO_DIAS` | Llave pública de `age` y días que se conservan (≥ 1) |

## Dos avisos

- **ACME detrás de Cloudflare:** con el proxy naranja y «Always Use HTTPS» activo, el reto HTTP-01 de Caddy falla (Cloudflare redirige el reto a HTTPS antes de que exista el certificado). Opciones: certificado *Origin CA* de Cloudflare montado en Caddy, o el reto DNS-01 con el módulo de Cloudflare de Caddy y un token de API. Se decide al adoptar la VM.
- **`carta` es root sin fricción:** `sudo` sin contraseña y grupo `docker` (equivalente a root). Es consciente: una sola persona opera la VM desde el teléfono. La llave SSH es la única puerta (`ssh_pwauth: false`, `disable_root: true`).

## Comprobar sin VM

```bash
docker compose -f deploy/vps/docker-compose.yml config > /dev/null   # lo hace el job `imagen` de CI
```
