import type { ReactNode } from 'react';

import estilos from './Chip.module.css';

export type TonoChip = 'neutro' | 'vino' | 'dorado' | 'exito' | 'error';

export interface PropsChip {
  tono?: TonoChip;
  children: ReactNode;
  /** Si se pasa, el chip es un botón (filtro o categoría) con área táctil ≥ 44 px. */
  onClick?: () => void;
  /** Filtro seleccionado: fondo Vino y `aria-pressed`. */
  activo?: boolean;
  className?: string;
}

/**
 * Etiqueta píldora. Migrado de `Chip` en prototipo/js/shared.jsx.
 * Informativo por defecto (`span`); con `onClick` se vuelve un botón de filtro.
 */
export function Chip({ tono = 'neutro', children, onClick, activo = false, className }: PropsChip) {
  const clases = [
    estilos.chip,
    estilos[tono],
    onClick ? estilos.tocable : '',
    activo ? estilos.activo : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  if (onClick) {
    return (
      <button type="button" className={clases} onClick={onClick} aria-pressed={activo}>
        {children}
      </button>
    );
  }
  return <span className={clases}>{children}</span>;
}
