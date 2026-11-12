// Guardia de recarga para `vite:preloadError` (T-0.6, revisión de la maestra).
//
// Un trozo que ya no existe en el servidor (despliegue nuevo mientras una pestaña vieja navega)
// dispara este evento y la salida limpia es recargar (patrón documentado por Vite). Pero si el
// borde cacheó un 404 del trozo nuevo durante el solape del despliegue, recargar sin límite es
// una tormenta de recargas: aquí se recarga **una sola vez por URL** (clave en sessionStorage,
// una conveniencia por pestaña) y, si ya se recargó, se deja pasar el error para que
// `LimiteError` muestre "Reintentar".

const PREFIJO = 'carta:recargado:';

export interface Ventana {
  location: { href: string; reload: () => void };
  sessionStorage: Pick<Storage, 'getItem' | 'setItem'>;
  /**
   * Con un service worker (T-2.7) la pestaña vieja sigue recibiendo el `index.html` precargado, que pide los
   * mismos trozos que ya no existen: recargar sin más repetiría el fallo. Antes de recargar se da de baja el
   * worker y se vacían sus copias; la recarga trae la versión nueva de la red.
   */
  liberarServiceWorker?: () => Promise<void>;
  /** Sin red no se libera ni se recarga: recargar iría a la página de error del navegador y se perdería la copia. */
  navigator?: { onLine: boolean };
}

/** Devuelve `true` si recargó (y canceló el evento); `false` si dejó pasar el error. */
export function manejarPreloadError(evento: Event, ventana: Ventana): boolean {
  // Un trozo que falla porque no hay red no es un despliegue nuevo: se deja pasar el error (`LimiteError` con «Reintentar»).
  if (ventana.navigator?.onLine === false) return false;
  const clave = PREFIJO + ventana.location.href;
  try {
    if (ventana.sessionStorage.getItem(clave) !== null) return false;
    ventana.sessionStorage.setItem(clave, String(Date.now()));
  } catch {
    // Sin storage (modo privado, bloqueado) no se puede garantizar "una sola vez": no recargar.
    return false;
  }
  evento.preventDefault();
  if (ventana.liberarServiceWorker) {
    void ventana.liberarServiceWorker().then(() => ventana.location.reload(), () => ventana.location.reload());
  } else {
    ventana.location.reload();
  }
  return true;
}

export function instalarGuardiaDeRecarga(ventana: Window, liberar?: () => Promise<void>): void {
  ventana.addEventListener('vite:preloadError', (evento) => {
    // Getters: leer `sessionStorage` puede lanzar con el sitio bloqueado, y `manejarPreloadError` lo atiende.
    const v: Ventana = liberar
      ? {
          get navigator() {
            return ventana.navigator;
          },
          get location() {
            return ventana.location;
          },
          get sessionStorage() {
            return ventana.sessionStorage;
          },
          liberarServiceWorker: liberar,
        }
      : ventana;
    manejarPreloadError(evento, v);
  });
}
