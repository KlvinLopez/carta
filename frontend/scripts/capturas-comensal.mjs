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
 * (con un alérgeno descartado), menu-agotado, menu-cargando y menu-limite (429); y la hoja de filtros
 * en horizontal (844×390), en un teléfono bajo (375×568) y con el texto al 200 %. Detalle del platillo
 * (T-2.6): detalle-foto (con calorías y picante), detalle-ilustracion, detalle-agotado,
 * detalle-no-encontrado, detalle-cargando, detalle-horizontal (844×390) y detalle-zoom200. T-2.7:
 * menu-copia-sin-conexion (la última copia guardada, sin mesa) y menu-banner-sin-conexion (sin red, menú fresco).
 *
 * También **comprueba** y sale con código ≠ 0 si: algún control tocable del menú o de la hoja mide menos
 * de 44 px de alto, el botón «Ver N platillos» queda fuera de la ventana al abrir la hoja, o el detalle del platillo
 * se desborda a lo ancho (también apaisado y al 200 %).
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

// La frase del aviso de copia se lee del componente: si cambia su texto, el script no se desfasa (T-2.7).
const FRASE_COPIA = /copia: '([^']+)'/.exec(readFileSync(join(frontend, 'src', 'comensal', 'entrada', 'AvisoConexion.tsx'), 'utf8'))?.[1];
if (!FRASE_COPIA) throw new Error('No encuentro el texto del aviso de copia en AvisoConexion.tsx');
const AVISO_COPIA = new RegExp(FRASE_COPIA.slice(0, 40).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

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
  import { PlatilloVista } from './comensal/platillo/Platillo';
  import { CODIGO_SEMILLA, crearServicioEntradaSimulado, errorSimulado } from './mocks/servicioEntradaSimulado';
  import { crearMenuSemilla, crearServicioMenuSimulado } from './mocks/servicioMenuComensalSimulado';
  import { crearServicioPlatilloSimulado } from './mocks/servicioPlatilloSimulado';
  
  const p = new URLSearchParams(location.search).get('p');
  const idDe = (nombre) => crearMenuSemilla().categorias.flatMap((c) => c.platillos).find((x) => x.nombre === nombre).id;
  if (p && p.startsWith('platillo-')) {
    // Detalle del platillo (T-2.6): con foto (y calorías), con ilustración, agotado, no encontrado, cargando.
    const chiles = idDe('Chiles rellenos de queso');
    const nombre = { 'platillo-foto': 'Chiles rellenos de queso', 'platillo-ilustracion': 'Churros con chocolate', 'platillo-agotado': 'Pescado a la veracruzana', 'platillo-no-encontrado': 'Mole poblano', 'platillo-cargando': 'Mole poblano' }[p];
    const sim = crearServicioPlatilloSimulado({ ajustes: { [chiles]: { calorias: 420 } }, noExisten: p === 'platillo-no-encontrado' ? [idDe('Mole poblano')] : [] });
    if (p === 'platillo-cargando') sim.retener();
    const analitica = { registrar: () => undefined, vaciar: () => undefined, detener: () => undefined };
    createRoot(document.getElementById('app')!).render(
      <PlatilloVista id={idDe(nombre)} servicio={sim.servicio} analitica={analitica} onVolver={() => undefined} />,
    );
  } else if (p && p.startsWith('menu-')) {
    const menuSim = crearServicioMenuSimulado({
      error: p === 'menu-limite' ? errorSimulado(429, 'DEMASIADAS_PETICIONES', 'x', 12) : undefined,
    });
    if (p === 'menu-cargando') menuSim.retener();
    let filtros = { alergenos: [], etiquetas: [] };
    const almacen = { leer: () => filtros, guardar: (f) => { filtros = f; } };
    const analitica = { registrar: () => undefined, vaciar: () => undefined, detener: () => undefined };
    createRoot(document.getElementById('app')!).render(
      <Menu slug="la-ceiba" mesa={p === 'menu-copia' ? null : 7} aviso={{ 'menu-copia': 'copia', 'menu-sin-red': 'sin_conexion' }[p] ?? null} servicio={menuSim.servicio} analitica={analitica} almacen={almacen} onVolver={() => undefined} onAbrir={() => undefined} />,
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
  // T-2.7: la última copia guardada (sin haber entrado a la mesa) y el aviso general de «sin conexión»: uno a la vez.
  await ir('menu-copia', menu);
  await pagina.getByText(AVISO_COPIA).waitFor();
  await pagina.screenshot({ path: join(salida, 'menu-copia-sin-conexion.png') });
  await ir('menu-sin-red', menu);
  await pagina.getByText(/^Sin conexión\./).waitFor();
  await pagina.screenshot({ path: join(salida, 'menu-banner-sin-conexion.png') });
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

  // ── Comprobaciones de tamaño y de visibilidad (jsdom no mide) ───────────────────────────
  const fallos = [];
  const medir = async (etiqueta) => {
    const chicos = await pagina.evaluate(() =>
      [...document.querySelectorAll('button, [role="button"], input, a[href]')]
        .map((el) => ({ el, r: el.getBoundingClientRect(), css: getComputedStyle(el) }))
        .filter(({ r, css }) => r.width > 0 && r.height > 0 && css.visibility !== 'hidden')
        .filter(({ r }) => r.height < 43.5)
        .map(({ el, r }) => `${(el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40)} (${Math.round(r.height)} px)`),
    );
    for (const c of chicos) fallos.push(`${etiqueta}: control de menos de 44 px de alto: ${c}`);
  };
  const sinDesbordeAncho = async (etiqueta) => {
    const [ancho, visible] = await pagina.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    if (ancho > visible + 1) fallos.push(`${etiqueta}: la página se desborda a lo ancho (${ancho} > ${visible})`);
  };
  const botonAplicarVisible = async (etiqueta) => {
    const caja = await pagina.getByRole('button', { name: /^Ver \d+ platillos?$/ }).boundingBox();
    const ventana = pagina.viewportSize();
    if (!caja || caja.y < 0 || caja.y + caja.height > ventana.height) {
      fallos.push(`${etiqueta}: «Ver N platillos» queda fuera de la ventana (${JSON.stringify(caja)} en ${ventana.width}×${ventana.height})`);
    }
  };
  await ir('menu-inicio', menu);
  await medir('menu 390×844');
  for (const [modo, texto, etiqueta] of [
    ['menu-copia', AVISO_COPIA, 'menu con aviso de copia'],
    ['menu-sin-red', /^Sin conexión\./, 'menu con banner sin conexión'],
  ]) {
    await ir(modo, menu);
    await pagina.getByText(texto).waitFor();
    await medir(etiqueta);
    const avisos = await pagina.locator('p[role="status"]').filter({ hasText: /conexión|copia/ }).count();
    if (avisos !== 1) fallos.push(`${etiqueta}: debe haber un solo aviso de conexión y hay ${avisos}`);
    await sinDesbordeAncho(etiqueta);
  }
  const configuraciones = [
    { nombre: 'menu-filtros-390', ancho: 390, alto: 844 },
    { nombre: 'menu-filtros-horizontal', ancho: 844, alto: 390 },
    { nombre: 'menu-filtros-bajo', ancho: 375, alto: 568 },
    { nombre: 'menu-filtros-zoom200', ancho: 390, alto: 844, zoom: true },
  ];
  for (const c of configuraciones) {
    await pagina.setViewportSize({ width: c.ancho, height: c.alto });
    await ir('menu-filtros', menu);
    if (c.zoom) await pagina.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await pagina.getByRole('button', { name: 'Filtros' }).click();
    await pagina.getByRole('dialog').waitFor();
    await pagina.waitForTimeout(600);
    await medir(c.nombre);
    await botonAplicarVisible(c.nombre);
    await pagina.screenshot({ path: join(salida, `${c.nombre}.png`) });
  }

  // ── Detalle del platillo (T-2.6) ───────────────────────────────────────────────────────
  const sinDesborde = async (etiqueta) => {
    const [ancho, visible] = await pagina.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    if (ancho > visible + 1) fallos.push(`${etiqueta}: la página se desborda a lo ancho (${ancho} > ${visible})`);
    const cortados = await pagina.evaluate(() =>
      [...document.querySelectorAll('button')].filter((b) => [...b.querySelectorAll('span'), b].some((n) => n.scrollWidth > n.clientWidth + 1)).map((b) => (b.textContent || '').trim().slice(0, 40)),
    );
    for (const c of cortados) fallos.push(`${etiqueta}: el texto del botón se corta: ${c}`);
  };
  await pagina.setViewportSize({ width: 390, height: 844 });
  const detalles = [
    ['platillo-foto', 'Chiles rellenos de queso', 'detalle-foto'],
    ['platillo-ilustracion', 'Churros con chocolate', 'detalle-ilustracion'],
    ['platillo-agotado', 'Pescado a la veracruzana', 'detalle-agotado'],
    ['platillo-no-encontrado', 'Este platillo ya no está en el menú', 'detalle-no-encontrado'],
  ];
  for (const [modo, encabezado, archivo] of detalles) {
    await ir(modo, titulo(encabezado));
    await guardar(archivo);
    await medir(archivo);
    await sinDesborde(archivo);
  }
  await ir('platillo-cargando', () => pagina.getByRole('status').waitFor());
  await guardar('detalle-cargando');
  await medir('detalle-cargando');
  // Apaisado (844×390) y con el texto al 200 %: utilizables, sin desbordes y con el botón de volver a la vista.
  await pagina.setViewportSize({ width: 844, height: 390 });
  await ir('platillo-foto', titulo('Chiles rellenos de queso'));
  await pagina.screenshot({ path: join(salida, 'detalle-horizontal.png') });
  await medir('detalle-horizontal');
  await sinDesborde('detalle-horizontal');
  const volver = await pagina.getByRole('button', { name: 'Volver al menú' }).boundingBox();
  if (!volver || volver.y < 0 || volver.y + volver.height > 390) fallos.push('detalle-horizontal: «Volver al menú» queda fuera de la ventana');
  await pagina.setViewportSize({ width: 390, height: 844 });
  await ir('platillo-foto', titulo('Chiles rellenos de queso'));
  await pagina.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  await pagina.waitForTimeout(500);
  await guardar('detalle-zoom200');
  await medir('detalle-zoom200');
  await sinDesborde('detalle-zoom200');

  if (fallos.length > 0) {
    console.error('Comprobaciones fallidas:\n - ' + fallos.join('\n - '));
    process.exitCode = 1;
  } else {
    console.log('Comprobaciones de tamaño táctil y de botón visible: ok');
  }
  console.log(`Capturas en ${salida}`);
} finally {
  await navegador?.close();
  await servidor?.close();
  limpiar();
}
