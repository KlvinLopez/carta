import { afterEach, describe, expect, it, vi } from 'vitest';

import { ErrorApi } from '../../compartido/http';
import { validador } from '../../admin/gestion/utilesContrato';
import { CODIGO_SEMILLA, crearServicioEntradaSimulado, errorSimulado } from '../../mocks/servicioEntradaSimulado';
import { claseDeError } from './errores';
import { espejoLocal } from './espejo';
import { crearServicioEntrada } from './servicio';

const json = (cuerpo: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(cuerpo), { status: 200, headers: { 'Content-Type': 'application/json' }, ...init });
const envoltura = (codigo: string, mensaje = 'x') => ({ error: { codigo, mensaje, detalles: {}, request_id: 'r1' } });

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('servicio HTTP del comensal (AC-01.5)', () => {
  it('entrar manda {codigo_mesa} con la cookie del propio origen y sin Authorization', async () => {
    const sim = crearServicioEntradaSimulado();
    const fetchFalso = vi.fn(async () => json(await sim.servicio.entrar(CODIGO_SEMILLA)));
    const servicio = crearServicioEntrada(fetchFalso as unknown as typeof fetch);
    const r = await servicio.entrar(CODIGO_SEMILLA);
    expect(r.miembro.alias).toBe('Comensal 1');
    const [url, init] = fetchFalso.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/p/sesion/entrar');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    expect(JSON.parse(init.body as string)).toEqual({ codigo_mesa: CODIGO_SEMILLA });
    expect(Object.keys(init.headers as object).map((c) => c.toLowerCase())).not.toContain('authorization');
  });

  it('estado manda If-None-Match; con 304 conserva lo pintado y con 200 devuelve el ETag nuevo', async () => {
    const sim = crearServicioEntradaSimulado();
    await sim.servicio.entrar(CODIGO_SEMILLA);
    const cuerpo = (await sim.servicio.estado(null)) as { estado: unknown };
    const fetchFalso = vi
      .fn()
      .mockResolvedValueOnce(json(cuerpo.estado, { headers: { 'Content-Type': 'application/json', ETag: '"v1"' } }))
      .mockResolvedValueOnce(new Response(null, { status: 304 }));
    const servicio = crearServicioEntrada(fetchFalso as unknown as typeof fetch);
    const primera = await servicio.estado(null);
    expect(primera).toMatchObject({ sinCambios: false, etag: '"v1"' });
    expect(await servicio.estado('"v1"')).toEqual({ sinCambios: true });
    const cabeceras = (fetchFalso.mock.calls[1]![1] as RequestInit).headers as Record<string, string>;
    expect(cabeceras['If-None-Match']).toBe('"v1"');
    expect((fetchFalso.mock.calls[0]![1] as RequestInit).headers).not.toHaveProperty('If-None-Match');
  });

  it('una respuesta sin ETag no rompe: el siguiente sondeo no manda If-None-Match', async () => {
    const sim = crearServicioEntradaSimulado();
    await sim.servicio.entrar(CODIGO_SEMILLA);
    const r = (await sim.servicio.estado(null)) as { estado: unknown };
    const servicio = crearServicioEntrada((async () => json(r.estado)) as typeof fetch);
    expect(await servicio.estado(null)).toMatchObject({ etag: null });
  });

  it('la envoltura de error del contrato llega como ErrorApi con su código', async () => {
    const servicio = crearServicioEntrada((async () => json(envoltura('MESA_NO_ENCONTRADA'), { status: 404 })) as typeof fetch);
    await expect(servicio.entrar('x')).rejects.toMatchObject({ estado: 404, codigo: 'MESA_NO_ENCONTRADA', requestId: 'r1' });
  });

  it('un 502 con HTML (el borde) es un error genérico, no una excepción rara', async () => {
    const servicio = crearServicioEntrada((async () => new Response('<html>Bad gateway</html>', { status: 502 })) as typeof fetch);
    const error = await servicio.entrar('x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect(claseDeError(error)).toBe('generico');
  });

  it.each([
    ['200 con HTML (el fallback de la SPA)', () => new Response('<!doctype html>', { status: 200 })],
    ['200 con otra forma', () => json({ hola: 1 })],
    ['200 con sesion sin restaurante', () => json({ sesion: { id: 'a', mesa: { numero: 1 } }, miembro: { id: 'b', alias: 'c' } })],
  ])('%s no se pinta: RESPUESTA_INVALIDA', async (_n, respuesta) => {
    const servicio = crearServicioEntrada((async () => respuesta()) as typeof fetch);
    await expect(servicio.entrar('x')).rejects.toMatchObject({ codigo: 'RESPUESTA_INVALIDA' });
  });

  it('sin red (fetch rechaza) es SIN_RED, estado 0', async () => {
    const servicio = crearServicioEntrada((async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch);
    await expect(servicio.entrar('x')).rejects.toMatchObject({ estado: 0, codigo: 'SIN_RED' });
  });

  it('una petición que no responde en 15 s se corta y cuenta como sin conexión', async () => {
    vi.useFakeTimers();
    const colgado = ((_u: string, init: RequestInit) =>
      new Promise((_r, rechazar) => {
        init.signal!.addEventListener('abort', () => rechazar(new DOMException('abort', 'AbortError')));
      })) as unknown as typeof fetch;
    const servicio = crearServicioEntrada(colgado);
    const resultado = servicio.entrar('x').catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(15_001);
    expect(await resultado).toMatchObject({ estado: 0, codigo: 'SIN_RED' });
  });

  it('cancelar con la señal propia no se confunde con una caída de red', async () => {
    const control = new AbortController();
    const colgado = ((_u: string, init: RequestInit) =>
      new Promise((_r, rechazar) => {
        init.signal!.addEventListener('abort', () => rechazar(new DOMException('abort', 'AbortError')));
      })) as unknown as typeof fetch;
    const resultado = crearServicioEntrada(colgado).estado(null, control.signal).catch((e: unknown) => e);
    control.abort();
    const error = await resultado;
    expect(error).toBeInstanceOf(DOMException);
  });

  it('Retry-After de un 429 llega a reintentarEn', async () => {
    const servicio = crearServicioEntrada(
      (async () => json(envoltura('DEMASIADAS_PETICIONES'), { status: 429, headers: { 'Retry-After': '7' } })) as typeof fetch,
    );
    await expect(servicio.entrar('x')).rejects.toMatchObject({ estado: 429, reintentarEn: 7 });
  });
});

describe('clasificación de errores (AC-01.3)', () => {
  it.each([
    [new ErrorApi(404, 'MESA_NO_ENCONTRADA', ''), 'mesa_invalida'],
    [new ErrorApi(404, 'RECURSO_NO_ENCONTRADO', ''), 'generico'],
    [new ErrorApi(409, 'SESION_LLENA', ''), 'llena'],
    [new ErrorApi(410, 'SESION_CERRADA', ''), 'cerrada'],
    [new ErrorApi(401, 'SIN_CREDENCIAL', ''), 'credencial'],
    [new ErrorApi(401, 'TOKEN_EXPIRADO', ''), 'credencial'],
    [new ErrorApi(401, 'TOKEN_INVALIDO', ''), 'credencial'],
    [new ErrorApi(429, 'DEMASIADAS_PETICIONES', ''), 'limite'],
    [new ErrorApi(408, 'SUBIDA_INCOMPLETA', ''), 'sin_conexion'],
    [new ErrorApi(0, 'SIN_RED', ''), 'sin_conexion'],
    [new ErrorApi(413, 'ARCHIVO_GRANDE', ''), 'generico'],
    [new ErrorApi(500, 'ERROR_INTERNO', ''), 'generico'],
    [new Error('otra cosa'), 'generico'],
  ])('%j → %s', (error, clase) => {
    expect(claseDeError(error)).toBe(clase);
  });
});

describe('el servicio simulado cumple el contrato', () => {
  it('sus respuestas validan contra openapi.json y sus peticiones también', async () => {
    const sim = crearServicioEntradaSimulado({ restaurante: { nombre: 'La Ceiba', logo_url: 'https://cdn.example/logo.png' } });
    const entrar = await sim.servicio.entrar(CODIGO_SEMILLA);
    expect(validador('EntrarRespuesta')(entrar), validador('EntrarRespuesta')(entrar).errores).toMatchObject({ valido: true });
    sim.sentarOtro();
    const estado = await sim.servicio.estado(null);
    if (estado.sinCambios) throw new Error('esperaba estado');
    expect(validador('SesionEstado')(estado.estado)).toMatchObject({ valido: true });
    const alias = await sim.servicio.cambiarAlias('Luz');
    expect(validador('MiembroRespuesta')(alias)).toMatchObject({ valido: true });
    expect(validador('EntrarCuerpo')({ codigo_mesa: CODIGO_SEMILLA })).toMatchObject({ valido: true });
    expect(validador('MiembroCambios')({ alias: 'Luz' })).toMatchObject({ valido: true });
  });

  it('aplica las reglas del servidor: 12 como máximo, alias bloqueado, 304, 401 y 410', async () => {
    const sim = crearServicioEntradaSimulado({ ocupados: 12 });
    await expect(sim.servicio.entrar(CODIGO_SEMILLA)).rejects.toMatchObject({ estado: 409, codigo: 'SESION_LLENA' });
    await expect(sim.servicio.entrar('otro')).rejects.toMatchObject({ estado: 404 });

    const s2 = crearServicioEntradaSimulado();
    await s2.servicio.entrar(CODIGO_SEMILLA);
    await expect(s2.servicio.cambiarAlias('eres un tonto')).rejects.toMatchObject({ codigo: 'ALIAS_NO_PERMITIDO' });
    await expect(s2.servicio.cambiarAlias('x'.repeat(25))).rejects.toMatchObject({ codigo: 'PAYLOAD_INVALIDO' });
    const e1 = await s2.servicio.estado(null);
    if (e1.sinCambios) throw new Error('x');
    expect(await s2.servicio.estado(e1.etag)).toEqual({ sinCambios: true });
    s2.expirarToken();
    await expect(s2.servicio.estado(e1.etag)).rejects.toMatchObject({ estado: 401 });
    s2.cerrar();
    await expect(s2.servicio.estado(null)).rejects.toMatchObject({ estado: 410 });
    expect(errorSimulado(500, 'ERROR_INTERNO').estado).toBe(500);
  });
});

describe('espejo local (AC-01.4)', () => {
  it('guarda sólo ids opacos y los lee de vuelta', () => {
    espejoLocal.guardar({ miembro: 'm-1', sesion: 's-1' });
    expect(espejoLocal.leer()).toEqual({ miembro: 'm-1', sesion: 's-1' });
    const crudo = window.localStorage.getItem('carta:invitado:v1')!;
    expect(Object.keys(JSON.parse(crudo)).sort()).toEqual(['miembro', 'sesion']);
    espejoLocal.olvidar();
    expect(espejoLocal.leer()).toBeNull();
  });

  it.each(['no es json', '[]', '{"miembro":1,"sesion":"a"}', '{"miembro":"<script>","sesion":"a"}', `{"miembro":"${'a'.repeat(65)}","sesion":"a"}`, 'null'])(
    'lo manipulado (%s) se ignora',
    (valor) => {
      window.localStorage.setItem('carta:invitado:v1', valor);
      expect(espejoLocal.leer()).toBeNull();
    },
  );

  it('con localStorage bloqueado (modo privado de Safari) nada lanza', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denegado', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cuota', 'QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('denegado', 'SecurityError');
    });
    expect(espejoLocal.leer()).toBeNull();
    expect(() => espejoLocal.guardar({ miembro: 'a', sesion: 'b' })).not.toThrow();
    expect(() => espejoLocal.olvidar()).not.toThrow();
  });

  it('si window.localStorage mismo lanza al acceder, tampoco rompe', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')!;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('bloqueado', 'SecurityError');
      },
    });
    try {
      expect(espejoLocal.leer()).toBeNull();
      expect(() => espejoLocal.guardar({ miembro: 'a', sesion: 'b' })).not.toThrow();
    } finally {
      Object.defineProperty(window, 'localStorage', original);
    }
  });
});
