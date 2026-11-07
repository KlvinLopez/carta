import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorApi } from '../../compartido/http';
import { crearServicioSimulado, type OpcionesSimulado } from '../../mocks/servicioSimulado';
import { CLAVE_ALTA } from '../almacen';
import { AsistenteConServicio } from './Asistente';
import { leerProgreso } from './progreso';

/** A1: recargar, perder la sesión o volver «atrás» no obliga a repetir el paso 1 (otro restaurante). */
const PDF = () => new File(['%PDF-1.4 carta'], 'carta.pdf', { type: 'application/pdf' });

function montar(sim: ReturnType<typeof crearServicioSimulado>) {
  const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const vista = render(
    <MemoryRouter>
      <AsistenteConServicio servicio={sim.servicio} />
    </MemoryRouter>,
  );
  return { u, vista };
}

async function avanzar(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

type U = ReturnType<typeof userEvent.setup>;
async function hastaLeyendo(u: U) {
  await u.type(screen.getByLabelText('Nombre del restaurante'), 'Taquería El Paso');
  await u.click(screen.getByRole('button', { name: 'Continuar' }));
  await u.upload(await screen.findByLabelText('Elegir archivo'), PDF());
  await u.click(await screen.findByRole('button', { name: 'Subir y leer mi carta' }));
  await screen.findByRole('heading', { name: 'Estamos leyendo tu carta' });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  window.sessionStorage.clear();
  window.localStorage.clear();
});
afterEach(() => vi.useRealTimers());

describe('reanudar el asistente (A1)', () => {
  it('recargar mientras lee la carta no crea otro restaurante y sigue sondeando la misma importación', async () => {
    const sim = crearServicioSimulado({ consultasAntesDeTerminar: 3 });
    const primera = montar(sim);
    await hastaLeyendo(primera.u);
    expect(sim.veces('crearRestaurante')).toBe(1);
    primera.vista.unmount(); // «recargar»: se pierde el estado en memoria, queda sessionStorage

    montar(sim);
    expect(await screen.findByRole('heading', { name: 'Estamos leyendo tu carta' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Nombre del restaurante')).not.toBeInTheDocument();
    expect(screen.getByText('Paso 2 de 7', { exact: false })).toBeInTheDocument();
    await avanzar(12_000);
    expect(await screen.findByRole('heading', { name: '¡Ya leímos tu carta!' })).toBeInTheDocument();
    expect(sim.veces('crearRestaurante')).toBe(1);
    expect(sim.veces('subirCarta')).toBe(1);
  });

  it('recargar en «Revisa» vuelve a leer el borrador de la importación y sigue en Revisa', async () => {
    const sim = crearServicioSimulado({ consultasAntesDeTerminar: 0 });
    const primera = montar(sim);
    await hastaLeyendo(primera.u);
    await avanzar(4000);
    await primera.u.click(await screen.findByRole('button', { name: 'Revisar mi carta' }));
    await screen.findByRole('heading', { name: 'Revisa tu carta' });
    primera.vista.unmount();

    montar(sim);
    expect(await screen.findByRole('heading', { name: 'Revisa tu carta' })).toBeInTheDocument();
    expect(screen.getByText('Paso 3 de 7', { exact: false })).toBeInTheDocument();
    expect(sim.veces('crearRestaurante')).toBe(1);
    expect(screen.getAllByLabelText('Platillo').map((e) => (e as HTMLInputElement).value)).toContain('Pastor');
  });

  it('si la importación ya se confirmó (otra pestaña) salta a Mesas', async () => {
    const sim = crearServicioSimulado({ consultasAntesDeTerminar: 0 });
    const primera = montar(sim);
    await hastaLeyendo(primera.u);
    await avanzar(4000);
    await primera.u.click(await screen.findByRole('button', { name: 'Revisar mi carta' }));
    await screen.findByRole('heading', { name: 'Revisa tu carta' });
    primera.vista.unmount();
    sim.marcarConfirmada();
    montar(sim);
    expect(await screen.findByRole('heading', { name: '¿Cuántas mesas tienes?' })).toBeInTheDocument();
  });

  it('si no puede retomar, lo dice y ofrece reintentar o subir de nuevo', async () => {
    const sim = crearServicioSimulado({ consultasAntesDeTerminar: 0 });
    const primera = montar(sim);
    await hastaLeyendo(primera.u);
    primera.vista.unmount();
    sim.fallarUnaVez('consultarImportacion', new ErrorApi(0, 'SIN_RED', 'No pudimos conectar con Carta.'));
    const { u } = montar(sim);
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar con Carta.');
    await u.click(screen.getByRole('button', { name: 'Reintentar' }));
    // La lectura ya había terminado mientras no estábamos: se retoma directamente en el borrador listo.
    expect(await screen.findByRole('heading', { name: '¡Ya leímos tu carta!' })).toBeInTheDocument();
    expect(sim.veces('crearRestaurante')).toBe(1);
  });

  it('el avance guardado nunca lleva el PIN ni el borrador editado', async () => {
    const sim = crearServicioSimulado({ consultasAntesDeTerminar: 0 });
    const { u } = montar(sim);
    await hastaLeyendo(u);
    await avanzar(4000);
    await u.click(await screen.findByRole('button', { name: 'Revisar mi carta' }));
    await screen.findByRole('heading', { name: 'Revisa tu carta' });
    expect(window.sessionStorage.getItem(CLAVE_ALTA)).not.toContain('Pastor');
    expect(window.localStorage.length).toBe(0);
    // Sigue hasta el personal: el PIN se envía y no queda en ningún almacén.
    const cecina = screen.getAllByLabelText('Platillo').find((el) => (el as HTMLInputElement).value === 'Cecina enchilada')!.closest('li') as HTMLElement;
    await u.type(within(cecina).getByLabelText('Precio'), '38');
    await u.click(screen.getByRole('button', { name: 'Continuar' }));
    await u.click(await screen.findByRole('button', { name: 'Confirmar y crear mi menú' }));
    await u.click(await screen.findByRole('button', { name: 'Omitir por ahora' }));
    await u.type(await screen.findByLabelText('Nombre'), 'Luis');
    await u.type(screen.getByLabelText('PIN (4 a 6 números)'), '482913');
    await u.click(screen.getByRole('button', { name: 'Agregar persona' }));
    await screen.findByRole('list', { name: 'Personal agregado' });
    const guardado = window.sessionStorage.getItem(CLAVE_ALTA)!;
    expect(guardado).not.toContain('482913');
    expect(JSON.parse(guardado)).toMatchObject({ paso: 'personal', menuCreado: true, equipo: [{ nombre: 'Luis', rol: 'mesero' }] });
  });

  it('con un avance corrupto o de otra forma empieza desde el paso 1', () => {
    for (const crudo of ['no es json', '{}', JSON.stringify({ paso: 'restaurante' }), JSON.stringify({ paso: 'nada', restaurante: { id: 'x' } })]) {
      window.sessionStorage.setItem(CLAVE_ALTA, crudo);
      expect(leerProgreso()).toBeNull();
    }
  });

  it('un 401 que desmonta el asistente y vuelve a entrar no repite el paso 1', async () => {
    const sim = crearServicioSimulado({ consultasAntesDeTerminar: 5 });
    const primera = montar(sim);
    await hastaLeyendo(primera.u);
    primera.vista.unmount(); // el 401 manda al acceso; al volver se monta de nuevo
    montar(sim);
    expect(await screen.findByRole('heading', { name: 'Estamos leyendo tu carta' })).toBeInTheDocument();
    expect(sim.veces('crearRestaurante')).toBe(1);
  });

  it('terminar («Ir a mi panel») borra el avance', async () => {
    const sim = crearServicioSimulado();
    const { u } = montar(sim);
    await u.type(screen.getByLabelText('Nombre del restaurante'), 'Taquería El Paso');
    await u.click(screen.getByRole('button', { name: 'Continuar' }));
    await u.click(await screen.findByRole('button', { name: 'Prefiero capturarla a mano' }));
    await u.click(await screen.findByRole('button', { name: 'Omitir por ahora' }));
    await u.click(await screen.findByRole('button', { name: 'Omitir por ahora' }));
    expect(window.sessionStorage.getItem(CLAVE_ALTA)).not.toBeNull();
    fireEvent.click(await screen.findByRole('link', { name: 'Ir a mi panel' }));
    expect(window.sessionStorage.getItem(CLAVE_ALTA)).toBeNull();
  });
});

describe('«atrás» y cerrar la pestaña', () => {
  it('«atrás» del navegador abre una hoja para confirmar; «Seguir aquí» se queda', async () => {
    const sim = crearServicioSimulado();
    const { u } = montar(sim);
    await u.type(screen.getByLabelText('Nombre del restaurante'), 'La Cocina');
    await u.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByRole('heading', { name: 'Sube tu carta' });
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    const hoja = await screen.findByRole('dialog', { name: '¿Salir del asistente?' });
    await u.click(within(hoja).getByRole('button', { name: 'Seguir aquí' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Sube tu carta' })).toBeInTheDocument();
  });

  it('beforeunload pide confirmar desde el paso 2 y no en el paso 1', async () => {
    const sim = crearServicioSimulado();
    const { u } = montar(sim);
    const evento = () => {
      const e = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    };
    expect(evento()).toBe(false);
    await u.type(screen.getByLabelText('Nombre del restaurante'), 'La Cocina');
    await u.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByRole('heading', { name: 'Sube tu carta' });
    expect(evento()).toBe(true);
  });
});

describe('A4 · estados terminales sin borrador', () => {
  async function llegar(final: OpcionesSimulado['final']) {
    const sim = crearServicioSimulado({ final, consultasAntesDeTerminar: 0 });
    const { u } = montar(sim);
    await hastaLeyendo(u);
    await avanzar(3500);
    return { sim, u };
  }

  it('`listo` sin resultado: lo dice y ofrece subir otro archivo o capturar a mano', async () => {
    const { u } = await llegar('listo-sin-resultado');
    expect(await screen.findByRole('heading', { name: 'No pudimos leer tu carta' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('No recibimos el borrador de tu carta');
    expect(screen.queryByRole('heading', { name: 'Estamos leyendo tu carta' })).not.toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Subir otro archivo' }));
    expect(await screen.findByRole('heading', { name: 'Sube tu carta' })).toBeInTheDocument();
  });

  it('estado desconocido (`cancelado`): misma salida, sin sondear 40 veces en silencio', async () => {
    const { sim } = await llegar('cancelado');
    expect(await screen.findByRole('heading', { name: 'No pudimos leer tu carta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Capturar mis platillos a mano' })).toBeInTheDocument();
    await avanzar(60_000);
    expect(sim.veces('consultarImportacion')).toBe(1);
  });

  it('`confirmado` avanza a Mesas', async () => {
    await llegar('confirmado');
    expect(await screen.findByRole('heading', { name: '¿Cuántas mesas tienes?' })).toBeInTheDocument();
  });
});
