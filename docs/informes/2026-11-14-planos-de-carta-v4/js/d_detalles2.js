/* ===== detalle: ¿Qué llena el disco? (una historia en tres pasos) ===== */
const PASOS_DISCO = ["1 · Qué ocupa el espacio", "2 · Qué se llena primero", "3 · Qué lo libera"];
DET.disco = {
  titulo: "Lo que llena el servidor se ve en tres pasos: qué ocupa, qué se llena primero y qué lo libera.",
  fu: ["carta_disco", "carta_anuncios", "carta_capacidad", "railway_limites", "cloudflare_r2_precios"],
  nota: "Modelo de escenarios (docs/research/2026-11-14-modelo-de-escenarios.mjs). Archivar sólo cambia la oferta al dueño y el costo del almacenamiento de objetos, no cuántos caben. Hoy en producción aún corre el sondeo hasta que la Fase 3 construya los eventos; ver docs/historia/.",
  montar(host) {
    this.paso = 0; this.auto = true;
    host.innerHTML = `<div class="viz"><svg id="svD" viewBox="0 0 960 470" role="img" font-family="DM Sans, sans-serif"></svg></div><div class="panel" id="ctl" style="margin-top:10px" hidden><div class="kick" style="margin-bottom:6px">Plan del servidor</div><div class="seg" id="srv"></div><div class="kick" style="margin:10px 0 6px">Historial de Master Chef en línea</div><div class="seg" id="hist"></div><div class="kick" style="margin:10px 0 6px">Palancas</div><div class="pals2" id="pals"></div></div>`;
    const svg = $("#svD", host); this.rm = RM(svg);
    svg.addEventListener("click", ev => { const e = ev.target.closest("[data-paso]"); if (e) { this.auto = false; this.paso = +e.dataset.paso; refrescar(); } });
    $("#srv", host).innerHTML = `<button class="btn" data-s="-1">Automático</button>` + SERVS.map((e, i) => `<button class="btn" data-s="${i}">${esc(e.nombre.replace("Con eventos, ", ""))}<small style="font-weight:400"> · ${e.tope_usd} USD</small></button>`).join("");
    $("#hist", host).innerHTML = [1, 3, 6, 12].map(v => `<button class="btn" data-h="${v}">${v} ${v === 1 ? "mes" : "meses"}</button>`).join("");
    $("#pals", host).innerHTML = [["a30", "Analítica 30 días en línea", "En vez de 13 meses"], ["a7", "Analítica en bruto 7 días", "El resto, agregados"], ["arch", "Archivar lo que sale", "≈ 0.4 pesos al año"]].map(([k, t, d]) => `<button class="pal" data-p="${k}"><span class="sw"></span><span><b>${esc(t)}</b><small>${esc(d)}</small></span></button>`).join("");
    host.addEventListener("click", ev => {
      const s = ev.target.closest("[data-s]"); if (s) { cambiar({servidor: +s.dataset.s}); return; }
      const h = ev.target.closest("[data-h]"); if (h) { cambiar({hist: +h.dataset.h}); return; }
      const p = ev.target.closest("[data-p]"); if (p) cambiar({[p.dataset.p]: !S[p.dataset.p]});
    });
    const marcha = () => { if (actual !== this || !this.auto || this.paso >= 2 || REDUCE) return; setTimeout(() => { if (actual === this && this.auto) { this.paso++; refrescar(); marcha(); } }, 2200); };
    setTimeout(marcha, 1200);
  },
  actualizar() {
    const m = motor(S), rm = this.rm, p = this.paso, base = motor({...S, a30: false, a7: false, hist: 12, arch: false, servidor: -1});
    $("#ctl").hidden = p < 2;
    $$("#srv [data-s]").forEach(b => b.setAttribute("aria-pressed", +b.dataset.s === S.servidor));
    $$("#hist [data-h]").forEach(b => b.setAttribute("aria-pressed", +b.dataset.h === S.hist));
    $$("#pals [data-p]").forEach(b => b.setAttribute("aria-pressed", !!S[b.dataset.p]));
    PASOS_DISCO.forEach((t, i) => {
      rm.put("pb" + i, "rect", {x: 30 + i * 306, y: 12, w: 296, h: 38, rx: 19, fill: i === p ? C.vino : i < p ? "#d9b9c1" : C.a2, grow: false, cursor: "pointer", attrs: {"data-paso": i, role: "button", tabindex: 0, "aria-pressed": i === p, "aria-label": t}});
      rm.put("pt" + i, "text", {x: 30 + i * 306 + 148, y: 36, text: t, size: 13.5, weight: 700, fill: i === p ? "#fff" : i < p ? C.osc : C.t2, anchor: "middle"});
    });
    // paso 1: qué ocupa el espacio: una visita y lo que deja en la base
    const mb = m.ev.capacidad.mb_por_restaurante, pf = SP.disco_perfiles.chico, v1 = p === 0 ? 1 : 0, tot = pf.mb_mes_visitas + pf.mb_mes_eventos + pf.mb_fijo;
    const g = rm.put("ph", "g", {x: 40, y: 90, op: v1});
    if (!g.__i) { g.__i = 1; g.innerHTML = fnDib(2).replace("<svg ", '<svg width="120" height="196" '); }
    const X0 = 230, W = 640, mx = Math.max(mb.servicio, mb.gratuito, 1), wG = Math.max(W * mb.gratuito / mx, 10), wS = W * mb.servicio / mx;
    rm.put("ca", "text", {x: X0, y: 108, text: "Un restaurante gratuito deja en la base al mes", size: 14, weight: 700, fill: C.vino, op: v1});
    rm.put("cv", "rect", {x: X0, y: 120, w: v1 ? wG * pf.mb_mes_visitas / tot : 0, h: 34, rx: 10, fill: C.vino});
    rm.put("ce", "rect", {x: X0 + wG * pf.mb_mes_visitas / tot, y: 120, w: v1 ? wG * pf.mb_mes_eventos / tot : 0, h: 34, rx: 10, fill: C.dorado});
    rm.put("cg", "text", {x: X0 + wG + 14, y: 145, text: `${n(mb.gratuito, 1)} MB`, size: 26, fill: C.vino, serif: true, op: v1});
    rm.put("cl", "text", {x: X0, y: 176, text: `visitas de la mesa ${n(pf.mb_mes_visitas, 1)} MB · analítica ${n(pf.mb_mes_eventos, 1)} MB`, size: 12.5, fill: C.t2, op: v1});
    rm.put("cb", "text", {x: X0, y: 232, text: "Uno de Master Chef, con su historial", size: 14, weight: 700, fill: C.vino, op: v1});
    rm.put("cs", "rect", {x: X0, y: 244, w: v1 ? wS : 0, h: 34, rx: 10, fill: C.osc});
    rm.put("cn", "text", {x: X0 + Math.min(wS, W) - 14, y: 268, text: `${n(mb.servicio, 0)} MB`, size: 26, fill: "#fff", anchor: "end", serif: true, op: v1});
    rm.put("cr", "text", {x: X0, y: 330, text: `≈ ${n(mb.servicio / mb.gratuito, 0)} veces el espacio de un gratuito`, size: 22, fill: C.rojo, serif: true, op: v1});
    // pasos 2 y 3: lo que se llena primero y lo que lo libera (las mismas barras se mueven)
    const v2 = p >= 1 ? 1 : 0, mxL = Math.max(3600, ...m.lim.map(l => l[1]).filter(isFinite)), XL = 200, WL = 440;
    m.lim.forEach(([nom, v], i) => {
      const y = 78 + i * 62, es = nom === m.cuello, w = v2 ? WL * Math.min(v, mxL) / mxL : 0;
      rm.put("n" + i, "text", {x: XL - 12, y: y + 24, text: nom, size: 13.5, weight: 700, fill: C.tinta, anchor: "end", op: v2});
      rm.put("k" + i, "rect", {x: XL, y, w: v2 ? WL : 0, h: 36, rx: 12, fill: C.a2});
      rm.put("b" + i, "rect", {x: XL, y, w, h: 36, rx: 12, fill: es ? C.vino : C.dorado, attrs: {class: es ? "rm pulso" : "rm"}});
      rm.put("v" + i, "text", {x: XL + w + 10, y: y + 25, text: n(v), size: 16, weight: 700, fill: es ? C.vino : C.t2, serif: true, op: v2});
    });
    const xl = XL + WL * Math.min(m.caben, mxL) / mxL;
    rm.put("lim", "line", {x1: xl, y1: 68, x2: xl, y2: 266, stroke: C.osc, sw: 2, dash: "5 4", op: v2});
    rm.put("g0", "text", {x: 690, y: 150, text: n(m.caben), size: 72, fill: C.vino, serif: true, op: v2});
    rm.put("g1", "text", {x: 690, y: 176, text: "restaurantes caben", size: 14, fill: C.t2, op: v2});
    rm.put("g2", "text", {x: 690, y: 208, text: `frena: ${m.cuello}`, size: 16, weight: 700, fill: C.rojo, op: v2});
    const dl = m.caben - base.caben;
    rm.put("g3", "text", {x: 690, y: 250, text: p >= 2 ? `${dl >= 0 ? "+" : "−"}${n(Math.abs(dl))} frente a no hacer nada` : "", size: 14, weight: 700, fill: dl >= 0 ? C.verde : C.rojo, op: p >= 2 ? 1 : 0});
    rm.put("u0", "text", {x: 30, y: 330, text: `Servidor: hasta ${m.usd} USD al mes (${mxn(Math.round(m.usd * TC))}) · ${nomServ(m)}`, size: 14, weight: 700, fill: C.tinta, op: v2});
    const sube = m.cuello === "disco" ? "acortar el historial y la analítica, o pasar a Pro, lo libera" : m.cuello === "procesador" ? "más procesos lo liberan" : "es el tope de Railway: más procesos no lo suben";
    return {
      leyenda: p === 0 ? `<span><i style="background:${C.vino}"></i>visitas de la mesa</span><span><i style="background:${C.dorado}"></i>analítica</span><span><i style="background:${C.osc}"></i>un cliente de paga</span>` : `<span><i style="background:${C.vino}"></i>lo que se llena primero</span><span><i style="background:${C.dorado}"></i>otro recurso</span>`,
      cifras: [[n(m.caben), "restaurantes caben con esta orden", "supuesto: modelo de escenarios"], [m.usd + " USD", "costo del servidor al mes (tope del escalón)"], [`${S.hist} meses`, "de historial de Master Chef en línea"], [S.a7 ? "7 días" : S.a30 ? "30 días" : "13 meses", "de analítica en bruto en línea"]],
      insight: p === 0 ? `Un cliente de paga ocupa ≈ ${n(mb.servicio / mb.gratuito, 0)} veces el espacio de uno gratuito: el historial pesa más que la visita.` : p === 1 ? `Lo primero que se llena es ${m.cuello}: ahí está el límite de ${n(m.caben)} restaurantes.` : `Con esta orden caben ${n(m.caben)} y frena ${m.cuello}: ${sube}.`,
    };
  },
};

/* ===== detalle: ¿A quién deja dentro cada tope? ===== */
const TRK = [
  {k: "topePlatillos", nom: "Tope de platillos", min: 40, max: 300, f: v => MOD.interp(SP.empuja_platillos, v), tag: "medida", tip: "148 cartas leídas; sesgo hacia abajo"},
  {k: "topeMesas", nom: "Tope de mesas", min: 5, max: 40, f: v => MOD.interp(SP.empuja_mesas, v), tag: "supuesto", tip: "Modelo: no hay estadística de mesas en México"},
  {k: "topeCuentas", nom: "Cuentas de personal", min: 2, max: 20, f: v => MOD.interp(SP.empuja_cuentas, v), tag: "supuesto", tip: "Modelo: se mide con los primeros restaurantes"},
  {k: "precioServicio", nom: "Precio de Master Chef al mes", min: 49, max: 699, f: null, tag: "propuesta", tip: "De los que se pasan del plan Chef, pagan según la curva"},
];
DET.topes = {
  titulo: "Mueves los límites del plan gratuito y ves a quién deja dentro y a quién empuja a pagar.",
  fu: ["carta_tres_planes", "carta_estadistica", "calvin_posturas"],
  nota: "Entre los puntos del estudio las curvas se interpolan; mesas y cuentas son supuesto. Propuesta de cambio frente a lo decidido: tercer plan sobre 40 mesas y lecturas de PDF con tope numérico.",
  montar(host) {
    host.innerHTML = `<div class="viz"><svg id="svT" viewBox="0 0 960 470" role="img" font-family="DM Sans, sans-serif"></svg></div>`;
    const svg = $("#svT", host); this.rm = RM(svg); this.svg = svg; this.armado = false;
    svg.addEventListener("click", ev => { const c = ev.target.closest("[data-curva]"); if (c) cambiar({curva: c.dataset.curva}); });
  },
  actualizar() {
    const rm = this.rm, m = motor(S), X0 = 40, W = 470, svg = this.svg;
    TRK.forEach((t, i) => {
      const y = 70 + i * 92, v = S[t.k], px = X0 + W * (v - t.min) / (t.max - t.min), p = t.f ? t.f(v) : m.conv;
      rm.put("n" + i, "text", {x: X0, y: y - 22, text: t.nom, size: 14, weight: 700, fill: C.vino});
      rm.put("tg" + i, "text", {x: X0 + W, y: y - 22, text: t.tag, size: 11, weight: 700, fill: t.tag === "medida" ? C.verde : C.dorado, anchor: "end"});
      rm.put("k" + i, "rect", {x: X0, y: y - 8, w: W, h: 16, rx: 8, fill: C.a2, grow: false});
      rm.put("f" + i, "rect", {x: X0, y: y - 8, w: px - X0, h: 16, rx: 8, fill: i === 3 ? C.dorado : C.vino, grow: false});
      rm.put("a" + i, "text", {x: X0, y: y + 30, text: String(t.min), size: 11, fill: C.t2});
      rm.put("z" + i, "text", {x: X0 + W, y: y + 30, text: String(t.max), size: 11, fill: C.t2, anchor: "end"});
      const h = rm.put("h" + i, "circle", {x: px, y, r: 15, fill: i === 3 ? C.dorado : C.vino, stroke: "#fff", sw: 3, cursor: "grab", attrs: {"aria-label": t.nom, "aria-valuemin": t.min, "aria-valuemax": t.max, "aria-valuenow": v, "data-tip": t.tip}});
      rm.put("hv" + i, "text", {x: px, y: y + 4, text: String(v), size: 11, weight: 700, fill: "#fff", anchor: "middle"});
      rm.put("r" + i, "text", {x: X0 + W + 24, y: y + 5, text: i === 3 ? `pagan ${n(100 * m.conv)} % de los que se pasan` : `empuja a ${n(100 * p, 1)} %`, size: 13, weight: 700, fill: C.tinta});
      if (!this.armado) {
        const set = val => cambiar({[t.k]: clamp(Math.round(val), t.min, t.max)});
        arrastrable(h, svg, pt => set(t.min + (pt.x - X0) / W * (t.max - t.min)), (d, mult) => set(S[t.k] + d * mult * (t.max - t.min > 200 ? 5 : 1)));
      }
    });
    this.armado = true;
    // curva de pago: tres botones dentro de la gráfica
    ["pesimista", "media", "optimista"].forEach((c, i) => {
      rm.put("cv" + i, "rect", {x: 40 + i * 118, y: 410, w: 110, h: 28, rx: 14, fill: S.curva === c ? C.vino : C.arena, grow: false, cursor: "pointer", attrs: {"data-curva": c, role: "button", tabindex: 0, "aria-pressed": S.curva === c}});
      rm.put("cvt" + i, "text", {x: 95 + i * 118, y: 429, text: c, size: 12.5, weight: 700, fill: S.curva === c ? "#fff" : C.t2, anchor: "middle"});
    });
    rm.put("cvl", "text", {x: 40, y: 402, text: "Cuánto pagan: curva", size: 12, weight: 700, fill: C.t2});
    const cx = 800, cy = 150, r = 88, circ = 2 * Math.PI * r;
    const dn = rm.put("don0", "circle", {x: cx, y: cy, r, fill: "none", stroke: C.arena, sw: 34});
    const dp = rm.put("don", "circle", {x: cx, y: cy, r, fill: "none", stroke: C.vino, sw: 34});
    dn.style.transform = dp.style.transform = `translate(${cx}px,${cy}px) rotate(-90deg)`; dp.style.strokeDasharray = `${circ * m.rebasan} ${circ}`; dp.style.transition = REDUCE ? "none" : "stroke-dasharray .5s cubic-bezier(.34,1.2,.5,1)";
    rm.put("dn", "text", {x: cx, y: cy + 12, text: emTxt(m), size: 36, fill: C.vino, anchor: "middle", serif: true});
    rm.put("dl", "text", {x: cx, y: cy + 118, text: "se pasa del plan gratuito", size: 14, weight: 700, fill: C.vino, anchor: "middle"});
    rm.put("dd", "text", {x: cx, y: cy + 146, text: `Se queda en Chef: ${dentroTxt(m)}`, size: 14, weight: 700, fill: C.tinta, anchor: "middle"});
    rm.put("de", "text", {x: cx, y: cy + 172, text: `${n(m.ev.clientes.de_paga, 1)} clientes de paga por cada 1,000`, size: 13, fill: C.t2, anchor: "middle"});
    rm.put("df", "text", {x: cx, y: cy + 194, text: `punto de equilibrio: ${m.eq == null ? "—" : n(m.eq, 1)} clientes de paga`, size: 13, weight: 700, fill: C.osc, anchor: "middle"});
    return {
      leyenda: `<span><i style="background:${C.vino}"></i>lo que el plan gratuito permite</span><span><i style="background:${C.dorado}"></i>precio de Master Chef</span><span>Arrastra una asa o usa las flechas</span>`,
      cifras: [[n(100 * MOD.interp(SP.empuja_platillos, S.topePlatillos), 1) + " %", `se pasa del tope de ${S.topePlatillos} platillos`, "medida"], [n(100 * MOD.interp(SP.empuja_mesas, S.topeMesas), 1) + " %", `se pasa de ${S.topeMesas} mesas`, "supuesto"], [n(100 * MOD.interp(SP.empuja_cuentas, S.topeCuentas), 1) + " %", `se pasa de ${S.topeCuentas} cuentas de personal`, "supuesto"], [n(m.ev.clientes.de_paga, 1), "clientes de paga por cada 1,000 registrados", "supuesto"]],
      insight: `Con estos límites ≈ ${n(100 * m.rebasan)} % de los negocios necesita más que Chef, y a ${mxn(S.precioServicio)} paga ≈ ${n(100 * m.conv)} % de ellos. Mesas, cuentas y pago los mide el piloto.`,
    };
  },
};

/* ===== detalle: ¿Cuánto se cobra frente a la competencia? ===== */
const PCOL = ["#2e7aab", "#2a9d8f", "#7b5ea7", "#d95d39", "#5c8a3a", "#8d6e63", "#6c757d", "#b5527b", "#1d7874", "#c27c0e", "#3d5a80", "#9a6fb0"];
DET.precio = {
  titulo: "Frente a 30 planes publicados, arrastra el precio de Carta y ve dónde cae.",
  fu: ["carta_precio", "paginas_proveedores_14nov"],
  nota: "Precios en pesos al mes, leídos el 14 de noviembre; algunos incluyen IVA y otros no lo declaran. OpenTable (EE. UU., fuente secundaria) queda al final del eje. El precio de Carta es propuesta.",
  montar(host) {
    const prov = []; D.mercado_planes.forEach(p => { if (!prov.includes(p.proveedor)) prov.push(p.proveedor); });
    this.prov = prov.sort((a, b) => Math.min(...D.mercado_planes.filter(p => p.proveedor === a).map(p => p.precio)) - Math.min(...D.mercado_planes.filter(p => p.proveedor === b).map(p => p.precio)));
    this.oculto = new Set(); this.armado = false;
    host.innerHTML = `<div class="viz"><svg id="svP" viewBox="0 0 960 560" role="img" font-family="DM Sans, sans-serif"></svg></div><div class="seg" id="ocp" style="margin-top:8px"></div><div class="panel" style="margin-top:10px"><div class="kick" style="margin-bottom:6px">¿Contra quién compites?</div><div class="seg" id="sus"></div></div><div class="dos" style="margin-top:10px;grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><div class="panel"><h3>Cuánto pagan: la curva (supuesto)</h3><div class="seg" id="cvs"></div><div id="cvc"></div></div><div class="panel"><h3>El precio como parte del ingreso (INEGI)</h3><div id="inegi"></div></div></div>`;
    this.rm = RM($("#svP", host)); this.svg = $("#svP", host);
    this.svg.addEventListener("click", ev => { const t = ev.target.closest("[data-prov]"); if (t) { this.oculto.add(t.dataset.prov); refrescar(); } });
    host.addEventListener("click", ev => {
      const r = ev.target.closest("[data-rp]"); if (r) { r.dataset.rp === "*" ? this.oculto.clear() : this.oculto.delete(r.dataset.rp); refrescar(); return; }
      const s = ev.target.closest("[data-sus]"); if (s) { cambiar({sustituto: s.dataset.sus}); return; }
      const cv = ev.target.closest("[data-cv]"); if (cv) { cambiar({curva: cv.dataset.cv, cMed: null, cSig: null, cTec: null}); return; }
      if (ev.target.closest("[data-cvr]")) { cambiar({cMed: null, cSig: null, cTec: null}); return; }
      if (ev.target.closest("[data-regla]")) cambiar({precioServicio: MOD.redondea(MOD.precioSugerido(SUSTP[S.sustituto], S.K, sup(S)), sup(S))});
    });
    $("#cvs", host).innerHTML = ["pesimista", "media", "optimista"].map(c => `<button class="btn" data-cv="${c}">${c}</button>`).join("") + `<button class="btn" data-cvr="1">Restablecer</button>`;
    $("#cvc", host).innerHTML = [["cMed", "Mediana: lo que paga la mitad", 50, 1000, 5], ["cSig", "Dispersión", 0.2, 1.2, 0.05], ["cTec", "Techo: los que llegan a pagar", 0.05, 1, 0.05]].map(([k, t, mi, ma, st]) => `<label class="ctlr"><span>${t}</span><input type="range" data-cc="${k}" min="${mi}" max="${ma}" step="${st}"><output data-cco="${k}"></output></label>`).join("");
    host.addEventListener("input", ev => { const r = ev.target.closest("[data-cc]"); if (r) cambiar({[r.dataset.cc]: +r.value}); });
    $("#sus", host).innerHTML = SUSTS.map(k => `<button class="btn" data-sus="${esc(k)}">${esc(CORTO_SUST[k])} · ${mxn(SUSTP[k])}</button>`).join("") + `<button class="btn dor" data-regla="1"></button>`;
  },
  actualizar() {
    const rm = this.rm, svg = this.svg, vis = this.prov.filter(p => !this.oculto.has(p)), LH = 29, y0 = 96;
    const A = p => (p <= 1300 ? 210 + 560 * p / 1300 : 770 + 110 * (Math.min(p, 3000) - 1300) / 1700);
    const inv = x => clamp(Math.round(((x - 210) / 560) * 1300), 49, 1299);
    [0, 250, 500, 750, 1000, 1300].forEach(t => { rm.put("tk" + t, "text", {x: A(t), y: 66, text: mxn(t), size: 11.5, fill: C.t2, anchor: "middle"}); rm.put("tl" + t, "line", {x1: A(t), y1: 74, x2: A(t), y2: y0 + this.prov.length * LH, stroke: C.arena, sw: 1}); });
    rm.put("tkb", "text", {x: 830, y: 66, text: "≈ 3,000 y más", size: 11.5, fill: C.t2, anchor: "middle"});
    rm.put("tlb", "line", {x1: 770, y1: 74, x2: 770, y2: y0 + this.prov.length * LH, stroke: C.gris, sw: 1.5, dash: "4 3"});
    this.prov.forEach((pv, i) => {
      const idx = vis.indexOf(pv), on = idx >= 0, y = y0 + (on ? idx : vis.length) * LH, col = PCOL[i % PCOL.length], op = on ? 1 : 0;
      const pl = D.mercado_planes.filter(p => p.proveedor === pv).sort((a, b) => a.precio - b.precio);
      rm.put("pl" + i, "text", {x: 196, y: y + 5, text: pv, size: 12.5, weight: 700, fill: col, anchor: "end", op});
      rm.put("ph" + i, "rect", {x: 0, y: y - 12, w: on ? 200 : 0, h: 24, rx: 8, fill: "rgba(0,0,0,0)", cursor: "pointer", grow: false, attrs: {"data-prov": pv, "data-tip": "Toca para ocultar a " + pv, role: "button", tabindex: 0}});
      rm.put("pr" + i, "line", {x1: A(pl[0].precio), y1: y, x2: A(pl[pl.length - 1].precio), y2: y, stroke: col, sw: 2, dash: "", op});
      pl.forEach((p, j) => {
        const t = pl.length > 1 ? j / (pl.length - 1) : 1, fuera = p.precio > 3000;
        rm.put(`pd${i}_${j}`, "circle", {x: fuera ? 930 : A(p.precio), y, r: 7.5, fill: col, op: on ? 0.4 + 0.6 * t : 0, stroke: "#fff", sw: 1.5, title: `${pv} ${p.plan}: ${mxn(p.precio)} al mes`, attrs: {"data-tip": `${pv} ${p.plan}: ${mxn(p.precio)} al mes`, tabindex: 0}});
      });
    });
    const h = y0 + vis.length * LH;
    const mm = motor(S), mes = mm.meseta;
    rm.put("mes", "rect", {x: A(mes.desde), y: 78, w: A(mes.hasta) - A(mes.desde), h: h - 78 + 4, rx: 6, fill: C.dorado, op: 0.2, grow: false});
    rm.put("mest", "text", {x: A(mes.desde), y: h + 22, text: `meseta del margen: ${mxn(mes.desde)} a ${mxn(mes.hasta)} (a menos de 2 % del máximo)`, size: 12, weight: 700, fill: C.dorado});
    const pmax = Math.max(...D.mercado_planes.filter(q => q.precio <= 1300).map(q => q.precio)), meniu = SUSTP["Meniu Business"];
    [["rm", meniu, "Meniu: referencia de Master Chef", C.vino, 0], ["rx", pmax, "extremo alto: referencia de Chef Ejecutivo", C.osc, 1]].forEach(([id, v, tx, col, q]) => {
      rm.put(id + "l", "line", {x1: A(v), y1: 74, x2: A(v), y2: h + 6, stroke: col, sw: 2, dash: "2 4"});
      rm.put(id + "t", "text", {x: A(v) + (q ? -6 : 6), y: h + 46 + 22 * q, text: tx, size: 12, weight: 700, fill: col, anchor: q ? "end" : "start"});
    });
    [["sv", "precioServicio", PLAN.paga, C.vino], ["sa", "precioSalon", PLAN.ejec, C.osc]].forEach(([id, key, nom, col], q) => {
      const x = A(S[key]);
      rm.put(id + "l", "line", {x1: x, y1: 36, x2: x, y2: h + 6, stroke: col, sw: 3});
      const hd = rm.put(id + "h", "circle", {x, y: 36, r: 13, fill: col, stroke: "#fff", sw: 3, cursor: "grab", attrs: {"aria-label": "Precio " + nom, "aria-valuenow": S[key], "data-tip": "Arrastra el precio de " + nom}});
      rm.put(id + "t", "text", {x: x + (q ? 18 : -18), y: 22, text: `${nom} ${mxn(S[key])}`, size: 13, weight: 700, fill: col, anchor: q ? "start" : "end"});
      if (!this.armado) arrastrable(hd, svg, pt => cambiar({[key]: inv(pt.x)}), (d, mult) => cambiar({[key]: clamp(S[key] + d * mult * 10, 49, 1299)}));
    });
    this.armado = true;
    const caros = D.mercado_planes.filter(p => p.precio > S.precioServicio).length, tot = D.mercado_planes.length;
    const m = motor(S), sust = SUSTP[S.sustituto], kimp = S.precioServicio / sust, s = sup(S);
    const regla = MOD.redondea(MOD.precioSugerido(sust, S.K, s), s);
    $("#ocp").innerHTML = [...this.oculto].map(p => `<button class="btn" data-rp="${esc(p)}">↩ ${esc(p)}</button>`).join("") + (this.oculto.size ? `<button class="btn dor" data-rp="*">Mostrar todos</button>` : "");
    $$("#sus [data-sus]").forEach(b => b.setAttribute("aria-pressed", b.dataset.sus === S.sustituto));
    $$("#cvs [data-cv]").forEach(b => b.setAttribute("aria-pressed", b.dataset.cv === S.curva));
    const cvb = m.s.curvas_pago[S.curva];
    [["cMed", cvb.mediana, v => mxn(v)], ["cSig", cvb.sigma, v => v.toFixed(2)], ["cTec", cvb.techo, v => n(100 * v) + " %"]].forEach(([k, v, f]) => { const r = $(`[data-cc="${k}"]`); if (r && document.activeElement !== r) r.value = v; $(`[data-cco="${k}"]`).textContent = f(v); });
    $("#inegi").innerHTML = D.inegi_tamano.map(t => { const p = 100 * S.precioServicio / t.ingreso, w = clamp(p / 0.3 * 100, 2, 100); return `<div class="ing"><span>${esc(t.estrato)} personas · ${mxn(t.ingreso)} al mes</span><b>${p.toFixed(2)} %</b><div class="ingb"><i style="width:${w}%"></i></div></div>`; }).join("") + `<p class="nota">Ingreso por negocio de la clase 722511 (INEGI, Censos Económicos 2024, año 2023). Barra completa = 0.3 % del ingreso. Un punto de venta cuesta de 652 a 1,000 al mes.</p>`;
    $("[data-regla]", $("#sus")).textContent = `Poner el precio de la regla: ${mxn(regla)} (K = ${S.K})`;
    return {
      leyenda: `<span>Cada color es un proveedor; más claro = plan más barato</span><span><i style="background:${C.vino}"></i>${PLAN.paga}</span><span><i style="background:${C.osc}"></i>${PLAN.ejec}</span>`,
      cifras: [[`${caros} de ${tot}`, `planes cuestan más que ${PLAN.paga} a ${mxn(S.precioServicio)}`, "propuesta"], [n(100 * kimp) + " %", `del precio de ${CORTO_SUST[S.sustituto]} (${mxn(sust)}): K implícita ${kimp.toFixed(2)}`], [n(100 * m.conv) + " %", `de los que se pasan de Chef pagan a este precio (curva ${S.curva})`, "supuesto"], [`${mxn(mes.desde)}–${mxn(mes.hasta)}`, `meseta del precio con la curva ${S.curva}: el margen cambia menos de 2 %`, "supuesto"]],
      insight: S.precioServicio <= 349 ? "Meniu ya ofrece caja, cocina y pedir desde la mesa por $225: a este precio Carta sólo gana si la mesa que pide junta y la sencillez valen la diferencia." : "A este precio Carta queda arriba del corredor propuesto (249 a 349): lo tiene que justificar la orden compartida.",
    };
  },
};
