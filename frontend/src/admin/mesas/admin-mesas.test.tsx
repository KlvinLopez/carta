import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ErrorApi } from '../../compartido/http';
import { crearServicioMesasSimulado, mesaDe, mesasSemilla } from '../../mocks/servicioMesasSimulado';
import * as descarga from '../alta/descarga';
import { PantallaMesasConServicio } from './PantallaMesas';
import { montarMesas, RESTAURANTE } from './utilesPrueba';
import type { Mesa, ServicioMesas } from './servicio';
import { useMesas } from './useMesas';

const tarjeta = (numero: number) => screen.getByRole('heading', { name: `Mesa ${numero}` }).closest('li')!;

async function cargada(opciones?: Parameters<typeof montarMesas>[0]) {
  const m = montarMesas(opciones);
  await screen.findByRole('heading', { name: 'Mesa 1' });
  return m;
}

afterEach(() => vi.restoreAllMocks());

describe('lista de mesas (US-21)', () => {
  it('muestra número, capacidad y estado; las dadas de baja van aparte y sin «Regenerar»', async () => {
    await cargada();
    const dos = tarjeta(2);
    expect(within(dos).getByText('2 lugares')).toBeInTheDocument();
    expect(within(dos).getByText('Activa')).toBeInTheDocument();
    expect(screen.getByText('4 mesas activas')).toBeInTheDocument();
    const bajas = screen.getByRole('list', { name: 'Mesas dadas de baja' });
    expect(within(bajas).getByRole('heading', { name: 'Mesa 5' })).toBeInTheDocument();
    expect(within(bajas).getByText('Dada de baja')).toBeInTheDocument();
    expect(within(bajas).queryByRole('button')).toBeNull();
  });

  it('una mesa de 1 lugar dice «1 lugar»', async () => {
    await cargada({ mesas: [mesaDe(1, { capacidad: 1 })] });
    expect(screen.getByText('1 lugar')).toBeInTheDocument();
    expect(screen.getByText('1 mesa activa')).toBeInTheDocument();
  });

  it('muestra «Cargando» y, si falla, el mensaje del servidor con «Reintentar»', async () => {
    const m = montarMesas({ errores: { listar: new ErrorApi(503, 'ERROR_INTERNO', 'El servicio no está disponible.') } });
    expect(screen.getByText('Cargando tus mesas…')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'No pudimos cargar tus mesas' })).toBeInTheDocument();
    expect(screen.getByText('El servicio no está disponible.')).toBeInTheDocument();
    m.sim.fallarUnaVez('listar', new ErrorApi(0, 'SIN_RED', 'Sin red'));
    await m.u.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Sin red')).toBeInTheDocument();
  });

  it('sin mesas ofrece «Agregar mesas»', async () => {
    const { u } = montarMesas({ mesas: [] });
    expect(await screen.findByRole('heading', { name: 'Aún no hay mesas' })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Agregar mesas' }));
    expect(await screen.findByRole('dialog', { name: 'Agregar mesas' })).toBeInTheDocument();
  });

  it('una respuesta que no es lista se trata como error de carga, no revienta', async () => {
    const sim = crearServicioMesasSimulado();
    const servicio = { ...sim.servicio, listar: async () => ({ mesas: [] }) as unknown as Mesa[] };
    render(<PantallaMesasConServicio servicio={servicio} restaurante={RESTAURANTE} />);
    expect(await screen.findByRole('heading', { name: 'No pudimos cargar tus mesas' })).toBeInTheDocument();
  });
});

describe('agregar mesas (AC-21.1)', () => {
  it('crea N mesas de una capacidad y las numera a continuación', async () => {
    const { sim, u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Agregar mesas' }));
    const hoja = await screen.findByRole('dialog', { name: 'Agregar mesas' });
    await u.clear(within(hoja).getByLabelText('Cuántas mesas'));
    await u.type(within(hoja).getByLabelText('Cuántas mesas'), '3');
    await u.clear(within(hoja).getByLabelText('Lugares por mesa'));
    await u.type(within(hoja).getByLabelText('Lugares por mesa'), '2');
    await u.click(within(hoja).getByRole('button', { name: 'Crear mesas' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(sim.llamadas.find((l) => l.metodo === 'crear')!.argumentos).toEqual([{ cantidad: 3, capacidad: 2 }]);
    for (const n of [6, 7, 8]) expect(within(tarjeta(n)).getByText('2 lugares')).toBeInTheDocument();
    expect(screen.getByText('7 mesas activas')).toBeInTheDocument();
  });

  it.each([
    ['0', 'Escribe un número de 1 a 100.'],
    ['101', 'Escribe un número de 1 a 100.'],
    ['abc', 'Escribe un número de 1 a 100.'],
    ['3.5', 'Escribe un número de 1 a 100.'],
    ['1e2', 'Escribe un número de 1 a 100.'],
  ])('rechaza «%s» como cantidad sin llamar a la API', async (texto, mensaje) => {
    const { sim, u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Agregar mesas' }));
    const hoja = await screen.findByRole('dialog');
    await u.clear(within(hoja).getByLabelText('Cuántas mesas'));
    await u.type(within(hoja).getByLabelText('Cuántas mesas'), texto);
    await u.click(within(hoja).getByRole('button', { name: 'Crear mesas' }));
    expect(await within(hoja).findByText(mensaje)).toBeInTheDocument();
    expect(sim.veces('crear')).toBe(0);
  });

  it('rechaza una capacidad de 0 o de más de 50', async () => {
    const { sim, u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Agregar mesas' }));
    const hoja = await screen.findByRole('dialog');
    await u.clear(within(hoja).getByLabelText('Lugares por mesa'));
    await u.type(within(hoja).getByLabelText('Lugares por mesa'), '51');
    await u.click(within(hoja).getByRole('button', { name: 'Crear mesas' }));
    expect(await within(hoja).findByText('Escribe un número de 1 a 50.')).toBeInTheDocument();
    expect(sim.veces('crear')).toBe(0);
  });

  it('avisa en el cliente cuántas caben antes del tope de 500 activas', async () => {
    const muchas = Array.from({ length: 495 }, (_, i) => mesaDe(i + 1));
    const { sim, u } = montarMesas({ mesas: muchas });
    await screen.findByRole('heading', { name: 'Mesa 1' });
    await u.click(screen.getByRole('button', { name: 'Agregar mesas' }));
    const hoja = await screen.findByRole('dialog');
    await u.clear(within(hoja).getByLabelText('Cuántas mesas'));
    await u.type(within(hoja).getByLabelText('Cuántas mesas'), '6');
    await u.click(within(hoja).getByRole('button', { name: 'Crear mesas' }));
    expect(await within(hoja).findByText('Puedes tener hasta 500 mesas activas; te caben 5 más.')).toBeInTheDocument();
    expect(sim.veces('crear')).toBe(0);
  });

  it('el 422 limite_de_mesas del servidor se muestra junto al campo, con su mensaje', async () => {
    const { sim, u } = await cargada();
    const mensaje = 'Cada restaurante puede tener hasta 500 mesas activas.';
    sim.fallarUnaVez(
      'crear',
      new ErrorApi(422, 'PAYLOAD_INVALIDO', mensaje, { errores: [{ campo: 'body.cantidad', mensaje, tipo: 'limite_de_mesas' }] }),
    );
    await u.click(screen.getByRole('button', { name: 'Agregar mesas' }));
    const hoja = await screen.findByRole('dialog');
    await u.click(within(hoja).getByRole('button', { name: 'Crear mesas' }));
    const campo = within(hoja).getByLabelText('Cuántas mesas');
    await waitFor(() => expect(campo).toHaveAttribute('aria-invalid', 'true'));
    expect(within(hoja).getByText(mensaje)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('un error de red deja la hoja abierta con el mensaje y se puede reintentar', async () => {
    const { sim, u } = await cargada();
    sim.fallarUnaVez('crear', new ErrorApi(0, 'SIN_RED', 'No pudimos conectar con Carta.'));
    await u.click(screen.getByRole('button', { name: 'Agregar mesas' }));
    const hoja = await screen.findByRole('dialog');
    await u.click(within(hoja).getByRole('button', { name: 'Crear mesas' }));
    expect(await within(hoja).findByRole('alert')).toHaveTextContent('No pudimos conectar con Carta.');
    await u.click(within(hoja).getByRole('button', { name: 'Crear mesas' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(sim.veces('crear')).toBe(2);
  });
});

describe('regenerar código (AC-21.3)', () => {
  it('pide confirmar y avisa que el QR impreso dejará de servir; «Mejor no» no llama a la API', async () => {
    const { sim, u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Regenerar código de la mesa 2' }));
    const hoja = await screen.findByRole('dialog', { name: '¿Regenerar el código de la mesa 2?' });
    expect(within(hoja).getByText(/El QR impreso de esta mesa dejará de servir/)).toBeInTheDocument();
    await u.click(within(hoja).getByRole('button', { name: 'Mejor no' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(sim.veces('regenerar')).toBe(0);
  });

  it('al confirmar regenera esa mesa y enseña el enlace nuevo', async () => {
    const { sim, u } = await cargada();
    const antes = sim.mesas().find((m) => m.numero === 2)!;
    await u.click(screen.getByRole('button', { name: 'Regenerar código de la mesa 2' }));
    await u.click(await screen.findByRole('button', { name: 'Regenerar código' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const despues = sim.mesas().find((m) => m.numero === 2)!;
    expect(despues.codigo_publico).not.toBe(antes.codigo_publico);
    const aviso = await screen.findByRole('status');
    expect(aviso).toHaveTextContent('Código nuevo para la mesa 2');
    expect(aviso).toHaveTextContent(despues.url_publica);
    expect(aviso).not.toHaveTextContent(antes.url_publica);
  });

  it('409 MESA_INACTIVA: dice el mensaje del servidor en la hoja y relee la lista', async () => {
    const { sim, u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Regenerar código de la mesa 3' }));
    const hoja = await screen.findByRole('dialog');
    sim.fallarUnaVez('regenerar', new ErrorApi(409, 'MESA_INACTIVA', 'Esa mesa está dada de baja; no tiene código que regenerar.'));
    await u.click(within(hoja).getByRole('button', { name: 'Regenerar código' }));
    expect(await within(hoja).findByRole('alert')).toHaveTextContent('Esa mesa está dada de baja');
    await waitFor(() => expect(sim.veces('listar')).toBe(2));
  });

  it('«el último gana»: la respuesta de una regeneración anterior no pinta su QR', async () => {
    let n = 0;
    const pendientes: ((m: Mesa) => void)[] = [];
    const servicio = {
      ...crearServicioMesasSimulado().servicio,
      listar: async () => mesasSemilla.map((m) => ({ ...m })),
      regenerar: vi.fn(
        () =>
          new Promise<Mesa>((resolver) => {
            n += 1;
            pendientes.push(resolver);
          }),
      ),
    } as ServicioMesas;
    const { result } = renderHook(() => useMesas(servicio, 'r1'));
    await waitFor(() => expect(result.current.estado.tipo).toBe('listo'));
    const id = mesasSemilla[1]!.id;
    const nueva = (g: number): Mesa => mesaDe(2, { id, codigo_publico: `codigo-${g}`.padEnd(22, 'x'), url_publica: `https://carta.cooking/m/${g}` });

    let primera!: Promise<Mesa | null>;
    let segunda!: Promise<Mesa | null>;
    act(() => {
      primera = result.current.regenerar(id);
      segunda = result.current.regenerar(id);
    });
    expect(n).toBe(2);
    expect(result.current.regenerando.has(id)).toBe(true);

    // Gana la segunda aunque conteste primero; la primera llega tarde y no pinta nada.
    await act(async () => {
      pendientes[1]!(nueva(2));
      await segunda;
    });
    expect(result.current.codigoNuevo?.url).toBe('https://carta.cooking/m/2');
    await act(async () => {
      pendientes[0]!(nueva(1));
      expect(await primera).toBeNull();
    });
    expect(result.current.codigoNuevo?.url).toBe('https://carta.cooking/m/2');
    expect(result.current.mesas.find((m) => m.id === id)!.url_publica).toBe('https://carta.cooking/m/2');
    expect(result.current.regenerando.size).toBe(0);
  });

  it('«el último gana» también si la anterior contesta primero: no se pinta mientras la última sigue en curso', async () => {
    const pendientes: ((m: Mesa) => void)[] = [];
    const servicio = {
      ...crearServicioMesasSimulado().servicio,
      listar: async () => mesasSemilla.map((m) => ({ ...m })),
      regenerar: vi.fn(() => new Promise<Mesa>((resolver) => pendientes.push(resolver))),
    } as ServicioMesas;
    const { result } = renderHook(() => useMesas(servicio, 'r1'));
    await waitFor(() => expect(result.current.estado.tipo).toBe('listo'));
    const id = mesasSemilla[1]!.id;
    let primera!: Promise<Mesa | null>;
    act(() => {
      primera = result.current.regenerar(id);
      void result.current.regenerar(id);
    });
    await act(async () => {
      pendientes[0]!(mesaDe(2, { id, url_publica: 'https://carta.cooking/m/vieja' }));
      expect(await primera).toBeNull();
    });
    expect(result.current.codigoNuevo).toBeNull();
    expect(result.current.regenerando.has(id)).toBe(true);
  });

  it('mientras una mesa se regenera no se muestra el aviso del código y el PDF espera', async () => {
    let soltar!: (m: Mesa) => void;
    const base = crearServicioMesasSimulado();
    const servicio: ServicioMesas = {
      ...base.servicio,
      regenerar: () => new Promise<Mesa>((r) => (soltar = r)),
    };
    const u = userEvent.setup();
    render(<PantallaMesasConServicio servicio={servicio} restaurante={RESTAURANTE} />);
    await screen.findByRole('heading', { name: 'Mesa 1' });
    await u.click(screen.getByRole('button', { name: 'Regenerar código de la mesa 1' }));
    await u.click(await screen.findByRole('button', { name: 'Regenerar código' }));
    expect(screen.getByRole('button', { name: 'Descargar QR (PDF)' })).toBeDisabled();
    expect(screen.queryByText(/Código nuevo para la mesa/)).toBeNull();
    await act(async () => soltar(mesaDe(1, { url_publica: 'https://carta.cooking/m/nueva' })));
    expect(await screen.findByText(/Código nuevo para la mesa 1/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar QR (PDF)' })).toBeEnabled();
  });
});

describe('descargar el PDF de QR', () => {
  it('muestra el estado de carga y entrega el archivo qr-mesas.pdf', async () => {
    const guardar = vi.spyOn(descarga, 'guardarComoArchivo').mockImplementation(() => {});
    let soltar!: (b: Blob) => void;
    const base = crearServicioMesasSimulado();
    const servicio: ServicioMesas = { ...base.servicio, descargarQr: () => new Promise<Blob>((r) => (soltar = r)) };
    const u = userEvent.setup();
    render(<PantallaMesasConServicio servicio={servicio} restaurante={RESTAURANTE} />);
    await screen.findByRole('heading', { name: 'Mesa 1' });
    await u.click(screen.getByRole('button', { name: 'Descargar QR (PDF)' }));
    const boton = screen.getByRole('button', { name: 'Descargar QR (PDF)' });
    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute('aria-busy', 'true');
    expect(guardar).not.toHaveBeenCalled();
    await act(async () => soltar(new Blob(['%PDF'], { type: 'application/pdf' })));
    await waitFor(() => expect(guardar).toHaveBeenCalledOnce());
    expect(guardar.mock.calls[0]![1]).toBe('qr-mesas.pdf');
    expect(screen.getByRole('button', { name: 'Descargar QR (PDF)' })).toBeEnabled();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each([
    ['CODIGOS_CAMBIADOS', 409, 'Se regeneró un código mientras preparábamos el PDF. Vuelve a pedirlo.'],
    ['SERVICIO_OCUPADO', 503, 'Estamos preparando otro PDF. Inténtalo de nuevo en un momento.'],
    // Sin mesas activas (409 genérico): vale el mensaje que manda el servidor.
    ['CONFLICTO', 409, 'Mensaje técnico del servidor.'],
  ])('%s (%i) dice qué hacer y deja volver a intentar', async (codigo, estado, mensaje) => {
    const guardar = vi.spyOn(descarga, 'guardarComoArchivo').mockImplementation(() => {});
    const { sim, u } = await cargada();
    sim.fallarUnaVez('descargarQr', new ErrorApi(estado, codigo, 'Mensaje técnico del servidor.'));
    await u.click(screen.getByRole('button', { name: 'Descargar QR (PDF)' }));
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(mensaje);
    expect(guardar).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Descargar QR (PDF)' })).toBeEnabled();
    await u.click(screen.getByRole('button', { name: 'Descargar QR (PDF)' }));
    await waitFor(() => expect(guardar).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('sin mesas activas el botón está apagado', async () => {
    await cargada({ mesas: [mesaDe(1, { activa: false })] });
    expect(screen.getByRole('button', { name: 'Descargar QR (PDF)' })).toBeDisabled();
    expect(screen.getByText('No tienes mesas activas. Agrega algunas para generar sus QR.')).toBeInTheDocument();
  });
});
