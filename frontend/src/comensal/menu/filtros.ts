import type { PlatilloPublico } from './servicioMenu';

/** Lo que el comensal descarta o exige. Vive sólo en su teléfono: nunca viaja al servidor. */
export interface Filtros {
  /** Se ocultan los platillos que contengan alguno. */
  alergenos: string[];
  /** Se muestran sólo los que tengan todas. */
  etiquetas: string[];
}

export const FILTROS_VACIOS: Filtros = { alergenos: [], etiquetas: [] };

/** Mínimo de AC-05.1 (nueces, lácteos, gluten, huevo, mariscos) más los del editor del operador. */
export const ALERGENOS_COMUNES = ['gluten', 'lacteos', 'huevo', 'frutos_secos', 'cacahuate', 'mariscos', 'pescado', 'soya'];
export const ETIQUETAS_COMUNES = ['vegetariano', 'vegano', 'picante', 'sin_gluten'];

const NOMBRES: Record<string, string> = {
  gluten: 'Gluten',
  lacteos: 'Lácteos',
  huevo: 'Huevo',
  frutos_secos: 'Nueces y frutos secos',
  nueces: 'Nueces',
  cacahuate: 'Cacahuate',
  mariscos: 'Mariscos',
  pescado: 'Pescado',
  soya: 'Soya',
  ajonjoli: 'Ajonjolí',
  vegetariano: 'Vegetariano',
  vegano: 'Vegano',
  picante: 'Picante',
  sin_gluten: 'Sin gluten',
};

/** El nombre de una clave para la persona; una clave que no conocemos se lee igual, sin guiones bajos. */
export function nombreDeClave(clave: string): string {
  if (Object.hasOwn(NOMBRES, clave)) return NOMBRES[clave]!;
  const texto = clave.replace(/_/g, ' ').trim();
  return texto ? texto.charAt(0).toLocaleUpperCase('es') + texto.slice(1) : clave;
}

export function hayFiltros(f: Filtros): boolean {
  return f.alergenos.length + f.etiquetas.length > 0;
}

export function totalFiltros(f: Filtros): number {
  return f.alergenos.length + f.etiquetas.length;
}

export function mismosFiltros(a: Filtros, b: Filtros): boolean {
  const igual = (x: string[], y: string[]) => x.length === y.length && x.every((c) => y.includes(c));
  return igual(a.alergenos, b.alergenos) && igual(a.etiquetas, b.etiquetas);
}

/** AC-05.2: un platillo con un alérgeno descartado se oculta; uno sin las etiquetas pedidas, también. */
export function cumpleFiltros(p: Pick<PlatilloPublico, 'alergenos' | 'etiquetas'>, f: Filtros): boolean {
  return !f.alergenos.some((a) => p.alergenos.includes(a)) && f.etiquetas.every((e) => p.etiquetas.includes(e));
}

// ── Persistencia: `localStorage` del teléfono, nada más ───────────────────────────────────────────────

export const CLAVE_FILTROS = 'carta:filtros:v1';
const CLAVE_VALIDA = /^[a-z0-9_]{1,40}$/;
const MAXIMO_POR_LISTA = 30;

export interface AlmacenFiltros {
  leer(): Filtros;
  guardar(filtros: Filtros): void;
}

function listaValida(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const claves = v.filter((c): c is string => typeof c === 'string' && CLAVE_VALIDA.test(c));
  return [...new Set(claves)].slice(0, MAXIMO_POR_LISTA);
}

/** Lo guardado se revisa siempre: el almacenamiento lo puede tocar cualquiera (o estar roto o bloqueado). */
export function leerFiltros(texto: string | null): Filtros {
  if (!texto) return FILTROS_VACIOS;
  try {
    const v: unknown = JSON.parse(texto);
    if (typeof v !== 'object' || v === null) return FILTROS_VACIOS;
    const o = v as Record<string, unknown>;
    return { alergenos: listaValida(o.alergenos), etiquetas: listaValida(o.etiquetas) };
  } catch {
    return FILTROS_VACIOS;
  }
}

export const almacenFiltrosLocal: AlmacenFiltros = {
  leer() {
    try {
      return leerFiltros(window.localStorage.getItem(CLAVE_FILTROS));
    } catch {
      return FILTROS_VACIOS;
    }
  },
  guardar(filtros) {
    try {
      if (hayFiltros(filtros)) window.localStorage.setItem(CLAVE_FILTROS, JSON.stringify(filtros));
      else window.localStorage.removeItem(CLAVE_FILTROS);
    } catch {
      // Modo privado o almacenamiento lleno: los filtros valen esta visita y ya.
    }
  },
};
