# Cómo gana dinero Carta y cuándo le paga a su fundador

**Fecha:** 17 de noviembre de 2026 · **Generado por `2026-11-17-como-gana-dinero.mjs`** desde el modelo ([JSON](2026-11-17-como-gana-dinero-carta.json)). **La v1 que se construye no cobra ni tiene planes ni anuncios:** los dos planes, el cobro y los anuncios son la postura de Calvin para la Spec 002 «Planes», posterior al piloto, aún sin especificar. Lo que va marcado «fuera de la v1» sólo se calcula para ver el tamaño. **Supuesto de historial:** todo el dinero usa la política vigente (03 §7: el gratuito guarda 24 meses de sesiones y 13 de analítica); recortarlo a 30 días es una propuesta pendiente de Calvin, y sus cifras van al lado (tabla de la §1). **No se venden datos (decisión de Calvin, 14-nov) ni se guardan datos personales del comensal (regla 10).**

**Postura de Calvin (17-nov):** «no estamos considerando un salario para mí todavía, pero eventualmente buscaré ganar de esto… quiero que me ayudes a darle forma para poder ganar dinero de eso también». Su investigación (una conversación con un asistente, 17 de noviembre, sin versión ni enlaces) se trata como **secundaria**: toda cifra de plataformas se verificó o se marca «no verificada» (§4).

## Conclusiones

1. **Hoy Carta no le paga a su fundador: `sueldo_fundador` está en 0 y no hay valor por omisión inventado.** La tabla de §1 da niveles de referencia (múltiplos del salario mínimo general: 315.04 pesos por día en 2026 [fuente]) y, para cada uno, cuántos restaurantes y clientes de paga hacen falta.
2. **Con un sueldo de 28,732 pesos al mes (3 salarios mínimos), en régimen estable el margen después de captación lo cubre con 2,150 restaurantes registrados y 255 de paga en el recomendado; en el peor, más de 20,000; en el mejor, 540.** En la proyección de crecimiento la proyección llega a ese número en el mes 33 y el margen lo cubre recién en el mes 38 (con 3,008 restaurantes); son dos cuentas distintas.
3. **Carta no es hoy una plataforma tipo Airbnb o Uber: es una herramienta gratuita con anuncios más suscripción, que sirve a un comensal que ya está sentado, sin transacción dentro (§3).** El hueco frente a Meniu (que no tiene plan gratuito) es el negocio de 0 a 5 personas: 73,193 de 104,882 clientes potenciales, de los que caben en Chef 32,399 (supuesto) (§4).
4. **De los cinco modelos de ingreso, dos son la postura de Calvin para la Spec 002, después del piloto (suscripción y anuncios), y tres no:** visibilidad pagada (cabe con una spec nueva, después del piloto) y comisión y pago del comensal (fuera de la v1: exigen pagos o cuenta del comensal).
5. **El tamaño por restaurante al mes (supuestos y rango en §2):** suscripción 225 por restaurante de paga; anuncios 2.6 a 27.3 por restaurante gratuito; **comisión por transacción (fuera de la v1) 322 por restaurante de 0 a 10 personas con supuestos**, que es el modelo de mayor tamaño y el que la v1 excluye.
6. **Secuencia recomendada:** piloto = suscripción; con la Spec 002 «Planes», después del piloto = anuncios y, con spec nueva, visibilidad pagada; comisión y pago del comensal sólo con ADR y spec de una v2 (§3).

## 1. Sueldo del fundador en el modelo

`sueldo_fundador` es un parámetro deslizable (pesos al mes): **vale 0 por omisión y no se inventa un valor**; Calvin lo elige. `sueldo(config, s, monto)` y `tablaSueldos(config, s)` lo calculan por escenario. **Niveles de referencia:** múltiplos del salario mínimo general de 315.04 pesos por día (Diario Oficial de la Federación del 9 de diciembre de 2025 (CONASAMI), vigente desde el 1 de enero de 2026; «con lo que será de 315.04 pesos por jornada diaria de trabajo») × 30.4 días; no son una recomendación.

**Dos cuentas distintas:** *restaurantes en régimen estable* = cuántos hacen falta para que el margen después de captación cubra el sueldo cuando ya no se crece (la captación sólo repone bajas); *mes en que el margen lo cubre* sale de la **proyección de crecimiento**, donde mientras se crece conseguir clientes de paga cuesta y ese mes hay más restaurantes que los del régimen. **Curva de crecimiento:** ajuste a dos metas de Calvin (300 restaurantes a 12 meses y 1200 a 24); después del mes 24 es extrapolación sin dato. **Historial del gratuito:** Política vigente de historial (03 §7: sesiones y comandas 24 meses y analítica 13 para todos los planes; hoy nada purga). La propuesta de 30 días para el gratuito es decisión pendiente de Calvin: va al lado, rotulada «propuesta».

| Sueldo al mes | Veces el mínimo | Escenario | Restaurantes en régimen estable | Clientes de paga | Mes en que la proyección llega a ese número | Mes en que el margen lo cubre (restaurantes ese mes) | Con la PROPUESTA de 30 días: régimen · mes de llegada · mes en que lo cubre |
|---|---|---|---|---|---|---|---|
| 9,577 | 1 | recomendado | 740 (pide otra arquitectura) | 88 | mes 19 | mes 25 (1,302) | 580 · mes 17 · mes 21 |
|  |  | peor | más de 20,000 | — | más de 60 meses | más de 60 meses | 4,430 · mes 47 · mes 52 |
|  |  | mejor | 175 | 68 | mes 10 | mes 15 (469) | 174 · mes 10 · mes 14 |
| 28,732 | 3 | recomendado | 2,150 (pide otra arquitectura) | 255 | mes 33 | mes 38 (3,008) | 1,690 · mes 29 · mes 34 |
|  |  | peor | más de 20,000 | — | más de 60 meses | más de 60 meses | 12,480 · más de 60 meses · más de 60 meses |
|  |  | mejor | 540 (pide otra arquitectura) | 211 | mes 17 | mes 21 (919) | 510 · mes 16 · mes 21 |
| 47,886 | 5 | recomendado | 3,560 (pide otra arquitectura) | 422 | mes 42 | mes 47 (4,602) | 2,860 · mes 38 · mes 42 |
|  |  | peor | más de 20,000 | — | más de 60 meses | más de 60 meses | — · más de 60 meses · más de 60 meses |
|  |  | mejor | 910 (pide otra arquitectura) | 356 | mes 21 | mes 26 (1,408) | 870 · mes 21 · mes 25 |
| 95,772 | 10 | recomendado | 7,060 (pide otra arquitectura) | 837 | mes 59 | más de 60 meses | 5,720 · mes 53 · mes 57 |
|  |  | peor | más de 20,000 | — | más de 60 meses | más de 60 meses | — · más de 60 meses · más de 60 meses |
|  |  | mejor | 1,800 (pide otra arquitectura) | 704 | mes 30 | mes 34 (2,408) | 1,720 · mes 29 · mes 33 |

**El dinero según el historial del gratuito** (sin sueldo; 1,000 restaurantes, curva media):

| Historial del plan gratuito | Margen recomendado | Peor | Mejor | Estrés | Mes 12 con 300 restaurantes | Sueldo de 1 salario mínimo: restaurantes en régimen · mes en que lo cubre (restaurantes) |
|---|---|---|---|---|---|---|
| Política vigente (03 §7: 24 meses de sesiones y 13 de analítica) | +15,221 | −1,362 | +60,439 | −5,330 | +3,737 | 740 · mes 25 (1,302) |
| El gratuito acumula 12 meses (sin purga) | +16,346 | −223 | +61,527 | −4,192 | +5,369 | 680 · mes 24 (1,200) |
| PROPUESTA: el gratuito guarda 30 días (decisión pendiente de Calvin) | +19,058 | +2,539 | +62,677 | −1,429 | +5,432 | 580 · mes 21 (919) |

**Sin sueldo** (referencia): margen después de captación con 1,000 restaurantes +13,086 (recomendado), −1,794 (peor), +53,397 (mejor). El piso de verdad no cubre ningún sueldo.

**Sigue sin modelar:** impuestos (ISR e IVA); contabilidad y trámites; seguridad social y prestaciones; costos de ventas más allá del costo de conseguir un cliente de paga. El margen es antes de captación, sueldos e impuestos; un sueldo real cuesta más que el sueldo bruto.

## 2. Mapa de modelos de ingreso aplicados a Carta

Cada modelo con a quién se le cobra, el potencial en pesos al mes (con supuestos y rango), lo que exige y cuándo cabría. **Los potenciales de visibilidad, comisión y pago del comensal son supuestos sin dato** (parámetros con rango en `2026-11-14-parametros.json`): sirven para ver el tamaño, no como proyección.

### 2.1 Suscripción del restaurante (Master Chef) (vigente)

- **A quién se le cobra:** el restaurante que pasa de los topes de Chef.
- **Potencial (pesos al mes):** 225 por restaurante de paga (deja 138); por restaurante registrado 26.7 (rango 5.4 a 88).
- **Supuestos:** curva de pago (mediana, sigma y techo) sin dato; parte que rebasa los topes de Chef (modelo de mesas y cuentas).
- **Qué exige:** nada nuevo: es la v1 (sin pagos del restaurante dentro de Carta si se cobra fuera).
- **Cuándo cabría:** piloto: se prueba el precio con tres grupos.

### 2.2 Anuncios al comensal del plan gratuito (en la v1 no hay anuncios personalizados; la v2 los propone y exige spec, ADR y revisión legal) (vigente)

- **A quién se le cobra:** el anunciante, a través de una red de anuncios (hoy se supone AdSense); anunciantes típicos: marcas de bebidas y consumo, bancos y comercios locales (por definir).
- **Potencial (pesos al mes):** por restaurante gratuito 2.6 (tarifa baja) · 10.3 (media) · 27.3 (alta).
- **Supuestos:** tarifa por mil visitas, visitas con la app, parte con anuncio y que la red apruebe el sitio.
- **Qué exige:** ADR, abrir la política de seguridad del sitio, aviso de privacidad y aprobación de la red; sin anuncios personalizados (regla 10).
- **Cuándo cabría:** hacia el mes 9 (supuesto) o después de la Fase 3.

### 2.3 Visibilidad pagada dentro de Carta (patrocinio de marca o proveedor en la carta, platillo destacado)

- **A quién se le cobra:** la marca o el proveedor (cerveza, refrescos, insumos) que patrocina un espacio en la carta del restaurante; o el restaurante que destaca un platillo.
- **Potencial (pesos al mes):** por restaurante gratuito 7.5 (rango 1 a 75).
- **Supuestos:** parte de restaurantes con patrocinio y cuota mensual: SUPUESTOS sin dato (referencia de forma: Booking cobra 2–8 % más por visibilidad, por verificar).
- **Qué exige:** spec nueva (alcance), regla de qué puede patrocinarse sin engañar al comensal; no toca la v1 ni guarda datos del comensal.
- **Cuándo cabría:** después de la Fase 3, con restaurantes reales y una prueba de 3 patrocinadores.

### 2.4 Comisión por transacción (FUERA de la v1)

- **A quién se le cobra:** el restaurante, sobre lo que se pida o pague por Carta.
- **Potencial (pesos al mes):** 0 a 10 personas 322.4 (rango 53.7 a 967.1); 11 a 50 personas 2,212.8 (rango 368.8 a 6,638.3).
- **Supuestos:** ventas promedio de la clase 722511 (INEGI 2023, promedios no medianas); parte que pasaría por Carta y tasa: supuestos sin dato.
- **Qué exige:** cobrar o procesar pagos: contradice «Qué NO construir» y la v1; ADR nuevo y spec; puede exigir regulación financiera (por verificar con un abogado).
- **Cuándo cabría:** no antes de una v2; sólo se calcula para ver el tamaño.

### 2.5 Pago del comensal por quitar anuncios o por funciones propias (FUERA de la v1)

- **A quién se le cobra:** el comensal (suscripción tipo «Carta+»).
- **Potencial (pesos al mes):** por restaurante 297.3 (rango 99.1 a 1,189.1) (techo, repartido entre los restaurantes que visita cada comensal).
- **Supuestos:** comensales únicos al mes, conversión y precio (29 pesos del prototipo): supuestos sin dato.
- **Qué exige:** cuenta o perfil del comensal: contradice «Qué NO construir» y la regla 10 (sin datos personales del comensal en el servidor); ADR y spec.
- **Cuándo cabría:** no antes de una v2.

## 3. Qué tipo de plataforma es Carta, hoy y a dónde puede ir

**¿Carta es una plataforma como BlaBlaCar, Airbnb, Uber, Spotify o una red social?** No: hoy Carta es una herramienta gratuita con anuncios más suscripción para el restaurante (como el modelo de Spotify del lado de la oferta), que sirve a un comensal que YA está sentado; no conecta oferta y demanda nuevas ni procesa una transacción. (La premisa «somos como BlaBlaCar, Airbnb o Uber» no se da por buena: se compara.)

| Modelo | Quién paga | Quién usa gratis | ¿Conecta oferta y demanda nuevas? | ¿Hay transacción dentro? | Cifras (fuente primaria el 17-nov, o marcada) |
|---|---|---|---|---|---|
| **Comisión por transacción (Airbnb, Uber, BlaBlaCar)** | el que gana con la transacción (anfitrión, conductor) | el lado que trae la demanda (huésped, pasajero) no paga o paga una cuota | sí | sí | Airbnb 15.5 % al anfitrión en el esquema único (3 % en el compartido); Uber: la tarifa al conductor varía por viaje y la meta es acercarse a 25 % [fuente primaria, 17-nov]; BlaBlaCar no verificada |
| **Gratuito con anuncios más suscripción (Spotify, YouTube)** | el anunciante y el usuario que quiere quitar anuncios | el usuario de masas | no | no | YouTube paga 55 % del ingreso neto de anuncios de la página de reproducción [fuente primaria]; Spotify: la fuente primaria dice «cerca de dos tercios» a titulares de derechos, no 70 % |
| **Economía de la atención (redes sociales)** | el anunciante | todos los usuarios; el producto es la audiencia y sus datos | sí | no | Meta: 97.6 % de sus ingresos viene de publicidad (cálculo sobre el 10-K 2025) |
| **Carta v1** | el restaurante que pasa de los topes de Chef (suscripción) y, después, el anunciante | el comensal (anónimo) y el restaurante de hasta 6 mesas, con el dueño y 3 cuentas de personal, y hasta 50 platillos | no | no | reglas vigentes: sin pagos, sin cuenta del comensal, sin datos personales ni venta de datos |

**Dónde cae la v1:** Quién paga: el restaurante (suscripción) y, más adelante, un anunciante; el comensal no paga. Quién usa gratis: el comensal y el negocio chico de Chef. Oferta y demanda nuevas: no; el comensal ya está sentado en la mesa del restaurante. Transacción dentro: no; la v1 no cobra ni procesa pagos.

## 3a. Lo que deja cada tamaño de negocio (techo teórico, no proyección)

| Personas | Negocios [medido, DENUE] | En Chef | En Master Chef | Anuncios de Chef al mes (tarifa baja / media / alta) | Suscripción de Master Chef si todos pagaran | Con la curva pesimista / media / optimista |
|---|---|---|---|---|---|---|
| 0 a 5 | 73,193 | 32,399 | 40,794 | 83,686 / 334,743 / 884,678 | 9,178,724 | 324,723 / 1,606,277 / 5,297,439 |
| 6 a 10 | 17,855 | 1,388 | 16,467 | 3,584 / 14,337 / 37,891 | 3,705,152 | 131,080 / 648,402 / 2,138,404 |
| 11 a 30 | 10,809 | 0 | 10,809 | 0 / 0 / 0 | 2,432,025 | 86,040 / 425,604 / 1,403,627 |
| 31 a 50 | 2,263 | 0 | 2,263 | 0 / 0 / 0 | 509,175 | 18,013 / 89,106 / 293,867 |
| 51 a 100 | 542 | 0 | 542 | 0 / 0 / 0 | 121,950 | 4,314 / 21,341 / 70,383 |
| 101 a 250 | 193 | 0 | 193 | 0 / 0 / 0 | 43,425 | 1,536 / 7,599 / 25,062 |
| 251 o más | 27 | 0 | 27 | 0 / 0 / 0 | 6,075 | 215 / 1,063 / 3,506 |

**Aviso sobre la curva de pago:** SUPUESTO: la parte que paga es la misma para todos los tamaños (la curva de pago mira el precio, no el tramo); un negocio de 0 a 5 personas no paga igual de fácil que uno de 51 a 100. Los datos por estrato (2026-11-14-lo-que-paga-un-restaurante-por-estrato.csv) dan gasto en comunicación, publicidad y servicios profesionales, no disposición a pagar por un software, y sus estratos (0 a 10, 11 a 50, 51 a 250) no coinciden con los tramos: no alcanzan para diferenciar la curva. Datos por conseguir: la prueba de precio del piloto, repartida por tamaño del negocio (personas y mesas) y registrando quién acepta cada precio.

## 3b. Visión de Calvin para una versión 2 (NO es la v1 ni la Fase 3)

**Postura de Calvin (17-nov):** Ingreso principal por anuncios (estilo AdSense): personalizados para el comensal registrado, genéricos para el anónimo; quien paga no ve anuncios. Visión de una versión 2 con tres rutas; Calvin reconoce que choca con reglas «escritas para esta versión» (v1).

**En la v1:** Anuncios genéricos (con la Spec 002 «Planes», después del piloto) al comensal anónimo del restaurante gratuito; el restaurante de paga no los lleva. Nada de perfil, cuenta ni pagos.

**Conflicto con las reglas:** sí: reglas 10 y «Qué NO construir» de la v1; se levantan sólo con un ADR y una spec nuevos aprobados por Calvin.

### Anuncios genéricos frente a personalizados (por restaurante gratuito al mes, en pesos)

El restaurante de paga **no muestra anuncios**: su ingreso de anuncios es 0 y cambia por la suscripción. Tarifa personalizada = genérica × 1.5 (**supuesto**, rango 1 a 2.8: entre +4 % de un estudio independiente de 2019 y ×2.1 a ×2.8 del estudio de Google de 2019, que midió cookies y no consentimiento). Parte de comensales registrados en la v2: 20 % (**supuesto**, rango 5 a 60 %; en la v1 es 0).

| Tarifa base | Genérica (por mil) | Personalizada (por mil) | Por gratuito en la v1 | Por gratuito en la v2 | Cambio | Rango v2 | Por 1,000 restaurantes v1 → v2 |
|---|---|---|---|---|---|---|---|
| baja | 3.5 | 5.3 | 2.6 | 2.8 | +0 | 2.6 a 5.4 | 2,277 → 2,504 |
| media | 14 | 21 | 10.3 | 11.4 | +1 | 10.4 a 21.5 | 9,106 → 10,017 |
| alta | 37 | 55.5 | 27.3 | 30 | +3 | 27.4 a 56.8 | 24,067 → 26,473 |

*La tarifa base y las visitas son supuestos (ver modelo); con 119 de paga por cada 1,000 el ingreso de anuncios sale sólo de los gratuitos. Se mide con una prueba pequeña de AdSense con 3 restaurantes y, para la v2, con el registro voluntario.*

### Las tres rutas de la v2, lo que hay que cambiar antes y el orden sugerido

| Ruta | Qué habría que cambiar antes | Riesgo |
|---|---|---|
| Mercado con comisión, directorio, procesador de pagos y perfil del comensal | regla 10 (sin datos personales del comensal en el servidor); «Qué NO construir»: pagos o comisión, cuenta y perfil del comensal, directorio; ADR nuevo de pagos y spec de v2; aviso de privacidad y consentimiento para perfil e historial; regulación de pagos (si Carta custodia o procesa dinero): por verificar con un abogado | el mayor: cambia qué es el producto y las obligaciones legales |
| Economía de la atención (anuncios personalizados al comensal registrado) | regla 10 y «Qué NO construir» (cuenta y perfil del comensal); aviso de privacidad con finalidades separadas y consentimiento para anuncios personalizados; los datos no se venden (decisión del 14-nov): hay que decidir si se comparten con la red de anuncios; cabecera de consentimiento en el teléfono antes de cargar el anuncio | medio: el cambio técnico es chico, el legal y de confianza no |
| Plan pagado del comensal sin anuncios (como Spotify) | regla 10 y «Qué NO construir» (cuenta del comensal y cobro); procesar un pago pequeño recurrente: por verificar con un abogado; spec y ADR | medio: depende de que el comensal pague, sin dato de disposición a pagar |

**Orden sugerido:**
- 1. Anuncios genéricos al comensal anónimo (con la Spec 002 «Planes», después del piloto; no están en las tareas de la Fase 3): no cambia ninguna regla dura.
- 2. Cuenta voluntaria del comensal con consentimiento y anuncios personalizados (ruta 2): primero spec, ADR y revisión legal.
- 3. Plan pagado del comensal sin anuncios (ruta 3): reutiliza la cuenta del paso 2.
- 4. Directorio, pagos y comisión (ruta 1): al final; es lo que más cambia y lo más regulado.

**Marco legal (por verificar con un abogado: no se leyó la fuente primaria ni el reglamento):** Ley Federal de Protección de Datos Personales en Posesión de los Particulares (nueva, DOF 20-mar-2025; reforma del 14-nov-2025 según el texto de la Cámara). el aviso de privacidad debe distinguir las finalidades que requieren consentimiento y las que no (art. 15), y una finalidad nueva exige un consentimiento nuevo (art. 11); la autoridad pasó a la Secretaría Anticorrupción y Buen Gobierno. Fuente: resúmenes de despachos (Garrigues, KPMG México, IAPP; consultados el 17-nov-2026), NO el texto del DOF.

## 4. Dónde está el hueco frente a Meniu

**Meniu** (páginas leídas el 2026-11-17: [Precio](https://meniuapp.com/es/plans), [Menú QR en mesa](https://meniuapp.com/es/qr), [Tarjetas de lealtad](https://meniuapp.com/es/tarjetas-de-lealtad), [Reservas en línea](https://meniuapp.com/es/sistema-de-reservas-en-linea), [Punto de venta](https://meniuapp.com/es/terminal-punto-de-venta), [Meniu vs Fudo (blog)](https://meniuapp.com/es/blog/alternativa-gratuita-fudo-software-restaurantes), [Meniu vs OlaClick (blog)](https://meniuapp.com/es/blog/alternativa-gratuita-olaclick-software-restaurantes)): 225 pesos al mes, **prueba de 7 días y sin plan gratuito**; dice tener «+4,000 restaurantes» (afirmación suya, no verificada). los blogs de Meniu hablan de «alternativa gratis» pero el producto sólo ofrece una prueba de 7 días.

| Función | Lo tiene Meniu | Lo tiene Carta (hoy / Fase 3) | Qué valdría rescatar después |
|---|---|---|---|
| Menú digital QR y descarga del QR | sí | v1 (hoy) | ya está |
| Pedir desde la mesa y que el pedido llegue al personal o a cocina | sí | Fase 3 (comanda al mesero) | ya está en el plan; Meniu además manda a cocina (KDS) |
| Orden en grupo: varios teléfonos arman una orden juntos | no | Fase 3 (orden grupal, el diferenciador) | es de Carta |
| Dividir la cuenta y pagar desde el celular | sí | No (la v1 no cobra ni procesa pagos) | Después y con ADR: exige pagos |
| Punto de venta | sí | No (Qué NO construir) | No: otro producto |
| Tarjetas de lealtad (Apple Wallet y Google Wallet) | sí | No | Sí, después de la Fase 3, con spec: ver si se puede sin cuenta del comensal |
| Reservaciones en línea y mapa de mesas | sí | No | Quizá: el mapa de mesas ya existe como `mesa`; reservar exige perfil del comensal |
| Pedidos por WhatsApp | sí | No | Quizá, con spec |
| Inventario, reportes de ventas e impresión de tickets y comandas | sí | Panel del dueño sin inventario ni ventas; analítica del restaurante fuera de la v1 | Reportes simples después; inventario no |
| Multilenguaje (español, inglés, portugués) y sucursales ilimitadas | sí | No (Qué NO construir: multi-idioma y multi-sucursal) | Después, por spec |
| Plan gratuito permanente | no | Sí: Chef (6 mesas, el dueño y hasta 3 cuentas de personal, 50 platillos) con anuncios | es de Carta: el hueco |
| Importar la carta desde un PDF con IA | no | v1 (hoy): el operador confirma | es de Carta |
| Programa de afiliados (comisión por referir) | sí | No | Quizá: canal de ventas barato |

**Tamaño del hueco:** Con un producto sin plan gratuito (Meniu: prueba de 7 días y 225 pesos al mes), quedan sin servir los negocios de 0 a 5 personas: 73,193 de 104,882 clientes potenciales [medido, DENUE]; con 6 mesas y 1 cuenta caben en Chef 32,399 (44.3 % de ellos; rango 38.1–59.8 %), un juicio del modelo de mesas y cuentas. **Supuesto:** sólo los conteos por estrato son medidos; el reparto entre Chef y Master Chef es el modelo de mesas y cuentas con dispersión. **Lo que valdría rescatar primero (juicio, a decidir por spec):** las **tarjetas de lealtad** en Apple y Google Wallet, si se pueden hacer sin cuenta del comensal (regla 10); el programa de afiliados como canal de ventas barato; y, más adelante, pedidos por WhatsApp y reportes simples.

## 5. Cómo opera Carta con datos, con dinero y con usuarios

| | Renglón 1 | Renglón 2 | Renglón 3 |
|---|---|---|---|
| **Datos** | Sin datos personales del comensal en el servidor (regla 10): los filtros de alérgenos viven en el teléfono. | La analítica usa ids opacos, huella de red con sal diaria y una lista cerrada de eventos sin texto libre. | No se venden datos (decisión de Calvin, 14-nov) y los anuncios no son personalizados. |
| **Dinero** | La v1 no cobra ni procesa pagos; el precio nunca viene del cliente (regla 4) y la propina sólo se calcula y se registra. | Ingresan: suscripción del restaurante y, más adelante, anuncios; lo demás está fuera de la v1. | Los costos son servidor, disco, soporte y comisión de tarjeta del cobro de la suscripción; la bolsa de Calvin cubre lo que los anuncios todavía no. |
| **Usuarios** | Comensal anónimo, sin cuenta ni perfil: una cookie de invitado de 6 horas. | Personal (mesero y capitán) entra con PIN, guardado sólo como hash. | Operador (dueño o gerente) con cuenta; el dueño es el validador y el primer mesero (ADR-017); en Chef es una sola cuenta. |

## 6. El modelo de negocio en una página

- **A quién sirve:** Al restaurante y a la cafetería de México, desde la fonda de 0 a 5 personas hasta el negocio de 100, y al comensal que ya está sentado.
- **Qué le resuelve:** Sube la carta en PDF y en minutos tiene un menú visual por QR; los comensales arman su orden juntos desde sus teléfonos y el mesero la recibe en el suyo.
- **Quién paga y cuánto:** restaurante: Master Chef 225 pesos al mes (deja 138 al restaurante de paga tras costos); Chef es gratis; anunciante: 2.6 a 27.3 pesos al mes por restaurante gratuito (tarifa baja a alta, sin dato); comensal: nada.
- **Fuentes de ingreso por etapa:** **Piloto:** Suscripción de Master Chef (se prueba el precio con tres grupos) · **Con la Spec 002 «Planes», después del piloto (hacia el mes 9, supuesto):** Anuncios en Chef; visibilidad pagada con spec nueva · **Más adelante (v2):** Tarjetas de lealtad y otras funciones de Meniu, comisión o pago del comensal sólo con ADR y spec.
- **Costos:** infraestructura de hoy ≈ 10.2 USD al mes; un gratuito cuesta 3.9 pesos al mes y un cliente de paga sostiene 36 gratuitos sin anuncios; el costo grande: el soporte de cada cliente de paga.
- **Meta de 12 meses:** 300 restaurantes, margen de operación del mes 12 +3,737 pesos (recomendado).
- **Qué hay que medir:** La curva de pago de Master Chef (prueba de tres precios). · Mesas y cuentas por negocio de 0 a 5 personas (cuántos caben en Chef). · La carta real del piloto (cuántos platillos). · La tarifa de anuncios y la parte de visitas con anuncio (prueba con 3 restaurantes). · CPU, memoria y conexiones en Railway.

## 7. Secuencia recomendada

| Modelo | Cuándo | Qué exige | Riesgo o dato que falta |
|---|---|---|---|
| Suscripción del restaurante (Master Chef) | Piloto | Nada nuevo: la v1 | La curva de pago no tiene dato: la prueba de tres precios del piloto la mide |
| Anuncios al comensal del plan gratuito | Con la Spec 002 «Planes», después del piloto (hacia el mes 9, supuesto) | ADR, abrir la política de seguridad, aviso de privacidad y aprobación de la red de anuncios; sin anuncios personalizados | Tarifa, parte con anuncio y aprobación de la red sin dato: una prueba con 3 restaurantes |
| Visibilidad pagada dentro de Carta | Spec nueva, después de la Fase 3 y con restaurantes reales | Spec: qué se puede patrocinar y cómo se distingue de la carta; sin datos del comensal | No hay dato de cuánto pagaría un patrocinador: prueba con 3 patrocinadores |
| Comisión por transacción | Spec nueva y ADR: no antes de una v2 (hoy fuera de la v1) | Cobrar o procesar pagos: contradice «Qué NO construir»; posible regulación financiera (verificar con un abogado) | Cambia la naturaleza del producto y su regulación |
| Pago del comensal | Spec nueva y ADR: no antes de una v2 (hoy fuera de la v1) | Cuenta o perfil del comensal: contradice la regla 10 y «Qué NO construir» | Rompe el principio de comensal anónimo |

**Sin vender datos y sin datos personales del comensal en el servidor** en ninguna fila.

## 8. Plataformas de referencia (verificadas en fuente primaria o marcadas)

- **Airbnb:** esquema compartido: la mayoría de los anfitriones paga 3 %; esquema único: la mayoría paga 15.5 % (el texto dice que el compartido «se está retirando»). Fuente: https://www.airbnb.com/help/article/63 (sin fecha en la página; consultada el 2026-11-17).
- **YouTube:** 55 % de los ingresos netos por anuncios de los videos en la página de reproducción (en Shorts, 45 % de lo asignado al fondo de creadores). Fuente: https://support.google.com/youtube/answer/72902 (sin fecha en la página (©2026 Google); consultada el 2026-11-17).
- **Meta:** 97.6 % de los ingresos viene de publicidad en el año fiscal 2025: cálculo propio sobre el 10-K (196,175 de 200,966 millones de USD); el 10-K dice que genera «substantially all» de sus ingresos vendiendo anuncios. Fuente: https://www.sec.gov/Archives/edgar/data/1326801/000162828026003942/meta-20251231.htm (10-K del año fiscal terminado el 31-dic-2025; consultada el 2026-11-17).
- **Uber:** la tarifa de servicio al conductor ya no es fija: varía por viaje y la meta es acercarse a 25 %. Fuente: https://help.uber.com/en/driving-and-delivering/article/understanding-ubers-variable-service-fee?nodeId=7448ffcc-ab98-4a32-b7fc-e9c17a58bb41 (sin fecha en la página; consultada el 2026-11-17).
- **BlaBlaCar:** tarifa de reserva al pasajero (modelo de comisión en un mercado de dos lados). **No verificada** (mencionada por Calvin como ejemplo; no se buscó su cifra en fuente primaria).
- **Booking.com:** alrededor de 15 % de comisión estándar y 2–8 % más por visibilidad (Preferente, Genius). **No verificada** (las páginas oficiales de partner.booking.com devolvieron 403 y las cifras que circulan vienen de blogs y foros; el dato primario es el contrato o el extranet de cada alojamiento).
- **Spotify:** alrededor de 70 % de los ingresos a titulares de derechos. **No verificada** (la fuente primaria más cercana (Spotify Newsroom, 11 de mayo de 2026) dice «cerca de dos tercios»; el 70 % sólo aparece en prensa).
- **DiDi:** alrededor de 20 % de comisión al conductor. **No verificada** (la página de DiDi México no publica un porcentaje; el 16 % que aparece es IVA sobre la tarifa de servicio, no la comisión).

**Lectura (de la investigación de Calvin, como hipótesis):** en servicios físicos y caros las plataformas cobran **comisión por transacción** al que gana; en servicios digitales masivos, **gratuito con anuncios más suscripción**; además cobran por **visibilidad** dentro de la plataforma. Carta v1 usa lo segundo (suscripción y anuncios); la comisión exigiría procesar pagos, que la v1 no hace.

## 9. Datos por conseguir
- **Curva de pago y precio de Master Chef:** prueba de tres precios del piloto.
- **Tarifa de anuncios, parte con anuncio y aprobación de la red:** prueba pequeña con 3 restaurantes.
- **Cuánto pagaría un patrocinador y qué parte de restaurantes aceptaría:** prueba con 3 patrocinadores después de la Fase 3.
- **Ventas, ticket y parte que pasaría por Carta:** carta y ventas reales de los negocios del piloto (el dato del INEGI es un promedio de la clase 722511).
- **Sueldo que Calvin quiere:** lo elige Calvin; el modelo lo resta del margen.
