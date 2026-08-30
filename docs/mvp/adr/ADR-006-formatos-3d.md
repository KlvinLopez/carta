# ADR-006 — Formatos GLB y USDZ con presupuesto de peso

**Estado:** aceptada · **Fecha:** 2026-08-30

## Contexto
`<model-viewer>` necesita `.glb` para el visor 3D y para Scene Viewer en Android; AR Quick Look en iOS exige `.usdz`. El objetivo NFR-04 es cargar el modelo en ≤ 2.5 s sobre 4G.

## Decisión
Cada modelo publicado genera dos artefactos: `modelo.glb` (≤ 4 MB) y `modelo.usdz` (≤ 6 MB), más un póster `.webp`. Presupuesto técnico: ≤ 40 000 triángulos, texturas ≤ 1024×1024, compresión Draco en el GLB, una sola malla y un solo material por platillo.

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| Sólo GLB | Elimina el AR en iOS, que es la mitad del público objetivo en restaurantes de gama media-alta en CDMX. |
| glTF sin comprimir | Duplica el peso y rompe NFR-04. |
| Conversión a USDZ en el cliente | No existe una vía fiable en Safari. |

## Consecuencias
- **Positivas:** cobertura AR completa en iOS y Android con una sola fuente de verdad.
- **Negativas:** el pipeline debe ejecutar conversión USDZ; se hace en el worker al aprobar, no en cada petición.
- **Control:** el presupuesto se valida automáticamente al publicar; un modelo que lo exceda se rechaza con motivo `excede_presupuesto`.

## Verificación
`worker/optimizador.py` rechaza artefactos fuera de presupuesto. Prueba unitaria con un GLB de 8 MB debe fallar la publicación.
