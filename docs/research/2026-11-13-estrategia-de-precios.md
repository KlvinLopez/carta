# Estrategia de precios: de dónde cobraría Carta, desde el valor y no desde el costo (borrador para decidir)

**Fecha:** 13 de noviembre de 2026 · **Rama:** `agente/estrategia-de-precios` · **Estado:** borrador de estrategia; no cambia código, contrato ni documentos de plan (salvo una fila en `04 §11`). La v1 **no cobra**; esto alimenta la futura Spec 002 «Planes».

**Método.** Las skills `founderos:pricing-strategy` y `founderos:runway-and-unit-economics` **no aparecen en la lista de skills de esta sesión**, así que no pude invocarlas. Seguí el resumen del método de Founder OS (Adam M. Adamek, Impact Brussels ASBL, licencia CC-BY-4.0): (1) anclar el precio al valor que recibe el cliente y a su mejor alternativa, no al costo; (2) un solo modelo de cobro que refleje cómo recibe el valor; (3) dos o tres planes «bueno, mejor, óptimo» con un plan central y una razón para subir en cada uno; (4) comprobar disposición a pagar y economía por unidad marcando lo conocido y lo supuesto; (5) la prueba de precio más barata con compradores reales y el criterio de aprobado fijado antes. Regla del método: **nunca inventar cifras de valor, márgenes ni «precios estándar»**.

**Marcas.** **[conocida]** = medida o dicha por un documento del repositorio (se nombra). **[fuente externa]** = página leída con enlace y fecha. **[supuesta]** = juicio mío o heredado, con cómo se probaría. **Ninguna cifra de valor para el restaurante es conocida**: todas son supuestas hasta que un dueño las confirme (§1.3).

**Precios de competidores.** No leí hoy ninguna página nueva: todos los que cito ya constan en los documentos del repositorio, con su fecha (OlaClick, Neolo, MenuTiger y Last.app, leídos el 13 de noviembre en `2026-11-13-planes-y-costo-por-restaurante.md`; Fudo y Soft Restaurant, del 19 de septiembre, **no releídos hoy**: la página de Fudo ya no abría el 13 de noviembre). Tipo de cambio 18.6188 MXN por USD (FIX de Banxico del 12 de noviembre, del mismo informe).

---

## 0. Para Calvin

**Una frase.** Los costos no deciden el precio: un restaurante cuesta centavos y un solo restaurante de paga sostiene a entre ≈ 35 y ≈ 100 gratuitos **[conocida, §4.2]**. Lo que decide el precio es **cuánto vale Carta para el dueño frente a una alternativa que hoy cuesta cero** (OlaClick gratis, un PDF por QR), y **eso nadie lo ha medido todavía**.

**De dónde cobrar (una recomendación).** De **la mesa de servicio completo que crece**: restaurantes con **más de 10 mesas** que quieren que el piso trabaje sin fricción (comanda directa al teléfono, orden compartida, platillo agotado al instante). **Cobro fijo mensual por nivel de tamaño (mesas activas), con un nivel gratuito**. No por comanda, no por comensal, no por mesero, no por anuncios, no por comisión de pago.

Por qué la mesa y no el uso: es lo que el dueño puede contar sin pensar, no cambia de mes a mes (factura predecible), crece con el valor (más mesas, más minutos de mesero ahorrados) y ya lo vigila el código. Cobrar por comanda o por escaneo castiga al dueño cuando Carta funciona: querría que se escanee menos. OlaClick ya tiene cupos y una reseña de un cliente al que le recortaron el cupo (`2026-09-20-olaclick-a-fondo.md` §6.2).

**Los planes propuestos** (detalle en §3)

| Plan | Para quién | Precio (hipótesis) | Razón para subir |
|---|---|---|---|
| **Gratuito** | fonda, taquería, cafetería chica: hasta 10 mesas | 0 | cruzar 10 mesas; quitar la marca «Hecho con Carta» |
| **Servicio** (**central**) | restaurante o cafetería de 11 a 25 mesas | **349 pesos al mes antes de IVA** (≈ 405 con IVA) | pasar de 25 mesas o querer atención y reportes de más valor |
| **A medida** | salón grande, hotel, 26 a 40 mesas o más | sin precio de lista; se habla | tamaño y servicio especial (alta hecha por nosotros, imágenes con prioridad, a futuro) |

Lo que tú dijiste (10 mesas / 6 por mesa / 3 lecturas de PDF por dueño / 3 personas, y de paga 40 / 12 / 20 con fila prioritaria de lecturas, y el historial de 30 días / 12 meses) se respeta. Lo que añado: el de paga **no necesita ser uno solo para siempre**; el tercer nivel es una puerta para hablar con los grandes, no algo que se vende en el piloto.

**Qué se sabe y qué es supuesto**

- **Se sabe:** costos medidos (≈ 1 a 8 pesos al mes de costo variable por restaurante; la base fija ≈ 54 USD con 100 restaurantes y ≈ 138 con 1,000); precios de competidores con fecha; el margen por restaurante de paga ≈ 94 a 99 % antes de soporte y tu tiempo.
- **Es supuesto:** todo el valor para el dueño (tiempo del mesero, errores de comanda, rotación, ticket); cuánto pagaría cada tipo de negocio; cuántos restaurantes tienen más de 10 mesas; la tasa de conversión. Las cifras de AR que sostenían el caso en septiembre **no resistieron la revisión** (`Carta_Market_Analysis.md` §5.5).

**Los topes de hoy como razón de pago** (§3.2): **mesas sí**; platillos y lecturas de PDF son **guardas de costo**, no razones de pago, y el de platillos no debe cortar la importación; **personal (3)** y **6 por mesa** castigan al comensal o a la rotación de turnos más de lo que ayudan a cobrar: los dejo como los pusiste, pero pido un dato para confirmarlos (§6, preguntas 5 y 6).

**La prueba para el piloto (sin construir cobro)** (§5): al terminar las 6 semanas, cada restaurante activo recibe **una hoja con el plan Servicio a 349 pesos**. Tres respuestas posibles: paga el primer mes (transferencia, fuera de la app), firma una carta de compromiso, o dice que no y por qué. **Aprobado si al menos 3 de cada 10 restaurantes activos pagan o firman**; si no, la regla de §5.3 dice qué cambiar según la razón del «no». Con 10 restaurantes no se mide una curva de precio: es una prueba de sí o no, y se repite con los siguientes 10.

**Antes del piloto, gratis:** 5 a 10 entrevistas sin vender (§1.3) y unas consultas de lectura a la base para ver dónde chocarían los topes (§5.1).

**Lo que te toca decidir** (§6, con recomendación): 1. ¿cobrar en el piloto con transferencia o sólo carta de compromiso? 2. ¿Precio central 349 antes de IVA, y se muestra con o sin IVA? 3. ¿Existe el nivel «A medida»? 4. ¿Cuánto necesitas que ingrese al mes para que valga la pena (fija la meta de conversión)? 5. Personal: ¿3 o 5? 6. ¿Qué hacer con la mesa de 7 personas? 7. Tope de platillos: ¿después de la estadística? 8. Qué pasa si la fila de lecturas de PDF se llena (la regla ya la fijaste). 9. Fila de imágenes: ya la dejaste para después. 10. Anuncios, comisión y Carta+: fuera. 11. Descuento de «fundador»: no durante la prueba. 12. ¿Spec 002 ahora o después de la prueba?

---

## 1. Ancla de valor

### 1.1 Qué gana o ahorra el restaurante, en sus términos

Cada renglón es **[supuesta]** hasta una entrevista. «Qué cambia» es lo que la v1 ya hace o hará con la Fase 3 (documentos), no lo que el dueño gana en pesos.

| # | Palanca | Qué cambia con Carta (la v1) | Cómo se mediría en pesos | Qué se sabe | Cómo se probaría |
|---|---|---|---|---|---|
| V1 | **Tiempo del mesero** | La comanda llega al teléfono; el mesero no apunta ni repite; llamada de un toque (`01_Alcance` §3.3) | minutos por mesa × mesas por turno × lo que vale el minuto del mesero. **Ojo:** el mesero no se despide; lo que se gana es **capacidad** (atiende más mesas), así que el valor real entra por rotación (V3), no por nómina | **[supuesta]**: no hay medición de minutos por mesa. El piloto puede medir M4 (tiempo de escaneo a comanda) | Entrevista (§1.3, preguntas 3 y 4); en el piloto, M4 y observación de un turno |
| V2 | **Errores de comanda y alérgenos** | Orden escrita por el comensal; alérgenos por platillo y filtros guardados en su teléfono | platillos regalados o rehechos por errores al mes × costo del platillo; el riesgo de un incidente con alérgenos no se compra con pesos | **[supuesta]**; el diferenciador de alérgenos estructurados consta en `2026-09-20-olaclick-a-fondo.md` §10 (Ángulo 2): ni OlaClick, ni Fudo, ni Last.app, ni Waitry lo traen **[conocida, septiembre]** | Entrevista (pregunta 5); en el piloto, G1 (comandas perdidas) |
| V3 | **Rotación de mesa** | Se pide sin esperar al mesero; cuenta cerrada, pago validado y mesa limpia con candado (Spec 001) | mesas extra por turno en la hora pico × ticket de la mesa | **[supuesta]**; ticket de $500 MXN es un supuesto de septiembre (`2026-09-19-modelo-de-negocio-y-pagos.md` §3.4), no un dato mexicano. No hay estadística pública de rotación en México (`2026-11-13-planes...` §1.1) | Entrevista (pregunta 4); el piloto mide M4 y el ciclo de la Fase 3 |
| V4 | **Ticket promedio con fotos** | Foto o ilustración por platillo, «Top 3 del chef» | % de aumento del ticket × ticket × mesas | **No hay evidencia.** El «+22 %» era de un wine bar de Nueva York y el «+25 %» de un estudio del vendedor (`Carta_Market_Analysis.md` §5.5). Sin pagos, Carta no ve el ticket y el Alcance **sacó** esa métrica de la v1 (`01_Alcance` §1) | No prometerlo. Sólo se prueba cuando haya cuentas (v2) o con el reporte de ventas del propio dueño |
| V5 | **Carta siempre al día** | Cambiar un precio o agotar un platillo se ve en ≤ 60 s (AC-04.4, AC-27.1); alta de la carta desde PDF en < 10 min (S4, **conocida en staging el 11 de noviembre**) | reimpresiones evitadas × costo de impresión; platillos vendidos y no disponibles | **[supuesta]** el costo de imprimir una carta; el tiempo de alta sí es **[conocida]** (< 10 min) | Entrevista (preguntas 1 y 2) |
| V6 | **Que el piso no se descomponga** | Sin app, sin cuenta del comensal, PIN para el personal; el mesero no percibe carga extra (S6) | rotación de personal y capacitación evitadas | **[supuesta]**; S6 se valida en el piloto con entrevista a las 2 semanas | Entrevista al mesero antes y a las 2 semanas |

### 1.2 La mejor alternativa de hoy y lo que le cuesta al dueño

El punto de comparación del dueño no es «nada»: es la casilla más barata que ya tiene a mano.

| Alternativa | Qué hace | Precio | Fuente |
|---|---|---|---|
| Carta impresa | Se reimprime cuando cambia | costo de impresión **[supuesta]**: no consta en ningún documento | por preguntar (V5) |
| QR a un PDF (el generador de QR gratis) | Menú en pantalla, sin orden ni alérgenos | 0 | Soft Restaurant lo regala como captación (`2026-09-19-competencia-real-mexico.md` §2) |
| **OlaClick Gratis** | Menú QR, vista de mesero, comanda; **con publicidad** | 0 | `2026-09-20-olaclick-a-fondo.md` §3, §7.3 |
| Neolo (menú QR) | Menú QR, gratis hasta 200 visitas | 157 pesos al mes | **[fuente externa]** neolo.com/mexico/menu-qr, 13 nov 2026 |
| OlaClick Advanced | Sin anuncios, 75 pedidos al mes, dominio por un año | 9.90 USD ≈ 184 pesos | **[fuente externa]** pricing.olaclick.app, 13 nov 2026 (en septiembre: 200 pesos) |
| MenuTiger Regular | 500 pedidos al mes | 17 USD ≈ 317 pesos | **[fuente externa]** menutiger.com/es/pricing, 13 nov 2026 |
| OlaClick Premium | 400 pedidos al mes | 25 USD ≈ 465 pesos (500 en septiembre) | **[fuente externa]** y `olaclick-a-fondo` §3.1 |
| Fudo (POS) | Carta QR desde el plan Inicial; pedido desde la mesa desde el Avanzado | 360 / 690 / 1,050 al mes sin IVA | **[conocida, septiembre]** `competencia-real-mexico.md` §2; la página no abría el 13 de noviembre |
| Soft Restaurant (POS) | e-Menu QR (menú, orden y pago desde el celular) | Lite 799 / Pro 1,099 al mes + IVA | **[conocida, septiembre]** |
| Last.app (POS) | Punto de venta completo | 1,000 / 1,700 / 2,900 al mes + IVA por sucursal | **[fuente externa]** last.app/mx/precios, 13 nov 2026 |

**Lo que dice esta tabla.**

1. **La alternativa más cercana cuesta cero** y tiene lo básico (menú, mesero, comanda). Por un menú QR **no se puede cobrar** (`olaclick-a-fondo` §5: «está en cero pesos»). Carta sólo puede cobrar por lo que la alternativa gratis no hace: **orden compartida en vivo entre comensales, alérgenos estructurados, alta de la carta desde un PDF en minutos y un ciclo de mesa completo** (Spec 001). Ese es el «delta» que hay que valorar.
2. **Los POS cuestan 3 a 6 veces más** (690 a 1,100) pero resuelven otra cosa (cobrar, inventario, facturar). Carta **no sustituye al POS**: si el dueño ya paga un POS, Carta es un gasto adicional y debe pagarse con lo que ahorra en el piso. Eso baja la disposición a pagar y es el riesgo principal del precio.
3. Los competidores cobran por **cupo de pedidos** (OlaClick 75 / 400 al mes) o por **nivel de POS**; ninguno cobra por mesa como tal. Esa es una diferencia que se puede explicar en una frase.

### 1.3 Cómo conseguir las cifras de valor: 5 a 10 entrevistas sin vender

**Reglas:** preguntar por lo que pasó, no por lo que haría; no mostrar el precio; no demostrar el producto hasta el final; apuntar el número de mesas de cada uno (el dato que más pesa en §4). Dueños o gerentes de restaurantes de servicio completo y cafeterías: mezcla de tamaños, no sólo los del piloto.

1. ¿Cuántas mesas tiene y cuántos platillos y bebidas hay en la carta hoy? ¿Cuántas personas distintas trabajan de mesero en un mes?
2. ¿Cuándo fue la última vez que cambió un precio o quitó un platillo? ¿Cómo lo hizo, cuánto tardó y qué costó (impresión, diseñador, tiempo)?
3. En una hora pico, ¿cuántos minutos pasa un mesero con una mesa entre que se sienta y que toma la orden? ¿Y entre que pide la cuenta y que se va?
4. ¿Hay mesas que esperan lugar a la hora pico? ¿Cuántas veces a la semana y cuánto vale esa mesa en promedio?
5. ¿Cuántas veces a la semana regresan un platillo o se equivocan una orden? ¿Qué pasa con un cliente con alergia: cómo se entera el cocinero?
6. ¿Qué paga hoy cada mes en sistemas (POS, menú QR, reparto)? ¿Cuándo cambió por última vez de proveedor y por qué?
7. ¿Qué haría el último mes que pagó algo por primera vez para su restaurante (hizo cuentas, preguntó a alguien, lo probó)?
8. De lo que hoy paga, ¿qué dejaría si hubiera algo mejor y más barato? ¿Qué tendría que pasar para que lo cambie?
9. (Sólo al final, ya con el producto en la mano) ¿Qué parte le sirvió de verdad? ¿Qué le sobra? ¿Qué le falta para dejar de usar lo de hoy?

**Lo que cierra la ancla de valor:** el costo del minuto del mesero (pregunta 3 con el salario real que el dueño diga), mesas perdidas por rotación (4), errores al mes (5), costo de reimprimir (2) y qué paga hoy (6). Con eso V1, V2, V3 y V5 pasan de **[supuesta]** a **[conocida de una entrevista]**.

### 1.4 Qué tendría que ser cierto para que valga 349 pesos (sin inventar el valor)

En vez de poner un valor, la cuenta al revés: **lo mínimo que debe ocurrir para que 349 pesos al mes se paguen solos.** Los números son aritmética, no evidencia del beneficio.

| Si Carta logra… | …entonces 349 pesos al mes se pagan si | Cifra que falta |
|---|---|---|
| ahorrar tiempo del mesero (V1) | cada día se ahorran 10 minutos de mesero y el minuto vale ≥ 70 pesos la hora (349 ÷ 5 horas al mes) | lo que vale la hora del mesero para ese dueño |
| evitar errores de comanda (V2) | se evita **un** platillo regalado o rehecho al mes si cuesta ≥ 349 pesos; 2 si cuesta ≥ 175 | errores al mes y costo del platillo |
| ganar una mesa por rotación (V3) | entra **una** mesa más al mes de ≥ 349 pesos (con el ticket de 500 de septiembre, **menos de una mesa al mes**) | mesas esperando y ticket real |
| evitar reimprimir (V5) | se evita **una** reimpresión al mes que cuesta ≥ 349 pesos | costo y frecuencia de impresión |

**Lectura:** 349 pesos al mes son ≈ 11.6 pesos al día. Si el ticket del restaurante es de 500 pesos [supuesta], el plan central cuesta **menos de una mesa al mes**. Es un precio fácil de justificar **si el dueño ve el beneficio**; si no lo ve, ni 149 pesos le parecen baratos frente a OlaClick Gratis.

---

## 2. Modelo de cobro

### 2.1 Cuatro modelos frente al valor

| Criterio | Suscripción fija única | Por uso (comandas, escaneos) | **Por niveles de tamaño (mesas)** | Gratuito con subida |
|---|---|---|---|---|
| ¿Refleja cómo recibe el valor? | Poco: igual para 8 que para 40 mesas | **Sí en teoría**, pero castiga el éxito: el dueño preferiría que se escanee menos | **Sí**: más mesas, más valor y más capacidad de pago | Es una forma de entrada, no un cobro |
| ¿El dueño predice su factura? | Sí | **No**: cambia con el mes y con la temporada | **Sí**: el número de mesas casi no cambia | Sí |
| ¿Se explica en una frase? | Sí | Difícil (¿qué cuenta como uso?) | Sí: «10 mesas gratis; después, un precio fijo» | Sí |
| Fricción al empezar | Alta: pagar sin probar | Baja | **Baja**: se prueba completo | **La más baja** |
| ¿Se prueba en la v1 sin construir cobro? | Sí | Hay que medir uso (ya hay analítica) | **Sí**: el tope de mesas ya existe en el código (`MAX_MESAS_ACTIVAS`) | Sí |
| Precedente en el mercado | Fudo, Soft Restaurant, Last.app | OlaClick (cupo de pedidos), cuya reseña pública se queja del recorte | Poco (nadie cobra por mesa): una **diferencia** | OlaClick Gratis, Neolo (≤ 200 visitas) |
| Riesgo principal | Se queda fuera de los chicos | El dueño se resiste a la prueba; cobra distinto cada mes | El «escalón» de 10 a 11 mesas debe sentirse justo | Que nadie pase a pagar (conversión) |

**Elección: gratuito con subida por niveles de tamaño (mesas activas), cobrado como suscripción mensual fija.** Es la combinación de las filas 3 y 4. Razones:

1. **Refleja el valor:** una mesa más es un punto más del piso donde Carta ahorra tiempo.
2. **Predecible** para un dueño de microempresa (96 de cada 100 restaurantes son microempresas, INEGI-CANIRAC, `competencia-real-mexico.md`).
3. **Protege la adopción:** no se paga por usar más. El mesero y el comensal (los que hacen que funcione) nunca tocan el cobro.
4. **Ya está medido y vigilado por el código:** las mesas activas.
5. El tamaño también sigue al costo (una mesa grande pesa más en el servidor; `mapa-de-procesos-y-costos.md`: un paga al tope pesa ≈ 8 gratuitos).

**Lo que *no* es:** cobro por mesero ni por comensal (tú ya lo dijiste: meseros y capitanes no pagan) y cobro por comanda. Por mesa **activa** (no por mesa creada alguna vez) para que desactivar una mesa baje el cobro.

### 2.2 El lado del comensal (fuera de la v1)

**No cobrar al comensal.** Razones: (1) el comensal es el motor de la adopción: sin cuenta y sin instalar nada ni siquiera tienes una fricción que explicar; (2) la v1 y la regla dura 10 prohíben cuenta y datos personales; (3) el prototipo propone «Carta+» a 29 pesos al mes, que con Stripe deja ≈ 21 pesos netos (la comisión se come ≈ 14 %, `2026-11-13-planes...` §7.3) y sus beneficios (IA personalizada, AR, reservaciones, eventos) dependen de una cuenta y de productos que no existen; (4) el comensal ve Carta a ratos, en una mesa de un restaurante que no es suyo: no hay una relación recurrente con Carta que justifique una mensualidad.

**Capa del comensal, cuando exista cuenta (v2 o después):** lo único razonable es un perfil de alérgenos que viaje entre restaurantes, **gratis**, porque aumenta el valor del restaurante (V2) y por tanto lo que éste pagaría. Si algún día se cobra algo al comensal, se prueba antes con entrevistas, no con construcción. Marcado **fuera de la v1; no probable en el piloto**.

### 2.3 Ingresos que el prototipo insinúa

| Idea del prototipo | ¿Encaja? | Por qué |
|---|---|---|
| **Anuncios en el gratuito** (`admin-onboarding.jsx`, P21 paso 3: «con anuncios») | **No** | La v1 no tiene dónde ponerlos. Rinden **27 a 88 pesos al mes por restaurante [supuesta]** (`2026-09-19-modelo-de-negocio-y-pagos.md` §2.2; AdSense a 2.62 USD por mil vistas), más que el costo de un gratuito (≈ 2 a 10 pesos), pero ponen publicidad **ajena** en la carta del dueño (posiblemente de competidores), dañan «El Digital Sommelier» y son el motivo de pago que OlaClick ya explota («págame y te la quito»). Cuesta confianza por centavos. Se sustituye por la marca discreta «Hecho con Carta», que en vez de ingresos da **distribución** |
| **Comisión de 1.8 % por venta** («ya incluida en todos») | **No ahora; opción de v2** | Es el ingreso de mayor techo (en Toast, 82 de cada 100 pesos entran por pagos, `modelo-de-negocio` §1) pero exige tocar el dinero: Ley Fintech (capital de 4.4 millones de pesos y prisión si se hace sin autorización) o cargos directos de Stripe Connect; y sumaría 1.8 % encima de una tasa de tarjeta (3.4 a 3.6 % con procesadores de pasarela) que ya es más cara que la de un contrato bancario de restaurante (1.65 a 2.33 %) **[conocida: Banxico, jul 2026]**. Contradice «sin pagos» de la v1 |
| **Plan «Pro» a 249 y «Master Chef» a 799** (inconsistentes entre pantallas) | **Se sustituyen** por esta tabla | Los dos precios no tienen origen documentado; 249 estaba por debajo del plan central y 799 coincide con el piso de Soft Restaurant Lite |
| **Realidad aumentada, AR «ilimitado» como razón de pago** | **No** | Regla dura 14, ADR-011 y las cifras de AR no resistieron la revisión |
| **Carta+** (29 pesos) | **No** | §2.2 |

---

## 3. Planes

### 3.1 Tabla

El **comprador** y el **trabajo** son distintos en cada plan. Los precios son hipótesis [supuesta] que sólo la prueba de §5 puede mover.

| | **Gratuito** | **Servicio** (central) | **A medida** |
|---|---|---|---|
| **Comprador** | Dueño de fonda, taquería o cafetería chica; decide solo, casi sin presupuesto | Dueño o gerente de restaurante de servicio completo o cafetería de mejor volumen; ya paga algo por su operación | Gerente de salón grande, de hotel o de grupo; compra con una persona más |
| **Trabajo que contrata** | «Tener mi carta digital con QR y ver si mis mesas piden mejor» | «Que mi piso atienda más mesas con la misma gente, y que la carta nunca esté mal» | «Que Carta funcione en un lugar grande sin que yo tenga que armarlo» |
| **Mesas activas** | hasta 10 | hasta 25 *(propuesta; tu 40 vive en «A medida» hasta que los datos digan otra cosa)* | 26 a 40 y más |
| **Comensales por mesa** | 6 | 12 | 12 |
| **Personal activo** | 3 | 20 | 20 o más |
| **Platillos activos** | a definir con la estadística de cartas en curso | más | a definir |
| **Lecturas de PDF** | 3 en total, **por dueño**, una sola vez *(decisión de Calvin, 13 nov)* | sin número al mes: **fila prioritaria, sujeta a disponibilidad** *(decisión de Calvin)* | igual que el central |
| **Producto** | completo (orden compartida, alérgenos, comanda, mesero, ciclo de la mesa) | el mismo + sin marca «Hecho con Carta» + historial más largo + atención por WhatsApp | el mismo + alta hecha por nosotros + imágenes con prioridad (cuando existan) |
| **Precio** | 0 | **349 pesos al mes antes de IVA** *(≈ 405 con IVA)* | por hablar; **no se publica** |
| **Razón para subir** | Cruzar 10 mesas; o querer que su carta se vea «de él» (sin marca) | Cruzar 25 mesas; quiere que Carta le arme y le atienda | — (es el techo) |

**Plan central: Servicio.** Es el que paga la cuenta, el que enseña lo que Carta vale y el único que se prueba en el piloto. El gratuito existe para que haya a quién ofrecerlo (los 96 de cada 100 restaurantes son microempresas y sólo una fracción tiene más de 10 mesas); «A medida» existe para no regalar valor a los grandes y para conocer su precio hablando, no adivinando.

### 3.2 ¿Los topes de hoy son la razón correcta para subir?

Un tope es **razón de pago** si el dueño lo siente como «estoy creciendo y esto me sirve», y **guarda de costo** si sólo protege al servidor. Mezclarlos genera enojo: el dueño siente que le cobran por un límite artificial.

| Tope | Valor propuesto | ¿Razón de pago correcta? | Por qué | Qué hacer |
|---|---|---|---|---|
| **Mesas activas** | 10 → 25 (y 40+) | **Sí, la mejor** | Mide tamaño, valor y costo a la vez; el dueño lo cuenta sin pensar | Conservarla como motor. **El dato que más pesa es cuántos restaurantes objetivo pasan de 10 mesas**: no se conoce (§4.4). Si pocos pasan, no habrá ingresos |
| **Personal activo** | 3 → 20 | **No** | Un restaurante de 10 mesas con dos turnos tiene 4 o 5 meseros distintos; la **rotación de personal es alta** y el cupo de 3 se topa por turnos, no por crecimiento. No cuesta nada y Calvin dijo que meseros y capitanes no pagan | Mantener 3 hasta oír 5 entrevistas (pregunta 1). Si la mitad dice 4 o más, subir el gratuito a 5. Que **dar de baja** a alguien libere el cupo (ya es baja lógica) |
| **Comensales por mesa** | 6 → 12 | **No** | Castiga al **comensal** (el séptimo ve «mesa llena») en el momento en que el grupo grande es el mejor caso de uso de la orden compartida. Con 2.3 a 3 personas por mesa [supuesta, `2026-11-13-planes...` §1.3], pocas mesas pasan de 6 | Medir en el piloto cuántas sesiones llegan a 6 (§5.1). Si son < 5 %, el tope es inocuo; si son más, subir a 8 |
| **Lecturas de PDF** | 3 por dueño → fila prioritaria sin número | **No como razón de pago; sí como guarda de costo** | Es el **único costo directo** (0.11 a 0.64 USD con Opus 5.5, `2026-11-13-planes...` §3.5). Con «fila prioritaria, sujeta a disponibilidad» el costo queda acotado por la capacidad de la fila, no por un número al mes | Decidido por Calvin. Vigilar el gasto real de la API en el piloto (dato por conseguir, §9) |
| **Platillos activos** | a definir | **Depende** | Un restaurante de 80 renglones no es «más serio» que uno de 40; en las 12 cartas leídas el rango era de 14 a 65 sin bebidas, hasta ≈ 100 con bebidas (`planes` §1.2). Un tope bajo **corta la importación del PDF**, que es el momento mágico del producto (alta en < 10 min) | **No cortar la importación**: dejar importar todo y limitar sólo cuántos platillos pueden estar **activos** en el gratuito. Fijar el número con la estadística (el percentil 80 a 90 de las cartas del piloto) |
| **Historial** | 30 días → 12 meses | **Todavía no** *(aceptado por Calvin: 30 días / 12 meses)* | Hoy no hay reporte alguno que lo use (los analytics del restaurante están fuera de la v1); un historial que nadie ve no es razón de pago. Sí es guarda de costo (volumen de la base: 20 a 50 MB al mes por restaurante) | Mantener como guarda. **Cuando exista un reporte semanal** (hoy se hace con SQL en el piloto, `01_Alcance` §4), el historial se vuelve la razón natural del nivel de paga |
| **Fotos propias** | todas | **No** | Casi cero costo (≈ 0.005 USD por 100 fotos al mes) | No limitar |
| **Marca «Hecho con Carta» / dominio propio** | marca en el gratuito | **Sí** | Es orgullo y confianza: el dueño formal no quiere ajena su carta. OlaClick lo hace con el dominio y el menú sin publicidad (`olaclick-a-fondo` §3.2) | Conservarla como razón de pago |
| **Alta hecha por nosotros / soporte por WhatsApp** | no / sí | **Sí, y es la de más valor** | Ahorra tiempo **del dueño**, que es su recurso más escaso; pero cuesta tiempo de Calvin | Probar en el piloto si lo piden. Es el primer candidato a justificar el precio |
| **Imágenes y modelos 3D generados, con fila prioritaria** (idea de Calvin) | cola normal / prioridad | **Posible razón futura; fuera de la v1** | Se evalúa después (decisión de Calvin). Es el único lugar donde el costo por uso sería real (≈ 10.5 pesos por modelo 3D en la nube, `modelo-de-negocio` §1) | Dejar mencionada; no diseñar ni probar ahora |

**Conclusión de la revisión:** las razones correctas para pagar son **tamaño (mesas), imagen propia (sin marca), tiempo del dueño (alta asistida, soporte) y capacidad creativa (imágenes con prioridad, a futuro)**. El resto (platillos, PDF, historial, comensales por mesa) son **topes de protección** y deben fijarse para que un restaurante normal **nunca los sienta**.

---

## 4. Comprobación: disposición a pagar y economía por unidad

### 4.1 Rango de precio que aguantaría cada tipo de negocio

Todo **[supuesta]**; el origen de cada rango es el precio publicado de la alternativa más cercana. Se prueba con la pregunta 6 de §1.3 y con la prueba de §5.

| Tipo de negocio | Alternativa más cercana | Rango supuesto (pesos al mes, sin IVA) | Origen | Cómo se probaría |
|---|---|---|---|---|
| **Fonda, taquería (≤ 10 mesas)** | OlaClick Gratis, un PDF por QR | **0 a 160** | Neolo 157; el resto está gratis | Entrevistas; probablemente se queda en el gratuito |
| **Cafetería o restaurante casual (11 a 25 mesas)** | Neolo, OlaClick Advanced y Premium, MenuTiger | **180 a 470** | de 157 (Neolo) a 465 (OlaClick Premium) | Entrevistas y la prueba de §5 |
| **Restaurante lleno u hotel (26 a 40 mesas)** | Fudo Avanzado y Pro; Soft Restaurant | **500 a 1,100** | de 690 (Fudo) a 1,099 (Soft Restaurant Pro); son POS completos, así que Carta debería caer **por debajo** | Entrevistas con 2 o 3 grandes del piloto |
| **Formal / alta cocina** | Su sistema de reservas y su POS | **sin referencia** | no hay precio comparable; compra por imagen y control | Entrevista; podría ser «A medida» |

El **349** del plan central cae en el tercio bajo-medio del rango del casual (180 a 470). Es la cifra que ya existía en los documentos desde septiembre (`modelo-de-negocio`, `Carta_Market_Analysis` §4.2); **no tiene más origen que ése**. Si la prueba de §5 no la rompe, se mantiene.

### 4.2 Margen por restaurante de paga, con los costos medidos (conocida)

Costo en dólares al mes por restaurante, de `2026-11-13-planes-y-costo-por-restaurante.md` (§3.2, §6.3) y `mapa-de-procesos-y-costos.md` (rama `agente/mapa-de-procesos-y-simulador`, aún sin fusionar). **Margen de error ±2×** por el CPU de Railway no medido allí.

| Caso | Costo (USD/mes) | Margen a 349 pesos (18.74 USD) | % |
|---|---|---|---|
| Escala de 500 a 1,000 restaurantes (costo total ÷ restaurantes + 0.10 de lecturas) | ≈ 0.24 a 0.28 | ≈ 18.5 | **99 %** |
| Escala de hoy (≈ 55 restaurantes de paga caben en 2 procesos, `mapa` §4.9) | ≈ 1.12 | ≈ 17.6 | **94 %** |
| Peor caso razonable: restaurante grande + 10 lecturas de PDF en un mes con Opus 5.5 (ya no hay número al mes en paga: es el escenario si la fila no se acota) | ≈ 6.95 | ≈ 11.8 | **63 %** |

Lo que **no** incluyen estos márgenes: soporte, tu tiempo, el costo de vender (CAC), el IVA (16 %, tasa general; los precios de este documento son **antes** de IVA) y la comisión de cobro. Con tarjeta por Stripe (3.6 % + 3 pesos, `modelo-de-negocio` §3) la comisión sería ≈ 4.5 % de 349 pesos; con transferencia manual, 0. **El peor caso enseña dónde está el riesgo de costo: las lecturas de PDF sin tope, no el servidor.** Con Haiku 5.5 serían 40 a 50 veces menos (la precisión no está medida; ADR-014).

### 4.3 Cuántos gratuitos sostiene uno de paga

Margen del plan central ÷ costo por gratuito. Costo por gratuito: 0.51 USD en la escala de hoy (≈ 150 restaurantes) y 0.14 a 0.18 USD con 500 a 1,000 (`mapa` §4.9; `planes` §6.3).

| Escala | Gratuitos que sostiene uno de paga a 349 pesos |
|---|---|
| Hoy (≈ 150 restaurantes) | **≈ 35** |
| 500 restaurantes | **≈ 100** |
| 1,000 restaurantes | **≈ 130** |

Cálculo: (18.74 − 1.12) ÷ 0.51 ≈ 35; (18.74 − 0.24) ÷ 0.18 ≈ 103; ÷ 0.14 ≈ 132. Para que la base de gratuitos no cueste dinero neto, la conversión debe ser **≥ 3 % hoy** (1 de cada 35) y **≥ 1 %** a escala (1 de cada 100). Son las mismas conclusiones de `planes` §6.4 (≈ 104 gratuitos por uno de paga a 349) con el costo conservador de `mapa`.

### 4.4 Sensibilidad a la conversión de gratuito a paga

Ingreso mensual por **plan Servicio a 349 pesos**, con 150 y 1,000 restaurantes registrados (tabla del guion de esta sesión, pesos antes de IVA; entre paréntesis, dólares):

| Conversión | 150 restaurantes: pagan | Ingreso (pesos) | 1,000 restaurantes: pagan | Ingreso (pesos) |
|---|---|---|---|---|
| 1 % | 1.5 | 524 (28 USD) | 10 | 3,490 (187 USD) |
| 2 % | 3 | 1,047 (56 USD) | 20 | 6,980 (375 USD) |
| **3 %** | 4.5 | 1,570 (84 USD) | **30** | **10,470 (562 USD)** |
| 5 % | 7.5 | 2,618 (141 USD) | 50 | 17,450 (937 USD) |
| 10 % | 15 | 5,235 (281 USD) | 100 | 34,900 (1,874 USD) |

**Costo de la infraestructura para comparar** [conocida]: ≈ 60 a 80 USD al mes con 150 restaurantes; ≈ 95 a 370 USD con 1,000 (según el reparto gratuito/paga). Es decir:

- **La infraestructura se paga con una conversión de 2 a 3 % hoy y de 1 a 2 % a escala.** El costo no es la restricción.
- **Lo que no sale de esta tabla es tu ingreso.** Con 3 % de 1,000 son 10,470 pesos al mes antes de IVA y de soporte. Si la meta es vivir de esto, la pregunta no es el precio, es **cuántos restaurantes con más de 10 mesas se alcanzan** (pregunta 4 de §6).
- **Subir el precio vale más que subir la conversión en un punto:** pasar de 349 a 499 equivale a +43 % de ingreso con la misma conversión, pero sólo si el valor lo aguanta (§4.1).
- **Supuestos heredados de septiembre** (`Carta_Market_Analysis.md` §4.3): CAC ≈ 2,000 pesos, abandono mensual < 5 %, vida de 18 meses. Con 349 pesos y 94 % de margen, la recuperación del CAC es de **≈ 6 meses**; es aritmética de supuestos, **[supuesta]**, y en el piloto el CAC es tu tiempo, no dinero.

**El dato que cambia todo y no se conoce:** qué parte de los restaurantes a los que se puede llegar tiene **más de 10 mesas**. Si es 20 %, la conversión sobre el total registrado nunca llegará a 10 %; si es 70 %, el gratuito de 10 mesas es casi un regalo. Se mide en las entrevistas y con una consulta sobre el piloto (§5.1).

---

## 5. Prueba de precio barata para el piloto (sin construir cobro)

### 5.1 Qué se puede probar sin código nuevo

| Qué | Cómo | Lo que decide |
|---|---|---|
| **Dónde chocarían los topes** | Consultas de **sólo lectura** sobre la base del piloto: mesas activas por restaurante, personal activo y personas distintas por mes, platillos por restaurante, el máximo de miembros por sesión (cuántas sesiones llegan a 6 y a 12), importaciones por dueño | La elección de 10 / 25 mesas, 3 / 5 de personal, 6 / 8 por mesa, el tope de platillos |
| **El valor (V1–V5)** | Entrevistas de §1.3 antes y a las 2 semanas; M1–M4 y G1 de la analítica ya prevista (`01_Alcance` §1) | Cuáles cifras de valor pasan de supuestas a conocidas |
| **¿Pagarían?** | La oferta con precio de §5.2 | El sí/no y las razones |
| **Imágenes y 3D con prioridad** | Fuera de la v1 y fuera de esta prueba (Calvin la evaluará después) | — |

### 5.2 El experimento: «precio revelado» al final de las 6 semanas

Hecho con los restaurantes que usaron Carta **al menos 6 semanas** (la definición de **retención M5**, `01_Alcance` §1).

1. **Semana 0.** Entrevista (§1.3). Se registra el número de mesas.
2. **Semanas 1 a 6.** Uso real, sin precio ni topes (plan «piloto» sin límites). Se mide como siempre.
3. **Semana 6.** Se entrega a cada restaurante activo **una hoja de una página**: «Carta Servicio: 349 pesos al mes más IVA, hasta 25 mesas, sin marca». Se pregunta por escrito:
   - (a) *¿Lo contratas?*  **Sí, y pago el primer mes** · **Sí, firmo una carta de compromiso con fecha de inicio** · **No**
   - (b) Si no: *¿por qué?* (no me sirve / me sirve pero es caro / no lo decido yo / otra)
   - (c) Cuatro preguntas de precio (de menor a mayor): ¿a qué precio le parecería tan barato que dudaría de la calidad? ¿barato pero razonable? ¿caro pero lo consideraría? ¿tan caro que no lo contrataría?
4. **Cobro del primer mes** (sólo si decides cobrar, pregunta 1): transferencia o CoDi **fuera de la app**, con recibo o factura que tú resuelvas. La v1 no cobra; Calvin sí.

**Por qué precio revelado, en vez de comparar tres precios:** con 10 restaurantes, tres celdas de 3 o 4 no dan curva de demanda. Lo que sí da una sola oferta clara es el **sí/no con razón**, que es lo que se necesita para decidir.

### 5.3 Criterio de aprobado (fijado antes) y regla de decisión

**Se fija ahora, antes de ver cualquier respuesta:**

| Resultado (sobre los restaurantes activos al final de las 6 semanas) | Decisión |
|---|---|
| **≥ 30 %** pagan el primer mes o firman la carta (3 de cada 10) | **Aprobado.** Abrir la Spec 002 con Servicio a 349 pesos y los topes de §3 |
| **15 a 29 %** | **Repetir con el siguiente grupo de 10**, esta vez con **249 pesos** en la mitad de las hojas, y mismos criterios. No abrir la Spec aún |
| **< 15 %**, y la mayoría dice «**es caro**» o «**me sirve pero**» | El precio es el problema: probar 249 y, si tampoco, replantear el nivel central |
| **< 15 %**, y la mayoría dice «**no me sirve**» o «**no lo decido yo**» | **El problema es el valor o el comprador, no el precio.** Bajarlo no ayuda. Volver a §1 y a las razones de pago de §3.2; repetir la prueba con el comprador correcto |

**Límites honestos de la prueba:**

- Con 10 restaurantes, **un solo «sí» más o menos cambia 10 puntos**. El 30 % es una señal de salida, no una estadística; por eso la regla manda a repetir con el segundo grupo de 10 antes de comprometer el producto. Dos grupos con ≥ 30 % cada uno ya son evidencia mucho más sólida.
- Los restaurantes del piloto **ya te conocen**: dicen que sí por cortesía. La carta de compromiso **sola** infla el sí; el primer mes **cobrado** no. Por eso la recomendación es cobrar a los que firmen (pregunta 1).
- Los que tengan ≤ 10 mesas no tienen razón para pagar (se quedan en el gratuito) y **no cuentan** en el denominador; su respuesta «no» no es un «no» al precio. Se separan: `activos con más de 10 mesas` es el grupo que se mide.

---

## 6. Preguntas para Calvin

Cada una trae mi recomendación primero.

1. **¿Cobras en el piloto con transferencia fuera de la app, o sólo carta de compromiso?** *Recomendado: carta de compromiso con fecha y, a los 2 o 3 que firmen, cobrar el primer mes por transferencia.* El sí sin dinero está inflado por cortesía. Requiere que resuelvas cómo facturar, no que se construya nada.
2. **¿El precio central es 349 pesos al mes antes de IVA, y se muestra sin IVA?** *Recomendado: sí a 349 antes de IVA (≈ 405 con IVA), mostrando «más IVA»* como hacen Fudo y Soft Restaurant. Es la cifra heredada de septiembre y la prueba de §5 la confirma o la rompe.
3. **¿Existe el nivel «A medida» para grandes y hoteles?** *Recomendado: sí, sin precio de lista, sin construir nada.* Tu 40 mesas × 12 × 20 personas queda ahí hasta que haya datos; el plan central llega a 25 mesas. Si prefieres un solo plan de paga a 40, es viable, pero un restaurante de 40 mesas pesa ≈ 8 gratuitos en el servidor y paga lo mismo que uno de 12.
4. **¿Cuánto necesitas que ingrese al mes para que esto valga la pena?** *Recomendado: contestarlo antes de la prueba.* Fija la meta de conversión y de restaurantes con más de 10 mesas (§4.4). Si son 10,000 pesos al mes antes de IVA, hacen falta 30 restaurantes de paga a 349.
5. **Personal: ¿3 o 5 en el gratuito?** *Recomendado: dejar 3 y decidir tras 5 entrevistas* (pregunta 1 de §1.3). Los turnos y la rotación topan el cupo antes que el crecimiento; si la mitad tiene 4 o más meseros, 5.
6. **Seis por mesa: ¿qué se le muestra al séptimo comensal?** *Recomendado: «esta mesa llegó a su límite», con el menú visible* (que vea la carta sin entrar a la orden), y medir en el piloto cuántas sesiones llegan a 6; si son > 5 %, subir a 8.
7. **Tope de platillos: ¿después de la estadística?** *Recomendado: sí.* No cortar la importación del PDF; limitar sólo los platillos **activos** en el gratuito, con el percentil 80 a 90 de las cartas del piloto.
8. **Lecturas de PDF: decidido por Calvin** (3 en gratuito por dueño; en paga, fila prioritaria sujeta a disponibilidad). *Pendiente solo:* ¿qué pasa si la fila se llena? *Recomendado: mostrar el tiempo de espera estimado y nunca rechazar la lectura de un restaurante de paga.*
9. **Fila de espera de imágenes y modelos: ya decidido que se evalúa después.** Queda solo como posible razón futura para subir de plan (§3.2). *Recomendado: no tocarlo hasta tener un costo real por imagen.*
10. **¿Dejamos fuera anuncios, comisión por pago y Carta+?** *Recomendado: sí, los tres.* Razones en §2.2 y §2.3. «Hecho con Carta» sí, como marca discreta en el gratuito.
11. **¿Hay precio de «fundador» para los primeros que paguen?** *Recomendado: no durante la prueba* (ensucia el precio que se mide). Después de aprobar, ofrecer 3 meses al precio de lista gratis a los primeros 10 como agradecimiento.
12. **¿Abrimos la Spec 002 «Planes» ahora o tras la prueba?** *Recomendado: después de la prueba de §5,* con los topes que salgan de las consultas de §5.1. Antes sólo las tareas chicas de protección que ya recomendó `planes` §8 (tope mensual de lecturas de PDF).

---

## 7. Simulación (no es evidencia): tres dueños imaginarios ante la tabla de planes

**No son personas ni datos.** Son el ejercicio de ponerme en su lugar para que las entrevistas lleguen con mejores preguntas. No se usan en ninguna decisión.

- **Doña Lupe, fonda de 8 mesas, 3 meseros que rotan.** «¿Gratis y con todo? Va. Pero ¿por qué 3 personas? Tengo a mi hija y dos muchachos los fines de semana, y en vacaciones uno nuevo.» → Choca con el tope de personal (§3.2). *Aprendizaje: preguntar cuántos meseros distintos al mes.* No pagaría; se queda en el gratuito.
- **Julián, cafetería de 18 mesas con POS.** «Ya pago 360 por Fudo. ¿Esto es aparte? 349 más IVA es lo mismo otra vez. ¿Qué me quita Carta de Fudo?» → Es el riesgo de la comparación con el POS (§1.2, punto 2). *Aprendizaje: preguntar qué paga hoy y si Carta tendría que sustituir algo.* Pagaría si la orden compartida le llena la hora de desayuno.
- **Mariana, restaurante formal de 30 mesas en una zona turística.** «Con mi cena de 110 minutos no me importa la rotación. Me importa que el mesero no se equivoque con las alergias y que la carta se vea como mi restaurante. ¿Sin marca? Hecho.» → Compra por V2 y la marca, no por V3; pertenece a «A medida». *Aprendizaje: la razón de pago del grande es la imagen y los alérgenos, no la rotación.*

---

## 8. Cómo entraría al plan

**Nada se construye aquí.** Si Calvin aprueba la dirección:

1. **Antes del piloto, sin código:** las entrevistas (§1.3) y las consultas de lectura (§5.1).
2. **Durante el piloto:** la hoja de la semana 6 (§5.2) y la decisión (§5.3).
3. **Si aprueba:** `/especificar` → `docs/specs/002-planes/spec.md` con el modelo de §2, los planes de §3 y los topes revisados; se apoya en lo ya propuesto en `planes` §9 (columna `plan`, `limite_de_plan`, retención, pantalla «Mi plan»). **Cambia respecto a ese borrador:** el nivel central llega a 25 mesas, hay un nivel «A medida» sin precio de lista, el tope de platillos no corta la importación, y el personal no es razón de pago.
4. **Fuera de la Spec 002:** cobro con tarjeta (v2), cuenta del comensal y Carta+ (otra spec), comisión por pago (ADR de pagos).

---

## 9. Datos por conseguir (regla de Calvin: toda cifra con fuente)

Lo que sigue **no tiene dato** y por eso no se usa como si lo tuviera en ninguna decisión; está en el documento sólo como hipótesis o como umbral de decisión.

| Dato por conseguir | Dónde aparece | Cómo conseguirlo |
|---|---|---|
| Valor del minuto del mesero, errores de comanda, mesas perdidas por rotación, costo y frecuencia de reimpresión, ticket real | §1.1, §1.4 | Entrevistas de §1.3 (preguntas 2 a 5) |
| Cuántos restaurantes objetivo pasan de 10 mesas | §3.2, §4.4 | Pregunta 1 de §1.3 y consulta de mesas activas del piloto |
| Cuántas sesiones llegan a 6 y a 12 miembros | §3.2 | Consulta de lectura sobre `miembro_sesion` del piloto |
| Cuántos meseros distintos tiene un restaurante al mes | §3.2 | Pregunta 1 de §1.3 |
| Percentil de platillos por carta | §3.2 | Las cartas del piloto (en las 12 leídas: 14 a 65 sin bebidas) |
| Disposición a pagar por tipo de negocio (los rangos de §4.1 son sólo los precios de la alternativa más cercana) | §4.1 | Pregunta 6 de §1.3 y las cuatro preguntas de precio de §5.2 |
| Conversión de gratuito a paga | §4.4 | La prueba de §5; los porcentajes de la tabla son un barrido, no una predicción |
| CAC, abandono y vida de un cliente (heredados de `Carta_Market_Analysis.md` §4.3 como supuestos de septiembre) | §4.4 | Piloto: horas de Calvin por cliente; retención M5 |
| Gasto real de la API de Claude por lecturas de PDF | §3.2, §4.2 | Registro de importaciones del piloto × precio de la API |
| Precio real de impresión de una carta | §1.2 | Pregunta 2 de §1.3 |
| Capacidad con el servidor de hoy | §4.3 | **Ya con dato** (`mapa-de-procesos-y-costos.md`, en `master`): ≈ 148 gratuitos típicos, ≈ 65 gratuitos al tope (10 × 6) y ≈ 55 de paga típicos con la forma de hoy; sustituye a las cifras del informe de planes |

**Plan de Calvin hoy:** Railway **Hobby** y Cloudflare **gratuito** (dominio pagado: 25 USD, decisión de Calvin del 13 de noviembre). Mis tablas de costo parten de los precios y supuestos del informe de planes y de `mapa`; el **volumen de 5 GB del plan Hobby** (`planes` §6.3) es lo primero que limitaría el historial y apoya la retención de 30 días / 12 meses.

## Fuentes

- **Repositorio:** `docs/research/2026-11-13-planes-y-costo-por-restaurante.md` (costos, topes, competidores leídos el 13 de noviembre, precios incoherentes del prototipo); `2026-11-13-mapa-de-procesos-y-costos.md` (rama `agente/mapa-de-procesos-y-simulador`: capacidad, costo a 1,000 restaurantes); `2026-09-19-modelo-de-negocio-y-pagos.md`; `2026-09-19-competencia-real-mexico.md`; `2026-09-20-olaclick-a-fondo.md`; `docs/Carta_Market_Analysis.md` (§4.2 y §4.3, y §5.5 sobre las cifras de AR); `docs/plan/01_Alcance_v1.md`; `docs/specs/001-ciclo-de-la-mesa/spec.md`; `CLAUDE.md`.
- **Páginas leídas el 13 de noviembre de 2026** (en el informe de planes): neolo.com/mexico/menu-qr, pricing.olaclick.app, menutiger.com/es/pricing, last.app/mx/precios. **Septiembre, no releídas:** Fudo, Soft Restaurant.
- **Método:** Founder OS, Adam M. Adamek, Impact Brussels ASBL, licencia CC-BY-4.0 (resumen recibido en el encargo; las skills `founderos:*` no estaban disponibles en la sesión).
- **Aritmética de §4.2 a §4.4:** calculada en esta sesión con el tipo de cambio de 18.6188; se puede recalcular con las fórmulas descritas en cada tabla.
