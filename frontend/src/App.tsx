import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';

import { Cargando } from './compartido/pantalla/Cargando';
import { Inicio } from './compartido/pantalla/Inicio';
import { LimiteError } from './compartido/pantalla/LimiteError';
import { NoEncontrada } from './compartido/pantalla/NoEncontrada';

// Tres áreas, tres trozos: cada una se descarga sólo cuando se entra en su ruta.
// Lo vigilan src/App.test.tsx (estado de carga antes del contenido) y scripts/presupuesto.mjs
// (≥ 3 trozos Area-*.js fuera de index.html).
const AreaComensal = lazy(() => import('./comensal/Area'));
const AreaPersonal = lazy(() => import('./personal/Area'));
const AreaOperador = lazy(() => import('./admin/Area'));

/** Mientras llega el trozo del área: el mismo copy que usará el área al cargarse. */
function CargandoArea() {
  const { pathname } = useLocation();
  const esPanel = pathname === '/admin' || pathname.startsWith('/admin/');
  return <Cargando texto={esPanel ? 'Preparando tu panel…' : undefined} />;
}

export function App() {
  return (
    <BrowserRouter>
      <LimiteError>
        <Suspense fallback={<CargandoArea />}>
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/m/:codigo/*" element={<AreaComensal />} />
            <Route path="/staff/:slug/*" element={<AreaPersonal />} />
            <Route path="/admin/*" element={<AreaOperador />} />
            <Route path="*" element={<NoEncontrada />} />
          </Routes>
        </Suspense>
      </LimiteError>
    </BrowserRouter>
  );
}
