import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { calcularArmazon } from '../../scripts/armazon.mjs';
import { manejarPreloadError, type Ventana } from '../recarga';
import { liberarServiceWorker, registrarServiceWorker } from './registro';
import { CABECERA_COPIA, PREFIJOS_SPA, RUTAS_SPA, RUTA_MENU, esGuardable, esPeticionDeMenu } from './rutas';

const ORIGEN = 'https://carta.test';

describe('rutas de la SPA que el worker responde con index.html', () => {
  it('son las de PREFIJOS_SPA de app/core/estaticos.py (una sola verdad: app/)', () => {
    const py = readFileSync(resolve(process.cwd(), '../app/core/estaticos.py'), 'utf8');
    const prefijos = /PREFIJOS_SPA = \(([^)]*)\)/.exec(py);
    expect(prefijos).toBeTruthy();
    const delServidor = [...prefijos![1]!.matchAll(/"\/([a-z]+)"/g)].map((m) => m[1]);
    expect([...PREFIJOS_SPA]).toEqual(delServidor);
  });

  it.each(['/', '/?x=1', '/m', '/m/', '/m/Jx3k9QwLmN2pR7sT4vY8zA', '/m/abc/menu', '/m/abc/platillo/1?x=2', '/staff', '/staff/cola', '/admin', '/admin/menu'])('sí: %s', (ruta) => {
    expect(RUTAS_SPA.test(ruta)).toBe(true);
  });

  it.each([
    '/api/v1/p/menu/la-ceiba',
    '/api/v1/p/sesion',
    '/health',
    '/ready',
    '/docs',
    '/redoc',
    '/openapi.json',
    '/almacen/qr.pdf',
    '/wp-admin',
    '/administrador',
    '/mesa',
    '/m2',
    '/assets/index-abc.js',
    '/manifest.webmanifest',
    '/sw.js',
    '/otra',
    '/index',
    '/index.html',
  ])('no (pasa a la red): %s', (ruta) => {
    expect(RUTAS_SPA.test(ruta)).toBe(false);
  });
});

describe('lo único de la API que el worker puede guardar', () => {
  const url = (ruta: string, origen = ORIGEN) => new URL(ruta, origen);
  it('GET /api/v1/p/menu/{slug} del propio origen', () => {
    expect(esPeticionDeMenu({ method: 'GET' }, url('/api/v1/p/menu/la-ceiba'), ORIGEN)).toBe(true);
  });
  it.each([
    ['POST', '/api/v1/p/menu/la-ceiba', ORIGEN],
    ['GET', '/api/v1/p/sesion', ORIGEN],
    ['GET', '/api/v1/p/sesion/entrar', ORIGEN],
    ['GET', '/api/v1/p/platillos/9b2f6c1e-0000-4000-8000-000000000001', ORIGEN],
    ['GET', '/api/v1/op/comandas', ORIGEN],
    ['GET', '/api/v1/admin/menu', ORIGEN],
    ['GET', '/api/v1/p/menu/la-ceiba/otro', ORIGEN],
    ['GET', '/api/v1/p/menu/', ORIGEN],
    ['GET', '/api/v1/p/menu/la-ceiba', 'https://otro.test'],
  ])('no: %s %s (origen %s)', (metodo, ruta, origen) => {
    expect(esPeticionDeMenu({ method: metodo }, url(ruta, origen), ORIGEN)).toBe(false);
    expect(RUTA_MENU.test('/api/v1/p/sesion')).toBe(false);
  });

  const respuesta = (init: { status?: number; type?: ResponseType; cc?: string; ct?: string }) => ({
    status: init.status ?? 200,
    type: init.type ?? 'basic',
    headers: new Headers({ ...(init.cc ? { 'Cache-Control': init.cc } : {}), ...(init.ct === '' ? {} : { 'Content-Type': init.ct ?? 'application/json' }) }),
  });
  it('sólo se guarda un 200 sin no-store ni private, y nunca una respuesta opaca', () => {
    expect(esGuardable(respuesta({ cc: 'public, max-age=30, s-maxage=30' }))).toBe(true);
    expect(esGuardable(respuesta({}))).toBe(true);
    expect(esGuardable(respuesta({ ct: 'application/json; charset=utf-8' }))).toBe(true);
    // Una página de mantenimiento del borde con 200 dejaría la copia inservible.
    expect(esGuardable(respuesta({ ct: 'text/html; charset=utf-8' }))).toBe(false);
    expect(esGuardable(respuesta({ ct: '' }))).toBe(false);
    expect(esGuardable(respuesta({ cc: 'no-store' }))).toBe(false);
    expect(esGuardable(respuesta({ cc: 'public, NO-STORE' }))).toBe(false);
    expect(esGuardable(respuesta({ cc: 'private, no-cache' }))).toBe(false);
    expect(esGuardable(respuesta({ status: 404 }))).toBe(false);
    expect(esGuardable(respuesta({ status: 304 }))).toBe(false);
    expect(esGuardable(respuesta({ status: 0, type: 'opaque' }))).toBe(false);
    expect(esGuardable(respuesta({ type: 'opaque' }))).toBe(false);
  });
});

describe('sw.ts: la configuración del worker', () => {
  // Sin comentarios: el texto que explica «no hay skipWaiting» no cuenta como código.
  const sw = readFileSync(resolve(process.cwd(), 'src/sw.ts'), 'utf8').replace(/\/\/.*$/gm, '');
  it('no se salta la espera (una versión nueva no rompe una mesa a media orden) pero toma la página en la primera instalación', () => {
    expect(sw).not.toMatch(/skipWaiting/);
    // `clients.claim()` en `activate` sólo actúa en la primera instalación: sin él la primera visita no deja copia del menú.
    expect(sw).toMatch(/clientsClaim\(\)/);
  });
  it('la navegación es red primero con plazo y sin guardar; la precarga sólo es respaldo y no contesta `/` ni `/index`', () => {
    expect(sw).toContain('NAVEGACION_PLAZO_MS');
    expect(sw).toContain('fetch(opciones.request');
    expect(sw).toMatch(/respuesta\.status < 500/);
    expect(sw).not.toMatch(/cache\.put|\.put\(/); // la navegación nunca se guarda
    expect(sw).toMatch(/cleanURLs: false/);
    expect(sw).toMatch(/directoryIndex: ''/);
    // La navegación se registra antes que la precarga: ésta no contesta antes.
    expect(sw.indexOf('new NavigationRoute')).toBeLessThan(sw.indexOf('addRoute('));
  });
  it('sólo hay un registerRoute de la API, el del menú; el respaldo de navegación usa la lista de permitidos', () => {
    expect(sw).toContain('allowlist: [RUTAS_SPA]');
    expect(sw).not.toContain('denylist');
    expect(sw.match(/\/api\//g) ?? []).toHaveLength(0);
    expect(sw.match(/esPeticionDeMenu/g)).toHaveLength(2); // import + uso
  });
  it('sin scripts en línea: la cabecera de copia es una constante compartida con el cliente', () => {
    expect(CABECERA_COPIA).toBe('X-Carta-Copia');
  });
});

describe('registro del service worker', () => {
  it('en desarrollo y en pruebas no registra nada', () => {
    const register = vi.fn().mockResolvedValue(undefined);
    registrarServiceWorker({ serviceWorker: { register } }, { addEventListener: vi.fn(), document: { readyState: 'complete' } }, false);
    expect(register).not.toHaveBeenCalled();
  });
  it('en producción lo registra en /sw.js, con alcance / y sin caché HTTP para sw.js, tras la carga', () => {
    const register = vi.fn().mockResolvedValue(undefined);
    let alCargar: () => void = () => undefined;
    registrarServiceWorker(
      { serviceWorker: { register } },
      { addEventListener: ((_: string, f: () => void) => (alCargar = f)) as unknown as Window['addEventListener'], document: { readyState: 'loading' } },
      true,
    );
    expect(register).not.toHaveBeenCalled();
    alCargar();
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/', updateViaCache: 'none' });
  });
  it('sin soporte del navegador o con un registro que falla, no lanza', async () => {
    registrarServiceWorker({}, { addEventListener: vi.fn(), document: { readyState: 'complete' } }, true);
    const register = vi.fn().mockRejectedValue(new Error('x'));
    registrarServiceWorker({ serviceWorker: { register } }, { addEventListener: vi.fn(), document: { readyState: 'complete' } }, true);
    await Promise.resolve();
    expect(register).toHaveBeenCalled();
  });
  it('liberar: da de baja los workers y vacía todas las cachés', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const borrar = vi.fn().mockResolvedValue(true);
    await liberarServiceWorker({ serviceWorker: { getRegistrations: async () => [{ unregister } as unknown as ServiceWorkerRegistration] } }, { keys: async () => ['a', 'b'], delete: borrar });
    expect(unregister).toHaveBeenCalledTimes(1);
    expect(borrar.mock.calls).toEqual([['a'], ['b']]);
  });
  it('liberar nunca lanza', async () => {
    await expect(liberarServiceWorker({ serviceWorker: { getRegistrations: async () => Promise.reject(new Error('x')) } }, undefined)).resolves.toBeUndefined();
  });
});

describe('un trozo que ya no existe tras un despliegue (vite:preloadError)', () => {
  const ventana = (liberar: () => Promise<void>): { v: Ventana; reload: ReturnType<typeof vi.fn> } => {
    const reload = vi.fn();
    const v: Ventana = { location: { href: 'https://carta.test/admin', reload }, sessionStorage: { getItem: () => null, setItem: () => undefined }, liberarServiceWorker: liberar };
    return { v, reload };
  };
  it('primero se libera el worker (si no, la pestaña vieja recibiría el mismo index.html) y luego se recarga', async () => {
    const orden: string[] = [];
    const { v, reload } = ventana(async () => void orden.push('liberar'));
    reload.mockImplementation(() => orden.push('recargar'));
    expect(manejarPreloadError(new Event('vite:preloadError', { cancelable: true }), v)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(orden).toEqual(['liberar', 'recargar']);
  });
  it('si liberar falla, igual recarga', async () => {
    const { v, reload } = ventana(() => Promise.reject(new Error('x')));
    manejarPreloadError(new Event('vite:preloadError', { cancelable: true }), v);
    await Promise.resolve();
    await Promise.resolve();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('qué precarga el worker (scripts/armazon.mjs)', () => {
  const dirs: string[] = [];
  afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

  function dist() {
    const raiz = mkdtempSync(join(tmpdir(), 'armazon-'));
    dirs.push(raiz);
    mkdirSync(join(raiz, 'assets'));
    const f = (nombre: string, contenido = '') => writeFileSync(join(raiz, nombre), contenido);
    f('index.html', '<link rel="stylesheet" href="/assets/index-A.css"><script type="module" src="/assets/index-A.js"></script>');
    f(
      'assets/index-A.js',
      'import{x}from"./vendor-A.js";' +
        'const m=(i,n,t)=>{m.f||(m.f=["assets/Area-comensal-A.js","assets/Comun-A.js","assets/Comun-A.css","assets/Area-comensal-A.css","assets/Area-admin-A.js","assets/index.esm-A.js"]);return i.map(j=>m.f[j])};' +
        'a=()=>import("./Area-comensal-A.js"),__vite__mapDeps([0,1,2,3]));b=()=>import("./Area-admin-A.js"),__vite__mapDeps([4,1,2,5]));',
    );
    f('assets/vendor-A.js', 'export const x=1');
    f('assets/Area-comensal-A.js', 'import{c}from"./Comun-A.js";export default c');
    f('assets/Comun-A.js', 'export const c=1');
    f('assets/Comun-A.css');
    f('assets/Area-comensal-A.css');
    f('assets/index-A.css');
    f('assets/Area-admin-A.js', 'import("./index.esm-A.js")');
    f('assets/index.esm-A.js', 'identitytoolkit');
    return raiz;
  }
  const TODOS = ['index.html', 'assets/index-A.js', 'assets/index-A.css', 'assets/vendor-A.js', 'assets/Area-comensal-A.js', 'assets/Area-comensal-A.css', 'assets/Comun-A.js', 'assets/Comun-A.css', 'assets/Area-admin-A.js', 'assets/index.esm-A.js'];

  it('lleva la entrada, el trozo del comensal y sus dependencias (JS y CSS)', () => {
    const { js, css } = calcularArmazon(dist(), TODOS);
    expect([...js].sort()).toEqual(['assets/Area-comensal-A.js', 'assets/Comun-A.js', 'assets/index-A.js', 'assets/vendor-A.js']);
    expect([...css].sort()).toEqual(['assets/Area-comensal-A.css', 'assets/Comun-A.css', 'assets/index-A.css']);
  });
  it('no lleva el panel del operador ni el SDK de Firebase', () => {
    const { js } = calcularArmazon(dist(), TODOS);
    expect([...js].some((a) => /Area-admin|index\.esm/.test(a))).toBe(false);
  });
});
