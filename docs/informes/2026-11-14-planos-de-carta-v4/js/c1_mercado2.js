/* ===== capítulo 1: ¿Cuántos negocios hay en México? Círculos anidados (DENUE, mayo de 2026) ===== */
const CLASE_NOM = {
  "722511": ["A la carta y comida corrida", "núcleo"], "722412": ["Bares y cantinas", "núcleo"], "722411": ["Centros nocturnos", "núcleo"],
  "722512": ["Pescados y mariscos", "fuera"], "722513": ["Antojitos", "fuera"], "722514": ["Tacos y tortas", "fuera"], "722515": ["Cafeterías y neverías", "fuera"],
  "722516": ["Autoservicio", "fuera"], "722517": ["Pizzas y pollos para llevar", "fuera"], "722518": ["Otros para llevar", "fuera"], "722519": ["Otros alimentos", "fuera"],
};
/* empaqueta círculos de área proporcional dentro de un círculo grande: relajación (cada uno aparta a sus vecinos y todos se atraen al centro); determinista y sin descartar ninguno */
function empaqueta(items, R, dens = 0.5) {
  const tot = items.reduce((a, x) => a + x.n, 0), k = Math.sqrt(dens * R * R / tot), GAP = 4;
  const cs = items.map(x => ({...x, r: Math.max(k * Math.sqrt(x.n), 5)})).sort((a, b) => b.r - a.r);
  cs.forEach((c, i) => { const a = i * 2.399963, rad = R * 0.55 * Math.sqrt((i + 0.5) / cs.length); c.x = rad * Math.cos(a); c.y = rad * Math.sin(a); c.per = c.r <= 24; if (c.per) { const ang = -0.5 + 0.4 * (cs.filter((q, j) => j < i && q.r <= 24).length); c.x = (R - c.r - 2) * Math.cos(ang); c.y = (R - c.r - 2) * Math.sin(ang); } });
  for (let it = 0; it < 900; it++) {
    const f = 1 - it / 900;
    cs.forEach(c => { if (!c.per) { c.x *= 0.995; c.y *= 0.995; } });
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
      const A = cs[i], B = cs[j]; let dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 0.001; const need = A.r + B.r + GAP;
      if (d < need) { const m = (need - d) / 2 * 0.6, ux = dx / d, uy = dy / d; A.x -= ux * m; A.y -= uy * m; B.x += ux * m; B.y += uy * m; }
    }
    cs.forEach(c => { const d = Math.hypot(c.x, c.y) || 1, lim = R - c.r - 2; if (c.per) { c.x *= lim / d; c.y *= lim / d; } else if (d > lim) { c.x *= lim / d; c.y *= lim / d; } });
  }
  return cs;
}
DET.mercado2 = {
  titulo: "Hay 773,860 restaurantes y bares; 104,882 son clientes potenciales.",
  fu: ["inegi_denue", "carta_mercado"],
  nota: "INEGI, DENUE de mayo de 2026, ramas 7224 y 7225 (SCIAN). Clientes potenciales (SAM): a la carta y comida corrida, bares y centros nocturnos. Sin sus posibles cadenas son ≈ 100,000 (96,021 a 104,855 según el umbral). Meta a 12 meses (SOM): 300 restaurantes, un escenario del modelo, no un dato.",
  montar(host) {
    host.innerHTML = `<div class="viz"><svg id="svM2" viewBox="0 0 1400 620" preserveAspectRatio="xMinYMid meet" role="img" font-family="DM Sans, sans-serif"></svg></div>`;
    this.sv = $("#svM2", host); this.sel = null;
    this.sv.addEventListener("mouseover", ev => { const t = ev.target.closest("[data-cl]"); const k = t ? t.dataset.cl : null; if (k !== this.sel) { this.sel = k; this.pinta(); } });
    this.sv.addEventListener("click", ev => { const t = ev.target.closest("[data-cl]"); this.sel = t ? t.dataset.cl : null; this.pinta(); });
  },
  actualizar() { this.pinta(); const sam = CLASES_D.filter(c => CLASE_NOM[c.clave] && CLASE_NOM[c.clave][1] === "núcleo").reduce((a, c) => a + c.n, 0);
    return {
      leyenda: `<span><i style="background:${C.vino}"></i>clientes potenciales (SAM)</span><span><i style="background:${C.arena}"></i>fuera de lo que Carta atiende hoy</span><span><i style="background:${C.dorado}"></i>meta a 12 meses (SOM)</span>`,
      cifras: [[n(M.total), "restaurantes y bares de México (TAM)"], [n(sam), "clientes potenciales (SAM): a la carta, bares y centros nocturnos"], ["≈ " + n(M.servible), "sin sus posibles cadenas"], ["300", "meta a 12 meses (SOM): escenario del modelo", "supuesto"]],
      insight: `De ${n(M.total)} restaurantes y bares, ${n(sam)} son clientes potenciales; la meta del primer año es 300.`,
    };
  },
  pinta() {
    const gpc = this.ya ? "" : 'class="gp"'; this.ya = true;
    const sv = this.sv, R = 292, CX = 312, CY = 326, sel = this.sel;
    const items = CLASES_D.map(c => ({clave: c.clave, n: c.n, nom: (CLASE_NOM[c.clave] || [c.clave, "fuera"])[0], tipo: (CLASE_NOM[c.clave] || [0, "fuera"])[1]}));
    const pk = empaqueta(items, R - 6, 0.58);
    let b = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="${C.a2}"/>` + T(CX, CY - R - 14, `Restaurantes y bares de México · ${n(M.total)}`, 15, C.vino, "middle", 700);
    pk.forEach((c, i) => {
      const nuc = c.tipo === "núcleo", on = sel === c.clave, x = CX + c.x, y = CY + c.y;
      b += `<g data-cl="${c.clave}" style="cursor:pointer" tabindex="0" role="button" aria-label="${esc(c.nom)}: ${n(c.n)}" data-tip="${esc2(c.nom + "|" + n(c.n) + " negocios|" + n(100 * c.n / M.total, 1) + " % del total; " + (nuc ? "Carta los atiende hoy." : "quedan fuera de lo que Carta atiende hoy."))}" data-tipp="${clamp(c.n / M.total, 0, 1)}"><g ${gpc} style="animation-delay:${i * 90}ms"><circle cx="${x}" cy="${y}" r="${c.r}" fill="${nuc ? C.vino : C.arena}" opacity="${sel && !on ? 0.5 : 1}" ${on ? `stroke="${C.dorado}" stroke-width="4"` : ""}/>`;
      if (c.r > 26) { const sz = c.r > 70 ? 14 : 11.5, mc = Math.max(6, Math.floor(c.r * 1.7 / (sz * 0.55))), ls = []; let cur = ""; c.nom.split(" ").forEach(w => { if ((cur + " " + w).trim().length > mc && cur) { ls.push(cur); cur = w; } else cur = (cur + " " + w).trim(); }); ls.push(cur);
        const y0 = y - (ls.length * sz * 1.15) / 2 + sz * 0.85; ls.forEach((l, j) => { b += T(x, y0 + j * sz * 1.15, l, sz, nuc ? "#fff" : C.tinta, "middle", 700); }); b += T(x, y0 + ls.length * sz * 1.15 + 2, n(c.n), c.r > 70 ? 16 : 12.5, nuc ? "#f3d58a" : C.t2, "middle", 700); }
      b += `</g></g>`;
    });
    // pequeños: etiquetas fuera con línea guía
    let ly = 70; pk.filter(c => c.r <= 26).sort((a, z) => a.y - z.y).forEach(c => {
      const x = CX + c.x, y = CY + c.y, nuc = c.tipo === "núcleo";
      b += `<line x1="${x}" y1="${y}" x2="${CX + R + 18}" y2="${ly}" stroke="${nuc ? C.vino : C.gris}" stroke-width="1.5"/>` + T(CX + R + 26, ly + 4, `${c.nom} · ${n(c.n)}`, 12.5, nuc ? C.vino : C.t2, "start", 700);
      ly += 24;
    });
    // el panel de la derecha: lo que se ve de lo elegido, o el resumen
    const px = 900, so = 900, el = sel ? items.find(c => c.clave === sel) : null;
    b += Rc(px, 330, 440, 250, "#fff", 24) ;
    if (el) { b += T(px + 22, 372, el.nom, 20, C.vino, "start", 400, true) + T(px + 22, 428, n(el.n), 48, el.tipo === "núcleo" ? C.vino : C.t2, "start", 400, true) + T(px + 22, 452, `${n(100 * el.n / M.total, 1)} % del total`, 14, C.t2) + T(px + 22, 492, el.tipo === "núcleo" ? "Cliente potencial (SAM)" : "Fuera de lo que Carta atiende hoy", 13.5, el.tipo === "núcleo" ? C.vino : C.t2, "start", 700); }
    else { b += T(px + 22, 372, "Toca un círculo", 20, C.vino, "start", 400, true) + T(px + 22, 428, n(M.nucleo), 48, C.vino, "start", 400, true) + T(px + 22, 452, "clientes potenciales (SAM)", 14, C.t2) + T(px + 22, 492, `= ${n(100 * M.nucleo / M.total, 1)} % del total`, 13.5, C.vino, "start", 700); }
    // la meta a 12 meses: 300 puntos dorados en un grid chico
    b += T(so, 60, "Meta a 12 meses (SOM)", 16, C.dorado, "start", 700) + T(so, 112, "300", 44, C.dorado, "start", 400, true) + T(so + 100, 106, "restaurantes: un escenario", 13.5, C.t2);
    for (let i = 0; i < 100; i++) b += `<circle ${gpc} style="animation-delay:${800 + i * 10}ms" cx="${so + 8 + (i % 20) * 12.4}" cy="${150 + Math.floor(i / 20) * 14}" r="4.4" fill="${C.dorado}"/>`;
    b += T(so, 232, "cada punto = 3 restaurantes", 12, C.t2);
    sv.innerHTML = b;
  },
};
