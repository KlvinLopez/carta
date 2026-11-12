import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asentar, espiarDesplazamiento, idDe, montarSesion, rutaActual, rutaMenu, rutaPlatillo, vistas } from './utilesPrueba';

// Decisión de Calvin (12 de noviembre): `menu_view` cuenta sólo con la pantalla del menú a la vista, sin la capa del
// platillo encima, una vez por menú cargado. `dish_view` no cambia.
let desplazamiento: ReturnType<typeof espiarDesplazamiento>;
beforeEach(() => {
  window.localStorage.clear();
  desplazamiento = espiarDesplazamiento();
});
afterEach(() => {
  desplazamiento.restaurar();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('menu_view sólo con el menú a la vista', () => {
  it('la entrada normal al menú manda un menu_view, como antes', async () => {
    const { cola } = montarSesion(rutaMenu);
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    await asentar();
    await waitFor(() => expect(vistas(cola.registrar, 'menu_view')).toHaveLength(1));
  });

  it('abrir directo un platillo no manda menu_view (sí dish_view); al volver al menú se manda uno', async () => {
    const { u, cola } = montarSesion(rutaPlatillo(idDe('Tacos de pastor')));
    await screen.findByRole('heading', { name: 'Tacos de pastor', level: 1 });
    await asentar();
    // El detalle ya contó su vista (esperarla deja correr los efectos del montaje) y el menú, tapado, no.
    await waitFor(() => expect(vistas(cola.registrar, 'dish_view')).toHaveLength(1));
    expect(vistas(cola.registrar, 'menu_view')).toHaveLength(0);
    await u.click(screen.getByRole('button', { name: 'Volver al menú' }));
    await waitFor(() => expect(rutaActual()).toBe(rutaMenu));
    await waitFor(() => expect(vistas(cola.registrar, 'menu_view')).toHaveLength(1));
    // Y el detalle de otro platillo desde ahí ya no suma otro menu_view.
    await u.click(screen.getAllByRole('button', { name: 'Ver Cochinita pibil' })[0]!);
    await screen.findByRole('heading', { name: 'Cochinita pibil', level: 1 });
    expect(vistas(cola.registrar, 'menu_view')).toHaveLength(1);
  });

  it('el refresco de 25 s no repite menu_view', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { menu, cola } = montarSesion(rutaMenu);
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    await asentar();
    await waitFor(() => expect(vistas(cola.registrar, 'menu_view')).toHaveLength(1));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(26_000);
    });
    expect(menu.llamadas.length).toBeGreaterThan(1); // se volvió a pedir…
    expect(vistas(cola.registrar, 'menu_view')).toHaveLength(1); // …sin otro menu_view
  });
});
