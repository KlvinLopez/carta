import { useEffect, useMemo, useRef } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';

import type { Analitica } from './analitica/cola';
import { pantallaSinMesa, servicioEntradaReal, VistaEntrada } from './entrada/PantallaEntrada';
import type { ServicioEntrada } from './entrada/servicio';
import { useEntrada } from './entrada/useEntrada';
import type { AlmacenFiltros } from './menu/filtros';
import { MenuVista, type PropsMenuVista } from './menu/Menu';
import { servicioMenuReal, type ServicioMenu } from './menu/servicioMenu';
import { useControladorMenu, type ControladorMenu } from './menu/useControladorMenu';
import estilosCapa from './platillo/Platillo.module.css';
import { CapaPlatillo, EsqueletoPlatillo, PlatilloNoExiste, PlatilloVista } from './platillo/Platillo';
import { servicioPlatilloReal, type ServicioPlatillo } from './platillo/servicioPlatillo';

export interface PropsSesionMesa {
  codigo: string;
  /** Pruebas y capturas inyectan los servicios simulados. */
  servicio?: ServicioEntrada;
  servicioMenu?: ServicioMenu;
  servicioPlatillo?: ServicioPlatillo;
  analitica?: Analitica;
  almacenFiltros?: AlmacenFiltros;
}

/**
 * La sesión del comensal en esta pestaña. Por encima de las rutas viven **una sola vez** `useEntrada` (el
 * sondeo de la mesa sigue vivo al pasar de la bienvenida al menú y no se crea otro comensal) y el
 * controlador del menú (datos, búsqueda y filtros: volver de «Mi mesa» o del detalle muestra la misma
 * lista, sin esqueleto y sin otro `menu_view`). El menú se pide en cuanto `entrar` responde. Toda ruta
 * cuelga de `/m/<codigo>/…`.
 */
export function SesionMesa({ codigo, servicio = servicioEntradaReal, servicioMenu = servicioMenuReal, servicioPlatillo = servicioPlatilloReal, analitica, almacenFiltros }: PropsSesionMesa) {
  const entrada = useEntrada(codigo, servicio);
  const navigate = useNavigate();
  const { vista } = entrada;
  const menu = useControladorMenu({
    slug: vista.fase === 'lista' ? vista.sesion.restaurante.slug : null,
    servicio: servicioMenu,
    analitica,
    almacen: almacenFiltros,
  });

  // Al volver del detalle el menú se coloca solo donde estaba: el navegador no debe adelantarse.
  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return;
    const antes = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = antes;
    };
  }, []);

  /** Del menú al detalle: se anota cuál tarjeta se tocó (el menú sigue montado bajo la capa). */
  const abrirPlatillo = (id: string) => {
    menu.recordarTarjeta(id);
    navigate(`/m/${codigo}/platillo/${id}`, { state: { desdeMenu: true } });
  };
  // Con un enlace directo no hay a dónde «regresar»: se sustituye el detalle por el menú, sin apilar otra entrada.
  const volverAlMenu = () => navigate(`/m/${codigo}/menu`, { replace: true });

  return (
    <Routes>
      <Route index element={<VistaEntrada entrada={entrada} onVerMenu={() => navigate(`/m/${codigo}/menu`)} />} />
      <Route
        element={
          // Un enlace directo al menú o al detalle espera la entrada (cookie y mesa); si falla, el mismo fallo de siempre.
          vista.fase === 'lista' ? (
            <MenuConCapa
              codigo={codigo}
              controlador={menu}
              mesa={vista.sesion.mesa.numero}
              aviso={vista.aviso}
              onAbrir={abrirPlatillo}
              onVolver={() => navigate(`/m/${codigo}`)}
            />
          ) : (
            pantallaSinMesa(entrada)
          )
        }
      >
        <Route path="menu" element={null} />
        <Route path="platillo/:id" element={<RutaPlatillo servicio={servicioPlatillo} controlador={menu} analitica={analitica} onVolver={volverAlMenu} />} />
      </Route>
      <Route path="*" element={<Navigate to={`/m/${codigo}`} replace />} />
    </Routes>
  );
}

/**
 * El menú y, encima, el detalle de un platillo como capa. El menú **no se desmonta** al abrir un platillo:
 * su posición de desplazamiento, los tamaños que el navegador ya midió (`content-visibility`) y el foco
 * quedan como estaban, así que volver deja la tarjeta exactamente donde se tocó, con 22 o con 222 platillos.
 * Mientras la capa está abierta el menú no se puede leer ni tocar (`inert` y `aria-hidden`).
 */
function MenuConCapa({ codigo, controlador, ...resto }: Omit<PropsMenuVista, 'onAbrir'> & { codigo: string; onAbrir: (id: string) => void }) {
  const { pathname } = useLocation();
  const abierto = pathname.startsWith(`/m/${codigo}/platillo/`);
  const estabaAbierto = useRef(abierto);
  const { devolverFoco } = controlador;
  useEffect(() => {
    // Al cerrarse el detalle, el foco vuelve a la tarjeta que se abrió.
    if (estabaAbierto.current && !abierto) devolverFoco();
    estabaAbierto.current = abierto;
  }, [abierto, devolverFoco]);
  const tapado = abierto ? ({ inert: '' } as Record<string, string>) : {};
  return (
    <>
      <div aria-hidden={abierto || undefined} className={estilosCapa.directo} {...tapado}>
        <MenuVista controlador={controlador} {...resto} />
      </div>
      {abierto && (
        <CapaPlatillo>
          <Outlet />
        </CapaPlatillo>
      )}
    </>
  );
}

/**
 * Una apertura del detalle = una instancia (`key` = la entrada del historial): dos platillos seguidos no
 * comparten estado. «Volver» regresa en el historial si se llegó desde el menú; con un enlace directo
 * sustituye el detalle por el menú. Con el menú ya cargado, un id que no está en él (de otro restaurante,
 * dado de baja, mal escrito) es «ya no está en el menú»: no se pide el detalle ni se cuenta una vista.
 */
function RutaPlatillo({ servicio, controlador, analitica, onVolver }: { servicio: ServicioPlatillo; controlador: ControladorMenu; analitica?: Analitica; onVolver: () => void }) {
  const { id: crudo = '' } = useParams<{ id: string }>();
  const id = crudo.toLowerCase(); // los UUID del servidor van en minúsculas; la ruta puede venir como sea
  const ubicacion = useLocation();
  const navigate = useNavigate();
  const desdeMenu = (ubicacion.state as { desdeMenu?: boolean } | null)?.desdeMenu === true;
  const volver = desdeMenu ? () => navigate(-1) : onVolver;
  const estadoMenu = controlador.estado;
  const enMemoria = useMemo(() => {
    if (estadoMenu.fase !== 'listo') return null;
    for (const c of estadoMenu.menu.categorias) {
      const p = c.platillos.find((x) => x.id === id);
      if (p) return { ...p, categoria_nombre: c.nombre };
    }
    return null;
  }, [estadoMenu, id]);
  if (estadoMenu.fase === 'cargando') return <EsqueletoPlatillo onVolver={volver} />;
  if (estadoMenu.fase === 'listo' && !enMemoria) return <PlatilloNoExiste onVolver={volver} />;
  return <PlatilloVista key={ubicacion.key} id={id} servicio={servicio} enMemoria={enMemoria} analitica={analitica} onVolver={volver} />;
}
