# Modelo de escenarios de Carta: dos planes (Chef y Master Chef), el peor caso real y qué hay que medir

**Fecha:** 17 de noviembre de 2026 (ronda 8, sobre la decisión de Calvin de dos planes) · **Rama:** `agente/planes-precio-historial` · **La v1 no cobra ni tiene planes.** Lo genera `2026-11-14-corre-escenarios.mjs` desde el modelo: ninguna cifra se transcribe a mano.

## Conclusiones

1. **Decisión de Calvin (17 de noviembre): dos planes, no tres.** «Quiero que Chef sea de 0 a 5 personas, … unas 6 mesas, … una sola cuenta … Chef Ejecutivo lo podemos dejar a una futura escalación.» **Chef (gratis) = 6 mesas y 1 cuenta de personal; Master Chef (225) = todo lo que pase de ahí, hasta los topes técnicos (500 mesas y 50 personas activas); Chef Ejecutivo queda apagado (no borrado).**
2. **Con el modelo de mesas y cuentas (supuesto; sólo los conteos por estrato son medidos), cabe en Chef el 48.4 % de los negocios de 0 a 5 personas (rango 42.4 %–54.5 %); el 51.6 % cae en Master Chef porque querría más de una cuenta, y de los de 6 a 10 personas cae el 100 %.** Con la cota baja de platillos (sitios propios) cabe sólo el 25.6 %.
3. **Cifras de titular que cambian (1,000 restaurantes, curva media):** clientes de paga 116 (antes 30); ingreso por cliente de paga 225 (antes 266) pesos (ya sin el plan de 1,099); parte que rebasa Chef 66.2 (antes 17.4) %; **margen de operación al mes: recomendado +18,591 (antes +8,719), peor +2,388 (antes −47), mejor +61,364 (antes +32,655), piso de verdad −1,532 (antes −2,031).** La base es mucho más rica en pagantes **si** el supuesto de «una cuenta por negocio de 0 a 5 personas» se sostiene: lo mide el piloto.
4. **Una sola cuenta frente al ADR-017** (el dueño es el validador y el primer mesero): el plan gratuito es **operación de una persona con un PIN**; el dueño recibe y atiende las comandas en su propio teléfono, sin mesero aparte ni capitán.
5. **Peor caso real (todos gratuitos): con 1,000 pesos al mes de bolsa caben 809 restaurantes gratuitos (rango 248 a 2,116 según el soporte, sin fuente), con el canal de eventos construido; los anuncios pagan el sistema desde 104 (rango 43 a imposible) restaurantes con la tarifa baja** (son rangos, no puntos). **Qué medir primero: curva · mediana, curva · techo, cuántos rebasan los topes.**

**Supuesto de historial en TODAS las cifras de costo, bolsa, margen y escalón:** el plan gratuito guarda **1 mes (30 días)** de visitas y analítica. **Es una propuesta que contradice 03 §7 (13 y 24 meses) y hoy nada purga.** Sin purga (12 meses acumulados) la bolsa de 1,000 pesos carga 432 restaurantes en vez de 809, y el margen recomendado con 1,000 restaurantes es +15,878 en vez de +18,591.

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
| 5 · 1 (alternativa de 5 mesas) | 48.4 % | 100 % | 115.9 | +18,229 |
| 6 · 1 **(decidido)** | 48.4 % | 100 % | 115.9 | +18,591 |
| 6 · 2 | 66.5 % | 100 % | 93.8 | +15,323 |
| 8 · 2 | 76.2 % | 100 % | 82 | +14,326 |
| 10 · 3 | 85.9 % | 69.7 % | 61.1 | +11,934 |

**Cobertura por platillos: DOS COTAS de sesgo opuesto (SUPUESTO; no se sabe la real).** Con 150 platillos contando todo: **52 % (sitios propios, cota baja; 56 cartas) a 98 % (reparto, cota alta; en esa muestra sólo 40 a 120 están medidos y el 150 es extrapolación)**; dentro de 150, por tipo: fondas y taquerías 7 de 8, cafeterías 9 de 11, casuales 9 de 21, formales 3 de 14. Las dos muestras no cuentan «platillo» con la misma regla (148 cartas de reparto: cortas; sitios propios: largas y formales).

### Tope de platillos del plan Chef: «cuenta todo» DECIDIDO; el VALOR del tope REABIERTO (17 de noviembre de 2026)

**Decisión de Calvin:** «el tope de platillos incluye bebidas… considera que cuenta todo, bebidas incluidas». **Después la reabrió:** «según yo no quedamos en 150, se me hace demasiado. Quisiera saber si el tema de platillos mueve mucho nuestras gráficas». Lo que cuesta cada platillo, medido y supuesto, está en `2026-11-17-costo-de-platillo.md`. **De 50 a 150 platillos (con la mezcla de gratuitos y de paga fija): el disco de la base casi no se mueve (caben 0.2 % menos restaurantes: 557 bytes por platillo); el procesador pierde 3.8 % con el sondeo de hoy y hasta 19.3 % con avisos (cota alta: se supone que el menú se arma cada 30 s en la hora pico, de 7 a 16 ms); NINGUNO de los dos se acaba por el tope: el cuello de botella sigue siendo disco (182 restaurantes con avisos y 173 con el sondeo, con el historial a 30 días). Lo que sí crece es el almacenamiento de fotos en R2 (de 0.12 a 0.37 GB por restaurante, sobre todo por los originales, que son un supuesto; pasarse de lo gratis cuesta 0.10 pesos al mes por restaurante) y el menú que baja el teléfono (de 38 a 113 KB); y el tope cambia cuántos negocios pasan a pagar (de 137 a 116 de paga por cada 1,000).**

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
| Tope de 150 que cuenta sólo comida (las bebidas no tienen tope) | 49.4 % | 48.4 % | +18,413 | +18,591 |
| Subir el tope a 200 platillos (bebidas incluidas) | 36.2 % | 48.6 % | +20,775 | +18,524 |
| Subir el tope a 300 platillos (bebidas incluidas) | 41.4 % | 48.9 % | +19,759 | +18,410 |
| Quitar el tope de platillos y limitar sólo por mesas y cuentas | 49.4 % | 49.4 % | −∞ | −∞ |

*«No se sabe la cobertura real»: el dato que sigue pendiente es la carta real de los negocios del piloto, contada con la instrucción de conteo de la muestra.*

## 2. Precio: Master Chef pegado a Meniu

**225 es una decisión de posicionamiento de Calvin (quedar pegado a Meniu Business), no un resultado del modelo**: la curva «media» se construyó con mediana 225 y por eso el óptimo sale cerca (234). Ver [precio de entrada](2026-11-14-precio-de-entrada.md). **Chef Ejecutivo queda apagado** (futura escalación: precio y topes en `configTresPlanes25Mesas()`).

Cada precio con tres curvas (pesimista · media · optimista), **1,000 restaurantes registrados**. «Sin pérdidas» = margen de operación **y** después de captación ≥ 0 (con anuncios en marcha · sin anuncios todavía).

| Master Chef | Pagantes de Master Chef | Margen de operación (con anuncios) | Después de captación | Margen de operación **sin anuncios** | Equilibrio sin anuncios (pagantes) | ¿Sin pérdidas? (con anuncios · sin) |
|---|---|---|---|---|---|---|
| **199** | 31.6 · 134.7 · 387.8 | +5,333 · +18,040 · +47,814 | +4,765 · +15,616 · +40,834 | +2,831 · +15,805 · +46,233 | 8.9 | sí · sí |
| **225** | 23.4 · 115.9 · 382.2 | +4,910 · +18,591 · +56,576 | +4,489 · +16,505 · +49,697 | +2,388 · +16,308 · +54,980 | 7.5 | sí · sí |
| **249** | 17.7 · 100.3 · 375.7 | +4,466 · +18,583 · +64,201 | +4,148 · +16,776 · +57,438 | +1,929 · +16,259 · +62,588 | 6.5 | sí · sí |
| **299** | 9.8 · 73.7 · 358.8 | +3,587 · +17,528 · +78,377 | +3,410 · +16,203 · +71,918 | +1,029 · +15,136 · +76,721 | 5.1 | sí · sí |

**Lectura.** (1) **Master Chef: 199 a 299 cambia los pagantes** (de 135 a 74 con la curva media) **y el margen** (de +18,040 a +17,528): con la base de dos planes el precio pesa más que antes, porque ya no hay plan de 1,099 que lo diluya. (2) **Sin anuncios, con la curva pesimista y 1,000 restaurantes**, a 225 el margen es +2,388 al mes: ese periodo lo paga Calvin.

## 2b. La meta de 300 restaurantes a 12 meses, en dinero

Meta supuesta: **300 restaurantes a 12 meses** (adopción supuesta). Pesos al mes del mes 12 y acumulado de los 12 meses; peor = sin anuncios en ningún mes.

| | Recomendado | Peor | Mejor |
|---|---|---|---|
| De paga en el mes 12 | 35 | 7 | 115 |
| Ingreso por suscripción, mes 12 | 7,822 | 1,581 | 25,797 |
| Ingreso por anuncios, mes 12 | 685 | 0 | 1,915 |
| **Ingresos, mes 12** | **8,507** | **1,581** | **27,712** |
| Costos, mes 12 (servidor · almacenamiento · soporte · comisión) | 3,216 (453 · 44 · 2,219 · 500) | 942 (236 · 37 · 568 · 101) | 9,163 (477 · 66 · 6,972 · 1,649) |
| **Margen de operación, mes 12** | **+5,292** | **+639** | **+18,549** |
| Margen después de captación, mes 12 | +1,428 | −142 | +5,809 |
| **Acumulado de 12 meses: ingresos** | 37,400 | 7,132 | 122,276 |
| Acumulado de 12 meses: costos | 15,606 | 5,655 | 43,293 |
| **Acumulado de 12 meses: margen de operación** | +21,794 | +1,477 | +78,983 |
| Acumulado de 12 meses: margen después de captación | −1,262 | −3,184 | +2,946 |

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
| 10 | 20,502 | 196 | −170 | −190 | −93 | hobby_eventos |
| 25 | 51,255 | 206 | −142 | −190 | +52 | hobby_eventos |
| 50 | 102,510 | 225 | −96 | −193 | +291 | hobby_eventos |
| 100 | 205,020 | 264 | −6 | −199 | +769 | hobby_eventos |
| 200 | 410,040 | 341 | +175 | −212 | +1,725 | hobby_eventos |
| 300 | 615,060 | 418 | +357 | −225 | +2,681 | hobby_eventos |
| 500 | 1,025,100 | 573 | +719 | −250 | +4,593 | hobby_eventos |
| 750 | 1,537,650 | 957 | +981 | −472 | +6,792 | pro_2 |
| 1,000 | 2,050,200 | 1,139 | +1,444 | −494 | +9,193 | pro_2 |
| 1,500 | 3,075,300 | 1,505 | +2,370 | −536 | +13,993 | pro_2 |
| 2,000 | 4,100,400 | 1,964 | +3,202 | −672 | +18,700 | pro_4 |
| *Zona extrapolada (sin medir)* | | | | | | |
| 3,000 | 6,150,600 | 2,713 | +5,036 | −776 | +28,283 | pro_4 |
| 5,000 | 10,251,000 | 5,177 | +7,738 | −1,948 | +46,483 | pro_8 (extrapolación) |
| 10,000 | 20,502,000 | 9,312 | +16,518 | −2,854 | +94,008 | pro_8 (extrapolación) |

**Desde cuántos restaurantes se paga solo, como rango** (con los otros supuestos en su valor de trabajo; «imposible» = no se paga solo con ≤ 3000 restaurantes):

| Caso | Centro | Mínimo – máximo entre variantes | Qué lo mueve (bajo · alto) |
|---|---|---|---|
| Tarifa baja | **104** | 43 – imposible | tarifa de anuncios: la mitad → 360, el doble → 43; visitas con anuncio: la mitad → 360, el doble → 53; soporte por cliente gratuito: 0 pesos → 81, 3 pesos (el máximo de su rango) → no se paga solo; visitas con la app por gratuito: la mitad → 360, el doble → 43 |
| Tarifa media | **20** | 10 – 43 | tarifa de anuncios: la mitad → 43, el doble → 10; visitas con anuncio: la mitad → 43, el doble → 12; soporte por cliente gratuito: 0 pesos → 19, 3 pesos (el máximo de su rango) → 27; visitas con la app por gratuito: la mitad → 43, el doble → 10 |
| Adverso | **no se paga solo** | 360 – imposible | tarifa de anuncios: la mitad → no se paga solo, el doble → 360; visitas con anuncio: la mitad → no se paga solo, el doble → no se paga solo; soporte por cliente gratuito: 0 pesos → 500, 3 pesos (el máximo de su rango) → no se paga solo; visitas con la app por gratuito: la mitad → no se paga solo, el doble → 360 |

**La bolsa de Calvin, como rango** (restaurantes gratuitos que caben con la carga de sus topes: 1,080 visitas al mes cada uno, la misma definición que usa «¿Qué nos limita?», según el soporte por gratuito):

| Bolsa al mes | Centro (soporte 0.5) | Mínimo – máximo | Por soporte (pesos por gratuito → restaurantes) |
|---|---|---|---|
| 500 | **405** | 95 – 505 | 0 → 505 · 0.5 → 405 · 1 → 246 · 3 → 95 |
| 1,000 | **809** | 248 – 2,116 | 0 → 2,116 · 0.5 → 809 · 1 → 505 · 3 → 248 |
| 2,000 | **2,048** | 505 – 2,116 | 0 → 2,116 · 0.5 → 2,048 · 1 → 1,293 · 3 → 505 |
| 5,000 | **2,116** | 1,421 – 2,116 | 0 → 2,116 · 0.5 → 2,116 · 1 → 2,116 · 3 → 1,421 |

**Respuesta en una frase:** con 1,000 pesos al mes de mi bolsa caben 809 restaurantes gratuitos (rango 248 a 2,116) y 1.7 millones de comensales al mes; **con el canal de eventos construido**; con el sondeo de hoy caben 246. Con anuncios se paga solo desde 104 (rango 43 a imposible) restaurantes (tarifa baja).

**Qué no está modelado** en el ingreso por anuncios: moderación de anuncios (revisar y bloquear categorías); tasa de llenado y bloqueadores (van dentro de `parte_visitas_con_anuncio`, sin modelar por separado); comisión de la red de anuncios; impuestos sobre los ingresos de anuncios y de suscripción. **El 0.6 de visitas con la app y el 0.6 de visitas con anuncio no son el mismo descuento contado dos veces:** el primero es cuántos comensales abren la app (simulador), el segundo en cuántas de esas visitas se sirve un anuncio que paga; coinciden en el número y los dos son supuestos sin dato.

**Conciliación con [planes-y-costo §0](2026-11-13-planes-y-costo-por-restaurante.md).** Ese documento da **110–140 USD al mes de base fija para 1,000 restaurantes [estimada, ±2×, con el sondeo de hoy]**; este modelo da **≈ 34 USD de servidor, disco y fotos** (sin el soporte de 500 pesos) para 1,000 gratuitos en el escalón pro_2. **No contradicen: son dos mundos.** El del documento supone que cada teléfono pregunta cada 3 s (sondeo), que es lo que corre hoy; el del modelo supone el canal de eventos (ADR-018, **no construido**), con el que cada restaurante carga mucho menos al procesador. **Hasta que T-3.20 y T-3.21 existan, vale el del documento (110–140 USD); el del modelo es una meta, no un costo vigente.**

## 4. Todas las cifras en cuatro casos

**Recomendado** = curva de pago media (mediana de Master Chef = 225, el precio de Meniu Business) y anuncios en la tarifa baja ya en marcha · **Peor** = curva de pago pesimista y SIN anuncios en ningún mes (los costos los pone Calvin de su bolsa) · **Mejor** = curva de pago optimista y anuncios en la tarifa media · **Piso de verdad** = curva pesimista, anuncios adversos (mitad de la tarifa baja, anuncio en el 30 % de las visitas) y soporte al máximo de su rango. *Cada escenario mueve dos ejes a la vez (curva de pago y anuncios): la matriz de §5 los separa.*

| Cifra | Recomendado | Peor | Mejor | Piso de verdad | Qué es |
|---|---|---|---|---|---|
| Clientes potenciales (negocios) | **104,882** | 104,882 | 104,882 | 104,882 | dato medido (DENUE 05/2026): no varía con los escenarios |
| Restaurantes registrados que caben, con la mezcla de gratuitos y de paga (con historial del gratuito de 1 mes: PROPUESTA, hoy nada purga) (restaurantes) | **182** | 173 | 1,823 | 173 | con el historial del gratuito que dice `config` (30 días es una propuesta que contradice 03 §7); recomendado = Hobby con avisos; peor = Hobby con sondeo; mejor = Pro de 8 procesos; cada uno es el menor de los recursos con la carga por topes (la misma cuenta de `recursos`) |
| Restaurantes registrados que caben SIN purga (12 meses de historial acumulado), con la mezcla de gratuitos y de paga (restaurantes) | **41** | 41 | 413 | 41 | lo que hay hoy: nada limpia; el disco manda desde el segundo mes de operación |
| Gratuitos que sostiene cada cliente de paga (sin anuncios) (restaurantes) | **144.2** | 133.3 | 92 | 16.1 | con anuncios en marcha cada gratuito se paga solo si deja más de lo que cuesta (`se_paga_solo`) |
| Ingreso por cliente gratuito (pesos al mes) | **2.6** | 0 | 10.3 | 0.6 | sólo anuncios |
| Ingreso por cliente de paga (pesos al mes) | **225** | 225 | 225 | 225 | promedio entre Master Chef y Chef Ejecutivo según cuántos hay de cada uno |
| Costo por cliente gratuito (pesos al mes) | **1** | 1.1 | 1.6 | 3.6 | servidor, almacenamiento y soporte |
| Margen de operación (pesos al mes) | **+18,591** | +2,388 | +61,364 | −1,532 | sin captación ni sueldos |
| Margen después de captación (pesos al mes) | **+16,505** | +1,966 | +54,484 | −1,953 | resta reponer las bajas y los sueldos (parámetros sin dato) |
| Punto de equilibrio (clientes de paga) | **0** | 7.5 | 0 | 50.8 | cuántos clientes de paga hacen falta para no perder (el peor caso lo calcula sin anuncios) |
| Comensales al mes (comensales) | **2,474,891** | 2,136,055 | 3,450,816 | 2,136,055 | dato por restaurante SIMULADO (perfiles del simulador), no medido |

*Techo teórico «todos pagan» (1,000): +146,169 pesos al mes; no se usa como cota.*

## 5. Matriz curva × anuncios (margen de operación, 1,000 restaurantes) y esperado a 100, 1,000 y 10,000

| Curva de pago | Sin anuncios | Tarifa baja | Tarifa media |
|---|---|---|---|
| pesimista | +2,388 | +4,910 | +12,478 |
| media | +16,308 | +18,591 | +25,442 |
| optimista | +54,980 | +56,576 | +61,364 |

**Piso de verdad** (pesimista, anuncios adversos y soporte al máximo de su rango): **−1,532**.

| Restaurantes | Peor | Recomendado | Mejor | Piso de verdad |
|---|---|---|---|---|
| 100 | +88 → +46 | **+1,708 → +1,499** | +5,911 → +5,223 | −303 → −346 |
| 1,000 | +2,388 → +1,966 | **+18,591 → +16,505** | +61,364 → +54,484 | −1,532 → −1,953 |
| 10,000 | +25,023 → +20,806 | **+185,323 → +164,464** | +619,992 → +551,200 | −14,169 → −18,386 |

*(margen de operación → después de captación)*

## 6. Qué supuesto mueve más el margen, en llano (1,000 restaurantes, recomendado)

**Qué medir primero en el piloto:** 1. curva · mediana → prueba de precio del piloto (Van Westendorp y escalera) · 2. curva · techo → prueba de precio del piloto: cuántos de cada 10 aceptan · 3. cuántos rebasan los topes → mesas y cuentas reales de los primeros 10 a 20 restaurantes · 4. soporte por cliente de paga → tickets y minutos de soporte del piloto · 5. tarifa de anuncios → prueba pequeña de AdSense con 3 restaurantes.

| Qué pasa si… | Efecto en el margen (pesos al mes) |
|---|---|
| Si cuánto está dispuesto a pagar el dueño promedio fuera la mitad de lo que supusimos, el margen baja de 18,591 a 5,696; si fuera una vez y media, sube a 27,179. | 21,483 |
| Si qué parte de los que rebasan los topes llega a pagar fuera la mitad de lo que supusimos, el margen baja de 18,591 a 10,017; si fuera una vez y media, sube a 27,165. | 17,148 |
| Si cuántos negocios pasan del tope de mesas o cuentas del plan gratuito fuera la mitad de lo que supusimos, el margen baja de 18,591 a 10,276; si fuera una vez y media, sube a 26,906. | 16,630 |
| Si cuánto tiempo de soporte requiere cada cliente de paga fuera la mitad de lo que supusimos, el margen sube de 18,591 a 22,068; si fuera una vez y media, baja a 15,115. | 6,953 |
| Si cuánto deja cada mil visitas con anuncio fuera la mitad de lo que supusimos, el margen baja de 18,591 a 17,449; si fuera una vez y media, sube a 19,733. | 2,284 |
| Si en qué parte de las visitas se ve un anuncio fuera la mitad de lo que supusimos, el margen baja de 18,591 a 17,449; si fuera una vez y media, sube a 19,733. | 2,284 |
| Si cuántas visitas con la app tiene cada restaurante gratuito fuera la mitad de lo que supusimos, el margen baja de 18,591 a 17,449; si fuera una vez y media, sube a 19,733. | 2,284 |
| Si qué parte de los clientes de paga paga con tarjeta (y sufre la comisión) fuera la mitad de lo que supusimos, el margen sube de 18,591 a 19,424; si fuera una vez y media, sube a 18,591. | 833 |

## 7. Crecimiento mes a mes (adopción **supuesta**: 300 restaurantes a 12 meses y 1200 a 24; anuncios desde el mes 9)

Margen de operación al mes. Peor = sin anuncios en ningún mes; recomendado: anuncios desde el mes 9.

| Mes | Restaurantes | De paga (recomendado) | Peor | **Recomendado** | Mejor | Piso de verdad | Escalón |
|---|---|---|---|---|---|---|---|
| 3 | 19 | 2 | −135 | **+129** | +890 | −222 | hobby_eventos (sin anuncios todavía) |
| 6 | 75 | 9 | +20 | **+1,063** | +3,852 | −322 | hobby_eventos (sin anuncios todavía) |
| 9 | 169 | 20 | +278 | **+3,015** | +10,271 | −384 | hobby_eventos |
| 12 | 300 | 35 | +639 | **+5,292** | +18,549 | −537 | pro_2 |
| 18 | 675 | 78 | +1,479 | **+12,416** | +42,246 | −1,167 | pro_2 |
| 24 | 1,200 | 139 | +2,947 | **+22,391** | +74,046 | −1,756 | pro_2 |
| 36 | 2,700 | 313 | +7,031 | **+49,629** | +167,150 | −3,551 | pro_8 |

**Primer mes con margen de operación positivo (recomendado): 3; después de captación: 9.** **Lo más que tendría que poner Calvin, acumulado: 4,290 pesos** (peor: 3,604; piso de verdad: 101,933). *Artefacto de la curva de adopción supuesta y del costo de captación sin dato.* **Más de ≈ 1,830 restaurantes registrados exige otra arquitectura: todo costo de ahí en adelante es extrapolación sin medir.**

## 8. Dos mensajes y un dato de contexto

- **Dónde está el valor** (calculado): Para un negocio de 11 a 50 personas, Carta (225 pesos al mes) cuesta alrededor de la cuarta parte de lo que ya paga por un punto de venta como Fudo Pro (838), y 0.03 % de lo que vende en promedio al mes. *Advertencia: Promedio (total ÷ negocios), no mediana, de la clase 722511 (restaurantes con servicio completo) en los Censos Económicos 2024, año de referencia 2023: quedan fuera antojitos, tacos y cafeterías; un promedio lo jalan los grandes. Dato por conseguir: mediana y otras clases.*
- **Qué significa el precio** (calculado): Si el dueño típico pagaría alrededor de 150, conviene cobrar 199; si pagaría 225, 225 o 249; si 300, 299; si 450 o más, 299. No sabemos cuánto pagaría: lo mide la prueba de tres precios del piloto.
- **A dónde se va cada 100 pesos** (margen de operación: antes de captación, sueldos e impuestos): El margen de operación no es la ganancia final (faltan la captación, los sueldos y los impuestos): de cada 100 pesos que entran, se quedan 65.6 en el recomendado, 66.5 en el mejor y 45.3 en el peor. Del recomendado al mejor el porcentaje casi no cambia porque el soporte y la comisión crecen con cada cliente de paga (32 → 31.1 de cada 100); lo que sube es el monto (18,591 → 61,364 pesos al mes).

| De cada 100 pesos que entran | Recomendado | Peor | Mejor | Piso de verdad |
|---|---|---|---|---|
| servidor | 1.9 | 9.9 | 2.2 | 8.9 |
| almacenamiento | 0.5 | 2.5 | 0.2 | 2.2 |
| soporte | 26.1 | 35.9 | 25.2 | 109.2 |
| comisión de cobro | 5.9 | 6.4 | 5.9 | 5.7 |
| margen | 65.6 | 45.3 | 66.5 | -26 |

- **Internet y celular en México** (ENDUTIH 2024, INEGI, 6 de mayo de 2025, págs. 3, 6 y 17 del [reporte](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/endutih/ENDUTIH_24_RR.pdf), consultado el 17 de noviembre de 2026): **100.2 millones de usuarios de internet (83.1 % de la población de 6 años o más); 97.2 % de ellos se conectó con un celular inteligente** (otros equipos, respuestas múltiples: televisor 43.6 %, computadora 35.9 %, consola 8.1 %). **Tipo de conexión sólo existe para usuarios de celular inteligente:** ambas 72.8 %, sólo wifi 16.3 %, sólo datos móviles 10.9 %. Es la edición más reciente que pude leer (no verifiqué una edición 2025).

## 9. Límites (dichos)

- **No hay dato de disposición a pagar, de bajas ni de costo de conseguir un cliente.** Los umbrales de anuncios dependen de la tarifa, la parte de visitas con anuncio y el soporte por gratuito, sin dato.
- **Los topes de mesas y cuentas son un modelo:** medido sólo el conteo por estrato; el piloto debe medir mesas y cuentas por negocio.
- **El dato de comensales por restaurante es simulado**; los muros salen de un simulador, no de una prueba de carga (±2×).
- **Ingresos de anuncios sin modelar:** moderación de anuncios (revisar y bloquear categorías); tasa de llenado y bloqueadores (van dentro de `parte_visitas_con_anuncio`, sin modelar por separado); comisión de la red de anuncios; impuestos sobre los ingresos de anuncios y de suscripción.
- **Pruebas:** `node 2026-11-14-pruebas.mjs` fija con tolerancia estrecha las cifras de titular y prueba que ningún escenario «sin anuncios» tenga ingresos por anuncios.
