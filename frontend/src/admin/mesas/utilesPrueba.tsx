import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { crearServicioMesasSimulado, type OpcionesMesasSimulado } from '../../mocks/servicioMesasSimulado';
import type { Restaurante } from '../armazon/RestauranteActivo';
import { PantallaMesasConServicio } from './PantallaMesas';

export const RESTAURANTE = {
  id: '11111111-1111-4111-8111-111111111111',
  nombre: 'Taquería El Paso',
  slug: 'taqueria-el-paso',
  tema: 'vino',
  activo: true,
} as Restaurante;

/** Monta la pantalla Mesas con el servicio simulado (sin red, sin Firebase). */
export function montarMesas(opciones: OpcionesMesasSimulado = {}) {
  const sim = crearServicioMesasSimulado(opciones);
  const u = userEvent.setup();
  const vista = render(<PantallaMesasConServicio servicio={sim.servicio} restaurante={RESTAURANTE} />);
  return { sim, u, ...vista };
}
