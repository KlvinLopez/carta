# Modelo de negocio, publicidad y pagos para Carta

**Fecha de la investigación:** 19 de septiembre de 2026
**Alcance:** cómo monetizan de verdad los productos comparables; si la publicidad da para algo; qué pasarela usar; en qué se convierte Carta ante la ley mexicana si cobra dinero; CoDi y DiMo; generación de 3D en el teléfono; y modelos de "paga solo lo que uses".
**Ciudades candidatas al piloto:** Guadalajara, Ciudad de México y Cancún.
**Continúa:** [`2026-09-19-competencia-real-mexico.md`](2026-09-19-competencia-real-mexico.md) y [`2026-09-19-huecos-abiertos.md`](2026-09-19-huecos-abiertos.md). No se repite lo que ya está ahí.

**Cómo leer las marcas:**

- **[VERIFICADO]** — leído directamente en la fuente primaria, en la fecha indicada.
- **[ESTIMACIÓN]** — cálculo, inferencia o fuente secundaria. Se dice siempre de quién es y sobre qué datos.
- **[NO ENCONTRADO]** — se buscó y no existe fuente pública. No se inventó ninguna cifra.

**Nota de seguridad:** el sitio de OlaClick publica en su pie de página enlaces titulados "Claude Summary", "ChatGPT Summary", "Perplexity Summary" y "Grok Summary" — páginas escritas para que las lean agentes automáticos. **No se abrieron ni se usaron como fuente.** Todos los datos de OlaClick de este documento vienen de su página pública de precios y de sus preguntas frecuentes, que son contenido dirigido a personas. Ninguna otra página consultada contenía texto dirigido a un agente. Todo lo leído se trató como dato, no como instrucción.

**Nota de acceso:** el estudio *Valor Total Media* de IAB México exige llenar un formulario con datos personales para descargar la versión pública. **No se llenó.** Las cifras de inversión publicitaria que aparecen abajo marcadas como [ESTIMACIÓN] vienen de prensa especializada que cita ese estudio, no del estudio mismo.

---

## 0. Resumen ejecutivo

**1. El modelo que el dueño quiere explorar ya existe, ya opera en México y ya tiene precios en pesos. Se llama OlaClick.** Plan gratuito con **publicidad en el menú digital**, y planes de paga escalonados **por cupo de pedidos al mes**: MX$200 por 75 pedidos, MX$500 por 400 pedidos, MX$1,203 ilimitado. Su propia página lo dice textualmente: *"Cada plan [de paga] incluye un dominio gratuito por un año y un menú sin publicidad."* Declaran más de 40,000 negocios. [VERIFICADO] Esto no invalida la idea del dueño — la valida. Pero significa que **no es un hueco vacío y que el precio de referencia para "gratis con anuncios" ya está puesto por alguien más.**

**2. "Regalamos el software y ganamos en el pago" es, en México y en este segmento, una subida de costo para el restaurante, no un ahorro.** Banxico publica lo que cada procesador cobra de verdad a los restaurantes. En julio de 2026, la tasa de descuento promedio para **Restaurantes** era **1.65% en débito y 2.33% en crédito con BBVA Bancomer**, y **3.59% con Stripe, 3.50% con Clip, 3.39% con Mercado Pago y 3.40% con Conekta**. [VERIFICADO — Banxico] Un restaurante de servicio completo con volumen real ya tiene contrato bancario cerca del 2%. Llegar con Stripe al 3.6% **le duplicaría el costo de aceptar tarjeta**. La aritmética está en la §3.4: **unos $5,600 MXN al mes de sobrecosto** en un restaurante de 40 mesas al día. Eso es dieciséis veces la mensualidad de $349 que Carta pensaba cobrar.

**3. La publicidad da pesos, no miles.** Con la propia calculadora oficial de Google AdSense (categoría *Food & Drink*, región *Américas*), el ingreso estimado es **$2.62 USD por cada mil vistas de página**. [VERIFICADO] Un restaurante de 40 mesas al día genera, con supuestos generosos, **$405 MXN al mes**; con supuestos realistas para México, **entre $27 y $88 MXN al mes**. La aritmética completa, con todos los supuestos a la vista, está en la §2. **La publicidad puede pagar el ancho de banda del plan gratuito. No puede pagar un sueldo.**

**4. La pregunta regulatoria tiene una respuesta clara y un camino seguro.** Si Carta **cobra y guarda** el dinero del comensal para después entregarlo al restaurante, cae en el artículo 22 de la Ley Fintech y necesita ser **Institución de Fondos de Pago Electrónico**: autorización de la CNBV y **capital mínimo de 500,000 UDIS = $4,410,538 MXN** al valor de hoy. [VERIFICADO] Hacerlo sin autorización es delito: el artículo 124 prevé **de siete a quince años de prisión y multa de 5,000 a 150,000 UMA, o sea de $586,550 a $17,596,500 MXN**. [VERIFICADO] **El camino que evita todo eso es no tocar el dinero:** usar cargos directos de Stripe Connect o el Split de Pagos 1:1 de Mercado Pago, donde **el restaurante es el comercio y el dinero cae en la cuenta del restaurante**, y Carta solo cobra una comisión de plataforma. Prueba de que ese camino funciona: en el padrón oficial de la CNBV hay 40 IFPE autorizadas; **Clip, Mercado Pago y PayPal están; Stripe, Conekta, Openpay, Kushki y Nuvei no están.** [VERIFICADO]

**5. CoDi es gratis y es real, pero está prácticamente vacío.** Datos oficiales de Banxico: **22,750,207 cuentas validadas** al cierre del primer trimestre de 2026, pero en los últimos tres días con datos publicados (25, 26 y 27 de julio de 2026) hubo **7,425, 5,470 y 11,687 operaciones** — en todo el país. Eso son **8,194 pagos al día en México entero**, con ticket promedio de **$988 MXN**. [VERIFICADO — Banxico SIE] Hay 59,296 restaurantes de servicio completo en el país: si cada uno hiciera **un** cobro con CoDi al día, eso solo ya sería **7.2 veces todo el volumen nacional de CoDi**. Sirve para el nivel gratuito, pero como cortesía, no como sistema de cobro.

**6. Generar modelos 3D con IA en el teléfono no existe hoy.** No encontré ningún modelo generativo de imagen-a-3D corriendo en un celular con evidencia verificable. [NO ENCONTRADO] Stable Fast 3D de Stability AI necesita **una tarjeta gráfica con 7 GB de VRAM** [VERIFICADO]. Lo que **sí** corre en el teléfono es **fotogrametría** (Apple Object Capture, iOS 17+) y **escaneo de splats** (Scaniverse, procesamiento local). En la nube, Meshy cobra **MX$349 al mes por el plan Pro**, que con su propia tarifa de 30 créditos por modelo texturizado da **unos 33 modelos, o sea alrededor de MX$10.50 por platillo**. [VERIFICADO — precios en pesos en su sitio] Digitalizar una carta de 50 platillos cabe en un mes del plan Premium de **MX$698**.

**7. Google publica el límite de peso que importa para el teléfono del comensal.** Scene Viewer: **10 MB por modelo** como máximo, **de 30,000 a 50,000 triángulos como rango ideal** (100,000 como tope), **texturas de 2048 × 2048** como máximo, y hasta 10 materiales. [VERIFICADO] Como el 97.2% de los usuarios de internet en México entra desde un celular [VERIFICADO — INEGI, ENDUTIH 2024], estos números no son una sugerencia: son el contrato.

---

## 1. Cómo monetizan de verdad los productos parecidos

### 1.1 La tabla

Todo consultado el **19 de septiembre de 2026** en la página oficial de cada empresa.

| Producto | ¿Opera en México? | Software | Pagos | Suscripción | Modelo real |
|---|---|---|---|---|---|
| **Toast** | **No.** EE.UU., Canadá, Irlanda, Reino Unido | **Starter Kit $0/mes**; Point of Sale desde **$69/mes**; Build Your Own a cotización | **No publica sus tasas de procesamiento.** Se define a sí mismo como *"payment facilitator"*, no procesador | Sí, escalonada | **Software casi regalado, dinero en el pago.** Ver §1.2 |
| **Square (Block)** | **No.** EE.UU., Canadá, Australia, Japón, Reino Unido, Irlanda, Francia, España | **Free $0/mes**; Plus y Premium de paga | **Free: 2.6% + 15¢** presencial, 3.3% + 30¢ en línea, 3.5% + 15¢ tecleado. **Plus: 2.5% + 15¢.** **Premium: 2.4% + 15¢** | Sí, y **la suscripción compra una tasa de pago más baja** | **Software gratis, dinero en el pago**, con la suscripción vendida como descuento sobre la comisión |
| **SumUp** | **Sí** (SUMUP MEXICO, S. DE R.L. DE C.V.) | **Software de punto de venta gratis** | **3.50% + IVA por transacción** | **Ninguna.** "0 costo mensual, 0 costos administrativos y cuotas de renovación" | **El modelo más puro de "regalo el software, cobro el pago" que sí opera en México** |
| **Clip** | Sí | — | **2.99% + $1 + IVA** (tarifa promocional vigente hoy en su portada) | Ninguna | Todo el ingreso en el pago. **Clip AI, S.A. de C.V. es IFPE autorizada por la CNBV** |
| **Fudo** | Sí | POS + Carta QR + pedido en mesa | No cobra pagos | **$360 / $690 / $1,050 al mes** + módulos | **Solo suscripción** |
| **Last.app** | Sí (desde 2025) | POS + QR con pedido | No cobra pagos | **$1,000 / $1,700 / $2,900 al mes + IVA, por sucursal** | **Solo suscripción** |
| **OlaClick** | Sí | Menú digital, POS, CRM | **"OlaClick no cobra ninguna comisión sobre los pedidos"** | **Gratis** · **MX$200/mes (75 pedidos)** · **MX$500/mes (400 pedidos)** · **MX$1,203/mes (ilimitado)** · **MX$3,146/mes** | **Gratis con publicidad + cupo mensual + suscripción.** Es el modelo del dueño, ya operando |
| **Sunday** | No (Francia, EE.UU., Reino Unido) | Pago y pedido en mesa por QR | No publica tasa por transacción | **$199/mes** estándar, **$299/mes** premium, **$5 por código QR**, instalación física opcional $299 | Suscripción publicada + comisión no publicada |
| **Yumminn** | Sin evidencia de operación en México | — | — | — | **[NO ENCONTRADO]** — el dominio `yumminn.com` **volvió a no resolver** el 19-sep-2026, igual que en la investigación anterior |
| **Waitry** | Presencia en México no confirmada | — | **Lite gratuito con 3% de comisión**; Premium "$50/mes" con 0% en mesa | Sí | Gratis con comisión, o pago sin comisión |

*(Fudo, Last.app y Waitry ya fueron verificados el mismo día en [`2026-09-19-competencia-real-mexico.md`](2026-09-19-competencia-real-mexico.md); se citan sin volver a levantar.)*

### 1.2 Quién regala el software y cobra el pago: las cifras de Toast

Toast es el caso de estudio del modelo que le interesa al dueño, aunque no opere en México. Sus números dicen exactamente cuánto vale cada palanca.

| Concepto | 2025 | Marca |
|---|---:|---|
| **Ingreso total** | **US$6,153 millones** | **[VERIFICADO]** — SEC, XBRL del 10-K, expediente `0001650164-26-000057`, presentado 18-feb-2026 |
| Suscripción | US$936 millones (15.2%) | [ESTIMACIÓN] |
| **Tecnología financiera (pagos)** | **US$5,037 millones (81.9%)** | [ESTIMACIÓN] |
| Hardware y servicios profesionales | US$180 millones (2.9%) | [ESTIMACIÓN] |
| Volumen bruto de pagos (GPV) | US$195,100 millones | [ESTIMACIÓN] |

*Marca del desglose:* viene de la nota de prensa oficial de resultados de Toast del 12-feb-2026, leída a través de un resumen de búsqueda. **No pude abrirla directamente** (Businesswire devolvió error 403 y el portal de inversionistas de Toast devolvió 404). **A favor de que sea correcto:** las tres líneas suman exactamente $6,153 millones, que es el total **verificado en la SEC**. Aun así, quien vaya a usar el desglose en un pitch debería abrir la nota original.

**La aritmética que importa, con sus supuestos a la vista:**

```
Ingreso de pagos ÷ volumen de pagos = tasa efectiva que Toast se queda
US$5,037 M ÷ US$195,100 M = 0.02582 = 2.58%
```

```
Peso del pago en el negocio
US$5,037 M ÷ US$6,153 M = 81.9%
```

**Traducción:** Toast es una empresa de pagos con un punto de venta encima. **Ochenta y dos de cada cien pesos que entran, entran por la comisión del pago.** El software regalado es el anzuelo; el 2.58% sobre el volumen es el negocio.

**Por qué esto no se puede copiar tal cual en México:** ver el §3.4. La tasa a la que Toast compra el procesamiento en Estados Unidos y la tasa a la que un restaurante mexicano ya compra el suyo son dos mundos distintos.

### 1.3 Lo que esta sección decide

- **Quien regala el software y cobra el pago necesita volumen enorme.** Toast mueve 195 mil millones de dólares al año para ganar 5 mil. Con diez restaurantes de piloto, la comisión de pagos no paga ni el café.
- **En México, las plataformas de restaurante que sí operan (Fudo, Last.app, OlaClick) cobran suscripción, no comisión.** Y OlaClick presume no cobrar comisión como su principal argumento de venta.
- **SumUp es la prueba de que el modelo "gratis + 3.5%" cabe en México** — pero SumUp vende una terminal, no software de restaurante, y su cliente es el negocio chico que no tiene contrato bancario, no el restaurante de servicio completo.

---

## 2. Publicidad: ¿es realista a esta escala?

### 2.1 Qué dato hay y cuál no

**Lo que no existe públicamente:** un CPM móvil verificable para México de fuente primaria. Lo busqué en IAB México, en eMarketer y en Statista.

- **IAB México** publica el *Estudio Valor Total Media* (6ª edición, datos 2019–2024), pero **la descarga exige llenar un formulario con datos personales. No lo llené.** [NO ENCONTRADO en acceso abierto]
- **eMarketer** tiene una gráfica titulada literalmente *"Industry KPIs: Mexico Mobile Ad CPM, by Industry"*, fechada 31-dic-2025. **Las cifras y hasta la fuente están detrás de una suscripción PRO.** Lo único visible es el título. [NO ENCONTRADO en acceso abierto]
- **Statista** tiene *eCPM por tipo de anuncio, iOS y Android, México* (marzo 2024). **Los valores están enmascarados.** [NO ENCONTRADO en acceso abierto]
- Las cifras mexicanas que sí circulan libremente ("CPM en Meta de $60 a $180 MXN", "Google Display de $15 a $50 MXN") **vienen de blogs de agencias de marketing que venden ese servicio.** No se usan aquí. [NO VERIFICADO — fuente secundaria e interesada] Y hay un problema de fondo con ellas: **esos son precios de compra, lo que paga el anunciante. Lo que recibe quien publica el anuncio es bastante menos**, porque en medio se queda la tecnología publicitaria.

**Lo que sí hay, y es de fuente primaria:** la **calculadora oficial de ingresos de Google AdSense**, en `adsense.google.com/start`. Es Google diciendo cuánto estima que gana un sitio. Consultada el 19-sep-2026:

| Categoría | Región | Vistas de página al mes | Ingreso anual estimado |
|---|---|---:|---:|
| Food & Drink | Américas | 50,000 | **US$1,500** |
| Food & Drink | Américas | 500,000 | **US$15,700** |
| Food & Drink | Américas | 1,000,000 | **US$31,400** |
| Food & Drink | Américas | 10,000,000 | **US$314,400** |

[VERIFICADO] La relación es lineal, lo que permite despejar el ingreso por mil vistas:

```
US$31,400 al año ÷ (1,000,000 vistas/mes × 12 meses) × 1,000 = US$2.617
→ RPM ≈ US$2.62 por cada 1,000 vistas de página
```

Al tipo de cambio del DOF del 18-sep-2026 (**$17.1872 MXN por dólar**, [VERIFICADO — DOF]):

```
US$2.617 × 17.1872 ≈ $44.97 MXN por cada 1,000 vistas de página
```

**Dos advertencias que hay que decir en voz alta:**

1. **La región es "Américas", que incluye Estados Unidos.** México, como mercado, paga bastante menos. Esta cifra es un **techo**, no un promedio mexicano.
2. Google lo dice él mismo: *"There's no guarantee or commitment that you'll earn this amount."* Y enumera lo que la mueve: demanda de anunciantes, ubicación del usuario, dispositivo, vertical, estacionalidad, formato y tamaño del anuncio, número de anuncios y tipo de cambio. [VERIFICADO]

### 2.2 La aritmética, con todos los supuestos sobre la mesa

**Supuestos declarados:**

| # | Supuesto | Valor | De dónde sale |
|---|---|---:|---|
| S1 | Mesas atendidas al día | 40 | Dato del encargo |
| S2 | Comensales por mesa | 2.5 | **Supuesto mío.** No existe dato mexicano público [NO ENCONTRADO] |
| S3 | Días de operación al mes | 30 | Supuesto mío |
| S4 | Pantallas con anuncio que ve cada comensal | 3 | Supuesto mío |
| S5 | Ingreso por mil vistas | US$2.62 | Google AdSense, Food & Drink, Américas [VERIFICADO] |
| S6 | Tipo de cambio | $17.1872 MXN/USD | DOF, 18-sep-2026 [VERIFICADO] |

**Escenario A — techo optimista (tarifa de "Américas", 3 anuncios por comensal):**

```
40 mesas × 2.5 comensales = 100 comensales al día
100 × 30 días = 3,000 sesiones de menú al mes
3,000 × 3 pantallas = 9,000 impresiones al mes
9,000 ÷ 1,000 × US$2.62 = US$23.58 al mes
US$23.58 × 17.1872 = $405 MXN al mes, por restaurante
```

**Escenario B — un solo anuncio por comensal:**

```
3,000 ÷ 1,000 × US$2.62 = US$7.86 al mes = $135 MXN al mes
```

**Escenario C — ajuste a México.** No existe un RPM mexicano verificable. Si México rindiera **la quinta parte** de la tarifa "Américas" (**supuesto mío, sin fuente; es el orden de magnitud típico entre un mercado de primer nivel y uno de segundo**):

```
Escenario A ajustado: $405 ÷ 5 = $81 MXN al mes
Escenario B ajustado: $135 ÷ 5 = $27 MXN al mes
```

### 2.3 Una segunda vía de cálculo, para ver si da lo mismo

Cuando un número importa, conviene llegar a él por dos caminos distintos.

**Datos:**
- Inversión publicitaria digital en México en 2024: **≈ US$4,497 millones** [ESTIMACIÓN: prensa especializada citando el estudio *Valor Total Media* de IAB México; no abrí el estudio]
- Usuarios de internet en México: **100.2 millones**, 83.1% de la población; **97.2% entra desde un celular** [VERIFICADO — INEGI, ENDUTIH 2024, comunicado 57/25]

```
US$4,497,000,000 ÷ 100,200,000 usuarios = US$44.88 al año por usuario
US$44.88 ÷ 365 = US$0.123 al día por usuario
```

**Ese es el valor publicitario diario completo de un mexicano conectado, sumando todo el internet: doce centavos de dólar.**

```
Techo teórico absurdo (si Carta se quedara con el 100% del valor publicitario
diario de esos 100 comensales, en todos los medios digitales):
100 × US$0.123 × 30 días = US$369 al mes = $6,340 MXN al mes
```

Ese techo es ficticio: supondría que un comensal no ve ningún otro anuncio en todo el día. Si Carta captura los 5 minutos que el comensal pasa en la carta, de las ~6 horas de pantalla que tiene al día (**supuesto mío**), eso es el **1.4%**:

```
$6,340 × 1.4% = $89 MXN al mes
```

**Las dos vías llegan al mismo sitio: entre veintitantos y cuatrocientos pesos al mes por restaurante, y la parte realista está en la banda baja.**

### 2.4 ¿Y la publicidad vista por restauranteros?

El dueño también plantea anuncios vistos por los restauranteros dentro del panel. Aquí el problema es de tamaño de audiencia, no de tarifa.

```
Restaurantes de servicio completo en CDMX: 8,142 (INEGI, Censos Económicos 2019)
Supongamos que Carta llega a 100 en el piloto
Cada dueño abre el panel 20 veces al mes = 2,000 impresiones al mes en total
Al CPM mexicano más generoso que citan las agencias ($180 MXN) [NO VERIFICADO]:
2,000 ÷ 1,000 × $180 = $360 MXN al mes — para TODA la red
```

**Trescientos sesenta pesos al mes por toda la red de restauranteros.** Menos de lo que cobra un solo plan Advanced de OlaClick. [ESTIMACIÓN propia]

### 2.5 Dónde sí sirve la publicidad: pagar el ancho de banda

Hay un uso honesto de este ingreso, y es el único que aguanta.

Google fija el máximo de un modelo 3D en Scene Viewer en **10 MB** (§6). Un platillo bien optimizado con compresión Draco y texturas KTX2 debería pesar **alrededor de 2 MB** (**supuesto mío**).

```
3,000 sesiones al mes × 3 platillos vistos × 2 MB = 18 GB al mes por restaurante
Si el modelo llega al tope de 10 MB: 3,000 × 3 × 10 MB = 90 GB al mes
```

Si el egreso del CDN costara **$1 MXN por GB** (**supuesto de sensibilidad; no cotizado**), el plan gratuito de un restaurante cuesta entre **$18 y $90 MXN al mes** en tráfico.

**Ese es el mismo orden de magnitud que los $27–$88 MXN que rinde la publicidad realista.** Es decir:

> **La publicidad puede cubrir el costo de infraestructura del nivel gratuito. No puede ser una línea de ingreso.**

Y hay un detalle práctico: las redes publicitarias tienen un umbral mínimo antes de pagar. Con $23 dólares al mes por restaurante, Carta necesitaría varios restaurantes solo para que Google le deposite. [NO VERIFICADO el umbral exacto de AdSense]

### 2.6 Sobre la analogía de Telcel

La intuición del dueño es correcta y el mecanismo que eligió no lo es.

Lo que hizo Telcel en los noventa **no fue financiarse con publicidad.** Fue partir el pago en pedazos tan pequeños que cualquiera pudiera comprar uno: la ficha de prepago. Cada usuario **sí pagaba**; solo que pagaba poquito y cuando quería. La infraestructura se repartió porque hubo millones de pagos chicos, no porque alguien pusiera anuncios.

**La traducción correcta de su analogía a Carta no es "anuncios", es "cupo".** Y eso ya está probado en su propio mercado:

- **OlaClick:** MX$200 por 75 pedidos al mes. [VERIFICADO]
- **Facturama (timbres del SAT):** **$0.50 MXN por folio** vía API. [VERIFICADO]
- **Stripe Connect:** **MXN35 al mes por cuenta activa** — y "activa" significa el mes en que esa cuenta efectivamente movió dinero. [VERIFICADO]

Los tres son el modelo Telcel bien hecho. La publicidad no lo es.

---

## 3. Pasarelas de pago en México: costos reales

### 3.1 La tabla, con lo publicado por cada quien

Todo consultado el **19 de septiembre de 2026** en la página oficial. "+ IVA" significa que el 16% se suma encima.

| Proveedor | Comisión publicada | ¿Pagos divididos / marketplace? | Costo fijo mensual | Depósito |
|---|---|---|---|---|
| **Stripe México** | **3.6% + $3.00 MXN** tarjetas nacionales · **+0.5%** internacionales · **+2%** si hay conversión de divisa · Terminal 3.6% + $3 · Disputas $150 MXN · Billing 0.7% del volumen · Tax 0.5% | **Sí — Connect**, con tres modelos. Ver §4.4 | **Ninguno en Payments.** En Connect, si la plataforma fija el precio: **MXN35/mes por cuenta activa + 0.25% + MXN12 por cada depósito**. Si Stripe le factura directo a las cuentas conectadas: **sin comisión para la plataforma** | **7 días naturales** el primero; **3 días hábiles** después |
| **Mercado Pago** | Point **3.5% + IVA**. Las comisiones de cobro en línea por plazo de acreditación **están detrás de un inicio de sesión y no se consultaron** | **Sí — Split de Pagos 1:1**, disponible en México. Ver §4.4 | Sin renta mensual en Point; terminales desde $99 | **[NO VERIFICADO]** |
| **Conekta** | Tarjeta **3.4% + $3.00 MXN + IVA** · SPEI **$12.50 + IVA** · Efectivo **2.6% + $3.00 + IVA** (mínimo $5.4) · Vales 4.4% + $3 · BNPL 4% o 6% · 3DS $1.50 | **[NO ENCONTRADO]** en su página pública | "Sin setup fees ni contratos eternos"; no publica mensualidad | *"El primer depósito suele reflejarse en tu cuenta bancaria durante los primeros 10 días hábiles del primer pago exitoso recibido"* |
| **Openpay (BBVA)** | Tarjeta **2.9% + $2.50 MXN + IVA** · Internacional **4.10% + IVA** · SPEI **$8.00 MXN + IVA** · Efectivo 2.9% + $2.50 + IVA. Meses sin intereses: **3 MSI 7.7%, 6 MSI 10.7%, 9 MSI 13.7%, 12 MSI 16.7%** (+IVA, a cargo del negocio) | **[NO ENCONTRADO]** | Cuenta sin costo | **Débito 1 día hábil** · Crédito 3 días hábiles · Efectivo 3 días hábiles |
| **Clip** | **2.99% + $1 + IVA** | **[NO ENCONTRADO]** producto público de marketplace | Ninguno | (ver investigación anterior) |
| **SumUp** | **3.50% + IVA** | **[NO ENCONTRADO]** | **0 costo mensual, 0 costos administrativos** | **[NO VERIFICADO]** |
| **PayPal México** | **3.95% + $4.00 MXN** estándar. Por volumen mensual: 3.65% (de $50 mil a $250 mil), 3.45% (a $500 mil), 3.15% (a $1 millón), **2.95%** (arriba de $1 millón). Internacional: +0.50% | **[NO VERIFICADO]** | Sin mensualidad publicada | Transferencia estándar al banco sin cargo; **transferencia instantánea $40.00 MXN**. Documento actualizado 15-jul-2026 |
| **Kushki** | **No publica.** Hay que hablar con ventas | Documenta "comisiones a terceros" (split) | — | — |
| **Nuvei** | **No publica** | Promociona marketplaces | — | — |

### 3.2 El piso que nadie puede cruzar: la cuota de intercambio

Antes de comparar precios conviene saber cuál es el costo que ninguna pasarela puede evitar. Es la **cuota de intercambio**, lo que el adquirente le paga al banco que emitió la tarjeta.

De las *Disposiciones de carácter general aplicables a las Redes de Medios de Disposición* (Banxico y CNBV, DOF 11-mar-2014, **texto compilado con la modificación del 27 de abril de 2026**), Anexo 1:

| Giro comercial | Crédito | Débito |
|---|---:|---:|
| Comida Rápida | 1.17% | 0.75% |
| **Restaurantes** | **1.76%** | **1.15%** |
| **Agregadores** | **1.76%** | **1.15%** |
| Ventas al detalle | 1.53% | 1.15% |
| Gasolineras | 1.00% | 0.45% |
| Supermercados | 1.53% | 1.10% |

[VERIFICADO — Banxico]

Dos cosas que decide esta tabla:

1. **Nadie puede cobrarle a un restaurante menos de 1.76% en crédito y seguir ganando.** Ese es el costo de mercancía.
2. **Un agregador paga exactamente lo mismo que un restaurante.** No hay ventaja de tarifa por ser intermediario; la ventaja, si existe, es operativa.

### 3.3 Lo que de verdad paga un restaurante mexicano hoy

Este es, con mucho, el dato más importante de todo el documento y casi nadie lo usa, aunque es público: **Banxico publica la tasa de descuento promedio que cada procesador le cobra a los restaurantes.**

**Restaurantes — julio de 2026** [VERIFICADO — Banxico]

| Institución | Débito (promedio) | Crédito (promedio) |
|---|---:|---:|
| EMSPayments | **1.49%** | **1.96%** |
| EVO | 1.55% | 2.27% |
| **BBVA Bancomer** | **1.65%** | **2.33%** |
| Inbursa | 1.77% | 2.55% |
| Getnet | 1.79% | 2.26% |
| Banorte | 1.85% | 2.23% |
| Global Payments | 1.93% | 2.15% |
| Banregio | 2.00% | 2.46% |
| Scotiabank | 2.11% | 2.55% |
| Adyen | 2.12% | 2.16% |
| Billpocket | 2.31% | 2.62% |
| Mercado Pago | **3.39%** | **3.39%** |
| Conekta | **3.40%** | **3.40%** |
| PayPal | **3.49%** | **3.49%** |
| **Clip** | **3.49%** | **3.50%** |
| **Stripe** | **3.59%** | **3.59%** |

**La lectura es dura y clara:** en México, **las pasarelas y agregadores son la opción más cara para un restaurante.** Un restaurante de servicio completo con volumen ya tiene contrato con un banco adquirente cerca del 1.7–2.3%. Clip, Stripe, Mercado Pago y Conekta están todos arriba del 3.3%. Esas empresas no le venden al restaurante grande: le venden al negocio que **no puede** conseguir contrato bancario, y cobran la prima de no pedir papeles.

### 3.4 Qué pasaría si Carta llevara el cobro con tarjeta

**Supuestos declarados:** ticket promedio de $500 MXN (**supuesto mío — no existe ticket promedio mexicano publicado, ver la investigación anterior**); 40 mesas al día; 30 días al mes; la mitad de las cuentas se pagan con tarjeta de crédito.

```
Hoy, con BBVA Bancomer (2.33% crédito):
$500 × 2.33% = $11.65 por cuenta

Con Stripe (3.6% + $3.00 MXN):
$500 × 3.6% = $18.00 + $3.00 = $21.00 por cuenta

Sobrecosto por cuenta: $21.00 − $11.65 = $9.35
```

```
Cuentas al mes: 40 × 30 = 1,200
Pagadas con tarjeta de crédito (la mitad): 600

Sobrecosto mensual: 600 × $9.35 = $5,610 MXN al mes
```

**Cinco mil seiscientos pesos al mes de sobrecosto, para "ahorrarse" una mensualidad de $349.** Es dieciséis veces peor. [ESTIMACIÓN propia, con tasas verificadas]

Y todavía falta el IVA sobre la comisión de Stripe, y los **MXN35 por cuenta activa + 0.25% + MXN12 por depósito** de Connect si Carta controla el precio.

**Conclusión de la §3:** en el segmento de servicio completo, **Carta no debe ser el procesador de pagos.** Ni regalando el software. La matemática mexicana no lo permite. Si algún día Carta cobra con tarjeta, tiene que ser **encima del contrato que el restaurante ya tiene**, no reemplazándolo.

---

## 4. La pregunta regulatoria: en qué se convierte Carta si cobra dinero

Esta es la sección más importante. **No es asesoría legal.** Es lo que dicen las fuentes primarias, con la cita textual, para que un abogado fintech mexicano lo confirme antes de escribir una sola línea de código de cobros.

### 4.1 El artículo que lo decide todo

**Ley para Regular las Instituciones de Tecnología Financiera** (la "Ley Fintech"), publicada en el DOF el **9 de marzo de 2018**, **última reforma DOF 14-11-2025**. Texto vigente consultado en la Cámara de Diputados el 19-sep-2026. [VERIFICADO]

> **Artículo 22.-** Los servicios realizados con el público de manera habitual y profesional, consistentes en la **emisión, administración, redención y transmisión de fondos de pago electrónico**, por medio de los actos que a continuación se señalan, a través de aplicaciones informáticas, interfaces, páginas de internet o cualquier otro medio de comunicación electrónica o digital, **solo podrán prestarse por las personas morales autorizadas por la CNBV**, previo acuerdo del Comité Interinstitucional, **como instituciones de fondos de pago electrónico**:
>
> **I.** Abrir y llevar una o más **cuentas de fondos de pago electrónico por cada Cliente**, en las que se realicen registros de abonos equivalentes a la cantidad de fondos de pago electrónico emitidos contra la recepción de una cantidad de dinero […];
>
> **II.** Realizar transferencias de fondos de pago electrónico entre sus Clientes […];
>
> **III.** Realizar transferencias de determinadas cantidades de dinero […] entre sus Clientes y aquellos de otra institución de fondos de pago electrónico […];
>
> **IV.** Entregar una cantidad de dinero […] equivalente a la misma cantidad de fondos de pago electrónico en una cuenta […];
>
> **V.** Mantener actualizado el registro de cuentas […]

**La bisagra está en la palabra "cuentas".** Lo reservado no es "cobrar por cuenta de alguien más": es **abrir y llevar cuentas con saldo por cada cliente**. El artículo 23 lo refuerza: los fondos de pago electrónico son aquellos "contabilizados en un registro electrónico de cuentas transaccionales que, al efecto, lleve una institución de fondos de pago electrónico". [VERIFICADO]

**Traducción para Carta:** si Carta recibe el dinero del comensal, lo guarda —aunque sea tres días— y luego lo entrega al restaurante, **está llevando un saldo a nombre de un tercero.** Eso es el artículo 22.

### 4.2 Lo que cuesta ser IFPE, y lo que cuesta no serlo y hacerlo de todos modos

**Capital mínimo** — *Disposiciones de carácter general aplicables a las Instituciones de Tecnología Financiera* (CNBV), artículos 6 y 7 [VERIFICADO, texto leído directamente]:

> **Artículo 6.-** […] Tratándose de **instituciones de fondos de pago electrónico** que hayan sido autorizadas para realizar sus Operaciones en moneda nacional y cuya autorización no contemple la realización de operaciones adicionales […], el capital mínimo con el que deberán contar será […] el equivalente en moneda nacional a **500,000 UDI's**.

> **Artículo 7.-** […] operaciones con activos virtuales; operaciones en moneda extranjera; actuar como cámara de compensación […] **700,000 UDI's**.

Valor de la UDI al **19 de septiembre de 2026: 8.821075 pesos** [VERIFICADO — DOF, indicadores del día].

```
500,000 UDIS × 8.821075 = $4,410,537.50 MXN
700,000 UDIS × 8.821075 = $6,174,752.50 MXN
```

*(El artículo 8 precisa que para el cumplimiento se usa el valor de la UDI del 31 de diciembre del año anterior; el cálculo de arriba es orden de magnitud, no la cifra exacta de cumplimiento.)*

**La sanción por hacerlo sin autorización** — Ley Fintech, artículo 124 [VERIFICADO, texto leído directamente]:

> **Artículo 124.-** Será sancionado con pena de **prisión de siete a quince años** y **multa de 5,000 a 150,000 UMA** quien:
>
> **I.** Lleve a cabo operaciones o actividades de las **reservadas para las ITF** […] **sin contar con la autorización prevista en esta Ley** […]

Valor de la UMA 2026: **$117.31 diarios** (INEGI, publicada en el DOF el 9-ene-2026, vigente del 1-feb-2026 al 31-ene-2027) [ESTIMACIÓN: el valor viene de múltiples fuentes concordantes que citan el comunicado del INEGI; no abrí el PDF del comunicado].

```
Multa mínima:   5,000 × $117.31 =    $586,550 MXN
Multa máxima: 150,000 × $117.31 = $17,596,500 MXN
```

**Siete a quince años de cárcel y hasta diecisiete millones y medio de pesos de multa.** Esto no es un riesgo de negocio: es una raya que no se cruza.

**Si Carta llegara a ser IFPE**, además tendría que respetar los niveles de cuenta de la **Circular 12/2018 de Banxico** (DOF 10-sep-2018), disposición 9ª [VERIFICADO, texto leído directamente]:

| Nivel de cuenta | Abonos por cliente al mes | Saldo máximo |
|---|---|---|
| **Nivel 1** | 750 UDIS ($6,616 MXN) | **1,000 UDIS ($8,821 MXN)** |
| **Nivel 2** | 3,000 UDIS ($26,463 MXN) | sin tope específico |
| Nivel 3 | Sin límite | Sin límite |

Y el sobregiro permitido no puede exceder **15 UDIS**.

### 4.3 La otra trampa que casi nadie menciona: el transmisor de dinero

Hay una segunda licencia que Carta podría disparar sin darse cuenta. La **Ley General de Organizaciones y Actividades Auxiliares del Crédito**, artículo 81-A Bis, define al **transmisor de dinero** como quien, de manera habitual y a cambio de una comisión, **recibe recursos en territorio nacional con el único propósito de transferirlos** a otro lugar o **entregarlos al beneficiario designado**. [ESTIMACIÓN: leído en reproducciones del texto legal y en la página de la CNBV sobre transmisores de dinero; no abrí el PDF oficial de la ley]

Para operar así hay que estar inscrito en el **Registro de Centros Cambiarios y Transmisores de Dinero (RECC-TD)**, con **dictamen técnico favorable de la CNBV** (artículo 85 Bis).

"Recibo el dinero del comensal con el único propósito de entregárselo al restaurante" es, leído literalmente, esa definición. **Es la segunda razón para no tocar el dinero.**

### 4.4 El camino que sí evita la licencia

**La regla es de una línea: si el dinero nunca cae en una cuenta de Carta, Carta no necesita licencia.** Las dos pasarelas grandes tienen un producto hecho exactamente para eso.

**Stripe Connect** distingue tres tipos de cargo, y la diferencia es de quién es el saldo [VERIFICADO — documentación oficial de Stripe]:

| Tipo de cargo | Dónde cae el dinero | ¿Carta guarda dinero ajeno? |
|---|---|---|
| **Cargos Direct** | *"Creas un cargo en tu cuenta conectada, por lo que el pago aparecerá en el saldo de la cuenta conectada y no en el saldo de tu plataforma. […] El saldo de tu plataforma aumenta con las comisiones de la plataforma que cobras por un cargo."* | **No.** El restaurante es el comercio. Carta solo cobra una comisión de plataforma |
| **Cargos a un destino** | *"Creas un cargo en tu plataforma para que el pago aparezca en el saldo de tu plataforma. Una parte de los fondos se transfiere de inmediato al saldo de la cuenta conectada."* | **Sí, aunque sea un instante** |
| **Cargos y envíos de fondos separados** | *"Primero, creas un cargo en la cuenta de tu plataforma. Crea una transferencia por separado […]"* | **Sí, y por más tiempo** |

En los cargos Direct, además, *"Los reembolsos y contracargos reducen el saldo de la cuenta conectada"* — es decir, el riesgo también es del restaurante, no de Carta. En los otros dos, *"el importe disputado y la comisión se debitan automáticamente del saldo de tu plataforma"*.

**Mercado Pago — Split de Pagos 1:1.** Disponible en México. Requisitos publicados [VERIFICADO]:

- *"Para integrar, necesitas una cuenta de vendedor en Mercado Pago con un nivel de identificación **KYC 6**"*
- *"Los revendedores en el Marketplace deben pasar por el proceso de autorización **OAuth**"*
- Integra con Checkout Pro y Checkout API
- *"El modelo 1:N está disponible únicamente para vendedores de cartera asesorada"*

Es decir: **cada restaurante abre su propia cuenta de Mercado Pago, pasa su propio KYC y le da permiso a Carta por OAuth.** El dinero es del restaurante desde el primer segundo.

### 4.5 La prueba de que este camino es el correcto

El **padrón oficial de la CNBV** de Instituciones de Fondos de Pago Electrónico, consultado el 19-sep-2026, tiene **40 entidades autorizadas**. [VERIFICADO]

**Están en la lista:** Clip AI, S.A. de C.V. · MercadoLibre, S.A. de C.V. · PayPal Payments México, S.A.P.I. de C.V. · Cuenca · STP · Cartera Digital WalMart · Toka · Edenred · Pluxee · NVIO · Belvo Pagos · Arcus, entre otras.

**No están en la lista:** **Stripe · Conekta · Openpay · Kushki · Nuvei.**

**Eso lo dice todo.** Stripe, Conekta y Openpay procesan miles de millones de pesos en México **sin ser IFPE**, porque operan como pasarela y agregador bajo el paraguas de un banco adquirente y **no llevan cuentas con saldo a nombre de terceros**. Clip, Mercado Pago y PayPal sí llevan saldo (sus usuarios tienen monedero), y por eso sí necesitaron la licencia.

**Carta debe parecerse a Stripe, no a Clip.**

### 4.6 Si aun así Carta quisiera ser agregador

Existe la figura, está regulada y **no requiere autorización de la CNBV** — pero tiene obligaciones reales. De las *Disposiciones aplicables a las Redes de Medios de Disposición* [VERIFICADO]:

> **Agregador:** al Participante en Redes que, **al amparo de un contrato de prestación de servicios celebrado con un Adquirente**, ofrece a Receptores de Pagos el servicio de aceptación de Pagos con Tarjetas y, en su caso, provee la infraestructura de TPVs conectadas a dichas redes.

Lo que exige:

- **Un contrato con un Adquirente** (un banco o adquirente licenciado). Sin ese contrato no hay figura.
- **Disposición 13ª:** registrar ante Banxico, a través de la Dirección de Información del Sistema Financiero, **cada una de las Comisiones o Tasas de Descuento** que cobre, y cada modificación. Banxico las publica.
- **Disposición 14ª:** entregar estados de cuenta a los Receptores de Pagos con periodicidad **no mayor a un trimestre**, en el formato del Anexo 3.
- **Visitas domiciliarias:** el contrato con el Adquirente debe prever *"la obligación de estos para recibir visitas domiciliarias por parte de las Autoridades"* (CNBV y Banxico conjuntamente).
- Reportar a Banxico la Tasa de Descuento que le paga al Adquirente, en el Formato A.

**Para un proyecto de una persona sin inversión, esto es meses de trámite y una relación bancaria que hoy no existe.** No es una prohibición, es una puerta que hoy no está abierta.

---

## 5. CoDi y DiMo

### 5.1 CoDi, con los números de Banxico

**Cómo funciona y qué cuesta** [VERIFICADO — banxico.org.mx]:

- Plataforma del Banco de México para cobrar y pagar desde el celular con **QR y NFC**, 24/7. Opera desde el **30 de septiembre de 2019**.
- **"Las operaciones por CoDi® no generan comisiones adicionales."** Texto literal de Banxico. Ni al que paga ni al que cobra.
- Para aceptar CoDi un negocio necesita dos cosas: **una cuenta en una institución financiera** y **una aplicación que genere mensajes de cobro** — de su propio banco, de un desarrollador externo, o **la app CoDi del propio Banxico, que es gratuita**.
- Viaja sobre SPEI.

**La adopción, con datos oficiales:**

| Indicador | Valor | Fuente |
|---|---:|---|
| **Cuentas validadas acumuladas** | **22,750,207** al cierre del 1T-2026 | Banxico, hoja de cálculo oficial de `codi.org.mx`, actualizada 25-jun-2026. **Cifra obtenida sumando las 32 entidades federativas** [VERIFICADO] |
| Cuentas validadas al cierre 4T-2025 | 22,321,311 | ídem |
| Crecimiento del trimestre | +428,896 | ídem [ESTIMACIÓN propia: la resta] |

**Y ahora la cifra que nadie enseña.** El Sistema de Información Económica de Banxico (cuadro **CF884**, "Operaciones realizadas a través de CoDi", serie diaria) publicaba estos últimos tres días al 19-sep-2026 [VERIFICADO]:

| Día | Operaciones en todo México | Monto |
|---|---:|---:|
| 25/07/2026 | **7,425** | $7,758,533 MXN |
| 26/07/2026 | **5,470** | $3,538,804 MXN |
| 27/07/2026 | **11,687** | $12,985,859 MXN |

```
Total tres días: 24,582 operaciones · $24,283,196 MXN
Promedio diario nacional: 24,582 ÷ 3 = 8,194 operaciones al día
Ticket promedio: $24,283,196 ÷ 24,582 = $988 MXN
```

**Ocho mil doscientos pagos al día en todo México.** Con un ticket promedio de casi mil pesos, que es ticket de pago entre negocios o entre personas, no de consumo en restaurante.

Para dimensionarlo contra el mercado de Carta:

```
Restaurantes de servicio completo en México: 59,296 (INEGI, CE 2019)
Si cada uno hiciera UN cobro con CoDi al día: 59,296 pagos al día
59,296 ÷ 8,194 = 7.2 veces todo el volumen nacional actual de CoDi
```

**Siete años después de su lanzamiento, si los restaurantes de servicio completo de México cobraran una sola cuenta al día con CoDi, multiplicarían por siete el sistema entero.**

### 5.2 ¿Sirve CoDi para el nivel gratuito?

**Sí, pero como cortesía, no como sistema de cobro.** Y por una razón muy práctica que juega a favor de Carta:

**Carta no necesita integrar nada.** El restaurante genera su propio QR de CoDi desde la app de su banco, o desde la app gratuita de Banxico. Carta puede simplemente **mostrar ese QR** en la pantalla de la cuenta y dejar que el mesero marque la mesa como pagada. Eso cuesta **cero pesos, cero integración, cero licencia, cero riesgo regulatorio** — porque el dinero va del comensal al banco del restaurante sin pasar por ningún lado.

Lo que no hay que hacer es prometerle al restaurantero que CoDi va a resolverle los cobros. Con 8,194 operaciones diarias nacionales, casi ningún comensal lo tiene configurado.

*(Nota: circula que Banxico publicó modificaciones en el DOF el 17-jun-2026 obligando a las instituciones a estandarizar la experiencia de SPEI, CoDi y DiMo antes del **14 de diciembre de 2026**. [ESTIMACIÓN: prensa especializada; no abrí el DOF de esa fecha.] Si es cierto, vale la pena volver a medir CoDi en 2027.)*

### 5.3 DiMo

- Permite **enviar y recibir dinero usando solo el número de celular**, asociado a una cuenta bancaria. Viaja sobre SPEI. Disponible dentro de las apps de las instituciones participantes. **Sin comisión, instantáneo, 24/7.** [ESTIMACIÓN: verificado en la página de educación financiera de BBVA; **la página oficial de Banxico sobre DiMo devolvió error 404** el 19-sep-2026]
- Más de **12 millones de cuentas vinculadas**, operado por una veintena de instituciones. [ESTIMACIÓN: prensa citando a Banxico]

**Para Carta, DiMo sirve menos que CoDi.** Está diseñado para mandarle dinero a una persona por su celular, no para que un negocio cobre una cuenta con una referencia. No hay mensaje de cobro con monto y concepto como en CoDi. Conciliar cuál transferencia corresponde a cuál mesa sería manual.

---

## 6. Generación de modelos 3D en el propio teléfono

### 6.1 La respuesta corta

**Hoy no existe, con evidencia verificable, un modelo generativo de imagen-a-3D que corra dentro de un teléfono.** [NO ENCONTRADO]

Busqué específicamente conversiones a Core ML, ONNX o TFLite de los modelos del estado del arte (TRELLIS, Hunyuan3D, Stable Fast 3D), demos en NPU de celular, y despliegues en producción. No encontré ninguna. Lo que hay son servicios de nube.

**La referencia de cuánto cómputo pide esto:** **Stable Fast 3D** de Stability AI genera una malla texturizada en **0.5 segundos**, pero **necesita una GPU con 7 GB de VRAM** (6 GB para las opciones por defecto). [VERIFICADO — Stability AI] Eso es una tarjeta gráfica de escritorio, no un celular. Como referencia de lo que mejoró: su antecesor SV3D tardaba 10 minutos.

### 6.2 Lo que sí corre en el teléfono

Hay dos tecnologías que sí funcionan localmente, y ninguna es "IA generativa".

**1. Apple Object Capture / `PhotogrammetrySession`** (RealityKit) [VERIFICADO — documentación oficial de Apple]:

- Disponibilidad: **iOS 17.0+, iPadOS 17.0+, Mac Catalyst 16.0+, macOS 13.0+**
- Cómo funciona: *"You provide RealityKit Object Capture with a series of well-lit photographs taken from many different angles. It analyzes the overlap area between different images to match up landmarks and produces a 3D model of the photographed object."*
- Comprobación de compatibilidad en tiempo de ejecución: `PhotogrammetrySession.isSupported` — *"Returns true if the current hardware supports Object Capture."*
- Salida: USDZ
- **Solo iPhone.** Apple no publica una lista de modelos compatibles; los foros de desarrolladores reportan que funciona solo en modelos Pro (12 Pro en adelante). [ESTIMACIÓN: foro de desarrolladores de Apple, no una lista oficial]
- **No es generación:** hay que tomar decenas de fotos bien iluminadas dando la vuelta al platillo.

**2. Scaniverse (Niantic)** [ESTIMACIÓN: declaraciones de la página de Niantic y reseñas de terceros; `scaniverse.com` ahora redirige a `nianticspatial.com`]:

- **Gratis**, iOS y Android
- **Procesamiento completamente en el dispositivo**, sin conexión a internet
- iPhone 12 o más nuevo para capturar y publicar splats
- Exporta a formato SPZ, típicamente 15–25 MB para una escena de habitación
- **Pero un Gaussian splat no es una malla glTF.** No se mete en un menú web con `<model-viewer>` sin convertirlo, y la conversión pierde calidad.

### 6.3 Si es en la nube, cuánto cuesta por modelo

**Meshy**, con precios publicados **en pesos mexicanos** en su propio sitio, consultados el 19-sep-2026 [VERIFICADO]:

| Plan | Precio | Créditos/mes | Tope de assets/mes | API | Licencia | Retención |
|---|---:|---:|---:|---|---|---|
| Free | **MX$0** | 100 | hasta 10 | No | **CC BY 4.0** (no propietaria) | — |
| Starter | **MX$175/mes** | 250 | hasta 25 | No | Privada, del cliente | — |
| **Pro** | **MX$349/mes** | 1,000 | hasta 100 | **Sí** | Privada, del cliente | 3 días |
| Premium | **MX$698/mes** | 3,000 | hasta 300 | Sí | Privada, del cliente | 3 días |
| Studio | (ver plan) | 5,500 | hasta 550 | Sí | Privada, del cliente | 14 días |

**Costo por crédito de imagen-a-3D** (página de API de Meshy, [VERIFICADO]): **20 créditos sin textura, 30 con textura, 35 con textura 8K**.

```
Plan Pro (MX$349/mes, 1,000 créditos):
1,000 ÷ 30 créditos por modelo texturizado = 33 modelos al mes
MX$349 ÷ 33.3 = MX$10.47 por platillo

Plan Premium (MX$698/mes, 3,000 créditos):
3,000 ÷ 30 = 100 modelos al mes
MX$698 ÷ 100 = MX$6.98 por platillo

Digitalizar una carta de 50 platillos:
50 × 30 créditos = 1,500 créditos → NO cabe en Pro (1,000), SÍ en Premium (3,000)
Costo: UN mes de Premium = MX$698, más el trabajo humano de limpieza
```

*(Hay una inconsistencia en la propia tabla de Meshy: el plan Pro dice "1,000 créditos" y a la vez "hasta 100 assets/mes", lo que daría 10 créditos por asset. Las dos páginas son suyas. Uso la tarifa de la página de API, que es la conservadora.)*

**Tres observaciones importantes:**

1. **El plan gratuito de Meshy entrega los modelos con licencia CC BY 4.0.** Eso significa atribución obligatoria y, en la práctica, que **no son propiedad del restaurante**. Para un producto comercial eso no sirve.
2. **Los assets se retienen 3 días en Pro y Premium.** El "respaldo de modelos 3D" que el dueño quiere vender como función de paga **es un problema real que Meshy no resuelve**. Eso justifica cobrarlo.
3. **MX$349 es, por coincidencia, exactamente el precio del plan Pro de Meshy y exactamente lo que Carta pensaba cobrar.** Si Carta cobra $349 y gasta $349 en generación, el margen es cero.

### 6.4 Cuánto puede pesar un modelo para que cargue bien

Google publica los límites duros de **Scene Viewer** (el visor de RA de Android) [VERIFICADO — developers.google.com]:

| Parámetro | Límite |
|---|---|
| Formato | glTF 2.0 / GLB (extensiones `KHR_materials_unlit`, `KHR_texture_transform`) |
| **Tamaño del modelo** | **10 MB** — *"Bigger models may result in poor user experience"* |
| **Triángulos** | **Límite recomendado 100,000; rango ideal 30,000 a 50,000** |
| **Materiales** | Límite recomendado **10**, dos de ellos pueden ser alpha |
| **Textura máxima** | **2048 × 2048**, en PNG-24, PNG-8 indexado o JPG (JPG preferido si no hay transparencia), espacio sRGB |
| Huesos | 254 (límite duro) |
| Pesos por vértice | 4 (límite duro) |
| Coordenadas UV | 1 UV por malla (límite duro) |
| Dispositivo | Compatible con ARCore, Android 7.0 (API 24) o superior |

**Por qué esto importa tanto en México:** el **97.2% de los usuarios de internet accede desde un celular** [VERIFICADO — INEGI, ENDUTIH 2024]. No hay plan B de escritorio.

**Consecuencia de diseño, con aritmética:**

```
Carta de 20 platillos × 10 MB (el tope) = 200 MB
Carta de 20 platillos × 2 MB (bien optimizado) = 40 MB
```

Ninguna de las dos se puede precargar al escanear el QR. **Carta tiene que cargar un platillo a la vez, bajo demanda, y comprimir con Draco y KTX2.** Y el "límite de calidad de generación" que el dueño quiere vender como función de paga tiene un techo físico: **por encima de 2048 px de textura y 100 mil triángulos, el modelo deja de cargar bien, sin importar cuánto pague el restaurante.**

---

## 7. "Paga solo lo que uses" en mercados emergentes

Ejemplos reales, con cifras, ordenados de más a menos parecido a lo que Carta necesita.

### 7.1 Cupo mensual de operaciones

**OlaClick** — el ejemplo más directamente transferible, porque es el mismo país, el mismo tipo de cliente y precios en pesos. Consultado el 19-sep-2026 [VERIFICADO]:

| Plan | Precio anual | Precio mensual | **Cupo** |
|---|---:|---:|---|
| Gratis | MX$0 | MX$0 | (con publicidad en el menú) |
| **Advanced** | **MX$200/mes** | MX$235.30 | **75 pedidos al mes** |
| **Premium** | **MX$500/mes** | MX$588 | **400 pedidos al mes** |
| **Elite** | **MX$1,203/mes** | MX$1,415 | **Ilimitado** |
| Infinity | MX$3,146/mes | MX$3,701 | Ilimitado + multisucursal |

Las dos frases que valen oro, textuales de sus preguntas frecuentes:

> *"Cada plan incluye un dominio gratuito por un año y **un menú sin publicidad**."*

> *"**OlaClick no cobra ninguna comisión sobre los pedidos** realizados a través de su plataforma. […] La plataforma cobra únicamente una tarifa mensual fija."*

La tabla comparativa lista **"Menú digital sin publicidad"** como una fila con palomita en los cuatro planes de paga. **Es decir: el plan gratuito lleva anuncios y quitarlos es la función de paga número uno.** Exactamente el modelo del dueño. Y el precio de entrada está puesto en **MX$200**.

**Aritmética de su escalera:**

```
Advanced: MX$200 ÷ 75 pedidos = MX$2.67 por pedido
Premium:  MX$500 ÷ 400 pedidos = MX$1.25 por pedido
```

El precio por pedido baja **53%** al subir de plan. Eso es diseño de escalera, no improvisación.

### 7.2 Créditos prepagados

**Meshy** — 100 / 250 / 1,000 / 3,000 / 5,500 créditos al mes, con plan gratuito de 10 assets bajo licencia CC BY 4.0. Ver §6.3. [VERIFICADO]

**Timbres fiscales del SAT** — el modelo de "paga solo lo que uses" más entendido en México, porque todo negocio con contador ya lo conoce. **Facturama**, precios publicados [VERIFICADO]:

| Producto | Precio | Por unidad |
|---|---:|---:|
| 10 folios (vigencia 1 año) | $55 MXN | $5.50 |
| 25 folios | $110 MXN | $4.40 |
| 40 folios | $165 MXN | $4.13 |
| Ilimitado (1 año) | $1,650 MXN | — |
| **Folios por API, de 1 a 10,000** | — | **$0.50 MXN cada uno** |
| Folios por API, de 10,001 a 50,000 | — | $0.45 MXN |
| Módulo API (anual) | $1,650 MXN | — |
| Prueba | 30 días de folios de prueba | — |

**El dato accionable para Carta: timbrar un CFDI cuesta 50 centavos.** Si Carta llegara a emitir la factura del comensal, el costo variable por cuenta es medio peso. Eso se puede regalar o cobrar; lo que no se puede es ignorarlo, porque el restaurante está obligado a emitir la factura global dentro de **24 horas** (regla 2.7.1.21 de la RMF 2026, ya verificada en la investigación anterior).

### 7.3 Software gratis, pago solo cuando hay transacción

| Ejemplo | Cómo funciona | Marca |
|---|---|---|
| **Square Free** | $0/mes. *"Only pay when you take a payment."* 2.6% + 15¢ presencial | [VERIFICADO] |
| **Toast Starter Kit** | $0/mes de software; hardware aparte; requiere procesar con Toast | [VERIFICADO] |
| **SumUp México** | $0 mensual, software de punto de venta gratis, 3.50% + IVA solo cuando se cobra | [VERIFICADO] |
| **Waitry Lite** | Gratis con 3% de comisión por transacción | (investigación anterior) |
| **Stripe Connect** | **MXN35 al mes por cuenta activa** — y "activa" es el mes en que esa cuenta **efectivamente hizo transferencias al banco**. Un restaurante que no vendió, no cuesta | [VERIFICADO] |

**Stripe Connect merece atención especial**, porque resuelve el problema económico del plan gratuito: **Carta no paga por los restaurantes que no facturan.** Esa es la definición pura de "paga solo lo que uses", y está del lado del proveedor.

---

## 8. Recomendación

### 8.1 Tres caminos, con lo que exigen y lo que rinden

---

#### **Camino A — "Gratis con anuncios y cupo, sin tocar dinero"** ← **el recomendado**

**Qué es.** Carta nunca procesa un peso. El nivel gratuito da menú 3D, orden en mesa y sesión compartida; el restaurante cobra **en efectivo** y, si quiere, mostrando **su propio QR de CoDi** (que genera su banco, no Carta). Los planes de paga quitan la publicidad, levantan el cupo de mesas, respaldan los modelos 3D y suben la calidad de generación. Si más adelante hay cobro con tarjeta, es con **cargos Direct de Stripe Connect**, donde el restaurante es el comercio.

**Qué exige:**

| Concepto | Costo | Marca |
|---|---:|---|
| Licencias regulatorias | **$0** | [VERIFICADO — §4] |
| Generación 3D: Meshy Premium | MX$698/mes (100 platillos) | [VERIFICADO] |
| Stripe Connect, si se activa tarjeta | MXN35/mes por restaurante activo + 0.25% + MXN12 por depósito | [VERIFICADO] |
| Timbrado CFDI, si se emite factura | $0.50 MXN por folio + $1,650/año del módulo API | [VERIFICADO] |
| CDN del nivel gratuito | 18–90 GB al mes por restaurante | [ESTIMACIÓN propia, §2.5] |
| Revisión legal mexicana | **Sin cotizar** | [NO ENCONTRADO] |

**Qué rinde.** Suscripción. Con la escalera de OlaClick como referencia de mercado: MX$200 por un cupo chico, MX$500 por uno grande. **La publicidad cubre el ancho de banda del nivel gratuito ($27–$88 MXN al mes contra $18–$90 MXN de tráfico), y nada más** (§2.5).

**Tiempo al piloto: semanas.** No hay trámite que esperar.

---

#### **Camino B — "Agregador de pagos bajo contrato con un Adquirente"**

**Qué es.** Carta firma con un banco adquirente y cobra por cuenta de los restaurantes, quedándose el diferencial entre lo que le cobra al restaurante y la tasa de descuento que le paga al adquirente.

**Qué exige:**
- Contrato con un adquirente que quiera volumen que Carta todavía no tiene
- Registro de cada Comisión y Tasa de Descuento ante Banxico, y de cada cambio (disposición 13ª)
- Estados de cuenta a cada restaurante, al menos cada trimestre (disposición 14ª)
- Aceptar visitas domiciliarias de la CNBV y de Banxico
- Cumplimiento PCI
- **Sin autorización de la CNBV**, pero con obligaciones permanentes

**Qué rinde.** El diferencial. Y aquí está el problema: la cuota de intercambio para restaurantes es **1.76% crédito / 1.15% débito** (§3.2), y el restaurante de servicio completo ya paga **1.65%–2.33%** con su banco (§3.3). **El espacio entre el piso y lo que el cliente ya paga es de décimas de punto.** Los agregadores que hoy cobran 3.4%–3.6% le venden a quien no tiene contrato bancario, no al segmento de Carta.

**Tiempo al piloto: meses.** No llega a diciembre.

---

#### **Camino C — "Institución de Fondos de Pago Electrónico"**

**Qué exige:** **$4,410,538 MXN de capital mínimo** al valor de la UDI de hoy, autorización de la CNBV previo acuerdo del Comité Interinstitucional, y meses o años de trámite. Operar sin la autorización: **siete a quince años de prisión y multa de $586,550 a $17,596,500 MXN.**

**Veredicto: descartado.** No es una opción que se evalúe, es una que se anota para no pisarla por accidente.

---

### 8.2 Qué recomiendo para alguien solo, sin inversión, con piloto en diciembre

**El Camino A, y con una restricción extra que conviene aceptar de entrada: en el piloto de diciembre, Carta no cobra con tarjeta. Ni con Stripe.**

Tres razones, todas con número:

1. **Porque no se necesita.** Lo que Carta tiene que probar en diciembre es si el comensal ordena desde la mesa y si la cocina recibe la comanda. El cobro es un problema resuelto: el restaurante ya tiene terminal. Meter pagos multiplica el riesgo regulatorio, el trabajo y el soporte, para validar algo que nadie duda.

2. **Porque saldría caro para el cliente.** Llevar el cobro por Stripe le cuesta al restaurante **unos $5,610 MXN al mes de sobrecosto** frente a su contrato bancario (§3.4). Ningún restaurante de servicio completo va a aceptar eso, y presentárselo quema la relación en la primera llamada.

3. **Porque es la única forma de estar seguro de que no se cruzó ninguna raya.** Si Carta nunca recibe un peso, no hay artículo 22, no hay artículo 124, no hay transmisor de dinero, y no hace falta gastar en un despacho fintech antes de saber si el producto sirve.

**Y sobre la publicidad, la recomendación es incómoda pero honesta:** ponerla, sí, pero **no venderla como modelo de negocio ni en el pitch ni en la cabeza**. Es un mecanismo para que el nivel gratuito no cueste dinero, y es un motivo de compra ("págame y te la quito") que OlaClick ya demostró que funciona en México. **Rinde entre veintisiete y cuatrocientos pesos al mes por restaurante** (§2.2). Presentarla como línea de ingreso ante un inversionista, un socio o el propio dueño sería repetir el error que la investigación anterior encontró en las cifras de realidad aumentada: un número que suena bien y no resiste que lo abran.

**La analogía de Telcel sí es la correcta — pero la ficha de prepago, no el anuncio.** El modelo que hay que copiar es el cupo: "75 mesas al mes por doscientos pesos", como OlaClick; "cincuenta centavos por factura", como Facturama; "treinta y cinco pesos por restaurante que sí vendió", como Stripe. Pagos chicos, frecuentes, proporcionales al uso. Eso es lo que hizo que un país que no podía pagar un teléfono acabara con un teléfono en cada mano.

---

### 8.3 Tabla de "qué se desbloquea al pagar", defendible con costos reales

Cada fila tiene detrás un costo verificado, no una intuición de producto.

| Función | Gratis | De paga | El costo real que justifica cobrarlo |
|---|---|---|---|
| Menú 3D, orden en mesa, sesión compartida | **Sí** | Sí | Costo marginal casi nulo. **Es el producto: no se recorta** |
| Publicidad en el menú | **Sí, con anuncios** | **Sin anuncios** | Se pierde el ingreso publicitario: **$27 a $405 MXN al mes** según los supuestos de la §2.2. Es exactamente lo que cobra OlaClick |
| Mesas atendidas al mes | **Cupo** (sugerido: 75, el mismo de OlaClick Advanced) | **Ilimitado** | Tráfico de CDN: **18 a 90 GB al mes por restaurante** (§2.5). Precedente de mercado: OlaClick cobra MX$200 por 75 pedidos y MX$500 por 400 |
| Cobro en efectivo | **Sí** | Sí | **$0.** No cuesta nada y no se debe limitar |
| QR de CoDi del propio restaurante | **Sí** | Sí | **$0.** *"Las operaciones por CoDi® no generan comisiones adicionales"* (Banxico) y el QR lo genera el banco del restaurante, no Carta |
| Cobro con tarjeta | **No** | **Sí** | Stripe Connect: **MXN35/mes por cuenta activa + 0.25% + MXN12 por depósito**, encima del 3.6% + $3 MXN de cada transacción. **Advertencia de la §3.4: probablemente le sale más caro al restaurante que su terminal actual. Ofrecerlo solo a quien no tenga contrato bancario** |
| Generación de modelos 3D | **10 al mes, calidad Lite, licencia CC BY 4.0** | **33 a 100 al mes, calidad alta, propiedad del restaurante** | Meshy Free: 10 assets/mes con licencia CC BY 4.0 (no propietaria). Meshy Pro MX$349/mes ≈ **MX$10.47 por platillo**. Premium MX$698/mes ≈ **MX$6.98 por platillo** |
| Respaldo permanente de los modelos 3D | **No** | **Sí** | **Meshy retiene los assets solo 3 días (Pro y Premium) y 14 días (Studio).** Es un problema real que el proveedor no resuelve: el almacenamiento permanente lo paga alguien |
| Calidad de generación | **Estándar** | **Alta** | Tope físico verificado: **2048 × 2048 de textura y 100,000 triángulos** (Scene Viewer). Arriba de eso el modelo ya no carga bien en un celular de gama media, pague lo que pague |
| CFDI / factura del comensal | **A decidir** | **Sí** | **$0.50 MXN por folio** en la API de Facturama (1 a 10,000 al año) + **$1,650 MXN al año** del módulo. El restaurante está obligado a emitir la global en 24 horas |
| Multisucursal y reportes consolidados | **No** | Sí | Sin costo marginal directo; es la palanca de precio del plan alto. Precedente: OlaClick lo reserva para Infinity, MX$3,146/mes |

**Un renglón de honestidad sobre esta tabla:** cinco de las once filas replican lo que OlaClick ya cobra en México. Eso no es plagio, es leer el mercado. Pero significa que **el diferencial de Carta no puede estar en esta tabla** — tiene que estar en las dos primeras filas, las que están en el nivel gratuito: **los modelos 3D y la sesión de mesa compartida**, que es lo único que la investigación anterior encontró que nadie más ofrece.

---

## 9. Fuentes

Todas consultadas el **19 de septiembre de 2026**, salvo donde se indique.

**Regulación y fuentes oficiales mexicanas**

- Ley para Regular las Instituciones de Tecnología Financiera, texto vigente (última reforma DOF 14-11-2025), Cámara de Diputados: https://www.diputados.gob.mx/LeyesBiblio/pdf/LRITF.pdf
- CNBV — Disposiciones de carácter general aplicables a las Instituciones de Tecnología Financiera (capital mínimo, arts. 6 a 9): https://www.cnbv.gob.mx/Normatividad/Disposiciones%20de%20car%C3%A1cter%20general%20aplicables%20a%20las%20instituciones%20de%20tecnolog%C3%ADa%20financiera.pdf
- CNBV — Padrón de Instituciones de Fondos de Pago Electrónico autorizadas (40 entidades): https://www.cnbv.gob.mx/Entidades-Autorizadas/Paginas/FondosPagoElectronico.aspx
- Banxico — Circular 12/2018, disposiciones aplicables a las operaciones de las IFPE (DOF 10-sep-2018): https://www.banxico.org.mx/marco-normativo/normativa-emitida-por-el-banco-de-mexico/circular-12-2018/%7BA6023AE0-8135-44ED-04DA-2068117ED5FD%7D.pdf
- Banxico / CNBV — Disposiciones de carácter general aplicables a las Redes de Medios de Disposición, texto compilado (DOF 11-mar-2014, modificado 2-abr-2015 y 27-abr-2026): https://www.banxico.org.mx/marco-normativo/normativa-emitida-por-el-banco-de-mexico/reglas-conjuntas-redes-de-medios-de-disposicion/%7B794002B6-5DA6-BEBA-08AD-F210963C1E11%7D.pdf
- CNBV — Transmisores de Dinero, preguntas frecuentes: https://www.cnbv.gob.mx/PrevencionDeLavadoDeDinero/Preguntas-Frecuentes/Paginas/PF-Transmisores-de-Dinero.aspx
- DOF — Indicadores del día (UDI 8.821075 al 19-09-2026; dólar 17.187200 al 18-09-2026): https://dof.gob.mx/indicadores.php

**CoDi y DiMo**

- Banxico — CoDi, qué es y cómo funciona: https://www.banxico.org.mx/sistemas-de-pago/codi-cobro-digital-banco-me.html
- Banxico — CoDi, avances: https://www.banxico.org.mx/sistemas-de-pago/codi-avances-banco-mexico.html
- Banxico — Estadísticas de la plataforma CoDi: https://www.codi.org.mx/secundarias/estadisticas.html
- Banxico — Cuentas validadas por cada mil adultos, hoja de cálculo por entidad (actualizada 25-jun-2026): https://www.banxico.org.mx/sistemas-de-pago/d/%7BE50C9EF7-B0D3-99A9-0B62-F95B57CF0529%7D.xlsx
- Banxico SIE — Cuadro CF884, operaciones realizadas a través de CoDi (serie diaria)
- Banxico SIE — Cuadro CF885, monto procesado a través de CoDi (serie diaria)
- Banxico SIE — Cuadro CF881, cuentas validadas (serie diaria)
- BBVA México — Qué es Dimo, cómo funciona: https://www.bbva.mx/educacion-financiera/banca-digital/app-bbva-que-es-dimo.html *(la página oficial de Banxico sobre DiMo, `banxico.org.mx/servicios/dimo.html`, devolvió error 404 el 19-sep-2026)*

**Tasas de descuento y cuotas de intercambio**

- Banxico — Tasas de descuento por giro de negocio, Restaurantes: Débito, julio 2026: https://www.banxico.org.mx/servicios/tasas-de-descuento-para-tarjetas-de-debito-por-gir/%7BD55B5289-0474-B33F-EA53-212B9EDAAE2D%7D.pdf
- Banxico — Tasas de descuento por giro de negocio, Restaurantes: Crédito, julio 2026: https://www.banxico.org.mx/servicios/tasas-de-descuento-para-tarjetas-de-credito-por-gi/%7B178DFF29-DA8F-E376-78AC-9B52D36C799F%7D.pdf
- Banxico — Tasas de descuento para tarjetas de crédito por giro: https://www.banxico.org.mx/servicios/tasas-de-descuento-para-tarjetas-de-credito-por-gi/tasas-descuento-por-giro-cred.html
- Banxico — Cuotas de intercambio y comisiones: https://www.banxico.org.mx/sistemas-de-pago/cuotas-intercambio-comisiones.html

**Pasarelas de pago**

- Stripe — Precios México: https://stripe.com/mx/pricing
- Stripe — Precios de Connect México: https://stripe.com/mx/connect/pricing
- Stripe — Tipos de cargo en Connect (Direct, Destination, Separate): https://docs.stripe.com/connect/charges
- Stripe — Plazos de acreditación de fondos por país: https://docs.stripe.com/payouts
- Mercado Pago — Split de Pagos 1:1, resumen: https://www.mercadopago.com.mx/developers/es/docs/split-payments/split-1-1/overview
- Mercado Pago — Split de Pagos 1:1, requisitos previos: https://www.mercadopago.com.mx/developers/es/docs/split-payments/split-1-1/prerequisites
- Conekta — Planes y comisiones: https://www.conekta.com/pricing
- Openpay — Tabla de comisiones: https://www.openpay.mx/comisiones
- Clip — Portada con la comisión vigente: https://www.clip.mx/
- SumUp México: https://www.sumup.com/es-mx/
- PayPal México — Comisiones para comercios (actualizado 15-jul-2026): https://www.paypal.com/mx/webapps/mpp/merchant-fees
- Kushki — Comisiones a terceros (split): https://docs.kushki.com/ec/card-payments/split-payments/

**Puntos de venta y plataformas de restaurante**

- Toast — Precios oficiales (página actualizada 20-ago-2026): https://pos.toasttab.com/pricing
- Toast — Formulario 10-K, ejercicio 2025 (SEC, expediente 0001650164-26-000057): https://www.sec.gov/Archives/edgar/data/1650164/000165016426000057/tost-20251231.htm
- Toast — Estado consolidado de resultados (R5 del 10-K): https://www.sec.gov/Archives/edgar/data/1650164/000165016426000057/R5.htm
- SEC — API XBRL, ingreso total de Toast: https://data.sec.gov/api/xbrl/companyconcept/CIK0001650164/us-gaap/RevenueFromContractWithCustomerExcludingAssessedTax.json
- Square — Precios y comisiones: https://squareup.com/us/en/pricing
- Square — Comisiones de procesamiento: https://squareup.com/help/us/en/article/5068-what-are-square-s-fees
- Square — Disponibilidad internacional (8 países, México no incluido): https://squareup.com/help/us/en/article/5228-international-availability-and-features
- Block, Inc. — Formulario 10-K, ejercicio 2025: https://www.sec.gov/Archives/edgar/data/1512673/000162828026012254/xyz-20251231.htm
- OlaClick — Precios (México, en pesos): https://pricing.olaclick.app/
- Sunday — Precios: https://sundayapp.com/pricing/

**Publicidad**

- Google AdSense — Calculadora oficial de ingresos estimados: https://adsense.google.com/start/
- IAB México — Estudio Valor Total Media 2025: https://www.iabmexico.com/estudios/estudio-valor-total-media-2025/ · Sitio del estudio: https://estudiototalmedia.mx/ *(la descarga exige formulario con datos personales; no se llenó)*
- EMARKETER — *Industry KPIs: Mexico Mobile Ad CPM, by Industry*, 31-dic-2025: https://www.emarketer.com/chart/c/360853/industry-kpis-mexico-mobile-ad-cpm-by-industry-360853 *(cifras y fuente detrás de suscripción PRO)*
- INEGI — ENDUTIH 2024, comunicado de prensa 57/25: https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/endutih/ENDUTIH_24.pdf

**3D en el dispositivo y en la nube**

- Apple — Object Capture, colección de API de RealityKit: https://developer.apple.com/documentation/realitykit/realitykit-object-capture
- Apple — `PhotogrammetrySession.isSupported`: https://developer.apple.com/documentation/realitykit/photogrammetrysession/isSupported
- Google — Scene Viewer, requisitos y límites del modelo 3D: https://developers.google.com/ar/develop/scene-viewer
- Stability AI — Introducing Stable Fast 3D: https://stability.ai/news/introducing-stable-fast-3d
- Stability AI — Repositorio de SF3D (requisitos de VRAM): https://github.com/Stability-AI/stable-fast-3d
- Meshy — Precios (con selector de moneda MXN): https://www.meshy.ai/pricing
- Meshy — API y costo en créditos por generación: https://www.meshy.ai/api
- Niantic Spatial — Scaniverse / Capture: https://www.nianticspatial.com/products/capture

**Facturación**

- Facturama — Planes y paquetes de folios: https://facturama.mx/planes-facturacion

---

## Anexo: lo que no se pudo verificar

Para que nadie construya nada encima de estos puntos sin volver a revisarlos.

1. **El desglose de ingresos de Toast por línea de producto** ($936 M suscripción / $5,037 M pagos / $180 M hardware). El **total de $6,153 M sí está verificado en la SEC**; el desglose viene de un resumen de la nota de prensa oficial del 12-feb-2026 (Businesswire devolvió 403 y el portal de inversionistas de Toast, 404). **A favor:** las tres líneas suman exactamente el total verificado. Aun así, ábrase la nota antes de usarla en un pitch.
2. **El GPV de Toast de US$195,100 millones**, del cual se derivó la tasa efectiva del 2.58%. Misma fuente y misma advertencia.
3. **Un CPM móvil verificable para México.** No existe en acceso abierto. Ni IAB México, ni eMarketer, ni Statista lo publican sin pago o sin formulario. Todo el §2 se apoya en la calculadora de Google (región "Américas", que incluye Estados Unidos) y en supuestos declarados uno por uno.
4. **La inversión publicitaria digital en México de US$4,497 millones (2024).** Viene de prensa que cita a IAB México; el estudio original exige entregar datos personales para descargarse.
5. **El factor de ajuste "México rinde una quinta parte de Américas"** del escenario C de la §2.2. **Es un supuesto mío sin fuente.** Cualquiera que use ese número debe saberlo.
6. **Los comensales por mesa (2.5), el ticket promedio ($500 MXN) y los minutos de sesión.** Ninguno tiene fuente mexicana pública. Son supuestos míos y se construyen con el piloto.
7. **El costo por GB de CDN.** No se cotizó con ningún proveedor. El rango de 18 a 90 GB al mes por restaurante sí se deriva de los límites verificados de Scene Viewer.
8. **Las comisiones de cobro en línea de Mercado Pago por plazo de acreditación.** Están detrás de un inicio de sesión y no se consultaron: no corresponde entrar a una cuenta para una investigación de mercado.
9. **Las comisiones de Kushki y de Nuvei.** Ninguna las publica.
10. **Si Clip, SumUp, Conekta y Openpay ofrecen alguna figura de marketplace o pagos divididos.** No lo publican. Hay que preguntarlo a ventas.
11. **Los tiempos de depósito de SumUp México y de Mercado Pago.** No los encontré en fuente oficial.
12. **Qué modelos de iPhone soportan `PhotogrammetrySession`.** Apple no publica la lista; solo un método de comprobación en tiempo de ejecución. Lo de "solo modelos Pro" viene del foro de desarrolladores.
13. **Las afirmaciones de Scaniverse sobre procesamiento local.** Vienen de la página de novedades de Niantic y de reseñas de terceros; `scaniverse.com` ahora redirige a `nianticspatial.com` y no encontré una especificación técnica formal.
14. **La inconsistencia de Meshy** entre "1,000 créditos" y "hasta 100 assets" en el plan Pro. Son dos páginas suyas que no cuadran entre sí. Se usó la tarifa conservadora de la página de API.
15. **El umbral mínimo de pago de Google AdSense.** No se verificó. Importa, porque con ~US$23 al mes por restaurante el depósito puede tardar meses en llegar.
16. **El valor de la UMA 2026 ($117.31 diarios).** Múltiples fuentes concordantes citan el comunicado del INEGI publicado en el DOF el 9-ene-2026, pero no abrí el PDF del comunicado.
17. **Que Banxico haya publicado el 17-jun-2026 en el DOF las modificaciones con plazo al 14-dic-2026** para estandarizar SPEI, CoDi y DiMo. Viene de prensa especializada; no abrí el DOF de esa fecha.
18. **El artículo 81-A Bis de la LGOAAC** sobre transmisores de dinero. Se leyó en reproducciones del texto legal y en la página de la CNBV, no en el PDF oficial de la ley.
19. **Yumminn.** El dominio `yumminn.com` volvió a no resolver, igual que en la investigación anterior. Sigue sin haber precios verificables.
20. **Nada de este documento es asesoría legal.** La §4 reproduce textos de ley y reglamento con su cita, y señala el camino que aparentemente evita la licencia. **Antes de construir cualquier flujo de cobro, un abogado fintech mexicano tiene que confirmarlo por escrito.**
