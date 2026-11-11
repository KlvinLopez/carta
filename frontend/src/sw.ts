/// <reference lib="webworker" />
// Service worker de Carta (T-2.7). Lo compila `vite-plugin-pwa` (estrategia injectManifest) y queda
// en `dist/sw.js`, que la API sirve `no-cache`.
//
// Qué hace:
//  - Precarga el armazón del comensal (lista en `__WB_MANIFEST`, ver `vite.config.ts`).
//  - Navegación a una ruta de la SPA: el `index.html` precargado. No guarda la URL visitada
//    (`/m/<código>` es una credencial: ninguna clave de Cache Storage la contiene).
//  - `/assets/` y `/fonts/` con hash: caché primero, al usarse (así los trozos de /admin no se bajan solos).
//  - `GET /api/v1/p/menu/{slug}`: red primero con plazo corto y, si falla, la última copia (con la
//    cabecera `X-Carta-Copia` para que la pantalla lo diga). Es lo ÚNICO de la API que se guarda.
//  - Todo lo demás (`/api` restante, otros orígenes, POST…) pasa a la red sin tocar.
//
// Actualización: sin `skipWaiting` ni `clients.claim`. Una versión nueva se instala y espera a que
// ninguna pestaña dependa de la vieja; nunca recarga ni toma una mesa a media orden.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import type { WorkboxPlugin } from 'workbox-core';

import {
  CABECERA_COPIA,
  CACHE_ESTATICOS,
  CACHE_MENU,
  ESTATICOS_MAX_ENTRADAS,
  MENU_MAX_EDAD_S,
  MENU_MAX_ENTRADAS,
  MENU_PLAZO_RED_S,
  RUTAS_SPA,
  esGuardable,
  esPeticionDeMenu,
} from './pwa/rutas';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<string | { url: string; revision: string | null }> };

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { allowlist: [RUTAS_SPA] }));

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

registerRoute(
  ({ request, url }) => esPeticionDeMenu(request, url, self.location.origin),
  new NetworkFirst({
    cacheName: CACHE_MENU,
    networkTimeoutSeconds: MENU_PLAZO_RED_S,
    plugins: [
      soloMenuGuardable,
      new ExpirationPlugin({ maxEntries: MENU_MAX_ENTRADAS, maxAgeSeconds: MENU_MAX_EDAD_S, purgeOnQuotaError: true }),
      marcarCopia,
    ],
  }),
);
