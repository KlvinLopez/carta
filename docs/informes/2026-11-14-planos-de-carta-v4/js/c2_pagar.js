/* ===== detalle: ¿Cuánto puede pagar un restaurante? (INEGI, Censos Económicos 2024, año 2023) ===== */
DET.pagar = {
  titulo: "De cada 10,000 pesos que entran, Carta es una fracción de lo que el negocio ya paga por su punto de venta.",
  fu: ["inegi_denue", "carta_precio", "paginas_proveedores_14nov"],
  nota: "INEGI, Censos Económicos 2024 (datos de 2023), clase 722511: ingreso por negocio y por mes. Lo que cuesta un punto de venta está en la leyenda de la gráfica (páginas de proveedores leídas el 14 de noviembre). Los negocios de 0 a 5 personas caben en Chef (gratis).",
  montar(host) { host.innerHTML = `<div class="viz"><svg id="svV" viewBox="0 0 1100 600" role="img" aria-label="Lo que ya paga por su punto de venta frente a lo que pagaría por Carta" font-family="DM Sans, sans-serif"></svg></div><details class="mas" style="margin-top:12px"><summary>Segundo nivel: lo mismo, por cada 10,000 pesos que entran al negocio</summary><div class="viz" style="margin-top:8px"><svg id="svG" viewBox="0 0 1100 520" role="img" font-family="DM Sans, sans-serif"></svg></div></details><details class="mas" id="ejPagar" style="margin-top:12px"></details>`; this.sv = $("#svG", host); this.svV = $("#svV", host); },
  /* el valor, a la vista: por tamaño, lo que ya paga por su punto de venta junto a lo que pagaría por Carta, en pesos al mes y a la misma escala */
  pintaValor(tam, tipos, rot, precios, planes, pLo, pHi) {
    const X0 = 270, W = 640, mx = 1200, X = v => X0 + W * Math.min(v, mx) / mx, vm = MOD.mensajes(config(S), sup(S)).valor;
    this.frac = (vm.frase.match(/cuesta alrededor de (.*?) de lo que/) || [0, "una fracción"])[1];
    const lin = parr(vm.frase.replace(/, y [\d.]+ % de lo que vende.*$/, "."), 62);
    let b = `<g data-tip="${esc2("Promedios del INEGI|clase 722511|" + pal20("Son promedios (total entre negocios) de restaurantes con servicio completo; para 0 a 5 personas es «si lo contratara».", 22))}">` + lin.slice(0, 3).map((l, i2) => T(30, 40 + i2 * 32, l, 25, C.vino, "start", 400, true)).join("") + "</g>";
    b += T(30, 40 + Math.min(lin.length, 3) * 32 + 2, "Frente a: " + vm.calculo.comparaciones.map(q => `${q.nombre} (${n(q.precio_mes)} MXN) ${n(100 * q.parte)} %`).join(" · "), 12.5, C.t2, "start", 700);
    this.oy = 40 + Math.min(lin.length, 3) * 32 + 22;
    [0, 300, 600, 900, 1200].forEach(v => { b += `<line x1="${X(v)}" x2="${X(v)}" y1="${this.oy + 12}" y2="${this.oy + 12 + tam.length * 104}" stroke="${C.arena}"/>` + T(X(v), this.oy + 6, v === 0 ? "0 MXN" : n(v) + " MXN", 11.5, C.t2, "middle"); });
    b += T(X0 - 24, this.oy + 6, "pesos al mes", 11.5, C.t2, "end");
    tam.forEach((t, i) => {
      const y = this.oy + 20 + i * 104, c = precios[i];
      b += dibujo(tipos[i], 30, y + 2, 0.5) + T(122, y + 30, rot[i], 15, C.tinta, "start", 700) + T(122, y + 50, planes[i], 12.5, C.t2);
      b += `<g class="gh" style="animation-delay:${i * 120}ms" data-tip="${esc2("Punto de venta|" + n(pLo) + " a " + n(pHi) + " MXN|Al mes, lo que ya paga hoy por su punto de venta (proveedores, 14 de noviembre)")}">${Rc(X0, y + 8, X(pLo) - X0, 28, C.azul, 8)}${Rc(X(pLo), y + 8, X(pHi) - X(pLo), 28, "#8fb0d8", 0)}</g>` + T(X(pHi) + 10, y + 29, `punto de venta ${n(pLo)} MXN a ${n(pHi)} MXN`, 13.5, C.azul, "start", 700);
      b += c > 0 ? `<g class="gh" style="animation-delay:${i * 120 + 90}ms" data-tip="${esc2(planes[i] + "|" + n(c) + " MXN al mes|" + (c <= 300 ? "casi la cuarta parte de lo que ya paga por su punto de venta" : "lo que pagaría por Carta en este plan"))}">${Rc(X0, y + 46, Math.max(X(c) - X0, 4), 28, C.dorado, 8)}</g>` + T(X(c) + 10, y + 67, `Carta ${n(c)} MXN`, 14, C.dorado, "start", 700) : T(X0 + 8, y + 67, "Carta: gratis, 0 MXN", 15, C.dorado, "start", 700);
    });
    this.svV.innerHTML = b;
  },

  actualizar() {
    /* cada tira son 100 casillas; cada casilla es 1 peso de cada 10,000 que entran (la tira entera es el 1 % de las ventas) */
    const tam = D.inegi_tamano, X0 = 290, CW = 8, [pLo, pHi] = [Math.min(...SP.punto_de_venta.map(x => x.precio)), Math.max(...SP.punto_de_venta.map(x => x.precio))], por10k = (pesos, ingreso) => 10000 * pesos / ingreso;
    const tipos = ["fonda", "restaurante", "salon", "grupo"], rot = ["0 a 10 personas", "11 a 50", "51 a 250", "251 o más"];
    const precios = [0, S.precioServicio, S.precioServicio, S.precioServicio], planes = [`${PLAN.gratis}, de 0 a 5 personas`, PLAN.paga, PLAN.paga, PLAN.paga];
    let b = T(30, 28, "De cada 10,000 pesos que entran al negocio, ¿cuántos van a software?", 15, C.vino, "start", 700) + T(30, 48, "Cada tira son 100 casillas: una casilla = 1 peso de cada 10,000 (la tira entera es el 1 % de las ventas).", 12, C.t2);
    const fil = [];
    tam.forEach((t, i) => {
      const y = 78 + i * 108, a = por10k(pLo, t.ingreso), z = por10k(pHi, t.ingreso), c = por10k(precios[i], t.ingreso);
      fil.push({a, z, c});
      b += dibujo(tipos[i], 22, y - 4, 0.5) + T(112, y + 20, rot[i], 14, C.tinta, "start", 700) + T(112, y + 40, `${planes[i]} · ${t.ingreso >= 1e6 ? n(t.ingreso / 1e6, 1) + " MXN" + " M" : n(t.ingreso / 1e3) + " MXN" + " mil"} al mes`, 11.5, C.t2);
      b += Rc(X0, y, 100 * CW, 34, C.a2, 6);
      b += `<g class="gh" style="animation-delay:${i * 120}ms">` + Rc(X0, y, Math.min(a, 100) * CW, 34, C.azul, 6) + Rc(X0 + a * CW, y, Math.max((Math.min(z, 100) - a) * CW, 0), 34, "#8fb0d8", 0) + (c > 0 ? Rc(X0 + z * CW, y, Math.max(c * CW, 3), 34, C.dorado, 0) : "") + "</g>";
      let sep = ""; for (let k = 1; k < 100; k++) sep += `<line x1="${X0 + k * CW}" x2="${X0 + k * CW}" y1="${y}" y2="${y + 34}" stroke="#fff" stroke-opacity=".55" stroke-width="1"/>`;
      b += sep;
      b += T(X0, y + 56, `punto de venta: ${n(a) === n(z) ? n(a) : n(a) + " a " + n(z)} ${n(z) === "1" ? "peso" : "pesos"}`, 13.5, C.azul, "start", 700);
      b += c > 0 ? T(X0 + 330, y + 56, `Carta: ${n(c, 1)} pesos`, 13.5, C.dorado, "start", 700) : T(X0 + 330, y + 56, "Carta: gratis, 0 pesos", 13.5, C.dorado, "start", 700);
    });
    this.sv.innerHTML = b;
    this.pintaValor(tam, tipos, rot, precios, planes, pLo, pHi);
    { // un ejemplo que recorre la gráfica paso a paso con un caso concreto (el negocio de 11 a 50 personas); todo sale del generador
      const t = tam[1], pr = S.precioServicio, ej = $("#ejPagar"), abierto = ej.open, vm = MOD.mensajes(config(S), sup(S)).valor, mes10k = t.ingreso / 10000;
      ej.innerHTML = `<summary>Ejemplo paso a paso: un restaurante de ${rot[1]} personas</summary><ol class="ulb" style="margin-top:8px">
        <li><b>De dónde sale el ingreso.</b> Un negocio de ${rot[1]} personas vende en promedio ${n(t.ingreso)} MXN al mes (INEGI, Censos Económicos 2024, clase 722511, año 2023). Son promedios del tamaño, no de un negocio en particular.</li>
        <li><b>Cuánto es «1 de cada 10,000».</b> Cada peso de cada 10,000 que entran equivale a ${n(mes10k, 1)} MXN al mes: por eso cada casilla de la tira vale eso.</li>
        <li><b>Lo que ya paga.</b> Por su punto de venta paga hoy de ${n(pLo)} a ${n(pHi)} MXN al mes (páginas de proveedores): de ${n(por10k(pLo, t.ingreso), 1)} a ${n(por10k(pHi, t.ingreso), 1)} pesos de cada 10,000. Es la barra azul.</li>
        <li><b>Lo que pagaría por Carta.</b> ${PLAN.paga} cuesta ${n(pr)} MXN al mes: ${n(por10k(pr, t.ingreso), 1)} pesos de cada 10,000. Es la barra dorada, a la misma escala.</li>
        <li><b>Dónde cae el precio.</b> ${esc(vm.frase.replace(/, y [\d.]+ % de lo que vende.*$/, "."))}</li></ol>`;
      ej.open = abierto; }
    const f1 = fil[1], f0 = fil[0];
    return {
      leyenda: `<span><i style="background:${C.azul}"></i>lo que ya paga por su punto de venta (rango de ${n(pLo)} a ${n(pHi)} pesos al mes)</span><span><i style="background:${C.dorado}"></i>Carta</span>`,
      cifras: [[n(f0.a) + " a " + n(f0.z), "pesos de cada 10,000 gasta un negocio de 0 a 10 personas en su punto de venta; en Carta, 0 (Chef es gratis)"], [n(f1.c, 1), `pesos de cada 10,000 serían ${PLAN.paga} para uno de 11 a 50 personas`, "propuesta"], [n(f1.a) + " a " + n(f1.z), "pesos de cada 10,000 gasta ese mismo negocio en su punto de venta"]],
      insight: `Para un negocio mediano, ${PLAN.paga} (${n(S.precioServicio)} MXN) cuesta ${this.frac} de lo que ya paga por su punto de venta (${n(pLo)} MXN a ${n(pHi)} MXN al mes); para el chico, nada.`,
    };
  },
};
