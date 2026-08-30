# CLAUDE.md — Reglas de trabajo en el repositorio Carta

Este archivo se carga automáticamente al abrir el proyecto con Claude Code. Es la primera lectura obligatoria.

---

## Qué es Carta

Plataforma de menú con realidad aumentada para restaurantes en México. El comensal escanea el QR de su mesa, ve los platillos en 3D sobre la mesa, arma su orden y, cuando todos en la mesa confirman, se avisa al personal.

**El MVP responde una sola pregunta:** ¿ver el platillo en 3D antes de pedirlo cambia el comportamiento del comensal, y el restaurante lo nota?

---

## Antes de escribir código

**Lee, en este orden:**

1. `docs/mvp/README.md` — mapa del paquete de diseño
2. `docs/mvp/06_Implementation_Plan.md` — qué toca construir ahora
3. `docs/mvp/03_Data_Model.md` y `docs/mvp/04_API_Spec.md` — contratos exactos
4. El ADR correspondiente si vas a tocar una decisión estructural

**Regla:** si lo que vas a hacer contradice un documento, **no lo hagas**. Detente, explica la contradicción y propón actualizar el documento primero. Los documentos son la fuente de verdad; el código los sigue.

---

## Comandos

```bash
# Entorno
docker compose up -d                  # PostgreSQL 15 + Redis 7
cp .env.example .env                  # configurar antes de arrancar

# Aplicación
uvicorn app.main:app --reload --port 8000
python worker/main.py                 # worker de generación 3D

# Base de datos
alembic upgrade head                  # aplicar migraciones
alembic revision --autogenerate -m "descripcion"
python scripts/seed.py                # datos de desarrollo

# Calidad — deben pasar antes de cada commit
ruff check app worker
black --check app worker
mypy app
pytest -q
pytest tests/unit -q                  # rápido, sin base
pytest tests/integration -q           # requiere docker compose arriba

# Frontend
npm --prefix frontend run dev
npm --prefix frontend run build       # compila a app/static/
npm --prefix frontend test
```

---

## Reglas duras

Estas no se negocian sin cambiar un ADR.

1. **Español en el dominio.** Tablas, modelos, servicios y variables de negocio en español (`platillo`, `comanda`, `orden_personal`). Inglés sólo en palabras clave del lenguaje y librerías. Ver ADR-008.
2. **`app/services/` no importa FastAPI.** La lógica de negocio es independiente del transporte. Si necesitas `Request` o `HTTPException` en un servicio, el diseño está mal.
3. **Nunca `Base.metadata.create_all()`.** El esquema se cambia sólo con migraciones de Alembic.
4. **El precio nunca viene del cliente.** Se lee de la base al agregar el ítem y se congela al confirmar.
5. **`restaurante_id` sale del token, jamás de un parámetro de la petición.**
6. **Recurso de otro restaurante devuelve 404, no 403.** No se filtra la existencia.
7. **Ningún modelo 3D se publica sin aprobación humana.** El worker no puede publicar; la base lo impide.
8. **Ninguna comanda se pierde.** Toda comanda persiste hasta tener estado terminal.
9. **Sin borrado físico** de entidades con historial: `activo = false`.
10. **Sin datos personales del comensal en Capa 0.** Nada de nombres reales, correos, ubicación ni identificadores publicitarios.
11. **Sin secretos en el repositorio.** Todo por variable de entorno o Secret Manager.
12. **Una tarea del plan = un commit** con el ID: `T-2.3: endpoint de menú con ETag`.

---

## Arquitectura en 10 líneas

- Un servicio FastAPI en Cloud Run sirve la API y los estáticos (ADR-001, ADR-010).
- Tres audiencias, tres autenticaciones: `/api/v1/p` (comensal, JWT de invitado), `/api/v1/op` (comandas, token de dispositivo), `/api/v1/admin` (back-office, Firebase).
- PostgreSQL 15 con SQLAlchemy 2.0 async sobre `asyncpg`. Redis para caché, ETags, idempotencia y límites de tasa.
- El comensal usa una PWA, no una app nativa (ADR-002). El AR lo resuelve `<model-viewer>` delegando en Scene Viewer (Android) y AR Quick Look (iOS).
- Sin WebSockets: sondeo HTTP con ETag cada 3 s (comensal) y 5 s (comandas) (ADR-004).
- La cola de generación 3D es una tabla con `FOR UPDATE SKIP LOCKED`. El worker corre fuera de GCP durante el piloto.
- Assets en dos buckets: público con CDN para lo publicado, privado con URLs firmadas para originales y borradores (ADR-007).

---

## Glosario (dominio → código)

| Término | Significado | Tabla / módulo |
|---|---|---|
| Comensal | Persona que come | `miembro_sesion`, `usuario` |
| Platillo | Ítem del menú | `platillo` |
| Mesa | Mesa física con su QR | `mesa` |
| Sesión | Grupo de comensales en una mesa | `sesion_grupal` |
| Miembro | Un comensal dentro de una sesión | `miembro_sesion` |
| Orden personal | Lo que pide una persona | `orden_personal` |
| Comanda | Pedido de la mesa enviado al piso | `comanda` |
| Llamada | Solicitud de atención | `llamada_mesero` |
| Operador | Quien administra el menú | `operador_restaurante` |
| Borrador | Modelo 3D pendiente de revisión | `modelo_3d` con estado `listo_para_revision` |

---

## Diseño visual

Todo lo que ve un usuario sigue `docs/Carta_Design_System.md`. Lo esencial:

- Fondo Crema `#FEF9F1`. **Nunca** blanco puro ni negro puro.
- Texto Deep Charcoal `#1A1A1A`. Secundario `#5B4A3D`.
- Primario Vino, gradiente `#4F1728` → `#6B2D3E`. Acento Dorado `#B8860B`, con mucha moderación.
- Tipografía: Playfair Display para títulos, Inter para cuerpo e interfaz. Los precios en Inter SemiBold.
- Radio mínimo 20 px; botones tipo píldora.
- **Regla No-Line:** prohibido usar bordes de 1 px para separar secciones. Se separa con cambios de tono y espacio en blanco.
- Sombras cálidas: `0px 20px 40px rgba(29, 28, 23, 0.06)`.
- Animaciones tipo resorte (rigidez 300, amortiguación 20). Nada de transiciones deslizantes estándar.

Las 27 pantallas de referencia están en `stitch/` con su inventario en `stitch/README.md`.

---

## Al terminar una tarea

1. Ejecuta el comando de verificación que indica el plan. Si falla, la tarea no está hecha.
2. Ejecuta `ruff`, `black --check`, `mypy` y `pytest`.
3. Haz commit con el ID de la tarea.
4. Si descubriste que el plan estaba equivocado, **actualiza el plan** y anótalo en su registro de cambios al final de `06_Implementation_Plan.md`.

---

## Qué NO construir

El alcance del MVP está cerrado. No construyas, aunque parezca obvio o fácil:

- Pagos, propinas o comisión
- App de mesero (Mis Mesas, Detalle de Mesa)
- Panel de analytics para el restaurante
- Perfil portable del mesero, reputación o invitaciones por QR
- Onboarding self-service de restaurantes
- Plan Premium del comensal
- Multi-idioma

Todo esto ya está diseñado y vendrá después. Si crees que algo de esto es necesario para el MVP, dilo antes de escribir código.

---

## Errores conocidos del estado actual

Al 30 de agosto de 2026, antes de la Fase 0:

| Problema | Dónde | Tarea que lo corrige |
|---|---|---|
| La aplicación no arranca: `create_async_engine` con driver síncrono | `app/db/database.py`, `pyproject.toml` | T-0.1 |
| `create_all()` en el arranque en lugar de migraciones | `app/main.py` | T-0.3 |
| CORS abierto a todo origen | `app/main.py` | T-6.5 |
| `SECRET_KEY` por defecto en `.env.example` | `.env.example` | T-6.7 |
| `max_overflow=0` provoca esperas bajo carga | `app/db/database.py` | T-0.1 |
| Wireframes obsoletos frente a las pantallas de Stitch | `wireframes/` | T-0.4 (archivar) |
