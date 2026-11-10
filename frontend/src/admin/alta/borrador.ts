import { TOPES, type Confianza, type Resultado } from './tipos';

/**
 * El borrador que el operador edita en el paso «Revisa». Cada fila lleva una `clave` local para
 * que React no confunda filas al reordenar o quitar; la clave no viaja a la API. El precio vive
 * como texto (lo que se teclea) y se valida al confirmar.
 */
export interface VarianteBorrador {
  clave: string;
  nombre: string;
  /** Texto tecleado, como el precio del platillo. */
  precio: string;
}

export interface PlatilloBorrador {
  clave: string;
  nombre: string;
  descripcion: string;
  precio: string;
  precioConfianza: Confianza;
  /** El operador tocó «Está bien» o corrigió el precio: ya no se resalta. */
  precioRevisado: boolean;
  variantes: VarianteBorrador[];
  alergenos: string[];
  etiquetas: string[];
  pagina: number | null;
}

export interface CategoriaBorrador {
  clave: string;
  nombre: string;
  platillos: PlatilloBorrador[];
}

export interface Borrador {
  moneda: string;
  /** Avisos de la lectura: viajan de vuelta al servidor tal cual. */
  avisos: string[];
  /** Notas sólo para el operador (recortes, claves repetidas): no viajan. */
  notas: string[];
  categorias: CategoriaBorrador[];
}

type ResultadoLeido = {
  moneda: string;
  avisos?: string[];
  categorias: {
    nombre: string;
    orden: number;
    platillos: {
      nombre: string;
      descripcion?: string | null;
      precio?: number | string | null;
      precio_confianza: Confianza;
      variantes?: { nombre: string; precio: number | string }[];
      alergenos_sugeridos?: string[];
      etiquetas_sugeridas?: string[];
      pagina?: number | null;
    }[];
  }[];
};

let contador = 0;
export const nuevaClave = (): string => `f${++contador}`;

/** Largo en puntos de código, como cuenta el servidor (un emoji es 1, no 2). */
export const largo = (texto: string): number => [...texto].length;

export function platilloVacio(): PlatilloBorrador {
  return {
    clave: nuevaClave(),
    nombre: '',
    descripcion: '',
    precio: '',
    precioConfianza: 'alta',
    precioRevisado: true,
    variantes: [],
    alergenos: [],
    etiquetas: [],
    pagina: null,
  };
}

export function categoriaVacia(nombre = ''): CategoriaBorrador {
  return { clave: nuevaClave(), nombre, platillos: [] };
}

/** «12.5» → «12,5», 12 → «12»: el texto que se muestra en el campo de precio. */
function textoDePrecio(precio: number | string | null | undefined): string {
  if (precio === null || precio === undefined) return '';
  return String(precio).replace('.', ',');
}

/** Clave corta de un alérgeno o etiqueta: minúsculas, sin acentos, guiones bajos (≤ 40). */
export function normalizarClave(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, TOPES.claveLargo);
}

/** Claves normalizadas, sin repetidas ni vacías y con el tope del contrato; `recortadas` = las que sobraron. */
export function normalizarLista(claves: string[]): { claves: string[]; recortadas: number } {
  const unicas = [...new Set(claves.map(normalizarClave).filter(Boolean))];
  return {
    claves: unicas.slice(0, TOPES.sugeridos),
    recortadas: Math.max(0, unicas.length - TOPES.sugeridos),
  };
}

export function etiquetaLegible(clave: string): string {
  const texto = clave.replace(/_/g, ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function aBorrador(resultado: ResultadoLeido): Borrador {
  const ordenadas = [...resultado.categorias].sort((a, b) => a.orden - b.orden);
  const notas: string[] = [];
  const categorias = ordenadas.map((c) => ({
    clave: nuevaClave(),
    nombre: c.nombre,
    platillos: c.platillos.map((p) => {
      const alergenos = normalizarLista(p.alergenos_sugeridos ?? []);
      const etiquetas = normalizarLista(p.etiquetas_sugeridas ?? []);
      if (alergenos.recortadas > 0 || etiquetas.recortadas > 0) {
        notas.push(
          `«${p.nombre}» traía más de ${TOPES.sugeridos} alérgenos o etiquetas: conservamos las primeras ${TOPES.sugeridos}.`,
        );
      }
      const dudoso =
        p.precio === null || p.precio === undefined || p.precio_confianza === 'baja' || Number(p.precio) === 0;
      return {
        clave: nuevaClave(),
        nombre: p.nombre,
        descripcion: p.descripcion ?? '',
        precio: textoDePrecio(p.precio),
        // Un precio de $0 se trata como confianza media: probablemente no es gratis.
        precioConfianza: Number(p.precio) === 0 && p.precio_confianza === 'alta' ? ('media' as const) : p.precio_confianza,
        // Sin precio, con confianza baja o en $0, el operador debe mirarlo: nace sin revisar.
        precioRevisado: !dudoso,
        variantes: (p.variantes ?? []).map((v) => ({
          clave: nuevaClave(),
          nombre: v.nombre,
          precio: textoDePrecio(v.precio),
        })),
        alergenos: alergenos.claves,
        etiquetas: etiquetas.claves,
        pagina: p.pagina ?? null,
      };
    }),
  }));
  return { moneda: resultado.moneda, avisos: resultado.avisos ?? [], notas, categorias };
}

/** Precio tecleado → número con ≤ 2 decimales dentro del tope de la base; `null` si no vale. */
export function leerPrecio(texto: string): number | null {
  const limpio = texto.trim().replace(/^\$\s*/, '').replace(',', '.');
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(limpio)) return null;
  const valor = Number(limpio);
  return valor <= TOPES.precioMaximo ? valor : null;
}

export interface Problema {
  /** `clave` de la categoría o del platillo con el problema; `''` si es del borrador entero. */
  clave: string;
  campo: 'nombre' | 'precio' | 'descripcion' | 'categoria' | 'variante';
  mensaje: string;
}

/** Lo que impide confirmar: el servidor rechazaría estos casos con 422. */
export function validar(borrador: Borrador): Problema[] {
  const problemas: Problema[] = [];
  // Una categoría sin nombre y sin platillos se descarta al confirmar: no estorba.
  const efectivas = borrador.categorias.filter((c) => c.platillos.length > 0 || c.nombre.trim() !== '');
  if (efectivas.length === 0) {
    problemas.push({ clave: '', campo: 'categoria', mensaje: 'Agrega al menos una categoría.' });
  }
  if (borrador.categorias.length > TOPES.categorias) {
    problemas.push({
      clave: '',
      campo: 'categoria',
      mensaje: `Una carta admite hasta ${TOPES.categorias} categorías. Junta algunas.`,
    });
  }
  let platillos = 0;
  for (const categoria of efectivas) {
    const nombre = categoria.nombre.trim();
    if (!nombre) {
      problemas.push({ clave: categoria.clave, campo: 'nombre', mensaje: 'Ponle nombre a la categoría.' });
    } else if (largo(nombre) > TOPES.nombreCategoria) {
      problemas.push({ clave: categoria.clave, campo: 'nombre', mensaje: 'El nombre de la categoría es muy largo (máximo 100 letras).' });
    }
    if (categoria.platillos.length > TOPES.platillosPorCategoria) {
      problemas.push({
        clave: categoria.clave,
        campo: 'categoria',
        mensaje: `Una categoría admite hasta ${TOPES.platillosPorCategoria} platillos.`,
      });
    }
    for (const p of categoria.platillos) {
      platillos += 1;
      const nombrePlatillo = p.nombre.trim();
      if (!nombrePlatillo) {
        problemas.push({ clave: p.clave, campo: 'nombre', mensaje: 'Ponle nombre al platillo.' });
      } else if (largo(nombrePlatillo) > TOPES.nombrePlatillo) {
        problemas.push({ clave: p.clave, campo: 'nombre', mensaje: 'El nombre es muy largo (máximo 200 letras).' });
      }
      if (largo(p.descripcion.trim()) > TOPES.descripcion) {
        problemas.push({ clave: p.clave, campo: 'descripcion', mensaje: 'La descripción es muy larga (máximo 1000 letras).' });
      }
      if (leerPrecio(p.precio) === null) {
        problemas.push({
          clave: p.clave,
          campo: 'precio',
          mensaje: p.precio.trim() ? 'Escribe un precio válido, por ejemplo 145 o 89,50.' : 'Falta el precio.',
        });
      }
      for (const v of p.variantes) {
        const nombreVariante = v.nombre.trim();
        if (!nombreVariante || largo(nombreVariante) > TOPES.nombreVariante || leerPrecio(v.precio) === null) {
          problemas.push({
            clave: p.clave,
            campo: 'variante',
            mensaje: 'Revisa las variantes: cada una lleva nombre (máximo 100 letras) y un precio válido.',
          });
          break;
        }
      }
    }
  }
  if (platillos === 0 && efectivas.length > 0) {
    problemas.push({ clave: '', campo: 'categoria', mensaje: 'Agrega al menos un platillo.' });
  }
  return problemas;
}

/** Platillos con el precio dudoso que el operador todavía no ha mirado (AC-25.5). */
export function preciosPorRevisar(borrador: Borrador): number {
  return borrador.categorias.reduce((n, c) => n + c.platillos.filter((p) => !p.precioRevisado).length, 0);
}

/** Las categorías que llegarán al menú: una sin platillos se descarta al confirmar. */
export function categoriasConPlatillos(borrador: Borrador): CategoriaBorrador[] {
  return borrador.categorias.filter((c) => c.platillos.length > 0);
}

export function contarPlatillos(borrador: Borrador): number {
  return borrador.categorias.reduce((n, c) => n + c.platillos.length, 0);
}

/**
 * Borrador revisado → cuerpo de `POST …/confirmar` (`ResultadoImportacion`). Supone `validar`
 * sin problemas. Quita espacios, descarta chips vacíos o repetidos y categorías sin platillos, y
 * numera las que quedan.
 */
export function aResultado(borrador: Borrador): Resultado {
  return {
    moneda: borrador.moneda,
    avisos: borrador.avisos,
    categorias: categoriasConPlatillos(borrador).map((c, i) => ({
      nombre: c.nombre.trim(),
      orden: i + 1,
      platillos: c.platillos.map((p) => ({
        nombre: p.nombre.trim(),
        descripcion: p.descripcion.trim() || null,
        precio: leerPrecio(p.precio),
        precio_confianza: p.precioRevisado ? 'alta' : p.precioConfianza,
        variantes: p.variantes.map((v) => ({ nombre: v.nombre.trim(), precio: leerPrecio(v.precio) ?? 0 })),
        alergenos_sugeridos: normalizarLista(p.alergenos).claves,
        etiquetas_sugeridas: normalizarLista(p.etiquetas).claves,
        pagina: p.pagina,
      })),
    })),
  };
}

// ── Operaciones del editor (puras: devuelven un borrador nuevo) ─────────────────────────────

function mover<T>(lista: T[], desde: number, hacia: number): T[] {
  if (hacia < 0 || hacia >= lista.length) return lista;
  const copia = [...lista];
  const [elemento] = copia.splice(desde, 1);
  copia.splice(hacia, 0, elemento!);
  return copia;
}

/** Cambia sólo las categorías que `f` devuelve distintas: el resto conserva su identidad (memo de filas). */
function mapearPlatillos(b: Borrador, f: (c: CategoriaBorrador) => CategoriaBorrador): Borrador {
  let cambio = false;
  const categorias = b.categorias.map((c) => {
    const nueva = f(c);
    if (nueva !== c) cambio = true;
    return nueva;
  });
  return cambio ? { ...b, categorias } : b;
}

export const operaciones = {
  agregarCategoria(b: Borrador): Borrador {
    if (b.categorias.length >= TOPES.categorias) return b;
    return { ...b, categorias: [...b.categorias, categoriaVacia()] };
  },
  renombrarCategoria(b: Borrador, clave: string, nombre: string): Borrador {
    return mapearPlatillos(b, (c) => (c.clave === clave ? { ...c, nombre } : c));
  },
  quitarCategoria(b: Borrador, clave: string): Borrador {
    return { ...b, categorias: b.categorias.filter((c) => c.clave !== clave) };
  },
  moverCategoria(b: Borrador, clave: string, delta: -1 | 1): Borrador {
    const i = b.categorias.findIndex((c) => c.clave === clave);
    return i < 0 ? b : { ...b, categorias: mover(b.categorias, i, i + delta) };
  },
  agregarPlatillo(b: Borrador, claveCategoria: string): Borrador {
    return mapearPlatillos(b, (c) =>
      c.clave === claveCategoria && c.platillos.length < TOPES.platillosPorCategoria
        ? { ...c, platillos: [...c.platillos, platilloVacio()] }
        : c,
    );
  },
  editarPlatillo(b: Borrador, clave: string, cambios: Partial<PlatilloBorrador>): Borrador {
    return mapearPlatillos(b, (c) =>
      c.platillos.some((p) => p.clave === clave)
        ? { ...c, platillos: c.platillos.map((p) => (p.clave === clave ? { ...p, ...cambios } : p)) }
        : c,
    );
  },
  quitarPlatillo(b: Borrador, clave: string): Borrador {
    return mapearPlatillos(b, (c) =>
      c.platillos.some((p) => p.clave === clave) ? { ...c, platillos: c.platillos.filter((p) => p.clave !== clave) } : c,
    );
  },
  moverPlatillo(b: Borrador, clave: string, delta: -1 | 1): Borrador {
    return mapearPlatillos(b, (c) => {
      const i = c.platillos.findIndex((p) => p.clave === clave);
      return i < 0 ? c : { ...c, platillos: mover(c.platillos, i, i + delta) };
    });
  },
  editarVariante(b: Borrador, clavePlatillo: string, claveVariante: string, cambios: Partial<VarianteBorrador>): Borrador {
    return operaciones.editarPlatillo(b, clavePlatillo, {
      variantes: (buscar(b, clavePlatillo)?.variantes ?? []).map((v) => (v.clave === claveVariante ? { ...v, ...cambios } : v)),
    });
  },
};

function buscar(b: Borrador, clave: string): PlatilloBorrador | undefined {
  for (const c of b.categorias) {
    const p = c.platillos.find((x) => x.clave === clave);
    if (p) return p;
  }
  return undefined;
}
