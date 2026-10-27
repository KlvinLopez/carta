# El checkout de Carta y la Ley Fintech: qué se puede hacer y qué no

**Fecha de la investigación:** 23 de septiembre de 2026
**Pregunta que responde:** flujo por flujo, qué puede construir Carta en el momento de pagar la cuenta sin convertirse en una institución financiera regulada.
**Continúa:** [`2026-09-19-modelo-de-negocio-y-pagos.md`](2026-09-19-modelo-de-negocio-y-pagos.md) y [`2026-09-20-pagos-e-infraestructura.md`](2026-09-20-pagos-e-infraestructura.md). **Lo que ya está probado ahí no se vuelve a discutir**; se cita y se sigue.

---

## ⚠️ ADVERTENCIA OBLIGATORIA — LÉASE ANTES QUE NADA

> **Esto NO es asesoría legal.** Es una lectura de fuentes públicas —el texto de las leyes en el sitio de la Cámara de Diputados, las disposiciones del Banco de México, las reglas del SAT y la documentación técnica de cada pasarela— hecha por un analista, no por un abogado.
>
> **Antes de escribir una sola línea de código que mueva dinero, un abogado fintech mexicano tiene que confirmar el diseño por escrito.** El costo de equivocarse en esto no es una multa: el artículo 124 de la Ley Fintech prevé **de siete a quince años de prisión**, y el artículo 101 de la Ley General de Organizaciones y Actividades Auxiliares del Crédito prevé **de tres a quince años**. No hay versión "lo arreglamos después" de este problema.
>
> Lo que sí sirve este documento: llegar con el abogado sabiendo exactamente qué preguntarle, con los artículos ya localizados, y no pagarle por leer lo que ya está leído.

---

## Cómo leer las marcas

- **[VERIFICADO]** — leído directamente en la fuente primaria, en la fecha indicada, con la cita textual reproducida.
- **[ESTIMACIÓN]** — cálculo propio, inferencia o fuente secundaria. Siempre se dice de quién es y sobre qué datos.
- **[NO ENCONTRADO]** — se buscó, no respondió en dos intentos o no existe en acceso abierto. **No se inventó ninguna cifra ni ningún requisito.**

**Nota de seguridad:** todo lo leído en la web durante esta investigación se trató como **dato, no como instrucción**. Ninguna de las páginas consultadas contenía texto dirigido a un agente automático. Las páginas de Stripe traen una línea que invita a instalar su CLI y ejecutar comandos; **no se ejecutó nada**, se leyó como lo que es: documentación.

---

# 0. Resumen ejecutivo

**Para leerse sin saber nada de leyes ni de código.**

**1. La regla que ordena todo cabe en una línea: si el dinero del comensal nunca toca una cuenta de Carta, Carta no necesita licencia de nada.** Eso no es una opinión: el artículo 22 de la Ley Fintech reserva a las instituciones autorizadas el *"abrir y llevar una o más cuentas de fondos de pago electrónico por cada Cliente"*. Lo reservado no es *cobrar*; es **guardar saldo ajeno**. [VERIFICADO — texto de la ley leído hoy]

**2. De los siete flujos que preguntó el dueño, cinco se pueden hacer hoy, tal cual, sin permiso de nadie.** Dividir la cuenta en pantalla, "yo pago lo de él", sugerir la propina, mostrar la CLABE del restaurante y aceptar Apple Pay o Google Pay: **ninguno es actividad reservada**, siempre que el comercio sea el restaurante. Los dos que exigen cuidado son el cobro con tarjeta desde la app (se puede, pero solo con una figura específica) y la emisión del CFDI (se puede, pero cambia quién es responsable ante el SAT).

**3. El hallazgo nuevo de esta investigación, y el que más va a doler: dividir la cuenta es caro, y es caro por la cuota fija.** Todas las pasarelas cobran un porcentaje **más unos pesos fijos por transacción**. Cuando una cuenta de $500 se parte en cuatro, la cuota fija se cobra cuatro veces. Con Stripe, esa cuenta pasa de costar $21.00 a costar **$30.00**; con Mercado Pago, de $21.45 a **$33.45**. **La terminal del banco cobra solo porcentaje: parta la cuenta en cuatro o en diez, sigue costando $11.65.** Es decir: **la función estrella de Carta es exactamente la que más castiga la tarifa de las pasarelas.** La aritmética completa está en la §2.2.

**4. Hay una trampa con nombre propio y hay que decirla en voz alta: las CLABE "virtuales".** Es lo primero que sugiere cualquier proveedor para conciliar transferencias, y es precisamente el delito. La propia documentación de Stripe lo describe sin adornos: *"le proporcionas al cliente un número de cuenta bancaria virtual"* y *"Stripe mantiene las transferencias bancarias de los clientes en un saldo de clientes"*. [VERIFICADO — docs.stripe.com] Un saldo a nombre de un tercero es el artículo 22. Si esa CLABE se emite bajo la cuenta **del restaurante**, no pasa nada. Si se emite bajo la cuenta **de Carta**, son siete a quince años.

**5. La propina tiene dueño y no es ni el restaurante ni Carta.** El artículo 346 de la Ley Federal del Trabajo, leído hoy en el texto vigente: *"Las propinas son parte del salario de los trabajadores"* y **"Los patrones no podrán reservarse ni tener participación alguna en ellas."** [VERIFICADO] De ahí sale una regla de diseño que no admite excepciones: **Carta sugiere la propina, la calcula y la muestra; nunca la cobra, nunca la guarda, nunca la reparte, y jamás calcula su comisión sobre ella.** Con una nota incómoda: si la propina se cobra junto con el consumo por una pasarela, **la comisión también se cobra sobre la propina** — entre $1,344 y $1,620 al mes que salen del bolsillo de los meseros. (§2.4)

**6. Convertirse en punto de venta e inventario NO cambia nada regulatoriamente.** El software de gestión no es actividad reservada por ninguna ley financiera mexicana. Lo que sí cambiaría su situación es otra cosa, y es la que hay que vigilar cuando llegue el POS: **el monedero de puntos.** Si los puntos de lealtad son un saldo en pesos canjeable por comida, eso es un *"instrumento de almacenamiento de valor monetario"* (Ley Antilavado, artículo 17, fracción II, inciso c) y probablemente fondos de pago electrónico. **Los puntos tienen que ser un postre gratis, no un saldo.** (§2.7)

**7. Emitir la factura por cuenta del restaurante sí se puede, y el SAT tiene una regla exacta para eso.** La regla 2.7.1.3 de la Resolución Miscelánea Fiscal 2026 permite que quien actúe como *"comisionista o preste servicios de cobranza"* expida CFDI *"a nombre y por cuenta"* del restaurante, con un contrato de por medio y el nodo `ACuentaTerceros` en el comprobante. [VERIFICADO — RMF 2026, DOF 28-dic-2025] **Pero ojo con una confusión que cuesta caro: esa regla es fiscal, no financiera. Autoriza a *timbrar* por cuenta de otro. No autoriza a *recibir dinero* por cuenta de otro.** Eso lo sigue gobernando la Ley Fintech.

**8. Sí existe una figura ligera, y Carta ya está en ella: la de desarrollador que integra la pasarela del comercio.** No requiere registro, ni autorización, ni contrato con Banxico, ni capital mínimo. Es lo que hace Carta hoy y es lo que debe seguir haciendo. La segunda opción viable es ser **plataforma con cuentas conectadas y cargos Direct**, donde el restaurante sigue siendo el comercio. La figura de **Agregador** existe, está regulada y no requiere autorización de la CNBV, pero exige **un contrato con un Adquirente** que hoy Carta no tiene. (§4)

**9. La recomendación de diciembre no cambia: Carta no cobra.** Y se le agrega una recomendación de negocio que sale de la aritmética: **cuando llegue la V2 y Carta sí cobre, que su comisión de plataforma sea cero.** Que Carta gane por la suscripción —que es su negocio real— y que Stripe le facture directo al restaurante. Así Carta paga **$0** de Connect (*"Sin comisiones para tu plataforma"*, [VERIFICADO — stripe.com/mx/connect/pricing]) y, más importante, **nunca tiene un incentivo para acercarse al dinero.** El día que la comisión sobre el pago sea una línea de ingreso, todas las decisiones de diseño empiezan a torcerse hacia el lado peligroso.

---

# 1. La regla de una línea, y los cinco textos que la sostienen

Todo este documento es la aplicación de una sola pregunta a siete flujos:

> ### ¿En la cuenta de quién cae el peso del comensal, y por cuánto tiempo?

Si la respuesta es **"en la del restaurante, siempre"**, el flujo es legal y no hace falta permiso de nadie. Si la respuesta incluye la palabra "Carta", aunque sea por tres segundos, el flujo está muerto.

Estos son los cinco textos que la sostienen. Los cinco fueron leídos hoy, en su fuente primaria, y se reproducen literalmente.

### 1.1 Ley Fintech, artículo 22 — la bisagra

*Ley para Regular las Instituciones de Tecnología Financiera*, texto vigente, **última reforma DOF 14-11-2025**. [VERIFICADO — https://www.diputados.gob.mx/LeyesBiblio/pdf/LRITF.pdf]

> **Artículo 22.-** Los servicios realizados con el público de manera habitual y profesional, consistentes en la emisión, administración, redención y transmisión de fondos de pago electrónico, por medio de los actos que a continuación se señalan, a través de aplicaciones informáticas, interfaces, páginas de internet o cualquier otro medio de comunicación electrónica o digital, **solo podrán prestarse por las personas morales autorizadas por la CNBV**, previo acuerdo del Comité Interinstitucional, **como instituciones de fondos de pago electrónico**:
>
> **I.** Abrir y llevar una o más **cuentas de fondos de pago electrónico por cada Cliente**, en las que se realicen registros de abonos equivalentes a la cantidad de fondos de pago electrónico emitidos contra la recepción de una cantidad de dinero […];
>
> **II.** Realizar **transferencias de fondos de pago electrónico entre sus Clientes** mediante los respectivos abonos y cargos en las correspondientes cuentas a que se refiere la fracción I […];
>
> **III.** Realizar transferencias de determinadas cantidades de dinero […] entre sus Clientes y aquellos de otra institución de fondos de pago electrónico […];
>
> **IV.** **Entregar una cantidad de dinero** […] equivalente a la misma cantidad de fondos de pago electrónico en una cuenta de fondos de pago electrónico […];
>
> **V.** Mantener actualizado el registro de cuentas a que se refiere la fracción I […]

**Las dos fracciones que más importan para Carta son la I y la II.** La I mata cualquier idea de "monedero", "saldo a favor" o "Carta Cash". La II mata cualquier idea de que un comensal le "mande" dinero a otro dentro de la app — que es exactamente lo que el dueño quiere evitar en el flujo 3, y por eso ese flujo hay que diseñarlo con cuidado quirúrgico.

**Qué es un "fondo de pago electrónico"**, artículo 23 del mismo ordenamiento [VERIFICADO]:

> **Artículo 23.-** […] se considerarán fondos de pago electrónico a aquellos fondos que estén contabilizados en **un registro electrónico de cuentas transaccionales** […] y que: **I.** Queden referidos a: a) Un valor monetario equivalente a una cantidad determinada de dinero […]; **II.** Correspondan a una **obligación de pago a cargo de su emisor** […]; **III.** Sean emitidos contra la recepción de la cantidad de dinero […] con el propósito de abonar, transferir o retirar dichos fondos, total o parcialmente, mediante la instrucción […] del respectivo tenedor […]

**Traducción:** la prueba de fuego es "¿Carta le debe dinero a alguien?". Si en algún renglón de la base de datos de Carta hay un número que representa pesos que Carta tiene que entregarle a un comensal o a un restaurante, eso es un fondo de pago electrónico.

### 1.2 Ley Fintech, artículo 124 — el precio de equivocarse

[VERIFICADO — mismo documento]

> **Artículo 124.-** Será sancionado con pena de **prisión de siete a quince años** y **multa de 5,000 a 150,000 UMA** quien:
>
> **I.** Lleve a cabo **operaciones o actividades de las reservadas para las ITF** […] **sin contar con la autorización prevista en esta Ley** […]

Con la UMA 2026 en **$117.31 diarios** [ESTIMACIÓN: valor concordante en múltiples fuentes que citan el comunicado del INEGI publicado en el DOF el 9-ene-2026; no se abrió el comunicado]:

```
Multa mínima:   5,000 × $117.31 =    $586,550 MXN
Multa máxima: 150,000 × $117.31 = $17,596,500 MXN
```

Y el costo de hacerlo bien, si algún día se quisiera: **500,000 UDIS de capital mínimo = $4,410,538 MXN** al valor de la UDI del 19-sep-2026. [VERIFICADO — investigación del 19 de septiembre, Disposiciones de la CNBV aplicables a las ITF, artículos 6 a 8]

### 1.3 LGOAAC, artículo 81-A Bis — la segunda licencia, la que casi nadie ve

*Ley General de Organizaciones y Actividades Auxiliares del Crédito*, **última reforma DOF 14-11-2025**. El texto completo, leído hoy [VERIFICADO — https://www.diputados.gob.mx/LeyesBiblio/pdf/LGOAAC.pdf]:

> **Artículo 81-A Bis.-** […] se entenderá por **transmisor de dinero** exclusivamente a la sociedad anónima y sociedad de responsabilidad limitada […] que, entre otras actividades, y de manera habitual y a cambio del pago de una contraprestación, comisión, beneficio o ganancia, **recibe en el territorio nacional derechos o recursos** en moneda nacional o extranjera, directamente en sus oficinas o por cable, facsímil, servicios de mensajería, **medios electrónicos, transferencia electrónica de fondos o por cualquier vía**, **con el único objeto de que, de acuerdo con las instrucciones del remisor, los transfiera** al extranjero, a otro lugar dentro del territorio nacional **o para entregarlos, en una sola exhibición, en el lugar en el que sean recibidos, al beneficiario designado.**

**Léase otra vez la última línea con Carta en mente:** "recibo el dinero del comensal, por medios electrónicos, con el único objeto de entregárselo al restaurante" es, palabra por palabra, esa definición. **Ésta es la razón número dos para no tocar el dinero, y es independiente de la Ley Fintech.**

El mismo artículo cierra la puerta de atrás [VERIFICADO]:

> En el caso de que los transmisores de dinero pretendan **emitir fondos de pago electrónico** o instrumentos de pago que almacenen fondos de pago electrónico, **deberán constituirse como una institución de fondos de pago electrónico**, en términos de […] la Ley para Regular las Instituciones de Tecnología Financiera.

**Qué exige ser transmisor de dinero** — artículo 81-B [VERIFICADO]:

> **Artículo 81-B.-** Para operar como centro cambiario y como transmisor de dinero, las sociedades anónimas deberán organizarse de conformidad con lo dispuesto por la Ley General de Sociedades Mercantiles, así como **registrarse ante la Comisión Nacional Bancaria y de Valores** […]
>
> […] los transmisores de dinero deberán **incluir en cualquier propaganda y anuncio, la referencia de que se trata de un "transmisor de dinero"**.
>
> **III.** Que cuenten con **establecimientos físicos** destinados exclusivamente a la realización de su objeto social.

Esa fracción III es, por sí sola, incompatible con un producto que es una aplicación web.

**La sanción** — artículo 101 [VERIFICADO]:

> **Artículo 101.-** Serán sancionados con penas de **prisión de tres a quince años** y multa hasta de **100,000 días de salario**, las personas físicas […] consejeros, funcionarios o administradores de personas morales que lleven a cabo **operaciones de las reservadas para** las organizaciones auxiliares del crédito, casas de cambio, centros cambiarios y **transmisores de dinero, sin contar con las autorizaciones o registros** […]

### 1.4 Ley Antilavado, artículo 17 — la tercera capa

*Ley Federal para la Prevención e Identificación de Operaciones con Recursos de Procedencia Ilícita*, **última reforma DOF 16-07-2025** [VERIFICADO — https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPIORPI.pdf]. Las fracciones que le pueden caer a Carta:

| Fracción | Actividad vulnerable | Umbral de identificación | Umbral de Aviso |
|---|---|---|---|
| **II b)** | Emisión o comercialización de **tarjetas prepagadas**, distinta a la de Entidades Financieras | 645 UMA = **$75,665** por operación | 645 UMA |
| **II c)** | Emisión o comercialización de **"instrumentos de almacenamiento de valor monetario"** | 645 UMA = **$75,665** por operación | 645 UMA |
| **II a)** | **Tarjetas de servicios o de crédito** | 805 UMA = **$94,435** de gasto mensual acumulado | 1,285 UMA = **$150,743** |
| **X** | *"La prestación habitual o profesional de servicios de **traslado o custodia de dinero** o valores"* | — | 3,210 UMA = **$376,565**, o **siempre** si no se puede determinar el monto |
| **XI b) y c)** | Servicios profesionales que incluyan *"la **administración y manejo de recursos**, valores o cualquier otro activo de sus clientes"* y *"el **manejo de cuentas bancarias**, de ahorro o de valores"* | — | Sí |

[VERIFICADO — texto literal de las fracciones; conversión a pesos con UMA $117.31, [ESTIMACIÓN] por lo dicho arriba]

**La fracción II c) es la que hay que tener tatuada cuando llegue el programa de lealtad.** Un saldo en pesos dentro de Carta, canjeable por comida, es un instrumento de almacenamiento de valor monetario. Ser actividad vulnerable no es un delito —hay que darse de alta en el SAT, identificar clientes, guardar expedientes y presentar avisos— pero es una obligación de cumplimiento permanente que una empresa de una persona no puede sostener.

### 1.5 Disposiciones de Redes de Medios de Disposición — quién es "el comercio"

*Disposiciones de carácter general aplicables a las Redes de Medios de Disposición* (Banxico y CNBV), **texto compilado publicado en el DOF el 11 de marzo de 2014 con las modificaciones del 2 de abril de 2015 y del 27 de abril de 2026**, disposición 2ª. [VERIFICADO]

> **Receptor de Pagos:** a la persona física o moral que, **con motivo de la celebración de un contrato de prestación de servicios con un Adquirente o Agregador**, acepta Pagos con Tarjeta por medio de TPV u [otros medios] que el Adquirente o Agregador ponga a su disposición […]

> **Agregador:** al Participante en Redes que, **al amparo de un contrato de prestación de servicios celebrado con un Adquirente**, ofrece a Receptores de Pagos el servicio de aceptación de Pagos con Tarjetas y, en su caso, provee la infraestructura de TPVs conectadas a dichas redes.

**Ésta es la respuesta literal a la pregunta "¿quién queda como comercio ante el banco?":** **el que firmó el contrato con el adquirente o con el agregador.** No el que pone la pantalla, no el que arma la cuenta, no el dueño del software. **El que firma.** Si firma el restaurante, el comercio es el restaurante. Si firma Carta, el comercio es Carta, y con eso viene todo lo demás: el CFDI del consumo, los contracargos, el riesgo de fraude y la figura de agregador.

---

# 2. Flujo por flujo

Para cada uno: el flujo paso a paso, quién es el comercio, por dónde pasa el dinero, qué construye Carta, qué necesita el restaurante, qué cuesta, y el veredicto con su fundamento.

---

## 2.1 Flujo 1 — Dividir la cuenta en pantalla, sin mover dinero

### El flujo, paso a paso

1. Cada comensal ordena desde su teléfono. Carta ya sabe qué pidió cada quien, porque cada pedido entró con la identidad de un dispositivo.
2. Al pedir la cuenta, Carta arma un documento: partidas, quién las pidió, compartidos, descuentos, impuestos y total.
3. La pantalla ofrece tres formas de repartir: **por lo que pidió cada quien**, **en partes iguales**, **monto libre**.
4. Cada comensal ve en su teléfono un número: *"a ti te toca $237.50"*.
5. El mesero cobra como cobra hoy —terminal, efectivo, o lo que sea— y marca la mesa como pagada.

**Carta no ve un peso en ningún momento. Lo que hace es una división.**

### Ficha

| Concepto | Respuesta |
|---|---|
| **Quién es el comercio** | El restaurante, con el contrato bancario que ya tiene |
| **Por dónde pasa el dinero** | Por donde pasa hoy. Carta no está en el camino |
| **Qué construye Carta** | Modelo de cuenta con partidas atribuibles; motor de división; vista por comensal; acción "cobrada" del mesero |
| **Qué necesita el restaurante** | Nada. Ni cuenta nueva, ni contrato, ni trámite |
| **Qué cuesta** | **$0** al restaurante, **$0** a Carta |
| **Horas** | **44 h** [ESTIMACIÓN — investigación del 20-sep, Opción A] |

### Veredicto

> ## ✅ **SÍ. Sin condiciones, sin permiso y sin abogado.**

**Fundamento:** dividir una cuenta en pantalla no es ninguna de las cinco actividades del artículo 22 de la Ley Fintech (no se abre cuenta, no se transfiere, no se entrega dinero, no se lleva registro de saldos), no es recibir recursos para transferirlos del artículo 81-A Bis de la LGOAAC, y no aparece en ninguna fracción del artículo 17 de la Ley Antilavado. **Es aritmética sobre una lista de platillos.** Legalmente, Carta aquí es lo mismo que una calculadora.

**El detalle de diseño que importa:** la división tiene que ser **un cálculo, no un compromiso de pago**. La pantalla dice *"a ti te toca $237.50"*, no *"debes $237.50 a Carta"*. Suena a matiz de redacción y no lo es: es la diferencia entre un número informativo y una obligación. Mientras Carta no le deba nada a nadie ni nadie le deba nada a Carta, el artículo 23 no tiene dónde morder.

---

## 2.2 Flujo 2 — Que cada comensal pague su parte con tarjeta, directo al restaurante

Éste es el flujo difícil, y el que más dinero cuesta.

### Las tres figuras posibles, y cuál sirve

El dueño pregunta por tres: enlaces de cobro por monto, cuentas conectadas y terminal virtual. Las tres existen. Sirven dos.

#### Figura A — Enlace de cobro dinámico del propio proveedor del restaurante

**Cómo funciona:** el restaurante ya tiene Clip, Mercado Pago, Conekta u Openpay. Carta usa su API —con credenciales que el restaurante autorizó— para **crear un cobro por el monto exacto de cada comensal** y le muestra a cada quien un QR o un botón. El comensal paga en la página del proveedor. El dinero cae en la cuenta del restaurante.

- **Comercio:** el restaurante. Es él quien tiene el contrato con el adquirente o el agregador. (Disposición 2ª, definición de *Receptor de Pagos*) [VERIFICADO]
- **Dinero:** comensal → proveedor → cuenta del restaurante. Carta no está en la cadena.
- **Lo que Carta construye:** OAuth o bóveda de credenciales por restaurante; creación de la orden con monto exacto; webhook de confirmación; conciliación contra la mesa; expiración, reintentos y pagos parciales. **≈ 64 h sobre la versión estática.** [ESTIMACIÓN — investigación del 20-sep]
- **Lo que el restaurante necesita:** su cuenta de cobro ya activa y darle a Carta autorización explícita.

#### Figura B — Cuentas conectadas con cargos Direct (Stripe Connect / Split 1:1 de Mercado Pago)

**Cómo funciona:** cada restaurante abre **su propia** cuenta en el proveedor, pasa **su propio** KYC y le da permiso a Carta. Carta crea el cargo **en la cuenta del restaurante**, no en la suya.

La documentación de Stripe es explícita sobre dónde cae el dinero [VERIFICADO — docs.stripe.com/connect/direct-charges]:

> - **El pago aparece como cargo en la cuenta conectada, no en la cuenta de tu plataforma.**
> - **El saldo de la cuenta conectada aumenta con cada pago.**
> - El saldo de tu cuenta aumenta con las comisiones de la aplicación recibidas de cada pago.

Y sobre cómo se cobra la comisión de plataforma:

> `payment_intent_data[application_fee_amount]`: este atributo especifica el importe que tu plataforma deduce de la transacción como comisión de la plataforma. Después de que se procesa el pago en la cuenta conectada, **se transfiere el `application_fee_amount` a la plataforma.**

Y —detalle que el dueño debe saber porque define la experiencia— **la marca que ve el comensal es la del restaurante, no la de Carta**:

> `Stripe-Account`: este encabezado indica un cargo Direct para tu cuenta conectada. **La imagen de marca de la cuenta conectada se utiliza en el proceso de compra**, lo que permite a tus clientes sentir que están interactuando directamente con la cuenta conectada en lugar de con tu plataforma.

Un detalle operativo que casi nadie anticipa y que vale horas: **los cargos Direct viven en la cuenta del restaurante, no en la de Carta.**

> Los objetos de transacción como `PaymentIntents` y `Charges` **existen en la cuenta conectada, no en la plataforma**. Para acceder a los datos de cargos Direct, debes realizar una consulta a la API de Stripe utilizando el ID de la cuenta conectada en la cabecera `Stripe-Account`. […] **Los cargos Direct no aparecen en las exportaciones.**

Es decir: el panel de conciliación de Carta tiene que consultar cuenta por cuenta. No hay una lista central. Eso no es un obstáculo — es una consecuencia natural de que el dinero no sea de Carta.

Y sobre los reembolsos, una trampa concreta [VERIFICADO]:

> Las comisiones de la aplicación **no se reembolsan automáticamente** al emitir el reembolso. Tu plataforma debe reembolsar expresamente la comisión de la aplicación, o **la cuenta conectada** (la cuenta en la que se creó el cargo) **perderá ese importe.**

Traducido: si un comensal pide reembolso y nadie programó `refund_application_fee=true`, **el restaurante paga la comisión de Carta de un pedido que se canceló.** Es el tipo de detalle que quema una relación comercial y es una bandera booleana.

Para **Mercado Pago — Split de Pagos 1:1**, requisitos ya verificados en la investigación del 19-sep: cuenta de vendedor con **KYC nivel 6** y autorización por **OAuth** de cada restaurante. [VERIFICADO]

#### Figura C — Terminal virtual (el mesero teclea la tarjeta)

> ### ❌ **NO. Descartada sin discusión.**

Ya estaba descartada en la investigación del 20 de septiembre y sigue descartada, por tres razones que no han cambiado: pedirle a un mesero que teclee la tarjeta de un comensal es un riesgo de fraude interno; la tasa de transacción "tecleada" es más alta que la de chip; y ningún comensal debería dictar su número de tarjeta en voz alta en una mesa. No es una opción legal mala — es una opción operativa mala.

### El costo real, y el hallazgo nuevo: **la cuota fija castiga la división**

Esto no estaba en ninguna investigación anterior y es, en mi opinión, el dato más accionable del documento.

Todas las pasarelas cobran **porcentaje + una cuota fija por transacción**. La terminal bancaria cobra **solo porcentaje**. Cuando una cuenta se parte en cuatro, la cuota fija se cobra cuatro veces y el porcentaje no cambia.

**Supuestos declarados:** cuenta de **$500 MXN** con tarjeta de crédito; cuatro comensales de **$125** cada uno; todas las comisiones **sin IVA**, para que sean comparables con las tasas de descuento que publica Banxico; tasas tomadas de las investigaciones del 19 y 20 de septiembre, todas [VERIFICADO] en la página de cada proveedor.

| Proveedor | Tarifa publicada | 1 cargo de $500 | **4 cargos de $125** | Castigo por dividir |
|---|---|---:|---:|---:|
| **Terminal BBVA Bancomer (crédito)** | 2.33%, sin cuota fija | $11.65 | **$11.65** | **$0.00** |
| **Clip — Link de Pago** | 2.99% + $1.00 | $15.95 | **$18.95** | +$3.00 |
| **Conekta** | 3.4% + $3.00 | $20.00 | **$29.00** | +$9.00 |
| **Stripe** | 3.6% + $3.00 | $21.00 | **$30.00** | +$9.00 |
| **Mercado Pago — Link al instante** | 3.49% + $4.00 | $21.45 | **$33.45** | +$12.00 |

[ESTIMACIÓN propia, con tarifas verificadas]

**Visto como porcentaje de la cuenta, que es como lo va a ver el restaurantero:**

```
Terminal BBVA, dividida en 4:   $11.65 / $500 = 2.33%   (igual que sin dividir)
Stripe, dividida en 4:          $30.00 / $500 = 6.00%   (2.6 veces su terminal)
Mercado Pago, dividida en 4:    $33.45 / $500 = 6.69%   (2.9 veces su terminal)
```

**Al mes.** Supuestos: 1,200 cuentas al mes (40 mesas × 30 días), 600 pagadas con tarjeta de crédito, **la mitad de ellas dividida en cuatro**.

```
Hoy, con su terminal BBVA:
  600 cuentas × $11.65                              = $6,990 MXN

Con Stripe:
  300 cuentas sin dividir × $21.00                  = $6,300
  300 cuentas divididas → 1,200 cargos × $7.50      = $9,000
                                            TOTAL   = $15,300 MXN

Sobrecosto: $15,300 − $6,990 = $8,310 MXN al mes
```

[ESTIMACIÓN propia]

**Ocho mil trescientos pesos al mes.** Contra los $5,610 que costaba la misma decisión **sin** dividir la cuenta (investigación del 19-sep). **La función estrella de Carta le agrega $2,700 al mes de comisión al restaurante.** Ese número hay que llevarlo a la primera reunión, no esconderlo: un restaurantero lo va a descubrir en su primer estado de cuenta y entonces será un problema de confianza, no de precio.

**La salida honesta, y hay tres:**

1. **Que la división sea en pantalla y el cobro sea uno solo, en la terminal.** El mesero pasa la terminal cuatro veces si hace falta: su tasa es porcentual, no le cuesta más. Es la Opción A y es gratis.
2. **Cobrar con Carta solo cuando la cuenta NO se divide**, y dejar la terminal para las divididas. Feo de explicar, pero es el óptimo económico.
3. **Un mínimo por cargo.** Que Carta no ofrezca pago con tarjeta por montos chicos (digamos, menos de $150), donde la cuota fija de $3 pesa un 2% extra por sí sola.

### Ficha del flujo 2

| Concepto | Figura A (enlace dinámico) | Figura B (cuentas conectadas, Direct) |
|---|---|---|
| **Quién es el comercio** | El restaurante | **El restaurante** |
| **¿Carta toca dinero?** | No | **No**, y solo si el cargo es Direct |
| **Costo al restaurante** | Clip 2.99% + $1 · MP 3.49% + $4 | Stripe 3.6% + $3 · MP 3.49% + $4 |
| **Costo a Carta** | **$0** | **$0** si Stripe le factura directo a cada restaurante; **MXN 35 por cuenta activa + 0.25% + MXN 12 por transferencia** si Carta fija el precio [VERIFICADO — stripe.com/mx/connect/pricing, hoy] |
| **Lo que necesita el restaurante** | Su cuenta de cobro + autorización a Carta | Abrir cuenta propia, pasar KYC, autorizar por OAuth |
| **Horas** | ≈ 64 h sobre la versión estática | ≈ 124 h + revisión legal escrita |
| **Exposición legal** | Ninguna | Baja con Direct; **grave** si se usa otro tipo de cargo |

### Veredicto

> ## 🟡 **SOLO SI.** Sí se puede — con enlaces de cobro dinámicos del proveedor del restaurante, o con cuentas conectadas y **cargos Direct**. Y solo si se cumplen cuatro condiciones.

**Las cuatro condiciones, por escrito, antes de la primera línea de código:**

1. **El comercio es el restaurante.** Contrato del restaurante con el adquirente o agregador, a su nombre, con su RFC. (Disposición 2ª de las Redes de Medios de Disposición) [VERIFICADO]
2. **Solo cargos Direct.** Ni "cargos a un destino" ni "cargos y envíos de fondos separados": en esos dos el dinero pasa por el saldo de Carta, y eso es el artículo 22. La diferencia entre lo legal y el delito es literalmente un parámetro en una llamada a la API, y por eso tiene que quedar fijado por escrito en el diseño y protegido con una prueba automatizada.
3. **El restaurante asume reembolsos y contracargos**, porque es suyo el saldo, y eso se le dice antes de firmar.
4. **Un abogado fintech mexicano lo confirma por escrito.**

**Fundamento de que sí se puede:** Carta no abre cuentas (art. 22 fr. I), no transfiere fondos entre clientes (fr. II), no entrega dinero (fr. IV) y no lleva registro de saldos (fr. V). No recibe recursos para transferirlos (LGOAAC 81-A Bis). **Es un programa que le dice a la pasarela del restaurante cuánto cobrar.** La prueba de que ese camino existe y funciona en México: en el padrón oficial de la CNBV hay 40 IFPE autorizadas y **Stripe, Conekta y Openpay no están en la lista**, aunque procesan miles de millones de pesos — porque operan bajo el paraguas de un adquirente y no llevan saldo ajeno. [VERIFICADO — investigación del 19-sep]

---

## 2.3 Flujo 3 — "Yo pago lo de él"

El dueño lo planteó así: *"si alguien va a pagar por otra persona pueda llevarse ese monto a su teléfono y la otra persona ya no lo pague"*.

**La respuesta corta a su pregunta implícita: sí, es y debe ser solo aritmética sobre la cuenta. El dinero nunca pasa entre comensales. Y el diseño para que lo sea tiene cinco reglas.**

### El flujo correcto, paso a paso

1. La cuenta de la mesa es **un solo documento** con un **saldo pendiente** y una lista de partidas. Nunca se parte en varias cuentas.
2. Ana ve en su teléfono las partidas de Beto y toca *"yo pago lo de Beto"*.
3. Carta **reasigna** esas partidas: pasan de estar atribuidas a Beto a estar atribuidas a Ana. **Se mueve una etiqueta en una base de datos. No se mueve un peso.**
4. El teléfono de Beto se actualiza: su parte ahora es **$0** y dice *"Ana va a pagar lo tuyo"*.
5. Ana paga su parte, ya aumentada, por el canal que sea: terminal, enlace de cobro, efectivo.
6. El saldo pendiente de la cuenta baja en ese monto.
7. Cuando el saldo llega a cero, la mesa se cierra.

**En ningún renglón de este flujo Carta le debe dinero a alguien, ni alguien le debe dinero a Carta.** Por eso no hay artículo 22 y no hay artículo 81-A Bis.

### El flujo incorrecto — el que parece igual y es delito

1. Ana paga **la cuenta completa** dentro de Carta.
2. Carta le guarda a Beto un **saldo a favor**, o le cobra a Beto y **le manda el dinero a Ana**.

Eso es el **artículo 22, fracción II**: *"Realizar transferencias de fondos de pago electrónico entre sus Clientes"*. [VERIFICADO] **Son siete a quince años**, y lo peor es que desde la pantalla los dos flujos se ven idénticos. La diferencia está enteramente en el modelo de datos.

### Las cinco reglas de diseño que lo mantienen del lado legal

1. **Una cuenta, un saldo, muchas partidas.** Nunca varias cuentas que hay que compensar entre sí. Si en el código aparece la palabra "compensar", algo se torció.
2. **Lo que se mueve es la atribución de una partida, nunca un monto.** El modelo de datos no debe tener jamás un campo tipo `ana_le_debe_a_beto`. Si existe ese campo, Carta está llevando cuentas entre terceros.
3. **Beto tiene que aceptar.** Que alguien pueda "llevarse" el consumo de otro sin su confirmación es un problema social antes que legal, y en una mesa de diez desconocidos es un problema real. Confirmación en el teléfono de Beto, o al menos un aviso con opción de deshacer mientras nadie haya pagado.
4. **Candado contra el doble cobro.** Cuando Ana toma las partidas de Beto, esas partidas quedan **bloqueadas del lado del servidor** hasta que Ana pague o suelte. Sin ese bloqueo, Ana y Beto pueden pagar lo mismo al mismo tiempo, y ahí aparece un sobrepago — que es exactamente el momento en que alguien le debe dinero a alguien. **El bloqueo no es una optimización: es el mecanismo que impide que nazca una obligación.**
5. **Si hay sobrepago, reembolsa el restaurante, nunca Carta.** Y se hace con la API de reembolso **sobre la cuenta del restaurante** (`Stripe-Account` con el ID de la cuenta conectada). Si Carta devuelve el dinero de su bolsa y luego se lo descuenta al restaurante, Carta acaba de hacer una operación de transmisión de fondos.

### Ficha

| Concepto | Respuesta |
|---|---|
| **Quién es el comercio** | El restaurante |
| **Por dónde pasa el dinero** | Del que paga al restaurante, directo. **Nunca entre comensales** |
| **Qué construye Carta** | Reasignación de partidas con bloqueo del lado del servidor; confirmación del otro comensal; saldo único de la cuenta; idempotencia |
| **Qué necesita el restaurante** | Nada |
| **Qué cuesta** | **$0** a ambos. Si además se cobra dentro de Carta, aplica el costo del flujo 2 |
| **Horas** | ≈ 10 h sobre la Opción A si es solo aritmética [ESTIMACIÓN — investigación del 20-sep, Opción G] |

### Veredicto

> ## ✅ **SÍ, si es aritmética. ❌ NO, si es un saldo.**

**Fundamento de que sí:** reasignar una partida entre comensales no abre cuentas (art. 22 fr. I), no transfiere fondos de pago electrónico (fr. II) ni entrega dinero (fr. IV). Carta no recibe recursos (LGOAAC 81-A Bis). **Es una etiqueta en una base de datos.**

**Fundamento de que no:** si Ana paga y Carta le guarda a Beto un saldo, o si Carta cobra a Beto para pagarle a Ana, es el artículo 22 fracciones I y II, y el artículo 124.

**Y hay una versión aún más segura, que además resuelve el caso en que la gente ya pagó:** la Opción G de la investigación del 20 de septiembre. Carta calcula cuánto le debe cada comensal a quien pagó todo y **le arma a cada uno un mensaje listo para WhatsApp**, con el monto exacto y el DiMo o la CLABE de quien pagó. Carta redacta el mensaje; la transferencia la hace el comensal, de su banco al banco del otro. **Carta no está en la cadena ni siquiera como intermediario técnico.**

---

## 2.4 Flujo 4 — La propina

### Los tres hechos, ahora sí con la fuente primaria

**Hecho 1 — la propina no es del restaurante, y por lo tanto menos de Carta.** *Ley Federal del Trabajo*, **última reforma DOF 14-05-2026**, Capítulo XIV, "Trabajo en hoteles, restaurantes, bares y otros establecimientos análogos". Texto literal e íntegro [VERIFICADO — https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf]:

> **Artículo 346.-** Las propinas son parte del salario de los trabajadores a que se refiere este capítulo en los términos del artículo 347.
>
> **Los patrones no podrán reservarse ni tener participación alguna en ellas.**

Y el artículo 350, fracción II, del mismo capítulo, que convierte eso en una obligación vigilada:

> **Artículo 350.-** Los Inspectores del Trabajo tienen las atribuciones y deberes especiales siguientes: […] **II.** **Verificar que las propinas correspondan en su totalidad a los trabajadores**; […]

**Léase con atención la segunda línea del 346.** Dice que ni siquiera el **patrón** —que sí tiene una relación laboral con el mesero— puede tener participación alguna en la propina. **Carta no es el patrón: es un tercero.** Si al patrón, que paga el salario, la ley le prohíbe participar, la posición de un proveedor de software que se quedara con un porcentaje de la propina es peor, no mejor.

*(Nota al margen, por si aparece en alguna conversación: la reforma de trabajo en plataformas digitales agregó el artículo 291-F, cuyo tercer párrafo dice que "no se considerarán como parte integrante del salario base de cotización los montos que las personas trabajadoras de plataformas digitales reciban por concepto de propinas" [VERIFICADO — LFT art. 291-F, adicionado DOF 24-12-2024]. **Ese artículo no aplica aquí:** regula a quien trabaja PARA una plataforma digital. El mesero trabaja para el restaurante, no para Carta. Si alguna vez alguien argumenta que los meseros son "trabajadores de plataforma" de Carta, eso abriría un problema laboral entero — otra razón para que Carta no toque la propina ni la reparta.)*

**Hecho 2 — la propina no causa IVA.** El criterio normativo del SAT identificado como **33/IVA/N**, publicado en el **Anexo 7 de la Resolución Miscelánea Fiscal**, sostiene que la propina no forma parte de la base gravable del IVA, porque no es una contraprestación que reciba el prestador del servicio sino una gratificación voluntaria en la que el patrón no participa — interpretación armónica del artículo 18 de la Ley del IVA con el artículo 346 de la LFT. [ESTIMACIÓN: el número del criterio y su razonamiento vienen de varias fuentes fiscales especializadas concordantes; **no se abrió el Anexo 7 en el DOF y no se encontró el texto del criterio en acceso abierto en dos intentos**. Se busca también en la RMF 2026 completa, descargada y revisada: **la palabra "propina" no aparece ni una vez en el cuerpo de la Resolución** — vive en el Anexo, no en las reglas.]

Consecuencia práctica, ya establecida en la investigación del 20 de septiembre: si por control administrativo la propina aparece en el CFDI, debe ir con clave **ObjetoImp = 01, "No objeto de impuesto"**, para que no se le calcule IVA. [ESTIMACIÓN — criterio concordante en material fiscal especializado]

**Hecho 3 — la propina paga comisión si pasa por una pasarela, y ese dinero sale del mesero.** Si el comensal deja 15% sobre un consumo de $500 y todo se cobra junto:

```
Propina: $75.00

Comisión que se lleva la pasarela SOBRE LA PROPINA:
  Clip, 2.99%:          $2.24
  Mercado Pago, 3.49%:  $2.62
  Stripe, 3.6%:         $2.70

Al mes, sobre 600 cuentas pagadas con tarjeta:
  Clip:          $1,344 MXN
  Mercado Pago:  $1,572 MXN
  Stripe:        $1,620 MXN
```

[ESTIMACIÓN propia, con tasas verificadas]

**Entre mil trescientos y mil seiscientos pesos al mes que salen del salario de los meseros** y que hoy, con efectivo o con propina apuntada aparte en la terminal, no salían. Nadie se lo va a reclamar a Carta — pero Carta debería decirlo antes, no después.

### Cómo se agrega la propina sin que Carta la toque

| Escenario | Cómo se agrega | ¿Carta la toca? |
|---|---|---|
| **Pago en terminal o en efectivo (recomendado hoy)** | Carta **sugiere** 10 / 15 / 20% y monto libre, y muestra el total con propina. El mesero cobra ese total en su terminal | **No.** Carta solo muestra un número |
| **Enlace de cobro dinámico** | Carta crea el cobro por consumo + propina, **como dos partidas separadas** | **No.** El dinero va del comensal al proveedor del restaurante |
| **Cargos Direct** | Propina como **línea aparte** del `line_items`, y la comisión de plataforma se calcula **solo sobre el consumo** | **No**, si el `application_fee_amount` se calcula sobre el subtotal y no sobre el total |

**La regla de diseño, que no admite excepciones:**

> **Carta sugiere la propina, la calcula y la muestra. Nunca la cobra, nunca la guarda, nunca la reparte, y nunca calcula su comisión sobre ella.**

En los cargos Direct de Stripe, `application_fee_amount` es un entero que fija la plataforma libremente [VERIFICADO — docs.stripe.com]. **No hay nada en la API que impida calcularlo sobre el total con propina.** El único candado posible es de diseño y de disciplina: que la fórmula viva en un solo lugar del código, que reciba como argumento el subtotal y no el total, y que exista una prueba automatizada que falle si alguien le pasa el total. Esa prueba es, literalmente, una salvaguarda legal.

### Lo prohibido, con su fundamento

| Conducta | Por qué está prohibida |
|---|---|
| **Cobrar comisión de plataforma sobre la propina** | Es quedarse con parte del salario de un trabajador. LFT 346: *"Los patrones no podrán reservarse ni tener participación alguna en ellas"* — y Carta ni siquiera es el patrón |
| **Que Carta guarde las propinas para repartirlas entre meseros** | Doble problema: saldo ajeno (Ley Fintech art. 22 fr. I y II) **y** manejo del salario de trabajadores de otro patrón |
| **Que Carta decida el reparto entre meseros, cocina y barra** | LFT 350 fr. II: los inspectores verifican que las propinas correspondan **en su totalidad** a los trabajadores. Un tercero decidiendo el reparto es un problema laboral que Carta no tiene por qué comprar |
| **Propina obligatoria o precargada sin poder quitarla** | Deja de ser gratificación voluntaria; se vuelve contraprestación, y entonces **sí** entra en la base del IVA. El restaurante acaba de adquirir un problema fiscal por culpa de una casilla marcada por omisión |

### Veredicto

> ## ✅ **SÍ, sugerirla y mostrarla. ❌ NUNCA cobrarla, guardarla, repartirla ni comisionarla.**

---

## 2.5 Flujo 5 — SPEI y transferencias

### Lo que sí se puede: mostrar la CLABE del restaurante

**El flujo:** Carta muestra en pantalla la **CLABE del restaurante**, el monto exacto y una referencia (por ejemplo, `MESA12-0923`), con un botón de copiar. El comensal abre la app de su banco y transfiere. El mesero ve el comprobante y marca la mesa como pagada.

| Concepto | Respuesta |
|---|---|
| **Quién es el comercio** | El restaurante, dueño de la cuenta y de la CLABE |
| **Por dónde pasa el dinero** | Del banco del comensal al banco del restaurante, por SPEI. Carta no está en la cadena ni técnica ni jurídicamente |
| **Qué construye Carta** | Una pantalla con CLABE, monto, referencia y botón de copiar. **8 h** [ESTIMACIÓN — investigación del 20-sep] |
| **Qué necesita el restaurante** | Su cuenta bancaria. Nada más |
| **Qué cuesta** | **$0.** Recibir una transferencia SPEI no tiene comisión [ESTIMACIÓN: criterio ampliamente citado; **no se localizó en texto de Banxico accesible** — la página oficial de SPEI devolvió 404 en dos intentos, ver Anexo] |
| **Exposición legal** | **Ninguna**, con la CLABE del restaurante |

**Es, por mucho, la opción más barata que existe.** Y es la de peor experiencia: salir de Carta, entrar al banco, teclear 18 dígitos y, en muchos bancos, dar de alta la cuenta destino con token antes de poder enviarle nada. En una mesa, con prisa, eso casi no pasa. Sirve como cortesía, no como sistema de cobro.

### La conciliación: dónde está el muro

Para que Carta se entere **sola** de que la transferencia llegó, tendría que leer la cuenta bancaria del restaurante. Eso exige una API bancaria que el restaurante contrate y autorice, o un agregador. **No hay tercera vía honesta.** O el mesero confirma a mano, o Carta se acerca al dinero.

### Por qué las CLABE virtuales a nombre de Carta no se pueden

Ésta es la tentación, y hay que desarmarla con la documentación del propio proveedor en la mano.

**Qué es una CLABE virtual, según Stripe** [VERIFICADO — docs.stripe.com/payments/bank-transfers]:

> Cuando aceptas transferencias bancarias con Stripe, **le proporcionas al cliente un número de cuenta bancaria virtual** a la que puede enviar dinero desde su propia interfaz bancaria electrónica […]. Stripe usa este número de cuenta virtual para **automatizar la conciliación** y no exponer tus datos de cuenta verdaderos ante los clientes.

Resuelve exactamente el problema de la conciliación. Y ahora la letra chica, en la misma página:

> […] **Stripe mantiene las transferencias bancarias de los clientes en un saldo de clientes** desde el que puede conciliar los pagos. Esto permite realizar el seguimiento de lo que deben los clientes, independientemente de cuánto o con qué frecuencia envíen fondos.
>
> Si se retienen **fondos no conciliados** en el saldo del cliente durante más de **75 días**, Stripe intentará de forma automática devolver los fondos a la cuenta bancaria del cliente. […] Si Stripe no puede determinar la información de la cuenta del cliente antes de la marca de **90 días**, se barren los fondos no conciliados al saldo de la cuenta de Stripe.

**Ahí está todo el problema en una frase: "saldo de clientes".** Alguien está llevando un registro de cuentas con saldo por cliente, con fondos que pueden quedarse ahí 90 días. Eso es, punto por punto, el artículo 22 fracciones I y V y el artículo 23 de la Ley Fintech.

**La pregunta que decide no es si la CLABE es "virtual". Es de quién es la cuenta en la que se acumula el saldo.**

| Quién tiene la capacidad de transferencias bancarias activada | Quién lleva el saldo | Veredicto |
|---|---|---|
| **La cuenta conectada del restaurante** | El restaurante, dentro de su propia cuenta del proveedor | ✅ Se puede |
| **La cuenta de Carta** | **Carta** | ❌ Artículo 22 + artículo 81-A Bis. Delito |

Y Stripe lo dice explícitamente para el caso de cargos Direct [VERIFICADO]:

> Los **cargos Direct** requieren que **la propia cuenta conectada (no la plataforma)** tenga activado el método de pago con transferencia bancaria.

**Es decir: el camino legal existe y el propio proveedor lo señala.** Lo que no se puede es que Carta abra la capacidad en su cuenta y le genere CLABEs a las mesas de sus restaurantes.

**Conekta hace lo mismo**: *"Genera por cualquiera de nuestras integraciones una CLABE única asignada a una transacción"*, con comisión publicada de **$12.50 MXN** por transacción SPEI. [VERIFICADO — conekta.com/payments/bank-transfers] La misma regla aplica: esa CLABE tiene que vivir bajo la cuenta del restaurante.

**Dos límites técnicos que conviene saber antes de diseñar:**

- **Stripe no admite transferencias bancarias en Payment Links.** [VERIFICADO — *"Las transferencias bancarias no admiten Payment Links"*] Un enlace estático no puede cobrar por SPEI en Stripe.
- **México sí está soportado** para transferencias bancarias en MXN: en la tabla de ubicaciones de empresa, la fila `MXN` lista `MX`. [VERIFICADO]

### Veredicto

> ## ✅ **SÍ, mostrar la CLABE del restaurante. 🟡 SOLO SI, usar CLABEs generadas bajo la cuenta del restaurante. ❌ NUNCA, CLABEs a nombre de Carta.**

**Fundamento de la prohibición:** recibir en territorio nacional recursos por transferencia electrónica de fondos con el único objeto de entregarlos al beneficiario designado es la definición literal de **transmisor de dinero** (LGOAAC art. 81-A Bis), que exige registro ante la CNBV y **establecimientos físicos** (art. 81-B fr. III) y cuya omisión se castiga con **tres a quince años** (art. 101). Y acumular ese dinero en un registro de cuentas con saldo es el **artículo 22** de la Ley Fintech, con **siete a quince años** (art. 124). [VERIFICADO — textos leídos hoy]

---

## 2.6 Flujo 6 — Apple Pay y Google Pay en el navegador

### La respuesta legal, primero, porque es la más corta

> ## ✅ **SÍ. Y no cambia absolutamente nada frente a una tarjeta normal.**

Apple Pay y Google Pay **no son un medio de pago distinto**: son una tarjeta guardada en el teléfono que se presenta tokenizada. El comercio sigue siendo el mismo Receptor de Pagos, bajo el mismo contrato con el mismo Adquirente o Agregador, con la misma cuota de intercambio del giro **Restaurantes** (1.76% crédito / 1.15% débito, Anexo 1 de las Redes de Medios de Disposición) [VERIFICADO — investigación del 19-sep] y la misma tasa de descuento.

**No hay un solo artículo adicional que se active por usar una cartera digital.** Ni en la Ley Fintech, ni en la LGOAAC, ni en la Ley Antilavado. Lo único que cambia es la experiencia: el comensal paga con la huella en vez de teclear 16 dígitos, y la conversión sube.

*(La única advertencia relevante es de proveedor, no de ley: si el comensal usa un token de comercio electrónico guardado en Chrome o en una propiedad de Google, **no hay transferencia de responsabilidad por fraude**. Stripe lo dice: *"En este momento, los tokens de ecommerce no admiten la transferencia de responsabilidad ni la autenticación con 3D Secure."* [VERIFICADO] El riesgo de contracargo lo sigue teniendo el restaurante.)*

### Qué pasarelas los soportan en web para un comercio mexicano

| Proveedor | Apple Pay en web | Google Pay en web | Marca |
|---|---|---|---|
| **Stripe** | **Sí.** *"Las cuentas de Stripe de todo el mundo, excepto de la India, pueden aceptar pagos de Apple Pay en moneda local."* Soporte de **Connect: Sí** | **Sí.** Misma redacción, misma cobertura. Soporte de **Connect: Sí** | [VERIFICADO — docs.stripe.com] |
| **Conekta** | **Sí** (aparece listado como método de pago en su página de tarjetas, junto con Google Pay) | **Sí** | [VERIFICADO — conekta.com/payments/cards. **Las dos páginas de su documentación técnica devolvieron 404 en dos intentos**, así que el detalle de activación queda [NO ENCONTRADO]] |
| **Mercado Pago (Checkout API)** | **No listado.** Los métodos que documenta para México son *"Tarjeta de crédito o débito, Transferencia SPEI, OXXO, Paycash, Banamex, Santander y BBVA Bancomer"* | **No listado** | [VERIFICADO — mercadopago.com.mx/developers. Que no esté listado no prueba que no exista; prueba que no está documentado] |
| **Openpay, Clip, Kushki, Nuvei** | **[NO ENCONTRADO]** en documentación pública accesible | **[NO ENCONTRADO]** | — |

### ¿Sirve la Payment Request API?

**No conviene construir sobre ella directamente.** Stripe ya movió a todos sus clientes del viejo *Payment Request Button Element* al **Express Checkout Element**, y publica una guía titulada *"Migrar del Payment Request Button Element al web Express Checkout Element"*. [VERIFICADO]

La Payment Request API sigue existiendo por debajo, pero aparece en la documentación solo como un requisito del entorno, no como una interfaz a programar: *"En webviews de Android, la app host también debe estar configurada para admitir la API Payment Request."* [VERIFICADO]

**Recomendación técnica:** usar el componente de la pasarela (Express Checkout Element o su equivalente), no la API del navegador. El componente resuelve la detección de disponibilidad, el orden de los botones, la localización y la tokenización, y sobrevive a los cambios de los navegadores.

### Los dos requisitos técnicos que cuestan trabajo de verdad

**1. HTTPS con certificado validado por dominio.** *"Tendrás que usar una página web HTTPS con un certificado validado por el dominio TLS para aceptar pagos de Google Pay en la web."* [VERIFICADO]

**2. Registro de dominio — y aquí está la trampa para una plataforma.** Hay que registrar todos los dominios y subdominios que muestren el botón, en prueba y en producción. Y entonces viene la línea que define semanas de trabajo:

> Cuando uses **cargos Direct** con Connect, **tendrás que configurar el dominio para cada cuenta conectada mediante la API.** Esto no es un requisito para las cuentas conectadas que usan otros tipos de cargos. [VERIFICADO — docs.stripe.com, idéntico para Apple Pay y para Google Pay]

**Traducción para Carta:** el dominio de Carta debe registrarse **una vez por cada restaurante**. Con 100 restaurantes son 100 registros por API, que hay que automatizar dentro del alta de cada cuenta conectada y reintentar cuando fallen. **Es trabajo real y hay que presupuestarlo**, y es irónicamente el tipo de fricción que aparece precisamente porque se eligió el camino legal.

### Compatibilidad, para fijar expectativas

De la tabla de navegadores del Express Checkout Element [VERIFICADO]:

- **Apple Pay**: Safari, y Chrome / Edge / Firefox / Opera en iOS 16+. **No se admite en Chrome en Android.** En navegadores de escritorio que no sean Safari, solo si se fuerza con `paymentMethods.applePay: 'always'`.
- **Google Pay**: soportado en Chrome, Edge, Opera, Chrome en Android, y en Safari / Firefox solo si se fuerza con `'always'`.

En una mesa mexicana, donde el 97.2% de los usuarios de internet entra desde el celular [VERIFICADO — INEGI, ENDUTIH 2024], la lectura práctica es: **iPhone con Safari → Apple Pay; Android con Chrome → Google Pay.** Cubre a casi todos, y para el resto queda el formulario de tarjeta.

---

## 2.7 Flujo 7 — Cuando Carta sea también punto de venta e inventario

### ¿Cambia su situación regulatoria? No.

> ## ✅ **El software de gestión no es actividad reservada por ninguna ley financiera mexicana.**

Un punto de venta que registra comandas, un módulo de inventario que descuenta insumos, un reporte de ventas, un control de mermas: **nada de eso aparece en el artículo 22 de la Ley Fintech, ni en el 81-A Bis de la LGOAAC, ni en el artículo 17 de la Ley Antilavado.** No hay registro que sacar, ni autorización que pedir, ni capital que exhibir.

**La frontera es la misma de siempre y se puede dibujar con una línea:**

| Lo regulado | Lo no regulado |
|---|---|
| **Guardar** dinero ajeno (Ley Fintech 22 I) | Registrar que una mesa consumió $500 |
| **Transmitir** dinero ajeno (LGOAAC 81-A Bis) | Decirle a la pasarela del restaurante que cobre $500 |
| **Emitir** valor monetario almacenado (Ley Fintech 23; LFPIORPI 17 II c) | Contar visitas y regalar un postre |
| **Aceptar pagos con tarjeta** bajo contrato propio con un adquirente (RMD 2ª) | Mostrar el botón de cobro del restaurante |
| **Prestar** o adelantar dinero (LFPIORPI 17 IV) | Mostrarle al restaurante cuánto vendió |

### La trampa del POS: el monedero de puntos

**Éste es el riesgo real que trae el punto de venta, y no es el que la gente espera.**

Todo POS de restaurante acaba pidiendo un programa de lealtad. Y todo programa de lealtad tiende, si nadie lo vigila, hacia un saldo en pesos. En el momento en que un comensal tiene "$80 de saldo en Carta" canjeables por comida, Carta emitió un **instrumento de almacenamiento de valor monetario**:

- **Ley Antilavado, artículo 17, fracción II, inciso c)**: *"Instrumentos de almacenamiento de valor monetario cuando su emisión, comercialización o abono de recursos sea por una cantidad igual o superior al equivalente a seiscientas cuarenta y cinco veces el valor diario de la UMA"* [VERIFICADO] — actividad vulnerable, con obligación de alta en el SAT, identificación de clientes, expedientes y avisos.
- **Ley Fintech, artículo 23**: si ese saldo es una obligación de pago a cargo de Carta, emitida contra la recepción de dinero, son fondos de pago electrónico. [VERIFICADO]
- Lo mismo aplica a **tarjetas de regalo** con saldo (fracción II inciso b).

**La regla de diseño:** los puntos de Carta deben ser **no monetarios y no canjeables por dinero**. "10 visitas, un postre" está bien. "Acumula $80" no. La diferencia no es de marketing: es de licencia.

### Emitir el CFDI por cuenta del restaurante

Aquí sí hay una regla exacta, y la tiene el SAT.

**El papel del PAC.** Un **Proveedor Autorizado de Certificación** es quien valida y timbra el CFDI; la autorización se la da el SAT conforme al artículo 29 del Código Fiscal de la Federación. **Carta no sería PAC ni le conviene serlo** (es una autorización con requisitos técnicos, fianza y auditorías propias). Carta sería el software que arma el XML y lo manda a un PAC — el papel que ya juegan decenas de facturadores. El costo variable de referencia: **$0.50 MXN por folio** vía API de Facturama, más **$1,650 MXN al año** del módulo. [VERIFICADO — investigación del 19-sep]

**El mandato que se necesita.** La regla aplicable es la **2.7.1.3 de la Resolución Miscelánea Fiscal para 2026** (DOF 28 de diciembre de 2025), titulada *"Expedición de CFDI por comisionistas y prestadores de servicios de cobranza"*. Texto literal [VERIFICADO]:

> **2.7.1.3.** Para los efectos del artículo 29, primero y penúltimo párrafos y 29-A del CFF, así como 32, fracción III de la Ley del IVA, los contribuyentes que actúen como **comisionistas o que presten servicios de cobranza**, podrán expedir CFDI **a nombre y por cuenta de los comitentes o prestatarios con los que tengan celebrado el contrato de comisión o prestación de servicios de cobranza**, respecto de las operaciones que realicen en su calidad de comisionistas o prestadores de servicio de cobranza.
>
> Para estos efectos, los comprobantes deberán cumplir además de los requisitos a que se refieren los artículos 29 y 29-A del CFF, con la siguiente información:
> **I.** La clave en el RFC del comitente o del prestatario.
> **II.** Monto correspondiente a los actos o actividades realizados por cuenta del comitente o prestatario.
> **III.** Impuesto que se traslada o se retiene por cuenta del comitente o prestatario.
> **IV.** Tasa del impuesto que se traslada o se retiene por cuenta del comitente o prestatario.
>
> En el CFDI que se expida, se deberá incorporar **el nodo "ACuentaTerceros"**.
>
> Con independencia de lo señalado en la presente regla, **el comisionista o prestador de servicios estará obligado a expedir al comitente o prestatario el CFDI correspondiente a la comisión o prestación del servicio respectivo.**
>
> Cuando los contribuyentes que hayan optado por aplicar esta regla, **incumplan lo establecido en la misma, perderán el derecho de aplicar la facilidad** que en la misma se detalla, **siendo el comitente o el prestatario el responsable de la emisión del CFDI.**

**Lo que esto significa, en español:**

1. **Sí se puede** que Carta emita el CFDI a nombre y por cuenta del restaurante.
2. **Hace falta un contrato** — de comisión o de prestación de servicios de cobranza — firmado antes, no después.
3. El comprobante debe traer el **RFC del restaurante**, el monto por su cuenta, el impuesto y la tasa, y el **nodo `ACuentaTerceros`**.
4. **Carta además tiene que facturarle al restaurante su propia comisión**, en un CFDI aparte.
5. **La responsabilidad última es del restaurante.** La regla es una *facilidad*: si se incumple, se pierde, y el responsable de emitir el CFDI vuelve a ser el restaurante. **La obligación fiscal nunca se transfiere; solo se delega la mecánica.**

**Y la aclaración que evita el error más caro de todo este documento:**

> ### La regla 2.7.1.3 es **fiscal**, no **financiera**. Autoriza a *timbrar* por cuenta de otro. **No autoriza a *recibir dinero* por cuenta de otro.**

La palabra "cobranza" en el título de una regla del SAT **no** es una licencia de la CNBV. Recibir dinero ajeno lo siguen gobernando el artículo 22 de la Ley Fintech y el 81-A Bis de la LGOAAC, y ninguna regla miscelánea puede modificarlos. Si alguien —un contador, un vendedor de software, un inversionista— argumenta que "como somos comisionistas de cobranza para el SAT, podemos recibir el dinero", **está equivocado, y es el tipo de error que acaba en un proceso penal.**

**Además:** el restaurante sigue obligado a emitir la **factura global** de sus operaciones con el público en general, conforme a la regla **2.7.1.21** de la misma RMF 2026 [VERIFICADO — regla localizada y leída]. Ese es el grueso de la operación de un restaurante, porque casi nadie pide factura.

**El riesgo que hay que nombrar:** para timbrar por cuenta del restaurante, Carta necesita operar con el **Certificado de Sello Digital** del restaurante o con credenciales de un PAC a su nombre. **Quien tiene el CSD puede emitir facturas a nombre del restaurante.** Eso no es un problema regulatorio, es un problema de custodia: hay que tratarlo como se trata una llave de banco, con cifrado en reposo, acceso auditado y rotación. Un CSD filtrado es facturación apócrifa a nombre del cliente.

**Recomendación:** para el piloto, **Carta no timbra.** Muestra el folio, el total y el enlace al portal de facturación del restaurante. Medio peso por folio no es el problema; el problema es volverse responsable de la obligación fiscal de otro antes de saber si el producto sirve.

### Ficha

| Concepto | Respuesta |
|---|---|
| **Quién es el comercio** | El restaurante, siempre |
| **Por dónde pasa el dinero** | Por ningún lado — el POS no cobra; solo registra |
| **Qué construye Carta** | POS, inventario, reportes. Y, si acaso, integración con un PAC |
| **Qué necesita el restaurante** | Para el POS: nada. Para el CFDI: contrato de comisión o de cobranza, y entregar credenciales fiscales |
| **Qué cuesta** | POS: $0 adicional. CFDI: ≈$0.50 por folio + $1,650 al año [VERIFICADO] |
| **Exposición legal** | **Ninguna** por el software. **Fiscal, no financiera**, por el CFDI |

### Veredicto

> ## ✅ **SÍ al POS y al inventario, sin cambio regulatorio. 🟡 SOLO SI al CFDI: con contrato, con nodo `ACuentaTerceros` y sabiendo que el responsable sigue siendo el restaurante. ❌ NO al monedero con saldo en pesos.**

---

# 3. Tabla maestra: esto sí / esto no / esto solo si

| # | Conducta | Veredicto | Condición o fundamento |
|---|---|---|---|
| 1 | Dividir la cuenta en pantalla | ✅ **SÍ** | No es actividad reservada. Es aritmética |
| 2 | Mostrar cuánto le toca a cada comensal | ✅ **SÍ** | Ídem |
| 3 | Reasignar las partidas de un comensal a otro ("yo pago lo de él") | ✅ **SÍ** | Solo si se mueve la **atribución**, nunca un monto |
| 4 | Sugerir y calcular la propina | ✅ **SÍ** | LFT 346: se sugiere, no se toca |
| 5 | Mostrar la CLABE del restaurante con monto y referencia | ✅ **SÍ** | La cuenta es del restaurante |
| 6 | Mostrar el QR o enlace de cobro que el restaurante pegó en su panel | ✅ **SÍ** | Carta solo muestra un enlace ajeno |
| 7 | Redactar el mensaje de WhatsApp para que un comensal le transfiera a otro | ✅ **SÍ** | Carta redacta; la transferencia es entre personas, fuera de Carta |
| 8 | Aceptar Apple Pay y Google Pay | ✅ **SÍ** | Es una tarjeta tokenizada. No activa ningún artículo adicional |
| 9 | Punto de venta e inventario | ✅ **SÍ** | Software de gestión no es actividad reservada |
| 10 | Recomendarle al restaurante sin terminal que use tap-to-phone | ✅ **SÍ** | Carta no integra nada |
| 11 | Programa de lealtad **no monetario** (postre a las 10 visitas) | ✅ **SÍ** | No hay valor monetario almacenado |
| 12 | **Crear cobros por monto exacto con la pasarela del restaurante** | 🟡 **SOLO SI** | Credenciales del restaurante, autorización explícita, comercio = restaurante |
| 13 | **Cuentas conectadas con cargos Direct** | 🟡 **SOLO SI** | Solo Direct; cuenta y KYC del restaurante; reembolsos y contracargos suyos; **abogado por escrito** |
| 14 | **Cobrar comisión de plataforma** | 🟡 **SOLO SI** | Calculada **sobre el consumo**, jamás sobre la propina. Recomendado: **cero** |
| 15 | **CLABE generada por un proveedor para conciliar SPEI** | 🟡 **SOLO SI** | La capacidad se activa en la cuenta **del restaurante**, nunca en la de Carta |
| 16 | **Emitir el CFDI por cuenta del restaurante** | 🟡 **SOLO SI** | Contrato de comisión o cobranza + nodo `ACuentaTerceros` + CFDI de la comisión (RMF 2026, 2.7.1.3) |
| 17 | **Guardar el CSD del restaurante** | 🟡 **SOLO SI** | Cifrado, acceso auditado, rotación. Es una llave de banco |
| 18 | Recibir el pago del comensal y después pagarle al restaurante | ❌ **NO** | Ley Fintech 22 I y IV; LGOAAC 81-A Bis. **7–15 años** (124) / **3–15 años** (101) |
| 19 | Monedero, saldo a favor, "Carta Cash", tarjetas de regalo con saldo | ❌ **NO** | Ley Fintech 22 I y 23; LFPIORPI 17 II b) y c) |
| 20 | Que un comensal le mande saldo a otro dentro de la app | ❌ **NO** | Ley Fintech 22 **fracción II**, literal |
| 21 | CLABEs propias o "virtuales" a nombre de Carta | ❌ **NO** | Ley Fintech 22 I; LGOAAC 81-A Bis |
| 22 | Cargos "a un destino" o "cargos y envíos de fondos separados" | ❌ **NO** | El dinero pasa por el saldo de Carta. Y Carta tendría que facturar la comida |
| 23 | Una sola cuenta de comercio de Carta para cobrar de varios restaurantes | ❌ **NO** | Agregador de facto sin contrato con Adquirente (RMD 2ª) + transmisor de dinero + art. 22 |
| 24 | Retener o repartir propinas | ❌ **NO** | LFT 346 y 350 fr. II; y saldo ajeno |
| 25 | Comisión de plataforma calculada sobre la propina | ❌ **NO** | LFT 346: ni el patrón puede participar en ellas |
| 26 | Propina obligatoria o precargada que no se pueda quitar | ❌ **NO** | Deja de ser voluntaria y entra en la base del IVA |
| 27 | Terminal virtual: que el mesero teclee la tarjeta | ❌ **NO** | Fraude, PCI, tasa de tecleado. Descartada |
| 28 | Adelantar dinero al restaurante contra ventas futuras | ❌ **NO** | LFPIORPI 17 fr. IV; y probablemente SOFOM |
| 29 | Cobrar en efectivo por cuenta del restaurante y depositarle | ❌ **NO** | LFPIORPI 17 fr. X: traslado o custodia de dinero |
| 30 | Conectarse a la cuenta bancaria del restaurante para "barrer" fondos | ❌ **NO** | LFPIORPI 17 fr. XI b) y c) |
| 31 | Ser IFPE o transmisor de dinero | ❌ **NO** | $4,410,538 de capital; o registro CNBV con establecimientos físicos. Ya decidido |

---

# 4. La frontera regulatoria

Las conductas concretas que convertirían a Carta en una entidad regulada, con su artículo y su liga.

### 4.1 Lo que la vuelve institución de fondos de pago electrónico

**Ley para Regular las Instituciones de Tecnología Financiera**, última reforma DOF 14-11-2025 — https://www.diputados.gob.mx/LeyesBiblio/pdf/LRITF.pdf

| Conducta | Artículo | Qué dice |
|---|---|---|
| Abrir cuentas con saldo por comensal o por restaurante | **22 fr. I** | *"Abrir y llevar una o más cuentas de fondos de pago electrónico por cada Cliente"* |
| Mover saldo de un comensal a otro | **22 fr. II** | *"Realizar transferencias de fondos de pago electrónico entre sus Clientes"* |
| Entregarle al restaurante el dinero que Carta recibió del comensal | **22 fr. IV** | *"Entregar una cantidad de dinero […] equivalente a la misma cantidad de fondos de pago electrónico"* |
| Llevar el registro de esos saldos | **22 fr. V** | *"Mantener actualizado el registro de cuentas"* |
| Tener en la base de datos una obligación de pago de Carta hacia alguien | **23** | Definición de fondos de pago electrónico |
| **Sanción** | **124 fr. I** | **7 a 15 años de prisión** y multa de 5,000 a 150,000 UMA ($586,550 a $17,596,500) |
| **Costo de hacerlo bien** | Disposiciones CNBV para ITF, arts. 6–8 | **500,000 UDIS = $4,410,538 MXN** de capital mínimo |

### 4.2 Lo que la vuelve transmisor de dinero

**Ley General de Organizaciones y Actividades Auxiliares del Crédito**, última reforma DOF 14-11-2025 — https://www.diputados.gob.mx/LeyesBiblio/pdf/LGOAAC.pdf

| Conducta | Artículo | Qué dice |
|---|---|---|
| Recibir dinero por medios electrónicos con el único objeto de entregarlo al restaurante | **81-A Bis** | *"recibe en el territorio nacional derechos o recursos […] por medios electrónicos, transferencia electrónica de fondos o por cualquier vía, con el único objeto de que […] los transfiera […] o para entregarlos […] al beneficiario designado"* |
| Hacerlo y además emitir saldo | **81-A Bis**, último párrafo | *"deberán constituirse como una institución de fondos de pago electrónico"* |
| **Qué exigiría** | **81-B** | Registro ante la CNBV; decir en toda su publicidad que es "transmisor de dinero"; **establecimientos físicos** (fr. III) |
| **Sanción** | **101** | **3 a 15 años de prisión** y multa hasta 100,000 días de salario |

### 4.3 Lo que la vuelve actividad vulnerable ante la ley antilavado

**Ley Federal para la Prevención e Identificación de Operaciones con Recursos de Procedencia Ilícita**, última reforma DOF 16-07-2025 — https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPIORPI.pdf

| Conducta | Artículo | Umbral |
|---|---|---|
| Emitir tarjetas prepagadas | **17 fr. II b)** | 645 UMA = **$75,665** por operación |
| **Emitir instrumentos de almacenamiento de valor monetario** (el monedero de puntos con saldo) | **17 fr. II c)** | 645 UMA = **$75,665** por operación |
| Trasladar o custodiar dinero (cobrar efectivo por cuenta del restaurante) | **17 fr. X** | 3,210 UMA = **$376,565**, o **siempre** si no se puede determinar el monto |
| Administrar recursos o manejar cuentas bancarias de clientes | **17 fr. XI b) y c)** | Sin umbral de identificación |
| Prestar o adelantar dinero | **17 fr. IV** | Aviso a partir de 1,605 UMA = **$188,282** |

*(Ser actividad vulnerable no es delito: obliga a darse de alta en el SAT, identificar clientes, integrar expedientes y presentar avisos. Para una empresa de una persona es una carga de cumplimiento permanente que no se puede sostener.)*

### 4.4 Lo que la vuelve agregador regulado

**Disposiciones de carácter general aplicables a las Redes de Medios de Disposición** (Banxico y CNBV), texto compilado DOF 11-mar-2014 con modificaciones del 2-abr-2015 y del **27-abr-2026** — publicadas por el Banco de México en https://www.banxico.org.mx

| Conducta | Disposición | Consecuencia |
|---|---|---|
| Ofrecer a restaurantes el servicio de aceptación de pagos con tarjeta bajo contrato propio con un Adquirente | **2ª**, definición de *Agregador* | Se vuelve Participante en Redes |
| Hacerlo **sin** contrato con un Adquirente | **2ª** | No hay figura. Está operando fuera del marco |
| Siendo Agregador | **13ª** | Debe **registrar ante Banxico cada comisión o tasa de descuento** que cobre, y cada modificación, a través de la Dirección de Información del Sistema Financiero. Banxico las publica |
| Siendo Agregador | **14ª** | Debe entregar **estados de cuenta a los Receptores de Pagos**, con periodicidad no mayor a un trimestre, en el formato del Anexo 3 |
| Siendo Agregador | Contrato con el Adquirente | Debe prever la obligación de **recibir visitas domiciliarias** de la CNBV y Banxico |

---

# 5. ¿Existe una figura ligera?

Sí. Hay seis caminos posibles y **Carta ya está en el mejor de ellos**.

### A. Desarrollador que solo integra la pasarela del comercio ← **la que Carta debe conservar**

**Qué es:** Carta escribe software. El restaurante tiene su propia relación de cobro con quien quiera. Carta muestra, calcula, divide y, cuando mucho, le pide a la pasarela del restaurante que genere un cobro.

**Qué exige:**
- Ninguna autorización, ningún registro, ningún capital mínimo, ningún contrato con Banxico.
- Un **contrato de prestación de servicios de software** con el restaurante, con una cláusula explícita: *"El Prestador no recibe, custodia, administra ni transmite recursos de los clientes del Restaurante."* Esa frase es el activo legal más barato del proyecto.
- **Custodia de credenciales** del restaurante (llaves de API, tokens OAuth, CSD): cifrado en reposo, acceso auditado, rotación.
- **PCI-DSS SAQ-A**, la versión más ligera, que aplica cuando el comercio nunca toca datos de tarjeta porque todo ocurre en un iframe o una página del proveedor. [ESTIMACIÓN: el nivel de SAQ lo determina el adquirente caso por caso; **no se consultó el texto del PCI SSC en esta investigación**]
- **Aviso de privacidad** y cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.

**Costo:** $0 de licencias. El costo real es la disciplina de no cruzar la línea.

### B. Plataforma con cuentas conectadas (cargos Direct)

**Qué es:** Carta es "plataforma" para Stripe o Mercado Pago. Cada restaurante es un comercio independiente con su propia cuenta.

**Qué exige:**
- Que cada restaurante **abra su cuenta y pase su propio KYC** (en Mercado Pago, nivel 6) y autorice a Carta por **OAuth**.
- **Solo cargos Direct.** Nunca a destino, nunca separados.
- Registro del dominio de Carta **por cada cuenta conectada**, vía API, para Apple Pay y Google Pay.
- Dejar por escrito que reembolsos y contracargos son del restaurante.
- **Un abogado fintech que firme el diseño.**

**Costo para Carta:** **$0** si el proveedor le factura directo a cada restaurante (*"Sin comisiones para tu plataforma"*); **MXN 35 por cuenta activa mensual + 0.25% + MXN 12 por transferencia** si Carta fija el precio. [VERIFICADO — stripe.com/mx/connect/pricing, hoy]

**Esta no es una figura regulada mexicana.** Es un producto comercial. Jurídicamente, Carta sigue siendo un proveedor de software; el Receptor de Pagos es el restaurante.

### C. Agregador bajo el paraguas de un Adquirente autorizado

**Qué exige:** un **contrato de prestación de servicios con un Adquirente** (un banco o adquirente licenciado). Sin ese contrato, la figura no existe. Más: registrar cada comisión ante Banxico (13ª), entregar estados de cuenta trimestrales (14ª), aceptar visitas domiciliarias.

**No requiere autorización de la CNBV.** Pero requiere una relación bancaria que hoy no existe y meses de trámite. **Es una puerta, no una prohibición — y hoy está cerrada.**

### D. Empresa Especializada (Redes de Medios de Disposición)

**Qué es, literal:** *"a los Participantes en Redes que presten servicios **solo a los Participantes** en la Red de Pagos con Tarjeta, que sean necesarios para que dichos sujetos puedan llevar a cabo las respectivas actividades"*. [VERIFICADO — disposición 2ª]

**No le sirve a Carta**, y la razón está en la palabra "solo": una Empresa Especializada le vende a adquirentes, emisores y cámaras de compensación, no a restaurantes. Carta le vende al restaurante. Se anota para que nadie pierda tiempo evaluándola.

### E. Comisionista de cobranza fiscal (RMF 2026, regla 2.7.1.3)

**Qué habilita:** emitir el CFDI a nombre y por cuenta del restaurante, con contrato y con el nodo `ACuentaTerceros`.

**Qué NO habilita:** recibir dinero. **Es una facilidad del SAT, no una autorización de la CNBV.** Ya desarrollado en la §2.7.

### F. Modelo Novedoso — el sandbox de la Ley Fintech

**Qué es:** los artículos 80 a 82 de la Ley Fintech permiten una **autorización temporal** para operar un Modelo Novedoso, con excepciones y condicionantes al cumplimiento de los requisitos de las leyes financieras, **prorrogable hasta por un año más** mientras se tramita la autorización definitiva. [VERIFICADO]

Los criterios que evalúan las autoridades [VERIFICADO — art. 82]:
> **I.** Que la propuesta sea un Modelo Novedoso; **II.** El producto […] debe requerir probarse en un medio controlado; **III.** La forma en que se pretenda desarrollar la actividad reservada debe representar un beneficio al […]

**Por qué no es un atajo:** es una solicitud formal ante la CNBV y/o Banxico, con expediente, para hacer **una actividad reservada**. Es el camino de quien ya decidió ser una fintech y quiere empezar antes. **Carta no quiere ser una fintech; quiere ser un menú.** Se anota para dejar constancia de que existe y de que se descartó a propósito.

### La tabla de las seis

| Figura | ¿Autorización? | ¿Capital? | ¿Contrato con banco? | ¿Le sirve a Carta hoy? |
|---|---|---|---|---|
| **A. Desarrollador / integrador** | No | No | No | ✅ **Sí — es la actual** |
| **B. Plataforma con cargos Direct** | No | No | No (lo tiene el restaurante) | ✅ **Sí, en la V2** |
| **C. Agregador** | No (CNBV) | No publicado | **Sí, con un Adquirente** | 🟡 Algún día |
| **D. Empresa Especializada** | No | No | Con Participantes | ❌ No aplica |
| **E. Comisionista fiscal** | No | No | No | 🟡 Solo para el CFDI |
| **F. Modelo Novedoso** | **Sí, temporal** | Según lo que fijen | — | ❌ Descartada a propósito |
| **IFPE** | **Sí, CNBV** | **$4,410,538** | — | ❌ Descartada |
| **Transmisor de dinero** | **Registro CNBV** | — | — | ❌ Exige establecimientos físicos |

---

# 6. Diseño recomendado del checkout de Carta

### 6.1 La decisión de negocio que va antes que la técnica

> ### **Que la comisión de plataforma de Carta sea cero.**

Carta gana con la suscripción. Ése es su negocio y las tres investigaciones anteriores lo confirman: en México, las plataformas de restaurante que operan (Fudo, Last.app, OlaClick) cobran suscripción, y ninguna pasarela le sale más barata al restaurante que su terminal.

Poner la comisión en cero tiene tres efectos, y el tercero es el importante:

1. **Carta paga $0 de Connect**, porque el proveedor le factura directo a cada restaurante.
2. **El argumento de venta se vuelve limpio:** *"nosotros no nos quedamos con nada de tu cobro"*. OlaClick construyó su posicionamiento entero sobre esa frase.
3. **Carta deja de tener un incentivo para acercarse al dinero.** El día que la comisión sobre el pago sea una línea de ingreso, cada decisión de diseño empieza a torcerse hacia el lado peligroso: "¿y si guardamos el saldo un día para optimizar?", "¿y si cobramos nosotros y le pagamos al restaurante el viernes?". **Ese es el camino que termina en el artículo 124, y no se recorre de un salto: se recorre un producto a la vez.**

### 6.2 Qué se construye, en qué orden

**Fase 0 — el piloto de diciembre de 2026. Carta no cobra.** (Ya recomendada el 20 de septiembre; se confirma sin cambios.)

| # | Qué | Horas |
|---|---|---:|
| 1 | Modelo de cuenta: **un solo saldo**, partidas atribuibles, compartidos, descuentos | 10 |
| 2 | División en pantalla: por consumo, partes iguales, monto libre | 12 |
| 3 | **"Yo pago lo de él"**: reasignación de partidas con bloqueo del lado del servidor y confirmación del otro comensal | 10 |
| 4 | Propina sugerida (10/15/20% y libre) con la leyenda de que es voluntaria | 4 |
| 5 | Estado de mesa y acción "cobrada" del mesero, protegida con PIN | 6 |
| 6 | Pantalla de datos para facturar: folio, total, RFC del emisor, enlace al portal del restaurante | 4 |
| 7 | Campo opcional para que el restaurante pegue su enlace de cobro, mostrado como QR | 14 |
| 8 | Pantalla de CLABE del restaurante con monto, referencia y botón de copiar | 8 |
| 9 | Mensaje de WhatsApp listo para "uno paga, los demás le transfieren" | incl. en 3 |
| 10 | Pruebas en mesa real, con mesero real | 8 |
| | **Total** | **76 h** |

[ESTIMACIÓN propia, sobre las estimaciones de la investigación del 20-sep]

**Fase 1 — la V2, y solo si el piloto lo pide.** Condiciones de arranque, las tres a la vez:

1. Que **al menos tres restaurantes del piloto lo pidan por escrito**, sabiendo el sobrecosto (§2.2).
2. Que exista al menos un cliente que **no tenga contrato bancario** — para ése, la pasarela no es un sobrecosto, es la diferencia entre cobrar con tarjeta y no cobrar.
3. Que **un abogado fintech mexicano firme el diseño**.

| # | Qué | Horas | Nota crítica |
|---|---|---:|---|
| 1 | Alta de cuentas conectadas: KYC, estados de onboarding, reintentos | 24 | Cuenta y KYC **del restaurante** |
| 2 | **Cargos Direct** con `application_fee_amount` | 16 | **En cero.** Y una prueba automatizada que falle si alguien le pasa el total con propina |
| 3 | Webhooks: pago, reembolso, contracargo, disputa | 20 | Los objetos viven en la cuenta conectada: hay que consultar con `Stripe-Account` |
| 4 | **Pagos parciales** sobre una cuenta abierta | 24 | El trabajo escondido. Idempotencia y bloqueo de partidas |
| 5 | Reembolsos y sobrepagos, emitidos **desde la cuenta del restaurante** | 12 | Con `refund_application_fee=true` si alguna vez hubiera comisión |
| 6 | Panel de conciliación por restaurante | 16 | Consulta cuenta por cuenta; no hay lista central |
| 7 | Apple Pay y Google Pay vía Express Checkout Element | 12 | **+ registro del dominio por cada cuenta conectada, vía API** |
| 8 | Pruebas con dinero real | 16 | |
| | **Total** | **140 h** | más la revisión legal escrita |

### 6.3 Con qué proveedor

| Situación del restaurante | Qué se usa | Por qué |
|---|---|---|
| **Ya tiene Clip, Mercado Pago o Conekta** | **Enlace de cobro dinámico con su propio proveedor** | No se le agrega un proveedor más, no hay KYC nuevo, y la tasa es la que ya negoció |
| **No tiene nada** | **Stripe Connect con cargos Direct**, o **Split 1:1 de Mercado Pago** | Stripe documenta con precisión dónde cae el dinero, lo cual es en sí mismo un activo legal. Mercado Pago es más barato y tiene más presencia en México |
| **Tiene terminal bancaria y buen volumen** | **Nada. Que cobre con su terminal.** | Le sale entre $2,580 y $8,310 al mes más caro cualquier otra cosa |

**Nota sobre Stripe en México, que sigue vigente:** en la tabla oficial de disponibilidad de Stripe Terminal, México **no tiene un solo lector de tarjeta**; su única fila es *"Tap to Pay on iPhone (Public preview)"*. [VERIFICADO — investigación del 20-sep] Stripe sirve para cobrar **en línea**, desde el teléfono del comensal. No sirve para cobrar en la mesa con un aparato.

### 6.4 Qué le cuesta al restaurante

Cuenta de $500 con tarjeta de crédito, sin IVA, contra su terminal BBVA a 2.33%:

| Escenario | Costo | Contra su terminal |
|---|---:|---:|
| Carta no cobra (terminal del restaurante) | $11.65 | **$0** |
| SPEI o efectivo | $0.00 | **−$11.65** |
| Clip, cuenta completa | $15.95 | +$4.30 |
| Clip, dividida en 4 | $18.95 | +$7.30 |
| Stripe, cuenta completa | $21.00 | +$9.35 |
| **Stripe, dividida en 4** | **$30.00** | **+$18.35** |
| **Mercado Pago, dividida en 4** | **$33.45** | **+$21.80** |

### 6.5 Qué contratos y autorizaciones hacen falta

| Documento | Entre quién | Para qué |
|---|---|---|
| **Contrato de prestación de servicios de software** | Carta ↔ restaurante | Con la cláusula de que Carta **no recibe, custodia, administra ni transmite** recursos de los clientes del restaurante |
| **Contrato con el Adquirente o Agregador** | **Restaurante** ↔ proveedor | Es lo que lo vuelve **Receptor de Pagos** (RMD 2ª). **Nunca a nombre de Carta** |
| **Autorización OAuth / alta de cuenta conectada** | Restaurante → Carta | Permiso explícito y revocable para crear cobros en su nombre |
| **Anexo de responsabilidades** | Carta ↔ restaurante | Quién atiende reembolsos, contracargos y disputas: **el restaurante** |
| **Contrato de comisión o de servicios de cobranza** | Carta ↔ restaurante | **Solo si** Carta va a timbrar (RMF 2026, 2.7.1.3) |
| **Aviso de privacidad** | Carta → comensales | LFPDPPP |
| **Opinión legal escrita** | Abogado fintech → Carta | Antes de la primera línea de código de cobros |

### 6.6 Lo que queda prohibido para siempre

Esta lista no se revisa, no se negocia y no depende del crecimiento del producto.

1. Que el dinero del comensal caiga en una cuenta de Carta, aunque sea un segundo.
2. Monedero, saldo a favor, "Carta Cash", tarjetas de regalo con saldo en pesos.
3. Que un comensal le transfiera saldo a otro dentro de la aplicación.
4. CLABEs propias o "virtuales" a nombre de Carta.
5. Cargos a un destino o cargos y envíos de fondos separados.
6. Una sola cuenta de comercio de Carta para cobrar de varios restaurantes.
7. Retener, guardar o repartir propinas.
8. Comisión de plataforma calculada sobre la propina.
9. Propina obligatoria o precargada que no se pueda quitar.
10. Terminal virtual: que un mesero teclee la tarjeta de un comensal.
11. Adelantar dinero al restaurante contra ventas futuras.
12. Cobrar efectivo por cuenta del restaurante.
13. Conectarse a la cuenta bancaria del restaurante para mover fondos.
14. Puntos de lealtad expresados en pesos.

**La prueba que resume las catorce, y que cabe en una pregunta para hacerse en cada junta de diseño:**

> ### ¿Hay algún momento, aunque sea de un segundo, en que Carta le deba dinero a alguien?
>
> Si la respuesta es sí, eso es el artículo 22 y no se construye.

---

# 7. Fuentes

**Leyes — todas leídas hoy, 23 de septiembre de 2026, en el texto vigente de la Cámara de Diputados**

| Ordenamiento | Última reforma | Liga | Artículos usados |
|---|---|---|---|
| Ley para Regular las Instituciones de Tecnología Financiera | DOF 14-11-2025 | https://www.diputados.gob.mx/LeyesBiblio/pdf/LRITF.pdf | 22, 23, 80, 82, 124 |
| Ley Federal del Trabajo | DOF 14-05-2026 | https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf | 291-F, 344, 345, **346**, 347, 350 |
| Ley General de Organizaciones y Actividades Auxiliares del Crédito | DOF 14-11-2025 | https://www.diputados.gob.mx/LeyesBiblio/pdf/LGOAAC.pdf | **81-A Bis**, 81-B, 101 |
| Ley Federal para la Prevención e Identificación de Operaciones con Recursos de Procedencia Ilícita | DOF 16-07-2025 | https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPIORPI.pdf | **17** fr. II, III, IV, X, XI |

**Regulación secundaria**

- *Disposiciones de carácter general aplicables a las Redes de Medios de Disposición*, Banxico y CNBV. Texto compilado: DOF 11-mar-2014, con modificaciones del 2-abr-2015 y del **27-abr-2026**. Disposiciones 2ª (definiciones), 13ª, 14ª, 15ª y Anexo 1 (cuotas de intercambio). [VERIFICADO]
- *Resolución Miscelánea Fiscal para 2026*, DOF **28 de diciembre de 2025**. Reglas **2.7.1.3** (CFDI por comisionistas y prestadores de servicios de cobranza) y **2.7.1.21** (factura global). [VERIFICADO]
- *Disposiciones de carácter general aplicables a las Instituciones de Tecnología Financiera*, CNBV, artículos 6 a 8 (capital mínimo). [VERIFICADO — investigación del 19-sep]
- *Circular 12/2018* del Banco de México (niveles de cuenta de IFPE), DOF 10-sep-2018. [VERIFICADO — investigación del 19-sep]

**Documentación técnica — consultada hoy**

- Stripe, *Crea cargos Direct* — https://docs.stripe.com/connect/direct-charges
- Stripe, *Apple Pay* (variante Web) — https://docs.stripe.com/apple-pay
- Stripe, *Google Pay* (variante Web) — https://docs.stripe.com/google-pay
- Stripe, *Express Checkout Element* — https://docs.stripe.com/elements/express-checkout-element
- Stripe, *Pagos con transferencia bancaria* — https://docs.stripe.com/payments/bank-transfers
- Stripe, *Precios de Connect en México* — https://stripe.com/mx/connect/pricing
- Conekta, *Pagos con tarjeta* — https://www.conekta.com/payments/cards
- Conekta, *Transferencias bancarias* — https://www.conekta.com/payments/bank-transfers
- Mercado Pago Developers, *Checkout API* — https://www.mercadopago.com.mx/developers/es/docs/checkout-api/overview

*(Método: la documentación de Stripe se sirve en markdown limpio agregando `.md` a la URL. Las páginas con variantes devuelven primero un índice; hay que pedir la variante, por ejemplo `?platform=web`. Ahorró la mitad del tiempo de esta investigación y conviene anotarlo para la próxima.)*

**De las investigaciones anteriores, citado sin volver a levantar:** tasas de descuento de Banxico para el giro Restaurantes (julio 2026); cuotas de intercambio del Anexo 1; padrón de 40 IFPE autorizadas por la CNBV; tarifas publicadas de Clip, Mercado Pago, Conekta, Openpay, PayPal y SumUp; Tap to Pay en iPhone en México; disponibilidad de Stripe Terminal en México; costo de timbrado de Facturama; UDI y tipo de cambio del DOF.

---

# Anexo — lo que no se pudo verificar

| Dato | Estado | Qué se intentó |
|---|---|---|
| **Texto del criterio normativo 33/IVA/N** (propinas fuera de la base del IVA) | **[ESTIMACIÓN]** | Dos búsquedas. El número del criterio y su razonamiento aparecen en varias fuentes fiscales concordantes, pero **no se abrió el Anexo 7 de la RMF en el DOF**. Se revisó además el cuerpo completo de la RMF 2026 descargada: **la palabra "propina" no aparece ni una vez** |
| **Que recibir SPEI sea gratuito para el que cobra** | **[ESTIMACIÓN]** | La página de SPEI de Banxico devolvió **404 en dos intentos** (la original redirige a `anterior.banxico.org.mx`, que tampoco responde). Criterio ampliamente citado, sin respaldo en texto de Banxico accesible |
| **Quién puede participar en SPEI y quién puede tener CLABE** | **[NO ENCONTRADO]** | Mismos dos intentos fallidos. El argumento del documento no depende de esta fuente: se sostiene con el art. 81-A Bis de la LGOAAC y el art. 22 de la Ley Fintech, ambos verificados |
| **Documentación técnica de Apple Pay y Google Pay en Conekta** | **[NO ENCONTRADO]** | Dos URLs de `developers.conekta.com` devolvieron 404. Se confirma en su página comercial que ambos métodos están listados, pero no los requisitos de activación |
| **Si Mercado Pago soporta Apple Pay o Google Pay en web en México** | **[NO ENCONTRADO]** | No están listados en su documentación de Checkout API para México. **Que no esté documentado no prueba que no exista** |
| **Tarifas de Apple Pay/Google Pay en Openpay, Clip, Kushki y Nuvei** | **[NO ENCONTRADO]** | Sin documentación pública accesible |
| **Nivel de SAQ de PCI-DSS que le aplicaría a Carta** | **[ESTIMACIÓN]** | No se consultó el texto del PCI Security Standards Council. Lo determina el adquirente caso por caso |
| **Valor de la UMA 2026 ($117.31 diarios)** | **[ESTIMACIÓN]** | Múltiples fuentes concordantes citando el comunicado del INEGI (DOF 9-ene-2026); no se abrió el comunicado |
| **Todas las horas de desarrollo** | **[ESTIMACIÓN propia]** | Suponen un desarrollador que ya conoce el código. Las de pagos parciales son optimistas |
| **Todos los supuestos de volumen** (ticket de $500, 40 mesas al día, mitad con tarjeta, mitad de las cuentas divididas en cuatro) | **[ESTIMACIÓN propia]** | No existe ticket promedio de restaurante mexicano publicado. Las tasas sí están verificadas; los volúmenes son supuestos declarados |
