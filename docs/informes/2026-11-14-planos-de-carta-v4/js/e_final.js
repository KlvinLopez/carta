/* ===== detalle: ¿Cómo se sostiene? (cuatro vistas, cada una con su gráfica) ===== */
const fmP = x => (x < 0 ? "−" : "") + "$" + n(Math.abs(Math.round(x)));
const NS_TG = [10, 25, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000];
const memo = {};
const conCache = (k, f) => { const key = k + JSON.stringify(S); if (!(key in memo)) { memo[key] = f(); const ks = Object.keys(memo); if (ks.length > 60) delete memo[ks[0]]; } return memo[key]; };
function proyecta(nivel, s0) {
  const [a, b] = M.metas[nivel], s = {...sup(s0), meta_12_meses: a, meta_24_meses: b};
  return MOD.proyectar(config(s0), s, 24, {curva: s0.curva});
}
const VISTAS = ["¿Hasta dónde aguanto con todos gratuitos?", "Crecimiento mes a mes", "A dónde se va cada 100 pesos", "¿Qué hay que medir primero?", "Qué tanto pagan × anuncios"];
DET.sostiene = {
  titulo: "¿Se sostiene? Cuántos gratuitos aguanto, cómo crece mes a mes y a dónde se va cada 100 pesos.",
  fu: ["carta_tres_planes", "carta_planes", "carta_anuncios", "carta_mercado"],
  nota: "Modelo de escenarios r3 (docs/research/2026-11-14-modelo-de-escenarios.mjs), aún sin revisión independiente. Los comensales por restaurante son simulados, no medidos. La tarifa de anuncios en México no está publicada y AdSense podría no aprobar el sitio: es supuesto. La curva de pago la sustituye la prueba del piloto.",
  montar(host) {
    this.v = 0; this.N = 300; this.nivel = "medio"; this.mes = 12;
    host.innerHTML = `<div class="seg" id="tabsK" style="margin-bottom:8px">${VISTAS.map((t, i) => `<button class="btn" data-vista="${i}">${t}</button>`).join("")}</div><div class="viz"><svg id="svK" viewBox="0 0 960 520" role="img" font-family="DM Sans, sans-serif"></svg></div><div class="seg" id="banK" style="margin-top:8px" hidden></div><div class="seg" id="bolsaK" style="margin-top:8px">${[500, 1000, 2000, 5000].map(b => `<button class="btn" data-bolsa="${b}">Mi bolsa: ${mxn(b)} al mes</button>`).join("")}</div>`;
    const sv = $("#svK", host); this.sv = sv;
    host.addEventListener("click", ev => {
      const t = ev.target.closest("[data-vista]"); if (t) { this.v = +t.dataset.vista; refrescar(); return; }
      const b = ev.target.closest("[data-bolsa]"); if (b) { cambiar({bolsa: +b.dataset.bolsa}); return; }
      const q = ev.target.closest("[data-nivel]"); if (q) { this.nivel = q.dataset.nivel; refrescar(); }
    });
    sv.addEventListener("pointermove", ev => { if (this.v !== 1 || ev.target.closest("[data-drag]")) return; const p = sv.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(sv.getScreenCTM().inverse()); const t = clamp(Math.round((q.x - 70) / 840 * 23) + 1, 1, 24); if (t !== this.mes) { this.mes = t; this.pinta(); } });
  },
  actualizar() {
    $$("#tabsK [data-vista]").forEach(b => b.setAttribute("aria-pressed", +b.dataset.vista === this.v));
    $("#bolsaK").hidden = this.v !== 0;
    const bk = $("#banK"); bk.hidden = this.v !== 1; bk.innerHTML = BAND.banderas.map(b => `<span class="chip" data-tip="${esc2(b.que_hacer + ". " + b.estado_de_la_medicion + ". Proyección: no medido en Railway.")}" tabindex="0">${esc(b.nombre.replace(/ \(.*\)/, ""))} <b>${b.umbral_aviso}/${b.umbral_accion}</b></span>`).join("");
    $$("#bolsaK [data-bolsa]").forEach(b => b.setAttribute("aria-pressed", +b.dataset.bolsa === S.bolsa));
    return this.pinta();
  },
  pinta() { const o = [this.v0, this.v1, this.v2, this.v3, this.v4][this.v].call(this); return o; },
  v0() { // ¿hasta dónde aguanto con todos gratuitos?
    const sv = this.sv, c = config(S), s = sup(S), N = this.N, g = MOD.todosGratuitos(c, s, N);
    const tabla = conCache("tg", () => MOD.tablaTodosGratuitos(c, s).medida);
    const rs = conCache("rs", () => ({baja: MOD.rangoSePagaSolo(c, s, "baja"), medio: MOD.rangoSePagaSolo(c, s, "medio"), adverso: MOD.rangoSePagaSolo(c, s, "adverso")})), rg = r => `${n(r.minimo)}–${r.maximo == null ? "nunca" : n(r.maximo)}`;
    const desde = {baja: rs.baja.centro, medio: rs.medio.centro, adverso: rs.adverso.centro};
    const bol = conCache("bolsa" + S.bolsa, () => MOD.rangoBolsa(c, s, S.bolsa));
    const X0 = 60, W = 540, Y0 = 70, H = 300, lo = lg(10), hi = lg(2000), sl = v => Math.asinh(v / 600), vmin = -3000, vmax = 60000;
    const X = k => X0 + W * (lg(k) - lo) / (hi - lo), Y = v => Y0 + H * (sl(vmax) - sl(clamp(v, vmin, vmax))) / (sl(vmax) - sl(vmin));
    let b = T(30, 28, "Resultado al mes (pesos) según cuántos restaurantes gratuitos hay", 14.5, C.vino, "start", 700);
    [-3000, 0, 1000, 5000, 20000, 60000].forEach(v => { b += `<line x1="${X0}" x2="${X0 + W}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v === 0 ? C.t2 : C.arena}"/>` + T(X0 - 8, Y(v) + 4, (v < 0 ? "−" : "") + n(Math.abs(v)), 11, C.t2, "end"); });
    [10, 50, 100, 300, 1000, 2000].forEach(k => { b += T(X(k), Y0 + H + 22, n(k), 11.5, C.t2, "middle"); });
    b += T(X0 + W / 2, Y0 + H + 44, "restaurantes gratuitos (escala logarítmica)", 12, C.t2, "middle");
    const linea = (f, col, w, dash = "") => `<polyline points="${tabla.map(r => `${X(r.n).toFixed(1)},${Y(f(r)).toFixed(1)}`).join(" ")}" fill="none" stroke="${col}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
    b += linea(r => r.resultado_sin_anuncios, C.rojo, 3.5) + linea(r => r.con_anuncios.adverso.margen, C.dorado, 2.5, "6 4") + linea(r => r.con_anuncios.baja.margen, C.vino, 3) + linea(r => r.con_anuncios.medio.margen, C.verde, 3);
    b += `<line x1="${X(N)}" x2="${X(N)}" y1="${Y0}" y2="${Y0 + H}" stroke="${C.tinta}" stroke-width="1.5" stroke-dasharray="4 3"/><g data-drag="1" id="hN"><circle cx="${X(N)}" cy="${Y0 + H}" r="13" fill="${C.tinta}" stroke="#fff" stroke-width="3"/></g>`;
    // lo que pasa con N restaurantes gratuitos
    const px = 650;
    b += T(px, 76, `${n(N)} restaurantes gratuitos`, 22, C.vino, "start", 400, true);
    b += T(px, 118, `${n(g.comensales_mes / 1e6, 2)} M`, 34, C.tinta, "start", 400, true) + T(px, 138, "comensales al mes (simulados)", 12.5, C.t2);
    b += T(px, 178, fmP(g.costo_sin_anuncios), 30, C.rojo, "start", 400, true) + T(px, 198, "al mes que pones tú mientras no hay anuncios", 12.5, C.t2);
    b += T(px, 232, "Cuando ya hay anuncios, al mes:", 13, C.t2, "start", 700);
    [["baja", "tarifa baja", C.vino], ["medio", "tarifa media", C.verde], ["adverso", "adverso (la mitad)", C.dorado]].forEach(([k, nm, col], i) => { const r = g.con_anuncios[k]; b += `<circle cx="${px + 6}" cy="${256 + i * 30}" r="6" fill="${col}"/>` + T(px + 20, 261 + i * 30, `${nm}: ${fmP(r.margen)}`, 14, C.tinta, "start", 700) + T(px + 270, 261 + i * 30, r.se_paga_solo ? "se paga solo" : "no alcanza", 12, r.se_paga_solo ? C.verde : C.rojo, "end", 700); });
    b += `<g transform="translate(${px},352)">${Rc(0, 0, 280, 22, C.a2, 11)}</g>` + T(px, 394, "Se paga solo con anuncios desde:", 13, C.t2, "start", 700);
    [["baja", "baja", C.vino], ["medio", "media", C.verde], ["adverso", "adversa", C.dorado]].forEach(([k, nm, col], i) => { b += T(px + i * 96, 422, desde[k] == null ? "—" : n(desde[k]), 22, col, "start", 400, true) + T(px + i * 96, 440, `tarifa ${nm}`, 11.5, C.t2) + T(px + i * 96, 456, `rango ${rg(rs[k])}`, 11, C.t2); });
    b += T(30, 500, "Vale cuando la Fase 3 (canal de eventos) esté construida; hoy, con sondeo, caben 148. Los umbrales son rangos, no puntos.", 12.5, C.t2);
    b += `<rect x="30" y="462" width="600" height="26" rx="8" fill="rgba(0,0,0,0)" data-tip="${esc2("Lo que este cálculo no incluye: " + bol.no_modelado.join("; "))}" tabindex="0"/>` + T(30, 480, `Con ${mxn(S.bolsa)} al mes de tu bolsa caben ${n(bol.centro.restaurantes)} restaurantes gratuitos (de ${n(bol.minimo)} a ${n(bol.maximo)} según el soporte) y ${n(bol.centro.comensales_mes / 1e6, 2)} M de comensales al mes.`, 14.5, C.osc, "start", 700);
    sv.innerHTML = b;
    const hd = $("#hN", sv), inv = x => clamp(Math.round(Math.pow(10, lo + (x - X0) / W * (hi - lo)) / 5) * 5, 10, 2000);
    arrastrable(hd, sv, pt => { this.N = inv(pt.x); this.pinta(); }, (d, mult) => { this.N = clamp(this.N + d * mult * 10, 10, 2000); this.pinta(); });
    hd.setAttribute("aria-label", "Restaurantes gratuitos"); hd.setAttribute("aria-valuenow", N);
    return {
      leyenda: `<span><i style="background:${C.rojo}"></i>sin anuncios: lo pones tú</span><span><i style="background:${C.vino}"></i>anuncios, tarifa baja</span><span><i style="background:${C.verde}"></i>tarifa media</span><span><i style="background:${C.dorado}"></i>adverso</span>`,
      cifras: [[n(g.comensales_mes / 1e6, 2) + " M", `comensales al mes con ${n(N)} restaurantes gratuitos`, "simulado"], [fmP(g.costo_sin_anuncios), "al mes que pones tú mientras no hay anuncios"], [desde.baja == null ? "—" : n(desde.baja), `restaurantes gratuitos desde los que se paga solo (tarifa baja; rango ${rg(rs.baja)})`, "supuesto"], [desde.adverso == null ? "—" : n(desde.adverso), `lo mismo, en el caso adverso (rango ${rg(rs.adverso)})`, "supuesto"]],
      insight: `Con ${n(N)} restaurantes gratuitos y sin anuncios pones ${fmP(g.costo_sin_anuncios)} al mes; con anuncios se paga solo desde ${desde.baja == null ? "—" : n(desde.baja)} (tarifa baja) o ${desde.adverso == null ? "—" : n(desde.adverso)} (caso adverso).`,
    };
  },
  v1() { // crecimiento mes a mes, con los saltos de escalón como banderas
    const sv = this.sv, pz = proyecta(this.nivel, S), filas = pz.filas, X0 = 70, W = 840, X = t => X0 + W * (t - 1) / 23;
    const maxR = Math.max(...filas.map(r => r.restaurantes), 1), Ya = r => 150 + 110 * (1 - r / maxR);
    let b = T(30, 24, "Crecimiento mes a mes (meta del estudio de mercado) · recomendado", 14.5, C.vino, "start", 700);
    [["bajo", "Bajo"], ["medio", "Medio"], ["alto", "Alto"]].forEach(([k, nm], i) => { b += `<g data-nivel="${k}" style="cursor:pointer" tabindex="0" role="button" aria-pressed="${this.nivel === k}"><rect x="${640 + i * 100}" y="8" width="92" height="24" rx="12" fill="${this.nivel === k ? C.vino : C.arena}"/>${T(686 + i * 100, 25, nm, 12.5, this.nivel === k ? "#fff" : C.t2, "middle", 700)}</g>`; });
    [0, maxR / 2, maxR].forEach(v => { b += `<line x1="${X0}" x2="${X0 + W}" y1="${Ya(v)}" y2="${Ya(v)}" stroke="${C.arena}"/>` + T(X0 - 8, Ya(v) + 4, n(v), 11, C.t2, "end"); });
    b += `<polygon points="${X(1)},${Ya(0)} ${filas.map(r => `${X(r.mes)},${Ya(r.restaurantes)}`).join(" ")} ${X(24)},${Ya(0)}" fill="${C.vino}" opacity=".12"/><polyline points="${filas.map(r => `${X(r.mes)},${Ya(r.restaurantes)}`).join(" ")}" fill="none" stroke="${C.vino}" stroke-width="4"/>` + T(X0 + W, 280, "restaurantes registrados", 11.5, C.t2, "end");
    [1, 6, 12, 18, 24].forEach(t => { b += T(X(t), 296, "mes " + t, 11.5, C.t2, "middle"); });
    // banderas: cada salto de escalón, el inicio de los anuncios y el primer margen positivo
    const ban = [];
    filas.forEach((r, i) => { const p = filas[i - 1]; if (p && r.escalon !== p.escalon) ban.push([r.mes, (r.escalon === "pro_2" ? "aquí pasa a Pro" : "aquí toca otro procesador") + ((BAND.escalones.find(q => q.id === r.escalon) || {}).sube_costo_usd_vs_anterior ? ` (+${BAND.escalones.find(q => q.id === r.escalon).sube_costo_usd_vs_anterior} USD)` : ""), C.rojo]); if (r.requiere_arquitectura && !(p && p.requiere_arquitectura)) ban.push([r.mes, "aquí hace falta otra nube", C.osc]); });
    ban.push([pz.mes_inicio_anuncios, "aquí empiezan los anuncios", C.verde]);
    if (pz.mes_primer_margen_positivo) ban.push([pz.mes_primer_margen_positivo, "primer margen positivo", C.dorado]);
    ban.sort((a, z) => a[0] - z[0]).forEach(([t, tx, col], i) => { const y = 44 + (i % 3) * 22, x = X(t), lb = `⚑ ${tx} · mes ${t}`, w = lb.length * 6.7 + 18, rx = x + w > X0 + W + 40 ? x - w + 4 : x - 4; b += `<line x1="${x}" x2="${x}" y1="${y + 8}" y2="${Ya(filas[t - 1].restaurantes)}" stroke="${col}" stroke-width="1.8" stroke-dasharray="3 3"/><g><rect x="${rx}" y="${y - 10}" width="${w}" height="20" rx="10" fill="${col}"/>${T(rx + 10, y + 4, lb, 11, "#fff", "start", 700)}</g>`; });
    const yb0 = 420, hb = 70, top = Math.max(...filas.map(q => Math.max(q.ingresos, q.costos, q.margen)), 1), bot = Math.min(0, ...filas.map(q => q.margen)), Yb = v => yb0 + hb * (top - v) / (top - bot), Z = Yb(0);
    b += T(30, 322, "Ingresos, costos y margen al mes (pesos), en una sola escala", 13.5, C.vino, "start", 700);
    filas.forEach(q => { const x = X(q.mes) - 11; b += Rc(x, Yb(q.ingresos), 10, Z - Yb(q.ingresos), C.vino, 2) + Rc(x + 11, Yb(q.costos), 10, Z - Yb(q.costos), C.gris, 2); });
    b += `<line x1="${X0}" x2="${X0 + W}" y1="${Z}" y2="${Z}" stroke="${C.t2}" stroke-width="1.5"/>` + T(X0 - 8, Z + 4, "0", 11, C.t2, "end") + T(X0 - 8, Yb(top) + 8, "$" + n(top), 11, C.t2, "end");
    b += `<polyline points="${filas.map(q => `${X(q.mes)},${Yb(q.margen)}`).join(" ")}" fill="none" stroke="${C.verde}" stroke-width="3"/>`;
    const r = filas[this.mes - 1];
    b += `<line x1="${X(this.mes)}" x2="${X(this.mes)}" y1="130" y2="284" stroke="${C.tinta}" stroke-width="1.2" stroke-dasharray="3 3"/><line x1="${X(this.mes)}" x2="${X(this.mes)}" y1="332" y2="${yb0 + hb}" stroke="${C.tinta}" stroke-width="1.2" stroke-dasharray="3 3"/>`;
    b += T(X0 + W, 316, `Mes ${r.mes}: ${n(r.restaurantes)} restaurantes (${n(r.pagantes, 1)} de paga) · ${n(r.comensales_mes / 1000)} mil comensales al mes`, 12.5, C.tinta, "end", 700);
    b += T(X0 + W, yb0 + hb + 26, `Mes ${r.mes}: ingreso ${fmP(r.ingresos)} · costo ${fmP(r.costos)} · margen ${fmP(r.margen)}`, 12.5, C.tinta, "end", 700);
    b += `<rect x="${X0}" y="${yb0 + hb + 16}" width="12" height="12" rx="3" fill="${C.vino}"/>${T(X0 + 18, yb0 + hb + 27, "ingresos", 11.5, C.t2)}<rect x="${X0 + 90}" y="${yb0 + hb + 16}" width="12" height="12" rx="3" fill="${C.gris}"/>${T(X0 + 108, yb0 + hb + 27, "costos", 11.5, C.t2)}<rect x="${X0 + 170}" y="${yb0 + hb + 16}" width="12" height="12" rx="3" fill="${C.verde}"/>${T(X0 + 188, yb0 + hb + 27, "margen", 11.5, C.t2)}`;
    sv.innerHTML = b;
    return {
      leyenda: `<span><i style="background:${C.vino}"></i>restaurantes registrados</span><span>Las banderas marcan cuándo cambia la infraestructura</span>`,
      cifras: [[pz.mes_primer_margen_positivo ? "mes " + pz.mes_primer_margen_positivo : "—", "primer mes con margen positivo", "supuesto"], [pz.mes_primer_margen_positivo_despues_de_captacion ? "mes " + pz.mes_primer_margen_positivo_despues_de_captacion : "—", "primer mes con margen positivo después de captación", "supuesto"], [fmP(pz.financiamiento_maximo), "lo más que tienes que poner acumulado", "supuesto"]],
      insight: `Con la meta ${this.nivel}, el primer margen positivo llega en el mes ${pz.mes_primer_margen_positivo || "—"}; lo más que pones de tu bolsa, acumulado, es ${fmP(pz.financiamiento_maximo)}.`,
    };
  },
  v2() { // a dónde se va cada 100 pesos
    const sv = this.sv, X0 = 150, W = 640, esc = 100;
    const casos = [["peor", "Peor", C.rojo], ["rec", "Recomendado", C.vino], ["mejor", "Mejor", C.verde]];
    let b = T(30, 28, "De cada 100 pesos que entran, a dónde se van (1,000 restaurantes)", 14.5, C.vino, "start", 700);
    const filas = casos.map(([k, nm, col]) => { const e = ev3(S, k, 1000), t = e.ingresos.total || 1, p = v => 100 * v / t; return {k, nm, col, e, t, partes: [["Servidor", p(e.costos.servidor + e.costos.almacenamiento + e.costos.objetos), "#b9afa3"], ["Soporte", p(e.costos.soporte), "#d9cfc2"], ["Comisión", p(e.costos.comision), "#c9a9a6"], ["Reponer bajas", p(e.captacion.reposicion_de_bajas), C.arena]], mo: p(e.margen_operacion), mc: p(e.margen_despues_de_captacion), mn: p(e.margen_neto)}; });
    const mx = Math.max(100, ...filas.map(f => f.partes.reduce((a, q) => a + q[1], 0))), K = W / mx;
    b += `<rect x="${X0 + esc * K - 1}" y="52" width="2.4" height="${60 + filas.length * 118}" fill="${C.tinta}" opacity=".5"/>` + T(X0 + esc * K, 46, "$100", 12, C.tinta, "middle", 700);
    filas.forEach((f, i) => {
      const y = 70 + i * 118; let x = X0;
      b += T(X0 - 14, y + 30, f.nm, 15, f.col, "end", 700);
      f.partes.forEach(([nm, v, col], j) => { const w = Math.max(0, v) * K; b += `<g class="gh" style="animation-delay:${j * 90}ms" data-tip="${esc2(nm)}: ${n(v, 1)} de cada 100">${Rc(x, y, w, 44, col, 6)}</g>`; if (w > 54) b += T(x + w / 2, y + 27, `${n(v, 0)}`, 13, C.tinta, "middle", 700); x += w; });
      const mw = Math.max(0, 100 * K - (x - X0));
      if (f.mo >= 0) { b += `<g class="gh" style="animation-delay:360ms">${Rc(x, y, mw, 44, C.verde, 6)}</g>` + T(x + mw / 2, y + 27, `margen ${n(f.mo, 0)}`, 13, "#fff", "middle", 700); }
      else b += T(x + 12, y + 27, `faltan ${n(-f.mo, 0)}`, 13, C.rojo, "start", 700);
      b += T(X0, y + 66, `Margen de operación ${n(f.mo, 1)} · después de captación ${n(f.mc, 1)} · neto ${n(f.mn, 1)}`, 12.5, C.t2) + T(X0, y + 84, `${fmP(f.e.margen_operacion)} al mes de margen de operación`, 12.5, C.tinta, "start", 700);
    });
    sv.innerHTML = b;
    const r = filas[1];
    return {
      leyenda: [["Servidor", "#b9afa3"], ["Soporte", "#d9cfc2"], ["Comisión de tarjeta", "#c9a9a6"], ["Reponer bajas", C.arena], ["Margen", C.verde]].map(([t, c]) => `<span><i style="background:${c}"></i>${t}</span>`).join(""),
      cifras: [[n(r.mo, 1), "pesos de cada 100 son margen de operación (recomendado)", "supuesto"], [n(r.mc, 1), "pesos de cada 100 después de captación", "supuesto"], [n(r.mn, 1), "pesos de cada 100 de margen neto (sueldos e impuestos valen cero: sin dato)", "supuesto"]],
      insight: `En el caso recomendado, de cada 100 pesos que entran quedan ${n(r.mo, 0)} de margen de operación, ${n(r.mc, 0)} después de captación y ${n(r.mn, 0)} netos; en el peor caso el margen es ${n(filas[0].mo, 0)}.`,
    };
  },
  v4() { // matriz 3 × 3: qué tanto pagan × cuánto dejan los anuncios (margen de operación con 1,000 restaurantes)
    const sv = this.sv, c = config(S), s = sup(S), X0 = 250, CW = 210, CH = 96, Y0 = 110;
    const curvas = [["pesimista", "Pagan poco"], ["media", "Pagan lo esperado"], ["optimista", "Pagan más"]];
    const ads = [["Sin anuncios", {sinAnuncios: true}], ["Tarifa baja", {anuncios: {activo: true, tarifa: "baja"}}], ["Tarifa media", {anuncios: {activo: true, tarifa: "media"}}]];
    const v = MOD.matrizEscenarios(c, s, 1000).filas.map(f => f.celdas.map(z => z.margen_operacion));
    const mxp = Math.max(...v.flat()), mxn2 = Math.max(1, -Math.min(...v.flat()));
    let b = T(30, 28, "Margen de operación al mes con 1,000 restaurantes (pesos)", 14.5, C.vino, "start", 700);
    ads.forEach(([t], j) => { b += T(X0 + j * CW + CW / 2 - 6, Y0 - 16, t, 14, C.vino, "middle", 700); });
    curvas.forEach(([, t], i) => {
      b += T(X0 - 16, Y0 + i * CH + CH / 2 + 5, t, 14, C.vino, "end", 700);
      ads.forEach((_, j) => {
        const x = v[i][j], pos = x >= 0, k = pos ? Math.min(1, x / mxp) : Math.min(1, -x / mxn2), fuerte = k > 0.5;
        const fill = pos ? `rgb(${Math.round(255 - k * (255 - 63))},${Math.round(255 - k * (255 - 107))},${Math.round(255 - k * (255 - 59))})` : `rgb(${Math.round(255 - k * (255 - 155))},${Math.round(255 - k * (255 - 44))},${Math.round(255 - k * (255 - 44))})`;
        const rec = i === 1 && j === 1, peor = i === 0 && j === 0, mejor = i === 2 && j === 2;
        b += `<g class="gh" style="animation-delay:${(i * 3 + j) * 60}ms">${Rc(X0 + j * CW + 4, Y0 + i * CH + 4, CW - 8, CH - 8, fill, 18, rec ? `stroke="${C.dorado}" stroke-width="4"` : "")}</g>` + T(X0 + j * CW + CW / 2 - 6, Y0 + i * CH + CH / 2 + 6, fmP(x), 26, fuerte ? "#fff" : C.tinta, "middle", 400, true) + (rec || peor || mejor ? T(X0 + j * CW + CW / 2 - 6, Y0 + i * CH + CH - 14, rec ? "recomendado" : peor ? "peor" : "mejor", 11.5, fuerte ? "#fff" : C.t2, "middle", 700) : "");
      });
    });
    sv.innerHTML = b;
    return {
      leyenda: `<span><i style="background:${C.rojo}"></i>pierde</span><span><i style="background:${C.verde}"></i>gana</span><span><i style="background:none;border:3px solid ${C.dorado}"></i>recomendado</span>`,
      cifras: [[fmP(v[1][1]), "recomendado: pagan lo esperado y hay anuncios de tarifa baja", "supuesto"], [fmP(v[0][0]), "peor: pagan poco y todavía no hay anuncios", "supuesto"], [fmP(v[2][2]), "mejor: pagan más y hay anuncios de tarifa media", "supuesto"]],
      insight: `El margen va de ${fmP(v[0][0])} a ${fmP(v[2][2])} según qué tanto paguen y cuánto dejen los anuncios; sólo la esquina sin anuncios y con pocos pagos pierde.`,
    };
  },
  v3() { // qué hay que medir primero
    const sv = this.sv, se = conCache("sens", () => MOD.sensibilidad(config(S), sup(S), 1000, {curva: S.curva})), fil = se.filas.slice(0, 8), mx = Math.max(...fil.map(f => f.efecto), 1), X0 = 560, W = 300;
    let b = T(30, 28, "¿Qué hay que medir primero? El supuesto que más mueve el margen, arriba", 14.5, C.vino, "start", 700);
    fil.forEach((f, i) => {
      const y = 56 + i * 56, w = Math.max(6, W * f.efecto / mx);
      b += `<g data-tip="${esc2(f.frase)}">` + Rc(14, y - 4, 932, 52, i % 2 ? "rgba(0,0,0,0)" : C.a2, 14) + T(X0 - 14, y + 18, f.que_es.charAt(0).toUpperCase() + f.que_es.slice(1), 13, C.tinta, "end", 700) + T(X0 - 14, y + 36, "Cómo: " + f.medir_en_el_piloto, 11.5, C.t2, "end") + `<g class="gh" style="animation-delay:${i * 70}ms">${Rc(X0, y + 6, w, 26, i === 0 ? C.vino : C.dorado, 8)}</g>` + T(X0 + w + 10, y + 25, `mueve ${fmP(f.efecto)} al mes`, 13, C.tinta, "start", 700) + `</g>`;
    });
    sv.innerHTML = b;
    return {
      leyenda: `<span>Pasa el cursor por una barra: la frase en llano</span>`,
      cifras: se.medir_primero.slice(0, 3).map((f, i) => [`${i + 1}. ${f.supuesto}`, f.como, "medir"]),
      insight: `Lo primero por medir: ${se.filas[0].que_es}, con ${se.filas[0].medir_en_el_piloto}.`,
    };
  },
};
const esc2 = t => String(t).replace(/"/g, "&quot;").replace(/</g, "&lt;");


/* ===== Recomendaciones (sesión de análisis: recomendaciones.json) ===== */
const sinMd = t => String(t).replace(/\*\*/g, "").replace(/\*/g, "");
const aplicadaP = p => p && Object.entries(p).every(([k, v]) => S[k] === v);
/* tarjetas: qué hacer (5 a 8 palabras), por qué (una cifra), qué pasa si no (una línea); lo demás, detrás de «ver más» */
const PARCHES = {
  segmentacion: [{topeMesas: 12, topeCuentas: 3, topePlatillos: 150}, {topeMesas: 20, topeCuentas: 4, topePlatillos: 100}, {topeMesas: 25, topeCuentas: 4, topePlatillos: 150}],
  precios: [{precioServicio: 199, precioSalon: 1099}, {precioServicio: 225, precioSalon: 1099}, {precioServicio: 249, precioSalon: 1099}, {precioServicio: 299, precioSalon: 1099}],
  anuncios: [{mesAds: 3}, {mesAds: 9}, {mesAds: 99}],
  bolsa: [{bolsa: 500}, {bolsa: 1000}, {bolsa: 2000}, {bolsa: 5000}],
  historial: [{hist: 3, arch: true}, {hist: 12, arch: true}],
  soporte: [{soporte: 30}, {soporte: 60}, {soporte: 150}],
  avisos_reloj: [null, null],
};
const segC = (mesas, cuentas, plat) => 100 * MOD.seguridadChico({...config(S), topes: {...config(S).topes, gratuito: {...config(S).topes.gratuito, mesas, cuentas, platillos: plat}}}, SP);
const TARJ = {
  segmentacion: {
    que: "Chef gratis: 25 mesas, 4 cuentas, 150 platillos",
    cif: () => [n(segC(25, 4, 150), 1) + " %", "de los negocios de hasta 10 personas queda en Chef (modelo)"],
    si: () => `Con 15 mesas, ${n(segC(15, 4, 150), 1)} % de los chicos queda dentro (mínimo más bajo).`,
    rec: 2,
  },
  precios: {
    que: "Master Chef $225 y Chef Ejecutivo $1,099",
    cif: () => [mxn(225), "pegado a Meniu Business ($225)"],
    si: () => { const c = MOD.conversion(S.curva, 299, sup(S), "servicio"), c0 = MOD.conversion(S.curva, 225, sup(S), "servicio"); return `A $299 pagaría ${n(100 * c)} % de los que se pasan de Chef, no ${n(100 * c0)} %.`; },
    rec: 1,
  },
  anuncios: {
    que: "Anuncios no personalizados en Chef desde el mes 9",
    cif: () => ["mes 9", "empiezan los anuncios (supuesto)"],
    si: () => `Sin anuncios, con 1,000 gratuitos pones ${fmP(MOD.todosGratuitos(config(S), sup(S), 1000).costo_sin_anuncios)} al mes de tu bolsa.`,
    rec: 1,
  },
  bolsa: {
    que: "Bolsa de $1,000 al mes mientras no hay anuncios",
    cif: () => [n(MOD.capacidadConBolsa(config(S), sup(S), 1000).restaurantes), "restaurantes gratuitos caben con esa bolsa"],
    si: () => `Con $500 al mes caben ${n(MOD.capacidadConBolsa(config(S), sup(S), 500).restaurantes)} restaurantes.`,
    rec: 1,
  },
  historial: {
    que: "12 meses de historial en línea para Master Chef",
    cif: () => ["12 meses", "Chef: 1 mes; archivo descargable"],
    si: () => `Cada cliente de paga pesa ${n(evalS({...S, hist: 12}).capacidad.mb_por_restaurante.servicio)} MB con 12 meses y ${n(evalS({...S, hist: 3}).capacidad.mb_por_restaurante.servicio)} con 3.`,
    rec: 1,
  },
  soporte: {
    que: "Soporte por WhatsApp en horario hábil",
    cif: () => ["$60", "al mes por cliente de paga"],
    si: () => `Con $150 (alta hecha por nosotros) el margen baja de ${mp(motor({...S, soporte: 60}).margen)} a ${mp(motor({...S, soporte: 150}).margen)}.`,
    rec: 1,
  },
  avisos_reloj: {
    que: "Los relojes de la mesa viven en el teléfono",
    cif: () => ["0", "avisos de reloj del servidor"],
    si: () => "El servidor tendría que mandar un aviso de reloj por cada mesa.",
    rec: 0,
  },
};
DET.recomendaciones = {
  titulo: "Seis recomendaciones: qué hacer, por qué y qué pasa si no.",
  fu: ["carta_precio", "carta_tres_planes", "carta_disco", "calvin_posturas"],
  nota: "Recomendaciones del análisis, no decisiones: las decide Calvin. Planes y precios son propuesta; la v1 no cobra. «Chef Ejecutivo» es nombre propuesto.",
  montar(host) {
    host.innerHTML = `<div class="rgrid">${REC.decisiones.map((r, i) => `<div class="rcard" id="r_${r.id}" style="--i:${i}"></div>`).join("")}</div>`;
    host.addEventListener("click", ev => { const t = ev.target.closest("[data-mas]"); if (!t) return; const d = $("#mas_" + t.dataset.mas, host); d.hidden = !d.hidden; t.setAttribute("aria-expanded", !d.hidden); t.textContent = d.hidden ? "ver más ›" : "ver menos ‹"; });
  },
  actualizar() {
    REC.decisiones.forEach((r, k) => {
      const tj = TARJ[r.id], parches = PARCHES[r.id] || [], [cif, sub] = tj.cif();
      const pr = parches[tj.rec], on = aplicadaP(pr);
      const op = (a, i) => {
        const rec = i === tj.rec, p = parches[i], on2 = aplicadaP(p);
        return `<div class="opcion${rec ? " rec" : ""}"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h4>${esc(a.opcion.replace(/ ?\((.*?)recomendad[oa](.*?)\)/, ""))}</h4>${rec ? '<span class="et prop">recomendado</span>' : ""}</div><ul><li class="pro">+ ${esc(sinMd(a.pros))}</li><li class="con">− ${esc(sinMd(a.contras))}</li></ul>${p ? `<button class="btn${on2 ? " on" : ""}" data-aplica='${JSON.stringify(p)}'>${on2 ? "✓ aplicado" : rec ? "Aplicar" : "Probar esta"}</button>` : ""}</div>`;
      };
      $("#r_" + r.id).innerHTML = `<div class="num">${k + 1}</div><h3>${esc(tj.que)}</h3><div class="por"><b>${esc(cif)}</b><span>${esc(sub)}</span></div><div class="si"><i>Si no</i>${esc(tj.si())}</div><div class="acc2">${pr ? `<button class="btn${on ? " on" : ""}" data-aplica='${JSON.stringify(pr)}'>${on ? "✓ aplicado" : "Aplicar al escenario"}</button>` : ""}<button class="btn" data-mas="${r.id}" aria-expanded="false">ver más ›</button></div><div id="mas_${r.id}" hidden><div class="tarjetas" style="margin-top:10px">${r.alternativas.map(op).join("")}</div><div class="ejemplo"><b>Con un restaurante concreto:</b> ${esc(sinMd(r.ejemplo))}</div><div class="ejemplo" style="background:#f6e4e4"><b>De qué depende:</b> ${esc(sinMd(r.depende))}</div><p style="font-size:13px"><b>Prueba que lo cambiaría:</b> ${esc(sinMd(r.prueba))}</p></div>`;
    });
    const m = motor(S);
    return {cifras: [[n(m.caben), "restaurantes caben con lo aplicado"], [mxn(S.precioServicio), "Master Chef al mes", "propuesta"], [mp(m.margen), "margen de operación con 1,000 restaurantes", "supuesto"], [emTxt(m), "se pasa del plan Chef", "supuesto"]], insight: "Aplica una y las cifras de arriba cambian: lo recomendado es el punto de partida."};
  },
};

/* ===== detalle de cada cifra de arriba: de dónde sale ===== */
function cuentaDet(titulo, fu, filas, insight) {
  return {
    titulo, fu, montar(host) { host.innerHTML = `<div class="cuenta" id="cu"></div>`; },
    actualizar() { $("#cu").innerHTML = filas().map(([a, v, tot]) => `<div${tot ? ' class="t"' : ""}>${a}</div><div class="v${tot ? " t" : ""}">${v}</div>`).join(""); return {insight: insight(), cifras: []}; },
  };
}
const gl = t => (GLOS.find(g => g.termino === t) || {}).que_es || "";
DET.k_potenciales = cuentaDet("Clientes potenciales (SAM): 104,882 restaurantes a la carta y bares.", ["inegi_denue", "carta_mercado"], () => [
  ["Mercado total (TAM): restaurantes y bares de México", n(M.total)], ["− Fuera de lo que Carta atiende hoy (fondas para llevar, tacos, mariscos, cafeterías)", "− " + n(M.total - M.nucleo)], ["= Clientes potenciales (SAM)", n(M.nucleo), true],
  ["De ellos, sin posibles cadenas (nombre repetido; casi ninguna lo es)", "≈ " + n(M.servible)], ["Rango sin cadenas según el umbral", n(M.servible_rango[0]) + " a " + n(M.servible_rango[1])], ["Meta a 12 meses (SOM): escenario del modelo", n(SP.meta_12_meses) + " restaurantes (1,200 a 24 meses)"]], () => "El mercado no es el límite: lo es cuántos dueños prueban Carta y cuántos pagan.");
DET.k_caben = cuentaDet("Cuántos restaurantes caben: lo decide el recurso que se llena primero.", ["carta_anuncios", "carta_capacidad", "railway_limites"], () => {
  const m = motor(S); return [["Escalón del servidor", nomServ(m) + " · hasta " + m.usd + " USD al mes"], ["Mezcla del escenario: clientes de paga por 1,000", n(1000 * m.f, 1)], ...m.lim.map(([nom, v]) => [`Límite por ${nom}`, n(v)]), [`Cabe el menor: ${m.cuello}`, n(m.caben) + " restaurantes", true]];
}, () => "Son escalones de infraestructura (servidor de hoy con sondeo, con eventos, Pro de 8 procesos), no escenarios. Cámbialos en «¿Qué llena el disco?».");
DET.k_sostiene = cuentaDet("Un cliente de paga sostiene el costo de decenas de clientes gratuitos.", ["carta_planes", "carta_precio"], () => {
  const m = motor(S), pc = m.ev.por_cliente, neto = pc.costo_gratuito - pc.ingreso_gratuito;
  return [[`Ingreso por cliente de paga`, mxn(Math.round(pc.ingreso_por_pagante))], ["− Costo de atenderlo (servidor, soporte y comisión de tarjeta)", "− " + n(pc.costo_servicio, 1)], ["= Margen por cliente de paga", mxn(Math.round(pc.margen_servicio)), true], ["Costo de un cliente gratuito (servidor y soporte)", mxn(Math.round(pc.costo_gratuito * 100) / 100)], ["− Lo que deja en anuncios (en régimen)", "− " + n(pc.ingreso_gratuito, 2)], ["= Costo neto de un gratuito", neto <= 0 ? "se paga solo" : mxn(Math.round(neto * 100) / 100), true], ["Gratuitos que sostiene cada cliente de paga", m.sePagaSolo ? "todos: se pagan solos" : n(m.sostiene), true], ["Sin contar anuncios", m.sostieneSinAds == null ? "—" : n(m.sostieneSinAds)]];
}, () => "Mientras no hay anuncios, la cifra firme es la de sin anuncios; con anuncios en régimen cada gratuito puede pagarse solo.");
DET.k_anuncios = cuentaDet("El plan gratuito lleva anuncios; lo que cambia es desde qué mes.", ["carta_anuncios"], () => {
  const t = SP.anuncio_pesos_por_mil, v = SP.visitas_app_gratuito, p = SP.parte_visitas_con_anuncio;
  return [["Los anuncios empiezan", S.mesAds >= 99 ? "nunca" : "en el mes " + S.mesAds + " (supuesto)"], ["Visitas con la app al mes de un gratuito típico", n(v)], ["Parte de las visitas que ven anuncio (supuesto)", n(100 * p) + " %"], ...["baja", "media", "alta"].map(k => [`Tarifa ${k}: ${mxn(t[k])} por mil visitas`, mxn(Math.round(t[k] * v * p / 100) / 10) + " al mes por gratuito"]), ["Hasta entonces, el costo lo pones tú", "ver «¿Cómo se sostiene?»", true]];
}, () => "Para tenerlos hace falta un ADR, abrir la política de seguridad del sitio, cambiar el aviso de privacidad y que AdSense los apruebe: hoy no existen.");
DET.k_ingreso = cuentaDet("Un cliente de paga ingresa el precio de su plan cada mes.", ["carta_precio", "carta_tres_planes"], () => [[`${PLAN.paga} (11 a 100 personas)`, mxn(S.precioServicio) + " al mes"], [`${PLAN.ejec} (más de 100 personas; nombre propuesto)`, mxn(S.precioSalon) + " al mes"], ["Meseta del margen, curva " + S.curva, `${mxn(motor(S).meseta.desde)} a ${mxn(motor(S).meseta.hasta)}`], ["Corredor por sustituto", "$249 a $349"], ["Meniu, el sustituto más barato, cobra", "$225"]], () => "El precio es propuesta: la v1 no cobra, y lo confirma el piloto con 10 restaurantes.");
DET.k_margen = cuentaDet("Tres márgenes con nombre: de operación, después de captación y neto.", ["carta_tres_planes", "carta_precio"], () => {
  const m = motor(S), e = m.ev; return [["Ingresos por suscripción", mxn(Math.round(e.ingresos.suscripcion))], ["Ingresos por anuncios (en régimen)", mxn(Math.round(e.ingresos.anuncios))], ["− Servidor y almacenamiento", "− " + n(e.costos.servidor + e.costos.almacenamiento + e.costos.objetos)], ["− Soporte", "− " + n(e.costos.soporte)], ["− Comisión de tarjeta", "− " + n(e.costos.comision)], ["= Margen de operación (sin captación ni sueldos)", mp(e.margen_operacion), true], ["− Reponer bajas (3 % al mes × costo de conseguir un cliente)", "− " + n(e.captacion.reposicion_de_bajas)], ["= Margen después de captación", mp(e.margen_despues_de_captacion), true], ["Margen neto (sueldos e impuestos valen cero: sin dato)", mp(e.margen_neto), true]];
}, () => "El margen de operación no incluye sueldos ni impuestos ni conseguir clientes; por eso se muestran los tres.");

/* ===== presentación de producto: seis tomas, un objeto por toma y una cámara que se mueve (≈ 28 s) ===== */
const DURS = [4200, 4200, 4200, 5000, 4200, 4400, 3600], NESC = DURS.length, TOTI = DURS.reduce((a, b) => a + b, 0);
const INI = DURS.map((_, i) => DURS.slice(0, i).reduce((a, b) => a + b, 0));
const easeO = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
const easeB = k => { k = clamp(k, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const segI = (u, a, b) => clamp((u - a) / (b - a), 0, 1);
const lerp = (a, b, k) => a + (b - a) * k;
const FOTO = ["#c9573d", "#d9a441", "#7a9a4a", "#b5527b", "#d9cfc2"];
const VO = "#2b0d17", CR = "#fef9f1", DO = "#f3d58a";
const camI = (x, y, z, rot = 0) => `transform="translate(480 270) rotate(${rot}) scale(${z}) translate(${-x} ${-y})"`;
/* los teléfonos con las pantallas del prototipo: cabecera vino, fotos y botones */
const fonoI = (x, y, s, inner, id, rot = 0) => `<g transform="translate(${x},${y}) rotate(${rot}) scale(${s}) translate(-100,-200)"><rect x="6" y="14" width="200" height="400" rx="30" fill="#000" opacity=".28"/><rect width="200" height="400" rx="30" fill="#1a1a1a"/><clipPath id="cp${id}"><rect x="8" y="10" width="184" height="380" rx="24"/></clipPath><rect x="8" y="10" width="184" height="380" rx="24" fill="${CR}"/><g clip-path="url(#cp${id})">${inner}</g></g>`;
const platoI = (y, i, op = 1, dx = 0) => `<g opacity="${op}" transform="translate(${dx},0)">${Rc(18, y, 164, 56, "#fff", 16)}<circle cx="46" cy="${y + 28}" r="19" fill="${FOTO[i % 5]}"/>${Rc(74, y + 12, 70, 8, "#6b2d3e", 4, 'opacity=".75"')}${Rc(74, y + 28, 48, 6, "#b9afa3", 3)}${Rc(74, y + 40, 30, 6, "#b8860b", 3)}<circle cx="160" cy="${y + 28}" r="11" fill="#6b2d3e"/>${Rc(154, y + 27, 12, 2.4, "#fff", 1)}${Rc(159, y + 22, 2.4, 12, "#fff", 1)}</g>`;
const encabI = (t, f = "#6b2d3e") => Rc(8, 10, 184, 64, f, 0) + T(100, 54, t, 22, CR, "middle", 400, true);
const qrCeldas = (x, y, w) => { let q = ""; const c = w / 9; for (let i = 0; i < 49; i++) { const r = Math.floor(i / 7), k = i % 7; if (((r * 5 + k * 3 + r * k) % 3) !== 0 || (r < 2 && k < 2) || (r < 2 && k > 4) || (r > 4 && k < 2)) q += Rc(x + c + k * c, y + c + r * c, c * 0.84, c * 0.84, "#1a1a1a", c * 0.18); } return q; };
/* el acrílico con el QR, que gira despacio: ancho = |cos| y dos caras */
const atril = (cx, cy, s, a) => { const c = Math.cos(a), w = Math.max(Math.abs(c), 0.02); return `<g transform="translate(${cx},${cy}) scale(${s})"><ellipse cx="0" cy="132" rx="${70 * (0.6 + 0.4 * w)}" ry="10" fill="#000" opacity=".3"/><g transform="scale(${w},1)">${Rc(-72, -112, 144, 224, "rgba(255,255,255,.16)", 22)}${c >= 0 ? Rc(-60, -100, 120, 200, "#fff", 14) + qrCeldas(-48, -86, 96) + Rc(-40, 62, 80, 14, "#6b2d3e", 7) + T(0, 90, "Carta", 16, "#6b2d3e", "middle", 400, true) : Rc(-60, -100, 120, 200, "#6b2d3e", 14) + T(0, 8, "Carta", 30, DO, "middle", 400, true)}</g></g>`; };
/* rótulo cinético: palabra por palabra, con resorte */
const rotulo = (txt, u, x, y, size, col = CR, t0 = 200, anchor = "start") => {
  const cv = rotulo.cv || (rotulo.cv = document.createElement("canvas").getContext("2d")); cv.font = `${size}px "DM Serif Display", serif`;
  const ps = txt.split(" "), ws = ps.map(p => cv.measureText(p + " ").width), tot = ws.reduce((a, b) => a + b, 0);
  let cx = anchor === "middle" ? x - tot / 2 : x, o = "";
  ps.forEach((p, i) => { const k = easeB(segI(u, t0 + i * 150, t0 + i * 150 + 450)), op = easeO(segI(u, t0 + i * 150, t0 + i * 150 + 250)); o += `<g transform="translate(${cx},${y + (1 - k) * 26})" opacity="${op}">${T(0, 0, p, size, col, "start", 400, true)}</g>`; cx += ws[i]; });
  return o;
};
const etiq = (t, hoy) => `<g>${Rc(340, 494, 280, 28, hoy ? "#3f6b3b" : "rgba(0,0,0,0)", 14, hoy ? "" : 'stroke="#f3d58a" stroke-width="1.6"')}${T(480, 513, t, 12.5, hoy ? "#fff" : DO, "middle", 700)}</g>`;
const ESCENAS = [
  u => { // 0 · Presentamos: el acrílico con el QR, y luego «Carta»
    const kC = easeB(segI(u, 2300, 2900));
    return `<g ${camI(480, 280, 1 + u / 40000)}>${atril(480, 270, 1.15, 0.5 + u / 1100)}</g>` + T(480, 96, "PRESENTAMOS", 20, DO, "middle", 700, false, `letter-spacing="7" opacity="${easeO(segI(u, 100, 700))}"`) + `<g transform="translate(480,462) scale(${kC})" opacity="${easeO(segI(u, 2300, 2600))}">${T(0, 0, "Carta", 96, CR, "middle", 400, true)}</g>`;
  },
  u => { // 1 · Escanea: la cámara entra al QR, llega un teléfono, barrido de luz
    const z = lerp(1.1, 2.2, easeO(segI(u, 0, 2600))), ph = easeO(segI(u, 700, 1600)), bar = segI(u, 1700, 3000), ok = easeB(segI(u, 3000, 3500));
    return `<g ${camI(480, 270, z)}>${atril(480, 270, 1.1, 0)}${bar > 0 && bar < 1 ? `<rect x="${480 - 66}" y="${270 - 100 + 190 * bar}" width="132" height="14" rx="7" fill="#f3d58a" opacity=".75"/>` : ""}${fonoI(lerp(760, 640, ph), lerp(520, 340, ph), 0.8, encabI("Mesa 4") + `<circle cx="100" cy="190" r="30" fill="#b8860b"/>` + Rc(46, 250, 108, 12, "#6b2d3e", 6, 'opacity=".5"'), "s1", lerp(18, 8, ph))}${u > 3000 ? `<circle cx="480" cy="270" r="${46 * ok}" fill="#3f6b3b" opacity=".92"/><path d="M458 270 l16 16 l30 -34" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${ok}"/>` : ""}</g>` + rotulo("Escanea.", u, 48, 470, 76, CR, 500) + etiq("hoy en producción", true);
  },
  u => { // 2 · La carta, con fotos: el menú sale del teléfono como tarjetas
    const sal = i => easeB(segI(u, 600 + i * 170, 1300 + i * 170)), pos = [[-230, -100, -8], [230, -110, 7], [-290, 20, 5], [290, 30, -6], [-210, 140, -4], [215, 145, 6]];
    let c = ""; pos.forEach(([dx, dy, r], i) => { const k = sal(i); c += `<g transform="translate(${480 + dx * k},${305 + dy * k}) rotate(${r * k}) scale(${0.9 * k})" opacity="${k > 0 ? 1 : 0}">${Rc(-95, -32, 190, 64, "#fff", 18)}<circle cx="-62" cy="0" r="22" fill="${FOTO[i % 5]}"/>${Rc(-30, -16, 84, 9, "#6b2d3e", 4, 'opacity=".75"')}${Rc(-30, 2, 56, 7, "#b9afa3", 3)}${Rc(-30, 16, 36, 7, "#b8860b", 3)}</g>`; });
    return `<g ${camI(480, 305, 1 + u / 30000)}>${c}${fonoI(480, 305, 0.85, encabI("Carta") + [0, 1, 2, 3].map(i => Rc(16 + i * 44, 84, 40, 16, i ? "#e6d9c6" : "#6b2d3e", 8)).join("") + [0, 1, 2].map(i => platoI(112 + i * 68, i)).join(""), "s2")}</g>` + rotulo("La carta, con fotos.", u, 48, 70, 54, CR, 300) + etiq("hoy en producción", true);
  },
  u => { // 3 · La mesa pide junta: vista de pájaro, cuatro teléfonos y una sola orden
    const ph = [[260, 270, 90], [700, 270, -90], [480, 150, 180], [480, 392, 0]], col = ["#b8860b", "#6b2d3e", "#3f6b3b", "#b5527b"];
    let g = `<circle cx="480" cy="270" r="92" fill="#6b2d3e" opacity=".55"/><circle cx="480" cy="270" r="92" fill="none" stroke="#f3d58a" stroke-width="3" opacity=".4"/>`;
    ph.forEach(([x, y, r], i) => { g += fonoI(x, y, 0.3, encabI("") + `<circle cx="100" cy="180" r="30" fill="${col[i]}"/>` + [0, 1].map(j => platoI(230 + j * 62, i + j, easeO(segI(u, 300 + i * 120 + j * 300, 700 + i * 120 + j * 300)))).join(""), "s3" + i, r); });
    let f = ""; ph.forEach(([x, y], i) => [0, 1].forEach(j => { const k = easeO(segI(u, 1100 + i * 140 + j * 220, 2100 + i * 140 + j * 220)); if (k > 0 && k < 1) f += `<circle cx="${lerp(x, 480, k) + (j ? 12 : -12) * Math.sin(k * Math.PI)}" cy="${lerp(y, 270, k) - 36 * Math.sin(k * Math.PI)}" r="${13 - 5 * k}" fill="${col[i]}"/>`; }));
    const nPl = Math.round(8 * segI(u, 1300, 2500)), ko = easeB(segI(u, 2100, 2700));
    g += f + `<g transform="translate(480,270) scale(${ko})" opacity="${ko > 0 ? 1 : 0}">${Rc(-78, -52, 156, 104, CR, 20)}${T(0, -14, "Mesa 4", 24, "#6b2d3e", "middle", 400, true)}${T(0, 20, `${nPl} platillos`, 16, "#1a1a1a", "middle", 700)}${Rc(-44, 30, 88, 16, "#b8860b", 8)}</g>`;
    return `<g ${camI(480, 250, lerp(1, 1.1, easeO(segI(u, 0, 4600))), lerp(0, -3, easeO(segI(u, 0, 4600))))}>${g}</g>` + rotulo("La mesa pide junta.", u, 48, 64, 48, CR, 200) + `<g transform="translate(912,470)" opacity="${easeO(segI(u, 2900, 3400))}">${T(0, 0, "4 teléfonos, 1 orden", 40, DO, "end", 400, true)}</g>` + etiq("Fase 3 · aún no construido", false);
  },
  u => { // 4 · Llega al mesero: la orden se dobla en comanda y viaja al teléfono del mesero
    const k = easeO(segI(u, 400, 1500)), fold = segI(u, 400, 1100), t = easeO(segI(u, 1300, 2800)), x = lerp(300, 700, t), y = lerp(290, 300, t) - 90 * Math.sin(t * Math.PI), ok = u > 3400;
    const w = lerp(156, 84, fold), h = lerp(104, 150, fold);
    const bell = `<g transform="translate(168,42) rotate(${u > 2800 ? 16 * Math.sin(u / 55) * (1 - segI(u, 2800, 3800)) : 0})"><path d="M-9 8 a9 9 0 0 1 18 0 v6 h-18z" fill="${DO}"/><circle cx="0" cy="18" r="3" fill="${DO}"/></g>`;
    const tick = `<g transform="translate(${190 * (1 - easeO(segI(u, 2700, 3300)))},0)">${Rc(18, 100, 164, 150, "#fff", 18)}${T(32, 130, "Mesa 4", 18, "#6b2d3e", "start", 700)}${[0, 1, 2, 3].map(i => Rc(32, 146 + i * 18, 90 - (i % 2) * 24, 8, "#b9afa3", 4)).join("")}${Rc(32, 214, 136, 28, ok ? "#3f6b3b" : "#b8860b", 14)}${T(100, 233, ok ? "Atendida ✓" : "Atender", 13, "#fff", "middle", 700)}</g>`;
    return `<g ${camI(lerp(400, 620, easeO(segI(u, 600, 2800))), 290, lerp(1, 1.25, easeO(segI(u, 600, 3200))))}>` + fonoI(260, 300, 0.7, encabI("Mesa 4") + `<circle cx="100" cy="190" r="34" fill="#3f6b3b"/><path d="M84 190 l12 12 l22 -24" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`, "s4a") + fonoI(740, 300, 0.7, Rc(8, 10, 184, 64, "#4f1728", 0) + T(60, 54, "Mesero", 20, CR, "middle", 400, true) + bell + tick, "s4b") + (t < 1 ? `<g transform="translate(${x},${y}) rotate(${(1 - t) * -8})">${Rc(-w / 2, -h / 2, w, h, CR, 16)}${fold > 0.6 ? [0, 1, 2].map(i => Rc(-w / 2 + 12, -h / 2 + 24 + i * 18, w - 24 - i * 10, 8, "#b9afa3", 4)).join("") + Rc(-w / 2 + 10, -h / 2 + 8, w - 20, 10, "#6b2d3e", 5) : T(0, 6, "Mesa 4", 22, "#6b2d3e", "middle", 400, true)}</g>` : "") + `</g>` + rotulo("Llega al mesero.", u, 48, 70, 54, CR, 200) + etiq("Fase 3 · aún no construido", false);
  },
  u => { // 5 · El personal lleva la mesa: el aro cambia de color por sus estados
    const nom = ["Abierta", "Cuenta cerrada", "Pagada", "Mesa limpia"], cols = ["#b8860b", "#f3d58a", "#3f6b3b", "#d9cfc2"], pos = easeO(segI(u, 500, 3600)) * 3, st = Math.min(3, Math.floor(pos + 0.02)), a = Math.min(3, st + 1), kk = pos - st;
    const mix = (c1, c2, k) => { const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), A = p(c1), B = p(c2); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(",")})`; };
    const col = mix(cols[st], cols[a], clamp(kk * 1.4, 0, 1));
    return `<g ${camI(480, 270, lerp(1.35, 1.0, easeO(segI(u, 0, 4000))))}><circle cx="480" cy="270" r="112" fill="none" stroke="${col}" stroke-width="22"/><circle cx="480" cy="270" r="92" fill="#6b2d3e"/><rect x="448" y="258" width="64" height="12" rx="6" fill="${CR}"/><rect x="456" y="270" width="9" height="30" rx="4" fill="${CR}"/><rect x="495" y="270" width="9" height="30" rx="4" fill="${CR}"/></g>` + rotulo("El personal lleva la mesa.", u, 48, 70, 54, CR, 200) + [0, 1, 2, 3].map(i => `<g transform="translate(${130 + i * 233},448)">${Rc(-100, -26, 200, 40, i === st ? col : "rgba(255,255,255,.1)", 20)}${T(0, 0, nom[i], 15, i === st ? "#1a1a1a" : "#f3e3e7", "middle", 700)}</g>`).join("") + etiq("Fase 3 · aún no construido", false);
  },
  u => { // 6 · cierre
    const k = easeB(segI(u, 100, 800));
    return `<g ${camI(480, 270, lerp(1.1, 1, easeO(segI(u, 0, 2500))))}>` + `<g transform="translate(480,250) scale(${k})" opacity="${easeO(segI(u, 100, 400))}">${T(0, 0, "Carta", 120, CR, "middle", 400, true)}</g>` + `</g>` + `<g opacity="${easeO(segI(u, 900, 1500))}">${T(480, 320, "El menú que la mesa arma junta", 32, DO, "middle", 400, true)}</g>`;
  },
];
let tI = 0, pausaI = false, rafI = 0, ultI = 0, ocultoT = 0;
function cerrarIntro() { cancelAnimationFrame(rafI); $("#intro").hidden = true; document.body.style.overflow = ""; try { localStorage.setItem("carta-v9-intro", "1"); } catch (e) { /* ignorar */ } }
function pintaIntro() {
  let e = NESC - 1; for (let i = 0; i < NESC; i++) if (tI < INI[i] + DURS[i]) { e = i; break; }
  const u = tI - INI[e], g = $("#introG"); if (g) g.innerHTML = ESCENAS[e](u);
  $$("#intro .barras i b").forEach((b, k) => { b.style.width = (k < e ? 100 : k === e ? 100 * u / DURS[e] : 0) + "%"; });
  const bp = $("#introPausa"); if (bp) bp.textContent = pausaI ? "▶" : "❚❚";
  const cta = $("#introCta"); if (cta) cta.hidden = e !== NESC - 1 || u < 1700;
}
function saltaI(ms) {
  if (REDUCE) { let e = 0; for (let i = 0; i < NESC; i++) if (tI >= INI[i]) e = i; e = clamp(e + (ms > 0 ? 1 : -1), 0, NESC - 1); tI = INI[e] + DURS[e] * 0.92; }
  else tI = clamp(tI + ms, 0, TOTI - 1);
  pintaIntro();
}
function muestraControles() { const el = $("#intro"); if (!el) return; el.classList.remove("quieto"); clearTimeout(ocultoT); ocultoT = setTimeout(() => el.classList.add("quieto"), 2600); }
function frameIntro(ts) {
  if ($("#intro").hidden) return;
  if (!pausaI) { tI += clamp(ts - ultI, 0, 100); if (tI >= TOTI) { tI = TOTI - 1; pausaI = true; } }
  ultI = ts; pintaIntro(); rafI = requestAnimationFrame(frameIntro);
}
function abrirIntro() {
  const el = $("#intro");
  el.innerHTML = `<svg id="introSvg" viewBox="0 0 960 540" role="img" aria-label="Cómo cambia pedir en un restaurante" font-family="DM Sans, sans-serif"><g id="introG"></g></svg><div id="introCta" class="icta" hidden><button class="btn gran" data-intro="saltar">Ver el informe</button><button class="btn" data-intro="repetir">Repetir</button></div><div class="ictl"><button class="btn" data-intro="saltar">Saltar ✕</button></div><div class="barras ictl">${ESCENAS.map(() => "<i><b></b></i>").join("")}<button class="btn" data-intro="menos" aria-label="Atrás 3 segundos">−3 s</button><button class="btn" id="introPausa" data-intro="pausa" aria-label="Pausa o reanudar">❚❚</button><button class="btn" data-intro="mas" aria-label="Adelante 3 segundos">+3 s</button>${BTN_PANTALLA}</div>`;
  el.hidden = false; document.body.style.overflow = "hidden"; tI = 0; pausaI = REDUCE; ultI = performance.now(); pintaIntro(); muestraControles();
  cancelAnimationFrame(rafI); rafI = requestAnimationFrame(frameIntro);
  el.onpointermove = muestraControles;
  el.onclick = ev => { muestraControles(); const b = ev.target.closest("[data-intro]"); if (!b) return; const a = b.dataset.intro; if (a === "saltar") cerrarIntro(); else if (a === "repetir") { tI = 0; pausaI = false; ultI = performance.now(); } else if (a === "pausa") { pausaI = !pausaI; pintaIntro(); } else if (a === "menos") saltaI(-3000); else saltaI(3000); };
}
document.addEventListener("keydown", e => {
  if ($("#intro").hidden) return;
  muestraControles();
  if (e.key === "ArrowLeft") saltaI(-3000); else if (e.key === "ArrowRight") saltaI(3000); else if (e.key === " " && document.activeElement.tagName !== "BUTTON") { e.preventDefault(); pausaI = !pausaI; pintaIntro(); }
});

/* ===== arranque ===== */
function todo() { pintaEscenario(); pintaKpis(); refrescar(); }
montaCaps(); todo();
oyentes.push(todo);
$("#verIntro").addEventListener("click", abrirIntro);
$("#pantallaTop").innerHTML = BTN_PANTALLA;
$("#verDecisiones").addEventListener("click", () => abre("recomendaciones"));
const h0 = location.hash.slice(1);
if (h0 && CAPS.some(c => c.id === h0)) setTimeout(() => irCap(h0), 300);
else if (h0 && DET[h0]) abre(h0, false);
else { let visto = false; try { visto = localStorage.getItem("carta-v9-intro") === "1"; } catch (e) { /* ignorar */ } if (!visto && !location.search.includes("nointro")) abrirIntro(); }
