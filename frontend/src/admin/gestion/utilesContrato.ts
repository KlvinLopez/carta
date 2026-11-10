import Ajv2020 from 'ajv/dist/2020';

import api from '../../mocks/openapi.json';

/** Sólo para pruebas: valida valores contra los esquemas de `mocks/openapi.json` (formatos activos). */
const esquemas = (api as { components: { schemas: Record<string, unknown> } }).components.schemas;
const rutas = (api as unknown as { paths: Record<string, Record<string, unknown>> }).paths;

export function validador(nombre: string) {
  const ajv = new Ajv2020({ strict: false, validateFormats: true });
  ajv.addFormat('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  ajv.addFormat('date-time', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/);
  ajv.addFormat('binary', true);
  const comprobar = ajv.compile({ $ref: `#/components/schemas/${nombre}`, components: { schemas: esquemas } });
  return (valor: unknown): { valido: boolean; errores: string } => ({
    valido: comprobar(valor) as boolean,
    errores: JSON.stringify(comprobar.errors ?? []),
  });
}

export const esquema = (nombre: string) => esquemas[nombre] as Record<string, unknown> & { properties: Record<string, Record<string, unknown>> };
export const metodosDe = (ruta: string) => Object.keys(rutas[`/api/v1${ruta}`] ?? {});
export const operacion = (ruta: string, metodo: string) =>
  (rutas[`/api/v1${ruta}`] as Record<string, { parameters?: { name: string; schema: Record<string, unknown> }[]; responses: Record<string, unknown> }>)[metodo]!;

/**
 * Para los servicios simulados: valida lo que reciben contra el esquema de la petición y devuelve los
 * errores con la forma del 422 del servidor (`detalles.errores[]`), o `null` si cumple. Nunca incluye el
 * valor recibido (un PIN no debe acabar en un mensaje).
 */
export function erroresDePeticion(nombre: string, valor: unknown): { campo: string; mensaje: string; tipo: string }[] | null {
  const ajv = new Ajv2020({ strict: false, validateFormats: true, allErrors: true });
  ajv.addFormat('uuid', true);
  ajv.addFormat('date-time', true);
  const comprobar = ajv.compile({ $ref: `#/components/schemas/${nombre}`, components: { schemas: esquemas } });
  if (comprobar(valor)) return null;
  return (comprobar.errors ?? []).map((e) => ({
    campo: ['body', ...e.instancePath.split('/').filter(Boolean)].join('.') || 'body',
    mensaje: 'Dato inválido.',
    tipo: e.keyword,
  }));
}
