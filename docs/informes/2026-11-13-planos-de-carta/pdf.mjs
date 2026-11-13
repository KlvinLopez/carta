// Imprime informe.html a PDF tamaño carta con el Chromium ya instalado (Playwright).
// Uso: node docs/informes/2026-11-13-planos-de-carta/pdf.mjs [salida.pdf]
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const aqui = dirname(fileURLToPath(import.meta.url));
const salida = process.argv[2] ?? resolve(aqui, '..', '2026-11-13-planos-de-carta.pdf');

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
await pagina.goto(pathToFileURL(resolve(aqui, 'informe.html')).href, { waitUntil: 'load' });
await pagina.evaluate(() => document.fonts.ready);
await pagina.pdf({
  path: salida,
  format: 'Letter',
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate:
    '<div style="width:100%;font-size:7px;color:#5B4A3D;font-family:sans-serif;padding:0 15mm;display:flex;justify-content:space-between">' +
    '<span>Planos de Carta · 13 de noviembre de 2026 · versión 3</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
});
await navegador.close();
console.log(`escrito ${salida}`);
