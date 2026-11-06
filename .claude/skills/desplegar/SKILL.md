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

1. Puerta de calidad en verde y CI verde sobre el commit (`uv run ruff check . && uv run ruff format --check . && uv run mypy app && uv run pytest -q`).
2. Para producción: el commit **ya está en `master`** (se etiqueta *después* del merge; `deploy.yml` rechaza otra cosa) y staging funciona con él.
3. Si hay migración nueva, debe ser compatible hacia atrás (expandir → usar → contraer, 05 §3): el código anterior tiene que seguir funcionando con el esquema nuevo.

## Límites (no se cruzan sin pedirlo)

- **Producción sólo por etiqueta `v*` sobre `master`.** Nunca `railway up` a mano contra `produccion`, nunca push a `master` para forzar un despliegue.
- **Crear y subir una etiqueta es publicar a producción**: confirma con el usuario la versión exacta antes de `git push origin vX.Y.Z`, aunque el mensaje original diga "despliega".
- **Rollback = Rollback.** Botón **Deployments → ⋮ → Rollback** en Railway, o `deploy.yml` (*Run workflow*) con la etiqueta anterior. **Nunca `railway redeploy`**: repite el último despliegue, no vuelve atrás. Si entre versiones se rotó un secreto, el botón reactiva el viejo: usa la etiqueta.
- El rollback nunca baja la base; las migraciones son hacia adelante y compatibles.
- Secretos sólo en el panel de Railway y en el Environment `produccion` de GitHub. Ni en el repositorio, ni en el chat, ni en un `.env` commiteado (`CLAUDE.md`, regla 12). No leas `.env*` de `deploy/`.
- Cloudflare (DNS, caché del menú, límite de tasa) lo opera la sesión maestra, no esta skill.

## Procedimiento

**Staging:** integrar en la rama que sigue staging → push → mirar *Deployments* de `staging/api` → `curl -sf https://staging.carta.cooking/health` y `/ready`.

**Producción:** `git fetch origin master` → `git tag vX.Y.Z origin/master` → (confirmación del usuario) → `git push origin vX.Y.Z` → vigilar `deploy.yml`. Si `humo` sale rojo pero `produccion` verde, no falló producción (DNS o certificado del primer despliegue): comprobar `/health` y *Re-run failed jobs*.

**Rollback:** primero el botón de Railway (un clic, menos de un minuto); si no está disponible o hubo rotación de secretos, `deploy.yml` con la etiqueta anterior. Después: abrir Sentry/logs, anotar el incidente en `docs/incidentes/` (05 §8) y arreglar en rama.

## Si falta algo

`RAILWAY_TOKEN` vive sólo en el Environment `produccion` de GitHub, y lo que requiera el panel de Railway (variables, servicios) es de Calvin: dilo y detente en vez de improvisar.
