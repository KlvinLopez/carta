import { useCallback, useEffect, useMemo, useState } from 'react';

import { ErrorApi } from '../../compartido/http';
import { analiticaDelComensal, type Analitica } from '../analitica/cola';
import { claseDeError, type ClaseError } from '../entrada/errores';
import { consultaEfectiva } from './busqueda';
import { almacenFiltrosLocal, FILTROS_VACIOS, hayFiltros, mismosFiltros, type AlmacenFiltros, type Filtros } from './filtros';
import type { MenuPublico, ServicioMenu } from './servicioMenu';

export type EstadoMenu =
  | { fase: 'cargando' }
  | { fase: 'listo'; menu: MenuPublico }
  | { fase: 'error'; clase: ClaseError; reintentarEn: number | null };

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

  useEffect(() => {
    if (slug === null) return;
    const control = new AbortController();
    setEstado({ fase: 'cargando' });
    servicio.menu(slug, control.signal).then(
      (menu) => {
        if (control.signal.aborted) return;
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

  return { estado, reintentar, escrito, setEscrito, consulta, filtros, aplicarFiltros, limpiarTodo };
}

export type ControladorMenu = ReturnType<typeof useControladorMenu>;
