import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { crearServicioPersonalSimulado, type OpcionesPersonalSimulado } from '../../mocks/servicioPersonalSimulado';
import type { Restaurante } from '../armazon/RestauranteActivo';
import { PantallaPersonalConServicio } from './PantallaPersonal';

export const RESTAURANTE = {
  id: '11111111-1111-4111-8111-111111111111',
  nombre: 'Taquería El Paso',
  slug: 'taqueria-el-paso',
  tema: 'vino',
  activo: true,
} as Restaurante;

/** Monta la pantalla Personal con el servicio simulado (sin red, sin Firebase). */
export function montarPersonal(opciones: OpcionesPersonalSimulado = {}) {
  const sim = crearServicioPersonalSimulado(opciones);
  const u = userEvent.setup();
  const vista = render(<PantallaPersonalConServicio servicio={sim.servicio} restaurante={RESTAURANTE} />);
  return { sim, u, ...vista };
}
