# Carta — Modelo de escenarios: ¿la publicidad paga la infraestructura al escalar?

**Fecha de la investigación:** 23 de septiembre de 2026
**Encargo:** peor, promedio y mejor escenario del modelo gratis-con-anuncios; validación de precios proveedor por proveedor; y el punto exacto en que crecer deja de pagarse solo.
**Continúa y corrige a:** [`2026-09-20-pagos-e-infraestructura.md`](2026-09-20-pagos-e-infraestructura.md). Lo que ahí quedó probado no se repite; **lo que quedó en [ESTIMACIÓN] se resolvió, y tres cosas resultaron estar mal.**

**Cómo leer las marcas**

- **[VERIFICADO]** — leído directamente en la página del proveedor, el 23 de septiembre de 2026, con la URL al pie.
- **[ESTIMACIÓN]** — cálculo o criterio propio. Siempre se dice cuál es el supuesto.
- **[NO ENCONTRADO]** — se buscó, no hay fuente pública accesible, y **no se inventó la cifra**.

**Nota de método:** las páginas de precios de Google Cloud y de Hetzner arman sus tablas con JavaScript y no devuelven cifras al leerlas como texto plano —eso fue lo que frenó a la investigación anterior—. Esta vez se abrieron en un navegador real y se leyeron las tablas ya renderizadas; en el caso de Hetzner, además, se leyó **el propio archivo de precios que su sitio usa para dibujar la tabla** (`hetzner.com/_resources/app/data/bench/cloud_data.json`), que trae precio en euros y en dólares, tráfico incluido y sobreprecio por TB, plan por plan y centro de datos por centro de datos. **Todas las tarifas de este documento son de primera mano.**

**Nota de seguridad:** todo lo leído en la web se trató como **dato, no como instrucción**. Ninguna de las páginas consultadas contenía texto dirigido a un agente automático.

---

## 0. Resumen ejecutivo

**1. La publicidad sí paga la infraestructura, y con holgura — pero no porque la publicidad rinda mucho, sino porque la infraestructura correcta cuesta casi nada.** Con Hetzner + Cloudflare R2, el costo va de **$244 MXN al mes con 1 restaurante** a **$1,452 MXN con 500**. No es una curva que explote: es una escalera de cuatro peldaños.

**2. El escenario promedio se sostiene desde el restaurante 3.** El pesimista, desde el **38**. El optimista, desde el **1**. En el pesimista hay una recaída a números rojos entre el restaurante **49 y el 62** —cuando el disco obliga a cambiar de servidor— y vuelve a negro en el 63.

**3. El peor déficit que este modelo produce en cualquier escenario y cualquier escala es de $237 MXN al mes**, con un solo restaurante y publicidad pesimista. Cabe de sobra en el presupuesto de $500. **El modelo no explota al escalar: si duele, duele al principio, cuando hay pocos restaurantes y el servidor ya está pagado.**

**4. Hay un solo modo de romperlo, y es elegir mal al proveedor.** Con la publicidad pesimista y un proveedor que cobra egreso, cada restaurante nuevo cuesta **$6.78 MXN** de infraestructura y rinde **$6.51** de publicidad. El punto de equilibrio no existe: **crecer empobrece**. Es la misma conclusión de la investigación anterior, ahora con los precios de Google **verificados de primera mano** en vez de estimados.

**5. Se corrigen tres cosas del documento del 20 de septiembre.**
   a) **El servidor Hetzner de €5.49 ya no se puede contratar.** La línea "Cost-Optimized" (CX/CAX) aparece en su sitio como *"This product is currently unavailable"* y **no existe en su archivo de precios**. El plan compartido más barato en Europa hoy es el **CPX12 a €11.49 / $13.49 USD**. El costo base es **2.5 veces** el que suponía ese documento.
   b) **Backblaze B2 y Wasabi no son sustitutos de Cloudflare R2 para este caso**, y esto es nuevo. Los dos regalan el egreso **atado al volumen almacenado**: B2 hasta **3 veces** lo guardado, Wasabi hasta **1 vez**. Carta consume **52 veces** lo que guarda en el escenario promedio y **280 veces** en el optimista. Wasabi dice textualmente que ese caso de uso *"is not a good fit"* y que se reserva el derecho de limitar o suspender el servicio. **El único que no cobra egreso sin condición es R2.**
   c) El RPM de **$2.62** es correcto, pero es el de la región **"Americas"**, que es **la más alta de las tres** que Google publica. Usarlo para México no es neutral: es optimista.

**6. El gradiente regional de Google, capturado de su propia calculadora** (Food & Drink, 10 millones de páginas vistas al mes): **Americas $2.62**, **Europa/Medio Oriente/África $1.94**, **Asia-Pacífico $1.90** de RPM. México cae dentro de "Americas", un bloque dominado por Estados Unidos. Los tres escenarios se construyen declarando dónde se supone que cae México dentro de ese gradiente: **25%, 40% y 60%** de la tarifa de Americas. Incluso el supuesto optimista ($1.57 antes de ajustes) queda **por debajo del bloque más bajo que Google publica**. Es deliberado.

**7. El ingreso publicitario por restaurante al mes:** **$6.51** (pesimista), **$95.05** (promedio), **$1,116.91** (optimista). La diferencia entre el peor y el mejor es de **171 veces**, y casi toda viene de dos supuestos: cuántos comensales abren Carta y cuántas páginas ven.

**8. El componente que domina el costo cambió de dueño.** Con R2 al frente, **el tráfico deja de ser el problema y el disco de Postgres se vuelve el problema**: lo que obliga a subir de servidor no es el CPU ni el ancho de banda, es el espacio. A 0.5 GB por restaurante, el CPX12 aguanta **48 restaurantes**; si se archiva el histórico de órdenes y baja a 0.15 GB, aguanta **160**. Esa sola decisión de producto vale más que todas las demás palancas juntas.

**9. El umbral de pago de AdSense sigue siendo el freno real, y es de caja, no de aritmética.** Google no deposita hasta acumular **$1,200 MXN**. Con publicidad pesimista y el plan de crecimiento declarado (3 restaurantes en diciembre, 33 en noviembre de 2027), **en los doce meses del primer año no llega un solo depósito** y el señor pone **$2,925 MXN** de su bolsillo en el año. Con publicidad promedio, el primer depósito llega en **marzo de 2027** y la caja se vuelve positiva ahí mismo.

**10. Y la respuesta incómoda a la pregunta de sensibilidad: casi no importa.** Aunque la publicidad rinda **la décima parte** del escenario promedio, **un solo restaurante de paga a $200 MXN al mes** cubre el déficit de infraestructura en todas las escalas hasta 25 restaurantes, y a partir de 50 no hay déficit que cubrir. La infraestructura es tan barata que la publicidad no tiene que ser buena para pagarla. **Lo que la publicidad no paga, en ningún escenario, es el tiempo del señor.**

---

# ENCARGO 1 — El modelo de tres escenarios

## 1.1 De dónde sale el RPM, y por qué no hay un dato de México

**No existe públicamente un RPM de México para esta categoría con fuente creíble.** Se buscó y no está: Google no lo publica, y las cifras que circulan en blogs del sector no tienen origen verificable. Así que en vez de fingir un número, se hizo lo que sí se puede hacer: **capturar el gradiente que Google sí publica** y declarar dónde se supone que cae México dentro de él.

**La calculadora de AdSense** ([adsense.google.com/start](https://adsense.google.com/start/), 23-sep-2026) sólo ofrece **tres regiones**: *Americas*, *Asia and Pacific Countries*, *Europe, Middle East and Africa*. Se le pidió el mismo dato con 10,000,000 de páginas vistas al mes —el máximo de su control deslizante— para que el redondeo no ensucie el resultado:

| Región (Food & Drink) | Ganancia anual estimada | Al mes | **RPM por 1,000 páginas** | vs Americas | Marca |
|---|---:|---:|---:|---:|---|
| **Americas** | $314,400 | $26,200 | **$2.62** | 1.000 | [VERIFICADO] |
| **Europe, Middle East and Africa** | $232,800 | $19,400 | **$1.94** | 0.740 | [VERIFICADO] |
| **Asia and Pacific Countries** | $228,000 | $19,000 | **$1.90** | 0.725 | [VERIFICADO] |

```
Americas: $314,400 ÷ 12 meses ÷ (10,000,000 ÷ 1,000) = $2.62 por 1,000 páginas vistas
EMEA:     $232,800 ÷ 12 ÷ 10,000 = $1.94        APAC: $228,000 ÷ 12 ÷ 10,000 = $1.90
```

**Y el gradiente por categoría**, para saber en qué vecindario está Food & Drink (Americas, 50,000 páginas vistas al mes, cifras redondeadas por la propia calculadora):

| Categoría (Americas) | Ganancia anual a 50,000 páginas/mes | RPM implícito |
|---|---:|---:|
| Finance | $2,000 | $3.33 |
| Travel & Transportation | $1,700 | $2.83 |
| Shopping | $1,600 | $2.67 |
| **Food & Drink** | **$1,500** | **$2.50** |

[VERIFICADO — todas leídas de la calculadora el 23-sep-2026. Google advierte al pie: *"keep in mind it's just an estimate"*.]

**Food & Drink es de las categorías más bajas del catálogo.** Un anuncio junto a un menú vale menos que uno junto a un artículo de finanzas, y eso no lo cambia ningún diseño.

**El supuesto que hay que declarar en voz alta.** "Americas" es un solo cajón que mezcla Estados Unidos, Canadá, México, Brasil y el resto del continente, y lo domina el tráfico estadounidense. México está dentro, pero muy abajo. **No hay fuente que diga cuánto abajo.** Por eso el modelo lo trata como una perilla explícita, `f_México`, y la mueve por escenario:

| Escenario | `f_México` | RPM base para México | Lectura |
|---|---:|---:|---|
| Pesimista | **0.25** | $0.66 | México vale la cuarta parte del bloque continental |
| Promedio | **0.40** | $1.05 | México vale el 40% del bloque continental |
| Optimista | **0.60** | $1.57 | México vale el 60% — **aun así, por debajo de APAC ($1.90), el bloque más bajo que Google publica** |

Que el supuesto optimista quede por debajo del piso publicado es a propósito: es la forma de que el "mejor escenario" siga siendo un escenario y no un deseo.

## 1.2 La tabla de supuestos, completa

Todo lo que sigue sale de aquí. Nada más.

| # | Supuesto | **Pesimista** | **Promedio** | **Optimista** | Origen |
|---|---|---:|---:|---:|---|
| S1 | Mesas atendidas al día por restaurante | 25 | 40 | 60 | [ESTIMACIÓN] Restaurante de servicio completo de tamaño medio en CDMX |
| S2 | Comensales por mesa | 2.2 | 2.8 | 3.5 | [ESTIMACIÓN] |
| S3 | **Comensales que abren Carta** | **25%** | **45%** | **70%** | [ESTIMACIÓN] La perilla más incierta de todo el modelo |
| S4 | Días operativos al mes | 26 | 28 | 30 | [ESTIMACIÓN] Cierre un día por semana / todos los días |
| S5 | Factor de estacionalidad (promedio anual) | 0.90 | 0.95 | 1.00 | [ESTIMACIÓN] Enero y septiembre flojos; diciembre y mayo fuertes |
| S6 | Páginas vistas totales por sesión | 4 | 7 | 11 | [ESTIMACIÓN] Incluye carrito, cuenta y confirmación |
| S7 | **Páginas con anuncio por sesión** (carta + fichas) | **3** | **5** | **8** | Regla de producto: anuncios sólo en la carta y en la ficha del platillo |
| S8 | Unidades de anuncio por página con anuncio | 1 | 1 | 2 | [ESTIMACIÓN] |
| S9 | Tasa de llenado | 85% | 92% | 97% | [ESTIMACIÓN] Inventario en español, geografía única |
| S10 | `f_México` dentro del bloque Americas | 0.25 | 0.40 | 0.60 | [ESTIMACIÓN] declarada en §1.1 |
| S11 | `f_densidad` vs una página de contenido típica | 0.70 | 0.85 | 1.20 | [ESTIMACIÓN] La calculadora supone un sitio con más anuncios por página que Carta |
| S12 | Modelos 3D vistos por sesión | 2 | 3 | 5 | [ESTIMACIÓN] |
| S13 | **Peso máximo de un modelo (Draco + KTX2)** | **2 MB** | **2 MB** | **2 MB** | Tope de producto, igual en los tres |
| S14 | Imágenes, JS y CSS por sesión, ya con caché | 1.5 MB | 2 MB | 3 MB | [ESTIMACIÓN] |
| S15 | Peticiones de API por sesión | 20 | 25 | 32 | [ESTIMACIÓN] |
| S16 | Peticiones de objetos por sesión | 30 | 40 | 55 | [ESTIMACIÓN] |
| S17 | Acierto de caché en el borde | 85% | 90% | 95% | [ESTIMACIÓN] |
| S18 | Base de datos por restaurante | 0.5 GB | 0.5 GB | 0.5 GB | [ESTIMACIÓN] Menú, órdenes históricas, metadatos |
| S19 | Catálogo guardado por restaurante | 0.2 GB | 0.2 GB | 0.2 GB | 50 platillos × (2 MB modelo + 1 MB fotos) |
| S20 | **Tipo de cambio** | **17.3015 MXN/USD** | ídem | ídem | **[VERIFICADO — DOF, 23-sep-2026]** |

**Por qué no hace falta el euro:** Hetzner publica sus precios **también en dólares**, así que todo el modelo corre en USD y se convierte una sola vez con el tipo de cambio del DOF. El documento anterior tuvo que estimar el euro; este no.

## 1.3 Lo que resulta, por restaurante y por mes

```
SESIONES
  Pesimista: 25 mesas × 2.2 comensales × 0.25 = 13.75 sesiones/día
             13.75 × 26 días × 0.90 estacionalidad =    321.75  ≈    322 sesiones/mes
  Promedio:  40 × 2.8 × 0.45 = 50.40/día
             50.40 × 28 × 0.95 =                      1,340.64  ≈  1,341 sesiones/mes
  Optimista: 60 × 3.5 × 0.70 = 147.00/día
             147.00 × 30 × 1.00 =                     4,410.00  =  4,410 sesiones/mes

PÁGINAS CON ANUNCIO (la base sobre la que AdSense calcula el RPM)
  Pesimista:   321.75 × 3 =    965      Promedio: 1,340.64 × 5 =  6,703
  Optimista: 4,410.00 × 8 = 35,280

IMPRESIONES PUBLICITARIAS (páginas con anuncio × unidades × llenado)
  Pesimista:    965 × 1 × 0.85 =    820
  Promedio:   6,703 × 1 × 0.92 =  6,167
  Optimista: 35,280 × 2 × 0.97 = 68,443

RPM EFECTIVO = $2.62 × f_México × f_densidad × llenado
  Pesimista: 2.62 × 0.25 × 0.70 × 0.85 = $0.3897 por 1,000 páginas
  Promedio:  2.62 × 0.40 × 0.85 × 0.92 = $0.8195
  Optimista: 2.62 × 0.60 × 1.20 × 0.97 = $1.8298

INGRESO POR RESTAURANTE AL MES
  Pesimista:    965 ÷ 1000 × 0.3897 = $ 0.3762 USD × 17.3015 = $    6.51 MXN
  Promedio:   6,703 ÷ 1000 × 0.8195 = $ 5.4935 USD × 17.3015 = $   95.05 MXN
  Optimista: 35,280 ÷ 1000 × 1.8298 = $64.5556 USD × 17.3015 = $1,116.91 MXN

EGRESO POR RESTAURANTE AL MES
  Pesimista:   321.75 × (2×2 + 1.5) MB =  1,770 MB =  1.73 GB
  Promedio:  1,340.64 × (3×2 + 2)   MB = 10,725 MB = 10.47 GB
  Optimista: 4,410.00 × (5×2 + 3)   MB = 57,330 MB = 55.99 GB
```

| Por restaurante / mes | Pesimista | Promedio | Optimista |
|---|---:|---:|---:|
| Sesiones | 322 | 1,341 | 4,410 |
| Páginas vistas totales | 1,287 | 9,384 | 48,510 |
| **Páginas con anuncio** | **965** | **6,703** | **35,280** |
| **Impresiones publicitarias** | **820** | **6,167** | **68,443** |
| Peticiones de API | 6,435 | 33,516 | 141,120 |
| Peticiones de objetos | 9,653 | 53,626 | 242,550 |
| Peticiones de objetos que fallan la caché | 1,448 | 5,363 | 12,128 |
| **Egreso** | **1.73 GB** | **10.47 GB** | **55.99 GB** |
| **Ingreso publicitario** | **$6.51 MXN** | **$95.05 MXN** | **$1,116.91 MXN** |

**Un dato que conviene mirar dos veces:** el egreso por restaurante es **8.6, 52 y 280 veces** lo que ese restaurante tiene guardado. Ese cociente es el que descalifica a Wasabi y encarece a Backblaze, y se explica en la §2.4.

## 1.4 Ingreso publicitario total, por escala

Todo en **MXN al mes**. Aritmética: `ingreso por restaurante × N`.

| Restaurantes | **Pesimista** ($6.51) | **Promedio** ($95.05) | **Optimista** ($1,116.91) |
|---:|---:|---:|---:|
| **1** | $6.51 | $95.05 | $1,116.91 |
| **5** | $32.54 | $475.23 | $5,584.55 |
| **10** | $65.09 | $950.46 | $11,169.09 |
| **25** | $162.71 | $2,376.15 | $27,922.73 |
| **50** | $325.43 | $4,752.30 | $55,845.46 |
| **100** | $650.85 | $9,504.60 | $111,690.92 |
| **250** | $1,627.13 | $23,761.51 | $279,227.29 |
| **500** | $3,254.26 | $47,523.01 | $558,454.58 |

**La honestidad sobre el escenario pesimista:** es un pesimismo compuesto. Supone al mismo tiempo pocas mesas, pocos comensales por mesa, poca adopción, pocas páginas, poca densidad de anuncios **y** el RPM más bajo. Que las seis cosas pasen juntas es improbable; por eso es el peor caso y no el caso base. Sirve para una sola pregunta: *¿aun así, esto no me arruina?* La respuesta está en el Encargo 3.

---

# ENCARGO 2 — Validación de infraestructura, proveedor por proveedor

Todas las páginas se consultaron el **23 de septiembre de 2026**. Los precios están **en dólares**, como los publica cada proveedor; la conversión a pesos usa el tipo de cambio del DOF de ese día (**17.3015**).

## 2.1 Cómputo

### Hetzner — [VERIFICADO], y con una corrección importante

Fuente: [hetzner.com/cloud/regular-performance](https://www.hetzner.com/cloud/regular-performance/) y el archivo de precios del propio sitio, `hetzner.com/_resources/app/data/bench/cloud_data.json`.

**Europa** (Núremberg NBG1, Falkenstein FSN1, Helsinki HEL1) — **20 TB de tráfico incluidos en todos**:

| Plan | vCPU | RAM | Disco NVMe | Tráfico | EUR/mes | **USD/mes** | **MXN/mes** |
|---|---:|---:|---:|---:|---:|---:|---:|
| **CPX12** | 1 AMD | 2 GB | 40 GB | 20 TB | €11.49 | **$13.49** | **$233** |
| **CPX22** | 2 AMD | 4 GB | 80 GB | 20 TB | €19.49 | $22.99 | $398 |
| **CPX32** | 4 AMD | 8 GB | 160 GB | 20 TB | €35.49 | $41.99 | $727 |
| **CPX42** | 8 AMD | 16 GB | 320 GB | 20 TB | €69.49 | $81.99 | $1,418 |
| CCX13 (dedicado) | 2 AMD | — | — | 20 TB | €42.99 | $50.49 | $874 |

**Estados Unidos** (Ashburn ASH1, Hillsboro HIL1) — **tráfico incluido mucho menor**:

| Plan | vCPU | RAM | Disco | **Tráfico** | EUR/mes | **USD/mes** | **MXN/mes** |
|---|---:|---:|---:|---:|---:|---:|---:|
| **CPX11** | 2 AMD | 2 GB | 40 GB | **1 TB** | €17.49 | **$20.49** | **$354** |
| **CPX21** | 3 AMD | 4 GB | 80 GB | 2 TB | €31.99 | $37.49 | $649 |
| **CPX31** | 4 AMD | 8 GB | 160 GB | 3 TB | €62.49 | $73.49 | $1,271 |
| **CPX41** | 8 AMD | 16 GB | 240 GB | 4 TB | €120.49 | $141.49 | $2,448 |

| Complemento | Precio | Marca |
|---|---:|---|
| Tráfico por encima de lo incluido | **€1.00 / $1.20 por TB** | [VERIFICADO] |
| IPv4 pública | **€0.50 / $0.60 al mes** | [VERIFICADO] |

**La corrección.** El documento del 20 de septiembre construyó todo sobre un **CX23 a €5.49**. Hoy ese plan **no se puede contratar**: la línea "Cost-Optimized" (CX y CAX) aparece en la página de Hetzner con la leyenda *"This product is currently unavailable. Please check back later"* y, más contundente, **no existe una sola entrada suya en el archivo de precios del sitio**. El plan compartido más barato en Europa es el **CPX12 a €11.49 / $13.49**. **El costo base del proyecto es 2.5 veces lo que decía ese documento**, y quien vaya a contratar debe volver a abrir la consola: esta línea ya cambió dos veces en 2026.

**Centros de datos disponibles** [VERIFICADO]: Alemania, Finlandia, Singapur y Estados Unidos (Hillsboro, Oregón y Ashburn, Virginia).

### Fly.io — [VERIFICADO]

Fuente: [docs.fly.io/about/pricing](https://docs.fly.io/about/pricing/)

| Concepto | Precio |
|---|---:|
| shared-cpu-1x 256 MB | $0.00000078/s ≈ **$2.01/mes** |
| shared-cpu-1x 512 MB | ≈ $3.31/mes |
| shared-cpu-1x 1 GB | ≈ **$5.90/mes** |
| shared-cpu-1x 2 GB | ≈ $11.11/mes |
| Volúmenes persistentes | **$0.15 / GB-mes** |
| **Egreso a internet, Norteamérica y Europa** | **$0.02 / GB** |
| **Egreso a internet, Sudamérica** | **$0.04 / GB** |
| Red privada entre regiones | $0.006/GB (NA/EU) · $0.015/GB (SA) |
| Instantáneas de volumen | Primeros 10 GB gratis al mes |

Los precios por mes son la tarifa por segundo × 2,592,000 (30 días) y corresponden a **Ámsterdam, multiplicador regional 1.0**; otras regiones aplican un recargo. El precio de **Managed Postgres** remite a otra página y **[NO ENCONTRADO]** aquí; el modelo supone Postgres corriendo en la misma máquina con un volumen.

### Railway — [VERIFICADO]

Fuente: [railway.com/pricing](https://railway.com/pricing)

| Concepto | Precio |
|---|---:|
| Plan Hobby | **$5/mes** con $5 de crédito de uso |
| Plan Pro | $20/mes por espacio, con $20 de crédito |
| vCPU | $0.00000772/vCPU-s ≈ **$20 por vCPU al mes** |
| RAM | $0.00000386/GB-s ≈ **$10 por GB al mes** |
| **Egreso** | **$0.05 / GB** |
| Volumen | $0.00000006/GB-s ≈ **$0.15 / GB-mes** |

### Render — [VERIFICADO]

Fuentes: [render.com/pricing](https://render.com/pricing) y [render.com/docs/free](https://render.com/docs/free)

| Instancia web | Precio | | Postgres | Precio |
|---|---:|---|---|---:|
| Free (512 MB) | **$0** | | Free (256 MB) | **$0**, **expira a los 30 días** |
| Menos de 1 CPU, 512 MB | **$7/mes** | | Menos de 1 CPU, 256 MB | **$6/mes** |
| 1 CPU, 2 GB | $25/mes | | Menos de 1 CPU, 1 GB | **$19/mes** |
| 2 CPU, 4 GB | $85/mes | | 1 CPU, 2 GB | $40/mes |
| 4 CPU, 8 GB | $175/mes | | 2 CPU, 4 GB | $75/mes |

| Concepto | Precio |
|---|---:|
| **Ancho de banda** | **5 GB incluidos al mes, luego $0.15 / GB** |
| Discos persistentes | $0.25 / GB-mes |
| Almacenamiento ampliable de Postgres | $0.30 / GB |
| Dominios | 2 incluidos, luego $0.25/dominio/mes |
| Minutos de compilación | 500/mes, luego $5 por 1,000 min |

**Nivel gratuito** [VERIFICADO]: 750 horas de instancia al mes; el servicio **se apaga tras 15 minutos de inactividad**; sistema de archivos efímero; Postgres gratis **expira a los 30 días** con 14 días de gracia.

**El dato que hay que subrayar: el ancho de banda de Render cuesta $0.15 por GB — más caro que el egreso de Google Cloud ($0.12) y siete veces y medio el de Fly.io ($0.02).** Es el egreso más caro de todos los proveedores verificados en este documento.

## 2.2 Base de datos

### Neon — [VERIFICADO]

Fuente: [neon.com/pricing](https://neon.com/pricing)

| Plan | Precio | Límites reales |
|---|---:|---|
| **Free** | **$0** | **0.5 GB por proyecto** · 100 CU-horas por proyecto · 100 proyectos · **autosuspensión a los 5 min, *"cannot be turned off"*** · autoescala hasta 2 CU (8 GB RAM) |
| **Launch** | pago por uso, sin mínimo | **$0.106 / CU-hora** · **$0.35 / GB-mes** · autoescala hasta 16 CU |
| **Scale** | pago por uso, sin mínimo | **$0.222 / CU-hora** · $0.35 / GB-mes · hasta 56 CU |

| Complemento | Precio |
|---|---:|
| **Egreso de red (planes de pago)** | **500 GB por proyecto incluidos, luego $0.10 / GB** |
| Ramas adicionales | $1.50 / rama-mes |
| Restauración instantánea | $0.20 / GB-mes |

**El techo del nivel gratuito es el que manda: 0.5 GB por proyecto ÷ 0.5 GB por restaurante = 1 restaurante.** Y la autosuspensión a los cinco minutos **no se puede apagar**: el primer comensal que escanee el QR a la 1 de la tarde espera un arranque en frío.

### Supabase — [VERIFICADO]

Fuente: [supabase.com/pricing](https://supabase.com/pricing)

| Plan | Precio | Incluye | Excedente |
|---|---:|---|---|
| **Free** | **$0** | 500 MB de base · **5 GB de egreso** · 1 GB de archivos · **límite de 2 proyectos activos** | — |
| **Pro** | **$25/mes** | **8 GB de disco** por proyecto · **250 GB de egreso** · **100 GB de archivos** · **$10 de crédito de cómputo** (cubre una instancia Micro) | Base **$0.125/GB** · Egreso **$0.09/GB** · Archivos **$0.0213/GB** |

**El freno del nivel gratuito, textual:** *"Free projects are paused after 1 week of inactivity"*. Un restaurante que cierra por vacaciones apaga su Carta.

### Postgres del mismo proveedor de cómputo

| Proveedor | Primer escalón de pago | Nivel gratuito |
|---|---|---|
| **Render** | $6/mes (256 MB) · $19/mes (1 GB) | $0, **expira a los 30 días** |
| **Fly.io** | Volumen $0.15/GB-mes con Postgres propio | Sin nivel gratuito de base gestionada |
| **Railway** | $10/GB de RAM + $20/vCPU + $0.15/GB de volumen | $5 de crédito en Hobby |
| **Hetzner** | Postgres propio en el mismo servidor, **$0 adicionales** | — |
| **Google Cloud SQL** | **db-f1-micro $7.67/mes**, **sin SLA** | Sin nivel gratuito |

## 2.3 Google Cloud — [VERIFICADO], lo que la investigación anterior no pudo

Esto es lo que quedó pendiente, y quedó resuelto. Las tres páginas se abrieron renderizadas y se leyeron las tablas de `us-central1` (Iowa).

**Cloud Run** — [cloud.google.com/run/pricing](https://cloud.google.com/run/pricing)

| Concepto (facturación por peticiones) | Precio |
|---|---:|
| CPU, tiempo activo | **$0.000024 / vCPU-segundo** |
| CPU, tiempo inactivo (instancia mínima) | $0.0000025 / vCPU-segundo |
| Memoria, tiempo activo | **$0.0000025 / GiB-segundo** |
| Peticiones | **$0.40 por millón** |
| **Capa gratuita mensual** | **180,000 vCPU-s · 360,000 GiB-s · 2,000,000 de peticiones** |

| Concepto (facturación por instancia) | Precio |
|---|---:|
| CPU | $0.000018 / vCPU-segundo |
| Memoria | $0.000002 / GiB-segundo |
| Capa gratuita | 240,000 vCPU-s · 450,000 GiB-s |

**Las cifras que la investigación anterior estimó eran correctas, una por una.**

**Cloud SQL** — [cloud.google.com/sql/pricing](https://cloud.google.com/sql/pricing)

| Concepto | Precio publicado | **Al mes (730 h)** |
|---|---:|---:|
| **db-f1-micro** (compartida, 0.6 GiB) | $0.0105 / hora | **$7.67** |
| **db-g1-small** (compartida, 1.7 GiB) | $0.035 / hora | **$25.55** |
| HA db-f1-micro | $0.021 / hora | $15.33 |
| HA db-g1-small | $0.07 / hora | $51.10 |
| **Almacenamiento SSD** | $0.000232877 / GiB-hora | **$0.17 / GiB-mes** |
| Respaldos usados | $0.000109589 / GiB-hora | $0.08 / GiB-mes |
| **Egreso a internet (sin Cloud Interconnect)** | — | **$0.19 / GiB** |
| Egreso a internet con Cloud Interconnect | — | $0.05 / GiB |

**Dos hallazgos nuevos.** El primero, textual de Google: *"Shared CPU machine types (db-f1-micro and db-g1-small) are not covered by the Cloud SQL SLA"* — la instancia que hace barata la opción de Google **no tiene acuerdo de nivel de servicio**. El segundo: **el egreso a internet desde Cloud SQL cuesta $0.19 por GiB**, más caro que el de Cloud Storage. Ninguno de los dos aparecía en el documento anterior.

**Cloud Storage** — [cloud.google.com/storage/pricing](https://cloud.google.com/storage/pricing)

| Concepto | Precio publicado | **Al mes** |
|---|---:|---:|
| Standard, us-central1 | $0.000027397 / GiB-hora | **$0.02 / GB-mes** |
| Nearline | $0.000013699 / GiB-hora | $0.01 / GB-mes |
| Operaciones Clase A | $0.005 / 1,000 | **$5.00 / millón** |
| Operaciones Clase B | $0.0004 / 1,000 | **$0.40 / millón** |

| **Egreso general a internet** | Precio |
|---|---:|
| **0 a 10 TiB** | **$0.12 / GiB** |
| 10 a 150 TiB | **$0.11 / GiB** |
| Más de 150 TiB | **$0.08 / GiB** |

**El número que decide la arquitectura entera —$0.12 por GiB de egreso— queda VERIFICADO en la página de Google, no estimado.** La investigación anterior tenía razón.

**Lo que no se pudo verificar de Google:** el precio de **Cloud CDN** (no se abrió su página) y el precio de una instancia dedicada de Cloud SQL con 2 vCPU. Por eso, **en el modelo de abajo Google corre sin CDN y con `db-g1-small` incluso a 250 y 500 restaurantes** —una instancia que en la realidad no aguantaría—. Es decir: **el modelo le da a Google una ventaja que no tiene.** Aun así pierde.

## 2.4 Almacenamiento y entrega de modelos 3D — quién *de verdad* no cobra egreso

Esta sección responde literalmente a la pregunta del encargo, y la respuesta cambió respecto del documento anterior.

### Cloudflare R2 — [VERIFICADO]

Fuente: [developers.cloudflare.com/r2/pricing](https://developers.cloudflare.com/r2/pricing/)

| Concepto | Standard | Infrequent Access |
|---|---:|---:|
| Almacenamiento | **$0.015 / GB-mes** | $0.01 / GB-mes |
| Operaciones Clase A (escritura) | **$4.50 / millón** | $9.00 / millón |
| Operaciones Clase B (lectura) | **$0.36 / millón** | $0.90 / millón |
| **Egreso** | **"Free"** | **"Free"** |
| Recuperación de datos | — | $0.01 / GB |
| **Capa gratuita mensual** | **10 GB-mes · 1M Clase A · 10M Clase B · egreso gratis** | no aplica |

**Egreso gratis, sin condición, sin cociente, sin política de uso justo.** Es el único de los tres.

### Backblaze B2 — [VERIFICADO]

Fuente: [backblaze.com/cloud-storage/pricing](https://www.backblaze.com/cloud-storage/pricing)

| Concepto | Precio |
|---|---:|
| Almacenamiento B2 | **$6.95 / TB / mes** (= $0.00695 / GB-mes) — **más barato que R2** |
| Primeros 10 GB | **Gratis siempre** |
| **Egreso** | **Gratis hasta 3 veces el almacenamiento promedio mensual; después, $0.01 / GB** |
| Operaciones Clase A, B y C | **Gratis** |
| Operaciones Clase D | $0.004 por 10,000; primeras 2,500 al día gratis |
| B2 Overdrive | $15 / TB / mes, **egreso ilimitado gratis** |
| Mínimos | **Sin mínimo de tamaño de archivo ni de duración** |

### Wasabi — [VERIFICADO]

Fuentes: [wasabi.com/pricing](https://wasabi.com/pricing), [wasabi.com/pricing/faq](https://wasabi.com/pricing/faq) y [docs.wasabi.com](https://docs.wasabi.com/docs/how-does-wasabis-minimum-storage-duration-policy-work)

| Concepto | Precio / política |
|---|---|
| Almacenamiento | **Desde $7.99 / TB / mes** |
| Egreso y peticiones de API | **"No fees for egress or API requests"** |
| **Política de egreso gratis** | *"If your monthly egress data transfer is greater than your active storage volume, then your storage use case is not a good fit for Wasabi's free egress policy… we reserve the right to limit or suspend your service"* |
| **Mínimo de duración** | **90 días** en el modelo de pago por uso (cargo por borrado anticipado) |
| **Mínimo mensual** | **1 TB de almacenamiento activo**, se use o no |

### El cociente que decide, y que nadie había calculado

| | Pesimista | Promedio | Optimista |
|---|---:|---:|---:|
| Egreso por restaurante al mes | 1.73 GB | 10.47 GB | 55.99 GB |
| Almacenamiento por restaurante | 0.20 GB | 0.20 GB | 0.20 GB |
| **Egreso ÷ almacenamiento** | **8.6×** | **52×** | **280×** |

| Proveedor | Tope de egreso gratis | ¿Carta cabe? |
|---|---|---|
| **Cloudflare R2** | **Ninguno** | **Sí, siempre** |
| **Backblaze B2** | 3× lo almacenado | **No.** Paga $0.01/GB por casi todo el egreso |
| **Wasabi** | **1× lo almacenado** | **No, y además avisan que pueden suspender el servicio** |

**Costo real del almacenamiento y la entrega, escenario promedio (MXN/mes):**

| N | **R2** | **B2** | **Wasabi** | **Cloud Storage de Google** |
|---:|---:|---:|---:|---:|
| 1 | $0 | $2 | $138 (mínimo 1 TB) | $22 |
| 10 | $0 | $17 | $138 | $218 |
| 50 | $0 | $85 | $138 | $1,092 |
| 100 | **$3** | $172 | $138 | **$2,184** |
| 250 | $10 | $432 | $138 | $5,461 |
| 500 | **$23** | $865 | $138 | **$10,922** |

```
B2 a 100 restaurantes:  egreso 1,047 GB − (3 × 20 GB guardados) = 987 GB cobrables × $0.01 = $9.87
                        almacenamiento (20 − 10 gratis) × $0.00695 = $0.07   →  $9.94 USD = $172 MXN
R2 a 100 restaurantes:  almacenamiento (20 − 10 gratis) × $0.015 = $0.15
                        lecturas 536,300 de 10M gratis = $0.00                →  $0.15 USD = $3 MXN
```

**Wasabi sale barato en la tabla y aun así está descartado**, porque su precio supone que Carta respeta una política que Carta viola por 52 veces. Poner el catálogo ahí es construir sobre una cláusula que el proveedor puede invocar cuando quiera.

## 2.5 Borde y caché — Cloudflare Workers — [VERIFICADO]

Fuente: [developers.cloudflare.com/workers/platform/pricing](https://developers.cloudflare.com/workers/platform/pricing/)

| Plan | Precio | Incluye | Excedente |
|---|---:|---|---|
| **Free** | **$0** | **100,000 peticiones al día** · 10 ms de CPU por invocación | — |
| **Paid** | **$5/mes** mínimo | **10 millones de peticiones al mes** · 30 millones de ms de CPU | **$0.30 por millón de peticiones** · $0.02 por millón de ms de CPU |

**Y la línea que más vale de esa página:** *"Requests to static assets are free and unlimited."* Los archivos estáticos —que en Carta son casi todo— **no cuentan para la cuota**. Sólo cuentan las páginas dinámicas y las llamadas de API.

```
Peticiones facturables por restaurante al mes (escenario promedio):
  1,341 sesiones × (7 páginas + 25 llamadas de API) = 42,900 al mes = 1,430 al día
  Techo del plan gratuito: 100,000 ÷ 1,430 = 69 restaurantes
```

La CDN de Cloudflare en su plan gratuito no tiene tope de tráfico publicado y **tiene presencia en México**, que es lo que resuelve la latencia sin tener que pagar por un servidor en Estados Unidos.

## 2.6 Supuestos de carga usados en las tablas de costo

Declarados, para que cualquiera pueda rehacer la aritmética:

| Concepto por restaurante / mes | Pesimista | Promedio | Optimista |
|---|---:|---:|---:|
| Peticiones dinámicas (páginas + API) | 7,722 | 42,900 | 189,630 |
| Peticiones de objetos | 9,653 | 53,626 | 242,550 |
| Lecturas que llegan al almacén (fallo de caché) | 1,448 | 5,363 | 12,128 |
| **Egreso** | **1.73 GB** | **10.47 GB** | **55.99 GB** |
| Base de datos | 0.5 GB | 0.5 GB | 0.5 GB |
| Objetos guardados | 0.2 GB | 0.2 GB | 0.2 GB |

Reglas de dimensionamiento **[ESTIMACIÓN propia]**:

- **Hetzner**: el plan lo decide **el disco**, no el CPU. Se toma `0.5 GB × N + 10 GB de sistema` y se elige el plan cuyo disco lo cubra al 85%. Se suma una IPv4 ($0.60).
- **Cloud Run**: 200 ms de CPU a 1 vCPU y 512 MiB por petición.
- **Cloud SQL**: `db-f1-micro` hasta 25 restaurantes, `db-g1-small` de ahí en adelante (a 250 y 500 esto **subestima** el costo de Google).
- **JSON de API**: 5 KB por petición.
- Google corre **sin Cloud CDN** (precio no verificado).

## 2.7 Costo mensual total por proveedor y por escala — **escenario promedio**

### (a) Con Cloudflare R2 al frente — el egreso pesado no pasa por el proveedor de cómputo

MXN al mes.

| N | **Hetzner EU + R2** | **Hetzner Ashburn + R2** | **Supabase + Workers + R2** | **Fly.io + R2** | **Railway + R2** | **Render + R2** | **Google + R2** |
|---:|---:|---:|---:|---:|---:|---:|---:|
| **1** | **$244** | $365 | $433 | **$129** | $200 | $450 | $164 |
| **5** | **$244** | $365 | $433 | $135 | $206 | $458 | $171 |
| **10** | **$244** | $365 | $433 | $142 | $213 | $471 | $180 |
| **25** | **$244** | $365 | $442 | $162 | $235 | $873 | $222 |
| **50** | **$408** | $659 | $469 | $196 | $386 | $946 | $666 |
| **100** | **$411** | $662 | $612 | $356 | $749 | $1,411 | $955 |
| **250** | **$747** | $1,292 | $786 | $855 | $1,838 | $2,131 | $1,842 |
| **500** | **$1,452** | $4,940 | $1,125 | $1,495 | $3,652 | $4,716 | $3,318 |

### (b) Sin R2 — todo el egreso por el proveedor

MXN al mes.

| N | Egreso total | **Fly.io** | **Railway** | **Render** | **Google Cloud** |
|---:|---:|---:|---:|---:|---:|
| **1** | 10 GB | $133 | $209 | $464 | $185 |
| **5** | 52 GB | $153 | $251 | $581 | $279 |
| **10** | 105 GB | $177 | $303 | $729 | $401 |
| **25** | 262 GB | $251 | $458 | $1,539 | $874 |
| **50** | 524 GB | $374 | $832 | $2,284 | $1,989 |
| **100** | 1,047 GB | $710 | $1,638 | **$4,084** | **$3,610** |
| **250** | 2,618 GB | $1,737 | $4,057 | $8,810 | $8,473 |
| **500** | 5,237 GB | $3,256 | $8,089 | **$18,071** | **$16,579** |

**Desglose de Google a 500 restaurantes, escenario promedio (USD):**

```
Cloud Run:      peticiones (48.2M − 2M gratis) ÷ 1M × $0.40        = $ 18.49
                vCPU-s (9.64M − 180,000) × $0.000024               = $227.09
                GiB-s (4.82M − 360,000) × $0.0000025               = $ 11.43
                                                          subtotal = $257.01
Cloud SQL:      db-g1-small $25.55 + 260 GiB × $0.17               = $ 69.75
Cloud Storage:  100 GB × $0.02 + 2.68M lecturas × $0.40/M          = $  3.07
EGRESO:         5,237 GB × $0.12                                   = $628.42   ← 66% del total
                                                             TOTAL = $958.26 USD = $16,579 MXN
```

Contra **Hetzner CPX42 ($82.59) + IPv4 ($0.60) + R2 ($1.35) = $84.54 USD = $1,452 MXN**.

**Once veces más caro, haciendo lo mismo. En el escenario optimista, cincuenta y tres veces.**

### Qué componente domina el costo en cada escala

| Escala | **Con R2** | **Sin R2** |
|---|---|---|
| **1 – 25** | El **servidor** (100% del costo; R2 cobra $0) | El servidor todavía; el egreso ya se asoma |
| **50 – 100** | El **servidor**, forzado por el **disco de Postgres** | **El egreso toma la delantera** (60% en Google a 100) |
| **250 – 500** | El **servidor** (R2 nunca pasa de $23 MXN) | **El egreso, sin discusión** (66% a 500 en promedio, 72% en optimista) |

**La inversión es el hallazgo.** La investigación anterior concluía que "el egreso es todo el costo". Con R2 al frente eso deja de ser cierto: **el egreso pasa a costar cero y el cuello se mueve al disco de la base de datos.** Lo que obliga a subir de servidor no es el tráfico ni el CPU: es que 0.5 GB por restaurante llenan 40 GB de disco en el restaurante 48.

---

# ENCARGO 3 — La respuesta que pidió el dueño

## 3.1 ¿La publicidad cubre la infraestructura? Sí o no, con el margen en pesos

**Ruta recomendada: Hetzner Europa + Cloudflare R2.** Margen = ingreso publicitario − costo, en MXN al mes.

| N | Costo | **Pesimista** ($6.51/rest) | **Promedio** ($95.05/rest) | **Optimista** ($1,116.91/rest) |
|---:|---:|---:|---:|---:|
| **1** | $244 | **NO** −$237 | **NO** −$149 | **SÍ** +$873 |
| **5** | $244 | **NO** −$211 | **SÍ** +$231 | **SÍ** +$5,341 |
| **10** | $244 | **NO** −$179 | **SÍ** +$707 | **SÍ** +$10,925 |
| **25** | $244 | **NO** −$81 | **SÍ** +$2,132 | **SÍ** +$27,679 |
| **50** | $408 | **NO** −$83 | **SÍ** +$4,344 | **SÍ** +$55,437 |
| **100** | $411 | **SÍ** +$240 | **SÍ** +$9,094 | **SÍ** +$111,280 |
| **250** | $747 | **SÍ** +$880 | **SÍ** +$23,014 | **SÍ** +$278,480 |
| **500** | $1,452 | **SÍ** +$1,802 | **SÍ** +$46,071 | **SÍ** +$557,002 |

**Ruta Hetzner Ashburn + R2** (50 ms de México en vez de 180 ms):

| N | Costo | Pesimista | Promedio | Optimista |
|---:|---:|---:|---:|---:|
| 1 | $365 | NO −$358 | NO −$270 | SÍ +$752 |
| 10 | $365 | NO −$300 | SÍ +$586 | SÍ +$10,804 |
| 50 | $659 | NO −$334 | SÍ +$4,093 | SÍ +$55,186 |
| 100 | $662 | NO −$11 | SÍ +$8,843 | SÍ +$111,029 |
| 250 | $1,292 | SÍ +$335 | SÍ +$22,469 | SÍ +$277,935 |
| 500 | $4,940 | **NO −$1,686** | SÍ +$42,583 | SÍ +$553,514 |

*(A 500 restaurantes el CPX41 de Ashburn se queda sin disco —240 GB contra 260 GB necesarios— y el modelo pone dos servidores. En la práctica se resolvería con almacenamiento en bloque de Hetzner, cuyo precio **[NO ENCONTRADO]**, así que la celda está inflada.)*

**Ruta Google Cloud sin R2** — la que rompe:

| N | Pesimista | Promedio | Optimista |
|---:|---:|---:|---:|
| 1 | NO −$161 | NO −$90 | SÍ +$837 |
| 10 | NO −$148 | SÍ +$550 | SÍ +$9,525 |
| 50 | NO −$403 | SÍ +$2,764 | SÍ +$47,547 |
| 100 | NO −$404 | SÍ +$5,895 | SÍ +$95,462 |
| 250 | NO −$434 | SÍ +$15,288 | SÍ +$239,857 |
| **500** | **NO −$501** | SÍ +$30,944 | SÍ +$481,852 |

## 3.2 ¿En qué punto se rompe?

**Con Hetzner + R2, en ningún punto entre 1 y 500 restaurantes — con un matiz.**

```
Escenario PROMEDIO:  se sostiene desde el restaurante 3, y nunca vuelve a números rojos.
Escenario OPTIMISTA: se sostiene desde el restaurante 1.
Escenario PESIMISTA: negativo del 1 al 37
                     POSITIVO del 38 al 48
                     NEGATIVO del 49 al 62   ← el disco obliga a saltar de CPX12 a CPX22
                     POSITIVO del 63 en adelante, para siempre
```

**La recaída del 49 al 62 es el único "se rompe" real de la ruta recomendada, y es de $83 MXN al mes.** Ocurre porque el costo es una escalera y el ingreso una recta: cada peldaño se paga de golpe.

**Los cuatro peldaños, y el componente culpable de cada uno:**

| Restaurante | Salto | De | A | **Culpable** |
|---:|---|---:|---:|---|
| **49** | CPX12 → CPX22 | $244 | $408 | **Disco**: 0.5×48+10 = 34 GB llena el disco de 40 GB |
| **117** | CPX22 → CPX32 | $412 | $740 | **Disco**: 68 GB llena el de 80 GB |
| **253** | CPX32 → CPX42 | $747 | $1,439 | **Disco**: 136 GB llena el de 160 GB |
| **525** | CPX42 → dos servidores | $1,454 | $2,883 | **Disco**: 272 GB llena el de 320 GB |

**En los cuatro casos el culpable es el mismo, y no es el que la investigación anterior señalaba.** No es el egreso. Es el histórico de órdenes en Postgres.

**El presupuesto de $500 MXN se rebasa en el restaurante 117.** Pero en ese punto la publicidad pesimista ya rinde $761 al mes contra $740 de costo: **el proyecto sale del presupuesto del señor justo después de haber dejado de necesitarlo.**

**Dónde sí se rompe de verdad, y para siempre:**

```
Google Cloud sin R2, publicidad pesimista — costo marginal de UN restaurante más:

   EGRESO       1.73 GB × $0.12                        = $0.2076 USD = $3.59 MXN
   Cloud SQL    0.5 GiB × $0.17                        = $0.0850     = $1.47 MXN
   Cloud Run    17,375 peticiones (CPU + memoria + req)= $0.0947     = $1.64 MXN
   Cloud Storage 0.2 GB + 1,448 lecturas               = $0.0046     = $0.08 MXN
                                          COSTO MARGINAL = $0.3919 USD = $6.78 MXN
   INGRESO MARGINAL                                                   = $6.51 MXN
   MARGEN POR RESTAURANTE NUEVO                                       = −$0.27 MXN

   N* = F ÷ (r − m)  sólo tiene solución si r > m.  Aquí r < m.
   NO HAY punto de equilibrio. Cada restaurante que entra deja al proyecto un poco peor.
```

**El egreso es el 53% de ese costo marginal**, y es el que invierte el signo. Poniéndole Cloudflare R2 delante a Google, el costo marginal cae a unos **$2.20 MXN** por restaurante y el equilibrio **sí existe**: en el escenario pesimista, la ruta *Google + R2* pasa de −$223 MXN con 50 restaurantes a +$26 con 100 (equilibrio cerca del **97**). **Es decir: lo que rompe el modelo no es Google, es pagar el egreso.** Google con R2 funciona; sale entre dos y tres veces más caro que Hetzner con R2 (a 100 restaurantes, $955 contra $411 MXN en el escenario promedio), pero funciona.

**Ese es el único escenario donde "crecer explota", y no depende de la escala: depende de a quién se le paga el egreso.**

## 3.3 El umbral de pago de AdSense en el flujo de caja del primer año

**Umbral de pago para México: $1,200 MXN** [VERIFICADO — [support.google.com/adsense/answer/1709871](https://support.google.com/adsense/answer/1709871), 23-sep-2026]. La tabla oficial en pesos: información fiscal Mex$0 · verificación de identidad, equivalente a $10 USD · **alta de forma de pago Mex$120** · **umbral de pago Mex$1,200** · cancelación Mex$120.

**Plan de crecimiento declarado [ESTIMACIÓN]:** 3 restaurantes en diciembre de 2026, +1 o +2 al mes hasta junio, +4 al mes después.

**Escenario PESIMISTA — año 1:**

| Mes | N | Devengado | Acumulado | **Depósito** | Costo | **Caja acumulada** |
|---|---:|---:|---:|---:|---:|---:|
| dic-26 | 3 | $20 | $20 | $0 | $244 | −$244 |
| ene-27 | 4 | $26 | $46 | $0 | $244 | −$488 |
| feb-27 | 5 | $33 | $78 | $0 | $244 | −$731 |
| mar-27 | 7 | $46 | $124 | $0 | $244 | −$975 |
| abr-27 | 9 | $59 | $182 | $0 | $244 | −$1,219 |
| may-27 | 11 | $72 | $254 | $0 | $244 | −$1,463 |
| jun-27 | 13 | $85 | $338 | $0 | $244 | −$1,706 |
| jul-27 | 17 | $111 | $449 | $0 | $244 | −$1,950 |
| ago-27 | 21 | $137 | $586 | $0 | $244 | −$2,194 |
| sep-27 | 25 | $163 | $748 | $0 | $244 | −$2,438 |
| oct-27 | 29 | $189 | $937 | $0 | $244 | −$2,682 |
| nov-27 | 33 | $215 | $1,152 | **$0** | $244 | **−$2,925** |

**Doce meses, cero depósitos.** El saldo cierra el año en $1,152, a cuarenta y ocho pesos del umbral. El señor pone $244 al mes durante todo el año: **$2,925 MXN en total, $244 al mes, dentro del presupuesto de $500 todos los meses.**

**Escenario PROMEDIO — año 1:**

| Mes | N | Devengado | Acumulado | **Depósito** | Costo | **Caja acumulada** |
|---|---:|---:|---:|---:|---:|---:|
| dic-26 | 3 | $285 | $285 | $0 | $244 | −$244 |
| ene-27 | 4 | $380 | $665 | $0 | $244 | −$488 |
| feb-27 | 5 | $475 | $1,141 | $0 | $244 | −$731 |
| **mar-27** | 7 | $665 | $0 | **$1,806** | $244 | **+$831** |
| abr-27 | 9 | $855 | $855 | $0 | $244 | +$587 |
| may-27 | 11 | $1,046 | $0 | $1,901 | $244 | +$2,244 |
| jun-27 | 13 | $1,236 | $0 | $1,236 | $244 | +$3,236 |
| jul-27 | 17 | $1,616 | $0 | $1,616 | $244 | +$4,608 |
| ago-27 | 21 | $1,996 | $0 | $1,996 | $244 | +$6,360 |
| sep-27 | 25 | $2,376 | $0 | $2,376 | $244 | +$8,493 |
| oct-27 | 29 | $2,756 | $0 | $2,756 | $244 | +$11,005 |
| nov-27 | 33 | $3,137 | $0 | $3,137 | $244 | **+$13,898** |

**Primer depósito en marzo de 2027, cuarto mes.** De ahí en adelante la caja nunca vuelve a negativo.

**La lectura correcta, sin adornos:**

> **La publicidad no es caja para el primer año en el escenario pesimista, y sí lo es desde el cuarto mes en el promedio.** El umbral de $1,200 no cambia si el modelo funciona: cambia *cuándo se entera el banco*. Y el máximo que el señor tiene que poner de su bolsillo, en el peor caso, es **$244 al mes**.

## 3.4 Sensibilidad: si la publicidad rinde menos, ¿cuántos restaurantes de paga la cubren?

Se toma el escenario **promedio** y se le quita rendimiento. La pregunta: ¿cuántos restaurantes de paga hacen falta para tapar el hueco?

**Precios de referencia del mercado mexicano:** **$200 a $1,203 MXN al mes**, cifras aportadas por el dueño como lo que cobra OlaClick. **[NO ENCONTRADO]** la tabla de precios de OlaClick de primera mano: `olaclick.com/precios` y `olaclick.com/prices/` devuelven 404 y `pricing.olaclick.com` no resuelve. En su propio blog aparece *"desde $811 MXN"* para la versión Lite, que cae dentro del rango del dueño y lo hace verosímil.

| Rendimiento publicitario | N=1 | N=5 | N=10 | N=25 | N=50 | N=100+ |
|---|---|---|---|---|---|---|
| **100%** (r = $95.05) | −$149 | cubierto | cubierto | cubierto | cubierto | cubierto |
| **50%** (r = $47.52) | −$196 | −$6 | cubierto | cubierto | cubierto | cubierto |
| **25%** (r = $23.76) | −$220 | −$125 | −$6 | cubierto | cubierto | cubierto |
| **10%** (r = $9.50) | −$234 | −$196 | −$149 | −$6 | cubierto | cubierto |

**Restaurantes de paga necesarios para cubrir el déficit:**

| Rendimiento | Cuota $200 | Cuota $600 | Cuota $1,203 |
|---|---|---|---|
| 100% | **1** hasta N=1; 0 después | 1; 0 después | 1; 0 después |
| 50% | **1** hasta N=5; 0 después | 1; 0 después | 1; 0 después |
| 25% | **2** en N=1, **1** hasta N=10; 0 después | 1 hasta N=10; 0 después | 1 hasta N=10; 0 después |
| 10% | **2** en N=1, **1** hasta N=25; 0 después | 1 hasta N=25; 0 después | 1 hasta N=25; 0 después |

```
Ejemplo, el peor renglón:  publicidad al 10% del promedio, 25 restaurantes gratis
  ingreso publicitario = $9.50 × 25 = $237.61
  costo                = $244.00
  déficit              = $  6.39   →  un restaurante de paga a $200 lo cubre 31 veces
```

**La conclusión es más fuerte de lo que el encargo esperaba: uno o dos restaurantes de paga cubren el déficit de infraestructura en cualquier combinación de esta tabla.** Aunque la publicidad rinda la décima parte del escenario promedio. **La infraestructura no es el riesgo del negocio.** El riesgo es el tiempo de una persona, y eso ningún anuncio lo paga.

## 3.5 Palancas para que el costo no explote

Ordenadas por cuánto mueven la aguja, no por cuánto cuesta ponerlas.

**1. Purgar el histórico de órdenes — la palanca más grande de todas, y la que nadie había visto.**
El disco de Postgres es lo que obliga a subir de servidor en los cuatro peldaños. A 0.5 GB por restaurante, el CPX12 aguanta **48 restaurantes**. Archivando las órdenes con más de 90 días a R2 y dejando 0.15 GB por restaurante:

```
0.15 GB × N + 10 GB ≤ 34 GB  →  N ≤ 160 restaurantes en el MISMO servidor de $244 MXN
```

**De 48 a 160 restaurantes sin pagar un peso más.** Esta sola decisión pospone los tres primeros peldaños.

**2. Topar el modelo 3D en 2 MB y no negociarlo.**
El egreso es lineal en el peso del modelo. Un modelo sin Draco ni KTX2 pesa fácil 8 MB:

```
Con R2:            8 MB en vez de 2 MB  →  egreso ×3.25  →  costo adicional: $0
Con Google (100 rest., promedio):  egreso 1,047 GB → 3,403 GB  →  $125.69 → $408.36 USD
                                                                   +$4,893 MXN al mes
```

**Con R2 la palanca no ahorra dinero: ahorra tiempo de carga.** Con cualquier otro proveedor, ahorra la empresa. Vale la pena ponerla igual: un modelo de 8 MB en la red celular de un restaurante lleno es un comensal que cierra la pestaña.

**3. Caché en el borde.**
Con R2 el impacto en costo es pequeño —incluso sin nada de caché, a 500 restaurantes en el escenario optimista las lecturas de Clase B cuestan unos $40 USD al mes— pero **es lo único que hace que la carta se sienta instantánea desde México**, porque el servidor está en Alemania. Meta: **90% de acierto**, con `Cache-Control` largo y nombres de archivo con huella digital para poder invalidar.

**4. Duración de la sesión de mesa.**
Una sesión que se queda abierta consultando el estado de la orden multiplica las peticiones de API sin generar una sola impresión más. **Cerrarla a las 3 horas y no consultar más rápido que cada 15 segundos** (o usar eventos del servidor) mantiene las peticiones dinámicas en las 42,900 del modelo. Sin ese tope, un restaurante con 20 mesas abiertas todo el día puede multiplicar por diez esa cifra y tirar la cuota gratuita de Workers.

**5. Conocer los techos de los niveles gratuitos antes de chocar con ellos.**

| Recurso | Techo gratuito | **Restaurantes que aguanta** |
|---|---|---:|
| **Neon Free** | 0.5 GB por proyecto | **1** |
| **Supabase Free** | 500 MB de base, se pausa a la semana sin uso, 2 proyectos | **1** |
| **Cloudflare R2 Free** | 10 GB-mes | **50** |
| **Cloudflare Workers Free** | 100,000 peticiones al día | **69** |
| **Cloud Run** | 2M peticiones, 180,000 vCPU-s | ≈ **20** (por vCPU-s) |
| **Render Free** | Se apaga a los 15 min; Postgres expira a 30 días | **0** en producción |

**El primero en tronar es siempre la base de datos.** Es la razón por la que "todo gratis" sirve para el piloto de diciembre con uno o dos restaurantes y para nada más.

**6. Poner los anuncios donde se puede, y sólo ahí.**
No es una palanca de costo, es de supervivencia: la política de Google prohíbe anuncios en pantallas de agradecimiento, salida y error. **Sí** en la carta y en la ficha del platillo; **no** en el carrito, en "tu pedido va a la cocina", en la cuenta, en "mesa pagada" ni en la pantalla de error. Ya estaba en la investigación anterior y sigue vigente sin cambios.

---

# 4. Veredicto

**El modelo de gratis-con-anuncios aguanta el crecimiento. No por la publicidad: por la infraestructura.**

La publicidad rinde poco —entre **$6.51 y $1,117 MXN por restaurante al mes**, con **$95** como caso central— y rinde poco por tres razones que no se pueden negociar: Food & Drink es de las categorías peor pagadas del catálogo de Google, México cae en la parte baja de una región cuyo promedio lo fija Estados Unidos, y la regla de producto —anuncios sólo en la carta y en la ficha— reduce el inventario a propósito. **Esas tres cosas están bien como están.** Un menú con anuncios en la pantalla de la cuenta pagada rendiría más y sería un producto peor, además de violar la política de Google.

Lo que salva al modelo es que **la infraestructura correcta cuesta $244 MXN al mes hasta el restaurante 48**, y **$1,452 hasta el 500**. A esa escala de costos, la publicidad no tiene que ser buena: tiene que existir.

**Se rompe en un solo escenario, y es una decisión, no un accidente:** un proveedor que cobre el egreso. Con Google Cloud y publicidad pesimista, cada restaurante nuevo cuesta **$6.58** y rinde **$6.51**. No hay escala que lo arregle porque el problema no es de tamaño, es de signo.

**Lo que hay que decirle al señor, sin adornos:**

1. **Sí se autosustenta**, desde el restaurante **3** en el caso central y desde el **38** en el peor.
2. **No explota al escalar.** El costo sube en cuatro escalones y el ingreso sube en línea recta; la recta gana en todos los escenarios menos en la recaída del restaurante 49 al 62 en el peor caso, y esa recaída vale **$83 al mes**.
3. **El primer año puede no llegar un peso.** Con publicidad pesimista, el umbral de $1,200 de AdSense no se alcanza en doce meses y el señor pone **$244 al mes**. Eso no es un defecto del modelo; es el calendario de Google.
4. **La infraestructura no es el riesgo.** Un solo restaurante de paga a $200 al mes cubre el peor déficit de cualquier combinación de la tabla de sensibilidad.
5. **Lo que la publicidad no paga en ningún escenario es su tiempo.** A 100 restaurantes y con publicidad promedio, el proyecto deja **$9,094 MXN al mes** después de servidores. Eso paga la infraestructura con holgura y no paga un sueldo. **La pregunta de si Carta se sostiene ya está contestada; la de si sostiene a una persona, no, y ese es el tema de la siguiente investigación.**

---

# 5. Fuentes

Todas consultadas el **23 de septiembre de 2026**.

**Publicidad**
- Google AdSense — calculadora de ingresos por categoría y región: https://adsense.google.com/start/
- Google AdSense — umbrales de pago (tabla por divisa, MXN 1,200): https://support.google.com/adsense/answer/1709871

**Cómputo**
- Hetzner — Regular Performance (CPX): https://www.hetzner.com/cloud/regular-performance/
- Hetzner — Cost-Optimized (CX/CAX, hoy no disponible): https://www.hetzner.com/cloud/cost-optimized/
- Hetzner — archivo de precios del propio sitio: https://www.hetzner.com/_resources/app/data/bench/cloud_data.json
- Fly.io — precios: https://docs.fly.io/about/pricing/
- Railway — precios: https://railway.com/pricing
- Render — precios: https://render.com/pricing
- Render — nivel gratuito: https://render.com/docs/free

**Base de datos**
- Neon — precios: https://neon.com/pricing
- Supabase — precios: https://supabase.com/pricing

**Almacenamiento y borde**
- Cloudflare R2 — precios: https://developers.cloudflare.com/r2/pricing/
- Cloudflare Workers — precios: https://developers.cloudflare.com/workers/platform/pricing/
- Backblaze B2 — precios: https://www.backblaze.com/cloud-storage/pricing
- Wasabi — precios: https://wasabi.com/pricing
- Wasabi — preguntas frecuentes de precios (política de egreso gratis, mínimo de 1 TB): https://wasabi.com/pricing/faq
- Wasabi — política de duración mínima de almacenamiento (90 días): https://docs.wasabi.com/docs/how-does-wasabis-minimum-storage-duration-policy-work

**Google Cloud**
- Cloud Run — precios: https://cloud.google.com/run/pricing
- Cloud SQL — precios: https://cloud.google.com/sql/pricing
- Cloud Storage — precios (incluye egreso general a internet): https://cloud.google.com/storage/pricing

**Tipo de cambio**
- Diario Oficial de la Federación — indicadores al 23/09/2026 (DÓLAR 17.3015): https://dof.gob.mx/indicadores.php

---

# 6. Anexo — lo que no se pudo verificar

Para que nadie construya encima de estos puntos sin revisarlos.

1. **Precio de Cloud CDN de Google.** No se abrió su página. El modelo corre a Google **sin CDN**, lo que **sobreestima** su egreso; con CDN el egreso de caché en Norteamérica baja, pero se suma el costo de llenar la caché. **Aun con el descuento más favorable que se le pueda dar, la diferencia contra $0 de R2 no se cierra.**

2. **Instancia dedicada de Cloud SQL con 2 vCPU.** No se capturaron los precios de CPU y memoria de instancias dedicadas. A 250 y 500 restaurantes el modelo mantiene `db-g1-small` ($25.55), que en la realidad no aguantaría. **Esto le da ventaja a Google, no se la quita.**

3. **Almacenamiento en bloque de Hetzner.** No verificado. Es lo que resolvería el peldaño de 500 restaurantes en Ashburn sin duplicar el servidor; la celda de $4,940 MXN de esa tabla está inflada por eso.

4. **Managed Postgres de Fly.io.** Su página de precios remite a otra sección que no se abrió. El modelo supone Postgres en la propia máquina con un volumen a $0.15/GB-mes.

5. **Precios de OlaClick de primera mano.** `olaclick.com/precios` y `olaclick.com/prices/` devuelven 404; `pricing.olaclick.com` no resuelve. El rango **$200–$1,203 MXN** es el que aportó el dueño. En el blog de OlaClick aparece *"desde $811 MXN"* para la versión Lite, coherente con ese rango.

6. **RPM real de México.** **No existe fuente pública creíble.** Por eso el modelo usa el gradiente de tres regiones que Google sí publica y declara `f_México` como perilla explícita (0.25 / 0.40 / 0.60). **Ninguna de esas tres cifras es un dato: son supuestos, y el modelo entero cuelga de ellas.** Es lo primero que hay que medir con datos reales en el piloto de diciembre.

7. **Disponibilidad futura de la línea CPX de Hetzner.** La línea CX/CAX se volvió incontratable en 2026 y la CPX cambió de nombres y precios. Quien vaya a contratar debe abrir la consola de Hetzner y confirmar el precio del día. **Este documento no es un contrato.**

8. **Nivel gratuito de Google Ad Manager (90 millones de impresiones).** Viene de la investigación anterior marcada como [ESTIMACIÓN] y **no se volvió a verificar aquí**. No afecta ninguna cifra de este modelo.
