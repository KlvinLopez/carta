/**
 * Qué tarjeta del menú abrió la persona, para devolverle el foco al volver. El detalle se abre como capa
 * sobre el menú (que no se desmonta): la posición de desplazamiento y los tamaños ya medidos no se tocan.
 * El «Top 3» repite platillos de la lista, así que se elige la copia enfocada o, si no, la más a la vista.
 */
function tarjetasDe(id: string): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-platillo]')].filter((el) => el.dataset.platillo === id);
}

/** Cuánto de la tarjeta se ve en la ventana, en píxeles de alto. */
function visible(el: HTMLElement): number {
  const r = el.getBoundingClientRect();
  return Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
}

export function tarjetaAbierta(id: string): HTMLElement | null {
  const tarjetas = tarjetasDe(id);
  const enfocada = tarjetas.find((el) => el === document.activeElement || el.contains(document.activeElement));
  if (enfocada) return enfocada;
  return tarjetas.reduce<HTMLElement | null>((mejor, el) => (mejor === null || visible(el) > visible(mejor) ? el : mejor), null);
}
