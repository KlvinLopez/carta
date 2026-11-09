import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { crearServicioMenuSimulado, platilloDe, platillosSemilla } from '../../mocks/servicioMenuSimulado';
import { LimiteMenu } from './LimiteMenu';
import { PantallaMenuConServicio } from './PantallaMenu';
import { RESTAURANTE } from './utilesPrueba';

afterEach(() => vi.restoreAllMocks());

function montar(sim: ReturnType<typeof crearServicioMenuSimulado>) {
  return render(
    <MemoryRouter>
      <LimiteMenu>
        <PantallaMenuConServicio servicio={sim.servicio} restaurante={RESTAURANTE} />
      </LimiteMenu>
    </MemoryRouter>,
  );
}

describe('una respuesta malformada no tumba la pantalla', () => {
  it('una_respuesta_malformada_no_tumba_la_pantalla: platillos sin listas se pintan y se pueden abrir', async () => {
    const sim = crearServicioMenuSimulado();
    const malo = { ...platilloDe(1, { nombre: 'Pastor' }), alergenos: undefined, etiquetas: undefined } as never;
    sim.servicio.listarPlatillos = async (_rid, { activo }) => (activo ? [malo] : []);
    montar(sim);
    expect(await screen.findByRole('button', { name: 'Editar Pastor' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Editar Pastor' }));
    expect(await screen.findByRole('dialog', { name: 'Editar platillo' })).toBeInTheDocument();
  });

  it('una lista que no es lista (HTML, objeto) da un error con «Reintentar», no una pantalla en blanco', async () => {
    const sim = crearServicioMenuSimulado();
    sim.servicio.listarCategorias = async () => ({ nope: true }) as never;
    montar(sim);
    expect(await screen.findByRole('heading', { name: 'No pudimos cargar tu carta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('si algo revienta al pintar, el límite muestra el estado de error y «Reintentar» vuelve a montar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const sim = crearServicioMenuSimulado({ platillos: platillosSemilla });
    // Una categoría nula pasa la guarda de «es lista» y revienta en `agrupar`.
    const buenas = sim.categorias.slice();
    let mala = true;
    sim.servicio.listarCategorias = async () => (mala ? ([null] as never) : buenas);
    montar(sim);
    expect(await screen.findByRole('heading', { name: 'No pudimos mostrar tu carta' })).toBeInTheDocument();
    mala = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: /^Tacos/ })).toBeInTheDocument();
  });
});
