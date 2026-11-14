# Precio con fundamento: qué paga el mercado, qué decide el rango y qué lo cierra

**Fecha:** 14 de noviembre de 2026 (revisada el mismo día tras la ronda de la maestra) · **Rama:** `agente/planes-precio-historial` · **Estado:** análisis para decidir; no cambia plan ni código (salvo una fila en `04 §11`). La v1 no cobra.
**Qué cambió con la revisión:** *antes decía «349 se sostiene» y daba un punto; la revisión mostró que dependía de una clasificación de sustitutos y de una K elegida mirando 349. Ahora el precio es un **corredor de 249 a 349** (y ≈ 556 si el soporte cuesta 150), con cada supuesto a la vista, y K queda como decisión de Calvin.* Releí con navegador Meniu, Fudo, Poster, MenuTiger, Soft Restaurant Cloud, Last.app, Loyverse, Neolo y Waitry.
**Datos:** [`…-funciones-y-precios.csv`](2026-11-14-funciones-y-precios.csv) (matriz, topes e IVA por plan) · [`…-precio-con-fundamento-datos.json`](2026-11-14-precio-con-fundamento-datos.json) · [`…-corredor-y-planes-datos.json`](2026-11-14-corredor-y-planes-datos.json) · **Guiones:** [`…-precio-con-fundamento.py`](2026-11-14-precio-con-fundamento.py) y [`…-planes-y-corredor.py`](2026-11-14-planes-y-corredor.py) (`python3 -I`, sin dependencias, semilla 20261114).

**Marcas.** **[fuente]** = página del proveedor (13 o 14 de noviembre de 2026). **[documento]** = otro documento del repositorio. **[medida]** = cálculo mío. **[supuesto]** = juicio, con el dato que lo cerraría en §8. **IVA:** donde la página no lo declara escribo «IVA no declarado»; no lo trato como «antes de IVA». 1 USD = 18.6188 pesos (FIX de Banxico del 12-nov [documento]).

---

## 0. Conclusiones

- **El precio de Servicio es un corredor, no un punto: 249 a 349, con 299 en el centro, y depende de tres cosas que hoy no se saben.** Con la regla «**K × el sustituto sin tope de pedidos publicado más barato, y nunca menos de 3 veces el piso**» y K = 0.5 sale **249** si el sustituto es Meniu (225, trae casi todo), **299** si es Fudo Avanzado (652; su página ya incluye «Pedido desde la mesa con Carta QR» y app de meseros sin el módulo de mesas) y **349** si se le suma el módulo de mesas (745; así lo hacía la primera versión). Si el precio de Fudo ya incluye IVA (no lo declara): 745 ÷ 1.16 = 642 → **299**. Con soporte de 150 pesos al mes en lugar de 60, el piso sube a 175 y **el precio a ≈ 556** (599 ya redondeado). **Lo que cerraría el rango:** los topes reales y las marcas de Meniu y Fudo (hoy «no publicado»), el soporte medido en el piloto y la prueba de precio del piloto (§6).
- **K es decisión de Calvin (qué tan agresivo entrar), no un cálculo.** Para K de 0.3 a 0.7 el precio contra Fudo Avanzado va de **249 a 449** (contra Meniu, 249 siempre, porque manda el piso). §4.3.
- **El volumen decide el sustituto.** Por debajo de ≈ **385 visitas al mes** (500 comandas, con 1.3 comandas por visita [supuesto]) el sustituto con tope publicado es un plan barato (MenuTiger Regular, 317 con 500 pedidos); desde ahí, MenuTiger Advanced (856) y, con 1,800 visitas, OlaClick Elite (1,099). **Pero Meniu y Fudo no publican tope**, así que contra ellos el precio no cae con el volumen. §4.4.
- **2,000 al mes (500 por semana ≈ 2,167) queda fuera en todos los escenarios:** 889 % de Meniu, 307 % de Fudo Avanzado, 268 % de Fudo + mesas; para un negocio grande con cocina y comandero, 2,000 es **239 % de 838** (Fudo + cocina) y **160 % de 1,250** (Last.app + cocina). Sólo cuestan más que 2,167 planes que traen mucho más: OlaClick Impulso (2,979, con IA), Last.app Unlimited (2,900, POS completo) y MenuTiger Premium (2,216, POS, mesas, locales ilimitados), además de OpenTable (fuente secundaria, EE. UU.).
- **El mercado cobra por función con saltos y complementos (método a) y por volumen de pedidos sólo en OlaClick y MenuTiger; el modelo por funciones (método b) no sirve.** Complementos publicados: **mesas 93**, **cocina 186 a 250**, **historial 130**, **reparto 279**, **POS 559**. Modelo por funciones con la matriz ya completada: **error dejando uno fuera 575 pesos contra 604 de predecir el promedio (5 % mejor, n = 21)**: no sirve; el «valor del paquete de Carta» que da es **193 con intervalo de −163 a 616** (cruza el cero). **Los topes de pedidos como variables no se pueden estimar:** sólo OlaClick y MenuTiger los publican (7 planes).
- **Sin preguntar no se sabe la disposición a pagar:** prueba para los 10 del piloto en §6 (con 3 de 10 que pagan, el intervalo es 11 % a 60 %: un sí o un no).

---

## 1. Matriz de funciones (33 planes)

El CSV trae por plan: precio en pesos, moneda original, **IVA tal como lo declara la página**, unidad de cobro, **tope de pedidos publicado**, **13 funciones** (1 = lo incluye; 0 = la página dice que no o es complemento de pago; «no publicado» = la página no lo dice) y notas con la fecha de lectura. **Regla del análisis: «no publicado» no cuenta como 0 en ningún cálculo.**

**Alcance de la lectura.** Con Chromium, el 14 de noviembre: **Meniu, Fudo, Poster, MenuTiger, Soft Restaurant Cloud, Last.app, Loyverse, Neolo y Waitry**; con la herramienta de lectura: **OlaClick** (perdió la tabla de funciones por plan). **No releídos** (quedan con la lectura del 13-nov): Soft Restaurant 12, Parrot, Wansoft y OpenTable (fuente secundaria, EE. UU.). Dos salvedades de lectura: (1) el texto extraído **no trae las marcas ✓/✗**, así que en Meniu (plan único) y Fudo se asume que la lista de la página es lo que incluye cada plan; (2) **Poster hoy muestra USD 26 / 44 / 62 en `joinposter.mx`**, y el 13 de noviembre mostraba 495 / 837 / 1,179 pesos en `joinposter.com/mx`: **no pude conciliar las dos** (¿cambio de página, de moneda o de plan?); uso la de hoy.

| Proveedor | Planes (MXN al mes) | IVA | Qué trae (lo publicado) | Topes publicados | Restaurantes que dice tener |
|---|---|---|---|---|---|
| **Meniu** | Business **225** (plan único; 26 % menos pagando anual) | no declarado | menú digital, **«Ordena y paga desde tu mesa»**, POS, KDS, mapa de mesas, reservaciones, inventario, WhatsApp, reportes, usuarios meseros, **sucursales ilimitadas** | **de pedidos: no publicado**; productos y categorías ilimitados | no publicado |
| **Fudo** | Avanzado **652** (USD 35) · Pro **838** (USD 45); módulos: mesas 93, cocina 186, reparto 279, tu delivery 559, ventas por comensal 37, recepcionista IA 745 | no declarado | **Carta QR, «Pedido desde la mesa con Carta QR», «App móvil para camareros»**, POS, inventario, reportes; usuarios ilimitados; soporte por WhatsApp o teléfono | **de pedidos: no publicado** | no publicado |
| **MenuTiger** | Free 0 · Regular **317** (USD 17) · Advanced **856** (USD 46) · Premium **2,216** (USD 119); POS 559, impresoras 372, marca blanca 540 | no declarado | pedidos QR, creador de menús con IA; KDS desde Advanced; gestión de mesas sólo Premium; POS incluido sólo en Premium | **75 · 500 · 2,000 · ilimitados** pedidos; **1 · 2 · 5 · ilimitados** locales | «miles de restaurantes» (sin cifra) |
| **OlaClick** | Advanced **184** · Premium **465** · Elite **1,099** · Impulso **2,979** | no declarado | POS, menú digital y CRM en todos; facturación desde Elite (complemento antes) | **75 · 400 · ilimitados · ilimitados** | **«más de 40,000 negocios»**; la propia empresa publica seis cifras distintas [documento: olaclick-a-fondo §2.3] |
| **Last.app** | Starter **1,000** · Growth **1,700** · Unlimited **2,900** (por sucursal; KDS +250) | **+ IVA** | **QR y pedidos en mesa gratis**, POS, 100 a 500 folios de factura, reportes, integrador de delivery; inventario desde Growth; reservas (The Book) plan Basic gratis | licencias POS 2 · 4 · ilimitadas | no publicado |
| **Soft Restaurant Cloud** | Lite **699** (349 con Payments) · Pro **999** · Enterprise **1,599** | **+ IVA** | POS, comandera móvil, facturación electrónica, reportes, apps de reparto | 2 · 5 · 10 dispositivos; multisucursal sólo Enterprise | no publicado |
| **Poster** | Mini **484** · Business **819** · Pro **1,154** (USD 26 · 44 · 62; ver salvedad) | no declarado | POS, menú QR y reseñas, inventario; Business: **comandero móvil y KDS**; Pro: reservas | **100 · 300 · 1,500 productos** | no publicado |
| **Waitry** | Lite 0 · Premium **1,243** (60 EUR mensual) | **sin IVA** | Lite: carta; Premium: pedido y pago en mesa, venta en línea | — | «más de 8,000 restaurantes declarados» [documento, 19-sep] |
| **Neolo** | gratis (200 visitas) · Plan 0 **157** (es un paquete de hosting con menú QR) | no declarado | menú QR, alérgenos, estadísticas de escaneo | 200 visitas | no publicado |
| **Loyverse** | gratis; complementos por tienda: historial **130**, empleados **465**, inventario avanzado **465** | **«Prices exclude taxes»** | POS, cocina (KDS), inventario básico, analítica de 31 días, varias tiendas | — | no publicado |
| Soft Restaurant 12 · Parrot · Wansoft · OpenTable | 799 y 1,099 + IVA · sin precio · sin precio · 2,774 a 9,291 (secundaria, EE. UU.) | — | POS · POS · POS · reservas | — | no publicado |

**Lo que ninguna página dice:** *pedido en grupo* (una orden compartida entre los comensales). Es lo que Carta añade y **no tiene precio de mercado**; no se valora.

---

## 2. Cuánto paga el mercado por cada función

### 2.1 Método (a): diferencias dentro de un mismo proveedor (el más limpio)

| Proveedor | De → a | Sube | Qué cambia (lo publicado) |
|---|---|---|---|
| OlaClick | Advanced → Premium | **+281** | 75 → 400 pedidos |
| OlaClick | Premium → Elite | **+634** | 400 → ilimitados **y** facturación |
| OlaClick | Elite → Impulso | +1,880 | copiloto de IA |
| MenuTiger | Free → Regular | +317 | 75 → 500 pedidos, 2 locales |
| MenuTiger | Regular → Advanced | **+539** | 500 → 2,000 pedidos **y** KDS **y** 5 locales |
| MenuTiger | Advanced → Premium | +1,360 | ilimitados **y** POS, gestión de mesas, locales ilimitados, marca blanca |
| Poster | Mini → Business | **+335** | **comandero móvil y KDS** |
| Poster | Business → Pro | +335 | reservas |
| Fudo | Avanzado → Pro | +186 | varias cajas, turnos, estado de resultados |
| Last.app | Starter → Growth | +700 | 4 licencias POS, inventario |
| Soft Restaurant Cloud | Pro → Enterprise | +600 | multisucursal |

**Complementos con precio propio** (lo más directo de «cuánto vale una función»): Fudo — **mesas 93**, ventas por comensal 37, **cocina 186**, reparto 279; Last.app — **cocina 250**; MenuTiger — POS 559, impresoras 372; Loyverse — **historial 130**, empleados 465, inventario avanzado 465.

**Lo que dicen y lo que NO dicen.** Dicen: una pantalla de cocina suelta vale **186 a 250**; un módulo de mesas, **93**; el historial más allá de 31 días, **130**; comandero + KDS juntos, **335**. **No dicen cuánto vale quitar el tope de pedidos**: los saltos de OlaClick y MenuTiger **mezclan tope con facturación, KDS, POS y locales** (arriba, en negritas); *antes decía que el mercado «cobra por volumen» y que quitar el tope valía +539 a +634: no se puede aislar*. **Límite del método:** cada salto es un proveedor, n = 1.

### 2.2 Método (b): modelo de precios por funciones

Mínimos cuadrados sobre la matriz **sin contar «no publicado» como 0** (se promedia lo conocido de cada grupo y se descarta el plan si un grupo entero es desconocido), **validación dejando uno fuera** y **2,000 remuestreos bootstrap con semilla fija** [medida]:

| Modelo | n | Error dejando uno fuera | Error de predecir el promedio | Valor del paquete de Carta (intervalo 90 %) |
|---|---|---|---|---|
| Menú y pedido, operación, sucursales | 8 | 486 | 556 | **−63** (−751 a 566) |
| **Menú y pedido, operación** (sucursales casi nunca publicadas) | **21** | **575** | **604** | **193** (−163 a 616) |

**Lectura:** la mejora sobre «poner el promedio» es **5 %** con n = 21, dentro del ruido; los intervalos **cruzan el cero**. Con n = 8, 486 contra 556 (13 %) no es creíble con 4 parámetros. **El método (b) no sirve para fijar un precio.** *Antes: «error 617 contra 594»; con la matriz ya releída el modelo mejora un poco pero sigue sin servir.* **Los topes (pedidos, locales) como variables no se pueden agregar:** sólo OlaClick y MenuTiger los publican por plan (7 planes). Para repetirlo bien harían falta ≥ 100 planes con topes publicados.

**Me quedo con (a) para los precios por función y con los sustitutos completos (§4) como fundamento.**

---

## 3. El paquete de Carta (sólo lo que la v1 tendrá al terminar la Fase 3)

**Funciones** [documento: `04 §7`]: menú por QR (alérgenos, foto o ilustración, filtros del lado del teléfono) · pedir desde la mesa · orden compartida entre los comensales · comanda directo al mesero (app de mesero con PIN, llamadas) · ciclo de la mesa. **No tiene** POS, caja, pago en la app, facturación, reservas, reparto, inventario, varias sucursales ni analítica del restaurante.

**Qué se observa en el mercado para ese trabajo** [fuente + medida]: planes que cubren menú por QR + pedir desde la mesa + comanda al mesero **sin tope de pedidos publicado**: **Meniu 225** (con POS, KDS y mucho más), **Fudo Avanzado 652** (con POS e inventario), **Last.app Starter 1,000 + IVA** (con POS y factura). Con tope publicado: **MenuTiger Regular 317** (500 pedidos, sin app de mesero publicada). *Antes sumaba piezas (205 + 93 + …) hasta «840 a 1,270»: era una suma de saltos que traen cocina, factura y locales; la quité.* **Lo que sí se puede decir:** el mercado cobra **entre 225 y 1,000** por planes que traen ese trabajo y mucho más (POS), y **ninguno cobra por una orden compartida**. El valor que el método (b) estima para el paquete (193, de −163 a 616) no es distinguible de cero.

---

## 4. Corredor de precio: piso, techo y la regla

### 4.1 Piso (pesos al mes por restaurante de paga)

Costo variable por perfil y base fija (3 pesos con 500 restaurantes) [documento: planes-y-costo §0] + comisión de tarjeta **calculada sobre lo que paga el cliente, con IVA** (3.6 % + 3 pesos, más IVA de la comisión [documento: §7.2; el tratamiento fiscal del IVA de la comisión es supuesto, a revisar con un contador]) + **soporte [supuesto]**.

| Soporte al mes | Piso a 349 | Piso a 249 | Qué es |
|---|---|---|---|
| **30 pesos** | 55 | 50 | 15 minutos a 120 la hora |
| **60 pesos** | **85** | 80 | 30 minutos |
| **150 pesos** | **175** | 170 | 75 minutos |

**El soporte decide el piso** (60 de 85 pesos): con 150 el piso se triplica sobre el costo del servidor. Pisos por perfil con soporte 60: chico 84, mediano 85, grande 91, formal 87 (a 349) [medida].

### 4.2 Sustitutos: tabla completa con cada supuesto de clasificación

Lo que cuesta, según la página, cada plan que cubre parte del trabajo de Carta. «Tope» es el de pedidos al mes publicado; **«no publicado» no se trata ni como «con tope» ni como «sin tope»: se muestra en ambos escenarios**.

| Plan | MXN | IVA | Tope de pedidos | Menú + pedir en mesa | Comanda al mesero | Trae POS | Clasificación |
|---|---|---|---|---|---|---|---|
| **Meniu Business** | **225** | no declarado | **no publicado** | sí | sí (usuarios meseros, comandas) | sí | Sustituto **sin tope publicado** que cubre todo |
| **Fudo Avanzado** | **652** | no declarado | **no publicado** | sí («Pedido desde la mesa con Carta QR») | sí («App móvil para camareros») | sí | Sustituto **sin tope publicado** |
| Fudo Avanzado + módulo de mesas | 745 | no declarado | no publicado | sí | sí | sí | El módulo **no** hace falta para pedir desde la mesa |
| Last.app Starter | 1,000 | **+ IVA** | no publicado | sí (QR y pedidos en mesa, gratis) | sí | sí | Sin tope publicado; por sucursal |
| Soft Restaurant Cloud Lite | 699 (349 con Payments) | **+ IVA** | no publicado | no (comandera) | sí | sí | Parcial |
| Poster Business | 819 | no declarado | no publicado | sólo menú QR | sí (comandero y KDS) | sí | Parcial; moneda a conciliar |
| OlaClick Elite | 1,099 | no declarado | ilimitado | no publicado | no publicado | sí | Sin tope |
| MenuTiger Advanced | 856 | no declarado | **2,000** | sí | no publicado | no | Con tope; se agota con 1,540+ visitas |
| MenuTiger Premium | 2,216 | no declarado | ilimitado | sí | no publicado | sí | Sin tope |
| Waitry Premium | 1,243 | **sin IVA** | no publicado | sí (y pago) | no publicado | no publicado | Parcial |
| MenuTiger Regular | 317 | no declarado | **500** | sí | no publicado | no | Con tope; se agota con 385+ visitas |
| OlaClick Premium · Advanced | 465 · 184 | no declarado | **400 · 75** | no publicado | no publicado | sí | Con tope |
| MenuTiger Free | 0 | no declarado | **75** | sí | no publicado | no | Con tope |

### 4.3 La regla y K

`precio = máx( 3 × piso ; K × S )`, con S el sustituto **sin tope publicado** más barato, redondeado hacia abajo a x49 o x99 sin bajar del piso ×3. **K no se elige aquí:** es qué fracción del sustituto se cobra, o sea qué tan agresivo entrar (Carta no trae POS, factura ni inventario, pero trae orden compartida y alérgenos estructurados). Precio de la regla (perfil mediano, soporte 60) [medida]:

| S (sustituto) | K = 0.3 | 0.4 | **0.5** | 0.6 | 0.7 |
|---|---|---|---|---|---|
| **Meniu 225** | 249 (piso) | 249 (piso) | **249 (piso)** | 249 (piso) | 249 (piso) |
| **Fudo Avanzado 652** | 249 (piso) | 249 | **299** | 349 | 449 |
| Fudo + mesas 745 | 249 (piso) | 249 | **349** | 399 | 499 |
| Fudo Avanzado, si su precio ya incluye IVA (562) | 249 | 249 | **249** | 299 | 349 |
| Fudo + mesas, si ya incluye IVA (642) | 249 | 249 | **299** | 349 | 399 |
| Last.app Starter 1,000 + IVA | 299 | 399 | **499** | 599 | 699 |

**Lectura:** **«349» sólo sale con Fudo + mesas y K = 0.5, o con Fudo Avanzado y K = 0.6.** Con Meniu como sustituto manda el piso y el precio es 249 sin importar K. **Lo que me dice el rango:** cualquier precio entre 249 y 349 se defiende con alguno de estos sustitutos; **elegir uno es elegir contra quién compite Carta.**

**Soporte (K = 0.5):** contra Fudo Avanzado, soporte 30 → **299**; 60 → **299**; 150 → **≈ 556** (599 redondeado: el piso ×3 supera a K × S). Contra Meniu: 30 → 135 (149 redondeado), 60 → 240 (249), 150 → ≈ 556 (599). *La primera revisión pedía ≈ 499 con 150: mi cálculo da 556 porque la comisión de tarjeta sube con el precio y el piso ×3 se mueve con ella.*

### 4.4 El volumen decide el sustituto

Precio que da la regla (K = 0.5) según las visitas al mes [medida; comandas = 1.3 × visitas, supuesto]:

| Visitas al mes | Comandas | Sustituto **con tope publicado** más barato que alcanza | MXN | Precio de la regla contra ese sustituto | Contra Meniu o Fudo (sin tope publicado) |
|---|---|---|---|---|---|
| 300 (10 al día) | 390 | MenuTiger Regular (500) | 317 | **240** (manda el piso) | 240 |
| **385** | 500 | MenuTiger Advanced (2,000) | 856 | **428** | 240 |
| 600 (20 al día) | 780 | MenuTiger Advanced | 856 | **428** | 240 |
| 900 | 1,170 | MenuTiger Advanced | 856 | **428** | 240 |
| 1,800 (perfil mediano) | 2,340 | OlaClick Elite (ilimitado) | 1,099 | **550** | 240 |
| 4,500 (perfil grande) | 5,850 | OlaClick Elite | 1,099 | **550** | 240 |

**Dos lecturas, ambas ciertas:** (1) **si el comparable es un plan con tope publicado, el precio sube con el volumen** (240 → 428 → 550) y por debajo de ≈ 385 visitas cae; (2) **si el comparable es Meniu o Fudo, el precio no depende del volumen** (240). *Corrijo la contradicción de la primera versión (800 comandas «cabían» en planes de 500 y 400): no caben; con 600 visitas al mes el comparable con tope es MenuTiger Advanced.*

### 4.5 Salón (negocio grande: cocina y comandero)

Con **la misma regla** y los sustitutos que cubren cocina y comandero: **Poster Business 819 → 399** (K = 0.5); **Fudo Avanzado + cocina 838 → 399**; **Last.app Starter + cocina 1,250 → 599**; **Meniu (trae KDS, 225) → 249**. *Antes decía 549 «con más margen»: con la regla de Servicio da **399**; 549 sólo sale con K = 0.7 contra Poster o Fudo.* **Salón: 399 con K = 0.5 (rango 249 a 599).**

### 4.6 Evaluación de candidatos [medida]

| Candidato | Veces el piso (mediano, soporte 60) | % de Meniu (225) | % de Fudo Avanzado (652) | % de Fudo + mesas (745) | Veredicto |
|---|---|---|---|---|---|
| **249** | 3.1 | 111 % | 38 % | 33 % | Dentro; es el piso ×3 |
| **299** | 3.6 | 133 % | 46 % | 40 % | Dentro |
| **349** | 4.1 | 155 % | 54 % | 47 % | **Dentro contra Fudo; 55 % arriba de Meniu** |
| **399** | 4.5 | 177 % | 61 % | 54 % | Dentro contra Fudo; 77 % arriba de Meniu |
| **549** | 5.8 | 244 % | 84 % | 74 % | Dentro sólo contra Fudo; con soporte 150 (≈ 556) lo exige el piso |
| **799** (prototipo «Master Chef») | 7.5 | 355 % | 123 % | 107 % | **Fuera** (arriba de Fudo) |
| **2,000** | 12.1 | 889 % | 307 % | 268 % | **Fuera** |
| **2,167** (500 por semana × 52 ÷ 12) | 12.5 | 963 % | 332 % | 291 % | **Fuera** |

---

## 5. Que no sea caro: precio como parte del ingreso

**Dato oficial que falta:** Censos Económicos 2024 por clase 722511 y estrato de personal (ingresos por suministro de bienes y servicios). El boletín 22/25 de INEGI (PDF oficial, 24-jul-2025) da **516,894 personas ocupadas** en esa clase pero **no ingresos por estrato**; el Sistema de Consulta se arma con JavaScript y mis herramientas no lo ven. **Ruta:** navegador → Sistema de Consulta de CE 2024 → tabulado por clase 722511 → estrato de personal → «ingresos por suministro de bienes y servicios» (**dato por conseguir**).

**Mientras tanto [supuesto]:** ingreso = visitas × personas por visita × gasto por persona (100, 160, 220, 450 pesos; **sin fuente**: se mide en las entrevistas del piloto). Precio con IVA como parte del ingreso mensual:

| Perfil | Ingreso supuesto al mes | 349 | 549 | 2,167 |
|---|---|---|---|---|
| Chico (1,800 visitas) | 414,000 | 0.10 % | 0.15 % | 0.61 % |
| Mediano (1,800) | 748,800 | 0.05 % | 0.09 % | 0.34 % |
| Grande (4,500) | 2,970,000 | 0.01 % | 0.02 % | 0.08 % |
| Formal (1,500) | 2,025,000 | 0.02 % | 0.03 % | 0.12 % |
| **Micro 0–5 personas, 20 visitas al día** | **138,000** | **0.29 %** | 0.46 % | 1.82 % |

**Regla de prudencia [supuesto]:** el precio no pasa de 1 % del ingreso del negocio más chico del plan; 349 cumple con margen de ×3; 2,167 no. **La cifra de gasto por persona cambia todo esto.**

---

## 6. Lo que no se puede saber sin preguntar: la disposición a pagar

**Prueba para los 10 del piloto** (≈ 10 minutos por restaurante; **antes** de mostrar precio o descuento):

**Paso 1 — cuatro preguntas Van Westendorp** (pesos al mes con IVA, cada una por separado): ¿a qué precio le parecería **tan barato** que dudaría de la calidad? · ¿**una ganga**? · ¿a qué precio empieza a parecerle **caro**? · ¿**demasiado caro** para contratarlo?
**Paso 2 — escalera** (descendente, sin ver los siguientes): 799 → 549 → 349 → 249 → 149; se anota el primer precio al que dice que sí.
**Paso 3 — la señal fuerte:** hoja con el precio de la prueba y una de tres respuestas: pagó el primer mes por transferencia · firmó carta de compromiso · dijo que no y por qué.

**Cómo se lee** (n = 10, un sí o un no, no una curva):

| Resultado | Lectura | Qué se hace |
|---|---|---|
| ≥ 3 de 10 pagan o firman al precio de prueba | Se sostiene [criterio fijado en la estrategia de precios, 13-nov] | Mantenerlo; probar el siguiente nivel con los próximos 10 |
| < 3 pero ≥ 3 aceptan 249 | Está arriba | Bajar a 249–299 |
| < 3 incluso a 249 | No es el precio: es el valor o el motivo del «no» | Leer razones: topes, funciones, soporte |
| Mediana de «caro» (pregunta 3) por debajo del precio de prueba | Sólo lo pagan quienes ya ven el valor | No subir |

**Cuánto dice con 10:** 3 de 10 → intervalo de la tasa de pago **11 % a 60 %** (Wilson 95 %) [medida]: se descarta ≈ 0 y ≈ 100 %, nada más. Para una curva hacen falta muchas más respuestas (**≈ 100** [supuesto: regla práctica sin fuente]). **Sesgo:** los 10 son quienes aceptaron probar; pagarán más que el promedio.

---

## 7. D · ¿Para qué sirve el gasto de los hogares en comer fuera?

**La cifra, ya corregida:** el hogar mexicano gasta **3,896 pesos al trimestre en alimentos y bebidas fuera de casa** (≈ 1,299 al mes), **21.7 % de su gasto en alimentos y 8.2 % del gasto monetario**, **+19.2 % de 2022 a 2024** [fuente: INEGI, ENIGH 2024, presentación nacional, julio de 2025, <https://www.inegi.org.mx/contenidos/programas/enigh/nc/2024/doc/enigh2024_ns_presentacion_resultados.pdf>; hogar de 3.35 personas]. (La versión anterior de otro informe usó el archivo de Tabasco como nacional; **corregido** [documento: estadística de cartas §8].)

**Qué decisiones mueve**

| Decisión | Cómo la mueve el dato | Ejemplo |
|---|---|---|
| **Tamaño del lado del comensal** (capa de pago, anuncios, patrocinio) | Techo de lo que un comensal pagaría o de lo que un anunciante capta; **no** el precio al restaurante | «Carta+» de 29 pesos al mes = **2.2 %** del gasto mensual del hogar en comer fuera (29 ÷ 1,299), **1.1 % en CDMX** (7,915 al trimestre) |
| **Ciudades por donde empezar** | Gasto por hogar **y** número de negocios | CDMX (**7,915**; 55,753 unidades de la rama 7225) y Jalisco (**5,267**; 48,957) lideran en ambas; Querétaro (6,051), Baja California (5,790) y Colima (5,491) gastan más que el promedio con menos negocios; Oaxaca (2,212; 35,759) y Guanajuato (2,870; 33,392) gastan menos [DENUE 05/2026 y ENIGH 2024] |
| **Capa del comensal y anuncios a futuro** | Los anunciantes pagan por el gasto del público al que llegan | CDMX gasta 2.0 veces el promedio nacional |

**Qué decisiones NO mueve:** **lo que un restaurante paga por Carta** (el gasto del hogar no es el ingreso del restaurante ni su disposición a pagar: eso lo fijan el sustituto, el piso y la prueba del §6; mezclarlos mezcla dos mercados); cuántos restaurantes hay (lo da el DENUE) ni cuántos aceptarían Carta (el piloto); ni la **frecuencia** de comer fuera (la ENIGH mide pesos, no visitas).

**Por qué antes pareció irrelevante:** lo es **para el precio al restaurante**, pero **no para el lado del comensal ni para elegir ciudad**.

---

## 8. Datos por conseguir (lo que cerraría el rango)

| Dato | Para qué | Cómo se obtiene | Costo |
|---|---|---|---|
| **Tope de pedidos y marcas ✓/✗ de Meniu y Fudo** | Definen si son sustitutos sin tope (rango 249–299) | Ver sus páginas en un navegador con marcas; o cuenta de prueba | 1 h |
| **IVA de Fudo, Meniu, MenuTiger y OlaClick** | 745 ÷ 1.16 = 642 → de 349 a 299 | Preguntar en su chat o ver la factura de una prueba | 0 |
| **Soporte real por restaurante de paga** | El piso: 55, 85 o 175 | Contar tickets y minutos del piloto | 0 |
| **Disposición a pagar** | K y el precio | La prueba de §6 | 0 |
| Poster: ¿495/837/1,179 MXN o USD 26/44/62? | Matriz | Ver `joinposter.com/mx` y `joinposter.mx` | 0 |
| Censos Económicos 2024, ingresos por estrato (722511) | §5 | Sistema de Consulta de INEGI en navegador | 0 |
| Gasto por persona y ticket reales | §5 | Entrevistas del piloto | 0 |
| Comandas por visita | El volumen del §4.4 | `comanda` del piloto | 0 |
| Comisión real de la pasarela | El piso | Cotización | 0 |
| Cuántos restaurantes dicen tener (todos menos OlaClick y Waitry) | Mercado | Páginas de inicio | 1 h |
