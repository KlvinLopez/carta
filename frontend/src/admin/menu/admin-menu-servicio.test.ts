import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it, vi } from 'vitest';

import { crearCliente } from '../../compartido/http';
import api from '../../mocks/openapi.json';
import { listarTodosLosPlatillos, crearServicioMenu } from './servicio';
import { TOPES_MENU } from './tipos';

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
const validador = (nombre: string) => {
  const ajv = new Ajv2020({ strict: false, validateFormats: false });
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
    expect(paginas.find((p) => p.name === 'limit')!.schema.maximum).toBe(TOPES_MENU.pagina);
    const crear = esquemas.PlatilloCrear as { properties: { nombre: { maxLength: number } } };
    expect(crear.properties.nombre.maxLength).toBe(TOPES_MENU.nombre);
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
    const campos = Object.keys((esquemas['Body_subir_foto_api_v1_admin_platillos__platillo_id__foto_post'] as { properties: object }).properties);
    expect(campos).toEqual(['archivo']);
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

  it('listarTodosLosPlatillos corta en la primera página corta y tiene un tope de páginas', async () => {
    const pagina = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String(i) }));
    const { servicio, fetchFalso } = montar((url) => json(pagina(url.searchParams.get('skip') === '100' ? 7 : 100)));
    expect(await listarTodosLosPlatillos(servicio, RID, true)).toHaveLength(107);
    expect(fetchFalso).toHaveBeenCalledTimes(2);
    const siempreLlena = montar(() => json(pagina(100)));
    await listarTodosLosPlatillos(siempreLlena.servicio, RID, true);
    expect(siempreLlena.fetchFalso).toHaveBeenCalledTimes(TOPES_MENU.paginasMaximas);
  });
});
