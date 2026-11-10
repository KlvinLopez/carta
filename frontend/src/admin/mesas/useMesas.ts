import { useCallback, useRef, useState } from 'react';

import { ErrorApi } from '../../compartido/http';
import { tipoDeError } from '../gestion/mensajes';
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
  // Dos listas (activas y bajas) para que las bajas nunca desplacen a las activas del tope de 500.
  const lista = useLista<Mesa>(
    async (signal) => {
      const [activas, bajas] = await Promise.all([
        servicio.listar(rid, { activa: true }, signal),
        servicio.listar(rid, { activa: false }, signal),
      ]);
      if (!Array.isArray(activas) || !Array.isArray(bajas)) {
        throw new ErrorApi(200, 'RESPUESTA_INVALIDA', 'No pudimos cargar tus mesas. Inténtalo de nuevo.');
      }
      return [...activas, ...bajas].sort(porNumero);
    },
    rid,
    'No pudimos cargar tus mesas. Inténtalo de nuevo.',
  );
  const { setDatos } = lista;
  const turnos = useRef(new Map<string, number>());
  const [regenerando, setRegenerando] = useState<ReadonlySet<string>>(new Set());
  const [codigoNuevo, setCodigoNuevo] = useState<CodigoNuevo | null>(null);

  /** Tras un 409 `MESA_INACTIVA`, un 409 o el 422 de tope la lista cambió en otro lado: se vuelve a leer sin tapar la pantalla. */
  const recargar = useCallback(async () => {
    try {
      const [activas, bajas] = await Promise.all([
        servicio.listar(rid, { activa: true }),
        servicio.listar(rid, { activa: false }),
      ]);
      if (Array.isArray(activas) && Array.isArray(bajas)) setDatos([...activas, ...bajas].sort(porNumero));
    } catch {
      // Sin red: la lista que ya se ve sigue ahí y el mensaje del error ya se mostró.
    }
  }, [servicio, rid, setDatos]);

  const crear = useCallback(
    async (datos: { cantidad: number; capacidad: number }) => {
      try {
        const creadas = await servicio.crear(rid, datos);
        setDatos((previas) => [...previas, ...(Array.isArray(creadas) ? creadas : [])].sort(porNumero));
        return creadas;
      } catch (error) {
        // El tope lo cuenta el servidor: si dice que no caben, la lista que se ve estaba vieja.
        if (error instanceof ErrorApi && (error.estado === 409 || tipoDeError(error) === 'limite_de_mesas')) void recargar();
        throw error;
      }
    },
    [servicio, rid, setDatos, recargar],
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
