# Cuántos platillos, cuentas de personal y mesas tiene un negocio en México: muestra y topes de plan

**Fecha:** 13 de noviembre de 2026 · **Rama:** `agente/estadistica-de-cartas-y-personal` · **Estado:** investigación; no cambia código, contrato ni planes (salvo una fila en `04 §11`).
**Datos:** [`…-datos.csv`](2026-11-13-estadistica-de-cartas-y-personal-datos.csv) (148 filas) · **Guion:** [`…-estadistica.py`](2026-11-13-estadistica-de-cartas-y-personal-estadistica.py) (`python3` sin dependencias, semilla fija: recalcula todo).

Marcas: **[medida aquí]** (conteo propio de esta sesión), **[fuente externa]** (enlace; leída el 13 de noviembre de 2026), **[documento]** (otro documento del repositorio) y **[estimada]** (con su supuesto).

---

## 0. Para Calvin (una página)

**Qué se hizo.** Se leyó la carta pública de **148 negocios en 16 capitales** (CDMX, Monterrey, Chihuahua, Hermosillo, Guadalajara, Colima, Querétaro, San Luis Potosí, Guanajuato, Puebla, Oaxaca, Mérida, Villahermosa, Campeche, La Paz y Chetumal: norte, occidente, bajío, centro, sur, sureste y costa), de 5 tipos: fonda/taquería 43, cafetería 32, casual 50, bar/cantina 14, formal 9 **[medida aquí]**.

**Platillos (comida + bebidas; en Carta una bebida también es un platillo)** — la muestra tiene n = 148:

- **El 76 % de los negocios tiene hasta 60 platillos (entre 70 % y 81 %)**; hasta 40, el 47 % (41–54 %); hasta 80, el 89 % (85–93 %); hasta 100, el 96 % (93–99 %); hasta 150, el 98 % (96–99 %) **[medida aquí]**.
- Típico: **mediana 44** (39–47), **media 51**, **moda 30–39**; mínimo 12, máximo 387 (un bar-restaurante con 341 bebidas).
- **«Con 90 % de confianza un negocio tiene hasta N platillos»: N ≈ 82** (percentil 90; con su propio margen: entre 75 y 90). El percentil 95 es ≈ 93 (84–130). Sólo comida (sin bebidas): p90 = 61 (53–69).
- Ponderando por una mezcla «de mesa» supuesta (la mitad fondas y taquerías), el p90 baja a ≈ 79 y el 82 % cabe en 60 **[estimada]**.

**Personal y mesas** (no hay estadística de platillos, mesas ni meseros: es un modelo con supuestos, margen ancho — §4):

- Casi 96 de cada 100 negocios de la rama son microempresas de hasta 10 personas **[fuente externa]**; en los restaurantes de servicio completo la media es ≈ 9 personas **[estimada]**.
- **3 cuentas de personal** (mesero o capitán) bastan para ≈ **64 %** de los restaurantes de servicio completo (rango 46–76 %); **20 cuentas** cubren ≈ **99 %** (97–100 %) **[estimada]**.
- **10 mesas** caben a ≈ **61 %** (29–84 %); **40 mesas**, a ≈ **97 %** (88–100 %) **[estimada]**.

**Topes recomendados** (cobertura = parte de los negocios que quedaría dentro del tope):

| | Gratuito | De paga |
|---|---|---|
| Platillos | **80** → ≈ 89 % (85–93) | **300** → ≈ 99 % (el tope técnico es 1,000) |
| Cuentas de personal | **3** → ≈ 64 % (46–76) | **20** → ≈ 99 % |
| Mesas | **10** → ≈ 61 % (29–84) | **40** → ≈ 97 % (88–100) |

Con el 60 de platillos que tiene el borrador del gratuito, **1 de cada 4 negocios (24 %) lo rebasaría desde el primer día**: ahí el tope no «separa a quien paga», estorba a quien apenas prueba el producto. Con 80 sólo lo rebasa 1 de cada 9.

**¿El número de platillos separa gratuito de paga?** **No bien.** Casi todos los tipos se traslapan (medianas de 34 a 51 platillos entre fondas, cafeterías, casuales y bares); por encima de 80 quedan sobre todo algunos casuales, cafeterías y formales, y son pocos. El tamaño que separa mejor es el **operativo**: mesas y personal (donde un negocio de 40 mesas y 10 meseros sí necesita más). **Recomendación:** que el platillo sea un tope amplio de seguridad (80 gratuito / 300 paga) y que lo que ordene el plan sean **mesas y cuentas de personal**, más historial y lecturas de PDF (lo que de verdad cuesta, informe de planes §7.2). Revisa la proporción cuando haya datos del piloto.

**Qué tan confiable es.** Bastante para el orden de magnitud de los platillos (no para el 5 % de arriba); poco para personal y mesas. Limitaciones, en llano:
1. **147 de 148 cartas son de reparto (Rappi)**, no de salón; el conteo lo resumió la herramienta de lectura (±5 %). Las cartas de reparto son subconjuntos: **probablemente subestiman** a los restaurantes formales de salón (las dos de salón que hay —Contramar, 58; Azul Condesa, 46 de comida y 341 de bebidas— están arriba de la mediana). No logré un solo par reparto/salón.
2. No es una muestra al azar: sesga a ciudad y cadenas (n por ciudad 5–16).
3. Faltan formales (9) y bares (14): sus percentiles son poco fiables.
4. La estadística oficial no da platillos, ni mesas, ni meseros por clase; el personal usa una distribución del DENUE sin corte por clase.

**Cómo mejorarlo (de más a menos valor):** (a) **datos del piloto**: platillos, mesas y cuentas de los primeros 10–20 restaurantes reales (la importación ya cuenta platillos; lo demás se lee de la base); (b) **microdatos de INEGI** (Censos Económicos 2024, estratos por clase SCIAN 722511/722412) para el personal; (c) la **interfaz oficial de lugares de Google** si Calvin la quiere pagar: no da platillos, pero sí el universo de negocios para muestrear al azar; (d) 30–40 cartas de salón en PDF visitando los locales.

**Decisión que te toca:** ¿topes 80 platillos / 3 cuentas / 10 mesas en gratuito y 300 / 20 / 40 en paga, con mesas y personal como lo que de verdad separa? ¿Y cambiar el 60 del borrador por 80?

---

## 1. Por qué no se sacó de Google Maps

Tres afirmaciones, comprobadas en las páginas oficiales de Google el 13 de noviembre de 2026:

| Afirmación | Veredicto | Evidencia |
|---|---|---|
| La carta no está como datos | **Confirmada en parte.** El recurso `Place` (Places API New) tiene booleanos (`servesBreakfast`, `servesCocktails`, `servesVegetarianFood`…), `menuForChildren` y hasta 10 fotos; **no vi ningún campo con lista de platillos ni precios**. No existe `menuUri` en lo leído (matiz a lo que se afirmaba). La ausencia sale de leer la referencia, no de una declaración de Google | [referencia del recurso Place](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places) |
| La interfaz oficial no devuelve platillos y pide llave de pago | **Confirmada en parte.** No devuelve platillos (ídem). Exige llave o token y un proyecto de Google Cloud con facturación; hay uso gratis por SKU (no un crédito único): Essentials 10,000, Pro 5,000, Enterprise 1,000 llamadas al mes | [configuración](https://developers.google.com/maps/documentation/places/web-service/cloud-setup) · [precios](https://developers.google.com/maps/billing-and-pricing/pricing) |
| Los términos no permiten extraer la carta de forma automática | **Confirmada** (excepto el `place_id`, que se puede guardar sin límite). Cita: «Don't export, extract, or scrape Google Maps Content for use outside the Services» y no hacer «pre-fetch, index, store, or redistribute». **No pude leer el texto literal de la cláusula del contrato principal** (la página no se cargó); la cita sale de las políticas de la API | [políticas de Places](https://developers.google.com/maps/documentation/places/web-service/policies) · [`place_id` exento](https://developers.google.com/maps/documentation/javascript/policies) |

En dos líneas: Google Maps muestra la carta como fotos o enlaces, su interfaz oficial no devuelve platillos y pide llave de pago, y sus condiciones no permiten extraerla de forma automática; por eso la muestra se leyó **página por página** en sitios públicos.

## 2. Método y sesgos de la muestra

- **Fuentes:** páginas públicas de carta que la herramienta de lectura abrió con normalidad, de una en una. Se dejaron sin reintento los sitios que respondieron 403 (carta.menu), 402 (pos.do), 429 o 503 (OpenTable y otros) o que no tenían carta contable. El detalle de los descartes quedó en el trabajo de los lectores (≈ 110 sitios); aquí sólo van conteos y la URL de cada fila. Ningún dato personal; no se copió contenido de las cartas.
- **Qué se cuenta:** renglones con nombre y precio, sin tamaños, extras ni repetidos entre secciones; comida y bebidas por separado. `total` = comida + bebidas.
- **Quién contó:** **los 148 conteos los hizo la herramienta de lectura (±5 %)**; ninguno es de lectura propia. Con n grande el error de ±5 % por carta es pequeño frente al margen de muestreo, pero hay errores sistemáticos que no se promedian (repetidos entre secciones, combos, secciones omitidas); varias filas lo traen en `notas`.
- **Marco:** capitales (16 de 32). **Reparto de las 148:** CDMX 13, Chetumal 16, Monterrey 12, Hermosillo 11, Guanajuato 10, Villahermosa 10, Campeche 9, Chihuahua 9, Guadalajara 9, Querétaro 9, La Paz 8, Puebla 8, Oaxaca 7, San Luis Potosí 7, Colima 5 y Mérida 5. Se pedían unos 10–12 por ciudad y 120–200 en total: **se superó el mínimo (120)**, pero Colima y Mérida quedaron en 5.
- **Sesgos, dichos en claro:**
  1. **Reparto en vez de salón** (147 de 148). En Rappi la carta es un subconjunto (sin platos de temporada ni cartas de vinos) y con combos; puede subestimar a los formales y sobrestimar con renglones repetidos.
  2. **Plataformas de reparto** inclinan a ciudad y cadenas (Vips, Chili's, Italianni's, Tim Hortons…); los sitios propios, a lo formal. Aquí domina lo primero.
  3. **Fotos y descripciones**: las imágenes de Rappi llegan como marcadores; **la columna de fotos queda en «desconocido» (147 de 148)**: no se puede decir nada sobre fotos por platillo. Descripción: 130 de 148 tienen alguna, 16 sin verificar.
  4. **Tipo asignado por criterio** en varias filas (cada nota lo dice): p. ej. alitas con cerveza como bar, mariscos familiares como formal.
  5. **Comparación reparto contra salón: 0 pares.** Sólo se dispone de la comparación con las cartas de salón del informe de planes **[documento]**: Contramar, 58 platillos; Los Gallos (hotel), ≈ 70–80. Ambas están arriba de la mediana de reparto (44), consistente con el sesgo 1 pero no una medida.

## 3. Estadística de los platillos

n, media, mediana, moda (intervalos de 10), desviación, mínimo, máximo y percentiles con **intervalo de confianza de 90 % por remuestreo (5,000)**; lo calcula el guion **[medida aquí]**.

### 3.1 Con bebidas (total)

| Grupo | n | Media | Mediana | Moda | Desv. | Mín–máx | p75 | p90 | p95 |
|---|---|---|---|---|---|---|---|---|---|
| **Todos** | 148 | 50.5 | 43.5 (38.5–46.5) | 30–39 | 38.9 | 12–387 | 58.5 (55.5–64.0) | **82.3 (75.3–89.9)** | 93.3 (84.0–130.0) |
| Fonda/taquería | 43 | 35.1 | 34.0 (28–39) | 10–19 | 16.3 | 12–94 | 44.0 (39.5–50) | 57.0 (45.8–58) | 58.0 (55.9–90.6) |
| Cafetería | 32 | 50.6 | 40.5 (33–61.5) | 30–39 | 24.7 | 16–97 | 77.0 (53.2–84) | 84.0 (80–90) | 89.5 (82.9–97) |
| Casual | 50 | 55.2 | 48.5 (43.5–55.5) | 50–59 | 31.9 | 17–182 | 62.0 (57.2–73) | 87.5 (65.9–130) | 128.6 (83–159.5) |
| Bar/cantina | 14 | 49.8 | 51.0 (33–60) | 50–59 | 17.8 | 25–80 | 61.0 (51.5–76.2) | 75.7 (58–80) | 79.3 (63.1–80) |
| Formal | 9 | 98.7 | 46.0 (44–75) | 40–49 | 108.2 | 26–387 | 75.0 (46–387) | 203 (68.6–387) | 295 (71.8–387) |

Los intervalos de bar y formal son de poca fiabilidad (n = 14 y 9); en formal manda un solo caso (387). Entre paréntesis, IC de 90 %.

### 3.2 Sólo comida (sin bebidas)

| Grupo | n | Media | Mediana | Moda | Desv. | Mín–máx | p90 (IC90) |
|---|---|---|---|---|---|---|---|
| **Todos** | 148 | 35.5 | 31.0 (27.5–34.5) | 20–29 | 22.2 | 0–135 | **61.0 (53.3–68.5)** |
| Fonda/taquería | 43 | 30.2 | 31.0 | 30–39 | 15.0 | 7–85 | 46.8 (40.8–49) |
| Cafetería | 32 | 25.6 | 24.0 | 20–29 | 16.0 | 0–63 | 52.0 (34–59) |
| Casual | 50 | 43.7 | 37.0 | 20–29 | 25.7 | 13–125 | 74.1 (61.1–111) |
| Bar/cantina | 14 | 31.7 | 31.0 | 20–29 | 10.3 | 18–48 | 46.4 (37.9–48) |
| Formal | 9 | 55.8 | 45.0 | 40–49 | 31.4 | 26–135 | 84.6 (50.2–135) |

### 3.3 Curva de cobertura (todos, con bebidas)

| Hasta N platillos | 30 | 40 | 60 | 80 | 100 | 150 | 200 | 300 |
|---|---|---|---|---|---|---|---|---|
| % de negocios | 25.7 | 47.3 | **75.7** | **89.2** | 95.9 | 98.0 | 99.3 | 99.3 |
| IC de 90 % | 20.3–31.8 | 40.5–54.1 | 69.6–81.1 | 85.1–93.2 | 93.2–98.6 | 95.9–99.3 | 98.0–100 | 98.0–100 |

**Qué significa «con 90 % de confianza tiene hasta N».** Es el **percentil 90**: el número bajo el cual cae el 90 % de los negocios (aquí 82). Eso describe a *los negocios*, no a la muestra, y como la muestra es chica **el propio 82 lleva un margen** (75–90). Es distinto del intervalo de confianza de 90 %, que dice qué tan bien se conoce *una cifra* (la mediana, un porcentaje). Para topes de plan, usa el percentil y su extremo alto.

### 3.4 Ponderando por tipo de negocio

No hay una fuente que dé la mezcla de los cinco tipos de este informe: el DENUE cuenta por clase SCIAN, no por «casual» o «cafetería». Qué clases son el mercado de Carta (servicio en mesa): **722511 restaurantes de servicio completo (a la carta o comida corrida)**, **722512 de mariscos** (dato del informe de planes: 59,296 y 81,518 **[documento]**), fondas y taquerías con mesa (parte de 722513/722514, **122,757** unidades de «tacos y tortas», INEGI 2021 **[documento]**) y **bares y cantinas (722412)**; **quedan fuera** los puestos, la comida para llevar y la mayoría de las cafeterías de paso. Como no hay el conteo por clase, se probaron dos mezclas **[estimada]**:

| Mezcla | p50 | p90 (IC90) | p95 | Hasta 60 | Hasta 80 | Hasta 100 |
|---|---|---|---|---|---|---|
| Sin ponderar | 43.5 | 82.3 (75–90) | 93.3 | 75.7 % | 89.2 % | 95.9 % |
| A: pesos iguales por tipo | 46 | 84 (76–132) | 132 | 71.4 % | 88.5 % | 94.0 % |
| B: 50 % fonda, 20 % casual, 12 % café, 12 % bar, 6 % formal | 40 | 79 (64–83) | 90 | 82.2 % | 92.5 % | 97.1 % |

El p90 queda entre ≈ 79 y 84 en todas: **80 platillos** es un tope razonable aunque la mezcla real sea otra; lo que cambia es la cola de arriba.

## 4. Personal y mesas

### 4.1 Lo que hay publicado

| Dato | Valor | Marca |
|---|---|---|
| Unidades de la rama 7225 por estrato de personal (DENUE, mayo de 2026): 0–10 / 11–50 / 51–100 / 101 o más | **712,553 / 26,443 / 887 / 348** (total 740,231; el 96.3 % tiene hasta 10 personas) | [fuente externa] Data México: <https://www.economia.gob.mx/datamexico/es/profile/industry/restaurants-and-other-eating-places> (lectura vía herramienta; las cifras suman bien) |
| Censos Económicos 2019, rama 7225 por tamaño (unidades / personal): micro 560,805 / 1,447,924; pequeño 18,812 / 380,680; mediano 1,895 / 157,847; grande 18 / 11,299 (total 581,530 / 1,997,750) | de ahí: **2.6 personas por micro, 20.2 por pequeño, 83 por mediano** | [fuente externa] INEGI, ficha «Industria restaurantera» de los CE 2019 (`m_indrest_ce19.pdf` en `inegi.org.mx/contenidos/programas/ce/2019/doc/`; hay dos PDF de INEGI leídos y no pude ligar con certeza cuál es cuál) |
| Personal ocupado en «restaurantes con servicio de preparación de alimentos a la carta o de comida corrida» (722511) | **516,894** personas (CE 2024) | [fuente externa] INEGI, monografía nacional CE 2024 (`ce2024_mn00.pdf`) |
| Unidades 722511 | 59,296 (CE 2019) | [documento] `huecos-abiertos` |
| Meseros | ≈ 535 mil en 2016 (nota periodística, no verificada en la fuente; 1.0 % de los ocupados) | [fuente externa] Quadratin; **no se usa en los cálculos** |

**Lo que no hay:** cortes por estrato para 0–5, 6–10, 11–30, 31–50 en **ninguna clase**, ni por capital. Data México sólo da la rama 7225 completa en 4 estratos; los PDF de Observa Restaurantes dieron 503 y no se reintentaron. El DENUE interactivo y el cuadro por entidad de los CE 2024 pueden traerlos (pendiente §6). No encontré ninguna fuente de **mesas, aforo ni mesas por mesero** en México.

### 4.2 Supuestos del modelo

1. **Rama completa 7225** (incluye puestos y comida para llevar): cada estrato se reparte con una distribución geométrica truncada cuya media es la de los CE 2019 [estimada: la forma dentro del estrato es un supuesto].
2. **Servicio completo (722511):** media **8.7** = 516,894 ÷ 59,296 (mezcla de años), probada entre 7 y 10; dispersión (coeficiente de variación) 1.0–1.5, lognormal [estimada].
3. **Qué parte del personal atiende mesas** (mesero o capitán): 35 %–50 % [estimada; el resto es cocina, barra, caja y dueño]. Una «cuenta de personal» es una persona con PIN, no un turno.
4. **Mesas por cuenta de personal:** 2.5–4. Sale de los perfiles del informe de planes (10 mesas con 2–3 personas, 18 con 3–5, 40 con 8–12, 25 con 6–10: ≈ 3.5–4.5 mesas por persona del personal [documento]; el rango baja a 2.5 porque la cuenta incluye a quien no está en turno [estimada]).

### 4.3 Resultados (guion, función `personal_y_mesas`)

| Pregunta | Toda la rama 7225 (cota inferior de tamaño) | Servicio completo 722511 (rango sobre los supuestos; mediana de la rejilla) |
|---|---|---|
| ≤ 3 cuentas de personal | 91–95 % | **46–76 %** (64 %) |
| ≤ 20 cuentas | 99.7–99.9 % | **97–100 %** (99 %) |
| ≤ 10 mesas | — | **29–84 %** (61 %) |
| ≤ 40 mesas | — | **88–100 %** (97 %) |

Cómo se lee: **3 cuentas gratuitas dejan fuera a 1 de cada 3 restaurantes de servicio completo** y 10 mesas a 4 de cada 10 (con margen muy ancho), pero cubren a casi todos los negocios pequeños de la rama completa (que incluye puestos que no son el mercado de Carta). **El tope de 20 cuentas casi nunca estorba; el de 40 mesas casi tampoco**, y los dos se rebasan a la vez sólo por el 1–3 % más grande. El tope de **mesas se vuelve el límite que importa antes que el de cuentas** (40 mesas ≈ 10–16 personas de servicio).

## 5. Reglas del plan que esto toca (sin cambiarlas aquí)

- El borrador de planes (informe de planes §7.2) propone **60 platillos** en gratuito: cubre al 76 % (70–81). Con **80**: 89 % (85–93).
- Los topes de **3 cuentas / 10 mesas** del prototipo cubren a 60–65 % de los restaurantes de servicio completo; la otra tercera parte vería el tope el primer día. Es una decisión comercial (¿ese es el incentivo?), no técnica.
- **Fila en `04 §11`:** hecha; no cambia ninguna tarea.

## 6. Qué haría falta para mejorarlo

1. **Datos del piloto** (lo más valioso): platillos, mesas y cuentas reales de los 10–20 primeros restaurantes; cuesta cero.
2. **Microdatos de INEGI** (Censos Económicos 2024, estratos por clase 722511/722412) y el DENUE interactivo por capital. Eliminaría los supuestos 1–3 del §4.2.
3. **Más cartas de salón** (PDF o visita a los locales), 30–40 formales y casuales; es lo que corregiría el sesgo de reparto.
4. **Interfaz oficial de lugares de Google**, si Calvin la quiere pagar: da el universo de negocios y su tipo para muestrear al azar, **no** los platillos.
5. Medir un **par reparto/salón** en 10–15 negocios para estimar el factor de sesgo.

---

## 7. Primera pasada y cómo escalar a 500–1,000 negocios (adenda pedida por la maestra)

**Estado honesto.** Lo anterior es una **primera pasada**: 148 negocios, reparto de **conveniencia** (lo que cada lector pudo abrir), no proporcional, y **sin número de reseñas ni calificación** (no se recolectaron; las columnas `resenas`, `calificacion`, `asientos_o_mesas`, `horario` y `rango_precio` ya existen en el CSV y están **vacías: no se estimaron**). La foto por platillo está en «desconocido» en 147 de 148 filas.

### 7.1 Reparto proporcional de la muestra (regla y lo que se sabe)

Regla: `n_zona = N × U_zona / ΣU`, con U = establecimientos de la rama 7225 en la zona metropolitana (DENUE), un mínimo de 15 por ciudad y un máximo de 25 % de N para una sola. Alternativa: ponderar por el gasto fuera del hogar (§8). **No se puede escribir la tabla completa hoy**: sólo se consiguió el nivel entidad para tres entidades.

| Unidad | Establecimientos 7225 | Corte | Fuente |
|---|---|---|---|
| Nacional | 740,231 | DENUE, mayo de 2026 | [fuente externa] Data México <https://www.economia.gob.mx/datamexico/es/profile/industry/restaurants-and-other-eating-places> (lectura vía herramienta) |
| Estado de México | 89,408 | ídem | ídem |
| Ciudad de México | 55,753 | ídem | ídem |
| Jalisco | 48,957 | ídem | ídem |
| Todo lo demás (Monterrey, Puebla, Querétaro, Mérida, León, Tijuana…) | **dato por conseguir** | — | DENUE interactivo de INEGI con filtro 7225 por municipio (no se probó) |

Hay cifras distintas para la misma rama en otros resúmenes de búsqueda (p. ej. 736,367 en 2025; 772,442 en 2025): **no se usan** sin abrir la fuente. El comunicado del DENUE de mayo de 2026 (<https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/denue/DENUE2026_05.pdf>) sólo da el total de todos los sectores (6,138,075); **la próxima publicación del DENUE es el 25 de noviembre de 2026** [fuente externa].

**Lo que ya muestra la primera pasada frente a esa regla:** CDMX, Guadalajara y Monterrey suman 34 de 148 (23 %) — Chetumal (16) pesa más que Guadalajara (9). Con la regla, CDMX, Guadalajara/Zapopan y Monterrey y sus áreas metropolitanas llevarían el grueso. **Los percentiles de §3 no se reponderan por ciudad** (no hay pesos con fuente).

### 7.2 Protocolo para que 2 o 3 sesiones lleven la muestra a 500 sin pisarse

1. **Reparto por región, no por ciudad:** (A) CDMX y Edomex, (B) Guadalajara y occidente, (C) Monterrey y norte, (D) bajío y centro, (E) sur, sureste y costa. Cada sesión toma su región; el archivo de salida se nombra `region-X.csv` y se une al final con el guion (deduplica por ciudad + negocio + tipo de carta).
2. **Esquema del CSV** (20 columnas): `ciudad, negocio, tipo, tipo_carta, fuente, url, fecha, comida, bebidas, total, categorias, foto_por_platillo, descripcion, conteo, notas` más `resenas, calificacion, asientos_o_mesas, horario, rango_precio` (vacías si la página no las trae; nunca estimadas).
3. **Reglas de conteo:** renglones con nombre y precio; sin tamaños ni extras ni repetidos; comida y bebidas por separado; menú degustación = 1; combos fuera. Si se leyó el texto, `conteo=propio`; si lo resumió la herramienta, `herramienta` (±5 %).
4. **Fuentes que sí abren con normalidad (lo observado en la primera pasada):** fichas de Rappi y de Uber Eats (aunque a menudo devuelven sólo la portada), algunos PDF de carta en sitios propios. **Se negaron:** carta.menu (403), pos.do (402), OpenTable (503), PDF mayores de 10 MB; se dejan sin reintento.
5. **Dónde está el cuello de botella:** la primera pasada dejó 148 negocios contables y ≈ 110 descartes (≈ 43 % de los intentos), así que **un negocio contable cuesta ≈ 1.7 intentos**; para 500 se estiman unos 870 intentos y para 1,000, unos 1,740 [estimada: extrapola ese cociente; en las ciudades con menos reparto el descarte fue mayor].
6. **Reseñas y calificación:** ninguna ficha de Rappi las trajo en la lectura. Para ordenar por popularidad hace falta otra fuente (§7.3). Anotar el número de reseñas y su fuente con la URL.
7. **Cartas de salón:** ver la carta en el sitio propio (PDF) o la carta física: es lo que corrige el sesgo de reparto.

### 7.3 Interfaz oficial de lugares de Google para armar el marco de muestreo

Lo que da y cuesta, de las páginas oficiales de Google (lectura del 13 de nov de 2026; el ayudante no pudo leer las Condiciones Específicas del Servicio, la página llegó truncada dos veces):

| Qué | Dato | Fuente |
|---|---|---|
| Campos por nivel (Text Search y Nearby Search) | **Essentials:** id. **Pro:** nombre, dirección, tipos, ubicación, estado. **Enterprise:** `rating`, `userRatingCount`, `priceLevel`/`priceRange`, horario, sitio web. **Enterprise + Atmosphere:** `dineIn`, `delivery`, `servesBeer`/`servesCocktails`… | <https://developers.google.com/maps/documentation/places/web-service/text-search> · <https://developers.google.com/maps/documentation/places/web-service/nearby-search> |
| Orden y filtros | **No ordena por número de reseñas.** Text Search: `RELEVANCE` o `DISTANCE`, `minRating` (calificación, no conteo). Nearby: `POPULARITY` (la popularidad según Google, no el conteo). El conteo se filtra en el cliente | ídem |
| Tope por consulta | Text Search: 20 por página, **60 en total**. Nearby: 20 | ídem |
| Precio (USD por 1,000 solicitudes) | Text Search Enterprise **35.00** (0–100 mil), 1,000 gratis al mes; Pro 32.00 (5,000 gratis); Enterprise + Atmosphere 40.00 | <https://developers.google.com/maps/billing-and-pricing/pricing> |
| Guardar resultados | `place_id` sí, sin límite; coordenadas hasta 30 días; **no se encontró permiso de guardar `rating` ni `userRatingCount`** (queda bajo la regla general «sólo lo expresamente permitido») | <https://developers.google.com/maps/documentation/places/web-service/policies> |

**Consultas necesarias [estimada]** (supuesto de traslape: 50 % de resultados únicos, o 30 % en el caso pesimista; cada página de 20 cuenta como una solicitud): para **500 negocios** ≈ 50–84 solicitudes (≈ 1.75–2.92 USD brutos, **0 USD con el uso gratis mensual**); para **1,000**, ≈ 100–167 (3.50–5.83 USD brutos, 0 con lo gratis). **El costo es despreciable; el límite es de cobertura** (60 por consulta, hay que dividir la ciudad en celdas y repetir por tipo) y de **términos** (no se puede conservar el conteo de reseñas). Esto aplica al **marco**, no a los platillos: la carta sigue leyéndose en páginas públicas. **Decisión de Calvin:** pagar la llave resuelve el universo y el muestreo al azar; **no** resuelve los platillos ni el almacenamiento del conteo. Recomiendo revisión legal antes de guardar reseñas.

## 8. Lado de la demanda: cuánto se come fuera de casa

**Gasto fuera del hogar, ENIGH 2024** (INEGI; promedio trimestral por hogar, gasto corriente monetario, pesos de 2024). Fuente nacional: <https://www.inegi.org.mx/contenidos/programas/enigh/nc/2024/doc/enigh2024_ns_presentacion_resultados_tab.pdf>; por entidad: el mismo nombre con `_cdmx`, `_jal`, `_nl`… en lugar de `_tab` (el sufijo `tab` es el **nacional**, no Tabasco, y no se encontró el de Tabasco). Las cifras nacionales (2,249 fuera del hogar; 15,614 en alimentos, bebidas y tabaco; hogar de 3.37) las verifiqué yo en el PDF; **las de entidad las leyó un ayudante con `pdftotext` y no tienen doble revisión**. Las columnas de proporción las calculé yo dividiendo cifras de INEGI [estimada: es aritmética mía, no dato publicado].

| Entidad | Fuera del hogar | Alimentos, bebidas y tabaco | Gasto monetario total | Fuera ÷ alimentos | Fuera ÷ gasto total | Personas por hogar |
|---|---|---|---|---|---|---|
| **Nacional** | **2,249** (1,628 en 2022: +38.1 %) | 15,614 | 39,508 | 14.4 % | 5.7 % | 3.37 |
| CDMX | 7,915 | 24,389 | 66,383 | 32.5 % | 11.9 % | 3.03 |
| Jalisco | 5,267 | 21,442 | 56,015 | 24.6 % | 9.4 % | 3.27 |
| Nuevo León | 3,828 | 20,556 | 59,192 | 18.6 % | 6.5 % | 3.30 |
| Querétaro | 6,051 | 21,446 | 61,593 | 28.2 % | 9.8 % | 3.34 |
| Puebla | 3,088 | 15,542 | 41,720 | 19.9 % | 7.4 % | 3.51 |
| Yucatán | 3,845 | 18,874 | 51,255 | 20.4 % | 7.5 % | 3.32 |
| Guanajuato | 2,870 | 17,126 | 45,570 | 16.8 % | 6.3 % | 3.54 |
| Baja California | 5,790 | 19,444 | 55,269 | 29.8 % | 10.5 % | 3.17 |
| Sonora | 3,556 | 16,530 | 51,336 | 21.5 % | 6.9 % | 3.22 |
| Chihuahua | 3,460 | 15,461 | 46,881 | 22.4 % | 7.4 % | 3.18 |
| San Luis Potosí | 3,035 | 15,711 | 47,045 | 19.3 % | 6.5 % | 3.37 |
| Campeche | 2,831 | 16,620 | 41,574 | 17.0 % | 6.8 % | 3.44 |
| Baja California Sur | 4,412 | 18,559 | 55,939 | 23.8 % | 7.9 % | 3.14 |
| Quintana Roo | 4,567 | 20,067 | 53,667 | 22.8 % | 8.5 % | 3.22 |
| Colima | 5,491 | 19,275 | 52,016 | 28.5 % | 10.6 % | 2.97 |
| Oaxaca | 2,212 | 13,791 | 34,107 | 16.0 % | 6.5 % | 3.52 |
| Estado de México | 4,398 | 21,158 | 49,595 | 20.8 % | 8.9 % | 3.48 |

**Lectura:** el hogar mexicano gasta **14 % de su gasto en alimentos fuera de casa** (5.7 % del gasto total); **CDMX gasta 3.5 veces el promedio nacional** (7,915 contra 2,249) y destina un tercio de su gasto en alimentos a comer fuera; Querétaro, Colima y Baja California rondan 28–30 %; Oaxaca, Guanajuato y Campeche, 16–17 %. Las notas de prensa citan otra cifra (3,896 pesos trimestrales; Milenio y el análisis del IMCO): **no se pudo reconciliar** con los 2,249 de INEGI (puede ser otro concepto) y no se usa. La ENIGH **no desglosa por ciudad** en estos tabulados (sólo entidad); Hermosillo, Villahermosa y Chetumal quedan con la cifra de su entidad (Tabasco: sin dato).

**Frecuencia de comer fuera: no hay cifra oficial en veces al mes** (la ENIGH mide gasto, no frecuencia). Lo más citable es una encuesta en línea de la UVM (700 internautas, junio–julio de 2017, **sin representatividad nacional**; <https://opinionpublica.uvm.mx/sites/default/files/presentaciones/15.%20BoomGastronomico_0.pdf>, leída del PDF): una o dos veces al mes 27 %, una vez por semana 27 %, dos o tres veces por semana 25 %, cada tres meses 6 %, todos los días 4 %, no acostumbra ir 5 %. Otras cifras (40 % «al menos una o dos veces por semana», 53 % «come fuera») sólo se vieron como extractos de búsqueda, sin fecha ni muestra: **no se usan**.

**Tamaño del grupo en mesa: no se encontró estudio.** Sólo el tamaño del hogar (tabla). OpenTable reporta que las reservas de 6 o más crecieron 15 % en 2025, sin promedio (extracto de búsqueda, no verificado).

## 9. Datos por conseguir (lo que en este informe es estimación sin fuente)

Regla de Calvin: toda cifra lleva fuente. Estas piezas del informe **no la tienen**; se listan aquí con la forma de conseguirla.

| # | Qué falta | Dónde se usa | Cómo conseguirlo | Quién |
|---|---|---|---|---|
| 1 | Conteo de platillos de cartas de **salón** y su diferencia con el reparto | §3, sesgo 1 | Leer 30–40 cartas en PDF o en el local; 10–15 pares reparto/salón | sesión recolectora o Calvin en visita |
| 2 | **Número de reseñas y calificación** por negocio | §7 | Fichas públicas que lo muestren, o la interfaz de Google (con la salvedad de términos) | recolectoras / Calvin decide la llave |
| 3 | **Mezcla real** de tipos de negocio (fonda, casual, café, bar, formal) | §3.4 (mezclas A y B son supuestos) | DENUE por clase SCIAN 722511/722512/722513/722514/722412 por zona metropolitana | recolectora con el DENUE interactivo |
| 4 | **Personal por estrato dentro de la clase 722511** y por capital (0–5, 6–10, 11–30…) | §4 | DENUE interactivo (filtro por clase y estrato) o microdatos de los Censos Económicos 2024 | recolectora / INEGI |
| 5 | **Qué parte del personal atiende mesas** (35–50 % es supuesto) | §4.2 | Encuesta a 10–20 restaurantes del piloto, o ocupaciones de la ENOE (meseros contra el total de la rama) | piloto / recolectora |
| 6 | **Mesas por cuenta de personal** (2.5–4: sale de perfiles propios, no de estadística) | §4.2 | Pedir mesas y personal a los restaurantes del piloto (la base ya los guarda) | piloto |
| 7 | **Media y dispersión del personal de 722511** (8.7 mezcla CE 2024 con CE 2019) | §4.2 | Mismo cuadro de INEGI de personal y unidades del mismo año (CE 2024) | recolectora |
| 8 | **Frecuencia de comer fuera** (veces al mes) y **tamaño de grupo** | §8 | Encuesta propia o estudio de CANIRAC/Observa Restaurantes (los PDF dieron 503; reintentar más tarde) | recolectora / Calvin |
| 9 | **Establecimientos 7225 por zona metropolitana** | §7.1 | DENUE interactivo (la actualización sale el 25 de noviembre de 2026) | recolectora |
| 10 | **Foto por platillo** | §2 | Visitar la carta en el sitio propio; Rappi no la muestra en la lectura | recolectoras |

Los topes recomendados del §0 son por eso una **primera pasada con margen ancho**: la parte de platillos descansa en la muestra (147 de reparto), y la de personal y mesas en los supuestos 4–7 de esta tabla.
