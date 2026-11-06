import { Pantalla, estilosPantalla as e } from './Pantalla';

/** Estado de carga de una área mientras llega su trozo de código. */
export function Cargando({ texto = 'Preparando la mesa…' }: { texto?: string }) {
  return (
    <Pantalla>
      <div className={e.centrado} role="status" aria-live="polite">
        <div className={e.espera} aria-hidden="true" />
        <p className={e.texto}>{texto}</p>
      </div>
    </Pantalla>
  );
}
