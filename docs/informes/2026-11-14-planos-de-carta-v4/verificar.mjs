// Abre interactivo.html con Chromium: errores de consola, desbordes a 1440×900 y 400×860, y cada caja con sus controles.
// Uso: node verificar.mjs [--png=carpeta]
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const aqui = dirname(fileURLToPath(import.meta.url));
const png = process.argv.find((a) => a.startsWith('--png='))?.slice(6);
const nav = await chromium.launch();
const errores = [];
let fallos = 0;
for (const [w, h] of [
  [1440, 900],
  [400, 860],
]) {
  const p = await nav.newPage({ viewport: { width: w, height: h } });
  p.on('console', (m) => m.type() === 'error' && errores.push(`${w}: ${m.text()}`));
  p.on('pageerror', (e) => errores.push(`${w}: ${e}`));
  await p.goto(pathToFileURL(resolve(aqui, 'interactivo.html')).href);
  await p.evaluate(() => document.fonts.ready);
  const horiz = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (horiz > 0) {
    fallos++;
    console.log(`${w}: desborde horizontal de portada ${horiz}px`);
  }
  const vert = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  console.log(`${w}: la portada ${vert > 0 ? 'hace scroll vertical de ' + vert + 'px' : 'cabe en una pantalla'}`);
  if (png) await p.screenshot({ path: `${png}/i_${w}_inicio.png`, fullPage: w < 600 });
  const ids = await p.$$eval('.box', (b) => b.map((x) => x.dataset.id));
  for (const id of ids) {
    await p.click(`.box[data-id="${id}"]`);
    for (const b of await p.$$('#det .opt[data-k]')) await b.click();
    for (const r of await p.$$('#det input[type=range]')) {
      await r.evaluate((e) => { e.value = e.max; e.dispatchEvent(new Event('input')); });
      await r.evaluate((e) => { e.value = e.min; e.dispatchEvent(new Event('input')); });
    }
    for (const c of await p.$$('#det input[type=checkbox]')) await c.click();
    for (const s of await p.$$('#det select')) {
      const o = await s.$$eval('option', (x) => x.map((y) => y.value));
      await s.selectOption(o[0]);
    }
    const d = await p.evaluate(() => {
      const e = document.getElementById('det');
      return e.scrollWidth - e.clientWidth;
    });
    if (d > 0) {
      fallos++;
      console.log(`${w}: ${id} desborde horizontal ${d}px`);
    }
    if (png) {
      await p.waitForTimeout(450);
      await p.screenshot({ path: `${png}/i_${w}_${id}.png`, fullPage: false });
    }
    await p.keyboard.press('Escape');
  }
  await p.close();
}
await nav.close();
console.log('errores de consola:', errores.length, errores.slice(0, 5).join(' | '), '· desbordes:', fallos);
