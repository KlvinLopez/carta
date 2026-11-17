# Modelo de escenarios de Carta: dos planes (Chef y Master Chef), el peor caso real y qué hay que medir

**Fecha:** 17 de noviembre de 2026 (ronda 8, sobre la decisión de Calvin de dos planes) · **Rama:** `agente/planes-precio-historial` · **La v1 no cobra ni tiene planes.** Lo genera `2026-11-14-corre-escenarios.mjs` desde el modelo: ninguna cifra se transcribe a mano.

## Conclusiones

1. **Decisión de Calvin (17 de noviembre): dos planes, no tres.** «Quiero que Chef sea de 0 a 5 personas, … unas 6 mesas, … una sola cuenta … Chef Ejecutivo lo podemos dejar a una futura escalación.» **Chef (gratis) = 6 mesas y 1 cuenta de personal; Master Chef (225) = todo lo que pase de ahí, hasta los topes técnicos (500 mesas y 50 personas activas); Chef Ejecutivo queda apagado (no borrado).**
2. **Con el modelo de mesas y cuentas (supuesto; sólo los conteos por estrato son medidos), cabe en Chef el 48.4 % de los negocios de 0 a 5 personas (rango 42.4 %–54.5 %); el 51.6 % cae en Master Chef porque querría más de una cuenta, y de los de 6 a 10 personas cae el 100 %.** Con la cota baja de platillos (sitios propios) cabe sólo el 25.6 %.
3. **Cifras de titular que cambian (1,000 restaurantes, curva media):** clientes de paga 116 (antes 30); ingreso por cliente de paga 225 (antes 266) pesos (ya sin el plan de 1,099); parte que rebasa Chef 66.2 (antes 17.4) %; **margen de operación al mes: recomendado +20,024 (antes +8,719), peor +2,390 (antes −47), mejor +65,664 (antes +32,655), piso de verdad −1,109 (antes −2,031).** La base es mucho más rica en pagantes **si** el supuesto de «una cuenta por negocio de 0 a 5 personas» se sostiene: lo mide el piloto.
4. **Una sola cuenta frente al ADR-017** (el dueño es el validador y el primer mesero): el plan gratuito es **operación de una persona con un PIN**; el dueño recibe y atiende las comandas en su propio teléfono, sin mesero aparte ni capitán.
5. **Peor caso real (todos gratuitos): con 1,000 pesos al mes de bolsa caben 811 restaurantes gratuitos (rango 246 a 1,896 según el soporte, sin fuente), con el canal de eventos construido; los anuncios pagan el sistema desde 54 (rango 25 a 186) restaurantes con la tarifa baja** (son rangos, no puntos). **Qué medir primero: curva · mediana, curva · techo, cuántos rebasan los topes.**

**Supuesto de historial en TODAS las cifras de costo, bolsa, margen y escalón:** el plan gratuito guarda **1 mes (30 días)** de visitas y analítica. **Es una propuesta que contradice 03 §7 (13 y 24 meses) y hoy nada purga.** Sin purga (12 meses acumulados) la bolsa de 1,000 pesos carga 236 restaurantes en vez de 811, y el margen recomendado con 1,000 restaurantes es +15,279 en vez de +20,024.

**Recomendado** = curva de pago media (mediana de Master Chef = 225, el precio de Meniu Business) y anuncios en la tarifa baja ya en marcha · **Peor** = curva de pago pesimista y SIN anuncios en ningún mes (los costos los pone Calvin de su bolsa) · **Mejor** = curva de pago optimista y anuncios en la tarifa media · **Piso de verdad** = curva pesimista, anuncios adversos (mitad de la tarifa baja, anuncio en el 30 % de las visitas) y soporte al máximo de su rango. *Cada escenario mueve dos ejes a la vez (curva de pago y anuncios): la matriz de §5 los separa.*

**Qué cambió en la ronda 8 (API del `.mjs`, versión `2026-11-17-r11`).** `configInicial()` pasa a **dos planes** (Chef 6 mesas · 1 cuenta · 150 platillos; Master Chef 225; `precios.salon = 0`: Chef Ejecutivo apagado); la anterior es `configTresPlanes25Mesas()`. Nuevo: `coberturaEstratos`, `desgloses`, `escalera` dinámica en `recursos(config, s, estado)` (`estado = {canal, meses_historial}` y `config.palancas`; no modifica sus entradas). La rejilla de mesas y cuentas llega a 4 mesas y 1 cuenta.

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
| 5 · 1 (alternativa de 5 mesas) | 48.4 % | 100 % | 115.9 | +20,024 |
| 6 · 1 **(decidido)** | 48.4 % | 100 % | 115.9 | +20,024 |
| 6 · 2 | 66.5 % | 100 % | 93.8 | +16,794 |
| 8 · 2 | 76.2 % | 100 % | 82 | +15,067 |
| 10 · 3 | 85.9 % | 69.7 % | 61.1 | +12,015 |

**Cobertura por platillos: DOS COTAS de sesgo opuesto (SUPUESTO; no se sabe la real).** Con 150 platillos contando todo: **52 % (sitios propios, cota baja; 56 cartas) a 98 % (reparto, cota alta; en esa muestra sólo 40 a 120 están medidos y el 150 es extrapolación)**; dentro de 150, por tipo: fondas y taquerías 7 de 8, cafeterías 9 de 11, casuales 9 de 21, formales 3 de 14. Las dos muestras no cuentan «platillo» con la misma regla (148 cartas de reparto: cortas; sitios propios: largas y formales).

### Tope de platillos del plan Chef: DECIDIDO (17 de noviembre de 2026)

**Decisión de Calvin:** «el tope de platillos incluye bebidas… quítalo y considera que cuenta todo, bebidas incluidas». **El tope de 150 platillos cuenta TODO.** La banda de dos cotas de cobertura se conserva porque sigue sin saberse cuál muestra tiene razón: con 150 platillos caben 52 % de las cartas de sitios propios (cota baja) y 98 % de las de reparto (cota alta); de 0 a 5 personas caben en Chef 25.6 % (cota baja) a 48.4 % (cota alta).

**Alternativas descartadas el 17 de noviembre de 2026** (sólo comida, 200, 300, sin tope; quedan como referencia, no como opciones abiertas). Menos cobertura = más gente obligada a pagar: el margen «sube» a costa de cobrar a quien debía ser gratis y de que acepten pagar (supuesto).

| Alternativa descartada | Dentro de Chef (0 a 5 personas), cota baja | Dentro de Chef (0 a 5 personas), cota alta | Margen con la cota baja | Margen con la cota alta |
|---|---|---|---|---|
| Tope de 150 que cuenta sólo comida (las bebidas no tienen tope) | 49.4 % | 48.4 % | +19,847 | +20,024 |
| Subir el tope a 200 platillos (bebidas incluidas) | 36.2 % | 48.6 % | +22,211 | +19,987 |
| Subir el tope a 300 platillos (bebidas incluidas) | 41.4 % | 48.9 % | +21,267 | +19,936 |
| Quitar el tope de platillos y limitar sólo por mesas y cuentas | 49.4 % | 49.4 % | +19,847 | +19,847 |

*«No se sabe la cobertura real»: el dato que sigue pendiente es la carta real de los negocios del piloto, contada con la instrucción de conteo de la muestra.*

## 2. Precio: Master Chef pegado a Meniu

**225 es una decisión de posicionamiento de Calvin (quedar pegado a Meniu Business), no un resultado del modelo**: la curva «media» se construyó con mediana 225 y por eso el óptimo sale cerca (234). Ver [precio de entrada](2026-11-14-precio-de-entrada.md). **Chef Ejecutivo queda apagado** (futura escalación: precio y topes en `configTresPlanes25Mesas()`).

Cada precio con tres curvas (pesimista · media · optimista), **1,000 restaurantes registrados**. «Sin pérdidas» = margen de operación **y** después de captación ≥ 0 (con anuncios en marcha · sin anuncios todavía).

| Master Chef | Pagantes de Master Chef | Margen de operación (con anuncios) | Después de captación | Margen de operación **sin anuncios** | Equilibrio sin anuncios (pagantes) | ¿Sin pérdidas? (con anuncios · sin) |
|---|---|---|---|---|---|---|
| **199** | 31.6 · 134.7 · 387.8 | +7,002 · +19,439 · +48,912 | +6,434 · +17,015 · +41,932 | +2,833 · +15,714 · +46,277 | 9.1 | sí · sí |
| **225** | 23.4 · 115.9 · 382.2 | +6,594 · +20,024 · +57,685 | +6,172 · +17,938 · +50,805 | +2,390 · +16,218 · +55,025 | 7.6 | sí · sí |
| **249** | 17.7 · 100.3 · 375.7 | +6,160 · +20,043 · +65,321 | +5,841 · +18,236 · +58,558 | +1,931 · +16,170 · +62,633 | 6.6 | sí · sí |
| **299** | 9.8 · 73.7 · 358.8 | +5,294 · +19,035 · +79,527 | +5,118 · +17,710 · +73,069 | +1,031 · +15,048 · +76,767 | 5.1 | sí · sí |

**Lectura.** (1) **Master Chef: 199 a 299 cambia los pagantes** (de 135 a 74 con la curva media) **y el margen** (de +19,439 a +19,035): con la base de dos planes el precio pesa más que antes, porque ya no hay plan de 1,099 que lo diluya. (2) **Sin anuncios, con la curva pesimista y 1,000 restaurantes**, a 225 el margen es +2,390 al mes: ese periodo lo paga Calvin.

## 2b. La meta de 300 restaurantes a 12 meses, en dinero

Meta supuesta: **300 restaurantes a 12 meses** (adopción supuesta). Pesos al mes del mes 12 y acumulado de los 12 meses; peor = sin anuncios en ningún mes.

| | Recomendado | Peor | Mejor |
|---|---|---|---|
| De paga en el mes 12 | 35 | 7 | 115 |
| Ingreso por suscripción, mes 12 | 7,822 | 1,581 | 25,797 |
| Ingreso por anuncios, mes 12 | 1,142 | 0 | 3,192 |
| **Ingresos, mes 12** | **8,964** | **1,581** | **28,989** |
| Costos, mes 12 (servidor · almacenamiento · soporte · comisión) | 3,215 (472 · 25 · 2,219 · 500) | 1,150 (465 · 16 · 568 · 101) | 9,163 (490 · 52 · 6,972 · 1,649) |
| **Margen de operación, mes 12** | **+5,749** | **+431** | **+19,826** |
| Margen después de captación, mes 12 | +1,886 | −350 | +7,086 |
| **Acumulado de 12 meses: ingresos** | 38,814 | 7,132 | 126,229 |
| Acumulado de 12 meses: costos | 15,835 | 6,103 | 43,300 |
| **Acumulado de 12 meses: margen de operación** | +22,978 | +1,028 | +82,929 |
| Acumulado de 12 meses: margen después de captación | −77 | −3,633 | +6,893 |

## 2c. El potencial del plan Chef, en dinero (techo teórico)

**Si todos los negocios que caerían en Chef estuvieran en Carta**, dejarían en anuncios al mes (no todos estarían; es un techo): **35,427 negocios en Chef** (de 104,882 clientes potenciales) → **152,513 pesos con la tarifa baja, 610,053 con la media y 1,612,284 con la alta** (4.3 · 17.2 · 45.5 pesos por negocio al mes). Rango por visitas con la app y parte con anuncio dentro de sus rangos: 9,920 a 4,587,799. **Supuestos:** sólo los conteos por estrato son medidos; el reparto entre Chef y Master Chef sale del modelo de mesas y cuentas con dispersión; todos con las visitas con la app del gratuito típico (supuesto, más altas que las de una fonda de 0 a 5 personas) y la parte de visitas con anuncio del modelo; la tarifa por mil visitas no tiene dato; techo teórico: no cuenta que no todos estarían en Carta.

| Tramo de tamaño (personas) | Negocios [medido] | En Chef (modelo) | En Master Chef | Negocios en Chef | Anuncios al mes con la tarifa baja |
|---|---|---|---|---|---|
| 0 a 5 | 73,193 | 48.4 % | 51.6 % | 35,427 | 152,513 |
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
| 10 | 34,170 | 197 | −154 | −187 | −25 | hobby_eventos |
| 25 | 85,425 | 209 | −102 | −182 | +221 | hobby_eventos |
| 50 | 170,850 | 229 | −14 | −175 | +632 | hobby_eventos |
| 100 | 341,700 | 268 | +163 | −160 | +1,454 | hobby_eventos |
| 200 | 683,400 | 346 | +515 | −131 | +3,098 | hobby_eventos |
| 300 | 1,025,100 | 627 | +664 | −304 | +4,539 | pro_2 |
| 500 | 1,708,500 | 773 | +1,380 | −235 | +7,837 | pro_2 |
| 750 | 2,562,750 | 955 | +2,274 | −148 | +11,960 | pro_2 |
| 1,000 | 3,417,000 | 1,137 | +3,168 | −61 | +16,083 | pro_2 |
| 1,500 | 5,125,500 | 1,604 | +4,853 | +10 | +24,226 | pro_4 |
| 2,000 | 6,834,000 | 2,125 | +6,485 | +28 | +32,315 | pro_8 |
| *Zona extrapolada (sin medir)* | | | | | | |
| 3,000 | 10,251,000 | 3,708 | +9,207 | −480 | +47,952 | pro_8 (extrapolación) |
| 5,000 | 17,085,000 | 5,821 | +15,704 | −440 | +80,279 | pro_8 (extrapolación) |
| 10,000 | 34,170,000 | 10,601 | +32,449 | +161 | +161,599 | pro_8 (extrapolación) |

**Desde cuántos restaurantes se paga solo, como rango** (con los otros supuestos en su valor de trabajo; «imposible» = no se paga solo con ≤ 3000 restaurantes):

| Caso | Centro | Mínimo – máximo entre variantes | Qué lo mueve (bajo · alto) |
|---|---|---|---|
| Tarifa baja | **54** | 25 – 186 | tarifa de anuncios: la mitad → 139, el doble → 25; visitas con anuncio: la mitad → 139, el doble → 30; soporte por cliente gratuito: 0 pesos → 48, 3 pesos (el máximo de su rango) → 186; visitas con la app por gratuito: la mitad → 139, el doble → 25 |
| Tarifa media | **12** | 6 – 25 | tarifa de anuncios: la mitad → 25, el doble → 6; visitas con anuncio: la mitad → 25, el doble → 7; soporte por cliente gratuito: 0 pesos → 12, 3 pesos (el máximo de su rango) → 14; visitas con la app por gratuito: la mitad → 25, el doble → 6 |
| Adverso | **1,469** | 139 – imposible | tarifa de anuncios: la mitad → no se paga solo, el doble → 139; visitas con anuncio: la mitad → 1,469, el doble → 1,469; soporte por cliente gratuito: 0 pesos → 240, 3 pesos (el máximo de su rango) → no se paga solo; visitas con la app por gratuito: la mitad → no se paga solo, el doble → 139 |

**La bolsa de Calvin, como rango** (restaurantes gratuitos que caben, según el soporte por gratuito):

| Bolsa al mes | Centro (soporte 0.5) | Mínimo – máximo | Por soporte (pesos por gratuito → restaurantes) |
|---|---|---|---|
| 500 | **279** | 94 – 400 | 0 → 400 · 0.5 → 279 · 1 → 241 · 3 → 94 |
| 1,000 | **811** | 246 – 1,896 | 0 → 1,896 · 0.5 → 811 · 1 → 481 · 3 → 246 |
| 2,000 | **1,896** | 492 – 2,116 | 0 → 2,116 · 0.5 → 1,896 · 1 → 1,218 · 3 → 492 |
| 5,000 | **2,116** | 1,391 – 2,116 | 0 → 2,116 · 0.5 → 2,116 · 1 → 2,116 · 3 → 1,391 |

**Respuesta en una frase:** con 1,000 pesos al mes de mi bolsa caben 811 restaurantes gratuitos (rango 246 a 1,896) y 2.8 millones de comensales al mes; **con el canal de eventos construido**; con el sondeo de hoy caben 148. Con anuncios se paga solo desde 54 (rango 25 a 186) restaurantes (tarifa baja).

**Qué no está modelado** en el ingreso por anuncios: moderación de anuncios (revisar y bloquear categorías); tasa de llenado y bloqueadores (van dentro de `parte_visitas_con_anuncio`, sin modelar por separado); comisión de la red de anuncios; impuestos sobre los ingresos de anuncios y de suscripción. **El 0.6 de visitas con la app y el 0.6 de visitas con anuncio no son el mismo descuento contado dos veces:** el primero es cuántos comensales abren la app (simulador), el segundo en cuántas de esas visitas se sirve un anuncio que paga; coinciden en el número y los dos son supuestos sin dato.

**Conciliación con [planes-y-costo §0](2026-11-13-planes-y-costo-por-restaurante.md).** Ese documento da **110–140 USD al mes de base fija para 1,000 restaurantes [estimada, ±2×, con el sondeo de hoy]**; este modelo da **≈ 34 USD de servidor, disco y fotos** (sin el soporte de 500 pesos) para 1,000 gratuitos en el escalón pro_2. **No contradicen: son dos mundos.** El del documento supone que cada teléfono pregunta cada 3 s (sondeo), que es lo que corre hoy; el del modelo supone el canal de eventos (ADR-018, **no construido**), con el que cada restaurante carga mucho menos al procesador. **Hasta que T-3.20 y T-3.21 existan, vale el del documento (110–140 USD); el del modelo es una meta, no un costo vigente.**

## 4. Todas las cifras en cuatro casos

**Recomendado** = curva de pago media (mediana de Master Chef = 225, el precio de Meniu Business) y anuncios en la tarifa baja ya en marcha · **Peor** = curva de pago pesimista y SIN anuncios en ningún mes (los costos los pone Calvin de su bolsa) · **Mejor** = curva de pago optimista y anuncios en la tarifa media · **Piso de verdad** = curva pesimista, anuncios adversos (mitad de la tarifa baja, anuncio en el 30 % de las visitas) y soporte al máximo de su rango. *Cada escenario mueve dos ejes a la vez (curva de pago y anuncios): la matriz de §5 los separa.*

| Cifra | Recomendado | Peor | Mejor | Piso de verdad | Qué es |
|---|---|---|---|---|---|
| Clientes potenciales (negocios) | **104,882** | 104,882 | 104,882 | 104,882 | dato medido (DENUE 05/2026): no varía con los escenarios |
| Restaurantes gratuitos que caben (con historial del gratuito de 1 mes: PROPUESTA, hoy nada purga) (restaurantes) | **279** | 148 | 2,116 | 148 | con el historial del gratuito que dice `config` (30 días es una propuesta que contradice 03 §7); recomendado = Hobby con eventos (por disco); peor = Hobby con sondeo (por procesador); mejor = Pro de 8 procesos (por líneas abiertas, tope de diseño supuesto) |
| Restaurantes gratuitos que caben SIN purga (12 meses de historial acumulado) (restaurantes) | **23** | 23 | 236 | 23 | lo que hay hoy: nada limpia; el disco manda desde el segundo mes de operación |
| Gratuitos que sostiene cada cliente de paga (sin anuncios) (restaurantes) | **125.2** | 131.9 | 74 | 16.3 | con anuncios en marcha cada gratuito se paga solo si deja más de lo que cuesta (`se_paga_solo`) |
| Ingreso por cliente gratuito (pesos al mes) | **4.3** | 0 | 17.2 | 1.1 | sólo anuncios |
| Ingreso por cliente de paga (pesos al mes) | **225** | 225 | 225 | 225 | promedio entre Master Chef y Chef Ejecutivo según cuántos hay de cada uno |
| Costo por cliente gratuito (pesos al mes) | **1.2** | 1.1 | 2 | 3.6 | servidor, almacenamiento y soporte |
| Margen de operación (pesos al mes) | **+20,024** | +2,390 | +65,664 | −1,109 | sin captación ni sueldos |
| Margen después de captación (pesos al mes) | **+17,938** | +1,968 | +58,784 | −1,531 | resta reponer las bajas y los sueldos (parámetros sin dato) |
| Punto de equilibrio (clientes de paga) | **0** | 7.5 | 0 | 43.1 | cuántos clientes de paga hacen falta para no perder (el peor caso lo calcula sin anuncios) |
| Comensales al mes (comensales) | **3,683,301** | 3,470,835 | 4,295,252 | 3,470,835 | dato por restaurante SIMULADO (perfiles del simulador), no medido |

*Techo teórico «todos pagan» (1,000): +146,169 pesos al mes; no se usa como cota.*

## 5. Matriz curva × anuncios (margen de operación, 1,000 restaurantes) y esperado a 100, 1,000 y 10,000

| Curva de pago | Sin anuncios | Tarifa baja | Tarifa media |
|---|---|---|---|
| pesimista | +2,390 | +6,594 | +19,206 |
| media | +16,218 | +20,024 | +31,442 |
| optimista | +55,025 | +57,685 | +65,664 |

**Piso de verdad** (pesimista, anuncios adversos y soporte al máximo de su rango): **−1,109**.

| Restaurantes | Peor | Recomendado | Mejor | Piso de verdad |
|---|---|---|---|---|
| 100 | +85 → +42 | **+1,857 → +1,648** | +6,336 → +5,648 | −265 → −307 |
| 1,000 | +2,390 → +1,968 | **+20,024 → +17,938** | +65,664 → +58,784 | −1,109 → −1,531 |
| 10,000 | +24,722 → +20,505 | **+200,180 → +179,321** | +661,988 → +593,195 | −10,266 → −14,483 |

*(margen de operación → después de captación)*

## 6. Qué supuesto mueve más el margen, en llano (1,000 restaurantes, recomendado)

**Qué medir primero en el piloto:** 1. curva · mediana → prueba de precio del piloto (Van Westendorp y escalera) · 2. curva · techo → prueba de precio del piloto: cuántos de cada 10 aceptan · 3. cuántos rebasan los topes → mesas y cuentas reales de los primeros 10 a 20 restaurantes · 4. soporte por cliente de paga → tickets y minutos de soporte del piloto · 5. visitas con la app por gratuito → eventos scan del piloto.

| Qué pasa si… | Efecto en el margen (pesos al mes) |
|---|---|
| Si cuánto está dispuesto a pagar el dueño promedio fuera la mitad de lo que supusimos, el margen baja de 20,024 a 7,371; si fuera una vez y media, sube a 28,509. | 21,139 |
| Si qué parte de los que rebasan los topes llega a pagar fuera la mitad de lo que supusimos, el margen baja de 20,024 a 11,552; si fuera una vez y media, sube a 28,495. | 16,943 |
| Si cuántos negocios pasan del tope de mesas o cuentas del plan gratuito fuera la mitad de lo que supusimos, el margen baja de 20,024 a 11,808; si fuera una vez y media, sube a 28,240. | 16,431 |
| Si cuánto tiempo de soporte requiere cada cliente de paga fuera la mitad de lo que supusimos, el margen sube de 20,024 a 23,500; si fuera una vez y media, baja a 16,547. | 6,953 |
| Si cuántas visitas con la app tiene cada restaurante gratuito fuera la mitad de lo que supusimos, el margen baja de 20,024 a 18,121; si fuera una vez y media, sube a 21,927. | 3,806 |
| Si cuánto deja cada mil visitas con anuncio fuera la mitad de lo que supusimos, el margen baja de 20,024 a 18,121; si fuera una vez y media, sube a 21,927. | 3,806 |
| Si en qué parte de las visitas se ve un anuncio fuera la mitad de lo que supusimos, el margen baja de 20,024 a 18,121; si fuera una vez y media, sube a 21,927. | 3,806 |
| Si qué parte de los clientes de paga paga con tarjeta (y sufre la comisión) fuera la mitad de lo que supusimos, el margen sube de 20,024 a 20,857; si fuera una vez y media, sube a 20,024. | 833 |

## 7. Crecimiento mes a mes (adopción **supuesta**: 300 restaurantes a 12 meses y 1200 a 24; anuncios desde el mes 9)

Margen de operación al mes. Peor = sin anuncios en ningún mes; recomendado: anuncios desde el mes 9.

| Mes | Restaurantes | De paga (recomendado) | Peor | **Recomendado** | Mejor | Piso de verdad | Escalón |
|---|---|---|---|---|---|---|---|
| 3 | 19 | 2 | −138 | **+127** | +888 | −224 | hobby_eventos (sin anuncios todavía) |
| 6 | 75 | 9 | +16 | **+1,060** | +3,851 | −325 | hobby_eventos (sin anuncios todavía) |
| 9 | 169 | 20 | +274 | **+3,060** | +10,990 | −317 | pro_2 |
| 12 | 300 | 35 | +431 | **+5,749** | +19,826 | −619 | pro_2 |
| 18 | 675 | 78 | +1,480 | **+13,445** | +45,119 | −881 | pro_2 |
| 24 | 1,200 | 139 | +2,855 | **+24,121** | +79,206 | −1,344 | pro_4 |
| 36 | 2,700 | 313 | +5,995 | **+53,912** | +178,761 | −3,452 | pro_8 |

**Primer mes con margen de operación positivo (recomendado): 3; después de captación: 9.** **Lo más que tendría que poner Calvin, acumulado: 4,309 pesos** (peor: 4,256; piso de verdad: 94,950). *Artefacto de la curva de adopción supuesta y del costo de captación sin dato.* **Más de ≈ 1,460 restaurantes registrados exige otra arquitectura: todo costo de ahí en adelante es extrapolación sin medir.**

## 8. Dos mensajes y un dato de contexto

- **Dónde está el valor** (calculado): Para un negocio de 11 a 50 personas, Carta (225 pesos al mes) cuesta alrededor de la cuarta parte de lo que ya paga por un punto de venta como Fudo Pro (838), y 0.03 % de lo que vende en promedio al mes. *Advertencia: Promedio (total ÷ negocios), no mediana, de la clase 722511 (restaurantes con servicio completo) en los Censos Económicos 2024, año de referencia 2023: quedan fuera antojitos, tacos y cafeterías; un promedio lo jalan los grandes. Dato por conseguir: mediana y otras clases.*
- **Qué significa el precio** (calculado): Si el dueño típico pagaría alrededor de 150, conviene cobrar 199; si pagaría 225, 225 o 249; si 300, 299; si 450 o más, 299. No sabemos cuánto pagaría: lo mide la prueba de tres precios del piloto.
- **A dónde se va cada 100 pesos** (margen de operación: antes de captación, sueldos e impuestos): El margen de operación no es la ganancia final (faltan la captación, los sueldos y los impuestos): de cada 100 pesos que entran, se quedan 67 en el recomendado, 67.9 en el mejor y 45.4 en el peor. Del recomendado al mejor el porcentaje casi no cambia porque el soporte y la comisión crecen con cada cliente de paga (30.3 → 29.8 de cada 100); lo que sube es el monto (20,024 → 65,664 pesos al mes).

| De cada 100 pesos que entran | Recomendado | Peor | Mejor | Piso de verdad |
|---|---|---|---|---|
| servidor | 2.4 | 11.2 | 2.1 | 9.4 |
| almacenamiento | 0.3 | 1.1 | 0.2 | 0.9 |
| soporte | 24.7 | 35.9 | 24.1 | 101.9 |
| comisión de cobro | 5.6 | 6.4 | 5.7 | 5.3 |
| margen | 67 | 45.4 | 67.9 | -17.5 |

- **Internet y celular en México** (ENDUTIH 2024, INEGI, 6 de mayo de 2025, págs. 3, 6 y 17 del [reporte](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/endutih/ENDUTIH_24_RR.pdf), consultado el 17 de noviembre de 2026): **100.2 millones de usuarios de internet (83.1 % de la población de 6 años o más); 97.2 % de ellos se conectó con un celular inteligente** (otros equipos, respuestas múltiples: televisor 43.6 %, computadora 35.9 %, consola 8.1 %). **Tipo de conexión sólo existe para usuarios de celular inteligente:** ambas 72.8 %, sólo wifi 16.3 %, sólo datos móviles 10.9 %. Es la edición más reciente que pude leer (no verifiqué una edición 2025).

## 9. Límites (dichos)

- **No hay dato de disposición a pagar, de bajas ni de costo de conseguir un cliente.** Los umbrales de anuncios dependen de la tarifa, la parte de visitas con anuncio y el soporte por gratuito, sin dato.
- **Los topes de mesas y cuentas son un modelo:** medido sólo el conteo por estrato; el piloto debe medir mesas y cuentas por negocio.
- **El dato de comensales por restaurante es simulado**; los muros salen de un simulador, no de una prueba de carga (±2×).
- **Ingresos de anuncios sin modelar:** moderación de anuncios (revisar y bloquear categorías); tasa de llenado y bloqueadores (van dentro de `parte_visitas_con_anuncio`, sin modelar por separado); comisión de la red de anuncios; impuestos sobre los ingresos de anuncios y de suscripción.
- **Pruebas:** `node 2026-11-14-pruebas.mjs` fija con tolerancia estrecha las cifras de titular y prueba que ningún escenario «sin anuncios» tenga ingresos por anuncios.
