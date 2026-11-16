// Corre el modelo de escenarios del análisis (tal cual) y deja en datos/modelo_v5.json lo que usa el PDF.
// Uso: node docs/informes/2026-11-14-planos-de-carta-v4/calcular_modelo.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const aqui = dirname(fileURLToPath(import.meta.url));
const inv = resolve(aqui, '../../research');
const M = await import(resolve(inv, '2026-11-14-modelo-de-escenarios.mjs'));
const par = JSON.parse(readFileSync(resolve(inv, '2026-11-14-parametros.json'), 'utf8'));
const rec = JSON.parse(readFileSync(resolve(inv, '2026-11-14-recomendaciones.json'), 'utf8'));
const s = M.valores(par);
const base = M.configInicial(); // Recomendado, SIN anuncios (lo que existe hoy)
const serv = s.escalones.filter((e) => e.id !== 'hobby_sondeo');
const cfg = (o = {}) => {
  const c = JSON.parse(JSON.stringify(base));
  const ma = o.a7 ? 0.23 : o.a30 === false ? 13 : 1;
  c.disco = { meses_analitica_en_linea: { gratuito: ma, servicio: ma, salon: ma }, archivar: true };
  c.topes.servicio.meses_en_linea = o.hist ?? 12;
  c.topes.salon.meses_en_linea = o.hist ?? 12;
  return c;
};
function limites(c, es) {
  const ev = M.evaluar(c, s, 1000, { curva: 'media' });
  const cL = ev.capacidad.carga_en_gratuitos_tipicos / 1000;
  const dL = (ev.capacidad.disco_mb - s.base_vacia_mb) / 1000;
  const lim = [['procesador', es.cap_cpu / cL], ['disco', (es.volumen_gb * 1000 * (1 - s.reserva_disco) - s.base_vacia_mb) / dL], ['conexiones abiertas', s.cap_conexiones / cL]].map(([a, v]) => [a, Math.floor(v)]);
  const [cuello, caben] = lim.reduce((a, b) => (b[1] < a[1] ? b : a));
  return { lim, cuello, caben };
}
const out = { fuente: 'docs/research/2026-11-14-modelo-de-escenarios.mjs, configuración de lanzamiento, curva media, 1,000 restaurantes' };
out.capacidad = serv.map((es) => ({ id: es.id, nombre: es.nombre.replace('Con eventos, ', ''), usd: es.tope_usd, ...limites(cfg(), es) }));
const hobby = serv[0];
out.disco = [
  ['Plan de datos de hoy', { a30: false, hist: 12 }],
  ['Analítica sólo 30 días', { hist: 12 }],
  ['Historial de paga 3 meses', { hist: 3 }],
  ['Analítica sólo 7 días', { hist: 3, a7: true }],
  ['Historial de paga 1 mes', { hist: 1, a7: true }],
].map(([nombre, o]) => ({ nombre, caben: limites(cfg(o), hobby).lim[1][1] }));
const ev = M.evaluar(cfg(), s, 1000, { curva: 'media' });
const ev2 = ev;
out.kpis = { rebasan: ev.rebasan_topes, de_paga_por_1000: ev.clientes.de_paga, margen_pesos: ev.margen.pesos, margen_pct: ev.margen.porcentaje, ingreso_gratuito: ev.por_cliente.ingreso_gratuito, margen_servicio: ev.por_cliente.margen_servicio, sostiene_sin_anuncios: ev.gratuitos_que_sostiene_un_pagante_sin_anuncios, equilibrio_sin_anuncios: ev.equilibrio_pagantes, margen_captacion: ev.margen_despues_de_captacion, precio_servicio: base.precios.servicio, precio_salon: base.precios.salon };
const s0 = { ...s, curvas_pago: Object.fromEntries(Object.entries(s.curvas_pago).map(([k, v]) => [k, { ...v, techo: 0 }])) };
const Ns = [1, 20, 40, 60, 80, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
out.sostiene = {
  N: Ns,
  peor: Ns.map((N) => M.evaluar(cfg(), s0, N, { anuncios: { activo: false, tarifa: 'baja' }, anunciosAprobados: false }).margen.pesos),
  esperado: Ns.map((N) => M.evaluar(cfg(), s, N, { curva: 'media' }).margen.pesos),
  pesimista: Ns.map((N) => M.evaluar(cfg(), s, N, { curva: 'pesimista' }).margen.pesos),
  optimista: Ns.map((N) => M.evaluar(cfg(), s, N, { curva: 'optimista' }).margen.pesos),
  mejor: Ns.map((N) => M.evaluar(cfg(), s, N, { todosPagan: true }).margen.pesos),
};

// ---- modelo r4: segmentación, matriz 3 × 3, todos gratuitos, bolsa y precio por mediana
const seg = JSON.parse(readFileSync(resolve(inv, '2026-11-14-segmentacion-datos.json'), 'utf8'));
const cob = (mesas) => { const cc = JSON.parse(JSON.stringify(base)); cc.topes.gratuito.mesas = mesas; return { c: ['minimo', 'centro', 'maximo'].map((k) => 100 * M.seguridadChico(cc, s, k)), m: M.evaluar(cc, s, 1000, { curva: 'media' }).margen_operacion }; };
const c25 = cob(25), c15 = cob(15);
out.seg = { estratos: seg.estratos, topes: { mesas: base.topes.gratuito.mesas, cuentas: base.topes.gratuito.cuentas, platillos: base.topes.gratuito.platillos }, c25: c25.c, m25: c25.m, c15: c15.c, m15: c15.m };
out.resumen = M.resumen(base, s, 1000);
out.matriz = M.matrizEscenarios(base, s, 1000);
out.tg = M.todosGratuitos(base, s, 1000);
out.rango = { baja: M.rangoSePagaSolo(base, s, 'baja'), medio: M.rangoSePagaSolo(base, s, 'medio'), adverso: M.rangoSePagaSolo(base, s, 'adverso') };
out.bolsa = M.rangoBolsa(base, s, 1000);
const b225 = JSON.parse(JSON.stringify(base)); b225.precios.servicio = 225;
out.precio = M.sensibilidadPrecio(b225, s, 1000);
writeFileSync(resolve(aqui, 'datos', 'modelo_v5.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ capacidad: out.capacidad.map((c) => [c.nombre, c.caben, c.cuello]), disco: out.disco, kpis: out.kpis }, null, 0));
