# Modelo de escenarios de Carta: la segmentación de Calvin, el peor caso real y qué hay que medir

**Fecha:** 14 de noviembre de 2026 (tercera vuelta) · **Rama:** `agente/planes-precio-historial` · **La v1 no cobra ni tiene planes.** Este documento lo genera `2026-11-14-corre-escenarios.mjs` desde el modelo: ninguna cifra se transcribe a mano.

## Conclusiones

1. **Chef (gratis) = 91,048 negocios (86.8 %): 15 mesas, 4 cuentas y 150 platillos dejan dentro al 96 % de los negocios de hasta 10 personas** (intervalo del modelo 85 %–100 %); Master Chef 13,614 (13.0 %); Chef Ejecutivo 220 (0.2 %).
2. **Master Chef a 225 (pegado a Meniu) y Chef Ejecutivo a 1,099 quedan sin pérdidas con anuncios en marcha en las tres curvas; sin anuncios sólo con la curva media o mejor:** +8,048 al mes con 1,000 restaurantes con anuncios, +3,869 sin ellos (curva media) y −156 con la pesimista.
3. **Peor caso real (todos gratuitos): con 1,000 pesos al mes de su bolsa Calvin carga hasta 811 restaurantes gratuitos y 2.8 millones de comensales al mes (simulados); con anuncios se paga solo desde 54 restaurantes (tarifa baja), 12 (media) y 1,469 (adverso: mitad de tarifa y 30 % de visitas).**
4. **Margen con 1,000 restaurantes (operación): +8,048 recomendado · −156 peor · +30,650 mejor** pesos al mes; después de captación +7,519 · −263 · +28,908.
5. **Qué dato medir primero en el piloto: curva · mediana, cuántos rebasan los topes, curva · techo** (§6); y el escalón sube de Hobby a Pro de 2 procesos hacia el mes 11 (§7 y las [banderas de operación](2026-11-14-banderas-de-operacion.md)).

**Recomendado** (vino) = curva de pago media (la mediana de Master Chef es el precio de Meniu Business, 225) y anuncios en la tarifa baja ya en marcha · **Peor** (rojo) = curva pesimista y todavía sin anuncios (temporal) · **Mejor** (verde) = curva optimista y anuncios en la tarifa media.

**Qué cambió respecto a la vuelta anterior.** Los anuncios ya no son un interruptor: **el plan gratuito lleva anuncios** (decisión de Calvin) y lo que varía es **cuándo llegan** (`mes_inicio_anuncios`, hoy 9: no antes de construirlos y de que la red apruebe el sitio) y **cuánto dejan**. El peor caso «todo gratuito y sin anuncios» pasó de «peor caso» a **periodo temporal** que paga Calvin. Los planes dejaron de definirse por 10 mesas y 3 cuentas y pasaron a **la segmentación de Calvin** (por tamaño del negocio, traducida a topes).

**Cambios de API del `.mjs` (para quien lo incrusta).** (1) `configInicial()` / `configBase()` ahora es **«segmentación de Calvin»** (Master Chef 225, Chef Ejecutivo 1,099, Chef 15 mesas · 4 cuentas · 150 platillos); la anterior es `configTopes10Mesas3Cuentas()`. (2) **Quitado el interruptor** `anuncios_aprobados`: los anuncios **suman en régimen**; `opc.sinAnuncios = true` evalúa el periodo sin ellos; `opc.anunciosAprobados === false` sigue funcionando como alias de `sinAnuncios`. (3) `parteRebasa` usa el modelo conjunto de mesas y cuentas (`empuja_conjunto`, con intervalo); se quitaron `traslape_topes`, `empuja_mesas`, `empuja_cuentas` y `restriccion_min_dentro`; `optimizar` se rige por `restriccion_seguridad_chico`. (4) `conversion(curva, precio, s, plan)` y `precioOptimo(…, plan)` usan `curvas_pago_salon` para Chef Ejecutivo. (5) Nuevas funciones: `todosGratuitos`, `tablaTodosGratuitos`, `nSePagaSolo`, `capacidadConBolsa`, `resumen`, `evaluarPrecios`, `banderas`, `seguridadChico`, `parteSalon`, `interp2`. (6) `proyectar` mete los anuncios desde `mes_inicio_anuncios` y devuelve `financiamiento_maximo`. (7) `sensibilidad` trae `frase` y `medir_primero`.

---

## 1. La segmentación de Calvin, traducida a topes

**Clientes potenciales = 104,882** (DENUE, mayo de 2026 [medido]). **Chef (gratis)** = 0–5 y 6–10 personas: **91,048 (86.8 %)** · **Master Chef** = 11–30, 31–50 y 51–100: **13,614 (13.0 %)** · **Chef Ejecutivo** = 101–250 y 251 o más: **220 (0.2 %)**.

**Carta no sabe cuánta gente trabaja en un negocio**, así que la frontera se traduce a **topes que el producto sí aplica**, con el modelo de mesas y cuentas de la estadística de cartas (cuentas = ⌈f × personas⌉ con f = 0.35 a 0.50; mesas = cuentas × 2.5 a 4) aplicado a los estratos medidos. **Todo esto es supuesto (modelo, no estadística): el intervalo muestra los extremos del modelo.**

**¿Con qué topes un negocio de hasta 10 personas queda dentro del gratuito?** (central; entre paréntesis, el intervalo del modelo)

| Seguridad que se quiere | Topes de Chef (mesas · cuentas) | Seguridad real | Parte de TODOS los registrados que queda dentro | Negocios de más de 10 personas que se cuelan gratis |
|---|---|---|---|---|
| **—** | 10 mesas · 3 cuentas | 91 % (71 %–95 %) | 79 % (62 %–82 %) | 0 % (hasta 0 %) |
| **—** | 10 mesas · 3 cuentas | 91 % (71 %–95 %) | 79 % (62 %–82 %) | 0 % (hasta 0 %) |
| **—** | 15 mesas · 4 cuentas | 98 % (87 %–100 %) | 85 % (75 %–88 %) | 0 % (hasta 9 %) |

**Versión conservadora** (la seguridad vale aun en el peor rincón del modelo):

| Seguridad que se quiere | Topes de Chef | Seguridad mínima | Dentro (todos) | Se cuelan gratis |
|---|---|---|---|---|
| **80 %** | 12 mesas · 3 cuentas | ≥ 87 % | 79 % | hasta 0 % |
| **90 %** | 16 mesas · 4 cuentas | ≥ 95 % | 85 % | hasta 9 % |
| **95 %** | 20 mesas · 5 cuentas | ≥ 100 % | 88 % | hasta 32 % |

**Con el tope de platillos** (un negocio chico puede tener carta larga: 150 platillos deja pasar al ≈ 98 %) **la configuración inicial queda en 15 mesas · 4 cuentas · 150 platillos con 95.8 % de seguridad** (el optimizador la elige: es la de mayor margen que cumple 95 %). **Master Chef** cubre hasta 100 mesas y 30 cuentas (≈ 98 % de los negocios de 11 a 100 personas; arriba de ahí, ≈ 0.4 % de los registrados, que es Chef Ejecutivo). **Chef Ejecutivo** exige subir hoy el tope técnico de **50 cuentas activas** (T-1.6): un negocio de 101 a 250 personas tiene 36 a 125 cuentas de mesero o capitán en el modelo (**cambio de código, no de este informe**).

| Seguridad exigida a Chef | Topes | Seguridad real | Dentro de todos | Margen (1,000 restaurantes, curva media) |
|---|---|---|---|---|
| **80 %** | 10 mesas · 3 cuentas · 80 platillos | 81.4 % | 71 % | 11,254 |
| **90 %** | 10 mesas · 3 cuentas · 300 platillos | 90.4 % | 78 % | 9,265 |
| **95 %** | 15 mesas · 4 cuentas · 150 platillos | 95.8 % | 83 % | 8,050 |

## 2. Precios: Master Chef pegado a Meniu, Chef Ejecutivo hacia arriba

Cada precio con tres curvas (pesimista · media · optimista), **1,000 restaurantes registrados**. «Sin pérdidas» = margen de operación **y** después de captación ≥ 0 (con anuncios en marcha · sin anuncios todavía).

| Master Chef | Pagantes de Master Chef | Margen de operación (con anuncios) | Después de captación | Margen de operación **sin anuncios** | Equilibrio sin anuncios (pagantes) | ¿Sin pérdidas? (con anuncios · sin) |
|---|---|---|---|---|---|---|
| **199** | 7.8 · 33.3 · 95.9 | +4,224 · +7,904 · +16,816 | +4,082 · +7,291 · +15,049 | −47 · +3,745 · +12,933 | 9 | sí · no |
| **225** | 5.8 · 28.6 · 94.5 | +4,123 · +8,048 · +18,984 | +4,017 · +7,519 · +17,243 | −156 · +3,869 · +15,096 | 7.5 | sí · no |
| **249** | 4.4 · 24.8 · 92.9 | +4,016 · +8,052 · +20,872 | +3,935 · +7,592 · +19,159 | −270 · +3,857 · +16,977 | 6.5 | sí · no |
| **299** | 2.4 · 18.2 · 88.7 | +3,802 · +7,803 · +24,385 | +3,756 · +7,462 · +22,747 | −492 · +3,580 · +20,471 | 5.1 | sí · no |

| Chef Ejecutivo | Pagantes de Chef Ejecutivo | Margen de operación (con anuncios) | Después de captación | Margen de operación **sin anuncios** | Equilibrio sin anuncios (pagantes) | ¿Sin pérdidas? (con anuncios · sin) |
|---|---|---|---|---|---|---|
| **799** | 0.3 · 1.1 · 2.5 | +4,176 · +8,059 · +18,467 | +4,067 · +7,523 · +16,722 | −103 · +3,882 · +14,579 | 7.5 | sí · no |
| **1099** | 0.1 · 0.8 · 2.3 | +4,123 · +8,048 · +18,984 | +4,017 · +7,519 · +17,243 | −156 · +3,869 · +15,096 | 7.5 | sí · no |
| **1599** | 0 · 0.3 · 1.7 | +4,059 · +7,833 · +19,309 | +3,954 · +7,311 · +17,578 | −221 · +3,653 · +15,419 | 7.5 | sí · no |

**Lectura.** (1) **Los tres precios altos de Chef Ejecutivo cambian el margen menos de 2 %**: sólo ≈ 0.8 negocio de cada 1,000 es de ese tamaño; su precio **no se decide por margen sino por posicionamiento** (1,099 es lo que cuestan OlaClick Elite y Last.app; 1,599 es el extremo alto sin llegar a Last.app Unlimited, 2,900). (2) **Master Chef: 199 a 299 cambia el margen en menos de 2 %**, pero **cambia los pagantes** (de 33 a 18 con la curva media): como Calvin quiere captar sin pérdidas, **225 (el precio de Meniu) capta 29 y deja +8,048 al mes**. (3) **Sin pérdidas con qué supuestos:** (a) con anuncios en marcha sí en las tres curvas **si la tarifa baja y el 60 % de visitas con anuncio se cumplen** (supuestos sin dato); (b) **sin anuncios, ningún precio evita la pérdida con 1,000 restaurantes si la curva es pesimista** (−156 al mes): ese periodo lo paga Calvin.

**Meseta y curva de pago.** Con la curva media, el margen por restaurante que rebasa topes cambia menos de 2 % entre **206 y 266**; con la mediana ±50 % el precio óptimo va de 147 a 324. **El óptimo es tan bueno como la curva (supuesto); lo sustituye la prueba de precio del piloto.**

## 3. La pregunta del peor caso: todos gratuitos

*«¿Hasta qué punto puedo tener restaurantes que todos son gratuitos, cuántos comensales, y todavía sostener el sistema con sólo anuncios?»* Todos los registrados son gratuitos (nadie paga). **Comensales al mes** = restaurantes × 113.9 comensales al día × 30; el dato por restaurante sale del **simulador de uso (perfiles supuestos), no está medido**, y es más alto de lo que tendría una fonda de 0 a 5 personas. «Costo al mes» = servidor, almacenamiento y soporte (0.5 pesos por gratuito, supuesto): **lo que pone Calvin mientras no hay anuncios**.

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

**Respuesta en una frase:** **con 1,000 pesos al mes de mi bolsa puedo cargar hasta 811 restaurantes gratuitos y 2.8 millones de comensales al mes; desde que hay anuncios, el sistema se paga solo a partir de 54 restaurantes con la tarifa baja (12 con la media), y con el caso adverso (mitad de tarifa y 30 % de visitas) **no se paga solo hasta 1,469 restaurantes**: con menos que eso, la bolsa de Calvin sigue poniendo la diferencia.** Con 500 / 2,000 / 5,000 pesos de bolsa: 500 → 279 restaurantes · 1,000 → 811 restaurantes · 2,000 → 1,896 restaurantes · 5,000 → 2,116 restaurantes (tope medido).

**Requisitos para que empiecen los anuncios** (`mes_inicio_anuncios` = 9, supuesto de trabajo): un ADR; abrir la política de seguridad del sitio (`script-src 'self'`); cambiar el aviso de privacidad; que la red apruebe el sitio ([anuncios §3.6–3.7](2026-11-13-anuncios-y-capa-del-comensal.md)); y que **no sean personalizados** (regla dura 10).

## 4. Todas las cifras en tres casos

**Recomendado** (vino) = curva de pago media (la mediana de Master Chef es el precio de Meniu Business, 225) y anuncios en la tarifa baja ya en marcha · **Peor** (rojo) = curva pesimista y todavía sin anuncios (temporal) · **Mejor** (verde) = curva optimista y anuncios en la tarifa media.

| Cifra | Recomendado | Peor | Mejor | Qué es |
|---|---|---|---|---|
| Clientes potenciales (negocios) | **104,882** | 104,882 | 104,882 | dato medido (DENUE 05/2026): no varía con los escenarios |
| Restaurantes gratuitos que caben (restaurantes) | **279** | 148 | 2,116 | recomendado = escalón Hobby con eventos (por disco); peor = Hobby con sondeo (por procesador); mejor = Pro de 8 procesos (10,000 conexiones) |
| Gratuitos que sostiene cada cliente de paga (sin anuncios) (restaurantes) | **132.1** | 131.4 | 124.9 | con anuncios en marcha cada gratuito se paga solo si deja más de lo que cuesta (`se_paga_solo`) |
| Ingreso por cliente gratuito (pesos al mes) | **4.3** | 0 | 17.2 | sólo anuncios |
| Ingreso por cliente de paga (pesos al mes) | **247.4** | 242.5 | 245.6 | promedio entre Master Chef y Chef Ejecutivo según cuántos hay de cada uno |
| Costo por cliente gratuito (pesos al mes) | **1.1** | 1.1 | 1.2 | servidor, almacenamiento y soporte |
| Margen de operación (pesos al mes) | **+8,048** | −156 | +30,650 | sin captación ni sueldos |
| Margen después de captación (pesos al mes) | **+7,519** | −263 | +28,908 | resta reponer las bajas y los sueldos (parámetros sin dato) |
| Punto de equilibrio (clientes de paga) | **0** | 7.5 | 0 | cuántos clientes de paga hacen falta para no perder (el peor caso lo calcula sin anuncios) |
| Comensales al mes (comensales) | **3,484,556** | 3,430,579 | 3,639,328 | dato por restaurante SIMULADO (perfiles del simulador), no medido |

*Mejor caso teórico «todos pagan» (1,000): +149,485 pesos al mes; no se usa como cota: exigiría repetir la pila de servidores.*

## 5. Esperado a 100, 1,000 y 10,000 restaurantes (operación → después de captación)

| Restaurantes | Peor (pesimista, sin anuncios) | Recomendado (media) | Mejor (optimista, tarifa media) |
|---|---|---|---|
| 100 | −170 → −180 | **+650 → +597** | +2,919 → +2,745 |
| 1,000 | −156 → −263 | **+8,048 → +7,519** | +30,650 → +28,908 |
| 10,000 | −779 → −1,842 | **+81,321 → +76,030** | +306,405 → +288,990 |

## 6. Qué supuesto mueve más el margen, en llano (1,000 restaurantes, recomendado)

**Qué medir primero en el piloto:** 1. curva · mediana → prueba de precio del piloto (Van Westendorp y escalera) · 2. cuántos rebasan los topes → mesas y cuentas reales de los primeros 10 a 20 restaurantes · 3. curva · techo → prueba de precio del piloto: cuántos de cada 10 aceptan · 4. tarifa de anuncios → prueba pequeña de AdSense con 3 restaurantes · 5. visitas con la app por gratuito → eventos scan del piloto.

| Qué pasa si… | Efecto en el margen (pesos al mes) |
|---|---|
| Si cuánto está dispuesto a pagar el dueño promedio fuera la mitad de lo que supusimos, el margen baja de 8,048 a 4,898; si fuera una vez y media, sube a 10,146. | 5,248 |
| Si cuántos negocios pasan del tope de mesas o cuentas del plan gratuito fuera la mitad de lo que supusimos, el margen baja de 8,048 a 5,864; si fuera una vez y media, sube a 10,232. | 4,368 |
| Si qué parte de los que rebasan los topes llega a pagar fuera la mitad de lo que supusimos, el margen baja de 8,048 a 5,953; si fuera una vez y media, sube a 10,142. | 4,189 |
| Si cuánto deja cada mil visitas con anuncio fuera la mitad de lo que supusimos, el margen baja de 8,048 a 5,959; si fuera una vez y media, sube a 10,137. | 4,178 |
| Si cuántas visitas con la app tiene cada restaurante gratuito fuera la mitad de lo que supusimos, el margen baja de 8,048 a 5,959; si fuera una vez y media, sube a 10,137. | 4,178 |
| Si en qué parte de las visitas se ve un anuncio fuera la mitad de lo que supusimos, el margen baja de 8,048 a 5,959; si fuera una vez y media, sube a 10,137. | 4,178 |
| Si cuánto tiempo de soporte requiere cada cliente de paga fuera la mitad de lo que supusimos, el margen sube de 8,048 a 8,952; si fuera una vez y media, baja a 7,143. | 1,809 |
| Si cuánto tiempo de soporte requiere cada cliente gratuito fuera la mitad de lo que supusimos, el margen sube de 8,048 a 8,291; si fuera una vez y media, baja a 7,805. | 485 |

## 7. Crecimiento mes a mes (adopción **supuesta**: 300 restaurantes a 12 meses y 1200 a 24; anuncios desde el mes 9)

Margen de operación al mes. Peor = pesimista y sin anuncios; recomendado = media; mejor = optimista con tarifa media.

| Mes | Restaurantes | De paga (recomendado) | Peor | **Recomendado** | Mejor | Escalón |
|---|---|---|---|---|---|---|
| 3 | 19 | 1 | −186 | **−109** | +106 | hobby_eventos (sin anuncios) |
| 6 | 75 | 2 | −175 | **+127** | +975 | hobby_eventos (sin anuncios) |
| 9 | 169 | 5 | +567 | **+1,230** | +4,856 | hobby_eventos |
| 12 | 300 | 9 | +951 | **+2,128** | +8,936 | pro_2 |
| 18 | 675 | 20 | +2,650 | **+5,300** | +20,617 | pro_2 |
| 24 | 1,200 | 35 | +4,936 | **+9,644** | +36,872 | pro_4 |
| 36 | 2,700 | 79 | +10,665 | **+21,277** | +82,592 | pro_8 |

**Primer mes con margen de operación positivo (recomendado): 5; después de captación: 9.** **Lo más que tendría que poner Calvin, acumulado: 2,227 pesos** (peor caso: 1,936). *Es un artefacto de la curva de adopción supuesta y del costo de captación sin dato: no es una predicción.* **Más allá de ≈ 2,040 restaurantes registrados hace falta otra arquitectura: todo costo de ahí en adelante es extrapolación sin medir.**

## 8. Límites (dichos)

- **No hay dato de disposición a pagar, de bajas ni de costo de conseguir un cliente.** El **peor caso real** depende de la tarifa de anuncios y de la parte de visitas con anuncio, que tampoco tienen dato.
- **Los topes de mesas y cuentas son un modelo (no estadística):** el intervalo del modelo es amplio (§1).
- **El dato de comensales por restaurante es simulado** y más alto de lo que tendría un negocio de 0 a 5 personas.
- **Los muros salen de un simulador**, no de una prueba de carga (±2×).
- **Pruebas:** `node 2026-11-14-pruebas.mjs` reproduce las cifras publicadas y prueba la segmentación, el peor caso, el resumen, las banderas y la proyección.
