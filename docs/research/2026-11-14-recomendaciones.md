# Recomendaciones: ocho decisiones con su supuesto, sus alternativas y la prueba que las cierra

**Fecha:** 14 de noviembre de 2026 (ronda 4; apoyado en el [modelo](2026-11-14-modelo-de-escenarios.md)) · **Generado por `2026-11-14-corre-escenarios.mjs`** · [JSON](2026-11-14-recomendaciones.json).

## Conclusiones

1. **Dos planes (decisión de Calvin, 17-nov): Chef gratis con 6 mesas y 3 cuenta; Master Chef 225 para todo lo demás; Chef Ejecutivo apagado.** Con el modelo cabe el 44.3 % de los negocios de 0 a 5 personas (38.1 %–59.8 %) y ninguno de 6 a 10; el tope de platillos **cuenta todo, bebidas incluidas** (decidido el 17-nov; decisión 2).
2. **Master Chef 225 es una decisión de posicionamiento de Calvin, no un resultado del modelo;** el modelo no puede elegir entre 199, 225, 249 y 299: lo decide la prueba del piloto. Margen de operación con 1,000 restaurantes: +15,221 recomendado, −1,362 peor, +60,439 mejor, −5,330 piso de verdad.
3. **Los anuncios llegan hacia el mes 9 (supuesto); mientras tanto, 1,000 pesos al mes cargan 283 restaurantes gratuitos (rango 167–283), con el canal de eventos construido.**
4. **Lo que más cambia el resultado: curva · mediana, curva · techo, cuántos rebasan los topes.** Se miden en el piloto.
5. **Historial de 12 meses para la paga (decidido): casi no mueve el margen.**

**Recomendado** = curva de pago media (mediana de Master Chef = 225, el precio de Meniu Business) y anuncios en la tarifa baja ya en marcha · **Peor** = curva de pago pesimista y SIN anuncios en ningún mes (los costos los pone Calvin de su bolsa) · **Mejor** = curva de pago optimista y anuncios en la tarifa media · **Piso de verdad** = curva pesimista, anuncios adversos (mitad de la tarifa baja, anuncio en el 30 % de las visitas) y soporte al máximo de su rango. *Cada escenario mueve dos ejes a la vez (curva de pago y anuncios): la matriz de §5 los separa.*


## 1. Dos planes: Chef (gratis, 0 a 5 personas) y Master Chef (DECIDIDA por Calvin el 17-nov)

**Recomendación.** **Chef = 6 mesas, el dueño y hasta 3 cuentas de personal con PIN (decisión de Calvin, 21-nov: «el dueño del restaurante y 3 meseros máximo»); Master Chef 225 = todo lo que pase de ahí, hasta los topes técnicos (500 mesas y 50 personas activas); Chef Ejecutivo apagado.** Con el modelo de mesas y cuentas cabe en Chef el 44.3 % de los negocios de 0 a 5 personas (rango 38.1 %–59.8 %) y el 7.8 % de los de 6 a 10.

**De qué supuesto depende y qué pasa si falla.** **Del modelo de mesas y cuentas y de su dispersión (σ = 0.5, supuesto sin dato): «cuentas» = las que el negocio querría crear.** Si una fonda de 4 personas se arregla con menos cuentas de las que el tope permite, cabría más que el 44.3 %; con sólo 1 cuenta cabría el 31.1 %. **Sobre el ADR-017:** el dueño es el validador y el primer mesero; las 3 cuentas son los meseros que llevan el ciclo de la mesa.

**Cifras del modelo.** Frente a tres planes (1,000 restaurantes, curva media): pagantes 119 (antes 30); margen recomendado +15,221 (antes +8,719); peor −1,362 (antes −47).

| Opción | A favor | En contra |
|---|---|---|
| 6 mesas · 3 cuentas | 44.3 % de 0 a 5 personas dentro; margen +15,221 | 92.2 % de 6 a 10 personas cae en Master Chef |
| 6 mesas · 1 cuenta | 31.1 % de 0 a 5 personas dentro; margen +17,957 | 100 % de 6 a 10 personas cae en Master Chef |
| 6 mesas · 2 cuentas | 42.7 % de 0 a 5 personas dentro; margen +15,849 | 100 % de 6 a 10 personas cae en Master Chef |
| 8 mesas · 2 cuentas | 48.9 % de 0 a 5 personas dentro; margen +14,362 | 100 % de 6 a 10 personas cae en Master Chef |
| 10 mesas · 3 cuentas | 55.2 % de 0 a 5 personas dentro; margen +12,030 | 80.6 % de 6 a 10 personas cae en Master Chef |

**Ejemplo.** Una fonda de 2 personas y 4 mesas cabe en Chef (una cuenta); una taquería de 5 personas que quiere cuenta para el mesero y para el cocinero ya necesita Master Chef.

**La prueba o el dato que la cierra.** Mesas y cuentas por negocio en los primeros 10 a 20 restaurantes (`mesa` y `personal_restaurante` activos al alta, sin datos personales) y cuántos de 0 a 5 personas se arreglan con una cuenta.

---

## 2. Tope de platillos del plan Chef (DECIDIDO por Calvin el 21-nov: 50 de base, contando todo, bebidas incluidas)

**Recomendación.** **El tope de platillos de Chef es 50 de base y cuenta TODO, bebidas incluidas (decisión de Calvin, 21 de noviembre de 2026; antes se recomendaba 100).** De 50 a 150 el disco casi no se mueve (0.2 %) y el procesador tampoco se acaba; lo que cambia es la cobertura y quién paga (ver `2026-11-17-costo-de-platillo.md`). La banda de dos cotas se conserva porque no se sabe cuál muestra tiene razón: con 50 platillos caben 15 % de las cartas de sitios propios (56; largas y formales) y 63 % de las de reparto (148; cortas, sin bebidas). Quien tenga una carta más larga pasa a Master Chef.

**De qué supuesto depende y qué pasa si falla.** **De cómo se cuente «platillo»** (las dos muestras no usan la misma regla) y **de quién sea el negocio**. **Si falla:** con una cobertura baja se cobra a negocios que debían ser gratis; con una alta, se regalan negocios que podrían pagar.

**Cifras del modelo.** Alternativas descartadas el 17 de noviembre: Tope de 150 que cuenta sólo comida (las bebidas no tienen tope): dentro de Chef de 0 a 5 personas 70.3 % (cota baja) · Subir el tope a 200 platillos (bebidas incluidas): dentro de Chef de 0 a 5 personas 51.5 % (cota baja) · Subir el tope a 300 platillos (bebidas incluidas): dentro de Chef de 0 a 5 personas 59 % (cota baja) · Quitar el tope de platillos y limitar sólo por mesas y cuentas: dentro de Chef de 0 a 5 personas 70.3 % (cota baja).

| Opción | A favor | En contra |
|---|---|---|
| Tope de 150 que cuenta sólo comida (las bebidas no tienen tope) (descartada el 17-nov) | Casi no deja a nadie afuera | Hay que clasificar comida y bebida |
| Subir el tope a 200 platillos (bebidas incluidas) (descartada el 17-nov) | Más cobertura con la cota baja | Sigue dependiendo de una muestra sesgada |
| Subir el tope a 300 platillos (bebidas incluidas) (descartada el 17-nov) | Más cobertura con la cota baja | Sigue dependiendo de una muestra sesgada |
| Quitar el tope de platillos y limitar sólo por mesas y cuentas (descartada el 17-nov) | Cobertura sólo por mesas y cuentas | Sin freno para cartas enormes |

**Ejemplo.** Una cafetería con 40 platillos (comida y bebidas) cabe en un tope de 50; una con 120 ya pasa a Master Chef, igual que una cena formal con 276 (la mediana de los formales de la muestra).

**La prueba o el dato que la cierra.** Pendiente: la carta real de los negocios del piloto, contada con la instrucción de conteo de la muestra (comida y bebidas por separado) y la plataforma por la que llegaron.

---

## 3. Precio de Master Chef

**Recomendación.** **Master Chef 225 es una decisión de posicionamiento de Calvin (pegado a Meniu Business), no un resultado del modelo.** El modelo no puede elegir entre 199, 225, 249 y 299: lo decide la prueba de tres precios del piloto. Chef Ejecutivo queda apagado (futura escalación).

**De qué supuesto depende y qué pasa si falla.** **De la curva de pago (supuesto).** Con la mediana en 150 gana 199; en 225, 225; en 300, 299; en 450, 299. Ver [precio de entrada](2026-11-14-precio-de-entrada.md). **Si falla:** si los dueños pagan lo de un menú QR (157), 225 pierde clientes; si pagan lo de un POS (652), 225 deja dinero sobre la mesa.

**Cifras del modelo.** Master Chef 199 / 225 / 249 / 299: pagantes (media) 138 / 119 / 103 / 75; margen de operación (media) 14,668 / 15,221 / 15,202 / 14,107.

| Opción | A favor | En contra |
|---|---|---|
| 199 | Más pagantes | Debajo de Meniu |
| 225 (decisión de posicionamiento) | Pegado a Meniu | Sin colchón si el soporte cuesta más |
| 249 | Mismo margen que 225 con la curva supuesta | Un poco arriba de Meniu |
| 299 | Más margen por pagante | Menos pagantes (75 contra 119) |

**Ejemplo.** Un restaurante de 25 mesas (ingreso medio 737,584 al mes [INEGI, promedio]): 225 son 0.03 % de su ingreso.

**La prueba o el dato que la cierra.** Prueba de precio del piloto: tres grupos de 10 (199 · 249 · 299) y a los 6 meses cuántos se quedan.

---

## 4. Anuncios en Chef: cuándo llegan y cuánto dejan

**Recomendación.** **El plan gratuito lleva anuncios; llegan hacia el mes 9 (supuesto de trabajo), no personalizados.** Mientras no hay, los paga Calvin: con 1,000 pesos al mes caben 283 restaurantes (rango 167 a 283).

**De qué supuesto depende y qué pasa si falla.** **De supuestos sin dato:** que la red apruebe el sitio, la tarifa por mil visitas, la parte de visitas con anuncio y el soporte por gratuito. **Se paga solo desde:** 264 (rango 99 a imposible) (tarifa baja), 21 (rango 10 a 99) (media) y no se paga solo (rango ∞ a imposible) (adverso). Vale con el canal de eventos construido (con el sondeo de hoy caben 28). No modelado: moderación de anuncios (revisar y bloquear categorías); tasa de llenado y bloqueadores (van dentro de `parte_visitas_con_anuncio`, sin modelar por separado); comisión de la red de anuncios; impuestos sobre los ingresos de anuncios y de suscripción.

**Cifras del modelo.** Requisitos: ADR, abrir la política de seguridad (`script-src 'self'`), aviso de privacidad, aprobación de la red.

| Opción | A favor | En contra |
|---|---|---|
| Anuncios desde el mes 3 | El peor caso se cubre antes | No hay tiempo de construir y que la red apruebe |
| Anuncios desde el mes 9 (supuesto) | Tiempo realista | Calvin pone hasta 5,573 pesos acumulados |
| Sin anuncios | Cumple la política de seguridad de hoy | Descartada por Calvin |

**Ejemplo.** Un gratuito deja 2.6 pesos al mes con la tarifa baja una vez que hay anuncios; hoy deja 0.

**La prueba o el dato que la cierra.** Una prueba pequeña de AdSense con 3 restaurantes (impresiones, ingresos, RPM, tasa de llenado).

---

## 5. Cuánta bolsa poner mientras no hay anuncios

**Recomendación.** **1,000 pesos al mes** alcanzan para 283 restaurantes gratuitos (rango 167 a 283); acumulado, Calvin pone hasta **5,573 pesos** en el caso recomendado, 93,796 en el peor y 228,022 en el piso de verdad.

**De qué supuesto depende y qué pasa si falla.** **Del ritmo de adopción (supuesto) y del soporte por gratuito (sin fuente).** Vale con el canal de eventos construido.

**Cifras del modelo.** Bolsa 500 / 1,000 / 2,000 / 5,000 → 88 (28–171) / 283 (167–283) / 283 (283–283) / 1,014 (567–1,132) restaurantes gratuitos (con la carga de sus topes; sólo gratuitos, sin la mezcla de paga que usa «¿Qué nos limita?»: 28 registrados con avisos).

| Opción | A favor | En contra |
|---|---|---|
| 500 pesos al mes | 88 restaurantes y 0.2 M de comensales | rango 28–171 según el soporte |
| 1,000 pesos al mes | 283 restaurantes y 0.6 M de comensales | rango 167–283 según el soporte |
| 2,000 pesos al mes | 283 restaurantes y 0.6 M de comensales | rango 283–283 según el soporte |
| 5,000 pesos al mes | 1,014 restaurantes y 2.1 M de comensales | rango 567–1,132 según el soporte |

**Ejemplo.** Con 1,000 pesos al mes pagas servidor y soporte básico de ≈ 283 fondas y taquerías gratuitas.

**La prueba o el dato que la cierra.** El costo real de Railway del primer mes con restaurantes del piloto y los minutos reales de soporte.

---

## 6. Historial: meses en línea y archivo descargable

**Recomendación.** **12 meses en línea para la paga (decidido por Calvin). Para el gratuito, la política vigente es la de 03 §7 (24 meses de sesiones y 13 de analítica); recortarlo a 30 días, con archivo descargable de lo anterior, es una PROPUESTA pendiente de decisión de Calvin.**

**De qué supuesto depende y qué pasa si falla.** **Del volumen de disco que se pague y de los 7.1–8.5 KB por visita medidos (con 10 eventos por visita supuestos)** ([disco-e-historial](2026-11-14-disco-e-historial.md)).

**Cifras del modelo.** Con 1, 3, 6 y 12 meses el margen casi no cambia; en Hobby caben 263, 128, 72 y 38 clientes de paga (Pro: 2,637 · 1,283 · 724 · 387) [disco-e-historial].

| Opción | A favor | En contra |
|---|---|---|
| 3 meses + archivo | 128 de paga en Hobby | Cambia lo decidido |
| 12 meses + archivo (recomendada) | Cumple lo decidido | En Hobby sólo caben 38 de paga |

**Ejemplo.** Un restaurante de 25 mesas con 1,800 visitas al mes genera 13.5 MB al mes: 12 meses son 162 MB.

**La prueba o el dato que la cierra.** Cuántos dueños abren el mes anterior en el panel.

---

## 7. Soporte

**Recomendación.** **WhatsApp o correo en horario hábil para la paga (≈ 60 pesos al mes por cliente) y autoservicio para el gratuito (0.5, sin fuente).**

**De qué supuesto depende y qué pasa si falla.** **Del tiempo real de soporte (supuesto).** Si cada cliente de paga cuesta 150, Master Chef a 225 queda debajo del piso ×3 (238) y hay que subir el precio o acotar el soporte.

**Cifras del modelo.** Efecto en el margen (±50 %): soporte del gratuito 441 pesos; de paga 7,118.

| Opción | A favor | En contra |
|---|---|---|
| Autoservicio y correo (30) | Piso bajo | Mal servicio si no saben subir su carta |
| WhatsApp en horario (60, recomendada) | Equilibrio | Depende de que 30 minutos alcancen |
| Alta hecha por nosotros (150) | Mejor conversión probable | El piso ×3 sube |

**Ejemplo.** Un salón de 60 mesas necesita soporte propio (se supone 120).

**La prueba o el dato que la cierra.** Tickets y minutos de soporte del piloto.

---

## 8. Avisos de reloj desde el servidor

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
