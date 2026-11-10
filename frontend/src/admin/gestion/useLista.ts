import { useEffect, useRef, useState } from 'react';

import { fueAbortado, mensajeDe } from './mensajes';

export type EstadoLista = { tipo: 'cargando' } | { tipo: 'error'; mensaje: string } | { tipo: 'listo' };

/**
 * Carga una lista al montar (y cuando cambia `clave`, el restaurante). Una respuesta que no es lista
 * se trata como error de carga —con «Reintentar»— y no revienta al pintarse.
 */
export function useLista<T>(cargar: (signal: AbortSignal) => Promise<T[]>, clave: string, errorGenerico: string) {
  const [estado, setEstado] = useState<EstadoLista>({ tipo: 'cargando' });
  const [datos, setDatos] = useState<T[]>([]);
  const [intento, setIntento] = useState(0);
  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;

  useEffect(() => {
    const control = new AbortController();
    setEstado({ tipo: 'cargando' });
    cargarRef
      .current(control.signal)
      .then((lista) => {
        if (control.signal.aborted) return;
        if (!Array.isArray(lista)) {
          setEstado({ tipo: 'error', mensaje: errorGenerico });
          return;
        }
        setDatos(lista);
        setEstado({ tipo: 'listo' });
      })
      .catch((error: unknown) => {
        if (control.signal.aborted || fueAbortado(error)) return;
        setEstado({ tipo: 'error', mensaje: mensajeDe(error, errorGenerico) });
      });
    return () => control.abort();
    // `clave` es el restaurante: otro restaurante, otra lista.
  }, [clave, intento, errorGenerico]);

  return { estado, datos, setDatos, reintentar: () => setIntento((n) => n + 1) };
}
