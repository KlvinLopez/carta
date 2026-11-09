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
    // Cota derivada: la fila se pinta una vez por fase del cambio — (1) el toque (valor optimista y
    // «en vuelo», en el mismo lote), (2) la respuesta del servidor, (3) el fin del «en vuelo» — y se deja
    // 1 de margen. Sin `memo` serían ~134 (todas las filas de la categoría abierta).
    expect(pintadas.n - antes).toBeGreaterThanOrEqual(1);
    expect(pintadas.n - antes).toBeLessThanOrEqual(4);
  });

  it('buscar entre 400 abre las categorías con resultados y deja sólo las coincidencias', async () => {
    const { u } = montarMenu({ platillos: muchosPlatillos(400) });
    await screen.findByRole('heading', { name: /^Tacos/ });
    await u.type(screen.getByRole('searchbox', { name: 'Buscar platillo' }), '399');
    expect(screen.getByRole('button', { name: 'Editar Platillo 399' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Editar / })).toHaveLength(1);
  });

  it('colapsada_no_pinta_filas: sólo las filas de categorías abiertas existen en el DOM', async () => {
    const { u } = montarMenu({ platillos: muchosPlatillos(400) });
    await screen.findByRole('heading', { name: /^Tacos/ });
    // Literal: 400 repartidos en 3 → ~134 en la primera categoría; las otras dos, colapsadas, no pintan nada.
    const filas = () => document.querySelectorAll('li[data-id]').length;
    expect(filas()).toBeLessThanOrEqual(140);
    expect(filas()).toBeGreaterThan(100);
    await u.click(screen.getByRole('button', { name: /Bebidas/ }));
    const conDos = filas();
    expect(conDos).toBeGreaterThan(200);
    // Al colapsar Tacos se van sus filas (ninguna queda oculta en el DOM).
    await u.click(screen.getByRole('button', { name: /Tacos/ }));
    expect(filas()).toBeLessThan(conDos - 100);
    expect(document.querySelectorAll('#' + CSS.escape(screen.getByRole('button', { name: /Tacos/ }).getAttribute('aria-controls')!) + ' li').length).toBe(0);
  });
});
