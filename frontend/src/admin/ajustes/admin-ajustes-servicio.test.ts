import { describe, expect, it, vi } from 'vitest';

import { crearCliente } from '../../compartido/http';
import { crearServicioAjustesSimulado, restauranteSemilla } from '../../mocks/servicioAjustesSimulado';
import { metodosDe, validador, esquema } from '../gestion/utilesContrato';
import { crearServicioAjustes, esCorreo, esUrlHttps, TOPES_AJUSTES } from './servicio';

const RID = '11111111-1111-4111-8111-111111111111';

function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } });
}
function montar(responder: (url: URL, init: RequestInit) => Response = () => json({})) {
  const fetchFalso = vi.fn(async (url: URL | string, init?: RequestInit) => responder(new URL(String(url)), init ?? {}));
  const cliente = crearCliente({ token: () => 'tok', fetch: fetchFalso as unknown as typeof fetch });
  return { servicio: crearServicioAjustes(cliente), fetchFalso };
}
const ultima = (f: ReturnType<typeof montar>['fetchFalso']) => {
  const [url, init] = f.mock.calls.at(-1)!;
  return { url: new URL(String(url)), init: init as RequestInit };
};

describe('contrato de ajustes (T-1.2)', () => {
  it('PATCH existe y los topes del cliente son los del esquema publicado', () => {
    expect(metodosDe('/admin/restaurantes/{rid}')).toEqual(expect.arrayContaining(['get', 'patch']));
    const props = esquema('RestauranteCambios').properties as Record<string, { anyOf: { maxLength?: number }[] }>;
    const tope = (campo: string) => props[campo]!.anyOf.find((x) => x.maxLength)!.maxLength;
    // Literales a propósito: si el contrato cambia un tope, esta prueba avisa antes que la pantalla.
    expect(TOPES_AJUSTES).toEqual({ nombre: 200, direccion: 500, telefono: 20, email: 200, logo: 500 });
    expect(tope('nombre')).toBe(TOPES_AJUSTES.nombre);
    expect(tope('direccion')).toBe(TOPES_AJUSTES.direccion);
    expect(tope('telefono')).toBe(TOPES_AJUSTES.telefono);
    expect(tope('email')).toBe(TOPES_AJUSTES.email);
    expect(tope('logo_url')).toBe(TOPES_AJUSTES.logo);
  });

  it('PATCH: sólo los campos enviados, restaurante en la ruta, forma de RestauranteCambios', async () => {
    const { servicio, fetchFalso } = montar(() => json(restauranteSemilla));
    await servicio.cambiar(RID, { telefono: '55 0000 1111', direccion: null });
    const { url, init } = ultima(fetchFalso);
    expect(url.pathname).toBe(`/api/v1/admin/restaurantes/${RID}`);
    expect(init.method).toBe('PATCH');
    const cuerpo = JSON.parse(String(init.body));
    expect(cuerpo).toStrictEqual({ telefono: '55 0000 1111', direccion: null });
    expect(validador('RestauranteCambios')(cuerpo).valido).toBe(true);
    expect(JSON.stringify(cuerpo)).not.toContain(RID);
  });

  it('primeraMesa: GET de mesas activas con limit=1; vacío y respuestas raras dan null', async () => {
    const { servicio, fetchFalso } = montar(() => json([]));
    await expect(servicio.primeraMesa(RID)).resolves.toBeNull();
    const { url } = ultima(fetchFalso);
    expect(url.pathname).toBe(`/api/v1/admin/restaurantes/${RID}/mesas`);
    expect(Object.fromEntries(url.searchParams)).toEqual({ activa: 'true', limit: '1' });
    await expect(montar(() => json({ mesas: [] })).servicio.primeraMesa(RID)).resolves.toBeNull();
  });
});

describe('validaciones del cliente = las del servidor', () => {
  it.each([
    ['https://logo.example.com/a.png', true],
    ['https://x.mx', true],
    ['http://logo.example.com/a.png', false],
    ['javascript:alert(1)', false],
    ['data:image/png;base64,AAAA', false],
    ['//logo.example.com/a.png', false],
    ['https://user:pass@logo.example.com/a.png', false],
    ['https://logo.example.com@evil.com/a.png', false],
    ['https://', false],
    ['logo.png', false],
    ['', false],
  ])('esUrlHttps(%s) = %s', (texto, esperado) => {
    expect(esUrlHttps(texto)).toBe(esperado);
  });

  it.each([
    ['hola@elpaso.mx', true],
    ['a@b.co', true],
    ['sin-arroba', false],
    ['a@b', false],
    ['a b@c.mx', false],
  ])('esCorreo(%s) = %s', (texto, esperado) => {
    expect(esCorreo(texto)).toBe(esperado);
  });
});

describe('el servicio simulado respeta el contrato', () => {
  it('devuelve un RestauranteRespuesta válido, cambia sólo lo enviado y rechaza un logo no https', async () => {
    const sim = crearServicioAjustesSimulado();
    const respuesta = validador('RestauranteRespuesta');
    const nuevo = await sim.servicio.cambiar(RID, { telefono: null, logo_url: 'https://logo.example.com/a.png' });
    expect(respuesta(nuevo), respuesta(nuevo).errores).toMatchObject({ valido: true });
    expect(nuevo.telefono).toBeNull();
    expect(nuevo.nombre).toBe(restauranteSemilla.nombre);
    expect(nuevo.email).toBe(restauranteSemilla.email);
    await expect(sim.servicio.cambiar(RID, { logo_url: 'http://x.mx/a.png' })).rejects.toMatchObject({
      estado: 422,
      detalles: { errores: [{ campo: 'body.logo_url' }] },
    });
    const mesa = await sim.servicio.primeraMesa(RID);
    expect(validador('MesaRespuesta')(mesa).valido).toBe(true);
  });
});
