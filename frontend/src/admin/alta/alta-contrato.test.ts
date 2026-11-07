import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';

import menuApi from '../../mocks/openapi.json';
import { menuSemilla } from '../../mocks/menuSemilla';
import {
  aBorrador,
  aResultado,
  categoriaVacia,
  operaciones,
  platilloVacio,
  validar,
  type Borrador,
} from './borrador';
import { TOPES } from './tipos';

type Esquema = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const esquemas = (menuApi as { components: { schemas: Record<string, Esquema> } }).components.schemas;

function resuelto(nombre: string): Esquema {
  return esquemas[nombre]!;
}

/** El cuerpo de `confirmar` con el borrador de ejemplo ya corregido (la cecina no traía precio). */
function resultadoDeEjemplo() {
  let b = aBorrador(menuSemilla);
  const cecina = b.categorias[0]!.platillos[2]!;
  b = operaciones.editarPlatillo(b, cecina.clave, { precio: '38,50', precioRevisado: true });
  return { borrador: b, resultado: aResultado(b) };
}

describe('contrato de confirmar (app/schemas/importacion.py)', () => {
  it('aResultado envía exactamente las claves del contrato en los tres niveles', () => {
    const { resultado } = resultadoDeEjemplo();
    expect(Object.keys(resultado).sort()).toEqual(['avisos', 'categorias', 'moneda']);
    const categoria = resultado.categorias[0]!;
    expect(Object.keys(categoria).sort()).toEqual(['nombre', 'orden', 'platillos']);
    const platillo = categoria.platillos[0]!;
    expect(Object.keys(platillo).sort()).toEqual([
      'alergenos_sugeridos',
      'descripcion',
      'etiquetas_sugeridas',
      'nombre',
      'pagina',
      'precio',
      'precio_confianza',
      'variantes',
    ]);
    const variante = resultado.categorias[1]!.platillos[1]!.variantes![0]!;
    expect(Object.keys(variante).sort()).toEqual(['nombre', 'precio']);
    // Nada de lo local (claves, notas, banderas de revisión) sale del navegador.
    const texto = JSON.stringify(resultado);
    for (const ajeno of ['clave', 'notas', 'precioRevisado', 'precioConfianza', 'restaurante_id', '"id"']) {
      expect(texto).not.toContain(ajeno);
    }
  });

  it('el cuerpo valida contra el esquema ResultadoImportacion del OpenAPI de la API', () => {
    const ajv = new Ajv2020({ strict: false, validateFormats: false });
    const validarEsquema = ajv.compile({
      $ref: '#/components/schemas/ResultadoImportacion-Input',
      components: { schemas: esquemas },
    });
    const { resultado } = resultadoDeEjemplo();
    expect(validarEsquema(resultado), JSON.stringify(validarEsquema.errors)).toBe(true);
    // El esquema de verdad rechaza lo que el cliente debe impedir: la prueba no es una tautología.
    expect(validarEsquema({ ...resultado, moneda: 'peso' })).toBe(false);
    expect(validarEsquema({ ...resultado, categorias: [{ nombre: '', orden: 1, platillos: [] }] })).toBe(false);
  });

  it('TOPES coincide con los límites del esquema publicado', () => {
    const categoria = resuelto('CategoriaImportada-Input').properties;
    const platillo = resuelto('PlatilloImportado-Input').properties;
    const resultado = resuelto('ResultadoImportacion-Input').properties;
    expect(resultado.categorias.maxItems).toBe(TOPES.categorias);
    expect(categoria.nombre.maxLength).toBe(TOPES.nombreCategoria);
    expect(categoria.platillos.maxItems).toBe(TOPES.platillosPorCategoria);
    expect(platillo.nombre.maxLength).toBe(TOPES.nombrePlatillo);
    expect(platillo.descripcion.anyOf[0].maxLength).toBe(TOPES.descripcion);
    expect(platillo.alergenos_sugeridos.maxItems).toBe(TOPES.sugeridos);
    expect(platillo.etiquetas_sugeridas.maxItems).toBe(TOPES.sugeridos);
    expect(platillo.alergenos_sugeridos.items.maxLength).toBe(TOPES.claveLargo);
    expect(resuelto('VarianteImportada-Input').properties.nombre.maxLength).toBe(TOPES.nombreVariante);
    expect(platillo.precio.anyOf[0].anyOf[0].maximum).toBe(TOPES.precioMaximo);
    expect(categoria.orden.maximum).toBe(10_000);
    // Los esquemas de restaurante, mesas y personal también fijan los topes de sus formularios.
    expect(resuelto('MesasCrear').properties.cantidad.maximum).toBe(TOPES.mesas);
    expect(resuelto('MesasCrear').properties.capacidad.maximum).toBe(TOPES.capacidad);
    expect(resuelto('PersonalCrear').properties.pin.pattern).toBe('^[0-9]{4,6}$');
    expect(resuelto('RestauranteCrear').properties.nombre.maxLength).toBe(TOPES.nombreRestaurante);
  });
});

describe('validar: lo que el servidor rechazaría', () => {
  function conCategorias(n: number, nombre = (i: number) => `C${i}`): Borrador {
    return {
      moneda: 'MXN',
      avisos: [],
      notas: [],
      categorias: Array.from({ length: n }, (_, i) => {
        const c = categoriaVacia(nombre(i));
        c.platillos = [{ ...platilloVacio(), nombre: `P${i}`, precio: '10' }];
        return c;
      }),
    };
  }

  it('101 categorías bloquean; 100 pasan', () => {
    expect(validar(conCategorias(100))).toEqual([]);
    expect(validar(conCategorias(101)).map((p) => p.mensaje)).toEqual([expect.stringContaining('hasta 100 categorías')]);
  });

  it('nombres de categoría de 101 y 201 letras bloquean; el largo se cuenta en puntos de código', () => {
    expect(validar(conCategorias(1, () => 'x'.repeat(100)))).toEqual([]);
    expect(validar(conCategorias(1, () => 'x'.repeat(101))).length).toBe(1);
    expect(validar(conCategorias(1, () => 'x'.repeat(201))).length).toBe(1);
    // 100 emojis son 200 unidades UTF-16 pero 100 puntos de código: caben.
    expect(validar(conCategorias(1, () => '🍕'.repeat(100)))).toEqual([]);
    expect(validar(conCategorias(1, () => '🍕'.repeat(101))).length).toBe(1);
  });

  it('`orden` nunca pasa de 10 000: se numera por posición y con ≤ 100 categorías llega a 100', () => {
    const resultado = aResultado(conCategorias(100));
    expect(Math.max(...resultado.categorias.map((c) => c.orden))).toBe(100);
    expect(Math.min(...resultado.categorias.map((c) => c.orden))).toBe(1);
  });

  it('501 platillos en una categoría bloquean', () => {
    const b = conCategorias(1);
    b.categorias[0]!.platillos = Array.from({ length: 501 }, (_, i) => ({ ...platilloVacio(), nombre: `P${i}`, precio: '1' }));
    expect(validar(b).map((p) => p.mensaje)).toEqual([expect.stringContaining('hasta 500 platillos')]);
  });

  it('variantes: nombre vacío, precio inválido o nombre de 101 letras bloquean; precio 0 sólo avisa', () => {
    const base = aBorrador(menuSemilla);
    const quesadilla = base.categorias[1]!.platillos[1]!;
    const sinHuecos = operaciones.editarPlatillo(
      operaciones.editarPlatillo(base, base.categorias[0]!.platillos[2]!.clave, { precio: '40', precioRevisado: true }),
      quesadilla.clave,
      {},
    );
    expect(validar(sinHuecos)).toEqual([]);
    const v = quesadilla.variantes[0]!;
    for (const cambio of [{ nombre: '' }, { precio: 'caro' }, { nombre: 'x'.repeat(101) }]) {
      const malo = operaciones.editarVariante(sinHuecos, quesadilla.clave, v.clave, cambio);
      expect(validar(malo).map((p) => p.campo)).toEqual(['variante']);
    }
    const gratis = aBorrador({
      moneda: 'MXN',
      categorias: [
        {
          nombre: 'Postres',
          orden: 1,
          platillos: [{ nombre: 'Flan', precio: 0, precio_confianza: 'alta' }],
        },
      ],
    });
    // $0 no bloquea, pero nace sin revisar y con confianza media.
    expect(validar(gratis)).toEqual([]);
    expect(gratis.categorias[0]!.platillos[0]).toMatchObject({ precioRevisado: false, precioConfianza: 'media' });
  });

  it('una categoría sin nombre y sin platillos se descarta sin bloquear', () => {
    const b = operaciones.agregarCategoria(conCategorias(2));
    expect(validar(b)).toEqual([]);
    expect(aResultado(b).categorias).toHaveLength(2);
  });

  it('claves repetidas o de más de 30 de la IA se normalizan y se avisa del recorte', () => {
    const muchas = Array.from({ length: 35 }, (_, i) => `alergeno ${i}`);
    const b = aBorrador({
      moneda: 'MXN',
      categorias: [
        {
          nombre: 'X',
          orden: 1,
          platillos: [
            { nombre: 'Y', precio: 10, precio_confianza: 'alta', alergenos_sugeridos: [...muchas, 'Gluten', 'gluten'], etiquetas_sugeridas: ['Vegano', 'vegano'] },
          ],
        },
      ],
    });
    const p = b.categorias[0]!.platillos[0]!;
    expect(p.alergenos).toHaveLength(30);
    expect(p.etiquetas).toEqual(['vegano']);
    expect(b.notas[0]).toContain('conservamos las primeras 30');
    expect(aResultado(b).categorias[0]!.platillos[0]!.alergenos_sugeridos).toHaveLength(30);
  });
});
