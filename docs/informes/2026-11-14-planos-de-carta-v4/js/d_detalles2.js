/* ===== detalle: ¿Qué llena el disco? (armar una orden) ===== */
const PALDESC = {
  P1: ["Analítica sólo 30 días en línea", "La más barata: sólo una purga más corta"],
  P2: ["Historial de 3 meses en línea; lo demás, archivado", "Exige un archivador que aún no existe"],
  P3: ["Quitar 4 índices de la analítica", "Ahorra 10 % de esa tabla: no vale el riesgo"],
  P4: ["Analítica en bruto sólo 7 días", "El resto se guarda como agregados"],
  P5: ["Historial en línea sólo 1 mes", "Archivo desde el segundo mes"],
};
DET.disco = {
  titulo: "Mover el historial a archivo multiplica por 9 los clientes de paga que caben.",
  fu: ["carta_disco", "carta_anuncios", "carta_capacidad", "railway_limites", "cloudflare_r2_precios"],
  nota: "Propuesta de cambio: 3 meses de historial en línea en vez de 12. Sin reserva de 20 %. Las palancas se suman en este orden, así se midieron. Hoy en producción aún corre el sondeo hasta que la Fase 3 construya los eventos; ver docs/historia/.",
  montar(host) {
    host.innerHTML = `<div class="dos"><div class="panel"><h3>Arma tu orden</h3><div class="kick" style="margin-bottom:6px">Plan del servidor</div><div class="seg" id="srv"></div><div class="kick" style="margin:10px 0 6px">Palancas del disco</div><div id="pals"></div></div><div><div class="viz"><svg id="svD" viewBox="0 0 700 440" role="img" font-family="DM Sans, sans-serif"></svg></div></div></div>`;
    this.rm = RM($("#svD", host));
    $("#srv", host).innerHTML = SERV.map((e, i) => `<button class="btn" data-s="${i}">${NOMSERV(e)}<small style="font-weight:400"> · ${e.usd} USD</small></button>`).join("");
    $("#pals", host).innerHTML = ORD.map((k, i) => `<button class="pal" data-p="${i}"><span class="sw"></span><span><b>${esc(PALDESC[k][0])}</b><small>${esc(PALDESC[k][1])}</small></span></button>`).join("");
    host.addEventListener("click", ev => {
      const s = ev.target.closest("[data-s]"); if (s) { cambiar({servidor: +s.dataset.s}); return; }
      const p = ev.target.closest("[data-p]"); if (p) { const i = +p.dataset.p; cambiar({palancas: S.palancas > i ? i : i + 1}); }
    });
  },
  actualizar() {
    const m = motor(S), rm = this.rm;
    $$("#srv .btn").forEach((b, i) => b.setAttribute("aria-pressed", S.servidor === i));
    $$("#pals .pal").forEach((b, i) => b.setAttribute("aria-pressed", S.palancas > i));
    const mx = 3600, X0 = 190, W = 440;
    rm.put("t", "text", {x: 20, y: 26, text: "Cuántos clientes gratuitos aguanta cada recurso", size: 14.5, weight: 700, fill: C.vino});
    const cuello = m.cuelloG;
    m.limG.forEach(([nom, v], i) => {
      const y = 50 + i * 62, inf = !isFinite(v), es = nom === cuello;
      rm.put("n" + i, "text", {x: X0 - 12, y: y + 24, text: nom, size: 13.5, weight: 700, fill: C.tinta, anchor: "end"});
      rm.put("k" + i, "rect", {x: X0, y, w: W, h: 36, rx: 12, fill: C.a2});
      rm.put("b" + i, "rect", {x: X0, y, w: inf ? W : W * Math.min(v, mx) / mx, h: 36, rx: 12, fill: es ? C.vino : inf ? C.arena : C.dorado, op: inf ? 0.6 : 1, attrs: {class: es ? "rm pulso" : "rm"}});
      rm.put("v" + i, "text", {x: X0 + (inf ? W : W * Math.min(v, mx) / mx) + 10, y: y + 25, text: inf ? "sin límite con Pro" : n(v), size: 16, weight: 700, fill: es ? C.vino : C.tinta2 ?? C.tinta, anchor: inf ? "end" : "start", serif: !inf});
      if (inf) rm.get("v" + i).setAttribute("fill", C.t2);
    });
    const xl = X0 + W * Math.min(m.cabenG, mx) / mx;
    rm.put("lim", "line", {x1: xl, y1: 40, x2: xl, y2: 232, stroke: C.osc, sw: 2, dash: "5 4"});
    rm.put("cb", "text", {x: 20, y: 276, text: "cuello de botella:", size: 14, fill: C.t2});
    rm.put("cbv", "text", {x: 150, y: 276, text: m.cuelloG, size: 16, weight: 700, fill: C.rojo});
    rm.put("g0", "text", {x: 20, y: 340, text: n(m.cabenG), size: 54, fill: C.vino, serif: true});
    rm.put("g1", "text", {x: 20, y: 364, text: "clientes gratuitos caben", size: 13.5, fill: C.t2});
    rm.put("p0", "text", {x: 270, y: 340, text: n(m.cabenP), size: 54, fill: C.dorado, serif: true});
    rm.put("p1", "text", {x: 270, y: 364, text: `clientes de paga caben · frena: ${m.cuelloP}`, size: 13.5, fill: C.t2});
    rm.put("u0", "text", {x: 20, y: 412, text: `Costo del servidor: ${m.usd} USD al mes (${mxn(Math.round(m.usd * TC))})`, size: 14, weight: 700, fill: C.tinta});
    const sube = m.cuelloG === "disco" ? "Pasar a Pro o archivar el historial lo levanta." : m.cuelloG === "procesador" ? "Más procesos lo levantan." : "Es el tope de Railway: ni más procesos ni réplicas lo suben.";
    return {
      leyenda: `<span><i style="background:${C.vino}"></i>cuello de botella</span><span><i style="background:${C.dorado}"></i>otro recurso</span><span><i style="background:${C.arena}"></i>sin límite</span>`,
      cifras: [[n(m.cabenG), "clientes gratuitos caben", "supuesto: simulador de uso"], [n(m.cabenP), "clientes de paga caben", "supuesto"], [m.usd + " USD", "costo de Railway al mes"], [S.palancas + " de 5", "palancas activas"]],
      insight: `El cuello de botella es ${m.cuelloG}. ${sube}`,
    };
  },
};

/* ===== detalle: ¿A quién deja dentro cada tope? ===== */
const TRK = [
  {k: "topePlatillos", nom: "Tope de platillos", min: 40, max: 120, f: v => interp(COB, v), tag: "medida", tip: "148 cartas leídas; sesgo hacia abajo"},
  {k: "topeMesas", nom: "Tope de mesas", min: 10, max: 40, f: v => interp(PTS_MESAS, v), tag: "supuesto", tip: "Modelo: no hay estadística de mesas en México"},
  {k: "topeCuentas", nom: "Cuentas de personal", min: 3, max: 20, f: v => interp(PTS_CUENTAS, v), tag: "supuesto", tip: "Modelo: se mide con los primeros restaurantes"},
  {k: "conv", nom: "De los que rebasan, pagan", min: 3, max: 20, f: null, tag: "supuesto", tip: "Lo mide el piloto"},
];
DET.topes = {
  titulo: "Mueve los topes: el gratuito deja dentro a unos y empuja a otros a pagar.",
  fu: ["carta_tres_planes", "carta_estadistica", "calvin_posturas"],
  nota: "Entre los puntos del estudio (10 mesas, 3 cuentas, 80 platillos) las curvas se interpolan; es supuesto. Propuesta de cambio frente a lo decidido: tercer plan sobre 40 mesas, lecturas de PDF con tope numérico y 3 meses de historial en línea.",
  montar(host) {
    host.innerHTML = `<div class="viz"><svg id="svT" viewBox="0 0 960 460" role="img" font-family="DM Sans, sans-serif"></svg></div>`;
    const svg = $("#svT", host); this.rm = RM(svg); this.svg = svg; this.armado = false;
  },
  actualizar() {
    const rm = this.rm, m = motor(S), X0 = 40, W = 470, svg = this.svg;
    TRK.forEach((t, i) => {
      const y = 70 + i * 92, v = S[t.k], px = X0 + W * (v - t.min) / (t.max - t.min), pct = t.f ? t.f(v) : null;
      rm.put("n" + i, "text", {x: X0, y: y - 22, text: t.nom, size: 14, weight: 700, fill: C.vino});
      rm.put("tg" + i, "text", {x: X0 + W, y: y - 22, text: t.tag, size: 11, weight: 700, fill: t.tag === "medida" ? C.verde : C.dorado, anchor: "end"});
      rm.put("k" + i, "rect", {x: X0, y: y - 8, w: W, h: 16, rx: 8, fill: C.a2, grow: false});
      rm.put("f" + i, "rect", {x: X0, y: y - 8, w: px - X0, h: 16, rx: 8, fill: i === 3 ? C.dorado : C.vino, grow: false});
      rm.put("a" + i, "text", {x: X0, y: y + 30, text: String(t.min), size: 11, fill: C.t2});
      rm.put("z" + i, "text", {x: X0 + W, y: y + 30, text: String(t.max) + (i === 3 ? " %" : ""), size: 11, fill: C.t2, anchor: "end"});
      const h = rm.put("h" + i, "circle", {x: px, y, r: 14, fill: C.vino, stroke: "#fff", sw: 3, cursor: "grab", attrs: {"aria-label": t.nom, "aria-valuemin": t.min, "aria-valuemax": t.max, "aria-valuenow": v, "data-tip": t.tip}});
      if (i === 3) h.style.fill = C.dorado;
      rm.put("hv" + i, "text", {x: px, y: y + 5, text: String(v), size: 12, weight: 700, fill: "#fff", anchor: "middle"});
      if (!this.armado) {
        const set = val => cambiar({[t.k]: clamp(Math.round(val), t.min, t.max)});
        arrastrable(h, svg, pt => set(t.min + (pt.x - X0) / W * (t.max - t.min)), (d, mult) => set(S[t.k] + d * mult));
      }
      if (pct != null) {
        rm.put("r" + i, "text", {x: X0 + W + 30, y: y + 6, text: `empuja a ${n(pct, 1)} %`, size: 14, weight: 700, fill: C.tinta, anchor: "start", op: 0});
      }
    });
    this.armado = true;
    // lo que sale: anillo
    const cx = 770, cy = 150, r = 88;
    const dn = rm.put("don0", "circle", {x: cx, y: cy, r, fill: "none", stroke: C.arena, sw: 34});
    const dp = rm.put("don", "circle", {x: cx, y: cy, r, fill: "none", stroke: C.vino, sw: 34});
    const circ = 2 * Math.PI * r;
    dn.style.transform = dp.style.transform = `translate(${cx}px,${cy}px) rotate(-90deg)`; dp.style.strokeDasharray = `${circ * m.emp / 100} ${circ}`; dp.style.transition = REDUCE ? "none" : "stroke-dasharray .5s cubic-bezier(.34,1.2,.5,1)";
    rm.put("dn", "text", {x: cx, y: cy + 12, text: `${n(m.emp, 1)} %`, size: 36, fill: C.vino, anchor: "middle", serif: true});
    rm.put("dl", "text", {x: cx, y: cy + 118, text: "empuja a pagar", size: 14, weight: 700, fill: C.vino, anchor: "middle"});
    rm.put("dl2", "text", {x: cx, y: cy + 138, text: `(el tope que más empuja manda; rango ${n(m.emp * 16 / 39, 1)} a ${n(Math.min(100, m.emp * 71 / 39), 1)} %)`, size: 11.5, fill: C.t2, anchor: "middle"});
    rm.put("dd", "text", {x: cx, y: cy + 168, text: `Se queda en gratuito: ${n(100 - m.emp, 1)} %`, size: 14, weight: 700, fill: C.tinta, anchor: "middle"});
    rm.put("de", "text", {x: cx, y: cy + 192, text: `${n(m.pagantes1000, 1)} clientes de paga por cada 1,000 registrados`, size: 13, fill: C.t2, anchor: "middle"});
    rm.put("df", "text", {x: cx, y: cy + 212, text: `punto de equilibrio: ${n(m.equilibrioPagantes, 1)} de paga por 1,000`, size: 13, weight: 700, fill: C.osc, anchor: "middle"});
    return {
      leyenda: `<span><i style="background:${C.vino}"></i>lo que el gratuito permite</span><span><i style="background:${C.dorado}"></i>conversión a paga</span><span>Arrastra una asa o usa las flechas</span>`,
      cifras: [[n(m.pp, 1) + " %", `empuja el tope de ${S.topePlatillos} platillos`, "medida"], [n(m.pm, 1) + " %", `empuja el tope de ${S.topeMesas} mesas`, "supuesto"], [n(m.pc, 1) + " %", `empujan ${S.topeCuentas} cuentas de personal`, "supuesto"], [n(m.pagantes1000, 1), "clientes de paga por cada 1,000 registrados", "supuesto"]],
      insight: `Con estos topes, ≈ ${n(m.emp)} % de los negocios pagaría o se ajustaría. Los datos de mesas y cuentas los trae el piloto.`,
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
    host.innerHTML = `<div class="viz"><svg id="svP" viewBox="0 0 960 560" role="img" font-family="DM Sans, sans-serif"></svg></div><div class="seg" id="ocp" style="margin-top:8px"></div><div class="panel" style="margin-top:10px"><div class="kick" style="margin-bottom:6px">¿Contra quién compites?</div><div class="seg" id="sus"></div></div>`;
    this.rm = RM($("#svP", host)); this.svg = $("#svP", host);
    this.svg.addEventListener("click", ev => { const t = ev.target.closest("[data-prov]"); if (t) { this.oculto.add(t.dataset.prov); refrescar(); } });
    host.addEventListener("click", ev => {
      const r = ev.target.closest("[data-rp]"); if (r) { r.dataset.rp === "*" ? this.oculto.clear() : this.oculto.delete(r.dataset.rp); refrescar(); return; }
      const s = ev.target.closest("[data-sus]"); if (s) { cambiar({sustituto: s.dataset.sus}); return; }
      if (ev.target.closest("[data-regla]")) { cambiar({precioServicio: redondea(reglaPrecio(SUST[S.sustituto], S.K, S.soporte), S.soporte)}); }
    });
    $("#sus", host).innerHTML = Object.entries(SUST).map(([k, v]) => `<button class="btn" data-sus="${esc(k)}">${esc(k)} · ${mxn(v)}</button>`).join("") + `<button class="btn dor" data-regla="1">Poner el precio de la regla (K = ${S.K})</button>`;
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
    // marcadores de Carta (arrastrables)
    [["sv", "precioServicio", "Servicio", C.vino], ["sa", "precioSalon", "Salón", C.osc]].forEach(([id, key, nom, col], q) => {
      const x = A(S[key]);
      rm.put(id + "l", "line", {x1: x, y1: 36, x2: x, y2: h + 6, stroke: col, sw: 3});
      const hd = rm.put(id + "h", "circle", {x, y: 36, r: 13, fill: col, stroke: "#fff", sw: 3, cursor: "grab", attrs: {"aria-label": "Precio " + nom, "aria-valuenow": S[key], "data-tip": "Arrastra el precio de " + nom}});
      rm.put(id + "t", "text", {x: x + (q ? 18 : -18), y: 22 + q * 0, text: `${nom} ${mxn(S[key])}`, size: 13, weight: 700, fill: col, anchor: q ? "start" : "end"});
      if (!this.armado) arrastrable(hd, svg, pt => cambiar({[key]: inv(pt.x)}), (d, mult) => cambiar({[key]: clamp(S[key] + d * mult * 10, 49, 1299)}));
    });
    this.armado = true;
    const barato = D.mercado_planes.filter(p => p.precio > S.precioServicio).length, tot = D.mercado_planes.length;
    const sust = SUST[S.sustituto], kimp = S.precioServicio / sust;
    $("#ocp").innerHTML = [...this.oculto].map(p => `<button class="btn" data-rp="${esc(p)}">↩ ${esc(p)}</button>`).join("") + (this.oculto.size ? `<button class="btn dor" data-rp="*">Mostrar todos</button>` : "");
    $$("#sus [data-sus]").forEach(b => b.setAttribute("aria-pressed", b.dataset.sus === S.sustituto));
    $(".btn.dor", $("#sus")).textContent = `Poner el precio de la regla (K = ${S.K})`;
    const dentro = S.precioServicio <= 349;
    return {
      leyenda: `<span>Cada color es un proveedor; más claro = plan más barato</span><span><i style="background:${C.vino}"></i>Servicio de Carta</span><span><i style="background:${C.osc}"></i>Salón de Carta</span>`,
      cifras: [[`${barato} de ${tot}`, `planes cuestan más que Servicio a ${mxn(S.precioServicio)}`, "propuesta"], [n(100 * kimp) + " %", `del precio de ${S.sustituto} (${mxn(sust)}): K implícita ${kimp.toFixed(2)}`], [mxn(redondea(reglaPrecio(sust, S.K, S.soporte), S.soporte)), `precio de la regla con K = ${S.K} y soporte ${S.soporte}`, "propuesta"], [mxn(Math.round(piso(S.precioServicio, S.soporte))), "piso: lo que cuesta atender a un cliente de paga"]],
      insight: dentro ? "Meniu ya ofrece caja, cocina y pedir desde la mesa por $225: a este precio Carta sólo gana si la mesa que pide junta y la sencillez valen la diferencia." : "A este precio Carta queda arriba del corredor propuesto (249 a 349): lo tiene que justificar la orden compartida.",
    };
  },
};
