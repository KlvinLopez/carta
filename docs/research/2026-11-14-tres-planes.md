# Tres planes: dónde poner las fronteras, a quién empuja cada tope y cuánto deja cada uno

**Fecha:** 14 de noviembre de 2026 · **Rama:** `agente/planes-precio-historial` · **Estado:** propuesta para la futura Spec 002; **la v1 no cobra ni tiene planes**. No cambia plan, código ni contrato (salvo una fila en `04 §11`).
**Datos:** [`…-datos.json`](2026-11-14-tres-planes-datos.json) · [`…-cobertura-platillos.csv`](2026-11-14-cobertura-platillos.csv) · **Guion:** [`…-tres-planes.py`](2026-11-14-tres-planes.py) (`python3 -I`, sin dependencias; lee el CSV de 148 cartas y los resultados de [precio](2026-11-14-precio-con-fundamento.md) y [disco](2026-11-14-disco-e-historial.md)).

**Marcas.** **[medida]** = conteo mío sobre datos del repositorio o medición local. **[documento]** = lo dice otro documento (se nombra). **[supuesto]** = juicio con su cómo-se-obtiene (§6). Precios en pesos al mes **antes de IVA**.

---

## 0. Conclusiones

- **Tres planes, fronteras por tamaño del negocio (personal), no por platillos:** **Gratuito** (0 a 5 personas: **69.8 % del núcleo, 73,193 negocios**), **Servicio** (6 a 30: **27.3 %, 28,664**) y **Salón** (31 o más: **2.9 %, 3,025**) [medida: DENUE 05/2026, núcleo de 104,882 negocios]. Precios propuestos: **0 / 349 / 549**, con márgenes de **76 % y 82 %** sobre un costo de 83 y 97 pesos (soporte supuesto incluido).
- **«¿80 platillos en el gratuito, o menos?» — dejar 80.** Con 80 el tope empuja a pagar al **10.8 %** de los negocios; con 60, al **24.3 %**; con 40, al **52.7 %** [medida: 148 cartas, ver sesgo en §2]. **Y el platillo no separa a los grandes de los chicos** (las medianas por tipo van de 34 a 51): el tope de 60 empuja sobre todo a cafeterías (38 %) y casuales (30 %), no a los que tienen más personal. Un platillo cuesta **1.4 a 1.9 KB** en la base: bajar el tope **no ahorra nada**.
- **Lo que de verdad separa son mesas, cuentas de personal y meses de historial.** En el disco, **un restaurante Servicio ocupa 2.1 gratuitos** (27 MB contra 13 MB con 3 meses de historial en línea) y **un Salón con 6 meses ocupa 10** (131 MB); por costo de servidor sólo 1.2 y 2.6 gratuitos.
- **El mercado sostiene un precio de paga entre 349 y 549, no 2,000.** El sustituto más barato que cubre lo mismo sin tope de pedidos cuesta **745 pesos** para un restaurante de mesa (Fudo Avanzado + módulo de mesas, que además trae POS) y **1,117** para uno con cocina y comandero. Carta, sin caja ni factura, a la mitad de eso da **372 y 559**. Detalle en [precio con fundamento](2026-11-14-precio-con-fundamento.md).
- **Con 1,000 restaurantes registrados y 3 a 10 % de conversión de los que caben en Servicio y Salón entran 3,300 a 11,100 pesos al mes** contra **2,570 de costo fijo** [documento: planes-y-costo, 138 USD con 1,000 restaurantes]: el punto de equilibrio es **7.4 pagantes (0.7 %)**. Es un ingreso complementario, no un sueldo.

---

## 1. Las tres fronteras y de dónde salen

| Frontera | Dato | Fuente | Marca |
|---|---|---|---|
| 0–5 personas = **69.8 %** del núcleo (73,193); 6–10 = 17.0 % (17,855); 11–30 = 10.3 % (10,809); 31–50 = 2.2 % (2,263); 51+ = 0.7 % (762) | Estratos del DENUE en la clase 722511 + bares y centros nocturnos | `2026-11-13-mercado-de-carta.md` §2.1 (INEGI, DENUE 05/2026) | medida |
| ≤ 10 mesas ≈ **61 %** (29–84 %); ≤ 40 mesas ≈ **97 %** (88–100 %); ≤ 3 cuentas ≈ 64 % (46–76 %); ≤ 20 cuentas ≈ 99 % | Modelo con supuestos, **no hay estadística de mesas ni meseros en México** | `2026-11-13-estadistica-de-cartas-y-personal.md` §4.3 | **supuesto** (margen ancho) |
| ≤ 80 platillos = 89 %; ≤ 100 = 96 % | 148 cartas de 16 capitales | CSV de la estadística | medida (sesgada, §2) |

**Por qué cortar en 5 y en 30 personas y no en otro número:** (a) **0–5 es el 70 %** y se parece al «chico» del simulador (3 personas de personal, 10 mesas, ≈ 60 % del gratuito) [documento: simulador, `MEZCLAS`]; (b) **6–30 es el cuerpo de «servicio completo»** (media de 8.7 personas en la clase 722511 [estimada: 516,894 ÷ 59,296]); (c) **31 o más (2.9 %)** coincide con el 3 % que rebasa 40 mesas en el modelo de mesas: son los que ya piden cocina, varios turnos y soporte. **Advertencia:** el simulador supone 60 visitas al día para el «chico»; un negocio de 0–5 personas rara vez pasa de 20–40. Si la mayoría del gratuito es más chica que el perfil del simulador, **el gratuito cuesta aún menos**; no cambia las fronteras.

---

## 2. «¿80 platillos en el gratuito, o menos?»

Porcentaje de **negocios que rebasan el tope** (y por eso verían la oferta de pagar) en la muestra de **148 cartas** [medida; CSV de la estadística]:

| Tope | Total | Fonda / taquería (43) | Cafetería (32) | Casual (50) | Bar / cantina (14) | Formal (9) |
|---|---|---|---|---|---|---|
| 40 | **52.7 %** | 32.6 % | 50.0 % | 64.0 % | 64.3 % | 77.8 % |
| 60 | **24.3 %** | 2.3 % | 37.5 % | 30.0 % | 28.6 % | 44.4 % |
| **80** | **10.8 %** | 2.3 % | 18.8 % | 14.0 % | 0 % | 22.2 % |
| 100 | 4.1 % | 0 % | 0 % | 8.0 % | 0 % | 22.2 % |
| 120 | 4.1 % | 0 % | 0 % | 8.0 % | 0 % | 22.2 % |

**Lectura.**
1. **Con 40 o 60 se empuja a la mitad o a una cuarta parte de los negocios a pagar por algo que no cuesta nada** (un platillo pesa 1.4–1.9 KB; 80 pesan 0.15 MB [medida: disco §1.2]). Eso no es «ayudar a las pymes»: es un muro en la prueba.
2. **A quién empuja cada tope:** el de 60 empuja a **cafeterías y casuales** (30–38 %) y casi no a fondas (2.3 %). Es decir, sale del gratuito el que tiene **carta larga**, no el que tiene **más ingreso**.
3. **Entre 80 y 100 casi no cambia** (10.8 % → 4.1 %): los 6 negocios de 148 que pasan de 100 son los de carta muy larga (un bar-restaurante con 341 bebidas). **80 es el punto donde se deja de empujar a la mayoría sin regalar el caso extremo.** **Si Calvin prefiere 100, también se sostiene** (96 % cabe): el costo es cero.
4. **Sesgo de la muestra, dicho:** **147 de 148 cartas son de reparto (Rappi)**, no de salón; no es una muestra al azar (16 capitales, 5–16 por ciudad); formales (9) y bares (14) son pocos. Las cartas de reparto **probablemente subestiman** a los formales. Cualquier cobertura de formales es poco fiable (22 % ± mucho). Con 9 formales, «22 %» son **2 negocios**.
5. **Tope técnico del producto:** 1,000 platillos [documento: T-1.9]; el tope de plan es sólo comercial.

**Recomendación:** gratuito **80 platillos**; Servicio **300**; Salón **300** (el tope técnico es 1,000; el de 300 cubre al 99 %). **Si se baja de 80, hay que decir a quién se le quiere cobrar y por qué; los datos no lo apoyan.**

---

## 3. Los tres planes

| | **Gratuito** | **Servicio** (central) | **Salón** |
|---|---|---|---|
| **A quién cubre** | 0–5 personas: fonda, taquería, cafetería chica. **69.8 % del núcleo, 73,193 negocios** | 6–30 personas: casual, cafetería mediana, cantina. **27.3 %, 28,664** | 31 o más personas: salón grande, hotel, varios turnos. **2.9 %, 3,025** |
| Mesas | 10 | 40 | 100 [supuesto] |
| Comensales por mesa | 6 | 12 | 12 |
| Platillos | **80** | 300 | 300 |
| Cuentas de personal (con PIN) | 3 | 20 | 50 (tope del código, T-1.6) |
| Lecturas de PDF | **3 en total** (una vez) [dicho por Calvin] | **10 al mes** | 20 al mes, con fila prioritaria |
| Historial en línea | **30 días** | **3 meses** + archivo descargable del resto | **6 meses** + archivo descargable |
| Marca «Hecho con Carta» | sí | no | no |
| **Costo por restaurante** (pesos al mes) | **4.0** (1.0 variable + 3.0 base fija) | **83.0** (1.9 + 3.0 + 18.1 comisión de tarjeta + 60 soporte) | **96.9** (7.5 + 3.0 + 26.4 + 60) |
| **Precio (antes de IVA)** | **0** | **349** (404.8 con IVA) | **549** (636.8 con IVA) |
| **Margen** | — | **76 %** | **82 %** |
| Lugares de gratuito que ocupa | 1 | **2.1** (disco) · 1.2 (costo) | **10.1** (disco) · 2.6 (costo) |
| Restaurantes de este plan que caben en 5 GB | 384 | 182 | 38 |

Fuentes del costo: variable por perfil, planes-y-costo §0 [documento] (chico, mediano y grande); base fija 3 pesos con 500 restaurantes [documento]; comisión de tarjeta 3.6 % + 3 pesos más IVA [documento: planes-y-costo §7.2]; **soporte 60 pesos = 30 minutos al mes a 120 la hora [supuesto]**. Disco: [medido en el informe de disco](2026-11-14-disco-e-historial.md). Con transferencia en lugar de tarjeta, la comisión baja a 0 y el margen sube ≈ 5 puntos.

**Lo que el gratuito tiene que dar para que valga como prueba:** el flujo completo (QR → orden compartida → comanda al mesero), porque el valor de Carta es el flujo y su costo por restaurante es de centavos. **Lo que cuesta de verdad** (y por eso va limitado): lecturas de PDF (0.19 USD cada una [medida: simulador]: **3 lecturas = 10.7 pesos por restaurante gratuito, una vez**; 10 al mes en Servicio = hasta 36 pesos si se agotan, 10 % del precio) y **meses de historial** (capacidad de disco, §3 del informe de disco).

### 3.1 Por qué el precio cae donde cae

Regla (detalle y evaluación en [precio con fundamento](2026-11-14-precio-con-fundamento.md)): **precio = la mitad del sustituto más barato que hace el mismo trabajo sin tope de pedidos, redondeado hacia abajo a x49 o x99, y nunca menos de 3 veces el piso.** Servicio: 0.5 × 745 = 372 → **349** (4.2 veces el piso). Salón: 0.5 × 1,117 = 559 → **549** (5.7 veces el piso). Como contraste, **Poster Business (comandero y cocina) a 837** daría 418 → **399** para Salón: el precio de Salón puede ir de 399 a 549 según el yardstick; **549 es la elección con más margen frente a un sustituto que trae cocina, mesas y comandero**. **«La mitad» es un [supuesto]** (Carta no trae caja, factura ni inventario); la prueba de precio del piloto lo mide (§6 de aquel informe).

---

## 4. A quién empuja a pagar cada tope y qué pasa en las fronteras

| Tope del Gratuito | Quién lo rebasa | Qué se le ofrece | Riesgo |
|---|---|---|---|
| **10 mesas** | ≈ 39 % de los restaurantes de servicio completo (rango 16–71 %) [supuesto: modelo] | Servicio (40 mesas) | **Es el tope que más empuja y el menos medido**: sin datos reales de mesas |
| **3 cuentas de personal** | ≈ 36 % (24–54 %) [supuesto] | Servicio (20 cuentas) | Penaliza la rotación de turnos; Calvin pidió «3»; **el dato del piloto lo confirma** |
| **80 platillos** | **10.8 %** [medida] | Servicio (300) | Bajo |
| **3 lecturas de PDF en total** | Cualquiera que reescriba su carta más de una vez | 10 al mes | Si la carta cambia mucho, el dueño no puede reimportar: **hay edición manual** (T-1.3) |
| **30 días de historial** | Casi todos al segundo mes | 3 meses + archivo | Bajo: el panel del dueño casi no mira atrás [supuesto] |

**Qué puede ir mal en la frontera 5–6 personas:** un restaurante de 6 con 12 mesas paga 349; uno de 5 con 10 no. Es una escalera, no una pendiente; es normal y se corrige con la **regla de gracia de 30 días** (los pilotos y los que se pasan del tope conservan lo que tienen y sólo bloquea lo nuevo).

---

## 5. Cuánto deja (por cada 1,000 restaurantes registrados con la forma del núcleo)

| Conversión de los que caben en Servicio o Salón | Pagan Servicio | Pagan Salón | Ingreso al mes | Costo fijo con 1,000 | Pagantes para empatar |
|---|---|---|---|---|---|
| 3 % | 8 | 1 | **3,336** | 2,569 | 7.4 |
| 5 % | 14 | 1 | **5,560** | 2,569 | 7.4 |
| 10 % | 27 | 3 | **11,120** | 2,569 | 7.4 |

**Cómo se calcula:** 1,000 × 27.3 % = 273 de tamaño Servicio y 29 de tamaño Salón [medida: núcleo]; conversión [supuesto, es la cifra a probar]; 138 USD × 18.6188 = 2,569 pesos de costo fijo con 1,000 restaurantes [documento]. **Es más conservador que el informe de planes** (que aplicó 3 % a los 1,000 y contó sólo a 349): aquí **los del tamaño gratuito nunca pagan**, porque el tope no los empuja. Lo que **sí** se sabe: a 349, **un pagante sostiene a más de 100 gratuitos** [documento: planes-y-costo §6.4].

---

## 6. Datos por conseguir (lo que aquí es supuesto)

| Dato | Por qué importa | Cómo se obtiene | Costo |
|---|---|---|---|
| Mesas, personal y platillos reales de los primeros 10–20 restaurantes | Todas las fronteras de mesas y personal son un modelo | La base ya los guarda (`mesa`, `personal_restaurante`, `platillo`): consultas de lectura | 0 |
| Cartas de salón (no de reparto) | La muestra de 148 es de reparto | Visitar 30–40 locales, o el piloto | tiempo |
| Estratos de personal **por clase** (sólo la rama 7225 completa tiene 4 estratos) | Las fronteras de personal | Tabulado de los Censos Económicos 2024 por clase 722511 (ver [precio](2026-11-14-precio-con-fundamento.md) §5) | 0 |
| Conversión real | Todo el §5 | Prueba del piloto (hoja con 349) | 0 |
| Soporte real por restaurante de paga | El 60 del costo | Contar tickets y minutos durante el piloto | 0 |
| Visitas por día de los negocios de 0–5 personas | El gratuito cuesta menos si son pocas | Eventos `scan` del piloto | 0 |
