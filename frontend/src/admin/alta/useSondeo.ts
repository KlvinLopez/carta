import { useCallback, useEffect, useRef, useState } from 'react';

import { ErrorApi } from '../../compartido/http';
import type { ServicioAlta } from './servicio';
import type { Importacion } from './tipos';

/** Cada cuánto se pregunta por la importación (ADR-004: operador, 3 s). */
export const INTERVALO_MS = 3000;
/** Pasado este tiempo se avisa que tarda más de lo normal (AC-25.2: ≤ 3 min hasta 20 páginas). */
export const AVISO_LENTO_MS = 180_000;
/** Tope: pasado este tiempo se deja de preguntar y se ofrece seguir esperando. */
export const TOPE_MS = 600_000;
/** Fallos de red seguidos antes de decirlo en pantalla. */
export const FALLOS_PARA_AVISAR = 3;

const TERMINALES = new Set<Importacion['estado']>(['listo', 'fallido', 'confirmado']);

export interface EstadoSondeo {
  importacion: Importacion | null;
  /** Pasaron 3 minutos sin terminar. */
  lento: boolean;
  /** Pasó el tope: se dejó de preguntar. `reanudar` vuelve a empezar. */
  agotado: boolean;
  /** Varias consultas seguidas sin respuesta (red caída): se sigue intentando. */
  sinRed: boolean;
  /** Error que no se arregla esperando (la importación no existe, sesión inválida…). */
  error: string | null;
  reanudar(): void;
  /** Arranca de nuevo con otra fila (p. ej. tras `reintentar`, que devuelve la importación en `pendiente`). */
  reiniciar(nueva: Importacion): void;
}

/**
 * Sondeo del estado de la importación cada 3 s. El contrato no declara ETag en `GET …/importaciones/{id}`,
 * así que cada vuelta trae el JSON completo (es una fila). Se pausa con la pestaña oculta y vuelve a
 * preguntar al instante al regresar. Termina en `listo`, `fallido` o `confirmado`.
 */
export function useSondeoImportacion(
  servicio: ServicioAlta,
  rid: string | null,
  id: string | null,
  inicial: Importacion | null,
): EstadoSondeo {
  const [importacion, setImportacion] = useState<Importacion | null>(inicial);
  const [lento, setLento] = useState(false);
  const [agotado, setAgotado] = useState(false);
  const [sinRed, setSinRed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vuelta, setVuelta] = useState(0);
  const servicioRef = useRef(servicio);
  servicioRef.current = servicio;

  useEffect(() => {
    setImportacion(inicial);
    setLento(false);
    setAgotado(false);
    setSinRed(false);
    setError(null);
    // `inicial` sólo siembra el estado; cambiar de importación (id) reinicia todo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!rid || !id) return;
    if (inicial && TERMINALES.has(inicial.estado)) return;
    let vivo = true;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    let fallos = 0;
    const inicio = Date.now();
    const control = new AbortController();

    const programar = () => {
      if (!vivo) return;
      const transcurrido = Date.now() - inicio;
      if (transcurrido >= AVISO_LENTO_MS) setLento(true);
      if (transcurrido >= TOPE_MS) {
        setAgotado(true);
        return;
      }
      temporizador = setTimeout(() => void consultar(), INTERVALO_MS);
    };

    const consultar = async () => {
      if (!vivo) return;
      // En segundo plano no se pregunta: `alVolver` retoma al instante.
      if (document.visibilityState === 'hidden') return;
      try {
        const actual = await servicioRef.current.consultarImportacion(rid, id, control.signal);
        if (!vivo) return;
        fallos = 0;
        setSinRed(false);
        setImportacion(actual);
        if (TERMINALES.has(actual.estado)) return;
      } catch (e) {
        if (!vivo || control.signal.aborted) return;
        if (e instanceof ErrorApi && e.estado >= 400 && e.estado < 500 && e.estado !== 429) {
          setError(e.message);
          return;
        }
        fallos += 1;
        if (fallos >= FALLOS_PARA_AVISAR) setSinRed(true);
      }
      programar();
    };

    const alVolver = () => {
      if (document.visibilityState !== 'visible' || !vivo) return;
      clearTimeout(temporizador);
      void consultar();
    };
    document.addEventListener('visibilitychange', alVolver);
    temporizador = setTimeout(() => void consultar(), INTERVALO_MS);

    return () => {
      vivo = false;
      clearTimeout(temporizador);
      control.abort();
      document.removeEventListener('visibilitychange', alVolver);
    };
    // `inicial` no es una dependencia: sólo decide si ya había terminado al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rid, id, vuelta]);

  const reanudar = useCallback(() => {
    setAgotado(false);
    setLento(false);
    setError(null);
    setVuelta((n) => n + 1);
  }, []);

  const reiniciar = useCallback((nueva: Importacion) => {
    setImportacion(nueva);
    setAgotado(false);
    setLento(false);
    setSinRed(false);
    setError(null);
    setVuelta((n) => n + 1);
  }, []);

  return { importacion, lento, agotado, sinRed, error, reanudar, reiniciar };
}
