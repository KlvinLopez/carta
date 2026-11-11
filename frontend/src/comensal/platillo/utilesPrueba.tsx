import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { vi } from 'vitest';

import { CODIGO_SEMILLA, crearServicioEntradaSimulado, type OpcionesEntradaSimulado } from '../../mocks/servicioEntradaSimulado';
import { crearMenuSemilla, crearServicioMenuSimulado, type OpcionesMenuSimulado } from '../../mocks/servicioMenuComensalSimulado';
import { crearServicioPlatilloSimulado, type OpcionesPlatilloSimulado } from '../../mocks/servicioPlatilloSimulado';
import type { Analitica } from '../analitica/cola';
import type { MenuPublico } from '../menu/servicioMenu';
import { almacenEnMemoria, analiticaFalsa } from '../menu/utilesPrueba';
import { SesionMesa } from '../SesionMesa';
import type { ServicioPlatillo } from './servicioPlatillo';

/** El `id` de un platillo del menú de ejemplo, por nombre. */
export function idDe(nombre: string): string {
  const p = crearMenuSemilla().categorias.flatMap((c) => c.platillos).find((x) => x.nombre === nombre);
  if (!p) throw new Error(`No hay «${nombre}» en el menú de ejemplo`);
  return p.id;
}

const Ubicacion = () => <span data-testid="ruta">{useLocation().pathname}</span>;
/** Los botones «atrás» y «adelante» del navegador: `navigate(-1)` y `navigate(1)`. */
const HistorialDelNavegador = () => {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate(-1)}>
        atrás del navegador
      </button>
      <button type="button" onClick={() => navigate(1)}>
        adelante del navegador
      </button>
    </>
  );
};

/** El mismo menú de ejemplo, con el id del primer platillo cambiado por uno con letras hexadecimales. */
export const ID_CON_LETRAS = 'abcdef12-abcd-4abc-8abc-abcdef123456';
export function menuConIdConLetras(): MenuPublico {
  const menu = crearMenuSemilla();
  const primero = menu.categorias[0]!.platillos[0]!;
  const viejo = primero.id;
  primero.id = ID_CON_LETRAS;
  menu.destacados = menu.destacados.map((d) => (d === viejo ? ID_CON_LETRAS : d));
  return menu;
}

/** Un enlace a otro platillo sin pasar por el menú (cambia el `:id` de la misma ruta). */
const IrAOtroPlatillo = ({ id }: { id: string }) => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(`/m/${CODIGO_SEMILLA}/platillo/${id}`)}>
      ir a otro platillo
    </button>
  );
};

/** jsdom no desplaza ni mide: se espían `scrollTo`/`scrollBy` y se fija `scrollY`. */
export function espiarDesplazamiento() {
  const original = Object.getOwnPropertyDescriptor(window, 'scrollY');
  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => undefined);
  return {
    scrollTo,
    scrollBy,
    fijarScrollY(y: number) {
      Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
    },
    restaurar() {
      scrollTo.mockRestore();
      scrollBy.mockRestore();
      if (original) Object.defineProperty(window, 'scrollY', original);
      else delete (window as unknown as Record<string, unknown>).scrollY;
    },
  };
}

export interface OpcionesMontaje {
  entrada?: OpcionesEntradaSimulado;
  platillo?: OpcionesPlatilloSimulado;
  estricto?: boolean;
  /** Opciones del servicio del menú (por omisión, el menú de ejemplo). */
  menu?: OpcionesMenuSimulado;
  /** Otro servicio del detalle (p. ej. uno manual que ignore la señal); por omisión, el simulado. */
  servicioPlatillo?: ServicioPlatillo;
  /** Otra cola de analítica (p. ej. la real); por omisión, una falsa. */
  analitica?: Analitica;
  /** Deja pendiente la primera respuesta de estos servicios (se suelta con `soltarMenu()` / `soltarDetalle()`). */
  retener?: ('menu' | 'detalle')[];
}

/** La sesión del comensal completa (entrada, menú y detalle) con los tres servicios simulados. */
export function montarSesion(ruta: string, { entrada, platillo, estricto = false, retener = [], menu: opcionesMenu, servicioPlatillo, analitica }: OpcionesMontaje = {}) {
  const sim = crearServicioEntradaSimulado(entrada);
  const menu = crearServicioMenuSimulado(opcionesMenu);
  const detalle = crearServicioPlatilloSimulado(platillo);
  const cola = analiticaFalsa();
  const soltarMenu = retener.includes('menu') ? menu.retener() : () => undefined;
  const soltarDetalle = retener.includes('detalle') ? detalle.retener() : () => undefined;
  const u = userEvent.setup();
  const arbol = (
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route
          path="/m/:codigo/*"
          element={
            <SesionMesa
              codigo={CODIGO_SEMILLA}
              servicio={sim.servicio}
              servicioMenu={menu.servicio}
              servicioPlatillo={servicioPlatillo ?? detalle.servicio}
              analitica={analitica ?? cola.analitica}
              almacenFiltros={almacenEnMemoria().almacen}
            />
          }
        />
      </Routes>
      <Ubicacion />
      <HistorialDelNavegador />
      <IrAOtroPlatillo id={idDe('Mole poblano')} />
    </MemoryRouter>
  );
  const vista = render(estricto ? <StrictMode>{arbol}</StrictMode> : arbol);
  return { sim, menu, detalle, cola, u, soltarMenu, soltarDetalle, ...vista };
}

export const rutaMenu = `/m/${CODIGO_SEMILLA}/menu`;
export const rutaPlatillo = (id: string) => `/m/${CODIGO_SEMILLA}/platillo/${id}`;
export const rutaActual = () => screen.getByTestId('ruta').textContent;
export const atrasDelNavegador = (u: ReturnType<typeof userEvent.setup>) => u.click(screen.getByRole('button', { name: 'atrás del navegador' }));
/**
 * Deja correr lo pendiente (promesas y efectos) sin temporizadores reales: sirve para afirmar que algo
 * NO pasó. Los servicios simulados sólo se resuelven con promesas, así que unas cuantas vueltas bastan.
 */
export async function asentar(vueltas = 5) {
  for (let i = 0; i < vueltas; i += 1) await act(async () => {});
}
export const vistas = (registrar: { mock: { calls: unknown[][] } }, tipo: string) => registrar.mock.calls.filter(([t]) => t === tipo);
