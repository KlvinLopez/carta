# Railway, clic por clic (T-0.7)

Guía para **Calvin**: deja `carta.cooking` y `staging.carta.cooking` funcionando en Railway. Tiempo: más o menos una hora. Railway está en inglés, así que los botones van **tal como aparecen en pantalla** (en negritas) y la explicación en español. Nada de este documento es secreto; los secretos **sólo** se pegan en el panel de Railway, nunca en el repositorio ni en un chat.

Quién hace qué:

- **Calvin** (esta guía): crea los servicios en Railway y pega las variables.
- **La sesión maestra**: crea en Cloudflare los registros DNS que Railway te muestre (paso G), la regla de caché del menú, el límite de tasa y *Always Use HTTPS*; etiqueta `v0.0.1` para el primer despliegue a producción.
- **El repositorio** ya trae el `Dockerfile`, `.railwayignore`, `.github/workflows/deploy.yml` (producción en cada etiqueta `v*`) y `deploy/respaldo/`.

> **Por qué no hay `railway.toml`.** Railway dejó de leer `railway.toml`/`railway.json` («Config as Code») en servicios nuevos, y el 1 de diciembre de 2026 deja de leerlos en todos ([docs.railway.com/config-as-code/reference](https://docs.railway.com/config-as-code/reference)). Por eso el *healthcheck*, el comando previo y la política de reinicio se ponen en el panel (paso C). Cuando una sesión tenga la CLI de Railway, `railway config pull` puede generar `.railway/railway.ts` con lo que dejes aquí ([Infrastructure as Code](https://docs.railway.com/infrastructure-as-code)); queda anotado en `docs/plan/04_Fases_y_Tareas.md` §11.

**Una regla de Railway que conviene saber desde ya:** cada cambio que hagas (crear un servicio, pegar variables, cambiar un ajuste) queda «en espera». Arriba del lienzo aparece una franja con los cambios pendientes y un botón **Deploy**. Hasta que lo pulses, nada cambia de verdad. Si algo «no hace caso», casi siempre es eso.

---

## Antes de empezar: ten esto a mano

1. Los **dos tokens S3 de R2** que ya creaste (uno de staging y uno de producción): de cada uno, el **Access Key ID** y el **Secret Access Key**.
2. Tu **llave pública de age** (empieza con `age1…`). La privada **no** se usa aquí.
3. **Dos claves `SECRET_KEY` nuevas**, una por ambiente. En Windows abre **PowerShell** (tecla Windows → escribe `PowerShell` → Enter), pega esta línea y pulsa Enter:

   ```powershell
   $b = New-Object byte[] 32; [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
   ```

   Sale una línea de unos 44 caracteres que termina en `=`. Cópiala a tu gestor de contraseñas como «Carta SECRET_KEY staging». Vuelve a pulsar flecha arriba + Enter para obtener otra distinta: «Carta SECRET_KEY producción». (En Mac o Linux es lo mismo con `openssl rand -base64 32`.) Nunca uses la misma en los dos ambientes.
4. El **Account ID** de Cloudflare, para armar `R2_ENDPOINT`: en [dash.cloudflare.com](https://dash.cloudflare.com) → menú izquierdo **R2 Object Storage** → **Overview** → a la derecha, el recuadro **Account Details** → **Account ID** (botón de copiar). Tu endpoint es:

   ```text
   https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   ```

   cambiando `<ACCOUNT_ID>` por lo que copiaste (sin los `< >`). Es el mismo para staging y producción.

---

## A. Los dos *environments*: `staging` y `produccion`

1. Entra a [railway.com](https://railway.com) → abre el proyecto **carta**. Arriba, junto al nombre del proyecto, hay un selector de *environment* que dice **production** (Railway lo crea así por defecto).
2. **Renómbralo a `produccion`**: abre **Settings** del proyecto (arriba a la derecha) → pestaña **Environments** → en la fila de `production`, el menú **⋮** → **Rename** → escribe `produccion` → confirma. Así el `RAILWAY_TOKEN` que ya guardaste sigue valiendo si lo creaste para ese environment. Si no te ofrece renombrar, crea `produccion` como en el paso 3 y en el paso F rehaces el token.
3. Crea staging: en el selector de *environment* → **+ New Environment** → **Empty Environment** → nombre `staging` → **Create**.

Desde aquí, **mira siempre el selector antes de tocar algo**: todo lo que hagas vale sólo para el environment que esté seleccionado. Empieza por **staging** (B a D) y luego repite en **produccion** (E).

---

## B. Base de datos de staging (`Postgres`)

1. Selector de environment en **staging**.
2. Botón **+ New** (arriba a la derecha del lienzo) → **Database** → **Add PostgreSQL**.
3. Aparece una tarjeta llamada **Postgres** con un disco debajo (el volumen: ahí viven los datos). **No le cambies el nombre**: las variables de los otros servicios la buscan como `Postgres`.
4. Pulsa **Deploy** en la franja de cambios pendientes. Espera a que la tarjeta diga **Active** (o una palomita verde).

---

## C. La aplicación de staging (`api`)

1. **+ New** → **GitHub Repo** → elige **KlvinLopez/carta**. (Si no aparece: **Configure GitHub App** y dale acceso a ese repositorio.)
2. Railway crea una tarjeta con el nombre del repositorio. Ábrela → pestaña **Settings** → en el nombre del servicio (arriba) escribe `api` → Enter.
3. Sigue en **Settings** y pon exactamente esto (si un campo no aparece, baja: están en las secciones **Source**, **Build**, **Deploy** y **Networking**):

   | Ajuste en pantalla | Valor | Por qué |
   |---|---|---|
   | **Source → Branch** (rama que dispara despliegues) | `claude/gifted-allen-rqjiup` **por ahora**; cuando la maestra integre todo en `master`, cámbialo a `master` | staging se despliega solo con cada push a esa rama |
   | **Source → Wait for CI** | Activado | no despliega un commit cuyo CI falló |
   | **Source → Root Directory** | vacío (o `/`) | el `Dockerfile` está en la raíz |
   | **Build** | debe decir que usa el **Dockerfile** (en los logs: `Using detected Dockerfile!`) | no hay que elegir nada |
   | **Deploy → Custom Start Command** | vacío | la imagen ya sabe arrancar |
   | **Deploy → Pre-deploy Command** | `uv run alembic upgrade head` | aplica las migraciones antes de recibir tráfico; si fallan, no se despliega |
   | **Deploy → Pre-deploy Timeout** (aparece después de escribir el comando) | `300` | que una migración colgada falle en 5 min en vez de quedarse esperando |
   | **Deploy → Healthcheck Path** | `/health` | Railway sólo manda tráfico a la versión nueva cuando responde |
   | **Deploy → Healthcheck Timeout** | `120` | segundos de espera para ese `/health` |
   | **Deploy → Restart Policy** | **On Failure**, máximo `5` reintentos | si se cae, se levanta sola |

4. Pestaña **Variables** → botón **RAW Editor** → borra lo que haya y pega este bloque. Luego cambia los cuatro `<…>` por tus valores (sin los `< >`) y pulsa **Update Variables**:

   ```text
   ENTORNO=staging
   DOMINIO=staging.carta.cooking
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   SECRET_KEY=<la SECRET_KEY de staging>
   PORT=8000
   WORKERS=2
   R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=<Access Key ID del token de staging>
   R2_SECRET_ACCESS_KEY=<Secret Access Key del token de staging>
   R2_BUCKET_PUBLICO=carta-publico-staging
   R2_BUCKET_PRIVADO=carta-privado-staging
   R2_URL_PUBLICA=https://img-staging.carta.cooking
   ```

   - `${{Postgres.DATABASE_URL}}` se pega **tal cual**: Railway lo cambia por la dirección real de la base de este environment.
   - `PORT=8000` fija el puerto en el que escucha la aplicación (y en el que Railway hace el *healthcheck*).
   - `ANTHROPIC_API_KEY`, `FIREBASE_PROJECT_ID` y `SENTRY_DSN` **no se crean todavía**: sin ellas la aplicación arranca y esas funciones quedan apagadas. Se agregan aquí mismo cuando lleguen sus tareas.
5. **Sella los secretos**: en la lista de variables, en `SECRET_KEY` → menú **⋮** → **Seal**. Igual con `R2_SECRET_ACCESS_KEY`. Una variable sellada ya no se puede ver ni sacar del panel (sí cambiar con **⋮ → Edit**). Si la necesitas, está en tu gestor de contraseñas.
6. Pulsa **Deploy** en la franja de cambios pendientes. En la pestaña **Deployments** verás, en orden: la construcción (**Build Logs**, 3–6 min la primera vez), el **Pre-deploy** (las migraciones), el *healthcheck* y al final **Active**. Si algo sale en rojo, copia las últimas líneas del log y pásaselas a la maestra.

---

## D. El respaldo diario de staging (`respaldo`)

1. **+ New** → **GitHub Repo** → **KlvinLopez/carta** otra vez (es otro servicio sobre el mismo repositorio).
2. Ábrelo → **Settings** → nombre `respaldo`. Luego:

   | Ajuste en pantalla | Valor |
   |---|---|
   | **Source → Root Directory** | `/deploy/respaldo` |
   | **Source → Branch** | la misma que `api` (`claude/gifted-allen-rqjiup` por ahora; luego `master`) |
   | **Build → Watch Paths** | `/deploy/respaldo/**` (sólo se reconstruye cuando cambia el respaldo) |
   | **Deploy → Cron Schedule** | `0 4 * * *` (todos los días a las 04:00 UTC = 22:00 en Ciudad de México) |
   | **Deploy → Restart Policy** | **Never** (si un respaldo falla, se ve en rojo y no se repite en bucle) |
   | **Deploy → Healthcheck Path** / **Pre-deploy Command** | vacíos |
   | **Networking** | nada: este servicio no tiene dominio ni puerto |

3. **Variables** → **RAW Editor** → pega, cambia los `<…>` y **Update Variables**:

   ```text
   ENTORNO=staging
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=<Access Key ID del token de staging>
   R2_SECRET_ACCESS_KEY=<Secret Access Key del token de staging>
   R2_BUCKET_PRIVADO=carta-privado-staging
   RESPALDO_CLAVE_AGE=<tu llave pública age1…>
   RESPALDO_DIAS=30
   ```

   Sella `R2_SECRET_ACCESS_KEY` (**⋮ → Seal**). La llave de age es pública: no hace falta sellarla.
4. **Deploy**. Al día siguiente, en Cloudflare → **R2 Object Storage** → `carta-privado-staging` → carpeta `respaldos/staging/` debe haber un archivo `.dump.age` con la fecha. Si no está, abre el servicio `respaldo` → **Deployments** → el último → **View Logs** y pásale el error a la maestra (el script dice qué variable falta).

---

## E. Lo mismo en `produccion`

Cambia el selector a **produccion** y repite B, C y D con **estas diferencias**:

1. **B (Postgres):** igual.
2. **C (`api`):** **no** lo conectes a GitHub. Usa **+ New** → **Empty Service** → nombre `api`. Producción no sigue ninguna rama: la despliega GitHub Actions con cada etiqueta `v*` (`.github/workflows/deploy.yml`). Los ajustes de **Deploy** (Pre-deploy Command, Pre-deploy Timeout, Healthcheck Path, Healthcheck Timeout, Restart Policy) son **los mismos** que en staging. No hay **Source → Branch** ni **Wait for CI**. Hasta el primer despliegue (paso H) la tarjeta queda vacía: es normal.
   Variables (**RAW Editor**):

   ```text
   ENTORNO=produccion
   DOMINIO=carta.cooking
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   SECRET_KEY=<la SECRET_KEY de producción>
   PORT=8000
   WORKERS=2
   R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=<Access Key ID del token de producción>
   R2_SECRET_ACCESS_KEY=<Secret Access Key del token de producción>
   R2_BUCKET_PUBLICO=carta-publico-produccion
   R2_BUCKET_PRIVADO=carta-privado-produccion
   R2_URL_PUBLICA=https://img.carta.cooking
   ```

   Sella `SECRET_KEY` y `R2_SECRET_ACCESS_KEY`.
3. **D (`respaldo`):** igual que en staging (desde GitHub, Root Directory `/deploy/respaldo`, misma rama, Cron `0 4 * * *`, Restart **Never**), con estas variables:

   ```text
   ENTORNO=produccion
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=<Access Key ID del token de producción>
   R2_SECRET_ACCESS_KEY=<Secret Access Key del token de producción>
   R2_BUCKET_PRIVADO=carta-privado-produccion
   RESPALDO_CLAVE_AGE=<tu llave pública age1…>
   RESPALDO_DIAS=30
   ```

4. **Deploy** en la franja de cambios pendientes.

Resumen de lo que cambia entre ambientes:

| Variable | staging | produccion |
|---|---|---|
| `ENTORNO` | `staging` | `produccion` |
| `DOMINIO` | `staging.carta.cooking` | `carta.cooking` |
| `SECRET_KEY` | la de staging | la de producción (otra) |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | token de staging | token de producción |
| `R2_BUCKET_PUBLICO` | `carta-publico-staging` | `carta-publico-produccion` |
| `R2_BUCKET_PRIVADO` | `carta-privado-staging` | `carta-privado-produccion` |
| `R2_URL_PUBLICA` | `https://img-staging.carta.cooking` | `https://img.carta.cooking` |
| Igual en los dos | `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `PORT=8000`, `WORKERS=2`, `R2_ENDPOINT`, `RESPALDO_CLAVE_AGE`, `RESPALDO_DIAS=30` | |

---

## F. El token de GitHub para producción

`deploy.yml` usa el secreto `RAILWAY_TOKEN`, que debe ser un **project token del environment `produccion`** (un *project token* sólo sirve para un environment).

1. Railway → proyecto **carta** → **Settings** → **Tokens**. Si ya hay un token cuyo environment es `produccion` (o el `production` que renombraste en A.2) y es el que guardaste en GitHub, ya está.
2. Si no estás seguro: **Create** → nombre `github-actions-produccion` → environment **produccion** → copia el token (sólo se muestra una vez).
3. GitHub → repositorio **KlvinLopez/carta** → **Settings** → **Secrets and variables** → **Actions** → `RAILWAY_TOKEN` → **Update** (lápiz) → pega → **Update secret**.

---

## G. Los dominios: `staging.carta.cooking` y `carta.cooking`

1. Selector en **staging** → tarjeta **api** → **Settings** → **Networking** → **Public Networking** → **+ Custom Domain** → escribe `staging.carta.cooking`. Si pregunta el puerto, elige o escribe `8000`.
2. Railway muestra **dos registros DNS** para crear: uno **CNAME** (su *Value* termina en `.up.railway.app`) y uno **TXT** (verifica que el dominio es tuyo). **Hacen falta los dos**: sin el TXT el dominio responde 404.
3. Selector en **produccion** → **api** → **Settings** → **Networking** → **+ Custom Domain** → `carta.cooking`, puerto `8000`. Otros dos registros.
4. **Copia los cuatro registros exactamente** (botón de copiar junto a cada *Name* y *Value*) y mándaselos a la maestra con esta forma:

   ```text
   staging.carta.cooking
     CNAME  Name: <…>  Value: <…>
     TXT    Name: <…>  Value: <…>
   carta.cooking
     CNAME  Name: <…>  Value: <…>
     TXT    Name: <…>  Value: <…>
   ```

   La maestra los crea en Cloudflare (CNAME con la nube naranja, TXT sin ella). Cuando Railway los vea, junto a cada dominio aparece una palomita verde y el aviso **Cloudflare proxy detected**. Puede tardar de minutos a unas horas.

---

## H. El primer despliegue a producción

Lo hace la maestra cuando todo lo anterior esté listo y la rama esté integrada: crea la etiqueta `v0.0.1` y GitHub Actions corre **Despliegue a producción** (pasos exactos en [`deploy/README.md`](../README.md)). Tú sólo miras: GitHub → **Actions** → la corrida en verde, y en Railway → **produccion** → **api** → **Deployments**, el despliegue **Active**.

---

## I. Comprobar desde el teléfono

Abre en el navegador del teléfono (con datos móviles, no sólo con el wifi de casa):

1. `https://staging.carta.cooking/health` → debe verse `{"status":"ok"}`.
2. `https://staging.carta.cooking/ready` → debe decir `"db":"ok"` (la base responde).
3. `https://staging.carta.cooking/` → carga la aplicación con el fondo crema.
4. Después del paso H, lo mismo con `https://carta.cooking/health`, `/ready` y `/`.

Desde el teléfono también puedes, en el panel de Railway: ver logs (**Deployments → View Logs**), reiniciar (**⋮ → Restart**) y volver a la versión anterior (**Deployments → ⋮ junto al despliegue anterior → Rollback**; ver [`deploy/README.md`](../README.md)).

---

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
| Servicios por environment | `Postgres` (plantilla con volumen), `api` (staging: GitHub; produccion: *Empty Service* desplegado por CI), `respaldo` (GitHub, `/deploy/respaldo`, cron `0 4 * * *`) |

---

## Para la maestra: Cloudflare (05_Operacion §2 paso 4)

1. **DNS**: los `CNAME` que Railway entregue para `staging` y para el apex `carta.cooking` con **proxy activado** (Cloudflare aplana el CNAME del apex), y los dos **TXT** de verificación tal cual (los TXT no llevan proxy).
2. **SSL/TLS**: la zona está en *Full (strict)*. La guía de Railway para Cloudflare pide **Full**, «no Full (strict)» ([working-with-domains](https://docs.railway.com/networking/domains/working-with-domains)). Si `staging.carta.cooking` responde **526** con *strict*, baja sólo esos dos nombres a *Full* con una *Configuration Rule* en vez de toda la zona (las imágenes de R2 siguen en *strict*).
3. **Always Use HTTPS**: activarlo cuando los dos dominios respondan. HSTS lo manda la aplicación (sólo en `staging` y `produccion`). **Decisión consciente:** `includeSubDomains` desde el apex obliga a HTTPS en **todos** los subdominios de la zona durante un año (`img.`, `staging.` y cualquier otro); no pongas en esa zona nada que deba servirse por HTTP.
4. **Rules**: caché para `/api/v1/p/menu/*` (respeta el `ETag` de la API), límite de tasa (p. ej. 300 peticiones/min por IP), *Bot Fight Mode*.
5. **Comprobar**:

   ```bash
   curl -sf https://staging.carta.cooking/health            # {"status":"ok"}
   curl -sI https://staging.carta.cooking/ | grep -i -e strict-transport -e content-security-policy
   ```
