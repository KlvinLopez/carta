import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { Cargando } from './compartido/pantalla/Cargando';
import { Inicio } from './compartido/pantalla/Inicio';
import { NoEncontrada } from './compartido/pantalla/NoEncontrada';

// Tres áreas, tres trozos: cada una se descarga sólo cuando se entra en su ruta.
const AreaComensal = lazy(() => import('./comensal/Area'));
const AreaPersonal = lazy(() => import('./personal/Area'));
const AreaOperador = lazy(() => import('./admin/Area'));

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Cargando />}>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/m/:codigo/*" element={<AreaComensal />} />
          <Route path="/staff/:slug/*" element={<AreaPersonal />} />
          <Route path="/admin/*" element={<AreaOperador />} />
          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
