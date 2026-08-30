# Carta MVP — Estrategia de Pruebas

**Versión:** 1.0 · **Fecha:** 30 de agosto de 2026

---

## 1. Principio

> Cada criterio de aceptación EARS del PRD debe tener **una prueba que falle si el criterio se rompe**.

No se persigue un porcentaje de cobertura como objetivo en sí. Se persigue que las reglas que importan estén protegidas. Dicho eso, hay un piso: **80% en `app/services/`**, donde vive la lógica de negocio.

---

## 2. Pirámide de pruebas

```
        ╱  E2E manual (12 pasos, por release)
      ╱    Campo (piloto real)
    ╱─────  Integración (API + PostgreSQL real) ← el grueso
  ╱───────  Unitarias (servicios puros)
```

| Nivel | Qué prueba | Herramienta | Cuándo corre |
|---|---|---|---|
| **Unitaria** | Servicios sin base ni framework: cálculo de totales, reglas de estado, validaciones | `pytest` | En cada commit |
| **Integración** | Endpoints reales contra PostgreSQL y Redis reales | `pytest` + `httpx.AsyncClient` + contenedores | En cada commit |
| **Frontend** | Filtros, visor 3D, escala, sesión grupal | `vitest` | En cada commit |
| **Carga** | NFR-02, NFR-03, NFR-07 | `k6` | Antes de cada despliegue a producción |
| **Campo** | Todo el sistema en un restaurante real | Manual con checklist | Antes de cada piloto nuevo |

**Nada de mocks de base de datos.** Las pruebas de integración usan PostgreSQL de verdad porque la mitad de las reglas del sistema son restricciones de base (INV-1 a INV-6). Un mock las haría invisibles.

---

## 3. Fixtures base

`tests/conftest.py` provee:

| Fixture | Qué da |
|---|---|
| `db` | Base efímera con migraciones aplicadas; se destruye por test con transacción revertida |
| `redis` | Instancia limpia por test |
| `restaurante` | Restaurante con 3 categorías y 12 platillos |
| `mesa` | Mesa activa con código público válido |
| `invitado` | Cliente HTTP con cookie de invitado ya emitida |
| `operador` | Cliente HTTP con token de Firebase falsificado y fila en `operador_restaurante` |
| `dispositivo` | Cliente HTTP con cookie de dispositivo del restaurante |
| `otro_restaurante` | Segundo restaurante para probar aislamiento |

**Regla de aislamiento:** toda prueba de endpoint de restaurante debe tener su gemela que verifique que `otro_restaurante` recibe **404**.

---

## 4. Cobertura por criterio de aceptación

| Épica | Criterios | Nivel principal | Archivo |
|---|---|---|---|
| A · Entrada y sesión | AC-01.x, AC-02.x, AC-03.x | Integración | `tests/integration/test_entrar.py`, `test_alias.py` |
| B · Menú | AC-04.x, AC-05.x, AC-06.1 | Integración + frontend | `test_menu.py`, `frontend/tests/filtros.test.ts` |
| C · AR | AC-07.x, AC-08.x, AC-09.x | Frontend + manual | `visor3d.test.ts`, checklist §5 |
| D · Orden | AC-10.x, AC-11.x, AC-12.x | Unitaria + integración | `test_servicio_orden.py`, `test_confirmar.py`, `test_comanda.py` |
| E · Comandas | AC-13.x, AC-14.1 | Integración + manual | `test_comandas_op.py` |
| F · Back-office | AC-15.x … AC-21.x | Integración | `test_admin_*.py`, `test_modelos3d.py` |
| G · Cuenta | AC-22.x, AC-23.x | Integración | `test_cuenta.py` |
| H · Analítica | AC-24.x | Integración | `test_analitica.py`, `test_metricas.py` |

---

## 5. Pruebas de campo

Checklist obligatorio antes de abrir un restaurante piloto (T-6.8). Se ejecuta **en el local, en horario de servicio**, con un iPhone y un Android.

| # | Paso | Criterio de paso |
|---|---|---|
| 1 | Escanear el QR de 3 mesas distintas con la cámara nativa | Abre el menú correcto en < 3 s |
| 2 | Repetir con la red del local saturada (hora pico) | Sigue abriendo en < 5 s |
| 3 | Abrir 5 platillos con modelo | El 3D carga en los 5 |
| 4 | Pulsar "Ver en mi mesa" en iPhone | AR Quick Look abre a escala correcta |
| 5 | Pulsar "Ver en mi mesa" en Android | Scene Viewer abre a escala correcta |
| 6 | Abrir el menú en un dispositivo sin soporte AR | El botón AR no aparece; el 3D funciona |
| 7 | Sesión de 4 personas: cada una arma su orden | Los avatares y el progreso se ven en los 4 dispositivos |
| 8 | Confirmar las 4 órdenes | La comanda aparece en la tablet en < 5 s con sonido |
| 9 | Poner la tablet en modo avión 30 s y restaurar | Muestra "sin conexión" y recupera la comanda pendiente |
| 10 | Marcar la comanda como atendida | Desaparece de la lista en los demás dispositivos |
| 11 | Llamar al mesero desde el teléfono | Aparece como llamada distinguible de una comanda |
| 12 | Desactivar un platillo desde el back-office | Desaparece del menú del comensal en < 60 s |

**Un solo paso en rojo detiene la apertura del piloto.**

---

## 6. Pruebas de carga

Escenario `k6` que replica el pico previsto (NFR-07):

| Parámetro | Valor |
|---|---|
| Sesiones concurrentes | 200 |
| Sondeo por sesión | cada 3 s a `GET /p/sesion` |
| Tablets de comandas | 10, sondeando cada 5 s |
| Escrituras | 20 confirmaciones/min |
| Duración | 15 min |

**Criterios de paso:** p95 de lectura ≤ 200 ms, p95 de escritura ≤ 400 ms, ≥ 90% de respuestas `304` en sondeos, 0 errores 5xx, ninguna comanda perdida al comparar confirmaciones enviadas contra comandas creadas.

---

## 7. Pruebas de resiliencia (caos)

La regla G3 —cero comandas perdidas— exige verificarla activamente, no suponerla.

| Experimento | Cómo | Resultado esperado |
|---|---|---|
| Matar la API a mitad de una confirmación | `kill -9` durante la transacción | O la comanda existe completa, o la orden sigue sin confirmar. Nunca un estado intermedio |
| Caída de Redis | Detener el contenedor | La API sigue sirviendo; se pierde caché e idempotencia, no datos |
| Latencia alta en base | `tc` con 500 ms | Peticiones lentas pero correctas; sin duplicación de comandas |
| Doble confirmación simultánea | Dos peticiones en paralelo con el mismo miembro | Una comanda, no dos |
| Reloj desincronizado en el worker | Adelantar 2 h | Los trabajos no se marcan `fallido` por timeout indebido |

---

## 8. Datos de prueba

- **Nunca** se usan datos reales de restaurantes en desarrollo.
- Las fotos de prueba viven en `tests/fixtures/fotos/` (5 platillos con licencia libre).
- Los modelos 3D de prueba en `tests/fixtures/modelos/`: uno válido, uno corrupto, uno que excede presupuesto.
- La base de desarrollo se puebla con `scripts/seed.py`, nunca con volcados de producción.

---

## 9. Integración continua

`.github/workflows/ci.yml` ejecuta, en este orden, y falla al primer rojo:

1. `ruff check` y `black --check`
2. `mypy app`
3. `pytest tests/unit -q`
4. `pytest tests/integration -q` (con servicios PostgreSQL y Redis)
5. `npm test` y `npm run build`
6. `node scripts/check-bundle.js` (presupuesto NFR-08)
7. `python scripts/verificar_trazabilidad.py`

Cobertura mínima exigida: 80% en `app/services/`. La barrera se aplica sólo a esa carpeta; forzar cobertura en capas de transporte produce pruebas ceremoniales sin valor.

---

## 10. Qué NO se prueba automáticamente (y por qué)

| Área | Por qué se deja manual |
|---|---|
| Fidelidad visual del sistema de diseño | Una prueba de captura de pantalla es frágil y cara; se revisa con checklist humano |
| Calidad de un modelo 3D generado | Es un juicio estético; ese es exactamente el rol del gate de revisión |
| Comportamiento de AR Quick Look | No hay entorno automatizable fiable; se cubre en pruebas de campo |
| Experiencia con red real de restaurante | Sólo se puede medir en sitio |
