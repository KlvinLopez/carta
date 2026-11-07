import { afterEach, describe, expect, it, vi } from 'vitest';

import { crearCliente } from '../../compartido/http';
import { crearServicioAlta } from './servicio';

function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } });
}

afterEach(() => vi.unstubAllGlobals());

function montar(respuestas: Response[]) {
  const pedir = vi.fn(async (_url: URL | string, _init?: RequestInit) => respuestas.shift()!);
  const servicio = crearServicioAlta(crearCliente({ token: () => 'tok-ana', fetch: pedir as typeof fetch }));
  return { pedir, servicio };
}

const RID = '00000000-0000-4000-8000-0000000000a1';

describe('servicio de alta contra el contrato', () => {
  it('sube la carta como multipart con el token y sin fijar Content-Type', async () => {
    const { pedir, servicio } = montar([json({ id: 'i1', estado: 'pendiente' }, 202)]);
    await servicio.subirCarta(RID, new File(['%PDF-1.4'], 'carta.pdf', { type: 'application/pdf' }));
    const [url, init] = pedir.mock.calls[0]!;
    expect(String(url)).toContain(`/api/v1/admin/restaurantes/${RID}/importaciones`);
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok-ana');
    // El navegador pone el `boundary`: fijar Content-Type a mano rompería el multipart.
    expect((init?.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    const cuerpo = init?.body as FormData;
    expect(cuerpo).toBeInstanceOf(FormData);
    expect((cuerpo.get('archivo') as File).name).toBe('carta.pdf');
  });

  it('descarga el PDF de QR con fetch y el token (no con un enlace)', async () => {
    const { pedir, servicio } = montar([
      new Response('%PDF-1.4', { status: 200, headers: { 'Content-Type': 'application/pdf' } }),
    ]);
    const pdf = await servicio.descargarQr(RID);
    expect(pdf.type).toBe('application/pdf');
    const [url, init] = pedir.mock.calls[0]!;
    expect(String(url)).toContain(`/restaurantes/${RID}/mesas/qr.pdf`);
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok-ana');
  });

  it('un 200 que no es PDF (el HTML del borde) no se entrega como QR', async () => {
    const { servicio } = montar([new Response('<html>', { status: 200, headers: { 'Content-Type': 'text/html' } })]);
    await expect(servicio.descargarQr(RID)).rejects.toMatchObject({ codigo: 'RESPUESTA_INVALIDA' });
  });

  it('envía mesas, personal (con PIN) y la confirmación con la forma del contrato', async () => {
    const { pedir, servicio } = montar([json([], 201), json({ id: 'p1', nombre: 'Luis', rol: 'mesero', activo: true, creado_en: 'x' }, 201), json({ id: 'i1' })]);
    await servicio.crearMesas(RID, { cantidad: 6, capacidad: 4 });
    await servicio.crearPersonal(RID, { nombre: 'Luis', rol: 'mesero', pin: '4821' });
    await servicio.confirmarImportacion(RID, 'i1', { moneda: 'MXN', categorias: [], avisos: [] });
    expect(JSON.parse(pedir.mock.calls[0]![1]!.body as string)).toEqual({ cantidad: 6, capacidad: 4 });
    expect(JSON.parse(pedir.mock.calls[1]![1]!.body as string)).toEqual({ nombre: 'Luis', rol: 'mesero', pin: '4821' });
    expect(String(pedir.mock.calls[2]![0])).toContain('/importaciones/i1/confirmar');
  });

  it('crea el restaurante y pone el logo con un PATCH; si el PATCH falla, conserva el restaurante', async () => {
    const creado = { id: RID, nombre: 'La Cocina', slug: 'la-cocina', tema: 'vino', activo: true, creado_en: 'x' };
    const ok = montar([json(creado, 201), json({ ...creado, logo_url: 'https://x.mx/l.png' })]);
    const conLogo = await ok.servicio.crearRestaurante({ nombre: 'La Cocina', logo_url: 'https://x.mx/l.png' });
    expect(conLogo.logo_url).toBe('https://x.mx/l.png');
    expect(ok.pedir.mock.calls[1]![1]!.method).toBe('PATCH');

    const falla = montar([json(creado, 201), json({ error: { codigo: 'PAYLOAD_INVALIDO', mensaje: 'x', detalles: {} } }, 422)]);
    await expect(falla.servicio.crearRestaurante({ nombre: 'La Cocina', logo_url: 'https://x.mx/l.png' })).resolves.toMatchObject({ id: RID });
  });
});
