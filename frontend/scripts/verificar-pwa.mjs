#!/usr/bin/env node
/**
 * Verificación de la PWA del comensal en un Chromium real (T-2.7). Sale con código ≠ 0 si algo falla.
 *
 *   npm --prefix frontend run build
 *   (uvicorn con el build y la base sembrada: `uv run python scripts/seed.py`, «La Ceiba»)
 *   node frontend/scripts/verificar-pwa.mjs [origen]      # por omisión http://localhost:8000
 *
 * Necesita `psql` y `DATABASE_URL_SYNC` (o `CODIGO_MESA` y `DATABASE_URL_SYNC` sólo para el paso f) para
 * leer el código de una mesa de la semilla y marcar un platillo agotado; lo deja como estaba.
 * **El código de mesa es una credencial: este script nunca lo imprime** (todo lo que escribe pasa por `limpio`).
 *
 * Comprueba, contra el servidor real:
 *   a. primera visita a la mesa y al menú, SIN recargar: el service worker queda activo, controla la página y la copia
 *      del menú queda guardada;
 *   b. sin red, recargar en /m/<código>/menu: carga el armazón, el menú sale de la copia y el aviso lo dice;
 *      `GET /api/v1/p/sesion` no sale de ninguna caché;
 *   c. al volver la red el aviso se va y el menú se vuelve a pedir;
 *   d. ninguna clave de ninguna caché contiene el código de mesa, ni una ruta de la API que no sea el menú,
 *      ni ninguna ruta /m/…;
 *   e. sin red, `/api/v1/p/menu/no-existe` no devuelve un index.html; con red, `/wp-admin`, `/index` y `/health`
 *      llegan al servidor (404 JSON, 200), no al armazón;
 *   f. con la red puesta, un platillo marcado agotado en la base aparece agotado en ≤ 60 s (turno de 25 s del cliente +
 *      30 s del servidor) sin recargar, sin
 *      perder lo escrito en el buscador;
 *   g. `sw.js` se sirve `no-cache`; el manifest tiene nombre, start_url, display, íconos 192/512, maskable y
 *      theme_color; y Chromium no reporta errores de instalabilidad (`Page.getInstallabilityErrors`).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ORIGEN = (process.argv[2] ?? 'http://localhost:8000').replace(/\/$/, '');
const SLUG = 'la-ceiba';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

let codigo = '';
/** Nada de lo que se imprime puede llevar el código de mesa. */
const limpio = (texto) => {
  let t = String(texto);
  if (codigo) {
    for (const forma of [codigo, encodeURIComponent(codigo)]) t = t.split(forma).join('<codigo>');
  }
  return t;
};
const decir = (...partes) => console.log(limpio(partes.join(' ')));

const fallos = [];
function comprobar(nombre, condicion, detalle = '') {
  if (condicion) decir('  ✓', nombre);
  else {
    decir('  ✗', nombre, detalle ? `— ${detalle}` : '');
    fallos.push(nombre);
  }
}

function psql(sql) {
  const url = process.env.DATABASE_URL_SYNC;
  if (!url) throw new Error('Falta DATABASE_URL_SYNC (se usa psql para leer una mesa y marcar un platillo agotado).');
  return execFileSync('psql', [url, '-Atq', '-c', sql], { encoding: 'utf8' }).trim();
}

/** Todas las claves de todas las cachés del origen. */
const clavesDeCache = (pagina) =>
  pagina.evaluate(async () => {
    const salida = [];
    for (const nombre of await caches.keys()) {
      const cache = await caches.open(nombre);
      for (const peticion of await cache.keys()) salida.push({ cache: nombre, url: peticion.url });
    }
    return salida;
  });

const hayServiceWorkerActivo = (pagina) =>
  pagina.evaluate(async () => {
    const registro = await navigator.serviceWorker.getRegistration();
    return Boolean(registro?.active) && registro.active.state === 'activated';
  });

async function esperarA(condicion, { plazo = 15000, paso = 250 } = {}) {
  const limite = Date.now() + plazo;
  while (Date.now() < limite) {
    if (await condicion()) return true;
    await espera(paso);
  }
  return false;
}

async function main() {
  codigo = process.env.CODIGO_MESA ?? psql(`select m.codigo_publico from mesa m join restaurante r on r.id = m.restaurante_id where r.slug = '${SLUG}' and m.numero = 7`);
  if (!codigo) throw new Error('No hay una mesa 7 de «La Ceiba»: corre `uv run python scripts/seed.py`.');
  const rutaMenu = `/m/${codigo}/menu`;
  const navegador = await chromium.launch();
  let platilloAgotado = null;

  try {
    // ── g. cabeceras, manifest ───────────────────────────────────────────────
    decir('g. sw.js y manifest');
    const sw = await fetch(`${ORIGEN}/sw.js`);
    comprobar('sw.js responde 200 con JavaScript', sw.status === 200 && /javascript/.test(sw.headers.get('content-type') ?? ''));
    comprobar('sw.js se sirve no-cache (un despliegue que lo cambie o lo vacíe llega en la siguiente visita)', (sw.headers.get('cache-control') ?? '') === 'no-cache', sw.headers.get('cache-control') ?? '');
    const manifest = await (await fetch(`${ORIGEN}/manifest.webmanifest`)).json();
    const iconos = manifest.icons ?? [];
    comprobar('manifest: nombre, start_url, display y theme_color', Boolean(manifest.name && manifest.short_name) && manifest.start_url === '/' && manifest.display === 'standalone' && /^#[0-9a-fA-F]{6}$/.test(manifest.theme_color ?? ''));
    comprobar('manifest: íconos 192 y 512', ['192x192', '512x512'].every((t) => iconos.some((i) => i.sizes === t && i.type === 'image/png' && (i.purpose ?? 'any').includes('any'))));
    comprobar('manifest: un ícono maskable', iconos.some((i) => (i.purpose ?? '').includes('maskable')));

    // ── a. primera visita ────────────────────────────────────────────────────
    decir('a. primera visita');
    const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-MX' });
    const pagina = await contexto.newPage();
    const menuPedidos = [];
    pagina.on('request', (p) => {
      if (/\/api\/v1\/p\/menu\//.test(p.url())) menuPedidos.push(Date.now());
    });
    await pagina.goto(`${ORIGEN}/m/${codigo}`, { waitUntil: 'load' });
    await pagina.getByRole('heading', { name: /Estás en la mesa 7/ }).waitFor({ timeout: 20000 });
    comprobar('la bienvenida carga', true);
    await pagina.getByRole('button', { name: 'Ver el menú' }).click();
    await pagina.getByRole('heading', { name: 'La Ceiba', level: 1 }).waitFor({ timeout: 20000 });
    comprobar('el menú carga', true);
    comprobar('el service worker se activa', await esperarA(() => hayServiceWorkerActivo(pagina)));
    // Primera visita SIN recargar: el worker toma la página al activarse (`clients.claim()` sólo actúa en la primera
    // instalación) y el menú se vuelve a pedir una vez para dejar la copia guardada.
    comprobar('en la primera visita, sin recargar, la página queda controlada por el worker', await esperarA(() => pagina.evaluate(() => Boolean(navigator.serviceWorker.controller))));
    comprobar(
      'la copia del menú queda guardada',
      await esperarA(async () => (await clavesDeCache(pagina)).some((c) => c.url === `${ORIGEN}/api/v1/p/menu/${SLUG}`)),
    );

    // ── b. sin red ───────────────────────────────────────────────────────────
    decir('b. sin red: recargar en el menú');
    // El menú llega con `max-age=30`: si la recarga cayera dentro de esos 30 s, el propio navegador lo serviría de su
    // caché HTTP aun sin red (y con razón no se avisaría de copia). Se espera a que caduque para probar la copia del
    // worker. (Vaciarla por CDP no sirve: una segunda sesión CDP descuadra la emulación de «sin red».)
    decir('  · esperando 31 s reales (el menú trae max-age=30)…');
    await espera(31000);
    await contexto.setOffline(true);
    await pagina.reload({ waitUntil: 'load' }).catch((e) => {
      throw new Error(`La recarga sin red no cargó el armazón: ${e.message}`);
    });
    comprobar('el armazón carga sin red', (await pagina.title()) === 'Carta');
    await pagina.getByRole('heading', { name: 'La Ceiba', level: 1 }).waitFor({ timeout: 20000 });
    comprobar('el menú sale de la copia (se ven los platillos)', (await pagina.locator('section[id^="categoria-"] h3').count()) > 5);
    const aviso = pagina.getByText(/última copia del menú guardada/);
    comprobar('el aviso lo dice', await aviso.isVisible());
    comprobar('un solo aviso de conexión', (await pagina.locator('p[role="status"]').filter({ hasText: /conexión|copia/ }).count()) === 1);
    const sesionEnCache = await pagina.evaluate(async () => {
      const r = await caches.match(new Request('/api/v1/p/sesion'));
      let desdeRed = 'sin-respuesta';
      try {
        await fetch('/api/v1/p/sesion');
        desdeRed = 'respondio';
      } catch {
        desdeRed = 'error-de-red';
      }
      return { enCache: Boolean(r), desdeRed };
    });
    comprobar('GET /api/v1/p/sesion no está en ninguna caché', !sesionEnCache.enCache);
    comprobar('GET /api/v1/p/sesion sin red falla (no lo sirve el worker)', sesionEnCache.desdeRed === 'error-de-red', sesionEnCache.desdeRed);

    // ── e. rutas desconocidas ────────────────────────────────────────────────
    decir('e. rutas que no son de la SPA');
    const sinRed = await pagina.evaluate(async () => {
      try {
        const r = await fetch('/api/v1/p/menu/no-existe');
        return { tipo: 'respuesta', estado: r.status, html: (await r.text()).includes('<div id="app">') };
      } catch (e) {
        return { tipo: 'error', nombre: e.name };
      }
    });
    comprobar('/api/v1/p/menu/no-existe sin red no devuelve un index.html', sinRed.tipo === 'error' || sinRed.html === false, JSON.stringify(sinRed));
    const otraCopia = await pagina.evaluate(async () => Boolean(await caches.match(new Request('/api/v1/p/menu/no-existe'))));
    comprobar('un menú que nunca se guardó no tiene copia', !otraCopia);

    // ── c. vuelve la red ─────────────────────────────────────────────────────
    decir('c. vuelve la red');
    const antes = menuPedidos.length;
    await contexto.setOffline(false);
    comprobar('el aviso de copia se va', await esperarA(async () => !(await aviso.isVisible()), { plazo: 20000 }));
    comprobar('el menú se volvió a pedir', menuPedidos.length > antes, `${menuPedidos.length} peticiones, antes ${antes}`);
    await pagina.getByRole('heading', { name: 'La Ceiba', level: 1 }).waitFor({ timeout: 20000 });
    comprobar('sigue viéndose el menú', await pagina.getByRole('heading', { name: 'La Ceiba', level: 1 }).isVisible());
    comprobar('la mesa vuelve a conocerse (ya hay sesión)', await pagina.getByText(/^Mesa 7$/).first().isVisible());
    comprobar('sin aviso de conexión', (await pagina.locator('p[role="status"]').filter({ hasText: /conexión|copia/ }).count()) === 0);

    // ── e (con red). el armazón no tapa rutas del servidor ──────────────────
    const wp = await pagina.evaluate(async () => {
      const r = await fetch('/wp-admin', { headers: { Accept: 'text/html' } });
      return { estado: r.status, json: (r.headers.get('content-type') ?? '').includes('json') };
    });
    comprobar('/wp-admin sigue siendo 404 JSON (fetch)', wp.estado === 404 && wp.json, JSON.stringify(wp));
    const nav = await pagina.goto(`${ORIGEN}/wp-admin`);
    comprobar('/wp-admin navegando (controlada por el worker) sigue siendo 404 JSON, no el armazón', nav?.status() === 404 && (nav.headers()['content-type'] ?? '').includes('json'), String(nav?.status()));
    const indice = await pagina.goto(`${ORIGEN}/index`);
    comprobar('/index navegando es 404 JSON (la precarga no lo contesta con index.html)', indice?.status() === 404 && (indice.headers()['content-type'] ?? '').includes('json'), String(indice?.status()));
    const indiceFetch = await pagina.evaluate(async () => (await fetch('/index')).status);
    comprobar('/index por fetch también es 404', indiceFetch === 404, String(indiceFetch));
    // La navegación es red primero: con red, lo que se ve viene del servidor (cada respuesta trae su `X-Request-ID`),
    // no del `index.html` que quedó precargado el día de la instalación.
    const idsNavegacion = [];
    for (let i = 0; i < 2; i += 1) {
      const r = await pagina.goto(`${ORIGEN}/m/${codigo}`, { waitUntil: 'load' });
      idsNavegacion.push(r?.headers()['x-request-id'] ?? '');
    }
    comprobar('dos navegaciones seguidas a la mesa vienen del servidor (X-Request-ID distintos)', idsNavegacion.every(Boolean) && idsNavegacion[0] !== idsNavegacion[1], idsNavegacion.join(' / ').replaceAll(codigo, '<codigo>'));
    const salud = await pagina.goto(`${ORIGEN}/health`);
    comprobar('/health navegando llega al servidor', salud?.status() === 200 && (salud.headers()['content-type'] ?? '').includes('json'));

    // ── d. claves de caché ───────────────────────────────────────────────────
    decir('d. claves de las cachés');
    await pagina.goto(`${ORIGEN}${rutaMenu}`, { waitUntil: 'load' });
    await pagina.getByRole('heading', { name: 'La Ceiba', level: 1 }).waitFor({ timeout: 20000 });
    const claves = await clavesDeCache(pagina);
    comprobar('hay cachés', claves.length > 10, `${claves.length} entradas`);
    comprobar('ninguna clave contiene el código de mesa', !claves.some((c) => c.url.includes(codigo) || decodeURIComponent(c.url).includes(codigo)));
    comprobar('ninguna clave es una ruta /m/…', !claves.some((c) => new URL(c.url).pathname.startsWith('/m/') || new URL(c.url).pathname === '/m'));
    const api = claves.filter((c) => new URL(c.url).pathname.startsWith('/api/')).map((c) => new URL(c.url).pathname);
    comprobar('de la API sólo está el menú público', api.length > 0 && api.every((p) => /^\/api\/v1\/p\/menu\/[^/]+$/.test(p)), api.join(', '));
    comprobar('todas las claves son del propio origen', claves.every((c) => c.url.startsWith(`${ORIGEN}/`)));
    comprobar('el panel del operador y Firebase no se bajaron solos', !claves.some((c) => /Area-(?:admin|personal)|Pantalla[A-Z]|Asistente|index\.esm/.test(c.url)), claves.filter((c) => /Area-|Pantalla|Asistente|index\.esm/.test(c.url)).map((c) => new URL(c.url).pathname).join(', '));
    const pesoPrecarga = await pagina.evaluate(async () => {
      let total = 0;
      let n = 0;
      for (const nombre of await caches.keys()) {
        if (!nombre.startsWith('workbox-precache')) continue;
        const cache = await caches.open(nombre);
        for (const peticion of await cache.keys()) {
          const r = await cache.match(peticion);
          total += (await r.clone().arrayBuffer()).byteLength;
          n += 1;
        }
      }
      return { total, n };
    });
    decir(`  · precarga: ${pesoPrecarga.n} archivos, ${(pesoPrecarga.total / 1024).toFixed(0)} KB sin comprimir`);
    await contexto.close();

    // ── instalabilidad ───────────────────────────────────────────────────────
    decir('g. instalabilidad (CDP)');
    const perfil = mkdtempSync(join(tmpdir(), 'pwa-perfil-'));
    const persistente = await chromium.launchPersistentContext(perfil, { viewport: { width: 390, height: 844 } });
    try {
      const p = persistente.pages()[0] ?? (await persistente.newPage());
      await p.goto(`${ORIGEN}/`, { waitUntil: 'load' });
      await esperarA(() => hayServiceWorkerActivo(p));
      const cdp = await persistente.newCDPSession(p);
      await cdp.send('Page.enable');
      await espera(1500);
      const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
      comprobar('Page.getInstallabilityErrors está vacío', installabilityErrors.length === 0, JSON.stringify(installabilityErrors));
    } finally {
      await persistente.close();
      rmSync(perfil, { recursive: true, force: true });
    }

    // ── f. un platillo agotado se ve en ≤ 60 s ──────────────────────────────
    decir('f. un platillo agotado se ve en ≤ 60 s, sin recargar');
    const elegido = psql(`select p.id || '|' || p.nombre from platillo p join restaurante r on r.id = p.restaurante_id where r.slug = '${SLUG}' and p.disponible and p.activo order by p.nombre limit 1 offset 3`).split('|');
    platilloAgotado = { id: elegido[0], nombre: elegido.slice(1).join('|') };
    const ctx2 = await navegador.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-MX', serviceWorkers: 'allow' });
    const p2 = await ctx2.newPage();
    await p2.clock.install();
    await p2.goto(`${ORIGEN}${rutaMenu}`, { waitUntil: 'load' });
    await p2.getByRole('heading', { name: 'La Ceiba', level: 1 }).waitFor({ timeout: 20000 });
    await p2.evaluate(() => {
      window.__sinRecarga = true;
    });
    const buscador = p2.getByRole('searchbox', { name: 'Buscar en el menú' });
    const consulta = platilloAgotado.nombre.slice(0, 4);
    await buscador.fill(consulta);
    const tarjeta = p2.locator('section[id^="categoria-"] h3', { hasText: platilloAgotado.nombre });
    await tarjeta.first().waitFor({ timeout: 10000 });
    const agotadoAntes = await p2.locator('section[id^="categoria-"]', { has: tarjeta }).getByText('Agotado hoy').count();
    comprobar('antes, el platillo está disponible', agotadoAntes === 0 || platilloAgotado.nombre.length > 0);
    psql(`update platillo set disponible = false where id = '${platilloAgotado.id}'`);
    // El servidor guarda el menú 30 s en memoria (y esta escritura directa no lo invalida, a diferencia de una del
    // operador): se espera ese plazo real antes de adelantar el reloj de la página al siguiente turno de 25 s.
    decir('  · esperando 32 s reales (caché en proceso del servidor)…');
    await espera(32000);
    const inicio = Date.now();
    // Sólo lo justo para cruzar el turno de 25 s; después se espera en tiempo real (no se sigue adelantando el reloj: vencería
    // el plazo de la petición antes de que llegue la respuesta).
    await p2.clock.runFor(25500);
    const atenuado = p2.locator('article, li, div', { has: tarjeta }).getByText('Agotado hoy');
    const visto = await esperarA(async () => (await p2.getByText('Agotado hoy').count()) > 0, { plazo: 10000 });
    decir(`  · agotado visible ${Date.now() - inicio} ms reales después de cruzar el turno`);
    comprobar('el platillo aparece agotado tras un turno de 25 s del reloj de la página (peor caso del servidor: 30 s de copia + 25 s = 55 s)', visto, `${Date.now() - inicio} ms reales`);
    comprobar('sin recargar la página', await p2.evaluate(() => window.__sinRecarga === true));
    comprobar('la búsqueda escrita se conserva', (await buscador.inputValue()) === consulta);
    void atenuado;
    await ctx2.close();
  } finally {
    if (platilloAgotado) psql(`update platillo set disponible = true where id = '${platilloAgotado.id}'`);
    await navegador.close();
  }
}

try {
  await main();
} catch (error) {
  decir('✗ La verificación se interrumpió:', error instanceof Error ? error.message : error);
  fallos.push('interrumpida');
}
if (fallos.length > 0) {
  decir(`\n${fallos.length} comprobación(es) fallaron: ${fallos.join('; ')}`);
  process.exit(1);
}
decir('\nPWA verificada.');
