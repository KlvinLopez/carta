import { Link } from 'react-router-dom';

import { Pantalla, estilosPantalla as e } from './Pantalla';

/** 404 en el lenguaje de la marca. */
export function NoEncontrada() {
  return (
    <Pantalla>
      <div className={e.centrado}>
        <div className={e.ilustracion} aria-hidden="true">
          ?
        </div>
        <h1 className={e.titulo}>No encontramos esta página</h1>
        <p className={e.texto}>
          Si escaneaste un código de mesa, pide al personal que te comparta el QR de nuevo.
        </p>
        <Link to="/">Ir al inicio</Link>
      </div>
    </Pantalla>
  );
}
