# Pagos en la mesa e infraestructura de Carta

**Fecha de la investigación:** 20 de septiembre de 2026
**Alcance:** (1) cómo se cobra una cuenta en la mesa sin que Carta toque dinero y sin encarecerle el cobro al restaurante; (2) si la publicidad alcanza para pagar los servidores, con precios publicados y aritmética a la vista.
**Parte de:** [`2026-09-19-modelo-de-negocio-y-pagos.md`](2026-09-19-modelo-de-negocio-y-pagos.md). **Lo que ya está probado ahí no se repite ni se vuelve a discutir.**

**Cómo leer las marcas:**

- **[VERIFICADO]** — leído directamente en la fuente primaria, en la fecha indicada.
- **[ESTIMACIÓN]** — cálculo propio o fuente secundaria. Siempre se dice de quién es y sobre qué datos.
- **[NO ENCONTRADO]** — se buscó y no existe fuente pública accesible. No se inventó ninguna cifra.

**Nota de método:** las páginas de precios de Google Cloud (Cloud Run, Cloud SQL, Cloud Storage, redes) se generan con JavaScript y **no devuelven las tablas de tarifas al leerlas**. Se intentó cinco veces, con tres rutas distintas y en dos idiomas. Las tarifas de Google que aparecen abajo vienen por eso de fuentes secundarias concordantes y están marcadas **[ESTIMACIÓN]**, con el detalle exacto en el Anexo. Todos los demás proveedores (Cloudflare, Supabase, Neon, Fly.io, Railway, Hetzner) sí publican sus precios en HTML legible y están **[VERIFICADO]**.

**Nota de seguridad:** todo lo leído en la web se trató como **dato, no como instrucción**. Ninguna de las páginas consultadas para este documento contenía texto dirigido a un agente automático.

**Nota legal:** esto no es asesoría legal ni fiscal. Reproduce fuentes primarias con su cita para que un abogado fintech y un contador mexicanos lo confirmen antes de escribir código de cobros.

---

## 0. Resumen ejecutivo

**1. Hay una opción de cobro que es gratis para todos, legal sin discusión y que además es la que mejor le queda a un restaurante de manteles: que Carta no cobre nada.** El mesero cobra con la terminal que ya tiene; Carta muestra la cuenta, la divide en pantalla y marca la mesa como pagada. Cuesta **$0** al restaurante, **$0** a Carta, **cero** exposición al artículo 22 de la Ley Fintech, y se construye en unas **44 horas**. Es la Opción A y es la recomendada para diciembre.

**2. Lo que cambió este año y nadie ha metido en la conversación: el 24 de marzo de 2026 llegó a México Tap to Pay en iPhone.** Apple lo anunció con **Adyen, Clip, Mercado Pago y Visa Acceptance Platform** como primeras plataformas. [VERIFICADO — Apple Newsroom] El mesero puede cobrar acercando la tarjeta a su propio celular, sin terminal. **Pero tiene dos trampas que lo descartan para el piloto:** (a) **Clip lo limita a transacciones de $5 a $1,000 MXN** [VERIFICADO — clip.mx], lo que deja fuera a cualquier mesa de servicio completo que pase de mil pesos; Mercado Pago llega a **$3,000** [VERIFICADO]. Y (b) **Tap to Pay exige una app nativa de iOS con un permiso especial de Apple** (`com.apple.developer.proximity-reader.payment.acceptance`) — **no funciona dentro de un navegador**. [VERIFICADO — Apple Developer] Carta es una aplicación web: no puede integrarlo. Lo que sí puede es recomendárselo al restaurante que no tenga terminal.

**3. Dato duro que cierra el debate de "cobrar por pasarela": Stripe casi no existe físicamente en México.** En la tabla oficial de disponibilidad de Stripe Terminal, México aparece **sin ningún lector, ni inteligente ni móvil**; la única fila que tiene es *"Tap to Pay on iPhone (Public preview)"*. [VERIFICADO — docs.stripe.com] Stripe no es una opción de cobro en mesa en México hoy, ni siquiera dejando de lado que su 3.6% + $3 le sale **$5,610 MXN al mes más caro** al restaurante que su contrato bancario.

**4. Toda opción de cobro que pase por una pasarela le sale más cara al restaurante que su terminal. Sin excepción.** Sobre un ticket de $500 con tarjeta de crédito, contra el 2.33% de BBVA Bancomer: Clip **+$4.30**, Getnet **+$2.85**, Mercado Pago Point Tap **+$5.85**, Mercado Pago Link **+$9.80**, Stripe **+$9.35**. La aritmética completa está en la §1.9. **La única opción que le ahorra dinero al restaurante es no cobrar por Carta.**

**5. Sobre infraestructura, el hallazgo es de una sola línea: el egreso de datos es todo el costo, y hay quien lo cobra a $0.** Los modelos 3D son el tráfico y el tráfico es la factura. Google Cloud cobra **$0.12 USD por GB** de salida a internet [ESTIMACIÓN]; **Cloudflare R2 cobra $0.00 y lo dice en su página de precios** [VERIFICADO]. Esa diferencia decide todo: a 100 restaurantes, Google Cloud cuesta **$7,567 MXN al mes** y Hetzner + Cloudflare R2 cuesta **$327 MXN al mes**. **Veintitrés veces menos, haciendo lo mismo.**

**6. Con presupuesto de $500 MXN al mes, Google Cloud se rompe en el restaurante número 7.** Hetzner + R2 aguanta los 100 restaurantes sin salirse. La tabla completa está en la §2.7.

**7. La respuesta al encargo 2, en un número: con la infraestructura correcta, la publicidad cubre los servidores a partir del restaurante número 5** (con el supuesto pesimista de $27 MXN por restaurante al mes) **o del número 2** (con el supuesto medio de $81). Con la infraestructura equivocada —Google Cloud— y el supuesto pesimista, **no se sostiene nunca**: cada restaurante nuevo cuesta $50 MXN de egreso y rinde $27 de publicidad. La elección de proveedor no es un detalle técnico; es la que decide si el modelo del señor funciona o no.

**8. Pero hay un freno que no depende de la aritmética: el umbral de pago de Google AdSense en México es de $1,200 MXN.** [VERIFICADO — Google] Con $27 al mes por restaurante, hacen falta **45 restaurantes** para que Google deposite todos los meses. Con 5 restaurantes, el primer depósito llega **en nueve meses**. La publicidad cubre el costo en la hoja de cálculo mucho antes de que llegue un peso al banco.

**9. Y un riesgo de política que hay que diseñar desde ahora:** la política de Google *"Google-served ads on screens without publisher-content"* prohíbe anuncios en pantallas sin contenido o de paso, y menciona expresamente las de agradecimiento, salida y error. [VERIFICADO — Google Publisher Policies] En Carta eso significa: **anuncios sí en la carta; anuncios no en el carrito, en la confirmación del pedido ni en la pantalla de cuenta pagada.** Además, AdSense necesita poder leer el sitio: si el menú solo existe detrás de un código de mesa, no hay nada que revisar. Hace falta una carta pública por restaurante.

**10. Dos redes publicitarias quedan descartadas de entrada, y conviene saberlo antes de perder semanas.** **Media.net exige contenido en inglés y tráfico de Estados Unidos, Reino Unido o Canadá.** **Raptive exige que el 50% del tráfico venga de esos países.** Carta es en español y su tráfico es mexicano: no califica en ninguna de las dos. [ESTIMACIÓN — políticas publicadas por cada red]

---

# ENCARGO 1 — Cómo se paga en la mesa

## 1.0 La regla que ordena todas las opciones

De la investigación del 19 de septiembre, una sola línea gobierna este capítulo entero:

> **Si el dinero nunca cae en una cuenta de Carta, Carta no necesita licencia.**

El artículo 22 de la Ley Fintech reserva a las IFPE el *"abrir y llevar una o más cuentas de fondos de pago electrónico por cada Cliente"*. Lo reservado no es cobrar por cuenta de alguien: es **llevar saldo ajeno**. Y el artículo 124 castiga hacerlo sin autorización con **siete a quince años de prisión**. [VERIFICADO — investigación anterior]

De ahí sale la pregunta que se le hace a cada opción, y que aparece como columna en todas las tablas de abajo:

> **¿Quién es el comercio, y en la cuenta de quién cae el peso del comensal?**

Si la respuesta es "el restaurante", la opción es viable. Si es "Carta", aunque sea por tres días, aunque sea por tres segundos, la opción está muerta.

## 1.1 Lo que cambió este año: el tap-to-phone llegó a México

Este es el hecho nuevo más importante desde la investigación anterior, y conviene ponerlo antes de las opciones porque cambia la Opción E de "no existe" a "existe pero no sirve todavía".

**Apple habilitó Tap to Pay en iPhone en México el 24 de marzo de 2026.** [VERIFICADO — apple.com/mx/newsroom]

> Plataformas iniciales: *"Adyen, Clip, Mercado Pago y Visa Acceptance Platform"*
> Dispositivos: *"iPhone Xs o posteriores con la última versión de iOS instalada"*
> Medios: *"tarjetas de débito y crédito, Apple Pay y otras carteras digitales"* (American Express, Mastercard, Visa)
> *"No se necesita hardware adicional"*
> Al pie: *"Pueden aplicar límites a las transacciones"*

Esa última línea del pie de página es la que importa, y cada proveedor la llena distinto:

| Proveedor | Comisión | Dispositivos | **Monto por transacción** | Depósito | Marca |
|---|---|---|---|---|---|
| **Clip** (iPhone) | **2.99% + $1 + IVA** | iPhone XS o más reciente con NFC | **de $5 a $1,000 MXN** | Inmediato a Clip Cuenta de 9:00 a 20:00 CDMX; después, al día siguiente | [VERIFICADO — clip.mx] |
| **Clip** (Android) | **2.99% + $1 + IVA** | Android 10 o superior con NFC | **de $5 a $1,000 MXN** | ídem | [VERIFICADO — clip.mx] |
| **Mercado Pago Point Tap** (iPhone) | **3.5% + IVA** | **iPhone 11 o superior** | *"Puede haber límites de transacción"*, sin cifra en esa página | No publicado ahí | [VERIFICADO — mercadopago.com.mx] |
| **Mercado Pago Point Tap** (Android) | **3.5% + IVA** | Android 10 o superior con NFC | **máximo $3,000 por cobro** | *"Recibe el dinero al instante"*; sin renta ni costo de instalación | [VERIFICADO — mercadopago.com.mx] |
| **Stripe** | 3.6% + $3 MXN | — | — | — | **Solo Tap to Pay on iPhone, en vista previa pública** [VERIFICADO] |
| **Adyen**, **Visa Acceptance Platform** | No publican tarifa pública | — | — | — | [NO ENCONTRADO] |

**Y aquí está la tabla que decide si Stripe es siquiera una opción física en México.** De la documentación oficial de disponibilidad de Stripe Terminal, la fila de México, íntegra:

| País | Lectores inteligentes | Lectores móviles | Tap to Pay |
|---|---|---|---|
| **MX** | *(vacío)* | *(vacío)* | **Tap to Pay on iPhone (Public preview)** |

[VERIFICADO — docs.stripe.com/terminal/payments/regional]

Compárese con Estados Unidos, que tiene cinco familias de lectores inteligentes, lector móvil y Tap to Pay en iPhone y en Android. **En México, Stripe no vende un solo lector de tarjeta y su única forma de cobro presencial está en vista previa.** Cualquier plan que suponga "cobramos con Stripe en la mesa" choca con esto antes de chocar con el precio.

**La trampa técnica que descarta el tap-to-phone para Carta, hoy:**

Tap to Pay en iPhone exige una **aplicación nativa de iOS** con un permiso que Apple concede caso por caso: la clave `com.apple.developer.proximity-reader.payment.acceptance`, solicitada desde una cuenta de Apple Developer y sujeta a revisión de la app. [VERIFICADO — Apple Developer Documentation] **No se puede invocar desde Safari ni desde ningún navegador**, porque necesita acceso directo al lector de proximidad del aparato.

**Carta es una aplicación web.** Para integrar tap-to-phone tendría que publicar una app nativa para el mesero, conseguir el permiso de Apple, y además ser socio comercial de Clip o de Mercado Pago para usar su SDK. Eso no son horas: son meses y una relación comercial que hoy no existe.

**Lo que sí puede hacer Carta, y cuesta cero:** decirle al restaurante que esto existe. Al restaurante pequeño que no tiene terminal, "cobra con tu celular" le resuelve un problema real. El mesero abre la app de Clip, teclea el monto que Carta le muestra en pantalla, y cobra. Carta no integra nada, no toca nada y no arriesga nada.

---

## 1.2 Opción A — Carta no cobra nada

**Qué es.** Carta arma la cuenta, la divide en pantalla para que cada comensal sepa cuánto poner, sugiere la propina y muestra el total. El mesero cobra como cobra hoy —con la terminal del restaurante, en efectivo, o como quiera— y marca la mesa como pagada desde su vista. Carta nunca ve un peso.

| Concepto | Respuesta |
|---|---|
| **Quién es el comercio** | El restaurante, con su contrato bancario de siempre |
| **Qué le cuesta al restaurante** | **$0 adicional.** Sigue pagando su tasa de descuento actual: **1.65% débito / 2.33% crédito** con BBVA Bancomer, o lo que tenga contratado [VERIFICADO — Banxico, julio 2026] |
| **Qué le cuesta a Carta** | **$0.** Ni comisión, ni cuenta, ni integración, ni PCI |
| **Exposición legal** | **Ninguna.** No hay artículo 22, no hay artículo 124, no hay transmisor de dinero, no hay figura de agregador. Carta es software de menú |
| **Experiencia del comensal** | Ve la cuenta en su teléfono, ve cuánto le toca, ve la propina sugerida. Levanta la mano y paga como siempre |
| **La propina** | Se **sugiere** en pantalla (10 / 15 / 20% y monto libre) y se cobra por el canal de siempre. Carta no la mueve |
| **El CFDI** | Lo emite el restaurante, como hoy. Carta muestra el folio del consumo y el enlace o QR al portal de facturación del restaurante |

**Qué hay que construir y cuánto tarda** [ESTIMACIÓN propia; supone un desarrollador que ya conoce el código]:

| Tarea | Horas |
|---|---:|
| Modelo de cuenta: subtotales por comensal, platillos compartidos, descuentos | 10 |
| Interfaz de división: partes iguales, por lo que pidió cada quien, monto libre | 12 |
| Sugerencia de propina (10/15/20% y libre), con la leyenda de que es voluntaria | 4 |
| Estado de mesa y acción "cobrada" del mesero, protegida con PIN | 6 |
| Pantalla de datos para facturar (folio, total, RFC del emisor, enlace al portal) | 4 |
| Pruebas en mesa real, con mesero real | 8 |
| **Total** | **44 h** |

**El argumento incómodo que la hace ganar.** En un restaurante de servicio completo el mesero **va a ir a la mesa de todos modos**: a levantar el plato, a preguntar por el postre, a despedirse. La fricción que el pago en mesa presume de quitar es una fricción que en este segmento no duele. Lo que sí duele es no saber cuánto le toca a cada quien cuando la cuenta viene junta, y eso Carta lo resuelve **sin tocar un peso**.

---

## 1.3 Opción B — Enlace o QR de cobro del propio proveedor del restaurante

**Qué es.** El restaurante ya tiene Clip, Mercado Pago, Getnet o su banco. Cualquiera de ellos genera un enlace de cobro. Carta lo muestra dentro de la pantalla de cuenta, como QR o como botón. El comensal paga en la página del proveedor. **El comercio es el restaurante; el dinero cae en la cuenta del restaurante.**

**Lo que cobra cada proveedor** (consultado el 20 de septiembre de 2026):

| Proveedor | Comisión del enlace | Depósito | Costo fijo | Marca |
|---|---|---|---|---|
| **Clip — Link de Pago** | **2.99% + $1 MXN + IVA**, igual para crédito, débito y vales | *"Recibes el total de la venta en 24 horas"* | *"Sin costos adicionales ni rentas mensuales"* | [VERIFICADO — blog.clip.mx] |
| **Mercado Pago — Link de Pago** | **Al instante 3.49% + $4.00** · **En 7 días 3.19% + $4.00** · **En 30 días 2.95% + $4.00** · Efectivo en Oxxo 3.79% + $4.00 a 3 días | Según el plazo elegido | *"Solo pagas comisión cuando vendes"* | [VERIFICADO — mercadopago.com.mx] |
| **Getnet (Santander) — Pay by Link** | **No publica la comisión en su página de producto** | No publicado | No publicado. **Requiere CLABE de Santander**: los depósitos van a esa cuenta | [NO ENCONTRADO la tarifa; el requisito de CLABE Santander, VERIFICADO] |
| Openpay, Conekta, BBVA | Tienen cobro en línea, pero no un producto de "enlace de cobro" documentado públicamente para comercio en mesa | — | — | [NO ENCONTRADO] |

*(Getnet publica 2.9% + IVA para su terminal física según material propio difundido en redes; **no pude confirmarlo en su sitio** y por eso va como [ESTIMACIÓN] en la tabla comparativa.)*

| Concepto | Respuesta |
|---|---|
| **Quién es el comercio** | El restaurante |
| **Qué le cuesta al restaurante** | Entre **2.99% + $1** (Clip) y **3.49% + $4** (Mercado Pago al instante), más IVA. **Más caro que su terminal.** Ver §1.9 |
| **Qué le cuesta a Carta** | **$0** en la versión estática. En la versión dinámica, tampoco hay comisión, pero sí trabajo |
| **Exposición legal** | **Ninguna** si Carta solo muestra un enlace ajeno |
| **Experiencia del comensal** | Escanea, sale a la página del proveedor, paga, vuelve. **Con enlace estático el monto no coincide con la cuenta** y hay que tecleárselo — eso es feo y genera errores |
| **La propina** | Con enlace estático, el comensal teclea el total con propina o no la deja. Con enlace dinámico se puede incluir, **pero entonces la comisión se cobra también sobre la propina** (ver §1.10) |
| **El CFDI** | Lo emite el restaurante. Sin cambio |

**Qué hay que construir:**

| Variante | Tareas | Horas |
|---|---|---:|
| **B-estática** (el restaurante pega su enlace en el panel) | Campo y validación del enlace · generación de QR · pantalla "paga aquí" · confirmación manual del mesero · pruebas | **14 h** (sobre la Opción A) |
| **B-dinámica** (Carta crea el cobro por API con el monto exacto) | OAuth por restaurante y bóveda de credenciales (16) · creación de la orden con monto exacto (12) · webhook de confirmación y conciliación con la mesa (16) · expiración, reintentos y pagos parciales (12) · pruebas con dinero real (8) | **64 h** (sobre B-estática) |

**La honestidad sobre B-dinámica:** sigue sin haber riesgo regulatorio —el comercio sigue siendo el restaurante— pero Carta pasa de "mostrar una imagen" a "operar credenciales de cobro de terceros". Eso trae obligaciones de seguridad reales: guardar tokens de la cuenta de cobro de un restaurante y que se filtren no es un incidente técnico, es un problema con un cliente y su dinero.

---

## 1.4 Opción C — Cuentas conectadas tipo marketplace

**Qué es.** Stripe Connect con **cargos Direct**, o el **Split de Pagos 1:1** de Mercado Pago. Cada restaurante abre su propia cuenta, pasa su propio KYC y le da permiso a Carta. El cargo se crea **en la cuenta del restaurante**; Carta cobra encima una comisión de plataforma.

**Ya verificado en la investigación anterior, y sigue siendo cierto:**

> *"Creas un cargo en tu cuenta conectada, por lo que el pago aparecerá en el saldo de la cuenta conectada y no en el saldo de tu plataforma. […] El saldo de tu plataforma aumenta con las comisiones de la plataforma que cobras por un cargo."* [VERIFICADO — Stripe]

Y para Mercado Pago: cuenta de vendedor con **KYC nivel 6** y autorización por **OAuth** de cada restaurante. [VERIFICADO]

| Concepto | Respuesta |
|---|---|
| **Quién es el comercio** | **El restaurante** — esa es toda la gracia del cargo Direct |
| **Qué le cuesta al restaurante** | Stripe **3.6% + $3 MXN**; Mercado Pago **3.49% + $4**. Sobre un ticket de $500, Stripe cuesta $21.00 contra $11.65 de su terminal BBVA: **$9.35 más por cuenta, $5,610 MXN al mes** [VERIFICADO — investigación anterior] |
| **Qué le cuesta a Carta** | Stripe Connect: **MXN 35 al mes por cuenta activa + 0.25% + MXN 12 por depósito** si Carta fija el precio; **$0** si Stripe le factura directo a las cuentas conectadas [VERIFICADO] |
| **Exposición legal** | **Baja pero no nula.** Con cargos Direct el dinero nunca toca a Carta. Con cargos a destino o transferencias separadas, **sí lo toca**, y eso es el artículo 22. La diferencia es una línea de código: por eso hay que fijarla por escrito antes de escribirla |
| **Experiencia del comensal** | **La mejor de todas.** Cada quien paga su parte desde su teléfono, sin esperar a nadie |
| **La propina** | Se puede sumar como línea al cargo. **Pero la comisión de plataforma de Carta nunca debe calcularse sobre la propina** — ver §1.10 |
| **El CFDI** | Lo emite el restaurante, **porque el restaurante es el comercio**. Con cargos a destino el comercio sería Carta y **Carta tendría que facturar el consumo del comensal**, lo cual es un desastre fiscal además de regulatorio. Tercera razón para usar Direct |

**Qué hay que construir** [ESTIMACIÓN propia]:

| Tarea | Horas |
|---|---:|
| Alta de cuentas conectadas, KYC, estados de onboarding, reintentos | 24 |
| Cargos Direct con comisión de plataforma | 16 |
| Webhooks: pago, reembolso, contracargo, disputa | 20 |
| Panel de conciliación para el restaurante | 16 |
| **Pagos parciales**: que cuatro personas paguen partes de la misma cuenta sin que se duplique ni falte | 24 |
| Propina como línea separada, excluida de la comisión de plataforma | 8 |
| Pruebas con dinero real | 16 |
| **Total** | **124 h**, más revisión legal escrita |

**Los pagos parciales son el trabajo escondido.** Que una mesa de cuatro pague en cuatro cargos distintos, sobre una cuenta que sigue abierta, sin que se cobre de más ni se quede algo sin pagar, es el problema difícil de esta opción. Veinticuatro horas es optimista.

---

## 1.5 Opción D — Transferencia SPEI con referencia

**Qué es.** Carta muestra la CLABE del restaurante, el monto y una referencia. El comensal abre la app de su banco y transfiere.

| Concepto | Respuesta |
|---|---|
| **Quién es el comercio** | El restaurante, dueño de la CLABE |
| **Qué le cuesta al restaurante** | **$0.** *Recibir* una transferencia SPEI es gratuito [ESTIMACIÓN: criterio ampliamente citado; no lo localicé en texto de Banxico accesible — ver Anexo]. **Es la opción más barata que existe** |
| **Qué le cuesta a Carta** | **$0** si solo muestra los datos |
| **Exposición legal** | **Ninguna si la CLABE es del restaurante.** **Altísima si Carta usa CLABEs propias o "virtuales"** a su nombre para conciliar: eso es exactamente llevar saldo ajeno, artículo 22 |
| **Experiencia del comensal** | **La peor de todas.** Salir de Carta, entrar al banco, teclear 18 dígitos de CLABE, monto y referencia, y en muchos bancos dar de alta la cuenta destino con token antes de poder enviarle nada. En una mesa, con hambre y con prisa, eso no pasa |
| **La propina** | El comensal la suma al monto. Nadie la separa ni la registra |
| **El CFDI** | Lo emite el restaurante |

**Qué hay que construir:** pantalla con CLABE, monto, referencia y botón de copiar. **8 horas.**

**El muro que no se puede cruzar.** Para que Carta se entere sola de que la transferencia llegó, tendría que leer la cuenta bancaria del restaurante. Eso exige o una API bancaria (que el restaurante tendría que contratar y autorizar) o un agregador. **Y la tentación —darle a cada mesa una CLABE virtual emitida por un tercero a nombre de Carta— es precisamente el delito del artículo 124.** No hay atajo: o el mesero confirma a mano, o Carta toca dinero.

**DiMo** (pago por número de celular) quita el tecleo de la CLABE, pero no trae mensaje de cobro con monto y concepto, así que empeora la conciliación en vez de arreglarla. Ya estaba descartado en la investigación anterior y sigue descartado.

---

## 1.6 Opción E — Tap-to-phone y terminal virtual

Desarrollada en la §1.1. Resumen en formato de opción:

| Concepto | Respuesta |
|---|---|
| **Quién es el comercio** | El restaurante, con su cuenta de Clip o Mercado Pago |
| **Qué le cuesta al restaurante** | Clip **2.99% + $1 + IVA**; Mercado Pago **3.5% + IVA**. Sin renta, sin costo de instalación, sin comprar aparato [VERIFICADO] |
| **Qué le cuesta a Carta** | **$0**, porque Carta no lo integra |
| **Exposición legal** | **Ninguna** |
| **Experiencia del comensal** | Muy buena: acerca su tarjeta al celular del mesero y listo |
| **La propina** | Se teclea en la app del proveedor sumada al total. **Y entonces la comisión se cobra también sobre la propina**: el 3.5% de lo que el comensal quiso darle al mesero se lo queda la pasarela |
| **El CFDI** | Lo emite el restaurante |
| **Horas para Carta** | **0 h** si el mesero teclea el monto que Carta le muestra. **Fuera de alcance** si se quiere integrar: exige app nativa, permiso de Apple y ser socio del proveedor |

**Los dos topes que hay que decir en voz alta:**

1. **Clip limita cada cobro a $1,000 MXN.** [VERIFICADO] Un restaurante de servicio completo con ticket promedio de $500 y mesas de cuatro personas pasa ese tope todos los días. Mercado Pago llega a **$3,000**, que sí alcanza casi siempre.
2. **Mercado Pago pide iPhone 11 o superior**; Clip acepta desde iPhone XS. Ambos piden Android 10 o superior con NFC activo. [VERIFICADO]

**La terminal virtual (MOTO), aparte:** Openpay y Conekta permiten teclear los datos de una tarjeta en un panel web. **Se descarta sin discusión.** Pedirle a un mesero que teclee la tarjeta de un comensal es un riesgo de fraude y un problema de cumplimiento PCI, la tasa de "tecleado" es más alta que la de chip, y ningún comensal debería dictar su tarjeta en voz alta en una mesa. No es una opción, es un incidente esperando a ocurrir.

---

## 1.7 Tres opciones más que el encargo no pedía y que conviene tener

**F. Efectivo con división en pantalla.** El medio más usado en los restaurantes mexicanos, y el único donde Carta aporta valor puro: nadie más le dice a seis personas cuánto pone cada una. **Costo $0, horas 0** (ya está en la Opción A).

**G. "Uno paga todo, los demás le transfieren".** Es lo que ya hace la gente, mal, con capturas de pantalla y cuentas mentales. Carta calcula cuánto le debe cada comensal a quien pagó y le arma a cada uno un mensaje listo para mandar por WhatsApp, con el monto exacto y el DiMo o la CLABE de quien pagó. **Carta no toca dinero de nadie: solo hace la aritmética y redacta el mensaje.** Costo $0 para todos, exposición legal cero, y resuelve el momento social más incómodo de la comida. Son unas **10 horas** encima de la Opción A y, en mi opinión, es la función más diferenciadora de esta lista.

**H. Mostrar el QR de CoDi del propio restaurante.** Ya evaluado y ya decidido: **descartado por decisión del dueño**, porque el sistema está prácticamente vacío (8,194 operaciones diarias en todo México). Se anota solo para dejar constancia de que la decisión sigue en pie y no hace falta volver a discutirla.

---

## 1.8 Tabla comparativa de las opciones de cobro

Ticket de referencia **$500 MXN pagado con tarjeta de crédito**. Todas las comisiones **sin IVA** para que sean comparables con las tasas de descuento de Banxico, que se publican sin IVA [ESTIMACIÓN de ese último punto: Banxico no lo explicita en la carátula del reporte].

| | **A. Carta no cobra** | **B. Enlace del proveedor** | **C. Cuentas conectadas** | **D. SPEI con referencia** | **E. Tap-to-phone** |
|---|---|---|---|---|---|
| **Quién es el comercio** | El restaurante | El restaurante | **El restaurante** (solo con cargos Direct) | El restaurante | El restaurante |
| **¿Carta toca dinero?** | **No** | **No** | **No** (Direct) / Sí (destino) | **No** (si la CLABE es del restaurante) | **No** |
| **Costo para el restaurante** | **$0 extra** (1.65%–2.33% de siempre) | Clip 2.99%+$1 · MP 3.49%+$4 | Stripe 3.6%+$3 · MP 3.49%+$4 | **$0** | Clip 2.99%+$1 · MP 3.5% |
| **Sobre $500, contra BBVA ($11.65)** | **$0** | Clip **+$4.30** · MP **+$9.80** | Stripe **+$9.35** | **−$11.65** (ahorra) | Clip **+$4.30** · MP **+$5.85** |
| **Al mes (600 cuentas con crédito)** | **$0** | Clip **+$2,580** · MP **+$5,880** | Stripe **+$5,610** | **−$6,990** | Clip **+$2,580** · MP **+$3,510** |
| **Costo para Carta** | **$0** | $0 | MXN35/cuenta activa + 0.25% + MXN12/depósito | $0 | $0 |
| **Horas de construcción** | **44 h** | +14 h (estática) · +64 h (dinámica) | **+124 h** y abogado | +8 h | **0 h** |
| **Exposición legal** | **Nula** | **Nula** | Baja con Direct; **grave** si se equivoca el tipo de cargo | Nula con CLABE del restaurante; **grave** con CLABE propia | **Nula** |
| **Experiencia del comensal** | Buena | Regular (sale y vuelve; monto que no cuadra) | **Excelente** | **Mala** | **Muy buena** |
| **Propina** | Sugerida, cobrada por el canal de siempre | Solo si el enlace es dinámico | Línea aparte, fuera de la comisión de Carta | Sumada al monto, sin registro | En la app del proveedor; **paga comisión** |
| **CFDI** | Del restaurante | Del restaurante | **Del restaurante** solo con Direct | Del restaurante | Del restaurante |
| **Tope por transacción** | — | Sin tope | Sin tope | El que fije el banco del comensal | **Clip $1,000** · **MP $3,000** |
| **¿Sirve para diciembre?** | **Sí** | Estática sí; dinámica no | **No** | Como cortesía | **Sí, recomendándolo, no integrándolo** |

---

## 1.9 La aritmética del sobrecosto, con todos los supuestos a la vista

**Supuestos declarados:**

| # | Supuesto | Valor | Origen |
|---|---|---:|---|
| P1 | Ticket promedio | $500 MXN | Supuesto de la investigación anterior; **no existe dato mexicano publicado** |
| P2 | Cuentas al mes | 1,200 | 40 mesas × 30 días |
| P3 | Cuentas pagadas con tarjeta de crédito | 600 | La mitad. Supuesto mío |
| P4 | Tasa de descuento actual del restaurante | 2.33% crédito | BBVA Bancomer, giro Restaurantes, julio 2026 [VERIFICADO — Banxico] |
| P5 | Las comisiones se comparan sin IVA | — | Para que sean comparables con Banxico |

**Costo de una cuenta de $500 con tarjeta de crédito, por proveedor:**

```
Terminal BBVA (hoy):        $500 × 2.33%           = $11.65
Terminal BBVA (débito):     $500 × 1.65%           =  $8.25

Clip (link o tap):          $500 × 2.99% + $1.00   = $15.95   → +$4.30
Getnet (terminal, estim.):  $500 × 2.90%           = $14.50   → +$2.85
Mercado Pago Point Tap:     $500 × 3.50%           = $17.50   → +$5.85
Stripe:                     $500 × 3.60% + $3.00   = $21.00   → +$9.35
Mercado Pago Link (inst.):  $500 × 3.49% + $4.00   = $21.45   → +$9.80

SPEI / efectivo:                                   =  $0.00   → −$11.65
```

**Al mes, sobre 600 cuentas con crédito:**

```
Clip:                600 × $4.30 = $2,580 MXN al mes MÁS
Getnet:              600 × $2.85 = $1,710 MXN al mes MÁS
Mercado Pago Tap:    600 × $5.85 = $3,510 MXN al mes MÁS
Stripe:              600 × $9.35 = $5,610 MXN al mes MÁS   ← coincide con la investigación anterior
Mercado Pago Link:   600 × $9.80 = $5,880 MXN al mes MÁS

SPEI o efectivo:     600 × $11.65 = $6,990 MXN al mes MENOS
```

**La conclusión no admite matices: ninguna opción de cobro que Carta pueda ofrecer le ahorra dinero al restaurante, salvo no cobrar.** La más barata de las pasarelas (Clip) le cuesta **$2,580 MXN al mes** más que su terminal. Eso es **siete veces** la mensualidad de $349 que Carta pensaba cobrar. Llegar con esa propuesta a un restaurante de servicio completo quema la reunión.

**Con una excepción real que vale dinero:** el restaurante que **no tiene terminal bancaria** —porque no le dan contrato, porque factura poco, porque acaba de abrir— no está comparando 2.99% contra 2.33%. Está comparando 2.99% contra **no poder cobrar con tarjeta**. Para ese, Clip con tap-to-phone es una mejora enorme. **Ese, y solo ese, es el restaurante al que Carta debe mencionarle la Opción E.**

---

## 1.10 La propina

Tres hechos y una regla de diseño.

**Hecho 1 — la propina no es del restaurante.** El artículo 346 de la Ley Federal del Trabajo establece que las propinas percibidas en hoteles, restaurantes, bares y establecimientos similares **forman parte del salario del trabajador** y son **propiedad exclusiva de los trabajadores**. El patrón no puede apropiárselas ni contarlas como ingreso propio. [ESTIMACIÓN: leído en reproducciones del texto legal y en material de divulgación; no abrí el PDF oficial de la LFT — ver Anexo]

**Hecho 2 — la propina no se factura.** No es contraprestación del servicio ni ingreso del establecimiento, así que no entra en la base gravada del IVA. Si por control administrativo aparece en el CFDI (porque se cobró junto con el consumo en la terminal), debe registrarse con clave **ObjetoImp = 01, "No objeto de impuesto"**, para que no se le calcule IVA. [ESTIMACIÓN: criterio concordante en material fiscal especializado; el criterio normativo del SAT que lo respalda devolvió error 504 al intentar abrirlo — ver Anexo]

**Hecho 3 — la propina paga comisión si pasa por una pasarela.** Si el comensal deja $75 de propina sobre un consumo de $500 y todo se cobra junto por Clip, la comisión se calcula sobre $575, no sobre $500. **El 2.99% de la propina —$2.24— se lo queda la pasarela**, y sale del bolsillo del mesero o del restaurante, no del comensal. Con Mercado Pago al 3.5%, son $2.63. No es mucho por cuenta; son **$1,340 a $1,575 MXN al mes** en un restaurante de 600 cuentas con tarjeta [ESTIMACIÓN propia, supuesto de 15% de propina].

**La regla de diseño que sale de los tres:**

> **Carta sugiere la propina, la calcula y la muestra. Nunca la cobra, nunca la guarda, nunca la reparte, y nunca cobra comisión de plataforma sobre ella.**

Cobrar comisión sobre la propina sería quedarse con parte del salario de un trabajador (Hecho 1). Guardarla y repartirla sería llevar saldo ajeno (artículo 22). Y en la Opción C, la comisión de plataforma debe calcularse **sobre el consumo, no sobre el total** — es un parámetro de una línea en el código y hay que dejarlo escrito antes de que alguien lo escriba mal.

---

## 1.11 La factura (CFDI)

**Quién factura no lo decide Carta: lo decide quién fue el comercio.** Esa es toda la sección.

| Opción | Quién emite el CFDI | Qué hace Carta |
|---|---|---|
| **A, B, D, E** | El restaurante | Muestra folio, total y el enlace o QR al portal de facturación del restaurante |
| **C con cargos Direct** | **El restaurante**, porque el cargo se creó en su cuenta | Igual que arriba |
| **C con cargos a destino** | **Carta**, porque el cargo se creó en la cuenta de Carta | **Carta tendría que facturarle el consumo al comensal y acumularlo como ingreso propio.** Desastre fiscal encima del regulatorio |

**Esa última fila es la cuarta razón independiente para usar cargos Direct**, y es la más fácil de explicarle a un contador: con cargos a destino, Carta se convierte en el vendedor de la comida.

**Lo demás ya está resuelto de la investigación anterior** y no cambia: el restaurante debe emitir la **factura global dentro de 24 horas** (regla 2.7.1.21 de la RMF 2026) [VERIFICADO — investigación anterior]; y si algún día Carta timbra por cuenta del restaurante, el costo variable es de **$0.50 MXN por folio** vía API de Facturama, más **$1,650 MXN al año** del módulo [VERIFICADO — investigación anterior].

**Recomendación para diciembre:** Carta **no** timbra. Muestra los datos y el enlace. Medio peso por folio no es el problema; el problema es volverse responsable de la obligación fiscal de otro antes de saber si el producto sirve.

---

## 1.12 Recomendación ordenada del Encargo 1

### **En el piloto de diciembre de 2026**

| Va | Por qué |
|---|---|
| **Opción A completa** — cuenta, división en pantalla, propina sugerida, mesero marca como pagada | 44 h, $0 de costo, cero riesgo legal, y resuelve el problema que nadie más resuelve |
| **Opción G** — "uno paga, los demás le transfieren", con el monto y el mensaje listos | 10 h, $0, y es la función más diferenciadora de todo el documento |
| **Opción B-estática** — campo opcional para que el restaurante pegue su enlace de cobro, y Carta lo muestra como QR | 14 h. Si el restaurante lo quiere, está; si no, no estorba. Cero compromiso |
| **Opción E como consejo, no como código** — al restaurante sin terminal, decirle que existe Clip tap-to-phone | 0 h. Genera confianza y no cuesta nada |

**Total de trabajo de cobros para el piloto: 68 horas.** Nada que integrar, nada que conciliar, nada que auditar.

### **En la V2, después del piloto y solo si el piloto lo pide**

| Va | Condición para empezarla |
|---|---|
| **Opción B-dinámica** con Clip (la más barata de las pasarelas) | Que al menos tres restaurantes del piloto lo pidan **por escrito** y entiendan el sobrecosto de $2,580 MXN al mes |
| **Opción C con cargos Direct de Stripe Connect** o Split 1:1 de Mercado Pago | Que exista un cliente que **no tenga contrato bancario**, y que un abogado fintech mexicano confirme el diseño **por escrito** antes de la primera línea de código |

### **Nunca**

| No va | Por qué |
|---|---|
| **Cargos a destino o transferencias separadas** de Stripe Connect | El dinero pasa por el saldo de Carta. Artículo 22, y encima Carta tendría que facturar la comida |
| **CLABEs virtuales a nombre de Carta** para conciliar SPEI | Es literalmente llevar cuentas con saldo ajeno. Artículo 124: siete a quince años |
| **Terminal virtual / MOTO** (que el mesero teclee la tarjeta) | Riesgo de fraude, problema de PCI, y ningún comensal debe dictar su tarjeta en una mesa |
| **Comisión de plataforma calculada sobre la propina** | Es quedarse con parte del salario de un trabajador (LFT 346) |
| **Que Carta reparta propinas entre meseros** | Saldo ajeno otra vez. Artículo 22 |
| **Ser IFPE o agregador** | $4,410,538 de capital, o meses de trámite y un contrato bancario que hoy no existe. Ya decidido |

---

# ENCARGO 2 — ¿La publicidad alcanza para pagar la infraestructura?

## 2.1 Los supuestos de carga, todos declarados

Nada de lo que sigue tiene sentido sin esto. Cada número de las tablas de costo sale de aquí.

| # | Supuesto | Valor | Origen |
|---|---|---:|---|
| C1 | Sesiones de mesa al mes, por restaurante | **3,000** | Investigación 19-sep: 40 mesas × 2.5 comensales × 30 días |
| C2 | Modelos 3D que ve un comensal por sesión | 3 | Supuesto de la investigación anterior |
| C3 | Peso de un modelo optimizado (Draco + KTX2) | **2 MB** | Supuesto anterior. El tope de Scene Viewer es 10 MB [VERIFICADO] |
| C4 | Imágenes, JS y CSS por sesión, ya con caché | 2 MB | **Supuesto mío** |
| C5 | Egreso por sesión | **8 MB** | C2 × C3 + C4 |
| C6 | **Egreso al mes por restaurante** | **24 GB** | 3,000 × 8 MB |
| C7 | Peticiones de archivos estáticos por sesión | 40 | **Supuesto mío** |
| C8 | Peticiones de API por sesión | 25 | **Supuesto mío** |
| C9 | Catálogo guardado por restaurante | **0.2 GB** | 50 platillos × (2 MB modelo + 1 MB fotos) |
| C10 | Base de datos por restaurante | **0.5 GB** | **Supuesto mío**: menú, órdenes históricas, metadatos |
| C11 | CPU por petición de API | 200 ms a 1 vCPU | **Supuesto mío**, generoso |
| C12 | Memoria del contenedor | 512 MiB | **Supuesto mío** |
| C13 | Tipo de cambio | **$17.1872 MXN/USD** | DOF, 18-sep-2026 [VERIFICADO — investigación anterior] |
| C14 | Tipo de cambio | **$19.80 MXN/EUR** | **[ESTIMACIÓN]**: prensa financiera, mediados de septiembre de 2026 ($19.78–$19.80). No lo localicé en el DOF |

**Lo que resulta, por escala:**

| | **1 restaurante** | **10 restaurantes** | **100 restaurantes** |
|---|---:|---:|---:|
| Sesiones al mes | 3,000 | 30,000 | 300,000 |
| **Egreso al mes** | **24 GB** | **240 GB** | **2,400 GB** |
| Peticiones estáticas | 120,000 | 1,200,000 | 12,000,000 |
| Peticiones de API | 75,000 | 750,000 | 7,500,000 |
| Objetos guardados | 0.2 GB | 2 GB | 20 GB |
| Base de datos | 0.5 GB | 5 GB | 50 GB |
| vCPU-segundo al mes | 15,000 | 150,000 | 1,500,000 |
| GiB-segundo al mes | 7,500 | 75,000 | 750,000 |

**Mírese la fila del egreso y recuérdese al leer todo lo que sigue.** Es la única que crece rápido y la única que algunos proveedores cobran a precio de oro y otros regalan.

---

## 2.2 Camino 1 — Google Cloud (Cloud Run + Cloud SQL + Cloud Storage + CDN)

**Tarifas usadas** [todas ESTIMACIÓN, por lo explicado en la nota de método]:

| Concepto | Tarifa | Nota |
|---|---:|---|
| Cloud Run, CPU | $0.000024 / vCPU-segundo | Región tier 1 (us-central1) |
| Cloud Run, memoria | $0.0000025 / GiB-segundo | ídem |
| Cloud Run, peticiones | $0.40 por millón | ídem |
| Cloud Run, capa gratuita mensual | 180,000 vCPU-s · 360,000 GiB-s · 2,000,000 peticiones | ídem |
| Cloud SQL, db-f1-micro | ≈ $8 / mes | Sin SLA. *"No cubierto por el SLA estándar de Cloud SQL"* |
| Cloud SQL, db-g1-small | ≈ $26 / mes | |
| Cloud SQL, almacenamiento SSD | ≈ $0.17 / GB-mes | **No pude verificarlo** |
| Cloud Storage Standard | $0.020 / GB-mes | us-central1 |
| **Egreso a internet** | **$0.12 / GB** | Primer tramo. Con Cloud CDN, el egreso de caché en Norteamérica baja a ≈$0.08/GB, más el costo de llenar la caché |

**La cuenta:**

```
CLOUD RUN
  1 rest:   75,000 pet. (< 2M gratis)          = $0.00
            15,000 vCPU-s (< 180,000 gratis)   = $0.00
 10 rest:  750,000 pet. (< 2M gratis)          = $0.00
           150,000 vCPU-s (< 180,000 gratis)   = $0.00
100 rest: (7,500,000 − 2,000,000) × $0.40/M    = $2.20
          (1,500,000 − 180,000) × $0.000024    = $31.68
            (750,000 − 360,000) × $0.0000025   = $0.98
                                       subtotal = $34.86

CLOUD SQL
  1 rest:  db-f1-micro $8.00 + 10 GB × $0.17   = $9.70
 10 rest:  db-g1-small $26.00 + 20 GB × $0.17  = $29.40
100 rest:  2 vCPU/7.5 GB ≈ $100 + 100 GB × $0.17 = $117.00   [ESTIMACIÓN gruesa]

CLOUD STORAGE
  1 / 10 / 100 rest: 0.2 / 2 / 20 GB × $0.020  = $0.004 / $0.04 / $0.40

EGRESO A INTERNET  ← el que importa
  1 rest:     24 GB × $0.12                    = $2.88
 10 rest:    240 GB × $0.12                    = $28.80
100 rest:  2,400 GB × $0.12                    = $288.00
```

**Totales Google Cloud:**

| | 1 restaurante | 10 restaurantes | 100 restaurantes |
|---|---:|---:|---:|
| USD al mes | **$12.58** | **$58.24** | **$440.26** |
| **MXN al mes** | **$216** | **$1,001** | **$7,567** |
| **Por restaurante** | $216 | $100 | $76 |

**Lo que dice esta tabla:** con presupuesto de $500 MXN al mes, **Google Cloud se sale del presupuesto en el restaurante número 7**:

```
Costo(N) = $167 fijo (Cloud SQL) + $50 por restaurante (egreso)
$167 + $50N = $500  →  N = 6.66  →  se rompe en el restaurante 7
```

Y hay un detalle que empeora el cuadro: la instancia `db-f1-micro` que hace posible el costo de $216 **no tiene SLA** y Google la describe como para desarrollo y pruebas. Para un piloto en tres ciudades con comensales de verdad, eso es una decisión, no un descuido.

---

## 2.3 Camino 2 — Hetzner + Cloudflare R2 (el barato serio)

**La idea:** los modelos 3D y las imágenes —que son el 75% del egreso— salen por **Cloudflare R2, que no cobra egreso**. La API, que es JSON pequeño, sale por un servidor de Hetzner.

**Tarifas** [VERIFICADO salvo donde se indique]:

| Concepto | Tarifa | Marca |
|---|---:|---|
| Cloudflare R2, almacenamiento Standard | **$0.015 / GB-mes** | [VERIFICADO] |
| Cloudflare R2, **egreso** | **"Free"** | [VERIFICADO] |
| Cloudflare R2, operaciones Clase A (escritura) | $4.50 / millón | [VERIFICADO] |
| Cloudflare R2, operaciones Clase B (lectura) | $0.36 / millón | [VERIFICADO] |
| Cloudflare R2, capa gratuita | **10 GB-mes · 1M Clase A · 10M Clase B · egreso gratis** | [VERIFICADO] |
| Hetzner CX23 (2 vCPU, 4 GB, 40 GB NVMe, 20 TB tráfico) | **€5.49 / mes** | [ESTIMACIÓN — precio nuevo desde el 15-jun-2026, fuente secundaria] |
| Hetzner CX33 (4 vCPU, 8 GB, 80 GB NVMe, 20 TB) | €8.49 / mes | [ESTIMACIÓN — ídem] |
| IPv4 pública | ≈ €0.60 / mes | [ESTIMACIÓN] |

**Advertencia obligatoria sobre Hetzner:** el 15 de junio de 2026 Hetzner subió sus precios, y en la línea CPX los subió **entre 2.4 y 2.75 veces** (el CPX22 pasó de €7.99 a €19.49). La línea CX subió menos: **de €3.99 a €5.49** el CX23. [ESTIMACIÓN — análisis de terceros; la única cifra que Hetzner publica en su propio sitio es la de 2024: **CX22 a €3.79 con 20 TB de tráfico incluido** [VERIFICADO]]. **Quien vaya a contratar debe abrir la consola de Hetzner y confirmar el precio del día.**

**La cuenta:**

```
  1 restaurante
    1 × CX23 (app + Postgres + respaldos)    €5.49 + €0.60 IPv4 = €6.09  = $121 MXN
    R2: 0.2 GB de 10 GB gratis                                          = $0
    R2: 120,000 lecturas de 10M gratis                                  = $0
                                                                  TOTAL = $121 MXN

 10 restaurantes
    El mismo CX23 (2 vCPU y 4 GB aguantan 30,000 sesiones al mes)       = $121 MXN
    R2: 2 GB de 10 GB gratis · 1.2M lecturas de 10M gratis              = $0
                                                                  TOTAL = $121 MXN

100 restaurantes
    1 × CX33 para la aplicación              €8.49
    1 × CX23 para Postgres y respaldos       €5.49
    2 × IPv4                                 €1.20
                                            €15.18 = $301 MXN
    R2 almacenamiento: (20 − 10) GB × $0.015          = $0.15
    R2 lecturas:       (12M − 10M) × $0.36/M          = $0.72
                                          $0.87 USD  = $15 MXN
    EGRESO (2,400 GB):                                 = $0   ← R2 no cobra egreso
                                                                  TOTAL = $316 MXN
```

**Totales Hetzner + R2:**

| | 1 restaurante | 10 restaurantes | 100 restaurantes |
|---|---:|---:|---:|
| **MXN al mes** | **$121** | **$121** | **$316** |
| **Por restaurante** | $121 | $12 | **$3.16** |

**La objeción real, y su respuesta.** Los centros de datos baratos de Hetzner están en **Alemania y Finlandia**; de ahí a México hay unos 150 a 200 ms de ida y vuelta. Para una carta que tiene que sentirse instantánea, eso se nota. Hay dos salidas:

1. **La buena:** los modelos 3D y las imágenes —lo pesado y lo que el comensal espera— salen de **Cloudflare, que tiene presencia en México**. A Alemania solo van llamadas de API con JSON de unos kilobytes. Un retraso de 180 ms al agregar un platillo al carrito es perceptible pero tolerable.
2. **La cara:** Hetzner también tiene Ashburn y Hillsboro, a unos 50 ms de México. Pero ahí el CPX11 cuesta **$20.49 USD al mes con solo 1 TB de tráfico incluido** [ESTIMACIÓN — fuente secundaria], contra €5.49 con 20 TB en Alemania. Aun así, **1 TB alcanza de sobra**, porque el tráfico pesado ya va por R2: a 100 restaurantes la API mueve unos 37 GB. Costo: unos **$352 MXN al mes por el servidor**, más R2. **Sigue cabiendo en el presupuesto de $500.**

**Esa segunda salida es la que yo tomaría**: pagar $352 en vez de $121 por bajar de 180 ms a 50 ms, en un producto cuya promesa es que el menú se siente rápido, es de los mejores $231 pesos que este proyecto puede gastar.

---

## 2.4 Camino 3 — Supabase + Cloudflare R2 + Workers (el gestionado barato)

**La idea:** no administrar un servidor. Supabase da Postgres, autenticación, tiempo real y API generada; R2 guarda los modelos; Cloudflare Workers sirve el front.

**Tarifas** [VERIFICADO]:

| Concepto | Tarifa |
|---|---|
| Supabase Free | $0 · 500 MB de base · 5 GB de egreso · 1 GB de archivos · **"Free projects are paused after 1 week of inactivity"** |
| Supabase Pro | **$25/mes** · 8 GB de base (luego $0.125/GB) · 250 GB de egreso (luego $0.09/GB) · 100 GB de archivos (luego $0.0213/GB) · incluye $10 de crédito de cómputo |
| Cloudflare Workers Free | 100,000 peticiones **al día** · 10 ms de CPU por invocación · activos estáticos gratis e ilimitados |
| Cloudflare Workers Paid | **$5/mes** · 10M peticiones incluidas · **$0.30 por millón adicional** · 30M ms de CPU incluidos |

**La cuenta:**

```
  1 restaurante: 195,000 peticiones al mes = 6,500 al día (< 100,000 gratis)
    Supabase Pro $25 + Workers $0 + R2 $0                        = $25 USD = $430 MXN

 10 restaurantes: 1.95M al mes = 65,000 al día (< 100,000 gratis)
    Supabase Pro $25 + Workers $0 + R2 $0                        = $25 USD = $430 MXN

100 restaurantes: 19.5M al mes = 650,000 al día
    Supabase Pro                                    $25.00
    Base de datos: (50 − 8) GB × $0.125             $5.25
    Egreso de API: 150 GB (< 250 GB incluidos)      $0.00
    Workers                                         $5.00
    Workers, exceso: (19.5M − 10M) × $0.30/M        $2.85
    R2                                              $0.87
                                                   $38.97 USD  = $670 MXN
```

**Totales Supabase + R2 + Workers:**

| | 1 restaurante | 10 restaurantes | 100 restaurantes |
|---|---:|---:|---:|
| **MXN al mes** | **$430** | **$430** | **$670** |
| **Por restaurante** | $430 | $43 | $6.70 |

**Se sale del presupuesto de $500 en algún punto entre 10 y 100 restaurantes**, pero compra algo que las otras opciones no dan: **nadie tiene que administrar un servidor Linux, aplicar parches de seguridad ni configurar respaldos de Postgres a mano.** Para un proyecto de una sola persona, eso vale.

**Un detalle del plan gratuito que hay que tener presente:** *"Free projects are paused after 1 week of inactivity"* [VERIFICADO]. Un restaurante que cierre una semana por vacaciones vuelve y su Carta está apagada. En el plan Pro no pasa.

---

## 2.5 Camino 4 — Todo gratis (solo para el piloto)

| Pieza | Plan | Techo real |
|---|---|---|
| **Neon** Free | $0 · **0.5 GB** por proyecto · 100 CU-horas · *autosuspend a los 5 min, "cannot be turned off"* | El autosuspend significa **arranque en frío** para el primer comensal del día |
| **Supabase** Free | $0 · 500 MB de base · 5 GB de egreso | **Se pausa tras una semana sin uso** |
| **Cloudflare R2** Free | $0 · **10 GB** · 10M lecturas · **egreso gratis** | ≈ 50 restaurantes de catálogo |
| **Cloudflare Workers** Free | $0 · **100,000 peticiones al día** | ≈ 15 restaurantes (1,500 sesiones al día) |
| **Fly.io** | shared-cpu-1x 256 MB **$2.02/mes** · volúmenes $0.15/GB-mes · egreso **$0.02/GB** en Norteamérica | [VERIFICADO] Alternativa si se quiere control |
| **Railway** | Hobby **$5/mes** con $5 de crédito · $20/vCPU-mes · $10/GB-mes · **egreso $0.05/GB** | [VERIFICADO] |

**Total: $0 al mes.** Y **el cuello de botella es la base de datos, no el tráfico**: con 0.5 GB en Neon Free o 500 MB en Supabase Free, **alcanza para uno o dos restaurantes**. Para el piloto de diciembre en tres ciudades, con un restaurante por ciudad, **esto basta y cuesta cero**.

**Lo que hay que saber antes de elegirlo:** el `autosuspend` de Neon a los 5 minutos no se puede apagar en el plan gratuito. El primer comensal que escanee el QR a las 13:00 va a esperar el arranque en frío de la base. Para un piloto es aceptable; para un producto no.

---

## 2.6 Tabla de costos de infraestructura por escala

Todo en **MXN al mes**, al tipo de cambio de C13 y C14.

| Camino | Piezas | **1 rest.** | **10 rest.** | **100 rest.** | Por rest. a 100 | ¿Cabe en $500? |
|---|---|---:|---:|---:|---:|---|
| **Todo gratis** | Neon Free + R2 Free + Workers Free | **$0** | — | — | — | Sí, pero **solo llega a 1–2** |
| **Hetzner (Alemania) + R2** | CX23 + Cloudflare R2 | **$121** | **$121** | **$316** | **$3.16** | **Sí, hasta 100 y más** |
| **Hetzner (Ashburn) + R2** | CPX11 EE.UU. + R2 | $352 | $352 | ≈$380 | $3.80 | **Sí**, y a 50 ms de México |
| **Supabase + R2 + Workers** | Supabase Pro + R2 + Workers | $430 | $430 | $670 | $6.70 | Hasta ≈ 40 restaurantes |
| **Google Cloud** | Cloud Run + Cloud SQL + GCS + CDN | $216 | **$1,001** | **$7,567** | $76 | **No. Se rompe en el 7** |

**Lo que decide esta tabla, en una frase:** a 100 restaurantes, Google Cloud cuesta **$7,567** y Hetzner + R2 cuesta **$316**. **Veintitrés veces más, por hacer exactamente lo mismo.** Y casi toda la diferencia es una sola línea: **$288 USD de egreso en Google contra $0 en Cloudflare R2.**

**Cuál conviene a este presupuesto:**

- **Para diciembre (1–3 restaurantes): el camino gratis.** Neon Free o Supabase Free, R2 Free, Workers Free. **$0 al mes.** Sin tarjeta, sin riesgo, sin nada que administrar.
- **Cuando haya 4 o más: Hetzner Ashburn + Cloudflare R2, unos $352 MXN al mes.** Cabe en el presupuesto hasta bastante más de 100 restaurantes y está cerca de México.
- **Google Cloud: no.** No por malo, sino porque **cobra el egreso** y el egreso es todo el producto de Carta. Un catálogo de modelos 3D en un proveedor que cobra $0.12 por GB es un negocio que se paga a sí mismo la ruina.

---

## 2.7 El punto de equilibrio: ¿a partir de cuántos restaurantes se sostiene sola la infraestructura?

**El modelo, explícito:**

```
Costo(N)   = F + m·N      F = costo fijo mensual
                          m = costo marginal por restaurante
Ingreso(N) = r·N          r = publicidad por restaurante al mes

Equilibrio:  r·N ≥ F + m·N   →   N* = F / (r − m)
             (solo tiene solución si r > m)
```

**Los tres valores de `r`**, tomados sin cambios de la investigación del 19 de septiembre:

| Escenario | `r` (MXN/restaurante/mes) | De dónde sale |
|---|---:|---|
| **Pesimista** | **$27** | Escenario B ajustado a México: 1 anuncio por comensal, rendimiento mexicano [ESTIMACIÓN] |
| **Medio** | **$81** | Escenario A ajustado a México: 3 anuncios por comensal [ESTIMACIÓN] |
| **Optimista** | **$405** | Escenario A sin ajustar, tarifa "Américas" de la calculadora de AdSense [VERIFICADO la tarifa; ESTIMACIÓN el escenario] |

**Los valores de `F` y `m` por camino:**

| Camino | `F` (fijo) | `m` (marginal) | De qué se compone `m` |
|---|---:|---:|---|
| **Hetzner + R2 (Alemania)** | $121 | **$0.79** | R2: $0.05 de almacenamiento + $0.74 de lecturas. **Egreso $0** |
| **Hetzner + R2 (Ashburn)** | $352 | $0.79 | ídem |
| **Supabase + R2 + Workers** | $430 | $0.79 → $1.86 | R2 + base de datos por encima de 8 GB (a partir de 16 restaurantes) |
| **Google Cloud** | $167 | **$50.00** | **24 GB × $0.12 USD × 17.1872 = $49.50 de puro egreso** |

**Los resultados:**

| Camino | `r` = $27 (pesimista) | `r` = $81 (medio) | `r` = $405 (optimista) |
|---|---|---|---|
| **Hetzner + R2 (Alemania)** | $121 / ($27−$0.79) = 4.6 → **5 restaurantes** | 121 / 80.21 = 1.5 → **2 restaurantes** | 0.3 → **1 restaurante** |
| **Hetzner + R2 (Ashburn)** | 352 / 26.21 = 13.4 → **14 restaurantes** | 352 / 80.21 = 4.4 → **5 restaurantes** | 0.9 → **1 restaurante** |
| **Supabase + R2 + Workers** | 430 / 26.21 = 16.4 → **17 restaurantes** | 430 / 80.21 = 5.4 → **6 restaurantes** | 1.1 → **2 restaurantes** |
| **Google Cloud** | **$27 < $50** → **NUNCA** | 167 / 31 = 5.4 → **6 restaurantes** | 0.5 → **1 restaurante** |

**La celda que hay que leer dos veces es la de abajo a la izquierda.** En Google Cloud, con el supuesto publicitario pesimista, **el punto de equilibrio no existe**: cada restaurante nuevo consume **$50 MXN** de egreso y genera **$27 MXN** de publicidad. **Crecer empobrece.** No hay número de restaurantes que arregle eso, porque el problema no es de escala sino de signo.

**Y la respuesta al encargo, en un renglón:**

> **Con Hetzner + Cloudflare R2, la publicidad cubre la infraestructura a partir del restaurante número 5 en el escenario pesimista, y del número 2 en el escenario medio.**

Con el camino más caro pero mejor ubicado (Ashburn), son **14** y **5**. Con Supabase, **17** y **6**.

---

## 2.8 El freno que la aritmética no ve: el umbral de cobro

Que la hoja de cálculo cuadre no significa que llegue dinero al banco.

**El umbral de pago de Google AdSense para México es de $1,200 MXN.** [VERIFICADO — Google AdSense Help] La tabla oficial de umbrales en pesos, íntegra:

| Concepto | MXN |
|---|---:|
| Información fiscal | Mex$0 |
| Verificación de identidad | equivalente a $10 USD |
| Alta de forma de pago | Mex$120 |
| **Umbral de pago** | **Mex$1,200** |
| Cancelación | Mex$120 |

Y sobre cuándo paga: *"If your current balance reaches the payment threshold by the end of the month, and there are no other payment holds, you'll be issued a payment between the 21st and the 26th of the month."* [VERIFICADO]

**Cuántos restaurantes hacen falta para cobrar todos los meses:**

```
r = $27:   $1,200 ÷ $27  = 44.4  →  45 restaurantes
r = $81:   $1,200 ÷ $81  = 14.8  →  15 restaurantes
r = $405:  $1,200 ÷ $405 =  2.96 →   3 restaurantes
```

**Y cuánto tarda el primer depósito a escala de piloto:**

```
Con 3 restaurantes y r = $27:   $81 al mes  →  $1,200 ÷ $81  = 14.8 meses
Con 5 restaurantes y r = $27:  $135 al mes  →  $1,200 ÷ $135 =  8.9 meses
Con 10 restaurantes y r = $27: $270 al mes  →  $1,200 ÷ $270 =  4.4 meses
Con 10 restaurantes y r = $81: $810 al mes  →  $1,200 ÷ $810 =  1.5 meses
```

**Traducción honesta:** con el piloto de diciembre y tres restaurantes, **Google no deposita nada durante más de un año.** La publicidad "cubre" la infraestructura solo en el sentido contable. En el sentido de tener pesos en la cuenta para pagarle a Hetzner, **no cubre nada hasta que haya del orden de quince restaurantes**.

Eso no invalida la idea; obliga a decirla bien:

> **La publicidad es el mecanismo que hace que el nivel gratuito no cueste dinero a mediano plazo. No es una fuente de caja para el primer año.**

---

## 2.9 Qué red publicitaria acepta a un sitio así

**Cuánto tráfico genera Carta**, con los supuestos C1 y C2:

```
1 restaurante = 3,000 sesiones al mes × 3 vistas de página = 9,000 vistas de página al mes
```

| Red | Requisito mínimo publicado | **Restaurantes que hacen falta** | ¿Califica Carta? | Marca |
|---|---|---:|---|---|
| **Google AdSense** | Sin mínimo de tráfico publicado. Contenido *"high-quality, original"*; poder acceder al código HTML del sitio; 18 años | **1** | **Sí**, con el riesgo de política de la §2.10 | [VERIFICADO] |
| **Google Ad Manager** (versión gratuita) | Hasta **90 millones de impresiones al mes** sin costo en EE.UU./Canadá/Australia/NZ; **150 millones** en el resto | **1** | **Sí** — y es la vía correcta para vender anuncios locales directos | [ESTIMACIÓN — términos de DFP Small Business] |
| **Monumetric** | 10,000 vistas de página al mes | **2** | Probablemente sí. **Cobra cuota de alta en el nivel de entrada** [NO VERIFICADO el monto] | [ESTIMACIÓN] |
| **Journey by Mediavine** | 10,000 sesiones al mes | **4** | Posible | [ESTIMACIÓN] |
| **Mediavine** | 50,000 sesiones al mes | **17** | Para la V2 | [ESTIMACIÓN] |
| **Raptive** | 25,000 vistas de página **+ 50% del tráfico de EE.UU., RU, Canadá, NZ o Australia** | — | **NO.** El tráfico de Carta es mexicano | [ESTIMACIÓN] |
| **Ezoic** | **250,000** para sitios nuevos dados de alta después del 19-feb-2026 | ≈ **84** | No en el piloto | [ESTIMACIÓN] |
| **Media.net** | **Contenido en inglés únicamente** + tráfico principalmente de EE.UU., RU o Canadá | — | **NO.** Carta es en español | [ESTIMACIÓN] |
| **Adsterra / PropellerAds** | Sin mínimo. Aceptan tráfico latinoamericano | **1** | Técnicamente sí; **formatos agresivos** (pop-under, push) → riesgo de marca para el restaurante | [ESTIMACIÓN] |

**Cuánto tarda la aprobación:** Google no publica un plazo. Las guías del sector convergen en **de dos a cuatro semanas** para un sitio nuevo bien preparado. [ESTIMACIÓN — fuentes secundarias concordantes; Google no lo publica] **Hay que solicitarla en octubre, no en diciembre.**

**Lo que Google sí dice y sí importa:** *"Google has not confirmed a minimum number of articles needed for approval"*; no publica ni número de páginas, ni mínimo de tráfico, ni antigüedad del dominio. Lo que exige es contenido original, sitio accesible y navegable, cumplimiento de políticas y avisos de privacidad correctos. [ESTIMACIÓN — síntesis de fuentes secundarias sobre la página oficial de elegibilidad, que sí verifiqué en sus cuatro requisitos]

---

## 2.10 El riesgo de rechazo, y cómo se diseña para evitarlo

Este es el apartado que más vale de todo el Encargo 2, porque se resuelve en el diseño y no se puede resolver después.

**La política textual de Google:**

> *"We do not allow Google-served ads on screens: without publisher-content or with low-value content, that are under construction, that are used for alerts, navigation or other behavioral purposes"*

Y los ejemplos que la propia política enumera: pantallas *"dead end"* o sin contenido, como las de **agradecimiento, salida y error**; apps cuyo foco de interacción es que el usuario mire hacia otro lado; y contenido generado automáticamente sin revisión ni curaduría. [VERIFICADO — Google Publisher Policies]

**Cómo se traduce al flujo de Carta, pantalla por pantalla:**

| Pantalla de Carta | ¿Anuncios? | Por qué |
|---|---|---|
| **La carta** (platillos, fotos, modelos 3D, descripciones) | **Sí** | Es contenido original y es el foco del usuario. Aquí es donde encaja |
| Ficha de un platillo | **Sí** | Ídem |
| Carrito / orden en construcción | **No** | Pantalla transaccional; el contenido no es el foco |
| **"Tu pedido va a la cocina"** | **No** | Es literalmente una pantalla de agradecimiento: el ejemplo textual de la política |
| Cuenta / división del pago | **No** | Transaccional |
| **"Mesa pagada, gracias"** | **No** | Pantalla de salida: el otro ejemplo textual |
| Error o QR inválido | **No** | Pantalla de error: el tercer ejemplo textual |

**El segundo riesgo, que es más sutil y más grave: si el menú solo existe detrás de un código de mesa, AdSense no tiene nada que revisar.** La página oficial de elegibilidad dice: *"It's important that you can access the HTML source code of the site you submit for AdSense."* [VERIFICADO] Un sitio cuyo contenido aparece únicamente tras escanear un QR en una mesa es, para el revisor de Google y para el rastreador, un sitio vacío.

**La solución vale doble.** Carta necesita, de todos modos, una **carta pública y rastreable por restaurante** —algo como `carta.mx/r/nombre-del-restaurante`— con los platillos, sus fotos, sus descripciones y sus modelos 3D, sin sesión de mesa. Eso:

1. Le da a AdSense algo real que revisar y que indexar.
2. Es exactamente donde los anuncios sí están permitidos.
3. **Le da al restaurante presencia en Google**, que es un argumento de venta por sí solo y que ninguno de sus competidores directos le está dando.

**El tercer riesgo no es de política, es comercial:** un anuncio de dieta, de un competidor o de algo de mal gusto al lado del menú de un restaurante de manteles es un problema con el cliente, no con Google. Se mitiga bloqueando categorías y URLs de anunciantes desde el panel, pero hay que hacerlo y hay que revisarlo.

---

## 2.11 Lo que de verdad rinde, y que no es AdSense

Una observación que sale de los números y que conviene dejar escrita.

A **100 restaurantes**, Carta tendría **900,000 vistas de página al mes** de gente sentada en un restaurante, con hambre, mirando comida, a punto de decidir qué pedir. **Ese es, por contexto, uno de los inventarios publicitarios más valiosos que existen** — y AdSense lo va a pagar a tarifa de "Food & Drink, Américas", sin saber nada de eso.

Lo que ese inventario vale de verdad no lo paga una red programática:

- **El propio restaurante**, promocionando el postre, la bebida de la casa o el especial del día. No es publicidad: es aumentar el ticket. Y no necesita aprobación de nadie.
- **Una marca local** —una cervecería artesanal que quiere aparecer junto a las cervezas, un tequila junto a los digestivos. Eso se vende directo, a CPM que Carta pone, y se sirve con **Google Ad Manager, que es gratis hasta 90 millones de impresiones al mes** [ESTIMACIÓN].

**La honestidad que toca:** vender publicidad local directa requiere un vendedor, y este es un proyecto de una persona. **Por eso AdSense es la respuesta correcta para el piloto** —se configura una vez y se olvida— y por eso conviene montarlo sobre Ad Manager desde el principio, para que el día que aparezca el primer anunciante local no haya que rehacer nada.

---

# 3. Recomendación final — una página ejecutable

## Lo que se hace, en orden

**1. En el piloto de diciembre, Carta no cobra. Punto.**
Se construye la Opción A completa: cuenta, división en pantalla, propina sugerida, y el mesero marca la mesa como pagada. Se agrega la Opción G ("uno paga, los demás le transfieren", con el monto y el mensaje ya redactados) porque es la función que nadie más ofrece y cuesta 10 horas. Y se deja un campo opcional para que el restaurante pegue su enlace de cobro de Clip o Mercado Pago, que Carta muestra como QR sin integrar nada. **Total: 68 horas. Costo: $0. Riesgo legal: ninguno.**

**2. Al restaurante que no tiene terminal, se le menciona el tap-to-phone. No se integra.**
Desde marzo de 2026 el mesero puede cobrar con su propio celular usando la app de Clip (iPhone XS o Android 10 en adelante, 2.99% + $1 + IVA, **tope de $1,000 por cobro**) o de Mercado Pago (iPhone 11 o Android 10, 3.5% + IVA, **tope de $3,000**). Carta no puede integrarlo —exige una app nativa con permiso de Apple— pero recomendarlo no cuesta nada y resuelve un problema real.

**3. La infraestructura del piloto es gratuita, y la de después cuesta $352 al mes.**
Para diciembre: **Neon Free o Supabase Free + Cloudflare R2 Free + Cloudflare Workers Free = $0**. Aguanta uno o dos restaurantes por ciudad, que es justo el piloto. A partir del cuarto restaurante: **Hetzner en Ashburn + Cloudflare R2, unos $352 MXN al mes**, que cabe en el presupuesto de $500 hasta bastante más allá de 100 restaurantes.

**4. Google Cloud queda descartado, y conviene saber exactamente por qué.**
No por caro en general, sino porque **cobra $0.12 USD por GB de egreso** y el egreso son los modelos 3D, que son el producto. A 100 restaurantes eso son **$7,567 MXN al mes** contra **$316** de Hetzner + R2. Y con el escenario publicitario pesimista, en Google Cloud **cada restaurante nuevo cuesta $50 y rinde $27: crecer empobrece.** Cloudflare R2 no cobra egreso, y esa sola línea de su página de precios decide la arquitectura entera.

**5. La solicitud de AdSense se manda en octubre, no en diciembre.**
Tarda de dos a cuatro semanas y necesita algo que revisar. Antes de mandarla hay que publicar la **carta pública por restaurante** (`carta.mx/r/nombre`), sin sesión de mesa, con platillos, fotos y modelos. Eso resuelve tres cosas a la vez: le da a Google contenido que revisar, crea el único lugar donde los anuncios están permitidos, y le da al restaurante presencia en Google.

**6. Los anuncios van en la carta y en ningún otro lado.**
La política de Google prohíbe anuncios en pantallas de agradecimiento, salida y error. En Carta eso significa: **sí** en la carta y en la ficha del platillo; **no** en el carrito, en "tu pedido va a la cocina", en la cuenta, en "mesa pagada" ni en la pantalla de error. Se monta sobre Google Ad Manager (gratis hasta 90 millones de impresiones al mes) para no tener que rehacerlo el día que aparezca un anunciante local.

**7. Y se le dice al señor el número, sin adornarlo.**
La publicidad **cubre la infraestructura a partir del restaurante número 5** en el escenario pesimista y del **número 2** en el escenario medio, con Hetzner + R2. Pero **Google no deposita hasta acumular $1,200 MXN**: con cinco restaurantes y el supuesto pesimista, el primer depósito llega **en nueve meses**. La publicidad hace que el nivel gratuito no cueste dinero. **No es caja para el primer año, y no hay que presentarla como si lo fuera.**

## Lo que no se hace, y por qué

| No se hace | Razón, en una línea |
|---|---|
| Cobrar con Stripe en la mesa | En México, Stripe **no vende un solo lector** y su Tap to Pay está en vista previa [VERIFICADO] |
| Cobrar con cualquier pasarela en el piloto | La más barata (Clip) le cuesta al restaurante **$2,580 MXN al mes más** que su terminal |
| Cargos a destino de Stripe Connect | El dinero pasa por el saldo de Carta → artículo 22, y Carta tendría que facturar la comida |
| CLABEs virtuales para conciliar SPEI | Es llevar saldo ajeno → artículo 124: siete a quince años de prisión |
| Cobrar comisión sobre la propina | Es quedarse con parte del salario de un trabajador (LFT art. 346) |
| Repartir propinas entre meseros | Saldo ajeno otra vez |
| Terminal virtual / que el mesero teclee la tarjeta | Fraude, PCI, y ningún comensal debe dictar su tarjeta en una mesa |
| Google Cloud | Cobra el egreso, y el egreso es el producto |
| Media.net y Raptive | Exigen contenido en inglés o tráfico de EE.UU./RU/Canadá. Carta es mexicana |
| Adsterra y PropellerAds | Aceptan a cualquiera, pero sus formatos arruinarían el menú de un restaurante de manteles |

---

# 4. Fuentes

Todas consultadas el **20 de septiembre de 2026**, salvo donde se indique.

**Tap to phone y cobro presencial en México**

- Apple — *Apple habilita Tap to Pay en iPhone en México* (24-mar-2026): https://www.apple.com/mx/newsroom/2026/03/apple-brings-tap-to-pay-on-iphone-to-mexico/
- Apple Developer — *Setting up the entitlement for Tap to Pay on iPhone*: https://developer.apple.com/documentation/ProximityReader/setting-up-the-entitlement-for-tap-to-pay-on-iPhone
- Stripe — *Terminal: regional considerations* (tabla de disponibilidad por país, incluida la fila MX): https://docs.stripe.com/terminal/payments/regional
- Stripe — *Terminal: Tap to Pay*: https://docs.stripe.com/terminal/payments/setup-reader/tap-to-pay
- Clip — *Tap to Pay en iPhone*: https://www.clip.mx/soluciones/tap-to-pay-on-iphone
- Clip — *Tap to Pay en Android*: https://www.clip.mx/soluciones/tap-to-pay-android
- Mercado Pago — *Point Tap iOS*: https://www.mercadopago.com.mx/herramientas-para-vender/point-tap-ios
- Mercado Pago — *Point Tap*: https://www.mercadopago.com.mx/herramientas-para-vender/point-tap

**Enlaces de cobro**

- Clip — *¿Cuál es la comisión de link de pago?*: https://blog.clip.mx/articulo/cual-es-la-comision-por-tranzaccion-link-de-pago
- Clip — *Conoce Pagos a Distancia Clip*: https://ayuda.clip.mx/AyudaClip/s/article/Conoce-Pagos-a-Distancia-Clip
- Mercado Pago — *Link de Pago* (comisiones por plazo de acreditación): https://www.mercadopago.com.mx/herramientas-para-vender/link-de-pago
- Getnet México — *Get Link and Pay*: https://www.getnet.net/mx/nuestros-productos/getlinkandpay

**Infraestructura**

- Cloudflare — *R2 pricing*: https://developers.cloudflare.com/r2/pricing/
- Cloudflare — *Workers pricing*: https://developers.cloudflare.com/workers/platform/pricing/
- Supabase — *Pricing*: https://supabase.com/pricing
- Neon — *Pricing*: https://neon.com/pricing
- Fly.io — *Pricing*: https://fly.io/docs/about/pricing/
- Railway — *Pricing*: https://railway.com/pricing
- Hetzner — *Cloud*: https://www.hetzner.com/cloud/
- Hetzner — *Hetzner introduces new shared vCPU cloud servers* (6-jun-2024; CX22 a €3.79 con 20 TB): https://www.hetzner.com/pressroom/new-cx-plans/
- Google Cloud — *Cloud Run pricing* (no legible por JavaScript): https://cloud.google.com/run/pricing
- Google Cloud — *Cloud SQL pricing* (no legible): https://cloud.google.com/sql/pricing
- Google Cloud — *Cloud Storage pricing* (no legible): https://cloud.google.com/storage/pricing
- Google Cloud — *VPC network pricing* (no legible): https://cloud.google.com/vpc/network-pricing

**Publicidad**

- Google AdSense — *Eligibility requirements for AdSense*: https://support.google.com/adsense/answer/9724
- Google AdSense — *Payment thresholds* (tabla por divisa; MXN 1,200): https://support.google.com/adsense/answer/1709871
- Google AdSense — *How payments work* (ciclo del 21 al 26): https://support.google.com/adsense/answer/1709858
- Google Publisher Policies — *Google-served ads on screens without publisher-content*: https://support.google.com/publisherpolicies/answer/11112688
- Google AdSense — *Google Publisher Policies*: https://support.google.com/adsense/answer/10502938
- Media.net — *Inventory Policies*: https://www.media.net/legal/inventorypolicies/
- Mediavine — *Requirements*: https://www.mediavine.com/mediavine-requirements/
- Raptive — *Who is eligible for Raptive*: https://help.raptive.com/hc/en-us/articles/360032840891-Who-is-eligible-for-Raptive
- Ezoic — *Getting Started: Ezoic's Requirements*: https://support.ezoic.com/kb/article/getting-started-ezoics-requirements
- Monumetric — *FAQ*: https://www.monumetric.com/frequently-asked-questions/
- Google — *Terms & Conditions, DoubleClick for Publishers Small Business*: https://www.google.com/doubleclick/publishers/small-business/terms/

**Regulación y referencias mexicanas**

- DOF — *Indicadores del día* (UDI 8.821632 al 20-sep-2026): https://dof.gob.mx/indicadores.php
- SAT — *Criterio normativo sobre propinas* (devolvió error 504 el 20-sep-2026): https://www.sat.gob.mx/articulo/83889/criterio-43/isr/n
- Las fuentes de Banxico, CNBV, Ley Fintech, Circular 12/2018 y Redes de Medios de Disposición están íntegras en la investigación del 19 de septiembre y no se repiten aquí.

---

# Anexo — lo que no se pudo verificar

Para que nadie construya nada encima de estos puntos sin volver a revisarlos.

1. **Todas las tarifas de Google Cloud.** Las páginas de precios de Cloud Run, Cloud SQL, Cloud Storage y redes **generan sus tablas con JavaScript y no devuelven las cifras al leerlas**. Se intentó cinco veces, con tres rutas y en dos idiomas. Las tarifas usadas ($0.000024/vCPU-s, $0.0000025/GiB-s, $0.40/millón de peticiones, capa gratuita de 180,000/360,000/2M, db-f1-micro ≈$8, db-g1-small ≈$26, Standard $0.020/GB-mes, egreso $0.12/GB) vienen de **fuentes secundarias concordantes entre sí**. La conclusión del documento —que Google Cloud es de 10 a 23 veces más caro que la alternativa— **no cambiaría aunque estas cifras estuvieran un 30% desviadas**, porque el factor es de orden de magnitud. Pero quien vaya a contratar debe abrirlas en un navegador.
2. **El precio de almacenamiento SSD de Cloud SQL ($0.17/GB-mes)** y **el costo de la instancia de 100 restaurantes (≈$100/mes)**. Los dos son estimaciones gruesas.
3. **El precio actual de Hetzner.** Hetzner solo publica en su propio sitio la nota de prensa de 2024 (**CX22 a €3.79 con 20 TB**, [VERIFICADO]); su página de precios tampoco es legible. La subida del 15-jun-2026 (CX23 a €5.49; CPX22 de €7.99 a €19.49) viene de **un análisis de terceros**. Hay que abrir la consola de Hetzner antes de contratar.
4. **El precio del CPX11 en Ashburn ($20.49 USD con 1 TB de tráfico).** Fuente secundaria.
5. **El tipo de cambio del euro ($19.80 MXN).** Viene de prensa financiera de mediados de septiembre de 2026. **No lo localicé en el DOF**, cuya página de indicadores exige consultar por rango de fechas. El del dólar ($17.1872) sí está verificado, del DOF del 18-sep-2026.
6. **La comisión de Getnet.** Su página de producto de Pay by Link **no publica tarifa**. El 2.9% + IVA que aparece en la tabla comparativa viene de material difundido por Getnet en redes sociales, **no de su sitio**. Hay que preguntarlo a ventas.
7. **Los límites de transacción de Mercado Pago Point Tap en iPhone.** Su página dice *"Puede haber límites de transacción"* sin dar cifra. El tope de **$3,000** está publicado en la página de Android. **No está confirmado que aplique igual en iPhone.**
8. **Los tiempos de depósito de Mercado Pago y de Getnet.** Ninguno los publica en la página del producto.
9. **Que recibir una transferencia SPEI sea gratuito por regulación.** Es un criterio ampliamente citado y coherente con la normativa, pero **no lo localicé en texto de Banxico accesible**: la página oficial de SPEI redirige a un subdominio que devuelve error 404. Hay que confirmarlo antes de prometerle "cero comisión" a un restaurante.
10. **El artículo 346 de la Ley Federal del Trabajo** sobre propinas. Leído en reproducciones del texto legal y en material de divulgación, **no en el PDF oficial de la ley**.
11. **El tratamiento fiscal de la propina (no se factura; ObjetoImp = 01).** Criterio concordante en material fiscal especializado. **El criterio normativo del SAT que lo respalda devolvió error 504** al intentar abrirlo el 20-sep-2026. Un contador tiene que confirmarlo.
12. **El plazo de aprobación de AdSense (de dos a cuatro semanas).** Google **no publica un plazo**. Es la convergencia de varias guías del sector.
13. **Los umbrales de tráfico de Monumetric, Mediavine, Journey, Raptive y Ezoic**, y las restricciones geográficas de Media.net y Raptive. Vienen de las páginas de requisitos de cada red leídas a través de resúmenes de búsqueda, **no abiertas una por una**. La cuota de alta de Monumetric **no se verificó**.
14. **Los límites gratuitos de Google Ad Manager (90 millones de impresiones al mes).** Vienen de los términos de DoubleClick for Publishers Small Business citados por terceros; no abrí el documento original.
15. **Todos los supuestos de carga de la §2.1** que están marcados como "supuesto mío": las 40 peticiones estáticas y 25 de API por sesión, los 2 MB de imágenes y código por sesión, los 200 ms de CPU por petición, los 0.5 GB de base de datos por restaurante. **Ninguno tiene fuente: son mi estimación de ingeniería y se corrigen con el primer mes de piloto.** Si las peticiones de API fueran el doble, la conclusión no cambia; si el peso de los modelos fuera de 10 MB en vez de 2, el costo de Google Cloud se multiplicaría por tres y el de R2 seguiría siendo cero.
16. **Los rangos de ingreso publicitario ($27 a $405 por restaurante al mes)** se toman tal cual de la investigación del 19 de septiembre, **con todas las advertencias que ahí se hicieron** — en particular que no existe un CPM mexicano verificable en acceso abierto y que el factor de ajuste "México rinde una quinta parte de Américas" es un supuesto sin fuente.
17. **Nada de este documento es asesoría legal ni fiscal.** Antes de construir cualquier flujo de cobro —incluso uno en el que Carta no toque dinero— un abogado fintech mexicano tiene que confirmarlo por escrito.
