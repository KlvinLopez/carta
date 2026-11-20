# Cuánto cuesta un platillo del plan gratuito (generado; no editar a mano)

Generado por `2026-11-17-costo-de-platillo.mjs` desde `2026-11-14-parametros.json` (medidas de `2026-11-17-platillo-medir.py` en PostgreSQL local, con textos y fotos sintéticos del repositorio). Pregunta de Calvin (17-nov): «si aumento de 50 a 150, ¿el disco duro o el procesador no se acaban?».

## Conclusión

De 50 a 150 platillos (con la mezcla de gratuitos y de paga fija): el disco de la base casi no se mueve (caben 0.2 % menos restaurantes: 557 bytes por platillo); el procesador pierde 3.8 % con el sondeo de hoy y hasta 19.3 % con avisos (cota alta: se supone que el menú se arma cada 30 s en la hora pico, de 7 a 16 ms); NINGUNO de los dos se acaba por el tope: el cuello de botella sigue siendo disco (182 restaurantes con avisos y 173 con el sondeo, con el historial a 30 días). Lo que sí crece es el almacenamiento de fotos en R2 (de 0.12 a 0.37 GB por restaurante, sobre todo por los originales, que son un supuesto; pasarse de lo gratis cuesta 0.10 pesos al mes por restaurante) y el menú que baja el teléfono (de 38 a 113 KB); y el tope cambia cuántos negocios pasan a pagar (de 137 a 116 de paga por cada 1,000).

## Qué es medido y qué es supuesto

| Concepto | Valor | Origen |
|---|---|---|
| Fila de `platillo` con sus índices | 557 bytes (rango del modelo 557 a 1,775) | medido (marginal con 10,000 filas) |
| Foto procesada (miniatura + detalle) | 100 KB (rango 30 a 250) | supuesto: las fotos de prueba son pequeñas y sintéticas; medir con 10 fotos reales del piloto |
| Foto original (bucket privado, AC-17.2) | 3 MB (rango 1 a 8) | supuesto: foto de teléfono; medir con las del piloto |
| Parte de platillos con foto | 80 % | supuesto: medir en el piloto |
| JSON del menú por platillo | 751 bytes | medido |
| Armar el menú | 2.4 ms + 0.09 ms por platillo | medido en un contenedor de nube, no en Railway |
| R2 gratis | 10 GB | documento del repositorio (ADR-015) |

## Por tope

| Platillos | Base por restaurante | Fotos en R2 por restaurante | Gratuitos solos con foto que caben en R2 gratis (con la mezcla de paga: menos) | Menú (JSON) | Armar el menú | Disco (restaurantes, con avisos) | Procesador (con avisos / con sondeo) | Cuello |
|---|---|---|---|---|---|---|---|---|
| 50 | 27.9 KB | 0.12 GB (0.04 a 0.33) | 80 (30 a 242) | 38 KB | 7 ms | 182 | 1,091 / 180 | disco / procesador |
| 80 | 44.6 KB | 0.2 GB (0.07 a 0.53) | 50 (18 a 151) | 60 KB | 9.8 ms | 182 | 1,018 / 177 | disco / procesador |
| 100 | 55.7 KB | 0.25 GB (0.08 a 0.66) | 40 (15 a 121) | 75 KB | 11.6 ms | 182 | 974 / 176 | disco / procesador |
| 150 | 83.6 KB | 0.37 GB (0.12 a 0.99) | 26 (10 a 80) | 113 KB | 16.2 ms | 182 | 880 / 173 | disco / procesador |

Pasarse de lo gratis de R2 cuesta 0.03 pesos al mes por restaurante con 50 platillos y 0.1 con 150.

## Cobertura y negocios de paga

| Platillos | Caben, cota baja | Caben, cota alta | De 0 a 5 personas dentro de Chef (baja a alta) | De paga por cada 1,000 |
|---|---|---|---|---|
| 50 | 15 % | 63 % | 7 % a 31 % | 137 |
| 80 | 25 % | 89 % | 12 % a 44 % | 121 |
| 100 | 29 % | 96 % | 14 % a 47 % | 117 |
| 150 | 52 % | 98 % | 26 % a 48 % | 116 |

Las dos cotas son muestras de sesgo opuesto (sitios propios: 56 cartas largas; reparto: 148 cartas cortas) y no se sabe cuál es la real. La capacidad se calcula con la mezcla de gratuitos y de paga **fija** para aislar el efecto del tope; el efecto del tope sobre esa mezcla es la última columna.

## Supuestos del cálculo

- Procesador con avisos: cota alta, se supone que el menú se arma de nuevo cada 30 s en la hora pico.
- Fotos reales y originales: supuestos con rango; las fotos procesadas medidas son sintéticas.
