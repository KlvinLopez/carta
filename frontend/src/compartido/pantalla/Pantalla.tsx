import type { ReactNode } from 'react';

import estilos from './Pantalla.module.css';

export interface PropsPantalla {
  children: ReactNode;
  /** El panel del operador puede ensancharse en escritorio; las demás áreas son de teléfono. */
  escritorio?: boolean;
  className?: string;
}

/** Contenedor de página: fondo Crema (del body), ancho de teléfono y espacios seguros. */
export function Pantalla({ children, escritorio = false, className }: PropsPantalla) {
  return (
    <main
      className={['pantalla', estilos.pantalla, escritorio ? estilos.escritorio : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </main>
  );
}

export { estilos as estilosPantalla };
