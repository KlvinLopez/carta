# Carta — Documento maestro

**Estado:** borrador · 19 de septiembre de 2026 · **Autor:** Calvin (KlvinLopez)
**Fuente de verdad sobre competencia y precios:** [`docs/research/2026-09-19-competencia-real-mexico.md`](research/2026-09-19-competencia-real-mexico.md)

**Qué es Carta, en una frase:** una aplicación web que se abre escaneando el código QR de la mesa —sin descargar nada y sin registrarse— donde los comensales ven los platillos en 3D, arman **una sola orden entre todos desde sus propios teléfonos** y se la mandan al mesero.

> **In English.** Carta is a table-side web app: diners scan the table's QR code — no download, no sign-up — see dishes in 3D, and **build one shared order together from their own phones**, which reaches the waiter's screen. The shared order is the differentiator: market research (September 2026) found that no competitor in Mexico lets a table *build* an order together; the ones that exist only *split the check at payment*. The realistic competitor is not a delivery app but the point-of-sale system the restaurant already pays for — Fudo sells QR table ordering bundled with a full POS from MXN $690/month. Only two of seven systems reviewed accept an order from an outside program, so until Carta replaces the POS, **the waiter re-types each order**; that cost is stated openly and measured in the pilot. The first milestone is December 2026: four phones building one order with a real menu, allergens visible, and the waiter serving it. Payments, invoicing, back-office, accounts and AI personalization are explicitly out of scope. Evidence that 3D menus lift sales does not exist publicly — the widely cited figures traced back to the vendor — so the pilot is designed to measure it honestly.

---

## 1. Para qué sirve este documento

Este documento es el plano de Carta: qué es, qué no es, en qué orden se construye y cómo se sabe que una etapa terminó. Está escrito para cuatro lectores:

| Lector | Qué encuentra aquí |
|---|---|
| **Calvin** (dueño del proyecto) | Qué sigue, qué entra en cada versión y cuándo dar algo por terminado. |
| **Quien lo construya** (Calvin con Claude Code, o un programador que entre después) | El alcance explícito y las decisiones ya tomadas, para no volver a discutirlas. |
| **Inversionista o socio** | El problema, la competencia real, la estrategia y qué falta por probar. |
| **Reclutador o entrevistador** | Qué se decidió, con qué datos, qué se descartó y qué quedó sin resolver. |

**Lo que este documento todavía no contesta**, y conviene saberlo antes de leerlo:

- El **precio** es una hipótesis, no una decisión (sección 5, V2). Se decide con las llamadas de la sección 8.
- El **tamaño del mercado ya está medido** (19 de septiembre de 2026): **59,296 restaurantes de servicio completo en el país y 8,142 en la Ciudad de México** — clase SCIAN 722511 de los Censos Económicos del INEGI. La cifra de 736 mil que circula en documentos anteriores es todo el sector de alimentos, taquerías y puestos incluidos.
- **No hay evidencia** de que un menú en 3D suba las ventas. Ver sección 4.

**El detalle técnico no está aquí**: vive en [`docs/mvp/`](mvp/README.md). Si algo de ahí contradice a este documento, manda este documento, porque aquel se escribió antes de la investigación de competencia.

---

## 2. Qué es Carta

### La misión, en tres capas

1. **De dónde nació — la experiencia compartida.** Convertir el menú QR en algo que se vive entre todos: ver, decidir y ordenar juntos los que están sentados a la mesa.
2. **La personalización.** Que la cocina se acomode al comensal: que el menú se ordene según sus gustos y, sobre todo, según lo que no puede comer.
3. **La gestión fácil.** Que sea simple de los dos lados: pedir sin fricción para el comensal, operar sin vueltas para el restaurante.

**En una frase:** *Carta hace que comer fuera sea una decisión compartida y segura: el comensal elige junto a su mesa, sabiendo qué lleva cada platillo. Que además sea personalizada es a dónde va Carta, no lo que hace hoy.*

### A qué restaurantes va dirigida, y a cuáles no

**Sí:** restaurantes de **servicio completo** — mesa, mesero, carta y un ticket que justifique pagar una suscripción mensual.

**No, todavía:** taquerías, fondas, puestos de comida, cafeterías de mostrador y comida rápida. No es un juicio sobre ellos ni una puerta cerrada: el sistema de hoy está pensado alrededor de comensal, mesero, capitán y gestión del restaurante, y esa estructura no existe donde se pide en la barra. **Más adelante se evaluará adaptar Carta a esos giros**, que necesitan otro producto, no el mismo con otro nombre.

### En qué se usa Carta

**No hace falta una computadora.** Todo corre en el navegador del teléfono, y por eso Carta se puede instalar en restaurantes que no tienen equipo de cómputo — que en México son la mayoría.

| Rol | Teléfono | Tableta | Escritorio |
|---|:--:|:--:|:--:|
| Comensal | Sí | Sí | — |
| Mesero | Sí | Sí | — |
| Capitán | Sí | Sí | Sí |
| Dueño o administración | Sí | Sí | Sí |

**El tamaño real, medido:** **59,296 restaurantes de servicio completo en el país y 8,142 en la Ciudad de México** (clase SCIAN 722511 del INEGI, Censos Económicos; 81,518 nacionales si se incluyen marisquerías, clase 722512). El mercado es entre **nueve y doce veces más chico** de lo que decían los documentos anteriores del proyecto, que usaban los 736 mil establecimientos de todo el sector de alimentos.

**Y esa es la buena noticia, no la mala.** Esos mismos censos dicen que la clase 722511 es el 10.2% de las unidades pero el **33.2% de la producción bruta** de toda la industria restaurantera — el primer lugar del sector— con 44.9% de rentabilidad contra 30.9% de la economía nacional. Un restaurante de servicio completo vale en promedio **unas 3.3 veces** lo que vale un negocio promedio del sector. El mercado es más chico y cada cliente es mucho más grande: eso no debilita el caso, lo vuelve defendible, pero obliga a cobrar más de lo que suponía el análisis viejo.

*Advertencia sobre la cifra:* la clase 722511 se llama hoy «a la carta o **de comida corrida**», así que trae fondas adentro. El número real del segmento de Carta es algo menor que 59,296.

### Lo que se defiende hoy, y lo que es horizonte

Esta separación es la parte más importante de la sección.

**Lo que se defiende hoy es la capa 1: la mesa compartida.** Se construye ya, en la V0, y la investigación de mercado confirmó que **nadie más lo hace**: Sunday, Getnet y Yumminn dividen la cuenta *al pagar*; ninguna plataforma revisada permite construirla *al pedir*.

**Y hay un segundo foso que no estaba a la vista: los alérgenos.** La radiografía de OlaClick —el competidor más cercano en modelo de negocio— encontró que su sistema solo guarda **una descripción de texto libre** por platillo, y que su propio blog le recomienda al restaurantero escribir ahí los alérgenos. Construir esa función les costaría poco; **adoptarla les costaría pedirle a cuarenta mil negocios que recapturen su carta entera**. Un foso no es lo que es difícil de construir: es lo que es difícil de adoptar.

**La capa 2, la personalización, es horizonte declarado: no tiene versión comprometida.** Ni la V0, ni la V1, ni la V2, ni la V3 la construyen. Se nombra porque es a donde va Carta, no porque esté prometida para una fecha. Lo mismo vale para el perfil del comensal que viaja entre restaurantes y para la reputación portátil del mesero: son la tesis de largo plazo, no el plan.

**La capa 3, la gestión fácil, llega por partes** y con una advertencia incómoda: hasta que Carta reemplace al punto de venta, al mesero **se le añade** un paso, no se le quita (sección 3).

### La visión

**Que ir a un restaurante sea tan sencillo como elegir una película:** que Carta conozca sus gustos y sus restricciones y le muestre lo mejor para usted, en lugar de darle una lista de cien platillos iguales para todos.

Del lado del restaurante, que la misma plataforma gestione de punta a punta lo que un restaurante conlleva —mesas, personal y productos— y de ahí al **restaurante inteligente**: uno que sabe qué se consume y qué se desperdicia. Con dos compromisos que hoy no tienen mecanismo y por eso se escriben como intención, no como promesa: **Carta Charities** (destinar parte de lo que genere a alimentar a quien no tiene qué comer) y reducir el desperdicio de alimentos, que es lo que un restaurante sí puede medir.

### La categoría

Spotify tiene artistas y oyentes; Airbnb, anfitriones y viajeros. **Carta quiere ser la plataforma de los restaurantes y los comensales.**

Eso exige algo que conviene decir de una vez: una plataforma de dos lados solo existe cuando cada lado le sirve al otro, y eso ocurre cuando **el perfil del comensal viaja entre restaurantes** —entre más restaurantes, mejor le atina; entre mejor le atina, más restaurantes la quieren—. Hoy Carta no hace eso: le sirve al comensal dentro de un restaurante. **Es una herramienta que aspira a ser plataforma, y el paso de una cosa a la otra no está en ninguna versión de este documento.** Escribirlo así evita construir la plataforma antes de tener los dos lados.

Consecuencia práctica: el lado del comensal tiene que ser gratis y sin registro para que crezca, así que el dinero sale del lado del restaurante.

### La seguridad alimentaria no es letra chica

En octubre de 2023, una comensal con alergias severas a los lácteos y a los frutos secos murió de anafilaxia después de cenar en un restaurante del complejo Disney Springs, en Orlando. El forense encontró niveles elevados de ambos en su organismo. Según la demanda que presentó su esposo, ella había advertido repetidamente de sus alergias al personal. El caso se volvió noticia nacional en 2024, cuando la empresa intentó sacarlo de los tribunales alegando que el viudo había aceptado resolver disputas por arbitraje al suscribirse a Disney+, y después desistió de ese argumento.

*Las acusaciones sobre lo que ocurrió esa noche son de la demanda. Lo verificado aquí es que el caso existe y cómo se reportó — [NPR](https://www.npr.org/2024/08/14/nx-s1-5074830/disney-wrongful-death-lawsuit-disney) y [Deadline](https://deadline.com/2024/08/disney-allergy-death-lawsuit-waive-arbitration-1236044426/), consultados el 19 de septiembre de 2026.*

**El menú es información de seguridad, no solo publicidad.** De ahí salen tres compromisos concretos, con dueño y fecha:

| Compromiso | Quién | Cuándo |
|---|---|---|
| **El restaurante firma un documento** donde declara los ingredientes y alérgenos de cada platillo. Carta guarda una copia de ese PDF firmado: es el respaldo de quién dijo qué. | El restaurante firma; Calvin lo archiva | Antes de cargar el menú |
| Los alérgenos se muestran en cada platillo desde la V0. Solo mostrarlos: los filtros inteligentes son horizonte. | Calvin | V0 |
| **La advertencia viaja con la orden.** En la comanda de la mesa, el mesero y los comensales ven marcado cada platillo: «contiene X» o, cuando se pidió sin ese ingrediente, «no debe contener X». La advertencia no vive solo en el menú, donde se olvida. | Calvin | V0 |
| Redactar el texto exacto que lee el comensal en pantalla, y el del documento que firma el restaurante. | Calvin | **Semana 1** del prototipo (sección 6) |
| Si al cerrar la semana 1 ese texto no está redactado, **los alérgenos salen de la V0**. | Calvin | Semana 1 |

Carta nunca promete una garantía que no puede dar: el dato es del restaurante, así se dice en pantalla, y si el menú cambia sin una declaración nueva firmada, los alérgenos se ocultan en lugar de mostrarse desactualizados.

---

## 3. La decisión sobre el punto de venta

### Lo que encontró la investigación

- El competidor real no es una app de reparto: es el **punto de venta que el restaurante ya tiene instalado y paga**.
- **Fudo** vende pedido desde la mesa con carta QR desde **$690 al mes**, con el sistema completo incluido. **Soft Restaurant** tiene un módulo donde el comensal ve el menú, ordena y paga desde su celular; su licencia va de **$799 a $1,099 al mes**.
- De siete sistemas revisados, **solo Fudo (en su plan más caro) y Oracle Simphony** permiten que un programa externo les registre una orden. Parrot solo deja leer; la conexión de Soft Restaurant sirve para descargar el menú, no para recibir órdenes; Wansoft no publica ninguna.

### La decisión

**Carta se construye por módulos, funciona sola sin tocar el sistema del restaurante, y su propuesta de fondo es reemplazar al punto de venta con el tiempo.** Entra por la puerta chica —no le pide al restaurante que cambie nada— y va absorbiendo funciones conforme demuestra valor.

**Sobre integrarse con los sistemas que sí lo permiten:** es una posibilidad, no un compromiso. **Ninguna versión de este documento la incluye.** Si en las llamadas de la sección 8 aparecen restaurantes con Fudo, se evalúa como añadido de la V2. Mientras tanto **no se promete en ninguna conversación de venta**, porque hoy no se puede cumplir en la mayoría de los casos.

### El personal valida, no captura

Esta es la idea que ordena todo el diseño: **la orden nace en el teléfono del comensal y el personal la valida.** El mesero no es un capturista con una pantalla más; es quien confirma, corrige y sirve. Carta recibe el dato de quien lo genera —el comensal— o de otro programa conectado, y el restaurante lo aprueba.

Donde eso se cumple, Carta **quita** trabajo en vez de añadirlo: nadie transcribe lo que alguien ya escribió.

**Dónde no se cumple, y hay que decirlo:** en un restaurante que conserva su punto de venta y cuyo sistema no acepta órdenes externas, alguien sigue teniendo que pasar la orden a ese sistema para poder cobrar y facturar. Ahí la validación convive con una captura, y esa es la fricción que el piloto tiene que medir sin maquillaje. Tres caminos la eliminan, en este orden de preferencia:

1. **Que Carta sea el punto de gestión** y el sistema viejo deje de usarse en mesa (es el destino de la V3).
2. **Que el sistema del restaurante acepte la orden**, como hacen Fudo en su plan alto y Oracle Simphony.
3. **Que la orden llegue impresa** a la comanda, para que nadie la teclee.

Por eso la primera pregunta a cualquier restaurante sigue siendo qué punto de venta usa, y por eso **los minutos extra del mesero se miden desde la primera noche** (sección 9).

---

## 4. Qué vendemos y a quién se lo decimos

Carta tiene tres cosas que ofrecer y no se dicen las tres a la misma persona.

| Público | El mensaje | Por qué ese |
|---|---|---|
| **Comensal** | Vea el platillo antes de pedirlo y armen la orden juntos desde sus teléfonos. | Es lo que se siente en la mesa. El 3D engancha; la orden compartida es lo que hace que valga la pena repetir. |
| **Restaurantero** | Cobre, divida la cuenta y facture sin que el mesero vaya y venga. | Es el dolor que ya tiene todos los días. El 3D no le resuelve nada que lo desvele. *(Este mensaje solo se puede sostener desde la V2.)* |
| **Inversionista o socio** | La orden compartida como puerta de entrada a la plataforma de los dos lados. | Es el único hueco que la investigación encontró libre. Lo que se defendería después —el perfil que viaja— todavía no tiene versión, y eso se dice de frente. |

### Lo que no decimos

- **Ni «+22% en ventas» ni «+25% en postres».** La investigación rastreó ambas: la primera es de un wine bar de Nueva York, no de Bareburger; la segunda salió de un estudio del propio vendedor de la tecnología. La única cifra real de Bareburger es +3%. El estudio universitario que se citaba midió *intención de visitar*, no ventas.
- **Que el menú QR sea el producto.** Es gratis en al menos cinco lugares, incluido un generador que regala Soft Restaurant. Es un gancho, no un negocio.
- **Que Carta se integra con su punto de venta** (sección 3).
- **Que el mercado son 736 mil restaurantes.** Esa cifra del INEGI es de todo el sector de alimentos. El mercado real de Carta son unos **60 mil** restaurantes de servicio completo en el país y unos **8 mil** en la Ciudad de México.
- **Que el 65% de los restaurantes mexicanos ya usa un punto de venta.** Ese dato es de Estados Unidos. En México no existe la medición, y el dato mexicano más cercano apunta al revés: solo el **22.3% de las microempresas** usa siquiera una computadora, y 96 de cada 100 negocios restauranteros son microempresas.

### Cómo gana dinero Carta

**Todo gratis de base, con publicidad.** Comensales y restaurantes pueden usar Carta sin pagar. La publicidad es el piso del negocio, con una condición que no se negocia: **si estorba el momento de pedir, mata justo lo que hace distinta a Carta**. Los formatos que interrumpen quedan descartados por diseño, no por buena voluntad.

**La regla que ordena todo el modelo: Carta nunca toca el dinero.** Si Carta recibiera el pago del comensal para después entregárselo al restaurante, se convertiría en una institución de fondos de pago electrónico según el artículo 22 de la Ley Fintech — lo que exige **$4,410,538 pesos de capital mínimo** y autorización— y operar sin ella son **de 7 a 15 años de prisión** (artículo 124). Por eso el restaurante es siempre el comercio y el cobro va directo a su cuenta. *(Esto es lectura de la ley, no asesoría legal: antes de construir cualquier flujo de cobro tiene que revisarlo un abogado fintech.)*

**Qué se puede y qué no**, revisado el 23 de septiembre de 2026 sobre los textos vigentes de la Ley Fintech, la Ley Federal del Trabajo, la de organizaciones auxiliares del crédito y la ley antilavado:

| Se puede, sin permiso de nadie | Se puede, pero con condiciones | No se puede nunca |
|---|---|---|
| Dividir la cuenta en pantalla · «yo pago lo de él» como reasignación de partidas · sugerir y calcular la propina · mostrar la CLABE del restaurante · mostrar su enlace o código de cobro · aceptar Apple Pay y Google Pay · ser punto de venta e inventario · lealtad que no sea dinero | Crear cobros por monto exacto **con la pasarela del restaurante** y sus credenciales · cuentas conectadas **solo con cargos directos**, con el registro y los contracargos a nombre del restaurante · emitir el CFDI por cuenta suya, con contrato de comisión de por medio · guardar su sello digital con custodia de nivel bancario | Que el dinero toque una cuenta de Carta · monederos, saldos a favor o tarjetas de regalo · que un comensal le pase saldo a otro · CLABE a nombre de Carta · una sola cuenta de comercio para varios restaurantes · retener o repartir propinas · cobrar comisión sobre la propina · propina obligatoria · terminal virtual · adelantos de dinero · cobrar el efectivo por cuenta del restaurante |

**La pregunta de control**, para hacerse en cada decisión de diseño: *¿hay algún momento, aunque sea un segundo, en que Carta le deba dinero a alguien?* Si la respuesta es sí, el diseño está mal.

**Lo que se desbloquea al pagar** — ya con costos verificados detrás de cada renglón:

| Función | Gratis | Al pagar | Por qué se puede cobrar |
|---|---|---|---|
| Menú, 3D, orden compartida y pantalla del mesero | **Sí** | Sí | Es el producto. No se recorta nunca |
| Publicidad en el menú | **Con anuncios** | **Sin anuncios** | Quitarlos cuesta el ingreso publicitario, y es exactamente el motivo de compra que ya funciona en México |
| Mesas atendidas al mes | **Cupo** (referencia: 75) | **Ilimitado** | El tráfico de un restaurante activo son 18 a 90 GB al mes |
| Cobro en efectivo | **Sí** | Sí | No cuesta nada y no se debe limitar |
| Modelos 3D | **10 al mes, calidad estándar** | **Más, con mejor calidad y propiedad plena** | Generarlos cuesta dinero de verdad: alrededor de $10 por platillo en el proveedor más barato |
| Respaldo permanente de los modelos | **No** | **Sí** | Los proveedores de generación borran los archivos a los 3 días. Guardarlos lo paga alguien |
| Cobro con tarjeta | No | Solo para quien no tenga terminal bancaria | **Ojo: a casi nadie le conviene.** Ver abajo |
| **Propiedad plena de los modelos** | Ojo: el nivel gratuito de los generadores entrega licencias que **no** dan propiedad exclusiva | Sí | Es un problema real que hay que resolver antes de prometer que «los modelos son del restaurante» |
| Multisucursal y reportes consolidados | No | Sí | Es la palanca del plan alto |

**Dos reglas de publicidad que vienen de [`Carta_Ideacion_v3.md`](Carta_Ideacion_v3.md) §7 y que aquí se elevan a compromiso:** los anuncios del propio restaurante —sus platillos, sus promociones— **tienen prioridad** sobre cualquier otro, y **nunca se muestra publicidad de un restaurante competidor dentro del menú de otro**. Sin esas dos reglas, la publicidad deja de ser el piso del negocio y se convierte en la razón por la que un restaurante quita Carta de sus mesas.

Ese mismo documento ya define las capas del comensal (anónimo, registrado gratis y Premium a $29 al mes, que quita los anuncios) y los niveles del restaurante (Gratis, Pro y Enterprise). Lo que falta no es la estructura: es el precio y qué cupos incluye cada nivel.

**Los datos son del restaurante.** Las fotos de sus platillos y los modelos que genere le pertenecen; en el nivel gratuito ni siquiera salen de su teléfono. No es solo una postura: es lo que permite que el nivel gratuito no le cueste dinero a Carta.

*Matiz técnico que conviene no maquillar:* el menú y las órdenes **sí pasan por un servidor**, porque sin eso no existe la mesa compartida — cuatro teléfonos no se sincronizan solos. Lo que se queda en el teléfono del restaurantero son **las fotos y los modelos 3D**, que es justo lo caro de guardar. Prometer «nada sale de tu negocio» sería falso; lo cierto es «tus fotos y tus modelos son tuyos y no los guardamos si no nos pagas por respaldarlos».

**La analogía de Telcel es correcta, pero el mecanismo es la ficha de prepago, no el anuncio.** Lo que hay que copiar es el **cupo**: pagos chicos, frecuentes y proporcionales al uso —«tantas mesas al mes por tantos pesos»—, no una mensualidad grande de entrada. Así fue como un país que no podía pagar un teléfono acabó con un teléfono en cada mano.

### Tres cosas que la investigación desmintió, y conviene tragarse ahora

**1. La publicidad no es ganancia: es lo que paga la infraestructura.** Ese es su propósito declarado en Carta — cubrir los servidores mientras el producto se prueba —, y está en medición a partir de cuántos restaurantes se sostiene sola. Con las tarifas publicadas de Google para el rubro de alimentos y bebidas, un restaurante de 40 mesas al día rinde entre **$27 y $405 pesos al mes**. Alcanza para cubrir el tráfico del plan gratuito y para ser un motivo de compra —«págame y te los quito»—, nada más. **Presentarla como línea de ingreso ante un inversionista sería repetir el error de las cifras de realidad aumentada:** un número que suena bien y no resiste que lo abran.

**2. Este modelo ya existe en México y tiene precio puesto.** **OlaClick** ofrece plan gratuito con publicidad en el menú y planes por cupo de pedidos — $200 por 75, $500 por 400, $1,203 ilimitado— y declara más de 40,000 negocios. Eso confirma que el modelo funciona aquí, pero **elimina la novedad y fija el precio de referencia**: Carta no puede cobrar mucho más por lo mismo. El diferencial tiene que seguir donde ya está, en lo gratuito: **la mesa compartida y el 3D**.

Una radiografía posterior matizó esto en dos direcciones. **A favor de Carta:** la clientela mexicana observable de OlaClick son fondas, hamburgueserías, torterías y cocinas ocultas — **no restaurantes de mantel**. No juegan en el mismo segmento. **En contra:** dejaron el menú QR con pedido y comanda **en cero pesos**, así que Carta no podrá cobrar por eso nunca. Su publicidad gratuita, por cierto, resultó ser un solo letrero de su propia marca y no una red de terceros.

Y dos cosas de su letra chica sí son aprovechables: una cláusula establece que el contenido **pasa a ser propiedad de OlaClick**, otra les permite empezar a cobrar por lo que hoy regalan, y hay una reseña pública de un cliente de tres años al que **le recortaron el cupo para forzarlo a pagar más**. Eso le da a Carta un argumento de venta verdadero —*tu carta es tuya*— con la honestidad de reconocer que es un argumento que se copia en un día.

**El riesgo de muerte de Carta no es OlaClick:** es seguir siendo un gasto encima del punto de venta que el restaurante ya paga. Por eso la decisión de la sección 3 —entrar sin tocar nada y aspirar a reemplazar— es la que de verdad importa.

**3. Cobrar con tarjeta por medio de Carta le saldría caro al restaurante.** El Banco de México publica lo que cobran los bancos por giro: a un restaurante le cuestan **1.65% en débito y 2.33% en crédito** con BBVA, mientras que las pasarelas cobran entre **3.39% y 3.59%**. Para un restaurante de 40 mesas al día, pasar el cobro por una pasarela son **unos $5,610 pesos al mes de sobrecosto** — dieciséis veces la mensualidad que Carta pensaba cobrar. Ofrecerlo como si fuera un beneficio quema la relación en la primera llamada. Solo tiene sentido para quien no consigue contrato bancario.

**CoDi queda descartado**, y conviene dejar escrito por qué para que nadie lo vuelva a proponer: es gratis, sí, pero está prácticamente vacío. En todo México se hacen unas **8,200 operaciones al día**; si cada restaurante de servicio completo hiciera un solo cobro diario, sería siete veces todo el sistema nacional. Construir para eso es gastar horas en algo que nadie usa.

### Lo que cuesta operar Carta, y desde cuándo la publicidad lo paga

*Precios validados uno por uno el 23 de septiembre de 2026, con el proveedor de cómputo más barato que hoy se puede contratar y almacenamiento que no cobra por salida.*

| Escala | Infraestructura al mes |
|---|---|
| El piloto, con niveles gratuitos | **$0** |
| Hasta el restaurante 48 | **$244 pesos** |
| Hasta el 500 | **$1,452 pesos** |

**Dos correcciones de precio que conviene conocer.** El plan de servidor que costaba €5.49 **ya no se puede contratar**; el más barato disponible cuesta €11.49, así que el costo base es dos veces y media lo que se suponía. Y los almacenamientos que parecían alternativas baratas —Backblaze y Wasabi— **no sirven para esto**: su salida gratuita está atada a cuánto guardas, y Carta consume **52 veces** lo que almacena; uno de ellos advierte expresamente que ese uso «no encaja» y puede suspender la cuenta. Cloudflare R2 es el único sin condición.

**Google Cloud queda descartado, ahora con su precio verificado de primera mano:** cobra **$0.12 dólares por gigabyte** que sale hacia el comensal, y lo que sale son los modelos 3D, que son el producto. Y con la publicidad en su escenario pesimista, ahí **no hay punto de equilibrio a ninguna escala**: cada restaurante nuevo cuesta $6.78 y rinde $6.51, así que crecer empobrece con uno o con quinientos. *Esto contradice la decisión de hospedaje del paquete técnico [`docs/mvp/`](mvp/README.md), que se escribió antes: manda este documento.*

### ¿Se sostiene sola con anuncios, y aguanta crecer?

Ingreso publicitario por restaurante al mes, según el escenario: **$6.51 pesimista · $95.05 promedio · $1,116.91 optimista.**

| Restaurantes | Costo al mes | Pesimista | Promedio | Optimista |
|---:|---:|---|---|---|
| 1 | $244 | −$237 | −$149 | +$873 |
| 5 | $244 | −$211 | **+$231** | +$5,341 |
| 10 | $244 | −$179 | +$707 | +$10,925 |
| 25 | $244 | −$81 | +$2,132 | +$27,679 |
| 50 | $408 | −$83 | +$4,344 | +$55,437 |
| 100 | $411 | **+$240** | +$9,094 | +$111,280 |
| 250 | $747 | +$880 | +$23,014 | +$278,480 |
| 500 | $1,452 | +$1,802 | +$46,071 | +$557,002 |

**La respuesta corta: sí se sostiene, y no explota al crecer.** La publicidad cubre la infraestructura desde el restaurante **3** en el escenario promedio, el **38** en el pesimista y el **1** en el optimista. El peor hueco de todo el modelo son **$237 pesos al mes**, con un solo restaurante. Y la razón no es que la publicidad rinda bien: es que **la infraestructura cuesta poco y sube en escalones, mientras el ingreso sube en línea recta**.

**El supuesto del que cuelga todo, dicho sin adornos:** no existe públicamente un dato de cuánto paga la publicidad **en México**. El modelo usa el bloque de «Américas» que publica Google —que es el más alto de sus tres regiones, así que aplicarlo a México es optimista, no neutral— y le pone encima una perilla declarada de un cuarto, dos quintos o tres quintos. **Medir eso es lo primero que hay que hacer en el piloto**; hasta entonces, cualquier proyección de ingreso publicitario es una hipótesis con forma de tabla.

**Y el freno de caja sigue en pie:** Google no deposita hasta juntar **$1,200 pesos**. Con pocos restaurantes, el dinero existe en el reporte mucho antes de existir en el banco. La publicidad logra que el nivel gratuito no cueste dinero; **no es caja para el primer año**.

**Dónde pueden ir los anuncios y dónde no.** La política de Google prohíbe anuncios en pantallas de salida, agradecimiento o error; el criterio propio de Carta prohíbe estorbar el momento de pedir. Entre las dos cosas queda: **sí** en la carta y en la ficha del platillo; **no** en el carrito, ni en «tu pedido va a la cocina», ni en la cuenta, ni en «mesa pagada», ni en una pantalla de error.

**Y una pieza que habría que construir antes de diciembre si se quiere publicidad desde el piloto:** una **carta pública por restaurante** —una página con sus platillos, fotos y modelos, sin sesión de mesa—. Google necesita algo que revisar antes de aprobar, tarda de dos a cuatro semanas, y esa página es además el único lugar donde los anuncios están permitidos. De paso le da al restaurante presencia en buscadores. Son pocas horas, pero **son horas que hoy no están en las doce semanas**.

---

## 5. Alcance por versión

La regla: **una versión no termina cuando el autor se siente satisfecho, sino cuando pasa una prueba que cualquiera puede presenciar.**

### V0 — La cena que funciona · diciembre de 2026

**Dónde ocurre:** es una **demostración montada** —cuatro teléfonos en una mesa prestada o en casa—, no en un restaurante en operación. Así la fecha no depende de que alguien más abra la puerta.

**Qué entra**

- Entrar escaneando el QR de la mesa, sin descargar nada y sin registrarse.
- Menú con los platillos en 3D vistos desde el teléfono.
- **Alérgenos visibles en cada platillo** (con la condición de la sección 2).
- **Sesión de mesa compartida:** varios comensales, cada uno en su teléfono, agregando a una sola orden y viendo en vivo lo que agregan los demás. *En vivo significa que lo que uno agrega aparece en los demás teléfonos en **3 segundos o menos**.*
- **Sesión cerrada, con mecanismo y no con buenos deseos:** el QR abre la mesa, pero para unirse hay que teclear un **código de cuatro dígitos** que solo aparece en el teléfono de quien abrió la mesa y en la pantalla del mesero. El código es distinto en cada sesión, hay tope de **ocho dispositivos** por mesa, la sesión caduca a los 90 minutos y se cierra al confirmar la orden. Fotografiar el QR o reenviar el enlace por WhatsApp no alcanza para entrar.
- Confirmar la orden entre todos.
- **Pantalla del mesero:** la orden le llega, la marca como recibida y como servida.

**Qué NO entra:**

- Pagos, división de cuenta, propina y facturación (CFDI).
- Back-office, analítica y reportes.
- Cuentas de usuario, entrar con Google o Apple, perfiles y Carta+ *(el plan de pago para comensales que aparece en documentos anteriores; no existe en este plan)*.
- Recomendaciones y filtros dietéticos inteligentes.
- Marketplace de artistas 3D · importar el menú desde un PDF · app de capitán · integración con el punto de venta.

**Quién carga el menú:** Calvin, a mano. No hay panel de administración hasta la V2.

**Criterio de salida:** cuatro teléfonos distintos arman una orden en la misma mesa; el mesero la recibe y la marca como servida; con el menú que se vaya a usar de verdad y los alérgenos a la vista. Se graba en una sola toma, sin cortes.

**Presupuesto:** 12 semanas a **6 horas por semana = 72 horas** de trabajo, y unos **$1,500 pesos en total** (tres meses a $500 pesos) para modelos 3D, servidor y herramientas. *Todas las cantidades de este documento están en pesos mexicanos.* Lo que no quepa ahí, no entra.

### V1 — La noche real · primer trimestre de 2027

**Qué entra, además de la V0:** llamar al mesero, estados de la orden visibles para la mesa, y un plan de emergencia en papel para cuando algo falle a media cena. Y algo que en una mesa real es obligatorio: **el mesero puede ordenar por un comensal que no traiga teléfono** — o por toda la mesa, si hace falta. Nadie se queda fuera por no tener celular, por no tener datos o por traerlo sin batería.

**Qué NO entra:** pagos. Se cobra como se cobra hoy en ese restaurante.

**Requisito previo:** un restaurante que acepte y saber **qué punto de venta usa** antes de empezar.

**Dónde hacer el piloto.** Tres plazas posibles, cada una con su costo:

| Plaza | A favor | En contra |
|---|---|---|
| **Guadalajara** | Es donde vive el autor: puede estar en el restaurante el mismo día, sin gastos de viaje. Jalisco es el tercer estado del país en establecimientos de alimentos (48,957) | **No tiene contacto ahí:** sería tocar puerta fría con un producto que nadie ha visto funcionar |
| **Ciudad de México** | Tiene contactos que lo pueden presentar. 8,142 restaurantes de servicio completo, y cuatro alcaldías concentran el 53%: Cuauhtémoc (1,944), Benito Juárez (1,041), Miguel Hidalgo (828) y Coyoacán (538). **Benito Juárez es la de mejor puntería:** ahí uno de cada tres restaurantes es de servicio completo, contra uno de cada siete en el resto de la ciudad | Cada visita es un viaje, y el piloto no es una visita |
| **Cancún** | Ticket más alto, comensal turista y sin prisa, y el menú en varios idiomas rinde más. Es donde el 3D se luce | La plaza más cara y lejana de atender, y en temporada el personal rota tanto que entrenar al mesero se vuelve trabajo repetido |

**Decisión del 20 de septiembre de 2026: se empieza por Ciudad de México.** En Guadalajara no hay con quién empezar, y tocar puerta fría con un producto que nadie ha visto funcionar es la forma más lenta de conseguir el primer sí. En la Ciudad de México hay un contacto que puede presentar, y una presentación vale más que el ahorro en viajes.

**Guadalajara entra después**, cuando Carta ya tenga una noche real que enseñar — y para entonces el argumento de venta será el piloto, no la promesa. **Cancún** al final, cuando el producto aguante una noche sin que nadie lo cuide.

**Criterio de salida:** diez mesas reales atendidas con Carta, con el ticket comparado contra mesas del mismo restaurante sin Carta, y la opinión del mesero por escrito — incluida la pregunta incómoda de si la doble captura le estorbó.

### V2 — Lo que ya se puede cobrar

**Qué entra:** pago en la mesa, división de cuenta, propina, CFDI, y un panel mínimo donde el restaurante cargue su propio menú. **Candidata, no comprometida:** la integración con Fudo, si las llamadas muestran que vale la pena.

**Cada restaurante configura lo que acepta.** Si no cobra con tarjeta, esa opción no aparece en el teléfono del comensal, y se le avisa **desde que abre el menú** —no cuando ya pidió— que ahí solo se paga en efectivo. Lo mismo con transferencia o con cualquier otro medio. México está lleno de restaurantes que funcionan distinto entre sí; el producto se adapta a ellos en lugar de exigirles que se parezcan a un modelo único.

**Cómo se cobra, ya con el diseño resuelto y revisado contra la ley.**

**Primero, la versión sin riesgo: Carta no cobra.** Muestra la cuenta, **la divide en pantalla**, permite que alguien se lleve la parte de otro —como reasignación de partidas, sin que el dinero pase entre comensales—, sugiere la propina, y muestra la CLABE y el enlace de cobro del propio restaurante. El mesero cobra con la terminal que ya tiene. **Son unas 76 horas de trabajo, cero pesos de costo y cero exposición legal.** No caben en las doce semanas de diciembre: son de esta versión.

**Después, si se quiere cobrar dentro de Carta:** cuentas conectadas con **cargos directos** —Stripe Connect o el esquema equivalente de Mercado Pago—, donde el comercio es el restaurante, el registro y los contracargos son suyos, y **la comisión de plataforma se deja en cero**. Esa última decisión es deliberada: así la pasarela le factura directo al restaurante, Carta no cobra nada por en medio y **nunca tiene un incentivo para acercarse al dinero**. Son otras 140 horas y una opinión legal firmada antes de escribir la primera línea.

**El hallazgo que cambia la propuesta, y duele:** todas las pasarelas cobran un porcentaje **más una cuota fija por transacción**; la terminal bancaria cobra solo porcentaje. Eso significa que **dividir la cuenta —la función estrella de Carta— es justo lo que más castiga la tarifa**. Una cuenta de $500 partida en cuatro pasa de $21 a **$30** con una pasarela y a **$33** con otra, mientras la terminal del restaurante se queda en $11.65. Con la mitad de las cuentas divididas, el sobrecosto mensual sube de $5,610 a **$8,310 pesos**. Conclusión: **dividir en pantalla sí; cobrar cada parte por separado con tarjeta, no** — que la mesa pague junta en la terminal y se repartan entre ellos.

**Sobre la factura:** Carta sí puede emitir el CFDI por cuenta del restaurante, pero requiere un contrato de comisión y una marca especial en el comprobante que el SAT tiene prevista para eso. Y una aclaración importante que evita un error caro: **esa regla es fiscal, no financiera.** Autoriza a facturar por cuenta de alguien; **no autoriza a recibir su dinero.** El argumento de «somos comisionistas de cobranza, luego podemos cobrar» es falso y es el que termina en proceso penal.

**Al restaurante sin terminal** se le recomienda cobrar con el propio celular —existe en México desde marzo de 2026 con Clip y Mercado Pago—, pero **Carta no lo integra**: exige una aplicación nativa con permiso de Apple y no funciona desde el navegador.

**Hipótesis de precio** — a validar con las llamadas, no decidida:

| Camino | Precio | Apuesta |
|---|---|---|
| **Complemento** | $199 a $349 al mes | Tan barato que el dueño lo aprueba solo, sin comité. Pelea contra una casilla que el punto de venta ya trae incluida. |
| **Reemplazo** | $690 a $1,100 al mes | El precio del sistema completo. Solo es honesto cuando Carta cobre, facture y mande comandas a cocina, o sea en la V3. |

El punto medio es el peor lugar: caro para ser un añadido, incompleto para ser el sistema.

**Criterio de salida:** un restaurante paga por Carta dos meses seguidos, por su voluntad.

### V3 — El reemplazo del punto de venta

**Qué entra:** comanda a cocina, inventario, cortes de caja, reportes fiscales.

Esta es la secuencia que el dueño describe y conviene dejarla escrita en su orden: **primero el menú inteligente, después la gestión del menú para el restaurante, y solo al final el inventario y el punto de venta, como agregados.** Carta no nace siendo un punto de venta; llega a serlo si el restaurante la deja.

**Regla:** no se abre si la V2 no demostró que el restaurante se queda. Es un producto distinto, con años de trabajo.

### Lo que no tiene versión, y por qué

La personalización, el perfil del comensal que viaja entre restaurantes, la reputación portátil del mesero, Carta Charities, el marketplace de artistas 3D y el **modo sin conexión** —que Carta funcione aunque se caiga el internet y sincronice al volver, valioso donde la señal es mala— **no están comprometidos en ninguna versión**. Son el horizonte de la sección 2. Cada uno necesita algo que hoy no existe: varios restaurantes funcionando, dinero entrando o ambos.

---

## 6. El prototipo de diciembre

### Lo que ya existe y se reutiliza

El prototipo navegable de 35 pantallas (el diseño y los flujos ya están resueltos; no se rediseña nada), el sistema de diseño completo, el esqueleto del backend y las decisiones de arquitectura ya documentadas.

### Lo que hay que construir

1. **El motor de la mesa compartida** — la única pieza que nadie más tiene y la que más horas pide.
2. El menú con el visor 3D funcionando en teléfono.
3. La pantalla del mesero.
4. La carga del menú.

### La prueba de la semana 1: cuánto cuesta un platillo en 3D

La idea era que los modelos se generaran con inteligencia artificial **en el teléfono del propio restaurantero**, para que el nivel gratuito no costara nada. La investigación del 19 de septiembre de 2026 encontró que **eso todavía no existe**: no hay ningún modelo generativo de foto a 3D que corra dentro de un teléfono. El más rápido del mercado tarda medio segundo, pero necesita una tarjeta gráfica de escritorio con 7 GB de memoria de video.

Lo que **sí** corre en el teléfono hoy son dos cosas, y ninguna es generación:

- **La fotogrametría de Apple** (Object Capture, de iPhone 12 Pro en adelante): procesa en el propio aparato y entrega un modelo usable, pero exige tomar decenas de fotos dando la vuelta al platillo, con buena luz. Es gratis y es trabajo.
- **Escaneo por splats** (Scaniverse y similares): también local, pero no entrega el formato que un menú web necesita, y convertirlo pierde calidad.

Y en la nube, la generación cuesta alrededor de **$10 pesos por platillo** en el proveedor más barato. Su nivel gratuito entrega 10 modelos al mes **con una licencia que no los vuelve propiedad exclusiva del restaurante** — lo cual choca de frente con la promesa de que los modelos son suyos, y hay que resolverlo antes de prometer nada.

**Dos topes técnicos que no se negocian:** textura de 2048 × 2048 y 100,000 triángulos. Arriba de eso, el modelo ya no carga bien en un celular de gama media por más que alguien pague.

**Qué hace la semana 1, entonces:** convertir **un** platillo real por los dos caminos —fotogrametría en iPhone y generación en la nube— y anotar de cada uno cuánto tiempo costó, cuánto dinero, cuánto pesa y si se ve presentable. Con esos cuatro números se decide qué va en el nivel gratuito. La fecha no se mueve: lo que se ajusta es cuántos platillos llevan 3D.

**Regla de corte:** si el menú completo no cabe en las 72 horas ni en los $1,500, el menú se muestra **completo igual**, con 3D en los platillos que alcancen y fotografía en el resto.

### El menú que se va a usar

Se le pide permiso por escrito al restaurante del contacto. **Si no hay permiso, se usa «La Ceiba»**, el restaurante ficticio del prototipo: el repositorio es público y no se publica la marca ni el menú de un negocio real sin su consentimiento.

### Qué tiene que poner el restaurante (ficha de adopción)

Esto es lo que hay que contestarle a un restaurantero cuando pregunte «¿y yo qué tengo que hacer?». En V0 y V1 **el restaurante no paga nada**.

| Qué se necesita | Quién lo pone |
|---|---|
| Internet en el comedor | El restaurante |
| Un teléfono o tableta para el mesero | El restaurante (o Calvin presta uno en el piloto) |
| Los códigos QR de las mesas, impresos | Calvin los entrega listos para imprimir |
| El menú con precios y alérgenos, aprobado por escrito | El restaurante lo aprueba; Calvin lo carga |
| Fotos de los platillos y sus modelos 3D | Calvin, sin costo para el restaurante en V0 y V1 |
| Quince minutos para explicarle al mesero | El restaurante |
| **En la V1: el reporte de ventas de las mesas del piloto.** Sin eso no se puede comparar el ticket con y sin Carta, que es la medición más importante del proyecto | El restaurante lo comparte |
| Solo si se activa el plan B del riesgo 1: una impresora de tickets | El restaurante. **No está en el paquete básico**; se evalúa en la V1 |

**Pendiente honesto:** quién paga las fotos y los modelos 3D cuando Carta deje de ser un piloto. Es el costo de adopción real y hoy no está en ningún cálculo.

### Si se cae el internet durante la demostración

La V0 se graba. Antes de grabar se prueba el mismo montaje dos veces, y se tiene a la mano un punto de acceso desde un teléfono. Si aun así se cae, se graba otro día: la V0 no se da por buena con una toma editada.

### Ritmo de las 12 semanas

Las diez llamadas a restauranteros ocupan unas 10 de las 72 horas y van en las semanas 7 a 9, cuando el trabajo es más tolerante a las interrupciones. No van antes a propósito: las semanas 4 a 6 son las del motor de la mesa compartida, la pieza más difícil del proyecto, y no se parten.

| Semana | Qué se logra |
|---|---|
| 1 | Medir el costo de un platillo en 3D. Redactar el texto de alérgenos y definir quién lo respalda. Decidir el menú y pedir el permiso. |
| 2 | Menú en el teléfono con el visor 3D. |
| 3 | Menú terminado, con datos reales y alérgenos a la vista. |
| 4–5 | El motor de la mesa compartida: varios teléfonos, una orden, en vivo y con sesión cerrada. Las dos semanas más pesadas, sin interrupciones. |
| 6 | Mesa compartida terminada. **Es la señal de alarma del riesgo 5:** si aquí no está en pie, se recorta o se mueve la fecha. |
| 7 | Pantalla del mesero. **Tres llamadas a restauranteros.** |
| 8 | Ciclo completo de la orden. **Cuatro llamadas.** |
| 9 | Unir todo de punta a punta. **Tres llamadas** (van 10). |
| 10 | Vaciar lo aprendido en las llamadas: precio y objeciones. Producir los modelos 3D que falten. |
| 11 | Prueba con cuatro teléfonos reales y correcciones. |
| 12 | Grabar la toma única. Si algo sale mal, aquí está el margen para volver a grabar. |

**Dónde está el margen.** No hay una semana vacía, y las doce semanas desde hoy caen a mediados de diciembre. El margen real es la regla de corte: si el calendario se atrasa, **se recortan modelos 3D**, nunca la mesa compartida ni los cuatro teléfonos.

---

## 7. Riesgos

Ordenados por cuál tumba el proyecto primero, no por gravedad: el riesgo 2 es el más grave de todos, y por eso es el único cuyo control es previo y no una reacción.

| # | Riesgo | Cómo se nota a tiempo | Qué se hace |
|---|---|---|---|
| 1 | **El mesero rechaza Carta por la doble captura.** El diseño lo ataca de frente —el personal **valida**, no captura (sección 3)— pero el riesgo sigue vivo en todo restaurante que conserve un punto de venta que no acepta órdenes de fuera. | En la V1, el mesero tarda, se queja o lo abandona después de tres mesas. | Medir los minutos extra por orden desde la primera noche. Si estorba, hay dos salidas y ninguna es gratis: buscar restaurantes con Fudo —lo que obliga a construir esa integración, hoy no comprometida— o mandarle la comanda impresa, lo que exige una impresora de tickets que no está en el paquete básico (ficha de adopción, sección 6). |
| 2 | **El dato de alérgenos es incorrecto y alguien se enferma.** | No hay señal tardía: por eso el control es previo. Un platillo sin alérgenos declarados, o un menú que cambió y nadie avisó. El restaurante **firma un documento** declarando ingredientes y alérgenos por platillo, y Carta guarda esa copia: así hay respaldo de quién dijo qué. La advertencia **viaja en la comanda** —«contiene X» o «no debe contener X»— y la ven el mesero y los comensales, no solo el menú. La pantalla dice de quién es el dato. Si el menú cambia sin declaración nueva, los alérgenos se ocultan. Si el texto no está listo en la semana 1, salen de la V0. |
| 3 | **El nivel gratuito no se convierte en dinero.** Como Carta es gratis de base con publicidad, el riesgo ya no es que nadie entre: es que nadie pague por lo de arriba y que la publicidad rinda pesos al mes en lugar de miles. | En las llamadas nadie encuentra por qué pagaría, y el cálculo de ingreso publicitario por mesa atendida sale en pesos. | Mover la palanca de qué queda del lado gratuito: el cobro con tarjeta y el respaldo de los modelos son las dos que valen. Si aun así no cierra, decirlo: Carta sería una gran pieza de portafolio y no un negocio. |
| 4 | **La mesa compartida es una solución sin problema.** | Los comensales dicen «pedimos con el mesero y ya». En la V1, casi ninguna mesa conecta más de un teléfono. | La V1 lo mide directo. Si no la usan, el eje del proyecto cambia. |
| 5 | **Las 72 horas se evaporan.** | Al terminar la semana 6, el motor de la mesa compartida no está en pie. | Recortar modelos 3D con la regla de corte, o mover la fecha. **Los cuatro teléfonos no se negocian:** son el criterio de salida y lo único que prueba el diferenciador. Tampoco se recorta la mesa compartida. |
| 6 | **Los modelos 3D cuestan más de lo previsto.** | La medición de la semana 1. | La regla de corte de la sección 6. |
| 7 | **El 3D no sube el ticket.** No hay evidencia pública de que lo haga. | La V1 compara el ticket con y sin Carta. | Si no sube, el 3D pasa a ser gancho de marketing y deja de justificar precio. |
| 8 | **Un competidor lo hace primero.** Fudo o Soft Restaurant podrían añadir orden compartida. | Revisar cada tres meses sus páginas de novedades. | No se evita; solo se llega antes. Es un argumento más para no distraerse con back-office y analítica. |
| 9 | **El proyecto compite con la vida del autor.** | Dos semanas seguidas sin avanzar. | Recortar alcance, no abandonar. Una versión pequeña terminada vale más que una grande a medias. |
| 10 | **Lo legal y fiscal aparece de golpe en la V2.** Cobrar obliga a CFDI, tratamiento de propinas y aviso de privacidad. Y hay una raya penal: si Carta **guardara** el dinero del comensal, aunque fuera un minuto, necesitaría autorización como institución de fondos de pago electrónico —$4.4 millones de capital mínimo— y operar sin ella son **de 7 a 15 años de prisión**. Está evitado por diseño, no por suerte: el restaurante siempre es el comercio. | Al tocar el primer peso real. | Consultar con un contador antes de construir cobros. Ya está resuelto el plazo de la factura global: **24 horas** después del corte, no 72 — regla 2.7.1.21 de la Resolución Miscelánea Fiscal 2026. Con ese plazo, el cierre no puede depender de que alguien se acuerde de hacerlo a mano. |

---

## 8. Preguntas que solo responden los restauranteros

Van en las semanas 2 a 5 del calendario, unas diez llamadas. Cada una desbloquea una decisión.

| Pregunta | Qué decide |
|---|---|
| ¿Qué punto de venta usa y qué versión? | Si Carta puede integrarse o el mesero capturará dos veces. Es la primera pregunta, no la última. |
| ¿Cuánto paga al mes por su sistema, con todo y módulos? | El presupuesto real y contra qué se compara Carta. |
| Si su sistema ya trae menú QR con pedido desde la mesa, ¿lo tiene prendido? ¿Por qué sí o por qué no? | **La pregunta más valiosa.** Si ya existe y nadie lo usa, hay que entender qué lo frena: el mesero, el comensal, la cocina o el dueño. |
| ¿Quién pierde si el comensal ordena solo? | La objeción que hunde proyectos: la propina del mesero y su papel vendiendo el platillo caro. |
| ¿Cuánto vale que el comensal vea el platillo en 3D antes de pedirlo? ¿Lo pagaría aparte de su sistema? | Si el 3D sostiene un precio o es un adorno. |
| ¿Quién fotografiaría los platillos y quién lo paga? | El costo de adopción real. |
| ¿Cómo cobra hoy en la mesa y qué tan doloroso es? | Si el cobro es el verdadero gancho de venta. |
| ¿Cuántas cuentas al día le piden factura y cómo la genera? | Si el CFDI es requisito u oportunidad. |
| ¿Sus comensales dividen la cuenta? ¿Cómo lo hacen hoy? | Valida o mata la mesa compartida. |
| ¿Cuál es su ticket promedio y cuántas veces rota una mesa al día? | No existe dato público mexicano; se construye con estas llamadas. Para enmarcar la conversación: los hogares mexicanos gastan **$1,299 al mes** comiendo fuera —su gasto individual más grande— y los de la Ciudad de México gastan 39% más que el promedio del país. |
| ¿Qué pasó la última vez que cambió de tecnología? | El costo real de cambiar y la desconfianza acumulada. |

---

## 9. Cómo se mide el éxito

| Versión | Qué se mide | Contra qué se compara |
|---|---|---|
| **V0** | Se logra o no: cuatro teléfonos, una orden, el mesero la sirve, grabado en una toma. | Nada. Es binario. |
| **V1** | Mesas que escanean · mesas que conectan más de un teléfono · órdenes confirmadas · ticket promedio · **minutos extra del mesero por orden** · incidencias por noche. | Mesas del mismo restaurante, mismos días de la semana, sin Carta. |
| **V2** | Que el restaurante pague dos meses seguidos · órdenes pagadas dentro de Carta · facturas emitidas solas. | Lo que el restaurante ya paga por su sistema actual. |

**Sobre las metas publicadas.** Las cifras del README del repositorio (40% de escaneo, 60% de activación de 3D, +8% de ticket) son **hipótesis que nadie ha probado**, no promesas. Como no existe evidencia pública independiente de que un menú 3D suba el ticket, la medición de la V1 sería la primera seria que se publique — si se hace con grupo de control y en el mismo restaurante.

---

## 10. Glosario

| Término | Qué es |
|---|---|
| **Punto de venta (POS)** | El sistema con el que el restaurante cobra, manda comandas a cocina y saca reportes. |
| **Fudo, Soft Restaurant, Parrot, Wansoft, Oracle Simphony** | Los puntos de venta que usan los restaurantes en México. Los dos primeros ya venden menú QR con pedido desde la mesa. |
| **Sunday, Getnet, Yumminn** | Plataformas de pago en la mesa: el comensal escanea, divide la cuenta y paga. Ninguna permite *armar* la orden juntos. |
| **Bareburger** | Cadena de hamburguesas de Nueva York, usada durante años como el caso de éxito del menú en AR. Sus cifras no resistieron la verificación. |
| **CFDI** | La factura electrónica obligatoria en México. Todo restaurante debe emitirla a quien la pida, y una factura global por el resto. |
| **INEGI** | El instituto de estadística del gobierno mexicano. |
| **AR / 3D** | Ver el platillo en tres dimensiones sobre la mesa, con la cámara del teléfono, sin instalar ninguna aplicación. |
| **La Ceiba** | El restaurante ficticio que usa el prototipo para las demostraciones. |
| **Claude Code** | La herramienta de inteligencia artificial con la que Calvin construye el proyecto. |

---

## 11. Dónde está todo lo demás

| Qué | Dónde |
|---|---|
| La competencia real, con fuentes y fechas | [`docs/research/2026-09-19-competencia-real-mexico.md`](research/2026-09-19-competencia-real-mexico.md) |
| Requisitos, diseño técnico, decisiones, modelo de datos y API — **desalineado:** se escribió antes de septiembre de 2026 y su decisión de hospedaje (Google Cloud) quedó descartada por el costo de salida de los modelos 3D | [`docs/mvp/`](mvp/README.md) |
| Visión original, modelo de negocio y fases | [`docs/Carta_Ideacion_v3.md`](Carta_Ideacion_v3.md) |
| Análisis de mercado anterior — **sus secciones 4, 5 y 6 contienen supuestos contradichos** por la investigación | [`docs/Carta_Market_Analysis.md`](Carta_Market_Analysis.md) |
| Sistema de diseño | [`docs/Carta_Design_System.md`](Carta_Design_System.md) |
| Prototipo navegable de 35 pantallas | [`prototipo/`](../prototipo/README.md) · [en vivo](https://klvinlopez.github.io/carta/prototipo/) |
| Video de lanzamiento | [`marketing/video/`](../marketing/video/README.md) |
| Sitio público del proyecto | https://klvinlopez.github.io/carta/ |
