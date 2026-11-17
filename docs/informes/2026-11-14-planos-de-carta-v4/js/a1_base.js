"use strict";
/* ===== utilidades ===== */
const NS = "http://www.w3.org/2000/svg";
const M = D.mercado, MX = D.matriz;
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
/* un hover es un panel escrito como contenido: título · LA cifra · una mini visual · una frase (≤ 20 palabras).
   `data-tip="título|cifra|frase"`; sin «|» sale sólo el título (para las acciones). Mini visual opcional:
   `data-tipp="0.39"` barra de proporción · `data-tipv="tri:etiqueta|número|texto;…"` barras comparadas (negativo en rojo) ·
   `data-tipv="ico:4/10"` diez íconos con 4 llenos · `data-tipv="sp:1,2,3"` chispa de tendencia. Nada se parte solo. */
const pal20 = (t, m = 20) => { const w = String(t).split(/\s+/); return w.length <= m ? String(t) : w.slice(0, m).join(" ").replace(/[,;:]$/, "") + "…"; };
function visTip(v, prop) {
  if (v) {
    const [k, d] = [v.slice(0, v.indexOf(":")), v.slice(v.indexOf(":") + 1)];
    if (k === "tri") { const f = d.split(";").map(x => x.split("|")), mx = Math.max(...f.map(q => Math.abs(+q[1])), 1e-9); return `<span class="tt-r">${f.map(q => `<span class="tt-l">${esc(q[0])}</span><span class="tt-b${+q[1] < 0 ? " neg" : ""}"><i style="width:${clamp(100 * Math.abs(+q[1]) / mx, 2, 100)}%"></i></span><span class="tt-n">${esc(q[2])}</span>`).join("")}</span>`; }
    if (k === "ico") { const [a, z] = d.split("/").map(Number); return `<span class="tt-ic">${Array.from({length: z}, (_, i) => `<i class="${i < a ? "on" : ""}"></i>`).join("")}</span>`; }
    if (k === "sp") { const q = d.split(",").map(Number), mn = Math.min(...q), mx = Math.max(...q, mn + 1e-9); return `<svg class="tt-sp" viewBox="0 0 120 32" preserveAspectRatio="none"><polyline points="${q.map((y, i) => `${(120 * i / Math.max(q.length - 1, 1)).toFixed(1)},${(28 - 24 * (y - mn) / (mx - mn)).toFixed(1)}`).join(" ")}" fill="none" stroke="#b8860b" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`; }
  }
  return prop != null && prop !== "" ? `<span class="tt-b"><i style="width:${clamp(100 * +prop, 0, 100)}%"></i></span>` : "";
}
function armaPanel(txt, prop, vis) {
  const q = txt.split("|"), tit = q[0], cif = q[1] || "", fra = q.slice(2).join(" ");
  return `<span class="tt-i"></span>${tit ? `<b class="tt-t">${esc(tit)}</b>` : ""}${cif ? `<span class="tt-c">${esc(cif)}</span>` : ""}${visTip(vis, prop)}${fra ? `<p>${esc(fra)}</p>` : ""}`;
}
let ttEl = null;
function colocaPanel(t) {
  const r = t.getBoundingClientRect(), w = tt.offsetWidth, h = tt.offsetHeight;
  let x = clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8), y = r.top - h - 12;
  if (y < 8) y = Math.min(r.bottom + 12, innerHeight - h - 8);
  tt.style.left = x + "px"; tt.style.top = Math.max(8, y) + "px";
  tt.dataset.lado = y < 8 ? "abajo" : "arriba"; tt.style.setProperty("--ax", clamp(r.left + r.width / 2 - x, 20, w - 20) + "px");
  tt.style.animation = "none"; void tt.offsetWidth; tt.style.animation = "";
}
document.addEventListener("keydown", e => { if (e.key === "Escape" && !tt.hidden) { tt.hidden = true; ttEl = null; } });
function tip(e) {
  const t = e.target.closest ? e.target.closest("[data-tip]") : null;
  if (!t) { tt.hidden = true; ttEl = null; return; }
  if (t === ttEl && !tt.hidden) return;
  ttEl = t; tt.innerHTML = armaPanel(t.dataset.tip, t.dataset.tipp, t.dataset.tipv); tt.hidden = false; colocaPanel(t);
}
document.addEventListener("mouseover", tip); document.addEventListener("focusin", tip);
document.addEventListener("mouseout", e => { if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest("[data-tip]")) { tt.hidden = true; ttEl = null; } });
/* en teléfono no hay hover: un toque abre el panel y otro toque fuera lo cierra */
document.addEventListener("pointerdown", e => { if (e.pointerType === "mouse") return; const t = e.target.closest ? e.target.closest("[data-tip]") : null; if (t) { if (t === ttEl && !tt.hidden) { tt.hidden = true; ttEl = null; } else { ttEl = t; tt.innerHTML = armaPanel(t.dataset.tip, t.dataset.tipp, t.dataset.tipv); tt.hidden = false; colocaPanel(t); } } else { tt.hidden = true; ttEl = null; } });
addEventListener("scroll", () => { if (!tt.hidden && ttEl && !document.body.contains(ttEl)) { tt.hidden = true; ttEl = null; } }, {passive: true});

/* ===== pantalla completa (se oculta si el visor no la permite) ===== */
const FSOK = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
function pantalla() {
  const d = document, el = d.documentElement;
  try {
    if (d.fullscreenElement || d.webkitFullscreenElement) { const r = (d.exitFullscreen || d.webkitExitFullscreen).call(d); if (r && r.catch) r.catch(() => {}); }
    else { const r = (el.requestFullscreen || el.webkitRequestFullscreen).call(el); if (r && r.catch) r.catch(() => {}); }
  } catch (e) { /* el visor no lo permite */ }
}
const BTN_PANTALLA = FSOK ? `<button class="btn" data-pantalla="1" aria-label="Pantalla completa" title="Pantalla completa">⛶</button>` : "";

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
  det.innerHTML = `<div class="esc" style="padding-inline:max(16px,env(safe-area-inset-left,0px))"><div class="fila" id="escDet"></div></div><div class="kpis kpisDet" id="kpisDet"></div><div class="dd"><h2 id="dt">${esc(t)}</h2><div class="leyenda" id="ley"></div><p class="desliza">Desliza la gráfica de lado →</p><div id="cuerpo"></div><div id="cif"></div><div class="insight" id="ins"></div>${d.nota ? `<p class="nota">${esc(d.nota)}</p>` : ""}${fuentes(d.fu)}</div>`;
  actual = d; pintaEscenario(); pintaKpis(); d.montar($("#cuerpo", det), det);
  refrescar(); if (d.arranca) d.arranca(); det.scrollTop = 0; $("[data-cierra]", det).focus();
  if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
}
function refrescar() {
  if (typeof pintaCaps === "function") pintaCaps();
  if (!abierto || !actual) return;
  const out = actual.actualizar ? actual.actualizar() : null;
  if (out && out.cifras) $("#cif", det).innerHTML = cifras(out.cifras);
  if (out && out.leyenda) $("#ley", det).innerHTML = out.leyenda;
  if (out && out.puntos) $("#ins", det).innerHTML = `<b>Insight clave.</b><ol>${out.puntos.map(p => `<li>${p}</li>`).join("")}</ol>`;
  else if (out && out.insight) $("#ins", det).innerHTML = `<b>Insight clave.</b> ${esc(out.insight)}`;
  if (out && out.titulo) $("#dt", det).textContent = out.titulo;
}
function cierra() { det.hidden = true; det.innerHTML = ""; abierto = null; actual = null; document.body.style.overflow = ""; tt.hidden = true; history.replaceState(null, "", location.pathname); if (ultimoFoco && document.contains(ultimoFoco)) ultimoFoco.focus(); }
// delegación: todo clic de «cerrar» y de «ir a otra caja» funciona aunque el contenido se redibuje
document.addEventListener("click", e => {
  const c = e.target.closest("[data-cierra]"); if (c) { cierra(); return; }
  const ir = e.target.closest("[data-ir]"); if (ir) { abre(ir.dataset.ir, false); return; }
  const ap = e.target.closest("[data-aplica]"); if (ap) { cambiar(JSON.parse(ap.dataset.aplica)); return; }
  const k = e.target.closest("[data-kpi]"); if (k) { const ir = {potenciales: "mercado2", caben: "recursos7"}[k.dataset.kpi]; if (ir) irCap(ir); else abre("k_" + k.dataset.kpi); return; }
  
  if (e.target.closest("[data-pantalla]")) { pantalla(); return; }
  const es = e.target.closest("[data-esc]"); if (es) { aplicar(es.dataset.esc); return; }
  const cu = e.target.closest("[data-cupo]"); if (cu) { fijaCupo(+cu.dataset.cupo); return; }
  const an = e.target.closest("[data-ads]"); if (an) { cambiar({anunciosAprob: !S.anunciosAprob}); return; }
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("#intro").hidden) { cerrarIntro(); return; }
  if (e.key === "Escape" && abierto) cierra();
  if (e.key === "Tab" && abierto) { const f = $$("button,input,select,a[href],[tabindex='0']", det).filter(x => !x.disabled); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
});
