# ¿Entrar con un precio bajo para captar y subirlo después?

**Fecha:** 14 de noviembre de 2026 · Evidencia abierta buscada hoy; **lo que no pude verificar en la fuente original está marcado**. Cifras del modelo: [`2026-11-14-modelo-de-escenarios.md`](2026-11-14-modelo-de-escenarios.md).

## Conclusiones

1. **No hay evidencia abierta fuerte de que un precio de entrada bajo y una subida después convengan a un SaaS de restaurantes**; lo más cercano son suscripciones de periódicos y de televisión, no software de restaurante.
2. **Lo que sí aparece en la evidencia: el salto grande molesta, el escalonado y el recordatorio del precio completo ayudan** (Kanuri y Andrews, periódico de EE. UU., 6,919 amenazas de cancelar entre 2010 y 2013, vía nota de Nieman Lab).
3. **En el modelo, el precio de Master Chef casi no mueve el margen (199 → 8,048 a 225 → 8,052 a 249, pesos al mes con 1,000 restaurantes, curva media) pero sí los pagantes (33 → 29 → 25):** entrar a 199 capta ≈ 5 pagantes más de cada 1,000 registrados, y subir de 199 a 225 después es +13 %; con el margen plano, la ganancia de entrar barato es captación, no dinero.
4. **Recomendación para Carta: entrar a 225 con el gratuito de Chef como «precio bajo»** (ya es el gancho) y **no** regalar un descuento temporal de paga; si se quiere un precio de lanzamiento, hacerlo explícito con fecha («precio de fundadores hasta X») y subir en escalones pequeños.
5. **Qué medir en el piloto:** conversión de gratuito a paga con 3 grupos (199, 225, 249) y, a los 6 meses, cuántos se quedan en cada uno.

## Evidencia

| Fuente | Qué es | Qué dice | Qué tan firme |
|---|---|---|---|
| Kanuri y Andrews (2019), estudio citado por [Nieman Lab, 15-jul-2019](https://www.niemanlab.org/2019/07/nearly-7000-people-threatened-to-cancel-their-newspaper-subscriptions-heres-what-got-them-to-stay/) (Laura Hazard Owen) | Periódico de EE. UU. (más de 500,000 de circulación), enero de 2010 a marzo de 2013, 6,919 amenazas de cancelar | Un descuento temporal tras una falla **reduce** las renovaciones cuando el precio vuelve; recordar el precio completo y extender el plazo ayudan; «los periódicos que suben el precio de a poco ... tienen más probabilidad de beneficiarse» que quienes pasan de 0.50 a 10 dólares a la semana | **Revisé la nota, no el estudio** (DOI 10.1177/0022242919859325); muestra de un solo periódico; no es SaaS |
| Datta, Foubert y Van Heerde (2015), *Journal of Marketing Research* | Televisión digital; modo de adquisición y retención | Los clientes que entraron por prueba gratis valen **menos** que los regulares | Sólo vi el resumen de un buscador; no leí el artículo |
| Mather Economics (benchmarks de blog) | Suscripciones de medios | Elasticidad al precio de entrada entre −1.0 y −2.0; al primer renovar a precio completo, muy baja; cancelaciones del 16 % en la primera renovación | Fuente de la propia consultora, **sin verificar** |
| Netflix, enero de 2016 | Fin del precio congelado de los clientes de 2 años | Netflix dijo esperar «sólo un poco más de cancelaciones»; UBS estimó 3–4 % | Es **pronóstico**, no resultado medido |
| Gardete, Schmitt y Stahl (2025) | Documento de trabajo, editor de noticias en línea | Quienes entraron con promoción consumen más tras una subida | **La URL dio 404; no lo leí**: no se usa para ninguna cifra |

**Opinión de blog (marcada como tal):** artículos de prácticas (Subi, appsops) dicen que comunicar el valor reduce las bajas al subir; sin datos propios, no se usan.

## Casos con cifras (modelo, 1,000 restaurantes registrados, curva media)

| Precio de Master Chef | Pagantes | Ingreso de paga al mes | Margen de operación al mes |
|---|---|---|---|
| 199 | 33.3 | 6,625 | 7,904 |
| **225** | 28.6 | 6,445 | 8,048 |
| 249 | 24.8 | 6,176 | 8,052 |

**Lectura:** el margen es plano; **un precio bajo de entrada compra clientes, no margen.** Si luego se sube de 199 a 225 (+13 %), cada cliente que se va a causa de la subida cuesta 3 % mensual de bajas más el costo de reponerlo (600 pesos supuestos por alta): **ejemplo ilustrativo (el 5 % es un supuesto, sin dato):** si al subir se fuera un 5 % extra de 33 pagantes, serían ≈ 1.7 clientes, ≈ 1,000 pesos de reposición una sola vez.

## Datos por conseguir
- La curva de pago real (prueba de precio del piloto, tres grupos).
- Si en el piloto los que entraron a 199 se van más al subir (mismo grupo medido a los 6 meses).
- El artículo original de Kanuri y Andrews (DOI arriba) y el de Datta, Foubert y Van Heerde para confirmar las cifras.
