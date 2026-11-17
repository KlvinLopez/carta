# Cómo gana dinero Carta y cuándo le paga a su fundador

**Fecha:** 17 de noviembre de 2026 · **Generado por `2026-11-17-como-gana-dinero.mjs`** desde el modelo ([JSON](2026-11-17-como-gana-dinero-carta.json)). **La v1 no cobra ni tiene planes.** Lo que va marcado «fuera de la v1» sólo se calcula para ver el tamaño. **No se venden datos (decisión de Calvin, 14-nov) ni se guardan datos personales del comensal (regla 10).**

**Postura de Calvin (17-nov):** «no estamos considerando un salario para mí todavía, pero eventualmente buscaré ganar de esto… quiero que me ayudes a darle forma para poder ganar dinero de eso también». Su investigación (una conversación con un asistente, 17 de noviembre, sin versión ni enlaces) se trata como **secundaria**: toda cifra de plataformas se verificó o se marca «no verificada» (§4).

## Conclusiones

1. **Hoy Carta no le paga a su fundador: `sueldo_fundador` está en 0 y no hay valor por omisión inventado.** La tabla de §1 da niveles de referencia (múltiplos del salario mínimo general: 315.04 pesos por día en 2026 [fuente]) y, para cada uno, cuántos restaurantes y clientes de paga hacen falta.
2. **Con un sueldo de 28,732 pesos al mes (3 salarios mínimos), el margen después de captación lo cubre con 1,660 restaurantes registrados y 192 de paga en el recomendado (mes 32 de la proyección); en el peor, 14,010; en el mejor, 490.**
3. **De los cinco modelos de ingreso, dos están en la v1 (suscripción y anuncios) y tres no:** visibilidad pagada (cabe después de la Fase 3 con una spec nueva) y comisión y pago del comensal (fuera de la v1: exigen pagos o cuenta del comensal).
4. **El tamaño por restaurante al mes (supuestos y rango en §2):** suscripción 225 por restaurante de paga; anuncios 4.3 a 45.5 por restaurante gratuito; **comisión por transacción (fuera de la v1) 322 por restaurante de 0 a 10 personas con supuestos**, que es el modelo de mayor tamaño y el que la v1 excluye.
5. **Secuencia recomendada:** piloto = suscripción; después de la Fase 3 = anuncios y, con spec nueva, visibilidad pagada; comisión y pago del comensal sólo con ADR y spec de una v2 (§3).

## 1. Sueldo del fundador en el modelo

`sueldo_fundador` es un parámetro deslizable (pesos al mes): **vale 0 por omisión y no se inventa un valor**; Calvin lo elige. `sueldo(config, s, monto)` y `tablaSueldos(config, s)` lo calculan por escenario. **Niveles de referencia:** múltiplos del salario mínimo general de 315.04 pesos por día (Diario Oficial de la Federación del 9 de diciembre de 2025 (CONASAMI), vigente desde el 1 de enero de 2026; «con lo que será de 315.04 pesos por jornada diaria de trabajo») × 30.4 días; no son una recomendación.

| Sueldo al mes | Veces el mínimo | Escenario | Restaurantes registrados necesarios | Clientes de paga | Mes en que el margen después de captación lo cubre | Margen después de sueldo: 1,000 restaurantes · mes 12 · mes 24 |
|---|---|---|---|---|---|---|
| 9,577 | 1 | recomendado | 550 | 64 | mes 21 | +8,361 · −7,691 · +5,432 |
|  |  | peor | 4,940 (exige otra arquitectura) | 116 | mes 57 | −7,609 · −9,927 · −8,564 |
|  |  | mejor | 165 | 63 | mes 14 | +49,207 · −2,491 · +39,576 |
| 28,732 | 3 | recomendado | 1,660 (exige otra arquitectura) | 192 | mes 32 | −10,794 · −26,846 · −13,723 |
|  |  | peor | 14,010 (exige otra arquitectura) | 328 | más de 60 meses | −26,764 · −29,082 · −27,719 |
|  |  | mejor | 490 | 187 | mes 20 | +30,052 · −21,646 · +20,421 |
| 47,886 | 5 | recomendado | 2,680 (exige otra arquitectura) | 311 | mes 40 | −29,948 · −46,000 · −32,877 |
|  |  | peor | más de 20,000 | — | más de 60 meses | −45,918 · −48,236 · −46,873 |
|  |  | mejor | 830 (exige otra arquitectura) | 317 | mes 24 | +10,898 · −40,800 · +1,267 |
| 95,772 | 10 | recomendado | 5,360 (exige otra arquitectura) | 621 | mes 55 | −77,834 · −93,886 · −80,763 |
|  |  | peor | más de 20,000 | — | más de 60 meses | −93,804 · −96,122 · −94,759 |
|  |  | mejor | 1,630 (exige otra arquitectura) | 623 | mes 32 | −36,988 · −88,686 · −46,619 |

**Sin sueldo** (referencia): margen después de captación con 1,000 restaurantes +17,938 (recomendado), +1,968 (peor), +58,784 (mejor). El piso de verdad no cubre ningún sueldo.

**Sigue sin modelar:** impuestos (ISR e IVA); contabilidad y trámites; seguridad social y prestaciones; costos de ventas más allá del costo de conseguir un cliente de paga. El margen es antes de captación, sueldos e impuestos; un sueldo real cuesta más que el sueldo bruto.

## 2. Mapa de modelos de ingreso aplicados a Carta

Cada modelo con a quién se le cobra, el potencial en pesos al mes (con supuestos y rango), lo que exige y cuándo cabría. **Los potenciales de visibilidad, comisión y pago del comensal son supuestos sin dato** (parámetros con rango en `2026-11-14-parametros.json`): sirven para ver el tamaño, no como proyección.

### 2.1 Suscripción del restaurante (Master Chef) (vigente)

- **A quién se le cobra:** el restaurante que pasa de los topes de Chef.
- **Potencial (pesos al mes):** 225 por restaurante de paga (deja 149); por restaurante registrado 26.1 (rango 5.3 a 86).
- **Supuestos:** curva de pago (mediana, sigma y techo) sin dato; parte que rebasa los topes de Chef (modelo de mesas y cuentas).
- **Qué exige:** nada nuevo: es la v1 (sin pagos del restaurante dentro de Carta si se cobra fuera).
- **Cuándo cabría:** piloto: se prueba el precio con tres grupos.

### 2.2 Anuncios al comensal del plan gratuito (no personalizados) (vigente)

- **A quién se le cobra:** el anunciante, a través de una red de anuncios (hoy se supone AdSense); anunciantes típicos: marcas de bebidas y consumo, bancos y comercios locales (por definir).
- **Potencial (pesos al mes):** por restaurante gratuito 4.3 (tarifa baja) · 17.2 (media) · 45.5 (alta).
- **Supuestos:** tarifa por mil visitas, visitas con la app, parte con anuncio y que la red apruebe el sitio.
- **Qué exige:** ADR, abrir la política de seguridad del sitio, aviso de privacidad y aprobación de la red; sin anuncios personalizados (regla 10).
- **Cuándo cabría:** hacia el mes 9 (supuesto) o después de la Fase 3.

### 2.3 Visibilidad pagada dentro de Carta (patrocinio de marca o proveedor en la carta, platillo destacado)

- **A quién se le cobra:** la marca o el proveedor (cerveza, refrescos, insumos) que patrocina un espacio en la carta del restaurante; o el restaurante que destaca un platillo.
- **Potencial (pesos al mes):** por restaurante gratuito 7.5 (rango 1 a 75).
- **Supuestos:** parte de restaurantes con patrocinio y cuota mensual: SUPUESTOS sin dato (referencia de forma: Booking cobra 2–8 % más por visibilidad, por verificar).
- **Qué exige:** spec nueva (alcance), regla de qué puede patrocinarse sin engañar al comensal; no toca la v1 ni guarda datos del comensal.
- **Cuándo cabría:** después de la Fase 3, con restaurantes reales y una prueba de 3 patrocinadores.

### 2.4 Comisión por transacción (FUERA de la v1)

- **A quién se le cobra:** el restaurante, sobre lo que se pida o pague por Carta.
- **Potencial (pesos al mes):** 0 a 10 personas 322.4 (rango 53.7 a 967.1); 11 a 50 personas 2,212.8 (rango 368.8 a 6,638.3).
- **Supuestos:** ventas promedio de la clase 722511 (INEGI 2023, promedios no medianas); parte que pasaría por Carta y tasa: supuestos sin dato.
- **Qué exige:** cobrar o procesar pagos: contradice «Qué NO construir» y la v1; ADR nuevo y spec; puede exigir regulación financiera (por verificar con un abogado).
- **Cuándo cabría:** no antes de una v2; sólo se calcula para ver el tamaño.

### 2.5 Pago del comensal por quitar anuncios o por funciones propias (FUERA de la v1)

- **A quién se le cobra:** el comensal (suscripción tipo «Carta+»).
- **Potencial (pesos al mes):** por restaurante 495.5 (rango 165.2 a 1,981.9) (techo, repartido entre los restaurantes que visita cada comensal).
- **Supuestos:** comensales únicos al mes, conversión y precio (29 pesos del prototipo): supuestos sin dato.
- **Qué exige:** cuenta o perfil del comensal: contradice «Qué NO construir» y la regla 10 (sin datos personales del comensal en el servidor); ADR y spec.
- **Cuándo cabría:** no antes de una v2.

## 3. Secuencia recomendada

| Modelo | Cuándo | Qué exige | Riesgo o dato que falta |
|---|---|---|---|
| Suscripción del restaurante (Master Chef) | Piloto | Nada nuevo: la v1 | La curva de pago no tiene dato: la prueba de tres precios del piloto la mide |
| Anuncios al comensal del plan gratuito | Después de la Fase 3 (hacia el mes 9, supuesto) | ADR, abrir la política de seguridad, aviso de privacidad y aprobación de la red de anuncios; sin anuncios personalizados | Tarifa, parte con anuncio y aprobación de la red sin dato: una prueba con 3 restaurantes |
| Visibilidad pagada dentro de Carta | Spec nueva, después de la Fase 3 y con restaurantes reales | Spec: qué se puede patrocinar y cómo se distingue de la carta; sin datos del comensal | No hay dato de cuánto pagaría un patrocinador: prueba con 3 patrocinadores |
| Comisión por transacción | Spec nueva y ADR: no antes de una v2 (hoy fuera de la v1) | Cobrar o procesar pagos: contradice «Qué NO construir»; posible regulación financiera (verificar con un abogado) | Cambia la naturaleza del producto y su regulación |
| Pago del comensal | Spec nueva y ADR: no antes de una v2 (hoy fuera de la v1) | Cuenta o perfil del comensal: contradice la regla 10 y «Qué NO construir» | Rompe el principio de comensal anónimo |

**Sin vender datos y sin datos personales del comensal en el servidor** en ninguna fila.

## 4. Plataformas de referencia (verificadas en fuente primaria o marcadas)

- **Airbnb:** esquema compartido: la mayoría de los anfitriones paga 3 %; esquema único: la mayoría paga 15.5 % (el texto dice que el compartido «se está retirando»). Fuente: https://www.airbnb.com/help/article/63 (sin fecha en la página; consultada el 2026-11-17).
- **YouTube:** 55 % de los ingresos netos por anuncios de los videos en la página de reproducción (en Shorts, 45 % de lo asignado al fondo de creadores). Fuente: https://support.google.com/youtube/answer/72902 (sin fecha en la página (©2026 Google); consultada el 2026-11-17).
- **Meta:** 97.6 % de los ingresos viene de publicidad en el año fiscal 2025: cálculo propio sobre el 10-K (196,175 de 200,966 millones de USD); el 10-K dice que genera «substantially all» de sus ingresos vendiendo anuncios. Fuente: https://www.sec.gov/Archives/edgar/data/1326801/000162828026003942/meta-20251231.htm (10-K del año fiscal terminado el 31-dic-2025; consultada el 2026-11-17).
- **Uber:** la tarifa de servicio al conductor ya no es fija: varía por viaje y la meta es acercarse a 25 %. Fuente: https://help.uber.com/en/driving-and-delivering/article/understanding-ubers-variable-service-fee?nodeId=7448ffcc-ab98-4a32-b7fc-e9c17a58bb41 (sin fecha en la página; consultada el 2026-11-17).
- **Booking.com:** alrededor de 15 % de comisión estándar y 2–8 % más por visibilidad (Preferente, Genius). **No verificada** (las páginas oficiales de partner.booking.com devolvieron 403 y las cifras que circulan vienen de blogs y foros; el dato primario es el contrato o el extranet de cada alojamiento).
- **Spotify:** alrededor de 70 % de los ingresos a titulares de derechos. **No verificada** (la fuente primaria más cercana (Spotify Newsroom, 11 de mayo de 2026) dice «cerca de dos tercios»; el 70 % sólo aparece en prensa).
- **DiDi:** alrededor de 20 % de comisión al conductor. **No verificada** (la página de DiDi México no publica un porcentaje; el 16 % que aparece es IVA sobre la tarifa de servicio, no la comisión).

**Lectura (de la investigación de Calvin, como hipótesis):** en servicios físicos y caros las plataformas cobran **comisión por transacción** al que gana; en servicios digitales masivos, **gratuito con anuncios más suscripción**; además cobran por **visibilidad** dentro de la plataforma. Carta v1 usa lo segundo (suscripción y anuncios); la comisión exigiría procesar pagos, que la v1 no hace.

## 5. Datos por conseguir
- **Curva de pago y precio de Master Chef:** prueba de tres precios del piloto.
- **Tarifa de anuncios, parte con anuncio y aprobación de la red:** prueba pequeña con 3 restaurantes.
- **Cuánto pagaría un patrocinador y qué parte de restaurantes aceptaría:** prueba con 3 patrocinadores después de la Fase 3.
- **Ventas, ticket y parte que pasaría por Carta:** carta y ventas reales de los negocios del piloto (el dato del INEGI es un promedio de la clase 722511).
- **Sueldo que Calvin quiere:** lo elige Calvin; el modelo lo resta del margen.
