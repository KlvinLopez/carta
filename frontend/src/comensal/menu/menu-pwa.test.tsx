// T-2.7: el menú se vuelve a pedir mientras se ve (AC-04.4), la copia sin conexión se dice en pantalla y
// hay un solo aviso a la vez. Temporizadores falsos y `await act(async () => {})` antes de afirmar.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CODIGO_SEMILLA, crearServicioEntradaSimulado, errorSimulado } from '../../mocks/servicioEntradaSimulado';
import { crearServicioMenuSimulado } from '../../mocks/servicioMenuComensalSimulado';
import { crearServicioPlatilloSimulado } from '../../mocks/servicioPlatilloSimulado';
import { marcaDeMesa } from '../entrada/espejo';
import { SesionMesa } from '../SesionMesa';
import { almacenEnMemoria, analiticaFalsa } from './utilesPrueba';

const avanzar = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
const asentar = () => act(async () => {});

function ocultarPestana(oculta: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => oculta });
  document.dispatchEvent(new Event('visibilitychange'));
}

function montar(
  ruta: string,
  { entrada = {}, menu = crearServicioMenuSimulado(), platillo, antes }: {
    antes?: (sim: ReturnType<typeof crearServicioEntradaSimulado>) => void; entrada?: Parameters<typeof crearServicioEntradaSimulado>[0]; menu?: ReturnType<typeof crearServicioMenuSimulado>; platillo?: ReturnType<typeof crearServicioPlatilloSimulado> } = {},
) {
  const sim = crearServicioEntradaSimulado(entrada);
  antes?.(sim);
  const cola = analiticaFalsa();
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route
          path="/m/:codigo/*"
          element={<SesionMesa codigo={CODIGO_SEMILLA} servicio={sim.servicio} servicioMenu={menu.servicio} servicioPlatillo={platillo?.servicio} analitica={cola.analitica} almacenFiltros={almacenEnMemoria().almacen} />}
        />
      </Routes>
    </MemoryRouter>,
  );
  return { sim, menu, cola };
}

const RUTA_MENU = `/m/${CODIGO_SEMILLA}/menu`;
/** Los avisos de conexión (el menú tiene otros `role="status"`, como el conteo de resultados). */
const avisos = () => screen.queryAllByRole('status').filter((e) => e.className === 'aviso');
const titulo = () => screen.getByRole('heading', { name: 'La Ceiba', level: 1 });

/** Copia del menú con un platillo cambiado de estado. */
function conPlatillo(menu: ReturnType<typeof crearServicioMenuSimulado>['menu'], nombre: string, cambio: { disponible?: boolean; quitar?: boolean }) {
  const copia = structuredClone(menu);
  for (const c of copia.categorias) {
    c.platillos = c.platillos.flatMap((p) => (p.nombre === nombre ? (cambio.quitar ? [] : [{ ...p, disponible: cambio.disponible ?? p.disponible }]) : [p]));
  }
  return copia;
}

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: false });
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
});
afterEach(() => {
  ocultarPestana(false);
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, 'onLine');
});

describe('AC-04.4: el menú se vuelve a pedir mientras se ve', () => {
  // @ac AC-04.4
  it('cada 25 s y no antes: a los 24 s sigue una sola lectura, a los 25 s dos, a los 50 s tres', async () => {
    const { menu } = montar(RUTA_MENU);
    await asentar();
    titulo();
    expect(menu.llamadas).toHaveLength(1);
    await avanzar(24_000);
    expect(menu.llamadas).toHaveLength(1);
    await avanzar(1000);
    expect(menu.llamadas).toHaveLength(2);
    await avanzar(25_000);
    expect(menu.llamadas).toHaveLength(3);
  });

  // @ac AC-04.4
  it('un platillo que pasa a agotado se atenúa a los 25 s, sin otro menu_view y sin perder la búsqueda', async () => {
    const { menu, cola } = montar(RUTA_MENU);
    await asentar();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar en el menú' }), { target: { value: 'ta' } });
    const platillo = menu.menu.categorias.flatMap((c) => c.platillos).find((p) => p.disponible && /ta/i.test(p.nombre))!;
    expect(screen.queryByText('Agotado hoy')).not.toBeInTheDocument();
    menu.reemplazar(conPlatillo(menu.menu, platillo.nombre, { disponible: false }));
    await avanzar(25_000);
    expect(screen.getAllByText('Agotado hoy').length).toBeGreaterThan(0);
    expect(screen.getByRole('searchbox', { name: 'Buscar en el menú' })).toHaveValue('ta');
    expect(cola.registrar.mock.calls.filter(([t]) => t === 'menu_view')).toHaveLength(1);
  });

  // @ac AC-04.4
  it('en segundo plano no pide; al volver la pestaña pide enseguida, pero no antes de 5 s desde la última lectura', async () => {
    const { menu } = montar(RUTA_MENU);
    await asentar();
    ocultarPestana(true);
    await avanzar(75_000);
    expect(menu.llamadas).toHaveLength(1);
    ocultarPestana(false);
    await asentar();
    expect(menu.llamadas).toHaveLength(2); // pasó más de 5 s
    ocultarPestana(true);
    ocultarPestana(false);
    await asentar();
    expect(menu.llamadas).toHaveLength(2); // volver y salir al instante no manda otra
  });

  // @ac AC-04.4
  // @ac AC-04.4
  it('primera visita: cuando el worker toma la página (controllerchange) el menú se pide una vez más para guardar la copia', async () => {
    const escuchas: Record<string, () => void> = {};
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { addEventListener: (t: string, f: () => void) => (escuchas[t] = f), removeEventListener: () => undefined },
    });
    try {
      const { menu } = montar(RUTA_MENU);
      await asentar();
      expect(menu.llamadas).toHaveLength(1);
      escuchas.controllerchange?.();
      await asentar();
      expect(menu.llamadas).toHaveLength(2);
    } finally {
      Reflect.deleteProperty(navigator, 'serviceWorker');
    }
  });

  // @ac AC-04.4
  it('un platillo que desaparece del menú con su detalle abierto pasa a «ya no está en el menú»', async () => {
    const { menu } = montar(RUTA_MENU);
    await asentar();
    const platillo = menu.menu.categorias[0]!.platillos[0]!;
    const nombre = platillo.nombre;
    fireEvent.click(screen.getAllByText(nombre)[0]!.closest('a,button,[role="button"],article,li')!);
    await asentar();
    menu.reemplazar(conPlatillo(menu.menu, nombre, { quitar: true }));
    await avanzar(25_000);
    expect(screen.getByText(/ya no está en el menú/i)).toBeInTheDocument();
  });

  // @ac AC-04.4
  it('con el detalle abierto, un platillo que pasa a agotado también se atenúa', async () => {
    const { menu } = montar(RUTA_MENU);
    await asentar();
    const platillo = menu.menu.categorias.flatMap((c) => c.platillos).find((p) => p.disponible)!;
    fireEvent.click(screen.getAllByText(platillo.nombre)[0]!.closest('a,button,[role="button"],article,li')!);
    await asentar();
    expect(screen.queryByText('Hoy no se puede pedir este platillo.')).not.toBeInTheDocument();
    menu.reemplazar(conPlatillo(menu.menu, platillo.nombre, { disponible: false }));
    await avanzar(25_000);
    expect(screen.getByText('Hoy no se puede pedir este platillo.')).toBeInTheDocument();
  });

  // @ac AC-04.4
  it('con el detalle ya traído del servidor, el `disponible` del menú releído manda sobre el del detalle', async () => {
    const menu = crearServicioMenuSimulado();
    const platillo = crearServicioPlatilloSimulado({ menu: menu.menu });
    montar(RUTA_MENU, { menu, platillo });
    await asentar();
    const elegido = menu.menu.categorias.flatMap((c) => c.platillos).find((p) => p.disponible)!;
    fireEvent.click(screen.getAllByText(elegido.nombre)[0]!.closest('a,button,[role="button"],article,li')!);
    await asentar();
    expect(platillo.llamadas.length).toBeGreaterThan(0); // el detalle sí llegó del servidor
    expect(screen.queryByText('Hoy no se puede pedir este platillo.')).not.toBeInTheDocument();
    menu.reemplazar(conPlatillo(menu.menu, elegido.nombre, { disponible: false }));
    await avanzar(25_000);
    expect(screen.getByText('Hoy no se puede pedir este platillo.')).toBeInTheDocument();
  });

  it('en /m/<codigo>/menu no hay capa del detalle en el DOM; al abrir un platillo sí', async () => {
    const { menu } = montar(RUTA_MENU);
    await asentar();
    expect(document.querySelector('.capa')).toBeNull();
    fireEvent.click(screen.getAllByText(menu.menu.categorias[0]!.platillos[0]!.nombre)[0]!.closest('a,button,[role="button"],article,li')!);
    await asentar();
    expect(document.querySelector('.capa')).not.toBeNull();
  });

  it('una lectura que falla conserva el menú que se ve', async () => {
    const { menu } = montar(RUTA_MENU);
    await asentar();
    menu.fallarUnaVez(errorSimulado(0, 'SIN_RED'));
    await avanzar(25_000);
    expect(menu.llamadas).toHaveLength(2);
    titulo();
    expect(screen.queryByRole('heading', { name: 'Sin conexión' })).not.toBeInTheDocument();
  });
});

describe('copia sin conexión (T-2.7)', () => {
  it('si el menú viene de la copia lo dice y no lo da por recién leído; al volver la red lo pide otra vez y el aviso se va', async () => {
    const menu = crearServicioMenuSimulado();
    menu.servirDeCopia(true);
    montar(RUTA_MENU, { menu });
    await asentar();
    expect(avisos().map((a) => a.textContent)).toEqual([expect.stringMatching(/última copia del menú/i)]);
    expect(screen.queryByText(/Perdimos la conexión/)).not.toBeInTheDocument();
    menu.servirDeCopia(false);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await asentar();
    expect(menu.llamadas.length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/última copia del menú/i)).not.toBeInTheDocument();
  });

  it('un solo aviso a la vez: copia gana a «sin conexión» y a la falla del sondeo', async () => {
    const menu = crearServicioMenuSimulado();
    menu.servirDeCopia(true);
    montar(RUTA_MENU, { menu });
    await asentar();
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(avisos().map((a) => a.textContent)).toEqual([expect.stringMatching(/última copia del menú/i)]);
  });

  it('sin red y con el menú fresco: el aviso general «Sin conexión» (uno solo); al volver la red se va', async () => {
    montar(RUTA_MENU);
    await asentar();
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(avisos().map((a) => a.textContent)).toEqual([expect.stringMatching(/^Sin conexión\./)]);
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByText(/^Sin conexión\./)).not.toBeInTheDocument();
  });

  it('la bienvenida también avisa que no hay red', async () => {
    montar(`/m/${CODIGO_SEMILLA}`);
    await asentar();
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(avisos().map((a) => a.textContent)).toEqual([expect.stringMatching(/^Sin conexión\./)]);
  });
});

describe('recarga sin red con la copia guardada', () => {
  const espejoDe = (codigo: string, slug = 'la-ceiba') =>
    window.localStorage.setItem('carta:invitado:v1', JSON.stringify({ miembro: 'm-1', sesion: 's-1', slug, mesa: marcaDeMesa(codigo) }));

  it('si la entrada falla por falta de red y el espejo recuerda esta mesa, se muestra el menú de la copia con su aviso', async () => {
    espejoDe(CODIGO_SEMILLA);
    const menu = crearServicioMenuSimulado();
    menu.servirDeCopia(true);
    montar(RUTA_MENU, { menu, entrada: { errores: { entrar: errorSimulado(0, 'SIN_RED') } } });
    await asentar();
    titulo();
    expect(menu.llamadas).toEqual([{ slug: 'la-ceiba' }]);
    expect(avisos().map((a) => a.textContent)).toEqual([expect.stringMatching(/última copia del menú/i)]);
    expect(screen.queryByText(/^Mesa \d/)).not.toBeInTheDocument();
  });

  it('al volver la red la entrada se rehace sin pasar por un esqueleto: el menú de la copia se queda hasta que hay mesa', async () => {
    espejoDe(CODIGO_SEMILLA);
    const menu = crearServicioMenuSimulado();
    menu.servirDeCopia(true);
    const { sim } = montar(RUTA_MENU, { menu, antes: (e) => e.fallarUnaVez('entrar', errorSimulado(0, 'SIN_RED')) });
    await asentar();
    titulo();
    expect(avisos().map((a) => a.textContent)).toEqual([expect.stringMatching(/última copia del menú/i)]);
    menu.servirDeCopia(false);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    // Mientras `entrar` está en vuelo no se ve el esqueleto de la entrada ni el del menú.
    expect(screen.queryByRole('heading', { name: 'La Ceiba', level: 1 })).toBeInTheDocument();
    await asentar();
    expect(screen.getByText('Mesa 7')).toBeInTheDocument();
    expect(avisos()).toHaveLength(0);
    expect(sim.llamadas.filter((l) => l.metodo === 'entrar')).toHaveLength(2);
  });

  it('si el espejo es de otra mesa no se ofrece el menú de otro restaurante: sale «Sin conexión»', async () => {
    espejoDe('OtraMesaQueNoEsEstaXX');
    const menu = crearServicioMenuSimulado();
    montar(RUTA_MENU, { menu, entrada: { errores: { entrar: errorSimulado(0, 'SIN_RED') } } });
    await asentar();
    expect(screen.getByRole('heading', { name: 'Sin conexión' })).toBeInTheDocument();
    expect(menu.llamadas).toHaveLength(0);
  });

  it('sin espejo no hay copia que ofrecer', async () => {
    const menu = crearServicioMenuSimulado();
    montar(RUTA_MENU, { menu, entrada: { errores: { entrar: errorSimulado(0, 'SIN_RED') } } });
    await asentar();
    expect(screen.getByRole('heading', { name: 'Sin conexión' })).toBeInTheDocument();
    expect(menu.llamadas).toHaveLength(0);
  });
});
