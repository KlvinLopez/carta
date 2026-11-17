# Una sola carga para el gratuito: antes → después (generado; no editar a mano)

Generado por `2026-11-17-carga-unica.mjs`. **Qué cambió (ronda 11):** un restaurante gratuito tiene UNA definición de carga, la de sus topes, y la usan por igual «¿Qué nos limita?», los costos, la bolsa de Calvin, los escalones, el margen, el sueldo y la meta de 12 meses. Antes, los costos usaban un «gratuito típico» de 1,800 visitas al mes y «¿Qué nos limita?» la carga de los topes. **No cambian precios, topes ni escenarios.**

**Definición:** Un gratuito carga mesas del tope × 180 visitas al mes. El 180 sale del simulador: 1800 visitas al mes con 10 mesas [documento: planes-y-costo §0]; es un SUPUESTO sin medir.

**¿Tope entero o distribución de mesas?** La carga de un Chef es el tope entero × 180 (cota alta: todos los gratuitos tienen 6 mesas activas). No hay datos para usar la distribución de mesas dentro del tope: el modelo de mesas y cuentas (dispersión lognormal, supuesto) sólo da la parte de negocios que cabe dentro, no cuántas mesas usa cada uno. La sensibilidad con 90 visitas por mesa equivale a un negocio promedio con la mitad del tope.

## 1. Antes → después

*Antes* = gratuito típico (comparación, ya no vigente). *Después* = gratuito por topes (vigente).

| Cifra | Antes (típico, 1,800 visitas) | Después (topes, 1,080 visitas) |
|---|---|---|
| Margen de operación con 1,000 restaurantes, recomendado (pesos al mes) | +20,024 | +18,591 |
| Margen de operación con 1,000 restaurantes, peor (pesos al mes) | +2,390 | +2,388 |
| Margen de operación con 1,000 restaurantes, mejor (pesos al mes) | +65,664 | +61,364 |
| Margen de operación con 1,000 restaurantes, estrés (piso de verdad) (pesos al mes) | −1,109 | −1,532 |
| Anuncios por restaurante gratuito (pesos al mes, tarifa media) | 4.31 | 2.58 |
| Costo por restaurante gratuito con soporte (pesos al mes) | 1.19 | 1.03 |
| Gratuitos que sostiene cada cliente de paga, sin anuncios | 125 | 144 |
| Mes 12 con 300 restaurantes: ingresos (pesos) | 8,964 | 8,507 |
| Mes 12 con 300 restaurantes: margen de operación (pesos) | +5,749 | +5,292 |
| Mes 12 con 300 restaurantes: margen después de captación (pesos) | +1,886 | +1,428 |
| Sueldo de 1 × salario mínimo (9,577): restaurantes necesarios (recomendado) | 550 (mes 21) | 600 (mes 22) |
| Sueldo de 3 × salario mínimo (28,732): restaurantes necesarios (recomendado) | 1,660 (mes 32) | 1,730 (mes 34) |
| Sueldo de 5 × salario mínimo (47,886): restaurantes necesarios (recomendado) | 2,680 (mes 40) | 2,930 (mes 42) |
| Sueldo de 10 × salario mínimo (95,772): restaurantes necesarios (recomendado) | 5,360 (mes 55) | 5,860 (mes 58) |
| Bolsa de 500 pesos al mes: restaurantes gratuitos que caben (centro; rango) | 279 (94 a 400) | 405 (95 a 505) |
| Bolsa de 1,000 pesos al mes: restaurantes gratuitos que caben (centro; rango) | 811 (246 a 1,896) | 809 (248 a 2,116) |
| Bolsa de 2,000 pesos al mes: restaurantes gratuitos que caben (centro; rango) | 1,896 (492 a 2,116) | 2,048 (505 a 2,116) |
| Bolsa de 5,000 pesos al mes: restaurantes gratuitos que caben (centro; rango) | 2,116 (1,391 a 2,116) | 2,116 (1,421 a 2,116) |
| Gratuitos que caben con el sondeo de hoy, sólo gratuitos (bolsa) | 148 | 246 |
| Restaurantes registrados que caben, con avisos (historial 30 días) | 279 | 182 |
| Restaurantes registrados que caben, con sondeo (historial 30 días) | 148 | 173 |
| Restaurantes registrados que caben, sin purga | 23 | 41 |

**Por qué:**
- **Margen:** El gratuito de los topes (6 mesas) carga 1,080 visitas al mes y no 1,800: 60 % del típico. Eso baja el costo de servidor y disco por gratuito (1.19 → 1.03 pesos con soporte) y también sus anuncios (4.31 → 2.58 pesos), porque las visitas con la app son proporcionales; las fotos del tope de platillos suben el costo de R2 (0.05 → 0.37 GB por gratuito, supuesto).
- **Gratuitos que sostiene cada pagante:** Sin anuncios cada cliente de paga sostiene 125 → 144 gratuitos: el servidor y el disco de un gratuito son proporcionales a su carga (60 % del típico), el soporte (0.5 pesos, supuesto) no, y la suscripción no cambia. Con anuncios el gratuito se paga solo en los dos casos.
- **Mes 12:** Con 300 restaurantes (misma adopción): ingresos 8,964 → 8,507 (menos anuncios por gratuito), margen de operación 5,749 → 5,292.
- **Sueldo:** Para 1 salario mínimo hacen falta 550 → 600 restaurantes (mes 21 → 22): el margen por restaurante cambia con el costo y los anuncios de cada gratuito.
- **Bolsa:** Con la bolsa de 1,000 pesos caben 811 → 809 gratuitos: sin anuncios, el soporte por gratuito (0.5 pesos, supuesto, no depende de la carga) domina su costo, así que casi no cambia.
- **Capacidad:** Ver `composicion_del_disco`: el promedio incluye a los de paga con 12 meses.

## 2. Sensibilidad al supuesto que ahora mueve todo: visitas por mesa al mes

| Visitas por mesa al mes | Visitas del gratuito al mes | Margen recomendado, 1,000 restaurantes | Margen peor | Gratuitos que sostiene un pagante (sin anuncios) | Anuncios por gratuito | Caben con avisos / con sondeo / sin purga | Bolsa de 1,000 pesos |
|---|---|---|---|---|---|---|---|
| 90 | 540 | +17,505 | +2,449 | 171 | 1.29 | 215 / 215 / 71 | 985 |
| 180 | 1,080 | +18,591 | +2,388 | 144 | 2.58 | 182 / 173 / 41 | 809 |
| 360 | 2,160 | +20,666 | +2,170 | 112 | 5.17 | 138 / 106 / 22 | 689 |

Más visitas por mesa dejan más anuncios y más margen, pero llenan antes el disco y el procesador (caben menos restaurantes).

## 3. Datos por conseguir
- Visitas por mesa al mes (eventos `scan` por `mesa_id` del piloto): mide el 180.
- Mesas activas por restaurante al alta (tabla `mesa`, sin datos personales): mide cuántos usan el tope entero y deja usar la distribución.
