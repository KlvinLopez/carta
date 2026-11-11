import { useEffect, useId, useLayoutEffect, useMemo, useState } from 'react';

import { Boton, Ilustracion } from '../../compartido/componentes';
import { Pantalla, estilosPantalla as e } from '../../compartido/pantalla/Pantalla';
import type { Analitica } from '../analitica/cola';
import { Logo } from '../entrada/Bienvenida';
import { AvisoConexion, type AvisoSondeo } from '../entrada/AvisoConexion';
import { PantallaError } from '../entrada/PantallaError';
import { useFocoEnTitulo } from '../entrada/useFocoEnTitulo';
import { AVISO_ALERGENOS } from './avisos';
import { coincide, pajarDe } from './busqueda';
import { ALERGENOS_COMUNES, ETIQUETAS_COMUNES, cumpleFiltros, hayFiltros, totalFiltros, type AlmacenFiltros, type Filtros } from './filtros';
import { HojaFiltros } from './HojaFiltros';
import estilos from './Menu.module.css';
import { restaurarPosicion, tarjetaDePosicion } from './posicion';
import { servicioMenuReal, type MenuPublico, type PlatilloPublico, type ServicioMenu } from './servicioMenu';
import { TarjetaPlatillo } from './TarjetaPlatillo';
import { useControladorMenu, type ControladorMenu } from './useControladorMenu';

export { ESPERA_BUSQUEDA_MS } from './useControladorMenu';

export interface PropsMenuVista {
  controlador: ControladorMenu;
  /** Número de la mesa en la que está el comensal. */
  mesa: number;
  /** El último sondeo de la mesa falló (`useEntrada`): se avisa sin tapar la lista. */
  aviso?: AvisoSondeo;
  onVolver: () => void;
  /** Abre un platillo (T-2.6). Sin ella las tarjetas son de sólo lectura. */
  onAbrir?: (id: string) => void;
}

export interface PropsMenu extends Omit<PropsMenuVista, 'controlador'> {
  /** `sesion.restaurante.slug`. */
  slug: string;
  /** Pruebas y capturas inyectan el servicio simulado. */
  servicio?: ServicioMenu;
  analitica?: Analitica;
  almacen?: AlmacenFiltros;
}

/** El menú con su propio estado: para pruebas y capturas. La app usa `MenuVista` con el controlador de `SesionMesa`. */
export function Menu({ slug, servicio = servicioMenuReal, analitica, almacen, ...resto }: PropsMenu) {
  const controlador = useControladorMenu({ slug, servicio, analitica, almacen });
  return <MenuVista controlador={controlador} {...resto} />;
}

/** `/m/:codigo/menu`: el menú del restaurante, con búsqueda y filtros locales. */
export function MenuVista({ controlador, ...resto }: PropsMenuVista) {
  const { estado, reintentar } = controlador;
  if (estado.fase === 'cargando') return <EsqueletoMenu />;
  if (estado.fase === 'error') {
    return <PantallaError clase={estado.clase} reintentarEn={estado.reintentarEn} onReintentar={reintentar} />;
  }
  return <MenuListo menu={estado.menu} controlador={controlador} {...resto} />;
}

function EsqueletoMenu() {
  return (
    <Pantalla>
      <div className={estilos.esqueleto} role="status" aria-live="polite">
        <span className={estilos.soloLectores}>Preparando el menú…</span>
        <div className={`${estilos.bloque} ${estilos.bloqueTitulo}`} aria-hidden="true" />
        <div className={`${estilos.bloque} ${estilos.bloqueBuscador}`} aria-hidden="true" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${estilos.bloque} ${estilos.bloqueFila}`} aria-hidden="true" />
        ))}
      </div>
    </Pantalla>
  );
}

interface Indexado {
  platillo: PlatilloPublico;
  pajar: string;
}

function unir(comunes: string[], presentes: Iterable<string>, elegidos: string[]): string[] {
  return [...new Set([...comunes, ...presentes, ...elegidos])];
}

function MenuListo({ menu, controlador, mesa, aviso = null, onVolver, onAbrir }: Omit<PropsMenuVista, 'controlador'> & { menu: MenuPublico; controlador: ControladorMenu }) {
  const titulo = useFocoEnTitulo();
  const idTop = useId();
  const { escrito, setEscrito, consulta, filtros, aplicarFiltros, limpiarTodo } = controlador;
  const [hojaAbierta, setHojaAbierta] = useState(false);

  // Al volver del detalle de un platillo: misma posición de desplazamiento y el foco en la tarjeta que se
  // abrió. Se lee sin consumir (el doble efecto de StrictMode repite lo mismo); «Mi mesa» la olvida. El
  // efecto de foco va después del de `useFocoEnTitulo`, así que gana.
  useLayoutEffect(() => {
    const pos = controlador.posicion.current;
    if (pos) restaurarPosicion(pos);
  }, [controlador.posicion]);
  useEffect(() => {
    const pos = controlador.posicion.current;
    if (pos) tarjetaDePosicion(pos)?.focus({ preventScroll: true });
  }, [controlador.posicion]);

  // El texto de cada platillo se normaliza una sola vez por menú cargado.
  const indice = useMemo(() => {
    const porId = new Map<string, Indexado>();
    const alergenos = new Set<string>();
    const etiquetas = new Set<string>();
    let total = 0;
    for (const c of menu.categorias) {
      for (const p of c.platillos) {
        porId.set(p.id, { platillo: p, pajar: pajarDe(p.nombre, p.descripcion) });
        p.alergenos.forEach((a) => alergenos.add(a));
        p.etiquetas.forEach((t) => etiquetas.add(t));
        total += 1;
      }
    }
    return { porId, alergenos, etiquetas, total };
  }, [menu]);

  /** Los platillos que pasan los filtros y la búsqueda dados. */
  const visiblesCon = useMemo(
    () => (f: Filtros, q: string | null) => {
      const ids = new Set<string>();
      for (const [id, { platillo, pajar }] of indice.porId) {
        if (cumpleFiltros(platillo, f) && (q === null || coincide(pajar, q))) ids.add(id);
      }
      return ids;
    },
    [indice],
  );
  const visibles = useMemo(() => visiblesCon(filtros, consulta), [visiblesCon, filtros, consulta]);

  function aplicar(nuevos: Filtros) {
    setHojaAbierta(false);
    aplicarFiltros(nuevos);
  }

  function irA(idCategoria: string) {
    const destino = document.getElementById(`categoria-${idCategoria}`);
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    destino?.scrollIntoView?.({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
  }

  const activo = consulta !== null || hayFiltros(filtros);
  const categorias = menu.categorias
    .map((c) => ({ ...c, platillos: c.platillos.filter((p) => visibles.has(p.id)) }))
    .filter((c) => c.platillos.length > 0);
  // El «Top 3» es del menú completo: con una búsqueda o un filtro activo se esconde (si no, repetiría lo
  // que ya está en la lista). Un platillo descartado por alérgeno tampoco aparece arriba.
  const destacados = activo ? [] : menu.destacados.map((id) => indice.porId.get(id)?.platillo).filter((p): p is PlatilloPublico => !!p && visibles.has(p.id));
  const conteo = visibles.size === 0 ? 'Sin resultados' : visibles.size === 1 ? '1 platillo' : `${visibles.size} platillos`;
  const alergenosOpciones = unir(ALERGENOS_COMUNES, indice.alergenos, filtros.alergenos);
  const etiquetasOpciones = unir(ETIQUETAS_COMUNES, indice.etiquetas, filtros.etiquetas);

  return (
    <Pantalla>
      <header className={e.encabezado}>
        <div className={estilos.cabecera}>
          <div className={estilos.marca}>
            <Logo nombre={menu.restaurante.nombre} url={menu.restaurante.logo_url} />
            <p className={e.sobretitulo}>Mesa {mesa}</p>
          </div>
          <Boton variante="secundario" compacto onClick={onVolver}>
            Mi mesa
          </Boton>
        </div>
        <h1 ref={titulo} tabIndex={-1} className={`${e.titulo} ${estilos.titulo}`}>
          {menu.restaurante.nombre}
        </h1>
      </header>

      <AvisoConexion aviso={aviso} />

      {indice.total > 0 && (
        <div className={estilos.herramientas}>
          <div className={estilos.buscador}>
            <input
              type="search"
              className={estilos.campo}
              aria-label="Buscar en el menú"
              placeholder="Buscar un platillo"
              value={escrito}
              maxLength={80}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              onChange={(ev) => setEscrito(ev.target.value)}
            />
            {escrito && (
              <button type="button" className={estilos.borrar} aria-label="Borrar la búsqueda" onClick={() => setEscrito('')}>
                <span aria-hidden="true">×</span>
              </button>
          )}
          </div>
          <Boton
            variante={hayFiltros(filtros) ? 'primario' : 'secundario'}
            onClick={() => setHojaAbierta(true)}
            aria-label={hayFiltros(filtros) ? `Filtros, ${totalFiltros(filtros)} activos` : 'Filtros'}
          >
            Filtros{hayFiltros(filtros) ? ` · ${totalFiltros(filtros)}` : ''}
          </Boton>
        </div>

      )}

      {/* AC-05.3: siempre a la vista, en cada estado del menú, y sin forma de cerrarlo. */}
      <p className={estilos.aviso}>{AVISO_ALERGENOS}</p>

      {indice.total > 0 && (
        <p className={estilos.conteo} role="status" aria-live="polite">
          {activo ? conteo : ''}
        </p>
      )}

      {indice.total === 0 && <p className={e.texto}>Este menú todavía no tiene platillos. Pide la carta al personal.</p>}

      {destacados.length > 0 && (
        <section aria-labelledby={idTop} className={estilos.seccion}>
          <h2 id={idTop} className={estilos.topTitulo}>
            Top 3 del chef
          </h2>
          <ul className={estilos.carrusel}>
            {destacados.map((p) => (
              <li key={p.id} className={estilos.itemDestacado}>
                <TarjetaPlatillo platillo={p} variante="destacado" onAbrir={onAbrir} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {categorias.length > 1 && (
        <nav aria-label="Categorías" className={estilos.categorias}>
          {categorias.map((c) => (
            <button key={c.id} type="button" className={estilos.categoriaBoton} onClick={() => irA(c.id)}>
              {c.nombre}
            </button>
          ))}
        </nav>
      )}

      {categorias.map((c) => (
        <section key={c.id} id={`categoria-${c.id}`} aria-labelledby={`titulo-${c.id}`} className={estilos.categoria}>
          <h2 id={`titulo-${c.id}`} className={estilos.categoriaTitulo}>
            {c.nombre}
          </h2>
          <ul className={estilos.lista}>
            {c.platillos.map((p) => (
              <li key={p.id}>
                <TarjetaPlatillo platillo={p} onAbrir={onAbrir} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {indice.total > 0 && visibles.size === 0 && (
        <div className={estilos.vacio}>
          <span className={estilos.vacioIlustracion}>
            <Ilustracion clave="general" />
          </span>
          <p className={e.texto}>
            {consulta !== null && !hayFiltros(filtros)
              ? `No encontramos platillos con «${escrito.trim()}».`
              : 'No hay platillos con esa búsqueda y esos filtros.'}
          </p>
          <Boton variante="secundario" onClick={limpiarTodo}>
            {hayFiltros(filtros) ? 'Quitar búsqueda y filtros' : 'Ver todo el menú'}
          </Boton>
        </div>
      )}

      <HojaFiltros
        abierta={hojaAbierta}
        filtros={filtros}
        alergenos={alergenosOpciones}
        etiquetas={etiquetasOpciones}
        contar={(f) => visiblesCon(f, consulta).size}
        onAplicar={aplicar}
        onCerrar={() => setHojaAbierta(false)}
      />
    </Pantalla>
  );
}

