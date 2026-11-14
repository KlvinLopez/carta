/* ===== cabecera, barra de escenario, cifras y cajas ===== */
$("#oportunidad").textContent = "94 de cada 100 restaurantes a la carta no declara sitio web.";
const sitioPct = 100 * M.nucleo_con_sitio / M.nucleo;

function pintaEscenario() { // sólo el encabezado del detalle: volver y pantalla completa
  const ed = $("#escDet"); if (ed) ed.innerHTML = `<button class="btn dor" data-cierra>← Volver</button><span style="flex:1"></span>${BTN_PANTALLA}`;
}

const mp = v => (v < 0 ? "−" : "") + mxn(Math.abs(Math.round(v)));
/* los tres escenarios a la vez, tal como los entrega `resumen` del modelo: recomendado (vino), peor (rojo) y mejor (verde) */
const fila = (r, k) => r.cifras.find(c => c.clave === k);
const pesos = v => (v == null ? "—" : mxn(Math.round(v * 10) / 10));
const KPIS = [
  {id: "potenciales", clave: "clientes_potenciales", f: v => n(v), txt: "clientes potenciales (SAM)", solo: true},
  {id: "caben", clave: "restaurantes_que_caben", f: v => n(v), txt: "restaurantes gratuitos caben con eventos (Fase 3)", ps: ["hoy (sondeo)", "con servidor grande"], neutro: true},
  {id: "sostiene", clave: "gratuitos_por_cliente_de_paga", f: v => (v == null ? "—" : n(v)), txt: "gratuitos que sostiene cada cliente de paga, sin anuncios"},
  {id: "anuncios", clave: "ingreso_por_cliente_gratuito", f: pesos, txt: "al mes por cliente gratuito en anuncios"},
  {id: "ingreso", clave: "ingreso_por_cliente_de_paga", f: pesos, txt: "al mes por cliente de paga"},
  {id: "margen", clave: "margen_de_operacion", f: v => mp(v), txt: "de margen al mes con 1,000 restaurantes"},
];
function pintaKpis() {
  const r = resumenS(S), el = $("#kpis");
  el.innerHTML = KPIS.map(k => {
    const c = fila(r, k.clave), tip = `${c.nota}. Recomendado: ${r.definiciones.recomendado}. Peor: ${r.definiciones.peor}. Mejor: ${r.definiciones.mejor}.`;
    const tri = k.solo ? "" : `<span class="tri${k.neutro ? " ne" : ""}"><i class="p">${k.ps ? k.ps[0] : "peor"} ${k.f(c.peor)}</i><i class="m">${k.ps ? k.ps[1] : "mejor"} ${k.f(c.mejor)}</i>${c.piso_de_verdad != null && !k.neutro ? `<i class="pv">piso ${k.f(c.piso_de_verdad)}</i>` : ""}</span>`;
    return `<button class="kpi" data-kpi="${k.id}" aria-label="${k.id}" data-tip="${esc(tip)}"><b>${k.f(c.recomendado)}</b>${tri}<span class="tx">${esc(k.txt)}</span></button>`;
  }).join("");
}

/* minis (visual de cada caja; las barras crecen al entrar) */
const MINI = {
  linea: () => { let b = ""; M.estratos.forEach((e, i) => { const y = 6 + i * 16; b += Rc(8, y, 240, 10, C.a2, 5) + `<g class="gh">${Rc(8, y, 240 * e.pct_sitio / 100, 10, C.dorado, 5)}</g>`; }); const x = 8 + 240 * M.usa_internet_pct / 100; return SV(300, 124, b + `<rect x="${x - 1}" y="2" width="2.4" height="112" fill="${C.vino}"/>` + Rc(x - 8, 114, 16, 9, C.vino, 3)); },
  mercado: () => { const tot = M.total, a = M.nucleo / tot; return SV(300, 124, Rc(8, 8, 284, 22, C.arena, 8) + `<g class="gh">${Rc(8, 8, 284 * a, 22, C.vino2 ?? C.vino, 8)}</g>` + Rc(8, 50, 284, 22, C.arena, 8) + `<g class="gh" style="animation-delay:.2s">${Rc(8, 50, 284 * M.servible / M.nucleo, 22, C.vino, 8)}</g>` + `<g class="gk" style="animation-delay:.4s">${Rc(8, 92, 6, 22, C.dorado, 3)}</g>` + T(24, 108, "300", 12, C.dorado, "start", 700)); },
  matriz: () => { let b = ""; MX.filas.slice(0, 8).forEach((f, i) => { b += Rc(8, 4 + i * 14, 14 + f.precio / 1243 * 40, 11, C.vino, 4, `opacity="${0.25 + 0.75 * f.precio / 1243}"`); f.celdas.forEach((c, j) => { b += Rc(60 + j * 19, 4 + i * 14, 16, 11, c === "si" ? C.vino : c === "no" ? C.arena : "none", 4, c === "np" ? `stroke="${C.gris}" stroke-dasharray="2 2"` : ""); }); }); return SV(300, 124, b + Rc(60 + 2 * 19 - 2, 2, 20, 116, "none", 6, `stroke="${C.dorado}" stroke-width="2"`)); },
  disco: () => { const m = motor(S), mx = Math.max(...m.lim.map(l => l[1]), 1), cor = {"conexiones abiertas": "conexiones"}; return SV(300, 124, m.lim.map(([nom, v], i) => T(8, 24 + i * 34, cor[nom] || nom, 11, C.t2, "start", 700) + Rc(96, 10 + i * 34, 196, 18, C.a2, 9) + `<g class="gh">${Rc(96, 10 + i * 34, 196 * Math.min(1, v / mx), 18, nom === m.cuello ? C.vino : C.dorado, 9)}</g>` + T(286, 23 + i * 34, n(v), 10.5, C.tinta, "end", 700)).join("") + T(8, 118, "el recurso más corto frena", 10.5, C.t2)); },
  topes: () => { const c = config(S), mx = Math.sqrt(Math.max(...SEG.estratos.map(e => e.negocios))); let g = ""; SEG.estratos.forEach((e, i) => { const h = 20 + 80 * Math.sqrt(e.negocios) / mx, p = planDe(e, c); g += `<g class="gk" style="animation-delay:${i * 60}ms">${Rc(10 + i * 40, 112 - h, 32, h, [C.vino, C.dorado, C.osc][p], 8)}</g>`; }); return SV(300, 124, g); },
  precio: () => { const X = v => 8 + 284 * v / 1300; let b = Rc(8, 50, 284, 10, C.arena, 5); const cols = ["#2e7aab", "#2a9d8f", "#7b5ea7", "#d95d39", "#5c8a3a", "#8d6e63"]; D.mercado_planes.filter(p => p.precio <= 1300).forEach((p, i) => { b += `<circle cx="${X(p.precio)}" cy="${55 + (i % 3 - 1) * 12}" r="5" fill="${cols[i % 6]}" opacity=".8"/>`; }); b += `<g class="gk">${Rc(X(S.precioServicio) - 2, 28, 4, 56, C.vino, 2)}</g>` + T(X(S.precioServicio), 22, "Carta", 12, C.vino, "middle", 700) + T(150, 112, "frente a 30 planes publicados", 11, C.t2, "middle"); return SV(300, 124, b); },
  pagar: () => { const t = D.inegi_tamano, lo = lg(50000), hi = lg(10000000); return SV(300, 124, t.map((x, i) => T(8, 22 + i * 28, x.estrato, 10.5, C.t2, "start", 700) + Rc(70, 8 + i * 28, 220 * (lg(x.ingreso) - lo) / (hi - lo), 14, C.vino, 6) + Rc(70, 24 + i * 28 - 2, 220 * (lg(x.excedente) - lo) / (hi - lo), 6, C.dorado, 3)).join("") + T(8, 120, "ingreso (vino) y excedente (dorado)", 10.5, C.t2)); },
  sostiene: () => {
    const N = [1, 100, 250, 500, 750, 1000], sl = v => Math.asinh(v / 1500), X = v => 14 + 270 * v / 1000, Y = v => 100 - 84 * (sl(clamp(v, -3000, 300000)) - sl(-3000)) / (sl(300000) - sl(-3000));
    const lin = (caso, col, w) => `<polyline points="${N.map(k => `${X(k)},${Y(ev3(S, caso, k).margen_operacion)}`).join(" ")}" fill="none" stroke="${col}" stroke-width="${w}"/>`;
    return SV(300, 124, `<line x1="14" x2="290" y1="${Y(0)}" y2="${Y(0)}" stroke="${C.t2}"/>` + lin("peor", C.rojo, 2.5) + lin("rec", C.vino, 3.5) + lin("mejor", C.verde, 2.5) + T(150, 118, "peor · recomendado · mejor", 11, C.t2, "middle"));
  },
};
const CAJAS = [
  {id: "linea", q: "¿Está el negocio en línea?", c: "El comensal sí; 94 % de los negocios, no."},
  {id: "mercado", q: "¿Cuántos negocios hay?", c: () => `${n(M.nucleo)} clientes potenciales (SAM).`},
  {id: "matriz", q: "¿Qué existe y a qué precio?", c: "Ninguna página leída publica el pedido en grupo."},
  {id: "disco", q: "¿Qué llena el disco?", c: () => { const m = motor(S); return `Caben ${n(m.caben)}; frena ${m.cuello}.`; }},
  {id: "topes", q: "¿A quién deja dentro cada tope?", c: () => `Dentro del plan ${PLAN.gratis}: ${dentroTxt(motor(S))}.`},
  {id: "precio", q: "¿Cuánto se cobra frente a la competencia?", c: () => `${PLAN.paga} a ${mxn(S.precioServicio)}.`},
  {id: "pagar", q: "¿Cuánto puede pagar un restaurante?", c: () => `${(100 * S.precioServicio / D.inegi_tamano[1].ingreso).toFixed(2)} % del ingreso de uno de 11 a 50 personas.`},
  {id: "sostiene", q: "¿Cómo se sostiene?", c: () => { const m = motor(S); return `${mp(m.margen)} al mes de margen con 1,000 restaurantes.`; }},
];
const RECS_CORTO = ["Master Chef a $225", "Chef gratis: 25 mesas, 4 cuentas", "12 meses de historial para Master Chef", "Soporte por WhatsApp: $60", "Anuncios en Chef desde el mes 9"];
function pintaCajas() {
  const rec = `<button class="box rec" data-id="recomendaciones" style="--i:0"><div class="q">Recomendaciones</div><ol>${RECS_CORTO.map((t, i) => `<li><i>${i + 1}</i>${esc(t)}</li>`).join("")}</ol><div class="abre" style="margin-top:auto">toca para abrir ›</div></button>`;
  $("#grid").innerHTML = rec + CAJAS.map((c, i) => `<button class="box" data-id="${c.id}" style="--i:${i + 1}" aria-label="${esc(c.q)}"><div class="q">${esc(c.q)}</div><div class="m">${MINI[c.id]()}</div><div class="c">${esc(typeof c.c === "function" ? c.c() : c.c)}</div><div class="abre">toca para abrir ›</div></button>`).join("");
}
