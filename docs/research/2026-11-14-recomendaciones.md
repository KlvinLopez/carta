# Recomendaciones: seis decisiones con fundamento, escenarios y la configuración para cargar

**Fecha:** 14 de noviembre de 2026 · **Rama:** `agente/planes-precio-historial` · **Estado:** propuesta para decidir; no cambia plan ni código. La v1 no cobra ni tiene planes.
**Datos:** [`…-recomendaciones.json`](2026-11-14-recomendaciones.json) (decisiones y las dos configuraciones listas para cargarse en el [modelo](2026-11-14-modelo-de-escenarios.md)) · Términos: [glosario](2026-11-14-glosario-de-negocio.md) · Planes: **Chef** (gratis), **Master Chef** (paga) y **Chef Ejecutivo** (paga, tercer plan; el nombre es propuesta nuestra: el prototipo sólo trae los dos primeros, `prototipo/js/admin-onboarding.jsx`, paso 3 «Elige tu plan»).

**Marcas.** Cifras del modelo (1,000 restaurantes registrados, curva de pago **media**, tarifa de anuncios **baja**, salvo que se diga) · datos de INEGI ([lo que paga un restaurante](2026-11-14-lo-que-paga-un-restaurante.md)) · ***supuesto***. **El óptimo es tan bueno como la curva de pago, que es supuesto.**

---

## 0. Conclusiones

- **Master Chef: 299 al mes antes de IVA para lanzar; Chef Ejecutivo: 499; Chef (gratis): 10 mesas, 3 cuentas de personal, 80 platillos.** El optimizador, con curva media, saldría con 249; recomiendo **299** por **arrepentimiento** (cuánto se deja de ganar frente al mejor precio de cada curva, ponderando 25 % pesimista, 50 % media y 25 % optimista: 6,631 a 249, **5,102 a 299**, 4,078 a 349, 3,027 a 449). Los números empujan *hacia arriba*; el piloto decide.
- **Margen con 1,000 restaurantes (configuración de lanzamiento): 7,692 · 13,899 · 52,197 pesos al mes** (curvas pesimista · media · optimista; 88 % · 81 % · 75 %), con 5 · 34 · 207 clientes de paga. **Con 10,000: 77,809 · 139,869 · 520,925.** Mejor caso (todos pagan, 1,000): 221,774.
- **El peor caso (todos gratuitos) sólo se sostiene con anuncios:** −637 pesos al mes con 1,000 sin anuncios; **+6,538** con anuncios en la tarifa baja. **La tarifa no tiene fuente: se mide con una prueba antes de construir nada.**
- **Por cada cliente de paga, los gratuitos que se sostienen son 270 a 345 con 1,000 restaurantes sin anuncios**; con anuncios cada gratuito se paga solo (deja 7.2 pesos y cuesta 0.6). **Cada gratuito deja 7.2; cada cliente de paga deja 299 y cuesta 79.4: margen de 220 pesos.**
- **El historial de 12 meses en línea para la paga (lo decidido por Calvin) casi no mueve el margen** (14,485 contra 14,499 con 1 mes) porque la base de paga es chica; **sólo estorba en Hobby** (5 GB: caben 38 de paga). *Antes recomendé 3 meses; con el modelo completo, 12 meses.*
- **Escalabilidad:** el servidor sube de Hobby a Pro de 2 procesos al mes ≈ 12, a 4 al ≈ 24 y a 8 más repetir la pila al ≈ 36 (2,700 restaurantes, **arriba de ≈ 2,100 típicos la arquitectura actual ya no alcanza**). Con la meta de 300 restaurantes a 12 meses y 1,200 a 24 (supuesto), el **primer mes con margen positivo es el 3.º** (curva media) y el margen al mes es 3,884 · 16,666 · 37,375 a los 12, 24 y 36 meses.

---

## 1. Las dos configuraciones, listas para cargar

| | **Optimizador** (curva media) | **Lanzamiento recomendada** |
|---|---|---|
| Master Chef | 249 | **299** |
| Chef Ejecutivo | 499 | 499 |
| Chef (gratis) | 10 mesas · 3 cuentas · 80 platillos · 3 lecturas de PDF en total · 1 mes | igual |
| Historial en línea, paga | 3 meses | **12 meses** (decidido por Calvin) |
| Anuncios en Chef | sí, tarifa baja | sí, tarifa baja (primero medirla) |
| Margen a 1,000 (curva media) | 14,496 | 13,899 |

Las dos están en `…-recomendaciones.json` (`configuraciones.optimizador` y `configuraciones.lanzamiento`) y se cargan tal cual con `M.evaluar(config, supuestos, n)`.

---

## 2. Qué tan agresivo entrar y contra quién competir (precio de Master Chef)

**Recomendación.** Competir contra Fudo Avanzado (software de restaurante que ya trae pedido desde la mesa y app de meseros) con K = 0.5: **299 al mes antes de IVA** para lanzar. 249 queda como piso defendible; 449 como techo a probar.

**Por qué.** Con las tres curvas de pago el margen a 1,000 restaurantes es casi plano de 199 a 299 en la curva media (14,450 · 14,496 · 13,908) y sube mucho con el precio en la optimista (35,549 · 44,492 · 52,246). Una prueba de arrepentimiento (cuánto se deja de ganar frente al mejor precio de cada curva, 25 % pesimista, 50 % media, 25 % optimista) da 6,631 a 249, **5,102 a 299**, 4,078 a 349 y 3,027 a 449: los números empujan hacia arriba si el dueño ve a Carta como un sistema y no como un menú QR. 299 deja a Carta en 46 % del sustituto, 3.6 veces el piso y 0.05 % del ingreso de un negocio de 11 a 50 personas. Es un precio de **lanzamiento con prueba**: se sube con los datos del piloto, no con corazonada.

| Opción | A favor | En contra |
|---|---|---|
| 249 (K bajo o contra Meniu) | Máxima conversión (48 de paga a 1,000); el mejor margen con la curva media (14,496); margen del 69 % sobre el piso | Es el piso ×3: ya no hay colchón si el soporte cuesta más; pierde 26,051 con la curva optimista |
| 299 (recomendada) | Centro del corredor; 34 de paga; margen 13,908 media, 52,246 optimista | Con Meniu como sustituto real, queda 33 % arriba |
| 349 (Fudo + mesas, o K = 0.6) | 24 de paga; el que ya se manejaba; 12,959 media, 58,601 optimista | El módulo de mesas de Fudo no hace falta para pedir desde la mesa; es el supuesto más débil |
| 449 (K = 0.7 contra Fudo) | Menor arrepentimiento si el dueño paga como por un POS (3,027 contra 5,102) | 13 de paga a 1,000 y el margen medio cae a 11,081; sin prueba de que paguen |

**Ejemplo.** Un restaurante de 25 mesas (≈ 11 a 50 personas, ingreso medio 737,584 pesos al mes [INEGI]): 299 son 0.05 % de su ingreso y cuestan lo que 3.7 horas de personal (a 80 pesos la hora). Rebasa las 10 mesas del plan gratuito, así que ve la oferta.

**Qué dato la cambiaría.** La prueba de precio del piloto con tres grupos (249 · 349 · 449): se queda el precio con más pagantes × margen. Y el tope y el IVA reales de Meniu y Fudo.

---

## 3. Topes del plan gratuito (platillos, mesas, cuentas de personal)

**Recomendación.** Dejar lo que Calvin decidió: **10 mesas, 3 cuentas de personal, 80 platillos** (3 lecturas de PDF en total, 1 mes de historial). Es también lo que sale del optimizador con la restricción de dejar dentro al menos al 60 %.

**Por qué.** El optimizador no necesitó forzar esos números: con ≥ 60 % dentro del gratuito, 3 meses de historial y 80 platillos de piso, el margen máximo (14,496) cae en 10 mesas y 3 cuentas. Cada punto de generosidad cuesta: 8 mesas dejaría 54 % dentro y +1,604 pesos al mes; 12 o más mesas, 64 % dentro y −560. Los platillos casi no pesan: **un platillo cuesta 1.4 a 1.9 KB** y bajar a 60 empuja a 24.3 % de los negocios sin ahorrar nada. Nota: con traslape 0 sólo cuenta el tope más estricto (por eso cuentas 3 a 5 y platillos 60 a 120 dan el mismo margen); con más traslape cada tope suma.

| Opción | A favor | En contra |
|---|---|---|
| 8 mesas, 2 cuentas, 60 platillos | Más pagantes (62 contra 48): margen 16,879 | Sólo 50 % queda dentro; empuja a pagar a negocios que no ven el valor; incumple lo decidido |
| 10 mesas, 3 cuentas, 80 platillos (recomendada) | 61 % dentro; 14,496; lo ya decidido | Mesas y cuentas son modelo, no estadística |
| 15–20 mesas, 5 cuentas, 100 platillos | 64 % dentro; más gratuitos (más anuncios) | −560 pesos al mes; menos razones para pagar |

**Ejemplo.** Una fonda de 6 mesas y 3 personas queda **dentro de todos los topes**: Chef gratis, ve anuncios y deja 7.2 pesos al mes (tarifa baja) con un costo de 0.6.

**Qué dato la cambiaría.** Mesas, cuentas y platillos reales de los primeros 10–20 restaurantes: si 10 mesas empuja a más del 60 %, sube el tope.

---

## 4. Historial: meses en línea y archivo descargable

**Recomendación.** **12 meses en línea para la paga** (lo que decidió Calvin) y **30 días para el gratuito**, con archivo descargable de lo que sale de línea. *Cambia lo que recomendaba antes (3 meses).*

**Por qué.** Con el modelo completo, el historial casi no mueve el margen: 14,499 · 14,496 · 14,492 · 14,485 pesos al mes con 1, 3, 6 y 12 meses, porque la base de paga es chica y el volumen de 50 GB de Railway Pro cabe sobrado: **12 meses de historial para 48 clientes de paga son 6 GB**. Lo que cambia es **cuántos de paga caben mientras se está en Hobby (5 GB)**: 263, 128, 72 y 38; con Pro (50 GB), 2,637 · 1,283 · 724 · 387. El procesador (Pro de 4 procesos) manda mucho antes que el disco. Antes recomendé 3 meses porque comparaba contra Hobby.

| Opción | A favor | En contra |
|---|---|---|
| 1 mes | Cabe lo máximo en Hobby | Casi nada de historial para quien paga |
| 3 meses + archivo | 128 de paga en Hobby | Cambia lo decidido; el dueño baja un archivo para ver más atrás |
| 12 meses en línea (recomendada) + archivo de lo anterior | Cumple lo decidido; en Pro cuesta menos de 1 peso al mes por cliente | En Hobby sólo caben 38 de paga: hay que pasar a Pro antes |

**Ejemplo.** Un restaurante de 25 mesas con 1,800 visitas al mes genera 13.5 MB al mes: 12 meses son 162 MB, **unos 0.45 pesos al mes** de volumen. Puede ver cualquier mes del año y bajar lo anterior.

**Qué dato la cambiaría.** Cuántos dueños abren el mes anterior (eventos del panel); si casi nadie abre más de 3 meses, se acorta sin costo de producto.

---

## 5. Soporte: cuánto se promete y cuánto cuesta

**Recomendación.** Prometer soporte por WhatsApp o correo en horario hábil, con tope de **≈ 60 pesos al mes por cliente de paga** (30 minutos). Medirlo desde el primer día.

**Por qué.** El soporte es lo que más pesa en el piso: 30, 60 y 150 pesos dan un piso de 50, 80 y 170 y un precio de la regla (K = 0.5 contra Fudo Avanzado) de 299, 299 y **599**; el margen total a 249 con 1,000 restaurantes es 15,906, 14,496 y 10,267. Con soporte de 150, 299 pierde dinero por cliente de paga en proporción.

| Opción | A favor | En contra |
|---|---|---|
| Autoservicio y correo (30) | Piso 50; 15,906 de margen | Mal servicio si el dueño no sabe subir su carta |
| WhatsApp en horario (60, recomendada) | Equilibrio entre servicio y costo | Depende de que 30 minutos alcancen |
| Teléfono y alta hecha por nosotros (150) | Mejor conversión probable | El precio de la regla sube a 599 |

**Ejemplo.** Un salón de 60 mesas necesita más: se le cobra **Chef Ejecutivo a 499** con soporte propio (120 pesos al mes).

**Qué dato la cambiaría.** Los tickets y minutos de soporte del piloto: si pasan de 60 pesos al mes por restaurante, se sube el precio o se acota el soporte.

---

## 6. Anuncios en el plan gratuito

**Recomendación.** **Sí, anuncios no personalizados en Chef; no en el piloto.** Primero medir la tarifa con una prueba pequeña de AdSense (3 restaurantes) y no construir nada hasta tenerla. «Sin anuncios» queda como beneficio de Master Chef, como en el prototipo.

**Por qué.** Sin anuncios, el peor caso (todos gratuitos) **pierde 637 pesos al mes con 1,000 restaurantes**; con anuncios en la tarifa baja **gana 6,538**. El margen esperado con 1,000 pasa de **7,664 (sin anuncios) a 14,496 (baja), 34,994 (media) y 79,895 (alta)**. **Pero la tarifa no tiene fuente**, 36 % de los ingresos dependen de ella y AdSense puede no aprobar el sitio.

| Opción | A favor | En contra |
|---|---|---|
| Sin anuncios | Menú limpio; no toca la regla dura 10; sin riesgo de aprobación | El peor caso pierde dinero: exige ≥ 4 clientes de paga con 1,000 restaurantes |
| Con anuncios no personalizados, sólo gratuito (recomendada) | El peor caso es sostenible; es un motivo para pasar a Master Chef | Tarifa sin dato; riesgo de aprobación; anuncios cerca de los botones pueden dar clics accidentales |
| Con anuncios personalizados | Tarifa más alta | **Rompe la regla dura 10** (sin datos personales del comensal): descartada |

**Ejemplo.** La fonda de 6 mesas (1 mes de historial, 80 platillos) con ≈ 2,050 visitas al mes deja 7 pesos con la tarifa baja y 29 con la media: no paga nada, pero **se paga sola** (cuesta 0.6).

**Qué dato la cambiaría.** El informe de AdSense de la prueba: impresiones, ingresos estimados y RPM; si la tarifa real es menor que la baja, sin anuncios y con ≥ 4 pagantes.

---

## 7. Avisos de reloj desde el servidor (mesa en amarillo o rojo por el tiempo)

**Recomendación.** **No.** Los relojes se calculan en el teléfono con la hora de la última acción, como ya dice el AC-40.9.

**Por qué.** Un temporizador en el servidor para ≈ 12,000 mesas (1,000 restaurantes con 12 mesas) sería una consulta por minuto, que cuesta poco, pero **no llega a ningún lado**: sin notificaciones push (fuera de la v1) el aviso sólo viaja por la conexión abierta del teléfono, que ya sabe calcular el color. Se añadiría un proceso más (y un muro más) sin dar nada que el teléfono no tenga.

| Opción | A favor | En contra |
|---|---|---|
| Relojes en el teléfono (recomendada) | Cero costo de servidor; ya especificado | Si el teléfono duerme no avisa (igual con servidor sin push) |
| Reloj en el servidor con evento al cruzar el umbral | Un evento por cruce (≈ 0.1 por segundo con 1,000 restaurantes) | Otro proceso; contradice AC-40.9; sin push no despierta el teléfono |

**Ejemplo.** Un salón de 60 mesas ve en el teléfono del capitán que la mesa 12 pasó 25 minutos sin movimiento: el color se calcula ahí.

**Qué dato la cambiaría.** Que se apruebe push (hoy fuera de la v1): entonces el reloj del servidor sí tendría sentido.

---

## 8. La prueba de precio que decide (y cómo se lee)

Con los siguientes 30 restaurantes que rebasen topes: **tres grupos de 10**, a 249, 349 y 449 (con la hoja de precio después de las cuatro preguntas Van Westendorp de [precio §6](2026-11-14-precio-con-fundamento.md)). **Regla:** se queda el precio con más **pagantes × margen por pagante** (a 249: 170 de margen; a 349: 270; a 449: 370 pesos al mes, con soporte 60). Con 10 por grupo el resultado es **un sí o un no**, no una curva: si ≥ 3 de 10 pagan a 449, sube a 449; si < 3 pagan a 349, baja a 249. Reemplaza **la curva de pago** del modelo (`curvas_pago` en `parametros.json`) por los números del piloto.

## 9. Datos por conseguir (resumen)

Curva de pago real · tope e IVA de Meniu y Fudo · tarifa real de anuncios y aprobación de AdSense · soporte por cliente · mesas, cuentas y platillos reales · horas que Carta ahorra por visita · costo de conseguir un cliente y valor de un cliente en el tiempo (sin dato). Todos con su forma de medirse en las tablas de cada informe.
