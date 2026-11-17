/* ===== detalle: ¿Está el negocio en línea? ===== */
const TAM = ["0 a 5 personas", "6 a 10", "11 a 30", "31 a 50", "51 a 100", "101 a 250", "251 o más"];
const EJTAM = [["fonda", "Fonda o taquería de barrio"], ["barrio", "Restaurante de barrio"], ["restaurante", "Restaurante con meseros"], ["salon", "Con terraza o salón"], ["restaurante", "Con varias áreas y gerente"], ["hotel", "Restaurante de hotel"], ["grupo", "Grupo de locales"]];
DET.linea = {
  titulo: "El comensal ya está conectado; la mayoría de los negocios, no.",
  fu: ["inegi_endutih", "inegi_denue", "carta_mercado", "carta_muestra"],
  nota: "Dibujos ilustrativos por tamaño. El DENUE no ve Facebook, Instagram ni WhatsApp: «sin sitio web» no es «sin presencia en línea». La tira de sitios sale de la muestra de las 17 zonas metropolitanas (166 sitios declarados en el DENUE, 200 intentos de lectura, 16 de noviembre de 2026; controles del marco en muestra-500-cartas §14, con sus datos en muestra-denue-descartes.csv y muestra-denue-control-dns.csv): fuera de esas zonas no se midió y no hay cifra nacional ni para el núcleo.",
  montar(host) {
    this.sel = 0;
    host.innerHTML = `<div class="viz"><svg id="svLinea" viewBox="0 0 1100 500" role="img" font-family="DM Sans, sans-serif"></svg></div><div class="viz" style="margin-top:14px"><svg id="svSitios" viewBox="0 0 1100 245" role="img" aria-label="De 166 sitios declarados, cuántos siguen vivos" font-family="DM Sans, sans-serif"></svg></div>`;
    this.pintaSitios();
    const svg = $("#svLinea", host); this.rm = RM(svg); this.svg = svg;
    const elige = ev => { const t = ev.target.closest("[data-i]"); if (t && +t.dataset.i !== this.sel) { this.sel = +t.dataset.i; refrescar(); } };
    svg.addEventListener("mouseover", elige); svg.addEventListener("click", elige); svg.addEventListener("focusin", elige);
    svg.addEventListener("keydown", ev => { if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); this.sel = clamp(this.sel + (ev.key === "ArrowDown" ? 1 : -1), 0, TAM.length - 1); refrescar(); const f = $(`[data-i="${this.sel}"]`, svg); if (f) f.focus(); } });
  },
  /* los sitios que declaran los negocios en el DENUE: de 166 (muestra de 17 zonas metropolitanas), sólo 4 de cada 10 siguen vivos */
  pintaSitios() {
    const tienda = (x, y, vivo, i) => {
      if (vivo) return `<g class="gh" style="animation-delay:${i * 70}ms"><ellipse cx="${x + 38}" cy="${y + 96}" rx="40" ry="5" fill="#000" opacity=".14"/><circle cx="${x + 38}" cy="${y + 62}" r="46" fill="#ffd36b" opacity=".35"/><rect x="${x + 8}" y="${y + 34}" width="60" height="60" rx="6" fill="#f6e6cc"/>${[0, 1, 2, 3, 4].map(q => `<path d="M${x + 4 + q * 14.4} ${y + 22} h14.6 v14 q-7.3 8 -14.6 0z" fill="${q % 2 ? "#fef9f1" : "#6b2d3e"}"/>`).join("")}<rect x="${x + 16}" y="${y + 50}" width="22" height="22" rx="3" fill="#ffd98a"/><rect x="${x + 44}" y="${y + 52}" width="16" height="42" rx="3" fill="#4f1728"/><circle cx="${x + 38}" cy="${y + 6}" r="11" fill="${C.verde}"/><path d="M${x + 32} ${y + 6} l4 4 l8 -9" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
      return `<g class="gh" style="animation-delay:${i * 70}ms"><ellipse cx="${x + 38}" cy="${y + 96}" rx="40" ry="5" fill="#000" opacity=".08"/><rect x="${x + 8}" y="${y + 34}" width="60" height="60" rx="6" fill="#d8d0c4"/>${[0, 1, 2, 3, 4].map(q => `<path d="M${x + 4 + q * 14.4} ${y + 22} h14.6 v14 q-7.3 8 -14.6 0z" fill="${q % 2 ? "#e6e0d6" : "#a89f93"}"/>`).join("")}<rect x="${x + 16}" y="${y + 50}" width="22" height="22" rx="3" fill="#8f877b"/><path d="M${x + 16} ${y + 72} L${x + 38} ${y + 50} M${x + 16} ${y + 50} L${x + 38} ${y + 72}" stroke="#d8d0c4" stroke-width="2"/><rect x="${x + 44}" y="${y + 52}" width="16" height="42" rx="3" fill="#6f675c"/><path d="M${x + 44} ${y + 66} L${x + 60} ${y + 60} M${x + 44} ${y + 80} L${x + 60} ${y + 74}" stroke="#d8d0c4" stroke-width="3"/><circle cx="${x + 38}" cy="${y + 6}" r="11" fill="${C.rojo}"/><path d="M${x + 33} ${y + 1} l10 10 M${x + 43} ${y + 1} l-10 10" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></g>`;
    };
    const tip = (txt, pr) => `data-tip="${esc2(txt)}" data-tipp="${pr}"`;
    let b = `<rect x="860" y="12" width="210" height="28" rx="14" fill="${C.dorado}"/>` + T(965, 31, "17 zonas metropolitanas", 12.5, "#fff", "middle", 700);
    b += T(30, 52, "De cada 10 negocios que declaran sitio web,", 30, C.vino, "start", 400, true) + T(30, 90, "sólo 4 lo mantienen vivo.", 30, C.rojo, "start", 400, true);
    for (let i = 0; i < 10; i++) {
      const vivo = i < 4, x = 30 + i * 102, grupo = vivo ? tip("Sitios vivos|64 de 166 · 39 %|llevan a una página viva del negocio", 0.39) : i < 9 ? tip("Sitios caídos|81 de 166 · 49 %|están caídos; 71 con el dominio que ya no existe", 0.49) : tip("Otros|21 de 166 · 13 %|12 bloquean la lectura, 5 son sólo una red social y 4 los ocupa otro sitio", 0.13);
      b += `<g ${grupo} tabindex="0">${tienda(x, 106, vivo, i)}</g>`;
    }
    b += T(30, 226, "Cada ícono son ≈ 17 de los 166 sitios declarados en el DENUE. Su presencia en línea está abandonada: Carta puede ser la que sí está viva.", 14, C.osc, "start", 700);
    $("#svSitios").innerHTML = b;
  },
  actualizar() {
    const rm = this.rm, X0 = 216, W = 290, Y0 = 134, RH = 46, sel = this.sel, cfg = config(S), wi = W * M.usa_internet_pct / 100, wc = wi * M.celular_pct / 100;
    rm.put("gl0", "text", {x: X0 - 12, y: 36, text: "Mexicanos que usan internet", size: 13, weight: 700, fill: C.vino, anchor: "end"});
    rm.put("g0", "rect", {x: X0, y: 16, w: wi, h: 28, rx: 14, fill: C.vino, grow: false});
    rm.put("gv0", "text", {x: X0 + wi + 12, y: 36, text: `${M.usa_internet_pct} %`, size: 16, weight: 700, fill: C.vino});
    rm.put("gl1", "text", {x: X0 - 12, y: 64, text: "…y de ellos, desde el celular", size: 13, fill: C.t2, anchor: "end"});
    rm.put("g1", "rect", {x: X0, y: 48, w: wc, h: 22, rx: 11, fill: C.vino2 || "#6b2d3e", grow: false});
    rm.put("gv1", "text", {x: X0 + wc + 12, y: 64, text: `${Math.round(M.celular_pct)} % de ellos`, size: 13, weight: 700, fill: C.t2});
    rm.put("t2", "text", {x: 30, y: 100, text: "Negocios que declaran sitio web, por tamaño (personas ocupadas)", size: 14, weight: 700, fill: C.dorado});
    M.estratos.forEach((e, i) => {
      const y = Y0 + i * RH, on = i === sel, op = on ? 1 : 0.62;
      if (on) rm.put("band", "rect", {x: 20, y: y - 6, w: 560, h: RH - 4, rx: 14, fill: C.a2, grow: false});
      rm.put("l" + i, "text", {x: X0 - 12, y: y + 20, text: TAM[i], size: 13.5, weight: on ? 700 : 400, fill: C.tinta, anchor: "end", op: on ? 1 : 0.8});
      rm.put("k" + i, "rect", {x: X0, y: y + 4, w: W, h: 24, rx: 12, fill: on ? "#fff" : C.a2});
      rm.put("f" + i, "rect", {x: X0, y: y + 4, w: Math.max(W * e.pct_sitio / 100, 4), h: 24, rx: 12, fill: C.dorado, op});
      rm.put("v" + i, "text", {x: X0 + W + 12, y: y + 22, text: `${n(e.pct_sitio, 1)} %`, size: 15, weight: 700, fill: C.tinta, op: on ? 1 : 0.8});
      rm.put("h" + i, "rect", {x: 20, y: y - 6, w: 560, h: RH - 4, rx: 14, fill: "rgba(0,0,0,0)", cursor: "pointer", grow: false, attrs: {"data-i": i, role: "button", tabindex: 0, "aria-pressed": on, "aria-label": `${TAM[i]}: ${n(e.pct_sitio, 1)} % declara sitio web`}});
    });
    // la línea de referencia: va encima de las barras y sube hasta tocar la barra de los mexicanos que usan internet
    rm.put("ref", "rect", {x: X0 + wi - 1.25, y: 44, w: 2.5, h: Y0 + RH * 7 - 6 - 44, rx: 1.2, fill: C.vino, grow: false, op: 0.6});
    // corchetes: a qué plan le toca cada tamaño y cuánto representaría si todos pagaran
    const grupos = []; SEG.estratos.forEach((q, i) => { const p = planDe(q, cfg), u = grupos[grupos.length - 1]; if (u && u.p === p) { u.f = i; u.neg += q.negocios; } else grupos.push({p, i, f: i, neg: q.negocios}); });
    const totN = SEG.estratos.reduce((a, q) => a + q.negocios, 0), precio = [0, S.precioServicio, S.precioSalon];
    for (let g = 0; g < 3; g++) {
      const u = grupos.find(z => z.p === g), y1 = u ? Y0 + u.i * RH - 2 : 0, y2 = u ? Y0 + (u.f + 1) * RH - 10 : 0, col = COLPLAN[g];
      rm.put("bk" + g, "rect", {x: 590, y: y1, w: u ? 6 : 0, h: u ? y2 - y1 : 0, rx: 3, fill: col, grow: false});
      rm.put("bkt" + g, "rect", {x: 590, y: y1, w: u ? 14 : 0, h: 6, rx: 3, fill: col, grow: false});
      rm.put("bkb" + g, "rect", {x: 590, y: y2 - 6, w: u ? 14 : 0, h: 6, rx: 3, fill: col, grow: false});
      const ym = u ? (y1 + y2) / 2 : 0;
      rm.put("bn" + g, "text", {x: 618, y: ym - 14, text: u ? NOMPLAN[g] : "", size: 17, fill: col, serif: true});
      rm.put("bs" + g, "text", {x: 618, y: ym + 4, text: u ? `${n(u.neg)} negocios · ${n(100 * u.neg / totN, 1)} %` : "", size: 12.5, weight: 700, fill: C.tinta});
      rm.put("bg" + g, "text", {x: 618, y: ym + 22, text: u ? (g === 0 ? "gratis: lleva anuncios" : `si todos pagaran: $${n(u.neg * precio[g] / 1e6, 1)} M al mes`) : "", size: 12, fill: C.t2});
    }
    // lo que se ve del tamaño elegido: un dibujo y dos números (a la derecha, sin chocar con nada)
    const e = M.estratos[sel], [tipo, ejem] = EJTAM[sel], px = 820;
    rm.put("pn", "rect", {x: px, y: 84, w: 270, h: 410, rx: 24, fill: C.a2, grow: false});
    const g = rm.put("ej", "g", {x: px + 3, y: 92});
    if (this.ult !== sel) { this.ult = sel; g.innerHTML = escena(tipo); g.style.animation = "none"; void g.getBoundingClientRect(); g.style.animation = REDUCE ? "none" : "fundir .45s ease both"; }
    rm.put("e0", "text", {x: px + 18, y: 306, text: ejem, size: 13.5, weight: 700, fill: C.osc});
    rm.put("e1", "text", {x: px + 18, y: 354, text: `${n(e.pct_sitio, 1)} %`, size: 46, fill: C.vino, serif: true});
    rm.put("e2", "text", {x: px + 18, y: 376, text: "declara sitio web", size: 13, fill: C.t2});
    rm.put("e3", "text", {x: px + 18, y: 412, text: `${n(e.con_sitio)} de ${n(e.n)}`, size: 18, fill: C.tinta, serif: true});
    rm.put("e4", "text", {x: px + 18, y: 432, text: "negocios de este tamaño", size: 12.5, fill: C.t2});
    rm.put("e5", "text", {x: px + 18, y: 466, text: `= ${n(100 * e.n / M.nucleo, 1)} % de los ${n(M.nucleo)}`, size: 13.5, weight: 700, fill: C.vino});
    const chicos = M.estratos.slice(0, 3), con = chicos.reduce((a, x) => a + x.con_sitio, 0), tot = chicos.reduce((a, x) => a + x.n, 0);
    return {
      leyenda: `<span><i style="background:${C.dorado}"></i>negocios con sitio web</span><span><i style="background:${C.vino}"></i>límite: lo que ya hace el comensal</span>${COLPLAN.map((col, i) => `<span><i style="background:${col}"></i>${NOMPLAN[i]}</span>`).join("")}`,
      cifras: [[n(100 * con / tot, 1) + " %", `de los ${n(tot)} negocios de menos de 31 personas declara sitio`], [n(M.estratos[2].pct_sitio, 1) + " %", "de los de 11 a 30 personas: el tramo chico que más declara"], [n(M.micro_con_sitio_pct, 1) + " %", `de ${n(M.micro_n)} micronegocios de comida declara sitio`]],
      puntos: [
        `Casi todos los comensales usan celular (${Math.round(M.celular_pct)} %): el menú por QR llega a donde ya están.`,
        `Los clientes más fáciles de sumar, gratis y de boca en boca: la fonda familiar y la taquería de barrio (0 a 5 personas) y el restaurante de barrio con 8 a 10 mesas. Por debajo de 31 personas declaran sitio ${n(100 * con / tot, 1)} de cada 100; de 11 a 30, ${n(M.estratos[2].pct_sitio / 10, 1)} de cada 10.`,
        "Los demás costarán más trabajo, conforme el producto demuestre su valor a bajo costo.",
      ],
    };
  },
};

/* ===== detalle: ¿Qué existe y a qué precio? (tabla interactiva) ===== */
const FUT_DEF = [4, 5, 6, 7, 8, 9, 10, 11]; // pantalla de cocina … reportes: fases futuras por definir
const ORDEN0 = {k: "precio", dir: 1};
DET.matriz = {
  titulo: "Ninguna página de precios leída publica el pedido en grupo; es el hueco que Carta quiere ocupar con la Fase 3.",
  fu: ["paginas_proveedores_14nov", "carta_precio"],
  nota: "Leídas el 14 de noviembre. Hay un indicio de OlaClick sin comprobar (página borrada de «mesa virtual») y falta la prueba con dos teléfonos. «No publicado» no cuenta como «no lo tiene».",
  montar(host) {
    this.orden = {...ORDEN0}; this.oculF = new Set(); this.oculC = new Set(); this.sinPrecio = false;
    host.innerHTML = `<div class="viz" style="position:relative"><svg id="svMx" viewBox="0 0 1100 560" role="img" font-family="DM Sans, sans-serif"></svg><div id="fnCard" class="fncard" hidden></div></div><div id="oc" class="seg" style="margin-top:8px"></div>`;
    const svg = $("#svMx", host); this.rm = RM(svg); const card = $("#fnCard", host);
    svg.addEventListener("click", ev => {
      const t = ev.target.closest("[data-a]"); if (!t) return;
      const [a, v] = t.dataset.a.split(":");
      if (a === "ord") { const k = v === "precio" || v === "cob" ? v : +v; this.orden = {k, dir: this.orden.k === k ? -this.orden.dir : -1}; }
      else if (a === "fila") this.oculF.add(+v);
      else if (a === "col") this.oculC.add(+v);
      else if (a === "precio") this.sinPrecio = true;
      card.hidden = true; refrescar();
    });
    const muestra = ev => { const t = ev.target.closest("[data-fn]"); if (!t) { card.hidden = true; return; } const j = +t.dataset.fn; if (card.__j !== j) { card.__j = j; card.innerHTML = `<div class="fn">${fnDib(j)}</div><b>${esc(MX.trabajos[j])}</b>`; } const r = t.getBoundingClientRect(), v = svg.parentElement.getBoundingClientRect(); card.hidden = false; card.style.left = clamp(r.left - v.left + r.width / 2 - 70, 6, v.width - 150) + "px"; card.style.top = Math.max(6, r.bottom - v.top + 8) + "px"; };
    svg.addEventListener("mouseover", muestra); svg.addEventListener("focusin", muestra);
    svg.addEventListener("mouseleave", () => { card.hidden = true; });
    host.addEventListener("click", ev => { const r = ev.target.closest("[data-rest]"); if (!r) return; const [a, v] = r.dataset.rest.split(":"); if (a === "fila") this.oculF.delete(+v); else if (a === "col") this.oculC.delete(+v); else if (a === "precio") this.sinPrecio = false; else if (a === "todo") { this.oculF.clear(); this.oculC.clear(); this.sinPrecio = false; this.orden = {...ORDEN0}; } refrescar(); });
  },
  actualizar() {
    const rm = this.rm, cw = 42, RH = 30, y0 = 150;
    const cols = MX.trabajos.map((_, j) => j).filter(j => !this.oculC.has(j));
    const val = c => (c === "si" ? 2 : c === "np" ? 1 : 0);
    const cob = f => cols.filter(j => f.celdas[j] === "si").length;
    let filas = MX.filas.map((f, i) => ({f, i})).filter(o => !this.oculF.has(o.i));
    const {k, dir} = this.orden;
    if (k != null) filas.sort((a, b) => dir * ((k === "precio" ? a.f.precio - b.f.precio : k === "cob" ? cob(a.f) - cob(b.f) : val(a.f.celdas[k]) - val(b.f.celdas[k])) || a.i - b.i));
    const xp = 215, wp = 100, xj = this.sinPrecio ? 215 : xp + wp + 10;
    const maxp = 1243, calor = p => { const t = clamp(p / maxp, 0, 1), m = (a, b) => Math.round(a + (b - a) * t); return `rgb(${m(0xe6, 0x4f)},${m(0xd9, 0x17)},${m(0xc9, 0x28)})`; };
    const colCob = r => (r >= 0.66 ? C.verde : r >= 0.33 ? C.dorado : C.rojo);
    // encabezados
    rm.put("hp", "text", {x: xp, y: y0 - 12, text: this.sinPrecio ? "" : "Precio al mes ▲", size: 12.5, weight: 700, fill: C.vino});
    rm.put("hpo", "rect", {x: xp, y: y0 - 30, w: this.sinPrecio ? 0 : wp - 26, h: 22, rx: 8, fill: "rgba(0,0,0,0)", cursor: "pointer", grow: false, attrs: {"data-a": "ord:precio", "data-tip": "Ordenar por precio", role: "button", tabindex: 0}});
    rm.put("hpx", "text", {x: xp + wp - 2, y: y0 - 12, text: this.sinPrecio ? "" : "✕", size: 12, fill: C.t2, anchor: "end"});
    rm.put("hpxr", "rect", {x: xp + wp - 24, y: y0 - 30, w: this.sinPrecio ? 0 : 24, h: 22, rx: 8, fill: "rgba(0,0,0,0)", cursor: "pointer", grow: false, attrs: {"data-a": "precio:x", "data-tip": "Ocultar el precio", role: "button", tabindex: 0}});
    MX.trabajos.forEach((t, j) => {
      const oc = this.oculC.has(j), x = xj + cols.indexOf(j) * cw;
      rm.put("hc" + j, "text", {x: x + cw / 2 - 6, y: y0 - 18, text: oc ? "" : t, size: 12.5, weight: j === 2 ? 700 : 400, fill: j === 2 ? C.osc : C.t2, rot: -50});
      rm.put("hco" + j, "rect", {x: x, y: y0 - 56, w: oc ? 0 : cw - 18, h: 50, rx: 8, fill: "rgba(0,0,0,0)", cursor: "pointer", grow: false, attrs: {"data-a": "ord:" + j, "data-fn": j, role: "button", tabindex: 0, "aria-label": "Ordenar por «" + t + "»"}});
      rm.put("hcx" + j, "rect", {x: x + cw - 20, y: y0 - 26, w: oc ? 0 : 18, h: 18, rx: 9, fill: "rgba(0,0,0,0)", cursor: "pointer", grow: false, attrs: {"data-a": "col:" + j, "data-tip": "Ocultar la columna", role: "button", tabindex: 0}});
      rm.put("hcxt" + j, "text", {x: x + cw - 11, y: y0 - 13, text: oc ? "" : "✕", size: 10.5, fill: C.t2, anchor: "middle"});
    });
    const xc = xj + cols.length * cw + 6;
    rm.put("hcob", "text", {x: xc, y: y0 - 12, text: "Cobertura", size: 12.5, weight: 700, fill: C.vino});
    rm.put("hcobo", "rect", {x: xc, y: y0 - 30, w: 90, h: 22, rx: 8, fill: "rgba(0,0,0,0)", cursor: "pointer", grow: false, attrs: {"data-a": "ord:cob", "data-tip": "Ordenar por cuántas funciones cubre", role: "button", tabindex: 0}});
    // filas
    MX.filas.forEach((f, i) => {
      const idx = filas.findIndex(o => o.i === i), visible = idx >= 0, y = y0 + (visible ? idx : filas.length) * RH, op = visible ? 1 : 0;
      rm.put("rb" + i, "rect", {x: 14, y: y + 1, w: visible ? 1072 : 0, h: RH - 2, rx: 10, fill: idx % 2 ? "rgba(0,0,0,0)" : C.a2, grow: false, op});
      if (f.nombre === "Meniu Business") rm.put("rm" + i, "rect", {x: 14, y: y + 1, w: visible ? 1072 : 0, h: RH - 2, rx: 10, fill: "rgba(184,134,11,.18)", grow: false, op});
      rm.put("rl" + i, "text", {x: xp - 12, y: y + 19, text: f.nombre + " " + f.plan, size: 12.5, weight: 700, fill: C.tinta, anchor: "end", op});
      rm.put("rx" + i, "rect", {x: 0, y: y + 3, w: visible ? xp - 8 : 0, h: 22, rx: 8, fill: "rgba(0,0,0,0)", cursor: "pointer", grow: false, attrs: {"data-a": "fila:" + i, "data-tip": "Toca para ocultar esta fila", role: "button", tabindex: 0}});
      rm.put("pb" + i, "rect", {x: xp, y: y + 5, w: this.sinPrecio || !visible ? 0 : Math.max(6, wp * f.precio / maxp), h: 18, rx: 6, fill: calor(f.precio), op, title: mxn(f.precio) + " al mes"});
      rm.put("pt" + i, "text", {x: xp + 6, y: y + 19, text: this.sinPrecio ? "" : mxn(f.precio), size: 11.5, weight: 700, fill: f.precio / maxp > 0.45 ? "#fff" : C.tinta, op});
      MX.trabajos.forEach((t, j) => {
        const c = f.celdas[j], oc = this.oculC.has(j), x = xj + cols.indexOf(j) * cw, show = visible && !oc;
        const fill = c === "si" ? C.vino : c === "no" ? C.arena : "rgba(0,0,0,0)";
        rm.put(`c${i}_${j}`, "rect", {x: x, y: y + 4, w: show ? cw - 10 : 0, h: 20, rx: 7, fill, stroke: c === "np" ? C.gris : "rgba(0,0,0,0)", sw: 1.4, dash: "3 3", op, title: `${f.nombre} ${f.plan} · ${t}: ${c === "si" ? "lo incluye" : c === "no" ? "la página dice que no" : "no publicado"}`});
      });
      const r = cob(f) / Math.max(cols.length, 1);
      rm.put("cb" + i, "rect", {x: xc, y: y + 8, w: visible ? 80 * r : 0, h: 12, rx: 6, fill: colCob(r), op});
      rm.put("ct" + i, "text", {x: xc + 86, y: y + 19, text: visible ? `${cob(f)}/${cols.length}` : "", size: 11.5, weight: 700, fill: colCob(r), op});
      const tag = f.nombre === "Meniu Business" ? "competidor principal" : f.precio === 0 ? "capa gratuita" : "";
      rm.put("tg" + i, "text", {x: xc + 126, y: y + 19, text: visible ? tag : "", size: 11, weight: 700, fill: f.precio === 0 ? C.verde : C.dorado, op});
    });
    // Carta
    const yc = y0 + filas.length * RH + 10;
    rm.put("lc", "line", {x1: 20, y1: yc - 4, x2: 1080, y2: yc - 4, stroke: C.arena, sw: 2});
    rm.put("cn", "text", {x: xp - 12, y: yc + 22, text: "Carta (propuesta)", size: 13.5, weight: 700, fill: C.dorado, anchor: "end"});
    rm.put("cp", "rect", {x: xp, y: yc + 7, w: this.sinPrecio ? 0 : Math.max(6, wp * S.precioServicio / maxp), h: 18, rx: 6, fill: C.dorado});
    rm.put("cpt", "text", {x: xp + 6, y: yc + 21, text: this.sinPrecio ? "" : mxn(S.precioServicio), size: 11.5, weight: 700, fill: C.tinta});
    MX.trabajos.forEach((t, j) => {
      const oc = this.oculC.has(j), x = xj + cols.indexOf(j) * cw;
      const estado = j === 0 ? "hoy" : j <= 3 ? "fut" : "def";
      rm.put("cc" + j, "rect", {x: x, y: yc + 6, w: oc ? 0 : cw - 10, h: 20, rx: 7, fill: estado === "hoy" ? C.dorado : "rgba(0,0,0,0)", stroke: estado === "hoy" ? "rgba(0,0,0,0)" : C.dorado, sw: estado === "fut" ? 2.2 : 1.4, dash: estado === "def" ? "2 4" : "", op: estado === "def" ? 0.8 : 1, title: `Carta · ${t}: ${estado === "hoy" ? "en producción" : estado === "fut" ? "Fase 3, aún no construida" : "fase futura, por definir"}`});
    });
    const defCols = FUT_DEF.filter(j => !this.oculC.has(j)).map(j => cols.indexOf(j));
    rm.put("br", "line", {x1: defCols.length ? xj + defCols[0] * cw : 0, y1: yc + 36, x2: defCols.length ? xj + defCols[defCols.length - 1] * cw + cw - 10 : 0, y2: yc + 36, stroke: C.dorado, sw: 2});
    rm.put("brt", "text", {x: defCols.length ? xj + (defCols[0] + defCols[defCols.length - 1] + 1) * cw / 2 - 5 : 0, y: yc + 54, text: defCols.length ? "fases futuras · por definir" : "", size: 12.5, weight: 700, fill: C.dorado, anchor: "middle"});
    rm.put("gr", "rect", {x: xj + 2 * cw - 6, y: y0 - 6, w: this.oculC.has(2) ? 0 : cw - 2, h: filas.length * RH + 54 + 8, rx: 12, fill: "rgba(0,0,0,0)", stroke: C.dorado, sw: 2.4, grow: false});
    $("#svMx").setAttribute("viewBox", `0 0 1100 ${Math.max(430, yc + 70)}`);
    const oc = [...this.oculF].map(i => `<button class="btn" data-rest="fila:${i}">↩ ${esc(MX.filas[i].nombre)}</button>`).concat([...this.oculC].map(j => `<button class="btn" data-rest="col:${j}">↩ ${esc(MX.trabajos[j])}</button>`), this.sinPrecio ? [`<button class="btn" data-rest="precio:x">↩ Precio</button>`] : [], (this.oculF.size + this.oculC.size || this.sinPrecio || this.orden.k !== ORDEN0.k || this.orden.dir !== ORDEN0.dir) ? [`<button class="btn dor" data-rest="todo:x">Restablecer</button>`] : []);
    $("#oc").innerHTML = oc.join("");
    return {
      leyenda: `<span><i style="background:${C.vino}"></i>lo incluye</span><span><i style="background:${C.arena}"></i>la página dice que no</span><span><i style="background:none;border:1.5px dashed ${C.gris}"></i>no publicado</span><span><i style="background:${C.verde}"></i>cobertura alta</span><span><i style="background:${C.dorado}"></i>media</span><span><i style="background:${C.rojo}"></i>baja</span>`,
      cifras: [["9 de 12", "funciones cubre Meniu Business por $225 al mes"], ["0 de 10", "planes leídos que publican el pedido en grupo"], [mxn(S.precioServicio), "Master Chef de Carta en el escenario activo", "propuesta"]],
      puntos: [
        "Meniu Business es el competidor principal: cubre 9 de 12 funciones por $225 al mes.",
        "Waitry Premium, el más caro ($1,243) y con menos cobertura, no preocupa.",
        "Las capas gratuitas (Neolo, Loyverse) sirven para ubicar la nuestra: ninguna publica pedir en grupo.",
      ],
    };
  },
};
