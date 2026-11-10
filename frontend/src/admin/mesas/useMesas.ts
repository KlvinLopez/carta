import { useCallback, useRef, useState } from 'react';

import { useLista } from '../gestion/useLista';
import type { Mesa, ServicioMesas } from './servicio';

const porNumero = (a: Mesa, b: Mesa) => a.numero - b.numero;

export interface CodigoNuevo {
  mesaId: string;
  numero: number;
  url: string;
}

/**
 * Estado de la pantalla de mesas. Regenerar sigue «el último que regenera gana» (T-1.5, B5): cada
 * petición por mesa lleva un número de turno y sólo la más reciente puede pintar el código nuevo; la
 * respuesta de una anterior se descarta, de modo que nunca se muestra un QR que ya dejó de servir.
 */
export function useMesas(servicio: ServicioMesas, rid: string) {
  const lista = useLista<Mesa>(
    (signal) => servicio.listar(rid, {}, signal),
    rid,
    'No pudimos cargar tus mesas. Inténtalo de nuevo.',
  );
  const { setDatos } = lista;
  const turnos = useRef(new Map<string, number>());
  const [regenerando, setRegenerando] = useState<ReadonlySet<string>>(new Set());
  const [codigoNuevo, setCodigoNuevo] = useState<CodigoNuevo | null>(null);

  const crear = useCallback(
    async (datos: { cantidad: number; capacidad: number }) => {
      const creadas = await servicio.crear(rid, datos);
      setDatos((previas) => [...previas, ...(Array.isArray(creadas) ? creadas : [])].sort(porNumero));
      return creadas;
    },
    [servicio, rid, setDatos],
  );

  const regenerar = useCallback(
    async (id: string): Promise<Mesa | null> => {
      const turno = (turnos.current.get(id) ?? 0) + 1;
      turnos.current.set(id, turno);
      setRegenerando((previas) => new Set(previas).add(id));
      setCodigoNuevo((actual) => (actual?.mesaId === id ? null : actual));
      const vigente = () => turnos.current.get(id) === turno;
      try {
        const mesa = await servicio.regenerar(id);
        if (!vigente()) return null; // otra regeneración de esta mesa salió después: manda la suya
        setDatos((previas) => previas.map((m) => (m.id === id ? mesa : m)));
        setCodigoNuevo({ mesaId: id, numero: mesa.numero, url: mesa.url_publica });
        return mesa;
      } finally {
        if (vigente()) {
          setRegenerando((previas) => {
            const siguientes = new Set(previas);
            siguientes.delete(id);
            return siguientes;
          });
        }
      }
    },
    [servicio, setDatos],
  );

  /** Tras un 409 `MESA_INACTIVA` la lista cambió en otro lado: se vuelve a leer sin tapar la pantalla. */
  const recargar = useCallback(async () => {
    try {
      const mesas = await servicio.listar(rid, {});
      if (Array.isArray(mesas)) setDatos(mesas);
    } catch {
      // Sin red: la lista que ya se ve sigue ahí y el mensaje del error ya se mostró.
    }
  }, [servicio, rid, setDatos]);

  return {
    estado: lista.estado,
    mesas: lista.datos,
    reintentar: lista.reintentar,
    recargar,
    regenerando,
    codigoNuevo,
    descartarCodigoNuevo: () => setCodigoNuevo(null),
    crear,
    regenerar,
  };
}
