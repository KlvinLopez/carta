# Carta MVP — Plan de Implementación

**Versión:** 1.0 · **Fecha:** 30 de agosto de 2026
**Destinatario:** Claude Code (o cualquier persona) construyendo sin contexto previo.

---

## Cómo usar este plan

1. Lee primero [`/CLAUDE.md`](../../CLAUDE.md).
2. Ejecuta las tareas **en orden**. Cada fase depende de la anterior.
3. Cada tarea tiene: **entregable**, **rutas exactas** y **comando de verificación**.
4. Una tarea no está terminada hasta que su comando de verificación pasa. No avances si falla.
5. Commit por tarea, con el ID en el mensaje: `git commit -m "T-2.3: endpoint de menú con ETag"`.

**Convención de estimación:** cada tarea está pensada para completarse en una sesión de trabajo enfocada. Las marcadas 🔴 son bloqueantes: si fallan, todo lo posterior se detiene.

---

## Resumen de fases

| Fase | Nombre | Entregable observable | Tareas |
|---|---|---|---|
| 0 | Reparar cimientos | La aplicación arranca y los tests corren | 6 |
| 1 | Datos y back-office mínimo | Se puede cargar un menú por API | 10 |
| 2 | Comensal: entrar y ver el menú | Escaneas un QR y ves el menú en tu teléfono | 10 |
| 3 | Orden y comandas | Confirmas una orden y aparece en la tablet | 9 |
| 4 | Experiencia AR | Ves el platillo en 3D sobre tu mesa | 7 |
| 5 | Pipeline 3D | Subes una foto y sale un modelo revisable | 8 |
| 6 | Analítica, seguridad y piloto | Sistema desplegado y medible | 8 |

**Total: 58 tareas.**

---

## Fase 0 — Reparar cimientos

> El repositorio actual **no arranca**. Antes de construir nada, hay que dejarlo en verde.

### 🔴 T-0.1 — Corregir el driver de base de datos
**Entregable:** `asyncpg` como driver de ejecución, según [ADR-009](adr/ADR-009-driver-async.md).
**Archivos:** `pyproject.toml`, `app/core/config.py` (nuevo), `app/db/database.py`
**Detalle:**
- Añadir `asyncpg==0.29.0` a `dependencies`; mover `psycopg2-binary` a `dev`.
- Crear `app/core/config.py` con la clase `Settings`, que normaliza `DATABASE_URL`: si no contiene `+asyncpg`, lo inserta y registra advertencia.
- `app/db/database.py` importa `Settings` desde `app.core.config` y deja de definirla.
- `max_overflow=10`.

**Verificar:**
```bash
python -c "from app.core.config import Settings; s=Settings(DATABASE_URL='postgresql://u:p@h/db'); assert '+asyncpg' in s.DATABASE_URL; print('ok')"
```

### 🔴 T-0.2 — Entorno local reproducible
**Entregable:** `docker compose up` levanta PostgreSQL 15 y Redis 7; la API arranca contra ellos.
**Archivos:** `docker-compose.yml`, `.env.example`, `SETUP.md`
**Verificar:**
```bash
docker compose up -d && sleep 5 && uvicorn app.main:app --port 8000 &
sleep 3 && curl -sf localhost:8000/health | grep '"db":"ok"'
```

### 🔴 T-0.3 — Migraciones en lugar de `create_all`
**Entregable:** eliminar `Base.metadata.create_all()` de `app/main.py`; el esquema se crea sólo con Alembic.
**Archivos:** `app/main.py`, `migrations/versions/0001_base_fase1.py`
**Verificar:**
```bash
alembic upgrade head && alembic downgrade base && alembic upgrade head
psql "$DATABASE_URL_SYNC" -c "\dt" | grep -q restaurante && echo ok
```

### T-0.4 — Estructura de carpetas objetivo
**Entregable:** árbol de `app/` conforme a [02_TDD §9](02_TDD.md#9-estructura-de-carpetas-objetivo). Rutas actuales de `app/api/routes.py` movidas a `app/api/admin/`.
**Verificar:** `test -d app/api/publico -a -d app/api/operacion -a -d app/api/admin -a -d app/services && echo ok`

### T-0.5 — Calidad automatizada
**Entregable:** `ruff`, `black --check` y `mypy` pasan; CI los ejecuta.
**Archivos:** `pyproject.toml`, `.github/workflows/ci.yml`
**Verificar:** `ruff check app worker && black --check app worker && mypy app`

### T-0.6 — Andamiaje de pruebas
**Entregable:** `pytest` con base de datos efímera y fixtures base según [07_Test_Strategy](07_Test_Strategy.md).
**Archivos:** `tests/conftest.py`, `tests/unit/`, `tests/integration/`
**Verificar:** `pytest -q` termina en verde con al menos una prueba de integración real contra PostgreSQL.

---

## Fase 1 — Datos y back-office mínimo

### T-1.1 — Migraciones del MVP
**Entregable:** migraciones `0002` a `0008` de [03_Data_Model §6](03_Data_Model.md#6-estrategia-de-migraciones).
**Verificar:** `alembic upgrade head && alembic downgrade -1 && alembic upgrade head` sin errores.

### T-1.2 — Modelos SQLAlchemy nuevos
**Entregable:** `Modelo3D`, `TrabajoModelo3D`, `Comanda`, `ComandaOrden`, `LlamadaMesero`, `OperadorRestaurante`, `DispositivoRestaurante`, `EventoAnalitica` en `app/db/models.py`.
**Verificar:** `pytest tests/unit/test_modelos.py` — comprueba que cada modelo mapea contra el esquema real.

### T-1.3 — Invariantes en base de datos
**Entregable:** índices únicos parciales y triggers de [03_Data_Model §5](03_Data_Model.md#5-reglas-de-integridad-implementadas-en-la-base).
**Verificar:** `pytest tests/integration/test_invariantes.py` — intentar violar INV-1, INV-2, INV-3, INV-5 debe lanzar `IntegrityError` en los cuatro casos.

### T-1.4 — Autenticación de operador
**Entregable:** verificación de Firebase ID token + resolución a `operador_restaurante`; dependencia `operador_actual`.
**Archivos:** `app/core/seguridad.py`, `app/api/admin/deps.py`
**Verificar:** `pytest tests/integration/test_auth_admin.py` — token ausente → 401; restaurante ajeno → 404.

### T-1.5 — CRUD de categorías y platillos
**Entregable:** endpoints de [04_API_Spec §4.1](04_API_Spec.md#41-menú).
**Verificar:** `pytest tests/integration/test_admin_menu.py` cubre AC-16.1 a AC-16.3.

### T-1.6 — Subida de fotos y variantes
**Entregable:** `POST /admin/platillos/{id}/foto` con generación de miniatura y detalle en WebP.
**Archivos:** `app/services/assets.py`
**Verificar:** `pytest tests/integration/test_fotos.py` — AC-17.1 a AC-17.3, incluyendo rechazo de un PDF renombrado a `.jpg`.

### T-1.7 — Mesas y códigos públicos
**Entregable:** creación de mesas con `secrets.token_urlsafe(16)` (128 bits) y regeneración con revocación inmediata.
**Verificar:** `pytest tests/integration/test_mesas.py` — AC-21.1, AC-21.3; el código anterior devuelve 404 tras regenerar.

### T-1.8 — PDF de códigos QR
**Entregable:** `GET /admin/restaurantes/{rid}/mesas/qr.pdf`.
**Verificar:** `pytest tests/integration/test_qr_pdf.py` — el PDF contiene tantas páginas o tarjetas como mesas y el contenido del QR decodifica a la URL correcta.

### T-1.9 — Semillas de desarrollo
**Entregable:** `scripts/seed.py` crea un restaurante con 3 categorías, 12 platillos, 8 mesas y un operador.
**Verificar:** `python scripts/seed.py && psql -c "select count(*) from platillo" | grep 12`

### T-1.10 — Interfaz web del back-office (menú)
**Entregable:** `app/static/admin/` con listado y edición de platillos, subida de foto, y gestión de mesas.
**Verificar:** manual — crear un platillo con foto desde el navegador y verlo en la base.

---

## Fase 2 — Comensal: entrar y ver el menú

### T-2.1 — Token de invitado
**Entregable:** emisión y verificación del JWT de invitado ([ADR-003](adr/ADR-003-identidad-invitado.md)); dependencia `invitado_actual`.
**Verificar:** `pytest tests/unit/test_token_invitado.py` — token manipulado o expirado → 401.

### T-2.2 — `POST /p/sesion/entrar`
**Entregable:** creación o reanudación de sesión y miembro, con alias y color.
**Verificar:** `pytest tests/integration/test_entrar.py` — AC-01.1 a AC-02.5 y AC-03.1; incluye caso de 13.º miembro → 409.

### T-2.3 — `GET /p/menu` con ETag y caché
**Entregable:** menú filtrado por activo, con caché Redis 60 s e invalidación al editar un platillo.
**Verificar:** `pytest tests/integration/test_menu.py` — segunda petición con `If-None-Match` → 304; tras `PATCH` de un platillo, el ETag cambia en menos de 60 s.

### T-2.4 — `GET /p/platillos/{id}`
**Entregable:** detalle con `modelo_3d` sólo si está publicado (INV-5).
**Verificar:** `pytest tests/integration/test_platillo_detalle.py` — un modelo en `listo_para_revision` no aparece.

### T-2.5 — `PATCH /p/miembro`
**Entregable:** cambio de alias con lista de bloqueo básica.
**Verificar:** `pytest tests/integration/test_alias.py` — AC-03.2, AC-03.3.

### T-2.6 — Esqueleto de la PWA
**Entregable:** `frontend/` compila a `app/static/comensal/`; ruta `/m/{codigo}` sirve la app.
**Archivos:** `frontend/`, `app/api/publico/paginas.py`
**Verificar:** `curl -sf localhost:8000/m/<codigo_semilla> | grep -q '<div id="app"'`

### T-2.7 — Pantalla de menú (P03)
**Entregable:** menú por categorías con el sistema de diseño de [`Carta_Design_System.md`](../Carta_Design_System.md): Crema `#FEF9F1`, Vino, Dorado, Playfair Display + Inter, radio ≥ 20 px, sin líneas divisorias.
**Verificar:** manual con checklist visual + `npx lighthouse` con puntuación de rendimiento ≥ 85 en móvil.

### T-2.8 — Filtros y búsqueda en cliente
**Entregable:** filtros de alérgeno y etiqueta, búsqueda insensible a acentos, aviso permanente sobre alérgenos.
**Verificar:** `npm test -- filtros` — AC-05.1 a AC-05.3, AC-06.1.

### T-2.9 — Presupuesto de rendimiento
**Entregable:** `EXPLAIN ANALYZE` de las consultas del camino crítico documentado en `docs/mvp/perf/`.
**Verificar:** ninguna consulta del comensal supera 50 ms con 10 000 platillos sembrados.

### T-2.10 — Manejo de errores del comensal
**Entregable:** pantallas de mesa inválida, sin conexión y error genérico, en el lenguaje visual de la marca.
**Verificar:** `pytest tests/integration/test_errores_publicos.py` — AC-01.3; el mensaje no revela si el código existe en otro restaurante.

---

## Fase 3 — Orden y comandas

### T-3.1 — Servicio de orden
**Entregable:** `app/services/orden.py` con agregar, modificar, eliminar y recalcular total; sin dependencias de FastAPI.
**Verificar:** `pytest tests/unit/test_servicio_orden.py` — cubre AC-10.1, AC-10.2, AC-10.4.

### T-3.2 — Endpoints de ítems
**Verificar:** `pytest tests/integration/test_orden_items.py` — incluye 403 sobre orden bloqueada y 409 con platillo no disponible.

### T-3.3 — Confirmación con congelado de precios
**Entregable:** transacción con `SELECT … FOR UPDATE` sobre la sesión; marca `bloqueada = true`.
**Verificar:** `pytest tests/integration/test_confirmar.py` — AC-11.1 a AC-11.3; una modificación posterior lanza `IntegrityError` por el trigger.

### T-3.4 — Creación de comanda
**Entregable:** al confirmar el último miembro, transición a `lista_para_enviar` y creación de comanda idempotente.
**Verificar:** `pytest tests/integration/test_comanda.py` — dos confirmaciones simultáneas crean **una** comanda (prueba de concurrencia con dos sesiones de base).

### T-3.5 — Idempotencia
**Entregable:** middleware de `Idempotency-Key` con almacenamiento en Redis 24 h.
**Verificar:** `pytest tests/integration/test_idempotencia.py` — la misma clave devuelve la respuesta original y `Idempotent-Replay: true`.

### T-3.6 — `GET /p/sesion` con ETag
**Entregable:** estado de sesión para sondeo, sin exponer identificadores de órdenes ajenas.
**Verificar:** `pytest tests/integration/test_sesion_estado.py` — AC-02.3, AC-09.2.

### T-3.7 — Llamada de mesero con límite
**Verificar:** `pytest tests/integration/test_llamar_mesero.py` — segunda llamada en menos de un minuto → 429.

### T-3.8 — Vista de Comandas (backend)
**Entregable:** activación de dispositivo, listado con ETag, atender comanda y llamada.
**Verificar:** `pytest tests/integration/test_comandas_op.py` — AC-13.1, AC-13.3, AC-14.1; cookie de otro restaurante no ve comandas ajenas.

### T-3.9 — Vista de Comandas (interfaz)
**Entregable:** `app/static/comandas/` con sondeo de 5 s, alerta sonora, resaltado de 10 s e indicador de sin conexión.
**Verificar:** manual — con la tablet en modo avión aparece "sin conexión"; al restaurar, la comanda pendiente sigue ahí (AC-13.5, AC-12.5).

---

## Fase 4 — Experiencia AR

### T-4.1 — Integración de `<model-viewer>`
**Entregable:** componente de visor con póster, carga diferida y control de errores.
**Verificar:** `npm test -- visor3d` — con URL inválida se muestra la foto y se emite `model_error` (AC-07.3).

### T-4.2 — Pantalla de detalle de platillo (P02)
**Entregable:** hero 3D, precio en Inter SemiBold, chips de ingredientes con emoji, según el sistema de diseño.
**Verificar:** manual con checklist visual.

### T-4.3 — Botón AR con detección de capacidad
**Entregable:** `ar-modes="webxr scene-viewer quick-look"`; el botón se oculta si no hay soporte.
**Verificar:** manual en iPhone (iOS 16+) y Android 10+; en escritorio el botón no aparece (AC-08.1, AC-08.3).

### T-4.4 — Escala física real
**Entregable:** aplicar `dimension_cm` al modelo; límite de 60 cm por eje.
**Verificar:** `npm test -- escala` — un modelo declarado de 22 cm se instancia a 0.22 m.

### T-4.5 — Eventos de AR
**Entregable:** emisión de `model_view` y `ar_open` por lotes.
**Verificar:** `pytest tests/integration/test_eventos.py` — AC-08.4, AC-24.1.

### T-4.6 — Vista previa de platillos ajenos
**Entregable:** desde la sesión grupal, tocar un platillo de otro miembro abre el detalle en modo consulta.
**Verificar:** `npm test -- sesion-grupal` — AC-09.1; no existe control que permita editar.

### T-4.7 — Presupuesto de la PWA
**Entregable:** el paquete inicial no supera 250 KB comprimido, sin contar modelos.
**Verificar:** `npm run build && node scripts/check-bundle.js` falla si se excede (NFR-08).

---

## Fase 5 — Pipeline 3D

### 🔴 T-5.1 — Evaluación del generador
**Entregable:** informe en `docs/mvp/perf/evaluacion_generador.md` con 20 fotos reales procesadas y tasa de aprobación.
**Criterio de paso:** ≥ 60% aprobadas sin retoque. Si no, se invierten las vías (curada por defecto) y se documenta la decisión.
**Verificar:** el informe existe y contiene las 20 evaluaciones con veredicto.

### T-5.2 — Interfaz `GeneradorImagen3D`
**Entregable:** `worker/generador.py` con el protocolo y una implementación falsa para pruebas.
**Verificar:** `pytest tests/unit/test_generador.py` con el doble de prueba.

### T-5.3 — Bucle del worker
**Entregable:** `worker/main.py` con `FOR UPDATE SKIP LOCKED`, reintentos y timeout de 20 min.
**Verificar:** `pytest tests/integration/test_worker.py` — dos workers concurrentes no toman el mismo trabajo.

### T-5.4 — Optimizador y presupuesto
**Entregable:** `worker/optimizador.py` con decimado, texturas, Draco y validación de límites.
**Verificar:** `pytest tests/unit/test_optimizador.py` — un GLB de 8 MB es rechazado (ADR-006).

### T-5.5 — Conversión a USDZ
**Verificar:** `pytest tests/integration/test_usdz.py` — el archivo generado abre en AR Quick Look (validación manual documentada la primera vez).

### T-5.6 — Endpoints de generación y revisión
**Entregable:** generar, consultar trabajo, subir manual, aprobar, rechazar, despublicar.
**Verificar:** `pytest tests/integration/test_modelos3d.py` — el worker **no** puede publicar; sólo `aprobar` con operador humano lo logra (INV-5).

### T-5.7 — Pantalla de revisión
**Entregable:** cola de revisión con visor lado a lado, metadatos y los tres botones.
**Verificar:** manual — aprobar un borrador lo hace visible en `GET /p/menu` en menos de 60 s.

### T-5.8 — Buckets y URLs firmadas
**Entregable:** separación público/privado de [ADR-007](adr/ADR-007-almacenamiento-assets.md) en Terraform.
**Verificar:** `curl -sf <url_borrador>` devuelve 403 sin firma; con firma, 200.

---

## Fase 6 — Analítica, seguridad y piloto

### T-6.1 — Ingesta de eventos
**Entregable:** `POST /p/eventos` con lotes de 50, `ip_hash` con sal rotativa diaria y familia de user-agent.
**Verificar:** `pytest tests/integration/test_analitica.py` — AC-24.2; ninguna fila contiene IP en claro.

### T-6.2 — Cálculo de métricas
**Entregable:** `GET /admin/restaurantes/{rid}/metricas` devuelve M1–M5.
**Verificar:** `pytest tests/integration/test_metricas.py` con un conjunto de eventos sembrado y valores esperados calculados a mano.

### T-6.3 — Vinculación de cuenta y perfil
**Entregable:** `POST /p/vincular-cuenta`, `GET|PUT|DELETE /p/perfil`, exportación de datos.
**Verificar:** `pytest tests/integration/test_cuenta.py` — AC-22.2 (la orden sobrevive), AC-23.3 (exportar y borrar).

### T-6.4 — Límites de tasa
**Entregable:** limitador con Redis según [04_API_Spec §1.5](04_API_Spec.md#15-límites-de-tasa).
**Verificar:** `pytest tests/integration/test_rate_limit.py` — la petición 121 en un minuto → 429.

### T-6.5 — Cabeceras de seguridad y CORS
**Entregable:** CSP, HSTS, `X-Content-Type-Options`, CORS restringido al dominio propio (hoy `allow_origins=["*"]`, que debe corregirse).
**Verificar:** `pytest tests/integration/test_seguridad_headers.py` y `curl -I` muestra las cabeceras.

### T-6.6 — Auditoría de trazabilidad
**Entregable:** `scripts/verificar_trazabilidad.py` comprueba que cada `US-xx` tiene endpoint y prueba, y que cada endpoint del OpenAPI aparece en la matriz de [04_API_Spec §6](04_API_Spec.md#6-matriz-de-cobertura-endpoint--user-story).
**Verificar:** `python scripts/verificar_trazabilidad.py` sale con código 0.

### T-6.7 — Infraestructura y despliegue
**Entregable:** Terraform con buckets, secretos y Cloud Run; el despliegue ejecuta `alembic upgrade head` antes de conmutar el tráfico.
**Verificar:** `terraform plan` sin cambios pendientes tras aplicar; `curl -sf https://<url>/health` devuelve 200.

### T-6.8 — Ensayo de piloto
**Entregable:** recorrido completo en un restaurante real: cargar menú, generar modelos, imprimir QR, escanear con iPhone y Android, confirmar orden y verla en la tablet.
**Verificar:** lista de verificación de [07_Test_Strategy §5](07_Test_Strategy.md#5-pruebas-de-campo) firmada, con los 12 pasos en verde.

---

## Criterio de terminación del MVP

El MVP está listo cuando **todas** estas condiciones se cumplen:

- [ ] Las 58 tareas tienen su comando de verificación en verde.
- [ ] Los 24 user stories tienen al menos una prueba automatizada que cubre sus criterios EARS.
- [ ] `pytest` completo pasa con cobertura ≥ 80% en `app/services/`.
- [ ] El recorrido de T-6.8 se completó en un restaurante real con dos dispositivos distintos.
- [ ] Ninguna comanda se perdió durante 3 días consecutivos de operación de prueba (G3, NFR-06).
- [ ] `python scripts/verificar_trazabilidad.py` sale en 0.

---

## Registro de cambios del plan

Cuando una tarea revele que el plan estaba equivocado, **se corrige el plan**, no se improvisa en el código. Añade una fila aquí:

| Fecha | Tarea | Qué se descubrió | Cambio aplicado |
|---|---|---|---|
| — | — | — | — |
