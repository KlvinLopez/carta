/* ===== capítulo 9: ¿Cómo gana dinero Carta? Casi sin texto: un mapa, el hueco frente a Meniu, las fuentes de ingreso por etapa,
   cómo operamos y el sueldo del fundador. Todo sale de `modeloDeNegocio`, `modelosDeIngreso`, `potencialChef`, `sueldo` y
   `tablaSueldos` del modelo; nada se inventa aquí. ===== */
const candado = (x, y, col = C.osc) => `<g transform="translate(${x - 8},${y - 9})"><path d="M3.5 8V5a4.5 4.5 0 0 1 9 0v3" fill="none" stroke="${col}" stroke-width="2.2"/><rect x="0" y="7" width="16" height="12" rx="3.5" fill="${col}"/></g>`;
const TRAMA = `<defs><pattern id="traza" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#fff"/><rect width="3" height="8" fill="rgba(184,134,11,.22)"/></pattern></defs>`;
const corto = (t, m) => { const s = String(t).split(/[:(]/)[0].trim(); return s.length > m ? s.slice(0, m - 1).trim() + "…" : s; };

NEG.plataformas_de_referencia.filter(q => q.verificada && q.url).forEach(q => { R["plat_" + q.plataforma] = {corta: `${q.plataforma} (consulta del ${q.consulta})`, año: 2026, titulo: q.cifra.split(":")[0].split(";")[0], url: q.url, publica: q.plataforma}; });
DET.modelo = {
  titulo: "¿Cómo gana dinero Carta?",
  fu: ["meniu", "carta_precio", "carta_anuncios", "carta_planes", "plat_Airbnb", "plat_YouTube", "plat_Meta", "plat_Uber"],
  nota: "Tamaño, no proyección: la suscripción es la v1; anuncios y visibilidad dependen de la Fase 3; comisión y pago del comensal están fuera de la v1.",
  monto: 0,
  montar(host) {
    host.innerHTML = `<div class="viz"><svg id="svG9a" viewBox="0 0 1100 440" role="img" aria-label="Dónde cae Carta entre los modelos de plataforma" font-family="DM Sans, sans-serif"></svg></div>
<div class="viz" style="margin-top:12px"><svg id="svG9b" viewBox="0 0 1100 470" role="img" aria-label="Carta frente a Meniu y el tamaño del hueco" font-family="DM Sans, sans-serif"></svg></div>
<div class="viz" style="margin-top:12px"><svg id="svG9c" viewBox="0 0 1100 416" role="img" aria-label="Fuentes de ingreso por etapa" font-family="DM Sans, sans-serif"></svg></div>
<div class="viz" style="margin-top:12px"><svg id="svG9f" viewBox="0 0 1100 392" role="img" aria-label="Ingreso por anuncios: genéricos frente a personalizados" font-family="DM Sans, sans-serif"></svg></div>
<div class="viz" style="margin-top:12px"><svg id="svG9g" viewBox="0 0 1100 330" role="img" aria-label="Visión de Calvin para una versión 2: cuatro pasos" font-family="DM Sans, sans-serif"></svg></div>
<div class="viz" style="margin-top:12px"><svg id="svG9d" style="min-height:0" viewBox="0 0 1100 124" role="img" aria-label="Cómo opera Carta con datos, dinero y usuarios" font-family="DM Sans, sans-serif"></svg></div>
<div class="r7p" id="sdP" style="margin-top:12px;display:block"><div class="r7row rdesl"><label for="sdM">Sueldo del fundador al mes</label><input type="range" id="sdM" min="0" max="100000" step="500" value="0"><output id="sdV">0 MXN</output></div><div class="r7ch" id="sdC"></div></div>
<div class="viz" style="margin-top:12px"><svg id="svG9e" viewBox="0 0 1100 560" role="img" aria-label="Cuántos restaurantes hacen falta para cubrir el sueldo" font-family="DM Sans, sans-serif"></svg></div>`;
    $("#sdM", host).addEventListener("input", ev => { this.monto = +ev.target.value; this.pintaSueldo(); });
    host.addEventListener("click", ev => { const b = ev.target.closest("[data-sd]"); if (b) { this.monto = +b.dataset.sd; this.pintaSueldo(); } });
  },
  actualizar() {
    const c = config(S), s = sup(S);
    const neg = conCache("neg9", () => MOD.modeloDeNegocio(c, s)), mod = conCache("mod9", () => MOD.modelosDeIngreso(c, s)), pot = conCache("pot9", () => MOD.potencialChef(c, s));
    this.neg = neg; this.mod = mod; this.pot = pot;
    $("#svG9a").innerHTML = conCache("g9a", () => this.mapa(neg));
    $("#svG9b").innerHTML = conCache("g9b", () => this.meniu(neg, pot));
    $("#svG9c").innerHTML = conCache("g9c", () => this.etapas(mod));
    const v2 = conCache("v29", () => MOD.visionV2(c, s));
    $("#svG9f").innerHTML = conCache("g9f", () => this.anuncios(v2.anuncios));
    $("#svG9g").innerHTML = conCache("g9g", () => this.vision(v2));
    $("#svG9d").innerHTML = conCache("g9d", () => this.opera());
    this.pintaSueldo();
    const hu = neg.hueco_frente_a_meniu.tamano_del_hueco;
    return {
      leyenda: `<span><i style="background:${C.vino}"></i>Carta hoy</span><span><i style="background:${C.dorado}"></i>lo que Carta cobraría después</span><span>candado: fuera de la v1</span>`,
      cifras: [[n(hu.caben_en_chef), "negocios caben en Chef: el hueco que Meniu no sirve, con su plan de 7 días de prueba", "supuesto del modelo"], [mxn(225) + " al mes", "Master Chef por cliente de paga; deja " + n(mod.modelos[0].potencial_pesos_por_restaurante_al_mes.deja_por_restaurante_de_paga) + " MXN tras costos", "propuesta"], [`${n(mod.modelos[1].potencial_pesos_por_restaurante_al_mes.por_restaurante_gratuito.baja, 1)} a ${n(mod.modelos[1].potencial_pesos_por_restaurante_al_mes.por_restaurante_gratuito.alta, 1)} MXN`, "al mes por gratuito en anuncios: tarifa sin dato", "supuesto"]],
      insight: `Hoy Carta es una herramienta con plan gratuito, anuncios y suscripción; no un mercado como Airbnb o Uber. El hueco frente a Meniu: ${n(hu.de_0_a_5_personas)} negocios de 0 a 5 personas, de los que caben en Chef ${n(hu.caben_en_chef)}.`,
    };
  },
  /* 1 · el mapa: dónde cae Carta entre los modelos de plataforma */
  mapa(neg) {
    const PX = 200, PY = 44, PW = 800, PH = 340, MX = PX + PW / 2, MY = PY + PH / 2;
    const cmp = neg.tipo_de_plataforma.comparacion, pasos = neg.tipo_de_plataforma.pasos_para_moverse;
    let b = TRAMA + Rc(PX, PY, PW / 2, PH / 2, "#fbf3e6", 0) + Rc(MX, PY, PW / 2, PH / 2, "#f6e9d4", 0) + Rc(PX, MY, PW / 2, PH / 2, "#fffaf2", 0) + Rc(MX, MY, PW / 2, PH / 2, "#fbf3e6", 0);
    b += `<line x1="${MX}" x2="${MX}" y1="${PY}" y2="${PY + PH}" stroke="${C.arena}" stroke-width="2"/><line x1="${PX}" x2="${PX + PW}" y1="${MY}" y2="${MY}" stroke="${C.arena}" stroke-width="2"/>`;
    b += T(PX + PW / 4, PY + PH + 44, "no hay transacción dentro", 13, C.t2, "middle", 700) + T(PX + 3 * PW / 4, PY + PH + 44, "hay transacción dentro", 13, C.t2, "middle", 700);
    b += T(PX - 14, PY + PH / 4 + 4, "conecta oferta", 13, C.t2, "end", 700) + T(PX - 14, PY + PH / 4 + 20, "y demanda nuevas", 13, C.t2, "end", 700) + T(PX - 14, PY + 3 * PH / 4 + 4, "no conecta:", 13, C.t2, "end", 700) + T(PX - 14, PY + 3 * PH / 4 + 20, "el comensal ya está sentado", 12, C.t2, "end", 700);
    const burb = (x, y, r, col, nom, sub, tip, lado = "der") => `<g data-tip="${esc2(tip)}" tabindex="0"><circle class="gh" cx="${x}" cy="${y}" r="${r}" fill="${col}"/></g>` + (lado === "der" ? T(x + r + 12, y - 2, nom, 14, C.tinta, "start", 700) + T(x + r + 12, y + 16, sub, 12, C.t2, "start") : T(x, y - r - 26, nom, 14, C.tinta, "middle", 700) + T(x, y - r - 9, sub, 12, C.t2, "middle"));
    b += burb(800, 118, 38, "#c9a9a6", "Comisión por transacción", "Airbnb · Uber · BlaBlaCar", "Comisión por transacción|Airbnb 15.5 % al anfitrión|Uber: la tarifa al conductor varía por viaje y la meta es cerca de 25 %.");
    b += burb(300, 118, 38, "#c9a9a6", "Economía de la atención", "Meta y redes sociales", "Economía de la atención|Meta: 97.6 % de anuncios|Del ingreso de Meta en 2025, según su informe anual (10-K).");
    // el modelo «gratis con anuncios más suscripción» es donde Carta ya está: Carta va dentro de su círculo
    b += `<g data-tip="${esc2("Gratis con anuncios más suscripción|YouTube: 55 % a creadores|Del ingreso neto de anuncios de la página de reproducción; Spotify, sin cifra verificada.")}" tabindex="0"><circle class="gh" cx="300" cy="302" r="58" fill="#d9cfc2"/></g>` + T(372, 272, "Gratis + anuncios + suscripción", 14, C.tinta, "start", 700) + T(372, 290, "Spotify · YouTube · Carta hoy", 12, C.t2, "start");
    const cx = 300, cy = 302, flecha = (x1, y1, x2, y2, tip) => { const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.osc}" stroke-width="2.4" stroke-dasharray="7 6"/><g data-tip="${esc2(tip)}" tabindex="0"><circle cx="${mx}" cy="${my}" r="17" fill="#fff" stroke="${C.osc}" stroke-width="2"/>${candado(mx, my + 1)}</g>`; };
    b += flecha(cx + 24, cy - 48, 772, 148, `Hacia marketplace con comisión|fuera de la v1|Directorio y pagos dentro de Carta: contradice «Qué NO construir».`);
    b += flecha(cx, cy - 58, 300, 158, `Hacia economía de la atención|fuera de la v1|Perfil y cuenta del comensal para segmentar anuncios: contradice la regla 10.`);
    b += flecha(cx + 36, cy + 14, 448, 330, `Hacia el comensal que paga|fuera de la v1|El comensal pagaría por quitar anuncios: exige cuenta, contra la regla 10.`);
    b += `<g data-tip="${esc2("El comensal paga|fuera de la v1|Como Spotify Premium: quitar anuncios exige cuenta del comensal, que la regla 10 no permite.")}" tabindex="0"><circle cx="490" cy="330" r="32" fill="url(#traza)" stroke="${C.osc}" stroke-width="2" stroke-dasharray="6 5"/></g>` + T(490, 382, "El comensal paga", 13, C.tinta, "middle", 700) + T(490, 398, "como Spotify Premium", 11.5, C.t2, "middle");
    b += `<g data-tip="${esc2(`Carta hoy|herramienta, no mercado|Plan gratuito, anuncios y suscripción del restaurante; sin transacción dentro ni oferta y demanda nuevas.`)}" tabindex="0"><circle cx="${cx}" cy="${cy}" r="34" fill="${C.vino}"/>` + T(cx, cy + 6, "Carta", 18, "#fff", "middle", 400, true) + `</g>`;
    return b;
  },
  /* 2 · Carta frente a Meniu y el tamaño del hueco */
  meniu(neg, pot) {
    const h = neg.hueco_frente_a_meniu, m = h.meniu, tabla = h.tabla, hu = h.tamano_del_hueco, X0 = 30, XM = 410, XC = 480, RH = 27, Y0 = 70;
    let b = T(X0, 28, "Función", 13, C.t2, "start", 700) + T(XM, 28, "Meniu", 13, C.t2, "middle", 700) + T(XC + 30, 28, "Carta", 13, C.t2, "middle", 700);
    const estado = c => /^v1|hoy/i.test(c) ? "hoy" : /^Fase 3/i.test(c) ? "fut" : /^No/i.test(c) ? "no" : "def";
    tabla.forEach((f, i) => {
      const y = Y0 + i * RH, st = estado(f.carta), col = st === "hoy" ? C.dorado : st === "fut" ? C.dorado : C.gris;
      b += `<g data-tip="${esc2(`${corto(f.funcion, 28)}|${f.meniu ? "Meniu sí" : "Meniu no"}|Carta: ${pal20(f.carta, 6)}. ${pal20(f.rescatar, 8)}`)}" tabindex="0">` + (i % 2 ? "" : Rc(20, y - 14, 520, RH - 2, "rgba(0,0,0,.035)", 10)) + T(X0, y + 4, corto(f.funcion, 44), 12.5, C.tinta, "start", 700) + (f.meniu ? `<circle cx="${XM}" cy="${y}" r="8.5" fill="${C.vino}"/>` : `<circle cx="${XM}" cy="${y}" r="8" fill="none" stroke="${C.gris}" stroke-width="1.8"/>`) + (st === "hoy" ? `<circle cx="${XC + 30}" cy="${y}" r="8.5" fill="${C.dorado}"/>` : st === "fut" ? `<circle cx="${XC + 30}" cy="${y}" r="8" fill="none" stroke="${C.dorado}" stroke-width="2.6"/>` : `<path d="M${XC + 24} ${y - 6}l12 12m0-12l-12 12" stroke="${C.gris}" stroke-width="2.2"/>`) + `</g>`;
    });
    b += T(X0, Y0 + tabla.length * RH + 16, "● lo tiene  ○ en Fase 3  ✕ no", 12, C.t2, "start", 700);
    // el hueco
    const bx = 600, bw = 440;
    b += T(bx, 28, "El hueco: negocios chicos sin plan gratuito", 14, C.vino, "start", 700);
    b += `<g data-tip="${esc2(`Meniu|${m.precio_mes} MXN al mes|Sólo da ${m.prueba_dias} días de prueba y no tiene plan gratuito (consulta del ${m.consulta}).`)}" tabindex="0">` + Rc(bx, 44, 210, 74, "#fff", 20, `stroke="${C.gris}" stroke-width="1.5"`) + T(bx + 105, 74, "Meniu", 17, C.tinta, "middle", 400, true) + T(bx + 105, 98, `${m.prueba_dias} días de prueba · ${m.precio_mes} MXN`, 12.5, C.t2, "middle", 700) + `</g>`;
    b += `<g data-tip="${esc2(`Carta|plan gratuito, Chef|Entra con 6 mesas y 1 cuenta; Master Chef cuesta 225 MXN al mes.`)}" tabindex="0">` + Rc(bx + 230, 44, 210, 74, C.vino, 20) + T(bx + 335, 74, "Carta", 17, "#fff", "middle", 400, true) + T(bx + 335, 98, "plan gratuito para negocios chicos", 12, "#fff", "middle", 700) + `</g>`;
    const tot = hu.clientes_potenciales, nivel = [["Clientes potenciales (SAM)", hu.clientes_potenciales, C.arena, C.tinta, "DENUE, mayo de 2026"], ["De 0 a 5 personas", hu.de_0_a_5_personas, C.dorado, C.tinta, "DENUE, mayo de 2026"], ["Caben en Chef (gratis)", hu.caben_en_chef, C.vino, "#fff", "supuesto del modelo de mesas y cuentas"]];
    nivel.forEach(([nom, v, col, tx, sub], i) => {
      const y = 160 + i * 84, w = Math.max(bw * v / tot, 190);
      b += `<g data-tip="${esc2(`${nom}|${n(v)} negocios|${sub}. ${n(100 * v / tot, 1)} % del total.`)}" data-tipp="${v / tot}" tabindex="0"><rect class="gh" style="animation-delay:${i * 130}ms" x="${bx}" y="${y}" width="${w}" height="58" rx="18" fill="${col}"/>` + T(bx + 18, y + 26, n(v), 24, tx, "start", 400, true) + T(bx + 18, y + 46, nom, 12, tx, "start", 700) + `</g>`;
    });
    b += T(bx, 426, `Chef cubre ${n(100 * hu.parte_que_cabe_en_chef, 1)} % de los de 0 a 5 personas (rango ${n(100 * hu.rango_parte_que_cabe[0], 1)}–${n(100 * hu.rango_parte_que_cabe[1], 1)} %).`, 12.5, C.t2, "start", 700);
    return b;
  },
  /* 3 · de dónde sale el dinero, por etapa */
  etapas(mod) {
    const M = Object.fromEntries(mod.modelos.map(q => [q.id, q])), XS = [30, 395, 760], W = 310;
    let b = TRAMA + `<line x1="30" x2="1070" y1="46" y2="46" stroke="${C.arena}" stroke-width="3"/>`;
    [["Piloto", "la v1"], ["Después de la Fase 3", "hacia el mes 9 (supuesto)"], ["Más adelante", "sólo con spec y ADR"]].forEach(([nom, sub], i) => { b += `<circle cx="${XS[i] + 10}" cy="46" r="9" fill="${i === 0 ? C.vino : i === 1 ? C.dorado : C.gris}"/>` + T(XS[i] + 28, 36, nom, 15, C.tinta, "start", 700) + T(XS[i] + 28, 66, sub, 12, C.t2, "start", 700); });
    const card = (i, y, h, m, grande, sub, rango, fuera, sinDato, col) => {
      const x = XS[i];
      return `<g data-tip="${esc2(`${m.nombre.replace(/ \(.*\)/, "")}|${grande}|${pal20(sub + (rango ? " · " + rango : ""), 11)}${sinDato ? " Tamaño, no proyección." : ""}`)}" tabindex="0">` + Rc(x, y, W, h, sinDato ? "url(#traza)" : "#fff", 22, `stroke="${col}" stroke-width="${sinDato ? 1.6 : 2.4}" ${sinDato ? 'stroke-dasharray="6 5"' : ""}`) + T(x + 18, y + 28, ({suscripcion_del_restaurante: "Suscripción de Master Chef", anuncios_del_comensal: "Anuncios al comensal gratuito", visibilidad_pagada: "Visibilidad pagada", comision_por_transaccion: "Comisión por transacción", pago_del_comensal: "Pago del comensal"})[m.id] || m.nombre, 13.5, C.tinta, "start", 700) + T(x + 18, y + 72, grande, 32, col, "start", 400, true) + T(x + 18, y + 94, sub, 11.5, C.t2, "start", 700) + (rango ? T(x + 18, y + 112, rango, 11.5, C.t2, "start") : "") + (fuera ? candado(x + W - 26, y + 26) : "") + (sinDato ? T(x + W - 16, y + h - 12, "tamaño, no proyección", 10.5, C.t2, "end", 700) : "") + `</g>`;
    };
    const s1 = M.suscripcion_del_restaurante.potencial_pesos_por_restaurante_al_mes, s2 = M.anuncios_del_comensal.potencial_pesos_por_restaurante_al_mes.por_restaurante_gratuito, s3 = M.visibilidad_pagada.potencial_pesos_por_restaurante_al_mes.por_restaurante_gratuito, s4 = M.comision_por_transaccion.potencial_pesos_por_restaurante_al_mes.de_0_a_10_personas, s5 = M.pago_del_comensal.potencial_pesos_por_restaurante_al_mes.por_restaurante;
    b += card(0, 90, 140, M.suscripcion_del_restaurante, mxn(s1.por_restaurante_de_paga), `deja ${n(s1.deja_por_restaurante_de_paga)} MXN por cliente de paga al mes`, `entre todos los registrados: ${n(s1.por_restaurante_registrado.centro, 1)} (${n(s1.por_restaurante_registrado.minimo, 1)}–${n(s1.por_restaurante_registrado.maximo)})`, false, false, C.vino);
    b += card(1, 90, 140, M.anuncios_del_comensal, `${n(s2.baja, 1)} – ${n(s2.alta, 1)} MXN`, "por restaurante gratuito al mes", `tarifa baja ${n(s2.baja, 1)} · media ${n(s2.media, 1)} · alta ${n(s2.alta, 1)}`, false, true, C.dorado);
    b += card(1, 244, 140, M.visibilidad_pagada, `${n(s3.centro, 1)} MXN`, "por restaurante gratuito al mes", `rango ${n(s3.minimo, 1)}–${n(s3.maximo)}`, false, true, C.dorado);
    b += card(2, 90, 140, M.comision_por_transaccion, `${n(s4.centro, 1)} MXN`, "por restaurante de 0 a 10 personas al mes", `rango ${n(s4.minimo, 1)}–${n(s4.maximo, 1)}`, true, true, C.t2);
    b += card(2, 244, 140, M.pago_del_comensal, `${n(s5.centro, 1)} MXN`, "por restaurante al mes", `rango ${n(s5.minimo, 1)}–${n(s5.maximo, 1)}`, true, true, C.t2);
    b += T(30, 404, "Sin trama: lo que hoy se puede cobrar. Con trama: sin dato, sólo se calcula su tamaño. Candado: fuera de la v1.", 12, C.t2, "start", 700);
    return b;
  },
  /* 3b · el ingreso principal: anuncios tipo AdSense, genéricos para el anónimo y personalizados para el registrado (v2) */
  anuncios(ad) {
    const W = 335;
    let b = T(30, 26, "Ingreso principal: anuncios tipo AdSense. Quien paga no ve anuncios (MXN por restaurante gratuito al mes)", 14, C.vino, "start", 700);
    [["baja", "Tarifa baja"], ["media", "Tarifa media"], ["alta", "Tarifa alta"]].forEach(([k, nom], i) => {
      const t = ad.por_tarifa[k], x = 30 + i * 365, mx = t.rango_v2[1], BW = W - 20, bw = v => Math.max(BW * v / mx, 4), d = t.pesos_por_gratuito_v2_con_registrados - t.pesos_por_gratuito_v1_todo_generico;
      b += `<g data-tip="${esc2(`${nom}|${n(t.tarifa_generica_por_mil, 1)} MXN por mil visitas|Genérico ${n(t.pesos_por_gratuito_v1_todo_generico, 1)} frente a ${n(t.pesos_por_gratuito_v2_con_registrados, 1)} en la v2. Tarifa sin dato.`)}" tabindex="0">` + Rc(x, 44, W, 34, i === 1 ? C.vino : "#8f5a66", 17) + T(x + W / 2, 66, `${nom} · ${n(t.tarifa_generica_por_mil, 1)} MXN por mil`, 14, "#fff", "middle", 700) + `</g>`;
      b += T(x + 8, 112, "Genérico: comensal anónimo (v1)", 12.5, C.t2, "start", 700) + Rc(x + 8, 120, BW, 26, C.a2, 13) + `<g class="gh">${Rc(x + 8, 120, bw(t.pesos_por_gratuito_v1_todo_generico), 26, C.dorado, 13)}</g>` + T(x + 8, 176, n(t.pesos_por_gratuito_v1_todo_generico, 1) + " MXN", 30, C.tinta, "start", 400, true);
      b += T(x + 8, 214, "Con registrados (v2)", 12.5, C.t2, "start", 700) + Rc(x + 8, 222, BW, 26, C.a2, 13) + `<g class="gh" style="animation-delay:120ms">${Rc(x + 8, 222, bw(t.pesos_por_gratuito_v2_con_registrados), 26, C.vino, 13)}</g>`;
      b += `<g data-tip="${esc2(`Rango de la v2, ${nom.toLowerCase()}|${n(t.rango_v2[0], 1)} a ${n(t.rango_v2[1], 1)} MXN|Depende del factor ×${n(ad.factor, 1)} y de la parte de registrados: dos supuestos sin dato.`)}" tabindex="0"><line x1="${x + 8 + bw(t.rango_v2[0])}" x2="${x + 8 + bw(t.rango_v2[1])}" y1="${235}" y2="${235}" stroke="${C.tinta}" stroke-width="3"/><line x1="${x + 8 + bw(t.rango_v2[0])}" x2="${x + 8 + bw(t.rango_v2[0])}" y1="227" y2="243" stroke="${C.tinta}" stroke-width="3"/><line x1="${x + 8 + bw(t.rango_v2[1])}" x2="${x + 8 + bw(t.rango_v2[1])}" y1="227" y2="243" stroke="${C.tinta}" stroke-width="3"/></g>`;
      b += T(x + 8, 292, n(t.pesos_por_gratuito_v2_con_registrados, 1) + " MXN", 30, C.vino, "start", 400, true) + T(x + 160, 290, `+${n(d, 1)} frente al genérico`, 13, C.verde, "start", 700) + T(x + 8, 316, `rango ${n(t.rango_v2[0], 1)} a ${n(t.rango_v2[1], 1)}`, 12, C.t2, "start", 700);
    });
    b += T(30, 358, `Factor ×${n(ad.factor, 1)} del anuncio personalizado (rango ${n(ad.rango_factor[0], 2)}–${n(ad.rango_factor[1], 1)}) y ${n(100 * ad.parte_registrados_v2)} % de comensales registrados (rango ${n(100 * ad.rango_parte[0])}–${n(100 * ad.rango_parte[1])} %): supuestos, sin dato.`, 12, C.t2, "start", 700);
    b += T(30, 378, "Genéricos al comensal anónimo: lo único posible con las reglas de hoy; entran con la Spec 002 «Planes», después del piloto (no es Fase 3).", 12, C.osc, "start", 700);
    return b;
  },
  /* 3c · la visión de Calvin para una versión 2: un camino de cuatro pasos, en el orden sugerido por el análisis */
  vision(v2) {
    const pasos = [
      ["Anuncios genéricos", "al comensal anónimo", "después del piloto (Spec 002)", false, "Paso 1: anuncios genéricos|con la Spec 002, después del piloto|Antes: ADR, política de seguridad y aviso de privacidad. Tarifa sin dato."],
      ["Cuenta voluntaria", "y anuncios personalizados", "fuera de la v1", true, "Paso 2: cuenta voluntaria|antes: regla 10 y consentimiento|Aviso de privacidad con finalidades separadas. Lo legal, por verificar con un abogado."],
      ["Plan pagado del comensal", "sin anuncios, como Spotify", "fuera de la v1", true, "Paso 3: plan pagado del comensal|antes: cuenta y cobro|Reutiliza la cuenta del paso 2; un pago pequeño recurrente: por verificar con un abogado."],
      ["Directorio, pagos", "y comisión", "fuera de la v1", true, "Paso 4: directorio, pagos y comisión|antes: ADR de pagos y spec|Lo que más cambia y lo más regulado. Por verificar con un abogado."],
    ];
    let b = T(30, 28, "Visión de Calvin para una versión 2: cuatro pasos, en este orden", 14, C.vino, "start", 700);
    const xs = [150, 410, 670, 930];
    b += `<line x1="${xs[0]}" x2="${xs[3]}" y1="110" y2="110" stroke="${C.arena}" stroke-width="4"/>`;
    pasos.forEach(([t1, t2, tag, fuera, tip], i) => {
      const x = xs[i];
      b += `<g data-tip="${esc2(tip)}" tabindex="0"><circle class="gh" style="animation-delay:${i * 130}ms" cx="${x}" cy="110" r="40" fill="${i === 0 ? C.vino : "#fff"}" stroke="${i === 0 ? C.vino : C.osc}" stroke-width="3" ${fuera ? 'stroke-dasharray="7 5"' : ""}/>` + T(x, 122, String(i + 1), 34, i === 0 ? "#fff" : C.osc, "middle", 400, true) + (fuera ? candado(x + 30, 82, C.osc) : "") + `</g>`;
      b += T(x, 180, t1, 15, C.tinta, "middle", 700) + T(x, 199, t2, 13.5, C.tinta, "middle", 700) + T(x, 226, tag, 12, fuera ? C.t2 : C.osc, "middle", 700);
      if (fuera) b += `<g data-tip="${esc2(`Marco legal|por verificar con un abogado|Se leyeron resúmenes de despachos, no el texto del DOF ni el reglamento.`)}" tabindex="0">` + Rc(x - 82, 238, 164, 24, "#fff", 12, `stroke="${C.rojo}" stroke-width="1.6"`) + T(x, 254, "por verificar con un abogado", 11, C.rojo, "middle", 700) + `</g>`;
      if (i < 3) b += `<path d="M${x + 52} 110 L${xs[i + 1] - 52} 110" stroke="${C.osc}" stroke-width="3" fill="none" marker-end="url(#fl)"/>`;
    });
    b += `<defs><marker id="fl" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0 0L9 4.5L0 9z" fill="${C.osc}"/></marker></defs>`;
    b += T(30, 304, "La versión 1 sigue sin cuentas ni pagos: sólo el paso 1 cabe con las reglas de hoy, y lo demás exige ADR y spec nuevos que apruebe Calvin.", 12.5, C.tinta, "start", 700);
    return b;
  },
  /* 4 · cómo operamos con datos, dinero y usuarios */
  opera() {
    const tarj = [
      ["Datos", ["sin datos personales", "ids opacos", "no se venden"], "Datos|sin datos personales|Los filtros de alérgenos viven en el teléfono; la analítica usa ids opacos y no se venden datos."],
      ["Dinero", ["la v1 no cobra pagos", "precio desde el servidor", "suscripción y anuncios"], "Dinero|la v1 no cobra|El precio nunca viene del cliente; entra suscripción y, después, anuncios."],
      ["Usuarios", ["comensal anónimo", "personal con PIN", "operador con cuenta"], "Usuarios|tres roles|Comensal anónimo con cookie de 6 horas, personal con PIN y operador con cuenta."],
    ];
    let b = "";
    tarj.forEach(([nom, kw, tip], i) => {
      const x = 30 + i * 355, w = 335;
      b += `<g data-tip="${esc2(tip)}" tabindex="0">` + Rc(x, 8, w, 108, "#fff", 22) + `<circle cx="${x + 38}" cy="62" r="24" fill="${[C.dorado, C.vino, C.osc][i]}"/>` + T(x + 38, 70, ["D", "M", "U"][i], 22, "#fff", "middle", 700, true) + T(x + 76, 38, nom, 20, C.vino, "start", 400, true) + kw.map((t, j) => T(x + 76, 62 + j * 20, "· " + t, 13, C.tinta, "start", 700)).join("") + `</g>`;
    });
    return b;
  },
  /* 5 · el sueldo del fundador: cuántos restaurantes hacen falta y en qué mes se cubre, en los tres escenarios a la vez */
  pintaSueldo() {
    const c = config(S), s = sup(S), monto = this.monto, tab = conCache("tabSueldo", () => MOD.tablaSueldos(c, s));
    const out = $("#sdV"); if (out) out.textContent = n(monto) + " MXN";
    const rg = $("#sdM"); if (rg && document.activeElement !== rg) rg.value = monto;
    $("#sdC").innerHTML = tab.map(t => `<button class="btn pchip" data-sd="${t.sueldo_mensual}" aria-pressed="${t.sueldo_mensual === monto}" data-tip="${esc2(`${t.veces_el_salario_minimo} ${t.veces_el_salario_minimo === 1 ? "salario mínimo" : "salarios mínimos"}|${n(t.sueldo_mensual)} MXN al mes|Referencia de 2026; no es una recomendación.`)}">${t.veces_el_salario_minimo} × salario mínimo · ${n(t.sueldo_mensual)}</button>`).join("");
    const sd = MOD.sueldo(c, s, monto), ES = [["recomendado", "Recomendado", C.vino], ["peor", "Peor", C.rojo], ["mejor", "Mejor", C.verde]];
    const ser = conCache("serie9", () => Object.fromEntries(ES.map(([k]) => [k, MOD.proyectarEscenario(k, c, s, 60).filas])));
    const MX = Math.max(60000, Math.ceil(Math.max(...ES.map(([k]) => Math.max(...ser[k].map(r => r.margen_despues_de_captacion)))) / 10000) * 10000), sl = v => Math.asinh(v / 4000), X0 = 70, W = 960, Y0 = 250, H = 230, X = t => X0 + W * (t - 1) / 59, Y = v => Y0 + H * (sl(MX) - sl(clamp(v, -15000, MX))) / (sl(MX) - sl(-15000));
    let b = "";
    ES.forEach(([k, nom, col], i) => {
      const e = sd.escenarios[k], x = 30 + i * 355, w = 335, ok = e.restaurantes_necesarios != null;
      b += `<g data-tip="${esc2(`${nom}|${ok ? n(e.restaurantes_necesarios) + " restaurantes" : "no se cubre"}|${ok ? `${n(e.clientes_de_paga_necesarios)} de paga; el margen después de captación lo cubre en el mes ${e.mes_en_que_el_margen_despues_de_captacion_lo_cubre}.` : "Con este escenario el margen nunca llega al sueldo."}`)}" tabindex="0">` + Rc(x, 8, w, 190, "#fff", 22, `stroke="${col}" stroke-width="2.4"`) + T(x + 18, 36, nom, 15, col, "start", 700) + (e.requiere_otra_arquitectura ? candado(x + w - 28, 28, C.osc) : "") + T(x + 18, 96, monto <= 0 ? n(e.margen_despues_de_sueldo.con_1000_restaurantes) : ok ? n(e.restaurantes_necesarios) : "—", monto <= 0 ? 40 : 52, col, "start", 400, true) + T(x + 18, 120, monto <= 0 ? "MXN al mes con 1,000 restaurantes" : "restaurantes hacen falta", 13, C.t2, "start", 700) + T(x + 18, 150, monto <= 0 ? "después de captación; elige un sueldo" : ok ? `${n(e.clientes_de_paga_necesarios)} ${Math.round(e.clientes_de_paga_necesarios) === 1 ? "cliente" : "clientes"} de paga · mes ${e.mes_en_que_el_margen_despues_de_captacion_lo_cubre}` : "no se cubre en 60 meses", 13.5, C.tinta, "start", 700) + T(x + 18, 176, e.requiere_otra_arquitectura ? "pide otra arquitectura del servidor" : monto > 0 ? "cabe en la arquitectura actual" : "el sueldo arranca en 0: no propongo una cifra", 12, e.requiere_otra_arquitectura ? C.osc : C.t2, "start", 700) + `</g>`;
    });
    [-10000, 0, 10000, 50000, 100000, 200000, MX].filter((v, i, a) => v <= MX && a.indexOf(v) === i).forEach(v => { b += `<line x1="${X0}" x2="${X0 + W}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v === 0 ? C.t2 : C.arena}"/>` + T(X0 - 8, Y(v) + 4, (v < 0 ? "−" : "") + n(Math.abs(v)), 11, C.t2, "end"); });
    [1, 12, 24, 36, 48, 60].forEach(t => { b += T(X(t), Y0 + H + 22, "mes " + t, 11.5, C.t2, "middle"); });
    b += T(X0, Y0 - 16, "Lo que deja cada mes después de captación (MXN), mes a mes", 13, C.vino, "start", 700);
    ES.forEach(([k, nom, col]) => { const f = ser[k]; b += `<polyline points="${f.map(r => `${X(r.mes).toFixed(1)},${Y(r.margen_despues_de_captacion).toFixed(1)}`).join(" ")}" fill="none" stroke="${col}" stroke-width="3.4" stroke-linejoin="round"/>`; });
    if (monto <= 0) { const m1 = tab[0].sueldo_mensual; b += `<line x1="${X0}" x2="${X0 + W}" y1="${Y(m1)}" y2="${Y(m1)}" stroke="${C.tinta}" stroke-width="1.4" stroke-dasharray="3 6" opacity=".45"/>` + T(X0 + W, Y(m1) - 8, `referencia: 1 salario mínimo, ${n(m1)} MXN`, 12, C.t2, "end", 700); }
    if (monto > 0) {
      b += `<line x1="${X0}" x2="${X0 + W}" y1="${Y(monto)}" y2="${Y(monto)}" stroke="${C.tinta}" stroke-width="1.8" stroke-dasharray="6 5"/>` + T(X0 + W, Y(monto) - 8, `tu sueldo: ${n(monto)} MXN`, 12, C.tinta, "end", 700);
      ES.forEach(([k, nom, col]) => { const m = sd.escenarios[k].mes_en_que_el_margen_despues_de_captacion_lo_cubre; if (m == null || m > 60) return; const f = ser[k][m - 1]; b += `<g data-tip="${esc2(`${nom}: aquí se cubre tu sueldo|mes ${m}|El margen después de captación llega a ${n(monto)} MXN con ${n(f.restaurantes)} restaurantes.`)}" tabindex="0"><circle cx="${X(m)}" cy="${Y(f.margen_despues_de_captacion)}" r="9" fill="#fff" stroke="${col}" stroke-width="3.4"/></g>`; });
      b += T(X0 + 6, Y0 + H + 46, "○ aquí se cubre tu sueldo", 12, C.tinta, "start", 700);
    }
    b += T(X0, Y0 + H + 52, "", 11, C.t2);
    b += T(30, 548, "No está modelado: " + sd.no_modelado.join(", ") + ".", 12, C.t2, "start", 700);
    $("#svG9e").innerHTML = b;
  },
};
