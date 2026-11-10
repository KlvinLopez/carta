import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import { Cargando } from '../compartido/pantalla/Cargando';
import { estilosPantalla } from '../compartido/pantalla/Pantalla';
import { NoEncontrada } from '../compartido/pantalla/NoEncontrada';
import PantallaAcceso from './acceso/PantallaAcceso';
import { SesionProvider, useSesion, type FabricaProveedor } from './acceso/Sesion';
import Armazon from './armazon/Armazon';
import {
  SeccionAjustes,
  SeccionMesas,
  SeccionPedidos,
  SeccionPersonal,
} from './secciones';

// El asistente de alta (T-1.11) es un trozo aparte: sólo se descarga al entrar en /admin/alta.
const AsistenteAlta = lazy(() => import('./alta/Asistente'));
// La pantalla Menú (T-1.12) también: lista, editor, recorte de foto y arrastre viajan en su propio trozo.
const PantallaMenu = lazy(() => import('./menu/PantallaMenu'));

/** Todo lo que no es `/admin/acceso` exige sesión; sin ella se vuelve al acceso recordando adónde iba. */
function RutaProtegida() {
  const { estado } = useSesion();
  const ubicacion = useLocation();
  if (estado.tipo === 'cargando') return <Cargando texto="Preparando tu panel…" />;
  if (estado.tipo !== 'con-sesion') {
    return <Navigate to="/admin/acceso" replace state={{ desde: `${ubicacion.pathname}${ubicacion.search}${ubicacion.hash}` }} />;
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
          <Route
            path="alta"
            element={
              <Suspense fallback={<Cargando texto="Preparando el asistente…" />}>
                <AsistenteAlta />
              </Suspense>
            }
          />
          <Route element={<Armazon />}>
            <Route index element={<Navigate to="menu" replace />} />
            <Route
              path="menu"
              element={
                <Suspense
                  fallback={
                    <div className={estilosPantalla.centrado} role="status" aria-live="polite">
                      <div className={estilosPantalla.espera} aria-hidden="true" />
                      <p className={estilosPantalla.texto}>Preparando tu menú…</p>
                    </div>
                  }
                >
                  <PantallaMenu />
                </Suspense>
              }
            />
            <Route path="mesas" element={<SeccionMesas />} />
            <Route path="personal" element={<SeccionPersonal />} />
            <Route path="pedidos" element={<SeccionPedidos />} />
            <Route path="ajustes" element={<SeccionAjustes />} />
          </Route>
        </Route>
        <Route
          path="*"
          element={
            <NoEncontrada
              texto="Esta sección no existe en tu panel. Vuelve al menú para seguir."
              destino="/admin/menu"
              enlace="Ir a mi panel"
            />
          }
        />
      </Routes>
    </SesionProvider>
  );
}
