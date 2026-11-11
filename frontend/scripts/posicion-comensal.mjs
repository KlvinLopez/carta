#!/usr/bin/env node
/**
 * Al volver del detalle de un platillo, la tarjeta que se abrió debe quedar en la misma posición de la
 * ventana (T-2.6, ronda de revisión). jsdom no calcula alturas (y `content-visibility: auto` las estima),
 * así que se mide en Chromium real con un menú de 132 y de 222 platillos en 4 categorías.
 *
 *   node frontend/scripts/posicion-comensal.mjs [carpeta-de-salida]
 *
 * Por cada tamaño abre las tarjetas 5, 45 y 100 (y 200 con 222) desplazando con la rueda hasta dejarlas
 * a ~400 px de la ventana, toca, vuelve (botón de la pantalla y atrás del navegador, también con una
 * búsqueda escrita) y falla (código de salida ≠ 0) si |top_después − top_antes| > 4 px. Imprime los números.
 * También mide los milisegundos por fotograma al desplazar la lista (p95) con 222 platillos.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const salida = resolve(process.argv[2] ?? join(tmpdir(), 'posicion-comensal'));
mkdirSync(salida, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { createServer } = await import(pathToFileURL(join(frontend, 'node_modules', 'vite', 'dist', 'node', 'index.js')).href);

const html = join(frontend, 'captura-posicion.html');
const tsx = join(frontend, 'src', 'captura-posicion.tsx');
const limpiar = () => {
  rmSync(html, { force: true });
  rmSync(tsx, { force: true });
};
process.on('SIGINT', () => {
  limpiar();
  process.exit(130);
});
const TOLERANCIA_PX = 4;
let servidor;
let navegador;
const fallos = [];
try {
  writeFileSync(html, '<!doctype html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>posición</title></head><body><div id="app"></div><script type="module" src="/src/captura-posicion.tsx"></script></body></html>');
  writeFileSync(
    tsx,
    `import './compartido/tokens.css';
import './compartido/base.css';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SesionMesa } from './comensal/SesionMesa';
import { CODIGO_SEMILLA, crearServicioEntradaSimulado } from './mocks/servicioEntradaSimulado';
import { crearMenuGrande, crearServicioMenuSimulado } from './mocks/servicioMenuComensalSimulado';
import { crearServicioPlatilloSimulado } from './mocks/servicioPlatilloSimulado';

const n = Number(new URLSearchParams(location.search).get('n') ?? 132);
const menu = crearMenuGrande(n, Math.ceil(n / 4));
history.replaceState(null, '', '/m/' + CODIGO_SEMILLA + '/menu');
const entrada = crearServicioEntradaSimulado().servicio;
const menuSim = crearServicioMenuSimulado({ menu }).servicio;
const platillo = crearServicioPlatilloSimulado({ menu }).servicio;
const analitica = { registrar: () => undefined, vaciar: () => undefined, detener: () => undefined };
let filtros = { alergenos: [], etiquetas: [] };
const almacen = { leer: () => filtros, guardar: (f) => { filtros = f; } };
createRoot(document.getElementById('app')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/m/:codigo/*" element={<SesionMesa codigo={CODIGO_SEMILLA} servicio={entrada} servicioMenu={menuSim} servicioPlatillo={platillo} analitica={analitica} almacenFiltros={almacen} />} />
    </Routes>
  </BrowserRouter>,
);
`,
  );
  servidor = await createServer({ root: frontend, server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await servidor.listen();
  const origen = `http://127.0.0.1:${servidor.httpServer.address().port}`;
  navegador = await chromium.launch();
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  const pagina = await ctx.newPage();
  pagina.on('console', (m) => m.type() === 'error' && console.error('consola:', m.text()));
  await pagina.route('https://fotos.carta.example/**', (ruta) =>
    ruta.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180"><rect width="240" height="180" fill="#c9a96b"/></svg>' }),
  );

  const tarjetas = () => pagina.locator('section[id^="categoria-"] [data-platillo]');
  const abrirMenu = async (n) => {
    await pagina.goto(`${origen}/captura-posicion.html?n=${n}`);
    await pagina.getByRole('searchbox', { name: 'Buscar en el menú' }).waitFor();
    await pagina.waitForTimeout(400);
  };
  /** Desplaza con la rueda, como una persona (las secciones se van pintando), hasta dejar la tarjeta a ~400 px. */
  const llevarTarjetaA400 = async (indice) => {
    for (let i = 0; i < 400; i += 1) {
      const top = await tarjetas().nth(indice).evaluate((el) => el.getBoundingClientRect().top);
      if (top > 300 && top < 500) return top;
      await pagina.mouse.move(195, 400);
      await pagina.mouse.wheel(0, top > 500 ? Math.min(top - 400, 900) : Math.max(top - 400, -900));
      await pagina.waitForTimeout(40);
    }
    throw new Error(`no se pudo dejar la tarjeta ${indice} a 400 px`);
  };
  const topDe = (indice) => tarjetas().nth(indice).evaluate((el) => el.getBoundingClientRect().top);
  const enfocadaEs = (nombre) => pagina.evaluate((n) => document.activeElement?.getAttribute('aria-label') === n, nombre);

  const casos = [
    { n: 132, indices: [5, 45, 100] },
    { n: 222, indices: [5, 45, 100, 200] },
  ];
  const resultados = [];
  for (const { n, indices } of casos) {
    for (const indice of indices) {
      for (const como of ['pantalla', 'navegador', 'busqueda']) {
        await abrirMenu(n);
        let nombre;
        if (como === 'busqueda') {
          // Con una búsqueda activa la lista es más corta: la tarjeta 3 de «Platillo 1» (≈ 10 coincidencias).
          await pagina.getByRole('searchbox', { name: 'Buscar en el menú' }).fill('Platillo 1');
          await pagina.waitForTimeout(300);
        }
        const total = await tarjetas().count();
        const i = como === 'busqueda' ? Math.min(indice, Math.floor(total / 3)) : indice;
        const antes = await llevarTarjetaA400(i);
        nombre = await tarjetas().nth(i).getAttribute('aria-label');
        await tarjetas().nth(i).tap();
        await pagina.getByRole('heading', { level: 1, name: nombre.replace(/^Ver /, '') }).waitFor();
        await pagina.waitForTimeout(300);
        if (n === 132 && indice === 45 && como === 'pantalla') {
          await pagina.screenshot({ path: join(salida, 'detalle-sobre-el-menu.png') }); // la capa tapa al menú sin moverlo
          const ocultoBajoLaCapa = await pagina.evaluate(() => {
            const tapado = document.querySelector('[inert]');
            return { inert: tapado !== null, scrollY: window.scrollY };
          });
          if (!ocultoBajoLaCapa.inert) fallos.push('el menú bajo el detalle no está inert');
        }
        if (como === 'navegador') await pagina.goBack();
        else await pagina.getByRole('button', { name: 'Volver al menú' }).tap();
        await pagina.getByRole('searchbox', { name: 'Buscar en el menú' }).waitFor();
        await pagina.waitForTimeout(1000);
        const despues = await topDe(i);
        const desvio = Math.round((despues - antes) * 10) / 10;
        const enfocada = await enfocadaEs(nombre);
        resultados.push(`${n} platillos · tarjeta ${i} · ${como}: antes ${Math.round(antes)} px, después ${Math.round(despues)} px, desvío ${desvio} px, foco ${enfocada ? 'sí' : 'NO'}`);
        if (Math.abs(desvio) > TOLERANCIA_PX) fallos.push(`${n} platillos, tarjeta ${i}, ${como}: la tarjeta quedó a ${Math.round(despues)} px en vez de ${Math.round(antes)} px (desvío ${desvio} px)`);
        if (!enfocada) fallos.push(`${n} platillos, tarjeta ${i}, ${como}: el foco no volvió a la tarjeta`);
      }
    }
  }
  console.log(resultados.join('\n'));

  // Fluidez del desplazamiento con 222 platillos: milisegundos por fotograma (p95).
  await abrirMenu(222);
  const cdp = await ctx.newCDPSession(pagina);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); // un teléfono de gama media
  const ms = await pagina.evaluate(async () => {
    const tiempos = [];
    let previo = performance.now();
    let pasos = 0;
    await new Promise((listo) => {
      const paso = (t) => {
        tiempos.push(t - previo);
        previo = t;
        window.scrollBy(0, 60);
        pasos += 1;
        if (pasos < 240) requestAnimationFrame(paso);
        else listo(null);
      };
      requestAnimationFrame(paso);
    });
    tiempos.sort((a, b) => a - b);
    return { p50: tiempos[Math.floor(tiempos.length * 0.5)], p95: tiempos[Math.floor(tiempos.length * 0.95)] };
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  console.log(`desplazamiento con 222 platillos y la CPU ×4: p50 ${ms.p50.toFixed(1)} ms, p95 ${ms.p95.toFixed(1)} ms por fotograma`);

  if (fallos.length > 0) {
    console.error('Posición al volver: FALLA\n - ' + fallos.join('\n - '));
    process.exitCode = 1;
  } else {
    console.log(`Posición al volver: ok (desvío ≤ ${TOLERANCIA_PX} px en todos los casos)`);
  }
} finally {
  await navegador?.close();
  await servidor?.close();
  limpiar();
}
