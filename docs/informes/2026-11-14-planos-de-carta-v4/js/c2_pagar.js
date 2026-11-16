/* ===== detalle: ¿Cuánto puede pagar un restaurante? (INEGI, Censos Económicos 2024, año 2023) ===== */
DET.pagar = {
  titulo: "De cada 10,000 pesos que entran, Carta es una fracción de lo que el negocio ya paga por su punto de venta.",
  fu: ["inegi_denue", "carta_precio", "paginas_proveedores_14nov"],
  nota: "INEGI, Censos Económicos 2024 (datos de 2023), clase 722511: ingreso por negocio y por mes. Un punto de venta cuesta de 652 a 1,000 pesos al mes (páginas de proveedores leídas el 14 de noviembre). Los negocios de 0 a 10 personas están en Chef (gratis); de 11 a 250, Master Chef; de 251 en adelante, Chef Ejecutivo (nombre propuesto).",
  montar(host) { host.innerHTML = `<div class="viz"><svg id="svG" viewBox="0 0 1100 520" role="img" font-family="DM Sans, sans-serif"></svg></div>`; this.sv = $("#svG", host); },
  actualizar() {
    /* cada tira son 100 casillas; cada casilla es 1 peso de cada 10,000 que entran (la tira entera es el 1 % de las ventas) */
    const tam = D.inegi_tamano, X0 = 290, CW = 8, [pLo, pHi] = [652, 1000], por10k = (pesos, ingreso) => 10000 * pesos / ingreso;
    const tipos = ["fonda", "restaurante", "salon", "grupo"], rot = ["0 a 10 personas", "11 a 50", "51 a 250", "251 o más"];
    const precios = [0, S.precioServicio, S.precioServicio, S.precioSalon], planes = [PLAN.gratis, PLAN.paga, PLAN.paga, PLAN.ejec];
    let b = T(30, 28, "De cada 10,000 pesos que entran al negocio, ¿cuántos van a software?", 15, C.vino, "start", 700) + T(30, 48, "Cada tira son 100 casillas: una casilla = 1 peso de cada 10,000 (la tira entera es el 1 % de las ventas).", 12, C.t2);
    const fil = [];
    tam.forEach((t, i) => {
      const y = 78 + i * 108, a = por10k(pLo, t.ingreso), z = por10k(pHi, t.ingreso), c = por10k(precios[i], t.ingreso);
      fil.push({a, z, c});
      b += dibujo(tipos[i], 22, y - 4, 0.5) + T(112, y + 20, rot[i], 14, C.tinta, "start", 700) + T(112, y + 40, `${planes[i]} · ${t.ingreso >= 1e6 ? "$" + n(t.ingreso / 1e6, 1) + " M" : "$" + n(t.ingreso / 1e3) + " mil"} al mes`, 11.5, C.t2);
      b += Rc(X0, y, 100 * CW, 34, C.a2, 6);
      b += `<g class="gh" style="animation-delay:${i * 120}ms">` + Rc(X0, y, Math.min(a, 100) * CW, 34, C.azul, 6) + Rc(X0 + a * CW, y, Math.max((Math.min(z, 100) - a) * CW, 0), 34, "#8fb0d8", 0) + (c > 0 ? Rc(X0 + z * CW, y, Math.max(c * CW, 3), 34, C.dorado, 0) : "") + "</g>";
      let sep = ""; for (let k = 1; k < 100; k++) sep += `<line x1="${X0 + k * CW}" x2="${X0 + k * CW}" y1="${y}" y2="${y + 34}" stroke="#fff" stroke-opacity=".55" stroke-width="1"/>`;
      b += sep;
      b += T(X0, y + 56, `punto de venta: ${n(a) === n(z) ? n(a) : n(a) + " a " + n(z)} ${n(z) === "1" ? "peso" : "pesos"}`, 13.5, C.azul, "start", 700);
      b += c > 0 ? T(X0 + 330, y + 56, `Carta: ${n(c, 1)} pesos`, 13.5, C.dorado, "start", 700) : T(X0 + 330, y + 56, "Carta: gratis, 0 pesos", 13.5, C.dorado, "start", 700);
    });
    this.sv.innerHTML = b;
    const f1 = fil[1], f0 = fil[0];
    return {
      leyenda: `<span><i style="background:${C.azul}"></i>lo que ya paga por su punto de venta (rango de 652 a 1,000 pesos al mes)</span><span><i style="background:${C.dorado}"></i>Carta</span>`,
      cifras: [[n(f0.a) + " a " + n(f0.z), "pesos de cada 10,000 gasta un negocio de 0 a 10 personas en su punto de venta; en Carta, 0 (Chef es gratis)"], [n(f1.c, 1), `pesos de cada 10,000 serían ${PLAN.paga} para uno de 11 a 50 personas`, "propuesta"], [n(f1.a) + " a " + n(f1.z), "pesos de cada 10,000 gasta ese mismo negocio en su punto de venta"]],
      insight: `Carta cuesta una fracción de lo que ya pagan: ${n(f1.c, 1)} pesos de cada 10,000 frente a ${n(f1.a)} a ${n(f1.z)} del punto de venta (negocio de 11 a 50 personas).`,
    };
  },
};
