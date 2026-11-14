# Chequeo de márgenes: mes 12 cifra por cifra y a dónde se va cada peso

**Fecha:** 14 de noviembre de 2026 · **Generado por `2026-11-14-corre-escenarios.mjs`** desde el modelo; datos en [`…-modelo-de-escenarios-resultados.json`](2026-11-14-modelo-de-escenarios-resultados.json) (`chequeo_de_margenes`).

## Conclusiones

1. **El «margen de 10,000 al mes 12 en el mejor caso» venía de la versión anterior del modelo** (otro reparto de planes y curva optimista; **no se reproduce con el modelo actual**, y la cifra vieja no quedó guardada para desglosarla); **en el modelo corregido, el mejor caso del mes 12 es +8,936 pesos de operación** (+5,711 después de captación) con 29 clientes de paga.
2. **Mes 12 recomendado: ingresos 3,435, costos 1,307, margen de operación +2,128, después de captación +1,148** con 300 restaurantes y 9 de paga.
3. **De cada 100 pesos que entran en el mes 12 (recomendado): 13.6 van al servidor, 20 a soporte, 4 a la comisión de cobro, 28.5 a conseguir clientes y 33.4 se quedan.**
4. **Los anuncios son 36.5 de cada 100 pesos que entran en el mes 12 (recomendado)** y dependen de una tarifa sin dato: es la cifra que más conviene mirar dos veces.

## 1. Mes 12, de dónde sale cada cifra (pesos al mes)

| Caso | Restaurantes | De paga | Ingreso por suscripción | Ingreso por anuncios | **Ingresos** | Costos de operación | Conseguir clientes | **Margen después de captación** |
|---|---|---|---|---|---|---|---|---|
| Peor (pesimista, sin anuncios) | 300 | 2 | 430 | 1,284 | **1,714** | 763 | 197 | **+754** |
| **Recomendado** (media, anuncios en la tarifa baja) | 300 | 9 | 2,182 | 1,254 | **3,435** | 1,307 | 980 | **+1,148** |
| Mejor (optimista, tarifa media) | 300 | 29 | 7,129 | 4,666 | **11,795** | 2,859 | 3,225 | **+5,711** |

**Cómo se calcula cada columna.** *Restaurantes* = a·t^b con 300 a 12 meses y 1,200 a 24 (**supuesto**). *De paga* = restaurantes × los que rebasan los topes (16.8 %) × los que llegan a pagar según la curva, a 225 (Master Chef) y 1,099 (Chef Ejecutivo). *Suscripción* = de paga × precio. *Anuncios* = gratuitos × 2,050 visitas × 60 % con anuncio × tarifa por mil (baja 3.5, media 14); **antes del mes 9 es cero**. *Costos* = servidor del escalón (pro_2), almacenamiento, soporte (0.5 por gratuito, 60 por Master Chef) y comisión de tarjeta. *Conseguir clientes* = altas × 600 pesos (altas = nuevos de paga + bajas del 3 % mensual).

## 2. De cada 100 pesos que entran (mes 12)

| Concepto | Recomendado | Peor | Mejor |
|---|---|---|---|
| Servidor | 13.6 | 27.1 | 4 |
| Almacenamiento y fotos | 0.5 | 0.8 | 0.2 |
| Soporte | 20 | 15 | 16.3 |
| Comisión de cobro | 4 | 1.6 | 3.8 |
| Conseguir clientes (reponer bajas y altas) | 28.5 | 11.5 | 27.3 |
| Sueldos | 0 | 0 | 0 |
| Impuestos | 0 | 0 | 0 |
| **Se queda (margen después de captación)** | **33.4** | 44 | 48.4 |

**En régimen con 1,000 restaurantes (curva media):** 11,452 pesos de ingresos al mes (7,273 de suscripción y 4,178 de anuncios).

## 3. Lo que este chequeo encontró

- **Una cifra que sonó rara tenía explicación y se corrigió:** el «10,000 del mes 12 en el mejor caso» era de la versión anterior (más negocios grandes y pagos más altos). Con la segmentación de Calvin, sólo 0.2 % de los registrados es Chef Ejecutivo y el mejor caso del mes 12 es +8,936.
- **La suma cuadra:** ingresos − costos = margen de operación; margen de operación − conseguir clientes − sueldos = margen después de captación (prueba automática).
- **Qué no incluye:** sueldos (0), impuestos (0) ni ningún gasto de ventas más allá de los 600 pesos por cliente de paga; **bajas y captación no tienen dato**.
