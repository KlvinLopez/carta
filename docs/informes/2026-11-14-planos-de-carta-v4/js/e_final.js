/* ===== detalle: ¿Cómo se sostiene? (cuatro vistas, cada una con su gráfica) ===== */
const fmP = x => (x < 0 ? "−" : "") + mxn(Math.abs(Math.round(x)));
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
    host.innerHTML = `<div class="seg" id="tabsK" style="margin-bottom:8px">${VISTAS.map((t, i) => `<button class="btn" data-vista="${i}">${t}</button>`).join("")}</div><div class="viz"><svg id="svK" viewBox="0 0 960 540" role="img" font-family="DM Sans, sans-serif"></svg></div><div class="seg" id="banK" style="margin-top:8px" hidden></div>`;
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
    const bk = $("#banK"); bk.hidden = this.v !== 1; bk.innerHTML = BAND.banderas.map(b => `<span class="chip" data-tip="${esc2(b.nombre.replace(/ \(.*\)/, "") + "|avisa a " + b.umbral_aviso + ", actúa a " + b.umbral_accion + "|" + pal20(b.que_hacer, 20))}" tabindex="0">${esc(b.nombre.replace(/ \(.*\)/, ""))} <b>${b.umbral_aviso}/${b.umbral_accion}</b></span>`).join("");
    return this.pinta();
  },
  /* al arrastrar el punto: se redibuja y el hallazgo de abajo cuenta con el mismo número */
  sigue() { const o = this.pinta(), h = document.querySelector("#cap-sostiene .caphall"); if (o && o.insight) { if (h) h.innerHTML = `<b>Hallazgo.</b> ${esc(o.insight)}`; const d = document.querySelector("#det #ins"); if (d) d.innerHTML = `<b>Insight clave.</b> ${esc(o.insight)}`; } },
  pinta() { const o = [this.v0, this.v1, this.v2, this.v3, this.v4][this.v].call(this); return o; },
  v0() { // ¿hasta dónde aguanto con todos gratuitos?
    const sv = this.sv, c = config(S), s = sup(S), N = this.N, g = MOD.todosGratuitos(c, s, N);
    const RR8 = conCache("rec8", () => MOD.recursos(c, s, "hoy"));
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
    b += `<line x1="${X(N)}" x2="${X(N)}" y1="${Y0}" y2="${Y0 + H}" stroke="${C.tinta}" stroke-width="1.5" stroke-dasharray="4 3"/><g data-drag="1" id="hN" style="touch-action:none"><circle cx="${X(N)}" cy="${Y0 + H}" r="30" fill="rgba(0,0,0,0)"/><circle cx="${X(N)}" cy="${Y0 + H}" r="13" fill="${C.tinta}" stroke="#fff" stroke-width="3"/></g>`;
    // lo que pasa con N restaurantes gratuitos
    const px = 650;
    b += T(px, 76, `${n(N)} restaurantes gratuitos`, 22, C.vino, "start", 400, true);
    b += T(px, 118, `${n(g.comensales_mes / 1e6, 2)} M`, 34, C.tinta, "start", 400, true) + T(px, 138, "comensales al mes (simulados)", 12.5, C.t2);
    b += T(px, 178, fmP(g.costo_sin_anuncios), 30, C.rojo, "start", 400, true) + T(px, 198, "al mes que pones tú mientras no hay anuncios", 12.5, C.t2);
    b += T(px, 232, "Cuando ya hay anuncios, al mes:", 13, C.t2, "start", 700);
    [["baja", "tarifa baja", C.vino], ["medio", "tarifa media", C.verde], ["adverso", "adverso (la mitad)", C.dorado]].forEach(([k, nm, col], i) => { const r = g.con_anuncios[k]; b += `<circle cx="${px + 6}" cy="${256 + i * 30}" r="6" fill="${col}"/>` + T(px + 20, 261 + i * 30, `${nm}: ${fmP(r.margen)}`, 14, C.tinta, "start", 700) + T(px + 270, 261 + i * 30, r.se_paga_solo ? "se paga solo" : "no alcanza", 12, r.se_paga_solo ? C.verde : C.rojo, "end", 700); });
    b += T(px, 394, "Se paga solo con anuncios desde:", 13, C.t2, "start", 700);
    [["baja", "baja", C.vino], ["medio", "media", C.verde], ["adverso", "adversa", C.dorado]].forEach(([k, nm, col], i) => { b += T(px + i * 96, 422, desde[k] == null ? "—" : n(desde[k]), 22, col, "start", 400, true) + T(px + i * 96, 440, `tarifa ${nm}`, 11.5, C.t2) + T(px + i * 96, 456, `rango ${rg(rs[k])}`, 11, C.t2); });
    const bolSin = conCache("bolsaSin" + S.bolsa, () => MOD.rangoBolsa(MOD.conHistorialGratuito(c, s, 12), s, S.bolsa));
    b += `<rect x="30" y="462" width="900" height="24" rx="8" fill="rgba(0,0,0,0)" data-tip="${esc2("Lo que no cuenta este cálculo|" + bol.no_modelado.length + " cosas|Moderar anuncios, la comisión de la red de anuncios y los impuestos; se miden en el piloto.")}" tabindex="0"/>` + T(30, 478, `Con ${mxn(S.bolsa)} al mes de tu bolsa caben ${n(bol.centro.restaurantes)} restaurantes gratuitos (de ${n(bol.minimo)} a ${n(bol.maximo)} según el soporte) con historial a 30 días (propuesta);`, 14, C.osc, "start", 700) + T(30, 498, `sin purga caben ${n(bolSin.centro.restaurantes)}: hoy nada limpia el disco. El costo y el margen suponen la purga a 30 días.`, 14, C.rojo, "start", 700);
    b += T(30, 524, `Vale con la Fase 3 (canal de eventos); hoy, con sondeo, caben ${n(RR8.cuello_hoy.con_historial_30_dias.restaurantes)} con 30 días y ${n(RR8.cuello_hoy.restaurantes)} sin purga. Los umbrales son rangos.`, 12, C.t2);
    sv.innerHTML = b;
    this.invN = x => clamp(Math.round(Math.pow(10, lo + (x - X0) / W * (hi - lo)) / 5) * 5, 10, 2000);
    if (!sv.__arrN) {
      sv.__arrN = true;
      const aX = ev => { const q = sv.createSVGPoint(); q.x = ev.clientX; q.y = ev.clientY; return q.matrixTransform(sv.getScreenCTM().inverse()); };
      sv.addEventListener("pointerdown", ev => { if (this.v !== 0 || !ev.target.closest("#hN")) return; sv.setPointerCapture(ev.pointerId); sv.__dN = true; ev.preventDefault(); this.N = this.invN(aX(ev).x); this.sigue(); });
      sv.addEventListener("pointermove", ev => { if (sv.__dN) { this.N = this.invN(aX(ev).x); this.sigue(); } });
      const fin = () => { sv.__dN = false; };
      sv.addEventListener("pointerup", fin); sv.addEventListener("pointercancel", fin);
      sv.addEventListener("keydown", ev => { if (this.v === 0 && ev.target.closest("#hN") && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(ev.key)) { ev.preventDefault(); const d = ev.key === "ArrowRight" || ev.key === "ArrowUp" ? 1 : -1; this.N = clamp(this.N + d * (ev.shiftKey ? 5 : 1) * 10, 10, 2000); this.pinta(); const h = $("#hN", sv); if (h) h.focus(); } });
    }
    const hd = $("#hN", sv); hd.setAttribute("tabindex", "0"); hd.setAttribute("role", "slider"); hd.setAttribute("aria-label", "Restaurantes gratuitos"); hd.setAttribute("aria-valuenow", N); hd.style.touchAction = "none";
    return {
      leyenda: `<span><i style="background:${C.rojo}"></i>sin anuncios: lo pones tú</span><span><i style="background:${C.vino}"></i>anuncios, tarifa baja</span><span><i style="background:${C.verde}"></i>tarifa media</span><span data-tip="${esc2("Adverso|la mitad de la tarifa baja|y anuncio sólo en el 30 % de las visitas: el caso en que los anuncios dejan menos")}" tabindex="0"><i style="background:${C.dorado}"></i>adverso</span><span class="radg" role="radiogroup" aria-label="Mi bolsa al mes">${[500, 1000, 2000, 5000].map(b => `<span class="rad${b === S.bolsa ? " on" : ""}" role="radio" aria-checked="${b === S.bolsa}" tabindex="0" data-bolsa="${b}"><i></i>Mi bolsa ${mxn(b)}</span>`).join("")}</span>`,
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
    b += `<line x1="${X0}" x2="${X0 + W}" y1="${Z}" y2="${Z}" stroke="${C.t2}" stroke-width="1.5"/>` + T(X0 - 8, Z + 4, "0", 11, C.t2, "end") + T(X0 - 8, Yb(top) + 8, n(top) + " MXN", 11, C.t2, "end");
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
    let b = T(30, 28, "De cada 100 MXN que entran, a dónde se van (1,000 restaurantes)", 14.5, C.vino, "start", 700);
    const filas = casos.map(([k, nm, col]) => { const e = ev3(S, k, 1000), t = e.ingresos.total || 1, p = v => 100 * v / t; return {k, nm, col, e, t, partes: [["Servidor", p(e.costos.servidor + e.costos.almacenamiento + e.costos.objetos), "#b9afa3"], ["Soporte", p(e.costos.soporte), "#d9cfc2"], ["Comisión", p(e.costos.comision), "#c9a9a6"], ["Reponer bajas", p(e.captacion.reposicion_de_bajas), C.arena]], mo: p(e.margen_operacion), mc: p(e.margen_despues_de_captacion), mn: p(e.margen_neto)}; });
    const mx = Math.max(100, ...filas.map(f => f.partes.reduce((a, q) => a + q[1], 0))), K = W / mx;
    b += `<rect x="${X0 + esc * K - 1}" y="52" width="2.4" height="${60 + filas.length * 118}" fill="${C.tinta}" opacity=".5"/>` + T(X0 + esc * K, 46, "100 MXN", 12, C.tinta, "middle", 700);
    filas.forEach((f, i) => {
      const y = 70 + i * 118; let x = X0;
      b += T(X0 - 14, y + 30, f.nm, 15, f.col, "end", 700);
      f.partes.forEach(([nm, v, col], j) => { const w = Math.max(0, v) * K; b += `<g class="gh" style="animation-delay:${j * 90}ms" data-tip="${esc2(nm + "|" + n(v, 1) + " de cada 100 pesos|" + (f.nm === "Peor" ? "Escenario peor." : f.nm === "Mejor" ? "Escenario mejor." : "Escenario recomendado."))}">${Rc(x, y, w, 44, col, 6)}</g>`; if (w > 54) b += T(x + w / 2, y + 27, `${n(v, 0)}`, 13, C.tinta, "middle", 700); x += w; });
      const mw = Math.max(0, 100 * K - (x - X0));
      if (f.mo >= 0) { b += `<g class="gh" style="animation-delay:360ms">${Rc(x, y, mw, 44, C.verde, 6)}</g>` + T(x + mw / 2, y + 27, `margen ${n(f.mo, 0)}`, 13, "#fff", "middle", 700); }
      else b += T(x + 12, y + 27, `faltan ${n(-f.mo, 0)}`, 13, C.rojo, "start", 700);
      const base0 = filas[1].e.margen_operacion, dl = f.k === "rec" ? "caso base" : `${f.e.margen_operacion >= base0 ? "+" : "−"}${n(Math.abs(f.e.margen_operacion - base0))} MXN frente al recomendado`;
      b += T(X0, y + 66, `Margen de operación (antes de captación, sueldos e impuestos): ${n(MOD.mensajes(config(S), sup(S)).margen.por_escenario[{peor: "peor", rec: "recomendado", mejor: "mejor"}[f.k]].por_cada_100.margen, 1)} de cada 100`, 12.5, C.t2) + T(X0, y + 88, `${fmP(f.e.margen_operacion)} al mes · ${dl}`, 14, f.col, "start", 700) + T(X0, y + 106, `Después de captación ${n(f.mc, 1)} · neto ${n(f.mn, 1)} (sueldos e impuestos valen cero: sin dato)`, 11.5, C.t2);
    });
    sv.innerHTML = b;
    const r = filas[1];
    return {
      leyenda: [["Servidor", "#b9afa3"], ["Soporte", "#d9cfc2"], ["Comisión de tarjeta", "#c9a9a6"], ["Reponer bajas", C.arena], ["Margen", C.verde]].map(([t, c]) => `<span><i style="background:${c}"></i>${t}</span>`).join(""),
      cifras: [[n(r.mo, 1), "pesos de cada 100 son margen de operación (recomendado)", "supuesto"], [n(r.mc, 1), "pesos de cada 100 después de captación", "supuesto"], [n(r.mn, 1), "pesos de cada 100 de margen neto (sueldos e impuestos valen cero: sin dato)", "supuesto"]],
      insight: MOD.mensajes(config(S), sup(S)).margen.frase,
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
      b += `<g data-tip="${esc2(f.que_es.charAt(0).toUpperCase() + f.que_es.slice(1) + "|mueve " + fmP(f.efecto) + " al mes|" + pal20("Cómo medirlo en el piloto: " + f.medir_en_el_piloto, 20))}">` + Rc(14, y - 4, 932, 52, i % 2 ? "rgba(0,0,0,0)" : C.a2, 14) + T(X0 - 14, y + 18, f.que_es.charAt(0).toUpperCase() + f.que_es.slice(1), 13, C.tinta, "end", 700) + T(X0 - 14, y + 36, "Cómo: " + f.medir_en_el_piloto, 11.5, C.t2, "end") + `<g class="gh" style="animation-delay:${i * 70}ms">${Rc(X0, y + 6, w, 26, i === 0 ? C.vino : C.dorado, 8)}</g>` + T(X0 + w + 10, y + 25, `mueve ${fmP(f.efecto)} al mes`, 13, C.tinta, "start", 700) + `</g>`;
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
  dos_planes: [{topeMesas: 5, topeCuentas: 1}, {topeMesas: 6, topeCuentas: 1}, {topeMesas: 6, topeCuentas: 2}, {topeMesas: 8, topeCuentas: 2}, {topeMesas: 10, topeCuentas: 3}],
  tope_platillos: [null, {topePlatillos: 200}, {topePlatillos: 300}, null],
  precios: [{precioServicio: 199}, {precioServicio: 225}, {precioServicio: 249}, {precioServicio: 299}],
  anuncios: [{mesAds: 3}, {mesAds: 9}, {mesAds: 99}],
  bolsa: [{bolsa: 500}, {bolsa: 1000}, {bolsa: 2000}, {bolsa: 5000}],
  historial: [{hist: 3, arch: true}, {hist: 12, arch: true}],
  soporte: [{soporte: 30}, {soporte: 60}, {soporte: 150}],
  avisos_reloj: [null, null],
};
const segC = (mesas, cuentas, plat) => 100 * chef05({...config(S), topes: {...config(S).topes, gratuito: {...config(S).topes.gratuito, mesas, cuentas}}});
const costoPl = () => conCache("costoPl", () => MOD.costoDePlatillo(config(S), sup(S)));
/* las cuatro opciones del tope de platillos, lado a lado: a cuántas cartas les cabe, cuántos pagan y lo técnico en llano */
function opcionesPlatillos() {
  const cp = costoPl(), f = cp.filas, f150 = f[f.length - 1], X0 = 2, CW = 214;
  const cols = [];
  f.forEach((q, i) => {
    let b = ""; const x = X0, on = S.topePlatillos === q.platillos, cb = q.cobertura_de_platillos, lo = 100 * cb.baja, hi = 100 * cb.alta, dp = q.clientes_de_paga_por_1000_por_el_tope - f150.clientes_de_paga_por_1000_por_el_tope;
    b += `<g data-tip="${esc2(`${q.platillos} platillos|caben ${n(lo)}–${n(hi)} % de las cartas|${n(q.clientes_de_paga_por_1000_por_el_tope)} de paga por 1,000; fotos ${n(q.fotos_en_r2.gb_por_restaurante, 2)} GB y menú de ${n(q.menu.json_bytes / 1000)} KB.`)}" tabindex="0">` + Rc(x, 4, CW, 292, on ? "#f6e9d4" : "#fff", 22, `stroke="${on ? C.vino : C.arena}" stroke-width="${on ? 3 : 1.5}"`);
    b += Rc(x + 14, 16, CW - 28, 32, on ? C.vino : C.dorado, 16) + T(x + CW / 2, 38, `${q.platillos} platillos`, 15, "#fff", "middle", 700);
    b += T(x + 16, 76, "cartas a las que les cabe", 11.5, C.t2, "start", 700) + Rc(x + 16, 84, CW - 32, 16, C.a2, 8) + Rc(x + 16 + (CW - 32) * cb.baja, 84, Math.max((CW - 32) * (cb.alta - cb.baja), 4), 16, C.vino, 8) + T(x + 16, 128, `${n(lo)}–${n(hi)} %`, 20, C.vino, "start", 400, true);
    b += T(x + 16, 148, "de paga por cada 1,000", 11.5, C.t2, "start", 700) + T(x + 16, 176, n(q.clientes_de_paga_por_1000_por_el_tope), 30, C.tinta, "start", 400, true) + (i < f.length - 1 ? T(x + 76, 174, `+${n(dp)} frente a ${f150.platillos}`, 12, C.verde, "start", 700) : T(x + 76, 174, "el tope de hoy", 12, C.t2, "start", 700));
    b += T(x + 16, 208, "disco: no cambia (" + n(q.base_de_datos.bytes_por_platillo) + " bytes c/u)", 11.5, C.tinta, "start", 700) + T(x + 16, 228, `fotos en R2: ${n(q.fotos_en_r2.gb_por_restaurante, 2)} GB por negocio`, 11.5, C.tinta, "start", 700) + T(x + 16, 248, `menú del teléfono: ${n(q.menu.json_bytes / 1000)} KB`, 11.5, C.tinta, "start", 700) + T(x + 16, 268, `procesador: casi nada (${n(100 * q.menu.parte_de_un_nucleo, 2)} %)`, 11.5, C.tinta, "start", 700) + `</g>`;
    cols.push(`<div class="viz"><svg viewBox="0 0 218 300" role="img" aria-label="${q.platillos} platillos" font-family="DM Sans, sans-serif">${b}</svg></div>`);
  });
  return `<div class="opl">${cols.join("")}</div><div class="seg">${f.map(q => `<button class="btn${S.topePlatillos === q.platillos ? " on" : ""}" data-aplica='${JSON.stringify({topePlatillos: q.platillos})}'>${S.topePlatillos === q.platillos ? "✓ " : "Probar "}${q.platillos}</button>`).join("")}</div>`;
}
const TARJ = {
  tope_platillos: {
    que: "Tope de platillos de Chef: por decidir (50, 80, 100 o 150; cuenta todo, decidido)",
    cif: () => { const f = costoPl().filas; return [`${n(f[f.length - 1].clientes_de_paga_por_1000_por_el_tope)} a ${n(f[0].clientes_de_paga_por_1000_por_el_tope)}`, "de paga por cada 1,000 restaurantes, de 150 a 50 platillos"]; },
    si: () => "El tope no es una decisión de servidores: el disco no se mueve y el procesador casi nada. Es de cuántos pagan y a cuántos les cabe la carta.",
    rec: -1,
  },
  dos_planes: {
    que: "Chef gratis (0 a 5 personas): 6 mesas, 1 cuenta, 150 platillos; el resto, Master Chef",
    cif: () => [n(segC(6, 1, 150), 1) + " %", "de los negocios de 0 a 5 personas cabe en Chef por mesas y cuentas (modelo; rango 42–55 %)"],
    si: () => `Con 2 cuentas queda ${n(segC(6, 2, 150), 1)} %: más gratuitos y un margen menor.`,
    rec: 1,
  },
  precios: {
    que: "Master Chef 225 MXN al mes (Chef Ejecutivo: futura escalación)",
    cif: () => [mxn(225), "pegado a Meniu Business (225 MXN)"],
    si: () => { const c = MOD.conversion(S.curva, 299, sup(S), "servicio"), c0 = MOD.conversion(S.curva, 225, sup(S), "servicio"); return `A 299 MXN pagaría ${n(100 * c)} % de los que se pasan de Chef, no ${n(100 * c0)} %.`; },
    rec: 1,
  },
  anuncios: {
    que: "Anuncios no personalizados en Chef desde el mes 9",
    cif: () => ["mes 9", "empiezan los anuncios (supuesto)"],
    si: () => `Sin anuncios, con 1,000 gratuitos pones ${fmP(MOD.todosGratuitos(config(S), sup(S), 1000).costo_sin_anuncios)} al mes de tu bolsa.`,
    rec: 1,
  },
  bolsa: {
    que: "Bolsa de 1,000 MXN al mes mientras no hay anuncios",
    cif: () => [n(MOD.capacidadConBolsa(config(S), sup(S), 1000).restaurantes), "restaurantes gratuitos típicos caben con esa bolsa (1,800 visitas al mes cada uno)"],
    si: () => `Con 500 MXN al mes caben ${n(MOD.capacidadConBolsa(config(S), sup(S), 500).restaurantes)} restaurantes.`,
    rec: 1,
  },
  historial: {
    que: "12 meses de historial en línea para Master Chef y 30 días para Chef (propuesta)",
    cif: () => ["12 meses", "Master Chef; Chef: 30 días (propuesta: hoy nada purga) y archivo descargable"],
    si: () => `Cada cliente de paga pesa ${n(evalS({...S, hist: 12}).capacidad.mb_por_restaurante.servicio)} MB con 12 meses y ${n(evalS({...S, hist: 3}).capacidad.mb_por_restaurante.servicio)} con 3.`,
    rec: 1,
  },
  soporte: {
    que: "Soporte por WhatsApp en horario hábil",
    cif: () => ["60 MXN", "al mes por cliente de paga"],
    si: () => `Con 150 MXN (alta hecha por nosotros) el margen baja de ${mp(motor({...S, soporte: 60}).margen)} a ${mp(motor({...S, soporte: 150}).margen)}.`,
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
  titulo: "Ocho decisiones: qué hacer, por qué y qué pasa si no.",
  fu: ["carta_precio", "carta_tres_planes", "carta_disco", "calvin_posturas"],
  nota: "Recomendaciones del análisis, no decisiones: las decide Calvin. Planes y precios son propuesta; la v1 no cobra. Cualquier palanca que cambia qué se guarda y por cuánto tiempo pasa antes por especificación y por actualizar 03 §7 (y un ADR si toca la regla de no borrar historial).",
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
      $("#r_" + r.id).innerHTML = `<div class="num">${k + 1}</div><h3>${esc(tj.que)}</h3><div class="por"><b>${esc(cif)}</b><span>${esc(sub)}</span></div><div class="si"><i>${r.id === "tope_platillos" ? "Qué mueve" : "Si no"}</i>${esc(tj.si())}</div>${r.id === "tope_platillos" ? opcionesPlatillos() : ""}<div class="acc2">${pr ? `<button class="btn${on ? " on" : ""}" data-aplica='${JSON.stringify(pr)}'>${on ? "✓ aplicado" : "Aplicar al escenario"}</button>` : ""}<button class="btn" data-mas="${r.id}" aria-expanded="false">ver más ›</button></div><div id="mas_${r.id}" hidden><div class="tarjetas" style="margin-top:10px">${r.alternativas.map(op).join("")}</div><div class="ejemplo"><b>Con un restaurante concreto:</b> ${esc(sinMd(r.ejemplo))}</div><div class="ejemplo" style="background:#f6e4e4"><b>De qué depende:</b> ${esc(sinMd(r.depende))}</div><p style="font-size:13px"><b>Prueba que lo cambiaría:</b> ${esc(sinMd(r.prueba))}</p></div>`;
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
DET.k_ingreso = cuentaDet("Un cliente de paga ingresa el precio de su plan cada mes.", ["carta_precio", "carta_tres_planes"], () => [[`${PLAN.paga} (11 a 100 personas)`, mxn(S.precioServicio) + " al mes"], [`${PLAN.ejec} (más de 100 personas; nombre propuesto)`, mxn(S.precioSalon) + " al mes"], ["Meseta del margen, curva " + S.curva, `${mxn(motor(S).meseta.desde)} a ${mxn(motor(S).meseta.hasta)}`], ["Corredor por sustituto", "249 MXN a 349 MXN"], ["Meniu, el sustituto más barato, cobra", "225 MXN"]], () => "El precio es propuesta: la v1 no cobra, y lo confirma el piloto con 10 restaurantes.");
DET.k_margen = cuentaDet("Tres márgenes con nombre: de operación, después de captación y neto.", ["carta_tres_planes", "carta_precio"], () => {
  const m = motor(S), e = m.ev; return [["Ingresos por suscripción", mxn(Math.round(e.ingresos.suscripcion))], ["Ingresos por anuncios (en régimen)", mxn(Math.round(e.ingresos.anuncios))], ["− Servidor y almacenamiento", "− " + n(e.costos.servidor + e.costos.almacenamiento + e.costos.objetos)], ["− Soporte", "− " + n(e.costos.soporte)], ["− Comisión de tarjeta", "− " + n(e.costos.comision)], ["= Margen de operación (sin captación ni sueldos)", mp(e.margen_operacion), true], ["− Reponer bajas (3 % al mes × costo de conseguir un cliente)", "− " + n(e.captacion.reposicion_de_bajas)], ["= Margen después de captación", mp(e.margen_despues_de_captacion), true], ["Margen neto (sueldos e impuestos valen cero: sin dato)", mp(e.margen_neto), true]];
}, () => "El margen de operación no incluye sueldos ni impuestos ni conseguir clientes; por eso se muestran los tres.");

document.addEventListener("click", ev => { const b = ev.target.closest(".rad[data-bolsa]"); if (b) cambiar({bolsa: +b.dataset.bolsa}); });
document.addEventListener("keydown", ev => { if (ev.key !== "Enter" && ev.key !== " ") return; const b = ev.target.closest && ev.target.closest(".rad[data-bolsa]"); if (b) { ev.preventDefault(); cambiar({bolsa: +b.dataset.bolsa}); } });

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
