import type { CambiosRestaurante, ServicioAjustes } from '../admin/ajustes/servicio';
import type { Restaurante } from '../admin/alta/tipos';
import { erroresDePeticion } from '../admin/gestion/utilesContrato';
import { ErrorApi } from '../compartido/http';

export const restauranteSemilla: Restaurante = {
  id: '11111111-1111-4111-8111-111111111111',
  nombre: 'Taquería El Paso',
  slug: 'taqueria-el-paso',
  direccion: 'Av. Juárez 120, Centro',
  telefono: '55 1234 5678',
  email: 'hola@elpaso.mx',
  logo_url: null,
  tema: 'vino',
  activo: true,
  creado_en: '2026-11-01T12:00:00Z',
};

type Metodo = keyof ServicioAjustes;

export interface OpcionesAjustesSimulado {
  restaurante?: Restaurante;
  errores?: Partial<Record<Metodo, ErrorApi>>;
}

function invalido(campo: string, mensaje: string): ErrorApi {
  return new ErrorApi(422, 'PAYLOAD_INVALIDO', mensaje, { errores: [{ campo: `body.${campo}`, mensaje, tipo: 'value_error' }] });
}

/** Servicio en memoria de Ajustes: `PATCH` parcial (sólo cambia lo enviado) y el logo sólo `https`. */
export function crearServicioAjustesSimulado(opciones: OpcionesAjustesSimulado = {}) {
  let restaurante: Restaurante = { ...(opciones.restaurante ?? restauranteSemilla) };
  const llamadas: { metodo: Metodo; argumentos: unknown[] }[] = [];
  let pendientes: Partial<Record<Metodo, ErrorApi[]>> = {};

  function registrar(metodo: Metodo, ...argumentos: unknown[]) {
    llamadas.push({ metodo, argumentos });
    const fallo = pendientes[metodo]?.shift() ?? opciones.errores?.[metodo];
    if (fallo) throw fallo;
  }

  const servicio: ServicioAjustes = {
    async cambiar(_rid, cambios: CambiosRestaurante) {
      registrar('cambiar', cambios);
      const malos = erroresDePeticion('RestauranteCambios', cambios);
      if (malos) throw new ErrorApi(422, 'PAYLOAD_INVALIDO', 'Dato inválido.', { errores: malos });
      if ('nombre' in cambios && !cambios.nombre?.trim()) throw invalido('nombre', 'El nombre no puede quedar vacío.');
      if (cambios.logo_url && !/^https:\/\/[^/@\s]+/.test(cambios.logo_url)) throw invalido('logo_url', 'el logo debe ser una URL https');
      restaurante = { ...restaurante, ...cambios } as Restaurante;
      return { ...restaurante };
    },
  };

  return {
    servicio,
    llamadas,
    restaurante: () => ({ ...restaurante }),
    fallarUnaVez(metodo: Metodo, error: ErrorApi) {
      pendientes = { ...pendientes, [metodo]: [...(pendientes[metodo] ?? []), error] };
    },
    veces: (metodo: Metodo) => llamadas.filter((l) => l.metodo === metodo).length,
    ultima: (metodo: Metodo) => [...llamadas].reverse().find((l) => l.metodo === metodo),
  };
}

export type AjustesSimulado = ReturnType<typeof crearServicioAjustesSimulado>;
