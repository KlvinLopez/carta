/**
 * Cola de analítica del comensal (US-24). Sólo lo que el esquema `EventoEntrada` acepta: `tipo`,
 * `platillo_id` (con `dish_view`) y `ocurrido_en`. **Nunca** el término buscado ni los alérgenos
 * elegidos: eso no sale del teléfono (regla dura 10).
 *
 * Es un envío de mejor esfuerzo: cualquier fallo (red, 401, 429, 5xx) se descarta en silencio, no se
 * reintenta (el servidor descarta lo que pase de 120 por minuto) y nunca toca la pantalla.
 */
export type TipoEvento = 'menu_view' | 'dish_view' | 'search' | 'filter';

export interface EventoAnalitica {
  tipo: TipoEvento;
  platillo_id?: string;
  ocurrido_en: string;
}

export interface Analitica {
  registrar(tipo: TipoEvento, platilloId?: string): void;
  /** Envía ya lo que haya (al ocultarse la página). */
  vaciar(): void;
  detener(): void;
}

export type EnviarLote = (eventos: EventoAnalitica[], opciones: { keepalive: boolean }) => Promise<unknown>;

/** El tope del servidor por lote (`EventosLote`). */
export const MAXIMO_POR_LOTE = 50;
export const INTERVALO_ENVIO_MS = 5000;
/** Lo que se guarda en el teléfono sin enviar: el servidor sólo acepta 120 por minuto. */
const MAXIMO_EN_COLA = 100;
/** Un platillo se cuenta una vez por pestaña y minuto: ir y venir por el historial no infla `dish_view`. */
export const VENTANA_DISH_VIEW_MS = 60_000;

export interface OpcionesCola {
  enviar: EnviarLote;
  intervaloMs?: number;
  ahora?: () => Date;
  /** Dónde escuchar «se ocultó la página». */
  documento?: Pick<Document, 'addEventListener' | 'removeEventListener' | 'visibilityState'>;
  ventana?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
}

export function crearColaAnalitica({
  enviar,
  intervaloMs = INTERVALO_ENVIO_MS,
  ahora = () => new Date(),
  documento = typeof document === 'undefined' ? undefined : document,
  ventana = typeof window === 'undefined' ? undefined : window,
}: OpcionesCola): Analitica {
  let cola: EventoAnalitica[] = [];
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const vistos = new Map<string, number>(); // platillo → cuándo se contó su último dish_view

  function mandar(keepalive: boolean) {
    clearTimeout(temporizador);
    temporizador = undefined;
    while (cola.length > 0) {
      const lote = cola.slice(0, MAXIMO_POR_LOTE);
      cola = cola.slice(MAXIMO_POR_LOTE);
      try {
        // Sin await y sin reintento: lo que falle se pierde, y eso está bien.
        void Promise.resolve(enviar(lote, { keepalive })).catch(() => undefined);
      } catch {
        // Un envío que lanza de forma síncrona tampoco debe llegar a la pantalla.
      }
    }
  }

  const alCambiarVisibilidad = () => {
    if (documento?.visibilityState === 'hidden') mandar(true);
  };
  const alOcultarPagina = () => mandar(true);
  documento?.addEventListener('visibilitychange', alCambiarVisibilidad);
  ventana?.addEventListener('pagehide', alOcultarPagina);

  return {
    registrar(tipo, platilloId) {
      if (tipo === 'dish_view' && platilloId) {
        const ahoraMs = ahora().getTime();
        const ultimo = vistos.get(platilloId);
        if (ultimo !== undefined && ahoraMs - ultimo < VENTANA_DISH_VIEW_MS) return;
        for (const [id, cuando] of vistos) if (ahoraMs - cuando >= VENTANA_DISH_VIEW_MS) vistos.delete(id);
        vistos.set(platilloId, ahoraMs);
      }
      if (cola.length >= MAXIMO_EN_COLA) cola.shift();
      const evento: EventoAnalitica = { tipo, ocurrido_en: ahora().toISOString() };
      if (tipo === 'dish_view' && platilloId) evento.platillo_id = platilloId;
      cola.push(evento);
      temporizador ??= setTimeout(() => mandar(false), intervaloMs);
    },
    vaciar: () => mandar(true),
    detener() {
      clearTimeout(temporizador);
      temporizador = undefined;
      cola = [];
      vistos.clear();
      documento?.removeEventListener('visibilitychange', alCambiarVisibilidad);
      ventana?.removeEventListener('pagehide', alOcultarPagina);
    },
  };
}

/** `POST /api/v1/p/eventos` con la cookie del invitado; `keepalive` para que sobreviva al cierre de la página. */
export const enviarLoteReal: EnviarLote = (eventos, { keepalive }) =>
  fetch('/api/v1/p/eventos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventos }),
    credentials: 'same-origin',
    keepalive,
  });

let compartida: Analitica | null = null;

/** Una sola cola por pestaña (T-2.6 le suma `dish_view`). Se crea al primer uso, no al importar. */
export function analiticaDelComensal(): Analitica {
  compartida ??= crearColaAnalitica({ enviar: enviarLoteReal });
  return compartida;
}
