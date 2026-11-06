# Despliegue de Carta (T-0.7, 05_Operacion §2–§3, ADR-015)

Una sola imagen (el `Dockerfile` de la raíz) sirve la API y la PWA. El destino de la v1 es **Railway**; Cloudflare va delante y R2 guarda fotos y respaldos.

| Carpeta | Qué es |
|---|---|
| [`railway/`](railway/README.md) | **Montaje inicial en Railway, clic por clic** (environments, servicios, variables, dominios). Se hace una vez. |
| [`respaldo/`](respaldo/README.md) | Imagen del respaldo diario (`pg_dump` → `age` → R2). |
| [`vps/`](vps/README.md) | Variante de VM con Docker Compose y Caddy (anexo, ADR-012). Usa la imagen de GHCR que publica `deploy.yml`. |
| [`etapa2-gcp/`](etapa2-gcp/README.md) | Terraform de Cloud Run para la etapa 2. No se usa en la v1. |
| `uvicorn_log.json` | Registro JSON del supervisor de uvicorn (lo copia la imagen). |

Cómo llega el código a cada ambiente:

| Ambiente | Cómo se despliega | Quién lo dispara |
|---|---|---|
| `staging` → `https://staging.carta.cooking` | Railway construye solo cada push a la rama elegida en el panel (`master`; mientras no esté integrado, `claude/gifted-allen-rqjiup`) y espera a que el CI pase (**Wait for CI**) | un push |
| `produccion` → `https://carta.cooking` | `.github/workflows/deploy.yml`: `railway up` del código de la etiqueta, prueba de humo, y la imagen a GHCR | una etiqueta `v*` |

En los dos, Railway corre antes el comando previo `uv run alembic upgrade head` y sólo manda tráfico a la versión nueva cuando `/health` responde. Si la migración falla, la versión anterior sigue sirviendo.

---

## 1. Primer montaje (una vez)

Es 05 §2, en orden. El detalle de cada clic está en [`railway/README.md`](railway/README.md).

1. Cuenta de Railway con 2FA y tarjeta, proyecto `carta` *(hecho el 6 de noviembre)*.
2. Environments `staging` y `produccion` (guía, paso A).
3. En cada uno: `Postgres` desde la plantilla con volumen (paso B); `api` con *Pre-deploy Command* `uv run alembic upgrade head`, *Healthcheck Path* `/health` y *Restart Policy* «On Failure» (paso C; en `produccion` como *Empty Service*, paso E); `respaldo` desde `/deploy/respaldo` con *Cron Schedule* `0 4 * * *` (paso D).
4. Variables de `api` y `respaldo` por environment (pasos C, D y E; los valores exactos están ahí).
5. `RAILWAY_TOKEN` en GitHub = *project token* del environment `produccion` (paso F).
6. Dominios propios en Railway y registros `CNAME` + `TXT` en Cloudflare (paso G; Cloudflare lo opera la sesión maestra).
7. Comprobar: `curl -sf https://staging.carta.cooking/health` y, desde el teléfono, `/health`, `/ready` y `/` (paso I).

## 2. Desplegar a staging

1. Integra el cambio en la rama que sigue staging (`master`; mientras no esté integrado, `claude/gifted-allen-rqjiup`) y haz push.
2. El CI (`.github/workflows/ci.yml`) corre sobre ese commit. Con **Wait for CI** activado, Railway espera; si el CI falla, no despliega.
3. Railway construye la imagen, corre `uv run alembic upgrade head` y espera a `/health`. Míralo en Railway → **staging** → **api** → **Deployments**.
4. Comprueba:

   ```bash
   curl -sf https://staging.carta.cooking/health
   curl -sf https://staging.carta.cooking/ready
   curl -sI https://staging.carta.cooking/ | grep -i content-security-policy
   ```

## 3. Desplegar a producción (etiqueta `v*`)

1. Comprueba que el commit que vas a publicar está en `master`, que su CI está en verde y que staging funciona con él.
2. Crea la etiqueta y súbela:

   ```bash
   git fetch origin master
   git tag v0.0.1 origin/master          # la siguiente versión, p. ej. v0.1.0
   git push origin v0.0.1
   ```

   Sin terminal (desde el teléfono también): GitHub → **Releases** → **Draft a new release** → **Choose a tag** → escribe `v0.0.1` → **Create new tag** → *Target* `master` → **Publish release**.
3. GitHub Actions corre **Despliegue a producción** (`deploy.yml`):
   1. `verificar`: la etiqueta tiene forma `vX.Y.Z` y `ci.yml` pasó en ese commit (si no, se detiene sin tocar nada).
   2. `produccion`: instala la CLI de Railway fijada y verificada por SHA-256, `railway up --environment produccion --service api` (espera a que el despliegue quede activo) y la prueba de humo contra `https://carta.cooking` (`/health`, `/ready`, la PWA, CSP y HSTS).
   3. `publicar`: la imagen en `ghcr.io/klvinlopez/carta:<etiqueta>` y `:latest` (y `carta-respaldo`), para la variante de VM.
4. Si el trabajo `produccion` sale en rojo, la versión anterior sigue sirviendo (Railway no cambia el tráfico sin `/health`). Lee el log del paso que falló.

## 4. Rollback

Lo más rápido (un clic, menos de un minuto, también desde el teléfono):

1. Railway → environment **produccion** (o **staging**) → servicio **api** → **Deployments**.
2. En el despliegue anterior que funcionaba, menú **⋮** → **Rollback** → confirma. Railway vuelve a poner esa imagen **y** sus variables.

Desde GitHub (redespliega el código de una etiqueta anterior):

1. GitHub → **Actions** → **Despliegue a producción** → **Run workflow** (`workflow_dispatch`).
2. En `etiqueta` escribe la versión anterior (p. ej. `v0.0.1`) → **Run workflow**. Mueve también `latest` en GHCR a esa versión.

> `railway redeploy` **no** es un rollback: vuelve a desplegar el **último** despliegue tal cual (sirve para aplicar variables nuevas o reiniciar algo caído). Para volver atrás usa **Rollback** o la etiqueta anterior.

Las migraciones son compatibles hacia atrás (expandir → usar → contraer, 05 §3): la imagen anterior funciona con el esquema nuevo, así que un rollback nunca necesita bajar la base.

## 5. Variante de VM (GHCR)

`deploy/vps/docker-compose.yml` arranca de `ghcr.io/klvinlopez/carta:${IMAGEN_TAG}`, que publica el trabajo `publicar` en cada etiqueta. Los paquetes de GHCR nacen **privados**: para que la VM los baje sin credenciales, GitHub → perfil → **Packages** → `carta` (y `carta-respaldo`) → **Package settings** → **Change visibility** → *Public*; o en la VM `docker login ghcr.io` con un token de sólo lectura. Si la imagen no está, `docker compose up --build` la construye desde el repositorio clonado.
