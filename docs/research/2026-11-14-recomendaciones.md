# Recomendaciones: ocho decisiones con su supuesto, sus alternativas y la prueba que las cierra

**Fecha:** 14 de noviembre de 2026 (ronda 4; apoyado en el [modelo](2026-11-14-modelo-de-escenarios.md)) · **Generado por `2026-11-14-corre-escenarios.mjs`** · [JSON](2026-11-14-recomendaciones.json).

## Conclusiones

1. **Dos planes (decisión de Calvin, 17-nov): Chef gratis con 6 mesas y 1 cuenta; Master Chef 225 para todo lo demás; Chef Ejecutivo apagado.** Con el modelo cabe el 48.4 % de los negocios de 0 a 5 personas (42.4 %–54.5 %) y ninguno de 6 a 10; el tope de platillos **cuenta todo, bebidas incluidas** (decidido el 17-nov; decisión 2).
2. **Master Chef 225 es una decisión de posicionamiento de Calvin, no un resultado del modelo;** el modelo no puede elegir entre 199, 225, 249 y 299: lo decide la prueba del piloto. Margen de operación con 1,000 restaurantes: +20,024 recomendado, +2,390 peor, +65,664 mejor, −1,109 piso de verdad.
3. **Los anuncios llegan hacia el mes 9 (supuesto); mientras tanto, 1,000 pesos al mes cargan 811 restaurantes gratuitos (rango 246–1,896), con el canal de eventos construido.**
4. **Lo que más cambia el resultado: curva · mediana, curva · techo, cuántos rebasan los topes.** Se miden en el piloto.
5. **Historial de 12 meses para la paga (decidido): casi no mueve el margen.**

**Recomendado** = curva de pago media (mediana de Master Chef = 225, el precio de Meniu Business) y anuncios en la tarifa baja ya en marcha · **Peor** = curva de pago pesimista y SIN anuncios en ningún mes (los costos los pone Calvin de su bolsa) · **Mejor** = curva de pago optimista y anuncios en la tarifa media · **Piso de verdad** = curva pesimista, anuncios adversos (mitad de la tarifa baja, anuncio en el 30 % de las visitas) y soporte al máximo de su rango. *Cada escenario mueve dos ejes a la vez (curva de pago y anuncios): la matriz de §5 los separa.*


## 1. Dos planes: Chef (gratis, 0 a 5 personas) y Master Chef (DECIDIDA por Calvin el 17-nov)

**Recomendación.** **Chef = 6 mesas y 1 cuenta de personal (una sola persona con PIN); Master Chef 225 = todo lo que pase de ahí, hasta los topes técnicos (500 mesas y 50 personas activas); Chef Ejecutivo apagado.** Con el modelo de mesas y cuentas cabe en Chef el 48.4 % de los negocios de 0 a 5 personas (rango 42.4 %–54.5 %) y ninguno de 6 a 10.

**De qué supuesto depende y qué pasa si falla.** **Del modelo de mesas y cuentas y de su dispersión (σ = 0.5, supuesto sin dato): «cuentas» = las que el negocio querría crear.** Si una fonda de 4 personas se arregla con una sola cuenta, cabría más que el 48.4 %; con la alternativa de 2 cuentas cabría el 66.5 %. **Sobre el ADR-017:** el dueño es el validador y el primer mesero; con una cuenta, el plan gratuito es operación de una sola persona con PIN.

**Cifras del modelo.** Frente a tres planes (1,000 restaurantes, curva media): pagantes 116 (antes 30); margen recomendado +20,024 (antes +8,719); peor +2,390 (antes −47).

| Opción | A favor | En contra |
|---|---|---|
| 5 mesas · 1 cuenta | 48.4 % de 0 a 5 personas dentro; margen +20,024 | 100 % de 6 a 10 personas cae en Master Chef |
| 6 mesas · 1 cuenta | 48.4 % de 0 a 5 personas dentro; margen +20,024 | 100 % de 6 a 10 personas cae en Master Chef |
| 6 mesas · 2 cuentas | 66.5 % de 0 a 5 personas dentro; margen +16,794 | 100 % de 6 a 10 personas cae en Master Chef |
| 8 mesas · 2 cuentas | 76.2 % de 0 a 5 personas dentro; margen +15,067 | 100 % de 6 a 10 personas cae en Master Chef |
| 10 mesas · 3 cuentas | 85.9 % de 0 a 5 personas dentro; margen +12,015 | 69.7 % de 6 a 10 personas cae en Master Chef |

**Ejemplo.** Una fonda de 2 personas y 4 mesas cabe en Chef (una cuenta); una taquería de 5 personas que quiere cuenta para el mesero y para el cocinero ya necesita Master Chef.

**La prueba o el dato que la cierra.** Mesas y cuentas por negocio en los primeros 10 a 20 restaurantes (`mesa` y `personal_restaurante` activos al alta, sin datos personales) y cuántos de 0 a 5 personas se arreglan con una cuenta.

---

## 2. Tope de platillos del plan Chef (DECIDIDA por Calvin el 17-nov: cuenta todo, bebidas incluidas)

**Recomendación.** **El tope de 150 platillos cuenta TODO, bebidas incluidas (decisión de Calvin, 17 de noviembre de 2026).** La banda de dos cotas se conserva porque no se sabe cuál muestra tiene razón: con 150 platillos caben 52 % de las cartas de sitios propios (56; largas y formales) y 98 % de las de reparto (148; cortas, sin bebidas; el 150 es extrapolación). Dentro de 150: fondas y taquerías 7 de 8, cafeterías 9 de 11, formales 3 de 14.

**De qué supuesto depende y qué pasa si falla.** **De cómo se cuente «platillo»** (las dos muestras no usan la misma regla) y **de quién sea el negocio**. **Si falla:** con una cobertura baja se cobra a negocios que debían ser gratis; con una alta, se regalan negocios que podrían pagar.

**Cifras del modelo.** Alternativas descartadas el 17 de noviembre: Tope de 150 que cuenta sólo comida (las bebidas no tienen tope): dentro de Chef de 0 a 5 personas 49.4 % (cota baja) · Subir el tope a 200 platillos (bebidas incluidas): dentro de Chef de 0 a 5 personas 36.2 % (cota baja) · Subir el tope a 300 platillos (bebidas incluidas): dentro de Chef de 0 a 5 personas 41.4 % (cota baja) · Quitar el tope de platillos y limitar sólo por mesas y cuentas: dentro de Chef de 0 a 5 personas 49.4 % (cota baja).

| Opción | A favor | En contra |
|---|---|---|
| Tope de 150 que cuenta sólo comida (las bebidas no tienen tope) (descartada el 17-nov) | Casi no deja a nadie afuera | Hay que clasificar comida y bebida |
| Subir el tope a 200 platillos (bebidas incluidas) (descartada el 17-nov) | Más cobertura con la cota baja | Sigue dependiendo de una muestra sesgada |
| Subir el tope a 300 platillos (bebidas incluidas) (descartada el 17-nov) | Más cobertura con la cota baja | Sigue dependiendo de una muestra sesgada |
| Quitar el tope de platillos y limitar sólo por mesas y cuentas (descartada el 17-nov) | Cobertura sólo por mesas y cuentas | Sin freno para cartas enormes |

**Ejemplo.** Una cafetería con 120 platillos (comida y bebidas) cabe en un tope de 150; una cena formal con 276 (la mediana de los formales de la muestra) no cabe.

**La prueba o el dato que la cierra.** Pendiente: la carta real de los negocios del piloto, contada con la instrucción de conteo de la muestra (comida y bebidas por separado) y la plataforma por la que llegaron.

---

## 3. Precio de Master Chef

**Recomendación.** **Master Chef 225 es una decisión de posicionamiento de Calvin (pegado a Meniu Business), no un resultado del modelo.** El modelo no puede elegir entre 199, 225, 249 y 299: lo decide la prueba de tres precios del piloto. Chef Ejecutivo queda apagado (futura escalación).

**De qué supuesto depende y qué pasa si falla.** **De la curva de pago (supuesto).** Con la mediana en 150 gana 199; en 225, 249; en 300, 299; en 450, 299. Ver [precio de entrada](2026-11-14-precio-de-entrada.md). **Si falla:** si los dueños pagan lo de un menú QR (157), 225 pierde clientes; si pagan lo de un POS (652), 225 deja dinero sobre la mesa.

**Cifras del modelo.** Master Chef 199 / 225 / 249 / 299: pagantes (media) 135 / 116 / 100 / 74; margen de operación (media) 19,439 / 20,024 / 20,043 / 19,035.

| Opción | A favor | En contra |
|---|---|---|
| 199 | Más pagantes | Debajo de Meniu |
| 225 (decisión de posicionamiento) | Pegado a Meniu | Sin colchón si el soporte cuesta más |
| 249 | Mismo margen que 225 con la curva supuesta | Un poco arriba de Meniu |
| 299 | Más margen por pagante | Menos pagantes (74 contra 116) |

**Ejemplo.** Un restaurante de 25 mesas (ingreso medio 737,584 al mes [INEGI, promedio]): 225 son 0.03 % de su ingreso.

**La prueba o el dato que la cierra.** Prueba de precio del piloto: tres grupos de 10 (199 · 249 · 299) y a los 6 meses cuántos se quedan.

---

## 4. Anuncios en Chef: cuándo llegan y cuánto dejan

**Recomendación.** **El plan gratuito lleva anuncios; llegan hacia el mes 9 (supuesto de trabajo), no personalizados.** Mientras no hay, los paga Calvin: con 1,000 pesos al mes caben 811 restaurantes (rango 246 a 1,896).

**De qué supuesto depende y qué pasa si falla.** **De supuestos sin dato:** que la red apruebe el sitio, la tarifa por mil visitas, la parte de visitas con anuncio y el soporte por gratuito. **Se paga solo desde:** 54 (rango 25 a 186) (tarifa baja), 12 (rango 6 a 25) (media) y 1,469 (rango 139 a imposible) (adverso). Vale con el canal de eventos construido (con el sondeo de hoy caben 148). No modelado: moderación de anuncios (revisar y bloquear categorías); tasa de llenado y bloqueadores (van dentro de `parte_visitas_con_anuncio`, sin modelar por separado); comisión de la red de anuncios; impuestos sobre los ingresos de anuncios y de suscripción.

**Cifras del modelo.** Requisitos: ADR, abrir la política de seguridad (`script-src 'self'`), aviso de privacidad, aprobación de la red.

| Opción | A favor | En contra |
|---|---|---|
| Anuncios desde el mes 3 | El peor caso se cubre antes | No hay tiempo de construir y que la red apruebe |
| Anuncios desde el mes 9 (supuesto) | Tiempo realista | Calvin pone hasta 4,309 pesos acumulados |
| Sin anuncios | Cumple la política de seguridad de hoy | Descartada por Calvin |

**Ejemplo.** Un gratuito deja 4.3 pesos al mes con la tarifa baja una vez que hay anuncios; hoy deja 0.

**La prueba o el dato que la cierra.** Una prueba pequeña de AdSense con 3 restaurantes (impresiones, ingresos, RPM, tasa de llenado).

---

## 5. Cuánta bolsa poner mientras no hay anuncios

**Recomendación.** **1,000 pesos al mes** alcanzan para 811 restaurantes gratuitos (rango 246 a 1,896); acumulado, Calvin pone hasta **4,309 pesos** en el caso recomendado, 4,256 en el peor y 94,950 en el piso de verdad.

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

## 6. Historial: meses en línea y archivo descargable

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

## 7. Soporte

**Recomendación.** **WhatsApp o correo en horario hábil para la paga (≈ 60 pesos al mes por cliente) y autoservicio para el gratuito (0.5, sin fuente).**

**De qué supuesto depende y qué pasa si falla.** **Del tiempo real de soporte (supuesto).** Si cada cliente de paga cuesta 150, Master Chef a 225 queda debajo del piso ×3 (238) y hay que subir el precio o acotar el soporte.

**Cifras del modelo.** Efecto en el margen (±50 %): soporte del gratuito 442 pesos; de paga 6,953.

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
