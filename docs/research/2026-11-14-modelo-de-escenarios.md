# Modelo de escenarios de Carta: variables globales, tres casos y qué supuestos mandan

**Fecha:** 14 de noviembre de 2026 (revisado el mismo día tras la ronda de la maestra) · **Rama:** `agente/planes-precio-historial` · **Estado:** modelo en código para decidir; la v1 no cobra ni tiene planes. **Este documento lo genera `2026-11-14-corre-escenarios.mjs` desde el modelo: ninguna cifra se transcribe a mano.**
**Código:** [`…-modelo-de-escenarios.mjs`](2026-11-14-modelo-de-escenarios.mjs) · **Parámetros:** [`…-parametros.json`](2026-11-14-parametros.json) (57; cada uno con valor, rango, origen, fuente y si mueve el resultado) · **Pruebas:** [`…-pruebas.mjs`](2026-11-14-pruebas.mjs) · **Resultados:** [`…-modelo-de-escenarios-resultados.json`](2026-11-14-modelo-de-escenarios-resultados.json).

**Qué cambió con la revisión** (*antes decía… la revisión mostró…*): (1) *«el óptimo coincide con lo que Calvin ya decidió»* → **los topes del gratuito son consecuencia de cuánto cupo gratis se exige (decisión de Calvin), no un óptimo**; (2) *Master Chef 249 «óptimo»* → **una meseta** y un precio de Chef Ejecutivo que **no sale de la optimización**; (3) *163 / 218 / 580* → **un rango de ≈ 110 a 850 que depende de la curva de pago, que es supuesto**; (4) *los anuncios sostenían el peor caso* → **el peor caso firme es sin anuncios**; los anuncios son **condicionales** (no están aprobados ni construidos); (5) se añadieron soporte del gratuito, bajas, costo de conseguir un cliente, sueldos e impuestos, y el margen se da **antes y después de captación**.
**Cambios de API (para la sesión que lo incrusta):** los anuncios **no suman** salvo que `supuestos.anuncios_aprobados = true` o `opc.anunciosAprobados = true` (antes sumaban con sólo `config.anuncios.activo`); `configBase()` ahora es un alias de `configInicial()` (la recomendada **sin anuncios**; antes era otra); `margen.pesos` sigue siendo el de operación y se añaden `margen_operacion`, `margen_despues_de_captacion`, `margen_neto`, `se_paga_solo`, `extrapolacion_sin_medir`, `valores_esperados`, `sensibilidad()` y `sensibilidadPrecioOptimo()`; `precioOptimo` devuelve `meseta`; `optimizar` devuelve `tabla_cupo_gratis`, `meseta_precio_servicio`, `precio_salon` y `sensibilidad_traslape` (ya no devuelve `sensibilidad`, que pasó a `sensibilidad()`).

**Marcas.** *medido* · *documento* · *fuente* · ***supuesto*** · *sin dato*. Pesos al mes antes de IVA. Planes: **Chef** (gratis), **Master Chef**, **Chef Ejecutivo** (nombre propuesto; el prototipo, `admin-onboarding.jsx` paso 3, sólo trae los dos primeros). Configuración con que sale todo: **«recomendada sin anuncios»**: Master Chef 299, Chef Ejecutivo 499, Chef con 10 mesas, 3 cuentas y 80 platillos, 12 meses de historial en línea para la paga, **sin anuncios**. Los clientes son **valores esperados** (pueden ser fracciones).

---

## 0. Conclusiones

- **El peor caso firme es sin anuncios y pierde dinero:** −268 / −1,137 / −10,601 pesos al mes con 100 / 1,000 / 10,000 restaurantes. **Los anuncios no están aprobados ni construidos** (la política de seguridad del sitio no los permite; hace falta un ADR, abrirla y cambiar el aviso de privacidad, [anuncios §3.6–3.7]). Si algún día se aprueban, el caso **condicional** da +450 / +6,038 / +61,149 con la tarifa «baja» y anuncio en todas las visitas, **pero con la tarifa a la mitad y anuncio en el 30 % de las visitas** baja a −160 / −61 / +161. **La tarifa «baja» no es una cota inferior.**
- **Margen esperado con 1,000 restaurantes** (operación; curvas pesimista · media · optimista): **+58 · +6,485 · +46,106** pesos al mes; **después de captación** (bajas 3 % al mes y 600 pesos por cliente de paga, *sin dato: supuesto de trabajo*): **−39 · +5,872 · +42,377**. No incluye sueldos ni impuestos (parámetros en 0).
- **Mejor caso (todos pagan, 1,000):** +220,481 pesos al mes; **exige repetir la pila de servidores** (extrapolación sin medir).
- **Los topes del gratuito dependen de cuánto quieres atender gratis:** para que **quepa gratis el 50 / 60 / 70 / 80 %** los topes son **8 mesas y 2 cuentas / 10 mesas y 3 cuentas / 15 mesas y 4 cuentas / 20 mesas y 5 cuentas** y el margen es **9,883 / 7,343 / 4,658 / 3,044** (§4). *No hay un óptimo: cada 10 puntos de cupo gratis cuestan ≈ 2,280 pesos al mes con 1,000.* Con traslape de topes 0.5, los mismos topes dejan dentro 38 % (no 61 %); con 1, 14 %.
- **El precio de Master Chef es una meseta, no un punto:** con la curva media el margen por restaurante que rebasa topes cambia **menos de 2 %** entre **192 y 247**; el optimizador completo da **225** (meseta 200–225). Pero **el precio óptimo depende de la curva (mediana, sigma, techo), que es supuesto**: con la mediana ±50 % va de 110 a 221 (pesimista), 139 a 300 (media) y 315 a 847 (optimista): **un rango de ≈ 110 a 850 pesos**. **El dato que lo sustituye es la prueba de precio del piloto.**
- **Qué supuesto mueve más el margen** (±50 %, 1,000 restaurantes, firme): **curva · mediana** (14,071 pesos), **curva · techo** (7,533) y **curva · sigma** (7,084). Con anuncios aprobados, curva · mediana y curva · techo pasan al frente.
- **Más allá de ≈ 2,030 restaurantes registrados (curva media) hace falta otra arquitectura:** todo costo de ahí en adelante es **extrapolación sin medir**; el modelo lo marca (`requiere_arquitectura`, `extrapolacion_sin_medir`).

---

## 1. Peor caso: firme y condicional (margen de operación al mes)

| Restaurantes | **Peor firme: todos gratuitos, sin anuncios** | Condicional: anuncios aprobados, tarifa baja, 100 % de visitas | Condicional adverso: tarifa a la mitad y 30 % de visitas | Condicional: tarifa media |
|---|---|---|---|---|
| 100 | −268 | +450 | −160 | +2,602 |
| 1,000 | −1,137 | +6,038 | −61 | +27,563 |
| 10,000 | −10,601 | +61,149 | +161 | +276,399 |

Sólo el **primer** caso existe hoy. Los otros tres **suponen** que los anuncios se aprueben y se construyan. Costo de atender a un cliente gratuito: **1.1 pesos** con 1,000 restaurantes (incluye 0.5 de soporte, *supuesto de trabajo*: con 1 peso el peor caso empeora 500 pesos al mes con 1,000 restaurantes).

**Por cada cliente de paga, cuántos gratuitos se sostienen** (sin anuncios; margen del cliente de paga ÷ costo del gratuito): **83 / 195 / 210** con 100 / 1,000 / 10,000 restaurantes, configuración recomendada, curva media. Con anuncios **aprobados** cada gratuito se paga solo si deja más de lo que cuesta (`se_paga_solo = true`, `gratuitos_por_pagante = null`).

## 2. Esperado y mejor caso (operación, y después de captación)

| Restaurantes | Pesimista | Media | Optimista | Mejor: todos pagan |
|---|---|---|---|---|
| 100 | 1 de paga · **−148** (-92 %) | 3 de paga · **+494** (48 %) | 21 de paga · **+4,465** (69 %) | +22,003 (72 %) |
| 1,000 | 5 de paga · **+58** (4 %) | 34 de paga · **+6,485** (63 %) | 207 de paga · **+46,106** (72 %) | +220,481 (72 %) |
| 10,000 | 54 de paga · **+1,364** (8 %) | 341 de paga · **+65,707** (64 %) | 2,072 de paga · **+458,324** (71 %) | +2,211,166 (72 %) |

**Operación → después de captación** (reponer bajas del 3 % mensual a 600 pesos por cliente; *sin dato*):

| Restaurantes | Pesimista | Media | Optimista |
|---|---|---|---|
| 100 | −148 → **−158** | +494 → **+433** | +4,465 → **+4,092** |
| 1,000 | +58 → **−39** | +6,485 → **+5,872** | +46,106 → **+42,377** |
| 10,000 | +1,364 → **+396** | +65,707 → **+59,574** | +458,324 → **+421,034** |

«Esperado» es un **rango de tres curvas**, no un intervalo estadístico. **Ingreso y costo por cliente (1,000, media):** gratuito 0 pesos de ingreso (sin anuncios) y 1.1 de costo; cliente de paga 299 de ingreso y 79 de costo.

---

## 3. El precio de Master Chef: meseta, no punto, y depende de la curva

| Curva | Precio óptimo | **Meseta** (margen a menos de 2 %) | Conversión en el óptimo |
|---|---|---|---|
| pesimista | **163** | **148 a 180** | 7 % |
| media | **218** | **192 a 247** | 16 % |
| optimista | **580** | **499 a 672** | 35 % |

**Sensibilidad del precio óptimo a los supuestos de la curva:**

| Curva | Óptimo base | Mediana −50 % a +50 % | Sigma −50 % a +50 % | Soporte 0 · 30 · 150 |
|---|---|---|---|---|
| pesimista | **163** | 110–221 | 137–216 | 123 · 141 · 246 |
| media | **218** | 139–300 | 174–320 | 170 · 193 · 306 |
| optimista | **580** | 315–847 | 505–832 | 537 · 558 · 652 |

**El óptimo es tan bueno como la curva.** Las medianas de la curva son **precios de lista de otros productos** (157 Neolo, 205 la mediana de menú QR con pedidos, 652 Fudo Avanzado, un punto de venta que Carta no es); sigma y techo se eligieron. **Reportar 163 / 218 / 580 como tres puntos sería falso: es un rango de ≈ 110 a 850 pesos.**

**Segundo anclaje de la disposición a pagar: lo que ya gastan (INEGI, [lo que paga un restaurante](2026-11-14-lo-que-paga-un-restaurante.md)).** La mediana de la curva media (205) es **0.2 % del ingreso** de un negocio de 0 a 10 personas (107,450 al mes), **dentro de la franja de 0.15 % a 0.30 %** que cuestan los menús QR con pedidos: **los dos anclajes se parecen en la curva media**. La optimista (652) es 0.6 % del ingreso del chico (**fuera** de esa franja, en la de los puntos de venta, 0.61 % a 0.93 %) pero sólo 0.1 % del de 11 a 50 personas (**dentro** de la franja de los POS, 0.09 % a 0.14 %): **la curva optimista sólo describe a los de 11 a 50**. El único dato que sustituye ambos anclajes es la **prueba de precio del piloto**.

### 3.1 Margen contra precio (1,000 restaurantes, operación) y arrepentimiento

| Precio de Master Chef | Pesimista | Media | Optimista | Arrepentimiento máximo | Arrepentimiento esperado (25/50/25 %) |
|---|---|---|---|---|---|
| 149 | 1,167 | 5,952 | 18,477 | 45,370 | 12,000 |
| 199 | 1,038 | 7,266 | 28,219 | 35,628 | 8,940 |
| 249 | 547 | 7,175 | 37,111 | 26,736 | 6,884 |
| 299 | 58 | 6,485 | 46,106 | 17,741 | 5,103 |
| 349 | -322 | 5,465 | 52,378 | 11,469 | 4,140 |
| 449 | -771 | 3,501 | 60,583 | 3,766 | 3,183 |
| 599 | -1,020 | 1,475 | 63,847 | 5,791 | 3,442 |

**Chef Ejecutivo:** el precio **no sale de la optimización**: con la mejor configuración, mover Chef Ejecutivo de 299 a 999 cambia el margen en **408 pesos al mes** (menos de 2 %); los 499 son **«sugeridos por regla»** (3 × piso con soporte de 120).

---

## 4. Topes del plan gratuito: consecuencia del cupo que se exige, no un óptimo

`restriccion_min_dentro` (hoy 60 %, **decisión de Calvin**, rango 40–80 %) y `traslape_topes` (hoy 0; rango 0 a 1) son **parámetros visibles**. Con traslape 0 sólo cuenta el tope más estricto (por eso cuentas y platillos casi no mueven nada); con más traslape cada tope suma. Si quieres que quepa gratis…

| Cupo gratis mínimo | Topes del gratuito | Dentro real | Precio Master Chef | Pagantes (media, 1,000) | **Margen al mes** |
|---|---|---|---|---|---|
| **50 %** | 8 mesas · 2 cuentas · 80 platillos | 50 % | 225 (meseta 200–225) | 73 | **9,883** |
| **60 %** | 10 mesas · 3 cuentas · 80 platillos | 61 % | 225 (meseta 200–225) | 56 | **7,343** |
| **70 %** | 15 mesas · 4 cuentas · 80 platillos | 73 % | 225 (meseta 200–225) | 38 | **4,658** |
| **80 %** | 20 mesas · 5 cuentas · 80 platillos | 80 % | 225 (meseta 200–225) | 27 | **3,044** |

**Sensibilidad al traslape** (mismos topes de 10 mesas y 3 cuentas): con 0 queda dentro 61 % y el margen es 7,343; con 0.5, 38 % y 12,746; con 1, 14 % y 18,150. **Los números de mesas y cuentas son modelo, no estadística** (estadística de cartas §4.3).

---

## 5. Qué supuesto mueve más el resultado (cada uno ±50 %, 1,000 restaurantes, curva media)

**Firme (sin anuncios), margen de operación; base 6,485:**

| Supuesto | Con la mitad | Con 1.5 veces | Efecto (pesos) |
|---|---|---|---|
| curva · mediana | −86 | +13,984 | 14,071 |
| curva · techo | +2,674 | +10,207 | 7,533 |
| curva · sigma | +1,769 | +8,852 | 7,084 |
| quién rebasa el tope de mesas | +5,871 | +10,387 | 4,516 |
| soporte por cliente de paga | +7,529 | +5,441 | 2,088 |
| soporte por cliente gratuito | +6,727 | +6,244 | 483 |
| parte que es tamaño Chef Ejecutivo | +6,665 | +6,305 | 360 |
| pago con tarjeta | +6,795 | +6,485 | 310 |
| peso de un cliente de paga en el procesador | +6,492 | +6,389 | 103 |
| bajas mensuales (churn) | +6,485 | +6,485 | 0 |

**Condicional (anuncios aprobados, tarifa baja); base 13,416:**

| Supuesto | Con la mitad | Con 1.5 veces | Efecto |
|---|---|---|---|
| curva · mediana | +7,055 | +20,675 | 13,620 |
| curva · techo | +9,727 | +17,016 | 7,289 |
| tarifa de anuncios | +9,951 | +16,881 | 6,931 |
| visitas con la app por gratuito | +9,951 | +16,881 | 6,931 |
| curva · sigma | +8,850 | +15,710 | 6,861 |
| quién rebasa el tope de mesas | +12,822 | +17,188 | 4,367 |
| parte de visitas con anuncio | +9,951 | +13,416 | 3,465 |
| soporte por cliente de paga | +14,460 | +12,372 | 2,088 |
| soporte por cliente gratuito | +13,657 | +13,174 | 483 |
| parte que es tamaño Chef Ejecutivo | +13,589 | +13,243 | 345 |

---

## 6. Escalabilidad en el tiempo (adopción **supuesta**: 300 restaurantes a 12 meses, 1200 a 24)

Margen de **operación → después de captación** (bajas 3 % y 600 pesos por cliente de paga; **sin dato**) por curva (pesimista · media · optimista):

| Mes | Restaurantes | De paga (media) | Margen al mes: pesimista · media · optimista | Escalón (media) |
|---|---|---|---|---|
| 6 | 75 | 3 | −159 → −238 | +323 → −179 | +3,301 → +248 | hobby_eventos |
| 12 | 300 | 10 | −268 → −448 | +1,660 → +524 | +13,575 → +6,669 | pro_2 |
| 18 | 675 | 23 | −93 → −388 | +4,245 → +2,383 | +31,054 → +19,736 | pro_2 |
| 24 | 1,200 | 41 | +58 → −365 | +7,769 → +5,090 | +54,163 → +37,872 | pro_4 |
| 36 | 2,700 | 92 | −311 → −1,037 | +17,061 → +12,470 | +123,419 → +95,507 | pro_8 (extrapolación) |

**Primer mes con margen positivo (curva media):** de operación **4**; después de captación **8**. *Es un artefacto de la curva de adopción supuesta y del costo de captación sin dato: no es una predicción.* **Extrapolación:** desde ≈ 2,030 restaurantes registrados hace falta otra arquitectura; con 5,000 y 100,000 el modelo da instancias que **no existen** (3 y 50) y esos márgenes son **extrapolación sin medir**.

---

## 7. Parámetros que no mueven nada (marcados `mueve_resultado: false` en el JSON)

`tam_negocios`, `sam_clientes_potenciales`, `costo_var_gratuito`, `costo_var_servicio`, `costo_var_salon`, `base_fija_por_restaurante`, `ltv`, `visitas_app_servicio`. Los de costo variable sólo sirven al piso del corredor; los de mercado son informativos.

## 8. Límites del modelo (dichos)

- **No hay dato de disposición a pagar, de bajas ni de costo de conseguir un cliente:** son los tres supuestos que más cambian el negocio.
- **Los muros salen de un simulador** (no de una prueba de carga), con ±2× en lo que depende del CPU de Railway.
- **Pruebas:** `node 2026-11-14-pruebas.mjs` reproduce las cifras ya publicadas (equilibrio 9.7; 14, 22, 38 y 128 de paga en 5 GB; 298–299, 1,064, 1,896 y 2,116 por escalón; corredor 249, 299 y 349) y las propiedades nuevas (anuncios apagados por defecto, precio 0 sin clientes, extrapolación, orden de la sensibilidad, monotonía de la tabla de cupo).
