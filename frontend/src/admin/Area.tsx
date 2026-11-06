import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import { Cargando } from '../compartido/pantalla/Cargando';
import { NoEncontrada } from '../compartido/pantalla/NoEncontrada';
import PantallaAcceso from './acceso/PantallaAcceso';
import { SesionProvider, useSesion, type FabricaProveedor } from './acceso/Sesion';
import Armazon from './armazon/Armazon';
import {
  SeccionAjustes,
  SeccionMenu,
  SeccionMesas,
  SeccionPedidos,
  SeccionPersonal,
} from './secciones';

/** Todo lo que no es `/admin/acceso` exige sesión; sin ella se vuelve al acceso recordando adónde iba. */
function RutaProtegida() {
  const { estado } = useSesion();
  const ubicacion = useLocation();
  if (estado.tipo === 'cargando') return <Cargando />;
  if (estado.tipo !== 'con-sesion') {
    return <Navigate to="/admin/acceso" replace state={{ desde: ubicacion.pathname }} />;
  }
  return <Outlet />;
}

/**
 * Área del operador (`/admin`). El SDK de Firebase entra con `import()` dinámico desde
 * `acceso/proveedor.ts`, así que sólo se descarga aquí, nunca en el bundle inicial.
 * `fabrica` permite a las pruebas entregar un proveedor simulado.
 */
export default function AreaOperador({ fabrica }: { fabrica?: FabricaProveedor }) {
  return (
    <SesionProvider fabrica={fabrica}>
      <Routes>
        <Route path="acceso" element={<PantallaAcceso />} />
        <Route element={<RutaProtegida />}>
          <Route element={<Armazon />}>
            <Route index element={<Navigate to="menu" replace />} />
            <Route path="menu" element={<SeccionMenu />} />
            <Route path="mesas" element={<SeccionMesas />} />
            <Route path="personal" element={<SeccionPersonal />} />
            <Route path="pedidos" element={<SeccionPedidos />} />
            <Route path="ajustes" element={<SeccionAjustes />} />
          </Route>
        </Route>
        <Route path="*" element={<NoEncontrada />} />
      </Routes>
    </SesionProvider>
  );
}
