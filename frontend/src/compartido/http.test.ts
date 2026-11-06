import { describe, expect, it, vi } from 'vitest';

import { crearCliente, ErrorApi, type OpcionesCliente } from './http';

function json(cuerpo: unknown, estado = 200, cabeceras: Record<string, string> = {}) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json', ...cabeceras },
  });
}
const NO_AUTENTICADO = { error: { codigo: 'NO_AUTENTICADO', mensaje: 'Entra de nuevo.', detalles: {} } };

function armar(opciones: Partial<OpcionesCliente> = {}) {
  const peticiones = vi.fn<(url: URL, init: RequestInit) => Promise<Response>>(async () => json([]));
  const alNoAutorizado = vi.fn();
  const renovar = vi.fn(async () => 'fresco' as string | null);
  const cliente = crearCliente({
    token: () => 'viejo',
    renovar,
    alNoAutorizado,
    fetch: peticiones as unknown as typeof fetch,
    ...opciones,
  });
  return { cliente, peticiones, alNoAutorizado, renovar };
}

const auth = (llamada: unknown[]) =>
  ((llamada[1] as RequestInit).headers as Record<string, string>).Authorization;

describe('crearCliente: token y renovación', () => {
  it('manda Authorization: Bearer con el token actual', async () => {
    const { cliente, peticiones } = armar();
    await cliente.obtener('/admin/restaurantes');
    expect(auth(peticiones.mock.calls[0]!)).toBe('Bearer viejo');
    expect((peticiones.mock.calls[0]![0] as URL).pathname).toBe('/api/v1/admin/restaurantes');
  });

  it('sin token no manda Authorization', async () => {
    const { cliente, peticiones } = armar({ token: () => null });
    await cliente.obtener('/admin/restaurantes');
    expect(auth(peticiones.mock.calls[0]!)).toBeUndefined();
  });

  it('401 y luego 200: una renovación, un reintento con el token fresco y nada de aviso', async () => {
    const { cliente, peticiones, renovar, alNoAutorizado } = armar();
    peticiones.mockResolvedValueOnce(json(NO_AUTENTICADO, 401)).mockResolvedValueOnce(json([1]));
    await expect(cliente.obtener('/admin/restaurantes')).resolves.toEqual([1]);
    expect(renovar).toHaveBeenCalledOnce();
    expect(auth(peticiones.mock.calls[1]!)).toBe('Bearer fresco');
    expect(alNoAutorizado).not.toHaveBeenCalled();
  });

  it('401 persistente: exactamente 2 peticiones, 1 renovación y 1 alNoAutorizado', async () => {
    const { cliente, peticiones, renovar, alNoAutorizado } = armar();
    peticiones.mockImplementation(async () => json(NO_AUTENTICADO, 401));
    await expect(cliente.obtener('/admin/restaurantes')).rejects.toMatchObject({ estado: 401 });
    expect(peticiones).toHaveBeenCalledTimes(2);
    expect(renovar).toHaveBeenCalledTimes(1);
    expect(alNoAutorizado).toHaveBeenCalledTimes(1);
  });

  it('renovar devuelve null (sin usuario): sesión inválida, sin segunda petición', async () => {
    const { cliente, peticiones, alNoAutorizado } = armar({ renovar: async () => null });
    peticiones.mockImplementation(async () => json(NO_AUTENTICADO, 401));
    await expect(cliente.obtener('/x')).rejects.toBeInstanceOf(ErrorApi);
    expect(peticiones).toHaveBeenCalledTimes(1);
    expect(alNoAutorizado).toHaveBeenCalledTimes(1);
  });

  it('sin función renovar, un 401 avisa una vez y falla', async () => {
    const peticiones = vi.fn(async () => json(NO_AUTENTICADO, 401));
    const alNoAutorizado = vi.fn();
    const solo = crearCliente({
      token: () => 't',
      alNoAutorizado,
      fetch: peticiones as unknown as typeof fetch,
    });
    await expect(solo.obtener('/x')).rejects.toMatchObject({ estado: 401 });
    expect(peticiones).toHaveBeenCalledTimes(1);
    expect(alNoAutorizado).toHaveBeenCalledTimes(1);
  });

  it('renovar lanza un error de red: SIN_RED y 0 alNoAutorizado (la sesión se conserva)', async () => {
    const { cliente, peticiones, alNoAutorizado } = armar({
      renovar: async () => {
        throw new Error('network-request-failed');
      },
    });
    peticiones.mockImplementation(async () => json(NO_AUTENTICADO, 401));
    await expect(cliente.obtener('/x')).rejects.toMatchObject({ estado: 0, codigo: 'SIN_RED' });
    expect(alNoAutorizado).not.toHaveBeenCalled();
    expect(peticiones).toHaveBeenCalledTimes(1);
  });

  it('dos 401 paralelos comparten una sola renovación y avisan una sola vez', async () => {
    let soltar: (t: string) => void = () => {};
    const renovar = vi.fn(() => new Promise<string | null>((r) => (soltar = r)));
    const { cliente, peticiones, alNoAutorizado } = armar({ renovar });
    peticiones.mockImplementation(async () => json(NO_AUTENTICADO, 401));
    const a = cliente.obtener('/a').catch((e: unknown) => e);
    const b = cliente.obtener('/b').catch((e: unknown) => e);
    await vi.waitFor(() => expect(renovar).toHaveBeenCalled());
    soltar('fresco');
    await Promise.all([a, b]);
    expect(renovar).toHaveBeenCalledTimes(1);
    expect(peticiones).toHaveBeenCalledTimes(4);
    expect(alNoAutorizado).toHaveBeenCalledTimes(1);
  });

  it('dos 401 paralelos con renovación buena: ambas reintentan con el token fresco', async () => {
    const { cliente, peticiones, renovar } = armar();
    let primeras = 0;
    peticiones.mockImplementation(async (_u, init) => {
      const conViejo = (init.headers as Record<string, string>).Authorization === 'Bearer viejo';
      if (conViejo) primeras += 1;
      return conViejo ? json(NO_AUTENTICADO, 401) : json({ ok: true });
    });
    const resultados = await Promise.all([cliente.obtener('/a'), cliente.obtener('/b')]);
    expect(resultados).toEqual([{ ok: true }, { ok: true }]);
    expect(primeras).toBe(2);
    expect(renovar).toHaveBeenCalledTimes(1);
  });
});

describe('crearCliente: respuestas', () => {
  it('204 devuelve undefined', async () => {
    const { cliente, peticiones } = armar();
    peticiones.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(cliente.solicitar('DELETE', '/admin/x')).resolves.toBeUndefined();
  });

  it('AbortError se propaga tal cual (no es un error de red)', async () => {
    const { cliente, peticiones } = armar();
    peticiones.mockRejectedValueOnce(new DOMException('abortada', 'AbortError'));
    await expect(cliente.obtener('/x')).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('TypeError de red → SIN_RED con mensaje de la marca', async () => {
    const { cliente, peticiones } = armar();
    peticiones.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(cliente.obtener('/x')).rejects.toMatchObject({
      codigo: 'SIN_RED',
      message: expect.stringContaining('No pudimos conectar con Carta'),
    });
  });

  it('200 con HTML (fallback de la SPA) o vacío: ErrorApi de la marca, no SyntaxError', async () => {
    const { cliente, peticiones } = armar();
    peticiones.mockResolvedValueOnce(new Response('<!doctype html><html></html>', { status: 200 }));
    const error = await cliente.obtener('/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({ codigo: 'RESPUESTA_INVALIDA', estado: 200 });
    peticiones.mockResolvedValueOnce(new Response('', { status: 200 }));
    await expect(cliente.obtener('/x')).rejects.toMatchObject({ codigo: 'RESPUESTA_INVALIDA' });
  });

  it('429 con Retry-After en segundos o en fecha llena reintentarEn', async () => {
    const { cliente, peticiones } = armar();
    peticiones.mockResolvedValueOnce(
      json({ error: { codigo: 'DEMASIADAS_SOLICITUDES', mensaje: 'Despacio.', detalles: {} } }, 429, {
        'Retry-After': '30',
      }),
    );
    await expect(cliente.obtener('/x')).rejects.toMatchObject({ estado: 429, reintentarEn: 30 });
    const futuro = new Date(Date.now() + 20_000).toUTCString();
    peticiones.mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After': futuro } }));
    const error = (await cliente.obtener('/x').catch((e: unknown) => e)) as ErrorApi;
    expect(error.reintentarEn).toBeGreaterThanOrEqual(19);
    expect(error.reintentarEn).toBeLessThanOrEqual(21);
    peticiones.mockResolvedValueOnce(json({ error: { codigo: 'X', mensaje: 'm', detalles: {} } }, 500));
    await expect(cliente.obtener('/x')).rejects.toMatchObject({ reintentarEn: null });
  });

  it('500 HTML o error sin mensaje: mensaje genérico de la marca', async () => {
    const { cliente, peticiones } = armar();
    peticiones.mockResolvedValueOnce(new Response('<h1>Bad gateway</h1>', { status: 502 }));
    await expect(cliente.obtener('/x')).rejects.toMatchObject({
      estado: 502,
      message: expect.stringContaining('Algo salió mal de nuestro lado'),
    });
  });
});

describe('crearCliente: el token no sale del propio origen', () => {
  it('no envía Authorization (ni nada) a otro origen ni fuera de /api/v1/', async () => {
    const { cliente, peticiones } = armar();
    for (const ruta of ['https://evil.example/x', '/../etc', '/../../otra', 'admin/x']) {
      await expect(cliente.obtener(ruta)).rejects.toMatchObject({ codigo: 'RUTA_INVALIDA' });
    }
    expect(peticiones).not.toHaveBeenCalled();
    // `//host` queda como ruta bajo /api/v1/ del propio origen: nunca se interpreta como otro host.
    await cliente.obtener('//evil.example/robo');
    const url = peticiones.mock.calls[0]![0] as URL;
    expect(url.host).toBe(window.location.host);
  });

  it('una ruta normal sigue yendo al mismo origen', async () => {
    const { cliente, peticiones } = armar();
    await cliente.obtener('/admin/restaurantes', { consulta: { a: 1, b: undefined } });
    const url = peticiones.mock.calls[0]![0] as URL;
    expect(url.origin).toBe(window.location.origin);
    expect(url.search).toBe('?a=1');
  });
});
