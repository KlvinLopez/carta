import type { HTMLAttributes, ReactNode } from 'react';

import estilos from './Tarjeta.module.css';

export interface PropsTarjeta extends Omit<HTMLAttributes<HTMLElement>, 'onClick'> {
  /** `superficie` (blanco, con sombra cálida) para tarjetas interactivas; `crema-baja` para agrupar. */
  tono?: 'superficie' | 'crema-baja';
  /** Sombra más larga para elementos que flotan (resumen al pie, destacados). */
  flotante?: boolean;
  /** Sin relleno interno, para fotos a sangre. */
  ajustada?: boolean;
  /** Si se pasa, la tarjeta completa es un botón accesible. */
  onClick?: () => void;
  children: ReactNode;
}

/**
 * Contenedor base de Carta (radio 24 px, sombra tintada de Vino, sin bordes).
 * Migrado de la clase `.card` de prototipo/carta-assets/colors_and_type.css.
 */
export function Tarjeta({
  tono = 'superficie',
  flotante = false,
  ajustada = false,
  onClick,
  children,
  className,
  ...resto
}: PropsTarjeta) {
  const clases = [
    estilos.tarjeta,
    tono === 'crema-baja' ? estilos.cremaBaja : '',
    flotante ? estilos.flotante : '',
    ajustada ? estilos.ajustada : '',
    onClick ? estilos.interactiva : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  if (onClick) {
    return (
      <button type="button" className={clases} onClick={onClick} {...resto}>
        {children}
      </button>
    );
  }
  return (
    <section className={clases} {...resto}>
      {children}
    </section>
  );
}
