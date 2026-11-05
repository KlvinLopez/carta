import type { HTMLAttributes, KeyboardEvent, MouseEvent, ReactNode } from 'react';

import estilos from './Tarjeta.module.css';

export interface PropsTarjeta extends Omit<HTMLAttributes<HTMLElement>, 'onClick'> {
  /** `superficie` (blanco, con sombra cálida) para tarjetas interactivas; `crema-baja` para agrupar. */
  tono?: 'superficie' | 'crema-baja';
  /** Sombra más larga para elementos que flotan (resumen al pie, destacados). */
  flotante?: boolean;
  /** Sin relleno interno, para fotos a sangre. */
  ajustada?: boolean;
  /** Si se pasa, la tarjeta completa se comporta como botón (clic, Enter y Espacio). */
  onClick?: () => void;
  children: ReactNode;
}

/** Un clic que nace en un control anidado (chip, botón, enlace) no cuenta como clic en la tarjeta. */
function naceEnControlAnidado(evento: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>): boolean {
  const objetivo = evento.target as HTMLElement;
  const control = objetivo.closest('button, a, input, select, textarea, [role="button"]');
  return control !== null && control !== evento.currentTarget;
}

/**
 * Contenedor base de Carta (radio 24 px, sombra tintada de Vino, sin bordes).
 * Migrado de la clase `.card` de prototipo/carta-assets/colors_and_type.css.
 * La variante tocable es un `div` con `role="button"` (no un `<button>`) para que dentro
 * puedan ir chips o botones sin anidar botones en el DOM.
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
    const alTeclear = (evento: KeyboardEvent<HTMLElement>) => {
      if (naceEnControlAnidado(evento)) return;
      if (evento.key === 'Enter' || evento.key === ' ') {
        evento.preventDefault();
        onClick();
      }
    };
    const alHacerClic = (evento: MouseEvent<HTMLElement>) => {
      if (naceEnControlAnidado(evento)) return;
      onClick();
    };
    return (
      <div
        role="button"
        tabIndex={0}
        className={clases}
        onClick={alHacerClic}
        onKeyDown={alTeclear}
        {...resto}
      >
        {children}
      </div>
    );
  }
  return (
    <section className={clases} {...resto}>
      {children}
    </section>
  );
}
