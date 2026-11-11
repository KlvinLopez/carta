import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CODIGO_SEMILLA, crearServicioEntradaSimulado, errorSimulado } from '../../mocks/servicioEntradaSimulado';
import { PantallaEntrada } from './PantallaEntrada';
import { llamadasA, montarEntrada } from './utilesPrueba';

const bienvenida = () => screen.findByRole('heading', { name: 'Estás en la mesa 7' });

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('bienvenida', () => {
  it('muestra restaurante, mesa, alias y el aviso de privacidad en una línea', async () => {
    montarEntrada();
    expect(await bienvenida()).toBeInTheDocument();
    expect(screen.getByText('La Ceiba')).toBeInTheDocument();
    expect(screen.getByText('Comensal 1')).toBeInTheDocument();
    expect(screen.getByText('Te damos la bienvenida')).toBeInTheDocument();
    expect(screen.getByText(/Sin cuentas ni datos personales/)).toBeInTheDocument();
  });

  it('mientras responde muestra el esqueleto, nunca una pantalla en blanco', async () => {
    const m = montarEntrada();
    expect(screen.getByRole('status')).toHaveTextContent('Buscando tu mesa…');
    await bienvenida();
    expect(m.sim.llamadas.length).toBeGreaterThan(0);
  });

  it('con respuesta lenta (8 s) avisa que sigue intentando', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const sim = crearServicioEntradaSimulado();
    const soltar = sim.retener('entrar');
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    expect(screen.queryByText(/tardando más de lo normal/)).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8100);
    });
    expect(screen.getAllByText(/Está tardando más de lo normal/).length).toBeGreaterThan(0);
    soltar();
    expect(await bienvenida()).toBeInTheDocument();
  });

  // @ac AC-01.4
  it('guarda el espejo con ids opacos, sin alias ni el código de la mesa', async () => {
    const { sim } = montarEntrada();
    await bienvenida();
    const crudo = window.localStorage.getItem('carta:invitado:v1')!;
    // T-2.7: además el `slug` público del restaurante y una huella de la mesa (no el código) para la copia sin conexión.
    expect(JSON.parse(crudo)).toEqual({ miembro: sim.yo(), sesion: expect.any(String), slug: expect.any(String), mesa: expect.stringMatching(/^[0-9a-f]+$/) });
    expect(crudo).not.toContain(CODIGO_SEMILLA);
    expect(crudo).not.toContain('Comensal');
    for (let i = 0; i < window.localStorage.length; i += 1) {
      expect(window.localStorage.getItem(window.localStorage.key(i)!)).not.toContain(CODIGO_SEMILLA);
    }
  });

  // @ac AC-01.4
  it('al volver con la misma identidad dice «Qué bueno verte de nuevo» y no duplica al comensal', async () => {
    const sim = crearServicioEntradaSimulado();
    const primera = render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    await bienvenida();
    primera.unmount();
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    expect(await screen.findByText('Qué bueno verte de nuevo')).toBeInTheDocument();
    expect(sim.miembros()).toHaveLength(1);
  });

  it('si el servidor crea un comensal nuevo (cookie perdida) no finge que lo reconoce', async () => {
    const sim = crearServicioEntradaSimulado();
    const primera = render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    await bienvenida();
    primera.unmount();
    sim.expirarToken();
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    expect(await screen.findByText('Te damos la bienvenida')).toBeInTheDocument();
  });

  it('con localStorage bloqueado (modo privado de Safari) todo funciona sin el espejo', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError');
    });
    montarEntrada();
    expect(await bienvenida()).toBeInTheDocument();
  });

  it('el doble montaje (StrictMode) y el doble toque no sientan a dos comensales', async () => {
    const sim = crearServicioEntradaSimulado();
    const { StrictMode } = await import('react');
    render(
      <StrictMode>
        <PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />
      </StrictMode>,
    );
    await bienvenida();
    expect(llamadasA(sim, 'entrar')).toHaveLength(1);
    expect(sim.miembros()).toHaveLength(1);
  });
});

describe('logo del restaurante', () => {
  it('un logo https se pide sin Referer', async () => {
    const { container } = montarEntrada({ restaurante: { nombre: 'La Ceiba', logo_url: 'https://cdn.example/logo.png' } });
    await bienvenida();
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('src', 'https://cdn.example/logo.png');
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
  });

  it.each(['http://cdn.example/logo.png', 'javascript:alert(1)', 'https://user:clave@cdn.example/l.png', 'no es url'])(
    'un logo no seguro (%s) se ignora y sale la inicial',
    async (logo) => {
      const { container } = montarEntrada({ restaurante: { nombre: 'la ceiba', logo_url: logo } });
      await bienvenida();
      expect(container.querySelector('img')).toBeNull();
      expect(screen.getByText('L')).toBeInTheDocument();
    },
  );

  it('si el logo no carga (CSP, 404) cae a la inicial', async () => {
    const { container } = montarEntrada({ restaurante: { nombre: 'La Ceiba', logo_url: 'https://cdn.example/roto.png' } });
    await bienvenida();
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('L')).toBeInTheDocument();
  });
});

describe('alias', () => {
  async function abrirHoja(m: ReturnType<typeof montarEntrada>) {
    await bienvenida();
    await m.u.click(screen.getByRole('button', { name: /Cambiar mi nombre/ }));
    return screen.getByRole('textbox', { name: 'Tu nombre' });
  }

  it('cambia el alias y lo pinta; lo ajeno con HTML se ve como texto, nunca como HTML', async () => {
    const m = montarEntrada();
    const campo = await abrirHoja(m);
    await m.u.clear(campo);
    await m.u.type(campo, '<b>Luz</b> 🍕');
    await m.u.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const alias = screen.getByText('<b>Luz</b> 🍕');
    expect(alias.querySelector('b')).toBeNull();
    expect(document.querySelector('b')).toBeNull();
    expect(m.sim.miembros()[0]!.alias).toBe('<b>Luz</b> 🍕');
  });

  it('un alias bloqueado deja el anterior, conserva lo escrito y lo explica ', async () => {
    const m = montarEntrada();
    const campo = await abrirHoja(m);
    await m.u.clear(campo);
    await m.u.type(campo, 'eres tonto');
    await m.u.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ese nombre no está disponible');
    expect(campo).toHaveValue('eres tonto');
    expect(m.sim.miembros()[0]!.alias).toBe('Comensal 1');
    await m.u.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('Comensal 1')).toBeInTheDocument();
  });

  it('cuenta puntos de código: 24 emojis valen, 25 no; vacío tampoco', async () => {
    const m = montarEntrada();
    const campo = await abrirHoja(m);
    const guardar = screen.getByRole('button', { name: 'Guardar' });
    fireEvent.change(campo, { target: { value: '🍕'.repeat(24) } });
    expect(guardar).toBeEnabled();
    fireEvent.change(campo, { target: { value: '🍕'.repeat(25) } });
    expect(guardar).toBeDisabled();
    expect(screen.getByText(/24 caracteres o menos/)).toBeInTheDocument();
    fireEvent.change(campo, { target: { value: '   ' } });
    expect(guardar).toBeDisabled();
  });

  it('el doble toque en «Guardar» manda un solo cambio', async () => {
    const m = montarEntrada();
    const campo = await abrirHoja(m);
    const soltar = m.sim.retener('cambiarAlias');
    await m.u.clear(campo);
    await m.u.type(campo, 'Luz');
    const guardar = screen.getByRole('button', { name: 'Guardar' });
    await m.u.dblClick(guardar);
    fireEvent.submit(guardar.closest('form')!);
    soltar();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(llamadasA(m.sim, 'cambiarAlias')).toHaveLength(1);
  });

  it('guardar el mismo nombre no llama al servidor', async () => {
    const m = montarEntrada();
    await abrirHoja(m);
    await m.u.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(llamadasA(m.sim, 'cambiarAlias')).toHaveLength(0);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('sin red al guardar: avisa, deja el alias y se puede reintentar', async () => {
    const m = montarEntrada();
    const campo = await abrirHoja(m);
    m.sim.fallarUnaVez('cambiarAlias', errorSimulado(0, 'SIN_RED'));
    await m.u.clear(campo);
    await m.u.type(campo, 'Luz');
    await m.u.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
    await m.u.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('Luz')).toBeInTheDocument();
  });

  it('401 al guardar: se renueva el lugar y se pide guardar otra vez', async () => {
    const m = montarEntrada();
    const campo = await abrirHoja(m);
    m.sim.expirarToken();
    await m.u.clear(campo);
    await m.u.type(campo, 'Luz');
    await m.u.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Renovamos tu lugar');
    expect(llamadasA(m.sim, 'entrar')).toHaveLength(2);
  });

  it('si la mesa se cerró mientras escribía, cierra a la pantalla de mesa cerrada', async () => {
    const m = montarEntrada();
    const campo = await abrirHoja(m);
    m.sim.cerrar();
    await m.u.clear(campo);
    await m.u.type(campo, 'Luz');
    await m.u.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('heading', { name: 'La mesa se cerró' })).toBeInTheDocument();
  });
});

describe('pantallas de fallo en el lenguaje de la marca', () => {
  // @ac AC-01.3
  it('mesa inexistente, revocada o de baja: el mismo mensaje, sin revelar nada y sin botón', async () => {
    const { sim } = montarEntrada({}, 'OtroCodigoQueNoExiste123');
    expect(await screen.findByRole('heading', { name: 'No encontramos esta mesa' })).toBeInTheDocument();
    expect(screen.getByText(/Pide al personal que te comparta el QR/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText('La Ceiba')).toBeNull();
    expect(llamadasA(sim, 'entrar')).toHaveLength(1);
  });

  it('una mesa inexistente borra el espejo viejo', async () => {
    window.localStorage.setItem('carta:invitado:v1', JSON.stringify({ miembro: 'a', sesion: 'b' }));
    montarEntrada({}, 'OtroCodigoQueNoExiste123');
    await screen.findByRole('heading', { name: 'No encontramos esta mesa' });
    expect(window.localStorage.getItem('carta:invitado:v1')).toBeNull();
  });

  it('mesa llena (409): pantalla amable; «Intentar de nuevo» entra cuando se libera un lugar', async () => {
    const sim = crearServicioEntradaSimulado();
    sim.fallarUnaVez('entrar', errorSimulado(409, 'SESION_LLENA'));
    const u = (await import('@testing-library/user-event')).default.setup();
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    expect(await screen.findByRole('heading', { name: 'Esta mesa ya está completa' })).toBeInTheDocument();
    expect(screen.getByText(/Pide al mesero/)).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Intentar de nuevo' }));
    expect(await bienvenida()).toBeInTheDocument();
    expect(llamadasA(sim, 'entrar')).toHaveLength(2);
  });

  it('con la mesa de 12 de verdad, el 13.º ve la pantalla de mesa completa', async () => {
    montarEntrada({ ocupados: 12 });
    expect(await screen.findByRole('heading', { name: 'Esta mesa ya está completa' })).toBeInTheDocument();
  });

  // @ac AC-01.3
  it('sesión cerrada (410) al sondear: «La mesa se cerró» con el nombre del restaurante y reabrir', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const sim = crearServicioEntradaSimulado();
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    await bienvenida();
    sim.cerrar();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });
    expect(await screen.findByRole('heading', { name: 'La mesa se cerró' })).toBeInTheDocument();
    expect(screen.getByText(/Gracias por visitar La Ceiba/)).toBeInTheDocument();
    expect(window.localStorage.getItem('carta:invitado:v1')).toBeNull();
    const antes = llamadasA(sim, 'estado').length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(llamadasA(sim, 'estado')).toHaveLength(antes); // dejó de sondear
    fireEvent.click(screen.getByRole('button', { name: 'Abrir la mesa de nuevo' }));
    expect(await bienvenida()).toBeInTheDocument();
    expect(sim.miembros()).toHaveLength(1); // sesión nueva, sin los de la anterior
  });

  it('sin conexión: pantalla propia; el botón reintenta una vez aunque se toque dos veces', async () => {
    const sim = crearServicioEntradaSimulado();
    sim.fallarUnaVez('entrar', errorSimulado(0, 'SIN_RED'));
    const u = (await import('@testing-library/user-event')).default.setup();
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    expect(await screen.findByRole('heading', { name: 'Sin conexión' })).toBeInTheDocument();
    const soltar = sim.retener('entrar');
    await u.dblClick(screen.getByRole('button', { name: 'Reintentar' }));
    soltar();
    expect(await bienvenida()).toBeInTheDocument();
    expect(llamadasA(sim, 'entrar')).toHaveLength(2);
  });

  it('al volver la conexión (evento online) la entrada se reintenta sola', async () => {
    const sim = crearServicioEntradaSimulado();
    sim.fallarUnaVez('entrar', errorSimulado(0, 'SIN_RED'));
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    await screen.findByRole('heading', { name: 'Sin conexión' });
    await act(async () => {}); // deja correr el efecto que registra el oyente
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(await bienvenida()).toBeInTheDocument();
  });

  it('error del servidor (500): pantalla genérica, sin detalles técnicos', async () => {
    montarEntrada({ errores: { entrar: errorSimulado(500, 'ERROR_INTERNO', 'Traceback: psycopg …') } });
    expect(await screen.findByRole('heading', { name: 'Algo salió mal' })).toBeInTheDocument();
    expect(screen.queryByText(/Traceback/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('demasiadas peticiones (429): espera el Retry-After antes de dejar reintentar', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    montarEntrada({ errores: { entrar: errorSimulado(429, 'DEMASIADAS_PETICIONES', 'x', 3) } });
    const boton = await screen.findByRole('button', { name: /Reintentar \(3 s\)/ });
    expect(boton).toBeDisabled();
    for (let i = 0; i < 4; i += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
  });

  it('401 persistente (cookies bloqueadas): tras dos reentradas explica el problema en vez de ciclar', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const sim = crearServicioEntradaSimulado({ errores: { estado: errorSimulado(401, 'SIN_CREDENCIAL') } });
    render(<PantallaEntrada codigo={CODIGO_SEMILLA} servicio={sim.servicio} />);
    await bienvenida();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(await screen.findByRole('heading', { name: 'No pudimos guardar tu lugar' })).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000); // y no insiste solo
    });
    // Una sola reentrada automática: cada `entrar` sin cookie crea un comensal.
    expect(llamadasA(sim, 'entrar')).toHaveLength(2);
    const dentro = within(screen.getByRole('alert'));
    expect(dentro.getByRole('button', { name: 'Intentar de nuevo' })).toBeInTheDocument();
  });
});
