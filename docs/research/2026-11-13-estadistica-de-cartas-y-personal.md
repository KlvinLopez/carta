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
