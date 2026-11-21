# Modelo de escenarios de Carta: dos planes (Chef y Master Chef), el peor caso real y qué hay que medir

**Fecha:** 17 de noviembre de 2026 (ronda 8, sobre la decisión de Calvin de dos planes) · **Rama:** `agente/planes-precio-historial` · **La v1 no cobra ni tiene planes.** Lo genera `2026-11-14-corre-escenarios.mjs` desde el modelo: ninguna cifra se transcribe a mano.

## Conclusiones

1. **Decisión de Calvin (17 de noviembre): dos planes, no tres.** «Quiero que Chef sea de 0 a 5 personas, … unas 6 mesas, … una sola cuenta … Chef Ejecutivo lo podemos dejar a una futura escalación.» **Chef (gratis) = 6 mesas y 3 cuenta de personal; Master Chef (225) = todo lo que pase de ahí, hasta los topes técnicos (500 mesas y 50 personas activas); Chef Ejecutivo queda apagado (no borrado).**
2. **Con el modelo de mesas y cuentas (supuesto; sólo los conteos por estrato son medidos), cabe en Chef el 44.3 % de los negocios de 0 a 5 personas (rango 38.1 %–59.8 %); el 55.7 % cae en Master Chef porque querría más de una cuenta, y de los de 6 a 10 personas cae el 92.2 %.** Con la cota baja de platillos (sitios propios) cabe sólo el 10.3 %.
3. **Cifras de titular que cambian (1,000 restaurantes, curva media):** clientes de paga 119 (antes 30); ingreso por cliente de paga 225 (antes 266) pesos (ya sin el plan de 1,099); parte que rebasa Chef 67.8 (antes 17.4) %; **margen de operación al mes: recomendado +15,221 (antes +8,719), peor −1,362 (antes −47), mejor +60,439 (antes +32,655), piso de verdad −5,330 (antes −2,031).** La base es mucho más rica en pagantes **si** el supuesto de «una cuenta por negocio de 0 a 5 personas» se sostiene: lo mide el piloto.
4. **Una sola cuenta frente al ADR-017** (el dueño es el validador y el primer mesero): el plan gratuito es **operación de una persona con un PIN**; el dueño recibe y atiende las comandas en su propio teléfono, sin mesero aparte ni capitán.
5. **Peor caso real (todos gratuitos): con 1,000 pesos al mes de bolsa caben 283 restaurantes gratuitos (rango 167 a 283 según el soporte, sin fuente), con el canal de eventos construido; los anuncios pagan el sistema desde 264 (rango 99 a imposible) restaurantes con la tarifa baja** (son rangos, no puntos). **Qué medir primero: curva · mediana, curva · techo, cuántos rebasan los topes.**

**Supuesto de historial en TODAS las cifras de costo, bolsa, margen y escalón: la política VIGENTE (03 §7).** El plan gratuito conserva **24 meses de sesiones y 13 de analítica** (lo que dice 03 §7 para todos los planes; hoy nada purga). **Recortar el historial del gratuito a 30 días es una PROPUESTA, decisión pendiente de Calvin, que contradice 03 §7;** va al lado, rotulada:

| Historial del plan gratuito | Margen recomendado, 1,000 restaurantes | Peor | Mejor | Estrés | Gratuitos que sostiene un pagante (sin anuncios) | Mes 12 (300 restaurantes): margen de operación | Sueldo de 1 salario mínimo: restaurantes en régimen |
|---|---|---|---|---|---|---|---|
| Política vigente (03 §7: 24 meses de sesiones y 13 de analítica) | +15,221 | −1,362 | +60,439 | −5,330 | 36 | +3,737 | 740 |
| El gratuito acumula 12 meses (sin purga) | +16,346 | −223 | +61,527 | −4,192 | 47 | +5,369 | 680 |
| PROPUESTA: el gratuito guarda 30 días (decisión pendiente de Calvin) | +19,058 | +2,539 | +62,677 | −1,429 | 151 | +5,432 | 580 |

**Qué mueve cada escenario** (margen de operación con 1,000 restaurantes; «peor» no es lo peor):

| Escenario | Qué mueve | Con la política vigente | Con la propuesta de 30 días |
|---|---|---|---|
| Recomendado: curva media, anuncios en tarifa baja, soporte de la paga en su valor central | nada: es el caso central | +15,221 | +19,058 |
| Sólo anuncios: nunca llegan (cero anuncios) | los anuncios | +12,944 | +16,782 |
| Sólo la curva de pago: pesimista | quién paga | +1,159 | +5,060 |
| Sólo la curva de pago: optimista | quién paga | +55,722 | +57,959 |
| Sólo el soporte de la paga: 30 pesos al mes por cliente | el soporte de la paga | +18,780 | +22,617 |
| Sólo el soporte de la paga: 150 pesos al mes por cliente | el soporte de la paga | +4,544 | +8,382 |
| «Peor» de las rondas anteriores: curva pesimista y cero anuncios (soporte central) | quién paga y los anuncios, no el soporte | −1,362 | +2,539 |
| Piso con cero anuncios: curva pesimista, cero anuncios y todos los soportes (gratuito, paga) al máximo de su rango | los tres ejes | −5,960 | −2,059 |
| Estrés (el «piso de verdad» de las rondas anteriores): curva pesimista, anuncios adversos y todos los soportes al máximo | los tres ejes | −5,330 | −1,429 |

**El precio de la curva media no es un resultado.** La mediana supuesta (225) es el precio de Meniu y el elegido (225): la conversión y los pagantes del titular salen de esa igualdad. El techo 0.35 (parte máxima de los que rebasan los topes que llegaría a pagar) es un SUPUESTO sin dato; rango de la tabla 0.2 a 0.5. Se mide con la prueba de precio del piloto.

| Historial del gratuito | Mediana real de lo que pagaría un negocio | Techo (SUPUESTO) | Conversión al precio elegido | Pagantes por 1,000 | Margen con 1,000 restaurantes |
|---|---|---|---|---|---|
| política vigente (03 §7) | 150 | 0.2 | 5 % | 34 | +2,624 |
| política vigente (03 §7) | 150 | 0.35 | 8.7 % | 59 | +6,394 |
| política vigente (03 §7) | 150 | 0.5 | 12.5 % | 85 | +10,165 |
| política vigente (03 §7) | 225 | 0.2 | 10 % | 68 | +7,667 |
| política vigente (03 §7) | 225 | 0.35 | 17.5 % | 119 | +15,221 |
| política vigente (03 §7) | 225 | 0.5 | 25 % | 169 | +22,774 |
| política vigente (03 §7) | 300 | 0.2 | 13.7 % | 93 | +11,378 |
| política vigente (03 §7) | 300 | 0.35 | 23.9 % | 162 | +21,714 |
| política vigente (03 §7) | 300 | 0.5 | 34.2 % | 232 | +32,050 |
| propuesta de 30 días | 150 | 0.2 | 5 % | 34 | +6,518 |
| propuesta de 30 días | 150 | 0.35 | 8.7 % | 59 | +10,271 |
| propuesta de 30 días | 150 | 0.5 | 12.5 % | 85 | +14,025 |
| propuesta de 30 días | 225 | 0.2 | 10 % | 68 | +11,539 |
| propuesta de 30 días | 225 | 0.35 | 17.5 % | 119 | +19,058 |
| propuesta de 30 días | 225 | 0.5 | 25 % | 169 | +26,578 |
| propuesta de 30 días | 300 | 0.2 | 13.7 % | 93 | +15,232 |
| propuesta de 30 días | 300 | 0.35 | 23.9 % | 162 | +25,522 |
| propuesta de 30 días | 300 | 0.5 | 34.2 % | 232 | +35,811 |

*Todo lo demás de este informe usa la política vigente (03 §7).* La bolsa de 1,000 pesos carga 283 restaurantes con la política vigente.

**Recomendado** = curva de pago media (mediana de Master Chef = 225, el precio de Meniu Business) y anuncios en la tarifa baja ya en marcha · **Peor** = curva de pago pesimista y SIN anuncios en ningún mes (los costos los pone Calvin de su bolsa) · **Mejor** = curva de pago optimista y anuncios en la tarifa media · **Piso de verdad** = curva pesimista, anuncios adversos (mitad de la tarifa baja, anuncio en el 30 % de las visitas) y soporte al máximo de su rango. *Cada escenario mueve dos ejes a la vez (curva de pago y anuncios): la matriz de §5 los separa.*

**Qué cambió en la ronda 8 (API del `.mjs`, versión `2026-11-21-r16`).** `configInicial()` pasa a **dos planes** (Chef 6 mesas · 3 cuentas de personal además del dueño · 50 platillos; Master Chef 225; `precios.salon = 0`: Chef Ejecutivo apagado); la anterior es `configTresPlanes25Mesas()`. Nuevo: `coberturaEstratos`, `desgloses`, `escalera` dinámica en `recursos(config, s, estado)` (`estado = {canal, meses_historial}` y `config.palancas`; no modifica sus entradas). La rejilla de mesas y cuentas llega a 4 mesas y 1 cuenta.

---

## 1. Los dos planes, traducidos a topes

**Clientes potenciales = 104,882** (DENUE, mayo de 2026 [medido]): 0 a 5 personas **73,193** y 6 a 10 **17,855** (Chef antes: 91,048); 11 o más **13,834** (todos pasan a Master Chef). **Carta no sabe cuánta gente trabaja en un negocio**, así que la frontera de Calvin se traduce a topes con el modelo de mesas y cuentas (cuentas = ⌈f × personas⌉, f = 0.35 a 0.50; mesas = cuentas × m × exp(σ·z), m = 2.5 a 4, **σ = 0.5, rango 0 a 0.75: supuesto sin dato**). «Cuentas» = las que el negocio querría crear: con f ≥ 0.35 un negocio de 3 personas ya quiere 2. **Medido: sólo los conteos por estrato. El piloto debe medir mesas y cuentas por negocio.**

| Estrato | Dentro de Chef (6 mesas · 3 cuentas de personal): centro | Rango del modelo (mín – máx) | Cae en Master Chef |
|---|---|---|---|
| 0 a 5 personas | **44.3 %** | 38.1 % – 59.8 % | 55.7 % |
| 6 a 10 personas | **7.8 %** | 0 % – 20.8 % | 92.2 % |

(con 50 platillos y la cota alta, 62.9 % de cobertura de platillos ya incluida; con la cota baja, 0 a 5 personas dentro: 10.3 %).

**Alternativas de topes para el gratuito** (centro; margen recomendado con 1,000 restaurantes):

| Mesas · cuentas | Negocios de 0 a 5 personas dentro | Negocios de 6 a 10 personas que caen en Master Chef | Pagantes por 1,000 | Margen de operación |
|---|---|---|---|---|
| 6 · 3 **(decidido)** | 44.3 % | 92.2 % | 118.6 | +15,221 |
| 6 · 1 | 31.1 % | 100 % | 137 | +17,957 |
| 6 · 2 | 42.7 % | 100 % | 122.9 | +15,849 |
| 8 · 2 | 48.9 % | 100 % | 115.3 | +14,362 |
| 10 · 3 | 55.2 % | 80.6 % | 101.9 | +12,030 |

**Cobertura por platillos: DOS COTAS de sesgo opuesto (SUPUESTO; no se sabe la real).** Con 50 platillos contando todo: **15 % (sitios propios, cota baja; 56 cartas) a 63 % (reparto, cota alta)**; dentro de 150, por tipo: fondas y taquerías 7 de 8, cafeterías 9 de 11, casuales 9 de 21, formales 3 de 14. Las dos muestras no cuentan «platillo» con la misma regla (148 cartas de reparto: cortas; sitios propios: largas y formales).

### Tope de platillos del plan Chef: DECIDIDO por Calvin el 21 de noviembre de 2026: 50 de base, contando todo

**Decisión de Calvin:** «el tope de platillos incluye bebidas… considera que cuenta todo, bebidas incluidas». **Después la reabrió** («según yo no quedamos en 150, se me hace demasiado») **y el 21 de noviembre decidió:** «Platillos base, dejémoslos en 50», con 6 mesas y 3 cuentas de personal además del dueño. Lo que cuesta cada platillo, medido y supuesto, está en `2026-11-17-costo-de-platillo.md`. **De 50 a 150 platillos (con la mezcla de gratuitos y de paga fija): el disco de la base casi no se mueve (caben 0.2 % menos restaurantes: 557 bytes por platillo); el procesador pierde 3.8 % con el sondeo de hoy y hasta 19.2 % con avisos (cota alta: se supone que el menú se arma cada 30 s en la hora pico, de 7 a 16 ms); NINGUNO de los dos se acaba por el tope (a mezcla de paga fija; el tope sí mueve quién paga: ver lo que sí mueve): el cuello de botella sigue siendo disco (179 restaurantes con avisos y 172 con el sondeo, con el historial a 30 días). Lo que sí crece es el almacenamiento de fotos en R2 (de 0.12 a 0.37 GB por restaurante, sobre todo por los originales, que son un supuesto; pasarse de lo gratis cuesta 0.10 pesos al mes por restaurante) y el menú que baja el teléfono (de 38 a 113 KB); y el tope cambia cuántos negocios pasan a pagar (de 119 a 87 de paga por cada 1,000).**

| Tope (cuenta todo) | Caben, cota baja (sitios propios) | Caben, cota alta (reparto) | De 0 a 5 personas dentro de Chef (baja a alta) | De paga por cada 1,000 | Restaurantes con foto que caben en R2 gratis |
|---|---|---|---|---|---|
| 50 | 15 % | 63 % | 10.3 % a 44.3 % | 119 | 80 (rango 30 a 242) |
| 80 | 25 % | 89 % | 17.6 % a 62.7 % | 95 | 50 (rango 18 a 151) |
| 100 | 29 % | 96 % | 20.1 % a 67.5 % | 89 | 40 (rango 15 a 121) |
| 150 | 52 % | 98 % | 36.4 % a 68.9 % | 87 | 26 (rango 10 a 80) |

*Bajar el tope no ahorra disco ni procesador de forma apreciable: lo que mueve es cuántos negocios pagan (cobertura) y el peso de las fotos en R2. El valor del tope queda a decisión de Calvin.*

**Alternativas descartadas el 17 de noviembre de 2026** (sólo comida, 200, 300, sin tope; quedan como referencia, no como opciones abiertas). Menos cobertura = más gente obligada a pagar: el margen «sube» a costa de cobrar a quien debía ser gratis y de que acepten pagar (supuesto).

| Alternativa descartada | Dentro de Chef (0 a 5 personas), cota baja | Dentro de Chef (0 a 5 personas), cota alta | Margen con la cota baja | Margen con la cota alta |
|---|---|---|---|---|
| Tope de 150 que cuenta sólo comida (las bebidas no tienen tope) | 70.3 % | 68.9 % | +10,223 | +10,490 |
| Subir el tope a 200 platillos (bebidas incluidas) | 51.5 % | 69.2 % | +13,761 | +10,403 |
| Subir el tope a 300 platillos (bebidas incluidas) | 59 % | 69.6 % | +12,274 | +10,261 |
| Quitar el tope de platillos y limitar sólo por mesas y cuentas | 70.3 % | 70.3 % | −∞ | −∞ |

*«No se sabe la cobertura real»: el dato que sigue pendiente es la carta real de los negocios del piloto, contada con la instrucción de conteo de la muestra.*

## 2. Precio: Master Chef pegado a Meniu

**225 es una decisión de posicionamiento de Calvin (quedar pegado a Meniu Business), no un resultado del modelo**: la curva «media» se construyó con mediana 225 y por eso el óptimo sale cerca (234). Ver [precio de entrada](2026-11-14-precio-de-entrada.md). **Chef Ejecutivo queda apagado** (futura escalación: precio y topes en `configTresPlanes25Mesas()`).

Cada precio con tres curvas (pesimista · media · optimista), **1,000 restaurantes registrados**. «Sin pérdidas» = margen de operación **y** después de captación ≥ 0 (con anuncios en marcha · sin anuncios todavía).

| Master Chef | Pagantes de Master Chef | Margen de operación (con anuncios) | Después de captación | Margen de operación **sin anuncios** | Equilibrio sin anuncios (pagantes) | ¿Sin pérdidas? (con anuncios · sin) |
|---|---|---|---|---|---|---|
| **199** | 32.3 · 137.9 · 397 | +1,596 · +14,668 · +46,754 | +1,015 · +12,187 · +39,608 | −903 · +12,441 · +45,196 | 43.6 | sí · no |
| **225** | 24 · 118.6 · 391.2 | +1,159 · +15,221 · +55,722 | +727 · +13,086 · +48,679 | −1,362 · +12,944 · +54,149 | 36 | sí · no |
| **249** | 18.1 · 102.7 · 384.6 | +701 · +15,202 · +63,525 | +375 · +13,353 · +56,602 | −1,835 · +12,885 · +61,935 | 30.9 | sí · no |
| **299** | 10 · 75.4 · 367.3 | −204 · +14,107 · +78,031 | −385 · +12,750 · +71,419 | −2,761 · +11,719 · +76,397 | 24 | no · no |

**Lectura.** (1) **Master Chef: 199 a 299 cambia los pagantes** (de 138 a 75 con la curva media) **y el margen** (de +14,668 a +14,107): con la base de dos planes el precio pesa más que antes, porque ya no hay plan de 1,099 que lo diluya. (2) **Sin anuncios, con la curva pesimista y 1,000 restaurantes**, a 225 el margen es −1,362 al mes: ese periodo lo paga Calvin.

## 2b. La meta de 300 restaurantes a 12 meses, en dinero

Meta supuesta: **300 restaurantes a 12 meses** (adopción supuesta). Pesos al mes del mes 12 y acumulado de los 12 meses; peor = sin anuncios en ningún mes.

| | Recomendado | Peor | Mejor |
|---|---|---|---|
| De paga en el mes 12 | 36 | 7 | 117 |
| Ingreso por suscripción, mes 12 | 8,007 | 1,619 | 26,408 |
| Ingreso por anuncios, mes 12 | 683 | 0 | 1,887 |
| **Ingresos, mes 12** | **8,690** | **1,619** | **28,295** |
| Costos, mes 12 (servidor · almacenamiento · soporte · comisión) | 4,954 (2,050 · 125 · 2,267 · 512) | 2,857 (2,050 · 126 · 578 · 103) | 10,992 (2,050 · 122 · 7,133 · 1,688) |
| **Margen de operación, mes 12** | **+3,737** | **−1,238** | **+17,302** |
| Margen después de captación, mes 12 | −218 | −2,038 | +4,260 |
| **Acumulado de 12 meses: ingresos** | 38,228 | 7,301 | 124,942 |
| Acumulado de 12 meses: costos | 19,143 | 9,657 | 46,465 |
| **Acumulado de 12 meses: margen de operación** | +19,084 | −2,357 | +78,477 |
| Acumulado de 12 meses: margen después de captación | −4,517 | −7,128 | +641 |

## 2c. El potencial del plan Chef, en dinero (techo teórico)

**Si todos los negocios que caerían en Chef estuvieran en Carta**, dejarían en anuncios al mes (no todos estarían; es un techo): **33,786 negocios en Chef** (de 104,882 clientes potenciales) → **87,270 pesos con la tarifa baja, 349,080 con la media y 922,570 con la alta** (2.6 · 10.3 · 27.3 pesos por negocio al mes). Rango por visitas con la app y parte con anuncio dentro de sus rangos: 5,676 a 2,625,198. **Supuestos:** sólo los conteos por estrato son medidos; el reparto entre Chef y Master Chef sale del modelo de mesas y cuentas con dispersión; todos con las visitas con la app del gratuito típico (supuesto, más altas que las de una fonda de 0 a 5 personas) y la parte de visitas con anuncio del modelo; la tarifa por mil visitas no tiene dato; techo teórico: no cuenta que no todos estarían en Carta.

| Tramo de tamaño (personas) | Negocios [medido] | En Chef (modelo) | En Master Chef | Negocios en Chef | Anuncios al mes con la tarifa baja |
|---|---|---|---|---|---|
| 0 a 5 | 73,193 | 44.3 % | 55.7 % | 32,399 | 83,686 |
| 6 a 10 | 17,855 | 7.8 % | 92.2 % | 1,388 | 3,584 |
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
| 50 | 102,510 | 461 | −332 | −429 | +55 | pro_2 |
| 100 | 205,020 | 512 | −254 | −447 | +521 | pro_2 |
| 200 | 410,040 | 615 | −99 | −486 | +1,451 | pro_2 |
| 300 | 615,060 | 2,326 | −1,551 | −2,132 | +774 | pro_8 (extrapolación) |
| 500 | 1,025,100 | 2,511 | −1,220 | −2,189 | +2,655 | pro_8 (extrapolación) |
| 750 | 1,537,650 | 3,749 | −1,812 | −3,265 | +4,000 | pro_8 (extrapolación) |
| 1,000 | 2,050,200 | 4,987 | −2,404 | −4,341 | +5,345 | pro_8 (extrapolación) |
| 1,500 | 3,075,300 | 7,462 | −3,588 | −6,494 | +8,036 | pro_8 (extrapolación) |
| 2,000 | 4,100,400 | 9,938 | −4,772 | −8,646 | +10,726 | pro_8 (extrapolación) |
| *Zona extrapolada (sin medir)* | | | | | | |
| 3,000 | 6,150,600 | 13,883 | −6,134 | −11,946 | +17,113 | pro_8 (extrapolación) |
| 5,000 | 10,251,000 | 22,779 | −9,864 | −19,551 | +28,881 | pro_8 (extrapolación) |
| 10,000 | 20,502,000 | 45,522 | −19,692 | −39,065 | +57,798 | pro_8 (extrapolación) |

**Desde cuántos restaurantes se paga solo, como rango** (con los otros supuestos en su valor de trabajo; «imposible» = no se paga solo con ≤ 3000 restaurantes):

| Caso | Centro | Mínimo – máximo entre variantes | Qué lo mueve (bajo · alto) |
|---|---|---|---|
| Tarifa baja | **264** | 99 – imposible | tarifa de anuncios: la mitad → no se paga solo, el doble → 99; visitas con anuncio: la mitad → no se paga solo, el doble → 125; soporte por cliente gratuito: 0 pesos → 200, 3 pesos (el máximo de su rango) → no se paga solo; visitas con la app por gratuito: la mitad → no se paga solo, el doble → 99 |
| Tarifa media | **21** | 10 – 99 | tarifa de anuncios: la mitad → 99, el doble → 10; visitas con anuncio: la mitad → 99, el doble → 12; soporte por cliente gratuito: 0 pesos → 20, 3 pesos (el máximo de su rango) → 28; visitas con la app por gratuito: la mitad → 99, el doble → 10 |
| Adverso | **no se paga solo** | ∞ – imposible | tarifa de anuncios: la mitad → no se paga solo, el doble → no se paga solo; visitas con anuncio: la mitad → no se paga solo, el doble → no se paga solo; soporte por cliente gratuito: 0 pesos → no se paga solo, 3 pesos (el máximo de su rango) → no se paga solo; visitas con la app por gratuito: la mitad → no se paga solo, el doble → no se paga solo |

**La bolsa de Calvin, como rango** (restaurantes gratuitos que caben con la carga de sus topes: 1,080 visitas al mes cada uno, la misma definición que usa «¿Qué nos limita?», según el soporte por gratuito):

| Bolsa al mes | Centro (soporte 0.5) | Mínimo – máximo | Por soporte (pesos por gratuito → restaurantes) |
|---|---|---|---|
| 500 | **88** | 28 – 171 | 0 → 171 · 0.5 → 88 · 1 → 59 · 3 → 28 |
| 1,000 | **283** | 167 – 283 | 0 → 283 · 0.5 → 283 · 1 → 283 · 3 → 167 |
| 2,000 | **283** | 283 – 283 | 0 → 283 · 0.5 → 283 · 1 → 283 · 3 → 283 |
| 5,000 | **1,014** | 567 – 1,132 | 0 → 1,132 · 0.5 → 1,014 · 1 → 849 · 3 → 567 |

**Respuesta en una frase:** con 1,000 pesos al mes de mi bolsa caben 283 restaurantes gratuitos (rango 167 a 283) y 0.6 millones de comensales al mes; **con el canal de eventos construido**; con el sondeo de hoy caben 28. Con anuncios se paga solo desde 264 (rango 99 a imposible) restaurantes (tarifa baja).

**Qué no está modelado** en el ingreso por anuncios: moderación de anuncios (revisar y bloquear categorías); tasa de llenado y bloqueadores (van dentro de `parte_visitas_con_anuncio`, sin modelar por separado); comisión de la red de anuncios; impuestos sobre los ingresos de anuncios y de suscripción. **El 0.6 de visitas con la app y el 0.6 de visitas con anuncio no son el mismo descuento contado dos veces:** el primero es cuántos comensales abren la app (simulador), el segundo en cuántas de esas visitas se sirve un anuncio que paga; coinciden en el número y los dos son supuestos sin dato.

**Conciliación con [planes-y-costo §0](2026-11-13-planes-y-costo-por-restaurante.md).** Ese documento da **110–140 USD al mes de base fija para 1,000 restaurantes [estimada, ±2×, con el sondeo de hoy]**; este modelo da **≈ 241 USD de servidor, disco y fotos** (sin el soporte de 500 pesos) para 1,000 gratuitos en el escalón pro_8. **No contradicen: son dos mundos.** El del documento supone que cada teléfono pregunta cada 3 s (sondeo), que es lo que corre hoy; el del modelo supone el canal de eventos (ADR-018, **no construido**), con el que cada restaurante carga mucho menos al procesador. **Hasta que T-3.20 y T-3.21 existan, vale el del documento (110–140 USD); el del modelo es una meta, no un costo vigente.**

## 4. Todas las cifras en cuatro casos

**Recomendado** = curva de pago media (mediana de Master Chef = 225, el precio de Meniu Business) y anuncios en la tarifa baja ya en marcha · **Peor** = curva de pago pesimista y SIN anuncios en ningún mes (los costos los pone Calvin de su bolsa) · **Mejor** = curva de pago optimista y anuncios en la tarifa media · **Piso de verdad** = curva pesimista, anuncios adversos (mitad de la tarifa baja, anuncio en el 30 % de las visitas) y soporte al máximo de su rango. *Cada escenario mueve dos ejes a la vez (curva de pago y anuncios): la matriz de §5 los separa.*

| Cifra | Recomendado | Peor | Mejor | Piso de verdad | Qué es |
|---|---|---|---|---|---|
| Clientes potenciales (negocios) | **104,882** | 104,882 | 104,882 | 104,882 | dato medido (DENUE 05/2026): no varía con los escenarios |
| Restaurantes registrados que caben, con la mezcla de gratuitos y de paga, con la política vigente de historial (03 §7: el gratuito guarda 24 meses de sesiones y 13 de analítica) (restaurantes) | **28** | 28 | 286 | 28 | política vigente (03 §7); recomendado = Hobby con avisos; peor = Hobby con sondeo; mejor = Pro de 8 procesos; cada uno es el menor de los recursos con la carga por topes (la misma cuenta de `recursos`) |
| Restaurantes registrados que caben con la PROPUESTA de historial del gratuito a 30 días (decisión pendiente de Calvin; contradice 03 §7) (restaurantes) | **179** | 179 | 1,800 | 179 | si Calvin aprueba recortar el historial del gratuito a 30 días (con archivo descargable) |
| Restaurantes registrados que caben SIN purga (12 meses de historial acumulado), con la mezcla de gratuitos y de paga (restaurantes) | **41** | 41 | 413 | 41 | lo que hay hoy: nada limpia; el disco manda desde el segundo mes de operación |
| Gratuitos que sostiene cada cliente de paga (sin anuncios) (restaurantes) | **35.7** | 28.6 | 54.4 | 6.2 | con anuncios en marcha cada gratuito se paga solo si deja más de lo que cuesta (`se_paga_solo`) |
| Ingreso por cliente gratuito (pesos al mes) | **2.6** | 0 | 10.3 | 0.6 | sólo anuncios |
| Ingreso por cliente de paga (pesos al mes) | **225** | 225 | 225 | 225 | promedio entre Master Chef y Chef Ejecutivo según cuántos hay de cada uno |
| Costo por cliente gratuito (pesos al mes) | **3.9** | 4.7 | 2.6 | 7.2 | servidor, almacenamiento y soporte |
| Margen de operación (pesos al mes) | **+15,221** | −1,362 | +60,439 | −5,330 | sin captación ni sueldos |
| Margen después de captación (pesos al mes) | **+13,086** | −1,794 | +53,397 | −5,762 | resta reponer las bajas y los sueldos (parámetros sin dato) |
| Punto de equilibrio (clientes de paga) | **17.2** | 36.8 | 0 | 153 | cuántos clientes de paga hacen falta para no perder (el peor caso lo calcula sin anuncios) |
| Comensales al mes (comensales) | **2,484,941** | 2,138,087 | 3,483,958 | 2,138,087 | dato por restaurante SIMULADO (perfiles del simulador), no medido |

*Techo teórico «todos pagan» (1,000): +146,169 pesos al mes; no se usa como cota.*

## 5. Matriz curva × anuncios (margen de operación, 1,000 restaurantes) y esperado a 100, 1,000 y 10,000

| Curva de pago | Sin anuncios | Tarifa baja | Tarifa media |
|---|---|---|---|
| pesimista | −1,362 | +1,159 | +8,722 |
| media | +12,944 | +15,221 | +22,051 |
| optimista | +54,149 | +55,722 | +60,439 |

**Piso de verdad** (pesimista, anuncios adversos y soporte al máximo de su rango): **−5,330**.

| Restaurantes | Peor | Recomendado | Mejor | Piso de verdad |
|---|---|---|---|---|
| 100 | −150 → −193 | **+1,505 → +1,292** | +6,019 → +5,315 | −547 → −590 |
| 1,000 | −1,362 → −1,794 | **+15,221 → +13,086** | +60,439 → +53,397 | −5,330 → −5,762 |
| 10,000 | −9,273 → −13,590 | **+157,559 → +136,206** | +609,740 → +539,320 | −48,954 → −53,271 |

*(margen de operación → después de captación)*

## 6. Qué supuesto mueve más el margen, en llano (1,000 restaurantes, recomendado)

**Qué medir primero en el piloto:** 1. curva · mediana → prueba de precio del piloto (Van Westendorp y escalera) · 2. curva · techo → prueba de precio del piloto: cuántos de cada 10 aceptan · 3. cuántos rebasan los topes → mesas y cuentas reales de los primeros 10 a 20 restaurantes · 4. soporte por cliente de paga → tickets y minutos de soporte del piloto · 5. tarifa de anuncios → prueba pequeña de AdSense con 3 restaurantes.

| Qué pasa si… | Efecto en el margen (pesos al mes) |
|---|---|
| Si cuánto está dispuesto a pagar el dueño promedio fuera la mitad de lo que supusimos, el margen baja de 15,221 a 1,967; si fuera una vez y media, sube a 24,048. | 22,081 |
| Si qué parte de los que rebasan los topes llega a pagar fuera la mitad de lo que supusimos, el margen baja de 15,221 a 6,408; si fuera una vez y media, sube a 24,033. | 17,625 |
| Si cuántos negocios pasan del tope de mesas o cuentas del plan gratuito fuera la mitad de lo que supusimos, el margen baja de 15,221 a 11,228; si fuera una vez y media, sube a 19,214. | 7,986 |
| Si cuánto tiempo de soporte requiere cada cliente de paga fuera la mitad de lo que supusimos, el margen sube de 15,221 a 18,780; si fuera una vez y media, baja a 11,662. | 7,118 |
| Si cuánto deja cada mil visitas con anuncio fuera la mitad de lo que supusimos, el margen baja de 15,221 a 14,082; si fuera una vez y media, sube a 16,359. | 2,277 |
| Si en qué parte de las visitas se ve un anuncio fuera la mitad de lo que supusimos, el margen baja de 15,221 a 14,082; si fuera una vez y media, sube a 16,359. | 2,277 |
| Si cuántas visitas con la app tiene cada restaurante gratuito fuera la mitad de lo que supusimos, el margen baja de 15,221 a 14,082; si fuera una vez y media, sube a 16,359. | 2,277 |
| Si qué parte de los clientes de paga paga con tarjeta (y sufre la comisión) fuera la mitad de lo que supusimos, el margen sube de 15,221 a 16,074; si fuera una vez y media, sube a 15,221. | 853 |

## 7. Crecimiento mes a mes (adopción **supuesta**: 300 restaurantes a 12 meses y 1200 a 24; anuncios desde el mes 9)

Margen de operación al mes. Peor = sin anuncios en ningún mes; recomendado: anuncios desde el mes 9.

| Mes | Restaurantes | De paga (recomendado) | Peor | **Recomendado** | Mejor | Piso de verdad | Escalón |
|---|---|---|---|---|---|---|---|
| 3 | 19 | 2 | −141 | **+130** | +911 | −228 | hobby_eventos (sin anuncios todavía) |
| 6 | 75 | 9 | −215 | **+856** | +3,940 | −560 | pro_2 (sin anuncios todavía) |
| 9 | 169 | 20 | +28 | **+2,826** | +10,454 | −642 | pro_2 |
| 12 | 300 | 36 | −1,238 | **+3,737** | +17,302 | −2,429 | pro_8 |
| 18 | 675 | 80 | −1,233 | **+9,961** | +40,483 | −3,911 | pro_8 |
| 24 | 1,200 | 142 | −1,828 | **+18,071** | +72,333 | −6,590 | pro_8 |
| 36 | 2,700 | 320 | −2,812 | **+41,962** | +164,051 | −13,525 | pro_8 |

**Primer mes con margen de operación positivo (recomendado): 3; después de captación: 10.** **Lo más que tendría que poner Calvin, acumulado: 5,573 pesos** (peor: 93,796; piso de verdad: 228,022). *Artefacto de la curva de adopción supuesta y del costo de captación sin dato.* **Más de ≈ 290 restaurantes registrados exige otra arquitectura: todo costo de ahí en adelante es extrapolación sin medir.**

## 8. Dos mensajes y un dato de contexto

- **Dónde está el valor** (calculado): Para un negocio de 11 a 50 personas, Carta (225 pesos al mes) cuesta alrededor de la cuarta parte de lo que ya paga por un punto de venta como Fudo Pro (838), y 0.03 % de lo que vende en promedio al mes. *Advertencia: Promedio (total ÷ negocios), no mediana, de la clase 722511 (restaurantes con servicio completo) en los Censos Económicos 2024, año de referencia 2023: quedan fuera antojitos, tacos y cafeterías; un promedio lo jalan los grandes. Dato por conseguir: mediana y otras clases.*
- **Qué significa el precio** (calculado): Si el dueño típico pagaría alrededor de 150, conviene cobrar 199; si pagaría 225, 225 o 249; si 300, 299; si 450 o más, 299. No sabemos cuánto pagaría: lo mide la prueba de tres precios del piloto.
- **A dónde se va cada 100 pesos** (margen de operación: antes de captación, sueldos e impuestos): El margen de operación no es la ganancia final (faltan la captación, los sueldos y los impuestos): de cada 100 pesos que entran, se quedan 52.5 en el recomendado, 64.1 en el mejor y -25.3 en el peor. Del recomendado al mejor el porcentaje casi no cambia porque el soporte y la comisión crecen con cada cliente de paga (32 → 31.2 de cada 100); lo que sube es el monto (15,221 → 60,439 pesos al mes).

| De cada 100 pesos que entran | Recomendado | Peor | Mejor | Piso de verdad |
|---|---|---|---|---|
| servidor | 14 | 75.3 | 4.3 | 67.4 |
| almacenamiento | 1.5 | 7.9 | 0.4 | 7.1 |
| soporte | 26.1 | 35.7 | 25.2 | 108.3 |
| comisión de cobro | 5.9 | 6.4 | 6 | 5.7 |
| margen | 52.5 | -25.3 | 64.1 | -88.5 |

- **Internet y celular en México** (ENDUTIH 2024, INEGI, 6 de mayo de 2025, págs. 3, 6 y 17 del [reporte](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/endutih/ENDUTIH_24_RR.pdf), consultado el 17 de noviembre de 2026): **100.2 millones de usuarios de internet (83.1 % de la población de 6 años o más); 97.2 % de ellos se conectó con un celular inteligente** (otros equipos, respuestas múltiples: televisor 43.6 %, computadora 35.9 %, consola 8.1 %). **Tipo de conexión sólo existe para usuarios de celular inteligente:** ambas 72.8 %, sólo wifi 16.3 %, sólo datos móviles 10.9 %. Es la edición más reciente que pude leer (no verifiqué una edición 2025).

## 9. Límites (dichos)

- **No hay dato de disposición a pagar, de bajas ni de costo de conseguir un cliente.** Los umbrales de anuncios dependen de la tarifa, la parte de visitas con anuncio y el soporte por gratuito, sin dato.
- **Los topes de mesas y cuentas son un modelo:** medido sólo el conteo por estrato; el piloto debe medir mesas y cuentas por negocio.
- **El dato de comensales por restaurante es simulado**; los muros salen de un simulador, no de una prueba de carga (±2×).
- **Ingresos de anuncios sin modelar:** moderación de anuncios (revisar y bloquear categorías); tasa de llenado y bloqueadores (van dentro de `parte_visitas_con_anuncio`, sin modelar por separado); comisión de la red de anuncios; impuestos sobre los ingresos de anuncios y de suscripción.
- **Pruebas:** `node 2026-11-14-pruebas.mjs` fija con tolerancia estrecha las cifras de titular y prueba que ningún escenario «sin anuncios» tenga ingresos por anuncios.
