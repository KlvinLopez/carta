/* ===== detalle: ¿Cómo se sostiene? (modelo de escenarios) ===== */
const margenEn = (s0, N) => evalS(s0, Math.max(1, N)).margen.pesos;
function proyecta(nivel, s0) {
  const [a, b] = M.metas[nivel], c = config(s0), s = {...sup(s0), meta_12_meses: a, meta_24_meses: b};
  return MOD.proyectar(c, s, 24, opcS(s0));
}
const fmP = x => (x < 0 ? "−" : "") + "$" + n(Math.abs(Math.round(x)));
DET.sostiene = {
  titulo: "¿Se sostiene? Con anuncios solos, sólo a escala; con clientes de paga, desde pocos.",
  fu: ["carta_tres_planes", "carta_planes", "carta_anuncios", "carta_mercado"],
  nota: "Modelo de escenarios (docs/research/2026-11-14-modelo-de-escenarios.mjs). Anuncios: la tarifa en México no está publicada; es supuesto y AdSense podría no aprobar el sitio. La curva de pago es supuesto: la sustituye la prueba del piloto.",
  montar(host) {
    this.vis = {peor: true, mejor: true, esp: true}; this.N = 300; this.nivel = "medio"; this.mes = 12;
    host.innerHTML = `<div class="viz"><svg id="svA" viewBox="0 0 960 430" role="img" font-family="DM Sans, sans-serif"></svg></div><div class="viz" style="margin-top:12px"><svg id="svB" viewBox="0 0 960 540" role="img" font-family="DM Sans, sans-serif"></svg></div><div class="viz" style="margin-top:12px"><svg id="svC" viewBox="0 0 960 560" role="img" font-family="DM Sans, sans-serif"></svg></div>`;
    this.svC = $("#svC", host);
    this.svC.addEventListener("click", ev => { const t = ev.target.closest("[data-sens]"); if (!t) return; const k = t.dataset.sens, f = (S.ajustes || {})[k] || 1, sig = f === 1 ? 0.5 : f === 0.5 ? 1.5 : 1; cambiar({ajustes: {...(S.ajustes || {}), [k]: sig}}); });
    this.svC.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { const t = ev.target.closest("[data-sens]"); if (t) { ev.preventDefault(); t.dispatchEvent(new MouseEvent("click", {bubbles: true})); } } });
    this.svA = $("#svA", host); this.svB = $("#svB", host);
    const clic = ev => { const t = ev.target.closest("[data-v]"); if (!t) return; const v = t.dataset.v; if (["peor", "mejor", "esp"].includes(v)) this.vis[v] = !this.vis[v]; else this.nivel = v; refrescar(); };
    this.svA.addEventListener("click", clic); this.svB.addEventListener("click", clic);
    this.svB.addEventListener("pointermove", ev => { const p = this.svB.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(this.svB.getScreenCTM().inverse()); const t = clamp(Math.round((q.x - 70) / 840 * 23) + 1, 1, 24); if (t !== this.mes) { this.mes = t; this.pintaB(); } });
  },
  actualizar() {
    this.pintaA(); this.pintaB(); this.pintaC();
    const m = motor(S), pz = proyecta(this.nivel, S), peor = {...S, caso: "peor"};
    const eqN = (s0) => { for (let N = 1; N <= 5000; N += 25) if (margenEn(s0, N) >= 0) return N; return null; };
    const ePeor = eqN(peor);
    return {
      leyenda: `<span><i style="background:${C.rojo}"></i>peor (firme): todos gratuitos, sin anuncios</span><span><i style="background:${C.verde}"></i>mejor: todos pagan</span><span><i style="background:${C.vino}"></i>esperado: curva ${S.curva}, con su rango</span>`,
      cifras: [[mp(m.margen), "margen de operación al mes con 1,000 restaurantes (sin captación ni sueldos)", "supuesto"], [mp(m.margenCapt), "margen después de captación: reponer las bajas con el costo de conseguir un cliente", "supuesto"], [mp(m.margenNeto), "margen neto (con sueldos e impuestos; hoy valen cero: sin dato)", "supuesto"], [ePeor ? n(ePeor) : "no se sostiene", "restaurantes gratuitos para sostenerse sin clientes de paga (peor caso firme, sin anuncios)", "supuesto"], [m.eq == null ? "—" : n(m.eq, 1), "clientes de paga por cada 1,000 que cubren el costo de operación", "supuesto"], [pz.mes_primer_margen_positivo ? "mes " + pz.mes_primer_margen_positivo : "—", "primer mes con margen positivo (escenario esperado)", "supuesto"]],
      insight: ePeor ? `Sin clientes de paga y sin anuncios Carta se sostiene sólo desde ≈ ${n(ePeor)} restaurantes; con clientes de paga, el costo de operación se cubre con ${m.eq == null ? "—" : n(m.eq, 1)} por cada 1,000.` : `Sin clientes de paga y sin anuncios Carta no se sostiene dentro de 5,000 restaurantes: necesita clientes de paga (${m.eq == null ? "—" : n(m.eq, 1)} por cada 1,000 cubren la operación).`,
    };
  },
  pintaA() {
    const sv = this.svA, X0 = 70, W = 840, Y0 = 70, H = 280, pasos = [], S0 = {...S, caso: "esperado"};
    for (let N = 1; N <= 1000; N += 20) pasos.push(N);
    pasos.push(1000);
    const sl = v => Math.asinh(v / 1500), vmin = -3000, vmax = 400000;
    const X = N => X0 + W * N / 1000, Y = v => Y0 + H * (sl(vmax) - sl(clamp(v, vmin, vmax))) / (sl(vmax) - sl(vmin));
    let b = T(30, 24, "Resultado al mes (pesos) según cuántos restaurantes se registran", 14.5, C.vino, "start", 700);
    [-3000, 0, 3000, 10000, 30000, 100000, 300000].forEach(v => { b += `<line x1="${X0}" x2="${X0 + W}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v === 0 ? C.t2 : C.arena}"/>` + T(X0 - 8, Y(v) + 4, (v < 0 ? "−" : "") + n(Math.abs(v)), 11, C.t2, "end"); });
    b += T(X0 + W, Y0 - 8, "escala logarítmica en ambos sentidos", 10.5, C.t2, "end");
    [0, 250, 500, 750, 1000].forEach(N => { b += T(X(N), Y0 + H + 20, String(N), 11.5, C.t2, "middle"); });
    b += T(X0 + W / 2, Y0 + H + 40, "restaurantes registrados", 12, C.t2, "middle");
    const serie = (s0) => pasos.map(N => [N, margenEn(s0, N)]);
    const linea = (pts, col, w) => `<polyline points="${pts.map(([N, v]) => `${X(N).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")}" fill="none" stroke="${col}" stroke-width="${w}"/>`;
    const eq = (pts, col, dy) => { for (let i = 1; i < pts.length; i++) if (pts[i - 1][1] < 0 && pts[i][1] >= 0) { const [n0, v0] = pts[i - 1], [n1, v1] = pts[i], Nq = n0 + (n1 - n0) * (-v0) / (v1 - v0); return `<circle cx="${X(Nq)}" cy="${Y(0)}" r="7" fill="${col}" stroke="#fff" stroke-width="2"/>${T(X(Nq) + 10, Y(0) + dy, "equilibrio: " + n(Nq), 11.5, col, "start", 700)}`; } return ""; };
    const pPeor = serie({...S, caso: "peor"}), pMejor = serie({...S, caso: "mejor"}), pEsp = serie(S0), pLo = serie({...S0, curva: "pesimista"}), pHi = serie({...S0, curva: "optimista"});
    if (this.vis.esp) b += `<polygon points="${pLo.map(([N, v]) => `${X(N).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")} ${[...pHi].reverse().map(([N, v]) => `${X(N).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")}" fill="${C.vino}" opacity=".16"/>` + linea(S.caso === "esperado" ? pEsp : serie({...S, caso: "esperado"}), C.vino, 4) + eq(pEsp, C.vino, 22);
    if (this.vis.peor) b += linea(pPeor, C.rojo, 3) + eq(pPeor, C.rojo, -12);
    if (this.vis.mejor) b += linea(pMejor, C.verde, 3) + eq(pMejor, C.verde, -12);
    const N = this.N;
    b += `<line x1="${X(N)}" x2="${X(N)}" y1="${Y0}" y2="${Y0 + H}" stroke="${C.tinta}" stroke-width="1.5" stroke-dasharray="4 3"/><g data-drag="1" id="hN"><circle cx="${X(N)}" cy="${Y0 + H}" r="13" fill="${C.tinta}" stroke="#fff" stroke-width="3"/></g>`;
    [["peor", C.rojo, "Peor (firme)"], ["esp", C.vino, "Esperado"], ["mejor", C.verde, "Mejor caso"]].forEach(([k, c, nom], i) => { b += `<g data-v="${k}" style="cursor:pointer" opacity="${this.vis[k] ? 1 : 0.4}" tabindex="0" role="button" aria-pressed="${this.vis[k]}"><rect x="${600 + i * 110}" y="8" width="102" height="24" rx="12" fill="${c}"/>${T(651 + i * 110, 25, nom, 12.5, "#fff", "middle", 700)}</g>`; });
    b += T(X0, 52, `Con ${n(N)} restaurantes: peor ${fmP(margenEn({...S, caso: "peor"}, N))} · esperado ${fmP(margenEn(S0, N))} · mejor ${fmP(margenEn({...S, caso: "mejor"}, N))}`, 13, C.tinta, "start", 700);
    sv.innerHTML = b;
    const hd = $("#hN", sv);
    arrastrable(hd, sv, pt => { this.N = clamp(Math.round((pt.x - X0) / W * 1000 / 10) * 10, 10, 1000); this.pintaA(); }, (d, mult) => { this.N = clamp(this.N + d * mult * 10, 10, 1000); this.pintaA(); });
    hd.setAttribute("aria-label", "Restaurantes registrados"); hd.setAttribute("aria-valuenow", N);
  },
  pintaC() {
    const sv = this.svC, m = motor(S), se = MOD.sensibilidad(config(S), sup(S), 1000, {curva: S.curva}), filas = se.filas.slice(0, 12), X0 = 330, W = 560, base = se.base;
    const lo = Math.min(...filas.map(f => f.rango[0])), hi = Math.max(...filas.map(f => f.rango[1])), X = v => X0 + W * (v - lo) / Math.max(hi - lo, 1);
    let b = T(30, 24, "¿Qué supuesto mueve más el resultado? Margen de operación con 1,000 restaurantes", 14.5, C.vino, "start", 700);
    b += T(30, 44, "Cada barra va de la mitad a una vez y media del supuesto. Toca una barra: ajusta ese supuesto (×0.5, ×1.5, normal).", 12, C.t2);
    filas.forEach((f, i) => {
      const y = 64 + i * 38, aj = (S.ajustes || {})[f.supuesto] || 1;
      b += T(X0 - 12, y + 20, f.supuesto, 12.5, C.tinta, "end", aj === 1 ? 400 : 700) + Rc(X0, y + 4, W, 24, C.a2, 6, "") + `<g data-sens="${esc(f.supuesto)}" style="cursor:pointer" tabindex="0" role="button" aria-label="Ajustar ${esc(f.supuesto)}">` + Rc(X(f.rango[0]), y + 4, Math.max(X(f.rango[1]) - X(f.rango[0]), 3), 24, aj === 1 ? C.vino : C.dorado, 6) + Rc(X0 - 330, y, W + 330, 34, "rgba(0,0,0,0)", 6) + `</g>` + (X(f.rango[1]) > X0 + W - 150 ? T(X(f.rango[0]) - 8, y + 21, `${mp(f.rango[0])} a ${mp(f.rango[1])}`, 11.5, C.t2, "end") : T(X(f.rango[1]) + 8, y + 21, `${mp(f.rango[0])} a ${mp(f.rango[1])}`, 11.5, C.t2)) + (aj !== 1 ? T(X0 + W + 10, y + 21, "×" + aj, 12, C.dorado, "start", 700) : "");
    });
    b += `<line x1="${X(base)}" x2="${X(base)}" y1="58" y2="${64 + filas.length * 38}" stroke="${C.tinta}" stroke-width="1.5" stroke-dasharray="4 3"/>` + T(X(base) + 6, 56, "ahora: " + mp(base), 12, C.tinta, "start", 700);
    if (Object.keys(S.ajustes || {}).some(k => S.ajustes[k] && S.ajustes[k] !== 1)) b += `<g data-limpia="1" style="cursor:pointer" tabindex="0" role="button"><rect x="780" y="6" width="150" height="26" rx="13" fill="${C.dorado}"/>${T(855, 24, "Quitar ajustes", 12.5, "#fff", "middle", 700)}</g>`;
    sv.innerHTML = b;
    const q = $("[data-limpia]", sv); if (q) q.onclick = () => cambiar({ajustes: {}});
  },
  pintaB() {
    const sv = this.svB, pz = proyecta(this.nivel, {...S, caso: "esperado"}), filas = pz.filas, X0 = 70, W = 840, X = t => X0 + W * (t - 1) / 23;
    const maxR = Math.max(...filas.map(r => r.restaurantes), 1), Ya = r => 80 + 150 * (1 - r / maxR);
    let b = T(30, 24, "Crecimiento mes a mes (meta del estudio de mercado) · escenario esperado", 14.5, C.vino, "start", 700);
    [["bajo", "Bajo"], ["medio", "Medio"], ["alto", "Alto"]].forEach(([k, nom], i) => { b += `<g data-v="${k}" style="cursor:pointer" tabindex="0" role="button" aria-pressed="${this.nivel === k}"><rect x="${640 + i * 100}" y="8" width="92" height="24" rx="12" fill="${this.nivel === k ? C.vino : C.arena}"/>${T(686 + i * 100, 25, nom, 12.5, this.nivel === k ? "#fff" : C.t2, "middle", 700)}</g>`; });
    // franjas por escalón de servidor
    const esc = []; filas.forEach(r => { const u = esc[esc.length - 1]; if (!u || u.id !== r.escalon) esc.push({id: r.escalon, ini: r.mes, fin: r.mes}); else u.fin = r.mes; });
    const colEsc = ["#f3eadb", "#ead9d0", "#e3cbc6", "#dbbcbc", "#d3aeb3"];
    esc.forEach((e, i) => { const nom = (SP.escalones.find(x => x.id === e.id) || {nombre: e.id}).nombre.replace("Con eventos, ", ""); b += Rc(X(e.ini) - (e.ini === 1 ? 0 : W / 46), 50, X(e.fin) - X(e.ini) + (e.ini === 1 ? W / 46 : W / 23), 190, colEsc[i % colEsc.length], 0) + T(X(e.ini) + 6, 66, nom, 11.5, C.osc, "start", 700); if (i > 0) b += T(X(e.ini) + 6, 82, "mes " + e.ini + ": subir de escalón", 11, C.rojo, "start", 700); });
    const ext = filas.filter(r => r.requiere_arquitectura || r.extrapolacion_sin_medir);
    if (ext.length) b += `<defs><pattern id="ray" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="8" fill="${C.rojo}" opacity=".35"/></pattern></defs>` + Rc(X(ext[0].mes) - W / 46, 50, X(24) - X(ext[0].mes) + W / 46, 190, "url(#ray)", 0) + T(X(ext[0].mes) + 6, 98, "extrapolación sin medir (más de ≈ 2,030 restaurantes)", 11.5, C.rojo, "start", 700);
    [0, maxR / 2, maxR].forEach(v => { b += `<line x1="${X0}" x2="${X0 + W}" y1="${Ya(v)}" y2="${Ya(v)}" stroke="${C.arena}"/>` + T(X0 - 8, Ya(v) + 4, n(v), 11, C.t2, "end"); });
    b += `<polyline points="${filas.map(r => `${X(r.mes)},${Ya(r.restaurantes)}`).join(" ")}" fill="none" stroke="${C.vino}" stroke-width="4"/>` + T(X0 + W, 252, "restaurantes registrados (línea) y escalón del servidor (franjas)", 11.5, C.t2, "end");
    [1, 6, 12, 18, 24].forEach(t => { b += T(X(t), 268, "mes " + t, 11.5, C.t2, "middle"); });
    const yb0 = 400, hb = 110, mxv = Math.max(...filas.map(r => Math.max(r.ingresos, r.costos, Math.abs(r.margen))), 1), Yb = v => yb0 + hb * (1 - v / mxv);
    b += T(30, 306, "Ingresos, costos y margen al mes (pesos)", 13.5, C.vino, "start", 700);
    filas.forEach(r => { const x = X(r.mes) - 11; b += Rc(x, Yb(r.ingresos), 10, yb0 + hb - Yb(r.ingresos), C.vino, 2) + Rc(x + 11, Yb(r.costos), 10, yb0 + hb - Yb(r.costos), C.gris, 2); });
    b += `<polyline points="${filas.map(r => `${X(r.mes)},${Yb(Math.max(r.margen, 0))}`).join(" ")}" fill="none" stroke="${C.verde}" stroke-width="3"/>` + T(X0 - 8, Yb(mxv) + 8, "$" + n(mxv), 11, C.t2, "end") + T(X0 - 8, yb0 + hb, "0", 11, C.t2, "end");
    const r = filas[this.mes - 1];
    b += `<line x1="${X(this.mes)}" x2="${X(this.mes)}" y1="50" y2="${yb0 + hb}" stroke="${C.tinta}" stroke-width="1.2" stroke-dasharray="3 3"/>`;
    b += T(X0 + W, 42, `Mes ${r.mes}: ${n(r.restaurantes)} restaurantes (${n(r.pagantes, 1)} de paga) · ${n(r.comensales_mes)} comensales al mes`, 12.5, C.tinta, "end", 700);
    b += T(X0 + W, yb0 + hb + 24, `Mes ${r.mes}: ingreso ${fmP(r.ingresos)} · costo ${fmP(r.costos)} · margen ${fmP(r.margen)}`, 12.5, C.tinta, "end", 700);
    b += `<rect x="${X0}" y="${yb0 + hb + 34}" width="12" height="12" rx="3" fill="${C.vino}"/>${T(X0 + 18, yb0 + hb + 45, "ingresos", 11.5, C.t2)}<rect x="${X0 + 90}" y="${yb0 + hb + 34}" width="12" height="12" rx="3" fill="${C.gris}"/>${T(X0 + 108, yb0 + hb + 45, "costos", 11.5, C.t2)}<rect x="${X0 + 170}" y="${yb0 + hb + 34}" width="12" height="12" rx="3" fill="${C.verde}"/>${T(X0 + 188, yb0 + hb + 45, "margen (si es positivo)", 11.5, C.t2)}`;
    sv.innerHTML = b;
  },
};

/* ===== Recomendaciones (sesión de análisis: recomendaciones.json) ===== */
const sinMd = t => String(t).replace(/\*\*/g, "").replace(/\*/g, "");
const PARCHES = {
  precio: [{precioServicio: 249, sustituto: "Meniu Business", K: 0.5}, {precioServicio: 299, sustituto: "Fudo Avanzado", K: 0.5}, {precioServicio: 349, sustituto: "Fudo Avanzado + módulo de mesas", K: 0.5}, {precioServicio: 449, sustituto: "Fudo Avanzado", K: 0.7}],
  topes: TCUPO.map(r => ({cupo: r.cupo_gratis_minimo, topeMesas: r.mesas, topeCuentas: r.cuentas, topePlatillos: r.platillos})),
  historial: [{hist: 1}, {hist: 3}, {hist: 12}],
  soporte: [{soporte: 30}, {soporte: 60}, {soporte: 150}],
  anuncios: [{anunciosAprob: false}, {anunciosAprob: true}, null], // los personalizados chocan con la regla dura 10: no se aplican
  avisos_reloj: [null, null],
};
const CIFRA_REC = {
  precio: () => { const me = motor(PRESETS.rec).meseta; return [`${mxn(me.desde)}–${mxn(me.hasta)}`, "meseta del margen con la curva media; el corredor por sustituto es $249–$349 y se lanza en $299"]; },
  topes: () => [n(100 - 100 * MOD.parteRebasa(config(PRESETS.rec), SP), 1) + " %", "de los negocios queda dentro del plan Chef con 10 mesas, 3 cuentas y 80 platillos"],
  historial: () => ["12 meses", "de historial en línea para Master Chef; 30 días para Chef"],
  soporte: () => ["$60", "al mes por cliente de paga (30 minutos de soporte)"],
  anuncios: () => ["$0", "hoy no hay anuncios: falta aprobación y abrir la política de seguridad del sitio"],
  avisos_reloj: () => ["0", "avisos de reloj desde el servidor: los relojes viven en el teléfono"],
};
const aplicadaP = p => p && Object.entries(p).every(([k, v]) => S[k] === v);
DET.recomendaciones = {
  titulo: "Seis recomendaciones: aplica una al escenario y mira cómo cambian las cifras.",
  fu: ["carta_precio", "carta_tres_planes", "carta_disco", "calvin_posturas"],
  nota: "Recomendaciones del análisis, no decisiones: las decide Calvin. Planes y precios son propuesta; la v1 no cobra. «Chef Ejecutivo» es nombre propuesto.",
  montar(host) { host.innerHTML = REC.decisiones.map(r => `<div class="rcard" id="r_${r.id}"></div>`).join(""); },
  actualizar() {
    REC.decisiones.forEach(r => {
      const parches = PARCHES[r.id] || [], [cif, sub] = (CIFRA_REC[r.id] || (() => ["", ""]))();
      const op = (a, i) => {
        const rec = /recomendad/.test(a.opcion) || (r.id === "topes" && i === 1), p = parches[i], on = aplicadaP(p);
        return `<div class="opcion${rec ? " rec" : ""}"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h4>${esc(a.opcion.replace(/ ?\((.*?)recomendad[oa](.*?)\)/, ""))}</h4>${rec ? '<span class="et prop">recomendado</span>' : ""}</div><ul><li class="pro">+ ${esc(sinMd(a.pros))}</li><li class="con">− ${esc(sinMd(a.contras))}</li></ul>${p ? `<button class="btn${on ? " on" : ""}" data-aplica='${JSON.stringify(p)}'>${on ? "✓ aplicado" : rec ? "Aplicar al escenario" : "Probar esta"}</button>` : `<small class="nota">No cambia las cifras del modelo</small>`}</div>`;
      };
      $("#r_" + r.id).innerHTML = `<h3>${esc(r.decision)}</h3><div class="porque"><b>${esc(cif)}</b><span>${esc(sub)}</span></div><div class="tarjetas">${r.alternativas.map(op).join("")}</div><div class="ejemplo"><b>Con un restaurante concreto:</b> ${esc(sinMd(r.ejemplo))}</div><div class="ejemplo" style="background:#f6e4e4"><b>De qué depende y qué pasa si falla:</b> ${esc(sinMd(r.depende))}</div><details style="margin-top:8px"><summary style="cursor:pointer;font-weight:700;color:var(--vino2)">La recomendación, las cifras y la prueba</summary><p style="font-size:13.5px">${esc(sinMd(r.recomendacion))}</p><p style="font-size:13px;color:var(--tinta2)">${esc(sinMd(r.cifras))}</p><p style="font-size:12.5px"><b>Prueba que lo cambiaría:</b> ${esc(sinMd(r.prueba))}</p></details>`;
    });
    const m = motor(S);
    return {cifras: [[n(m.caben), "restaurantes caben con el escenario activo"], [mxn(S.precioServicio), "Master Chef al mes", "propuesta"], [mp(m.margen), "margen de operación con 1,000 restaurantes", "supuesto"], [emTxt(m), "se pasa del plan Chef", "supuesto"]], insight: "Aplica una recomendación y las cifras de arriba cambian al instante; «Mi escenario» guarda tu combinación."};
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
DET.k_potenciales = cuentaDet("Clientes potenciales (SAM): ≈ 100,000 restaurantes y bares sin cadenas.", ["inegi_denue", "carta_mercado"], () => [
  ["Mercado total (TAM): restaurantes y bares de México", n(M.total)], ["− Fuera de lo que Carta atiende hoy (fondas para llevar, tacos, mariscos, cafeterías)", "− " + n(M.total - M.nucleo)], ["= Restaurantes a la carta, comida corrida y bares", n(M.nucleo), true],
  ["− Posibles cadenas (nombre repetido; casi ninguna lo es)", "− " + n(M.nucleo - M.servible)], ["= Clientes potenciales (SAM)", "≈ " + n(M.servible), true], ["Rango según el umbral de cadena", n(M.servible_rango[0]) + " a " + n(M.servible_rango[1])], ["Meta a 12 meses (SOM): escenario del modelo", n(SP.meta_12_meses) + " restaurantes (1,200 a 24 meses)"]], () => "El mercado no es el límite: lo es cuántos dueños prueban Carta y cuántos pagan.");
DET.k_caben = cuentaDet("Cuántos restaurantes caben: lo decide el recurso que se llena primero.", ["carta_anuncios", "carta_capacidad", "railway_limites"], () => {
  const m = motor(S); return [["Escalón del servidor", nomServ(m) + " · hasta " + m.usd + " USD al mes"], ["Mezcla del escenario: clientes de paga por 1,000", n(1000 * m.f, 1)], ...m.lim.map(([nom, v]) => [`Límite por ${nom}`, n(v)]), [`Cabe el menor: ${m.cuello}`, n(m.caben) + " restaurantes", true]];
}, () => "Cambia el servidor y las palancas en «¿Qué llena el disco?» y esta cifra se recalcula.");
DET.k_sostiene = cuentaDet("Un cliente de paga sostiene el costo de decenas de clientes gratuitos.", ["carta_planes", "carta_precio"], () => {
  const m = motor(S), pc = m.ev.por_cliente, neto = pc.costo_gratuito - pc.ingreso_gratuito;
  return [[`Ingreso por cliente de ${PLAN.paga}`, mxn(pc.ingreso_servicio)], ["− Costo de atenderlo (servidor, soporte y comisión de tarjeta)", "− " + n(pc.costo_servicio, 1)], ["= Margen por cliente de paga", mxn(Math.round(pc.margen_servicio)), true], ["Costo de un cliente gratuito (servidor y soporte)", mxn(Math.round(pc.costo_gratuito * 100) / 100)], ["− Lo que deja en anuncios (hoy $0: no hay anuncios)", "− " + n(pc.ingreso_gratuito, 2)], ["= Costo neto de un gratuito", neto <= 0 ? "se paga solo" : mxn(Math.round(neto * 100) / 100), true], ["Gratuitos que sostiene cada cliente de paga", m.sePagaSolo ? "todos: se pagan solos" : n(m.sostiene), true], ["Sin contar anuncios", m.sostieneSinAds == null ? "—" : n(m.sostieneSinAds)]];
}, () => "Con anuncios, cada gratuito podría pagarse solo; los anuncios hoy no existen, así que la cifra firme es la de sin anuncios.");
DET.k_anuncios = cuentaDet("Hoy un cliente gratuito deja $0 en anuncios: no hay anuncios.", ["carta_anuncios"], () => {
  const t = SP.anuncio_pesos_por_mil, v = SP.visitas_app_gratuito, p = SP.parte_visitas_con_anuncio;
  return [["Estado de los anuncios", "no aprobados ni construidos"], ["Visitas con la app al mes de un gratuito típico", n(v)], ["Parte de las visitas que ven anuncio (supuesto)", n(100 * p) + " %"], ...["baja", "media", "alta"].map(k => [`Si se aprueban, tarifa ${k}: ${mxn(t[k])} por mil visitas`, mxn(Math.round(t[k] * v * p / 100) / 10) + " al mes"]), ["Escenario activo", S.anunciosAprob ? "con anuncios (condicional): " + mxn(Math.round(motor(S).ingGrat * 10) / 10) + " al mes" : "sin anuncios: $0", true]];
}, () => "Para tenerlos hace falta un ADR, abrir la política de seguridad del sitio, cambiar el aviso de privacidad y que AdSense los apruebe. Se activan arriba en la barra de escenario, como condicional.");
DET.k_ingreso = cuentaDet("Un cliente de paga ingresa el precio de su plan cada mes.", ["carta_precio", "carta_tres_planes"], () => [[`${PLAN.paga} (11 a 40 mesas)`, mxn(S.precioServicio) + " al mes"], [`${PLAN.ejec} (más de 40 mesas; nombre propuesto)`, mxn(S.precioSalon) + " al mes"], ["Meseta del margen, curva " + S.curva, `${mxn(motor(S).meseta.desde)} a ${mxn(motor(S).meseta.hasta)}`], ["Corredor por sustituto", "$249 a $349"], ["Meniu, el sustituto más barato, cobra", "$225"]], () => "El precio es propuesta: la v1 no cobra, y lo confirma el piloto con 10 restaurantes.");
DET.k_margen = cuentaDet("Tres márgenes con nombre: de operación, después de captación y neto.", ["carta_tres_planes", "carta_precio"], () => {
  const m = motor(S), e = m.ev; return [["Ingresos por suscripción", mxn(Math.round(e.ingresos.suscripcion))], ["Ingresos por anuncios (hoy $0)", mxn(Math.round(e.ingresos.anuncios))], ["− Servidor y almacenamiento", "− " + n(e.costos.servidor + e.costos.almacenamiento + e.costos.objetos)], ["− Soporte", "− " + n(e.costos.soporte)], ["− Comisión de tarjeta", "− " + n(e.costos.comision)], ["= Margen de operación (sin captación ni sueldos)", mp(e.margen_operacion), true], ["− Reponer bajas (3 % al mes × costo de conseguir un cliente)", "− " + n(e.captacion.reposicion_de_bajas)], ["= Margen después de captación", mp(e.margen_despues_de_captacion), true], ["Margen neto (sueldos e impuestos valen cero: sin dato)", mp(e.margen_neto), true]];
}, () => "El margen de operación no incluye sueldos ni impuestos ni conseguir clientes; por eso se muestran los tres.");

/* ===== presentación breve (≤ 30 s, se puede saltar, no se repite sola) ===== */
const SLIDES = [
  ["El problema", `El comensal ya está conectado. <em>94 de cada 100</em> restaurantes a la carta y bares no declara sitio web.`, "Sólo 5.9 % de 104,882 negocios declara sitio. Fuente: INEGI, 2026 (cálculo propio)."],
  ["Lo que hace Carta", `Sube tu carta en PDF y en minutos tienes un <em>menú visual por QR</em>; la mesa arma su orden junta y el mesero la recibe.`, "Hoy: menú por QR en producción. Orden en grupo y mesero: Fase 3, aún no construida."],
  ["La oportunidad", `<em>≈ 100,000</em> clientes potenciales. La meta: 300 restaurantes en un año y 1,200 en dos.`, "Análisis: la meta es un escenario, no un dato. Fuente: Carta, mercado 2026."],
  ["Cómo gana dinero", `Chef es gratis y deja anuncios; Master Chef cuesta <em>$299</em> al mes.`, "Propuesta: la v1 no cobra. Nunca se venden datos de comensales ni de restaurantes."],
  ["Qué decides hoy", `<em>Seis recomendaciones</em> y un escenario que ves cambiar al instante.`, "Precio, límites de Chef, historial, soporte, anuncios y relojes."],
];
let introT = null, introI = 0;
function cerrarIntro() { clearTimeout(introT); $("#intro").hidden = true; document.body.style.overflow = ""; try { localStorage.setItem("carta-v5-intro", "1"); } catch (e) { /* ignorar */ } }
function mostrarSlide(i) {
  clearTimeout(introT); introI = i;
  if (i >= SLIDES.length) { cerrarIntro(); return; }
  $$("#intro .sl").forEach((s, k) => s.classList.toggle("on", k === i));
  $$("#intro .barras i").forEach((b, k) => { b.className = k < i ? "hecha" : ""; });
  const act = $$("#intro .barras i")[i]; void act.offsetWidth; act.className = REDUCE ? "hecha" : "act";
  if (!REDUCE) introT = setTimeout(() => mostrarSlide(i + 1), 5500);
}
function abrirIntro() {
  const el = $("#intro");
  el.innerHTML = `<button class="btn skip" data-intro="saltar">Saltar ✕</button>` + SLIDES.map(([k, h, c]) => `<div class="sl"><div class="kick" style="color:#d9b9c1">${k}</div><h2 class="g">${h}</h2><p class="ci">${c}</p></div>`).join("") + `<div class="barras">${SLIDES.map(() => "<i><b></b></i>").join("")}<button class="btn" data-intro="sig" style="margin-left:10px">Siguiente →</button></div>`;
  el.hidden = false; document.body.style.overflow = "hidden"; mostrarSlide(0);
  el.onclick = ev => { const b = ev.target.closest("[data-intro]"); if (!b) return; if (b.dataset.intro === "saltar") cerrarIntro(); else mostrarSlide(introI + 1); };
}

/* ===== arranque ===== */
function actualizaCajas() { $$("#grid .box:not(.rec)").forEach((b, i) => { const c = CAJAS[i].c; $(".c", b).textContent = typeof c === "function" ? c() : c; }); }
function todo() { pintaEscenario(); pintaKpis(); actualizaCajas(); refrescar(); }
pintaCajas(); todo();
oyentes.push(todo);
$("#verIntro").addEventListener("click", abrirIntro);
$("#pantallaTop").innerHTML = BTN_PANTALLA;
const h0 = location.hash.slice(1);
if (h0 && DET[h0]) abre(h0, false);
else { let visto = false; try { visto = localStorage.getItem("carta-v5-intro") === "1"; } catch (e) { /* ignorar */ } if (!visto && !location.search.includes("nointro")) abrirIntro(); }
