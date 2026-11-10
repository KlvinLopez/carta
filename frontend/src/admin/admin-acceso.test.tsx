import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AreaOperador from './Area';
import {
  SesionProvider,
  TOPE_CARGA_MS,
  useSesion,
  type ContextoSesion,
  type FabricaProveedor,
} from './acceso/Sesion';
import {
  CLAVE_CORREO,
  CLAVE_RESTAURANTE,
  guardarCorreoPendiente,
  leerCorreoPendiente,
  VIGENCIA_CORREO_MS,
} from './almacen';
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

/** Muestra la ruta actual del router para comprobar redirecciones y la URL limpia. */
function Ubicacion() {
  const l = useLocation();
  return <span data-testid="ubicacion">{`${l.pathname}${l.search}${l.hash}`}</span>;
}

function montar(ruta: string | { pathname: string; state: unknown }, fabrica: FabricaProveedor) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Ubicacion />
      <Routes>
        <Route path="/admin/*" element={<AreaOperador fabrica={fabrica} />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Saca el contexto de sesión a la prueba (sin pasar por las pantallas). */
function montarSesion(fabrica: FabricaProveedor) {
  const caja: { ctx: ContextoSesion | null } = { ctx: null };
  function Sonda() {
    const ctx = useSesion();
    useEffect(() => {
      caja.ctx = ctx;
    });
    return null;
  }
  render(
    <SesionProvider fabrica={fabrica}>
      <Sonda />
    </SesionProvider>,
  );
  return caja as { ctx: ContextoSesion };
}

/** Las listas de la pantalla Menú (T-1.12) salen vacías; sólo `/admin/restaurantes` trae datos. */
const deRuta = (url: URL | undefined, restaurantes: unknown[]) =>
  /\/(categorias|platillos)$/.test(url?.pathname ?? '') ? respuesta([]) : respuesta(restaurantes);

const NO_AUTENTICADO = { error: { codigo: 'NO_AUTENTICADO', mensaje: 'x', detalles: {}, request_id: null } };

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
  pedir = vi.fn(async (url?: URL) => deRuta(url, [REST_A]));
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
    guardarCorreoPendiente('ana@ejemplo.mx');
    const prov = crearProveedor({ enlace: true });
    const { fabrica, proveedor } = prov;
    proveedor.completarEnlace.mockImplementation(async () => prov.emitir('token-1'));
    montar('/admin/acceso', fabrica);
    await waitFor(() => expect(proveedor.completarEnlace).toHaveBeenCalled());
    expect(proveedor.completarEnlace.mock.calls[0]?.[1]).toBe('ana@ejemplo.mx');
    expect(await screen.findByRole('navigation', { name: 'Secciones del panel' })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(CLAVE_CORREO)).toBeNull();
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
      .mockImplementation(async (url?: URL) => deRuta(url, [REST_A]));
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
      .mockImplementationOnce(async (url?: URL) => deRuta(url, [REST_A]));
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
      .mockImplementation(async (url?: URL) => deRuta(url, [REST_A]));
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
    pedir.mockImplementation(async (url?: URL) => deRuta(url, restaurantes));
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
    // A4: la llamada a crear (el asistente llega en T-1.11) y la salida.
    expect(screen.getByRole('link', { name: 'Crear mi restaurante' })).toHaveAttribute('href', '/admin/alta');
    expect(screen.getByRole('button', { name: 'Salir' })).toBeInTheDocument();
  });

  it('con un solo restaurante el selector sólo muestra el nombre', async () => {
    await entrar();
    expect((await screen.findAllByText('La Cocina de Ana')).length).toBeGreaterThan(0);
    // Nada que elegir: texto, no un botón apagado y desvanecido.
    expect(screen.queryByRole('button', { name: 'La Cocina de Ana' })).toBeNull();
  });

  it('con varios restaurantes el selector abre una hoja y recuerda la elección', async () => {
    await entrar('/admin/menu', [REST_A, REST_B]);
    await userEvent.click(await screen.findByRole('button', { name: /La Cocina de Ana/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Bar Norte/ }));
    expect(await screen.findByRole('button', { name: /Bar Norte/ })).toBeInTheDocument();
    expect(window.localStorage.getItem(CLAVE_RESTAURANTE)).toBe(REST_B.id);
  });

  it('B7 (T-1.12): un restaurante recordado que el servidor no devuelve se descarta y se usa el primero', async () => {
    // El `rid` de localStorage es sólo una comodidad: la lista que manda el servidor decide (AC-15.2).
    window.localStorage.setItem(CLAVE_RESTAURANTE, '00000000-0000-4000-8000-0000000000ff');
    await entrar('/admin/menu', [REST_A, REST_B]);
    expect(await screen.findByRole('button', { name: /La Cocina de Ana/ })).toBeInTheDocument();
    await waitFor(() => expect(pedir.mock.calls.some(([url]) => /\/categorias$/.test((url as URL).pathname))).toBe(true));
    // Las peticiones del menú usan el restaurante que devolvió el servidor, nunca el id ajeno guardado.
    const rutas = pedir.mock.calls.map(([url]) => (url as URL).pathname);
    expect(rutas.some((r) => r.includes('0000000000ff'))).toBe(false);
    expect(rutas).toContain('/api/v1/admin/restaurantes/' + REST_A.id + '/categorias');
  });
});

describe('enlace por correo: casos de la revisión (A1, B2, B7)', () => {
  const VENCIDO = () =>
    new ErrorAcceso('enlace-invalido', 'Este enlace ya no sirve. Pide uno nuevo con tu correo.');

  it('A1: un enlace caducado vuelve al inicio con «Enviar enlace» y sin oobCode en la URL', async () => {
    guardarCorreoPendiente('ana@ejemplo.mx');
    const prov = crearProveedor({ enlace: true });
    const { fabrica, proveedor } = prov;
    proveedor.completarEnlace.mockRejectedValue(VENCIDO());
    montar('/admin/acceso?mode=signIn&oobCode=abc123&apiKey=k', fabrica);
    await iniciar(prov, null);

    expect(await screen.findByRole('alert')).toHaveTextContent('Este enlace ya no sirve');
    // No quedó atrapado en «Terminar de entrar»: puede pedir otro enlace o usar Google.
    expect(screen.queryByRole('button', { name: 'Terminar de entrar' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Entrar con Google' })).toBeEnabled();
    const enviar = screen.getByRole('button', { name: 'Enviar enlace' });
    expect(enviar).toBeEnabled();
    // La URL ya no lleva el código (recargar no repite el fallo) y el correo sigue a mano.
    expect(screen.getByTestId('ubicacion')).toHaveTextContent(/^\/admin\/acceso$/);
    expect(proveedor.completarEnlace.mock.calls[0]?.[0]).toContain('oobCode=abc123');
    expect(screen.getByLabelText('Tu correo')).toHaveValue('ana@ejemplo.mx');
    expect(window.sessionStorage.getItem(CLAVE_CORREO)).toBeNull();

    await userEvent.click(enviar);
    expect(proveedor.enviarEnlace).toHaveBeenCalledWith('ana@ejemplo.mx');
    expect(await screen.findByText(/Te enviamos un enlace a/)).toBeInTheDocument();
  });

  it('A1: sin correo guardado, un enlace caducado confirmado a mano también deja pedir otro', async () => {
    const prov = crearProveedor({ enlace: true });
    const { fabrica, proveedor } = prov;
    proveedor.completarEnlace.mockRejectedValue(VENCIDO());
    montar('/admin/acceso?oobCode=abc', fabrica);
    await iniciar(prov, null);
    await userEvent.type(await screen.findByLabelText('Tu correo'), 'ana@ejemplo.mx');
    await userEvent.click(screen.getByRole('button', { name: 'Terminar de entrar' }));
    expect(await screen.findByRole('button', { name: 'Enviar enlace' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Terminar de entrar' })).toBeNull();
  });

  it('un fallo que no es del enlace (sin red) deja reintentar con el mismo enlace', async () => {
    const prov = crearProveedor({ enlace: true });
    const { fabrica, proveedor } = prov;
    proveedor.completarEnlace
      .mockRejectedValueOnce(new ErrorAcceso('sin-red', 'No pudimos conectar.'))
      .mockImplementation(async () => prov.emitir('t'));
    montar('/admin/acceso?oobCode=abc', fabrica);
    await iniciar(prov, null);
    await userEvent.type(await screen.findByLabelText('Tu correo'), 'ana@ejemplo.mx');
    await userEvent.click(screen.getByRole('button', { name: 'Terminar de entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar');
    await userEvent.click(screen.getByRole('button', { name: 'Terminar de entrar' }));
    await screen.findByRole('navigation', { name: 'Secciones del panel' });
    expect(proveedor.completarEnlace.mock.calls[1]?.[0]).toBe(proveedor.completarEnlace.mock.calls[0]?.[0]);
  });

  it('B7: el oobCode (de un solo uso) sale de la barra apenas se lee, y se conserva para completar', async () => {
    guardarCorreoPendiente('ana@ejemplo.mx');
    const prov = crearProveedor({ enlace: true });
    const { fabrica, proveedor } = prov;
    proveedor.completarEnlace.mockImplementation(async () => prov.emitir('t'));
    montar('/admin/acceso?mode=signIn&oobCode=unico', fabrica);
    await waitFor(() => expect(proveedor.completarEnlace).toHaveBeenCalled());
    expect(proveedor.completarEnlace.mock.calls[0]?.[0]).toContain('oobCode=unico');
    await screen.findByRole('navigation', { name: 'Secciones del panel' });
    expect(screen.getByTestId('ubicacion').textContent).not.toContain('oobCode');
  });

  it('B2: el correo guardado NO se precarga si la URL no trae el enlace', async () => {
    guardarCorreoPendiente('anterior@ejemplo.mx');
    const prov = crearProveedor();
    montar('/admin/acceso', prov.fabrica);
    await iniciar(prov, null);
    expect(await screen.findByLabelText('Tu correo')).toHaveValue('');
  });

  it('B2: el correo pendiente caduca a los 15 minutos y vive en sessionStorage', () => {
    const t0 = 1_000_000;
    guardarCorreoPendiente('ana@ejemplo.mx', t0);
    expect(window.localStorage.getItem(CLAVE_CORREO)).toBeNull();
    expect(leerCorreoPendiente(t0 + VIGENCIA_CORREO_MS - 1)).toBe('ana@ejemplo.mx');
    expect(leerCorreoPendiente(t0 + VIGENCIA_CORREO_MS + 1)).toBe('');
    expect(window.sessionStorage.getItem(CLAVE_CORREO)).toBeNull(); // caducado: se borra
    window.sessionStorage.setItem(CLAVE_CORREO, '{no es json');
    expect(leerCorreoPendiente()).toBe('');
  });
});

describe('SDK que no carga o que se cuelga (A2, B8)', () => {
  it('A2: si el trozo del SDK no llega, lo dice, bloquea el acceso y «Reintentar» vuelve a cargarlo', async () => {
    const prov = crearProveedor();
    let intentos = 0;
    const fabrica: FabricaProveedor = vi.fn(async () => {
      intentos += 1;
      if (intentos === 1) throw new Error('Failed to fetch dynamically imported module');
      return prov.proveedor;
    });
    montar('/admin/acceso', fabrica);
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar');
    expect(screen.queryByText(/No pudimos darte acceso/)).toBeNull(); // ya no miente
    expect(screen.getByRole('button', { name: 'Entrar con Google' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeDisabled();
    expect(screen.getByLabelText('Tu correo')).toBeDisabled();
    expect(screen.queryByText(/Te enviamos un enlace/)).toBeNull();
    expect(window.sessionStorage.getItem(CLAVE_CORREO)).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(prov.proveedor.suscribir).toHaveBeenCalled());
    prov.emitir(null);
    expect(await screen.findByRole('button', { name: 'Entrar con Google' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(fabrica).toHaveBeenCalledTimes(2);
  });

  it('A2: sin proveedor, enviarEnlace / completarEnlace lanzan sin-red y Google lo informa; nada se guarda', async () => {
    const caja = montarSesion(async () => {
      throw new Error('chunk');
    });
    await waitFor(() => expect(caja.ctx?.fallaCarga).toBe(true));
    await expect(caja.ctx.enviarEnlace('ana@ejemplo.mx')).rejects.toMatchObject({ codigo: 'sin-red' });
    await expect(caja.ctx.completarEnlace('u', 'ana@ejemplo.mx')).rejects.toMatchObject({ codigo: 'sin-red' });
    await act(() => caja.ctx.entrarConGoogle());
    expect(caja.ctx.error).toMatchObject({ codigo: 'sin-red' });
    expect(window.sessionStorage.getItem(CLAVE_CORREO)).toBeNull();
    expect(window.localStorage.getItem(CLAVE_CORREO)).toBeNull();
  });

  describe('con reloj simulado', () => {
    afterEach(() => vi.useRealTimers());

    it('B8: un getRedirectResult colgado no deja «Cargando» eterno: a los 15 s hay mensaje y reintento', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const prov = crearProveedor(); // se suscribe pero nunca emite
      montar('/admin/acceso', prov.fabrica);
      await act(async () => {});
      expect(prov.proveedor.suscribir).toHaveBeenCalled();
      expect(screen.getByRole('status')).toHaveTextContent('Preparando tu panel…');
      await act(async () => {
        vi.advanceTimersByTime(TOPE_CARGA_MS - 1);
      });
      expect(screen.getByRole('status')).toBeInTheDocument();
      await act(async () => {
        vi.advanceTimersByTime(2);
      });
      expect(screen.getByRole('alert')).toHaveTextContent('No pudimos conectar');
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
      // Si Firebase contesta tarde, el acceso se recupera solo.
      await act(async () => prov.emitir(null));
      expect(screen.getByRole('button', { name: 'Entrar con Google' })).toBeEnabled();
      expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
    });
  });

  it('B8: «Entrar con Google» atascado en «entrando» se reinicia al volver con «atrás» (pageshow)', async () => {
    const prov = crearProveedor();
    prov.proveedor.entrarConGoogle.mockImplementation(() => new Promise(() => {})); // navega fuera
    montar('/admin/acceso', prov.fabrica);
    await iniciar(prov, null);
    const google = await screen.findByRole('button', { name: 'Entrar con Google' });
    await userEvent.click(google);
    await waitFor(() => expect(google).toBeDisabled());
    expect(google).toHaveAttribute('aria-busy', 'true');
    // pageshow sin persisted (carga normal): no toca nada
    act(() => {
      window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: false }));
    });
    expect(google).toBeDisabled();
    act(() => {
      window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
    });
    await waitFor(() => expect(google).toBeEnabled());
  });

  it('B10: «Enviar enlace» tiene fondo propio (variante secundaria), también deshabilitado', async () => {
    const prov = crearProveedor();
    montar('/admin/acceso', prov.fabrica);
    await iniciar(prov, null);
    expect(await screen.findByRole('button', { name: 'Enviar enlace' })).toHaveClass('secundario');
  });
});

describe('redirecciones y cierre de sesión (B3, B5, B8, B9)', () => {
  it('B9/B8: sin sesión recuerda adónde iba (ruta, query y hash) y vuelve ahí al entrar', async () => {
    const prov = crearProveedor();
    montar('/admin/mesas?mesa=7#qr', prov.fabrica);
    await iniciar(prov, null);
    expect(await screen.findByRole('button', { name: 'Entrar con Google' })).toBeInTheDocument();
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('/admin/acceso');
    act(() => prov.emitir('t'));
    await screen.findByRole('navigation', { name: 'Secciones del panel' });
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('/admin/mesas?mesa=7#qr');
  });

  it.each(['//evil.example/robo', 'https://evil.example', '/m/ABC123', 'javascript:alert(1)'])(
    'B9: un state.desde ajeno (%s) se ignora y se entra al Menú',
    async (desde) => {
      const prov = crearProveedor();
      montar({ pathname: '/admin/acceso', state: { desde } }, prov.fabrica);
      await iniciar(prov, 't');
      await screen.findByRole('navigation', { name: 'Secciones del panel' });
      expect(screen.getByTestId('ubicacion')).toHaveTextContent('/admin/menu');
    },
  );

  it('B9: salir() borra el token: la petición siguiente ya no lleva Authorization', async () => {
    const prov = crearProveedor();
    const caja = montarSesion(prov.fabrica);
    await waitFor(() => expect(prov.proveedor.suscribir).toHaveBeenCalled());
    act(() => prov.emitir('token-secreto'));
    await caja.ctx.api.obtener('/admin/restaurantes');
    expect(((pedir.mock.calls[0] as [URL, RequestInit])[1].headers as Record<string, string>).Authorization).toBe(
      'Bearer token-secreto',
    );
    await act(() => caja.ctx.salir());
    await caja.ctx.api.obtener('/admin/restaurantes');
    expect(
      ((pedir.mock.calls[1] as [URL, RequestInit])[1].headers as Record<string, string>).Authorization,
    ).toBeUndefined();
    expect(prov.proveedor.salir).toHaveBeenCalledOnce();
  });

  it('B2/B3: «Salir» borra el correo pendiente y el restaurante elegido, y vuelve al acceso', async () => {
    const prov = crearProveedor();
    pedir.mockImplementation(async (url?: URL) => deRuta(url, [REST_A, REST_B]));
    montar('/admin/ajustes', prov.fabrica);
    await iniciar(prov, 't');
    await screen.findByRole('heading', { name: 'Ajustes' });
    window.localStorage.setItem(CLAVE_RESTAURANTE, REST_B.id);
    guardarCorreoPendiente('ana@ejemplo.mx');
    await userEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(await screen.findByRole('button', { name: 'Entrar con Google' })).toBeInTheDocument();
    expect(window.localStorage.getItem(CLAVE_RESTAURANTE)).toBeNull();
    expect(window.sessionStorage.getItem(CLAVE_CORREO)).toBeNull();
    expect(prov.proveedor.salir).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Tu sesión terminó/)).toBeNull();
  });

  it('A4: Ajustes muestra con qué cuenta entraste', async () => {
    const prov = crearProveedor();
    montar('/admin/ajustes', prov.fabrica);
    await iniciar(prov, 't');
    expect(await screen.findByText(/Entraste como ana@ejemplo.mx/)).toBeInTheDocument();
  });

  it('B5: un 401 en vuelo que llega después de cerrar sesión por voluntad no pone «Tu sesión terminó»', async () => {
    const prov = crearProveedor();
    const caja = montarSesion(prov.fabrica);
    await waitFor(() => expect(prov.proveedor.suscribir).toHaveBeenCalled());
    act(() => prov.emitir('t'));
    let soltar: (r: Response) => void = () => {};
    pedir.mockImplementation(() => new Promise<Response>((r) => (soltar = r)));
    const enVuelo = caja.ctx.api.obtener('/admin/x').catch((e: unknown) => e);
    await act(() => caja.ctx.salir());
    pedir.mockImplementation(async () => respuesta(NO_AUTENTICADO, 401));
    await act(async () => {
      soltar(respuesta(NO_AUTENTICADO, 401));
      await enVuelo;
    });
    expect(caja.ctx.expirada).toBe(false);
    expect(prov.proveedor.salir).toHaveBeenCalledOnce();
  });

  it('B5: «Cancelaste el acceso» no reaparece después de entrar y salir', async () => {
    const prov = crearProveedor();
    const caja = montarSesion(prov.fabrica);
    await waitFor(() => expect(prov.proveedor.suscribir).toHaveBeenCalled());
    act(() => prov.fallar(new ErrorAcceso('cancelado', 'x')));
    expect(caja.ctx.error).toMatchObject({ codigo: 'cancelado' });
    act(() => prov.emitir('t'));
    expect(caja.ctx.error).toBeNull();
    await act(() => caja.ctx.salir());
    expect(caja.ctx.error).toBeNull();
    expect(caja.ctx.expirada).toBe(false);
  });

  it('B5: «expirada» se apaga al entrar de nuevo', async () => {
    const prov = crearProveedor();
    pedir.mockImplementation(async () => respuesta(NO_AUTENTICADO, 401));
    montar('/admin/menu', prov.fabrica);
    await iniciar(prov, 't');
    expect(await screen.findByText(/Tu sesión terminó/)).toBeInTheDocument();
    pedir.mockImplementation(async (url?: URL) => deRuta(url, [REST_A]));
    act(() => prov.emitir('t2'));
    await screen.findByRole('navigation', { name: 'Secciones del panel' });
    expect(screen.queryByText(/Tu sesión terminó/)).toBeNull();
  });
});

describe('red y errores de la API en el panel (A3, A4, B9)', () => {
  it('A3: si renovar falla por red, la sesión se conserva (sin «Tu sesión terminó») y se puede reintentar', async () => {
    const prov = crearProveedor();
    prov.proveedor.renovar.mockRejectedValue(new ErrorAcceso('sin-red', 'sin red'));
    pedir.mockImplementationOnce(async () => respuesta(NO_AUTENTICADO, 401));
    pedir.mockImplementation(async (url?: URL) => deRuta(url, [REST_A]));
    montar('/admin/menu', prov.fabrica);
    await iniciar(prov, 't');
    expect(await screen.findByText(/No pudimos conectar con Carta/)).toBeInTheDocument();
    expect(prov.proveedor.salir).not.toHaveBeenCalled();
    expect(screen.queryByText(/Tu sesión terminó/)).toBeNull();
    // Con red otra vez, Reintentar funciona con la misma sesión.
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Menú' })).toBeInTheDocument();
  });

  it('A3: si signOut falla al expirar, no hay rechazo sin manejar y se vuelve al acceso', async () => {
    const prov = crearProveedor();
    prov.proveedor.salir.mockRejectedValue(new Error('IndexedDB bloqueado'));
    pedir.mockImplementation(async () => respuesta(NO_AUTENTICADO, 401));
    const sinManejar = vi.fn();
    process.on('unhandledRejection', sinManejar);
    montar('/admin/menu', prov.fabrica);
    await iniciar(prov, 't');
    expect(await screen.findByText(/Tu sesión terminó/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar con Google' })).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 10));
    process.off('unhandledRejection', sinManejar);
    expect(sinManejar).not.toHaveBeenCalled();
  });

  it('A3: dos peticiones del panel con 401 a la vez renuevan el token una sola vez', async () => {
    const prov = crearProveedor();
    const caja = montarSesion(prov.fabrica);
    await waitFor(() => expect(prov.proveedor.suscribir).toHaveBeenCalled());
    act(() => prov.emitir('viejo'));
    pedir.mockImplementation(async (_u: URL, init: RequestInit) =>
      (init.headers as Record<string, string>).Authorization === 'Bearer viejo'
        ? respuesta(NO_AUTENTICADO, 401)
        : respuesta([REST_A]),
    );
    await Promise.all([caja.ctx.api.obtener('/admin/a'), caja.ctx.api.obtener('/admin/b')]);
    expect(prov.proveedor.renovar).toHaveBeenCalledOnce();
  });

  it('A4: con la API caída hay «Reintentar» y «Salir»', async () => {
    const prov = crearProveedor();
    pedir.mockImplementation(async () =>
      respuesta({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Algo falló de nuestro lado.', detalles: {}, request_id: null } }, 500),
    );
    montar('/admin/menu', prov.fabrica);
    await iniciar(prov, 't');
    expect(await screen.findByText('Algo falló de nuestro lado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(await screen.findByRole('button', { name: 'Entrar con Google' })).toBeInTheDocument();
    expect(prov.proveedor.salir).toHaveBeenCalledOnce();
  });

  it.each([
    [403, 'NO_AUTORIZADO', 'No tienes acceso a este panel.'],
    [404, 'NO_ENCONTRADO', 'No encontramos tus restaurantes.'],
    [500, 'ERROR_INTERNO', 'Algo falló de nuestro lado.'],
  ])('B9: un %i al cargar restaurantes muestra su mensaje, con Salir, sin cerrar la sesión', async (estado, codigo, mensaje) => {
    const prov = crearProveedor();
    pedir.mockImplementation(async () => respuesta({ error: { codigo, mensaje, detalles: {}, request_id: null } }, estado));
    montar('/admin/menu', prov.fabrica);
    await iniciar(prov, 't');
    expect(await screen.findByText(mensaje)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salir' })).toBeInTheDocument();
    expect(screen.queryByText(/Tu sesión terminó/)).toBeNull();
    expect(prov.proveedor.salir).not.toHaveBeenCalled();
    expect(prov.proveedor.renovar).not.toHaveBeenCalled(); // sólo el 401 renueva
  });

  it('B9: un 401 persistente al cargar restaurantes sí cierra y avisa', async () => {
    const prov = crearProveedor();
    pedir.mockImplementation(async () => respuesta(NO_AUTENTICADO, 401));
    montar('/admin/menu', prov.fabrica);
    await iniciar(prov, 't');
    expect(await screen.findByText(/Tu sesión terminó/)).toBeInTheDocument();
    expect(prov.proveedor.renovar).toHaveBeenCalledOnce();
  });
});

describe('copy y estados del panel (B10)', () => {
  it('el 404 de /admin/noexiste habla con el operador, no con el comensal', async () => {
    const prov = crearProveedor();
    montar('/admin/noexiste', prov.fabrica);
    expect(await screen.findByRole('heading', { name: 'No encontramos esta página' })).toBeInTheDocument();
    expect(screen.queryByText(/código de mesa/)).toBeNull();
    const enlace = screen.getByRole('link', { name: 'Ir a mi panel' });
    expect(enlace).toHaveAttribute('href', '/admin/menu');
  });

  it('mientras llega la sesión dice «Preparando tu panel…», no «Preparando la mesa…»', async () => {
    const prov = crearProveedor();
    montar('/admin/menu', prov.fabrica);
    expect(await screen.findByRole('status')).toHaveTextContent('Preparando tu panel…');
    expect(screen.queryByText(/Preparando la mesa/)).toBeNull();
  });

  it('un nombre de 200 caracteres cabe en el selector con elipsis (el texto va en su propio span)', async () => {
    const largo = { ...REST_A, nombre: 'Restaurante '.repeat(17).slice(0, 200) };
    const prov = crearProveedor();
    pedir.mockImplementation(async (url?: URL) => deRuta(url, [largo, REST_B]));
    montar('/admin/menu', prov.fabrica);
    await iniciar(prov, 't');
    const boton = await screen.findByRole('button', { name: new RegExp(largo.nombre.slice(0, 20)) });
    expect(boton.querySelector('.nombre')).toHaveTextContent(largo.nombre);
  });
});
