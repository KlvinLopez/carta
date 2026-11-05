#!/usr/bin/env node
// Presupuesto del bundle inicial de la PWA (T-0.5, T-2.7).
//
// Mide lo que el navegador descarga para pintar la primera pantalla: los <script type="module">,
// los <link rel="modulepreload"> y las hojas <link rel="stylesheet"> que referencia dist/index.html.
// Los trozos que entran con React.lazy (una por área) no cuentan: se descargan al navegar.
//
// La medida es **gzip (nivel 9)**: es la compresión mínima que garantiza cualquier borde o servidor;
// brotli sale más chico y se imprime sólo como referencia. Límite: 250 KB = 250 × 1024 bytes.
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LIMITE_BYTES = 250 * 1024;
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(raiz, 'dist');
const indice = join(dist, 'index.html');

if (!existsSync(indice)) {
  console.error(`No existe ${indice}. Corre antes: npm --prefix frontend run build`);
  process.exit(2);
}

const html = readFileSync(indice, 'utf8');
const rutas = new Set();
for (const coincidencia of html.matchAll(/<script[^>]+type="module"[^>]+src="([^"]+)"/g)) {
  rutas.add(coincidencia[1]);
}
for (const coincidencia of html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)) {
  rutas.add(coincidencia[1]);
}
for (const coincidencia of html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)) {
  rutas.add(coincidencia[1]);
}

if (rutas.size === 0) {
  console.error('dist/index.html no referencia ningún script ni hoja de estilo: ¿la build falló?');
  process.exit(2);
}

const gzip = (buf) => gzipSync(buf, { level: 9 }).length;
const brotli = (buf) =>
  brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
const kb = (n) => (n / 1024).toFixed(1).padStart(7) + ' KB';

let totalCrudo = 0;
let totalGzip = 0;
let totalBrotli = 0;
const filas = [];
for (const ruta of [...rutas].sort()) {
  const archivo = join(dist, ruta.replace(/^\//, ''));
  if (!existsSync(archivo)) {
    console.error(`index.html referencia ${ruta} pero no existe en dist/`);
    process.exit(2);
  }
  const contenido = readFileSync(archivo);
  const g = gzip(contenido);
  const b = brotli(contenido);
  totalCrudo += contenido.length;
  totalGzip += g;
  totalBrotli += b;
  filas.push(`${kb(contenido.length)}  ${kb(g)}  ${kb(b)}  ${ruta}`);
}

const htmlBuf = Buffer.from(html);
totalCrudo += htmlBuf.length;
totalGzip += gzip(htmlBuf);
totalBrotli += brotli(htmlBuf);
filas.push(`${kb(htmlBuf.length)}  ${kb(gzip(htmlBuf))}  ${kb(brotli(htmlBuf))}  /index.html`);

console.log('Bundle inicial (lo que carga la primera pantalla, sin los trozos de cada área)');
console.log('     crudo       gzip     brotli  archivo');
for (const fila of filas) console.log(fila);
console.log('-'.repeat(72));
console.log(`${kb(totalCrudo)}  ${kb(totalGzip)}  ${kb(totalBrotli)}  total`);
console.log(`Límite (gzip): ${kb(LIMITE_BYTES)}  ·  usado: ${((totalGzip / LIMITE_BYTES) * 100).toFixed(0)} %`);

if (totalGzip > LIMITE_BYTES) {
  console.error(`\nPresupuesto excedido: ${kb(totalGzip)} gzip > ${kb(LIMITE_BYTES)}.`);
  process.exit(1);
}
console.log('\nPresupuesto en verde.');
