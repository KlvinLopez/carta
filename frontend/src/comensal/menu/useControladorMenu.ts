import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ErrorApi } from '../../compartido/http';
import { analiticaDelComensal, type Analitica } from '../analitica/cola';
import { claseDeError, type ClaseError } from '../entrada/errores';
import { consultaEfectiva } from './busqueda';
import { almacenFiltrosLocal, FILTROS_VACIOS, hayFiltros, mismosFiltros, type AlmacenFiltros, type Filtros } from './filtros';
import { tarjetaAbierta } from './posicion';
import type { MenuLeido, ServicioMenu } from './servicioMenu';

export type EstadoMenu =
  | { fase: 'cargando' }
  | { fase: 'listo'; menu: MenuLeido }
  | { fase: 'error'; clase: ClaseError; reintentarEn: number | null };

/**
 * Mientras el menú está a la vista se vuelve a pedir cada 60 s (AC-04.4: un platillo agotado se ve en ≤ 60 s);
 * el navegador revalida con el `ETag`, así que un menú sin cambios cuesta un 304. Pausado en segundo plano; al
 * volver la pestaña se pide enseguida, pero no antes de `ESPERA_MINIMA_MENU_MS` desde la última lectura.
 * El servidor admite 120 peticiones por minuto por comensal: esto gasta, como mucho, una por minuto.
 */
export const INTERVALO_MENU_MS = 60_000;
export const ESPERA_MINIMA_MENU_MS = 5_000;

/** Mismo contenido (y mismo origen: red o copia): no hace falta cambiar el estado ni repintar. */
function mismoMenu(a: MenuLeido, b: MenuLeido): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Cuánto se espera sin teclear para contar una búsqueda como «asentada» (analítica; no filtra la lista). */
export const ESPERA_BUSQUEDA_MS = 800;

export interface OpcionesControladorMenu {
  /** `sesion.restaurante.slug`; `null` mientras la entrada no responde (no se pide nada). */
  slug: string | null;
  servicio: ServicioMenu;
  analitica?: Analitica;
  almacen?: AlmacenFiltros;
}

/**
 * Todo lo que el menú recuerda mientras la persona va y viene entre pantallas (bienvenida, menú,
 * detalle del platillo): los datos del menú, lo escrito en el buscador y los filtros aplicados. Vive en
 * `SesionMesa`, por encima de las rutas: volver muestra la misma lista, sin esqueleto y sin otro
 * `menu_view`. Se pide en cuanto `entrar` responde; sin sondeo propio (el navegador revalida con el `ETag`).
 */
export function useControladorMenu({ slug, servicio, analitica, almacen = almacenFiltrosLocal }: OpcionesControladorMenu) {
  const cola = useMemo(() => analitica ?? analiticaDelComensal(), [analitica]);
  const [estado, setEstado] = useState<EstadoMenu>({ fase: 'cargando' });
  const [intento, setIntento] = useState(0);
  const [escrito, setEscrito] = useState('');
  const [filtros, setFiltros] = useState<Filtros>(() => almacen.leer());
  // La tarjeta que se abrió: el menú sigue montado bajo el detalle y, al volver, el foco regresa a ella.
  const abierta = useRef<HTMLElement | null>(null);
  const ultimaLectura = useRef(0);

  useEffect(() => {
    if (slug === null) return;
    const control = new AbortController();
    setEstado({ fase: 'cargando' });
    servicio.menu(slug, control.signal).then(
      (menu) => {
        if (control.signal.aborted) return;
        ultimaLectura.current = Date.now();
        setEstado({ fase: 'listo', menu });
        // Una carga lograda, un `menu_view`: la carga abortada del doble efecto de StrictMode no cuenta.
        cola.registrar('menu_view');
      },
      (error: unknown) => {
        if (control.signal.aborted) return;
        setEstado({ fase: 'error', clase: claseDeError(error), reintentarEn: error instanceof ErrorApi ? error.reintentarEn : null });
      },
    );
    return () => control.abort();
  }, [slug, servicio, intento, cola]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  // AC-04.4: con el menú a la vista se vuelve a pedir, en silencio y sin otro `menu_view`. Si cambió algo
  // (un platillo agotado, uno que ya no está) se actualiza el estado conservando búsqueda, filtros y
  // posición; si la red falla se conserva lo que se ve. Si la respuesta viene de la copia, lo dice el
  // propio menú (`deCopia`) y al volver la red se pide otra vez sin esperar el minuto.
  const listo = estado.fase === 'listo';
  useEffect(() => {
    if (!listo || slug === null) return;
    let parar = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let control: AbortController | null = null;

    const refrescar = async () => {
      control?.abort();
      const propio = (control = new AbortController());
      ultimaLectura.current = Date.now();
      try {
        const menu = await servicio.menu(slug, propio.signal);
        if (propio.signal.aborted) return;
        setEstado((previo) => (previo.fase === 'listo' && mismoMenu(previo.menu, menu) ? previo : { fase: 'listo', menu }));
      } catch {
        // Se conserva el menú que ya se ve; el siguiente turno lo intenta de nuevo.
      }
    };
    const programar = () => {
      clearTimeout(timer);
      if (!parar) timer = setTimeout(turno, INTERVALO_MENU_MS);
    };
    function turno() {
      if (parar || document.hidden) return; // la pestaña al volver retoma el reloj
      void refrescar();
      programar();
    }
    const alVolverLaPestana = () => {
      if (document.hidden) return;
      if (Date.now() - ultimaLectura.current >= ESPERA_MINIMA_MENU_MS) void refrescar();
      programar();
    };
    const alVolverLaRed = () => {
      void refrescar();
      programar();
    };
    document.addEventListener('visibilitychange', alVolverLaPestana);
    window.addEventListener('online', alVolverLaRed);
    programar();
    return () => {
      parar = true;
      clearTimeout(timer);
      control?.abort();
      document.removeEventListener('visibilitychange', alVolverLaPestana);
      window.removeEventListener('online', alVolverLaRed);
    };
  }, [listo, slug, servicio]);

  // «Lo intentamos de nuevo en cuanto vuelva» tiene que ser cierto: al volver la red, o la pestaña a
  // primer plano, un menú que falló por red se pide solo.
  const sinRed = estado.fase === 'error' && estado.clase === 'sin_conexion';
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

  // Analítica: sin texto libre. Sólo «hubo una búsqueda» (asentada) y «hubo un filtro».
  const consulta = consultaEfectiva(escrito);
  useEffect(() => {
    if (!consulta) return;
    const t = setTimeout(() => cola.registrar('search'), ESPERA_BUSQUEDA_MS);
    return () => clearTimeout(t);
  }, [consulta, cola]);

  const aplicarFiltros = useCallback(
    (nuevos: Filtros) => {
      if (mismosFiltros(nuevos, filtros)) return;
      setFiltros(nuevos);
      almacen.guardar(nuevos);
      cola.registrar('filter');
    },
    [filtros, almacen, cola],
  );

  const limpiarTodo = useCallback(() => {
    setEscrito('');
    if (hayFiltros(filtros)) {
      setFiltros(FILTROS_VACIOS);
      almacen.guardar(FILTROS_VACIOS);
    }
  }, [filtros, almacen]);

  const recordarTarjeta = useCallback((id: string) => {
    abierta.current = tarjetaAbierta(id);
  }, []);
  const devolverFoco = useCallback(() => {
    const tarjeta = abierta.current;
    abierta.current = null;
    if (tarjeta?.isConnected) tarjeta.focus({ preventScroll: true });
  }, []);

  return { estado, reintentar, recordarTarjeta, devolverFoco, escrito, setEscrito, consulta, filtros, aplicarFiltros, limpiarTodo };
}

export type ControladorMenu = ReturnType<typeof useControladorMenu>;
