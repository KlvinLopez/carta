# Banderas de operación: qué se mira, cuándo se avisa y qué cuesta el siguiente paso

**Fecha:** 14 de noviembre de 2026 · generado por `2026-11-14-banderas.mjs` desde el modelo · [JSON](2026-11-14-banderas-de-operacion.json). **Nada de esto está medido en Railway todavía:** los umbrales son criterio de operación (supuesto) y las capacidades salen del simulador (±2×).

## Conclusiones

1. **Seis banderas bastan:** procesador, disco, conexiones, memoria, costo por restaurante y costos sobre ingresos.
2. **El primer muro es el procesador:** con 1,000 restaurantes y curva media el modelo lo pone en ≈ 69 % de procesador (el escalón Pro de 2 procesos se llena al 70 %, el tope de diseño: por eso la tabla avisa en 50 % y actúa en 70 %); el escalón de hoy (Hobby, sondeo) cabe ≈ 148 restaurantes típicos.
3. **Siguiente paso, costo:** de Hobby a Pro 2 procesos sube 12 USD base por mes (8.1 → 20); entra hacia el mes 11 de la proyección recomendada (adopción supuesta).
4. **Más de ≈ 2,030 restaurantes registrados exige otra arquitectura:** de ahí en adelante todo es extrapolación sin medir.
5. **Dos banderas ya se pueden medir con el primer cliente:** costo por restaurante y costos sobre ingresos.

## Banderas

| Bandera | Qué se mide y dónde | Aviso | Acción | Qué hacer | Estado de la medición |
|---|---|---|---|---|---|
| Procesador (p95 de la hora pico) | p95 de CPU del servicio `api` en la hora pico (panel de Railway; hoy sin alerta) | 50 % | 70 % | más procesos o escalón mayor | no medido en Railway: el 98 % del modelo es simulador (±2×) |
| Disco del volumen | uso del volumen de PostgreSQL (`pg_database_size` + panel de Railway) | 60 % | 80 % | archivar lo antiguo o pasar a Pro (50 GB) | no medido; 7.1–8.5 KB por visita salen de una medición local |
| Conexiones abiertas (eventos) | conexiones SSE abiertas por worker (log de `/op/eventos` y `/p/sesion/eventos`; **aún no se cuentan**) | 60 % | 80 % | la pila de 8 procesos llega a 10,000: repetir la pila o cambiar de nube | no medido; las 10,000 son un tope documentado, no una prueba |
| Memoria | RSS por proceso (panel de Railway) | 70 % | 85 % | más memoria por proceso o menos procesos por servicio | no medido |
| Costo por restaurante (pesos al mes) | factura de Railway ÷ restaurantes activos del mes | 8 % | 15 % | revisar escalón, soporte y fotos | se puede medir desde el primer mes con restaurantes |
| Costos sobre ingresos (%) | factura + soporte ÷ ingresos del mes | 70 % | 90 % | subir el precio, acotar el soporte o empezar los anuncios | se puede medir desde el primer mes con ingresos |

*El costo por restaurante se avisa/actúa en pesos al mes (8 y 15), no en porcentaje.*

## Escalones de servidor y costo del paso

| Escalón | Capacidad (restaurantes típicos, simulador) | Disco | USD base al mes | Sube vs el anterior | Entra en el mes (recomendado) |
|---|---|---|---|---|---|
| Hoy: sondeo, 2 procesos, Hobby | 148 | 5 GB | 8.1 | +0 | no entra en 36 meses |
| Con eventos, 2 procesos, Hobby | 1,064 | 5 GB | 8.1 | +0 | 1 |
| Con eventos, 2 procesos, Pro | 1,064 | 50 GB | 20 | +11.9 | 11 |
| Con eventos, 4 procesos, Pro | 1,896 | 50 GB | 23 | +3 | 23 |
| Con eventos, 8 procesos, Pro | 2,116 | 50 GB | 30 | +7 | 30 |

**Datos por conseguir:** p95 real de CPU con tráfico de piloto, bytes por visita real, conexiones SSE por restaurante, y la factura real de Railway del primer mes.
