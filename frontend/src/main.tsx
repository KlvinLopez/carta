// Los estilos globales van antes que la app para que los módulos CSS de los componentes
// queden después en el bundle y ganen ante reglas globales del mismo peso.
import './compartido/tokens.css';
import './compartido/base.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { liberarServiceWorker, registrarServiceWorker } from './pwa/registro';
import { instalarGuardiaDeRecarga } from './recarga';

// Un trozo que ya no existe en el servidor (despliegue nuevo mientras una pestaña vieja navega):
// Vite avisa con `vite:preloadError` y la salida limpia es recargar, una sola vez por URL
// (ver recarga.ts: un 404 cacheado en el borde no debe convertirse en una tormenta de recargas).
instalarGuardiaDeRecarga(window, () => liberarServiceWorker());
registrarServiceWorker();

const raiz = document.getElementById('app');
if (!raiz) {
  document.body.textContent = 'Carta no pudo iniciar. Recarga la página.';
  throw new Error('No existe el contenedor #app en index.html');
}

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
