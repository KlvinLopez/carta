/* ===== detalle: ¿Está el negocio en línea? ===== */
const TAM = ["0 a 5 personas", "6 a 10", "11 a 30", "31 a 50", "51 a 100", "101 a 250", "251 o más"];
const EJTAM = [["fonda", "Fonda o taquería de barrio"], ["barrio", "Restaurante de barrio"], ["restaurante", "Restaurante con meseros"], ["salon", "Con terraza o salón"], ["restaurante", "Con varias áreas y gerente"], ["hotel", "Restaurante de hotel"], ["grupo", "Grupo de locales"]];
DET.linea = {
  titulo: "El comensal ya está conectado; la mayoría de los negocios, no.",
  fu: ["inegi_endutih", "inegi_denue"],
  nota: "Dibujos ilustrativos por tamaño. El DENUE no ve Facebook, Instagram ni WhatsApp: «sin sitio web» no es «sin presencia en línea».",
  montar(host) {
    this.sel = 0;
    host.innerHTML = `<div class="viz"><svg id="svLinea" viewBox="0 0 960 500" role="img" font-family="DM Sans, sans-serif"></svg></div>`;
    const svg = $("#svLinea", host); this.rm = RM(svg); this.svg = svg;
    const elige = ev => { const t = ev.target.closest("[data-i]"); if (t && +t.dataset.i !== this.sel) { this.sel = +t.dataset.i; refrescar(); } };
    svg.addEventListener("mouseover", elige); svg.addEventListener("click", elige); svg.addEventListener("focusin", elige);
    svg.addEventListener("keydown", ev => { if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); this.sel = clamp(this.sel + (ev.key === "ArrowDown" ? 1 : -1), 0, TAM.length - 1); refrescar(); const f = $(`[data-i="${this.sel}"]`, svg); if (f) f.focus(); } });
  },
  actualizar() {
    const rm = this.rm, X0 = 160, W = 440, Y0 = 134, RH = 46, sel = this.sel;
    // el guiño: lo que ya pasa del lado del comensal
    rm.put("g0", "rect", {x: 30, y: 12, w: 900, h: 46, rx: 23, fill: C.vino, grow: false});
    rm.put("gp", "rect", {x: 52, y: 22, w: 15, h: 26, rx: 4, fill: "#fef9f1", grow: false});
    rm.put("gq", "rect", {x: 55, y: 26, w: 9, h: 16, rx: 2, fill: C.vino, grow: false});
    rm.put("gt", "text", {x: 82, y: 42, text: `${M.usa_internet_pct} % de los mexicanos usa internet; casi todos (${Math.round(M.celular_pct)} %) desde el celular`, size: 16, weight: 700, fill: "#fff"});
    rm.put("t2", "text", {x: 30, y: 100, text: "Negocios que declaran sitio web, por tamaño (personas ocupadas)", size: 14, weight: 700, fill: C.dorado});
    const xl = X0 + W * M.usa_internet_pct / 100;
    rm.put("ref", "rect", {x: xl - 1, y: Y0 - 14, w: 2.5, h: RH * 7 - 6, rx: 1, fill: C.vino, grow: false, op: 0.55});
    rm.put("reft", "text", {x: xl, y: Y0 - 20, text: `${M.usa_internet_pct} %`, size: 12, weight: 700, fill: C.vino, anchor: "middle"});
    M.estratos.forEach((e, i) => {
      const y = Y0 + i * RH, on = i === sel, op = on ? 1 : 0.62;
      if (on) rm.put("band", "rect", {x: 20, y: y - 6, w: X0 + W + 90 - 20, h: RH - 4, rx: 14, fill: C.a2, grow: false});
      rm.put("l" + i, "text", {x: X0 - 12, y: y + 20, text: TAM[i], size: 13.5, weight: on ? 700 : 400, fill: C.tinta, anchor: "end", op: on ? 1 : 0.8});
      rm.put("k" + i, "rect", {x: X0, y: y + 4, w: W, h: 24, rx: 12, fill: on ? "#fff" : C.a2});
      rm.put("f" + i, "rect", {x: X0, y: y + 4, w: Math.max(W * e.pct_sitio / 100, 4), h: 24, rx: 12, fill: C.dorado, op});
      rm.put("v" + i, "text", {x: X0 + W + 14, y: y + 22, text: `${n(e.pct_sitio, 1)} %`, size: 15, weight: 700, fill: C.tinta, op: on ? 1 : 0.8});
      rm.put("h" + i, "rect", {x: 20, y: y - 6, w: X0 + W + 90 - 20, h: RH - 4, rx: 14, fill: "rgba(0,0,0,0)", cursor: "pointer", grow: false, attrs: {"data-i": i, role: "button", tabindex: 0, "aria-pressed": on, "aria-label": `${TAM[i]}: ${n(e.pct_sitio, 1)} % declara sitio web`}});
    });
    // lo que se ve del tamaño elegido: un dibujo y dos números
    const e = M.estratos[sel], [tipo, ejem] = EJTAM[sel], px = 690;
    rm.put("pn", "rect", {x: px, y: 96, w: 240, h: 380, rx: 22, fill: C.a2, grow: false});
    const g = rm.put("ej", "g", {x: px + 22, y: 110});
    if (this.ult !== sel) { this.ult = sel; g.innerHTML = dibujo(tipo, 0, 0, 1.25); g.style.animation = "none"; void g.getBoundingClientRect(); g.style.animation = REDUCE ? "none" : "fundir .45s ease both"; }
    rm.put("e0", "text", {x: px + 22, y: 266, text: ejem, size: 13, weight: 700, fill: C.osc});
    rm.put("e1", "text", {x: px + 22, y: 330, text: `${n(e.pct_sitio, 1)} %`, size: 48, fill: C.vino, serif: true});
    rm.put("e2", "text", {x: px + 22, y: 354, text: "declara sitio web", size: 13, fill: C.t2});
    rm.put("e3", "text", {x: px + 22, y: 396, text: `${n(e.con_sitio)} de ${n(e.n)}`, size: 20, fill: C.tinta, serif: true});
    rm.put("e4", "text", {x: px + 22, y: 418, text: "negocios de este tamaño", size: 12.5, fill: C.t2});
    rm.put("e5", "text", {x: px + 22, y: 450, text: `= ${n(100 * e.n / M.nucleo, 1)} % de los ${n(M.nucleo)}`, size: 14, weight: 700, fill: C.vino});
    const chicos = M.estratos.slice(0, 3), con = chicos.reduce((a, x) => a + x.con_sitio, 0), tot = chicos.reduce((a, x) => a + x.n, 0);
    return {
      leyenda: `<span><i style="background:${C.dorado}"></i>negocios con sitio web</span><span><i style="background:${C.vino}"></i>límite: lo que ya hace el comensal</span>`,
      cifras: [[n(100 * con / tot, 1) + " %", `de los ${n(tot)} negocios de menos de 31 personas declara sitio`], [n(M.estratos[2].pct_sitio, 1) + " %", "de los de 11 a 30 personas: el tramo chico que más declara"], [n(M.micro_con_sitio_pct, 1) + " %", `de ${n(M.micro_n)} micronegocios de comida declara sitio`]],
      puntos: [
        `Casi todos los comensales usan celular (${Math.round(M.celular_pct)} %): el menú por QR llega a donde ya están.`,
        `Los clientes más fáciles de sumar, gratis y de boca en boca: la fonda familiar y la taquería de barrio (0 a 5 personas) y el restaurante de barrio con 8 a 10 mesas. Por debajo de 31 personas declaran sitio ${n(100 * con / tot, 1)} de cada 100; de 11 a 30, ${n(M.estratos[2].pct_sitio / 10, 1)} de cada 10.`,
        "Los demás costarán más trabajo, conforme el producto demuestre su valor a bajo costo.",
      ],
    };
  },
};

/* ===== detalle: ¿Cuántos negocios hay? (una barra que se parte por niveles) ===== */
const NIV = () => [
  {nom: "Restaurantes y bares de México", n: M.total, kd: "grupo", ej: "Todo el sector: tacos, mariscos, cafés, restaurantes y bares", sig: "TAM"},
  {tot: M.total, keep: M.nucleo, nomK: "Restaurantes a la carta, comida corrida y bares", nomD: "Fondas para llevar, tacos, mariscos y cafés", kd: "restaurante", dd: "puesto", sig: ""},
  {tot: M.nucleo, keep: M.servible, nomK: "Clientes potenciales (SAM)", nomD: "Posibles cadenas", kd: "barrio", dd: "cadena", sig: "SAM"},
  {tot: M.servible, keep: SP.meta_12_meses, nomK: "Meta a 12 meses (SOM)", nomD: "El resto del mercado", kd: "puntos", dd: "barrio", sig: "SOM"},
];
const ETAPAS = ["México", "A la carta y bares", "Sin cadenas", "Meta a 12 meses"];
DET.mercado = {
  titulo: "Hay ≈ 100,000 clientes potenciales; ganar 100 a 1,000 en un año es un escenario.",
  fu: ["inegi_denue", "carta_mercado", "carta_muestra"],
  nota: "Mercado total (TAM): todos los negocios que algún día podrían usar algo como Carta. Clientes potenciales (SAM): los que Carta atiende hoy, sin cadenas (entre 96,021 y 104,855 según el umbral). Meta a 12 meses (SOM): escenario, no dato.",
  montar(host) {
    this.paso = 0; this.sel = "k"; this.auto = true;
    host.innerHTML = `<div class="viz"><svg id="svMer" viewBox="0 0 960 520" role="img" font-family="DM Sans, sans-serif"></svg></div>`;
    const svg = $("#svMer", host); this.rm = RM(svg);
    svg.addEventListener("click", ev => {
      const e = ev.target.closest("[data-paso]"); if (e) { this.auto = false; this.paso = +e.dataset.paso; this.sel = "k"; refrescar(); return; }
      const s = ev.target.closest("[data-seg]"); if (s) { this.auto = false; this.sel = s.dataset.seg; refrescar(); }
    });
    svg.addEventListener("mouseover", ev => { const s = ev.target.closest("[data-seg]"); if (s && s.dataset.seg !== this.sel) { this.sel = s.dataset.seg; refrescar(); } });
    const marcha = () => { if (actual !== this || !this.auto || this.paso >= 3 || REDUCE) return; setTimeout(() => { if (actual === this && this.auto) { this.paso++; this.sel = "k"; refrescar(); marcha(); } }, 1700); };
    this.marcha = marcha; setTimeout(marcha, 900);
  },
  actualizar() {
    const rm = this.rm, N = NIV(), p = this.paso, X0 = 30, W = 900, Y = 110, H = 74;
    ETAPAS.forEach((t, i) => {
      const on = i === p, x = 30 + i * 226;
      rm.put("pb" + i, "rect", {x, y: 14, w: 212, h: 38, rx: 19, fill: on ? C.vino : i < p ? "#d9b9c1" : C.a2, grow: false, cursor: "pointer", attrs: {"data-paso": i, role: "button", tabindex: 0, "aria-pressed": on, "aria-label": t}});
      rm.put("pt" + i, "text", {x: x + 106, y: 38, text: `${i + 1} · ${t}`, size: 13, weight: 700, fill: on ? "#fff" : i < p ? C.osc : C.t2, anchor: "middle"});
    });
    const nv = p === 0 ? {tot: M.total, keep: M.total, nomK: N[0].nom, nomD: "", kd: "grupo", dd: "", sig: "TAM"} : N[p];
    const wk = Math.max(W * nv.keep / nv.tot, p === 3 ? 8 : 0), wd = W - wk;
    rm.put("bk", "rect", {x: X0, y: Y, w: wk, h: H, rx: 16, fill: p === 3 ? C.dorado : C.vino, attrs: {"data-seg": "k", cursor: "pointer"}, cursor: "pointer"});
    rm.put("bd", "rect", {x: X0 + wk, y: Y, w: wd, h: H, rx: 16, fill: C.arena, cursor: "pointer", attrs: {"data-seg": "d"}});
    rm.put("tt", "text", {x: X0, y: Y - 10, text: `${n(nv.tot)} ${p === 0 ? "restaurantes y bares" : p === 1 ? "restaurantes y bares" : p === 2 ? "a la carta y bares" : "clientes potenciales"}`, size: 14, weight: 700, fill: C.vino});
    rm.put("kl", "text", {x: X0, y: Y + H + 26, text: `${n(nv.keep)}`, size: 24, fill: p === 3 ? C.dorado : C.vino, serif: true});
    rm.put("kn", "text", {x: X0, y: Y + H + 46, text: nv.nomK, size: 12.5, weight: 700, fill: C.t2});
    rm.put("dl", "text", {x: X0 + W, y: Y + H + 26, text: p === 0 ? "" : n(nv.tot - nv.keep), size: 24, fill: C.t2, anchor: "end", serif: true});
    rm.put("dn", "text", {x: X0 + W, y: Y + H + 46, text: nv.nomD, size: 12.5, weight: 700, fill: C.t2, anchor: "end"});
    // lo que se ve del tramo elegido: un dibujo y su número
    const k = this.sel === "k" || p === 0, dib = k ? nv.kd : nv.dd, num = k ? nv.keep : nv.tot - nv.keep, nom = k ? nv.nomK : nv.nomD, ejem = k ? (p === 0 ? N[0].ej : ["", "Restaurantes de barrio, de mesero y bares", "Un negocio con un dueño, no una cadena", "100 a 1,000 restaurantes en un año"][p]) : ["", "Tacos, mariscos y cafés quedan fuera hoy", "Mismo nombre repetido; casi ninguno es cadena", "Los demás clientes potenciales, por conquistar"][p];
    rm.put("pn", "rect", {x: 30, y: 270, w: 900, h: 230, rx: 22, fill: C.a2, grow: false});
    const g = rm.put("ej", "g", {x: 60, y: 300});
    const clave = p + ":" + (k ? "k" : "d");
    if (this.ult !== clave) { this.ult = clave; g.innerHTML = dibujo(dib || "grupo", 0, 0, 1.6); g.style.animation = "none"; void g.getBoundingClientRect(); g.style.animation = REDUCE ? "none" : "fundir .45s ease both"; }
    rm.put("pnum", "text", {x: 360, y: 360, text: n(num), size: 64, fill: k && p === 3 ? C.dorado : C.vino, serif: true});
    rm.put("pnom", "text", {x: 360, y: 396, text: nom, size: 16, weight: 700, fill: C.tinta});
    rm.put("pej", "text", {x: 360, y: 424, text: ejem, size: 13.5, fill: C.t2});
    rm.put("pz", "text", {x: 360, y: 466, text: p === 1 ? `${n(M.zonas17)} están en las 17 zonas metropolitanas` : p === 2 ? `entre ${n(M.servible_rango[0])} y ${n(M.servible_rango[1])} según el umbral de cadena` : p === 3 ? "escenario medio del modelo: 300; el alto llega a 1,000" : "", size: 12.5, weight: 700, fill: C.osc});
    const m = M.muestra;
    return {
      leyenda: `<span><i style="background:${C.vino}"></i>lo que se queda</span><span><i style="background:${C.arena}"></i>lo que sale</span><span><i style="background:${C.dorado}"></i>meta a 12 meses (escenario)</span>`,
      cifras: [[n(M.servible_rango[0]) + "–" + n(M.servible_rango[1]), "rango de clientes potenciales (SAM)"], ["100 a 1,000", "meta a 12 meses (SOM)", "supuesto"], ["≈ " + n(m.alcanzables), "cartas que un lector puede leer del sitio de un negocio", "supuesto"]],
      insight: "El mercado sobra; lo que falta medir es cuántos dueños prueban Carta y cuántos pagan.",
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
    host.innerHTML = `<div class="viz" style="position:relative"><svg id="svMx" viewBox="0 0 1000 560" role="img" font-family="DM Sans, sans-serif"></svg><div id="fnCard" class="fncard" hidden></div></div><div id="oc" class="seg" style="margin-top:8px"></div>`;
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
    const rm = this.rm, cw = 46, RH = 30, y0 = 150;
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
      rm.put("rb" + i, "rect", {x: 14, y: y + 1, w: visible ? 972 : 0, h: RH - 2, rx: 10, fill: idx % 2 ? "rgba(0,0,0,0)" : C.a2, grow: false, op});
      if (f.nombre === "Meniu Business") rm.put("rm" + i, "rect", {x: 14, y: y + 1, w: visible ? 972 : 0, h: RH - 2, rx: 10, fill: "rgba(184,134,11,.18)", grow: false, op});
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
    rm.put("lc", "line", {x1: 20, y1: yc - 4, x2: 980, y2: yc - 4, stroke: C.arena, sw: 2});
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
    $("#svMx").setAttribute("viewBox", `0 0 1000 ${Math.max(430, yc + 70)}`);
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
