import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CODIGO_SEMILLA, COLORES, crearServicioEntradaSimulado, errorSimulado } from '../../mocks/servicioEntradaSimulado';
import { PantallaEntrada } from './PantallaEntrada';
import type { EntrarRespuesta, MiembroDeSesion, ServicioEntrada, SesionEstado } from './servicio';
import { llamadasA } from './utilesPrueba';

const avanzar = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
const titulo = (n: number) => screen.findByRole('heading', { name: `Estás en la mesa ${n}` });
const abrirHoja = async (u: ReturnType<typeof userEvent.setup>) => {
  await u.click(screen.getByRole('button', { name: /Cambiar mi nombre/ }));
  return screen.getByRole('textbox', { name: 'Tu nombre' });
};

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Servicio guionado: cada llamada queda pendiente hasta que la prueba la resuelve. */
function servicioGuion(mesa = 7) {
  const yo = { id: 'm-1', alias: 'Viejo', color_avatar: '#4F1728', rol: 'host' as const };
  const sesion = { id: 's-1', estado: 'activa' as const, mesa: { numero: mesa, capacidad: 4 }, restaurante: { id: 'r', nombre: 'La Ceiba', slug: 'la-ceiba', logo_url: null, tema: 'vino' } };
  const estados: ((e: SesionEstado) => void)[] = [];
  const llamadas = { entrar: 0, estado: 0, alias: 0 };
  const cuerpo = (alias: string, miembros: MiembroDeSesion[] = []): SesionEstado => ({
    id: sesion.id,
    estado: 'activa',
    mesa: sesion.mesa,
    yo: yo.id,
    listos: 0,
    total_miembros: 1,
    miembros: miembros.length ? miembros : [{ ...yo, alias, estado: 'armando' }],
  });
  const servicio: ServicioEntrada = {
    async entrar() {
      llamadas.entrar += 1;
      return { sesion, miembro: yo };
    },
    estado() {
      llamadas.estado += 1;
      return new Promise((resolver) => estados.push((e) => resolver({ sinCambios: false, estado: e, etag: `"${llamadas.estado}"` })));
    },
    async cambiarAlias(alias) {
      llamadas.alias += 1;
      return { ...yo, alias };
    },
  };
  return { servicio, estados, llamadas, cuerpo, yo };
}

describe('reentrada tras 401: una sola vez', () => {
  it('dos vencimientos separados por un sondeo bueno se recuperan los dos, sin la pantalla de cookies', async () => {
    const sim = crearServicioEntradaSimulado();
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    await titulo(7);
    await avanzar(100);
    sim.expirarToken();
    await avanzar(3100);
    expect(await screen.findByText('Comensal 2')).toBeInTheDocument();
    await avanzar(3100); // sondeo bueno: reinicia el contador
    sim.expirarToken();
    await avanzar(3100);
    expect(await screen.findByText('Comensal 3')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No pudimos guardar tu lugar' })).toBeNull();
    expect(llamadasA(sim, 'entrar')).toHaveLength(3);
  });

  it('con el 401 de vuelta enseguida: error y nada más sin que la persona toque', async () => {
    const sim = crearServicioEntradaSimulado({ errores: { estado: errorSimulado(401, 'TOKEN_INVALIDO') } });
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    await titulo(7);
    await avanzar(5000);
    expect(await screen.findByRole('heading', { name: 'No pudimos guardar tu lugar' })).toBeInTheDocument();
    await avanzar(60_000);
    expect(llamadasA(sim, 'entrar')).toHaveLength(2);
  });
});

describe('entrada que cambia de mesa (carrera)', () => {
  function dosMesas() {
    const cancelada: Record<string, boolean> = {};
    const soltar: Record<string, () => void> = {};
    const respuesta = (codigo: string, numero: number): EntrarRespuesta => ({
      sesion: { id: `s-${codigo}`, estado: 'activa', mesa: { numero, capacidad: 4 }, restaurante: { id: 'r', nombre: 'La Ceiba', slug: 'la-ceiba', logo_url: null, tema: 'vino' } },
      miembro: { id: `m-${codigo}`, alias: `Yo ${codigo}`, color_avatar: '#4F1728', rol: 'host' },
    });
    const servicio: ServicioEntrada = {
      entrar(codigo, signal) {
        return new Promise((resolver, rechazar) => {
          soltar[codigo] = () => resolver(respuesta(codigo, codigo === 'MESA1' ? 1 : 3));
          signal?.addEventListener('abort', () => {
            cancelada[codigo] = true;
            rechazar(new DOMException('abort', 'AbortError'));
          });
        });
      },
      async estado() {
        return { sinCambios: true };
      },
      async cambiarAlias(alias) {
        return { id: 'm', alias, color_avatar: '#4F1728', rol: 'host' };
      },
    };
    return { servicio, cancelada, soltar };
  }

  it('al pasar de la mesa 1 (lenta) a la 3 (rápida) cancela la primera y se queda con la tercera', async () => {
    const m = dosMesas();
    const vista = render(<PantallaEntrada codigo="MESA1" servicio={m.servicio} />);
    vista.rerender(<PantallaEntrada codigo="MESA3" servicio={m.servicio} />);
    await avanzar(5);
    expect(m.cancelada.MESA1).toBe(true);
    await act(async () => m.soltar.MESA3!());
    expect(await titulo(3)).toBeInTheDocument();
    await act(async () => m.soltar.MESA1?.()); // llega tarde: nadie la escucha
    expect(screen.getByRole('heading', { name: 'Estás en la mesa 3' })).toBeInTheDocument();
    expect(screen.getByText('Yo MESA3')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('carta:invitado:v1')!).sesion).toBe('s-MESA3');
  });

  it('si la pantalla se desmonta (otra mesa con `key`), la entrada pendiente también se cancela', async () => {
    const m = dosMesas();
    const vista = render(<PantallaEntrada key="MESA1" codigo="MESA1" servicio={m.servicio} />);
    vista.rerender(<PantallaEntrada key="MESA3" codigo="MESA3" servicio={m.servicio} />);
    await avanzar(5);
    expect(m.cancelada.MESA1).toBe(true);
    expect(m.cancelada.MESA3).toBeUndefined();
  });

  it('el doble montaje de StrictMode no cancela la entrada que sigue vigente', async () => {
    const m = dosMesas();
    const { StrictMode } = await import('react');
    render(
      <StrictMode>
        <PantallaEntrada codigo="MESA1" servicio={m.servicio} />
      </StrictMode>,
    );
    await avanzar(5);
    expect(m.cancelada.MESA1).toBeUndefined();
    await act(async () => m.soltar.MESA1!());
    expect(await titulo(1)).toBeInTheDocument();
  });

  it('un estado que trae otra sesión que la de la entrada vuelve a entrar con el código, una vez', async () => {
    const g = servicioGuion();
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={g.servicio} />);
    await titulo(7);
    await avanzar(5);
    await act(async () => g.estados[0]!({ ...g.cuerpo('Viejo'), id: 'otra-sesion' }));
    await avanzar(5);
    expect(g.llamadas.entrar).toBe(2);
  });
});

describe('carreras entre el sondeo y el cambio de alias', () => {
  it('un sondeo pedido antes del PATCH y resuelto después no pisa el alias nuevo', async () => {
    const g = servicioGuion();
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={g.servicio} />);
    await titulo(7);
    await avanzar(5);
    expect(g.estados).toHaveLength(1); // sondeo en vuelo
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const campo = await abrirHoja(u);
    await u.clear(campo);
    await u.type(campo, 'Nuevo');
    await u.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await act(async () => g.estados[0]!(g.cuerpo('Viejo'))); // llega después del PATCH, con el alias viejo
    await avanzar(5);
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
    expect(screen.queryByText('Viejo')).toBeNull();
    expect(g.estados.length).toBeGreaterThan(1); // se vuelve a pedir enseguida
  });

  it('un PATCH 200 tardío de un miembro que ya no es el vigente no vuelve a ponerlo', async () => {
    const g = servicioGuion();
    g.servicio.cambiarAlias = async (alias) => ({ id: 'miembro-anterior', alias, color_avatar: '#4F1728', rol: 'miembro' });
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={g.servicio} />);
    await titulo(7);
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const campo = await abrirHoja(u);
    await u.clear(campo);
    await u.type(campo, 'Fantasma');
    await u.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Renovamos tu lugar');
    expect(screen.getAllByText('Viejo').length).toBeGreaterThan(0);
    expect(screen.queryByText('Fantasma', { selector: '[class*="alias"]' })).toBeNull();
  });
});

describe('sondeo: avisos y espera', () => {
  async function montar(opciones = {}) {
    const sim = crearServicioEntradaSimulado(opciones);
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    await titulo(7);
    await avanzar(100);
    return sim;
  }

  it('un alias ajeno con HTML llega por el sondeo y se pinta como texto, sin elementos', async () => {
    const sim = await montar();
    const otro = sim.sentarOtro();
    otro.alias = '<img src=x onerror=alert(1)>';
    await avanzar(3100);
    expect(await screen.findByText('2 personas en la mesa')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '<img src=x onerror=alert(1)>' })).toBeInTheDocument(); // el avatar, por su etiqueta
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect(document.querySelector('[onerror]')).toBeNull();
  });

  it('un 500 del sondeo dice que es un problema nuestro; sólo la red dice «conexión»', async () => {
    const sim = await montar();
    sim.fallarUnaVez('estado', errorSimulado(500, 'ERROR_INTERNO'));
    await avanzar(3100);
    const aviso = await screen.findByRole('status');
    expect(aviso).toHaveTextContent('Estamos teniendo un problema de nuestro lado');
    expect(aviso).not.toHaveTextContent('conexión');
    await avanzar(9000);
    expect(screen.queryByText(/Estamos teniendo un problema/)).toBeNull();
    sim.fallarUnaVez('estado', errorSimulado(0, 'SIN_RED'));
    await avanzar(3100);
    expect(await screen.findByRole('status')).toHaveTextContent('Perdimos la conexión');
  });

  it('una respuesta inválida del sondeo tampoco se disfraza de falta de conexión', async () => {
    const sim = await montar();
    sim.fallarUnaVez('estado', errorSimulado(200, 'RESPUESTA_INVALIDA'));
    await avanzar(3100);
    expect(await screen.findByRole('status')).toHaveTextContent('problema de nuestro lado');
  });

  it('respeta el Retry-After de un 429: no vuelve a pedir antes', async () => {
    const sim = await montar();
    sim.fallarUnaVez('estado', errorSimulado(429, 'DEMASIADAS_PETICIONES', 'x', 20));
    await avanzar(3100);
    const antes = llamadasA(sim, 'estado').length;
    await avanzar(15_000);
    expect(llamadasA(sim, 'estado')).toHaveLength(antes);
    await avanzar(6_000);
    expect(llamadasA(sim, 'estado').length).toBeGreaterThan(antes);
  });

  it('al volver la conexión (online) retoma el sondeo sin esperar el retroceso', async () => {
    const sim = await montar();
    sim.fallarUnaVez('estado', errorSimulado(0, 'SIN_RED'));
    sim.fallarUnaVez('estado', errorSimulado(0, 'SIN_RED'));
    await avanzar(3100);
    const antes = llamadasA(sim, 'estado').length;
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await avanzar(50);
    expect(llamadasA(sim, 'estado').length).toBeGreaterThan(antes);
  });
});

describe('lo que llega después de desmontar no toca nada', () => {
  it('una entrada que responde tras desmontar no escribe el espejo', async () => {
    const sim = crearServicioEntradaSimulado();
    const soltar = sim.retener('entrar');
    const vista = render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    vista.unmount();
    soltar();
    await avanzar(50);
    expect(window.localStorage.getItem('carta:invitado:v1')).toBeNull();
  });

  it('un 404 que llega tras desmontar no borra el espejo de otra pantalla', async () => {
    window.localStorage.setItem('carta:invitado:v1', JSON.stringify({ miembro: 'm-1', sesion: 's-1' }));
    const sim = crearServicioEntradaSimulado({ errores: { entrar: errorSimulado(404, 'MESA_NO_ENCONTRADA') } });
    const soltar = sim.retener('entrar');
    const vista = render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    vista.unmount();
    soltar();
    await avanzar(50);
    expect(window.localStorage.getItem('carta:invitado:v1')).not.toBeNull();
  });
});

describe('bienvenida: lo que se ve', () => {
  it('el botón del menú sigue deshabilitado hasta T-2.5', async () => {
    const sim = crearServicioEntradaSimulado();
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    await titulo(7);
    expect(screen.getByRole('button', { name: 'El menú llega pronto' })).toBeDisabled();
  });

  it('el número de mesa es el del servidor, no uno fijo', async () => {
    const sim = crearServicioEntradaSimulado({ numeroMesa: 12 });
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    expect(await titulo(12)).toBeInTheDocument();
  });

  it('con 8 personas dice «8 personas» y muestra sólo 5 avatares', async () => {
    const sim = crearServicioEntradaSimulado({ ocupados: 3 });
    for (let i = 0; i < 4; i += 1) sim.sentarOtro();
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    await titulo(7);
    await avanzar(3100);
    expect(await screen.findByText('8 personas en la mesa')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Comensales en la mesa' }).children).toHaveLength(5);
  });

  it('el aviso de espera aparece a los 8 s y no a los 7.9', async () => {
    const sim = crearServicioEntradaSimulado();
    sim.retener('entrar');
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    await avanzar(7500);
    expect(screen.queryByText(/tardando más de lo normal/)).toBeNull();
    await avanzar(700);
    expect(screen.getAllByText(/tardando más de lo normal/).length).toBeGreaterThan(0);
  });

  it('el aviso de privacidad dice literalmente la cookie y la marca en el teléfono', async () => {
    const sim = crearServicioEntradaSimulado();
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    await titulo(7);
    expect(screen.getByText(/una cookie propia y una marca en tu teléfono que recuerdan tu lugar en esta mesa/)).toBeInTheDocument();
  });

  // @ac AC-03.1
  it('mi color y el de los demás son los del servidor y no cambian al cambiar el alias', async () => {
    const sim = crearServicioEntradaSimulado({ ocupados: 1 });
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    await titulo(7);
    await avanzar(3100);
    const color = (nombre: string) =>
      screen.getAllByRole('img', { name: nombre })[0]!.firstElementChild!.getAttribute('style')?.match(/--color-avatar:\s*(#[0-9A-Fa-f]{6})/)?.[1]?.toUpperCase();
    expect(color('Comensal 2')).toBe(COLORES[1]);
    expect(color('Comensal 1')).toBe(COLORES[0]);
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const campo = await abrirHoja(u);
    await u.clear(campo);
    await u.type(campo, 'Zoila Pérez');
    await u.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await avanzar(3100);
    expect(color('Zoila Pérez')).toBe(COLORES[1]);
    expect(color('Comensal 1')).toBe(COLORES[0]);
  });
});

describe('hoja del alias', () => {
  async function montar(opciones = {}) {
    const sim = crearServicioEntradaSimulado(opciones);
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    await titulo(7);
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    return { sim, u };
  }

  it('manda el alias recortado', async () => {
    const { sim, u } = await montar();
    const campo = await abrirHoja(u);
    await u.clear(campo);
    await u.type(campo, '  Luz  ');
    await u.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(llamadasA(sim, 'cambiarAlias')[0]!.argumentos).toEqual(['Luz']);
  });

  it('al reabrir vuelve el alias actual, no lo que se había escrito y cancelado', async () => {
    const { u } = await montar();
    const campo = await abrirHoja(u);
    await u.clear(campo);
    await u.type(campo, 'zzz');
    await u.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await abrirHoja(u)).toHaveValue('Comensal 1');
  });

  it('el campo con error lo declara: aria-invalid y aria-describedby apuntan al mensaje', async () => {
    const { u } = await montar();
    const campo = await abrirHoja(u);
    expect(campo).not.toHaveAttribute('aria-invalid');
    await u.clear(campo);
    await u.type(campo, 'eres tonto');
    await u.click(screen.getByRole('button', { name: 'Guardar' }));
    const mensaje = await screen.findByRole('alert');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo.getAttribute('aria-describedby')).toBe(mensaje.id);
  });

  it('un 429 al guardar habla de límite, no de un error genérico', async () => {
    const { sim, u } = await montar();
    const campo = await abrirHoja(u);
    sim.fallarUnaVez('cambiarAlias', errorSimulado(429, 'DEMASIADAS_PETICIONES', 'x', 5));
    await u.clear(campo);
    await u.type(campo, 'Luz');
    await u.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('muchas veces seguidas');
  });

  it('Escape durante el guardado no cierra la hoja; si falla, el error se ve', async () => {
    const { sim, u } = await montar();
    const campo = await abrirHoja(u);
    const soltar = sim.retener('cambiarAlias');
    sim.fallarUnaVez('cambiarAlias', errorSimulado(422, 'ALIAS_NO_PERMITIDO'));
    await u.clear(campo);
    await u.type(campo, 'Luz');
    await u.click(screen.getByRole('button', { name: 'Guardar' }));
    await u.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    soltar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Ese nombre no está disponible');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await u.keyboard('{Escape}'); // sin guardado en curso, ahora sí
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('el foco entra al diálogo al abrir y vuelve a «Cambiar» al cerrar', async () => {
    const { u } = await montar();
    const cambiar = screen.getByRole('button', { name: /Cambiar mi nombre/ });
    await u.click(cambiar);
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
    await u.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(cambiar).toHaveFocus();
  });

  it('«Usa 24 caracteres o menos» se anuncia (role=status)', async () => {
    const { u } = await montar();
    const campo = await abrirHoja(u);
    fireEvent.change(campo, { target: { value: 'x'.repeat(25) } });
    expect(screen.getByRole('status')).toHaveTextContent('Usa 24 caracteres o menos');
  });
});

describe('accesibilidad al cambiar de pantalla', () => {
  it('la bienvenida recibe el foco en su título', async () => {
    const sim = crearServicioEntradaSimulado();
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    expect(await titulo(7)).toHaveFocus();
  });

  it.each([
    ['mesa inválida', { errores: { entrar: errorSimulado(404, 'MESA_NO_ENCONTRADA') } }, 'No encontramos esta mesa'],
    ['mesa llena', { ocupados: 12 }, 'Esta mesa ya está completa'],
    ['error genérico', { errores: { entrar: errorSimulado(500, 'ERROR_INTERNO') } }, 'Algo salió mal'],
  ])('%s se anuncia (role=alert) y su título recibe el foco', async (_n, opciones, encabezado) => {
    const sim = crearServicioEntradaSimulado(opciones);
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    const h = await screen.findByRole('heading', { name: encabezado });
    expect(screen.getByRole('alert')).toContainElement(h);
    expect(h).toHaveFocus();
  });
});

describe('cuenta atrás del 429', () => {
  it('un Retry-After fraccionario se muestra entero, nunca «(0.0001 s)»', async () => {
    const sim = crearServicioEntradaSimulado({ errores: { entrar: errorSimulado(429, 'DEMASIADAS_PETICIONES', 'x', 0.0001) } });
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    expect(await screen.findByRole('button', { name: 'Reintentar (1 s)' })).toBeDisabled();
  });
});
