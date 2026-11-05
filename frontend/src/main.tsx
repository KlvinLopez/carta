import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import './compartido/tokens.css';
import './compartido/base.css';

const raiz = document.getElementById('app');
if (!raiz) {
  throw new Error('No existe el contenedor #app en index.html');
}

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
