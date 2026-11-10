# La competencia real de Carta en México

**Fecha de la investigación:** 19 de septiembre de 2026
**Alcance:** restaurantes de mesa (dine-in) en México, con foco en Ciudad de México
**Método:** fuentes primarias (sitios oficiales, documentación de API, precios publicados, comunicados). Se evitaron blogs de "top 10 mejores POS" salvo cuando se señala explícitamente como fuente secundaria.

**Cómo leer las marcas de confianza:**

- **[VERIFICADO]** — lo leí directamente en la fuente primaria, en la fecha indicada.
- **[ESTIMACIÓN]** — inferido o tomado de una fuente secundaria. Se indica de quién viene.
- **[NO ENCONTRADO]** — busqué y no existe fuente pública. No se inventó ningún dato.
- **[SIN PRECIO PÚBLICO]** — la empresa existe y el producto también, pero no publica precios.

**Nota sobre seguridad de la investigación:** ninguna de las páginas consultadas contenía texto dirigido a un agente automático ni instrucciones para ejecutar acciones. Todo el contenido leído se trató como dato, no como instrucción.

---

## 1. Resumen ejecutivo

1. **El competidor real ya está instalado en el restaurante, y cuesta menos de lo que se pensaba.** Fudo, un punto de venta que opera en México, vende el plan que incluye **pedido desde la mesa con carta QR** en **$690 MXN al mes** (consultado 19-sep-2026). Carta planea cobrar $349 MXN/mes por un plan que, según el análisis actual, no incluye orden ni pago en mesa. El restaurantero no va a comparar Carta contra Rappi: la va a comparar contra una casilla que ya viene marcada en su sistema.

2. **Soft Restaurant, el POS más difundido en México, ya vende un módulo donde el comensal ve el menú, ordena y paga desde su celular.** Se llama e-Menu QR. Su licencia base cuesta **$799 MXN/mes (Lite)** o **$1,099 MXN/mes (Pro)**, más IVA. El add-on no tiene precio público. Además regalan un generador de menús QR gratuito como herramienta de captación. La afirmación del análisis actual de que "ningún competidor en LATAM ofrece" esta experiencia es falsa en la parte de menú QR, orden y pago en mesa.

3. **Convivir con el POS es técnicamente posible, pero solo con dos de ellos, y de forma limitada.** De los siete sistemas revisados, solo **Fudo** (API con escritura, plan Pro de $1,050 MXN/mes) y **Oracle Simphony** (la API más completa del mercado, con capacidad de crear cuentas y notificaciones tipo webhook) permiten que un sistema externo meta una comanda. **Parrot** tiene API pública pero la documentación que pude verificar es de solo lectura. **Soft Restaurant** tiene un servicio de API cuyo propósito declarado es entregar el menú, no recibir órdenes. **Wansoft** y **BitsPerFoods** no publican documentación de API.

4. **Toast no existe en México.** Opera en Estados Unidos, Canadá, Irlanda y Reino Unido. El análisis actual lo trata como competidor indirecto y como "partner estratégico POS" junto con Square y Aloha; ninguno de los tres es relevante para un piloto en CDMX.

5. **Las cifras de AR que sostienen el proyecto no resisten la revisión.** El "+22% en ventas generales" no es de Bareburger: es de **Vino Levantino**, un wine bar de Nueva York. El "+25% en postres" viene de **un estudio hecho por el propio Kabaq**, es decir, por el vendedor. La única cifra que encontré atribuida a Bareburger es **+3% en hamburguesas vendidas**. Y el estudio de Washington State University que se cita midió **intención de visitar y de recomendar**, no ventas ni ticket promedio.

6. **Kabaq ya no es competidor: abandonó el vertical.** Hoy se llama QReal, pertenece a The Glimpse Group (NASDAQ: VRAR) y trabaja en moda, lujo y automotriz. El espacio de "menú 3D con AR" en México está, efectivamente, vacío — pero eso puede significar que nadie lo ha logrado vender, no que sea una oportunidad desatendida.

7. **El reparto no entró a la mesa, y eso es una buena noticia para Carta.** Ni Rappi ni DiDi Food promocionan hoy un producto de menú, orden o pago en mesa en México. Uber Eats lanzó pedido sin contacto para consumo en local en 2020 con piloto en México, pero no encontré ese producto vigente ni promovido en 2026. El riesgo "Uber Eats / Rappi: Alto" que marca el análisis actual está sobrestimado en el corto plazo.

8. **La facturación es una puerta de entrada más realista que la realidad aumentada.** Todo restaurante en México está obligado a emitir CFDI a quien lo pida y una factura global por lo demás. Parrot ya vende la autofacturación por QR como gancho. Si Carta cobra en la mesa y no resuelve el CFDI, le está creando trabajo al restaurante en lugar de quitárselo.

---

## 2. Puntos de venta mexicanos: qué cubren, cuánto cuestan y si dejan integrarse

Todos los precios están en pesos mexicanos y fueron consultados el **19 de septiembre de 2026**.

| Producto | Menú QR / orden en mesa / pago en mesa | Precio publicado (MXN) | API pública |
|---|---|---|---|
| **Soft Restaurant** (National Soft) | **Sí, los tres.** El add-on **e-Menu QR** permite al comensal consultar el menú, ordenar y pagar la cuenta desde su celular. También vende *Menú Digital* (tablet operada por el mesero, no por el cliente), *Comandero Móvil*, *Kiosko* y un *generador de menú QR gratuito* como captación. [VERIFICADO] | **Lite $799/mes + IVA** (hasta 2 equipos), anual $8,390 + IVA. **Pro $1,099/mes + IVA** (hasta 10 equipos), anual $11,540 + IVA. Suscripción, no licencia perpetua. Los add-ons: [SIN PRECIO PÚBLICO]. [VERIFICADO] | **Sí, limitada.** [api.softrestaurant.com.mx](https://api.softrestaurant.com.mx/) — REST/JSON, autenticación por encabezado `AuthorizedApp`, llaves solo por solicitud. Propósito declarado: *"proporcionar la información del menú del restaurante"*. No documenta escritura de órdenes ni webhooks. Existe además una guía de conexión con ERP y PMS. [VERIFICADO] |
| **Parrot Software** | Parcial. Tiene POS, terminal propia (Parrot Pay), KDS, tabletas comanderas y app de mesero. Vende **autofacturación por QR** — el comensal escanea para generar su **factura**, no para ver el menú. No encontré menú QR ni pedido desde el celular del comensal como producto. [VERIFICADO] | **[SIN PRECIO PÚBLICO].** El sitio oficial no tiene página de precios accesible; la URL `/precios-2025` aparece en buscadores pero devuelve error 404. Un competidor (Last.app) publica que Parrot va de **$1,800 a $2,800/mes + IVA** — **[ESTIMACIÓN, fuente secundaria e interesada]**. [VERIFICADO que no publica precios] | **Sí.** [developer.parrotsoftware.io](https://developer.parrotsoftware.io/), base `https://api.parrot.rest/external/`. Endpoints observados: List Orders, List Order Items, List Order Invoices, List Order Payments, List Product Types, List Cashier Sessions, List Store Users. El único que pude abrir a detalle (`GET /v1/order-invoices`) es **solo lectura**. No encontré endpoints de creación de órdenes ni webhooks documentados. [VERIFICADO parcialmente] |
| **Wansoft** ("Wansoft by Clip") | Sí, parcial. Portal e-commerce integrado, tienda en línea propia, **comandero móvil**, **KDS**, y cobro con terminales Clip (Total 2 y Ultra) desde el mismo sistema. No encontré confirmación de menú QR para el comensal ni de pago en mesa iniciado por el cliente. [VERIFICADO] | **[SIN PRECIO PÚBLICO].** Tres niveles: Básico, Intermedio, Pro, con módulos que se suman aparte. Promete "mes trabajado es mes pagado" (sin permanencia). [VERIFICADO] | **[NO ENCONTRADO].** No encontré documentación pública de API de Wansoft. |
| **Fudo** | **Sí, los tres, y es el más barato.** *Carta QR* incluida desde el plan más bajo; **"Pedido desde la mesa con Carta QR"** desde el plan Avanzado. [VERIFICADO] | **Inicial $360/mes. Avanzado $690/mes. Pro $1,050/mes** (sin IVA). Módulos aparte: Ventas por Comensal $100, **Gestión de Mesas $100**, KDS $200, Delivery Apps $200, **Facturación Electrónica $200**, Recepcionista IA $850 — todos por mes. [VERIFICADO] | **Sí, y con escritura.** *API de propósito general*, incluida **solo en el plan Pro**. Base `https://api.fu.do/v1alpha1`, autenticación Bearer. Permite consultar datos y **crear o modificar ciertos recursos** (ventas, compras, menú, productos, configuración). Requiere pedir la activación a soporte. Documentación: [soporte.fu.do/docs/api-gral](https://soporte.fu.do/docs/api-gral) y `dev.fu.do/api`. No encontré webhooks documentados. [VERIFICADO] |
| **Oracle Simphony / MICROS** | Sí, vía su ecosistema de socios; no como producto propio empaquetado para el restaurante pequeño. [VERIFICADO parcialmente] | **[SIN PRECIO PÚBLICO en México].** Oracle habla de "planes de precios mensuales económicos" sin publicar cifras. Su página latinoamericana menciona hardware "desde $1 USD", lo que parece promocional más que un precio real. [VERIFICADO que no publica precios] | **Sí — la más completa del mercado.** *Simphony Transaction Services Gen 2* (STS Gen2), REST, documentación abierta: [docs.oracle.com/en/industries/food-beverage/simphony/omsstsg2api/](https://docs.oracle.com/en/industries/food-beverage/simphony/omsstsg2api/index.html). Incluye **Checks API** (manejo de cuentas dentro de un centro de ingresos, es decir, escritura de comandas) y **Notifications API** (callbacks POST = webhooks). Hay un **Simphony Partner Integration Program** con un *Simphony Lab* temporal gratuito para desarrollo. [VERIFICADO] |
| **Toast** | **No aplica: no opera en México.** Sus mercados son Estados Unidos, Canadá, Irlanda y Reino Unido. [VERIFICADO] | No aplica en México. | Tiene API pública y programa de socios, pero es irrelevante para un piloto en CDMX. |
| **Sr. Menú** | **[NO ENCONTRADO].** No existe un producto mexicano con ese nombre en las búsquedas. "SR" es la abreviatura comercial de **Soft Restaurant**, que sí tiene un módulo llamado *Menú Digital*. Es muy probable que se trate de una confusión de nombre. | No aplica. | No aplica. |
| **Bit Software / Bitpos** | **[NO ENCONTRADO en México].** Bitpos es un producto **chileno** (`bitpos.cl`). En México sí existe **BitsPerFoods** (Grupo Bitsper, S.A.S. de C.V.), con tres productos: Menú Digital, CRM y POS. [VERIFICADO la existencia, no las funciones a detalle] | **[SIN PRECIO PÚBLICO]** para BitsPerFoods. | **[NO ENCONTRADO]** para BitsPerFoods. |

### Lo que esta tabla decide

**Carta puede convivir con el POS en dos casos y en ninguno más.** Con **Fudo** (si el restaurante paga el plan Pro de $1,050/mes) y con **Oracle Simphony** (restaurantes grandes, hoteles, cadenas). Con Parrot puede *leer* lo que pasó, pero no meter una comanda. Con Soft Restaurant puede *leer el menú*, que es justo lo contrario de lo que Carta necesita: Carta quiere escribir órdenes, no descargar la carta.

Esto tiene una consecuencia incómoda: **en la mayoría de los restaurantes de CDMX, si Carta quiere que el comensal ordene desde la mesa, tendrá que pedirle al mesero que recapture la orden en el POS.** Eso no es un detalle técnico: es la diferencia entre ahorrarle trabajo al restaurante y duplicárselo.

---

## 3. Plataformas de menú QR y orden en mesa

| Plataforma | Origen y presencia en México | Qué resuelve | Precio (con fecha) | ¿3D o AR? |
|---|---|---|---|---|
| **Last.app** | España. **Entró a México en 2025** y lo declara su puerta a Latinoamérica. [VERIFICADO] | POS completo + **código QR con menú digital y pedido en mesa**, tienda en línea, integración con Rappi/Uber Eats/DiDi, reservas (*The Book*), reportes. | **Starter $1,000/mes, Growth $1,700/mes, Unlimited $2,900/mes**, más IVA y **por sucursal**. KDS +$250/mes. (19-sep-2026) [VERIFICADO] · *Contradicción: una nota de prensa del sector cita $920–$2,660 MXN para el plan anual. La página oficial es más confiable; la diferencia probablemente sea mensual vs. anual.* | No |
| **Fudo** | Latinoamérica, con operación en México. [VERIFICADO] | POS + Carta QR + pedido desde la mesa + facturación CFDI + KDS. Ver tabla anterior. | $360 / $690 / $1,050 al mes (19-sep-2026) [VERIFICADO] | No |
| **Waitry** | Origen internacional; más de 8,000 restaurantes declarados. **México aparece en el formulario de demo, pero no encontré confirmación de operación real en el país.** [ESTIMACIÓN] | Menú digital con fotos, videos y traducciones; pedido en mesa, mostrador, para llevar y a domicilio; pago. | Plan **Lite gratuito con 3% de comisión** por transacción; **Premium "$50/mes"** con 0% en mesa y mostrador y 1.5% en para llevar y domicilio. **La página no indica la moneda.** (19-sep-2026) [VERIFICADO el número, NO la moneda] | No (fotos, videos y GIFs) |
| **OlaClick** | Latinoamérica, con presencia en México. [VERIFICADO] | Plan gratuito con **menú digital QR, comandas de mesero y pedidos en línea sin mensualidad ni comisión por pedido**. Planes Advanced y Premium con chatbot e inventario automático. | Gratuito el plan base. Advanced y Premium: **[SIN PRECIO PÚBLICO verificado]** — su página de precios devolvió error 404 el 19-sep-2026. | No |
| **Yumminn** | España (Barcelona). **Sin evidencia de operación en México.** [VERIFICADO la ausencia de evidencia] | Pago en mesa por QR sin app: ver cuenta, dividirla, dar propina, pagar, dejar reseña. También pedir. Se integra a TPV existentes. | **0.9% por transacción** solo pago; **1.9%** para pedir y pagar. [ESTIMACIÓN: cifras de notas de prensa españolas; **no pude abrir su página oficial de precios el 19-sep-2026, el dominio no resolvió**] | No |
| **Sunday** | Francia. Opera en **Estados Unidos, Francia y Reino Unido**. **No México.** [VERIFICADO] | *sunday Pay* (escanear, dividir, propina, pagar en 10 segundos sin app), *sunday Ordering* (un solo QR para pedir, repetir y pagar), *sunday Handhelds*. | **[SIN PRECIO PÚBLICO]** | No |
| **Mesa 24/7** | Perú, Chile, Ecuador, Colombia. **No México.** [VERIFICADO] | Reservas en línea, delivery y takeout, página web gratis, gift cards, CRM. No encontré menú QR ni pago en mesa como producto. | **[SIN PRECIO PÚBLICO]**, prueba gratis de 14 días. | No |
| **Shift4 Dine** (antes SkyTab) | Estados Unidos, con sitio en español mexicano. **No confirma explícitamente disponibilidad en México.** [ESTIMACIÓN] | Menú QR con imágenes, pedido desde la mesa, pago sin contacto y propina integrada. | **[SIN PRECIO PÚBLICO en pesos]**; el sitio compara en dólares. | No |
| **Tap2Eat** | **[NO ENCONTRADO]** como plataforma de restaurantes. El único resultado es una app de alimentación escolar en Kenia (Food4Education). Probable confusión de nombre. | — | — | — |
| **Digital Menu** (`digitalmenu.mx`), MenuTap, Menuú, MenuQR.mx, RestMX, BySMax, Nei Digital | Mexicanas, muchas con plan gratuito. [VERIFICADO que existen] | Menús QR básicos, algunos con pedidos por WhatsApp y facturación SAT. Es la capa "commodity". | Varios ofrecen **plan gratuito**; el resto **[SIN PRECIO PÚBLICO verificado]**. | No |

### Lectura

El renglón que más debería preocupar no es ninguna de estas plataformas por separado: es que **el menú QR es gratis en al menos cinco lugares distintos** (OlaClick, Waitry Lite, Nei Digital, BySMax, y el propio generador gratuito de Soft Restaurant). El menú QR no es un producto: es un gancho de captación. Carta no puede cobrar por eso.

---

## 4. El reparto en la mesa

| Plataforma | ¿Producto para consumo en mesa en México? | Comisiones |
|---|---|---|
| **Uber Eats** | **Parcialmente, y sin evidencia de vigencia.** Uber Eats lanzó en 2020 un pedido sin contacto para consumo en el local, con piloto en ocho mercados de EE.UU. y también en **México** y Reino Unido: el comensal escanea un QR, pide y paga en la app, y le llevan la comida a la mesa. **No encontré ese producto promocionado ni documentado en sus canales oficiales para México en 2026.** [ESTIMACIÓN: existió, estatus actual no verificable] | Publica sus planes: **Lite 25%, Uber Plus 27%, Premium 29%** de tarifa de entrega, con procesamiento de pagos incluido. También ofrece *Uber Direct* para canales propios. Una cuota de activación de $5,000 MXN circula en blogs pero **no la encontré en fuente oficial** [NO VERIFICADO]. [VERIFICADO los porcentajes] |
| **DiDi Food** | **[NO ENCONTRADO].** No encontré producto de menú QR, orden en mesa ni pago en mesa. | **DiDi no publica su porcentaje.** Su propia página de preguntas frecuentes dice textualmente que *"la tarifa de servicio depende del país"* y que los detalles se dan durante el registro. Las cifras de 18% (reparto propio) y 30% (reparto DiDi) que circulan vienen de blogs de terceros — **[NO VERIFICADO en fuente primaria]**. [VERIFICADO que no lo publica] |
| **Rappi** | **[NO ENCONTRADO]** como producto oficial. Hay menciones dispersas de QR con beneficios y registro de clientes de mesa, pero nada documentado en su portal de comercios. | **Rappi no publica comisiones** en su sitio de comercios en México. [VERIFICADO que no lo publica] |

**Conclusión para Carta:** las tres apps de reparto siguen jugando fuera del restaurante. El riesgo que marca el análisis actual como "Alto" es real a mediano plazo (tienen la relación con el restaurante y con el comensal) pero **hoy no hay un competidor de reparto en la mesa en México**. Ese hueco sí está libre — no por AR, sino por la operación de mesa.

---

## 5. Pagos y facturación en la mesa

### Los cobradores

| Proveedor | Comisión publicada | Funciones de mesa | API pública |
|---|---|---|---|
| **Clip** | **2.99% + $1 MXN**, más IVA (tasa promocional publicada). Tasa histórica de referencia: 3.6% + IVA. Meses sin intereses: de **4.57% (3 meses) a 27.17% (24 meses)**, más IVA. (19-sep-2026) [VERIFICADO] | La página principal no detalla propina, división de cuenta ni menú QR. Sí ofrece "Pagos con Código QR" como producto separado. Su apuesta de restaurante es **Wansoft by Clip**. | **Sí.** [developer.clip.mx](https://developer.clip.mx/): APIs de Checkout Redirect, Checkout Transparente, Reembolsos, Transacciones, Depósitos y **PinPad**; SDK de Terminal; **webhooks** para notificaciones en tiempo real. No documenta API específica de propina ni de QR. [VERIFICADO] |
| **Mercado Pago Point** | **3.5% + IVA** para débito; tasa variable en crédito según el plazo de acreditación. Terminales desde $99. [ESTIMACIÓN: su blog oficial lo reporta, pero **la página de comisiones devolvió error 403 el 19-sep-2026**, así que no pude verificarlo de primera mano] | Sin renta mensual ni costo de adhesión. No verifiqué propina ni división de cuenta. | **Sí.** *Orders API* con integración de **QR Code** (modelo estático y dinámico), documentada en [mercadopago.com.mx/developers](https://www.mercadopago.com.mx/developers/en). Una sola integración cubre Point y QR. [VERIFICADO] |
| **Getnet** (Santander) | **2.9% + IVA** [ESTIMACIÓN: cifra de un comunicado de Santander de 2023; **no la encontré publicada en la página de producto actual**]. | **Las mejores funciones de mesa del grupo.** Propina en terminal con opciones de 10%, 15%, 20%, sin propina o monto manual. **División de cuenta** automática o manual. Multidivisa (USD, EUR, CAD, AUD, GBP, JPY). *G Tapp* (cobro contactless con el celular). *Get Link and Pay* por WhatsApp. (19-sep-2026) [VERIFICADO] | **[NO ENCONTRADO]** documentación pública de API de Getnet México. Sí tiene alianza con **Pacto** ("Getnet Restaurantes, powered by Pacto"), sin costo adicional de integración. |

### La facturación (CFDI 4.0)

Esto es lo que el restaurante está obligado a hacer, y por lo tanto lo que Carta tiene que respetar si cobra en la mesa:

- **Emitir un CFDI a cualquier comensal que lo solicite.** [VERIFICADO como obligación general]
- **Emitir una factura global** por todas las ventas del periodo que no llevaron factura individual. Se usa el RFC genérico **XAXX010101000**, nombre del receptor **"PUBLICO EN GENERAL"**, régimen fiscal **616** y uso de CFDI **S01**. [VERIFICADO en múltiples fuentes concordantes]
- **Fundamento:** la regla **2.7.1.21** de la Resolución Miscelánea Fiscal contempla la expedición de comprobantes en operaciones con el público en general. El portal del SAT redirige esa regla a la numeración **2.7.1.24**, lo que sugiere una renumeración. [ESTIMACIÓN sobre el número vigente]
- **Plazo: aquí las fuentes se contradicen.** Unas dicen **24 horas** después del cierre del periodo; otras dicen **72 horas**. **No pude resolver la contradicción porque el servidor del SAT rechazó la conexión el 19-sep-2026** al intentar abrir la *Guía de llenado del CFDI global*. **[NO VERIFICADO — hay que consultarlo con un contador antes de construir nada sobre este supuesto.]**
- **Propinas:** no encontré fuente primaria del SAT sobre el tratamiento fiscal de la propina cobrada en terminal. **[NO ENCONTRADO]**

### Cómo lo resuelven hoy los competidores

- **Parrot** vende la **autofacturación por QR**: el comensal escanea y genera su factura solo. Es su gancho de facturación.
- **Fudo** vende la **Facturación Electrónica como módulo de $200 MXN/mes**.
- **Last.app** incluye **folios de facturación por plan**: 100 en Starter, 200 en Growth, 500 en Unlimited.
- **Soft Restaurant** integra facturación electrónica en el producto base y soporta **CoDi** en su comandero móvil.

**El patrón es claro:** en México, la facturación no es un extra — es parte del producto. Un sistema de pago en mesa que no emite CFDI le deja el trabajo al restaurante.

---

## 6. Menús 3D y AR: qué dice la evidencia de verdad

### Quién queda en pie

- **Kabaq / QReal** — **ya no compite en restaurantes.** Se renombró QReal, forma parte de **The Glimpse Group (NASDAQ: VRAR)** y se expandió a moda, lujo y automotriz. Su sitio devolvió error 500 el 19-sep-2026. [VERIFICADO]
- **JARIT** — sigue activo. **Es app nativa** (App Store y Google Play), **no WebAR**. Precios en dólares: desde **$19 USD/mes** (mínimo 3 meses), Advanced **$99 USD**, Pro **$299 USD**. No menciona México ni Latinoamérica. Sus métricas visibles ("100 descargas, 100 modelos 3D, 100 restaurantes") parecen cifras de plantilla sin actualizar. [VERIFICADO]
- **Mi Menú 3D** — catálogo gastronómico con AR. Es de **Intelecta España, S.L.**, con oficinas en Barcelona, Lima y Quito. **App nativa, no WebAR. Sin clientes mexicanos mencionados. Sin precios publicados.** [VERIFICADO]
- **MyWebAR y Onirix** — plataformas genéricas de WebAR que algunos grupos restauranteros usan (La Tagliatella con Onirix). No son verticales de restaurante. [VERIFICADO]

**Nadie con operación establecida en México ofrece menú 3D/AR.** El hueco existe. La pregunta honesta es si está vacío porque nadie lo intentó o porque quien lo intentó no logró venderlo.

### Las cifras que circulan, rastreadas hasta su origen

| Cifra que usa el análisis actual | Qué encontré realmente |
|---|---|
| "+22% en ventas generales (Kabaq + Bareburger)" | **El 22% no es de Bareburger.** Es de **Vino Levantino**, un wine bar de Nueva York, y circula en blogs del sector desde al menos 2020. **Es un dato autorreportado por un solo local, difundido por el vendedor.** [VERIFICADO el origen] |
| "+25% en ventas de postres" | Viene de **"un estudio realizado por Kabaq"** — es decir, **por el propio vendedor de la tecnología**. No es un estudio independiente ni revisado por pares. Circula desde 2018. [VERIFICADO el origen] |
| Bareburger como caso de éxito cuantificado | El artículo de WB Research sobre la estrategia de AR de Bareburger **no reporta ninguna cifra de resultados de AR**. La única cifra que encontré atribuida a Bareburger es **+3% en hamburguesas vendidas**, en medios de tendencias. [VERIFICADO] |
| "Estudio de Washington State University (2026) confirma que los menús AR incrementan el interés en visitar" | **Esto es cierto, pero no dice lo que el análisis sugiere.** El estudio (*International Journal of Hospitality Management*, 2026, DOI 10.1016/j.ijhm.2025.104340) fue un **experimento simulado**, no en restaurantes reales: los participantes vieron un menú impreso, uno por QR o uno en AR. Midió **intención de visita, probabilidad de recomendar, sensación de inmersión y percepción de aprendizaje sobre ingredientes**. **No midió ventas, ni ticket promedio, ni conversión, ni tiempo de decisión.** El artículo de divulgación no reporta el tamaño de muestra. [VERIFICADO] |

**En una frase:** no existe evidencia pública, independiente y verificable de que un menú 3D/AR suba el ticket promedio en un restaurante. Lo que sí hay es evidencia académica de que **mejora la intención de visitar y de recomendar**. Son cosas distintas y se venden distinto.

---

## 7. Datos de mercado, con su fuente y su año

| Dato | Cifra | Fuente y año | Confianza |
|---|---|---|---|
| Unidades económicas en "Servicios de Preparación de Alimentos y Bebidas Alcohólicas y no Alcohólicas" | **736,367** | DENUE, datos a mayo de 2025, vía Data México (Secretaría de Economía) | [VERIFICADO] — **pero ver la advertencia de abajo** |
| Unidades económicas en preparación de alimentos y bebidas | 581,530 | Censos Económicos 2019 (INEGI) | [ESTIMACIÓN: cifra citada en fuentes secundarias; no pude abrir el PDF original] |
| Peso de la industria restaurantera en el total de negocios del país | **12.2%** de todos los negocios | INEGI + CANIRAC, *Conociendo la industria restaurantera* | [VERIFICADO] |
| Empleos de la industria restaurantera | **Poco más de 2 millones** | INEGI + CANIRAC, mismo documento | [VERIFICADO] |
| Proporción de microempresas | **96 de cada 100** unidades son microempresas y dan empleo a 70 de cada 100 personas del sector | INEGI + CANIRAC, mismo documento | [VERIFICADO] |
| Caída del PIB restaurantero en 2020 | **-29.3%** frente a -8.2% de la economía nacional | INEGI + CANIRAC, mismo documento | [VERIFICADO] |
| Aportación al PIB turístico | **~15%** | Declaración del presidente de CANIRAC, mayo 2026 | [ESTIMACIÓN: declaración a prensa, no dato estadístico] |
| Derrama de la actividad gastronómica en destinos turísticos | **Más de $245,000 millones MXN en 2025** | Declaración del presidente de CANIRAC, mayo 2026 | [ESTIMACIÓN: declaración a prensa] |
| **Ticket promedio en restaurantes mexicanos** | — | — | **[NO ENCONTRADO]** en ninguna fuente oficial. No lo inventes en el pitch. |
| **Penetración de puntos de venta en restaurantes mexicanos** | — | — | **[NO ENCONTRADO]** en fuente oficial mexicana. Las cifras de "65% ya adoptó POS" que usa el análisis actual son de mercados globales o de EE.UU. |

### Dos advertencias serias sobre el número de 736,367

**Primera: esa cifra no son restaurantes de mesa.** El sector estadístico "Servicios de Preparación de Alimentos y Bebidas" incluye taquerías, fondas, puestos de comida, cafeterías, juguerías, bares y cantinas. **Usar 736,367 como universo para un producto de dine-in premium con modelos 3D infla el mercado por un factor que no puedo estimar con datos públicos.** El mercado real de Carta es un subconjunto mucho más pequeño: restaurantes de servicio completo con mantel, mesero y ticket suficiente para justificar $349 MXN al mes.

**Segunda: hay una contradicción grande entre fuentes.** El presidente de CANIRAC declaró en 2026 que la industria agrupa **"más de 2 millones 570 mil unidades de negocio"**. Eso contradice tanto al DENUE (736 mil) como al propio documento que CANIRAC publicó con INEGI (12.2% de los negocios del país, que sobre ~5.4 millones de unidades económicas totales daría alrededor de 660 mil). **La fuente más confiable es el DENUE/INEGI**, porque es un directorio censal con metodología publicada; la cifra de 2.57 millones es una declaración a prensa sin metodología. Recomiendo usar el DENUE y citar el año.

*Nota técnica: los PDF oficiales de INEGI (boletines del DENUE y de los Censos Económicos 2024, y el estudio "Conociendo los servicios de preparación de alimentos") no pudieron leerse con las herramientas disponibles. Las cifras marcadas como verificadas provienen de las versiones HTML de Data México y del portal de CANIRAC, que citan a INEGI como fuente.*

---

## 8. Implicaciones para Carta

### ¿Convivir con el POS o reemplazarlo?

**Las dos, según el segmento — pero no se puede prometer "nos integramos con tu POS" sin más.**

La respuesta honesta, con los datos de arriba:

- **Con Fudo (plan Pro) y Oracle Simphony: convivir es viable.** Son los únicos con API que acepta escritura. Simphony además tiene webhooks reales y un programa de socios con laboratorio gratuito.
- **Con Parrot y Soft Restaurant: solo lectura, y eso no alcanza.** Carta podría mostrar el menú y leer lo que pasó, pero la orden tendría que recapturarse a mano. **Eso mata la propuesta de "orden en la mesa".**
- **Con Wansoft y los demás: no hay puerta.**

**Traducción comercial:** decirle a un restaurantero "nos integramos con tu punto de venta" es una promesa que Carta **no puede cumplir en la mayoría de los casos hoy**. Es mejor no hacerla.

### ¿Qué hueco queda realmente libre?

Tres, y ninguno es el que dice el análisis actual:

1. **El 3D/AR en México está desatendido de verdad.** Nadie con operación mexicana lo ofrece. QReal se fue del vertical, JARIT y Mi Menú 3D son apps nativas europeas sin clientes mexicanos. **Carta con WebAR real y sin descarga es genuinamente distinta.** Lo que no está probado es que eso valga dinero.

2. **La sesión grupal de mesa.** De todo lo revisado, **ninguna plataforma resuelve que varios comensales armen una orden juntos desde sus propios teléfonos.** Sunday divide la cuenta, Getnet divide la cuenta, Yumminn divide la cuenta — pero **dividir al pagar no es construir junto al pedir.** Este es el diferenciador más defendible de Carta y el análisis actual apenas lo menciona.

3. **El dine-in sigue sin dueño entre las apps de reparto.** Rappi, DiDi y Uber Eats están todos fuera del restaurante.

### Qué debería cambiar en el alcance y en el discurso

**En el precio.** $349 MXN/mes está por debajo de Fudo Avanzado ($690) y muy por debajo de Last.app Starter ($1,000). Eso suena bien, hasta que uno nota que **esos $690 incluyen el punto de venta completo**. Carta a $349 es un *sobreprecio* encima de lo que el restaurante ya paga, no un ahorro. Hay dos salidas: bajar a un precio de "capricho" que no requiera comité, o subir y reemplazar el POS. El punto medio es el peor lugar.

**En el discurso.** Dejar de vender "menú QR con AR" y empezar a vender lo que nadie más hace: **la mesa compartida**. El menú QR es gratis en cinco lugares; la orden grupal no existe en ninguno.

**En el alcance del piloto.** Antes de construir back-office y analítica, hace falta saber si el restaurante puede recibir la comanda. Con Fudo la respuesta es sí; con Parrot y Soft Restaurant es no. **Sugerencia concreta: filtrar los 5–10 restaurantes del piloto por el POS que ya tienen**, y empezar por los que usan Fudo. Es una pregunta de una línea en la primera llamada.

**En la facturación.** Si Carta cobra en la mesa, tiene que resolver el CFDI. No es opcional y todos los competidores ya lo incluyen.

**En las métricas del piloto.** Como no existe evidencia independiente de que el AR suba el ticket, **el piloto de Carta sería la primera medición seria del mundo**. Eso es un activo enorme si se mide bien: grupo de control, mismo restaurante, mismos días de la semana, ticket promedio con y sin Carta. Si funciona, esa cifra vale más que el producto.

---

## 9. Supuestos del análisis actual que quedan contradichos o sin sustento

Referencias a `docs/Carta_Market_Analysis.md`.

1. **Sección 5 completa — el mapa competitivo no incluye a la competencia real.** Los nueve competidores listados son de EE.UU., España o globales. **No aparece ni uno de los sistemas que un restaurante mexicano tiene instalado hoy**: Soft Restaurant, Parrot, Wansoft, Fudo, Last.app u Oracle Simphony. La sección 5 no describe el mercado mexicano.

2. **Sección 5.4 y sección 1 — "Ningún competidor actual ocupa ese espacio" / "ningún competidor en LATAM ofrece la combinación".** Parcialmente falso. Es cierto en 3D/AR. **Es falso en menú QR, orden en mesa y pago en mesa**: Soft Restaurant (e-Menu QR), Fudo (Carta QR con pedido desde la mesa) y Last.app (código QR con pedido) ya lo venden en México, y dos de ellos por menos de lo que cuesta añadir Carta encima.

3. **Sección 5.2 — "Toast: Full stack POS — Carta no compite sino que se integra."** Sin sustento en México. **Toast no opera en México.** Integrarse con Toast no le sirve a ningún restaurante de CDMX.

4. **Sección 3.4 — "Partners Estratégicos: Proveedores POS (Toast, Square, Aloha)."** Los tres son de EE.UU. Los socios que importarían en México son Fudo, Parrot, Soft Restaurant y Wansoft/Clip — y **solo Fudo y Oracle tienen API que acepte una orden desde fuera**.

5. **Secciones 4.1 y 6.3 — "Estudio de Kabaq + Bareburger: +22% ventas generales, +25% postres."** **Atribución incorrecta y fuente interesada.** El 22% es de Vino Levantino, no de Bareburger. El 25% proviene de un estudio del propio Kabaq. La única cifra de Bareburger que encontré es +3%.

6. **Secciones 4.1 y 6.3 — el estudio de Washington State University.** La cita es correcta pero se usa en una lista titulada "AR probada en food", junto a cifras de ventas. **El estudio no midió ventas: midió intención de visita, recomendación e inmersión, en un experimento simulado.**

7. **Sección 5.3 — "Uber Eats / Rappi: Riesgo Alto".** Sobrestimado en el corto plazo. Ninguna de las tres apps de reparto tiene hoy un producto activo de menú, orden o pago en mesa en México.

8. **Sección 2.2 — el SAM de 736,367 restaurantes.** El número del DENUE es correcto, pero **el sector incluye taquerías, fondas, puestos y bares**. Aplicarle "70% usa QR" y "USD $5,000/año en tech" para llegar a **USD $2.58B** multiplica tres supuestos frágiles: un universo inflado, un porcentaje global aplicado a México, y un gasto promedio sin fuente mexicana. **El SAM está sobredimensionado en un orden de magnitud no determinable con datos públicos.**

9. **Sección 6.1 — "65% de los restaurantes ya adoptó POS, 78% usa software POS".** Son cifras globales o de EE.UU. **No encontré dato oficial de penetración de POS en restaurantes mexicanos.**

10. **Sección 4.3 — ARPU B2B de ~$250 MXN/mes.** Queda sin sustento competitivo: el mercado mexicano de software de restaurante cobra entre $360 y $2,900 MXN al mes **por el sistema completo**. Carta a $250–$349 como complemento pelea contra una casilla ya incluida en el plan del POS.

11. **Sección 4.4 — "Contenido 3D como moat" y "switching cost alto".** Es un argumento de dos filos que no se discute: si digitalizar 50 platillos es caro y lento, **también es la barrera de entrada que el restaurante ve antes de firmar**. El costo de producción de los modelos 3D no aparece en los unit economics.

12. **Sección 4.4 — "integración con sistemas de pago locales (SPEI, CoDi)".** Vale la pena notar que **Soft Restaurant ya publica una guía de pago con CoDi en su comandero móvil**. No es diferenciador.

---

## 10. Preguntas abiertas que solo se resuelven hablando con restauranteros

Esto no se investiga en internet. Son las preguntas para las primeras diez llamadas:

1. **¿Qué punto de venta tienes y qué versión?** Es la pregunta que decide si Carta puede integrarse o no. Es la primera, no la última.
2. **¿Cuánto pagas al mes por tu sistema, en total, con módulos?** Da el presupuesto real disponible y el marco de comparación.
3. **Si tu POS ya trae menú QR con pedido desde la mesa, ¿lo tienes prendido? ¿Por qué sí o por qué no?** Esta es *la* pregunta. Si Soft Restaurant y Fudo ya lo venden y casi nadie lo usa, hay que entender qué lo frena: el mesero, el comensal, la cocina o el dueño.
4. **¿Quién pierde si el comensal ordena solo?** La propina del mesero y su papel en la venta sugerida. Es la objeción que no aparece en ningún análisis de mercado y hunde proyectos.
5. **¿Cuánto vale para ti que el comensal vea el platillo en 3D antes de pedirlo?** Preguntado sin sugerir la respuesta. Y luego: ¿lo pagarías aparte de tu POS?
6. **¿Quién fotografiaría o escanearía los platillos y quién lo paga?** El costo de producción del 3D es la barrera real de adopción y no está en los unit economics.
7. **¿Cómo cobras hoy en la mesa y qué tan doloroso es?** Terminal que va y viene, división de cuenta, propina, facturación.
8. **¿Cuántas cuentas al día te piden factura y cómo la generas?** Define si el CFDI es un gancho o un requisito.
9. **¿Tus comensales dividen la cuenta? ¿Cómo?** Valida o mata la sesión grupal, que es el diferenciador más defendible de Carta.
10. **¿Cuál es tu ticket promedio y cuántas mesas rotas al día?** No hay dato público mexicano. Hay que construirlo con los diez pilotos.
11. **¿Qué pasó la última vez que cambiaste de tecnología?** Mide el costo real de cambio y la desconfianza acumulada.
12. **¿Cuánto tiempo se tarda un comensal en decidir y a ti te estorba eso?** El análisis asume que reducir el tiempo de decisión es valioso. En un restaurante de mesa con rotación baja, puede no serlo.

---

## 11. Fuentes

Todas consultadas el **19 de septiembre de 2026**.

**Puntos de venta mexicanos**

- Soft Restaurant — Precios: https://softrestaurant.com/soft-restaurant-precio
- Soft Restaurant — Add-ons (incluye e-Menu QR, e-Delivery, Kiosko, Móvil, Analytics, Delivery Hub, Payments): https://softrestaurant.com/addons
- Soft Restaurant — Menú Digital (tablet del mesero): https://softrestaurant.com/addons/menu-digital
- Soft Restaurant — Soft Restaurant 12: https://softrestaurant.com/soft-restaurant-12
- Soft Restaurant — Generador de menú QR gratis: https://softrestaurant.com/generador-de-menu-qr-gratis-para-restaurantes
- Soft Restaurant — Integraciones: https://softrestaurant.com/integraciones
- National Soft — Servicio de API: https://api.softrestaurant.com.mx/
- Parrot Software — Sitio oficial: https://parrotsoftware.com.mx/
- Parrot Software — Soluciones: https://parrotsoftware.com.mx/soluciones/soluciones
- Parrot External API — Portal de desarrolladores: https://developer.parrotsoftware.io/
- Parrot External API — Endpoint List Order Invoices: https://developer.parrotsoftware.io/api-16807372
- Wansoft by Clip — Sitio oficial: https://www.wansoftpos.com/
- Clip — Wansoft by Clip: https://www.clip.mx/clip-para-empresas/wansoft
- Fudo — Precios México: https://fu.do/es-mx/precios/
- Fudo — API de propósito general: https://soporte.fu.do/docs/api-gral
- Fudo — Documentación técnica de API: https://dev.fu.do/api
- Oracle — Simphony POS (México): https://www.oracle.com/mx/industries/food-beverage/restaurant-pos-systems/simphony-pos/
- Oracle — Simphony Transaction Services Gen 2, guía de API REST: https://docs.oracle.com/en/industries/food-beverage/simphony/omsstsg2api/index.html
- Oracle — Programa de integraciones y socios: https://www.oracle.com/food-beverage/restaurant-pos-systems/pos-integrations/partners/
- Oracle — Next-Gen Simphony APIs: https://www.oracle.com/food-beverage/restaurant-pos-systems/pos-integrations/next-gen-api-for-restaurant-pos/
- Toast — Diferencias por país (Australia, Canadá, Irlanda, Reino Unido): https://support.toasttab.com/en/article/Differences-in-Toast-s-Back-end-for-Canada-Ireland-and-U-K-Locations
- Toast — Lanzamiento en Reino Unido: https://pos.toasttab.com/news/toast-brings-digital-restaurant-technology-platform-to-uk
- BitsPerFoods: https://www.bitsperfoods.com/
- Bitpos (Chile): https://bitpos.cl/

**Plataformas de menú QR y orden en mesa**

- Last.app — Precios México: https://www.last.app/mx/precios
- Last.app — México: https://www.last.app/mx
- Last.app — Comparación con Parrot (fuente secundaria e interesada, citada como tal): https://www.last.app/mx/last-lessons/last-app-vs-parrot-que-software-elegir-para-tu-restaurante-en-mexico-en-2026
- Restauración News — Last.app aterriza en México (2025): https://restauracionnews.com/2025/07/last-app-llegada-a-mexico/
- Waitry — Precios: https://waitry.net/en/pricing/
- Waitry — Menú digital: https://waitry.net/en/digital-menu/
- OlaClick — Menú QR con pago en mesa en México: https://olaclick.com/es/pos/terminales-de-cobro-moviles-vs-menu-qr-con-pago-en-mesa-en-mexico/
- OlaClick — App para pedidos: https://olaclick.com/es/app-para-pedidos-de-restaurante/
- Yumminn — Pedir y pagar: https://yumminn.com/pedir-y-pagar/ *(el dominio no resolvió al intentar abrirlo el 19-sep-2026)*
- Yumminn — Precios: https://yumminn.com/precios/ *(no accesible el 19-sep-2026)*
- Sunday — Sitio oficial: https://sundayapp.com/
- Mesa 24/7: https://mesa247.la/
- Shift4 Dine / SkyTab — Pedido y pago con QR: https://www.shift4dinepartners.us/es/pedido-y-pago-con-codigo-qr/
- Digital Menu México: https://www.digitalmenu.mx/

**Reparto**

- Uber Eats — Precios para comercios en México: https://merchants.ubereats.com/mx/es/pricing/
- Uber Eats — Programa de comisiones para PyMEs (comunicado oficial): https://www.uber.com/mx/es/newsroom/uber-eats-comisiones-para-pymes-mexico/
- Uber Eats — Cómo funcionan las tarifas: https://help.uber.com/en/ubereats/restaurants/article/cómo-funcionan-las-tarifas-en-uber-eats
- Uber Eats — Pedido sin contacto para consumo en el local (2020): https://www.restaurantdive.com/news/uber-eats-adds-contactless-ordering-for-pickup-dine-in/585082/
- DiDi Food — Preguntas frecuentes sobre la comisión (no publica el porcentaje): https://web.didiglobal.com/mx/food/restaurantes/preguntas-frecuentes/que-porcentaje-de-comision-me-cobra-didi-food-por-uso-de-la-aplicacion/
- Rappi — Portal de comercios México: https://merchants.rappi.com/es-mx

**Pagos y facturación**

- Clip — Sitio oficial: https://www.clip.mx/
- Clip — Comisiones: https://blog.clip.mx/articulo/cuanto-cobra-de-comision-clip
- Clip — Portal de desarrolladores: https://developer.clip.mx/
- Mercado Pago — Portal de desarrolladores: https://www.mercadopago.com.mx/developers/en
- Mercado Pago — Integración de QR con Orders API: https://www.mercadopago.com.ar/developers/en/news/2025/09/24/QR-Code-Integration-with-Orders-API
- Mercado Pago — Comisiones de Point: https://www.mercadopago.com.mx/blog/comisiones-point-mercado-pago-mexico *(devolvió error 403 el 19-sep-2026)*
- Getnet — Terminal de pago para restaurantes: https://www.getnet.net/mx/tu-negocio/sectores/terminal-de-pago-para-restaurantes
- Santander — Getnet y Pacto lanzan solución para restaurantes (2023): https://www.santander.com.mx/ceb/2023/getnet-mexico-y-pacto-lanzan-solucion-digital-que-acelera-y-facilita-ventas-de-restaurantes.html *(devolvió error 403 el 19-sep-2026)*
- SAT — Regla 2.7.1.21 / 2.7.1.24: https://wwwmat.sat.gob.mx/articulo/90959/regla-2.7.1.24
- SAT — Guía de llenado del CFDI global: http://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/GuiallenadoCFDIglobal311221.pdf *(el servidor rechazó la conexión el 19-sep-2026)*

**3D, realidad aumentada y evidencia**

- QReal (antes Kabaq) — LinkedIn: https://www.linkedin.com/company/q-real
- The Glimpse Group (NASDAQ: VRAR) — Comunicados: https://www.nasdaq.com/market-activity/stocks/vrar/press-releases
- JARIT: https://jarit.app/
- Mi Menú 3D: https://mimenu3d.com/
- Onirix — Menús AR para restaurantes: https://www.onirix.com/menus-in-augmented-reality-for-restaurants/
- MyWebAR — AR en restaurantes: https://mywebar.com/es/blog/marketing/ar-restaurant/
- WB Research — Estrategia de AR de Bareburger (no reporta cifras de AR): https://restaurants.wbresearch.com/blog/bareburger-augmented-reality-technology-strategy-to-menus
- Trend Hunter — Kabaq 3D Food (cifra de +3% en Bareburger): https://www.trendhunter.com/trends/kabaq-3d-food
- Diego Coquillat — Origen de la cifra del +22% (Vino Levantino): https://www.diegocoquillat.com/como-aumentar-las-ventas-de-un-restaurante-utilizando-la-realidad-aumentada/
- IAT — Realidad aumentada en restaurantes (repite la cifra de Vino Levantino): https://iat.es/tecnologias/realidad-aumentada/restaurantes/
- TechXplore / Washington State University — Estudio de menús AR (2026): https://techxplore.com/news/2026-02-augmented-reality-menus-restaurants-customers.html
- *International Journal of Hospitality Management* (2026), DOI: 10.1016/j.ijhm.2025.104340

**Datos de mercado**

- Data México (Secretaría de Economía) — Servicios de Preparación de Alimentos y Bebidas, con datos del DENUE: https://www.economia.gob.mx/datamexico/es/profile/industry/restaurants-and-other-eating-places
- INEGI — DENUE, directorio de empresas y establecimientos: https://www.inegi.org.mx/temas/directorio/
- INEGI — DENUE interactivo: https://www.inegi.org.mx/app/mapa/denue/default.aspx
- INEGI — Comunicado del DENUE, datos a mayo de 2026: https://en.www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/denue/DENUE2026_05.pdf *(PDF no legible con las herramientas disponibles)*
- INEGI — Censos Económicos 2024, resultados definitivos: https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/ce/CE2024_def.pdf *(PDF no legible con las herramientas disponibles)*
- INEGI / CANIRAC — *Conociendo la industria restaurantera*: https://www.inegi.org.mx/app/biblioteca/ficha.html?upc=889463903369
- CANIRAC — Conociendo a la industria restaurantera: https://portal.canirac.org.mx/noticias/conociendo-a-la-industria-restaurantera/
- La Jornada — Declaraciones del presidente de CANIRAC sobre PIB turístico (mayo 2026): https://www.jornada.com.mx/noticia/2026/05/19/economia/premiaciones-gastronomicas-impulsan-crecimiento-de-15-de-pib-turistico-en-mexico

---

## Anexo: lo que no se pudo verificar

Para que nadie construya nada encima de estos puntos sin volver a revisarlos:

1. **El plazo legal de la factura global (24 o 72 horas).** Las fuentes secundarias se contradicen y el servidor del SAT rechazó la conexión. Hay que confirmarlo con un contador.
2. **La comisión real de DiDi Food y de Rappi en México.** Ninguna de las dos la publica. Solo se sabe por contrato.
3. **La comisión actual de Getnet.** El 2.9% + IVA viene de un comunicado de 2023, no de la página de producto vigente.
4. **Las comisiones de Mercado Pago Point.** Su página oficial devolvió error 403.
5. **Los precios de Parrot.** No los publica. La cifra de $1,800–$2,800 MXN viene de un competidor directo.
6. **Los precios de los add-ons de Soft Restaurant**, incluido e-Menu QR. No hay precio público.
7. **La moneda del plan Premium de Waitry** ("$50/mes" sin símbolo) y si opera realmente en México.
8. **Los precios de Yumminn.** El dominio no resolvió el día de la consulta.
9. **Si Uber Eats mantiene activo su producto de pedido en mesa en México.** Existió en 2020; no hay rastro reciente.
10. **El ticket promedio y la penetración de POS en restaurantes mexicanos.** No existe fuente oficial pública.
