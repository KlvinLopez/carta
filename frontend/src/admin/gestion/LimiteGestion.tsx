import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';

import { Boton } from '../../compartido/componentes';
import { EstadoVacio } from '../armazon/EstadoVacio';

interface Estado {
  fallo: boolean;
  intento: number;
}

/**
 * Si algo de la pantalla revienta al pintarse (una respuesta malformada), el panel sigue en pie: se dice qué
 * pasó y «Reintentar» vuelve a montar la pantalla, que pide todo de nuevo.
 */
export class LimiteGestion extends Component<{ children: ReactNode; nombre: string }, Estado> {
  state: Estado = { fallo: false, intento: 0 };

  static getDerivedStateFromError(): Partial<Estado> {
    return { fallo: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Carta: fallo al pintar la pantalla', error, info.componentStack);
  }

  render() {
    if (this.state.fallo) {
      return (
        <EstadoVacio
          glifo="!"
          titulo={`No pudimos mostrar ${this.props.nombre}`}
          accion={<Boton onClick={() => this.setState((s) => ({ fallo: false, intento: s.intento + 1 }))}>Reintentar</Boton>}
        >
          Algo en la respuesta del servidor no era lo esperado. Inténtalo de nuevo; no se ha cambiado nada.
        </EstadoVacio>
      );
    }
    return <Fragment key={this.state.intento}>{this.props.children}</Fragment>;
  }
}
