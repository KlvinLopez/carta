import type { components } from '../../compartido/api';

export type Restaurante = components['schemas']['RestauranteRespuesta'];
export type Importacion = components['schemas']['ImportacionRespuesta'];
export type Resultado = components['schemas']['ResultadoImportacion-Input'];
export type Mesa = components['schemas']['MesaRespuesta'];
export type Personal = components['schemas']['PersonalRespuesta'];
export type RolPersonal = components['schemas']['RolPersonal'];
export type Confianza = components['schemas']['PlatilloImportado-Input']['precio_confianza'];

/**
 * Topes de `app/schemas/importacion.py` y `comun.py`: el borrador se valida aquí con las mismas
 * cifras para que un 422 sea raro, no la regla.
 */
export const TOPES = {
  categorias: 100,
  platillosPorCategoria: 500,
  sugeridos: 30,
  claveLargo: 40,
  nombreCategoria: 100,
  nombrePlatillo: 200,
  descripcion: 1000,
  precioMaximo: 99_999_999.99,
  nombreRestaurante: 200,
  nombrePersonal: 60,
  mesas: 100,
  capacidad: 50,
} as const;
