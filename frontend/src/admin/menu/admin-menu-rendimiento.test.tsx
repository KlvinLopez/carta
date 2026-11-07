import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { muchosPlatillos } from '../../mocks/servicioMenuSimulado';
import { montarMenu } from './utilesPrueba';

// Cuenta cuántas veces se pinta una fila (la miniatura se pinta una vez por cada render de su fila).
const pintadas = vi.hoisted(() => ({ n: 0 }));
vi.mock('./Miniatura', async (original) => {
  const real = await original<typeof import('./Miniatura')>();
  return {
    Miniatura: (props: Parameters<typeof real.Miniatura>[0]) => {
      pintadas.n += 1;
      return real.Miniatura(props);
    },
  };
});

describe('con 400 platillos la pantalla sigue ágil', () => {
  it('arranca con la primera categoría abierta y las demás colapsadas; abrir una pinta sólo la suya', async () => {
    const { u } = montarMenu({ platillos: muchosPlatillos(400) });
    await screen.findByRole('heading', { name: /^Tacos/ });
    // 400 repartidos en tres categorías: sólo ~134 filas en pantalla, no 400.
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Editar / }).length).toBeLessThan(140));
    expect(screen.getByRole('button', { name: /Bebidas/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /Tacos/ })).toHaveAttribute('aria-expanded', 'true');
    await u.click(screen.getByRole('button', { name: /Bebidas/ }));
    expect(screen.getAllByRole('button', { name: /^Editar / }).length).toBeGreaterThan(200);
  });

  it('tocar un interruptor repinta sólo esa fila (memo), no las 134', async () => {
    const { u } = montarMenu({ platillos: muchosPlatillos(400) });
    await screen.findByRole('heading', { name: /^Tacos/ });
    const interruptor = await screen.findByRole('switch', { name: 'Disponible: Platillo 001' });
    const antes = pintadas.n;
    await u.click(interruptor);
    await waitFor(() => expect(interruptor).not.toBeDisabled());
    // Optimista + marca de «en vuelo» + respuesta + fin: unos pocos renders de UNA fila.
    expect(pintadas.n - antes).toBeLessThanOrEqual(6);
  });

  it('buscar entre 400 abre las categorías con resultados y es instantáneo', async () => {
    const { u } = montarMenu({ platillos: muchosPlatillos(400) });
    await screen.findByRole('heading', { name: /^Tacos/ });
    const inicio = performance.now();
    await u.type(screen.getByRole('searchbox', { name: 'Buscar platillo' }), '399');
    expect(screen.getByRole('button', { name: 'Editar Platillo 399' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Editar / })).toHaveLength(1);
    expect(performance.now() - inicio).toBeLessThan(3000);
  });
});
