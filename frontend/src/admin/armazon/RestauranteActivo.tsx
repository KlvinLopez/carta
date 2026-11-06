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

export type Restaurante = components['schemas']['RestauranteRespuesta'];

export type EstadoRestaurantes =
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'listo'; restaurantes: Restaurante[] };

interface Contexto {
  estado: EstadoRestaurantes;
  activo: Restaurante | null;
  elegir(id: string): void;
  reintentar(): void;
}

const CLAVE = 'carta.admin.restaurante';
const Ctx = createContext<Contexto | null>(null);

export function useRestauranteActivo(): Contexto {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRestauranteActivo debe usarse dentro de <RestauranteProvider>');
  return ctx;
}

// Comodidad por dispositivo: el servidor decide a qué restaurantes se tiene acceso (AC-15.2),
// esto sólo recuerda cuál se miraba. Nunca se manda como autoridad (`restaurante_id` sale del token).
function leerElegido(): string | null {
  try {
    return window.localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}
function guardarElegido(id: string) {
  try {
    window.localStorage.setItem(CLAVE, id);
  } catch {
    // sin almacenamiento: se vuelve al primero al recargar
  }
}

export function RestauranteProvider({ children }: { children: ReactNode }) {
  const { api } = useSesion();
  const [estado, setEstado] = useState<EstadoRestaurantes>({ tipo: 'cargando' });
  const [elegido, setElegido] = useState<string | null>(leerElegido);
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
    guardarElegido(id);
    setElegido(id);
  }, []);

  const valor = useMemo(
    () => ({ estado, activo, elegir, reintentar: () => setIntento((n) => n + 1) }),
    [estado, activo, elegir],
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
