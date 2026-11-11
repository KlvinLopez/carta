import { useEffect, useState } from 'react';

import { Pantalla, estilosPantalla as e } from '../../compartido/pantalla/Pantalla';
import estilos from './Entrada.module.css';

/** Pasado este tiempo se le dice a la persona que seguimos intentando (red lenta). */
export const ESPERA_LARGA_MS = 8000;

/** Mientras `entrar` responde: la forma de la bienvenida, nunca una pantalla en blanco. */
export function Esqueleto() {
  const [lento, setLento] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLento(true), ESPERA_LARGA_MS);
    return () => clearTimeout(t);
  }, []);
  return (
    <Pantalla>
      <div className={estilos.esqueleto} role="status" aria-live="polite">
        <span className={estilos['solo-lectores']}>
          {lento ? 'Está tardando más de lo normal. Seguimos buscando tu mesa…' : 'Buscando tu mesa…'}
        </span>
        <div className={estilos.marca} aria-hidden="true">
          <div className={`${estilos.bloque} ${estilos.bloqueLogo}`} />
          <div className={`${estilos.bloque} ${estilos.bloqueLinea}`} />
        </div>
        <div className={`${estilos.bloque} ${estilos.bloqueTitulo}`} aria-hidden="true" />
        <div className={`${estilos.bloque} ${estilos.bloqueTarjeta}`} aria-hidden="true" />
        <div className={`${estilos.bloque} ${estilos.bloqueBoton}`} aria-hidden="true" />
        {lento && (
          <p className={e.texto} aria-hidden="true">
            Está tardando más de lo normal. Seguimos buscando tu mesa…
          </p>
        )}
      </div>
    </Pantalla>
  );
}
