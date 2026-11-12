/// <reference lib="webworker" />
// Service worker de Carta (T-2.7). Lo compila `vite-plugin-pwa` (estrategia injectManifest) y queda
// en `dist/sw.js`, que la API sirve `no-cache`.
//
// Qué hace:
//  - Precarga el armazón del comensal (lista en `__WB_MANIFEST`, ver `vite.config.ts`).
//  - Navegación a una ruta de la SPA: **red primero** (plazo de 3 s) y la respuesta del servidor se devuelve tal
//    cual, sin guardarla (así un despliegue, y las cabeceras nuevas como la CSP, llegan en la siguiente carga);
//    sólo si la red falla o vence el plazo se usa el `index.html` precargado. Nunca se guarda la URL visitada
//    (`/m/<código>` es una credencial: ninguna clave de Cache Storage la contiene).
//  - `/assets/` y `/fonts/` con hash: caché primero, al usarse (así los trozos de /admin no se bajan solos).
//  - `GET /api/v1/p/menu/{slug}`: red primero con plazo corto y, si falla, la última copia (con la
//    cabecera `X-Carta-Copia` para que la pantalla lo diga). Es lo ÚNICO de la API que se guarda.
//  - Todo lo demás (`/api` restante, otros orígenes, POST…) pasa a la red sin tocar.
//
// Actualización: sin `skipWaiting`. Una versión nueva se instala y espera a que ninguna pestaña dependa de la
// vieja; nunca recarga ni toma una mesa a media orden. `clients.claim()` en `activate` sólo actúa en la primera
// instalación (un worker nuevo no se activa mientras queden pestañas del viejo): así la primera página ya queda
// controlada y la copia del menú se guarda en la primera visita. La navegación va por red primero, así que lo
// precargado nunca es lo que se ve con red. Marcha atrás: ver `VITE_SW_APAGADO` en `vite.config.ts`.
import { addRoute, cleanupOutdatedCaches, createHandlerBoundToURL, precache } from 'workbox-precaching';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { clientsClaim, type WorkboxPlugin } from 'workbox-core';

import {
  CABECERA_COPIA,
  CACHE_ESTATICOS,
  CACHE_MENU,
  ESTATICOS_MAX_ENTRADAS,
  MENU_MAX_EDAD_S,
  MENU_MAX_ENTRADAS,
  MENU_PLAZO_RED_S,
  NAVEGACION_PLAZO_MS,
  RUTAS_SPA,
  esFalloDeServidor,
  esGuardable,
  esPeticionDeMenu,
} from './pwa/rutas';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<string | { url: string; revision: string | null }> };

clientsClaim();

// La lista se declara primero (`createHandlerBoundToURL` exige que `/index.html` ya esté en ella) pero la ruta de la
// precarga se registra después de la navegación.
precache(self.__WB_MANIFEST);
const armazon = createHandlerBoundToURL('/index.html');

/** Red primero con plazo; con red caída, vencida o un 5xx del borde, el `index.html` precargado. */
registerRoute(
  new NavigationRoute(
    async (opciones) => {
      const control = new AbortController();
      const plazo = setTimeout(() => control.abort(), NAVEGACION_PLAZO_MS);
      try {
        const respuesta = await fetch(opciones.request, { signal: control.signal });
        if (respuesta.status < 500) return respuesta; // tal cual: no se guarda
      } catch {
        // sin red o vencido el plazo: cae al armazón
      } finally {
        clearTimeout(plazo);
      }
      return armazon(opciones);
    },
    { allowlist: [RUTAS_SPA] },
  ),
);

// Sin `directoryIndex` ni `cleanURLs`: el servidor no responde `/index` ni `/` con el archivo, y la precarga
// tampoco (la navegación ya está registrada arriba y es la que decide).
addRoute({ cleanURLs: false, directoryIndex: '' });
cleanupOutdatedCaches();

// Estáticos con hash que no están en el armazón (trozos de /admin, latin-ext…): se guardan al usarse.
registerRoute(
  ({ request, url }) => request.method === 'GET' && url.origin === self.location.origin && /^\/(?:assets|fonts)\//.test(url.pathname),
  new CacheFirst({
    cacheName: CACHE_ESTATICOS,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: ESTATICOS_MAX_ENTRADAS, purgeOnQuotaError: true }),
    ],
  }),
);

/** Guarda sólo lo que `esGuardable` admite, con una clave sin query (el slug basta). */
const soloMenuGuardable: WorkboxPlugin = {
  cacheWillUpdate: async ({ response }) => (esGuardable(response) ? response : null),
  cacheKeyWillBeUsed: async ({ request }) => {
    const url = new URL(request.url);
    return new Request(url.origin + url.pathname);
  },
};

/** Marca la respuesta que sale de la copia: la pantalla no la trata como recién leída. */
const marcarCopia: WorkboxPlugin = {
  cachedResponseWillBeUsed: async ({ cachedResponse }) => {
    if (!cachedResponse) return null;
    const cabeceras = new Headers(cachedResponse.headers);
    cabeceras.set(CABECERA_COPIA, '1');
    return new Response(cachedResponse.body, { status: cachedResponse.status, statusText: cachedResponse.statusText, headers: cabeceras });
  },
};

/**
 * Un 5xx o un 429 del menú cuenta como fallo de red **si hay copia** (`fetchDidSucceed` guarda la respuesta mala y
 * lanza: `NetworkFirst` cae a la copia). Si no hay copia, `handlerDidError` devuelve la respuesta original del
 * servidor para que la página vea el 503, o el 429 con su `Retry-After`, como sin worker.
 */
const respuestasMalas = new Map<string, Response>();
const fallosDelServidor: WorkboxPlugin = {
  fetchDidSucceed: async ({ request, response }) => {
    if (!esFalloDeServidor(response.status)) {
      respuestasMalas.delete(request.url);
      return response;
    }
    respuestasMalas.set(request.url, response.clone());
    throw new Error(`El servidor respondió ${response.status}`);
  },
  handlerDidError: async ({ request }) => {
    const mala = respuestasMalas.get(request.url);
    respuestasMalas.delete(request.url);
    return mala;
  },
};

registerRoute(
  ({ request, url }) => esPeticionDeMenu(request, url, self.location.origin),
  new NetworkFirst({
    cacheName: CACHE_MENU,
    networkTimeoutSeconds: MENU_PLAZO_RED_S,
    plugins: [
      soloMenuGuardable,
      fallosDelServidor,
      new ExpirationPlugin({ maxEntries: MENU_MAX_ENTRADAS, maxAgeSeconds: MENU_MAX_EDAD_S, purgeOnQuotaError: true }),
      marcarCopia,
    ],
  }),
);
