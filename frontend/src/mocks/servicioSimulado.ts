import type { ServicioAlta } from '../admin/alta/servicio';
import type { Importacion, Mesa, Personal, Resultado, Restaurante } from '../admin/alta/tipos';
import { ErrorApi } from '../compartido/http';
import { menuSemilla } from './menuSemilla';

export interface OpcionesSimulado {
  /** Cuántas consultas devuelven `procesando` antes del estado final. 0 = ya sale `listo`. */
  consultasAntesDeTerminar?: number;
  /** Estado final de la importación. */
  final?: 'listo' | 'fallido';
  /** Mensaje de `error_mensaje` cuando termina en `fallido`. */
  errorMensaje?: string;
  /** Si es `true`, la importación nunca termina (para el aviso de 3 minutos). */
  sinTerminar?: boolean;
  /** Borrador que «extrae» el servicio simulado. */
  resultado?: Importacion['resultado'];
  /** Errores por método para ejercitar los estados de fallo. */
  errores?: Partial<Record<keyof ServicioAlta, ErrorApi>>;
}

const AHORA = '2026-11-06T12:00:00Z';

/**
 * Servicio en memoria con la forma exacta del contrato (`app/schemas/*`): lo usan las pruebas y las
 * capturas mientras T-1.9/T-1.5/T-1.6 no están integradas. No duerme: el sondeo lo controla el reloj.
 */
export function crearServicioSimulado(opciones: OpcionesSimulado = {}) {
  const {
    consultasAntesDeTerminar = 2,
    final = 'listo',
    errorMensaje = 'No pudimos leer esta carta. Prueba con otro archivo o captura tus platillos a mano.',
    sinTerminar = false,
    resultado = menuSemilla,
    errores = {},
  } = opciones;

  let consultas = 0;
  let importacion: Importacion | null = null;
  let intentos = 0;
  let confirmaciones = 0;
  const llamadas: { metodo: keyof ServicioAlta; argumentos: unknown[] }[] = [];
  const personal: Personal[] = [];
  let mesas: Mesa[] = [];
  let fallosPendientes: Partial<Record<keyof ServicioAlta, ErrorApi[]>> = {};

  function registrar<K extends keyof ServicioAlta>(metodo: K, ...argumentos: unknown[]) {
    llamadas.push({ metodo, argumentos });
    const fallo = fallosPendientes[metodo]?.shift() ?? errores[metodo];
    if (fallo) throw fallo;
  }

  const servicio: ServicioAlta = {
    async crearRestaurante({ nombre, logo_url }) {
      registrar('crearRestaurante', { nombre, logo_url });
      const restaurante: Restaurante = {
        id: '00000000-0000-4000-8000-0000000000a1',
        nombre,
        slug: nombre
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
        logo_url: logo_url ?? null,
        tema: 'vino',
        activo: true,
        creado_en: AHORA,
      };
      return restaurante;
    },
    async subirCarta(_rid, archivo) {
      registrar('subirCarta', archivo.name, archivo.type, archivo.size);
      consultas = 0;
      intentos = 1;
      importacion = {
        id: '00000000-0000-4000-8000-0000000000c1',
        estado: 'pendiente',
        archivo_tipo: archivo.type,
        paginas: 2,
        intentos,
        creado_en: AHORA,
      };
      return importacion;
    },
    async consultarImportacion(_rid, id) {
      registrar('consultarImportacion', id);
      if (!importacion || importacion.id !== id) {
        throw new ErrorApi(404, 'RECURSO_NO_ENCONTRADO', 'No encontramos esta importación.');
      }
      consultas += 1;
      if (importacion.estado === 'confirmado') return importacion;
      if (sinTerminar) return { ...importacion, estado: 'procesando', iniciado_en: AHORA };
      if (consultas <= consultasAntesDeTerminar) {
        importacion = { ...importacion, estado: consultas === 1 ? 'pendiente' : 'procesando', iniciado_en: AHORA };
        return importacion;
      }
      importacion =
        final === 'listo'
          ? { ...importacion, estado: 'listo', resultado, finalizado_en: AHORA }
          : { ...importacion, estado: 'fallido', error_mensaje: errorMensaje, finalizado_en: AHORA };
      return importacion;
    },
    async reintentarImportacion(_rid, id) {
      registrar('reintentarImportacion', id);
      consultas = 0;
      intentos += 1;
      importacion = {
        ...(importacion as Importacion),
        estado: 'pendiente',
        intentos,
        error_mensaje: null,
        resultado: null,
      };
      return importacion;
    },
    async confirmarImportacion(_rid, id, cuerpo: Resultado) {
      registrar('confirmarImportacion', id, cuerpo);
      if (confirmaciones > 0) {
        throw new ErrorApi(409, 'CONFLICTO', 'Esta carta ya se confirmó.');
      }
      confirmaciones += 1;
      importacion = { ...(importacion as Importacion), estado: 'confirmado', confirmado_en: AHORA };
      return importacion;
    },
    async crearMesas(_rid, datos) {
      registrar('crearMesas', datos);
      mesas = Array.from({ length: datos.cantidad }, (_, i) => ({
        id: `00000000-0000-4000-8000-00000000d${String(i + 1).padStart(3, '0')}`,
        numero: i + 1,
        codigo_publico: `Jx3k9QwLmN2pR7sT4vY8z${i + 1}`,
        url_publica: `https://carta.cooking/m/Jx3k9QwLmN2pR7sT4vY8z${i + 1}`,
        capacidad: datos.capacidad,
        activa: true,
      }));
      return mesas;
    },
    async descargarQr(rid) {
      registrar('descargarQr', rid);
      return new Blob(['%PDF-1.4\n%simulado\n'], { type: 'application/pdf' });
    },
    async crearPersonal(_rid, datos) {
      // Se registra el nombre y el rol; el PIN NO queda en el registro de llamadas de la simulación.
      registrar('crearPersonal', { nombre: datos.nombre, rol: datos.rol });
      const creado: Personal = {
        id: `00000000-0000-4000-8000-00000000e${String(personal.length + 1).padStart(3, '0')}`,
        nombre: datos.nombre,
        rol: datos.rol,
        activo: true,
        creado_en: AHORA,
      };
      personal.push(creado);
      return creado;
    },
  };

  return {
    servicio,
    llamadas,
    /** Encola un fallo para la próxima llamada a `metodo` (después vuelve a funcionar). */
    fallarUnaVez(metodo: keyof ServicioAlta, error: ErrorApi) {
      fallosPendientes = { ...fallosPendientes, [metodo]: [...(fallosPendientes[metodo] ?? []), error] };
    },
    veces: (metodo: keyof ServicioAlta) => llamadas.filter((l) => l.metodo === metodo).length,
    ultima: (metodo: keyof ServicioAlta) => [...llamadas].reverse().find((l) => l.metodo === metodo),
  };
}

export type Simulado = ReturnType<typeof crearServicioSimulado>;
