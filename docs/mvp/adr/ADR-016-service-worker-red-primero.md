# ADR-016 — Service worker: la red manda, la copia es el respaldo, y nunca se toma una mesa a la fuerza

**Estado:** propuesta (sesión maestra, 2026-11-12; pendiente de que Calvin la acepte) · **Fecha:** 2026-11-12 · **Complementa:** ADR-004 (sondeo con ETag), ADR-010 (la API sirve la PWA) · **Tarea:** T-2.7

## Contexto
La v1 necesita que el comensal siga viendo el menú si pierde la señal a media comida. Un service worker lo da, pero cambia cómo llega cada versión a los teléfonos: uno mal planteado deja a la gente con una versión vieja o rota que un despliegue normal ya no corrige. La primera entrega de T-2.7 servía la navegación desde la precarga; medido en Chromium, quien ya había visitado veía la versión anterior tras un despliegue (en la primera carga y en tres recargas) hasta cerrar la pestaña, las cabeceras de seguridad quedaban congeladas con las del día de la instalación y la primera visita no guardaba copia del menú.

## Decisión
1. **La navegación es red primero** (plazo de 3 s). La respuesta del servidor se devuelve tal cual y no se guarda; el `index.html` precargado sólo se usa si la red falla, vence el plazo o el servidor responde 5xx. Con red, un despliegue y sus cabeceras llegan en la siguiente carga, igual que sin worker.
2. **`clients.claim()` sin `skipWaiting`.** El worker toma la página sólo en su primera instalación (así la primera visita ya guarda la copia del menú). Una versión nueva del worker espera a que no queden pestañas de la anterior: nunca recarga ni toma una mesa a media orden.
3. **De la API sólo se guarda el menú público** (`GET /api/v1/p/menu/{slug}`): red primero con plazo de 4 s, sólo un 200 JSON, 12 h y 20 menús como mucho. Un 5xx o un 429 usan la copia si existe; si no, llega la respuesta original. Nada con cookie, nada de `/op` ni `/admin`, nada de otro origen.
4. **Ninguna clave de caché lleva el código de mesa** (es una credencial): la navegación no se guarda.
5. **La copia se dice en pantalla** y no se trata como recién leída; un refresco que devuelve la copia no sustituye lo leído de la red.
6. **Marcha atrás:** `VITE_SW_APAGADO=1` construye un worker de apagado que se da de baja y vacía las cachés en una carga (`deploy/README.md`).
7. **El menú se vuelve a pedir cada 25 s** mientras se ve. Con el borde y el servidor a 30 s como mucho (T-2.2), un cambio se ve en ≤ 55 s (AC-04.4).

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| Navegación desde la precarga (lo habitual en una PWA) | Carga instantánea, pero cada despliegue deja a quien vuelve con el código anterior durante toda su visita, contra una API ya nueva |
| `skipWaiting` con recarga automática | La versión nueva llega enseguida, pero recarga una mesa a media orden |
| Aviso «hay una versión nueva» con botón | Deja la decisión al comensal, que no sabe qué significa; con la navegación red primero ya no hace falta |
| Guardar más de la API (sesión, detalle del platillo) | Datos de la sesión en el teléfono y respuestas viejas presentadas como actuales |
| Sin service worker | Sin menú cuando se cae la señal: el caso que el producto quiere cubrir |

## Consecuencias
- **Positivas:** con red, el comportamiento es el de siempre (lo desplegado es lo que se ve); sin red, el menú y el armazón siguen ahí desde la primera visita; hay una salida probada si un worker sale mal.
- **Negativas:** con red lenta (más de 3 s para el `index.html`) se ve el armazón precargado, que puede ser de la versión anterior; la lógica del propio worker (qué guarda y cómo) sólo cambia cuando se cierran las pestañas; `sw.ts` no lo evalúa vitest y se verifica con `frontend/scripts/verificar-pwa.mjs` en Chromium, que todavía no corre en la CI (T-4.9).
- **Operación:** Cloudflare reescribe la cabecera de caché de `sw.js` hacia el navegador (*Browser Cache TTL* de la zona); no afecta a las actualizaciones porque el navegador se salta su caché HTTP al buscar un worker nuevo, pero las cabeceras se comprueban a través del borde.

## Verificación
`node frontend/scripts/verificar-pwa.mjs` contra uvicorn con dos workers (primera visita sin recargar con copia, 503 con copia, versión nueva que espera, claves de caché sin código de mesa, agotado visible tras un turno). Medido el 12 de noviembre: tras un despliegue la versión nueva se ve en la primera carga; un platillo agotado se ve entre 5.7 y 50.1 s con otras mesas pidiendo el menú.
