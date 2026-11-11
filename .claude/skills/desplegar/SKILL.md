---
name: desplegar
description: Procedimiento para desplegar Carta a staging o producción en Railway y para hacer rollback, con los límites que no se cruzan (producción sólo por etiqueta v* sobre master, nunca railway redeploy). Úsala cuando el usuario diga "/desplegar", "despliega", "sube a staging", "saca la versión", "rollback" o "revierte producción".
---

# /desplegar — staging por push, producción por etiqueta

> Esta skill es el mapa. Los pasos clic a clic y los comandos exactos viven en
> [`deploy/README.md`](../../../deploy/README.md) (despliegue y rollback) y
> [`deploy/railway/README.md`](../../../deploy/railway/README.md) (montaje inicial). Léelos antes de
> actuar y **no copies su contenido aquí**: si cambian, esta skill sigue siendo cierta.

## Qué hace cada ambiente

| Ambiente | Cómo llega el código | Quién lo dispara |
|---|---|---|
| `staging` | Railway construye solo cada push a la rama elegida en el panel (`master`; mientras no esté integrado, la rama que diga `deploy/README.md`) y espera al CI (**Wait for CI**) | un push |
| `produccion` | `.github/workflows/deploy.yml`: trabajos `verificar` → `produccion` → `humo` → `publicar` | una etiqueta `vX.Y.Z` |

En los dos, Railway corre antes `uv run python scripts/predespliegue.py` (migra, salvo si la base va por
delante del código: entonces avisa y no migra) y sólo cambia el tráfico cuando `/health` responde.

## Antes de desplegar (siempre)

1. Puerta de calidad en verde y CI verde sobre el commit (`uv run ruff check . && uv run ruff format --check . && uv run mypy && uv run pytest -q`).
2. Para producción: el commit **ya está en `master`** (se etiqueta *después* del merge; `deploy.yml` rechaza otra cosa) y staging funciona con él.
3. Si hay migración nueva, debe ser compatible hacia atrás (expandir → usar → contraer, 05 §3): el código anterior tiene que seguir funcionando con el esquema nuevo.

## Límites (no se cruzan sin pedirlo)

- **Producción sólo por etiqueta `v*` sobre `master`.** Nunca `railway up` a mano contra `produccion`, nunca push a `master` para forzar un despliegue.
- **Lanzar «Publicar versión» es pedir un despliegue a producción**: sólo con la versión exacta que el usuario pidió, y sabiendo que el despliegue no ocurre hasta que él lo aprueba en GitHub. Nunca una etiqueta a mano para saltarse esa aprobación.
- **Rollback = Rollback.** Botón **Deployments → ⋮ → Rollback** en Railway, o `deploy.yml` (*Run workflow*) con la etiqueta anterior. **Nunca `railway redeploy`**: repite el último despliegue, no vuelve atrás. Si entre versiones se rotó un secreto, el botón reactiva el viejo: usa la etiqueta.
- El rollback nunca baja la base; las migraciones son hacia adelante y compatibles.
- Secretos sólo en el panel de Railway y en el Environment `produccion` de GitHub. Ni en el repositorio, ni en el chat, ni en un `.env` commiteado (`CLAUDE.md`, regla 12). No leas `.env*` de `deploy/`.
- Cloudflare (DNS, caché del menú, límite de tasa) lo opera la sesión maestra, no esta skill.

## Procedimiento

**Staging:** integrar en la rama que sigue staging → push → `uv run python scripts/railway.py esperar api` (o mirar *Deployments* de `staging/api` en el panel) → `curl -sf https://staging.carta.cooking/health` y `/ready`. Si `scripts/railway.py estado` avisa de que `api` no sigue `master`, lo fusionado no está desplegado: es un ajuste del panel (Source → Branch).

**Producción:** `git fetch origin master` → `git tag vX.Y.Z origin/master` → (confirmación del usuario) → `git push origin vX.Y.Z` → vigilar `deploy.yml`. Si `humo` sale rojo pero `produccion` verde, no falló producción (DNS o certificado del primer despliegue): comprobar `/health` y *Re-run failed jobs*.

**Rollback:** primero el botón de Railway (un clic, menos de un minuto); si no está disponible o hubo rotación de secretos, `deploy.yml` con la etiqueta anterior. Después: abrir Sentry/logs, anotar el incidente en `docs/incidentes/` (05 §8) y arreglar en rama.

## Si falta algo

`RAILWAY_TOKEN` vive sólo en el Environment `produccion` de GitHub, y lo que requiera el panel de Railway en **producción** (variables, servicios) es de Calvin: dilo y detente en vez de improvisar. En **staging** la sesión sí puede mirar y operar con el skill `/railway` (`uv run python scripts/railway.py estado`, `despliegues`, `logs`, `variables`, `redesplegar`; T-0.9): úsalo para seguir un despliegue después del push y para leer por qué falló, antes de pedirle nada a Calvin. Los secretos, la rama que sigue un servicio y el Rollback siguen en el panel.

## Lecciones del primer despliegue (11 de noviembre de 2026)

- **Railway:** los servicios son del proyecto (nombre único) y se importan a `produccion` con **Sync** desde `staging`; en produccion `api` queda **sin fuente** (Disconnect) y lo despliega `deploy.yml`. Las variables son por environment y las selladas no se copian: pégalas de nuevo. Un cambio de variable redespliega (2 a 4 min).
- **Las versiones se publican con el workflow «Publicar versión»** (`publicar.yml`): cuando Calvin dice la versión, la maestra abre un PR que cambia sólo el archivo `VERSION` (p. ej. `v0.0.2`); al fusionarlo, el workflow corre en `master`, espera al CI, crea la etiqueta y la Release y lanza `deploy.yml`, que **espera la aprobación de Calvin** en el Environment `produccion` (required reviewer). La sesión no empuja etiquetas a mano (permisos) ni puede lanzar workflows por la API (403, la integración no tiene `actions: write`): el PR de `VERSION` es su manera de lanzar. La maestra sigue la corrida con `actions_list` sobre `publicar.yml` y `deploy.yml`.
- **`FIREBASE_PROJECT_ID` con sufijo** (`carta-staging-743b1`): sin él la API rechaza todos los tokens y el panel expulsa con «Tu sesión terminó». Para acotarlo: token real por REST con la apiKey pública del bundle y la API en local con las mismas variables.
- **Cloudflare** (conector): CNAME con proxy y TXT sin proxy, *Full (strict)* funciona con Railway, *Always Use HTTPS* y TLS 1.2, reglas de caché, tasa y WAF; una llamada con `User-Agent` de script recibe 403 1010 del *Browser Integrity Check*: usa un UA de navegador en las pruebas.
- **Staging `/ready`** devuelve un 503 `ALMACEN_NO_DISPONIBLE` aislado de vez en cuando (sonda a R2 de 3 s); `/health` no se ve afectado (nota en T-4.1).
- **Tras cada despliegue, compara la CSP de staging y producción** (`curl -sI https://<host>/ | grep -i content-security-policy`): `script-src`, `connect-src`, `frame-src` e `img-src` deben llevar las mismas entradas de Firebase y R2 con el proyecto y el dominio de cada ambiente. En `v0.0.2` producción no traía `frame-src` porque `FIREBASE_CSP_FRAME_SRC` faltaba en Railway: la API arranca igual y sólo falla el acceso con Google.
