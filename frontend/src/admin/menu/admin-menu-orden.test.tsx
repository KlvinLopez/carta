import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ErrorApi } from '../../compartido/http';
import { uuid } from '../../mocks/servicioMenuSimulado';
import { montarMenu } from './utilesPrueba';

afterEach(() => vi.restoreAllMocks());

async function cargada() {
  const m = montarMenu();
  await screen.findByRole('heading', { name: /^Tacos/ });
  return m;
}
const nombresEn = (categoria: RegExp) => {
  const grupo = screen.getByRole('heading', { name: categoria }).closest('section')!;
  return within(grupo)
    .getAllByRole('button', { name: /^Editar / })
    .map((b) => b.getAttribute('aria-label')!.replace('Editar ', ''));
};
const asa = (nombre: string) => screen.getByRole('button', { name: `Reordenar ${nombre}` });

/** jsdom no maqueta: cada fila mide 100 px y sus posiciones salen de su lugar en la lista. */
function maquetar() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const lista = this.parentElement;
    const indice = lista ? Array.from(lista.children).indexOf(this) : 0;
    return { top: indice * 100, height: 100, bottom: indice * 100 + 100, left: 0, right: 300, width: 300, x: 0, y: indice * 100, toJSON: () => ({}) };
  });
}
const mover = (y: number) => fireEvent(window, new MouseEvent('pointermove', { clientY: y, bubbles: true }));
const soltar = () => fireEvent(window, new MouseEvent('pointerup', { bubbles: true }));

describe('reordenar dentro de la categoría (AC-16.1)', () => {
  it('arrastrando con el puntero: la fila sigue al dedo y al soltar manda POST …/reordenar con los ids de esa categoría', async () => {
    maquetar();
    const { sim } = await cargada();
    expect(nombresEn(/^Tacos/)).toEqual(['Pastor', 'Suadero', 'Cecina enchilada']);
    fireEvent.pointerDown(asa('Pastor'), { button: 0, pointerType: 'touch' });
    expect(screen.getByRole('button', { name: 'Editar Pastor' }).closest('li')).toHaveAttribute('data-id', uuid(101));
    // Hacia abajo, pasando la mitad de la tercera fila (y > 250).
    act(() => mover(260));
    expect(nombresEn(/^Tacos/)).toEqual(['Suadero', 'Cecina enchilada', 'Pastor']);
    // Nada se envía mientras el dedo sigue abajo.
    expect(sim.llamadasDe('reordenarPlatillos')).toHaveLength(0);
    act(() => soltar());
    await waitFor(() => expect(sim.llamadasDe('reordenarPlatillos')).toHaveLength(1));
    expect(sim.llamadasDe('reordenarPlatillos')[0]!.argumentos).toEqual([
      '11111111-1111-4111-8111-111111111111',
      [uuid(102), uuid(103), uuid(101)],
    ]);
    expect(nombresEn(/^Tacos/)).toEqual(['Suadero', 'Cecina enchilada', 'Pastor']);
    expect(await screen.findByText('Pastor quedó en la posición 3 de 3.')).toBeInTheDocument();
  });

  it('Escape cancela el arrastre y no envía nada', async () => {
    maquetar();
    const { sim } = await cargada();
    fireEvent.pointerDown(asa('Pastor'), { button: 0, pointerType: 'touch' });
    act(() => mover(260));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(nombresEn(/^Tacos/)).toEqual(['Pastor', 'Suadero', 'Cecina enchilada']);
    act(() => soltar());
    expect(sim.llamadasDe('reordenarPlatillos')).toHaveLength(0);
  });

  it('soltar donde estaba no manda nada', async () => {
    maquetar();
    const { sim } = await cargada();
    fireEvent.pointerDown(asa('Suadero'), { button: 0, pointerType: 'touch' });
    act(() => mover(150));
    act(() => soltar());
    expect(sim.llamadasDe('reordenarPlatillos')).toHaveLength(0);
  });

  it('con teclado: ↓ en el asa sube una posición y el foco no se pierde', async () => {
    const { sim, u } = await cargada();
    asa('Pastor').focus();
    await u.keyboard('{ArrowDown}');
    await waitFor(() => expect(sim.llamadasDe('reordenarPlatillos')).toHaveLength(1));
    expect(sim.llamadasDe('reordenarPlatillos')[0]!.argumentos[1]).toEqual([uuid(102), uuid(101), uuid(103)]);
    expect(nombresEn(/^Tacos/)).toEqual(['Suadero', 'Pastor', 'Cecina enchilada']);
    expect(asa('Pastor')).toHaveFocus();
    expect(screen.getByText('Pastor pasó a la posición 2 de 3.')).toBeInTheDocument();
    // En el borde no hace nada.
    await u.keyboard('{ArrowDown}{ArrowDown}');
    await waitFor(() => expect(sim.llamadasDe('reordenarPlatillos')).toHaveLength(2));
    await u.keyboard('{ArrowDown}');
    expect(sim.llamadasDe('reordenarPlatillos')).toHaveLength(2);
  });

  it('si el servidor rechaza el orden, la lista vuelve atrás y se avisa', async () => {
    const { sim, u } = await cargada();
    sim.fallar('reordenarPlatillos', new ErrorApi(409, 'CONFLICTO', 'Otro cambio llegó primero. Vuelve a intentarlo.'));
    asa('Pastor').focus();
    await u.keyboard('{ArrowDown}');
    expect(await screen.findByRole('alert')).toHaveTextContent('Otro cambio llegó primero. Vuelve a intentarlo.');
    expect(nombresEn(/^Tacos/)).toEqual(['Pastor', 'Suadero', 'Cecina enchilada']);
  });

  it('una categoría con un solo platillo no ofrece asa; con búsqueda o en bajas tampoco', async () => {
    const { u } = await cargada();
    expect(screen.queryByRole('button', { name: 'Reordenar Flan' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reordenar Horchata' })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /Dados de baja/ }));
    expect(screen.queryByRole('button', { name: /^Reordenar/ })).not.toBeInTheDocument();
  });

  it('el asa describe cómo se usa (ayuda asociada)', async () => {
    await cargada();
    expect(asa('Pastor')).toHaveAccessibleDescription(/Arrastra el asa/);
  });
});
