import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AreaOperador from './Area';
import type { FabricaProveedor } from './acceso/Sesion';
import {
  ErrorAcceso,
  leerConfiguracion,
  type AlCambiarSesion,
  type ProveedorAcceso,
} from './acceso/proveedor';

const REST_A = {
  id: '00000000-0000-4000-8000-0000000000a1',
  nombre: 'La Cocina de Ana',
  slug: 'la-cocina',
  tema: 'vino',
  activo: true,
  creado_en: '2026-11-06T12:00:00Z',
};
const REST_B = { ...REST_A, id: '00000000-0000-4000-8000-0000000000b2', nombre: 'Bar Norte' };
const USUARIO = { correo: 'ana@ejemplo.mx', nombre: 'Ana' };

/** El SDK simulado: el proveedor real nunca se carga en las pruebas. */
function crearProveedor(opciones: { enlace?: boolean } = {}) {
  let alCambiar: AlCambiarSesion = () => {};
  let alErrorProveedor: (e: ErrorAcceso) => void = () => {};
  const p = {
    entrarConGoogle: vi.fn(async () => {}),
    enviarEnlace: vi.fn(async (_correo: string) => {}),
    esEnlace: vi.fn(async () => opciones.enlace ?? false),
    completarEnlace: vi.fn(async (_url: string, _correo: string) => {}),
    renovar: vi.fn(async () => 'token-renovado' as string | null),
    salir: vi.fn(async () => alCambiar(null, null)),
    suscribir: vi.fn((cambio: AlCambiarSesion, error: (e: ErrorAcceso) => void) => {
      alCambiar = cambio;
      alErrorProveedor = error;
      return () => {};
    }),
  } satisfies ProveedorAcceso;
  return {
    proveedor: p,
    fabrica: (async () => p) as FabricaProveedor,
    emitir: (token: string | null) => alCambiar(token ? USUARIO : null, token),
    fallar: (e: ErrorAcceso) => alErrorProveedor(e),
  };
}

function respuesta(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  });
}

function montar(ruta: string, fabrica: FabricaProveedor) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/admin/*" element={<AreaOperador fabrica={fabrica} />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Espera a que el proveedor se suscriba y le entrega el primer estado de sesión. */
async function iniciar(
  prov: { proveedor: { suscribir: ReturnType<typeof vi.fn> }; emitir: (t: string | null) => void },
  token: string | null,
) {
  await waitFor(() => expect(prov.proveedor.suscribir).toHaveBeenCalled());
  prov.emitir(token);
}

let pedir: ReturnType<typeof vi.fn>;
beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  pedir = vi.fn(async () => respuesta([REST_A]));
  vi.stubGlobal('fetch', pedir);
});
afterEach(() => vi.unstubAllGlobals());

describe('acceso del operador (US-15)', () => {
  it('AC-15.1: sin sesión, una ruta del panel lleva al acceso y no llama a la API', async () => {
    const prov = crearProveedor();
    const { fabrica } = prov;
    montar('/admin/mesas', fabrica);
    await iniciar(prov, null);
    expect(await screen.findByRole('button', { name: 'Entrar con Google' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tu restaurante, listo en minutos' })).toBeInTheDocument();
    expect(pedir).not.toHaveBeenCalled();
  });

  it('Google usa redirección (no popup) a través del proveedor', async () => {
    const prov = crearProveedor();
    const { fabrica, proveedor } = prov;
    montar('/admin/acceso', fabrica);
    await iniciar(prov, null);
    await screen.findByRole('button', { name: 'Entrar con Google' });
    await userEvent.click(screen.getByRole('button', { name: 'Entrar con Google' }));
    expect(proveedor.entrarConGoogle).toHaveBeenCalledOnce();
  });

  it('enlace por correo: lo envía, confirma y recuerda el correo sólo hasta usarlo', async () => {
    const prov = crearProveedor();
    const { fabrica, proveedor } = prov;
    montar('/admin/acceso', fabrica);
    await iniciar(prov, null);
    await screen.findByLabelText('Tu correo');
    await userEvent.type(screen.getByLabelText('Tu correo'), 'ana@ejemplo.mx');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));
    expect(proveedor.enviarEnlace).toHaveBeenCalledWith('ana@ejemplo.mx');
    expect(await screen.findByRole('status')).toHaveTextContent('ana@ejemplo.mx');
  });

  it('un fallo al enviar el enlace se explica en el lenguaje de la marca', async () => {
    const prov = crearProveedor();
    const { fabrica, proveedor } = prov;
    proveedor.enviarEnlace.mockRejectedValueOnce(
      new ErrorAcceso('sin-red', 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.'),
    );
    montar('/admin/acceso', fabrica);
    await iniciar(prov, null);
    await screen.findByLabelText('Tu correo');
    await userEvent.type(screen.getByLabelText('Tu correo'), 'ana@ejemplo.mx');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar');
  });

  it('al volver del enlace con el correo guardado completa el acceso y entra al panel', async () => {
    window.localStorage.setItem('carta.acceso.correo', 'ana@ejemplo.mx');
    const prov = crearProveedor({ enlace: true });
    const { fabrica, proveedor } = prov;
    proveedor.completarEnlace.mockImplementation(async () => prov.emitir('token-1'));
    montar('/admin/acceso', fabrica);
    await waitFor(() => expect(proveedor.completarEnlace).toHaveBeenCalled());
    expect(proveedor.completarEnlace.mock.calls[0]?.[1]).toBe('ana@ejemplo.mx');
    expect(await screen.findByRole('navigation', { name: 'Secciones del panel' })).toBeInTheDocument();
    expect(window.localStorage.getItem('carta.acceso.correo')).toBeNull();
  });

  it('el enlace abierto en otro dispositivo pide confirmar el correo', async () => {
    const prov = crearProveedor({ enlace: true });
    const { fabrica, proveedor } = prov;
    proveedor.completarEnlace.mockImplementation(async () => prov.emitir('token-1'));
    montar('/admin/acceso', fabrica);
    await iniciar(prov, null);
    const campo = await screen.findByLabelText('Tu correo');
    expect(proveedor.completarEnlace).not.toHaveBeenCalled();
    await userEvent.type(campo, 'ana@ejemplo.mx');
    await userEvent.click(screen.getByRole('button', { name: 'Terminar de entrar' }));
    expect(proveedor.completarEnlace).toHaveBeenCalledOnce();
  });

  it('un enlace vencido muestra el motivo y deja volver a pedir otro', async () => {
    window.localStorage.setItem('carta.acceso.correo', 'ana@ejemplo.mx');
    const prov = crearProveedor({ enlace: true });
    const { fabrica, proveedor } = prov;
    proveedor.completarEnlace.mockRejectedValue(
      new ErrorAcceso('enlace-invalido', 'Este enlace ya no sirve. Pide uno nuevo con tu correo.'),
    );
    montar('/admin/acceso', fabrica);
    await iniciar(prov, null);
    expect(await screen.findByRole('alert')).toHaveTextContent('Este enlace ya no sirve');
  });

  it('un error del proveedor (p. ej. al volver de Google) se muestra sin dejar la pantalla cargando', async () => {
    const prov = crearProveedor();
    const { fabrica, fallar } = prov;
    montar('/admin/acceso', fabrica);
    await iniciar(prov, null);
    await waitFor(() => expect(prov.proveedor.suscribir).toHaveBeenCalled());
    fallar(new ErrorAcceso('cuenta-deshabilitada', 'x'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta cuenta está deshabilitada');
  });

  it('sin variables VITE_FIREBASE_* no inventa configuración: lo dice y bloquea los botones', async () => {
    montar('/admin/menu', () => Promise.reject(new ErrorAcceso('sin-configurar', 'x')));
    expect(await screen.findByRole('alert')).toHaveTextContent('todavía no está configurado');
    expect(screen.getByRole('button', { name: 'Entrar con Google' })).toBeDisabled();
    expect(leerConfiguracion({})).toBeNull();
    expect(
      leerConfiguracion({
        VITE_FIREBASE_API_KEY: 'k',
        VITE_FIREBASE_AUTH_DOMAIN: 'd',
        VITE_FIREBASE_PROJECT_ID: 'p',
        VITE_FIREBASE_APP_ID: 'a',
      }),
    ).toEqual({ apiKey: 'k', authDomain: 'd', projectId: 'p', appId: 'a' });
  });
});

describe('token y cliente HTTP', () => {
  it('manda Authorization: Bearer y el token jamás toca localStorage ni sessionStorage', async () => {
    const { fabrica, emitir } = crearProveedor();
    montar('/admin/menu', fabrica);
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    emitir('token-secreto-1');
    await screen.findByRole('navigation', { name: 'Secciones del panel' });
    const [url, init] = pedir.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe('/api/v1/admin/restaurantes');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-secreto-1');
    for (const almacen of [window.localStorage, window.sessionStorage]) {
      expect(JSON.stringify({ ...almacen })).not.toContain('token-secreto-1');
    }
  });

  it('onIdTokenChanged: la siguiente petición usa el token renovado', async () => {
    const { fabrica, emitir } = crearProveedor();
    pedir
      .mockImplementationOnce(async () => respuesta({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Falló.', detalles: {}, request_id: null } }, 500))
      .mockImplementation(async () => respuesta([REST_A]));
    montar('/admin/menu', fabrica);
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    emitir('token-viejo');
    await screen.findByText('Falló.');
    emitir('token-nuevo'); // Firebase renueva el ID token cada hora
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByRole('heading', { name: 'Menú' });
    const [, init] = pedir.mock.calls.at(-1) as [URL, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-nuevo');
  });

  it('401: renueva el token una vez y reintenta con el nuevo', async () => {
    const { fabrica, proveedor, emitir } = crearProveedor();
    pedir
      .mockImplementationOnce(async () => respuesta({ error: { codigo: 'NO_AUTENTICADO', mensaje: 'x', detalles: {}, request_id: null } }, 401))
      .mockImplementationOnce(async () => respuesta([REST_A]));
    montar('/admin/menu', fabrica);
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    emitir('token-vencido');
    await screen.findByRole('navigation', { name: 'Secciones del panel' });
    expect(proveedor.renovar).toHaveBeenCalledOnce();
    const segunda = pedir.mock.calls[1] as [URL, RequestInit];
    expect((segunda[1].headers as Record<string, string>).Authorization).toBe('Bearer token-renovado');
  });

  it('401 que persiste: cierra la sesión y vuelve al acceso con el aviso', async () => {
    const { fabrica, proveedor, emitir } = crearProveedor();
    pedir.mockImplementation(async () =>
      respuesta({ error: { codigo: 'NO_AUTENTICADO', mensaje: 'x', detalles: {}, request_id: null } }, 401),
    );
    montar('/admin/menu', fabrica);
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    emitir('token-vencido');
    expect(await screen.findByText('Tu sesión terminó. Vuelve a entrar para continuar.')).toBeInTheDocument();
    expect(proveedor.salir).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Entrar con Google' })).toBeInTheDocument();
  });

  it('muestra el mensaje de la envoltura de error y permite reintentar', async () => {
    const { fabrica, emitir } = crearProveedor();
    pedir
      .mockImplementationOnce(async () =>
        respuesta({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Algo falló de nuestro lado.', detalles: {}, request_id: 'r1' } }, 500),
      )
      .mockImplementation(async () => respuesta([REST_A]));
    montar('/admin/menu', fabrica);
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    emitir('t');
    expect(await screen.findByText('Algo falló de nuestro lado.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Menú' })).toBeInTheDocument();
  });

  it('sin red muestra un mensaje de la marca, no el error del navegador', async () => {
    const { fabrica, emitir } = crearProveedor();
    pedir.mockRejectedValue(new TypeError('Failed to fetch'));
    montar('/admin/menu', fabrica);
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    emitir('t');
    expect(await screen.findByText(/No pudimos conectar con Carta/)).toBeInTheDocument();
  });
});

describe('armazón del panel', () => {
  async function entrar(ruta = '/admin/menu', restaurantes: unknown[] = [REST_A]) {
    const prov = crearProveedor();
    pedir.mockImplementation(async () => respuesta(restaurantes));
    montar(ruta, prov.fabrica);
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    prov.emitir('token');
    return prov;
  }

  it('navegación con las cinco secciones, y /admin lleva al Menú', async () => {
    await entrar('/admin');
    const nav = await screen.findByRole('navigation', { name: 'Secciones del panel' });
    const enlaces = within(nav).getAllByRole('link');
    expect(enlaces.map((a) => a.textContent)).toEqual(['Menú', 'Mesas', 'Personal', 'Pedidos', 'Ajustes']);
    expect(enlaces[0]).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByRole('heading', { name: 'Menú' })).toBeInTheDocument();
  });

  it.each([
    ['Mesas', 'Aún no hay mesas'],
    ['Personal', 'Aún no hay personal'],
    ['Pedidos', 'Todavía no hay pedidos'],
    ['Ajustes', 'Ajustes del restaurante'],
    ['Menú', 'Tu carta aparecerá aquí'],
  ])('%s muestra su estado vacío', async (seccion, vacio) => {
    await entrar();
    const nav = await screen.findByRole('navigation', { name: 'Secciones del panel' });
    await userEvent.click(within(nav).getByRole('link', { name: seccion }));
    expect(await screen.findByRole('heading', { name: vacio })).toBeInTheDocument();
  });

  it('un operador sin restaurantes ve un estado vacío, no un panel roto', async () => {
    await entrar('/admin/menu', []);
    expect(await screen.findByRole('heading', { name: 'Todavía no tienes un restaurante' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Menú' })).toBeVisible();
  });

  it('con un solo restaurante el selector sólo muestra el nombre', async () => {
    await entrar();
    expect(await screen.findByRole('button', { name: 'La Cocina de Ana' })).toBeDisabled();
  });

  it('con varios restaurantes el selector abre una hoja y recuerda la elección', async () => {
    await entrar('/admin/menu', [REST_A, REST_B]);
    await userEvent.click(await screen.findByRole('button', { name: /La Cocina de Ana/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Bar Norte/ }));
    expect(await screen.findByRole('button', { name: /Bar Norte/ })).toBeInTheDocument();
    expect(window.localStorage.getItem('carta.admin.restaurante')).toBe(REST_B.id);
  });
});
