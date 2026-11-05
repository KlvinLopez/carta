import { Pantalla, estilosPantalla as e } from './Pantalla';

/** Estado de carga de una área mientras llega su trozo de código. */
export function Cargando() {
  return (
    <Pantalla>
      <div className={e.centrado} role="status" aria-live="polite">
        <div className={e.espera} aria-hidden="true" />
        <p className={e.texto}>Preparando la mesa…</p>
      </div>
    </Pantalla>
  );
}
