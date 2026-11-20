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
ok((await texto(p, '#topesR')).includes('Con tus topes: 6 mesas · 1 cuenta · 150 platillos'), 'capítulo 7: dice con qué topes está calculado (6 mesas · 1 cuenta · 150 platillos)');
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
for (const v of [50, 80, 100]) { await p.evaluate((x) => cambiar({ topePlatillos: x }), v); await p.waitForFunction((x) => document.querySelector('#svT') && document.querySelector('#svT').textContent.includes(String(x)), v, { timeout: 5000 }); ok((await texto(p, '#svT')).includes(String(v)), 'capítulo 6: el control marca ' + v + ' platillos'); }
await p.evaluate(() => cambiar({ topePlatillos: 150 })); await p.waitForTimeout(300);
await cierra(p);

// capítulo 7, segunda parte: quién llena el disco, la historia de la mesa, las formas de guardar y la combinación
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
await p.click('#svOp [data-op="contar_por_dia"]'); await p.waitForTimeout(400);
await p.click('#svOp [data-op="fila_por_visita"]'); await p.waitForTimeout(400);
const pl1 = await p.evaluate(() => S.palancas.slice());
ok(pl1.includes(FILA) && !pl1.includes(DIA), 'capítulo 7: la forma de guardar la analítica es una sola elección (elegir la fila por visita quita contar por día)');
await p.click('#palR [data-pal="' + DIA + '"]'); await p.waitForTimeout(400);
const pl2 = await p.evaluate(() => S.palancas.slice());
ok(pl2.includes(DIA) && !pl2.includes(FILA), 'capítulo 7: lo mismo desde las palancas del tablero (contar por día reemplaza la fila por visita)');
await p.click('#svOp [data-op="archivar_paga"]'); await p.waitForTimeout(400);
ok(await p.evaluate(() => S.palancas.includes('archivar_sesiones_de_paga') && S.palancas.includes('analitica_agregada_por_dia')), 'capítulo 7: archivar sólo la paga se suma a la forma elegida');
await p.click('#svOp [data-op="archivar_todos"]'); await p.waitForTimeout(400);
ok(await p.evaluate(() => S.palancas.includes('archivar_sesiones_de_todos_los_planes') && !S.palancas.includes('archivar_sesiones_de_paga') && S.palancas.includes('analitica_agregada_por_dia')), 'capítulo 7: los dos alcances del archivo son excluyentes y la forma se conserva');
await p.evaluate(() => cambiar({ palancas: [] })); await p.waitForTimeout(400);
const co = await texto(p, '#svCo');
const cmb = await p.evaluate(() => { const c = MOD.historiaDelDisco(config(S), sup(S)).combinaciones, v = (a, an, k) => c.find((x) => x.archivo === a && x.analitica === an)[k], H = 'una fila por evento (hoy)'; return [v('archivar sólo las de paga', H, 'caben_con_el_gratuito_a_12_meses_sin_purga'), v('archivar las de todos los planes', H, 'caben_con_el_gratuito_a_12_meses_sin_purga'), v('sin archivo', H, 'caben_con_historial_del_gratuito_a_30_dias'), c.length]; });
ok(co.includes(f7(cmb[0])) && co.includes(f7(cmb[1])) && co.includes(f7(cmb[2])) && cmb[3] === 24 && co.includes('archivar sólo la paga no alcanza') || co.includes('Archivar sólo la paga no alcanza'), 'capítulo 7: la combinación sale de historiaDelDisco().combinaciones (' + cmb.join(' · ') + ') y concluye que archivar sólo la paga no alcanza');
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
ok(cobT[0] === 20.6 && cobT[1] === 38.9, 'topes: cobertura de Chef (6 mesas, 1 cuenta, 150 platillos, cuenta todo): 20.6 / 38.9 (' + cobT.join(' ') + ')');
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
await p.click('#tabsK [data-vista="0"]'); await p.waitForTimeout(500);
await sinDesborde(p, 'sostiene'); await cierra(p);
// cuánto puede pagar
await abre(p, 'pagar');
ok((await p.$$('#svG .gh')).length >= 4, 'pagar: una imagen con punto de venta y Carta por tamaño');
if (png) await p.screenshot({ path: `${png}/v8_pagar.png` });
await sinDesborde(p, 'pagar'); await cierra(p);
// recomendaciones
await p.click('#verDecisiones'); await p.waitForTimeout(450);
ok((await p.$$('.rcard')).length === 8 && (await p.evaluate(() => REC.decisiones[1].id)) === 'tope_platillos', 'decisiones: ocho, y la 2 es el tope de platillos');
ok((await texto(p, '#r_tope_platillos')).includes('por decidir') && (await p.$$('#r_tope_platillos svg g[data-tip]')).length === 4, 'decisiones: el tope de platillos está por decidir, con las cuatro opciones a la vista');
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
await p.waitForTimeout(1500);
const t1 = await p.evaluate(() => tI);
await p.click('.ictl [data-intro="mas"]'); await p.waitForTimeout(100);
ok((await p.evaluate(() => tI)) - t1 >= 2900, 'presentación: +3 s adelanta');
await p.click('.ictl [data-intro="menos"]'); await p.waitForTimeout(100);
ok((await p.evaluate(() => tI)) < t1 + 2000, 'presentación: −3 s atrasa');
await p.click('.ictl [data-intro="pausa"]'); const tp = await p.evaluate(() => tI); await p.waitForTimeout(400);
ok((await p.evaluate(() => tI)) === tp, 'presentación: la pausa detiene el tiempo');
ok((await p.isVisible('#intro [data-pantalla]')) || !(await p.evaluate(() => FSOK)), 'presentación: pantalla completa dentro de la presentación');
ok(await p.evaluate(() => !!window.gsap && !!tlF), 'presentación: la línea de tiempo (GSAP) cargó');
await p.click('.cactos [data-n="1"]'); await p.waitForTimeout(80);
ok(Math.abs((await p.evaluate(() => tI / 1000)) - (await p.evaluate(() => ACT_INI[1]))) < 0.2, 'presentación: saltar al acto 2');
await p.click('.cactos [data-n="0"]'); await p.waitForTimeout(80);
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
