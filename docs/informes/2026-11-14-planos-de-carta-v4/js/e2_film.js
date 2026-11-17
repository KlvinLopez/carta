/* ===== la película: una mesa de restaurante contada como cine (94 s, cinco actos) =====
   Escena ilustrada por capas (apoyo/cine/*.svg, de apoyo/cine/generar.mjs) que la cámara recorre; el teléfono es el mismo marco
   de toma en toma y Ana lo sostiene con su mano. Pantallas de hoy: capturas reales de apoyo/ (datos de ejemplo). Pantallas de la
   Fase 3 y de la visión: dibujadas aquí con el lenguaje de Carta, para que no parezcan capturas. Cada toma lleva su etiqueta.
   Todo lo del comensal (filtros, gustos) vive en su teléfono: regla dura 10. El cobro ocurre fuera de Carta: no hay pantalla de pago.
   Ojo al editar: todos los js/*.js comparten un solo ámbito global y la hoja de la plantilla estiliza clases genéricas
   (.esc, .chip, .fila, .s, .w y #intro svg{width:100%}): aquí todo nombre lleva prefijo (c…) y el CSS va bajo #cine. */
const CINE = "apoyo/cine/", CAP = {bien: "apoyo/bienvenida.webp", menu: "apoyo/menu-inicio.webp"};
/* [id, acto, duración en s, etiquetas, rótulo (la cursiva entre *), posición del rótulo, retraso del rótulo en s, segundos que dura el rótulo] */
const F3 = [["f3", "Fase 3"]];
const TOMAS = [
  ["mesa", 1, 5.5, [["hoy", "hoy · el QR de cada mesa"]], ["Todo empieza en *la mesa*."], "hook"],
  ["llegan", 1, 7, [["hoy", "hoy"]], ["La carta, *y su QR*."], "arriba"],
  ["escanea", 1, 7.5, [["hoy", "hoy"], ["ej", "datos de ejemplo"]], ["Sin descarga.", "*Sin registro*."], "izq", 1.6],
  ["filtra", 2, 6.5, [["hoy", "hoy · filtros de alérgenos"], ["vis", "visión · aprende de tus visitas"]], ["Lo que no comes,", "*fuera*."], "izq"],
  ["top3", 2, 5.5, [["vis", "visión"]], ["Elegido", "*para ti*."], "alto"],
  ["plato", 2, 7, [["vis", "visión · modelo del platillo"]], ["Sabe lo que", "*lleva*."], "izq"],
  ["agrega", 2, 4, F3, ["Directo a", "*tu mesa*."], "izq"],
  ["juntos", 3, 6.5, F3, ["La mesa *pide junta*."], "centro", 1.2],
  ["recomienda", 3, 7, [["vis", "visión · recomendar a otro de la mesa"]], ["Pásaselo *a Carlos*."], "centro"],
  ["confirma", 3, 4.5, F3, ["La mesa *llama al mesero*."], "centro"],
  ["avisa", 4, 8, [["f3", "Fase 3"], ["vis", "visión · aviso con el teléfono bloqueado"]], ["Le vibra *el bolsillo*."], "centro", 0, 2.9],
  ["llega", 4, 6, F3, ["Confirma *y la manda*."], "arriba"],
  ["abierta", 5, 3.6, F3, ["Abierta"], "fase", -0.2],
  ["cerrada", 5, 3.4, F3, ["Cuenta *cerrada*"], "fase", -0.2],
  ["pagada", 5, 3.6, [["f3", "Fase 3"], ["ej", "el cobro, fuera de Carta"]], ["Pagada"], "fase", -0.2],
  ["limpia", 5, 3.6, F3, ["Mesa *limpia*"], "fase", -0.2],
  ["fin", 6, 4.8, [], [], ""],
];
const ACTOS = [[1, "Llegar"], [2, "Tu carta"], [3, "La mesa"], [4, "El mesero"], [5, "El personal"], [6, "Fin"]];
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
#cine .pan>.cs{position:absolute;inset:0;isolation:isolate;z-index:0;opacity:0;visibility:hidden;overflow:hidden;background:#fef9f1}
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
#cine .torno{position:absolute;left:0;top:0;width:400px;height:360px;background:radial-gradient(ellipse 70% 70% at 50% 42%,#4a2e24,#1d1210);overflow:hidden}
#cine .torno .som{position:absolute;left:52px;top:214px;width:296px;height:96px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.65),rgba(0,0,0,0))}
#cine .torno .capa{position:absolute;left:60px;top:66px;width:280px;height:280px}
#cine .torno .gir{position:absolute;inset:0}
#cine .torno .gir img{position:absolute;inset:0;width:280px;height:280px}
#cine .torno .capa.k0 img,#cine .torno .capa.k1 img,#cine .torno .capa.k2 img{filter:brightness(.45) saturate(.8)}
#cine .torno .capa.k3 img{filter:brightness(.7)}
#cine .torno .brillo{position:absolute;left:84px;top:150px;width:232px;height:116px;border-radius:50%;overflow:hidden;mix-blend-mode:screen}
#cine .torno .brillo i{position:absolute;left:-80px;top:-20px;width:60px;height:160px;background:linear-gradient(90deg,rgba(255,240,210,0),rgba(255,240,210,.45),rgba(255,240,210,0));transform:skewX(-20deg)}
#cine .torno .aro360{position:absolute;left:30px;top:140px;width:340px;height:170px;border-radius:50%;box-shadow:inset 0 0 0 2px rgba(253,195,77,.55)}
#cine .torno .g360{position:absolute;right:22px;top:292px;padding:6px 12px;border-radius:999px;background:rgba(20,10,8,.6);color:#fdd88a;font-size:14px;font-weight:700;letter-spacing:.04em}
#cine .torno .luz{position:absolute;inset:0;background:radial-gradient(ellipse 50% 30% at 40% 20%,rgba(255,220,160,.2),rgba(255,220,160,0))}
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
#cine .r.alto{left:120px;top:190px;font-size:96px}
#cine .r.centro{left:0;right:0;top:122px;text-align:center;font-size:84px}
#cine .r.centro .cln,#cine .r.hook .cln{width:max-content;margin:0 auto}
#cine .r.fase{left:110px;top:140px;font-size:104px}
/* el restaurante desenfocado detrás del teléfono, y Ana de espaldas */
#cine .fondoB{position:absolute;inset:0;z-index:1;opacity:0;visibility:hidden;overflow:hidden}
#cine .fondoB .fb{position:absolute;inset:0;filter:blur(13px) brightness(.6) saturate(1.1);transform:scale(1.45);transform-origin:1250px 520px}
#cine .fondoB img{position:absolute;left:0;top:0;width:1920px;height:1080px}
#cine .fondoB::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 80% 80% at 60% 45%,rgba(20,6,10,0) 40%,rgba(20,6,10,.6) 100%)}
#cine .hombro{position:absolute;left:0;top:0;width:1920px;height:1080px;z-index:2;opacity:0;visibility:hidden;filter:brightness(.82)}
#cine .oscuro{position:absolute;inset:0;z-index:2;background:rgba(20,6,10,.62);opacity:0;visibility:hidden}
#cine .agarre .dedo{position:absolute;left:-500px;top:-20px;width:540px;height:720px;opacity:0;visibility:hidden;z-index:9}
#cine .agarre2{position:absolute;left:0;top:0;width:400px;height:866px;opacity:0;visibility:hidden;z-index:3}
#cine .nom{position:absolute;left:50%;top:-74px;transform:translateX(-50%);padding:8px 20px;border-radius:999px;background:rgba(20,6,10,.5);color:#fef9f1;font-size:24px;font-weight:600;white-space:nowrap}
/* sobre la escena */
#cine .estado{position:absolute;padding:10px 20px;border-radius:999px;font-size:24px;font-weight:700;white-space:nowrap;opacity:0;visibility:hidden;box-shadow:0 10px 26px rgba(20,6,10,.35)}
#cine .estado.lista{background:#66713d;color:#fff}
#cine .estado.elige{background:rgba(254,249,241,.92);color:#5b4a3d}
#cine .estado.vino{background:#fef9f1;color:#4f1728}
#cine .resu{position:absolute;width:250px;padding:16px 18px;border-radius:22px;background:#fef9f1;color:#1a1a1a;opacity:0;visibility:hidden;box-shadow:0 14px 30px rgba(20,6,10,.35)}
#cine .resu b{display:block;font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:#6b2d3e}
#cine .resu span{display:flex;justify-content:space-between;font-size:18px;margin-top:6px;color:#3a2a22}
#cine .resu strong{display:flex;justify-content:space-between;font-size:21px;margin-top:8px;color:#4f1728}
#cine .reloj{position:absolute;left:110px;top:900px;display:flex;align-items:center;gap:16px;z-index:5;opacity:0;visibility:hidden}
#cine .reloj .x4{padding:10px 20px;border-radius:999px;background:#fdc34d;color:#2a0d17;font-size:30px;font-weight:800}
#cine .reloj .esfera{position:relative;width:70px;height:70px;border-radius:50%;background:#fef9f1;box-shadow:0 8px 20px rgba(0,0,0,.35)}
#cine .reloj .esfera i{position:absolute;left:33px;width:4px;border-radius:2px;background:#4f1728;transform-origin:2px 100%}
#cine .reloj .esfera .hh{top:17px;height:18px}#cine .reloj .esfera .mm{top:8px;height:27px;background:#b8860b}
#cine .reloj .hora{font-size:30px;font-weight:700;color:#fef9f1;min-width:90px}
#cine .aro{position:absolute;left:330px;top:950px;width:1260px;height:120px;border-radius:50%;box-shadow:0 0 0 8px #66713d,0 0 40px 10px rgba(102,113,61,.6);opacity:0;visibility:hidden}
#cine .cesc img.comida{position:absolute;width:132px;height:132px;opacity:0;visibility:hidden;transform:scaleY(.3)}
#cine .buzz{position:absolute;left:1040px;top:560px;width:60px;height:60px;opacity:0;visibility:hidden}
#cine .buzz i{position:absolute;inset:0;border-radius:50%;border:4px solid #fdc34d;border-left-color:transparent;border-bottom-color:transparent}
#cine .buzz i+i{inset:-14px}
/* más pantallas dibujadas */
#cine .avisoT{margin-top:18px;padding:14px 16px;border-radius:22px;background:#f8f1e5;font-size:15.5px;line-height:1.35;color:#3a2a22;display:flex;gap:10px}
#cine .hero{position:absolute;left:0;right:0;top:0;height:330px;background:radial-gradient(ellipse 70% 70% at 50% 45%,#4a2e24,#1d1210);display:flex;align-items:center;justify-content:center}
#cine .hero img{width:250px;height:250px}
#cine .btn2{position:absolute;left:26px;right:26px;height:60px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:700}
#cine .btn2.v{background:linear-gradient(135deg,#6b2d3e,#4f1728);color:#fff;bottom:36px}
#cine .btn2.o{background:#eef0e2;color:#4c5630;bottom:110px;box-shadow:inset 0 0 0 2px #66713d}
#cine .toast{position:absolute;left:26px;right:26px;top:60px;padding:14px 18px;border-radius:22px;background:#4c5630;color:#fff;font-size:17px;font-weight:600;display:flex;align-items:center;gap:10px;opacity:0;z-index:9}
#cine .toast svg,#intro #cine .toast svg{width:22px;height:22px}
#cine .reco2{position:absolute;left:20px;right:20px;top:330px;padding:16px;border-radius:24px;background:#fff;box-shadow:0 18px 40px rgba(79,23,40,.22);opacity:0;z-index:6}
#cine .reco2 .de{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700;color:#4f1728}
#cine .reco2 .pl{display:flex;align-items:center;gap:12px;margin-top:12px}
#cine .reco2 .pl img{width:70px;height:70px;border-radius:20px;background:#2a1a14}
#cine .reco2 .pl b{font-family:'DM Serif Display',serif;font-weight:400;font-size:21px}
#cine .reco2 .me{margin-top:14px;height:52px;border-radius:999px;background:linear-gradient(135deg,#6b2d3e,#4f1728);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700}
#cine .listos{margin-top:28px;text-align:center}
#cine .listos .avs{display:flex;justify-content:center;gap:26px;margin-top:20px}
#cine .listos .avs span{position:relative}
#cine .listos .avs .av{width:84px;height:84px;font-size:34px;box-shadow:0 0 0 4px #66713d}
#cine .listos .avs em{position:absolute;right:-4px;bottom:-4px;width:30px;height:30px;border-radius:50%;background:#66713d;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px #fef9f1}
#cine .listos .avs em svg,#intro #cine .listos .avs em svg{width:18px;height:18px}
#cine .barra{height:12px;border-radius:6px;background:#66713d;margin:26px 10px 10px}
#cine .listos p{margin:6px 0 0;font-size:18px;color:#5b4a3d}
#cine .listos h4{font-size:36px}
#cine .bloq{background:linear-gradient(170deg,#6b2d3e,#2a0d17 70%)!important;color:#fef9f1;text-align:center;padding-top:110px}
#cine .bloq .hr{font-size:84px;font-weight:300;letter-spacing:-.02em;line-height:1}
#cine .bloq .fe{font-size:18px;opacity:.8;margin-top:6px}
#cine .noti{margin:70px 18px 0;padding:16px;border-radius:24px;background:rgba(254,249,241,.94);color:#1a1a1a;text-align:left}
#cine .noti .ap{display:flex;align-items:center;gap:8px;font-size:14px;color:#5b4a3d}
#cine .noti .ap i{width:24px;height:24px;border-radius:7px;background:#4f1728;color:#fdc34d;font:400 16px 'DM Serif Display',serif;display:flex;align-items:center;justify-content:center;font-style:normal}
#cine .noti b{display:block;font-size:18px;margin-top:8px}
#cine .noti .ya{margin-top:12px;height:46px;border-radius:999px;background:#4f1728;color:#fff;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700}
#cine .mesa7{display:flex;align-items:center;gap:12px;margin-top:22px}
#cine .mesa7 h4{font-size:38px}
#cine .mesa7 span{padding:7px 14px;border-radius:999px;background:#eef0e2;color:#4c5630;font-size:15px;font-weight:700;white-space:nowrap}
#cine .ped{display:flex;align-items:center;gap:12px;margin-top:16px;padding:12px;border-radius:22px;background:#fff;box-shadow:0 10px 24px rgba(79,23,40,.08)}
#cine .ped img{width:56px;height:56px;border-radius:18px;background:#2a1a14}
#cine .ped b{display:block;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#6b2d3e}
#cine .ped span{font-family:'DM Serif Display',serif;font-size:19px}
#cine .hecho{position:absolute;left:26px;right:26px;bottom:36px;height:60px;border-radius:999px;background:#66713d;color:#fff;display:flex;align-items:center;justify-content:center;gap:10px;font-size:19px;font-weight:700;opacity:0}
#cine .hecho svg,#intro #cine .hecho svg{width:22px;height:22px}
#cine .globo.ancho{white-space:normal;width:400px}
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

const torno = () => `<div class="torno"><i class="som"></i><i class="aro360"></i>
  <div class="capa" style="transform:scaleY(.5)"><img src="${CINE}torno-plato.svg" alt=""></div>
  ${[0, 1, 2, 3].map(k => `<div class="capa k${k}" style="transform:translateY(-${k * 3}px) scaleY(.5)"><div class="gir"><img src="${CINE}torno-pez.svg" alt=""></div></div>`).join("")}
  <div class="capa k4" style="transform:translateY(-12px) scaleY(.5)"><div class="gir"><img src="${CINE}torno-pez.svg" alt=""><img src="${CINE}torno-adorno.svg" alt=""></div></div>
  <div class="brillo"><i></i></div><span class="g360">360°</span><i class="luz"></i></div>`;
const listos = (cl) => `<div class="cs cx ${cl}">${sb()}${cab(true)}<div class="listos"><h4>La mesa está lista</h4><div class="avs"><span><span class="av ca">A</span><em>${ico.ok}</em></span><span><span class="av cc">C</span><em>${ico.ok}</em></span></div><div class="barra"></div><p>2 de 2 listos</p><p>Ya avisamos al mesero</p></div></div>`;

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
<div class="cs cx pPlato">${torno()}
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
<div class="cs cx pAviso">${sb()}${cab(true)}
  <div class="avisoT">${ico.chispa}<span>Llegaste hace poco a Carta: aún sé poco de tus gustos.</span></div>
  <div class="sec"><h4>Platos fuertes</h4></div>
  <div class="clista">${cFila("res", "Arrachera", "$230")}${cFila("tacos", "Tacos de pescado", "$175")}${cFila("aguachile", "Aguachile verde", "$210")}</div>
</div>
<div class="cs cx pRes"><div class="hero"><img src="${CINE}plato-res.svg" alt=""></div>${sb(true)}<span class="vuelta">← La carta</span>
  <div class="ficha"><h4>Arrachera</h4><div class="cpr">$230</div><div class="reco">Para compartir, al término que pidas.</div></div>
  <div class="btn2 o">Enviar a Carlos</div><div class="btn2 v">Agregar a mi orden</div>
  <div class="toast">${ico.ok}Se la enviaste a Carlos</div>
</div>
${listos("pListosA")}
<i class="toque"></i>`;

const pantallasB = () => `
<div class="cs cx pCarlos">${sb()}${cab(true)}
  <div class="hola"><span class="av cc">C</span><h4>Hola, Carlos</h4></div>
  <div class="clista">${cFila("tacos", "Tacos de pescado", "$175")}${cFila("aguachile", "Aguachile verde", "$210")}${cFila("flan", "Flan de la casa", "$85")}</div>
  <div class="reco2"><div class="de"><span class="av ca">A</span>Ana te recomienda</div><div class="pl"><img src="${CINE}plato-res.svg" alt=""><div><b>Arrachera</b><br><small>$230</small></div></div><div class="me">Me encanta</div></div>
  <div class="toast">${ico.ok}Arrachera, en tu orden</div>
  <div class="btn2 v conf">Confirmar mi orden · $230</div>
</div>
${listos("pListosB")}
<div class="cs bloq">${sb(true)}<div class="hr">9:41</div><div class="fe">jueves</div>
  <div class="noti"><div class="ap"><i>C</i>Carta · ahora</div><b>Mesa 7: Ana y Carlos están listos para ordenar</b><div class="ya">Ya voy</div></div>
</div>
<div class="cs cx pOrden">${sb()}<div class="cab"><span class="lg">L</span>La Ceiba · Personal</div>
  <div class="mesa7"><h4>Mesa 7</h4><span>Lista para ordenar</span></div>
  <div class="ped"><img src="${CINE}plato-pescado.svg" alt=""><div><b>Ana</b><span>Pescado a la talla</span></div></div>
  <div class="ped"><img src="${CINE}plato-res.svg" alt=""><div><b>Carlos</b><span>Arrachera</span></div></div>
  <div class="btn2 v">Atender comanda</div><div class="hecho">${ico.ok}Comanda atendida</div>
</div>
<div class="cs cx pLimpia">${sb()}<div class="cab"><span class="lg">L</span>La Ceiba · Personal</div>
  <div class="mesa7"><h4>Mesa 7</h4><span>Pagada</span></div>
  <div class="avisoT">Ana y Carlos ya se fueron. ¿Lista para los siguientes?</div>
  <div class="btn2 v">Mesa limpia</div><div class="hecho">${ico.ok}Mesa limpia</div>
</div>
<i class="toque2 toque"></i>`;

function cineHtml() {
  const img = c => `<img class="c-${c}" src="${CINE}${c}.svg" alt="">`;
  const capas = img("salon") + `<i class="aro"></i>` +
    `<div class="gm"><img src="${CINE}mesero.svg" alt=""><img class="c-mbi" src="${CINE}mesero-brazo-i.svg" alt=""><img class="c-mbd" src="${CINE}mesero-brazo-d.svg" alt=""><img class="c-mbc" src="${CINE}mesero-brazo-cel.svg" alt=""><img class="c-mbx" src="${CINE}mesero-brazo-cambio.svg" alt=""><span class="buzz"><i></i><i></i></span></div>` +
    ["sillas", "ana", "carlos", "mesa", "acrilico"].map(img).join("") +
    `<img class="comida cp1" src="${CINE}plato-pescado.svg" alt="" style="left:624px;top:634px"><img class="comida cp2" src="${CINE}plato-res.svg" alt="" style="left:1164px;top:634px"><img class="comida cp3" src="${CINE}plato-flan.svg" alt="" style="left:624px;top:634px">` +
    ["ana-brazo", "ana-brazo-cel", "carlos-brazo", "carlos-brazo-cel"].map(img).join("") +
    `<i class="cpulso"></i>` +
    `<span class="estado lista eA" style="left:440px;top:470px">✓ Lista</span><span class="estado elige eC" style="left:1290px;top:470px">Eligiendo…</span>` +
    `<span class="estado vino eCom" style="left:1050px;top:214px">✓ Comanda atendida</span><span class="estado vino ePago" style="left:1050px;top:232px">✓ Pago validado</span>` +
    `<div class="resu rA" style="left:220px;top:430px"><b>Mi cuenta · Ana</b><span>Pescado a la talla<i>$245</i></span><span>Flan<i>$85</i></span><strong>Total<i>$330</i></strong></div>` +
    `<div class="resu rC" style="left:1450px;top:430px"><b>Mi cuenta · Carlos</b><span>Arrachera<i>$230</i></span><span>Agua de jamaica<i>$45</i></span><strong>Total<i>$275</i></strong></div>`;
  const fb = ["salon", "sillas", "carlos", "carlos-brazo-cel", "mesa", "acrilico"].map(c => `<img src="${CINE}${c}.svg" alt="">`).join("");
  const rot = TOMAS.map((t, i) => t[4].length ? `<div class="r ${t[5]} r${i}">${t[4].map(l => `<span class="cln">${palabras(l)}</span>`).join("")}</div>` : "").join("");
  const etq = TOMAS.map((t, i) => t[3].length ? `<div class="etq e${i}">${t[3].map(([c, tx]) => `<span class="c${c}">${esc(tx)}</span>`).join("")}</div>` : "").join("");
  const globo = (k, x, y, quien, tx, cl = "ci") => `<div class="globo ${cl} g${k}" style="left:${x}px;top:${y}px"><b>${quien}</b>${tx}</div>`;
  return `<div id="cine" aria-hidden="true"><div class="cf"><i class="l1"></i><i class="vg"></i></div>
<div class="cesc">${capas}</div>
<div class="fondoB"><div class="fb">${fb}</div></div>
<img class="hombro" src="${CINE}hombro.svg" alt=""><div class="oscuro"></div>
${globo(1, 1010, 96, "Mesero", "Buenas noches. Aquí está la carta.")}${globo(2, 1010, 96, "Mesero", "También está en el QR.")}
${globo(3, 110, 206, "Ana", "Ya pedí. ¿Tú qué vas a pedir?", "cd ancho")}${globo(4, 1450, 206, "Carlos", "Estoy viendo, todavía no sé.", "ci ancho")}
${globo(5, 1010, 96, "Mesero", "¿Qué tal? Esto es lo que van a pedir…")}${globo(6, 110, 252, "Ana", "Sí, todo bien.", "cd")}
${globo(7, 1010, 96, "Mesero", "Gracias por venir. ¡Los esperamos pronto!")}
<div class="agarre"><img class="mano ma" src="${CINE}mano-atras.svg" alt=""><div class="cel"><div class="pan">${pantallas()}</div></div><img class="mano mf" src="${CINE}mano-frente.svg" alt=""><img class="dedo" src="${CINE}dedo.svg" alt=""><span class="nom nA">Ana</span></div>
<div class="agarre2"><div class="cel"><div class="pan">${pantallasB()}</div></div><span class="nom nC">Carlos</span></div>
<div class="reloj"><span class="x4">×4</span><span class="esfera"><i class="hh"></i><i class="mm"></i></span></div>
${rot}${etq}
<div class="marca"><b>Carta</b><i></i><span>Tu menú, Tu Carta.</span></div></div>`;
}

function filmEscala() {
  const el = $("#intro"), f = $("#cine"); if (!f) return;
  const s = Math.min(el.clientWidth / 1920, el.clientHeight / 1080);
  f.style.transform = `translate(${(el.clientWidth - 1920 * s) / 2}px,${(el.clientHeight - 1080 * s) / 2}px) scale(${s})`;
}

/* posiciones del teléfono de Ana (agarre) y del segundo teléfono (agarre2), en el cuadro de 1920×1080 */
const PA = {x: 1020, y: 127, rotation: -4, scale: 0.98}, PB = {x: 1000, y: 118, rotation: -2, scale: 1.06}, PC = {x: 1100, y: 150, rotation: 3, scale: 0.92};
const PF = {x: 330, y: 236, rotation: -3, scale: 0.8}, P2F = {x: 1190, y: 236, rotation: 3, scale: 0.8}, P2M = {x: 1220, y: 110, rotation: 0, scale: 1}, P2L = {x: 1420, y: 230, rotation: 0, scale: 0.62};
const aroColor = c => ({boxShadow: `0 0 0 8px ${c},0 0 40px 10px ${c}99`});

/* la línea de tiempo: estados iniciales con set en 0 y después tweens; buscar hacia atrás o adelante da el mismo cuadro */
function filmLinea() {
  const g = window.gsap; if (!g) return null;
  const tl = g.timeline({paused: true}), f = $("#cine"), q = s => [...f.querySelectorAll(s)];
  const T = id => tomaIni(id);
  const entra = (sel, t, d = 0.5, de = {}, a = {}) => tl.fromTo(q(sel), {autoAlpha: 0, ...de}, {autoAlpha: 1, duration: d, ease: "power2.out", immediateRender: false, ...a}, t);
  const sale = (sel, t, d = 0.4, a = {}) => tl.to(q(sel), {autoAlpha: 0, duration: d, ease: "power2.in", ...a}, t);
  const pon = (sel, t, v) => tl.set(q(sel), {autoAlpha: v ? 1 : 0}, t);
  const toque = (x, y, t, sel = ".pan .toque:not(.toque2)") => { tl.set(q(sel), {left: x, top: y}, t - 0.01); tl.fromTo(q(sel), {autoAlpha: 0.95, scale: 0.4}, {autoAlpha: 0, scale: 1.6, duration: 0.7, ease: "power2.out", immediateRender: false}, t); };
  const toque2 = (x, y, t) => toque(x, y, t, ".toque2");
  const dedo = (x, y, t, d = 0.45) => tl.to(q(".dedo"), {x, y, duration: d, ease: "power2.inOut"}, t);
  const toca = (x, y, t) => { dedo(x + 14, y + 46, t - 0.55, 0.42); tl.to(q(".dedo"), {x, y, duration: 0.12, ease: "power1.in"}, t - 0.12); toque(x, y, t); tl.to(q(".dedo"), {x: x + 14, y: y + 40, duration: 0.2}, t + 0.12); };
  const globo = (k, t, fin) => { entra(".g" + k, t, 0.45, {scale: 0.7, transformOrigin: k === 3 || k === 6 ? "90% 100%" : "10% 100%"}, {scale: 1, ease: "back.out(1.8)"}); sale(".g" + k, fin, 0.25); };
  const pantalla = (sel, t, d = 0.4) => entra(sel, t, d, {scale: 0.97}, {scale: 1});
  /* estado inicial */
  tl.set(q(".cesc > img, .gm, .c-mbc, .c-mbx, .buzz, .r, .etq, .globo, .agarre, .agarre2, .pan>.cs, .marca, .cpulso, .fondoB, .hombro, .oscuro, .dedo, .nom, .estado, .resu, .reloj, .aro, .conf"), {autoAlpha: 0}, 0);
  tl.set(q(".cesc"), {scale: 1, x: 0, y: 0}, 0);
  tl.set(q(".gm"), {x: 0, y: 0, scale: 1, transformOrigin: "960px 1000px"}, 0);
  tl.set(q(".agarre"), PA, 0);
  tl.set(q(".dedo"), {x: -160, y: 1200}, 0);
  tl.set(q(".aro"), aroColor("#66713d"), 0);
  /* rótulos y etiquetas: entran palabra por palabra al empezar cada toma y salen al terminar */
  TOMAS.forEach((t, i) => {
    const t0 = T0[i], t1 = T0[i + 1];
    if (t[3].length) { entra(".e" + i, t0 + 0.2, 0.5, {x: -16}, {x: 0}); sale(".e" + i, t1 - 0.4, 0.3); }
    if (t[4].length) {
      const rr = t0 + (t[6] || 0);
      tl.set(q(".r" + i), {autoAlpha: 1}, rr + 0.25);
      tl.fromTo(q(".r" + i + " .cw"), {y: 44, autoAlpha: 0}, {y: 0, autoAlpha: 1, duration: 0.7, ease: "back.out(1.5)", stagger: 0.12, immediateRender: false}, rr + 0.3);
      sale(".r" + i, t[7] ? t0 + t[7] : t1 - 0.45, 0.35);
    }
  });
  /* ===== acto 1 ===== */
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
  globo(1, t + 2.9, t + 4.6);
  tl.fromTo(q(".c-mbi"), {rotation: 0, transformOrigin: "888px 300px"}, {rotation: -16, duration: 0.6, ease: "power2.inOut", immediateRender: false}, t + 4.4);
  globo(2, t + 4.9, t + 6.6);
  tl.fromTo(q(".cpulso"), {autoAlpha: 0.95, scale: 0.5}, {autoAlpha: 0, scale: 1.5, duration: 1.0, ease: "power2.out", immediateRender: false}, t + 5.2);
  /* 3 · la cámara se va a la mano de Ana: escanea y entra a la carta (capturas reales) */
  t = T("escanea");
  sale(".c-ana-brazo", t, 0.3); entra(".c-ana-brazo-cel", t, 0.3);
  tl.to(q(".c-mbi"), {rotation: 0, duration: 0.5}, t);
  tl.to(q(".cesc"), {scale: 3.2, x: 960 - 3.2 * 690, y: 540 - 3.2 * 515, duration: 1.4, ease: "power2.in"}, t + 0.3);
  tl.to(q(".cesc > img, .gm"), {autoAlpha: 0, duration: 0.5, ease: "power1.in"}, t + 1.3);
  entra(".fondoB", t + 1.3, 0.7);
  tl.fromTo(q(".agarre"), {autoAlpha: 0, y: 420, scale: 0.9}, {autoAlpha: 1, y: PA.y, scale: PA.scale, duration: 1.0, ease: "power3.out", immediateRender: false}, t + 1.2);
  entra(".cs.visor", t + 1.2, 0.1);
  tl.fromTo(q(".ret"), {scale: 1.6, autoAlpha: 0.4}, {scale: 1, autoAlpha: 1, duration: 0.9, ease: "power3.out", immediateRender: false}, t + 2.0);
  entra(".det", t + 3.0, 0.4, {y: 14}, {y: 0, ease: "back.out(2)"});
  toque(200, 580, t + 3.7);
  entra(".cs.bien", t + 3.95, 0.35, {scale: 1.04}, {scale: 1});
  toque(200, 366, t + 5.4);
  entra(".cs.menu", t + 5.7, 0.4, {scale: 1.04}, {scale: 1});
  /* ===== acto 2: el teléfono en la mano de Ana, con el restaurante detrás ===== */
  /* 4 · la carta se adapta a lo que Ana no come */
  t = T("filtra");
  tl.to(q(".agarre"), {...PB, duration: 1.1, ease: "power3.inOut"}, t + 0.1);
  pantalla(".cs.pHola", t + 0.6, 0.45);
  const msj = q(".carga span");
  msj.forEach((m, k) => { tl.fromTo(m, {autoAlpha: 0, y: 10}, {autoAlpha: 1, y: 0, duration: 0.3, immediateRender: false}, t + 1.0 + k * 1.0); if (k < msj.length - 1) tl.to(m, {autoAlpha: 0, y: -10, duration: 0.25}, t + 1.75 + k * 1.0); });
  entra(".cs.pHola .cchips .cchip", t + 1.4, 0.45, {scale: 0.7}, {scale: 1, ease: "back.out(2)", stagger: 0.25});
  entra(".cs.pHola .tel", t + 2.0, 0.4);
  entra(".cs.pHola .cfuera .cno", t + 3.0, 0.3, {scale: 0.6}, {scale: 1, stagger: 0.2});
  tl.to(q(".cs.pHola .cfuera"), {height: 0, autoAlpha: 0, duration: 0.6, ease: "power2.inOut", stagger: 0.15}, t + 3.7);
  tl.to(q(".carga span:last-child"), {autoAlpha: 0, duration: 0.3}, t + 4.3);
  entra(".clisto", t + 4.5, 0.5, {y: 30, scale: 0.9}, {y: 0, scale: 1, ease: "back.out(1.8)"});
  /* 5 · sobre el hombro de Ana, con Carlos detrás: su Top 3, y su dedo la recorre */
  t = T("top3");
  entra(".hombro", t, 0.7, {x: -260}, {x: 0, ease: "power3.out"});
  tl.to(q(".agarre"), {...PC, duration: 0.8, ease: "power3.inOut"}, t);
  tl.to(q(".fondoB .fb"), {x: -420, duration: 1.2, ease: "power2.inOut"}, t);
  pantalla(".cs.pTop3", t + 0.1, 0.5);
  tl.set(q(".dedo"), {autoAlpha: 1}, t + 0.5);
  dedo(310, 330, t + 0.5, 0.5);
  tl.to(q(".dedo"), {x: 100, duration: 1.0, ease: "power2.inOut"}, t + 1.1);
  tl.fromTo(q(".cs.pTop3 .rail"), {x: 0}, {x: -300, duration: 1.0, ease: "power2.inOut", immediateRender: false}, t + 1.1);
  dedo(150, 520, t + 2.15, 0.35);
  tl.to(q(".cs.pTop3 .rail"), {x: 0, duration: 0.9, ease: "power2.inOut"}, t + 2.4);
  toca(130, 300, t + 4.0);
  /* 6 · el platillo como modelo en su torno: el plato quieto, el guiso gira en el plano del plato */
  t = T("plato");
  sale(".hombro", t, 0.5, {x: -260});
  tl.to(q(".agarre"), {...PB, duration: 0.8, ease: "power3.inOut"}, t);
  tl.to(q(".fondoB .fb"), {x: 0, duration: 1.0, ease: "power2.inOut"}, t);
  dedo(-160, 1200, t + 0.1, 0.6);
  pantalla(".cs.pPlato", t, 0.5);
  tl.fromTo(q(".torno .gir"), {rotation: 0}, {rotation: 360, duration: TOMAS[5][2] + TOMAS[6][2], ease: "none", immediateRender: false}, t);
  [0.6, 4.2, 7.8].forEach(d => tl.fromTo(q(".torno .brillo i"), {x: 0}, {x: 380, duration: 1.4, ease: "sine.inOut", immediateRender: false}, t + d));
  tl.set(q(".cs.pPlato .cabp, .cs.pPlato .vuela, .cs.pPlato .caviso"), {autoAlpha: 0}, t);
  entra(".cing", t + 1.2, 0.4, {y: 14, scale: 0.9}, {y: 0, scale: 1, ease: "back.out(2)", stagger: 0.18});
  entra(".cs.pPlato .reco", t + 2.6, 0.5, {y: 20}, {y: 0});
  /* 7 · «Agregar a mi orden»: su dedo toca y el platillo vuela a su mesa virtual */
  t = T("agrega");
  toca(200, 798, t + 0.8);
  tl.to(q(".agr"), {scale: 0.96, duration: 0.12, yoyo: true, repeat: 1}, t + 0.8);
  entra(".cs.pPlato .cabp", t + 0.6, 0.3);
  tl.fromTo(q(".vuela"), {autoAlpha: 1, x: 0, y: 0, scale: 1}, {x: 100, y: -84, scale: 0.3, duration: 0.9, ease: "power2.in", immediateRender: false}, t + 1.0);
  tl.to(q(".vuela"), {autoAlpha: 0, duration: 0.15}, t + 1.85);
  tl.fromTo(q(".pPlato .mia .bd"), {autoAlpha: 0, scale: 0.3}, {autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(3)", immediateRender: false}, t + 1.9);
  entra(".cs.pPlato .caviso", t + 2.1, 0.4, {y: 20}, {y: 0, ease: "back.out(1.6)"});
  /* ===== acto 3: la mesa pide junta ===== */
  /* 8 · la cámara se aleja a la mesa real: Ana lista, Carlos en gris, eligiendo */
  t = T("juntos");
  dedo(-160, 1200, t, 0.4);
  tl.to(q(".agarre"), {x: 760, y: 107, rotation: 0, scale: 0.3, autoAlpha: 0, duration: 0.7, ease: "power2.in"}, t);
  sale(".fondoB", t + 0.1, 0.6);
  entra(".c-salon, .c-sillas, .c-ana, .c-ana-brazo-cel, .c-carlos, .c-carlos-brazo-cel, .c-mesa, .c-acrilico", t + 0.1, 0.6);
  tl.to(q(".cesc"), {scale: 1, x: 0, y: 0, duration: 1.5, ease: "power2.inOut"}, t + 0.3);
  tl.fromTo(q(".c-carlos, .c-carlos-brazo-cel"), {filter: "grayscale(0) brightness(1)"}, {filter: "grayscale(0.9) brightness(0.8)", duration: 0.6, immediateRender: false}, t + 1.4);
  entra(".eA", t + 1.7, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2)"});
  entra(".eC", t + 1.9, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2)"});
  globo(3, t + 2.3, t + 4.3);
  globo(4, t + 4.4, t + 6.2);
  /* 9 · Ana aún es nueva en Carta; elige una arrachera y se la manda a Carlos (visión) */
  t = T("recomienda");
  sale(".cesc > img, .eA, .eC", t, 0.5);
  entra(".fondoB", t, 0.5);
  pon(".cs.pAviso", t, true);
  tl.fromTo(q(".agarre"), {...PF, autoAlpha: 0, y: PF.y + 120}, {...PF, autoAlpha: 1, duration: 0.7, ease: "power3.out", immediateRender: false}, t + 0.2);
  pon(".cs.pCarlos", t, true);
  tl.fromTo(q(".agarre2"), {...P2F, autoAlpha: 0, y: P2F.y + 120}, {...P2F, autoAlpha: 1, duration: 0.7, ease: "power3.out", immediateRender: false}, t + 0.35);
  entra(".nom", t + 0.8, 0.4);
  tl.set(q(".dedo"), {autoAlpha: 1}, t + 0.8);
  toca(200, 312, t + 1.7);
  pantalla(".cs.pRes", t + 1.85, 0.35);
  toca(200, 726, t + 3.2);
  entra(".cs.pRes .toast", t + 3.35, 0.35, {y: -14}, {y: 0});
  entra(".reco2", t + 3.9, 0.45, {y: 30, scale: 0.92}, {y: 0, scale: 1, ease: "back.out(1.6)"});
  dedo(-160, 1200, t + 4.2, 0.6);
  toque2(200, 498, t + 5.4);
  sale(".reco2", t + 5.6, 0.3);
  entra(".cs.pCarlos .toast", t + 5.6, 0.35, {y: -14}, {y: 0});
  entra(".conf", t + 5.9, 0.4, {y: 20}, {y: 0});
  /* 10 · Carlos confirma: la mesa llama al mesero */
  t = T("confirma");
  toque2(200, 800, t + 0.8);
  pantalla(".cs.pListosB", t + 0.95, 0.4);
  pantalla(".cs.pListosA", t + 1.25, 0.4);
  tl.to(q(".c-carlos, .c-carlos-brazo-cel"), {filter: "grayscale(0) brightness(1)", duration: 0.1}, t + 1);
  /* ===== acto 4: el mesero ===== */
  /* 11 · el mesero despide a otra mesa; le vibra el bolsillo (aviso con el teléfono bloqueado: visión); «Ya voy» */
  t = T("avisa");
  sale(".agarre, .agarre2, .nom", t, 0.5);
  sale(".fondoB", t, 0.6);
  entra(".c-salon, .c-sillas, .c-ana, .c-ana-brazo, .c-carlos, .c-carlos-brazo, .c-mesa, .c-acrilico", t + 0.1, 0.6);
  tl.set(q(".gm"), {x: -560, y: -250, scale: 0.66}, t);
  pon(".c-mbd", t, false); pon(".c-mbx", t, true);
  entra(".gm", t + 0.3, 0.6);
  tl.fromTo(q(".c-mbx"), {rotation: 0, transformOrigin: "1034px 300px"}, {rotation: -14, duration: 0.5, yoyo: true, repeat: 1, ease: "sine.inOut", immediateRender: false}, t + 0.9);
  tl.fromTo(q(".buzz"), {autoAlpha: 0, scale: 0.6}, {autoAlpha: 1, scale: 1.15, duration: 0.25, yoyo: true, repeat: 5, ease: "sine.inOut", immediateRender: false}, t + 1.7);
  tl.fromTo(q(".gm > img"), {x: 0}, {x: 3, duration: 0.06, yoyo: true, repeat: 13, immediateRender: false}, t + 1.7);
  entra(".oscuro", t + 3.0, 0.4);
  pon(".cs.bloq", t + 2.9, true);
  tl.fromTo(q(".agarre2"), {...P2M, autoAlpha: 0, y: P2M.y + 200}, {...P2M, autoAlpha: 1, duration: 0.7, ease: "power3.out", immediateRender: false}, t + 3.0);
  toque2(200, 425, t + 4.5);
  pantalla(".cs.pOrden", t + 4.65, 0.4);
  tl.to(q(".agarre2"), {autoAlpha: 0, y: P2M.y + 200, duration: 0.5, ease: "power2.in"}, t + 5.8);
  sale(".oscuro", t + 5.9, 0.4);
  pon(".c-mbx", t + 5.9, false); pon(".c-mbc", t + 5.9, true);
  tl.to(q(".gm"), {x: 0, y: 0, scale: 1, duration: 1.8, ease: "power1.inOut"}, t + 6.0);
  tl.fromTo(q(".gm > img"), {y: 0}, {y: -8, duration: 0.22, yoyo: true, repeat: 7, ease: "sine.inOut", immediateRender: false}, t + 6.0);
  /* 12 · llega a la mesa, repasa la orden y la manda */
  t = T("llega");
  globo(5, t + 0.3, t + 2.6);
  globo(6, t + 2.8, t + 4.4);
  entra(".eCom", t + 4.5, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2)"});
  /* ===== acto 5: el personal lleva la mesa, a cámara rápida ===== */
  const a5 = T("abierta"), d5 = T("fin") - a5;
  entra(".reloj", a5, 0.4);
  tl.fromTo(q(".reloj .hh"), {rotation: 240}, {rotation: 300, duration: d5, ease: "none", immediateRender: false}, a5);
  tl.fromTo(q(".reloj .mm"), {rotation: 0}, {rotation: 720, duration: d5, ease: "none", immediateRender: false}, a5);
  entra(".aro", a5, 0.6);
  /* 13 · abierta: llegan los platos y se vacían; piden postre */
  t = a5;
  sale(".eCom", t, 0.3);
  tl.to(q(".gm"), {x: 300, autoAlpha: 0, duration: 0.6, ease: "power2.in"}, t + 0.1);
  entra(".cp1, .cp2", t + 0.5, 0.4, {y: -24}, {y: 0, stagger: 0.15});
  sale(".cp1, .cp2", t + 1.9, 0.4);
  entra(".cp3", t + 2.4, 0.4, {y: -24}, {y: 0});
  /* 14 · cuenta cerrada: cada quien mira su resumen */
  t = T("cerrada");
  tl.to(q(".aro"), {...aroColor("#b8860b"), duration: 0.5}, t);
  sale(".c-ana-brazo, .c-carlos-brazo", t, 0.25); entra(".c-ana-brazo-cel, .c-carlos-brazo-cel", t, 0.25);
  sale(".cp3", t + 0.2, 0.3);
  entra(".rA, .rC", t + 0.6, 0.45, {y: 20, scale: 0.92}, {y: 0, scale: 1, ease: "back.out(1.6)", stagger: 0.2});
  /* 15 · pagada: el mesero valida el pago (hecho fuera de Carta) y los despide */
  t = T("pagada");
  tl.to(q(".aro"), {...aroColor("#9b3a52"), duration: 0.5}, t);
  sale(".rA, .rC", t + 0.1, 0.3);
  sale(".c-ana-brazo-cel, .c-carlos-brazo-cel", t + 0.2, 0.25); entra(".c-ana-brazo, .c-carlos-brazo", t + 0.2, 0.25);
  tl.fromTo(q(".gm"), {x: 260, autoAlpha: 0}, {x: 0, autoAlpha: 1, duration: 0.7, ease: "power2.out", immediateRender: false}, t + 0.1);
  tl.fromTo(q(".gm > img"), {y: 0}, {y: 6, duration: 0.18, yoyo: true, repeat: 3, ease: "sine.inOut", immediateRender: false}, t + 0.9);
  entra(".ePago", t + 1.0, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2)"});
  globo(7, t + 1.4, t + 3.3);
  /* 16 · mesa limpia: se van, el mesero limpia y lo marca en su teléfono */
  t = T("limpia");
  tl.to(q(".aro"), {...aroColor("#e9dcc0"), duration: 0.5}, t);
  sale(".ePago", t, 0.3);
  tl.to(q(".c-ana, .c-ana-brazo"), {x: -80, autoAlpha: 0, duration: 0.6, ease: "power2.in"}, t + 0.1);
  tl.to(q(".c-carlos, .c-carlos-brazo"), {x: 80, autoAlpha: 0, duration: 0.6, ease: "power2.in"}, t + 0.2);
  tl.fromTo(q(".c-mbi"), {rotation: 0, transformOrigin: "888px 300px"}, {rotation: -22, duration: 0.25, yoyo: true, repeat: 3, ease: "sine.inOut", immediateRender: false}, t + 0.6);
  pon(".cs.pLimpia", t + 1.0, true);
  tl.fromTo(q(".agarre2"), {...P2L, autoAlpha: 0, y: P2L.y + 160}, {...P2L, autoAlpha: 1, duration: 0.6, ease: "power3.out", immediateRender: false}, t + 1.0);
  toque2(200, 800, t + 2.1);
  entra(".cs.pLimpia .hecho", t + 2.25, 0.35, {scale: 0.9}, {scale: 1});
  /* cierre */
  t = T("fin");
  sale(".cesc > img, .gm, .agarre2, .reloj, .aro", t - 0.1, 0.6);
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
