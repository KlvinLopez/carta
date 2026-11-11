import { useCallback, useEffect, useRef, useState } from 'react';

import { ErrorApi } from '../../compartido/http';
import { claseDeError, type ClaseError } from './errores';
import { espejoLocal, type Espejo } from './espejo';
import type { EntrarRespuesta, MiembroRespuesta, ServicioEntrada, SesionEstado, SesionResumen } from './servicio';

/** Sondeo del estado de la mesa (ADR-004): 3 s, con retroceso si falla, pausado en segundo plano. */
export const INTERVALO_SONDEO_MS = 3000;
const ESPERA_MAXIMA_MS = 30_000;
/** Dos reentradas seguidas sin que el servidor nos reconozca: el navegador no guarda la cookie. */
const REENTRADAS_MAXIMAS = 2;

export interface DatosMesa {
  sesion: SesionResumen;
  yo: MiembroRespuesta;
  /** `null` hasta la primera respuesta del sondeo. */
  estado: SesionEstado | null;
  /** El servidor reconoció al mismo invitado que el espejo local recordaba (AC-01.4). */
  regresa: boolean;
  /** El último sondeo falló: se conserva lo pintado y se avisa sin tapar la pantalla. */
  sinRed: boolean;
}

export type VistaEntrada =
  | { fase: 'cargando' }
  | ({ fase: 'lista' } & DatosMesa)
  | { fase: 'error'; clase: ClaseError; restaurante: string | null; reintentarEn: number | null };

export type ResultadoAlias =
  | { ok: true }
  | { ok: false; motivo: 'alias_no_permitido' | 'invalido' | 'credencial' | 'sin_conexion' | 'limite' | 'generico' | 'ocupado' };

// Una sola `entrar` en vuelo por servicio y código: el doble toque, el doble montaje de
// StrictMode y dos pestañas montadas a la vez comparten la misma llamada (si no, sin cookie previa
// cada una crearía un comensal).
const enVuelo = new WeakMap<ServicioEntrada, Map<string, Promise<EntrarRespuesta>>>();

function entrarUnica(servicio: ServicioEntrada, codigo: string): Promise<EntrarRespuesta> {
  let porCodigo = enVuelo.get(servicio);
  if (!porCodigo) enVuelo.set(servicio, (porCodigo = new Map()));
  const actual = porCodigo.get(codigo);
  if (actual) return actual;
  const nueva = servicio.entrar(codigo).finally(() => porCodigo.delete(codigo));
  porCodigo.set(codigo, nueva);
  return nueva;
}

export function useEntrada(codigo: string, servicio: ServicioEntrada, espejo: Espejo = espejoLocal) {
  const [vista, setVista] = useState<VistaEntrada>({ fase: 'cargando' });
  const [ciclo, setCiclo] = useState(0);
  const vivo = useRef(true);
  const intento = useRef(0);
  const restaurante = useRef<string | null>(null);
  const reentradas = useRef(0);
  const cambiando = useRef(false);

  const fallar = useCallback(
    (error: unknown) => {
      const clase = claseDeError(error);
      // Una mesa que no existe o una sesión cerrada ya no tienen a quién recordar.
      if (clase === 'mesa_invalida' || clase === 'cerrada') espejo.olvidar();
      const espera = error instanceof ErrorApi ? error.reintentarEn : null;
      setVista({ fase: 'error', clase, restaurante: restaurante.current, reintentarEn: espera });
    },
    [espejo],
  );

  const aplicar = useCallback(
    (r: EntrarRespuesta) => {
      const previo = espejo.leer();
      espejo.guardar({ miembro: r.miembro.id, sesion: r.sesion.id });
      restaurante.current = r.sesion.restaurante.nombre;
      setVista({
        fase: 'lista',
        sesion: r.sesion,
        yo: r.miembro,
        estado: null,
        regresa: previo?.miembro === r.miembro.id,
        sinRed: false,
      });
    },
    [espejo],
  );

  const entrar = useCallback(async () => {
    const mio = ++intento.current;
    setVista({ fase: 'cargando' });
    try {
      const r = await entrarUnica(servicio, codigo);
      if (vivo.current && mio === intento.current) aplicar(r);
    } catch (error) {
      if (vivo.current && mio === intento.current) fallar(error);
    }
  }, [servicio, codigo, aplicar, fallar]);

  useEffect(() => {
    vivo.current = true;
    void entrar();
    return () => {
      vivo.current = false;
    };
  }, [entrar]);

  /** El token venció o no llegó: se vuelve a entrar con el código (crea un comensal nuevo si hace falta). */
  const reentrar = useCallback(async () => {
    if (reentradas.current >= REENTRADAS_MAXIMAS) {
      setVista({ fase: 'error', clase: 'credencial', restaurante: restaurante.current, reintentarEn: null });
      return;
    }
    reentradas.current += 1;
    const mio = ++intento.current;
    try {
      const r = await entrarUnica(servicio, codigo);
      if (!vivo.current || mio !== intento.current) return;
      aplicar(r);
      setCiclo((c) => c + 1);
    } catch (error) {
      if (vivo.current && mio === intento.current) fallar(error);
    }
  }, [servicio, codigo, aplicar, fallar]);

  // Sondeo con ETag. `private, no-store`: el navegador no revalida solo, el 304 es cosa nuestra.
  const clave = vista.fase === 'lista' ? vista.sesion.id : null;
  useEffect(() => {
    if (!clave) return;
    let parar = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let etag: string | null = null;
    let fallos = 0;
    let ocupado = false;
    const control = new AbortController();

    const programar = (ms: number) => {
      clearTimeout(timer);
      if (!parar) timer = setTimeout(() => void tick(), ms);
    };

    async function tick() {
      // Pausado en segundo plano; `visibilitychange` lo retoma. Una sola petición a la vez.
      if (parar || ocupado || document.hidden) return;
      ocupado = true;
      try {
        const r = await servicio.estado(etag, control.signal);
        if (parar) return;
        fallos = 0;
        reentradas.current = 0;
        if (!r.sinCambios) etag = r.etag;
        setVista((v) => {
          if (v.fase !== 'lista') return v;
          if (r.sinCambios) return v.sinRed ? { ...v, sinRed: false } : v;
          return { ...v, estado: r.estado, sinRed: false };
        });
        programar(INTERVALO_SONDEO_MS);
      } catch (error) {
        if (parar) return;
        const clase = claseDeError(error);
        if (clase === 'cerrada' || clase === 'mesa_invalida') {
          fallar(error);
          return;
        }
        if (clase === 'credencial') {
          void reentrar();
          return;
        }
        fallos += 1;
        setVista((v) => (v.fase === 'lista' && !v.sinRed ? { ...v, sinRed: true } : v));
        const pedida = error instanceof ErrorApi && error.reintentarEn ? error.reintentarEn * 1000 : 0;
        programar(Math.min(Math.max(pedida, INTERVALO_SONDEO_MS * 2 ** fallos), ESPERA_MAXIMA_MS));
      } finally {
        ocupado = false;
      }
    }

    const alVolver = () => {
      if (!document.hidden) programar(0);
    };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('online', alVolver);
    programar(0);
    return () => {
      parar = true;
      clearTimeout(timer);
      control.abort();
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('online', alVolver);
    };
  }, [clave, ciclo, servicio, fallar, reentrar]);

  // Si la entrada falló por falta de red, al volver la conexión se reintenta sola.
  const sinConexion = vista.fase === 'error' && vista.clase === 'sin_conexion';
  useEffect(() => {
    if (!sinConexion) return;
    const alVolver = () => void entrar();
    window.addEventListener('online', alVolver);
    return () => window.removeEventListener('online', alVolver);
  }, [sinConexion, entrar]);

  const cambiarAlias = useCallback(
    async (alias: string): Promise<ResultadoAlias> => {
      if (cambiando.current) return { ok: false, motivo: 'ocupado' };
      cambiando.current = true;
      try {
        const m = await servicio.cambiarAlias(alias);
        if (vivo.current) {
          setVista((v) =>
            v.fase !== 'lista'
              ? v
              : {
                  ...v,
                  yo: m,
                  estado: v.estado
                    ? { ...v.estado, miembros: v.estado.miembros.map((x) => (x.id === m.id ? { ...x, alias: m.alias } : x)) }
                    : null,
                },
          );
        }
        return { ok: true };
      } catch (error) {
        const clase = claseDeError(error);
        if (error instanceof ErrorApi && error.estado === 422) {
          // El alias anterior se queda (AC-03.3).
          return { ok: false, motivo: error.codigo === 'ALIAS_NO_PERMITIDO' ? 'alias_no_permitido' : 'invalido' };
        }
        if (clase === 'cerrada') {
          if (vivo.current) fallar(error);
          return { ok: false, motivo: 'generico' };
        }
        if (clase === 'credencial') {
          if (vivo.current) void reentrar();
          return { ok: false, motivo: 'credencial' };
        }
        return { ok: false, motivo: clase === 'sin_conexion' || clase === 'limite' ? clase : 'generico' };
      } finally {
        cambiando.current = false;
      }
    },
    [servicio, fallar, reentrar],
  );

  return { vista, reintentar: entrar, cambiarAlias };
}
