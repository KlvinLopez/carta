import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import estilos from './HojaInferior.module.css';

export interface PropsHojaInferior {
  abierta: boolean;
  onCerrar: () => void;
  titulo?: string;
  descripcion?: string;
  children: ReactNode;
  /** Etiqueta accesible del botón de cierre. */
  etiquetaCerrar?: string;
}

/**
 * Hoja inferior estilo iOS 17: acciones y detalles suben desde abajo; nunca modales centrados.
 * Migrada del patrón `sheet-up` + `Grip` del prototipo (prototipo/js/comensal-flow.jsx, shared.jsx).
 * Se cierra con el fondo, con Escape o con el botón; bloquea el desplazamiento del cuerpo mientras está abierta.
 */
export function HojaInferior({
  abierta,
  onCerrar,
  titulo,
  descripcion,
  children,
  etiquetaCerrar = 'Cerrar',
}: PropsHojaInferior) {
  const idTitulo = useId();
  const idDescripcion = useId();
  const refHoja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierta) return;
    const desplazamientoPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', alTeclear);
    refHoja.current?.focus();
    return () => {
      document.body.style.overflow = desplazamientoPrevio;
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierta, onCerrar]);

  if (!abierta) return null;

  return createPortal(
    <div className={estilos.capa}>
      <div className={estilos.fondo} onClick={onCerrar} data-testid="fondo-hoja" />
      <div
        ref={refHoja}
        className={estilos.hoja}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titulo ? idTitulo : undefined}
        aria-describedby={descripcion ? idDescripcion : undefined}
        tabIndex={-1}
      >
        <div className={estilos.asa} aria-hidden="true" />
        {(titulo || descripcion) && (
          <header className={estilos.encabezado}>
            <div>
              {titulo && (
                <h2 id={idTitulo} className={estilos.titulo}>
                  {titulo}
                </h2>
              )}
              {descripcion && (
                <p id={idDescripcion} className={estilos.descripcion}>
                  {descripcion}
                </p>
              )}
            </div>
            <button type="button" className={estilos.cerrar} onClick={onCerrar} aria-label={etiquetaCerrar}>
              <span aria-hidden="true">×</span>
            </button>
          </header>
        )}
        <div className={estilos.contenido}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
