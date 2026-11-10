import { describe, expect, it, vi } from 'vitest';

import { crearCliente, ErrorApi, nombreDeDisposicion } from '../../compartido/http';
import { crearServicioMesasSimulado } from '../../mocks/servicioMesasSimulado';
import { esquema, metodosDe, operacion, validador } from '../gestion/utilesContrato';
import { crearServicioMesas, TOPES_MESAS } from './servicio';

const RID = '11111111-1111-4111-8111-111111111111';
const MID = '00000000-0000-4000-8000-0000000d0002';

function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } });
}
function montar(responder: (url: URL, init: RequestInit) => Response = () => json([])) {
  const fetchFalso = vi.fn(async (url: URL | string, init?: RequestInit) => responder(new URL(String(url)), init ?? {}));
  const cliente = crearCliente({ token: () => 'tok', fetch: fetchFalso as unknown as typeof fetch });
  return { servicio: crearServicioMesas(cliente), fetchFalso };
}
const ultima = (f: ReturnType<typeof montar>['fetchFalso']) => {
  const [url, init] = f.mock.calls.at(-1)!;
  return { url: new URL(String(url)), init: init as RequestInit };
};

describe('contrato de mesas (T-1.5)', () => {
  it('las rutas y los métodos existen en el OpenAPI de la API', () => {
    expect(metodosDe('/admin/restaurantes/{rid}/mesas')).toEqual(expect.arrayContaining(['get', 'post']));
    expect(metodosDe('/admin/restaurantes/{rid}/mesas/qr.pdf')).toEqual(['get']);
    expect(metodosDe('/admin/mesas/{mesa_id}/regenerar-codigo')).toEqual(['post']);
  });

  it('los topes del cliente coinciden con los del esquema publicado', () => {
    const crear = validador('MesasCrear');
    expect(crear({ cantidad: TOPES_MESAS.porLlamada, capacidad: TOPES_MESAS.capacidad }).valido).toBe(true);
    expect(crear({ cantidad: TOPES_MESAS.porLlamada + 1, capacidad: 4 }).valido).toBe(false);
    expect(crear({ cantidad: 0, capacidad: 4 }).valido).toBe(false);
    expect(crear({ cantidad: 1, capacidad: TOPES_MESAS.capacidad + 1 }).valido).toBe(false);
    // Literales a propósito: si el contrato cambia el tope, esta prueba avisa antes que la pantalla.
    expect(TOPES_MESAS).toEqual({ porLlamada: 100, capacidad: 50, activas: 500 });
    const limit = operacion('/admin/restaurantes/{rid}/mesas', 'get').parameters!.find((p) => p.name === 'limit')!;
    expect(limit.schema['maximum']).toBe(TOPES_MESAS.activas);
  });

  it('GET de mesas: restaurante en la ruta, activa y limit en la consulta (500 por defecto)', async () => {
    const { servicio, fetchFalso } = montar();
    await servicio.listar(RID, { activa: true });
    let { url, init } = ultima(fetchFalso);
    expect(url.pathname).toBe(`/api/v1/admin/restaurantes/${RID}/mesas`);
    expect(Object.fromEntries(url.searchParams)).toEqual({ activa: 'true', limit: '500' });
    expect(init.method).toBe('GET');
    await servicio.listar(RID, { activa: false, limite: 1 });
    ({ url } = ultima(fetchFalso));
    expect(Object.fromEntries(url.searchParams)).toEqual({ activa: 'false', limit: '1' });
  });

  it('POST de mesas: el cuerpo cumple MesasCrear y el restaurante va sólo en la ruta', async () => {
    const { servicio, fetchFalso } = montar(() => json([], 201));
    await servicio.crear(RID, { cantidad: 12, capacidad: 6 });
    const { url, init } = ultima(fetchFalso);
    expect(url.pathname).toBe(`/api/v1/admin/restaurantes/${RID}/mesas`);
    expect(init.method).toBe('POST');
    const cuerpo = JSON.parse(String(init.body));
    expect(cuerpo).toEqual({ cantidad: 12, capacidad: 6 });
    expect(validador('MesasCrear')(cuerpo).valido).toBe(true);
    expect(JSON.stringify(cuerpo)).not.toContain(RID);
  });

  it('regenerar: POST sin cuerpo a la ruta de la mesa', async () => {
    const { servicio, fetchFalso } = montar(() => json({}));
    await servicio.regenerar(MID);
    const { url, init } = ultima(fetchFalso);
    expect(url.pathname).toBe(`/api/v1/admin/mesas/${MID}/regenerar-codigo`);
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
  });

  it('descargarQr: acepta application/pdf y un octet-stream que empieza con %PDF, rechaza lo demás', async () => {
    const pdf = (tipo: string, cuerpo = '%PDF-1.4 x', extra: Record<string, string> = {}) =>
      new Response(cuerpo, { status: 200, headers: { 'Content-Type': tipo, ...extra } });
    expect((await montar(() => pdf('application/pdf')).servicio.descargarQr(RID)).blob.type).toBe('application/pdf');
    expect((await montar(() => pdf('application/octet-stream')).servicio.descargarQr(RID)).blob.type).toBe('application/pdf');
    // El nombre sugerido por el servidor viaja con el archivo; sin cabecera es `null`.
    const conNombre = pdf('application/pdf', '%PDF', { 'Content-Disposition': 'attachment; filename="qr-mesas-taqueria.pdf"' });
    expect((await montar(() => conNombre).servicio.descargarQr(RID)).nombre).toBe('qr-mesas-taqueria.pdf');
    expect((await montar(() => pdf('application/pdf')).servicio.descargarQr(RID)).nombre).toBeNull();
    await expect(montar(() => pdf('text/html', '<html>')).servicio.descargarQr(RID)).rejects.toMatchObject({
      codigo: 'RESPUESTA_INVALIDA',
    });
    const { servicio, fetchFalso } = montar(() => pdf('application/pdf'));
    await servicio.descargarQr(RID);
    expect(ultima(fetchFalso).url.pathname).toBe(`/api/v1/admin/restaurantes/${RID}/mesas/qr.pdf`);
  });

  it('el 409 y el 503 del PDF llegan como ErrorApi con su código', async () => {
    const error = (estado: number, codigo: string) =>
      json({ error: { codigo, mensaje: 'Un mensaje', detalles: {}, request_id: null } }, estado);
    await expect(montar(() => error(409, 'CODIGOS_CAMBIADOS')).servicio.descargarQr(RID)).rejects.toMatchObject({
      estado: 409,
      codigo: 'CODIGOS_CAMBIADOS',
    });
    await expect(montar(() => error(503, 'SERVICIO_OCUPADO')).servicio.descargarQr(RID)).rejects.toMatchObject({
      estado: 503,
      codigo: 'SERVICIO_OCUPADO',
    });
    const ops = operacion('/admin/restaurantes/{rid}/mesas/qr.pdf', 'get').responses;
    expect(Object.keys(ops)).toEqual(expect.arrayContaining(['409', '503']));
  });
});

describe('nombre del PDF según Content-Disposition', () => {
  it.each([
    ['attachment; filename="qr-mesas-taqueria.pdf"', 'qr-mesas-taqueria.pdf'],
    ['attachment; filename=qr.pdf', 'qr.pdf'],
    ["attachment; filename*=UTF-8''qr%20caf%C3%A9.pdf", 'qr café.pdf'],
    ['attachment; filename="../../etc/passwd"', 'passwd'],
    ['attachment; filename="..\\..\\x.pdf"', 'x.pdf'],
    ['attachment; filename="a\u0000b\n.pdf"', 'ab.pdf'],
    ['attachment; filename=".."', null],
    ['attachment', null],
    [null, null],
  ])('%s → %s', (cabecera, esperado) => {
    expect(nombreDeDisposicion(cabecera)).toBe(esperado);
  });
});

describe('el servicio simulado respeta el contrato (peticiones y respuestas)', () => {
  it('rechaza con 422 lo que el esquema MesasCrear no admite y sus respuestas no traen campos de más', async () => {
    const sim = crearServicioMesasSimulado();
    for (const malo of [{ cantidad: 0, capacidad: 4 }, { cantidad: 101, capacidad: 4 }, { cantidad: 1, capacidad: 51 }, { cantidad: 1, capacidad: 4, extra: 1 }]) {
      await expect(sim.servicio.crear(RID, malo as never)).rejects.toMatchObject({ estado: 422 });
    }
    const claves = Object.keys(esquema('MesaRespuesta').properties);
    for (const m of await sim.servicio.listar(RID)) expect(Object.keys(m).sort()).toEqual([...claves].sort());
  });

  it('cada mesa que devuelve cumple MesaRespuesta, con url_publica y código distinto al regenerar', async () => {
    const sim = crearServicioMesasSimulado();
    const mesa = validador('MesaRespuesta');
    const todas = await sim.servicio.listar(RID);
    for (const m of todas) expect(mesa(m), mesa(m).errores).toMatchObject({ valido: true });
    const nuevas = await sim.servicio.crear(RID, { cantidad: 3, capacidad: 2 });
    expect(nuevas.map((m) => m.numero)).toEqual([6, 7, 8]);
    for (const m of nuevas) expect(mesa(m).valido).toBe(true);
    const antes = todas[0]!;
    const despues = await sim.servicio.regenerar(antes.id);
    expect(mesa(despues).valido).toBe(true);
    expect(despues.codigo_publico).not.toBe(antes.codigo_publico);
    expect(despues.url_publica).toContain(despues.codigo_publico);
    expect(despues.codigo_publico.length).toBeGreaterThanOrEqual(22);
  });

  it('reproduce los errores del servidor: tope de 500, mesa inactiva, PDF sin mesas', async () => {
    const sim = crearServicioMesasSimulado();
    await expect(sim.servicio.crear(RID, { cantidad: 100, capacidad: 4 })).resolves.toHaveLength(100);
    for (let i = 0; i < 3; i += 1) await sim.servicio.crear(RID, { cantidad: 100, capacidad: 4 });
    await expect(sim.servicio.crear(RID, { cantidad: 100, capacidad: 4 })).rejects.toMatchObject({
      estado: 422,
      detalles: { errores: [{ campo: 'body.cantidad', tipo: 'limite_de_mesas' }] },
    });
    const inactiva = sim.mesas().find((m) => !m.activa)!;
    await expect(sim.servicio.regenerar(inactiva.id)).rejects.toMatchObject({ estado: 409, codigo: 'MESA_INACTIVA' });
    const vacio = crearServicioMesasSimulado({ mesas: [] });
    await expect(vacio.servicio.descargarQr(RID)).rejects.toBeInstanceOf(ErrorApi);
  });
});
