/* ===== detalle: ¿Está el negocio en línea? ===== */
const TAM = ["0 a 5 personas", "6 a 10", "11 a 30", "31 a 50", "51 a 100", "101 a 250", "251 o más"];
const EJTAM = ["Una fonda familiar o una taquería de barrio", "Un restaurante de barrio con 8 a 10 mesas", "Un restaurante a la carta con cocina y meseros", "Un restaurante con terraza o salón para eventos", "Un restaurante de varias áreas, con gerente", "Un restaurante grande o de hotel", "Un gran restaurante o un grupo con varios locales"];
DET.linea = {
  titulo: "El comensal ya está conectado; la mayoría de los negocios, no.",
  fu: ["inegi_endutih", "inegi_denue"],
  nota: "Ejemplos ilustrativos por tamaño. El DENUE no ve Facebook, Instagram ni WhatsApp: «sin sitio web» no es «sin presencia en línea».",
  montar(host) {
    this.sel = new Set(TAM.map((_, i) => i));
    host.innerHTML = `<div class="viz"><svg id="svLinea" viewBox="0 0 960 460" role="img" font-family="DM Sans, sans-serif"></svg></div>`;
    const svg = $("#svLinea", host); this.rm = RM(svg); this.svg = svg;
    svg.addEventListener("click", ev => { const t = ev.target.closest("[data-i]"); if (!t) { if (ev.target.closest("[data-todos]")) { this.sel = new Set(TAM.map((_, i) => i)); refrescar(); } return; } const i = +t.dataset.i; this.sel.has(i) ? this.sel.delete(i) : this.sel.add(i); refrescar(); });
    svg.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { const t = ev.target.closest("[data-i]"); if (t) { ev.preventDefault(); t.dispatchEvent(new MouseEvent("click", {bubbles: true})); } } });
  },
  actualizar() {
    const rm = this.rm, X0 = 190, W = 520;
    rm.put("t1", "text", {x: 30, y: 24, text: "Comensales conectados", size: 14, weight: 700, fill: C.vino});
    rm.put("b1", "rect", {x: 30, y: 36, w: 900, h: 30, rx: 15, fill: C.arena});
    rm.put("b1f", "rect", {x: 30, y: 36, w: 900 * M.usa_internet_pct / 100, h: 30, rx: 15, fill: C.vino});
    rm.put("b1t", "text", {x: 30 + 900 * M.usa_internet_pct / 100 - 14, y: 57, text: `${M.usa_internet_pct} % usa internet · ${M.celular_pct} % de ellos, con celular`, size: 13.5, weight: 700, fill: "#fff", anchor: "end"});
    rm.put("t2", "text", {x: 30, y: 104, text: "Negocios que declaran sitio web, por tamaño (personas ocupadas)", size: 14, weight: 700, fill: C.dorado});
    rm.put("t2b", "text", {x: 930, y: 104, text: "toca un tamaño para quitarlo o ponerlo", size: 12, fill: C.t2, anchor: "end"});
    let a = 0, b = 0;
    M.estratos.forEach((e, i) => {
      const y = 120 + i * 40, on = this.sel.has(i), op = on ? 1 : 0.28;
      if (on) { a += e.con_sitio; b += e.n; }
      rm.put("l" + i, "text", {x: X0 - 12, y: y + 20, text: TAM[i], size: 13.5, weight: on ? 700 : 400, fill: C.tinta, anchor: "end", op});
      rm.put("k" + i, "rect", {x: X0, y: y + 3, w: W, h: 24, rx: 12, fill: C.a2, op});
      rm.put("f" + i, "rect", {x: X0, y: y + 3, w: W * e.pct_sitio / 100, h: 24, rx: 12, fill: C.dorado, op});
      rm.put("v" + i, "text", {x: X0 + W + 14, y: y + 20, text: `${n(e.pct_sitio, 1)} %  ·  ${n(e.con_sitio)} de ${n(e.n)}`, size: 13, fill: C.tinta, op});
      rm.put("h" + i, "rect", {x: 20, y, w: 920, h: 34, rx: 10, fill: "rgba(0,0,0,0)", cursor: "pointer", grow: false, attrs: {"data-i": i, "data-tip": EJTAM[i], role: "button", tabindex: 0, "aria-pressed": on, "aria-label": TAM[i]}});
    });
    // la brecha: línea del comensal sobre todas las filas
    rm.put("ref", "line", {x1: X0 + W * M.usa_internet_pct / 100, y1: 118, x2: X0 + W * M.usa_internet_pct / 100, y2: 408, stroke: C.vino, sw: 2, dash: "5 4"});
    rm.put("reft", "text", {x: X0 + W * M.usa_internet_pct / 100 + 8, y: 112, text: "comensal: 83.1 %", size: 12, weight: 700, fill: C.vino});
    const p = b ? 100 * a / b : 0;
    rm.put("sel", "rect", {x: 30, y: 414, w: 900, h: 38, rx: 14, fill: C.a2});
    rm.put("selt", "text", {x: 46, y: 438, text: b ? `Selección: ${n(p, 1)} % declara sitio web (${n(a)} de ${n(b)} negocios) · brecha frente al comensal: ${n(M.usa_internet_pct - p, 1)} puntos` : "Selecciona al menos un tamaño", size: 14, weight: 700, fill: C.osc});
    rm.put("todos", "rect", {x: 790, y: 414, w: 140, h: 38, rx: 14, fill: "rgba(0,0,0,0)", cursor: "pointer", grow: false, attrs: {"data-todos": 1, role: "button", tabindex: 0}});
    rm.put("todost", "text", {x: 860, y: 438, text: "ver todos", size: 12.5, weight: 700, fill: C.vino2 ?? C.vino, anchor: "middle", op: this.sel.size === TAM.length ? 0 : 1});
    return {
      leyenda: `<span><i style="background:${C.vino}"></i>comensales conectados</span><span><i style="background:${C.dorado}"></i>negocios con sitio web</span><span><i style="background:${C.arena}"></i>sin sitio web</span>`,
      cifras: [[n(100 - p, 1) + " %", "de la selección no declara sitio web"], [n(M.nucleo_sin_sitio), "negocios del mercado de Carta sin sitio web"], ["0.8 %", `de ${n(M.micro_n)} micronegocios de comida declara sitio`]],
      insight: "Carta no le quita un cliente a nadie: sería el primer sitio propio de casi todo el mercado, justo donde ya está el comensal.",
    };
  },
};

/* ===== detalle: ¿Cuántos negocios hay? ===== */
DET.mercado = {
  titulo: "Hay ≈ 100,000 clientes potenciales; ganar 100 a 1,000 en un año es un escenario.",
  fu: ["inegi_denue", "carta_mercado", "carta_muestra"],
  nota: "Mercado total (TAM): todos los negocios que algún día podrían usar algo como Carta. Clientes potenciales (SAM): los que Carta atiende hoy, sin cadenas. Meta a 12 meses (SOM): los que se pueden conseguir; es escenario, no dato.",
  montar(host) {
    host.innerHTML = `<div class="viz"><svg id="svMer" viewBox="0 0 960 640" role="img" font-family="DM Sans, sans-serif"></svg></div>`;
    $("#svMer", host).addEventListener("mouseover", tip);
  },
  actualizar() {
    const sv = $("#svMer"), X0 = 30, W = 900, tot = M.total;
    const fuera = tot - M.nucleo, resto = M.nucleo - M.zonas17;
    const segs = [[fuera, C.arena, "Fuera de lo que Carta atiende hoy", "Fondas para llevar, tacos, mariscos, cafeterías y loncherías"], [resto, C.gris, "Fuera de las 17 zonas", "Restaurantes y bares de ciudades medianas y pueblos"], [M.zonas17, C.vino, "17 zonas metropolitanas", "Restaurantes y bares de CDMX, Guadalajara, Monterrey, Puebla…"]];
    let b = T(X0, 22, "Mercado total (TAM): " + n(tot) + " restaurantes y bares de México", 15, C.vino, "start", 700);
    let x = X0; const cx = [];
    segs.forEach(([v, c, nom, ej], i) => { const w = W * v / tot; b += `<g class="gh" style="animation-delay:${i * 150}ms" data-tip="${esc(nom + ": " + n(v) + ". Ejemplos: " + ej)}">${Rc(x, 70, w, 46, c, 8)}</g>`; cx.push([x, w]); x += w; });
    b += T(X0 + 12, 100, "Fuera de lo que Carta atiende hoy: " + n(fuera) + " · fondas para llevar, tacos, mariscos, cafeterías", 14, C.t2, "start", 700);
    // restaurantes a la carta y bares: corchete arriba, con su descripción
    b += `<polyline points="${cx[1][0]},64 ${cx[1][0]},52 ${X0 + W},52 ${X0 + W},64" fill="none" stroke="${C.vino}" stroke-width="2"/>` + T(cx[1][0] + (W + X0 - cx[1][0]) / 2, 46, "Restaurantes a la carta y bares: " + n(M.nucleo) + " · comida corrida, cantinas y centros nocturnos", 12.5, C.vino, "end", 700);
    // llamadas debajo, cada nivel con su línea y sus ejemplos
    const c2 = cx[1][0] + cx[1][1] / 2, c3 = cx[2][0] + cx[2][1] / 2;
    b += `<polyline points="${c2},116 ${c2},142 ${c2 + 12},142" fill="none" stroke="${C.t2}" stroke-width="1.3"/>` + T(c2 - 6, 147, "Fuera de las 17 zonas: " + n(resto) + " · ciudades medianas y pueblos", 12.5, C.t2, "end", 700);
    b += `<polyline points="${c3},116 ${c3},168" fill="none" stroke="${C.osc}" stroke-width="1.3"/>` + T(c3 + 6, 172, "17 zonas metropolitanas: " + n(M.zonas17) + " · CDMX, Guadalajara, Monterrey…", 12.5, C.osc, "end", 700);
    // barra 2: dentro de los restaurantes a la carta y bares
    b += T(X0, 204, "Dentro de los restaurantes a la carta y bares (" + n(M.nucleo) + ")", 15, C.vino, "start", 700);
    const cad = M.nucleo - M.servible, w2 = W * M.servible / M.nucleo;
    b += `<g class="gh" data-tip="Clientes potenciales (SAM): sin cadenas grandes. Entre ${n(M.servible_rango[0])} y ${n(M.servible_rango[1])} según cuántos nombres repetidos sean cadenas.">${Rc(X0, 216, w2, 46, C.vino, 8)}</g>${Rc(X0 + w2, 216, W - w2, 46, C.arena, 8, `data-tip="Posibles cadenas: ≈ ${n(cad)} establecimientos con el mismo nombre; casi ninguna lo es"`)}`;
    b += T(X0 + 14, 245, "Clientes potenciales (SAM) ≈ " + n(M.servible), 15, "#fff", "start", 700) + T(X0 + W - 6, 280, "posibles cadenas ≈ " + n(cad), 11.5, C.t2, "end");
    const [m0, m1] = M.ganable_12m;
    b += `<g class="gk">${Rc(X0, 208, Math.max(W * m1 / M.nucleo, 6), 62, C.dorado, 3)}</g>` + `<polyline points="${X0 + 3},270 ${X0 + 3},300 ${X0 + 40},300" stroke="${C.dorado}" stroke-width="2" fill="none"/>` + T(X0 + 46, 305, `Meta a 12 meses (SOM): ${m0} a ${n(m1)} clientes; el modelo usa 300 (0.1 % a 1 % del mercado de Carta) · escenario`, 13.5, C.dorado, "start", 700);
    b += Rc(X0 + 800, 288, 100, 20, "none", 10, `stroke="${C.dorado}" stroke-width="1.5"`) + T(X0 + 850, 302, "supuesto", 11, C.dorado, "middle", 700);
    // cartas que un lector puede leer
    const m = M.muestra, mot = M.muestra_motivos, tot2 = m.intentos;
    b += T(X0, 352, `Cartas que un lector puede leer del sitio: ${n(m.con_sitio_universo)} sitios con página × ${m.tasa.toFixed(3)} ≈ ${n(m.alcanzables)}`, 15, C.vino, "start", 700);
    b += T(X0, 372, `Muestra de ${tot2} sitios leídos; la proporción de cartas completas aplicada a todo el universo es un supuesto.`, 12.5, C.t2);
    const cols = [C.vino, "#a8788a", C.arena, C.gris, "#cdbba3", "#d9cfc2", "#ece2d3"];
    let xx = X0;
    mot.forEach(([nom, v], i) => { const w = W * v / tot2; b += `<g class="gh" style="animation-delay:${i * 80}ms" data-tip="${esc(nom + ": " + v + " de " + tot2)}">${Rc(xx, 388, w, 46, cols[i], 6)}</g>`; if (w > 40) b += T(xx + w / 2, 416, String(v), 14, i === 0 ? "#fff" : C.tinta, "middle", 700); xx += w; });
    b += T(X0 + 4, 456, "Carta completa 20 (10 %)", 12.5, C.vino, "start", 700);
    xx = X0 + W * (mot[0][1] + mot[1][1]) / tot2;
    [["Sin carta en el sitio", 77], ["El sitio lo prohíbe", 33], ["Sólo imagen", 11], ["Caído", 9], ["Otros", 43]].forEach(([nom, v], i) => { const w = W * v / tot2; if (w > 60) b += T(xx + w / 2, 456, nom, 11.5, C.t2, "middle"); xx += w; });
    b += T(X0 + W, 490, `Rango ${n(m.rango[0])} a ${n(m.rango[1])} cartas legibles (0.17 % a 0.34 % del universo)`, 12.5, C.t2, "end");
    $("#svMer").innerHTML = b;
    return {
      leyenda: `<span><i style="background:${C.vino}"></i>clientes potenciales</span><span><i style="background:${C.dorado}"></i>meta a 12 meses (escenario)</span><span><i style="background:${C.arena}"></i>fuera de lo que Carta atiende hoy</span>`,
      cifras: [[n(M.servible_rango[0]) + "–" + n(M.servible_rango[1]), "rango de clientes potenciales (SAM)"], ["100 a 1,000", "meta a 12 meses (SOM)", "supuesto"], ["≈ " + n(m.alcanzables), "cartas que un lector puede leer del sitio", "supuesto"]],
      insight: "El mercado sobra; lo que falta medir es cuántos dueños prueban Carta y cuántos pagan.",
    };
  },
};

/* ===== detalle: ¿Qué existe y a qué precio? (tabla interactiva) ===== */
const FUT_DEF = [4, 5, 6, 7, 8, 9, 10, 11]; // pantalla de cocina … reportes: fases futuras por definir
DET.matriz = {
  titulo: "Ninguna página de precios leída publica el pedido en grupo; es el hueco que Carta quiere ocupar con la Fase 3.",
  fu: ["paginas_proveedores_14nov", "carta_precio"],
  nota: "Leídas el 14 de noviembre. Hay un indicio de OlaClick sin comprobar (página borrada de «mesa virtual») y falta la prueba con dos teléfonos. «No publicado» no cuenta como «no lo tiene».",
  montar(host) {
    this.orden = {k: null, dir: -1}; this.oculF = new Set(); this.oculC = new Set(); this.sinPrecio = false;
    host.innerHTML = `<div class="viz"><svg id="svMx" viewBox="0 0 1000 560" role="img" font-family="DM Sans, sans-serif"></svg></div><div id="oc" class="seg" style="margin-top:8px"></div>`;
    const svg = $("#svMx", host); this.rm = RM(svg);
    svg.addEventListener("click", ev => {
      const t = ev.target.closest("[data-a]"); if (!t) return;
      const [a, v] = t.dataset.a.split(":");
      if (a === "ord") { const k = v === "precio" || v === "cob" ? v : +v; this.orden = {k, dir: this.orden.k === k ? -this.orden.dir : -1}; }
      else if (a === "fila") this.oculF.add(+v);
      else if (a === "col") this.oculC.add(+v);
      else if (a === "precio") this.sinPrecio = true;
      refrescar();
    });
    host.addEventListener("click", ev => { const r = ev.target.closest("[data-rest]"); if (!r) return; const [a, v] = r.dataset.rest.split(":"); if (a === "fila") this.oculF.delete(+v); else if (a === "col") this.oculC.delete(+v); else if (a === "precio") this.sinPrecio = false; else if (a === "todo") { this.oculF.clear(); this.oculC.clear(); this.sinPrecio = false; this.orden = {k: null, dir: -1}; } refrescar(); });
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
    // encabezados
    rm.put("hp", "text", {x: xp, y: y0 - 12, text: this.sinPrecio ? "" : "Precio al mes", size: 12.5, weight: 700, fill: C.vino});
    rm.put("hpo", "rect", {x: xp, y: y0 - 30, w: this.sinPrecio ? 0 : wp, h: 22, rx: 8, fill: "rgba(0,0,0,0)", cursor: "pointer", grow: false, attrs: {"data-a": "ord:precio", "data-tip": "Ordenar por precio", role: "button", tabindex: 0}});
    rm.put("hpx", "text", {x: xp + wp - 2, y: y0 - 12, text: this.sinPrecio ? "" : "✕", size: 12, fill: C.t2, anchor: "end"});
    rm.put("hpxr", "rect", {x: xp + wp - 24, y: y0 - 30, w: this.sinPrecio ? 0 : 24, h: 22, rx: 8, fill: "rgba(0,0,0,0)", cursor: "pointer", grow: false, attrs: {"data-a": "precio:x", "data-tip": "Ocultar el precio", role: "button", tabindex: 0}});
    MX.trabajos.forEach((t, j) => {
      const oc = this.oculC.has(j), x = xj + cols.indexOf(j) * cw;
      rm.put("hc" + j, "text", {x: x + cw / 2 - 6, y: y0 - 18, text: oc ? "" : t, size: 12.5, weight: j === 2 ? 700 : 400, fill: j === 2 ? C.osc : C.t2, rot: -50});
      rm.put("hco" + j, "rect", {x: x, y: y0 - 56, w: oc ? 0 : cw - 18, h: 50, rx: 8, fill: "rgba(0,0,0,0)", cursor: "pointer", grow: false, attrs: {"data-a": "ord:" + j, "data-tip": "Ordenar por «" + t + "»", role: "button", tabindex: 0}});
      rm.put("hcx" + j, "rect", {x: x + cw - 20, y: y0 - 26, w: oc ? 0 : 18, h: 18, rx: 9, fill: "rgba(0,0,0,0)", cursor: "pointer", grow: false, attrs: {"data-a": "col:" + j, "data-tip": "Ocultar la columna", role: "button", tabindex: 0}});
      rm.put("hcxt" + j, "text", {x: x + cw - 11, y: y0 - 13, text: oc ? "" : "✕", size: 10.5, fill: C.t2, anchor: "middle"});
    });
    const xc = xj + cols.length * cw + 6;
    rm.put("hcob", "text", {x: xc, y: y0 - 12, text: "Cobertura", size: 12.5, weight: 700, fill: C.vino});
    rm.put("hcobo", "rect", {x: xc, y: y0 - 30, w: 90, h: 22, rx: 8, fill: "rgba(0,0,0,0)", cursor: "pointer", grow: false, attrs: {"data-a": "ord:cob", "data-tip": "Ordenar por cuántos trabajos cubre", role: "button", tabindex: 0}});
    // filas
    MX.filas.forEach((f, i) => {
      const idx = filas.findIndex(o => o.i === i), visible = idx >= 0, y = y0 + (visible ? idx : filas.length) * RH, op = visible ? 1 : 0;
      rm.put("rl" + i, "text", {x: xp - 12, y: y + 19, text: f.nombre + " " + f.plan, size: 12.5, weight: 700, fill: C.tinta, anchor: "end", op});
      rm.put("rx" + i, "rect", {x: 0, y: y + 3, w: visible ? xp - 8 : 0, h: 22, rx: 8, fill: "rgba(0,0,0,0)", cursor: "pointer", grow: false, attrs: {"data-a": "fila:" + i, "data-tip": "Toca para ocultar esta fila", role: "button", tabindex: 0}});
      rm.put("pb" + i, "rect", {x: xp, y: y + 5, w: this.sinPrecio || !visible ? 0 : Math.max(6, wp * f.precio / maxp), h: 18, rx: 6, fill: calor(f.precio), op, title: mxn(f.precio) + " al mes"});
      rm.put("pt" + i, "text", {x: xp + 6, y: y + 19, text: this.sinPrecio ? "" : mxn(f.precio), size: 11.5, weight: 700, fill: f.precio / maxp > 0.45 ? "#fff" : C.tinta, op});
      MX.trabajos.forEach((t, j) => {
        const c = f.celdas[j], oc = this.oculC.has(j), x = xj + cols.indexOf(j) * cw, show = visible && !oc;
        const fill = c === "si" ? C.vino : c === "no" ? C.arena : "rgba(0,0,0,0)";
        rm.put(`c${i}_${j}`, "rect", {x: x, y: y + 4, w: show ? cw - 10 : 0, h: 20, rx: 7, fill, stroke: c === "np" ? C.gris : "rgba(0,0,0,0)", sw: 1.4, dash: "3 3", op, title: `${f.nombre} ${f.plan} · ${t}: ${c === "si" ? "lo incluye" : c === "no" ? "la página dice que no" : "no publicado"}`});
      });
      rm.put("cb" + i, "rect", {x: xc, y: y + 8, w: visible ? 80 * cob(f) / Math.max(cols.length, 1) : 0, h: 12, rx: 6, fill: C.vino2 ?? C.vino, op});
      rm.put("ct" + i, "text", {x: xc + 84, y: y + 19, text: visible ? `${cob(f)}/${cols.length}` : "", size: 11.5, fill: C.t2, op});
    });
    // Carta
    const yc = y0 + filas.length * RH + 10;
    rm.put("lc", "line", {x1: 20, y1: yc - 4, x2: 980, y2: yc - 4, stroke: C.arena, sw: 2});
    rm.put("cn", "text", {x: xp - 12, y: yc + 22, text: "Carta (propuesta)", size: 13.5, weight: 700, fill: C.dorado, anchor: "end"});
    rm.put("cp", "rect", {x: xp, y: yc + 7, w: this.sinPrecio ? 0 : Math.max(6, wp * S.precioServicio / maxp), h: 18, rx: 6, fill: C.dorado});
    rm.put("cpt", "text", {x: xp + 6, y: yc + 21, text: this.sinPrecio ? "" : mxn(S.precioServicio), size: 11.5, weight: 700, fill: "#fff"});
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
    const oc = [...this.oculF].map(i => `<button class="btn" data-rest="fila:${i}">↩ ${esc(MX.filas[i].nombre)}</button>`).concat([...this.oculC].map(j => `<button class="btn" data-rest="col:${j}">↩ ${esc(MX.trabajos[j])}</button>`), this.sinPrecio ? [`<button class="btn" data-rest="precio:x">↩ Precio</button>`] : [], (this.oculF.size + this.oculC.size || this.sinPrecio || this.orden.k != null) ? [`<button class="btn dor" data-rest="todo:x">Restablecer</button>`] : []);
    $("#oc").innerHTML = oc.join("") || `<span class="nota">Toca un encabezado para ordenar; toca ✕ o una fila para ocultarla.</span>`;
    return {
      leyenda: `<span><i style="background:${C.vino}"></i>lo incluye</span><span><i style="background:${C.arena}"></i>la página dice que no</span><span><i style="background:none;border:1.5px dashed ${C.gris}"></i>no publicado</span><span><i style="background:${C.dorado}"></i>Carta hoy</span><span><i style="background:none;border:2px solid ${C.dorado}"></i>Carta, Fase 3</span><span>Precio: más oscuro = más caro</span>`,
      cifras: [["0 de 10", "planes leídos que publican el pedido en grupo"], ["0 a 1,243", "pesos al mes que cuestan los planes leídos"], [mxn(S.precioServicio), "Servicio de Carta en el escenario activo", "propuesta"]],
      insight: "Ninguno publica pedir en grupo, y el más barato que ya trae caja, cocina y pedir desde la mesa cuesta $225 al mes.",
    };
  },
};
