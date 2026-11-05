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
}

/** Devuelve `true` si recargó (y canceló el evento); `false` si dejó pasar el error. */
export function manejarPreloadError(evento: Event, ventana: Ventana): boolean {
  const clave = PREFIJO + ventana.location.href;
  try {
    if (ventana.sessionStorage.getItem(clave) !== null) return false;
    ventana.sessionStorage.setItem(clave, String(Date.now()));
  } catch {
    // Sin storage (modo privado, bloqueado) no se puede garantizar "una sola vez": no recargar.
    return false;
  }
  evento.preventDefault();
  ventana.location.reload();
  return true;
}

export function instalarGuardiaDeRecarga(ventana: Window): void {
  ventana.addEventListener('vite:preloadError', (evento) => {
    manejarPreloadError(evento, ventana);
  });
}
