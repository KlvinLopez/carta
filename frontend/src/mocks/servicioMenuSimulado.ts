import { ErrorApi } from '../compartido/http';
import type { ServicioMenu } from '../admin/menu/servicio';
import type { Categoria, Platillo } from '../admin/menu/tipos';

const AHORA = '2026-11-07T12:00:00Z';

export function uuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

export const categoriasSemilla: Categoria[] = [
  { id: uuid(1), nombre: 'Tacos', orden: 1, activa: true },
  { id: uuid(2), nombre: 'Bebidas', orden: 2, activa: true },
  { id: uuid(3), nombre: 'Postres', orden: 3, activa: true },
];

export function platilloDe(n: number, parche: Partial<Platillo> = {}): Platillo {
  return {
    id: uuid(100 + n),
    nombre: `Platillo ${n}`,
    descripcion: null,
    precio: 20 + n,
    categoria_id: uuid(1),
    alergenos: [],
    etiquetas: [],
    calorias: null,
    nivel_picante: 0,
    destacado: false,
    disponible: true,
    activo: true,
    orden: n,
    imagen_tipo: 'ilustracion_categoria',
    ilustracion_clave: 'tacos',
    foto_thumb_url: null,
    foto_detalle_url: null,
    no_disponible_desde: null,
    creado_en: AHORA,
    actualizado_en: AHORA,
    ...parche,
  };
}

export const platillosSemilla: Platillo[] = [
  platilloDe(1, { nombre: 'Pastor', descripcion: 'Con piña, cebolla y cilantro', precio: 22, alergenos: [], etiquetas: ['picante'] }),
  platilloDe(2, { nombre: 'Suadero', precio: 25 }),
  platilloDe(3, { nombre: 'Cecina enchilada', precio: 38.5, alergenos: ['gluten'] }),
  platilloDe(4, { nombre: 'Horchata', categoria_id: uuid(2), ilustracion_clave: 'bebidas', precio: 35, alergenos: ['lacteos'], orden: 1 }),
  platilloDe(5, { nombre: 'Agua de jamaica', categoria_id: uuid(2), ilustracion_clave: 'bebidas', precio: 30, disponible: false, orden: 2 }),
  platilloDe(6, { nombre: 'Flan', categoria_id: uuid(3), ilustracion_clave: 'postres', precio: 55, orden: 1, etiquetas: ['vegetariano'] }),
  platilloDe(7, { nombre: 'Tripa', precio: 28, activo: false, disponible: false, orden: 9 }),
];

/** `n` platillos repartidos en las tres categorías (para probar la paginación y el rendimiento). */
export function muchosPlatillos(n: number): Platillo[] {
  return Array.from({ length: n }, (_, i) =>
    platilloDe(i + 1, {
      nombre: `Platillo ${String(i + 1).padStart(3, '0')}`,
      categoria_id: categoriasSemilla[i % 3]!.id,
      orden: Math.floor(i / 3) + 1,
    }),
  );
}

type Metodo = keyof ServicioMenu;

export interface OpcionesMenuSimulado {
  categorias?: Categoria[];
  platillos?: Platillo[];
  /** Falla siempre ese método (o las próximas N veces con `fallosPendientes`). */
  errores?: Partial<Record<Metodo, ErrorApi>>;
}

/**
 * Servicio en memoria con la forma exacta del contrato (`app/schemas/menu.py`). Aplica lo que hace
 * el servidor: el orden por categoría, la baja lógica, la foto que cambia `imagen_tipo` y los 409/422.
 * `foto` = `T-1.4` todavía no está integrada: la respuesta replica `PlatilloRespuesta`.
 */
export function crearServicioMenuSimulado(opciones: OpcionesMenuSimulado = {}) {
  const categorias = [...(opciones.categorias ?? categoriasSemilla)];
  const platillos: Platillo[] = (opciones.platillos ?? platillosSemilla).map((p) => ({ ...p }));
  const errores = { ...(opciones.errores ?? {}) };
  const fallosPendientes: Partial<Record<Metodo, ErrorApi[]>> = {};
  const llamadas: { metodo: Metodo; argumentos: unknown[] }[] = [];
  let siguiente = 5000;

  function registrar(metodo: Metodo, ...argumentos: unknown[]) {
    llamadas.push({ metodo, argumentos });
    const fallo = fallosPendientes[metodo]?.shift() ?? errores[metodo];
    if (fallo) throw fallo;
  }
  const buscar = (id: string) => {
    const p = platillos.find((x) => x.id === id);
    if (!p) throw new ErrorApi(404, 'NO_ENCONTRADO', 'No encontramos ese platillo.');
    return p;
  };
  const copia = (p: Platillo): Platillo => ({ ...p, alergenos: [...p.alergenos], etiquetas: [...p.etiquetas] });
  const repetido = (nombre: string, salvoId?: string) =>
    platillos.some((p) => p.activo && p.id !== salvoId && p.nombre.trim().toLowerCase() === nombre.trim().toLowerCase());

  const servicio: ServicioMenu = {
    async listarCategorias(rid) {
      registrar('listarCategorias', rid);
      return categorias.map((c) => ({ ...c }));
    },
    async listarPlatillos(rid, { activo, skip, limit, categoriaId }) {
      registrar('listarPlatillos', rid, { activo, skip, limit, ...(categoriaId ? { categoriaId } : {}) });
      const orden = new Map(categorias.map((c, i) => [c.id, i]));
      return platillos
        .filter((p) => p.activo === activo && (!categoriaId || p.categoria_id === categoriaId))
        .sort(
          (a, b) =>
            (orden.get(a.categoria_id ?? '') ?? 999) - (orden.get(b.categoria_id ?? '') ?? 999) || a.orden - b.orden,
        )
        .slice(skip, skip + limit)
        .map(copia);
    },
    async crearPlatillo(rid, datos) {
      registrar('crearPlatillo', rid, datos);
      if (repetido(datos.nombre)) {
        throw new ErrorApi(409, 'CONFLICTO', 'Ya tienes un platillo con ese nombre.');
      }
      siguiente += 1;
      const enCategoria = platillos.filter((p) => p.categoria_id === (datos.categoria_id ?? null));
      const nuevo = platilloDe(siguiente, {
        nombre: datos.nombre,
        descripcion: datos.descripcion ?? null,
        precio: Number(datos.precio),
        categoria_id: datos.categoria_id ?? null,
        alergenos: datos.alergenos ?? [],
        etiquetas: datos.etiquetas ?? [],
        orden: enCategoria.length + 1,
      });
      platillos.push(nuevo);
      return copia(nuevo);
    },
    async cambiarPlatillo(id, cambios) {
      registrar('cambiarPlatillo', id, cambios);
      const p = buscar(id);
      if (cambios.nombre && repetido(cambios.nombre, id)) {
        throw new ErrorApi(409, 'CONFLICTO', 'Ya tienes un platillo con ese nombre.');
      }
      for (const [clave, valor] of Object.entries(cambios)) {
        if (valor === undefined) continue;
        (p as Record<string, unknown>)[clave] = clave === 'precio' ? Number(valor) : valor;
      }
      if (cambios.disponible !== undefined) p.no_disponible_desde = cambios.disponible ? null : AHORA;
      return copia(p);
    },
    async darDeBaja(id) {
      registrar('darDeBaja', id);
      buscar(id).activo = false;
    },
    async reordenarPlatillos(rid, ids) {
      registrar('reordenarPlatillos', rid, ids);
      const elegidos = ids.map(buscar);
      if (new Set(elegidos.map((p) => p.categoria_id)).size > 1) {
        throw new ErrorApi(422, 'PAYLOAD_INVALIDO', 'Sólo se reordenan platillos de una misma categoría.');
      }
      elegidos.forEach((p, i) => {
        p.orden = i + 1;
      });
    },
    async subirFoto(id, archivo, nombre) {
      registrar('subirFoto', id, archivo, nombre);
      const p = buscar(id);
      p.imagen_tipo = 'foto';
      p.foto_thumb_url = `/fotos/${id}-thumb.jpg`;
      p.foto_detalle_url = `/fotos/${id}.jpg`;
      return copia(p);
    },
    async quitarFoto(id) {
      registrar('quitarFoto', id);
      const p = buscar(id);
      p.imagen_tipo = 'ilustracion_categoria';
      p.foto_thumb_url = null;
      p.foto_detalle_url = null;
      return copia(p);
    },
  };

  return {
    servicio,
    categorias,
    platillos,
    /** Errores permanentes por método: borra la clave para que el método vuelva a funcionar. */
    errores,
    llamadas,
    /** Hace fallar las próximas llamadas de ese método, una por error. */
    fallar(metodo: Metodo, ...lista: ErrorApi[]) {
      fallosPendientes[metodo] = [...(fallosPendientes[metodo] ?? []), ...lista];
    },
    llamadasDe: (metodo: Metodo) => llamadas.filter((l) => l.metodo === metodo),
  };
}
