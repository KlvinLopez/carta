#!/usr/bin/env node
/**
 * Capturas de la entrada del comensal (T-2.4) contra el servicio simulado, a 390×844 con
 * deviceScaleFactor 2. No es parte de la CI.
 *
 *   node frontend/scripts/capturas-comensal.mjs [carpeta-de-salida]
 *
 * Como `capturas-admin.mjs`: levanta Vite con una página temporal (`captura-comensal.html` +
 * `src/captura-comensal.tsx`, que se borran al terminar) y usa Playwright. Genera: bienvenida,
 * alias-edicion, mesa-invalida, mesa-llena, sesion-cerrada, sin-conexion, error-generico, sin-lugar
 * («No pudimos guardar tu lugar»), cargando; y el menú (T-2.5): menu-inicio (con «Top 3 del chef»),
 * menu-lista (más abajo), menu-busqueda, menu-sin-resultados, menu-filtros (hoja), menu-filtrado
 * (con un alérgeno descartado), menu-agotado, menu-cargando y menu-limite (429).
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

const limpiar = () => {
  rmSync(html, { force: true });
  rmSync(tsx, { force: true });
};
// Ctrl-C también deja el repositorio como estaba.
process.on('SIGINT', () => {
  limpiar();
  process.exit(130);
});
let servidor;
let navegador;
try {
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
  import { Menu } from './comensal/menu/Menu';
  import { CODIGO_SEMILLA, crearServicioEntradaSimulado, errorSimulado } from './mocks/servicioEntradaSimulado';
  import { crearServicioMenuSimulado } from './mocks/servicioMenuComensalSimulado';
  
  const p = new URLSearchParams(location.search).get('p');
  if (p && p.startsWith('menu-')) {
    const menuSim = crearServicioMenuSimulado({
      error: p === 'menu-limite' ? errorSimulado(429, 'DEMASIADAS_PETICIONES', 'x', 12) : undefined,
    });
    if (p === 'menu-cargando') menuSim.retener();
    let filtros = { alergenos: [], etiquetas: [] };
    const almacen = { leer: () => filtros, guardar: (f) => { filtros = f; } };
    const analitica = { registrar: () => undefined, vaciar: () => undefined, detener: () => undefined };
    createRoot(document.getElementById('app')!).render(
      <Menu slug="la-ceiba" mesa={7} servicio={menuSim.servicio} analitica={analitica} almacen={almacen} onVolver={() => undefined} onAbrir={() => undefined} />,
    );
  } else {
  const opciones = {
    bienvenida: {},
    'mesa-invalida': { errores: { entrar: errorSimulado(404, 'MESA_NO_ENCONTRADA') } },
    'mesa-llena': { ocupados: 12 },
    'sesion-cerrada': { errores: { estado: errorSimulado(410, 'SESION_CERRADA') } },
    'sin-conexion': { errores: { entrar: errorSimulado(0, 'SIN_RED') } },
    'error-generico': { errores: { entrar: errorSimulado(500, 'ERROR_INTERNO') } },
    'sin-lugar': { errores: { estado: errorSimulado(401, 'SIN_CREDENCIAL') } },
  }[p] ?? {};
  const sim = crearServicioEntradaSimulado({ ...opciones, restaurante: { nombre: 'La Ceiba' } });
  if (p === 'cargando') sim.retener('entrar');
  if (p === 'bienvenida' || p === 'alias') { sim.sentarOtro(); sim.sentarOtro(); }
  createRoot(document.getElementById('app')!).render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
  }
  `,
  );
  servidor = await createServer({ root: frontend, server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await servidor.listen();
  const origen = `http://127.0.0.1:${servidor.httpServer.address().port}`;
  navegador = await chromium.launch();
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const pagina = await ctx.newPage();
  pagina.on('console', (m) => m.type() === 'error' && console.error('consola:', m.text()));
  // Las fotos del menú simulado viven en un dominio inventado: se sirve una imagen de relleno para ver el diseño con foto.
  await pagina.route('https://fotos.carta.example/**', (ruta) => {
    const tono = [24, 38, 52, 205][Math.floor(Math.random() * 4)];
    ruta.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180"><defs><radialGradient id="g" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="hsl(' + tono + ',60%,62%)"/><stop offset="1" stop-color="hsl(' + tono + ',55%,32%)"/></radialGradient></defs><rect width="240" height="180" fill="url(#g)"/><circle cx="120" cy="90" r="46" fill="hsl(' + tono + ',70%,85%)" opacity=".85"/></svg>',
    });
  });
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
  await ir('sin-lugar', titulo('No pudimos guardar tu lugar'));
  await guardar('sin-lugar');

  // ── Menú (T-2.5) ──────────────────────────────────────────────────────────────────────
  const menu = titulo('La Ceiba');
  await ir('menu-cargando', () => pagina.getByRole('status').waitFor());
  await guardar('menu-cargando');
  await ir('menu-limite', titulo('Vamos un poco rápido'));
  await guardar('menu-limite');
  await ir('menu-inicio', menu);
  await pagina.getByRole('region', { name: 'Top 3 del chef' }).waitFor();
  await pagina.screenshot({ path: join(salida, 'menu-inicio.png') }); // sólo lo que se ve al abrir
  await guardar('menu-lista');
  await pagina.getByRole('heading', { name: 'Pescado a la veracruzana' }).scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(300);
  await pagina.screenshot({ path: join(salida, 'menu-agotado.png') });
  await ir('menu-busqueda', menu);
  await pagina.getByRole('searchbox', { name: 'Buscar en el menú' }).fill('PINA');
  await pagina.waitForTimeout(400);
  await guardar('menu-busqueda');
  await pagina.getByRole('searchbox', { name: 'Buscar en el menú' }).fill('sushi');
  await pagina.waitForTimeout(400);
  await guardar('menu-sin-resultados');
  await ir('menu-filtros', menu);
  await pagina.getByRole('button', { name: 'Filtros' }).click();
  await pagina.getByRole('dialog').waitFor();
  await pagina.getByRole('button', { name: 'Lácteos' }).click();
  await pagina.getByRole('button', { name: 'Gluten', exact: true }).click();
  await pagina.getByRole('button', { name: 'Vegetariano' }).click();
  await pagina.waitForTimeout(500);
  await pagina.screenshot({ path: join(salida, 'menu-filtros.png') });
  await pagina.getByRole('button', { name: /^Ver \d+ platillos?$/ }).click();
  await pagina.waitForTimeout(500);
  await guardar('menu-filtrado');
  console.log(`Capturas en ${salida}`);
} finally {
  await navegador?.close();
  await servidor?.close();
  limpiar();
}
