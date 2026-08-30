# Carta MVP — Especificación de API

**Versión:** 1.0 · **Base URL:** `https://api.carta.mx` · **Prefijo:** `/api/v1`
**Contrato ejecutable:** [`openapi.yaml`](openapi.yaml) — si hay discrepancia, gana el YAML.

---

## 1. Convenciones

### 1.1 Estructura de rutas

| Prefijo | Audiencia | Autenticación |
|---|---|---|
| `/api/v1/p/*` | Comensal | Cookie `carta_invitado` (JWT HS256) |
| `/api/v1/op/*` | Vista de Comandas | Cookie `carta_dispositivo` (token opaco) |
| `/api/v1/admin/*` | Back-office | `Authorization: Bearer <Firebase ID token>` |
| `/health`, `/ready` | Infraestructura | Ninguna |

### 1.2 Formato de error

Todas las respuestas de error usan la misma envoltura. Nunca se devuelven trazas ni mensajes de base de datos.

```json
{
  "error": {
    "codigo": "MESA_NO_ENCONTRADA",
    "mensaje": "No encontramos esta mesa.",
    "detalles": {},
    "request_id": "01J8XW3Q4T5R6Y7Z"
  }
}
```

| HTTP | Cuándo | Códigos de ejemplo |
|---|---|---|
| 400 | Petición malformada | `PAYLOAD_INVALIDO` |
| 401 | Falta credencial o expiró | `TOKEN_EXPIRADO`, `SIN_CREDENCIAL` |
| 403 | Credencial válida, acción no permitida | `ORDEN_AJENA`, `ORDEN_BLOQUEADA` |
| 404 | No existe **o** no es visible para quien pregunta | `MESA_NO_ENCONTRADA`, `RECURSO_NO_ENCONTRADO` |
| 409 | Conflicto de estado | `SESION_YA_ENVIADA`, `ORDEN_VACIA` |
| 413 | Archivo demasiado grande | `ARCHIVO_EXCEDE_LIMITE` |
| 422 | Validación de negocio | `PRECIO_INVALIDO`, `ALIAS_NO_PERMITIDO` |
| 429 | Límite de tasa | `DEMASIADAS_PETICIONES` |
| 500 | Error interno | `ERROR_INTERNO` |

**Regla de fuga de información:** cualquier recurso de otro restaurante devuelve **404**, jamás 403 (AC-15.3).

### 1.3 Idempotencia

Los `POST` que crean recursos con efectos visibles para el personal (`/p/orden/confirmar`, `/p/llamar-mesero`) aceptan la cabecera `Idempotency-Key`. La clave se guarda en Redis 24 h junto a la respuesta; una repetición devuelve la respuesta original con `Idempotent-Replay: true`.

### 1.4 Caché y sondeo

| Endpoint | Estrategia |
|---|---|
| `GET /p/menu` | `ETag` + `Cache-Control: private, max-age=30` |
| `GET /p/sesion` | `ETag`, sondeo cliente cada 3 s con `If-None-Match` |
| `GET /op/comandas` | `ETag`, sondeo cliente cada 5 s con `If-None-Match` |

El `ETag` se deriva de `max(actualizado_en)` de las filas implicadas y se cachea en Redis con TTL de 5 s.

### 1.5 Límites de tasa

| Ámbito | Límite |
|---|---|
| Por token de invitado | 120 peticiones/min |
| `POST /p/llamar-mesero` | 1 por minuto por sesión (AC-12.3) |
| `POST /admin/**` | 60 peticiones/min por operador |
| `POST /admin/platillos/{id}/modelo3d/generar` | 20 por hora por restaurante |
| Global por IP | 600 peticiones/min |

### 1.6 Versionado

La versión va en la ruta (`/api/v1`). Cambios compatibles (campos nuevos opcionales) no incrementan versión. Cambios incompatibles crean `/api/v2` y `v1` se mantiene 90 días.

---

## 2. Endpoints del comensal (`/api/v1/p`)

### 2.1 Entrada

#### `POST /p/sesion/entrar`
Crea o reanuda la identidad de invitado y la sesión de la mesa. Es el primer llamado tras cargar `/m/{codigo}`.

**Body:** `{ "codigo_mesa": "aBc123..." }`
**Respuesta 200:**
```json
{
  "sesion": {
    "id": "uuid", "estado": "activa",
    "mesa": { "numero": 7, "capacidad": 4 },
    "restaurante": { "id": "uuid", "nombre": "La Querencia", "logo_url": "..." }
  },
  "miembro": { "id": "uuid", "alias": "Comensal 2", "color_avatar": "#B8860B", "rol": "miembro" }
}
```
**Efectos:** `Set-Cookie: carta_invitado=<jwt>; HttpOnly; Secure; SameSite=Lax; Max-Age=21600`. Registra evento `scan`.
**Errores:** 404 `MESA_NO_ENCONTRADA` (mesa inexistente, inactiva o código revocado), 409 `SESION_LLENA` (12 miembros).
**Cubre:** AC-01.1 a AC-01.5, AC-02.1, AC-02.2, AC-02.5, AC-03.1.

#### `PATCH /p/miembro`
Cambia el alias. **Body:** `{ "alias": "Sofía" }` · 422 `ALIAS_NO_PERMITIDO`. **Cubre:** AC-03.2, AC-03.3.

---

### 2.2 Menú

#### `GET /p/menu`
Menú completo del restaurante de la mesa. Sin parámetros: el restaurante se deriva del token.

```json
{
  "categorias": [
    { "id": "uuid", "nombre": "Entradas", "orden": 1,
      "platillos": [
        { "id": "uuid", "nombre": "Tuétano asado", "descripcion": "...",
          "precio": "245.00", "disponible": true,
          "foto_url": "...", "foto_thumb_url": "...",
          "tiene_modelo_3d": true,
          "alergenos": ["lacteos"], "etiquetas": ["picante"],
          "nivel_picante": 2, "calorias": 640 }
      ] }
  ],
  "actualizado_en": "2026-08-30T19:04:11Z"
}
```
**Notas:** sólo platillos `activo = true`. `tiene_modelo_3d` es `true` únicamente si existe un `modelo_3d` en estado `publicado` (INV-5). **Cubre:** AC-04.1, AC-04.2, AC-04.4, AC-19.1.

#### `GET /p/platillos/{id}`
Detalle con URLs de modelo. Devuelve `modelo_3d: { glb_url, usdz_url, poster_url, dimension_cm }` o `null`. Registra `dish_view`. **Cubre:** AC-07.1, AC-07.4, AC-08.2.

> El filtrado por alérgeno y la búsqueda (US-05, US-06) se resuelven **en el cliente** sobre el menú ya descargado: el menú completo pesa pocos KB y evitar viajes al servidor mejora NFR-01. El servidor no expone endpoints de filtro en el MVP.

---

### 2.3 Orden

#### `GET /p/orden` — orden personal en curso del miembro.

#### `POST /p/orden/items`
**Body:** `{ "platillo_id": "uuid", "cantidad": 2, "notas": "sin cebolla" }`
**Errores:** 403 `ORDEN_BLOQUEADA`, 409 `PLATILLO_NO_DISPONIBLE`, 422 `NOTAS_MUY_LARGAS` (>140).
**Cubre:** AC-10.1, AC-10.2, AC-04.4.

#### `PATCH /p/orden/items/{item_id}` — cambia cantidad o notas.
#### `DELETE /p/orden/items/{item_id}` — elimina el ítem.

#### `POST /p/orden/confirmar`
Confirma la orden, congela precios, marca al miembro como listo y, si todos confirmaron, crea la comanda.
**Cabecera:** `Idempotency-Key` recomendada.
**Respuesta 200:** `{ "orden": {...}, "sesion": { "estado": "lista_para_enviar", "listos": 4, "total_miembros": 4 }, "comanda_creada": true }`
**Errores:** 409 `ORDEN_VACIA`, 409 `SESION_YA_ENVIADA`.
**Cubre:** AC-11.1, AC-11.2, AC-11.4, AC-12.1, AC-10.4.

#### `POST /p/orden/deshacer-confirmacion`
Sólo mientras la sesión no haya generado comanda. 409 `SESION_YA_ENVIADA` en caso contrario. **Cubre:** AC-11.3.

---

### 2.4 Sesión y coordinación

#### `GET /p/sesion`
Estado de la sesión para el sondeo de 3 s. Soporta `If-None-Match` → `304`.

```json
{
  "estado": "activa",
  "listos": 3,
  "total_miembros": 4,
  "miembros": [
    { "id": "uuid", "alias": "Sofía", "color_avatar": "#B8860B", "estado": "listo",
      "items": [ { "platillo_id": "uuid", "nombre": "Tuétano asado", "cantidad": 1 } ] }
  ]
}
```
**Nota:** se exponen los ítems de los demás para permitir la vista previa 3D (AC-09.1), pero nunca sus identificadores de orden, para hacer imposible modificarlas desde el cliente (AC-09.2). **Cubre:** AC-02.3, AC-11.4.

#### `POST /p/llamar-mesero`
**Body:** `{ "motivo": "atencion" }` · 429 si se supera 1/min. **Cubre:** AC-12.3, AC-14.1.

---

### 2.5 Cuenta opcional (Capa 1)

#### `POST /p/vincular-cuenta`
Vincula la sesión de invitado a una cuenta Firebase sin perder la orden.
**Cabecera:** `Authorization: Bearer <Firebase ID token>`. **Cubre:** AC-22.1, AC-22.2.

#### `GET|PUT /p/perfil` — perfil alimentario. **Cubre:** AC-23.1, AC-05.4.
#### `GET /p/perfil/exportar` — descarga JSON con todos los datos del usuario. **Cubre:** AC-23.3.
#### `DELETE /p/perfil` — borra la cuenta y anonimiza referencias. **Cubre:** AC-23.3.

---

### 2.6 Analítica

#### `POST /p/eventos`
Ingesta por lotes desde el cliente. **Body:** `{ "eventos": [ { "tipo": "ar_open", "platillo_id": "uuid", "ts": "..." } ] }`
Máximo 50 eventos por lote. Responde `202` siempre; un fallo de analítica jamás afecta la experiencia. **Cubre:** AC-24.1, AC-24.2, AC-08.4.

---

## 3. Endpoints de comandas (`/api/v1/op`)

#### `POST /op/dispositivo/activar`
Canjea un código de emparejamiento de un solo uso generado en el back-office por una cookie de dispositivo de 90 días.

#### `GET /op/comandas`
Lista de comandas abiertas y llamadas pendientes. Soporta `If-None-Match`.

```json
{
  "comandas": [
    { "id": "uuid", "mesa": 7, "secuencia": 1, "creada_en": "...", "minutos_espera": 2,
      "num_comensales": 4, "total_estimado": "1240.00",
      "ordenes": [ { "alias": "Sofía", "items": [ { "nombre": "Tuétano asado", "cantidad": 1, "notas": "sin cebolla" } ] } ] }
  ],
  "llamadas": [ { "id": "uuid", "mesa": 3, "motivo": "atencion", "creada_en": "..." } ],
  "actualizado_en": "..."
}
```
**Cubre:** AC-13.1, AC-13.4, AC-14.1.

#### `POST /op/comandas/{id}/atender`
**Body opcional:** `{ "atendida_por": "Carlos" }`. Idempotente: repetir devuelve 200 con el estado actual. **Cubre:** AC-13.3.

#### `POST /op/llamadas/{id}/atender` — marca la llamada como atendida.

---

## 4. Endpoints de back-office (`/api/v1/admin`)

Todos exigen Firebase ID token y una fila activa en `operador_restaurante`. El `restaurante_id` viaja en la ruta y se valida contra los permisos; si no coincide, **404**.

### 4.1 Menú

| Método | Ruta | Descripción | Cubre |
|---|---|---|---|
| `GET` | `/admin/restaurantes` | Restaurantes del operador | AC-15.2 |
| `GET` | `/admin/restaurantes/{rid}/categorias` | Lista categorías | US-16 |
| `POST` | `/admin/restaurantes/{rid}/categorias` | Crea categoría | AC-16.1 |
| `PATCH` | `/admin/categorias/{id}` | Edita, reordena o desactiva | AC-16.1 |
| `GET` | `/admin/restaurantes/{rid}/platillos` | Lista con estado de modelo 3D | US-16 |
| `POST` | `/admin/restaurantes/{rid}/platillos` | Crea platillo | AC-16.2 |
| `PATCH` | `/admin/platillos/{id}` | Edita; incluye `disponible` | AC-16.2, AC-16.3 |
| `DELETE` | `/admin/platillos/{id}` | Desactivación lógica | AC-16.3 |

### 4.2 Fotos

#### `POST /admin/platillos/{id}/foto`
`multipart/form-data`, campo `archivo`. Acepta JPG, PNG, HEIC hasta 15 MB. Genera miniatura 400 px y detalle 1200 px en WebP; conserva el original en el bucket privado.
**Errores:** 413 `ARCHIVO_EXCEDE_LIMITE`, 422 `FORMATO_NO_SOPORTADO`. **Cubre:** AC-17.1, AC-17.2, AC-17.3.

### 4.3 Modelos 3D

| Método | Ruta | Descripción | Cubre |
|---|---|---|---|
| `POST` | `/admin/platillos/{id}/modelo3d/generar` | Encola generación. `202` con `job_id` en ≤1 s | AC-18.1 |
| `GET` | `/admin/trabajos3d/{job_id}` | Estado del trabajo | AC-18.2, AC-18.3 |
| `POST` | `/admin/platillos/{id}/modelo3d/subir` | Carga manual de `.glb` ≤ 50 MB | AC-20.1 |
| `GET` | `/admin/modelos3d?estado=listo_para_revision` | Cola de revisión con URLs firmadas 15 min | AC-19.1 |
| `POST` | `/admin/modelos3d/{id}/aprobar` | Publica: genera USDZ, copia a bucket público | AC-19.2 |
| `POST` | `/admin/modelos3d/{id}/rechazar` | Body `{ "motivo": "..." }` | AC-19.3 |
| `POST` | `/admin/modelos3d/{id}/despublicar` | Vuelve a mostrar sólo la foto | AC-19.4 |

**Regla dura:** `aprobar` es el **único** camino a `estado = 'publicado'`, y exige un usuario humano autenticado. El worker nunca puede publicar (INV-5).

### 4.4 Mesas y QR

| Método | Ruta | Descripción | Cubre |
|---|---|---|---|
| `GET` | `/admin/restaurantes/{rid}/mesas` | Lista de mesas | US-21 |
| `POST` | `/admin/restaurantes/{rid}/mesas` | Crea mesa con código de 128 bits | AC-21.1 |
| `POST` | `/admin/mesas/{id}/regenerar-codigo` | Revoca el anterior de inmediato | AC-21.3 |
| `GET` | `/admin/restaurantes/{rid}/mesas/qr.pdf` | PDF imprimible con todos los QR | AC-21.2 |

### 4.5 Dispositivos y métricas

| Método | Ruta | Descripción | Cubre |
|---|---|---|---|
| `POST` | `/admin/restaurantes/{rid}/dispositivos` | Genera código de emparejamiento de un uso | US-13 |
| `DELETE` | `/admin/dispositivos/{id}` | Revoca el dispositivo | US-13 |
| `GET` | `/admin/restaurantes/{rid}/metricas?desde=&hasta=` | Devuelve M1–M5 | AC-24.3 |

---

## 5. Salud e infraestructura

| Ruta | Respuesta |
|---|---|
| `GET /health` | `{"status":"ok","version":"...","db":"ok"}` — verifica conexión a base |
| `GET /ready` | 200 sólo si base y Redis responden; usado por Cloud Run |

---

## 6. Matriz de cobertura endpoint ↔ user story

| User story | Endpoints |
|---|---|
| US-01, US-02 | `POST /p/sesion/entrar` |
| US-03 | `PATCH /p/miembro` |
| US-04, US-05, US-06 | `GET /p/menu` (filtro y búsqueda en cliente) |
| US-07, US-08, US-09 | `GET /p/platillos/{id}`, `GET /p/sesion`, `POST /p/eventos` |
| US-10 | `POST|PATCH|DELETE /p/orden/items` |
| US-11 | `POST /p/orden/confirmar`, `POST /p/orden/deshacer-confirmacion` |
| US-12 | `POST /p/orden/confirmar`, `POST /p/llamar-mesero` |
| US-13, US-14 | `POST /op/dispositivo/activar`, `GET /op/comandas`, `POST /op/comandas/{id}/atender`, `POST /op/llamadas/{id}/atender`, `POST /admin/restaurantes/{rid}/dispositivos`, `DELETE /admin/dispositivos/{id}` |
| US-15 | Firebase + `operador_restaurante` en todo `/admin/**`; `GET /admin/restaurantes` |
| US-16 | CRUD de categorías y platillos |
| US-17 | `POST /admin/platillos/{id}/foto` |
| US-18 | `POST /admin/platillos/{id}/modelo3d/generar`, `GET /admin/trabajos3d/{job_id}` |
| US-19 | `GET /admin/modelos3d`, `POST /admin/modelos3d/{id}/aprobar`, `POST /admin/modelos3d/{id}/rechazar`, `POST /admin/modelos3d/{id}/despublicar` |
| US-20 | `POST /admin/platillos/{id}/modelo3d/subir` |
| US-21 | `GET|POST /admin/restaurantes/{rid}/mesas`, `POST /admin/mesas/{id}/regenerar-codigo`, `GET /admin/restaurantes/{rid}/mesas/qr.pdf` |
| US-22, US-23 | `POST /p/vincular-cuenta`, `GET|PUT|DELETE /p/perfil` |
| US-24 | `POST /p/eventos`, `GET /admin/restaurantes/{rid}/metricas` |

**Excepción:** `/health` y `/ready` no responden a ninguna user story; existen para la infraestructura.

**Verificación:** ninguna user story sin endpoint, ningún endpoint sin user story (salvo la excepción anterior). Se comprueba en la tarea T-6.6.
