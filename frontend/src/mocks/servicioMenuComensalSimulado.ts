import { ErrorApi } from '../compartido/http';
import type { CategoriaPublica, MenuPublico, PlatilloPublico, ServicioMenu } from '../comensal/menu/servicioMenu';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

interface Semilla {
  nombre: string;
  descripcion: string | null;
  precio: number;
  alergenos?: string[];
  etiquetas?: string[];
  foto?: boolean;
  ilustracion?: string;
  destacado?: boolean;
  disponible?: boolean;
  picante?: number;
}

/** «La Ceiba» como la deja `scripts/seed.py`: 4 categorías, 22 platillos, uno agotado, tres destacados. */
const CATEGORIAS: { nombre: string; platillos: Semilla[] }[] = [
  {
    nombre: 'Para empezar',
    platillos: [
      { nombre: 'Guacamole de la casa', descripcion: 'Aguacate, chile serrano, totopos de maíz azul', precio: 145, etiquetas: ['vegetariano'], foto: true, destacado: true },
      { nombre: 'Tostadas de atún', descripcion: 'Atún aleta amarilla, chipotle, aguacate, ajonjolí (3 pzas)', precio: 185, alergenos: ['pescado', 'ajonjoli'], foto: true },
      { nombre: 'Esquites con tuétano', descripcion: 'Elote criollo, epazote, mayonesa de chile pasilla', precio: 120, alergenos: ['huevo'], foto: true },
      { nombre: 'Sopa de tortilla', descripcion: 'Caldo de jitomate asado, queso panela, crema, chicharrón', precio: 110, alergenos: ['lacteos'], foto: true },
      { nombre: 'Ensalada de nopales', descripcion: 'Nopal asado, jitomate, cebolla morada, queso fresco', precio: 105, alergenos: ['lacteos'], etiquetas: ['vegetariano'], ilustracion: 'ensaladas' },
      { nombre: 'Chiles rellenos de queso', descripcion: 'Jalapeño relleno de queso Oaxaca, capeado', precio: 130, alergenos: ['lacteos', 'gluten', 'huevo'], etiquetas: ['picante'], foto: true, picante: 2 },
    ],
  },
  {
    nombre: 'Platos fuertes',
    platillos: [
      { nombre: 'Cochinita pibil', descripcion: 'Cerdo marinado en achiote, cebolla encurtida, tortillas hechas a mano', precio: 285, foto: true, destacado: true },
      { nombre: 'Filete de res en salsa de chiles', descripcion: 'Filete de 250 g, puré de papa, chile guajillo', precio: 395, alergenos: ['lacteos'], foto: true },
      { nombre: 'Pescado a la veracruzana', descripcion: 'Pescado del día, jitomate, aceitunas, alcaparras', precio: 340, alergenos: ['pescado'], foto: true, disponible: false },
      { nombre: 'Enchiladas verdes', descripcion: 'Pollo deshebrado, salsa verde, crema, queso fresco', precio: 210, alergenos: ['lacteos', 'gluten'], foto: true },
      { nombre: 'Tacos de pastor', descripcion: 'Cerdo adobado con piña, cebolla y cilantro (4 pzas)', precio: 175, foto: true },
      { nombre: 'Mole poblano', descripcion: 'Pollo en mole con ajonjolí y arroz rojo', precio: 255, alergenos: ['ajonjoli', 'frutos_secos', 'cacahuate'], foto: true, picante: 1 },
      { nombre: 'Hongos al ajillo', descripcion: null, precio: 190, etiquetas: ['vegano', 'sin_gluten'], ilustracion: 'vegetariano' },
    ],
  },
  {
    nombre: 'Postres',
    platillos: [
      { nombre: 'Flan de cajeta', descripcion: 'Flan casero con cajeta de Celaya', precio: 95, alergenos: ['lacteos', 'huevo'], foto: true, destacado: true },
      { nombre: 'Churros con chocolate', descripcion: 'Churros recién hechos, chocolate espeso de metate', precio: 105, alergenos: ['gluten', 'huevo', 'lacteos'], ilustracion: 'postres' },
      { nombre: 'Pastel de elote', descripcion: 'Con helado de vainilla', precio: 98, alergenos: ['gluten', 'huevo', 'lacteos'], foto: true },
      { nombre: 'Nieve de limón', descripcion: 'Sorbete de limón con hierbabuena', precio: 80, etiquetas: ['vegano', 'sin_gluten'], ilustracion: 'postres' },
    ],
  },
  {
    nombre: 'Bebidas',
    platillos: [
      { nombre: 'Agua de jamaica', descripcion: 'Jarra de 1 litro', precio: 70, etiquetas: ['vegano', 'sin_gluten'], ilustracion: 'bebidas' },
      { nombre: 'Café de olla', descripcion: 'Con canela y piloncillo', precio: 55, etiquetas: ['vegano', 'sin_gluten'], ilustracion: 'cafe' },
      { nombre: 'Piña colada sin alcohol', descripcion: 'Piña, coco y hielo frapé', precio: 85, etiquetas: ['vegano'], ilustracion: 'bebidas' },
      { nombre: 'Margarita de tamarindo', descripcion: 'Tequila reposado, tamarindo, sal de gusano', precio: 140, ilustracion: 'cocteles' },
      { nombre: 'Cerveza artesanal', descripcion: 'Botella de 355 ml', precio: 75, alergenos: ['gluten'], ilustracion: 'bebidas' },
    ],
  },
];

function platillo(s: Semilla, n: number, categoriaId: string, orden: number): PlatilloPublico {
  return {
    id: id(1000 + n),
    categoria_id: categoriaId,
    nombre: s.nombre,
    descripcion: s.descripcion,
    precio: s.precio,
    disponible: s.disponible ?? true,
    imagen_tipo: s.foto ? 'foto' : 'ilustracion_categoria',
    foto_thumb_url: s.foto ? `https://fotos.carta.example/la-ceiba/${n}-thumb.jpg` : null,
    foto_detalle_url: s.foto ? `https://fotos.carta.example/la-ceiba/${n}.jpg` : null,
    ilustracion_clave: s.foto ? null : (s.ilustracion ?? 'general'),
    alergenos: s.alergenos ?? [],
    etiquetas: s.etiquetas ?? [],
    calorias: null,
    nivel_picante: s.picante ?? 0,
    destacado: s.destacado ?? false,
    orden,
  };
}

/** El menú de ejemplo, con la forma de `MenuPublico` (validada contra `mocks/openapi.json` en las pruebas). */
export function crearMenuSemilla(): MenuPublico {
  let n = 0;
  const categorias: CategoriaPublica[] = CATEGORIAS.map((c, i) => {
    const categoriaId = id(100 + i);
    return {
      id: categoriaId,
      nombre: c.nombre,
      orden: i,
      platillos: c.platillos.map((s, j) => platillo(s, ++n, categoriaId, j)),
    };
  });
  const destacados = categorias.flatMap((c) => c.platillos.filter((p) => p.destacado).map((p) => p.id)).slice(0, 3);
  return {
    restaurante: { nombre: 'La Ceiba', slug: 'la-ceiba', logo_url: null, tema: 'vino' },
    categorias,
    destacados,
    actualizado_en: '2026-11-11T18:00:00Z',
  };
}

/** Un menú de `total` platillos repartidos en categorías de 20: para probar la lista larga. */
export function crearMenuGrande(total: number): MenuPublico {
  const categorias: CategoriaPublica[] = [];
  for (let i = 0; i < total; i += 20) {
    const categoriaId = id(100 + i / 20);
    const platillos: PlatilloPublico[] = [];
    for (let j = i; j < Math.min(i + 20, total); j += 1) {
      platillos.push(
        platillo(
          {
            nombre: `Platillo ${j + 1}`,
            descripcion: `Descripción del platillo número ${j + 1} con guarnición`,
            precio: 50 + j,
            alergenos: j % 7 === 0 ? ['lacteos'] : [],
            foto: j % 2 === 0,
            ilustracion: 'general',
          },
          j + 1,
          categoriaId,
          j - i,
        ),
      );
    }
    categorias.push({ id: categoriaId, nombre: `Categoría ${i / 20 + 1}`, orden: i / 20, platillos });
  }
  return { restaurante: { nombre: 'Restaurante grande', slug: 'grande', logo_url: null, tema: 'vino' }, categorias, destacados: [], actualizado_en: '2026-11-11T18:00:00Z' };
}

export interface OpcionesMenuSimulado {
  menu?: MenuPublico;
  /** Falla siempre. */
  error?: ErrorApi;
}

/** Servicio del menú en memoria. `retener()` deja la respuesta pendiente hasta llamar a lo que devuelve. */
export function crearServicioMenuSimulado(opciones: OpcionesMenuSimulado = {}) {
  const menu = opciones.menu ?? crearMenuSemilla();
  const llamadas: { slug: string }[] = [];
  let espera: Promise<void> | null = null;
  const servicio: ServicioMenu = {
    async menu(slug, signal) {
      llamadas.push({ slug });
      if (espera) await espera;
      if (signal?.aborted) throw new DOMException('cancelado', 'AbortError');
      if (opciones.error) throw opciones.error;
      return structuredClone(menu);
    },
  };
  return {
    servicio,
    llamadas,
    menu,
    retener(): () => void {
      let soltar!: () => void;
      espera = new Promise<void>((r) => (soltar = r));
      return () => {
        soltar();
        espera = null;
      };
    },
  };
}
