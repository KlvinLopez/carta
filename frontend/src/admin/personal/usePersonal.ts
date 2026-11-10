import { useCallback, useRef, useState } from 'react';

import { useLista } from '../gestion/useLista';
import { mensajeDe } from '../gestion/mensajes';
import type { CambiosPersonal, Personal, ServicioPersonal } from './servicio';

const porNombre = (a: Personal, b: Personal) => a.nombre.localeCompare(b.nombre, 'es');

/**
 * Estado de la pantalla de personal. Dar de baja o reactivar es optimista (trivial de revertir): la
 * persona cambia de lista al instante y, si el servidor dice que no, vuelve a donde estaba con un aviso.
 * Nombre y rol esperan al servidor. Mientras una persona tiene una escritura en vuelo no acepta otra.
 */
export function usePersonal(servicio: ServicioPersonal, rid: string) {
  const lista = useLista<Personal>(
    (signal) => servicio.listar(rid, signal),
    rid,
    'No pudimos cargar a tu equipo. Inténtalo de nuevo.',
  );
  const { setDatos } = lista;
  const [pendientes, setPendientes] = useState<ReadonlySet<string>>(new Set());
  const [aviso, setAviso] = useState<string | null>(null);
  const enVuelo = useRef(new Set<string>());

  const marcar = useCallback((id: string, ocupado: boolean) => {
    if (ocupado) enVuelo.current.add(id);
    else enVuelo.current.delete(id);
    setPendientes(new Set(enVuelo.current));
  }, []);

  const crear = useCallback(
    async (datos: { nombre: string; rol: Personal['rol']; pin: string }) => {
      const creada = await servicio.crear(rid, datos);
      setDatos((previas) => [...previas, creada].sort(porNombre));
      return creada;
    },
    [servicio, rid, setDatos],
  );

  /** Edición de nombre o rol: espera al servidor y deja que el error llegue a la hoja. */
  const cambiar = useCallback(
    async (id: string, cambios: CambiosPersonal) => {
      if (enVuelo.current.has(id)) return null;
      marcar(id, true);
      try {
        const nueva = await servicio.cambiar(id, cambios);
        setDatos((previas) => previas.map((p) => (p.id === id ? nueva : p)).sort(porNombre));
        return nueva;
      } finally {
        marcar(id, false);
      }
    },
    [servicio, setDatos, marcar],
  );

  /** Baja o reactivación optimista; si falla, vuelve lo que había y avisa con el mensaje del servidor. */
  const ponerActivo = useCallback(
    async (previa: Personal, activo: boolean) => {
      if (enVuelo.current.has(previa.id)) return;
      marcar(previa.id, true);
      setAviso(null);
      setDatos((todas) => todas.map((p) => (p.id === previa.id ? { ...p, activo } : p)));
      try {
        const nueva = await servicio.cambiar(previa.id, { activo });
        setDatos((todas) => todas.map((p) => (p.id === previa.id ? nueva : p)));
      } catch (error) {
        setDatos((todas) => todas.map((p) => (p.id === previa.id ? previa : p)));
        setAviso(
          mensajeDe(error, activo ? 'No pudimos reactivar a esta persona.' : 'No pudimos dar de baja a esta persona.'),
        );
      } finally {
        marcar(previa.id, false);
      }
    },
    [servicio, setDatos, marcar],
  );

  const reasignarPin = useCallback(
    async (id: string, pin: string) => {
      if (enVuelo.current.has(id)) return;
      marcar(id, true);
      try {
        await servicio.reasignarPin(id, pin);
      } finally {
        marcar(id, false);
      }
    },
    [servicio, marcar],
  );

  return {
    estado: lista.estado,
    personal: lista.datos,
    reintentar: lista.reintentar,
    pendientes,
    aviso,
    descartarAviso: () => setAviso(null),
    crear,
    cambiar,
    ponerActivo,
    reasignarPin,
  };
}
