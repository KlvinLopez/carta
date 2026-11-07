import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Boton, Chip } from '../../compartido/componentes';
import { clasesBoton } from '../../compartido/componentes/Boton';
import { estilosPantalla as e } from '../../compartido/pantalla/Pantalla';
import { useSesion } from '../acceso/Sesion';
import { EstadoVacio } from '../armazon/EstadoVacio';
import { useRestauranteActivo, type Restaurante } from '../armazon/RestauranteActivo';
import { CLAVE_SIN_CATEGORIA, GrupoCategoria } from './GrupoCategoria';
import { HojaBaja } from './HojaBaja';
import { EditorPlatillo } from './EditorPlatillo';
import c from './Menu.module.css';
import { crearServicioMenu, type ServicioMenu } from './servicio';
import { claveBusqueda, type Categoria, type Platillo } from './tipos';
import { useMenu } from './useMenu';

/** Con más platillos que esto, la pantalla arranca con las categorías cerradas salvo la primera. */
const UMBRAL_COLAPSAR = 60;

type Vista = 'activos' | 'bajas';

interface Grupo {
  categoriaId: string | null;
  nombre: string;
  filas: Platillo[];
}

function agrupar(categorias: Categoria[], platillos: Platillo[]): Grupo[] {
  const conocidas = new Set(categorias.map((x) => x.id));
  const grupos: Grupo[] = categorias.map((x) => ({
    categoriaId: x.id,
    nombre: x.activa ? x.nombre : `${x.nombre} (inactiva)`,
    filas: platillos.filter((p) => p.categoria_id === x.id),
  }));
  grupos.push({
    categoriaId: null,
    nombre: 'Sin categoría',
    filas: platillos.filter((p) => !p.categoria_id || !conocidas.has(p.categoria_id)),
  });
  return grupos.filter((g) => g.filas.length > 0);
}

export function PantallaMenuConServicio({ servicio, restaurante }: { servicio: ServicioMenu; restaurante: Restaurante }) {
  const menu = useMenu(servicio, restaurante.id);
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useState<Vista>('activos');
  const [editando, setEditando] = useState<{ id: string | null; categoria: string | null } | null>(null);
  const [aBaja, setABaja] = useState<string | null>(null);
  const [cerradas, setCerradas] = useState<ReadonlySet<string> | null>(null);

  const { platillos, categorias } = menu;
  const activos = useMemo(() => platillos.filter((p) => p.activo), [platillos]);
  const bajas = useMemo(() => platillos.filter((p) => !p.activo), [platillos]);
  const q = claveBusqueda(busqueda);

  const grupos = useMemo(() => {
    const base = vista === 'activos' ? activos : bajas;
    const filtrados = q ? base.filter((p) => claveBusqueda(p.nombre).includes(q)) : base;
    return agrupar(categorias, filtrados);
  }, [activos, bajas, categorias, q, vista]);

  // Carga grande: sólo la primera categoría arranca abierta (el usuario abre las demás o busca).
  const listo = menu.estado.tipo === 'listo';
  useEffect(() => {
    if (!listo || cerradas !== null) return;
    if (activos.length <= UMBRAL_COLAPSAR) {
      setCerradas(new Set());
      return;
    }
    const ordenadas = agrupar(categorias, activos);
    setCerradas(new Set(ordenadas.slice(1).map((g) => g.categoriaId ?? CLAVE_SIN_CATEGORIA)));
  }, [listo, cerradas, activos, categorias]);

  const alternar = useCallback((clave: string) => {
    setCerradas((previas) => {
      const siguientes = new Set(previas ?? []);
      if (siguientes.has(clave)) siguientes.delete(clave);
      else siguientes.add(clave);
      return siguientes;
    });
  }, []);

  const { poner, reordenar } = menu;
  const acciones = useMemo(
    () => ({
      alEditar: (id: string) => setEditando({ id, categoria: null }),
      alDisponible: (id: string, valor: boolean) => void poner(id, 'disponible', valor),
      // Dar de baja pide confirmación; reactivar no (no destruye nada).
      alActivo: (id: string, valor: boolean) => (valor ? void poner(id, 'activo', true) : setABaja(id)),
    }),
    [poner],
  );
  const reordenarGrupo = useMemo(() => {
    const porCategoria = new Map<string, (ids: string[]) => void>();
    return (clave: string) => {
      let fn = porCategoria.get(clave);
      if (!fn) {
        fn = (ids: string[]) => void reordenar(ids);
        porCategoria.set(clave, fn);
      }
      return fn;
    };
  }, [reordenar]);

  const enEdicion = editando?.id ? (platillos.find((p) => p.id === editando.id) ?? null) : null;
  const platilloABaja = aBaja ? (platillos.find((p) => p.id === aBaja) ?? null) : null;

  const encabezado = (
    <header className={e.encabezado}>
      <p className={e.sobretitulo}>{restaurante.nombre}</p>
      <h1 className={e.titulo}>Menú</h1>
    </header>
  );

  if (menu.estado.tipo === 'cargando') {
    return (
      <>
        {encabezado}
        <div className={e.centrado} role="status" aria-live="polite">
          <div className={e.espera} aria-hidden="true" />
          <p className={e.texto}>Cargando tu carta…</p>
        </div>
      </>
    );
  }
  if (menu.estado.tipo === 'error') {
    return (
      <>
        {encabezado}
        <EstadoVacio
          glifo="!"
          titulo="No pudimos cargar tu carta"
          accion={<Boton onClick={menu.reintentar}>Reintentar</Boton>}
        >
          {menu.estado.mensaje}
        </EstadoVacio>
      </>
    );
  }

  const sinNada = platillos.length === 0;
  const mostrarAyuda = vista === 'activos' && !q && grupos.some((g) => g.filas.length > 1);

  return (
    <>
      {encabezado}
      {sinNada ? (
        <EstadoVacio
          glifo="M"
          titulo="Tu carta aparecerá aquí"
          accion={
            <div className={c.accionesVacio}>
              <Link to="/admin/alta" className={clasesBoton({ ancho: true })}>
                Importar mi carta en PDF
              </Link>
              <Boton variante="secundario" ancho onClick={() => setEditando({ id: null, categoria: null })}>
                Agregar un platillo
              </Boton>
            </div>
          }
        >
          Sube tu carta en PDF y la convertimos en un menú visual, o agrega tus platillos uno por uno. Nada entra sin que lo confirmes.
        </EstadoVacio>
      ) : (
        <div className={c.pantalla}>
          <div className={c.barra}>
            <div className={c.campoBusqueda}>
              <label htmlFor="buscar-platillo" className={c.srSolo}>
                Buscar platillo
              </label>
              <input
                id="buscar-platillo"
                type="search"
                className={c.busqueda}
                placeholder="Buscar un platillo por nombre"
                value={busqueda}
                onChange={(ev) => setBusqueda(ev.target.value)}
                autoComplete="off"
              />
            </div>
            <Boton compacto onClick={() => setEditando({ id: null, categoria: null })}>
              Agregar platillo
            </Boton>
          </div>

          <div className={c.vistas} role="group" aria-label="Qué platillos ver">
            <Chip activo={vista === 'activos'} onClick={() => setVista('activos')}>
              Activos ({activos.length})
            </Chip>
            <Chip activo={vista === 'bajas'} onClick={() => setVista('bajas')}>
              Dados de baja ({bajas.length})
            </Chip>
          </div>

          {menu.aviso && (
            <div className={c.aviso} role="alert">
              <span>{menu.aviso}</span>
              <button type="button" className={c.cerrarAviso} onClick={menu.descartarAviso} aria-label="Cerrar aviso">
                <span aria-hidden="true">×</span>
              </button>
            </div>
          )}

          <p id="ayuda-reordenar" className={mostrarAyuda ? c.ayudaLista : c.srSolo}>
            Arrastra el asa de un platillo para cambiar su orden dentro de la categoría, o enfócala y usa las flechas ↑ ↓.
          </p>

          {grupos.length === 0 ? (
            <p className={c.sinResultados} role="status">
              {q ? `No encontramos «${busqueda.trim()}» en tu carta.` : 'No hay platillos dados de baja.'}
            </p>
          ) : (
            grupos.map((g) => {
              const clave = g.categoriaId ?? CLAVE_SIN_CATEGORIA;
              return (
                <GrupoCategoria
                  key={clave}
                  categoriaId={g.categoriaId}
                  nombre={g.nombre}
                  filas={g.filas}
                  abierto={!!q || !(cerradas?.has(clave) ?? false)}
                  pendientes={menu.pendientes}
                  reordenable={vista === 'activos' && !q}
                  alAlternar={alternar}
                  alReordenar={reordenarGrupo(clave)}
                  acciones={acciones}
                />
              );
            })
          )}
        </div>
      )}

      {editando && (
        <EditorPlatillo
          key={editando.id ?? 'nuevo'}
          platillo={enEdicion}
          categorias={categorias}
          categoriaInicial={editando.categoria}
          alGuardar={async (datos) => {
            await menu.guardar(editando.id, datos);
          }}
          alSubirFoto={async (archivo, nombre) => {
            if (editando.id) await menu.subirFoto(editando.id, archivo, nombre);
          }}
          alQuitarFoto={async () => {
            if (editando.id) await menu.quitarFoto(editando.id);
          }}
          alCerrar={() => setEditando(null)}
        />
      )}
      {platilloABaja && (
        <HojaBaja
          nombre={platilloABaja.nombre}
          alCerrar={() => setABaja(null)}
          alConfirmar={() => {
            void menu.poner(platilloABaja.id, 'activo', false);
            setABaja(null);
          }}
        />
      )}
    </>
  );
}

/** Pantalla Menú del panel (`/admin/menu`): el servicio real sobre `http.ts` y el restaurante activo. */
export default function PantallaMenu() {
  const { api } = useSesion();
  const { activo } = useRestauranteActivo();
  const servicio = useMemo(() => crearServicioMenu(api), [api]);
  if (!activo) return null;
  return <PantallaMenuConServicio key={activo.id} servicio={servicio} restaurante={activo} />;
}
