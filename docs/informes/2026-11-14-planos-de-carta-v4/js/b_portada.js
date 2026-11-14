/* ===== cabecera, barra de escenario, cifras y cajas ===== */
$("#oportunidad").textContent = "94 de cada 100 restaurantes a la carta y bares no declara sitio web; Carta les da, en minutos, un menú visual y una orden que la mesa arma junta.";
const sitioPct = 100 * M.nucleo_con_sitio / M.nucleo;
const nomServ = m => m.es.nombre.replace("Con eventos, ", "");

function pintaEscenario() {
  const m = motor(S);
  const chips = [
    ["precio", `${PLAN.paga} <b>${mxn(S.precioServicio)}</b> · ${PLAN.ejec} <b>${mxn(S.precioSalon)}</b>`],
    ["topes", `${PLAN.gratis}: <b>${S.topePlatillos}</b> platillos · <b>${S.topeMesas}</b> mesas · <b>${S.topeCuentas}</b> cuentas`],
    ["disco", `Historial <b>${S.hist}</b> meses · analítica <b>${S.a7 ? "7 días" : S.a30 ? "30 días" : "13 meses"}</b> · ${nomServ(m)}`],
    ["precio", `Frente a <b>${CORTO_SUST[S.sustituto]}</b>`],
    ["sostiene", `Anuncios <b>${S.caso === "peor" || S.ads ? "sí · " + (S.caso === "peor" ? "baja" : S.tarifa) : "no"}</b>`],
    ["topes", `Pago: curva <b>${S.curva}</b>${S.caso !== "esperado" ? ` · caso <b>${S.caso}</b>` : ""}`],
  ];
  const clave = {Recomendado: "rec", "Peor caso": "peor", "Mejor caso": "mejor", "Mi escenario": "mio"};
  const html = `<span class="lab">Escenario</span>` +
    Object.entries(clave).map(([t, k]) => `<button class="btn" data-esc="${k}" aria-pressed="${S.nombre === t}">${t}${t === "Mi escenario" && MIO ? " ●" : ""}</button>`).join("") +
    chips.map(([k, h]) => `<button class="chip" data-ir="${k}">${h}</button>`).join("");
  $("#esc").innerHTML = html;
  const ed = $("#escDet"); if (ed) ed.innerHTML = `<button class="btn dor" data-cierra>← Volver</button>` + html;
}

const KPIS = [
  {id: "potenciales", cifra: () => "≈ " + n(M.servible), txt: () => "clientes potenciales (SAM)", tag: () => cita("carta_mercado")},
  {id: "caben", cifra: m => n(m.caben), txt: m => `restaurantes caben · frena: ${m.cuello}`, tag: () => cita("carta_anuncios")},
  {id: "sostiene", cifra: m => (m.sostieneSinAds == null ? "todos" : n(m.sostieneSinAds)), txt: () => "gratuitos que sostiene cada cliente de paga (sin contar anuncios)", tag: () => "modelo de escenarios · supuesto"},
  {id: "anuncios", cifra: m => "$" + n(m.ingGrat, 1), txt: () => "al mes por cliente gratuito (anuncios)", tag: () => "supuesto · " + cita("carta_anuncios")},
  {id: "ingreso", cifra: () => mxn(S.precioServicio), txt: () => `al mes por cliente de paga (${PLAN.paga})`, tag: () => "propuesta · " + cita("carta_precio")},
  {id: "margen", cifra: m => (m.margenPct == null ? "—" : n(100 * m.margenPct) + " %"), txt: m => `margen del negocio con 1,000 restaurantes (${(m.margen < 0 ? "−" : "") + mxn(Math.abs(Math.round(m.margen)))} al mes)`, tag: () => "modelo de escenarios · supuesto"},
];
function pintaKpis() {
  const m = motor(S), el = $("#kpis");
  if (!el.children.length) el.innerHTML = KPIS.map(k => `<button class="kpi" data-kpi="${k.id}" aria-label="${k.id}"><b></b><span></span><small></small></button>`).join("");
  KPIS.forEach((k, i) => { const c = el.children[i]; $("b", c).textContent = k.cifra(m); $("span", c).textContent = k.txt(m); $("small", c).textContent = "(" + k.tag() + ")"; });
}

/* minis (visual de cada caja; las barras crecen al entrar) */
const MINI = {
  linea: () => SV(300, 124, T(8, 18, "Comensal conectado", 11, C.t2, "start", 700) + Rc(8, 24, 284, 16, C.arena, 8) + `<g class="gh">${Rc(8, 24, 284 * M.usa_internet_pct / 100, 16, C.vino, 8)}</g>` + T(8, 66, "Negocio con sitio web", 11, C.t2, "start", 700) + Rc(8, 72, 284, 16, C.arena, 8) + `<g class="gh">${Rc(8, 72, 284 * sitioPct / 100, 16, C.dorado, 8)}</g>` + T(8 + 284 * M.usa_internet_pct / 100 - 4, 38, "83 %", 11, "#fff", "end", 700) + T(8 + 284 * sitioPct / 100 + 6, 85, "6 %", 11, C.dorado, "start", 700) + T(8, 112, "una brecha de 77 puntos", 11, C.t2)),
  mercado: () => { const tot = M.total, a = (tot - M.nucleo) / tot, b = (M.nucleo - M.zonas17) / tot; return SV(300, 124, [[a, C.arena], [b, C.gris], [1 - a - b, C.vino]].map(([f, c], i, arr) => { const x = 8 + 284 * arr.slice(0, i).reduce((s, q) => s + q[0], 0); return `<g class="gh" style="animation-delay:${i * 150}ms">${Rc(x, 36, 284 * f, 34, c, 6)}</g>`; }).join("") + T(8, 26, "773,860 restaurantes y bares", 11, C.t2, "start", 700) + T(292, 96, "≈ 100,000 clientes potenciales", 11.5, C.vino, "end", 700) + T(292, 114, "meta a 12 meses: 300", 11, C.dorado, "end", 700)); },
  matriz: () => { let b = ""; MX.filas.slice(0, 8).forEach((f, i) => { b += Rc(8, 4 + i * 14, 14 + f.precio / 1243 * 40, 11, C.vino, 4, `opacity="${0.25 + 0.75 * f.precio / 1243}"`); f.celdas.forEach((c, j) => { b += Rc(60 + j * 19, 4 + i * 14, 16, 11, c === "si" ? C.vino : c === "no" ? C.arena : "none", 4, c === "np" ? `stroke="${C.gris}" stroke-dasharray="2 2"` : ""); }); }); return SV(300, 124, b + Rc(60 + 2 * 19 - 2, 2, 20, 116, "none", 6, `stroke="${C.dorado}" stroke-width="2"`)); },
  disco: () => { const m = motor(S), mx = Math.max(...m.lim.map(l => l[1]), 1); return SV(300, 124, m.lim.map(([nom, v], i) => T(8, 24 + i * 34, nom, 11, C.t2, "start", 700) + Rc(104, 10 + i * 34, 188, 18, C.a2, 9) + `<g class="gh">${Rc(104, 10 + i * 34, 188 * Math.min(1, v / mx), 18, nom === m.cuello ? C.vino : C.dorado, 9)}</g>` + T(104 + 188 * Math.min(1, v / mx) - 6, 23 + i * 34, n(v), 10.5, "#fff", "end", 700)).join("") + T(8, 118, "el recurso más corto frena", 10.5, C.t2)); },
  topes: () => { const f = [["platillos", S.topePlatillos, MOD.interp(SP.empuja_platillos, S.topePlatillos)], ["mesas", S.topeMesas, MOD.interp(SP.empuja_mesas, S.topeMesas)], ["cuentas", S.topeCuentas, MOD.interp(SP.empuja_cuentas, S.topeCuentas)]]; return SV(300, 124, f.map(([a, t, p], i) => T(8, 22 + i * 36, `${a} ≤ ${t}`, 11.5, C.t2, "start", 700) + Rc(96, 8 + i * 36, 196, 18, C.arena, 9) + `<g class="gh">${Rc(96, 8 + i * 36, 196 * (1 - p), 18, C.vino, 9)}</g>` + T(96 + 196 * (1 - p) - 6, 21 + i * 36, `${n(100 - 100 * p)} % dentro`, 10.5, "#fff", "end", 700)).join("") + T(8, 120, "el resto paga o se ajusta", 10.5, C.t2)); },
  precio: () => { const X = v => 8 + 284 * v / 1300; let b = Rc(8, 50, 284, 10, C.arena, 5); const cols = ["#2e7aab", "#2a9d8f", "#7b5ea7", "#d95d39", "#5c8a3a", "#8d6e63"]; D.mercado_planes.filter(p => p.precio <= 1300).forEach((p, i) => { b += `<circle cx="${X(p.precio)}" cy="${55 + (i % 3 - 1) * 12}" r="5" fill="${cols[i % 6]}" opacity=".8"/>`; }); b += `<g class="gk">${Rc(X(S.precioServicio) - 2, 28, 4, 56, C.vino, 2)}</g>` + T(X(S.precioServicio), 22, "Carta", 12, C.vino, "middle", 700) + T(150, 112, "frente a 30 planes publicados", 11, C.t2, "middle"); return SV(300, 124, b); },
  sostiene: () => {
    const N = [1, 250, 500, 750, 1000], sl = v => Math.asinh(v / 1500), X = v => 14 + 270 * v / 1000, Y = v => 100 - 84 * (sl(clamp(v, -3000, 300000)) - sl(-3000)) / (sl(300000) - sl(-3000));
    const lin = (caso, col, w) => { const t = {...S, caso}; return `<polyline points="${N.map(k => `${X(k)},${Y(evalS(t, k).margen.pesos)}`).join(" ")}" fill="none" stroke="${col}" stroke-width="${w}"/>`; };
    return SV(300, 124, `<line x1="14" x2="290" y1="${Y(0)}" y2="${Y(0)}" stroke="${C.t2}"/>` + lin("peor", C.rojo, 2.5) + lin("esperado", C.vino, 3.5) + lin("mejor", C.verde, 2.5) + T(150, 118, "peor · esperado · mejor", 11, C.t2, "middle"));
  },
};
const CAJAS = [
  {id: "linea", q: "¿Está el negocio en línea?", c: "El comensal sí; 94 % de los negocios, no."},
  {id: "mercado", q: "¿Cuántos negocios hay?", c: "≈ 100,000 clientes potenciales."},
  {id: "matriz", q: "¿Qué existe y a qué precio?", c: "Nadie publica el pedido en grupo."},
  {id: "disco", q: "¿Qué llena el disco?", c: () => { const m = motor(S); return `Caben ${n(m.caben)}; frena ${m.cuello}.`; }},
  {id: "topes", q: "¿A quién deja dentro cada tope?", c: () => `Dentro del plan ${PLAN.gratis}: ${dentroTxt(motor(S))}.`},
  {id: "precio", q: "¿Cuánto se cobra frente a la competencia?", c: () => `${PLAN.paga} a ${mxn(S.precioServicio)}.`},
  {id: "sostiene", q: "¿Cómo se sostiene?", c: () => { const m = motor(S); return `${(m.margen < 0 ? "−" : "") + mxn(Math.abs(Math.round(m.margen)))} al mes con 1,000 restaurantes.`; }},
];
const RECS_CORTO = ["Master Chef a $299 frente a Fudo Avanzado", "Chef: 10 mesas, 3 cuentas, 80 platillos", "Historial: 12 meses en línea + archivo", "Soporte: $60 al mes por cliente de paga", "Anuncios no personalizados en Chef"];
function pintaCajas() {
  $("#grid").innerHTML = CAJAS.map(c => `<button class="box" data-id="${c.id}" aria-label="${esc(c.q)}"><div class="q">${esc(c.q)}</div><div class="m">${MINI[c.id]()}</div><div class="c">${esc(typeof c.c === "function" ? c.c() : c.c)}</div><div class="abre">toca para abrir ›</div></button>`).join("") +
    `<button class="box rec" data-id="recomendaciones"><div class="q">Recomendaciones</div><ol>${RECS_CORTO.map((t, i) => `<li><i>${i + 1}</i>${esc(t)}</li>`).join("")}</ol><div class="abre" style="margin-top:auto">toca para abrir ›</div></button>`;
}
