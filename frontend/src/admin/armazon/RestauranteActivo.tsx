import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { components } from '../../compartido/api';
import { ErrorApi } from '../../compartido/http';
import { useSesion } from '../acceso/Sesion';
import { guardarRestauranteElegido, leerRestauranteElegido } from '../almacen';

export type Restaurante = components['schemas']['RestauranteRespuesta'];

export type EstadoRestaurantes =
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'listo'; restaurantes: Restaurante[] };

interface Contexto {
  estado: EstadoRestaurantes;
  activo: Restaurante | null;
  elegir(id: string): void;
  /** Sustituye un restaurante por su versión nueva (tras un `PATCH`) sin volver a pedir la lista. */
  reemplazar(restaurante: Restaurante): void;
  reintentar(): void;
}

const Ctx = createContext<Contexto | null>(null);

export function useRestauranteActivo(): Contexto {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRestauranteActivo debe usarse dentro de <RestauranteProvider>');
  return ctx;
}

export function RestauranteProvider({ children }: { children: ReactNode }) {
  const { api } = useSesion();
  const [estado, setEstado] = useState<EstadoRestaurantes>({ tipo: 'cargando' });
  const [elegido, setElegido] = useState<string | null>(leerRestauranteElegido);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const control = new AbortController();
    setEstado({ tipo: 'cargando' });
    api
      .obtener<Restaurante[]>('/admin/restaurantes', { signal: control.signal })
      .then((restaurantes) => setEstado({ tipo: 'listo', restaurantes }))
      .catch((error: unknown) => {
        if (control.signal.aborted) return;
        setEstado({
          tipo: 'error',
          mensaje:
            error instanceof ErrorApi ? error.message : 'No pudimos cargar tus restaurantes.',
        });
      });
    return () => control.abort();
  }, [api, intento]);

  const activo = useMemo(() => {
    if (estado.tipo !== 'listo') return null;
    return estado.restaurantes.find((r) => r.id === elegido) ?? estado.restaurantes[0] ?? null;
  }, [estado, elegido]);

  const elegir = useCallback((id: string) => {
    guardarRestauranteElegido(id);
    setElegido(id);
  }, []);

  const reemplazar = useCallback((nuevo: Restaurante) => {
    setEstado((previo) =>
      previo.tipo === 'listo'
        ? { tipo: 'listo', restaurantes: previo.restaurantes.map((r) => (r.id === nuevo.id ? nuevo : r)) }
        : previo,
    );
  }, []);

  const valor = useMemo(
    () => ({ estado, activo, elegir, reemplazar, reintentar: () => setIntento((n) => n + 1) }),
    [estado, activo, elegir, reemplazar],
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
