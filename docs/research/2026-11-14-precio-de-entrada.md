# Precio de Master Chef: qué decide el modelo y qué decide el piloto

**Fecha:** 14 de noviembre de 2026 (ronda 4) · **Generado por `2026-11-14-corre-escenarios.mjs`**: las tablas salen del modelo (`precio_sensibilidad` en el JSON de resultados), no están escritas a mano. Evidencia externa al final, con lo que **no** pude verificar marcado.

## Conclusiones

1. **El modelo no puede elegir entre 199, 225, 249 y 299: lo decide la prueba de tres precios del piloto.** La curva «media» se construyó con mediana 225 (el precio de Meniu Business) y el óptimo sale 234: **el modelo devuelve su supuesto** (conclusión circular de la versión anterior de este documento, retirada).
2. **225 es una decisión de posicionamiento de Calvin (quedar pegado a Meniu), no un resultado del modelo.** Con la mediana en 150 gana 199; en 300, 299; en 450, 299 (el óptimo continuo sube a 415).
3. **La dispersión de la curva (sigma) también cambia al ganador:** con sigma 0.3 gana 199; con 0.9, 299. De 199 a 249 el margen cae con sigma 0.3 (20,261 → 16,002) y sube con 0.9 (17,274 → 19,463).
4. **Con la curva supuesta, entre 199 y 249 el margen casi no cambia pero sí los pagantes** (199: 135 · 225: 116 · 249: 100): entrar barato compra clientes, no margen.
5. **No hay evidencia abierta fuerte de que entrar con un precio bajo y subir después convenga a un SaaS de restaurantes** (§3).

## 1. Margen de operación al mes según la mediana de la curva de pago (1,000 restaurantes, anuncios en marcha, sigma 0.6, techo 0.35)

| Mediana de la curva de pago (supuesto 225) | Margen a 199 | Margen a 225 | Margen a 249 | Margen a 299 | Gana entre los 4 | Óptimo continuo |
|---|---|---|---|---|---|---|
| 150 | 10,548 | 10,003 | 9,327 | 7,778 | **199** | 175 |
| 225 | 18,040 | 18,591 | 18,583 | 17,528 | **225** | 234 |
| 300 | 22,952 | 24,908 | 26,065 | 26,864 | **299** | 294 |
| 450 | 27,522 | 31,486 | 34,619 | 39,515 | **299** | 415 |

## 2. Margen según la dispersión de la curva (mediana 225)

| Sigma de la curva (supuesto 0.6) | Margen a 199 | Margen a 225 | Margen a 249 | Margen a 299 | Gana entre los 4 | Óptimo continuo |
|---|---|---|---|---|---|---|
| 0.3 | 20,261 | 18,591 | 16,002 | 10,130 | **199** | 189 |
| 0.45 | 18,795 | 18,591 | 17,711 | 14,793 | **199** | 205 |
| 0.6 | 18,040 | 18,591 | 18,583 | 17,528 | **225** | 234 |
| 0.9 | 17,274 | 18,591 | 19,463 | 20,476 | **299** | 343 |

**Qué resultado del piloto lleva a cada precio** (regla de decisión derivada de la primera tabla; «empate» = precios a menos de 1 % del mejor margen): si la mediana (el precio al que la mitad de los dueños dice que sí) sale cerca de 150 → 199; si sale cerca de 225 → 225 o 249; si sale cerca de 300 → 299; si sale cerca de 450 → 299 (el más alto de los candidatos: valdría probar uno mayor). La **dispersión** (qué tan distintos son los dueños) se lee del mismo piloto: con sigma baja gana el precio más bajo y con sigma alta, el más alto (tabla 2).

**Prueba del piloto:** tres grupos de 10 restaurantes en el límite (199, 249, 299 o el que corresponda) más la escalera de precios de Van Westendorp; se mide cuántos aceptan y a los 6 meses cuántos se quedan en cada grupo.

## 3. Evidencia abierta sobre «entrar barato y subir» (poca, y no es de restaurantes)

| Fuente | Qué es | Qué dice | Qué tan firme |
|---|---|---|---|
| Kanuri y Andrews (2019), estudio citado por [Nieman Lab, 15-jul-2019](https://www.niemanlab.org/2019/07/nearly-7000-people-threatened-to-cancel-their-newspaper-subscriptions-heres-what-got-them-to-stay/) | Periódico de EE. UU., 6,919 amenazas de cancelar, enero de 2010 a marzo de 2013 | Un descuento temporal tras una falla **reduce** las renovaciones al volver el precio; recordar el precio completo ayuda; subir de a poco conviene más que saltar de 0.50 a 10 dólares a la semana | **Leí la nota, no el estudio** (DOI 10.1177/0022242919859325); un solo periódico; no es SaaS |
| Datta, Foubert y Van Heerde (2015), *Journal of Marketing Research* | Televisión digital | Los clientes que entraron por prueba gratis valen menos que los regulares | Sólo el resumen de un buscador; no leí el artículo |
| Netflix, enero de 2016 | Fin del precio congelado | Netflix esperaba «sólo un poco más de cancelaciones»; UBS estimó 3–4 % | **Pronóstico**, no resultado medido |
| Mather Economics (benchmarks en un blog) | Suscripciones de medios | Elasticidad al precio de entrada de −1.0 a −2.0; 16 % de cancelaciones en la primera renovación | De la propia consultora, **sin verificar** |
| Gardete, Schmitt y Stahl (2025) | Documento de trabajo | Los que entraron con promoción consumen más tras subir el precio | **La URL dio 404; no se usa** |

**Opinión de blog (marcada):** artículos de práctica dicen que comunicar el valor reduce las bajas al subir; sin datos propios, no se usan.

## 4. Si algún día se enciende Chef Ejecutivo
Un negocio de 101 a 250 personas tiene unas 36 a 125 cuentas de personal en el modelo y el tope técnico es de **50 cuentas activas por restaurante** (T-1.6): habría que subirlo antes de vender ese plan (cambio de código, no de este informe). Hoy está apagado por decisión de Calvin (17-nov).

## 5. Datos por conseguir
- La curva de pago real (prueba de precio del piloto, tres grupos).
- Si los que entraron más barato se van más al subir (mismo grupo medido a los 6 meses).
- Los artículos originales de Kanuri y Andrews y de Datta, Foubert y Van Heerde.
