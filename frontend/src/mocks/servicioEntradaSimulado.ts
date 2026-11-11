import { ErrorApi } from '../compartido/http';
import type {
  EntrarRespuesta,
  MiembroDeSesion,
  MiembroRespuesta,
  RespuestaEstado,
  ServicioEntrada,
  SesionEstado,
} from '../comensal/entrada/servicio';

export const CODIGO_SEMILLA = 'Jx3k9QwLmN2pR7sT4vY8zA';
export const MAX_MIEMBROS = 12;
/** Los 12 de `app/services/sesion.py::COLORES`: `#RRGGBB` en mayúsculas, uno por miembro. */
export const COLORES = [
  '#4F1728',
  '#B8860B',
  '#2F5D50',
  '#C2562E',
  '#3B4A7A',
  '#8A5A83',
  '#5E7D3A',
  '#A63D40',
  '#2D6E8E',
  '#7A5230',
  '#6B2D3E',
  '#4E5D6C',
];
const PALABRAS_BLOQUEADAS = ['tonto', 'caca'];

type Metodo = keyof ServicioEntrada;

export interface OpcionesEntradaSimulado {
  /** Código de la mesa que existe; cualquier otro da 404 `MESA_NO_ENCONTRADA`. */
  codigo?: string;
  numeroMesa?: number;
  restaurante?: { nombre: string; slug?: string; logo_url?: string | null };
  /** Comensales ya sentados antes de entrar. */
  ocupados?: number;
  /** Falla siempre ese método. */
  errores?: Partial<Record<Metodo, ErrorApi>>;
}

/** Cuerpo de error con la envoltura del contrato. */
export function errorSimulado(estado: number, codigo: string, mensaje = 'Mensaje del servidor.', reintentarEn: number | null = null) {
  return new ErrorApi(estado, codigo, mensaje, {}, 'req-simulado', reintentarEn);
}

/** Cuerpo JSON que el servidor mandaría para ese error (la envoltura `ErrorRespuesta` del contrato). */
export function cuerpoDeError(e: ErrorApi) {
  return { error: { codigo: e.codigo, mensaje: e.message, detalles: e.detalles, request_id: e.requestId } };
}

/**
 * Servicio en memoria con la forma del contrato (`app/schemas/sesion.py`) y las reglas de
 * `app/services/sesion.py`: 12 miembros como máximo (409), alias de 1–24 puntos de código con lista
 * de bloqueo (422), una cookie vencida da 401 y volver a entrar crea un comensal nuevo, una sesión
 * cerrada da 410 en `estado` y `entrar` abre una nueva.
 */
export function crearServicioEntradaSimulado(opciones: OpcionesEntradaSimulado = {}) {
  const codigo = opciones.codigo ?? CODIGO_SEMILLA;
  let sesionN = 1;
  let miembroN = 0;
  let miembros: MiembroDeSesion[] = [];
  let yo: string | null = null; // la «cookie»: id del miembro, o null si no hay
  let cerrada = false;
  let version = 0;
  const llamadas: { metodo: Metodo; argumentos: unknown[] }[] = [];
  const pendientes: Partial<Record<Metodo, ErrorApi[]>> = {};
  const retenidas: Partial<Record<Metodo, Promise<void>>> = {};
  const restaurante = {
    id: '00000000-0000-4000-8000-0000000a0001',
    nombre: opciones.restaurante?.nombre ?? 'La Ceiba',
    slug: opciones.restaurante?.slug ?? 'la-ceiba',
    logo_url: opciones.restaurante?.logo_url ?? null,
    tema: 'vino',
  };

  function sentar(): MiembroDeSesion {
    miembroN += 1;
    const m: MiembroDeSesion = {
      id: `00000000-0000-4000-8000-${String(miembroN).padStart(12, '0')}`,
      alias: `Comensal ${miembros.length + 1}`,
      color_avatar: COLORES[(miembroN - 1) % COLORES.length]!,
      rol: miembros.length === 0 ? 'host' : 'miembro',
      estado: 'armando',
    };
    miembros = [...miembros, m];
    version += 1;
    return m;
  }
  for (let i = 0; i < (opciones.ocupados ?? 0); i += 1) sentar();

  async function registrar(metodo: Metodo, ...argumentos: unknown[]) {
    llamadas.push({ metodo, argumentos });
    await retenidas[metodo];
    const fallo = pendientes[metodo]?.shift() ?? opciones.errores?.[metodo];
    if (fallo) throw fallo;
  }

  const idSesion = () => `00000000-0000-4000-8000-${String(900000000000 + sesionN)}`;
  const resumenMiembro = (m: MiembroDeSesion): MiembroRespuesta => ({ id: m.id, alias: m.alias, color_avatar: m.color_avatar, rol: m.rol });
  const etagDe = () => `"${sesionN}-${version}-${yo}"`;

  const servicio: ServicioEntrada = {
    async entrar(c, signal) {
      await registrar('entrar', c);
      // Como el cliente real: una entrada cancelada nunca llega a crear al comensal.
      if (signal?.aborted) throw new DOMException('cancelado', 'AbortError');
      if (c !== codigo) throw errorSimulado(404, 'MESA_NO_ENCONTRADA', 'No encontramos esta mesa.');
      if (cerrada) {
        sesionN += 1;
        miembros = [];
        cerrada = false;
        yo = null;
      }
      let actual = miembros.find((m) => m.id === yo);
      if (!actual) {
        if (miembros.length >= MAX_MIEMBROS) throw errorSimulado(409, 'SESION_LLENA', 'La mesa está llena.');
        actual = sentar();
        yo = actual.id;
      }
      const respuesta: EntrarRespuesta = {
        sesion: {
          id: idSesion(),
          estado: 'activa',
          mesa: { numero: opciones.numeroMesa ?? 7, capacidad: 4 },
          restaurante,
        },
        miembro: resumenMiembro(actual),
      };
      return structuredClone(respuesta);
    },
    async estado(etag): Promise<RespuestaEstado> {
      await registrar('estado', etag);
      if (cerrada) throw errorSimulado(410, 'SESION_CERRADA', 'La mesa se cerró.');
      if (!yo || !miembros.some((m) => m.id === yo)) throw errorSimulado(401, 'TOKEN_EXPIRADO', 'Tu sesión venció.');
      const actual = etagDe();
      if (etag === actual) return { sinCambios: true };
      const cuerpo: SesionEstado = {
        id: idSesion(),
        estado: 'activa',
        mesa: { numero: opciones.numeroMesa ?? 7, capacidad: 4 },
        yo,
        listos: 0,
        total_miembros: miembros.length,
        miembros: structuredClone(miembros),
      };
      return { sinCambios: false, estado: cuerpo, etag: actual };
    },
    async cambiarAlias(alias) {
      await registrar('cambiarAlias', alias);
      if (cerrada) throw errorSimulado(410, 'SESION_CERRADA', 'La mesa se cerró.');
      const m = miembros.find((x) => x.id === yo);
      if (!m) throw errorSimulado(401, 'TOKEN_EXPIRADO', 'Tu sesión venció.');
      const largo = [...alias.trim()].length;
      if (largo < 1 || largo > 24) throw errorSimulado(422, 'PAYLOAD_INVALIDO', 'Dato inválido.');
      if (PALABRAS_BLOQUEADAS.some((p) => alias.toLowerCase().includes(p))) {
        throw errorSimulado(422, 'ALIAS_NO_PERMITIDO', 'Ese nombre no está permitido.');
      }
      m.alias = alias.trim();
      version += 1;
      return resumenMiembro(m);
    },
  };

  return {
    servicio,
    llamadas,
    /** La mesa se cierra (el personal la liberó o pasaron 3 h): `estado` da 410. */
    cerrar() {
      cerrada = true;
    },
    /** El token de 6 h venció con la mesa viva: `estado` da 401 y volver a entrar crea un miembro nuevo. */
    expirarToken() {
      yo = null;
    },
    /** Otro comensal se sienta (cambia el estado de la mesa). */
    sentarOtro() {
      return sentar();
    },
    fallarUnaVez(metodo: Metodo, error: ErrorApi) {
      (pendientes[metodo] ??= []).push(error);
    },
    /** Retiene un método hasta llamar a la función devuelta (respuesta lenta). */
    retener(metodo: Metodo) {
      let soltar!: () => void;
      retenidas[metodo] = new Promise<void>((r) => (soltar = r));
      return () => {
        soltar();
        delete retenidas[metodo];
      };
    },
    miembros: () => miembros.map((m) => ({ ...m })),
    yo: () => yo,
  };
}
