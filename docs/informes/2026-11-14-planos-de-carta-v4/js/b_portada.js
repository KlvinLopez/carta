/* ===== cabecera, barra de escenario, cifras y cajas ===== */
$("#oportunidad").textContent = "94 de cada 100 restaurantes a la carta y bares no declara sitio web; Carta les da, en minutos, un menú visual y una orden que la mesa arma junta.";
const sitioPct = 100 * M.nucleo_con_sitio / M.nucleo;

function pintaEscenario() {
  const m = motor(S);
  const chips = [
    ["precio", `Servicio <b>${mxn(S.precioServicio)}</b> · Salón <b>${mxn(S.precioSalon)}</b>`],
    ["topes", `Topes <b>${S.topePlatillos}</b> platillos · <b>${S.topeMesas}</b> mesas · <b>${S.topeCuentas}</b> cuentas`],
    ["disco", `Disco: <b>${S.palancas}</b> palanca${S.palancas === 1 ? "" : "s"} · ${NOMSERV(m.e)}`],
    ["precio", `Frente a <b>${S.sustituto}</b>`],
    ["sostiene", `Anuncios <b>${S.anuncios}</b>`],
  ];
  const clave = {Recomendado: "rec", "Peor caso": "peor", "Mejor caso": "mejor", "Mi escenario": "mio"};
  const html = `<span class="lab">Escenario</span>` +
    Object.entries(clave).map(([t, k]) => `<button class="btn" data-esc="${k}" aria-pressed="${S.nombre === t}">${t}${t === "Mi escenario" && MIO ? " ●" : ""}</button>`).join("") +
    chips.map(([k, h]) => `<button class="chip" data-ir="${k}">${h}</button>`).join("");
  $("#esc").innerHTML = html;
  const ed = $("#escDet"); if (ed) ed.innerHTML = `<button class="btn dor" data-cierra>← Volver</button>` + html;
}

const KPIS = [
  {id: "potenciales", cifra: () => "≈ " + n(M.servible), txt: "clientes potenciales (SAM)", tag: () => cita("carta_mercado")},
  {id: "caben", cifra: m => n(m().cabenG), txt: () => "clientes gratuitos caben · frena: " + motor(S).cuelloG, tag: () => cita("carta_anuncios")},
  {id: "sostiene", cifra: m => n(m().sostiene), txt: () => "gratuitos que sostiene cada cliente de paga", tag: () => "cuenta con el margen · supuesto"},
  {id: "anuncios", cifra: m => mxn(m().ads), txt: () => "al mes por cliente gratuito (anuncios, " + S.anuncios + ")", tag: () => "supuesto · " + cita("carta_anuncios")},
  {id: "ingreso", cifra: () => mxn(S.precioServicio), txt: () => "al mes por cliente de paga (Servicio)", tag: () => "propuesta · " + cita("carta_precio")},
  {id: "margen", cifra: m => n(m().margenPct) + " %", txt: () => "margen por cliente de paga (" + mxn(Math.round(motor(S).margen)) + ")", tag: () => cita("carta_tres_planes")},
];
function pintaKpis() {
  const mm = () => motor(S);
  const el = $("#kpis");
  if (!el.children.length) el.innerHTML = KPIS.map(k => `<button class="kpi" data-kpi="${k.id}" aria-label="${k.id}"><b></b><span></span><small></small></button>`).join("");
  KPIS.forEach((k, i) => { const c = el.children[i]; const tx = k.cifra(mm); $("b", c).textContent = tx; $("span", c).textContent = typeof k.txt === "function" ? k.txt(mm) : k.txt; $("small", c).textContent = "(" + k.tag() + ")"; });
}

/* minis (visual de cada caja; las barras crecen al entrar) */
const mBarras = (vals, cols, labs, mx, fmt = n) => SV(300, 124, vals.map((v, i) => { const h = 80 * v / mx; return `<g class="gk" style="animation-delay:${i * 90}ms">${Rc(14 + i * 72, 92 - h, 54, Math.max(h, 3), cols[i], 9)}</g>` + T(41 + i * 72, 86 - h, fmt(v), 13, C.vino, "middle", 700) + T(41 + i * 72, 110, labs[i], 10.5, C.t2, "middle"); }).join(""));
const MINI = {
  linea: () => SV(300, 124, T(8, 18, "Comensal conectado", 11, C.t2, "start", 700) + Rc(8, 24, 284, 16, C.arena, 8) + `<g class="gh">${Rc(8, 24, 284 * M.usa_internet_pct / 100, 16, C.vino, 8)}</g>` + T(8, 66, "Negocio con sitio web", 11, C.t2, "start", 700) + Rc(8, 72, 284, 16, C.arena, 8) + `<g class="gh">${Rc(8, 72, 284 * sitioPct / 100, 16, C.dorado, 8)}</g>` + T(8 + 284 * M.usa_internet_pct / 100 - 4, 38, "83 %", 11, "#fff", "end", 700) + T(8 + 284 * sitioPct / 100 + 6, 85, "6 %", 11, C.dorado, "start", 700) + T(8, 112, "una brecha de 77 puntos", 11, C.t2)),
  mercado: () => { const tot = M.total, a = 668978 / tot, b = 64010 / tot; return SV(300, 124, [[a, C.arena], [b, C.gris], [1 - a - b, C.vino]].map(([f, c], i, arr) => { const x = 8 + 284 * arr.slice(0, i).reduce((s, q) => s + q[0], 0); return `<g class="gh" style="animation-delay:${i * 150}ms">${Rc(x, 36, 284 * f, 34, c, 6)}</g>`; }).join("") + T(8, 26, "773,860 restaurantes y bares", 11, C.t2, "start", 700) + T(292, 96, "≈ 100,000 clientes potenciales", 11.5, C.vino, "end", 700) + T(292, 114, "meta a 12 meses: 100 a 1,000", 11, C.dorado, "end", 700)); },
  matriz: () => { let b = ""; MX.filas.slice(0, 8).forEach((f, i) => { b += Rc(8, 4 + i * 14, 20 + 6 * (f.precio % 14), 11, C.vino, 4, `opacity="${0.25 + 0.75 * f.precio / 1243}"`); f.celdas.forEach((c, j) => { b += Rc(60 + j * 19, 4 + i * 14, 16, 11, c === "si" ? C.vino : c === "no" ? C.arena : "none", 4, c === "np" ? `stroke="${C.gris}" stroke-dasharray="2 2"` : ""); }); }); return SV(300, 124, b + Rc(60 + 2 * 19 - 2, 2, 20, 116, "none", 6, `stroke="${C.dorado}" stroke-width="2"`)); },
  disco: () => mBarras(["P00", "P0", "P1", "P2"].map(k => palMap[k].paga), [C.gris, "#cdbba3", C.vino, C.osc], ["plan 03", "hoy", "30 d", "archivo"], 140),
  topes: () => SV(300, 124, [["platillos", 80, 10.8], ["mesas", 10, 39], ["cuentas", 3, 36]].map(([a, t, p], i) => T(8, 22 + i * 36, `${a} ≤ ${t}`, 11.5, C.t2, "start", 700) + Rc(96, 8 + i * 36, 196, 18, C.arena, 9) + `<g class="gh">${Rc(96, 8 + i * 36, 196 * (1 - p / 100), 18, C.vino, 9)}</g>` + T(96 + 196 * (1 - p / 100) - 6, 21 + i * 36, `${n(100 - p)} % dentro`, 10.5, "#fff", "end", 700)).join("") + T(8, 120, "el resto paga o se ajusta", 10.5, C.t2)),
  precio: () => { const X = v => 8 + 284 * v / 1300; let b = Rc(8, 50, 284, 10, C.arena, 5); const cols = ["#2e7aab", "#2a9d8f", "#7b5ea7", "#d95d39", "#5c8a3a", "#8d6e63"]; D.mercado_planes.filter(p => p.precio <= 1300).forEach((p, i) => { b += `<circle cx="${X(p.precio)}" cy="${55 + (i % 3 - 1) * 12}" r="5" fill="${cols[i % 6]}" opacity=".8"/>`; }); b += `<g class="gk">${Rc(X(299) - 2, 28, 4, 56, C.vino, 2)}</g>` + T(X(299), 22, "Carta", 12, C.vino, "middle", 700) + T(150, 112, "frente a 30 planes publicados", 11, C.t2, "middle"); return SV(300, 124, b); },
  sostiene: () => { const X = v => 14 + 270 * v / 1000, Y = v => 100 - 80 * (v + 3000) / 11000; const l = (fin, c, w) => `<polyline points="${X(0)},${Y(-2569)} ${X(1000)},${Y(Math.min(fin, 8000))}" fill="none" stroke="${c}" stroke-width="${w}"/>`; return SV(300, 124, `<line x1="14" x2="290" y1="${Y(0)}" y2="${Y(0)}" stroke="${C.t2}"/>` + l(3631, C.rojo, 2.5) + l(7727, C.vino, 3.5) + l(99999, C.verde, 2.5) + T(150, 118, "peor · esperado · mejor", 11, C.t2, "middle")); },
  recomendaciones: null,
};
const CAJAS = [
  {id: "linea", q: "¿Está el negocio en línea?", c: "El comensal sí; 94 % de los negocios, no."},
  {id: "mercado", q: "¿Cuántos negocios hay?", c: "≈ 100,000 clientes potenciales."},
  {id: "matriz", q: "¿Qué existe y a qué precio?", c: "Nadie publica el pedido en grupo."},
  {id: "disco", q: "¿Qué llena el disco?", c: "Archivar el historial multiplica por 9."},
  {id: "topes", q: "¿A quién deja dentro cada tope?", c: () => `Empuja a pagar a ≈ ${emTxt(motor(S))} (supuesto).`},
  {id: "precio", q: "¿Cuánto se cobra frente a la competencia?", c: () => `Servicio a ${mxn(S.precioServicio)}.`},
  {id: "sostiene", q: "¿Cómo se sostiene?", c: () => `Equilibrio con ${n(motor(S).equilibrioPagantes, 1)} clientes de paga por 1,000.`},
];
function pintaCajas() {
  const g = $("#grid");
  g.innerHTML = CAJAS.map(c => `<button class="box" data-id="${c.id}" aria-label="${esc(c.q)}"><div class="q">${esc(c.q)}</div><div class="m">${MINI[c.id]()}</div><div class="c">${esc(typeof c.c === "function" ? c.c() : c.c)}</div><div class="abre">toca para abrir ›</div></button>`).join("") +
    `<button class="box rec" data-id="recomendaciones"><div class="q">Recomendaciones</div><ol>${RECS.map((r, i) => `<li><i>${i + 1}</i>${esc(r.corto)}</li>`).join("")}</ol><div class="abre" style="margin-top:auto">toca para abrir ›</div></button>`;
}
