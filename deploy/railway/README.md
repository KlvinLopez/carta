# Railway, clic por clic (T-0.7)

Guía para **Calvin**: deja `carta.cooking` y `staging.carta.cooking` funcionando en Railway. Tiempo: más o menos una hora. Railway está en inglés, así que los botones van **tal como aparecen en pantalla** (en negritas) y la explicación en español. Nada de este documento es secreto; los secretos **sólo** se pegan en el panel de Railway, nunca en el repositorio ni en un chat.

Quién hace qué:

- **Calvin** (esta guía): crea los proyectos de Firebase y la llave de Anthropic, los servicios en Railway, y pega las variables.
- **La sesión maestra**: crea en Cloudflare los registros DNS que Railway te muestre (paso G), la regla de caché del menú, el límite de tasa y *Always Use HTTPS*; etiqueta `v0.0.1` para el primer despliegue a producción.
- **El repositorio** ya trae el `Dockerfile`, `.railwayignore`, `.github/workflows/deploy.yml` (producción en cada etiqueta `v*`), `scripts/predespliegue.py` (las migraciones antes de cada despliegue) y `deploy/respaldo/`.

> **Por qué no hay `railway.toml`.** Railway dejó de leer `railway.toml`/`railway.json` («Config as Code») en servicios nuevos, y el 1 de diciembre de 2026 deja de leerlos en todos ([docs.railway.com/config-as-code/reference](https://docs.railway.com/config-as-code/reference)). Por eso el *healthcheck*, el comando previo y la política de reinicio se ponen en el panel (paso C). Cuando una sesión tenga la CLI de Railway, `railway config pull` puede generar `.railway/railway.ts` con lo que dejes aquí ([Infrastructure as Code](https://docs.railway.com/infrastructure-as-code)); queda anotado en `docs/plan/04_Fases_y_Tareas.md` §11.

**Una regla de Railway que conviene saber desde ya:** cada cambio que hagas (crear un servicio, pegar variables, cambiar un ajuste) queda «en espera». Arriba del lienzo aparece una franja con los cambios pendientes y un botón **Deploy**. Hasta que lo pulses, nada cambia de verdad. Si algo «no hace caso», casi siempre es eso.

---

## Antes de empezar: ten esto a mano

1. Los **dos tokens S3 de R2** que ya creaste (uno de staging y uno de producción): de cada uno, el **Access Key ID** y el **Secret Access Key**.
2. Tu **llave pública de age** ya está escrita en los bloques de abajo (es pública: no hace falta sellarla). La privada **no** se usa aquí ni se escribe en ningún lado.
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
5. **Un proyecto de Firebase por ambiente** (`carta-staging` y `carta-produccion`): con él el operador entra al panel con Google o con un enlace por correo. En [console.firebase.google.com](https://console.firebase.google.com), con tu cuenta de Google:
   1. **Create a project** → nombre `carta-staging` → apaga **Google Analytics** → **Create project**. Anota el **Project ID** que aparece bajo el nombre (puede llevar un sufijo, como `carta-staging-1a2b3`): es `FIREBASE_PROJECT_ID`.
   2. Menú izquierdo **Build → Authentication → Get started** → pestaña **Sign-in method** → **Google** → **Enable** → elige el correo de soporte → **Save**. Luego **Add new provider → Email/Password** → **Enable**, y abajo también **Email link (passwordless sign-in)** → **Save**.
   3. Dentro de **Authentication**, pestaña **Settings → Authorized domains → Add domain** → `staging.carta.cooking` (en el proyecto de producción, `carta.cooking`). `localhost` ya viene puesto.
   4. ⚙ **Project settings → General** → abajo, **Your apps → Add app → Web (`</>`)** → apodo `Carta panel` → sin Firebase Hosting → **Register app**. Del bloque `firebaseConfig` copia cuatro valores a tu gestor de contraseñas: `apiKey`, `authDomain`, `projectId` y `appId`. Son las `VITE_FIREBASE_*` del paso C. No son secretos (viajan al navegador de cada operador), pero no hace falta pegarlos en ningún chat: van directo al panel de Railway.
   5. Repite 1 a 4 para `carta-produccion`. Opcional, más adelante: en Google Cloud → **APIs & Services → Credentials**, restringe la *Browser key* de cada proyecto a su dominio.
6. **La llave de la API de Anthropic**, una por ambiente: con ella la aplicación lee las cartas en PDF (T-1.8 y T-1.9). En [console.anthropic.com](https://console.anthropic.com) → **Settings → API keys → Create Key** → nombre `carta-staging` → copia la llave (empieza por `sk-ant-` y sólo se muestra una vez) a tu gestor de contraseñas; otra con nombre `carta-produccion`. Hace falta saldo o un método de pago en **Billing**. Sin la llave la aplicación arranca y la importación responde «no disponible» (503); todo lo demás funciona.

---

## A. Los dos *environments*: `staging` y `produccion`

1. Entra a [railway.com](https://railway.com) → abre el proyecto **carta**. Arriba, junto al nombre del proyecto, hay un selector de *environment* que dice **production** (Railway lo crea así por defecto).
2. **Renómbralo a `produccion`**: abre **Settings** del proyecto (arriba a la derecha) → pestaña **Environments** → en la fila de `production`, el menú **⋮** → **Rename** → escribe `produccion` → confirma. Así el `RAILWAY_TOKEN` que ya guardaste sigue valiendo si lo creaste para ese environment. Si no te ofrece renombrar, crea `produccion` como en el paso 3 y en el paso F rehaces el token.
3. Crea staging: en el selector de *environment* → **+ New Environment** → **Empty Environment** → nombre `staging` → **Create**.

Desde aquí, **mira siempre el selector antes de tocar algo**: los ajustes y las variables valen sólo para el environment seleccionado. Los nombres de servicio son únicos en el proyecto, pero cada servicio sólo existe en los environments donde se creó o se importó. Empieza por **staging** (B a D) y en **produccion** (E) los importas con **Sync** y les pones sus valores.

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
   | **Source → Branch** (rama que dispara despliegues) | `master` (si lo habías dejado en la rama de trabajo, cámbialo) | staging se despliega solo con cada push a `master` cuya CI pasó |
   | **Source → Wait for CI** | Activado | no despliega un commit cuyo CI falló |
   | **Source → Root Directory** | vacío (o `/`) | el `Dockerfile` está en la raíz |
   | **Build** | debe decir que usa el **Dockerfile** (en los logs: `Using detected Dockerfile!`) | no hay que elegir nada |
   | **Deploy → Custom Start Command** | vacío | la imagen ya sabe arrancar |
   | **Deploy → Pre-deploy Command** | `uv run python scripts/predespliegue.py` | aplica las migraciones antes de recibir tráfico; si fallan, no se despliega. En un rollback a una versión más vieja que la base, avisa y no toca nada |
   | **Deploy → Pre-deploy Timeout** (aparece después de escribir el comando) | `300` | que una migración colgada falle en 5 min en vez de quedarse esperando |
   | **Deploy → Healthcheck Path** | `/health` | Railway sólo manda tráfico a la versión nueva cuando responde |
   | **Deploy → Healthcheck Timeout** | `120` | segundos de espera para ese `/health` |
   | **Deploy → Restart Policy** | **On Failure**, máximo `5` reintentos | si se cae, se levanta sola |

4. Pestaña **Variables** → botón **RAW Editor** → borra lo que haya y pega este bloque. Luego cambia cada `<…>` por tus valores (sin los `< >`) y pulsa **Update Variables**:

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
   FIREBASE_PROJECT_ID=<id del proyecto de Firebase de staging>
   FIREBASE_CSP_CONNECT_SRC=https://identitytoolkit.googleapis.com https://securetoken.googleapis.com
   FIREBASE_CSP_SCRIPT_SRC=https://apis.google.com
   FIREBASE_CSP_FRAME_SRC=https://<id del proyecto de Firebase de staging>.firebaseapp.com
   VITE_FIREBASE_API_KEY=<apiKey de la app web del proyecto de Firebase de staging>
   VITE_FIREBASE_AUTH_DOMAIN=<id del proyecto de Firebase de staging>.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=<id del proyecto de Firebase de staging>
   VITE_FIREBASE_APP_ID=<appId de la app web del proyecto de Firebase de staging>
   ANTHROPIC_API_KEY=<llave de Anthropic de staging>
   CLOUDFLARE_ZONE_ID=<Zone ID de carta.cooking>
   CLOUDFLARE_API_TOKEN=<token de Cloudflare con permiso Zone · Cache Purge>
   ```

   - `${{Postgres.DATABASE_URL}}` se pega **tal cual**: Railway lo cambia por la dirección real de la base de este environment.
   - `PORT=8000` fija el puerto en el que escucha la aplicación (y en el que Railway hace el *healthcheck*).
   - `FIREBASE_PROJECT_ID` es el *Project ID* de Firebase (consola de Firebase → ⚙ **Project settings** → **General**), no es secreto. **Con su sufijo**, por ejemplo `carta-staging-743b1`, no `carta-staging`: con el id incompleto la API rechaza todos los tokens y el panel deja entrar unos segundos y expulsa con «Tu sesión terminó» (pasó el 11 de noviembre de 2026 en staging). Sin él nadie entra al panel del operador. Las tres `FIREBASE_CSP_*` abren la política de seguridad del navegador a Firebase Auth (inicio de sesión con Google y enlace por correo); vacías, el panel no puede iniciar sesión. Los valores vienen de `docs/plan/04_Fases_y_Tareas.md` §11 (filas T-1.2 y T-1.10).
   - Las cuatro `VITE_FIREBASE_*` son la configuración web de Firebase (paso 5 de «Antes de empezar»; `VITE_FIREBASE_AUTH_DOMAIN` es el `authDomain` del bloque, normalmente `<id del proyecto>.firebaseapp.com`) y **se hornean en la imagen al construirla**: Railway las pasa al `Dockerfile` como *build args*. Sin ellas el panel dice «acceso sin configurar»; si las cambias después, redespliega (**Deployments → ⋮ → Redeploy**) para que el panel las vea.
   - `ANTHROPIC_API_KEY` (paso 6 de «Antes de empezar»; **es secreto**) activa la importación de cartas en PDF; sin ella la aplicación arranca y esa función responde 503 «no disponible». `SENTRY_DSN` **no se crea todavía**: se agrega aquí mismo cuando llegue su tarea.
   - `CLOUDFLARE_ZONE_ID` (32 caracteres hexadecimales: Cloudflare → `carta.cooking` → **Overview**, columna derecha, **Zone ID**; no es secreto) y `CLOUDFLARE_API_TOKEN` (Cloudflare → **My Profile → API Tokens → Create Token → Custom token**, permiso **Zone · Cache Purge · Purge** sólo para la zona `carta.cooking`; **es secreto**) dejan que la API purgue el menú público del borde al editarlo. Sin ellas el menú editado tarda hasta 60 s en verse.
5. **Sella los secretos**: en la lista de variables, en `SECRET_KEY` → menú **⋮** → **Seal**. Igual con `R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_API_TOKEN` y `ANTHROPIC_API_KEY`. Una variable sellada ya no se puede ver, ni des-sellar, ni cambiar con el **RAW Editor**: si vuelves a pegar el bloque, los valores sellados **no cambian**. Para cambiar un secreto sellado: **⋮ → Edit** en esa variable, una por una. Si la necesitas, está en tu gestor de contraseñas.
6. Pulsa **Deploy** en la franja de cambios pendientes. En la pestaña **Deployments** verás, en orden: la construcción (**Build Logs**, 3–6 min la primera vez), el **Pre-deploy** (las migraciones), el *healthcheck* y al final **Active**. Si algo sale en rojo, copia las últimas líneas del log y pásaselas a la maestra. Si el panel del operador dice «acceso sin configurar», la imagen se construyó con un `master` anterior al `Dockerfile` que recibe las `VITE_FIREBASE_*`: tras fusionar ese PR, **Deployments → ⋮ → Redeploy**.

---

## D. El respaldo diario de staging (`respaldo`)

1. **+ New** → **GitHub Repo** → **KlvinLopez/carta** otra vez (es otro servicio sobre el mismo repositorio).
2. Ábrelo → **Settings** → nombre `respaldo`. Luego:

   | Ajuste en pantalla | Valor |
   |---|---|
   | **Source → Root Directory** | `/deploy/respaldo` |
   | **Source → Branch** | `master`, la misma que `api` |
   | **Source → Wait for CI** | Activado (no despliega un commit cuyo CI falló) |
   | **Watch Paths** (en **Source** o en **Build**, según cómo lo muestre el panel) | `/deploy/respaldo/**` (sólo se redespliega cuando cambia esa carpeta, no con cada push) |
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
   RESPALDO_CLAVE_AGE=age1snv8uknzuhdupcpkh8dljw39979dlcjdr0x9p5ck68xgeqn09y6qj267mk
   RESPALDO_DIAS=30
   ```

   Sella `R2_SECRET_ACCESS_KEY` (**⋮ → Seal**; para cambiarla después, **⋮ → Edit**, no el RAW Editor). La llave de age es pública: no hace falta sellarla.
4. **Deploy**. Al día siguiente, en Cloudflare → **R2 Object Storage** → `carta-privado-staging` → carpeta `respaldos/staging/` debe haber un archivo `.dump.age` con la fecha. Si no está, abre el servicio `respaldo` → **Deployments** → el último → **View Logs** y pásale el error a la maestra (el script dice qué variable falta).

---

## E. Lo mismo en `produccion`

Cómo funciona Railway aquí: un servicio es una entidad del **proyecto**, con nombre único en todo el proyecto, pero sólo está presente en los environments donde se creó o se importó, y en cada uno tiene sus propios ajustes, variables, despliegues y volumen. `produccion` nació vacío (**Empty Environment**), así que no ves `api` ni `respaldo`; crear ahí un **Empty Service** llamado `api` falla con «A service named "api" already exists in this project», y la plantilla de Postgres crea un servicio nuevo con sufijo (`Postgres-y0s3`). El camino es **Sync**: importar los tres servicios de staging a produccion y después ponerles sus valores de producción. Cambia el selector a **produccion** y sigue en orden:

1. **Si ya creaste aquí una base con sufijo** (`Postgres-…`), está vacía y es mejor no tener dos: tarjeta → **Settings** → al final, **Danger** → **Delete Service** → confirma (acepta borrar también su volumen). Si prefieres conservarla, sáltate este punto; entonces en los bloques de variables de abajo escribe su nombre exacto en vez de `Postgres` (por ejemplo `${{Postgres-y0s3.DATABASE_URL}}`) y en el punto 2 descarta la tarjeta `Postgres` del Sync.
2. **Sync.** Arriba del lienzo, botón **Sync** → elige **staging** como origen. Railway deja en espera tres tarjetas marcadas **New**: `Postgres`, `api` y `respaldo`. Pulsa **Details** en la franja de cambios pendientes para verlas. Después, **con la tecla Alt pulsada**, haz clic en **Deploy**: así los servicios se guardan en produccion **sin desplegar nada todavía** (conviene poner los valores de producción antes de la primera construcción). Si el Alt no funcionara y se desplegaran, no pasa nada grave: `api` construiría con variables de staging y se corrige en el punto 8 con **Redeploy**.
3. **Postgres.** Abre la tarjeta **Postgres**: debe tener un disco debajo (el volumen propio de produccion). Si no lo tiene, clic derecho sobre la tarjeta → **Attach Volume** → *mount path* `/var/lib/postgresql/data`. La base de producción es otra, vacía: `${{Postgres.DATABASE_URL}}` apunta siempre a la del environment seleccionado.
4. **`api` → Settings.** Abre la tarjeta **api** → **Settings** y deja exactamente esto (el Sync trae los ajustes de staging, revísalos uno por uno):

   | Ajuste en pantalla | Valor |
   |---|---|
   | **Source** | Si muestra el repositorio **KlvinLopez/carta** con una rama, pulsa **Disconnect** (junto al repositorio) y confirma. Producción no sigue ninguna rama: la despliega GitHub Actions con cada etiqueta `v*` (`.github/workflows/deploy.yml`, `railway up`). Sin fuente, **Branch** y **Wait for CI** desaparecen: es lo esperado |
   | **Deploy → Custom Start Command** | vacío |
   | **Deploy → Pre-deploy Command** | `uv run python scripts/predespliegue.py` |
   | **Deploy → Pre-deploy Timeout** | `300` |
   | **Deploy → Healthcheck Path** | `/health` |
   | **Deploy → Healthcheck Timeout** | `120` |
   | **Deploy → Restart Policy** | **On Failure**, máximo `5` reintentos |

5. **`api` → Variables.** Pestaña **Variables** → **RAW Editor**. Lo que hay son las variables de staging que trajo el Sync (sin las selladas): **bórralas todas**, pega este bloque, cambia los `<…>` y pulsa **Update Variables**:

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
   FIREBASE_PROJECT_ID=<id del proyecto de Firebase de producción>
   FIREBASE_CSP_CONNECT_SRC=https://identitytoolkit.googleapis.com https://securetoken.googleapis.com
   FIREBASE_CSP_SCRIPT_SRC=https://apis.google.com
   FIREBASE_CSP_FRAME_SRC=https://<id del proyecto de Firebase de producción>.firebaseapp.com
   VITE_FIREBASE_API_KEY=<apiKey de la app web del proyecto de Firebase de producción>
   VITE_FIREBASE_AUTH_DOMAIN=<id del proyecto de Firebase de producción>.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=<id del proyecto de Firebase de producción>
   VITE_FIREBASE_APP_ID=<appId de la app web del proyecto de Firebase de producción>
   ANTHROPIC_API_KEY=<llave de Anthropic de producción>
   CLOUDFLARE_ZONE_ID=<Zone ID de carta.cooking>
   CLOUDFLARE_API_TOKEN=<token de Cloudflare con permiso Zone · Cache Purge>
   ```

   Sella `SECRET_KEY`, `R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_API_TOKEN` y `ANTHROPIC_API_KEY` (**⋮ → Seal**; para cambiarlas después, **⋮ → Edit** una por una). Las `VITE_FIREBASE_*` se hornean en la imagen al construirla, igual que en staging. La tarjeta **api** queda **sin despliegue hasta el paso H**: es normal, no la despliegues a mano.
6. **`respaldo` → Settings.** Abre la tarjeta **respaldo** → **Settings** y deja exactamente esto:

   | Ajuste en pantalla | Valor |
   |---|---|
   | **Source** | el repositorio **KlvinLopez/carta** conectado (si ves **Disconnect** junto al repositorio, está conectado; si ves **Connect Repo**, conéctalo) |
   | **Source → Branch** | `master` |
   | **Source → Root Directory** | `/deploy/respaldo` |
   | **Source → Wait for CI** | Activado |
   | **Watch Paths** | `/deploy/respaldo/**` (así un push a `master` sólo llega a producción si toca el respaldo y su CI pasó) |
   | **Deploy → Cron Schedule** | `0 4 * * *` |
   | **Deploy → Restart Policy** | **Never** |
   | **Deploy → Healthcheck Path** / **Pre-deploy Command** | vacíos |

7. **`respaldo` → Variables.** **RAW Editor** → borra las de staging que trajo el Sync, pega, cambia los `<…>` y **Update Variables**:

   ```text
   ENTORNO=produccion
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=<Access Key ID del token de producción>
   R2_SECRET_ACCESS_KEY=<Secret Access Key del token de producción>
   R2_BUCKET_PRIVADO=carta-privado-produccion
   RESPALDO_CLAVE_AGE=age1snv8uknzuhdupcpkh8dljw39979dlcjdr0x9p5ck68xgeqn09y6qj267mk
   RESPALDO_DIAS=30
   ```

   Sella `R2_SECRET_ACCESS_KEY`.
8. **Deploy** en la franja de cambios pendientes (esta vez sin Alt). `Postgres` y `respaldo` se despliegan (el respaldo correrá a las 04:00 UTC); `api`, sin fuente, queda sin despliegue hasta el paso H. Si en el punto 2 `api` llegó a construirse con variables de staging, ahora **Deployments → ⋮ → Remove** sobre ese despliegue, o déjalo: el paso H lo sustituye.

> Alternativa futura para `respaldo` de producción: en vez de seguir una rama, **Source → Docker Image** `ghcr.io/klvinlopez/carta-respaldo:<etiqueta>` (la publica `deploy.yml`). Requiere que el paquete de GHCR sea público o credenciales de registro en Railway.

Resumen de lo que cambia entre ambientes:

| Variable | staging | produccion |
|---|---|---|
| `ENTORNO` | `staging` | `produccion` |
| `DOMINIO` | `staging.carta.cooking` | `carta.cooking` (sólo el host, sin `https://` ni `/`: se imprime en los QR de las mesas y la API no arranca con `localhost` o una IP privada) |
| `SECRET_KEY` | la de staging | la de producción (otra) |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | token de staging | token de producción |
| `R2_BUCKET_PUBLICO` | `carta-publico-staging` | `carta-publico-produccion` |
| `R2_BUCKET_PRIVADO` | `carta-privado-staging` | `carta-privado-produccion` |
| `R2_URL_PUBLICA` | `https://img-staging.carta.cooking` | `https://img.carta.cooking` |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CSP_FRAME_SRC` | proyecto de Firebase de staging | proyecto de Firebase de producción |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | app web del proyecto de staging (se hornean en la imagen) | app web del proyecto de producción |
| `ANTHROPIC_API_KEY` | llave `carta-staging` (sellada) | llave `carta-produccion` (sellada) |
| `CLOUDFLARE_API_TOKEN` | token de purga (sellado; puede ser el mismo: la zona es la misma) | token de purga (sellado) |
| Igual en los dos | `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `PORT=8000`, `WORKERS=2`, `FIREBASE_CSP_CONNECT_SRC`, `FIREBASE_CSP_SCRIPT_SRC`, `CLOUDFLARE_ZONE_ID`, `R2_ENDPOINT`, `RESPALDO_CLAVE_AGE`, `RESPALDO_DIAS=30` | |

---

## F. El token de producción, guardado en un *Environment* de GitHub

`deploy.yml` usa `RAILWAY_TOKEN`, que debe ser un **project token del environment `produccion`** de Railway (un *project token* sólo sirve para un environment). Hoy está guardado como secreto **del repositorio**, y eso lo puede leer cualquier workflow de cualquier rama. Lo vamos a **mover** a un *Environment* de GitHub llamado `produccion`, que sólo lo entrega a las etiquetas `v*` y a `master`.

1. **El token en Railway.** Railway → proyecto **carta** → **Settings** → **Tokens**. Si ya hay un token cuyo environment es `produccion` (o el `production` que renombraste en A.2) y es el que guardaste en GitHub, tenlo a mano (si no lo guardaste en tu gestor de contraseñas, crea otro). Si no: **Create** → nombre `github-actions-produccion` → environment **produccion** → copia el token (sólo se muestra una vez).
2. **Crear el Environment.** GitHub → repositorio **KlvinLopez/carta** → **Settings** → menú izquierdo **Environments** → **New environment** → nombre `produccion` → **Configure environment**.
3. **Quién puede usarlo.** En esa página, **Deployment branches and tags** → elige **Selected branches and tags** → **Add deployment branch or tag rule** → **Ref type: Tag**, patrón `v*` → **Add rule**. Otra vez **Add deployment branch or tag rule** → **Ref type: Branch**, patrón `master` → **Add rule** (hace falta para el rollback con **Run workflow**, que corre desde `master`).
4. **El secreto.** Más abajo, **Environment secrets** → **Add environment secret** → **Name** `RAILWAY_TOKEN`, **Value** el token del paso 1 → **Add secret**.
5. **Borra el viejo.** **Settings** → **Secrets and variables** → **Actions** → pestaña **Secrets** → sección **Repository secrets** → en `RAILWAY_TOKEN`, el ícono de **papelera** → confirma. Así queda en un solo lugar: el Environment.
6. **Tú apruebas cada despliegue a producción.** En la misma página del Environment `produccion` → **Deployment protection rules** → marca **Required reviewers** → **Add up to 6 reviewers** → escribe tu usuario **KlvinLopez** → **Save protection rules**. Desde entonces, cada corrida de **Despliegue a producción** se detiene antes de tocar producción y GitHub te manda una notificación y un correo: **Actions** → la corrida → **Review deployments** → marca `produccion` → **Approve and deploy** (o **Reject**). Es lo que permite que la sesión maestra lance las versiones sin que nada llegue a producción sin tu toque.

---

## G. Los dominios: `staging.carta.cooking` y `carta.cooking`

Antes de empezar: si en el paso 3 Railway no te deja añadir un dominio al `api` de **produccion** porque todavía no tiene ningún despliegue, haz primero el paso H, vuelve aquí y, cuando el DNS esté listo, relanza el trabajo `humo` (GitHub → **Actions** → la corrida → **Re-run failed jobs**).

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

## H. Publicar una versión a producción

El primer despliegue (`v0.0.1`, 11 de noviembre de 2026) lo publicaste tú desde **Releases**. Desde entonces el camino es éste, y sirve para todas las versiones:

1. **Validas en staging.** Cada merge a `master` se despliega solo en `staging.carta.cooking`; ahí compruebas que lo prometido funciona (el recorrido del operador, lo que haya cambiado).
2. **Pides la versión.** Le dices a la sesión maestra «publica v0.0.2»: ella abre un PR que cambia el archivo `VERSION` y tú lo fusionas (**Merge pull request**): ésa es tu primera validación. Al entrar en `master`, el workflow **Publicar versión** espera a que el CI termine en verde, crea la etiqueta, publica la **Release** con las notas y lanza **Despliegue a producción**. (También puedes lanzarlo tú: GitHub → **Actions** → **Publicar versión** → **Run workflow** → `version`.)
3. **Apruebas.** GitHub te avisa; **Actions** → la corrida → **Review deployments** → `produccion` → **Approve and deploy**. Hasta ese toque nada cambia en producción (paso F.6). Si algo no te convence, **Reject**: la etiqueta queda publicada sin desplegar.
4. **Miras el resultado.** En la corrida, los cuatro trabajos en verde; en Railway → **produccion** → **api** → **Deployments**, el despliegue **Active**; y `https://carta.cooking/health` desde el teléfono.

Si sale en rojo **sólo** el trabajo `humo` y `produccion` salió en verde, producción **no** falló: casi siempre es el DNS o el certificado. Abre `https://carta.cooking/health`; cuando responda, en la corrida pulsa **Re-run failed jobs** (repite sólo el humo, no vuelve a desplegar).

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
| Dominio y zona de Cloudflare | `carta.cooking` (zona activa, plan Free, SSL/TLS en *Full (strict)* sin 526 detrás de Railway, *Always Use HTTPS* encendido y TLS mínimo 1.2 desde el 11 de noviembre de 2026; DNS: `staging` y el apex en CNAME con proxy a Railway, los dos TXT `_railway-verify` sin proxy, `img` e `img-staging` a R2) |
| Proyecto en Railway | `carta` (cuenta con tarjeta) |
| `RAILWAY_TOKEN` en GitHub | *project token* del environment `produccion` de Railway, como secreto del **Environment `produccion`** de GitHub (sólo etiquetas `v*` y `master`); **no** como secreto del repositorio (paso F) |
| Buckets R2 | `carta-publico-staging`, `carta-privado-staging`, `carta-publico-produccion`, `carta-privado-produccion` |
| Origen público de imágenes (`R2_URL_PUBLICA`) | staging: `https://img-staging.carta.cooking` · producción: `https://img.carta.cooking` (dominios propios conectados a los buckets públicos, TLS mínimo 1.2; las URL `r2.dev` quedan apagadas: tienen límite de tasa y no pasan por la caché) |
| Ciclo de vida de los buckets privados | regla `respaldos-90-dias`: borra bajo el prefijo `respaldos/` a los 90 días (red de seguridad de la poda de 30 días de `deploy/respaldo/respaldar.sh`; las fotos originales viven fuera de ese prefijo y no caducan) |
| Tokens S3 de R2 (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) | *Account API tokens* con permiso *Object Read & Write*, uno por ambiente, limitados a sus dos buckets; los valores sólo en el panel de Railway |
| Llave de respaldo (`RESPALDO_CLAVE_AGE`) | `age1snv8uknzuhdupcpkh8dljw39979dlcjdr0x9p5ck68xgeqn09y6qj267mk` (pública, la misma en staging y producción); la privada vive fuera de todo servidor |
| Servicios por environment | Los tres servicios se crean en staging y se importan a produccion con **Sync**; cada environment tiene sus ajustes, variables y volumen: `Postgres` (plantilla con volumen), `api` (staging sigue `master`; produccion sin fuente, la despliega CI con `railway up`), `respaldo` (GitHub, `/deploy/respaldo`, Wait for CI, Watch Paths `/deploy/respaldo/**`, cron `0 4 * * *`) |

---

## Para la maestra: Cloudflare (05_Operacion §2 paso 4)

1. **DNS**: los `CNAME` que Railway entregue para `staging` y para el apex `carta.cooking` con **proxy activado** (Cloudflare aplana el CNAME del apex), y los dos **TXT** de verificación tal cual (los TXT no llevan proxy).
2. **SSL/TLS**: Railway documenta *Full* y no *Full (strict)* detrás de Cloudflare ([working-with-domains](https://docs.railway.com/networking/domains/working-with-domains)). Se intenta primero con *strict* (la zona ya está así); sólo si `staging.carta.cooking` o `carta.cooking` responden **526**, baja a *Full* con una *Configuration Rule* limitada a esos dos nombres, `staging.carta.cooking` y `carta.cooking` (`img.` e `img-staging.` siguen en *strict*). Consecuencia: *Full* acepta en el origen un certificado caducado o de otro nombre, así que deja de validar la identidad de Railway.
3. **Always Use HTTPS**: activarlo cuando los dos dominios respondan. HSTS lo manda la aplicación (sólo en `staging` y `produccion`). **Decisión consciente:** `includeSubDomains` desde el apex obliga a HTTPS en **todos** los subdominios de la zona durante un año (`img.`, `staging.` y cualquier otro); no pongas en esa zona nada que deba servirse por HTTP.
4. **Rules** (hechas el 11 de noviembre de 2026): *Cache Rule* para `/api/v1/p/menu/*` que cachea respetando `Cache-Control` y `ETag` de la API, y otra que nunca cachea `/health` ni `/ready`; *Rate limiting rule* de 300 peticiones por 10 s por IP en `carta.cooking` y `staging.carta.cooking` (el plan Free sólo permite ventanas de 10 s; es una red de seguridad amplia porque todo un restaurante comparte una IP y los límites finos viven en la API, 04_API_Spec §1.5); regla WAF *skip* que exime a `/health` y `/ready` del límite de tasa, del nivel de seguridad y de los retos del navegador. **Sin *Bot Fight Mode***: en el plan Free no admite excepciones y puede retar a los runners de GitHub en la prueba de humo.
5. **Ya integrado en `master`** (PR #1, 10 de noviembre de 2026): **Source → Branch** de `api` y `respaldo` en **staging** y de `respaldo` en **produccion** es `master`; `deploy.yml` está en la rama predeterminada, así que aparece **Run workflow**; la primera etiqueta `v0.0.1` va sobre `master` (paso H).
6. **Comprobar**:

   ```bash
   curl -sf https://staging.carta.cooking/health            # {"status":"ok"}
   curl -sI https://staging.carta.cooking/ | grep -i -e strict-transport -e content-security-policy
   ```
