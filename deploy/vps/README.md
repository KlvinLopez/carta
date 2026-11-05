# Variante de VM con Docker Compose (anexo, ADR-012)

**Lista pero no ejecutada.** El primer destino es Railway (ADR-015, `deploy/railway/README.md`); esto se adopta cuando la factura de Railway supere ~40 USD/mes sostenidos o se quiera control total. Los pasos completos están en `docs/plan/05_Operacion.md` Anexo A.

| Archivo | Qué es |
|---|---|
| `cloud-init.yml` | Crea la VM: usuario `carta` con Docker, `ufw`, `fail2ban`, actualizaciones automáticas, clona el repositorio en `/opt/carta` y deja el cron del respaldo (04:00 UTC). Pega tu llave SSH antes de usarlo. |
| `docker-compose.yml` | `postgres` (volumen) → `migracion` (`alembic upgrade head`, termina) → `api` (la misma imagen que en Railway, 2 workers, sólo en `127.0.0.1:8000`); `caddy` opcional con el perfil `caddy`; `respaldo` con el perfil `respaldo` (lo lanza el cron del host con `docker compose run --rm respaldo`). |
| `Caddyfile` | HTTPS automático para `$DOMINIO` y proxy a `api:8000`. No toca cabeceras: las pone la aplicación. |

## Variables (`/opt/carta/deploy/vps/.env`, permisos 600)

Las de `.env.example` más: `POSTGRES_PASSWORD` (obligatoria), `POSTGRES_USER`/`POSTGRES_DB` (por defecto `carta`/`carta_db`), `DATABASE_URL=postgresql+asyncpg://carta:<POSTGRES_PASSWORD>@postgres:5432/carta_db` (el host es el servicio `postgres`), `IMAGEN_TAG` (SHA o etiqueta de la imagen en GHCR; rollback = la anterior), `WORKERS`, `PUERTO_API` (8000; 8001 para un segundo stack), `DOMINIO`, y las del respaldo (`RESPALDO_CLAVE_AGE`, `RESPALDO_DIAS`).

## Comprobar sin VM

```bash
docker compose -f deploy/vps/docker-compose.yml config > /dev/null   # lo hace el job `imagen` de CI
```
