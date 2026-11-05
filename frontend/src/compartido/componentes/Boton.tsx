import type { ButtonHTMLAttributes, ReactNode } from 'react';

import estilos from './Boton.module.css';

export type VarianteBoton = 'primario' | 'secundario' | 'fantasma' | 'dorado';

export interface PropsBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton;
  /** Botón más bajo para barras y listas; sigue midiendo ≥ 44 px. */
  compacto?: boolean;
  /** Ocupa todo el ancho del contenedor (CTA principal al pie). */
  ancho?: boolean;
  /** Estado de carga: muestra el indicador y bloquea el clic. */
  cargando?: boolean;
  icono?: ReactNode;
  children?: ReactNode;
}

/**
 * Botón píldora de Carta. Migrado de `Btn` en prototipo/js/shared.jsx.
 * `primario` lleva el gradiente Vino; `dorado` es el acento y se usa a lo sumo una vez por pantalla.
 */
export function Boton({
  variante = 'primario',
  compacto = false,
  ancho = false,
  cargando = false,
  icono,
  children,
  className,
  disabled,
  type = 'button',
  ...resto
}: PropsBoton) {
  const clases = [
    estilos.boton,
    estilos[variante],
    compacto ? estilos.compacto : '',
    ancho ? estilos.ancho : '',
    cargando ? `${estilos.cargando} ${estilos.conEspera}` : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={clases}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...resto}
    >
      {cargando && <span className={estilos.espera} aria-hidden="true" />}
      <span className={estilos.contenido}>
        {icono}
        {children}
      </span>
    </button>
  );
}
