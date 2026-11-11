import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, type Mock } from 'vitest';

import { crearServicioMenuSimulado, type OpcionesMenuSimulado } from '../../mocks/servicioMenuComensalSimulado';
import type { Analitica, TipoEvento } from '../analitica/cola';
import { FILTROS_VACIOS, type AlmacenFiltros, type Filtros } from './filtros';
import { Menu, type PropsMenu } from './Menu';

export function analiticaFalsa(): { analitica: Analitica; registrar: Mock<(tipo: TipoEvento, platilloId?: string) => void> } {
  const registrar = vi.fn<(tipo: TipoEvento, platilloId?: string) => void>();
  const analitica: Analitica = { registrar, vaciar: vi.fn(), detener: vi.fn() };
  return { analitica, registrar };
}

export function almacenEnMemoria(inicial: Filtros = FILTROS_VACIOS): { almacen: AlmacenFiltros; guardar: Mock<(f: Filtros) => void>; actual: () => Filtros } {
  let actual = inicial;
  const guardar = vi.fn((f: Filtros) => {
    actual = f;
  });
  const almacen: AlmacenFiltros = { leer: () => actual, guardar };
  return { almacen, guardar, actual: () => actual };
}

/** Monta el menú con el servicio simulado, analítica falsa y filtros en memoria. */
export function montarMenu(opciones: OpcionesMenuSimulado & { filtros?: Filtros; props?: Partial<PropsMenu> } = {}) {
  const { filtros, props, ...resto } = opciones;
  const sim = crearServicioMenuSimulado(resto);
  const cola = analiticaFalsa();
  const mem = almacenEnMemoria(filtros);
  const u = userEvent.setup();
  const vista = render(
    <Menu slug="la-ceiba" mesa={7} servicio={sim.servicio} analitica={cola.analitica} almacen={mem.almacen} onVolver={() => undefined} {...props} />,
  );
  return { sim, cola, mem, u, ...vista };
}

/** Los nombres de los platillos de la lista por categorías (sin el Top 3 ni los títulos de la hoja). */
export function nombresEnLista(): string[] {
  return [...document.querySelectorAll('section[id^="categoria-"] h3')].map((h) => h.textContent ?? '');
}
