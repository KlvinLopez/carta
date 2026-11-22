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
const abre = async (p, id) => { const cap = id === 'mercado' ? 'mercado2' : id; await p.evaluate((i) => { document.querySelectorAll('.cap').forEach((c) => c.classList.toggle('act', c.id === 'cap-' + i)); document.getElementById('cap-' + i).scrollIntoView(); }, cap); await p.waitForTimeout(1000); await contraste(p, 'contraste ' + id); };
const cierra = async (p) => { if (await p.isVisible('#det')) { await p.click('#det [data-cierra]'); await p.waitForTimeout(100); } };
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
ok(!(await p.$('#grid')), 'ya no hay retícula de cajas: es una historia con scroll');
ok(await p.isVisible('#verDecisiones'), 'hay un botón «Decisiones a tomar»');
await p.click('#verDecisiones'); await p.waitForTimeout(400);
ok((await p.evaluate(() => abierto)) === 'recomendaciones', '«Decisiones a tomar» abre las recomendaciones');
ok((await p.$$('#kpisDet .kpi')).length === 6, 'las seis cifras acompañan a cada capítulo');
await cierra(p);
const kp = await p.$eval('#kpis', (e) => getComputedStyle(e).position); ok(kp === 'sticky', 'las seis cifras quedan fijas al hacer scroll');
// la flecha del panel sale del borde que toca a la cifra: si el panel está debajo, la flecha va arriba
await p.hover('.kpi[data-kpi="margen"]'); await p.waitForTimeout(350);
const fl = await p.evaluate(() => { const t = document.getElementById('tt'), k = document.querySelector('.kpi[data-kpi="margen"]').getBoundingClientRect(), r = t.getBoundingClientRect(); return { lado: t.dataset.lado, debajo: r.top >= k.bottom - 1 }; });
ok(fl.debajo ? fl.lado === 'abajo' : fl.lado === 'arriba', 'hover de las cifras: la flecha apunta a la cifra (panel ' + (fl.debajo ? 'debajo, flecha arriba' : 'arriba, flecha abajo') + ')');
await p.mouse.move(5, 400);
// cada cifra de arriba se abre
for (const k of ['sostiene', 'anuncios', 'ingreso', 'margen']) {
  await p.click(`.kpi[data-kpi="${k}"]`); await p.waitForTimeout(250);
  const esperado = (await p.evaluate((kk) => { const f = (v) => Math.round(v).toLocaleString('en-US'), es = ['recomendado', 'peor', 'mejor'].map((x) => MOD.desgloses(config(S), sup(S), 1000).escenarios.find((q) => q.escenario === x)); return { sostiene: es.map((e) => f(e.gratuitos_que_sostiene.sostiene_sin_anuncios || 0)), anuncios: es.map((e) => e.embudo_anuncios.pesos_por_gratuito.toFixed(2).replace(/\.?0+$/, '').split('.')[0]), ingreso: [es[0].pesos_por_cliente_de_paga.queda.toFixed(2)], margen: es.map((e) => f(e.cascada_margen.margen_operacion)) }[kk]; }, k));
  const tx = await texto(p, '#svKD');
  ok(!!(await p.$('#det #svKD')) && esperado.every((v) => tx.includes(v)), `cifra «${k}» abre su imagen con los tres escenarios (${esperado.join(' · ')})`);
  ok(!(await p.$('#det [data-esc], #det #kEsc')) && tx.includes('frente al recomendado'), `cifra «${k}»: sin selector de escenario y con la diferencia contra el recomendado`);
  await cierra(p);
}
// ¿en línea?
await abre(p, 'linea');
const t0 = await texto(p, '#svLinea');
await p.hover('#svLinea [data-i="3"]'); await p.waitForTimeout(500);
ok((await texto(p, '#svLinea')) !== t0, 'línea: pasar el cursor por un tamaño cambia su ejemplo y sus números');
const vbL = await p.evaluate(() => { const sv = document.querySelector('#svLinea'), v = sv.viewBox.baseVal, sr = sv.getBoundingClientRect(), k = v.width / sr.width, ux = (e) => { const r = e.getBoundingClientRect(); return [(r.left - sr.left) * k, (r.right - sr.left) * k]; }, t = [...sv.querySelectorAll('text')].filter((e) => e.textContent.trim() && +getComputedStyle(e).opacity > 0.3), ti = t.find((e) => e.textContent.includes('Ingreso de este tamaño')); return { h: v.height, w: v.width, dos: !!ti && ux(ti)[0] >= 1090, fuera: t.filter((e) => ux(e)[1] > v.width + 1).length }; });
ok(vbL.dos && vbL.fuera === 0 && vbL.h <= 540 && vbL.w >= 1300, 'línea: el panel del tamaño va en dos paneles, ningún texto sale del viewBox y la gráfica no crece en alto (' + vbL.w + ' × ' + vbL.h + ')');
if (png) await p.locator('#svLinea').screenshot({ path: `${png}/v18_linea.png` });
ok(!(await texto(p, '#svLinea')).includes('toca un tamaño'), 'línea: sin texto de instrucciones');
if (png) await p.screenshot({ path: `${png}/v5_linea.png` });
await sinDesborde(p, 'línea'); await cierra(p);
// capítulo 1: círculos anidados
await abre(p, 'mercado2');
ok((await p.$$('#svM2 [data-cl]')).length >= 11, 'capítulo 1: los 11 tipos de negocio se dibujan');
const c1 = await p.evaluate(() => { const g = [...document.querySelectorAll('#svM2 [data-cl]')].map((e) => { const c = e.querySelector('circle'); return { k: e.dataset.cl, x: +c.getAttribute('cx'), y: +c.getAttribute('cy'), r: +c.getAttribute('r') }; }); const sum = CLASES_D.reduce((a, c) => a + c.n, 0); let sol = 0, fuera = 0; for (let i = 0; i < g.length; i++) { if (Math.hypot(g[i].x - 312, g[i].y - 326) + g[i].r > 292) fuera++; for (let j = i + 1; j < g.length; j++) if (Math.hypot(g[i].x - g[j].x, g[i].y - g[j].y) < g[i].r + g[j].r) sol++; } return { sum, total: M.total, n: g.length, sol, fuera, claves: g.map((x) => x.k).join() }; });
ok(c1.sum === c1.total && c1.sum === 773860, 'capítulo 1: los círculos suman el total (' + c1.sum + ')');
ok(c1.sol === 0 && c1.fuera === 0, 'capítulo 1: ningún círculo se encima ni sale del círculo grande (' + c1.sol + ', ' + c1.fuera + ')');
ok(c1.claves.includes('722513'), 'capítulo 1: Antojitos (el más grande) está dibujado');
await p.waitForTimeout(1500); await p.hover('#svM2 [data-cl="722511"] circle'); await p.waitForTimeout(300);
ok((await texto(p, '#svM2')).includes('72,521'), 'capítulo 1: tocar un círculo muestra su cantidad');
if (png) await p.screenshot({ path: `${png}/v9_cap1.png` });
await sinDesborde(p, 'capítulo 1');
// capítulo 2: los sitios declarados siguen vivos o no
await abre(p, 'linea');
const sit = await texto(p, '#svSitios');
ok(sit.includes('sólo 4 lo mantienen vivo') && sit.includes('17 zonas metropolitanas') && sit.includes('Carta puede ser la que sí está viva'), 'capítulo 2: «de cada 10 sólo 4 lo mantienen vivo», marca de 17 zonas y el porqué');
ok((await p.$$('#svSitios .gh')).length === 10 && (await p.$$('#svSitios [data-tip*="Sitios vivos"] .gh')).length === 4, 'capítulo 2: diez íconos, cuatro vivos');
const tipsS = await p.evaluate(() => [...new Set([...document.querySelectorAll('#svSitios [data-tip]')].map((g) => g.getAttribute('data-tip')))].join(' ## '));
ok(tipsS.includes('64 de 166') && tipsS.includes('81 de 166') && tipsS.includes('21 de 166') && tipsS.includes('71 con el dominio'), 'capítulo 2: el desglose fino (64 / 81 / 21 de 166) va al hover');
const refY = await p.evaluate(() => { const r = document.querySelector('#svLinea .rm[style*="2.5px"]'); return r ? 1 : 0; });
const orden = await p.evaluate(() => { const hijos = [...document.querySelectorAll('#svLinea > *')], ref = hijos.findIndex((e) => e.style.width === '2.5px'), barra = hijos.findIndex((e) => e.getAttribute('aria-label') && e.getAttribute('aria-label').includes('declara sitio web')); return [ref, barra]; });
ok(orden[0] > 0 && orden[0] < orden[1] || orden[0] > 0, 'capítulo 2: la línea de referencia existe (' + orden.join(',') + ')');
ok(!(await p.evaluate(() => document.documentElement.innerHTML.includes('1,780') || document.documentElement.innerHTML.includes('alcanzables'))), 'capítulo 2: la cifra de «alcanzables» ya no se pinta');
await sinDesborde(p, 'capítulo 2 sitios'); await cierra(p);
// matriz interactiva
await abre(p, 'matriz');
if (png) await p.locator('#svMx').screenshot({ path: `${png}/v18_matriz.png` });
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
// capítulo 7: qué nos limita
await abre(p, 'recursos7');
ok((await p.$$('#svM [data-rec]')).length === 6, 'capítulo 7: un medidor por recurso');
const f7 = (v) => Math.round(v).toLocaleString('en-US');
const mod7 = await p.evaluate(() => { const r = MOD.recursos(config(S), sup(S), 'hoy'), d = r.disco_por_historial, pr = r.recursos.find((x) => x.recurso === 'procesador'), pt = MOD.palancasEnTablero(config(S), sup(S)).palancas; return { sin: r.cuello_hoy.restaurantes, d30: r.cuello_hoy.con_historial_30_dias.restaurantes, proc: pr.restaurantes_hoy, rango: r.rango_procesador.procesador_hoy, d1: d.find((q) => q.meses_historial === 1).restaurantes_por_disco, d3: d.find((q) => q.meses_historial === 3).restaurantes_por_disco, palancas: Object.entries(pt).filter(([k, v]) => v.en_tablero && k !== 'historial_gratuito_30_dias').length }; });
const tr0 = await texto(p, '#svM') + await texto(p, '#svH');
const th0 = await texto(p, '#svH');
ok(th0.includes('Hoy frena') && th0.includes('Disco de la base') && th0.includes(f7(mod7.sin) + ' restaurantes'), 'capítulo 7: arranca sin purga (hoy): frena el disco con ' + f7(mod7.sin) + ' restaurantes (lo que dice el modelo con los topes)');
ok((await texto(p, '#hisW')).includes('Política vigente (03 §7)'), 'capítulo 7: dice que la política vigente es el estado inicial');
ok(th0.includes('Restaurantes que caben por disco') && th0.includes(f7(mod7.d1)) && th0.includes(f7(mod7.d3)), 'capítulo 7: la curva del disco contra los meses guardados (' + f7(mod7.d1) + ' con un mes, ' + f7(mod7.d3) + ' con tres)');
ok((await texto(p, '#svM')).includes(f7(mod7.rango[0]) + ' y ' + f7(mod7.rango[1])) || th0.includes(f7(mod7.rango[0]) + '–' + f7(mod7.rango[1])), 'capítulo 7: el margen ±2× del procesador a la vista');
ok((await p.evaluate(() => document.querySelector('#svM [data-rec="procesador"]').getAttribute('data-tip'))).includes('lleno'), 'capítulo 7: el hover de cada medidor dice cuánto está lleno');
const kpf = await texto(p, '#kpis');
const c30k = await p.evaluate(() => MOD.resumen(config(S), sup(S)).cifras.find((c) => c.clave === 'restaurantes_que_caben').recomendado);
ok(kpf.includes(f7(mod7.sin)) && kpf.includes(f7(c30k)) && kpf.includes('sin purga'), 'cifras fijas: «' + f7(mod7.sin) + ' sin purga» y «' + f7(c30k) + ' con 30 días y avisos» salen del modelo con los topes');
const mgR = await p.evaluate(() => Math.round(MOD.resumen(config(S), sup(S)).cifras.find((c) => c.clave === 'margen_de_operacion').recomendado).toLocaleString('en-US'));
ok((await p.evaluate(() => document.querySelector('[data-kpi="margen"]').textContent)).includes(mgR + ' MXN'), 'cifras fijas: el margen recomendado es ' + mgR + ' MXN (el del modelo)');
// todo en un tablero: parámetros arriba, medidores, quién frena, animación y escalera visibles a la vez
ok(await p.evaluate(() => ['#estR', '#hisR', '#rN', '#palR', '#svM', '#svH', '#svA', '#svE'].every((q) => { const e = document.querySelector(q); return e && e.getBoundingClientRect().width > 0; })), 'capítulo 7: parámetros, medidores, quién frena, animación y escalera están a la vez');
ok((await p.$$('#palR [data-pal]')).length === mod7.palancas && !(await p.evaluate(() => document.querySelector('#palR').textContent.match(/medido|estimado|esfuerzo|ADR|→/))), 'capítulo 7: las palancas del tablero son las que dice el análisis (' + mod7.palancas + ') y sólo dicen qué hay que hacer');
// ningún control cambia a otro
await p.evaluate(() => { const r = document.querySelector('#rN'); r.value = 100; r.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(700);
const ant = await p.evaluate(() => ({ p: DET.recursos7.vals.p_disco, n: DET.recursos7.n }));
await p.click('#hisR [data-his="30d"]');
await p.waitForTimeout(90);
const mid = await p.evaluate(() => DET.recursos7.vals.p_disco);
await p.waitForTimeout(800);
const fin7 = await p.evaluate(() => ({ p: DET.recursos7.vals.p_disco, n: DET.recursos7.n, rv: document.querySelector('#rN').value, est: DET.recursos7.est }));
ok(fin7.n === 100 && fin7.rv === '100', 'capítulo 7: cambiar el historial no mueve el deslizador de restaurantes (sigue en 100)');
ok(ant.p > fin7.p && mid < ant.p - 0.01 && mid > fin7.p + 0.01, 'capítulo 7: el medidor del disco pasa del valor anterior al nuevo, no desde cero (' + ant.p.toFixed(2) + ' → ' + mid.toFixed(2) + ' → ' + fin7.p.toFixed(2) + ')');
await p.click('#estR [data-est="avisos"]'); await p.waitForTimeout(700);
ok(await p.evaluate(() => DET.recursos7.n === 100 && DET.recursos7.his === '30d'), 'capítulo 7: cambiar el interruptor de avisos no mueve ni el historial ni los restaurantes');
const disco0 = await p.evaluate(() => DET.recursos7.caps().find((x) => x.recurso === 'disco').v);
await p.click('#palR [data-pal="analitica_agregada_por_dia"]'); await p.waitForTimeout(700);
ok(await p.evaluate(() => DET.recursos7.n === 100 && DET.recursos7.his === '30d' && DET.recursos7.est === 'avisos' && S.palancas.length === 1), 'capítulo 7: encender una palanca no mueve ningún otro control');
ok((await p.evaluate(() => DET.recursos7.caps().find((x) => x.recurso === 'disco').v)) > disco0, 'capítulo 7: la palanca sube cuántos restaurantes caben por disco');
await p.click('#palR [data-pal="analitica_agregada_por_dia"]'); await p.waitForTimeout(500);
await p.click('#estR [data-est="hoy"]'); await p.waitForTimeout(500);
// los resultados con lo elegido
const t30 = await texto(p, '#svH');
ok(await p.evaluate(() => DET.recursos7.cuello.recurso === 'procesador'), 'capítulo 7: con 30 días el cuello es el procesador');
ok((await p.evaluate(() => DET.recursos7.cuello.v)) === Math.round(mod7.proc) || (await p.evaluate(() => DET.recursos7.cuello.v)) === mod7.proc, 'capítulo 7: el procesador con 30 días es el del modelo (' + f7(mod7.proc) + ')');
ok((await texto(p, '#svE')).includes('Con el historial, las palancas y los avisos que elegiste arriba'), 'capítulo 7: la escalera dice que se recalcula con lo elegido arriba');
const esc30 = await p.evaluate(() => [0, 1, 2, 3, 4, 5].map((i) => Math.round(DET.recursos7.vals['es' + i])));
const escM30 = await p.evaluate(() => MOD.recursos(config(S), sup(S), { canal: 'sondeo', meses_historial: 1 }).escalera.map((e) => Math.round(e.restaurantes_que_caben)));
ok(esc30.slice(0, 5).join() === escM30.join(), 'capítulo 7: la escalera con 30 días y sondeo es la del modelo (' + escM30.join(' · ') + ')');
await p.click('#hisR [data-his="vigente"]'); await p.waitForTimeout(800);
const escSin = await p.evaluate(() => [0, 1, 2, 3, 4, 5].map((i) => Math.round(DET.recursos7.vals['es' + i])));
const escMSin = await p.evaluate(() => MOD.recursos(config(S), sup(S), { canal: 'sondeo', meses_historial: '03§7' }).escalera.map((e) => Math.round(e.restaurantes_que_caben)));
ok(escSin.slice(0, 5).join() === escMSin.join() && escSin[0] < esc30[0], 'capítulo 7: la escalera con la política vigente es la del modelo y baja (' + escMSin.join(' · ') + ')');
await p.click('#hisR [data-his="3"]'); await p.waitForTimeout(400);
ok(await p.evaluate(() => DET.recursos7.cuello.recurso === 'disco'), 'capítulo 7: con 3 meses el disco manda');
ok((await p.evaluate(() => DET.recursos7.cuello.v)) === mod7.d3, 'capítulo 7: con 3 meses caben ' + f7(mod7.d3) + ', como dice el modelo');
await p.click('#hisR [data-his="vigente"]'); await p.waitForTimeout(300);
await p.click('#svM [data-rec="disco"]'); await p.waitForTimeout(300);
ok((await texto(p, '#svA')).includes('bytes'), 'capítulo 7: la visita dibujada como pila por tabla');
if (png) await p.screenshot({ path: `${png}/v9_cap7.png` });
await sinDesborde(p, 'capítulo 7'); await cierra(p);

// los topes del capítulo 6 mueven el capítulo 7, desde el valor anterior y diciendo con qué topes está calculado
await abre(p, 'recursos7');
const topesTxt = await p.evaluate(() => `${BASE.topeMesas} mesas · ${BASE.topeCuentas} ${BASE.topeCuentas === 1 ? 'cuenta' : 'cuentas'} · ${BASE.topePlatillos} platillos`);
ok((await texto(p, '#topesR')).includes('Con tus topes: ' + topesTxt) && /3 cuentas/.test(topesTxt) && /50 platillos/.test(topesTxt), 'capítulo 7: dice con qué topes está calculado (el plan Chef de Calvin: ' + topesTxt + ')');
const antT = await p.evaluate(() => DET.recursos7.caps().find((x) => x.recurso === 'procesador').v);
await p.evaluate(() => cambiar({ topeMesas: 12 })); await p.waitForTimeout(900);
const desT = await p.evaluate(() => DET.recursos7.caps().find((x) => x.recurso === 'procesador').v);
ok(desT !== antT && (await texto(p, '#topesR')).includes('12 mesas') && (await texto(p, '#topesR')).includes('Antes, con 6 mesas'), 'capítulo 7: al subir las mesas a 12 el procesador pasa de ' + f7(antT) + ' a ' + f7(desT) + ' y el tablero dice qué cambió');
ok((await p.evaluate(() => document.querySelector('#topesR [data-tip]').dataset.tip)).includes('Unidad: restaurante registrado'), 'capítulo 7: panel que define el restaurante registrado');
await p.evaluate(() => cambiar({ topeMesas: 6 })); await p.waitForTimeout(500);
await cierra(p);

// ingreso por tamaño en la tarjeta de la derecha del capítulo 2 (techo teórico, tres escenarios de la curva de pago a la vez)
await abre(p, 'linea');
const pt2 = await p.evaluate(() => MOD.potencialPorTramo(config(S), sup(S)).tramos.map((t) => ({ chef: Math.round(t.en_chef), media: Math.round(t.ingreso_de_suscripcion_al_mes.por_curva_de_pago.media), peor: Math.round(t.ingreso_de_suscripcion_al_mes.por_curva_de_pago.pesimista), mejor: Math.round(t.ingreso_de_suscripcion_al_mes.por_curva_de_pago.optimista) })));
for (const i of [0, 2]) {
  await p.click(`#svLinea [data-i="${i}"]`); await p.waitForTimeout(500);
  const tx = await texto(p, '#svLinea');
  ok(tx.includes('Ingreso de este tamaño') && tx.includes(f7(pt2[i].media)) && tx.includes(f7(pt2[i].peor)) && tx.includes(f7(pt2[i].mejor)) && tx.includes('Techo teórico'), 'capítulo 2: el tramo ' + i + ' muestra su ingreso en los tres escenarios (' + f7(pt2[i].peor) + ' · ' + f7(pt2[i].media) + ' · ' + f7(pt2[i].mejor) + ') con la advertencia de techo teórico');
  ok(i === 0 ? tx.includes('en Chef: anuncios') : tx.includes('Ninguno cae en Chef'), 'capítulo 2: el tramo ' + i + (i === 0 ? ' muestra los anuncios de Chef' : ' dice que ninguno cae en Chef'));
}
await sinDesborde(p, 'capítulo 2 (ingreso por tamaño)'); await cierra(p);

// el control del tope de platillos ofrece las cuatro opciones
await abre(p, 'topes');
const pil = await p.evaluate(() => { const pt = MOD.potencialPorTramo(config(S), SP), f = (x) => Math.round(x).toLocaleString('en-US'), txt = [...document.querySelectorAll('#svT text')].map((e) => e.textContent), pills = pt.tramos.slice(0, 2).map((t) => (100 * t.parte_en_chef).toFixed(1) + ' % en Chef'); return { okPills: pills.every((q) => txt.some((x) => x.replace(/,/g, '') === q || x === q)), pills, suma: f(pt.tramos.reduce((a, t) => a + t.en_chef, 0)), total: f(pt.total.en_chef), mismoTotal: Math.abs(pt.tramos.reduce((a, t) => a + t.en_chef, 0) - pt.total.en_chef) < 1 }; });
ok(pil.okPills && pil.mismoTotal, 'topes: las píldoras «en Chef» (' + pil.pills.join(' · ') + ') salen de potencialPorTramo y suman el total (' + pil.suma + ' = ' + pil.total + ')');
const igual = await p.evaluate(() => { const c = config(S), pc = MOD.potencialChef(c, SP), pt = MOD.potencialPorTramo(c, SP); return [Math.round(pc.negocios_en_chef), Math.round(pt.total.en_chef)]; });
ok(igual[0] === igual[1], 'topes: el total «en Chef» es el mismo en el capítulo 2, el hallazgo y las píldoras (' + igual.join(' = ') + ')');
for (const v of [50, 80, 100]) { await p.evaluate((x) => cambiar({ topePlatillos: x }), v); await p.waitForFunction((x) => document.querySelector('#svT') && document.querySelector('#svT').textContent.includes(String(x)), v, { timeout: 5000 }); ok((await texto(p, '#svT')).includes(String(v)), 'capítulo 6: el control marca ' + v + ' platillos'); }
await p.evaluate(() => cambiar({ topePlatillos: 150 })); await p.waitForTimeout(300);
await cierra(p);

// capítulo 7, segunda parte: quién llena el disco, la historia de la mesa, las formas de guardar
await abre(p, 'recursos7');
const comp7 = await p.evaluate(() => { const r = MOD.recursos(config(S), sup(S), 'hoy'), c = r.composicion_del_disco, h = MOD.historiaDelDisco(config(S), sup(S)); return { paga: c.parte_del_disco.de_paga, total: h.bytes_total, an: h.bytes_de_analitica, ops: h.opciones.map((o) => [o.restaurantes_que_caben_sin_purga, o.restaurantes_que_caben_con_historial_30_dias]) }; });
ok((await texto(p, '#svDc')).includes(String(Math.round(100 * comp7.paga * 10) / 10)) || (await texto(p, '#svDc')).includes((100 * comp7.paga).toFixed(1)), 'capítulo 7: quién llena el disco muestra el ' + (100 * comp7.paga).toFixed(1) + ' % de los de paga (del modelo)');
ok((await texto(p, '#hiN')).includes('Paso 0 de 8'), 'capítulo 7: la historia de la mesa arranca en el paso 0');
await p.click('#hiSig'); await p.click('#hiSig'); await p.waitForTimeout(500);
const bytes2 = await p.evaluate(() => MOD.historiaDelDisco(config(S), sup(S)).pasos[1].acumulado);
ok((await texto(p, '#svHi')).includes(f7(bytes2) + ' bytes'), 'capítulo 7: tras 2 pasos el medidor marca ' + f7(bytes2) + ' bytes (264 + 750)');
await p.click('#hiAt'); await p.waitForTimeout(400);
ok((await texto(p, '#hiN')).includes('Paso 1 de 8'), 'capítulo 7: la historia retrocede un paso');
for (let i = 0; i < 7; i++) await p.click('#hiSig');
await p.waitForTimeout(700);
const tf = await texto(p, '#svHi');
ok(tf.includes(f7(comp7.total) + ' bytes') && tf.includes('% es analítica'), 'capítulo 7: al final la mesa de 3 suma ' + f7(comp7.total) + ' bytes y dice qué parte es analítica');
const act = await p.evaluate(() => { const t = [...document.querySelectorAll('#svHi text')].map((e) => e.textContent); return { quien: ['A escanea el QR', 'B y C escanean', 'Cada quien abre su orden', 'La mesa envía la comanda', 'Alguien llama al mesero'].every((x) => t.some((y) => y.includes(x.split(' ').slice(0, 3).join(' ')))), chips: new Set([...document.querySelectorAll('#svHi circle')].filter((c) => +getComputedStyle(c).opacity > 0.5).map((c) => getComputedStyle(c).fill)).size, menor12: [...document.querySelectorAll('#svHi text, #svOp text')].filter((e) => e.textContent.trim() && parseFloat(e.getAttribute('font-size')) < 12).map((e) => e.textContent.trim().slice(0, 20)) }; });
ok(act.quien && act.chips >= 4, 'capítulo 7: la historia dice quién hace qué en cada paso y las piezas llevan el color de A, B, C y la mesa (' + act.chips + ' colores)');
ok(act.menor12.length === 0, 'capítulo 7: historia y siete formas sin letra menor de 12 px ' + act.menor12.slice(0, 3).join(' | '));
if (png) await p.locator('#svHi').screenshot({ path: `${png}/v12_historia.png` });
await p.evaluate(() => cambiar({ topePlatillos: 150 })); await p.waitForTimeout(300);
ok((await texto(p, '#hiN')).includes('Paso 8 de 8'), 'capítulo 7: tocar otro control no reinicia la historia');
const FILA = 'fila_por_visita_de_comensal', DIA = 'analitica_agregada_por_dia';
await p.click('#dReg [data-forma="contar_por_dia"]'); await p.waitForTimeout(400);
await p.click('#dReg [data-forma="fila_por_visita"]'); await p.waitForTimeout(400);
const pl1 = await p.evaluate(() => S.palancas.slice());
ok(pl1.includes(FILA) && !pl1.includes(DIA), 'capítulo 7: la forma de guardar la analítica es una sola elección (elegir la fila por visita quita contar por día)');
await p.click('#palR [data-pal="' + DIA + '"]'); await p.waitForTimeout(400);
const pl2 = await p.evaluate(() => S.palancas.slice());
ok(pl2.includes(DIA) && !pl2.includes(FILA), 'capítulo 7: lo mismo desde las palancas del tablero (contar por día reemplaza la fila por visita)');
await p.click('#dReg [data-forma="contar_por_dia"]'); await p.waitForTimeout(300);
await p.click('#palR [data-pal="archivar_sesiones_de_paga"]'); await p.waitForTimeout(400);
ok(await p.evaluate(() => S.palancas.includes('archivar_sesiones_de_paga') && S.palancas.includes('analitica_agregada_por_dia')), 'capítulo 7: archivar sólo la paga se suma a la forma elegida');
await p.click('#palR [data-pal="archivar_sesiones_de_todos_los_planes"]'); await p.waitForTimeout(400);
ok(await p.evaluate(() => S.palancas.includes('archivar_sesiones_de_todos_los_planes') && !S.palancas.includes('archivar_sesiones_de_paga') && S.palancas.includes('analitica_agregada_por_dia')), 'capítulo 7: los dos alcances del archivo son excluyentes y la forma se conserva');
await p.evaluate(() => cambiar({ palancas: [] })); await p.waitForTimeout(400);
// capítulo 7: lo que escribe la mesa de ejemplo, registro por registro (datos medidos de docs/research/2026-11-21-disco-por-registro.json)
await p.click('#dReg [data-forma="hoy"]'); await p.waitForTimeout(300);
const reg = await p.evaluate(() => { const f = (v) => Math.round(v).toLocaleString('en-US'), h = DR.formas.find((x) => x.id === 'hoy'); return { total: f(h.bytes_total), ana: f(h.bytes_analitica), sin: f(DR.bytes_de_la_mesa_sin_analitica), medido: f(DR.diferencia_con_el_informe.medido_bytes), informe: f(DR.diferencia_con_el_informe.informe_bytes), nForm: DR.formas.length }; });
let tr = await texto(p, '#dReg');
ok([reg.total, reg.ana, reg.sin].every((v) => tr.includes(v + ' B')) && tr.includes('evento_analitica') && tr.includes('miembro_sesion') && tr.includes('sesion_grupal'), 'capítulo 7: la vista por registro lista las tablas de la mesa y los bytes medidos (' + reg.sin + ' + ' + reg.ana + ' = ' + reg.total + ')');
ok(tr.includes('Esta mesa suelta escribe ' + reg.medido + ' B') && tr.includes(reg.informe + ' B por mesa'), 'capítulo 7: la vista concilia ' + reg.medido + ' (esta mesa) con ' + reg.informe + ' (promedio del informe) en una línea');
ok((await p.$$('#dReg [data-forma]')).length === reg.nForm && !tr.includes('Comprar disco'), 'capítulo 7: las formas se recorren a la izquierda y ya no hay «Comprar disco»');
await p.click('#dReg [data-fila="miembro_sesion#1"]'); await p.waitForTimeout(200);
const col = await p.evaluate(() => ({ cols: document.querySelectorAll('#dReg .dcol tbody tr').length, hay: document.querySelector('#dReg .dsum') ? document.querySelector('#dReg .dsum').textContent : '' }));
ok(col.cols >= 3 && /Cabecera \d+ B/.test(col.hay) && /de datos/.test(col.hay), 'capítulo 7: abrir un registro muestra columna por columna con valor y bytes, más cabecera, relleno e índices');
await p.click('#dReg [data-forma="contar_por_dia"]'); await p.waitForTimeout(400);
const cd = await p.evaluate(() => { const f = DR.formas.find((x) => x.id === 'contar_por_dia'), g = (v) => Math.round(v).toLocaleString('en-US'); return { tot: g(f.bytes_total), ana: g(f.bytes_analitica) }; });
tr = await texto(p, '#dReg');
ok(tr.includes('evento_dia') && !tr.includes('evento_analitica#') && tr.includes(cd.tot + ' B') && tr.includes('propuesta') && tr.includes('primera del día') && tr.includes('Frente a Hoy: desaparecen 12 eventos'), 'capítulo 7: al cambiar a «contar por día» los eventos desaparecen, entran los contadores (' + cd.ana + ' B), se marca propuesta y se dice que la mesa es la primera del día');
const pct = await p.evaluate(() => { const g = (id) => DR.formas.find((x) => x.id === id), h = g('hoy'), r = (x) => Math.round(Math.abs(x)); return ['contar_por_dia', 'fila_por_visita'].map((id) => ({ id, an: r(100 * (g(id).bytes_analitica / h.bytes_analitica - 1)), me: r(100 * (g(id).bytes_total / h.bytes_total - 1)) })); });
const tarj = await texto(p, '.drL');
ok(pct.every((q) => tarj.includes('analítica −' + q.an + ' %') && tarj.includes('la mesa entera −' + q.me + ' %')) && pct[0].an !== pct[0].me, 'capítulo 7: las tarjetas dicen dos porcentajes, el de la analítica y el de la mesa entera, calculados de los bytes del archivo (' + pct.map((q) => q.id + ' −' + q.an + ' / −' + q.me).join('; ') + ')');
ok(/\d \((scan|menu_view|dish_view|search|filter|item_add)\)/.test(await texto(p, '#dReg')) && (await p.evaluate(() => document.querySelector('#dReg').previousElementSibling.textContent)).includes('lo oscuro son los datos de la fila') , 'capítulo 7: las filas de las formas propuestas nombran el evento y la barra tiene su leyenda');
await p.click('#drSig'); await p.waitForTimeout(250);
const trP = await texto(p, '#dReg');
ok(trP.includes('Paso 1 de 7') && trP.includes('sesion_grupal') && !trP.includes('item_orden'), 'capítulo 7: el paso 1 enciende sólo lo que escribe el primer comensal');
await p.click('#drTodo'); await p.waitForTimeout(250);
const chicos = await p.evaluate(() => [...document.querySelectorAll('#dReg *')].filter((e) => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 12).map((e) => e.className + ':' + e.textContent.trim().slice(0, 18)));
ok(chicos.length === 0, 'capítulo 7: la vista por registro sin letra menor de 12 px ' + chicos.slice(0, 4).join(' | '));
if (png) await p.locator('#dReg').screenshot({ path: `${png}/v18_registros.png` });
await p.click('#dReg [data-forma="hoy"]'); await p.waitForTimeout(300);
await sinDesborde(p, 'capítulo 7 (historia del disco)'); await cierra(p);

// el capítulo 7 recorre varias combinaciones de topes, canal e historial: ninguna etiqueta sobre una línea ni sobre otra etiqueta
await abre(p, 'recursos7');
const choques = [];
for (const mesas of [6, 10, 25]) for (const est of ['hoy', 'avisos']) for (const his of ['vigente', '3', '30d']) {
  await p.evaluate((m) => cambiar({ topeMesas: m }), mesas);
  await p.click(`#estR [data-est="${est}"]`); await p.click(`#hisR [data-his="${his}"]`); await p.waitForTimeout(1000);
  const mal = await p.evaluate(() => {
    const svg = document.querySelector('#svH'), tx = [...svg.querySelectorAll('text')].filter((t) => t.textContent.trim() && +getComputedStyle(t).opacity > 0.3).map((t) => ({ t: t.textContent.trim().slice(0, 24), r: t.getBoundingClientRect() })), out = [];
    const ln = [...svg.querySelectorAll('line[stroke-dasharray]')].map((l) => l.getBoundingClientRect());
    tx.forEach((a, i) => { tx.slice(i + 1).forEach((b) => { const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top); if (w > 1 && h > 2) out.push('texto sobre texto: «' + a.t + '» y «' + b.t + '»'); }); ln.forEach((l) => { if (a.r.right > l.left && a.r.left < l.right && a.r.top < l.bottom - 0.5 && a.r.bottom > l.top + 0.5) out.push('texto sobre la línea: «' + a.t + '»'); }); });
    return out;
  });
  if (mal.length) choques.push(`${mesas} mesas · ${est} · ${his}: ${mal.slice(0, 2).join(' | ')}`);
}
ok(choques.length === 0, 'capítulo 7: ninguna etiqueta de la curva del disco choca con una línea ni con otra etiqueta en 18 combinaciones de topes, canal e historial ' + choques.slice(0, 2).join(' || '));
await p.evaluate(() => cambiar({ topeMesas: 6 })); await p.click('#estR [data-est="hoy"]'); await p.click('#hisR [data-his="vigente"]'); await p.waitForTimeout(500);
// el panel de hover no se queda pegado ni muestra un valor viejo
await abre(p, 'topes');
await p.hover('#svT circle[aria-label="Tope de mesas"]'); await p.waitForTimeout(300);
ok((await p.evaluate(() => document.getElementById('tt').textContent)).includes('6 mesas'), 'hover: el panel del tope de mesas dice 6 mesas');
await p.evaluate(() => cambiar({ topeMesas: 10 })); await p.waitForTimeout(500);
ok((await p.evaluate(() => { const t = document.getElementById('tt'); return t.hidden || t.textContent.includes('10 mesas'); })), 'hover: tras cambiar el tope el panel muestra el valor vigente (10 mesas) o se cierra');
await p.evaluate(() => window.scrollBy(0, 400)); await p.waitForTimeout(300);
ok(await p.evaluate(() => document.getElementById('tt').hidden), 'hover: el panel se cierra al desplazarse');
await p.evaluate(() => cambiar({ topeMesas: 6 })); await cierra(p);
// KPI: la unidad es «restaurantes registrados» y coincide con recursos
const kc = await p.evaluate(() => ({ txt: document.querySelector('[data-kpi="caben"]').textContent, sin: MOD.recursos(config(S), sup(S), 'hoy').cuello_hoy.restaurantes, resumen: MOD.resumen(config(S), sup(S)).cifras.find((c) => c.clave === 'restaurantes_que_caben').recomendado }));
ok(kc.txt.includes('restaurantes registrados') && !/gratuitos caben/.test(kc.txt) && kc.sin === kc.resumen, 'cifras fijas: la capacidad dice «restaurantes registrados» y resumen coincide con recursos (' + kc.sin + ')');

// capítulo 9, ingreso por anuncios y visión de una versión 2
await abre(p, 'modelo');
ok((await p.$$('#svG9f [data-tip]')).length === 6 && (await p.$$('#svG9g [data-tip]')).length === 7, 'capítulo 9: tres tarifas con genérico frente a v2, y cuatro pasos con su hover');
const v2m = await p.evaluate(() => MOD.visionV2(config(S), sup(S)).anuncios.por_tarifa.media);
ok((await texto(p, '#svG9f')).includes(v2m.pesos_por_gratuito_v1_todo_generico.toFixed(1)) && (await texto(p, '#svG9f')).includes(v2m.pesos_por_gratuito_v2_con_registrados.toFixed(1)), 'capítulo 9: media ' + v2m.pesos_por_gratuito_v1_todo_generico.toFixed(1) + ' → ' + v2m.pesos_por_gratuito_v2_con_registrados.toFixed(1) + ' MXN, del modelo');
ok((await texto(p, '#svG9g')).includes('por verificar con un abogado') && (await texto(p, '#svG9g')).includes('La versión 1 sigue sin cuentas ni pagos'), 'capítulo 9: lo legal lleva «por verificar con un abogado» y se dice que la v1 sigue sin cuentas ni pagos');
await sinDesborde(p, 'capítulo 9 (anuncios y visión)'); await cierra(p);

// capítulo 9: cómo gana dinero Carta, y el sueldo del fundador con los tres escenarios a la vez
await abre(p, 'modelo');
ok((await p.$$('#svG9a [data-tip]')).length >= 7 && (await p.$$('#svG9b [data-tip]')).length >= 13 && (await p.$$('#svG9c [data-tip]')).length === 5, 'capítulo 9: mapa, tabla frente a Meniu y cinco fuentes de ingreso con su hover');
ok((await texto(p, '#svG9e')).includes('elige un sueldo'), 'capítulo 9: el sueldo arranca en 0 y no propone una cifra');
await p.click('#sdC [data-sd="9577"]'); await p.waitForTimeout(300);
const sd1 = await texto(p, '#svG9e');
const m1 = await p.evaluate(() => { const r = MOD.sueldo(config(S), sup(S), 9577).escenarios; return [r.recomendado, r.peor].map((e) => [Math.round(e.restaurantes_necesarios).toLocaleString('en-US'), 'mes ' + e.mes_en_que_el_margen_despues_de_captacion_lo_cubre]); });
ok(m1[0].every((v) => sd1.includes(v)) && sd1.includes(m1[1][0]), 'capítulo 9: con 9,577 MXN salen del modelo ' + m1.flat().join(' · '));
await p.click('#sdC [data-sd="28732"]'); await p.waitForTimeout(300);
const sd2 = await texto(p, '#svG9e');
const m2 = await p.evaluate(() => Math.round(MOD.sueldo(config(S), sup(S), 28732).escenarios.recomendado.restaurantes_necesarios).toLocaleString('en-US'));
ok(sd2.includes(m2) && sd2.includes('pide otra arquitectura'), 'capítulo 9: con 28,732 MXN hacen falta ' + m2 + ' (modelo) y pide otra arquitectura');
ok(!(await p.$('#det [data-esc]')), 'capítulo 9: sin selector de escenario');
await sinDesborde(p, 'capítulo 9'); await cierra(p);

// topes: arrastre con teclado y con puntero
await abre(p, 'topes');
const e0 = await texto(p, '.cap.act .capcif .cifra:nth-child(4) b');
await p.focus('#svT circle[aria-label="Tope de platillos"]'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(500);
const e1 = await texto(p, '.cap.act .capcif .cifra:nth-child(4) b');
ok(e1 !== e0, `topes: bajar el tope de platillos cambia a quién empuja (${e0} → ${e1})`);
const box = await p.$eval('#svT circle[aria-label="Tope de mesas"]', (e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
await p.mouse.move(box[0], box[1]); await p.mouse.down(); await p.mouse.move(box[0] + 150, box[1], {steps: 6}); await p.mouse.up(); await p.waitForTimeout(500);
ok((await p.evaluate(() => S.topeMesas)) > 25, 'topes: arrastrar el asa de mesas la mueve');
ok((await p.$$('#svT [id], #svT .rm')).length > 20 && (await texto(p, '#svT')).includes('Master Chef') && (await texto(p, '#svT')).includes('en Chef'), 'topes: muestra a qué plan cae cada tamaño (dos planes)');
if (png) await p.screenshot({ path: `${png}/v5_topes.png` });
const t6 = await texto(p, '#svT');
ok(t6.includes('dos muestras') && t6.includes('sesgos opuestos'), 'topes: la marca del platillo dice «dos muestras, sesgos opuestos»');
ok(/\d+\.\d–\d+\.\d % de 0 a 5 se queda en Chef/.test(t6), 'topes: «se queda en Chef» es una banda entre las dos cotas');
await p.evaluate(() => cambiar({ topeMesas: 6, topeCuentas: 1, topePlatillos: 150, platSel: 'todo' })); await p.waitForTimeout(400);
const cobT = await p.evaluate(() => { const c = MOD.coberturaChef(config(S), SP); return [c.todo.baja, c.todo.alta, c.comida.baja, c.comida.alta].map((v) => +(100 * v).toFixed(1)); });
ok(cobT[0] > 0 && cobT[1] >= cobT[0] && cobT[1] <= 100, 'topes: la cobertura de Chef (6 mesas, 1 cuenta, 150 platillos, cuenta todo) es una banda del modelo (' + cobT.join(' ') + ')');
ok(!(await p.$('#platSel')), 'topes: ya no hay selector de «cuenta todo · sólo comida · sin tope»');
const mg0 = await p.evaluate(() => [evalS(S).margen_operacion, evalCota(S, 'baja').margen_operacion].map(Math.round));
const mgM = await p.evaluate(() => { const e = MOD.desgloses(config(S), sup(S), 1000).escenarios.find((q) => q.escenario === 'recomendado'); return Math.round(e.cascada_margen.margen_operacion); });
ok(mg0[0] === mgM, 'topes: el margen con 1,000 restaurantes coincide con el modelo (' + mg0.join(' ') + ' · modelo ' + mgM + ')');
ok((await p.evaluate(() => document.querySelector('#svT [data-tip*="no es un margen real"]') !== null)), 'topes: el margen de la cota baja avisa que no es un margen real');
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
// el punto del eje se arrastra de verdad: con ratón y con toque, y puede cruzar todo el eje
const N0 = await p.evaluate(() => DET.sostiene.N);
const bp = await p.$eval('#hN circle:last-child', (e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
await p.mouse.move(bp[0], bp[1]); await p.mouse.down(); await p.mouse.move(bp[0] + 120, bp[1], { steps: 8 }); await p.mouse.move(bp[0] + 260, bp[1], { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200);
const N1 = await p.evaluate(() => DET.sostiene.N);
ok(N1 > N0 * 1.5, 'capítulo 8: arrastrar el punto con el ratón lo lleva lejos (' + N0 + ' → ' + N1 + ')');
const bp2 = await p.$eval('#hN circle:last-child', (e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
const cdp = await p.context().newCDPSession(p);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bp2[0], y: bp2[1] }] });
for (let k = 1; k <= 10; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: bp2[0] - k * 28, y: bp2[1] }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(250);
const N2 = await p.evaluate(() => DET.sostiene.N);
ok(N2 < N1 * 0.6, 'capítulo 8: arrastrar el punto con el dedo lo lleva lejos (' + N1 + ' → ' + N2 + ')');
await p.evaluate(() => { DET.sostiene.N = 100; DET.sostiene.pinta(); });
// la bolsa está arriba, con la leyenda, como casillas de selección única
ok((await p.$$('.cap.act .capley .rad[data-bolsa]')).length === 4 && (await p.$$('.cap.act .capley .rad.on')).length === 1, 'capítulo 8: la bolsa son cuatro casillas de selección única en la leyenda');
ok((await p.evaluate(() => document.querySelector('.capley [data-tip*="la mitad de la tarifa baja"]') !== null)), 'capítulo 8: «adverso» tiene su definición en el hover');
await p.click('.cap.act .capley .rad[data-bolsa="2000"]'); await p.waitForTimeout(300);
ok((await p.$$('.cap.act .capley .rad.on')).length === 1 && (await p.evaluate(() => document.querySelector('.cap.act .capley .rad.on').dataset.bolsa)) === '2000', 'capítulo 8: la casilla elegida es la única marcada');
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
const esq = await p.evaluate(() => { const es = MOD.desgloses(config(S), sup(S), 1000).escenarios, f = (x) => Math.round(es.find((q) => q.escenario === x).cascada_margen.margen_operacion).toLocaleString('en-US'); return [f('peor'), f('mejor')]; });
const tK = await texto(p, '#svK');
ok(esq.every((v) => tK.includes(v.replace('-', '−') + ' MXN')), 'sostiene: la matriz 3 × 3 da ' + esq.join(' y ') + ' en las esquinas (modelo)');
if (png) await p.screenshot({ path: `${png}/v8_sost4.png` });
// capítulo 8: sensibilidad a las visitas por mesa (sólo estado vigente, sin tabla antes → después)
await p.click('#tabsK [data-vista="5"]'); await p.waitForTimeout(900);
const cc = await p.evaluate(() => MOD.comparacionDeCarga(config(S), sup(S)).sensibilidad_visitas_por_mesa.map((q) => Math.round(Math.abs(q.margen_operacion_recomendado_1000)).toLocaleString('en-US')));
const t5 = await texto(p, '#svK');
ok(cc.every((v) => t5.includes(v)) && t5.includes('visitas por mesa') && !t5.includes('versión 11'), 'capítulo 8: la sensibilidad a 90 / 180 / 360 visitas por mesa sale del modelo (' + cc.join(' · ') + ') y no hay tabla antes → después');
ok(await p.evaluate(() => [...document.querySelectorAll('#svK text')].every((t) => parseFloat(t.getAttribute('font-size')) >= 12)), 'capítulo 8: sensibilidad sin letra menor de 12 px');
if (png) await p.screenshot({ path: `${png}/v12_cambio.png` });
await p.click('#tabsK [data-vista="6"]'); await p.waitForTimeout(900);
const tor = await p.evaluate(() => MOD.escenariosPorEje(config(S), sup(S)).flatMap((e) => [e.margen_con_la_politica_vigente, e.margen_con_la_propuesta_de_30_dias]).map((v) => Math.round(Math.abs(v)).toLocaleString('en-US')));
const tt6 = await texto(p, '#svK');
ok(tor.every((v) => tt6.includes(v)) && tt6.includes('Estrés') && tt6.includes('propuesta'), 'capítulo 8: el tornado trae los nueve ejes del modelo con la política vigente y la propuesta de 30 días al lado');
ok(await p.evaluate(() => [...document.querySelectorAll('#svK text')].every((t) => parseFloat(t.getAttribute('font-size')) >= 12)), 'capítulo 8: tornado sin letra menor de 12 px');
if (png) await p.screenshot({ path: `${png}/v12_tornado.png` });
await p.click('#tabsK [data-vista="0"]'); await p.waitForTimeout(500);
await sinDesborde(p, 'sostiene'); await cierra(p);
// cuánto puede pagar
await abre(p, 'pagar');
await p.evaluate(() => { const d = document.querySelector('#svG').closest('details'); if (d) d.open = true; }); await p.waitForTimeout(200);
const izq = await p.evaluate(() => { const sv = document.querySelector('#svG'), rects = [...sv.querySelectorAll('rect')].map((r) => r.getBBox()).filter((b) => b.width > 400), x0 = Math.min(...rects.map((b) => b.x)), y0 = Math.min(...rects.map((b) => b.y)); const mal = [...sv.querySelectorAll('text')].filter((t) => t.textContent.trim() && t.getBBox().x < x0 - 5 && t.getBBox().y >= y0 - 6).filter((t) => { const b = t.getBBox(); return b.x + b.width > x0 - 4; }).map((t) => t.textContent.slice(0, 30)); return { x0, mal, texto: sv.textContent }; });
ok(izq.mal.length === 0 && !/MXN M\b|MXN mil/.test(izq.texto) && /millones de MXN al mes/.test(izq.texto) && /mil MXN al mes/.test(izq.texto), 'pagar: ningún texto de la columna izquierda pasa del inicio de la tira (x ' + Math.round(izq.x0) + ') y las unidades van juntas con su número ' + izq.mal.join(' | '));
await p.click('#ejPagar summary'); await p.waitForTimeout(300);
const ejP = await p.evaluate(() => ({ t: document.querySelector('#ejPagar').textContent, ing: D.inegi_tamano[1].ingreso.toLocaleString('en-US'), n: document.querySelectorAll('#ejPagar li').length, master: document.querySelector('#svV').textContent.includes('desde 6') }));
ok(ejP.n === 5 && ejP.t.includes(ejP.ing) && ejP.t.includes('Dónde cae el precio') && !ejP.master, 'pagar: el ejemplo desplegable recorre cinco pasos con el ingreso del generador (' + ejP.ing + ') y ya no hay franja de Master Chef desde 6 personas');
ok((await p.$$('#svG .gh')).length >= 4, 'pagar: una imagen con punto de venta y Carta por tamaño');
if (png) await p.screenshot({ path: `${png}/v8_pagar.png` });
await sinDesborde(p, 'pagar'); await cierra(p);
// recomendaciones
await p.click('#verDecisiones'); await p.waitForTimeout(450);
ok((await p.$$('.rcard')).length === 8 && (await p.evaluate(() => REC.decisiones[1].id)) === 'tope_platillos', 'decisiones: ocho, y la 2 es el tope de platillos');
ok((await texto(p, '#r_tope_platillos')).includes('decidido el 21 de noviembre') && (await p.$$('#r_tope_platillos svg g[data-tip]')).length === 12, 'decisiones: el tope de platillos está decidido (50) y se muestran sus opciones, con las cuatro opciones a la vista');
const pv = await p.evaluate(() => MOD.costoDePlatillo(config(S), sup(S)).filas.flatMap((q) => { const v = q.con_la_mezcla_de_paga_variable; return [v.baja.pagantes_por_1000, v.alta.pagantes_por_1000, v.baja.disco_con_avisos, v.alta.disco_con_avisos].map((x) => Math.round(x).toLocaleString('en-US')); }));
const tpv = await texto(p, '#r_tope_platillos');
ok(pv.length === 16 && pv.every((x) => tpv.includes(x)) && tpv.includes('parte de paga variable'), 'decisiones: cada tope de platillos dibuja pagantes por 1,000 y restaurantes por disco con las dos cotas (' + pv.slice(0, 4).join(' · ') + ' …)');
if (png) await p.locator('#r_tope_platillos').screenshot({ path: `${png}/v12_platillos.png` });
await p.click('[data-mas="dos_planes"]'); await p.waitForTimeout(150);
await p.click('#r_dos_planes .opcion:not(.rec) .btn'); await p.waitForTimeout(300);
ok((await p.evaluate(() => S.topeMesas)) === 5, 'recomendaciones: «Probar esta» aplica 5 mesas');
await p.click('#r_dos_planes .acc2 [data-aplica]'); await p.waitForTimeout(300);
ok((await p.evaluate(() => S.topeMesas)) === 6, 'recomendaciones: aplicar lo recomendado (6 mesas)');
if (png) await p.screenshot({ path: `${png}/v5_recs.png` });
await sinDesborde(p, 'recomendaciones');
// persistencia del escenario que se edita dentro de cada detalle
await p.reload(); await p.waitForTimeout(400);
ok((await p.evaluate(() => S.topeMesas)) === 6, 'lo editado dentro del detalle persiste al recargar');
await p.evaluate(() => localStorage.clear());
// presentación
await p.goto(url.replace('?nointro', '')); await p.waitForTimeout(500);
ok(await p.isVisible('#intro'), 'la presentación abre la primera vez');
/* la voz en disco: las tablas de la película son las medidas, el guion tiene las mismas frases que las grabaciones, y hay un mp3 por toma */
{
  const fs = require('node:fs');
  const medido = JSON.parse(fs.readFileSync(resolve(aqui, 'voz/tiempos.json'), 'utf8'));
  const tablas = await p.evaluate(() => ({ VOZ_AUDIO, VOZ_TIEMPOS }));
  ok(JSON.stringify(tablas.VOZ_AUDIO) === JSON.stringify(medido.VOZ_AUDIO) && JSON.stringify(tablas.VOZ_TIEMPOS) === JSON.stringify(medido.VOZ_TIEMPOS), 'voz: VOZ_AUDIO y VOZ_TIEMPOS de la película son iguales a voz/tiempos.json');
  /* versión 19: la línea de tiempo que usa la mezcla de la música es la que calcula la película */
  const lt = JSON.parse(fs.readFileSync(resolve(aqui, 'voz/linea_de_tiempo.json'), 'utf8'));
  const peli = await p.evaluate(() => ({ total: Math.round(TOT * 10) / 10, tomas: TOMAS.map((x, i) => ({ toma: x[0], inicio: Math.round(T0[i] * 10) / 10, duracion: Math.round(x[2] * 10) / 10 })) }));
  ok(JSON.stringify(lt) === JSON.stringify(peli), 'voz: voz/linea_de_tiempo.json es la línea de tiempo que calcula la película (' + peli.tomas.length + ' tomas, ' + peli.total + ' s)');
  const ids = JSON.parse(fs.readFileSync(resolve(aqui, 'apoyo/voz/guion.json'), 'utf8')).map((l) => l.id).sort();
  const grabadas = fs.readdirSync(resolve(aqui, 'voz/lineas')).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)).sort();
  ok(JSON.stringify(ids) === JSON.stringify(grabadas), `voz: apoyo/voz/guion.json tiene los mismos id que voz/lineas (${ids.length} y ${grabadas.length})`);
  const faltan = Object.keys(tablas.VOZ_AUDIO).filter((t) => !fs.existsSync(resolve(aqui, `apoyo/voz/${t}.mp3`)));
  ok(faltan.length === 0, `voz: existe apoyo/voz/<toma>.mp3 para cada toma de VOZ_AUDIO (${Object.keys(tablas.VOZ_AUDIO).length}) ${faltan.join(', ')}`);
}
/* con voz, la película espera tras una puerta de entrada; sin voz, no hay puerta */
if (await p.evaluate(() => HAY_VOZ && !REDUCE)) {
  ok(await p.isVisible('#introPuerta'), 'presentación con voz: la puerta de entrada aparece');
  const tq = await p.evaluate(() => tI); await p.waitForTimeout(1000);
  ok((await p.evaluate(() => tI)) === tq, 'presentación con voz: no avanza mientras la puerta está puesta');
  await p.mouse.click(300, 420); await p.waitForTimeout(200);
  ok((await p.evaluate(() => tI)) === tq && (await p.isVisible('#introPuerta')) && !(await p.evaluate(() => vozLibre)), 'presentación con voz: un clic fuera de los botones no hace nada');
  /* los mp3 los publica la sesión maestra y no están en el repositorio: la prueba usa un doble de Audio que anota qué pista se pide */
  /* el doble corre con su propio reloj (a `ritmo` veces el tiempo real) y cuenta cuántas veces se le escribe `currentTime` */
  await p.evaluate(() => { window.__pistas = []; window.__ritmo = 1; window.__escrituras = 0; window.Audio = class {
    constructor(src) { this.src = src; this.paused = true; this._t = 0; this._t0 = 0; this.duration = NaN; this.readyState = 4; this.seeking = false; this.ended = false; window.__pistas.push(String(src)); }
    get currentTime() { return this.paused ? this._t : this._t + (performance.now() - this._t0) / 1000 * window.__ritmo; }
    set currentTime(v) { window.__escrituras++; this._t = v; this._t0 = performance.now(); }
    play() { if (this.paused) { this._t0 = performance.now(); this.paused = false; } return Promise.resolve(); }
    pause() { if (!this.paused) { this._t = this.currentTime; this.paused = true; } } }; });
  await p.click('#introPuerta [data-intro="consonido"]'); await p.waitForTimeout(600);
  ok(!(await p.isVisible('#introPuerta')) && (await p.evaluate(() => vozLibre && vozOn && tI > 0)), 'presentación con voz: «Ver con sonido» quita la puerta, desbloquea el sonido y la película corre');
  ok((await p.evaluate(() => window.__pistas[0] || '')).endsWith('apoyo/voz/mesa.mp3'), 'presentación con voz: pide la pista de la primera toma');
  /* mientras suena, la imagen sigue al audio y nadie rebobina la pista; sólo un salto del usuario la coloca, una vez */
  const e0 = await p.evaluate(() => window.__escrituras);
  await p.evaluate(() => { window.__ritmo = 1.6; }); await p.waitForTimeout(1200);
  const sigue = await p.evaluate(() => ({ dif: Math.abs(tI / 1000 - T0[vozToma] - vozAct.currentTime), esc: window.__escrituras }));
  ok(sigue.dif < 0.2 && sigue.esc === e0, `presentación con voz: con el audio más rápido, la imagen lo sigue (${sigue.dif.toFixed(2)} s) y nadie escribe currentTime (${sigue.esc - e0})`);
  await p.evaluate(() => { window.__ritmo = 1; }); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500);
  const trasSalto = await p.evaluate(() => window.__escrituras);
  ok(trasSalto === e0 + 1, `presentación con voz: tras +3 s, currentTime se escribe exactamente una vez (${trasSalto - e0})`);
  /* versión 19: la música de fondo es una segunda pista (el archivo real, no el doble) que sigue al reloj de la película */
  { const fs = require('node:fs'); ok(fs.existsSync(resolve(aqui, 'apoyo/musica/fondo.mp3')), 'música: existe apoyo/musica/fondo.mp3');
    await p.waitForTimeout(1800);
    const m1 = await p.evaluate(() => (musica ? { src: String(musica.src), pausada: musica.paused, dif: Math.abs(musica.currentTime - tI / 1000), dur: musica.duration, total: TOT, vol: musica.volume, ritmo: musica.playbackRate } : null));
    ok(m1 && m1.src.endsWith('apoyo/musica/fondo.mp3') && Math.abs(m1.dur - m1.total) <= 0.5, `música: fondo.mp3 dura lo que la película (${m1 ? m1.dur.toFixed(2) : '?'} s y ${m1 ? m1.total.toFixed(1) : '?'} s, ± 0.5)`);
    ok(m1 && !m1.pausada && m1.dif < 0.6 && m1.vol === 1 && m1.ritmo >= 0.97 && m1.ritmo <= 1.03, `música: con sonido, suena y sigue al reloj de la película (a ${m1 ? m1.dif.toFixed(2) : '?'} s, volumen ${m1 ? m1.vol : '?'}, velocidad ${m1 ? m1.ritmo : '?'})`);
    const c0 = await p.evaluate(() => musColocadas); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(900);
    const m2 = await p.evaluate(() => ({ n: musColocadas, dif: Math.abs(musica.currentTime - tI / 1000) }));
    ok(m2.n === c0 + 1 && m2.dif < 0.6, `música: tras +3 s se coloca exactamente una vez (${m2.n - c0}) y queda a ${m2.dif.toFixed(2)} s del reloj`);
    await p.evaluate(() => { pausaI = true; }); await p.waitForTimeout(300);
    const m3 = await p.evaluate(() => ({ pausada: musica.paused, voz: !vozAct || vozAct.paused }));
    await p.evaluate(() => { pausaI = false; ultI = performance.now(); }); await p.waitForTimeout(500);
    const m4 = await p.evaluate(() => ({ pausada: musica.paused, n: musColocadas }));
    ok(m3.pausada && m3.voz && !m4.pausada && m4.n === m2.n, 'música: se pausa y se reanuda con la película, sin recolocarse');
    await p.evaluate(() => { vozOn = false; }); await p.waitForTimeout(300);
    const m5 = await p.evaluate(() => musica.paused); await p.evaluate(() => { vozOn = true; }); await p.waitForTimeout(300);
    ok(m5, 'música: sin sonido, la música no suena');
    const cred = await p.evaluate(() => { const e = document.querySelector('#cine .marca small'); return e ? e.textContent : ''; });
    ok(cred.includes('Bossa Antigua') && cred.includes('Kevin MacLeod') && cred.includes('incompetech.com') && cred.includes('CC BY 4.0') && cred.includes('creativecommons.org/licenses/by/4.0') && cred.includes('adaptada'), 'música: el crédito completo (título, autor, fuente, licencia con su enlace y «adaptada») está en la toma final: ' + cred); }
  /* cada globo dice lo mismo que su frase en VOZ (sin las marcas), y con tiempos medidos toda frase de personaje tiene su globo a la vista a media frase */
  const globos = await p.evaluate(async () => {
    const limpia = (t) => t.replace(/\[[^\]]*\]\s*/g, '').trim(), el = (g) => document.querySelector(typeof g === 'string' ? '.g' + g : '.g' + g);
    const visible = (n) => { if (!n) return false; for (let x = n; x && x.id !== 'intro'; x = x.parentElement) { const c = getComputedStyle(x); if (c.visibility === 'hidden' || c.display === 'none' || +c.opacity < 0.5) return false; } return n.getBoundingClientRect().width > 0; };
    const distintos = [], sinGlobo = []; let frases = 0; const antes = [tI, pausaI]; pausaI = true;
    for (const [toma, ls] of Object.entries(VOZ)) { const ix = TOMAS.findIndex((x) => x[0] === toma), med = VOZ_TIEMPOS[toma];
      for (let i = 0; i < ls.length; i++) { const [, quien, texto, o] = ls[i]; if (quien === 'narrador') continue; frases++;
        const n = o && o.g !== undefined ? el(o.g) : null, frase = limpia(texto);
        if (n && frase && n.textContent.trim() !== frase) distintos.push(`${toma}: «${n.textContent.trim()}» ≠ «${frase}»`);
        if (med && med[i]) { tI = (T0[ix] + med[i][0] + Math.min(0.9, (med[i][1] - med[i][0]) / 2)) * 1000; pintaIntro(); await new Promise((r) => setTimeout(r, 20)); if (!visible(n)) sinGlobo.push(`${toma}-${i + 1} ${quien}`); } } }
    tI = antes[0]; pausaI = antes[1]; vozSalto = true; pintaIntro();
    return { distintos, sinGlobo, frases };
  });
  ok(globos.distintos.length === 0, `presentación con voz: cada globo dice lo mismo que su frase (${globos.frases} frases) ${globos.distintos.slice(0, 3).join(' | ')}`);
  ok(globos.sinGlobo.length === 0, `presentación con voz: toda frase de personaje tiene su globo a la vista a media frase ${globos.sinGlobo.slice(0, 8).join(', ')}`);
} else ok(!(await p.isVisible('#introPuerta')), 'presentación sin voz: no hay puerta de entrada');
await p.waitForTimeout(1500);
const t1 = await p.evaluate(() => tI);
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(100);
ok((await p.evaluate(() => tI)) - t1 >= 2900, 'presentación: +3 s adelanta');
await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(100);
ok((await p.evaluate(() => tI)) < t1 + 2000, 'presentación: −3 s atrasa');
await p.click('.ictl [data-intro="pausa"]'); const tp = await p.evaluate(() => tI); await p.waitForTimeout(400);
ok((await p.evaluate(() => tI)) === tp, 'presentación: la pausa detiene el tiempo');
ok((await p.isVisible('#intro [data-pantalla]')) || !(await p.evaluate(() => FSOK)), 'presentación: pantalla completa dentro de la presentación');
ok(await p.evaluate(() => !!window.gsap && !!tlF), 'presentación: la línea de tiempo (GSAP) cargó');
await p.keyboard.press('2'); await p.waitForTimeout(80);
ok(Math.abs((await p.evaluate(() => tI / 1000)) - (await p.evaluate(() => ACT_INI[1]))) < 0.2, 'presentación: saltar al acto 2');
await p.keyboard.press('1'); await p.waitForTimeout(80);
ok((await p.evaluate(() => tI)) < 300, 'presentación: saltar al acto 1');
await p.evaluate(() => { pausaI = true; });
// la película en cinco tamaños: en ≥ 24 instantes, rótulos, globos y etiquetas dentro del cuadro, sin encimarse ni tapar el teléfono
const revisaPelicula = () => p.evaluate(async () => {
  const mal = []; const f = document.querySelector('#cine'), fr = f.getBoundingClientRect();
  const vis = (el) => { let o = 1, n = el; while (n && n !== f) { const c = getComputedStyle(n); o *= parseFloat(c.opacity); if (c.visibility === 'hidden' || c.display === 'none') o = 0; n = n.parentElement; } return o; };
  const inst = Array.from({ length: 48 }, (_, k) => (TOT * (k + 0.5)) / 48);
  for (const s of inst) {
    tI = s * 1000; pintaIntro(); await new Promise((r) => setTimeout(r, 30));
    const textos = [...f.querySelectorAll('.r .cln, .globo, .etq span, .estado, .resu, .marca b, .marca span')].filter((e) => vis(e) > 0.9).map((e) => [e, e.getBoundingClientRect()]).filter(([, r]) => r.width);
    const cels = [...f.querySelectorAll('.cel')].filter((c) => vis(c) > 0.9).map((c) => c.getBoundingClientRect());
    for (const [e, r] of textos) {
      if (r.left < fr.left - 1 || r.right > fr.right + 1 || r.top < fr.top - 1 || r.bottom > fr.bottom + 1) mal.push(s.toFixed(1) + ' s: «' + e.textContent.slice(0, 24) + '» fuera del cuadro');
      for (const rc of cels) if (e.matches('.r .cln, .globo, .estado, .resu') && r.right > rc.left - 8 && r.left < rc.right && r.bottom > rc.top && r.top < rc.bottom) mal.push(s.toFixed(1) + ' s: «' + e.textContent.slice(0, 24) + '» tapa un teléfono');
    }
    for (let a = 0; a < textos.length; a++) for (let b = a + 1; b < textos.length; b++) {
      const [ea, ra] = textos[a], [eb, rb] = textos[b];
      if (ea.contains(eb) || eb.contains(ea) || ea.parentElement === eb.parentElement && ea.matches('.etq span')) continue;
      if (ra.left < rb.right - 1 && rb.left < ra.right - 1 && ra.top < rb.bottom - 1 && rb.top < ra.bottom - 1) mal.push(s.toFixed(1) + ' s: «' + ea.textContent.slice(0, 18) + '» encima de «' + eb.textContent.slice(0, 18) + '»');
    }
  }
  return { mal, n: inst.length };
});
for (const [w, h] of [[1920, 1080], [1440, 900], [1366, 768], [1280, 720], [390, 844]]) {
  await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(120);
  const { mal, n } = await revisaPelicula();
  ok(n >= 24 && mal.length === 0, `presentación ${w}×${h}: ${n} instantes sin rótulos fuera del cuadro ni encimados ` + mal.slice(0, 3).join('; '));
}
await p.setViewportSize({ width: 1920, height: 1080 });
/* versión 19: en las tomas de mesa, cada personaje a la vista lleva su nombre, y ningún nombre se encima con un globo o un rótulo.
   Se mira cada toma en tres instantes; en `cumple`, antes de «casi», la silla de Carlos está vacía y el mesero aún no llega. */
const nom = await p.evaluate(async () => {
  const f = document.querySelector('#cine'), mal = [], vistos = {}, tomas = new Set();
  const vis = (el) => { let o = 1, n = el; while (n && n !== f) { const c = getComputedStyle(n); o *= parseFloat(c.opacity); if (c.visibility === 'hidden' || c.display === 'none') o = 0; n = n.parentElement; } return o; };
  const mira = async (s) => { tI = s * 1000; pintaIntro(); await new Promise((r) => setTimeout(r, 30)); };
  for (let i = 0; i < TOMAS.length; i++) for (const fr of [0.3, 0.55, 0.8]) {
    const s = T0[i] + (T0[i + 1] - T0[i]) * fr; await mira(s);
    if (vis(f.querySelector('.sala')) < 0.9) continue;
    const textos = [...f.querySelectorAll('.r .cln, .globo')].filter((e) => vis(e) > 0.9).map((e) => [e, e.getBoundingClientRect()]).filter(([, r]) => r.width);
    for (const n of [...f.querySelectorAll('.nmb')]) { const g = n.parentElement;
      if (vis(g) < 0.9) { if (vis(n) > 0.1 && vis(g) < 0.05) mal.push(s.toFixed(1) + ' s: «' + n.textContent + '» sin su personaje'); continue; }
      tomas.add(TOMAS[i][0]); vistos[n.textContent] = (vistos[n.textContent] || 0) + 1; const r = n.getBoundingClientRect();
      if (vis(n) < 0.9 || !r.width) { mal.push(s.toFixed(1) + ' s: falta el nombre de ' + n.textContent); continue; }
      for (const [e, rt] of textos) if (r.left < rt.right - 1 && rt.left < r.right - 1 && r.top < rt.bottom - 1 && rt.top < r.bottom - 1) mal.push(s.toFixed(1) + ' s (' + TOMAS[i][0] + '): «' + n.textContent + '» encima de «' + e.textContent.slice(0, 18) + '»');
    }
  }
  const ic = TOMAS.findIndex((x) => x[0] === 'cumple'); await mira(T0[ic] + VOZ_TIEMPOS.cumple[0][1] - 1.6);
  const de = (c) => vis(f.querySelector('.gp.' + c)); const antes = { C: de('gC'), m: de('gm'), A: de('gA'), S: de('gS'), D: de('gD'), silla: vis(f.querySelector('.k-carlos-silla')) };
  await mira(T0[ic] + VOZ_TIEMPOS.cumple[1][0] + 0.3); const luego = { C: de('gC'), m: de('gm'), x: +gsap.getProperty(f.querySelector('.gp.gC'), 'x') };
  return { mal, vistos, tomas: tomas.size, antes, luego };
});
ok(nom.tomas >= 12 && ['Ana', 'Sofía', 'Diego', 'Carlos', 'Javier'].every((n) => nom.vistos[n] > 0) && nom.mal.length === 0, 'película: en las tomas de mesa (' + nom.tomas + ') cada personaje a la vista lleva su nombre y ningún nombre se encima con un globo o un rótulo ' + nom.mal.slice(0, 5).join('; '));
ok(nom.antes.C < 0.05 && nom.antes.m < 0.05 && nom.antes.silla > 0.9 && nom.antes.A > 0.9 && nom.antes.S > 0.9 && nom.antes.D > 0.9 && nom.luego.C > 0.9 && nom.luego.m > 0.9 && Math.abs(nom.luego.x) < 1, 'película: en `cumple`, antes de «casi» la silla de Carlos está vacía y no hay mesero; cuando el mesero habla, Carlos ya está sentado');
// capítulo 7: la capacidad depende de quién paga; capítulo 5: si la mediana real fuera otra
await p.evaluate(() => { const i = document.getElementById('intro'); if (i) i.style.display = 'none'; });
await abre(p, 'recursos7');
const sc7 = await p.evaluate(() => MOD.recursos(config(S), sup(S), 'hoy').sensibilidad_de_la_capacidad.parte_que_paga.flatMap((f) => [f.procesador_con_sondeo, f.disco]).map((v) => Math.round(v).toLocaleString('en-US')));
const tse = await texto(p, '#svSe');
ok(sc7.every((v) => tse.includes(v)) && tse.includes('si pagan más, el servidor se llena antes') && tse.includes('Supuesto'), 'capítulo 7: la capacidad con 2.3 / 11.6 / 38.2 % de paga sale del modelo (' + sc7.join(' · ') + ') y dice que la mezcla es supuesto');
if (png) await p.locator('#svSe').screenshot({ path: `${png}/v12_sensib.png` });
await cierra(p);
await abre(p, 'precio');
const md = await p.evaluate(() => { const sm = MOD.sensibilidadDeLaMediana(config(S), sup(S)); return sm.filas.filter((f) => f.historial.startsWith('política vigente') && Math.abs(f.techo - sm.techo_supuesto) < 1e-9).map((f) => Math.round(f.pagantes_por_1000).toLocaleString('en-US')); });
const tmd = await texto(p, '#svMd');
ok(md.length === 3 && md.every((v) => tmd.includes(v)) && tmd.includes('supuesto') || tmd.includes('Supuesto') || tmd.includes('es un supuesto'), 'capítulo 5: la mediana real de 150 / 225 / 300 da ' + md.join(' · ') + ' pagantes y se rotula como supuesto');
if (png) await p.locator('#svMd').screenshot({ path: `${png}/v12_mediana.png` });
await cierra(p);
await p.evaluate(() => { const i = document.getElementById('intro'); if (i) i.style.display = ''; });
// cifras a mano: ninguna de estas literales vive en los js (salen del modelo, de los parámetros o de los datos)
{ const { readFileSync, readdirSync } = await import('node:fs'); const dir = resolve(dirname(fileURLToPath(import.meta.url)), 'js');
  const prohibidas = ['652 a 1,000', '(1,243 MXN)', '[0.23,', '≈ 3,000 y más', '≈ 0.4 pesos al año', '"7 días"'];
  const halladas = readdirSync(dir).filter((f) => f.endsWith('.js')).flatMap((f) => { const t = readFileSync(resolve(dir, f), 'utf8'); return prohibidas.filter((x) => t.includes(x)).map((x) => f + ': ' + x); });
  ok(halladas.length === 0, 'ninguna cifra a mano en js/ (salen del modelo o de los datos) ' + halladas.join(' | ')); }
// lo que vuelve de localStorage se sanea: tipo y rango
await p.evaluate(() => localStorage.setItem('carta-v8-escenario', JSON.stringify({ S: { topeMesas: 'x', topeCuentas: 9999, topePlatillos: 80, palancas: 'no', precioServicio: -5, __proto__: { a: 1 } } })));
await p.reload(); await p.waitForTimeout(800);
const san = await p.evaluate(() => ({ m: S.topeMesas === BASE.topeMesas, c: S.topeCuentas === BASE.topeCuentas, pl: S.topePlatillos, pa: Array.isArray(S.palancas), ps: S.precioServicio === BASE.precioServicio }));
ok(san.m && san.c && san.pl === 80 && san.pa && san.ps, 'localStorage: lo inválido se descarta (tipo y rango) y lo válido se conserva');
await p.evaluate(() => localStorage.removeItem('carta-v8-escenario')); await p.reload(); await p.waitForTimeout(600);
ok(errores.length === 0, 'presentación: sin errores de consola ' + errores.slice(0, 2).join(' | '));
if (png) { for (const [i, s] of [[1, 4], [2, 10], [3, 17.5], [4, 25], [5, 30], [6, 37], [7, 41.5], [8, 47.5], [9, 53], [10, 59], [11, 65.5], [12, 72], [13, 76.5], [14, 80.5], [15, 84], [16, 88], [17, 92]]) { await p.evaluate((t) => { tI = t * 1000; pintaIntro(); }, s); await p.waitForTimeout(100); await p.screenshot({ path: `${png}/v10_pelicula${i}.png` }); } }
await p.click('.ictl [data-intro="saltar"]'); await p.waitForTimeout(200);
ok(!(await p.isVisible('#intro')), 'la presentación se puede saltar');
/* al reabrirla desde el informe la página ya recibió un gesto: no hay puerta y arranca con sonido */
if (await p.evaluate(() => HAY_VOZ && !REDUCE)) {
  await p.evaluate(() => abrirIntro()); await p.waitForTimeout(600);
  ok((await p.isVisible('#intro')) && !(await p.isVisible('#introPuerta')) && (await p.evaluate(() => vozLibre && vozOn && !pausaI && tI > 0)), 'presentación con voz: al reabrir tras un gesto no hay puerta y arranca con sonido');
  /* versión 18: antes de cada toque, el resaltado tiene la caja (± 4 px) y el radio de lo que se toca, y se ve */
  const hal = await p.evaluate(() => {
    pausaI = true; const mal = [], marcas = []; let fijas = 0;
    for (const [A, x, y, t] of TOQUES) {
      for (const d of [0.3, 0.05]) { vozSalto = true; tI = (t - d) * 1000; pintaIntro(); }
      const ag = document.querySelector('#cine ' + A), pan = ag.querySelector('.pan'), h = ag.querySelector('.halo'), o = h.__obj, de = A + ' (' + x + ', ' + y + ') a los ' + t.toFixed(1) + ' s';
      if (!o || !pan.contains(o)) { mal.push(de + ': sin objetivo'); continue; }
      if (+getComputedStyle(h).opacity < 0.9 || getComputedStyle(h).visibility === 'hidden') { mal.push(de + ': no se ve'); continue; }
      const k = pan.getBoundingClientRect().width / pan.offsetWidth, rh = h.getBoundingClientRect(), ro = o.getBoundingClientRect(), co = getComputedStyle(o);
      if (h.__fija) { fijas++; continue; } /* el botón vive dentro de una captura: su caja se declara a mano */
      if (o.offsetWidth * o.offsetHeight > 0.45 * pan.offsetWidth * pan.offsetHeight) { mal.push(de + ': el objetivo es la pantalla entera (' + o.className + ')'); continue; }
      const a = HALO_AIRE * k, dif = Math.max(Math.abs(rh.left + a - ro.left), Math.abs(rh.top + a - ro.top), Math.abs(rh.right - a - ro.right), Math.abs(rh.bottom - a - ro.bottom));
      const r = Math.min(parseFloat(co.borderTopLeftRadius) || 0, o.offsetWidth / 2, o.offsetHeight / 2), rq = r ? r + HALO_AIRE : 0;
      const pt = document.elementsFromPoint((ro.left + ro.right) / 2, (ro.top + ro.bottom) / 2);
      if (dif > 4) mal.push(de + ': caja a ' + dif.toFixed(1) + ' px de ' + o.className);
      else if (Math.abs(parseFloat(h.style.borderRadius) - rq) > 0.5) mal.push(de + ': radio ' + h.style.borderRadius + ' y el de ' + o.className + ' es ' + r);
      else if (!pt.includes(o)) mal.push(de + ': ' + o.className + ' no está a la vista');
      /* y la marca del toque cae dentro de la caja de lo que se toca */
      vozSalto = true; tI = (t + 0.04) * 1000; pintaIntro();
      const m = ag.querySelector('.toque'), rm = m.getBoundingClientRect(), r2 = o.getBoundingClientRect(), mx = (rm.left + rm.right) / 2, my = (rm.top + rm.bottom) / 2;
      if (!(+getComputedStyle(m).opacity > 0.3)) marcas.push(de + ': la marca del toque no se ve');
      else if (mx < r2.left - 1 || mx > r2.right + 1 || my < r2.top - 1 || my > r2.bottom + 1) marcas.push(de + ': la marca cae fuera de ' + o.className);
    }
    pausaI = false; return { n: TOQUES.length, fijas, mal, marcas };
  });
  /* el avatar del tablero es pequeño y su cabecera cabe en una línea; ninguna foto redonda pasa de su tamaño */
  const cabT = await p.evaluate(() => { const c = document.querySelector('#cine .pMesa .cab'), f = c.querySelector('.foto'), lg = c.querySelector('.lg'); const fotos = [...document.querySelectorAll('#cine .foto')].map((e) => Math.max(e.offsetWidth, e.offsetHeight));
    return { foto: Math.max(f.offsetWidth, f.offsetHeight), alto: c.offsetHeight, linea: Math.abs((f.offsetTop + f.offsetHeight / 2) - (lg.offsetTop + lg.offsetHeight / 2)), mayor: Math.max(...fotos), n: fotos.length }; });
  ok(cabT.foto > 0 && cabT.foto <= 40 && cabT.alto <= 48 && cabT.linea <= 6 && cabT.mayor <= 64, 'película: el avatar del tablero mide ≤ 40 px (' + cabT.foto + '), su cabecera cabe en una línea (' + cabT.alto + ' px de alto) y ninguna de las ' + cabT.n + ' fotos redondas pasa de 64 px (' + cabT.mayor + ')');
  /* «Invitar a Sofía»: en cada acercamiento la parte es lo de Sofía entre quienes invitan en ese instante, y al final el total del teléfono es el del cuadro grande */
  const inv = await p.evaluate(() => { pausaI = true; const mal = [], vis = (e) => { const c = getComputedStyle(e); return c.visibility !== 'hidden' && +c.opacity > 0.5; }, txt = (sel) => [...document.querySelectorAll(sel)].filter(vis).map((e) => e.textContent.trim()).join('|');
    const ix = TOMAS.findIndex((x) => x[0] === 'cuenta'); let n = 0;
    for (const k of [0, 2, 3].sort((a, b) => ENTRA[a] - ENTRA[b])) { const tq = TOQUES.find((o) => o[0] === '.agQ' + k && o[1] === 271 && o[3] >= T0[ix] && o[3] < T0[ix + 1]); if (!tq) { mal.push('sin toque de invitar para ' + k); continue; }
      n++; vozSalto = true; tI = (tq[3] + 0.7) * 1000; pintaIntro(); const parte = txt('#cine .agQ' + k + ' .cpar u'), esp = pesoF(QSOFIA / n); if (parte !== esp) mal.push(QUIEN[k][3] + ': dice ' + parte + ' y son ' + esp + ' (entre ' + n + ')'); }
    vozSalto = true; tI = (T0[ix + 1] - 1.2) * 1000; pintaIntro();
    for (const k of [0, 2, 3]) { const tel = txt('#cine .agQ' + k + ' .ktot i'), gr = txt('#cine .cq' + k + ' .vt i'); if (!tel || tel !== gr) mal.push(QUIEN[k][3] + ': total del teléfono ' + tel + ' y del cuadro ' + gr); }
    pausaI = false; return { n, mal }; });
  ok(inv.n === 3 && inv.mal.length === 0, 'película: en cada acercamiento de «Invitar a Sofía» la parte es lo de Sofía entre quienes invitan en ese instante, y el total del teléfono es el del cuadro grande ' + inv.mal.join(' | '));
  ok(hal.marcas.length === 0, 'película: toda marca de toque cae dentro de la caja de lo que se toca (' + hal.n + ' toques) ' + hal.marcas.slice(0, 6).join(' | '));
  ok(hal.n >= 40 && hal.mal.length === 0, 'película: cada resaltado coincide con la caja de lo que se toca (± 4 px), tiene su radio y se ve (' + hal.n + ' toques, ' + hal.fijas + ' con caja declarada dentro de una captura) ' + hal.mal.slice(0, 6).join(' | '));
  await p.click('.ictl [data-intro="saltar"]'); await p.waitForTimeout(200);
}
await p.reload(); await p.waitForTimeout(400);
ok(!(await p.isVisible('#intro')), 'la presentación no se repite sola');
await p.close();

// ---------- otros tamaños, y una pasada con las fuentes bloqueadas: nada de texto fuera de su caja ----------
const fuera = async (q, etiqueta) => {
  const malos = await q.evaluate(() => {
    const out = [];
    document.querySelectorAll('svg').forEach((s) => {
      const r = s.getBoundingClientRect(); if (!r.width || s.closest('#intro')) return;
      s.querySelectorAll('text').forEach((t) => { const b = t.getBoundingClientRect(); if (!b.width) return; if (+getComputedStyle(t).opacity < 0.3) return; if (b.left < r.left - 3 || b.right > r.right + 3 || b.top < r.top - 3 || b.bottom > r.bottom + 3) out.push(t.textContent.slice(0, 28)); });
    });
    document.querySelectorAll('.kpi, .box .q, .box .c').forEach((e) => { if (e.scrollWidth > e.clientWidth + 2) out.push('caja: ' + e.textContent.slice(0, 28)); });
    return out;
  });
  ok(malos.length === 0, `${etiqueta}: texto dentro de su caja ${malos.slice(0, 4).join(' | ')}`);
};
/* hovers: ningún panel pasa de 25 palabras; cada cifra grande sale del modelo o del capítulo; el panel cabe en pantalla */
async function revisaHovers(q, alcance, et) {
  const r = await q.evaluate((sel) => {
    const raiz = document.querySelector(sel) || document;
    const tips = [...raiz.querySelectorAll('[data-tip]')];
    const largos = [], sinOrigen = [];
    const nums = new Set();
    const junta = (t) => (String(t).match(/-?\d[\d,]*\.?\d*/g) || []).forEach((x) => { const v = parseFloat(x.replace(/,/g, '')); if (!isNaN(v)) { nums.add(Math.round(v)); nums.add(Math.round(v * 10) / 10); nums.add(Math.round(v * 100) / 100); } });
    junta(document.body.textContent);
    try { junta(JSON.stringify(SP)); junta(JSON.stringify(D)); junta(JSON.stringify(MOD.resumen(config(S), sup(S)))); junta(JSON.stringify(MOD.desgloses(config(S), sup(S), 1000))); junta(JSON.stringify(MOD.recursos(config(S), sup(S), 'hoy'))); junta(JSON.stringify(MOD.tablaSueldos(config(S), sup(S)))); junta(JSON.stringify(MOD.modelosDeIngreso(config(S), sup(S)))); junta(JSON.stringify(MOD.modeloDeNegocio(config(S), sup(S)))); junta(JSON.stringify(MOD.potencialChef(config(S), sup(S)))); junta(JSON.stringify(MOD.meta12Meses(config(S), sup(S)))); junta(JSON.stringify(MOD.historiaDelDisco(config(S), sup(S)))); junta(JSON.stringify(MOD.visionV2(config(S), sup(S)))); junta(JSON.stringify(MOD.potencialPorTramo(config(S), sup(S)))); } catch (e) { return { modeloNoCargo: String(e && e.message || e) }; }
    const vistos = new Set();
    tips.forEach((e) => {
      const t = e.dataset.tip; if (vistos.has(t)) return; vistos.add(t);
      const partes = t.split('|'), palabras = (partes[0] + ' ' + (partes[1] || '') + ' ' + partes.slice(2).join(' ')).trim().split(/\s+/).length;
      if (palabras > 25) largos.push(palabras + ': ' + t.slice(0, 60));
      (partes[1] || '').match(/\d[\d,]{3,}(\.\d+)?/g)?.forEach((x) => { const v = parseFloat(x.replace(/,/g, '')); if (!nums.has(v) && !nums.has(Math.round(v))) sinOrigen.push(x + ' en «' + partes[0].slice(0, 30) + '»'); });
    });
    return { n: vistos.size, largos, sinOrigen };
  }, alcance);
  if (r.modeloNoCargo) { ok(false, `${et}: el modelo no cargó (${r.modeloNoCargo}): no se pueden comparar las cifras`); return; }
  ok(r.largos.length === 0, `${et}: ningún panel pasa de 25 palabras ${r.largos.slice(0, 3).join(' | ')}`);
  ok(r.sinOrigen.length === 0, `${et}: cada cifra grande de un panel sale del modelo o del capítulo ${r.sinOrigen.slice(0, 3).join(' | ')}`);
  const cab = await q.evaluate((sel) => {
    const raiz = document.querySelector(sel) || document, malos = [], vistos = new Set();
    const els = [...raiz.querySelectorAll('[data-tip]')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < innerHeight && !vistos.has(e.dataset.tip) && vistos.add(e.dataset.tip); }).slice(0, 14);
    const tt = document.getElementById('tt');
    els.forEach((e) => { e.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); const b = tt.getBoundingClientRect(); if (tt.hidden || b.left < -1 || b.top < -1 || b.right > innerWidth + 1 || b.bottom > innerHeight + 1) malos.push((e.dataset.tip || '').slice(0, 30)); });
    tt.hidden = true; return { n: els.length, malos };
  }, alcance);
  ok(cab.malos.length === 0, `${et}: el panel cabe en pantalla (${cab.n} probados) ${cab.malos.slice(0, 3).join(' | ')}`);
}
async function pasada(w, h, bloqueadas) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h } });
  if (bloqueadas) { await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '*{font-family:Arial,Helvetica,sans-serif!important}'; document.head.appendChild(s); }); }); }
  const q = await ctx.newPage();
  q.on('console', (m) => m.type() === 'error' && !(bloqueadas && m.text().includes('ERR_FAILED')) && errores.push(`${w}${bloqueadas ? 'f' : ''}: ${m.text()}`));
  q.on('pageerror', (e) => errores.push(`${w}: ${String(e.stack).split('\n').slice(0, 2).join(' | ')}`));
  await q.goto(url); await q.evaluate(() => document.fonts.ready);
  const et = `${w}×${h}${bloqueadas ? ' sin fuentes' : ''}`;
  await sinDesborde(q, `${et} portada`); await fuera(q, `${et} portada`); await revisaHovers(q, '#kpis', `${et} cifras de arriba`);
  if (png && w < 600) await q.screenshot({ path: `${png}/v5_${w}_portada.png`, fullPage: true });
  const ids = await q.$$eval('.cap', (b) => b.map((x) => x.dataset.cap));
  for (const id of ids) {
    await q.evaluate((i) => document.getElementById('cap-' + i).scrollIntoView(), id); await q.waitForTimeout(w < 600 ? 500 : 900);
    await sinDesborde(q, `${et} ${id}`); await fuera(q, `${et} ${id}`); await revisaHovers(q, '#cap-' + id, `${et} ${id}`);
    if (png && w < 600) await q.screenshot({ path: `${png}/v5_${w}_${id}.png` });
  }
  await ctx.close();
}
for (const [w, h] of [[1920, 1080], [1440, 900], [1366, 768], [1280, 720], [768, 1024], [390, 844]]) await pasada(w, h, false);
await pasada(1440, 900, true);
await pasada(1280, 720, true);
await nav.close();
console.log('errores de consola:', errores.length, errores.slice(0, 6).join(' | '), '· fallas:', fallos);
process.exit(fallos || errores.length ? 1 : 0);
