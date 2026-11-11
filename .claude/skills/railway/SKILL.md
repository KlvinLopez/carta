---
name: railway
description: Opera el environment staging de Carta en Railway desde la sesión, sin el panel — servicios y rama que siguen, despliegues, logs de un despliegue, variables no secretas (leer y cambiar), redesplegar y estado de los dominios, con scripts/railway.py sobre la API GraphQL de Railway. Úsala cuando el usuario diga "/railway", "mira los logs de staging", "qué versión está en staging", "cambia la variable X en staging", "redespliega staging" o cuando un despliegue de staging falle. Producción no se toca desde aquí.
---

# /railway — staging por la API, producción nunca

> T-0.9. La herramienta es [`scripts/railway.py`](../../../scripts/railway.py): hace cumplir los
> límites de abajo (no dependen de que alguien lea este archivo) y sus pruebas están en
> `tests/unit/test_railway.py`. El montaje del proyecto en Railway sigue en
> [`deploy/railway/README.md`](../../../deploy/railway/README.md) y el despliegue en `/desplegar`.

## Antes de usarla

El *project token* del environment `staging` vive como **network secret** del entorno de nube
(host `backboard.railway.com`, cabecera `Project-Access-Token`): el proxy de la sesión lo pone en
cada petición y el script no lo ve. Si `estado` responde «Railway no aceptó el token», falta o
caducó: pídeselo a Calvin **con el formulario seguro de credenciales** (`request_credential`,
host `backboard.railway.com`, `header_name: Project-Access-Token`), nunca por el chat. Lo crea en
Railway → proyecto `carta` → **Settings → Tokens → Create** → environment **staging**. Fuera de
la nube, el script lee `RAILWAY_TOKEN_STAGING` del entorno.

## Órdenes

```bash
uv run python scripts/railway.py estado                 # servicios, rama, último despliegue, avisos
uv run python scripts/railway.py despliegues api -n 10  # id, estado, rama, commit
uv run python scripts/railway.py logs api               # ejecución del último despliegue
uv run python scripts/railway.py logs api --tipo construccion --despliegue <id> -n 300
uv run python scripts/railway.py logs api --tipo http --filtro "@httpStatus:500"
uv run python scripts/railway.py variables api          # secretos ocultos
uv run python scripts/railway.py variable api WORKERS 2 --esperar
uv run python scripts/railway.py redesplegar api --esperar
uv run python scripts/railway.py esperar api            # tras un merge: hasta SUCCESS o fallo
uv run python scripts/railway.py dominios api
```

Servicios de staging: `api`, `respaldo` y `Postgres`. Códigos de salida: 0 bien; 1 `estado
--estricto` con avisos o un despliegue esperado que no acabó en `SUCCESS`; 2 Railway rechazó la
petición o la orden no está permitida.

| Para | Orden | Campo de la API (`https://backboard.railway.com/graphql/v2`) |
|---|---|---|
| Saber de qué environment es el token | todas, siempre lo primero | `projectToken { projectId environmentId project { name } environment { name } }` |
| Servicios, rama que sigue cada uno, *Wait for CI*, cron, último despliegue | `estado` | `environment(id) { serviceInstances { … latestDeployment { id status createdAt } } deploymentTriggers { … branch checkSuites } }` |
| Historial de despliegues | `despliegues <servicio>` | `deployments(first, input: { projectId, environmentId, serviceId }) { … id status createdAt meta }` |
| Logs de ejecución, de construcción y de peticiones | `logs <servicio> [--tipo]` | `deploymentLogs`, `buildLogs`, `httpLogs` (`deploymentId`, `limit`, `filter`) |
| Variables de un servicio | `variables <servicio>` | `variables(projectId, environmentId, serviceId, unrendered: true)` |
| Cambiar una variable no secreta | `variable <servicio> NOMBRE VALOR` | `variableUpsert(input: { …, name, value, skipDeploys })` |
| Repetir el último despliegue | `redesplegar <servicio>` | `deploymentRedeploy(id) { id status }` |
| Dominio, certificado y registros DNS | `dominios <servicio>` | `domains(projectId, environmentId, serviceId) { customDomains { domain status { verified certificateStatus dnsRecords { … } } } }` |

Las consultas completas son las constantes `CONSULTA_*` y `MUTACION_*` del script. Si Railway
cambia el esquema, se lee por introspección (`{ __schema { queryType { fields { name } } } }` con
`curl` al mismo URL: el proxy pone el token) y se corrige ahí, con su prueba.

## Límites (los hace cumplir el script)

1. **Sólo staging.** La primera consulta de toda orden es `projectToken`; si el environment no se
   llama exactamente `staging`, el script sale con 2 sin mandar nada más. Producción se publica
   con el PR de `VERSION` y la aprobación de Calvin en GitHub (`/desplegar`); no pidas ni guardes
   un token de `produccion` para esta herramienta.
2. **Los secretos no se leen.** La API entrega **en claro** toda variable sin sellar (y, sin
   `unrendered`, la `DATABASE_URL` con su contraseña). `variables` sólo muestra el valor de las
   de `VARIABLES_NO_SECRETAS`; el resto sale «oculta», o «sellada» si Railway ya no la entrega.
   No consultes `variables` con `curl` a mano: el valor acabaría en el chat.
3. **Los secretos no se escriben.** `variable` sólo acepta nombres de `VARIABLES_NO_SECRETAS`
   que no estén en `SOLO_LECTURA` (`ENTORNO`, `PORT`), con un valor de una línea que no sea una
   referencia `${{…}}`. Un secreto (o sellarlo) va en el panel: es de Calvin. Una variable nueva
   que no sea secreta se añade a la lista en un PR.
4. **Lo que no hace:** cambiar la rama que sigue un servicio, los ajustes de *Deploy*, los
   dominios o el volumen; borrar variables; *rollback* (`/desplegar` §Rollback, en el panel).
   Firebase no se automatiza. Si hace falta algo de esto, dilo y detente.

## Cuándo usar cada cosa

- **Tras un merge a `master`:** `esperar api` y luego `curl -sf https://staging.carta.cooking/ready`.
  Si termina en `FAILED`: `logs api --tipo construccion` (falló la imagen o el comando previo) o
  `logs api` (arrancó y se cayó).
- **Antes de pedir a Calvin que valide en staging:** `estado --estricto`. Un aviso de rama
  significa que staging no sigue `master` y lo que se fusionó no está desplegado.
- **Un 5xx en staging:** `logs api --filtro "@request_id:<id>"` con el `X-Request-ID` de la
  respuesta; todos los errores, `logs api --filtro "@level:error"`. El filtro va por atributo y
  valor exacto (`@logger:carta.procesador`, `@estado:500`, varios separados por espacio): un
  texto suelto no encuentra nada en los logs JSON de la API. En `--tipo http`, `@httpStatus:500`
  y `@path:/ready`.
- **Cambiar una variable:** el cambio redespliega solo (2 a 4 min); con `--sin-desplegar` queda
  para el próximo despliegue. Las `VITE_FIREBASE_*` se hornean al construir: tras cambiarlas hace
  falta el redespliegue. Después, compara la CSP con la de producción (`/desplegar`).
- **`redesplegar` no es un rollback:** repite el último despliegue con las variables de ahora.

## Lecciones (11 de noviembre de 2026, primera corrida contra staging)

- La API de Carta escribe JSON por línea con la clave `mensaje`; Railway lo parte en
  `attributes` y deja `message` vacío. `logs` lo vuelve a armar (`linea_de_log`); la hora que
  muestra es la de ingesta de Railway (segundos después de la de la aplicación).
- Detrás del proxy de Cloudflare el registro CNAME sale `REQUIRES_UPDATE` con «visto: —»:
  Railway no ve el CNAME aplanado. Lo que cuenta es `verificado: sí` y `certificado: VALID`.
- Límite de la API: 1000 peticiones por hora en el plan Hobby; `esperar` consulta cada 10 s.
- La primera corrida encontró lo que el panel no enseñaba de un vistazo: `respaldo` en
  `CRASHED` cada noche (`pg_dump` 16 contra el PostgreSQL 18 de la plantilla), `api` y
  `respaldo` siguiendo una rama de sesión en vez de `master`, y un secreto sin sellar. Corre
  `estado` al abrir cada sesión maestra.
