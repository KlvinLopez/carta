import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ErrorApi } from '../../compartido/http';
import { listarTodosLosPlatillos, type ServicioMenu } from './servicio';
import type { CambiosPlatillo, Categoria, Platillo, PlatilloNuevo } from './tipos';

export type EstadoMenu = { tipo: 'cargando' } | { tipo: 'error'; mensaje: string } | { tipo: 'listo' };

export const MENSAJE_GENERICO = 'No pudimos completar la acción. Inténtalo de nuevo.';

export function mensajeDe(error: unknown): string {
  return error instanceof ErrorApi ? error.message : MENSAJE_GENERICO;
}

function ordenar(lista: Platillo[]): Platillo[] {
  return [...lista].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));
}

/**
 * Estado de la pantalla de menú: categorías y platillos (activos y dados de baja) del restaurante, y
 * las escrituras. Los interruptores y el reordenado son **optimistas**: la pantalla cambia al tocar y
 * vuelve atrás, con un aviso, si el servidor rechaza el cambio. Un platillo con una escritura en vuelo
 * no acepta otra hasta terminar (`pendientes`), así la reversión nunca pisa un cambio posterior.
 */
export function useMenu(servicio: ServicioMenu, rid: string) {
  const [estado, setEstado] = useState<EstadoMenu>({ tipo: 'cargando' });
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [platillos, setPlatillos] = useState<Platillo[]>([]);
  const [pendientes, setPendientes] = useState<ReadonlySet<string>>(new Set());
  const [aviso, setAviso] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  // Siempre lo último, para leer el valor previo sin volver inestables los callbacks.
  const refPlatillos = useRef<Platillo[]>([]);
  refPlatillos.current = platillos;
  const enVuelo = useRef(new Set<string>());
  const cola = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const control = new AbortController();
    setEstado({ tipo: 'cargando' });
    setAviso(null);
    Promise.all([
      servicio.listarCategorias(rid, control.signal),
      listarTodosLosPlatillos(servicio, rid, true, control.signal),
      listarTodosLosPlatillos(servicio, rid, false, control.signal),
    ])
      .then(([cats, activos, bajas]) => {
        if (control.signal.aborted) return;
        setCategorias([...cats].sort((a, b) => a.orden - b.orden));
        setPlatillos([...activos, ...bajas]);
        setEstado({ tipo: 'listo' });
      })
      .catch((error: unknown) => {
        if (control.signal.aborted) return;
        setEstado({ tipo: 'error', mensaje: mensajeDe(error) });
      });
    return () => control.abort();
  }, [servicio, rid, intento]);

  const aplicar = useCallback((id: string, parche: Partial<Platillo>) => {
    setPlatillos((ps) => ps.map((p) => (p.id === id ? { ...p, ...parche } : p)));
  }, []);

  const reemplazar = useCallback((nuevo: Platillo) => {
    setPlatillos((ps) => ps.map((p) => (p.id === nuevo.id ? nuevo : p)));
  }, []);

  const marcar = useCallback((id: string, en: boolean) => {
    if (en) enVuelo.current.add(id);
    else enVuelo.current.delete(id);
    setPendientes(new Set(enVuelo.current));
  }, []);

  /** Un cambio de un solo campo con respuesta optimista y reversión si el servidor lo rechaza. */
  const cambiarCampo = useCallback(
    async (id: string, parche: Partial<Pick<Platillo, 'disponible' | 'activo'>>, escribir: () => Promise<Platillo | void>) => {
      if (enVuelo.current.has(id)) return;
      const previo = refPlatillos.current.find((p) => p.id === id);
      if (!previo) return;
      const antes: Partial<Platillo> = Object.fromEntries(
        Object.keys(parche).map((clave) => [clave, previo[clave as keyof Platillo]]),
      );
      marcar(id, true);
      setAviso(null);
      aplicar(id, parche);
      try {
        const respuesta = await escribir();
        if (respuesta) reemplazar(respuesta);
      } catch (error) {
        aplicar(id, antes);
        setAviso(mensajeDe(error));
      } finally {
        marcar(id, false);
      }
    },
    [aplicar, marcar, reemplazar],
  );

  const poner = useCallback(
    (id: string, campo: 'disponible' | 'activo', valor: boolean) =>
      campo === 'activo' && !valor
        ? cambiarCampo(id, { activo: false }, () => servicio.darDeBaja(id))
        : cambiarCampo(id, { [campo]: valor }, () => servicio.cambiarPlatillo(id, { [campo]: valor })),
    [cambiarCampo, servicio],
  );

  /** Crea (`id = null`) o edita; los errores (409, 422) suben al editor, que los pone junto al campo. */
  const guardar = useCallback(
    async (id: string | null, datos: PlatilloNuevo | CambiosPlatillo): Promise<Platillo> => {
      if (id === null) {
        const creado = await servicio.crearPlatillo(rid, datos as PlatilloNuevo);
        setPlatillos((ps) => [...ps, creado]);
        return creado;
      }
      if (enVuelo.current.has(id)) throw new ErrorApi(0, 'OCUPADO', 'Espera un momento: se está guardando otro cambio.');
      marcar(id, true);
      try {
        const editado = await servicio.cambiarPlatillo(id, datos as CambiosPlatillo);
        reemplazar(editado);
        return editado;
      } finally {
        marcar(id, false);
      }
    },
    [marcar, reemplazar, rid, servicio],
  );

  /** `ids` = los platillos activos de **una** categoría en el orden nuevo. */
  const reordenar = useCallback(
    (ids: string[]) => {
      const antes = new Map(refPlatillos.current.filter((p) => ids.includes(p.id)).map((p) => [p.id, p.orden]));
      const posiciones = new Map(ids.map((id, i) => [id, i + 1]));
      setPlatillos((ps) => ps.map((p) => (posiciones.has(p.id) ? { ...p, orden: posiciones.get(p.id)! } : p)));
      setAviso(null);
      // En cola: dos arrastres seguidos llegan al servidor en el orden en que ocurrieron.
      cola.current = cola.current.then(async () => {
        try {
          await servicio.reordenarPlatillos(rid, ids);
        } catch (error) {
          setPlatillos((ps) => ps.map((p) => (antes.has(p.id) ? { ...p, orden: antes.get(p.id)! } : p)));
          setAviso(mensajeDe(error));
        }
      });
      return cola.current;
    },
    [rid, servicio],
  );

  const subirFoto = useCallback(
    async (id: string, archivo: Blob, nombre: string) => {
      marcar(id, true);
      try {
        const actualizado = await servicio.subirFoto(id, archivo, nombre);
        reemplazar(actualizado);
        return actualizado;
      } finally {
        marcar(id, false);
      }
    },
    [marcar, reemplazar, servicio],
  );

  const quitarFoto = useCallback(
    async (id: string) => {
      marcar(id, true);
      try {
        const actualizado = await servicio.quitarFoto(id);
        reemplazar(actualizado);
        return actualizado;
      } finally {
        marcar(id, false);
      }
    },
    [marcar, reemplazar, servicio],
  );

  const ordenados = useMemo(() => ordenar(platillos), [platillos]);

  return {
    estado,
    categorias,
    platillos: ordenados,
    pendientes,
    aviso,
    descartarAviso: useCallback(() => setAviso(null), []),
    reintentar: useCallback(() => setIntento((n) => n + 1), []),
    poner,
    guardar,
    reordenar,
    subirFoto,
    quitarFoto,
  };
}

export type Menu = ReturnType<typeof useMenu>;
