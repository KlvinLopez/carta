# Modelo de escenarios de Carta: la segmentación de Calvin, el peor caso real y qué hay que medir

**Fecha:** 14 de noviembre de 2026 (ronda 4, corregida tras la revisión crítica de la maestra) · **Rama:** `agente/planes-precio-historial` · **La v1 no cobra ni tiene planes.** Lo genera `2026-11-14-corre-escenarios.mjs` desde el modelo: ninguna cifra se transcribe a mano.

## Conclusiones

1. **Chef (gratis) = 91,048 negocios (86.8 %, medido): con 25 mesas, 4 cuentas y 150 platillos, 95.1 % de los negocios de hasta 10 personas quedan dentro (intervalo del modelo 86.7 %–98 %); es un MODELO, no una medida:** sólo los conteos por estrato son medidos; personas → cuentas → mesas y su dispersión (σ = 0.5) son supuestos. Con los topes anteriores (15 mesas) y la misma dispersión sólo 89.4 % (mínimo 77.7 %).
2. **Margen de operación con 1,000 restaurantes (pesos al mes): +8,719 recomendado · −47 peor · +32,655 mejor · −2,031 piso de verdad.** De la brecha entre «mejor» y la curva optimista con tarifa baja, 11,622 vienen sólo de la tarifa media de anuncios (§5).
3. **Peor caso real (todos gratuitos): con 1,000 pesos al mes de la bolsa de Calvin caben 811 restaurantes gratuitos (rango 246 a 1,896 según el soporte por gratuito, que no tiene fuente) y 2.8 millones de comensales al mes (simulados); sólo vale con el canal de eventos construido: con el sondeo de hoy caben 148.**
4. **Los anuncios pagan el sistema desde 54 (rango 25 a 186) restaurantes con la tarifa baja, 12 (rango 6 a 25) con la media y 1,469 (rango 139 a imposible) en el adverso: son rangos, no puntos** (con la tarifa a la mitad la tarifa baja pasa de 54 a 139; con el soporte por gratuito en 3 pesos, el adverso queda en no se paga solo).
5. **Qué medir primero en el piloto: curva · mediana, cuántos rebasan los topes, curva · techo;** y el precio de Master Chef (199, 225, 249, 299) **no lo decide este modelo**: lo decide la prueba de precios ([precio de entrada](2026-11-14-precio-de-entrada.md)).

**Recomendado** = curva de pago media (mediana de Master Chef = 225, el precio de Meniu Business) y anuncios en la tarifa baja ya en marcha · **Peor** = curva de pago pesimista y SIN anuncios en ningún mes (los costos los pone Calvin de su bolsa) · **Mejor** = curva de pago optimista y anuncios en la tarifa media · **Piso de verdad** = curva pesimista, anuncios adversos (mitad de la tarifa baja, anuncio en el 30 % de las visitas) y soporte al máximo de su rango. *Cada escenario mueve dos ejes a la vez (curva de pago y anuncios): la matriz de §5 los separa.*

**Qué cambió en la ronda 4 (API del `.mjs`, versión `2026-11-14-r4`).** Firmas anteriores intactas. Nuevo: `ESCENARIOS` (una sola definición de cada escenario), `evaluarEscenario`, `proyectarEscenario`, `matrizEscenarios`, `rangoSePagaSolo`, `rangoBolsa`, `sensibilidadPrecio`, `NO_MODELADO`; `valores()` añade `s.rangos`; `seguridadChico` acepta `'maximo'`; `resumen` trae `piso_de_verdad` en cada cifra; la rejilla del optimizador llega a 60 mesas y 10 cuentas. **`configInicial()` cambia el tope de mesas de Chef de 15 a 25** (consecuencia de la dispersión de mesas por cuenta; los demás topes y precios no cambian).

---

## 1. La segmentación de Calvin, traducida a topes

**Clientes potenciales = 104,882** (DENUE, mayo de 2026 [medido]). **Chef (gratis)** = 0–5 y 6–10 personas: **91,048 (86.8 %)** · **Master Chef** = 11–30, 31–50 y 51–100: **13,614 (13.0 %)** · **Chef Ejecutivo** = 101–250 y 251 o más: **220 (0.2 %)** (todo medido).

**Carta no sabe cuánta gente trabaja en un negocio**, así que la frontera se traduce a **topes que el producto aplica** con un modelo: cuentas = ⌈f × personas⌉ (f = 0.35 a 0.50), mesas = cuentas × m × exp(σ·z), m = 2.5 a 4 y **σ = 0.5 (rango 0 a 0.75): dispersión de las mesas por cuenta, supuesto sin dato** (la versión anterior la fijaba en 0: las mesas eran una función exacta de las cuentas). **Medido: sólo los conteos por estrato. Supuesto: todo lo demás.** El piloto debe medir **mesas y cuentas por negocio** (mesas y personal activos de cada alta de los primeros 10 a 20 restaurantes) para acotar f, m y σ.

**¿Con qué topes un negocio de hasta 10 personas queda dentro del gratuito?** (centro con σ = 0.5; entre paréntesis el mínimo y máximo de las 27 combinaciones del modelo; la columna «sin dispersión» es la versión anterior)

| Seguridad que se quiere | Topes de Chef (mesas · cuentas) | Con dispersión: centro (mín–máx) | Sin dispersión (anterior) | Parte de TODOS los registrados dentro | Negocios de más de 10 personas que se cuelan gratis |
|---|---|---|---|---|---|
| **80 %** | 12 mesas · 3 cuentas | 82 % (69 %–95 %) | 91 % | 71 % | 0 % (hasta 0 %) |
| **90 %** | 15 mesas · 4 cuentas | 91 % (79 %–100 %) | 98 % | 79 % | 0 % (hasta 9 %) |
| **95 %** | 20 mesas · 5 cuentas | 96 % (89 %–100 %) | 100 % | 84 % | 6 % (hasta 32 %) |

**Versión conservadora** (la seguridad vale aun en el peor rincón de las 27 combinaciones):

| Seguridad que se quiere | Topes de Chef | Seguridad mínima | Dentro (todos) | Se cuelan gratis |
|---|---|---|---|---|
| **80 %** | 16 mesas · 4 cuentas | ≥ 80 % | 81 % | hasta 9 % |
| **90 %** | 25 mesas · 5 cuentas | ≥ 92 % | 87 % | hasta 32 % |
| **95 %** | 40 mesas · 5 cuentas | ≥ 98 % | 88 % | hasta 32 % |

**Con el tope de platillos y las lecturas de PDF** (un negocio chico puede tener carta larga) **la configuración inicial queda en 25 mesas · 4 cuentas · 150 platillos con 95.1 % de seguridad** (el optimizador la elige: la de mayor margen que cumple 95 %; **está en el borde de la restricción**, no por encima). **Con 15 mesas, que era la elección antes de la dispersión, ya no cumple:** 89.4 %.

| Seguridad exigida a Chef | Topes | Seguridad real | Dentro de todos | Margen (1,000 restaurantes, curva media) |
|---|---|---|---|---|
| **80 %** | 12 mesas · 3 cuentas · 150 platillos | 80 % | 69 % | 11,985 |
| **90 %** | 20 mesas · 4 cuentas · 100 platillos | 90.3 % | 78 % | 9,799 |
| **95 %** | 25 mesas · 4 cuentas · 150 platillos | 95.1 % | 83 % | 8,722 |

**Master Chef** cubre hasta 100 mesas y 30 cuentas (≈ 95 % de los negocios de 11 a 100 personas; arriba de esos topes queda ≈ 0.8 % de los registrados, que pasan a Chef Ejecutivo; por personal, Chef Ejecutivo es 0.2 %). **Chef Ejecutivo** exige subir el tope técnico de **50 cuentas activas** por restaurante (T-1.6): un negocio de 101 a 250 personas tiene 36 a 125 cuentas de personal en el modelo (**cambio de código, no de este informe**).

## 2. Precios: Master Chef pegado a Meniu, Chef Ejecutivo hacia arriba

**225 es una decisión de posicionamiento de Calvin (quedar pegado a Meniu Business), no un resultado del modelo**: la curva «media» se construyó con mediana 225 y por eso el óptimo sale cerca (234). Ver [precio de entrada](2026-11-14-precio-de-entrada.md) para la sensibilidad completa.

Cada precio con tres curvas (pesimista · media · optimista), **1,000 restaurantes registrados**. «Sin pérdidas» = margen de operación **y** después de captación ≥ 0 (con anuncios en marcha · sin anuncios todavía).

| Master Chef | Pagantes de Master Chef | Margen de operación (con anuncios) | Después de captación | Margen de operación **sin anuncios** | Equilibrio sin anuncios (pagantes) | ¿Sin pérdidas? (con anuncios · sin) |
|---|---|---|---|---|---|---|
| **199** | 7.9 · 33.8 · 97.2 | +4,334 · +8,573 · +18,833 | +4,187 · +7,939 · +17,005 | +64 · +4,419 · +14,965 | 9 | sí · no |
| **225** | 5.9 · 29.1 · 95.8 | +4,231 · +8,719 · +21,033 | +4,122 · +8,171 · +19,231 | −47 · +4,545 · +17,159 | 7.5 | sí · no |
| **249** | 4.4 · 25.2 · 94.2 | +4,123 · +8,724 · +22,948 | +4,039 · +8,245 · +21,175 | −162 · +4,533 · +19,068 | 6.5 | sí · no |
| **299** | 2.5 · 18.5 · 90 | +3,905 · +8,471 · +26,512 | +3,857 · +8,113 · +24,815 | −388 · +4,252 · +22,613 | 5.1 | sí · no |

| Chef Ejecutivo | Pagantes de Chef Ejecutivo | Margen de operación (con anuncios) | Después de captación | Margen de operación **sin anuncios** | Equilibrio sin anuncios (pagantes) | ¿Sin pérdidas? (con anuncios · sin) |
|---|---|---|---|---|---|---|
| **799** | 0.5 · 2.1 · 4.7 | +4,330 · +8,740 · +20,058 | +4,216 · +8,179 · +18,249 | +53 · +4,569 · +16,186 | 7.5 | sí · no |
| **1099** | 0.2 · 1.4 · 4.3 | +4,231 · +8,719 · +21,033 | +4,122 · +8,171 · +19,231 | −47 · +4,545 · +17,159 | 7.5 | sí · no |
| **1599** | 0.1 · 0.6 · 3.3 | +4,110 · +8,315 · +21,646 | +4,003 · +7,780 · +19,862 | −169 · +4,138 · +17,767 | 7.5 | sí · no |

**Lectura.** (1) **Los precios de Chef Ejecutivo cambian el margen menos de 2 %**: sólo ≈ 1.4 negocio de cada 1,000 es de ese tamaño; su precio **no se decide por margen sino por posicionamiento** (1,099 es lo que cuestan OlaClick Elite y Last.app). (2) **Master Chef: 199 a 299 cambia poco el margen pero sí los pagantes** (de 34 a 18 con la curva media). (3) **Sin anuncios, con la curva pesimista y 1,000 restaurantes, ningún precio evita la pérdida** (−47 al mes a 225): ese periodo lo paga Calvin.

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
| Restaurantes gratuitos que caben (restaurantes) | **279** | 148 | 2,116 | 148 | recomendado = escalón Hobby con eventos (por disco); peor = Hobby con sondeo (por procesador); mejor = Pro de 8 procesos (10,000 conexiones) |
| Gratuitos que sostiene cada cliente de paga (sin anuncios) (restaurantes) | **132.3** | 131.4 | 125.3 | 16.3 | con anuncios en marcha cada gratuito se paga solo si deja más de lo que cuesta (`se_paga_solo`) |
| Ingreso por cliente gratuito (pesos al mes) | **4.3** | 0 | 17.2 | 1.1 | sólo anuncios |
| Ingreso por cliente de paga (pesos al mes) | **265.7** | 257 | 262.5 | 257 | promedio entre Master Chef y Chef Ejecutivo según cuántos hay de cada uno |
| Costo por cliente gratuito (pesos al mes) | **1.1** | 1.1 | 1.2 | 3.6 | servidor, almacenamiento y soporte |
| Margen de operación (pesos al mes) | **+8,719** | −47 | +32,655 | −2,031 | sin captación ni sueldos |
| Margen después de captación (pesos al mes) | **+8,171** | −157 | +30,852 | −2,141 | resta reponer las bajas y los sueldos (parámetros sin dato) |
| Punto de equilibrio (clientes de paga) | **0** | 7.5 | 0 | 43.1 | cuántos clientes de paga hacen falta para no perder (el peor caso lo calcula sin anuncios) |
| Comensales al mes (comensales) | **3,487,041** | 3,431,012 | 3,647,111 | 3,431,012 | dato por restaurante SIMULADO (perfiles del simulador), no medido |

*Techo teórico «todos pagan» (1,000): +152,416 pesos al mes; no se usa como cota.*

## 5. Matriz curva × anuncios (margen de operación, 1,000 restaurantes) y esperado a 100, 1,000 y 10,000

| Curva de pago | Sin anuncios | Tarifa baja | Tarifa media |
|---|---|---|---|
| pesimista | −47 | +4,231 | +17,068 |
| media | +4,545 | +8,719 | +21,241 |
| optimista | +17,159 | +21,033 | +32,655 |

**Piso de verdad** (pesimista, anuncios adversos y soporte al máximo de su rango): **−2,031**.

| Restaurantes | Peor | Recomendado | Mejor | Piso de verdad |
|---|---|---|---|---|
| 100 | −159 → −170 | **+718 → +663** | +3,120 → +2,939 | −357 → −368 |
| 1,000 | −47 → −157 | **+8,719 → +8,171** | +32,655 → +30,852 | −2,031 → −2,141 |
| 10,000 | +312 → −785 | **+88,041 → +82,555** | +326,480 → +308,456 | −19,527 → −20,625 |

*(margen de operación → después de captación)*

## 6. Qué supuesto mueve más el margen, en llano (1,000 restaurantes, recomendado)

**Qué medir primero en el piloto:** 1. curva · mediana → prueba de precio del piloto (Van Westendorp y escalera) · 2. cuántos rebasan los topes → mesas y cuentas reales de los primeros 10 a 20 restaurantes · 3. curva · techo → prueba de precio del piloto: cuántos de cada 10 aceptan · 4. tarifa de anuncios → prueba pequeña de AdSense con 3 restaurantes · 5. visitas con anuncio → prueba pequeña de AdSense con 3 restaurantes.

| Qué pasa si… | Efecto en el margen (pesos al mes) |
|---|---|
| Si cuánto está dispuesto a pagar el dueño promedio fuera la mitad de lo que supusimos, el margen baja de 8,719 a 5,523; si fuera una vez y media, sube a 10,848. | 5,324 |
| Si cuántos negocios pasan del tope de mesas o cuentas del plan gratuito fuera la mitad de lo que supusimos, el margen baja de 8,719 a 6,199; si fuera una vez y media, sube a 11,150. | 4,950 |
| Si qué parte de los que rebasan los topes llega a pagar fuera la mitad de lo que supusimos, el margen baja de 8,719 a 6,594; si fuera una vez y media, sube a 10,844. | 4,250 |
| Si cuánto deja cada mil visitas con anuncio fuera la mitad de lo que supusimos, el margen baja de 8,719 a 6,632; si fuera una vez y media, sube a 10,806. | 4,174 |
| Si en qué parte de las visitas se ve un anuncio fuera la mitad de lo que supusimos, el margen baja de 8,719 a 6,632; si fuera una vez y media, sube a 10,806. | 4,174 |
| Si cuántas visitas con la app tiene cada restaurante gratuito fuera la mitad de lo que supusimos, el margen baja de 8,719 a 6,632; si fuera una vez y media, sube a 10,806. | 4,174 |
| Si cuánto tiempo de soporte requiere cada cliente de paga fuera la mitad de lo que supusimos, el margen sube de 8,719 a 9,676; si fuera una vez y media, baja a 7,762. | 1,914 |
| Si cuánto tiempo de soporte requiere cada cliente gratuito fuera la mitad de lo que supusimos, el margen sube de 8,719 a 8,962; si fuera una vez y media, baja a 8,477. | 485 |

## 7. Crecimiento mes a mes (adopción **supuesta**: 300 restaurantes a 12 meses y 1200 a 24; anuncios desde el mes 9)

Margen de operación al mes. Peor = sin anuncios en ningún mes; recomendado: anuncios desde el mes 9.

| Mes | Restaurantes | De paga (recomendado) | Peor | **Recomendado** | Mejor | Piso de verdad | Escalón |
|---|---|---|---|---|---|---|---|
| 3 | 19 | 1 | −184 | **−97** | +145 | −242 | hobby_eventos (sin anuncios todavía) |
| 6 | 75 | 2 | −167 | **+178** | +1,130 | −396 | hobby_eventos (sin anuncios todavía) |
| 9 | 169 | 5 | −138 | **+1,343** | +5,195 | −473 | hobby_eventos |
| 12 | 300 | 9 | −300 | **+2,330** | +9,538 | −895 | pro_2 |
| 18 | 675 | 21 | −165 | **+5,753** | +21,971 | −1,504 | pro_2 |
| 24 | 1,200 | 37 | −69 | **+10,450** | +39,279 | −2,450 | pro_4 |
| 36 | 2,700 | 82 | −596 | **+23,091** | +88,013 | −5,952 | pro_8 |

**Primer mes con margen de operación positivo (recomendado): 5; después de captación: 9.** **Lo más que tendría que poner Calvin, acumulado: 2,032 pesos** (peor: 20,594; piso de verdad: 88,023). *Artefacto de la curva de adopción supuesta y del costo de captación sin dato.* **Más de ≈ 2,030 restaurantes registrados exige otra arquitectura: todo costo de ahí en adelante es extrapolación sin medir.**

## 8. Límites (dichos)

- **No hay dato de disposición a pagar, de bajas ni de costo de conseguir un cliente.** Los umbrales de anuncios dependen de la tarifa, la parte de visitas con anuncio y el soporte por gratuito, sin dato.
- **Los topes de mesas y cuentas son un modelo:** medido sólo el conteo por estrato; el piloto debe medir mesas y cuentas por negocio.
- **El dato de comensales por restaurante es simulado**; los muros salen de un simulador, no de una prueba de carga (±2×).
- **Ingresos de anuncios sin modelar:** moderación de anuncios (revisar y bloquear categorías); tasa de llenado y bloqueadores (van dentro de `parte_visitas_con_anuncio`, sin modelar por separado); comisión de la red de anuncios; impuestos sobre los ingresos de anuncios y de suscripción.
- **Pruebas:** `node 2026-11-14-pruebas.mjs` fija con tolerancia estrecha las cifras de titular y prueba que ningún escenario «sin anuncios» tenga ingresos por anuncios.
