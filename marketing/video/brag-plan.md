# Brag Plan: Carta

## ¿Qué es la app?
Carta reemplaza el menú QR de siempre: escaneas el QR de tu mesa sin descargar nada, ves el platillo en 3D sobre la mesa antes de pedirlo, coordinas la orden con toda la mesa y pagas desde tu lugar.

## El ángulo
Un film de lanzamiento estilo keynote de Apple, sin chistes: el producto se trata como un objeto premium. La historia es una sola cena en **La Ceiba · Mesa 7**, contada en cuatro gestos (escanear, mirar, compartir, pagar), con las pantallas reales del prototipo dentro de un iPhone. El momento central es la "caída" de la música en 8.74 s, cuando el platillo aparece en realidad aumentada.

## Gancho (primeros 2-3 s)
Sobre un restaurante desenfocado, cálido y en penumbra, una sola línea en serif grande: **"Todo empieza en la mesa."**, palabra por palabra. Luego se revela el logotipo **Carta** con su lema real, "Elevando el arte de la mesa".

## Momentos clave
- El QR se detecta: la mira pasa de blanco a dorado y sube la tarjeta real **"La Ceiba · Mesa 7 · QR válido"**; un dedo toca **Continuar**.
- En la caída musical, el teléfono cruza la pantalla y muestra la vista AR: **Costilla de Res 12 h** flotando sobre la mesa. Luego se toca el platillo y se abre su detalle.
- Tres teléfonos en fila (tres amigos): menú, platillo en 3D y **"Orden de la mesa · 2 de 4 listos"**. Aparece la notificación **"Todos confirmaron · Llamando al mesero"**.
- Seguimiento **"Tu comida se está preparando"** → checkout con propina → toque en **Pagar $638** → **"¡Buen provecho!"**.

## Cierre
El teléfono se retira y el logotipo **Carta** aterriza en el golpe fuerte de 22.37 s. Debajo, el lema real del producto, **"Tu menú, Tu Carta."** (22.93 s), y al final "MUY PRONTO". La música se desvanece.

## Flujo de usuario que se muestra
Escanear el QR de la mesa → ver el platillo en 3D y su detalle → coordinar la orden con la mesa → seguir la orden → pagar → "¡Buen provecho!". Es el flujo real del prototipo (P17a → P01 → P02 → P04 → P04b → P05 → P05b).

## Tono
- Preset: `polished`
- Dirección creativa: "film de lanzamiento tipo Apple: elegante, emocionante, gente usando Carta en una cena real"
- Interpretación: pocas palabras y mucho aire, entradas lentas y seguras, y un solo gran momento en cada frase musical. La emoción la ponen la caída musical, el cruce del teléfono y el aterrizaje del logo, no la cantidad de efectos.

## Formato: horizontal (landscape) — 1920x1080, 30 fps
## Duración: 25.0 s

## Identidad visual (del prototipo)
- Fondo: campo oscuro cálido del prototipo `#171210` → `#2A1B16` (radial), con resplandores vino `#6B2D3E` y dorado `#B8860B`
- Acento: dorado claro `#FDC34D` (texto de acento) / dorado `#B8860B` (resplandores)
- Texto: crema `#FEF9F1`; secundario crema al 72 %
- Fuente display: DM Serif Display (regular e itálica, archivos locales del prototipo)
- Fuente de cuerpo: DM Sans (variable, archivo local)
- Elemento visual más fuerte: la vista AR con el platillo flotando sobre la mesa (P01) y la tarjeta "QR válido" (P17a)

## Texto para compartir (borrador)
Presentamos Carta: escanea el QR de tu mesa, mira tu platillo en 3D antes de pedirlo, ordena con toda tu mesa y paga sin pedir la cuenta. Tu menú, tu Carta.

## Dirección de audio
- Rol: soporte cinematográfico (una cama musical + acentos mínimos)
- Música: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (110 BPM; "steady and clean", recomendada para `polished`). Licencia CC BY 4.0 (ende.app), apta para uso comercial.
- Tratamiento: entra con fundido (0 → 0.8 s), volumen de cama ~0.4; la caída de 8.74 s es el clímax del medio; fundido de salida de 23.8 a 25.0 s.
- Guía de cues (preset incluido `cues/...vol-12...json`): frases cada 4.37 s en 8.74 / 13.11 / 17.47 / 21.84. Golpes fuertes: **8.74** (revelación AR), **15.84** (notificación de mesa lista), **22.37** (logo) y **22.93** (lema). Rejilla de beats (~0.546 s) para toques y cambios de pantalla: 6.56, 8.19, 11.46, 19.10, 20.75.
- Audio reactivo: sutil. Los graves hacen "respirar" el resplandor dorado detrás del teléfono; nada de ecualizadores ni barras.
- Postura de SFX: escasa y suave. Clics muy discretos en los toques simulados, un golpe suave en la revelación, una campana suave en el pago y en el logo.
- Momentos acoplados al audio: toque en "Continuar" (8.19), revelación AR (8.74), toque en el platillo (11.46), notificación (15.84), toque en "Pagar" (20.75), logo (22.37).
- Regla de contención: ningún SFX brillante repetido; nunca tapar la caída musical; la música nunca sube de 0.5.

## Storyboard

### Escena 1 — La mesa — 0.00–4.39 s (4.39 s)
Restaurante desenfocado (foto real del prototipo) con un lento acercamiento; resplandores vino y dorado. "Todo empieza en la mesa." aparece palabra por palabra (0.55–1.64 s) y se sostiene hasta ~2.6 s. En 2.73 s lo reemplaza el logotipo "Carta", y en 3.27 s el lema "ELEVANDO EL ARTE DE LA MESA".
Secuencial/interacción: sí. Palabras del gancho una por una; se sostienen 1 s completo antes de salir.
Intención de audio: calma, expectativa.
Idea acoplada: ninguna (la música entra sola).
Transición: suave → Escena 2

### Escena 2 — Escanea — 4.39–8.74 s (4.35 s)
El iPhone sube desde abajo, a la derecha, con la pantalla real "Buscando el código de tu mesa…". A la izquierda: "01 · ESCANEA" y "Apunta al QR de tu mesa." En 6.56 s la pantalla pasa a "QR válido" (mira dorada, tarjeta La Ceiba) y aparece la línea real del producto **"Sin descarga. Sin registro. Inmediato."** (se lee hasta 8.6 s). En 8.19 s, toque simulado en "Continuar".
Secuencial/interacción: sí, toque simulado en "Continuar".
Intención de audio: tensión que crece hacia la caída.
Idea acoplada: clic suave en el toque.
Transición: dramática (la caída) → Escena 3

### Escena 3 — Míralo antes de pedirlo — 8.74–13.11 s (4.37 s)
En la caída, el teléfono cruza a la izquierda y la pantalla cambia a la vista AR (platillo flotando sobre la mesa). A la derecha: "02 · MIRA" y **"Mira tu platillo antes de pedirlo."** (visible 9.0–13.0 s). En 11.46 s, toque en el platillo: se abre su detalle ("Costilla de Res 12 h · $320") y aparece la línea "En 3D, sobre tu mesa." (11.7–13.0 s).
Secuencial/interacción: sí, toque en el platillo y cambio de pantalla.
Intención de audio: liberación, energía plena.
Idea acoplada: golpe suave en 8.74 s; clic discreto en 11.46 s.
Transición: limpia → Escena 4

### Escena 4 — Toda la mesa — 13.11–17.47 s (4.36 s)
Arriba: "03 · COMPARTE" y **"Toda la mesa, en sintonía."**, más la línea real "Cuando estén los cuatro, llamamos al mesero." (14.2–17.3 s). Abajo, tres teléfonos (tres amigos) entran escalonados: menú de La Ceiba, platillo en 3D y "Orden de la mesa · 2 de 4 listos" al centro. En 15.84 s (golpe fuerte) aparece la notificación "Todos confirmaron · Llamando al mesero".
Secuencial/interacción: sí, tres teléfonos entran uno por uno y luego la notificación.
Intención de audio: comunidad, calidez.
Idea acoplada: acento suave en la notificación.
Transición: limpia → Escena 5

### Escena 5 — Pide y paga — 17.47–21.84 s (4.37 s)
Teléfono a la derecha. A la izquierda: "04 · PAGA" y **"Pide, sigue y paga."** (17.7–21.7 s). La pantalla avanza: "Tu comida se está preparando" → checkout con propina (19.10) → toque en "Pagar $638" (20.75) → "¡Buen provecho!". Línea: "Sin esperar la cuenta." (19.2–21.7 s).
Secuencial/interacción: sí, cambio de pantalla y toque en "Pagar".
Intención de audio: resolución satisfactoria.
Idea acoplada: clic en "Pagar" y campana suave de éxito.
Transición: el teléfono se retira → Escena 6

### Escena 6 — Tu menú, Tu Carta — 21.84–25.00 s (3.16 s)
Campo oscuro con resplandor vino central. **"Carta"** aterriza grande en 22.37 s; **"Tu menú, Tu Carta."** en dorado claro itálico en 22.93 s; "MUY PRONTO" en 23.46 s. Se sostiene hasta el final mientras la música se desvanece.
Secuencial/interacción: no.
Intención de audio: cierre, orgullo.
Idea acoplada: campana suave en el aterrizaje del logo.
Transición: final

**Mood musical:** cinematográfico y limpio
**Resumen de audio:** una cama musical constante que entra suave, explota en la revelación AR, acompaña la cena con acentos mínimos y se desvanece bajo el logo.

## Versión vertical (Instagram Reels / Historias / TikTok)
- Formato: 9:16 — 1080x1920, 30 fps, 25.0 s. Archivo: `brag-vertical.mp4` (miniatura `brag-vertical.jpg`); composición en `composition-vertical/`.
- Misma historia, textos, música y sincronía que la horizontal.
- Rediseño para el teléfono: los textos van en una franja superior (y 250–630) y el iPhone al centro (y 660–1560). Todo queda dentro del 80 % central seguro y la franja inferior se deja libre para el texto de la publicación y los botones de Instagram.
- En la caída (8.74 s) el teléfono sale disparado a la izquierda y vuelve por la derecha ya con la vista AR; un destello dorado cubre los dos cuadros de cruce.
- En la escena de la mesa, los teléfonos de los amigos van detrás del principal, en abanico.
