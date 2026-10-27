# Huecos abiertos: segundo pase de investigación

**Fecha:** 19 de septiembre de 2026
**Alcance:** cerrar los huecos que dejó [`2026-09-19-competencia-real-mexico.md`](2026-09-19-competencia-real-mexico.md), con el segmento ya precisado por el dueño del producto.
**Segmento (precisión nueva):** Carta se dirige a **restaurantes de servicio completo** — mesa, mesero, carta y ticket que justifique una suscripción mensual. **No** a taquerías, fondas, puestos, cafeterías ni comida rápida. Piloto en Ciudad de México.

**Cómo leer las marcas:**

- **[VERIFICADO]** — leído directamente en la fuente primaria, en la fecha indicada.
- **[ESTIMACIÓN]** — cálculo o inferencia. Se dice siempre de quién es y sobre qué datos.
- **[NO ENCONTRADO]** — se buscó y no existe fuente pública. No se inventó ninguna cifra.

**Nota de seguridad:** ninguna de las páginas ni documentos consultados contenía texto dirigido a un agente automático ni instrucciones para ejecutar acciones. Todo lo leído se trató como dato, no como instrucción.

**Nota de método (importante para futuras rondas):** la primera ronda no pudo leer los PDF del INEGI y los dio por ilegibles. La causa real es que **el INEGI publica sus estudios como PDF cifrados** (AES-256 y AES-128, con contraseña de usuario vacía y permisos restringidos). Se descifraron localmente y se extrajo su texto. Por eso este documento tiene cifras oficiales que la primera ronda marcó como inexistentes. **Los PDF del INEGI no son un callejón sin salida.**

---

## 1. Resumen: qué se cerró y qué sigue abierto

### Cerrado

| # | Hueco | Resultado |
|---|---|---|
| 1 | **Tamaño real del mercado** | **Cerrado con dato censal.** Los restaurantes de servicio completo (clase 722511) son **59,296 en todo el país** y **8,142 en la Ciudad de México** (Censos Económicos 2019). Eso es **10.2 %** del universo de 581,530 que la primera ronda trataba como si fuera todo el mercado. |
| 3 | **Plazo de la factura global** | **Cerrado y resuelto la contradicción.** Son **24 horas**, y la regla es la **2.7.1.21** de la RMF 2026 (no la 2.7.1.24). Se transcribe el texto exacto del Diario Oficial. |
| 5 | **Precios y comisiones** | **Cerrado.** Mercado Pago Point: **3.5 % + IVA** [VERIFICADO]. Parrot, Rappi, DiDi Food y Getnet: **no lo publican** — verificado hoy, uno por uno. |
| 6 | **Restaurantes por zona de piloto** | **Cerrado con dato oficial por alcaldía.** Cuauhtémoc 1,944 · Benito Juárez 1,041 · Miguel Hidalgo 828 · Coyoacán 538. Las cuatro juntas son el **53 %** de los restaurantes de servicio completo de la ciudad. |

### Parcialmente cerrado

| # | Hueco | Resultado |
|---|---|---|
| 2 | **Ticket promedio** | **No existe y sigue sin existir** un ticket promedio oficial mexicano. Se descartó a Alsea como sustituto: **no publica ticket en pesos**, solo variaciones porcentuales. Lo que sí hay y sirve: el gasto de los hogares de la ENIGH y el valor agregado por persona ocupada de los Censos Económicos. Son aproximaciones, no el dato. |
| 4 | **Penetración de punto de venta** | **No existe fuente mexicana** que mida penetración de software de punto de venta en restaurantes. Se dice así, sin rellenar con cifras de Estados Unidos. Pero sí apareció un dato oficial mexicano que hace insostenible el 65 %/78 % que usa el análisis actual: **solo 22.3 % de las microempresas mexicanas usa siquiera una computadora**. |

### Sigue abierto

1. **El conteo del DENUE al día de hoy, por clase de actividad.** El DENUE publica 740,231 unidades de la rama 7225 a mayo de 2026, pero **su desglose por clase (722511) no se publica en ninguna tabla web**. Solo se obtiene con la API del DENUE (requiere token de registro) o descargando el directorio completo. Se explica abajo cómo hacerlo.
2. **El corte por colonia** (Roma, Condesa, Polanco). El INEGI llega hasta alcaldía en sus publicaciones. La colonia sí está en los registros del DENUE, pero no en tablas publicadas.
3. **El ticket promedio real.** No hay dato. Se construye con el piloto.
4. **La comisión de Getnet.** No la publica. El 2.9 % que circula sigue viniendo de un comunicado de 2023.

---

## 2. Hueco 1 — El tamaño real del mercado

### 2.1 Primero, una corrección de nombre que cambia el análisis

El encargo pedía aislar la clase **722511 "Restaurantes con servicio de preparación de alimentos a la carta o de especialidad"**. Ese **no es el nombre vigente**. Según el SCIAN 2023 del INEGI, la clase 722511 se llama hoy:

> **722511 — Restaurantes con servicio de preparación de alimentos a la carta o de comida corrida**

"De especialidad" es la redacción del SCIAN 2007. Hoy dice **"comida corrida"**. Esto no es un detalle de nomenclatura: significa que **las fondas de menú del día están contadas dentro de la misma clase que los restaurantes a la carta**, y el INEGI no las separa. Es decir: **aun la cifra más ajustada que se puede obtener con datos públicos sigue incluyendo negocios que el dueño del producto quiere excluir.** El número real de Carta es menor que 59,296 y no se puede medir con fuentes públicas.

La definición oficial de la clase sí confirma que es el segmento correcto en lo demás — describe servicio de mesa con personal:

> "Unidades económicas (restaurantes) dedicadas principalmente a la preparación de alimentos y bebidas para su consumo inmediato en las instalaciones del restaurante. [...] preparan y sirven los alimentos y bebidas en el mismo momento en que lo ordena el cliente de acuerdo con un menú y atendiendo instrucciones específicas (a la carta), o preparan una variedad de platillos diariamente y el cliente elige el de su preferencia [...] **Los alimentos y bebidas le son servidos al cliente por personal de la unidad económica.**"
> — INEGI, *Conociendo los servicios de preparación de alimentos y bebidas*, 2023. [VERIFICADO]

### 2.2 El universo completo, y qué se incluye y qué se excluye

El sector se organiza así:

- **Subsector 722** — Servicios de preparación de alimentos y bebidas
  - **Rama 7223** — Servicios de preparación de alimentos por encargo (banquetes, comedores industriales, unidades móviles)
  - **Rama 7224** — Centros nocturnos, bares, cantinas y similares
  - **Rama 7225** — Servicios de preparación de alimentos y bebidas alcohólicas y no alcohólicas ← **aquí están los restaurantes**

La cifra de 736,367 (hoy 740,231) que usa el análisis actual es **la rama 7225 completa**. Dentro de ella hay nueve clases, y solo dos corresponden al producto:

| Clase SCIAN | Nombre oficial | Unidades (CE 2019) | % | ¿Mercado de Carta? | Por qué |
|---|---|---:|---:|---|---|
| **722511** | Restaurantes con servicio de preparación de alimentos **a la carta o de comida corrida** | **59,296** | **10.2 %** | **Sí — es el núcleo** | Servicio de mesa, personal que sirve, carta. Es la definición literal del segmento. *Advertencia: incluye fondas de comida corrida.* |
| **722512** | Restaurantes con servicio de preparación de **pescados y mariscos** | **22,222** | 3.8 % | **Sí — hay que incluirla** | Mismo modelo: mesa, mesero, carta y ticket alto. El INEGI la separa por especialidad de cocina, no por formato de servicio. Excluirla dejaría fuera marisquerías que son exactamente el cliente de Carta. |
| 722513 | Antojitos | 125,524 | 21.6 % | No | Es el formato de fonda y antojería. Sin carta ni ticket que sostenga una mensualidad. |
| 722514 | Tacos y tortas | 122,757 | 21.1 % | No | Taquerías. Excluido explícitamente por el dueño del producto. |
| 722515 | Cafeterías, fuentes de sodas, neverías, refresquerías | 69,599 | 12.0 % | No | Cafeterías. Excluido explícitamente. |
| 722516 | Restaurantes de **autoservicio** | 8,550 | 1.5 % | No | El comensal se sirve solo. No hay mesero ni orden en mesa: el producto no aplica. |
| 722517 | Pizzas, hamburguesas, hot dogs y pollos rostizados **para llevar** | 60,939 | 10.5 % | No | Comida rápida. Excluido explícitamente. |
| 722518 | Otro tipo de alimentos **para llevar** | 55,455 | 9.5 % | No | Sin consumo en mesa. |
| 722519 | Otros alimentos para consumo inmediato | 57,188 | 9.8 % | No | Puestos, gelatinas, tamales, elotes. |
| | **Total rama 7225** | **581,530** | 100 % | | |

También quedan fuera **la rama 7223 completa** (banquetes y comedores industriales: no hay comensal que escanee un QR en su mesa ni carta que consultar) y **la rama 7224** (bares y cantinas: el ticket es de bebida, no hay carta de platillos que justifique modelos 3D). Si más adelante se quisiera sumar bares, tendría que ser una decisión comercial explícita, no un arrastre estadístico.

**Fuente:** INEGI / CANIRAC, *Conociendo la Industria Restaurantera*, 2021, con datos de los **Censos Económicos 2019**. Las nueve cifras suman exactamente 581,530, lo que confirma que la tabla está completa y bien leída. [VERIFICADO]

### 2.3 Las cifras que hay que usar

| Concepto | Cifra | Fuente y fecha | Marca |
|---|---:|---|---|
| **Restaurantes de servicio completo, nacional (722511)** | **59,296** | INEGI, Censos Económicos 2019 | [VERIFICADO] |
| **Servicio completo ampliado (722511 + 722512), nacional** | **81,518** | INEGI, Censos Económicos 2019 | [VERIFICADO] |
| **Restaurantes de servicio completo, Ciudad de México (722511)** | **8,142** | INEGI, Censos Económicos 2019 | [VERIFICADO] |
| Rama 7225 completa, nacional (el número viejo) | 740,231 | DENUE, corte a **mayo de 2026**, vía Data México, consultado 19-sep-2026 | [VERIFICADO] |
| Rama 7225 completa, Ciudad de México | 55,753 | DENUE, mayo 2026, ídem | [VERIFICADO] |
| Rama 7225, Estado de México / Jalisco | 89,408 / 48,957 | DENUE, mayo 2026, ídem | [VERIFICADO] |

**Nota:** el 736,367 que cita el análisis actual es el corte de **mayo de 2025**. El corte vigente es **740,231 (mayo 2026)**, y las cifras estatales también se movieron (CDMX pasó de 55,370 a 55,753). Si se va a citar, que sea el dato vigente.

### 2.4 Estimación al día de hoy (y por qué es estimación)

El DENUE **no publica** el desglose por clase de actividad en ninguna tabla web. Data México llega hasta la rama 7225 y ahí se detiene. Para tener el 722511 de 2026 hay dos caminos, ambos fuera de lo que se puede consultar abriendo una página:

1. **La API del DENUE** tiene un método `Cuantificar` que cuenta unidades por actividad económica y área geográfica — exactamente lo que se necesita. Requiere registrarse en el INEGI para obtener un token; **no hay token público de prueba**. [VERIFICADO]
2. **La descarga del directorio completo** por entidad (archivos CSV públicos del INEGI), que además traería el corte por colonia. Requiere bajar y procesar los archivos.

Mientras tanto, aplicando la composición por clase de 2019 al universo de 2026:

| Cálculo | Resultado | Marca |
|---|---:|---|
| 722511 nacional hoy = 740,231 × 10.2 % | **≈ 75,500** | [ESTIMACIÓN propia, aritmética sobre INEGI] |
| 722511 + 722512 nacional hoy = 740,231 × 14.0 % | **≈ 104,000** | [ESTIMACIÓN propia] |
| 722511 en CDMX hoy = 55,753 × 15.1 % | **≈ 8,400** | [ESTIMACIÓN propia] |

El 15.1 % de CDMX sale de dividir los 8,142 restaurantes de servicio completo entre las 53,884 unidades de la rama 7225 que el censo de 2019 registró en la ciudad. **La Ciudad de México concentra servicio completo a una tasa 48 % mayor que el promedio del país** (15.1 % contra 10.2 %). Eso es un argumento real a favor de que el piloto sea aquí, y está sostenido en datos.

**Supuesto que hay que decir en voz alta:** estas tres estimaciones suponen que la mezcla por clase no cambió entre 2019 y 2026. Después de la pandemia eso es discutible. Son órdenes de magnitud, no cifras para un pitch.

### 2.5 Lo que esto significa

**El mercado de Carta es entre 9 y 12 veces más chico de lo que dice el análisis actual.** No 736 mil: alrededor de **60 mil** restaurantes en el país con el dato censal, o **75 mil** con la estimación al día de hoy. Y en la ciudad del piloto, **ocho mil**, no cincuenta y cinco mil.

Pero hay una compensación, y es la parte buena de este hallazgo. Los mismos Censos Económicos dicen que la clase 722511:

- es **10.2 %** de las unidades,
- pero **24.7 %** del personal ocupado,
- y **33.2 %** de la producción bruta — **el primer lugar de toda la industria restaurantera**.

[VERIFICADO — INEGI, Censos Económicos 2019]

Dicho en simple: **un restaurante de servicio completo vale, en promedio, unas 3.3 veces lo que vale un negocio promedio del sector** y emplea 2.4 veces más gente [ESTIMACIÓN propia: es la división de esos porcentajes]. El mercado es más chico, pero cada cliente es mucho más grande y mucho más capaz de pagar una mensualidad. **El recorte del segmento no debilita el caso de negocio: lo aclara.**

### Fuentes del hueco 1

- INEGI / CANIRAC — *Conociendo la Industria Restaurantera* (2021), con datos de Censos Económicos 2019: https://www.inegi.org.mx/contenidos/productos/prod_serv/contenidos/espanol/bvinegi/productos/nueva_estruc/889463903369.pdf
- INEGI — *Conociendo los servicios de preparación de alimentos y bebidas* (2023): https://www.inegi.org.mx/contenidos/productos/prod_serv/contenidos/espanol/bvinegi/productos/nueva_estruc/889463911982.pdf
- INEGI — SCIAN 2023, catálogo de clasificación: https://www.inegi.org.mx/scian/
- Data México (Secretaría de Economía) — perfil de la rama 7225 con datos del DENUE a mayo de 2026: https://www.economia.gob.mx/datamexico/es/profile/industry/restaurants-and-other-eating-places
- INEGI — documentación de la API del DENUE (método `Cuantificar`, token por registro): https://www.inegi.org.mx/servicios/api_denue.html

Todas consultadas el 19 de septiembre de 2026.

---

## 3. Hueco 2 — Ticket promedio en restaurantes de servicio completo

### 3.1 El dato no existe

**No hay ticket promedio oficial de restaurantes en México.** Ni el INEGI, ni la CANIRAC, ni la Secretaría de Turismo publican consumo promedio por comensal. [NO ENCONTRADO]

Se revisaron y descartaron dos candidatos que el encargo proponía:

- **Alsea.** Se abrió su reporte trimestral. **Alsea no publica ticket promedio en pesos**, ni por marca ni por país: solo reporta Ventas Mismas Tiendas y variaciones porcentuales. No sirve como sustituto. [VERIFICADO que no lo publica]
- **INDEREST**, el indicador de desempeño de restaurantes de la Secretaría de Turismo de la CDMX con CANIRAC, AMR y DICARES. Es **un anuncio de intención de julio de 2021 sin cifras publicadas**. No hay serie que consultar. [VERIFICADO que no hay datos]

### 3.2 Lo que sí hay, y sirve

Estos son datos reales y verificables. **Ninguno es un ticket promedio.** Se presentan como lo que son: el tamaño del bolsillo y el tamaño del negocio.

| Dato | Cifra | Fuente y fecha | Marca |
|---|---:|---|---|
| Gasto **mensual** por hogar en **alimentos consumidos fuera del hogar** | **$1,299 MXN** | ENIGH 2024 (INEGI), publicada 30-jul-2025 | [VERIFICADO] |
| Lugar que ocupa ese gasto | **El rubro individual más grande de todo el gasto del hogar**, por encima de carnes ($1,082) y gasolina ($1,023) | ENIGH 2024 | [VERIFICADO] |
| Gasto corriente monetario mensual total por hogar, nacional | $15,891 MXN | ENIGH 2024 | [VERIFICADO] |
| Gasto corriente mensual por hogar, **Ciudad de México** | **$22,128 MXN — el más alto del país** | ENIGH 2024 | [VERIFICADO] |
| Proporción del gasto en alimentos y bebidas que se va a restaurantes | **19.7 % (2022)**, contra 13.4 % en 2020 | INEGI, ENIGH 2020 y 2022 | [VERIFICADO] |
| Lo mismo, en el decil de mayores ingresos (decil X) | **35.7 %** | INEGI, ENIGH 2022 | [VERIFICADO] |
| Valor agregado anual **por persona ocupada** en la clase 722511, nacional | **$132,590 MXN — el más alto de las nueve clases** (promedio de las nueve: $90,321) | INEGI, Censos Económicos 2019 | [VERIFICADO] |
| Lo mismo, en la alcaldía Benito Juárez | **$165,907 MXN** | INEGI, Censos Económicos 2019 | [VERIFICADO] |
| Tasa de rentabilidad promedio, clase 722511 | **44.9 %** (las nueve clases: 41.9 %; todas las empresas del país: 30.9 %) | INEGI, Censos Económicos 2019 | [VERIFICADO] |

**Ficha de la ENIGH 2024:** muestra de 105,718 viviendas, levantada entre el 21 de agosto y el 28 de noviembre de 2024, con representatividad por entidad federativa.

### 3.3 Cómo usar esto sin mentir

Tres lecturas honestas:

1. **El bolsillo existe y crece.** Comer fuera de casa es el gasto individual más grande del hogar mexicano, y la porción del gasto en comida que se va a restaurantes subió de 13.4 % a 19.7 % entre 2020 y 2022. En los hogares de ingresos altos —los que se sientan en un restaurante de servicio completo— es 35.7 %.
2. **La Ciudad de México es el mejor lugar para el piloto, con dato.** Sus hogares gastan **$22,128 al mes**, 39 % más que el promedio nacional, y concentran servicio completo a una tasa 48 % mayor que el resto del país.
3. **El restaurante de servicio completo es el negocio más rentable y más productivo del sector.** 44.9 % de rentabilidad contra 30.9 % de la economía entera; el valor agregado por persona más alto de las nueve clases.

**Lo que no se puede hacer:** convertir nada de esto en un ticket promedio. $1,299 al mes por hogar no es el ticket de una mesa, porque no se sabe cuántas visitas hay al mes, cuántas personas por mesa, ni qué parte se va a taquerías y cafeterías. **Cualquier cifra de ticket que aparezca en el pitch tiene que salir de los pilotos, y hay que decir de dónde salió.**

### Fuentes del hueco 2

- INEGI — ENIGH 2024, comunicado de prensa 112/25 (30-jul-2025): https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/enigh/ENIGH2024.pdf
- INEGI — ENIGH 2024, programa y base de datos: https://www.inegi.org.mx/programas/enigh/nc/2024/default.html
- INEGI — *Conociendo los servicios de preparación de alimentos y bebidas* (2023), capítulo de gasto de los hogares: https://www.inegi.org.mx/contenidos/productos/prod_serv/contenidos/espanol/bvinegi/productos/nueva_estruc/889463911982.pdf
- INEGI / CANIRAC — *Conociendo la Industria Restaurantera* (2021), valor agregado y rentabilidad por clase: https://www.inegi.org.mx/contenidos/productos/prod_serv/contenidos/espanol/bvinegi/productos/nueva_estruc/889463903369.pdf
- Alsea — reporte trimestral 1T25 (no reporta ticket en pesos): https://www.alsea.com.mx/uploads/es/documents/reports_quarterly/alsea_resultados_1T25.pdf
- Secretaría de Turismo CDMX — anuncio del indicador INDEREST (julio 2021, sin cifras): https://turismo.cdmx.gob.mx/comunicacion/nota/dan-conocer-un-nuevo-indicador-estadistico-del-desempeno-de-restaurantes-en-la-cdmx

---

## 4. Hueco 3 — El plazo de la factura global (CFDI)

### 4.1 Resuelto: son 24 horas, y la regla es la 2.7.1.21

Se abrió el texto de la **Resolución Miscelánea Fiscal para 2026 tal como se publicó en el Diario Oficial de la Federación el 28 de diciembre de 2025**. Vigencia: del 1 de enero al 31 de diciembre de 2026 (artículo Primero transitorio). Es decir, **es el texto que manda hoy**.

**Texto exacto de la regla:**

> "Para los efectos del CFDI donde consten las operaciones realizadas con el público en general, los contribuyentes podrán remitir al SAT o al PCCFDI, según sea el caso, el CFDI a más tardar dentro de las **24 horas** siguientes al cierre de las operaciones realizadas de manera diaria, semanal, mensual o bimestral."

> "En los CFDI globales se deberá separar el monto del IVA e IEPS a cargo del contribuyente."

> "Cuando los adquirentes de los bienes o receptores de los servicios no soliciten comprobantes de operaciones realizadas con el público en general, los contribuyentes no estarán obligados a expedirlos por operaciones celebradas con el público en general, cuyo importe sea **inferior a $100.00 (cien pesos 00/100 M.N.)**."

— RMF 2026, regla **2.7.1.21.**, DOF 28-dic-2025. [VERIFICADO en la fuente primaria]

### 4.2 Por qué las fuentes se contradecían

Las dos cifras eran correctas, en momentos distintos. **El plazo era de 72 horas en versiones anteriores de la Resolución y se redujo a 24 horas en la RMF 2026** [ESTIMACIÓN sobre el texto anterior: se verificó directamente el de 2026, no el de 2025]. Los blogs que decían 72 horas no estaban inventando: estaban citando un texto que ya venció. **La contradicción era de versión, no de fuente.**

Y sobre la numeración: la primera ronda sospechaba una renumeración de la 2.7.1.21 a la 2.7.1.24. Es al revés de lo que parecía. **En la RMF 2026 la factura global es la regla 2.7.1.21**, y la **2.7.1.24 es otra cosa por completo**: "CFDI para devolución del IVA a turistas extranjeros". [VERIFICADO] Citar la 2.7.1.24 para la factura global hoy sería un error.

### 4.3 Dos cosas más que conviene saber

- **Ningún transitorio le da prórroga a los restaurantes.** El artículo Décimo Primero transitorio sí extiende hasta el 31 de diciembre de 2026 la facilidad de emitir CFDI global diario, semanal o mensual — pero solo para los contribuyentes de la regla 2.6.1.2, fracciones VII y VIII, que son **hidrocarburos y estaciones de servicio**. Un restaurante no entra. [VERIFICADO]
- **La periodicidad sigue siendo del contribuyente** (diaria, semanal, mensual o bimestral). Lo que cambió es el plazo para mandar el comprobante al SAT una vez cerrado el periodo.

### 4.4 Qué significa para Carta

Si Carta llega a cobrar en la mesa, **el reloj es de 24 horas, no de 72**. Eso reduce a un tercio el margen de maniobra para un proceso de cierre manual. En la práctica significa que la facturación global no puede depender de que alguien se acuerde de correr un proceso: tiene que ser automática. Es un argumento más para no construir cobros en la V2 sin un contador revisando el diseño.

### Fuentes del hueco 3

- **Resolución Miscelánea Fiscal para 2026**, publicada en el DOF el 28 de diciembre de 2025 (texto íntegro, 666 páginas): https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/rmf/RMF_2026-DOF-28122025.pdf
- SAT — ficha de la regla en el portal de trámites: https://wwwmat.sat.gob.mx/articulo/90959/regla-2.7.1.24

Consultadas el 19 de septiembre de 2026.

---

## 5. Hueco 4 — Penetración de software de punto de venta

### 5.1 No existe el dato, y hay que decirlo así

**No encontré ninguna fuente mexicana que mida qué porcentaje de los restaurantes de México usa software de punto de venta.** Ni el INEGI, ni la CANIRAC, ni ninguna dependencia lo publica. [NO ENCONTRADO]

Las cifras de "65 % ya adoptó POS" y "78 % usa software POS" que aparecen en el análisis actual **son de mercados globales o de Estados Unidos**. No se sustituyen aquí por otras cifras extranjeras. La respuesta correcta es que el dato no existe.

También se revisó y se descartó una cifra que circula en blogs del sector ("la adopción de POS integrados creció 45 % entre 2020 y 2023 en México"): **no tiene fuente primaria identificable**. No usarla. [NO VERIFICADO]

### 5.2 El dato mexicano más cercano, y es demoledor

Sí existe una medición oficial mexicana de uso de tecnología por tamaño de empresa, y apunta en dirección contraria al 65 %:

| Tamaño de la unidad económica | Usa equipo de cómputo | Usa internet |
|---|---:|---:|
| **Nacional (todas)** | **25.3 %** | **26.2 %** |
| **Micro (0 a 10 personas)** | **22.3 %** | **23.5 %** |
| Pequeñas (11 a 50) | 86.2 % | 82.1 % |
| Medianas (51 a 250) | 92.8 % | 90.9 % |
| Grandes (más de 250) | 94.5 % | 93.1 % |

**Fuente:** INEGI, *Estadísticas a propósito del Día de las MIPYMES* (junio de 2025), con datos de los **Censos Económicos 2024, resultados oportunos**, año de referencia **2023**. Además: solo **5.5 %** de las unidades económicas del país (302,394) hizo ventas por internet. [VERIFICADO]

Ahora júntese con otro dato del INEGI: **96 de cada 100 unidades de la industria restaurantera son microempresas** [VERIFICADO, INEGI/CANIRAC]. Si apenas 22.3 % de las microempresas mexicanas usa siquiera **una computadora**, la penetración de un *software* de punto de venta en el restaurante mexicano promedio tiene que estar muy por debajo de 65 %.

### 5.3 El matiz que evita el error contrario

Esto **no** quiere decir que el cliente de Carta no tenga sistema. La clase 722511 está sesgada hacia negocios más grandes: tiene 10.2 % de las unidades pero 24.7 % del personal, o sea **2.4 veces más empleados que el negocio promedio del sector** [ESTIMACIÓN propia sobre INEGI]. Un restaurante de servicio completo de Roma o Polanco es muchísimo más probable que tenga punto de venta que una fonda de Iztapalapa.

**Pero no hay ninguna cifra pública que lo cuantifique.** La única forma de saberlo es la pregunta uno de las llamadas: *¿qué punto de venta tienes?* Sigue siendo la pregunta que decide si Carta puede integrarse.

### Fuentes del hueco 4

- INEGI — *Estadísticas a propósito del Día de las Micro, Pequeñas y Medianas Empresas* (junio 2025), con datos de Censos Económicos 2024: https://www.inegi.org.mx/contenidos/saladeprensa/aproposito/2025/EAP_MIPYMES_25.pdf
- INEGI — Censos Económicos 2024, resultados oportunos: https://www.inegi.org.mx/programas/ce/2024/
- INEGI / CANIRAC — *Conociendo la Industria Restaurantera* (2021): https://www.inegi.org.mx/contenidos/productos/prod_serv/contenidos/espanol/bvinegi/productos/nueva_estruc/889463903369.pdf

---

## 6. Hueco 5 — Los precios y comisiones que faltaban

Todo consultado el **19 de septiembre de 2026**, en el sitio oficial de cada empresa.

| Proveedor | Lo que publica | Marca |
|---|---|---|
| **Parrot Software** | **No lo publica.** El sitio oficial no tiene página de precios: las únicas llamadas a la acción son "Cotiza ahora" y "Agenda llamada". Las rutas `/precios` y `/precios-2025` devuelven **error 404** hoy. La cifra de $1,800–$2,800 que circula sigue viniendo de un competidor. | [VERIFICADO que no publica] |
| **Rappi** | **No lo publica.** El portal de comercios de México no muestra ningún porcentaje ni tarifa. | [VERIFICADO que no publica] |
| **DiDi Food** | **No lo publica.** Texto literal de su página de preguntas frecuentes: *"La tarifa de servicio depende del país donde te encuentres. Recibirás todos los detalles correspondientes durante el proceso de registro."* | [VERIFICADO que no publica] |
| **Mercado Pago Point** | **3.5 % + IVA** por cobros con tarjeta de débito y crédito con dinero al contado. Terminales **desde $99**, **sin renta mensual**. Hasta **24 meses sin intereses**, con las comisiones del financiamiento **a cargo del negocio**. | **[VERIFICADO]** |
| **Getnet (Santander)** | **No lo publica.** Ni la página principal de México ni la de restaurantes muestran comisiones. Sí confirma funciones de mesa: **propina** (10 %, 15 %, 20 %, sin propina o monto manual), **división de cuentas** automática o manual, **multidivisa** (USD, EUR, CAD, AUD, GBP, JPY), *G Tapp* y *Get Link and Pay*. El 2.9 % + IVA sigue viniendo de un comunicado de 2023. | [VERIFICADO que no publica] |

**Nota sobre Mercado Pago:** la tabla detallada de comisiones por plazo de acreditación y por meses sin intereses **está detrás de un inicio de sesión**. No se accedió: no corresponde entrar a una cuenta para una investigación de mercado. El 3.5 % + IVA es el dato que la empresa publica abiertamente.

### 6.1 Extra: lo que sí existe sobre comisiones de reparto, de fuente oficial mexicana

Como ni Rappi ni DiDi publican, apareció un sustituto que **sí es fuente oficial**: una encuesta de gobierno a restaurantes.

**IIEG (Instituto de Información Estadística y Geográfica de Jalisco) — *Encuesta a restaurantes sobre el uso de plataformas digitales*, muestra de 537 establecimientos, levantada del 1 al 15 de marzo de 2022.**

| Pregunta: ¿qué porcentaje de las ventas por apps se van en comisiones e impuestos? | Oct 2020 | Mar 2021 | **Mar 2022** |
|---|---:|---:|---:|
| 30 % o menos | 57.4 % | 60.4 % | **37.5 %** |
| Más de 30 % | 31.6 % | 34.1 % | **23.4 %** |
| No sé | 11.1 % | 5.5 % | **39.1 %** |

El rango de respuesta más frecuente es **26 % a 30 %**. Además:

- **75 %** de los restaurantes pone **precios más altos en las apps** que en su establecimiento; de esos, 29.2 % dice que son ~30 % más altos.
- La razón número uno de insatisfacción con las apps son **las altas comisiones (69.2 %)**.
- Entre quienes **no** usan apps, 33.7 % dice que es por las altas comisiones o porque no les es rentable.
- **DiDi Food** es la app percibida como la de menores comisiones (45.3 % de las menciones).

[VERIFICADO como hallazgo de encuesta oficial]

**Cómo hay que citarlo:** esto es **lo que los restaurantes reportan pagar**, no una tarifa publicada por las plataformas. Es de **Jalisco** y de **2022**. No es un dato nacional ni vigente. Pero es lo único con metodología pública que existe sobre el tema, y es mucho mejor que los blogs que citan 18 % y 30 % sin fuente.

### Fuentes del hueco 5

- Parrot Software — sitio oficial: https://parrotsoftware.com.mx/ · (rutas `/precios` y `/precios-2025`: error 404 el 19-sep-2026)
- Rappi — portal de comercios México: https://merchants.rappi.com/es-mx
- DiDi Food — preguntas frecuentes sobre la comisión: https://web.didiglobal.com/mx/food/restaurantes/preguntas-frecuentes/que-porcentaje-de-comision-me-cobra-didi-food-por-uso-de-la-aplicacion/
- Mercado Pago — terminales Point (página oficial de producto): https://www.mercadopago.com.mx/point
- Getnet México — sitio oficial: https://www.getnet.net/mx/ · Restaurantes: https://www.getnet.net/mx/tu-negocio/sectores/terminal-de-pago-para-restaurantes
- IIEG Jalisco — *Encuesta a restaurantes sobre el uso de plataformas digitales*, marzo 2022: https://iieg.gob.mx/ns/wp-content/uploads/2022/04/Encuesta-a-restaurantes-y-plataformas-digitales-2022-20220426.pdf

---

## 7. Hueco 6 — Cuántos restaurantes de servicio completo hay en las zonas del piloto

Sí se pudo, y con dato oficial. El INEGI publicó una tabla de **la clase 722511 desglosada por alcaldía de la Ciudad de México**.

**Ciudad de México: 8,142 restaurantes de servicio completo.** Las 16 alcaldías suman exactamente esa cifra.

| Alcaldía | Restaurantes 722511 | Habitantes por restaurante | Zonas que cubre |
|---|---:|---:|---|
| **Cuauhtémoc** | **1,944** | **281** | **Roma, Condesa, Juárez, Centro, Santa María la Ribera** |
| **Benito Juárez** | **1,041** | **417** | **Del Valle, Nápoles, Narvarte, Portales** |
| **Miguel Hidalgo** | **828** | **501** | **Polanco, Lomas, Escandón, Anzures** |
| Gustavo A. Madero | 579 | 2,027 | |
| Álvaro Obregón | 564 | 1,346 | San Ángel, Santa Fe |
| Iztapalapa | 564 | 3,254 | |
| **Coyoacán** | **538** | **1,142** | **Centro de Coyoacán, Del Carmen** |
| Venustiano Carranza | 471 | 942 | |
| Tlalpan | 419 | 1,670 | |
| Azcapotzalco | 363 | 1,191 | |
| Iztacalco | 249 | 1,625 | |
| Cuajimalpa de Morelos | 184 | 1,183 | Santa Fe |
| Xochimilco | 149 | 2,968 | |
| Tláhuac | 100 | 3,923 | |
| La Magdalena Contreras | 95 | 2,607 | |
| Milpa Alta | 54 | 2,828 | |
| **Total CDMX** | **8,142** | **1,131** | |

**Fuente:** INEGI / CANIRAC, *Conociendo la Industria Restaurantera* (2021), con Censos Económicos 2019 y Censo de Población y Vivienda 2020. [VERIFICADO — la suma de las 16 alcaldías da exactamente 8,142, lo que confirma la lectura]

### 7.1 La zona del piloto, en números

**Cuauhtémoc + Benito Juárez + Miguel Hidalgo + Coyoacán = 4,351 restaurantes de servicio completo.**
**Es el 53.4 % de todos los de la Ciudad de México, en cuatro alcaldías de dieciséis.** [ESTIMACIÓN propia: es la suma de las cuatro cifras verificadas]

Tres lecturas útiles para decidir dónde tocar puertas:

1. **Cuauhtémoc es, por mucho, la alcaldía más densa en restaurantes de servicio completo del país que se pueda documentar**: 1,944 restaurantes y **281 habitantes por restaurante**. Roma y Condesa están ahí. Si el piloto necesita cinco o diez restaurantes caminables entre sí, es aquí.
2. **Benito Juárez tiene la mayor concentración relativa.** De sus 3,650 restaurantes de todas las clases, **1,041 son de servicio completo: 28.5 %**, contra 15.1 % del promedio de la ciudad. Es la alcaldía donde la proporción de clientes válidos por puerta tocada es más alta. [VERIFICADO]
3. **Benito Juárez también tiene el restaurante más productivo.** El valor agregado por persona ocupada en la clase 722511 ahí es de **$165,907 al año**, contra $132,590 del promedio nacional de la misma clase. [VERIFICADO]

### 7.2 Lo que no se pudo

**El corte por colonia — Roma, Condesa, Polanco como tales — no está en ninguna publicación del INEGI.** Las publicaciones llegan hasta alcaldía. [NO ENCONTRADO en fuente publicada]

Técnicamente sí es posible: **el DENUE guarda la colonia en cada registro**, y el directorio se puede descargar completo o consultar por área geográfica con su API. Pero eso requiere el token del INEGI o procesar el archivo del directorio, y no es algo que se resuelva abriendo una página. Si el dato por colonia llega a importar para el piloto, ese es el camino.

**Advertencia sobre la antigüedad:** estas cifras son de los **Censos Económicos 2019**, levantados antes de la pandemia. La Roma y la Condesa de 2026 no son las de 2019: hubo cierres y también aperturas. Sirven para ordenar prioridades entre alcaldías, no como censo actual de puertas que tocar.

### Fuentes del hueco 6

- INEGI / CANIRAC — *Conociendo la Industria Restaurantera* (2021), tablas por alcaldía de la CDMX: https://www.inegi.org.mx/contenidos/productos/prod_serv/contenidos/espanol/bvinegi/productos/nueva_estruc/889463903369.pdf
- INEGI — DENUE interactivo (permite el corte fino por área geográfica): https://www.inegi.org.mx/app/mapa/denue/default.aspx
- INEGI — API del DENUE: https://www.inegi.org.mx/servicios/api_denue.html

---

## 8. Qué cambia en los documentos

Esta sección es el encargo concreto: qué hay que corregir, dónde, y con qué.

### 8.1 En `docs/Carta_Market_Analysis.md`

| Sección | Lo que dice hoy | Qué hay que poner |
|---|---|---|
| **2.2 — SAM** | "736,367 restaurantes registrados en México (DENUE 2025)" y el cálculo "70 % de 736K (~515K) × USD $5,000/año → **SAM México ≈ USD $2.58B**" | **Rehacer el cálculo completo.** El universo no son 736,367 sino **59,296** restaurantes de servicio completo (722511, Censos Económicos 2019), u **81,518** si se incluye pescados y mariscos (722512). **El SAM está inflado por un factor de 9 a 12.** Además el 70 % es un porcentaje global aplicado a México sin fuente, y los USD $5,000/año de gasto en tecnología no tienen fuente mexicana. Si se conserva un SAM, que se construya sobre 59,296 o 81,518 y sobre precios mexicanos reales ($360 a $2,900 MXN/mes, de la investigación anterior), no sobre dólares de otro mercado. |
| **2.2 — SAM LATAM** | "SAM LATAM ≈ USD $10B" (×4 sobre el mexicano) | Cae con el anterior: es un múltiplo de una cifra inflada. |
| **1 — Resumen** | "más de 736,000 establecimientos de alimentos y bebidas registrados (DENUE 2025)" | Sustituir por **59,296 restaurantes de servicio completo**. Si se quiere citar el universo grande, decir explícitamente que **incluye taquerías, fondas, puestos y cafeterías** y que no es el mercado de Carta. Y actualizar el corte: el vigente es **740,231 a mayo de 2026**, no 736,367 de mayo de 2025. |
| **6.1** | "El 65 % de los restaurantes ya adoptó sistemas POS integrados, y el 78 % usa alguna forma de software POS" | **Quitarlo del apartado de México.** Son cifras globales o de EE.UU. **No existe medición mexicana** de penetración de punto de venta en restaurantes. Si se quiere un dato mexicano, el que hay es: **solo 22.3 % de las microempresas mexicanas usa equipo de cómputo** (INEGI, Censos Económicos 2024, año de referencia 2023), y 96 de cada 100 unidades restauranteras son microempresas. |
| **6.4** | "México registra 736,367 establecimientos... Estado de México (88,987), CDMX (55,370) y Jalisco (48,760)... El sector genera **3.8 millones de empleos** y contribuye 3.2 % al PIB nacional y 13.4 % al PIB turístico" | Actualizar las cifras del DENUE al corte de **mayo de 2026**: **740,231** nacional, **Estado de México 89,408**, **CDMX 55,753**, **Jalisco 48,957**. Y **revisar el dato de empleo**: el INEGI con la CANIRAC reporta **poco más de 2 millones** de empleos y que la industria restaurantera es **7.5 % del empleo** del país. Los 3.8 millones no concuerdan con el INEGI. |
| **6.4** | "Los restaurantes independientes representan el 56.53 % del mercado" | Cotejar contra el dato del INEGI, que es más fuerte y más útil: **96 de cada 100 unidades de la industria restaurantera son microempresas**, y dan empleo a 70 de cada 100 personas del sector. |
| **4.3** | "ARPU B2B (blended) ~$250 MXN/mes" | Queda mejor sustentado ahora, pero en la dirección incómoda: el mercado es **9 a 12 veces más chico**, así que el ARPU tiene que subir o el negocio no cierra. A favor: el cliente objetivo es **3.3 veces más productivo** que el negocio promedio del sector y tiene **44.9 % de rentabilidad** contra 30.9 % de la economía nacional. **Hay con qué defender un precio más alto — pero sobre 59 mil clientes potenciales, no sobre 736 mil.** |
| **3.4 y 5** | Mapa competitivo y socios (Toast, Square, Aloha) | Ya corregido en la investigación anterior; no cambia con este pase. |

**Y una sección que hay que agregar:** el análisis no tiene en ninguna parte el desglose por clase de actividad. La tabla de la sección 2.2 de este documento debería entrar tal cual en `Carta_Market_Analysis.md`, porque es la que justifica el recorte del segmento con datos y no con opinión.

### 8.2 En `docs/Carta_Blueprint.md`

Aquí el trabajo es más de **llenar huecos que el propio documento dejó abiertos a propósito**. El Blueprint ya dice, correctamente, que la cifra de 736 mil no sirve. Ahora se puede cerrar.

| Línea / sección | Lo que dice hoy | Qué hay que poner |
|---|---|---|
| Sección de supuestos (≈ línea 26) | "El **tamaño del mercado real** no está medido. La cifra de 736 mil establecimientos que circula en documentos anteriores incluye taquerías, fondas y puestos." | **Ya está medido.** Sustituir por: **59,296 restaurantes de servicio completo en el país (clase SCIAN 722511, Censos Económicos 2019); 8,142 en la Ciudad de México.** Con la advertencia de que la clase incluye fondas de comida corrida, así que el número real es algo menor. |
| Definición del segmento (≈ línea 49) | "el mercado de Carta **no** son los 736 mil establecimientos del INEGI... El número del segmento de servicio completo **está en medición** y sustituirá a cualquier cifra anterior" | **Cerrar la frase con el número.** Y anclar el segmento a la clase SCIAN, que es lenguaje que un inversionista o un contador reconocen: **"clase SCIAN 722511, más 722512 si se incluyen marisquerías"**. |
| Lista "lo que no es verdad" (≈ línea 128) | "Que el mercado son 736 mil restaurantes... El mercado real de Carta no está medido." | Cambiar de "no está medido" a **"son alrededor de 60 mil, y en CDMX unos 8 mil"**. Deja de ser un hueco y pasa a ser un hecho. |
| Riesgo 10 / asuntos fiscales (≈ línea 284) | "La investigación dejó sin resolver si la factura global se emite a 24 o a 72 horas." | **Resuelto: 24 horas**, regla **2.7.1.21** de la RMF 2026 (DOF 28-dic-2025). Y conviene añadir el matiz operativo: **con 24 horas, el cierre no puede ser manual**. Sigue en pie la recomendación de consultar a un contador antes de construir cobros. |
| Pendiente de la V2 (≈ línea 178) | "quién absorbe la comisión —hoy entre 2.9 % y 3.5 % más IVA, según la investigación" | Precisar: **Mercado Pago Point publica 3.5 % + IVA** [VERIFICADO hoy]. **Clip publica 2.99 % + $1 MXN + IVA.** **Getnet no publica nada**: el 2.9 % viene de un comunicado de 2023 y no debe presentarse como vigente. El rango honesto es "**2.99 % a 3.5 % más IVA, con Getnet sin dato público**". |
| Preguntas de las llamadas (≈ línea 303) | "¿Cuál es su ticket promedio...? No existe dato público mexicano; se construye con estas llamadas." | **Sigue siendo cierto y hay que dejarlo.** Se puede reforzar con contexto: los hogares mexicanos gastan **$1,299 al mes** comiendo fuera —su gasto individual más grande— y los de la CDMX gastan 39 % más que el promedio nacional. Sirve para enmarcar la pregunta, no para responderla. |
| Sección del piloto | No dice dónde tocar puertas | **Agregar la tabla por alcaldía.** Cuauhtémoc (1,944), Benito Juárez (1,041), Miguel Hidalgo (828) y Coyoacán (538) concentran **53 % de los restaurantes de servicio completo de la ciudad**. Y Benito Juárez es donde la proporción de clientes válidos por puerta tocada es más alta: 28.5 % de sus restaurantes son de servicio completo, contra 15.1 % del promedio de la ciudad. |

### 8.3 La frase que resume el cambio

Si hay que quedarse con una sola idea para corregir los dos documentos:

> **El mercado de Carta es diez veces más chico de lo que decían los documentos, y cada cliente vale tres veces más de lo que suponían.** No son 736 mil negocios: son unos 60 mil restaurantes de servicio completo en el país y unos 8 mil en la Ciudad de México. Pero esos restaurantes concentran **un tercio de toda la producción de la industria restaurantera** y son el negocio más rentable del sector. El recorte del segmento no debilita el caso: lo vuelve defendible.

---

## Anexo: lo que sigue sin poder verificarse

Para que nadie construya nada encima de estos puntos sin volver a revisarlos:

1. **El conteo del DENUE por clase de actividad a 2026.** No se publica en tablas web. Requiere token de la API del INEGI o descarga del directorio. Las estimaciones de ~75,500 nacional y ~8,400 en CDMX son aritmética propia sobre la composición de 2019.
2. **El corte por colonia** (Roma, Condesa, Polanco). Existe en los registros del DENUE, no en publicaciones.
3. **El ticket promedio de un restaurante de servicio completo en México.** No existe. Se construye con el piloto.
4. **La comisión de Getnet.** No la publica. El 2.9 % + IVA es de un comunicado de 2023.
5. **La tabla detallada de comisiones de Mercado Pago** por plazo de acreditación y meses sin intereses: está detrás de un inicio de sesión, no se consultó.
6. **Los precios de Parrot.** No los publica; sus dos rutas de precios devuelven 404.
7. **Las comisiones de Rappi y DiDi Food.** Ninguna las publica. Lo más cercano es la encuesta del IIEG en Jalisco de 2022, que mide lo que los restaurantes **reportan pagar**, no la tarifa.
8. **El texto de la RMF anterior a 2026** (para confirmar que el plazo de 72 horas era el vigente hasta 2025). Se verificó directamente el texto de 2026; el de 2025 no se abrió.
9. **Qué proporción de los restaurantes de servicio completo tiene punto de venta.** No hay medición mexicana. Solo el dato de que 22.3 % de las microempresas usa computadora, que es un piso, no la respuesta.
