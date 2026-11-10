import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ErrorApi } from '../../compartido/http';
import { uuid } from '../../mocks/servicioMenuSimulado';
import { montarMenu } from './utilesPrueba';

afterEach(() => vi.restoreAllMocks());

async function cargada() {
  const m = montarMenu();
  await screen.findByRole('heading', { name: /^Tacos/ });
  return m;
}
const nombresEn = (categoria: RegExp) => {
  const grupo = screen.getByRole('heading', { name: categoria }).closest('section')!;
  return within(grupo)
    .getAllByRole('button', { name: /^Editar / })
    .map((b) => b.getAttribute('aria-label')!.replace('Editar ', ''));
};
/** Hace que cada llamada de reordenar quede en espera hasta que la prueba la resuelva o la rechace. */
function controlar(sim: ReturnType<typeof montarMenu>['sim']) {
  const original = sim.servicio.reordenarPlatillos;
  const pendientes: { ids: string[]; resolver: () => Promise<void>; rechazar: (e: ErrorApi) => void }[] = [];
  sim.servicio.reordenarPlatillos = (rid, ids) =>
    new Promise<void>((resolver, rechazar) => {
      pendientes.push({
        ids,
        resolver: () => original(rid, ids).then(resolver, rechazar),
        rechazar: (e) => rechazar(e),
      });
    });
  return pendientes;
}
const asa = (nombre: string) => screen.getByRole('button', { name: `Reordenar ${nombre}` });

/** jsdom no maqueta: cada fila mide 100 px y sus posiciones salen de su lugar en la lista. */
function maquetar() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const lista = this.parentElement;
    const indice = lista ? Array.from(lista.children).indexOf(this) : 0;
    return { top: indice * 100, height: 100, bottom: indice * 100 + 100, left: 0, right: 300, width: 300, x: 0, y: indice * 100, toJSON: () => ({}) };
  });
}
const mover = (y: number) => fireEvent(window, new MouseEvent('pointermove', { clientY: y, bubbles: true }));
const soltar = () => fireEvent(window, new MouseEvent('pointerup', { bubbles: true }));

describe('reordenar dentro de la categoría (AC-16.1)', () => {
  it('arrastrando con el puntero: la fila sigue al dedo y al soltar manda POST …/reordenar con los ids de esa categoría', async () => {
    maquetar();
    const { sim } = await cargada();
    expect(nombresEn(/^Tacos/)).toEqual(['Pastor', 'Suadero', 'Cecina enchilada']);
    fireEvent.pointerDown(asa('Pastor'), { button: 0, pointerType: 'touch' });
    expect(screen.getByRole('button', { name: 'Editar Pastor' }).closest('li')).toHaveAttribute('data-id', uuid(101));
    // Hacia abajo, pasando la mitad de la tercera fila (y > 250).
    act(() => mover(260));
    expect(nombresEn(/^Tacos/)).toEqual(['Suadero', 'Cecina enchilada', 'Pastor']);
    // Nada se envía mientras el dedo sigue abajo.
    expect(sim.llamadasDe('reordenarPlatillos')).toHaveLength(0);
    act(() => soltar());
    await waitFor(() => expect(sim.llamadasDe('reordenarPlatillos')).toHaveLength(1));
    expect(sim.llamadasDe('reordenarPlatillos')[0]!.argumentos).toEqual([
      '11111111-1111-4111-8111-111111111111',
      [uuid(102), uuid(103), uuid(101)],
    ]);
    expect(nombresEn(/^Tacos/)).toEqual(['Suadero', 'Cecina enchilada', 'Pastor']);
    expect(await screen.findByText('Pastor quedó en la posición 3 de 3.')).toBeInTheDocument();
  });

  it('Escape cancela el arrastre y no envía nada', async () => {
    maquetar();
    const { sim } = await cargada();
    fireEvent.pointerDown(asa('Pastor'), { button: 0, pointerType: 'touch' });
    act(() => mover(260));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(nombresEn(/^Tacos/)).toEqual(['Pastor', 'Suadero', 'Cecina enchilada']);
    act(() => soltar());
    expect(sim.llamadasDe('reordenarPlatillos')).toHaveLength(0);
  });

  it('soltar donde estaba no manda nada', async () => {
    maquetar();
    const { sim } = await cargada();
    fireEvent.pointerDown(asa('Suadero'), { button: 0, pointerType: 'touch' });
    act(() => mover(150));
    act(() => soltar());
    expect(sim.llamadasDe('reordenarPlatillos')).toHaveLength(0);
  });

  it('con teclado: ↓ en el asa mueve la fila al instante, mantiene el foco y manda el orden tras una pausa', async () => {
    const { sim, u } = await cargada();
    asa('Pastor').focus();
    await u.keyboard('{ArrowDown}');
    // En pantalla es inmediato; el POST espera a que se deje de pulsar.
    expect(nombresEn(/^Tacos/)).toEqual(['Suadero', 'Pastor', 'Cecina enchilada']);
    expect(sim.llamadasDe('reordenarPlatillos')).toHaveLength(0);
    expect(asa('Pastor')).toHaveFocus();
    expect(screen.getByText('Pastor pasó a la posición 2 de 3.')).toBeInTheDocument();
    await waitFor(() => expect(sim.llamadasDe('reordenarPlatillos')).toHaveLength(1), { timeout: 2000 });
    expect(sim.llamadasDe('reordenarPlatillos')[0]!.argumentos[1]).toEqual([uuid(102), uuid(101), uuid(103)]);
  });

  it('varias_flechas_seguidas_mandan_un_solo_post con el orden final; en el borde no pasa nada', async () => {
    const { sim, u } = await cargada();
    asa('Pastor').focus();
    await u.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(nombresEn(/^Tacos/)).toEqual(['Suadero', 'Cecina enchilada', 'Pastor']);
    await waitFor(() => expect(sim.llamadasDe('reordenarPlatillos')).toHaveLength(1), { timeout: 2000 });
    await new Promise((r) => setTimeout(r, 700));
    expect(sim.llamadasDe('reordenarPlatillos')).toHaveLength(1);
    expect(sim.llamadasDe('reordenarPlatillos')[0]!.argumentos[1]).toEqual([uuid(102), uuid(103), uuid(101)]);
  });

  it('si el servidor rechaza el orden, se vuelve a pedir la categoría y se pinta lo que diga; se avisa', async () => {
    const { sim, u } = await cargada();
    sim.fallar('reordenarPlatillos', new ErrorApi(409, 'CONFLICTO', 'Otro cambio llegó primero. Vuelve a intentarlo.'));
    asa('Pastor').focus();
    await u.keyboard('{ArrowDown}');
    expect(await screen.findByRole('alert', {}, { timeout: 2000 })).toHaveTextContent('Otro cambio llegó primero. Vuelve a intentarlo.');
    expect(nombresEn(/^Tacos/)).toEqual(['Pastor', 'Suadero', 'Cecina enchilada']);
    // Releyó sólo esa categoría (filtro por categoria_id), no todo el menú.
    const relecturas = sim.llamadasDe('listarPlatillos').filter((l) => (l.argumentos[1] as { categoriaId?: string }).categoriaId);
    expect(relecturas).toHaveLength(1);
    expect(relecturas[0]!.argumentos[1]).toMatchObject({ categoriaId: uuid(1), activo: true });
  });

  it('dos_reordenados_seguidos_llegan_en_orden: el segundo no empieza hasta que termine el primero', async () => {
    maquetar();
    const { sim } = await cargada();
    const pendientes = controlar(sim);
    // 1.º: Pastor al final.
    fireEvent.pointerDown(asa('Pastor'), { button: 0, pointerType: 'touch' });
    act(() => mover(260));
    act(() => soltar());
    await waitFor(() => expect(pendientes).toHaveLength(1));
    // 2.º, con el primero todavía en vuelo: Pastor (ahora al final) sube a la cabeza.
    fireEvent.pointerDown(asa('Pastor'), { button: 0, pointerType: 'touch' });
    act(() => mover(-10));
    act(() => soltar());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(pendientes).toHaveLength(1); // el segundo NO salió
    await act(async () => pendientes[0]!.resolver());
    await waitFor(() => expect(pendientes).toHaveLength(2));
    await act(async () => pendientes[1]!.resolver());
    expect(pendientes.map((p) => p.ids)).toEqual([
      [uuid(102), uuid(103), uuid(101)],
      [uuid(101), uuid(102), uuid(103)],
    ]);
    expect(nombresEn(/^Tacos/)).toEqual(['Pastor', 'Suadero', 'Cecina enchilada']);
  });

  it('un_reordenado_fallido_deja_la_pantalla_como_el_servidor: el 1.º falla, el 2.º pasa y no se pierde', async () => {
    maquetar();
    const { sim } = await cargada();
    const pendientes = controlar(sim);
    fireEvent.pointerDown(asa('Pastor'), { button: 0, pointerType: 'touch' });
    act(() => mover(260));
    act(() => soltar()); // Suadero, Cecina, Pastor
    await waitFor(() => expect(pendientes).toHaveLength(1));
    fireEvent.pointerDown(asa('Cecina enchilada'), { button: 0, pointerType: 'touch' });
    act(() => mover(-10));
    act(() => soltar()); // Cecina, Suadero, Pastor
    await act(async () => pendientes[0]!.rechazar(new ErrorApi(500, 'ERROR_INTERNO', 'Algo salió mal de nuestro lado.')));
    await waitFor(() => expect(pendientes).toHaveLength(2));
    await act(async () => pendientes[1]!.resolver());
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo salió mal de nuestro lado.');
    // Servidor: lo que aceptó el 2.º envío. Pantalla: lo mismo (no la instantánea vieja del 1.º).
    const servidor = sim.platillos
      .filter((p) => p.categoria_id === uuid(1) && p.activo)
      .sort((a, b) => a.orden - b.orden)
      .map((p) => p.nombre);
    expect(servidor).toEqual(['Cecina enchilada', 'Suadero', 'Pastor']);
    await waitFor(() => expect(nombresEn(/^Tacos/)).toEqual(servidor));
  });

  it('una categoría con un solo platillo no ofrece asa; con búsqueda o en bajas tampoco', async () => {
    const { u } = await cargada();
    expect(screen.queryByRole('button', { name: 'Reordenar Flan' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reordenar Horchata' })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /Dados de baja/ }));
    expect(screen.queryByRole('button', { name: /^Reordenar/ })).not.toBeInTheDocument();
  });

  it('el asa describe cómo se usa (ayuda asociada)', async () => {
    await cargada();
    expect(asa('Pastor')).toHaveAccessibleDescription(/Arrastra el asa/);
  });
});
