#!/usr/bin/env node
/**
 * Capturas de la entrada del comensal (T-2.4) contra el servicio simulado, a 390×844 con
 * deviceScaleFactor 2. No es parte de la CI.
 *
 *   node frontend/scripts/capturas-comensal.mjs [carpeta-de-salida]
 *
 * Como `capturas-admin.mjs`: levanta Vite con una página temporal (`captura-comensal.html` +
 * `src/captura-comensal.tsx`, que se borran al terminar) y usa Playwright. Genera: bienvenida,
 * alias-edicion, mesa-invalida, mesa-llena, sesion-cerrada, sin-conexion, error-generico, cargando.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const salida = resolve(process.argv[2] ?? join(tmpdir(), 'capturas-comensal'));
mkdirSync(salida, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { createServer } = await import(pathToFileURL(join(frontend, 'node_modules', 'vite', 'dist', 'node', 'index.js')).href);

const html = join(frontend, 'captura-comensal.html');
const tsx = join(frontend, 'src', 'captura-comensal.tsx');

writeFileSync(
  html,
  '<!doctype html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>captura</title></head><body><div id="app"></div><script type="module" src="/src/captura-comensal.tsx"></script></body></html>',
);
writeFileSync(
  tsx,
  `import './compartido/tokens.css';
import './compartido/base.css';
import { createRoot } from 'react-dom/client';
import { PantallaEntrada } from './comensal/entrada/PantallaEntrada';
import { CODIGO_SEMILLA, crearServicioEntradaSimulado, errorSimulado } from './mocks/servicioEntradaSimulado';

const p = new URLSearchParams(location.search).get('p');
const opciones = {
  bienvenida: {},
  'mesa-invalida': { errores: { entrar: errorSimulado(404, 'MESA_NO_ENCONTRADA') } },
  'mesa-llena': { ocupados: 12 },
  'sesion-cerrada': { errores: { estado: errorSimulado(410, 'SESION_CERRADA') } },
  'sin-conexion': { errores: { entrar: errorSimulado(0, 'SIN_RED') } },
  'error-generico': { errores: { entrar: errorSimulado(500, 'ERROR_INTERNO') } },
}[p] ?? {};
const sim = crearServicioEntradaSimulado({ ...opciones, restaurante: { nombre: 'La Ceiba' } });
if (p === 'cargando') sim.retener('entrar');
if (p === 'bienvenida' || p === 'alias') { sim.sentarOtro(); sim.sentarOtro(); }
createRoot(document.getElementById('app')!).render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
`,
);
const servidor = await createServer({ root: frontend, server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await servidor.listen();
const origen = `http://127.0.0.1:${servidor.httpServer.address().port}`;
const navegador = await chromium.launch();
try {
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const pagina = await ctx.newPage();
  pagina.on('console', (m) => m.type() === 'error' && console.error('consola:', m.text()));
  const ir = async (nombre, esperar) => {
    await pagina.goto(`${origen}/captura-comensal.html?p=${nombre}`);
    await esperar();
    await pagina.waitForTimeout(600);
  };
  const guardar = (que) => pagina.screenshot({ path: join(salida, `${que}.png`), fullPage: true });
  const titulo = (nombre) => () => pagina.getByRole('heading', { name: nombre }).waitFor();

  await ir('cargando', () => pagina.getByRole('status').waitFor());
  await guardar('cargando');
  await ir('bienvenida', titulo('Estás en la mesa 7'));
  await pagina.waitForTimeout(3300); // un sondeo: aparece «3 personas en la mesa»
  await guardar('bienvenida');
  await ir('alias', titulo('Estás en la mesa 7'));
  await pagina.getByRole('button', { name: /Cambiar mi nombre/ }).click();
  await pagina.getByRole('dialog').waitFor();
  await pagina.getByRole('textbox', { name: 'Tu nombre' }).fill('Luz 🍕');
  await pagina.waitForTimeout(500);
  await guardar('alias-edicion');
  await ir('mesa-invalida', titulo('No encontramos esta mesa'));
  await guardar('mesa-invalida');
  await ir('mesa-llena', titulo('Esta mesa ya está completa'));
  await guardar('mesa-llena');
  await ir('sesion-cerrada', titulo('La mesa se cerró'));
  await guardar('sesion-cerrada');
  await ir('sin-conexion', titulo('Sin conexión'));
  await guardar('sin-conexion');
  await ir('error-generico', titulo('Algo salió mal'));
  await guardar('error-generico');
  console.log(`Capturas en ${salida}`);
} finally {
  await navegador.close();
  await servidor.close();
  rmSync(html, { force: true });
  rmSync(tsx, { force: true });
}
