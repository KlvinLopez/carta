import { useCallback, useEffect, useState } from 'react';

import { ErrorApi } from '../../compartido/http';
import { claseDeError, type ClaseError } from '../entrada/errores';
import type { MenuPublico, ServicioMenu } from './servicioMenu';

export type EstadoMenu =
  | { fase: 'cargando' }
  | { fase: 'listo'; menu: MenuPublico }
  | { fase: 'error'; clase: ClaseError; reintentarEn: number | null };

/**
 * Pide el menú del restaurante una vez por carga de la pantalla. Sin sondeo propio: es público y
 * cacheable, y el navegador lo revalida con el `ETag` cuando se vuelve a pedir.
 */
export function useMenu(slug: string, servicio: ServicioMenu) {
  const [estado, setEstado] = useState<EstadoMenu>({ fase: 'cargando' });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const control = new AbortController();
    setEstado({ fase: 'cargando' });
    servicio.menu(slug, control.signal).then(
      (menu) => {
        if (!control.signal.aborted) setEstado({ fase: 'listo', menu });
      },
      (error: unknown) => {
        if (control.signal.aborted) return;
        setEstado({ fase: 'error', clase: claseDeError(error), reintentarEn: error instanceof ErrorApi ? error.reintentarEn : null });
      },
    );
    return () => control.abort();
  }, [slug, servicio, intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);
  return { estado, reintentar };
}
