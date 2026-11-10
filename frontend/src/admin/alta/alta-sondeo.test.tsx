import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorApi } from '../../compartido/http';
import { crearServicioSimulado, type OpcionesSimulado } from '../../mocks/servicioSimulado';
import type { Importacion } from './tipos';
import { useSondeoImportacion } from './useSondeo';

/**
 * El sondeo con LITERALES (no con las constantes del código: si alguien cambia 3 s por 30 s estas
 * pruebas deben fallar) y con reloj falso puro, sin `findBy*`, para que los límites sean exactos.
 */
const PENDIENTE: Importacion = {
  id: 'i1',
  estado: 'pendiente',
  archivo_tipo: 'application/pdf',
  intentos: 1,
  creado_en: '2026-11-06T12:00:00Z',
};

async function avanzar(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function montar(opciones: OpcionesSimulado = {}) {
  const sim = crearServicioSimulado(opciones);
  await sim.servicio.subirCarta('r1', new File(['%PDF-'], 'c.pdf', { type: 'application/pdf' }));
  const ver = renderHook(() => useSondeoImportacion(sim.servicio, 'r1', '00000000-0000-4000-8000-0000000000c1', PENDIENTE));
  return { sim, ver };
}

function visibilidad(valor: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: valor });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  visibilidad('visible');
});

describe('sondeo de la importación (ADR-004, AC-25.2)', () => {
  it('pregunta cada 3 s: nada a los 2 900 ms, la primera consulta a los 3 000', async () => {
    const { sim } = await montar({ sinTerminar: true });
    await avanzar(2900);
    expect(sim.veces('consultarImportacion')).toBe(0);
    await avanzar(100);
    expect(sim.veces('consultarImportacion')).toBe(1);
    await avanzar(2900);
    expect(sim.veces('consultarImportacion')).toBe(1);
    await avanzar(100);
    expect(sim.veces('consultarImportacion')).toBe(2);
  });

  it('avisa que tarda a los 180 s (no antes) y se rinde a los 600 s con «agotado»', async () => {
    const { sim, ver } = await montar({ sinTerminar: true });
    await avanzar(177_000);
    expect(ver.result.current.lento).toBe(false);
    await avanzar(6000); // 183 s
    expect(ver.result.current.lento).toBe(true);
    expect(ver.result.current.agotado).toBe(false);
    await avanzar(417_000); // 600 s
    expect(ver.result.current.agotado).toBe(true);
    const total = sim.veces('consultarImportacion');
    expect(total).toBeGreaterThanOrEqual(199);
    expect(total).toBeLessThanOrEqual(201);
    await avanzar(60_000);
    expect(sim.veces('consultarImportacion')).toBe(total);
  });

  it('B1: al volver a la pestaña no lanza una segunda cadena si hay una consulta en vuelo', async () => {
    let resolver: (i: Importacion) => void = () => {};
    const consultar = vi.fn(() => new Promise<Importacion>((r) => (resolver = r)));
    const servicio = { ...crearServicioSimulado().servicio, consultarImportacion: consultar };
    renderHook(() => useSondeoImportacion(servicio, 'r1', 'i1', PENDIENTE));
    await avanzar(3000);
    expect(consultar).toHaveBeenCalledTimes(1);
    // Respuesta lenta (5 s): al volver a la pestaña, no se lanza otra consulta encima.
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(consultar).toHaveBeenCalledTimes(1);
    await act(async () => resolver({ ...PENDIENTE, estado: 'procesando' }));
    await avanzar(3000);
    expect(consultar).toHaveBeenCalledTimes(2);
    // Una sola cadena: en 30 s con respuestas inmediatas son ~10 consultas, no 20.
    consultar.mockImplementation(async () => ({ ...PENDIENTE, estado: 'procesando' as const }));
    await avanzar(30_000);
    expect(consultar.mock.calls.length).toBeLessThanOrEqual(13);
  });

  it('B1: con la pestaña oculta no pregunta; al volver, una consulta inmediata', async () => {
    const { sim } = await montar({ sinTerminar: true });
    await avanzar(3000);
    expect(sim.veces('consultarImportacion')).toBe(1);
    visibilidad('hidden');
    await avanzar(30_000);
    expect(sim.veces('consultarImportacion')).toBe(1);
    visibilidad('visible');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await avanzar(0);
    expect(sim.veces('consultarImportacion')).toBe(2);
  });

  it('B1: en un estado terminal quita el listener de visibilitychange y no vuelve a preguntar', async () => {
    const agregar = vi.spyOn(document, 'addEventListener');
    const quitar = vi.spyOn(document, 'removeEventListener');
    const { sim, ver } = await montar({ consultasAntesDeTerminar: 0 });
    await avanzar(3000);
    expect(ver.result.current.importacion?.estado).toBe('listo');
    const antes = sim.veces('consultarImportacion');
    expect(agregar.mock.calls.filter(([t]) => t === 'visibilitychange')).toHaveLength(1);
    expect(quitar.mock.calls.filter(([t]) => t === 'visibilitychange').length).toBeGreaterThanOrEqual(1);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await avanzar(30_000);
    expect(sim.veces('consultarImportacion')).toBe(antes);
  });

  it('A4: un estado desconocido o `listo` sin resultado cierra el sondeo (no espera para siempre)', async () => {
    for (const final of ['cancelado', 'listo-sin-resultado'] as const) {
      const { sim, ver } = await montar({ final, consultasAntesDeTerminar: 0 });
      await avanzar(3000);
      expect(ver.result.current.importacion?.estado).toBe(final === 'cancelado' ? 'cancelado' : 'listo');
      await avanzar(30_000);
      expect(sim.veces('consultarImportacion')).toBe(1);
      ver.unmount();
    }
  });

  it('B7: tres 404 seguidos antes de darla por perdida; un 404 suelto se recupera', async () => {
    const { sim, ver } = await montar({ sinTerminar: true });
    sim.fallarUnaVez('consultarImportacion', new ErrorApi(404, 'RECURSO_NO_ENCONTRADO', 'No existe.'));
    await avanzar(3000);
    expect(ver.result.current.error).toBeNull();
    await avanzar(3000); // la siguiente responde bien
    expect(ver.result.current.error).toBeNull();
    for (let i = 0; i < 3; i += 1) sim.fallarUnaVez('consultarImportacion', new ErrorApi(404, 'RECURSO_NO_ENCONTRADO', 'No existe.'));
    await avanzar(9000);
    expect(ver.result.current.error).toBe('No existe.');
  });

  it('B7: 5xx sostenido dice que el servidor no responde; sin red, que se perdió la conexión', async () => {
    const { sim, ver } = await montar({ sinTerminar: true });
    for (let i = 0; i < 3; i += 1) sim.fallarUnaVez('consultarImportacion', new ErrorApi(502, 'ERROR_INTERNO', 'x'));
    await avanzar(9000);
    expect(ver.result.current.fallaServidor).toBe(true);
    expect(ver.result.current.sinRed).toBe(false);
    await avanzar(3000);
    expect(ver.result.current.fallaServidor).toBe(false);
    for (let i = 0; i < 3; i += 1) sim.fallarUnaVez('consultarImportacion', new ErrorApi(0, 'SIN_RED', 'x'));
    await avanzar(9000);
    expect(ver.result.current.sinRed).toBe(true);
    expect(ver.result.current.fallaServidor).toBe(false);
  });

  it('un 401 o 422 definitivo se detiene con el mensaje de la envoltura', async () => {
    const { sim, ver } = await montar({ sinTerminar: true });
    sim.fallarUnaVez('consultarImportacion', new ErrorApi(422, 'PAYLOAD_INVALIDO', 'Id inválido.'));
    await avanzar(3000);
    expect(ver.result.current.error).toBe('Id inválido.');
    const n = sim.veces('consultarImportacion');
    await avanzar(30_000);
    expect(sim.veces('consultarImportacion')).toBe(n);
  });
});
