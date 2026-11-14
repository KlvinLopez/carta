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
    host.innerHTML = `<div class="seg" id="estR" style="margin-bottom:8px"><button class="btn" data-est="hoy">Hoy: el teléfono pregunta cada 3 s</button><button class="btn" data-est="avisos">Con avisos (Fase 3)</button></div><div class="rdesl"><label for="rN">Restaurantes en la plataforma</label><input type="range" id="rN" min="0" max="1200" step="1" value="148"><output id="rNv">148</output></div><div class="viz"><svg id="svR" viewBox="0 0 1100 500" role="img" font-family="DM Sans, sans-serif"></svg></div><p class="insight rhall" id="rh1"></p><div class="viz" style="margin-top:18px"><svg id="svPal" viewBox="0 0 1100 520" role="img" font-family="DM Sans, sans-serif"></svg></div><p class="insight rhall" id="rh2"></p><div class="viz" style="margin-top:18px"><svg id="svEsc" viewBox="0 0 1100 360" role="img" font-family="DM Sans, sans-serif"></svg></div><p class="insight rhall" id="rh3"></p>`;
    this.n = null; this.tocado = false;
    $("#rN", host).addEventListener("input", ev => { this.n = +ev.target.value; this.tocado = true; if (this.r) this.pintaMed(); });
    host.addEventListener("click", ev => {
      const e = ev.target.closest("[data-est]"); if (e) { this.est = e.dataset.est; this.tocado = false; refrescar(); return; }
      const r = ev.target.closest("[data-rec]"); if (r) { this.sel = r.dataset.rec; refrescar(); return; }
      const p = ev.target.closest("[data-pal]"); if (p) { const id = p.dataset.pal, ps = S.palancas || []; cambiar({palancas: ps.includes(id) ? ps.filter(x => x !== id) : [...ps, id]}); }
    });
    host.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { const t = ev.target.closest("[data-pal],[data-rec]"); if (t) { ev.preventDefault(); t.dispatchEvent(new MouseEvent("click", {bubbles: true})); } } });
  },
  actualizar() {
    const r = conCache("rec7", () => MOD.recursos(config(S), sup(S), "hoy")), hoy = this.est === "hoy", clave = hoy ? "restaurantes_hoy" : "restaurantes_con_eventos", ck = hoy ? "hoy" : "con_eventos";
    $$("#estR [data-est]").forEach(b => b.setAttribute("aria-pressed", b.dataset.est === this.est));
    const cuello = hoy ? r.cuello_hoy : r.cuello_con_eventos;
    this.r = r; this.hoy = hoy; this.clave = clave; this.cuello = cuello;
    if (!this.tocado) this.n = cuello.restaurantes;
    this.pintaMed();
    // ---- palancas
    this.pintaPalancas(r, ck);
    this.pintaEscalera(r, hoy);
    return {
      leyenda: `<span><i style="background:${C.rojo}"></i>el recurso que se llena primero</span><span><i style="background:${C.dorado}"></i>los demás recursos</span>`,
      cifras: [[n(r.cuello_hoy.restaurantes), `restaurantes caben hoy: frena ${REC_NOM[r.cuello_hoy.recurso].toLowerCase()}`, "medido en local (±2×)"], [n(r.cuello_con_eventos.restaurantes), `con avisos (Fase 3): frena ${REC_NOM[r.cuello_con_eventos.recurso].toLowerCase()}`, "estimado"], [n(r.hoy.total_usd_mes, 1) + " USD", "lo que pagamos al mes hoy"], [n(r.escalera[r.escalera.length - 1].restaurantes_que_caben), "restaurantes caben en el escalón más grande (Pro, 8 procesos)", "estimado"]],
      insight: hoy ? `Hoy frena ${REC_NOM[cuello.recurso].toLowerCase()}: ${n(cuello.restaurantes)} restaurantes; con avisos en vez de preguntas sube a ${n(r.cuello_con_eventos.restaurantes)} y el que frena es ${REC_NOM[r.cuello_con_eventos.recurso].toLowerCase()}.` : `Con avisos, el disco frena a ${n(cuello.restaurantes)}; las palancas lo liberan sin pagar un servidor más grande.`,
    };
  },
  pintaMed() {
    const r = this.r, hoy = this.hoy, clave = this.clave, cuello = this.cuello, N = this.n, X0 = 230, W = 380;
    const rn = $("#rN"); if (rn) { rn.value = N; $("#rNv").textContent = n(N); }
    const pc = v => N / v, txt = p => (p < 0.01 ? "menos de 1 %" : n(100 * p, p < 0.1 ? 1 : 0) + " %");
    const cap = nom => { const x = r.recursos.find(q => q.recurso === nom); return x ? x[clave] : null; };
    const conTope = r.recursos.filter(x => x[clave] != null), llena = conTope.reduce((m, x) => (pc(x[clave]) > pc(m[clave]) ? x : m), conTope[0]);
    let b = T(30, 30, `Con ${n(N)} restaurantes, ¿qué tan lleno está cada recurso?`, 14.5, C.vino, "start", 700);
    ["procesador", "disco", "conexiones_bd"].forEach((nom, i) => {
      const y = 56 + i * 72, v = cap(nom), p = v ? pc(v) : 0, rojo = llena && llena.recurso === nom, on = this.sel === nom, col = rojo ? C.rojo : C.dorado;
      b += `<g data-rec="${nom}" tabindex="0" role="button" aria-label="${REC_NOM[nom]}" style="cursor:pointer" data-tip="${esc2((r.recursos.find(q => q.recurso === nom).como_funciona || "").replace(/[`*]/g, ""))}">` + Rc(18, y - 8, 680, 64, on ? C.a2 : "rgba(0,0,0,0)", 14) + T(X0 - 14, y + 26, REC_NOM[nom], 14.5, rojo ? C.rojo : C.tinta, "end", 700) + Rc(X0, y + 6, W, 32, "#f6f1e8", 16);
      b += `<g class="gh">${Rc(X0, y + 6, Math.max(W * Math.min(p, 1), p > 0 ? 6 : 0), 32, col, 16, rojo ? 'class="pulso"' : "")}</g>` + T(X0 + W + 14, y + 28, txt(p), 22, rojo ? C.rojo : C.t2, "start", 400, true) + T(X0 + W + 14, y + 46, "tope: " + n(v), 12, C.t2, "start", 700);
      if (p > 1) b += T(X0 + W - 8, y + 27, "se desborda", 12, "#fff", "end", 700);
      b += `</g>`;
    });
    b += T(30, 292, "Sin tope práctico (casi vacíos):", 12.5, C.t2, "start", 700);
    ["memoria", "lineas", "fotos"].forEach((nom, i) => {
      const x = 30 + i * 215, v = cap(nom), p = v ? pc(v) : 0, on = this.sel === nom;
      b += `<g data-rec="${nom}" tabindex="0" role="button" aria-label="${REC_NOM[nom]}" style="cursor:pointer">` + Rc(x - 6, 300, 205, 80, on ? C.a2 : "rgba(0,0,0,0)", 12) + T(x + 4, 322, REC_NOM[nom], 13, C.tinta, "start", 700) + Rc(x + 4, 332, 170, 10, "#f6f1e8", 5);
      if (v == null) b += T(x + 4, 366, nom === "lineas" ? "hoy no se usan (sondeo)" : "10 GB gratis, sin tope", 12, C.t2, "start", 700);
      else b += Rc(x + 4, 332, Math.max(170 * Math.min(p, 1), 3), 10, C.dorado, 5) + T(x + 4, 366, `${txt(p)} · tope: ${n(v)}`, 12, C.t2, "start", 700);
      b += `</g>`;
    });
    b += T(30, 412, `Hoy pagamos ≈ ${n(r.hoy.total_usd_mes, 1)} USD al mes (${mxn(Math.round(r.hoy.total_pesos_mes))}): ${r.hoy.servicios.filter(q => q.costo_usd_mes != null).map(q => `${/R2/.test(q.servicio) ? "R2" : q.servicio.split("·").pop().trim().split(" ")[0]} ${n(q.costo_usd_mes, 1)}`).join(" · ")}`, 13, C.t2, "start", 700);
    b += T(30, 440, "Arrastra el deslizador: el primero que llega a 100 % es el que frena.", 12.5, C.t2);
    // el cuello, en grande
    const px = 720;
    b += Rc(px, 44, 360, 140, "#fff", 22) + T(px + 22, 80, hoy ? "Hoy frena" : "Con avisos frena", 14, C.t2, "start", 700) + T(px + 22, 122, REC_NOM[cuello.recurso] || cuello.recurso, 30, C.rojo, "start", 400, true) + T(px + 22, 160, `${n(cuello.restaurantes)} restaurantes · ${n(cuello.comensales_mes / 1000)} mil comensales al mes`, 14, C.tinta, "start", 700);
    // cómo funciona el recurso elegido, en una animación chica
    b += Rc(px, 200, 360, 280, C.a2, 22) + T(px + 22, 230, REC_NOM[this.sel], 18, C.vino, "start", 400, true);
    b += this.anima(px, 244, hoy, r);
    const br = REC_BREVE[this.sel];
    b += T(px + 22, 440, br[1], 12.5, C.tinta, "start", 700) + T(px + 22, 458, this.sel === "procesador" ? (hoy ? "Casi siempre la respuesta es «nada nuevo»." : br[2]) : br[2], 12.5, C.t2);
    $("#svR").innerHTML = b;
    const rh = $("#rh1"); if (rh) rh.innerHTML = `<b>Hallazgo.</b> ${hoy ? `Hoy frena ${REC_NOM[cuello.recurso].toLowerCase()}: ${n(cuello.restaurantes)} restaurantes. Con avisos en vez de preguntas, el que frena es ${REC_NOM[r.cuello_con_eventos.recurso].toLowerCase()} y caben ${n(r.cuello_con_eventos.restaurantes)}.` : `Con avisos frena ${REC_NOM[cuello.recurso].toLowerCase()}: ${n(cuello.restaurantes)} restaurantes; el procesador ya no es el problema.`}`;
  },
  anima(px, py, hoy, r) {
    let o = "";
    if (this.sel === "procesador") {
      [0, 1, 2].forEach(i => { o += Rc(px + 24, py + 12 + i * 52, 34, 44, C.vino, 8) + Rc(px + 28, py + 18 + i * 52, 26, 28, "#fef9f1", 4); });
      o += Rc(px + 270, py + 20, 56, 130, C.osc, 10) + T(px + 298, py + 90, "API", 13, "#fff", "middle", 700);
      [0, 1, 2].forEach(i => { const y = py + 34 + i * 52; o += `<line x1="${px + 62}" y1="${y}" x2="${px + 266}" y2="${y}" stroke="${C.arena}" stroke-width="2"/>`;
        if (hoy) o += `<circle r="6" fill="${C.dorado}" cx="${px + 66}" cy="${y}" opacity="0"><animate attributeName="opacity" values="1;1" begin="${i * 1}s" dur="0.01s" fill="freeze"/><animate attributeName="cx" values="${px + 66};${px + 262}" dur="3s" begin="${i * 1}s" repeatCount="indefinite"/></circle><circle r="5" fill="${C.t2}" cx="${px + 262}" cy="${y}" opacity="0"><animate attributeName="opacity" values=".6;.6" begin="${i * 1 + 0.5}s" dur="0.01s" fill="freeze"/><animate attributeName="cx" values="${px + 262};${px + 66}" dur="3s" begin="${i * 1 + 0.5}s" repeatCount="indefinite"/></circle>`;
        else o += `<circle r="7" fill="${C.verde}" cx="${px + 262}" cy="${y}" opacity="0"><animate attributeName="cx" values="${px + 262};${px + 66}" dur="9s" begin="${i * 3}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.05;0.3;0.35;1" dur="9s" begin="${i * 3}s" repeatCount="indefinite"/></circle>`; });
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
    const CORTO = {estado_en_memoria_60s: "Estado de mesa en memoria 60 s", analitica_agregada_por_dia: "Analítica por día", retencion_analitica_7_dias: "Analítica en bruto 7 días", indices_de_evento_minimos: "Dos índices en analítica", tipos_mas_chicos: "Tipos más chicos", purga_claves_idempotencia: "Purgar claves de idempotencia", archivar_sesiones_cerradas: "Archivar sesiones en R2", pool_acotado: "Acotar conexiones a la base", cerrar_lineas_ociosas: "Cerrar líneas ociosas"};
    const gan = p => { const g = p.ganancia_restaurantes; return g == null ? -1e9 : typeof g === "number" ? g : (g[ck] == null ? -1e8 : g[ck]); };
    filas.sort((a, z) => gan(z) - gan(a));
    let b = T(30, 30, "Las palancas: enciéndelas y mira cuántos restaurantes más caben (antes → después, cada una por separado)", 14.5, C.vino, "start", 700);
    const efecto = p => {
      if (p.id === "purga_claves_idempotencia") return ["—", "evita 34 MB por restaurante al año; sin efecto hasta la Fase 3"];
      if (p.id === "archivar_sesiones_cerradas") return ["—", "sin efecto medido hoy: es para el historial de los clientes de paga"];
      if (p.id === "cerrar_lineas_ociosas") return [`${n(p.restaurantes_antes.con_eventos)} → ${n(p.restaurantes_despues.con_eventos)}`, "líneas abiertas: restaurantes que caben (sólo con avisos)"];
      if (p.id === "pool_acotado") return [`${n(p.restaurantes_antes[ck])} → ${n(p.restaurantes_despues[ck])}`, "protege la base: pone un tope; no suma restaurantes"];
      const ant = p.restaurantes_antes ? p.restaurantes_antes[ck] : null, des = p.restaurantes_despues ? p.restaurantes_despues[ck] : null;
      return [ant != null && des != null ? `${n(ant)} → ${n(des)}` : "—", p.mb_por_restaurante_antes && p.mb_por_restaurante_despues !== p.mb_por_restaurante_antes ? `${n(p.mb_por_restaurante_antes, 1)} → ${n(p.mb_por_restaurante_despues, 1)} MB al mes por restaurante` : "restaurantes que caben"];
    };
    filas.forEach((p, i) => {
      const y = 52 + i * 50, on = ps.includes(p.id), adr = /ADR|regla \d/.test(p.regla_que_toca || ""), [cif, nota] = efecto(p);
      b += `<g data-pal="${p.id}" tabindex="0" role="switch" aria-checked="${on}" style="cursor:pointer" data-tip="${esc2(p.nombre + ". Riesgo: " + p.riesgo + ". Regla: " + p.regla_que_toca)}">` + Rc(18, y - 4, 1064, 46, i % 2 ? "rgba(0,0,0,0)" : C.a2, 14) + Rc(34, y + 7, 46, 24, on ? C.vino : C.gris, 12) + `<circle cx="${on ? 68 : 46}" cy="${y + 19}" r="9" fill="#fff" class="rm" style="transition:cx .25s"/>` + T(100, y + 18, CORTO[p.id] || p.nombre, 14, C.tinta, "start", 700) + T(100, y + 35, REC_NOM[p.rec], 11.5, C.t2) + T(380, y + 20, cif, 18, on ? C.verde : C.vino, "start", 400, true) + T(380, y + 37, nota, 11.5, C.t2) + T(840, y + 24, p.medido ? "medido" : "estimado", 11.5, p.medido ? C.verde : C.dorado, "start", 700) + T(910, y + 24, `esfuerzo ${p.esfuerzo}`, 11.5, C.t2) + (adr ? T(1074, y + 24, "⚠ ADR", 11.5, C.rojo, "end", 700) : "") + `</g>`;
    });
    $("#svPal").setAttribute("viewBox", `0 0 1100 ${70 + filas.length * 50}`); $("#svPal").innerHTML = b;
    const top = filas[0], rh = $("#rh2");
    if (rh) rh.innerHTML = `<b>Hallazgo.</b> La que más suma es «${CORTO[top.id]}»: caben ${n(top.restaurantes_antes[ck])} → ${n(top.restaurantes_despues[ck])} sin pagar un servidor más grande. ${ps.length ? `Encendidas: ${ps.length}; arriba, las cifras ya cuentan con ellas.` : "Enciende una y mira cómo cambian las cifras de arriba."}`;
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
    const rh3 = $("#rh3"); if (rh3) rh3.innerHTML = `<b>Hallazgo.</b> Un servidor más grande sube el tope, pero cuesta: de ${n(es[0].restaurantes_que_caben)} restaurantes en el escalón de hoy a ${n(es[es.length - 1].restaurantes_que_caben)} en el más grande.`;
  },
};
