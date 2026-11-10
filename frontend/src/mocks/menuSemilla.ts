import type { components } from '../compartido/api';

type Resultado = components['schemas']['ResultadoImportacion-Output'];

/**
 * Borrador de ejemplo con la forma de `ResultadoImportacion` (app/schemas/importacion.py), basado en
 * `tests/fixtures/menus/taqueria-el-paso`: incluye un precio de confianza baja, un platillo sin
 * precio, variantes y alérgenos/etiquetas sugeridos para ejercitar la revisión.
 */
export const menuSemilla: Resultado = {
  moneda: 'MXN',
  categorias: [
    {
      nombre: 'Tacos',
      orden: 1,
      platillos: [
        {
          nombre: 'Pastor',
          descripcion: 'con piña, cebolla y cilantro',
          precio: 22,
          precio_confianza: 'alta',
          variantes: [],
          alergenos_sugeridos: [],
          etiquetas_sugeridas: [],
          pagina: 1,
        },
        {
          nombre: 'Suadero',
          descripcion: null,
          precio: 25,
          precio_confianza: 'baja',
          variantes: [],
          alergenos_sugeridos: [],
          etiquetas_sugeridas: [],
          pagina: 1,
        },
        {
          nombre: 'Cecina enchilada',
          descripcion: null,
          precio: null,
          precio_confianza: 'baja',
          variantes: [],
          alergenos_sugeridos: [],
          etiquetas_sugeridas: ['picante'],
          pagina: 1,
        },
      ],
    },
    {
      nombre: 'Especialidades',
      orden: 2,
      platillos: [
        {
          nombre: 'Gringa',
          descripcion: 'tortilla de harina, queso, pastor',
          precio: 65,
          precio_confianza: 'media',
          variantes: [],
          alergenos_sugeridos: ['gluten', 'lacteos'],
          etiquetas_sugeridas: [],
          pagina: 1,
        },
        {
          nombre: 'Quesadilla',
          descripcion: 'maíz o harina; sencilla / con carne',
          precio: 45,
          precio_confianza: 'alta',
          variantes: [
            { nombre: 'Sencilla', precio: 45 },
            { nombre: 'Con carne', precio: 70 },
          ],
          alergenos_sugeridos: ['lacteos'],
          etiquetas_sugeridas: ['vegetariano'],
          pagina: 1,
        },
      ],
    },
    {
      nombre: 'Bebidas',
      orden: 3,
      platillos: [
        {
          nombre: 'Agua fresca',
          descripcion: 'horchata, jamaica',
          precio: 30,
          precio_confianza: 'alta',
          variantes: [],
          alergenos_sugeridos: [],
          etiquetas_sugeridas: ['vegano'],
          pagina: 1,
        },
      ],
    },
  ],
  avisos: ['Nota del pie: «Precios sujetos a cambio sin previo aviso».'],
};
