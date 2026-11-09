#!/usr/bin/env node
/**
 * Capturas de la pantalla Menú (T-1.12) contra el servicio simulado: lista, editor, confirmación de
 * baja, guía de foto y recorte, a 390×844 y 1280×800 con deviceScaleFactor 2. No es parte de la CI.
 *
 *   node frontend/scripts/capturas-menu.mjs [carpeta-de-salida]
 *
 * Levanta Vite con una página temporal (`captura-menu.html` + `src/captura-menu.tsx`, que se borran al
 * terminar) y usa Playwright, que ya viene en el entorno de agente (`require('playwright')`).
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const salida = resolve(process.argv[2] ?? join(tmpdir(), 'capturas-menu'));
mkdirSync(salida, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { createServer } = await import(pathToFileURL(join(frontend, 'node_modules', 'vite', 'dist', 'node', 'index.js')).href);

const html = join(frontend, 'captura-menu.html');
const tsx = join(frontend, 'src', 'captura-menu.tsx');

writeFileSync(
  html,
  '<!doctype html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>captura</title></head><body><div id="app"></div><script type="module" src="/src/captura-menu.tsx"></script></body></html>',
);
writeFileSync(
  tsx,
  `import './compartido/tokens.css';
import './compartido/base.css';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { PantallaMenuConServicio } from './admin/menu/PantallaMenu';
import { Pantalla } from './compartido/pantalla/Pantalla';
import { crearServicioMenuSimulado, muchosPlatillos, platillosSemilla } from './mocks/servicioMenuSimulado';

const n = new URLSearchParams(location.search).get('n');
const base = platillosSemilla.map((p) => (p.nombre === 'Pastor' ? { ...p, imagen_tipo: 'foto' as const, foto_thumb_url: '/icono-192.png' } : p));
const sim = crearServicioMenuSimulado({ platillos: n ? muchosPlatillos(Number(n)) : base });
createRoot(document.getElementById('app')!).render(
  <MemoryRouter>
    <Pantalla escritorio>
      <PantallaMenuConServicio servicio={sim.servicio} restaurante={{ id: 'r1', nombre: 'Taquería El Paso', slug: 'x', tema: 'vino', activo: true } as never} />
    </Pantalla>
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
    await p.goto(`${origen}/captura-menu.html`);
    await p.getByRole('heading', { name: /^Tacos/ }).waitFor();
    const guardar = (que) => p.screenshot({ path: join(salida, `${nombre}-${que}.png`), fullPage: que === 'lista' });
    await guardar('lista');
    await p.getByRole('button', { name: 'Editar Pastor' }).click();
    await p.getByRole('dialog').waitFor();
    await p.waitForTimeout(500);
    await guardar('editor');
    await p.getByRole('button', { name: 'Cambiar foto' }).click();
    await p.getByRole('list', { name: 'Guía para una buena foto' }).waitFor();
    await p.waitForTimeout(400);
    await guardar('foto-guia');
    // Una «foto» PNG de 4:3 dibujada en el propio navegador (la app sólo acepta JPG, PNG y HEIC).
    const png = await p.evaluate(() => {
      const l = document.createElement('canvas');
      l.width = 1600;
      l.height = 1200;
      const c = l.getContext('2d');
      c.fillStyle = '#c8a078';
      c.fillRect(0, 0, 1600, 1200);
      for (const [r, color] of [[450, '#f0ebe1'], [300, '#963c28']]) {
        c.fillStyle = color;
        c.beginPath();
        c.arc(800, 600, r, 0, 7);
        c.fill();
      }
      return l.toDataURL('image/png').split(',')[1];
    });
    await p.getByLabel('Elegir foto').setInputFiles({ name: 'plato.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
    await p.getByRole('img', { name: /Vista previa/ }).waitFor();
    await p.waitForTimeout(400);
    await guardar('foto-recorte');
    await p.keyboard.press('Escape'); // sin cambios en el formulario: cierra directo
    await p.getByRole('switch', { name: 'Activo: Suadero' }).click();
    await p.getByRole('dialog', { name: /Dar de baja/ }).waitFor();
    await p.waitForTimeout(400);
    await guardar('baja');
    await ctx.close();
  }
  console.log(`Capturas en ${salida}`);
} finally {
  await navegador.close();
  await servidor.close();
  rmSync(html, { force: true });
  rmSync(tsx, { force: true });
}
