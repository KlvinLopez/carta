// Imprime informe.html a PDF horizontal tamaño carta y, con --png, una imagen por página (revisión visual).
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const aqui = dirname(fileURLToPath(import.meta.url));
const salida = process.argv[2] ?? resolve(aqui, '..', '2026-11-14-planos-de-carta-v4.pdf');
const png = process.argv.find((a) => a.startsWith('--png='))?.slice(6);
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1056, height: 816 }, deviceScaleFactor: 1 });
const errores = [];
pagina.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
pagina.on('pageerror', (e) => errores.push(String(e)));
await pagina.goto(pathToFileURL(resolve(aqui, 'informe.html')).href, { waitUntil: 'load' });
await pagina.evaluate(() => document.fonts.ready);
if (png) {
  const n = await pagina.locator('section.pg').count();
  for (let i = 0; i < n; i++) await pagina.locator('section.pg').nth(i).screenshot({ path: `${png}/p${String(i + 1).padStart(2, '0')}.png` });
  // desbordes: contenido de la página más alto que la página
  const malas = await pagina.evaluate(() => [...document.querySelectorAll('section.pg')].map((s, i) => [i + 1, s.scrollHeight - s.clientHeight]).filter(([, d]) => d > 1));
  console.log('desbordes verticales:', JSON.stringify(malas));
}
await pagina.pdf({ path: salida, width: '11in', height: '8.5in', printBackground: true, preferCSSPageSize: true });
await navegador.close();
console.log('errores de consola:', errores.length, errores.join(' | '));
console.log(`escrito ${salida}`);
