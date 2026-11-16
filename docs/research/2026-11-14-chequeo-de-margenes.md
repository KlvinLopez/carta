# Chequeo de márgenes: mes 12 cifra por cifra y a dónde se va cada peso

**Fecha:** 14 de noviembre de 2026 (ronda 4) · **Generado por `2026-11-14-corre-escenarios.mjs`**; datos en [`…-modelo-de-escenarios-resultados.json`](2026-11-14-modelo-de-escenarios-resultados.json) (`chequeo_de_margenes`). Escenarios definidos una sola vez (`ESCENARIOS`): **Recomendado** = curva de pago media (mediana de Master Chef = 225, el precio de Meniu Business) y anuncios en la tarifa baja ya en marcha · **Peor** = curva de pago pesimista y SIN anuncios en ningún mes (los costos los pone Calvin de su bolsa) · **Mejor** = curva de pago optimista y anuncios en la tarifa media · **Piso de verdad** = curva pesimista, anuncios adversos (mitad de la tarifa baja, anuncio en el 30 % de las visitas) y soporte al máximo de su rango. *Cada escenario mueve dos ejes a la vez (curva de pago y anuncios): la matriz de §5 los separa.*

## Conclusiones

1. **El «margen de 10,000 al mes 12 en el mejor caso» venía de una versión anterior del modelo y no se reproduce**; con el modelo actual el **mejor del mes 12 es +9,538 de operación** (+6,200 después de captación) con 30 de paga. La cifra vieja no quedó guardada: no pude desglosarla.
2. **Mes 12 recomendado: ingresos 3,682, costos 1,352, operación +2,330, después de captación +1,314** con 300 restaurantes y 9 de paga.
3. **El peor del mes 12 NO lleva anuncios** (ingresos por anuncios 0): −300 de operación y −503 después de captación; **el piso de verdad da −895** de operación.
4. **De cada 100 pesos que entran en el mes 12 (recomendado): 12.7 van al servidor, 19.5 a soporte, 4.1 a la comisión de cobro, 27.6 a conseguir clientes y 35.7 se quedan.** Los anuncios son 34 de cada 100 que entran y dependen de una tarifa sin dato.

## 1. Mes 12, de dónde sale cada cifra (pesos al mes)

| Caso | Restaurantes | De paga | Ingreso por suscripción | Ingreso por anuncios | **Ingresos** | Costos de operación | Conseguir clientes | **Margen después de captación** |
|---|---|---|---|---|---|---|---|---|
| Peor (sin anuncios en ningún mes) | 300 | 2 | 470 | 0 | **470** | 770 | 203 | **−503** |
| **Recomendado** | 300 | 9 | 2,430 | 1,252 | **3,682** | 1,352 | 1,016 | **+1,314** |
| Mejor | 300 | 30 | 7,886 | 4,649 | **12,535** | 2,997 | 3,338 | **+6,200** |
| Piso de verdad | 300 | 2 | 470 | 321 | **791** | 1,686 | 203 | **−1,099** |

**Cómo se calcula cada columna.** *Restaurantes* = a·t^b con 300 a 12 meses y 1200 a 24 (**supuesto**). *De paga* = restaurantes × los que rebasan los topes (17.4 %) × los que llegan a pagar según la curva. *Anuncios* = gratuitos × 2,050 visitas × 60 % con anuncio × tarifa por mil; **antes del mes 9 es cero** salvo que el escenario lleve anuncios (el peor no los lleva nunca). *Conseguir clientes* = altas × 600 pesos.

## 2. La matriz que separa los dos ejes (margen de operación, 1,000 restaurantes en régimen)

| Curva de pago | Sin anuncios | Tarifa baja | Tarifa media |
|---|---|---|---|
| pesimista | −47 | +4,231 | +17,068 |
| media | +4,545 | +8,719 | +21,241 |
| optimista | +17,159 | +21,033 | +32,655 |

**Del mejor (+32,655), 11,622 vienen sólo de la tarifa media de anuncios** (optimista con tarifa baja: +21,033).

## 3. De cada 100 pesos que entran (mes 12)

| Concepto | Recomendado | Peor | Mejor | Piso de verdad |
|---|---|---|---|---|
| Servidor | 12.7 | 98.7 | 3.8 | 58.7 |
| Almacenamiento y fotos | 0.5 | 3 | 0.2 | 1.8 |
| Soporte | 19.5 | 55.9 | 16.1 | 149.1 |
| Comisión de cobro | 4.1 | 6.2 | 3.9 | 3.7 |
| Conseguir clientes (reponer bajas y altas) | 27.6 | 43.2 | 26.6 | 25.7 |
| Sueldos | 0 | 0 | 0 | 0 |
| Impuestos | 0 | 0 | 0 | 0 |
| **Se queda (después de captación)** | **35.7** | -107.1 | 49.5 | -138.9 |

*Negativo en una fila = costo mayor que lo que entra. **En régimen con 1,000 restaurantes (curva media):** 12,272 de ingresos al mes (8,098 de suscripción y 4,174 de anuncios).*

## 4. Lo que no incluye
Sueldos (0), impuestos (0), ni gasto de ventas más allá de 600 pesos por cliente de paga; bajas y captación sin dato. Ingresos de anuncios sin modelar: moderación de anuncios (revisar y bloquear categorías); tasa de llenado y bloqueadores (van dentro de `parte_visitas_con_anuncio`, sin modelar por separado); comisión de la red de anuncios; impuestos sobre los ingresos de anuncios y de suscripción.
