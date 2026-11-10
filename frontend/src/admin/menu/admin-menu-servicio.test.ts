import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it, vi } from 'vitest';

import { crearCliente } from '../../compartido/http';
import api from '../../mocks/openapi.json';
import { ErrorApi } from '../../compartido/http';
import { categoriasSemilla, crearServicioMenuSimulado, platillosSemilla } from '../../mocks/servicioMenuSimulado';
import { cargarPlatillos, crearServicioMenu } from './servicio';

const esquemas = (api as { components: { schemas: Record<string, unknown> } }).components.schemas;
const RID = '11111111-1111-4111-8111-111111111111';
const PID = '00000000-0000-4000-8000-000000000101';

function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } });
}

function montar(responder: (url: URL, init: RequestInit) => Response = () => json([])) {
  const fetchFalso = vi.fn(async (url: URL | string, init?: RequestInit) => responder(new URL(String(url)), init ?? {}));
  const cliente = crearCliente({ token: () => 'tok', fetch: fetchFalso as unknown as typeof fetch });
  return { servicio: crearServicioMenu(cliente), fetchFalso };
}
const ultima = (f: ReturnType<typeof montar>['fetchFalso']) => {
  const [url, init] = f.mock.calls.at(-1)!;
  return { url: new URL(String(url)), init: init as RequestInit };
};
/** Ajv con los formatos del contrato activados (uuid, fecha-hora); `binary` es sólo el campo del archivo. */
const validador = (nombre: string) => {
  const ajv = new Ajv2020({ strict: false, validateFormats: true });
  ajv.addFormat('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  ajv.addFormat('date-time', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/);
  ajv.addFormat('binary', true);
  return ajv.compile({ $ref: `#/components/schemas/${nombre}`, components: { schemas: esquemas } });
};

describe('contrato de categorías y platillos (T-1.3) y fotos (T-1.4)', () => {
  it('las rutas y los métodos existen en el OpenAPI de la API', () => {
    const rutas = (api as { paths: Record<string, Record<string, unknown>> }).paths;
    expect(Object.keys(rutas['/api/v1/admin/restaurantes/{rid}/platillos']!)).toEqual(expect.arrayContaining(['get', 'post']));
    expect(Object.keys(rutas['/api/v1/admin/platillos/{platillo_id}']!)).toEqual(expect.arrayContaining(['patch', 'delete']));
    expect(Object.keys(rutas['/api/v1/admin/restaurantes/{rid}/platillos/reordenar']!)).toEqual(['post']);
    expect(Object.keys(rutas['/api/v1/admin/platillos/{platillo_id}/foto']!)).toEqual(expect.arrayContaining(['post', 'delete']));
    expect(Object.keys(rutas['/api/v1/admin/restaurantes/{rid}/categorias']!)).toEqual(expect.arrayContaining(['get']));
  });

  it('los topes del cliente coinciden con los del esquema publicado', () => {
    const paginas = (api as unknown as { paths: Record<string, Record<string, { parameters: { name: string; schema: { maximum?: number } }[] }>> })
      .paths['/api/v1/admin/restaurantes/{rid}/platillos']!.get!.parameters;
    // Literales a propósito: si el contrato cambia el tope, esta prueba avisa antes que la pantalla.
    expect(paginas.find((p) => p.name === 'limit')!.schema.maximum).toBe(100);
    const crear = esquemas.PlatilloCrear as { properties: { nombre: { maxLength: number } } };
    expect(crear.properties.nombre.maxLength).toBe(200);
  });

  it('GET de platillos: restaurante en la ruta, activo/skip/limit en la consulta', async () => {
    const { servicio, fetchFalso } = montar();
    await servicio.listarPlatillos(RID, { activo: false, skip: 200, limit: 100 });
    const { url, init } = ultima(fetchFalso);
    expect(url.pathname).toBe(`/api/v1/admin/restaurantes/${RID}/platillos`);
    expect(Object.fromEntries(url.searchParams)).toEqual({ activo: 'false', skip: '200', limit: '100' });
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('crear: el cuerpo valida contra PlatilloCrear y no lleva restaurante_id ni imagen', async () => {
    const { servicio, fetchFalso } = montar(() => json({}, 201));
    const cuerpo = { nombre: 'Gringa', precio: 85.5, categoria_id: PID, alergenos: ['lacteos'], etiquetas: [], descripcion: null };
    await servicio.crearPlatillo(RID, cuerpo);
    const { url, init } = ultima(fetchFalso);
    expect(url.pathname).toBe(`/api/v1/admin/restaurantes/${RID}/platillos`);
    const enviado = JSON.parse(init.body as string);
    const valido = validador('PlatilloCrear');
    expect(valido(enviado), JSON.stringify(valido.errors)).toBe(true);
    expect(enviado).not.toHaveProperty('restaurante_id');
    expect(valido({ ...enviado, nombre: '' })).toBe(false);
    expect(valido({ ...enviado, precio: -1 })).toBe(false);
  });

  it('editar y marcar agotado: PATCH con PlatilloCambios (disponible, activo, categoria_id)', async () => {
    const { servicio, fetchFalso } = montar(() => json({}));
    await servicio.cambiarPlatillo(PID, { disponible: false });
    expect(ultima(fetchFalso).url.pathname).toBe(`/api/v1/admin/platillos/${PID}`);
    expect(ultima(fetchFalso).init.method).toBe('PATCH');
    const valido = validador('PlatilloCambios');
    for (const cuerpo of [{ disponible: false }, { activo: true }, { categoria_id: PID, precio: 12.5 }]) {
      expect(valido(cuerpo), JSON.stringify(valido.errors)).toBe(true);
    }
  });

  it('dar de baja es DELETE (baja lógica) y responde 204', async () => {
    const { servicio, fetchFalso } = montar(() => new Response(null, { status: 204 }));
    await expect(servicio.darDeBaja(PID)).resolves.toBeUndefined();
    expect(ultima(fetchFalso).init.method).toBe('DELETE');
    expect(ultima(fetchFalso).url.pathname).toBe(`/api/v1/admin/platillos/${PID}`);
  });

  it('reordenar: POST …/platillos/reordenar con {ids} que valida contra Reordenar', async () => {
    const { servicio, fetchFalso } = montar(() => json([]));
    await servicio.reordenarPlatillos(RID, [PID, '00000000-0000-4000-8000-000000000102']);
    const { url, init } = ultima(fetchFalso);
    expect(url.pathname).toBe(`/api/v1/admin/restaurantes/${RID}/platillos/reordenar`);
    const enviado = JSON.parse(init.body as string);
    expect(Object.keys(enviado)).toEqual(['ids']);
    expect(validador('Reordenar')(enviado)).toBe(true);
    expect(validador('Reordenar')({ ids: [] })).toBe(false);
  });

  it('subir foto: multipart con el campo `archivo` y sin Content-Type propio (lo pone el navegador)', async () => {
    const { servicio, fetchFalso } = montar(() => json({}));
    await servicio.subirFoto(PID, new Blob(['x'], { type: 'image/jpeg' }), 'pastor.jpg');
    const { url, init } = ultima(fetchFalso);
    expect(url.pathname).toBe(`/api/v1/admin/platillos/${PID}/foto`);
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    const formulario = init.body as FormData;
    expect([...formulario.keys()]).toEqual(['archivo']);
    expect((formulario.get('archivo') as File).name).toBe('pastor.jpg');
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    // El cuerpo publicado (esquema inline `FotoPlatillo`) tiene un solo campo: `archivo`.
    const rutas = (api as unknown as { paths: Record<string, { post: { requestBody: { content: Record<string, { schema: { properties: object } }> } } }> }).paths;
    const esquema = rutas['/api/v1/admin/platillos/{platillo_id}/foto']!.post.requestBody.content['multipart/form-data']!.schema;
    expect(Object.keys(esquema.properties)).toEqual(['archivo']);
  });

  it('quitar la foto es DELETE …/foto', async () => {
    const { servicio, fetchFalso } = montar(() => json({}));
    await servicio.quitarFoto(PID);
    expect(ultima(fetchFalso).init.method).toBe('DELETE');
    expect(ultima(fetchFalso).url.pathname).toBe(`/api/v1/admin/platillos/${PID}/foto`);
  });

  it('un id raro se escapa en la ruta, no la altera', async () => {
    const { servicio, fetchFalso } = montar(() => json({}));
    await servicio.cambiarPlatillo('../restaurantes', { activo: true });
    expect(ultima(fetchFalso).url.pathname).toBe('/api/v1/admin/platillos/..%2Frestaurantes');
  });

  it('cargarPlatillos corta en la primera página corta y marca `truncado` al llegar al tope de páginas', async () => {
    const pagina = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String(i) }));
    const { servicio, fetchFalso } = montar((url) => json(pagina(url.searchParams.get('skip') === '100' ? 7 : 100)));
    const corta = await cargarPlatillos(servicio, RID, true);
    expect(corta.lista).toHaveLength(107);
    expect(corta.truncado).toBe(false);
    expect(fetchFalso).toHaveBeenCalledTimes(2);
    const siempreLlena = montar(() => json(pagina(100)));
    const tope = await cargarPlatillos(siempreLlena.servicio, RID, true);
    expect(siempreLlena.fetchFalso).toHaveBeenCalledTimes(20);
    expect(tope.truncado).toBe(true);
    expect(tope.lista).toHaveLength(2000);
  });

  it('cargarPlatillos filtra por categoría con `categoria_id` en la consulta y rechaza una respuesta que no es lista', async () => {
    const { servicio, fetchFalso } = montar();
    await cargarPlatillos(servicio, RID, true, undefined, PID);
    expect(ultima(fetchFalso).url.searchParams.get('categoria_id')).toBe(PID);
    const roto = montar(() => json({ error: 'no soy una lista' }));
    await expect(cargarPlatillos(roto.servicio, RID, true)).rejects.toMatchObject({ codigo: 'RESPUESTA_INVALIDA' });
  });

  it('servicio_traduce_envoltura_409_a_ErrorApi: estado, mensaje y detalles de la envoltura real', async () => {
    const envoltura = {
      error: { codigo: 'CONFLICTO', mensaje: 'Ya tienes un platillo con ese nombre.', detalles: { constraint: 'uq_platillo_nombre' }, request_id: 'req-1' },
    };
    const { servicio } = montar(() => json(envoltura, 409));
    const error = await servicio.crearPlatillo(RID, { nombre: 'Pastor', precio: 22 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({ estado: 409, codigo: 'CONFLICTO', message: 'Ya tienes un platillo con ese nombre.', requestId: 'req-1' });
    expect((error as ErrorApi).detalles).toEqual({ constraint: 'uq_platillo_nombre' });
    const e422 = { error: { codigo: 'PAYLOAD_INVALIDO', mensaje: 'Revisa los datos.', detalles: { errores: [{ campo: 'body.precio', mensaje: 'Muy caro', tipo: 'x' }] }, request_id: null } };
    const { servicio: otro } = montar(() => json(e422, 422));
    const error2 = await otro.cambiarPlatillo(PID, { precio: 1e12 }).catch((e: unknown) => e);
    expect((error2 as ErrorApi).detalles).toEqual(e422.error.detalles);
  });

  it('mock_cumple_PlatilloRespuesta: todo lo que devuelve el servicio simulado valida contra el OpenAPI real (con formatos)', async () => {
    const platillo = validador('PlatilloRespuesta');
    const categoria = validador('CategoriaRespuesta');
    for (const p of platillosSemilla) expect(platillo(p), JSON.stringify([p.nombre, platillo.errors])).toBe(true);
    for (const c of categoriasSemilla) expect(categoria(c), JSON.stringify(categoria.errors)).toBe(true);
    const sim = crearServicioMenuSimulado();
    const id = platillosSemilla[0]!.id;
    const resultados = [
      await sim.servicio.crearPlatillo(RID, { nombre: 'Nuevo', precio: 10 }),
      await sim.servicio.cambiarPlatillo(id, { disponible: false, precio: 30 }),
      await sim.servicio.subirFoto(id, new Blob(['x']), 'a.jpg'),
      await sim.servicio.quitarFoto(id),
    ];
    for (const r of resultados) expect(platillo(r), JSON.stringify([r.nombre, platillo.errors])).toBe(true);
    // La prueba no es una tautología: un campo mal puesto sí se detecta.
    expect(platillo({ ...platillosSemilla[0], id: 'no-uuid' })).toBe(false);
    expect(platillo({ ...platillosSemilla[0], imagen_tipo: 'otra' })).toBe(false);
  });
});
