# Muestra de 500 cartas de México: etapa 0 (términos de Google, reparto y marco)

**Fecha:** 13 de noviembre de 2026 · **Rama:** `agente/muestra-500-cartas` · **Estado:** etapa 0 hecha; **en espera de la cuota de Google** (etapas 1–3 pendientes). No cambia código, contrato ni planes.
**Guion del marco:** [`…-muestra-500-marco.py`](2026-11-13-muestra-500-marco.py) (sólo biblioteca estándar; prueba en seco con `--seco`).

Marcas: **[medida aquí]**, **[fuente externa]** (enlace; leída el 13 de noviembre de 2026), **[documento]** (otro documento del repositorio) y **[supuesto]** (juicio; entra en «datos por conseguir»).

---

## 1. Términos de Google: qué se puede guardar

Leídos el 13 de noviembre de 2026. Las «Condiciones Específicas del Servicio» (que la pasada anterior no pudo leer) sí cargaron con una descarga directa de la página.

| Documento | Cita textual (inglés) | Enlace |
|---|---|---|
| Condiciones Específicas, §3 (última modificación **28 de octubre de 2026**) | «Customer may cache the Google ID values from the Services that return such field and allow caching [...] For example, Customer may cache (a) place_id from Places API [...]» | <https://cloud.google.com/maps-platform/terms/maps-service-terms> |
| Condiciones Específicas, §14.3 «Caching» (Places API Legacy y New) | «Customer may temporarily cache latitude and longitude values from the Places API for up to 30 consecutive calendar days, after which Customer must delete the cached latitude and longitude values.» | ídem |
| Condiciones Específicas, §14.2 | «Customer must not use Google Maps Content from the Places API in conjunction with a non-Google map.» | ídem |
| Condiciones de Maps Platform, §3.2.3 (última modificación **26 de agosto de 2026**) | «Customer will not export, extract, or otherwise scrape Google Maps Content for use outside the Services. For example, Customer will not: (i) pre-fetch, index, store, reshare, or rehost Google Maps Content outside the services; (ii) bulk download [...] places information [...]; (iii) copy and save business names, addresses, or user reviews [...]» | <https://cloud.google.com/maps-platform/terms> |
| Políticas de Places API | «Cache or store Google Maps Content only as expressly permitted under the Google Maps Platform Service Specific Terms»; «Don't create content based on Google Maps Content.»; `place_id`: «You can therefore store place ID values indefinitely.» | <https://developers.google.com/maps/documentation/places/web-service/policies> |
| Guía de `place_id` | «Google recommends refreshing place IDs if they are more than 12 months old.» | <https://developers.google.com/maps/documentation/places/web-service/place-id> |

**Qué sale de ahí:**

| Dato de Google | ¿Se guarda en el repositorio? | Por qué |
|---|---|---|
| `place_id` | **Sí**, sin límite | Exento expresamente (§3 y políticas) |
| Coordenadas | No se piden ni se guardan | Permitido hasta 30 días; no hacen falta |
| Nombre, dirección | **No** | §3.2.3(iii) «copy and save business names, addresses» |
| Calificación, número de reseñas, nivel de precio, sitio web, tipo | **No** | No hay permiso expreso para guardarlos; regla por defecto (políticas): sólo lo expresamente permitido |

**Uso en memoria.** Los términos prohíben «pre-fetch, index, store» fuera del servicio y la descarga masiva de información de lugares. Ordenar en memoria las respuestas de ≤ 90 solicitudes para elegir candidatos y descartarlas al terminar la ejecución **no es guardarlas**, pero la frontera no está dicha en los términos: es una **lectura mía, no una confirmación de Google ni una opinión legal**. Dos consecuencias que decide Calvin:

1. El guion no escribe a disco nada de Google salvo `place_id,ciudad`; la lista de candidatos con nombre y sitio web sale sólo por la salida de la sesión. Eso obliga a que la lectura de cartas (etapa 2) parta de esa salida en la misma sesión; si la sesión se corta, hay que repetir el marco (otras 81 solicitudes, otro día).
2. **Derivados.** Las columnas `estrato` («caro» sale del nivel de precio de Google) y la elección «los de más reseñas» son contenido derivado («Don't create content based on Google Maps Content»). Propuesta: en el CSV público el nombre del negocio y su URL salen de la fuente propia del negocio (su sitio o su ficha de reparto), el `place_id` sirve para unir, y `estrato`/`cadena` se anotan sólo si se pueden juzgar desde esa fuente propia. **Pregunta para Calvin o revisión legal antes de la etapa 3.** Si no se aprueba, el estrato «caro» se reporta sin columna.

Ningún paso del encargo queda prohibido de forma expresa, por eso **no cierro BLOQUEADA**; sí queda la salvedad de arriba.

## 2. Costo y cuota de Google

| Concepto | Dato | Fuente |
|---|---|---|
| Nivel que cobra la máscara de campos del guion (`rating`, `userRatingCount`, `priceLevel` y `websiteUri` disparan Enterprise; el resto es Pro o Essentials) | **Text Search Enterprise** (SKU E967-44BC-B44D), cobrado «al mayor nivel de los campos pedidos» | <https://developers.google.com/maps/billing-and-pricing/sku-details/places.md.txt> y <https://developers.google.com/maps/documentation/places/web-service/text-search> (leídas el 13 de noviembre de 2026) |
| Uso gratis mensual / precio | **1,000 llamadas gratis al mes**; **35.00 USD por 1,000** de la 1,001 a la 100,000 | <https://developers.google.com/maps/billing-and-pricing/pricing> (la página no muestra fecha de actualización; leída el 13 de noviembre de 2026) |
| Sonda (`places.id`) | Text Search Essentials IDs Only, sin límite gratis y sin precio en la tabla | ídem |
| ¿Cada página cuenta como solicitud? | El evento facturable es «Successful request»; cada página con `pageToken` es otra solicitud HTTP. **Supuesto conservador: cada página cuenta** (el guion también la cuenta) | SKU-details [fuente externa] + [supuesto] |

**Presupuesto del guion:** tope duro 90 (contador persistente en `~/.carta-marco/contador.json`, fuera del repositorio; antes de enviar cada solicitud se cuenta, y se niega a pasar de 90). Plan de consultas: **27 consultas × 3 páginas = 81 solicitudes + 1 sonda = 82** (8 de holgura). Si todas se cobran como Enterprise: 81 ÷ 1,000 × 35 = **2.84 USD brutos, 0 USD** dentro de las 1,000 gratis al mes **[medida aquí: aritmética sobre el precio de la tabla]**.

**Sonda (una solicitud gastada de 90) [medida aquí]:** `POST places:searchText`, `pageSize` 1, máscara `places.id` → **429** `RESOURCE_EXHAUSTED`, `RATE_LIMIT_EXCEEDED`, métrica `SearchTextRequest`, límite «SearchTextRequest per minute per user», `quota_limit_value` **«0»**. Calvin aún no sube esa cuota: **espero el aviso de la maestra**.

## 3. Reparto de los 500

**Lo que se pidió:** pesar por el consumo de ir a restaurantes = gasto fuera del hogar de la entidad × número de hogares, contrastado con los establecimientos de la rama 7225; las tres zonas metropolitanas grandes primero; mínimo 15 por ciudad; máximo 25 % de N para una.

**Lo que se consiguió hoy:**

| Pieza | Estado |
|---|---|
| Gasto fuera del hogar por hogar, ENIGH 2024, 18 entidades | **Hecho**, tabla en [`2026-11-13-estadistica-de-cartas-y-personal.md` §8](2026-11-13-estadistica-de-cartas-y-personal.md) [documento] |
| **Número de hogares por entidad** | **No encontrado.** Ni la presentación nacional ni las 4 por entidad leídas lo traen (<https://www.inegi.org.mx/contenidos/programas/enigh/nc/2024/doc/enigh2024_ns_presentacion_resultados.pdf>); la página del programa carga con JavaScript y los tabulados no se pudieron abrir. Dato por conseguir #11 |
| Establecimientos 7225 por zona metropolitana | **No encontrado.** Data México sólo da entidad (Estado de México 89,408; CDMX 55,753; Jalisco 48,957; DENUE de mayo de 2026) <https://www.economia.gob.mx/datamexico/es/profile/industry/restaurants-and-other-eating-places>; su API no respondió (60 s, dos intentos) y la API del DENUE pide clave («No autorizado. Utilice una clave válida.»). Dato por conseguir #9 |

Sin hogares por entidad no se puede escribir la regla del encargo con fuente en cada celda. **El reparto de abajo es, por lo tanto, un supuesto** que sigue la instrucción de Calvin del 13 de noviembre (más peso a Ciudad de México, Guadalajara y Monterrey, y luego capitales y ciudades de mayor consumo). Los dos órdenes de magnitud que sí tienen fuente apoyan el sentido: Ciudad de México gasta 7,915 pesos por hogar al trimestre fuera de casa, 3.5 veces los 2,249 nacionales; el Estado de México, Ciudad de México y Jalisco suman 194,118 de los 740,231 establecimientos 7225 (26.2 %) [documento + fuente externa; suma mía].

| Ciudad (zona) | Plazas | Gasto fuera del hogar, pesos por hogar al trimestre (ENIGH 2024) | Fuente de la plaza |
|---|---|---|---|
| CDMX y Estado de México (zona metropolitana del Valle de México) | 125 (25 %, el máximo) | 7,915 CDMX · 4,398 Edomex | [supuesto]: tope de 25 % |
| Guadalajara y Zapopan | 75 | 5,267 (Jalisco) | [supuesto] |
| Monterrey y San Pedro | 65 | 3,828 (Nuevo León) | [supuesto] |
| Puebla | 23 | 3,088 | [supuesto] |
| Querétaro | 22 | 6,051 | [supuesto] |
| León | 18 | 2,870 (Guanajuato) | [supuesto] |
| Mérida | 18 | 3,845 (Yucatán) | [supuesto] |
| Tijuana | 18 | 5,790 (Baja California) | [supuesto] |
| Cancún | 16 | 4,567 (Quintana Roo) | [supuesto] |
| Chihuahua, Hermosillo, San Luis Potosí, Toluca, Aguascalientes, Morelia, Veracruz, Oaxaca | 15 cada una (120) | 3,460 · 3,556 · 3,035 · 4,398 · sin dato · sin dato · sin dato · 2,212 | mínimo de la regla |
| **Total** | **500** | | suma comprobada en el guion |

Aguascalientes, Morelia y Veracruz no están en la tabla de §8 (sin dato de gasto): quedan en el mínimo de 15 por la regla, no por su consumo. Cuando aparezcan los hogares y el DENUE por zona (#9, #11), se recalcula la columna «Plazas» con la fórmula del encargo y se reporta cuánto cambia.

## 4. Guion del marco (resumen)

- `POST https://places.googleapis.com/v1/places:searchText`, `X-Goog-Api-Key: dummy` (el proxy del entorno pone la llave real; el guion nunca la lee), máscara `places.id,places.displayName,places.primaryType,places.types,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.websiteUri,places.businessStatus,nextPageToken` (hasta Enterprise; sin Atmosphere, Details, Photos ni Nearby), `languageCode` `es`, `regionCode` `MX`, `pageSize` 20, hasta 3 páginas.
- 27 consultas: Ciudad de México × 5 tipos (restaurantes, taquería, fonda o cocina económica, cafetería, mariscos); Guadalajara y Monterrey × 4 tipos; las otras 14 ciudades × «restaurantes en …». **Cobertura esperada [supuesto]:** hasta 60 por consulta, 300 en Ciudad de México antes de quitar repetidos, contra 125 plazas × 1.8 de holgura; la holgura de 1.8 sale de los ≈ 1.7 intentos por negocio contable de la primera pasada **[documento]**, que se midió con fichas de reparto y no con sitios propios. Es la parte más incierta: si el marco no alcanza se reporta cuántas solicitudes más hacen falta otro día.
- Espera de 3.2 s entre solicitudes; un 429 detiene todo sin reintento; el contador se persiste antes de cada envío.
- Reglas de selección, todas en memoria: fuera cerrados; fuera «muy caro»; «caro» se conserva y se reporta aparte; una fila por marca por ciudad y marca de cadena si la marca aparece más de una vez; orden por número de reseñas y los de más reseñas hasta cubrir la plaza con holgura. Dedupe de marca es una heurística por nombre (corta en «-», «(» y «sucursal»); su error se reporta en la etapa 3.
- Prueba en seco (`--seco`): respuesta de ejemplo con negocios ficticios; comprueba paginación, máscara, filtros y dedupe. Pasa.

## 5. Datos por conseguir (actualización de la lista de §9 del informe anterior)

| # | Qué falta | Cómo conseguirlo |
|---|---|---|
| 9 (se mantiene) | Establecimientos 7225 por zona metropolitana | DENUE interactivo (<https://www.inegi.org.mx/app/mapa/denue/>) o descarga masiva (<https://www.inegi.org.mx/app/descarga/?ti=6>) filtrando 7225 por municipio; la actualización del DENUE sale el 25 de noviembre de 2026 |
| 11 (nuevo) | Número de hogares por entidad (ENIGH 2024) | Tabulados o microdatos de la ENIGH 2024 en <https://www.inegi.org.mx/programas/enigh/nc/2024/>; respaldo: hogares del Censo de Población y Vivienda 2020 por entidad |
| 12 (nuevo) | Si guardar `estrato` y `cadena` derivados de campos de Google es aceptable | Calvin o revisión legal (sección 1, punto 2) |
| 13 (nuevo) | Cuota de Google para `SearchTextRequest` (hoy 0 por minuto por usuario) | Calvin la sube en la consola de Google Cloud; la maestra avisa |

---

*Etapas 1 a 3 (marco, cartas, estadística e informe completo) se agregan a este documento cuando la cuota esté lista.*
