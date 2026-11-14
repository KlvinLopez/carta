// Prueba el interactivo con Chromium: consola, desbordes en tres tamaños y cada interacción cambia lo que debe.
// Uso: node verificar.mjs [--png=carpeta]   (necesita `playwright`; en este repositorio, el de frontend/)
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), '../../../frontend/package.json'));
const { chromium } = require('playwright');
const aqui = dirname(fileURLToPath(import.meta.url));
const png = process.argv.find((a) => a.startsWith('--png='))?.slice(6);
const url = pathToFileURL(resolve(aqui, 'interactivo.html')).href + '?nointro';
const nav = await chromium.launch();
const errores = [];
let fallos = 0;
const ok = (c, msg) => { if (!c) { fallos++; console.log('FALLA:', msg); } else console.log('ok:', msg); };
async function nueva(w, h) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  p.on('console', (m) => m.type() === 'error' && errores.push(`${w}: ${m.text()}`));
  p.on("pageerror", (e) => errores.push(`${w}: ${String(e.stack).split("\n").slice(0, 3).join(" | ")}`));
  await p.goto(url);
  await p.evaluate(() => document.fonts.ready);
  return p;
}
const texto = (p, sel) => p.$eval(sel, (e) => e.textContent);
const contraste = async (p, etiqueta) => {
  const malos = await p.evaluate(() => {
    const lum = (c) => { const m = c.match(/[\d.]+/g); if (!m) return null; const [r, g, b, a = 1] = m.map(Number); return a === 0 ? null : (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
    const out = [];
    document.querySelectorAll('svg text').forEach((t) => {
      if (!/^rgb\(255, 255, 255\)/.test(getComputedStyle(t).fill)) return;
      const r = t.getBoundingClientRect(); if (!r.width || +getComputedStyle(t).opacity < 0.5) return;
      for (const e of document.elementsFromPoint(r.x + r.width / 2, r.y + r.height / 2)) {
        if (e === t || e.tagName === 'text') continue;
        if (!e.closest('svg') || e.tagName === 'svg') break;
        const l = lum(getComputedStyle(e).fill); if (l == null) continue;
        if (l > 0.6) out.push(`${t.textContent.slice(0, 24)} sobre ${getComputedStyle(e).fill}`);
        break;
      }
    });
    return out;
  });
  ok(malos.length === 0, `${etiqueta}: sin texto blanco sobre fondo claro ${malos.slice(0, 3).join(' | ')}`);
};
const abre = async (p, id) => { await p.click(`.box[data-id="${id}"]`); await p.waitForTimeout(450); await contraste(p, 'contraste ' + id); };
const cierra = async (p) => { await p.click('#det [data-cierra]'); await p.waitForTimeout(100); };
const sinDesborde = async (p, etiqueta) => {
  const d = await p.evaluate(() => { const e = document.getElementById('det'); return [document.documentElement.scrollWidth - innerWidth, e.hidden ? 0 : e.scrollWidth - e.clientWidth]; });
  ok(d[0] <= 0 && d[1] <= 0, `${etiqueta}: sin desborde horizontal (${d.join(', ')})`);
};

// ---------- escritorio: cada interacción ----------
const p = await nueva(1440, 900);
await sinDesborde(p, '1440 portada'); await contraste(p, 'contraste portada');
if (png) await p.screenshot({ path: `${png}/v5_portada.png` });
// los tres escenarios se ven a la vez, sin barra de filtros
ok(!(await p.$('#esc')), 'no hay barra de escenario');
ok((await p.$$('.kpi .tri .p')).length >= 3 && (await p.$$('.kpi .tri .m')).length >= 3, 'cada cifra muestra peor (rojo) y mejor (verde) al lado');
const rec0 = await texto(p, '.kpi[data-kpi="margen"] b');
ok((await texto(p, '.kpi[data-kpi="margen"] .p')) !== (await texto(p, '.kpi[data-kpi="margen"] .m')), 'peor y mejor difieren en el margen');
const cr = await p.$eval('#grid .box.rec', (e) => { const r = e.getBoundingClientRect(); return [r.top, r.bottom, innerHeight]; });
ok(cr[1] <= cr[2], `Recomendaciones se ve sin bajar (${Math.round(cr[1])} de ${cr[2]})`);
// cada cifra de arriba se abre
for (const k of ['potenciales', 'caben', 'sostiene', 'anuncios', 'ingreso', 'margen']) {
  await p.click(`.kpi[data-kpi="${k}"]`); await p.waitForTimeout(250);
  ok((await p.$$('#det .cuenta .v')).length > 3, `cifra «${k}» abre su cuenta`);
  await cierra(p);
}
// ¿en línea?
await abre(p, 'linea');
const t0 = await texto(p, '#svLinea');
await p.hover('#svLinea [data-i="3"]'); await p.waitForTimeout(500);
ok((await texto(p, '#svLinea')) !== t0, 'línea: pasar el cursor por un tamaño cambia su ejemplo y sus números');
ok(!(await texto(p, '#svLinea')).includes('toca un tamaño'), 'línea: sin texto de instrucciones');
if (png) await p.screenshot({ path: `${png}/v5_linea.png` });
await sinDesborde(p, 'línea'); await cierra(p);
// mercado
await abre(p, 'mercado');
const m0 = await texto(p, '#svMer');
await p.click('#svMer [data-paso="2"]'); await p.waitForTimeout(700);
ok((await texto(p, '#svMer')) !== m0, 'mercado: tocar un paso parte la barra');
await p.click('#svMer [data-paso="3"]'); await p.waitForTimeout(500);
ok((await texto(p, '#svMer')).includes('300'), 'mercado: el último paso llega a la meta de 300');
await p.click('#svMer [data-seg="d"]'); await p.waitForTimeout(300);
ok((await texto(p, '#svMer')).includes('El resto del mercado'), 'mercado: tocar un tramo muestra su ejemplo y su número');
if (png) await p.screenshot({ path: `${png}/v8_mercado.png` });
await sinDesborde(p, 'mercado'); await cierra(p);
// matriz interactiva
await abre(p, 'matriz');
const fila0 = async () => p.$eval('#svMx text[font-weight="700"]', (e) => e.textContent).catch(() => '');
const ys = () => p.$$eval('#svMx text.rm', (els) => els.filter((e) => /Business|Avanzado|Advanced|Premium|Starter|Lite|Plan 0|gratis/.test(e.textContent)).map((e) => [e.textContent, e.style.transform]));
const antes = JSON.stringify(await ys());
await p.hover('#svMx [data-fn="2"]'); await p.waitForTimeout(250);
ok(await p.isVisible('#fnCard'), 'matriz: pasar por una columna muestra el dibujo de la función');
await p.click('#svMx [data-a="ord:precio"]'); await p.waitForTimeout(600);
const orden1 = JSON.stringify(await ys());
ok(orden1 !== antes, 'matriz: tocar «Precio» invierte el orden por defecto (por precio)');
await p.click('#svMx [data-a="ord:2"]'); await p.waitForTimeout(600);
ok(JSON.stringify(await ys()) !== orden1, 'matriz: ordenar por una función reordena las filas');
await p.click('#svMx [data-a="ord:cob"]'); await p.waitForTimeout(500);
await p.click('#svMx [data-a="fila:0"]'); await p.waitForTimeout(500);
ok((await p.$$('#oc [data-rest^="fila"]')).length === 1, 'matriz: ocultar una fila la manda a «restaurar»');
await p.click('#svMx [data-a="col:5"]'); await p.waitForTimeout(500);
ok((await p.$$('#oc [data-rest^="col"]')).length === 1, 'matriz: ocultar una columna');
await p.click('#svMx [data-a="precio:x"]'); await p.waitForTimeout(500);
ok((await p.$$('#oc [data-rest="precio:x"]')).length === 1, 'matriz: ocultar el precio');
if (png) await p.screenshot({ path: `${png}/v5_matriz.png` });
await p.click('#oc [data-rest="todo:x"]'); await p.waitForTimeout(500);
ok((await p.$$('#oc [data-rest]')).length === 0, 'matriz: restablecer');
await sinDesborde(p, 'matriz'); await cierra(p);
// disco
await abre(p, 'disco');
await p.click('#svD [data-paso="2"]'); await p.waitForTimeout(400);
ok(await p.isVisible('#ctl'), 'disco: el tercer paso muestra las palancas');
const c0 = await texto(p, '#cif .cifra b');
await p.click('#srv [data-s="0"]'); await p.waitForTimeout(500);
const c1 = await texto(p, '#cif .cifra b');
ok(c1 !== c0, `disco: cambiar a Hobby cambia cuántos caben (${c0} → ${c1})`);
await p.click('#pals [data-ma="0.23"]'); await p.waitForTimeout(500);
ok((await texto(p, '#cif .cifra b')) !== c1, 'disco: activar palancas cambia cuántos caben');
ok(/disco|procesador|conexiones/.test(await texto(p, '#ins')), 'disco: dice el cuello de botella');
if (png) await p.screenshot({ path: `${png}/v5_disco.png` });
await sinDesborde(p, 'disco'); await cierra(p);
// topes: arrastre con teclado y con puntero
await abre(p, 'topes');
const e0 = await texto(p, '#cif .cifra:nth-child(5) b');
await p.focus('#svT circle[aria-label="Tope de platillos"]'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(500);
const e1 = await texto(p, '#cif .cifra:nth-child(5) b');
ok(e1 !== e0, `topes: bajar el tope de platillos cambia a quién empuja (${e0} → ${e1})`);
const box = await p.$eval('#svT circle[aria-label="Tope de mesas"]', (e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
await p.mouse.move(box[0], box[1]); await p.mouse.down(); await p.mouse.move(box[0] + 150, box[1], {steps: 6}); await p.mouse.up(); await p.waitForTimeout(500);
ok((await p.evaluate(() => S.topeMesas)) > 25, 'topes: arrastrar el asa de mesas la mueve');
ok((await p.$$('#svT [id], #svT .rm')).length > 20 && (await texto(p, '#svT')).includes('Chef Ejecutivo'), 'topes: muestra a qué plan cae cada tamaño');
if (png) await p.screenshot({ path: `${png}/v5_topes.png` });
await sinDesborde(p, 'topes'); await cierra(p);
// precio frente a la competencia
await abre(p, 'precio');
const pr0 = await p.evaluate(() => S.precioServicio);
await p.focus('#svP circle[aria-label="Precio Master Chef"]'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400);
ok((await p.evaluate(() => S.precioServicio)) > pr0, 'precio: las flechas mueven el precio de Servicio');
await p.evaluate(() => { document.querySelector('#masP').open = true; });
await p.click('#sus [data-sus="Meniu Business"]'); await p.click('#sus [data-regla]'); await p.waitForTimeout(400);
ok((await p.evaluate(() => S.precioServicio)) > 49, 'precio: la regla de Meniu pone un precio');
ok((await texto(p, '#svP')).includes('referencia de Master Chef'), 'precio: marca a Meniu como referencia de Master Chef');
await p.evaluate(() => { const r = document.querySelector('[data-cc="cMed"]'); r.value = 400; r.dispatchEvent(new Event('input', {bubbles: true})); });
await p.waitForTimeout(300);
ok((await p.evaluate(() => S.cMed)) === 400, 'precio: el control de la mediana de la curva cambia el supuesto');
ok(!(await texto(p, '#svP')).includes('meseta'), 'precio: sin la banda de la meseta');
ok((await p.$$('#inegi .ing')).length === 4, 'precio: muestra el precio como parte del ingreso (INEGI)');
await p.click('#cvs [data-cvr]'); await p.waitForTimeout(200);
await p.click('#svP [data-prov]'); await p.waitForTimeout(400);
ok((await p.$$('#ocp [data-rp]')).length >= 1, 'precio: ocultar un proveedor');
if (png) await p.screenshot({ path: `${png}/v5_precio.png` });
await sinDesborde(p, 'precio'); await cierra(p);
// sostiene: cuatro vistas
await p.evaluate(() => cambiar({...BASE})); await abre(p, 'sostiene');
const k0 = await texto(p, '#svK');
await p.focus('#hN'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300);
ok((await texto(p, '#svK')) !== k0, 'sostiene: mover el deslizador cambia comensales y costo');
await p.click('#bolsaK [data-bolsa="2000"]'); await p.waitForTimeout(300);
ok((await p.evaluate(() => S.bolsa)) === 2000, 'sostiene: la bolsa cambia cuántos caben');
if (png) await p.screenshot({ path: `${png}/v8_sost0.png` });
await p.click('#tabsK [data-vista="1"]'); await p.waitForTimeout(400);
ok((await texto(p, '#svK')).includes('⚑'), 'sostiene: el crecimiento trae banderas');
await p.click('#svK [data-nivel="alto"]'); await p.waitForTimeout(300);
ok((await texto(p, '#svK')).includes('procesador') || (await texto(p, '#svK')).includes('Pro'), 'sostiene: el nivel alto muestra saltos de escalón');
if (png) await p.screenshot({ path: `${png}/v8_sost1.png` });
await p.click('#tabsK [data-vista="2"]'); await p.waitForTimeout(400);
ok((await texto(p, '#svK')).includes('cada 100'), 'sostiene: a dónde se va cada 100 pesos');
if (png) await p.screenshot({ path: `${png}/v8_sost2.png` });
await p.click('#tabsK [data-vista="3"]'); await p.waitForTimeout(400);
ok((await p.$$('#svK [data-tip]')).length >= 6, 'sostiene: «qué hay que medir primero» con una frase por barra');
if (png) await p.screenshot({ path: `${png}/v8_sostiene.png`, fullPage: true });
await p.click('#tabsK [data-vista="4"]'); await p.waitForTimeout(1300);
ok((await texto(p, '#svK')).includes('−$47') && (await texto(p, '#svK')).includes('$32,655'), 'sostiene: la matriz 3 × 3 da −47 y +32,655 en las esquinas');
if (png) await p.screenshot({ path: `${png}/v8_sost4.png` });
await sinDesborde(p, 'sostiene'); await cierra(p);
// cuánto puede pagar
await abre(p, 'pagar');
ok((await p.$$('#svG .gh')).length >= 6, 'pagar: una imagen con punto de venta y Carta por tamaño');
if (png) await p.screenshot({ path: `${png}/v8_pagar.png` });
await sinDesborde(p, 'pagar'); await cierra(p);
// recomendaciones
await abre(p, 'recomendaciones');
await p.click('[data-mas="segmentacion"]'); await p.waitForTimeout(150);
await p.click('#r_segmentacion .opcion:not(.rec) .btn'); await p.waitForTimeout(300);
ok((await p.evaluate(() => S.topeMesas)) === 12, 'recomendaciones: «Probar esta» aplica 12 mesas');
await p.click('#r_segmentacion .acc2 [data-aplica]'); await p.waitForTimeout(300);
ok((await p.evaluate(() => S.topeMesas)) === 25, 'recomendaciones: aplicar lo recomendado (25 mesas)');
if (png) await p.screenshot({ path: `${png}/v5_recs.png` });
await sinDesborde(p, 'recomendaciones');
// persistencia del escenario que se edita dentro de cada detalle
await p.reload(); await p.waitForTimeout(400);
ok((await p.evaluate(() => S.topeMesas)) === 25, 'lo editado dentro del detalle persiste al recargar');
await p.evaluate(() => localStorage.clear());
// presentación
await p.goto(url.replace('?nointro', '')); await p.waitForTimeout(500);
ok(await p.isVisible('#intro'), 'la presentación abre la primera vez');
await p.waitForTimeout(1500);
const t1 = await p.evaluate(() => tI);
await p.click('[data-intro="mas"]'); await p.waitForTimeout(100);
ok((await p.evaluate(() => tI)) - t1 >= 2900, 'presentación: +3 s adelanta');
await p.click('[data-intro="menos"]'); await p.waitForTimeout(100);
ok((await p.evaluate(() => tI)) < t1 + 2000, 'presentación: −3 s atrasa');
await p.click('[data-intro="pausa"]'); const tp = await p.evaluate(() => tI); await p.waitForTimeout(400);
ok((await p.evaluate(() => tI)) === tp, 'presentación: la pausa detiene el tiempo');
if (png) { await p.evaluate(() => { pausaI = true; }); for (const [i, ms] of [[1, 3300], [2, 8000], [3, 14500], [4, 19500], [5, 25500]]) { await p.evaluate((t) => { tI = t; pintaIntro(); }, ms); await p.waitForTimeout(100); await p.screenshot({ path: `${png}/v8_intro${i}.png` }); } }
await p.click('[data-intro="saltar"]'); await p.waitForTimeout(200);
ok(!(await p.isVisible('#intro')), 'la presentación se puede saltar');
await p.reload(); await p.waitForTimeout(400);
ok(!(await p.isVisible('#intro')), 'la presentación no se repite sola');
await p.close();

// ---------- otros tamaños: sin desborde y cada caja abre ----------
for (const [w, h] of [[1280, 720], [400, 860]]) {
  const q = await nueva(w, h);
  await sinDesborde(q, `${w} portada`);
  if (png) await q.screenshot({ path: `${png}/v5_${w}_portada.png`, fullPage: w < 600 });
  const ids = await q.$$eval('.box', (b) => b.map((x) => x.dataset.id));
  for (const id of ids) {
    await q.click(`.box[data-id="${id}"]`); await q.waitForTimeout(300);
    await sinDesborde(q, `${w} ${id}`);
    if (png && w < 600) await q.screenshot({ path: `${png}/v5_${w}_${id}.png` });
    await q.click('#det [data-cierra]');
  }
  await q.close();
}
await nav.close();
console.log('errores de consola:', errores.length, errores.slice(0, 6).join(' | '), '· fallas:', fallos);
process.exit(fallos || errores.length ? 1 : 0);
