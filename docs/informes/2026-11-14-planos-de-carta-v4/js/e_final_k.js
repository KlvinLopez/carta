/* ===== las cuatro cifras de abajo, como imagen: los tres escenarios a la vez, con su diferencia contra el recomendado.
   Todo se lee de `MOD.desgloses` (nada se recalcula aquí) ===== */
const ESCS = [["recomendado", "Recomendado", C.vino], ["peor", "Peor", C.rojo], ["mejor", "Mejor", C.verde]];
const sgn = v => (v < 0 ? "−" : "+");
function vizK(clave, titulo, fu, dibuja, insight) {
  const previa = DET["k_" + clave];
  return {
    titulo, fu: fu || (previa && previa.fu) || [],
    montar(host) {
      host.innerHTML = `<div class="viz"><svg id="svKD" viewBox="0 0 1100 450" role="img" font-family="DM Sans, sans-serif"></svg></div>`;
      this.sv = $("#svKD", host);
    },
    actualizar() {
      const d = conCache("desgloses1000", () => MOD.desgloses(config(S), sup(S), 1000));
      const es = ESCS.map(([k, nom, col]) => ({k, nom, col, e: d.escenarios.find(q => q.escenario === k)}));
      this.sv.innerHTML = dibuja(es, d);
      return {insight: insight(es), cifras: [], leyenda: ESCS.map(([k, nom, col]) => `<span><i style="background:${col}"></i>${nom}</span>`).join("")};
    },
  };
}
const p1 = v => n(v, 1), p2 = v => n(v, 2) + " MXN";
/* cabecera de cada columna: el escenario y su diferencia contra el recomendado, en cifra */
const colK = (i, x, w, nom, col, delta, unidad, def) => `<g data-tip="${esc2(nom + "|" + (i === 0 ? "caso base" : delta) + "|" + pal20(def, 18))}"><rect x="${x}" y="20" width="${w}" height="34" rx="17" fill="${col}"/>` + T(x + w / 2, 43, nom, 15, "#fff", "middle", 700) + `</g>` + T(x + w / 2, 76, i === 0 ? "caso base" : delta + " frente al recomendado", 12.5, col, "middle", 700);
const DEF_ESC = {recomendado: "Pagan lo esperado y los anuncios ya dejan la tarifa baja.", peor: "Pagan poco y no hay anuncios en ningún mes.", mejor: "Pagan más y los anuncios dejan más."};

/* 1 · gratuitos que sostiene un cliente de paga: puntos por escenario */
DET.k_sostiene = vizK("sostiene", "Un cliente de paga sostiene a decenas de clientes gratuitos.", null, es => {
  const W = 340, base = Math.round(es[0].e.gratuitos_que_sostiene.sostiene_sin_anuncios || 0), cols = 20;
  let b = "";
  es.forEach((q, i) => {
    const x = 30 + i * 365, g = q.e.gratuitos_que_sostiene, k = Math.round(g.sostiene_sin_anuncios || 0), pa = g.pagante, gr = g.gratuito;
    b += colK(i, x, W, q.nom, q.col, sgn(k - base) + n(Math.abs(k - base)) + " gratuitos", "", DEF_ESC[q.k]);
    b += `<g data-tip="${esc2(`Gratuitos que sostiene|${n(k)}|Lo que deja un cliente de paga entre lo que cuesta cada gratuito, sin anuncios.`)}">` + T(x + W / 2, 142, n(k), 62, q.col, "middle", 400, true) + `</g>` + T(x + W / 2, 166, "gratuitos sin anuncios", 13.5, C.t2, "middle", 700);
    b += T(x + W / 2, 192, `deja ${n(pa.deja, 0)} MXN, entre ${p2(gr.costo)} que cuesta cada gratuito`, 13, C.tinta, "middle");
    for (let j = 0; j < k; j++) b += `<circle class="gh" style="animation-delay:${Math.min(j * 5, 500)}ms" cx="${x + 10 + (j % cols) * 17}" cy="${222 + Math.floor(j / cols) * 17}" r="6.5" fill="${q.col}" opacity=".85"/>`;
  });
  b += T(30, 440, "Cada punto es un cliente gratuito que cubre lo que deja un cliente de paga (225 MXN al mes, menos comisión, soporte y servidor).", 12.5, C.t2, "start", 700);
  return b;
}, es => `Un cliente de paga sostiene ${es.map(q => `${n(q.e.gratuitos_que_sostiene.sostiene_sin_anuncios || 0)} (${q.nom.toLowerCase()})`).join(", ")} gratuitos sin anuncios.`);

/* 2 · pesos por gratuito en anuncios: un embudo por escenario */
DET.k_anuncios = vizK("anuncios", "Un cliente gratuito deja unos pesos al mes en anuncios.", null, es => {
  const W = 340, base = es[0].e.embudo_anuncios.pesos_por_gratuito, mx = Math.max(...es.map(q => q.e.embudo_anuncios.comensales_al_mes), 1);
  let b = "";
  es.forEach((q, i) => {
    const x = 30 + i * 365, f = q.e.embudo_anuncios, v = f.pesos_por_gratuito;
    b += colK(i, x, W, q.nom, q.col, sgn(v - base) + n(Math.abs(v - base), 2) + " MXN", "", DEF_ESC[q.k]);
    [["Comensales al mes", f.comensales_al_mes, "los que entran por el QR de un restaurante gratuito típico"], ["Abren la app", f.abren_la_app, n(100 * f.parte_que_abre) + " % de los comensales"], ["Ven un anuncio", f.ven_un_anuncio, n(100 * f.parte_que_ve_anuncio) + " % de las visitas"]].forEach(([nom, val, sub], j) => {
      const w = Math.max(W * val / mx, 70), xx = x + (W - w) / 2, y = 100 + j * 66;
      b += `<g data-tip="${esc2(`${nom}|${n(val)}|${sub}.`)}" data-tipp="${val / mx}"><rect class="gh" style="animation-delay:${j * 120}ms" x="${xx}" y="${y}" width="${w}" height="52" rx="16" fill="${j === 0 ? C.arena : q.col}" opacity="${j === 0 ? 1 : 1 - 0.28 * (2 - j)}"/>` + T(x + W / 2, y + 25, n(val), 22, j === 0 ? C.tinta : "#fff", "middle", 400, true) + T(x + W / 2, y + 43, nom, 11.5, j === 0 ? C.tinta : "#fff", "middle", 700) + `</g>`;
    });
    b += T(x + W / 2, 330, f.tarifa_por_mil_visitas ? `× ${p1(f.tarifa_por_mil_visitas)} MXN por mil visitas` : "sin anuncios en este escenario", 13, C.t2, "middle", 700);
    b += `<g data-tip="${esc2(`Por cliente gratuito|${p2(v)} al mes|${f.con_anuncios ? "Visitas con anuncio por la tarifa, entre mil." : "Sin anuncios no entra nada."}`)}">` + T(x + W / 2, 384, p2(v), 34, q.col, "middle", 400, true) + `</g>` + T(x + W / 2, 408, "al mes por gratuito", 13, C.t2, "middle", 700);
  });
  return b;
}, es => `Por gratuito entran ${es.map(q => `${p2(q.e.embudo_anuncios.pesos_por_gratuito)} (${q.nom.toLowerCase()})`).join(", ")} al mes en anuncios.`);

/* 3 · lo que ingresa un cliente de paga: una barra partida por escenario */
DET.k_ingreso = vizK("ingreso", "De cada pago de un cliente de paga, esto es lo que se queda.", null, es => {
  const W = 340, base = es[0].e.pesos_por_cliente_de_paga.queda;
  let b = "";
  es.forEach((q, i) => {
    const x = 30 + i * 365, p = q.e.pesos_por_cliente_de_paga, tot = p.precio, seg = [["Comisión de la tarjeta", p.comision_tarjeta, "#c9a9a6"], ["Soporte", p.soporte, C.dorado], ["Servidor y disco", p.servidor_y_disco, C.azul], ["Se queda en Carta", p.queda, q.col]];
    b += colK(i, x, W, q.nom, q.col, sgn(p.queda - base) + n(Math.abs(p.queda - base), 2) + " MXN", "", DEF_ESC[q.k]);
    b += T(x + W / 2, 118, `${n(p.ingreso_promedio_por_pagante)} MXN al mes`, 22, C.tinta, "middle", 400, true) + T(x + W / 2, 138, "lo que paga un cliente (Master Chef)", 12, C.t2, "middle", 700);
    let xx = x;
    seg.forEach(([nom, v, col], j) => { const w = Math.max(W * v / tot, 4); b += `<g data-tip="${esc2(`${nom}|${p2(v)} de ${mxn(tot)}|${n(100 * v / tot, 1)} % de lo que paga el cliente.`)}" data-tipp="${v / tot}"><rect class="gh" style="animation-delay:${j * 110}ms" x="${xx}" y="156" width="${w}" height="64" rx="${j === 0 || j === 3 ? 18 : 4}" fill="${col}"/></g>`; xx += w; });
    seg.forEach(([nom, v, col], j) => { const y = 250 + j * 26; b += `<rect x="${x}" y="${y - 11}" width="13" height="13" rx="4" fill="${col}"/>` + T(x + 22, y, `${nom}: ${p2(v)}`, 13, C.tinta, "start", 700); });
    b += `<g data-tip="${esc2(`Se queda en Carta|${p2(p.queda)}|Antes de captación, sueldos e impuestos.`)}">` + T(x + W / 2, 392, p2(p.queda), 34, q.col, "middle", 400, true) + `</g>` + T(x + W / 2, 414, `${n(100 * p.queda / tot, 1)} % del pago`, 13, C.t2, "middle", 700);
  });
  return b;
}, es => `De ${mxn(es[0].e.pesos_por_cliente_de_paga.precio)} al mes se quedan ${es.map(q => `${p2(q.e.pesos_por_cliente_de_paga.queda)} (${q.nom.toLowerCase()})`).join(", ")} antes de captación y sueldos.`);

/* 4 · el margen de operación: una cascada por escenario, lado a lado en cada paso */
DET.k_margen = vizK("margen", "Del ingreso al margen de operación con 1,000 restaurantes (antes de captación, sueldos e impuestos).", null, es => {
  const nombres = ["Suscripciones", "Anuncios", "Servidor", "Almacenamiento", "Soporte", "Comisión", "Margen"];
  const pasos = es.map(q => { const c = q.e.cascada_margen, v = [c.ingreso_suscripcion, c.ingreso_anuncios, -c.costo_servidor, -c.costo_almacenamiento, -c.costo_soporte, -c.costo_comision, c.margen_operacion]; let t = 0; return v.map((x, j) => { if (j === 6) return [0, x, x]; const a = t; t += x; return [a, t, x]; }); });
  const todo = pasos.flat(2), mx = Math.max(...todo, 1), mn = Math.min(0, ...todo), H0 = 60, H1 = 330, Y = v => H1 - (H1 - H0) * (v - mn) / (mx - mn), gw = 150, bw = 40;
  let b = `<line x1="30" x2="1070" y1="${Y(0)}" y2="${Y(0)}" stroke="${C.arena}" stroke-width="2"/>`;
  nombres.forEach((nom, j) => {
    const gx = 40 + j * gw;
    es.forEach((q, i) => {
      const [a, z, v] = pasos[i][j], top = Math.min(Y(a), Y(z)), alto = Math.max(Math.abs(Y(a) - Y(z)), 3), x = gx + i * (bw + 4), base = pasos[0][j][2], dl = i ? sgn(v - base) + n(Math.abs(v - base)) : "";
      b += `<g data-tip="${esc2(`${nom} · ${q.nom.toLowerCase()}|${(j === 6 ? "" : j < 2 ? "+" : "−") + n(Math.abs(v))} MXN|${i ? dl + " MXN frente al recomendado." : "Caso base."}`)}"><rect class="gh" style="animation-delay:${j * 70}ms" x="${x}" y="${top}" width="${bw}" height="${alto}" rx="8" fill="${q.col}" opacity="${j < 6 && i === 0 ? 0.9 : 1}"/>` + T(x + bw / 2, top - 6, n(Math.abs(v)), 10.5, q.col, "middle", 700) + `</g>`;
    });
    b += T(gx + (3 * bw + 8) / 2, H1 + 26, nom, 12.5, C.tinta, "middle", 700);
  });
  const m = es.map(q => q.e.cascada_margen.margen_operacion);
  b += T(30, 384, `Margen de operación al mes: recomendado ${n(m[0])} MXN`, 14, C.vino, "start", 700);
  b += T(30, 408, `peor ${n(m[1])} MXN (${sgn(m[1] - m[0])}${n(Math.abs(m[1] - m[0]))} MXN frente al recomendado)`, 14, C.rojo, "start", 700);
  b += T(30, 432, `mejor ${n(m[2])} MXN (${sgn(m[2] - m[0])}${n(Math.abs(m[2] - m[0]))} MXN frente al recomendado)`, 14, C.verde, "start", 700);
  return b;
}, es => `Margen de operación al mes: ${es.map(q => `${mp(q.e.cascada_margen.margen_operacion)} (${q.nom.toLowerCase()})`).join(", ")}.`);
