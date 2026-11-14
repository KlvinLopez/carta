# Lo que paga un restaurante: su operación, su software y cuánto vale Carta para cada tamaño

**Fecha:** 14 de noviembre de 2026 · **Rama:** `agente/planes-precio-historial` · **Estado:** análisis con datos oficiales; no cambia plan ni código. La v1 no cobra.
**Datos:** [`…-datos.json`](2026-11-14-lo-que-paga-un-restaurante-datos.json) (respuesta cruda del SAIC de INEGI) · [`…-datos-planos.json`](2026-11-14-lo-que-paga-un-restaurante-datos-planos.json) · [`…-por-estrato.csv`](2026-11-14-lo-que-paga-un-restaurante-por-estrato.csv) · **Guion:** [`…-saic-consulta.py`](2026-11-14-saic-consulta.py) (`python3 -I`; hace una consulta a la API pública que usa la propia página del SAIC).

**Marcas.** **[medido]** = cifra de INEGI (Censos Económicos 2024, año de referencia **2023**, Sistema Automatizado de Información Censal, consultado el 14 de noviembre de 2026) o aritmética mía sobre ella. **[fuente]** = página de un proveedor. **[documento]** = otro documento del repositorio. ***[supuesto]*** = juicio, con su forma de medirlo en §6. Pesos de 2023 (los censos no se actualizaron a 2026). «Ingreso» = ingresos por suministro de bienes y servicios. **«Excedente» = ingresos totales − total de gastos − remuneraciones** de los mismos censos: **no es utilidad** (incluye lo que se lleva el dueño y no descuenta impuestos ni depreciación).
**Estratos de personal del SAIC:** 0 a 10, 11 a 50, 51 a 250 y 251 o más (**no** son los del DENUE que usan otros informes).

---

## 0. Conclusiones

- **Un restaurante a la carta o de comida corrida típico vende 241,412 pesos al mes y deja 76,970 de excedente; el chico (0 a 10 personas, el 83 % de los negocios) vende 107,450 y deja 38,507** [medido: 67,763 negocios de la clase 722511; 56,316 en el estrato 0 a 10]. El de 11 a 50 personas vende **737,584** al mes; el de 51 a 250, **3,283,332**.
- **Lo que paga hoy por tecnología no se ve en los censos: INEGI no separa el software.** La cuenta más cercana, **servicios de comunicación (internet, telefonía), es 0.4 % del ingreso: 409 pesos al mes para el chico, 2,592 para el de 11 a 50** [medido]. Lo que sí se ve es lo que **cobran los sustitutos**: de 157 a 1,000 pesos al mes por negocio [fuente]; y en reparto, **25 %, 27 % o 29 % de cada pedido** en Uber Eats Lite, Plus y Premium [documento: mercado-de-carta, fila «Descubrir y recomendar», septiembre].
- **Los competidores cobran casi lo mismo a un negocio de 4 personas que a uno de 87; el valor para cada uno no se parece.** El sustituto con POS (Fudo 652, Soft Restaurant 699 a 799, Last.app 1,000) cuesta **0.6 % a 0.9 % del ingreso del chico y 0.09 % a 0.14 % del de 11 a 50** [medido × fuente]. El plan de menú QR (Meniu 225) cuesta 0.21 % del chico y 0.03 % del de 11 a 50. **Un precio plano es caro para el chico y regalado para el grande.** Es la razón de tener planes por tamaño.
- **Argumento al estilo *legal tech*: el valor de una hora de trabajo en un restaurante es ≈ 80 pesos de valor agregado, igual en todos los tamaños** (80, 78, 93 y 80 pesos por hora trabajada en los cuatro estratos) [medido: valor agregado censal bruto ÷ horas trabajadas]. **Master Chef a 249 se paga si ahorra 3.1 horas de personal al mes** (0.45 % de las 693 horas que trabaja un negocio chico; 0.07 % de las 4,669 de uno de 11 a 50); a 499, 6.2 horas; a 799, 10. **Cuántas horas ahorra Carta de verdad es *supuesto* (no hay medición): se mide en el piloto** (§5).
- **Dónde está el punto dulce.** Para el chico, **0.15 % a 0.3 % de su ingreso (157 a 317 pesos)** es lo que cuesta un menú QR con pedidos; arriba de ≈ 650 ya compite con un POS. Para el de 11 a 50, **hasta ≈ 0.1 % de su ingreso (≈ 740 pesos)** queda en la franja de lo que ya paga por un POS. **Los precios en estudio (249 a 499) están en 0.04 % a 0.08 % del ingreso del de 11 a 50**: hay margen.

---

## 1. Qué ingresa y qué gasta un restaurante, por tamaño [medido]

Clase **722511**, restaurantes con servicio de preparación de alimentos **a la carta o de comida corrida**; por **negocio y por mes** (dividí los totales anuales entre negocios y entre 12).

| Estrato de personal | Negocios | Personas por negocio | **Ingreso al mes** | **Excedente al mes** (antes de pagar al dueño) | Renta | Servicios de comunicación | Publicidad | Servicios profesionales | Horas de trabajo al mes | Valor agregado por hora |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 a 10 | 56,316 | 4.0 | **107,450** | **38,507** | 6,501 | 409 | 263 | 651 | 693 | 80 |
| 11 a 50 | 10,759 | 21.0 | **737,584** | **207,437** | 35,809 | 2,592 | 3,658 | 4,921 | 4,669 | 78 |
| 51 a 250 | 668 | 86.9 | **3,283,332** | **1,116,750** | 77,031 | 18,899 | 21,876 | 25,001 | 19,133 | 93 |
| 251 y más | 20 | 379.4 | **8,936,388** | **3,465,254** | 182,167 | 23,883 | 65,404 | 92,958 | 75,267 | 80 |
| **Todos** | 67,763 | 7.6 | **241,412** | **76,970** | 11,901 | 945 | 1,035 | 1,596 | 1,528 | 81 |

**La estructura de la clase, sobre sus ingresos totales:** remuneraciones **18.9 %**, gastos por consumo de bienes y servicios **48.7 %** (mercancías y materias primas casi todo), renta **4.9 %**, servicios profesionales 0.7 %, publicidad 0.4 %, comunicación 0.4 % y **excedente 31.8 %** [medido].

**Bares y cantinas (clase 722412)** son más chicos: ingreso medio **102,279** al mes y excedente 35,658; el estrato 0 a 10 (26,876 de 28,251 negocios) vende **79,272** [medido; CSV].

**Comparación con lo que supuse antes:** el informe de precio estimaba **138,000 al mes** para un negocio de 0 a 5 personas con 20 visitas al día [supuesto]; el dato oficial para 0 a 10 personas es **107,450**: mi supuesto estaba arriba por ≈ 28 %, **dentro del orden de magnitud**. Y estimaba 414,000 para el perfil «chico» del simulador (60 visitas al día): **el simulador está cuatro veces arriba del chico real**; ese perfil corresponde más bien a un negocio de 11 a 50 personas.

---

## 2. Lo que ya pagan por sistemas y plataformas

| Concepto | Cifra | Fuente |
|---|---|---|
| Servicios de comunicación (internet, telefonía) | **409** pesos al mes el chico; **2,592** el de 11 a 50 (0.4 % del ingreso) | medido: SAIC |
| Publicidad | 263 y 3,658 pesos al mes | medido: SAIC |
| Servicios profesionales (contador, etc.) | 651 y 4,921 pesos al mes | medido: SAIC |
| **Software de restaurante** (POS, menú QR) | **157 a 1,000** pesos al mes por negocio | fuente: páginas de los proveedores, [matriz del 14-nov](2026-11-14-funciones-y-precios.csv) |
| **Comisión de reparto** | **25 % (Lite), 27 % (Plus), 29 % (Premium)** de cada pedido | documento: mercado-de-carta (Uber Eats, septiembre); DiDi y Rappi no publican |
| **Gasto en software por restaurante** | **no existe en INEGI**; busqué en INEGI (CE 2024, ENAPROCE) y no apareció una cifra de México | dato por conseguir |

**Qué dice esto:** **249 pesos al mes es lo mismo que la comisión del 25 % sobre 996 pesos de ventas por reparto.** Un negocio chico (107,450 de ingreso) que venda sólo el 5 % por aplicaciones (5,372) paga **1,343 pesos de comisión al mes**, más de 5 veces Master Chef. **Carta no vende por reparto**, así que no lo sustituye: lo que sí dice es que el dueño ya acepta pagar porcentajes mayores que un precio fijo por herramientas que le traen ventas.

---

## 3. Precio como parte del ingreso y del excedente

| Precio al mes (sin IVA) | % del ingreso (0–10) | % del ingreso (11–50) | % del ingreso (51–250) | % del excedente (0–10) | % del excedente (11–50) | Horas de trabajo que debe ahorrar (a 80 pesos la hora) |
|---|---|---|---|---|---|---|
| **249** | 0.27 % | 0.04 % | 0.01 % | 0.75 % | 0.14 % | 3.1 |
| **349** | 0.38 % | 0.05 % | 0.01 % | 1.05 % | 0.20 % | 4.4 |
| **499** | 0.54 % | 0.08 % | 0.02 % | 1.50 % | 0.28 % | 6.2 |
| **799** | 0.86 % | 0.13 % | 0.03 % | 2.41 % | 0.45 % | 10.0 |
| **2167** | 2.34 % | 0.34 % | 0.08 % | 6.53 % | 1.21 % | 27.1 |

**«Horas que debe ahorrar»** = precio ÷ 80 pesos (valor agregado por hora [medido]). | Lo que ya pagan (precio al mes) | Precio | % del ingreso (0–10) | % del ingreso (11–50) | % del ingreso (51–250) |
|---|---|---|---|---|
| Neolo Plan 0 (menú QR) | 157 | 0.15 % | 0.02 % | 0.00 % |
| Meniu Business | 225 | 0.21 % | 0.03 % | 0.01 % |
| MenuTiger Regular | 317 | 0.30 % | 0.04 % | 0.01 % |
| Fudo Avanzado | 652 | 0.61 % | 0.09 % | 0.02 % |
| Soft Restaurant Cloud Lite | 699 | 0.65 % | 0.09 % | 0.02 % |
| Soft Restaurant 12 Lite | 799 | 0.74 % | 0.11 % | 0.02 % |
| Last.app Starter (+ IVA) | 1000 | 0.93 % | 0.14 % | 0.03 % |

**Lectura:** (1) **el chico paga más en proporción por lo mismo**: a 249 son 0.27 % de su ingreso y **0.75 % de su excedente** (con IVA); a 799 (el «Master Chef» del prototipo) son 0.86 % y 2.4 %: **en el chico, 799 ya cuesta más que Fudo (0.61 %) y casi lo que Soft Restaurant (0.74 %)**. (2) **El de 11 a 50 paga 0.04 % a 0.13 %** entre 249 y 799: **está por debajo de todo POS publicado** (0.09 % a 0.14 %). (3) **2,167 (500 por semana) son 2.3 % del ingreso del chico y 6.5 % de su excedente: fuera de lo razonable;** para el de 11 a 50, 0.34 % del ingreso, 1.2 % del excedente: **tolerable en proporción, pero es 2.2 veces el POS más caro de la tabla (Last.app, 1,000).**

---

## 4. El argumento *legal tech* aplicado a restaurantes

*Los abogados pagan mucho por software porque cada hora de su tiempo se factura cara y el software les ahorra horas.* **El análogo en un restaurante no es el abogado: es la hora de personal en el pico.**

| Pieza | Cifra | Origen |
|---|---|---|
| Valor agregado por hora trabajada | **≈ 80 pesos** (78 a 93 según estrato) | medido: SAIC |
| Horas de trabajo al mes | 693 el chico, 4,669 el de 11 a 50, 19,133 el de 51 a 250 | medido: SAIC |
| Lo que genera cada tamaño al mes | 107 mil, 738 mil, 3.3 millones | medido: SAIC |
| **Ahorro de horas que paga a Carta** | **3.1 h** a 249 · 6.2 h a 499 · 10 h a 799 | cálculo: precio ÷ 80 |
| Ese ahorro como parte de las horas del negocio | 0.45 % / 0.9 % / 1.4 % del chico; 0.07 % / 0.13 % / 0.2 % del de 11 a 50 | cálculo |
| Qué puede ahorrar Carta | **no medido**: minutos por mesa en tomar y repetir la comanda, llamadas al mesero, errores | **supuesto**; se mide en el piloto |

**La justificación, sin adornos:** *si* Carta le quita al personal **2 minutos por visita** (supuesto: tomar la orden y repetirla), un negocio de 11 a 50 personas con ≈ 1,800 visitas al mes ahorra **60 horas**, que a 80 pesos valen **4,800 pesos al mes: 14 veces un precio de 349**; uno chico con 600 visitas ahorra **20 horas = 1,600 pesos: 6.4 veces 249** [supuesto: los 2 minutos y las visitas; los 80 pesos son medidos]. **Lo que se sabe es que el valor de la hora es alto y uniforme y que el precio de Carta equivale a 3 a 10 horas al mes; lo que no se sabe es cuántas horas ahorra Carta.** Si el ahorro real es de 30 segundos por visita en vez de 2 minutos, el múltiplo baja a 3.4 y 1.6: sigue pagando, **pero ya no por un margen amplio**. *Es un argumento de valor, no un permiso para subir el precio sin medirlo.*

**Por qué el argumento apoya cobrar más a los grandes y no a los chicos:** el valor por hora es el mismo (≈ 80), pero el grande tiene **7 veces (11 a 50) y 28 veces (51 a 250) más horas** que el chico. Un ahorro de 0.5 % de las horas vale **277 pesos** al mes en el chico (693 h × 0.5 % × 80), **1,868** en el de 11 a 50 y **7,653** en el de 51 a 250: **cobrar lo mismo a los tres deja valor sobre la mesa en los grandes.** Es lo que dicen los competidores con sus escalones (Soft Restaurant Cloud, Last.app: 699 a 2,900 según licencias).

---

## 5. Cuánto podría pagar cada tamaño (el punto dulce)

Regla [supuesto]: **un negocio paga razonablemente entre lo que cuesta el menú QR con pedidos de la competencia y lo que cuesta su POS, en proporción a su ingreso; y nunca por arriba de lo que le ahorra el personal, a 80 pesos la hora.**

| Estrato (SAIC) | Negocios (clase 722511) | Ingreso al mes | Franja de «menú QR con pedidos» | Franja de POS | **Punto dulce para Carta (sin POS)** |
|---|---|---|---|---|---|
| **0 a 10 personas** | 56,316 (83 %) | 107,450 | 157–317 (0.15 %–0.30 %) | 652–1,000 (0.61 %–0.93 %) | **gratuito; si rebasa topes, 249 a 349** (0.27 %–0.38 %) |
| **11 a 50** | 10,759 (16 %) | 737,584 | 157–317 (0.02 %–0.04 %) | 652–1,000 (0.09 %–0.14 %) | **349 a 649** (0.05 %–0.09 %): menos que un POS, más que un menú QR |
| **51 a 250** | 668 (1 %) | 3,283,332 | 157–317 (0.00 %–0.01 %) | 652–1,000 (0.02 %–0.03 %) | **499 a 1,299** (0.02 %–0.04 %) con soporte propio |
| 251 o más | 20 | 8,936,388 | — | — | a medida |

**Cómo se ata a los planes** ([modelo de escenarios](2026-11-14-modelo-de-escenarios.md)): Chef (gratis) cubre al negocio chico; Master Chef (249 a 349) al de 11 a 50 y al chico que rebasa topes; **Chef Ejecutivo (499 en la recomendación del optimizador) está en el piso del punto dulce del de 51 a 250; los datos dejarían subirlo a ≈ 799 sin pasar de 0.03 % del ingreso**, pero **son 668 negocios (1 %)**, así que el efecto en ingresos es pequeño. **Qué le importa más al ingreso total es el de 11 a 50: 10,759 negocios.**

---

## 6. Lo que es supuesto y cómo medirlo en el piloto

| Supuesto | Valor usado | Cómo se mide | Costo |
|---|---|---|---|
| Horas que ahorra Carta por visita | 2 min (rango 0.5–2) | Cronometrar toma y repetición de la comanda en 3 mesas antes y después; el evento `scan` → comanda enviada (M4) | tiempo |
| Visitas al mes por tamaño | 600 el chico, 1,800 el de 11 a 50 | Eventos `scan` del piloto | 0 |
| Valor de la hora (80 pesos) | medido en censos de 2023 | Se actualiza con CE 2029; a 2026, sumar inflación | 0 |
| Pesos de 2023 | sin ajuste | Aplicar INPC | 0 |
| Gasto en software real del restaurante | no existe en INEGI | Preguntar en las entrevistas del piloto: ¿qué paga hoy por POS, menú QR, reservas y reparto? | 0 |
| Cuántos negocios de cada estrato rebasan los topes | ver [tres planes](2026-11-14-tres-planes.md) | `mesa` y `personal_restaurante` del piloto | 0 |
