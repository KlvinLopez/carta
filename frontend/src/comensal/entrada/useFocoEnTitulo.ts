import { useEffect, useRef } from 'react';

/**
 * Al aparecer una pantalla, el foco va a su título: un lector de pantalla la anuncia y quien navega
 * con teclado no se queda en un botón que ya no existe. El título es `tabIndex={-1}`.
 */
export function useFocoEnTitulo<T extends HTMLElement = HTMLHeadingElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return ref;
}
