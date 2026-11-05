import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Boton } from '../componentes/Boton';
import { Pantalla, estilosPantalla as e } from './Pantalla';

interface Estado {
  fallo: boolean;
}

/**
 * Límite de error alrededor de las áreas cargadas con React.lazy. Si un trozo no llega
 * (despliegue nuevo con hashes distintos, red caída), en lugar de una pantalla en blanco
 * se ofrece recargar.
 */
export class LimiteError extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { fallo: false };

  static getDerivedStateFromError(): Estado {
    return { fallo: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Carta: fallo al cargar una pantalla', error, info.componentStack);
  }

  render() {
    if (this.state.fallo) return <PantallaFallo />;
    return this.props.children;
  }
}

function PantallaFallo() {
  return (
    <Pantalla>
      <div className={e.centrado} role="alert">
        <div className={e.ilustracion} aria-hidden="true">
          !
        </div>
        <h1 className={e.titulo}>No pudimos cargar esta pantalla</h1>
        <p className={e.texto}>Revisa tu conexión e inténtalo de nuevo.</p>
        <Boton onClick={() => window.location.reload()}>Reintentar</Boton>
      </div>
    </Pantalla>
  );
}
