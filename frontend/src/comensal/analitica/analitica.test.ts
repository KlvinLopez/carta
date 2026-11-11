import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { validador } from '../../admin/gestion/utilesContrato';
import { crearColaAnalitica, enviarLoteReal, analiticaDelComensal, INTERVALO_ENVIO_MS, MAXIMO_POR_LOTE, type EventoAnalitica } from './cola';

const validarLote = validador('EventosLote');

const falso = () => vi.fn(async (_e: EventoAnalitica[], _o: { keepalive: boolean }) => undefined);

function montar(enviar: ReturnType<typeof falso> = falso()) {
  const doc = new EventTarget() as EventTarget & { visibilityState: DocumentVisibilityState };
  doc.visibilityState = 'visible';
  const ventana = new EventTarget();
  const cola = crearColaAnalitica({
    enviar,
    ahora: () => new Date('2026-11-11T18:00:00.000Z'),
    documento: doc as unknown as Document,
    ventana: ventana as unknown as Window,
  });
  return { cola, enviar, doc, ventana };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('cola de analítica del comensal', () => {
  it('junta los eventos y los manda en un lote a los pocos segundos, no uno por uno', async () => {
    const { cola, enviar } = montar();
    cola.registrar('menu_view');
    cola.registrar('search');
    cola.registrar('filter');
    expect(enviar).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(INTERVALO_ENVIO_MS - 1);
    expect(enviar).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    expect(enviar).toHaveBeenCalledTimes(1);
    const [lote, opciones] = enviar.mock.calls[0]!;
    expect(lote.map((e) => e.tipo)).toEqual(['menu_view', 'search', 'filter']);
    expect(opciones).toEqual({ keepalive: false });
  });

  it('cada evento es sólo {tipo, ocurrido_en} y el lote cumple el contrato EventosLote', async () => {
    const { cola, enviar } = montar();
    cola.registrar('menu_view');
    // Aunque alguien pase un id con otro tipo, sólo dish_view lo lleva.
    cola.registrar('search', '00000000-0000-4000-8000-000000001001');
    cola.registrar('dish_view', '00000000-0000-4000-8000-000000001002');
    await vi.advanceTimersByTimeAsync(INTERVALO_ENVIO_MS);
    const lote = enviar.mock.calls[0]![0];
    expect(lote.map((e) => Object.keys(e).sort())).toEqual([
      ['ocurrido_en', 'tipo'],
      ['ocurrido_en', 'tipo'],
      ['ocurrido_en', 'platillo_id', 'tipo'],
    ]);
    expect(lote[0]!.ocurrido_en).toBe('2026-11-11T18:00:00.000Z');
    const r = validarLote({ eventos: lote });
    expect(r.valido, r.errores).toBe(true);
  });

  it('manda de 50 en 50 y no guarda más de 100 en el teléfono', async () => {
    const { cola, enviar } = montar();
    for (let i = 0; i < 130; i += 1) cola.registrar('search');
    await vi.advanceTimersByTimeAsync(INTERVALO_ENVIO_MS);
    expect(enviar.mock.calls.map((c) => c[0].length)).toEqual([MAXIMO_POR_LOTE, MAXIMO_POR_LOTE]);
  });

  it('al ocultarse la página manda ya, con keepalive; al volver a verse no manda nada', async () => {
    const { cola, enviar, doc } = montar();
    cola.registrar('menu_view');
    doc.visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(enviar).not.toHaveBeenCalled();
    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(enviar.mock.calls[0]![1]).toEqual({ keepalive: true });
    // Ya vaciada: el temporizador no vuelve a mandar lo mismo.
    await vi.advanceTimersByTimeAsync(INTERVALO_ENVIO_MS * 2);
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it('pagehide también vacía la cola con keepalive', () => {
    const { cola, enviar, ventana } = montar();
    cola.registrar('filter');
    ventana.dispatchEvent(new Event('pagehide'));
    expect(enviar).toHaveBeenCalledWith(expect.any(Array), { keepalive: true });
  });

  it('una cola vacía no manda nada', async () => {
    const { enviar, doc } = montar();
    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(INTERVALO_ENVIO_MS * 3);
    expect(enviar).not.toHaveBeenCalled();
  });

  it('un fallo (asíncrono o síncrono) se descarta en silencio y no se reintenta', async () => {
    const huerfanos = vi.fn();
    process.on('unhandledRejection', huerfanos);
    const enviar = vi.fn().mockRejectedValueOnce(new Error('429')).mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const { cola } = montar(enviar);
    cola.registrar('menu_view');
    await vi.advanceTimersByTimeAsync(INTERVALO_ENVIO_MS);
    cola.registrar('search');
    await vi.advanceTimersByTimeAsync(INTERVALO_ENVIO_MS);
    expect(enviar).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(INTERVALO_ENVIO_MS * 5);
    expect(enviar).toHaveBeenCalledTimes(2); // nada de reintentos
    process.off('unhandledRejection', huerfanos);
    expect(huerfanos).not.toHaveBeenCalled();
  });

  it('detener limpia el temporizador y deja de escuchar la página', async () => {
    const { cola, enviar, doc } = montar();
    cola.registrar('menu_view');
    cola.detener();
    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(INTERVALO_ENVIO_MS * 2);
    expect(enviar).not.toHaveBeenCalled();
  });
});

describe('envío real a POST /api/v1/p/eventos', () => {
  it('con la cookie del propio origen, JSON y keepalive; la respuesta (202, 401, 429) no importa', async () => {
    for (const estado of [202, 401, 429, 500]) {
      const buscar = vi.fn(async () => new Response(null, { status: estado }));
      vi.stubGlobal('fetch', buscar);
      await enviarLoteReal([{ tipo: 'menu_view', ocurrido_en: '2026-11-11T18:00:00.000Z' }], { keepalive: true });
      const [url, init] = buscar.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe('/api/v1/p/eventos');
      expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin', keepalive: true });
      expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
      expect(JSON.parse(init.body as string)).toEqual({ eventos: [{ tipo: 'menu_view', ocurrido_en: '2026-11-11T18:00:00.000Z' }] });
    }
  });

  it('sin red la cola no lanza: el rechazo lo traga el envío de la cola', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    const { cola } = montar(enviarLoteReal as unknown as ReturnType<typeof falso>);
    cola.registrar('menu_view');
    await expect(vi.advanceTimersByTimeAsync(INTERVALO_ENVIO_MS)).resolves.not.toThrow();
  });

  it('la cola de la pestaña es una sola y no existe hasta que se usa', () => {
    expect(analiticaDelComensal()).toBe(analiticaDelComensal());
  });
});
