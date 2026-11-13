# El mercado de Carta: cuántos negocios hay, a quién servimos primero y qué existe ya

**Fecha:** 13 de noviembre de 2026 · **Rama:** `agente/mercado-y-planos-v3` · **Estado:** análisis de investigación; no cambia código, contrato ni plan (sólo una fila en `04 §11`). La v1 sigue cerrada: lo de §4 son candidatas para después.

**Marcas de cada cifra:** **[medida aquí]** la calculé yo sobre el archivo oficial · **[documento]** la dice un documento del repositorio (se nombra) · **[fuente externa]** página leída (enlace y fecha de lectura): las que cito como «leída por un ayudante» (F5 a F7 del CSV) las leyó un ayudante `haiku`, y la lente de fuentes de la maestra las comprobó el 13 de noviembre (todas las cifras externas coincidieron); el resto las leí yo · **[supuesto]** juicio mío, con la forma de comprobarlo en §6. Aritmética mía: lo digo. Lo que sólo vi en un resultado de buscador y **no abrí** no se usa como dato: se anota como «sin leer».

**Archivos:** guion [`…-mercado-de-carta-modelo.py`](2026-11-13-mercado-de-carta-modelo.py) (reproduce todo desde el DENUE), tablas agregadas [`…-mercado-de-carta-tablas.json`](2026-11-13-mercado-de-carta-tablas.json) (sólo conteos: sin nombres, razones sociales, direcciones, teléfonos ni correos) y [`…-mercado-de-carta-fuentes.csv`](2026-11-13-mercado-de-carta-fuentes.csv).

**Fuente del universo:** INEGI, DENUE 05_2026 (publicada el 20 de mayo de 2026; descarga masiva del sector 72, <https://www.inegi.org.mx/contenidos/masiva/denue/denue_00_72_1_csv.zip> y `…_2_csv.zip`, leídas el 13 de noviembre de 2026). Los cálculos y agrupaciones son nuestros y no representan una postura del INEGI. **Aviso que encontré hoy:** INEGI corrigió 13 registros de la edición 05/2026 (29 de mayo y 1 de julio de 2026) en nombre y razón social; «no modificó […] el universo de cobertura, ni los demás registros» (nota técnica, <https://www.inegi.org.mx/app/mapa/denue/nota.pdf>, leída el 13 de noviembre de 2026). Los conteos de aquí no cambian por eso.

---

## 0. Para Calvin (una página)

**Lo que dijiste, comprobado con el archivo.**

| Tu frase | Lo que dice el DENUE | Veredicto |
|---|---|---|
| «741 mil establecimientos» | **741,499** en la rama 7225 (preparación de alimentos y bebidas) **[medida aquí]** | Exacto |
| «restaurantes a la carta o comida corrida, ≈ 10 %» | clase 722511: **72,521 = 9.8 %** de los 741,499 **[medida aquí]** | Exacto |
| «bares y cantinas, ≈ 5 % más» | rama 7224: **32,361 = 4.4 %** de 741,499 (o 4.2 % de 773,860) **[medida aquí]** | Casi: es 4.4 %, no 5 % |
| «el 88 % son negocios de 5 personas» | **88.7 %** (657,347) **[medida aquí]** | Exacto |
| «sólo el 0.8 % declara sitio web» | **0.8 %** (4,993 de 657,347) **[medida aquí]** | Exacto |

**Las tres palabras que pediste, en llano** (sus siglas en inglés, una sola vez):

- **Mercado total** *(TAM, total addressable market)*: todos los negocios que algún día podrían usar algo como Carta. Aquí: restaurantes y bares de México, **773,860** (ramas 7225 y 7224).
- **Mercado servible** *(SAM, serviceable available market)*: los que Carta puede atender **con el producto que tiene** y que **tú quieres**: el núcleo (restaurantes a la carta o de comida corrida, más bares y cantinas) **sin cadenas grandes**. Aquí: **≈ 100,000, entre 96,000 y 104,900** según cuántos de los nombres repetidos sean de verdad cadenas (el DENUE no las marca; ver §2.2).
- **Mercado ganable** *(SOM, serviceable obtainable market)*: los que Carta puede **conseguir de verdad** en un plazo. **No es un dato: es un escenario.** Con lo que mide la infraestructura y lo que cuesta llegar a cada dueño: **100 a 1,000 restaurantes activos a 12 meses [supuesto]** (0.1 % a 1 % del núcleo). A 24 meses el rango es 200 a 2,116, donde **2,116 es un tope de servidor sin medir** (lo que el servidor aguantaría, no lo que el mercado pediría).

**El embudo, con cifras:**

| Capa | Establecimientos | Criterio |
|---|---|---|
| Mercado total | **773,860** | ramas 7225 + 7224 |
| **Núcleo** (el tuyo) | **104,882** | clase 722511 + bares (722412) y centros nocturnos (722411) |
| **Servible** | **≈ 100,000** (96,021 a 104,855) | núcleo de hasta 250 personas, restando entre 0 y 8,834 «posibles cadenas» según el umbral (casi ninguna lo es: §2.2) |
| Primera ola geográfica | 40,872 | núcleo dentro de las 17 zonas metropolitanas (Puebla, subestimada) |
| **Ganable a 12 meses** | **100 a 1,000** | escenario **[supuesto]**; a 24 meses 200 a 2,116, con 2,116 = tope de servidor sin medir (§2.4) |
| Expansión (fondas chicas, mariscos, tacos, cafeterías) | 438,848 | 722512 + 722513 + 722514 + 722515; **no** se promete |

**Lo que más importa de estas cifras.**

1. **El 94 % del núcleo (98,712 de 104,882) no declara sitio web en el DENUE.** Ojo: el DENUE **no ve Facebook, Instagram ni WhatsApp**, así que no es lo mismo que «no tiene presencia en línea» (§6 #3). Para esos negocios, Carta no les quita un cliente: **sería su primer sitio propio.** Los 6,170 que sí la tienen son los únicos que la herramienta de lectura puede alcanzar (§5).
2. **La parte que paga es más chica y más digital.** Los de 11 personas o más son **13,834** (13 %); 3,733 (27 %) declaran sitio web. Con el plan Servicio a 349 pesos, si **todos** esos pagaran sería un techo de **≈ 58 millones de pesos al año**; con el 1 % o el 3 % que usamos en el informe, el escenario de 1,000 restaurantes activos deja **3,490 a 10,470 pesos al mes**. **Dicho claro:** el negocio de Carta no se decide por el tamaño del mercado (sobra) sino por **cuántos dueños aceptan probar y cuántos pagan**, que nadie ha medido.
3. **El problema está documentado con fuentes oficiales**, pero **«cuántos restaurantes quieren esto» y «cuánto pagarían» no tienen fuente abierta**. Van a «datos por conseguir» (§6).
4. **Posible hueco, sin comprobar:** pedir **en grupo** desde la mesa. **No encontramos en México quien lo ofrezca** (revisión del 19 de septiembre de 2026, **sin releer competidor por competidor**). Dos matices que no se pueden pasar por alto: (a) en septiembre apareció, en un buscador, un fragmento de una página de OlaClick ya borrada que hablaba de una «mesa virtual» donde todos añaden productos; no hay copia, no está en su ayuda ni en sus planes y **no se hizo la prueba con dos teléfonos** (`2026-09-20-olaclick-a-fondo.md` §4.1); hoy sus páginas de preguntas frecuentes y de punto de venta (leídas por un ayudante el 13 de noviembre) **tampoco la mencionan**; (b) el `robots.txt` de Uber Eats lista `*/group-orders/` (pedido en grupo, de **reparto**; `muestra-500-cartas.md` §9). Hasta hacer la prueba (§6 #14 y #15), «nadie lo hace» no se puede afirmar.

**Qué te toca decidir:** (a) si «ganable» se reporta como el rango de §2.4 o con una sola cifra; (b) si la expansión a fondas y puestos entra al discurso o sólo al mapa; (c) cuáles de las candidatas de §4 piden spec primero.

---

## 1. El problema, con fuentes

**La historia en una frase:** la pandemia obligó a muchos restaurantes a poner un código QR; casi todos pusieron **el mismo PDF de siempre**, y pedir al mesero, juntar la orden de la mesa y tener presencia en línea quedaron como estaban.

### 1.1 Lo que sí se puede probar (fuentes oficiales o primarias)

| # | Hecho | Cifra | Fuente |
|---|---|---|---|
| H1 | **El comensal ya está listo:** usuarios de internet en México | **100.2 millones = 83.1 %** de la población de 6 años y más (2024); **97.2 %** de ellos se conecta con **celular inteligente**; **90.6 %** de los usuarios de smartphone usó mensajería y **77.9 %** redes sociales | INEGI, ENDUTIH 2024, reporte de resultados 9/25 (6 de mayo de 2025), <https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/endutih/ENDUTIH_24_RR.pdf> **[fuente externa]**, leído el 13 de noviembre de 2026 (texto extraído con `pdftotext`; ver líneas «En 2024, la ENDUTIH estimó 100.2 millones…», «97.2 %», «90.6 %») |
| H2 | **El comensal compra por internet** | **35.8 %** reportó compras por internet; **33.0 %** de ellos compró **alimentos y bebidas** (2024) | misma ENDUTIH 2024 |
| H3 | **El negocio chico casi no está en línea (visión general)** | De **5,468,180** unidades económicas censadas (2023): **26.4 %** usó internet para sus actividades, **25.4 %** equipo de cómputo o tableta; sólo **5.6 %** vendió por internet y las **micro (0 a 10 personas) 4.4 %** (ventas por internet de las pymes 28.7 % y de las grandes 33.0 %). Todas las actividades, no sólo restaurantes | INEGI, Censos Económicos 2024, reporte de resultados 22/25 (24 de julio de 2025), <https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/ce/CE2024_def_RR.pdf> **[fuente externa]**, leído el 13 de noviembre de 2026 (INEGI marca algunas cifras como «corregidas»; es la versión vigente) |
| H4 | **El negocio chico de comida casi no declara sitio web** | **0.8 %** de los 657,347 establecimientos de hasta 5 personas (rama 7225); **7.7 %** en la clase de restaurantes a la carta o comida corrida; 4.2 % en cafeterías; 0.4 % a 0.7 % en tacos, antojitos y comida para llevar | DENUE 05_2026 **[medida aquí]** (§2.1) |
| H5 | **Los restaurantes a la carta emplean a mucha gente** | **516,894 personas** (1.8 % del personal ocupado del país), la 2.ª actividad más grande tras las tiendas de abarrotes | CE 2024, mismo reporte |
| H6 | **La pandemia cerró negocios** | La Canirac estimó que la crisis «acabó con el 20 % de los restaurantes y negocios de comida» (≈ 120,000 pymes del ramo) | Expansión, 7 de septiembre de 2021, <https://expansion.mx/empresas/2021/09/07/pandemia-acelero-digitalizacion-pequenos-negocios> **[fuente externa]**, leído el 13 de noviembre de 2026. La nota habla de «migrar a menús digitales» pero **no da un porcentaje de digitalización** |

**Lectura (mía):** H1 + H2 dicen que **el cliente tiene el teléfono y compra por internet**; H3 + H4 dicen que **el negocio no tiene presencia en línea**. Esa brecha entre un comensal conectado y un negocio que no lo está **es el espacio de Carta**. H3 mide **todas** las actividades económicas (no sólo restaurantes) y a «negocio de hasta 10 personas» (micro): no es una cifra de restaurantes; H4 sí lo es, pero mide **sitio web declarado**, no uso de redes sociales ni de WhatsApp, que es probablemente lo que usan (supuesto, §6 #3).

### 1.2 Lo que dicen las encuestas sobre el menú por QR (con cautelas)

Aquí la evidencia es **de Estados Unidos y de segunda mano**. No hay encuesta mexicana abierta que haya podido leer.

| Hecho | Cifra | Fuente y cautela |
|---|---|---|
| Se usa cada vez más… | **65 %** de los estadounidenses ha escaneado un menú QR (42 % en 2022), muestra de 1,083 adultos | Ipsos, vía la recopilación de Duck-Hub «QR Code Menu Statistics 2026» (publicada el 22 de julio de 2026, actualizada el 3 de octubre de 2026), <https://www.duck-hub.com/blog/qr-code-menu-statistics> **[fuente externa, de segunda mano]**, leída el 13 de noviembre de 2026. **No pude abrir la página de Ipsos** (<https://www.ipsos.com/en-us/qr-code-menus-are-growing-even-less-popular>: respondió sin contenido) |
| …pero gusta menos | De quienes lo usaron, **58 %** «quiere volver al papel» (51 % en 2023) y sólo **39 %** espera que el QR continúe (43 % en 2023) | Misma recopilación, tabla «Ipsos (July 2025)» **sin enlace en esa fila**. La propia recopilación advierte que el «88 % prefiere papel» (Technomic) **no tiene metodología pública** y que el «78 % disfruta el QR» es un error de denominador. **Trátese como hipótesis, no como dato** |
| Lo que dice el mercado mexicano | «sólo 10 % de los restaurantes han podido transformarse digitalmente»; «más de 600 mil restaurantes», «60 a 70 mil» en plataformas de reparto; Canirac: 650 mil restaurantes, **96 %** micro, pequeñas y medianas, **70 % informales** | DPL News, 22 de septiembre de 2023, <https://dplnews.com/solo-10-de-los-restaurantes-en-mexico-estan-digitalizados/> **[fuente externa]**, leído el 13 de noviembre de 2026. **El «10 %» es una declaración del director de Uber Eats México en un foro (Wired Summit 2023); la nota no cita estudio.** No lo uso como dato: sólo como la frase que circula |

**Lo que no pude conseguir:** el estudio de NielsenIQ (2022) sobre establecimientos de consumo *on premise* en México, que el buscador asociaba a «satisfacción con pedir por QR»: su página respondió **404** (<https://nielseniq.com/global/es/insights/report/2022/aumento-de-la-confianza-la-satisfaccion-y-el-personal-en-los-establecimientos-de-consumo-on-premise-de-mexico/>). No cito la cifra. Tampoco abrió el artículo de Restaurant Business sobre QR (403). Ninguna encuesta de Canirac sobre QR apareció en la búsqueda. Todo esto va a §6.

### 1.3 Los cuatro problemas, y qué respalda cada uno

| Problema (como lo planteaste) | Qué lo respalda | Qué falta |
|---|---|---|
| **P1. La carta en QR es un PDF** | La pandemia aceleró el QR (H6); el mercado de menús QR gratis es amplio (§3); el PDF sin precio ni alérgenos estructurados no se busca, no se filtra y no se actualiza | No hay estudio abierto de **qué fracción de los QR de México apunta a un PDF o a una foto**. Observación propia: de 148 cartas leídas para otro fin, 147 eran de reparto; no sirve para esto |
| **P2. Pedir sigue igual** | La comanda en papel sigue siendo la norma entre fondas y restaurantes chicos (hipótesis); los POS con comanda móvil cuestan 652 a 1,099 pesos al mes (§3) | No hay medición de **minutos por mesa** ni de **errores de comanda** en México (`estrategia-de-precios` §1.1: «supuesta») |
| **P3. La mesa no ordena junta** | **No encontramos en México quien ofrezca** que varios comensales armen **una** orden desde sus teléfonos; los demás dividen la cuenta al pagar (revisión de septiembre, `2026-09-19-competencia-real-mexico.md` §8, punto 2; **sin releer**). Hay un indicio sin comprobar de OlaClick (una «mesa virtual» en una página borrada, `2026-09-20-olaclick-a-fondo.md` §4.1) y Uber Eats tiene pedido en grupo de reparto (`robots.txt`) | Hay que comprobar que el comensal **quiere** eso: es el supuesto central del piloto |
| **P4. El negocio chico no tiene presencia en línea** | **H4 con el DENUE**: 94 % del núcleo sin sitio web declarado; **H3**: 4.4 % de las micro vende por internet | Redes sociales y WhatsApp **no están en el DENUE**: probablemente muchos sí tienen Facebook o WhatsApp. §6 #3 |

**Lectura honesta:** P4 es el único con dato oficial y es el más fuerte; P1 y P2 son **observaciones de campo** que el piloto debe comprobar; P3 es una **ventaja competitiva a validar**, no un dolor demostrado.

---

## 2. El mercado, de abajo hacia arriba, con el DENUE

### 2.1 Universo por clase y por estrato (rama 7225 y 7224, mayo de 2026) [medida aquí]

Lo ya publicado en [`muestra-500-cartas.md` §8.1](2026-11-13-muestra-500-cartas.md) no se repite entero; aquí sólo lo que arma el embudo. **Por clase:**

| Clase SCIAN | Establecimientos | Con sitio web | Papel en Carta |
|---|---|---|---|
| 722511 a la carta o comida corrida (**incluye fondas y cocinas económicas de comida corrida**) | 72,521 | 5,615 (7.7 %) | **Núcleo** |
| 722412 bares, cantinas y similares | 30,451 | 487 (1.6 %) | **Núcleo** |
| 722411 centros nocturnos, discotecas | 1,910 | 68 (3.6 %) | **Núcleo** |
| 722512 pescados y mariscos | 28,902 | 643 | Expansión |
| 722513 antojitos | 168,295 | 794 | Expansión |
| 722514 tacos y tortas | 147,589 | 978 | Expansión |
| 722515 cafeterías, neverías, refresquerías | 94,062 | 3,920 | Expansión |
| 722516 autoservicio | 16,605 | 3,338 | Fuera (cadenas) |
| 722517 pizzas, hamburguesas, pollos para llevar | 79,622 | 1,873 | Fuera (para llevar) |
| 722518 otros alimentos para llevar | 60,421 | 261 | Fuera |
| 722519 otros alimentos de consumo inmediato | 73,482 | 405 | Fuera |
| **7225 + 7224** | **773,860** | **18,382** | |

**Una aclaración que cambia el mapa:** el SCIAN mete la «comida corrida» en la clase 722511. Es decir, **la mayoría de las fondas con menú del día ya está en tu núcleo**; la «expansión a fondas» son las que el DENUE clasifica como antojitos, tacos o cocinas de otro tipo.

**El núcleo por estrato de personal** [medida aquí; `…-tablas.json`]:

| Estrato | Núcleo | % | Con sitio web | % con sitio |
|---|---|---|---|---|
| 0 a 5 personas | 73,193 | 69.8 % | 1,136 | 1.6 % |
| 6 a 10 | 17,855 | 17.0 % | 1,301 | 7.3 % |
| 11 a 30 | 10,809 | 10.3 % | 2,138 | 19.8 % |
| 31 a 50 | 2,263 | 2.2 % | 1,127 | 49.8 % |
| 51 a 100 | 542 | 0.5 % | 336 | 62.0 % |
| 101 a 250 | 193 | 0.2 % | 114 | 59.1 % |
| 251 o más | 27 | 0.03 % | 18 | 66.7 % |
| **Núcleo** | **104,882** | | **6,170 (5.9 %)** | |

**La expansión** (438,848): 91 % tiene hasta 5 personas (399,289) y sólo **6,335 (1.4 %)** declara sitio web. **Para llevar y autoservicio** (230,130): fuera.

### 2.2 Las cadenas: cómo las aproximé y cuánto me puedo equivocar

El DENUE no marca cadenas. **Método** (guion, función `normalizar` y `es_marca`): normalizo el nombre comercial (minúsculas, sin acentos ni signos, sin «sucursal…», sin número final), descarto los nombres hechos **sólo de palabras genéricas del giro** («taquería», «cocina económica», «sin nombre», «venta de…») y las franquicias de nutrición, y llamo «cadena posible» a un nombre que aparece en **al menos N establecimientos y en al menos 3 estados**. **Sólo conteos** (el crudo vive fuera del repositorio):

| Umbral N | Núcleo: nombres | Núcleo: establecimientos | % del núcleo | Todo 7225 + 7224: establecimientos |
|---|---|---|---|---|
| ≥ 5 | 919 | 8,834 | 8.4 % | 142,997 |
| **≥ 10** | **250** | **4,680** | **4.5 %** | 100,440 |
| ≥ 25 | 37 | 1,691 | 1.6 % | 56,852 |
| ≥ 50 | 10 | 863 | 0.8 % | 34,016 |

**El error del método, dicho claro:**

- **Sobrecuenta (el error grande):** un nombre repetido no es una cadena. «Fonda Lupita», «Restaurante La Cabaña», «Comida china» o «Micheladas» aparecen cientos de veces porque son **nombres comunes**, no marcas. Leí **en privado** los 70 nombres más repetidos del núcleo: a mi lectura **sólo unos 6 parecen cadenas** (el resto son nombres comunes) **[juicio mío, no comparado con una lista oficial de cadenas]**. Por eso las cifras de la tabla son **cotas superiores**; la cantidad real de cadenas **dentro del núcleo** es probablemente **del orden de 1 %** o menos (supuesto).
- **Subcuenta:** una cadena que escribe su nombre distinto en cada local («Marca Centro», «Marca Polanco») o con pocas sucursales (< N) no se detecta; una cadena regional de 8 locales tampoco con N = 10.
- **Por qué importa poco:** las cadenas grandes (hamburguesas, pizzas, cafeterías) están sobre todo **en clases que el núcleo no incluye** (722515, 722516, 722517). En el núcleo, el nombre más repetido tiene **205 establecimientos**; la tabla de todo 7225 + 7224 con N ≥ 50 (34,016) está llena de nombres comunes de tacos y antojitos y **no sirve como conteo de cadenas**.
- **Otra forma de decirlo sin nombres:** los establecimientos de **51 personas o más** en el núcleo son **762** (542 + 193 + 27 = 0.7 % del núcleo) [medida aquí]; son los más probables a ser grandes cadenas o salones de banquetes. Es un corte **medido**, sin el problema de los nombres.

**Decisión para el embudo:** no resto como «medida» las posibles cadenas, porque casi ninguna lo es. El servible es **≈ 100,000, entre 96,021 y 104,855** [medida + supuesto del método]: el extremo bajo supone que **todos** los 8,834 nombres repetidos ≥ 5 veces fueran cadenas; el alto, que **ninguno** lo fuera; mi lectura apunta al extremo alto. Ambos extremos parten del núcleo de **hasta 250 personas** (104,855; quedan fuera los 27 de 251 o más).

### 2.3 Los tres mercados, cada uno con su criterio escrito

| | Criterio (geografía · tamaño · tipo · cadenas) | Establecimientos | Marca |
|---|---|---|---|
| **Total** (TAM) | Todo México · cualquier tamaño · restaurantes y bares (7225 + 7224) · con cadenas | **773,860** | medida aquí |
| **Núcleo** | Todo México · cualquier tamaño · 722511 + 722411 + 722412 · con cadenas | **104,882** | medida aquí |
| **Servible** (SAM) | Todo México · **hasta 250 personas** (104,855 del núcleo) · el núcleo · sin las cadenas que haya entre los nombres repetidos (de 0 a 8,834: §2.2) | **≈ 100,000** (96,021 a 104,855) | medida aquí + supuesto del método de §2.2 |
| **Servible con pago probable** | el servible con **11 personas o más** (proxy de «más de 10 mesas», que es lo que cobra el plan Servicio: **supuesto**; el DENUE no da mesas) | **13,834** (sin restar cadenas) | medida aquí + supuesto |
| **Primera ola** | las 17 zonas metropolitanas ya usadas para la muestra | **40,872** (Puebla-Tlaxcala **subestimada**: lista incompleta, `muestra-500` §8.1) | medida aquí |
| **Ganable** (SOM) | restaurantes activos con Carta | **ver §2.4** | **supuesto** |

**Por qué el servible no se restringe a las 17 zonas:** Carta es una PWA por QR que no necesita infraestructura local (`CLAUDE.md`, arquitectura); lo que limita es **llegar al dueño**, no atender. Por eso la geografía es la primera **ola**, no el servible.

### 2.4 Lo ganable a 12 y 24 meses: un escenario, con sus palancas

**No es un pronóstico.** Es un rango con tres palancas, cada una con su fuente o su marca de supuesto.

| Palanca | Qué se sabe | Fuente |
|---|---|---|
| **1. Contactos para empezar** | El piloto planeado es de **10 restaurantes** (prueba de sí o no, «no se mide una curva con 10»). **No hay lista de contactos más allá** | `estrategia-de-precios.md` §5 **[documento]**; §6 #1 |
| **2. Capacidad de la infraestructura** | **Hoy** (sondeo cada 3 s, Hobby): **≈ 148 restaurantes gratuitos típicos** en el pico (manda el procesador). **Con eventos, que llegan con la Fase 3** (decisión del 13 de noviembre, aún sin construir), Hobby: **≈ 299** (manda el disco de 5 GB). **2,116** es un escalón **sin medir** (eventos, Pro y 8 procesos; manda el límite de ≈ 10,000 conexiones abiertas de Railway) y es **un tope de servidor, es decir, oferta y no demanda**. **Cada restaurante de paga ocupa el lugar de 2.4 a 2.7 gratuitos** | `anuncios-y-capa-del-comensal.md` §0 y §5 y `planos-de-carta` §4 **[documento]**, ±2× en procesador hasta medir en Railway |
| **3. Conversión de gratuito a paga** | Calvin fijó topes (10 mesas gratis, 40 de paga; 3 lecturas de PDF gratis, una vez) para la futura Spec 002; **no hay conversión medida**. El informe usa **1 % y 3 %** | `04 §11` (posturas del 13 de noviembre) y `planes-y-costo-por-restaurante.md` **[documento]**. Referencia externa: mediana de **2.18 %** de instalación a pago a 35 días en apps freemium con suscripción (RevenueCat, 2025), **no de menús** (citada en `anuncios-y-capa-del-comensal.md`, que **no leí yo**) |
| **4. Lo que publican los competidores** | **OlaClick: «más de 40,000 restaurantes en LATAM»** (su página, 20 de septiembre de 2026; cifra propia, no auditada, **no es sólo México**; entró a Y Combinator en el lote W21). Con ≈ 6 años desde 2021, son **≈ 6,700 por año en toda Latinoamérica** (aritmética mía, **supuesto** de que todos están activos). **Uber Eats México: 50,000 restaurantes registrados** (declaración en el foro de 2023, DPL News) | `2026-09-20-olaclick-a-fondo.md` línea 90 y ficha de Y Combinator **[documento]**; DPL News **[fuente externa]** |

**Escenarios [supuesto]** (restaurantes **activos**, gratuitos y de paga; el guion `embudo()` los recalcula). Cada uno dice **qué exige**; las altas por mes son aritmética mía (los 12 meses se cuentan desde el piloto de 10):

| Escenario | A 12 meses | % del núcleo | Altas por mes | A 24 meses | Qué exige |
|---|---|---|---|---|---|
| **Bajo** | **100** | 0.10 % | ≈ 8 (constante) | 200 | Venta uno a uno por el equipo. **Cabe hoy** (148 con el sondeo actual); a 24 meses 200 **ya exige eventos** (299 con la Fase 3) |
| **Medio** | **300** | 0.29 % | ≈ 25 | 1,000 | Recomendación de dueño a dueño y alta autoservida desde el PDF (el alta tarda menos de 10 min, medido en staging el 11 de noviembre). **Exige eventos y, por encima de 299, el plan Pro** y un escalón de procesos que el modelo da en ≈ 1,064 típicos con 2 procesos (sin medir en Railway) |
| **Alto** | **1,000** | 0.95 % | ≈ 83 | 2,116 | Un canal que traiga restaurantes en bloque (asociación, proveedor, POS). **Exige un escalón de servidor sin medir**; 2,116 es el **tope de servidor** (límite de conexiones de Railway), **no una predicción de demanda**: más allá hay que medir de nuevo |

**Por qué el bajo sube parejo:** 100 a 12 meses son ≈ 8 altas al mes (10 del piloto más ≈ 8 al mes), y 200 a 24 meses mantienen **el mismo ritmo** (se igualó: la versión anterior saltaba de ≈ 7 a ≈ 17 altas al mes sin razón). El medio y el alto **sí** aceleran, porque suponen un canal distinto (autoservicio o canal en bloque).

**Contra el competidor:** el escenario alto a 12 meses (1,000) es **la sexta parte** de lo que OlaClick promedia por año (aritmética mía sobre «más de 40,000 restaurantes en LATAM», una **cifra propia, no auditada, de toda Latinoamérica**, no de México): es una comparación de orden de magnitud, no un dato de mercado. **El bajo es el que hoy tiene sustento** (10 contactos del piloto y cupo para 148).

**Cualquier cifra más alta** exige conseguir antes los datos de §6 #1 y #2.

### 2.5 En dinero

**Lo que es dato:** precio de lista **349 pesos al mes antes de IVA** (hipótesis heredada de septiembre; los 33 planes leídos el 13 de noviembre lo ubican en el percentil 40 de los planes de entrada; `comparativo-de-precios-y-anuncios.md`). Costo de infraestructura: **≈ 10 a 12 USD al mes** (Railway y dominio) hoy: 10.2 USD en `anuncios-y-capa-del-comensal.md` §0 y 11.6 USD en `comparativo-de-precios-y-anuncios.md` §6.1 **[documento]**. **Lo que es supuesto:** cuántos pagan.

| Cálculo (aritmética mía) | Pesos |
|---|---|
| **Techo teórico** si **todo el núcleo** (104,882) pagara 349 al mes | **439 millones al año** (no es pronóstico) |
| Ídem si sólo pagaran los de **11 personas o más** (13,834) | **57.9 millones al año** |
| 1,000 restaurantes activos con **1 %** de paga | 3,490 al mes · 41,880 al año |
| 1,000 restaurantes activos con **3 %** de paga | 10,470 al mes · 125,640 al año |
| 2,116 activos (tope de servidor, sin medir) con 1 % / 3 % | 7,385 / 22,155 al mes |

**Lectura franca: la suscripción del restaurante, sola, con 1 % a 3 % de conversión, apenas paga la infraestructura y no es un negocio todavía.** Un restaurante de paga cubre toda la operación de hoy; para que sea negocio hace falta **que la conversión suba** (más valor por el que se paga), **o** otro ingreso (la capa del comensal de 29 pesos, anuncios no personalizados), **o** más restaurantes por encima del tope. Esas tres palancas están en `anuncios-y-capa-del-comensal.md` y siguen sin dato real.

**El lado del comensal:** el hogar mexicano gasta **2,249 pesos al trimestre en alimentos y bebidas fuera de casa** (INEGI, ENIGH 2024; **≈ 750 pesos al mes**, aritmética mía), 14 % de su gasto en alimentos y **creció 38 % de 2022 a 2024** (`planos-de-carta` §5, que cita la ENIGH; **no la releí hoy**). La capa de 29 pesos al mes equivale a **≈ 3.9 %** de ese gasto mensual por hogar (aritmética mía). **No puedo dar el total en pesos del lado del comensal** porque falta el número de hogares y de personas que comen fuera con teléfono; es el dato #7 de §6.

---

## 3. Qué existe y por qué no resuelve esto

### 3.1 La matriz por «trabajo»

Precios en **pesos al mes antes de IVA** salvo lo marcado, leídos de la página de cada proveedor el 13 de noviembre de 2026 (`comparativo-de-precios-y-anuncios-datos.csv`, 33 planes), salvo lo que digo. «—» = no cubre o **no lo encontré** (no es lo mismo; lo digo).

| Trabajo | Quién lo cubre en México | Precio de entrada | Quién lo cubre en el mundo | Lo que le falta |
|---|---|---|---|---|
| **Mostrar la carta** (QR) | OlaClick (gratis, con publicidad; Advanced 9.90 USD ≈ 184 pesos), Neolo (157; gratis hasta 200 visitas), Meniu (225), MenuTiger (gratis; Regular 17 USD ≈ 317), generador QR gratuito de Soft Restaurant; más una decena de menús mexicanos gratis (`competencia-real-mexico` §3) | **0 a 317** | MenuTiger y Waitry (Lite gratis, 3 % de comisión) | Es un producto de **captación**: «el menú QR es gratis en al menos cinco lugares» (septiembre). **Aquí no se compite por precio** |
| **Pedir al mesero** (comanda) | Soft Restaurant e-Menu QR (Lite 799, Pro 1,099; add-on sin precio público), Fudo (35 USD ≈ 652 y 45 USD ≈ 838), Last.app (1,000 a 2,900 **por sucursal**), OlaClick (vista de mesero) | **184 a 465** (pedir por QR: OlaClick Advanced y Premium, «Menú QR + pedidos», CSV de 33 planes) y **652 a 1,099** (comanda integrada, dentro de un POS completo) | Toast, Shift4 y otros POS (Estados Unidos) | Son **POS**: el restaurante debe cambiar de sistema; la comanda «sólo lectura» de Parrot y Soft Restaurant obliga a recapturar (`competencia-real-mexico` §8) |
| **Pedir en grupo** (una orden, varios teléfonos) | **No encontramos ninguno en México** (revisión del 19 de septiembre, **sin releer**). **Indicios sin comprobar:** una página de OlaClick ya borrada hablaba de una «mesa virtual» (sin copia; sin prueba con dos teléfonos); sus FAQ y su página de punto de venta de hoy no la mencionan | — | Sunday (Francia, EE. UU., Reino Unido; «dividir y pagar», no pedir juntos); Yumminn (España); Uber Eats tiene «pedido en grupo» **de reparto** (en su `robots.txt`: `*/group-orders/`); Toast y Sunday: **sin leer** | **Hueco posible, no probado**: hace falta la prueba con dos teléfonos (§6 #14) y validar con el comensal |
| **Pagar** (en mesa, por QR) | Soft Restaurant e-Menu QR (menú, pedido y pago); Getnet (propina y división de cuenta en terminal); Clip (2.99 % + 1 peso); Mercado Pago (3.5 % + IVA) | comisión 2.9 % a 3.6 % | Sunday (Francia, Estados Unidos, Reino Unido; sin precio público en septiembre), Toast (sin leer hoy) y Yumminn (0.9 % a 1.9 %, secundaria) | Exige **CFDI** y, para custodiar dinero, el marco de la Ley Fintech (`2026-09-23-checkout-y-ley-fintech.md`). **Fuera de la v1** |
| **Reservar** | **Last.app The Book** (parte del plan), **Mesa 24/7** (Perú, Chile, Ecuador, Colombia; **no México**); OpenTable (existe la red; **precio en México sin leer**) | OpenTable en **EE. UU.**: 149 / 299 / 499 USD (≈ 2,774 / 5,567 / 9,291 pesos) más 1 a 1.50 USD por cubierto | **OpenTable, TheFork** (precio por porcentaje del ticket medio, sin leer), Resy, Tock | **OpenTable: no pude abrir la página oficial (503 el 13 de noviembre)**; los precios son de una **fuente secundaria** (blog de Eat App, competidor) y se declaran «sólo en EE. UU.». No es base para decidir |
| **Descubrir y recomendar** | **Rappi, Uber Eats, DiDi Food** (reparto: 50,000 restaurantes en Uber Eats México, 2023); Google Maps (sin leer) | comisión por pedido: Uber Eats Lite 25 %, Plus 27 %, Premium 29 % (septiembre); DiDi y Rappi **no publican** | TripAdvisor, Yelp, TheFork (**sin leer hoy**) | Descubren al restaurante, **no a la mesa**; ninguno ayuda a **elegir platillo** dentro del restaurante |
| **Punto de venta** | Soft Restaurant (799 / 1,099), Fudo, Parrot, Wansoft (de Clip; **sin precio oficial**), Poster (495 a 1,179 con pago anual), Loyverse (gratis), Last.app | **0 a 1,099** | Toast, Square, Lightspeed (EE. UU.; sin leer hoy) | Cobran por **terminal o sucursal**; no son «presencia en línea» del restaurante chico |

**Lo que ya sé que no pude leer** (y por eso no lo uso): OpenTable oficial (503), TheFork, Toast y Sunday (sólo resultados de búsqueda, no se abrieron sus páginas), la página de Ipsos (sin contenido) y la de NielsenIQ (404). Todo va a §6.

### 3.2 Por qué «no resuelve esto»

1. **El menú QR es un hueco de precio, no de producto:** gratis o por 157 a 317 pesos, con el mismo PDF mejorado. Es lo que **ya existe** y lo que **no hay que cobrar** (`competencia-real-mexico` §3, «Lectura»).
2. **Quien sí resuelve «pedir al mesero» lo hace dentro de un POS** de 652 a 1,099 pesos: un dueño de fonda o bar de 5 personas **no cambia su sistema** para que el mesero reciba la comanda. Carta a 349 es **otro producto, no un POS** (el punto «medio» de la revisión de septiembre advierte del riesgo: sobreprecio sobre lo que ya paga).
3. **Quien resuelve «pagar» lo hace con comisión y con el costo regulatorio** que la v1 evita a propósito.
4. **Las apps de reparto operan fuera del restaurante**: «hoy no hay un competidor de reparto en la mesa en México» (septiembre; no lo releí hoy).
5. **En el mundo, las soluciones más parecidas** (Sunday, Yumminn, Toast Mobile Order & Pay) **no cubren México** o dependen de **un POS estadounidense**; ninguna parece resolver **P4** (presencia en línea del negocio chico), porque su cliente es un restaurante que **ya tiene** POS (juicio mío, no comprobado).

---

## 4. Qué más considerar, después de la v1

**La v1 está cerrada.** Lo que sigue es una **lista de candidatas** para especificar, **no un cambio al plan**. Para cada una: el hueco, quién ya lo tiene, la evidencia de demanda, **la pantalla del prototipo** (`prototipo/js/…`, citando el código de `app.jsx`) y qué pediría. Donde el prototipo va más allá del alcance, lo digo.

| # | Candidata | Hueco que cubre | Quién ya la tiene | Evidencia de demanda | Pantalla del prototipo | Qué pediría |
|---|---|---|---|---|---|---|
| **1** | **Página pública del negocio** («su presencia en línea»): una página por `slug` con carta, horario, ubicación y botón de WhatsApp o mapa | P4: 94 % del núcleo sin sitio (DENUE) | Neolo, MenuTiger, OlaClick (menú con enlace propio); Google Business Profile (sin leer) | **Dato oficial** (H3, H4); la demanda real **no está medida** | **No aparece.** La carta pública ya existe (`P03`, menú completo) pero sin horario ni ubicación. **Preguntar a Calvin** | Spec; el menú público por `slug` ya es cacheable en el borde. No choca con ninguna regla dura |
| **2** | **Recomendación dentro del restaurante** («Para ti» y «Top 3 del chef») | «Elegir qué pedir»: el comensal lee una carta de 44 platillos (mediana) sin guía | OlaClick, MenuTiger (destacados); ninguno con preferencias del comensal guardadas en el teléfono | **No hay encuesta**; la v1 ya trae el «Top 3 del chef» y filtros en el teléfono | `P03` menú completo, pestaña **«✦ Para ti»** (`comensal-flow.jsx` líneas 8 y 15) y `P18b` **Preferencias**, «Tus ingredientes favoritos» (`comensal-onboarding.jsx` línea 215) | Spec. **Compatible** con la regla 10 si las preferencias viven en el teléfono |
| **3** | **«Motor de recomendaciones de la comida» entre restaurantes** (descubrir qué comer cerca, por tus gustos) | «Descubrir»: Google Maps y las apps de reparto muestran restaurantes, no platillos | Rappi, Uber Eats (reparto), TheFork, TripAdvisor; ninguno por **platillo con alérgenos** | **Visión de Calvin**; **ninguna fuente de demanda** | **No aparece como flujo.** Cerca: `P03` «Para ti» y el envío de un platillo a un amigo (`comensal-core.jsx` línea 454, «le llegará como recomendación tuya, con vista 3D»: **3D, fuera de alcance**) | **Choca** con «Qué NO construir» (cuenta, perfil o historial del comensal) y con la regla dura 10. Pide **ADR** (si el perfil se guarda en el servidor), **revisión legal** (datos personales) y una spec. Una versión **sin cuenta** (recomendar por zona y por platillo, con los gustos en el teléfono) **no choca** y es lo que sugiero especificar primero |
| **4** | **Reservas** | «Reservar»: el restaurante de servicio completo pierde mesas | OpenTable, TheFork, Last.app The Book, Mesa 24/7 (sin México) | Un estudio de OpenTable citado por la Canirac (70 % de comensales habituales) **sin leer** | Sólo como beneficio de pago: `P18c` Carta+, «Reservaciones prioritarias» (`comensal-onboarding.jsx` línea 280). **No hay flujo** | **Choca con la regla 10** (nombre y teléfono del comensal en el servidor) y con «Qué NO construir» (Carta+). Pide spec, **ADR** y revisión de datos personales |
| **5** | **Pago y propina en mesa; dividir la cuenta** | «Pagar»; el prototipo ya lo muestra | Soft Restaurant, Getnet, Sunday, Yumminn | Revisión de septiembre (los competidores de México y del mundo lo incluyen) | `P05` Checkout y propina y `P05b` Pago exitoso | **Fuera de la v1 por decisión** («sin pagos»; sólo se registra la propina **declarada**, US-37). Pide ADR, **Ley Fintech** y CFDI (`2026-09-23-checkout-y-ley-fintech.md`) |
| **6** | **Calificaciones y reseñas** | Reputación del restaurante y del mesero | Google, TripAdvisor, TheFork | **Ninguna leída** | `P05` («Califica tu experiencia», `checkout-v2.jsx` línea 210; etiquetas del mesero, línea 125) y `P12` Analytics («Reseñas nuevas», `admin-ops.jsx` línea 278) | **El prototipo va más allá del plan** (`CLAUDE.md`: pagos y calificaciones); se pregunta a Calvin. La calificación del mesero lo vuelve un perfil personal: **revisión legal** |
| **7** | **Integración con el POS** (leer o escribir la comanda en Fudo, Soft Restaurant, Parrot) | «Convivir con el POS que ya tengo» | Last.app (POS propio); la API de Fudo (Pro) acepta escritura; la de Soft Restaurant y Parrot sólo lectura (septiembre) | La revisión de septiembre propuso filtrar el piloto por POS | **No aparece.** Lo más cerca: `P11` Pedidos | Spec y **ADR** (dependencia de terceros; regla 13). Valor: abrir a los restaurantes que **ya** tienen POS |
| **8** | **Facturación (CFDI)** | Los competidores la incluyen (Parrot, Fudo, Last.app, Soft Restaurant) | los cuatro | Obligación fiscal vigente; **plazo de la factura global sin resolver** (24 o 72 horas) en septiembre | **No aparece** (en `admin-mobile2.jsx` línea 505 «Facturación» es la de la suscripción de Carta) | Sólo tiene sentido **con pagos**: va con la candidata 5. Revisión fiscal con un contador |

**Lo que descarto de la lista porque choca de frente:** multi-idioma, multi-sucursal, Carta+ (suscripción del comensal), perfil portable del mesero (`P20`, `C08`) y analytics del restaurante (`P12`) están **fuera de la v1** por «Qué NO construir»; las menciono aquí sólo porque el prototipo las muestra. Ninguna entra sin cambiar el plan.

**Mi orden sugerido para especificar** (juicio, con la evidencia de cada una): **1, 2** (sin choque, apuntan a P4 y al «motor de recomendaciones» sin cuenta) → **7** (abre el mercado de los que ya tienen POS) → **3** (la visión de Calvin, en su versión sin cuenta) → **5 y 8 juntas** → **4 y 6** sólo con evidencia de demanda.

---

## 5. Lo alcanzable

[`muestra-500-cartas.md` §8.3](2026-11-13-muestra-500-cartas.md) concluyó primero que **≈ 3,000 cartas** se podían leer por sitio web; **la medición más reciente (§11 de ese informe, punto de control del 13 de noviembre en la rama de la muestra, 102 intentos) baja la tasa de carta contable a 10 ÷ 102 = 0.098 (intervalo de 90 %: 0.06 a 0.16)**, así que se corrige: **≈ 1,750 cartas (1,070 a 2,850)** de los 17,827 sitios declarados de la rama 7225 (**≈ 0.24 %** del universo; aritmética mía). La tasa se midió en restaurantes con muchas reseñas: aplicarla a todos los sitios declarados es un **[supuesto]**. Aquí sólo lo que eso significa para el mercado:

| | Núcleo | Con sitio web declarado | Sin sitio web |
|---|---|---|---|
| Todos | 104,882 | **6,170 (5.9 %)** | **98,712 (94.1 %)** |
| 11 personas o más | 13,834 | 3,733 (27.0 %) | 10,101 (73.0 %) |
| Hasta 5 personas | 73,193 | 1,136 (1.6 %) | 72,057 (98.4 %) |
| En las 17 zonas | 40,872 | 4,266 (10.4 %) | 36,606 (89.6 %) |
| Expansión (7225: mariscos, antojitos, tacos, cafeterías) | 438,848 | 6,335 (1.4 %) | 432,513 (98.6 %) |

**Lectura:**

1. **La lectura de sitios alcanza a lo más 6,170 del núcleo (con la tasa de 0.098, a ≈ 600; intervalo 370 a 990):** una pieza útil para **medir** (precios, tamaño de carta), **no para vender**. Es **la parte que ya declara sitio web**.
2. **Para Carta el negocio está en la otra parte: los 98,712 sin sitio.** Su carta, si existe en línea, está en Instagram, en un PDF de WhatsApp o en el reparto; **Carta sería su primera página**. Ésos no se «alcanzan» leyendo un sitio: **se alcanzan visitándolos o recibiendo la carta de ellos mismos** (el piloto y el alta desde PDF).
3. **Los 3,733 de 11 personas o más con sitio** son los primeros candidatos a **pagar** (ya invirtieron en presencia en línea y tienen más mesas): una lista corta y medible para el piloto. Cruzarla con las 17 zonas da la primera ola.
4. **Meta progresiva mes a mes:** es tuya; este informe sólo fija **lo que no puede pasar**: que el 5 % del universo (37,075) **se lea** por sitios propios (es imposible: los sitios declarados son 17,827 en total).

---

## 6. Datos por conseguir

| # | Dato | Por qué falta | Forma concreta de obtenerlo |
|---|---|---|---|
| 1 | **Contactos disponibles para el piloto y su ritmo de altas** | Sustenta el escenario bajo, que es el único con fuente | Lista de Calvin: dueños con los que ya habló, con fecha; contarla en el informe |
| 2 | **Conversión de gratuito a paga** | Sin ella, §2.5 sólo muestra 1 % y 3 % | La prueba de la semana 6 del piloto (`estrategia-de-precios` §5): carta de compromiso o pago del primer mes; meta ≥ 3 de 10 |
| 3 | **Presencia en redes sociales y WhatsApp del negocio chico** (el DENUE sólo ve el sitio) | Puede haber presencia «invisible» que reste a P4 | Pregunta de entrevista a 10 dueños; o revisar una muestra de 100 negocios del DENUE en Google Maps y Facebook **a mano** (sin lector automático; permitido) |
| 4 | **Cuántos restaurantes de México usan POS y cuál** (para §4 #7) | La cifra de «65 % ya usa POS» es de EE. UU. (septiembre) | Preguntarla en la primera llamada del piloto; hay que confirmar si Canirac tiene una encuesta |
| 5 | **Mesas por restaurante** (el DENUE no las da; el plan Servicio cobra por mesas) | Es la base del servible «con pago probable» (11+ personas es un **proxy**) | Entrevista; o los **datos del propio piloto** (la tabla `mesa` ya cuenta las mesas activas) |
| 6 | **Cadenas reales** (lista externa) para medir el error de §2.2 | Mi lectura de «≈ 6 de 70» es un juicio | Un directorio público de franquicias (asociación de franquicias o la propia Canirac), cruzado con los nombres **sin guardarlos** |
| 7 | **Hogares y comensales con teléfono que comen fuera** (para el lado del comensal en pesos) | Falta el número de hogares de la ENIGH 2024 y la frecuencia | ENIGH 2024 (INEGI): hogares y gasto; ENDUTIH 2024 (ya leída) para teléfono |
| 8 | **Encuesta mexicana sobre menús QR** (gusto y rechazo) | Lo que hay es de EE. UU. y de segunda mano | Preguntar a Canirac; o **tres preguntas** a los comensales del piloto («¿prefiere la carta en papel?») |
| 9 | **OpenTable, TheFork, Toast y Sunday: página oficial** | OpenTable respondió 503; los otros sólo en buscador | Reintentar la lectura de OpenTable (`/restaurant-solutions/plans/`) otro día, y abrir las demás con la herramienta normal |
| 10 | **Ipsos y NielsenIQ (QR)** | Ipsos sin contenido; NielsenIQ 404 | Buscar el PDF actual de NielsenIQ por su título; Ipsos desde una red que la abra |
| 11 | **Competidores: restaurantes en México** (OlaClick, Soft Restaurant, Fudo, Parrot, Last.app) | Sólo hay cifra propia de OlaClick (LATAM) | Páginas «Nosotros» o notas de prensa de cada uno, con fecha |
| 12 | **Edad de los datos del DENUE** (estado de cada establecimiento, sitio web vigente) | El DENUE tiene altas hasta mayo de 2026; un sitio declarado puede estar caído | Comprobar a mano 30 sitios de la muestra; la siguiente edición sale el 25 de noviembre de 2026 (`muestra-500` §5) |
| 13 | **Puebla-Tlaxcala completa** (lista de municipios) | La zona está incompleta: 40,872 del núcleo en 17 zonas la **subestima** | Completar a mano con la tabla de «Metrópolis de México 2020» (`muestra-500` #14) |
| 14 | **Prueba de «mesa compartida» con dos teléfonos** en una cuenta gratuita de OlaClick (activar «En el local» y escanear el mismo QR desde dos teléfonos) | Es la única forma de afirmar o descartar que ya exista el pedido compartido (`olaclick-a-fondo` §4.1); implica crear una cuenta, y la hace una persona | Una persona con dos teléfonos, 20 minutos |
| 15 | **Pedido en grupo de Toast, Sunday y Uber Eats** (páginas de ayuda) | Sólo se vieron en resultados de buscador y en el `robots.txt` de Uber Eats | Abrir una o dos páginas de ayuda de cada uno con la herramienta normal de lectura |

---

## 7. Cómo se hizo (reproducible)

```bash
# Descarga (oficial, de libre uso con crédito; el crudo queda fuera del repositorio)
curl -O https://www.inegi.org.mx/contenidos/masiva/denue/denue_00_72_1_csv.zip
curl -O https://www.inegi.org.mx/contenidos/masiva/denue/denue_00_72_2_csv.zip
python3 -I docs/research/2026-11-13-mercado-de-carta-modelo.py RUTA/denue_inegi_72_1.csv RUTA/denue_inegi_72_2.csv
```

- **Lo que se guarda:** conteos por clase, estrato, zona y umbral de repetición. **No se guarda** ningún nombre, razón social, dirección, teléfono ni correo.
- **Chequeos:** el total de 7224 + 7225 del guion (773,860) coincide con la suma de [`universo-denue-tablas.json`](2026-11-13-universo-denue-tablas.json) (741,499 + 32,361); el núcleo (104,882) es 72,521 + 30,451 + 1,910.
- **Lectura web:** páginas sueltas con la herramienta normal (INEGI: ENDUTIH 2024, Censos Económicos 2024, nota técnica del DENUE; DPL News, Expansión, Duck-Hub), de pocas en pocas; **sin lectores automáticos** ni descarga masiva de sitios, salvo el DENUE (descarga oficial). Lo leído por ayudantes `haiku` lo marco como «leído por un ayudante»; lo que cito de las dos ENDUTIH y CE lo extraje yo con `pdftotext`.
- **Contenido ajeno:** el texto de cada página se trató como dato, nunca como instrucción.
