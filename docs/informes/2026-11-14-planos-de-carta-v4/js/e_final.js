/* ===== detalle: ¿Cómo se sostiene? ===== */
const netoCon = (N, f, s) => { const m = motor(s); return N * f * m.margen + N * (1 - f) * (m.ads - 1.0) - PL.costo_fijo_1000; };
function proyecta(nivel, s) {
  const [a, b] = M.metas[nivel], m = motor(s), filas = [];
  let servK = s.servidor;
  for (let t = 0; t <= 24; t++) {
    const Rr = t <= 12 ? a * t / 12 : a + (b - a) * (t - 12) / 12;
    while (servK < SERV.length - 1 && Rr > motor({...s, servidor: servK}).cabenG) servK++;
    const paga = Rr * m.f, grat = Rr - paga;
    const ingreso = paga * s.precioServicio + grat * m.ads;
    const extra = (SERV[servK].usd - SERV[s.servidor].usd) * TC;
    const costo = PL.costo_fijo_1000 + extra + grat * 1.0 + paga * m.pisoS;
    filas.push({t, R: Rr, paga, grat, serv: servK, ingreso, costo, margen: ingreso - costo, comensales: grat * D.uso.comensales_dia_gratuito + paga * D.uso.comensales_dia_paga});
  }
  return filas;
}
DET.sostiene = {
  titulo: "¿Se sostiene? Depende de cuántos clientes paguen; con anuncios solos, sólo a escala.",
  fu: ["carta_tres_planes", "carta_planes", "carta_anuncios", "carta_mercado"],
  nota: "Proyección provisional con el costo fijo de 2,569 pesos al mes (documento); el modelo de escenarios la sustituirá. Anuncios: la tarifa en México no está publicada; es supuesto y puede no ser aprobada por AdSense.",
  montar(host) {
    this.vis = {peor: true, mejor: true, esp: true}; this.N = 300; this.nivel = "medio"; this.armado = false; this.mes = 12;
    host.innerHTML = `<div class="viz"><svg id="svA" viewBox="0 0 960 420" role="img" font-family="DM Sans, sans-serif"></svg></div><div class="viz" style="margin-top:12px"><svg id="svB" viewBox="0 0 960 520" role="img" font-family="DM Sans, sans-serif"></svg></div>`;
    this.svA = $("#svA", host); this.svB = $("#svB", host);
    const clic = ev => { const t = ev.target.closest("[data-v]"); if (!t) return; const v = t.dataset.v; if (["peor", "mejor", "esp"].includes(v)) this.vis[v] = !this.vis[v]; else this.nivel = v; refrescar(); };
    this.svA.addEventListener("click", clic); this.svB.addEventListener("click", clic);
    this.svB.addEventListener("pointermove", ev => { const p = this.svB.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(this.svB.getScreenCTM().inverse()); const t = clamp(Math.round((q.x - 70) / 840 * 24), 0, 24); if (t !== this.mes) { this.mes = t; this.pintaB(); } });
  },
  actualizar() {
    this.pintaA(); this.pintaB();
    const m = motor(S), f = m.f, pk = ["peor", "esp", "mejor"];
    const eqPeor = PL.costo_fijo_1000 / (D.anuncios_mxn.bajo - 1), eqEsp = PL.costo_fijo_1000 / (f * m.margen + (1 - f) * (m.ads - 1));
    return {
      leyenda: `<span><i style="background:${C.rojo}"></i>peor: todos gratuitos con anuncios bajos</span><span><i style="background:${C.verde}"></i>mejor: todos pagan</span><span><i style="background:${C.vino}"></i>esperado: según el escenario, con su rango</span>`,
      cifras: [[n(eqPeor), "clientes gratuitos para cubrir el costo fijo sólo con anuncios", "supuesto"], [n(PL.costo_fijo_1000 / m.margen, 1), "clientes de paga que cubren el costo fijo (mejor caso)"], [isFinite(eqEsp) && eqEsp > 0 ? n(eqEsp) : "—", "clientes registrados para el equilibrio, escenario esperado", "supuesto"]],
      insight: eqPeor < 1000 ? `Sólo con anuncios bajos Carta se sostiene desde ≈ ${n(eqPeor)} clientes gratuitos; con un solo cliente de paga por cada ${n(1 / Math.max(f, 1e-6))} registrados llega antes.` : "Con anuncios bajos Carta no se sostiene dentro de 1,000 clientes; necesita clientes de paga.",
    };
  },
  pintaA() {
    const sv = this.svA, m = motor(S), X0 = 70, W = 840, Y0 = 70, H = 270;
    const sl = v => Math.asinh(v / 1500), vmin = -3000, vmax = 300000;
    const X = N => X0 + W * N / 1000, Y = v => Y0 + H * (sl(vmax) - sl(clamp(v, vmin, vmax))) / (sl(vmax) - sl(vmin));
    let b = T(30, 24, "Resultado al mes (pesos) según cuántos clientes se registran", 14.5, C.vino, "start", 700);
    [-3000, 0, 3000, 10000, 30000, 100000, 300000].forEach(v => { b += `<line x1="${X0}" x2="${X0 + W}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v === 0 ? C.t2 : C.arena}"/>` + T(X0 - 8, Y(v) + 4, (v < 0 ? "−" : "") + n(Math.abs(v)), 11, C.t2, "end"); });
    b += T(X0 - 8, Y0 - 8, "escala logarítmica en ambos sentidos", 10.5, C.t2, "end");
    [0, 250, 500, 750, 1000].forEach(N => { b += T(X(N), Y0 + H + 20, String(N), 11.5, C.t2, "middle"); });
    b += T(X0 + W / 2, Y0 + H + 40, "clientes registrados", 12, C.t2, "middle");
    const linea = (fn, col, w) => { let pts = ""; for (let N = 0; N <= 1000; N += 10) pts += `${X(N).toFixed(1)},${Y(fn(N)).toFixed(1)} `; return `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="${w}"/>`; };
    const varp = f => N => netoCon(N, f, S);
    const peor = N => N * (D.anuncios_mxn.bajo - 1) - PL.costo_fijo_1000, mejor = N => N * m.margen - PL.costo_fijo_1000;
    if (this.vis.esp) { let a = "", z = ""; for (let N = 0; N <= 1000; N += 10) { a += `${X(N).toFixed(1)},${Y(varp(0.16 * 0.05)(N)).toFixed(1)} `; } for (let N = 1000; N >= 0; N -= 10) { z += `${X(N).toFixed(1)},${Y(varp(0.71 * 0.2)(N)).toFixed(1)} `; } b += `<polygon points="${a}${z}" fill="${C.vino}" opacity=".16"/>` + linea(N => netoCon(N, m.f, S), C.vino, 4); }
    if (this.vis.peor) b += linea(peor, C.rojo, 3);
    if (this.vis.mejor) b += linea(mejor, C.verde, 3);
    const eq = (fn, col, dy) => { const N = PL.costo_fijo_1000 / fn; return N > 0 && N <= 1000 ? `<circle cx="${X(N)}" cy="${Y(0)}" r="7" fill="${col}" stroke="#fff" stroke-width="2"/>${T(X(N) + 10, Y(0) + dy, "equilibrio: " + n(N), 11.5, col, "start", 700)}` : ""; };
    if (this.vis.peor) b += eq(D.anuncios_mxn.bajo - 1, C.rojo, -12);
    if (this.vis.mejor) b += eq(m.margen, C.verde, -12);
    if (this.vis.esp) b += eq(m.f * m.margen + (1 - m.f) * (m.ads - 1), C.vino, 22);
    const N = this.N;
    b += `<line x1="${X(N)}" x2="${X(N)}" y1="${Y0}" y2="${Y0 + H}" stroke="${C.tinta}" stroke-width="1.5" stroke-dasharray="4 3"/>`;
    b += `<g data-drag="1" id="hN"><circle cx="${X(N)}" cy="${Y0 + H}" r="13" fill="${C.tinta}" stroke="#fff" stroke-width="3"/></g>`;
    [["peor", C.rojo, "Peor caso"], ["esp", C.vino, "Esperado"], ["mejor", C.verde, "Mejor caso"]].forEach(([k, c, nom], i) => { b += `<g data-v="${k}" style="cursor:pointer" opacity="${this.vis[k] ? 1 : 0.4}" tabindex="0" role="button" aria-pressed="${this.vis[k]}"><rect x="${600 + i * 110}" y="8" width="102" height="24" rx="12" fill="${c}"/>${T(651 + i * 110, 25, nom, 12.5, "#fff", "middle", 700)}</g>`; });
    const f = x => (x < 0 ? "−" : "") + "$" + n(Math.abs(Math.round(x)));
    b += T(X0, 52, `Con ${n(N)} clientes: peor ${f(peor(N))} · esperado ${f(netoCon(N, m.f, S))} · mejor ${f(mejor(N))}`, 13, C.tinta, "start", 700);
    sv.innerHTML = b;
    const hd = $("#hN", sv);
    arrastrable(hd, sv, pt => { this.N = clamp(Math.round((pt.x - X0) / W * 1000 / 10) * 10, 0, 1000); this.pintaA(); }, (d, mult) => { this.N = clamp(this.N + d * mult * 10, 0, 1000); this.pintaA(); });
    hd.setAttribute("aria-label", "Clientes registrados"); hd.setAttribute("aria-valuenow", N);
  },
  pintaB() {
    const sv = this.svB, filas = proyecta(this.nivel, S), m = motor(S);
    const X0 = 70, W = 840, X = t => X0 + W * t / 24, maxR = 2300;
    const Ya = r => 56 + 170 * (1 - r / maxR);
    let b = T(30, 24, "Crecimiento mes a mes (meta a 12 y 24 meses del estudio de mercado)", 14.5, C.vino, "start", 700);
    [["bajo", "Bajo"], ["medio", "Medio"], ["alto", "Alto"]].forEach(([k, nom], i) => { b += `<g data-v="${k}" style="cursor:pointer" tabindex="0" role="button" aria-pressed="${this.nivel === k}"><rect x="${640 + i * 100}" y="8" width="92" height="24" rx="12" fill="${this.nivel === k ? C.vino : C.arena}"/>${T(686 + i * 100, 25, nom, 12.5, this.nivel === k ? "#fff" : C.t2, "middle", 700)}</g>`; });
    [0, 1000, 2000].forEach(v => { b += `<line x1="${X0}" x2="${X0 + W}" y1="${Ya(v)}" y2="${Ya(v)}" stroke="${C.arena}"/>` + T(X0 - 8, Ya(v) + 4, n(v), 11, C.t2, "end"); });
    // capacidad del servidor actual (escalonada) y restaurantes
    let cap = "", pts = "";
    filas.forEach(r => { const c = motor({...S, servidor: r.serv}).cabenG; cap += `${X(r.t)},${Ya(Math.min(c, maxR))} `; pts += `${X(r.t)},${Ya(r.R)} `; });
    b += `<polyline points="${cap}" fill="none" stroke="${C.dorado}" stroke-width="3" stroke-dasharray="6 4"/><polyline points="${pts}" fill="none" stroke="${C.vino}" stroke-width="4"/>`;
    const sube = filas.find(r => r.serv > S.servidor);
    if (sube) b += `<line x1="${X(sube.t)}" x2="${X(sube.t)}" y1="50" y2="${Ya(0)}" stroke="${C.rojo}" stroke-width="2" stroke-dasharray="3 3"/>` + T(X(sube.t) + 8, 66, `mes ${sube.t}: subir a ${NOMSERV(SERV[sube.serv])}`, 12.5, C.rojo, "start", 700);
    else b += T(X0 + 8, 66, `Con ${NOMSERV(SERV[S.servidor])} alcanza los 24 meses`, 12.5, C.verde, "start", 700);
    b += T(X0 + W, Ya(0) + 18, "restaurantes (línea vino) y capacidad del servidor (dorado)", 11.5, C.t2, "end");
    [0, 6, 12, 18, 24].forEach(t => { b += T(X(t), Ya(0) + 34, "mes " + t, 11.5, C.t2, "middle"); });
    // ingresos, costos y margen
    const yb0 = 340, hb = 130, maxM = Math.max(...filas.map(r => Math.max(r.ingreso, r.costo)), 1), Yb = v => yb0 + hb * (1 - v / maxM);
    b += T(30, yb0 - 14, "Ingresos y costos al mes (pesos)", 13.5, C.vino, "start", 700);
    filas.forEach(r => { const x = X(r.t) - 11; b += Rc(x, Yb(r.ingreso), 10, yb0 + hb - Yb(r.ingreso), C.vino, 2) + Rc(x + 11, Yb(r.costo), 10, yb0 + hb - Yb(r.costo), C.gris, 2); });
    let mg = ""; filas.forEach(r => { mg += `${X(r.t)},${Yb(Math.max(r.margen, 0))} `; });
    b += `<polyline points="${mg}" fill="none" stroke="${C.verde}" stroke-width="3"/>`;
    b += T(X0 - 8, yb0 + 8, "$" + n(maxM), 11, C.t2, "end") + T(X0 - 8, yb0 + hb, "0", 11, C.t2, "end");
    // cursor del mes
    const r = filas[this.mes];
    b += `<line x1="${X(this.mes)}" x2="${X(this.mes)}" y1="48" y2="${yb0 + hb}" stroke="${C.tinta}" stroke-width="1.2" stroke-dasharray="3 3"/>`;
    b += T(X0 + W, 46, `Mes ${r.t}: ${n(r.R)} restaurantes (${n(r.paga, 1)} de paga) · ${n(r.comensales)} comensales al día`, 12.5, C.tinta, "end", 700);
    b += T(X0 + W, yb0 + hb + 24, `Mes ${r.t}: ingreso ${mxn(Math.round(r.ingreso))} · costo ${mxn(Math.round(r.costo))} · margen ${r.margen < 0 ? "−" : ""}${mxn(Math.abs(Math.round(r.margen)))}`, 12.5, C.tinta, "end", 700);
    b += `<rect x="${X0}" y="${yb0 + hb + 34}" width="12" height="12" rx="3" fill="${C.vino}"/>${T(X0 + 18, yb0 + hb + 45, "ingresos", 11.5, C.t2)}<rect x="${X0 + 90}" y="${yb0 + hb + 34}" width="12" height="12" rx="3" fill="${C.gris}"/>${T(X0 + 108, yb0 + hb + 45, "costos", 11.5, C.t2)}<rect x="${X0 + 170}" y="${yb0 + hb + 34}" width="12" height="12" rx="3" fill="${C.verde}"/>${T(X0 + 188, yb0 + hb + 45, "margen (si es positivo)", 11.5, C.t2)}`;
    sv.innerHTML = b;
  },
};

/* ===== Recomendaciones ===== */
const cobAt = v => n(interp(COB, v), 1) + " %";
const margenAt = (p, s = 60) => Math.round(p - piso(p, s));
const RECS = [
  {id: "platillos", corto: "Tope de platillos del gratuito: 80", titulo: "¿Cuántos platillos cabe en el plan gratuito?",
    rec: {label: "80 platillos", parche: {topePlatillos: 80}, cifra: cobAt(80), porque: "de los negocios rebasaría este tope: casi todos entran gratis", pros: ["El primer contacto es bueno: casi toda carta cabe", "Un platillo pesa 1.4 a 1.9 KB: casi no cuesta disco"], cons: ["Empuja poco a pagar por este camino"]},
    alts: [{label: "60 platillos", parche: {topePlatillos: 60}, cifra: cobAt(60), pros: ["Empuja a más negocios a pagar"], cons: ["Casi 1 de cada 4 cartas no cabe"]}, {label: "40 platillos", parche: {topePlatillos: 40}, cifra: cobAt(40), pros: ["Mucha presión a pagar"], cons: ["Más de la mitad de las cartas queda fuera; mal primer contacto"]}],
    ejemplo: "La Ceiba, el restaurante de ejemplo del proyecto (22 platillos), cabe de sobra; una taquería con 95 platillos tendría que pasar a Servicio."},
  {id: "precio", corto: "Precio de Servicio: $299", titulo: "¿Cuánto cuesta el plan Servicio al mes?",
    rec: {label: "$299", parche: {precioServicio: 299}, cifra: "$" + margenAt(299), porque: "de margen por cliente de paga; 46 % del precio de Fudo Avanzado", pros: ["Centro del corredor 249 a 349", "Deja 72 % de margen sobre el piso"], cons: ["Sigue arriba de Meniu ($225), que ya trae más funciones"]},
    alts: [{label: "$249", parche: {precioServicio: 249}, cifra: "$" + margenAt(249), pros: ["El más cercano a Meniu", "Es el mínimo: 3 veces el piso"], cons: ["Margen más bajo: más clientes de paga para el equilibrio"]}, {label: "$349", parche: {precioServicio: 349}, cifra: "$" + margenAt(349), pros: ["Más margen por cliente"], cons: ["55 % arriba de Meniu; sólo compite contra Fudo con mesas"]}],
    ejemplo: "Un restaurante de 14 mesas pagaría $299 al mes; a un ticket promedio de $160 por persona son ≈ 2 comensales al día (ejemplo ilustrativo)."},
  {id: "contra", corto: "Contra quién se compite: Fudo Avanzado", titulo: "¿Contra quién se compara Carta?",
    rec: {label: "Fudo Avanzado ($652)", parche: {sustituto: "Fudo Avanzado", precioServicio: 299, K: 0.5}, cifra: "$299", porque: "es el precio de la regla con K = 0.5: la mitad de lo que cobra", pros: ["Ya incluye pedido desde la mesa y app de meseros", "Se defiende con una mesa que pide junta"], cons: ["No trae caja ni inventario: Carta tampoco"]},
    alts: [{label: "Meniu ($225)", parche: {sustituto: "Meniu", precioServicio: 249}, cifra: "$249", pros: ["Manda el piso: el precio más bajo posible"], cons: ["Trae caja, cocina y pago en mesa por menos"]}, {label: "Fudo + mesas ($745)", parche: {sustituto: "Fudo + mesas", precioServicio: 349}, cifra: "$349", pros: ["Más margen"], cons: ["Es el sustituto más caro: se ve distinto a la mayoría"]}],
    ejemplo: "Una cafetería que hoy paga $652 por Fudo Avanzado ahorraría más de la mitad con Carta a $299 si sólo necesita menú y orden en mesa."},
  {id: "historial", corto: "Historial: 3 meses en línea, el resto archivado", titulo: "¿Cuánto historial vive en la base?",
    rec: {label: "3 meses en línea + archivo", parche: {palancas: 2}, cifra: String(palMap.P2.paga), porque: "clientes de paga caben en 5 GB, frente a 14 con el plan de datos actual", pros: ["Multiplica por 9 los clientes de paga que caben", "Guardar lo viejo en frío cuesta ≈ 0.4 pesos al año"], cons: ["Exige un archivador que aún no existe", "Cambia lo decidido: 12 meses en línea"]},
    alts: [{label: "Analítica 30 días", parche: {palancas: 1}, cifra: String(palMap.P1.paga), pros: ["Sólo una purga más corta"], cons: ["Caben 38 clientes de paga, no 128"]}, {label: "Todo: 7 días y 1 mes", parche: {palancas: 5}, cifra: String(palMap.P5.paga), pros: ["El máximo medido"], cons: ["Menos historial a la mano del dueño"]}],
    ejemplo: "Un restaurante mediano guarda 13.5 MB al mes; archivado, su año de historial pesa 10.6 MB comprimido. No se venden ni se comparten datos."},
  {id: "soporte", corto: "Soporte: $60 al mes por cliente de paga", titulo: "¿Cuánto soporte se da a cada cliente de paga?",
    rec: {label: "$60 al mes (30 min)", parche: {soporte: 60}, cifra: "$" + margenAt(299, 60), porque: "de margen a $299 con este soporte (supuesto)", pros: ["Mantiene el precio dentro del corredor"], cons: ["Es un supuesto: lo mide el piloto"]},
    alts: [{label: "$150 al mes", parche: {soporte: 150}, cifra: "$" + margenAt(299, 150), pros: ["Más atención al cliente"], cons: ["El precio sube a ≈ $556 si se mantiene K"]}, {label: "$30 al mes", parche: {soporte: 30}, cifra: "$" + margenAt(299, 30), pros: ["Más margen"], cons: ["Poca ayuda al dueño al principio"]}],
    ejemplo: "Con 10 restaurantes del piloto, anotar los minutos de soporte de cada uno da la cifra real en un mes."},
];
DET.recomendaciones = {
  titulo: "Cinco recomendaciones: aplica una al escenario y mira cómo cambian las cifras.",
  fu: ["carta_precio", "carta_tres_planes", "carta_disco", "calvin_posturas"],
  nota: "Recomendaciones del análisis, no decisiones: las decide Calvin. Ninguna cifra de ingreso es compromiso; planes y precios son propuesta.",
  montar(host) { host.innerHTML = RECS.map(r => `<div class="rcard" id="r_${r.id}"></div>`).join(""); },
  actualizar() {
    const aplicada = (p) => Object.entries(p).every(([k, v]) => S[k] === v);
    RECS.forEach(r => {
      const o = (x, rec) => `<div class="opcion${rec ? " rec" : ""}"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h4>${esc(x.label)}</h4>${rec ? '<span class="et prop">recomendado</span>' : ""}</div><div class="serif" style="font-size:26px;color:var(--vino)">${esc(x.cifra)}</div><ul>${x.pros.map(t => `<li class="pro">+ ${esc(t)}</li>`).join("")}${x.cons.map(t => `<li class="con">− ${esc(t)}</li>`).join("")}</ul><button class="btn${aplicada(x.parche) ? " on" : ""}" data-aplica='${JSON.stringify(x.parche)}'>${aplicada(x.parche) ? "✓ aplicado" : rec ? "Aplicar al escenario" : "Probar esta"}</button></div>`;
      $("#r_" + r.id).innerHTML = `<h3>${esc(r.titulo)}</h3><div class="porque"><b>${esc(r.rec.cifra)}</b><span>${esc(r.rec.porque)}</span></div><div class="tarjetas">${o(r.rec, true)}${r.alts.map(a => o({...a, pros: a.pros, cons: a.cons}, false)).join("")}</div><div class="ejemplo"><b>Con un restaurante concreto:</b> ${esc(r.ejemplo)}</div>`;
    });
    const m = motor(S);
    return {cifras: [[n(m.cabenG), "clientes gratuitos caben con el escenario activo"], [mxn(S.precioServicio), "Servicio al mes", "propuesta"], [n(m.margenPct) + " %", "margen por cliente de paga"], [n(m.emp, 1) + " %", "empuja a pagar", "supuesto"]], insight: "Aplica una recomendación y las cifras de arriba cambian al instante; «Mi escenario» guarda tu combinación."};
  },
};

/* ===== detalle de cada cifra de arriba: de dónde sale ===== */
function cuentaDet(titulo, fu, filas, insight) {
  return {
    titulo, fu, montar(host) { host.innerHTML = `<div class="cuenta" id="cu"></div>`; },
    actualizar() {
      const rows = filas();
      $("#cu").innerHTML = rows.map(([a, v, tot]) => `<div${tot ? ' class="t"' : ""}>${a}</div><div class="v${tot ? " t" : ""}">${v}</div>`).join("");
      return {insight: insight(), cifras: []};
    },
  };
}
DET.k_potenciales = cuentaDet("Clientes potenciales (SAM): ≈ 100,000 restaurantes y bares sin cadenas.", ["inegi_denue", "carta_mercado"], () => [
  ["Mercado total (TAM): restaurantes y bares de México", n(M.total)], ["− Fuera del núcleo (fondas para llevar, tacos, mariscos, cafeterías)", "− " + n(M.total - M.nucleo)], ["= Núcleo: a la carta, comida corrida, bares, cantinas", n(M.nucleo), true],
  ["− Posibles cadenas (nombre repetido; casi ninguna lo es)", "− " + n(M.nucleo - M.servible)], ["= Clientes potenciales (SAM)", "≈ " + n(M.servible), true], ["Rango según el umbral de cadena", n(M.servible_rango[0]) + " a " + n(M.servible_rango[1])], ["Meta a 12 meses (SOM): escenario", "100 a 1,000"]], () => "El mercado no es el límite: lo es cuántos dueños prueban Carta y cuántos pagan.");
DET.k_caben = cuentaDet("Cuántos clientes caben: lo decide el recurso que se llena primero.", ["carta_anuncios", "carta_capacidad", "railway_limites"], () => {
  const m = motor(S); return [["Servidor elegido", NOMSERV(m.e) + " · " + m.usd + " USD al mes"], ...m.limG.map(([nom, v]) => [`Límite por ${nom}`, isFinite(v) ? n(v) : "sin límite con Pro"]), [`Cabe el menor: ${m.cuelloG}`, n(m.cabenG) + " clientes gratuitos", true], ["Clientes de paga que caben (pesan más)", n(m.cabenP) + " · frena " + m.cuelloP]];
}, () => "Cambia el servidor y las palancas del disco en «¿Qué llena el disco?» y esta cifra se recalcula.");
DET.k_sostiene = cuentaDet("Un cliente de paga sostiene el costo de decenas de clientes gratuitos.", ["carta_planes", "carta_precio"], () => {
  const m = motor(S), c = (S.stripe_pct ?? F.stripe_pct), com = (F.stripe_pct * S.precioServicio * (1 + F.iva) + F.stripe_fijo) * (1 + F.iva);
  return [["Precio de Servicio", mxn(S.precioServicio)], ["− Costo variable de un restaurante mediano", "− " + n(F.costo_var_mediano, 1)], ["− Costo fijo repartido por restaurante", "− " + n(F.fijo, 1)], ["− Comisión de tarjeta (3.6 % + $3, más IVA)", "− " + n(com, 1)], ["− Soporte (supuesto)", "− " + n(S.soporte)], ["= Margen por cliente de paga", mxn(Math.round(m.margen)), true], ["÷ Costo de un cliente gratuito (documento)", mxn(m.costoGrat)], ["= Gratuitos que sostiene cada uno de paga", n(m.sostiene), true]];
}, () => "Cuenta provisional con el costo de un gratuito del documento de planes; el modelo de escenarios la afinará.");
DET.k_anuncios = cuentaDet("Un cliente gratuito deja unos pesos al mes en anuncios; una tarifa sin fuente fuerte.", ["carta_anuncios"], () => {
  const a = D.anuncios_mxn, v = D.uso.visitas_mes_gratuito;
  return [["Visitas con la app al mes de un gratuito típico", n(v)], ["Tarifa baja (por mil visitas)", mxn(a.bajo / v * 1000) + " → " + mxn(a.bajo) + " al mes"], ["Tarifa media", mxn(a.medio / v * 1000) + " → " + mxn(a.medio) + " al mes"], ["Tarifa alta", mxn(a.alto / v * 1000) + " → " + mxn(a.alto) + " al mes"], ["Escenario activo: " + S.anuncios, mxn(a[S.anuncios]) + " al mes", true]];
}, () => "La tarifa de anuncios en México no está publicada: es supuesto, y AdSense podría no aprobar una carta detrás de un código de mesa.");
DET.k_ingreso = cuentaDet("Un cliente de paga ingresa el precio de su plan cada mes.", ["carta_precio", "carta_tres_planes"], () => [["Servicio (11 a 40 mesas)", mxn(S.precioServicio) + " al mes"], ["Salón (más de 40 mesas)", mxn(S.precioSalon) + " al mes"], ["Corredor propuesto de Servicio", "$249 a $349"], ["Con soporte de $150 el precio sube a", "≈ $556"], ["Meniu, el sustituto más barato, cobra", "$225"]], () => "El precio es propuesta: la v1 no cobra, y lo confirma el piloto con 10 restaurantes.");
DET.k_margen = cuentaDet("Margen: lo que queda de cada cliente de paga después de atenderlo.", ["carta_tres_planes", "carta_precio"], () => {
  const m = motor(S); return [["Precio de Servicio", mxn(S.precioServicio)], ["Piso: costo de atender a un cliente de paga", mxn(Math.round(m.pisoS))], ["Margen por cliente", mxn(Math.round(m.margen)), true], ["Margen sobre el precio", n(m.margenPct) + " %", true], ["Clientes de paga por 1,000 que cubren el costo fijo", n(m.equilibrioPagantes, 1)]];
}, () => "A $349 el margen es 76 % sobre el piso; a $249, 68 %. Cada punto de precio es margen casi directo.");

/* ===== presentación breve (≤ 30 s, se puede saltar, no se repite sola) ===== */
const SLIDES = [
  ["El problema", `El comensal ya está conectado. <em>94 de cada 100</em> restaurantes a la carta y bares no declara sitio web.`, "Sólo 5.9 % de 104,882 negocios del mercado declara sitio. Fuente: " + "INEGI, 2026 (cálculo propio)."],
  ["Lo que hace Carta", `Sube tu carta en PDF y en minutos tienes un <em>menú visual por QR</em>; la mesa arma su orden junta y el mesero la recibe.`, "Hoy: menú por QR en producción. Orden en grupo y mesero: Fase 3, aún no construida."],
  ["La oportunidad", `<em>≈ 100,000</em> clientes potenciales. Una meta de 100 a 1,000 en un año.`, "Análisis: la meta es un escenario, no un dato. Fuente: Carta, mercado 2026."],
  ["Cómo gana dinero", `Gratis con anuncios; planes de paga desde <em>$249 a $349</em> al mes.`, "Propuesta: la v1 no cobra. Nunca se venden datos de comensales ni de restaurantes."],
  ["Qué decides hoy", `<em>Cinco decisiones</em> y un escenario que ves cambiar al instante.`, "Topes, precio, contra quién competir, historial y soporte."],
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
