import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CODIGO_SEMILLA, crearServicioEntradaSimulado, type OpcionesEntradaSimulado } from '../../mocks/servicioEntradaSimulado';
import { PantallaEntrada } from './PantallaEntrada';

/** Monta la entrada con el servicio simulado. */
export function montarEntrada(opciones: OpcionesEntradaSimulado = {}, codigo = CODIGO_SEMILLA) {
  const sim = crearServicioEntradaSimulado(opciones);
  const u = userEvent.setup();
  const vista = render(<PantallaEntrada codigo={codigo} servicio={sim.servicio} />);
  return { sim, u, ...vista };
}

export const llamadasA = (sim: ReturnType<typeof crearServicioEntradaSimulado>, metodo: 'entrar' | 'estado' | 'cambiarAlias') =>
  sim.llamadas.filter((l) => l.metodo === metodo);
