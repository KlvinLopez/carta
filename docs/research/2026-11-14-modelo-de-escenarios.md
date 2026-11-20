# Modelo de escenarios de Carta: dos planes (Chef y Master Chef), el peor caso real y qué hay que medir

**Fecha:** 17 de noviembre de 2026 (ronda 8, sobre la decisión de Calvin de dos planes) · **Rama:** `agente/planes-precio-historial` · **La v1 no cobra ni tiene planes.** Lo genera `2026-11-14-corre-escenarios.mjs` desde el modelo: ninguna cifra se transcribe a mano.

## Conclusiones

1. **Decisión de Calvin (17 de noviembre): dos planes, no tres.** «Quiero que Chef sea de 0 a 5 personas, … unas 6 mesas, … una sola cuenta … Chef Ejecutivo lo podemos dejar a una futura escalación.» **Chef (gratis) = 6 mesas y 1 cuenta de personal; Master Chef (225) = todo lo que pase de ahí, hasta los topes técnicos (500 mesas y 50 personas activas); Chef Ejecutivo queda apagado (no borrado).**
2. **Con el modelo de mesas y cuentas (supuesto; sólo los conteos por estrato son medidos), cabe en Chef el 48.4 % de los negocios de 0 a 5 personas (rango 42.4 %–54.5 %); el 51.6 % cae en Master Chef porque querría más de una cuenta, y de los de 6 a 10 personas cae el 100 %.** Con la cota baja de platillos (sitios propios) cabe sólo el 25.6 %.
3. **Cifras de titular que cambian (1,000 restaurantes, curva media):** clientes de paga 116 (antes 30); ingreso por cliente de paga 225 (antes 266) pesos (ya sin el plan de 1,099); parte que rebasa Chef 66.2 (antes 17.4) %; **margen de operación al mes: recomendado +14,752 (antes +8,719), peor −1,513 (antes −47), mejor +59,123 (antes +32,655), piso de verdad −5,433 (antes −2,031).** La base es mucho más rica en pagantes **si** el supuesto de «una cuenta por negocio de 0 a 5 personas» se sostiene: lo mide el piloto.
4. **Una sola cuenta frente al ADR-017** (el dueño es el validador y el primer mesero): el plan gratuito es **operación de una persona con un PIN**; el dueño recibe y atiende las comandas en su propio teléfono, sin mesero aparte ni capitán.
5. **Peor caso real (todos gratuitos): con 1,000 pesos al mes de bolsa caben 282 restaurantes gratuitos (rango 164 a 282 según el soporte, sin fuente), con el canal de eventos construido; los anuncios pagan el sistema desde 277 (rango 101 a imposible) restaurantes con la tarifa baja** (son rangos, no puntos). **Qué medir primero: curva · mediana, curva · techo, cuántos rebasan los topes.**

**Supuesto de historial en TODAS las cifras de costo, bolsa, margen y escalón: la política VIGENTE (03 §7).** El plan gratuito conserva **24 meses de sesiones y 13 de analítica** (lo que dice 03 §7 para todos los planes; hoy nada purga). **Recortar el historial del gratuito a 30 días es una PROPUESTA, decisión pendiente de Calvin, que contradice 03 §7;** va al lado, rotulada:

| Historial del plan gratuito | Margen recomendado, 1,000 restaurantes | Peor | Mejor | Estrés | Gratuitos que sostiene un pagante (sin anuncios) | Mes 12 (300 restaurantes): margen de operación | Sueldo de 1 salario mínimo: restaurantes en régimen |
|---|---|---|---|---|---|---|---|
| Política vigente (03 §7: 24 meses de sesiones y 13 de analítica) | +14,752 | −1,513 | +59,123 | −5,433 | 35 | +3,596 | 760 |
| El gratuito acumula 12 meses (sin purga) | +15,878 | −375 | +60,212 | −4,294 | 46 | +5,229 | 700 |
| PROPUESTA: el gratuito guarda 30 días (decisión pendiente de Calvin) | +18,591 | +2,388 | +61,364 | −1,532 | 144 | +5,292 | 600 |

**Qué mueve cada escenario** (margen de operación con 1,000 restaurantes; «peor» no es lo peor):

| Escenario | Qué mueve | Con la política vigente | Con la propuesta de 30 días |
|---|---|---|---|
| Recomendado: curva media, anuncios en tarifa baja, soporte de la paga en su valor central | nada: es el caso central | +14,752 | +18,591 |
| Sólo anuncios: nunca llegan (cero anuncios) | los anuncios | +12,468 | +16,308 |
| Sólo la curva de pago: pesimista | quién paga | +1,009 | +4,910 |
| Sólo la curva de pago: optimista | quién paga | +54,335 | +56,576 |
| Sólo el soporte de la paga: 30 pesos al mes por cliente | el soporte de la paga | +18,229 | +22,068 |
| Sólo el soporte de la paga: 150 pesos al mes por cliente | el soporte de la paga | +4,322 | +8,162 |
| «Peor» de las rondas anteriores: curva pesimista y cero anuncios (soporte central) | quién paga y los anuncios, no el soporte | −1,513 | +2,388 |
| Piso con cero anuncios: curva pesimista, cero anuncios y todos los soportes (gratuito, paga) al máximo de su rango | los tres ejes | −6,063 | −2,162 |
| Estrés (el «piso de verdad» de las rondas anteriores): curva pesimista, anuncios adversos y todos los soportes al máximo | los tres ejes | −5,433 | −1,532 |

**El precio de la curva media no es un resultado.** La mediana supuesta (225) es el precio de Meniu y el elegido (225): la conversión y los pagantes del titular salen de esa igualdad. El techo 0.35 (parte máxima de los que rebasan los topes que llegaría a pagar) es un SUPUESTO sin dato; rango de la tabla 0.2 a 0.5. Se mide con la prueba de precio del piloto.

| Historial del gratuito | Mediana real de lo que pagaría un negocio | Techo (SUPUESTO) | Conversión al precio elegido | Pagantes por 1,000 | Margen con 1,000 restaurantes |
|---|---|---|---|---|---|
| política vigente (03 §7) | 150 | 0.2 | 5 % | 33 | +2,440 |
| política vigente (03 §7) | 150 | 0.35 | 8.7 % | 58 | +6,125 |
| política vigente (03 §7) | 150 | 0.5 | 12.5 % | 83 | +9,810 |
| política vigente (03 §7) | 225 | 0.2 | 10 % | 66 | +7,370 |
| política vigente (03 §7) | 225 | 0.35 | 17.5 % | 116 | +14,752 |
| política vigente (03 §7) | 225 | 0.5 | 25 % | 166 | +22,134 |
| política vigente (03 §7) | 300 | 0.2 | 13.7 % | 91 | +10,996 |
| política vigente (03 §7) | 300 | 0.35 | 23.9 % | 159 | +21,098 |
| política vigente (03 §7) | 300 | 0.5 | 34.2 % | 227 | +31,200 |
| propuesta de 30 días | 150 | 0.2 | 5 % | 33 | +6,335 |
| propuesta de 30 días | 150 | 0.35 | 8.7 % | 58 | +10,003 |
| propuesta de 30 días | 150 | 0.5 | 12.5 % | 83 | +13,672 |
| propuesta de 30 días | 225 | 0.2 | 10 % | 66 | +11,242 |
| propuesta de 30 días | 225 | 0.35 | 17.5 % | 116 | +18,591 |
| propuesta de 30 días | 225 | 0.5 | 25 % | 166 | +25,940 |
| propuesta de 30 días | 300 | 0.2 | 13.7 % | 91 | +14,852 |
| propuesta de 30 días | 300 | 0.35 | 23.9 % | 159 | +24,908 |
| propuesta de 30 días | 300 | 0.5 | 34.2 % | 227 | +34,965 |

*Todo lo demás de este informe usa la política vigente (03 §7).* La bolsa de 1,000 pesos carga 282 restaurantes con la política vigente.

**Recomendado** = curva de pago media (mediana de Master Chef = 225, el precio de Meniu Business) y anuncios en la tarifa baja ya en marcha · **Peor** = curva de pago pesimista y SIN anuncios en ningún mes (los costos los pone Calvin de su bolsa) · **Mejor** = curva de pago optimista y anuncios en la tarifa media · **Piso de verdad** = curva pesimista, anuncios adversos (mitad de la tarifa baja, anuncio en el 30 % de las visitas) y soporte al máximo de su rango. *Cada escenario mueve dos ejes a la vez (curva de pago y anuncios): la matriz de §5 los separa.*

**Qué cambió en la ronda 8 (API del `.mjs`, versión `2026-11-17-r14`).** `configInicial()` pasa a **dos planes** (Chef 6 mesas · 1 cuenta · 150 platillos; Master Chef 225; `precios.salon = 0`: Chef Ejecutivo apagado); la anterior es `configTresPlanes25Mesas()`. Nuevo: `coberturaEstratos`, `desgloses`, `escalera` dinámica en `recursos(config, s, estado)` (`estado = {canal, meses_historial}` y `config.palancas`; no modifica sus entradas). La rejilla de mesas y cuentas llega a 4 mesas y 1 cuenta.

---

## 1. Los dos planes, traducidos a topes

**Clientes potenciales = 104,882** (DENUE, mayo de 2026 [medido]): 0 a 5 personas **73,193** y 6 a 10 **17,855** (Chef antes: 91,048); 11 o más **13,834** (todos pasan a Master Chef). **Carta no sabe cuánta gente trabaja en un negocio**, así que la frontera de Calvin se traduce a topes con el modelo de mesas y cuentas (cuentas = ⌈f × personas⌉, f = 0.35 a 0.50; mesas = cuentas × m × exp(σ·z), m = 2.5 a 4, **σ = 0.5, rango 0 a 0.75: supuesto sin dato**). «Cuentas» = las que el negocio querría crear: con f ≥ 0.35 un negocio de 3 personas ya quiere 2. **Medido: sólo los conteos por estrato. El piloto debe medir mesas y cuentas por negocio.**

| Estrato | Dentro de Chef (6 mesas · 1 cuenta): centro | Rango del modelo (mín – máx) | Cae en Master Chef |
|---|---|---|---|
| 0 a 5 personas | **48.4 %** | 42.4 % – 54.5 % | 51.6 % |
| 6 a 10 personas | **0 %** | 0 % – 0 % | 100 % |

(con 150 platillos y la cota alta, 98 % de cobertura de platillos ya incluida; con la cota baja, 0 a 5 personas dentro: 25.6 %).

**Alternativas de topes para el gratuito** (centro; margen recomendado con 1,000 restaurantes):

| Mesas · cuentas | Negocios de 0 a 5 personas dentro | Negocios de 6 a 10 personas que caen en Master Chef | Pagantes por 1,000 | Margen de operación |
|---|---|---|---|---|
| 5 · 1 (alternativa de 5 mesas) | 48.4 % | 100 % | 115.9 | +15,435 |
| 6 · 1 **(decidido)** | 48.4 % | 100 % | 115.9 | +14,752 |
| 6 · 2 | 66.5 % | 100 % | 93.8 | +11,469 |
| 8 · 2 | 76.2 % | 100 % | 82 | +9,377 |
| 10 · 3 | 85.9 % | 69.7 % | 61.1 | +5,969 |

**Cobertura por platillos: DOS COTAS de sesgo opuesto (SUPUESTO; no se sabe la real).** Con 150 platillos contando todo: **52 % (sitios propios, cota baja; 56 cartas) a 98 % (reparto, cota alta; en esa muestra sólo 40 a 120 están medidos y el 150 es extrapolación)**; dentro de 150, por tipo: fondas y taquerías 7 de 8, cafeterías 9 de 11, casuales 9 de 21, formales 3 de 14. Las dos muestras no cuentan «platillo» con la misma regla (148 cartas de reparto: cortas; sitios propios: largas y formales).

### Tope de platillos del plan Chef: «cuenta todo» DECIDIDO; el VALOR del tope REABIERTO (17 de noviembre de 2026)

**Decisión de Calvin:** «el tope de platillos incluye bebidas… considera que cuenta todo, bebidas incluidas». **Después la reabrió:** «según yo no quedamos en 150, se me hace demasiado. Quisiera saber si el tema de platillos mueve mucho nuestras gráficas». Lo que cuesta cada platillo, medido y supuesto, está en `2026-11-17-costo-de-platillo.md`. **De 50 a 150 platillos (con la mezcla de gratuitos y de paga fija): el disco de la base casi no se mueve (caben 0.2 % menos restaurantes: 557 bytes por platillo); el procesador pierde 3.8 % con el sondeo de hoy y hasta 19.3 % con avisos (cota alta: se supone que el menú se arma cada 30 s en la hora pico, de 7 a 16 ms); NINGUNO de los dos se acaba por el tope (a mezcla de paga fija; el tope sí mueve quién paga: ver lo que sí mueve): el cuello de botella sigue siendo disco (182 restaurantes con avisos y 173 con el sondeo, con el historial a 30 días). Lo que sí crece es el almacenamiento de fotos en R2 (de 0.12 a 0.37 GB por restaurante, sobre todo por los originales, que son un supuesto; pasarse de lo gratis cuesta 0.10 pesos al mes por restaurante) y el menú que baja el teléfono (de 38 a 113 KB); y el tope cambia cuántos negocios pasan a pagar (de 137 a 116 de paga por cada 1,000).**

| Tope (cuenta todo) | Caben, cota baja (sitios propios) | Caben, cota alta (reparto) | De 0 a 5 personas dentro de Chef (baja a alta) | De paga por cada 1,000 | Restaurantes con foto que caben en R2 gratis |
|---|---|---|---|---|---|
| 50 | 15 % | 63 % | 7.2 % a 31.1 % | 137 | 80 (rango 30 a 242) |
| 80 | 25 % | 89 % | 12.3 % a 44.1 % | 121 | 50 (rango 18 a 151) |
| 100 | 29 % | 96 % | 14.1 % a 47.4 % | 117 | 40 (rango 15 a 121) |
| 150 | 52 % | 98 % | 25.6 % a 48.4 % | 116 | 26 (rango 10 a 80) |

*Bajar el tope no ahorra disco ni procesador de forma apreciable: lo que mueve es cuántos negocios pagan (cobertura) y el peso de las fotos en R2. El valor del tope queda a decisión de Calvin.*

**Alternativas descartadas el 17 de noviembre de 2026** (sólo comida, 200, 300, sin tope; quedan como referencia, no como opciones abiertas). Menos cobertura = más gente obligada a pagar: el margen «sube» a costa de cobrar a quien debía ser gratis y de que acepten pagar (supuesto).

| Alternativa descartada | Dentro de Chef (0 a 5 personas), cota baja | Dentro de Chef (0 a 5 personas), cota alta | Margen con la cota baja | Margen con la cota alta |
|---|---|---|---|---|
| Tope de 150 que cuenta sólo comida (las bebidas no tienen tope) | 49.4 % | 48.4 % | +14,573 | +14,752 |
| Subir el tope a 200 platillos (bebidas incluidas) | 36.2 % | 48.6 % | +16,946 | +14,684 |
| Subir el tope a 300 platillos (bebidas incluidas) | 41.4 % | 48.9 % | +15,925 | +14,570 |
| Quitar el tope de platillos y limitar sólo por mesas y cuentas | 49.4 % | 49.4 % | −∞ | −∞ |

*«No se sabe la cobertura real»: el dato que sigue pendiente es la carta real de los negocios del piloto, contada con la instrucción de conteo de la muestra.*

## 2. Precio: Master Chef pegado a Meniu

**225 es una decisión de posicionamiento de Calvin (quedar pegado a Meniu Business), no un resultado del modelo**: la curva «media» se construyó con mediana 225 y por eso el óptimo sale cerca (234). Ver [precio de entrada](2026-11-14-precio-de-entrada.md). **Chef Ejecutivo queda apagado** (futura escalación: precio y topes en `configTresPlanes25Mesas()`).

Cada precio con tres curvas (pesimista · media · optimista), **1,000 restaurantes registrados**. «Sin pérdidas» = margen de operación **y** después de captación ≥ 0 (con anuncios en marcha · sin anuncios todavía).

| Master Chef | Pagantes de Master Chef | Margen de operación (con anuncios) | Después de captación | Margen de operación **sin anuncios** | Equilibrio sin anuncios (pagantes) | ¿Sin pérdidas? (con anuncios · sin) |
|---|---|---|---|---|---|---|
| **199** | 31.6 · 134.7 · 387.8 | +1,437 · +14,213 · +45,575 | +869 · +11,789 · +38,595 | −1,065 · +11,978 · +43,994 | 43.7 | sí · no |
| **225** | 23.4 · 115.9 · 382.2 | +1,009 · +14,752 · +54,335 | +587 · +12,666 · +47,456 | −1,513 · +12,468 · +52,739 | 36 | sí · no |
| **249** | 17.7 · 100.3 · 375.7 | +561 · +14,733 · +61,957 | +243 · +12,927 · +55,194 | −1,976 · +12,409 · +60,345 | 31 | sí · no |
| **299** | 9.8 · 73.7 · 358.8 | −323 · +13,661 · +76,127 | −500 · +12,335 · +69,668 | −2,881 · +11,268 · +74,471 | 24 | no · no |

**Lectura.** (1) **Master Chef: 199 a 299 cambia los pagantes** (de 135 a 74 con la curva media) **y el margen** (de +14,213 a +13,661): con la base de dos planes el precio pesa más que antes, porque ya no hay plan de 1,099 que lo diluya. (2) **Sin anuncios, con la curva pesimista y 1,000 restaurantes**, a 225 el margen es −1,513 al mes: ese periodo lo paga Calvin.

## 2b. La meta de 300 restaurantes a 12 meses, en dinero

Meta supuesta: **300 restaurantes a 12 meses** (adopción supuesta). Pesos al mes del mes 12 y acumulado de los 12 meses; peor = sin anuncios en ningún mes.

| | Recomendado | Peor | Mejor |
|---|---|---|---|
| De paga en el mes 12 | 35 | 7 | 115 |
| Ingreso por suscripción, mes 12 | 7,822 | 1,581 | 25,797 |
| Ingreso por anuncios, mes 12 | 685 | 0 | 1,915 |
| **Ingresos, mes 12** | **8,507** | **1,581** | **27,712** |
| Costos, mes 12 (servidor · almacenamiento · soporte · comisión) | 4,911 (2,050 · 143 · 2,219 · 500) | 2,865 (2,050 · 146 · 568 · 101) | 10,805 (2,050 · 135 · 6,972 · 1,649) |
| **Margen de operación, mes 12** | **+3,596** | **−1,284** | **+16,907** |
| Margen después de captación, mes 12 | −267 | −2,065 | +4,167 |
| **Acumulado de 12 meses: ingresos** | 37,400 | 7,132 | 122,276 |
| Acumulado de 12 meses: costos | 18,947 | 9,689 | 45,613 |
| **Acumulado de 12 meses: margen de operación** | +18,453 | −2,557 | +76,663 |
| Acumulado de 12 meses: margen después de captación | −4,603 | −7,218 | +626 |

## 2c. El potencial del plan Chef, en dinero (techo teórico)

**Si todos los negocios que caerían en Chef estuvieran en Carta**, dejarían en anuncios al mes (no todos estarían; es un techo): **35,427 negocios en Chef** (de 104,882 clientes potenciales) → **91,508 pesos con la tarifa baja, 366,032 con la media y 967,370 con la alta** (2.6 · 10.3 · 27.3 pesos por negocio al mes). Rango por visitas con la app y parte con anuncio dentro de sus rangos: 5,952 a 2,752,680. **Supuestos:** sólo los conteos por estrato son medidos; el reparto entre Chef y Master Chef sale del modelo de mesas y cuentas con dispersión; todos con las visitas con la app del gratuito típico (supuesto, más altas que las de una fonda de 0 a 5 personas) y la parte de visitas con anuncio del modelo; la tarifa por mil visitas no tiene dato; techo teórico: no cuenta que no todos estarían en Carta.

| Tramo de tamaño (personas) | Negocios [medido] | En Chef (modelo) | En Master Chef | Negocios en Chef | Anuncios al mes con la tarifa baja |
|---|---|---|---|---|---|
| 0 a 5 | 73,193 | 48.4 % | 51.6 % | 35,427 | 91,508 |
| 6 a 10 | 17,855 | 0 % | 100 % | 0 | 0 |
| 11 a 30 | 10,809 | 0 % | 100 % | 0 | 0 |
| 31 a 50 | 2,263 | 0 % | 100 % | 0 | 0 |
| 51 a 100 | 542 | 0 % | 100 % | 0 | 0 |
| 101 a 250 | 193 | 0 % | 100 % | 0 | 0 |
| 251 o más | 27 | 0 % | 100 % | 0 | 0 |

## 3. La pregunta del peor caso: todos gratuitos

*«¿Hasta qué punto puedo tener restaurantes que todos son gratuitos, cuántos comensales, y todavía sostener el sistema con sólo anuncios?»* Todos los registrados son gratuitos. **Comensales al mes** = restaurantes × 113.9 comensales al día × 30: dato **simulado (perfiles supuestos)**, más alto de lo que tendría una fonda de 0 a 5 personas. «Costo al mes» = servidor, almacenamiento y soporte (**0.5 pesos por gratuito: supuesto sin fuente, rango 0 a 3**).

| Restaurantes gratuitos | Comensales al mes (simulado) | **Costo al mes sin anuncios** (pone Calvin) | Resultado con anuncios, tarifa baja | Adverso (mitad de tarifa, 30 % de visitas) | Tarifa media | Escalón de servidor |
|---|---|---|---|---|---|---|
| 10 | 20,502 | 200 | −174 | −194 | −97 | hobby_eventos |
| 25 | 51,255 | 216 | −151 | −199 | +43 | hobby_eventos |
| 50 | 102,510 | 464 | −334 | −431 | +53 | pro_2 |
| 100 | 205,020 | 519 | −260 | −454 | +514 | pro_2 |
| 200 | 410,040 | 629 | −113 | −500 | +1,437 | pro_2 |
| 300 | 615,060 | 2,346 | −1,572 | −2,153 | +753 | pro_8 (extrapolación) |
| 500 | 1,025,100 | 2,546 | −1,255 | −2,223 | +2,620 | pro_8 (extrapolación) |
| 750 | 1,537,650 | 3,801 | −1,864 | −3,317 | +3,948 | pro_8 (extrapolación) |
| 1,000 | 2,050,200 | 5,056 | −2,473 | −4,410 | +5,276 | pro_8 (extrapolación) |
| 1,500 | 3,075,300 | 7,566 | −3,692 | −6,598 | +7,932 | pro_8 (extrapolación) |
| 2,000 | 4,100,400 | 10,076 | −4,910 | −8,785 | +10,588 | pro_8 (extrapolación) |
| *Zona extrapolada (sin medir)* | | | | | | |
| 3,000 | 6,150,600 | 14,091 | −6,342 | −12,154 | +16,905 | pro_8 (extrapolación) |
| 5,000 | 10,251,000 | 23,126 | −10,211 | −19,898 | +28,534 | pro_8 (extrapolación) |
| 10,000 | 20,502,000 | 46,217 | −20,387 | −39,759 | +57,103 | pro_8 (extrapolación) |

**Desde cuántos restaurantes se paga solo, como rango** (con los otros supuestos en su valor de trabajo; «imposible» = no se paga solo con ≤ 3000 restaurantes):

| Caso | Centro | Mínimo – máximo entre variantes | Qué lo mueve (bajo · alto) |
|---|---|---|---|
| Tarifa baja | **277** | 101 – imposible | tarifa de anuncios: la mitad → no se paga solo, el doble → 101; visitas con anuncio: la mitad → no se paga solo, el doble → 128; soporte por cliente gratuito: 0 pesos → 207, 3 pesos (el máximo de su rango) → no se paga solo; visitas con la app por gratuito: la mitad → no se paga solo, el doble → 101 |
| Tarifa media | **21** | 10 – 101 | tarifa de anuncios: la mitad → 101, el doble → 10; visitas con anuncio: la mitad → 101, el doble → 12; soporte por cliente gratuito: 0 pesos → 20, 3 pesos (el máximo de su rango) → 28; visitas con la app por gratuito: la mitad → 101, el doble → 10 |
| Adverso | **no se paga solo** | ∞ – imposible | tarifa de anuncios: la mitad → no se paga solo, el doble → no se paga solo; visitas con anuncio: la mitad → no se paga solo, el doble → no se paga solo; soporte por cliente gratuito: 0 pesos → no se paga solo, 3 pesos (el máximo de su rango) → no se paga solo; visitas con la app por gratuito: la mitad → no se paga solo, el doble → no se paga solo |

**La bolsa de Calvin, como rango** (restaurantes gratuitos que caben con la carga de sus topes: 1,080 visitas al mes cada uno, la misma definición que usa «¿Qué nos limita?», según el soporte por gratuito):

| Bolsa al mes | Centro (soporte 0.5) | Mínimo – máximo | Por soporte (pesos por gratuito → restaurantes) |
|---|---|---|---|
| 500 | **83** | 28 – 151 | 0 → 151 · 0.5 → 83 · 1 → 57 · 3 → 28 |
| 1,000 | **282** | 164 – 282 | 0 → 282 · 0.5 → 282 · 1 → 282 · 3 → 164 |
| 2,000 | **282** | 282 – 282 | 0 → 282 · 0.5 → 282 · 1 → 282 · 3 → 282 |
| 5,000 | **943** | 566 – 1,132 | 0 → 1,132 · 0.5 → 943 · 1 → 849 · 3 → 566 |

**Respuesta en una frase:** con 1,000 pesos al mes de mi bolsa caben 282 restaurantes gratuitos (rango 164 a 282) y 0.6 millones de comensales al mes; **con el canal de eventos construido**; con el sondeo de hoy caben 28. Con anuncios se paga solo desde 277 (rango 101 a imposible) restaurantes (tarifa baja).

**Qué no está modelado** en el ingreso por anuncios: moderación de anuncios (revisar y bloquear categorías); tasa de llenado y bloqueadores (van dentro de `parte_visitas_con_anuncio`, sin modelar por separado); comisión de la red de anuncios; impuestos sobre los ingresos de anuncios y de suscripción. **El 0.6 de visitas con la app y el 0.6 de visitas con anuncio no son el mismo descuento contado dos veces:** el primero es cuántos comensales abren la app (simulador), el segundo en cuántas de esas visitas se sirve un anuncio que paga; coinciden en el número y los dos son supuestos sin dato.

**Conciliación con [planes-y-costo §0](2026-11-13-planes-y-costo-por-restaurante.md).** Ese documento da **110–140 USD al mes de base fija para 1,000 restaurantes [estimada, ±2×, con el sondeo de hoy]**; este modelo da **≈ 245 USD de servidor, disco y fotos** (sin el soporte de 500 pesos) para 1,000 gratuitos en el escalón pro_8. **No contradicen: son dos mundos.** El del documento supone que cada teléfono pregunta cada 3 s (sondeo), que es lo que corre hoy; el del modelo supone el canal de eventos (ADR-018, **no construido**), con el que cada restaurante carga mucho menos al procesador. **Hasta que T-3.20 y T-3.21 existan, vale el del documento (110–140 USD); el del modelo es una meta, no un costo vigente.**

## 4. Todas las cifras en cuatro casos

**Recomendado** = curva de pago media (mediana de Master Chef = 225, el precio de Meniu Business) y anuncios en la tarifa baja ya en marcha · **Peor** = curva de pago pesimista y SIN anuncios en ningún mes (los costos los pone Calvin de su bolsa) · **Mejor** = curva de pago optimista y anuncios en la tarifa media · **Piso de verdad** = curva pesimista, anuncios adversos (mitad de la tarifa baja, anuncio en el 30 % de las visitas) y soporte al máximo de su rango. *Cada escenario mueve dos ejes a la vez (curva de pago y anuncios): la matriz de §5 los separa.*

| Cifra | Recomendado | Peor | Mejor | Piso de verdad | Qué es |
|---|---|---|---|---|---|
| Clientes potenciales (negocios) | **104,882** | 104,882 | 104,882 | 104,882 | dato medido (DENUE 05/2026): no varía con los escenarios |
| Restaurantes registrados que caben, con la mezcla de gratuitos y de paga, con la política vigente de historial (03 §7: el gratuito guarda 24 meses de sesiones y 13 de analítica) (restaurantes) | **28** | 28 | 285 | 28 | política vigente (03 §7); recomendado = Hobby con avisos; peor = Hobby con sondeo; mejor = Pro de 8 procesos; cada uno es el menor de los recursos con la carga por topes (la misma cuenta de `recursos`) |
| Restaurantes registrados que caben con la PROPUESTA de historial del gratuito a 30 días (decisión pendiente de Calvin; contradice 03 §7) (restaurantes) | **182** | 173 | 1,823 | 173 | si Calvin aprueba recortar el historial del gratuito a 30 días (con archivo descargable) |
| Restaurantes registrados que caben SIN purga (12 meses de historial acumulado), con la mezcla de gratuitos y de paga (restaurantes) | **41** | 41 | 413 | 41 | lo que hay hoy: nada limpia; el disco manda desde el segundo mes de operación |
| Gratuitos que sostiene cada cliente de paga (sin anuncios) (restaurantes) | **35.1** | 28.1 | 53.3 | 6.1 | con anuncios en marcha cada gratuito se paga solo si deja más de lo que cuesta (`se_paga_solo`) |
| Ingreso por cliente gratuito (pesos al mes) | **2.6** | 0 | 10.3 | 0.6 | sólo anuncios |
| Ingreso por cliente de paga (pesos al mes) | **225** | 225 | 225 | 225 | promedio entre Master Chef y Chef Ejecutivo según cuántos hay de cada uno |
| Costo por cliente gratuito (pesos al mes) | **3.9** | 4.8 | 2.7 | 7.3 | servidor, almacenamiento y soporte |
| Margen de operación (pesos al mes) | **+14,752** | −1,513 | +59,123 | −5,433 | sin captación ni sueldos |
| Margen después de captación (pesos al mes) | **+12,666** | −1,935 | +52,243 | −5,854 | resta reponer las bajas y los sueldos (parámetros sin dato) |
| Punto de equilibrio (clientes de paga) | **17.3** | 36.9 | 0 | 153.9 | cuántos clientes de paga hacen falta para no perder (el peor caso lo calcula sin anuncios) |
| Comensales al mes (comensales) | **2,474,891** | 2,136,055 | 3,450,816 | 2,136,055 | dato por restaurante SIMULADO (perfiles del simulador), no medido |

*Techo teórico «todos pagan» (1,000): +146,169 pesos al mes; no se usa como cota.*

## 5. Matriz curva × anuncios (margen de operación, 1,000 restaurantes) y esperado a 100, 1,000 y 10,000

| Curva de pago | Sin anuncios | Tarifa baja | Tarifa media |
|---|---|---|---|
| pesimista | −1,513 | +1,009 | +8,576 |
| media | +12,468 | +14,752 | +21,603 |
| optimista | +52,739 | +54,335 | +59,123 |

**Piso de verdad** (pesimista, anuncios adversos y soporte al máximo de su rango): **−5,433**.

| Restaurantes | Peor | Recomendado | Mejor | Piso de verdad |
|---|---|---|---|---|
| 100 | −165 → −207 | **+1,459 → +1,250** | +5,888 → +5,200 | −557 → −599 |
| 1,000 | −1,513 → −1,935 | **+14,752 → +12,666** | +59,123 → +52,243 | −5,433 → −5,854 |
| 10,000 | −10,789 → −15,006 | **+152,871 → +132,012** | +596,576 → +527,784 | −49,982 → −54,198 |

*(margen de operación → después de captación)*

## 6. Qué supuesto mueve más el margen, en llano (1,000 restaurantes, recomendado)

**Qué medir primero en el piloto:** 1. curva · mediana → prueba de precio del piloto (Van Westendorp y escalera) · 2. curva · techo → prueba de precio del piloto: cuántos de cada 10 aceptan · 3. cuántos rebasan los topes → mesas y cuentas reales de los primeros 10 a 20 restaurantes · 4. soporte por cliente de paga → tickets y minutos de soporte del piloto · 5. tarifa de anuncios → prueba pequeña de AdSense con 3 restaurantes.

| Qué pasa si… | Efecto en el margen (pesos al mes) |
|---|---|
| Si cuánto está dispuesto a pagar el dueño promedio fuera la mitad de lo que supusimos, el margen baja de 14,752 a 1,798; si fuera una vez y media, sube a 23,379. | 21,580 |
| Si qué parte de los que rebasan los topes llega a pagar fuera la mitad de lo que supusimos, el margen baja de 14,752 a 6,139; si fuera una vez y media, sube a 23,365. | 17,225 |
| Si cuántos negocios pasan del tope de mesas o cuentas del plan gratuito fuera la mitad de lo que supusimos, el margen baja de 14,752 a 6,400; si fuera una vez y media, sube a 23,105. | 16,705 |
| Si cuánto tiempo de soporte requiere cada cliente de paga fuera la mitad de lo que supusimos, el margen sube de 14,752 a 18,229; si fuera una vez y media, baja a 11,276. | 6,953 |
| Si cuánto deja cada mil visitas con anuncio fuera la mitad de lo que supusimos, el margen baja de 14,752 a 13,610; si fuera una vez y media, sube a 15,894. | 2,284 |
| Si en qué parte de las visitas se ve un anuncio fuera la mitad de lo que supusimos, el margen baja de 14,752 a 13,610; si fuera una vez y media, sube a 15,894. | 2,284 |
| Si cuántas visitas con la app tiene cada restaurante gratuito fuera la mitad de lo que supusimos, el margen baja de 14,752 a 13,610; si fuera una vez y media, sube a 15,894. | 2,284 |
| Si qué parte de los clientes de paga paga con tarjeta (y sufre la comisión) fuera la mitad de lo que supusimos, el margen sube de 14,752 a 15,585; si fuera una vez y media, sube a 14,752. | 833 |

## 7. Crecimiento mes a mes (adopción **supuesta**: 300 restaurantes a 12 meses y 1200 a 24; anuncios desde el mes 9)

Margen de operación al mes. Peor = sin anuncios en ningún mes; recomendado: anuncios desde el mes 9.

| Mes | Restaurantes | De paga (recomendado) | Peor | **Recomendado** | Mejor | Piso de verdad | Escalón |
|---|---|---|---|---|---|---|---|
| 3 | 19 | 2 | −142 | **+123** | +885 | −229 | hobby_eventos (sin anuncios todavía) |
| 6 | 75 | 9 | −226 | **+821** | +3,835 | −567 | pro_2 (sin anuncios todavía) |
| 9 | 169 | 20 | +3 | **+2,747** | +10,232 | −660 | pro_2 |
| 12 | 300 | 35 | −1,284 | **+3,596** | +16,907 | −2,459 | pro_8 |
| 18 | 675 | 78 | −1,335 | **+9,644** | +39,594 | −3,980 | pro_8 |
| 24 | 1,200 | 139 | −2,010 | **+17,509** | +70,753 | −6,713 | pro_8 |
| 36 | 2,700 | 313 | −3,221 | **+40,696** | +160,496 | −13,803 | pro_8 |

**Primer mes con margen de operación positivo (recomendado): 3; después de captación: 10.** **Lo más que tendría que poner Calvin, acumulado: 5,550 pesos** (peor: 98,706; piso de verdad: 231,283). *Artefacto de la curva de adopción supuesta y del costo de captación sin dato.* **Más de ≈ 290 restaurantes registrados exige otra arquitectura: todo costo de ahí en adelante es extrapolación sin medir.**

## 8. Dos mensajes y un dato de contexto

- **Dónde está el valor** (calculado): Para un negocio de 11 a 50 personas, Carta (225 pesos al mes) cuesta alrededor de la cuarta parte de lo que ya paga por un punto de venta como Fudo Pro (838), y 0.03 % de lo que vende en promedio al mes. *Advertencia: Promedio (total ÷ negocios), no mediana, de la clase 722511 (restaurantes con servicio completo) en los Censos Económicos 2024, año de referencia 2023: quedan fuera antojitos, tacos y cafeterías; un promedio lo jalan los grandes. Dato por conseguir: mediana y otras clases.*
- **Qué significa el precio** (calculado): Si el dueño típico pagaría alrededor de 150, conviene cobrar 199; si pagaría 225, 225 o 249; si 300, 299; si 450 o más, 299. No sabemos cuánto pagaría: lo mide la prueba de tres precios del piloto.
- **A dónde se va cada 100 pesos** (margen de operación: antes de captación, sueldos e impuestos): El margen de operación no es la ganancia final (faltan la captación, los sueldos y los impuestos): de cada 100 pesos que entran, se quedan 52 en el recomendado, 64 en el mejor y -28.7 en el peor. Del recomendado al mejor el porcentaje casi no cambia porque el soporte y la comisión crecen con cada cliente de paga (32 → 31.1 de cada 100); lo que sube es el monto (14,752 → 59,123 pesos al mes).

| De cada 100 pesos que entran | Recomendado | Peor | Mejor | Piso de verdad |
|---|---|---|---|---|
| servidor | 14.3 | 77 | 4.4 | 68.8 |
| almacenamiento | 1.7 | 9.4 | 0.5 | 8.4 |
| soporte | 26.1 | 35.9 | 25.2 | 109.2 |
| comisión de cobro | 5.9 | 6.4 | 5.9 | 5.7 |
| margen | 52 | -28.7 | 64 | -92.1 |

- **Internet y celular en México** (ENDUTIH 2024, INEGI, 6 de mayo de 2025, págs. 3, 6 y 17 del [reporte](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/endutih/ENDUTIH_24_RR.pdf), consultado el 17 de noviembre de 2026): **100.2 millones de usuarios de internet (83.1 % de la población de 6 años o más); 97.2 % de ellos se conectó con un celular inteligente** (otros equipos, respuestas múltiples: televisor 43.6 %, computadora 35.9 %, consola 8.1 %). **Tipo de conexión sólo existe para usuarios de celular inteligente:** ambas 72.8 %, sólo wifi 16.3 %, sólo datos móviles 10.9 %. Es la edición más reciente que pude leer (no verifiqué una edición 2025).

## 9. Límites (dichos)

- **No hay dato de disposición a pagar, de bajas ni de costo de conseguir un cliente.** Los umbrales de anuncios dependen de la tarifa, la parte de visitas con anuncio y el soporte por gratuito, sin dato.
- **Los topes de mesas y cuentas son un modelo:** medido sólo el conteo por estrato; el piloto debe medir mesas y cuentas por negocio.
- **El dato de comensales por restaurante es simulado**; los muros salen de un simulador, no de una prueba de carga (±2×).
- **Ingresos de anuncios sin modelar:** moderación de anuncios (revisar y bloquear categorías); tasa de llenado y bloqueadores (van dentro de `parte_visitas_con_anuncio`, sin modelar por separado); comisión de la red de anuncios; impuestos sobre los ingresos de anuncios y de suscripción.
- **Pruebas:** `node 2026-11-14-pruebas.mjs` fija con tolerancia estrecha las cifras de titular y prueba que ningún escenario «sin anuncios» tenga ingresos por anuncios.
