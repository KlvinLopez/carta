import { useEffect, useState } from 'react';

import estilos from './Entrada.module.css';

/**
 * Un solo aviso a la vez, el más específico: `copia` (lo que se ve es la última copia guardada del menú) gana
 * a `sin_conexion` (el teléfono no tiene red) y éste a `red`/`servidor` (el último sondeo de la mesa falló).
 */
export type AvisoSondeo = 'red' | 'servidor' | 'copia' | 'sin_conexion' | null;

const TEXTOS: Record<NonNullable<AvisoSondeo>, string> = {
  red: 'Perdimos la conexión un momento. Seguimos intentando.',
  servidor: 'Estamos teniendo un problema de nuestro lado. Seguimos intentando.',
  copia: 'Estás viendo la última copia del menú guardada en tu teléfono. Se actualiza sola cuando vuelva la conexión.',
  sin_conexion: 'Sin conexión. Puedes seguir viendo lo que ya cargó; el resto aparece cuando vuelva la red.',
};

/** Elige el único aviso que se pinta. */
export function avisoUnico({ deCopia, sinRed, sondeo }: { deCopia: boolean; sinRed: boolean; sondeo: 'red' | 'servidor' | null }): AvisoSondeo {
  if (deCopia) return 'copia';
  if (sinRed) return 'sin_conexion';
  return sondeo;
}

/** `true` mientras el navegador dice que no hay red (`offline`/`online`); sólo es una pista, no una prueba. */
export function useSinRed(): boolean {
  const [sinRed, setSinRed] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  useEffect(() => {
    const alIrse = () => setSinRed(true);
    const alVolver = () => setSinRed(false);
    window.addEventListener('offline', alIrse);
    window.addEventListener('online', alVolver);
    setSinRed(navigator.onLine === false);
    return () => {
      window.removeEventListener('offline', alIrse);
      window.removeEventListener('online', alVolver);
    };
  }, []);
  return sinRed;
}

/** Se conserva lo pintado y se avisa sin tapar nada. */
export function AvisoConexion({ aviso }: { aviso: AvisoSondeo }) {
  if (!aviso) return null;
  return (
    <p className={estilos.aviso} role="status">
      {TEXTOS[aviso]}
    </p>
  );
}
