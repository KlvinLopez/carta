import { act, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it } from 'vitest';

import { errorSimulado } from '../../mocks/servicioEntradaSimulado';
import { crearServicioMenuSimulado } from '../../mocks/servicioMenuComensalSimulado';
import { Menu } from './Menu';
import { almacenEnMemoria, analiticaFalsa, montarMenu } from './utilesPrueba';

const titulo = () => screen.findByRole('heading', { name: 'La Ceiba', level: 1 });

function ocultarPestana(oculta: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => oculta });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('menú: el error de red se reintenta solo, como promete la pantalla', () => {
  it('sin red muestra «Sin conexión»; con el evento online lo pide otra vez', async () => {
    const sim = crearServicioMenuSimulado();
    sim.fallarUnaVez(errorSimulado(0, 'SIN_RED'));
    const cola = analiticaFalsa();
    render(<Menu slug="la-ceiba" mesa={7} servicio={sim.servicio} analitica={cola.analitica} almacen={almacenEnMemoria().almacen} onVolver={() => undefined} />);
    expect(await screen.findByRole('heading', { name: 'Sin conexión' })).toBeInTheDocument();
    expect(cola.registrar).not.toHaveBeenCalled();
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await titulo();
    expect(sim.llamadas).toHaveLength(2);
    expect(cola.registrar.mock.calls).toEqual([['menu_view']]);
  });

  it('al volver la pestaña a primer plano también; en segundo plano no', async () => {
    const sim = crearServicioMenuSimulado();
    sim.fallarUnaVez(errorSimulado(0, 'SIN_RED'));
    render(<Menu slug="la-ceiba" mesa={7} servicio={sim.servicio} analitica={analiticaFalsa().analitica} almacen={almacenEnMemoria().almacen} onVolver={() => undefined} />);
    await screen.findByRole('heading', { name: 'Sin conexión' });
    ocultarPestana(true);
    expect(sim.llamadas).toHaveLength(1);
    ocultarPestana(false);
    await titulo();
    expect(sim.llamadas).toHaveLength(2);
  });

  it('un error del servidor (500) no se reintenta solo con el evento online', async () => {
    const sim = crearServicioMenuSimulado({ error: errorSimulado(500, 'ERROR_INTERNO') });
    render(<Menu slug="la-ceiba" mesa={7} servicio={sim.servicio} analitica={analiticaFalsa().analitica} almacen={almacenEnMemoria().almacen} onVolver={() => undefined} />);
    await screen.findByRole('heading', { name: 'Algo salió mal' });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(sim.llamadas).toHaveLength(1);
  });
});

describe('menú: un 404 no promete lo que no se puede', () => {
  it('dice que el menú ya no está disponible y no ofrece reintentar', async () => {
    montarMenu({ error: errorSimulado(404, 'RESTAURANTE_NO_ENCONTRADO') });
    expect(await screen.findByRole('heading', { name: 'Este menú ya no está disponible' })).toBeInTheDocument();
    expect(screen.getByText(/Pregunta al personal/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText('Fue de nuestro lado, no tuyo.')).toBeNull();
  });
});

describe('menú: analítica con StrictMode', () => {
  it('el doble efecto de StrictMode registra un solo menu_view', async () => {
    const sim = crearServicioMenuSimulado();
    const cola = analiticaFalsa();
    render(
      <StrictMode>
        <Menu slug="la-ceiba" mesa={7} servicio={sim.servicio} analitica={cola.analitica} almacen={almacenEnMemoria().almacen} onVolver={() => undefined} />
      </StrictMode>,
    );
    await titulo();
    await waitFor(() => expect(cola.registrar).toHaveBeenCalledWith('menu_view'));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(cola.registrar.mock.calls.filter(([t]) => t === 'menu_view')).toHaveLength(1);
  });
});

describe('menú: el aviso de conexión también se ve aquí', () => {
  it('con aviso «servidor» o «red» se pinta sin tapar la lista', async () => {
    montarMenu({ props: { aviso: 'servidor' } });
    await titulo();
    expect(screen.getByText('Estamos teniendo un problema de nuestro lado. Seguimos intentando.')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 }).length).toBeGreaterThan(20);
  });
});
