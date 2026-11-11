import { useParams } from 'react-router-dom';

import { PantallaError } from './entrada/PantallaError';
import { PantallaEntrada } from './entrada/PantallaEntrada';

/** Forma de `mesa.codigo_publico` (03 §2: ≥ 22 caracteres, columna de 100). */
export const CODIGO_MESA = /^[A-Za-z0-9_-]{22,100}$/;

/**
 * Área del comensal (`/m/:codigo`). Hoy sólo la entrada (T-2.4); el menú, el detalle y la orden
 * llegan con T-2.5 en adelante.
 */
export default function AreaComensal() {
  const { codigo } = useParams<{ codigo: string }>();

  // Un código que no puede ser de una mesa no llega a la API: la misma pantalla que un 404.
  if (!codigo || !CODIGO_MESA.test(codigo)) {
    return <PantallaError clase="mesa_invalida" onReintentar={() => undefined} />;
  }
  return <PantallaEntrada key={codigo} codigo={codigo} />;
}
