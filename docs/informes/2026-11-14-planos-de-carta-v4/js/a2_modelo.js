/* ===== escenario global + motor basado en el modelo de la sesión de análisis (modelo-de-escenarios.mjs, incrustado tal cual) ===== */
const SP = MOD.valores(PAR);
const SERVS = SP.escalones.filter(e => e.id !== "hobby_sondeo"); // los de «con eventos»: Hobby 2, Pro 2, Pro 4, Pro 8
const SUSTS = ["Meniu Business", "Fudo Avanzado", "Fudo Avanzado + módulo de mesas"];
const NOMSERV = e => `${e.nombre.replace("Con eventos, ", "").replace("procesos", "procesos")}`;
const PLAN = {gratis: "Chef", paga: "Master Chef", ejec: "Chef Ejecutivo"}; // nombres del prototipo; el tercero es propuesta

function desdeConfig(c, nombre = "Recomendado") {
  return {
    nombre, precioServicio: c.precios.servicio, precioSalon: c.precios.salon,
    topePlatillos: c.topes.gratuito.platillos, topeMesas: c.topes.gratuito.mesas, topeCuentas: c.topes.gratuito.cuentas,
    hist: c.topes.servicio.meses_en_linea, a30: true, a7: false, arch: c.disco.archivar,
    ads: c.anuncios.activo, tarifa: c.anuncios.tarifa, curva: c.curva, sustituto: "Fudo Avanzado", K: 0.5, soporte: SP.soporte_servicio,
    caso: "esperado", servidor: -1,
  };
}
const BASE = desdeConfig(REC.configuraciones.lanzamiento.config);
const PRESETS = {rec: {...BASE}, peor: {...BASE, nombre: "Peor caso", caso: "peor"}, mejor: {...BASE, nombre: "Mejor caso", caso: "mejor"}};
const LS = "carta-v5b-escenario";
let S = {...BASE};
let MIO = null; // «Mi escenario»: lo último que editó la persona
try { const g = JSON.parse(localStorage.getItem(LS) || "null"); if (g && g.S) { S = {...BASE, ...g.S}; MIO = g.MIO || null; } } catch (e) { /* sin almacenamiento: queda en memoria */ }
const oyentes = [];
function emitir() { try { localStorage.setItem(LS, JSON.stringify({S, MIO})); } catch (e) { /* ignorar */ } oyentes.forEach(f => f()); }
function cambiar(parche, manual = true) { S = {...S, ...parche}; if (manual) { S.nombre = "Mi escenario"; MIO = {...S}; } emitir(); }
function aplicar(clave) { S = clave === "mio" ? (MIO ? {...MIO} : {...S, nombre: "Mi escenario"}) : {...PRESETS[clave]}; emitir(); }

function config(s0) {
  const c = MOD.configBase();
  c.precios = {servicio: s0.precioServicio, salon: s0.precioSalon};
  Object.assign(c.topes.gratuito, {platillos: s0.topePlatillos, mesas: s0.topeMesas, cuentas: s0.topeCuentas});
  c.topes.servicio.meses_en_linea = s0.hist; c.topes.salon.meses_en_linea = Math.min(s0.hist, 6);
  const ma = s0.a7 ? 0.23 : s0.a30 ? 1 : 13; // 13 meses: lo que dice hoy el plan de datos (03 §7)
  c.disco = {meses_analitica_en_linea: {gratuito: ma, servicio: ma, salon: ma}, archivar: s0.arch};
  c.anuncios = {activo: s0.caso === "peor" ? true : s0.ads, tarifa: s0.caso === "peor" ? "baja" : s0.tarifa};
  c.curva = s0.curva; c.competencia = {sustituto: s0.sustituto, k: s0.K};
  return c;
}
function sup(s0) {
  const s = {...SP, soporte_servicio: s0.soporte};
  if (s0.caso === "peor") s.curvas_pago = Object.fromEntries(Object.entries(s.curvas_pago).map(([k, v]) => [k, {...v, techo: 0}]));
  return s;
}
const opcS = s0 => (s0.caso === "mejor" ? {todosPagan: true} : {curva: s0.curva});
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
  const c2 = JSON.parse(JSON.stringify(c)); c2.anuncios = {activo: false, tarifa: "baja"}; // cuánto sostiene un cliente de paga sin contar anuncios
  const ev2 = MOD.evaluar(c2, s, 1000, opcS(s0)), sostieneSinAds = ev2.gratuitos_que_sostiene_un_pagante, eqSinAds = ev2.equilibrio_pagantes;
  return {c, s, ev, idx, es, lim, caben, cuello, f, usd: es.tope_usd, rebasan: ev.rebasan_topes,
    conv: MOD.conversion(s0.curva, s0.precioServicio, s), sostiene: ev.gratuitos_que_sostiene_un_pagante, sostieneSinAds, eqSinAds,
    ingGrat: ev.por_cliente.ingreso_gratuito, ingPaga: ev.por_cliente.ingreso_servicio, margenServ: ev.por_cliente.margen_servicio,
    margenPct: ev.margen.porcentaje, margen: ev.margen.pesos, eq: ev.equilibrio_pagantes, pisoS: MOD.piso(s, "servicio", s0.precioServicio)};
}
// pedido de la maestra: la sigla una vez; después, español llano
const emTxt = m => `${n(100 * m.rebasan, 1)} %`;
const dentroTxt = m => `${n(100 - 100 * m.rebasan, 1)} %`;
const SUSTP = Object.fromEntries(SUSTS.map(k => [k, SP.sustitutos[k]]));
const CORTO_SUST = {"Meniu Business": "Meniu", "Fudo Avanzado": "Fudo Avanzado", "Fudo Avanzado + módulo de mesas": "Fudo con mesas"};
