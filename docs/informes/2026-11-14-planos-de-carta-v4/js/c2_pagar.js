/* ===== detalle: ¿Cuánto puede pagar un restaurante? (INEGI, Censos Económicos 2024, año 2023) ===== */
const EJ_PAGAR = ["Una fonda o un restaurante familiar", "Un restaurante a la carta con cocina y meseros", "Un restaurante grande o de hotel", "Un gran restaurante o un grupo"];
DET.pagar = {
  titulo: "Un precio plano es caro para el negocio chico y casi regalado para el grande.",
  fu: ["inegi_denue", "carta_precio", "paginas_proveedores_14nov"],
  nota: "INEGI, Censos Económicos 2024 (datos de 2023), clase 722511 por negocio y por mes. «Excedente» = ingresos − gastos − remuneraciones; no es utilidad. Las horas ahorradas que justifican el precio son supuesto: se miden en el piloto.",
  montar(host) {
    this.sel = 0; this.armado = false;
    host.innerHTML = `<div class="viz"><svg id="svG" viewBox="0 0 960 520" role="img" font-family="DM Sans, sans-serif"></svg></div>`;
    const svg = $("#svG", host); this.rm = RM(svg); this.svg = svg;
    svg.addEventListener("click", ev => { const t = ev.target.closest("[data-t]"); if (t) { this.sel = +t.dataset.t; refrescar(); } });
    svg.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { const t = ev.target.closest("[data-t]"); if (t) { ev.preventDefault(); this.sel = +t.dataset.t; refrescar(); } } });
  },
  actualizar() {
    const rm = this.rm, tam = D.inegi_tamano, X0 = 220, W = 340, lo = lg(50000), hi = lg(10000000);
    const X = v => X0 + W * (lg(v) - lo) / (hi - lo);
    rm.put("t0", "text", {x: 20, y: 26, text: "Ingreso y excedente por negocio al mes, por tamaño (escala logarítmica)", size: 14.5, weight: 700, fill: C.vino});
    [100000, 1000000, 10000000].forEach((v, i) => { rm.put("g" + i, "line", {x1: X(v), y1: 40, x2: X(v), y2: 300, stroke: C.arena, sw: 1}); rm.put("gt" + i, "text", {x: X(v), y: 316, text: mxn(v), size: 11.5, fill: C.t2, anchor: "middle"}); });
    tam.forEach((t, i) => {
      const y = 52 + i * 62, on = i === this.sel, op = on ? 1 : 0.55;
      rm.put("l" + i, "text", {x: X0 - 12, y: y + 22, text: `${t.estrato} personas`, size: 13.5, weight: 700, fill: C.tinta, anchor: "end", op});
      rm.put("ing" + i, "rect", {x: X0, y, w: X(t.ingreso) - X0, h: 20, rx: 8, fill: C.vino, op});
      rm.put("exc" + i, "rect", {x: X0, y: y + 24, w: X(t.excedente) - X0, h: 14, rx: 7, fill: C.dorado, op});
      rm.put("pr" + i, "line", {x1: X(S.precioServicio * 100), y1: y - 4, x2: X(S.precioServicio * 100), y2: y + 42, stroke: C.osc, sw: 2, dash: "3 3", op: 0});
      rm.put("v" + i, "text", {x: X(t.ingreso) + 8, y: y + 16, text: `${mxn(t.ingreso)} · ${(100 * S.precioServicio / t.ingreso).toFixed(2)} %`, size: 12.5, weight: 700, fill: C.tinta, op});
      rm.put("h" + i, "rect", {x: 0, y: y - 6, w: 940, h: 54, rx: 10, fill: "rgba(0,0,0,0)", cursor: "pointer", grow: false, attrs: {"data-t": i, role: "button", tabindex: 0, "aria-pressed": on, "aria-label": t.estrato, "data-tip": EJ_PAGAR[i]}});
    });
    // asa del precio de Master Chef
    const px = 40, pw = 560, py = 380, v = S.precioServicio, vx = px + pw * (v - 49) / (999 - 49);
    rm.put("pn", "text", {x: px, y: py - 28, text: `Precio de ${PLAN.paga} al mes: arrástralo`, size: 14, weight: 700, fill: C.vino});
    rm.put("pk", "rect", {x: px, y: py - 8, w: pw, h: 16, rx: 8, fill: C.a2, grow: false});
    rm.put("pf", "rect", {x: px, y: py - 8, w: vx - px, h: 16, rx: 8, fill: C.dorado, grow: false});
    const h = rm.put("ph", "circle", {x: vx, y: py, r: 15, fill: C.dorado, stroke: "#fff", sw: 3, cursor: "grab", attrs: {"aria-label": "Precio Master Chef", "aria-valuenow": v, "aria-valuemin": 49, "aria-valuemax": 999}});
    rm.put("pv", "text", {x: vx, y: py + 4, text: String(v), size: 11, weight: 700, fill: "#fff", anchor: "middle"});
    if (!this.armado) { arrastrable(h, this.svg, pt => cambiar({precioServicio: clamp(Math.round((49 + (pt.x - px) / pw * 950) / 10) * 10 - 1, 49, 999)}), (d, mult) => cambiar({precioServicio: clamp(S.precioServicio + d * mult * 10, 49, 999)})); this.armado = true; }
    // puntos de venta como referencia
    Object.entries(D.pos_sustitutos).forEach(([k, p], i) => { const x = px + pw * (p - 49) / 950; rm.put("pos" + i, "line", {x1: x, y1: py - 20, x2: x, y2: py + 20, stroke: C.azul, sw: 2}); rm.put("post" + i, "text", {x, y: py + 40 + (i % 2) * 14, text: `${k.split(" ")[0]} ${p}`, size: 11, weight: 700, fill: C.azul, anchor: "middle"}); });
    // detalle del tamaño elegido
    const t = tam[this.sel], p = S.precioServicio, horas = p / t.va_hora;
    rm.put("d0", "text", {x: 740, y: 70, text: `${t.estrato} personas`, size: 18, fill: C.vino, serif: true});
    [[`Ingreso al mes`, mxn(t.ingreso)], [`Excedente al mes`, mxn(t.excedente)], [`Internet y telefonía`, mxn(t.comunicacion)], [`Valor agregado por hora`, mxn(t.va_hora)], [`${PLAN.paga} es`, `${(100 * p / t.ingreso).toFixed(2)} % del ingreso`], [`Se paga con`, `${horas.toFixed(1)} horas de personal al mes`], [`Un punto de venta (652 a 1,000)`, `${(100 * 652 / t.ingreso).toFixed(2)} % a ${(100 * 1000 / t.ingreso).toFixed(2)} %`]].forEach(([a, b], i) => { rm.put("da" + i, "text", {x: 740, y: 104 + i * 34, text: a, size: 12, fill: C.t2}); rm.put("db" + i, "text", {x: 740, y: 122 + i * 34, text: b, size: 14.5, weight: 700, fill: C.tinta}); });
    return {
      leyenda: `<span><i style="background:${C.vino}"></i>ingreso</span><span><i style="background:${C.dorado}"></i>excedente (antes de pagar al dueño)</span><span><i style="background:${C.azul}"></i>lo que cuesta un punto de venta</span><span>Toca un tamaño</span>`,
      cifras: [[(100 * p / tam[0].ingreso).toFixed(2) + " %", `de lo que ingresa un negocio chico (${mxn(tam[0].ingreso)})`], [(100 * p / tam[1].ingreso).toFixed(2) + " %", `de lo que ingresa uno de 11 a 50 personas (${mxn(tam[1].ingreso)})`], [`${(p / 80).toFixed(1)} horas`, "de personal al mes bastan para pagarse (≈ $80 de valor agregado por hora)", "supuesto"]],
      insight: "Los competidores cobran casi lo mismo a un negocio de 4 personas que a uno de 87; para el chico un precio plano pesa 20 veces más. Por eso hay planes por tamaño.",
    };
  },
};
