# Modelo de escenarios de Carta: variables globales, tres casos y la mejor configuración

**Fecha:** 14 de noviembre de 2026 · **Rama:** `agente/planes-precio-historial` · **Estado:** modelo en código para decidir; la v1 no cobra ni tiene planes.
**Código:** [`…-modelo-de-escenarios.mjs`](2026-11-14-modelo-de-escenarios.mjs) (módulo ES sin dependencias, funciones puras; corre igual en `node` y en el navegador: no usa `fs`, `process`, `window` ni `fetch`) · **Parámetros:** [`…-parametros.json`](2026-11-14-parametros.json) (50 parámetros, cada uno con valor, rango, origen y fuente) · **Pruebas:** [`…-pruebas.mjs`](2026-11-14-pruebas.mjs) (`node 2026-11-14-pruebas.mjs`: 23 pruebas, todas pasan) · **Resultados listos para graficar:** [`…-modelo-de-escenarios-resultados.json`](2026-11-14-modelo-de-escenarios-resultados.json) (generado por [`…-corre-escenarios.mjs`](2026-11-14-corre-escenarios.mjs)).

**Marcas.** *medido* (lo medí con datos) · *documento* (otro documento del repositorio) · *fuente* (página o norma citada) · ***supuesto*** (juicio mío, con rango y forma de medirlo) · *sin dato*. Pesos al mes, antes de IVA. Nombres de los planes del prototipo: **Chef** (gratis) y **Master Chef** (`prototipo/js/admin-onboarding.jsx`, paso 3 «Elige tu plan»); el prototipo sólo tiene dos, así que el tercero se llama aquí **Chef Ejecutivo** (propuesta mía, sin pantalla que lo respalde). Equivalencias en el [glosario](2026-11-14-glosario-de-negocio.md).

---

## 0. Conclusiones

- **El peor caso se sostiene sólo con anuncios.** Con todos gratuitos y sin anuncios, Carta pierde **218 pesos al mes con 100 restaurantes, 637 con 1,000 y 5,479 con 10,000**. Con anuncios en la tarifa **baja** (3.5 pesos por mil visitas) deja **+500, +6,538 y +66,271**. **La tarifa de anuncios no tiene fuente fuerte** y AdSense puede no aprobar el sitio: sin anuncios, el peor caso exige **de 1 a 4 clientes de paga con 100 o 1,000 restaurantes y 31 con 10,000**.
- **Por cada cliente de paga se sostienen 77 a 99 gratuitos con 100 restaurantes, 270 a 345 con 1,000 y 314 a 401 con 10,000** (sin anuncios; el costo por gratuito baja con la escala porque el servidor se reparte). **Con anuncios, cada gratuito se paga solo** si deja más de lo que cuesta: 7.2 pesos contra 0.5–2.2 pesos de costo por gratuito en la tarifa baja.
- **Ingreso y costo por cliente al mes (configuración recomendada, 1,000 restaurantes):** un gratuito deja **7.2 pesos con anuncios (tarifa baja; 28.7 en la media) y cuesta 0.6**; un cliente de paga deja **249 pesos y cuesta 77** (soporte 60, comisión de tarjeta 15.5, servidor ≈ 1.5) = **172 pesos de margen**.
- **Margen esperado con 1,000 restaurantes** (tres curvas de pago): **8,150 / 14,496 / 44,492 pesos al mes** (pesimista / media / optimista), **86 % / 77 % / 71 %** de los ingresos. A 10,000: **82,394 / 146,166 / 445,548**. **Mejor caso (todos pagan): 176,984 con 1,000 y 1,774,633 con 10,000** (69 %); exige repetir la pila de servidores (2 y 12 instancias).
- **La configuración que sale de `optimizar` con las restricciones por defecto** (peor caso sostenible, ningún muro rebasado, al menos **60 % dentro del gratuito**, al menos 3 meses de historial en línea y 80 platillos): **Servicio 249, Chef Ejecutivo 499, gratuito de 10 mesas, 3 cuentas y 80 platillos, 3 meses de historial en línea para la paga, anuncios sí**. Los topes de mesas y cuentas **coinciden con lo que Calvin ya decidió**; no los forcé. Margen: **14,496 pesos al mes con 1,000 restaurantes** (curva media, tarifa baja). Detalle en [recomendaciones](2026-11-14-recomendaciones.md).
- **El óptimo es tan bueno como la curva de pago, y la curva es supuesto.** Con tres curvas, el precio que maximiza el margen por restaurante que rebasa topes es **163 / 218 / 580 pesos**: **la zona 200–300 es casi plana** (a 250 el margen por elegible es 22.6 contra 23.1 en 200). **Lo sustituye la prueba del piloto** (Van Westendorp y escalera de precios, [precio §6](2026-11-14-precio-con-fundamento.md)).
- **Crecimiento (recomendada, curva media, meta de 300 restaurantes a 12 meses y 1,200 a 24):** a los 12 meses 300 restaurantes, 14 de paga, margen mensual 4,090; a los 24, 1,200 y 57, margen 17,489; a los 36, 2,700 y 129, margen 39,226. **Primer mes con margen positivo: el 3.º (media), el 4.º (pesimista) y el 2.º (optimista).** El escalón de servidor sube de Hobby a Pro de 2 procesos al mes 12 (disco de 5 GB) y a 4 procesos al 24.

---

## 1. Cómo usarlo (para la otra sesión)

```js
import * as M from './2026-11-14-modelo-de-escenarios.mjs';
const par = await (await fetch('./2026-11-14-parametros.json')).json();  // o inlinado
const s = M.valores(par, { soporte_servicio: 90 });                     // supuestos, con sobrescrituras
const config = M.configBase();                                          // variables globales de configuración
config.precios.servicio = 299;
const e = M.evaluar(config, s, 1000, { curva: 'media' });               // un punto
const t = M.proyectar(config, s, 36, { curva: 'media' });               // 36 meses
const esc = M.escenarios(config, s, [100, 1000, 10000]);                // peor, mejor y esperado (3 curvas)
const opt = M.optimizar(s, { minDentro: 0.6 });                         // mejor configuración y frontera
const p = M.precioOptimo('media', s);                                   // precio que maximiza el margen
```

**Funciones (todas puras):** `valores`, `evaluar`, `proyectar`, `escenarios`, `optimizar`, `precioOptimo`, `precioSugerido`, `redondea`, `piso`, `puntoEquilibrio`, `parteRebasa`, `conversion`, `mbPorRestaurante`, `cabenEnVolumen`, `escalonPara`, `configBase`, `interp`, `phi`.

### 1.1 Variables de configuración (`config`)

| Variable | Qué es | Valor base |
|---|---|---|
| `precios.servicio`, `precios.salon` | Precio de **Master Chef** y de **Chef Ejecutivo** | 299 y 399 |
| `topes.gratuito.{platillos, mesas, cuentas, lecturas_pdf, meses_en_linea}` | Lo que cabe en **Chef** (gratis) | 80 · 10 · 3 · 3 en total · 1 |
| `topes.servicio.*`, `topes.salon.*` | Lo mismo para los planes de paga | meses en línea 3 y 6; lecturas 10 y 20 al mes |
| `disco.meses_analitica_en_linea` | Meses de analítica en bruto, por plan | 1 |
| `disco.archivar` | Si lo que sale de línea se guarda en frío (sólo cambia la oferta y el costo del almacenamiento de objetos) | sí |
| `anuncios.{activo, tarifa}` | Anuncios en Chef; tarifa `baja` (3.5 pesos por mil visitas), `media` (14) o `alta` (37) | sí, `media` |
| `curva` | Curva de pago: `pesimista`, `media` u `optimista` | `media` |
| `competencia.{sustituto, k}` | Contra quién se compite y K, **sólo para `precioSugerido`** | Fudo Avanzado, 0.5 |

### 1.2 Qué devuelve `evaluar`

`clientes` (gratuito, servicio, salón, de paga) · `capacidad` (carga en gratuitos típicos, disco, **escalón más barato que alcanza**, **muro que manda**, ratios por muro, instancias, `requiere_arquitectura`) · `ingresos` (suscripción, anuncios) · `costos` (servidor, almacenamiento, objetos, soporte, comisión) · `margen` (pesos y porcentaje) · `por_cliente` (ingreso y costo del gratuito y del de paga) · `equilibrio_pagantes` · `gratuitos_que_sostiene_un_pagante` (`null` = el gratuito se paga solo) y su versión sólo con costo variable.

**Convenciones.** El ingreso es el precio **antes de IVA** (el IVA no es ingreso); la comisión de tarjeta se cobra sobre lo que paga el cliente **con IVA** (3.6 % + 3 pesos, más IVA) [documento: planes-y-costo §7.2]. **El costo variable por restaurante de planes-y-costo (1 a 8 pesos) NO se suma aparte**: ya está dentro del costo del servidor por carga (se usa sólo en `piso` y en el corredor). La carga en el procesador se mide en «gratuitos típicos»: un restaurante de Master Chef pesa 2.3 y uno de Chef Ejecutivo 6 *(supuesto)* [documento: anuncios-y-capa-del-comensal].

### 1.3 Muros y escalones de servidor

Cinco escalones [documento: anuncios-y-capa-del-comensal §0, mapa-de-procesos §3] con su capacidad en **gratuitos típicos**: Hobby con sondeo (**148**), Hobby con eventos (**1,064** por procesador; **299** por disco de 5 GB), Pro de 2 procesos (**1,064**), de 4 (**1,896**) y de 8 (**2,116**, topado por las **10,000 conexiones abiertas** de Railway, que las réplicas no suben). El modelo escoge el **más barato en que cabe**; si ninguno, **repite la pila** (`requiere_arquitectura = true`, costo = instancias × costo por instancia, *supuesto: extrapolación, no medida*). **Arriba de ≈ 2,100 restaurantes típicos hay que cambiar la arquitectura**: es el hallazgo de escalabilidad más importante del modelo.

---

## 2. Qué supone el modelo (y dónde está el dato que lo cerraría)

| Supuesto | Valor y rango | Origen | Qué lo sustituye |
|---|---|---|---|
| **Cuántos pagan en función del precio** (`curvas_pago`): `techo × P(W ≥ precio)`, W lognormal | pesimista (mediana 157, σ 0.5, techo 15 %), media (205, 0.6, 35 %), optimista (652, 0.6, 60 %) | **supuesto**; la mediana sale de planes comparables (el más barato 157; mediana de los de menú QR + pedidos 205; Fudo Avanzado 652) | La prueba de precio del piloto |
| **Quién rebasa los topes del gratuito** | 10 mesas: 39 % (16–71); 3 cuentas: 36 %; 80 platillos: 10.8 % (medida) | **supuesto** (modelo de mesas y cuentas, no estadística) | `mesa`, `personal_restaurante` y `platillo` de los primeros 10–20 restaurantes |
| **Traslape de los topes** (`traslape_topes`) | 0 (se toma el mayor, cota inferior de los que pagan) a 1 (se suman) | **supuesto** | Los mismos datos |
| **Tarifa de anuncios** | 3.5 / 14 / 37 pesos por mil visitas | **supuesto** (cadena de tres eslabones de fiabilidad baja) | Prueba de AdSense con 3 restaurantes |
| **Soporte** | 60 pesos por cliente de paga al mes (30–150) | **supuesto** | Tickets y minutos del piloto |
| **Visitas con la app por gratuito** | 2,050 al mes | medido en el simulador; el 0.6 de «abre la app» es supuesto | Eventos `scan` del piloto |
| **Disco por restaurante** | 7.1–8.5 KB por visita | **medido** ([disco](2026-11-14-disco-e-historial.md)); 10 eventos por visita es supuesto | Consultas al piloto |
| **Adopción** | 300 restaurantes a 12 meses y 1,200 a 24 | **supuesto** (SOM del escenario, rangos 50–3,000 y 200–10,000) | El plan comercial |
| **Costo de conseguir un cliente y valor de un cliente** | — | **sin dato** | Gasto comercial ÷ clientes; ingreso mensual × permanencia |

---

## 3. Los tres escenarios con nombre

Configuración base de la tabla = la **recomendada** (§4). Pesos al mes. «Anuncios» = tarifa baja salvo que se indique. «Pagantes» = restaurantes de Master Chef o Chef Ejecutivo. Resultados completos y los de la configuración base en el JSON de resultados.

| | 100 restaurantes | 1,000 | 10,000 |
|---|---|---|---|
| **Peor: todos gratuitos, sin anuncios** | margen **−218** · gratuitos 100 · costo 218 | **−637** | **−5,479** |
| **Peor: todos gratuitos, con anuncios** (tarifa baja) | **+500** (70 %) | **+6,538** (91 %) | **+66,271** (92 %) |
| ídem, tarifa media | +2,652 | +28,063 | +281,521 |
| **Esperado, pesimista** | 1 de paga · margen **+661** | 10 de paga · **+8,150** (86 %) | 97 de paga · **+82,394** (87 %) |
| **Esperado, media** | 5 de paga · **+1,304** | 48 de paga · **+14,496** (77 %) | 477 de paga · **+146,166** (77 %) |
| **Esperado, optimista** | 22 de paga · **+4,303** | 216 de paga · **+44,492** (71 %) | 2,164 de paga · **+445,548** (71 %) |
| **Mejor: todos pagan** | **+17,414** (68 %) | **+176,984** (69 %) · pide 2 instancias | **+1,774,633** (69 %) · 12 instancias |
| Escalón y muro (esperado, media) | Hobby con eventos · disco | Pro de 4 procesos · procesador | 6 instancias de Pro de 8 · conexiones |

**Rango de confianza.** «Esperado» es un **rango de tres curvas**, no un intervalo estadístico: no hay datos para uno. Con 1,000 restaurantes: **8,150 a 44,492 pesos al mes, centro 14,496**. El ancho se debe casi todo a la curva (§2): **por eso el piloto vale más que cualquier refinamiento del modelo.**

**Qué dicen las tres columnas.** (1) **100 restaurantes no pagan ni un sueldo, ni siquiera en el mejor caso razonable** (4,303 pesos al mes en el optimista). (2) **Con 1,000 y la curva media el margen no llega a 15,000 pesos al mes y el 36 % de los ingresos son anuncios**: depende de una tarifa que no existe. (3) **A 10,000 el modelo ya no es válido sin rediseñar el servidor** (12 instancias en el mejor caso).

---

## 4. La mejor configuración (derivada, no sólo cálculo)

**Cálculo diferencial, mostrado.** Para un precio `p` y una curva, el margen por restaurante que rebasa topes es `f(p) = conversión(p) × (p − soporte − comisión(p))`. **El óptimo es donde `f′(p) = 0`**; el módulo lo busca en rejilla de 1 peso y verifica la derivada numérica en el óptimo (valor ≈ 0, probado):

| Curva | Precio óptimo de Master Chef | Conversión en el óptimo | Margen por restaurante que rebasa |
|---|---|---|---|
| Pesimista | **163** | 7.1 % | 6.5 |
| **Media** | **218** | 16.1 % | 23.1 |
| Optimista | **580** | 34.6 % | 169.2 |

**Lectura:** `f` es **plana entre 200 y 300** (23.1 → 22.6 de 200 a 250; 20.4 a 300): **cualquier precio de 200 a 300 pierde menos de 11 % del óptimo en la curva media**. El óptimo sube con la mediana de la curva: **si el dueño promedio paga lo que Fudo (652), el óptimo es 580**. **No confundir** el precio que maximiza el margen con el que da la regla del corredor (249 a 349, que se ancla en el sustituto); coinciden en 249 en la curva media.

**Optimización completa** (rejilla de 2,400 configuraciones: precio de Master Chef × mesas × cuentas × platillos × meses de historial × anuncios): restricciones por defecto = (a) el peor caso (todos gratuitos, con anuncios en tarifa **baja**) no pierde dinero; (b) ningún muro rebasado con 1,000 restaurantes; (c) **al menos 60 % queda dentro del gratuito**; (d) historial de paga ≥ 3 meses y platillos ≥ 80 *(piso de servicio al usuario)*. Resultado, con 1,000 restaurantes, curva media y tarifa baja:

| | Valor |
|---|---|
| Precio **Master Chef** | **249** |
| Precio **Chef Ejecutivo** | **499** (la regla con soporte de 120) |
| **Chef** (gratis) | **10 mesas · 3 cuentas · 80 platillos** · 3 lecturas de PDF en total · 1 mes de historial |
| Historial en línea de la paga | **3 meses** (el resto, archivo descargable) |
| Anuncios en Chef | **sí** |
| Margen | **14,496 pesos al mes**; 48 de paga; 61 % dentro del gratuito |
| Sensibilidad a la tarifa de anuncios (misma configuración) | baja **14,496** · media **34,994** · alta **79,895** |
| Sensibilidad a la curva | pesimista **8,150** · media **14,496** · optimista **44,492** |

**Frontera margen contra servicio gratis** (mejor margen posible con cada parte del mercado atendida dentro del gratuito; 1,000 restaurantes):

| Parte dentro del gratuito | Margen al mes | Tope (mesas · cuentas · platillos) |
|---|---|---|
| 50 % | 16,879 | 8 · 2 · 80 |
| 55 % | 16,100 | 8 · 3 · 80 |
| **60 %** | **14,496** | **10 · 3 · 80** |
| 65 % | 13,936 | 12 · 3 · 80 |
| 75 % | 11,984 | 15 · 4 · 80 |
| 80 % | 10,469 | 20 · 5 · 80 |

**Cada 10 puntos más de gratuito (más servicio) cuestan ≈ 2,400 a 3,500 pesos al mes con 1,000 restaurantes.** Eso es el «cálculo diferencial» de Calvin: **el precio de la generosidad**. El óptimo con las restricciones por defecto cae justo en lo que él ya había decidido (10 mesas y 3 cuentas, 80 platillos), **pero esa coincidencia depende de que la restricción de 60 % esté activa**: sin ella, el modelo baja los topes a 8 mesas y 2 cuentas.

---

## 5. Escalabilidad en el tiempo

Recomendada, meta de **300 restaurantes a los 12 meses y 1,200 a los 24** (el supuesto de adopción, ajustable): `restaurantes(t) = a · t^b` con `restaurantes(12) = 300` y `restaurantes(24) = 1,200` (b = 2). Margen al mes y escalón:

| Mes | Restaurantes | De paga (media) | Comensales al mes (media) | Margen (pesimista · media · optimista) | Escalón |
|---|---|---|---|---|---|
| 6 | 75 | 4 | 264,499 | 448 · 931 · 3,180 | Hobby con eventos |
| 12 | 300 | 14 | 1,057,995 | 2,159 · 4,090 · 13,091 | Pro de 2 procesos |
| 18 | 675 | 32 | 2,380,490 | 5,369 · 9,713 · 29,965 | Pro de 2 procesos |
| 24 | 1,200 | 57 | 4,231,982 | 9,768 · 17,489 · 53,483 | Pro de 4 procesos |
| 36 | 2,700 | 129 | 9,521,959 | 21,857 · 39,226 · 120,210 | **Pro de 8 + repetir** |

**Margen acumulado a 24 meses:** 79,714 (pesimista) · **145,294 (media)** · 450,879 (optimista) pesos [antes de costo de conseguir clientes y de tu sueldo]. **Los comensales** son visitas con la app de la mesa (113.9 al día por gratuito típico, 190.5 por paga, 30 días). El escalón sube **por disco** al principio (5 GB de Hobby) y **por procesador** después.

---

## 6. Límites del modelo (dichos)

- **No hay costo de conseguir clientes, impuestos sobre la renta, factura ni sueldo.** CAC y LTV están en `parametros.json` como «sin dato».
- **La adopción es una meta, no una predicción.**
- **Los anuncios pesan:** 36 % de los ingresos en la media a 1,000 restaurantes con tarifa baja, **más del doble con la tarifa media**. Si AdSense no aprueba el sitio, el peor caso exige pagantes (§0).
- **El conjunto de planes grande/chico** usa una sola mezcla de tamaños por plan.
- **Los muros salen de un simulador** (no de una prueba de carga) con ±2× de margen en lo que depende del CPU de Railway; la T-4.4 lo medirá.
- **Reproducibilidad:** `node 2026-11-14-pruebas.mjs` reproduce las cifras ya publicadas: equilibrio **9.7** a 349 (piso 85.3 con la comisión sobre precio con IVA; **83** con la comisión sobre el precio sin IVA, la forma de la primera versión), **14, 22, 38 y 128** de paga en 5 GB, **1,064, 1,896 y 2,116** gratuitos por escalón, **298–299** por disco en Hobby, y el corredor **249, 299 y 349**.
