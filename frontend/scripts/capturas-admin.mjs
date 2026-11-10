#!/usr/bin/env node
/**
 * Capturas de Mesas, Personal y Ajustes (T-1.13) contra los servicios simulados, a 390×844 y
 * 1280×800 con deviceScaleFactor 2. No es parte de la CI.
 *
 *   node frontend/scripts/capturas-admin.mjs [carpeta-de-salida]
 *
 * Igual que `capturas-menu.mjs`: levanta Vite con una página temporal (`captura-admin.html` +
 * `src/captura-admin.tsx`, que se borran al terminar) y usa Playwright.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const salida = resolve(process.argv[2] ?? join(tmpdir(), 'capturas-admin'));
mkdirSync(salida, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { createServer } = await import(pathToFileURL(join(frontend, 'node_modules', 'vite', 'dist', 'node', 'index.js')).href);

const html = join(frontend, 'captura-admin.html');
const tsx = join(frontend, 'src', 'captura-admin.tsx');

writeFileSync(
  html,
  '<!doctype html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>captura</title></head><body><div id="app"></div><script type="module" src="/src/captura-admin.tsx"></script></body></html>',
);
writeFileSync(
  tsx,
  `import './compartido/tokens.css';
import './compartido/base.css';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { PantallaAjustesConServicio } from './admin/ajustes/PantallaAjustes';
import { PantallaMesasConServicio } from './admin/mesas/PantallaMesas';
import { PantallaPersonalConServicio } from './admin/personal/PantallaPersonal';
import { Pantalla } from './compartido/pantalla/Pantalla';
import { crearServicioAjustesSimulado, restauranteSemilla } from './mocks/servicioAjustesSimulado';
import { crearServicioMesasSimulado } from './mocks/servicioMesasSimulado';
import { crearServicioPersonalSimulado } from './mocks/servicioPersonalSimulado';

const pantalla = new URLSearchParams(location.search).get('p');
const r = restauranteSemilla;
const vista =
  pantalla === 'personal' ? (
    <PantallaPersonalConServicio servicio={crearServicioPersonalSimulado().servicio} restaurante={r} />
  ) : pantalla === 'ajustes' ? (
    <PantallaAjustesConServicio servicio={crearServicioAjustesSimulado().servicio} restaurante={r} alGuardar={() => {}} />
  ) : (
    <PantallaMesasConServicio servicio={crearServicioMesasSimulado().servicio} restaurante={r} />
  );
createRoot(document.getElementById('app')!).render(
  <MemoryRouter>
    <Pantalla escritorio>{vista}</Pantalla>
  </MemoryRouter>,
);
`,
);
const servidor = await createServer({ root: frontend, server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await servidor.listen();
const origen = `http://127.0.0.1:${servidor.httpServer.address().port}`;
const navegador = await chromium.launch();
try {
  for (const [nombre, ancho, alto] of [['movil', 390, 844], ['escritorio', 1280, 800]]) {
    const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    p.on('console', (m) => m.type() === 'error' && console.error('consola:', m.text()));
    const guardar = (que, completa = false) => p.screenshot({ path: join(salida, `${nombre}-${que}.png`), fullPage: completa });
    const reposo = () => p.waitForTimeout(500);

    await p.goto(`${origen}/captura-admin.html?p=mesas`);
    await p.getByRole('heading', { name: 'Mesa 1' }).waitFor();
    await guardar('mesas-lista', true);
    await p.getByRole('button', { name: 'Agregar mesas' }).click();
    await p.getByRole('dialog').waitFor();
    await reposo();
    await guardar('mesas-agregar');
    await p.keyboard.press('Escape');
    await p.getByRole('button', { name: 'Regenerar código de la mesa 2' }).click();
    await p.getByRole('dialog').waitFor();
    await reposo();
    await guardar('mesas-regenerar');

    await p.goto(`${origen}/captura-admin.html?p=personal`);
    await p.getByRole('heading', { name: 'Valeria Ruiz' }).waitFor();
    await guardar('personal-lista', true);
    await p.getByRole('button', { name: 'Agregar persona' }).click();
    await p.getByRole('dialog').waitFor();
    await p.getByLabel('Nombre').fill('Rosa Gil');
    await p.getByLabel('PIN (4 a 6 números)').fill('482913');
    await reposo();
    await guardar('personal-alta');
    await p.keyboard.press('Escape');
    await p.getByRole('button', { name: 'Dar de baja a Luis Ortega' }).click();
    await p.getByRole('dialog').waitFor();
    await reposo();
    await guardar('personal-baja');
    await p.keyboard.press('Escape');
    await p.getByRole('button', { name: /Dados de baja/ }).click();
    await guardar('personal-bajas');

    await p.goto(`${origen}/captura-admin.html?p=ajustes`);
    await p.getByRole('heading', { name: 'Tu restaurante' }).waitFor();
    await p.getByRole('button', { name: 'Copiar entrada del personal' }).waitFor();
    await guardar('ajustes', true);
    await p.getByLabel(/Logo/).fill('http://logo.example.com/a.png');
    await p.getByRole('button', { name: 'Guardar cambios' }).click();
    await p.getByText(/debe empezar con https/).waitFor();
    await guardar('ajustes-error', true);
    await ctx.close();
  }
  console.log(`Capturas en ${salida}`);
} finally {
  await navegador.close();
  await servidor.close();
  rmSync(html, { force: true });
  rmSync(tsx, { force: true });
}
