/* ===== detalle: ¿Cuánto puede pagar un restaurante? (INEGI, Censos Económicos 2024, año 2023) ===== */
DET.pagar = {
  titulo: "De cada 100 pesos que entran, Carta es una fracción de lo que el negocio ya paga por su punto de venta.",
  fu: ["inegi_denue", "carta_precio", "paginas_proveedores_14nov"],
  nota: "INEGI, Censos Económicos 2024 (datos de 2023), clase 722511: ingreso por negocio y por mes. Un punto de venta cuesta de 652 a 1,000 pesos al mes (páginas de proveedores leídas el 14 de noviembre). Los negocios de 0 a 10 personas están en Chef (gratis); de 11 a 250, Master Chef; de 251 en adelante, Chef Ejecutivo (nombre propuesto).",
  montar(host) { host.innerHTML = `<div class="viz"><svg id="svG" viewBox="0 0 960 470" role="img" font-family="DM Sans, sans-serif"></svg></div>`; this.sv = $("#svG", host); },
  actualizar() {
    const tam = D.inegi_tamano, X0 = 300, W = 440, mx = 1.0, X = v => X0 + W * clamp(v, 0, mx) / mx, [pLo, pHi] = [652, 1000];
    const tipos = ["fonda", "restaurante", "salon", "grupo"], rot = ["0 a 10 personas", "11 a 50", "51 a 250", "251 o más"];
    const precios = [0, S.precioServicio, S.precioServicio, S.precioSalon], planes = [PLAN.gratis, PLAN.paga, PLAN.paga, PLAN.ejec];
    let b = T(30, 30, "Pesos de cada 100 que entran al mes", 14.5, C.vino, "start", 700);
    [0, 0.25, 0.5, 0.75, 1].forEach(v => { b += `<line x1="${X(v)}" x2="${X(v)}" y1="48" y2="${60 + tam.length * 92}" stroke="${C.arena}"/>` + T(X(v), 44, n(v, 2), 11.5, C.t2, "middle"); });
    tam.forEach((t, i) => {
      const y = 62 + i * 92, pc = 100 * precios[i] / t.ingreso, a = 100 * pLo / t.ingreso, z = 100 * pHi / t.ingreso;
      b += dibujo(tipos[i], 24, y, 0.55) + T(120, y + 26, rot[i], 14, C.tinta, "start", 700) + T(120, y + 46, `${planes[i]} · ingresa ${mxn(t.ingreso)} al mes`, 11.5, C.t2);
      b += `<g class="gh" style="animation-delay:${i * 120}ms">${Rc(X(a), y + 4, Math.max(X(z) - X(a), 6), 24, C.azul, 8)}</g>` + T(X(Math.min(z, mx)) + 10, y + 22, `punto de venta: ${n(a, 2)} a ${n(z, 2)}`, 13, C.azul, "start", 700);
      b += pc === 0 ? T(X0 + 4, y + 62, "Carta: gratis", 13, C.dorado, "start", 700) : `<g class="gh" style="animation-delay:${i * 120 + 80}ms">${Rc(X0, y + 38, Math.max(X(pc) - X0, 4), 24, C.dorado, 8)}</g>` + T(X(pc) + 10, y + 56, `Carta: ${n(pc, 2)}`, 13, C.dorado, "start", 700);
    });
    this.sv.innerHTML = b;
    const p0 = 100 * pLo / tam[0].ingreso, p1 = 100 * S.precioServicio / tam[1].ingreso;
    return {
      leyenda: `<span><i style="background:${C.azul}"></i>lo que ya paga por su punto de venta</span><span><i style="background:${C.dorado}"></i>Carta</span>`,
      cifras: [[n(p0, 2), "pesos de cada 100 gasta un negocio de 0 a 10 personas en su punto de venta; en Carta, 0 (Chef es gratis)"], [n(p1, 2), `pesos de cada 100 serían ${PLAN.paga} para uno de 11 a 50 personas`, "propuesta"], [n(100 * pLo / tam[1].ingreso, 2), "pesos de cada 100 gasta ese mismo negocio en su punto de venta"]],
      insight: `Para el negocio chico ya pesa ${n(p0, 2)} de cada 100 en su punto de venta: por eso Carta le sale gratis. El de 11 a 50 personas pagaría ${n(p1, 2)} de cada 100 por ${PLAN.paga}.`,
    };
  },
};
