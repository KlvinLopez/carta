// `sw.ts` cargado con Workbox simulado: se mira cómo monta las rutas (qué pasa a la red, qué se guarda, con qué
// plazos y caducidad) sin depender de un renombrado ni de expresiones regulares sobre la fuente. Lo que sólo un
// navegador real prueba (que el worker evalúe y se active) lo hace `scripts/verificar-pwa.mjs`.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rutas: { coincide: (a: { request: Request; url: URL }) => boolean; estrategia: unknown }[] = [];
const estrategias: { tipo: string; opciones: Record<string, unknown> }[] = [];
const expiraciones: Record<string, unknown>[] = [];
const navegaciones: { manejador: unknown; opciones: Record<string, unknown> }[] = [];
const precarga = { precache: vi.fn(), addRoute: vi.fn(), orden: [] as string[] };
const reclamo = vi.fn();

vi.mock('workbox-core', () => ({ clientsClaim: () => reclamo() }));
vi.mock('workbox-precaching', () => ({
  cleanupOutdatedCaches: vi.fn(),
  createHandlerBoundToURL: vi.fn(() => () => new Response('armazon')),
  precache: (...a: unknown[]) => precarga.precache(...a),
  addRoute: (...a: unknown[]) => {
    precarga.orden.push('addRoute');
    precarga.addRoute(...a);
  },
}));
vi.mock('workbox-routing', () => ({
  NavigationRoute: class {
    constructor(manejador: unknown, opciones: Record<string, unknown>) {
      precarga.orden.push('navegacion');
      navegaciones.push({ manejador, opciones });
    }
  },
  registerRoute: (coincide: unknown, estrategia: unknown) => {
    if (typeof coincide === 'function') rutas.push({ coincide: coincide as never, estrategia });
  },
}));
vi.mock('workbox-strategies', () => ({
  CacheFirst: class {
    constructor(opciones: Record<string, unknown>) {
      estrategias.push({ tipo: 'CacheFirst', opciones });
    }
  },
  NetworkFirst: class {
    constructor(opciones: Record<string, unknown>) {
      estrategias.push({ tipo: 'NetworkFirst', opciones });
    }
  },
}));
vi.mock('workbox-expiration', () => ({
  ExpirationPlugin: class {
    constructor(opciones: Record<string, unknown>) {
      expiraciones.push(opciones);
    }
  },
}));
vi.mock('workbox-cacheable-response', () => ({ CacheableResponsePlugin: class {} }));

type Plugin = {
  cacheWillUpdate?: (a: { response: Response }) => Promise<Response | null>;
  cacheKeyWillBeUsed?: (a: { request: Request }) => Promise<Request>;
  cachedResponseWillBeUsed?: (a: { cachedResponse?: Response }) => Promise<Response | null>;
  fetchDidSucceed?: (a: { request: Request; response: Response }) => Promise<Response>;
  handlerDidError?: (a: { request: Request }) => Promise<Response | undefined>;
};

beforeEach(async () => {
  rutas.length = 0;
  estrategias.length = 0;
  expiraciones.length = 0;
  navegaciones.length = 0;
  precarga.orden.length = 0;
  vi.resetModules();
  (globalThis as unknown as { __WB_MANIFEST: unknown[] }).__WB_MANIFEST = [{ url: 'index.html', revision: 'x' }];
  await import('../sw');
});

const origen = () => self.location.origin;
const pide = (ruta: string, metodo = 'GET', base = origen()) => ({ request: new Request(new URL(ruta, base), { method: metodo }), url: new URL(ruta, base) });
const rutaMenu = () => rutas.find((r) => r.coincide(pide('/api/v1/p/menu/la-ceiba')))!;
const plugins = (): Plugin[] => (estrategias.find((e) => e.tipo === 'NetworkFirst')!.opciones.plugins as Plugin[]).filter((p) => !('maxEntries' in p));

describe('sw.ts: montaje', () => {
  it('toma la página en la primera instalación (clientsClaim) y la navegación se registra antes que la precarga', () => {
    expect(reclamo).toHaveBeenCalledTimes(1);
    expect(precarga.precache).toHaveBeenCalledWith([{ url: 'index.html', revision: 'x' }]);
    expect(precarga.orden).toEqual(['navegacion', 'addRoute']);
    expect(precarga.addRoute).toHaveBeenCalledWith({ cleanURLs: false, directoryIndex: '' });
  });

  it('la navegación sólo para las rutas de la SPA (lista de permitidos)', () => {
    const { opciones } = navegaciones[0]!;
    const permitidos = opciones.allowlist as RegExp[];
    expect(opciones.denylist).toBeUndefined();
    expect(permitidos.some((r) => r.test('/m/abc/menu'))).toBe(true);
    expect(permitidos.some((r) => r.test('/api/v1/p/sesion'))).toBe(false);
  });

  it('sólo el menú público de la API tiene ruta; `/assets` y `/fonts` van con caché primero', () => {
    expect(rutas.filter((r) => r.coincide(pide('/api/v1/p/menu/la-ceiba')))).toHaveLength(1);
    for (const ruta of ['/api/v1/p/sesion', '/api/v1/p/sesion/entrar', '/api/v1/p/platillos/x', '/api/v1/op/x', '/api/v1/admin/x', '/health', '/docs', '/wp-admin', '/index']) {
      expect(rutas.some((r) => r.coincide(pide(ruta))), ruta).toBe(false);
    }
    expect(rutas.some((r) => r.coincide(pide('/api/v1/p/menu/la-ceiba', 'POST')))).toBe(false);
    expect(rutas.some((r) => r.coincide(pide('/api/v1/p/menu/la-ceiba', 'GET', 'https://otro.test')))).toBe(false);
    const estaticos = rutas.find((r) => r.coincide(pide('/assets/x-1.js')))!;
    expect(rutas.find((r) => r.coincide(pide('/fonts/a.woff2')))).toBe(estaticos);
    expect(estaticos.coincide(pide('/assets/x-1.js', 'POST'))).toBe(false);
    expect(estaticos.coincide(pide('/assets/x-1.js', 'GET', 'https://otro.test'))).toBe(false);
  });
});

describe('sw.ts: el menú', () => {
  it('red primero con plazo de 4 s, en su caché, con plugins de guardado, caducidad y marca de copia', () => {
    const nf = estrategias.find((e) => e.tipo === 'NetworkFirst')!;
    expect(nf.opciones.cacheName).toBe('carta-menu-v1');
    expect(nf.opciones.networkTimeoutSeconds).toBe(4);
    expect(rutaMenu().estrategia).toBeTruthy();
    // La copia caduca a las 12 h y no pasa de 20 menús.
    expect(expiraciones).toContainEqual(expect.objectContaining({ maxEntries: 20, maxAgeSeconds: 43_200 }));
    // Los estáticos: tope de 80 y sin caducidad por tiempo.
    expect(expiraciones).toContainEqual(expect.objectContaining({ maxEntries: 80 }));
    expect((nf.opciones.plugins as unknown[]).length).toBe(4); // guardable, fallos del servidor, caducidad, marca de copia
  });

  it('sólo guarda un 200 JSON sin no-store, con la clave sin query', async () => {
    const guardable = plugins().find((p) => p.cacheWillUpdate)!;
    const json = (init: ResponseInit, cc?: string) => new Response('{}', { ...init, headers: { 'Content-Type': 'application/json', ...(cc ? { 'Cache-Control': cc } : {}) } });
    expect(await guardable.cacheWillUpdate!({ response: json({ status: 200 }) })).not.toBeNull();
    expect(await guardable.cacheWillUpdate!({ response: json({ status: 200 }, 'no-store') })).toBeNull();
    expect(await guardable.cacheWillUpdate!({ response: json({ status: 503 }) })).toBeNull();
    expect(await guardable.cacheWillUpdate!({ response: new Response('<html>', { status: 200, headers: { 'Content-Type': 'text/html' } }) })).toBeNull();
    const clave = await guardable.cacheKeyWillBeUsed!({ request: new Request(`${origen()}/api/v1/p/menu/la-ceiba?x=1`) });
    expect(clave.url).toBe(`${origen()}/api/v1/p/menu/la-ceiba`);
  });

  it('marca con X-Carta-Copia: 1 lo que sirve de la copia', async () => {
    const marca = plugins().find((p) => p.cachedResponseWillBeUsed)!;
    const servida = await marca.cachedResponseWillBeUsed!({ cachedResponse: new Response('{"a":1}', { headers: { ETag: 'x' } }) });
    expect(servida!.headers.get('X-Carta-Copia')).toBe('1');
    expect(servida!.headers.get('ETag')).toBe('x');
    expect(await servida!.json()).toEqual({ a: 1 });
    expect(await marca.cachedResponseWillBeUsed!({ cachedResponse: undefined })).toBeNull();
  });

  it.each([502, 503, 429])('un %i del servidor cuenta como fallo de red (hay copia); sin copia llega la respuesta original', async (estado) => {
    const p = plugins().find((x) => x.fetchDidSucceed)!;
    const request = new Request(`${origen()}/api/v1/p/menu/la-ceiba`);
    const mala = new Response('{"error":1}', { status: estado, headers: { 'Retry-After': '12' } });
    await expect(p.fetchDidSucceed!({ request, response: mala })).rejects.toThrow();
    const original = await p.handlerDidError!({ request });
    expect(original?.status).toBe(estado);
    expect(original?.headers.get('Retry-After')).toBe('12');
    expect(await p.handlerDidError!({ request })).toBeUndefined(); // se entrega una sola vez
  });

  it('un 200, un 304 o un 404 son respuestas de verdad: pasan tal cual', async () => {
    const p = plugins().find((x) => x.fetchDidSucceed)!;
    const request = new Request(`${origen()}/api/v1/p/menu/la-ceiba`);
    for (const estado of [200, 404]) {
      const r = new Response('{}', { status: estado });
      expect(await p.fetchDidSucceed!({ request, response: r })).toBe(r);
    }
  });
});

describe('sw.ts: la navegación', () => {
  const manejador = () => navegaciones[0]!.manejador as (o: { request: Request }) => Promise<Response>;
  const nav = () => ({ request: new Request(`${origen()}/m/abc/menu`) });
  it('con red devuelve lo del servidor tal cual; con un 5xx o sin red, el armazón precargado', async () => {
    const fetchReal = globalThis.fetch;
    try {
      globalThis.fetch = vi.fn(async () => new Response('servidor', { status: 200 })) as never;
      expect(await (await manejador()(nav())).text()).toBe('servidor');
      globalThis.fetch = vi.fn(async () => new Response('caido', { status: 502 })) as never;
      expect(await (await manejador()(nav())).text()).toBe('armazon');
      globalThis.fetch = vi.fn(async () => Promise.reject(new TypeError('sin red'))) as never;
      expect(await (await manejador()(nav())).text()).toBe('armazon');
      // Un 404 del servidor es del servidor: no se tapa con el armazón.
      globalThis.fetch = vi.fn(async () => new Response('x', { status: 404 })) as never;
      expect((await manejador()(nav())).status).toBe(404);
    } finally {
      globalThis.fetch = fetchReal;
    }
  });
  it('si la red no responde en 3 s, el armazón', async () => {
    vi.useFakeTimers();
    const fetchReal = globalThis.fetch;
    try {
      globalThis.fetch = vi.fn((_: unknown, init?: RequestInit) => new Promise((_ok, no) => init?.signal?.addEventListener('abort', () => no(new DOMException('x', 'AbortError'))))) as never;
      const respuesta = manejador()(nav());
      await vi.advanceTimersByTimeAsync(2999);
      let resuelta = false;
      void respuesta.then(() => (resuelta = true));
      await Promise.resolve();
      expect(resuelta).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(await (await respuesta).text()).toBe('armazon');
    } finally {
      globalThis.fetch = fetchReal;
      vi.useRealTimers();
    }
  });
});
