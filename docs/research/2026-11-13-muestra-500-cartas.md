# Muestra de 500 cartas de México: etapa 0 (términos de Google, reparto y marco)

**Fecha:** 13 de noviembre de 2026 · **Rama:** `agente/muestra-500-cartas` · **Estado:** etapas 0 y 1 hechas; el marco corrió; **en espera de que la maestra decida seguir con la lectura de cartas** (etapas 2–3 pendientes). No cambia código, contrato ni planes.
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

**Sonda (una solicitud gastada de 90) [medida aquí]:** `POST places:searchText`, `pageSize` 1, máscara `places.id` → **429** `RESOURCE_EXHAUSTED`, `RATE_LIMIT_EXCEEDED`, métrica `SearchTextRequest`, límite «SearchTextRequest per minute per user», `quota_limit_value` **«0»**. Calvin aún no subía esa cuota; la maestra avisó después y el marco corrió (sección 6).

## 3. Reparto de los 500

**Lo que se pidió:** pesar por el consumo de ir a restaurantes = gasto fuera del hogar de la entidad × número de hogares, contrastado con los establecimientos de la rama 7225; las tres zonas metropolitanas grandes primero; mínimo 15 por ciudad; máximo 25 % de N para una.

**Camino con fuente (a petición de la maestra): gasto fuera del hogar por persona de la entidad × población de la zona metropolitana.** Es aritmética mía sobre dos cifras oficiales:

- Gasto fuera del hogar por hogar y personas por hogar de la entidad: ENIGH 2024 de INEGI (tabla de [`…estadistica-de-cartas-y-personal.md` §8](2026-11-13-estadistica-de-cartas-y-personal.md); por hogar ÷ personas por hogar) [documento].
- Población de la zona metropolitana: Censo de Población y Vivienda 2020 tal como la publica «Metrópolis de México 2020» (SEDATU, CONAPO, INEGI), cuadro de población por metrópoli, <https://www.gob.mx/cms/uploads/sedatu/MM2020_06022024.pdf> (descargada el 13 de noviembre de 2026) [fuente externa].
- Regla: reparto proporcional al peso, mínimo 15 por ciudad y máximo 25 % de 500 (125), iterado hasta que se cumpla [medida aquí].

Lo que **no** se consiguió: número de hogares por entidad (no hizo falta con este camino) y establecimientos 7225 por zona metropolitana (dato #9: la API de Data México no respondió y la del DENUE pide clave; sólo hay entidad: Estado de México 89,408, CDMX 55,753, Jalisco 48,957, DENUE de mayo de 2026, <https://www.economia.gob.mx/datamexico/es/profile/industry/restaurants-and-other-eating-places>). **El contraste con la rama 7225 queda pendiente.**

Sustituciones que son supuesto: la zona del Valle de México usa el gasto de la **entidad Ciudad de México** (la zona incluye Estado de México e Hidalgo, de menor gasto: sobrestima); Toluca usa el del Estado de México; Puebla-Tlaxcala, el de Puebla; Cancún, el de Quintana Roo; Hermosillo, el de Sonora; Chihuahua, Mérida, Tijuana, León, Querétaro y Oaxaca, el de su entidad. **Aguascalientes, Morelia y Veracruz no tienen cifra de entidad en §8: se les puso el promedio nacional (2,249 ÷ 3.37 = 667 pesos por persona al trimestre) [supuesto].**

| Ciudad (zona) | Población 2020 | Gasto por persona (pesos al trimestre) | Peso | Plazas |
|---|---|---|---|---|
| Valle de México | 21,436,911 | 2,612 (CDMX) | 60.6 % | **125** (tope de 25 %) |
| Guadalajara | 5,110,617 | 1,611 (Jalisco) | 8.9 % | **76** |
| Monterrey | 5,322,117 | 1,160 (Nuevo León) | 6.7 % | **57** |
| Tijuana | 2,049,413 | 1,827 (Baja California) | 4.0 % | **35** |
| Toluca | 2,353,924 | 1,264 (Edomex) | 3.2 % | **27** |
| Querétaro | 1,530,820 | 1,812 | 3.0 % | 15 (mínimo) |
| Puebla-Tlaxcala | 2,776,893 | 880 | 2.6 % | 15 (mínimo) |
| León | 1,935,928 | 811 (Guanajuato) | 1.7 % | 15 (mínimo) |
| Mérida | 1,324,771 | 1,158 (Yucatán) | 1.7 % | 15 (mínimo) |
| Cancún | 934,189 | 1,418 (Quintana Roo) | 1.4 % | 15 (mínimo) |
| Chihuahua | 988,065 | 1,088 | 1.2 % | 15 (mínimo) |
| San Luis Potosí | 1,243,980 | 901 | 1.2 % | 15 (mínimo) |
| Hermosillo | 936,263 | 1,104 (Sonora) | 1.1 % | 15 (mínimo) |
| Aguascalientes | 1,140,916 | 667 (nacional, supuesto) | 0.8 % | 15 (mínimo) |
| Morelia | 988,704 | 667 (nacional, supuesto) | 0.7 % | 15 (mínimo) |
| Oaxaca | 744,912 | 628 | 0.5 % | 15 (mínimo) |
| Veracruz | 882,011 | 667 (nacional, supuesto) | 0.6 % | 15 (mínimo) |
| **Total** | | | 100 % | **500** |

**Cambio frente al primer supuesto (el que usó el marco):** Tijuana sube de 18 a 35 y Toluca de 15 a 27; Puebla baja de 23 a 15, Querétaro de 22 a 15, León y Mérida de 18 a 15, Cancún de 16 a 15, y Monterrey de 65 a 57. **El marco ya corrió con el reparto anterior** (82 solicitudes, otras 8 disponibles hoy): le faltan candidatos a Tijuana (33 para 35 plazas) y a Toluca (28 para 27), y sobran en Puebla y Querétaro. Por eso la estadística se reporta **ponderada con esta tabla y sin ponderar**; si Tijuana y Toluca no llegan a su plaza, se dice cuántas faltaron y se pide otro día de cuota. Los pesos de la tabla (60.6 % para el Valle de México) están topados por la regla de 25 %: sin el tope, esa zona llevaría 300 de 500; el tope es decisión de Calvin del encargo.

## 4. Guion del marco (resumen)

- `POST https://places.googleapis.com/v1/places:searchText`, `X-Goog-Api-Key: dummy` (el proxy del entorno pone la llave real; el guion nunca la lee), máscara `places.id,places.displayName,places.primaryType,places.types,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.websiteUri,places.businessStatus,nextPageToken` (hasta Enterprise; sin Atmosphere, Details, Photos ni Nearby), `languageCode` `es`, `regionCode` `MX`, `pageSize` 20, hasta 3 páginas.
- 27 consultas: Ciudad de México × 5 tipos (restaurantes, taquería, fonda o cocina económica, cafetería, mariscos); Guadalajara y Monterrey × 4 tipos; las otras 14 ciudades × «restaurantes en …». **Cobertura esperada [supuesto]:** hasta 60 por consulta, 300 en Ciudad de México antes de quitar repetidos, contra 125 plazas × 1.8 de holgura; la holgura de 1.8 sale de los ≈ 1.7 intentos por negocio contable de la primera pasada **[documento]**, que se midió con fichas de reparto y no con sitios propios. Es la parte más incierta: si el marco no alcanza se reporta cuántas solicitudes más hacen falta otro día.
- Espera de 3.2 s entre solicitudes; un 429 detiene todo sin reintento; el contador se persiste antes de cada envío.
- Reglas de selección, todas en memoria: fuera cerrados; fuera «muy caro»; «caro» se conserva y se reporta aparte; una fila por marca por ciudad y marca de cadena si la marca aparece más de una vez; orden por número de reseñas y los de más reseñas hasta cubrir la plaza con holgura. Dedupe de marca es una heurística por nombre (corta en «-», «(» y «sucursal»); su error se reporta en la etapa 3.
- Prueba en seco (`--seco`): respuesta de ejemplo con negocios ficticios; comprueba paginación, máscara, filtros y dedupe. Pasa.

## 5. Datos por conseguir (actualización de la lista de §9 del informe anterior)

| # | Qué falta | Cómo conseguirlo |
|---|---|---|
| 9 (se mantiene; ya no bloquea el reparto, que usa población y gasto) | Establecimientos 7225 por zona metropolitana | DENUE interactivo (<https://www.inegi.org.mx/app/mapa/denue/>) o descarga masiva (<https://www.inegi.org.mx/app/descarga/?ti=6>) filtrando 7225 por municipio; la actualización del DENUE sale el 25 de noviembre de 2026 |
| 11 (nuevo) | Gasto fuera del hogar de Aguascalientes, Morelia (Michoacán) y Veracruz | Presentaciones por entidad de la ENIGH 2024 (mismo nombre de archivo con el sufijo de la entidad; no se encontró el de Michoacán, Veracruz ni Aguascalientes); mientras tanto, promedio nacional |
| 12 (nuevo) | Si guardar `estrato` y `cadena` derivados de campos de Google es aceptable | Calvin o revisión legal (sección 1, punto 2) |
| 13 (nuevo) | Cuota de Google para `SearchTextRequest` (hoy 0 por minuto por usuario) | Calvin la sube en la consola de Google Cloud; la maestra avisa |

---

## 6. Etapa 1: el marco corrió [medida aquí]

- **Solicitudes de Google gastadas: 82 de 90** (1 sonda con 429 + 81 de las 27 consultas; contador del guion). Más 1 de la maestra el mismo día: 83 de las 100 diarias. Nivel cobrado: Text Search Enterprise, dentro de las 1,000 gratis al mes: **0 USD** (suponiendo que no se usaron otras antes este mes; la consola de facturación de Calvin lo confirma).
- **Candidatos tras quitar cerrados, «muy caro» y marcas repetidas en la misma ciudad: 914** para 500 plazas (1.83 por plaza). De ellos **673 (74 %) traen sitio web propio** en la ficha (donde se podrá buscar la carta), **45 son de una marca que aparece más de una vez** (cadenas) y **66 son de nivel «caro»** (estrato aparte).
- Por ciudad (candidatos / plazas): CDMX y Edomex 226/125 · Guadalajara 136/75 · Monterrey 118/65 · Puebla 42/23 · Querétaro 40/22 · León 33/18 · Mérida 33/18 · Tijuana 33/18 · Cancún 29/16 · las otras 8 ciudades 28/15 cada una. La holgura es pareja (≈ 1.8) y no hay forma de saber de antemano si alcanza: depende de cuántos tengan carta legible.
- Cada consulta devolvió las 60 posibles (excepto Guadalajara y Monterrey en «fonda», 44 y 43): el límite de Google de 60 por consulta fue el tope, no la oferta de negocios.
- En el repositorio queda sólo [`…-muestra-500-marco-ids.csv`](2026-11-13-muestra-500-marco-ids.csv): `place_id` y ciudad de los 914 (lo único guardable). Nombre, reseñas, sitio web y nivel de precio **no se guardaron**; la lista de trabajo vive en la sesión (pregunta 12 abierta, sección 1).
- **Riesgo de la regla «sólo en memoria»:** la salida con nombres y sitios quedó en esta sesión; si se reinicia antes de leer las cartas, se pierde y rehacer el marco costaría otras 81 solicitudes (el tope diario deja 17 hoy).

---

*Etapas 2 y 3 (lectura de cartas, estadística e informe completo) se agregan cuando la maestra autorice la primera tanda.*
