/* ===== capítulo 7: ¿Qué nos limita? (modelo r6: todo en un tablero; ningún control cambia a otro y los números transitan del valor anterior al nuevo) ===== */
const REC_NOM = {procesador: "Procesador", memoria: "Memoria", disco: "Disco de la base", conexiones_bd: "Conexiones a la base", lineas: "Líneas abiertas", fotos: "Fotos"};
const REC_BREVE = {
  procesador: ["hoy", "Cada teléfono pregunta cada 3 s si algo cambió.", "Con avisos, el servidor habla sólo cuando hay un cambio."],
  memoria: ["", "Lo que la API guarda en memoria para atender.", "Hoy usa ≈ 320 MB: no limita."],
  disco: ["", "Cada visita escribe filas en varias tablas.", "La mitad de lo que pesa es analítica."],
  conexiones_bd: ["", "La base atiende a pocas conexiones a la vez.", "Cada proceso de la API abre las suyas."],
  lineas: ["", "Una línea abierta es un teléfono conectado, esperando avisos.", "Railway permite hasta 10,000 a la vez."],
  fotos: ["", "Las fotos viven en Cloudflare R2.", "No hay tope práctico: 10 GB gratis."],
};
/* historial guardado del plan gratuito: [clave, etiqueta, meses de la fila de `disco_por_historial`] */
const HIS = [["vigente", "política vigente (03 §7)", "03§7"], ["12", "12 meses (sin purga)", 12], ["6", "6 meses", 6], ["3", "3 meses", 3], ["30d", "30 días (propuesta, decisión pendiente de Calvin)", 1]];
const PAL_CORTO = {estado_en_memoria_60s: "Estado de mesa en memoria 60 s", analitica_agregada_por_dia: "Analítica por día", retencion_analitica_7_dias: "Analítica en bruto 7 días", indices_de_evento_minimos: "Dos índices en analítica", tipos_mas_chicos: "Tipos más chicos", purga_claves_idempotencia: "Purgar claves de idempotencia", archivar_sesiones_cerradas: "Archivar sesiones en R2", pool_acotado: "Acotar conexiones a la base", cerrar_lineas_ociosas: "Cerrar líneas ociosas"};
const parr = (t, m) => { const o = []; let cur = ""; t.split(" ").forEach(w => { if ((cur + " " + w).trim().length > m && cur) { o.push(cur); cur = w; } else cur = (cur + " " + w).trim(); }); if (cur) o.push(cur); return o; };
const TIPICO = "Restaurante típico (supuesto): 1,800 visitas al mes y 114 comensales al día.";
/* el análisis decide con `en_tablero` cuáles palancas mueven el cuello y merecen un lugar aquí; mientras no lo traiga, se muestran todas */
const enTablero = p => { const t = conCache("palTab", () => MOD.palancasEnTablero(config(S), sup(S))).palancas[p.id]; return !t || t.en_tablero !== false; };
const PHR_PAL = {
  analitica_agregada_por_dia: "La base guarda un conteo por día, no una fila por cada toque.",
  retencion_analitica_7_dias: "Los eventos sueltos duran una semana; después sólo queda el conteo diario.",
  indices_de_evento_minimos: "La tabla de analítica conserva sólo los dos índices que se usan.",
  tipos_mas_chicos: "Los campos de analítica pasan de texto largo a números y huellas.",
  purga_claves_idempotencia: "Evita 34 MB por restaurante al año; sin efecto hasta la Fase 3.",
  archivar_sesiones_de_paga: "Sesiones de paga de más de tres meses pasan a R2; no se borran.",
  archivar_sesiones_de_todos_los_planes: "Lo mismo para todos los planes, gratuito incluido; pide ADR.",
  estado_en_memoria_60s: "El servidor recuerda el estado de cada mesa un minuto.",
  cerrar_lineas_ociosas: "La conexión con el teléfono se cierra tras 2 minutos sin cambios y se reabre sola.",
  pool_acotado: "Protege la base, con menos conexiones por proceso: no suma restaurantes.",
};
const FRASE_REC = {
  procesador: "Hoy cada teléfono pregunta cada 3 s; con avisos sólo habla cuando algo cambia.",
  disco: "Cada visita deja filas en la base, y sin purga el historial crece cada mes.",
  conexiones_bd: "Cada petición usa una conexión a la base; el tope es el grupo de cada proceso.",
  memoria: "Casi vacía: ≈ 320 MB de hasta 48 GB posibles.",
  lineas: "Hoy no se usan; con avisos de la Fase 3, su tope es de diseño (supuesto).",
  fotos: "0.05 GB por restaurante gratuito; R2 da 10 GB gratis.",
};
DET.recursos7 = {
  titulo: "Hoy nada limpia el historial: el disco manda y empeora cada mes; con 30 días, manda el procesador.",
  fu: ["carta_capacidad", "railway_limites", "carta_disco", "cloudflare_r2_precios"],
  nota: `Modelo de escenarios ${MOD.VERSION} (docs/research/2026-11-14-modelo-de-escenarios.mjs). Hoy ningún proceso purga el historial del plan gratuito; «30 días» es una propuesta que contradice 03 §7 y la regla 9: pide cambiar el documento y un ADR antes. Los límites de procesador están medidos en local (±2×) y faltan en Railway; las palancas llevan su marca «medido» o «estimado» en su hover. El restaurante típico (1,800 visitas al mes, 114 comensales al día) es un supuesto del simulador. Un escalón es un tamaño del servidor: cuántos procesos de la API corre, cuánto disco tiene y cuánto cuesta; se sube cuando un recurso se llena. Cada control conserva su valor hasta que lo muevas; los números pasan del valor anterior al nuevo.`,
  montar(host) {
    this.est = "hoy"; this.sel = "procesador"; this.his = "vigente"; this.n = null; this.vals = null; this.palKey = ""; this.akey = "";
    host.innerHTML = `<div class="r7 r7L"><div class="r7p"><div class="r7pl"><div class="r7row"><div id="topesR" class="r7tp"></div></div><div class="r7row"><span class="selr">Cómo se entera el teléfono:</span><div class="seg" id="estR"><button class="btn" data-est="hoy">Hoy: pregunta cada 3 s</button><button class="btn" data-est="avisos">Con avisos (Fase 3)</button></div></div><div class="r7row"><span class="selr">Historial guardado del plan gratuito:</span><div class="seg" id="hisR">${HIS.map(h => `<button class="btn" data-his="${h[0]}">${h[1]}</button>`).join("")}</div></div><div class="r7w" id="hisW"></div><div class="r7row rdesl"><label for="rN">Restaurantes en la plataforma</label><input type="range" id="rN" min="0" max="1200" step="1" value="23"><output id="rNv">23</output></div></div><div class="r7pr"><span class="selr">Palancas (lo que hay que hacer):</span><div class="r7ch" id="palR"></div></div></div><div class="r7g"><div class="r7c1"><div class="viz"><svg id="svM" viewBox="0 0 700 410" role="img" font-family="DM Sans, sans-serif"></svg></div><div class="viz"><svg id="svE" viewBox="0 0 700 350" role="img" font-family="DM Sans, sans-serif"></svg></div></div><div class="r7c2"><div class="viz"><svg id="svH" viewBox="0 0 380 450" role="img" font-family="DM Sans, sans-serif"></svg></div><div class="viz"><svg id="svA" viewBox="0 0 380 270" role="img" font-family="DM Sans, sans-serif"></svg></div></div></div></div>`;
    $("#rN", host).addEventListener("input", ev => { this.n = +ev.target.value; this.apunta(); });
    host.addEventListener("click", ev => {
      const e = ev.target.closest("[data-est]"); if (e) { this.est = e.dataset.est; refrescar(); return; }
      const h = ev.target.closest("[data-his]"); if (h) { this.his = h.dataset.his; refrescar(); return; }
      const r = ev.target.closest("[data-rec]"); if (r) { this.sel = r.dataset.rec; this.tocado = true; refrescar(); return; }
      const p = ev.target.closest("[data-pal]"); if (p) { const id = p.dataset.pal, ps = S.palancas || [], grupo = conCache("palTab", () => MOD.palancasEnTablero(config(S), sup(S))).grupos_excluyentes.forma_de_guardar_la_analitica.miembros; if (ps.includes(id)) cambiar({palancas: ps.filter(x => x !== id)}); else { const gA = conCache("palTab", () => MOD.palancasEnTablero(config(S), sup(S))).grupos_excluyentes.alcance_del_archivo.miembros, mismo = grupo.includes(id) ? grupo : gA.includes(id) ? gA : []; cambiar({palancas: [...ps.filter(x => !mismo.includes(x)), id]}); } }
    });
    host.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { const t = ev.target.closest("[data-rec]"); if (t) { ev.preventDefault(); t.dispatchEvent(new MouseEvent("click", {bubbles: true})); } } });
  },
  discoCap(r) { const m = (HIS.find(h => h[0] === this.his) || HIS[0])[2], f = r.disco_por_historial.find(q => q.meses_historial === m); return f ? f.restaurantes_por_disco : null; },
  /* topes de cada recurso con el historial elegido */
  caps(r = this.r) { const o = []; r.recursos.forEach(x => { const v = x.recurso === "disco" ? this.discoCap(r) : x[this.clave]; if (v != null) o.push({recurso: x.recurso, v}); }); return o; },
  /* con qué topes está calculado el tablero y qué cambió frente a los topes de antes */
  pintaTopes(r) {
    const key = [S.topeMesas, S.topeCuentas, S.topePlatillos].join("|"), txt = t => `${t.topeMesas} mesas · ${t.topeCuentas} ${t.topeCuentas === 1 ? "cuenta" : "cuentas"} · ${t.topePlatillos} platillos`;
    if (this.tkey !== key) { if (this.tkey != null) this.topesAntes = this.topesAct; this.tkey = key; this.topesAct = {topeMesas: S.topeMesas, topeCuentas: S.topeCuentas, topePlatillos: S.topePlatillos}; }
    let cambio = "";
    if (this.topesAntes) {
      const rp = conCache("rec7p|" + JSON.stringify(this.topesAntes) + this.est, () => MOD.recursos(config({...S, ...this.topesAntes}), sup(S), "hoy")), ant = Object.fromEntries(this.caps(rp).map(x => [x.recurso, x.v])), act = Object.fromEntries(this.caps(r).map(x => [x.recurso, x.v]));
      const dif = ["procesador", "disco"].filter(k => ant[k] != null && act[k] != null && ant[k] !== act[k]).map(k => `${REC_NOM[k].split(" ")[0].toLowerCase()} ${n(ant[k])} → ${n(act[k])}`);
      cambio = `<span class="r7an">Antes, con ${txt(this.topesAntes)}: ${dif.length ? dif.join(" · ") : "los medidores no cambian"}.</span>`;
    }
    const pc = conCache("carga7", () => MOD.perfilDeCarga(config(S), sup(S))), tip = `Unidad: restaurante registrado|mezcla de gratuitos y de paga|El de paga pesa ${n(pc.mb_paga)} MB en disco; el gratuito, ${n(pc.mb_gratuito, 1)} MB.`;
    $("#topesR").innerHTML = `<span class="r7tt" data-tip="${esc2(tip)}" tabindex="0">Con tus topes: ${txt(this.topesAct)}</span>${cambio}`;
  },
  /* la escalera con lo elegido arriba: el disco de cada escalón se escala con el historial; el resto, tal cual */
  valEsc(e) { return e.restaurantes_que_caben; },
  actualizar() {
    const sinH = (S.palancas || []).filter(x => x !== "historial_gratuito_30_dias"); if (sinH.length !== (S.palancas || []).length) { cambiar({palancas: sinH}); return null; }
    const r = conCache("rec7", () => MOD.recursos(config(S), sup(S), "hoy")), hoy = this.est === "hoy", clave = hoy ? "restaurantes_hoy" : "restaurantes_con_eventos";
    $$("#estR [data-est]").forEach(b => b.setAttribute("aria-pressed", b.dataset.est === this.est));
    $$("#hisR [data-his]").forEach(b => b.setAttribute("aria-pressed", b.dataset.his === this.his));
    const mH = (HIS.find(h => h[0] === this.his) || HIS[0])[2];
    this.esc = conCache("esc7|" + this.est + "|" + mH, () => MOD.recursos(config(S), sup(S), {canal: hoy ? "sondeo" : "eventos", meses_historial: mH}).escalera);
    this.r = r; this.hoy = hoy; this.clave = clave; this.ck = hoy ? "hoy" : "con_eventos";
    const caps = this.caps(); this.cuello = caps.reduce((m, x) => (x.v < m.v ? x : m), caps[0]);
    if (!this.tocado) this.sel = this.cuello.recurso;
    if (this.n == null) this.n = this.cuello.v;
    $("#hisW").textContent = this.his === "30d" ? "Contradice 03 §7 y la regla 9: cambia el documento y un ADR antes." : this.his === "vigente" ? "Política vigente (03 §7): el gratuito guarda 24 meses de sesiones y 13 de analítica; hoy nada la purga y el disco manda." : "";
    this.pintaPalancas();
    const pr0 = r.recursos.find(x => x.recurso === "procesador"); this.procHoy = pr0.restaurantes_hoy; this.procEv = pr0.restaurantes_con_eventos;
    this.pintaTopes(r);
    const rp = r.rango_procesador, rg = hoy ? rp.procesador_hoy : rp.procesador_con_eventos, p30 = hoy ? this.procHoy : this.procEv;
    this.rg = rg;
    this.apunta(); this.pintaA();
    const e5 = this.esc[this.esc.length - 1];
    return {
      leyenda: `<span><i style="background:${C.rojo}"></i>el recurso que se llena primero</span><span><i style="background:${C.dorado}"></i>los demás recursos</span>`,
      cifras: [[n(r.cuello_hoy.restaurantes), "restaurantes caben hoy, sin purga del historial (a 12 meses de operación): frena el disco", "medido en local; historial supuesto"], [n(r.cuello_hoy.con_historial_30_dias.restaurantes), `con historial a 30 días (propuesta): frena el procesador; entre ${n(r.cuello_hoy.rango_si_es_procesador[0])} y ${n(r.cuello_hoy.rango_si_es_procesador[1])} (± 2×, falta medirlo en Railway)`, "medido en local (±2×)"], [n(r.cuello_con_eventos.con_historial_30_dias.restaurantes), "con avisos (Fase 3) y 30 días: frena el disco", "estimado"], [n(r.hoy.total_usd_mes, 1) + " USD", "lo que pagamos al mes hoy (supone historial a 30 días)"], [n(e5.restaurantes_con_historial_30_dias ?? e5.restaurantes_que_caben), "restaurantes caben en el escalón más grande (Pro, 8 procesos), con historial a 30 días", "estimado"]],
      insight: this.frase(r, hoy, rg, p30),
    };
  },
  frase(r, hoy, rg, p30) {
    const he = this.his, c = this.cuello, ps = (S.palancas || []).length;
    const base = he === "vigente" ? `Con la política vigente (03 §7: 24 meses de sesiones y 13 de analítica) el disco manda y caben ${n(this.discoCap(r))}. Con el historial del gratuito a 30 días (propuesta, decisión pendiente de Calvin) manda ${hoy ? "el procesador: " + n(p30) + ", entre " + n(rg[0]) + " y " + n(rg[1]) + " (falta medirlo en Railway)" : "todavía el disco: " + n(r.cuello_con_eventos.con_historial_30_dias.restaurantes)}.` : `Con ${he === "30d" ? "historial a 30 días (propuesta)" : (HIS.find(h => h[0] === he) || [0, he])[1] + " de historial"} manda ${REC_NOM[c.recurso].toLowerCase()}: caben ${n(c.v)}${c.recurso === "procesador" ? `, entre ${n(rg[0])} y ${n(rg[1])} (falta medirlo en Railway)` : ""}.`;
    return base + (ps ? ` Palancas encendidas: ${ps}; arriba, las cifras ya cuentan con ellas.` : " Enciende una palanca y mira cómo cambian los medidores y las cifras de arriba.");
  },
  /* las palancas, como parámetros: sólo «qué hay que hacer»; lo demás, al hover */
  pintaPalancas() {
    const r = this.r, ps = S.palancas || [], ck = this.ck, he = this.his, base30 = he === "30d", filas = [];
    const ptab = conCache("palTab0", () => MOD.palancasEnTablero({...config(S), palancas: []}, sup(S))).palancas, enR = {};
    r.recursos.forEach(x => x.palancas.forEach(p => { enR[p.id] = {...p, rec: x.recurso}; }));
    Object.keys(ptab).filter(id => ptab[id].en_tablero && id !== "historial_gratuito_30_dias").forEach(id => filas.push(enR[id] || {id, nombre: (MOD.PALANCAS[id] || {}).accion || id, rec: ptab[id].recurso, _pt: ptab[id]}));
    const par = p => { if (p._pt) return [p._pt.capacidad_antes, p._pt.capacidad_despues]; if (base30 && p.sobre_historial_30_dias) return [p.sobre_historial_30_dias.restaurantes_antes, p.sobre_historial_30_dias.restaurantes_despues]; return p.restaurantes_antes ? [p.restaurantes_antes[ck], p.restaurantes_despues[ck]] : [null, null]; };
    const gan = p => { const [a, d] = par(p); return a == null || d == null ? -1e8 : d - a; };
    filas.sort((a, z) => gan(z) - gan(a));
    const key = [ps.join(), ck, he].join("|"); if (key === this.palKey) return; this.palKey = key;
    const grupo = conCache("palTab", () => MOD.palancasEnTablero(config(S), sup(S))).grupos_excluyentes.forma_de_guardar_la_analitica.miembros, chip = p => {
      const [a, d] = par(p), al = MOD.PALANCAS[p.id] || {}, dif = a != null && d != null ? d - a : null;
      const cif = dif == null ? "sin efecto medido" : dif === 0 ? `sin cambio: ${n(a)}` : `${n(a)} → ${n(d)}`;
      const fr = PHR_PAL[p.id] || "";
      const tip = `${al.accion || p.nombre}|${cif}|${fr}`;
      return `<button class="btn pchip" data-pal="${p.id}" aria-pressed="${ps.includes(p.id)}" data-tip="${esc2(tip)}"${dif != null && a ? ` data-tipv="tri:antes|${a}|${n(a)};después|${d}|${n(d)}"` : ""}>${esc(al.accion || PAL_CORTO[p.id] || p.nombre)}</button>`;
    };
    const alc = conCache("palTab", () => MOD.palancasEnTablero(config(S), sup(S))).grupos_excluyentes.alcance_del_archivo.miembros;
    $("#palR").innerHTML = `<div class="r7sub">Forma de guardar la analítica (elige una)</div>` + filas.filter(p => grupo.includes(p.id)).map(chip).join("") + `<div class="r7sub">Alcance del archivo (elige uno)</div>` + filas.filter(p => alc.includes(p.id)).map(chip).join("") + `<div class="r7sub">Además</div>` + filas.filter(p => !grupo.includes(p.id) && !alc.includes(p.id)).map(chip).join("");
  },
  /* los valores que se dibujan pasan del que tenían al nuevo (nunca desde cero) */
  apunta() {
    const r = this.r, N = this.n, to = {};
    r.recursos.forEach(x => { const c = this.caps().find(q => q.recurso === x.recurso); to["p_" + x.recurso] = c ? N / c.v : 0; });
    r.disco_por_historial.forEach((q, i) => { to["cv" + i] = q.restaurantes_por_disco; });
    this.esc.forEach((e, i) => { to["es" + i] = this.valEsc(e); });
    this.to = to;
    if (!this.vals || REDUCE) { this.vals = {...to}; this.dibuja(); return; }
    this.from = {...this.vals}; this.t0 = performance.now();
    if (!this.raf) this.raf = requestAnimationFrame(t => this.paso(t));
  },
  paso(t) {
    const k = clamp((t - this.t0) / 480, 0, 1), e = 1 - Math.pow(1 - k, 3);
    for (const key in this.to) { const a = this.from[key] ?? this.to[key]; this.vals[key] = a + (this.to[key] - a) * e; }
    this.dibuja();
    this.raf = k < 1 ? requestAnimationFrame(t2 => this.paso(t2)) : 0;
  },
  dibuja() { if (!this.r || !this.vals) return; this.pintaM(); this.pintaE(); this.pintaH(); },
  pintaM() {
    const r = this.r, N = this.n, X0 = 190, W = 290, he = this.his, V = this.vals;
    const rn = $("#rN"); if (rn) { if (document.activeElement !== rn) rn.value = N; $("#rNv").textContent = n(N); }
    const caps = this.caps(), llena = caps.reduce((m, x) => (N / x.v > N / m.v ? x : m), caps[0]);
    const cap = nom => { const c = caps.find(q => q.recurso === nom); return c ? c.v : null; };
    const txt = p => (p < 0.01 ? "< 1 %" : n(100 * p, p < 0.1 ? 1 : 0) + " %");
    const rp = r.rango_procesador, rg = this.rg;
    let b = T(20, 26, `Con ${n(N)} restaurantes, ¿qué tan lleno está cada recurso?`, 14, C.vino, "start", 700);
    ["procesador", "disco", "conexiones_bd"].forEach((nom, i) => {
      const y = 44 + i * 70, v = cap(nom), p = V["p_" + nom] ?? 0, rojo = llena && llena.recurso === nom, on = this.sel === nom, col = rojo ? C.rojo : C.dorado;
      const tipTxt = `${REC_NOM[nom]}|${txt(p)} lleno|${FRASE_REC[nom]}`;
      b += `<g data-rec="${nom}" tabindex="0" role="button" aria-label="${REC_NOM[nom]}" style="cursor:pointer" data-tip="${esc2(tipTxt)}" data-tipp="${clamp(p, 0, 1)}">` + Rc(8, y - 8, 684, 62, on ? C.a2 : "rgba(0,0,0,0)", 14) + T(X0 - 12, y + 26, REC_NOM[nom], 14, rojo ? C.rojo : C.tinta, "end", 700) + Rc(X0, y + 6, W, 30, "#f6f1e8", 15);
      b += Rc(X0, y + 6, Math.max(W * Math.min(p, 1), p > 0.001 ? 6 : 0), 30, col, 15, rojo ? 'class="pulso"' : "") + T(X0 + W + 14, y + 28, txt(p), 21, rojo ? C.rojo : C.t2, "start", 400, true) + T(X0 + W + 14, y + 46, "tope: " + n(v), 11.5, C.t2, "start", 700);
      if (nom === "procesador") { const x1 = X0 + W * Math.min(1, N / rg[1]), x2 = X0 + W * Math.min(1, N / rg[0]); b += `<line x1="${x1}" x2="${x2}" y1="${y + 21}" y2="${y + 21}" stroke="${C.osc}" stroke-width="2.4"/><line x1="${x1}" x2="${x1}" y1="${y + 13}" y2="${y + 29}" stroke="${C.osc}" stroke-width="2.4"/><line x1="${x2}" x2="${x2}" y1="${y + 13}" y2="${y + 29}" stroke="${C.osc}" stroke-width="2.4"/>` + T(X0 + 4, y + 52, `margen ±2×: entre ${n(rg[0])} y ${n(rg[1])}; falta medirlo en Railway`, 11, C.osc, "start", 700); }
      if (p > 1) b += T(X0 + W - 8, y + 26, "se desborda", 12, "#fff", "end", 700);
      b += `</g>`;
    });
    b += T(20, 270, "Sin tope práctico (casi vacíos):", 12, C.t2, "start", 700);
    ["memoria", "lineas", "fotos"].forEach((nom, i) => {
      const x = 14 + i * 228, v = cap(nom), p = V["p_" + nom] ?? 0, on = this.sel === nom;
      b += `<g data-rec="${nom}" tabindex="0" role="button" aria-label="${REC_NOM[nom]}" style="cursor:pointer" data-tip="${esc2(REC_NOM[nom] + "|" + (v == null ? "sin tope" : txt(p) + " lleno") + "|" + FRASE_REC[nom])}" data-tipp="${v == null ? 0 : clamp(p, 0, 1)}">` + Rc(x - 6, 278, 214, 76, on ? C.a2 : "rgba(0,0,0,0)", 12) + T(x + 4, 298, REC_NOM[nom], 13, C.tinta, "start", 700) + Rc(x + 4, 308, 180, 10, "#f6f1e8", 5);
      if (v == null) b += T(x + 4, 340, nom === "lineas" ? "hoy no se usan (sondeo)" : "10 GB gratis, sin tope", 11.5, C.t2, "start", 700);
      else b += Rc(x + 4, 308, Math.max(180 * Math.min(p, 1), 3), 10, C.dorado, 5) + T(x + 4, 340, `${txt(p)} · tope: ${n(v)}${nom === "lineas" ? " (supuesto)" : ""}`, 11.5, C.t2, "start", 700);
      b += `</g>`;
    });
    b += T(20, 386, `Hoy pagamos ≈ ${n(r.hoy.total_usd_mes, 1)} USD al mes (${mxn(Math.round(r.hoy.total_pesos_mes))}): ${r.hoy.servicios.filter(q => q.costo_usd_mes != null).map(q => `${/R2/.test(q.servicio) ? "R2" : q.servicio.split("·").pop().trim().split(" ")[0]} ${n(q.costo_usd_mes, 1)}`).join(" · ")}`, 12, C.t2, "start", 700);
    $("#svM").innerHTML = b;
  },
  /* la escalera: lo elegido arriba la recalcula */
  pintaE() {
    const r = this.r, es = this.esc, V = this.vals, hoy = this.hoy, act = 0, w = 680 / es.length, mc = Math.floor((w - 8) / 5.6);
    const mx = Math.max(...es.map((e, i) => V["es" + i] ?? 0), 1), lin = (t, m) => parr(t, m);
    let b = T(20, 24, "La escalera de tamaños: cada escalón es un tamaño de servidor que se renta en Railway", 13, C.vino, "start", 700) + T(20, 42, "Con el historial, las palancas y los avisos que elegiste arriba. Sin purga caben menos.", 11.5, C.rojo, "start", 700);
    es.forEach((e, i) => {
      const x = 12 + i * w, v = V["es" + i] ?? 0, h = 24 + 120 * (lg(Math.max(v, 10)) - lg(10)) / Math.max(lg(mx) - lg(10), 0.2), on = i === act, sube = e.recurso_que_obliga_a_subir_con_historial_30_dias || e.recurso_que_obliga_a_subir;
      b += `<g data-tip="${esc2(e.tamano.split(":")[0] + "|" + n(v) + " restaurantes|" + (e.tamano.split(":")[1] || "").trim() + ". Base " + n(e.costo_usd_base, 1) + " USD al mes" + (sube ? "; lo frena " + (REC_NOM[sube] || sube).toLowerCase() : "") + ".")}">` + Rc(x, 218 - h, w - 10, h, on ? C.vino : "#d9b9c1", 12) + T(x + (w - 10) / 2, 218 - h - 8, n(v), 20, C.vino, "middle", 400, true) + `</g>`;
      lin(e.tamano, mc).slice(0, 4).forEach((l, j) => { b += T(x + (w - 10) / 2, 236 + j * 13, l, 10.5, C.tinta, "middle", 700); });
      lin((e.costo_usd_base > 0 ? `base ${n(e.costo_usd_base, 1)} USD` : "costo sin medir"), mc).slice(0, 2).forEach((l, j) => { b += T(x + (w - 10) / 2, 296 + j * 13, l, 10.5, C.rojo, "middle", 700); });
    });
    $("#svE").innerHTML = b;
  },
  /* a la derecha: quién frena y la curva del disco contra los meses guardados */
  pintaH() {
    const r = this.r, hoy = this.hoy, V = this.vals, he = this.his, cuello = this.cuello, rg = this.rg, f = r.disco_por_historial, selM = (HIS.find(h => h[0] === he) || HIS[0])[2];
    const sa = r.sensibilidad_actividad.find(q => q.factor_de_actividad === 2), pk = r.pico_simultaneo;
    const pc = conCache("carga7", () => MOD.perfilDeCarga(config(S), sup(S))), tipF = `${REC_NOM[cuello.recurso]}|${n(cuello.v)} restaurantes registrados|Cuenta con la mezcla de gratuitos y de paga: el de paga pesa ${n(pc.mb_paga)} MB, el gratuito ${n(pc.mb_gratuito, 1)}.`;
    let b = `<g data-tip="${esc2(tipF)}">` + Rc(0, 0, 380, 132, "#fff", 22) + T(20, 32, hoy ? "Hoy frena" : "Con avisos frena", 13, C.t2, "start", 700) + T(20, 76, REC_NOM[cuello.recurso] || cuello.recurso, 28, C.rojo, "start", 400, true) + T(20, 108, `${n(cuello.v)} restaurantes · historial: ${(HIS.find(h => h[0] === he) || HIS[0])[1]}`, 12.5, C.tinta, "start", 700) + `</g>`;
    const W = 330, H = 130, X0 = 25, Y0 = 400, mx = 300, Y = v => Y0 - H * Math.min(v, mx) / mx;
    b += Rc(0, 146, 380, 304, "#fff", 22) + T(20, 172, "Restaurantes que caben por disco,", 12.5, C.vino, "start", 700) + T(20, 188, "según los meses de historial guardado", 12.5, C.vino, "start", 700);
    const pts = f.map((q, i) => ({x: X0 + 22 + i * (W - 44) / (f.length - 1), v: V["cv" + i] ?? q.restaurantes_por_disco, m: q.meses_historial, et: q.meses_historial === "03§7" ? "03 §7" : q.meses_historial === 1 ? "30 días" : q.meses_historial + " m", real: q.restaurantes_por_disco}));
    // etiquetas: ninguna encima de una línea, de un punto ni de otra etiqueta (cada una busca un lugar libre)
    const cajas = [], choca = (q, c) => !(q.x2 < c.x1 || q.x1 > c.x2 || q.y2 < c.y1 || q.y1 > c.y2), caja = (x, y, w, h, anc = "middle") => ({x1: anc === "middle" ? x - w / 2 : anc === "end" ? x - w : x, x2: anc === "middle" ? x + w / 2 : anc === "end" ? x : x + w, y1: y - h + 3, y2: y + 4});
    const yP = this.procHoy != null ? Y(this.procHoy) : null;
    pts.forEach(q => { cajas.push({x1: q.x - 9, x2: q.x + 9, y1: Y(q.v) - 9, y2: Y(q.v) + 9}); cajas.push(caja(q.x, Y0 + 20, 44, 14)); });
    if (hoy) {
      const et = `procesador ${n(this.procHoy)} (${n(rg[0])}–${n(rg[1])})`, w = et.length * 6.9;
      b += Rc(X0, Y(rg[1]), W, Math.max(Y(rg[0]) - Y(rg[1]), 2), "rgba(79,23,40,.12)", 0) + `<line x1="${X0}" x2="${X0 + W}" y1="${yP}" y2="${yP}" stroke="${C.osc}" stroke-width="2" stroke-dasharray="6 4"/>`;
      cajas.push({x1: X0, x2: X0 + W, y1: yP - 3, y2: yP + 3});
      const pos = [["end", X0 + W, yP - 10], ["start", X0, yP - 10], ["end", X0 + W, yP + 22], ["start", X0, yP + 22], ["end", X0 + W, yP - 30], ["start", X0, yP - 30]].map(([anc, x, y]) => ({anc, x, y, c: caja(x, y, w, 14, anc)}));
      const ok = pos.find(k => !cajas.some(o => choca(k.c, o)) && k.y > 196 && k.y < Y0 - 2) || pos[0];
      cajas.push(ok.c); b += T(ok.x, ok.y, et, 12, C.osc, ok.anc, 700);
    } else b += T(X0 + W, 208, `procesador con avisos: ${n(this.procEv)} (fuera de escala)`, 12, C.osc, "end", 700);
    b += `<line x1="${X0}" x2="${X0 + W}" y1="${Y0}" y2="${Y0}" stroke="${C.arena}" stroke-width="2"/><polyline points="${pts.map(q => q.x + "," + Y(q.v)).join(" ")}" fill="none" stroke="${C.dorado}" stroke-width="3" stroke-linejoin="round"/>`;
    pts.forEach(q => {
      const on = q.m === selM, tx = n(q.real), w = tx.length * 8.4 + 6, yv = Y(q.v), cand = [];
      [-15, 27, -34, 46, -53, 65, -72].forEach(dy => [0, -22, 22].forEach(dx => { const x = clamp(q.x + dx, 14, 366); cand.push({x, y: yv + dy, c: caja(x, yv + dy, w, 16)}); }));
      const ok = cand.find(k => !cajas.some(o => choca(k.c, o)) && k.y > 196 && k.y < Y0 - 2) || cand[0];
      cajas.push(ok.c);
      b += `<circle cx="${q.x}" cy="${yv}" r="${on ? 8 : 5}" fill="${on ? C.rojo : C.dorado}"/>` + T(ok.x, ok.y, tx, 14, on ? C.rojo : C.tinta, "middle", 400, true) + T(q.x, Y0 + 20, q.et, 12, C.t2, "middle", 700);
    });
    b += T(20, 440, `El disco pasa a mandar desde el mes ${r.mes_desde_el_que_manda_el_disco.con_sondeo} de operación.`, 12.5, C.t2, "start", 700);
    $("#svH").innerHTML = b;
  },
  /* la animación del recurso elegido: sólo se redibuja si cambia lo que anima (si no, se reiniciaría en cada cuadro) */
  pintaA() {
    const key = [this.sel, this.hoy, this.his, (S.palancas || []).join()].join("|"); if (key === this.akey) return; this.akey = key;
    const r = this.r, hoy = this.hoy, br = REC_BREVE[this.sel];
    let b = Rc(0, 0, 380, 270, C.a2, 22) + T(20, 30, REC_NOM[this.sel], 17, C.vino, "start", 400, true) + this.anima(0, 40, hoy, r);
    b += T(20, 236, br[1], 12, C.tinta, "start", 700) + T(20, 254, this.sel === "procesador" ? (hoy ? "Casi siempre la respuesta es «nada nuevo»." : br[2]) : br[2], 12, C.t2);
    $("#svA").innerHTML = b;
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
      const h = conCache("hist7", () => MOD.historiaDelDisco(config(S), sup(S))), k = 120 / h.bytes_total; let yy = py + 150;
      h.pasos.forEach((t, i) => { const an = t.tabla === "evento_analitica", hh = Math.max(8, t.bytes * k); yy -= hh; o += `<g data-tip="${esc2(t.tabla.replace(/_/g, " ") + "|" + n(t.bytes) + " bytes|De la mesa de " + h.comensales + " comensales.")}">` + Rc(px + 24, yy, 150, hh - 1.5, an ? C.dorado : ["#6b2d3e", "#7d4452", "#8f5a66", "#a17180", "#b3899a", "#c4a0ad", "#d4b9c2"][i % 7], 5) + `</g>` + (hh > 14 ? T(px + 180, yy + hh / 2 + 4, t.tabla.replace(/_/g, " "), 12, C.t2) : ""); });
      o += T(px + 24, py + 172, `Una mesa de ${h.comensales} deja ${n(h.bytes_total)} bytes; ${n(100 * h.bytes_de_analitica / h.bytes_total)} % es analítica`, 12, C.osc, "start", 700);
    } else if (this.sel === "lineas") {
      [0, 1, 2, 3].forEach(i => { o += Rc(px + 24, py + 6 + i * 38, 26, 32, C.vino, 6) + `<line x1="${px + 54}" y1="${py + 22 + i * 38}" x2="${px + 266}" y2="${py + 78}" stroke="${C.dorado}" stroke-width="2.5" stroke-dasharray="6 5"><animate attributeName="stroke-dashoffset" values="0;-22" dur="1.2s" repeatCount="indefinite"/></line>`; });
      o += Rc(px + 270, py + 40, 56, 76, C.osc, 10) + T(px + 298, py + 84, "API", 13, "#fff", "middle", 700) + T(px + 24, py + 168, "Cada línea punteada queda abierta todo el rato.", 11.5, C.osc, "start", 700);
    } else {
      o += Rc(px + 24, py + 30, 290, 18, "#fff", 9) + `<g class="gh">${Rc(px + 24, py + 30, this.sel === "memoria" ? 30 : this.sel === "fotos" ? 20 : 70, 18, C.dorado, 9)}</g>` + T(px + 24, py + 76, this.sel === "memoria" ? "≈ 320 MB de hasta 48 GB posibles" : this.sel === "fotos" ? "0.05 GB por restaurante gratuito; 10 GB gratis" : "≈ 100 conexiones (estimado: falta SHOW max_connections)", 12.5, C.t2);
    }
    return o;
  },
};

/* la columna de parámetros del capítulo 7 se fija debajo de las seis cifras: mide su altura */
const medirKh = () => { const k = document.getElementById("kpis"); if (k) document.documentElement.style.setProperty("--kh", (k.offsetHeight + 8) + "px"); };
addEventListener("resize", medirKh); addEventListener("load", medirKh); setTimeout(medirKh, 400);
