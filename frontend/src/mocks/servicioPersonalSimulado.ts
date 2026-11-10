import type { CambiosPersonal, Personal, RolPersonal, ServicioPersonal } from '../admin/personal/servicio';
import { ErrorApi } from '../compartido/http';

const AHORA = '2026-11-10T12:00:00Z';
const MENSAJE_NOMBRE_REPETIDO = 'Ya hay una persona activa con ese nombre.';
const MAX_ACTIVOS = 50;

export function uuidPersona(n: number): string {
  return `00000000-0000-4000-8000-0000000e${String(n).padStart(4, '0')}`;
}

export function personaDe(n: number, parche: Partial<Personal> = {}): Personal {
  return { id: uuidPersona(n), nombre: `Persona ${n}`, rol: 'mesero', activo: true, creado_en: AHORA, ultimo_acceso_en: null, ...parche };
}

export const personalSemilla: Personal[] = [
  personaDe(1, { nombre: 'Valeria Ruiz', rol: 'capitan', ultimo_acceso_en: '2026-11-10T09:30:00Z' }),
  personaDe(2, { nombre: 'Luis Ortega' }),
  personaDe(3, { nombre: 'Marta Díaz' }),
  personaDe(4, { nombre: 'Jorge Peña', activo: false }),
];

type Metodo = keyof ServicioPersonal;

export interface OpcionesPersonalSimulado {
  personal?: Personal[];
  errores?: Partial<Record<Metodo, ErrorApi>>;
}

const clave = (nombre: string) => nombre.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');

function invalido(campo: string, mensaje: string, tipo: string): ErrorApi {
  return new ErrorApi(422, 'PAYLOAD_INVALIDO', mensaje, { errores: [{ campo, mensaje, tipo }] });
}

/**
 * Servicio en memoria con la forma del contrato (`app/schemas/personal.py`) y las reglas de
 * `app/services/personal.py`: PIN de 4–6 dígitos (cualquiera vale, `0000` y `1234` también), nombre único
 * entre activos (409), tope de 50 activos (422 `limite_de_personal`). **El PIN no se guarda ni queda en
 * `llamadas`**: sólo se registra que se pidió.
 */
export function crearServicioPersonalSimulado(opciones: OpcionesPersonalSimulado = {}) {
  let personal = (opciones.personal ?? personalSemilla).map((p) => ({ ...p }));
  const llamadas: { metodo: Metodo; argumentos: unknown[] }[] = [];
  let pendientes: Partial<Record<Metodo, ErrorApi[]>> = {};
  let siguiente = personal.length + 1;
  let pinesReasignados = 0;

  function registrar(metodo: Metodo, ...argumentos: unknown[]) {
    llamadas.push({ metodo, argumentos });
    const fallo = pendientes[metodo]?.shift() ?? opciones.errores?.[metodo];
    if (fallo) throw fallo;
  }
  const activos = () => personal.filter((p) => p.activo);
  function comprobarPin(pin: string) {
    if (!/^[0-9]{4,6}$/.test(pin)) throw invalido('body.pin', 'El PIN debe tener de 4 a 6 dígitos.', 'string_pattern_mismatch');
  }
  function tope() {
    const mensaje = `Cada restaurante puede tener hasta ${MAX_ACTIVOS} personas activas.`;
    return invalido('body', mensaje, 'limite_de_personal');
  }

  const servicio: ServicioPersonal = {
    async listar() {
      registrar('listar');
      return personal.map((p) => ({ ...p }));
    },
    async crear(_rid, datos) {
      // Se registra el nombre y el rol; el PIN NO queda en el registro de llamadas.
      registrar('crear', { nombre: datos.nombre, rol: datos.rol });
      comprobarPin(datos.pin);
      if (activos().length >= MAX_ACTIVOS) throw tope();
      if (activos().some((p) => clave(p.nombre) === clave(datos.nombre))) {
        throw new ErrorApi(409, 'CONFLICTO', MENSAJE_NOMBRE_REPETIDO);
      }
      const creada: Personal = personaDe(siguiente++, { nombre: datos.nombre.trim(), rol: datos.rol });
      personal = [...personal, creada];
      return { ...creada };
    },
    async cambiar(id, cambios: CambiosPersonal) {
      registrar('cambiar', id, cambios);
      const actual = personal.find((p) => p.id === id);
      if (!actual) throw new ErrorApi(404, 'RECURSO_NO_ENCONTRADO', 'No encontramos este recurso.');
      const nueva: Personal = {
        ...actual,
        ...(cambios.nombre !== undefined ? { nombre: cambios.nombre.trim() } : {}),
        ...(cambios.rol !== undefined ? { rol: cambios.rol as RolPersonal } : {}),
        ...(cambios.activo !== undefined ? { activo: cambios.activo } : {}),
      };
      if (nueva.activo) {
        if (!actual.activo && activos().length >= MAX_ACTIVOS) throw tope();
        if (personal.some((p) => p.id !== id && p.activo && clave(p.nombre) === clave(nueva.nombre))) {
          throw new ErrorApi(409, 'CONFLICTO', MENSAJE_NOMBRE_REPETIDO);
        }
      }
      personal = personal.map((p) => (p.id === id ? nueva : p));
      return { ...nueva };
    },
    async reasignarPin(id, pin) {
      registrar('reasignarPin', id);
      comprobarPin(pin);
      if (!personal.some((p) => p.id === id)) throw new ErrorApi(404, 'RECURSO_NO_ENCONTRADO', 'No encontramos este recurso.');
      pinesReasignados += 1;
    },
  };

  return {
    servicio,
    llamadas,
    personal: () => personal.map((p) => ({ ...p })),
    pinesReasignados: () => pinesReasignados,
    fallarUnaVez(metodo: Metodo, error: ErrorApi) {
      pendientes = { ...pendientes, [metodo]: [...(pendientes[metodo] ?? []), error] };
    },
    veces: (metodo: Metodo) => llamadas.filter((l) => l.metodo === metodo).length,
  };
}

export type PersonalSimulado = ReturnType<typeof crearServicioPersonalSimulado>;
