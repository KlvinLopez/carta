# Ensayo y pasos manuales

Aquí se registran los criterios de aceptación que se comprueban **a mano** (no los cubre una prueba automatizada) y, a partir de T-4.7, los 12 pasos del ensayo en un restaurante real ([05 §9](../plan/05_Operacion.md)). `scripts/verificar_trazabilidad.py` cuenta como cobertura manual todo criterio que aparezca en este archivo con su ID.

## Pasos manuales vigentes

### AC-01.1 — el menú se ve en 3 s o menos (p75, red 4G)

**Cómo se mide** (dos mediciones, las dos contra staging, con el enlace de una mesa de prueba que después se regenera):

1. **Tiempo hasta ver el menú**, desde una sesión de trabajo: `frontend/scripts/medir-ac-01-1.mjs` (Chromium con la red y el procesador limitados de verdad; 9 cargas en frío por perfil; p75 de «menú visible»). El enlace de la mesa va sólo en la variable `CARTA_MESA_URL` y la salida en una carpeta fuera del repositorio. Método y límites en [`docs/plan/perf/2026-11-12-ac-01-1-staging.md`](../plan/perf/2026-11-12-ac-01-1-staging.md).
2. **Nota de rendimiento de Lighthouse** (el «Verificar» de T-2.5 pide 85 o más), en un Chrome de verdad: ventana de incógnito sin extensiones, F12 → **Lighthouse** → **Mobile** → **Performance** → «Analyze page load», sobre `/m/<codigo>/menu`. No se puede medir desde la nube: el Chromium de las sesiones no emite la primera pintura de esa página y el servicio de Google que lo haría desde fuera exige una llave.

**Registro:**

| Fecha | Qué | Resultado | Quién |
|---|---|---|---|
| 2026-11-12 | Lighthouse móvil desde las DevTools, **con extensiones** (corrida no limpia) | Rendimiento 54 · FCP 2.0 s · LCP 4.4 s · TBT 2 900 ms · CLS 0 | Calvin |
| 2026-11-12 | Menú visible, antes de la corrección de T-2.5 (120 platillos sin fotos) | **2.50 s p75** con Slow 4G y procesador ×4 · 1.58 s con Fast 4G · segunda visita ≈ 0.9 s | sesión hija, con el script |
| 2026-11-12 | Menú visible, después de la corrección de T-2.5 | pendiente (al desplegar en staging) | sesión hija, con el script |
| — | Lighthouse móvil en incógnito, después de la corrección | pendiente | Calvin |

**Veredicto por ahora:** el criterio (≤ 3 s, p75) se cumple con lo medido. La nota de Lighthouse ≥ 85 está pendiente de la corrida en limpio.
