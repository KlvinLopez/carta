import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CODIGO_SEMILLA, crearServicioEntradaSimulado, errorSimulado } from '../mocks/servicioEntradaSimulado';
import { crearServicioMenuSimulado } from '../mocks/servicioMenuComensalSimulado';
import AreaComensal, { CODIGO_MESA } from './Area';
import { analiticaFalsa, almacenEnMemoria } from './menu/utilesPrueba';
import { SesionMesa } from './SesionMesa';

const Ubicacion = () => <span data-testid="ruta">{useLocation().pathname}</span>;

function montar(ruta: string, opciones: Parameters<typeof crearServicioEntradaSimulado>[0] = {}) {
  const sim = crearServicioEntradaSimulado(opciones);
  const menu = crearServicioMenuSimulado();
  const cola = analiticaFalsa();
  const u = userEvent.setup();
  const vista = render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route
          path="/m/:codigo/*"
          element={<SesionMesa codigo={CODIGO_SEMILLA} servicio={sim.servicio} servicioMenu={menu.servicio} analitica={cola.analitica} almacenFiltros={almacenEnMemoria().almacen} />}
        />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
  return { sim, menu, cola, u, ...vista };
}
const llamadasA = (sim: ReturnType<typeof crearServicioEntradaSimulado>, m: string) => sim.llamadas.filter((l) => l.metodo === m).length;
const avanzar = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.useRealTimers());

describe('rutas del comensal bajo /m/<codigo>', () => {
  it('«Ver el menú» lleva a /m/<codigo>/menu con el slug del servidor', async () => {
    const { u, menu } = montar(`/m/${CODIGO_SEMILLA}`);
    await u.click(await screen.findByRole('button', { name: 'Ver el menú' }));
    expect(await screen.findByRole('heading', { name: 'La Ceiba', level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('ruta')).toHaveTextContent(`/m/${CODIGO_SEMILLA}/menu`);
    expect(menu.llamadas).toEqual([{ slug: 'la-ceiba' }]);
    expect(screen.getByText('Mesa 7')).toBeInTheDocument();
  });

  it('un enlace directo al menú espera la entrada y luego lo muestra', async () => {
    const { sim } = montar(`/m/${CODIGO_SEMILLA}/menu`);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'La Ceiba', level: 1 })).toBeInTheDocument();
    expect(llamadasA(sim, 'entrar')).toBe(1);
  });

  it('una sola entrada y un solo sondeo por pestaña al pasar de la bienvenida al menú y volver', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const sim = crearServicioEntradaSimulado();
    const menu = crearServicioMenuSimulado();
    render(
      <MemoryRouter initialEntries={[`/m/${CODIGO_SEMILLA}`]}>
        <Routes>
          <Route path="/m/:codigo/*" element={<SesionMesa codigo={CODIGO_SEMILLA} servicio={sim.servicio} servicioMenu={menu.servicio} analitica={analiticaFalsa().analitica} almacenFiltros={almacenEnMemoria().almacen} />} />
        </Routes>
      </MemoryRouter>,
    );
    await u.click(await screen.findByRole('button', { name: 'Ver el menú' }));
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    const antes = llamadasA(sim, 'estado');
    await avanzar(3100);
    // El sondeo sigue vivo en el menú (uno por intervalo, no dos instancias).
    expect(llamadasA(sim, 'estado')).toBe(antes + 1);
    await u.click(screen.getByRole('button', { name: 'Mi mesa' }));
    expect(await screen.findByRole('heading', { name: 'Estás en la mesa 7' })).toBeInTheDocument();
    await avanzar(3100);
    expect(llamadasA(sim, 'entrar')).toBe(1);
    expect(llamadasA(sim, 'estado')).toBe(antes + 2);
  });

  it('una ruta que no existe bajo la mesa vuelve a la bienvenida', async () => {
    montar(`/m/${CODIGO_SEMILLA}/pedido`);
    expect(await screen.findByRole('heading', { name: 'Estás en la mesa 7' })).toBeInTheDocument();
    expect(screen.getByTestId('ruta')).toHaveTextContent(`/m/${CODIGO_SEMILLA}`);
    expect(screen.getByTestId('ruta')).not.toHaveTextContent('pedido');
  });

  it('si la mesa no existe, el menú muestra el mismo fallo de la entrada, sin pedir el menú', async () => {
    const { menu } = montar(`/m/${CODIGO_SEMILLA}/menu`, { errores: { entrar: errorSimulado(404, 'MESA_NO_ENCONTRADA') } });
    expect(await screen.findByRole('heading', { name: 'No encontramos esta mesa' })).toBeInTheDocument();
    expect(menu.llamadas).toHaveLength(0);
  });

  it('si la mesa se cierra mientras se ve el menú, aparece «La mesa se cerró»', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { sim } = montar(`/m/${CODIGO_SEMILLA}/menu`, { errores: { estado: errorSimulado(410, 'SESION_CERRADA') } });
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    await avanzar(200);
    expect(await screen.findByRole('heading', { name: 'La mesa se cerró' })).toBeInTheDocument();
    expect(sim.llamadas.length).toBeGreaterThan(0);
  });

  // Nota de la revisión del PR 11: desmontar y volver a montar con el mismo código antes de que
  // responda `entrar` comparte la entrada en vuelo; no debe llegarle un AbortError.
  it('desmontar y montar con el mismo código antes de que responda entrar muestra la bienvenida, no un error', async () => {
    const sim = crearServicioEntradaSimulado();
    const soltar = sim.retener('entrar');
    const A = (
      <MemoryRouter initialEntries={[`/m/${CODIGO_SEMILLA}`]}>
        <Routes>
          <Route path="/m/:codigo/*" element={<SesionMesa codigo={CODIGO_SEMILLA} servicio={sim.servicio} />} />
        </Routes>
      </MemoryRouter>
    );
    const primera = render(A);
    primera.unmount();
    render(A);
    // Deja pasar el desmontaje diferido de la primera instancia antes de que la entrada responda.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    await act(async () => {
      soltar();
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(await screen.findByRole('heading', { name: 'Estás en la mesa 7' })).toBeInTheDocument();
    expect(screen.queryByText('Algo salió mal')).toBeNull();
    expect(llamadasA(sim, 'entrar')).toBe(1);
  });

  it('un desmontaje real sí cancela la entrada pendiente', async () => {
    const sim = crearServicioEntradaSimulado();
    const soltar = sim.retener('entrar');
    const vista = render(
      <MemoryRouter initialEntries={[`/m/${CODIGO_SEMILLA}`]}>
        <Routes>
          <Route path="/m/:codigo/*" element={<SesionMesa codigo={CODIGO_SEMILLA} servicio={sim.servicio} />} />
        </Routes>
      </MemoryRouter>,
    );
    vista.unmount();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    soltar();
    await waitFor(() => expect(llamadasA(sim, 'entrar')).toBe(1));
  });
});

describe('el menú sobrevive a ir y volver (estado en el área)', () => {
  it('3 idas y vueltas: un solo menu_view, una sola petición, la búsqueda sigue y no hay esqueleto', async () => {
    const { u, menu, cola } = montar(`/m/${CODIGO_SEMILLA}`);
    for (let i = 0; i < 3; i += 1) {
      await u.click(await screen.findByRole('button', { name: 'Ver el menú' }));
      await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
      const campo = screen.getByRole('searchbox', { name: 'Buscar en el menú' });
      if (i === 0) await u.type(campo, 'pastor');
      expect(campo).toHaveValue('pastor');
      expect(screen.queryByText('Preparando el menú…')).toBeNull();
      await u.click(screen.getByRole('button', { name: 'Mi mesa' }));
    }
    expect(menu.llamadas).toHaveLength(1);
    await waitFor(() => expect(cola.registrar.mock.calls.filter(([t]) => t === 'menu_view')).toHaveLength(1));
  });

  it('los filtros aplicados también siguen al volver', async () => {
    const { u } = montar(`/m/${CODIGO_SEMILLA}/menu`);
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    await u.click(screen.getByRole('button', { name: 'Filtros' }));
    await u.click(screen.getByRole('button', { name: 'Huevo' }));
    await u.click(screen.getByRole('button', { name: /^Ver \d+ platillos$/ }));
    await u.click(screen.getByRole('button', { name: 'Mi mesa' }));
    await u.click(await screen.findByRole('button', { name: 'Ver el menú' }));
    expect(await screen.findByRole('button', { name: 'Filtros, 1 activos' })).toBeInTheDocument();
  });

  it('el menú se pide en cuanto entrar responde, con la bienvenida a la vista', async () => {
    const { menu } = montar(`/m/${CODIGO_SEMILLA}`);
    await screen.findByRole('heading', { name: 'Estás en la mesa 7' });
    await waitFor(() => expect(menu.llamadas).toEqual([{ slug: 'la-ceiba' }]));
  });

  it('un fallo del sondeo se avisa también en el menú, sin tapar la lista', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    montar(`/m/${CODIGO_SEMILLA}/menu`, { errores: { estado: errorSimulado(500, 'ERROR_INTERNO') } });
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    await avanzar(200);
    expect(await screen.findByText('Estamos teniendo un problema de nuestro lado. Seguimos intentando.')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Buscar en el menú' })).toBeInTheDocument();
  });
});

describe('el código de la mesa', () => {
  it('la forma que acepta el área es la que acepta y genera el backend (una sola verdad: app/)', () => {
    const sesion = readFileSync(resolve(process.cwd(), '../app/services/sesion.py'), 'utf8');
    const modelos = readFileSync(resolve(process.cwd(), '../app/db/models.py'), 'utf8');
    const mesas = readFileSync(resolve(process.cwd(), '../app/services/mesas.py'), 'utf8');
    const forma = /FORMA_CODIGO = re\.compile\(r"\[([^\]]+)\]\{(\d+),(\d+)\}"\)/.exec(sesion);
    const minimo = /length\(codigo_publico\) >= (\d+)/.exec(modelos);
    const columna = /codigo_publico: Mapped\[str\] = mapped_column\(String\((\d+)\)/.exec(modelos);
    const bytes = /secrets\.token_urlsafe\((\d+)\)/.exec(mesas);
    expect(forma && minimo && columna && bytes).toBeTruthy();
    // Mismo alfabeto, tope = la columna, piso = el CHECK de la base.
    expect(CODIGO_MESA.source).toBe(`^[${forma![1]}]{${minimo![1]},${columna![1]}}$`);
    expect(Number(forma![3])).toBe(Number(columna![1]));
    // Un código recién generado (token_urlsafe(16) → 22 caracteres base64url) pasa.
    const generado = Buffer.from(Array.from({ length: Number(bytes![1]) }, (_, i) => (i * 37 + 250) % 256)).toString('base64url');
    expect(generado).toHaveLength(22);
    expect(CODIGO_MESA.test(generado)).toBe(true);
  });

  it('un código con forma imposible da la pantalla de mesa inválida sin llamar a la API', () => {
    const buscar = vi.fn();
    vi.stubGlobal('fetch', buscar);
    render(
      <MemoryRouter initialEntries={['/m/corto']}>
        <Routes>
          <Route path="/m/:codigo/*" element={<AreaComensal />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'No encontramos esta mesa' })).toBeInTheDocument();
    expect(buscar).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
