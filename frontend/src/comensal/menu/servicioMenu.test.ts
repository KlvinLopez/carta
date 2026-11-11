import { describe, expect, it, vi } from 'vitest';

import { validador } from '../../admin/gestion/utilesContrato';
import { crearMenuGrande, crearMenuSemilla } from '../../mocks/servicioMenuComensalSimulado';
import { esMenuPublico, crearServicioMenu } from './servicioMenu';

const json = (cuerpo: unknown, estado = 200, cabeceras: Record<string, string> = {}) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json', ...cabeceras } });

describe('servicio del menú', () => {
  it('el mock cumple el contrato MenuPublico (Ajv contra mocks/openapi.json)', () => {
    const comprobar = validador('MenuPublico');
    for (const menu of [crearMenuSemilla(), crearMenuGrande(45)]) {
      const r = comprobar(menu);
      expect(r.valido, r.errores).toBe(true);
    }
    expect(crearMenuSemilla().categorias.flatMap((c) => c.platillos)).toHaveLength(22);
    expect(crearMenuSemilla().categorias.flatMap((c) => c.platillos).filter((p) => !p.disponible)).toHaveLength(1);
  });

  it('pide el menú público por slug con la cookie del propio origen, sin Authorization ni If-None-Match', async () => {
    const buscar = vi.fn(async () => json(crearMenuSemilla()));
    const menu = await crearServicioMenu(buscar as unknown as typeof fetch).menu('la-ceiba');
    expect(menu.restaurante.nombre).toBe('La Ceiba');
    const [url, init] = buscar.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/p/menu/la-ceiba');
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('same-origin');
    const cabeceras = init.headers as Record<string, string>;
    expect(cabeceras.Authorization).toBeUndefined();
    expect(cabeceras['If-None-Match']).toBeUndefined();
  });

  it('el slug se codifica: no puede cambiar la ruta', async () => {
    const buscar = vi.fn(async () => json(crearMenuSemilla()));
    await crearServicioMenu(buscar as unknown as typeof fetch).menu('../sesion?x=1');
    expect((buscar.mock.calls[0] as unknown as [string])[0]).toBe('/api/v1/p/menu/..%2Fsesion%3Fx%3D1');
  });

  it('un 429 trae la espera; un 404 y un 200 que no es un menú son errores del dominio', async () => {
    const servicio = (r: Response) => crearServicioMenu((async () => r) as unknown as typeof fetch);
    await expect(servicio(json({ error: { codigo: 'DEMASIADAS_PETICIONES', mensaje: 'x', detalles: {}, request_id: 'r' } }, 429, { 'Retry-After': '2.1' })).menu('a')).rejects.toMatchObject({ estado: 429, reintentarEn: 3 });
    await expect(servicio(json({ error: { codigo: 'MENU_NO_ENCONTRADO', mensaje: 'x', detalles: {}, request_id: 'r' } }, 404)).menu('a')).rejects.toMatchObject({ estado: 404, codigo: 'MENU_NO_ENCONTRADO' });
    await expect(servicio(new Response('<html>borde</html>', { status: 200 })).menu('a')).rejects.toMatchObject({ codigo: 'RESPUESTA_INVALIDA' });
    await expect(servicio(json({ restaurante: 1 })).menu('a')).rejects.toMatchObject({ codigo: 'RESPUESTA_INVALIDA' });
  });

  it('sin red es un error de red, sin pintar nada', async () => {
    const buscar = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    await expect(crearServicioMenu(buscar).menu('a')).rejects.toMatchObject({ estado: 0, codigo: 'SIN_RED' });
  });

  it('esMenuPublico exige la forma que la pantalla usa', () => {
    const bueno = crearMenuSemilla();
    expect(esMenuPublico(bueno)).toBe(true);
    expect(esMenuPublico({ ...bueno, destacados: 'x' })).toBe(false);
    expect(esMenuPublico({ ...bueno, categorias: [{ id: 'a', nombre: 'b', platillos: [{ id: 'x' }] }] })).toBe(false);
    expect(esMenuPublico(null)).toBe(false);
  });
});
