/**
 * Dónde estaba la persona en el menú al abrir un platillo, para dejarla exactamente ahí al volver.
 * `y` es el desplazamiento de la página; `tope` es dónde estaba la tarjeta abierta respecto a la ventana.
 * El menú pinta cada categoría con `content-visibility: auto` (altura estimada hasta que se ve), así que
 * `y` solo no basta: tras `scrollTo(y)` se corrige con lo que de verdad mide la tarjeta.
 */
export interface PosicionMenu {
  y: number;
  id: string;
  /** Cuál de las tarjetas con ese id (el «Top 3» repite platillos de la lista). */
  indice: number;
  tope: number | null;
}

function tarjetasDe(id: string): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-platillo]')].filter((el) => el.dataset.platillo === id);
}

/** Cuánto de la tarjeta se ve en la ventana, en píxeles de alto. */
function visible(el: HTMLElement): number {
  const r = el.getBoundingClientRect();
  return Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
}

/** Anota la posición actual y la tarjeta que se abre (la enfocada o, si no, la más a la vista). */
export function capturarPosicion(id: string): PosicionMenu {
  const tarjetas = tarjetasDe(id);
  const enfocada = tarjetas.find((el) => el.contains(document.activeElement));
  const masVisible = tarjetas.reduce<HTMLElement | undefined>((mejor, el) => (mejor === undefined || visible(el) > visible(mejor) ? el : mejor), undefined);
  const tarjeta = enfocada ?? masVisible;
  return {
    y: window.scrollY,
    id,
    indice: tarjeta ? tarjetas.indexOf(tarjeta) : 0,
    tope: tarjeta ? tarjeta.getBoundingClientRect().top : null,
  };
}

/** La tarjeta que se abrió, si sigue en la lista (para devolverle el foco). */
export function tarjetaDePosicion(pos: PosicionMenu): HTMLElement | null {
  return tarjetasDe(pos.id)[pos.indice] ?? null;
}

/** Deja la página donde estaba. */
export function restaurarPosicion(pos: PosicionMenu): void {
  window.scrollTo(0, pos.y);
  const tarjeta = tarjetaDePosicion(pos);
  if (tarjeta && pos.tope !== null) {
    const desvio = tarjeta.getBoundingClientRect().top - pos.tope;
    if (Math.abs(desvio) >= 1) window.scrollBy(0, desvio);
  }
}
