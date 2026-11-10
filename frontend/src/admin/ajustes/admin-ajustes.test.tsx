import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorApi } from '../../compartido/http';
import {
  crearServicioAjustesSimulado,
  restauranteSemilla,
  type AjustesSimulado,
  type OpcionesAjustesSimulado,
} from '../../mocks/servicioAjustesSimulado';
import type { Restaurante } from '../armazon/RestauranteActivo';
import { CopiarEnlace, esUrlWeb } from '../gestion/CopiarEnlace';
import { cambiosDe, PantallaAjustesConServicio } from './PantallaAjustes';

/** Como el panel: lo guardado vuelve como la nueva versión del restaurante activo. */
function Anfitrion({ sim, inicial, guardados }: { sim: AjustesSimulado; inicial: Restaurante; guardados: Restaurante[] }) {
  const [restaurante, setRestaurante] = useState(inicial);
  return (
    <PantallaAjustesConServicio
      servicio={sim.servicio}
      restaurante={restaurante}
      alGuardar={(r) => {
        guardados.push(r);
        setRestaurante(r);
      }}
      pie={<button type="button">Salir</button>}
    />
  );
}

function montar(opciones: OpcionesAjustesSimulado = {}) {
  const sim = crearServicioAjustesSimulado(opciones);
  const guardados: Restaurante[] = [];
  const u = userEvent.setup();
  // `userEvent.setup()` instala su propio portapapeles: el de la prueba se pone después.
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: escribir }, configurable: true });
  const vista = render(
    <MemoryRouter>
      <Anfitrion sim={sim} inicial={opciones.restaurante ?? restauranteSemilla} guardados={guardados} />
    </MemoryRouter>,
  );
  return { sim, u, guardados, ...vista };
}
const campo = (nombre: string | RegExp) => screen.getByLabelText(nombre);
const guardar = () => screen.getByRole('button', { name: 'Guardar cambios' });
let escribir: ReturnType<typeof vi.fn>;

beforeEach(() => {
  escribir = vi.fn(async () => {});
});
afterEach(() => vi.restoreAllMocks());

describe('datos del restaurante (US-21)', () => {
  it('muestra lo que hay y deja «Guardar cambios» apagado hasta que algo cambie', async () => {
    montar();
    expect(campo('Nombre')).toHaveValue('Taquería El Paso');
    expect(campo('Dirección')).toHaveValue('Av. Juárez 120, Centro');
    expect(campo('Teléfono')).toHaveValue('55 1234 5678');
    expect(campo('Correo')).toHaveValue('hola@elpaso.mx');
    expect(campo(/Logo/)).toHaveValue('');
    expect(guardar()).toBeDisabled();
  });

  it('el PATCH lleva sólo los campos que cambiaron; vaciar uno opcional lo manda como null', async () => {
    const { sim, u, guardados } = montar();
    await u.clear(campo('Teléfono'));
    await u.type(campo('Teléfono'), '55 9999 0000');
    await u.clear(campo('Dirección'));
    await u.click(guardar());
    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
    expect(sim.ultima('cambiar')!.argumentos[0]).toStrictEqual({ telefono: '55 9999 0000', direccion: null });
    expect(guardados).toHaveLength(1);
    expect(guardados[0]!.telefono).toBe('55 9999 0000');
    // Tras guardar, el formulario parte de lo guardado y vuelve a apagarse.
    expect(guardar()).toBeDisabled();
    expect(campo('Dirección')).toHaveValue('');
  });

  it('cambiosDe ignora espacios sobrantes y no manda lo que no cambió', () => {
    const v = { nombre: ' Taquería El Paso ', direccion: 'Av. Juárez 120, Centro', telefono: '55 1234 5678', email: 'hola@elpaso.mx', logo_url: '' };
    expect(cambiosDe(restauranteSemilla, v)).toStrictEqual({});
    expect(cambiosDe(restauranteSemilla, { ...v, nombre: 'Nuevo' })).toStrictEqual({ nombre: 'Nuevo' });
    expect(cambiosDe(restauranteSemilla, { ...v, logo_url: ' https://a.mx/l.png ' })).toStrictEqual({ logo_url: 'https://a.mx/l.png' });
  });

  it('no envía un nombre vacío', async () => {
    const { sim, u } = montar();
    await u.clear(campo('Nombre'));
    await u.click(guardar());
    expect(await screen.findByText('Escribe el nombre de tu restaurante.')).toBeInTheDocument();
    expect(sim.veces('cambiar')).toBe(0);
  });

  it.each([
    ['http://logo.example.com/a.png'],
    ['javascript:alert(1)'],
    ['https://usuario:clave@logo.example.com/a.png'],
    ['logo.png'],
  ])('rechaza el logo «%s» en el cliente (sólo https)', async (url) => {
    const { sim, u } = montar();
    await u.type(campo(/Logo/), url);
    await u.click(guardar());
    expect(await screen.findByText(/debe empezar con https:\/\//)).toBeInTheDocument();
    expect(campo(/Logo/)).toHaveAttribute('aria-invalid', 'true');
    expect(sim.veces('cambiar')).toBe(0);
  });

  it('guarda un logo https', async () => {
    const { sim, u } = montar();
    await u.type(campo(/Logo/), 'https://logo.example.com/a.png');
    await u.click(guardar());
    await screen.findByText('Cambios guardados.');
    expect(sim.ultima('cambiar')!.argumentos[0]).toStrictEqual({ logo_url: 'https://logo.example.com/a.png' });
  });

  it('rechaza un correo mal escrito', async () => {
    const { sim, u } = montar();
    await u.clear(campo('Correo'));
    await u.type(campo('Correo'), 'sin-arroba');
    await u.click(guardar());
    expect(await screen.findByText(/Escribe un correo válido/)).toBeInTheDocument();
    expect(sim.veces('cambiar')).toBe(0);
  });

  it('un 422 del servidor sobre un campo se muestra junto a ese campo, sin «detail»', async () => {
    const { sim, u } = montar();
    sim.fallarUnaVez(
      'cambiar',
      new ErrorApi(422, 'PAYLOAD_INVALIDO', 'Datos inválidos', {
        errores: [{ campo: 'body.telefono', mensaje: 'Ese teléfono es muy largo.', tipo: 'string_too_long' }],
      }),
    );
    await u.clear(campo('Teléfono'));
    await u.type(campo('Teléfono'), '55');
    await u.click(guardar());
    await waitFor(() => expect(campo('Teléfono')).toHaveAttribute('aria-invalid', 'true'));
    expect(campo('Teléfono')).toHaveAccessibleDescription('Ese teléfono es muy largo.');
    expect(screen.queryByText('Cambios guardados.')).toBeNull();
  });

  it('un error de red muestra el mensaje y conserva lo escrito para reintentar', async () => {
    const { sim, u } = montar();
    sim.fallarUnaVez('cambiar', new ErrorApi(0, 'SIN_RED', 'No pudimos conectar con Carta.'));
    await u.clear(campo('Nombre'));
    await u.type(campo('Nombre'), 'Otro nombre');
    await u.click(guardar());
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar con Carta.');
    expect(campo('Nombre')).toHaveValue('Otro nombre');
    await u.click(guardar());
    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
  });
});

describe('enlaces públicos', () => {
  it('no publica ninguna URL de mesa: el código de la mesa es su credencial (A1)', async () => {
    const { container } = montar();
    await screen.findByRole('button', { name: 'Copiar entrada del personal' });
    expect(container.innerHTML).not.toContain('/m/');
    expect(container.innerHTML).not.toContain('codigo_publico');
    expect(screen.queryByText(/ejemplo: la mesa 1/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Copiar menú/ })).toBeNull();
    // Y lo dice: el enlace del menú llega con la Fase 2.
    expect(screen.getByText(/El enlace público de tu menú llega con la Fase 2/)).toBeInTheDocument();
  });

  it('no pide mesas al servidor: Ajustes ya no depende de ellas', async () => {
    const { sim } = montar();
    await screen.findByRole('button', { name: 'Copiar entrada del personal' });
    expect(sim.llamadas.map((l) => l.metodo)).toEqual([]);
  });

  it('«Mesas» es un enlace del router (no recarga la página ni tira el token) y mide ≥ 44 px por CSS', async () => {
    montar();
    const enlace = screen.getByRole('link', { name: 'Ir a Mesas' });
    expect(enlace).toHaveAttribute('href', '/admin/mesas');
    expect(enlace.className).toContain('enlaceTocable');
    const fuente = await import('node:fs').then((fs) => fs.readFileSync('src/admin/gestion/Gestion.module.css', 'utf8'));
    expect(fuente).toMatch(/\.enlaceTocable,\s*a\.url \{[^}]*min-height: var\(--tactil\)/);
  });

  it('la entrada del personal lleva «Copiar» y copia ese enlace', async () => {
    const { u } = montar();
    const origen = window.location.origin;
    expect(screen.getByText('Entrada del personal')).toBeInTheDocument();
    await u.click(await screen.findByRole('button', { name: 'Copiar entrada del personal' }));
    expect(escribir).toHaveBeenCalledWith(`${origen}/staff/taqueria-el-paso`);
    expect(screen.getByRole('button', { name: 'Copiar entrada del personal' })).toHaveTextContent('Copiado');
  });

  it('si el navegador no deja copiar lo dice y el enlace sigue a la vista', async () => {
    escribir.mockRejectedValue(new Error('denegado'));
    const { u } = montar();
    await u.click(await screen.findByRole('button', { name: 'Copiar entrada del personal' }));
    expect(await screen.findByText(/No pudimos copiar/)).toBeInTheDocument();
    expect(screen.getByText(/staff\/taqueria-el-paso/)).toBeInTheDocument();
  });
});

describe('CopiarEnlace', () => {
  it('vuelve a «Copiar» a los 2,5 s y no deja el temporizador al desmontar', async () => {
    vi.useFakeTimers();
    try {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: escribir }, configurable: true });
      const vista = render(
        <ul>
          <CopiarEnlace etiqueta="Entrada" url="https://carta.cooking/staff/x" />
        </ul>,
      );
      await act(async () => screen.getByRole('button', { name: 'Copiar entrada' }).click());
      expect(screen.getByRole('button', { name: 'Copiar entrada' })).toHaveTextContent('Copiado');
      await act(async () => vi.advanceTimersByTime(2400));
      expect(screen.getByRole('button', { name: 'Copiar entrada' })).toHaveTextContent('Copiado');
      await act(async () => vi.advanceTimersByTime(200));
      expect(screen.getByRole('button', { name: 'Copiar entrada' })).toHaveTextContent('Copiar');
      expect(screen.getByRole('button', { name: 'Copiar entrada' })).not.toHaveTextContent('Copiado');
      await act(async () => screen.getByRole('button', { name: 'Copiar entrada' }).click());
      vista.unmount();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ['https://carta.cooking/staff/x', true],
    ['javascript:alert(1)', false],
    ['data:text/html,<b>x</b>', false],
    ['ftp://x.mx/a', false],
  ])('esUrlWeb(%s) = %s', (url, esperado) => {
    expect(esUrlWeb(url)).toBe(esperado);
  });

  it('http sólo se vuelve vínculo en desarrollo', () => {
    vi.stubEnv('DEV', true);
    expect(esUrlWeb('http://localhost:8000/staff/x')).toBe(true);
    vi.stubEnv('DEV', false);
    expect(esUrlWeb('http://carta.cooking/staff/x')).toBe(false);
    vi.unstubAllEnvs();
  });
});

describe('largos por puntos de código (B5)', () => {
  it('los campos no llevan maxLength del DOM y un nombre de 200 emojis cabe, 201 no', async () => {
    const { sim, u } = montar();
    for (const nombre of ['Nombre', 'Dirección', 'Teléfono', 'Correo', /Logo/]) expect(campo(nombre)).not.toHaveAttribute('maxlength');
    await u.clear(campo('Nombre'));
    await u.click(campo('Nombre'));
    await u.paste('😀'.repeat(201));
    await u.click(guardar());
    expect(await screen.findByText('Admite hasta 200 caracteres.')).toBeInTheDocument();
    expect(sim.veces('cambiar')).toBe(0);
    await u.clear(campo('Nombre'));
    await u.click(campo('Nombre'));
    await u.paste('😀'.repeat(200));
    await u.click(guardar());
    await screen.findByText('Cambios guardados.');
    expect(sim.ultima('cambiar')!.argumentos[0]).toStrictEqual({ nombre: '😀'.repeat(200) });
  });

  it('teléfono de 21 puntos de código no se envía', async () => {
    const { sim, u } = montar();
    await u.clear(campo('Teléfono'));
    await u.type(campo('Teléfono'), '1'.repeat(21));
    await u.click(guardar());
    expect(await screen.findByText('Admite hasta 20 caracteres.')).toBeInTheDocument();
    expect(sim.veces('cambiar')).toBe(0);
  });
});
