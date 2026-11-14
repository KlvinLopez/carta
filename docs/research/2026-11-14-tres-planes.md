# Tres planes: topes, a quién empujan a pagar y cuánto dejan

**Fecha:** 14 de noviembre de 2026 (revisada el mismo día tras la ronda de la maestra) · **Rama:** `agente/planes-precio-historial` · **Estado:** propuesta para la futura Spec 002; **la v1 no cobra ni tiene planes**. No cambia plan, código ni contrato (salvo una fila en `04 §11`).
**Qué cambió con la revisión:** *antes definía los planes por el personal del DENUE («Gratuito = 0–5 personas, 69.8 %») y decía que «los del tamaño gratuito nunca pagan»; esa frontera es un corte que Carta no conoce. Ahora la frontera son los **topes que el producto puede aplicar** (mesas, cuentas de personal, platillos), con a quién dejan dentro y a quién empujan; el corte por personal queda como contraste. También se corrigió el punto de equilibrio (era 7.4; es 9.7) y se marca lo que cambia lo que Calvin ya decidió.*
**Datos:** [`…-datos.json`](2026-11-14-tres-planes-datos.json) · [`…-cobertura-platillos.csv`](2026-11-14-cobertura-platillos.csv) · **Guion:** [`…-tres-planes.py`](2026-11-14-tres-planes.py) (`python3 -I`; lee el CSV de 148 cartas y los datos de [precio](2026-11-14-precio-con-fundamento.md) y [disco](2026-11-14-disco-e-historial.md)).

**Marcas.** **[medida]** = conteo mío sobre datos del repositorio. **[documento]** = otro documento. **[supuesto]** = juicio o modelo, con el dato que lo cerraría en §7. Pesos al mes. **«IVA no declarado»** donde la página del competidor no lo dice.

---

## 0. Conclusiones

- **Los topes empujan a pagar, como mínimo, a ≈ 39 % de los restaurantes de servicio completo** (10 mesas: 39 %, intervalo 16–71 %; 3 cuentas de personal: 36 %, 24–54 %; 80 platillos: 10.8 %) [**supuesto**: el modelo de mesas y cuentas no es estadística; sólo el de platillos es medida]. En números: **≈ 28,300 de los 72,521 negocios de la clase 722511** (DENUE 05/2026; entre ≈ 11,600 y ≈ 51,500). El corte por personal (0–5 personas = 69.8 % del núcleo) **queda sólo como contraste**: Carta no conoce el personal real, sólo las cuentas con PIN.
- **«¿80 platillos o menos?» — dejar 80, para el conjunto.** Empuja a 10.8 % de los negocios (con 60, a 24.3 %; con 40, a 52.7 %) y un platillo cuesta 1.4–1.9 KB. **No concluyo sobre los formales: son 9 de 148 (22 % = 2 negocios).**
- **El precio de cada plan es un rango, no un punto,** porque depende del sustituto elegido y de K (decisión de Calvin): **Servicio 249 a 349** (centro 299), **Salón 249 a 599** (399 con la misma regla). Margen sobre el piso (soporte 60 supuesto): **76 % a 349, 72 % a 299 y 68 % a 249** en Servicio; 77 % a 399 en Salón. Detalle en [precio con fundamento](2026-11-14-precio-con-fundamento.md) §4.
- **Punto de equilibrio: 9.7 pagantes a 349 (11.9 a 299, 15.2 a 249) con 1,000 registrados**, no 7.4: el costo fijo (2,569 pesos al mes con 1,000 [documento]) se divide entre el **margen por pagante** (precio − piso: 349 − 85 = 264), no entre el precio. *La versión anterior dividía entre el precio.*
- **Con la conversión aplicada sobre los que rebasan topes, por cada 1,000 registrados:** si rebasan 39 % y pagan 10 % de ellos, **39 pagantes, ≈ 13,800 pesos al mes de ingreso y ≈ 7,800 netos** (a 349 y 399). Si rebasan 16 % y pagan 5 %, **8 pagantes y −400 netos**: es el caso donde no se cubre el costo fijo.

---

## 1. La frontera: tope → a quién deja dentro y a quién empuja a pagar

| Tope del Gratuito | Dentro | **Empuja a pagar** | Marca | Qué hay que medir |
|---|---|---|---|---|
| **10 mesas** [Calvin, 13-nov] | 61 % (29–84) | **39 % (16–71)** | **supuesto**: modelo, no hay estadística de mesas en México | `mesa` de los primeros 10–20 restaurantes |
| **3 cuentas de personal** [Calvin] | 64 % (46–76) | **36 % (24–54)** | **supuesto**: modelo | `personal_restaurante` del piloto |
| **80 platillos** | 89 % (85–93) | **10.8 %** (7–15) | medida: 148 cartas, sesgo abajo | `platillo` del piloto |
| **3 lecturas de PDF en total por dueño** [Calvin] | quien no reimporta | quien reimporta su carta más de 3 veces | — | `importacion_menu` del piloto |
| **30 días de historial** [Calvin] | — | casi todos al segundo mes | — | ¿quién abre el mes anterior? |

**Quién queda dentro de todos los topes a la vez:** entre ≈ 14 % y 61 %. 61 % si quien rebasa un tope rebasa también los otros (los empujados serían 39 %); ≈ 14 % si los topes empujan a grupos distintos (39 + 36 + 11 ≈ 86 % empujados). **No se puede saber sin datos.** Por eso §5 usa tres valores para «quién rebasa».

**Contraste, por personal (DENUE, clase 722511 + bares + centros nocturnos; 104,882 negocios del núcleo) [medida]:** 0–5 personas **69.8 %** (73,193) · 6–30 **27.3 %** (28,664) · 31 o más **2.9 %** (3,025). Es **el tamaño real del universo, no el del gratuito**: un negocio de 4 personas con 14 mesas rebasa el tope de mesas; uno de 8 personas con 9 mesas no. No lo uso para fijar planes ni conversión.

---

## 2. «¿80 platillos en el gratuito, o menos?»

Negocios que **rebasan** el tope (verían la oferta de pagar), muestra de **148 cartas** [medida; CSV de la estadística]:

| Tope | Total | Fonda / taquería (43) | Cafetería (32) | Casual (50) | Bar / cantina (14) | Formal (**9**) |
|---|---|---|---|---|---|---|
| 40 | **52.7 %** | 32.6 % | 50.0 % | 64.0 % | 64.3 % | *77.8 % (7 de 9)* |
| 60 | **24.3 %** | 2.3 % | 37.5 % | 30.0 % | 28.6 % | *44.4 % (4 de 9)* |
| **80** | **10.8 %** | 2.3 % | 18.8 % | 14.0 % | 0 % | *22.2 % (2 de 9)* |
| 100 | 4.1 % | 0 % | 0 % | 8.0 % | 0 % | *22.2 % (2 de 9)* |

**Lectura.** (1) Con 40 o 60 se empuja a la mitad o a una cuarta parte de los negocios a pagar por algo que no cuesta (80 platillos pesan 0.15 MB [medida: disco §1.2]). (2) Sale del gratuito el que tiene **carta larga** (cafeterías y casuales), no necesariamente el de **mayor ingreso**. (3) Entre 80 y 100 casi no cambia (10.8 % → 4.1 %: 6 negocios de 148); **100 también se sostiene**. (4) **Sesgo de la muestra:** 147 de 148 cartas son de reparto (Rappi), no de salón; 16 capitales, 5–16 por ciudad; **formales n = 9, bares n = 14: no concluyo sobre ellos** (en cursiva, sólo informativos). *Se sostiene «dejar 80» para el conjunto; no para los formales.*

---

## 3. Las posturas de Calvin y lo que esta propuesta cambia

**Lo decidido el 13 de noviembre** [documento: `04 §11`]: gratuito = 10 mesas, 6 por mesa, 3 cuentas de personal, **3 lecturas de PDF en total por dueño**, historial **30 días**; paga = 40 mesas, 12 por mesa, 20 cuentas, **lecturas de PDF sin número al mes, con fila prioritaria sujeta a disponibilidad**, historial **12 meses**; platillos: lo decide la estadística.

| Plan | Propuesta | Lo decidido | **¿Cambia lo decidido?** |
|---|---|---|---|
| Gratuito | 10 mesas · 6 por mesa · 3 cuentas · 80 platillos · 3 lecturas en total · 30 días · marca «Hecho con Carta» | igual (80 platillos lo recomienda esta estadística) | **No** |
| **Servicio** | 40 mesas · 12 por mesa · 20 cuentas · 300 platillos | igual | **No** |
| Servicio · lecturas de PDF | **10 al mes** | sin número, con fila prioritaria | **Sí: propuesta que cambia lo decidido.** Por qué: cada lectura cuesta 0.19 USD [medida: simulador]; **sin tope, 100 lecturas al mes cuestan ≈ 358 pesos, más que el precio**; 10 son ≈ 36 pesos como máximo. Lo que se gana: un techo de costo. Si Calvin prefiere «sin número», la fila prioritaria ya la protege |
| Servicio · historial | **3 meses en línea + archivo descargable** | **12 meses** | **Sí: propuesta que cambia lo decidido.** Por qué: con 12 meses caben 22 restaurantes de paga en 5 GB; con 3 + archivo, 128 [medida: disco §2]. Lo que se pierde: ver los meses 4 a 12 con un clic (hay que bajar el archivo). Si Calvin mantiene 12: Pro de Railway antes de 17–22 de paga |
| **Salón** (tercer plan; Calvin dijo «tal vez tres») | 100 mesas · 12 por mesa · 50 cuentas (tope del código, T-1.6) · 300 platillos · lecturas 20 al mes con fila prioritaria · **6 meses** en línea + archivo | no existe | **Es nuevo: [supuesto]** en mesas y lecturas; **no decidido** |

**Por qué el tercer plan:** el 3 % más grande (> 40 mesas) cuesta **10 gratuitos de disco** y trae cocina y comandero [supuesto: son los que necesitan KDS]; **por precio casi no se distingue de Servicio** (399 contra 299–349: ver §4), así que **el tercer plan se justifica por soporte y capacidad, no por precio**. Si Calvin prefiere dos planes (Gratuito y de paga), la matemática no lo contradice.

---

## 4. Los tres planes

| | **Gratuito** | **Servicio** | **Salón** |
|---|---|---|---|
| **A quién** (topes) | ≤ 10 mesas, ≤ 3 cuentas, ≤ 80 platillos | 11–40 mesas, hasta 20 cuentas | > 40 mesas, hasta 50 cuentas |
| **Precio (rango, sin IVA)** | **0** | **249 a 349** (centro 299) | **249 a 599** (399 con la regla en K = 0.5) |
| **Costo por restaurante** (sin soporte ni comisión) | **4.0** (1.0 + 3.0 base) | **4.9** (1.9 + 3.0) | **10.5** (7.5 + 3.0) |
| **Piso** (con comisión sobre precio con IVA y soporte 60) | — | **80 a 85** | **86 a 101** |
| **Margen sobre el piso** | — | **68 % (249) · 72 % (299) · 76 % (349)** | **65 % (249) · 77 % (399) · 82 % (549)** |
| Disco en línea (MB) | 13.0 | 27.4 (3 meses) | 130.9 (6 meses) |
| **Lugares de gratuito que ocupa** | 1 | **2.1** por disco · 1.2 por costo | **10.1** por disco · 2.6 por costo |
| Restaurantes del plan que caben en 5 GB | 384 | 182 | 38 |

Fuentes: costo variable por perfil y base fija [documento: planes-y-costo §0]; comisión de tarjeta 3.6 % + 3 pesos más IVA, **sobre lo que paga el cliente** [documento: §7.2]; soporte 60 = 30 minutos a 120 la hora **[supuesto]**; disco, [medido](2026-11-14-disco-e-historial.md). El precio es un rango porque **depende del sustituto y de K** ([precio](2026-11-14-precio-con-fundamento.md) §4.3).

---

## 5. Cuánto deja (por 1,000 registrados): la conversión aplica a quienes rebasan topes

Quién rebasa topes = 16 %, 39 % o 71 % de los registrados (el intervalo de 10 mesas [supuesto]); de ellos, el 3 % de todos (30) es de tamaño Salón y el resto Servicio. Conversión = qué fracción de los que rebasan paga [**supuesto**: es lo que prueba el piloto]. Neto = ingreso − costo de atender a los pagantes (piso) − costo fijo con 1,000 (2,569 pesos [documento: planes-y-costo §0]). Precios: Servicio 349, Salón 399.

| Rebasan topes | Conversión | Pagantes | Ingreso al mes | **Neto al mes** |
|---|---|---|---|---|
| 16 % | 5 % | 8 | 2,867 | **−397** |
| 16 % | 10 % | 16 | 5,734 | 1,776 |
| 16 % | 20 % | 32 | 11,468 | 6,121 |
| **39 %** | 5 % | 19.5 | 6,880 | 2,636 |
| **39 %** | **10 %** | **39** | **13,761** | **7,841** |
| 39 % | 20 % | 78 | 27,522 | 18,252 |
| 71 % | 5 % | 35.5 | 12,464 | 6,855 |
| 71 % | 10 % | 71 | 24,929 | 16,280 |
| 71 % | 20 % | 142 | 49,858 | 35,130 |

**Con precios 299 y 399**, el caso de en medio (39 %, 10 %) deja **≈ 6,100 netos**. **Qué dice:** el negocio no se cubre solo con pocos pagantes (**el equilibrio es 9.7** a 349), y **todo depende de cuántos rebasan topes y cuántos de ellos pagan**: dos datos que hoy no existen. *Antes: «con 3 % de conversión sobre los 1,000, ingreso 3,336»; esa cuenta suponía que los del tamaño gratuito nunca pagan, cosa que no sé.*

---

## 6. Qué puede ir mal en las fronteras

- **El tope de mesas** es el que más empuja (39 %) y el menos medido: **un tope de 10 puede ser demasiado bajo** si la mayoría de los restaurantes de servicio completo tiene 12–15 mesas. Se corrige con los primeros 10–20 restaurantes.
- **La escalera de 10 a 11 mesas** (de 0 a 349 pesos): para quien apenas pasa, la regla de gracia de 30 días (conserva lo que tiene, sólo se bloquea lo nuevo) amortigua el salto.
- **Si el sustituto real es Meniu a 225**, Servicio a 249 queda ≈ 11 % arriba y a 299, 33 %: la pregunta del piloto es si el dueño ve ese valor adicional.

---

## 7. Datos por conseguir

| Dato | Por qué importa | Cómo se obtiene | Costo |
|---|---|---|---|
| **Mesas, cuentas de personal y platillos reales** de los primeros 10–20 restaurantes | Las fronteras de mesas y cuentas son un modelo | Consultas de lectura a `mesa`, `personal_restaurante`, `platillo` | 0 |
| **Qué parte rebasa topes y qué parte de ella paga** | Todo el §5 | Eventos y la prueba del piloto | 0 |
| Cartas de salón (no de reparto) | La muestra de 148 es de reparto | 30–40 locales visitados, o el piloto | tiempo |
| Estratos de personal por clase 722511 (Censos Económicos 2024) | Contraste por personal | Sistema de Consulta de INEGI en navegador | 0 |
| Soporte real por restaurante de paga | El piso de 85 | Tickets y minutos del piloto | 0 |
| Visitas por día de los negocios chicos | El gratuito cuesta menos si son pocas | Eventos `scan` del piloto | 0 |
