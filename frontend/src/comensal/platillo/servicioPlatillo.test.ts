import { describe, expect, it, vi } from 'vitest';

import { validador } from '../../admin/gestion/utilesContrato';
import { crearServicioPlatilloSimulado } from '../../mocks/servicioPlatilloSimulado';
import { crearServicioPlatillo, esPlatilloDetalle, ID_PLATILLO } from './servicioPlatillo';
import { idDe } from './utilesPrueba';

const json = (cuerpo: unknown, estado = 200, cabeceras: Record<string, string> = {}) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json', ...cabeceras } });
const detalle = () => crearServicioPlatilloSimulado().servicio.platillo(idDe('Cochinita pibil'));

describe('servicio del detalle del platillo', () => {
  it('el mock cumple el contrato PlatilloDetalle (Ajv contra mocks/openapi.json)', async () => {
    const comprobar = validador('PlatilloDetalle');
    const r = comprobar(await detalle());
    expect(r.valido, r.errores).toBe(true);
    expect((await detalle()).categoria_nombre).toBe('Platos fuertes');
  });

  it('pide GET /p/platillos/{id} con la cookie del propio origen, sin Authorization ni If-None-Match', async () => {
    const cuerpo = await detalle();
    const buscar = vi.fn(async () => json(cuerpo));
    const platillo = await crearServicioPlatillo(buscar as unknown as typeof fetch).platillo(cuerpo.id);
    expect(platillo.nombre).toBe('Cochinita pibil');
    const [url, init] = buscar.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`/api/v1/p/platillos/${cuerpo.id}`);
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('same-origin');
    const cabeceras = init.headers as Record<string, string>;
    expect(cabeceras.Authorization).toBeUndefined();
    expect(cabeceras['If-None-Match']).toBeUndefined();
  });

  it('el id se codifica: no puede cambiar la ruta', async () => {
    const buscar = vi.fn(async () => json(await detalle()));
    await crearServicioPlatillo(buscar as unknown as typeof fetch).platillo('../sesion?x=1');
    expect((buscar.mock.calls[0] as unknown as [string])[0]).toBe('/api/v1/p/platillos/..%2Fsesion%3Fx%3D1');
  });

  it('un 404 y un 429 con la espera, y un 200 que no es un platillo, son errores del dominio', async () => {
    const servicio = (r: Response) => crearServicioPlatillo((async () => r) as unknown as typeof fetch);
    const cuerpo = (codigo: string) => ({ error: { codigo, mensaje: 'x', detalles: {}, request_id: 'r' } });
    await expect(servicio(json(cuerpo('PLATILLO_NO_ENCONTRADO'), 404)).platillo('a')).rejects.toMatchObject({ estado: 404, codigo: 'PLATILLO_NO_ENCONTRADO' });
    await expect(servicio(json(cuerpo('DEMASIADAS_PETICIONES'), 429, { 'Retry-After': '2.1' })).platillo('a')).rejects.toMatchObject({ estado: 429, reintentarEn: 3 });
    await expect(servicio(new Response('<html>borde</html>', { status: 200 })).platillo('a')).rejects.toMatchObject({ codigo: 'RESPUESTA_INVALIDA' });
    await expect(servicio(json({ nombre: 3 })).platillo('a')).rejects.toMatchObject({ codigo: 'RESPUESTA_INVALIDA' });
    await expect(servicio(new Response(null, { status: 304 })).platillo('a')).rejects.toMatchObject({ codigo: 'RESPUESTA_INVALIDA' });
  });

  it('esPlatilloDetalle exige la forma del menú y una categoría de texto (o ninguna)', async () => {
    const base = await detalle();
    expect(esPlatilloDetalle(base)).toBe(true);
    expect(esPlatilloDetalle({ ...base, categoria_nombre: null })).toBe(true);
    expect(esPlatilloDetalle({ ...base, categoria_nombre: 4 })).toBe(false);
    expect(esPlatilloDetalle({ ...base, alergenos: 'gluten' })).toBe(false);
    expect(esPlatilloDetalle(null)).toBe(false);
  });

  it('sólo un UUID puede ser un platillo', () => {
    expect(ID_PLATILLO.test(idDe('Guacamole de la casa'))).toBe(true);
    for (const malo of ['', 'abc', '../menu', '00000000-0000-4000-8000-00000000100', `${idDe('Guacamole de la casa')}x`]) expect(ID_PLATILLO.test(malo)).toBe(false);
  });
});
