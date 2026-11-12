#!/usr/bin/env node
// Presupuesto del bundle inicial de la PWA (T-0.5, T-2.7).
//
// Mide lo que el navegador descarga para pintar la primera pantalla: los <script type="module">,
// los <link rel="modulepreload"> y las hojas <link rel="stylesheet"> que referencia dist/index.html,
// más el propio HTML. Los trozos que entran con React.lazy (uno por área, `Area-*.js`) no cuentan:
// se descargan al navegar; este script exige que existan al menos tres y que index.html no los
// referencie (guarda del code splitting, punto del Entregable de T-0.5).
//
// Decisión: el presupuesto es de JS + CSS + HTML. Las fuentes precargadas (≈ 55 KB en woff2) no
// entran en los 250 KB: se sirven con caché de un año y no bloquean el pintado (font-display: swap).
//
// La medida es **gzip (nivel 9)**: es la compresión mínima que garantiza cualquier borde o servidor;
// brotli sale más chico y se imprime sólo como referencia. Límite: 250 KB = 250 × 1024 bytes.
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { archivosDeLaPrecarga, calcularArmazon, listarDist } from './armazon.mjs';

const LIMITE_BYTES = 250 * 1024;
const MINIMO_TROZOS_AREA = 3;
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// `PRESUPUESTO_DIST` sólo lo usa la prueba de este script (src/presupuesto.test.ts) para apuntar a un dist falso.
const dist = resolve(process.env.PRESUPUESTO_DIST ?? join(raiz, 'dist'));
const indice = join(dist, 'index.html');

const fallar = (mensaje, codigo = 1) => {
  console.error(mensaje);
  process.exit(codigo);
};

if (!existsSync(indice)) {
  fallar(`No existe ${indice}. Corre antes: npm --prefix frontend run build`, 2);
}

// Sin comentarios HTML: una etiqueta comentada no se descarga.
const html = readFileSync(indice, 'utf8');
const htmlVivo = html.replace(/<!--[\s\S]*?-->/g, '');

/** Atributos de una etiqueta sin depender del orden ni de las comillas. */
function atributosDe(etiqueta) {
  const atributos = {};
  for (const m of etiqueta.matchAll(/([A-Za-z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    atributos[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return atributos;
}

const rutas = new Set();
let scriptsModulo = 0;
for (const [etiqueta, nombre] of htmlVivo.matchAll(/<(script|link)\b[^>]*>/gi)) {
  const a = atributosDe(etiqueta);
  if (nombre.toLowerCase() === 'script') {
    if ((a.type ?? '').toLowerCase() === 'module' && a.src) {
      rutas.add(a.src);
      scriptsModulo += 1;
    }
  } else {
    const rel = (a.rel ?? '').toLowerCase().split(/\s+/);
    if ((rel.includes('modulepreload') || rel.includes('stylesheet')) && a.href) rutas.add(a.href);
  }
}

if (scriptsModulo === 0) {
  fallar('dist/index.html no tiene ningún <script type="module">: ¿la build falló?', 2);
}

/** Ruta absoluta dentro de dist/, o falla si apunta fuera. */
function archivoDe(ruta) {
  const archivo = resolve(dist, ruta.replace(/^\//, ''));
  if (!archivo.startsWith(dist + sep)) fallar(`index.html referencia ${ruta}, fuera de dist/`, 2);
  if (!existsSync(archivo)) fallar(`index.html referencia ${ruta} pero no existe en dist/`, 2);
  return archivo;
}

const gzip = (buf) => gzipSync(buf, { level: 9 }).length;
const brotli = (buf) =>
  brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
const kb = (n) => (n / 1024).toFixed(1).padStart(7) + ' KB';

let totalCrudo = 0;
let totalGzip = 0;
let totalBrotli = 0;
const filas = [];
const sumar = (contenido, nombre) => {
  const g = gzip(contenido);
  const b = brotli(contenido);
  totalCrudo += contenido.length;
  totalGzip += g;
  totalBrotli += b;
  filas.push(`${kb(contenido.length)}  ${kb(g)}  ${kb(b)}  ${nombre}`);
};
for (const ruta of [...rutas].sort()) sumar(readFileSync(archivoDe(ruta)), ruta);
sumar(Buffer.from(html), '/index.html');

console.log('Bundle inicial (lo que carga la primera pantalla, sin los trozos de cada área)');
console.log('     crudo       gzip     brotli  archivo');
for (const fila of filas) console.log(fila);
console.log('-'.repeat(72));
console.log(`${kb(totalCrudo)}  ${kb(totalGzip)}  ${kb(totalBrotli)}  total`);
console.log(`Límite (gzip): ${kb(LIMITE_BYTES)}  ·  usado: ${((totalGzip / LIMITE_BYTES) * 100).toFixed(0)} %`);

// Guarda del SDK de Firebase (T-1.10): pesa ~47 KB gzip y sólo lo necesita `/admin`. Si alguna forma
// de import (estático, `import 'firebase/auth'` con efecto lateral, `export … from`, `require`) lo
// arrastra a la carga inicial, sus URLs (`identitytoolkit`, `firebaseapp`) aparecen en el grafo
// inicial. Se mira el contenido, no el código fuente: no hay sintaxis que lo esquive.
const MARCAS_SDK = ['identitytoolkit', 'firebaseapp'];
const conSdk = [...rutas]
  .map((ruta) => [ruta, readFileSync(archivoDe(ruta), 'utf8')])
  .concat([['/index.html', html]])
  .filter(([, contenido]) => MARCAS_SDK.some((marca) => contenido.includes(marca)))
  .map(([ruta]) => ruta);
if (conSdk.length > 0) {
  fallar(
    `\nEl SDK de Firebase está en la carga inicial (${conSdk.join(', ')}): debe entrar sólo con import() desde admin/acceso/proveedor.ts.`,
  );
}

// Guarda del code splitting: un trozo por área, y ninguno en la carga inicial.
const carpetaAssets = join(dist, 'assets');
const trozosArea = existsSync(carpetaAssets)
  ? readdirSync(carpetaAssets).filter((n) => /^Area-.*\.js$/.test(n))
  : [];
console.log(`Trozos de área (React.lazy): ${trozosArea.length} → ${trozosArea.join(', ') || 'ninguno'}`);
if (trozosArea.length < MINIMO_TROZOS_AREA) {
  fallar(
    `\nCode splitting roto: se esperaban ≥ ${MINIMO_TROZOS_AREA} trozos dist/assets/Area-*.js (uno por área) y hay ${trozosArea.length}.`,
  );
}
const referenciados = trozosArea.filter((n) => [...rutas].some((r) => r.endsWith('/' + n)));
if (referenciados.length > 0) {
  fallar(`\nCode splitting roto: index.html carga de inicio ${referenciados.join(', ')}.`);
}

// Cada pantalla del panel (Menú en T-1.12; Mesas, Personal y Ajustes en T-1.13) debe ser su propio trozo:
// quitar su `React.lazy` la metería en `Area-*.js` y el panel entero cargaría sus listas, editores y
// formularios aunque la persona no abra esa sección.
for (const [pantalla, prefijo] of [
  ['Menú', 'PantallaMenu'],
  ['Mesas', 'PantallaMesas'],
  ['Personal', 'PantallaPersonal'],
  ['Ajustes', 'PantallaAjustes'],
]) {
  const patron = new RegExp(`^${prefijo}-.*\\.js$`);
  const trozos = existsSync(carpetaAssets) ? readdirSync(carpetaAssets).filter((n) => patron.test(n)) : [];
  console.log(`Trozo de la pantalla ${pantalla} (React.lazy): ${trozos.join(', ') || 'ninguno'}`);
  if (trozos.length === 0) {
    fallar(`\nCode splitting roto: falta dist/assets/${prefijo}-*.js (la pantalla ${pantalla} debe cargarse con React.lazy).`);
  }
  if (trozos.some((n) => [...rutas].some((r) => r.endsWith('/' + n)))) {
    fallar(`\nCode splitting roto: index.html carga de inicio ${trozos.join(', ')}.`);
  }
}

// Guarda del trozo del comensal (T-2.7): lo que el worker precarga en el teléfono de cada comensal. Ni el panel
// del operador, ni el SDK de Firebase, ni los datos simulados pueden colarse en ese grafo (ni en el bundle inicial,
// ni en `Area-comensal-*.js` y sus dependencias): con 4G el comensal no debe bajar nada de eso.
const MARCAS_MOCKS = ['Jx3k9QwLmN2pR7sT4vY8zA', 'req-simulado'];
const DEL_PANEL = /(?:^|\/)(?:Area-admin|Area-personal|Pantalla[A-Z]\w*|Asistente|index\.esm)-/;
const archivosDist = listarDist(dist);
const comensal = archivosDist.filter((a) => /^assets\/Area-comensal-[\w-]+\.js$/.test(a));
if (comensal.length !== 1) {
  fallar(`\nFalta el trozo del comensal: se esperaba un dist/assets/Area-comensal-*.js y hay ${comensal.length}.`);
}
const grafoComensal = calcularArmazon(dist, archivosDist);
const intrusos = [];
for (const ruta of [...grafoComensal.js, ...grafoComensal.css]) {
  if (DEL_PANEL.test(ruta)) intrusos.push(`${ruta} (trozo de otra área)`);
  if (!ruta.endsWith('.js')) continue;
  const codigo = readFileSync(join(dist, ruta), 'utf8');
  if (MARCAS_SDK.some((marca) => codigo.includes(marca))) intrusos.push(`${ruta} (SDK de Firebase)`);
  if (MARCAS_MOCKS.some((marca) => codigo.includes(marca))) intrusos.push(`${ruta} (datos simulados)`);
}
if (intrusos.length > 0) {
  fallar(`\nEl grafo del comensal arrastra lo que no es suyo: ${intrusos.join('; ')}.`);
}

// Lo que el service worker precarga (armazón del comensal): peso comprimido de cada archivo, para vigilarlo.
const precarga = archivosDeLaPrecarga(dist, archivosDist);
let precargaCruda = 0;
let precargaGzip = 0;
for (const ruta of precarga) {
  const contenido = readFileSync(join(dist, ruta));
  precargaCruda += contenido.length;
  precargaGzip += gzip(contenido);
}
console.log(`Precarga del service worker: ${precarga.length} archivos, ${kb(precargaCruda).trim()} crudo, ${kb(precargaGzip).trim()} gzip (sin los trozos de /admin ni Firebase)`);

if (totalGzip > LIMITE_BYTES) {
  fallar(`\nPresupuesto excedido: ${kb(totalGzip)} gzip > ${kb(LIMITE_BYTES)}.`);
}
console.log('\nPresupuesto en verde.');
