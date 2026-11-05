import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
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

const SELECTOR_ENFOCABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Hoja inferior estilo iOS 17: acciones y detalles suben desde abajo; nunca modales centrados.
 * Migrada del patrón `sheet-up` + `Grip` del prototipo (prototipo/js/comensal-flow.jsx, shared.jsx).
 *
 * Foco: al abrir toma el foco (sólo si no está ya dentro), el resto de la página queda `inert`
 * y Tab circula dentro de la hoja; al cerrar el foco vuelve al elemento que la abrió.
 * Se cierra con el fondo, con Escape o con el botón; bloquea el desplazamiento del cuerpo.
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
  // Siempre la última `onCerrar`, sin reejecutar el efecto cuando el padre pasa una lambda nueva.
  const refOnCerrar = useRef(onCerrar);
  refOnCerrar.current = onCerrar;

  useEffect(() => {
    if (!abierta) return;
    const disparador = document.activeElement as HTMLElement | null;
    const raiz = document.getElementById('app');
    const desplazamientoPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    raiz?.setAttribute('inert', '');

    const alTeclear = (evento: globalThis.KeyboardEvent) => {
      if (evento.key === 'Escape') refOnCerrar.current();
    };
    document.addEventListener('keydown', alTeclear);

    const hoja = refHoja.current;
    if (hoja && !hoja.contains(document.activeElement)) hoja.focus();

    return () => {
      document.body.style.overflow = desplazamientoPrevio;
      raiz?.removeAttribute('inert');
      document.removeEventListener('keydown', alTeclear);
      if (disparador && disparador.isConnected && typeof disparador.focus === 'function') {
        disparador.focus();
      }
    };
  }, [abierta]);

  // Tab circula dentro de la hoja (respaldo de `inert` para navegadores que no lo conocen).
  const alTeclearEnHoja = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key !== 'Tab' || !refHoja.current) return;
    const hoja = refHoja.current;
    const enfocables = Array.from(hoja.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLE));
    if (enfocables.length === 0) {
      evento.preventDefault();
      return;
    }
    const primero = enfocables[0]!;
    const ultimo = enfocables[enfocables.length - 1]!;
    const activo = document.activeElement;
    if (evento.shiftKey && (activo === primero || activo === hoja)) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && activo === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  };

  if (!abierta) return null;

  return createPortal(
    <div className={estilos.capa}>
      <div className={estilos.fondo} onClick={() => refOnCerrar.current()} data-testid="fondo-hoja" />
      <div
        ref={refHoja}
        className={estilos.hoja}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titulo ? idTitulo : undefined}
        aria-describedby={descripcion ? idDescripcion : undefined}
        tabIndex={-1}
        onKeyDown={alTeclearEnHoja}
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
            <button
              type="button"
              className={estilos.cerrar}
              onClick={() => refOnCerrar.current()}
              aria-label={etiquetaCerrar}
            >
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
