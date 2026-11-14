# Precio con fundamento: qué paga el mercado, cuánto vale el paquete de Carta y dónde poner el precio

**Fecha:** 14 de noviembre de 2026 · **Rama:** `agente/planes-precio-historial` · **Estado:** análisis para decidir; no cambia plan ni código (salvo una fila en `04 §11`). La v1 no cobra.
**Datos:** [`…-funciones-y-precios.csv`](2026-11-14-funciones-y-precios.csv) (matriz de 33 planes) · [`…-precio-con-fundamento-datos.json`](2026-11-14-precio-con-fundamento-datos.json) (modelo, saltos y complementos) · [`…-corredor-y-planes-datos.json`](2026-11-14-corredor-y-planes-datos.json) (pisos, techos y evaluación) · **Guiones:** [`…-precio-con-fundamento.py`](2026-11-14-precio-con-fundamento.py) y [`…-planes-y-corredor.py`](2026-11-14-planes-y-corredor.py) (`python3 -I`, sin dependencias, semilla fija 20261114).

**Marcas.** **[fuente]** = página leída (13 o 14 de noviembre de 2026; enlace). **[documento]** = lo dice un documento del repositorio. **[medida]** = cálculo mío sobre ellos. **[supuesto]** = juicio, con su cómo-se-obtiene en §8. Precios en pesos al mes **antes de IVA**; 1 USD = 18.6188 pesos (FIX de Banxico del 12 de noviembre [documento]).

---

## 0. Conclusiones

- **349 se sostiene, y 2,000 al mes (500 por semana) no.** Con la regla «**la mitad del sustituto más barato que hace lo mismo sin tope de pedidos, y nunca menos de 3 veces el piso**» sale **372 → 349** para un restaurante de mesa (el sustituto es Fudo Avanzado + módulo de mesas: 745, con POS e inventario incluidos) y **559 → 549** para uno con cocina y comandero (Fudo Pro + mesas + cocina: 1,117). **349 es 4.2 veces el piso** (83 pesos) y **47 % del sustituto**; **2,167 (500 por semana) es 13.6 veces el piso pero 291 % del sustituto**: más caro que cualquier alternativa publicada salvo MenuTiger Premium (2,216) y Last.app (2,900 con POS completo).
- **El mercado no cobra por función: cobra por volumen de pedidos.** OlaClick sube de **184 a 465 a 1,099** al pasar de 75 a 400 a ilimitados pedidos al mes; MenuTiger, de **0 a 317 a 856 a 2,216** (75, 500, 2,000, ilimitados). Los **complementos** sí tienen precio por función: **módulo de mesas 93** (Fudo), **pantalla de cocina 186 a 250** (Fudo y Last.app), **reparto 279** (Fudo), **historial 130** (Loyverse), **empleados y inventario avanzado 465** (Loyverse). **Carta no limita pedidos: ahí está su ventaja de precio.** Un restaurante de 1,800 visitas genera ≈ 2,340 comandas al mes [supuesto: 1.3 por visita] y eso lo saca de todo plan con tope bajo.
- **El modelo de precios por funciones no sirve con 27 planes: no predice mejor que el promedio.** Error dejando uno fuera: **617 pesos, contra 594 de predecir siempre el promedio**; sus coeficientes tienen intervalos que cruzan el cero (el «valor» del paquete de Carta sale de −197 con intervalo de −1,250 a 771). **No lo uso para fijar precio**; lo dejo escrito porque Calvin pidió contrastar dos métodos y el contraste dice cuál sirve.
- **Que sea barato para el restaurante:** 349 con IVA (404.8) son **0.05 % a 0.10 % del ingreso mensual** de un negocio de los perfiles del simulador y **0.29 % del de uno de 0–5 personas con 20 visitas al día** [supuesto: ticket de 100 pesos por persona]. 2,167 sube a 0.08 %–1.82 %. **Dato por conseguir:** los Censos Económicos 2024 por estrato de personal (§5).
- **Sin preguntar no se puede saber la disposición a pagar.** Para los 10 del piloto: cuatro preguntas tipo Van Westendorp **antes** de mostrar ningún precio, y después una escalera 799 → 549 → 349 → 249 → 149; con 10 respuestas **3 de 10 que pagan** significa un intervalo de 11 % a 60 % (Wilson 95 %): sirve para **un sí o un no**, no para trazar la curva (§6).

---

## 1. Matriz de funciones (33 planes)

El CSV trae cada plan con proveedor, precio, unidad de cobro, **13 funciones** (1 = la página del proveedor lo incluye en ese plan; 0 = la página dice que no lo incluye o es complemento de pago; «no publicado» = la página no lo dice) y límites. **Alcance de la lectura, dicho:** los 33 planes salen de la lectura de páginas del **13 de noviembre** (`2026-11-13-comparativo-de-precios-y-anuncios-datos.csv`) y la página de **OlaClick** se **releyó el 14 de noviembre** con el detalle por plan; no reabrí las demás (regla de la sesión: no repetir lecturas ya citadas). **Por eso hay muchos «no publicado»: significa «no lo dice la parte que se leyó», no «no lo tiene».** La lectura de OlaClick **perdió la tabla de funciones por plan** al convertir la página a texto (sólo quedó lo común a todos los planes: punto de venta, menú digital y CRM, y la facturación como complemento en Advanced y Premium); lo demás queda como «no publicado» y **se confirma viéndola en un navegador**.

**Resumen de lo publicado** (todos [fuente], precios al mes antes de IVA salvo que se indique; detalle y enlaces en el CSV y en el comparativo del 13 de noviembre):

| Proveedor | Planes (MXN al mes) | Qué trae (lo publicado) | Límites | Restaurantes que dice tener |
|---|---|---|---|---|
| Neolo | 0 (200 visitas) · 157 | menú QR; alérgenos e ingredientes | visitas | no publicado |
| OlaClick | 184 · 465 · 1,099 · 2,979 | POS, menú digital y CRM en todos; facturación sólo desde Elite; copiloto de IA en Impulso | **75 · 400 · ilimitados** pedidos | **«más de 40,000 negocios»** (su página, 14-nov); **ellos mismos publican seis cifras distintas** [documento: olaclick-a-fondo §2.3] |
| Meniu | 225 | menú QR, POS, WhatsApp, reservas, inventario, lealtad | prueba de 7 días | no publicado |
| MenuTiger | 0 · 317 · 856 · 2,216 | pedidos por QR; informes desde Regular; pantalla de cocina desde Advanced; gestión de mesas en Premium | **75 · 500 · 2,000 · ilimitados** pedidos; 1, 2, 5, ilimitados locales | no publicado |
| Waitry | 0 · 1,243 | Lite: sólo carta; Premium: pedido y pago en mesa, venta en línea | — | «más de 8,000 restaurantes declarados» [documento: competencia-real, 19-sep] |
| Fudo | 652 · 838 (+ mesas 93, cocina 186, reparto 279) | pedido desde la mesa con carta QR, POS, inventario; Pro: varias cajas | — | no publicado |
| Poster | 495 · 837 · 1,179 | POS, menú QR, inventario; Business: **comandero móvil y KDS**; Pro: reservas | — | no publicado |
| Last.app | 1,000 · 1,700 · 2,900 (+ cocina 250) | POS, 100 a 500 folios de factura | licencias POS 2 / 4 / ilimitadas | no publicado |
| Soft Restaurant Cloud | 699 · 999 · 1,599 | POS, analítica, apps de reparto | 2 / 5 / 10 dispositivos; multisucursal sólo Enterprise | no publicado |
| Soft Restaurant 12 | 799 · 1,099 | POS completo | licencia | no publicado |
| Loyverse | 0 (+ historial 130, empleados 465, inventario 465) | POS, cocina, inventario básico, analítica de 31 días; **sin menú QR** | — | no publicado |
| OpenTable | 2,774 · 5,567 · 9,291 | reservas | por cubierto adicional | no publicado; **fuente secundaria, EE. UU.** |
| Parrot, Wansoft, Soft Restaurant «Menú Digital» | no publican precio | POS; menú con llamar mesero y cuenta | — | no publicado |

**Dato que ningún proveedor publica y que más importa:** *pedido en grupo (una orden compartida entre los comensales de una mesa)* — **ninguna página leída lo menciona**. Es lo que Carta añade y **no tiene precio de mercado**: se valora en cero por prudencia.

---

## 2. Cuánto paga el mercado por cada función

### 2.1 Método (a): diferencias dentro de un mismo proveedor (el más limpio)

Cada fila es un salto entre planes de **la misma marca**; «sube» es la diferencia en pesos [medida sobre el CSV]:

| Proveedor | De → a | Sube | Qué cambia (lo publicado) |
|---|---|---|---|
| OlaClick | Advanced → Premium | **+281 (+153 %)** | 75 → 400 pedidos; facturación sigue como complemento |
| OlaClick | Premium → Elite | **+634 (+136 %)** | 400 → ilimitados; **facturación incluida** |
| OlaClick | Elite → Impulso | +1,880 (+171 %) | copiloto de IA, analítica |
| MenuTiger | Free → Regular | +317 | 75 → 500 pedidos, informes, 2 locales |
| MenuTiger | Regular → Advanced | **+539 (+170 %)** | **pantalla de cocina**, 500 → 2,000 pedidos, 5 locales |
| MenuTiger | Advanced → Premium | +1,360 (+159 %) | ilimitados, gestión de mesas, marca blanca |
| Poster | Mini → Business | **+342 (+69 %)** | **comandero móvil para meseros y KDS** |
| Poster | Business → Pro | +342 (+41 %) | reservas, permisos avanzados |
| Fudo | Avanzado → Pro | +186 (+29 %) | varias cajas, estado de resultados |
| Soft Restaurant Cloud | Lite → Pro → Enterprise | +300 · +600 | más dispositivos; multisucursal |
| Last.app | Starter → Growth → Unlimited | +700 · +1,200 | más licencias y folios |
| Neolo | gratis → Plan 0 | +157 | visitas ilimitadas, alérgenos |

**Complementos con precio propio** (lo más directo de «cuánto cuesta una función»): Fudo — mesas **93**, cocina **186**, reparto **279**; Last.app — cocina **250**; Loyverse — historial **130**, empleados **465**, inventario avanzado **465** [fuente; USD × 18.6188].

**Lo que dicen los saltos:** (1) **los pedidos con tope son lo que más sube el precio** (+281 a +634 por pasar de 75 o 500 a más pedidos); (2) **un comandero con cocina vale ≈ 342** (Poster); (3) **una pantalla de cocina suelta vale 186 a 250**; (4) **un módulo de mesas vale 93**. **Límite del método:** cada salto mezcla varias cosas (en Poster, comandero y KDS vienen juntos), y es **un proveedor a la vez** con n = 1 por salto.

### 2.2 Método (b): modelo de precios por funciones (todos los planes con precio)

Mínimos cuadrados con 5 coeficientes (intercepto y cuatro grupos de funciones: menú y pedido, operación, reservas y reparto, sucursales), **27 planes** con precio (sin OpenTable por ser fuente secundaria y de EE. UU.). **Validación dejando uno fuera** y **2,000 remuestreos bootstrap con semilla fija** [medida]:

| Coeficiente (pesos al mes) | Estimado | Intervalo 90 % |
|---|---|---|
| Intercepto | 632 | 235 a 1,101 |
| Menú y pedido | **−829** | −2,061 a 229 |
| Operación (cocina, POS, pago, factura, inventario) | 1,276 | −59 a 2,776 |
| Reservas y reparto | 188 | −655 a 1,498 |
| Sucursales | 711 | 0 a 1,409 |

**Error dejando uno fuera: 617 pesos; error de predecir siempre el promedio: 594.** Es decir, **el modelo no mejora sobre «pon el promedio»**, y el signo negativo de «menú y pedido» es un artefacto: los planes más baratos son justo los de sólo menú y los más caros no se distinguen por sus funciones sino por el **tope de pedidos y el número de locales**, que la matriz no codifica por plan. **Con n = 27 y planes de entre 0 y 3,000 pesos no hay precisión para esto.** Para repetirlo bien harían falta ≥ 100 planes y los topes como variables (cupo de pedidos, locales).

**Contraste de los dos métodos:** (a) da precios por función **creíbles y comparables** (93, 130, 186–250, 342, 465); (b) **no converge**. **Me quedo con (a)** y con los **sustitutos completos** (§4) como fundamento; (b) queda como resultado negativo.

---

## 3. El paquete de Carta (sólo lo que la v1 tendrá al terminar la Fase 3)

Funciones [documento: `04_Fases_y_Tareas.md` §7 y `CLAUDE.md`]: **menú por QR** (con alérgenos, foto o ilustración, filtros del lado del teléfono) · **pedir desde la mesa** · **orden compartida entre los comensales** · **comanda directo al mesero** (app de mesero con PIN, llamadas) · **ciclo de la mesa** (cuenta cerrada, pago validado por el personal, mesa limpia). **No tiene** punto de venta, caja, pago en la app, facturación, reservas, reparto, inventario ni varias sucursales ni analítica del restaurante.

**Valor de mercado, por piezas** [medida sobre §2.1 y los planes del CSV]:

| Pieza | Precio de mercado | Fuente de la cifra |
|---|---|---|
| Menú QR + pedidos, con tope bajo | **mediana 205** (157, 184, 225, 317) | Neolo Plan 0, OlaClick Advanced, Meniu, MenuTiger Regular |
| Módulo de mesas | **93** | Fudo (complemento) |
| Comandero de mesero (con cocina) | **0 a 342** | Poster Mini → Business (no hay precio suelto) |
| **Quitar el tope de pedidos** | **+539 a +634** | MenuTiger Regular → Advanced; OlaClick Premium → Elite |
| Orden compartida | **sin precio de mercado** (nadie la publica) | — |
| **Suma, con tope bajo** | **≈ 300 a 640** | 205 + 93 + (0 a 342) |
| **Suma, sin tope** (lo que Carta ofrece) | **≈ 840 a 1,270** | la anterior + 539 a 634 |

**Intervalo del valor del paquete: 840 a 1,270 pesos al mes** si se pagara a precios de mercado por todo lo que se publica, **sin contar la orden compartida** y **sin descontar que Carta no trae caja ni factura** (los sustitutos con POS cuestan 745 a 1,117 y sí las traen). **El intervalo es de rango (mínimo a máximo de 4 a 6 planes), no estadístico:** el método (b) no permite intervalo propio. **Lo útil para decidir es el techo del §4, no esta suma.**

---

## 4. Corredor de precio: piso, techo y propuesta

### 4.1 Piso (lo que cuesta atender a un restaurante de paga, pesos al mes)

| Perfil | Costo variable | Parte de la base fija | Comisión de tarjeta (a 349) | Soporte [supuesto] | **Piso a 349** |
|---|---|---|---|---|---|
| Chico | 1.0 | 3.0 | 18.1 | 60 | **82.1** |
| Mediano | 1.9 | 3.0 | 18.1 | 60 | **83.0** |
| Grande | 7.5 | 3.0 | 18.1 | 60 | **88.6** |
| Formal | 3.6 | 3.0 | 18.1 | 60 | **84.7** |

Origen: variable por perfil y base fija (3 pesos con 500 restaurantes), `2026-11-13-planes-y-costo-por-restaurante.md` §0 [documento]; comisión de tarjeta 3.6 % + 3 pesos más IVA [documento: §7.2 del mismo]; **soporte = 30 minutos al mes a 120 pesos la hora [supuesto]; con 30 o 150 pesos el piso va de 53 a 173**. **Lo que domina el piso es el soporte, no el servidor** (60 de 83 pesos): dato más importante por medir (§8). Con transferencia, la comisión es 0.

### 4.2 Techo: lo que el restaurante ya paga por un sustituto que hace lo mismo (sin tope de pedidos publicado) [fuente + medida]

| Perfil | Comandas al mes [supuesto 1.3 por visita] | Sustituto más barato | Pesos | Mediana de los sustitutos |
|---|---|---|---|---|
| Chico, mediano | 2,340 | Fudo Avanzado + módulo de mesas (**con POS e inventario**) | **745** | 1,099 |
| Formal | 1,950 | ídem | **745** | 1,099 |
| Grande | 5,850 | Poster Business (comandero y KDS) 837; Fudo Pro + mesas + cocina 1,117 | **837 a 1,117** | 1,599 |

**Los sustitutos con tope bajo no cuentan para este volumen:** MenuTiger Regular (317, 500 pedidos) y OlaClick Advanced y Premium (75 y 400 pedidos) se agotan en días; MenuTiger Advanced (2,000) se agota con 2,340 comandas. Sólo **servir un volumen real** sin tope cuesta 745 o más. **Para un negocio de 0–5 personas con pocas visitas (20 al día ≈ 800 comandas al mes)** el sustituto razonable es **MenuTiger Regular 317** (500 pedidos) o **OlaClick Premium 465** (400): el techo baja a ≈ 317–465 y 349 queda **al nivel** del sustituto, no abajo. Por eso el gratuito existe.

### 4.3 Propuesta y su regla

**Regla:** `precio = máx( 3 × piso ; 0.5 × sustituto sin tope más barato )`, redondeado hacia abajo a x49 (Servicio) o x99 (Salón). **«La mitad» (K = 0.5) es un [supuesto]**: Carta no trae caja, factura ni inventario; la prueba del §6 lo calibra. Sensibilidad de K:

| K | Servicio (745) | Salón (1,117) | Margen Servicio |
|---|---|---|---|
| 0.4 | 298 → **249** | 447 → **399** | 68 % |
| **0.5** | **372 → 349** | **559 → 549** | **76 %** |
| 0.6 | 447 → **399** | 670 → **649** | 79 % |

### 4.4 Evaluación con esa vara [medida; JSON del corredor]

| Candidato | Veces el piso (mediano) | % del sustituto más barato (745) | % del ingreso (mediano / micro 20 visitas al día) | Veredicto |
|---|---|---|---|---|
| **249** | 3.1 | 33 % | 0.04 % / 0.21 % | Entra al corredor; margen 68 % |
| **349 (Calvin)** | **4.2** | **47 %** | 0.05 % / 0.29 % | **Dentro: coincide con la regla en K = 0.5** |
| **549** | 6.0 | 74 % | 0.09 % / 0.46 % | Arriba de la regla para Servicio; correcto para Salón |
| **799 («Master Chef» del prototipo)** | 7.9 | **107 %** | 0.12 % / 0.67 % | **Por encima del sustituto que trae POS**: sólo defendible para Salón |
| **2,000** | 13.2 | **268 %** | 0.31 % / 1.68 % | **Fuera**: 2.7 veces el sustituto |
| **2,167 (500 por semana × 52 ÷ 12)** | 13.6 | **291 %** | 0.34 % / 1.82 % | **Fuera**: sólo MenuTiger Premium (2,216, ilimitado y marca blanca) y Last.app Unlimited (2,900, POS completo) cuestan más |

**Por qué 349 no es coincidencia pero tampoco una verdad:** sale de K = 0.5 sobre un sustituto de 745 y cae dentro de 249–399; **se podría defender 299 o 399 igual de bien**. Lo que **sí** descartan los datos es **2,000**: no hay un solo sustituto publicado para el mismo trabajo por encima de 1,117 salvo planes que traen POS completo y varios locales.

---

## 5. Que no sea caro: precio como parte del ingreso del restaurante

**Dato oficial que falta:** los **Censos Económicos 2024 por clase 722511 y estrato de personal** (ingresos por suministro de bienes y servicios). **No lo pude obtener:** el boletín 22/25 de INEGI (leído de su PDF oficial, 24 de julio de 2025) da **516,894 personas ocupadas** en la clase 722511 (1.8 % del personal del país) [fuente: `CE2024_def_RR.pdf`], pero **no ingresos por estrato**; el Sistema de Consulta de Censos Económicos de INEGI se arma con JavaScript y mis herramientas no lo ven. **Ruta:** abrirlo en un navegador → *Tabulados* → clase **722511** → desglose por estrato de personal ocupado → «ingresos por suministro de bienes y servicios» y «unidades económicas» (**dato por conseguir**, §8).

**Sustituto mientras tanto [supuesto]:** ingreso = visitas al mes × personas por visita × gasto por persona. Visitas y personas por mesa, del simulador [documento]; **gasto por persona: 100, 160, 220, 450 pesos [supuesto, sin fuente: se mide en las entrevistas]**:

| Perfil | Ingreso mensual supuesto | 349 + IVA | 549 + IVA | 2,167 + IVA |
|---|---|---|---|---|
| Chico (1,800 visitas) | 414,000 | 0.10 % | 0.15 % | 0.61 % |
| Mediano (1,800) | 748,800 | 0.05 % | 0.09 % | 0.34 % |
| Grande (4,500) | 2,970,000 | 0.01 % | 0.02 % | 0.08 % |
| Formal (1,500) | 2,025,000 | 0.02 % | 0.03 % | 0.12 % |
| **Micro de 0–5 personas, 20 visitas al día** | **138,000** | **0.29 %** | — | **1.82 %** |

**Lectura:** **el ingreso supuesto del simulador es alto** (60 visitas al día para un «chico») y por eso los porcentajes son bajos; con el micro de 138,000 al mes un precio de 349 sigue siendo **menos de una tercera parte del 1 %**. **Regla de prudencia [supuesto]:** que el precio **no pase de 1 % del ingreso del negocio más chico del plan**; 349 cumple con margen de ×3; 2,167 la rompe. **La cifra de gasto por persona cambia todo esto: hay que medirla.**

---

## 6. Lo que no se puede saber sin preguntar: la disposición a pagar

**Prueba para los 10 del piloto** (≈ 10 minutos por restaurante; **antes** de mostrar cualquier precio o descuento, para no sesgar):

**Paso 1 — cuatro preguntas Van Westendorp** (respuesta libre en pesos al mes con IVA, por separado):
1. ¿A qué precio al mes le parecería **tan barato** que dudaría de la calidad?
2. ¿A qué precio le parecería **una ganga** (barato pero bueno)?
3. ¿A qué precio empezaría a parecerle **caro** (lo pensaría dos veces)?
4. ¿A qué precio le parecería **demasiado caro** para contratarlo?

**Paso 2 — escalera de precios** (descendente, sin ver los siguientes): «Carta, con lo que ya usó en 6 semanas, cuesta **799** al mes: ¿lo contrataría?» y, si no, **549 → 349 → 249 → 149**. Se anota el primer precio al que dice que sí.

**Paso 3 — la prueba de verdad** (la de la estrategia de precios, §5): hoja con **349**, y una de tres respuestas: pagó el primer mes por transferencia · firmó carta de compromiso · dijo que no y por qué. **Ésa es la señal más fuerte; las respuestas hablan, la transferencia cuesta.**

**Cómo se lee** (con n = 10; **no hay curva**, hay un sí o un no):
| Resultado | Lectura | Qué se hace |
|---|---|---|
| ≥ 3 de 10 pagan o firman a 349 | Se sostiene [criterio fijado de la estrategia de precios, 13-nov] | Mantener 349; probar 449 con los siguientes 10 |
| < 3 a 349 pero ≥ 3 aceptan 249 | El precio está arriba | Bajar a 249–299 |
| < 3 incluso a 249 | **No es el precio**: es el valor o el motivo del «no» | Leer las razones: topes, funciones, soporte |
| La mediana de «caro» (pregunta 3) < 349 | El precio sólo se sostiene con quienes ya le ven el valor | No subir; atender a quien pagó |

**Cuánto dice con 10:** si pagan 3 de 10, el intervalo de la tasa de pago es **11 % a 60 %** (Wilson 95 %) [medida]: **se puede descartar que sea ≈ 0 o ≈ 100 %, nada más**. Para fijar el precio con curva hacen falta muchas más respuestas (**≈ 100** [supuesto: regla práctica, sin fuente; Van Westendorp se suele usar con 30 a 50 o más]). **El sesgo más probable:** los 10 del piloto **son quienes aceptaron probar**; pagarán más de lo que pagaría el negocio promedio.

---

## 7. D · ¿Para qué sirve el gasto de los hogares en comer fuera?

**La cifra, ya corregida:** el hogar mexicano gasta **3,896 pesos al trimestre en alimentos y bebidas fuera de casa** (≈ 1,299 al mes), **21.7 % de su gasto en alimentos y 8.2 % del gasto monetario**, **+19.2 % de 2022 a 2024** [fuente: INEGI, ENIGH 2024, presentación nacional, julio de 2025, <https://www.inegi.org.mx/contenidos/programas/enigh/nc/2024/doc/enigh2024_ns_presentacion_resultados.pdf>; hogar de 3.35 personas]. (La versión anterior usó el archivo de Tabasco como si fuera el nacional: 2,249; **corregido** [documento: estadística de cartas §8].)

**Qué decisiones mueve:**

| Decisión | Cómo la mueve el dato | Ejemplo |
|---|---|---|
| **Tamaño del lado del comensal** (capa de pago, anuncios, patrocinio) | Fija el **techo de lo que un comensal podría pagar o lo que un anunciante puede captar**; no el precio de Carta al restaurante | La capa «Carta+» de 29 pesos al mes es **2.2 % del gasto mensual del hogar en comer fuera** (29 ÷ 1,299), **1.1 % en CDMX** (7,915 al trimestre) |
| **Ciudades por donde empezar** | Dónde hay más gasto por hogar **y** más negocios | CDMX (**7,915**, 55,753 unidades de la rama 7225) y Jalisco (**5,267**, 48,957) lideran en las dos columnas; Querétaro (6,051), Baja California (5,790) y Colima (5,491) gastan más que el promedio pero tienen menos negocios; Oaxaca (2,212, 35,759) y Guanajuato (2,870, 33,392) gastan menos |
| **Capa del comensal y anuncios a futuro** | Los anunciantes pagan por **gasto del público que alcanzan** | Un anuncio en CDMX llega a hogares que gastan 2.0× el promedio nacional |

**Qué decisiones NO mueve:**
- **Lo que un restaurante paga por Carta.** El gasto del hogar **no** es el ingreso del restaurante ni su disposición a pagar: ni mide cuántos platillos vende, ni dice qué sustituto usa. Eso lo fijan **el sustituto más barato y el costo de servir** (§4) y se prueba **preguntando** (§6). Usarlo para fijar el precio mezclaría dos mercados.
- **Cuántos restaurantes hay** (eso lo da el DENUE) ni **cuántos aceptarían Carta** (eso lo da el piloto).
- **La frecuencia con que se come fuera:** la ENIGH mide pesos, no visitas; no existe cifra oficial en veces al mes [documento: estadística §8].

**Por qué Calvin lo pidió y por qué antes pareció irrelevante:** era irrelevante **para el precio al restaurante** (es la pregunta de este informe), pero **sí lo es para el lado del comensal y para elegir ciudad**. Es la única cifra oficial que conecta el consumo con las decisiones futuras de Carta+ y anuncios.

---

## 8. Datos por conseguir

| Dato | Para qué | Cómo se obtiene | Costo |
|---|---|---|---|
| **Censos Económicos 2024: ingresos por estrato, clase 722511** | §5 | Navegador → Sistema de Consulta de CE 2024 de INEGI → tabulado por clase 722511 y estrato | 0 |
| Gasto por persona y ticket real, por tipo de negocio | §5 (hoy [supuesto]) | Entrevistas del piloto; reporte de ventas del dueño | 0 |
| Tabla de funciones por plan de OlaClick, Fudo, Poster, Last.app, Soft Restaurant, MenuTiger | Completar el CSV (hoy sólo se releyó OlaClick) | Ver cada página en un navegador (el texto extraído pierde las tablas) | 1–2 h |
| Cuántos restaurantes dicen tener (todos menos OlaClick y Waitry) | Mercado | Las páginas de inicio de cada proveedor | 1 h |
| Soporte real por restaurante de paga | El 60 del piso | Contar tickets y minutos del piloto | 0 |
| Comandas por visita | El volumen que define el sustituto | `comanda` del piloto | 0 |
| Disposición a pagar | §6 | La prueba del piloto | 0 |
| Pagos recurrentes con tarjeta en México (comisión real) | Piso | Cotización de la pasarela elegida | 0 |
