# Recomendaciones: seis decisiones con su supuesto, su meseta y la prueba que las cierra

**Fecha:** 14 de noviembre de 2026 (revisado el mismo día; apoyado en el [modelo corregido](2026-11-14-modelo-de-escenarios.md)) · **Rama:** `agente/planes-precio-historial` · **Estado:** propuesta para decidir; no cambia plan ni código. **Generado por `2026-11-14-corre-escenarios.mjs`.**
**Datos:** [`…-recomendaciones.json`](2026-11-14-recomendaciones.json) (decisiones y las dos configuraciones cargables) · Términos: [glosario](2026-11-14-glosario-de-negocio.md) · Planes: **Chef** (gratis), **Master Chef**, **Chef Ejecutivo** (nombre propuesto; el prototipo sólo trae los dos primeros).
**Qué cambió con la revisión:** el precio se da como **rango con meseta**; los topes del gratuito como **«depende de qué parte quieres atender gratis»**; los anuncios como **condicionales**; y cada decisión dice **de qué supuesto depende y qué pasa si falla**.

**Marcas.** Cifras del modelo (1,000 restaurantes, curva **media**, configuración «recomendada sin anuncios») · datos de INEGI · ***supuesto***. **El óptimo es tan bueno como la curva de pago, que es supuesto.**

---

## 0. Conclusiones

- **Master Chef: un rango de 192 a 349 al mes; lanzar en 299.** Chef Ejecutivo: **499**, que **no sale de la optimización** (cambia el margen menos de 2 % en todo el rango): es «sugerido por regla».
- **Chef (gratis): 10 mesas, 3 cuentas y 80 platillos *si* quieres que quepa gratis al menos el 60 %.** Para 50 / 60 / 70 / 80 %: 8/2 · 10/3 · 15/4 · 20/5 (mesas/cuentas) y margen 9,883 · 7,343 · 4,658 · 3,044 al mes.
- **Margen con 1,000 restaurantes (operación, antes de captación y sueldos):** +58 · +6,485 · +46,106 (pesimista · media · optimista); **después de captación:** −39 · +5,872 · +42,377.
- **El peor caso firme (todos gratuitos, sin anuncios) pierde 1,137 pesos al mes con 1,000 restaurantes**; los anuncios son **condicionales** a que se aprueben y se construyan.
- **Historial de 12 meses para la paga (lo decidido): casi no mueve el margen;** sólo estorba en Hobby.
- **Qué dato cambia todo:** la **prueba de precio del piloto** (sustituye a la curva de pago, el supuesto que más mueve el margen).

## 1. Las dos configuraciones, listas para cargar

| | **Recomendada, sin anuncios** (lo que existe hoy) | **Con anuncios** (condicional) |
|---|---|---|
| Master Chef · Chef Ejecutivo | 299 · 499 | igual |
| Chef (gratis) | 10 mesas · 3 cuentas · 80 platillos · 3 lecturas de PDF en total · 1 mes | igual |
| Historial en línea, paga | 12 meses | 12 meses |
| Anuncios | no | sí (si se aprueban: `anuncios_aprobados = true`) |
| Margen a 1,000 (media, operación) | 6,485 | 13,416 |

---

## 2. Precio de Master Chef (qué tan agresivo entrar y contra quién)

**Recomendación.** **Un rango de 192 a 349 al mes antes de IVA, y lanzar en 299.** La meseta de la curva media (margen a menos de 2 % del máximo) es 192–247; el corredor por sustituto (Meniu, Fudo Avanzado, Fudo + mesas) es 249–349. **299 queda dentro del corredor y fuera de la meseta:** frente a 249 renuncia a 690 pesos al mes de margen en la curva media y gana 8,995 en la optimista. La cuenta de arrepentimiento empujaría más arriba (249: 6,884 · 299: 5,103 · 349: 4,140 · 449: 3,183), pero depende de que la curva optimista (la de quien paga como por un punto de venta) pese 25 %, y el segundo anclaje (INEGI) sólo la respalda para negocios de 11 a 50 personas: por eso **299 y no 449**. **K (qué tan agresivo entrar) es decisión de Calvin, no un cálculo.**

**De qué supuesto depende y qué pasa si falla.** **De la curva de pago (mediana, sigma, techo), que es supuesto.** Con la mediana ±50 % el precio óptimo de la curva media va de 139 a 300; con soporte 0 a 150, de 170 a 306. **Si falla:** si los dueños ven a Carta como un menú QR (mediana ≈ 157), el precio sostenible es ≈ 110–220 y 299 pierde clientes; si lo ven como un POS (mediana ≈ 650), 299 deja dinero sobre la mesa (el óptimo sube a ≈ 500–850).

**Cifras del modelo.** Margen a 1,000 (operación) a 249 / 299 / 349 / 449: pesimista 547 / 58 / -322 / -771; media 7,175 / 6,485 / 5,465 / 3,501; optimista 37,111 / 46,106 / 52,378 / 60,583. Arrepentimiento esperado: 249: 6,884 · 299: 5,103 · 349: 4,140 · 449: 3,183.

| Opción | A favor | En contra |
|---|---|---|
| 249 (entrar fuerte; Meniu como sustituto) | Más pagantes; es el piso ×3; casi en la meseta (192–247) | Sin colchón si el soporte cuesta más; pierde mucho con la curva optimista |
| 299 (lanzamiento recomendado) | Centro del corredor; compromiso entre las tres curvas | Fuera de la meseta de la curva media por poco; 33 % arriba de Meniu |
| 349 (Fudo + mesas) | Menor arrepentimiento si el dueño paga como por un sistema | Menos pagantes; el supuesto del módulo de mesas es el más débil |
| 449 (K = 0.7 contra Fudo) | Menor arrepentimiento esperado si la curva optimista es cierta | Menos pagantes; sin prueba de que paguen |

**Ejemplo.** Un restaurante de 25 mesas (≈ 11 a 50 personas; ingreso medio 737,584 pesos al mes [INEGI]): 299 son 0.05 % de su ingreso y 3.7 horas de personal a 80 pesos la hora [valor medido; las horas que Carta ahorra son supuesto].

**La prueba o el dato que la cierra.** Prueba de precio del piloto: tres grupos de 10 (249 · 349 · 449) y la regla «se queda el precio con más pagantes × margen por pagante». Con 10 por grupo es un sí o un no, no una curva.

---

## 3. Topes del plan gratuito (mesas, cuentas, platillos)

**Recomendación.** **Mantener lo decidido (10 mesas, 3 cuentas, 80 platillos) *si* Calvin quiere que quepa gratis al menos el 60 %.** No es un óptimo: es la consecuencia de ese 60 %. Si quiere 50 %, los topes son 8 mesas y 2 cuentas (+2,540 pesos al mes); si 70 %, 15 y 4 (−2,685); si 80 %, 20 y 5 (−4,299).

**De qué supuesto depende y qué pasa si falla.** **De qué parte quieres atender gratis (decisión de Calvin) y del modelo de mesas y cuentas (no es estadística).** Con traslape 0.5 los mismos topes dejan dentro 38 %, no 61 %. **Si falla:** si 10 mesas empuja a más gente de lo que el modelo dice, el cupo real es menor y hay que subir el tope (se mide con las mesas del piloto).

**Cifras del modelo.** Tabla de cupo (1,000 restaurantes): 50 % → 8/2, margen 9,883 · 60 % → 10/3, margen 7,343 · 70 % → 15/4, margen 4,658 · 80 % → 20/5, margen 3,044. Un platillo cuesta 1.4–1.9 KB: bajar el tope de platillos no ahorra nada.

| Opción | A favor | En contra |
|---|---|---|
| Cupo gratis ≥ 50 %: 8 mesas, 2 cuentas, 80 platillos | 73 de paga; margen 9,883 | Dentro real 50 % |
| Cupo gratis ≥ 60 %: 10 mesas, 3 cuentas, 80 platillos | 56 de paga; margen 7,343 | Dentro real 61 % |
| Cupo gratis ≥ 70 %: 15 mesas, 4 cuentas, 80 platillos | 38 de paga; margen 4,658 | Dentro real 73 % |
| Cupo gratis ≥ 80 %: 20 mesas, 5 cuentas, 80 platillos | 27 de paga; margen 3,044 | Dentro real 80 % |

**Ejemplo.** Una fonda de 6 mesas y 3 personas queda dentro de todos los topes: Chef, gratis; costo ≈ 1 peso al mes (0.6 de servidor y 0.5 de soporte).

**La prueba o el dato que la cierra.** Mesas, cuentas y platillos reales de los primeros 10–20 restaurantes (consultas de lectura al piloto).

---

## 4. Historial: meses en línea y archivo descargable

**Recomendación.** **12 meses en línea para la paga (lo decidido por Calvin) y 30 días para el gratuito, con archivo descargable de lo anterior.**

**De qué supuesto depende y qué pasa si falla.** **Del volumen de disco que se pague (Hobby de 5 GB o Pro de 50 GB) y del dato de disco medido** (7.1–8.5 KB por visita, con 10 eventos por visita supuestos). **Si falla:** si los eventos por visita son el doble, el disco de la paga sube ≈ 50 % y los 12 meses sólo caben en Pro.

**Cifras del modelo.** Con 1, 3, 6 y 12 meses el margen casi no cambia (12 meses de historial para 48 clientes de paga son ≈ 6 GB); lo que cambia es cuántos de paga caben en Hobby: 263, 128, 72 y 38 (en Pro, 2,637 · 1,283 · 724 · 387).

| Opción | A favor | En contra |
|---|---|---|
| 1 mes | Cabe lo máximo en Hobby | Casi nada de historial para quien paga |
| 3 meses + archivo | 128 de paga en Hobby | Cambia lo decidido |
| 12 meses + archivo (recomendada) | Cumple lo decidido; cuesta menos de 1 peso al mes por cliente en Pro | En Hobby sólo caben 38 de paga: hay que pasar a Pro antes |

**Ejemplo.** Un restaurante de 25 mesas genera 13.5 MB al mes: 12 meses son 162 MB, ≈ 0.45 pesos al mes de volumen.

**La prueba o el dato que la cierra.** Cuántos dueños abren el mes anterior en el panel (eventos del piloto).

---

## 5. Soporte: cuánto se promete

**Recomendación.** **Soporte por WhatsApp o correo en horario hábil, con tope de ≈ 60 pesos al mes por cliente de paga (30 minutos) y casi nada para el gratuito (autoservicio).**

**De qué supuesto depende y qué pasa si falla.** **Del tiempo real de soporte, que es supuesto** (60 de paga y 0.5 por gratuito; rangos 30–150 y 0–3). **Si falla:** con 150 por cliente de paga el precio de la regla sube a 306–599 y el margen cae; con 1 peso por gratuito el peor caso firme empeora en 500 pesos al mes con 1,000 restaurantes.

**Cifras del modelo.** Efecto en el margen (±50 %, firme): soporte de paga 2,088 pesos; soporte del gratuito 483.

| Opción | A favor | En contra |
|---|---|---|
| Autoservicio y correo (30) | Piso bajo | Mal servicio si el dueño no sabe subir su carta |
| WhatsApp en horario (60, recomendada) | Equilibrio | Depende de que 30 minutos alcancen |
| Teléfono y alta hecha por nosotros (150) | Mejor conversión probable | El precio de la regla sube mucho |

**Ejemplo.** Un salón de 60 mesas (Chef Ejecutivo) necesita soporte propio: se supone el doble (120 pesos al mes).

**La prueba o el dato que la cierra.** Tickets y minutos de soporte del piloto.

---

## 6. Anuncios en el plan gratuito

**Recomendación.** **Condicional: no contar con ellos hasta que se aprueben y se construyan.** Hoy no se pueden mostrar (la política de seguridad del sitio no lo permite). Si Calvin quiere seguir ese camino: ADR, abrir la política de seguridad, cambiar el aviso de privacidad, prueba de AdSense con 3 restaurantes. «Sin anuncios» queda como beneficio de Master Chef, como en el prototipo.

**De qué supuesto depende y qué pasa si falla.** **De tres supuestos que no tienen dato:** que la red apruebe el sitio, la tarifa por mil visitas y la parte de visitas con anuncio. **Si fallan:** con la tarifa a la mitad y 30 % de las visitas el peor caso condicional baja de +6,038 a −61 (1,000 restaurantes). **El peor caso firme es sin anuncios: −1,137 pesos al mes con 1,000 y necesita ≈ 5.1 clientes de paga para cubrirse.**

**Cifras del modelo.** Margen esperado a 1,000 (media): sin anuncios 6,485; con anuncios aprobados, tarifa baja 13,416.

| Opción | A favor | En contra |
|---|---|---|
| Sin anuncios (hoy) | Cumple la regla dura 10 y la política de seguridad; sin riesgo de aprobación | El peor caso pierde dinero: exige unos 4 clientes de paga con 1,000 |
| Con anuncios no personalizados (condicional) | Podría volver sostenible el peor caso; motivo para pasar a Master Chef | Tarifa sin fuente; aprobación; ADR y cambio de política de seguridad; clics accidentales |
| Con anuncios personalizados | Tarifa más alta | Rompe la regla dura 10: descartada |

**Ejemplo.** La fonda de 6 mesas con ≈ 2,050 visitas al mes dejaría 7 pesos (tarifa baja) o 29 (media) con anuncios; hoy deja 0.

**La prueba o el dato que la cierra.** El informe de AdSense de una prueba pequeña (impresiones, ingresos estimados, RPM).

---

## 7. Avisos de reloj desde el servidor (mesa amarilla o roja por tiempo)

**Recomendación.** **No.** Los relojes se calculan en el teléfono con la hora de la última acción (AC-40.9).

**De qué supuesto depende y qué pasa si falla.** **De que no haya notificaciones push** (fuera de la v1). **Si falla** (se aprueban push), el reloj del servidor sí tendría sentido: un evento por cruce de umbral, ≈ 0.1 por segundo con 1,000 restaurantes.

**Cifras del modelo.** Un temporizador del servidor para ≈ 12,000 mesas es una consulta por minuto (poco costo) pero sin push no despierta al teléfono: sólo añade un proceso y un muro.

| Opción | A favor | En contra |
|---|---|---|
| Relojes en el teléfono (recomendada) | Cero costo de servidor; ya especificado | Si el teléfono duerme no avisa |
| Reloj en el servidor | Un evento por cruce | Otro proceso; contradice AC-40.9; sin push no sirve |

**Ejemplo.** El capitán de un salón de 60 mesas ve en su teléfono que la mesa 12 lleva 25 minutos sin movimiento.

**La prueba o el dato que la cierra.** Que se apruebe push.

---

## 8. Datos por conseguir (resumen)

Curva de pago real · tope e IVA de Meniu y Fudo · bajas y costo de conseguir un cliente (**sin dato: supuestos de trabajo**) · tarifa de anuncios y aprobación (hoy no existen) · soporte por cliente · mesas, cuentas y platillos reales · horas que Carta ahorra por visita · eventos por visita. Todos con su forma de medirse en los informes.
