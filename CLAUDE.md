# CLAUDE.md — Reglas de trabajo en el repositorio Carta

Se carga en cada sesión. Es la primera lectura obligatoria. El detalle vive en skills (`.claude/skills/`) para que este archivo se mantenga corto. `AGENTS.md` apunta aquí para otras herramientas.

---

## Qué es Carta v1

Un restaurante sube su carta en PDF y en minutos tiene un menú visual por QR; los comensales arman su orden juntos desde sus teléfonos y el mesero la recibe en el suyo. **Sin pagos, sin 3D ni realidad aumentada, sin cuenta para el comensal.** Tres roles: comensal (anónimo), personal (mesero y capitán con PIN) y operador (dueño o gerente con cuenta).

---

## Antes de escribir código

Lee, en este orden: `docs/plan/README.md` (plan vigente y decisiones) → `docs/plan/04_Fases_y_Tareas.md` (**tu tarea** `T-x.y`, su carril y su comando de verificación) → `docs/plan/02_Arquitectura_v1.md` y `03_Datos_v1.md` (contratos) → `docs/mvp/04_API_Spec.md` §1 (convenciones y errores), `docs/mvp/01_PRD.md` §7 (criterios EARS) y el ADR que toque (`docs/mvp/adr/`).

Si vas a tocar `migrations/` o `app/db/models.py`, lee antes el skill `/migracion` (índices en FKs con cascada, CHECK en la base, triggers con `FOR SHARE` y `search_path`, qué no ve `compare_metadata`).

**Regla:** si lo que vas a hacer contradice un documento, **no lo hagas**. Detente, explica la contradicción y propón actualizar el documento primero. Los documentos son la fuente de verdad; el código los sigue. Lo que no está en el plan se especifica antes con `/especificar`.

---

## Comandos

```bash
uv sync                                   # dependencias (Python 3.12)
docker compose up -d                      # PostgreSQL 16 local
uv run alembic upgrade head               # migraciones
uv run python scripts/seed.py             # datos de desarrollo
uv run uvicorn app.main:app --reload --port 8000

# Calidad — deben pasar antes de cada commit
uv run ruff check . && uv run ruff format --check . && uv run mypy app && uv run pytest -q
uv run python scripts/verificar_trazabilidad.py --tarea T-x.y --estricto   # criterio → prueba

# Frontend (desde T-0.5)
npm --prefix frontend run tipos           # tipos desde /openapi.json
npm --prefix frontend test && npm --prefix frontend run build && node frontend/scripts/presupuesto.mjs
```

---

## Reglas duras

No se negocian sin un ADR nuevo.

1. **Español en el dominio.** Tablas, modelos, servicios y variables de negocio en español (`platillo`, `comanda`, `personal_restaurante`). Inglés sólo en palabras clave del lenguaje y librerías (ADR-008).
2. **`app/services/` no importa FastAPI.** Si necesitas `Request` o `HTTPException` en un servicio, el diseño está mal.
3. **Nunca `Base.metadata.create_all()`.** El esquema se cambia sólo con migraciones de Alembic, y las migraciones **se commitean**.
4. **El precio nunca viene del cliente.** Se lee de la base al agregar el ítem y se congela al confirmar.
5. **`restaurante_id` sale del token, jamás de un parámetro de la petición.**
6. **Recurso de otro restaurante devuelve 404, no 403.**
7. **Nada entra al menú desde un PDF sin que el operador confirme** (INV-9).
8. **Ninguna comanda se pierde.** Toda comanda persiste hasta tener estado terminal.
9. **Sin borrado físico** de entidades con historial: `activo = false`.
10. **Sin datos personales ni sensibles del comensal en el servidor.** Los filtros de alérgenos viven en el teléfono.
11. **El PIN nunca se guarda ni se registra en claro** (Argon2id).
12. **Sin secretos en el repositorio.** Todo por variable de entorno.
13. **Sin SDKs propietarios de nube.** PostgreSQL, S3 compatible y variables de entorno (ADR-012).
14. **Sin 3D ni AR en la v1** (ADR-011).
15. **Una tarea del plan = un commit** con el ID: `T-2.3: menú público con ETag`. Cada prueba de criterio lleva `@pytest.mark.ac("AC-x.y")`.

---

## Arquitectura en 10 líneas

- Una imagen Docker portable: API FastAPI (uvicorn, N workers) que sirve también la PWA, más PostgreSQL 16. Primer destino Railway (ADR-015); variante VM con Compose y Caddy en `deploy/vps/` (ADR-012). Cloudflare delante; R2 para fotos y respaldos.
- Tres audiencias, tres autenticaciones: `/api/v1/p` (comensal, JWT de invitado en cookie), `/api/v1/op` (personal, PIN → cookie de 12 h), `/api/v1/admin` (operador, Firebase).
- El menú es público por `slug` y cacheable en el borde; el sondeo responde `304` sin tocar la base.
- Sin WebSockets: sondeo adaptativo con ETag, 3 s comensal y 5 s personal, pausado en segundo plano (ADR-004).
- Sin Redis: caché en proceso, ETags en memoria, idempotencia en la tabla `clave_idempotencia`.
- Importación de PDF: `importacion_menu` + procesador en proceso + API de Claude con salida estructurada; el operador revisa y confirma (ADR-014).
- Frontend: Vite + React + TypeScript, una SPA con tres áreas (`/m`, `/staff`, `/admin`), PWA, bundle ≤ 250 KB.
- Imagen del platillo: foto (recomendada) → ilustración por categoría → generada por IA (v1.1).
- Contrato primero: el backend publica `app/schemas/` y `/openapi.json`; el frontend genera tipos desde ahí.
- Despliegue: push a `master` → staging; etiqueta `v*` → producción. Rollback = versión anterior.

---

## Glosario (dominio → código)

| Término | Significado | Tabla / módulo |
|---|---|---|
| Comensal | Persona que come, anónima | `miembro_sesion` |
| Platillo | Ítem del menú | `platillo` |
| Mesa | Mesa física con su QR | `mesa` (`codigo_publico`) |
| Sesión | Grupo de comensales en una mesa | `sesion_grupal` |
| Orden personal | Lo que pide una persona | `orden_personal`, `item_orden` |
| Comanda | Pedido de la mesa enviado al personal | `comanda` (`abierta` → `atendida` → `servida`) |
| Llamada | Solicitud de atención | `llamada_mesero` |
| Personal | Mesero o capitán, entra con PIN | `personal_restaurante` |
| Capitán | Personal con `rol = capitan`: mismas pantallas, opciones extra | `personal_restaurante.rol` |
| Operador | Dueño o gerente, administra el menú | `operador_restaurante`, `usuario` |
| Importación | PDF convertido en borrador de menú | `importacion_menu` |

---

## Diseño visual

Todo lo que ve un usuario sigue el skill `/diseno-visual`. Lo esencial: fondo Crema `#FEF9F1`, texto Deep Charcoal `#1A1A1A`, primario Vino `#4F1728 → #6B2D3E`, Dorado `#B8860B` con moderación; **DM Serif Display** para títulos y **DM Sans** para cuerpo e interfaz; radio mínimo 20 px, botones píldora, regla "no-line" (sin bordes de 1 px para separar), sombras cálidas, animaciones de resorte, hojas inferiores; teléfono primero, áreas táctiles ≥ 44 px.

---

## Ciclo de trabajo (spec-driven + Compound Engineering)

Detalle en `docs/plan/07_Spec_Driven.md`. Cada sesión recorre cinco pasos y cada vuelta deja una capa que la siguiente hereda.

| Paso | Cómo | Deja |
|---|---|---|
| 0 · Especificar | Sólo si no está en el plan: `/especificar` → `docs/specs/NNN-*/spec.md` → tareas en 04 | Criterios verificables |
| 1 · Planear | Plan mode (`shift+tab`) o `/tarea T-x.y`: investiga sin tocar nada | Un plan revisable |
| 2 · Trabajar | Pruebas primero (marcadas con el criterio), luego código; subagente `implementador` para pasos aislados, `explorador` para buscar | Código y pruebas |
| 3 · Revisar | `/revisar` (seguridad · pruebas · adversarial), `/analizar T-x.y` (spec ↔ contrato ↔ código ↔ pruebas) y `/code-review` antes del PR | Hallazgos resueltos |
| 4 · Compound | `/compound` antes de cerrar: ¿qué aprendimos que la próxima sesión debería saber? | Memoria para la próxima |

Cada lección se vuelve un artefacto: bug que regresa → test (`tests/`); hallazgo de revisión → regla (aquí, corto); procedimiento repetido → skill (`.claude/skills/`); regla que no puede fallar → hook (`.claude/hooks/`); decisión costosa → ADR (`docs/mvp/adr/`). Varias tareas en paralelo: una sesión maestra con `/orquestar`, una hija por carril. Este archivo no pasa de 150 líneas; lo que crezca se mueve a una skill.

---

## Al terminar una tarea

1. El comando de **Verificar** de la tarea y la puerta de calidad en verde. Si algo falla, la tarea no está hecha.
2. Commit con el ID de la tarea. No hagas push a `master` ni fuerces un push; todo entra por PR con `.github/pull_request_template.md`.
3. Si el plan estaba equivocado, corrígelo en `docs/plan/04_Fases_y_Tareas.md` y añade la fila en su registro de cambios (§11).
4. **`/compound` siempre**, según el resultado (TERMINADA · BLOQUEADA · FALLIDA, ver `07_Spec_Driven.md` §2.3), y termina con el bloque `RESULTADO:`. Después la sesión se cierra: **una tarea, una sesión**; la siguiente arranca en una sesión nueva con la memoria actualizada.

---

## Qué NO construir

El alcance de la v1 está cerrado. No construyas, aunque parezca obvio o fácil: realidad aumentada o 3D; pagos, propinas o comisión; cuenta, perfil o historial del comensal; Carta+; analytics del restaurante; perfil portable del mesero o invitaciones por QR; pantallas propias del capitán; asignación de mesas por mesero; multi-idioma; multi-sucursal; Redis, colas o Kubernetes. Si crees que algo de esto es necesario, dilo antes de escribir código.

---

## Estado del código

Fase 0 en curso: T-0.1 (toolchain, `Settings`) y T-0.2 (motor asyncpg, modelos v1 con `Mapped[]`, migración `0001_base_v1` con triggers INV-3/INV-8) hechas. Faltan errores, `/ready` y la estructura de carpetas (T-0.3). La lista de problemas heredados y la tarea que corrige cada uno está en `docs/plan/04_Fases_y_Tareas.md` §4.
