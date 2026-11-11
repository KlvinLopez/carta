import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';

import type { Analitica } from './analitica/cola';
import { pantallaSinMesa, servicioEntradaReal, VistaEntrada } from './entrada/PantallaEntrada';
import type { ServicioEntrada } from './entrada/servicio';
import { useEntrada } from './entrada/useEntrada';
import type { AlmacenFiltros } from './menu/filtros';
import { MenuVista } from './menu/Menu';
import { servicioMenuReal, type ServicioMenu } from './menu/servicioMenu';
import { useControladorMenu } from './menu/useControladorMenu';

export interface PropsSesionMesa {
  codigo: string;
  /** Pruebas y capturas inyectan los servicios simulados. */
  servicio?: ServicioEntrada;
  servicioMenu?: ServicioMenu;
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
export function SesionMesa({ codigo, servicio = servicioEntradaReal, servicioMenu = servicioMenuReal, analitica, almacenFiltros }: PropsSesionMesa) {
  const entrada = useEntrada(codigo, servicio);
  const navigate = useNavigate();
  const { vista } = entrada;
  const menu = useControladorMenu({
    slug: vista.fase === 'lista' ? vista.sesion.restaurante.slug : null,
    servicio: servicioMenu,
    analitica,
    almacen: almacenFiltros,
  });

  return (
    <Routes>
      <Route index element={<VistaEntrada entrada={entrada} onVerMenu={() => navigate(`/m/${codigo}/menu`)} />} />
      <Route
        path="menu"
        element={
          // Un enlace directo al menú espera la entrada (cookie y mesa); si falla, el mismo fallo de siempre.
          vista.fase === 'lista' ? (
            <MenuVista controlador={menu} mesa={vista.sesion.mesa.numero} aviso={vista.aviso} onVolver={() => navigate(`/m/${codigo}`)} />
          ) : (
            pantallaSinMesa(entrada)
          )
        }
      />
      <Route path="*" element={<Navigate to={`/m/${codigo}`} replace />} />
    </Routes>
  );
}
