// Genera las ilustraciones de la película del informe (apoyo/cine/*.svg).
// Uso: node docs/informes/2026-11-14-planos-de-carta-v4/apoyo/cine/generar.mjs
// Todas las capas de la escena comparten el cuadro de 1920×1080: se apilan en el mismo sitio y cada parte
// (un brazo, un personaje) se mueve sola con GSAP. Sin texto dentro de los SVG: un SVG cargado como imagen
// no ve las fuentes de la página; todo rótulo vive en el DOM. El QR es de adorno y no codifica nada.
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const n = (x) => Math.round(x * 10) / 10;
const svg = (vb, defs, cuerpo) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"><defs>${defs}</defs>${cuerpo}</svg>\n`;
const lin = (id, a, b, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const rad = (id, c, o0 = 1, o1 = 0) => `<radialGradient id="${id}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${c}" stop-opacity="${o0}"/><stop offset="1" stop-color="${c}" stop-opacity="${o1}"/></radialGradient>`;
const sombraSuave = `<filter id="bl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter><filter id="bl2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>`;
const archivos = {};
const guarda = (nombre, contenido) => { archivos[nombre] = contenido; writeFileSync(resolve(aqui, nombre), contenido); };

/* paleta: la de Carta (vino, crema, dorado) con un verde oliva de acento */
const P = {
  vino: '#4f1728', vino2: '#6b2d3e', crema: '#fef9f1', dorado: '#b8860b', oro: '#e7b75a', oliva: '#66713d', oliva2: '#4c5630',
  piel1: '#c68863', piel1s: '#a66b4b', piel2: '#8f5c3d', piel2s: '#744830', piel3: '#d6a27c', piel3s: '#b98460',
  pelo1: '#2a1712', pelo1h: '#4c2b1f', pelo2: '#17110f', pelo3: '#2c2320',
};

/* un QR de adorno: tres cuadros guía y celdas pseudoaleatorias deterministas */
function qr(x, y, c, color = '#1a1a1a') {
  const N = 21; let s = 7, o = '';
  const guia = (i, j) => { const bloques = [[0, 0], [0, N - 7], [N - 7, 0]]; for (const [a, b] of bloques) if (i >= a && i < a + 7 && j >= b && j < b + 7) { const r = Math.max(Math.abs(i - a - 3), Math.abs(j - b - 3)); return r === 3 || r <= 1 ? 1 : 0; } return -1; };
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    s = (s * 1103515245 + 12345) % 2147483648; let on = (s >> 8) % 100 < 46; const g = guia(i, j); if (g >= 0) on = g === 1;
    if (on) o += `M${n(x + j * c)} ${n(y + i * c)}h${c}v${c}h-${c}z`;
  }
  return `<path d="${o}" fill="${color}" shape-rendering="crispEdges"/>`;
}

/* ===================== el salón ===================== */
function salon() {
  const defs = lin('pared', '#3c1521', '#5e2535') + lin('piso', '#2b1712', '#170d0b') + lin('cielo', '#5b2a44', '#f2a96c') +
    lin('zocalo', '#51202d', '#3f1824') + rad('luz', '#ffcf7a', 0.85) + rad('luzS', '#ffb85c', 0.45) + lin('pantalla', '#d9a548', '#8a5a1c') +
    lin('ventLuz', '#ffd9a0', '#ffd9a0', 0, 1) + sombraSuave;
  let c = `<rect width="1920" height="1080" fill="url(#pared)"/>`;
  // ventana en arco al fondo: el cielo del atardecer y la ciudad
  c += `<path d="M720 560 V200 A240 240 0 0 1 1200 200 V560Z" fill="#2a0f18"/>`;
  c += `<path d="M740 548 V206 A220 220 0 0 1 1180 206 V548Z" fill="url(#cielo)"/>`;
  c += `<circle cx="1010" cy="430" r="58" fill="#ffd79a" opacity=".55" filter="url(#bl)"/>`;
  c += `<path d="M740 548 V470 h40 v-36 h34 v52 h26 v-90 h46 v70 h30 v-40 h38 v60 h44 v-110 h30 v20 h28 v84 h40 v-58 h44 v40 h30 v-70 h42 v96 h32 v-34 h36 V548Z" fill="#3d1626" opacity=".9"/>`;
  c += `<path d="M740 548 V500 q60 -30 120 -6 q70 -36 150 0 q80 -30 170 4 V548Z" fill="#2c0f1b"/>`;
  c += `<path d="M956 206 V548 M964 206 V548" stroke="#2a0f18" stroke-width="8"/><path d="M740 380 H1180" stroke="#2a0f18" stroke-width="8"/>`;
  c += `<path d="M720 560 h480 v26 h-480z" fill="#2a0f18"/>`;
  // paneles de la pared (sin líneas: tonos)
  for (const x of [110, 420, 1270, 1580]) c += `<rect x="${x}" y="150" width="230" height="300" rx="10" fill="#fff" opacity=".035"/>`;
  c += `<rect x="0" y="470" width="1920" height="190" fill="url(#zocalo)"/>`;
  for (let x = 30; x < 1920; x += 190) c += `<rect x="${x}" y="500" width="150" height="130" rx="8" fill="#000" opacity=".08"/>`;
  // repisa con botellas a la izquierda
  c += `<rect x="90" y="300" width="300" height="12" rx="4" fill="#2a1410"/>`;
  [[110, 70, '#3d5a3a'], [146, 92, '#5e2535'], [182, 64, '#8a6a2a'], [214, 84, '#2f3f2e'], [252, 58, '#7a3a2a'], [290, 96, '#3d2a2a'], [330, 70, '#5a6a3a']].forEach(([x, h, col]) => {
    c += `<path d="M${x} 300 v-${h - 22} q0 -10 6 -14 v-8 h8 v8 q6 4 6 14 v${h - 22}z" fill="${col}"/><rect x="${x + 3}" y="${300 - h * 0.45}" width="14" height="${n(h * 0.22)}" rx="2" fill="#f3e3c4" opacity=".55"/>`;
  });
  c += `<rect x="90" y="380" width="300" height="12" rx="4" fill="#2a1410"/>`;
  [[118, 40], [170, 52], [226, 36], [282, 48], [334, 40]].forEach(([x, h]) => { c += `<rect x="${x - 14}" y="${380 - h}" width="28" height="${h}" rx="6" fill="#d9c09a" opacity=".5"/>`; });
  // planta grande a la derecha
  c += `<path d="M1720 640 l-20 -110 h120 l-20 110z" fill="#6b3a24"/>`;
  const hoja = (x, y, r, l, col) => `<path transform="translate(${x},${y}) rotate(${r})" d="M0 0 C${l * 0.35} -${l * 0.28} ${l * 0.8} -${l * 0.2} ${l} 0 C${l * 0.8} ${l * 0.2} ${l * 0.35} ${l * 0.28} 0 0Z" fill="${col}"/>`;
  [[1760, 530, -150, 170, '#3f5a2e'], [1760, 530, -110, 210, '#4d6a36'], [1760, 530, -75, 190, '#3a522a'], [1760, 530, -40, 160, '#56743c'], [1760, 530, -130, 140, '#5d7a40'], [1760, 530, -60, 130, '#6b8848']].forEach((h) => { c += hoja(...h); });
  // mesas del fondo, desenfocadas, con su gente
  const mesaFondo = (x, s) => `<g transform="translate(${x},600) scale(${s})" opacity=".55" filter="url(#bl2)"><circle cx="-70" cy="-70" r="22" fill="#2a1712"/><rect x="-96" y="-50" width="52" height="80" rx="24" fill="#6b4a3a"/><circle cx="70" cy="-72" r="22" fill="#3a2a22"/><rect x="44" y="-52" width="52" height="82" rx="24" fill="#3d4a5a"/><ellipse cx="0" cy="10" rx="130" ry="20" fill="#e8dcc4"/><path d="M-130 10 L-120 90 H120 L130 10Z" fill="#cdbb98"/><circle cx="0" cy="-6" r="7" fill="#ffd27a"/></g>`;
  c += mesaFondo(250, 0.75) + mesaFondo(1600, 0.7);
  // piso
  c += `<rect x="0" y="660" width="1920" height="420" fill="url(#piso)"/>`;
  for (let i = 0; i < 9; i++) c += `<rect x="0" y="${660 + i * 48}" width="1920" height="${20 + i * 3}" fill="#fff" opacity="${n(0.018 + i * 0.002)}"/>`;
  c += `<ellipse cx="960" cy="700" rx="760" ry="70" fill="#ffb85c" opacity=".08" filter="url(#bl)"/>`;
  // lámparas colgantes con su luz
  for (const [x, y] of [[560, 190], [1360, 190]]) {
    c += `<circle cx="${x}" cy="${y + 120}" r="330" fill="url(#luzS)"/>`;
    c += `<path d="M${x} 0 V${y - 30}" stroke="#1d0d10" stroke-width="3"/>`;
    c += `<path d="M${x - 58} ${y + 18} C${x - 52} ${y - 34} ${x + 52} ${y - 34} ${x + 58} ${y + 18}Z" fill="url(#pantalla)"/>`;
    c += `<ellipse cx="${x}" cy="${y + 18}" rx="58" ry="9" fill="#fff1c9"/><circle cx="${x}" cy="${y + 30}" r="70" fill="url(#luz)"/>`;
  }
  // viñeta del salón
  c += `<rect width="1920" height="1080" fill="url(#vig)"/>`;
  const vig = `<radialGradient id="vig" cx=".5" cy=".46" r=".72"><stop offset=".55" stop-color="#120708" stop-opacity="0"/><stop offset="1" stop-color="#120708" stop-opacity=".75"/></radialGradient>`;
  guarda('salon.svg', svg('0 0 1920 1080', defs + vig, c));
}

/* ===================== mesa, sillas y acrílico ===================== */
function mesa() {
  const defs = lin('mantel', '#fffaf0', '#eadcc1') + lin('caida', '#eee1c7', '#c3ab84') + lin('copa', '#ffffff', '#e8dcc8') + rad('vela', '#ffd77a', 0.95) + lin('vino', '#7a1f33', '#4f1728') + sombraSuave;
  let c = `<ellipse cx="960" cy="1012" rx="560" ry="34" fill="#000" opacity=".35" filter="url(#bl)"/>`;
  c += `<path d="M532 700 C530 800 520 900 500 1000 Q960 1036 1420 1000 C1400 900 1390 800 1388 700Z" fill="url(#caida)"/>`;
  // pliegues: bandas de tono
  for (const [x, w, o] of [[600, 40, 0.07], [720, 60, 0.05], [860, 50, 0.06], [1010, 70, 0.05], [1150, 46, 0.07], [1270, 60, 0.06]]) c += `<path d="M${x} 760 C${x - 6} 860 ${x - 14} 940 ${x - 22} 1016 h${w} C${x + w - 20} 940 ${x + w - 10} 860 ${x + w} 760Z" fill="#7a5a30" opacity="${o}"/>`;
  c += `<ellipse cx="960" cy="700" rx="430" ry="95" fill="url(#mantel)"/>`;
  c += `<path d="M530 700 A430 95 0 0 0 1390 700 A430 108 0 0 1 530 700Z" fill="#d8c5a1" opacity=".55"/>`;
  // platos frente a Ana y a Carlos
  for (const x of [690, 1230]) c += `<ellipse cx="${x}" cy="706" rx="86" ry="22" fill="#000" opacity=".08"/><ellipse cx="${x}" cy="700" rx="84" ry="21" fill="#fff"/><ellipse cx="${x}" cy="700" rx="56" ry="13" fill="#f3ece0"/>`;
  c += `<rect x="600" y="694" width="5" height="40" rx="2" transform="rotate(-78 600 694)" fill="#c9b48e"/><rect x="1310" y="694" width="5" height="40" rx="2" transform="rotate(78 1310 694)" fill="#c9b48e"/>`;
  // copas
  const copa = (x, y, lleno) => `<ellipse cx="${x}" cy="${y + 62}" rx="20" ry="5" fill="#000" opacity=".1"/><path d="M${x - 18} ${y} C${x - 20} ${y + 26} ${x - 6} ${y + 34} ${x} ${y + 34} C${x + 6} ${y + 34} ${x + 20} ${y + 26} ${x + 18} ${y}Z" fill="url(#copa)" opacity=".75"/>${lleno ? `<path d="M${x - 16} ${y + 14} C${x - 15} ${y + 28} ${x - 5} ${y + 32} ${x} ${y + 32} C${x + 5} ${y + 32} ${x + 15} ${y + 28} ${x + 16} ${y + 14}Z" fill="url(#vino)"/>` : ''}<rect x="${x - 1.6}" y="${y + 34}" width="3.2" height="26" fill="#efe6d6"/><ellipse cx="${x}" cy="${y + 61}" rx="14" ry="4" fill="#efe6d6"/><path d="M${x - 12} ${y + 4} q2 14 8 20" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/>`;
  c += copa(790, 610, true) + copa(1130, 612, true);
  // vela y florero al fondo de la mesa
  c += `<circle cx="1040" cy="618" r="70" fill="url(#vela)"/><rect x="1028" y="616" width="24" height="30" rx="5" fill="#f3e7cf" opacity=".85"/><path d="M1040 598 q-7 12 0 18 q7 -6 0 -18z" fill="#ffcf5a"/>`;
  c += `<path d="M872 650 q-10 -30 6 -40 h12 q16 10 6 40z" fill="#d9c7a6" opacity=".9"/><path d="M884 612 C880 580 870 560 856 548 M884 612 C890 584 900 570 914 560" stroke="#4c6a36" stroke-width="3" fill="none"/><circle cx="854" cy="546" r="9" fill="#c0485a"/><circle cx="916" cy="558" r="8" fill="#e8a33a"/><circle cx="882" cy="570" r="7" fill="#f3d1a0"/>`;
  guarda('mesa.svg', svg('0 0 1920 1080', defs, c));

  // el acrílico con el QR
  const d2 = lin('acr', '#ffffff', '#dfe6ea') + sombraSuave;
  let a = `<ellipse cx="960" cy="716" rx="70" ry="9" fill="#000" opacity=".16" filter="url(#bl2)"/>`;
  a += `<path d="M904 700 h112 l-6 14 h-100z" fill="#e8eef0" opacity=".9"/><rect x="904" y="696" width="112" height="8" rx="3" fill="#ffffff" opacity=".9"/>`;
  a += `<path d="M914 556 h92 l4 142 h-100z" fill="url(#acr)" opacity=".55"/><path d="M914 556 h92 l4 142 h-100z" fill="none" stroke="#ffffff" stroke-width="3" opacity=".7"/>`;
  a += `<rect x="922" y="566" width="76" height="112" rx="6" fill="${P.crema}"/><rect x="922" y="566" width="76" height="20" rx="6" fill="${P.vino}"/><rect x="938" y="574" width="44" height="4" rx="2" fill="${P.oro}"/>`;
  a += qr(928.5, 594, 3);
  a += `<rect x="936" y="664" width="48" height="5" rx="2.5" fill="${P.vino}" opacity=".45"/>`;
  a += `<path d="M918 560 l14 0 l-12 130 h-6z" fill="#fff" opacity=".35"/>`;
  guarda('acrilico.svg', svg('0 0 1920 1080', d2, a));

  // sillas de bistró: el respaldo queda detrás de cada comensal
  const dS = lin('mad', '#8a5634', '#5a321c', 1, 0);
  const silla = (x, dir) => {
    const m = (v) => (dir > 0 ? v : 1920 - v);
    const X = (v) => n(m(x + v));
    return `<path d="M${X(-8)} 730 C${X(-20)} 640 ${X(-26)} 560 ${X(-10)} 470 C${X(0)} 440 ${X(40)} 440 ${X(46)} 470 C${X(56)} 560 ${X(52)} 640 ${X(48)} 730" stroke="url(#mad)" stroke-width="13" fill="none" stroke-linecap="round"/>` +
      `<path d="M${X(4)} 520 C${X(10)} 560 ${X(12)} 640 ${X(14)} 720" stroke="#5a321c" stroke-width="7" fill="none" opacity=".8"/>` +
      `<path d="M${X(-14)} 724 L${X(150)} 728 L${X(150)} 746 L${X(-14)} 742Z" fill="#6a3b22"/>` +
      `<path d="M${X(-4)} 744 L${X(-16)} 1000 M${X(130)} 746 L${X(146)} 1000" stroke="#5a321c" stroke-width="11" stroke-linecap="round"/>` +
      `<path d="M${X(-10)} 900 Q${X(64)} 930 ${X(138)} 900" stroke="#5a321c" stroke-width="6" fill="none"/>`;
  };
  guarda('sillas.svg', svg('0 0 1920 1080', dS, silla(462, 1) + silla(462, -1)));
}

/* ===================== personajes ===================== */
// Cabeza de perfil mirando a la derecha, centrada en (0,0): el cráneo mide ~104 px de alto.
const perfil = {
  cara: 'M-5 -52 C18 -54 39 -40 44 -16 C46 -8 45 -2 47 4 L57 20 C59 24 55 27 49 27 L48 33 C49 36 46 38 43 38 C47 41 47 46 43 50 C40 57 33 62 21 62 C12 62 5 57 0 51 L-25 50 C-40 38 -48 20 -47 0 C-46 -30 -29 -50 -5 -52Z',
};
function ana() {
  const defs = lin('blusa', '#78844a', '#4c5630', 1, 1) + lin('pelo', P.pelo1h, P.pelo1, 1, 1) + lin('pantalon', '#3a2f38', '#241c24');
  const H = 'translate(585,352)';
  let c = '';
  // cadera y muslo (lo que asoma a la izquierda del mantel)
  c += `<path d="M498 664 C494 700 500 728 520 738 L660 744 L660 690 C620 684 560 676 498 664Z" fill="url(#pantalon)"/>`;
  // torso
  c += `<path d="M548 434 C520 442 507 468 505 508 L506 600 C503 636 496 664 498 690 L646 702 C646 668 640 630 636 600 C642 560 648 500 638 466 C630 446 614 436 598 434Z" fill="url(#blusa)"/>`;
  c += `<path d="M520 470 C512 520 514 600 508 680 L530 684 C532 600 528 520 536 470Z" fill="#000" opacity=".12"/>`;
  // cuello y escote
  c += `<path d="M570 396 L566 440 L602 444 L604 400Z" fill="${P.piel1s}"/>`;
  c += `<path d="M562 436 C572 452 582 462 588 468 C596 460 604 448 610 438Z" fill="${P.piel1}"/>`;
  c += `<path d="M574 452 q14 10 28 -2" stroke="${P.oro}" stroke-width="2.4" fill="none"/>`;
  // cabeza
  c += `<g transform="${H}">`;
  c += `<path d="${perfil.cara}" fill="${P.piel1}"/>`;
  c += `<path d="M-25 50 C-40 38 -48 20 -47 0 C-30 20 -18 36 0 51Z" fill="${P.piel1s}" opacity=".6"/>`;
  c += `<ellipse cx="26" cy="27" rx="10" ry="6" fill="#d9705f" opacity=".3"/>`;
  c += `<path d="M21 -2 q9 -6 17 0 q-8 4 -17 0z" fill="${P.pelo1}"/><path d="M19 -4 q10 -9 21 -2" stroke="${P.pelo1}" stroke-width="2" fill="none"/>`;
  c += `<path d="M22 -14 q10 -5 20 0" stroke="${P.pelo1}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  c += `<path d="M44 40 q-4 3 -9 2" stroke="#8c3a3e" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  // pelo: recogido, con brillo y chongo
  c += `<circle cx="-50" cy="-36" r="28" fill="url(#pelo)"/><path d="M-66 -46 q14 -12 30 -2" stroke="#6a3c2a" stroke-width="3" fill="none" opacity=".7"/>`;
  c += `<path d="M-9 -56 C-35 -56 -53 -36 -53 -6 C-53 18 -45 36 -31 46 C-27 28 -27 10 -19 -2 C-3 -10 17 -22 33 -22 C39 -34 25 -56 -9 -56Z" fill="url(#pelo)"/>`;
  c += `<path d="M-30 -44 C-12 -52 10 -48 22 -38" stroke="#6a3c2a" stroke-width="4" fill="none" opacity=".55" stroke-linecap="round"/>`;
  c += `<ellipse cx="-8" cy="8" rx="7" ry="11" fill="${P.piel1s}"/><circle cx="-8" cy="26" r="4.5" fill="${P.oro}"/>`;
  c += `</g>`;
  guarda('ana.svg', svg('0 0 1920 1080', defs, c));
  // brazo apoyado en la mesa
  const brazo = (antebrazo, mano) => `<path d="M588 448 C612 444 630 462 632 490 L640 600 C642 618 630 628 616 626 C602 624 596 612 596 598 L584 490 C582 470 580 454 588 448Z" fill="url(#blusa)"/>` + antebrazo + mano;
  const ap = `<path d="M602 598 C640 608 690 636 724 652 L716 680 C680 670 636 652 604 630Z" fill="url(#blusa)"/>`;
  const mp = `<path d="M712 650 C726 642 748 642 764 650 C776 656 782 666 776 674 C772 680 762 682 750 682 L722 686 C710 682 708 660 712 650Z" fill="${P.piel1}"/><path d="M760 654 q9 6 7 18 M749 652 q9 8 7 22" stroke="${P.piel1s}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".6"/><path d="M716 652 C722 640 736 636 744 642 C740 650 730 656 722 662Z" fill="${P.piel1s}"/>`;
  guarda('ana-brazo.svg', svg('0 0 1920 1080', lin('blusa', '#78844a', '#4c5630', 1, 1), brazo(ap, mp)));
  // brazo con el teléfono en alto (antes del primer plano)
  const ac = `<path d="M604 600 C624 590 654 568 680 540 L700 556 C676 588 646 616 616 632Z" fill="url(#blusa)"/>`;
  const mc = `<rect x="672" y="470" width="38" height="76" rx="8" transform="rotate(14 690 508)" fill="#151012"/><rect x="676" y="476" width="30" height="64" rx="5" transform="rotate(14 690 508)" fill="#e9d9c0" opacity=".9"/>` +
    `<path d="M676 534 C690 528 706 532 712 544 C716 556 706 566 692 566 C680 566 670 556 672 546Z" fill="${P.piel1}"/><path d="M704 532 C712 520 722 516 726 524 C720 532 714 540 708 544Z" fill="${P.piel1}"/>`;
  guarda('ana-brazo-cel.svg', svg('0 0 1920 1080', lin('blusa', '#78844a', '#4c5630', 1, 1), brazo(ac, mc)));
}

function carlos() {
  const defs = lin('saco', '#3a3340', '#211c25', 1, 1) + lin('pelo2', '#2c2220', P.pelo2, 1, 1) + lin('pantalon', '#2b2a33', '#1a1920');
  // espejo de Ana alrededor del centro de la mesa, con su propia complexión
  const M = 'translate(1920,0) scale(-1,1)';
  let c = `<g transform="${M}">`;
  c += `<path d="M494 664 C490 700 496 728 516 740 L660 746 L660 690 C620 684 556 676 494 664Z" fill="url(#pantalon)"/>`;
  c += `<path d="M542 430 C510 440 498 470 496 512 L498 604 C494 640 488 668 492 694 L650 706 C650 668 644 630 640 600 C648 556 654 498 642 464 C634 442 616 432 600 430Z" fill="url(#saco)"/>`;
  c += `<path d="M566 432 L590 470 L612 434Z" fill="#efe4cf"/><path d="M572 432 L590 462 L582 432Z M608 432 L590 462 L598 432Z" fill="#fff" opacity=".7"/>`;
  c += `<path d="M590 470 L578 520 L590 600 L604 520Z" fill="#000" opacity=".15"/>`;
  c += `<path d="M566 394 L562 436 L604 440 L606 398Z" fill="${P.piel2s}"/>`;
  c += `<g transform="translate(585,350) scale(1.05)">`;
  c += `<path d="${perfil.cara}" fill="${P.piel2}"/>`;
  c += `<path d="M-25 50 C-40 38 -48 20 -47 0 C-30 20 -18 36 0 51Z" fill="${P.piel2s}" opacity=".7"/>`;
  // barba corta
  c += `<path d="M-2 18 C6 30 12 36 22 38 C30 36 38 34 44 40 C46 46 44 52 40 56 C34 62 22 64 12 62 C2 60 -10 54 -20 48 C-14 38 -8 28 -2 18Z" fill="${P.pelo2}" opacity=".85"/>`;
  c += `<path d="M30 30 q8 -4 16 -2" stroke="${P.pelo2}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  c += `<path d="M21 -2 q9 -6 17 0 q-8 4 -17 0z" fill="${P.pelo2}"/>`;
  c += `<path d="M20 -14 q11 -5 22 0" stroke="${P.pelo2}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  c += `<path d="M-7 -56 C-35 -58 -52 -38 -51 -8 C-48 -2 -42 4 -36 4 C-36 -14 -30 -26 -16 -32 C2 -36 22 -34 38 -26 C42 -42 24 -56 -7 -56Z" fill="url(#pelo2)"/>`;
  c += `<path d="M-30 -46 C-10 -54 14 -50 30 -40" stroke="#4a3a34" stroke-width="3" fill="none" opacity=".6" stroke-linecap="round"/>`;
  c += `<ellipse cx="-8" cy="8" rx="7" ry="11" fill="${P.piel2s}"/>`;
  c += `</g></g>`;
  guarda('carlos.svg', svg('0 0 1920 1080', defs, c));
  const brazoC = (ante, mano) => `<g transform="${M}"><path d="M584 446 C610 440 630 460 634 490 L642 600 C644 620 632 630 616 628 C600 626 594 612 594 598 L580 490 C578 468 576 452 584 446Z" fill="url(#saco)"/>${ante}${mano}</g>`;
  const ap = `<path d="M602 596 C640 606 690 634 724 650 L716 680 C680 670 636 652 604 630Z" fill="url(#saco)"/><path d="M712 652 L722 682 L732 680 L722 650Z" fill="#efe4cf"/>`;
  const mp = `<path d="M720 650 C738 644 762 648 776 660 C784 668 780 680 768 682 L728 686 C718 682 716 660 720 650Z" fill="${P.piel2}"/><path d="M728 654 C734 642 748 640 756 648 C750 653 740 658 734 662Z" fill="${P.piel2s}"/>`;
  guarda('carlos-brazo.svg', svg('0 0 1920 1080', lin('saco', '#3a3340', '#211c25', 1, 1), brazoC(ap, mp)));
}

function mesero() {
  const defs = lin('chaleco', '#2d2529', '#1b1518', 1, 1) + lin('camisa', '#fffaf2', '#e8ddca', 1, 1) + lin('mandil', '#6b2d3e', '#4f1728') + lin('peloM', '#3a2c26', P.pelo3, 1, 1);
  let c = '';
  // piernas y zapatos (casi siempre detrás de la mesa)
  c += `<path d="M918 900 L914 1000 h36 l4 -100Z M966 900 l4 100 h36 l-4 -100Z" fill="#1d1a1f"/><path d="M906 996 h48 v12 h-52z M966 996 h48 l4 12 h-52z" fill="#0f0c0d"/>`;
  // torso: camisa, chaleco, mandil largo
  c += `<path d="M884 292 C900 278 930 272 960 272 C990 272 1020 278 1036 292 C1046 330 1042 420 1032 524 L888 524 C878 420 874 330 884 292Z" fill="url(#camisa)"/>`;
  c += `<path d="M886 294 C902 282 928 276 944 278 L956 304 L954 524 L890 524 C880 420 876 330 886 294Z" fill="url(#chaleco)"/>`;
  c += `<path d="M1034 294 C1018 282 992 276 976 278 L964 304 L966 524 L1030 524 C1040 420 1044 330 1034 294Z" fill="url(#chaleco)"/>`;
  for (const y of [360, 410, 460]) c += `<circle cx="958" cy="${y}" r="3.5" fill="${P.oro}"/>`;
  c += `<path d="M944 286 L960 300 L976 286 L972 278 L960 288 L948 278Z" fill="#fff"/>`;
  c += `<path d="M946 292 l14 7 l14 -7 l0 14 l-14 -7 l-14 7z" fill="${P.vino2}"/><circle cx="960" cy="299" r="4" fill="${P.vino}"/>`;
  c += `<path d="M1000 330 h20 v6 h-20z" fill="${P.oro}" opacity=".9"/>`;
  c += `<path d="M884 506 L1036 506 L1050 940 L870 940Z" fill="url(#mandil)"/><path d="M880 500 h160 v14 h-160z" fill="${P.vino}"/>`;
  c += `<path d="M904 560 L896 930 M1016 560 L1024 930" stroke="#000" stroke-width="10" opacity=".1"/>`;
  // cuello y cabeza de frente
  c += `<path d="M946 244 h28 v34 q-14 8 -28 0z" fill="${P.piel3s}"/>`;
  c += `<ellipse cx="960" cy="206" rx="35" ry="45" fill="${P.piel3}"/>`;
  c += `<ellipse cx="925" cy="212" rx="6" ry="10" fill="${P.piel3s}"/><ellipse cx="995" cy="212" rx="6" ry="10" fill="${P.piel3s}"/>`;
  c += `<path d="M923 204 C918 160 944 150 964 150 C994 150 1004 172 998 202 C994 184 984 174 968 174 C954 176 942 180 934 196 C930 204 928 210 926 214Z" fill="url(#peloM)"/>`;
  c += `<path d="M926 196 q2 -10 6 -14" stroke="#9a8a80" stroke-width="3" fill="none" opacity=".7"/>`;
  c += `<path d="M940 204 q7 -5 13 0 M967 204 q7 -5 13 0" stroke="${P.pelo3}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  c += `<path d="M938 194 q8 -4 16 -1 M966 193 q8 -3 16 1" stroke="${P.pelo3}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
  c += `<path d="M960 208 q5 12 -2 16" stroke="${P.piel3s}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  c += `<path d="M946 228 q14 -7 28 0 q-14 4 -28 0z" fill="${P.pelo3}"/><path d="M950 236 q10 6 20 0" stroke="#8a4a3a" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  c += `<ellipse cx="940" cy="226" rx="8" ry="5" fill="#d9705f" opacity=".25"/><ellipse cx="980" cy="226" rx="8" ry="5" fill="#d9705f" opacity=".25"/>`;
  guarda('mesero.svg', svg('0 0 1920 1080', defs, c));
  // brazo derecho de él (izquierda del cuadro): cuelga; gira desde el hombro (888, 300) para señalar
  const bi = `<path d="M886 296 C870 300 864 330 866 370 L870 470 C872 486 892 488 896 472 L904 370 C908 330 904 300 886 296Z" fill="url(#camisa)"/>` +
    `<path d="M866 470 C864 492 868 512 880 518 C892 522 900 510 898 494 L896 470Z" fill="${P.piel3}"/><path d="M879 514 l-2 17 q2 5 6 0 l2 -15z" fill="${P.piel3}"/>`;
  guarda('mesero-brazo-i.svg', svg('0 0 1920 1080', lin('camisa', '#fffaf2', '#e8ddca', 1, 1), bi));
  // brazo izquierdo de él (derecha del cuadro): sostiene la carta impresa
  const bd = `<path d="M1034 296 C1052 302 1060 334 1058 372 L1054 420 C1052 436 1034 438 1030 424 L1022 370 C1018 332 1018 300 1034 296Z" fill="url(#camisa)"/>` +
    `<path d="M1048 410 C1030 414 1006 418 990 424 L994 448 C1014 444 1040 438 1056 430Z" fill="url(#camisa)"/>` +
    `<g transform="rotate(-8 1000 430)"><rect x="964" y="360" width="96" height="134" rx="8" fill="${P.vino}"/><rect x="970" y="364" width="88" height="126" rx="6" fill="#f3e7d1"/><rect x="964" y="360" width="10" height="134" rx="4" fill="${P.vino2}"/><rect x="990" y="392" width="48" height="5" rx="2.5" fill="${P.dorado}"/><rect x="996" y="404" width="36" height="3" rx="1.5" fill="${P.vino}" opacity=".5"/><rect x="986" y="420" width="56" height="3" rx="1.5" fill="${P.vino}" opacity=".25"/><rect x="986" y="430" width="56" height="3" rx="1.5" fill="${P.vino}" opacity=".25"/><rect x="986" y="440" width="44" height="3" rx="1.5" fill="${P.vino}" opacity=".25"/></g>` +
    `<path d="M978 420 C968 424 964 440 972 448 C980 456 994 452 996 440 L996 424Z" fill="${P.piel3}"/><path d="M972 426 q-8 -4 -6 -14 q6 0 10 8z" fill="${P.piel3}"/>`;
  guarda('mesero-brazo-d.svg', svg('0 0 1920 1080', lin('camisa', '#fffaf2', '#e8ddca', 1, 1), bd));
}

/* ===================== primer plano: la mano de Ana con el teléfono ===================== */
// Coordenadas del teléfono: 400×866 en (0,0); el cuadro de la mano es -200..600 × 0..1300.
function mano() {
  const d = lin('blusa', '#78844a', '#4c5630', 1, 1) + lin('pielM', '#d09370', '#a96c4c', 1, 1) + lin('pielM2', '#c98a66', '#b07352', 0, 1);
  // palma detrás del teléfono: asoma bajo el borde inferior y baja en diagonal hacia la muñeca
  let a = `<path d="M96 850 C104 900 150 960 230 1004 C260 1080 290 1170 316 1300 H612 C590 1190 556 1090 520 1030 C548 980 534 900 486 850Z" fill="url(#pielM)"/>`;
  a += `<path d="M300 1300 C306 1250 318 1210 330 1180 C420 1200 520 1186 586 1150 C600 1200 610 1250 620 1300Z" fill="url(#blusa)"/><path d="M330 1180 C420 1200 520 1186 586 1150 L592 1176 C520 1214 420 1226 326 1206Z" fill="#000" opacity=".16"/>`;
  a += `<path d="M190 960 C250 996 350 1010 440 990" stroke="#a96c4c" stroke-width="4" fill="none" opacity=".4" stroke-linecap="round"/>`;
  [[528, 34], [604, 36], [680, 34], [752, 28]].forEach(([y, h]) => { a += `<path d="M10 ${y - h / 2 + 2} C-14 ${y - h / 2} -34 ${y} -30 ${y + h / 2 + 10} C-26 ${y + h / 2 + 22} -4 ${y + h / 2 + 18} 10 ${y + h / 2 + 8}Z" fill="#a96c4c"/>`; });
  guarda('mano-atras.svg', svg('-200 0 800 1300', d, a));
  // al frente: el pulgar con su base sobre el borde derecho y las yemas que asoman por el izquierdo
  let f = `<path d="M506 930 C520 840 492 742 436 672 C410 640 388 628 374 636 C360 646 364 668 378 692 C396 726 404 790 402 880 C430 900 470 920 506 930Z" fill="url(#pielM)"/>`;
  f += `<path d="M376 638 C368 646 370 660 380 664 C390 658 392 642 384 634Z" fill="#f1c6b0" opacity=".9"/>`;
  f += `<path d="M414 860 C424 800 420 744 404 704" stroke="#a96c4c" stroke-width="3" fill="none" opacity=".45" stroke-linecap="round"/>`;
  [[528, 34], [604, 36], [680, 34], [752, 28]].forEach(([y, h], i) => {
    f += `<path d="M-6 ${y - h / 2} C10 ${y - h / 2 - 2} 22 ${y - h / 4} 24 ${y} C24 ${y + h / 3} 14 ${y + h / 2} 0 ${y + h / 2} C-12 ${y + h / 2} -20 ${y + h / 4} -20 ${y} C-20 ${y - h / 4} -16 ${y - h / 2} -6 ${y - h / 2}Z" fill="url(#pielM2)"/>`;
    f += `<path d="M10 ${y - h / 2 + 5} C18 ${y - h / 4} 20 ${y} 16 ${y + h / 4} C12 ${y + 2} 10 ${y - 4} 8 ${y - h / 4}Z" fill="#f1c6b0" opacity="${i === 3 ? 0.7 : 0.85}"/>`;
    f += `<path d="M-16 ${y + 4} q6 4 12 3" stroke="#a96c4c" stroke-width="2" fill="none" opacity=".35"/>`;
  });
  guarda('mano-frente.svg', svg('-200 0 800 1300', d, f));
}

/* lo que ve la cámara del teléfono: la mesa de cerca, el acrílico y su QR */
function visor() {
  const d = lin('fv', '#3a1a20', '#120a0a') + lin('mantelV', '#f6ecd9', '#d7c3a0') + rad('bok', '#ffcf7a', 0.9) + lin('acrV', '#ffffff', '#dfe6ea') + sombraSuave;
  let c = `<rect width="400" height="866" fill="url(#fv)"/>`;
  [[60, 160, 50], [320, 120, 70], [200, 70, 40], [350, 300, 40], [40, 330, 36]].forEach(([x, y, r]) => { c += `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#bok)" opacity=".7"/>`; });
  c += `<path d="M0 560 C120 540 280 540 400 560 V866 H0Z" fill="url(#mantelV)"/>`;
  c += `<ellipse cx="200" cy="650" rx="150" ry="18" fill="#000" opacity=".18" filter="url(#bl2)"/>`;
  c += `<path d="M58 210 h284 l14 430 h-312z" fill="url(#acrV)" opacity=".5"/>`;
  c += `<rect x="82" y="236" width="236" height="380" rx="16" fill="${P.crema}"/><rect x="82" y="236" width="236" height="60" rx="16" fill="${P.vino}"/><rect x="82" y="276" width="236" height="20" fill="${P.vino}"/><rect x="152" y="258" width="96" height="8" rx="4" fill="${P.oro}"/>`;
  c += `<rect x="114" y="324" width="172" height="172" rx="10" fill="#fff"/>` + qr(122.5, 332.5, 7.4);
  c += `<rect x="140" y="520" width="120" height="10" rx="5" fill="${P.vino}" opacity=".5"/><rect x="160" y="546" width="80" height="8" rx="4" fill="${P.vino}" opacity=".3"/>`;
  c += `<path d="M64 214 l40 0 l-30 420 h-14z" fill="#fff" opacity=".25"/>`;
  c += `<path d="M44 640 h312 l16 34 h-344z" fill="#e8eef0" opacity=".8"/>`;
  guarda('visor.svg', svg('0 0 400 866', d, c));
}

/* ===================== platillos vistos desde arriba (como foto de la carta) ===================== */
const plato = (r = 180) => `<circle cx="200" cy="206" r="${r + 6}" fill="#000" opacity=".25" filter="url(#bl)"/><circle cx="200" cy="200" r="${r}" fill="#fbf7f0"/><circle cx="200" cy="200" r="${r - 34}" fill="#f1ebe1"/><circle cx="200" cy="200" r="${r - 36}" fill="#f6f1e8"/>`;
const pdefs = sombraSuave + lin('adobo', '#c9472c', '#8f2a1c', 1, 1) + lin('verdeS', '#6f9a3a', '#3f6b25', 1, 1) + lin('res', '#7a3a26', '#4a1f14', 1, 1) + lin('mole', '#4a2218', '#2a120c', 1, 1) + lin('tort', '#f2d79a', '#d9b06a', 1, 1);
const limon = (x, y, r) => `<g transform="translate(${x},${y}) rotate(${r})"><path d="M0 0 a26 26 0 0 1 52 0z" fill="#7dae3a"/><path d="M5 0 a21 21 0 0 1 42 0z" fill="#d7ec8a"/><path d="M26 0 L12 -14 M26 0 L26 -20 M26 0 L40 -14" stroke="#b9d66a" stroke-width="2"/></g>`;
const cilantro = (x, y) => `<g transform="translate(${x},${y})"><circle r="6" fill="#4f8a2e"/><circle cx="8" cy="-4" r="5" fill="#5f9a36"/><circle cx="4" cy="7" r="5" fill="#3f7a26"/></g>`;
const cebolla = (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${n(r * 0.7)}" fill="none" stroke="#e7b7d8" stroke-width="4"/>`;
function platillos() {
  // pescado a la talla: mitad roja, mitad verde
  const pez = `<g transform="rotate(-24 200 200)"><path d="M70 200 C110 140 250 136 300 196 L346 160 L340 240 L300 206 C250 266 110 262 70 200Z" fill="url(#adobo)"/><path d="M70 200 C110 140 250 136 300 196 L300 200 L70 200Z" fill="url(#verdeS)"/><circle cx="104" cy="192" r="6" fill="#fff"/><circle cx="104" cy="192" r="3" fill="#1a1a1a"/><path d="M150 168 q20 30 0 64 M200 162 q20 36 0 74 M250 168 q16 30 0 62" stroke="#000" stroke-width="3" fill="none" opacity=".15"/></g>`;
  const arroz = `<ellipse cx="128" cy="300" rx="56" ry="34" fill="#fff6e2"/><circle cx="110" cy="292" r="4" fill="#e85a3a"/><circle cx="138" cy="304" r="4" fill="#7ab040"/><circle cx="150" cy="288" r="4" fill="#f2c14a"/>`;
  guarda('plato-pescado.svg', svg('0 0 400 400', pdefs, plato() + arroz + pez + limon(250, 300, -20) + cebolla(300, 120, 14) + cebolla(286, 132, 10) + cilantro(180, 120) + cilantro(230, 270)));
  // capas para el torno: plato, guiso y adornos por separado
  guarda('torno-plato.svg', svg('0 0 400 400', pdefs, plato()));
  guarda('torno-pez.svg', svg('0 0 400 400', pdefs, arroz + pez));
  guarda('torno-adorno.svg', svg('0 0 400 400', pdefs, limon(250, 300, -20) + cebolla(300, 120, 14) + cebolla(286, 132, 10) + cilantro(180, 120) + cilantro(230, 270) + cilantro(140, 230)));
  // aguachile
  let ag = plato() + `<circle cx="200" cy="200" r="120" fill="#7fbf5a" opacity=".55"/>`;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ag += `<g transform="translate(${n(200 + Math.cos(a) * 82)},${n(200 + Math.sin(a) * 82)}) rotate(${n((a * 180) / Math.PI + 90)})"><path d="M-22 0 C-22 -18 22 -18 22 0 C14 -6 -14 -6 -22 0Z" fill="#f4a08a"/><path d="M-16 -4 C-10 -12 10 -12 16 -4" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/></g>`; }
  ag += `<circle cx="200" cy="200" r="34" fill="#6b3a6e" opacity=".6"/>` + cebolla(170, 190, 16) + cebolla(226, 214, 14) + `<circle cx="214" cy="170" r="10" fill="#2f6b2a"/><circle cx="182" cy="228" r="8" fill="#2f6b2a"/>`;
  guarda('plato-aguachile.svg', svg('0 0 400 400', pdefs, ag));
  // tacos de pescado
  let ta = plato();
  [[130, -18], [200, 0], [270, 18]].forEach(([x, r]) => { ta += `<g transform="translate(${x},200) rotate(${r})"><ellipse rx="44" ry="96" fill="url(#tort)"/><ellipse rx="26" ry="80" fill="#e9b48a"/><ellipse rx="22" ry="70" fill="#f3d6b0"/><circle cy="-30" r="8" fill="#7ab040"/><circle cy="10" r="7" fill="#e85a3a"/><circle cy="40" r="7" fill="#7ab040"/><path d="M-14 -50 q14 10 28 0" stroke="#fff" stroke-width="4" fill="none"/></g>`; });
  guarda('plato-tacos.svg', svg('0 0 400 400', pdefs, ta + limon(300, 320, -30)));
  // ensalada de betabel
  let en = plato() + `<circle cx="200" cy="200" r="118" fill="#6f9a3a" opacity=".85"/>`;
  [[160, 170], [240, 180], [200, 240], [150, 240], [250, 250], [205, 140]].forEach(([x, y], i) => { en += `<circle cx="${x}" cy="${y}" r="${22 - (i % 2) * 4}" fill="${i % 2 ? '#a3204a' : '#c0306a'}"/><circle cx="${x - 5}" cy="${y - 5}" r="6" fill="#fff" opacity=".2"/>`; });
  en += `<circle cx="200" cy="196" r="9" fill="#f2d4a0"/><circle cx="180" cy="210" r="7" fill="#f2d4a0"/>`;
  guarda('plato-ensalada.svg', svg('0 0 400 400', pdefs, en));
  // enchiladas suizas (con lácteos)
  let es = plato();
  [[150, -10], [200, 0], [250, 10]].forEach(([x, r]) => { es += `<g transform="translate(${x},200) rotate(${r})"><rect x="-26" y="-100" width="52" height="200" rx="26" fill="#d8e3a0"/></g>`; });
  es += `<ellipse cx="200" cy="200" rx="110" ry="80" fill="#fffaf0" opacity=".9"/><circle cx="170" cy="180" r="8" fill="#7ab040"/><circle cx="226" cy="214" r="8" fill="#e85a3a"/>`;
  guarda('plato-enchiladas.svg', svg('0 0 400 400', pdefs, es));
  // mole (con cacahuate)
  let mo = plato() + `<circle cx="200" cy="200" r="122" fill="url(#mole)"/><path d="M110 210 C150 150 260 150 290 200 C260 250 150 260 110 210Z" fill="#6a3a2a"/>`;
  for (let i = 0; i < 16; i++) mo += `<ellipse cx="${n(130 + ((i * 47) % 150))}" cy="${n(150 + ((i * 31) % 110))}" rx="4" ry="2.6" fill="#f3e7cf"/>`;
  guarda('plato-mole.svg', svg('0 0 400 400', pdefs, mo));
  // arrachera (res), para el acto 3
  let re = plato() + `<g transform="rotate(-12 200 200)">`;
  for (let i = 0; i < 6; i++) re += `<rect x="${110 + i * 30}" y="130" width="30" height="130" rx="10" fill="url(#res)"/><rect x="${116 + i * 30}" y="132" width="6" height="126" rx="3" fill="#c0503a" opacity=".5"/>`;
  re += `</g><ellipse cx="290" cy="290" rx="44" ry="28" fill="#7ab040"/><circle cx="120" cy="290" r="26" fill="#6b4a2a"/><circle cx="114" cy="284" r="6" fill="#fff" opacity=".25"/>` + cebolla(300, 120, 16);
  guarda('plato-res.svg', svg('0 0 400 400', pdefs, re));
  // postre: flan
  let fl = plato() + `<ellipse cx="200" cy="210" rx="90" ry="84" fill="#a8541a" opacity=".7"/><circle cx="200" cy="200" r="66" fill="#f2c56a"/><circle cx="200" cy="200" r="46" fill="#c47a2a"/><circle cx="186" cy="186" r="12" fill="#fff" opacity=".25"/><path d="M270 120 l20 -20 M276 128 l26 -6" stroke="#4f8a2e" stroke-width="6" stroke-linecap="round"/>`;
  guarda('plato-flan.svg', svg('0 0 400 400', pdefs, fl));
}

salon(); mesa(); ana(); carlos(); mesero(); mano(); visor(); platillos();
let total = 0; for (const [k, v] of Object.entries(archivos)) { total += v.length; }
console.log(`${Object.keys(archivos).length} ilustraciones, ${(total / 1024).toFixed(1)} KB`);
