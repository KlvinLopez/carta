/**
 * Los cinco comportamientos del menú que T-2.5 dejó sin una prueba que los fijara (sobrevivían a una
 * mutación) y que T-2.6 toca de cerca. Cada prueba falla si se quita la línea que protege.
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ErrorApi } from '../../compartido/http';
import { CODIGO_SEMILLA, crearServicioEntradaSimulado } from '../../mocks/servicioEntradaSimulado';
import { crearMenuSemilla } from '../../mocks/servicioMenuComensalSimulado';
import AreaComensal from '../Area';
import { crearColaAnalitica } from '../analitica/cola';
import { urlDeFotoSegura } from '../menu/ImagenPlatillo';
import { Menu } from '../menu/Menu';
import type { MenuPublico, ServicioMenu } from '../menu/servicioMenu';
import { almacenEnMemoria, analiticaFalsa } from '../menu/utilesPrueba';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('urlDeFotoSegura con la página servida desde https (como en producción)', () => {
  const origen = 'https://carta.example';

  it('una ruta que empieza por barra y barra invertida se leería como https://otro.sitio/…: se rechaza', () => {
    // El navegador trata «\» como «/» en una URL https: sin la comprobación saldría https://otro.sitio/foto.jpg.
    expect(new URL('/\\otro.sitio/foto.jpg', origen).origin).toBe('https://otro.sitio');
    expect(urlDeFotoSegura('/\\otro.sitio/foto.jpg', origen)).toBeNull();
    expect(urlDeFotoSegura('\\\\otro.sitio/foto.jpg', origen)).toBeNull();
    expect(urlDeFotoSegura('https:\\\\otro.sitio/foto.jpg', origen)).toBeNull();
  });

  it('acepta https ajeno y rutas del propio origen; rechaza http ajeno, //host, javascript:, data: y /api/', () => {
    expect(urlDeFotoSegura('https://fotos.carta.example/a.jpg', origen)).toBe('https://fotos.carta.example/a.jpg');
    expect(urlDeFotoSegura('/fotos/a.jpg', origen)).toBe('/fotos/a.jpg');
    expect(urlDeFotoSegura('http://fotos.carta.example/a.jpg', origen)).toBeNull();
    expect(urlDeFotoSegura('//otro.sitio/a.jpg', origen)).toBeNull();
    expect(urlDeFotoSegura('javascript:alert(1)', origen)).toBeNull();
    expect(urlDeFotoSegura('data:image/png;base64,AAAA', origen)).toBeNull();
    expect(urlDeFotoSegura('/api/v1/p/sesion', origen)).toBeNull();
    expect(urlDeFotoSegura('https://usuario:clave@fotos.carta.example/a.jpg', origen)).toBeNull();
    expect(urlDeFotoSegura(null, origen)).toBeNull();
  });
});

describe('cola de analítica', () => {
  it('un envío que se rechaza más tarde no deja una promesa sin atender', async () => {
    const sinAtender = vi.fn();
    process.on('unhandledRejection', sinAtender);
    try {
      const cola = crearColaAnalitica({ enviar: () => Promise.reject(new Error('red caída')), documento: undefined, ventana: undefined });
      cola.registrar('menu_view');
      cola.vaciar();
      await new Promise((r) => setTimeout(r, 30));
      expect(sinAtender).not.toHaveBeenCalled();
      cola.detener();
    } finally {
      process.off('unhandledRejection', sinAtender);
    }
  });

  it('un envío que lanza de forma síncrona tampoco llega a la pantalla', () => {
    const cola = crearColaAnalitica({
      enviar: () => {
        throw new Error('boom');
      },
      documento: undefined,
      ventana: undefined,
    });
    cola.registrar('menu_view');
    expect(() => cola.vaciar()).not.toThrow();
    cola.detener();
  });

  it('detener() quita exactamente las escuchas de visibilitychange y pagehide que puso', () => {
    const documento = { addEventListener: vi.fn(), removeEventListener: vi.fn(), visibilityState: 'visible' as DocumentVisibilityState };
    const ventana = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const cola = crearColaAnalitica({ enviar: async () => undefined, documento, ventana });
    expect(documento.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(ventana.addEventListener).toHaveBeenCalledWith('pagehide', expect.any(Function));
    cola.detener();
    expect(documento.removeEventListener).toHaveBeenCalledTimes(1);
    expect(ventana.removeEventListener).toHaveBeenCalledTimes(1);
    expect(documento.removeEventListener).toHaveBeenCalledWith('visibilitychange', documento.addEventListener.mock.calls[0]![1]);
    expect(ventana.removeEventListener).toHaveBeenCalledWith('pagehide', ventana.addEventListener.mock.calls[0]![1]);
  });
});

describe('Area: key={codigo}', () => {
  const OTRO_CODIGO = 'Zq8wE5rT2yU9iO1pA4sD7f';

  function respuestaJson(cuerpo: unknown, estado = 200) {
    return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } });
  }

  function IrAOtraMesa() {
    const navigate = useNavigate();
    return (
      <button type="button" onClick={() => navigate(`/m/${OTRO_CODIGO}/menu`)}>
        ir a otra mesa
      </button>
    );
  }

  it('cambiar de código sin recargar monta una sesión nueva: entra de nuevo y no arrastra lo escrito en el buscador', async () => {
    const entradas: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/v1/p/sesion/entrar') {
          const codigo = (JSON.parse(String(init?.body)) as { codigo_mesa: string }).codigo_mesa;
          entradas.push(codigo);
          const sim = await crearServicioEntradaSimulado({ codigo, numeroMesa: codigo === CODIGO_SEMILLA ? 7 : 8 }).servicio.entrar(codigo);
          return respuestaJson(sim);
        }
        if (url === '/api/v1/p/menu/la-ceiba') return respuestaJson(crearMenuSemilla());
        if (url === '/api/v1/p/sesion') return new Response(null, { status: 304 });
        return new Response(null, { status: 202 });
      }),
    );
    const u = userEvent.setup();
    render(
      <MemoryRouter initialEntries={[`/m/${CODIGO_SEMILLA}/menu`]}>
        <Routes>
          <Route path="/m/:codigo/*" element={<AreaComensal />} />
        </Routes>
        <IrAOtraMesa />
      </MemoryRouter>,
    );
    await u.type(await screen.findByRole('searchbox', { name: 'Buscar en el menú' }), 'pastor');
    expect(entradas).toEqual([CODIGO_SEMILLA]);

    await u.click(screen.getByRole('button', { name: 'ir a otra mesa' }));
    await waitFor(() => expect(entradas).toEqual([CODIGO_SEMILLA, OTRO_CODIGO]));
    expect(await screen.findByText('Mesa 8')).toBeInTheDocument();
    expect(await screen.findByRole('searchbox', { name: 'Buscar en el menú' })).toHaveValue('');
  });
});

describe('useControladorMenu: una carga abortada que falla tarde no pinta un error', () => {
  function menuDe(nombre: string): MenuPublico {
    const m = crearMenuSemilla();
    return { ...m, restaurante: { ...m.restaurante, nombre, slug: nombre.toLowerCase() } };
  }

  it('al cambiar de restaurante, la petición anterior (abortada) que rechaza después no tumba la pantalla', async () => {
    let rechazarA!: (e: unknown) => void;
    let resolverB!: (m: MenuPublico) => void;
    const servicio: ServicioMenu = {
      menu: (slug) =>
        slug === 'a'
          ? new Promise<MenuPublico>((_, rechazar) => (rechazarA = rechazar)) // ignora la señal, como un fetch que ya salió
          : new Promise<MenuPublico>((resolver) => (resolverB = resolver)),
    };
    const props = { mesa: 7, servicio, analitica: analiticaFalsa().analitica, almacen: almacenEnMemoria().almacen, onVolver: () => undefined };
    const vista = render(<Menu slug="a" {...props} />);
    vista.rerender(<Menu slug="b" {...props} />);
    await waitFor(() => expect(resolverB).toBeDefined());

    await act(async () => {
      rechazarA(new ErrorApi(500, 'ERROR_INTERNO', 'x'));
      await new Promise((r) => setTimeout(r, 20));
    });
    // Mientras B carga, sigue el esqueleto: ni «Algo salió mal» ni un reintento.
    expect(screen.queryByText('Algo salió mal')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Preparando el menú…');

    await act(async () => {
      resolverB(menuDe('Bistró'));
    });
    expect(await screen.findByRole('heading', { name: 'Bistró', level: 1 })).toBeInTheDocument();
    expect(screen.queryByText('Algo salió mal')).toBeNull();
  });
});
