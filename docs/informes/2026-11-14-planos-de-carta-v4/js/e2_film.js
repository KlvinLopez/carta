/* ===== la película: una mesa de restaurante contada como cine (≈ 50 s en este corte: actos 1 y 2) =====
   Escena ilustrada por capas (apoyo/cine/*.svg, de apoyo/cine/generar.mjs) que la cámara recorre; el teléfono es el mismo marco
   de toma en toma. Pantallas de hoy: capturas reales de apoyo/ (datos de ejemplo). Pantallas de la Fase 3 y de la visión: dibujadas
   aquí con el lenguaje de Carta, para que no parezcan capturas. Cada toma lleva su etiqueta: hoy, Fase 3 o visión.
   Todo lo del comensal (filtros, gustos) vive en su teléfono: regla dura 10. Sin pagos dentro de Carta. */
const CINE = "apoyo/cine/", CAP = {bien: "apoyo/bienvenida.webp", menu: "apoyo/menu-inicio.webp"};
/* [id, acto, duración en s, etiquetas, rótulo (la cursiva entre *), posición del rótulo, retraso del rótulo en s] */
const TOMAS = [
  ["mesa", 1, 5.5, [["hoy", "hoy · el QR de cada mesa"]], ["Todo empieza en *la mesa*."], "hook"],
  ["llegan", 1, 7, [["hoy", "hoy"]], ["La carta, *y su QR*."], "arriba"],
  ["escanea", 1, 7.5, [["hoy", "hoy"], ["ej", "datos de ejemplo"]], ["Sin descarga.", "*Sin registro*."], "izq", 1.6],
  ["filtra", 2, 7.5, [["hoy", "hoy · filtros de alérgenos"], ["vis", "visión · aprende de tus visitas"]], ["Lo que no comes,", "*fuera*."], "izq"],
  ["top3", 2, 6, [["vis", "visión"]], ["Elegido", "*para ti*."], "izq"],
  ["plato", 2, 7.5, [["vis", "visión"]], ["Sabe lo que", "*lleva*."], "izq"],
  ["agrega", 2, 4.5, [["f3", "Fase 3"]], ["Directo a", "*tu mesa*."], "izq"],
  ["fin", 6, 5.5, [], [], ""],
];
const ACTOS = [[1, "Llegar"], [2, "Tu carta"], [6, "Fin"]];
const T0 = TOMAS.reduce((a, t) => (a.push(a[a.length - 1] + t[2]), a), [0]);
const TOT = T0[T0.length - 1], TOTI = TOT * 1000;
const tomaIni = id => T0[TOMAS.findIndex(t => t[0] === id)];
const ACT_INI = ACTOS.map(([n]) => T0[TOMAS.findIndex(t => t[1] === n)]);
const ACT_FIN = ACTOS.map((_, k) => (k + 1 < ACTOS.length ? ACT_INI[k + 1] : TOT));
/* instantes de guion gráfico (movimiento reducido): el momento de cada toma en que ya está todo en pantalla */
const CLAVES = TOMAS.map((t, i) => T0[i] + t[2] * 0.82);
let tI = 0, pausaI = false, rafI = 0, ultI = 0, ocultoT = 0, tlF = null;

const cineCss = `
#cine{position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:0 0;overflow:hidden;background:#2a0d17;font-family:'DM Sans',sans-serif;color:#fef9f1}
#cine *{box-sizing:border-box}
#intro #cine svg{width:16px;height:16px;max-height:none;display:inline-block;margin:0;flex:none}
#intro #cine .cing svg{width:24px;height:24px}#intro #cine .clisto svg{width:24px;height:24px}
#intro > .ictl:not(.barras):not(.cactos){position:absolute;top:16px;right:16px;z-index:6}
#cine .cf{position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 50% 42%,#6b2d3e 0%,#4f1728 46%,#2a0d17 100%)}
#cine .cf i{position:absolute;border-radius:50%}
#cine .cf .l1{left:520px;top:120px;width:900px;height:900px;background:radial-gradient(circle,rgba(253,195,77,.28),rgba(253,195,77,0) 62%)}
#cine .cf .vg{inset:0;border-radius:0;background:radial-gradient(ellipse 78% 74% at 50% 48%,rgba(18,6,10,0) 50%,rgba(18,6,10,.78) 100%)}
#cine .cesc,#cine .cesc img{position:absolute;left:0;top:0;width:1920px;height:1080px}
#cine .cesc{transform-origin:0 0;z-index:1}
#cine .cf{z-index:0}#cine .agarre{z-index:3}#cine .globo{z-index:4}#cine .r,#cine .etq,#cine .marca{z-index:5}
#cine .cesc .gm{position:absolute;inset:0}
#cine .cesc img,#cine .gm img{display:block}
#cine .cpulso{position:absolute;left:960px;top:628px;width:150px;height:150px;margin:-75px 0 0 -75px;border-radius:50%;border:5px solid #fdc34d;opacity:0}
#cine .tierra{position:absolute;left:0;right:0;top:1000px;height:80px;background:radial-gradient(ellipse 50% 60% at 50% 0,rgba(0,0,0,.45),rgba(0,0,0,0))}
#cine .globo{position:absolute;padding:16px 24px;border-radius:26px;background:#fef9f1;color:#1a1a1a;font-size:30px;line-height:1.25;box-shadow:0 18px 40px rgba(20,6,10,.4);opacity:0;visibility:hidden;white-space:nowrap}
#cine .globo::after{content:"";position:absolute;bottom:-12px;width:28px;height:28px;background:#fef9f1;border-radius:4px;transform:rotate(45deg)}
#cine .globo.ci::after{left:30px}#cine .globo.cd::after{right:30px}
#cine .globo b{display:block;font-size:19px;letter-spacing:.08em;text-transform:uppercase;color:#6b2d3e;margin-bottom:2px}
#cine .r{position:absolute;opacity:0;visibility:hidden;font-family:'DM Serif Display',serif;font-weight:400;line-height:1.05;letter-spacing:-.01em;text-shadow:0 4px 30px rgba(20,6,10,.55)}
#cine .r .cln{display:block;white-space:nowrap}
#cine .r .cw{display:inline-block}
#cine .r em{font-style:italic;color:#fdc34d}
#cine .r.hook{left:0;right:0;top:118px;text-align:center;font-size:118px}
#cine .r.arriba{left:110px;top:150px;font-size:80px}
#cine .r.izq{left:120px;top:360px;font-size:104px}
#cine .etq{position:absolute;left:112px;top:62px;display:flex;gap:12px;opacity:0;visibility:hidden}
#cine .etq span{padding:9px 20px;border-radius:999px;font-size:22px;font-weight:600;letter-spacing:.02em;white-space:nowrap;background:rgba(20,6,10,.42)}
#cine .etq .choy{color:#b9e6b0;box-shadow:inset 0 0 0 2px rgba(150,210,140,.7)}
#cine .etq .cf3{color:#fdd88a;box-shadow:inset 0 0 0 2px rgba(253,195,77,.75)}
#cine .etq .cvis{color:#f1d9ea;box-shadow:inset 0 0 0 2px rgba(241,217,234,.6);background:rgba(107,45,62,.55)}
#cine .etq .cej{color:rgba(254,249,241,.78);box-shadow:inset 0 0 0 2px rgba(254,249,241,.35)}
/* el teléfono, con la mano de Ana */
#cine .agarre{position:absolute;left:0;top:0;width:400px;height:866px;opacity:0;visibility:hidden}
#cine .agarre .mano{position:absolute;left:-200px;top:0;width:800px;height:1300px}
#cine .cel{position:absolute;inset:0;border-radius:56px;box-shadow:0 0 0 11px #100c0a,0 0 0 13px #3a322d,0 60px 110px rgba(10,3,6,.6)}
#cine .pan{position:absolute;inset:0;border-radius:56px;overflow:hidden;background:#fef9f1;color:#1a1a1a}
#cine .pan>.cs{position:absolute;inset:0;opacity:0;visibility:hidden;overflow:hidden;background:#fef9f1}
#cine .pan>.cs>img.ccap{position:absolute;left:0;top:44px;width:400px;height:822px;object-fit:cover;object-position:top}
#cine .sb{position:absolute;left:0;right:0;top:0;height:44px;z-index:5;color:#1a1a1a;background:#fef9f1}
#cine .sb.osc{background:transparent;color:#fef9f1}
#cine .sb b{position:absolute;left:34px;top:13px;font:700 16px 'DM Sans',sans-serif}
#cine .sb i{position:absolute;left:50%;top:10px;width:100px;height:28px;margin-left:-50px;border-radius:16px;background:#0b0809}
#cine .sb u{position:absolute;right:30px;top:16px;width:24px;height:11px;border-radius:4px;box-shadow:inset 0 0 0 1.6px currentColor;background:linear-gradient(90deg,currentColor 72%,transparent 72%)}
#cine .toque{position:absolute;width:70px;height:70px;margin:-35px 0 0 -35px;border-radius:50%;background:rgba(255,255,255,.4);box-shadow:0 0 0 3px rgba(255,255,255,.9),0 6px 18px rgba(0,0,0,.25);opacity:0;z-index:8}
/* visor de la cámara */
#cine .cs.visor img{position:absolute;inset:0;width:400px;height:866px}
#cine .ret{position:absolute;left:96px;top:306px;width:208px;height:208px}
#cine .ret i{position:absolute;width:46px;height:46px;border:5px solid #ffd60a}
#cine .ret i:nth-child(1){left:0;top:0;border-right:0;border-bottom:0;border-radius:14px 0 0 0}#cine .ret i:nth-child(2){right:0;top:0;border-left:0;border-bottom:0;border-radius:0 14px 0 0}
#cine .ret i:nth-child(3){left:0;bottom:0;border-right:0;border-top:0;border-radius:0 0 0 14px}#cine .ret i:nth-child(4){right:0;bottom:0;border-left:0;border-top:0;border-radius:0 0 14px 0}
#cine .det{position:absolute;left:50%;top:556px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:12px 20px;border-radius:999px;background:#ffd60a;color:#1a1a1a;font-size:18px;font-weight:700;white-space:nowrap;opacity:0}
#cine .det em{font-style:normal;font-weight:500}
#cine .cam{position:absolute;left:0;right:0;bottom:0;height:150px;background:linear-gradient(rgba(10,6,6,0),rgba(10,6,6,.85))}
#cine .cam i{position:absolute;left:50%;bottom:40px;width:72px;height:72px;margin-left:-36px;border-radius:50%;background:#fff;box-shadow:0 0 0 5px rgba(10,6,6,.85),0 0 0 9px #fff}
/* pantallas dibujadas (Fase 3 y visión) */
#cine .cx{padding:58px 26px 0}
#cine .cx h4{margin:0;font-family:'DM Serif Display',serif;font-weight:400;color:#4f1728}
#cine .cx .cab{display:flex;align-items:center;gap:12px;font-family:'DM Serif Display',serif;font-size:22px;color:#4f1728}
#cine .cx .lg{width:42px;height:42px;border-radius:14px;background:#f3e9da;display:flex;align-items:center;justify-content:center;font-size:22px}
#cine .cx .mia{margin-left:auto;display:flex;align-items:center;gap:8px;padding:6px 8px 6px 14px;border-radius:999px;background:#f3e9da;font:600 15px 'DM Sans',sans-serif;color:#4f1728;position:relative}
#cine .av{width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font:700 14px 'DM Sans',sans-serif;color:#fff;box-shadow:0 0 0 2px #fef9f1}
#cine .av.ca{background:#66713d}#cine .av.cc{background:#3a3340;margin-left:-12px}
#cine .mia .bd{position:absolute;right:-6px;top:-8px;width:24px;height:24px;border-radius:50%;background:#b8860b;color:#fff;font:700 13px 'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;opacity:0}
#cine .hola{display:flex;align-items:center;gap:14px;margin-top:30px}
#cine .hola .av{width:58px;height:58px;font-size:26px;box-shadow:none}
#cine .hola h4{font-size:44px}
#cine .carga{position:relative;height:34px;margin-top:16px}
#cine .carga span{position:absolute;left:0;top:0;display:flex;align-items:center;gap:10px;font-size:19px;color:#5b4a3d;white-space:nowrap;opacity:0}
#cine .carga span::before{content:"";width:12px;height:12px;border-radius:50%;background:#b8860b}
#cine .cchips{display:flex;gap:10px;margin-top:14px}
#cine .cchip{display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border-radius:999px;background:#4f1728;color:#fef9f1;font-size:16px;font-weight:600;white-space:nowrap}
#cine .cchip svg{width:16px;height:16px}
#cine .tel{display:flex;align-items:center;gap:8px;margin-top:12px;font-size:15px;color:#5b4a3d}
#cine .tel svg{width:16px;height:16px;flex:none}
#cine .clista{margin-top:20px;display:flex;flex-direction:column}
#cine .cfila{display:flex;align-items:center;gap:14px;height:84px;overflow:hidden}
#cine .cfila img{width:64px;height:64px;border-radius:20px;background:#2a1a14;flex:none}
#cine .cfila b{display:block;font-family:'DM Serif Display',serif;font-weight:400;font-size:20px;color:#1a1a1a}
#cine .cfila small{font-size:14px;color:#5b4a3d}
#cine .cfila .cno{margin-left:auto;padding:5px 10px;border-radius:999px;background:#f6dede;color:#8c2a2a;font-size:13px;font-weight:700;opacity:0;white-space:nowrap}
#cine .clisto{position:absolute;left:26px;right:26px;bottom:40px;height:66px;border-radius:999px;background:linear-gradient(135deg,#66713d,#4c5630);color:#fff;display:flex;align-items:center;justify-content:center;gap:12px;font-size:21px;font-weight:700;opacity:0}
#cine .clisto svg{width:24px;height:24px}
#cine .sec{margin-top:26px;display:flex;align-items:baseline;gap:10px}
#cine .sec h4{font-size:30px}
#cine .sec .es{color:#b8860b;font-size:22px}
#cine .porq{margin-top:6px;font-size:15px;color:#5b4a3d;display:flex;align-items:center;gap:8px}
#cine .tira{position:relative;height:300px;margin:16px -26px 0;overflow:hidden}
#cine .tira .rail{position:absolute;left:26px;top:0;display:flex;gap:14px}
#cine .tj{width:210px;border-radius:24px;background:#fff;box-shadow:0 14px 30px rgba(79,23,40,.1);overflow:hidden;flex:none}
#cine .tj .fo{height:150px;background:radial-gradient(circle at 50% 45%,#3a2a22,#1d1310);display:flex;align-items:center;justify-content:center}
#cine .tj .fo img{width:140px;height:140px}
#cine .tj .ctx{padding:12px 14px 14px}
#cine .tj b{display:block;font-family:'DM Serif Display',serif;font-weight:400;font-size:19px;line-height:1.1}
#cine .tj small{display:block;margin-top:6px;font-size:13px;line-height:1.3;color:#6b2d3e;font-weight:600}
#cine .tj .cpr{display:block;margin-top:6px;font-size:15px;font-weight:600;color:#1a1a1a}
#cine .cats{display:flex;gap:8px;margin-top:6px}
#cine .cats span{padding:9px 16px;border-radius:999px;background:#f3e9da;font-size:15px;white-space:nowrap}
#cine .cats span:first-child{background:#4f1728;color:#fff}
/* el platillo en su torno */
#cine .cs.pPlato{padding:0}
#cine .vuelta{position:absolute;left:26px;top:58px;display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;background:rgba(254,249,241,.92);font-size:15px;font-weight:600;color:#4f1728;z-index:3}
#cine .torno{position:absolute;left:0;top:0;width:400px;height:360px;background:radial-gradient(ellipse 70% 70% at 50% 42%,#4a2e24,#1d1210);perspective:900px;overflow:hidden}
#cine .torno .som{position:absolute;left:62px;top:250px;width:276px;height:60px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.6),rgba(0,0,0,0))}
#cine .torno .eje{position:absolute;left:60px;top:46px;width:280px;height:280px;transform:rotateX(58deg);transform-style:preserve-3d}
#cine .torno .gir{position:absolute;inset:0;transform-style:preserve-3d}
#cine .torno .gir img{position:absolute;inset:0;width:280px;height:280px}
#cine .torno .gir .z1{transform:translateZ(10px)}#cine .torno .gir .z2{transform:translateZ(22px)}
#cine .torno .luz{position:absolute;inset:0;background:radial-gradient(ellipse 50% 30% at 40% 20%,rgba(255,220,160,.22),rgba(255,220,160,0))}
#cine .ficha{position:absolute;left:0;right:0;top:340px;bottom:0;border-radius:30px 30px 0 0;background:#fef9f1;padding:26px 26px 0}
#cine .ficha h4{font-size:32px;color:#1a1a1a}
#cine .ficha .cpr{font-size:21px;font-weight:600;color:#4f1728;margin-top:4px}
#cine .cings{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
#cine .cing{display:inline-flex;align-items:center;gap:7px;padding:7px 13px 7px 8px;border-radius:999px;background:#f3e9da;font-size:15px;white-space:nowrap}
#cine .cing svg{width:24px;height:24px}
#cine .reco{margin-top:16px;padding:14px 16px;border-radius:22px;background:#f8f1e5;font-size:15.5px;line-height:1.35;color:#3a2a22}
#cine .reco b{color:#4f1728}
#cine .reco .tel{margin-top:8px}
#cine .agr{position:absolute;left:26px;right:26px;bottom:36px;height:64px;border-radius:999px;background:linear-gradient(135deg,#6b2d3e,#4f1728);color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;box-shadow:0 12px 26px rgba(79,23,40,.35)}
#cine .cabp{position:absolute;right:26px;top:54px;z-index:4}
#cine .vuela{position:absolute;left:150px;top:110px;width:100px;height:100px;border-radius:50%;opacity:0;z-index:9}
#cine .vuela img{width:100%;height:100%}
#cine .caviso{position:absolute;left:26px;right:26px;bottom:116px;padding:14px 18px;border-radius:22px;background:#4f1728;color:#fff;font-size:16px;font-weight:600;display:flex;align-items:center;gap:12px;opacity:0;z-index:9;box-shadow:0 14px 30px rgba(79,23,40,.35)}
#cine .caviso img{width:40px;height:40px}
/* cierre */
#cine .marca{position:absolute;left:0;right:0;top:330px;display:flex;flex-direction:column;align-items:center;gap:26px;opacity:0;visibility:hidden}
#cine .marca b{font-family:'DM Serif Display',serif;font-weight:400;font-size:230px;line-height:1;color:#fef9f1}
#cine .marca i{display:block;width:420px;height:2px;background:rgba(253,195,77,.7)}
#cine .marca span{font-family:'DM Serif Display',serif;font-size:76px;color:#fdc34d;font-style:italic}
#intro .barras i{cursor:pointer}
#intro .cactos{position:absolute;left:50%;bottom:58px;transform:translateX(-50%);display:flex;gap:6px;flex-wrap:nowrap}
#intro .cactos .btn{padding:7px 12px;font-size:12.5px;white-space:nowrap}
#intro .cactos .btn.on{background:rgba(253,195,77,.35)}
@media(max-width:700px){#intro .cactos .btn span{display:none}#intro .barras{gap:4px}#intro .barras .btn{padding:7px 9px}}
`;

const palabras = l => l.split(/(\*[^*]+\*)/).filter(Boolean).map(tr => { const em = tr.startsWith("*"), tx = em ? tr.slice(1, -1) : tr; return (/^ /.test(tx) ? " " : "") + tx.split(" ").filter(Boolean).map(p => `<span class="cw">${em ? "<em>" + esc(p) + "</em>" : esc(p)}</span>`).join(" ") + (/ $/.test(tx) ? " " : ""); }).join("");
const ico = {
  no: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="6.5"/><path d="M3.5 3.5l9 9"/></svg>`,
  tel: `<svg viewBox="0 0 16 16" fill="none" stroke="#6b2d3e" stroke-width="1.6"><rect x="4" y="1.5" width="8" height="13" rx="2"/><path d="M7 12.2h2"/></svg>`,
  ok: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  pez: `<svg viewBox="0 0 24 24"><path d="M3 12c3-4 9-5 13-1l4-3-1 4 1 4-4-3c-4 4-10 3-13-1z" fill="#c9472c"/><circle cx="7" cy="11.5" r="1" fill="#fff"/></svg>`,
  chile: `<svg viewBox="0 0 24 24"><path d="M6 6c2 0 3 1 3 3 0 5 4 9 10 10-7 2-13-2-14-9 0-2 0-4 1-4z" fill="#8f2a1c"/><path d="M6 6c0-2 1-3 3-3" stroke="#4f8a2e" stroke-width="2" fill="none"/></svg>`,
  ajo: `<svg viewBox="0 0 24 24"><path d="M12 4c-5 4-7 8-6 11 1 3 4 5 6 5s5-2 6-5c1-3-1-7-6-11z" fill="#f3ead8" stroke="#c9b48e"/><path d="M12 4v16M9 8c-1 4-1 8 1 12M15 8c1 4 1 8-1 12" stroke="#c9b48e" fill="none"/></svg>`,
  limon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#7dae3a"/><circle cx="12" cy="12" r="6" fill="#d7ec8a"/><path d="M12 6v12M6 12h12M8 8l8 8M16 8l-8 8" stroke="#b9d66a" stroke-width="1.2"/></svg>`,
  cilantro: `<svg viewBox="0 0 24 24"><path d="M12 21V11" stroke="#3f7a26" stroke-width="2"/><circle cx="12" cy="8" r="4" fill="#4f8a2e"/><circle cx="7.5" cy="12" r="3.4" fill="#5f9a36"/><circle cx="16.5" cy="12" r="3.4" fill="#3f7a26"/></svg>`,
  chispa: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M8 1l1.6 4.4L14 7l-4.4 1.6L8 13l-1.6-4.4L2 7l4.4-1.6z" fill="#b8860b"/></svg>`,
};
const sb = (osc = false) => `<div class="sb${osc ? " osc" : ""}"><b>9:41</b><i></i><u></u></div>`;
const cab = (mia = false) => `<div class="cab"><span class="lg">L</span>La Ceiba${mia ? `<span class="mia">Mi mesa <span class="av ca">A</span><span class="av cc">C</span><span class="bd">1</span></span>` : ""}</div>`;
const cFila = (img, nom, pr, no = "") => `<div class="cfila${no ? " cfuera" : ""}"><img src="${CINE}plato-${img}.svg" alt=""><div><b>${nom}</b><small>${pr}</small></div>${no ? `<span class="cno">${no}</span>` : ""}</div>`;
const tarjeta = (img, nom, pr, porq) => `<div class="tj"><div class="fo"><img src="${CINE}plato-${img}.svg" alt=""></div><div class="ctx"><b>${nom}</b><small>${porq}</small><span class="cpr">${pr}</span></div></div>`;

const pantallas = () => `
<div class="cs visor"><img src="${CINE}visor.svg" alt="">${sb(true)}<div class="ret"><i></i><i></i><i></i><i></i></div><div class="det">La Ceiba <em>· abrir la carta</em></div><div class="cam"><i></i></div></div>
<div class="cs bien">${sb()}<img class="ccap" src="${CAP.bien}" alt=""></div>
<div class="cs menu">${sb()}<img class="ccap" src="${CAP.menu}" alt=""></div>
<div class="cs cx pHola">${sb()}${cab()}
  <div class="hola"><span class="av ca">A</span><h4>Hola, Ana</h4></div>
  <div class="carga"><span>Afilando los cuchillos…</span><span>Calentando el comal…</span><span>Probando la salsa…</span></div>
  <div class="cchips"><span class="cchip">${ico.no}sin lácteos</span><span class="cchip">${ico.no}sin cacahuate</span></div>
  <div class="tel">${ico.tel}Se queda en tu teléfono</div>
  <div class="clista">${cFila("aguachile", "Aguachile verde", "$210")}${cFila("enchiladas", "Enchiladas suizas", "$165", "lácteos")}${cFila("pescado", "Pescado a la talla", "$245")}${cFila("mole", "Mole negro", "$190", "cacahuate")}${cFila("ensalada", "Ensalada de betabel", "$140")}${cFila("tacos", "Tacos de pescado", "$175")}</div>
  <div class="clisto">${ico.ok}Listo: tu carta</div>
</div>
<div class="cs cx pTop3">${sb()}${cab(true)}
  <div class="sec"><h4>Top 3 para ti</h4><span class="es">✦</span></div>
  <div class="porq">${ico.tel}Por lo que te gustó en otros lugares</div>
  <div class="tira"><div class="rail">${tarjeta("pescado", "Pescado a la talla", "$245", "Te gustó el zarandeado en El Faro")}${tarjeta("aguachile", "Aguachile verde", "$210", "Pediste ceviche 3 veces")}${tarjeta("ensalada", "Ensalada de betabel", "$140", "Sin lácteos, como te gusta")}</div></div>
  <div class="sec"><h4>La carta</h4></div>
  <div class="cats"><span>Para empezar</span><span>Del mar</span><span>Postres</span></div>
  <div class="clista">${cFila("tacos", "Tacos de pescado", "$175")}${cFila("flan", "Flan de la casa", "$85")}</div>
</div>
<div class="cs cx pPlato">
  <div class="torno"><i class="som"></i><div class="eje"><div class="gir"><img src="${CINE}torno-plato.svg" alt=""><img class="z1" src="${CINE}torno-pez.svg" alt=""><img class="z2" src="${CINE}torno-adorno.svg" alt=""></div></div><i class="luz"></i></div>
  ${sb(true)}<span class="vuelta">← La carta</span>
  <div class="ficha"><h4>Pescado a la talla</h4><div class="cpr">$245</div>
    <div class="cings"><span class="cing">${ico.pez}Huachinango</span><span class="cing">${ico.chile}Guajillo</span><span class="cing">${ico.ajo}Ajo</span><span class="cing">${ico.limon}Limón</span><span class="cing">${ico.cilantro}Cilantro</span></div>
    <div class="reco">${ico.chispa} Recomendado porque te gustaron <b>los tacos de pescado</b> en otros restaurantes.<div class="tel">${ico.tel}Tus gustos viven en tu teléfono</div></div>
  </div>
  <div class="agr">Agregar a mi orden · $245</div>
  <div class="caviso"><img src="${CINE}plato-pescado.svg" alt="">En tu mesa: Pescado a la talla</div>
  <div class="vuela"><img src="${CINE}plato-pescado.svg" alt=""></div>
  <div class="cabp"><span class="mia">Mi mesa <span class="av ca">A</span><span class="av cc">C</span><span class="bd">1</span></span></div>
</div>
<i class="toque"></i>`;

function cineHtml() {
  const capas = ["salon"].map(c => `<img class="c-${c}" src="${CINE}${c}.svg" alt="">`).join("") +
    `<div class="gm"><img src="${CINE}mesero.svg" alt=""><img class="c-mbi" src="${CINE}mesero-brazo-i.svg" alt=""><img src="${CINE}mesero-brazo-d.svg" alt=""></div>` +
    ["sillas", "ana", "carlos", "mesa", "acrilico", "ana-brazo", "ana-brazo-cel", "carlos-brazo"].map(c => `<img class="c-${c}" src="${CINE}${c}.svg" alt="">`).join("");
  const rot = TOMAS.map((t, i) => t[4].length ? `<div class="r ${t[5]} r${i}">${t[4].map(l => `<span class="cln">${palabras(l)}</span>`).join("")}</div>` : "").join("");
  const etq = TOMAS.map((t, i) => t[3].length ? `<div class="etq e${i}">${t[3].map(([c, tx]) => `<span class="c${c}">${esc(tx)}</span>`).join("")}</div>` : "").join("");
  return `<div id="cine" aria-hidden="true"><div class="cf"><i class="l1"></i><i class="vg"></i></div>
<div class="cesc">${capas}<i class="cpulso"></i></div>
<div class="globo ci g1" style="left:1010px;top:96px"><b>Mesero</b>Buenas noches. Aquí está la carta.</div>
<div class="globo ci g2" style="left:1010px;top:96px"><b>Mesero</b>También está en el QR.</div>
<div class="agarre"><img class="mano ma" src="${CINE}mano-atras.svg" alt=""><div class="cel"><div class="pan">${pantallas()}</div></div><img class="mano mf" src="${CINE}mano-frente.svg" alt=""></div>
${rot}${etq}
<div class="marca"><b>Carta</b><i></i><span>Tu menú, Tu Carta.</span></div></div>`;
}

function filmEscala() {
  const el = $("#intro"), f = $("#cine"); if (!f) return;
  const s = Math.min(el.clientWidth / 1920, el.clientHeight / 1080);
  f.style.transform = `translate(${(el.clientWidth - 1920 * s) / 2}px,${(el.clientHeight - 1080 * s) / 2}px) scale(${s})`;
}

/* la línea de tiempo: estados iniciales con set en 0 y después tweens; buscar hacia atrás o adelante da el mismo cuadro */
function filmLinea() {
  const g = window.gsap; if (!g) return null;
  const tl = g.timeline({paused: true}), f = $("#cine"), q = s => [...f.querySelectorAll(s)];
  const T = id => tomaIni(id);
  const entra = (sel, t, d = 0.5, de = {}, a = {}) => tl.fromTo(q(sel), {autoAlpha: 0, ...de}, {autoAlpha: 1, duration: d, ease: "power2.out", immediateRender: false, ...a}, t);
  const sale = (sel, t, d = 0.4, a = {}) => tl.to(q(sel), {autoAlpha: 0, duration: d, ease: "power2.in", ...a}, t);
  const toque = (x, y, t) => { tl.set(q(".toque"), {left: x, top: y}, t - 0.01); tl.fromTo(q(".toque"), {autoAlpha: 0.95, scale: 0.4}, {autoAlpha: 0, scale: 1.6, duration: 0.7, ease: "power2.out", immediateRender: false}, t); };
  /* estado inicial */
  tl.set(q(".cesc > img, .gm, .r, .etq, .globo, .agarre, .pan>.cs, .marca, .cpulso"), {autoAlpha: 0}, 0);
  tl.set(q(".cesc"), {scale: 1, x: 0, y: 0}, 0);
  tl.set(q(".agarre"), {x: 1020, y: 127, rotation: -4, scale: 0.98}, 0);
  /* rótulos y etiquetas: entran palabra por palabra al empezar cada toma y salen al terminar */
  TOMAS.forEach((t, i) => {
    const t0 = T0[i], t1 = T0[i + 1];
    if (t[3].length) { entra(".e" + i, t0 + 0.2, 0.5, {x: -16}, {x: 0}); sale(".e" + i, t1 - 0.4, 0.3); }
    if (t[4].length) {
      const rr = t0 + (t[6] || 0);
      tl.set(q(".r" + i), {autoAlpha: 1}, rr + 0.25);
      tl.fromTo(q(".r" + i + " .cw"), {y: 44, autoAlpha: 0}, {y: 0, autoAlpha: 1, duration: 0.7, ease: "back.out(1.5)", stagger: 0.12, immediateRender: false}, rr + 0.3);
      sale(".r" + i, t1 - 0.45, 0.35);
    }
  });
  /* 1 · la mesa sola sobre el vino; aparece con su acrílico */
  let t = T("mesa");
  tl.fromTo(q(".cf .l1"), {opacity: 0.4, scale: 0.9}, {opacity: 1, scale: 1.1, duration: 6, ease: "sine.inOut"}, t);
  entra(".c-mesa", t + 1.6, 1.2, {y: 60}, {y: 0, ease: "power3.out"});
  entra(".c-acrilico", t + 2.3, 0.9, {y: 40}, {y: 0, ease: "back.out(1.6)"});
  tl.fromTo(q(".cpulso"), {autoAlpha: 0.9, scale: 0.5}, {autoAlpha: 0, scale: 1.5, duration: 1.1, ease: "power2.out", immediateRender: false}, t + 3.4);
  /* 2 · el salón, llegan Ana y Carlos, el mesero ofrece la carta y señala el QR */
  t = T("llegan");
  entra(".c-salon", t, 1.0);
  entra(".c-sillas", t + 0.3, 0.6);
  entra(".c-ana, .c-ana-brazo", t + 0.6, 0.9, {y: -30}, {y: 0, ease: "power3.out"});
  entra(".c-carlos, .c-carlos-brazo", t + 1.0, 0.9, {y: -30}, {y: 0, ease: "power3.out"});
  entra(".gm", t + 1.8, 1.0, {x: 260}, {x: 0, ease: "power2.out"});
  entra(".g1", t + 2.9, 0.45, {scale: 0.7, transformOrigin: "10% 100%"}, {scale: 1, ease: "back.out(1.8)"});
  sale(".g1", t + 4.6, 0.25);
  tl.fromTo(q(".c-mbi"), {rotation: 0, transformOrigin: "888px 300px"}, {rotation: -16, duration: 0.6, ease: "power2.inOut", immediateRender: false}, t + 4.4);
  entra(".g2", t + 4.9, 0.45, {scale: 0.7, transformOrigin: "10% 100%"}, {scale: 1, ease: "back.out(1.8)"});
  tl.fromTo(q(".cpulso"), {autoAlpha: 0.95, scale: 0.5}, {autoAlpha: 0, scale: 1.5, duration: 1.0, ease: "power2.out", immediateRender: false}, t + 5.2);
  sale(".g2", t + 6.6, 0.3);
  /* 3 · la cámara se va a la mano de Ana: escanea y entra a la carta (capturas reales) */
  t = T("escanea");
  sale(".c-ana-brazo", t, 0.3); entra(".c-ana-brazo-cel", t, 0.3);
  tl.to(q(".c-mbi"), {rotation: 0, duration: 0.5}, t);
  tl.to(q(".cesc"), {scale: 3.2, x: 960 - 3.2 * 690, y: 540 - 3.2 * 515, duration: 1.4, ease: "power2.in"}, t + 0.3);
  tl.to(q(".cesc > img, .gm"), {autoAlpha: 0, duration: 0.5, ease: "power1.in"}, t + 1.3);
  tl.to(q(".cf .l1"), {opacity: 0.7, duration: 0.5}, t + 1.3);
  tl.fromTo(q(".agarre"), {autoAlpha: 0, y: 420, scale: 0.9}, {autoAlpha: 1, y: 127, scale: 0.98, duration: 1.0, ease: "power3.out", immediateRender: false}, t + 1.2);
  entra(".cs.visor", t + 1.2, 0.1);
  tl.fromTo(q(".ret"), {scale: 1.6, autoAlpha: 0.4}, {scale: 1, autoAlpha: 1, duration: 0.9, ease: "power3.out", immediateRender: false}, t + 2.0);
  entra(".det", t + 3.0, 0.4, {y: 14}, {y: 0, ease: "back.out(2)"});
  toque(200, 580, t + 3.7);
  entra(".cs.bien", t + 3.95, 0.35, {scale: 1.04}, {scale: 1});
  toque(200, 366, t + 5.4);
  entra(".cs.menu", t + 5.7, 0.4, {scale: 1.04}, {scale: 1});
  /* 4 · la pantalla a cuadro completo: la carta se adapta a lo que Ana no come */
  t = T("filtra");
  tl.to(q(".mano"), {y: 520, autoAlpha: 0, duration: 0.7, ease: "power2.in"}, t);
  tl.to(q(".agarre"), {x: 1060, y: 107, rotation: 0, scale: 1.14, duration: 1.1, ease: "power3.inOut"}, t + 0.1);
  entra(".cs.pHola", t + 0.6, 0.45, {scale: 0.97}, {scale: 1});
  const msj = q(".carga span");
  msj.forEach((m, k) => { tl.fromTo(m, {autoAlpha: 0, y: 10}, {autoAlpha: 1, y: 0, duration: 0.3, immediateRender: false}, t + 1.0 + k * 1.1); if (k < msj.length - 1) tl.to(m, {autoAlpha: 0, y: -10, duration: 0.25}, t + 1.85 + k * 1.1); });
  entra(".cs.pHola .cchips .cchip", t + 1.5, 0.45, {scale: 0.7}, {scale: 1, ease: "back.out(2)", stagger: 0.25});
  entra(".cs.pHola .tel", t + 2.1, 0.4);
  entra(".cs.pHola .cfuera .cno", t + 3.3, 0.3, {scale: 0.6}, {scale: 1, stagger: 0.2});
  tl.to(q(".cs.pHola .cfuera"), {height: 0, autoAlpha: 0, duration: 0.6, ease: "power2.inOut", stagger: 0.15}, t + 4.2);
  tl.to(q(".carga span:last-child"), {autoAlpha: 0, duration: 0.3}, t + 4.8);
  entra(".clisto", t + 5.0, 0.5, {y: 30, scale: 0.9}, {y: 0, scale: 1, ease: "back.out(1.8)"});
  /* 5 · su carta: Top 3 para ti, con el porqué; el dedo la recorre */
  t = T("top3");
  entra(".cs.pTop3", t, 0.5, {scale: 0.97}, {scale: 1});
  tl.set(q(".toque"), {left: 300, top: 300}, t + 0.8);
  tl.fromTo(q(".toque"), {autoAlpha: 0, scale: 0.6}, {autoAlpha: 0.9, scale: 0.8, duration: 0.25, immediateRender: false}, t + 0.8);
  tl.to(q(".toque"), {left: 90, duration: 1.0, ease: "power2.inOut"}, t + 1.05);
  tl.fromTo(q(".cs.pTop3 .rail"), {x: 0}, {x: -300, duration: 1.0, ease: "power2.inOut", immediateRender: false}, t + 1.05);
  tl.to(q(".toque"), {autoAlpha: 0, duration: 0.2}, t + 2.05);
  tl.to(q(".cs.pTop3 .rail"), {x: 0, duration: 0.9, ease: "power2.inOut"}, t + 2.6);
  toque(130, 300, t + 4.3);
  /* 6 · el platillo como modelo, girando en su torno; ingredientes y el porqué */
  t = T("plato");
  entra(".cs.pPlato", t, 0.5, {scale: 0.96}, {scale: 1});
  tl.fromTo(q(".torno .gir"), {rotation: 0}, {rotation: 300, duration: TOMAS[5][2] + TOMAS[6][2], ease: "none", immediateRender: false}, t);
  tl.set(q(".cs.pPlato .cabp, .cs.pPlato .vuela, .cs.pPlato .caviso"), {autoAlpha: 0}, t);
  entra(".cing", t + 1.2, 0.4, {y: 14, scale: 0.9}, {y: 0, scale: 1, ease: "back.out(2)", stagger: 0.18});
  entra(".reco", t + 2.7, 0.5, {y: 20}, {y: 0});
  /* 7 · «Agregar a mi orden»: el platillo vuela a su mesa virtual */
  t = T("agrega");
  toque(200, 798, t + 0.6);
  tl.to(q(".agr"), {scale: 0.96, duration: 0.12, yoyo: true, repeat: 1}, t + 0.6);
  tl.fromTo(q(".vuela"), {autoAlpha: 1, x: 0, y: 0, scale: 1}, {x: 100, y: -84, scale: 0.3, duration: 0.9, ease: "power2.in", immediateRender: false}, t + 0.8);
  tl.to(q(".vuela"), {autoAlpha: 0, duration: 0.15}, t + 1.65);
  entra(".cs.pPlato .cabp", t + 0.5, 0.3);
  tl.fromTo(q(".mia .bd"), {autoAlpha: 0, scale: 0.3}, {autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(3)", immediateRender: false}, t + 1.7);
  entra(".cs.pPlato .caviso", t + 2.0, 0.4, {y: 20}, {y: 0, ease: "back.out(1.6)"});
  /* cierre */
  t = T("fin");
  tl.to(q(".agarre"), {y: 260, autoAlpha: 0, duration: 0.7, ease: "power2.in"}, t - 0.2);
  tl.set(q(".marca"), {autoAlpha: 1}, t + 0.4);
  tl.fromTo(q(".marca b, .marca i, .marca span"), {y: 30, autoAlpha: 0}, {y: 0, autoAlpha: 1, duration: 0.8, ease: "back.out(1.4)", stagger: 0.25, immediateRender: false}, t + 0.4);
  tl.set({}, {}, TOT);
  return tl;
}

function cerrarIntro() { cancelAnimationFrame(rafI); $("#intro").hidden = true; document.body.style.overflow = ""; try { localStorage.setItem("carta-v9-intro", "1"); } catch (e) { /* ignorar */ } }
const actoDe = s => { let k = 0; ACT_INI.forEach((a, i) => { if (s >= a) k = i; }); return k; };
function pintaIntro() {
  const s = tI / 1000, k = actoDe(s);
  if (tlF) tlF.time(s, false);
  $$("#intro .barras i b").forEach((b, i) => { b.style.width = (i < k ? 100 : i === k ? 100 * (s - ACT_INI[i]) / (ACT_FIN[i] - ACT_INI[i]) : 0) + "%"; });
  $$("#intro .cactos [data-n]").forEach(b => b.classList.toggle("on", +b.dataset.n === k));
  const bp = $("#introPausa"); if (bp) bp.textContent = pausaI ? "▶" : "❚❚";
  const cta = $("#introCta"); if (cta) cta.hidden = s < tomaIni("fin") + 1.6;
}
function irActo(k) { tI = (REDUCE ? CLAVES[TOMAS.findIndex(t => t[1] === ACTOS[k][0])] : ACT_INI[k]) * 1000; pintaIntro(); }
function saltaI(ms) {
  if (REDUCE) { let e = 0; CLAVES.forEach((c, i) => { if (tI / 1000 >= c - 0.01) e = i; }); e = clamp(e + (ms > 0 ? 1 : -1), 0, TOMAS.length - 1); tI = CLAVES[e] * 1000; }
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
  if (!$("#cineCss")) { const st = document.createElement("style"); st.id = "cineCss"; st.textContent = cineCss; document.head.appendChild(st); }
  const el = $("#intro");
  const actos = ACTOS.slice(0, -1).map(([n, nom], k) => `<button class="btn" data-intro="acto" data-n="${k}" aria-label="Acto ${n}: ${nom}">${n}<span> · ${nom}</span></button>`).join("");
  el.innerHTML = `${cineHtml()}<div id="introCta" class="icta" hidden><button class="btn gran" data-intro="saltar">Ver el informe</button><button class="btn" data-intro="repetir">Repetir</button></div><div class="ictl"><button class="btn" data-intro="saltar">Saltar ✕</button></div><div class="cactos ictl">${actos}</div><div class="barras ictl">${ACTOS.map((_, k) => `<i data-intro="acto" data-n="${k}" style="flex:${(ACT_FIN[k] - ACT_INI[k]).toFixed(1)}"><b></b></i>`).join("")}<button class="btn" data-intro="menos" aria-label="Atrás 3 segundos">−3 s</button><button class="btn" id="introPausa" data-intro="pausa" aria-label="Pausa o reanudar">❚❚</button><button class="btn" data-intro="mas" aria-label="Adelante 3 segundos">+3 s</button>${BTN_PANTALLA}</div>`;
  el.hidden = false; document.body.style.overflow = "hidden"; filmEscala();
  if (tlF) tlF.kill(); tlF = filmLinea();
  tI = REDUCE ? CLAVES[0] * 1000 : 0; pausaI = REDUCE; ultI = performance.now(); pintaIntro(); muestraControles();
  cancelAnimationFrame(rafI); rafI = requestAnimationFrame(frameIntro);
  el.onpointermove = muestraControles;
  el.onclick = ev => {
    muestraControles(); const b = ev.target.closest("[data-intro]"); if (!b) return; const a = b.dataset.intro;
    if (a === "saltar") cerrarIntro();
    else if (a === "repetir") { tI = REDUCE ? CLAVES[0] * 1000 : 0; pausaI = REDUCE; ultI = performance.now(); pintaIntro(); }
    else if (a === "pausa") { pausaI = !pausaI; pintaIntro(); }
    else if (a === "acto") irActo(+b.dataset.n);
    else if (a === "menos") saltaI(-3000); else saltaI(3000);
  };
}
window.addEventListener("resize", filmEscala);
document.addEventListener("fullscreenchange", () => setTimeout(filmEscala, 60));
document.addEventListener("keydown", e => {
  if ($("#intro").hidden) return;
  muestraControles();
  if (e.key === "ArrowLeft") saltaI(-3000); else if (e.key === "ArrowRight") saltaI(3000);
  else if (/^[1-9]$/.test(e.key) && +e.key <= ACTOS.length - 1) irActo(+e.key - 1);
  else if (e.key === " " && document.activeElement.tagName !== "BUTTON") { e.preventDefault(); pausaI = !pausaI; pintaIntro(); }
});
