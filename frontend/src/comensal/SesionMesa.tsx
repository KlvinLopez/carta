import { useEffect, useMemo } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';

import type { Analitica } from './analitica/cola';
import { pantallaSinMesa, servicioEntradaReal, VistaEntrada } from './entrada/PantallaEntrada';
import type { ServicioEntrada } from './entrada/servicio';
import { useEntrada } from './entrada/useEntrada';
import type { AlmacenFiltros } from './menu/filtros';
import { MenuVista } from './menu/Menu';
import { servicioMenuReal, type ServicioMenu } from './menu/servicioMenu';
import { useControladorMenu, type ControladorMenu } from './menu/useControladorMenu';
import { PlatilloVista } from './platillo/Platillo';
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

  /** Del menú al detalle: se anota dónde estaba y cuál tarjeta se tocó. */
  const abrirPlatillo = (id: string) => {
    menu.recordarPosicion(id);
    navigate(`/m/${codigo}/platillo/${id}`, { state: { desdeMenu: true } });
  };
  const volverAlMenu = () => navigate(`/m/${codigo}/menu`);

  return (
    <Routes>
      <Route index element={<VistaEntrada entrada={entrada} onVerMenu={() => navigate(`/m/${codigo}/menu`)} />} />
      <Route
        path="menu"
        element={
          // Un enlace directo al menú espera la entrada (cookie y mesa); si falla, el mismo fallo de siempre.
          vista.fase === 'lista' ? (
            <MenuVista
              controlador={menu}
              mesa={vista.sesion.mesa.numero}
              aviso={vista.aviso}
              onAbrir={abrirPlatillo}
              onVolver={() => {
                menu.olvidarPosicion();
                navigate(`/m/${codigo}`);
              }}
            />
          ) : (
            pantallaSinMesa(entrada)
          )
        }
      />
      <Route
        path="platillo/:id"
        element={
          // Un enlace directo o una recarga esperan la entrada, como el menú.
          vista.fase === 'lista' ? (
            <RutaPlatillo servicio={servicioPlatillo} controlador={menu} analitica={analitica} onVolver={volverAlMenu} />
          ) : (
            pantallaSinMesa(entrada)
          )
        }
      />
      <Route path="*" element={<Navigate to={`/m/${codigo}`} replace />} />
    </Routes>
  );
}

/**
 * Una apertura del detalle = una instancia (`key` = la entrada del historial): su `dish_view` es suyo y
 * dos platillos seguidos no comparten estado. «Volver» regresa en el historial si se llegó desde el menú
 * (la misma posición, sin esqueleto); con un enlace directo lleva al menú.
 */
function RutaPlatillo({ servicio, controlador, analitica, onVolver }: { servicio: ServicioPlatillo; controlador: ControladorMenu; analitica?: Analitica; onVolver: () => void }) {
  const { id = '' } = useParams<{ id: string }>();
  const ubicacion = useLocation();
  const navigate = useNavigate();
  const desdeMenu = (ubicacion.state as { desdeMenu?: boolean } | null)?.desdeMenu === true;
  const enMemoria = useMemo(() => {
    if (controlador.estado.fase !== 'listo') return null;
    for (const c of controlador.estado.menu.categorias) {
      const p = c.platillos.find((x) => x.id === id);
      if (p) return { ...p, categoria_nombre: c.nombre };
    }
    return null;
  }, [controlador.estado, id]);
  return (
    <PlatilloVista
      key={ubicacion.key}
      id={id}
      servicio={servicio}
      enMemoria={enMemoria}
      analitica={analitica}
      onVolver={desdeMenu ? () => navigate(-1) : onVolver}
    />
  );
}
