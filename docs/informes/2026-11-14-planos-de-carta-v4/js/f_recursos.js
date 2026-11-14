/* ===== capítulo 7: ¿Qué nos limita? (modelo r5: recursos, palancas y escalera de tamaños del servidor) ===== */
const REC_NOM = {procesador: "Procesador", memoria: "Memoria", disco: "Disco de la base", conexiones_bd: "Conexiones a la base", lineas: "Líneas abiertas", fotos: "Fotos"};
const REC_BREVE = {
  procesador: ["hoy", "Cada teléfono pregunta cada 3 s si algo cambió.", "Con avisos, el servidor habla sólo cuando hay un cambio."],
  memoria: ["", "Lo que la API guarda en memoria para atender.", "Hoy usa ≈ 320 MB: no limita."],
  disco: ["", "Cada visita escribe filas en varias tablas.", "La mitad de lo que pesa es analítica."],
  conexiones_bd: ["", "La base atiende a pocas conexiones a la vez.", "Cada proceso de la API abre las suyas."],
  lineas: ["", "Una línea abierta es un teléfono conectado, esperando avisos.", "Railway permite hasta 10,000 a la vez."],
  fotos: ["", "Las fotos viven en Cloudflare R2.", "No hay tope práctico: 10 GB gratis."],
};
DET.recursos7 = {
  titulo: "Lo que nos limita hoy es el procesador; con avisos, el disco.",
  fu: ["carta_capacidad", "railway_limites", "carta_disco", "cloudflare_r2_precios"],
  nota: "Modelo de escenarios r5 (docs/research/2026-11-14-recursos.mjs). Los límites de procesador están medidos en local (±2×) y faltan en Railway; las palancas llevan su marca «medido» o «estimado». Un escalón es un tamaño del servidor: cuántos procesos de la API corre, cuánto disco tiene y cuánto cuesta; se sube cuando un recurso se llena. Las palancas que piden un ADR o tocan una regla dura lo dicen al pasar el cursor.",
  montar(host) {
    this.est = "hoy"; this.sel = "procesador";
    host.innerHTML = `<div class="seg" id="estR" style="margin-bottom:8px"><button class="btn" data-est="hoy">Hoy: el teléfono pregunta cada 3 s</button><button class="btn" data-est="avisos">Con avisos (Fase 3)</button></div><div class="viz"><svg id="svR" viewBox="0 0 1100 500" role="img" font-family="DM Sans, sans-serif"></svg></div><div class="viz" style="margin-top:12px"><svg id="svPal" viewBox="0 0 1100 520" role="img" font-family="DM Sans, sans-serif"></svg></div><div class="viz" style="margin-top:12px"><svg id="svEsc" viewBox="0 0 1100 360" role="img" font-family="DM Sans, sans-serif"></svg></div>`;
    host.addEventListener("click", ev => {
      const e = ev.target.closest("[data-est]"); if (e) { this.est = e.dataset.est; refrescar(); return; }
      const r = ev.target.closest("[data-rec]"); if (r) { this.sel = r.dataset.rec; refrescar(); return; }
      const p = ev.target.closest("[data-pal]"); if (p) { const id = p.dataset.pal, ps = S.palancas || []; cambiar({palancas: ps.includes(id) ? ps.filter(x => x !== id) : [...ps, id]}); }
    });
    host.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { const t = ev.target.closest("[data-pal],[data-rec]"); if (t) { ev.preventDefault(); t.dispatchEvent(new MouseEvent("click", {bubbles: true})); } } });
  },
  actualizar() {
    const r = conCache("rec7", () => MOD.recursos(config(S), sup(S), "hoy")), hoy = this.est === "hoy", clave = hoy ? "restaurantes_hoy" : "restaurantes_con_eventos", ck = hoy ? "hoy" : "con_eventos";
    $$("#estR [data-est]").forEach(b => b.setAttribute("aria-pressed", b.dataset.est === this.est));
    const cuello = hoy ? r.cuello_hoy : r.cuello_con_eventos;
    // ---- medidores
    const X0 = 230, W = 420, lo = lg(100), hi = lg(1e6), Xv = v => X0 + W * clamp((lg(v) - lo) / (hi - lo), 0.02, 1);
    let b = T(30, 30, "Cuántos restaurantes aguanta cada recurso (escala logarítmica)", 14.5, C.vino, "start", 700);
    r.recursos.forEach((x, i) => {
      const y = 56 + i * 56, v = x[clave], es = v != null && x.recurso === cuello.recurso, on = this.sel === x.recurso;
      b += `<g data-rec="${x.recurso}" tabindex="0" role="button" aria-label="${REC_NOM[x.recurso]}" style="cursor:pointer" data-tip="${esc2(x.como_funciona.replace(/[`*]/g, ""))}">` + Rc(18, y - 6, 660, 50, on ? C.a2 : "rgba(0,0,0,0)", 14) + T(X0 - 14, y + 24, REC_NOM[x.recurso], 14, es ? C.rojo : C.tinta, "end", 700) + Rc(X0, y + 6, W, 26, "#f6f1e8", 13);
      if (v == null) b += T(X0 + 14, y + 25, "sin tope práctico en este caso", 12.5, C.t2);
      else b += `<g class="gh">${Rc(X0, y + 6, Xv(v) - X0, 26, es ? C.rojo : C.dorado, 13, es ? 'class="pulso"' : "")}</g>` + T(Xv(v) + 10, y + 26, n(v), 20, es ? C.rojo : C.t2, "start", 400, true);
      b += `</g>`;
    });
    b += T(30, 410, `Hoy pagamos ≈ ${n(r.hoy.total_usd_mes, 1)} USD al mes (${mxn(Math.round(r.hoy.total_pesos_mes))}): ${r.hoy.servicios.filter(s => s.costo_usd_mes != null).map(s => `${s.servicio.split("·").pop().trim().split(" ")[0]} ${n(s.costo_usd_mes, 1)}`).join(" · ")}`, 13, C.t2, "start", 700);
    // el cuello, en grande
    const px = 720;
    b += Rc(px, 44, 360, 140, "#fff", 22) + T(px + 22, 80, hoy ? "Hoy frena" : "Con avisos frena", 14, C.t2, "start", 700) + T(px + 22, 122, REC_NOM[cuello.recurso] || cuello.recurso, 30, C.rojo, "start", 400, true) + T(px + 22, 160, `${n(cuello.restaurantes)} restaurantes · ${n(cuello.comensales_mes / 1000)} mil comensales al mes`, 14, C.tinta, "start", 700);
    // cómo funciona el recurso elegido, en una animación chica
    b += Rc(px, 200, 360, 280, C.a2, 22) + T(px + 22, 230, REC_NOM[this.sel], 18, C.vino, "start", 400, true);
    b += this.anima(px, 244, hoy, r);
    const br = REC_BREVE[this.sel];
    b += T(px + 22, 440, br[1], 12.5, C.tinta, "start", 700) + T(px + 22, 458, this.sel === "procesador" ? (hoy ? "Casi siempre la respuesta es «nada nuevo»." : br[2]) : br[2], 12.5, C.t2);
    $("#svR").innerHTML = b;
    // ---- palancas
    this.pintaPalancas(r, ck);
    this.pintaEscalera(r, hoy);
    return {
      leyenda: `<span><i style="background:${C.rojo}"></i>el recurso que se llena primero</span><span><i style="background:${C.dorado}"></i>los demás recursos</span>`,
      cifras: [[n(r.cuello_hoy.restaurantes), `restaurantes caben hoy: frena ${REC_NOM[r.cuello_hoy.recurso].toLowerCase()}`, "medido en local (±2×)"], [n(r.cuello_con_eventos.restaurantes), `con avisos (Fase 3): frena ${REC_NOM[r.cuello_con_eventos.recurso].toLowerCase()}`, "estimado"], [n(r.hoy.total_usd_mes, 1) + " USD", "lo que pagamos al mes hoy"], [n(r.escalera[r.escalera.length - 1].restaurantes_que_caben), "restaurantes caben en el escalón más grande (Pro, 8 procesos)", "estimado"]],
      insight: hoy ? `Hoy frena ${REC_NOM[cuello.recurso].toLowerCase()}: ${n(cuello.restaurantes)} restaurantes; con avisos en vez de preguntas sube a ${n(r.cuello_con_eventos.restaurantes)} y el que frena es ${REC_NOM[r.cuello_con_eventos.recurso].toLowerCase()}.` : `Con avisos, el disco frena a ${n(cuello.restaurantes)}; las palancas lo liberan sin pagar un servidor más grande.`,
    };
  },
  anima(px, py, hoy, r) {
    let o = "";
    if (this.sel === "procesador") {
      [0, 1, 2].forEach(i => { o += Rc(px + 24, py + 12 + i * 52, 34, 44, C.vino, 8) + Rc(px + 28, py + 18 + i * 52, 26, 28, "#fef9f1", 4); });
      o += Rc(px + 270, py + 20, 56, 130, C.osc, 10) + T(px + 298, py + 90, "API", 13, "#fff", "middle", 700);
      [0, 1, 2].forEach(i => { const y = py + 34 + i * 52; o += `<line x1="${px + 62}" y1="${y}" x2="${px + 266}" y2="${y}" stroke="${C.arena}" stroke-width="2"/>`;
        if (hoy) o += `<circle r="6" fill="${C.dorado}" cy="${y}"><animate attributeName="cx" values="${px + 66};${px + 262}" dur="3s" begin="${i * 1}s" repeatCount="indefinite"/></circle><circle r="5" fill="${C.t2}" cy="${y}" opacity=".6"><animate attributeName="cx" values="${px + 262};${px + 66}" dur="3s" begin="${i * 1 + 0.5}s" repeatCount="indefinite"/></circle>`;
        else o += `<circle r="7" fill="${C.verde}" cy="${y}" opacity="0"><animate attributeName="cx" values="${px + 262};${px + 66}" dur="9s" begin="${i * 3}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.05;0.3;0.35;1" dur="9s" begin="${i * 3}s" repeatCount="indefinite"/></circle>`; });
    } else if (this.sel === "disco") {
      const bl = RYP.disco_a_fondo.bytes_por_visita_por_tabla, tot = RYP.disco_a_fondo.bytes_por_visita_total, ps = S.palancas || [];
      const disco = r.recursos.find(x => x.recurso === "disco"), rat = ps.reduce((a, id) => { const p = disco.palancas.find(q => q.id === id); return p && p.mb_por_restaurante_antes ? a * (p.mb_por_restaurante_despues / p.mb_por_restaurante_antes) : a; }, 1);
      let yy = py + 150; const k = 120 / tot;
      bl.forEach((t, i) => { const an = t.tabla === "evento_analitica", h = Math.max(8, t.total_por_visita * k * (an ? Math.max(rat, 0.12) : 1)); yy -= h; o += `<g data-tip="${esc2(t.tabla + ": " + n(t.total_por_visita) + " bytes por visita")}">` + Rc(px + 24, yy, 150, h - 1.5, an ? C.dorado : ["#6b2d3e", "#7d4452", "#8f5a66", "#a17180", "#b3899a", "#c4a0ad", "#d4b9c2"][i % 7], 5) + `</g>` + (h > 14 ? T(px + 180, yy + h / 2 + 4, t.tabla.replace(/_/g, " "), 10.5, C.t2) : ""); });
      o += T(px + 24, py + 172, `Una visita pesa ${n(tot)} bytes; ${n(100 * RYP.disco_a_fondo.parte_de_la_visita_que_es_analitica)} % es analítica`, 11.5, C.osc, "start", 700);
    } else if (this.sel === "lineas") {
      [0, 1, 2, 3].forEach(i => { o += Rc(px + 24, py + 6 + i * 38, 26, 32, C.vino, 6) + `<line x1="${px + 54}" y1="${py + 22 + i * 38}" x2="${px + 266}" y2="${py + 78}" stroke="${C.dorado}" stroke-width="2.5" stroke-dasharray="6 5"><animate attributeName="stroke-dashoffset" values="0;-22" dur="1.2s" repeatCount="indefinite"/></line>`; });
      o += Rc(px + 270, py + 40, 56, 76, C.osc, 10) + T(px + 298, py + 84, "API", 13, "#fff", "middle", 700) + T(px + 24, py + 168, "Cada línea punteada queda abierta todo el rato.", 11.5, C.osc, "start", 700);
    } else {
      o += Rc(px + 24, py + 30, 290, 18, "#fff", 9) + `<g class="gh">${Rc(px + 24, py + 30, this.sel === "memoria" ? 30 : this.sel === "fotos" ? 20 : 70, 18, C.dorado, 9)}</g>` + T(px + 24, py + 76, this.sel === "memoria" ? "≈ 320 MB de hasta 48 GB posibles" : this.sel === "fotos" ? "0.05 GB por restaurante gratuito; 10 GB gratis" : "≈ 100 conexiones (estimado: falta SHOW max_connections)", 12.5, C.t2);
    }
    return o;
  },
  pintaPalancas(r, ck) {
    const ps = S.palancas || [], filas = []; r.recursos.forEach(x => x.palancas.forEach(p => filas.push({...p, rec: x.recurso})));
    const ord = {disco: 0, procesador: 1, conexiones_bd: 2, lineas: 3};
    filas.sort((a, z) => (ord[a.rec] ?? 9) - (ord[z.rec] ?? 9));
    let b = T(30, 30, "Las palancas: enciéndelas y mira cuántos restaurantes más caben (antes → después, por separado)", 14.5, C.vino, "start", 700);
    filas.forEach((p, i) => {
      const y = 52 + i * 50, on = ps.includes(p.id), ant = p.restaurantes_antes ? p.restaurantes_antes[ck] : null, des = p.restaurantes_despues ? p.restaurantes_despues[ck] : null, adr = /ADR|regla \d/.test(p.regla_que_toca || "");
      b += `<g data-pal="${p.id}" tabindex="0" role="switch" aria-checked="${on}" style="cursor:pointer" data-tip="${esc2("Riesgo: " + p.riesgo + ". Regla: " + p.regla_que_toca)}">` + Rc(18, y - 4, 1064, 44, i % 2 ? "rgba(0,0,0,0)" : C.a2, 14) + Rc(34, y + 6, 46, 24, on ? C.vino : C.gris, 12) + `<circle cx="${on ? 68 : 46}" cy="${y + 18}" r="9" fill="#fff" class="rm" style="transition:cx .25s"/>` + T(100, y + 24, p.nombre.length > 54 ? p.nombre.slice(0, 53) + "…" : p.nombre, 14, C.tinta, "start", 700) + T(580, y + 24, REC_NOM[p.rec], 12, C.t2) + T(720, y + 25, ant != null && des != null ? `${n(ant)} → ${n(des)}` : "—", 17, on ? C.verde : C.vino, "start", 400, true) + T(880, y + 24, p.medido ? "medido" : "estimado", 11.5, p.medido ? C.verde : C.dorado, "start", 700) + T(938, y + 24, `esfuerzo ${p.esfuerzo}`, 11.5, C.t2) + (adr ? T(1074, y + 24, "⚠ ADR", 11.5, C.rojo, "end", 700) : "") + `</g>`;
    });
    $("#svPal").setAttribute("viewBox", `0 0 1100 ${70 + filas.length * 50}`); $("#svPal").innerHTML = b;
  },
  pintaEscalera(r, hoy) {
    const es = r.escalera, mx = Math.max(...es.map(e => e.restaurantes_que_caben)), act = hoy ? 0 : 1, w = 1040 / es.length, mc = Math.floor((w - 12) / 6.4);
    const lineas = (t, m) => { const o = []; let cur = ""; t.split(" ").forEach(p => { if ((cur + " " + p).trim().length > m && cur) { o.push(cur); cur = p; } else cur = (cur + " " + p).trim(); }); o.push(cur); return o; };
    let b = T(30, 28, "La escalera de tamaños del servidor: cada escalón es un tamaño que se renta en Railway", 14.5, C.vino, "start", 700);
    es.forEach((e, i) => {
      const x = 30 + i * w, h = 30 + 150 * (lg(Math.max(e.restaurantes_que_caben, 100)) - lg(100)) / (lg(mx) - lg(100)), on = i === act;
      b += Rc(x, 230 - h, w - 12, h, on ? C.vino : "#d9b9c1", 14) + T(x + (w - 12) / 2, 230 - h - 10, n(e.restaurantes_que_caben), 24, C.vino, "middle", 400, true);
      lineas(e.tamano, mc).slice(0, 3).forEach((l, j) => { b += T(x + (w - 12) / 2, 252 + j * 14, l, 11.5, C.tinta, "middle", 700); });
      lineas((e.costo_usd_base > 0 ? `base ${n(e.costo_usd_base, 1)} USD` : "costo sin medir") + (e.recurso_que_obliga_a_subir ? " · sube por " + (REC_NOM[e.recurso_que_obliga_a_subir] || e.recurso_que_obliga_a_subir).toLowerCase() : ""), mc).slice(0, 2).forEach((l, j) => { b += T(x + (w - 12) / 2, 304 + j * 14, l, 11.5, C.rojo, "middle", 700); });
    });
    $("#svEsc").innerHTML = b;
  },
};
