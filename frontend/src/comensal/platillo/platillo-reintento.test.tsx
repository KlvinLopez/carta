/** El reintento de red del detalle y las respuestas tardías: lo que `usePlatillo` promete y nada más. */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { errorSimulado } from '../../mocks/servicioEntradaSimulado';
import { crearMenuSemilla } from '../../mocks/servicioMenuComensalSimulado';
import { crearServicioPlatilloSimulado } from '../../mocks/servicioPlatilloSimulado';
import { analiticaFalsa } from '../menu/utilesPrueba';
import { PlatilloVista } from './Platillo';
import type { PlatilloDetalle, ServicioPlatillo } from './servicioPlatillo';
import { asentar, idDe, montarSesion, rutaMenu, vistas } from './utilesPrueba';

afterEach(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  vi.restoreAllMocks();
});

function pestanaOculta(oculta: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => oculta });
  document.dispatchEvent(new Event('visibilitychange'));
}
const alVolverLaRed = () => act(() => void window.dispatchEvent(new Event('online')));

const detalleDe = (nombre: string, ajustes: Partial<PlatilloDetalle> = {}): PlatilloDetalle => {
  const menu = crearMenuSemilla();
  for (const c of menu.categorias) {
    const p = c.platillos.find((x) => x.nombre === nombre);
    if (p) return { ...p, categoria_nombre: c.nombre, ...ajustes };
  }
  throw new Error(nombre);
};

function montar(sim: ReturnType<typeof crearServicioPlatilloSimulado>, nombre = 'Mole poblano', enMemoria: PlatilloDetalle | null = null) {
  const cola = analiticaFalsa();
  const vista = render(<PlatilloVista id={idDe(nombre)} servicio={sim.servicio} enMemoria={enMemoria} analitica={cola.analitica} onVolver={() => undefined} />);
  return { cola, ...vista };
}

describe('detalle: el reintento de red', () => {
  it('al volver la pestaña a primer plano reintenta; oculta, no', async () => {
    const sim = crearServicioPlatilloSimulado();
    sim.fallarUnaVez(errorSimulado(0, 'SIN_RED'));
    montar(sim);
    await screen.findByRole('heading', { name: 'Sin conexión' });
    await asentar(); // el efecto que registra los oyentes ya corrió
    pestanaOculta(true);
    await asentar();
    expect(sim.llamadas).toHaveLength(1);
    pestanaOculta(false);
    expect(await screen.findByRole('heading', { name: 'Mole poblano', level: 1 })).toBeInTheDocument();
    expect(sim.llamadas).toHaveLength(2);
  });

  it('un error del servidor (500) no se reintenta solo con online ni al volver la pestaña', async () => {
    const sim = crearServicioPlatilloSimulado({ error: errorSimulado(500, 'ERROR_INTERNO') });
    montar(sim);
    await screen.findByRole('heading', { name: 'Algo salió mal' });
    await asentar();
    await alVolverLaRed();
    pestanaOculta(false);
    await asentar();
    expect(sim.llamadas).toHaveLength(1);
  });

  it('el evento online reintenta una sola vez por fallo (no acumula oyentes)', async () => {
    const sim = crearServicioPlatilloSimulado();
    sim.fallarUnaVez(errorSimulado(0, 'SIN_RED'));
    montar(sim);
    await screen.findByRole('heading', { name: 'Sin conexión' });
    await asentar();
    await alVolverLaRed();
    await screen.findByRole('heading', { name: 'Mole poblano', level: 1 });
    await alVolverLaRed(); // ya no hay fallo: ningún oyente sobrevive
    await asentar();
    expect(sim.llamadas).toHaveLength(2);
  });

  it('al desmontar quita exactamente los oyentes de online y de visibilitychange que puso', async () => {
    const sim = crearServicioPlatilloSimulado();
    sim.fallarUnaVez(errorSimulado(0, 'SIN_RED'));
    const enVentana = vi.spyOn(window, 'addEventListener');
    const sinVentana = vi.spyOn(window, 'removeEventListener');
    const enDocumento = vi.spyOn(document, 'addEventListener');
    const sinDocumento = vi.spyOn(document, 'removeEventListener');
    const vista = montar(sim);
    await screen.findByRole('heading', { name: 'Sin conexión' });
    await asentar();
    const puesto = (espia: typeof enVentana, tipo: string) => espia.mock.calls.filter(([t]) => t === tipo).map(([, f]) => f);
    const online = puesto(enVentana, 'online');
    const visibilidad = puesto(enDocumento, 'visibilitychange');
    expect(online).toHaveLength(1);
    expect(visibilidad).toHaveLength(1);
    vista.unmount();
    expect(sinVentana.mock.calls.filter(([t, f]) => t === 'online' && f === online[0])).toHaveLength(1);
    expect(sinDocumento.mock.calls.filter(([t, f]) => t === 'visibilitychange' && f === visibilidad[0])).toHaveLength(1);
  });

  it('al pulsar «Reintentar» el aviso desaparece mientras responde, y si falla otra vez vuelve', async () => {
    const sim = crearServicioPlatilloSimulado();
    sim.fallarUnaVez(errorSimulado(500, 'ERROR_INTERNO'));
    montar(sim, 'Mole poblano', detalleDe('Mole poblano'));
    expect(await screen.findByText(/No pudimos actualizar el platillo/)).toBeInTheDocument();
    const soltar = sim.retener();
    sim.fallarUnaVez(errorSimulado(500, 'ERROR_INTERNO'));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.queryByText(/No pudimos actualizar el platillo/)).toBeNull());
    expect(sim.llamadas).toHaveLength(2);
    soltar();
    expect(await screen.findByText(/No pudimos actualizar el platillo/)).toBeInTheDocument();
  });
});

describe('detalle: respuestas tardías', () => {
  /** Un servicio manual que ignora la señal, como un `fetch` que ya salió: cada id espera su resolución. */
  function servicioManual() {
    const pendientes = new Map<string, (d: PlatilloDetalle) => void>();
    const senales: AbortSignal[] = [];
    const servicio: ServicioPlatillo = {
      platillo: (id, signal) => {
        if (signal) senales.push(signal);
        return new Promise<PlatilloDetalle>((resolver) => pendientes.set(id, resolver));
      },
    };
    return { servicio, pendientes, senales };
  }

  it('abrir A, volver y abrir B muy rápido: la respuesta tardía de A no pisa a B ni cuenta un dish_view de A', async () => {
    const manual = servicioManual();
    const { u, cola } = montarSesion(rutaMenu, { servicioPlatillo: manual.servicio });
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    const a = idDe('Tacos de pastor');
    const b = idDe('Mole poblano');
    await u.click(screen.getByRole('button', { name: 'Ver Tacos de pastor' }));
    await waitFor(() => expect(manual.pendientes.has(a)).toBe(true));
    const senalA = manual.senales[0]!;
    await u.click(screen.getByRole('button', { name: 'Volver al menú' }));
    await waitFor(() => expect(senalA.aborted).toBe(true)); // al irse el detalle se cancela su petición
    await u.click(await screen.findByRole('button', { name: 'Ver Mole poblano' }));
    await waitFor(() => expect(manual.pendientes.has(b)).toBe(true));
    // Llega tarde lo de A: B sigue en pantalla y nada se cuenta.
    await act(async () => manual.pendientes.get(a)!(detalleDe('Tacos de pastor')));
    await asentar();
    expect(screen.getByRole('heading', { name: 'Mole poblano', level: 1 })).toBeInTheDocument();
    expect(vistas(cola.registrar, 'dish_view')).toHaveLength(0);
    await act(async () => manual.pendientes.get(b)!(detalleDe('Mole poblano')));
    await waitFor(() => expect(vistas(cola.registrar, 'dish_view')).toEqual([['dish_view', b]]));
  });

  it('con el mismo componente y otro :id, la respuesta tardía del anterior se descarta', async () => {
    const manual = servicioManual();
    const analitica = analiticaFalsa();
    const a = idDe('Tacos de pastor');
    const b = idDe('Mole poblano');
    const props = { servicio: manual.servicio, analitica: analitica.analitica, onVolver: () => undefined };
    const vista = render(<PlatilloVista id={a} {...props} />);
    await waitFor(() => expect(manual.pendientes.has(a)).toBe(true));
    vista.rerender(<PlatilloVista id={b} {...props} />);
    await waitFor(() => expect(manual.pendientes.has(b)).toBe(true));
    expect(manual.senales[0]!.aborted).toBe(true);
    await act(async () => manual.pendientes.get(a)!(detalleDe('Tacos de pastor')));
    await asentar();
    expect(screen.queryByRole('heading', { name: 'Tacos de pastor' })).toBeNull(); // sigue el esqueleto de B
    expect(screen.getByRole('status')).toBeInTheDocument();
    await act(async () => manual.pendientes.get(b)!(detalleDe('Mole poblano')));
    expect(await screen.findByRole('heading', { name: 'Mole poblano', level: 1 })).toBeInTheDocument();
    expect(analitica.registrar.mock.calls).toEqual([['dish_view', b]]);
  });

  it('un fallo tardío del anterior (abortado) tampoco pinta un error', async () => {
    let rechazarA!: (e: unknown) => void;
    const servicio: ServicioPlatillo = {
      platillo: (id) => (id === idDe('Tacos de pastor') ? new Promise((_, rechazar) => (rechazarA = rechazar)) : new Promise(() => undefined)),
    };
    const props = { servicio, onVolver: () => undefined, analitica: analiticaFalsa().analitica };
    const vista = render(<PlatilloVista id={idDe('Tacos de pastor')} {...props} />);
    await asentar();
    vista.rerender(<PlatilloVista id={idDe('Mole poblano')} {...props} />);
    await act(async () => rechazarA(errorSimulado(500, 'ERROR_INTERNO')));
    await asentar();
    expect(screen.queryByRole('heading', { name: 'Algo salió mal' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Este platillo ya no está en el menú' })).toBeNull();
  });
});
