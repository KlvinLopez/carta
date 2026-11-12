import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CODIGO_SEMILLA, crearServicioEntradaSimulado, errorSimulado } from '../../mocks/servicioEntradaSimulado';
import { PantallaEntrada } from './PantallaEntrada';
import { llamadasA } from './utilesPrueba';

const avanzar = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

function ocultar(oculto: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => oculto });
  document.dispatchEvent(new Event('visibilitychange'));
}

async function montar(opciones = {}) {
  const sim = crearServicioEntradaSimulado(opciones);
  render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
  await screen.findByRole('heading', { name: 'Estás en la mesa 7' });
  return sim;
}

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  ocultar(false);
  vi.useRealTimers();
});

describe('sondeo del estado de la mesa', () => {
  it('sondea cada 3 s con el último ETag y con 304 conserva lo pintado, también repetidos', async () => {
    const sim = await montar();
    await avanzar(100);
    const estados = () => llamadasA(sim, 'estado');
    expect(estados()[0]!.argumentos).toEqual([null]);
    expect(screen.queryByText(/personas en la mesa/)).toBeNull();
    await avanzar(3000);
    await avanzar(3000);
    await avanzar(3000);
    const ultimas = estados().map((l) => l.argumentos[0]);
    expect(ultimas.length).toBeGreaterThanOrEqual(4);
    expect(ultimas.slice(1).every((e) => typeof e === 'string' && e.startsWith('"'))).toBe(true);
    expect(screen.getByText('Comensal 1')).toBeInTheDocument(); // sigue pintado tras varios 304
  });

  it('cuando alguien más se sienta, la tarjeta de la mesa lo muestra', async () => {
    const sim = await montar();
    await avanzar(100);
    sim.sentarOtro();
    await avanzar(3100);
    expect(await screen.findByText('2 personas en la mesa')).toBeInTheDocument();
  });

  it('en segundo plano no sondea y al volver pide enseguida', async () => {
    const sim = await montar();
    await avanzar(100);
    ocultar(true);
    await avanzar(500); // por si había una en vuelo
    const antes = llamadasA(sim, 'estado').length;
    await avanzar(12_000);
    expect(llamadasA(sim, 'estado')).toHaveLength(antes);
    ocultar(false);
    await avanzar(50);
    expect(llamadasA(sim, 'estado').length).toBeGreaterThan(antes);
  });

  it('si el sondeo falla conserva lo pintado, avisa sin tapar y se recupera solo', async () => {
    const sim = await montar();
    await avanzar(100);
    sim.fallarUnaVez('estado', errorSimulado(0, 'SIN_RED'));
    await avanzar(3100);
    expect(await screen.findByRole('status')).toHaveTextContent('Perdimos la conexión');
    expect(screen.getByText('Comensal 1')).toBeInTheDocument();
    await avanzar(9000);
    expect(screen.queryByText(/Perdimos la conexión/)).toBeNull();
  });

  it('retrocede si el servidor falla: no martilla cada 3 s', async () => {
    const sim = await montar({ errores: { estado: errorSimulado(500, 'ERROR_INTERNO') } });
    await avanzar(100);
    await avanzar(60_000);
    expect(llamadasA(sim, 'estado').length).toBeLessThan(10);
  });

  it('token vencido con la mesa viva (401): vuelve a entrar con el código y sigue (decisión abierta: miembro nuevo)', async () => {
    const sim = await montar();
    await avanzar(100);
    sim.expirarToken();
    await avanzar(3100);
    expect(await screen.findByText('Comensal 2')).toBeInTheDocument();
    expect(llamadasA(sim, 'entrar')).toHaveLength(2);
    await avanzar(3100);
    expect(screen.getByText('Comensal 2')).toBeInTheDocument();
  });

  it('desmontar detiene el sondeo', async () => {
    const sim = crearServicioEntradaSimulado();
    const vista = render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    await screen.findByRole('heading', { name: 'Estás en la mesa 7' });
    await avanzar(100);
    vista.unmount();
    const antes = llamadasA(sim, 'estado').length;
    await avanzar(20_000);
    expect(llamadasA(sim, 'estado')).toHaveLength(antes);
  });

  it('el reloj del teléfono no interviene: el token se juzga en el servidor', async () => {
    vi.setSystemTime(new Date('2031-01-01T00:00:00Z'));
    const sim = await montar();
    await avanzar(3100);
    expect(screen.getByText('Comensal 1')).toBeInTheDocument();
    expect(llamadasA(sim, 'entrar')).toHaveLength(1);
  });
});

describe('una red que parpadea (eventos online)', () => {
  it('diez eventos online en medio segundo adelantan el sondeo una sola vez; pasado el segundo, otro sí cuenta', async () => {
    const sim = await montar();
    await avanzar(100);
    const antes = llamadasA(sim, 'estado').length;
    for (let i = 0; i < 10; i += 1) {
      act(() => {
        window.dispatchEvent(new Event('online'));
      });
      await avanzar(50); // cada uno con su sondeo ya resuelto: sin la espera mínima serían diez peticiones
    }
    expect(llamadasA(sim, 'estado').length).toBe(antes + 1);
    await avanzar(1000);
    const medio = llamadasA(sim, 'estado').length;
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await avanzar(50);
    expect(llamadasA(sim, 'estado').length).toBe(medio + 1);
  });
});
