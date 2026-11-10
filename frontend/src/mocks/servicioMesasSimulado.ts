import type { Mesa, ServicioMesas } from '../admin/mesas/servicio';
import { erroresDePeticion } from '../admin/gestion/utilesContrato';
import { ErrorApi } from '../compartido/http';

export function uuidMesa(n: number): string {
  return `00000000-0000-4000-8000-0000000d${String(n).padStart(4, '0')}`;
}

/** Código opaco de 22 caracteres como el del servidor; `generacion` lo cambia al regenerar. */
export function codigoDe(n: number, generacion = 0): string {
  return `Jx3k9QwLmN2pR7sT4v${String(n).padStart(2, '0')}g${generacion}`.slice(0, 22).padEnd(22, 'A');
}

export function mesaDe(n: number, parche: Partial<Mesa> = {}): Mesa {
  const codigo = parche.codigo_publico ?? codigoDe(n);
  return {
    id: uuidMesa(n),
    numero: n,
    codigo_publico: codigo,
    url_publica: `https://carta.cooking/m/${codigo}`,
    capacidad: 4,
    activa: true,
    ...parche,
  };
}

export const mesasSemilla: Mesa[] = [
  mesaDe(1),
  mesaDe(2, { capacidad: 2 }),
  mesaDe(3, { capacidad: 6 }),
  mesaDe(4),
  mesaDe(5, { activa: false, capacidad: 8 }),
];

type Metodo = keyof ServicioMesas;

export interface OpcionesMesasSimulado {
  mesas?: Mesa[];
  /** Falla siempre ese método. */
  errores?: Partial<Record<Metodo, ErrorApi>>;
}

/**
 * Servicio en memoria con la forma del contrato (`app/schemas/mesa.py`) y las reglas de
 * `app/services/mesas.py`: tope de 500 activas (422 `limite_de_mesas`), numeración a continuación de
 * la última, regenerar una mesa inactiva (409 `MESA_INACTIVA`) y PDF sin mesas activas (409).
 */
export function crearServicioMesasSimulado(opciones: OpcionesMesasSimulado = {}) {
  let mesas = (opciones.mesas ?? mesasSemilla).map((m) => ({ ...m }));
  const generaciones = new Map<string, number>();
  const llamadas: { metodo: Metodo; argumentos: unknown[] }[] = [];
  let pendientes: Partial<Record<Metodo, ErrorApi[]>> = {};

  function registrar(metodo: Metodo, ...argumentos: unknown[]) {
    llamadas.push({ metodo, argumentos });
    const fallo = pendientes[metodo]?.shift() ?? opciones.errores?.[metodo];
    if (fallo) throw fallo;
  }

  const servicio: ServicioMesas = {
    async listar(_rid, { activa, limite = 500 } = {}) {
      registrar('listar', { activa, limite });
      return mesas.filter((m) => activa === undefined || m.activa === activa).slice(0, limite).map((m) => ({ ...m }));
    },
    async crear(_rid, datos) {
      registrar('crear', datos);
      const malos = erroresDePeticion('MesasCrear', datos);
      if (malos) throw new ErrorApi(422, 'PAYLOAD_INVALIDO', 'Dato inválido.', { errores: malos });
      const activas = mesas.filter((m) => m.activa).length;
      if (activas + datos.cantidad > 500) {
        const mensaje = 'Cada restaurante puede tener hasta 500 mesas activas.';
        throw new ErrorApi(422, 'PAYLOAD_INVALIDO', mensaje, {
          errores: [{ campo: 'body.cantidad', mensaje, tipo: 'limite_de_mesas' }],
        });
      }
      const ultimo = Math.max(0, ...mesas.map((m) => m.numero));
      const nuevas = Array.from({ length: datos.cantidad }, (_, i) =>
        mesaDe(ultimo + i + 1, { capacidad: datos.capacidad }),
      );
      mesas = [...mesas, ...nuevas];
      return nuevas.map((m) => ({ ...m }));
    },
    async regenerar(id) {
      registrar('regenerar', id);
      const mesa = mesas.find((m) => m.id === id);
      if (!mesa) throw new ErrorApi(404, 'RECURSO_NO_ENCONTRADO', 'No encontramos este recurso.');
      if (!mesa.activa) {
        throw new ErrorApi(409, 'MESA_INACTIVA', 'Esa mesa está dada de baja; no tiene código que regenerar.');
      }
      const generacion = (generaciones.get(id) ?? 0) + 1;
      generaciones.set(id, generacion);
      const codigo = codigoDe(mesa.numero, generacion);
      const nueva: Mesa = { ...mesa, codigo_publico: codigo, url_publica: `https://carta.cooking/m/${codigo}` };
      mesas = mesas.map((m) => (m.id === id ? nueva : m));
      return { ...nueva };
    },
    async descargarQr(rid) {
      registrar('descargarQr', rid);
      if (!mesas.some((m) => m.activa)) {
        throw new ErrorApi(409, 'CONFLICTO', 'No tienes mesas activas: crea al menos una para generar los QR.');
      }
      return { blob: new Blob(['%PDF-1.4\n%simulado\n'], { type: 'application/pdf' }), nombre: 'qr-mesas-taqueria-el-paso.pdf' };
    },
  };

  return {
    servicio,
    llamadas,
    /** Estado actual del «servidor» (para comprobar lo que quedó). */
    mesas: () => mesas.map((m) => ({ ...m })),
    fallarUnaVez(metodo: Metodo, error: ErrorApi) {
      pendientes = { ...pendientes, [metodo]: [...(pendientes[metodo] ?? []), error] };
    },
    veces: (metodo: Metodo) => llamadas.filter((l) => l.metodo === metodo).length,
  };
}

export type MesasSimulado = ReturnType<typeof crearServicioMesasSimulado>;
