/* ===== las cuatro cifras de abajo, como imagen: se leen de `MOD.desgloses` (nada se recalcula aquí) ===== */
const ESC_NOM = {recomendado: "recomendado", peor: "peor", mejor: "mejor"};
function vizK(clave, titulo, fu, dibuja, insight) {
  const previa = DET["k_" + clave];
  return {
    titulo, fu: fu || (previa && previa.fu) || [],
    esc: "recomendado",
    montar(host) {
      host.innerHTML = `<div class="r7row" style="margin-bottom:10px"><span class="selr">Escenario:</span><div class="seg" id="kEsc">${Object.keys(ESC_NOM).map(k => `<button class="btn" data-esc="${k}">${ESC_NOM[k]}</button>`).join("")}</div></div><div class="viz"><svg id="svKD" viewBox="0 0 1100 430" role="img" font-family="DM Sans, sans-serif"></svg></div>`;
      host.addEventListener("click", ev => { const b = ev.target.closest("[data-esc]"); if (b) { this.esc = b.dataset.esc; refrescar(); } });
      this.sv = $("#svKD", host);
    },
    actualizar() {
      $$("#kEsc [data-esc]").forEach(b => b.setAttribute("aria-pressed", b.dataset.esc === this.esc));
      const d = conCache("desgloses1000", () => MOD.desgloses(config(S), sup(S), 1000)), e = d.escenarios.find(q => q.escenario === this.esc) || d.escenarios[0];
      this.sv.innerHTML = dibuja(e, d);
      return {insight: insight(e), cifras: [], leyenda: `<span>${esc(e.definicion)}</span>`};
    },
  };
}
const p1 = v => n(v, 1), p2 = v => "$" + n(v, 2);

/* 1 · gratuitos que sostiene un cliente de paga: una balanza de puntos */
DET.k_sostiene = vizK("sostiene", "Un cliente de paga sostiene a decenas de clientes gratuitos.", null, e => {
  const g = e.gratuitos_que_sostiene, pa = g.pagante, gr = g.gratuito, k = Math.round(g.sostiene_sin_anuncios || 0), cols = 25, filas = Math.ceil(k / cols);
  let b = T(30, 36, "Lo que deja un cliente de paga, contra lo que cuesta cada gratuito (pesos al mes)", 14, C.t2, "start", 700);
  b += `<g data-tip="${esc2(`Un cliente de paga deja|${mxn(Math.round(pa.deja))} al mes|${mxn(pa.precio)} de precio menos comisión, soporte y servidor.`)}" data-tipv="tri:precio|${pa.precio}|${n(pa.precio)};comisión|${pa.comision_tarjeta}|${p1(pa.comision_tarjeta)};soporte|${pa.soporte}|${n(pa.soporte)};servidor|${pa.servidor_y_disco}|${p1(pa.servidor_y_disco)}">` + Rc(30, 56, 280, 150, "#fff", 22) + T(170, 112, "$" + n(pa.deja), 54, C.vino, "middle", 400, true) + T(170, 140, "deja cada cliente de paga", 13.5, C.t2, "middle", 700) + T(170, 168, `${n(pa.precio)} − ${p1(pa.comision_tarjeta)} − ${n(pa.soporte)} − ${p1(pa.servidor_y_disco)}`, 12.5, C.t2, "middle") + `</g>`;
  b += T(345, 140, "÷", 44, C.dorado, "middle", 400, true);
  b += `<g data-tip="${esc2(`Un gratuito cuesta|${p2(gr.costo)} al mes|Servidor y disco ${p2(gr.servidor_y_disco)} más soporte ${p2(gr.soporte)}.${gr.anuncios ? " Con anuncios deja " + p2(gr.anuncios) + "." : ""}`)}">` + Rc(380, 56, 280, 150, "#fff", 22) + T(520, 112, p2(gr.costo), 54, C.dorado, "middle", 400, true) + T(520, 140, "cuesta cada gratuito", 13.5, C.t2, "middle", 700) + T(520, 168, `servidor ${p2(gr.servidor_y_disco)} + soporte ${p2(gr.soporte)}`, 12.5, C.t2, "middle") + `</g>`;
  b += T(695, 140, "=", 44, C.dorado, "middle", 400, true);
  b += `<g data-tip="${esc2(`Gratuitos que sostiene|${k || "sin límite"}|${g.se_paga_solo ? "Con los anuncios cada gratuito se paga solo." : "Sin anuncios; cada punto es un gratuito."}`)}">` + Rc(730, 56, 340, 150, C.vino, 22) + T(900, 124, g.se_paga_solo ? "" + n(k) : n(k), 62, "#fff", "middle", 400, true) + T(900, 156, "gratuitos sin anuncios", 13.5, "#fff", "middle", 700) + T(900, 178, g.se_paga_solo ? "con anuncios se pagan solos" : "con anuncios, más", 12.5, "#fff", "middle") + `</g>`;
  for (let i = 0; i < k; i++) { const x = 40 + (i % cols) * 40, y = 252 + Math.floor(i / cols) * 34; b += `<circle class="gh" style="animation-delay:${Math.min(i * 6, 600)}ms" cx="${x}" cy="${y}" r="11" fill="${C.dorado}" opacity=".9"/>`; }
  b += T(30, 252 + filas * 34 + 22, `Cada punto es un cliente gratuito. ${n(k)} puntos = lo que deja un cliente de paga.`, 13, C.t2, "start", 700);
  return b;
}, e => `Cada cliente de paga deja $${n(e.gratuitos_que_sostiene.pagante.deja)} al mes; cada gratuito cuesta $${n(e.gratuitos_que_sostiene.gratuito.costo, 2)}: caben ${n(e.gratuitos_que_sostiene.sostiene_sin_anuncios)}.`);

/* 2 · pesos por gratuito en anuncios: un embudo */
DET.k_anuncios = vizK("anuncios", "Un cliente gratuito deja unos pesos al mes en anuncios.", null, e => {
  const f = e.embudo_anuncios, W = 760, X0 = 30, mx = f.comensales_al_mes || 1;
  const tr = [["Comensales al mes", f.comensales_al_mes, "los que entran por el QR de un restaurante gratuito típico", C.arena, C.tinta], ["Abren la app", f.abren_la_app, n(100 * f.parte_que_abre) + " % de los comensales", C.dorado, C.tinta], ["Ven un anuncio", f.ven_un_anuncio, n(100 * f.parte_que_ve_anuncio) + " % de las visitas", C.vino, "#fff"]];
  let b = T(30, 36, "El embudo de un cliente gratuito al mes", 14, C.t2, "start", 700);
  tr.forEach(([nom, v, sub, col, tx], i) => {
    const y = 60 + i * 84, w = Math.max(W * v / mx, 60), x = X0 + (W - w) / 2;
    b += `<g data-tip="${esc2(`${nom}|${n(v)}|${sub}.`)}" data-tipp="${v / mx}">` + `<rect class="gh" style="animation-delay:${i * 140}ms" x="${x}" y="${y}" width="${w}" height="60" rx="18" fill="${col}"/>` + T(X0 + W / 2, y + 28, n(v), 26, tx, "middle", 400, true) + T(X0 + W / 2, y + 48, nom + " · " + sub, 12.5, tx, "middle", 700) + `</g>`;
  });
  b += `<g data-tip="${esc2(`Tarifa|${f.tarifa_por_mil_visitas ? "$" + n(f.tarifa_por_mil_visitas, 1) + " por mil visitas" : "sin anuncios"}|Supuesto de la tarifa baja; lo medirá el piloto.`)}">` + T(850, 112, "×", 40, C.dorado, "middle", 400, true) + T(940, 100, f.tarifa_por_mil_visitas ? "$" + n(f.tarifa_por_mil_visitas, 1) : "sin anuncios", 26, C.vino, "middle", 400, true) + T(940, 122, f.tarifa_por_mil_visitas ? "por cada mil visitas" : "este escenario", 12.5, C.t2, "middle", 700) + `</g>`;
  b += T(850, 262, "=", 40, C.dorado, "middle", 400, true) + `<g data-tip="${esc2(`Por cliente gratuito|${p2(f.pesos_por_gratuito)} al mes|${f.con_anuncios ? "Visitas con anuncio por la tarifa, entre mil." : "Sin anuncios no entra nada."}`)}">` + T(960, 270, p2(f.pesos_por_gratuito), 44, C.vino, "middle", 400, true) + T(960, 296, "al mes por gratuito", 13, C.t2, "middle", 700) + `</g>`;
  return b;
}, e => e.embudo_anuncios.con_anuncios ? `De ${n(e.embudo_anuncios.comensales_al_mes)} comensales, ${n(e.embudo_anuncios.ven_un_anuncio)} ven un anuncio: ${p2(e.embudo_anuncios.pesos_por_gratuito)} por gratuito al mes.` : "En este escenario no hay anuncios: el gratuito no deja nada, sólo cuesta.");

/* 3 · lo que ingresa un cliente de paga: una barra partida */
DET.k_ingreso = vizK("ingreso", "De cada pago de un cliente de paga, esto es lo que se queda.", null, e => {
  const p = e.pesos_por_cliente_de_paga, W = 1000, X0 = 50, tot = p.precio, seg = [["Comisión de la tarjeta", p.comision_tarjeta, C.rojo], ["Soporte", p.soporte, C.dorado], ["Servidor y disco", p.servidor_y_disco, C.azul], ["Se queda en Carta", p.queda, C.vino]];
  let b = T(30, 36, `Un cliente de paga ingresa ${mxn(p.ingreso_promedio_por_pagante)} al mes (Master Chef; Chef Ejecutivo: futura escalación)`, 14, C.t2, "start", 700), x = X0;
  seg.forEach(([nom, v, col], i) => {
    const w = Math.max(W * v / tot, 4);
    b += `<g data-tip="${esc2(`${nom}|${p2(v)} de ${mxn(tot)}|${n(100 * v / tot, 1)} % de lo que paga el cliente.`)}" data-tipp="${v / tot}">` + `<rect class="gh" style="animation-delay:${i * 120}ms" x="${x}" y="70" width="${w}" height="90" rx="${i === 0 ? 20 : i === 3 ? 20 : 4}" fill="${col}"/>` + (w > 90 ? T(x + w / 2, 122, p2(v), 24, "#fff", "middle", 400, true) : "") + `</g>`;
    const cy = 190 + i * 38; b += `<rect x="${X0}" y="${cy - 12}" width="14" height="14" rx="5" fill="${col}"/>` + T(X0 + 24, cy, `${nom}: ${p2(v)} (${n(100 * v / tot, 1)} %)`, 14.5, C.tinta, "start", 700);
    x += w;
  });
  b += T(X0, 372, `${mxn(tot)} − ${p1(p.comision_tarjeta)} − ${n(p.soporte)} − ${p1(p.servidor_y_disco)} = ${p2(p.queda)}`, 15, C.vino, "start", 700);
  return b;
}, e => `De ${mxn(e.pesos_por_cliente_de_paga.precio)} al mes, ${mxn(Math.round(e.pesos_por_cliente_de_paga.queda))} se quedan en Carta antes de captación y sueldos.`);

/* 4 · el margen de operación: una cascada */
DET.k_margen = vizK("margen", "Del ingreso al margen de operación: lo que entra y lo que sale con 1,000 restaurantes.", null, e => {
  const c = e.cascada_margen, pasos = [["Suscripciones", c.ingreso_suscripcion, "+"], ["Anuncios", c.ingreso_anuncios, "+"], ["Servidor", -c.costo_servidor, "-"], ["Almacenamiento", -c.costo_almacenamiento, "-"], ["Soporte", -c.costo_soporte, "-"], ["Comisión", -c.costo_comision, "-"], ["Margen de operación", c.margen_operacion, "="]];
  const acum = []; let t = 0; pasos.forEach(([, v, k]) => { if (k === "=") acum.push([0, v]); else { acum.push([t, t + v]); t += v; } });
  const mx = Math.max(...acum.flat(), 1), mn = Math.min(0, ...acum.flat()), H0 = 70, H1 = 300, Y = v => H1 - (H1 - H0) * (v - mn) / (mx - mn), w = 118, gap = 26;
  let b = T(30, 36, `${n(c.de_paga)} clientes de paga y ${n(1000 - c.de_paga)} gratuitos (pesos al mes)`, 14, C.t2, "start", 700) + `<line x1="30" x2="1070" y1="${Y(0)}" y2="${Y(0)}" stroke="${C.arena}" stroke-width="2"/>`;
  pasos.forEach(([nom, v, k], i) => {
    const [a, z] = acum[i], x = 40 + i * (w + gap), top = Math.min(Y(a), Y(z)), alto = Math.max(Math.abs(Y(a) - Y(z)), 3), col = k === "=" ? (v >= 0 ? C.vino : C.rojo) : k === "+" ? C.verde : C.rojo;
    b += `<g data-tip="${esc2(`${nom}|${(k === "-" ? "−" : k === "+" ? "+" : "") + "$" + n(Math.abs(v))}|${k === "=" ? "Lo que queda cada mes, antes de captación, sueldos e impuestos." : k === "+" ? "Entra cada mes." : "Sale cada mes."}`)}">` + `<rect class="gh" style="animation-delay:${i * 100}ms" x="${x}" y="${top}" width="${w}" height="${alto}" rx="10" fill="${col}"/>` + T(x + w / 2, top - 8, (k === "-" ? "−" : k === "+" ? "+" : "") + n(Math.abs(v)), 16, col, "middle", 400, true) + T(x + w / 2, H1 + 34, nom, 12.5, C.tinta, "middle", 700) + `</g>`;
    if (i < pasos.length - 1 && k !== "=") b += `<line x1="${x + w}" x2="${x + w + gap}" y1="${Y(a === acum[i][0] ? z : z)}" y2="${Y(z)}" stroke="${C.t2}" stroke-dasharray="3 4"/>`;
  });
  return b;
}, e => `Entran $${n(e.cascada_margen.ingresos)} y salen $${n(e.cascada_margen.costos)}: quedan ${mp(e.cascada_margen.margen_operacion)} al mes, sin captación ni sueldos.`);
