import { useParams } from 'react-router-dom';

import { PantallaError } from './entrada/PantallaError';
import { SesionMesa } from './SesionMesa';

/** Forma de `mesa.codigo_publico` (03 §2: ≥ 22 caracteres, columna de 100). */
export const CODIGO_MESA = /^[A-Za-z0-9_-]{22,100}$/;

/**
 * Área del comensal (`/m/:codigo/*`): la entrada a la mesa y el menú; el detalle del platillo (T-2.6) y
 * la orden (Fase 3) cuelgan de la misma sesión.
 */
export default function AreaComensal() {
  const { codigo } = useParams<{ codigo: string }>();

  // Un código que no puede ser de una mesa no llega a la API: la misma pantalla que un 404.
  if (!codigo || !CODIGO_MESA.test(codigo)) {
    return <PantallaError clase="mesa_invalida" onReintentar={() => undefined} />;
  }
  return <SesionMesa key={codigo} codigo={codigo} />;
}
