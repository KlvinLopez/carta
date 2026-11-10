import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ErrorApi } from '../../compartido/http';
import { crearServicioPersonalSimulado, personaDe } from '../../mocks/servicioPersonalSimulado';
import { PantallaPersonalConServicio } from './PantallaPersonal';
import type { Personal, ServicioPersonal } from './servicio';
import { montarPersonal, RESTAURANTE } from './utilesPrueba';

const tarjeta = (nombre: string) => screen.getByRole('heading', { name: nombre }).closest('li')!;
const PIN = 'PIN (4 a 6 números)';

async function cargada(opciones?: Parameters<typeof montarPersonal>[0]) {
  const m = montarPersonal(opciones);
  await screen.findByRole('heading', { name: 'Valeria Ruiz' });
  return m;
}

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('lista por rol (US-26)', () => {
  it('separa capitanes y meseros activos; los dados de baja están en su propia vista', async () => {
    const { u } = await cargada();
    expect(screen.getByRole('heading', { name: 'Capitanes (1)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Meseros (2)' })).toBeInTheDocument();
    expect(within(tarjeta('Valeria Ruiz')).getByText('Capitán')).toBeInTheDocument();
    expect(within(tarjeta('Luis Ortega')).getByText('Mesero')).toBeInTheDocument();
    expect(screen.queryByText('Jorge Peña')).toBeNull();
    expect(screen.getByText('3 de 50 activas')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Dados de baja (1)' }));
    const fila = tarjeta('Jorge Peña');
    expect(within(fila).getByText('Dado de baja')).toBeInTheDocument();
    expect(within(fila).getByRole('button', { name: 'Reactivar a Jorge Peña' })).toBeInTheDocument();
    expect(screen.queryByText('Luis Ortega')).toBeNull();
  });

  it('sin personal, invita a agregar a alguien; con error de carga ofrece «Reintentar»', async () => {
    const vacio = montarPersonal({ personal: [] });
    expect(await screen.findByRole('heading', { name: 'Aún no hay personal' })).toBeInTheDocument();
    vacio.unmount();
    montarPersonal({ errores: { listar: new ErrorApi(503, 'ERROR_INTERNO', 'El servicio no está disponible.') } });
    expect(await screen.findByRole('heading', { name: 'No pudimos cargar a tu equipo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('sólo bajas: la vista de activos lo dice y no queda vacía sin explicación', async () => {
    montarPersonal({ personal: [personaDe(1, { nombre: 'Ana', activo: false })] });
    expect(await screen.findByText(/No hay personal activo/)).toBeInTheDocument();
  });
});

describe('alta (AC-26.1)', () => {
  async function abrirAlta(u: ReturnType<typeof userEvent.setup>) {
    await u.click(screen.getByRole('button', { name: 'Agregar persona' }));
    return screen.findByRole('dialog', { name: 'Agregar persona' });
  }

  it('crea a la persona con nombre, rol y PIN; el PIN viaja una vez y no queda en ningún lado', async () => {
    const { sim, u } = await cargada();
    const crear = vi.spyOn(sim.servicio, 'crear');
    const hoja = await abrirAlta(u);
    await u.type(within(hoja).getByLabelText('Nombre'), 'Rosa Gil');
    await u.click(within(hoja).getByRole('button', { name: 'Capitán' }));
    await u.type(within(hoja).getByLabelText(PIN), '482913');
    await u.click(within(hoja).getByRole('button', { name: 'Agregar persona' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(crear).toHaveBeenCalledOnce();
    expect(crear.mock.calls[0]![1]).toEqual({ nombre: 'Rosa Gil', rol: 'capitan', pin: '482913' });
    expect(within(tarjeta('Rosa Gil')).getByText('Capitán')).toBeInTheDocument();
    expect(JSON.stringify(sim.llamadas)).not.toContain('482913');
    expect(document.body.innerHTML).not.toContain('482913');
    expect(JSON.stringify({ ...window.localStorage })).not.toContain('482913');
    expect(JSON.stringify({ ...window.sessionStorage })).not.toContain('482913');
  });

  it('el campo del PIN no deja ver ni guardar el valor: type=password, new-password, numérico', async () => {
    const { u } = await cargada();
    const pin = within(await abrirAlta(u)).getByLabelText(PIN);
    expect(pin).toHaveAttribute('type', 'password');
    expect(pin).toHaveAttribute('autocomplete', 'new-password');
    expect(pin).toHaveAttribute('inputmode', 'numeric');
  });

  it('valida nombre y PIN antes de enviar, con el mismo criterio del servidor (sólo dígitos, 4 a 6)', async () => {
    const { sim, u } = await cargada();
    const hoja = await abrirAlta(u);
    await u.click(within(hoja).getByRole('button', { name: 'Agregar persona' }));
    expect(await within(hoja).findByText('Escribe el nombre de la persona.')).toBeInTheDocument();
    expect(within(hoja).getByText('El PIN lleva de 4 a 6 números.')).toBeInTheDocument();
    await u.type(within(hoja).getByLabelText('Nombre'), 'Rosa');
    await u.type(within(hoja).getByLabelText(PIN), '123');
    await u.click(within(hoja).getByRole('button', { name: 'Agregar persona' }));
    expect(await within(hoja).findByText('El PIN lleva de 4 a 6 números.')).toBeInTheDocument();
    expect(sim.veces('crear')).toBe(0);
    // Y un nombre de más de 60 puntos de código (12 emojis de familia = 12 × 7 unidades UTF-16 pero 12 × 5 puntos).
    await u.clear(within(hoja).getByLabelText('Nombre'));
    await u.type(within(hoja).getByLabelText('Nombre'), 'x'.repeat(61));
    await u.type(within(hoja).getByLabelText(PIN), '4');
    await u.click(within(hoja).getByRole('button', { name: 'Agregar persona' }));
    expect(await within(hoja).findByText('El nombre admite hasta 60 caracteres.')).toBeInTheDocument();
    expect(sim.veces('crear')).toBe(0);
  });

  it.each([['١٢٣٤'], ['１２３４'], ['12 34'], ['abcd'], ['12ab']])(
    'rechaza el PIN «%s» sin normalizarlo y sin llamar a la API',
    async (pinMalo) => {
      const { sim, u } = await cargada();
      const hoja = await abrirAlta(u);
      await u.type(within(hoja).getByLabelText('Nombre'), 'Rosa');
      const pin = within(hoja).getByLabelText(PIN);
      await u.type(pin, pinMalo);
      // Nada se «arregla» en silencio: el campo conserva lo tecleado y avisa al instante.
      expect(pin).toHaveValue(pinMalo);
      expect(within(hoja).getByText('El PIN sólo lleva números del 0 al 9.')).toBeInTheDocument();
      await u.click(within(hoja).getByRole('button', { name: 'Agregar persona' }));
      expect(await within(hoja).findAllByText('El PIN sólo lleva números del 0 al 9.')).not.toHaveLength(0);
      expect(sim.veces('crear')).toBe(0);
    },
  );

  it('0000 y 1234 se aceptan (el servidor no los rechaza)', async () => {
    const { sim, u } = await cargada();
    for (const [nombre, pin] of [['Cero', '0000'], ['Uno', '1234']] as const) {
      const hoja = await abrirAlta(u);
      await u.type(within(hoja).getByLabelText('Nombre'), nombre);
      await u.type(within(hoja).getByLabelText(PIN), pin);
      await u.click(within(hoja).getByRole('button', { name: 'Agregar persona' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    }
    expect(sim.veces('crear')).toBe(2);
    expect(screen.getByRole('heading', { name: 'Cero' })).toBeInTheDocument();
  });

  it('409 nombre repetido: el mensaje del servidor queda junto al campo Nombre y el PIN se pide otra vez', async () => {
    const { u } = await cargada();
    const hoja = await abrirAlta(u);
    await u.type(within(hoja).getByLabelText('Nombre'), 'luis ortega');
    await u.type(within(hoja).getByLabelText(PIN), '4829');
    await u.click(within(hoja).getByRole('button', { name: 'Agregar persona' }));
    const campo = within(hoja).getByLabelText('Nombre');
    await waitFor(() => expect(campo).toHaveAttribute('aria-invalid', 'true'));
    expect(campo).toHaveAccessibleDescription('Ya hay una persona activa con ese nombre.');
    expect(within(hoja).getByLabelText(PIN)).toHaveValue('');
    expect(within(hoja).getByText('Vuelve a escribir el PIN.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('422 de tope (50 activos): el mensaje del servidor, sin «detail» ni códigos', async () => {
    const lleno = Array.from({ length: 50 }, (_, i) => personaDe(i + 1, { nombre: `Persona ${i + 1}` }));
    montarPersonal({ personal: lleno });
    await screen.findByRole('heading', { name: 'Persona 1' });
    const u = userEvent.setup();
    await u.click(screen.getByRole('button', { name: 'Agregar persona' }));
    const hoja = await screen.findByRole('dialog');
    await u.type(within(hoja).getByLabelText('Nombre'), 'Número 51');
    await u.type(within(hoja).getByLabelText(PIN), '4829');
    await u.click(within(hoja).getByRole('button', { name: 'Agregar persona' }));
    expect(await within(hoja).findByText('Cada restaurante puede tener hasta 50 personas activas.')).toBeInTheDocument();
    expect(hoja.textContent).not.toMatch(/detail|PAYLOAD_INVALIDO|limite_de_personal/);
    // El tope no es del nombre (el servidor manda `campo: "body"`), así que ese campo no se marca; el PIN
    // sí se vació (un 422 es un «no» definitivo) y el aviso sale junto a ese campo, no en la banda.
    expect(within(hoja).getByLabelText('Nombre')).not.toHaveAttribute('aria-invalid', 'true');
    expect(within(hoja).getByLabelText(PIN)).toHaveValue('');
    expect(within(hoja).getByLabelText(PIN)).toHaveAccessibleDescription('Vuelve a escribir el PIN.');
  });

  it('un 422 que apunta al PIN lo muestra junto al campo del PIN', async () => {
    const { sim, u } = await cargada();
    sim.fallarUnaVez(
      'crear',
      new ErrorApi(422, 'PAYLOAD_INVALIDO', 'El PIN debe tener de 4 a 6 dígitos.', {
        errores: [{ campo: 'body.pin', mensaje: 'El PIN debe tener de 4 a 6 dígitos.', tipo: 'string_pattern_mismatch' }],
      }),
    );
    const hoja = await abrirAlta(u);
    await u.type(within(hoja).getByLabelText('Nombre'), 'Rosa');
    await u.type(within(hoja).getByLabelText(PIN), '4829');
    await u.click(within(hoja).getByRole('button', { name: 'Agregar persona' }));
    await waitFor(() => expect(within(hoja).getByLabelText(PIN)).toHaveAttribute('aria-invalid', 'true'));
    expect(within(hoja).getByLabelText(PIN)).toHaveAccessibleDescription('El PIN debe tener de 4 a 6 dígitos.');
  });
});

describe('dar de baja y reactivar (AC-26.3)', () => {
  it('la confirmación avisa que la sesión se cierra al instante; «Mejor no» no llama a la API', async () => {
    const { sim, u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Dar de baja a Luis Ortega' }));
    const hoja = await screen.findByRole('dialog', { name: '¿Dar de baja a Luis Ortega?' });
    expect(within(hoja).getByText(/Su sesión se cierra al instante/)).toBeInTheDocument();
    await u.click(within(hoja).getByRole('button', { name: 'Mejor no' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(sim.veces('cambiar')).toBe(0);
    expect(screen.getByRole('heading', { name: 'Luis Ortega' })).toBeInTheDocument();
  });

  it('al confirmar manda sólo {activo: false}; la persona pasa a «Dados de baja» al instante (optimista)', async () => {
    let soltar!: (p: Personal) => void;
    const base = crearServicioPersonalSimulado();
    const cambiar = vi.fn(() => new Promise<Personal>((r) => (soltar = r)));
    const servicio: ServicioPersonal = { ...base.servicio, cambiar };
    const u = userEvent.setup();
    render(<PantallaPersonalConServicio servicio={servicio} restaurante={RESTAURANTE} />);
    await screen.findByRole('heading', { name: 'Valeria Ruiz' });
    await u.click(screen.getByRole('button', { name: 'Dar de baja a Luis Ortega' }));
    await u.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Dar de baja' }));
    expect(cambiar).toHaveBeenCalledWith('00000000-0000-4000-8000-0000000e0002', { activo: false });
    // Antes de que conteste el servidor ya salió de los activos.
    expect(screen.queryByRole('heading', { name: 'Luis Ortega' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Dados de baja (2)' })).toBeInTheDocument();
    await act(async () => soltar({ ...personaDe(2, { nombre: 'Luis Ortega', activo: false }) }));
    expect(screen.getByRole('button', { name: 'Dados de baja (2)' })).toBeInTheDocument();
  });

  it('si el servidor dice que no, vuelve a donde estaba y muestra su mensaje', async () => {
    const { sim, u } = await cargada();
    sim.fallarUnaVez('cambiar', new ErrorApi(0, 'SIN_RED', 'No pudimos conectar con Carta. Revisa tu conexión.'));
    await u.click(screen.getByRole('button', { name: 'Dar de baja a Luis Ortega' }));
    await u.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Dar de baja' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar con Carta.');
    expect(screen.getByRole('heading', { name: 'Luis Ortega' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dados de baja (1)' })).toBeInTheDocument();
    expect(sim.personal().find((p) => p.nombre === 'Luis Ortega')!.activo).toBe(true);
  });

  it('reactiva desde «Dados de baja» sin confirmación', async () => {
    const { sim, u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Dados de baja (1)' }));
    await u.click(screen.getByRole('button', { name: 'Reactivar a Jorge Peña' }));
    await waitFor(() => expect(sim.personal().find((p) => p.nombre === 'Jorge Peña')!.activo).toBe(true));
    expect(sim.llamadas.find((l) => l.metodo === 'cambiar')!.argumentos[1]).toEqual({ activo: true });
    expect(screen.getByRole('button', { name: 'Activos (4)' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('reactivar con el nombre ya tomado (409) revierte y dice el mensaje del servidor', async () => {
    const { u } = montarPersonal({
      personal: [personaDe(1, { nombre: 'Ana' }), personaDe(2, { nombre: 'Ana', activo: false })],
    });
    await screen.findByRole('heading', { name: 'Ana' });
    await u.click(screen.getByRole('button', { name: 'Dados de baja (1)' }));
    await u.click(screen.getByRole('button', { name: 'Reactivar a Ana' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya hay una persona activa con ese nombre.');
    expect(screen.getByRole('button', { name: 'Dados de baja (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reactivar a Ana' })).toBeEnabled();
  });

  it('reactivar con 50 activos (422) revierte y dice el tope', async () => {
    const lleno = [
      ...Array.from({ length: 50 }, (_, i) => personaDe(i + 1, { nombre: `Persona ${i + 1}` })),
      personaDe(60, { nombre: 'En baja', activo: false }),
    ];
    montarPersonal({ personal: lleno });
    await screen.findByRole('heading', { name: 'Persona 1' });
    const u = userEvent.setup();
    await u.click(screen.getByRole('button', { name: 'Dados de baja (1)' }));
    await u.click(screen.getByRole('button', { name: 'Reactivar a En baja' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('hasta 50 personas activas');
    expect(screen.getByRole('button', { name: 'Dados de baja (1)' })).toBeInTheDocument();
  });

  it('una persona con una escritura en vuelo no acepta otra (sin doble envío)', async () => {
    const base = crearServicioPersonalSimulado();
    const cambiar = vi.fn(() => new Promise<Personal>(() => {}));
    const u = userEvent.setup();
    render(<PantallaPersonalConServicio servicio={{ ...base.servicio, cambiar }} restaurante={RESTAURANTE} />);
    await screen.findByRole('heading', { name: 'Valeria Ruiz' });
    await u.click(screen.getByRole('button', { name: 'Dados de baja (1)' }));
    await u.click(screen.getByRole('button', { name: 'Reactivar a Jorge Peña' }));
    // Optimista: ya está entre los activos, con todo apagado hasta que conteste el servidor.
    await u.click(screen.getByRole('button', { name: 'Activos (4)' }));
    for (const accion of ['Editar a', 'Cambiar el PIN de', 'Dar de baja a']) {
      expect(screen.getByRole('button', { name: `${accion} Jorge Peña` })).toBeDisabled();
    }
    expect(cambiar).toHaveBeenCalledOnce();
  });
});

describe('editar nombre y rol', () => {
  async function abrirEdicion(u: ReturnType<typeof userEvent.setup>, nombre: string) {
    await u.click(screen.getByRole('button', { name: `Editar a ${nombre}` }));
    return screen.findByRole('dialog', { name: `Editar a ${nombre}` });
  }

  it('manda sólo lo que cambió y avisa que cambiar el rol cierra la sesión', async () => {
    const { sim, u } = await cargada();
    const hoja = await abrirEdicion(u, 'Luis Ortega');
    expect(within(hoja).getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    await u.click(within(hoja).getByRole('button', { name: 'Capitán' }));
    expect(within(hoja).getByText(/se cierra su sesión actual/)).toBeInTheDocument();
    await u.click(within(hoja).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(sim.llamadas.find((l) => l.metodo === 'cambiar')!.argumentos[1]).toStrictEqual({ rol: 'capitan' });
    expect(screen.getByRole('heading', { name: 'Capitanes (2)' })).toBeInTheDocument();
  });

  it('un nombre nuevo viaja recortado; un nombre vacío no se envía', async () => {
    const { sim, u } = await cargada();
    const hoja = await abrirEdicion(u, 'Marta Díaz');
    const campo = within(hoja).getByLabelText('Nombre');
    await u.clear(campo);
    await u.click(within(hoja).getByRole('button', { name: 'Guardar cambios' }));
    expect(sim.veces('cambiar')).toBe(0);
    await u.type(campo, '  Marta Díaz Vega ');
    await u.click(within(hoja).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(sim.llamadas.find((l) => l.metodo === 'cambiar')!.argumentos[1]).toStrictEqual({ nombre: 'Marta Díaz Vega' });
  });

  it('409 por nombre repetido se muestra junto al campo y la hoja sigue abierta', async () => {
    const { u } = await cargada();
    const hoja = await abrirEdicion(u, 'Marta Díaz');
    const campo = within(hoja).getByLabelText('Nombre');
    await u.clear(campo);
    await u.type(campo, 'Luis Ortega');
    await u.click(within(hoja).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(campo).toHaveAttribute('aria-invalid', 'true'));
    expect(campo).toHaveAccessibleDescription('Ya hay una persona activa con ese nombre.');
  });
});

describe('reasignar el PIN (AC-26.2)', () => {
  async function abrirPin(u: ReturnType<typeof userEvent.setup>, nombre = 'Luis Ortega') {
    await u.click(screen.getByRole('button', { name: `Cambiar el PIN de ${nombre}` }));
    return screen.findByRole('dialog', { name: `Nuevo PIN para ${nombre}` });
  }

  it('pide el PIN dos veces; si no coinciden no llama a la API', async () => {
    const { sim, u } = await cargada();
    const hoja = await abrirPin(u);
    await u.type(within(hoja).getByLabelText('PIN nuevo (4 a 6 números)'), '4829');
    await u.type(within(hoja).getByLabelText('Repite el PIN nuevo'), '4830');
    await u.click(within(hoja).getByRole('button', { name: 'Cambiar PIN' }));
    expect(await within(hoja).findByText('Los dos PIN deben ser iguales.')).toBeInTheDocument();
    expect(sim.veces('reasignarPin')).toBe(0);
  });

  it('con PIN y confirmación iguales lo envía una vez, cierra y no lo muestra ni lo guarda', async () => {
    const { sim, u } = await cargada();
    const reasignar = vi.spyOn(sim.servicio, 'reasignarPin');
    const hoja = await abrirPin(u);
    await u.type(within(hoja).getByLabelText('PIN nuevo (4 a 6 números)'), '482913');
    await u.type(within(hoja).getByLabelText('Repite el PIN nuevo'), '482913');
    await u.click(within(hoja).getByRole('button', { name: 'Cambiar PIN' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(reasignar).toHaveBeenCalledOnce();
    expect(reasignar.mock.calls[0]![1]).toBe('482913');
    expect(sim.pinesReasignados()).toBe(1);
    expect(await screen.findByRole('status')).toHaveTextContent('Luis Ortega entra con su PIN nuevo');
    expect(document.body.innerHTML).not.toContain('482913');
    expect(JSON.stringify(sim.llamadas)).not.toContain('482913');
    expect(JSON.stringify({ ...window.localStorage, ...window.sessionStorage })).not.toContain('482913');
  });

  it('si falla de verdad (4xx), vacía los dos campos y pide volver a escribirlo', async () => {
    const { sim, u } = await cargada();
    sim.fallarUnaVez('reasignarPin', new ErrorApi(404, 'RECURSO_NO_ENCONTRADO', 'No encontramos este recurso.'));
    const hoja = await abrirPin(u);
    await u.type(within(hoja).getByLabelText('PIN nuevo (4 a 6 números)'), '4829');
    await u.type(within(hoja).getByLabelText('Repite el PIN nuevo'), '4829');
    await u.click(within(hoja).getByRole('button', { name: 'Cambiar PIN' }));
    expect(await within(hoja).findByRole('alert')).toHaveTextContent('No encontramos este recurso. Vuelve a escribir el PIN.');
    expect(within(hoja).getByLabelText('PIN nuevo (4 a 6 números)')).toHaveValue('');
    expect(within(hoja).getByLabelText('Repite el PIN nuevo')).toHaveValue('');
  });

  it('también se puede reasignar a alguien dado de baja', async () => {
    const { sim, u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Dados de baja (1)' }));
    const hoja = await abrirPin(u, 'Jorge Peña');
    await u.type(within(hoja).getByLabelText('PIN nuevo (4 a 6 números)'), '0000');
    await u.type(within(hoja).getByLabelText('Repite el PIN nuevo'), '0000');
    await u.click(within(hoja).getByRole('button', { name: 'Cambiar PIN' }));
    await waitFor(() => expect(sim.pinesReasignados()).toBe(1));
  });
});

describe('el PIN se conserva sólo si el servidor no aplicó nada (A3)', () => {
  async function abrirAlta(u: ReturnType<typeof userEvent.setup>) {
    await u.click(screen.getByRole('button', { name: 'Agregar persona' }));
    return screen.findByRole('dialog', { name: 'Agregar persona' });
  }
  const rellenar = async (u: ReturnType<typeof userEvent.setup>, hoja: HTMLElement) => {
    await u.type(within(hoja).getByLabelText('Nombre'), 'Rosa Gil');
    await u.type(within(hoja).getByLabelText(PIN), '482913');
  };

  it.each([
    [503, 'SERVICIO_OCUPADO', 'Ocupado.'],
    [408, 'SUBIDA_INCOMPLETA', 'Tardó demasiado.'],
    [0, 'SIN_RED', 'No pudimos conectar con Carta.'],
  ])('%i %s: el PIN sigue en el campo y el segundo envío manda el mismo cuerpo', async (estado, codigo, mensaje) => {
    const { sim, u } = await cargada();
    const crear = vi.spyOn(sim.servicio, 'crear');
    sim.fallarUnaVez('crear', new ErrorApi(estado, codigo, mensaje));
    const hoja = await abrirAlta(u);
    await rellenar(u, hoja);
    await u.click(within(hoja).getByRole('button', { name: 'Agregar persona' }));
    expect(await within(hoja).findByRole('alert')).toHaveTextContent(mensaje);
    expect(within(hoja).getByLabelText(PIN)).toHaveValue('482913');
    expect(within(hoja).queryByText('Vuelve a escribir el PIN.')).toBeNull();
    await u.click(within(hoja).getByRole('button', { name: 'Agregar persona' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(crear).toHaveBeenCalledTimes(2);
    expect(crear.mock.calls[1]![1]).toEqual(crear.mock.calls[0]![1]);
    expect(crear.mock.calls[1]![1]).toEqual({ nombre: 'Rosa Gil', rol: 'mesero', pin: '482913' });
  });

  it('un 500 (o cualquier otro error): el PIN se pide otra vez', async () => {
    const { sim, u } = await cargada();
    sim.fallarUnaVez('crear', new ErrorApi(500, 'ERROR_INTERNO', 'Algo salió mal.'));
    const hoja = await abrirAlta(u);
    await rellenar(u, hoja);
    await u.click(within(hoja).getByRole('button', { name: 'Agregar persona' }));
    await within(hoja).findByText('Algo salió mal.');
    expect(within(hoja).getByLabelText(PIN)).toHaveValue('');
    expect(within(hoja).getByLabelText(PIN)).toHaveAccessibleDescription('Vuelve a escribir el PIN.');
  });

  it('tras una caída de red, un 409 de nombre repetido avisa que el alta quizá ya se guardó', async () => {
    const { sim, u } = await cargada();
    sim.fallarUnaVez('crear', new ErrorApi(0, 'SIN_RED', 'No pudimos conectar con Carta.'));
    const hoja = await abrirAlta(u);
    await rellenar(u, hoja);
    await u.click(within(hoja).getByRole('button', { name: 'Agregar persona' }));
    await within(hoja).findByRole('alert');
    sim.fallarUnaVez('crear', new ErrorApi(409, 'CONFLICTO', 'Ya hay una persona activa con ese nombre.'));
    await u.click(within(hoja).getByRole('button', { name: 'Agregar persona' }));
    await waitFor(() => expect(within(hoja).getByLabelText('Nombre')).toHaveAttribute('aria-invalid', 'true'));
    expect(within(hoja).getByLabelText('Nombre')).toHaveAccessibleDescription(
      'Ya hay una persona activa con ese nombre. Puede que el alta ya se haya guardado: revisa la lista.',
    );
  });

  it('un 409 sin caída de red previa no lleva ese aviso', async () => {
    const { u } = await cargada();
    const hoja = await abrirAlta(u);
    await u.type(within(hoja).getByLabelText('Nombre'), 'Luis Ortega');
    await u.type(within(hoja).getByLabelText(PIN), '4829');
    await u.click(within(hoja).getByRole('button', { name: 'Agregar persona' }));
    await waitFor(() => expect(within(hoja).getByLabelText('Nombre')).toHaveAttribute('aria-invalid', 'true'));
    expect(within(hoja).getByLabelText('Nombre')).not.toHaveAccessibleDescription(/ya se haya guardado/);
  });

  it('reasignar: con 503 conserva el PIN y la confirmación; el reintento manda el mismo PIN', async () => {
    const { sim, u } = await cargada();
    const reasignar = vi.spyOn(sim.servicio, 'reasignarPin');
    sim.fallarUnaVez('reasignarPin', new ErrorApi(503, 'SERVICIO_OCUPADO', 'Ocupado.'));
    await u.click(screen.getByRole('button', { name: 'Cambiar el PIN de Luis Ortega' }));
    const hoja = await screen.findByRole('dialog');
    await u.type(within(hoja).getByLabelText('PIN nuevo (4 a 6 números)'), '4829');
    await u.type(within(hoja).getByLabelText('Repite el PIN nuevo'), '4829');
    await u.click(within(hoja).getByRole('button', { name: 'Cambiar PIN' }));
    expect(await within(hoja).findByRole('alert')).toHaveTextContent('Ocupado.');
    expect(within(hoja).getByLabelText('PIN nuevo (4 a 6 números)')).toHaveValue('4829');
    expect(within(hoja).getByLabelText('Repite el PIN nuevo')).toHaveValue('4829');
    await u.click(within(hoja).getByRole('button', { name: 'Cambiar PIN' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(reasignar.mock.calls.map((c) => c[1])).toEqual(['4829', '4829']);
  });

  it.each([['١٢٣٤'], ['12 34'], ['abcd'], ['123']])('reasignar rechaza «%s» en el cliente, sin llamar a la API', async (malo) => {
    const { sim, u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Cambiar el PIN de Luis Ortega' }));
    const hoja = await screen.findByRole('dialog');
    await u.type(within(hoja).getByLabelText('PIN nuevo (4 a 6 números)'), malo);
    await u.type(within(hoja).getByLabelText('Repite el PIN nuevo'), malo);
    await u.click(within(hoja).getByRole('button', { name: 'Cambiar PIN' }));
    expect(await within(hoja).findAllByText(/El PIN (sólo lleva números del 0 al 9|lleva de 4 a 6 números)\./)).not.toHaveLength(0);
    expect(sim.veces('reasignarPin')).toBe(0);
  });
});

describe('nombres (B5, A5-5)', () => {
  it('el alta recorta el nombre: «  Rosa Gil  » viaja como «Rosa Gil»', async () => {
    const { sim, u } = await cargada();
    const crear = vi.spyOn(sim.servicio, 'crear');
    await u.click(screen.getByRole('button', { name: 'Agregar persona' }));
    const hoja = await screen.findByRole('dialog');
    await u.type(within(hoja).getByLabelText('Nombre'), '  Rosa Gil  ');
    await u.type(within(hoja).getByLabelText(PIN), '4829');
    await u.click(within(hoja).getByRole('button', { name: 'Agregar persona' }));
    await waitFor(() => expect(crear).toHaveBeenCalledOnce());
    expect(crear.mock.calls[0]![1].nombre).toBe('Rosa Gil');
  });

  it('el campo no recorta por unidades UTF-16: 40 emojis (80 unidades, 40 puntos) caben; 61 no', async () => {
    const { sim, u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Agregar persona' }));
    const hoja = await screen.findByRole('dialog');
    const nombre = within(hoja).getByLabelText('Nombre');
    expect(nombre).not.toHaveAttribute('maxlength');
    await u.type(nombre, '😀'.repeat(40));
    expect(nombre).toHaveValue('😀'.repeat(40));
    await u.type(within(hoja).getByLabelText(PIN), '4829');
    await u.click(within(hoja).getByRole('button', { name: 'Agregar persona' }));
    await waitFor(() => expect(sim.veces('crear')).toBe(1));
  });
});
