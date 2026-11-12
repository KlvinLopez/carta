// Qué entra en la precarga del service worker (T-2.7): el armazón del comensal y nada más.
//
// `entradasDelArmazon` es un `manifestTransform` de workbox-build: recibe todo el dist y devuelve
// sólo (1) `index.html`, (2) la entrada JS y los trozos que **el comensal** necesita (el
// `import()` de `Area-comensal-*.js` con la lista de dependencias que Vite escribe en
// `__vite__mapDeps`, JS y CSS), (3) lo que la entrada importa estáticamente, (4) las fuentes latin
// que se precargan en index.html y (5) manifest e íconos pequeños. Quedan fuera los trozos de /admin y
// /staff, el SDK de Firebase y todo lo que sólo se importe con `import()` para otra área: un
// comensal con 4G no debe bajar el panel del operador. Esos se guardan al usarse (caché primero en
// `/assets/` y `/fonts/`).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';

const FUENTES_PRECARGADAS = /^fonts\/(?:DMSans-variable|DMSerifDisplay-Regular)-latin\.woff2$/;
// Los PNG de 512 (144 KB) sólo los pide el navegador al instalar: no se precargan en cada teléfono.
const ICONOS = /^(?:manifest\.webmanifest|icono-(?:180|192)\.png|icono(?:-maskable)?\.svg)$/;
const ENTRADA = /^assets\/index-[\w-]+\.js$/;
const COMENSAL = /^assets\/Area-comensal-[\w-]+\.js$/;
// import "./x.js"  ·  import{a}from"./x.js"  ·  export{a}from"./x.js"  (no `import("./x.js")`: ése es perezoso)
const ESTATICO = /(?:\bfrom|\bimport)\s*["'](\.{1,2}\/[^"']+\.js)["']/g;

const leer = (dist, ruta) => readFileSync(join(dist, ruta), 'utf8');

/** Imports estáticos de un archivo del dist, como rutas relativas al dist. */
function importsEstaticos(dist, ruta) {
  const carpeta = posix.dirname(ruta);
  return [...leer(dist, ruta).matchAll(ESTATICO)].map((m) => posix.normalize(posix.join(carpeta, m[1])));
}

/** Lo que Vite lista para el `import()` del trozo `destino`: JS y CSS, por la tabla `__vite__mapDeps`. */
function dependenciasDelImport(codigoEntrada, destino) {
  const tabla = /\bm\.f\|\|\(m\.f=\[([^\]]*)\]/.exec(codigoEntrada);
  if (!tabla) return [];
  const archivos = [...tabla[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const nombre = destino.split('/').pop();
  const llamada = new RegExp(`import\\("\\./${nombre.replace(/[.]/g, '\\.')}"\\),__vite__mapDeps\\(\\[([\\d,]+)\\]\\)`).exec(codigoEntrada);
  if (!llamada) return [destino];
  return llamada[1].split(',').map((i) => archivos[Number(i)]).filter(Boolean);
}

export function calcularArmazon(dist, archivos) {
  const todos = new Set(archivos);
  const entradas = archivos.filter((a) => ENTRADA.test(a));
  const comensal = archivos.filter((a) => COMENSAL.test(a));
  const js = new Set();
  const css = new Set();
  const pendientes = [...entradas, ...comensal];
  for (const entrada of entradas) {
    const codigo = leer(dist, entrada);
    for (const destino of comensal) pendientes.push(...dependenciasDelImport(codigo, destino));
  }
  while (pendientes.length > 0) {
    const ruta = pendientes.pop();
    if (!todos.has(ruta)) continue;
    if (ruta.endsWith('.css')) {
      css.add(ruta);
      continue;
    }
    if (js.has(ruta)) continue;
    js.add(ruta);
    pendientes.push(...importsEstaticos(dist, ruta));
  }
  const indice = join(dist, 'index.html');
  const html = existsSync(indice) ? leer(dist, 'index.html') : '';
  for (const m of html.matchAll(/href="\/?(assets\/[\w.-]+\.css)"/g)) css.add(m[1]);
  return { js, css };
}

/** Todos los archivos regulares del dist, como rutas relativas con `/` (sin el worker, que no se precarga a sí mismo). */
export function listarDist(dist, carpeta = '') {
  const salida = [];
  for (const e of readdirSync(join(dist, carpeta), { withFileTypes: true })) {
    const ruta = carpeta ? `${carpeta}/${e.name}` : e.name;
    if (e.isDirectory()) salida.push(...listarDist(dist, ruta));
    else if (e.isFile() && !/^sw\.(?:js|mjs)$/.test(ruta)) salida.push(ruta);
  }
  return salida;
}

/** Lo que el worker precarga: la lista de rutas, sin revisiones (la usa también `presupuesto.mjs` para pesarla). */
export function archivosDeLaPrecarga(dist, archivos) {
  const { js, css } = calcularArmazon(dist, archivos);
  return archivos.filter((url) => url === 'index.html' || js.has(url) || css.has(url) || FUENTES_PRECARGADAS.test(url) || ICONOS.test(url));
}

/** `manifestTransform` de workbox-build. vite-plugin-pwa corre con la raíz del proyecto como directorio de trabajo. */
export async function entradasDelArmazon(entradas) {
  const dist = join(process.cwd(), 'dist');
  const elegidas = new Set(archivosDeLaPrecarga(dist, entradas.map((e) => e.url)));
  return { manifest: entradas.filter(({ url }) => elegidas.has(url)), warnings: [] };
}
