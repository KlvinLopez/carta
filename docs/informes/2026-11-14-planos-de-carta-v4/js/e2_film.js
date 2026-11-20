/* ===== la película: una mesa de restaurante contada como cine (cinco actos) =====
   Dirección de arte: cine con la identidad de Carta. Campo oscuro cálido, vino y dorado; las personas son siluetas sin rasgos
   dibujados que la luz de la vela modela; el salón ya viene desenfocado (bokeh) y la mesa y la comida son lo más luminoso.
   Franjas de cine arriba y abajo: arriba van las etiquetas de alcance (hoy · Fase 3 · visión), abajo el diálogo; cada rótulo
   grande cae en una zona del cuadro que la toma deja limpia. Todas las capas salen de apoyo/cine/generar.mjs (webp pintado en
   Chromium desde ese guion) y su caja viaja en la tabla CAPAS de abajo.
   Pantallas de hoy: capturas reales de apoyo/ (datos de ejemplo). Pantallas de la Fase 3 y de la visión: dibujadas aquí con el
   lenguaje de Carta, para que no parezcan capturas. Todo lo del comensal (filtros, gustos) vive en su teléfono: regla dura 10.
   El cobro ocurre fuera de Carta: no hay pantalla de pago. Cada teléfono está en una mano (dorso detrás, pulgar y yemas delante;
   quien toca es la otra mano de la misma persona) y cada cambio de plano funde el conjunto entero: ninguna pieza se despega.
   Ojo al editar: todos los js/*.js comparten un solo ámbito global y la hoja de la plantilla estiliza clases genéricas
   (.esc, .chip, .fila, .s, .w y #intro svg{width:100%}): aquí todo nombre lleva prefijo (c…) y el CSS va bajo #cine. */
/* CAPAS:inicio (lo escribe apoyo/cine/generar.mjs; no editar a mano) */
const CAPAS = {
  "fondo": ["apoyo/cine/fondo.webp", 0, 0, 1920, 1080],
  "ana-silla": ["apoyo/cine/ana-silla.webp", 302, 562, 220, 520],
  "ana-cuerpo": ["apoyo/cine/ana-cuerpo.webp", 342, 562, 280, 520],
  "ana-cabeza": ["apoyo/cine/ana-cabeza.webp", 372, 428, 160, 190],
  "ana-brazo": ["apoyo/cine/ana-brazo.webp", 342, 422, 400, 380],
  "ana-brazo-cel": ["apoyo/cine/ana-brazo-cel.webp", 342, 422, 400, 380],
  "ana-brazo-carta": ["apoyo/cine/ana-brazo-carta.webp", 342, 422, 400, 380],
  "ana-brazo-copa": ["apoyo/cine/ana-brazo-copa.webp", 342, 422, 400, 380],
  "carlos-silla": ["apoyo/cine/carlos-silla.webp", 1398, 562, 220, 520],
  "carlos-cuerpo": ["apoyo/cine/carlos-cuerpo.webp", 1298, 562, 280, 520],
  "carlos-cabeza": ["apoyo/cine/carlos-cabeza.webp", 1388, 428, 160, 190],
  "carlos-brazo": ["apoyo/cine/carlos-brazo.webp", 1178, 422, 400, 380],
  "carlos-brazo-cel": ["apoyo/cine/carlos-brazo-cel.webp", 1178, 422, 400, 380],
  "carlos-brazo-carta": ["apoyo/cine/carlos-brazo-carta.webp", 1178, 422, 400, 380],
  "carlos-brazo-copa": ["apoyo/cine/carlos-brazo-copa.webp", 1178, 422, 400, 380],
  "sofia-cuerpo": ["apoyo/cine/sofia-cuerpo.webp", 630, 530, 340, 280],
  "sofia-cabeza": ["apoyo/cine/sofia-cabeza.webp", 690, 350, 220, 300],
  "sofia-brazos": ["apoyo/cine/sofia-brazos.webp", 600, 350, 400, 430],
  "sofia-brazos-cel": ["apoyo/cine/sofia-brazos-cel.webp", 600, 350, 400, 430],
  "sofia-brazos-carta": ["apoyo/cine/sofia-brazos-carta.webp", 600, 350, 400, 430],
  "diego-cuerpo": ["apoyo/cine/diego-cuerpo.webp", 910, 530, 340, 280],
  "diego-cabeza": ["apoyo/cine/diego-cabeza.webp", 970, 350, 220, 300],
  "diego-brazos": ["apoyo/cine/diego-brazos.webp", 880, 350, 400, 430],
  "diego-brazos-cel": ["apoyo/cine/diego-brazos-cel.webp", 880, 350, 400, 430],
  "diego-brazos-carta": ["apoyo/cine/diego-brazos-carta.webp", 880, 350, 400, 430],
  "mesero-cuerpo": ["apoyo/cine/mesero-cuerpo.webp", 1080, 270, 340, 540],
  "mesero-cabeza": ["apoyo/cine/mesero-cabeza.webp", 1170, 162, 160, 190],
  "mesero-brazos": ["apoyo/cine/mesero-brazos.webp", 860, 440, 720, 380],
  "mesero-brazos-carta": ["apoyo/cine/mesero-brazos-carta.webp", 860, 440, 720, 380],
  "mesero-brazos-cel": ["apoyo/cine/mesero-brazos-cel.webp", 860, 440, 720, 380],
  "mesero-brazos-libreta": ["apoyo/cine/mesero-brazos-libreta.webp", 860, 440, 720, 380],
  "mesero-brazos-tableta": ["apoyo/cine/mesero-brazos-tableta.webp", 860, 440, 720, 380],
  "mesero-brazos-terminal": ["apoyo/cine/mesero-brazos-terminal.webp", 860, 440, 720, 380],
  "mesero-brazos-trapo": ["apoyo/cine/mesero-brazos-trapo.webp", 860, 440, 720, 380],
  "ticket": ["apoyo/cine/ticket.webp", 1060, 720, 150, 110],
  "pastel": ["apoyo/cine/pastel.webp", 876, 700, 160, 124],
  "mesa": ["apoyo/cine/mesa.webp", 380, 690, 1160, 390],
  "montaje": ["apoyo/cine/montaje.webp", 560, 720, 800, 100],
  "copa-a": ["apoyo/cine/copa-a.webp", 776, 640, 60, 132],
  "copa-c": ["apoyo/cine/copa-c.webp", 1082, 640, 60, 132],
  "vela": ["apoyo/cine/vela.webp", 862, 706, 80, 90],
  "llama": ["apoyo/cine/llama.webp", 886, 688, 32, 52],
  "resplandor": ["apoyo/cine/resplandor.webp", 522, 336, 760, 760],
  "acrilico": ["apoyo/cine/acrilico.webp", 916, 644, 140, 140],
  "qr-brillo": ["apoyo/cine/qr-brillo.webp", 836, 558, 300, 300],
  "platillo-a": ["apoyo/cine/platillo-a.webp", 582, 718, 248, 100],
  "platillo-c": ["apoyo/cine/platillo-c.webp", 1090, 718, 248, 100],
  "sucia-a": ["apoyo/cine/sucia-a.webp", 570, 720, 300, 110],
  "sucia-c": ["apoyo/cine/sucia-c.webp", 1080, 720, 300, 110],
  "sucia-vaso": ["apoyo/cine/sucia-vaso.webp", 740, 730, 370, 120],
  "sucia-migas": ["apoyo/cine/sucia-migas.webp", 630, 744, 660, 72],
  "nuevos": ["apoyo/cine/nuevos.webp", 0, 280, 820, 800],
  "ana-mano-atras": ["apoyo/cine/ana-mano-atras.webp", -700, 270, 1180, 900],
  "ana-mano-frente": ["apoyo/cine/ana-mano-frente.webp", -100, 270, 580, 480],
  "ana-dedo": ["apoyo/cine/ana-dedo.webp", -40, -30, 920, 1130],
  "carlos-mano-atras": ["apoyo/cine/carlos-mano-atras.webp", -80, 270, 1180, 900],
  "carlos-mano-frente": ["apoyo/cine/carlos-mano-frente.webp", -80, 270, 580, 480],
  "carlos-dedo": ["apoyo/cine/carlos-dedo.webp", -880, -30, 920, 1130],
  "mesero-mano-atras": ["apoyo/cine/mesero-mano-atras.webp", -700, 270, 1180, 900],
  "mesero-mano-frente": ["apoyo/cine/mesero-mano-frente.webp", -100, 270, 580, 480],
  "mesero-dedo": ["apoyo/cine/mesero-dedo.webp", -40, -30, 920, 1130],
  "sofia-mano-atras": ["apoyo/cine/sofia-mano-atras.webp", -700, 270, 1180, 900],
  "sofia-mano-frente": ["apoyo/cine/sofia-mano-frente.webp", -100, 270, 580, 480],
  "sofia-dedo": ["apoyo/cine/sofia-dedo.webp", -40, -30, 920, 1130],
  "diego-mano-atras": ["apoyo/cine/diego-mano-atras.webp", -80, 270, 1180, 900],
  "diego-mano-frente": ["apoyo/cine/diego-mano-frente.webp", -80, 270, 580, 480],
  "diego-dedo": ["apoyo/cine/diego-dedo.webp", -880, -30, 920, 1130],
  "visor": ["apoyo/cine/visor.webp", 0, 0, 400, 866],
  "plato-pescado": ["apoyo/cine/plato-pescado.webp", 0, 0, 400, 400],
  "torno-plato": ["apoyo/cine/torno-plato.webp", 0, 0, 400, 400],
  "torno-pez": ["apoyo/cine/torno-pez.webp", 0, 0, 400, 400],
  "torno-adorno": ["apoyo/cine/torno-adorno.webp", 0, 0, 400, 400],
  "plato-aguachile": ["apoyo/cine/plato-aguachile.webp", 0, 0, 400, 400],
  "plato-tacos": ["apoyo/cine/plato-tacos.webp", 0, 0, 400, 400],
  "plato-ensalada": ["apoyo/cine/plato-ensalada.webp", 0, 0, 400, 400],
  "plato-enchiladas": ["apoyo/cine/plato-enchiladas.webp", 0, 0, 400, 400],
  "plato-mole": ["apoyo/cine/plato-mole.webp", 0, 0, 400, 400],
  "plato-res": ["apoyo/cine/plato-res.webp", 0, 0, 400, 400],
  "plato-flan": ["apoyo/cine/plato-flan.webp", 0, 0, 400, 400],
  "plato-jamaica": ["apoyo/cine/plato-jamaica.webp", 0, 0, 400, 400],
  "plato-limonada": ["apoyo/cine/plato-limonada.webp", 0, 0, 400, 400],
  "cerca-fondo": ["apoyo/cine/cerca-fondo.webp", 0, 0, 1920, 1080],
  "grano": ["apoyo/cine/grano.webp", 0, 0, 256, 256],
};
/* CAPAS:fin */
const CAP = {bien: "apoyo/bienvenida.webp", menu: "apoyo/menu-inicio.webp"};
const CI = n => CAPAS[n][0];
/* [id, acto, duración en s, alcance de lo que muestra ([etapa, qué es]: no se rotula durante la película, se ofrece en la tarjeta final),
   rótulo (la cursiva entre *), posición del rótulo, retraso del rótulo en s, segundos que dura el rótulo,
   fracción de la toma que sirve de cuadro fijo en el guion gráfico (0.82 si no se dice)] */
const CICLO = [["f3", "El personal lleva el ciclo de la mesa: abierta, cuenta cerrada, pagada y mesa limpia"]];
const TOMAS = [
  /* A · el gancho */
  ["mesa", 1, 5.5, [["hoy", "El QR de cada mesa"]], ["Todo empieza en *la mesa*."], "hook", 0.6],
  ["cumple", 1, 6.5, [], ["Mira esta mesa: *un cumpleaños, cuatro amigos*."], "linea", 1.0],
  /* B · las problemáticas, rápidas: el problema es el sistema, no las personas */
  ["b1", 2, 9.5, [], ["Ponerse de acuerdo, *al tanteo*."], "linea", 0.3],
  ["b2", 2, 14.5, [], ["Un menú que *no te conoce*."], "linea", 0.3],
  ["b3", 2, 8, [], ["Cuatro órdenes, *a mano*."], "linea", 0.3],
  ["b3t", 2, 5, [], ["En papel o en tableta, *el mismo problema*."], "linea", 0.3],
  ["ticket", 2, 6.5, [], ["Un solo papel *para todos*."], "linea", 2.7],
  ["b4", 2, 8.5, [], ["Una cuenta, *cuatro calculadoras*."], "linea", 0.3],
  ["pivote", 2, 4, [], ["¿Y si lo", "*reimaginamos*?"], "medio", 0.5],
  /* C · Carta, en el mismo orden */
  ["escanea", 3, 7.5, [["hoy", "Entrar con el QR, sin descarga ni registro (capturas reales de la app, con datos de ejemplo)"]], ["Sin descarga.", "*Sin registro*."], "izq", 1.8],
  ["filtra", 3, 6.5, [["hoy", "Lo agotado se ve atenuado en la carta"], ["hoy", "Filtros de alérgenos que viven en tu teléfono (no sustituyen preguntar al personal)"], ["vis", "Una carta que aprende de tus visitas"]], ["~Antes: preguntar platillo por platillo.", "Lo que no comes,", "*fuera*."], "izq"],
  ["top3", 3, 7.5, [["vis", "«Elegido para ti»"]], ["Elegido", "*para ti*."], "izq"],
  ["plato", 3, 6.5, [["vis", "El platillo como modelo que gira, con sus ingredientes"]], ["Sabe lo que", "*lleva*."], "izq"],
  ["agrega", 3, 4, [["f3", "Agregar platillos a la orden de la mesa"]], ["Directo a", "*tu mesa*."], "izq"],
  ["juntos", 4, 7, [["f3", "La mesa pide junta: cada quien ve lo de todos"]], ["~Antes: al tanteo.", "La mesa *pide junta*."], "hook", 1.4],
  ["recomienda", 4, 7, [["vis", "Pasarle un platillo a otra persona de la mesa"]], ["Pásaselo *a Carlos*."], "centro"],
  ["confirma", 4, 4.5, [["f3", "La mesa manda una sola comanda desde los teléfonos y avisa al mesero"]], ["La mesa *llama al mesero*."], "centro"],
  ["avisa", 4, 6, [["f3", "El mesero recibe la comanda en su teléfono"], ["vis", "Aviso con el teléfono bloqueado"]], ["Al mesero le llega", "*al instante*."], "izq", 0.2, 4.2, 0.6],
  ["llega", 4, 9, [["f3", "El mesero valida y atiende la comanda"]], ["~Antes: cuatro órdenes, a mano.", "Una sola comanda. *Él la valida*."], "linea"],
  ["abierta", 5, 6.5, CICLO, ["Abierta"], "fase", 0.8],
  ["piden", 5, 7.8, CICLO, [], ""],
  ["cierran", 5, 5.5, [["f3", "Cada quien cierra su cuenta desde el seguimiento de su orden"]], ["Cuenta *cerrada*"], "fase", 2.7],
  ["cuenta", 5, 9.5, [["f3", "Cada quien ve su cuenta, con su propina"], ["vis", "Decir qué te gustó"], ["v11", "Invitar a alguien: lo suyo se reparte solo entre quienes invitan"]], ["~Antes: un ticket y cuatro calculadoras.", "Cada quien, *su cuenta*."], "linea", 0.5],
  ["pagada", 5, 6.5, [["f3", "El cobro ocurre fuera de Carta (terminal o efectivo); el mesero valida el pago"]], ["Pagada"], "fase", 3.6],
  ["sucia", 5, 5, CICLO, ["Mesa *sucia*"], "fase", 1.2],
  ["limpia", 5, 5.5, CICLO, ["Mesa *limpia*"], "fase", 1.6, 3.4],
  ["fin", 6, 5, [], [], ""],
];
const ACTOS = [[1, "El gancho"], [2, "El problema"], [3, "Tu carta"], [4, "La mesa"], [5, "El ciclo"], [6, "Fin"]];
const T0 = TOMAS.reduce((a, t) => (a.push(a[a.length - 1] + t[2]), a), [0]);
const TOT = T0[T0.length - 1], TOTI = TOT * 1000;
const tomaIni = id => T0[TOMAS.findIndex(t => t[0] === id)];
const ACT_INI = ACTOS.map(([n]) => T0[TOMAS.findIndex(t => t[1] === n)]);
const ACT_FIN = ACTOS.map((_, k) => (k + 1 < ACTOS.length ? ACT_INI[k + 1] : TOT));
/* instantes de guion gráfico (movimiento reducido): el momento de cada toma en que ya está todo en pantalla */
const CLAVES = TOMAS.map((t, i) => T0[i] + t[2] * (t[8] || 0.82));
let tI = 0, pausaI = false, rafI = 0, ultI = 0, ocultoT = 0, tlF = null;

const cineCss = `
#cine{position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:0 0;overflow:hidden;background:#171210;font-family:'DM Sans',sans-serif;color:#fef9f1}
#cine *{box-sizing:border-box}
#intro #cine svg{width:16px;height:16px;max-height:none;display:inline-block;margin:0;flex:none}
#intro #cine .cing svg{width:24px;height:24px}#intro #cine .clisto svg{width:24px;height:24px}
#intro > .ictl:not(.barras):not(.cactos){position:absolute;top:16px;right:16px;z-index:6}
/* el campo: oscuro cálido con un resplandor vino y otro dorado */
#cine .cf{position:absolute;inset:0;z-index:0;background:radial-gradient(ellipse 70% 62% at 50% 64%,#2a1b16 0%,#1d1411 52%,#171210 100%)}
#cine .cf i{position:absolute;border-radius:50%}
#cine .cf .l1{left:310px;top:260px;width:1300px;height:940px;background:radial-gradient(closest-side,rgba(107,45,62,.6),rgba(107,45,62,0))}
#cine .cf .l2{left:600px;top:430px;width:720px;height:560px;background:radial-gradient(closest-side,rgba(184,134,11,.24),rgba(184,134,11,0))}
/* los dos decorados: la sala (plano abierto, con cámara) y el primer plano de las manos */
#cine .sala,#cine .cerca,#cine .pfon,#cine .pfig,#cine .gp,#cine .cfon{position:absolute;left:0;top:0;width:1920px;height:1080px}
#cine .sala{z-index:1}#cine .cerca{z-index:2;opacity:0;visibility:hidden}
#cine .pfig{transform-origin:0 0}
#cine img.k{position:absolute;display:block;max-width:none}
#cine .k-resplandor,#cine .k-qr-brillo{mix-blend-mode:screen}
#cine .buzz{position:absolute;left:1312px;top:612px;width:60px;height:60px;opacity:0;visibility:hidden}
#cine .buzz i{position:absolute;inset:0;border-radius:50%;border:4px solid #fdc34d;border-left-color:transparent;border-bottom-color:transparent}
#cine .buzz i+i{inset:-14px}
/* cine: grano, viñeta y franjas */
#cine .grano{position:absolute;inset:0;z-index:5;background:url(${CI("grano")});opacity:.09;pointer-events:none;animation:cgrano .5s steps(1) infinite}
@keyframes cgrano{0%{background-position:0 0}25%{background-position:-90px 60px}50%{background-position:70px -110px}75%{background-position:-40px -50px}}
@media(prefers-reduced-motion:reduce){#cine .grano{animation:none}}
#cine .vin{position:absolute;left:0;right:0;top:100px;bottom:100px;z-index:5;pointer-events:none;background:radial-gradient(ellipse 76% 82% at 50% 54%,rgba(10,6,5,0) 50%,rgba(10,6,5,.66) 100%)}
#cine .franja{position:absolute;left:0;right:0;height:100px;z-index:6;background:#0c0908}
#cine .franja.fa{top:0}#cine .franja.fb{bottom:0}
/* diálogo: sale de la boca de quien habla, con una cola hacia ella, en la zona limpia junto a su cara */
#cine .globo{position:absolute;z-index:7;max-width:520px;padding:13px 22px;border-radius:24px;background:rgba(23,18,16,.78);box-shadow:inset 0 0 0 1.5px rgba(253,195,77,.34),0 14px 30px rgba(8,4,3,.4);font-size:30px;line-height:1.22;font-style:italic;color:#fef9f1;opacity:0;visibility:hidden}
#cine .globo::after{content:"";position:absolute;top:50%;width:16px;height:16px;margin-top:-8px;background:rgba(23,18,16,.78);transform:rotate(45deg)}
#cine .globo.gl-i::after{left:-8px;box-shadow:inset 1.5px -1.5px 0 rgba(253,195,77,.34)}
#cine .globo.gl-d::after{right:-8px;box-shadow:inset -1.5px 1.5px 0 rgba(253,195,77,.34)}
#cine .globo.gl-a::after,#cine .globo.gl-b::after,#cine .globo.gl-c::after{top:auto;bottom:-8px;margin:0;box-shadow:inset -1.5px -1.5px 0 rgba(253,195,77,.34)}
#cine .globo.gl-a::after{left:50%;margin-left:-8px}#cine .globo.gl-b::after{left:84%;margin-left:-8px}#cine .globo.gl-c::after{left:16%;margin-left:-8px}
/* rótulos: cada posición cae en la zona limpia de su toma */
#cine .r{position:absolute;z-index:7;opacity:0;visibility:hidden;font-family:'DM Serif Display',serif;font-weight:400;line-height:1.05;letter-spacing:-.01em;text-shadow:0 4px 30px rgba(10,6,5,.6)}
#cine .r .cln{display:block;white-space:nowrap}
#cine .r .cw{display:inline-block}
#cine .r em{font-style:italic;color:#fdc34d}
#cine .r.hook{left:0;right:0;top:134px;text-align:center;font-size:100px}
#cine .r.arriba{left:112px;top:140px;font-size:80px}
#cine .r.izq{left:120px;top:372px;font-size:100px}
#cine .r.centro{left:0;right:0;top:116px;text-align:center;font-size:74px}
#cine .r.centro .cln,#cine .r.hook .cln{width:max-content;margin:0 auto}
#cine .r.fase{left:112px;top:134px;font-size:92px}
#cine .r.linea{left:112px;top:128px;font-size:64px}
#cine .r .cln.ck{font-family:'DM Sans',sans-serif;font-size:30px;font-weight:500;letter-spacing:0;line-height:1.2;color:rgba(254,249,241,.72);margin-bottom:12px;text-shadow:none}
#cine .r.linea .cln.ck{margin-bottom:6px}
/* la lupa: un círculo que amplía lo que alguien ve en su pantalla o en su papel; un aro dorado marca de dónde sale */
#cine .lupa{position:absolute;left:1520px;top:136px;width:320px;height:320px;border-radius:50%;overflow:hidden;z-index:4;background:#fef9f1;box-shadow:0 0 0 4px rgba(253,195,77,.85),0 0 0 11px rgba(23,18,16,.55),0 30px 60px rgba(8,4,3,.5);opacity:0;visibility:hidden}
#cine .lmarca{position:absolute;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;z-index:4;box-shadow:0 0 0 3px rgba(253,195,77,.85);opacity:0;visibility:hidden}
#cine .lpdf{position:absolute;left:0;top:0;width:560px;padding:26px 28px;background:#fbf6ec;color:#2a1c16;transform-origin:0 0}
#cine .lpdf h5{margin:0 0 4px;font:400 30px 'DM Serif Display',serif;text-align:center;color:#4f1728}
#cine .lpdf h6{margin:12px 0 4px;font:700 12px 'DM Sans',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#8a6a2a}
#cine .lpdf .lcol{column-count:2;column-gap:26px}
#cine .lpdf p{margin:0;display:flex;justify-content:space-between;gap:8px;font-size:12.5px;line-height:1.75;break-inside:avoid}
#cine .lpdf p i{font-style:normal;color:#6b5a48}
#cine .ltab{position:absolute;inset:0;background:#1c1614;color:#fef9f1;padding:70px 56px 0}
#cine .ltab b{display:block;font:400 26px 'DM Serif Display',serif}
#cine .ltab u{display:block;height:14px;border-radius:7px;background:rgba(254,249,241,.14);margin-top:14px;text-decoration:none}
#cine .ltab span{position:absolute;left:0;right:0;top:214px;text-align:center;font-size:19px;color:rgba(254,249,241,.75)}
#cine .ltab .ctab{position:absolute;left:138px;top:150px;width:44px;height:44px;border-radius:50%;border:5px solid rgba(254,249,241,.25);border-top-color:#fdc34d}
#cine .ltk{position:absolute;left:36px;top:0;width:248px;padding:22px 18px 30px;background:#fff;color:#2a2420;font-size:14px;line-height:1.72}
#cine .ltk b{display:block;text-align:center;font-size:15px;letter-spacing:.12em;margin-bottom:8px}
#cine .ltk p{margin:0;display:flex;justify-content:space-between;gap:10px}
#cine .ltk p.lt{margin-top:8px;padding-top:8px;box-shadow:inset 0 1.5px 0 #2a2420;font-weight:700;font-size:16px}
/* la pluma del mesero y su trazo sobre la libreta */
#intro #cine svg.ctrazo{position:absolute;left:1196px;top:520px;width:56px;height:76px;transform:rotate(-8deg);opacity:0;visibility:hidden}
#cine .cpluma{position:absolute;left:1202px;top:486px;width:5px;height:46px;border-radius:3px;background:#17110f;transform-origin:50% 100%;opacity:0;visibility:hidden}

#cine .r.medio{left:0;right:0;top:390px;text-align:center;font-size:124px}
#cine .r.medio .cln{width:max-content;margin:0 auto}
/* el teléfono en su mano: dorso detrás, marco, pulgar y yemas delante, y el índice de la otra mano */
#cine .agarre{position:absolute;left:0;top:0;width:400px;height:866px;transform-origin:0 0;opacity:0;visibility:hidden}
#cine .cel{position:absolute;inset:0;border-radius:56px;box-shadow:0 0 0 11px #100c0a,0 0 0 13px #3a322d}
#cine .nom{position:absolute;left:50%;top:-62px;transform:translateX(-50%);padding:8px 20px;border-radius:999px;background:rgba(254,249,241,.1);color:#fef9f1;font-size:24px;font-weight:600;white-space:nowrap;opacity:0;visibility:hidden}
/* el recuadro del acto 5: el teléfono del mesero, arriba a la derecha */
#cine .pip{position:absolute;left:1424px;top:118px;width:436px;height:800px;z-index:3;border-radius:44px;overflow:hidden;background:radial-gradient(ellipse 90% 70% at 50% 40%,#3a2420,#1a1210);box-shadow:0 0 0 2px rgba(253,195,77,.4),0 40px 80px rgba(8,4,3,.6);opacity:0;visibility:hidden}
#cine .pipt{position:absolute;left:0;right:0;top:15px;text-align:center;font-size:18px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#fdd88a}
/* sobre la escena */
#cine .estado{position:absolute;z-index:4;padding:11px 24px;border-radius:999px;font-size:30px;font-weight:700;white-space:nowrap;opacity:0;visibility:hidden;box-shadow:0 10px 26px rgba(8,4,3,.4)}
#cine .estado.lista{background:#66713d;color:#fff}
#cine .estado.elige{background:rgba(254,249,241,.92);color:#5b4a3d}
#cine .estado.vino{background:#fef9f1;color:#4f1728}
#cine .resu{position:absolute;z-index:4;width:250px;padding:16px 18px;border-radius:22px;background:#fef9f1;color:#1a1a1a;opacity:0;visibility:hidden;box-shadow:0 14px 30px rgba(8,4,3,.4)}
#cine .resu b{display:block;font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:#6b2d3e}
#cine .resu span{display:flex;justify-content:space-between;font-size:18px;margin-top:6px;color:#3a2a22}
#cine .resu span i,#cine .resu strong i{font-style:normal}
#cine .resu strong{display:flex;justify-content:space-between;font-size:21px;margin-top:8px;color:#4f1728}
#cine .reloj{position:absolute;left:1420px;top:22px;display:flex;align-items:center;gap:14px;z-index:8;opacity:0;visibility:hidden}
#cine .reloj .x4{padding:8px 18px;border-radius:999px;background:#fdc34d;color:#2a0d17;font-size:26px;font-weight:800}
#cine .reloj .esfera{position:relative;width:56px;height:56px;border-radius:50%;background:#fef9f1}
#cine .reloj .esfera i{position:absolute;left:26px;width:4px;border-radius:2px;background:#4f1728;transform-origin:2px 100%}
#cine .reloj .esfera .hh{top:13px;height:15px}#cine .reloj .esfera .mm{top:6px;height:22px;background:#b8860b}
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
#cine .av.ca{background:#66713d}#cine .av.cc{background:#3a3340;margin-left:-12px}#cine .av.cs{background:#7a2f45;margin-left:-12px}#cine .av.cd{background:#3b4a5a;margin-left:-12px}
#cine .listos .avs .av{margin-left:0}
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
#cine .tira .rail{position:absolute;left:26px;top:0;display:flex;gap:24px}
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
#cine .vuela{position:absolute;left:186px;top:786px;width:28px;height:28px;border-radius:50%;background:#b8860b;box-shadow:0 0 0 7px rgba(184,134,11,.28);opacity:0;z-index:9}
#cine .vuela img{width:100%;height:100%}
#cine .caviso{position:absolute;left:26px;right:26px;bottom:116px;padding:14px 18px;border-radius:22px;background:#4f1728;color:#fff;font-size:16px;font-weight:600;display:flex;align-items:center;gap:12px;opacity:0;z-index:9;box-shadow:0 14px 30px rgba(79,23,40,.35)}
#cine .caviso img{width:40px;height:40px}
/* cierre */
#cine .marca{position:absolute;left:0;right:0;top:330px;display:flex;flex-direction:column;align-items:center;gap:26px;opacity:0;visibility:hidden}
#cine .marca b{font-family:'DM Serif Display',serif;font-weight:400;font-size:230px;line-height:1;color:#fef9f1}
#cine .marca i{display:block;width:420px;height:2px;background:rgba(253,195,77,.7)}
#cine .marca span{font-family:'DM Serif Display',serif;font-size:76px;color:#fdc34d;font-style:italic}
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
#cine .listos .avs{display:flex;justify-content:center;gap:16px;margin-top:20px}
#cine .listos .avs span{position:relative}
#cine .listos .avs .av{width:66px;height:66px;font-size:27px;box-shadow:0 0 0 4px #66713d}
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
#cine .marca{z-index:7;top:270px}
/* los cuatro teléfonos del ciclo: seguimiento de la orden (prototipo P04b) y la cuenta (prototipo P05 v2), dibujadas; sin método de pago */
#cine .qest{display:inline-flex;align-items:center;gap:8px;margin-top:12px;padding:8px 16px;border-radius:999px;background:#eef0e2;color:#4c5630;font-size:17px;font-weight:700}
#cine .qest svg,#intro #cine .qest svg{width:18px;height:18px;stroke:#4c5630}
#cine .qin{position:absolute;left:0;right:0;top:0;padding:58px 26px 0}
#cine .qhero{margin-top:18px;height:120px;border-radius:26px;background:linear-gradient(135deg,#6b2d3e,#4f1728);color:#fef9f1;padding:22px 24px}
#cine .qhero b{display:block;font:400 34px 'DM Serif Display',serif}#cine .qhero small{font-size:15px;opacity:.8}
#cine .qC .kcta span{position:relative;padding-right:46px}
#cine .qC .kcta span i{margin-left:auto}
#cine .qlike{position:absolute;right:0;top:9px;width:30px;height:30px;font-size:26px;line-height:30px;text-align:center;color:#d9cbb4}
#cine .qlike u{position:absolute;inset:0;text-decoration:none;color:#9b2c4a}
#cine .qseg{margin-left:auto;position:relative;display:flex;border-radius:999px;background:#eadfcd;flex:none}
#cine .qseg i{position:relative;z-index:1;width:58px;height:44px;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:14px;font-weight:700;color:#5b4a3d}
#cine .qseg svg,#intro #cine .qseg svg{width:24px;height:24px}
#cine .qseg .qsel{position:absolute;left:58px;top:0;width:58px;height:44px;border-radius:999px;background:#4f1728}
#cine .qseg i.qp{color:#5b4a3d}
#cine .qC .kinv{margin-top:12px}
#cine .sec.sx{position:relative;height:36px}
#cine .sec.sx h4{position:absolute;left:0;top:0;white-space:nowrap}
#cine .tj .csec{display:block;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#b8860b;margin-bottom:4px}
#cine .pOrden .ped{margin-top:10px;padding:9px 12px}
#cine .pRes .cings{margin-top:14px}#cine .pRes .cing{padding:7px 13px}
/* la carta: lo agotado se ve atenuado */
#cine .cfila.cagot{opacity:.42}
#cine .cfila .cag{margin-left:auto;padding:5px 10px;border-radius:999px;background:#ece4d6;color:#5b4a3d;font-size:13px;font-weight:700;white-space:nowrap}
/* mi cuenta (Fase 3) e invitar a alguien (versión 1.1): dibujadas; el pago se hace con el mesero */
#cine .kcta{margin-top:14px;display:flex;flex-direction:column}
#cine .kcta span{display:flex;justify-content:space-between;height:48px;align-items:center;font-size:19px;color:#1a1a1a}
#cine .kcta span i,#cine .kprop i,#cine .ktot i{font-style:normal;font-weight:600}
#cine .kcta .cinv{color:#6b2d3e}
#cine .kprop{position:relative;margin-top:10px;display:flex;align-items:center;gap:8px;height:48px}
#cine .kprop b{font-size:19px;font-weight:600;margin-right:6px}
#cine .kprop .cpc{padding:8px 13px;border-radius:999px;background:#f3e9da;font-size:15px;font-weight:600;white-space:nowrap}
#cine .kprop .cpc.on{background:#4f1728;color:#fff}
#cine .kprop i,#cine .ktot i{position:absolute;right:0;font-size:19px}
#cine .kinv{margin-top:14px;padding:14px 16px;border-radius:22px;background:#f8f1e5;display:flex;align-items:center;gap:12px}
#cine .kinv .av{width:40px;height:40px;font-size:18px;background:#7a2f45;box-shadow:none}
#cine .kinv b{display:block;font-size:17px}#cine .kinv small{font-size:14px;color:#5b4a3d}
#cine .ktog{margin-left:auto;position:relative;width:52px;height:30px;border-radius:15px;background:#d9cbb4;flex:none}
#cine .ktog u{position:absolute;left:3px;top:3px;width:24px;height:24px;border-radius:50%;background:#fff}
#cine .ktot{position:relative;margin-top:16px;height:44px;display:flex;align-items:center}
#cine .ktot b{font-family:'DM Serif Display',serif;font-weight:400;font-size:28px;color:#4f1728}
#cine .ktot i{font-size:26px;color:#4f1728}
/* la pantalla de mesa del mesero (prototipo, grupo «mesero», detalle de mesa): Mesa 7 y su pista de cuatro estados */
#cine .mesaP{display:flex;align-items:center;gap:14px;margin-top:20px}
#cine .mesaP h4{font-size:44px}
#cine .mesaP .mst{position:relative;flex:1;height:36px}
#cine .mesaP .mst i{position:absolute;left:0;top:0;padding:7px 14px;border-radius:999px;font-style:normal;font-size:16px;font-weight:700;white-space:nowrap;opacity:0}
#cine .mst .m0,#cine .mst .m3{background:#eef0e2;color:#4c5630}#cine .mst .m1{background:#f6ecd2;color:#7a5a08}#cine .mst .m2{background:#f3e1e6;color:#6b2d3e}
#cine .pista{position:relative;margin:20px 0 0 30px}
#cine .pista::before{content:"";position:absolute;left:30px;top:46px;bottom:46px;width:4px;border-radius:2px;background:#eadfcd}
#cine .ps{position:relative;height:96px;display:flex;align-items:center;gap:16px;padding:0 12px}
#cine .ps .pbg{position:absolute;inset:5px 0;border-radius:26px;background:#fff;box-shadow:0 12px 26px rgba(79,23,40,.12);opacity:0}
#cine .ps .pc{position:relative;width:40px;height:40px;border-radius:50%;background:#fef9f1;box-shadow:inset 0 0 0 3px #d9cbb4;flex:none}
#cine .ps .pc i{position:absolute;inset:0;border-radius:50%;opacity:0;display:flex;align-items:center;justify-content:center}
#cine .ps .pc .pca{background:#4f1728;box-shadow:0 0 0 6px rgba(79,23,40,.16)}
#cine .ps .pc .pok{background:#66713d}
#cine .ps .pc svg,#intro #cine .ps .pc svg{width:22px;height:22px}
#cine .ps .pt{position:relative}
#cine .ps .pt b{display:block;font-size:25px;font-weight:700;color:#1a1a1a}
#cine .ps .pt small{font-size:16px;color:#5b4a3d}
#cine .pnota{position:absolute;left:26px;right:26px;bottom:116px;height:26px}
#cine .pnota span{position:absolute;left:0;right:0;text-align:center;font-size:17px;font-weight:600;color:#5b4a3d;opacity:0}
#cine .pbt{position:absolute;left:26px;right:26px;bottom:36px;height:66px;border-radius:999px;display:flex;align-items:center;justify-content:center;gap:10px;font-size:22px;font-weight:700;color:#fff;opacity:0}
#cine .pbt.b0,#cine .pbt.b1{background:linear-gradient(135deg,#6b2d3e,#4f1728)}#cine .pbt.b2{background:linear-gradient(135deg,#c9961a,#a87a08)}#cine .pbt.b3{background:#66713d}
#cine .pbt svg,#intro #cine .pbt svg{width:22px;height:22px}
#intro .barras{gap:10px;bottom:14px}
#intro .barras i{height:2px;background:rgba(255,255,255,.16)}
#intro .barras i b{background:rgba(243,213,138,.7)}
#intro .barras .btn,#intro > .ictl:not(.barras) .btn{background:transparent;color:rgba(254,249,241,.62);padding:6px 10px;font-size:13px}
#intro .barras .btn:hover,#intro > .ictl:not(.barras) .btn:hover{background:rgba(255,255,255,.12);color:#fff}
#intro .icta{transition:opacity .7s ease}
#intro .icta[hidden]{display:flex;opacity:0;pointer-events:none}
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
const cab = (mia = false) => `<div class="cab"><span class="lg">L</span>La Ceiba${mia ? `<span class="mia">Mi mesa <span class="av ca">A</span><span class="av cs">S</span><span class="av cd">D</span><span class="av cc">C</span><span class="bd">1</span></span>` : ""}</div>`;
const cRen = (img, nom, pr, no = "") => `<div class="cfila${no ? " cfuera" : ""}"><img src="${CI("plato-" + img)}" alt=""><div><b>${nom}</b><small>${pr}</small></div>${no ? `<span class="cno">${no}</span>` : ""}</div>`;
const cTarj = (img, nom, pr, porq) => `<div class="tj"><div class="fo"><img src="${CI("plato-" + img)}" alt=""></div><div class="ctx"><b>${nom}</b><small>${porq}</small><span class="cpr">${pr}</span></div></div>`;

const torno = () => `<div class="torno"><i class="som"></i><i class="aro360"></i>
  <div class="capa" style="transform:scaleY(.5)"><img src="${CI("torno-plato")}" alt=""></div>
  ${[0, 1, 2, 3].map(k => `<div class="capa k${k}" style="transform:translateY(-${k * 3}px) scaleY(.5)"><div class="gir"><img src="${CI("torno-pez")}" alt=""></div></div>`).join("")}
  <div class="capa k4" style="transform:translateY(-12px) scaleY(.5)"><div class="gir"><img src="${CI("torno-pez")}" alt=""><img src="${CI("torno-adorno")}" alt=""></div></div>
  <div class="brillo"><i></i></div><span class="g360">360°</span><i class="luz"></i></div>`;
const listos = (cl) => `<div class="cs cx ${cl}">${sb()}${cab(true)}<div class="listos"><h4>La mesa está lista</h4><div class="avs">${[["ca", "A"], ["cs", "S"], ["cd", "D"], ["cc", "C"]].map(([c, l]) => `<span><span class="av ${c}">${l}</span><em>${ico.ok}</em></span>`).join("")}</div><div class="barra"></div><p>4 de 4 listos</p><p>Ya avisamos al mesero</p></div></div>`;

const pantallas = () => `
<div class="cs visor"><img src="${CI("visor")}" alt="">${sb(true)}<div class="ret"><i></i><i></i><i></i><i></i></div><div class="det">La Ceiba <em>· abrir la carta</em></div><div class="cam"><i></i></div></div>
<div class="cs bien">${sb()}<img class="ccap" src="${CAP.bien}" alt=""></div>
<div class="cs menu">${sb()}<img class="ccap" src="${CAP.menu}" alt=""></div>
<div class="cs cx pHola">${sb()}${cab()}
  <div class="hola"><span class="av ca">A</span><h4>Hola, Ana</h4></div>
  <div class="carga"><span>Afilando los cuchillos…</span><span>Calentando el comal…</span><span>Probando la salsa…</span></div>
  <div class="cchips"><span class="cchip">${ico.no}sin lácteos</span><span class="cchip">${ico.no}sin cacahuate</span></div>
  <div class="tel">${ico.tel}Se queda en tu teléfono</div>
  <div class="clista">${cRen("aguachile", "Aguachile verde", "$210")}${cRen("enchiladas", "Enchiladas suizas", "$165", "lácteos")}${cRen("pescado", "Pescado a la talla", "$245")}${cRen("mole", "Mole negro", "$190", "cacahuate")}${cRen("ensalada", "Ensalada de betabel", "$140")}<div class="cfila cagot"><img src="${CI("plato-tacos")}" alt=""><div><b>Tacos de pescado</b><small>$175</small></div><span class="cag">agotado</span></div></div>
  <div class="clisto">${ico.ok}Listo: tu carta</div>
</div>
<div class="cs cx pTop3">${sb()}${cab(true)}
  <div class="sec sx"><h4 class="sx0">Recomendado para ti <span class="es">✦</span></h4><h4 class="sx1">Platos fuertes</h4><h4 class="sx2">Postres</h4><h4 class="sx3">Bebidas</h4></div>
  <div class="porq">${ico.tel}Por lo que te gustó en otros lugares</div>
  <div class="tira"><div class="rail">${cTarj("pescado", "Pescado a la talla", "$245", "Te gustó el zarandeado en El Faro")}${cTarj("aguachile", "Aguachile verde", "$210", "Pediste ceviche 3 veces")}${cTarj("ensalada", "Ensalada de betabel", "$140", "Sin lácteos, como te gusta")}${cTarj("res", "Arrachera", "$230", "Para compartir")}${cTarj("mole", "Mole negro", "$190", "Lleva cacahuate")}${cTarj("flan", "Flan de la casa", "$85", "El favorito de la casa")}${cTarj("jamaica", "Agua de jamaica", "$45", "Hecha en casa")}${cTarj("limonada", "Limonada", "$45", "Con hierbabuena")}</div></div>
  <div class="sec"><h4>La carta</h4></div>
  <div class="cats"><span>Para empezar</span><span>Del mar</span><span>Postres</span></div>
  <div class="clista">${cRen("tacos", "Tacos de pescado", "$175")}${cRen("flan", "Flan de la casa", "$85")}</div>
</div>
<div class="cs cx pPlato">${torno()}
  ${sb(true)}<span class="vuelta">← La carta</span>
  <div class="ficha"><h4>Pescado a la talla</h4><div class="cpr">$245</div>
    <div class="cings"><span class="cing">${ico.pez}Huachinango</span><span class="cing">${ico.chile}Guajillo</span><span class="cing">${ico.ajo}Ajo</span><span class="cing">${ico.limon}Limón</span><span class="cing">${ico.cilantro}Cilantro</span></div>
    <div class="reco">${ico.chispa} Recomendado porque te gustaron <b>los tacos de pescado</b> en otros restaurantes.<div class="tel">${ico.tel}Tus gustos viven en tu teléfono</div></div>
  </div>
  <div class="agr">Agregar a mi orden · $245</div>
  <div class="caviso"><img src="${CI("plato-pescado")}" alt="">En tu mesa: Pescado a la talla</div>
  <i class="vuela"></i>
  <div class="cabp"><span class="mia">Mi mesa <span class="av ca">A</span><span class="av cs">S</span><span class="av cd">D</span><span class="av cc">C</span><span class="bd">1</span></span></div>
</div>
<div class="cs cx pAviso">${sb()}${cab(true)}
  <div class="avisoT">${ico.chispa}<span>Llegaste hace poco a Carta: aún sé poco de tus gustos.</span></div>
  <div class="sec"><h4>Platos fuertes</h4></div>
  <div class="clista">${cRen("res", "Arrachera", "$230")}${cRen("tacos", "Tacos de pescado", "$175")}${cRen("aguachile", "Aguachile verde", "$210")}</div>
</div>
<div class="cs cx pRes"><div class="hero"><img src="${CI("plato-res")}" alt=""></div>${sb(true)}<span class="vuelta">← La carta</span>
  <div class="ficha"><h4>Arrachera</h4><div class="cpr">$230</div><div class="cings"><span class="cing">Arrachera</span><span class="cing">Cebollitas asadas</span><span class="cing">Guacamole</span><span class="cing">Tortillas de maíz</span></div><div class="reco">A la parrilla, jugosa y al término que pidas. Alcanza para compartir.</div></div>
  <div class="btn2 o">Enviar a Carlos</div><div class="btn2 v">Agregar a mi orden</div>
  <div class="toast">${ico.ok}Se la enviaste a Carlos</div>
</div>
${listos("pListosA")}
<i class="toque"></i>`;

const pantallasB = () => `
<div class="cs cx pCarlos">${sb()}${cab(true)}
  <div class="hola"><span class="av cc">C</span><h4>Hola, Carlos</h4></div>
  <div class="clista">${cRen("tacos", "Tacos de pescado", "$175")}${cRen("aguachile", "Aguachile verde", "$210")}${cRen("flan", "Flan de la casa", "$85")}</div>
  <div class="reco2"><div class="de"><span class="av ca">A</span>Ana te recomienda</div><div class="pl"><img src="${CI("plato-res")}" alt=""><div><b>Arrachera</b><br><small>$230</small></div></div><div class="me">Me encanta</div></div>
  <div class="toast">${ico.ok}Arrachera, en tu orden</div>
  <div class="btn2 v conf">Confirmar mi orden · $230</div>
</div>
${listos("pListosB")}
<i class="toque"></i>`;

/* los cuatro de la mesa en el ciclo: [capas de la mano, inicial, color del avatar, nombre, lo que pidió] (cifras de ejemplo) */
const QUIEN = [["ana", "A", "ca", "Ana", [["Pescado a la talla", 245], ["Flan de la casa", 85]]], ["sofia", "S", "cs", "Sofía", [["Ensalada de betabel", 140], ["Limonada", 40]]],
  ["diego", "D", "cd", "Diego", [["Aguachile verde", 210], ["Cerveza", 60]]], ["carlos", "C", "cc", "Carlos", [["Arrachera", 230], ["Agua de jamaica", 50]]]];
const QSOFIA = QUIEN[1][4].reduce((a, x) => a + x[1], 0), QPARTE = Math.round(QSOFIA / 3);
const icoGente = `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="8" r="3.4"/><circle cx="16.5" cy="9" r="2.8"/><path d="M1.5 19c.6-4 3-6 6.5-6s5.900 2 6.500 6z"/><path d="M15.500 19c-.2-2.200-.9-3.900-2.100-5.100.9-.6 1.900-.900 3.100-.900 2.800 0 4.700 1.700 5.200 6z"/></svg>`;
const pantallasQ = (k) => {
  const [, , av, nom, pl] = QUIEN[k], sub = pl.reduce((a, x) => a + x[1], 0), esS = k === 1;
  const filas = (like) => pl.map(([n, pr]) => `<span>${n}<i>$${pr}</i>${like ? `<em class="qlike">♥<u class="qlk">♥</u></em>` : ""}</span>`).join("");
  const t0 = Math.round(sub * 1.1), t1 = esS ? 0 : Math.round((sub + QPARTE) * 1.1);
  return `
<div class="cs cx qS">${sb()}${cab(true)}<div class="sec"><h4>Tu orden</h4></div><div class="qest">${ico.ok}Servida</div>
  <div class="kcta">${filas(false)}</div><div class="tel">${ico.tel}Mesa 7 · todo llegó a la mesa</div><div class="btn2 v">Cerrar mi cuenta</div></div>
<div class="cs qC"><div class="qin">${cab(true)}<div class="qhero"><b>Mi cuenta</b><small>${nom} · Mesa 7</small></div>
  <div class="kcta">${filas(true)}</div>
  <div class="kprop"><b>Propina</b><span class="cpc on">10 %</span><span class="cpc">15 %</span><span class="cpc">20 %</span></div>
  ${esS ? `<div class="kinv qinvS"><span class="av cs">S</span><div><b>Hoy te invitan</b><small>Ana, Diego y Carlos</small></div></div>`
    : `<div class="kinv"><span class="av cs">S</span><div><b>Invitar a Sofía</b></div><span class="qseg"><u class="qsel"></u><i>100 %</i><i class="qp">${icoGente}</i><i>%</i></span></div><div class="kcta"><span class="cinv">Tu parte de lo de Sofía<i>$${QPARTE}</i></span></div>`}
  <div class="ktot"><b>Total</b><i class="cv0">$${t0}</i><i class="cv1">$${t1}</i></div>
  <div class="tel">${ico.tel}El pago se hace con el mesero</div></div>${sb()}</div>
<i class="toque"></i>`;
};

/* el teléfono del mesero en primer plano (acto 4): el aviso con la pantalla bloqueada y la comanda */
const pantallasM = () => `
<div class="cs bloq">${sb(true)}<div class="hr">9:41</div><div class="fe">jueves</div>
  <div class="noti"><div class="ap"><i>C</i>Carta · ahora</div><b>Mesa 7: los cuatro están listos para ordenar</b><div class="ya">Ya voy</div></div>
</div>
<div class="cs cx pOrden">${sb()}<div class="cab"><span class="lg">L</span>La Ceiba · Personal</div>
  <div class="mesa7"><h4>Mesa 7</h4><span>Lista para ordenar</span></div>
  <div class="ped"><img src="${CI("plato-pescado")}" alt=""><div><b>Ana</b><span>Pescado a la talla</span></div></div>
  <div class="ped"><img src="${CI("plato-ensalada")}" alt=""><div><b>Sofía</b><span>Ensalada de betabel</span></div></div>
  <div class="ped"><img src="${CI("plato-aguachile")}" alt=""><div><b>Diego</b><span>Aguachile verde</span></div></div>
  <div class="ped"><img src="${CI("plato-res")}" alt=""><div><b>Carlos</b><span>Arrachera</span></div></div>
  <div class="btn2 v">Atender comanda</div>
</div>
<i class="toque"></i>`;

/* el teléfono del mesero en el recuadro del acto 5: Mesa 7 y su pista de cuatro estados; el estado activo cambia cuando él toca */
const FASES = [["Abierta", "Piden, comen y platican"], ["Cuenta cerrada", "Ya no se agrega nada"], ["Pagada", "El cobro, fuera de Carta"], ["Mesa limpia", "Libre para otros comensales"]];
const pantallasP = () => `
<div class="cs cx pMesa">${sb()}<div class="cab"><span class="lg">L</span>La Ceiba · Personal</div>
  <div class="mesaP"><h4>Mesa 7</h4><span class="mst"><i class="m0">Abierta</i><i class="m1">Cuenta cerrada</i><i class="m2">Pagada</i><i class="m3">Libre</i></span></div>
  <div class="pista">${FASES.map(([n, d], k) => `<div class="ps ps${k}"><i class="pbg"></i><span class="pc"><i class="pca"></i><i class="pok">${ico.ok}</i></span><span class="pt"><b>${n}</b><small>${d}</small></span></div>`).join("")}</div>
  <div class="pnota"><span class="n0">4 comensales · 1 comanda</span><span class="n1">Las cuatro cuentas, cerradas</span><span class="n2">Falta limpiar la mesa</span><span class="n3">Sesión nueva · lista para otra mesa</span></div>
  <div class="pbt b0">Cerrar cuenta</div><div class="pbt b1">Validar pago</div><div class="pbt b2">Marcar mesa limpia</div><div class="pbt b3">${ico.ok}Mesa libre</div>
</div>
<i class="toque"></i>`;

/* una capa de apoyo/cine en su caja; orig = punto de giro en coordenadas del cuadro */
const K = (n, cl = "") => { const c = CAPAS[n]; return `<img class="k k-${n}${cl ? " " + cl : ""}" src="${c[0]}" alt="" style="left:${c[1]}px;top:${c[2]}px;width:${c[3]}px;height:${c[4]}px">`; };
const orig = (n, x, y) => `${x - CAPAS[n][1]}px ${y - CAPAS[n][2]}px`;
const BRAZOS = {ana: ["brazo", "brazo-cel", "brazo-copa", "brazo-carta"], carlos: ["brazo", "brazo-cel", "brazo-copa", "brazo-carta"], sofia: ["brazos", "brazos-cel", "brazos-carta"], diego: ["brazos", "brazos-cel", "brazos-carta"],
  mesero: ["brazos", "brazos-carta", "brazos-cel", "brazos-terminal", "brazos-trapo", "brazos-libreta", "brazos-tableta"]};
/* un teléfono en su mano: dorso, marco con sus pantallas, pulgar y yemas, y el índice de la otra mano */
const agarre = (cl, quien, pant, nom = "") => `<div class="agarre ${cl}">${K(quien + "-mano-atras")}<div class="cel"><div class="pan">${pant}</div></div>${K(quien + "-mano-frente")}${K(quien + "-dedo", "dedo")}${nom ? `<span class="nom">${nom}</span>` : ""}</div>`;

function cineHtml() {
  const bz = q => BRAZOS[q].map(v => K(`${q}-${v}`, "bz")).join("");
  const sala = `<div class="sala"><div class="pfon">${K("fondo")}</div><div class="pfig">` +
    K("ana-silla") + K("carlos-silla") +
    `<div class="gp gm">${K("mesero-cabeza")}${K("mesero-cuerpo")}</div><div class="gp gS">${K("sofia-cabeza")}${K("sofia-cuerpo")}</div><div class="gp gD">${K("diego-cabeza")}${K("diego-cuerpo")}</div>` +
    `<div class="gp gA">${K("ana-cabeza")}${K("ana-cuerpo")}</div><div class="gp gC">${K("carlos-cabeza")}${K("carlos-cuerpo")}</div>` + K("mesa") +
    `<div class="gp gS">${bz("sofia")}</div><div class="gp gD">${bz("diego")}</div>` +
    ["montaje", "ticket", "pastel", "sucia-migas", "sucia-a", "sucia-c", "sucia-vaso", "platillo-a", "platillo-c", "copa-a", "copa-c", "qr-brillo", "acrilico", "vela", "llama"].map(n => K(n)).join("") +
    `<div class="gp gm">${bz("mesero")}<span class="buzz"><i></i><i></i></span><svg class="ctrazo" viewBox="0 0 56 76" fill="none" stroke="#3a2a22" stroke-width="2.6" stroke-linecap="round"><path d="M6 14 q6 -5 12 0 t12 0 t12 0"/><path d="M6 30 q6 -5 12 0 t12 0 t10 0"/><path d="M6 46 q6 -5 12 0 t12 0 t12 0"/><path d="M6 62 q6 -5 12 0 t10 0"/></svg><i class="cpluma"></i></div><div class="gp gA">${bz("ana")}</div><div class="gp gC">${bz("carlos")}</div>` +
    K("resplandor") + K("nuevos") + `</div></div>`;
  const cerca = `<div class="cerca"><div class="cfon">${K("cerca-fondo")}</div>${agarre("agA", "ana", pantallas(), "Ana")}${agarre("agC", "carlos", pantallasB(), "Carlos")}${agarre("agM", "mesero", pantallasM())}${QUIEN.map((u, k) => agarre("agQ agQ" + k, u[0], pantallasQ(k), u[3])).join("")}</div>`;
  const pip = `<div class="pip"><b class="pipt">Tablero del mesero</b>${agarre("agP", "mesero", pantallasP())}</div>`;
  const rot = TOMAS.map((t, i) => t[4].length ? `<div class="r ${t[5]} r${i}">${t[4].map(l => l[0] === "~" ? `<span class="cln ck">${palabras(l.slice(1))}</span>` : `<span class="cln">${palabras(l)}</span>`).join("")}</div>` : "").join("");
  /* un globo junto a la boca (x, y en el cuadro): lado "i" = el texto queda a la derecha de quien habla; "d" = a su izquierda;
     "a", "b" y "c" = encima de su cabeza, centrado, corrido a la izquierda o corrido a la derecha */
  const globo = (k, lado, x, y, tx, ancho = 0) => `<div class="globo gl-${lado} g${k}" style="${lado === "i" ? `left:${x + 30}px` : lado === "d" ? `right:${1920 - x + 30}px` : `left:${x}px`};top:${y}px;${ancho ? `max-width:${ancho}px;` : ""}transform-origin:${lado === "i" ? "0 50%" : lado === "d" ? "100% 50%" : lado === "a" ? "50% 100%" : lado === "b" ? "84% 100%" : "16% 100%"}">${tx}</div>`;
  const PDF = [["Para empezar", [["Guacamole de la casa", 145], ["Aguachile verde", 210], ["Tostadas de atún", 165], ["Sopa de tortilla", 110], ["Ensalada de betabel", 140], ["Queso fundido", 135]]],
    ["Platos fuertes", [["Pescado a la talla", 245], ["Mole negro", 190], ["Arrachera", 230], ["Enchiladas suizas", 165], ["Tacos de pescado", 175], ["Parrillada para compartir", 520], ["Pollo en pipián", 185], ["Camarones al ajillo", 260]]],
    ["Postres y bebidas", [["Flan de la casa", 85], ["Pastel de tres leches", 95], ["Agua de jamaica", 45], ["Limonada", 45], ["Café de olla", 40], ["Cerveza", 60]]]];
  const TICKET = [["2 Limonada", 90], ["1 Agua de jamaica", 45], ["1 Cerveza", 60], ["1 Guacamole", 145], ["1 Aguachile verde", 210], ["1 Pescado a la talla", 245], ["1 Ensalada betabel", 140], ["1 Arrachera", 230], ["1 Parrillada comp.", 520], ["1 Enchiladas suizas", 165], ["2 Flan de la casa", 170], ["1 Tres leches", 95], ["2 Café de olla", 80]];
  const lupas = `<div class="lupa lu1"><div class="lpdf"><h5>La Ceiba</h5>${PDF.map(([sc, pl]) => `<h6>${sc}</h6><div class="lcol">${pl.map(([nm, pr]) => `<p>${nm}<i>$${pr}</i></p>`).join("")}</div>`).join("")}</div></div>` +
    `<div class="lupa lu2"><div class="ltab"><b>Mesa 7</b><u style="width:70%"></u><u style="width:48%"></u><i class="ctab"></i><span>Cargando la orden…</span></div></div>` +
    `<div class="lupa lu3"><div class="ltk"><b>MESA 7</b>${TICKET.map(([nm, pr]) => `<p>${nm}<span>$${pr}</span></p>`).join("")}<p class="lt">TOTAL<span>$${TICKET.reduce((a, x) => a + x[1], 0)}</span></p></div></div>` +
    `<i class="lmarca lm1" style="left:1338px;top:640px"></i><i class="lmarca lm2" style="left:1244px;top:556px"></i><i class="lmarca lm3" style="left:1140px;top:782px"></i>`;
  const sobre = lupas + `<span class="estado lista eA" style="left:372px;top:340px">✓ Lista</span><span class="estado lista eS" style="left:726px;top:300px">✓ Lista</span><span class="estado elige eD" style="left:1000px;top:300px">Eligiendo…</span><span class="estado elige eC" style="left:1340px;top:340px">Eligiendo…</span>` +
    `<span class="estado vino eCom" style="left:112px;top:300px">✓ Comanda atendida</span><span class="estado vino ePago" style="left:112px;top:262px">✓ Pago validado</span><span class="estado lista eLibre" style="left:112px;top:262px">✓ Mesa 7, libre</span>`;
  return `<div id="cine" aria-hidden="true"><div class="cf"><i class="l1"></i><i class="l2"></i></div>
${sala}${cerca}${pip}${sobre}
<div class="grano"></div><div class="vin"></div><div class="franja fa"></div><div class="franja fb"></div>
${globo(1, "i", 1298, 278, "Buenas noches. Aquí está la carta.")}
${globo(10, "i", 506, 548, "¿Pedimos algo para compartir?", 240)}${globo(11, "b", 1080, 360, "¿La parrillada alcanza para cuatro?")}${globo(12, "d", 1414, 548, "El mismo menú, pero en PDF.", 230)}${globo(13, "a", 800, 360, "¿Y eso qué trae?")}
${globo(14, "c", 470, 412, "Los tacos de pescado, por favor.", 400)}${globo(15, "d", 1202, 278, "Se nos terminaron. Una disculpa.")}${globo(16, "c", 470, 412, "¿Y el mole?")}${globo(17, "d", 1202, 278, "¿Es alérgica a algo? Lleva cacahuate.")}
${globo(18, "c", 470, 412, "Sí… ¿y las enchiladas?", 400)}${globo(26, "c", 470, 412, "Espere… ¿llevan cacahuate?", 400)}${globo(27, "d", 1202, 278, "Déjeme pregunto en cocina.")}
${globo(19, "d", 1202, 278, "¿Eran dos aguachiles… o tres?")}${globo(20, "c", 1440, 412, "El mío sin cebolla.")}${globo(21, "i", 506, 548, "Yo cambié de opinión.", 240)}${globo(28, "d", 1202, 278, "Un momento… está cargando.")}${globo(31, "d", 1202, 278, "Muchas gracias por venir.")}
${globo(22, "b", 1080, 360, "¿Quién pidió las limonadas?")}${globo(23, "i", 506, 548, "A Sofi la invitamos: ¿entre tres?", 240)}${globo(24, "d", 1414, 548, "¿Y la propina?", 240)}
${globo(3, "i", 506, 548, "Ya pedí. ¿Tú qué vas a pedir?", 240)}${globo(4, "d", 1414, 548, "Estoy viendo, todavía no sé.", 240)}
${globo(5, "i", 1298, 278, "Para Ana, pescado a la talla.")}${globo(29, "i", 1298, 278, "Para Sofía, ensalada. Para Diego, aguachile.")}${globo(30, "i", 1298, 278, "Y para Carlos, arrachera.")}${globo(6, "i", 506, 548, "Sí, todo bien.", 240)}
${globo(25, "d", 1077, 390, "Con la terminal, cuando gusten.", 380)}${globo(7, "d", 1077, 390, "Todo pagado. ¡Gracias, y buenas noches!", 380)}
${globo(32, "b", 929, 462, "¿Ya nadie va a pedir nada más?", 330)}${globo(33, "c", 404, 500, "No, todo bien.")}${globo(34, "b", 1250, 500, "Vamos a pagar.")}${globo(35, "c", 404, 500, "Sofi, nosotros te invitamos. ¡Feliz cumpleaños!", 330)}
${globo(8, "c", 404, 500, "Prueba el pescado, está increíble.", 330)}${globo(9, "b", 1250, 500, "Y la arrachera. Hay que volver.", 330)}
<div class="reloj"><span class="x4">×4</span><span class="esfera"><i class="hh"></i><i class="mm"></i></span></div>
${rot}
<div class="marca"><b>Carta</b><i></i><span>Tu menú, Tu Carta.</span></div></div>`;
}

function filmEscala() {
  const el = $("#intro"), f = $("#cine"); if (!f) return;
  const s = Math.min(el.clientWidth / 1920, el.clientHeight / 1080);
  f.style.transform = `translate(${(el.clientWidth - 1920 * s) / 2}px,${(el.clientHeight - 1080 * s) / 2}px) scale(${s})`;
}

/* posiciones de cada teléfono (su esquina superior izquierda en el cuadro de 1920×1080; el cuadro útil va de y=100 a y=980) */
const PA = {x: 1050, y: 128, rotation: -2.5, scale: 0.9}, PB = {x: 1030, y: 122, rotation: -1, scale: 0.92}, PC = {x: 1090, y: 132, rotation: 1.5, scale: 0.9};
const PF = {x: 430, y: 262, rotation: -1.5, scale: 0.72}, P2F = {x: 1200, y: 262, rotation: 1.5, scale: 0.72}, PM = {x: 1050, y: 128, rotation: -1.5, scale: 0.9}, PP = {x: 104, y: 62, rotation: 0, scale: 0.76};
/* donde espera el índice que toca (fuera del cuadro) y la cámara de la sala (escala y desplazamiento de las figuras; fs, fx, fy: el fondo) */
const REP = {x: 600, y: 1090}, REPC = {x: -200, y: 1090};
const C1 = {s: 1, x: 0, y: 0}, CA5 = {s: 0.86, x: 0, y: 151}, CSUC = {s: 1.25, x: -500, y: -340, fs: 1.14, fy: -30}, CBAR = {s: 1.5, x: -545, y: -170, fs: 1.3, fx: -250, fy: -40};
/* puntos de giro: el cuello y el codo de cada quien */
const GIRO = {"ana-cabeza": [456, 596], "carlos-cabeza": [1464, 596], "mesero-cabeza": [1250, 330], "sofia-cabeza": [800, 566], "diego-cabeza": [1080, 566], "ana-brazo": [470, 752], "ana-brazo-cel": [470, 752], "ana-brazo-copa": [470, 752], "carlos-brazo": [1450, 752], "carlos-brazo-cel": [1450, 752], "carlos-brazo-copa": [1450, 752], "copa-a": [806, 762]};

/* la línea de tiempo: estados iniciales con set en 0 y después tweens; buscar hacia atrás o adelante da el mismo cuadro */
function filmLinea() {
  const g = window.gsap; if (!g) return null;
  const tl = g.timeline({paused: true}), f = $("#cine"), q = s => [...f.querySelectorAll(s)];
  const T = id => tomaIni(id);
  const entra = (sel, t, d = 0.5, de = {}, a = {}) => tl.fromTo(q(sel), {autoAlpha: 0, ...de}, {autoAlpha: 1, duration: d, ease: "power2.out", immediateRender: false, ...a}, t);
  const sale = (sel, t, d = 0.4, a = {}) => tl.to(q(sel), {autoAlpha: 0, duration: d, ease: "power2.in", ...a}, t);
  const pon = (sel, t, v) => tl.set(q(sel), {autoAlpha: v ? 1 : 0}, t);
  /* un corte funde el decorado entero: ninguna pieza se queda atrás */
  const corte = (de, a, t, d = 0.6) => { tl.to(q(de), {autoAlpha: 0, duration: d, ease: "power1.inOut"}, t); tl.fromTo(q(a), {autoAlpha: 0}, {autoAlpha: 1, duration: d, ease: "power1.inOut", immediateRender: false}, t); };
  const cam = (t, v, d = 1.2, ease = "power2.inOut") => { tl.to(q(".pfig"), {scale: v.s, x: v.x, y: v.y, duration: d, ease}, t); tl.to(q(".pfon"), {scale: v.fs || 1.04, x: v.fx || 0, y: v.fy || 0, duration: d, ease}, t); };
  const brazo = (quien, v, t, d = 0.22) => BRAZOS[quien].forEach(x => tl.to(q(`.k-${quien}-${x}`), {autoAlpha: x === v ? 1 : 0, duration: d, ease: "none"}, t));
  const cabeza = (quien, ang, t, d = 0.5) => tl.to(q(`.k-${quien}-cabeza`), {rotation: ang, duration: d, ease: "sine.inOut"}, t);
  const gesto = (quien, t, n = 3, ang = 10) => tl.to(q(`.k-${quien}-brazo`), {rotation: quien === "ana" ? -ang : ang, duration: 0.32, yoyo: true, repeat: 2 * n - 1, ease: "sine.inOut"}, t);
  const toque = (A, x, y, t) => { tl.set(q(A + " .toque"), {left: x, top: y}, t - 0.01); tl.fromTo(q(A + " .toque"), {autoAlpha: 0.95, scale: 0.4}, {autoAlpha: 0, scale: 1.6, duration: 0.7, ease: "power2.out", immediateRender: false}, t); };
  const mueve = (A, x, y, t, d = 0.45) => tl.to(q(A + " .dedo"), {x, y, duration: d, ease: "power2.inOut"}, t);
  /* tocar: el índice llega, baja, deja su marca y se aparta a un lado del teléfono para dejar ver la pantalla; s = -1 si la mano entra por la izquierda */
  const toca = (A, x, y, t, s = 1) => { mueve(A, x + 16 * s, y + 46, t - 0.6, 0.45); tl.to(q(A + " .dedo"), {x, y, duration: 0.12, ease: "power1.in"}, t - 0.13); toque(A, x, y, t); tl.to(q(A + " .dedo"), {x: x + 14 * s, y: y + 40, duration: 0.2, ease: "power1.out"}, t + 0.1); tl.to(q(A + " .dedo"), {x: s > 0 ? 510 : -110, y: y + 80, duration: 0.5, ease: "power2.inOut"}, t + 0.3); };
  const retira = (A, t, R = REP, d = 0.6) => mueve(A, R.x, R.y, t, d);
  const globo = (k, t, fin) => { entra(".g" + k, t, 0.45, {scale: 0.6}, {scale: 1, ease: "back.out(1.5)"}); sale(".g" + k, fin, 0.25); };
  const mira = (lado, tt) => tl.to(q(".k-mesero-cabeza"), {scaleX: -lado, duration: 0.3, ease: "power1.inOut"}, tt); /* 1 = hacia Carlos (derecha), -1 = hacia Ana */
  const pantalla = (sel, t, d = 0.4) => entra(sel, t, d, {scale: 0.97}, {scale: 1});
  const pulsoQR = (t, n = 1) => tl.fromTo(q(".k-qr-brillo"), {autoAlpha: 0, scale: 0.6}, {autoAlpha: 1, scale: 1.25, duration: 0.55, yoyo: true, repeat: 2 * n - 1, ease: "sine.inOut", immediateRender: false}, t);
  /* estado inicial */
  tl.set(q(".pfon, .k-ana-silla, .k-carlos-silla, .gp, .bz:not(.k-ana-brazo):not(.k-carlos-brazo):not(.k-mesero-brazos-carta):not(.k-sofia-brazos):not(.k-diego-brazos), .k-ticket, .k-pastel, .qlk, .qsel, .qinvS, .agQ .dedo, .lupa, .lmarca, .ctrazo, .cpluma, .cchip, .cs.pHola .tel, .pPlato .cing, .pPlato .reco, .pPlato .ficha h4, .pPlato .ficha .cpr, .sx1, .sx2, .sx3, .noti, .marca b, .marca i, .marca span, .cinv, .cv1, .k-mesa, .k-montaje, .k-copa-a, .k-copa-c, .k-acrilico, .k-vela, .k-llama, .k-resplandor, .k-qr-brillo, .k-sucia-migas, .k-sucia-a, .k-sucia-c, .k-sucia-vaso, .k-platillo-a, .k-platillo-c, .k-nuevos, .buzz, .cerca, .pip, .agarre:not(.agP), .pan>.cs:not(.pMesa), .nom, .r, .r .cw, .globo, .estado, .resu, .reloj, .marca, .conf, .pbt, .pnota span, .mst i, .pbg, .pca, .pok"), {autoAlpha: 0}, 0);
  tl.set(q(".sala"), {autoAlpha: 1}, 0);
  tl.set(q(".globo"), {yPercent: -50}, 0); tl.set(q(".globo.gl-a"), {xPercent: -50, yPercent: -100}, 0); tl.set(q(".globo.gl-b"), {xPercent: -84, yPercent: -100}, 0); tl.set(q(".globo.gl-c"), {xPercent: -16, yPercent: -100}, 0);
  const TODOS = ".k-ana-silla, .k-carlos-silla, .gA, .gC, .gS, .gD, .k-mesa, .k-montaje, .k-copa-a, .k-copa-c, .k-acrilico, .k-vela, .k-llama, .k-resplandor";
  tl.set(q(".pfig"), {scale: 1.1, x: -96, y: -100}, 0);
  tl.set(q(".pfon"), {scale: 1.04, x: 0, y: 0, transformOrigin: "50% 50%"}, 0);
  tl.set(q(".cfon"), {scale: 1.06, x: 0, y: 0, transformOrigin: "50% 50%"}, 0);
  tl.set(q(".gA, .gC, .gS, .gD, .gm"), {x: 0, y: 0, rotation: 0}, 0);
  tl.set(q(".gA"), {transformOrigin: "432px 852px"}, 0); tl.set(q(".gC"), {transformOrigin: "1488px 852px"}, 0); tl.set(q(".gm"), {transformOrigin: "1250px 800px"}, 0);
  tl.set(q(".gS"), {transformOrigin: "800px 800px"}, 0); tl.set(q(".gD"), {transformOrigin: "1080px 800px"}, 0);
  const inclina = (g, ang, tt, d = 0.7) => tl.to(q(g), {rotation: ang, duration: d, ease: "sine.inOut"}, tt);
  Object.entries(GIRO).forEach(([n, [x, y]]) => tl.set(q(".k-" + n), {transformOrigin: orig(n, x, y), rotation: 0}, 0));
  tl.set(q(".k-qr-brillo, .k-resplandor, .k-llama"), {transformOrigin: "50% 50%"}, 0);
  tl.set(q(".k-llama"), {transformOrigin: "50% 90%"}, 0);
  tl.set(q(".k-ana-brazo, .k-carlos-brazo, .k-mesero-brazos-carta, .k-sofia-brazos, .k-diego-brazos"), {autoAlpha: 1}, 0);
  tl.set(q(".agA"), PA, 0); tl.set(q(".agC"), P2F, 0); tl.set(q(".agM"), PM, 0); tl.set(q(".agP"), {...PP, autoAlpha: 1}, 0);
  tl.set(q(".agA .dedo, .agM .dedo, .agP .dedo"), REP, 0); tl.set(q(".agC .dedo"), REPC, 0);
  const PQ = k => ({x: 104 + k * 300, y: 292, rotation: [-2, -1, 1, 2][k], scale: 0.62});
  QUIEN.forEach((_, k) => tl.set(q(".agQ" + k), PQ(k), 0));
  tl.set(q(".pMesa"), {autoAlpha: 1}, 0);
  /* la vela respira toda la película */
  tl.fromTo(q(".k-llama"), {scaleY: 0.94, scaleX: 1.04}, {scaleY: 1.1, scaleX: 0.95, duration: 0.31, yoyo: true, repeat: Math.ceil(TOT / 0.31), ease: "sine.inOut"}, 0);
  tl.fromTo(q(".k-resplandor"), {scale: 0.97}, {scale: 1.04, duration: 0.47, yoyo: true, repeat: Math.ceil(TOT / 0.47), ease: "sine.inOut"}, 0);
  /* rótulos y etiquetas: entran palabra por palabra al empezar cada toma y salen al terminar */
  TOMAS.forEach((t, i) => {
    const t0 = T0[i], t1 = T0[i + 1];
    if (t[4].length) {
      const rr = t0 + (t[6] || 0);
      tl.set(q(".r" + i), {autoAlpha: 1}, rr + 0.25);
      tl.fromTo(q(".r" + i + " .cw"), {y: 36, autoAlpha: 0}, {y: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out", stagger: 0.14, immediateRender: false}, rr + 0.3);
      sale(".r" + i, t[7] ? t0 + t[7] : t1 - 0.45, 0.35);
    }
  });
  /* ===== acto 1 ===== */
  /* 1 · la mesa sola en el campo oscuro: la vela la enciende y el QR se anuncia */
  let t = T("mesa");
  tl.fromTo(q(".cf .l1"), {opacity: 0.5, scale: 0.92}, {opacity: 1, scale: 1.06, duration: 6, ease: "sine.inOut"}, t);
  entra(".k-mesa, .k-montaje, .k-copa-a, .k-copa-c", t + 0.3, 1.6, {}, {ease: "power1.out"});
  entra(".k-vela, .k-llama, .k-resplandor", t + 0.9, 1.2);
  cam(t, {s: 1.03, x: -28, y: -30}, 5.5, "power1.out");
  entra(".k-acrilico", t + 2.2, 0.9, {y: 16}, {y: 0, ease: "power3.out"});
  pulsoQR(t + 3.3, 1);
  /* 2 · aparece el salón; un cumpleaños: llegan los cuatro y el mesero les da la carta */
  t = T("cumple");
  entra(".pfon", t, 1.4, {}, {ease: "power1.inOut"});
  entra(".k-ana-silla, .k-carlos-silla", t + 0.2, 0.8);
  tl.fromTo(q(".gA"), {autoAlpha: 0, x: -90}, {autoAlpha: 1, x: 0, duration: 1.1, ease: "power3.out", immediateRender: false}, t + 0.4);
  tl.fromTo(q(".gS"), {autoAlpha: 0, y: 30}, {autoAlpha: 1, y: 0, duration: 1.0, ease: "power3.out", immediateRender: false}, t + 0.7);
  tl.fromTo(q(".gD"), {autoAlpha: 0, y: 30}, {autoAlpha: 1, y: 0, duration: 1.0, ease: "power3.out", immediateRender: false}, t + 1.0);
  tl.fromTo(q(".gC"), {autoAlpha: 0, x: 90}, {autoAlpha: 1, x: 0, duration: 1.1, ease: "power3.out", immediateRender: false}, t + 1.3);
  tl.fromTo(q(".gm"), {autoAlpha: 0, x: 200}, {autoAlpha: 1, x: 0, duration: 1.2, ease: "power2.out", immediateRender: false}, t + 2.2);
  cam(t, C1, 6.5, "sine.inOut");
  mira(1, t + 3.0); globo(1, t + 3.5, t + 5.9); inclina(".gm", -3, t + 3.2, 0.9);
  cabeza("ana", -5, t + 3.5); cabeza("carlos", 5, t + 3.7);
  /* ===== B · las problemáticas ===== */
  const habla = (k, t0, t1, quien, ang = 4) => { globo(k, t0, t1); if (quien === "mesero") { cabeza("mesero", ang, t0, 0.4); cabeza("mesero", 0, t1 - 0.2, 0.4); } else if (quien) { cabeza(quien, ang, t0, 0.35); cabeza(quien, -ang / 2, (t0 + t1) / 2, 0.35); cabeza(quien, 0, t1 - 0.2, 0.35); } };
  /* la lupa: entra junto a quien mira, con un aro sobre su pantalla o su papel */
  const lupa = (k, t0, t1) => { entra(".lu" + k, t0, 0.5, {scale: 0.5}, {scale: 1, ease: "back.out(1.5)"}); entra(".lm" + k, t0, 0.4, {scale: 1.6}, {scale: 1}); sale(".lu" + k + ", .lm" + k, t1, 0.35); };
  /* la pluma escribe: el trazo del renglón k avanza y la pluma lo sigue */
  const trazos = q(".ctrazo path"); trazos.forEach(pt => tl.set(pt, {strokeDasharray: 60, strokeDashoffset: 60}, 0));
  const escribe = (k, t0, d = 0.9) => { tl.to(trazos[k], {strokeDashoffset: 0, duration: d, ease: "none"}, t0); tl.fromTo(q(".cpluma"), {x: 0, y: k * 16, rotation: 24}, {x: 36, y: k * 16 - 3, rotation: 30, duration: d, ease: "none", immediateRender: false}, t0); tl.to(q(".cpluma"), {y: "+=3", duration: 0.09, yoyo: true, repeat: Math.round(d / 0.09) - 1, ease: "sine.inOut"}, t0); };
  const libreta = (on, tt) => tl.to(q(".ctrazo, .cpluma"), {autoAlpha: on ? 1 : 0, duration: 0.3}, tt);
  /* B1 · ponerse de acuerdo: unos con la carta de papel, otros con el PDF en el teléfono; es el mismo problema */
  t = T("b1");
  tl.to(q(".gm"), {x: 200, autoAlpha: 0, duration: 0.9, ease: "power2.in"}, t); inclina(".gm", 0, t, 0.5);
  brazo("ana", "brazo-carta", t + 0.2); brazo("sofia", "brazos-carta", t + 0.3); brazo("diego", "brazos-cel", t + 0.4); brazo("carlos", "brazo-cel", t + 0.5);
  cabeza("ana", 8, t + 0.3); cabeza("carlos", -8, t + 0.6);
  habla(10, t + 0.8, t + 2.6, "ana", -6); inclina(".gA", 3, t + 0.8); inclina(".gA", 0, t + 2.5);
  habla(11, t + 2.7, t + 4.5, "diego", 5); inclina(".gD", -2, t + 2.7); inclina(".gD", 0, t + 4.4);
  lupa(1, t + 4.5, t + 9.0);
  tl.set(q(".lpdf"), {scale: 1.05, x: -130, y: -10}, t + 4.4);
  tl.to(q(".lpdf"), {scale: 1.6, x: -130, y: -170, duration: 0.8, ease: "power2.inOut"}, t + 5.3);
  tl.to(q(".lpdf"), {x: -470, y: -330, duration: 0.8, ease: "power2.inOut"}, t + 6.4);
  tl.to(q(".lpdf"), {x: -40, y: -430, duration: 0.9, ease: "power2.inOut"}, t + 7.5);
  habla(12, t + 4.9, t + 7.2, "carlos", 6); inclina(".gC", -3, t + 4.9); inclina(".gC", 0, t + 7.0);
  habla(13, t + 7.4, t + 9.1, "sofia", -5); inclina(".gS", 2, t + 7.4); inclina(".gS", 0, t + 9.0);
  /* B2 · el menú no la conoce: tres vueltas entre lo que hay y lo que Ana puede comer; el mesero hace lo correcto, el sistema no ayuda */
  t = T("b2");
  brazo("mesero", "brazos-libreta", t, 0.01); tl.set(q(".k-mesero-cabeza"), {scaleX: 1, rotation: 0}, t);
  tl.fromTo(q(".gm"), {x: 200, autoAlpha: 0}, {x: 0, autoAlpha: 1, duration: 0.9, ease: "power2.out", immediateRender: false}, t + 0.1); libreta(true, t + 0.9);
  brazo("sofia", "brazos", t + 0.3); brazo("carlos", "brazo", t + 0.4); brazo("diego", "brazos", t + 0.5); cabeza("carlos", 0, t + 0.4);
  habla(14, t + 1.0, t + 2.8, "ana", -4); inclina(".gA", 2, t + 1.0);
  habla(15, t + 3.0, t + 4.8, "mesero", -5); inclina(".gm", -2, t + 3.0); inclina(".gm", 0, t + 4.6);
  habla(16, t + 5.0, t + 6.2, "ana", 4);
  habla(17, t + 6.4, t + 8.5, "mesero", -5); inclina(".gm", -2, t + 6.4); inclina(".gm", 0, t + 8.3);
  habla(18, t + 8.7, t + 10.3, "ana", -4);
  escribe(0, t + 9.3, 1.0);
  habla(26, t + 10.6, t + 12.3, "ana", 6); inclina(".gA", 4, t + 10.6, 0.4);
  habla(27, t + 12.5, t + 14.2, "mesero", -5); inclina(".gA", 0, t + 12.6); brazo("ana", "brazo", t + 13.6);
  /* B3 · ordenar entre muchos: el mesero apunta a mano, orden por orden */
  t = T("b3");
  habla(19, t + 0.5, t + 2.6, "mesero", -6); escribe(1, t + 1.2, 1.0);
  mira(1, t + 2.7); habla(20, t + 2.8, t + 4.6, "carlos", 6); inclina(".gC", -3, t + 2.8); inclina(".gC", 0, t + 4.4); escribe(2, t + 3.4, 1.0);
  mira(-1, t + 4.7); habla(21, t + 4.8, t + 6.7, "ana", -6); inclina(".gA", 3, t + 4.8); inclina(".gA", 0, t + 6.5); escribe(3, t + 5.6, 0.9);
  cabeza("mesero", -7, t + 6.9, 0.3); cabeza("mesero", 5, t + 7.3, 0.3); cabeza("mesero", -6, t + 7.7, 0.3);
  /* B3 bis · o trae una tableta: la libreta desaparece, aparece la tableta y la lupa enseña su pantalla, cargando */
  t = T("b3t");
  libreta(false, t); brazo("mesero", "brazos-tableta", t + 0.1, 0.5);
  lupa(2, t + 0.7, t + 4.6);
  tl.fromTo(q(".ltab .ctab"), {rotation: 0}, {rotation: 1440, duration: 4.2, ease: "none", immediateRender: false}, t + 0.7);
  habla(28, t + 1.3, t + 3.8, "mesero", -6);
  /* la cuenta: el mesero agradece, deja un solo ticket para todos y se retira; la lupa lo amplía */
  t = T("ticket");
  brazo("mesero", "brazos", t + 0.1, 0.4);
  habla(31, t + 0.4, t + 2.0, "mesero", -5); inclina(".gm", -2.5, t + 0.4); inclina(".gm", 0, t + 1.8);
  entra(".k-ticket", t + 1.0, 0.5, {y: -16}, {y: 0});
  tl.to(q(".gm"), {x: 200, autoAlpha: 0, duration: 0.8, ease: "power2.in"}, t + 2.1);
  cabeza("ana", 8, t + 1.4); cabeza("carlos", -8, t + 1.6);
  lupa(3, t + 2.4, t + 6.2);
  tl.fromTo(q(".ltk"), {y: 14}, {y: -210, duration: 3.0, ease: "sine.inOut", immediateRender: false}, t + 2.9);
  /* B4 · la última: una sola cuenta y cada quien haciendo cuentas en su teléfono */
  t = T("b4");
  brazo("ana", "brazo-cel", t + 0.3); brazo("sofia", "brazos-cel", t + 0.4); brazo("diego", "brazos-cel", t + 0.5); brazo("carlos", "brazo-cel", t + 0.6);
  cabeza("ana", 7, t + 0.3); cabeza("carlos", -7, t + 0.6);
  habla(22, t + 1.0, t + 2.9, "diego", 5);
  habla(23, t + 3.0, t + 5.3, "ana", -5); inclina(".gA", 3, t + 3.0); inclina(".gA", 0, t + 5.2);
  habla(24, t + 5.4, t + 7.4, "carlos", 6); inclina(".gC", -3, t + 5.4); inclina(".gC", 0, t + 7.3);
  /* el giro: todo se apaga y queda la pregunta */
  t = T("pivote");
  sale(".sala", t - 0.5, 0.6);
  tl.set(q(".pfig"), {scale: 1, x: 0, y: 0}, t + 0.3); tl.set(q(".pfon"), {scale: 1.04, x: 0, y: 0}, t + 0.3);
  /* ===== C · Carta ===== */
  /* 3 · la misma mesa, ahora con el QR: Ana levanta su teléfono; la cámara se va a su mano (capturas reales) */
  t = T("escanea");
  tl.set(q(".k-ticket"), {autoAlpha: 0}, t - 0.1);
  brazo("ana", "brazo", t - 0.1, 0.01); brazo("carlos", "brazo", t - 0.1, 0.01); brazo("sofia", "brazos", t - 0.1, 0.01); brazo("diego", "brazos", t - 0.1, 0.01);
  tl.set(q(".k-ana-cabeza, .k-carlos-cabeza"), {rotation: 0}, t - 0.1);
  entra(".sala", t - 0.1, 0.5); pulsoQR(t - 0.1, 1);
  brazo("ana", "brazo-cel", t + 0.1);
  cam(t + 0.2, {s: 2.3, x: -330, y: -1000, fs: 1.3, fx: 150}, 1.5, "power2.in");
  corte(".sala", ".cerca", t + 1.0, 0.7);
  tl.fromTo(q(".cfon"), {scale: 1.16}, {scale: 1.06, duration: 6.5, ease: "power1.out", immediateRender: false}, t + 1.0);
  pon(".cs.visor", t + 0.9, true);
  tl.fromTo(q(".agA"), {...PA, autoAlpha: 0, y: PA.y + 260}, {...PA, autoAlpha: 1, duration: 1.1, ease: "power3.out", immediateRender: false}, t + 1.1);
  tl.fromTo(q(".ret"), {scale: 1.6, autoAlpha: 0.4}, {scale: 1, autoAlpha: 1, duration: 0.9, ease: "power3.out", immediateRender: false}, t + 2.0);
  entra(".det", t + 3.0, 0.4, {y: 14}, {y: 0, ease: "back.out(2)"});
  toca(".agA", 200, 580, t + 3.8);
  entra(".cs.bien", t + 4.05, 0.35, {scale: 1.04}, {scale: 1});
  toca(".agA", 200, 366, t + 5.6);
  entra(".cs.menu", t + 5.9, 0.4, {scale: 1.04}, {scale: 1});
  retira(".agA", t + 6.6);
  /* ===== acto 2: el teléfono en la mano de Ana, con la mesa desenfocada detrás ===== */
  /* 4 · la carta se adapta a lo que Ana no come */
  t = T("filtra");
  tl.to(q(".agA"), {...PB, duration: 1.2, ease: "power3.inOut"}, t + 0.1);
  pantalla(".cs.pHola", t + 0.6, 0.45);
  const msj = q(".carga span");
  msj.forEach((m, k) => { tl.fromTo(m, {autoAlpha: 0, y: 10}, {autoAlpha: 1, y: 0, duration: 0.3, immediateRender: false}, t + 1.0 + k * 1.0); if (k < msj.length - 1) tl.to(m, {autoAlpha: 0, y: -10, duration: 0.25}, t + 1.75 + k * 1.0); });
  entra(".cs.pHola .cchips .cchip", t + 1.4, 0.45, {scale: 0.7}, {scale: 1, ease: "back.out(2)", stagger: 0.25});
  entra(".cs.pHola .tel", t + 2.0, 0.4);
  entra(".cs.pHola .cfuera .cno", t + 3.0, 0.3, {scale: 0.6}, {scale: 1, stagger: 0.2});
  tl.to(q(".cs.pHola .cfuera"), {height: 0, autoAlpha: 0, duration: 0.6, ease: "power2.inOut", stagger: 0.15}, t + 3.7);
  tl.to(q(".carga span:last-child"), {autoAlpha: 0, duration: 0.3}, t + 4.3);
  entra(".clisto", t + 4.5, 0.5, {y: 30, scale: 0.9}, {y: 0, scale: 1, ease: "back.out(1.8)"});
  /* 5 · su Top 3: el índice de su otra mano lo recorre y elige */
  t = T("top3");
  tl.to(q(".agA"), {...PC, duration: 1.0, ease: "power3.inOut"}, t);
  tl.to(q(".cfon"), {x: -40, duration: 1.4, ease: "power2.inOut"}, t);
  pantalla(".cs.pTop3", t + 0.1, 0.5);
  const sec = (de, a, tt) => { tl.to(q(".sx" + de), {autoAlpha: 0, y: -10, duration: 0.25}, tt); tl.fromTo(q(".sx" + a), {autoAlpha: 0, y: 10}, {autoAlpha: 1, y: 0, duration: 0.3, immediateRender: false}, tt + 0.15); };
  const desliza = (x0, x1, riel, tt, d = 0.8) => { mueve(".agA", x0, 356, tt - 0.35, 0.3); tl.to(q(".agA .dedo"), {x: x1, duration: d, ease: "power2.inOut"}, tt); tl.to(q(".cs.pTop3 .rail"), {x: riel, duration: d, ease: "power2.inOut"}, tt); };
  tl.set(q(".cs.pTop3 .rail"), {x: 0}, t);
  desliza(318, 110, -702, t + 1.0, 0.7); sec(0, 1, t + 1.3); tl.to(q(".cs.pTop3 .porq"), {autoAlpha: 0, duration: 0.3}, t + 1.3);
  desliza(318, 130, -1170, t + 2.1, 0.7); sec(1, 2, t + 2.4);
  desliza(318, 150, -1420, t + 3.2, 0.6); sec(2, 3, t + 3.4);
  desliza(110, 330, 0, t + 4.4, 1.0); sec(3, 0, t + 4.9); tl.to(q(".cs.pTop3 .porq"), {autoAlpha: 1, duration: 0.3}, t + 5.1);
  toca(".agA", 130, 300, t + 6.6);
  /* 6 · al tocar, la tarjeta se expande, la hoja sube hasta tres cuartos y entran en orden nombre, precio, componentes y recomendación */
  t = T("plato");
  tl.to(q(".agA"), {...PB, duration: 1.0, ease: "power3.inOut"}, t);
  tl.to(q(".cfon"), {x: 0, duration: 1.2, ease: "power2.inOut"}, t);
  tl.set(q(".cs.pPlato .cabp, .cs.pPlato .vuela, .cs.pPlato .caviso"), {autoAlpha: 0}, t);
  tl.fromTo(q(".cs.pPlato"), {autoAlpha: 0, scale: 0.46, transformOrigin: "130px 300px"}, {autoAlpha: 1, scale: 1, duration: 0.6, ease: "power3.out", immediateRender: false}, t);
  tl.fromTo(q(".pPlato .ficha"), {y: 540}, {y: 0, duration: 0.7, ease: "power3.out", immediateRender: false}, t + 0.5);
  tl.fromTo(q(".torno .gir"), {rotation: 0}, {rotation: 360, duration: T("juntos") - T("plato"), ease: "none", immediateRender: false}, t);
  [0.6, 4.2, 7.8].forEach(d => tl.fromTo(q(".torno .brillo i"), {x: 0}, {x: 380, duration: 1.4, ease: "sine.inOut", immediateRender: false}, t + d));
  entra(".pPlato .ficha h4", t + 1.2, 0.45, {y: 16}, {y: 0});
  entra(".pPlato .ficha .cpr", t + 1.6, 0.4, {y: 12}, {y: 0});
  entra(".pPlato .cing", t + 2.0, 0.4, {y: 14, scale: 0.9}, {y: 0, scale: 1, ease: "back.out(2)", stagger: 0.18});
  entra(".pPlato .reco", t + 3.3, 0.5, {y: 20}, {y: 0});
  /* 7 · «Agregar a mi orden»: toca y el platillo vuela a su mesa virtual */
  t = T("agrega");
  toca(".agA", 200, 798, t + 0.9);
  tl.to(q(".agr"), {scale: 0.96, duration: 0.12, yoyo: true, repeat: 1}, t + 0.9);
  entra(".cs.pPlato .cabp", t + 0.6, 0.3);
  tl.fromTo(q(".vuela"), {autoAlpha: 1, x: 0, scale: 1}, {x: 156, scale: 0.6, duration: 0.9, ease: "power1.in", immediateRender: false}, t + 1.1);
  tl.fromTo(q(".vuela"), {y: 0}, {y: -716, duration: 0.9, ease: "power2.out", immediateRender: false}, t + 1.1);
  tl.to(q(".vuela"), {autoAlpha: 0, duration: 0.15}, t + 1.95);
  tl.fromTo(q(".pPlato .mia .bd"), {autoAlpha: 0, scale: 0.3}, {autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(3)", immediateRender: false}, t + 2.0);
  entra(".cs.pPlato .caviso", t + 2.2, 0.4, {y: 20}, {y: 0, ease: "back.out(1.6)"});
  retira(".agA", t + 2.0);
  /* ===== acto 3: la mesa pide junta ===== */
  /* 8 · de vuelta al plano abierto: Ana ya pidió y deja el teléfono; Carlos sigue eligiendo, con la cara alumbrada por la pantalla */
  t = T("juntos");
  tl.set(q(".pfig"), {scale: 1.5, x: -330, y: -430}, t); tl.set(q(".pfon"), {scale: 1.2, x: 60, y: 0}, t);
  tl.set(q(".gm"), {autoAlpha: 0, rotation: 0}, t);
  brazo("ana", "brazo", t, 0.01); brazo("carlos", "brazo-cel", t, 0.01); brazo("sofia", "brazos", t, 0.01); brazo("diego", "brazos-cel", t, 0.01);
  tl.set(q(".k-ana-cabeza"), {rotation: 0}, t); tl.set(q(".k-carlos-cabeza"), {rotation: -7}, t);
  entra(".eS", t + 2.1, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2)"}); entra(".eD", t + 2.15, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2)"}); sale(".eS, .eD", t + 6.5, 0.3);
  corte(".cerca", ".sala", t, 0.7);
  cam(t + 0.1, C1, 2.0, "power2.out");
  sale(".agA", t + 0.7, 0.01);
  entra(".eA", t + 2.0, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2)"});
  entra(".eC", t + 2.2, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2)"});
  globo(3, t + 2.6, t + 4.5); gesto("ana", t + 2.6, 2, 8); cabeza("ana", 4, t + 2.6); inclina(".gA", 2.5, t + 2.5); inclina(".gA", 0, t + 4.4);
  globo(4, t + 4.7, t + 6.5); cabeza("carlos", 2, t + 4.7); cabeza("carlos", -7, t + 5.6);
  sale(".eA, .eC", t + 6.5, 0.3);
  /* 9 · Ana aún es nueva en Carta; elige una arrachera y se la manda a Carlos (visión); cada teléfono, en la mano de su dueño */
  t = T("recomienda");
  pon(".cs.pAviso", t, true); pon(".cs.pCarlos", t, true);
  tl.set(q(".agA"), {...PF, autoAlpha: 1}, t); tl.set(q(".agC"), {...P2F, autoAlpha: 1}, t);
  tl.set(q(".cfon"), {scale: 1.5, x: 420, y: -200}, t);
  corte(".sala", ".cerca", t, 0.7);
  tl.fromTo(q(".agA"), {y: PF.y + 90}, {y: PF.y, duration: 1.0, ease: "power3.out", immediateRender: false}, t);
  tl.fromTo(q(".agC"), {y: P2F.y + 120}, {y: P2F.y, duration: 1.1, ease: "power3.out", immediateRender: false}, t);
  entra(".nom", t + 0.8, 0.4);
  toca(".agA", 200, 312, t + 1.8);
  pantalla(".cs.pRes", t + 1.95, 0.35);
  toca(".agA", 200, 726, t + 3.3);
  entra(".cs.pRes .toast", t + 3.45, 0.35, {y: -14}, {y: 0});
  entra(".reco2", t + 3.95, 0.45, {y: 30, scale: 0.92}, {y: 0, scale: 1, ease: "back.out(1.6)"});
  retira(".agA", t + 4.3);
  toca(".agC", 200, 498, t + 5.4, -1);
  sale(".reco2", t + 5.6, 0.3);
  entra(".cs.pCarlos .toast", t + 5.6, 0.35, {y: -14}, {y: 0});
  entra(".conf", t + 5.9, 0.4, {y: 20}, {y: 0});
  /* 10 · Carlos confirma: la mesa llama al mesero */
  t = T("confirma");
  toca(".agC", 200, 800, t + 0.9, -1);
  pantalla(".cs.pListosB", t + 1.05, 0.4);
  pantalla(".cs.pListosA", t + 1.35, 0.4);
  retira(".agC", t + 1.9, REPC);
  /* ===== acto 4: el mesero ===== */
  /* 11 · el mesero, en otra parte del salón: le vibra el bolsillo (aviso con el teléfono bloqueado: visión), mira y dice «Ya voy» */
  t = T("avisa");
  pon(".cs.bloq", t, true); tl.set(q(".agM"), {...PM, autoAlpha: 0}, t);
  tl.to(q(".agA, .agC, .nom"), {autoAlpha: 0, duration: 0.5, ease: "power1.inOut"}, t);
  tl.to(q(".cfon"), {x: -160, duration: 1.2, ease: "power2.inOut"}, t);
  tl.fromTo(q(".agM"), {y: PM.y + 220, autoAlpha: 0}, {y: PM.y, autoAlpha: 1, duration: 1.0, ease: "power3.out", immediateRender: false}, t + 0.3);
  entra(".noti", t + 1.1, 0.5, {y: -24, scale: 0.92}, {y: 0, scale: 1, ease: "back.out(1.7)"});
  toca(".agM", 200, 425, t + 2.8);
  pantalla(".cs.pOrden", t + 3.0, 0.4);
  retira(".agM", t + 3.9, REP, 0.5);
  /* de vuelta a la mesa: el mesero llega con su teléfono en la mano */
  tl.set(q(".pfig"), {scale: 1.04, x: -38, y: -30}, t + 4.5); tl.set(q(".pfon"), {scale: 1.04, x: 0, y: 0}, t + 4.5);
  brazo("diego", "brazos", t + 4.5, 0.01); brazo("carlos", "brazo", t + 4.5, 0.01); brazo("mesero", "brazos-cel", t + 4.5, 0.01);
  tl.set(q(".k-carlos-cabeza, .k-mesero-cabeza"), {rotation: 0}, t + 4.5);
  tl.set(q(".gm"), {autoAlpha: 0, x: 240, rotation: 0}, t + 4.5);
  corte(".cerca", ".sala", t + 4.6, 0.6);
  sale(".agM", t + 5.2, 0.01);
  tl.to(q(".gm"), {autoAlpha: 1, x: 0, duration: 1.2, ease: "power2.out"}, t + 4.8);
  cam(t + 4.6, C1, 3.5, "sine.out");
  /* 12 · repasa la orden con ellos y la manda */
  t = T("llega");
  mira(1, t + 0.1); cabeza("mesero", 4, t + 0.4); inclina(".gm", -2.5, t + 0.3, 0.9); inclina(".gm", 0, t + 7.6, 0.8);
  globo(5, t + 0.5, t + 2.1); globo(29, t + 2.2, t + 4.4); globo(30, t + 4.5, t + 6.1);
  cabeza("ana", -4, t + 0.6, 0.4); cabeza("sofia", 4, t + 2.3, 0.4); cabeza("diego", -4, t + 3.3, 0.4); cabeza("carlos", 5, t + 4.6, 0.4);
  globo(6, t + 6.3, t + 7.7); cabeza("ana", -6, t + 6.3, 0.3); cabeza("ana", 2, t + 6.8, 0.3); cabeza("ana", -4, t + 7.2, 0.3);
  entra(".eCom", t + 7.8, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2)"});
  /* ===== acto 5: el ciclo de la mesa, a cámara rápida; arriba a la derecha, el teléfono del mesero ===== */
  const a5 = T("abierta"), d5 = T("fin") - a5;
  const A = ".agP";
  /* el estado activo de la pista cambia cuando el mesero toca el botón */
  const fase = (k, tt) => {
    if (k > 0) { tl.to(q(`.ps${k - 1} .pbg, .ps${k - 1} .pca, .mst .m${k - 1}, .pnota .n${k - 1}, .pbt.b${k - 1}`), {autoAlpha: 0, duration: 0.3}, tt); tl.fromTo(q(`.ps${k - 1} .pok`), {autoAlpha: 0, scale: 0.4}, {autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2.5)", immediateRender: false}, tt + 0.1); }
    tl.fromTo(q(`.ps${k} .pbg`), {autoAlpha: 0, scale: 0.94}, {autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(1.6)", immediateRender: false}, tt + 0.1);
    tl.fromTo(q(`.ps${k} .pca`), {autoAlpha: 0, scale: 0.3}, {autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(2.5)", immediateRender: false}, tt + 0.15);
    entra(`.mst .m${k}, .pnota .n${k}`, tt + 0.2, 0.3);
    entra(`.pbt.b${k}`, tt + 0.35, 0.35, {y: 14}, {y: 0});
  };
  const pulsa = (k, tt) => { toca(A, 200, 800, tt); tl.to(q(`.pbt.b${k}`), {scale: 0.95, duration: 0.12, yoyo: true, repeat: 1}, tt); retira(A, tt + 0.9); };
  t = a5;
  sale(".eCom", t, 0.3);
  cam(t + 0.1, CA5, 1.4);
  tl.to(q(".gm"), {x: 220, autoAlpha: 0, duration: 0.9, ease: "power2.in"}, t + 0.1);
  tl.fromTo(q(".pip"), {autoAlpha: 0, x: 60}, {autoAlpha: 1, x: 0, duration: 0.8, ease: "power3.out", immediateRender: false}, t + 0.6);
  fase(0, t + 0.6);
  entra(".reloj", t + 0.6, 0.4);
  tl.fromTo(q(".reloj .hh"), {rotation: 240}, {rotation: 300, duration: d5, ease: "none", immediateRender: false}, a5);
  tl.fromTo(q(".reloj .mm"), {rotation: 0}, {rotation: 720, duration: d5, ease: "none", immediateRender: false}, a5);
  /* 13 · abierta: llegan los platillos; comen y platican por turnos */
  entra(".k-platillo-a, .k-platillo-c", t + 1.5, 0.6, {y: -18}, {y: 0, stagger: 0.25});
  cabeza("ana", 5, t + 1.6); cabeza("carlos", -5, t + 1.8);
  globo(8, t + 2.3, t + 4.1); inclina(".gA", 3, t + 2.3); inclina(".gA", 0, t + 4.0);
  globo(9, t + 4.3, t + 6.2); inclina(".gC", -3, t + 4.3); inclina(".gC", 0, t + 6.0, 0.5);
  gesto("ana", t + 2.4, 3, 12); cabeza("ana", -4, t + 2.4, 0.4); cabeza("ana", 2, t + 3.0, 0.4); cabeza("ana", -3, t + 3.6, 0.4);
  cabeza("carlos", 4, t + 2.6, 0.4); cabeza("carlos", -2, t + 3.3, 0.4);
  brazo("carlos", "brazo-copa", t + 3.9); pon(".k-copa-c", t + 3.95, false);
  tl.fromTo(q(".k-carlos-brazo-copa"), {rotation: 0}, {rotation: 14, duration: 0.5, yoyo: true, repeat: 1, ease: "sine.inOut", immediateRender: false}, t + 4.2);
  cabeza("carlos", 6, t + 4.2, 0.5); cabeza("carlos", 0, t + 4.8, 0.4);
  brazo("carlos", "brazo", t + 5.3); pon(".k-copa-c", t + 5.4, true);
  gesto("carlos", t + 5.5, 2, 10);
  brazo("ana", "brazo-copa", t + 4.6); pon(".k-copa-a", t + 4.65, false);
  tl.fromTo(q(".k-ana-brazo-copa"), {rotation: 0}, {rotation: -14, duration: 0.5, yoyo: true, repeat: 1, ease: "sine.inOut", immediateRender: false}, t + 4.9);
  cabeza("ana", -6, t + 4.9, 0.5); cabeza("ana", 0, t + 5.5, 0.4);
  brazo("ana", "brazo", t + 6.0); pon(".k-copa-a", t + 6.1, true);
  entra(".k-pastel", t + 3.2, 0.6, {y: -18}, {y: 0}); cabeza("sofia", 5, t + 3.4); cabeza("sofia", -3, t + 4.4); cabeza("diego", -5, t + 3.8); cabeza("diego", 3, t + 5.0);
  /* 14 · ya terminaron: «¿ya nadie va a pedir nada más?»; van a pagar e invitan a Sofía */
  t = T("piden");
  tl.to(q(".k-platillo-a, .k-platillo-c, .k-montaje"), {autoAlpha: 0, duration: 0.5}, t); entra(".k-sucia-a, .k-sucia-c", t, 0.5);
  habla(32, t + 0.5, t + 2.3, "diego", 5); inclina(".gD", -2, t + 0.5); inclina(".gD", 0, t + 2.2);
  habla(33, t + 2.4, t + 3.6, "ana", -5);
  habla(34, t + 3.7, t + 5.0, "carlos", 6); inclina(".gC", -3, t + 3.7); inclina(".gC", 0, t + 4.9);
  habla(35, t + 5.1, t + 7.5, "ana", -6); inclina(".gA", 3, t + 5.1); inclina(".gA", 0, t + 7.3);
  cabeza("sofia", 6, t + 5.6, 0.3); cabeza("sofia", -5, t + 6.1, 0.3); cabeza("sofia", 4, t + 6.6, 0.3); cabeza("sofia", 0, t + 7.1, 0.3);
  /* 14b · pantalla dividida en cuatro: cada quien, en el seguimiento de su orden, toca «Cerrar mi cuenta»; el tablero marca «Cuenta cerrada» */
  t = T("cierran");
  tl.set(q(".cfon"), {scale: 1.5, x: 420, y: -200, scaleX: 1.5}, t);
  QUIEN.forEach((_, k) => { tl.set(q(".agQ" + k + " .qS"), {autoAlpha: 1}, t); tl.set(q(".agQ" + k), {...PQ(k), autoAlpha: 1}, t); tl.fromTo(q(".agQ" + k), {y: PQ(k).y + 130}, {y: PQ(k).y, duration: 0.9, ease: "power3.out", immediateRender: false}, t + k * 0.12); });
  corte(".sala", ".cerca", t, 0.7);
  entra(".agQ .nom", t + 0.8, 0.4);
  QUIEN.forEach((_, k) => { const tt = t + 1.7 + k * 0.3; toque(".agQ" + k, 200, 800, tt); tl.to(q(".agQ" + k + " .qS .btn2"), {scale: 0.95, duration: 0.12, yoyo: true, repeat: 1}, tt); pantalla(".agQ" + k + " .qC", tt + 0.25, 0.4); });
  fase(1, t + 3.0);
  /* 14c · se abre la cuenta de cada quien: baja, dice qué le gustó, deja su propina e invita a Sofía; la de Sofía queda en cero */
  t = T("cuenta");
  tl.to(q(".agQ .qin"), {y: -150, duration: 0.9, ease: "power2.inOut", stagger: 0.12}, t + 0.9);
  QUIEN.forEach((_, k) => { const tt = t + 2.3 + k * 0.22; toque(".agQ" + k, 356, 134, tt); tl.fromTo(q(".agQ" + k + " .qlk"), {autoAlpha: 0, scale: 0.3}, {autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(3)", stagger: 0.25, immediateRender: false}, tt + 0.05); });
  [0, 2, 3].forEach((k, j) => { const tt = t + 4.6 + j * 0.35; toque(".agQ" + k, 287, 326, tt); entra(".agQ" + k + " .qsel", tt + 0.05, 0.3, {scale: 0.6}, {scale: 1, ease: "back.out(2)"}); tl.to(q(".agQ" + k + " .qp"), {color: "#fff", duration: 0.2}, tt + 0.05);
    entra(".agQ" + k + " .cinv", tt + 0.3, 0.4, {x: -12}, {x: 0}); tl.to(q(".agQ" + k + " .cv0"), {autoAlpha: 0, duration: 0.2}, tt + 0.4); entra(".agQ" + k + " .cv1", tt + 0.5, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2.4)"}); });
  entra(".qinvS", t + 6.1, 0.5, {y: 14, scale: 0.92}, {y: 0, scale: 1, ease: "back.out(1.7)"});
  tl.to(q(".agQ1 .cv0"), {autoAlpha: 0, duration: 0.2}, t + 6.3); entra(".agQ1 .cv1", t + 6.4, 0.5, {scale: 0.5}, {scale: 1, ease: "back.out(2.6)"});
  /* 15 · pagada: pagan fuera de Carta (la terminal del restaurante) y el mesero valida el pago en su teléfono */
  t = T("pagada");
  brazo("ana", "brazo", t, 0.01); brazo("carlos", "brazo", t, 0.01); brazo("sofia", "brazos", t, 0.01); brazo("diego", "brazos", t, 0.01);
  corte(".cerca", ".sala", t, 0.7); sale(".agQ", t + 0.7, 0.01);
  brazo("ana", "brazo", t + 0.2); brazo("carlos", "brazo", t + 0.3); brazo("sofia", "brazos", t + 0.25); brazo("diego", "brazos", t + 0.35); cabeza("ana", -4, t + 0.3); cabeza("carlos", 4, t + 0.4);
  brazo("mesero", "brazos-terminal", t, 0.01); tl.set(q(".k-mesero-cabeza"), {scaleX: -1, rotation: 0}, t);
  tl.fromTo(q(".gm"), {x: 220, autoAlpha: 0}, {x: 0, autoAlpha: 1, duration: 1.0, ease: "power2.out", immediateRender: false}, t + 0.2);
  tl.to(q(".k-mesero-cabeza"), {scaleX: 1, duration: 0.3, ease: "power1.inOut"}, t + 1.0);
  inclina(".gm", 3, t + 1.0, 0.8); inclina(".gm", 0, t + 2.8, 0.6);
  globo(25, t + 1.2, t + 3.0);
  tl.to(q(".k-carlos-brazo"), {rotation: 22, duration: 0.45, ease: "power2.out"}, t + 1.5);
  tl.fromTo(q(".buzz"), {autoAlpha: 0, scale: 0.5, x: 180, y: 0}, {autoAlpha: 1, scale: 1.1, duration: 0.3, yoyo: true, repeat: 1, ease: "sine.inOut", immediateRender: false}, t + 2.0);
  tl.to(q(".k-carlos-brazo"), {rotation: 0, duration: 0.45, ease: "power2.inOut"}, t + 2.6);
  brazo("mesero", "brazos-cel", t + 3.0, 0.3); tl.to(q(".k-mesero-cabeza"), {scaleX: -1, duration: 0.3, ease: "power1.inOut"}, t + 3.0); cabeza("mesero", -8, t + 3.1);
  pulsa(1, t + 3.7); fase(2, t + 3.8);
  entra(".ePago", t + 4.6, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2)"});
  mira(-1, t + 4.0); globo(7, t + 4.3, t + 6.2); cabeza("mesero", 0, t + 4.3);
  /* 16 · mesa sucia: se van, un vaso se cae; la cámara se acerca y el mesero retira todo */
  t = T("sucia");
  sale(".ePago", t, 0.3);
  tl.to(q(".gA"), {x: -150, autoAlpha: 0, duration: 0.9, ease: "power2.in"}, t + 0.1);
  tl.to(q(".gC"), {x: 150, autoAlpha: 0, duration: 0.9, ease: "power2.in"}, t + 0.3);
  tl.to(q(".gS, .gD"), {y: 40, autoAlpha: 0, duration: 0.8, ease: "power2.in"}, t + 0.2); sale(".k-pastel", t + 0.2, 0.5);
  tl.to(q(".gm"), {x: 220, autoAlpha: 0, duration: 0.8, ease: "power2.in"}, t + 0.2);
  tl.to(q(".k-copa-a"), {rotation: -78, duration: 0.45, ease: "power2.in"}, t + 0.7);
  sale(".k-copa-a", t + 1.1, 0.15); entra(".k-sucia-vaso", t + 1.05, 0.5); entra(".k-sucia-migas", t + 0.4, 0.4);
  cam(t + 0.6, CSUC, 1.6);
  brazo("mesero", "brazos-trapo", t + 1.2, 0.01);
  tl.to(q(".gm"), {x: 0, autoAlpha: 1, duration: 0.9, ease: "power2.out"}, t + 2.0);
  tl.to(q(".k-sucia-a"), {y: -50, autoAlpha: 0, duration: 0.45, ease: "power2.in"}, t + 3.0);
  tl.to(q(".k-sucia-c"), {y: -50, autoAlpha: 0, duration: 0.45, ease: "power2.in"}, t + 3.4);
  tl.fromTo(q(".k-mesero-brazos-trapo"), {x: -24}, {x: 30, duration: 0.4, yoyo: true, repeat: 3, ease: "sine.inOut", immediateRender: false}, t + 3.5);
  sale(".k-sucia-vaso", t + 3.9, 0.5); sale(".k-sucia-migas", t + 4.1, 0.5);
  /* 17 · mesa limpia: la monta de nuevo, toca «Marcar mesa limpia» y la mesa queda libre; el QR se enciende y llegan otros dos */
  t = T("limpia");
  tl.set(q(".k-copa-a"), {rotation: 0}, t);
  entra(".k-montaje", t + 0.1, 0.5, {y: -14}, {y: 0}); entra(".k-copa-a", t + 0.4, 0.4, {y: -14}, {y: 0});
  brazo("mesero", "brazos-cel", t + 0.7, 0.3); cabeza("mesero", -8, t + 0.8);
  pulsa(2, t + 1.7); fase(3, t + 1.8);
  pulsoQR(t + 2.3, 2);
  entra(".eLibre", t + 2.6, 0.4, {scale: 0.6}, {scale: 1, ease: "back.out(2)"});
  tl.to(q(".gm"), {x: 220, autoAlpha: 0, duration: 0.9, ease: "power2.in"}, t + 2.9);
  cam(t + 3.0, C1, 2.2);
  tl.to(q(".pip"), {autoAlpha: 0, x: 60, duration: 0.6, ease: "power2.in"}, t + 3.2);
  sale(".eLibre", t + 3.3, 0.3); sale(".reloj", t + 4.2, 0.4);
  tl.fromTo(q(".k-nuevos"), {autoAlpha: 0, x: -360}, {autoAlpha: 1, x: 0, duration: 1.9, ease: "power2.out", immediateRender: false}, t + 3.6);
  /* cierre */
  t = T("fin");
  sale(".sala", t + 0.1, 0.9);
  tl.set(q(".marca"), {autoAlpha: 1}, t + 1.1);
  tl.fromTo(q(".marca b, .marca i, .marca span"), {y: 24, autoAlpha: 0}, {y: 0, autoAlpha: 1, duration: 1.0, ease: "power3.out", stagger: 0.3, immediateRender: false}, t + 1.1);
  tl.set({}, {}, TOT);
  return tl;
}

function cerrarIntro() { cancelAnimationFrame(rafI); $("#intro").hidden = true; document.body.style.overflow = ""; try { localStorage.setItem("carta-v9-intro", "1"); } catch (e) { /* ignorar */ } }
function pintaIntro() {
  const s = tI / 1000;
  if (tlF) tlF.time(s, false);
  const av = $("#intro .barras i b"); if (av) av.style.width = (100 * s / TOT) + "%";
  const bp = $("#introPausa"); if (bp) bp.textContent = pausaI ? "▶" : "❚❚";
  const cta = $("#introCta"); if (cta) cta.hidden = s < tomaIni("fin") + 2.6;
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
  el.innerHTML = `${cineHtml()}<div id="introCta" class="icta" hidden><button class="btn" data-intro="repetir">↻ Repetir</button><button class="btn gran" data-intro="saltar">Ver el informe</button></div>` +
    `<div class="ictl"><button class="btn" data-intro="saltar">Saltar ✕</button></div><div class="barras ictl"><i><b></b></i><button class="btn" data-intro="menos" aria-label="Atrás 3 segundos">−3 s</button><button class="btn" id="introPausa" data-intro="pausa" aria-label="Pausa o reanudar">❚❚</button><button class="btn" data-intro="mas" aria-label="Adelante 3 segundos">+3 s</button>${BTN_PANTALLA}</div>`;
  el.hidden = false; document.body.style.overflow = "hidden"; filmEscala();
  if (tlF) tlF.kill(); tlF = filmLinea();
  tI = REDUCE ? CLAVES[0] * 1000 : 0; pausaI = REDUCE; ultI = performance.now(); pintaIntro(); muestraControles();
  cancelAnimationFrame(rafI); rafI = requestAnimationFrame(frameIntro);
  el.onpointermove = muestraControles;
  el.onclick = ev => {
    muestraControles(); const b = ev.target.closest("[data-intro]");
    if (!b) { if (!ev.target.closest("button, .icta")) { pausaI = !pausaI; pintaIntro(); } return; } /* un clic en cualquier parte pausa o reanuda */
    const a = b.dataset.intro;
    if (a === "saltar") cerrarIntro();
    else if (a === "repetir") { tI = REDUCE ? CLAVES[0] * 1000 : 0; pausaI = REDUCE; ultI = performance.now(); pintaIntro(); }
    else if (a === "pausa") { pausaI = !pausaI; pintaIntro(); }
    else if (a === "menos") saltaI(-3000); else if (a === "mas") saltaI(3000);
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
