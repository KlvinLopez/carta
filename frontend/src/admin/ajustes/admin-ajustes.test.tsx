import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorApi } from '../../compartido/http';
import {
  crearServicioAjustesSimulado,
  restauranteSemilla,
  type AjustesSimulado,
  type OpcionesAjustesSimulado,
} from '../../mocks/servicioAjustesSimulado';
import { mesaDe } from '../../mocks/servicioMesasSimulado';
import type { Restaurante } from '../armazon/RestauranteActivo';
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
  const vista = render(<Anfitrion sim={sim} inicial={opciones.restaurante ?? restauranteSemilla} guardados={guardados} />);
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
  it('muestra el enlace de la mesa 1 como ejemplo del menú y la entrada del personal, cada uno con «Copiar»', async () => {
    const { u } = montar({ mesa: mesaDe(1, { url_publica: 'https://carta.cooking/m/Jx3k9QwLmN2pR7sT4vY8zA' }) });
    const enlaces = await screen.findByRole('list');
    expect(await within(enlaces).findByRole('link', { name: 'https://carta.cooking/m/Jx3k9QwLmN2pR7sT4vY8zA' })).toBeInTheDocument();
    expect(within(enlaces).getByText('Menú (ejemplo: la mesa 1)')).toBeInTheDocument();
    expect(within(enlaces).getByRole('link', { name: 'https://carta.cooking/staff/taqueria-el-paso' })).toBeInTheDocument();
    await u.click(within(enlaces).getByRole('button', { name: 'Copiar menú (ejemplo: la mesa 1)' }));
    expect(escribir).toHaveBeenCalledWith('https://carta.cooking/m/Jx3k9QwLmN2pR7sT4vY8zA');
    expect(within(enlaces).getByRole('button', { name: /Copiar menú/ })).toHaveTextContent('Copiado');
  });

  it('copiar el enlace del personal copia ese enlace', async () => {
    const { u } = montar();
    await u.click(await screen.findByRole('button', { name: 'Copiar entrada del personal' }));
    expect(escribir).toHaveBeenCalledWith('https://carta.cooking/staff/taqueria-el-paso');
  });

  it('si el navegador no deja copiar lo dice y el enlace sigue a la vista', async () => {
    escribir.mockRejectedValue(new Error('denegado'));
    const { u } = montar();
    await u.click(await screen.findByRole('button', { name: 'Copiar entrada del personal' }));
    expect(await screen.findByText(/No pudimos copiar/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /staff\/taqueria-el-paso/ })).toBeInTheDocument();
  });

  it('sin mesas explica cómo conseguir el enlace del menú', async () => {
    montar({ mesa: null });
    expect(await screen.findByText(/Aún no tienes mesas/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Copiar menú/ })).toBeNull();
  });

  it('un enlace que no es http(s) no se vuelve vínculo', async () => {
    montar({ mesa: mesaDe(1, { url_publica: 'javascript:alert(1)' }) });
    // `new URL('javascript:…').origin` es «null»: la entrada del personal cae al origen de la página.
    await screen.findByRole('button', { name: 'Copiar entrada del personal' });
    expect(screen.queryByRole('link', { name: /javascript/ })).toBeNull();
  });
});
