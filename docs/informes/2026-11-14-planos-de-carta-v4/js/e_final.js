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
/* tarjetas: qué hacer (5 a 8 palabras), por qué (una cifra), qué pasa si no (una línea); lo demás, detrás de «ver más» */
const TARJ = {
  precio: {
    que: "Master Chef a $299 al mes",
    cif: () => { const me = motor(PRESETS.rec).meseta; return [`${mxn(me.desde)}–${mxn(me.hasta)}`, "meseta del margen"]; },
    si: () => { const c = MOD.conversion(S.curva, 449, sup(S)), c0 = MOD.conversion(S.curva, 299, sup(S)); return `A $449 pagaría ${n(100 * c)} % de los que se pasan de Chef, no ${n(100 * c0)} %.`; },
    rec: 1,
  },
  topes: {
    que: "Chef: 10 mesas, 3 cuentas, 80 platillos",
    cif: () => [n(100 * MOD.parteRebasa(config(PRESETS.rec), SP), 1) + " %", "se pasa del plan Chef"],
    si: () => `Con topes de 80 % de cupo caben ${n(motor({...S, ...PARCHES.topes[PARCHES.topes.length - 1]}).caben)} restaurantes, no ${n(motor(PRESETS.rec).caben)}.`,
    rec: 1,
  },
  historial: {
    que: "12 meses de historial en línea para Master Chef",
    cif: () => ["12 meses", "Chef: 30 días"],
    si: () => `Con 1 mes caben ${n(motor({...S, hist: 1}).caben)}; con 12, ${n(motor({...S, hist: 12}).caben)}.`,
    rec: 2,
  },
  soporte: {
    que: "30 minutos de soporte al mes por cliente de paga",
    cif: () => ["$60", "al mes por cliente de paga"],
    si: () => `Con $150 el margen baja de ${mp(motor({...S, soporte: 60}).margen)} a ${mp(motor({...S, soporte: 150}).margen)}.`,
    rec: 1,
  },
  anuncios: {
    que: "Anuncios no personalizados en Chef, cuando se aprueben",
    cif: () => ["$0", "hoy: no hay anuncios"],
    si: () => { const m = motor({...S, caso: "esperado", anunciosAprob: false}); return `Sin anuncios, cada cliente de paga sostiene ${m.sostieneSinAds == null ? "—" : n(m.sostieneSinAds)} gratuitos.`; },
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

/* ===== presentación: cómo cambia pedir en un restaurante (≈ 28 s, teléfonos dibujados; ±3 s, pausa y saltar) ===== */
const DUR = 5600, NESC = 5, TOTI = DUR * NESC;
const easeO = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
const segI = (u, a, b) => clamp((u - a) / (b - a), 0, 1);
const lerp = (a, b, k) => a + (b - a) * k;
const FOTO = ["#c9573d", "#d9a441", "#7a9a4a", "#b5527b", "#d9cfc2"];
const fonoI = (x, y, s, inner, id) => `<g transform="translate(${x},${y}) scale(${s})"><rect width="200" height="400" rx="30" fill="#1a1a1a"/><clipPath id="cp${id}"><rect x="8" y="10" width="184" height="380" rx="24"/></clipPath><rect x="8" y="10" width="184" height="380" rx="24" fill="#fef9f1"/><g clip-path="url(#cp${id})">${inner}</g></g>`;
const platoI = (y, i, op = 1, dx = 0) => `<g opacity="${op}" transform="translate(${dx},0)">${Rc(18, y, 164, 56, "#fff", 16)}<circle cx="46" cy="${y + 28}" r="19" fill="${FOTO[i % 5]}"/>${Rc(74, y + 12, 70, 8, "#6b2d3e", 4, 'opacity=".75"')}${Rc(74, y + 28, 48, 6, "#b9afa3", 3)}${Rc(74, y + 40, 30, 6, "#b8860b", 3)}<circle cx="160" cy="${y + 28}" r="11" fill="#6b2d3e"/>${Rc(154, y + 27, 12, 2.4, "#fff", 1)}${Rc(159, y + 22, 2.4, 12, "#fff", 1)}</g>`;
const encabI = (t, f = "#6b2d3e") => Rc(8, 10, 184, 64, f, 0) + T(100, 54, t, 22, "#fef9f1", "middle", 400, true);
const qrI = (x, y) => { let q = Rc(x, y, 112, 150, "#fff", 14); for (let i = 0; i < 49; i++) { const r = Math.floor(i / 7), c = i % 7; if (((r * 5 + c * 3 + r * c) % 3) !== 0 || (r < 2 && c < 2) || (r < 2 && c > 4) || (r > 4 && c < 2)) q += Rc(x + 14 + c * 12, y + 14 + r * 12, 10, 10, "#1a1a1a", 2); } return q + Rc(x + 14, y + 112, 84, 12, "#6b2d3e", 6); };
const cap = (t, u) => T(480, 66, t, 36, "#fef9f1", "middle", 400, true, `opacity="${easeO(segI(u, 0, 500))}"`);
const etiq = (t, hoy) => `<g>${Rc(330, 484, 300, 30, hoy ? "#3f6b3b" : "rgba(0,0,0,0)", 15, hoy ? "" : 'stroke="#f3d58a" stroke-width="1.6"')}${T(480, 504, t, 12.5, hoy ? "#fff" : "#f3d58a", "middle", 700)}</g>`;
const ESCENAS = [
  u => { // 1 · escanear el QR
    const subir = easeO(segI(u, 0, 1100)), escan = u > 1200 && u < 3000, bienv = u >= 3000;
    const py = lerp(260, 96, subir);
    const cam = escan || u < 1200 ? Rc(8, 10, 184, 380, "#2a2a2a", 0) + [[40, 120], [160, 120], [40, 240], [160, 240]].map(([a, b]) => Rc(a - 4, b - 4, 18, 4, "#f3d58a", 2) + Rc(a - 4, b - 4, 4, 18, "#f3d58a", 2)).join("") + Rc(44, 120 + 100 * ((u / 700) % 1), 112, 3, "#f3d58a", 2, `opacity="${escan ? 1 : 0}"`) : "";
    const pop = easeO(segI(u, 3000, 3600));
    const wel = bienv ? encabI("Mesa 4") + `<circle cx="100" cy="150" r="${30 * pop}" fill="#b8860b"/>` + T(100, 160, "A", 28 * pop, "#fff", "middle", 700) + Rc(50, 210, 100, 10, "#6b2d3e", 5, `opacity="${pop * 0.7}"`) + Rc(66, 230, 68, 8, "#b9afa3", 4, `opacity="${pop}"`) + Rc(40, 300, 120, 40, "#6b2d3e", 20, `opacity="${pop}"`) + T(100, 326, "Ver el menú", 14, "#fff", "middle", 700, false, `opacity="${pop}"`) : "";
    return cap("Escaneas el QR de la mesa", u) + Rc(110, 430, 380, 34, "#e6d9c6", 14) + qrI(236, 280) + (escan ? `<line x1="560" y1="${py + 200}" x2="350" y2="350" stroke="#f3d58a" stroke-width="3" stroke-dasharray="6 8" stroke-dashoffset="${-u / 18}"/>` : "") + fonoI(560, py, 0.95, cam + wel, "a") + etiq("En producción hoy", true);
  },
  u => { // 2 · el menú visual
    const sc = easeO(segI(u, 700, 3600)) * 230, tap = segI(u, 3800, 4300), agreg = u > 4100;
    let l = ""; for (let i = 0; i < 6; i++) l += platoI(110 + i * 68 - sc, i);
    const rip = tap > 0 && tap < 1 ? `<circle cx="160" cy="${110 + 2 * 68 - sc + 28}" r="${10 + 26 * tap}" fill="#b8860b" opacity="${0.5 * (1 - tap)}"/>` : "";
    const chips = ["Todo", "Entradas", "Fuertes", "Postres"].map((c, i) => Rc(16 + i * 44, 84, 40, 16, i === 0 ? "#6b2d3e" : "#e6d9c6", 8)).join("");
    const bar = agreg ? Rc(18, 340 + 60 * (1 - easeO(segI(u, 4100, 4600))), 164, 40, "#6b2d3e", 20) + T(100, 365 + 60 * (1 - easeO(segI(u, 4100, 4600))), "Mi orden · 1", 14, "#fff", "middle", 700) : "";
    return cap("Ves el menú con fotos y eliges", u) + fonoI(380, 90, 1.05, encabI("Carta") + chips + l + rip + bar, "b") + etiq("En producción hoy", true);
  },
  u => { // 3 · cada quien arma lo suyo y la mesa lo envía junta
    const col = ["#b8860b", "#6b2d3e", "#3f6b3b"], ps = [40, 230, 420];
    let f = ps.map((x, i) => {
      let r = ""; for (let j = 0; j < 3; j++) { const k = easeO(segI(u, 500 + i * 450 + j * 500, 900 + i * 450 + j * 500)); r += platoI(96 + j * 66, i + j * 2, k, (1 - k) * 40); }
      return fonoI(x, 120, 0.75, Rc(8, 10, 184, 64, "#f3eadb", 0) + `<circle cx="38" cy="42" r="16" fill="${col[i]}"/>` + Rc(64, 36, 70, 10, "#6b2d3e", 5, 'opacity=".7"') + r, "c" + i);
    }).join("");
    const dots = ps.map((x, i) => [0, 1].map(j => { const k = easeO(segI(u, 3100 + i * 120 + j * 160, 4000 + i * 120 + j * 160)); return k > 0 && k < 1 ? `<circle cx="${lerp(x + 70, 780, k)}" cy="${lerp(270, 250, k) - 40 * Math.sin(k * Math.PI)}" r="9" fill="${col[i]}"/>` : ""; }).join("")).join("");
    const nPl = Math.round(6 * segI(u, 3300, 4300)), env = u > 4500, pulso = 1 + 0.06 * Math.sin(u / 120) * (env ? 0 : 1);
    const pill = `<g>${Rc(640, 180, 280, 150, "#fef9f1", 28)}${T(780, 226, "Mesa 4", 26, "#6b2d3e", "middle", 400, true)}${T(780, 258, `${nPl} platillos`, 17, "#1a1a1a", "middle", 700)}<g transform="translate(780,296) scale(${pulso})">${Rc(-76, -20, 152, 40, env ? "#3f6b3b" : "#b8860b", 20)}${T(0, 6, env ? "Enviada ✓" : "Enviar juntos", 15, "#fff", "middle", 700)}</g></g>`;
    return cap("Cada quien arma lo suyo; la mesa lo envía junta", u) + f + dots + pill + etiq("Fase 3 · aún no construido", false);
  },
  u => { // 4 · la comanda llega al teléfono del mesero
    const k = easeO(segI(u, 500, 2200)), slide = 190 * (1 - easeO(segI(u, 2200, 3000))), ok = u > 3900;
    const mesa = fonoI(130, 110, 0.85, encabI("Mesa 4") + `<circle cx="100" cy="190" r="34" fill="#3f6b3b"/>` + `<path d="M84 190 l12 12 l22 -24" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` + T(100, 260, "Enviada", 22, "#6b2d3e", "middle", 700), "d");
    const tick = `<g transform="translate(${slide},0)">${Rc(18, 100, 164, 170, "#fff", 18)}${T(32, 130, "Mesa 4", 18, "#6b2d3e", "start", 700)}${[0, 1, 2, 3].map(i => Rc(32, 146 + i * 18, 90 - (i % 2) * 24, 8, "#b9afa3", 4)).join("")}${Rc(32, 224, 136, 32, ok ? "#3f6b3b" : "#b8860b", 16)}${T(100, 245, ok ? "Atendida ✓" : "Atender", 14, "#fff", "middle", 700)}</g>`;
    const bell = `<g transform="translate(168,42) rotate(${u > 2200 ? 14 * Math.sin(u / 60) * (1 - segI(u, 2200, 3400)) : 0})"><path d="M-9 8 a9 9 0 0 1 18 0 v6 h-18z" fill="#f3d58a"/><circle cx="0" cy="18" r="3" fill="#f3d58a"/></g>`;
    const wait = fonoI(650, 110, 0.85, Rc(8, 10, 184, 64, "#4f1728", 0) + T(60, 54, "Mesero", 20, "#fef9f1", "middle", 400, true) + bell + tick, "e");
    return cap("La comanda llega al teléfono del mesero", u) + mesa + wait + `<line x1="320" y1="280" x2="640" y2="280" stroke="#f3d58a" stroke-width="3" stroke-dasharray="4 10" opacity=".6"/>` + (k > 0 && k < 1 ? `<circle cx="${lerp(320, 640, k)}" cy="280" r="11" fill="#f3d58a"/>` : "") + etiq("Fase 3 · aún no construido", false);
  },
  u => { // 5 · la mesa pasa por sus estados
    const nom = ["Abierta", "Cuenta cerrada", "Pagada", "Mesa limpia"], pos = easeO(segI(u, 600, 4700)) * 3, st = Math.min(3, Math.floor(pos + 0.02));
    const chips = nom.map((t, i) => { const x = 50 + i * 220, on = i === st, pas = i < st; return Rc(x, 270, 200, 64, on ? "#b8860b" : pas ? "#6b2d3e" : "rgba(255,255,255,.14)", 32) + T(x + 100, 310, (pas ? "✓ " : "") + t, 17, on || pas ? "#fff" : "#f3e3e7", "middle", 700); }).join("");
    const tx = 150 + pos * 220;
    const tok = `<g transform="translate(${tx},196)"><circle r="26" fill="#fef9f1"/>${Rc(-14, -6, 28, 6, "#6b2d3e", 3)}${Rc(-11, 0, 4, 12, "#6b2d3e", 2)}${Rc(7, 0, 4, 12, "#6b2d3e", 2)}</g>` + T(tx, 250, "Mesa 4", 14, "#f3d58a", "middle", 700);
    return cap("Y la mesa pasa por sus estados", u) + chips + tok + T(480, 390, "El personal lleva el ciclo; sin cierre por inactividad", 15, "#f3e3e7", "middle", 400, false, `opacity="${easeO(segI(u, 4300, 5000))}"`) + etiq("Fase 3 · aún no construido", false);
  },
];
let tI = 0, pausaI = false, rafI = 0, ultI = 0;
function cerrarIntro() { cancelAnimationFrame(rafI); $("#intro").hidden = true; document.body.style.overflow = ""; try { localStorage.setItem("carta-v8-intro", "1"); } catch (e) { /* ignorar */ } }
function pintaIntro() {
  const e = Math.min(NESC - 1, Math.floor(tI / DUR)), u = tI - e * DUR;
  const sv = $("#introSvg"); if (sv) sv.innerHTML = ESCENAS[e](u);
  $$("#intro .barras i b").forEach((b, k) => { b.style.width = (k < e ? 100 : k === e ? 100 * u / DUR : 0) + "%"; });
  const bp = $("#introPausa"); if (bp) bp.textContent = pausaI ? "▶" : "❚❚";
}
function saltaI(ms) {
  if (REDUCE) { const e = clamp(Math.floor(tI / DUR) + (ms > 0 ? 1 : -1), 0, NESC - 1); tI = e * DUR + DUR * 0.92; }
  else tI = clamp(tI + ms, 0, TOTI - 1);
  pintaIntro();
}
function frameIntro(ts) {
  if ($("#intro").hidden) return;
  if (!pausaI) { tI += clamp(ts - ultI, 0, 100); if (tI >= TOTI) { cerrarIntro(); return; } }
  ultI = ts; pintaIntro(); rafI = requestAnimationFrame(frameIntro);
}
function abrirIntro() {
  const el = $("#intro");
  el.innerHTML = `<button class="btn skip" data-intro="saltar">Saltar ✕</button><svg id="introSvg" viewBox="0 0 960 540" role="img" aria-label="Cómo cambia pedir en un restaurante" font-family="DM Sans, sans-serif"></svg><div class="barras">${ESCENAS.map(() => "<i><b></b></i>").join("")}<button class="btn" data-intro="menos" aria-label="Atrás 3 segundos">−3 s</button><button class="btn" id="introPausa" data-intro="pausa" aria-label="Pausa o reanudar">❚❚</button><button class="btn" data-intro="mas" aria-label="Adelante 3 segundos">+3 s</button></div>`;
  el.hidden = false; document.body.style.overflow = "hidden"; tI = 0; pausaI = REDUCE; ultI = performance.now(); pintaIntro();
  cancelAnimationFrame(rafI); rafI = requestAnimationFrame(frameIntro);
  el.onclick = ev => { const b = ev.target.closest("[data-intro]"); if (!b) return; const a = b.dataset.intro; if (a === "saltar") cerrarIntro(); else if (a === "pausa") { pausaI = !pausaI; pintaIntro(); } else if (a === "menos") saltaI(-3000); else saltaI(3000); };
}
document.addEventListener("keydown", e => {
  if ($("#intro").hidden) return;
  if (e.key === "ArrowLeft") saltaI(-3000); else if (e.key === "ArrowRight") saltaI(3000); else if (e.key === " " && document.activeElement.tagName !== "BUTTON") { e.preventDefault(); pausaI = !pausaI; pintaIntro(); }
});

/* ===== arranque ===== */
function actualizaCajas() { $$("#grid .box:not(.rec)").forEach((b, i) => { const c = CAJAS[i].c; $(".c", b).textContent = typeof c === "function" ? c() : c; }); }
function todo() { pintaEscenario(); pintaKpis(); actualizaCajas(); refrescar(); }
pintaCajas(); todo();
oyentes.push(todo);
$("#verIntro").addEventListener("click", abrirIntro);
$("#pantallaTop").innerHTML = BTN_PANTALLA;
const h0 = location.hash.slice(1);
if (h0 && DET[h0]) abre(h0, false);
else { let visto = false; try { visto = localStorage.getItem("carta-v8-intro") === "1"; } catch (e) { /* ignorar */ } if (!visto && !location.search.includes("nointro")) abrirIntro(); }
