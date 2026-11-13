# Planes gratuito y de paga: costo por restaurante, mercado en México y propuesta (borrador para decidir)

**Fecha:** 13 de noviembre de 2026 · **Rama:** `agente/planes-y-costo-por-restaurante` · **Estado:** investigación y borrador; no cambia código, contrato ni documentos de plan (salvo una fila en `04 §11`). Nada se mandó a staging ni a producción.

Cada cifra lleva su marca: **[medida aquí]** (la midió esta sesión en un contenedor local), **[documento]** (la dice un documento del repositorio; se nombra), **[fuente externa]** (página con enlace y fecha de lectura: 13 de noviembre de 2026) o **[estimada]** (cálculo o juicio, con su supuesto). **Margen de error general: ±2× en lo estimado y en todo lo que depende del CPU de Railway** (la T-4.4 lo medirá allí).

---

## 0. Para Calvin (una página)

**Lo más importante, en cuatro líneas**

1. **Un restaurante cuesta centavos, no pesos.** La parte que crece con el uso cuesta entre **1 y 8 pesos al mes** por restaurante (según su tamaño). Lo que de verdad se paga cada mes es la **base fija** (servidor, base de datos, plan de Railway): **≈ 50–55 USD al mes** sostiene 100 restaurantes y **≈ 110–140 USD** sostiene 1,000 **[estimada]**. Cuántos pesos paga cada restaurante gratuito de esa base: ≈ 10 pesos al mes con 100, ≈ 3 con 500, ≈ 2.6 con 1,000.
2. **Lo que más cuesta es preguntar «¿cambió algo?» a cada rato.** Cada teléfono con la app abierta le pregunta al servidor cada 3 segundos, en todas las fases de la mesa, aunque casi siempre la respuesta es «nada nuevo» (más del 95 %). Eso es casi todo el trabajo del servidor, casi toda la salida de red y lo primero que se agota. **Lo caro no son los dólares, es el espacio en el servidor:** con lo que se paga hoy caben **≈ 1,200 comensales con la app abierta a la vez** (±2×).
3. **Lo único con costo directo por restaurante es leer el PDF de la carta con IA:** de 0.11 a 0.64 USD cada vez (≈ 2 a 12 pesos), y hoy un restaurante puede subir PDFs sin límite mensual. Ése es el primer límite que sí ahorra dinero de verdad.
4. **Las fotos casi no cuestan** (100 platillos con foto ≈ 0.5 centavos de dólar al mes de almacenamiento) y los datos de las visitas crecen ≈ 20–50 MB al mes por restaurante: ahí, **cuánto tiempo se guardan** sí importa a la larga.

**Cuánto cuesta un restaurante al mes** (sólo lo que crece con el uso, con 6 meses de historial guardado)

| Tamaño | Visitas al mes | Pesos al mes | Dólares al mes |
|---|---|---|---|
| Chico (fonda, taquería: 10 mesas) | 1,800 | ≈ 1.0 | 0.06 |
| Mediano (cafetería, casual: 18 mesas) | 1,800 | ≈ 1.9 | 0.10 |
| Grande (casual lleno: 40 mesas) | 4,500 | ≈ 7.5 | 0.41 |
| Formal (cena, hotel: 25 mesas) | 1,500 | ≈ 3.6 | 0.19 |

**Cuántos restaurantes caben con lo que se paga hoy** (2 procesos de servidor; «registrados» = dados de alta, suponiendo que en la hora más cargada del sistema trabaja el 60 % y a 70 % de su propio pico)

| Escenario | Hoy | Con 4 procesos | Con 8 procesos |
|---|---|---|---|
| Todos gratuitos (tamaño chico) | ≈ 550 | ≈ 1,000 | ≈ 1,800 |
| 90 % gratuitos / 10 % de paga | ≈ 450 | ≈ 830 | ≈ 1,500 |
| 80 % gratuitos / 20 % de paga | ≈ 380 | ≈ 700 | ≈ 1,280 |
| Todos de paga (mezcla de tamaños) | ≈ 170 | ≈ 315 | ≈ 570 |

Pasar de 2 a 4 u 8 procesos **no cuesta casi nada en Railway** (cobra el CPU que se usa; sólo suma ≈ 1.7 USD de memoria por proceso), pero hay que bajar el tamaño del conjunto de conexiones a la base. Con 3 mejoras de código (§5) caben 2 o 3 veces más. **Ojo:** el supuesto «todos con la app al frente» da la mitad de estas cifras (§6).

**Qué ofrecer** (detalle en §7)

- **Gratuito = el producto completo con tamaño chico**, porque el valor de Carta es el flujo de la mesa: 10 mesas, 6 comensales por mesa, 60 platillos, 3 personas del personal, **2 lecturas de PDF al mes**, historial de 30 días.
- **De paga = más tamaño y más memoria:** 40 mesas, 12 por mesa, 300 platillos, 20 personas del personal, 10 lecturas de PDF al mes, 12 meses de historial, baja con 30 días de gracia, sin marca de Carta.
- **De los límites propuestos, sólo dos ahorran dinero de verdad** (lecturas de PDF y días de historial); el de mesas ayuda a la capacidad. El resto es comercial.
- **Un restaurante de paga a 349 pesos al mes sostiene a más de 100 gratuitos** (a 157 pesos, ≈ 47; a 799, ≈ 240).

**Para comensales (fuera de la v1):** la v1 no tiene cuenta de comensal (regla 10). En el prototipo la capa de paga es «Carta+» a 29 pesos al mes; de los beneficios que lista, sólo la IA personalizada tiene costo de infraestructura (centavos al mes); el cobro con tarjeta se come ≈ 14 % de 29 pesos. Ver §7.2.

**Decisiones que te tocan** (preguntas completas, con mi recomendación, en §8)

1. ¿Los topes del plan gratuito **bloquean lo nuevo** o sólo avisan? 2. ¿Cuántas mesas, platillos y PDFs al mes en gratuito? 3. ¿Cuántos días se guarda el historial en gratuito? 4. ¿Precio del plan de paga (157 / 349 / 799 pesos)? 5. ¿Anuncios en gratuito (el prototipo los pone)? 6. ¿Aprobar el sondeo adaptativo (que ya prometía el plan) y medir cuántos teléfonos quedan con la pantalla encendida? 7. ¿Subir a 4 procesos antes del primer restaurante real? 8. ¿Abrir la Spec 002 «Planes»?

---

## 1. Mercado en México: cartas, mesas, comensales y horarios

### 1.1 Qué hay de estadística y qué no

| Dato | Valor | Fuente | Marca |
|---|---|---|---|
| Unidades económicas de preparación de alimentos y bebidas (rama 7225) | **740,231** (mayo de 2026) | DENUE vía Data México, Secretaría de Economía, leído el 19 sep 2026 | [documento: `docs/research/2026-09-19-huecos-abiertos.md`] |
| Restaurantes de servicio completo (clase 722511, «a la carta o de comida corrida») | **59,296**; con mariscos (722512) **81,518**. Es el 10.2 % de las unidades pero el 24.7 % del personal | INEGI, Censos Económicos 2019 | [documento: ídem] |
| Tamaño del sector | **96 de cada 100** unidades son microempresas (hasta 10 personas) y dan empleo al 70 % del personal | INEGI-CANIRAC, *Conociendo la industria restaurantera* (2021) | [fuente externa] (comunicado 578/21, leído el 13 nov 2026) y [documento: `docs/research/2026-09-19-competencia-real-mexico.md`] |
| Personal por establecimiento de la clase 722511 | ≈ 8 personas | 24.7 % del personal ÷ 10.2 % de las unidades = 2.4 veces el promedio del sector (≈ 3.4) | [estimada] sobre el documento anterior |
| Personal ocupado en restaurantes a la carta o de comida corrida | 516,894 personas (Censos Económicos 2024) | INEGI, minimonografía nacional CE2024 (`mnay_ce24.pdf`) | [fuente externa], **cifra tomada de un resumen: el PDF no se pudo leer**; no se usa en cálculos |
| **Platillos por carta** | **No hay estadística** (ni INEGI, ni CANIRAC, ni estudios del sector). Se contaron a mano (1.2) | búsquedas del 13 nov 2026 sin resultado | — |
| **Mesas, asientos o aforo por restaurante** | **No encontrado.** Sólo reglas de blog (1.2 m² por comensal; ≈ 13 mesas de 4 para 50 personas) | combohr.com/es/blog/numero-de-comensales-en-un-restaurante (13 nov 2026) | [fuente externa] blog |
| **Comensales o cubiertos por día** | **No encontrado** | — | — |
| Rotación de mesa | 15–20 por mesa al día en comida rápida; sin dato mexicano ni de taquerías | modelosdeplandenegocios.com (blog, 13 nov 2026) | [fuente externa] blog |
| Duración de la visita | Supuestos de blog: 45 min desayuno, 60 comida, 75 cena; desayuno de hotel 30–45 min; comedor institucional de estudiantes en México, 37 min | combohr.com (supuesto, no medición); ciencialatina.org (contexto distinto) | [fuente externa] blog / académico |
| Horas pico | Comida fuerte **14:00–16:00** (algunas fuentes hasta 17:00); delivery: 12:00–16:00; cena 20:00–22:00 | chilango.com/general/988-la-hora-de-la-comida (13 nov 2026); datos de plataformas | [fuente externa] prensa |

**Pendientes para mejorar esto:** las numeralias de Observa Restaurantes (UdeG) devolvieron un error 503 al leerlas y pueden traer personal y tamaño por tipo (`observarestaurantes.cucea.udg.mx`, «Numeralia Nacional 2025» y «restaurantes de tacos y tortas»); y el mejor dato de mesas y comensales saldrá de **dos o tres restaurantes del piloto** (la analítica ya cuenta `scan` y comandas).

### 1.2 Platillos por carta, contados a mano

Lectura de páginas públicas, una por una, el 13 de noviembre de 2026; sin extracción masiva. **«(WF)» = el conteo lo hizo la herramienta de lectura de páginas (±5 %); sin marca = lo leí yo.** Se cuentan renglones con nombre y precio, sin tamaños ni extras.

| # | Restaurante (ciudad) | Tipo | Platillos | Bebidas | Fotos | Descripción | URL |
|---|---|---|---|---|---|---|---|
| 1 | Taquería Jiménez, vía Rappi (CDMX) (WF) | Taquería | 25 en 6 categorías | — | ninguna visible | corta (22–130 caracteres) | rappi.com.mx/restaurantes/1930325426-taqueria-jimenez |
| 2 | Taco Teca, tienda de la UAEH | Taquería de campus | 15 tacos + 2 paquetes | 2 | 1 por página | ninguna | uaeh.edu.mx/pabellonuniversitario/docs/tiendas/2026/taco-teca-2026.pdf |
| 3 | México Lindo y Qué Rico (Orizaba) | Fonda regional | ≈ 95–105 renglones en 3 menús (≈ 14 repetidos) | ≈ 25 únicas | 6, sólo en portada | ninguna o una línea | orizaba.travel/wp-content/uploads/2024/12/Carta-Mexico-Lindo-y-que-rico.pdf |
| 4 | Chilaquiles Tec (campus) | Desayunos | 1 + 9 complementos | 4 | 0 | una línea, bilingüe | tecfood.tec.mx (carta de mayo de 2023) |
| 5 | Gran Cibeles Café, vía Rappi (CDMX) (WF) | Cafetería | 24 en 15 categorías | 45 | ninguna visible | hasta ≈ 142 caracteres | rappi.com.mx/restaurantes/1923230659-gran-cibeles-cafe |
| 6 | Vambú, vía Rappi (Monterrey) (WF) | Cafetería | 14 | 14 | ninguna visible | 24–150 caracteres | rappi.com.mx/restaurantes/1930239322-vambu |
| 7 | Boulangerie Central, vía Rappi (Guadalajara) (WF) | Cafetería y panadería | ≈ 53 únicos (63 con combos) | 24 | ninguna visible | 60–180 caracteres | rappi.com.mx/restaurantes/1930214861-boulangerie-central |
| 8 | Tim Hortons, vía Rappi (Guadalupe, N. L.) (WF) | Cadena casual | ≈ 65 | ≈ 60 | ninguna visible | 15–40 palabras | rappi.com.mx/restaurantes/1923262395-tim-hortons |
| 9 | Bobo Burgers, vía Rappi (CDMX) (WF) | Casual (hamburguesas) | 18 en 10 categorías | 30 | ninguna visible | muchas sin descripción | rappi.com.mx/restaurantes/1930309594-bobo-burgers |
| 10 | Contramar (CDMX) | Casual-formal (mariscos) | 58 en 8 categorías | aparte | 3 de portada | ninguna (nombre, gramaje, precio) | contramar.com.mx |
| 11 | Quintonil (CDMX) | Alta cocina | menú degustación de 11 pasos, un precio ($6,090) | 4 maridajes | — | lista de ingredientes | quintonil.com |
| 12 | Los Gallos, Hard Rock Hotel Los Cabos | Hotel todo incluido | ≈ 70–80 (por encabezados del PDF) | 5 cócteles y jugos | sin fotos de platillo | 1–2 líneas, bilingüe | hotel.hardrock.com/los-cabos/files/6148/Los-Gallos-Menu-Hard-Rock-Hotel-Los-Cabos.pdf |

**No se pudieron leer:** Toks (sin texto legible), Sanborns (403), restaurante de El Palacio de Hierro (403), Los Vitrales (pidió verificación), El Fogoncito (503), Pujol (429), Café de Tacuba y Orinoco (la página no abrió). **Faltaron** una carta casual independiente y una cuarta formal de hotel con precios. **Las cartas de delivery (Rappi) no son la carta física**: precios y platillos pueden diferir del local y sus fotos no se contaron.

**Lo que dicen las 12 cartas:**

- **No hay una cifra única.** Sin bebidas, la mayoría de las cartas con precio y descripción queda entre **14 y 65 platillos**; el rango va de 1 plato con complementos a ≈ 100 renglones (una fonda con tres menús). Las **bebidas pueden duplicar** el número (hasta 45–60).
- **Casi nadie tiene foto por platillo** (de las cartas propias de los locales, ninguna trae foto por platillo: sólo portadas o decorativas; en las de Rappi las fotos no se pudieron contar). Eso respalda el orden del plan (foto recomendada → ilustración por categoría) y significa que **la mayoría de los restaurantes entrará al principio con pocas fotos** (el perfil chico se modela con 20 % de platillos con foto).
- **Dos de las 12 cartas (México Lindo y Taco Teca) son PDF cuyo contenido es imagen**, sin texto que extraer: la importación necesita leer imagen, no sólo texto (así lo pide ya el ADR-014; el costo de §3.5 lo incluye).
- **Las descripciones son cortas** (nada a 150 caracteres) y raramente traen alérgenos: el llenado de alérgenos y etiquetas es trabajo del operador al revisar.

### 1.3 Cuatro perfiles de restaurante (los que usa el resto del informe)

**Todo lo de mesas, asientos y comensales es [estimada]**: no hay estadística. Los platillos y los horarios sí salen de las cartas y fuentes anteriores. «Visitas al día» = mesas atendidas (cada visita es una mesa que se sienta y se va); «comensales» = personas en mesa. La proporción de comensales que **abren la app** se fija en 60 % [estimada]; el resto pide al mesero.

| | **Chico** (fonda, taquería) | **Mediano** (cafetería, casual) | **Grande** (casual lleno) | **Formal** (cena, hotel) |
|---|---|---|---|---|
| Platillos en la carta (con bebidas) | 30 (taquerías 15–25 + bebidas; cartas 1, 2, 4) | 55 (cartas 5, 6, 7) | 90 (cartas 8, 9, 10) | 80 (cartas 10, 12; 11 si es degustación) |
| Con foto propia | 20 % | 40 % | 60 % | 70 % |
| Mesas / asientos | 10 / 30 | 18 / 54 | 40 / 120 | 25 / 75 |
| Personas por mesa | 2.3 | 2.6 | 3.0 | 3.0 |
| Visitas al día (≈ comensales en mesa) | 60 (≈ 140) | 60 (≈ 155) | 150 (≈ 450) | 50 (150) |
| Visitas al mes (30 días) | 1,800 | 1,800 | 4,500 | 1,500 |
| Horas de servicio | ≈ 10 h | ≈ 12 h (8:30–20:00) | ≈ 12 h, picos 14–16 y 20–22 | ≈ 9 h (comida y cena) |
| Duración de una visita | 25 min | 50 min | 75 min | 110 min |
| Comensales con app abierta en su hora pico | ≈ 11 | ≈ 22 | ≈ 61 | ≈ 36 |
| Personal (meseros y capitán) | 2–3 | 3–5 | 8–12 | 6–10 |

Cómo se llega a «comensales con app abierta en la hora pico»: mesas × ocupación en el pico (0.8; 0.85 el grande) × personas por mesa × 60 % que usa la app. **Margen de error: ±50 %** en cada perfil; los resultados del informe se mueven casi proporcionalmente.

---

## 2. El «anuncio» de un restaurante: qué guarda Carta y cuánto pesa

Como el anuncio de Airbnb, cada restaurante es un conjunto de datos que crece con lo que el dueño sube: una ficha (nombre, logo, horario), un catálogo (categorías y platillos con precio, descripción, alérgenos y etiquetas) y una foto por platillo. La diferencia con Airbnb es que el «anuncio» de Carta además produce datos cada vez que alguien se sienta (visitas). Lo que sigue pesa cada pieza.

**Cómo se midió.** Todo **[medida aquí]** en el contenedor local: base sembrada con `scripts/seed.py` (restaurante de ejemplo, 22 platillos, 8 mesas), servicios reales (`procesar_foto`, `generar_pdf`, el menú público de la API) y PostgreSQL 16. La tabla `platillo` se infló con 10,000 filas copiadas (dentro de una transacción que se deshizo) para medir bytes por fila con índices.

### 2.1 Piezas, tamaño y quién las paga

| Pieza | Tamaño | Dónde vive | Marca |
|---|---|---|---|
| Un platillo en la base (fila + índices) | **≈ 0.87 KB** medido con URLs locales; **≈ 1.1 KB** con las URLs más largas de R2 | PostgreSQL (volumen de Railway) | [medida aquí] / ajuste [estimada] |
| Foto: miniatura 400 px (WebP, calidad 82) | **7–16 KB** con material gráfico real; 56 KB si la imagen es puro ruido (cota alta) | R2, público, la sirve Cloudflare | [medida aquí] |
| Foto: detalle 1200 px (WebP) | **35–81 KB**; 413 KB en la cota de ruido | R2, público | [medida aquí] |
| Foto: **original** que subió el dueño | **≈ 3 MB** una foto de teléfono de 12 MP en JPEG; hasta 15 MB (tope); las fotos del repositorio miden 20 KB porque son sintéticas y **no sirven** para esta cifra | R2, **privado**, se conserva (`foto_original_url`) | [estimada] ±2× |
| Menú público en JSON (22 platillos) | **13.5 KB** sin comprimir = 612 B por platillo; **3.1 KB** comprimido (gzip); el origen lo manda sin comprimir y Cloudflare lo comprime | caché en proceso 30 s + borde | [medida aquí] |
| PDF de tarjetas QR | **5.2–5.3 KB por mesa** (8 mesas: 43 KB; 150 mesas: 802 KB); 46 ms para 8 mesas, 0.77 s para 150 | se genera al pedirlo, no se guarda | [medida aquí] |
| Una visita (sesión, 3 miembros, órdenes, ~8 ítems, comanda, ~30 eventos de analítica) | **≈ 12 KB** (≈ 50 filas de ~250 B con índices); los eventos son tres cuartas partes | PostgreSQL | [estimada] ±2× |
| Importar una carta de PDF (una sola vez) | PDF ≤ 20 MB y ≤ 30 páginas; el PDF y el resultado se guardan en el bucket privado | R2 privado + `importacion_menu` | [documento] límites en §7.0 |

**Lo que se aprende de la tabla:**

1. **El peso del anuncio lo pone la foto original, no los datos.** Un platillo con foto ocupa ≈ 3.1 MB en R2 (3 MB el original + ≈ 0.1 MB las dos variantes) y ≈ 1 KB en la base: **tres mil veces más en la foto**. Aun así, a 0.015 USD por GB-mes **[fuente externa]** (Cloudflare R2, leído el 13 nov 2026), 100 platillos con foto cuestan **0.005 USD al mes**. Almacenar fotos casi no cuesta; **descargarlas tampoco** (R2 no cobra salida **[fuente externa]**).
2. **El peso de la operación lo ponen las visitas.** Una visita deja ≈ 12 KB; un restaurante chico o mediano deja ≈ 21 MB al mes y uno grande ≈ 53 MB (tabla 2.2). Esto sí se acumula en el volumen de la base (0.15 USD/GB-mes **[fuente externa]**) y hace más lentos los respaldos. **La retención (cuánto tiempo se guarda) es el límite que sí ahorra.**
3. **El menú pesa lo mismo para el comensal sea cual sea el plan**, y lo paga Cloudflare (gratis). El origen sólo lo arma una vez cada 30 s por restaurante.
4. **No hay tope de platillos por restaurante en el código** (sólo 1,000 por importación y 1 foto por platillo): hoy un solo restaurante podría guardar 10,000 platillos y el menú crecería a 6 MB. Es un hueco que cualquier plan tiene que cerrar.

### 2.2 Crecimiento por mes, por perfil

Los perfiles y sus supuestos están en §1.3; la fórmula, en el guion `2026-11-13-planes-y-costo-por-restaurante-modelo.py` (junto a este informe).

| | Chico | Mediano | Grande | Formal |
|---|---|---|---|---|
| Platillos (con foto) | 30 (6) | 55 (22) | 90 (54) | 80 (56) |
| Alta: base + fotos (originales y variantes) | ≈ 18 MB | ≈ 67 MB | ≈ 164 MB | ≈ 170 MB |
| Menú público en JSON (sin comprimir / comprimido) | ≈ 18 / 4 KB | ≈ 34 / 8 KB | ≈ 55 / 13 KB | ≈ 49 / 11 KB |
| PDF de tarjetas QR (una vez) | 53 KB | 94 KB | 210 KB | 132 KB |
| Visitas al mes | 1,800 | 1,800 | 4,500 | 1,500 |
| Historial que crece cada mes | ≈ 21 MB | ≈ 21 MB | ≈ 53 MB | ≈ 18 MB |
| Historial acumulado a los 12 meses | ≈ 250 MB | ≈ 250 MB | ≈ 630 MB | ≈ 210 MB |

Lectura: el almacenamiento inicial (fotos + base) es de decenas a cientos de MB y **no crece** después; lo que crece cada mes son los **18–53 MB de visitas**. En un año un restaurante grande acumula ≈ 630 MB: poco por restaurante, pero **1,000 restaurantes chicos suman ≈ 21 GB nuevos cada mes** (ver §6.3).

---

## 3. Qué cuesta mientras corre, fase por fase del ciclo de la mesa

**Qué se reutiliza.** Las cifras de costo por petición vienen de `docs/plan/perf/2026-11-13-modelo-de-capacidad.md` **[documento, medida allí]**; aquí no se volvió a medir el camino caliente: sondeo con respuesta `304` o `200` ≈ **3.3 ms de CPU de API** (mezcla realista: 93 % `304`, 5 % `200` con cuerpo, 2 % eventos; ±2× en Railway), ≈ **640 bytes** de salida por petición de la mezcla (580 B un `304`, 1.7 KB un `200`), menú desde el borde 0.65–0.9 ms al origen, `entrar` 5.7–10 ms, un evento 1.1–4.2 ms.

**Supuestos propios de este informe [estimada]:** un teléfono con la app al frente sondea cada 3 s (20 por minuto: es lo que hace el código hoy); **con la pantalla apagada el sondeo se pausa** (el hook de entrada lo hace en segundo plano, `useEntrada.ts`); la parte de cada fase con la app al frente es la columna «al frente». Esa columna es el supuesto más débil del informe: se puede medir (pregunta 6 de §8) y cambia los resultados hasta ×2.

### 3.1 Por fase (perfil mediano: visita de 50 min, por comensal con app)

El ciclo es el de la Spec 001 (abierta → cuenta cerrada → pagada → mesa limpia); las fases 3 y 4 son el tiempo entre la confirmación de la comanda y el pago. La fracción de la visita en cada fase es [estimada].

| Fase | Qué hace cada teléfono | Min de la visita | Al frente | Peticiones por minuto (al frente) | Sondeos por comensal | CPU de API | Salida |
|---|---|---|---|---|---|---|---|
| 1 Entran y ven el menú | `entrar` una vez (≈ 4 sondeos de CPU), menú (borde), refresco de menú cada 25 s, sondeo 3 s, 1–2 eventos | 5.0 | 100 % | ≈ 23 | 100 | 0.33 s | 64 KB |
| 2 Arman la orden en grupo | sondeo 3 s + ≈ 3 escrituras por comensal (agregar o cambiar ítem) y la confirmación (`FOR UPDATE`) | 6.5 | 100 % | ≈ 22 | 130 | 0.43 s | 83 KB |
| 3 Esperan la comida | sondeo 3 s mientras la pantalla siga encendida | 12.5 | 40 % | 20 | 100 | 0.33 s | 64 KB |
| 4 Se sirve y comen | sondeo con la pantalla casi siempre apagada | 19.0 | 10 % | 20 | 38 | 0.13 s | 24 KB |
| 5 Cuenta cerrada y propina | sondeo 3 s + 1–2 escrituras (propina, cierre) | 3.5 | 100 % | ≈ 21 | 70 | 0.23 s | 45 KB |
| 6 Pagan (el mesero valida) | sondeo hasta que el mesero marca «pagada» | 2.5 | 60 % | 20 | 30 | 0.10 s | 19 KB |
| 7 Mesa limpia | ya se fueron; los teléfonos están en segundo plano | 1.0 | 0 % | 0 | 0 | 0 | 0 |
| **Total por comensal** | | **50** | | | **468** | **1.54 s** | **300 KB** |

El personal también sondea (6 dispositivos × 1 cada 5 s por restaurante; en la Fase 3 la vista de estatus calcula más cosas): ≈ 1.2 peticiones por segundo en pico, menos del 10 % del total **[documento: capacidad M4]**.

**Qué se ve:** Más de 4 de cada 5 peticiones salen en las fases **1, 2, 3 y 5**. La fase 2 es la más cara por comensal (130 sondeos más las escrituras), y la espera (fase 3) es donde se desperdicia más: nada cambia durante 12 minutos y el teléfono pregunta igual si la pantalla sigue encendida. La fase 4 casi no cuesta **sólo si** la pantalla se apaga.

### 3.2 Por comensal-hora, por visita y por restaurante-mes

Con la fórmula y las constantes del guion `2026-11-13-planes-y-costo-por-restaurante-modelo.py`. «Peticiones por visita» cuenta sólo los comensales que abren la app (60 %); incluye ≈ 14 escrituras y lecturas por comensal además del sondeo.

| | Chico | Mediano | Grande | Formal |
|---|---|---|---|---|
| Peticiones por comensal-hora de visita | 562 | 562 | 562 | 562 |
| Peticiones por visita (mesa) | 365 | 803 | 1,377 | 2,008 |
| CPU de API por visita | 1.2 s | 2.7 s | 4.5 s | 6.6 s |
| Salida de red por visita | 0.23 MB | 0.51 MB | 0.88 MB | 1.29 MB |
| Dólares por visita (CPU + red) | 0.000021 | 0.000046 | 0.000079 | 0.000115 |
| Pesos por visita | 0.0004 | 0.0009 | 0.0015 | 0.0022 |
| Visitas al mes | 1,800 | 1,800 | 4,500 | 1,500 |
| Peticiones por restaurante-mes | 0.66 M | 1.4 M | 6.2 M | 3.0 M |
| CPU + red por restaurante-mes (USD) | 0.04 | 0.08 | 0.36 | 0.17 |
| + historial guardado 6 meses y fotos (USD) | 0.02 | 0.02 | 0.05 | 0.02 |
| **Total variable por restaurante-mes (USD)** | **0.06** | **0.10** | **0.41** | **0.19** |
| **Total variable por restaurante-mes (pesos)** | **1.0** | **1.9** | **7.5** | **3.6** |

Un comensal-hora de visita cuesta 1.85 s de CPU y 0.36 MB de salida: **≈ 0.00003 USD** (3 centésimas de milésima de dólar). Mil visitas medianas cuestan ≈ 4.6 centavos de dólar.

### 3.3 Qué pasa con el tiempo de respuesta

El dinero no cambia con el tráfico; **el tiempo de respuesta sí.** Con 2 procesos y las curvas medidas **[documento: capacidad §3]**: a ≈ 25 % de uso (≈ 430 comensales al frente) un sondeo contesta en p95 ≈ 15–25 ms; a 50 % (≈ 860) p95 ≈ 60 ms; a 70 % (≈ 1,200) p95 ≈ 100 ms; a 85 % los teléfonos esperan de 0.7 a 1.5 s y reintentan; a 95–100 % hay 5 s y errores 500. Traducido a restaurantes en su hora pico a la vez (con la app al frente): **10 grandes** (≈ 610 teléfonos) ocupan ≈ 35 % del servidor; **20 medianos** (≈ 450 teléfonos), ≈ 26 %; **30 chicos** (≈ 330), ≈ 20 %. Más allá de ≈ 70 % empieza la cola, y de 80 % se desploma.

La regla de Cloudflare de 300 peticiones por 10 s **por IP** corta antes que el servidor a un restaurante con más de ≈ 90 teléfonos al frente en el mismo WiFi (**[estimada]** del modelo de capacidad; el plan Free de Cloudflare sólo permite una regla de límite, por IP, con ventana de 10 s **[fuente externa]**). Con 40–60 teléfonos al frente, un restaurante grande está por debajo; **un plan con más de ≈ 30 mesas la dispara.**

### 3.4 Dólares: qué se paga y por qué

| Recurso | Precio **[fuente externa: docs.railway.com/reference/pricing/plans, 13 nov 2026]** | Por restaurante mediano al mes |
|---|---|---|
| CPU de la API | 20 USD por vCPU-mes (0.0000077 por vCPU-segundo); sólo el que se usa | 0.04 |
| Salida de red | 0.05 USD/GB | 0.05 |
| Volumen de PostgreSQL | 0.15 USD/GB-mes | 0.02 (acumulado 6 meses) |
| Memoria | 10 USD/GB-mes; **siempre encendida, no depende del uso** | 0 variable (fija) |
| Fotos y respaldos en R2 | 0.015 USD/GB-mes; 10 GB gratis; salida gratis **[fuente externa: developers.cloudflare.com/r2/pricing, 13 nov 2026]** | ≈ 0.002 |

**Qué cuesta más, por orden:** (1) la **base fija** (memoria de la API y de PostgreSQL, suscripción), que es ≈ 90 % de la factura con 100 restaurantes y ≈ 70 % con 500 (§6.3); (2) **salida de red**, que pesa tanto o más que el CPU (cada `304` sale con ≈ 580 bytes de cabeceras: la mitad son cabeceras de seguridad que sólo sirven en páginas HTML, §3.7); (3) CPU; (4) volumen de la base; (5) R2. **Por tiempo, el orden es otro:** el CPU se acaba primero.

### 3.5 Lo de una sola vez: importar el PDF con la API de Claude

**Modelo que usa hoy** `app/services/importacion_menu.py`: `claude-opus-5-5` (`Settings.IMPORTACION_MODELO`) **[documento]**. **Precios [fuente externa: platform.claude.com/docs/en/about-claude/pricing, leída el 13 nov 2026]:** Opus 5.5 = 4 USD / 20 USD por millón de tokens (entrada / salida); Sonnet 5.5 = 2 / 10; Haiku 5.5 = 0.10 / 0.50 (para prompts de hasta 100 mil tokens). La documentación de PDF dice que cada página usa **1,500–3,000 tokens de texto** según la densidad **y además** se cuenta como imagen (platform.claude.com/docs/en/build-with-claude/pdf-support, 13 nov 2026).

**Supuestos [estimada]:** 3,500 tokens por página (≈ 2,250 de texto + ≈ 1,250 de imagen: **la parte de imagen es suposición**), ≈ 1,000 tokens de instrucciones y esquema, ≈ 60 tokens de salida por platillo, sin tokens de razonamiento. Tipo de cambio: 18.6188 MXN por USD, FIX de Banxico del 12 de noviembre **[fuente externa]**.

| Carta | Tokens entrada / salida | Haiku 5.5 | Sonnet 5.5 | **Opus 5.5 (hoy)** |
|---|---|---|---|---|
| 4 páginas, 40 platillos | 15,000 / 2,400 | 0.003 USD (0.05 MXN) | 0.054 (1.0 MXN) | **0.108 USD (2.0 MXN)** |
| 8 páginas, 100 platillos | 29,000 / 6,000 | 0.006 (0.11 MXN) | 0.118 (2.2 MXN) | **0.236 USD (4.4 MXN)** |
| 20 páginas, 300 platillos | 71,000 / 18,000 | 0.016 (0.30 MXN) | 0.322 (6.0 MXN) | **0.644 USD (12.0 MXN)** |

Coincide con lo que dice el ADR-014 («≈ 0.15–0.25 USD con Opus 5.5, ≈ 0.01 con Haiku») para una carta de 8 páginas. **Margen ±30 %**, y hasta ×3 si el procesador reintenta (hasta 3 corridas por importación **[documento: `MAX_CORRIDAS`]**). El costo es lineal: entrada = 3,500 × páginas + 1,000; salida = 60 × platillos.

**Lo que importa para los planes:** (a) es el **único costo directo por restaurante** (0.1–0.6 USD cada una, equivalente a 2–10 meses de todo el costo variable de un restaurante chico); (b) **hoy no hay tope mensual**: sólo 3 importaciones en curso a la vez, 30 páginas y 20 MB por archivo **[documento]**; alguien que suba 100 cartas de 20 páginas gasta ≈ 64 USD; (c) Haiku 5.5 costaría 40–50 veces menos, pero la precisión no está medida (el ADR-014 pide ≥ 90 % de precios correctos con las 5 cartas reales; ninguna se ha probado con Haiku).

### 3.6 Inventario de «relojes»: lo que ocurre por tiempo y no por evento

Todo lo que hoy corre cada cierto tiempo, aunque nadie haya hecho nada. Por orden de peso.

| Reloj | Intervalo | Quién lo hace | Cuánto pesa | Marca |
|---|---|---|---|---|
| **Sondeo de la sesión** (`GET /p/sesion`) | **3 s** al frente (con fallo, hasta 30 s); pausado en segundo plano | cada teléfono del comensal con la app al frente | **≈ 95 % de las peticiones** y de la salida de red; 3.3 ms de CPU y 0.6 KB cada una (§3.1) | [documento: `INTERVALO_SONDEO_MS`, `useEntrada.ts:9`] |
| Relectura del menú | 25 s mientras se ve, y al volver la pestaña o la red | cada teléfono, sólo en la pantalla del menú | ≈ 2.4 por minuto por teléfono, pero **casi toda la absorbe Cloudflare** (`s-maxage` 30 s); al origen llega ≈ 1 por restaurante cada 30 s a 0.65–0.9 ms | [documento: T-2.7 y T-2.2] |
| Lotes de analítica (`POST /p/eventos`) | 5 s si hay eventos, y al ocultarse la página; hasta 50 por lote | cada teléfono | 1.1–4.2 ms por lote; lo que no cabe se descarta (120 por minuto por teléfono) | [documento: T-2.5 y capacidad M3] |
| Sondeo del personal (`/op/mesas`) | **5 s**, constante | 6 dispositivos por restaurante (**Fase 3, sin construir**) | ≈ 1.2 peticiones por segundo por restaurante en pico (menos del 10 % del total), pero más caras: la vista de estatus calcula minutos sin acciones | [documento: 02 §6 y capacidad M4] |
| Estado de la importación en el panel | 3 s, hasta 10 min | el operador, sólo mientras se lee su PDF | ≈ 200 peticiones por carta, una vez por restaurante: despreciable | [documento: `useSondeo.ts`, `INTERVALO_MS = 3000`] |
| Cierre por inactividad de sesiones | 300 s | cada worker del servidor | 1 consulta con `SKIP LOCKED` cada 5 min por worker; **desaparece cuando T-3.12 lo sustituya** | [documento: `INTERVALO_CIERRE_SEGUNDOS`, `sesion.py:79`] |
| Procesador de importaciones | 10 s (o al instante si se sube un PDF) | cada worker | con la cola vacía, 1 consulta por 10 s por worker (0.2 por segundo con 2): despreciable | [documento: `INTERVALO_SEGUNDOS`, `procesador.py:74`] |
| Sonda de R2 de `/ready` | una real cada 20 s como mucho | el servidor, cuando alguien llama a `/ready` | ≤ 4,320 `HEAD` al día ≈ 130,000 al mes ≈ 0.05 USD al mes (0.36 USD por millón de operaciones clase B) | [documento: `VIGENCIA_SONDA_SEGUNDOS`] + [fuente externa: R2, 13 nov] |
| Respaldo a R2 | servicio con horario de Railway | contenedor aparte | un `pg_dump` por ejecución; la frecuencia **no consta aquí** (`deploy/respaldo`), **la ve Calvin** | [documento: `deploy/railway/README.md`] |
| *Vencimientos (no son relojes)*: estado de la mesa en memoria 2 s, menú en memoria 30 s, ventana de purga de Cloudflare 0.2 s | — | — | deciden cuántos sondeos tocan la base (§3.7) | [documento: `VIDA_ESTADO_SEGUNDOS`, `VIGENCIA_SEGUNDOS`] |

**Conclusión del inventario:** de todos los relojes, **sólo el sondeo de la sesión crece con los comensales**; el resto es por restaurante o por servidor y casi no pesa. Eso es lo que hace que el sondeo sea «lo que más cuesta» y que la mejora (§5) se concentre en él.

### 3.7 En qué se va cada pregunta («¿cambió algo?»)

Reparto del tiempo de CPU de un sondeo `304` con el estado en memoria (≈ 1.9 ms), según el perfil de CPU del modelo de capacidad **[documento: capacidad, «Perfil de CPU»; proporciones, no valores absolutos]**. Las milésimas son mi aplicación de esos porcentajes a 1.9 ms **[estimada]**.

| Parte de la petición | Porcentaje | ≈ ms | Qué es |
|---|---|---|---|
| **Comprobar si cambió algo** (`estado()`: ETag y comparación) | 7 % | 0.13 | lo único que es «la pregunta» |
| **Verificar el pase** (JWT de invitado, `PyJWT`) | 15 % | 0.29 | identificar al teléfono en cada sondeo |
| **Límite de tasa** (analizar la IP y los rangos de Cloudflare) | 10 % | 0.19 | contar 120 por minuto por teléfono |
| Resolver dependencias de FastAPI | 12 % | 0.23 | inyección por petición |
| Emparejar la ruta | 8 % | 0.15 | |
| Línea de acceso del registro (JSON) | 4 % | 0.08 | |
| Armazón ASGI, middlewares y **cabeceras de seguridad** | ≈ 40 % | 0.76 | lo que se hace por cualquier respuesta |
| (sin asignar) | ≈ 4 % | 0.08 | |

**Lectura:** «comprobar si cambió algo» es **7 %** del trabajo; el otro 93 % es el costo de atender una petición HTTP en Python. Por eso el sondeo es caro aunque la respuesta sea vacía y por eso las ganancias (§5) vienen de **hacer menos preguntas**, no de hacerlas más rápidas. Cuando el estado en memoria venció (mesas chicas, casi siempre), se suman 3 consultas y +0.8–1.5 ms más (mezcla ≈ 3.3 ms).

**Bytes por respuesta vacía [medida aquí]** (un `304` local del menú, con las cabeceras reales de la API): **606 B** en total (los ≈ 580 B del modelo de capacidad más `date` y `server`):

| Cabecera | Bytes | ¿Sirve en un JSON? |
|---|---|---|
| `content-security-policy` | 217 | **Sólo para páginas HTML** |
| `permissions-policy` | 62 | Sólo para páginas |
| `x-frame-options` | 23 | Sólo para páginas |
| `referrer-policy` | 50 | Casi nunca en JSON (aplica a páginas que enlazan) |
| `x-content-type-options` | 33 | Sí (evita que un navegador adivine el tipo) |
| `etag`, `cache-control`, `x-request-id` | 42 + 48 + 48 | Sí |
| línea de estado, `date`, `server` | 27 + 37 + 17 | Sí (obligatorias o de bajo valor) |

Las cuatro primeras suman **352 B (58 %)**; las tres que sólo sirven en páginas HTML, **302 B (50 %)**. Quitarlas de `/api` bajaría un `304` a ≈ 300 B (alternativa G en §5): ahorra salida de red (≈ 0.05 USD por GB), casi nada de CPU, y cambia la política exacta de `02 §12`.

### 3.8 Operaciones pesadas de una sola vez (cuánto tarda para el operador)

Ninguna ocurre por comensal; cada una la hace un operador a veces. **Van de una en una por worker** (semáforo o cola propia), así que con 2 workers hay como mucho 2 a la vez en todo el servicio, y una tercera espera o recibe 503.

| Operación | Cuánto espera el operador | Cuánto CPU del worker | Concurrencia | Marca |
|---|---|---|---|---|
| **Leer un PDF con IA** (importación) | **No medido**: la API real no se llamó. Tope de **170 s** por corrida (plazo del procesador 180 s); el asistente espera hasta 10 min; el alta completa de una carta tomó **menos de 10 min** en staging el 11 de nov | casi ninguno: la espera es de la API de Claude y el worker no retiene la conexión a la base | una por worker (`procesador.py`); **3 en curso por restaurante** (409 al cuarto); costo en dólares: §3.5 | [documento: ADR-014, `importaciones.py:91`, 04] |
| **Subir una foto** | procesar: **0.21 s** una foto de teléfono de 12 MP en JPEG, **0.6 s** una de 48 MP en HEIC, 0.05 s una chica; más 3 subidas a R2 (plazo 25 s) | 0.05–0.6 s de un núcleo | `PROCESOS_SIMULTANEOS = 1` por worker; espera máxima 15 s en cola y luego 503 | [medida aquí] 1 núcleo local ±2× + [documento: `assets.py`] |
| **Generar el PDF de QR** | **46 ms** para 8 mesas, 0.1 s para 20, 0.33 s para 60, **0.77 s para 150** | igual que la espera (hilo propio) | un turno por worker; 503 `SERVICIO_OCUPADO` al segundo | [medida aquí] + [documento: `qr_pdf.py`] |
| Confirmar una importación | no medido (transacción única bajo `FOR UPDATE` del restaurante, hasta 1,000 platillos) | — | una por restaurante a la vez | [documento] |
| Alta o cambio de PIN | no medido aquí (Argon2id con t=3, m=64 MiB, p=4 en un pool propio) | — | cola acotada, 503 si se llena | [documento: T-1.6] |

**Qué significa para los planes:** subir 100 fotos de golpe son ≈ 21–60 s de un núcleo que, mientras tanto, atiende sondeos más lento; un alta en la que 10 restaurantes suben su carta a la vez tapa los 2 workers de importación. Son razones para limitar las subidas por mes (§7.2) además del costo de la IA.

---

## 4. Qué se paga hoy pase lo que pase y qué crece con el uso

Lo que consta en el repositorio (`deploy/railway/README.md`, `06_Hosting.md`, `Settings`); lo demás lo ve Calvin en su factura.

| Concepto | ¿Fijo o variable? | Cuánto | Marca |
|---|---|---|---|
| **Suscripción de Railway** (Hobby 5 USD o Pro 20 USD; incluye ese mismo monto en uso) | Fijo | 5 o 20 USD/mes | [fuente externa] (docs.railway.com, 13 nov). **Qué plan tiene Carta hoy: lo ve Calvin en su factura**; el repositorio no lo dice |
| Dos *environments* (staging y producción), cada uno con API + PostgreSQL + servicio de respaldo con horario | Casi fijo: la RAM de cada servicio encendido se cobra siempre | RAM ≈ 10 USD/GB-mes; API ≈ 0.17 GB por worker en reposo [medida aquí] → 2 workers ≈ 0.4 GB ≈ 4 USD; PostgreSQL ≈ 1.5 GB ≈ 15 USD [estimada del modelo de capacidad]; **staging duplica una parte** | [fuente externa] + [medida aquí] + [estimada] |
| Volumen de PostgreSQL | Variable lento (crece con las visitas) | 0.15 USD/GB-mes | [fuente externa] |
| CPU de la API | **Variable**, se cobra el CPU que se usa, no el reservado | 20 USD por vCPU-mes = 0.0000077 USD por vCPU-segundo | [fuente externa] |
| Salida de red del origen (los `304` de sondeo salen por Railway) | Variable | 0.05 USD/GB | [fuente externa] |
| Cloudflare (plan Free: DNS, TLS, caché del menú, regla de tasa) | Fijo, 0 | La regla de límite de tasa del plan Free es **una sola**, con ventana de 10 s y sólo por IP | [fuente externa] y [documento: `deploy/railway/README.md`] |
| Dominio `carta.cooking` | Fijo, anual | no consta en el repositorio | **lo ve Calvin en su factura** |
| R2: fotos y respaldos | Variable muy pequeño | 0.015 USD/GB-mes, primeros 10 GB gratis, salida gratis | [fuente externa] |
| Firebase Authentication (operador) | Variable, gratis hasta 50,000 usuarios activos al mes | sólo los operadores inician sesión (uno o dos por restaurante) | [fuente externa] (firebase.google.com/pricing, 13 nov) |
| API de Claude (importar cartas en PDF) | **Variable por evento, único por carta** | 0.11–0.64 USD con Opus 5.5, 0.003–0.016 con Haiku 5.5 (§3.5) | [fuente externa] + [estimada] |
| Sentry, UptimeRobot, Resend (correo del enlace de acceso) | Fijo, 0 en el plan gratuito | el repositorio tiene el SDK de Sentry; **sus planes no constan** | **lo ve Calvin** |
| Tiempo de Calvin y de la sesión maestra | No es dinero de infraestructura | — | fuera de alcance |

**Qué crece con el uso y cómo (por orden):**

1. **CPU de la API** ∝ peticiones. No es lo caro en dólares (centavos por restaurante), pero **es lo que se acaba primero**: con 2 workers el tope son ≈ 1,200 comensales con la app abierta a la vez.
2. **Salida de red** ∝ peticiones × 640 bytes. A un restaurante grande le cuesta ≈ 0.10 USD al mes.
3. **Volumen de PostgreSQL** ∝ visitas acumuladas. Hoy nada lo limpia: las sesiones, órdenes y eventos se quedan para siempre (el cierre de la Fase 3 no cambia eso).
4. **La importación con Claude** ∝ cartas subidas (reintentos incluidos: hasta 3 corridas por importación **[documento: `MAX_CORRIDAS = 3`]**).

**Lo que no crece con el uso:** el menú y las fotos (Cloudflare y R2, gratis o casi), la memoria de la API (≈ 160 MB por worker **[medida aquí]**), Firebase y Cloudflare mientras no se pase de los planes gratuitos.

---

## 5. Alternativas para lo que más cuesta (el sondeo)

**Qué se quiere ahorrar:** las preguntas de «¿cambió algo?» (§3.6, §3.7): 95 % de las peticiones, 93 % de cada una es costo de HTTP y no de la comprobación. Base 100 = sondeo de hoy. **No se midieron aquí** las alternativas de conexión abierta: las mide otra sesión en `docs/plan/perf/2026-11-13-eventos-frente-a-sondeo.md` (rama `agente/medicion-eventos-frente-a-sondeo`); esta tabla sólo las enumera.

| # | Alternativa | Ganancia estimada [estimada] | Costo y riesgo | Documento que cambiaría |
|---|---|---|---|---|
| A | **Sondeo por fase de la mesa:** 3 s al armar la orden y en la cuenta, 5 s al entrar, 10 s en la espera, 20 s tras servir, detenido al quedar pagada | −30 % según fase (9.4 → 6.5 sondeos activos por minuto de visita); −55 % si todos están al frente | Frontend (tabla fase→intervalo); depende del ciclo de la Fase 3. Se ve un cambio hasta 10–20 s tarde en la espera | `02 §6` (la tabla pasa a ser por fase), Spec 001 |
| B | **Sondeo adaptativo por inactividad** (10 s tras 2 min sin cambios; `02 §6` ya lo promete y el código tiene 3 s fijos) | −20 % según fase; −35 % todos al frente | Tarea chica de frontend; sin dependencias | ninguno: cierra la brecha entre 02 §6 y el código |
| A+B | Ambos | −35 % / −58 % | — | — |
| C | **Estado de la mesa en memoria más de 2 s, invalidado con `LISTEN/NOTIFY` de PostgreSQL** (sin Redis) | −30 a −40 % de CPU por petición (≈ 3.3 → ≈ 2.0 ms: lo medido entre «estado en memoria» y «estado que hay que leer») | Código nuevo y una conexión por worker; un aviso perdido se acota con TTL de 10 s | `ADR-004`, `02 §6` («vida máxima 2 s»), `02 §10` |
| D | **Eventos con conexión abierta (SSE) / WebSockets** | **la mide el informe `eventos-frente-a-sondeo`**; no se estima aquí | `ADR-004` los descartó («se comporta mal tras proxies de redes de restaurante»); necesitaría C para avisar entre workers | `ADR-004` (uno nuevo), `02 §6`, `02 §10`, `02 §12` |
| E | **Notificaciones push para «tu orden está lista»** | quita el sondeo de la espera sólo para quien las acepte (≈ −15 % según fase) | Medio. **iPhone: sólo iOS/iPadOS 16.4+ y sólo con la app agregada a la pantalla de inicio, con permiso pedido por un toque** [fuente externa: webkit.org/blog/13878, 13 nov]; un comensal anónimo casi nunca la instala (sin dato); guardar la suscripción ligada a una persona **choca con la regla dura 10** | `CLAUDE.md` regla 10, ADR nuevo |
| F | **Menos bytes por `304`:** quitar de `/api` las tres cabeceras sólo-HTML (302 de 606 B, §3.7) | −50 % de salida de red; CPU casi igual | Una condición en `app/core/cabeceras.py`; ahorro en dinero muy pequeño (≈ 0.05 USD por GB) | `02 §12`, `tests/unit/test_cabeceras.py` |
| G | Palancas 0–5 del modelo de capacidad (más workers, JWT una vez, ruta cruda…) | independientes y se multiplican con A–C | ver ese documento | — |

**Recomendación:** B ahora, A con la Fase 3, C si la T-4.4 confirma que el CPU por petición es el límite. D y E, después de leer el informe de eventos y de medir cuántos teléfonos quedan con la pantalla encendida (pregunta 6 de §8).

---

## 6. Capacidad por plan y costo de sostener restaurantes

### 6.1 Cuántos restaurantes de cada perfil caben a la vez

**Método [estimada].** Tope en comensales con la app al frente a 70 % de CPU: **1,200 con 2 procesos (hoy)** **[documento: capacidad §1, medido local, ±2×]**; con 4 procesos × 1.8 (palanca 1 del documento, 1.8–2×) = 2,200; con 8 procesos × 3.3 = 4,000 (suponiendo que Railway entrega los núcleos; **no medido**). Carga de un restaurante en la hora más cargada del sistema = comensales con app en su pico × **0.7** (en esa hora el restaurante típico está al 70 % de su propio pico) × **0.6** (sólo el 60 % de los registrados trabaja en esa hora) × la **fracción al frente** (0.47 según las fases de §3; 1.0 en el supuesto conservador del modelo de capacidad). Estos tres factores son juicio mío; cambian el resultado en proporción directa.

| Restaurantes **registrados** que caben (por perfil) | Hoy (2 procesos) | 4 procesos | 8 procesos | 8 procesos + mejoras de §5 (×2.5) |
|---|---|---|---|---|
| Chico: según fase / todos al frente | 553 / 259 | 1,014 / 474 | 1,843 / 863 | ≈ 4,600 / 2,200 |
| Mediano | 272 / 127 | 498 / 233 | 906 / 424 | ≈ 2,300 / 1,060 |
| Grande | 100 / 47 | 183 / 86 | 333 / 156 | ≈ 830 / 390 |
| Formal | 170 / 79 | 311 / 146 | 565 / 265 | ≈ 1,400 / 660 |

«×2.5» = sondeo adaptativo y por fase (A+B), estado con `LISTEN/NOTIFY` (C) y las palancas 0–5 del modelo de capacidad; es la suma optimista de ganancias que ese documento y §5 estiman por separado, sin probarlas juntas. **Lee cada celda con ×/÷2.**

**Qué más cambia al subir procesos** (del documento de capacidad, M5): el conjunto de conexiones a PostgreSQL (hoy 2 × (10 + 10) = 40; Railway permite ≈ 100 **[estimada, sin verificar]**) obliga a bajar `DB_POOL_SIZE` y `DB_MAX_OVERFLOW` a 5 + 5 con 4 procesos y a 3 + 2 con 8; los límites de tasa del comensal viven en la memoria de cada proceso, así que con 8 procesos el límite efectivo puede ser hasta 8 veces el nominal.

### 6.2 Mezclas de planes

Carga media por registrado (comensales al frente en la hora cargada, «según fase»): gratuito (perfil chico) **2.2**; de paga (50 % mediano, 25 % grande, 25 % formal) **7.0**. Un gratuito que llene el límite del plan (10 mesas × 6 personas × 60 % de uso × 0.8) llegaría a 29 teléfonos en su hora pico, 2.6 veces el chico típico: los topes de mesas y personas por mesa son lo que acota el peor caso.

| Mezcla de registrados | Hoy (2 procesos) | 4 procesos | 8 procesos | Si todos están al frente (hoy / 4 / 8) |
|---|---|---|---|---|
| 100 % gratuitos | ≈ 550 | ≈ 1,010 | ≈ 1,840 | 259 / 474 / 863 |
| 90 % gratuitos, 10 % de paga | ≈ 450 | ≈ 830 | ≈ 1,510 | 212 / 388 / 706 |
| 80 % gratuitos, 20 % de paga | ≈ 380 | ≈ 700 | ≈ 1,280 | 179 / 329 / 598 |
| 70 % gratuitos, 30 % de paga | ≈ 330 | ≈ 610 | ≈ 1,110 | 155 / 285 / 518 |
| 100 % de paga | ≈ 170 | ≈ 315 | ≈ 570 | 80 / 147 / 268 |

**Lectura:** la capacidad la consumen sobre todo los restaurantes grandes de paga, no los gratuitos: un grande pesa lo mismo que 5.5 gratuitos. Un tope de mesas más bajo para gratuitos (10) mantiene la mezcla sana.

### 6.3 Costo mensual de sostener 100, 500 y 1,000 restaurantes gratuitos

Todos de perfil chico, 6 meses de historial, procesos según la carga (mínimo 2). **Precios de Railway [fuente externa, 13 nov 2026]**: CPU 20 USD/vCPU-mes, memoria 10 USD/GB-mes, red 0.05 USD/GB, volumen 0.15 USD/GB-mes; plan Pro 20 USD (su límite de volumen es 1 TB; el de Hobby son 5 GB). **Supuestos [estimada]:** memoria de PostgreSQL 1.5 GB (≤ 100 restaurantes), 3 GB (≤ 500), 4.5 GB (1,000); 0.17 GB por proceso; un ambiente de staging de ≈ 10 USD; sin Redis; Cloudflare gratis. **Lo que cuesta la base grande no está medido**: con 124 GB de datos a 1,000 restaurantes la base seguramente pide más memoria.

| | 100 | 500 | 1,000 |
|---|---|---|---|
| Procesos de API necesarios | 2 | 2 | 4 |
| Suscripción de Railway (Pro) | 20 | 20 | 20 |
| Memoria (API + PostgreSQL) | 18 | 33 | 52 |
| CPU realmente usado | 1.7 | 8.4 | 16.7 |
| Salida de red | 2.1 | 10.5 | 21.0 |
| Volumen de PostgreSQL | 1.9 (12 GB) | 9.3 (62 GB) | 18.5 (124 GB) |
| Fotos y respaldos en R2 | 0 (2 GB) | 0 (9 GB) | 0.1 (18 GB) |
| Staging | 10 | 10 | 10 |
| **Total (USD / mes)** | **≈ 54** | **≈ 92** | **≈ 138** |
| **Por restaurante gratuito (USD / pesos)** | 0.54 / 10.1 | 0.18 / 3.4 | 0.14 / 2.6 |
| Con las mejoras de §5 (USD / mes) | ≈ 52 | ≈ 80 | ≈ 112 |
| Lecturas de PDF, una sola vez, 5 páginas con Opus | 11 | 55 | 110 |

**Tres cosas que pesan más que el CPU:** (1) la **base fija** (memoria + suscripción + staging = 48 USD de los 54); (2) el **volumen**: 12 GB con 100 restaurantes **ya supera los 5 GB que permite el plan Hobby**, así que a 100 gratuitos con 6 meses de historial se necesita Pro (o recortar la retención a ≈ 2 meses); (3) la **red**, mayor que el CPU. Con la mitad de coincidencia de horarios las cifras de CPU bajan, no las de memoria.

**Sostener 1,000 gratuitos cuesta ≈ 2,600 pesos al mes (≈ 31,000 al año).** El costo que sí se va de las manos es el de **leer PDFs sin tope** (§3.5) y el de **no limpiar el historial**.

### 6.4 Punto de equilibrio: cuántos gratuitos paga uno de paga

Precios del plan de paga, **sin IVA y sin comisión de cobro** (la v1 no cobra con tarjeta; con Stripe sería 3.6 % + 3 pesos **[documento: modelo de negocio, Banxico/Stripe, sept 2026]**, ≈ 4.5 % de 349). Tres precios con origen:

- **157 pesos al mes:** el plan de pago de Neolo (menú QR; gratis hasta 200 visitas) **[fuente externa: neolo.com/mexico/menu-qr, 13 nov 2026]**; referencia baja. OlaClick Advanced cuesta 9.90 USD ≈ 184 pesos, con 75 pedidos al mes **[fuente externa: pricing.olaclick.app, 13 nov]**.
- **349 pesos al mes:** el precio que Carta tenía pensado **[documento: `docs/research/2026-09-19-modelo-de-negocio-y-pagos.md`]**; cerca de MenuTiger Regular (17 USD ≈ 317 pesos, 500 pedidos al mes **[fuente externa: menutiger.com/es/pricing, 13 nov]**) y de OlaClick Premium (25 USD ≈ 465 pesos, 400 pedidos).
- **799 pesos al mes:** el «Master Chef» del prototipo (`prototipo/js/admin-onboarding.jsx`, ver §7.1). Referencia alta: Last.app cuesta 1,000 / 1,700 / 2,900 pesos + IVA por sucursal, con instalación única de 4,000 + IVA **[fuente externa: last.app/mx/precios, 13 nov]**, aunque incluye punto de venta; la página de Fudo ya no abre (404) y sus precios previos (360 / 690 / 1,050 al mes) son de septiembre **[documento]**.

| Precio mensual | USD (sin IVA) | Gratuitos que paga uno de paga, **costo total** por gratuito de 0.18 USD (a 500) | …sólo **costo marginal** (0.06 USD: CPU, red, historial) | % de pago para cubrir toda la base con 100 / 500 / 1,000 |
|---|---|---|---|---|
| 157 | 8.43 | ≈ 47 | ≈ 150 | 6.4 % / 2.2 % / 1.6 % |
| 349 | 18.74 | ≈ 104 | ≈ 330 | 2.9 % / 1.0 % / 0.7 % |
| 799 | 42.91 | ≈ 240 | ≈ 750 | 1.3 % / 0.4 % / 0.3 % |

Cómo leerlo: con 349 pesos, **un restaurante de paga cubre el costo de ≈ 100 gratuitos**; para cubrir toda la base fija con 100 restaurantes registrados basta que ≈ 3 de cada 100 paguen. Eso supone que los de paga cuestan poco más que los gratuitos (sus 0.1–0.4 USD de costo variable son 1–2 % del precio). **Falta lo que no consta aquí:** soporte, tiempo de Calvin, correo y la comisión de cobro cuando exista.

---

## 7. Propuesta de planes (borrador para decidir)

### 7.0 Límites que ya existen en el código («límites de hoy»)

| Límite | Valor de hoy | Dónde |
|---|---|---|
| Mesas activas por restaurante / por llamada | 500 / 100 | `MAX_MESAS_ACTIVAS`, `MAX_MESAS_POR_LLAMADA`, `app/schemas/mesa.py:13-14` |
| Personal activo | 50 | `MAX_PERSONAL_ACTIVO`, `app/schemas/personal.py:22` |
| Miembros por mesa | 12 | `MAX_MIEMBROS`, `app/services/sesion.py:76` (AC-02.5) |
| Platillos por importación / por categoría / categorías | 1,000 / 500 / 100 | `app/schemas/importacion.py:60-71` |
| **Platillos por restaurante** | **sin tope** | no existe |
| Fotos por platillo | 1 (con tres variantes) | `app/services/assets.py` |
| Tamaño de foto / píxeles | 15 MB / 50 millones | `MAX_BYTES`, `MAX_PIXELES`, `app/services/assets.py:110-116` |
| Importaciones en curso a la vez | 3 por restaurante | `MAX_EN_CURSO`, `app/services/importaciones.py:91` |
| Corridas por importación | 3 | `MAX_CORRIDAS`, `importaciones.py:90` |
| **Importaciones al mes** | **sin tope** | no existe |
| PDF: tamaño / páginas / imagen | 20 MB / 30 páginas / 5 MB | `app/services/importacion_menu.py:83-85` |
| Cierre por inactividad de la sesión | 3 h (se sustituye en la Fase 3) | `INACTIVIDAD_MAXIMA`, `sesion.py:77` |
| Peticiones del comensal | 120 por minuto por teléfono; 600 por IP sin cookie | `app/api/publico/limites.py` |
| **Historial (sesiones, órdenes, eventos)** | **se guarda siempre** | no existe limpieza |
| Nivel de cuenta del operador | uno o varios por restaurante, sin tope definido | `operador_restaurante` |

### 7.1 Cómo aparecen los planes en el prototipo (referencia de flujo)

El prototipo **no es consistente**; cada pantalla dice algo distinto, y varias piezas están fuera de la v1 (pagos, realidad aumentada, comisión). Se cita, se señala y se pregunta (regla de Calvin del 12 de noviembre).

| Pantalla | Archivo | Qué dice |
|---|---|---|
| **P21 Alta del restaurante, paso 3 «Elige tu plan»** | `prototipo/js/admin-onboarding.jsx` (líneas ≈ 289–327) | **Chef — Gratis:** hasta 10 mesas, 3 meseros, «Menú AR + pagos», **con anuncios**. **Master Chef — 799 pesos/mes:** mesas ilimitadas, 20 meseros, sin anuncios, sesiones grupales, analytics completo. Texto: «Sin permanencia. La comisión de 1.8 % por venta ya está incluida en todos.» |
| P21 paso 3b «Método de pago» | mismo archivo (≈ 330–357) | «Hoy no se cobra nada — tu prueba dura 30 días»; tarjeta; «Cancela cuando quieras» |
| **P13 Configuración (escritorio)** | `prototipo/js/admin-ops.jsx` (`AdminSettings`, ≈ 322–331) | «Tu plan: **Pro**. Menú AR ilimitado · sesiones grupales · analytics · hasta 20 meseros» |
| **Configuración (móvil)** | `prototipo/js/admin-mobile2.jsx` (`MobConfig`, línea ≈ 505) | «Suscripción y facturación → Mi plan: **Pro · 249 pesos/mes**», «Upgrade a Enterprise» |
| Encabezado del panel | `prototipo/js/admin-core.jsx` (línea ≈ 35) | «Plan Pro» junto al nombre del restaurante |
| **P18c Carta+ paso 3 (comensal)** | `prototipo/js/comensal-onboarding.jsx` (≈ 242–306) | «**Carta+** · 1 peso al día (cargo mensual de **29 pesos**, 1 mes gratis)»: IA personalizada, eventos exclusivos, **realidad aumentada**, reservaciones prioritarias, Carta Charity |
| P22 Perfil del comensal | `prototipo/js/comensal-extra.jsx` (≈ 15–70) | «Carta+ · 24 días de prueba», historial de platillos con estrellas, preferencias |

**Contradicciones a resolver:** los tres nombres de plan (Chef/Master Chef, Pro, Enterprise) y los dos precios de paga (799 y 249); el plan gratuito «con anuncios» (la v1 no tiene anuncios) y con «menú AR + pagos» (regla dura 14 y «Qué NO construir»); «comisión de 1.8 % por venta» (sin pagos en la v1); el límite de 3 meseros / 20 meseros (el código permite 50 y Calvin habló de mesas, no de meseros, para las capas); y «analytics» (fuera de la v1).

### 7.2 Restaurantes: gratuito y de paga

**Límites propuestos** (los números de mesas y personas por mesa son decisión de Calvin del 12 de noviembre cuando existan planes; el resto es propuesta mía). La última columna dice si el límite **ahorra dinero de verdad**.

| Límite | Gratuito | De paga | ¿Ahorra dinero? |
|---|---|---|---|
| Mesas activas | **10** (prototipo: 10) | 40 (el tope técnico de hoy es 500) | **Capacidad, no dólares.** Acota el pico de teléfonos al frente de un solo local (6 por mesa ⇒ 36 en la hora pico) y mantiene la regla de Cloudflare lejos |
| Comensales por mesa | **6** (Calvin) | **12** (el diseño llega a 12; Calvin habló de hasta ≈ 32 en paga, pero las pantallas son para 12) | Poco: capacidad en la hora pico. Decisión ya tomada |
| Platillos activos | 60 | 300 (tope técnico: añadir 1,000) | **Casi nada** (≈ 1 KB cada uno). Sí cierra el hueco de «sin tope por restaurante» (menú de 6 MB) y acota lo que lee la IA |
| Fotos propias | hasta 20 platillos con foto; el resto, ilustración | todos | **Casi nada** en dólares (R2 ≈ 0.005 USD/mes por 100 fotos). Comercial |
| Personal activo (meseros + capitán) | 3 (prototipo: 3) | 20 (prototipo: 20; el código tiene tope 50) | **No.** Comercial. Hash del PIN es un gasto de CPU de una vez |
| Lecturas de PDF al mes | **2** (la primera y un reintento) | **10** | **Sí: el único con costo directo** (0.11–0.64 USD cada una, §3.5) y la única defensa contra abuso |
| Páginas por PDF | 10 | 30 (tope de hoy) | **Sí:** los tokens crecen con las páginas |
| Historial (visitas, eventos) | **30 días** | **12 meses** | **Sí:** volumen de la base y tamaño del respaldo (§2.2, §6.3) |
| Baja del restaurante | se borra todo de inmediato (Calvin) | se conserva hasta 30 días (Calvin) | Pequeño; ya decidido |
| Sesión de mesa: tope de seguridad | 6 h (Calvin) | 16 h (Calvin) | **No:** una sesión con teléfonos bloqueados casi no cuesta (§3.1); es red de seguridad |
| Anuncios / marca | sin anuncios; marca discreta «Hecho con Carta» | sin marca | Comercial. Anuncios rendirían 27–88 pesos al mes por restaurante **[documento: modelo de negocio]**, parecido al costo, y dañan la confianza |
| Dominio propio, soporte | no | sí | Comercial |
| Alérgenos, orden grupal, mesero, QR | **incluidos** | incluidos | — (es el producto) |

**Por qué el gratuito lleva el producto completo:** el valor de Carta es el flujo (QR → orden grupal → mesero) y su costo por restaurante es de centavos; si el gratuito recortara el flujo no se podría probar lo que se va a pagar. **Lo que se recorta es tamaño, no funciones**; lo que se paga por «más» es tamaño y memoria.

**Dos limitaciones de este borrador:** (1) no hay cobro en la v1: cambiar de plan sería un ajuste que hace Calvin por restaurante, como la maestra ya propuso para el piloto; (2) **los pilotos actuales** necesitarían un plan propio («piloto») para no encontrarse con topes.

### 7.3 Comensales (fuera de la v1: sin cuenta, sin Carta+)

La v1 **no tiene cuenta de comensal ni Carta+** (regla dura 10 y «Qué NO construir»). Lo que sigue describe sólo qué podría ser una capa de paga futura según lo que ya existe en los documentos y el prototipo, y qué costaría en infraestructura. **Todo marcado fuera de la v1.**

| Beneficio del prototipo (`comensal-onboarding.jsx`, P18c) | ¿Existe en los documentos? | Qué costaría en infraestructura |
|---|---|---|
| IA personalizada | `Carta_Ideacion_v3` y modelo de negocio la mencionan como idea | Una llamada a Claude por consulta: 3,000 tokens de entrada y 500 de salida con Haiku 5.5 ≈ **0.0006 USD**; 20 consultas al mes ≈ 0.01 USD **[estimada]**. Con Opus sería 40 veces más |
| Realidad aumentada / 3D | ADR-011 la descarta en la v1; el modelo de negocio calcula ≈ 10.5 pesos por platillo en la nube (Meshy) **[documento]** | No es de comensal: lo paga el restaurante al generar. **Fuera de la v1** |
| Reservaciones prioritarias | no está en el plan | Requiere del lado del restaurante un calendario y cuentas; sin estimar |
| Eventos exclusivos, Carta Charity | no están en el plan | Operación humana, no infraestructura |
| Historial de platillos y estrellas (P22) | el plan lo excluye: «cuenta, perfil o historial del comensal» | Requiere cuenta: Firebase Auth gratis hasta 50,000 usuarios activos al mes **[fuente externa: firebase.google.com/pricing, 13 nov]**; datos personales ⇒ **cambiar la regla dura 10** y un aviso de privacidad |

**Lo que cuesta cobrar:** 29 pesos al mes con Stripe (3.6 % + 3 pesos) dejan ≈ 25.0 − 4.0 = **21 pesos** netos por suscriptor al mes, sin IVA (la comisión se come ≈ 14 %); los demás procesadores citados en el modelo de negocio rondan igual **[documento]**. Para 1,000 suscriptores, la IA cuesta ≈ 10 USD al mes y la infraestructura de cuentas, casi cero; **el costo de esa capa es de cuentas, privacidad y soporte, no de servidor**. Su nombre en el prototipo («Carta+») y el precio dependen de decidir antes el modelo de cuentas.

---

## 8. Preguntas para Calvin

Cada una trae mi recomendación en primer lugar.

1. **Cuando un restaurante gratuito llegue a un tope (por ejemplo, 10 mesas), ¿se bloquea lo nuevo o sólo se avisa?** *Recomendado: bloquear sólo lo nuevo (crear la mesa 11, subir el PDF 3) con un mensaje claro; nunca cortar una mesa en servicio.*
2. **¿Qué topes lleva el gratuito?** *Recomendado: 10 mesas, 6 por mesa, 60 platillos, 3 personas, 2 lecturas de PDF al mes y 10 páginas por PDF.* Los dos últimos son los que ahorran dinero.
3. **¿Cuánto historial se guarda en gratuito?** *Recomendado: 30 días (12 meses en paga).* Sin esto la base crece sin parar.
4. **¿Cuánto cuesta el plan de paga?** *Recomendado: 349 pesos al mes antes de IVA*, con prueba de 30 días como en el prototipo; los pilotos actuales quedan en un plan «piloto» sin topes.
5. **¿Anuncios en el plan gratuito, como pone el prototipo?** *Recomendado: no.* Rinden 27–88 pesos al mes por restaurante y la v1 no tiene dónde ponerlos.
6. **¿Aprobamos medir cuántos teléfonos quedan con la pantalla encendida en cada fase (un evento de visibilidad en la analítica)?** *Recomendado: sí;* es el dato que decide cuánto se ahorra con el sondeo por fase y es barato.
7. **¿Aprobamos el sondeo adaptativo (que `02 §6` ya prometía y no está implementado) como tarea chica antes del primer restaurante real?** *Recomendado: sí.* Después, el sondeo por fase junto con la Fase 3.
8. **¿Subimos a 4 procesos de la API (`WORKERS=4`, con el conjunto de conexiones reducido) antes del primer restaurante real?** *Recomendado: sí si el piloto espera más de ≈ 5 restaurantes en el mismo horario;* cuesta ≈ 3 USD de memoria al mes. Es un cambio de variables en Railway, no de código.
9. **¿Ponemos ya un tope de importaciones de PDF al mes aunque aún no haya planes?** *Recomendado: sí, 5 al mes por restaurante para todos,* como defensa contra gasto accidental o abuso; es el riesgo de dinero más claro del informe.
10. **¿Cuántos días de gracia tiene un restaurante de paga al darse de baja, y se aplica a los de piloto?** *Recomendado: 30 días para paga y piloto, borrado inmediato en gratuito (como dijiste).*
11. **¿Dejamos todo lo de comensal (Carta+, perfil, historial) fuera hasta que decidamos si habrá cuenta de comensal?** *Recomendado: sí.* El prototipo mezcla realidad aumentada y pagos; hoy no caben.
12. **¿Abrimos la Spec 002 «Planes» ahora o después de la Fase 3?** *Recomendado: después del ciclo de la mesa (T-3.x), con los topes ya aprobados en la pregunta 2; las preguntas 7 y 9 pueden ir antes.*

---

## 9. Cómo entraría al plan

**Nada se construye aquí.** Si Calvin aprueba la dirección, el siguiente paso es `/especificar` → `docs/specs/002-planes/spec.md`, con estos temas:

- **Datos:** columna `plan` en `restaurante` (`piloto`, `gratuito`, `paga`) y una tabla o constantes con los límites de cada plan (para cambiarlos sin migración); contador de importaciones del mes; fecha de baja con plazo.
- **Reglas (criterios EARS):** al exceder mesas, personas, platillos o lecturas de PDF, el servicio responde 422 `limite_de_plan` con el límite y el uso (el patrón de `limite_de_mesas` y `limite_de_personal` ya existe); nunca corta una mesa en servicio; los pilotos no tienen topes.
- **Retención:** tarea periódica que borra eventos y sesiones cerradas más antiguos que la retención del plan, sin tocar comandas con estado no terminal (regla dura 8) ni lo que la Spec 001 declare como historial.
- **Pantalla «Mi plan»** en el panel: uso y límite de mesas, platillos, personal y PDFs del mes (el prototipo muestra «Tu plan» en Configuración, P13).
- **Cambios de documento:** ADR nuevo «Planes sin cobro en la v1» (qué se limita y por qué: §7.2); `01_Alcance` (menciona gratuito); `Spec 001` (la fila «6 en gratuitos cuando existan planes» pasa a ser un valor del plan); `04` (tareas nuevas y el orden respecto de T-3.x); `CLAUDE.md` no cambia si el cobro sigue fuera.
- **Antes de la spec, tareas chicas que no dependen de ella:** tope de importaciones al mes (pregunta 9), sondeo adaptativo (7), `WORKERS=4` (8) y la medición de visibilidad (6).
- **Fuera de la Spec 002:** cobro con tarjeta (v2, ADR de pagos), cuentas de comensal y Carta+ (otra spec cuando se decida el modelo de cuentas).

---

## Fuentes y marcas (leídas el 13 de noviembre de 2026, salvo donde se dice)

- **Repositorio:** `docs/plan/perf/2026-11-13-modelo-de-capacidad.md`; `docs/plan/06_Hosting.md`; `docs/plan/02_Arquitectura_v1.md` §6, §10; `docs/mvp/adr/ADR-004` y `ADR-014`; `docs/research/2026-09-19-{competencia-real-mexico,huecos-abiertos,modelo-de-negocio-y-pagos}.md`; `docs/plan/04_Fases_y_Tareas.md` (respuestas de Calvin del 12 de noviembre, §11); `docs/specs/001-ciclo-de-la-mesa/spec.md`; `prototipo/js/*.jsx` (§7.1).
- **Medidas aquí:** `procesar_foto` sobre 19 fotos sintéticas del repositorio, 9 imágenes de documentación y una imagen sintética de ruido; tabla `platillo` inflada a 10,022 filas en una transacción; menú público de la API local; `generar_pdf` con 8, 20, 60 y 150 mesas. Resultado: el guion `2026-11-13-planes-y-costo-por-restaurante-modelo.py` repite todos los cálculos de las tablas.
- **Precios:** Railway (docs.railway.com/reference/pricing/plans), Anthropic (platform.claude.com/docs/en/about-claude/pricing y .../pdf-support), Cloudflare R2 (developers.cloudflare.com/r2/pricing), reglas de tasa de Cloudflare (developers.cloudflare.com/waf/rate-limiting-rules), Firebase (firebase.google.com/pricing), tipo de cambio FIX 18.6188 del 12 nov (banxico.org.mx).
- **Competidores:** last.app/mx/precios, pricing.olaclick.app, menutiger.com/es/pricing, neolo.com/mexico/menu-qr. Fudo: la página no abre. Last.app muestra una inconsistencia entre «sin comisiones» y una tabla con 7 % + 6 pesos por venta: confirmar con ventas antes de citar.
- **Notificaciones push en iPhone:** webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados (iOS 16.4+, sólo web apps agregadas a la pantalla de inicio, permiso por gesto). Declarative Web Push (iOS 18.4) y el costo de proveedores (OneSignal Free hasta 10,000 suscriptores; Growth desde 19 USD/mes) **no se verificaron en la página completa**; el costo por mensaje de Web Push con VAPID no se encontró (los servicios de Apple y de los navegadores no cobran por mensaje según lo habitual, **[estimada]**).
- **Mercado:** las fuentes de §1.1 y las 12 cartas de §1.2.
- **Límites de esta investigación:** los conteos de platillos marcados (WF) los hizo una herramienta de lectura (±5 %); las cifras de CPU y de capacidad son de un contenedor local y se confirman o corrigen con la T-4.4 en Railway; no hay estadística pública de platillos, mesas ni comensales por día, así que los perfiles de §1.3 son juicio y deben validarse con dos o tres restaurantes del piloto.
