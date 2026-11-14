/* ===== presentación de producto: el lenguaje del film de lanzamiento (marketing/video/), con la línea de tiempo en GSAP (≈ 28 s) =====
   Pantallas reales de la app y del prototipo (apoyo/*.webp), un objeto por toma, rótulos serif con la palabra clave en cursiva dorada.
   Fuera de la v1 y por eso ausentes: vista 3D/AR y pago. */
const DURS = [4200, 4200, 4000, 4400, 4000, 4200, 3600], NESC = DURS.length, TOTI = DURS.reduce((a, b) => a + b, 0);
const INI = DURS.map((_, i) => DURS.slice(0, i).reduce((a, b) => a + b, 0));
const FILM_IMG = {fondo: "apoyo/fondo-mesa.webp", scan: "apoyo/bienvenida.webp", enc: "apoyo/detalle-platillo.webp", menu: "apoyo/menu-inicio.webp", grupo: "apoyo/grupo.webp", mesa: "apoyo/mesa-detalle.webp"};
let tI = 0, pausaI = false, rafI = 0, ultI = 0, ocultoT = 0, tlF = null;

/* las cinco tomas con número: [número, título, líneas (la cursiva va entre *), subtítulo, marca] */
const FILM_TOMAS = [
  ["01", "ESCANEA", ["Apunta al QR de", "*tu mesa*."], "Sin descarga. Sin registro. Inmediato.", "hoy"],
  ["02", "MIRA", ["La carta,", "*con fotos*."], "Los filtros de alérgenos viven sólo en tu teléfono.", "hoy"],
  ["03", "COMPARTE", ["Toda la mesa,", "*en sintonía*."], "4 teléfonos, 1 orden.", "fase3"],
  ["04", "AVISA", ["La comanda llega", "*al mesero*."], "Cada quien confirma la suya; la mesa la manda junta.", "fase3"],
  ["05", "ATIENDE", ["El personal", "*lleva la mesa*."], "", "fase3"],
];
const filmPalabras = l => l.split(/(\*[^*]+\*)/).filter(Boolean).map(tr => { const em = tr.startsWith("*"), tx = em ? tr.slice(1, -1) : tr; return (/^ /.test(tx) ? " " : "") + tx.split(" ").filter(Boolean).map(p => `<span class="w">${em ? "<em>" + esc(p) + "</em>" : esc(p)}</span>`).join(" ") + (/ $/.test(tx) ? " " : ""); }).join("");
const filmHtml = () => `<div id="film"><div class="fbg"><img class="ffoto" src="${FILM_IMG.fondo}" alt=""><i class="fg1"></i><i class="fg2"></i><i class="fvig"></i></div>
<div class="ft ft0"><div class="fhook">${filmPalabras("Todo empieza en *la mesa*.")}</div><div class="fmarca"><b>Carta</b><i></i><span>El menú que la mesa arma junta</span></div></div>
${FILM_TOMAS.map((t, i) => `<div class="ft ft${i + 1}"><div class="fkick"><span class="n">${t[0]}</span><i class="rl"></i><span class="lb">${t[1]}</span><span class="tg ${t[4]}">${t[4] === "hoy" ? "hoy en producción" : "Fase 3 · prototipo"}</span></div><h3 class="fh">${t[2].map(l => `<span class="ln">${filmPalabras(l)}</span>`).join("")}</h3>${t[3] ? `<p class="fsub">${esc(t[3])}</p>` : ""}${i === 4 ? `<div class="frail">${["Abierta", "Cuenta cerrada", "Pagada", "Mesa limpia"].map((e, k) => `<div class="fpaso"><span class="pt">${k + 1}</span><span>${e}</span></div>`).join("")}</div>` : ""}</div>`).join("")}
<div id="fcam"><div class="fphone"><div class="fscr"><img class="s sc" src="${FILM_IMG.scan}" alt=""><img class="s mn" src="${FILM_IMG.menu}" alt=""><img class="s en" src="${FILM_IMG.enc}" alt=""><img class="s gr" src="${FILM_IMG.grupo}" alt=""><img class="s ms" src="${FILM_IMG.mesa}" alt=""><i class="ftap"></i></div></div>
<div class="ftoast"><b>Comanda nueva</b><span>Mesa 7 · 3 platillos · 4 personas</span></div></div>
<div class="ft ft6"><div class="fmarca grande"><b>Carta</b><i></i><span>Tu menú, Tu Carta.</span></div></div></div>`;

function filmEscala() {
  const el = $("#intro"), f = $("#film"); if (!f) return;
  const s = Math.min(el.clientWidth / 1920, el.clientHeight / 1080);
  f.style.transform = `translate(${(el.clientWidth - 1920 * s) / 2}px,${(el.clientHeight - 1080 * s) / 2}px) scale(${s})`;
}
/* la línea de tiempo: todo con fromTo para que buscar hacia atrás sea exacto */
function filmLinea() {
  const g = window.gsap; if (!g) return null;
  const tl = g.timeline({paused: true}), S = i => INI[i] / 1000, Dn = i => DURS[i] / 1000;
  const film = $("#film"), q = s => [...film.querySelectorAll(s)];
  const fade = (sel, i, dentro = 0.15, fuera = 0.4, ultimo = false) => {
    tl.fromTo(sel, {autoAlpha: 0}, {autoAlpha: 1, duration: 0.4, ease: "power2.out"}, S(i) + dentro);
    if (!ultimo) tl.to(sel, {autoAlpha: 0, duration: 0.35, ease: "power2.in"}, S(i) + Dn(i) - fuera);
  };
  const palabras = (sel, i, t0 = 0.25) => tl.fromTo(sel, {y: 46, autoAlpha: 0}, {y: 0, autoAlpha: 1, duration: 0.7, ease: "back.out(1.5)", stagger: 0.13}, S(i) + t0);
  /* fondo: acercamiento lento todo el film */
  tl.fromTo(q(".ffoto"), {scale: 1.02, autoAlpha: 0.5}, {scale: 1.16, autoAlpha: 0.62, duration: TOTI / 1000, ease: "none"}, 0);
  /* 0 · Todo empieza en la mesa → Carta */
  fade(q(".ft0"), 0, 0, 0, true);
  palabras(q(".fhook .w"), 0, 0.5);
  tl.to(q(".fhook"), {autoAlpha: 0, y: -26, duration: 0.5, ease: "power2.in"}, S(0) + 2.7);
  tl.fromTo(q(".ft0 .fmarca"), {autoAlpha: 0, scale: 0.92}, {autoAlpha: 1, scale: 1, duration: 0.8, ease: "power3.out"}, S(0) + 3.0);
  tl.to(q(".ft0"), {autoAlpha: 0, duration: 0.35, ease: "power2.in"}, S(1) - 0.05);
  /* el teléfono: entra en la 1, se queda hasta la 5 */
  tl.fromTo(q(".fphone"), {y: 220, autoAlpha: 0, scale: 0.94}, {y: 0, autoAlpha: 1, scale: 1, duration: 1.0, ease: "power3.out"}, S(1) + 0.1);
  tl.fromTo(q("#fcam"), {scale: 1, x: 0}, {scale: 1.1, duration: Dn(1) + Dn(2) * 0.5, ease: "sine.inOut"}, S(1));
  tl.to(q("#fcam"), {scale: 1, x: -20, duration: Dn(2) * 0.5 + Dn(3) * 0.4, ease: "sine.inOut"}, S(2) + Dn(2) * 0.5);
  tl.to(q("#fcam"), {scale: 1.06, x: 0, duration: Dn(3) * 0.6 + Dn(4) + Dn(5) * 0.5, ease: "sine.inOut"}, S(3) + Dn(3) * 0.4);
  tl.to(q(".fphone"), {y: 160, autoAlpha: 0, duration: 0.7, ease: "power2.in"}, S(6) - 0.1);
  /* pantallas: se apilan y cada una aparece encima de la anterior */
  const pant = (sel, i, t0 = 0) => tl.fromTo(q(sel), {autoAlpha: 0}, {autoAlpha: 1, duration: 0.45, ease: "power1.inOut"}, S(i) + t0);
  tl.set(q(".s.sc"), {autoAlpha: 1}, 0);
  pant(".s.mn", 1, 3.0); pant(".s.en", 2, 2.2); pant(".s.gr", 3, 0.05); pant(".s.ms", 4, 0.05);
  /* toque en Continuar (toma 1) y en «+» del menú (toma 2) */
  const toque = (x, y, t) => { tl.set(q(".ftap"), {left: x, top: y}, t - 0.02).fromTo(q(".ftap"), {autoAlpha: 1, scale: 0.4}, {autoAlpha: 0, scale: 1.7, duration: 0.7, ease: "power2.out"}, t); };
  toque("50%", "49%", S(1) + 2.5); toque("35%", "46%", S(2) + 1.7);
  /* tomas 1–5: kicker, rótulo palabra por palabra, subtítulo */
  for (let i = 1; i <= 5; i++) {
    const t = ".ft" + i;
    fade(q(t), i, 0.05, 0.35);
    tl.fromTo(q(t + " .fkick"), {x: -30, autoAlpha: 0}, {x: 0, autoAlpha: 1, duration: 0.55, ease: "power3.out"}, S(i) + 0.15);
    palabras(q(t + " .w"), i, 0.35);
    if (q(t + " .fsub").length) tl.fromTo(q(t + " .fsub"), {y: 18, autoAlpha: 0}, {y: 0, autoAlpha: 1, duration: 0.6, ease: "power2.out"}, S(i) + 1.25);
  }
  /* 4 · la notificación al mesero */
  tl.fromTo(q(".ftoast"), {y: -60, autoAlpha: 0}, {y: 0, autoAlpha: 1, duration: 0.6, ease: "back.out(1.4)"}, S(4) + 0.7);
  tl.to(q(".ftoast"), {autoAlpha: 0, y: -30, duration: 0.4, ease: "power2.in"}, S(4) + Dn(4) - 0.3);
  /* 5 · los estados de la mesa, uno por uno */
  tl.fromTo(q(".fpaso"), {x: -30, autoAlpha: 0.2}, {x: 0, autoAlpha: 1, duration: 0.5, ease: "power3.out", stagger: 0.55}, S(5) + 1.0);
  tl.fromTo(q(".fpaso .pt"), {backgroundColor: "rgba(254,249,241,.18)", color: "#fef9f1"}, {backgroundColor: "#fdc34d", color: "#1d1512", duration: 0.3, stagger: 0.55}, S(5) + 1.1);
  /* 6 · cierre */
  tl.fromTo(q(".ft6"), {autoAlpha: 0}, {autoAlpha: 1, duration: 0.5}, S(6) + 0.3);
  tl.fromTo(q(".ft6 .fmarca"), {scale: 0.9, y: 30, autoAlpha: 0}, {scale: 1, y: 0, autoAlpha: 1, duration: 0.9, ease: "back.out(1.3)"}, S(6) + 0.3);
  tl.to(q(".fg2"), {opacity: 0.9, duration: 1, ease: "sine.inOut"}, S(6));
  return tl;
}
function cerrarIntro() { cancelAnimationFrame(rafI); $("#intro").hidden = true; document.body.style.overflow = ""; try { localStorage.setItem("carta-v9-intro", "1"); } catch (e) { /* ignorar */ } }
function pintaIntro() {
  let e = NESC - 1; for (let i = 0; i < NESC; i++) if (tI < INI[i] + DURS[i]) { e = i; break; }
  const u = tI - INI[e];
  if (tlF) tlF.time(tI / 1000, false);
  $$("#intro .barras i b").forEach((b, k) => { b.style.width = (k < e ? 100 : k === e ? 100 * u / DURS[e] : 0) + "%"; });
  const bp = $("#introPausa"); if (bp) bp.textContent = pausaI ? "▶" : "❚❚";
  const cta = $("#introCta"); if (cta) cta.hidden = e !== NESC - 1 || u < 1500;
}
function saltaI(ms) {
  if (REDUCE) { let e = 0; for (let i = 0; i < NESC; i++) if (tI >= INI[i]) e = i; e = clamp(e + (ms > 0 ? 1 : -1), 0, NESC - 1); tI = INI[e] + DURS[e] * 0.92; }
  else tI = clamp(tI + ms, 0, TOTI - 1);
  pintaIntro();
}
function muestraControles() { const el = $("#intro"); if (!el) return; el.classList.remove("quieto"); clearTimeout(ocultoT); ocultoT = setTimeout(() => el.classList.add("quieto"), 2600); }
function frameIntro(ts) {
  if ($("#intro").hidden) return;
  if (!pausaI) { tI += clamp(ts - ultI, 0, 100); if (tI >= TOTI) { tI = TOTI - 1; pausaI = true; } }
  ultI = ts; pintaIntro(); rafI = requestAnimationFrame(frameIntro);
}
function abrirIntro() {
  const el = $("#intro");
  el.innerHTML = `${filmHtml()}<div id="introCta" class="icta" hidden><button class="btn gran" data-intro="saltar">Ver el informe</button><button class="btn" data-intro="repetir">Repetir</button></div><div class="ictl"><button class="btn" data-intro="saltar">Saltar ✕</button></div><div class="barras ictl">${DURS.map(() => "<i><b></b></i>").join("")}<button class="btn" data-intro="menos" aria-label="Atrás 3 segundos">−3 s</button><button class="btn" id="introPausa" data-intro="pausa" aria-label="Pausa o reanudar">❚❚</button><button class="btn" data-intro="mas" aria-label="Adelante 3 segundos">+3 s</button>${BTN_PANTALLA}</div>`;
  el.hidden = false; document.body.style.overflow = "hidden"; filmEscala();
  if (tlF) tlF.kill(); tlF = filmLinea();
  tI = 0; pausaI = REDUCE; ultI = performance.now(); pintaIntro(); muestraControles();
  cancelAnimationFrame(rafI); rafI = requestAnimationFrame(frameIntro);
  el.onpointermove = muestraControles;
  el.onclick = ev => { muestraControles(); const b = ev.target.closest("[data-intro]"); if (!b) return; const a = b.dataset.intro; if (a === "saltar") cerrarIntro(); else if (a === "repetir") { tI = 0; pausaI = false; ultI = performance.now(); } else if (a === "pausa") { pausaI = !pausaI; pintaIntro(); } else if (a === "menos") saltaI(-3000); else saltaI(3000); };
}
window.addEventListener("resize", filmEscala);
document.addEventListener("fullscreenchange", () => setTimeout(filmEscala, 60));
document.addEventListener("keydown", e => {
  if ($("#intro").hidden) return;
  muestraControles();
  if (e.key === "ArrowLeft") saltaI(-3000); else if (e.key === "ArrowRight") saltaI(3000); else if (e.key === " " && document.activeElement.tagName !== "BUTTON") { e.preventDefault(); pausaI = !pausaI; pintaIntro(); }
});
