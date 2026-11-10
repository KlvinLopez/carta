# ADR-014 — Alta self-service: el PDF de la carta se convierte en borrador de menú con un modelo de lenguaje, y el operador siempre lo revisa

**Estado:** aceptada · **Fecha:** 2026-11-02 · **Decide:** Calvin · **Enmienda:** PRD §4 ("onboarding self-service: v2") pasa a v1

## Contexto
El PRD de agosto daba de alta a los restaurantes a mano. La visión del pitch (Fase 1 "PDF ingestion con OCR + LLM") y el objetivo actual ("como restaurantero te doy un PDF y quiero que se convierta en mi restaurante") piden que el alta sea self-service desde el primer día. Capturar 60 platillos a mano es la primera fricción que mata la adopción.

## Decisión
1. El operador sube el PDF de su carta (o fotos de ella). El servidor lo guarda en el bucket privado y crea una `importacion_menu` en estado `pendiente`.
2. Un procesador en el mismo proceso de la API llama a la **API de Claude** con el documento como bloque `document` y pide una **salida estructurada** validada contra un esquema Pydantic: categorías, platillos, descripciones, precios con nivel de confianza, variantes, alérgenos y etiquetas sugeridos. Modelo por defecto `claude-opus-5-5` (configurable); un reintento con pausa exponencial, máximo 3.
3. **Nada entra al menú sin que el operador confirme.** El borrador se muestra en una tabla editable; los precios con confianza baja se resaltan; el endpoint `confirmar` es el único que crea categorías y platillos (INV-9).
4. El documento se trata como datos no confiables: validación por contenido, límite de 20 MB y 30 páginas, nunca se ejecuta ni se renderiza en el servidor, y las instrucciones al modelo lo declaran como datos, no como instrucciones.
5. Costo aceptado: ≈ 0.15–0.25 USD por importación con Opus 5.5 (≈ 0.01 con Haiku 5.5). Es un costo de una vez por restaurante.

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| OCR (Tesseract) + modelo local (Gemma) como en el pitch | Semanas de trabajo y un servidor con más memoria; la calidad sobre cartas a dos columnas con precios ambiguos es peor que la de un modelo multimodal actual; el volumen (decenas de cartas) no justifica operar inferencia propia |
| Captura manual asistida (formulario rápido) | Es lo que la v1 ofrece como respaldo cuando la extracción falla; sola, deja la fricción intacta |
| Extracción en el navegador del operador con un modelo local | Pesado para un teléfono y lento; se puede explorar en v2 junto con la generación local de ilustraciones |
| Publicar el borrador automáticamente y corregir después | Un precio mal leído en la carta pública destruye la confianza del restaurante en un minuto |

## Consecuencias
- **Positivas:** alta en minutos; la revisión humana obligatoria (la "validación manual primero" de Alerta Roja MX) enseña qué falla antes de automatizar más; el restaurante ve valor antes de tomar una sola foto.
- **Negativas:** dependencia de un servicio externo para el alta (no para operar: si Claude cae, el menú y las comandas siguen); un costo variable pequeño; hay que mantener 5 cartas reales de prueba con precios anotados a mano para medir la precisión en cada cambio del modelo o de las instrucciones.
- **Reversible:** sí; el servicio `extraer_menu` es una función con cliente inyectable; cambiar de proveedor o a un modelo local es sustituir esa función.

## Verificación
`tests/unit/test_importacion.py` con cliente falso en cada commit; `tests/live/test_importacion_live.py -m live` con llave real sobre las 5 cartas: ≥ 90 % de precios con confianza `alta` y correctos. `tests/integration/test_importaciones.py`: sin `confirmar`, `select count(*) from platillo` no cambia.
