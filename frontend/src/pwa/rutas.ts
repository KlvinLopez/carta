// Qué toca y qué no toca el service worker (T-2.7). Vive aparte de `sw.ts` para poder probarlo sin
// un worker: `sw.ts` sólo importa estas constantes.

/**
 * Rutas de la SPA a las que el worker responde con el `index.html` precargado. Es una lista de
 * **permitidos**: debe coincidir con `PREFIJOS_SPA` de `app/core/estaticos.py` (`/` y `/m`,
 * `/staff`, `/admin` con lo que cuelgue de ellos); una prueba (`pwa-rutas.test.ts`) las ata.
 * `/api/…`, `/health`, `/docs`, `/almacen/…` y cualquier ruta desconocida pasan a la red tal cual.
 * Se compara contra `pathname + search`.
 */
export const PREFIJOS_SPA = ['m', 'staff', 'admin'] as const;
export const RUTAS_SPA: RegExp = new RegExp(`^/(?:\\?.*)?$|^/(?:${PREFIJOS_SPA.join('|')})(?:[/?].*)?$`);

/** Lo único de la API que se guarda: el menú público de un restaurante (`GET /api/v1/p/menu/{slug}`). */
export const RUTA_MENU = /^\/api\/v1\/p\/menu\/[^/]+$/;

/** Cabecera que el worker añade a un menú servido desde la copia (la red falló). */
export const CABECERA_COPIA = 'X-Carta-Copia';

export const CACHE_MENU = 'carta-menu-v1';
export const CACHE_ESTATICOS = 'carta-estaticos-v1';
/** La copia del menú caduca a las 12 h (el brief permitía 24 h) y no pasa de 20 restaurantes. */
export const MENU_MAX_EDAD_S = 12 * 60 * 60;
export const MENU_MAX_ENTRADAS = 20;
/** Si la red no responde en este plazo se sirve la copia (mientras, la petición sigue y la actualiza). */
export const MENU_PLAZO_RED_S = 4;
export const ESTATICOS_MAX_ENTRADAS = 80;

/** ¿Es una petición que el worker puede responder desde la copia del menú? */
export function esPeticionDeMenu(peticion: { method: string }, url: URL, origen: string): boolean {
  return peticion.method === 'GET' && url.origin === origen && RUTA_MENU.test(url.pathname);
}

/** ¿Vale la pena guardar esta respuesta? Sólo un 200 sin `no-store`/`private`, y nunca una opaca. */
export function esGuardable(respuesta: Pick<Response, 'status' | 'type' | 'headers'>): boolean {
  if (respuesta.status !== 200 || respuesta.type === 'opaque') return false;
  const control = (respuesta.headers.get('Cache-Control') ?? '').toLowerCase();
  return !/(?:^|[\s,])(?:no-store|private)(?:[\s,=]|$)/.test(control);
}
