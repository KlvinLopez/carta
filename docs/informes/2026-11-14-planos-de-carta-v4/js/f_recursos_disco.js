/* ===== capítulo 7, segunda parte: quién llena el disco, la historia de una mesa de 3 comensales registrándose, las formas de guardar la
   analítica lado a lado y la combinación que importa. Todo sale de `recursos().composicion_del_disco`, `historiaDelDisco` y `recursos` con
   palancas; la forma de guardar la analítica es UNA elección (grupos_excluyentes del análisis). Nada se reinicia al tocar otro control. ===== */
(function () {
  const D7 = DET.recursos7, montaBase = D7.montar, actBase = D7.actualizar;
  const NOM_T = {sesion_grupal: "sesión", miembro_sesion: "miembros", orden_personal: "órdenes", item_orden: "platillos", comanda: "comanda", comanda_orden: "enlace", llamada_mesero: "llamada", evento_analitica: "eventos del teléfono"};
  const FORMA = () => conCache("palTab", () => MOD.palancasEnTablero(config(S), sup(S))).grupos_excluyentes.forma_de_guardar_la_analitica.miembros;
  const sinForma = ps => ps.filter(x => !FORMA().includes(x));
  D7.hp = 0;

  D7.montar = function (host, sec) {
    montaBase.call(this, host, sec);
    host.insertAdjacentHTML("beforeend", `<div class="r7x">
<div class="viz"><svg id="svDc" viewBox="0 0 1100 300" role="img" aria-label="Quién llena el disco" font-family="DM Sans, sans-serif"></svg></div>
<div class="r7p r7bar"><span class="selr">Un ejemplo guiado: una mesa de 3 comensales</span><button class="btn" id="hiAt" aria-label="Paso anterior">◀</button><button class="btn" id="hiSig">Siguiente ▶</button><button class="btn" id="hiPl">▶ Reproducir</button><span class="selr" id="hiN"></span></div>
<div class="viz"><svg id="svHi" viewBox="0 0 1100 500" role="img" aria-label="Cómo se acumulan las filas de una mesa de tres comensales" font-family="DM Sans, sans-serif"></svg></div>
<div class="r7p r7bar"><span class="selr">Lo que escribe en la base la mesa de ejemplo, registro por registro. En cada barra, lo oscuro son los datos de la fila y lo dorado sus índices; el largo se mide contra el registro más pesado.</span></div><div id="dReg" class="dr"></div>

<div class="viz"><svg id="svSe" viewBox="0 0 1100 330" role="img" aria-label="La capacidad depende de quién paga" font-family="DM Sans, sans-serif"></svg></div></div>`);
    this.rmH = RM($("#svHi", host));
    const mueve = d => { this.hp = clamp(this.hp + d, 0, 8); if (this.hp === 8 || this.hp === 0) this.paraJuego(); this.pintaHistoria(); };
    host.addEventListener("click", ev => {
      const t = ev.target.closest("button, [data-op]"); if (!t) return;
      if (t.id === "hiAt") mueve(-1);
      else if (t.id === "hiSig") mueve(1);
      else if (t.id === "hiPl") {
        if (this.juego) { this.paraJuego(); this.pintaHistoria(); return; }
        if (this.hp >= 8) this.hp = 0;
        this.juego = setInterval(() => { if (this.hp >= 8) { this.paraJuego(); this.pintaHistoria(); return; } mueve(1); }, 1100); mueve(1);
      } else if (t.dataset && t.dataset.forma) { const ps = S.palancas || []; cambiar({palancas: [...sinForma(ps), ...(FM[t.dataset.forma] || [])]}); }
      else if (t.dataset && t.dataset.fila) { this.abierta = this.abierta === t.dataset.fila ? null : t.dataset.fila; this.pintaRegistros(); }
      else if (t.id === "drAt") { this.pasoReg = (this.pasoReg || 0) <= 1 ? 0 : this.pasoReg - 1; this.pintaRegistros(); }
      else if (t.id === "drSig") { this.pasoReg = Math.min(7, (this.pasoReg || 0) + 1); this.pintaRegistros(); }
      else if (t.id === "drTodo") { this.pasoReg = 0; this.pintaRegistros(); }
    });
  };
  D7.paraJuego = function () { if (this.juego) { clearInterval(this.juego); this.juego = null; } };
  D7.actualizar = function () { const o = actBase.call(this); if (this.r && $("#svDc")) this.pintaExtra(); return o; };
  D7.pintaExtra = function () { this.pintaComposicion(); this.pintaHistoria(); this.pintaRegistros(); this.pintaSensib(); };

  /* 1 · quién llena el disco */
  D7.pintaComposicion = function () {
    const cp = this.r.composicion_del_disco, W = 1040, X0 = 30; if (!cp) return;
    const pg = cp.parte_del_disco.gratuitos, pp = cp.parte_del_disco.de_paga, q = cp.parte_que_paga, dg = cp.desglose;
    const fila = (y, tit, partes) => { let x = X0, b = T(X0, y - 8, tit, 13, C.t2, "start", 700); partes.forEach(([nom, v, col, tx, tip]) => { const w = Math.max(W * v, 3); b += `<g data-tip="${esc2(tip)}" data-tipp="${v}" tabindex="0">` + Rc(x, y, w, 42, col, 14) + (w > 110 ? T(x + w / 2, y + 27, `${nom} · ${n(100 * v, 1)} %`, 13.5, tx, "middle", 700) : "") + `</g>`; x += w; }); return b; };
    let b = T(X0, 26, `Quién llena el disco (promedio ${n(cp.mb_por_restaurante.promedio, 1)} MB por restaurante registrado)`, 15, C.vino, "start", 700);
    b += fila(66, "De cada 100 restaurantes registrados…", [["gratuitos", 1 - q, C.dorado, C.tinta, `Gratuitos|${n(100 * (1 - q), 1)} % de los restaurantes|Guardan ${cp.meses_de_historial.gratuito} mes de historial y pesan ${n(cp.mb_por_restaurante.gratuito, 1)} MB cada uno.`], ["de paga", q, C.vino, "#fff", `De paga|${n(100 * q, 1)} % de los restaurantes|Guardan ${cp.meses_de_historial.paga} meses y pesan ${n(cp.mb_por_restaurante.paga)} MB cada uno.`]]);
    b += fila(138, "…ocupan este disco", [["gratuitos", pg, C.dorado, C.tinta, `Disco de los gratuitos|${n(100 * pg, 1)} % del disco|Son la mayoría de los restaurantes, pero guardan poco.`], ["de paga", pp, C.vino, "#fff", `Disco de los de paga|${n(100 * pp, 1)} % del disco|Son pocos, pero guardan ${cp.meses_de_historial.paga} meses de sesiones y órdenes.`]]);
    b += fila(210, "¿Y de qué está hecho?", [["sesiones y órdenes", dg.parte_sesiones_y_ordenes_del_disco, "#8f5a66", "#fff", `Sesiones y órdenes|${n(100 * dg.parte_sesiones_y_ordenes_del_disco, 1)} % del disco|Lo que se guarda cuando una mesa pide; lo llenan sobre todo los de paga.`], ["analítica", dg.parte_analitica_del_disco, C.dorado, C.tinta, `Analítica|${n(100 * dg.parte_analitica_del_disco, 1)} % del disco|Los toques del comensal en el teléfono; contar por día sólo recorta esta parte.`], ["fijo", dg.parte_fija_del_disco, C.arena, C.tinta, `Parte fija|${n(100 * dg.parte_fija_del_disco, 1)} % del disco|Lo que ocupa un restaurante aunque no tenga visitas.`]]);
    b += `<g data-tip="${esc2(`Por qué ya no es ${n(cp.cifra_de_antes)}|${n(cp.restaurantes_que_caben_por_disco)} restaurantes|Antes se contaban gratuitos típicos; ahora, registrados con la mezcla de paga, que pesa más.`)}" tabindex="0">` + T(X0, 282, `El disco de un cliente de paga cuesta ${n(cp.costo_del_disco_pesos_al_mes.paga, 2)} MXN al mes frente a ${n(cp.costo_del_disco_pesos_al_mes.lo_que_paga_un_restaurante_de_paga)} MXN que paga · si todos fueran gratuitos cabrían ${n(cp.si_todos_fueran_gratuitos)}, no ${n(cp.restaurantes_que_caben_por_disco)}`, 13, C.tinta, "start", 700) + `</g>`;
    $("#svDc").innerHTML = b;
  };

  /* 2 · la historia paso a paso: las filas se apilan en su tabla y el medidor de bytes sube */
  D7.pintaHistoria = function () {
    const h = conCache("hist7", () => MOD.historiaDelDisco(config(S), sup(S))), rm = this.rmH, hp = this.hp, pasos = h.pasos, tot = h.bytes_total, X0 = 30, W = 1040, CW = 131;
    const acum = hp ? pasos[hp - 1].acumulado : 0;
    $("#hiAt").disabled = hp <= 0; $("#hiSig").disabled = hp >= 8; $("#hiPl").textContent = this.juego ? "⏸ Pausa" : (hp >= 8 ? "↺ Repetir" : "▶ Reproducir"); $("#hiN").textContent = `Paso ${hp} de 8`;
    const ACT = {A: C.vino, B: C.verde, C: "#2b5d8a", M: "#5b5b5b"}, QUIEN = [["A"], ["B", "C"], ["A", "B", "C"], ["A", "B", "C"], ["M"], ["M"], ["M"], ["A", "B", "C"]];
    const DICE = ["A escanea el QR: nace la sesión de la mesa", "B y C escanean: cada quien queda como miembro", "Cada quien abre su orden personal", "Cada quien agrega sus platillos", "La mesa envía la comanda al personal", "La comanda enlaza la orden de cada uno", "Alguien llama al mesero", "Cada teléfono manda sus eventos mientras tanto"];
    rm.put("t0", "text", {x: X0, y: 28, text: "Tres comensales (A, B y C) escanean el QR de la misma mesa", size: 15, weight: 700, fill: C.vino});
    rm.put("t1", "text", {x: X0, y: 50, text: "Cada pieza lleva el color de quien la escribe; gris es lo que guarda la mesa entera. Las piezas con borde dorado son analítica.", size: 12.5, weight: 700, fill: C.t2});
    pasos.forEach((p, i) => {
      const x = X0 + i * CW, vis = hp > i, esA = p.tabla === "evento_analitica", n0 = Math.floor(p.filas), fr = p.filas - n0, bl = Math.min(12, n0 + (fr > 0.05 ? 1 : 0)), q = QUIEN[i], porMesa = q[0] === "M";
      q.forEach((l, j) => { const cx = x + 14 + j * 28; rm.put(`ch${i}_${j}`, "circle", {x: cx, y: 82, r: 12, fill: ACT[l], op: vis ? 1 : 0, grow: false}); rm.put(`cl${i}_${j}`, "text", {x: cx, y: 87, text: vis ? (porMesa ? "" : l) : "", size: 13, weight: 700, fill: "#fff", anchor: "middle"}); });
      rm.put(`cm${i}`, "text", {x: x + 32, y: 87, text: vis && porMesa ? "la mesa" : "", size: 13, weight: 700, fill: ACT.M});
      const lin = parr(DICE[i], 17);
      for (let k = 0; k < 3; k++) rm.put(`ac${i}_${k}`, "text", {x: x + 4, y: 118 + k * 16, text: vis ? lin[k] || "" : "", size: 13, weight: 700, fill: C.tinta});
      rm.put("tn" + i, "text", {x: x + CW / 2 - 6, y: 284, text: NOM_T[p.tabla], size: 12.5, weight: 700, fill: vis ? (esA ? C.dorado : C.vino) : C.t2, anchor: "middle", op: vis ? 1 : 0.55});
      rm.put("tf" + i, "text", {x: x + CW / 2 - 6, y: 302, text: vis ? `${p.filas >= 2 ? n(p.filas) : n(p.filas, 1)} ${p.filas === 1 ? "fila" : "filas"} · ${n(p.bytes)} B` : "", size: 12, fill: C.t2, anchor: "middle", weight: 700, attrs: {"data-tip": `${NOM_T[p.tabla]}|${n(p.bytes)} bytes|${p.filas >= 2 ? n(p.filas) : n(p.filas, 1)} filas de ${n(p.bytes_por_fila)} bytes cada una.`}});
      for (let k = 0; k < 12; k++) {
        const on = vis && k < bl, parcial = on && k === bl - 1 && fr > 0.05 && n0 < 12, dueño = porMesa ? "M" : q[k % q.length], col = ACT[dueño];
        rm.put(`bk${i}_${k}`, "rect", {x: x + 4 + (k % 4) * 31, y: 252 - Math.floor(k / 4) * 26, w: 27, h: 22, rx: 6, fill: col, op: on ? (parcial ? Math.max(fr, 0.4) : 1) : 0, grow: false, attrs: esA ? {stroke: C.dorado, "stroke-width": 2.4} : {}});
      }
      rm.put("bl" + i, "rect", {x: x + 2, y: 312, w: CW - 12, h: 3, rx: 1.5, fill: C.arena, grow: false});
    });
    const sinAn = h.bytes_de_la_mesa_sin_analitica, vino = Math.min(acum, sinAn), oro = Math.max(0, acum - sinAn);
    rm.put("mt", "text", {x: X0, y: 350, text: "Lo que ocupa esta mesa en la base", size: 13, weight: 700, fill: C.t2});
    rm.put("mk", "rect", {x: X0, y: 360, w: W, h: 28, rx: 14, fill: C.a2, grow: false});
    rm.put("mb", "rect", {x: X0, y: 360, w: Math.max(W * vino / tot, vino ? 6 : 0), h: 28, rx: 14, fill: C.vino, grow: false});
    rm.put("ma", "rect", {x: X0 + W * vino / tot, y: 360, w: W * oro / tot, h: 28, rx: 14, fill: C.dorado, grow: false});
    rm.put("mn", "text", {x: X0, y: 436, text: `${n(acum)} bytes`, size: 38, fill: C.vino, serif: true});
    rm.put("mc", "text", {x: X0 + 330, y: 428, text: hp ? "" : "Toca «Siguiente» o «Reproducir»: cada paso agrega filas y bytes.", size: 13.5, weight: 700, fill: C.t2});
    const cierre = hp >= 8 ? `Una mesa de ${h.comensales} deja ${n(tot / 1000, 1)} KB y ${n(100 * h.bytes_de_analitica / tot)} % es analítica.` : "";
    rm.put("mz", "text", {x: X0 + 330, y: 428, text: cierre, size: 15, weight: 700, fill: C.dorado});
    const lin2 = hp ? parr(pasos[hp - 1].paso, 118) : [];
    for (let k = 0; k < 2; k++) rm.put("mp" + k, "text", {x: X0, y: 466 + k * 18, text: lin2[k] || "", size: 13, fill: C.tinta});
  };

  /* 3 · lo que escribe en la base la mesa de ejemplo, registro por registro (datos medidos: docs/research/2026-11-21-disco-por-registro.json) */
  const FM = {hoy: [], contar_por_dia: ["analitica_agregada_por_dia"], fila_por_visita: ["fila_por_visita_de_comensal"], fila_mas_platillo_y_filtros_por_dia: ["fila_por_visita_mas_platillo_por_dia"]};
  const ORD = ["p1", "p2", "p3", "p4", "p5", "p6"], PASO_FORMA = {contar_por_dia: "pcd", fila_por_visita: "pfv", fila_mas_platillo_y_filtros_por_dia: "pcb"};
  const TIPO_EVENTO = {1: "scan", 2: "menu_view", 3: "dish_view", 4: "search", 5: "filter", 6: "item_add"}; // códigos de tipo de las formas propuestas: CODIGO de docs/research/2026-11-21-disco-por-registro.py (pedirle a análisis que los incluya en el JSON)
  const pasoN = id => { const i = ORD.indexOf(id); return i < 0 ? 7 : i + 1; };
  const todasLasFilas = DR.tablas_de_la_mesa.concat(...DR.formas.map(f => f.tablas)).flatMap(t => t.filas), MXB = Math.max(...todasLasFilas.map(f => f.bytes_total));
  D7.pintaRegistros = function () {
    const el = $("#dReg"); if (!el) return;
    const ps = S.palancas || [], enF = ps.filter(x => FORMA().includes(x));
    const fid = Object.keys(FM).find(k => FM[k].length === enF.length && FM[k].every(p => enF.includes(p))) || "hoy";
    const forma = DR.formas.find(f => f.id === fid), hoy = DR.formas.find(f => f.id === "hoy"), maxPaso = fid === "hoy" ? 6 : 7;
    if (this.pasoReg > maxPaso) this.pasoReg = maxPaso;
    const paso = this.pasoReg || 0, visible = f => !paso || pasoN(f.paso) <= paso;
    if (this.abierta === undefined) this.abierta = hoy.tablas[0].filas[0].id;
    const sumaT = (tbs, cond = visible) => tbs.reduce((a, t) => a + t.filas.filter(cond).reduce((b, f) => b + f.bytes_total, 0), 0);
    const bM = sumaT(DR.tablas_de_la_mesa), bA = sumaT(forma.tablas), bT = bM + bA;
    const resumen = f => f.columnas.filter(c => c.valor != null && !/^[0-9a-f]{8}-/.test(String(c.valor)) && String(c.valor).length <= 16).slice(0, 3).map(c => `${c.nombre}: ${c.nombre === "tipo" && TIPO_EVENTO[c.valor] ? `${c.valor} (${TIPO_EVENTO[c.valor]})` : c.valor}`).join(" · ");
    const detalle = f => {
      const cols = f.columnas.reduce((a, c) => a + c.bytes, 0);
      return `<div class="ddet"><table class="dcol"><thead><tr><th>Columna</th><th>Tipo</th><th>Valor de ejemplo</th><th>Bytes</th></tr></thead><tbody>${f.columnas.map(c => `<tr><td>${esc(c.nombre)}</td><td>${esc(c.tipo)}</td><td>${c.valor == null ? "<i>vacío</i>" : esc(String(c.valor).slice(0, 44))}</td><td>${n(c.bytes)}${c.relleno_antes ? ` <small>+${c.relleno_antes} de relleno</small>` : ""}</td></tr>`).join("")}</tbody></table>
        <div class="dsum">Cabecera ${n(f.cabecera_bytes)} B + columnas ${n(cols)} B + relleno ${n(f.relleno_bytes)} B + puntero de línea ${n(f.puntero_de_linea_bytes)} B = <b>${n(f.bytes_datos)} B de datos</b></div>
        <div class="dind">${f.indices.map(i => `<span>${esc(i.nombre)}: ${n(i.bytes)} B</span>`).join("")}<span>→ <b>${n(f.bytes_indices)} B de índices</b> (${n(100 * f.bytes_indices / f.bytes_total)} % de la fila)</span></div></div>`;
    };
    const fila = f => {
      const abre = this.abierta === f.id, nuevo = paso && pasoN(f.paso) === paso;
      return `<div class="dfila${abre ? " on" : ""}${nuevo ? " nuevo" : ""}"><button class="dfb" data-fila="${esc(f.id)}" aria-expanded="${abre}"><span class="dfi">${esc(f.id)}</span><span class="dfr">${esc(resumen(f))}</span><span class="dfbar" title="datos y índices"><i style="width:${100 * f.bytes_datos / MXB}%;background:var(--vino)"></i><i style="width:${100 * f.bytes_indices / MXB}%;background:var(--dorado)"></i></span><b>${n(f.bytes_total)} B</b></button>${abre ? detalle(f) : ""}</div>`;
    };
    const tabla = (t, an) => { const fl = t.filas.filter(visible); if (!fl.length) return ""; const tot = fl.reduce((a, f) => a + f.bytes_total, 0); return `<section class="dtab${an ? " an" : ""}"><h4>${esc(t.tabla)} <small>${esc(t.que_guarda)}${an ? " · analítica" : ""}</small><b>${n(fl.length)} ${fl.length === 1 ? "fila" : "filas"} · ${n(tot)} B</b></h4>${fl.map(fila).join("")}</section>`; };
    const cmp = id => (DR.comparacion.find(q => q.forma === id) || {}).frente_a_hoy;
    const lateral = DR.formas.map(f => { const c = cmp(f.id); return `<button class="dfm${f.id === fid ? " on" : ""}" data-forma="${f.id}" aria-pressed="${f.id === fid}"><span>${esc(f.nombre)}</span><small>${f.estado === "propuesta" ? "propuesta" : "lo que hace hoy"}</small><b>${n(f.bytes_total)} B</b><em>${c ? `analítica ${n(100 * (f.bytes_analitica / hoy.bytes_analitica - 1)).replace("-", "−")} % · la mesa entera ${n(100 * (f.bytes_total / hoy.bytes_total - 1)).replace("-", "−")} %` : "la base de comparación"}</em></button>`; }).join("");
    const dp = paso ? (DR.pasos.find(q => q.id === (paso <= 6 ? ORD[paso - 1] : PASO_FORMA[fid])) || null) : null;
    const hoyF = hoy.tablas.reduce((a, t) => a + t.filas.length, 0), hoyB = hoy.bytes_analitica, fF = forma.tablas.reduce((a, t) => a + t.filas.length, 0);
    const dif = fid === "hoy" ? "" : `<div class="drDif">Frente a Hoy: desaparecen ${n(hoyF)} eventos (${n(hoyB)} B) y entran ${n(fF)} filas de ${forma.tablas.map(t => esc(t.tabla)).join(" y ")} (${n(forma.bytes_analitica)} B); las ${n(DR.tablas_de_la_mesa.reduce((a, t) => a + t.filas.length, 0))} filas de la mesa quedan igual.</div>`;
    const f1 = forma.tablas[0].filas[0], d = DR.diferencia_con_el_informe;
    el.innerHTML = `<div class="drL" role="group" aria-label="Formas de guardar la analítica"><div class="drT">Forma de guardar la analítica</div>${lateral}</div>
<div class="drR"><div class="drH"><span class="t">${esc(DR.ejemplo.descripcion)}</span><button class="btn" id="drAt" aria-label="Paso anterior"${paso === 0 ? " disabled" : ""}>◀</button><span class="drPaso" id="drN">${paso ? `Paso ${paso} de ${maxPaso}` : "Todos los pasos"}</span><button class="btn" id="drSig"${paso >= maxPaso ? " disabled" : ""}>Siguiente ▶</button><button class="btn" id="drTodo"${paso === 0 ? " disabled" : ""}>Todo</button></div>
${dp ? `<div class="drMed">${esc(dp.quien === "M" ? "" : dp.quien + ": ")}${esc(dp.que_hace)}</div>` : ""}
${DR.tablas_de_la_mesa.map(t => tabla(t, false)).join("")}${forma.tablas.map(t => tabla(t, true)).join("")}
<div class="drTot"><div><small>mesa, sin analítica</small><b>${n(bM)} B</b></div><div class="an"><small>analítica de la forma elegida</small><b>${n(bA)} B</b></div><div><small>total de la mesa</small><b>${n(bT)} B</b></div><div><small>parte que es analítica</small><b>${bT ? n(100 * bA / bT) : 0} %</b></div></div>
${dif}
<div class="drMed">Una fila de ${esc(forma.tablas[0].tabla)} pesa ${n(f1.bytes_total)} B: ${n(f1.bytes_datos)} la tupla y ${n(f1.bytes_indices)} ${f1.indices.length === 1 ? 'su única entrada' : 'sus ' + f1.indices.length + ' entradas'} de índice (${n(100 * f1.bytes_indices / f1.bytes_total)} %).</div>
<div class="drDif">Esta mesa suelta escribe ${n(d.medido_bytes)} B; el informe usa ${n(d.informe_bytes)} B por mesa, el promedio a escala: PostgreSQL junta las entradas de índice repetidas y un registro suelto no puede. Las dos son ciertas y la capacidad usa el promedio.</div>
<div class="drNota">${forma.notas.map(q => `<p>${esc(q)}</p>`).join("")}</div></div>`;
  };

  /* 5 · la capacidad depende de quién paga: tres casos a la vez (`recursos().sensibilidad_de_la_capacidad`) */
  D7.pintaSensib = function () {
    const sc = this.r.sensibilidad_de_la_capacidad; if (!sc) return;
    const filas = sc.parte_que_paga, mezc = sc.mezcla_de_paga.filter(q => q.id !== "simulador"), dsc = mezc.map(q => q.disco), lo = Math.min(...dsc), hi = Math.max(...dsc);
    const mx = Math.max(...filas.flatMap(f => [f.procesador_con_sondeo, f.disco])), X0 = 330, BW = 330, NOMS = {peor: "Peor: pagan poco", recomendado: "Recomendado", mejor: "Mejor: pagan más"};
    let b = T(30, 26, "La capacidad depende de quién paga: si pagan más, el servidor se llena antes", 14.5, C.vino, "start", 700);
    b += T(X0, 52, "Procesador, con sondeo", 12.5, C.vino, "start", 700) + T(X0 + BW + 90, 52, "Disco, con el gratuito a 30 días (propuesta)", 12.5, C.verde, "start", 700);
    filas.forEach((f, i) => {
      const y = 70 + i * 62, sel = f.escenario === "recomendado";
      b += `<g data-tip="${esc2(`${NOMS[f.escenario]}|${n(100 * f.parte_que_paga, 1)} % paga|Procesador con sondeo: ${n(f.procesador_con_sondeo)}; disco: ${n(f.disco)} restaurantes.`)}" tabindex="0">` + Rc(24, y - 8, 1052, 54, sel ? "#f6e9d4" : "rgba(0,0,0,0)", 14) + T(40, y + 14, NOMS[f.escenario], 14, C.tinta, "start", 700) + T(40, y + 34, `${n(100 * f.parte_que_paga, 1)} % de los restaurantes paga`, 12.5, C.t2, "start", 700)
        + Rc(X0, y + 4, BW, 16, C.a2, 8) + Rc(X0, y + 4, Math.max(BW * f.procesador_con_sondeo / mx, 3), 16, C.vino, 8) + T(X0, y + 42, n(f.procesador_con_sondeo), 17, C.tinta, "start", 400, true)
        + Rc(X0 + BW + 90, y + 4, BW, 16, C.a2, 8) + Rc(X0 + BW + 90, y + 4, Math.max(BW * f.disco / mx, 3), 16, C.verde, 8) + T(X0 + BW + 90, y + 42, n(f.disco), 17, C.tinta, "start", 400, true) + `</g>`;
    });
    const yN = 70 + filas.length * 62 + 8, sm = sc.mezcla_de_paga.find(q => q.id === "simulador").mezcla;
    parr(`Supuesto: la mezcla de tamaños de los restaurantes de paga es la del simulador (${n(100 * sm.mediano)} % medianos, ${n(100 * sm.grande)} % grandes, ${n(100 * sm.formal)} % formales). Con otra mezcla el disco da de ${n(lo)} a ${n(hi)} en el caso recomendado.`, 140).forEach((l, k) => { b += T(30, yN + k * 17, l, 12, C.t2, "start", 700); });
    $("#svSe").innerHTML = b;
  };

})();
