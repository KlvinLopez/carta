# Recomendaciones: siete decisiones con su supuesto, sus alternativas y la prueba que las cierra

**Fecha:** 14 de noviembre de 2026 (ronda 4; apoyado en el [modelo](2026-11-14-modelo-de-escenarios.md)) · **Generado por `2026-11-14-corre-escenarios.mjs`** · [JSON](2026-11-14-recomendaciones.json).

## Conclusiones

1. **Planes por tamaño: Chef (gratis) 25 mesas · 4 cuentas · 150 platillos; Master Chef hasta 100 mesas y 30 cuentas; Chef Ejecutivo lo demás.** Es un modelo (σ = 0.5 supuesto): 95.1 % de los negocios de hasta 10 personas quedan dentro (86.7 %–98 %).
2. **Master Chef 225 y Chef Ejecutivo 1,099 son decisiones de posicionamiento de Calvin, no resultados del modelo;** el modelo no puede elegir entre 199, 225, 249 y 299: lo decide la prueba del piloto. Margen de operación con 1,000 restaurantes: +8,719 recomendado, −47 peor, +32,655 mejor, −2,031 piso de verdad.
3. **Los anuncios llegan hacia el mes 9 (supuesto); mientras tanto, 1,000 pesos al mes cargan 811 restaurantes gratuitos (rango 246–1,896), con el canal de eventos construido.**
4. **Lo que más cambia el resultado: curva · mediana, cuántos rebasan los topes, curva · techo.** Se miden en el piloto.
5. **Historial de 12 meses para la paga (decidido): casi no mueve el margen.**

**Recomendado** = curva de pago media (mediana de Master Chef = 225, el precio de Meniu Business) y anuncios en la tarifa baja ya en marcha · **Peor** = curva de pago pesimista y SIN anuncios en ningún mes (los costos los pone Calvin de su bolsa) · **Mejor** = curva de pago optimista y anuncios en la tarifa media · **Piso de verdad** = curva pesimista, anuncios adversos (mitad de la tarifa baja, anuncio en el 30 % de las visitas) y soporte al máximo de su rango. *Cada escenario mueve dos ejes a la vez (curva de pago y anuncios): la matriz de §5 los separa.*


## 1. Segmentación: qué entra en cada plan y con qué topes

**Recomendación.** **Chef (gratis) = 25 mesas, 4 cuentas de personal, 150 platillos; Master Chef = hasta 100 mesas y 30 cuentas; Chef Ejecutivo = lo que pase de ahí.** Con eso, 95.1 % de los negocios de hasta 10 personas quedan gratis (intervalo del modelo 86.7 %–98 %).

**De qué supuesto depende y qué pasa si falla.** **Del modelo de mesas y cuentas y de su dispersión (σ = 0.5, supuesto sin dato).** Medido: sólo los conteos por estrato. Con 15 mesas la seguridad sería 89.4 %, no 95 %; con el peor rincón del modelo, ningún tope de la rejilla estrecha lo cumple salvo 60 mesas · 5 cuentas · 100 platillos. **Si falla:** si las fondas tienen más mesas, algunas pagan sin querer; se corrige subiendo el tope (el piloto lo muestra en una semana).

**Cifras del modelo.** Para 80 / 90 / 95 % de seguridad: 12 mesas y 3 cuentas (150 platillos) · 20 mesas y 4 cuentas (100 platillos) · 25 mesas y 4 cuentas (150 platillos); margen 11,985 · 9,799 · 8,722 al mes con 1,000 restaurantes. Chef Ejecutivo exige subir el tope técnico de 50 cuentas activas (T-1.6).

| Opción | A favor | En contra |
|---|---|---|
| Seguridad 80 %: 12 mesas, 3 cuentas, 150 platillos | margen 11,985 | 80 % de los de hasta 10 personas dentro; 69 % de todos |
| Seguridad 90 %: 20 mesas, 4 cuentas, 100 platillos | margen 9,799 | 90.3 % de los de hasta 10 personas dentro; 78 % de todos |
| Seguridad 95 %: 25 mesas, 4 cuentas, 150 platillos | margen 8,722 | 95.1 % de los de hasta 10 personas dentro; 83 % de todos |

**Ejemplo.** Una fonda de 6 mesas y 3 personas queda dentro (Chef); un restaurante de 40 mesas (≈ 11 a 50 personas) pasa a Master Chef; un salón de 60 mesas y 12 cuentas también; un hotel con 150 mesas y 40 cuentas es Chef Ejecutivo.

**La prueba o el dato que la cierra.** Medir mesas y cuentas por negocio en los primeros 10 a 20 restaurantes: `mesa` y `personal_restaurante` activos por restaurante al darse de alta (sin datos personales).

---

## 2. Precios de Master Chef y Chef Ejecutivo

**Recomendación.** **Master Chef 225 es una decisión de posicionamiento de Calvin (pegado a Meniu Business), no un resultado del modelo; Chef Ejecutivo 1,099 (igual que OlaClick Elite y Last.app Starter-Growth) también.** El modelo no puede elegir entre 199, 225, 249 y 299: lo decide la prueba de tres precios del piloto.

**De qué supuesto depende y qué pasa si falla.** **De la curva de pago (supuesto).** Con la mediana en 150 gana 199; en 225, 249; en 300, 299; en 450, 299. Ver [precio de entrada](2026-11-14-precio-de-entrada.md) (tablas por mediana y sigma). **Si falla:** si los dueños pagan lo de un menú QR (157), 225 pierde clientes; si pagan lo de un POS (652), 225 deja dinero sobre la mesa.

**Cifras del modelo.** Master Chef 199 / 225 / 249 / 299: pagantes (media) 34 / 29 / 25 / 18; margen de operación (media) 8,573 / 8,719 / 8,724 / 8,471. Chef Ejecutivo 799 / 1,099 / 1,599: 8,740 / 8,719 / 8,315.

| Opción | A favor | En contra |
|---|---|---|
| 199 | Más pagantes | Debajo de Meniu |
| 225 (decisión de posicionamiento) | Pegado a Meniu | Sin colchón si el soporte cuesta más |
| 249 | Mismo margen que 225 con la curva supuesta | Un poco arriba de Meniu |
| 299 | Más margen por pagante | Menos pagantes (18 contra 29) |

**Ejemplo.** Un restaurante de 25 mesas (ingreso medio 737,584 al mes [INEGI]): 225 son 0.03 % de su ingreso.

**La prueba o el dato que la cierra.** Prueba de precio del piloto: tres grupos de 10 (199 · 249 · 299) y a los 6 meses cuántos se quedan.

---

## 3. Anuncios en Chef: cuándo llegan y cuánto dejan

**Recomendación.** **El plan gratuito lleva anuncios; llegan hacia el mes 9 (supuesto de trabajo), no personalizados.** Mientras no hay, los paga Calvin: con 1,000 pesos al mes caben 811 restaurantes (rango 246 a 1,896).

**De qué supuesto depende y qué pasa si falla.** **De supuestos sin dato:** que la red apruebe el sitio, la tarifa por mil visitas, la parte de visitas con anuncio y el soporte por gratuito. **Se paga solo desde:** 54 (rango 25 a 186) (tarifa baja), 12 (rango 6 a 25) (media) y 1,469 (rango 139 a imposible) (adverso). Vale con el canal de eventos construido (con el sondeo de hoy caben 148). No modelado: moderación de anuncios (revisar y bloquear categorías); tasa de llenado y bloqueadores (van dentro de `parte_visitas_con_anuncio`, sin modelar por separado); comisión de la red de anuncios; impuestos sobre los ingresos de anuncios y de suscripción.

**Cifras del modelo.** Requisitos: ADR, abrir la política de seguridad (`script-src 'self'`), aviso de privacidad, aprobación de la red.

| Opción | A favor | En contra |
|---|---|---|
| Anuncios desde el mes 3 | El peor caso se cubre antes | No hay tiempo de construir y que la red apruebe |
| Anuncios desde el mes 9 (supuesto) | Tiempo realista | Calvin pone hasta 2,032 pesos acumulados |
| Sin anuncios | Cumple la política de seguridad de hoy | Descartada por Calvin |

**Ejemplo.** Un gratuito deja 4.3 pesos al mes con la tarifa baja una vez que hay anuncios; hoy deja 0.

**La prueba o el dato que la cierra.** Una prueba pequeña de AdSense con 3 restaurantes (impresiones, ingresos, RPM, tasa de llenado).

---

## 4. Cuánta bolsa poner mientras no hay anuncios

**Recomendación.** **1,000 pesos al mes** alcanzan para 811 restaurantes gratuitos (rango 246 a 1,896); acumulado, Calvin pone hasta **2,032 pesos** en el caso recomendado, 20,594 en el peor y 88,023 en el piso de verdad.

**De qué supuesto depende y qué pasa si falla.** **Del ritmo de adopción (supuesto) y del soporte por gratuito (sin fuente).** Vale con el canal de eventos construido.

**Cifras del modelo.** Bolsa 500 / 1,000 / 2,000 / 5,000 → 279 (94–400) / 811 (246–1,896) / 1,896 (492–2,116) / 2,116 (1,391–2,116) restaurantes.

| Opción | A favor | En contra |
|---|---|---|
| 500 pesos al mes | 279 restaurantes y 1 M de comensales | rango 94–400 según el soporte |
| 1,000 pesos al mes | 811 restaurantes y 2.8 M de comensales | rango 246–1,896 según el soporte |
| 2,000 pesos al mes | 1,896 restaurantes y 6.5 M de comensales | rango 492–2,116 según el soporte |
| 5,000 pesos al mes | 2,116 restaurantes y 7.2 M de comensales | rango 1,391–2,116 según el soporte |

**Ejemplo.** Con 1,000 pesos al mes pagas servidor y soporte básico de ≈ 811 fondas y taquerías gratuitas.

**La prueba o el dato que la cierra.** El costo real de Railway del primer mes con restaurantes del piloto y los minutos reales de soporte.

---

## 5. Historial: meses en línea y archivo descargable

**Recomendación.** **12 meses en línea para la paga (decidido por Calvin) y 30 días para el gratuito, con archivo descargable de lo anterior.**

**De qué supuesto depende y qué pasa si falla.** **Del volumen de disco que se pague y de los 7.1–8.5 KB por visita medidos (con 10 eventos por visita supuestos)** ([disco-e-historial](2026-11-14-disco-e-historial.md)).

**Cifras del modelo.** Con 1, 3, 6 y 12 meses el margen casi no cambia; en Hobby caben 263, 128, 72 y 38 clientes de paga (Pro: 2,637 · 1,283 · 724 · 387) [disco-e-historial].

| Opción | A favor | En contra |
|---|---|---|
| 3 meses + archivo | 128 de paga en Hobby | Cambia lo decidido |
| 12 meses + archivo (recomendada) | Cumple lo decidido | En Hobby sólo caben 38 de paga |

**Ejemplo.** Un restaurante de 25 mesas con 1,800 visitas al mes genera 13.5 MB al mes: 12 meses son 162 MB.

**La prueba o el dato que la cierra.** Cuántos dueños abren el mes anterior en el panel.

---

## 6. Soporte

**Recomendación.** **WhatsApp o correo en horario hábil para la paga (≈ 60 pesos al mes por cliente) y autoservicio para el gratuito (0.5, sin fuente).**

**De qué supuesto depende y qué pasa si falla.** **Del tiempo real de soporte (supuesto).** Si cada cliente de paga cuesta 150, Master Chef a 225 queda debajo del piso ×3 (238) y hay que subir el precio o acotar el soporte.

**Cifras del modelo.** Efecto en el margen (±50 %): soporte del gratuito 485 pesos; de paga 1,914.

| Opción | A favor | En contra |
|---|---|---|
| Autoservicio y correo (30) | Piso bajo | Mal servicio si no saben subir su carta |
| WhatsApp en horario (60, recomendada) | Equilibrio | Depende de que 30 minutos alcancen |
| Alta hecha por nosotros (150) | Mejor conversión probable | El piso ×3 sube |

**Ejemplo.** Un salón de 60 mesas necesita soporte propio (se supone 120).

**La prueba o el dato que la cierra.** Tickets y minutos de soporte del piloto.

---

## 7. Avisos de reloj desde el servidor

**Recomendación.** **No.** Los relojes se calculan en el teléfono (AC-40.9).

**De qué supuesto depende y qué pasa si falla.** **De que no haya notificaciones push (fuera de la v1).**

**Cifras del modelo.** Un temporizador para ≈ 12,000 mesas es una consulta por minuto; sin push no despierta al teléfono.

| Opción | A favor | En contra |
|---|---|---|
| Relojes en el teléfono (recomendada) | Cero costo de servidor | Si el teléfono duerme no avisa |
| Reloj en el servidor | Un evento por cruce de umbral | Contradice AC-40.9 |

**Ejemplo.** El capitán de un salón de 60 mesas ve en su teléfono que la mesa 12 lleva 25 minutos sin movimiento.

**La prueba o el dato que la cierra.** Que se apruebe push.

---

## 8. Datos por conseguir (resumen)

Curva de pago real · mesas, cuentas y platillos por negocio (para acotar el modelo y σ) · bajas y costo de conseguir un cliente (**sin dato**) · tarifa de anuncios, parte de visitas con anuncio, tasa de llenado y aprobación de la red · soporte por cliente (gratuito y de paga) · comensales por restaurante real · eventos por visita · costo real de Railway con el sondeo de hoy.
