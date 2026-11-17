# Chequeo de márgenes: mes 12 cifra por cifra y a dónde se va cada peso

**Fecha:** 14 de noviembre de 2026 (ronda 4) · **Generado por `2026-11-14-corre-escenarios.mjs`**; datos en [`…-modelo-de-escenarios-resultados.json`](2026-11-14-modelo-de-escenarios-resultados.json) (`chequeo_de_margenes`). Escenarios definidos una sola vez (`ESCENARIOS`): **Recomendado** = curva de pago media (mediana de Master Chef = 225, el precio de Meniu Business) y anuncios en la tarifa baja ya en marcha · **Peor** = curva de pago pesimista y SIN anuncios en ningún mes (los costos los pone Calvin de su bolsa) · **Mejor** = curva de pago optimista y anuncios en la tarifa media · **Piso de verdad** = curva pesimista, anuncios adversos (mitad de la tarifa baja, anuncio en el 30 % de las visitas) y soporte al máximo de su rango. *Cada escenario mueve dos ejes a la vez (curva de pago y anuncios): la matriz de §5 los separa.*

## Conclusiones

1. **El «margen de 10,000 al mes 12 en el mejor caso» venía de una versión anterior del modelo y no se reproduce**; con el modelo actual el **mejor del mes 12 es +18,549 de operación** (+5,809 después de captación) con 115 de paga. La cifra vieja no quedó guardada: no pude desglosarla.
2. **Mes 12 recomendado: ingresos 8,507, costos 3,216, operación +5,292, después de captación +1,428** con 300 restaurantes y 35 de paga.
3. **El peor del mes 12 NO lleva anuncios** (ingresos por anuncios 0): +639 de operación y −142 después de captación; **el piso de verdad da −537** de operación.
4. **De cada 100 pesos que entran en el mes 12 (recomendado): 5.3 van al servidor, 26.1 a soporte, 5.9 a la comisión de cobro, 45.4 a conseguir clientes y 16.8 se quedan.** Los anuncios son 8.1 de cada 100 que entran y dependen de una tarifa sin dato.

## 1. Mes 12, de dónde sale cada cifra (pesos al mes)

| Caso | Restaurantes | De paga | Ingreso por suscripción | Ingreso por anuncios | **Ingresos** | Costos de operación | Conseguir clientes | **Margen después de captación** |
|---|---|---|---|---|---|---|---|---|
| Peor (sin anuncios en ningún mes) | 300 | 7 | 1,581 | 0 | **1,581** | 942 | 781 | **−142** |
| **Recomendado** | 300 | 35 | 7,822 | 685 | **8,507** | 3,216 | 3,863 | **+1,428** |
| Mejor | 300 | 115 | 25,797 | 1,915 | **27,712** | 9,163 | 12,740 | **+5,809** |
| Piso de verdad | 300 | 7 | 1,581 | 189 | **1,771** | 2,307 | 781 | **−1,318** |

**Cómo se calcula cada columna.** *Restaurantes* = a·t^b con 300 a 12 meses y 1200 a 24 (**supuesto**). *De paga* = restaurantes × los que rebasan los topes (66.2 %) × los que llegan a pagar según la curva. *Anuncios* = gratuitos × 2,050 visitas × 60 % con anuncio × tarifa por mil; **antes del mes 9 es cero** salvo que el escenario lleve anuncios (el peor no los lleva nunca). *Conseguir clientes* = altas × 600 pesos.

## 2. La matriz que separa los dos ejes (margen de operación, 1,000 restaurantes en régimen)

| Curva de pago | Sin anuncios | Tarifa baja | Tarifa media |
|---|---|---|---|
| pesimista | +2,388 | +4,910 | +12,478 |
| media | +16,308 | +18,591 | +25,442 |
| optimista | +54,980 | +56,576 | +61,364 |

**Del mejor (+61,364), 4,787 vienen sólo de la tarifa media de anuncios** (optimista con tarifa baja: +56,576).

## 3. De cada 100 pesos que entran (mes 12)

| Concepto | Recomendado | Peor | Mejor | Piso de verdad |
|---|---|---|---|---|
| Servidor | 5.3 | 14.9 | 1.7 | 13.3 |
| Almacenamiento y fotos | 0.5 | 2.3 | 0.2 | 2.1 |
| Soporte | 26.1 | 35.9 | 25.2 | 109.2 |
| Comisión de cobro | 5.9 | 6.4 | 5.9 | 5.7 |
| Conseguir clientes (reponer bajas y altas) | 45.4 | 49.4 | 46 | 44.1 |
| Sueldos | 0 | 0 | 0 | 0 |
| Impuestos | 0 | 0 | 0 | 0 |
| **Se queda (después de captación)** | **16.8** | -9 | 21 | -74.4 |

*Negativo en una fila = costo mayor que lo que entra. **En régimen con 1,000 restaurantes (curva media):** 28,358 de ingresos al mes (26,074 de suscripción y 2,284 de anuncios).*

## 4. Lo que no incluye
Sueldos (0), impuestos (0), ni gasto de ventas más allá de 600 pesos por cliente de paga; bajas y captación sin dato. Ingresos de anuncios sin modelar: moderación de anuncios (revisar y bloquear categorías); tasa de llenado y bloqueadores (van dentro de `parte_visitas_con_anuncio`, sin modelar por separado); comisión de la red de anuncios; impuestos sobre los ingresos de anuncios y de suscripción.
