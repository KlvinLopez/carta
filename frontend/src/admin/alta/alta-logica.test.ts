import { describe, expect, it } from 'vitest';

import { menuSemilla } from '../../mocks/menuSemilla';
import { validarArchivo } from './archivo';
import {
  aBorrador,
  aResultado,
  leerPrecio,
  normalizarClave,
  operaciones,
  preciosPorRevisar,
  validar,
} from './borrador';

describe('archivo de la carta (AC-25.1)', () => {
  it('acepta PDF, JPG y PNG de hasta 20 MB', () => {
    expect(validarArchivo({ name: 'carta.pdf', type: 'application/pdf', size: 1000 })).toBeNull();
    expect(validarArchivo({ name: 'foto.JPG', type: '', size: 1000 })).toBeNull();
    expect(validarArchivo({ name: 'foto.png', type: 'image/png', size: 20 * 1024 * 1024 })).toBeNull();
  });
  it('rechaza otros tipos, archivos vacíos y los de más de 20 MB antes de subir', () => {
    expect(validarArchivo({ name: 'carta.docx', type: 'application/msword', size: 10 })).toMatch(/PDF, JPG o PNG/);
    expect(validarArchivo({ name: 'carta.pdf', type: 'application/pdf', size: 0 })).toMatch(/vacío/);
    expect(validarArchivo({ name: 'carta.pdf', type: 'application/pdf', size: 20 * 1024 * 1024 + 1 })).toMatch(/20 MB/);
  });
});

describe('borrador de la revisión', () => {
  it('convierte el resultado de la API y lo devuelve con la forma de ResultadoImportacion', () => {
    const borrador = aBorrador(menuSemilla);
    expect(borrador.categorias.map((c) => c.nombre)).toEqual(['Tacos', 'Especialidades', 'Bebidas']);
    // Cecina no trae precio: se valida y no deja confirmar hasta que el operador lo ponga.
    expect(validar(borrador).map((p) => p.campo)).toEqual(['precio']);
    const sinHuecos = operaciones.editarPlatillo(
      borrador,
      borrador.categorias[0]!.platillos[2]!.clave,
      { precio: '38,50', precioRevisado: true },
    );
    expect(validar(sinHuecos)).toEqual([]);
    const resultado = aResultado(sinHuecos);
    expect(resultado.moneda).toBe('MXN');
    expect(resultado.categorias.map((c) => c.orden)).toEqual([1, 2, 3]);
    expect(resultado.categorias[0]!.platillos[2]).toMatchObject({
      nombre: 'Cecina enchilada',
      descripcion: null,
      precio: 38.5,
      precio_confianza: 'alta',
      etiquetas_sugeridas: ['picante'],
    });
    // Las variantes pasan tal cual.
    expect(resultado.categorias[1]!.platillos[1]!.variantes).toHaveLength(2);
  });

  it('AC-25.5: precios de confianza baja o ausentes nacen sin revisar', () => {
    const borrador = aBorrador(menuSemilla);
    expect(preciosPorRevisar(borrador)).toBe(2); // Suadero (baja) y Cecina (sin precio)
  });

  it('lee precios como se teclean en México y rechaza lo que la base no admitiría', () => {
    expect(leerPrecio('145')).toBe(145);
    expect(leerPrecio('89,50')).toBe(89.5);
    expect(leerPrecio('$ 12.5')).toBe(12.5);
    expect(leerPrecio('')).toBeNull();
    expect(leerPrecio('12,555')).toBeNull();
    expect(leerPrecio('-4')).toBeNull();
    expect(leerPrecio('abc')).toBeNull();
    expect(leerPrecio('123456789')).toBeNull();
  });

  it('normaliza alérgenos y etiquetas a claves cortas sin acentos', () => {
    expect(normalizarClave(' Frutos Secos ')).toBe('frutos_secos');
    expect(normalizarClave('Lácteos')).toBe('lacteos');
    expect(normalizarClave('x'.repeat(80))).toHaveLength(40);
  });

  it('respeta los topes: nombres largos y descripciones largas no se confirman', () => {
    const b = aBorrador(menuSemilla);
    const p = b.categorias[0]!.platillos[0]!;
    const largo = operaciones.editarPlatillo(b, p.clave, { nombre: 'x'.repeat(201), descripcion: 'y'.repeat(1001) });
    expect(validar(largo).map((x) => x.campo)).toEqual(expect.arrayContaining(['nombre', 'descripcion']));
  });

  it('agrega, quita y reordena filas por categoría', () => {
    let b = aBorrador(menuSemilla);
    const tacos = b.categorias[0]!;
    b = operaciones.moverPlatillo(b, tacos.platillos[0]!.clave, 1);
    expect(b.categorias[0]!.platillos.map((p) => p.nombre)).toEqual(['Suadero', 'Pastor', 'Cecina enchilada']);
    b = operaciones.moverPlatillo(b, b.categorias[0]!.platillos[0]!.clave, -1); // ya es el primero: no cambia
    expect(b.categorias[0]!.platillos[0]!.nombre).toBe('Suadero');
    b = operaciones.quitarPlatillo(b, b.categorias[0]!.platillos[0]!.clave);
    expect(b.categorias[0]!.platillos).toHaveLength(2);
    b = operaciones.agregarPlatillo(b, tacos.clave);
    expect(b.categorias[0]!.platillos).toHaveLength(3);
    b = operaciones.moverCategoria(b, b.categorias[2]!.clave, -1);
    expect(b.categorias.map((c) => c.nombre)).toEqual(['Tacos', 'Bebidas', 'Especialidades']);
    const resultado = aResultado(operaciones.agregarCategoria(b));
    // La categoría nueva está vacía: no llega al menú y las demás se numeran 1..3.
    expect(resultado.categorias.map((c) => [c.nombre, c.orden])).toEqual([['Tacos', 1], ['Bebidas', 2], ['Especialidades', 3]]);
  });

  it('sin categorías o sin platillos no hay nada que confirmar', () => {
    expect(validar({ moneda: 'MXN', avisos: [], notas: [], categorias: [] }).length).toBe(1);
    const vacio = operaciones.agregarCategoria({ moneda: 'MXN', avisos: [], notas: [], categorias: [] });
    // Una categoría sin nombre ni platillos se descarta al confirmar: no estorba, pero sin nada más no hay carta.
    expect(validar(vacio).map((p) => p.campo)).toEqual(['categoria']);
    const conNombre = operaciones.renombrarCategoria(vacio, vacio.categorias[0]!.clave, 'Postres');
    expect(validar(conNombre).map((p) => p.mensaje)).toEqual(['Agrega al menos un platillo.']);
  });
});
