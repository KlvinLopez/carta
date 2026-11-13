# Comparativo de precios, anuncios y oferta para el piloto: ¿por qué 349 pesos y se sostiene solo?

**Fecha:** 13 de noviembre de 2026 · **Rama:** `agente/comparativo-de-precios` · **Estado:** investigación y borrador para decidir. No toca `app/`, `frontend/`, `migrations/` ni documentos de plan (salvo una fila en `04 §11`). La v1 no cobra ni muestra anuncios. Datos de precios en [`2026-11-13-comparativo-de-precios-y-anuncios-datos.csv`](2026-11-13-comparativo-de-precios-y-anuncios-datos.csv).

**Marcas de cada cifra.** **[fuente externa]** = página leída el 13 de noviembre de 2026, con enlace. **[documento]** = lo dice un documento del repositorio (se nombra). **[dato de Calvin]** = captura de «Usage by Project» de Railway del 13 de noviembre (≈ 04:35 UTC). **[supuesta]** = juicio mío, con cómo se probaría. **[derivada]** = aritmética mía sobre las anteriores.

**Tipo de cambio.** 1 USD = 18.6188 MXN, FIX de Banxico del 12 de noviembre **[documento: `planes-y-costo-por-restaurante` §3.5]**, el mismo de los costos del simulador. Como contraste: 18.6906 MXN por USD y 0.90245 EUR por USD (Frankfurter, referencia del BCE del 12 de noviembre, `api.frankfurter.dev`, leída el 13 de noviembre) **[fuente externa]**, es decir 0.4 % de diferencia. Para los euros (Waitry) uso 20.711 MXN por EUR **[derivada]** de esas dos cifras. Todos los precios de este informe son **antes de IVA** (16 %, tasa general); donde la página no dice si lleva IVA, lo digo.

**Lo que no pude leer.** OpenTable (la página oficial de México no abrió desde esta sesión: sin conexión), Parrot y Wansoft (sus páginas oficiales no publican precio) y Waitry en pesos (la página de México muestra euros). Está dicho en cada caso; no lo relleno.

---

## 0. Para Calvin

**¿Por qué 349?** Aparece por primera vez el 4 de abril de 2026 en `Carta_Market_Analysis.md` (§4.2), como «$349 MXN/mes ≈ USD $20» para un «plan Pro», junto a una referencia genérica de «SaaS de restaurantes: 20 a 200 USD al mes»; no hay ninguna cuenta ni lectura de precios detrás **[documento, historial de git]**. Es un número redondo en dólares convertido a pesos. Hoy lo contrasté con 10 planes de entrada de la competencia leídos en sus páginas.

**Dónde cae.** De 10 planes de entrada, 4 cuestan menos que 349 (Neolo 157, OlaClick Advanced 184, Meniu 225, MenuTiger Regular 317) y 6 cuestan más (Poster 550, Fudo 652, Soft Restaurant Cloud 699, Soft Restaurant 12 Lite 799, Last.app 1,000, Waitry 1,243). Es el **percentil 40 a 50**: **arriba de las herramientas de menú QR y pedidos (mediana 225) y a la mitad del precio de un punto de venta completo (mediana de los POS: 699)**. Esa es la parte que me importa: Carta **no es un punto de venta, no cobra y no factura**; compite con la casilla de menú QR, no con Soft Restaurant.

**Qué rango recomiendo.** **Precio de lista 349 antes de IVA; rango defendible 249 a 449.** Por debajo de 249 ya estás en la zona de OlaClick y Neolo, que ofrecen menú QR casi gratis; por encima de 449 te acercas al POS más barato (Poster, 550) sin cobrar ni facturar. Es un juicio **[supuesta]**; lo que lo confirma o lo rompe es la prueba de la semana 6 de la estrategia de precios, no este informe. Los competidores dicen cuánto **cobran**, no cuánto **vale** Carta para un dueño.

**Oferta para el piloto (§4).** Gratuito para todos, y a quien contrate el plan de paga: **el primer mes gratis y los 3 siguientes a 175 pesos (50 %), con el precio de lista 349 escrito en la hoja y congelado 12 meses**. Se ofrece **después** de que el dueño contestó la pregunta de precio a 349, no antes, para no ensuciar la prueba. A cambio: transferencia por adelantado, una entrevista de 20 minutos y permiso de contar su caso.

**Anuncios (§5): hoy no.** Con el rendimiento publicado, un restaurante típico (1,800 visitas al mes) dejaría **entre 7 y 103 pesos al mes** (techo de septiembre, no verificable: 263), contra un costo de infraestructura de **1 a 8 pesos al mes** por restaurante. Si el rango fuera cierto cubrirían la operación, pero **la cifra de pesos por mil visitas no existe publicada para México con fuente fiable**. Los anuncios de las redes grandes **rastrean al comensal**, chocan con la regla dura 10 y con la política de cabeceras de seguridad. Mi recomendación: **no ponerlos en el piloto; después, sólo patrocinio directo sin rastreo**, y si algún día se prueban, con la meta de visitas medida (la analítica de `scan` ya existe), no con «10,000 usuarios» a ojo.

**¿Se sostiene solo todo gratuito?** **Sin ingresos, no:** hoy Carta cuesta ≈ 11.6 USD al mes (≈ 216 pesos) con cero restaurantes, y 24 a 119 USD con 150 a 1,000 gratuitos (forma de hoy). Alguien tiene que pagarlo. **Pero la infraestructura es barata de cubrir con pagos:** **un solo restaurante de paga a 349 (18.74 USD) cubre toda la infraestructura de hoy y hasta ≈ 90 gratuitos**; con 500 gratuitos bastan 4 de paga (0.7 %), con 1,000 bastan 7 (0.7 %). **Con conversión de 3 % ya sobra**: a 1,000 restaurantes quedan ≈ 440 USD al mes (≈ 8,200 pesos). Condiciones: que la gente de verdad pague (hay que probarlo), que no se desborde la fila de lecturas de PDF (costo directo de 0.11 a 0.64 USD por lectura) y que se pase a Railway Pro antes de los 5 GB de disco.

**Lo que no cubre ningún escenario:** tu tiempo, soporte, el costo de vender, impuestos sobre la renta ni factura. Con 1,000 restaurantes y 3 % de conversión entran ≈ 10,470 pesos al mes antes de IVA: es un ingreso complementario, no un sueldo.

**Te toca decidir (§7):** 1. precio de lista (¿349?) · 2. la forma de la oferta del piloto · 3. anuncios: ¿no hasta tener datos? · 4. conseguir 3 datos baratos: factura de Railway completa del mes, visitas reales del piloto, y cotización de OpenTable por teléfono.

---

## 1. Precios de hoy, leídos en la página de cada proveedor

Todo **[fuente externa]**, leído el **13 de noviembre de 2026**. La tabla resume; el CSV trae plan por plan con límites y enlace. «MXN/mes» es el equivalente en pesos al tipo de cambio de arriba.

| Proveedor | Qué es | Plan de entrada | MXN/mes | IVA | Por | Enlace |
|---|---|---|---|---|---|---|
| **Neolo** | menú QR | gratis hasta 200 visitas; **Plan 0** | **157** (78.36 si paga anual) | no dice | negocio | [neolo.com/mexico/menu-qr](https://www.neolo.com/mexico/menu-qr) |
| **OlaClick** | menú QR + pedidos + POS | **Advanced** 9.90 USD (lista 12); Premium 25; Elite 59; Impulso 160 | **184** · 465 · 1,099 · 2,979 | no dice | negocio | [pricing.olaclick.app](https://pricing.olaclick.app) |
| **Meniu** | menú QR + POS | **Business** (un solo plan; prueba de 7 días) | **225** (≈ 169 anual, según el 26 % de ahorro) | no dice | negocio | [meniuapp.com/es/plans](https://meniuapp.com/es/plans) |
| **MenuTiger** | menú QR + pedidos | **Free** 0 (75 pedidos); **Regular** 17 USD (500 pedidos); Advanced 46; Premium 119 | 0 · **317** · 857 · 2,216 | no dice | negocio | [menutiger.com/es/pricing](https://www.menutiger.com/es/pricing) |
| **Waitry** | carta + pedido y pago en mesa | **Lite** 0 (sólo carta); **Premium** 60 EUR (48 anual) | 0 · **1,243** (994 anual) | sin IVA | negocio | [waitry.net/es-mx/precios](https://waitry.net/es-mx/precios) |
| **Poster** | POS | **Mini** 550 (495 pagando anual); Business 930; Pro 1,310 | **550** · 930 · 1,310 | sin IVA | negocio | [joinposter.com/mx/pricing](https://joinposter.com/mx/pricing) |
| **Fudo** | POS | **Avanzado** 35 USD; Pro 45 (módulo de mesas +5, cocina +10) | **652** · 838 | no dice | negocio | [fu.do/precios](https://fu.do/precios) |
| **Soft Restaurant Cloud** | POS en la nube | **Lite** 699 (349 sólo si cobra más de 50,000 en tarjeta con ellos); Pro 999; Enterprise 1,599 | **699** · 999 · 1,599 | + IVA | empresa | [softrestaurant.com/cloud](https://softrestaurant.com/cloud) |
| **Soft Restaurant 12** | POS instalado | **Lite** 799 (639 con su terminal); Pro 1,099 | **799** · 1,099 | + IVA | licencia | [softrestaurant.com/soft-restaurant-precio](https://softrestaurant.com/soft-restaurant-precio) |
| **Last.app** | POS | **Starter** 1,000; Growth 1,700; Unlimited 2,900; instalación 4,000 | **1,000** · 1,700 · 2,900 | + IVA | sucursal | [last.app/mx/precios](https://last.app/mx/precios) |
| **Loyverse** | POS gratis | gratis; complementos 7 a 25 USD por tienda | 0 | sin IVA | tienda | [loyverse.com/pricing](https://loyverse.com/pricing) |
| **OpenTable** | reservaciones | **no se leyó la página oficial**. Fuente secundaria (blog de Eat App, un competidor): 149 / 299 / 499 USD más 1 a 1.50 USD por cubierto de la red, «sólo en EE. UU.». GetApp México: «precio inicial 149 USD» | ≈ 2,774 / 5,567 / 9,291 | no dice | restaurante | [blog de Eat App](https://restaurant.eatapp.co/blog/opentable-pricing), [GetApp](https://www.getapp.com.mx/software/2044651/opentable-for-restaurants) |
| **Parrot** | POS | **no publica precio** (cotizar). Un competidor afirma 1,800 / 2,100 / 2,800 + IVA: no verificado | — | — | — | [parrotsoftware.com.mx](https://parrotsoftware.com.mx) |
| **Wansoft (de Clip)** | POS | **no publica precio**; planes Básico, Inventarios, Pro; «mes trabajado es mes pagado» | — | — | — | [wansoftpos.com](https://www.wansoftpos.com/) |

**Qué cambió frente a septiembre [documento: `competencia-real-mexico` §2, `olaclick-a-fondo` §3].**
- **Fudo** ya no publica en pesos: antes 360 / 690 / 1,050 MXN, hoy 35 y 45 USD (652 y 838 MXN), y sus «módulos» son aparte. La página no dice si el precio lleva IVA ni para qué país es (la ruta `/mx/precios` da 404).
- **OlaClick Advanced** bajó de 200 a 9.90 USD (184 MXN); Premium de 500 a 25 USD (465). La página de hoy **no lista un plan gratuito**; el plan gratuito con anuncios que describe septiembre no lo pude reconfirmar.
- **Soft Restaurant** tiene dos productos: el POS instalado (799 y 1,099 + IVA) y el Cloud (699, 999, 1,599 + IVA). Las cifras «de 349» solo valen si el restaurante cobra con su terminal. La página tiene un selector Mensual/Anual y el texto no dice a cuál pertenece la cifra mostrada. Su **Menú Digital** es un complemento y la página no publica su precio.
- **Meniu**: su selector de periodo no cambió la cifra al leerla con navegador; tomo 225 como lo mostrado.
- **Dos páginas de Poster**: 495 si se paga anual y 550 si es mensual (Mini); uso 550 como el plan de entrada mensual.

**Otras opciones gratuitas para QR:** Neolo (200 visitas), MenuTiger Free (75 pedidos al mes, 1 local), Waitry Lite (sólo carta), Loyverse (POS sin menú QR). No busqué más: hay decenas de creadores de QR y no son comparables.

---

## 2. Qué cubre cada uno frente a la v1 de Carta

**Carta no es punto de venta: no cobra, no factura, no lleva inventario ni cierre de caja** (`01_Alcance_v1`). Hace menú por QR con fotos, orden compartida, comanda al teléfono del mesero, ciclo de la mesa (Spec 001), alérgenos y alta desde PDF. Lo que sigue es lectura de las páginas de §1 y de los documentos de septiembre; ✓ = lo dice la página, ✗ = no lo dice, ? = no pude confirmar.

| | Menú QR con fotos | Orden compartida entre comensales | Comanda al teléfono del mesero | Ciclo de la mesa | Alérgenos estructurados | Alta desde PDF |
|---|---|---|---|---|---|---|
| **Carta v1** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Neolo | ✓ | ✗ | ✗ | ✗ | ✓ («alérgenos e ingredientes») | ✗ |
| OlaClick | ✓ | ✗ | ✓ (vista de mesero) | ✗ | ✗ [septiembre] | ✗ |
| Meniu | ✓ | ✗ | ✓ (POS) | parcial (mapa de mesas) | ✗ | ✗ |
| MenuTiger | ✓ | ✗ (cada quien pide) | ✓ | sólo en Premium (119 USD) | ✗ | «creador de menús con IA» (de menú físico, no PDF) |
| Waitry | ✓ | ✗ | ✓ | ? | ✗ | ✗ |
| Fudo | ✓ (Carta QR) | ✗ | ✓ | sí, con módulo de mesas | ✗ | ✗ |
| Soft Restaurant | ✓ (Menú Digital, complemento) | ✗ | ✓ (tableta del mesero) | sí (POS) | ✗ | ✗ |
| Last.app | ✓ | ✗ | ✓ | sí (POS) | ✗ | ✗ |
| Poster | ✓ | ✗ | ✓ (Business) | sí (POS) | ✗ | ✗ |
| OpenTable | ✗ | ✗ | ✗ | sólo reservas | ✗ | ✗ |

Lectura: **ninguno de los que leí dice tener orden compartida de la mesa ni alérgenos estructurados por platillo con filtro en el teléfono** (Neolo trae alérgenos, pero como contenido del menú). El resto lo hacen todos. Esa es la diferencia que se puede explicar, y es lo que el precio de 349 tiene que sostener. **Aviso:** «✗» significa «la página no lo menciona», no «no existe»; quedó por confirmar con una demo de cada uno (dato por conseguir).

OpenTable es otra categoría: reservaciones con cobro por cubierto de la red. Se cita porque Calvin lo pidió; no compite con Carta y su precio no se puede comparar.

---

## 3. ¿Por qué 349? Origen, posición y qué recomiendo

### 3.1 De dónde salió **[documento]**
- `docs/Carta_Market_Analysis.md`, versión del 4 de abril de 2026 (commit `bbd5c77`), líneas 57 y 229: «Plan Pro: $349 MXN/mes (~USD $20)», con «analytics, platillos ilimitados, sin branding Carta…»; la línea 238 lo compara con «Restaurant SaaS: $20–$200 USD/mes» sin citar fuente. De ahí sale la cuenta de mercado de 248 millones de pesos, que depende de cifras de AR que «no resistieron la revisión» (§5.5 del mismo documento).
- `2026-09-19-modelo-de-negocio-y-pagos.md` y `competencia-real-mexico.md` heredan el 349 («la mensualidad de $349 que Carta pensaba cobrar») sin volver a calcularlo. **Coincidencia, no origen:** el plan Pro de Meshy (generador de modelos 3D, ya fuera de la v1) también cuesta MX$349 en el mismo documento; no hay nada que los relacione.
- `2026-09-19-competencia-real-mexico.md` §4 ya advirtió: *«Carta a $349 es un sobreprecio encima de lo que el restaurante ya paga, no un ahorro»* y que «el punto medio es el peor lugar». La estrategia de precios del 13 de noviembre lo conservó como hipótesis: «no tiene más origen que ése».

**Conclusión: 349 es USD 20 convertidos a pesos en abril, sin medición de precios detrás.** Esto no la hace mala; la hace una hipótesis.

### 3.2 Dónde cae hoy **[derivada de §1]**
Planes de entrada de pago, MXN al mes antes de IVA, ordenados: 157, 184, 225, 317 · **(349)** · 550, 652, 699, 799, 1,000, 1,243. Cuatro por debajo y seis por encima: **percentil 40 de 10**. Además, cuatro proveedores ofrecen un plan gratuito (Neolo, MenuTiger, Waitry y Loyverse), contra el cual 349 siempre es más caro.

| Grupo | Planes de entrada | Mediana | Vecinos de 349 |
|---|---|---|---|
| Menú QR y pedidos sin POS | 157, 184, 225, 317, 465 (Premium de OlaClick) | **225** | por abajo: MenuTiger Regular **317**; por arriba: OlaClick Premium **465** |
| POS | 550, 652, 699, 799, 1,000 | **699** | Poster Mini **550** |
| Con pedido y pago en mesa propio | Waitry Premium 1,243 | — | — |

**Dónde 349 está raro:** **por encima de todo el grupo de menú QR (mediana 225) y por debajo de todo el POS (mínimo 550)**. Se justifica sólo si el dueño percibe la orden compartida, los alérgenos y la comanda directa como más que un menú QR; si los ve como un menú QR, 349 es caro (el 317 de MenuTiger Regular incluye 500 pedidos y POS integrado).

### 3.3 Qué recomiendo
- **Precio central: 349 antes de IVA (≈ 405 con IVA).** No hay dato que lo rompa y está dentro del rango de lo que hoy se paga. **[supuesta]**
- **Rango: 249 a 449.** Piso 249: debajo de eso se compara uno con Neolo y OlaClick Advanced, que ofrecen menos pero casi gratis. Techo 449: arriba de eso el siguiente peldaño es un POS completo de 550.
- **Dato vs. juicio.** **Dato:** los precios de §1 y el percentil. **Juicio:** que Carta valga más que la mediana de menú QR (225). El juicio se prueba con la hoja de la semana 6 (estrategia de precios §5) y se separa en la 2.ª ronda: la mitad de las hojas a 249 si el resultado cae entre 15 y 29 %.
- **Dos riesgos del 349 que los datos de hoy confirman:** (a) el dueño que ya paga POS ve a Carta como un gasto adicional (Fudo 652 o Poster 550 ya incluyen menú QR); (b) la competencia gratuita (MenuTiger Free: 75 pedidos al mes, pedidos por QR) existe y es más fuerte que en septiembre.
- **Costo no manda:** a 349 el margen sobre costo variable es 94 a 99 % **[documento: `estrategia-de-precios` §4.2]**; el precio lo decide el valor, no el costo.

---

## 4. Oferta para el piloto: gratuito y un plan de paga con descuento

### 4.1 El choque a resolver
La estrategia de precios (§5 y pregunta 11) pide **medir la disposición a pagar a 349 de lista** al final de las 6 semanas y recomienda **no** dar descuento de «fundador» durante la prueba, porque ensucia el precio que se mide **[documento]**. Calvin quiere un descuento de lanzamiento. Se concilian **separando el orden de las dos preguntas**.

### 4.2 Forma propuesta
1. **Semanas 1 a 6:** todos los restaurantes usan Carta gratis y completa («plan piloto» sin topes), como ya está en la estrategia.
2. **Semana 6, primera hoja (la que mide):** «Carta Servicio: 349 pesos al mes más IVA». Se pregunta lo de siempre (paga, firma, no; y las cuatro preguntas de precio). **En esa hoja no aparece ningún descuento.**
3. **Segunda hoja, sólo para quien dijo «sí» o «sí, pero es caro»:** *«Precio de lanzamiento: primer mes gratis y 3 meses a 175 pesos (50 %). Después, 349. El precio de lista se congela 12 meses.»* El descuento es un **premio por decidir rápido**, no el precio.
4. **A cambio (condiciones):** pago por transferencia el día 1 (el primer mes es gratis, pero se firma la carta); una entrevista de 20 minutos a los 30 días; permiso para citar el caso (sin cifras). Se puede cancelar cuando quiera (flexibilidad).
5. **Quien dijo «no, es caro»:** se registra el «no» limpio y **después** se le ofrece la segunda hoja si Calvin quiere; así el «no» sigue siendo evidencia.

**Por qué conserva la prueba:** lo que se mide (la respuesta a la hoja 1) se contesta sin descuento; el descuento sólo mueve a los que ya dijeron que sí. Se registra por separado cuántos aceptaron **sin** el descuento y cuántos cambiaron de «no» a «sí» **con** él (ésa es otra señal útil: sensibilidad al precio).

### 4.3 Cuánto cuesta el descuento **[derivada]**
Primer mes gratis (349 no cobrados) + 3 meses a 50 % (3 × 174.5 no cobrados) = ≈ 872 pesos (47 USD) de ingreso no cobrado por restaurante que la acepte; si aceptan 3 de 10, ≈ 2,620 pesos (141 USD). El costo variable de un restaurante es de 1 a 8 pesos al mes **[documento]**: la oferta no genera pérdida por costo, sólo ingreso no cobrado.

### 4.4 Cuidar
- **No se anuncia el precio de lanzamiento como «el precio»**: la hoja dice 349; el descuento va aparte y con fecha.
- **Una sola oferta de lanzamiento por restaurante.** Si el descuento es público y repetible, se vuelve el precio de lista.
- **El criterio de aprobación (≥ 30 % paga o firma) se mide con la hoja 1.** El cobro real del mes 2 (a 175) se registra aparte: ahí se ve quién paga de verdad.

---

## 5. Anuncios: cuánto rendirían, cuántos hacen falta y qué riesgo traen

### 5.1 Qué hay publicado y qué no
- **Lo que no existe en abierto:** un CPM o RPM de web móvil **para México** de una fuente primaria. eMarketer («Mexico Mobile Ad CPM») y Statista (eCPM por sistema, marzo de 2024) lo tienen tras suscripción o enmascarado **[documento: `modelo-de-negocio-y-pagos` §2.2, consultado en septiembre]**; hoy volví a buscar y tampoco apareció (búsqueda del 13 de noviembre).
- **Lo que sí hay, con baja fiabilidad:** una guía de referencia de CPM de **compra** en subasta abierta que da **0.60 a 1.50 USD por mil impresiones para México**, citando de forma vaga a eMarketer e IAB México, sin metodología ni fecha de lectura de los datos [adscalculator.xyz](https://adscalculator.xyz/blog/global-programmatic-display-cpm-benchmark-by-country-2025/) **[fuente externa, débil]**. Es lo que paga el anunciante en promedio, no lo que recibe un sitio.
- **Reparto de Google AdSense (primario):** el publicador se queda con **≈ 68 %** de lo que gasta el anunciante cuando compra con Google Ads, y 80 % después de la comisión de la plataforma del anunciante; es igual sin importar el país [support.google.com/adsense/answer/180195](https://support.google.com/adsense/answer/180195) **[fuente externa]**. Mínimo para que empiece a acumular pago: 10 USD de ganancias [support.google.com/adsense/answer/1709858](https://support.google.com/adsense/answer/1709858) **[fuente externa]**; el umbral de pago en sí no lo muestra esa página.
- **Techo de septiembre (calculadora de AdSense, categoría comida y bebida, región Américas, que incluye a EE. UU.):** 2.62 USD por mil vistas de página **[documento: `modelo-de-negocio-y-pagos` §2.2, 19 de septiembre; no pude releer la calculadora hoy]**. No es de México.
- **Inversión publicitaria (contexto):** Valor Total Media 2024, citado por la prensa: 81,720 millones de pesos en publicidad digital en México en 2024, 58.2 % del total **[fuente externa secundaria: búsqueda del 13 de nov; no abrí el estudio del IAB/CIM]**; el comunicado de INEGI cuenta 100.2 millones de usuarios de internet en México y 97.2 % entra por celular **[documento: `modelo-de-negocio-y-pagos` §2.3, ENDUTIH 2024]**. Son cifras de mercado, no de lo que paga un sitio chico.

### 5.2 Los cálculos **[derivada]**, con cada supuesto a la vista
Ingreso por mil visitas = impresiones por visita × CPM de compra × 0.68 de reparto × relleno. (Una «visita» es una entrada a la carta; así la mide la analítica de `scan`.)

| Escenario | Impresiones por visita **[supuesta]** | CPM de compra, USD **[fuente externa, débil]** | Reparto **[fuente externa]** | Relleno **[supuesta]** | USD por mil visitas | **MXN por mil visitas** |
|---|---|---|---|---|---|---|
| Bajo | 1 | 0.60 | 0.68 | 50 % | **0.20** | **3.8** |
| Medio | 2 | 1.00 | 0.68 | 80 % | **1.09** | **20** |
| Alto | 3 | 1.50 | 0.68 | 100 % | **3.06** | **57** |
| Techo (calculadora de septiembre, región Américas) | 3 | 2.62 ya es por mil vistas | — | 100 % | 7.86 | 146 |

- *Impresiones por visita y relleno* son **supuestos míos**: no hay dato. Se prueban con 2 semanas de un anuncio de prueba en un restaurante del piloto (con aviso al dueño), midiendo impresiones y pago reportados por la red. Mientras tanto la tabla es un rango, no una predicción.
- *El «medio» ya es generoso para una app sin contenido de lectura:* un comensal que ve la carta de un restaurante y pide no produce tantas vistas de página como un sitio de noticias.

**Por restaurante al mes.** Con 1,800 visitas al mes (restaurante chico o mediano) y 4,500 (grande) **[documento: `planes-y-costo-por-restaurante` §0; supuesto de ese informe, no medida]**:

| Escenario | Restaurante típico (1,800 visitas) | Grande (4,500 visitas) |
|---|---|---|
| Bajo | **7 pesos** (0.37 USD) | 17 pesos |
| Medio | **36 pesos** (1.96 USD) | 91 pesos |
| Alto | **103 pesos** (5.51 USD) | 256 pesos |
| Techo | 263 pesos (14.15 USD) | 658 pesos |

**Contra lo que cuesta un restaurante gratuito:** 1 a 8 pesos al mes de costo variable **[documento: `planes-y-costo-por-restaurante` §0]**. En el caso medio, un gratuito típico deja **≈ 36 pesos de ingreso por 1 a 2 de costo variable** (chico y mediano); en el bajo, 7 contra 1 a 2, y un restaurante grande (7.5 de costo) casi no cubre el suyo (17). Lo que pesa de verdad es el costo fijo (§6.1).

### 5.3 Umbrales: ¿cuándo pagarían la operación?
Con el costo fijo de hoy (11.6 USD al mes, §6.1) y 1,800 visitas por restaurante **[derivada]**:

| Escenario | Visitas al mes para cubrir el costo fijo | Equivale a restaurantes típicos |
|---|---|---|
| Bajo | ≈ 56,800 | ≈ 32 |
| Medio | ≈ 10,600 | ≈ 6 |
| Alto | ≈ 3,800 | ≈ 2 |
| Techo | ≈ 1,500 | ≈ 1 |

- **«10,000 usuarios» (lo que dijo Calvin):** 10,000 visitas al mes dejan **2 USD en el bajo, 11 USD en el medio y 31 USD en el alto** (≈ 38, 203 y 570 pesos). Con el costo fijo de 11.6 USD, esa meta **casi cubre** la operación en el medio (10.9 USD) y sobra en el alto. «Usuarios» no está medido hoy: Carta no tiene cuenta ni identificador de persona; lo que existe es `scan` por miembro y minuto (visitas).
- **«70 % de la capacidad» (≈ 104 gratuitos típicos, de los 148 que caben con 2 procesos en Hobby [documento: `mapa-de-procesos` §0]):** ≈ 187,000 visitas al mes dejarían **38 USD (bajo), 204 (medio) y 573 (alto)** contra un costo de ≈ 20 USD (forma de hoy). Es decir, **a ese tamaño, hasta el escenario bajo cubre la operación, y el medio deja ≈ 184 USD al mes de excedente**. Es dinero real, pero hay que creerse el rango de §5.2.
- **Con 500 y 1,000 gratuitos:** el excedente del escenario medio sería de ≈ 900 y ≈ 1,800 USD al mes, contra ≈ 67 y ≈ 119 USD de costo. **La publicidad rendiría mucho más de lo que cuesta la operación si el rango fuera cierto.** Justo por eso conviene medir antes de decidir.

### 5.4 Riesgos que hay que decir
1. **Regla dura 10 de `CLAUDE.md`** (sin datos personales ni sensibles del comensal **en el servidor**): un anuncio de una red como AdSense corre en el teléfono del comensal y manda su IP, identificadores del navegador y cookies **al tercero**, no a Carta. A la letra, el servidor de Carta no los guarda; **en el espíritu** (comensal anónimo, filtros de alérgenos sólo en su teléfono, `ip_hash` con sal diaria para no guardar IP), un rastreador de terceros sobre alguien que acaba de declarar sus alérgenos es lo contrario de la promesa. Sin consulta legal no lo afirmo como permitido: el aviso de privacidad y la ley aplicable (LFPDPPP) son **dato por conseguir**.
2. **Cabeceras de seguridad.** La CSP de hoy (`app/core/cabeceras.py`, 02 §12) es `script-src 'self'`, `style-src 'self'`, `frame-src` sólo con Firebase, `img-src` con R2: los anuncios de una red necesitan orígenes de scripts, imágenes y marcos de terceros, y suelen cargar más scripts desde ahí. Habría que abrir la política **para toda la pantalla del comensal**, justo donde se muestran las fotos y se hace la orden. Hay una salida: aislar el anuncio en una página separada o iframe con `sandbox`, pero eso lo diseña una spec, no este informe.
3. **Experiencia y marca.** Anuncio ajeno en la carta del restaurante, posiblemente de un competidor, junto a la orden de la mesa. El diseño de `/diseno-visual` («El Digital Sommelier») no tiene lugar para él. OlaClick lo hace en el plan gratuito y lo usa como razón de pago («quita los anuncios»): **los anuncios en el gratuito empujan a pagar para quitarlos, y eso compite con la razón de pago de 349.**
4. **Clic accidental y políticas de la red.** Con botones de orden cerca, los clics accidentales violan las políticas de AdSense (riesgo de cierre de cuenta). **[supuesta; verificar en las políticas de AdSense antes de diseñar]**.
5. **Aprobación del sitio.** Las redes revisan el sitio; una PWA detrás de un código de mesa casi sin texto puede no ser aprobada. No lo verifiqué.

### 5.5 Alternativas sin rastreo
- **Anuncio propio del restaurante** (promoción, platillo del día): sin red de por medio; no genera ingreso para Carta, sí valor para el dueño (puede ser razón de pago del plan de paga).
- **Patrocinio directo**: una marca de bebidas o un proveedor local paga un monto fijo mensual para aparecer como «patrocinador de la carta», sin rastreo ni scripts de terceros (una imagen servida por Carta). **Cifra publicada del precio de un patrocinio así en México: no encontré.** Dato por conseguir (§8); se prueba preguntando a 3 marcas locales qué pagarían por tantas visitas al mes.
- **Veredicto:** primero medir visitas reales del piloto; después, patrocinio directo en un restaurante. **Redes con subasta, sólo con consulta legal y diseño aprobado.**

---

## 6. ¿Se sostiene solo? Escenarios de ingreso y costo

### 6.1 Costos

**Costo real de operación hoy [dato de Calvin, captura de Railway del 13 de noviembre ≈ 04:35 UTC, proyecto `carta`, plan Hobby].**

| Concepto | Uso acumulado | Tarifa | Costo |
|---|---|---|---|
| Memoria | 2,649.07 GB-min | 0.000231 USD | 0.6132 |
| Procesador | 44.00 vCPU-min | 0.000463 USD | 0.0204 |
| Salida de red | 0.04 GB | 0.05 USD | 0.0020 |
| Volumen | 1,909.54 GB-min | 0.00000347 USD | 0.0066 |
| **Total** | | | **0.6422** |

(Las tarifas equivalen a 10 USD/GB-mes de memoria, 20 USD/vCPU-mes y 0.15 USD/GB-mes de volumen, las mismas de `planes-y-costo-por-restaurante` §3.5 **[documento]**.)

**Del acumulado al mes [derivada, con supuesto declarado].** No consta la hora de arranque de producción ni el inicio del ciclo de cobro. **Supuesto:** el uso empezó el 10 de noviembre ≈ 08:10 UTC para staging (4,105 minutos hasta la captura) y la producción corrió entre 1,716 minutos (si arrancó a las 23:59 del 11) y 3,155 (si arrancó a las 00:00). Con 2 entornos activos, 43,200 minutos al mes, y la memoria y el volumen proporcionales a los minutos de servicio:

| | Producción desde 00:00 del 11 | Producción desde 23:59 del 11 |
|---|---|---|
| Memoria promedio por entorno | 0.365 GB | 0.455 GB |
| Memoria al mes | 7.28 USD | 9.08 USD |
| Procesador (0 tráfico real) | 0.24 | 0.30 |
| Red | 0.02 | 0.03 |
| Volumen | 0.08 | 0.10 |
| **Uso al mes** | **≈ 7.6 USD** | **≈ 9.5 USD** |

**Rango: 7.6 a 9.5 USD de uso al mes con cero restaurantes** (141 a 177 pesos). Hobby cobra el mayor entre 5 USD (suscripción que incluye 5 USD de uso) y el uso **[documento: `planes` §3.5]**, así que la factura sería ≈ **7.6 a 9.5 USD**. Este rango es **de la captura de 2.85 días**: si la memoria de PostgreSQL crece o sube el tráfico, cambia. La captura mide poco más de 2 días y con cero tráfico real: **dato por conseguir** (factura completa del ciclo).

**Costo fijo total que uso:** uso de Railway 9.5 USD (extremo alto) más dominio 25 USD al año = 2.08 USD al mes **[dato de Calvin: «el dominio costó 25 USD»; supongo anual, como `estrategia-de-precios`]** más Cloudflare gratuito = **≈ 11.6 USD al mes (≈ 216 pesos)**, el «costo fijo de hoy» de todo el informe (uso de 9.5 USD en el extremo alto, para no subestimar).

**Costo con restaurantes [documento: `mapa-de-procesos-y-costos` §0, §4.9].** Gratuitos típicos, forma de hoy (sondeo de 3 s), uso de Railway al mes:

| Restaurantes gratuitos | Uso de Railway (USD/mes) | Con eventos medidos (USD/mes) | Qué hay que cambiar |
|---|---|---|---|
| 0 (hoy) | 7.6 a 9.5 **[dato de Calvin]** | igual | — |
| 150 | ≈ 21.5 (piso 9.5 + 12 de tráfico; cabe en Hobby con 2 procesos hasta 148 típicos) | ≈ 23 | — |
| 500 | **65** | 23 | Pro (disco de 5 GB), más procesos |
| 1,000 | **117** | 29 | Pro, más procesos |

El costo de un restaurante de **paga** es mayor (≈ 2.5 veces el de un gratuito en el caso base: 159 contra 65 USD con 500 **[documento: `mapa` §4.9]**). Lo incluyo como un recargo de +1.5 × la conversión sobre el costo de gratuitos **[derivada]**. Se suma 2.08 USD de dominio. Las lecturas de PDF (0.11 a 0.64 USD cada una) no están en la tabla: son un costo por restaurante nuevo, no mensual **[documento]**.

### 6.2 Escenario A: todo gratuito, sin anuncios
**Ingresos: cero. No se sostiene.** Pérdida mensual: ≈ **11.6 USD (216 pesos)** hoy; ≈ 24 USD (439 pesos) con 150 gratuitos; ≈ 67 USD (1,250 pesos) con 500; ≈ 119 USD (2,220 pesos) con 1,000 (o 31 USD / 580 pesos con eventos). Esto lo paga Calvin. A escala chica es poco dinero (238 pesos al mes), a 1,000 restaurantes no.

### 6.3 Escenario B: gratuito con anuncios (rango de §5)
Ingreso = restaurantes × ingreso por restaurante de §5.2 (36 pesos medio). **Excedente** = ingreso menos costo del escenario A:

| Restaurantes | Costo (USD) | Bajo (USD) | Medio (USD) | Alto (USD) |
|---|---|---|---|---|
| 50 | 16 | 18 → **+3** | 98 → **+82** | 275 → **+260** |
| 150 | 24 | 55 → **+32** | 294 → **+270** | 826 → **+803** |
| 500 | 67 | 184 → **+117** | 979 → **+912** | 2,754 → **+2,687** |
| 1,000 | 119 | 367 → **+248** | 1,958 → **+1,839** | 5,508 → **+5,389** |

**Punto de equilibrio (restaurantes típicos de 1,800 visitas):** bajo ≈ **41**, medio ≈ **7**, alto ≈ **3**. Son un **rango condicional a cifras de §5 sin verificar** (CPM débil, impresiones y relleno supuestos), a una red que acepte el sitio, y a resolver los riesgos de §5.4.

### 6.4 Escenario C: conversión a paga, sin anuncios
Ingreso = conversión × restaurantes × precio (sin IVA, en USD a 18.6188); costo = el del escenario A con el recargo por paga. Neto mensual en USD. **Transferencia manual, sin comisión** (con tarjeta por Stripe, 3.6 % + 3 pesos, ≈ 4.5 % de 349 **[documento: `estrategia-de-precios` §4.2]**).

**A 349 pesos (18.74 USD):**

| Conversión | 50 restaurantes | 150 | 500 | 1,000 |
|---|---|---|---|---|
| 1 % | 9 − 16 = **−6** | 28 − 24 = **+4** | 94 − 68 = **+26** | 187 − 121 = **+67** |
| 3 % | 28 − 16 = **+12** | 84 − 25 = **+60** | 281 − 70 = **+211** | 562 − 124 = **+438** |
| 5 % | 47 − 17 = **+30** | 141 − 25 = **+115** | 469 − 72 = **+397** | 937 − 128 = **+809** |
| 10 % | 94 − 18 = **+76** | 281 − 27 = **+254** | 937 − 77 = **+860** | 1,874 − 137 = **+1,738** |

**Punto de equilibrio (restaurantes registrados para que ingreso ≥ costo)**, según precio y conversión:

| Conversión | 199 pesos (10.69 USD) | **349 pesos (18.74 USD)** | 499 pesos (26.80 USD) |
|---|---|---|---|
| 1 % | 1,131 | **111** | 63 |
| 3 % | 52 | **26** | 17 |
| 5 % | 28 | **15** | 10 |
| 10 % | 14 | **8** | 6 |

**Cuántos restaurantes de paga hacen falta para cubrir el costo [derivada]:**

| Restaurantes gratuitos | A 199 | **A 349** | A 499 | A 349 con eventos |
|---|---|---|---|---|
| 50 | 1.5 | **0.8** | 0.6 | 0.8 |
| 150 | 2.2 | **1.3** | 0.9 | 1.3 |
| 500 | 6.3 | **3.6** | 2.5 | 1.3 |
| 1,000 | 11.1 | **6.4** | 4.4 | 1.7 |

**Lectura:** **la infraestructura se paga con un restaurante de paga a 349 mientras haya menos de ≈ 90 gratuitos**, con 3 a 4 hasta 500 y con 6 hasta 1,000 (menos de 2 con eventos). La conversión necesaria es de **≈ 0.7 % a 349 pesos** y baja si se pasa a eventos. A 199 pesos y 1 % **no se alcanza el equilibrio hasta ≈ 1,100 restaurantes** y es muy sensible al costo de PostgreSQL y de los procesos.

### 6.5 Combinado: lo que de verdad pasaría
Con 500 restaurantes, 3 % de conversión a 349 pesos y anuncios en el escenario **bajo** para los gratuitos: ingreso ≈ 281 (suscripciones) + 178 (anuncios de los 485 gratuitos) = **459 USD** contra ≈ 70 USD de costo: ≈ **+389 USD al mes (≈ 7,250 pesos)**. Sin anuncios: **+211 USD** (≈ 3,930 pesos). **Los anuncios, aun en el escenario bajo, suman casi tanto como todas las suscripciones**; pero el escenario bajo ya supone que la red acepta el sitio y que se resuelve §5.4.

### 6.6 Respuesta a «¿se sostiene solo y puede escalar?»
- **Todo gratuito, sin ingreso: no.** Cuesta ≈ 11.6 USD al mes hoy y 119 USD con 1,000 restaurantes (31 con eventos).
- **Con una conversión de 0.7 a 1 % a 349 pesos: sí se paga la infraestructura**, hoy y con 1,000 restaurantes (6 pagos). **Con 3 %, sobra.**
- **Con anuncios: puede pagar la operación, pero no lo sé:** el rango de §5 depende de cifras sin verificar y de resolver el choque con la privacidad. No lo usaría como la base del modelo.
- **Lo que no se cubre:** soporte, tu tiempo, el costo de vender, IVA, comisión de cobro y el costo de lecturas de PDF si se desborda la fila.
- **Para escalar** (500 o 1,000) hay que pasar a Railway Pro (disco de 5 GB) y sumar procesos o eventos **[documento: `mapa` §4.9]**; es un salto de costo de ≈ 12 a ≈ 67 USD (500 gratuitos), cubierto con ≈ 4 pagos.

---

## 7. Preguntas para Calvin (con mi recomendación)

1. **¿Precio de lista 349 antes de IVA?** *Recomendado: sí, con rango 249–449, y repetir la prueba a 249 si el resultado cae entre 15 y 29 %.* La competencia no lo rompe; tampoco lo confirma.
2. **¿La oferta de lanzamiento de §4 (primer mes gratis y 3 a 175, lista congelada 12 meses, después de la hoja de medición)?** *Recomendado: sí, en dos hojas.* Si prefieres un solo paso, el costo es perder limpieza en la prueba de precio.
3. **¿Anuncios?** *Recomendado: no en el piloto; después de medir visitas y consultar el aviso de privacidad, probar patrocinio directo sin rastreo.* No usar una red de subasta sin spec y sin consulta legal.
4. **¿Qué significa «10,000 usuarios»?** *Recomendado: «10,000 visitas al mes» (lo que mide `scan`).* Con esa definición, esa meta cubre los 11.6 USD de hoy sólo si el anuncio rinde de medio hacia arriba.
5. **¿Cuánto necesitas que entre al mes para que valga la pena?** *Recomendado: contestarlo antes de la semana 6.* Con 3 % y 349 pesos hacen falta ≈ 26 restaurantes registrados para cubrir costos y ≈ 955 para generar ≈ 10,000 pesos al mes antes de IVA (29 pagos).
6. **¿Se hace una llamada a OpenTable (o a un competidor) como cliente fantasma para cotizar?** *Recomendado: sí, 30 minutos; es la única forma de tener un precio de OpenTable México.* No compite con Carta, así que no es urgente.
7. **¿Dejas Hobby hasta el primer restaurante real?** *Recomendado: sí, y revisar la factura el día 1 de cada mes.* Esto es lo que más cambia el costo fijo.

---

## 8. Datos por conseguir

| Dato | Para qué | Cómo conseguirlo |
|---|---|---|
| Factura completa del ciclo de Railway (inicio del ciclo, hora de arranque de producción, uso por servicio) | Reemplazar el rango 7.6–9.5 USD de §6.1 | Captura de «Usage» del día 1 del próximo ciclo, por entorno y por servicio (api, postgres, respaldo) |
| Memoria de PostgreSQL en Railway, `max_connections` | Costo a 150+ restaurantes | Consulta en el servicio de la base y en el panel (pendiente en `mapa` §7) |
| Visitas por restaurante al mes y por comensal | Todo §5 y §6 | Consulta de lectura sobre `scan` en el piloto (la analítica ya existe) |
| Impresiones, relleno y pago reales de una red de anuncios con tráfico de Carta | Cifra de §5.2 | Prueba de 2 semanas en un restaurante del piloto (con aviso al dueño) |
| CPM/RPM de web móvil en México con metodología | Reemplaza la guía débil | Suscripción a eMarketer o a Statista; o el informe de un exchange con país por país |
| Precio de patrocinio directo | Alternativa sin rastreo | Preguntar a 3 a 5 marcas de bebidas o proveedores locales qué pagarían por X visitas al mes |
| Consulta legal sobre anuncios con rastreo, aviso de privacidad y LFPDPPP | Riesgo de §5.4 | Abogado de protección de datos, 1 hora |
| Precio real de OpenTable México | Completar §1 | Llamar o pedir cotización; o la página que no abrió desde esta sesión |
| Precios de Parrot y Wansoft | Completar §1 | Cotización por teléfono o WhatsApp |
| Qué incluye cada competidor (orden compartida, alérgenos) | Confirmar la matriz de §2 | Demo o prueba gratuita de cada uno |
| Disposición a pagar real a 349 | Todo | Hoja de la semana 6 (estrategia de precios §5) |
| IVA de OlaClick, Fudo, Neolo, MenuTiger, Meniu | Comparar con IVA | Revisar el checkout de cada uno |
| Periodo de la cifra mostrada (mensual o anual) en Soft Restaurant y Meniu | Comparar bien | Probar el selector con navegador interactivo; o preguntar a ventas |

## 9. Fuentes

- **Repositorio:** `docs/research/2026-11-13-estrategia-de-precios.md`, `2026-11-13-mapa-de-procesos-y-costos.md`, `2026-11-13-planes-y-costo-por-restaurante.md`, `2026-09-19-modelo-de-negocio-y-pagos.md`, `2026-09-19-competencia-real-mexico.md`, `2026-09-20-olaclick-a-fondo.md`, `2026-09-23-escenarios-publicidad-infraestructura.md`, `docs/Carta_Market_Analysis.md`, `docs/plan/01_Alcance_v1.md`, `docs/specs/001-ciclo-de-la-mesa/spec.md`, `app/core/cabeceras.py`, `CLAUDE.md`.
- **Páginas leídas el 13 de noviembre de 2026:** [Fudo](https://fu.do/precios) · [Soft Restaurant 12](https://softrestaurant.com/soft-restaurant-precio) · [Soft Restaurant Cloud](https://softrestaurant.com/cloud) · [Soft Restaurant Menú Digital](https://softrestaurant.com/addons/menu-digital) · [Last.app](https://last.app/mx/precios) · [OlaClick](https://pricing.olaclick.app) · [MenuTiger](https://www.menutiger.com/es/pricing) · [Neolo](https://www.neolo.com/mexico/menu-qr) · [Meniu](https://meniuapp.com/es/plans) · [Poster](https://joinposter.com/mx/pricing) · [Loyverse](https://loyverse.com/pricing) · [Waitry](https://waitry.net/es-mx/precios) · [Wansoft](https://www.wansoftpos.com/) · [Parrot](https://parrotsoftware.com.mx) · [Google AdSense: reparto](https://support.google.com/adsense/answer/180195) · [Google AdSense: pago](https://support.google.com/adsense/answer/1709858).
- **Fuentes secundarias:** [Eat App: precios de OpenTable](https://restaurant.eatapp.co/blog/opentable-pricing) (competidor de OpenTable) · [GetApp México: OpenTable](https://www.getapp.com.mx/software/2044651/opentable-for-restaurants) · [guía de CPM por país](https://adscalculator.xyz/blog/global-programmatic-display-cpm-benchmark-by-country-2025/) (débil) · [BYYD: publicidad programática en México](https://www.byyd.me/en/blog/2025/04/programmatic-advertising-in-mexico/) (contexto, no usado en cálculos) · [Frankfurter: tipo de cambio del BCE](https://api.frankfurter.dev/v1/latest?base=USD&symbols=MXN,EUR).
- **No se pudo abrir desde esta sesión:** la página oficial de OpenTable México (`restaurant.opentable.com.mx`), el estudio Valor Total Media del IAB/CIM y la calculadora de AdSense (se usa la cifra de septiembre del documento).
- **Aritmética:** hecha en la sesión con los números de cada tabla; se recalcula con las fórmulas dichas. Costo de infraestructura en §6.1 (interpolación lineal entre los puntos de `mapa` §4.9: 0, 150, 500 y 1,000 restaurantes).
