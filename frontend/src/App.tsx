import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import AreaComensal from './comensal/Area';
import { Arranque } from './compartido/pantalla/Arranque';
import { Cargando } from './compartido/pantalla/Cargando';
import { Inicio } from './compartido/pantalla/Inicio';
import { LimiteError } from './compartido/pantalla/LimiteError';
import { NoEncontrada } from './compartido/pantalla/NoEncontrada';

// El comensal va en la entrada, no en un trozo: con React.lazy su código (y sus 8 dependencias) se pedía hasta que
// `index.js` terminaba de ejecutarse, un salto de red más en la carga en frío del tráfico principal (T-2.5, AC-01.1:
// medido contra la alternativa de `modulepreload`, ≈ 0.1–0.15 s menos). El panel y el personal siguen siendo un
// trozo cada uno, que se descarga sólo al entrar en su ruta. Lo vigilan src/App.test.tsx (estado de carga antes del
// contenido) y scripts/presupuesto.mjs (≥ 2 trozos Area-*.js fuera de index.html y nada del panel en la entrada).
const AreaPersonal = lazy(() => import('./personal/Area'));
const AreaOperador = lazy(() => import('./admin/Area'));

/** Mientras llega el trozo del área: el mismo copy que usará el área al cargarse. */
function CargandoArea() {
  const { pathname } = useLocation();
  const esPanel = pathname === '/admin' || pathname.startsWith('/admin/');
  return esPanel ? <Cargando texto="Preparando tu panel…" /> : <Arranque />;
}

// Un salto de línea u otro carácter de control codificado (`/m/<codigo>/menu%0A`) no lo casa ni el comodín
// del enrutador: la pantalla quedaba en blanco. Se quitan y la ruta cae donde caería sin ellos. El código de
// una mesa (`/m/<codigo>`) no se toca: con un carácter de control no tiene la forma de un código y el área
// ya lo explica como «mesa inválida» (no se le arregla para que parezca válido).
const CONTROL_CODIFICADO = /%(?:[01][0-9a-f]|7f)/gi;

function sinControles(pathname: string): string {
  const partes = pathname.split('/');
  const desde = partes[1] === 'm' ? 3 : 0;
  return partes.map((parte, i) => (i < desde ? parte : parte.replace(CONTROL_CODIFICADO, ''))).join('/');
}

function SinControlesEnLaRuta({ children }: { children: ReactNode }) {
  const { pathname, search, hash } = useLocation();
  const limpia = sinControles(pathname);
  if (limpia !== pathname) return <Navigate to={{ pathname: limpia || '/', search, hash }} replace />;
  return children;
}

export function App() {
  return (
    <BrowserRouter>
      <LimiteError>
        <SinControlesEnLaRuta>
          <Suspense fallback={<CargandoArea />}>
            <Routes>
              <Route path="/" element={<Inicio />} />
              <Route path="/m/:codigo/*" element={<AreaComensal />} />
              <Route path="/staff/:slug/*" element={<AreaPersonal />} />
              <Route path="/admin/*" element={<AreaOperador />} />
              <Route path="*" element={<NoEncontrada />} />
            </Routes>
          </Suspense>
        </SinControlesEnLaRuta>
      </LimiteError>
    </BrowserRouter>
  );
}
