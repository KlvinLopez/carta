# ADR-011 — Sin realidad aumentada ni 3D en la v1: el platillo se representa con foto

**Estado:** aceptada · **Fecha:** 2026-11-02 · **Decide:** Calvin · **Supersede parcialmente:** ADR-005, ADR-006 (pospuestos a v2)

## Contexto
El paquete de agosto hacía del 3D/AR el núcleo del MVP ("¿ver el platillo en 3D cambia el comportamiento?"). Al revisar el costo real: producir un modelo por platillo toma de 30 a 60 minutos de una sola persona, la generación automática con IA requiere semanas de pipeline y una máquina con GPU, y en iPhone el AR lo muestra el visor del sistema sin nuestra interfaz, lo que invalida la pantalla de inicio diseñada en el prototipo. Mientras tanto, el restaurante y el comensal obtienen la mayor parte del valor ("¿cómo se ve?", "¿qué lleva?", "pedir juntos") con una foto bien tomada.

## Decisión
1. La v1 **no construye** visor 3D, AR, pipeline de generación ni conversión USDZ.
2. Cada platillo se representa, en este orden de prioridad: **foto tomada por el restaurante** con guía de captura (variantes WebP generadas por el servidor) → **ilustración de respaldo por categoría** (estática, de la marca) → en v1.1, **ilustración generada por IA** detrás de una bandera, primero en servidor y después como experimento en el dispositivo del operador.
3. El 3D vuelve en v2 como **modelo generado localmente en el dispositivo del operador a partir de las fotos**, con revisión humana obligatoria antes de publicar (INV-5 se retira ahora y vuelve con el 3D).
4. La pregunta del MVP cambia a: ¿un menú visual con orden compartida y comanda directa al personal mejora la experiencia de la mesa, y el restaurante lo adopta y lo conserva? Las métricas se redefinen en `docs/plan/01_Alcance_v1.md`.

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| Mantener 3D/AR con sólo 5–8 platillos por restaurante (propuesta del 26 de octubre) | Sigue siendo el cuello de botella de una persona; retrasa el primer restaurante real por semanas |
| Generación 3D en la nube por API | Costo por modelo, dependencia externa y envío de fotos del cliente a un tercero |
| Imágenes generadas por IA como fuente principal en lugar de fotos | La foto real es más confiable y más barata; la ilustración generada queda como respaldo cuando no hay foto |

## Consecuencias
- **Positivas:** el primer restaurante puede operar semanas antes; sin GPU, sin worker, sin revisión de modelos; el esquema pierde dos tablas; el producto se diferencia por la orden compartida y el flujo al personal, que ningún punto de venta en México tiene.
- **Negativas:** se pierde el gancho visual del pitch; el README y el pitch deben decir "foto hoy, 3D después". La columna `platillo.imagen_tipo` mide cuántos platillos quedan sin foto para decidir con datos cuándo invertir en generación.
- **Reversible:** sí. Las tablas `modelo_3d` y `trabajo_modelo_3d` ya están diseñadas y `<model-viewer>` se agrega al detalle sin tocar el resto.

## Verificación
Ninguna referencia a `model-viewer`, `glb`, `usdz` o `modelo_3d` en `app/`, `frontend/src/` ni `migrations/` durante la v1: `grep -rli "model-viewer\|\.glb\|usdz\|modelo_3d" app frontend/src migrations | wc -l` = 0.
