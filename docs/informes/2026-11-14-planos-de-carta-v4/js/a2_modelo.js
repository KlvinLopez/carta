/* ===== escenario global + motor: modelo de escenarios de la sesión de análisis (incrustado tal cual) ===== */
const SP = MOD.valores(PAR);
const SERVS = SP.escalones.filter(e => e.id !== "hobby_sondeo"); // los de «con eventos»: Hobby 2, Pro 2, Pro 4, Pro 8
const SUSTS = ["Meniu Business", "Fudo Avanzado", "Fudo Avanzado + módulo de mesas"];
const PLAN = {gratis: "Chef", paga: "Master Chef", ejec: "Chef Ejecutivo"}; // Chef y Master Chef son del prototipo; «Chef Ejecutivo» es nombre propuesto
const TCUPO = REC.tabla_cupo_gratis.filter(r => !r.sin_solucion);
const SUSTP = Object.fromEntries(SUSTS.map(k => [k, SP.sustitutos[k]]));
const CORTO_SUST = {"Meniu Business": "Meniu", "Fudo Avanzado": "Fudo Avanzado", "Fudo Avanzado + módulo de mesas": "Fudo con mesas"};

function desdeConfig(c, nombre = "Recomendado") {
  const cu = TCUPO.find(r => r.mesas === c.topes.gratuito.mesas && r.cuentas === c.topes.gratuito.cuentas);
  return {
    nombre, precioServicio: c.precios.servicio, precioSalon: c.precios.salon,
    topePlatillos: c.topes.gratuito.platillos, topeMesas: c.topes.gratuito.mesas, topeCuentas: c.topes.gratuito.cuentas, cupo: cu ? cu.cupo_gratis_minimo : 0.6,
    hist: c.topes.servicio.meses_en_linea, a30: true, a7: false, arch: c.disco.archivar,
    anunciosAprob: false, tarifa: c.anuncios.tarifa, curva: c.curva, cMed: null, cSig: null, cTec: null, ajustes: {},
    sustituto: "Fudo Avanzado", K: 0.5, soporte: SP.soporte_servicio, caso: "esperado", servidor: -1,
  };
}
const BASE = desdeConfig(MOD.configInicial()); // recomendada, SIN anuncios: lo que existe hoy
const PRESETS = {rec: {...BASE}, peor: {...BASE, nombre: "Peor caso", caso: "peor"}, mejor: {...BASE, nombre: "Mejor caso", caso: "mejor"}};
const LS = "carta-v5c-escenario";
let S = {...BASE};
let MIO = null; // «Mi escenario»: lo último que editó la persona
try { const g = JSON.parse(localStorage.getItem(LS) || "null"); if (g && g.S) { S = {...BASE, ...g.S}; MIO = g.MIO || null; } } catch (e) { /* sin almacenamiento: queda en memoria */ }
const oyentes = [];
function emitir() { try { localStorage.setItem(LS, JSON.stringify({S, MIO})); } catch (e) { /* ignorar */ } oyentes.forEach(f => f()); }
function cambiar(parche, manual = true) { S = {...S, ...parche}; if (manual) { S.nombre = "Mi escenario"; MIO = {...S}; } emitir(); }
function aplicar(clave) { S = clave === "mio" ? (MIO ? {...MIO} : {...S, nombre: "Mi escenario"}) : {...PRESETS[clave], ajustes: {}}; emitir(); }
function fijaCupo(c) { const r = TCUPO.find(x => x.cupo_gratis_minimo === c); if (r) cambiar({cupo: c, topeMesas: r.mesas, topeCuentas: r.cuentas, topePlatillos: r.platillos}); }

function config(s0) {
  const c = MOD.configInicial();
  c.precios = {servicio: s0.precioServicio, salon: s0.precioSalon};
  Object.assign(c.topes.gratuito, {platillos: s0.topePlatillos, mesas: s0.topeMesas, cuentas: s0.topeCuentas});
  c.topes.servicio.meses_en_linea = s0.hist; c.topes.salon.meses_en_linea = s0.hist;
  const ma = s0.a7 ? 0.23 : s0.a30 ? 1 : 13; // 13 meses: lo que dice hoy el plan de datos (03 §7)
  c.disco = {meses_analitica_en_linea: {gratuito: ma, servicio: ma, salon: ma}, archivar: s0.arch};
  c.anuncios = {activo: !!s0.anunciosAprob, tarifa: s0.tarifa};
  c.curva = s0.curva; c.competencia = {sustituto: s0.sustituto, k: s0.K};
  return c;
}
function sup(s0) {
  let s = {...SP, soporte_servicio: s0.soporte, anuncios_aprobados: !!s0.anunciosAprob && s0.caso !== "peor"};
  const cv = {...s.curvas_pago[s0.curva]};
  if (s0.cMed) cv.mediana = s0.cMed; if (s0.cSig) cv.sigma = s0.cSig; if (s0.cTec != null) cv.techo = s0.cTec;
  s.curvas_pago = {...s.curvas_pago, [s0.curva]: cv};
  for (const [nombre, f] of MOD.PARAMS_SENS) if (s0.ajustes && s0.ajustes[nombre]) s = f(s, s0.ajustes[nombre], s0.curva);
  if (s0.caso === "peor") s.curvas_pago = Object.fromEntries(Object.entries(s.curvas_pago).map(([k, v]) => [k, {...v, techo: 0}]));
  return s;
}
const opcS = s0 => (s0.caso === "mejor" ? {todosPagan: true} : s0.caso === "peor" ? {anuncios: {activo: false, tarifa: "baja"}, anunciosAprobados: false} : {curva: s0.curva});
const evalS = (s0, n = 1000) => MOD.evaluar(config(s0), sup(s0), n, opcS(s0));
function motor(s0) {
  const c = config(s0), s = sup(s0), ev = MOD.evaluar(c, s, 1000, opcS(s0));
  const cL = Math.max(ev.capacidad.carga_en_gratuitos_tipicos / 1000, 1e-9), dL = Math.max((ev.capacidad.disco_mb - SP.base_vacia_mb) / 1000, 1e-9);
  let idx = s0.servidor;
  if (idx < 0) { idx = SERVS.findIndex(x => x.id === ev.capacidad.escalon); if (idx < 0) idx = 0; }
  const es = SERVS[idx];
  const lim = [["procesador", es.cap_cpu / cL], ["disco", (es.volumen_gb * 1000 * (1 - SP.reserva_disco) - SP.base_vacia_mb) / dL], ["conexiones abiertas", SP.cap_conexiones / cL]].map(([a, v]) => [a, Math.floor(v)]);
  const [cuello, caben] = lim.reduce((a, b) => (b[1] < a[1] ? b : a));
  const f = ev.clientes.de_paga / 1000;
  const opt = MOD.precioOptimo(s0.curva, s);
  return {c, s, ev, idx, es, lim, caben, cuello, f, usd: es.tope_usd, rebasan: ev.rebasan_topes, anuncios: ev.anuncios_aprobados,
    conv: MOD.conversion(s0.curva, s0.precioServicio, s), sostiene: ev.gratuitos_que_sostiene_un_pagante, sePagaSolo: ev.se_paga_solo, sostieneSinAds: ev.gratuitos_que_sostiene_un_pagante_sin_anuncios,
    ingGrat: ev.por_cliente.ingreso_gratuito, ingPaga: ev.por_cliente.ingreso_servicio, margenServ: ev.por_cliente.margen_servicio,
    margenPct: ev.margen.porcentaje, margen: ev.margen_operacion, margenCapt: ev.margen_despues_de_captacion, margenNeto: ev.margen_neto,
    eq: ev.equilibrio_pagantes, meseta: opt.meseta, precioOpt: opt.precio, pisoS: MOD.piso(s, "servicio", s0.precioServicio), extrapola: !!ev.extrapolacion_sin_medir};
}
const emTxt = m => `${n(100 * m.rebasan, 1)} %`;
const dentroTxt = m => `${n(100 - 100 * m.rebasan, 1)} %`;
const nomServ = m => m.es.nombre.replace("Con eventos, ", "");
const NOMSERV = e => e.nombre.replace("Con eventos, ", "");
