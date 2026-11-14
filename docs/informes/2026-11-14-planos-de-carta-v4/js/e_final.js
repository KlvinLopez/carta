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
    host.innerHTML = `<div class="viz"><svg id="svA" viewBox="0 0 960 430" role="img" font-family="DM Sans, sans-serif"></svg></div><div class="viz" style="margin-top:12px"><svg id="svB" viewBox="0 0 960 540" role="img" font-family="DM Sans, sans-serif"></svg></div>`;
    this.svA = $("#svA", host); this.svB = $("#svB", host);
    const clic = ev => { const t = ev.target.closest("[data-v]"); if (!t) return; const v = t.dataset.v; if (["peor", "mejor", "esp"].includes(v)) this.vis[v] = !this.vis[v]; else this.nivel = v; refrescar(); };
    this.svA.addEventListener("click", clic); this.svB.addEventListener("click", clic);
    this.svB.addEventListener("pointermove", ev => { const p = this.svB.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(this.svB.getScreenCTM().inverse()); const t = clamp(Math.round((q.x - 70) / 840 * 23) + 1, 1, 24); if (t !== this.mes) { this.mes = t; this.pintaB(); } });
  },
  actualizar() {
    this.pintaA(); this.pintaB();
    const m = motor(S), pz = proyecta(this.nivel, S), peor = {...S, caso: "peor"};
    const eqN = (s0) => { for (let N = 1; N <= 5000; N += 1) if (margenEn(s0, N) >= 0) return N; return null; };
    const ePeor = eqN(peor);
    return {
      leyenda: `<span><i style="background:${C.rojo}"></i>peor: todos gratuitos, anuncios de tarifa baja</span><span><i style="background:${C.verde}"></i>mejor: todos pagan</span><span><i style="background:${C.vino}"></i>esperado: curva ${S.curva}, con su rango</span>`,
      cifras: [[ePeor ? n(ePeor) : "más de 5,000", "restaurantes gratuitos para sostenerse sólo con anuncios", "supuesto"], [n(m.eqSinAds, 1), "clientes de paga por cada 1,000 que cubren el costo sin contar anuncios (punto de equilibrio)", "supuesto"], [pz.mes_primer_margen_positivo ? "mes " + pz.mes_primer_margen_positivo : "—", "primer mes con margen positivo (escenario esperado)", "supuesto"]],
      insight: ePeor ? `Sólo con anuncios Carta se sostiene desde ≈ ${n(ePeor)} restaurantes gratuitos; con clientes de paga y sin anuncios, el equilibrio llega con ${n(m.eqSinAds, 1)} por cada 1,000.` : "Sólo con anuncios Carta no se sostiene dentro de 5,000 restaurantes; necesita clientes de paga.",
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
    b += T(X0 - 8, Y0 - 8, "escala logarítmica en ambos sentidos", 10.5, C.t2, "end");
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
    [["peor", C.rojo, "Peor caso"], ["esp", C.vino, "Esperado"], ["mejor", C.verde, "Mejor caso"]].forEach(([k, c, nom], i) => { b += `<g data-v="${k}" style="cursor:pointer" opacity="${this.vis[k] ? 1 : 0.4}" tabindex="0" role="button" aria-pressed="${this.vis[k]}"><rect x="${600 + i * 110}" y="8" width="102" height="24" rx="12" fill="${c}"/>${T(651 + i * 110, 25, nom, 12.5, "#fff", "middle", 700)}</g>`; });
    b += T(X0, 52, `Con ${n(N)} restaurantes: peor ${fmP(margenEn({...S, caso: "peor"}, N))} · esperado ${fmP(margenEn(S0, N))} · mejor ${fmP(margenEn({...S, caso: "mejor"}, N))}`, 13, C.tinta, "start", 700);
    sv.innerHTML = b;
    const hd = $("#hN", sv);
    arrastrable(hd, sv, pt => { this.N = clamp(Math.round((pt.x - X0) / W * 1000 / 10) * 10, 10, 1000); this.pintaA(); }, (d, mult) => { this.N = clamp(this.N + d * mult * 10, 10, 1000); this.pintaA(); });
    hd.setAttribute("aria-label", "Restaurantes registrados"); hd.setAttribute("aria-valuenow", N);
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
  agresividad: [{precioServicio: 249, sustituto: "Meniu Business"}, {precioServicio: 299, sustituto: "Fudo Avanzado", K: 0.5}, {precioServicio: 349, sustituto: "Fudo Avanzado + módulo de mesas"}, {precioServicio: 449, sustituto: "Fudo Avanzado", K: 0.7}],
  topes_gratuito: [{topeMesas: 8, topeCuentas: 2, topePlatillos: 60}, {topeMesas: 10, topeCuentas: 3, topePlatillos: 80}, {topeMesas: 15, topeCuentas: 5, topePlatillos: 100}],
  historial: [{hist: 1}, {hist: 3}, {hist: 12}],
  soporte: [{soporte: 30}, {soporte: 60}, {soporte: 150}],
  anuncios: [{ads: false}, {ads: true, tarifa: "baja"}, null], // los personalizados chocan con la regla dura 10: no se aplican
  avisos_reloj: [null, null],
};
const CIFRA_REC = {
  agresividad: () => ["$299", "precio de lanzamiento: 46 % de lo que cobra Fudo Avanzado"],
  topes_gratuito: () => [n(100 - 100 * MOD.parteRebasa(config(PRESETS.rec), SP), 1) + " %", "de los negocios queda dentro del plan Chef"],
  historial: () => ["12 meses", "de historial en línea para Master Chef; 30 días para Chef"],
  soporte: () => ["$60", "al mes por cliente de paga (30 minutos de soporte)"],
  anuncios: () => ["$" + n(motor(PRESETS.rec).ingGrat, 1), "al mes por cliente gratuito con anuncios de tarifa baja"],
  avisos_reloj: () => ["0", "avisos de reloj desde el servidor: los relojes viven en el teléfono"],
};
const aplicadaP = p => p && Object.entries(p).every(([k, v]) => S[k] === v);
DET.recomendaciones = {
  titulo: "Seis recomendaciones: aplica una al escenario y mira cómo cambian las cifras.",
  fu: ["carta_precio", "carta_tres_planes", "carta_disco", "calvin_posturas"],
  nota: "Recomendaciones del análisis, no decisiones: las decide Calvin. Planes y precios son propuesta; la v1 no cobra.",
  montar(host) { host.innerHTML = REC.decisiones.map(r => `<div class="rcard" id="r_${r.id}"></div>`).join(""); },
  actualizar() {
    REC.decisiones.forEach(r => {
      const parches = PARCHES[r.id] || [], [cif, sub] = CIFRA_REC[r.id]();
      const op = (a, i) => {
        const rec = /recomendada/.test(a.opcion), p = parches[i], on = aplicadaP(p);
        return `<div class="opcion${rec ? " rec" : ""}"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h4>${esc(a.opcion.replace(/ ?\(recomendada\)/, ""))}</h4>${rec ? '<span class="et prop">recomendado</span>' : ""}</div><ul><li class="pro">+ ${esc(sinMd(a.pros))}</li><li class="con">− ${esc(sinMd(a.contras))}</li></ul>${p ? `<button class="btn${on ? " on" : ""}" data-aplica='${JSON.stringify(p)}'>${on ? "✓ aplicado" : rec ? "Aplicar al escenario" : "Probar esta"}</button>` : `<small class="nota">No cambia las cifras del modelo</small>`}</div>`;
      };
      $("#r_" + r.id).innerHTML = `<h3>${esc(r.decision)}</h3><div class="porque"><b>${esc(cif)}</b><span>${esc(sub)}</span></div><div class="tarjetas">${r.alternativas.map(op).join("")}</div><div class="ejemplo"><b>Con un restaurante concreto:</b> ${esc(sinMd(r.ejemplo))}</div><details style="margin-top:8px"><summary style="cursor:pointer;font-weight:700;color:var(--vino2)">La recomendación y el porqué</summary><p style="font-size:13.5px">${esc(sinMd(r.recomendacion))}</p><p style="font-size:13px;color:var(--tinta2)">${esc(sinMd(r.por_que))}</p><p style="font-size:12.5px"><b>Dato que lo cambiaría:</b> ${esc(sinMd(r.dato_que_la_cambiaria))}</p></details>`;
    });
    const m = motor(S);
    return {cifras: [[n(m.caben), "restaurantes caben con el escenario activo"], [mxn(S.precioServicio), "Master Chef al mes", "propuesta"], [n(100 * m.margenPct) + " %", "margen con 1,000 restaurantes", "supuesto"], [emTxt(m), "se pasa del plan Chef", "supuesto"]], insight: "Aplica una recomendación y las cifras de arriba cambian al instante; «Mi escenario» guarda tu combinación."};
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
  return [[`Ingreso por cliente de ${PLAN.paga}`, mxn(pc.ingreso_servicio)], ["− Costo de atenderlo (servidor, soporte y comisión de tarjeta)", "− " + n(pc.costo_servicio, 1)], ["= Margen por cliente de paga", mxn(Math.round(pc.margen_servicio)), true], ["Costo de un cliente gratuito", mxn(Math.round(pc.costo_gratuito * 10) / 10)], ["− Lo que deja en anuncios", "− " + n(pc.ingreso_gratuito, 1)], ["= Costo neto de un gratuito", (neto <= 0 ? "se paga solo" : mxn(Math.round(neto * 10) / 10)), true], ["Gratuitos que sostiene cada cliente de paga (sin contar anuncios)", m.sostieneSinAds == null ? "todos" : n(m.sostieneSinAds), true], ["Con los anuncios del escenario", m.sostiene == null ? "cada gratuito se paga solo" : n(m.sostiene) + " gratuitos"]];
}, () => "Con anuncios, cada gratuito deja más de lo que cuesta; la tarifa es supuesto y la sustituye una prueba pequeña con 3 restaurantes.");
DET.k_anuncios = cuentaDet("Un cliente gratuito deja unos pesos al mes en anuncios; una tarifa sin fuente fuerte.", ["carta_anuncios"], () => {
  const t = SP.anuncio_pesos_por_mil, v = SP.visitas_app_gratuito;
  return [["Visitas con la app al mes de un gratuito típico", n(v)], ...["baja", "media", "alta"].map(k => [`Tarifa ${k}: ${mxn(t[k])} por mil visitas`, mxn(Math.round(t[k] * v / 100) / 10) + " al mes"]), [`Escenario activo: ${S.caso === "peor" ? "baja (peor caso)" : S.ads ? S.tarifa : "sin anuncios"}`, mxn(Math.round(motor(S).ingGrat * 10) / 10) + " al mes", true]];
}, () => "La tarifa de anuncios en México no está publicada: es supuesto, y AdSense podría no aprobar una carta detrás de un código de mesa.");
DET.k_ingreso = cuentaDet("Un cliente de paga ingresa el precio de su plan cada mes.", ["carta_precio", "carta_tres_planes"], () => [[`${PLAN.paga} (11 a 40 mesas)`, mxn(S.precioServicio) + " al mes"], [`${PLAN.ejec} (más de 40 mesas)`, mxn(S.precioSalon) + " al mes"], ["Corredor propuesto de Master Chef", "$249 a $349"], ["Con soporte de $150 el precio sube a", "≈ $556"], ["Meniu, el sustituto más barato, cobra", "$225"]], () => "El precio es propuesta: la v1 no cobra, y lo confirma el piloto con 10 restaurantes.");
DET.k_margen = cuentaDet("Margen: lo que queda de los ingresos después de atender a todos.", ["carta_tres_planes", "carta_precio"], () => {
  const m = motor(S), e = m.ev; return [["Ingresos por suscripción", mxn(Math.round(e.ingresos.suscripcion))], ["Ingresos por anuncios", mxn(Math.round(e.ingresos.anuncios))], ["− Servidor y almacenamiento", "− " + n(e.costos.servidor + e.costos.almacenamiento + e.costos.objetos)], ["− Soporte", "− " + n(e.costos.soporte)], ["− Comisión de tarjeta", "− " + n(e.costos.comision)], ["= Margen al mes con 1,000 restaurantes", fmP(e.margen.pesos), true], ["Margen sobre los ingresos", e.margen.porcentaje == null ? "—" : n(100 * e.margen.porcentaje) + " %", true]];
}, () => "Aquí el margen no incluye sueldos ni impuestos: es lo que queda después de atender a los clientes.");

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
const h0 = location.hash.slice(1);
if (h0 && DET[h0]) abre(h0, false);
else { let visto = false; try { visto = localStorage.getItem("carta-v5-intro") === "1"; } catch (e) { /* ignorar */ } if (!visto && !location.search.includes("nointro")) abrirIntro(); }
