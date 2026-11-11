// Registro del service worker (T-2.7). Sólo en el build de producción: ni `vite dev` ni vitest lo
// registran. La CSP no admite scripts en línea, así que se registra desde el código.
//
// Actualización: `updateViaCache: 'none'` y `sw.js` sale `no-cache`, de modo que el navegador mira
// si cambió en cada navegación completa. El worker nuevo se instala y espera; no se llama a
// `skipWaiting` ni a `clients.claim` y la página no se recarga sola: una versión nueva entra
// cuando se cierran las pestañas abiertas o se navega a una página nueva, nunca a media orden.

interface Contenedor {
  serviceWorker?: Pick<ServiceWorkerContainer, 'register'>;
}

export function registrarServiceWorker(
  navegador: Contenedor = navigator,
  ventana: Pick<Window, 'addEventListener'> & { document: Pick<Document, 'readyState'> } = window,
  produccion: boolean = import.meta.env.PROD,
): void {
  if (!produccion || !navegador.serviceWorker) return;
  const registrar = () => {
    // Sin worker la app funciona igual (sólo sin copia sin conexión): un fallo no se propaga.
    navegador.serviceWorker?.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => undefined);
  };
  // Después de la carga, para no competir con el menú por la red.
  if (ventana.document.readyState === 'complete') registrar();
  else ventana.addEventListener('load', registrar, { once: true });
}

/**
 * Deja la app sin worker ni copias: la salida cuando una pestaña vieja pide un trozo que el servidor ya
 * no tiene (ver `recarga.ts`) y, de paso, la marcha atrás si un worker se portara mal.
 */
export async function liberarServiceWorker(
  navegador: { serviceWorker?: Pick<ServiceWorkerContainer, 'getRegistrations'> } = navigator,
  almacenes: Pick<CacheStorage, 'keys' | 'delete'> | undefined = typeof caches === 'undefined' ? undefined : caches,
): Promise<void> {
  try {
    const registros = (await navegador.serviceWorker?.getRegistrations()) ?? [];
    await Promise.all(registros.map((r) => r.unregister()));
    if (almacenes) await Promise.all((await almacenes.keys()).map((k) => almacenes.delete(k)));
  } catch {
    // Mejor recargar con lo que haya que quedarse en blanco.
  }
}
