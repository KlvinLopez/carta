"use strict";
/* ===== utilidades ===== */
const NS = "http://www.w3.org/2000/svg";
const M = D.mercado, DI = D.disco, PL = D.planes, PR = D.precio, MX = D.matriz, SERV = D.escalones;
const C = {vino: "#6b2d3e", osc: "#4f1728", dorado: "#b8860b", tinta: "#1a1a1a", t2: "#5b4a3d", arena: "#e6d9c6", a2: "#f3eadb", azul: "#2e7aab", gris: "#b9afa3", verde: "#3f6b3b", rojo: "#9b2c2c", blanco: "#ffffff"};
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const TC = 18.6188; // pesos por dólar (FIX de Banxico, 12 nov.)
const n = (x, d = 0) => Number(x).toLocaleString("en-US", {minimumFractionDigits: d, maximumFractionDigits: d});
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const lg = v => Math.log10(v);
const mxn = v => "$" + n(v);
const T = (x, y, s, size = 12, fill = C.tinta, anchor = "start", w = 400, serif = false, extra = "") =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${w}"${serif ? ' font-family="DM Serif Display, serif"' : ""} ${extra}>${esc(s)}</text>`;
const Rc = (x, y, w, h, fill, rx = 6, ex = "") => `<rect x="${x}" y="${y}" width="${Math.max(w, 0)}" height="${h}" rx="${rx}" fill="${fill}" ${ex}/>`;
const SV = (w, h, body, ex = "") => `<svg viewBox="0 0 ${w} ${h}" role="img" font-family="DM Sans, sans-serif" ${ex}>${body}</svg>`;
const dona = (cx, cy, r, pct, col, g = 26) => {
  const c = 2 * Math.PI * r;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.arena}" stroke-width="${g}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="${g}" stroke-dasharray="${(c * pct / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`;
};
function cita(...ks) { return ks.map(k => R[k].corta).join("; "); }
function fuentes(ks) {
  return `<div class="fuentes"><b>Fuentes</b><ul>${ks.map(k => {
    const r = R[k], u = (r.url.match(/https?:\/\/[^\s)]+/) || [])[0];
    return `<li>${u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(r.corta)}</a>` : esc(r.corta)}. ${esc(r.titulo)}. ${u ? "" : esc(r.url)}</li>`;
  }).join("")}</ul></div>`;
}
const cifras = a => `<div class="cifras">${a.map(([b, s, tag]) => `<div class="cifra"><b>${b}</b><span>${s}</span>${tag ? `<span class="et">${tag}</span>` : ""}</div>`).join("")}</div>`;

/* ===== «retained mode»: elementos con clave que se mueven en lugar de reaparecer ===== */
function RM(svg) {
  const m = new Map();
  return {
    put(key, tag, a = {}) {
      let e = m.get(key), nuevo = false;
      if (!e) { e = document.createElementNS(NS, tag); e.setAttribute("class", "rm"); svg.appendChild(e); m.set(key, e); nuevo = true; }
      const st = e.style;
      if (tag === "rect") {
        const w = a.w ?? 0, h = a.h ?? 0;
        if (nuevo && !REDUCE && a.grow !== false) { st.width = "0px"; st.height = a.grow === "v" ? "0px" : h + "px"; st.transform = `translate(${a.x}px,${a.y + (a.grow === "v" ? h : 0)}px)`; e.getBoundingClientRect(); }
        st.width = w + "px"; st.height = h + "px"; st.transform = `translate(${a.x}px,${a.y}px)`;
        if (a.rx != null) e.setAttribute("rx", a.rx);
      } else if (tag === "circle") {
        e.setAttribute("r", a.r ?? 5); st.transform = `translate(${a.x}px,${a.y}px)`;
      } else if (tag === "text") {
        st.transform = `translate(${a.x}px,${a.y}px)${a.rot ? ` rotate(${a.rot}deg)` : ""}`;
        if (a.text != null && e.textContent !== String(a.text)) e.textContent = a.text;
        e.setAttribute("font-size", a.size ?? 12); e.setAttribute("text-anchor", a.anchor ?? "start"); e.setAttribute("font-weight", a.weight ?? 400);
        if (a.serif) e.setAttribute("font-family", "DM Serif Display, serif");
      } else if (tag === "path" || tag === "line") {
        for (const k of ["d", "x1", "y1", "x2", "y2"]) if (a[k] != null) e.setAttribute(k, a[k]);
        e.setAttribute("fill", a.fill ?? "none");
      } else if (tag === "g") { st.transform = `translate(${a.x ?? 0}px,${a.y ?? 0}px)`; }
      if (a.fill != null && tag !== "path" && tag !== "line") st.fill = a.fill;
      if (a.stroke != null) { st.stroke = a.stroke; e.setAttribute("stroke-width", a.sw ?? 1); if (a.dash) e.setAttribute("stroke-dasharray", a.dash); }
      if (a.op != null) st.opacity = a.op;
      if (a.cursor) st.cursor = a.cursor;
      if (a.attrs) for (const [k, v] of Object.entries(a.attrs)) e.setAttribute(k, v);
      if (a.title != null && !e.__t) { const t = document.createElementNS(NS, "title"); e.appendChild(t); e.__t = t; }
      if (a.title != null) e.__t.textContent = a.title;
      return e;
    },
    remove(key) { const e = m.get(key); if (e) { e.remove(); m.delete(key); } },
    get: k => m.get(k),
  };
}
function contador(el, hasta, fmt = v => n(v)) { // el número cambia con animación
  const desde = el.__v ?? hasta; el.__v = hasta;
  if (REDUCE || desde === hasta) { el.textContent = fmt(hasta); return; }
  const t0 = performance.now();
  const paso = t => { const k = clamp((t - t0) / 450, 0, 1), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(desde + (hasta - desde) * e); if (k < 1) requestAnimationFrame(paso); };
  requestAnimationFrame(paso);
}
// arrastre de un asa dentro de un SVG: onMove(xEnUnidadesDelViewBox)
function arrastrable(el, svg, onMove, onKey) {
  el.setAttribute("tabindex", "0"); el.setAttribute("data-drag", "1"); el.setAttribute("role", "slider");
  const aX = ev => { const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
  el.addEventListener("pointerdown", ev => { el.setPointerCapture(ev.pointerId); el.__d = true; ev.preventDefault(); onMove(aX(ev), ev); });
  el.addEventListener("pointermove", ev => { if (el.__d) onMove(aX(ev), ev); });
  el.addEventListener("pointerup", () => { el.__d = false; });
  el.addEventListener("pointercancel", () => { el.__d = false; });
  if (onKey) el.addEventListener("keydown", ev => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(ev.key)) { ev.preventDefault(); onKey(ev.key === "ArrowRight" || ev.key === "ArrowUp" ? 1 : -1, ev.shiftKey ? 5 : 1); } });
}
const tt = $("#tt");
function tip(e) {
  const t = e.target.closest ? e.target.closest("[data-tip]") : null;
  if (!t) { tt.hidden = true; return; }
  tt.textContent = t.dataset.tip; tt.hidden = false;
  const r = t.getBoundingClientRect();
  tt.style.left = clamp(r.left + r.width / 2 - 140, 8, innerWidth - 292) + "px";
  tt.style.top = Math.max(8, r.top - tt.offsetHeight - 8) + "px";
}
document.addEventListener("mouseover", tip); document.addEventListener("focusin", tip);
document.addEventListener("mouseout", e => { if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest("[data-tip]")) tt.hidden = true; });

/* ===== escenario global (estado que persiste y recalcula todo) ===== */
const ORD = ["P1", "P2", "P3", "P4", "P5"];
const palMap = Object.fromEntries(DI.palancas.map(p => [p.clave, p]));
const SUST = PR.sustitutos; // Meniu 225, Fudo Avanzado 652, Fudo + mesas 745
const PRESETS = {
  rec: {nombre: "Recomendado", precioServicio: 299, precioSalon: 399, topePlatillos: 80, topeMesas: 10, topeCuentas: 3, palancas: 2, servidor: 1, anuncios: "medio", sustituto: "Fudo Avanzado", K: 0.5, soporte: 60, conv: 10},
  peor: {nombre: "Peor caso", precioServicio: 249, precioSalon: 249, topePlatillos: 120, topeMesas: 40, topeCuentas: 20, palancas: 0, servidor: 0, anuncios: "bajo", sustituto: "Meniu", K: 0.5, soporte: 150, conv: 5},
  mejor: {nombre: "Mejor caso", precioServicio: 349, precioSalon: 599, topePlatillos: 40, topeMesas: 10, topeCuentas: 3, palancas: 4, servidor: 3, anuncios: "alto", sustituto: "Fudo + mesas", K: 0.5, soporte: 30, conv: 20},
};
const LS = "carta-v5-escenario";
let S = {...PRESETS.rec};
let MIO = null; // «Mi escenario»: lo último que editó la persona
try { const g = JSON.parse(localStorage.getItem(LS) || "null"); if (g && g.S) { S = {...PRESETS.rec, ...g.S}; MIO = g.MIO || null; } } catch (e) { /* sin almacenamiento: queda en memoria */ }
const oyentes = [];
function emitir() {
  try { localStorage.setItem(LS, JSON.stringify({S, MIO})); } catch (e) { /* ignorar */ }
  oyentes.forEach(f => f());
}
function cambiar(parche, manual = true) { // manual: lo editó la persona
  S = {...S, ...parche};
  if (manual) { S.nombre = "Mi escenario"; MIO = {...S}; }
  emitir();
}
function aplicar(clave) {
  if (clave === "mio") S = MIO ? {...MIO} : {...S, nombre: "Mi escenario"};
  else S = {...PRESETS[clave]};
  emitir();
}

/* ===== motor provisional (se sustituye por docs/research/2026-11-14-modelo-de-escenarios.mjs cuando llegue) ===== */
function interp(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  return pts[pts.length - 1][1];
}
const COB = PL.cobertura_platillos.map(c => [c.tope, c.total_empuja_pct]);
const PTS_MESAS = [[10, 39], [40, 2.9]]; // supuesto: entre el punto del estudio (10 mesas) y la cuota de Salón del DENUE (31+ personas)
const PTS_CUENTAS = [[3, 36], [20, 2.9]];
const F = PR.formula;
const piso = (p, s) => F.costo_var_mediano + F.fijo + (F.stripe_pct * p * (1 + F.iva) + F.stripe_fijo) * (1 + F.iva) + s;
function reglaPrecio(Sx, K, s) { let p = K * Sx; for (let i = 0; i < 40; i++) p = Math.max(3 * piso(p, s), K * Sx); return p; }
function redondea(p, s) { if (p < 100) return Math.round(p); let b = Math.floor(p / 50) * 50 - 1; while (b < 3 * piso(b, s)) b += 50; return b; }
function motor(s) {
  const e = SERV[s.servidor], act = s.palancas ? ORD[s.palancas - 1] : "P0", p = palMap[act], p0 = palMap.P0, hobby = e.plan === "hobby";
  const lim = (cpu, disco, con) => [["procesador", cpu], ["disco", disco], ["conexiones abiertas", con]];
  const dG = hobby ? Math.round(e.disco_g * p.gratuito / p0.gratuito) : Infinity;
  const dP = hobby ? Math.round(e.disco_p * p.paga / p0.paga) : Infinity;
  const limG = lim(e.cpu_g, dG, e.con_g), limP = lim(e.cpu_p, dP, e.con_p);
  const minim = l => l.reduce((a, b) => (b[1] < a[1] ? b : a));
  const [cuelloG, cabenG] = minim(limG), [cuelloP, cabenP] = minim(limP);
  const pm = interp(PTS_MESAS, s.topeMesas), pc = interp(PTS_CUENTAS, s.topeCuentas), pp = interp(COB, s.topePlatillos);
  const emp = Math.max(pm, pc, pp);
  const f = emp / 100 * s.conv / 100; // fracción de clientes de paga entre los registrados
  const pisoS = piso(s.precioServicio, s.soporte), margen = s.precioServicio - pisoS;
  const ads = D.anuncios_mxn[s.anuncios];
  const costoGrat = PL.planes.Gratuito.costo; // pesos al mes por cliente gratuito (documento planes-y-costo)
  const fijo = PL.costo_fijo_1000;
  const VARG = 1.0; // [documento] costo variable de un cliente gratuito, pesos al mes (planes-y-costo)
  const neto = N => N * f * margen + N * (1 - f) * (ads - VARG) - fijo;
  return {e, act, limG, limP, cabenG, cabenP, cuelloG, cuelloP, pm, pc, pp, emp, f, pisoS, margen, margenPct: 100 * margen / s.precioServicio, ads, costoGrat,
    sostiene: margen / costoGrat, equilibrioPagantes: fijo / margen, pagantes1000: 1000 * f, neto, fijo, usd: e.usd};
}
const emTxt = m => `${n(m.emp, 1)} %`;
const NOMSERV = e => `${e.procesos} procesos · ${e.plan === "pro" ? "Pro" : "Hobby"}`;

/* ===== marco del detalle ===== */
const DET = {};
let abierto = null, actual = null, ultimoFoco = null;
const det = $("#det");
function abre(id, atras = true) {
  const d = DET[id]; if (!d) return;
  if (atras) ultimoFoco = document.activeElement;
  abierto = id;
  det.hidden = false; document.body.style.overflow = "hidden";
  const t = typeof d.titulo === "function" ? d.titulo() : d.titulo;
  det.innerHTML = `<div class="esc" style="padding-inline:max(16px,env(safe-area-inset-left,0px))"><div class="fila" id="escDet"></div></div><div class="dd"><h2 id="dt">${esc(t)}</h2><div class="leyenda" id="ley"></div><p class="desliza">Desliza la gráfica de lado →</p><div id="cuerpo"></div><div id="cif"></div><div class="insight" id="ins"></div>${d.nota ? `<p class="nota">${esc(d.nota)}</p>` : ""}${fuentes(d.fu)}</div>`;
  actual = d; pintaEscenario(); d.montar($("#cuerpo", det), det);
  refrescar(); det.scrollTop = 0; $("[data-cierra]", det).focus();
  if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
}
function refrescar() {
  if (!abierto || !actual) return;
  const out = actual.actualizar ? actual.actualizar() : null;
  if (out && out.cifras) $("#cif", det).innerHTML = cifras(out.cifras);
  if (out && out.leyenda) $("#ley", det).innerHTML = out.leyenda;
  if (out && out.insight) $("#ins", det).innerHTML = `<b>Insight clave.</b> ${esc(out.insight)}`;
  if (out && out.titulo) $("#dt", det).textContent = out.titulo;
}
function cierra() { det.hidden = true; det.innerHTML = ""; abierto = null; actual = null; document.body.style.overflow = ""; tt.hidden = true; history.replaceState(null, "", location.pathname); if (ultimoFoco && document.contains(ultimoFoco)) ultimoFoco.focus(); }
// delegación: todo clic de «cerrar» y de «ir a otra caja» funciona aunque el contenido se redibuje
document.addEventListener("click", e => {
  const c = e.target.closest("[data-cierra]"); if (c) { cierra(); return; }
  const ir = e.target.closest("[data-ir]"); if (ir) { abre(ir.dataset.ir, false); return; }
  const ap = e.target.closest("[data-aplica]"); if (ap) { cambiar(JSON.parse(ap.dataset.aplica)); return; }
  const k = e.target.closest("[data-kpi]"); if (k) { abre("k_" + k.dataset.kpi); return; }
  const b = e.target.closest(".box"); if (b && !abierto) { abre(b.dataset.id); return; }
  const es = e.target.closest("[data-esc]"); if (es) { aplicar(es.dataset.esc); return; }
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("#intro").hidden) { cerrarIntro(); return; }
  if (e.key === "Escape" && abierto) cierra();
  if (e.key === "Tab" && abierto) { const f = $$("button,input,select,a[href],[tabindex='0']", det).filter(x => !x.disabled); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
});
