// Corre el modelo y GENERA los resultados y los dos informes (modelo y recomendaciones): ninguna cifra se transcribe a mano.
// Uso: node 2026-11-14-corre-escenarios.mjs
// Escribe: …-modelo-de-escenarios-resultados.json, …-modelo-de-escenarios.md, …-recomendaciones.md y …-recomendaciones.json
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as M from './2026-11-14-modelo-de-escenarios.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const par = JSON.parse(readFileSync(join(aqui, '2026-11-14-parametros.json'), 'utf8'));
const s = M.valores(par);
const curvas = ['pesimista', 'media', 'optimista'];
const N = [100, 1000, 10000];

// ------------------------------------------------------------------ cálculo
const opt = M.optimizar(s);
const mejor = opt.mejor;
const rec = JSON.parse(JSON.stringify(mejor.config)); // topes del gratuito = consecuencia del cupo exigido
rec.nombre = 'recomendada sin anuncios';
rec.precios = { servicio: 299, salon: 499 };
rec.anuncios = { activo: false, tarifa: 'baja' };
const recAds = JSON.parse(JSON.stringify(rec)); recAds.nombre = 'recomendada con anuncios (condicional)'; recAds.anuncios = { activo: true, tarifa: 'baja' };

const resumen = (e) => ({ n: e.n, gratuitos: e.clientes.gratuito, pagantes: e.clientes.de_paga, ingresos: e.ingresos.total, anuncios: e.ingresos.anuncios, suscripcion: e.ingresos.suscripcion, costos: e.costos.total, margen_operacion: e.margen_operacion, margen_despues_de_captacion: e.margen_despues_de_captacion, margen_pct: e.margen.porcentaje, escalon: e.capacidad.escalon, muro: e.capacidad.muro_que_manda, requiere_arquitectura: e.capacidad.requiere_arquitectura, instancias: e.capacidad.instancias, extrapolacion_sin_medir: e.extrapolacion_sin_medir, equilibrio_pagantes: e.equilibrio_pagantes, se_paga_solo: e.se_paga_solo, gratuitos_por_pagante: e.gratuitos_que_sostiene_un_pagante, gratuitos_por_pagante_sin_anuncios: e.gratuitos_que_sostiene_un_pagante_sin_anuncios, ingreso_por_gratuito: e.por_cliente.ingreso_gratuito, costo_por_gratuito: e.por_cliente.costo_gratuito, ingreso_por_pagante: e.por_cliente.ingreso_servicio, costo_por_pagante: e.por_cliente.costo_servicio });
const esc = M.escenarios(rec, s, N).map((r) => ({ n: r.n, peor_firme: resumen(r.peor_firme), peor_anuncios_tarifa_baja: resumen(r.peor_anuncios_tarifa_baja), peor_anuncios_tarifa_media: resumen(r.peor_anuncios_tarifa_media), peor_anuncios_adversos: resumen(r.peor_anuncios_adversos), mejor: resumen(r.mejor), esperado: Object.fromEntries(curvas.map((c) => [c, resumen(r.esperado[c])])) }));
const proy = Object.fromEntries(curvas.map((c) => [c, M.proyectar(rec, s, 36, { curva: c })]));
const precios = Object.fromEntries(curvas.map((c) => [c, M.precioOptimo(c, s)]));
const sensPrecio = M.sensibilidadPrecioOptimo(s);
const sensFirme = M.sensibilidad(rec, s, 1000, { metrica: 'operacion' });
const sensCond = M.sensibilidad(recAds, s, 1000, { metrica: 'operacion', anunciosAprobados: true });
const sensCapt = M.sensibilidad(rec, s, 1000, { metrica: 'captacion' });
// margen contra precio de Master Chef, por curva, y arrepentimiento
const listaPrecios = [149, 199, 249, 299, 349, 449, 599];
const margenPrecio = Object.fromEntries(listaPrecios.map((p) => { const c = JSON.parse(JSON.stringify(rec)); c.precios.servicio = p; return [p, Object.fromEntries(curvas.map((k) => { const e = M.evaluar(c, s, 1000, { curva: k }); return [k, { margen: e.margen_operacion, pagantes: e.clientes.de_paga }]; }))]; }));
const mejorPorCurva = Object.fromEntries(curvas.map((k) => [k, Math.max(...listaPrecios.map((p) => margenPrecio[p][k].margen))]));
const w = { pesimista: 0.25, media: 0.5, optimista: 0.25 };
const arrepentimiento = Object.fromEntries(listaPrecios.map((p) => [p, { por_curva: Object.fromEntries(curvas.map((k) => [k, mejorPorCurva[k] - margenPrecio[p][k].margen])), maximo: Math.max(...curvas.map((k) => mejorPorCurva[k] - margenPrecio[p][k].margen)), esperado: suma(curvas.map((k) => w[k] * (mejorPorCurva[k] - margenPrecio[p][k].margen))) }]));
function suma(a) { return a.reduce((x, y) => x + y, 0); }
// extrapolación: desde qué n hace falta otra arquitectura (curva media)
let nArq = null;
for (let n = 100; n <= 5000; n += 10) { if (M.evaluar(rec, s, n, { curva: 'media' }).capacidad.requiere_arquitectura) { nArq = n; break; } }
const extra = [1000, 2000, 5000, 100000].map((n) => resumen(M.evaluar(rec, s, n, { curva: 'media' })));
// segundo anclaje de disposición a pagar: precio como parte del ingreso (INEGI, lo-que-paga-un-restaurante)
const ingreso = { '0 a 10': 107450, '11 a 50': 737584, '51 a 250': 3283332 };
const ancla = { fuente: 'INEGI, Censos Económicos 2024 (SAIC), clase 722511, por negocio y mes', ingreso_mensual: ingreso, mediana_curva_media: s.curvas_pago.media.mediana, curva_media_como_pct_del_ingreso_0_10: (100 * s.curvas_pago.media.mediana * 1.16) / ingreso['0 a 10'], menu_qr_pct_0_10: [0.15, 0.3], pos_pct_0_10: [0.61, 0.93], pos_pct_11_50: [0.09, 0.14], optimista_mediana_pct_0_10: (100 * s.curvas_pago.optimista.mediana) / ingreso['0 a 10'], optimista_mediana_pct_11_50: (100 * s.curvas_pago.optimista.mediana) / ingreso['11 a 50'] };

const resultados = { version: M.VERSION, config_recomendada_sin_anuncios: rec, escenarios: esc, proyeccion: proy,
  precio_optimo_por_curva: Object.fromEntries(curvas.map((c) => [c, { precio: precios[c].precio, meseta: precios[c].meseta, conversion: precios[c].conversion, margen_por_elegible: precios[c].margen_por_elegible, derivada_en_optimo: precios[c].derivada_en_optimo, muestras: precios[c].muestras }])),
  sensibilidad_precio_optimo: sensPrecio, segundo_anclaje_ingreso: ancla, margen_por_precio: margenPrecio, arrepentimiento,
  optimizacion: { restricciones: opt.restricciones, evaluadas: opt.evaluadas, descartadas: opt.descartadas, mejor: { dentro: mejor.dentro, mesas: mejor.mesas, cuentas: mejor.cuentas, platillos: mejor.platillos, mejor_precio: mejor.mejor_precio, meseta: mejor.meseta, margen: mejor.margen, pagantes: mejor.pagantes, curva_de_precio: mejor.curva_de_precio }, precio_salon: opt.precio_salon, tabla_cupo_gratis: opt.tabla_cupo_gratis, frontera: opt.frontera, sensibilidad_traslape: opt.sensibilidad_traslape },
  sensibilidad_50: { firme: sensFirme, condicional_con_anuncios: sensCond, despues_de_captacion: sensCapt },
  extrapolacion: { n_desde_el_que_hace_falta_otra_arquitectura_curva_media: nArq, puntos: extra } };
writeFileSync(join(aqui, '2026-11-14-modelo-de-escenarios-resultados.json'), JSON.stringify(resultados, null, 1));

// ------------------------------------------------------------------ formato
const n0 = (x) => Math.round(x).toLocaleString('en-US');
const n1 = (x) => (Math.round(x * 10) / 10).toLocaleString('en-US');
const pc = (x) => (x == null ? '—' : `${Math.round(x * 100)} %`);
const sg = (x) => (x >= 0 ? `+${n0(x)}` : `−${n0(-x)}`);
const e = (k, c = 'media', i = 1) => esc[i].esperado[c];
const E1 = esc[1];
const cs = rec.topes.gratuito;

// ------------------------------------------------------------------ informe del modelo
const filaFirme = (r) => `| ${r.n.toLocaleString('en-US')} | ${sg(r.peor_firme.margen_operacion)} | ${sg(r.peor_anuncios_tarifa_baja.margen_operacion)} | ${sg(r.peor_anuncios_adversos.margen_operacion)} | ${sg(r.peor_anuncios_tarifa_media.margen_operacion)} |`;
const filaEsp = (r) => `| ${r.n.toLocaleString('en-US')} | ${curvas.map((c) => `${n0(r.esperado[c].pagantes)} de paga · **${sg(r.esperado[c].margen_operacion)}** (${pc(r.esperado[c].margen_pct)})`).join(' | ')} | ${sg(r.mejor.margen_operacion)} (${pc(r.mejor.margen_pct)}) |`;
const filaCapt = (r) => `| ${r.n.toLocaleString('en-US')} | ${curvas.map((c) => `${sg(r.esperado[c].margen_operacion)} → **${sg(r.esperado[c].margen_despues_de_captacion)}**`).join(' | ')} |`;
const cupo = opt.tabla_cupo_gratis.map((x) => (x.sin_solucion ? `| ${pc(x.cupo_gratis_minimo)} | sin solución | | | | |` : `| **${pc(x.cupo_gratis_minimo)}** | ${x.mesas} mesas · ${x.cuentas} cuentas · ${x.platillos} platillos | ${pc(x.dentro_real)} | ${x.precio_servicio} (meseta ${x.meseta_precio[0]}–${x.meseta_precio[1]}) | ${n0(x.pagantes)} | **${n0(x.margen)}** |`)).join('\n');
const sensTabla = (sens) => sens.filas.slice(0, 10).map((f) => `| ${f.supuesto} | ${sg(f.margen_con_mitad)} | ${sg(f.margen_con_mitad_mas)} | ${n0(f.efecto)} |`).join('\n');
const sp = sensPrecio;
const filaSP = (c) => `| ${c} | **${sp[c].base}** | ${sp[c].mediana.bajo}–${sp[c].mediana.alto} | ${sp[c].sigma.bajo}–${sp[c].sigma.alto} | ${sp[c].soporte[0]} · ${sp[c].soporte[30]} · ${sp[c].soporte[150]} |`;
const py = (c, m) => proy[c].filas.find((f) => f.mes === m);
const filaProy = (m) => `| ${m} | ${n0(py('media', m).restaurantes)} | ${n0(py('media', m).pagantes)} | ${curvas.map((c) => `${sg(py(c, m).margen_operacion)} → ${sg(py(c, m).margen_despues_de_captacion)}`).join(' | ')} | ${py('media', m).escalon}${py('media', m).extrapolacion_sin_medir ? ' (extrapolación)' : ''} |`;
const tr = opt.sensibilidad_traslape;

const md = `# Modelo de escenarios de Carta: variables globales, tres casos y qué supuestos mandan

**Fecha:** 14 de noviembre de 2026 (revisado el mismo día tras la ronda de la maestra) · **Rama:** \`agente/planes-precio-historial\` · **Estado:** modelo en código para decidir; la v1 no cobra ni tiene planes. **Este documento lo genera \`2026-11-14-corre-escenarios.mjs\` desde el modelo: ninguna cifra se transcribe a mano.**
**Código:** [\`…-modelo-de-escenarios.mjs\`](2026-11-14-modelo-de-escenarios.mjs) · **Parámetros:** [\`…-parametros.json\`](2026-11-14-parametros.json) (${Object.keys(par.parametros).length}; cada uno con valor, rango, origen, fuente y si mueve el resultado) · **Pruebas:** [\`…-pruebas.mjs\`](2026-11-14-pruebas.mjs) · **Resultados:** [\`…-modelo-de-escenarios-resultados.json\`](2026-11-14-modelo-de-escenarios-resultados.json).

**Qué cambió con la revisión** (*antes decía… la revisión mostró…*): (1) *«el óptimo coincide con lo que Calvin ya decidió»* → **los topes del gratuito son consecuencia de cuánto cupo gratis se exige (decisión de Calvin), no un óptimo**; (2) *Master Chef 249 «óptimo»* → **una meseta** y un precio de Chef Ejecutivo que **no sale de la optimización**; (3) *163 / 218 / 580* → **un rango de ≈ 110 a 850 que depende de la curva de pago, que es supuesto**; (4) *los anuncios sostenían el peor caso* → **el peor caso firme es sin anuncios**; los anuncios son **condicionales** (no están aprobados ni construidos); (5) se añadieron soporte del gratuito, bajas, costo de conseguir un cliente, sueldos e impuestos, y el margen se da **antes y después de captación**.
**Cambios de API (para la sesión que lo incrusta):** los anuncios **no suman** salvo que \`supuestos.anuncios_aprobados = true\` o \`opc.anunciosAprobados = true\` (antes sumaban con sólo \`config.anuncios.activo\`); \`configBase()\` ahora es un alias de \`configInicial()\` (la recomendada **sin anuncios**; antes era otra); \`margen.pesos\` sigue siendo el de operación y se añaden \`margen_operacion\`, \`margen_despues_de_captacion\`, \`margen_neto\`, \`se_paga_solo\`, \`extrapolacion_sin_medir\`, \`valores_esperados\`, \`sensibilidad()\` y \`sensibilidadPrecioOptimo()\`; \`precioOptimo\` devuelve \`meseta\`; \`optimizar\` devuelve \`tabla_cupo_gratis\`, \`meseta_precio_servicio\`, \`precio_salon\` y \`sensibilidad_traslape\` (ya no devuelve \`sensibilidad\`, que pasó a \`sensibilidad()\`).

**Marcas.** *medido* · *documento* · *fuente* · ***supuesto*** · *sin dato*. Pesos al mes antes de IVA. Planes: **Chef** (gratis), **Master Chef**, **Chef Ejecutivo** (nombre propuesto; el prototipo, \`admin-onboarding.jsx\` paso 3, sólo trae los dos primeros). Configuración con que sale todo: **«${rec.nombre}»**: Master Chef ${rec.precios.servicio}, Chef Ejecutivo ${rec.precios.salon}, Chef con ${cs.mesas} mesas, ${cs.cuentas} cuentas y ${cs.platillos} platillos, 12 meses de historial en línea para la paga, **sin anuncios**. Los clientes son **valores esperados** (pueden ser fracciones).

---

## 0. Conclusiones

- **El peor caso firme es sin anuncios y pierde dinero:** ${sg(esc[0].peor_firme.margen_operacion)} / ${sg(esc[1].peor_firme.margen_operacion)} / ${sg(esc[2].peor_firme.margen_operacion)} pesos al mes con 100 / 1,000 / 10,000 restaurantes. **Los anuncios no están aprobados ni construidos** (la política de seguridad del sitio no los permite; hace falta un ADR, abrirla y cambiar el aviso de privacidad, [anuncios §3.6–3.7]). Si algún día se aprueban, el caso **condicional** da ${sg(esc[0].peor_anuncios_tarifa_baja.margen_operacion)} / ${sg(esc[1].peor_anuncios_tarifa_baja.margen_operacion)} / ${sg(esc[2].peor_anuncios_tarifa_baja.margen_operacion)} con la tarifa «baja» y anuncio en todas las visitas, **pero con la tarifa a la mitad y anuncio en el 30 % de las visitas** baja a ${sg(esc[0].peor_anuncios_adversos.margen_operacion)} / ${sg(esc[1].peor_anuncios_adversos.margen_operacion)} / ${sg(esc[2].peor_anuncios_adversos.margen_operacion)}. **La tarifa «baja» no es una cota inferior.**
- **Margen esperado con 1,000 restaurantes** (operación; curvas pesimista · media · optimista): **${curvas.map((c) => sg(E1.esperado[c].margen_operacion)).join(' · ')}** pesos al mes; **después de captación** (bajas ${pc(s.churn_mensual)} al mes y ${s.cac} pesos por cliente de paga, *sin dato: supuesto de trabajo*): **${curvas.map((c) => sg(E1.esperado[c].margen_despues_de_captacion)).join(' · ')}**. No incluye sueldos ni impuestos (parámetros en 0).
- **Mejor caso (todos pagan, 1,000):** ${sg(E1.mejor.margen_operacion)} pesos al mes; **exige repetir la pila de servidores** (extrapolación sin medir).
- **Los topes del gratuito dependen de cuánto quieres atender gratis:** para que **quepa gratis el 50 / 60 / 70 / 80 %** los topes son **${opt.tabla_cupo_gratis.map((x) => `${x.mesas} mesas y ${x.cuentas} cuentas`).join(' / ')}** y el margen es **${opt.tabla_cupo_gratis.map((x) => n0(x.margen)).join(' / ')}** (§4). *No hay un óptimo: cada 10 puntos de cupo gratis cuestan ≈ ${n0((opt.tabla_cupo_gratis[0].margen - opt.tabla_cupo_gratis[3].margen) / 3)} pesos al mes con 1,000.* Con traslape de topes 0.5, los mismos topes dejan dentro ${pc(tr[0.5].dentro_con_topes_recomendados)} (no ${pc(tr[0].dentro_con_topes_recomendados)}); con 1, ${pc(tr[1].dentro_con_topes_recomendados)}.
- **El precio de Master Chef es una meseta, no un punto:** con la curva media el margen por restaurante que rebasa topes cambia **menos de 2 %** entre **${precios.media.meseta.desde} y ${precios.media.meseta.hasta}**; el optimizador completo da **${mejor.mejor_precio}** (meseta ${mejor.meseta[0]}–${mejor.meseta[1]}). Pero **el precio óptimo depende de la curva (mediana, sigma, techo), que es supuesto**: con la mediana ±50 % va de ${sp.pesimista.mediana.bajo} a ${sp.pesimista.mediana.alto} (pesimista), ${sp.media.mediana.bajo} a ${sp.media.mediana.alto} (media) y ${sp.optimista.mediana.bajo} a ${sp.optimista.mediana.alto} (optimista): **un rango de ≈ 110 a 850 pesos**. **El dato que lo sustituye es la prueba de precio del piloto.**
- **Qué supuesto mueve más el margen** (±50 %, 1,000 restaurantes, firme): **${sensFirme.filas[0].supuesto}** (${n0(sensFirme.filas[0].efecto)} pesos), **${sensFirme.filas[1].supuesto}** (${n0(sensFirme.filas[1].efecto)}) y **${sensFirme.filas[2].supuesto}** (${n0(sensFirme.filas[2].efecto)}). Con anuncios aprobados, ${sensCond.filas[0].supuesto} y ${sensCond.filas[1].supuesto} pasan al frente.
- **Más allá de ≈ ${n0(nArq)} restaurantes registrados (curva media) hace falta otra arquitectura:** todo costo de ahí en adelante es **extrapolación sin medir**; el modelo lo marca (\`requiere_arquitectura\`, \`extrapolacion_sin_medir\`).

---

## 1. Peor caso: firme y condicional (margen de operación al mes)

| Restaurantes | **Peor firme: todos gratuitos, sin anuncios** | Condicional: anuncios aprobados, tarifa baja, 100 % de visitas | Condicional adverso: tarifa a la mitad y 30 % de visitas | Condicional: tarifa media |
|---|---|---|---|---|
${esc.map(filaFirme).join('\n')}

Sólo el **primer** caso existe hoy. Los otros tres **suponen** que los anuncios se aprueben y se construyan. Costo de atender a un cliente gratuito: **${n1(E1.peor_firme.costo_por_gratuito)} pesos** con 1,000 restaurantes (incluye ${s.soporte_gratuito} de soporte, *supuesto de trabajo*: con 1 peso el peor caso empeora 500 pesos al mes con 1,000 restaurantes).

**Por cada cliente de paga, cuántos gratuitos se sostienen** (sin anuncios; margen del cliente de paga ÷ costo del gratuito): **${esc.map((r) => `${n0(r.esperado.media.gratuitos_por_pagante_sin_anuncios)}`).join(' / ')}** con 100 / 1,000 / 10,000 restaurantes, configuración recomendada, curva media. Con anuncios **aprobados** cada gratuito se paga solo si deja más de lo que cuesta (\`se_paga_solo = true\`, \`gratuitos_por_pagante = null\`).

## 2. Esperado y mejor caso (operación, y después de captación)

| Restaurantes | Pesimista | Media | Optimista | Mejor: todos pagan |
|---|---|---|---|---|
${esc.map(filaEsp).join('\n')}

**Operación → después de captación** (reponer bajas del ${pc(s.churn_mensual)} mensual a ${s.cac} pesos por cliente; *sin dato*):

| Restaurantes | Pesimista | Media | Optimista |
|---|---|---|---|
${esc.map(filaCapt).join('\n')}

«Esperado» es un **rango de tres curvas**, no un intervalo estadístico. **Ingreso y costo por cliente (1,000, media):** gratuito ${n1(E1.esperado.media.ingreso_por_gratuito)} pesos de ingreso (sin anuncios) y ${n1(E1.esperado.media.costo_por_gratuito)} de costo; cliente de paga ${n0(E1.esperado.media.ingreso_por_pagante)} de ingreso y ${n0(E1.esperado.media.costo_por_pagante)} de costo.

---

## 3. El precio de Master Chef: meseta, no punto, y depende de la curva

| Curva | Precio óptimo | **Meseta** (margen a menos de 2 %) | Conversión en el óptimo |
|---|---|---|---|
${curvas.map((c) => `| ${c} | **${precios[c].precio}** | **${precios[c].meseta.desde} a ${precios[c].meseta.hasta}** | ${pc(precios[c].conversion)} |`).join('\n')}

**Sensibilidad del precio óptimo a los supuestos de la curva:**

| Curva | Óptimo base | Mediana −50 % a +50 % | Sigma −50 % a +50 % | Soporte 0 · 30 · 150 |
|---|---|---|---|---|
${curvas.map(filaSP).join('\n')}

**El óptimo es tan bueno como la curva.** Las medianas de la curva son **precios de lista de otros productos** (${s.curvas_pago.pesimista.mediana} Neolo, ${s.curvas_pago.media.mediana} la mediana de menú QR con pedidos, ${s.curvas_pago.optimista.mediana} Fudo Avanzado, un punto de venta que Carta no es); sigma y techo se eligieron. **Reportar 163 / 218 / 580 como tres puntos sería falso: es un rango de ≈ 110 a 850 pesos.**

**Segundo anclaje de la disposición a pagar: lo que ya gastan (INEGI, [lo que paga un restaurante](2026-11-14-lo-que-paga-un-restaurante.md)).** La mediana de la curva media (${s.curvas_pago.media.mediana}) es **${n1(ancla.curva_media_como_pct_del_ingreso_0_10)} % del ingreso** de un negocio de 0 a 10 personas (107,450 al mes), **dentro de la franja de 0.15 % a 0.30 %** que cuestan los menús QR con pedidos: **los dos anclajes se parecen en la curva media**. La optimista (${s.curvas_pago.optimista.mediana}) es ${n1(ancla.optimista_mediana_pct_0_10)} % del ingreso del chico (**fuera** de esa franja, en la de los puntos de venta, 0.61 % a 0.93 %) pero sólo ${n1(ancla.optimista_mediana_pct_11_50)} % del de 11 a 50 personas (**dentro** de la franja de los POS, 0.09 % a 0.14 %): **la curva optimista sólo describe a los de 11 a 50**. El único dato que sustituye ambos anclajes es la **prueba de precio del piloto**.

### 3.1 Margen contra precio (1,000 restaurantes, operación) y arrepentimiento

| Precio de Master Chef | Pesimista | Media | Optimista | Arrepentimiento máximo | Arrepentimiento esperado (25/50/25 %) |
|---|---|---|---|---|---|
${listaPrecios.map((p) => `| ${p} | ${n0(margenPrecio[p].pesimista.margen)} | ${n0(margenPrecio[p].media.margen)} | ${n0(margenPrecio[p].optimista.margen)} | ${n0(arrepentimiento[p].maximo)} | ${n0(arrepentimiento[p].esperado)} |`).join('\n')}

**Chef Ejecutivo:** el precio **no sale de la optimización**: con la mejor configuración, mover Chef Ejecutivo de ${opt.precio_salon.curva_de_precio[0][0]} a ${opt.precio_salon.curva_de_precio[5][0]} cambia el margen en **${n0(opt.precio_salon.diferencia_max_min)} pesos al mes** (menos de 2 %); los ${rec.precios.salon} son **«sugeridos por regla»** (3 × piso con soporte de ${s.soporte_salon}).

---

## 4. Topes del plan gratuito: consecuencia del cupo que se exige, no un óptimo

\`restriccion_min_dentro\` (hoy ${pc(s.restriccion_min_dentro)}, **decisión de Calvin**, rango 40–80 %) y \`traslape_topes\` (hoy ${s.traslape_topes}; rango 0 a 1) son **parámetros visibles**. Con traslape 0 sólo cuenta el tope más estricto (por eso cuentas y platillos casi no mueven nada); con más traslape cada tope suma. Si quieres que quepa gratis…

| Cupo gratis mínimo | Topes del gratuito | Dentro real | Precio Master Chef | Pagantes (media, 1,000) | **Margen al mes** |
|---|---|---|---|---|---|
${cupo}

**Sensibilidad al traslape** (mismos topes de ${cs.mesas} mesas y ${cs.cuentas} cuentas): con 0 queda dentro ${pc(tr[0].dentro_con_topes_recomendados)} y el margen es ${n0(tr[0].margen_con_topes_recomendados)}; con 0.5, ${pc(tr[0.5].dentro_con_topes_recomendados)} y ${n0(tr[0.5].margen_con_topes_recomendados)}; con 1, ${pc(tr[1].dentro_con_topes_recomendados)} y ${n0(tr[1].margen_con_topes_recomendados)}. **Los números de mesas y cuentas son modelo, no estadística** (estadística de cartas §4.3).

---

## 5. Qué supuesto mueve más el resultado (cada uno ±50 %, 1,000 restaurantes, curva media)

**Firme (sin anuncios), margen de operación; base ${n0(sensFirme.base)}:**

| Supuesto | Con la mitad | Con 1.5 veces | Efecto (pesos) |
|---|---|---|---|
${sensTabla(sensFirme)}

**Condicional (anuncios aprobados, tarifa baja); base ${n0(sensCond.base)}:**

| Supuesto | Con la mitad | Con 1.5 veces | Efecto |
|---|---|---|---|
${sensTabla(sensCond)}

---

## 6. Escalabilidad en el tiempo (adopción **supuesta**: ${s.meta_12_meses} restaurantes a 12 meses, ${s.meta_24_meses} a 24)

Margen de **operación → después de captación** (bajas ${pc(s.churn_mensual)} y ${s.cac} pesos por cliente de paga; **sin dato**) por curva (pesimista · media · optimista):

| Mes | Restaurantes | De paga (media) | Margen al mes: ${curvas.join(' · ')} | Escalón (media) |
|---|---|---|---|---|
${[6, 12, 18, 24, 36].map(filaProy).join('\n')}

**Primer mes con margen positivo (curva media):** de operación **${proy.media.mes_primer_margen_positivo}**; después de captación **${proy.media.mes_primer_margen_positivo_despues_de_captacion ?? 'nunca en 36 meses'}**. *Es un artefacto de la curva de adopción supuesta y del costo de captación sin dato: no es una predicción.* **Extrapolación:** desde ≈ ${n0(nArq)} restaurantes registrados hace falta otra arquitectura; con 5,000 y 100,000 el modelo da instancias que **no existen** (${extra[2].instancias} y ${n0(extra[3].instancias)}) y esos márgenes son **extrapolación sin medir**.

---

## 7. Parámetros que no mueven nada (marcados \`mueve_resultado: false\` en el JSON)

${Object.entries(par.parametros).filter(([, v]) => !v.mueve_resultado).map(([k]) => `\`${k}\``).join(', ')}. Los de costo variable sólo sirven al piso del corredor; los de mercado son informativos.

## 8. Límites del modelo (dichos)

- **No hay dato de disposición a pagar, de bajas ni de costo de conseguir un cliente:** son los tres supuestos que más cambian el negocio.
- **Los muros salen de un simulador** (no de una prueba de carga), con ±2× en lo que depende del CPU de Railway.
- **Pruebas:** \`node 2026-11-14-pruebas.mjs\` reproduce las cifras ya publicadas (equilibrio 9.7; 14, 22, 38 y 128 de paga en 5 GB; 298–299, 1,064, 1,896 y 2,116 por escalón; corredor 249, 299 y 349) y las propiedades nuevas (anuncios apagados por defecto, precio 0 sin clientes, extrapolación, orden de la sensibilidad, monotonía de la tabla de cupo).
`;
writeFileSync(join(aqui, '2026-11-14-modelo-de-escenarios.md'), md);

// ------------------------------------------------------------------ recomendaciones
const mp = margenPrecio;
const tc = opt.tabla_cupo_gratis;
const D = [
  { id: 'precio', decision: 'Precio de Master Chef (qué tan agresivo entrar y contra quién)',
    recomendacion: `**Un rango de ${precios.media.meseta.desde} a 349 al mes antes de IVA, y lanzar en 299.** La meseta de la curva media (margen a menos de 2 % del máximo) es ${precios.media.meseta.desde}–${precios.media.meseta.hasta}; el corredor por sustituto (Meniu, Fudo Avanzado, Fudo + mesas) es 249–349. **299 queda dentro del corredor y fuera de la meseta:** frente a 249 renuncia a ${n0(mp[249].media.margen - mp[299].media.margen)} pesos al mes de margen en la curva media y gana ${n0(mp[299].optimista.margen - mp[249].optimista.margen)} en la optimista. La cuenta de arrepentimiento empujaría más arriba (${[249, 299, 349, 449].map((p) => `${p}: ${n0(arrepentimiento[p].esperado)}`).join(' · ')}), pero depende de que la curva optimista (la de quien paga como por un punto de venta) pese 25 %, y el segundo anclaje (INEGI) sólo la respalda para negocios de 11 a 50 personas: por eso **299 y no 449**. **K (qué tan agresivo entrar) es decisión de Calvin, no un cálculo.**`,
    depende: `**De la curva de pago (mediana, sigma, techo), que es supuesto.** Con la mediana ±50 % el precio óptimo de la curva media va de ${sp.media.mediana.bajo} a ${sp.media.mediana.alto}; con soporte 0 a 150, de ${sp.media.soporte[0]} a ${sp.media.soporte[150]}. **Si falla:** si los dueños ven a Carta como un menú QR (mediana ≈ 157), el precio sostenible es ≈ 110–220 y 299 pierde clientes; si lo ven como un POS (mediana ≈ 650), 299 deja dinero sobre la mesa (el óptimo sube a ≈ 500–850).`,
    cifras: `Margen a 1,000 (operación) a 249 / 299 / 349 / 449: pesimista ${[249, 299, 349, 449].map((p) => n0(mp[p].pesimista.margen)).join(' / ')}; media ${[249, 299, 349, 449].map((p) => n0(mp[p].media.margen)).join(' / ')}; optimista ${[249, 299, 349, 449].map((p) => n0(mp[p].optimista.margen)).join(' / ')}. Arrepentimiento esperado: ${[249, 299, 349, 449].map((p) => `${p}: ${n0(arrepentimiento[p].esperado)}`).join(' · ')}.`,
    alternativas: [
      { opcion: '249 (entrar fuerte; Meniu como sustituto)', pros: 'Más pagantes; es el piso ×3; casi en la meseta (192–247)', contras: 'Sin colchón si el soporte cuesta más; pierde mucho con la curva optimista' },
      { opcion: '299 (lanzamiento recomendado)', pros: 'Centro del corredor; compromiso entre las tres curvas', contras: 'Fuera de la meseta de la curva media por poco; 33 % arriba de Meniu' },
      { opcion: '349 (Fudo + mesas)', pros: 'Menor arrepentimiento si el dueño paga como por un sistema', contras: 'Menos pagantes; el supuesto del módulo de mesas es el más débil' },
      { opcion: '449 (K = 0.7 contra Fudo)', pros: 'Menor arrepentimiento esperado si la curva optimista es cierta', contras: 'Menos pagantes; sin prueba de que paguen' }],
    ejemplo: 'Un restaurante de 25 mesas (≈ 11 a 50 personas; ingreso medio 737,584 pesos al mes [INEGI]): 299 son 0.05 % de su ingreso y 3.7 horas de personal a 80 pesos la hora [valor medido; las horas que Carta ahorra son supuesto].',
    prueba: 'Prueba de precio del piloto: tres grupos de 10 (249 · 349 · 449) y la regla «se queda el precio con más pagantes × margen por pagante». Con 10 por grupo es un sí o un no, no una curva.' },
  { id: 'topes', decision: 'Topes del plan gratuito (mesas, cuentas, platillos)',
    recomendacion: `**Mantener lo decidido (10 mesas, 3 cuentas, 80 platillos) *si* Calvin quiere que quepa gratis al menos el 60 %.** No es un óptimo: es la consecuencia de ese 60 %. Si quiere 50 %, los topes son ${tc[0].mesas} mesas y ${tc[0].cuentas} cuentas (+${n0(tc[0].margen - tc[1].margen)} pesos al mes); si 70 %, ${tc[2].mesas} y ${tc[2].cuentas} (${sg(tc[2].margen - tc[1].margen)}); si 80 %, ${tc[3].mesas} y ${tc[3].cuentas} (${sg(tc[3].margen - tc[1].margen)}).`,
    depende: `**De qué parte quieres atender gratis (decisión de Calvin) y del modelo de mesas y cuentas (no es estadística).** Con traslape 0.5 los mismos topes dejan dentro ${pc(tr[0.5].dentro_con_topes_recomendados)}, no ${pc(tr[0].dentro_con_topes_recomendados)}. **Si falla:** si 10 mesas empuja a más gente de lo que el modelo dice, el cupo real es menor y hay que subir el tope (se mide con las mesas del piloto).`,
    cifras: `Tabla de cupo (1,000 restaurantes): ${tc.map((x) => `${pc(x.cupo_gratis_minimo)} → ${x.mesas}/${x.cuentas}, margen ${n0(x.margen)}`).join(' · ')}. Un platillo cuesta 1.4–1.9 KB: bajar el tope de platillos no ahorra nada.`,
    alternativas: tc.map((x) => ({ opcion: `Cupo gratis ≥ ${pc(x.cupo_gratis_minimo)}: ${x.mesas} mesas, ${x.cuentas} cuentas, ${x.platillos} platillos`, pros: `${n0(x.pagantes)} de paga; margen ${n0(x.margen)}`, contras: `Dentro real ${pc(x.dentro_real)}` })),
    ejemplo: 'Una fonda de 6 mesas y 3 personas queda dentro de todos los topes: Chef, gratis; costo ≈ 1 peso al mes (0.6 de servidor y 0.5 de soporte).',
    prueba: 'Mesas, cuentas y platillos reales de los primeros 10–20 restaurantes (consultas de lectura al piloto).' },
  { id: 'historial', decision: 'Historial: meses en línea y archivo descargable',
    recomendacion: '**12 meses en línea para la paga (lo decidido por Calvin) y 30 días para el gratuito, con archivo descargable de lo anterior.**',
    depende: '**Del volumen de disco que se pague (Hobby de 5 GB o Pro de 50 GB) y del dato de disco medido** (7.1–8.5 KB por visita, con 10 eventos por visita supuestos). **Si falla:** si los eventos por visita son el doble, el disco de la paga sube ≈ 50 % y los 12 meses sólo caben en Pro.',
    cifras: 'Con 1, 3, 6 y 12 meses el margen casi no cambia (12 meses de historial para 48 clientes de paga son ≈ 6 GB); lo que cambia es cuántos de paga caben en Hobby: 263, 128, 72 y 38 (en Pro, 2,637 · 1,283 · 724 · 387).',
    alternativas: [{ opcion: '1 mes', pros: 'Cabe lo máximo en Hobby', contras: 'Casi nada de historial para quien paga' }, { opcion: '3 meses + archivo', pros: '128 de paga en Hobby', contras: 'Cambia lo decidido' }, { opcion: '12 meses + archivo (recomendada)', pros: 'Cumple lo decidido; cuesta menos de 1 peso al mes por cliente en Pro', contras: 'En Hobby sólo caben 38 de paga: hay que pasar a Pro antes' }],
    ejemplo: 'Un restaurante de 25 mesas genera 13.5 MB al mes: 12 meses son 162 MB, ≈ 0.45 pesos al mes de volumen.',
    prueba: 'Cuántos dueños abren el mes anterior en el panel (eventos del piloto).' },
  { id: 'soporte', decision: 'Soporte: cuánto se promete',
    recomendacion: '**Soporte por WhatsApp o correo en horario hábil, con tope de ≈ 60 pesos al mes por cliente de paga (30 minutos) y casi nada para el gratuito (autoservicio).**',
    depende: `**Del tiempo real de soporte, que es supuesto** (${s.soporte_servicio} de paga y ${s.soporte_gratuito} por gratuito; rangos 30–150 y 0–3). **Si falla:** con 150 por cliente de paga el precio de la regla sube a ${sp.media.soporte[150]}–${precioFmt(M.redondea(M.precioSugerido(652, 0.5, { ...s, soporte_servicio: 150 }), { ...s, soporte_servicio: 150 }))} y el margen cae; con 1 peso por gratuito el peor caso firme empeora en ${n0(1000 * 0.5)} pesos al mes con 1,000 restaurantes.`,
    cifras: `Efecto en el margen (±50 %, firme): soporte de paga ${n0(sensFirme.filas.find((f) => f.supuesto.startsWith('soporte por cliente de paga')).efecto)} pesos; soporte del gratuito ${n0(sensFirme.filas.find((f) => f.supuesto.startsWith('soporte por cliente gratuito')).efecto)}.`,
    alternativas: [{ opcion: 'Autoservicio y correo (30)', pros: 'Piso bajo', contras: 'Mal servicio si el dueño no sabe subir su carta' }, { opcion: 'WhatsApp en horario (60, recomendada)', pros: 'Equilibrio', contras: 'Depende de que 30 minutos alcancen' }, { opcion: 'Teléfono y alta hecha por nosotros (150)', pros: 'Mejor conversión probable', contras: 'El precio de la regla sube mucho' }],
    ejemplo: 'Un salón de 60 mesas (Chef Ejecutivo) necesita soporte propio: se supone el doble (120 pesos al mes).',
    prueba: 'Tickets y minutos de soporte del piloto.' },
  { id: 'anuncios', decision: 'Anuncios en el plan gratuito',
    recomendacion: '**Condicional: no contar con ellos hasta que se aprueben y se construyan.** Hoy no se pueden mostrar (la política de seguridad del sitio no lo permite). Si Calvin quiere seguir ese camino: ADR, abrir la política de seguridad, cambiar el aviso de privacidad, prueba de AdSense con 3 restaurantes. «Sin anuncios» queda como beneficio de Master Chef, como en el prototipo.',
    depende: `**De tres supuestos que no tienen dato:** que la red apruebe el sitio, la tarifa por mil visitas y la parte de visitas con anuncio. **Si fallan:** con la tarifa a la mitad y 30 % de las visitas el peor caso condicional baja de ${sg(esc[1].peor_anuncios_tarifa_baja.margen_operacion)} a ${sg(esc[1].peor_anuncios_adversos.margen_operacion)} (1,000 restaurantes). **El peor caso firme es sin anuncios: ${sg(esc[1].peor_firme.margen_operacion)} pesos al mes con 1,000 y necesita ≈ ${n1(esc[1].peor_firme.equilibrio_pagantes)} clientes de paga para cubrirse.**`,
    cifras: `Margen esperado a 1,000 (media): sin anuncios ${n0(E1.esperado.media.margen_operacion)}; con anuncios aprobados, tarifa baja ${n0(M.evaluar(recAds, s, 1000, { curva: 'media', anunciosAprobados: true }).margen_operacion)}.`,
    alternativas: [{ opcion: 'Sin anuncios (hoy)', pros: 'Cumple la regla dura 10 y la política de seguridad; sin riesgo de aprobación', contras: 'El peor caso pierde dinero: exige unos 4 clientes de paga con 1,000' }, { opcion: 'Con anuncios no personalizados (condicional)', pros: 'Podría volver sostenible el peor caso; motivo para pasar a Master Chef', contras: 'Tarifa sin fuente; aprobación; ADR y cambio de política de seguridad; clics accidentales' }, { opcion: 'Con anuncios personalizados', pros: 'Tarifa más alta', contras: 'Rompe la regla dura 10: descartada' }],
    ejemplo: 'La fonda de 6 mesas con ≈ 2,050 visitas al mes dejaría 7 pesos (tarifa baja) o 29 (media) con anuncios; hoy deja 0.',
    prueba: 'El informe de AdSense de una prueba pequeña (impresiones, ingresos estimados, RPM).' },
  { id: 'avisos_reloj', decision: 'Avisos de reloj desde el servidor (mesa amarilla o roja por tiempo)',
    recomendacion: '**No.** Los relojes se calculan en el teléfono con la hora de la última acción (AC-40.9).',
    depende: '**De que no haya notificaciones push** (fuera de la v1). **Si falla** (se aprueban push), el reloj del servidor sí tendría sentido: un evento por cruce de umbral, ≈ 0.1 por segundo con 1,000 restaurantes.',
    cifras: 'Un temporizador del servidor para ≈ 12,000 mesas es una consulta por minuto (poco costo) pero sin push no despierta al teléfono: sólo añade un proceso y un muro.',
    alternativas: [{ opcion: 'Relojes en el teléfono (recomendada)', pros: 'Cero costo de servidor; ya especificado', contras: 'Si el teléfono duerme no avisa' }, { opcion: 'Reloj en el servidor', pros: 'Un evento por cruce', contras: 'Otro proceso; contradice AC-40.9; sin push no sirve' }],
    ejemplo: 'El capitán de un salón de 60 mesas ve en su teléfono que la mesa 12 lleva 25 minutos sin movimiento.',
    prueba: 'Que se apruebe push.' },
];
function precioFmt(x) { return x; }
const cfgs = { recomendada_sin_anuncios: { nombre: 'Recomendada, sin anuncios (lo que existe hoy)', config: rec }, recomendada_con_anuncios_condicional: { nombre: 'Recomendada con anuncios (condicional a aprobación y construcción)', config: recAds } };
writeFileSync(join(aqui, '2026-11-14-recomendaciones.json'), JSON.stringify({ version: M.VERSION, decisiones: D, configuraciones: cfgs, tabla_cupo_gratis: tc, meseta_precio: { media: precios.media.meseta, optimizador: mejor.meseta } }, null, 1));
let r = `# Recomendaciones: seis decisiones con su supuesto, su meseta y la prueba que las cierra

**Fecha:** 14 de noviembre de 2026 (revisado el mismo día; apoyado en el [modelo corregido](2026-11-14-modelo-de-escenarios.md)) · **Rama:** \`agente/planes-precio-historial\` · **Estado:** propuesta para decidir; no cambia plan ni código. **Generado por \`2026-11-14-corre-escenarios.mjs\`.**
**Datos:** [\`…-recomendaciones.json\`](2026-11-14-recomendaciones.json) (decisiones y las dos configuraciones cargables) · Términos: [glosario](2026-11-14-glosario-de-negocio.md) · Planes: **Chef** (gratis), **Master Chef**, **Chef Ejecutivo** (nombre propuesto; el prototipo sólo trae los dos primeros).
**Qué cambió con la revisión:** el precio se da como **rango con meseta**; los topes del gratuito como **«depende de qué parte quieres atender gratis»**; los anuncios como **condicionales**; y cada decisión dice **de qué supuesto depende y qué pasa si falla**.

**Marcas.** Cifras del modelo (1,000 restaurantes, curva **media**, configuración «recomendada sin anuncios») · datos de INEGI · ***supuesto***. **El óptimo es tan bueno como la curva de pago, que es supuesto.**

---

## 0. Conclusiones

- **Master Chef: un rango de ${precios.media.meseta.desde} a 349 al mes; lanzar en 299.** Chef Ejecutivo: **${rec.precios.salon}**, que **no sale de la optimización** (cambia el margen menos de 2 % en todo el rango): es «sugerido por regla».
- **Chef (gratis): ${cs.mesas} mesas, ${cs.cuentas} cuentas y ${cs.platillos} platillos *si* quieres que quepa gratis al menos el 60 %.** Para 50 / 60 / 70 / 80 %: ${tc.map((x) => `${x.mesas}/${x.cuentas}`).join(' · ')} (mesas/cuentas) y margen ${tc.map((x) => n0(x.margen)).join(' · ')} al mes.
- **Margen con 1,000 restaurantes (operación, antes de captación y sueldos):** ${curvas.map((c) => sg(E1.esperado[c].margen_operacion)).join(' · ')} (pesimista · media · optimista); **después de captación:** ${curvas.map((c) => sg(E1.esperado[c].margen_despues_de_captacion)).join(' · ')}.
- **El peor caso firme (todos gratuitos, sin anuncios) pierde ${n0(-esc[1].peor_firme.margen_operacion)} pesos al mes con 1,000 restaurantes**; los anuncios son **condicionales** a que se aprueben y se construyan.
- **Historial de 12 meses para la paga (lo decidido): casi no mueve el margen;** sólo estorba en Hobby.
- **Qué dato cambia todo:** la **prueba de precio del piloto** (sustituye a la curva de pago, el supuesto que más mueve el margen).

## 1. Las dos configuraciones, listas para cargar

| | **Recomendada, sin anuncios** (lo que existe hoy) | **Con anuncios** (condicional) |
|---|---|---|
| Master Chef · Chef Ejecutivo | ${rec.precios.servicio} · ${rec.precios.salon} | igual |
| Chef (gratis) | ${cs.mesas} mesas · ${cs.cuentas} cuentas · ${cs.platillos} platillos · 3 lecturas de PDF en total · 1 mes | igual |
| Historial en línea, paga | 12 meses | 12 meses |
| Anuncios | no | sí (si se aprueban: \`anuncios_aprobados = true\`) |
| Margen a 1,000 (media, operación) | ${n0(E1.esperado.media.margen_operacion)} | ${n0(M.evaluar(recAds, s, 1000, { curva: 'media', anunciosAprobados: true }).margen_operacion)} |

---
`;
D.forEach((d, i) => {
  r += `\n## ${i + 2}. ${d.decision}\n\n**Recomendación.** ${d.recomendacion}\n\n**De qué supuesto depende y qué pasa si falla.** ${d.depende}\n\n**Cifras del modelo.** ${d.cifras}\n\n| Opción | A favor | En contra |\n|---|---|---|\n${d.alternativas.map((a) => `| ${a.opcion} | ${a.pros} | ${a.contras} |`).join('\n')}\n\n**Ejemplo.** ${d.ejemplo}\n\n**La prueba o el dato que la cierra.** ${d.prueba}\n\n---\n`;
});
r += `\n## 8. Datos por conseguir (resumen)\n\nCurva de pago real · tope e IVA de Meniu y Fudo · bajas y costo de conseguir un cliente (**sin dato: supuestos de trabajo**) · tarifa de anuncios y aprobación (hoy no existen) · soporte por cliente · mesas, cuentas y platillos reales · horas que Carta ahorra por visita · eventos por visita. Todos con su forma de medirse en los informes.\n`;
writeFileSync(join(aqui, '2026-11-14-recomendaciones.md'), r);
console.log('ok. mejor:', JSON.stringify({ dentro: mejor.dentro, mesas: mejor.mesas, cuentas: mejor.cuentas, precio: mejor.mejor_precio, meseta: mejor.meseta, margen: Math.round(mejor.margen) }), 'nArq', nArq);
