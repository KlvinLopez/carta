import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { crearServicioMenuSimulado, type OpcionesMenuSimulado } from '../../mocks/servicioMenuSimulado';
import type { Restaurante } from '../armazon/RestauranteActivo';
import { PantallaMenuConServicio } from './PantallaMenu';

export const RESTAURANTE = {
  id: '11111111-1111-4111-8111-111111111111',
  nombre: 'Taquería El Paso',
  slug: 'taqueria-el-paso',
  tema: 'vino',
  activo: true,
} as Restaurante;

/** Monta la pantalla Menú con el servicio simulado (sin red, sin Firebase). */
export function montarMenu(opciones: OpcionesMenuSimulado = {}) {
  const sim = crearServicioMenuSimulado(opciones);
  const u = userEvent.setup();
  const vista = render(
    <MemoryRouter>
      <PantallaMenuConServicio servicio={sim.servicio} restaurante={RESTAURANTE} />
    </MemoryRouter>,
  );
  return { sim, u, ...vista };
}
