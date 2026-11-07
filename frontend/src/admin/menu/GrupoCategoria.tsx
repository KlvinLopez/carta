import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import { FilaPlatillo, type AccionesFila } from './FilaPlatillo';
import c from './Menu.module.css';
import type { Platillo } from './tipos';

export interface PropsGrupo {
  categoriaId: string | null;
  nombre: string;
  filas: Platillo[];
  abierto: boolean;
  pendientes: ReadonlySet<string>;
  /** Con búsqueda o en «Dados de baja» no se reordena: el orden se envía completo o no se envía. */
  reordenable: boolean;
  alAlternar: (clave: string) => void;
  alReordenar: (ids: string[]) => void;
  acciones: Pick<AccionesFila, 'alEditar' | 'alDisponible' | 'alActivo'>;
}

export const CLAVE_SIN_CATEGORIA = '__sin_categoria__';

function mover(ids: string[], id: string, destino: number): string[] {
  const sin = ids.filter((x) => x !== id);
  return [...sin.slice(0, destino), id, ...sin.slice(destino)];
}

interface Sesion {
  id: string;
  inicial: string[];
  actual: string[];
}

/**
 * Una categoría: encabezado colapsable y sus filas. El reordenado usa `pointer events` (ratón, dedo y
 * lápiz con el mismo código) y el teclado (↑/↓ en el asa); ambos terminan en `alReordenar(ids)`,
 * que manda `POST …/reordenar` con el orden nuevo de **esta** categoría.
 */
export const GrupoCategoria = memo(function GrupoCategoria({
  categoriaId,
  nombre,
  filas,
  abierto,
  pendientes,
  reordenable,
  alAlternar,
  alReordenar,
  acciones,
}: PropsGrupo) {
  const idLista = useId();
  const clave = categoriaId ?? CLAVE_SIN_CATEGORIA;
  const refLista = useRef<HTMLUListElement>(null);
  const refIds = useRef<string[]>([]);
  refIds.current = filas.map((p) => p.id);
  const refAlReordenar = useRef(alReordenar);
  refAlReordenar.current = alReordenar;
  const refNombres = useRef(new Map<string, string>());
  refNombres.current = new Map(filas.map((p) => [p.id, p.nombre]));
  const sesion = useRef<Sesion | null>(null);
  const limpiar = useRef<(() => void) | null>(null);
  const devolverFoco = useRef<string | null>(null);
  const [arrastre, setArrastre] = useState<{ id: string; ids: string[] } | null>(null);
  const [anuncio, setAnuncio] = useState('');

  // Si el componente se va con el dedo todavía abajo, no quedan escuchas colgando.
  useEffect(() => () => limpiar.current?.(), []);

  // Mover una fila en el DOM le quita el foco: tras reordenar con el teclado, el asa lo recupera.
  useLayoutEffect(() => {
    const id = devolverFoco.current;
    if (!id) return;
    devolverFoco.current = null;
    const asas = refLista.current?.querySelectorAll<HTMLElement>('[data-asa]');
    Array.from(asas ?? [])
      .find((asa) => asa.dataset.asa === id)
      ?.focus();
  });

  const alIniciarArrastre = useCallback((evento: PointerEvent<HTMLButtonElement>, id: string) => {
    if (evento.pointerType === 'mouse' && evento.button !== 0) return;
    evento.preventDefault();
    limpiar.current?.();
    const inicial = refIds.current;
    const actual: Sesion = { id, inicial, actual: inicial };
    sesion.current = actual;
    setArrastre({ id, ids: inicial });

    const alMover = (e: Event) => {
      const lista = refLista.current;
      const y = (e as unknown as { clientY: number }).clientY;
      if (!lista || typeof y !== 'number') return;
      // Posición = cuántas de las otras filas quedan por encima del puntero (su mitad es el umbral).
      let destino = 0;
      for (const hijo of Array.from(lista.children) as HTMLElement[]) {
        if (hijo.dataset.id === id) continue;
        const caja = hijo.getBoundingClientRect();
        if (y > caja.top + caja.height / 2) destino += 1;
      }
      const nuevo = mover(actual.actual, id, destino);
      if (nuevo.join() !== actual.actual.join()) {
        actual.actual = nuevo;
        setArrastre({ id, ids: nuevo });
      }
    };
    const terminar = (guardar: boolean) => {
      limpiar.current?.();
      sesion.current = null;
      setArrastre(null);
      if (guardar && actual.actual.join() !== actual.inicial.join()) {
        const posicion = actual.actual.indexOf(id) + 1;
        setAnuncio(`${refNombres.current.get(id) ?? 'Platillo'} quedó en la posición ${posicion} de ${actual.actual.length}.`);
        refAlReordenar.current(actual.actual);
      }
    };
    const alSoltar = () => terminar(true);
    const alCancelar = () => terminar(false);
    const alTeclear = (e: Event) => {
      if ((e as globalThis.KeyboardEvent).key === 'Escape') terminar(false);
    };
    window.addEventListener('pointermove', alMover);
    window.addEventListener('pointerup', alSoltar);
    window.addEventListener('pointercancel', alCancelar);
    window.addEventListener('keydown', alTeclear);
    limpiar.current = () => {
      window.removeEventListener('pointermove', alMover);
      window.removeEventListener('pointerup', alSoltar);
      window.removeEventListener('pointercancel', alCancelar);
      window.removeEventListener('keydown', alTeclear);
      limpiar.current = null;
    };
  }, []);

  const alTeclearAsa = useCallback((evento: KeyboardEvent<HTMLButtonElement>, id: string) => {
    if (evento.key !== 'ArrowUp' && evento.key !== 'ArrowDown') return;
    evento.preventDefault();
    const ids = refIds.current;
    const desde = ids.indexOf(id);
    const hasta = desde + (evento.key === 'ArrowUp' ? -1 : 1);
    if (desde < 0 || hasta < 0 || hasta >= ids.length) return;
    devolverFoco.current = id;
    setAnuncio(`${refNombres.current.get(id) ?? 'Platillo'} pasó a la posición ${hasta + 1} de ${ids.length}.`);
    refAlReordenar.current(mover(ids, id, hasta));
  }, []);

  const accionesFila = useMemo<AccionesFila>(
    () => ({ ...acciones, alIniciarArrastre, alTeclearAsa }),
    [acciones, alIniciarArrastre, alTeclearAsa],
  );

  const visibles = useMemo(() => {
    if (!arrastre) return filas;
    const porId = new Map(filas.map((p) => [p.id, p]));
    return arrastre.ids.map((id) => porId.get(id)).filter((p): p is Platillo => !!p);
  }, [arrastre, filas]);

  return (
    <section className={c.grupo} aria-labelledby={`${idLista}-t`}>
      <h2 className={c.tituloGrupo} id={`${idLista}-t`}>
        <button
          type="button"
          className={c.alternar}
          aria-expanded={abierto}
          aria-controls={idLista}
          onClick={() => alAlternar(clave)}
        >
          <span className={c.nombreGrupo}>{nombre}</span>
          <span className={c.cuenta}>{filas.length}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={c.chevron} data-abierto={abierto}>
            <path d="M7 10l5 5 5-5" />
          </svg>
        </button>
      </h2>
      <ul id={idLista} ref={refLista} className={c.lista} hidden={!abierto} data-arrastrando={arrastre ? 'si' : undefined}>
        {abierto &&
          visibles.map((p) => (
            <FilaPlatillo
              key={p.id}
              platillo={p}
              ocupado={pendientes.has(p.id)}
              reordenable={reordenable && filas.length > 1}
              arrastrando={arrastre?.id === p.id}
              acciones={accionesFila}
            />
          ))}
      </ul>
      <p className={c.srSolo} role="status" aria-live="polite">
        {anuncio}
      </p>
    </section>
  );
});
