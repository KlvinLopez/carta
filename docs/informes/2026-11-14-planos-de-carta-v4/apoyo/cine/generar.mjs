// Genera los recursos de la película del informe (apoyo/cine/*.webp) y la tabla CAPAS de js/e2_film.js.
// Uso: node docs/informes/2026-11-14-planos-de-carta-v4/apoyo/cine/generar.mjs   (PREVIA=<carpeta> deja además cuadros compuestos para revisar)
//
// Dirección de arte: cine, no caricatura. Cada figura es una silueta sin rasgos dibujados que la luz modela: se pinta con su color
// real y un filtro la ilumina desde la vela (luz puntual) y le pone un contorno cálido desde arriba (las lámparas). El fondo ya
// viene desenfocado (bokeh) y nada se desenfoca al reproducir. Lo más luminoso del cuadro es la mesa y la comida.
// Cada capa se dibuja como SVG en coordenadas del cuadro (1920×1080), se pinta en Chromium (Playwright) y se guarda en webp
// recortada a su caja; la caja viaja a js/e2_film.js entre las marcas CAPAS. Sin texto dentro de las imágenes (todo rótulo vive
// en el DOM) y sin fotos: todo sale de este guion. El QR es un patrón inventado y no codifica nada.
import { writeFileSync, readFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const aqui = dirname(fileURLToPath(import.meta.url));
const n = (x) => Math.round(x * 10) / 10;
const lin = (id, paradas, x2 = 0, y2 = 1, extra = '') => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}" ${extra}>${paradas.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;
const rad = (id, paradas, extra = '') => `<radialGradient id="${id}" ${extra}>${paradas.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`;
const des = (id, sd) => `<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
/* la luz: el relieve sale del alfa desenfocado; una luz puntual (la vela o la pantalla) y un contorno desde arriba */
const luz = (id, lx, ly, lz, { col = '#ffb875', amb = 0.2, sd = 7, ss = 9, k = 1, rim = 0.5, rimCol = '#ffcf8a', az = 270 } = {}) => `<filter id="${id}" filterUnits="userSpaceOnUse" x="-1400" y="-600" width="4200" height="2800" color-interpolation-filters="sRGB">
<feGaussianBlur in="SourceAlpha" stdDeviation="${sd}" result="a"/>
<feDiffuseLighting in="a" surfaceScale="${ss}" diffuseConstant="${k}" lighting-color="${col}" result="d"><fePointLight x="${lx}" y="${ly}" z="${lz}"/></feDiffuseLighting>
<feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1="1" k2="${amb}" k3="0" k4="0" result="m"/>
<feDiffuseLighting in="a" surfaceScale="${ss * 1.4}" diffuseConstant="${rim}" lighting-color="${rimCol}" result="r"><feDistantLight azimuth="${az}" elevation="2"/></feDiffuseLighting>
<feComposite in="r" in2="m" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="s"/>
<feComposite in="s" in2="SourceAlpha" operator="in"/></filter>`;

/* paleta de Carta: campo oscuro cálido, vino, dorado, crema */
const P = { noche: '#171210', noche2: '#2a1b16', vino: '#4f1728', vino2: '#6b2d3e', crema: '#fef9f1', dorado: '#b8860b', oro: '#fdc34d', oliva: '#66713d' };
const VELA = { x: 902, y: 716 }; // la llama: de ahí sale la luz de la escena
const DEFS = luz('L', VELA.x, VELA.y - 20, 40, { amb: 0.07, sd: 11, ss: 8, k: 0.9, rim: 0.5 }) + luz('Lm', VELA.x, VELA.y - 10, 46, { amb: 0.2, sd: 4, ss: 5, rim: 0.3 }) + luz('Lf', VELA.x, VELA.y - 40, 120, { amb: 0.5, sd: 3, ss: 4, rim: 0.3, col: '#ffd9a8' }) +
  des('b3', 3) + des('b6', 6) + des('b12', 12) + des('b24', 24) +
  rad('gVela', [[0, '#ffe2a8', 0.95], [0.18, '#ffc878', 0.55], [0.5, '#f0a050', 0.16], [1, '#f0a050', 0]]) +
  rad('gPant', [[0, '#fff1dc', 0.5], [0.5, '#ffe2c0', 0.16], [1, '#ffe2c0', 0]]);

const CAPAS = [];
const capa = (nombre, [x, y, w, h], cuerpo, o = {}) => { CAPAS.push({ nombre, x, y, w, h, cuerpo, esc: o.esc ?? (/^(mesero|sucia|montaje|copa|platillo|acrilico|vela|llama)/.test(nombre) ? 1.4 : 1), q: o.q ?? 0.82, defs: o.defs ?? '' }); return cuerpo; };
const documento = (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(c.w * c.esc)}" height="${Math.round(c.h * c.esc)}" viewBox="${c.x} ${c.y} ${c.w} ${c.h}"><defs>${DEFS}${c.defs}</defs>${c.cuerpo}</svg>`;

/* azar determinista */
let semilla = 11;
const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };

/* un QR de adorno: tres cuadros guía y celdas pseudoaleatorias deterministas */
function qr(x, y, c, color = '#1a1a1a') {
  const N = 21; let s = 7, o = '';
  const guia = (i, j) => { for (const [a, b] of [[0, 0], [0, N - 7], [N - 7, 0]]) if (i >= a && i < a + 7 && j >= b && j < b + 7) { const r = Math.max(Math.abs(i - a - 3), Math.abs(j - b - 3)); return r === 3 || r <= 1 ? 1 : 0; } return -1; };
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    s = (s * 1103515245 + 12345) % 2147483648; let on = (s >> 8) % 100 < 46; const g = guia(i, j); if (g >= 0) on = g === 1;
    if (on) o += `M${n(x + j * c)} ${n(y + i * c)}h${c}v${c}h-${c}z`;
  }
  return `<path d="${o}" fill="${color}" shape-rendering="crispEdges"/>`;
}

/* ===================== el salón, ya desenfocado ===================== */
function fondo() {
  semilla = 23;
  const d = rad('fb', [[0, '#33211a'], [0.55, '#211712'], [1, '#130e0c']], 'cx=".56" cy=".62" r=".75"') +
    rad('fv', [[0, P.vino2, 0.62], [0.6, P.vino, 0.22], [1, P.vino, 0]]) + rad('fd', [[0, '#c98f2a', 0.3], [1, '#c98f2a', 0]]) +
    rad('bk', [[0, '#ffc878', 0.7], [0.8, '#ffc878', 0.72], [0.93, '#ffd9a0', 0.85], [1, '#ffc878', 0]]) +
    rad('bkr', [[0, '#d8705a', 0.6], [0.8, '#d8705a', 0.62], [0.93, '#e89078', 0.75], [1, '#d8705a', 0]]) +
    lin('fp', [[0, '#0e0a09', 0], [1, '#0e0a09', 0.85]]) + lin('ft', [[0, '#120d0b', 0.75], [1, '#120d0b', 0]]);
  let c = `<rect width="1920" height="1080" fill="url(#fb)"/>`;
  c += `<ellipse cx="1300" cy="600" rx="820" ry="420" fill="url(#fv)"/><ellipse cx="520" cy="640" rx="560" ry="300" fill="url(#fv)" opacity=".6"/><ellipse cx="960" cy="700" rx="520" ry="260" fill="url(#fd)"/>`;
  let g = '';
  // arcos al fondo y otras mesas, apenas masas
  for (const x of [1210, 1470, 1730]) g += `<path d="M${x} 760 V470 a100 100 0 0 1 200 0 V760Z" fill="#4a2231" opacity=".5"/>`;
  for (const x of [70, 300]) g += `<path d="M${x} 760 V500 a84 84 0 0 1 168 0 V760Z" fill="#3a1b26" opacity=".45"/>`;
  for (const [x, y, w] of [[250, 720, 250], [1640, 700, 280], [1400, 660, 180], [560, 668, 150]]) {
    g += `<ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="${w / 9}" fill="#8a6a50" opacity=".45"/><path d="M${x - w / 2} ${y} q${w / 2} ${w / 5} ${w} 0 l${w / 12} 240 h-${w + w / 6}z" fill="#3a2a22" opacity=".7"/>`;
    g += `<circle cx="${x}" cy="${y - 26}" r="13" fill="#ffd48a"/><circle cx="${x}" cy="${y - 26}" r="60" fill="url(#gVela)" opacity=".8"/>`;
    g += `<ellipse cx="${x - w * 0.62}" cy="${y - 96}" rx="38" ry="48" fill="#0f0a09" opacity=".9"/><path d="M${x - w * 0.62 - 70} ${y + 60} q10 -120 70 -124 q60 4 70 124z" fill="#0f0a09" opacity=".9"/>`;
    g += `<ellipse cx="${x + w * 0.62}" cy="${y - 100}" rx="38" ry="48" fill="#0f0a09" opacity=".9"/><path d="M${x + w * 0.62 - 70} ${y + 60} q10 -124 70 -128 q60 4 70 128z" fill="#0f0a09" opacity=".9"/>`;
  }
  c += `<g filter="url(#b12)">${g}</g>`;
  // bokeh de las lámparas: una guirnalda a media altura y racimos a los lados; la franja alta queda limpia para los rótulos
  let b = '';
  for (let i = 0; i < 30; i++) {
    const x = 40 + azar() * 1840, lado = Math.abs(x - 960) / 960, y = 430 + azar() * 190 - lado * 30 + (azar() < 0.2 ? 90 : 0), r = 16 + azar() * 34 + lado * 14;
    b += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="url(#${azar() < 0.22 ? 'bkr' : 'bk'})" opacity="${n(0.08 + azar() * 0.26)}"/>`;
  }
  c += `<g filter="url(#b6)">${b}</g>`;
  c += `<rect y="0" width="1920" height="400" fill="url(#ft)"/><rect y="720" width="1920" height="360" fill="url(#fp)"/>`;
  capa('fondo', [0, 0, 1920, 1080], c, { defs: d, esc: 0.5, q: 0.8 });
  return { d, c };
}

/* ===================== la mesa ===================== */
const MESA = { cx: 960, cy: 768, rx: 440, ry: 60 };
function mesa() {
  const { cx, cy, rx, ry } = MESA;
  const d = rad('mt', [[0, '#fff3d8'], [0.3, '#ecd4aa'], [0.7, '#b89a76'], [1, '#86694f']], `gradientUnits="userSpaceOnUse" cx="${VELA.x}" cy="${cy - 6}" r="520" gradientTransform="translate(0 ${cy}) scale(1 .24) translate(0 ${-cy})"`) +
    lin('mc', [[0, '#c9ad85'], [0.25, '#8f745a'], [0.6, '#4a372c'], [1, '#221612']]) +
    lin('ml', [[0, '#0c0807', 0.72], [0.28, '#0c0807', 0.1], [0.5, '#0c0807', 0], [0.72, '#0c0807', 0.1], [1, '#0c0807', 0.72]], 1, 0) +
    `<clipPath id="mk"><path d="M${cx - rx} ${cy} A${rx} ${ry} 0 0 0 ${cx + rx} ${cy} L${cx + rx + 34} 1090 H${cx - rx - 34}Z"/></clipPath>`;
  let c = `<ellipse cx="${cx}" cy="1050" rx="${rx + 120}" ry="60" fill="#080504" opacity=".7" filter="url(#b24)"/>`;
  let ca = `<rect x="400" y="${cy - 10}" width="1120" height="330" fill="url(#mc)"/>`;
  semilla = 5;
  for (let i = 0; i < 13; i++) { // pliegues del mantel
    const x = cx - rx + 30 + i * ((2 * rx - 60) / 12) + (azar() - 0.5) * 22, w = 16 + azar() * 20;
    ca += `<path d="M${n(x)} ${cy + 46} q${n(w * 0.7)} 130 ${n(-w * 0.3)} 330 h${n(w)} q${n(w * 0.5)} -200 ${n(-w * 0.2)} -330z" fill="${i % 2 ? '#fff0d0' : '#120a08'}" opacity="${i % 2 ? 0.1 : 0.22}" filter="url(#b6)"/>`;
  }
  ca += `<rect x="400" y="${cy - 10}" width="1120" height="330" fill="url(#ml)"/>`;
  c += `<g clip-path="url(#mk)">${ca}</g>`;
  c += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#mt)"/>`;
  c += `<path d="M${cx - rx + 6} ${cy + 8} A${rx} ${ry} 0 0 0 ${cx + rx - 6} ${cy + 8}" fill="none" stroke="#fff6e0" stroke-width="3" opacity=".35" filter="url(#b3)"/>`;
  capa('mesa', [380, 690, 1160, 390], c, { defs: d, esc: 1.4 });
}

/* montaje: platos, cubiertos y servilletas; las copas van aparte porque los comensales las levantan */
const PLATO_A = { x: 706, y: 778 }, PLATO_C = { x: 1214, y: 778 };
const platoMesa = ({ x, y }, sucio = false) => `<ellipse cx="${x}" cy="${y + 7}" rx="84" ry="15" fill="#2a1a12" opacity=".45" filter="url(#b3)"/><ellipse cx="${x}" cy="${y}" rx="78" ry="16" fill="${sucio ? '#d8cbb4' : '#f4ead8'}"/><ellipse cx="${x}" cy="${y - 1}" rx="54" ry="10" fill="${sucio ? '#c4b499' : '#e2d4bb'}"/><path d="M${x - 76} ${y - 3} A78 16 0 0 1 ${x + 76} ${y - 3}" fill="none" stroke="#fffaf0" stroke-width="2" opacity=".8"/>`;
const cubierto = (x, y, l, g = 0) => `<path d="M${x} ${y} l${l} ${g}" stroke="#d9cfbf" stroke-width="5" stroke-linecap="round"/><path d="M${x} ${y - 1} l${l} ${g}" stroke="#fff8ea" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`;
const servilleta = (x, y, s = 1) => `<path d="M${x} ${y} l${40 * s} -22 l${34 * s} 20 l-${38 * s} 14z" fill="#f1e4cc"/><path d="M${x} ${y} l${40 * s} -22 l${4 * s} 22z" fill="#d6c4a6"/>`;
function copa(x, yBase, vino = 0.5) {
  const y = yBase;
  let c = `<ellipse cx="${x}" cy="${y + 3}" rx="22" ry="5" fill="#2a1a12" opacity=".4" filter="url(#b3)"/>`;
  c += `<ellipse cx="${x}" cy="${y}" rx="19" ry="4.5" fill="#efe6d6" opacity=".55"/><rect x="${x - 2}" y="${y - 44}" width="4" height="44" fill="#f4ecdc" opacity=".6"/>`;
  c += `<path d="M${x - 21} ${y - 104} C${x - 25} ${y - 70} ${x - 14} ${y - 44} ${x} ${y - 44} C${x + 14} ${y - 44} ${x + 25} ${y - 70} ${x + 21} ${y - 104}Z" fill="#f6eedf" opacity=".2"/>`;
  if (vino) c += `<path d="M${x - 23} ${y - 104 + 60 * (1 - vino)} C${x - 23} ${y - 60} ${x - 13} ${y - 46} ${x} ${y - 46} C${x + 13} ${y - 46} ${x + 23} ${y - 60} ${x + 23} ${y - 104 + 60 * (1 - vino)}Z" fill="#6a1226" opacity=".92"/><ellipse cx="${x}" cy="${y - 104 + 60 * (1 - vino)}" rx="23" ry="4" fill="#8e2238"/>`;
  c += `<path d="M${x - 21} ${y - 104} C${x - 25} ${y - 70} ${x - 14} ${y - 44} ${x} ${y - 44}" fill="none" stroke="#fff8ea" stroke-width="2" opacity=".55"/><path d="M${x + 15} ${y - 98} q4 22 -4 40" fill="none" stroke="#fff8ea" stroke-width="3" opacity=".7" stroke-linecap="round"/><ellipse cx="${x}" cy="${y - 104}" rx="21" ry="3.5" fill="none" stroke="#fff8ea" stroke-width="1.5" opacity=".6"/>`;
  return c;
}
const COPA_A = { x: 806, y: 760 }, COPA_C = { x: 1112, y: 760 };
function montaje() {
  let c = '';
  for (const p of [PLATO_A, PLATO_C]) c += platoMesa(p);
  c += cubierto(596, 782, 26, -2) + cubierto(600, 790, 24, -2) + cubierto(1296, 780, 26, 2) + cubierto(1298, 788, 24, 2);
  c += servilleta(604, 762) + servilleta(1244, 760, -1).replace(/M1244/g, 'M1316');
  capa('montaje', [560, 720, 800, 100], c);
  capa('copa-a', [776, 640, 60, 132], copa(COPA_A.x, COPA_A.y));
  capa('copa-c', [1082, 640, 60, 132], copa(COPA_C.x, COPA_C.y));
}

/* la vela y su resplandor (el resplandor se suma con mix-blend-mode: screen) */
function vela() {
  const { x, y } = VELA;
  let c = `<ellipse cx="${x}" cy="${y + 60}" rx="26" ry="6" fill="#2a1a12" opacity=".4" filter="url(#b3)"/>`;
  c += `<path d="M${x - 19} ${y + 22} h38 l-3 36 q-16 6 -32 0z" fill="#e8a24a" opacity=".85"/><path d="M${x - 19} ${y + 22} h38 l-3 36 q-16 6 -32 0z" fill="url(#gVela)" opacity=".8"/><ellipse cx="${x}" cy="${y + 22}" rx="19" ry="4.5" fill="#ffe2a8"/>`;
  c += `<path d="M${x - 15} ${y + 26} l3 28" stroke="#fff6e0" stroke-width="3" opacity=".6" stroke-linecap="round"/>`;
  capa('vela', [x - 40, y - 10, 80, 90], c);
  capa('llama', [x - 16, y - 28, 32, 52], `<path d="M${x} ${y - 24} C${x + 10} ${y - 6} ${x + 9} ${y + 8} ${x} ${y + 18} C${x - 9} ${y + 8} ${x - 10} ${y - 6} ${x} ${y - 24}Z" fill="#ffb347" filter="url(#b3)"/><path d="M${x} ${y - 14} C${x + 5} ${y - 2} ${x + 5} ${y + 8} ${x} ${y + 15} C${x - 5} ${y + 8} ${x - 5} ${y - 2} ${x} ${y - 14}Z" fill="#fff6d8"/>`);
  capa('resplandor', [x - 380, y - 380, 760, 760], `<circle cx="${x}" cy="${y}" r="380" fill="url(#gVela)"/>`, { esc: 0.5, q: 0.7 });
}

/* el acrílico con el QR de la mesa */
const QR = { x: 986, y: 668 };
function acrilico() {
  const { x, y } = QR;
  let c = `<ellipse cx="${x}" cy="${y + 100}" rx="52" ry="8" fill="#2a1a12" opacity=".45" filter="url(#b3)"/>`;
  c += `<path d="M${x - 44} ${y + 98} h88 l8 8 h-104z" fill="#e9e2d4" opacity=".7"/>`;
  c += `<rect x="${x - 40}" y="${y - 14}" width="80" height="112" rx="9" fill="#fff" opacity=".22"/>`;
  c += `<rect x="${x - 35}" y="${y - 9}" width="70" height="102" rx="7" fill="#fbf3e4"/><rect x="${x - 35}" y="${y - 9}" width="70" height="20" rx="7" fill="${P.vino}"/><rect x="${x - 35}" y="${y + 3}" width="70" height="8" fill="${P.vino}"/><rect x="${x - 14}" y="${y - 3}" width="28" height="4" rx="2" fill="${P.oro}"/>`;
  c += `<rect x="${x - 27}" y="${y + 19}" width="54" height="54" rx="4" fill="#fff"/>` + qr(x - 23.6, y + 22.4, 2.25) + `<rect x="${x - 18}" y="${y + 80}" width="36" height="4" rx="2" fill="${P.vino}" opacity=".5"/>`;
  c += `<path d="M${x - 38} ${y - 12} l14 0 l-8 108 h-6z" fill="#fff" opacity=".28"/>`;
  capa('acrilico', [x - 70, y - 24, 140, 140], c);
  capa('qr-brillo', [x - 150, y - 110, 300, 300], `<circle cx="${x}" cy="${y + 44}" r="150" fill="url(#gq)"/>`, { defs: rad('gq', [[0, P.oro, 0.75], [0.35, P.oro, 0.3], [1, P.oro, 0]]), esc: 0.5, q: 0.7 });
}

const miembro = (x1, y1, w1, x2, y2, w2, fill) => { const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l; return `<path d="M${n(x1 + nx * w1 / 2)} ${n(y1 + ny * w1 / 2)} L${n(x2 + nx * w2 / 2)} ${n(y2 + ny * w2 / 2)} L${n(x2 - nx * w2 / 2)} ${n(y2 - ny * w2 / 2)} L${n(x1 - nx * w1 / 2)} ${n(y1 - ny * w1 / 2)}Z" fill="${fill}"/><circle cx="${x1}" cy="${y1}" r="${w1 / 2}" fill="${fill}"/><circle cx="${x2}" cy="${y2}" r="${w2 / 2}" fill="${fill}"/>`; };
const manoF = (x, y, ang, fill, e = 1.2) => `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(ang)}) scale(${e})"><path d="M-6 -10C6 -13 16 -14 26 -12C38 -12 50 -8 57 -3C60 1 57 6 50 6C42 8 32 10 20 11L-6 10Z" fill="${fill}"/><path d="M8 -11C12 -22 24 -24 31 -18C27 -12 19 -10 12 -7Z" fill="${fill}"/></g>`;
/* ===================== los comensales: siluetas de perfil que la luz modela ===================== */
const CABEZA = 'M-34 48C-52 20-58-30-38-58C-20-84 22-86 42-58C50-46 52-36 52-24C52-18 55-14 57-8C61-2 68 6 70 12C71 16 66 19 60 19C61 23 64 26 63 30C62 33 59 34 60 37C62 40 61 44 57 46C55 49 58 54 58 60C58 70 48 76 38 75C24 74 10 68 2 60L10 112L-46 112Z';
const CABEZA_H = 'M-36 48C-54 20-60-30-40-58C-20-86 24-88 44-58C52-46 54-36 54-24C54-18 58-15 60-9C64-3 72 5 74 12C75 17 69 20 63 20C64 24 66 26 65 30C64 33 61 34 62 37C64 41 63 45 59 47C58 50 62 56 62 62C62 74 50 82 38 80C24 78 10 70 2 60L10 112L-50 112Z';
const TIPOS = {
  ana: { ox: 432, dir: 1, piel: '#c99272', pelo: '#3a2018', ropa: '#59633a', ropa2: '#474f2c', ancho: 1, cabeza: CABEZA,
    pelo_d: 'M46-52C30-92-30-96-52-60C-64-36-60 4-44 40C-34 52-20 50-12 40C-20 20-18-6-6-22C10-40 30-48 46-52Z', mono: true },
  carlos: { ox: 1488, dir: -1, piel: '#a06a48', pelo: '#1c1310', ropa: '#34313d', ropa2: '#2a2731', ancho: 1.14, cabeza: CABEZA_H,
    pelo_d: 'M48-50C34-92-28-98-50-62C-60-44-58-10-48 14C-40 10-34 0-30-12C-22-34 10-46 48-50Z', barba: true },
};
const OY = 852; // la cadera, sobre el asiento
function comensal(k) {
  const t = TIPOS[k], T = (s, f = 'L') => `<g filter="url(#${f})"><g transform="translate(${t.ox} ${OY}) scale(${t.dir} 1)">${s}</g></g>`;
  const a = t.ancho;
  // silla
  const silla = `<path d="M-104 -246 q-8 -18 10 -20 q18 0 18 18 l10 250 h70 q14 0 14 12 v10 h-104 q-14 0 -14 -14z" fill="#4a2c20"/><path d="M-92 24 l-8 210 h16 l10 -210z M40 24 l10 210 h-14 l-10 -210z" fill="#3a2218"/>`;
  capa(`${k}-silla`, t.dir > 0 ? [t.ox - 130, OY - 290, 220, 520] : [t.ox - 90, OY - 290, 220, 520], T(silla));
  // cuerpo: torso, falda o pantalón hacia el mantel y el brazo hasta el codo
  const torso = `<path d="M${-50 * a} 0 C${-64 * a} -90 ${-60 * a} -190 ${-32 * a} -246 C-20 -264 -8 -270 0 -272 L30 -272 C${52 * a} -262 ${64 * a} -240 ${66 * a} -200 C${68 * a} -130 ${60 * a} -60 ${62 * a} 0 L160 2 L160 50 L${-50 * a} 50Z" fill="${t.ropa}"/><path d="M${-44 * a} 46 L150 46 L162 240 L${-26 * a} 240Z" fill="${t.ropa2}"/>`;
  const cuello = k === 'carlos' ? `<path d="M6 -274 L34 -272 L44 -236 L24 -250Z" fill="#d8cbb4"/>` : '';
  const brazoSup = `<path d="M6 -230 L38 -100" stroke="${t.ropa}" stroke-width="${48 * a}" stroke-linecap="round" fill="none"/>`;
  capa(`${k}-cuerpo`, t.dir > 0 ? [t.ox - 90, OY - 290, 280, 520] : [t.ox - 190, OY - 290, 280, 520], T(torso + brazoSup) + T(cuello, 'Lm'));
  // cabeza: perfil sin rasgos pintados; el pelo es otra masa
  const H = (s) => `<g transform="translate(22 -334) scale(.82)">${s}</g>`;
  let pelo = `<path d="${t.pelo_d}" fill="${t.pelo}"/>`;
  if (t.mono) pelo += `<circle cx="-62" cy="8" r="27" fill="${t.pelo}"/>`;
  let cab = T(H(`<path d="${t.cabeza}" fill="${t.piel}"/>`)) + T(H(pelo), 'Lm');
  if (t.barba) cab += T(H(`<path d="M-2 14L2 60C10 70 24 78 38 80C50 82 62 74 62 62C62 56 58 50 59 47C50 53 40 50 33 43C25 35 12 22-2 14Z" fill="${t.pelo}"/>`), 'Lm');
  if (t.mono) cab += `<g transform="translate(${t.ox} ${OY})"><circle cx="18" cy="-304" r="3" fill="${P.oro}"/></g>`;
  capa(`${k}-cabeza`, t.dir > 0 ? [t.ox - 60, OY - 424, 160, 190] : [t.ox - 100, OY - 424, 160, 190], cab);
  // antebrazos: en reposo sobre la mesa, con el teléfono y con la copa
  const ante = (wx, wy, mano, extra = '', pre = '') => pre + T(miembro(38, -100, 46 * a, wx, wy, 30 * a, t.ropa)) + T(mano) + extra;
  const caja = t.dir > 0 ? [t.ox - 90, OY - 430, 400, 380] : [t.ox - 310, OY - 430, 400, 380];
  capa(`${k}-brazo`, caja, ante(146, -92, manoF(150, -93, 3, t.piel, 1.25)));
  const X = (s) => `<g transform="translate(${t.ox} ${OY}) scale(${t.dir} 1)">${s}</g>`;
  capa(`${k}-brazo-cel`, caja, ante(126, -172, `<path d="M118 -196 C134 -204 150 -196 152 -180 C152 -164 138 -156 124 -160 C112 -166 110 -186 118 -196Z" fill="${t.piel}"/>`,
    X(`<g transform="rotate(16 142 -214)"><rect x="134" y="-250" width="15" height="74" rx="5" fill="#0d0a0a"/><rect x="131" y="-246" width="5" height="66" rx="2" fill="#fff4e2"/></g>`) + T(`<path d="M140 -190 C150 -192 158 -186 156 -178 C152 -172 142 -174 138 -180Z" fill="${t.piel}"/>`),
    X(`<circle cx="84" cy="-262" r="140" fill="url(#gPant)" opacity=".8"/>`)));
  capa(`${k}-brazo-carta`, caja, ante(124, -176, `<path d="M116 -200 C132 -208 148 -200 150 -184 C150 -168 136 -160 122 -164 C110 -170 108 -190 116 -200Z" fill="${t.piel}"/>`,
    X(`<g transform="rotate(14 150 -230)"><rect x="136" y="-282" width="30" height="104" rx="5" fill="#5a1a2c"/><rect x="132" y="-278" width="7" height="96" rx="3" fill="#f3e9d6"/><rect x="160" y="-270" width="3" height="80" fill="${P.oro}" opacity=".7"/></g>`) + T(`<path d="M138 -194 C148 -196 156 -190 154 -182 C150 -176 140 -178 136 -184Z" fill="${t.piel}"/>`)));
  capa(`${k}-brazo-copa`, caja, ante(118, -186, `<path d="M112 -208 C128 -216 142 -208 144 -194 C144 -180 132 -172 118 -176 C106 -182 104 -198 112 -208Z" fill="${t.piel}"/>`,
    X(copa(134, -196).replace(/<ellipse[^>]*filter[^>]*>/, '')) + T(`<path d="M126 -206 C136 -210 146 -204 144 -196 C140 -190 130 -192 124 -198Z" fill="${t.piel}"/>`)));
}

const FONDO = {
  sofia: { x: 800, piel: '#c99272', pelo: '#2a1712', ropa: '#7a2f45', largo: true },
  diego: { x: 1080, piel: '#b07a56', pelo: '#17110f', ropa: '#3b4a5a', largo: false },
};
function alFondo(k) {
  const t = FONDO[k], x = t.x, F = (s, f = 'L') => `<g filter="url(#${f})">${s}</g>`;
  const cuerpo = `<path d="M${x - 22} 596 h44 v10 C${x + 60} 612 ${x + 98} 628 ${x + 104} 668 L${x + 100} 800 H${x - 100} L${x - 104} 668 C${x - 98} 628 ${x - 60} 612 ${x - 22} 606Z" fill="${t.ropa}"/>`;
  const escote = `<path d="M${x - 20} 600 L${x} 640 L${x + 20} 600Z" fill="${t.piel}"/>`;
  capa(`${k}-cuerpo`, [x - 130, 580, 260, 230], F(cuerpo) + F(escote, 'Lm'));
  const cara = `<ellipse cx="${x}" cy="528" rx="42" ry="54" fill="${t.piel}"/><rect x="${x - 17}" y="566" width="34" height="50" rx="12" fill="${t.piel}"/>`;
  const pelo = t.largo
    ? `<path d="M${x - 50} 540 C${x - 62} 470 ${x - 30} 452 ${x} 452 C${x + 30} 452 ${x + 62} 470 ${x + 50} 540 C${x + 60} 580 ${x + 62} 620 ${x + 52} 650 C${x + 40} 640 ${x + 36} 600 ${x + 40} 548 C${x + 40} 510 ${x + 22} 492 ${x} 490 C${x - 22} 492 ${x - 40} 510 ${x - 40} 548 C${x - 36} 600 ${x - 40} 640 ${x - 52} 650 C${x - 62} 620 ${x - 60} 580 ${x - 50} 540Z" fill="${t.pelo}"/>`
    : `<path d="M${x - 44} 520 C${x - 52} 470 ${x - 26} 458 ${x} 458 C${x + 26} 458 ${x + 52} 470 ${x + 44} 520 C${x + 40} 500 ${x + 24} 490 ${x} 490 C${x - 24} 490 ${x - 40} 500 ${x - 44} 520Z" fill="${t.pelo}"/>`;
  capa(`${k}-cabeza`, [x - 80, 440, 160, 220], F(cara) + F(pelo, 'Lm'));
  // brazos: las manos en el borde de la mesa, con el teléfono o con la carta de papel
  const caja = [x - 150, 440, 300, 320];
  const m = (dx, y, ang) => manoF(x + dx, y, ang, t.piel, 1.05);
  const ant = (lado, wx, wy) => miembro(x + lado * 92, 694, 36, x + wx, wy, 24, t.ropa);
  capa(`${k}-brazos`, caja, F(ant(-1, -52, 720) + ant(1, 52, 720)) + F(m(-56, 720, 12) + m(56, 720, 168)));
  capa(`${k}-brazos-cel`, caja, `<circle cx="${x}" cy="580" r="130" fill="url(#gPant)" opacity=".42"/>` + F(ant(-1, -30, 690) + ant(1, 30, 690)) +
    `<rect x="${x - 22}" y="630" width="44" height="80" rx="9" fill="#0d0a0a"/><rect x="${x - 22}" y="630" width="44" height="80" rx="9" fill="none" stroke="#fff1dc" stroke-width="2.5" opacity=".7"/>` + F(m(-36, 694, 10) + m(36, 694, 170)));
  capa(`${k}-brazos-carta`, caja, F(ant(-1, -62, 676) + ant(1, 62, 676)) +
    F(`<path d="M${x - 78} 612 L${x - 2} 620 V716 L${x - 78} 706Z" fill="#5a1a2c"/><path d="M${x + 78} 612 L${x + 2} 620 V716 L${x + 78} 706Z" fill="#4a1424"/>`, 'Lm') + `<path d="M${x - 70} 622 L${x - 8} 628 M${x + 70} 622 L${x + 8} 628" stroke="${P.oro}" stroke-width="2" opacity=".6"/>` + F(m(-74, 690, 60) + m(74, 690, 120)));
}

/* ===================== el mesero: de frente, tras la mesa, con la cabeza de perfil ===================== */
const MX = 1250;
function mesero() {
  const F = (s, f = 'L') => `<g filter="url(#${f})">${s}</g>`;
  const camisa = '#b3a792', chaleco = '#1e191b', piel = '#b88562';
  const torso = `<path d="M${MX - 26} 316 h52 v10 C${MX + 70} 330 ${MX + 118} 344 ${MX + 136} 392 L${MX + 112} 620 L${MX + 118} 800 H${MX - 118} L${MX - 112} 620 L${MX - 136} 392 C${MX - 118} 344 ${MX - 70} 330 ${MX - 26} 326Z" fill="${camisa}"/>`;
  const chal = `<path d="M${MX - 66} 334 L${MX} 452 L${MX + 66} 334 C${MX + 92} 342 ${MX + 100} 360 ${MX + 100} 380 L${MX + 104} 620 L${MX + 112} 800 H${MX - 112} L${MX - 104} 620 L${MX - 100} 380 C${MX - 100} 360 ${MX - 92} 342 ${MX - 66} 334Z" fill="${chaleco}"/>`;
  const mandil = `<path d="M${MX - 108} 610 H${MX + 108} L${MX + 114} 800 H${MX - 114}Z" fill="#3a1420"/>`;
  const mono = `<path d="M${MX - 20} 334 l20 10 l20 -10 v22 l-20 -10 l-20 10z" fill="#141012"/>`;
  const sup = (s) => `<path d="M${MX + s * 112} 372 L${MX + s * 122} 560" stroke="${camisa}" stroke-width="52" stroke-linecap="round" fill="none"/>`;
  capa('mesero-cuerpo', [MX - 170, 270, 340, 540], F(torso + sup(-1) + sup(1)) + F(chal + mandil, 'Lm') + mono);
  const H = (s) => `<g transform="translate(${MX} 248) scale(-.8 .8)">${s}</g>`;
  capa('mesero-cabeza', [MX - 80, 162, 160, 190], F(H(`<path d="${CABEZA_H}" fill="${piel}"/>`)) + F(H(`<path d="M50-48C36-94-30-100-52-62C-62-42-58-8-46 16C-38 10-34 0-30-12C-22-34 12-44 50-48Z" fill="#231814"/>`), 'Lm'));
  // antebrazos: codos en (MX∓122, 560)
  const ante = (s, wx, wy) => miembro(MX + s * 122, 560, 50, wx, wy, 32, camisa);
  const mano = (x, y, r = 24, lado = x < MX ? -1 : 1) => { const ex = MX + lado * 122, ang = (Math.atan2(y - 560, x - ex) * 180) / Math.PI; return manoF(x - Math.cos((ang * Math.PI) / 180) * 12, y - Math.sin((ang * Math.PI) / 180) * 12, ang, piel, r / 20); };
  const caja = [MX - 390, 440, 720, 380];
  capa('mesero-brazos', caja, F(ante(-1, MX - 40, 640) + ante(1, MX + 40, 640)) + F(mano(MX - 16, 646) + mano(MX + 14, 650)));
  // ofrece las cartas: una a cada lado
  const carta = (x, y, r) => `<g transform="rotate(${r} ${x} ${y})"><rect x="${x - 34}" y="${y - 50}" width="68" height="100" rx="6" fill="#5a1a2c"/><rect x="${x - 26}" y="${y - 42}" width="52" height="84" rx="3" fill="none" stroke="${P.oro}" stroke-width="2" opacity=".7"/><rect x="${x - 12}" y="${y - 6}" width="24" height="4" rx="2" fill="${P.oro}" opacity=".8"/></g>`;
  capa('mesero-brazos-carta', caja, F(ante(-1, MX - 236, 628) + ante(1, MX + 60, 630)) + F(carta(MX - 276, 640, -24) + carta(MX + 70, 600, 8), 'Lm') + F(mano(MX - 246, 634, 22) + mano(MX + 62, 640, 22)));
  // con su teléfono: lo sostiene con una mano y toca con la otra
  capa('mesero-brazos-cel', caja, `<circle cx="${MX - 20}" cy="500" r="110" fill="url(#gPant)" opacity=".45"/>` + F(ante(-1, MX - 46, 600) + ante(1, MX + 44, 606)) +
    `<g transform="rotate(-8 ${MX - 26} 560)"><rect x="${MX - 48}" y="516" width="44" height="86" rx="9" fill="#0d0a0a"/><rect x="${MX - 48}" y="516" width="44" height="86" rx="9" fill="none" stroke="#fff1dc" stroke-width="2.5" opacity=".75"/></g>` +
    F(mano(MX - 40, 604, 22) + mano(MX + 30, 600, 20) + `<path d="M${MX + 22} 594 L${MX - 2} 566" stroke="${piel}" stroke-width="12" stroke-linecap="round"/>`));
  // apunta a mano en su libreta
  capa('mesero-brazos-libreta', caja, F(ante(-1, MX - 46, 600) + ante(1, MX + 44, 606)) +
    `<g transform="rotate(-8 ${MX - 26} 560)"><rect x="${MX - 56}" y="512" width="60" height="84" rx="4" fill="#efe6d2"/><path d="M${MX - 46} 530 h40 M${MX - 46} 544 h34 M${MX - 46} 558 h38 M${MX - 46} 572 h22" stroke="#8a7a62" stroke-width="2.5" opacity=".8"/></g><path d="M${MX + 30} 600 L${MX - 4} 560" stroke="#1a1414" stroke-width="5" stroke-linecap="round"/>` +
    F(mano(MX - 40, 604, 22) + mano(MX + 30, 600, 20)));
  // o con una tableta que carga y carga (el círculo que gira lo pone la película encima)
  capa('mesero-brazos-tableta', caja, `<circle cx="${MX - 26}" cy="500" r="120" fill="url(#gPant)" opacity=".4"/>` + F(ante(-1, MX - 60, 606) + ante(1, MX + 50, 606)) +
    `<g transform="rotate(-6 ${MX - 6} 556)"><rect x="${MX - 70}" y="506" width="128" height="96" rx="10" fill="#0d0a0a"/><rect x="${MX - 70}" y="506" width="128" height="96" rx="10" fill="none" stroke="#fff1dc" stroke-width="2.5" opacity=".7"/></g>` +
    F(mano(MX - 58, 606, 22) + mano(MX + 46, 606, 22)));
  // con la terminal de cobro (el cobro ocurre fuera de Carta)
  capa('mesero-brazos-terminal', caja, F(ante(-1, MX - 40, 640) + ante(1, MX + 232, 632)) +
    `<g transform="rotate(18 ${MX + 262} 630)"><rect x="${MX + 236}" y="586" width="56" height="92" rx="10" fill="#17171a"/><rect x="${MX + 243}" y="594" width="42" height="34" rx="4" fill="#cfe6d8"/><rect x="${MX + 243}" y="636" width="42" height="34" rx="4" fill="#2a2a30"/><rect x="${MX + 250}" y="578" width="28" height="12" rx="2" fill="#f4ecdc"/></g>` +
    F(mano(MX - 16, 646) + mano(MX + 240, 642, 22)));
  // limpia la mesa: un brazo baja con el trapo
  const pila = [0, 1, 2].map((i) => `<ellipse cx="${MX - 60}" cy="${628 - i * 9}" rx="60" ry="12" fill="${i === 2 ? '#f4ead8' : '#d8cbb4'}"/><path d="M${MX - 120} ${628 - i * 9} a60 12 0 0 0 120 0" fill="none" stroke="#a8977c" stroke-width="2" opacity=".6"/>`).join('') + `<path d="M${MX - 90} 606 l52 -8" stroke="#d9cfbf" stroke-width="5" stroke-linecap="round"/>`;
  capa('mesero-brazos-trapo', caja, F(ante(-1, MX - 36, 640) + ante(1, MX + 100, 712)) + pila + F(`<path d="M${MX + 40} 728 q24 -26 64 -22 q36 2 52 20 q-12 18 -54 20 q-42 2 -62 -18z" fill="#efe2c8"/>`, 'Lm') + F(mano(MX - 26, 644, 22) + mano(MX + 102, 718, 24)));
}

/* ===================== la comida en la mesa: lo más luminoso del cuadro ===================== */
function platillosMesa() {
  const F = (s) => `<g filter="url(#Lf)">${s}</g>`;
  const res = ({ x, y }) => { let c = ''; for (let i = 0; i < 5; i++) c += `<path d="M${x - 44 + i * 16} ${y - 4} q8 -20 20 -16 q8 4 4 16 q-10 8 -24 0z" fill="${i % 2 ? '#8a3a26' : '#6e2c1c'}"/><path d="M${x - 40 + i * 16} ${y - 8} q8 -10 16 -8" stroke="#e08a6a" stroke-width="3" fill="none" opacity=".8"/>`; return c + `<ellipse cx="${x + 46}" cy="${y - 6}" rx="16" ry="8" fill="#7aa63c"/><ellipse cx="${x - 52}" cy="${y - 2}" rx="12" ry="6" fill="#e9c46a"/><circle cx="${x + 30}" cy="${y + 2}" r="5" fill="#d8482e"/>`; };
  const pez = ({ x, y }) => `<path d="M${x - 50} ${y - 2} C${x - 40} ${y - 24} ${x + 30} ${y - 28} ${x + 48} ${y - 6} C${x + 30} ${y + 6} ${x - 34} ${y + 8} ${x - 50} ${y - 2}Z" fill="#c9472c"/><path d="M${x - 50} ${y - 2} C${x - 40} ${y - 24} ${x - 6} ${y - 27} ${x + 4} ${y - 26} L${x - 2} ${y + 6} C${x - 30} ${y + 6} ${x - 44} ${y + 2} ${x - 50} ${y - 2}Z" fill="#7da63a"/><path d="M${x + 22} ${y + 4} a14 7 0 0 1 28 0z" fill="#b9d66a"/><ellipse cx="${x - 52}" cy="${y + 2}" rx="12" ry="5" fill="#fff3d8"/><circle cx="${x + 8}" cy="${y - 20}" r="4" fill="#4f8a2e"/><circle cx="${x - 22}" cy="${y - 18}" r="3.5" fill="#f3e2a0"/>`;
  const halo = ({ x, y }) => `<ellipse cx="${x}" cy="${y - 8}" rx="120" ry="46" fill="url(#gVela)" opacity=".5"/>`;
  capa('platillo-a', [PLATO_A.x - 124, PLATO_A.y - 60, 248, 100], halo(PLATO_A) + F(pez(PLATO_A)));
  capa('platillo-c', [PLATO_C.x - 124, PLATO_C.y - 60, 248, 100], halo(PLATO_C) + F(res(PLATO_C)));
}

function utileria() {
  let tk = `<g transform="translate(60 6)"><path d="M1016 742 L1052 740 C1070 762 1096 786 1130 806 L1090 812 C1058 790 1034 766 1016 742Z" fill="#f6efe0"/><path d="M1016 742 L1052 740 l-4 -10 q-18 -6 -30 0z" fill="#e2d6bd"/></g>`;
  for (let i = 0; i < 7; i++) tk += `<path d="M${1090 + i * 13} ${756 + i * 9} l${20 + (i % 3) * 4} -1.5" stroke="#6b5a48" stroke-width="2.2" opacity=".75"/>`;
  // la causa de fondo: una carta, una libreta y un ticket; un solo papel para todos
  const carta = `<path d="M640 792 L742 776 L780 806 L676 824Z" fill="#5a1a2c"/><path d="M654 794 L740 781 L766 803 L680 818Z" fill="none" stroke="${P.oro}" stroke-width="2" opacity=".65"/><path d="M640 792 l36 32 l0 6 l-38 -32z" fill="#3a0f1c"/>`;
  let lib = `<path d="M848 796 L920 790 L940 826 L864 834Z" fill="#efe6d2"/>`;
  for (let i = 0; i < 4; i++) lib += `<path d="M${860 + i * 4} ${802 + i * 7} l${52 - i * 4} -4" stroke="#8a7a62" stroke-width="2.2" opacity=".8"/>`;
  lib += `<path d="M930 800 l34 22" stroke="#1a1414" stroke-width="5" stroke-linecap="round"/>`;
  capa('papeles', [620, 760, 360, 90], `<ellipse cx="710" cy="812" rx="80" ry="10" fill="#2a1a12" opacity=".3" filter="url(#b3)"/><ellipse cx="896" cy="826" rx="56" ry="8" fill="#2a1a12" opacity=".3" filter="url(#b3)"/>` + carta + lib);
  capa('ticket', [1060, 720, 150, 110], `<ellipse cx="1136" cy="790" rx="70" ry="10" fill="#2a1a12" opacity=".3" filter="url(#b3)"/>` + tk);
  const px = 956, py = 800;
  const pastel = `<ellipse cx="${px}" cy="${py + 6}" rx="62" ry="11" fill="#2a1a12" opacity=".4" filter="url(#b3)"/><ellipse cx="${px}" cy="${py}" rx="58" ry="11" fill="#f4ead8"/>` +
    `<g filter="url(#Lf)"><path d="M${px - 40} ${py - 34} v30 a40 9 0 0 0 80 0 v-30z" fill="#6b3a2a"/><ellipse cx="${px}" cy="${py - 34}" rx="40" ry="9" fill="#f6e3c8"/><path d="M${px - 40} ${py - 30} q10 12 20 0 q10 12 20 0 q10 12 20 0 q10 12 20 0" stroke="#f6e3c8" stroke-width="5" fill="none"/></g>` +
    `<rect x="${px - 2}" y="${py - 56}" width="4" height="22" fill="#e8c9d6"/><path d="M${px} ${py - 72} c5 8 4 13 0 17 c-4 -4 -5 -9 0 -17z" fill="#ffd27a"/><circle cx="${px}" cy="${py - 62}" r="26" fill="url(#gVela)" opacity=".8"/>`;
  capa('pastel', [px - 80, py - 100, 160, 124], pastel);
}

/* ===================== la mesa sucia, en tres piezas que el mesero retira ===================== */
function sucia() {
  const F = (s) => `<g filter="url(#Lm)">${s}</g>`;
  const resto = ({ x, y }, v) => platoMesa({ x, y }, true) + `<path d="M${x - 40} ${y - 2} q20 -10 44 -4 q20 6 30 2 q-8 12 -34 10 q-26 0 -40 -8z" fill="${v ? '#8f3a22' : '#5c2a1a'}" opacity=".85"/><path d="M${x - 10} ${y - 6} l40 8" stroke="#efe6d6" stroke-width="4" stroke-linecap="round"/><ellipse cx="${x + 34}" cy="${y - 2}" rx="9" ry="4" fill="#7da63a"/>` + cubierto(x - 50, y + 6, 70, -14) + cubierto(x - 34, y - 12, 64, 16);
  const bola = (x, y, s = 1) => `<path d="M${x} ${y} l${14 * s} -20 l${22 * s} -4 l${18 * s} 12 l${6 * s} 18 l${-20 * s} 12 l${-30 * s} -2z" fill="#eadcc2"/><path d="M${x} ${y} l${14 * s} -20 l${22 * s} -4 l${-6 * s} 24z" fill="#fff6e2"/>` + `<path d="M${x + 14 * s} ${y - 20} l${8 * s} 22 l${14 * s} -10 M${x + 22 * s} ${y + 2} l${12 * s} 14" stroke="#b8a586" stroke-width="2" fill="none" opacity=".8"/>`;
  let migas = ''; semilla = 41;
  for (let i = 0; i < 26; i++) migas += `<circle cx="${n(640 + azar() * 640)}" cy="${n(752 + azar() * 56)}" r="${n(1.5 + azar() * 2)}" fill="#8a6a48" opacity=".8"/>`;
  capa('sucia-a', [570, 720, 300, 110], resto(PLATO_A, true) + bola(590, 802, 1.3) + bola(800, 768, 0.9));
  capa('sucia-c', [1080, 720, 300, 110], resto(PLATO_C, false) + bola(1310, 804, -1.3) + cubierto(1120, 798, 40, -6));
  // el vaso caído y el vino derramado sobre el mantel
  let v = `<path d="M800 806 C840 780 930 784 980 798 C1030 812 1070 800 1092 814 C1078 838 1000 844 944 834 C890 826 818 836 800 806Z" fill="#5a0e20" opacity=".82" filter="url(#b3)"/><path d="M850 806 q60 -10 120 6" stroke="#9a2a44" stroke-width="4" fill="none" opacity=".7" stroke-linecap="round"/>`;
  v += `<ellipse cx="800" cy="812" rx="74" ry="9" fill="#2a1a12" opacity=".35" filter="url(#b3)"/><ellipse cx="748" cy="790" rx="6" ry="22" fill="#f4ecdc" opacity=".75"/><path d="M750 790 H800" stroke="#f4ecdc" stroke-width="5" opacity=".7"/>` +
    `<path d="M800 790 C806 766 836 760 872 764 C880 780 880 800 872 816 C836 820 806 814 800 790Z" fill="#f6eedf" opacity=".42"/><path d="M826 800 C840 812 860 816 872 816 C878 806 880 796 879 788 C860 792 840 794 826 800Z" fill="#6a1226" opacity=".9"/>` +
    `<ellipse cx="873" cy="790" rx="7" ry="26" fill="none" stroke="#fff8ea" stroke-width="2.5" opacity=".8"/><path d="M806 780 C816 768 840 764 866 766" fill="none" stroke="#fff8ea" stroke-width="3" opacity=".75" stroke-linecap="round"/>`;
  capa('sucia-vaso', [740, 730, 370, 120], v);
  capa('sucia-migas', [630, 744, 660, 72], migas);
}

/* ===================== los que llegan después: dos siluetas en primer plano, fuera de foco ===================== */
function nuevos() {
  const sil = (x, y, s, pelo) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="-150" rx="74" ry="92" fill="#3a2a22"/>${pelo}<path d="M-34 -70 h68 v60 q150 20 190 150 l40 420 h-528 l40 -420 q40 -130 190 -150z" fill="#3a2a22"/></g>`;
  const Ln = luz('Ln', 1100, 700, 30, { amb: 0.05, sd: 10, ss: 14, rim: 0.9 });
  const c = `<g filter="url(#b6)"><g filter="url(#Ln)">${sil(170, 640, 1.0, '<circle cx="-10" cy="-250" r="44" fill="#3a2a22"/>')}</g><g filter="url(#Ln)">${sil(470, 720, 1.1, '')}</g></g>`;
  capa('nuevos', [0, 280, 820, 800], c, { defs: Ln, esc: 0.5, q: 0.75 });
}

/* ===================== primer plano: la mano que sostiene el teléfono =====================
   Coordenadas del teléfono: la pantalla ocupa (0,0)–(400,866) y el marco sobresale 13. La mano izquierda lo toma por abajo
   y por la izquierda: el antebrazo entra desde abajo a la izquierda, la palma queda detrás, el pulgar descansa por delante sobre
   el borde izquierdo y las yemas de los otros dedos asoman por el borde derecho. La capa «frente» es el mismo dibujo recortado
   a lo que pasa por delante del teléfono (pulgar y yemas): así no hay costura entre las dos capas. */
function manos(k, { piel, manga, puno = null, espejo = false }) {
  const Lp = luz('Lp', 200, 530, 200, { col: '#ffe6c8', amb: 0.2, sd: 9, ss: 11, k: 0.95, rim: 0.24, az: 250 });
  const u = [-0.838, 0.545], nr = [0.545, 0.838], W = [-128, 962]; // eje del antebrazo y su normal; centro de la muñeca
  const pt = (s, o) => `${n(W[0] + u[0] * s + nr[0] * o)} ${n(W[1] + u[1] * s + nr[1] * o)}`;
  // piel: palma (sólo lo que se ve fuera del teléfono), muñeca, pulgar y yemas
  let p = `<path d="M-13 610 C-52 640 -96 700 -112 790 C-120 850 -150 890 ${pt(40, -56)} L${pt(170, -56)} L${pt(170, 58)} L${pt(30, 58)} C-80 1016 -40 1004 -13 986Z" fill="${piel}"/>`;
  p += `<path d="M-56 800 C-52 720 -30 640 -4 572" stroke="${piel}" stroke-width="60" stroke-linecap="round" fill="none"/>`;
    // detalle sin relieve: uña del pulgar, pliegues de los nudillos
  let det = `<g transform="rotate(21 -4 572)"><rect x="-19" y="550" width="30" height="38" rx="13" fill="#fff" opacity=".08"/></g><path d="M-30 684 q18 3 34 16" stroke="#000" stroke-width="3" fill="none" opacity=".14" stroke-linecap="round"/>`;
  
  // manga: del puño hacia fuera del cuadro
  let m = `<path d="M${pt(120, -84)} L${pt(1100, -110)} L${pt(1100, 110)} L${pt(120, 84)}Z" fill="${manga}"/>`;
  if (puno) m = `<path d="M${pt(96, -70)} L${pt(150, -74)} L${pt(150, 74)} L${pt(96, 70)}Z" fill="${puno}"/>` + m;
  const esp = (s) => (espejo ? `<g transform="translate(400 0) scale(-1 1)">${s}</g>` : s);
  const mano = `<g transform="translate(0 -150)"><g filter="url(#Lp)">${esp(p)}</g>${esp(det)}<g filter="url(#Lp)">${esp(m)}</g></g>`;
  const caja = espejo ? [-80, 270, 1180, 900] : [-700, 270, 1180, 900];
  const recorte = `<clipPath id="cf"${espejo ? ' transform="translate(400 0) scale(-1 1)"' : ''}><path d="M-13 320 H100 V729 H-13Z"/></clipPath>`;
  capa(`${k}-mano-atras`, caja, mano, { defs: Lp });
  capa(`${k}-mano-frente`, espejo ? [-80, 270, 580, 480] : [-100, 270, 580, 480], `<g clip-path="url(#cf)">${mano}</g>`, { defs: Lp + recorte });
  // la otra mano: el índice extendido toca la pantalla; la yema está en (0,0) y el antebrazo sale del cuadro por abajo
  const Ld = luz('Ld', espejo ? 80 : -80, -120, 150, { col: '#ffe6c8', amb: 0.14, sd: 8, ss: 11, k: 0.9, rim: 0.4, az: 200 });
  const d = [-0.458, -0.889], q = [0.889, -0.458], K = [78, 150];
  const kp = (a, b) => [K[0] + q[0] * a + d[0] * b, K[1] + q[1] * a + d[1] * b];
  const L2 = (A, B, w) => `<path d="M${n(A[0])} ${n(A[1])} L${n(B[0])} ${n(B[1])}" stroke="${piel}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
  // el índice, afinado hacia la yema, y el puño como una sola masa: nudillos, dorso y el pulgar recogido
  const Wr = kp(66, -205), ar = [0.6, 0.8], an = [0.8, -0.6];
  const fp = (s, o) => `${n(Wr[0] + ar[0] * s + an[0] * o)} ${n(Wr[1] + ar[1] * s + an[1] * o)}`;
  const P2 = (v) => `${n(v[0])} ${n(v[1])}`;
  const suave = (pts) => { let o = `M${P2(pts[0])}`; const N = pts.length; for (let i = 0; i < N; i++) { const p0 = pts[(i - 1 + N) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N]; o += `C${P2([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${P2([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${P2(p2)}`; } return o + 'Z'; };
  let g = `<path d="${suave([kp(-25, -6), kp(-21, 70), kp(-17, 136), kp(-8, 152), kp(8, 152), kp(17, 136), kp(22, 70), kp(27, -6)])}" fill="${piel}"/>`;
  g += `<path d="${suave([kp(-27, 6), kp(-52, -26), kp(-62, -90), kp(-44, -150), kp(-10, -214), kp(66, -236), kp(150, -206), kp(182, -130), kp(178, -56), kp(160, -18), kp(138, 22), kp(116, 26), kp(94, 40), kp(72, 46), kp(48, 48), kp(30, 30), kp(26, 6)])}" fill="${piel}"/>`;
  g += `<path d="M${fp(-30, 60)} L${fp(170, 60)} L${fp(170, -60)} L${fp(-30, -58)}Z" fill="${piel}"/>`;
  const raya = (A, B) => `<path d="M${P2(A)} L${P2(B)}" stroke="#000" stroke-width="3.5" opacity=".24" stroke-linecap="round"/>`;
  const rayas = raya(kp(28, 14), kp(34, -40)) + raya(kp(72, 34), kp(78, -34)) + raya(kp(116, 20), kp(120, -40)) + raya(kp(-26, -8), kp(-34, -74));
  let dm = `<path d="M${fp(110, 84)} L${fp(1000, 110)} L${fp(1000, -110)} L${fp(110, -84)}Z" fill="${manga}"/>`;
  if (puno) dm = `<path d="M${fp(88, 70)} L${fp(140, 74)} L${fp(140, -74)} L${fp(88, -70)}Z" fill="${puno}"/>` + dm;
  const una = `<g transform="rotate(-27 10 20)"><rect x="-3" y="4" width="26" height="30" rx="11" fill="#fff" opacity=".09"/></g><path d="M36 68 q10 -1 20 -8 M54 106 q10 -1 20 -8" stroke="#000" stroke-width="3" fill="none" opacity=".2" stroke-linecap="round"/>` + rayas;
  const md = (s) => (espejo ? `<g transform="scale(-1 1)">${s}</g>` : s);
  const dedo = `<g filter="url(#Ld)">${md(g)}</g>${md(una)}<g filter="url(#Ld)">${md(dm)}</g>`;
  capa(`${k}-dedo`, espejo ? [-880, -30, 920, 1130] : [-40, -30, 920, 1130], dedo, { defs: Ld });
}

/* ===================== lo que ve la cámara del teléfono: la mesa de cerca, el acrílico y su QR ===================== */
function visor() {
  const d = lin('vf', [[0, '#241812'], [1, '#120c0a']]) + lin('vm', [[0, '#e9d4ae'], [1, '#8a6f55']]) + lin('va', [[0, '#ffffff'], [1, '#e6dccb']]);
  let c = `<rect width="400" height="866" fill="url(#vf)"/><ellipse cx="300" cy="300" rx="320" ry="260" fill="${P.vino2}" opacity=".35" filter="url(#b24)"/>`;
  let b = ''; semilla = 9;
  for (let i = 0; i < 12; i++) b += `<circle cx="${n(azar() * 400)}" cy="${n(60 + azar() * 330)}" r="${n(22 + azar() * 40)}" fill="#ffc878" opacity="${n(0.12 + azar() * 0.3)}"/>`;
  c += `<g filter="url(#b6)">${b}</g>`;
  c += `<path d="M0 566 C120 544 280 544 400 566 V866 H0Z" fill="url(#vm)"/><circle cx="46" cy="560" r="170" fill="url(#gVela)" opacity=".9"/>`;
  c += `<ellipse cx="200" cy="656" rx="150" ry="18" fill="#2a1a12" opacity=".35" filter="url(#b6)"/>`;
  c += `<path d="M58 214 h284 l14 430 h-312z" fill="url(#va)" opacity=".4"/>`;
  c += `<rect x="82" y="240" width="236" height="380" rx="18" fill="#fbf3e4"/><rect x="82" y="240" width="236" height="62" rx="18" fill="${P.vino}"/><rect x="82" y="282" width="236" height="20" fill="${P.vino}"/><rect x="152" y="264" width="96" height="8" rx="4" fill="${P.oro}"/>`;
  c += `<rect x="114" y="328" width="172" height="172" rx="10" fill="#fff"/>` + qr(122.5, 336.5, 7.4);
  c += `<rect x="140" y="524" width="120" height="10" rx="5" fill="${P.vino}" opacity=".5"/><rect x="160" y="550" width="80" height="8" rx="4" fill="${P.vino}" opacity=".3"/>`;
  c += `<path d="M64 218 l40 0 l-30 420 h-14z" fill="#fff" opacity=".22"/><path d="M44 644 h312 l16 34 h-344z" fill="#efe8da" opacity=".8"/>`;
  capa('visor', [0, 0, 400, 866], c, { defs: d, q: 0.85 });
}

/* ===================== platillos vistos desde arriba (las fotos de la carta dibujada) ===================== */
function platillos() {
  const d = lin('adobo', [[0, '#d2502f'], [1, '#8f2a1c']], 1, 1) + lin('verdeS', [[0, '#7da63a'], [1, '#3f6b25']], 1, 1) + lin('res', [[0, '#8a4028'], [1, '#4a1f14']], 1, 1) + lin('mole', [[0, '#4a2218'], [1, '#2a120c']], 1, 1) + lin('tort', [[0, '#f2d79a'], [1, '#d9b06a']], 1, 1) +
    rad('pl', [[0, '#fffaf0'], [0.62, '#f3ead9'], [0.8, '#fbf5ea'], [1, '#e2d5bd']]) + rad('pb', [[0, '#3a261c'], [1, '#1a110d']]) +
    luz('Lc', 110, 60, 130, { col: '#fff0d6', amb: 0.52, sd: 2.4, ss: 5, k: 0.8, rim: 0.25, az: 225 });
  const plato = (r = 180) => `<circle cx="204" cy="214" r="${r + 4}" fill="#000" opacity=".5" filter="url(#b12)"/><circle cx="200" cy="200" r="${r}" fill="url(#pl)"/><circle cx="200" cy="200" r="${r - 40}" fill="#efe6d4"/><circle cx="200" cy="200" r="${r - 42}" fill="#f7f0e2"/><path d="M60 150 A${r - 8} ${r - 8} 0 0 1 220 28" fill="none" stroke="#fff" stroke-width="5" opacity=".6" stroke-linecap="round" filter="url(#b3)"/>`;
  const C = (s) => `<g filter="url(#Lc)">${s}</g>`;
  const brillo = (x, y, w = 40, r = -30) => `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${w / 5}" transform="rotate(${r} ${x} ${y})" fill="#fff" opacity=".28" filter="url(#b3)"/>`;
  const limon = (x, y, r) => `<g transform="translate(${x},${y}) rotate(${r})"><path d="M0 0 a26 26 0 0 1 52 0z" fill="#7dae3a"/><path d="M5 0 a21 21 0 0 1 42 0z" fill="#d7ec8a"/><path d="M26 0 L12 -14 M26 0 L26 -20 M26 0 L40 -14" stroke="#b9d66a" stroke-width="2"/></g>`;
  const cilantro = (x, y) => `<g transform="translate(${x},${y})"><circle r="6" fill="#4f8a2e"/><circle cx="8" cy="-4" r="5" fill="#5f9a36"/><circle cx="4" cy="7" r="5" fill="#3f7a26"/></g>`;
  const cebolla = (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${n(r * 0.7)}" fill="none" stroke="#e7b7d8" stroke-width="4"/>`;
  const fondoP = `<rect width="400" height="400" fill="url(#pb)"/>`;
  const sale = (nombre, cuerpo, conFondo = true) => capa(nombre, [0, 0, 400, 400], (conFondo ? fondoP : '') + cuerpo, { defs: d, esc: 0.7, q: 0.84 });
  // pescado a la talla: mitad roja, mitad verde, sin ojo de caricatura
  const pez = `<g transform="rotate(-24 200 200)"><path d="M70 200 C110 140 250 136 326 200 C250 266 110 262 70 200Z" fill="url(#adobo)"/><path d="M70 200 C110 140 250 136 326 200 L70 200Z" fill="url(#verdeS)"/><path d="M150 168 q20 30 0 64 M200 162 q20 36 0 74 M250 168 q16 30 0 62" stroke="#2a0d08" stroke-width="4" fill="none" opacity=".3"/></g>`;
  const arroz = `<ellipse cx="128" cy="300" rx="56" ry="34" fill="#fff6e2"/><circle cx="110" cy="292" r="4" fill="#e85a3a"/><circle cx="138" cy="304" r="4" fill="#7ab040"/><circle cx="150" cy="288" r="4" fill="#f2c14a"/>`;
  const adorno = limon(250, 300, -20) + cebolla(300, 120, 14) + cebolla(286, 132, 10) + cilantro(180, 120) + cilantro(230, 270);
  sale('plato-pescado', plato() + C(arroz + pez) + C(adorno) + brillo(180, 176, 60, -24));
  sale('torno-plato', plato(), false); sale('torno-pez', C(arroz + pez) + brillo(180, 176, 60, -24), false); sale('torno-adorno', C(adorno + cilantro(140, 230)), false);
  let ag = `<circle cx="200" cy="200" r="120" fill="#7fbf5a" opacity=".6"/>`;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ag += `<g transform="translate(${n(200 + Math.cos(a) * 82)},${n(200 + Math.sin(a) * 82)}) rotate(${n((a * 180) / Math.PI + 90)})"><path d="M-22 0 C-22 -18 22 -18 22 0 C14 -6 -14 -6 -22 0Z" fill="#f4a08a"/><path d="M-16 -4 C-10 -12 10 -12 16 -4" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/></g>`; }
  ag += `<circle cx="200" cy="200" r="34" fill="#6b3a6e" opacity=".7"/>` + cebolla(170, 190, 16) + cebolla(226, 214, 14) + `<circle cx="214" cy="170" r="10" fill="#2f6b2a"/><circle cx="182" cy="228" r="8" fill="#2f6b2a"/>`;
  sale('plato-aguachile', plato() + C(ag) + brillo(170, 150, 50));
  let ta = '';
  [[130, -18], [200, 0], [270, 18]].forEach(([x, r]) => { ta += `<g transform="translate(${x},200) rotate(${r})"><ellipse rx="44" ry="96" fill="url(#tort)"/><ellipse rx="26" ry="80" fill="#e9b48a"/><ellipse rx="22" ry="70" fill="#f3d6b0"/><circle cy="-30" r="8" fill="#7ab040"/><circle cy="10" r="7" fill="#e85a3a"/><circle cy="40" r="7" fill="#7ab040"/><path d="M-14 -50 q14 10 28 0" stroke="#fff" stroke-width="4" fill="none"/></g>`; });
  sale('plato-tacos', plato() + C(ta) + C(limon(300, 320, -30)));
  let en = `<circle cx="200" cy="200" r="118" fill="#6f9a3a"/>`;
  [[160, 170], [240, 180], [200, 240], [150, 240], [250, 250], [205, 140]].forEach(([x, y], i) => { en += `<circle cx="${x}" cy="${y}" r="${22 - (i % 2) * 4}" fill="${i % 2 ? '#a3204a' : '#c0306a'}"/>`; });
  en += `<circle cx="200" cy="196" r="9" fill="#f2d4a0"/><circle cx="180" cy="210" r="7" fill="#f2d4a0"/>`;
  sale('plato-ensalada', plato() + C(en) + brillo(170, 160, 44));
  let es = '';
  [[150, -10], [200, 0], [250, 10]].forEach(([x, r]) => { es += `<g transform="translate(${x},200) rotate(${r})"><rect x="-26" y="-100" width="52" height="200" rx="26" fill="#d8e3a0"/></g>`; });
  es += `<ellipse cx="200" cy="200" rx="110" ry="80" fill="#fffaf0" opacity=".92"/><circle cx="170" cy="180" r="8" fill="#7ab040"/><circle cx="226" cy="214" r="8" fill="#e85a3a"/>`;
  sale('plato-enchiladas', plato() + C(es));
  let mo = `<circle cx="200" cy="200" r="122" fill="url(#mole)"/><path d="M110 210 C150 150 260 150 290 200 C260 250 150 260 110 210Z" fill="#6a3a2a"/>`;
  for (let i = 0; i < 16; i++) mo += `<ellipse cx="${n(130 + ((i * 47) % 150))}" cy="${n(150 + ((i * 31) % 110))}" rx="4" ry="2.6" fill="#f3e7cf"/>`;
  sale('plato-mole', plato() + C(mo) + brillo(170, 150, 56));
  let re = `<g transform="rotate(-12 200 200)">`;
  for (let i = 0; i < 6; i++) re += `<rect x="${110 + i * 30}" y="130" width="28" height="130" rx="10" fill="url(#res)"/><rect x="${116 + i * 30}" y="136" width="7" height="118" rx="3" fill="#d2664a" opacity=".6"/>`;
  re += `</g><ellipse cx="290" cy="290" rx="44" ry="28" fill="#7ab040"/><circle cx="120" cy="290" r="26" fill="#6b4a2a"/>` + cebolla(300, 120, 16);
  sale('plato-res', plato() + C(re) + brillo(190, 170, 60, -12));
  const fl = `<ellipse cx="200" cy="210" rx="90" ry="84" fill="#a8541a" opacity=".8"/><circle cx="200" cy="200" r="66" fill="#f2c56a"/><circle cx="200" cy="200" r="46" fill="#c47a2a"/><path d="M270 120 l20 -20 M276 128 l26 -6" stroke="#4f8a2e" stroke-width="6" stroke-linecap="round"/>`;
  sale('plato-flan', plato() + C(fl) + brillo(186, 180, 30));
}

/* ===================== el fondo de los primeros planos: la misma mesa, más cerca y fuera de foco ===================== */
function fondoCerca(f) {
  const cuerpo = (nombres) => nombres.map((k) => CAPAS.find((c) => c.nombre === k).cuerpo).join('');
  const d = f.d + CAPAS.find((c) => c.nombre === 'mesa').defs + lin('co', [[0, '#120d0b', 0.9], [0.45, '#120d0b', 0.55], [0.75, '#120d0b', 0.1], [1, '#120d0b', 0.25]], 1, 0);
  const escena = f.c + cuerpo(['carlos-silla', 'carlos-cabeza', 'carlos-cuerpo', 'mesa', 'montaje', 'copa-c', 'vela', 'llama', 'carlos-brazo-cel']) + `<circle cx="${VELA.x}" cy="${VELA.y}" r="300" fill="url(#gVela)"/>`;
  const c = `<rect width="1920" height="1080" fill="#120d0b"/><g filter="url(#b12)"><g transform="translate(-1230 -520) scale(1.9)">${escena}</g></g><rect width="1920" height="1080" fill="url(#co)"/>`;
  capa('cerca-fondo', [0, 0, 1920, 1080], c, { defs: d, esc: 0.5, q: 0.78 });
}

/* grano de película: un mosaico pequeño que se repite */
function grano() {
  capa('grano', [0, 0, 256, 256], `<rect width="256" height="256" filter="url(#gr)"/>`, { defs: `<filter id="gr" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  .9 .9 .9 0 -.9"/></filter>`, q: 0.6 });
}

const f = fondo();
comensal('ana'); comensal('carlos'); alFondo('sofia'); alFondo('diego'); mesero(); utileria(); mesa(); montaje(); vela(); acrilico(); platillosMesa(); sucia(); nuevos();
manos('ana', { piel: '#c99272', manga: '#5d6734' });
manos('carlos', { piel: '#b98260', manga: '#34313d', puno: '#d8cbb4', espejo: true });
manos('mesero', { piel: '#b88562', manga: '#cfc3ae' });
visor(); platillos(); fondoCerca(f); grano();

/* ---- pintar en Chromium y guardar ---- */
const { chromium } = createRequire(import.meta.url)('playwright');
const nav = await chromium.launch();
const pag = await nav.newPage();
const pintar = (svg, W, H, q, tipo = 'image/webp') => pag.evaluate(async ({ svg, W, H, q, tipo }) => {
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); await img.decode();
  const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0, W, H);
  return c.toDataURL(tipo, q).split(',')[1];
}, { svg, W, H, q, tipo });
for (const a of readdirSync(aqui)) if (/\.(svg|webp)$/.test(a)) unlinkSync(resolve(aqui, a));
let total = 0;
for (const c of CAPAS) {
  const buf = Buffer.from(await pintar(documento(c), Math.round(c.w * c.esc), Math.round(c.h * c.esc), c.q), 'base64');
  writeFileSync(resolve(aqui, c.nombre + '.webp'), buf); total += buf.length;
}
console.log(`${CAPAS.length} capas, ${(total / 1024).toFixed(0)} KB`);

/* ---- la tabla de cajas viaja a la película ---- */
const peli = resolve(aqui, '../../js/e2_film.js');
const tabla = '/* CAPAS:inicio (lo escribe apoyo/cine/generar.mjs; no editar a mano) */\nconst CAPAS = {\n' +
  CAPAS.map((c) => `  "${c.nombre}": ["apoyo/cine/${c.nombre}.webp", ${c.x}, ${c.y}, ${c.w}, ${c.h}],`).join('\n') + '\n};\n/* CAPAS:fin */';
const src = readFileSync(peli, 'utf8');
if (/\/\* CAPAS:inicio[\s\S]*?CAPAS:fin \*\//.test(src)) writeFileSync(peli, src.replace(/\/\* CAPAS:inicio[\s\S]*?CAPAS:fin \*\//, tabla));
else console.log('aviso: js/e2_film.js no tiene las marcas CAPAS; la tabla no se escribió');

/* ---- cuadros compuestos para revisar el dibujo sin abrir la película ---- */
if (process.env.PREVIA) {
  mkdirSync(process.env.PREVIA, { recursive: true });
  const junta = (nombres, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs>${DEFS}${[...new Set(CAPAS.filter((c) => nombres.includes(c.nombre)).map((c) => c.defs))].join('')}</defs><rect width="1920" height="1080" fill="#171210"/>${nombres.map((k) => CAPAS.find((c) => c.nombre === k).cuerpo).join('')}${extra}</svg>`;
  const sala = ['fondo', 'ana-silla', 'carlos-silla', 'mesero-cabeza', 'mesero-cuerpo', 'sofia-cabeza', 'sofia-cuerpo', 'diego-cabeza', 'diego-cuerpo', 'ana-cabeza', 'ana-cuerpo', 'carlos-cabeza', 'carlos-cuerpo', 'mesa', 'montaje', 'copa-a', 'copa-c', 'acrilico', 'vela', 'llama', 'resplandor'];
  const cuadros = {
    sala: junta([...sala, 'sofia-brazos-carta', 'diego-brazos', 'mesero-brazos-libreta', 'ana-brazo-carta', 'carlos-brazo', 'ticket']),
    sala2: junta([...sala.filter((k) => !/montaje|copa-a|mesero/.test(k)), 'platillo-a', 'platillo-c', 'pastel', 'sofia-brazos-cel', 'diego-brazos-cel', 'ana-brazo-copa', 'carlos-brazo-cel']),
    sucia: junta(['fondo', 'ana-silla', 'carlos-silla', 'mesero-cabeza', 'mesero-cuerpo', 'mesa', 'sucia-migas', 'sucia-a', 'sucia-c', 'sucia-vaso', 'copa-c', 'acrilico', 'vela', 'mesero-brazos-trapo', 'nuevos']),
    terminal: junta([...sala, 'mesero-brazos-terminal', 'ana-brazo-cel', 'carlos-brazo']),
  };
  for (const k of ['ana', 'carlos', 'mesero']) {
    const tel = `<rect x="-13" y="-13" width="426" height="892" rx="66" fill="#100c0a"/><rect width="400" height="866" rx="56" fill="#fef9f1"/>`;
    const C = (nm) => CAPAS.find((c) => c.nombre === nm);
    cuadros['mano-' + k] = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs>${DEFS}${C(k + '-mano-atras').defs}${C(k + '-mano-frente').defs}${C(k + '-dedo').defs}${C('cerca-fondo').defs}</defs>${C('cerca-fondo').cuerpo}<g transform="translate(${k === 'carlos' ? 500 : 1020} 110) scale(.9)">${C(k + '-mano-atras').cuerpo}${tel}${C(k + '-mano-frente').cuerpo}<g transform="translate(${k === 'carlos' ? 120 : 260} 500)">${C(k + '-dedo').cuerpo}</g></g></svg>`;
  }
  for (const [k, svg] of Object.entries(cuadros)) writeFileSync(resolve(process.env.PREVIA, k + '.png'), Buffer.from(await pintar(svg, 1920, 1080, 1, 'image/png'), 'base64'));
}
await nav.close();
