// Escribe apoyo/voz/guion.json a partir de VOZ (js/e2_film.js): una línea por frase, en orden, para grabar sin adivinar.
// Uso, desde la carpeta del informe: node apoyo/cine/guion.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(resolve(raiz, 'js/e2_film.js'), 'utf8');
const a = src.indexOf('const CICLO ='), b = src.indexOf('/* Las tomas que ya tienen audio');
const { TOMAS, VOZ } = new Function(src.slice(a, b) + '; return {TOMAS, VOZ};')();
const lineas = [];
for (const [toma] of TOMAS) {
  (VOZ[toma] || []).forEach((l, i, todas) => {
    const [inicio, quien, texto, o = {}] = l, ant = todas[i - 1];
    const fila = { id: `${toma}-${String(i + 1).padStart(2, '0')}`, toma, quien, texto, inicio };
    if (o.con !== undefined) fila.con = o.con; // empieza `con` segundos después de que EMPIEZA la anterior
    else if (o.encima !== undefined) fila.encima = o.encima;
    else if (o.tras !== undefined) fila.tras = o.tras;
    else if (ant) fila.tras = quien === 'narrador' || ant[1] === 'narrador' ? 0.3 : 0.2; // la narradora nunca se encima con un personaje
    lineas.push(fila);
  });
}
mkdirSync(resolve(raiz, 'apoyo/voz'), { recursive: true });
writeFileSync(resolve(raiz, 'apoyo/voz/guion.json'), JSON.stringify(lineas, null, 1) + '\n');
const por = {};
for (const l of lineas) por[l.quien] = (por[l.quien] || 0) + l.texto.length;
console.log(`${lineas.length} líneas · caracteres: ${Object.entries(por).map(([q, n]) => `${q} ${n}`).join(' · ')} · total ${Object.values(por).reduce((x, y) => x + y, 0)}`);
