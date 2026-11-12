#!/usr/bin/env node
/**
 * Medición de AC-01.1 (menú visible en ≤ 3 s, p75, 4G) contra una mesa real de staging. No es parte de la CI.
 *
 *   CARTA_MESA_URL='https://…/m/<codigo>/menu' node frontend/scripts/medir-ac-01-1.mjs <orden> …  (carpeta de salida: CARTA_MEDICION_SALIDA)
 *
 * El enlace de la mesa es una credencial: sólo se lee de la variable de entorno y NUNCA se escribe (toda
 * salida cambia el código por `<codigo>`). Órdenes:
 *   entrar            entra una vez, guarda la cookie `carta_invitado` en <carpeta>/cookie.json
 *   frio <perfil> [n] n corridas en frío (contexto nuevo con la cookie inyectada, sin caché ni service worker)
 *   segunda [n]       n segundas visitas (service worker activo y caché HTTP) con el perfil `lento`
 *   cascada <perfil>  una corrida con la lista completa de recursos, fotos y el aviso de la LCP
 *   traza <perfil>    una corrida con traza de Chrome: tiempo propio de la CPU por tipo y por archivo
 * Perfiles: libre · lento (150 ms RTT, 1.6 Mbps, 750 kbps, CPU ×4) · rapido (60 ms, 9 Mbps, 1.5 Mbps, CPU ×4).
 * Con CARTA_LOCAL=1 y CARTA_MESA_URL apuntando a http://127.0.0.1:8000 no usa el proxy de la sesión.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const URL_MESA = process.env.CARTA_MESA_URL;
if (!URL_MESA) throw new Error('Falta CARTA_MESA_URL');
const CODIGO = (URL_MESA.match(/\/m\/([^/]+)/) ?? [])[1] ?? '';
const limpio = (x) => (CODIGO ? JSON.stringify(x, null, 1).split(CODIGO).join('<codigo>') : JSON.stringify(x, null, 1));
const [, , orden = 'ayuda', arg1, arg2] = process.argv;
const salida = resolve(process.env.CARTA_MEDICION_SALIDA ?? '.');
mkdirSync(salida, { recursive: true });

const PERFILES = {
  libre: null,
  lento: { latencia: 150, bajada: (1.6 * 1024 * 1024) / 8, subida: (750 * 1024) / 8, cpu: 4 },
  rapido: { latencia: 60, bajada: (9 * 1024 * 1024) / 8, subida: (1.5 * 1024 * 1024) / 8, cpu: 4 },
};

const local = process.env.CARTA_LOCAL === '1';
const proxy = process.env.HTTPS_PROXY ? new URL(process.env.HTTPS_PROXY) : null;
const lanzar = () =>
  chromium.launch(local || !proxy ? {} : { proxy: { server: `${proxy.protocol}//${proxy.hostname}:${proxy.port}` } });

/** Se inyecta antes de que corra cualquier script de la página. */
const SONDA = () => {
  const m = (window.__m = { fcp: null, lcp: null, lcpEl: null, largas: [], tarjeta: null, visible: null, texto: null, textoPintado: null, foto: null, cls: 0 });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') m.fcp = e.startTime;
  }).observe({ type: 'paint', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      const el = e.element;
      m.lcp = e.startTime;
      m.lcpEl = el
        ? { etiqueta: el.tagName, clase: String(el.className || '').slice(0, 60), url: e.url || null, tam: e.size, texto: el.tagName === 'IMG' ? null : (el.textContent || '').slice(0, 30) }
        : null;
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) m.largas.push([e.startTime, e.duration]);
  }).observe({ type: 'longtask', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (!e.hadRecentInput) m.cls += e.value;
  }).observe({ type: 'layout-shift', buffered: true });
  const mo = new MutationObserver(() => {
    if (m.texto === null && (document.getElementById('app')?.innerText || '').trim()) {
      m.texto = performance.now();
      requestAnimationFrame(() => requestAnimationFrame(() => (m.textoPintado = performance.now())));
    }
    if (m.tarjeta === null && document.querySelector('[data-platillo]')) {
      m.tarjeta = performance.now();
      requestAnimationFrame(() => requestAnimationFrame(() => (m.visible = performance.now())));
    }
    if (m.texto !== null && m.tarjeta !== null) mo.disconnect();
  });
  mo.observe(document, { childList: true, subtree: true });
  document.addEventListener(
    'load',
    (ev) => {
      const t = ev.target;
      if (m.foto === null && t && t.tagName === 'IMG' && t.closest && t.closest('[data-platillo]')) m.foto = performance.now();
    },
    true,
  );
};

async function contexto(navegador, cookies, perfil) {
  const ctx = await navegador.newContext({ ...devices['iPhone 14'] });
  if (cookies?.length) await ctx.addCookies(cookies);
  await ctx.addInitScript(SONDA);
  const pagina = await ctx.newPage();
  const cdp = await ctx.newCDPSession(pagina);
  const p = PERFILES[perfil];
  if (p) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: p.latencia, downloadThroughput: p.bajada, uploadThroughput: p.subida });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu });
  }
  return { ctx, pagina, cdp };
}

function cargarCookies() {
  const f = join(salida, 'cookie.json');
  if (!existsSync(f)) throw new Error('Primero: entrar');
  return JSON.parse(readFileSync(f, 'utf8'));
}

async function esperarMenu(pagina, ms = 60000) {
  await pagina.waitForFunction(() => window.__m && window.__m.visible !== null, null, { timeout: ms });
  await pagina.waitForTimeout(3000);
}

async function leer(pagina) {
  return pagina.evaluate(() => {
    const m = window.__m;
    const nav = performance.getEntriesByType('navigation')[0];
    const fin = (m.visible ?? 0) + 3000;
    const tbtTotal = m.largas.filter(([i]) => i >= (m.fcp ?? 0) && i <= fin).reduce((s, [, d]) => s + Math.max(0, d - 50), 0);
    const tbtHastaMenu = m.largas.filter(([i]) => i >= (m.fcp ?? 0) && i <= (m.visible ?? 0)).reduce((s, [, d]) => s + Math.max(0, d - 50), 0);
    return {
      fcp: m.fcp,
      lcp: m.lcp,
      lcpEl: m.lcpEl,
      tarjeta: m.tarjeta,
      texto: m.texto,
      textoPintado: m.textoPintado,
      candidatos: [...document.querySelectorAll('h1,h2,h3,p,img,svg,button,input')]
        .map((el) => {
          const r = el.getBoundingClientRect();
          const w = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
          const h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
          return { el: el.tagName.toLowerCase() + (el.closest('[data-platillo]') ? '(tarjeta)' : ''), area: Math.round(w * h), texto: el.tagName === 'IMG' || el.tagName === 'svg' ? '' : (el.textContent || '').slice(0, 24) };
        })
        .sort((a, b) => b.area - a.area)
        .slice(0, 4),
      visible: m.visible,
      fotoCargada: m.foto,
      cls: m.cls,
      tbt: Math.round(tbtTotal),
      tbtHastaMenu: Math.round(tbtHastaMenu),
      tareasLargas: m.largas.length,
      load: nav ? nav.loadEventEnd : null,
      dcl: nav ? nav.domContentLoadedEventEnd : null,
      tarjetas: document.querySelectorAll('[data-platillo]').length,
    };
  });
}

const pct = (a, q) => {
  const v = a.filter((x) => x != null).sort((x, y) => x - y);
  if (!v.length) return null;
  const i = (v.length - 1) * q;
  const lo = Math.floor(i);
  return Math.round(v[lo] + (v[Math.ceil(i)] - v[lo]) * (i - lo));
};
function resumen(corridas) {
  const r = {};
  for (const k of ['textoPintado', 'tarjeta', 'visible', 'fotoCargada', 'tbt', 'tbtHastaMenu', 'tareasLargas', 'cls']) {
    const v = corridas.map((c) => c[k]);
    r[k] = { p50: pct(v, 0.5), p75: pct(v, 0.75), min: pct(v, 0), max: pct(v, 1) };
  }
  return r;
}

async function main() {
  const navegador = await lanzar();
  try {
    if (orden === 'entrar') {
      const { ctx, pagina } = await contexto(navegador, null, 'libre');
      await pagina.goto(URL_MESA, { waitUntil: 'load' });
      await esperarMenu(pagina);
      const cookies = (await ctx.cookies()).filter((c) => c.name === 'carta_invitado');
      if (!cookies.length) throw new Error('No hay cookie carta_invitado');
      writeFileSync(join(salida, 'cookie.json'), JSON.stringify(cookies));
      console.log('cookie guardada (no se muestra); atributos:', cookies.map((c) => ({ path: c.path, secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite })));
      console.log(limpio(await leer(pagina)));
    } else if (orden === 'frio' || orden === 'segunda') {
      const perfil = orden === 'segunda' ? 'lento' : arg1;
      const n = Number(orden === 'segunda' ? arg1 : arg2) || 9;
      const cookies = cargarCookies();
      const corridas = [];
      for (let i = 0; i < n; i++) {
        let c;
        try {
          if (orden === 'segunda') {
            // Primera visita sin limitar para instalar el service worker; luego se mide la segunda con el perfil.
            c = await contexto(navegador, cookies, 'libre');
            await c.pagina.goto(URL_MESA, { waitUntil: 'load' });
            await esperarMenu(c.pagina);
            await c.pagina.evaluate(() => navigator.serviceWorker.ready.then(() => true));
            await c.pagina.waitForTimeout(2500);
            const p = PERFILES.lento;
            await c.cdp.send('Network.enable');
            await c.cdp.send('Network.emulateNetworkConditions', { offline: false, latency: p.latencia, downloadThroughput: p.bajada, uploadThroughput: p.subida });
            await c.cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu });
            const controlada = await c.pagina.evaluate(() => !!navigator.serviceWorker.controller);
            await c.pagina.goto(URL_MESA, { waitUntil: 'load' });
            await esperarMenu(c.pagina);
            const r = await leer(c.pagina);
            r.swControla = controlada;
            corridas.push(r);
          } else {
            c = await contexto(navegador, cookies, perfil);
            await c.pagina.goto(URL_MESA, { waitUntil: 'load', timeout: 90000 });
            await esperarMenu(c.pagina);
            corridas.push(await leer(c.pagina));
          }
        } catch (e) {
          corridas.push({ error: String(e.message).split('\n')[0] });
        } finally {
          await c?.ctx.close();
        }
        await new Promise((r) => setTimeout(r, 4000));
      }
      const buenas = corridas.filter((c) => !c.error);
      const res = { orden, perfil, pedidas: n, validas: buenas.length, resumen: resumen(buenas), corridas };
      writeFileSync(join(salida, `${orden}-${perfil}.json`), limpio(res));
      console.log(limpio({ ...res, corridas: undefined }));
    } else if (orden === 'cascada' || orden === 'traza') {
      const perfil = arg1 ?? 'lento';
      const cookies = cargarCookies();
      const c = await contexto(navegador, cookies, perfil);
      const cabeceras = new Map();
      const cuerpos = {};
      c.pagina.on('response', async (resp) => {
        const u = resp.url();
        const h = resp.headers();
        cabeceras.set(u, { estado: resp.status(), tipo: h['content-type'], cache: h['cache-control'], cf: h['cf-cache-status'], enc: h['content-encoding'], etag: !!h['etag'], edad: h['age'], sw: resp.fromServiceWorker() });
        if (/\/p\/menu\//.test(u) && resp.status() === 200) {
          try {
            const j = await resp.json();
            const platillos = (j.categorias ?? []).flatMap((x) => x.platillos ?? []);
            cuerpos.menu = { categorias: (j.categorias ?? []).length, platillos: platillos.length, conFoto: platillos.filter((p) => p.imagen_tipo === 'foto').length, destacados: (j.destacados ?? j.top ?? []).length, claves: Object.keys(j) };
          } catch {
            /* nada */
          }
        }
      });
      if (orden === 'traza') await navegador.startTracing(c.pagina, { categories: ['devtools.timeline', 'v8.execute', 'disabled-by-default-devtools.timeline', 'blink.user_timing', 'loading'] });
      await c.pagina.goto(URL_MESA, { waitUntil: 'load', timeout: 90000 });
      await esperarMenu(c.pagina);
      const r = await leer(c.pagina);
      if (orden === 'traza') {
        const buf = await navegador.stopTracing();
        const ev = (JSON.parse(buf.toString()).traceEvents ?? []).filter((e) => e.ph === 'X' && e.dur != null);
        // El hilo principal del renderizador de la página: el que más eventos RunTask tiene.
        const porHilo = new Map();
        for (const e of ev) if (e.name === 'RunTask') porHilo.set(`${e.pid}:${e.tid}`, (porHilo.get(`${e.pid}:${e.tid}`) ?? 0) + e.dur);
        const [clave] = [...porHilo.entries()].sort((a, b) => b[1] - a[1])[0];
        const hilo = ev.filter((e) => `${e.pid}:${e.tid}` === clave).sort((a, b) => a.ts - b.ts || b.dur - a.dur);
        const propio = new Map();
        const porUrl = new Map();
        const pila = [];
        for (const e of hilo) {
          while (pila.length && pila.at(-1).ts + pila.at(-1).dur <= e.ts) pila.pop();
          if (pila.length) pila.at(-1).hijos += e.dur;
          pila.push({ ts: e.ts, dur: e.dur, hijos: 0, e });
          e.__nodo = pila.at(-1);
        }
        for (const e of hilo) {
          const self = Math.max(0, e.dur - e.__nodo.hijos) / 1000;
          propio.set(e.name, (propio.get(e.name) ?? 0) + self);
          const u = e.args?.data?.url || e.args?.data?.fileName;
          if (u) porUrl.set(`${e.name} ${u.split('?')[0].split('/').slice(-1)[0]}`, (porUrl.get(`${e.name} ${u.split('?')[0].split('/').slice(-1)[0]}`) ?? 0) + self);
        }
        const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, Math.round(v)]);
        r.cpuPropiaMs = top(propio, 18);
        r.cpuPorArchivoMs = top(porUrl, 14);
      }
      const recursos = await c.pagina.evaluate(() =>
        performance.getEntriesByType('resource').map((e) => ({
          url: e.name,
          tipo: e.initiatorType,
          inicio: Math.round(e.startTime),
          fin: Math.round(e.responseEnd),
          espera: Math.round(e.responseStart - e.requestStart),
          transferido: e.transferSize,
          cuerpoComprimido: e.encodedBodySize,
          cuerpo: e.decodedBodySize,
          proto: e.nextHopProtocol,
        })),
      );
      const fotos = await c.pagina.evaluate(() =>
        [...document.querySelectorAll('[data-platillo] img')].map((i) => ({
          natural: `${i.naturalWidth}x${i.naturalHeight}`,
          pintada: `${i.clientWidth}x${i.clientHeight}`,
          loading: i.loading,
          prioridad: i.fetchPriority,
          src: i.currentSrc.replace(/^https?:\/\/[^/]+/, '').slice(0, 90),
          cargada: i.complete,
        })),
      );
      const fuentes = await c.pagina.evaluate(() => [...document.fonts].filter((f) => f.status !== 'unloaded').map((f) => `${f.family} ${f.weight} ${f.status}`));
      const res = { orden, perfil, medicion: r, menu: cuerpos.menu, recursos: recursos.map((x) => ({ ...x, ...(cabeceras.get(x.url) ?? {}) })), fotos: { total: fotos.length, muestra: fotos.slice(0, 6) }, fuentes };
      writeFileSync(join(salida, `${orden}-${perfil}.json`), limpio(res));
      console.log(limpio({ medicion: r, menu: cuerpos.menu, nrecursos: recursos.length }));
      await c.ctx.close();
    } else {
      console.log('Uso: ver el encabezado del archivo.');
    }
  } finally {
    await navegador.close();
  }
}
main().catch((e) => {
  console.error(String(e.message).split(CODIGO || '\u0000').join('<codigo>').split('\n').slice(0, 4).join('\n'));
  process.exit(1);
});
