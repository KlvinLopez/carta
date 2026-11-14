/* ===== estado + motor: modelo de escenarios r3 de la sesión de análisis (incrustado tal cual) ===== */
const SP = MOD.valores(PAR);
const SERVS = SP.escalones.filter(e => e.id !== "hobby_sondeo"); // los de «con eventos»: Hobby 2, Pro 2, Pro 4, Pro 8
const SUSTS = ["Meniu Business", "Fudo Avanzado", "Fudo Avanzado + módulo de mesas"];
const PLAN = {gratis: "Chef", paga: "Master Chef", ejec: "Chef Ejecutivo"}; // Chef y Master Chef son del prototipo; «Chef Ejecutivo» es nombre propuesto
const SUSTP = Object.fromEntries(SUSTS.map(k => [k, SP.sustitutos[k]]));
const CORTO_SUST = {"Meniu Business": "Meniu", "Fudo Avanzado": "Fudo Avanzado", "Fudo Avanzado + módulo de mesas": "Fudo con mesas"};

function desdeConfig(c) {
  return {
    precioServicio: c.precios.servicio, precioSalon: c.precios.salon,
    topePlatillos: c.topes.gratuito.platillos, topeMesas: c.topes.gratuito.mesas, topeCuentas: c.topes.gratuito.cuentas,
    hist: c.topes.servicio.meses_en_linea, ma: c.disco.meses_analitica_en_linea.gratuito, arch: c.disco.archivar,
    curva: c.curva, cMed: null, cSig: null, cTec: null, sustituto: c.competencia.sustituto, K: c.competencia.k, soporte: SP.soporte_servicio, servidor: -1, mesAds: SP.mes_inicio_anuncios, bolsa: 1000,
  };
}
const BASE = desdeConfig(MOD.configInicial()); // la segmentación de Calvin: lo recomendado
const LS = "carta-v8-escenario";
let S = {...BASE};
try { const g = JSON.parse(localStorage.getItem(LS) || "null"); if (g && g.S) S = {...BASE, ...g.S}; } catch (e) { /* sin almacenamiento: queda en memoria */ }
const oyentes = [];
function emitir() { try { localStorage.setItem(LS, JSON.stringify({S})); } catch (e) { /* ignorar */ } oyentes.forEach(f => f()); }
function cambiar(parche) { S = {...S, ...parche}; emitir(); }

function config(s0) {
  const c = MOD.configInicial();
  c.precios = {servicio: s0.precioServicio, salon: s0.precioSalon};
  Object.assign(c.topes.gratuito, {platillos: s0.topePlatillos, mesas: s0.topeMesas, cuentas: s0.topeCuentas});
  c.topes.servicio.meses_en_linea = s0.hist; c.topes.salon.meses_en_linea = s0.hist;
  c.disco = {meses_analitica_en_linea: {gratuito: s0.ma, servicio: s0.ma, salon: s0.ma}, archivar: s0.arch};
  c.curva = s0.curva; c.competencia = {sustituto: s0.sustituto, k: s0.K};
  return c;
}
function sup(s0) {
  const s = {...SP, soporte_servicio: s0.soporte, mes_inicio_anuncios: s0.mesAds};
  const cv = {...s.curvas_pago[s0.curva]};
  if (s0.cMed) cv.mediana = s0.cMed; if (s0.cSig) cv.sigma = s0.cSig; if (s0.cTec != null) cv.techo = s0.cTec;
  s.curvas_pago = {...s.curvas_pago, [s0.curva]: cv};
  return s;
}
const evalS = (s0, n = 1000, opc = {}) => MOD.evaluar(config(s0), sup(s0), n, {curva: s0.curva, ...opc});
const resumenS = (s0, n = 1000) => MOD.resumen(config(s0), sup(s0), n);
function motor(s0) {
  const c = config(s0), s = sup(s0), ev = MOD.evaluar(c, s, 1000, {curva: s0.curva});
  const cL = Math.max(ev.capacidad.carga_en_gratuitos_tipicos / 1000, 1e-9), dL = Math.max((ev.capacidad.disco_mb - SP.base_vacia_mb) / 1000, 1e-9);
  let idx = s0.servidor;
  if (idx < 0) { idx = SERVS.findIndex(x => x.id === ev.capacidad.escalon); if (idx < 0) idx = 0; }
  const es = SERVS[idx];
  const lim = [["procesador", es.cap_cpu / cL], ["disco", (es.volumen_gb * 1000 * (1 - SP.reserva_disco) - SP.base_vacia_mb) / dL], ["conexiones abiertas", SP.cap_conexiones / cL]].map(([a, v]) => [a, Math.floor(v)]);
  const [cuello, caben] = lim.reduce((a, b) => (b[1] < a[1] ? b : a));
  const opt = MOD.precioOptimo(s0.curva, s, "servicio");
  return {c, s, ev, idx, es, lim, caben, cuello, f: ev.clientes.de_paga / 1000, usd: es.tope_usd, rebasan: ev.rebasan_topes,
    conv: MOD.conversion(s0.curva, s0.precioServicio, s, "servicio"), sostiene: ev.gratuitos_que_sostiene_un_pagante, sePagaSolo: ev.se_paga_solo, sostieneSinAds: ev.gratuitos_que_sostiene_un_pagante_sin_anuncios,
    ingGrat: ev.por_cliente.ingreso_gratuito, ingPaga: ev.por_cliente.ingreso_servicio, margenServ: ev.por_cliente.margen_servicio,
    margenPct: ev.margen.porcentaje, margen: ev.margen_operacion, margenCapt: ev.margen_despues_de_captacion, margenNeto: ev.margen_neto,
    eq: ev.equilibrio_pagantes, meseta: opt.meseta, precioOpt: opt.precio, extrapola: !!ev.extrapolacion_sin_medir};
}
const emTxt = m => `${n(100 * m.rebasan, 1)} %`;
const dentroTxt = m => `${n(100 - 100 * m.rebasan, 1)} %`;
const nomServ = m => m.es.nombre.replace("Con eventos, ", "");
const NOMSERV = e => e.nombre.replace("Con eventos, ", "");

/* los tres casos con nombre del modelo (los mismos de `resumen`) */
const CASO3 = {rec: {curva: "media"}, peor: {curva: "pesimista", sinAnuncios: true}, mejor: {curva: "optimista", anuncios: {activo: true, tarifa: "media"}}};
const ev3 = (s0, caso, k) => MOD.evaluar(config(s0), sup(s0), k, CASO3[caso]);
/* segmentación de Calvin: a qué plan cae cada tamaño con los topes del escenario */
const FCUENTA = SEG.parametros.f[1], MCUENTA = SEG.parametros.mesas_por_cuenta[1];
const mesasDe = e => e.media_supuesta * FCUENTA * MCUENTA, cuentasDe = e => e.media_supuesta * FCUENTA;
function planDe(e, c) { const me = mesasDe(e), cu = cuentasDe(e), g = c.topes.gratuito, t = c.topes.servicio; return me <= g.mesas && cu <= g.cuentas ? 0 : me <= t.mesas && cu <= t.cuentas ? 1 : 2; }
