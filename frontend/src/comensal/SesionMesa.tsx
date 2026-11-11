import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';

import type { Analitica } from './analitica/cola';
import { pantallaSinMesa, servicioEntradaReal, VistaEntrada } from './entrada/PantallaEntrada';
import type { ServicioEntrada } from './entrada/servicio';
import { useEntrada } from './entrada/useEntrada';
import type { AlmacenFiltros } from './menu/filtros';
import { Menu } from './menu/Menu';
import type { ServicioMenu } from './menu/servicioMenu';

export interface PropsSesionMesa {
  codigo: string;
  /** Pruebas y capturas inyectan los servicios simulados. */
  servicio?: ServicioEntrada;
  servicioMenu?: ServicioMenu;
  analitica?: Analitica;
  almacenFiltros?: AlmacenFiltros;
}

/**
 * La sesión del comensal en esta pestaña: `useEntrada` corre **una sola vez** aquí, por encima de las
 * rutas, para que el sondeo de la mesa siga vivo al pasar de la bienvenida al menú (y no se cree otro
 * comensal al cambiar de pantalla). Toda ruta cuelga de `/m/<codigo>/…`.
 */
export function SesionMesa({ codigo, servicio = servicioEntradaReal, servicioMenu, analitica, almacenFiltros }: PropsSesionMesa) {
  const entrada = useEntrada(codigo, servicio);
  const navigate = useNavigate();
  const { vista } = entrada;

  return (
    <Routes>
      <Route index element={<VistaEntrada entrada={entrada} onVerMenu={() => navigate(`/m/${codigo}/menu`)} />} />
      <Route
        path="menu"
        element={
          // Un enlace directo al menú espera la entrada (cookie y mesa); si falla, el mismo fallo de siempre.
          vista.fase === 'lista' ? (
            <Menu
              slug={vista.sesion.restaurante.slug}
              mesa={vista.sesion.mesa.numero}
              servicio={servicioMenu}
              analitica={analitica}
              almacen={almacenFiltros}
              onVolver={() => navigate(`/m/${codigo}`)}
            />
          ) : (
            pantallaSinMesa(entrada)
          )
        }
      />
      <Route path="*" element={<Navigate to={`/m/${codigo}`} replace />} />
    </Routes>
  );
}
