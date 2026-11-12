import { useCallback, useEffect, useState } from 'react';

import { ErrorApi } from '../../compartido/http';
import { claseDeError, type ClaseError } from '../entrada/errores';
import type { PlatilloPublico } from '../menu/servicioMenu';
import { ID_PLATILLO, type PlatilloDetalle, type ServicioPlatillo } from './servicioPlatillo';

export type EstadoPlatillo =
  /** Sin nada que pintar todavía (enlace directo o recarga). */
  | { fase: 'cargando' }
  /** El platillo, del servidor (`detalle`) o, mientras llega o si falla la red, el que el menú ya tenía. */
  | { fase: 'listo'; platillo: PlatilloPublico & { categoria_nombre?: string | null }; confirmado: boolean; aviso: AvisoDetalle | null }
  /** 404: no existe, está de baja o es de otro restaurante. */
  | { fase: 'no_existe' }
  | { fase: 'error'; clase: ClaseError; reintentarEn: number | null };

export interface AvisoDetalle {
  clase: ClaseError;
  reintentarEn: number | null;
}

export interface OpcionesPlatillo {
  id: string;
  servicio: ServicioPlatillo;
  /** Lo que el menú ya trae de este platillo: se pinta al instante mientras llega el detalle. */
  enMemoria?: (PlatilloPublico & { categoria_nombre?: string | null }) | null;
}

/**
 * El detalle de un platillo. Con el platillo en memoria se pinta de inmediato y el servidor sólo lo
 * completa o lo corrige; sin él (enlace directo) hay un esqueleto. Un 404 es definitivo (nada de
 * «reintentar»); un fallo de red o un 429 con datos en memoria se avisa sin tapar el platillo, y la
 * petición se repite sola al volver la red o la pestaña.
 */
export function usePlatillo({ id, servicio, enMemoria = null }: OpcionesPlatillo): { estado: EstadoPlatillo; reintentar: () => void } {
  const idValido = ID_PLATILLO.test(id);
  const [intento, setIntento] = useState(0);
  const [respuesta, setRespuesta] = useState<
    { tipo: 'detalle'; detalle: PlatilloDetalle } | { tipo: 'no_existe' } | { tipo: 'fallo'; clase: ClaseError; reintentarEn: number | null } | null
  >(null);

  useEffect(() => {
    if (!idValido) return;
    const control = new AbortController();
    setRespuesta((anterior) => (anterior?.tipo === 'fallo' ? null : anterior));
    servicio.platillo(id, control.signal).then(
      (detalle) => {
        if (control.signal.aborted) return;
        setRespuesta({ tipo: 'detalle', detalle });
      },
      (error: unknown) => {
        if (control.signal.aborted) return;
        if (error instanceof ErrorApi && error.estado === 404) setRespuesta({ tipo: 'no_existe' });
        else setRespuesta({ tipo: 'fallo', clase: claseDeError(error), reintentarEn: error instanceof ErrorApi ? error.reintentarEn : null });
      },
    );
    return () => control.abort();
  }, [id, idValido, servicio, intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  // «Lo intentamos de nuevo en cuanto vuelva» tiene que ser cierto.
  const sinRed = respuesta?.tipo === 'fallo' && respuesta.clase === 'sin_conexion';
  useEffect(() => {
    if (!sinRed) return;
    const alVolverLaRed = () => reintentar();
    const alVolverLaPestana = () => {
      if (!document.hidden) reintentar();
    };
    window.addEventListener('online', alVolverLaRed);
    document.addEventListener('visibilitychange', alVolverLaPestana);
    return () => {
      window.removeEventListener('online', alVolverLaRed);
      document.removeEventListener('visibilitychange', alVolverLaPestana);
    };
  }, [sinRed, reintentar]);

  let estado: EstadoPlatillo;
  // Un id que no es un UUID no puede ser un platillo: el mismo 404, sin llamar a la API.
  if (!idValido || respuesta?.tipo === 'no_existe') estado = { fase: 'no_existe' };
  // El menú se vuelve a leer mientras se ve (AC-04.4): su `disponible` es más reciente que el del detalle ya pedido.
  else if (respuesta?.tipo === 'detalle') {
    const platillo = enMemoria ? { ...respuesta.detalle, disponible: enMemoria.disponible } : respuesta.detalle;
    estado = { fase: 'listo', platillo, confirmado: true, aviso: null };
  }
  else if (enMemoria) {
    estado = {
      fase: 'listo',
      platillo: enMemoria,
      confirmado: respuesta?.tipo === 'fallo',
      aviso: respuesta?.tipo === 'fallo' ? { clase: respuesta.clase, reintentarEn: respuesta.reintentarEn } : null,
    };
  } else if (respuesta?.tipo === 'fallo') estado = { fase: 'error', clase: respuesta.clase, reintentarEn: respuesta.reintentarEn };
  else estado = { fase: 'cargando' };
  return { estado, reintentar };
}
