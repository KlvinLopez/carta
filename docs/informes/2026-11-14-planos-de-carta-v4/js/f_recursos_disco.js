/* ===== capítulo 7, segunda parte: quién llena el disco, la historia de una mesa de 3 comensales registrándose, las formas de guardar la
   analítica lado a lado y la combinación que importa. Todo sale de `recursos().composicion_del_disco`, `historiaDelDisco` y `recursos` con
   palancas; la forma de guardar la analítica es UNA elección (grupos_excluyentes del análisis). Nada se reinicia al tocar otro control. ===== */
(function () {
  const D7 = DET.recursos7, montaBase = D7.montar, actBase = D7.actualizar;
  const NOM_T = {sesion_grupal: "sesión", miembro_sesion: "miembros", orden_personal: "órdenes", item_orden: "platillos", comanda: "comanda", comanda_orden: "enlace", llamada_mesero: "llamada", evento_analitica: "eventos del teléfono"};
  const FORMA = () => conCache("palTab", () => MOD.palancasEnTablero(config(S), sup(S))).grupos_excluyentes.forma_de_guardar_la_analitica.miembros;
  const sinForma = ps => ps.filter(x => !FORMA().includes(x));
  const CORTO_OP = {hoy: "Hoy", contar_por_dia: "Contar por día", fila_por_visita: "Fila por visita", fila_mas_platillo: "Fila más platillo", adelgazar: "Adelgazar la tabla", archivar: "Archivar sesiones"};
  D7.hp = 0;

  D7.montar = function (host, sec) {
    montaBase.call(this, host, sec);
    host.insertAdjacentHTML("beforeend", `<div class="r7x">
<div class="viz"><svg id="svDc" viewBox="0 0 1100 300" role="img" aria-label="Quién llena el disco" font-family="DM Sans, sans-serif"></svg></div>
<div class="r7p r7bar"><span class="selr">Un ejemplo guiado: una mesa de 3 comensales</span><button class="btn" id="hiAt" aria-label="Paso anterior">◀</button><button class="btn" id="hiSig">Siguiente ▶</button><button class="btn" id="hiPl">▶ Reproducir</button><span class="selr" id="hiN"></span></div>
<div class="viz"><svg id="svHi" viewBox="0 0 1100 500" role="img" aria-label="Cómo se acumulan las filas de una mesa de tres comensales" font-family="DM Sans, sans-serif"></svg></div>
<div class="viz"><svg id="svOp" viewBox="0 0 1100 600" role="img" aria-label="Las formas de guardar la analítica, lado a lado" font-family="DM Sans, sans-serif"></svg></div>
<div class="viz"><svg id="svCo" viewBox="0 0 1100 360" role="img" aria-label="La combinación de forma, archivo e historial" font-family="DM Sans, sans-serif"></svg></div></div>`);
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
      } else if (t.dataset && t.dataset.op) this.eligeOpcion(t.dataset.op);
    });
    host.addEventListener("keydown", ev => { if ((ev.key === "Enter" || ev.key === " ") && ev.target.dataset && ev.target.dataset.op) { ev.preventDefault(); this.eligeOpcion(ev.target.dataset.op); } });
  };
  D7.paraJuego = function () { if (this.juego) { clearInterval(this.juego); this.juego = null; } };
  D7.actualizar = function () { const o = actBase.call(this); if (this.r && $("#svDc")) this.pintaExtra(); return o; };
  D7.pintaExtra = function () { this.pintaComposicion(); this.pintaHistoria(); this.pintaOpciones(); this.pintaCombo(); };

  /* una opción de las formas de guardar: reemplaza la forma elegida (nunca se suman) */
  D7.eligeOpcion = function (id) {
    const h = conCache("hist7", () => MOD.historiaDelDisco(config(S), sup(S))), o = h.opciones.find(q => q.id === id); if (!o) return;
    const ps = S.palancas || [];
    if (id === "archivar") { const a = "archivar_sesiones_cerradas"; cambiar({palancas: ps.includes(a) ? ps.filter(x => x !== a) : [...ps, a]}); return; }
    cambiar({palancas: [...sinForma(ps), ...o.palancas]});
  };

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

  /* 3 · las formas de guardar la analítica, lado a lado, como una sola elección */
  D7.pintaOpciones = function () {
    const h = conCache("hist7", () => MOD.historiaDelDisco(config(S), sup(S))), ops = h.opciones, ps = S.palancas || [], enF = ps.filter(x => FORMA().includes(x));
    const mxB = Math.max(...ops.map(o => o.bytes_analitica_por_mesa_de_3)), mxC = Math.max(...ops.flatMap(o => [o.restaurantes_que_caben_sin_purga, o.restaurantes_que_caben_con_historial_30_dias]));
    const hoyB = ops[0].bytes_analitica_por_mesa_de_3, W = 140, G = 6.5;
    let b = T(30, 26, "La misma mesa de 3 guardada de siete maneras (una sola forma de guardar la analítica; archivar y comprar disco se suman)", 14, C.vino, "start", 700);
    const todas = [...ops, {id: "comprar", nombre: "Comprar disco"}];
    todas.forEach((o, i) => {
      const x = 20 + i * (W + G), esForma = o.palancas && (o.id !== "archivar"), sel = o.id === "archivar" ? ps.includes("archivar_sesiones_cerradas") : o.id === "comprar" ? false : (o.id === "hoy" ? enF.length === 0 : enF.length === o.palancas.length && o.palancas.every(p => enF.includes(p))), calvin = o.id === "fila_por_visita";
      const nom = o.nombre.replace(/ \(propuesta de Calvin\)/, ""), lin = parr(nom, 17);
      b += `<g ${o.id !== "comprar" ? `data-op="${o.id}" role="button" tabindex="0" style="cursor:pointer" aria-pressed="${sel}"` : ""} data-tip="${esc2(o.id === "comprar" ? "Comprar disco|sube el costo del escalón|No cambia lo que se guarda: es la opción que no ahorra bytes." : `${CORTO_OP[o.id] || nom}|caben ${n(o.restaurantes_que_caben_sin_purga)} y ${n(o.restaurantes_que_caben_con_historial_30_dias)}|Queda: ${pal20(o.que_queda, 6)} Se pierde: ${pal20(o.se_pierde, 5)}`)}">` + Rc(x, 40, W, 540, sel ? "#f6e9d4" : "#fff", 20, `stroke="${sel ? C.vino : calvin ? C.dorado : C.arena}" stroke-width="${sel ? 3.4 : calvin ? 3 : 1.5}" ${calvin && !sel ? 'stroke-dasharray="7 5"' : ""}`);
      lin.slice(0, 3).forEach((l, j) => { b += T(x + 12, 68 + j * 17, l, 12.5, C.tinta, "start", 700); });
      if (calvin) b += Rc(x + 12, 118, 116, 20, C.dorado, 10) + T(x + 70, 132, "idea de Calvin", 12, "#fff", "middle", 700);
      if (o.id === "comprar") { b += T(x + 12, 170, "no cambia lo", 12.5, C.t2, "start", 700) + T(x + 12, 187, "guardado: sube el", 12.5, C.t2, "start", 700) + T(x + 12, 204, "costo del escalón", 12.5, C.t2, "start", 700) + T(x + 12, 224, "(ver la escalera)", 12.5, C.t2, "start") + `</g>`; return; }
      b += T(x + 12, 168, "analítica de la mesa", 12, C.t2, "start", 700) + Rc(x + 12, 176, W - 24, 12, C.a2, 6) + Rc(x + 12, 176, Math.max((W - 24) * o.bytes_analitica_por_mesa_de_3 / mxB, 3), 12, calvin ? C.dorado : C.vino, 6) + T(x + 12, 216, `${n(o.bytes_analitica_por_mesa_de_3)} B`, 21, C.vino, "start", 400, true) + (o.id === "hoy" ? T(x + 12, 234, "una fila por toque", 12, C.t2, "start", 700) : o.bytes_analitica_por_mesa_de_3 === hoyB ? T(x + 12, 234, "mismos bytes que hoy", 12, C.t2, "start", 700) : T(x + 12, 234, `${n(100 * (1 - o.bytes_analitica_por_mesa_de_3 / hoyB))} % menos que hoy`, 12, C.verde, "start", 700));
      b += T(x + 12, 270, "caben, sin purga", 12, C.t2, "start", 700) + Rc(x + 12, 278, W - 24, 12, C.a2, 6) + Rc(x + 12, 278, Math.max((W - 24) * o.restaurantes_que_caben_sin_purga / mxC, 3), 12, C.dorado, 6) + T(x + 12, 318, n(o.restaurantes_que_caben_sin_purga), 26, C.tinta, "start", 400, true);
      b += T(x + 12, 350, "caben, con 30 días", 12, C.t2, "start", 700) + Rc(x + 12, 358, W - 24, 12, C.a2, 6) + Rc(x + 12, 358, Math.max((W - 24) * o.restaurantes_que_caben_con_historial_30_dias / mxC, 3), 12, C.verde, 6) + T(x + 12, 398, n(o.restaurantes_que_caben_con_historial_30_dias), 26, C.tinta, "start", 400, true);
      b += T(x + 12, 432, "se pierde:", 12, C.rojo, "start", 700); parr(o.se_pierde, 19).slice(0, 4).forEach((l, j) => { b += T(x + 12, 448 + j * 15, l, 12, C.tinta, "start"); });
      b += T(x + 12, 530, sel ? "✓ elegida" : o.id === "archivar" ? "toca para sumar" : "toca para elegir", 12, sel ? C.vino : C.t2, "start", 700) + `</g>`;
    });
    // la propuesta de Calvin, medida
    const f = ops.find(o => o.id === "fila_por_visita"), porVisita = f.bytes_analitica_por_mesa_de_3 / h.comensales;
    $("#svOp").innerHTML = b + T(20, 596, `La propuesta de Calvin, medida: ${n(porVisita)} bytes por visita de comensal, ${n(100 * (1 - f.bytes_analitica_por_mesa_de_3 / hoyB))} % menos que hoy y sin huella de red. Se pierde qué platillo se vio; conviene un solo envío al terminar.`, 12, C.osc, "start", 700);
  };

  /* 4 · la combinación que importa: forma + archivar + historial del gratuito */
  D7.pintaCombo = function () {
    const c = config(S), s = sup(S), ps = S.palancas || [], FILA = "fila_por_visita_de_comensal", ARCH = "archivar_sesiones_cerradas";
    const cm = conCache("combo7", () => { const o = {}; [1, 12].forEach(m => [[], [FILA], [ARCH], [ARCH, FILA]].forEach(pl => { o[m + "|" + pl.length + pl.join()] = MOD.recursos({...c, palancas: pl}, s, {canal: "eventos", meses_historial: m}).escalera[0].restaurantes_que_caben; })); return o; });
    const val = (m, pl) => cm[m + "|" + pl.length + pl.join()];
    const cols = [["Hoy: una fila por toque", []], ["Fila por visita", [FILA]], ["Archivar sesiones", [ARCH]], ["Archivar + fila por visita", [ARCH, FILA]]], filas = [["Historial del gratuito a 30 días (propuesta)", 1], ["Sin purga del gratuito (12 meses)", 12]];
    const mx = Math.max(...filas.flatMap(([, m]) => cols.map(([, pl]) => val(m, pl)))), X0 = 330, CW = 180, BW = 160;
    const selM = this.his === "30d" ? 1 : 12, selC = (ps.includes(ARCH) ? 2 : 0) + (ps.includes(FILA) ? 1 : 0);
    let b = T(30, 26, "La combinación que importa: forma de guardar + archivar + historial del gratuito (restaurantes que caben)", 14, C.vino, "start", 700);
    cols.forEach(([nom], j) => { b += T(X0 + j * CW + BW / 2, 62, nom, 12.5, C.tinta, "middle", 700); });
    filas.forEach(([nom, m], i) => {
      const y = 90 + i * 108; b += T(30, y + 46, nom, 13, C.tinta, "start", 700);
      cols.forEach(([cn, pl], j) => {
        const v = val(m, pl), on = selM === m && selC === j, base = val(m, []);
        b += `<g data-tip="${esc2(`${cn}|${n(v)} restaurantes|${m === 1 ? "Con 30 días de historial del gratuito." : "Sin purga del gratuito: 12 meses."}${j ? ` ${n(v - base)} más que sin cambios.` : ""}`)}" data-tipp="${v / mx}" tabindex="0">` + Rc(X0 + j * CW - 6, y - 6, BW + 12, 92, on ? "#f6e9d4" : "rgba(0,0,0,0)", 16, on ? `stroke="${C.vino}" stroke-width="3"` : "") + Rc(X0 + j * CW, y + 4, BW, 18, C.a2, 9) + Rc(X0 + j * CW, y + 4, Math.max(BW * v / mx, 4), 18, i ? C.dorado : C.verde, 9) + T(X0 + j * CW, y + 62, n(v), 30, C.tinta, "start", 400, true) + (j ? T(X0 + j * CW + 90, y + 60, `+${n(v - base)}`, 13, C.verde, "start", 700) : "") + `</g>`;
      });
    });
    const mejor = val(12, [ARCH, FILA]), hoy30 = val(1, []);
    b += T(30, 318, mejor > hoy30 ? `Archivar más la fila por visita, sin recortar el historial del gratuito (${n(mejor)}), ya da más que hoy con el recorte a 30 días (${n(hoy30)}).` : `Con las cifras de ahora, archivar más la fila (${n(mejor)}) no supera el recorte a 30 días (${n(hoy30)}).`, 14, C.vino, "start", 700);
    b += T(30, 342, "Cualquiera de estas palancas cambia qué se guarda y por cuánto tiempo: antes de construirse pasa por especificación y por actualizar 03 §7 (y un ADR si toca la regla de no borrar historial).", 11.5, C.t2, "start", 700);
    $("#svCo").innerHTML = b;
  };
})();
