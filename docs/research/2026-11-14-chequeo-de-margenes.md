# Chequeo de márgenes: mes 12 cifra por cifra y a dónde se va cada peso

**Fecha:** 14 de noviembre de 2026 (ronda 4) · **Generado por `2026-11-14-corre-escenarios.mjs`**; datos en [`…-modelo-de-escenarios-resultados.json`](2026-11-14-modelo-de-escenarios-resultados.json) (`chequeo_de_margenes`). Escenarios definidos una sola vez (`ESCENARIOS`): **Recomendado** = curva de pago media (mediana de Master Chef = 225, el precio de Meniu Business) y anuncios en la tarifa baja ya en marcha · **Peor** = curva de pago pesimista y SIN anuncios en ningún mes (los costos los pone Calvin de su bolsa) · **Mejor** = curva de pago optimista y anuncios en la tarifa media · **Piso de verdad** = curva pesimista, anuncios adversos (mitad de la tarifa baja, anuncio en el 30 % de las visitas) y soporte al máximo de su rango. *Cada escenario mueve dos ejes a la vez (curva de pago y anuncios): la matriz de §5 los separa.*

## Conclusiones

1. **El «margen de 10,000 al mes 12 en el mejor caso» venía de una versión anterior del modelo y no se reproduce**; con el modelo actual el **mejor del mes 12 es +19,826 de operación** (+7,086 después de captación) con 115 de paga. La cifra vieja no quedó guardada: no pude desglosarla.
2. **Mes 12 recomendado: ingresos 8,964, costos 3,215, operación +5,749, después de captación +1,886** con 300 restaurantes y 35 de paga.
3. **El peor del mes 12 NO lleva anuncios** (ingresos por anuncios 0): +431 de operación y −350 después de captación; **el piso de verdad da −619** de operación.
4. **De cada 100 pesos que entran en el mes 12 (recomendado): 5.3 van al servidor, 24.7 a soporte, 5.6 a la comisión de cobro, 43.1 a conseguir clientes y 21 se quedan.** Los anuncios son 12.7 de cada 100 que entran y dependen de una tarifa sin dato.

## 1. Mes 12, de dónde sale cada cifra (pesos al mes)

| Caso | Restaurantes | De paga | Ingreso por suscripción | Ingreso por anuncios | **Ingresos** | Costos de operación | Conseguir clientes | **Margen después de captación** |
|---|---|---|---|---|---|---|---|---|
| Peor (sin anuncios en ningún mes) | 300 | 7 | 1,581 | 0 | **1,581** | 1,150 | 781 | **−350** |
| **Recomendado** | 300 | 35 | 7,822 | 1,142 | **8,964** | 3,215 | 3,863 | **+1,886** |
| Mejor | 300 | 115 | 25,797 | 3,192 | **28,989** | 9,163 | 12,740 | **+7,086** |
| Piso de verdad | 300 | 7 | 1,581 | 315 | **1,897** | 2,515 | 781 | **−1,400** |

**Cómo se calcula cada columna.** *Restaurantes* = a·t^b con 300 a 12 meses y 1200 a 24 (**supuesto**). *De paga* = restaurantes × los que rebasan los topes (66.2 %) × los que llegan a pagar según la curva. *Anuncios* = gratuitos × 2,050 visitas × 60 % con anuncio × tarifa por mil; **antes del mes 9 es cero** salvo que el escenario lleve anuncios (el peor no los lleva nunca). *Conseguir clientes* = altas × 600 pesos.

## 2. La matriz que separa los dos ejes (margen de operación, 1,000 restaurantes en régimen)

| Curva de pago | Sin anuncios | Tarifa baja | Tarifa media |
|---|---|---|---|
| pesimista | +2,390 | +6,594 | +19,206 |
| media | +16,218 | +20,024 | +31,442 |
| optimista | +55,025 | +57,685 | +65,664 |

**Del mejor (+65,664), 7,979 vienen sólo de la tarifa media de anuncios** (optimista con tarifa baja: +57,685).

## 3. De cada 100 pesos que entran (mes 12)

| Concepto | Recomendado | Peor | Mejor | Piso de verdad |
|---|---|---|---|---|
| Servidor | 5.3 | 29.4 | 1.7 | 24.5 |
| Almacenamiento y fotos | 0.3 | 1 | 0.2 | 0.8 |
| Soporte | 24.7 | 35.9 | 24.1 | 101.9 |
| Comisión de cobro | 5.6 | 6.4 | 5.7 | 5.3 |
| Conseguir clientes (reponer bajas y altas) | 43.1 | 49.4 | 43.9 | 41.2 |
| Sueldos | 0 | 0 | 0 | 0 |
| Impuestos | 0 | 0 | 0 | 0 |
| **Se queda (después de captación)** | **21** | -22.1 | 24.4 | -73.8 |

*Negativo en una fila = costo mayor que lo que entra. **En régimen con 1,000 restaurantes (curva media):** 29,880 de ingresos al mes (26,074 de suscripción y 3,806 de anuncios).*

## 4. Lo que no incluye
Sueldos (0), impuestos (0), ni gasto de ventas más allá de 600 pesos por cliente de paga; bajas y captación sin dato. Ingresos de anuncios sin modelar: moderación de anuncios (revisar y bloquear categorías); tasa de llenado y bloqueadores (van dentro de `parte_visitas_con_anuncio`, sin modelar por separado); comisión de la red de anuncios; impuestos sobre los ingresos de anuncios y de suscripción.
