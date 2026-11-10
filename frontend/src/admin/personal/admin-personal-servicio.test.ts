import { describe, expect, it, vi } from 'vitest';

import { crearCliente } from '../../compartido/http';
import { crearServicioPersonalSimulado, personaDe } from '../../mocks/servicioPersonalSimulado';
import { metodosDe, operacion, validador } from '../gestion/utilesContrato';
import { PIN_VALIDO, soloDigitosAscii } from './pin';
import { crearServicioPersonal, TOPES_PERSONAL } from './servicio';

const RID = '11111111-1111-4111-8111-111111111111';
const PID = '00000000-0000-4000-8000-0000000e0002';

function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } });
}
function montar(responder: (url: URL, init: RequestInit) => Response = () => json([])) {
  const fetchFalso = vi.fn(async (url: URL | string, init?: RequestInit) => responder(new URL(String(url)), init ?? {}));
  const cliente = crearCliente({ token: () => 'tok', fetch: fetchFalso as unknown as typeof fetch });
  return { servicio: crearServicioPersonal(cliente), fetchFalso };
}
const ultima = (f: ReturnType<typeof montar>['fetchFalso']) => {
  const [url, init] = f.mock.calls.at(-1)!;
  return { url: new URL(String(url)), init: init as RequestInit };
};

describe('contrato de personal (T-1.6)', () => {
  it('las rutas y los métodos existen en el OpenAPI de la API', () => {
    expect(metodosDe('/admin/restaurantes/{rid}/personal')).toEqual(expect.arrayContaining(['get', 'post']));
    expect(metodosDe('/admin/personal/{personal_id}')).toEqual(['patch']);
    expect(metodosDe('/admin/personal/{personal_id}/pin')).toEqual(['post']);
    expect(Object.keys(operacion('/admin/personal/{personal_id}/pin', 'post').responses)).toContain('204');
  });

  it('el patrón del PIN y el tope del nombre coinciden con el esquema publicado', () => {
    const crear = validador('PersonalCrear');
    for (const pin of ['0000', '1234', '0123', '123456']) {
      expect(crear({ nombre: 'Ana', pin }).valido, pin).toBe(true);
      expect(PIN_VALIDO.test(pin)).toBe(true);
    }
    for (const pin of ['123', '1234567', '12a4', '１２３４', '12 34', '']) {
      expect(crear({ nombre: 'Ana', pin }).valido, pin).toBe(false);
      expect(PIN_VALIDO.test(pin), pin).toBe(false);
    }
    expect(crear({ nombre: 'x'.repeat(TOPES_PERSONAL.nombre), pin: '1234' }).valido).toBe(true);
    expect(crear({ nombre: 'x'.repeat(TOPES_PERSONAL.nombre + 1), pin: '1234' }).valido).toBe(false);
    expect(crear({ nombre: '', pin: '1234' }).valido).toBe(false);
    expect(validador('PinNuevo')({ pin: '1234' }).valido).toBe(true);
    expect(validador('PinNuevo')({ pin: '12' }).valido).toBe(false);
    expect(TOPES_PERSONAL).toEqual({ nombre: 60, activos: 50 });
  });

  it('GET: restaurante en la ruta y sin filtros (activos y bajas juntos)', async () => {
    const { servicio, fetchFalso } = montar();
    await servicio.listar(RID);
    const { url, init } = ultima(fetchFalso);
    expect(url.pathname).toBe(`/api/v1/admin/restaurantes/${RID}/personal`);
    expect(url.search).toBe('');
    expect(init.method).toBe('GET');
  });

  it('POST: el cuerpo cumple PersonalCrear y el restaurante va sólo en la ruta', async () => {
    const { servicio, fetchFalso } = montar(() => json(personaDe(1), 201));
    await servicio.crear(RID, { nombre: 'Ana', rol: 'capitan', pin: '4829' });
    const { url, init } = ultima(fetchFalso);
    expect(url.pathname).toBe(`/api/v1/admin/restaurantes/${RID}/personal`);
    expect(init.method).toBe('POST');
    const cuerpo = JSON.parse(String(init.body));
    expect(cuerpo).toEqual({ nombre: 'Ana', rol: 'capitan', pin: '4829' });
    expect(validador('PersonalCrear')(cuerpo).valido).toBe(true);
  });

  it('PATCH: sólo los campos enviados y con la forma de PersonalCambios (activo booleano estricto)', async () => {
    const { servicio, fetchFalso } = montar(() => json(personaDe(2)));
    await servicio.cambiar(PID, { activo: false });
    let { url, init } = ultima(fetchFalso);
    expect(url.pathname).toBe(`/api/v1/admin/personal/${PID}`);
    expect(init.method).toBe('PATCH');
    let cuerpo = JSON.parse(String(init.body));
    expect(cuerpo).toStrictEqual({ activo: false });
    expect(validador('PersonalCambios')(cuerpo).valido).toBe(true);
    await servicio.cambiar(PID, { nombre: 'Ana', rol: 'mesero' });
    ({ init } = ultima(fetchFalso));
    cuerpo = JSON.parse(String(init.body));
    expect(cuerpo).toStrictEqual({ nombre: 'Ana', rol: 'mesero' });
    expect(validador('PersonalCambios')(cuerpo).valido).toBe(true);
    // El servidor no acepta cadenas por booleano.
    expect(validador('PersonalCambios')({ activo: 'false' }).valido).toBe(false);
  });

  it('reasignar PIN: POST a /pin con PinNuevo y respuesta 204 sin cuerpo', async () => {
    const { servicio, fetchFalso } = montar(() => new Response(null, { status: 204 }));
    await expect(servicio.reasignarPin(PID, '0000')).resolves.toBeUndefined();
    const { url, init } = ultima(fetchFalso);
    expect(url.pathname).toBe(`/api/v1/admin/personal/${PID}/pin`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toStrictEqual({ pin: '0000' });
  });
});

describe('PIN: sólo dígitos ASCII', () => {
  it.each([
    ['4829', '4829'],
    ['48 29', '4829'],
    ['48-2a9', '4829'],
    ['１２３４', '1234'], // ancho completo
    ['١٢٣٤', '1234'], // árabe-índicos
    ['۱۲۳۴', '1234'], // persas
    ['१२३४', '1234'], // devanagari
    ['😀12', '12'],
    ['', ''],
  ])('«%s» → «%s»', (entrada, salida) => {
    expect(soloDigitosAscii(entrada)).toBe(salida);
  });
});

describe('el servicio simulado respeta el contrato', () => {
  it('cada persona que devuelve cumple PersonalRespuesta y nunca lleva el PIN', async () => {
    const sim = crearServicioPersonalSimulado();
    const respuesta = validador('PersonalRespuesta');
    for (const p of await sim.servicio.listar(RID)) expect(respuesta(p), respuesta(p).errores).toMatchObject({ valido: true });
    const creada = await sim.servicio.crear(RID, { nombre: 'Rosa Gil', rol: 'mesero', pin: '0000' });
    expect(respuesta(creada).valido).toBe(true);
    expect(JSON.stringify(creada)).not.toContain('pin');
    expect(JSON.stringify(sim.llamadas)).not.toContain('0000');
  });

  it('acepta 0000 y 1234 (el servidor no los rechaza) y rechaza lo que no es de 4 a 6 dígitos', async () => {
    const sim = crearServicioPersonalSimulado();
    await expect(sim.servicio.crear(RID, { nombre: 'Uno', rol: 'mesero', pin: '0000' })).resolves.toBeTruthy();
    await expect(sim.servicio.crear(RID, { nombre: 'Dos', rol: 'mesero', pin: '1234' })).resolves.toBeTruthy();
    await expect(sim.servicio.crear(RID, { nombre: 'Tres', rol: 'mesero', pin: '12' })).rejects.toMatchObject({ estado: 422 });
  });

  it('409 por nombre repetido entre activos (no entre bajas) y 422 con 50 activos', async () => {
    const sim = crearServicioPersonalSimulado();
    await expect(sim.servicio.crear(RID, { nombre: ' luis  ORTEGA ', rol: 'mesero', pin: '1111' })).rejects.toMatchObject({
      estado: 409,
      message: 'Ya hay una persona activa con ese nombre.',
    });
    await expect(sim.servicio.crear(RID, { nombre: 'Jorge Peña', rol: 'mesero', pin: '1111' })).resolves.toBeTruthy();
    const lleno = crearServicioPersonalSimulado({ personal: Array.from({ length: 50 }, (_, i) => personaDe(i + 1)) });
    await expect(lleno.servicio.crear(RID, { nombre: 'Nueva', rol: 'mesero', pin: '1111' })).rejects.toMatchObject({
      estado: 422,
      detalles: { errores: [{ tipo: 'limite_de_personal' }] },
    });
  });
});
