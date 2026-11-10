import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';

import { Boton } from '../../compartido/componentes';
import { EstadoVacio } from '../armazon/EstadoVacio';

interface Estado {
  fallo: boolean;
  intento: number;
}

/**
 * Si algo del menú revienta al pintarse (una respuesta malformada), el panel sigue en pie: se dice qué
 * pasó y «Reintentar» vuelve a montar la pantalla, que pide todo de nuevo.
 */
export class LimiteMenu extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { fallo: false, intento: 0 };

  static getDerivedStateFromError(): Partial<Estado> {
    return { fallo: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Carta: fallo al pintar el menú', error, info.componentStack);
  }

  render() {
    if (this.state.fallo) {
      return (
        <EstadoVacio
          glifo="!"
          titulo="No pudimos mostrar tu carta"
          accion={<Boton onClick={() => this.setState((s) => ({ fallo: false, intento: s.intento + 1 }))}>Reintentar</Boton>}
        >
          Algo en la respuesta del servidor no era lo esperado. Inténtalo de nuevo; tu carta no se ha tocado.
        </EstadoVacio>
      );
    }
    return <Fragment key={this.state.intento}>{this.props.children}</Fragment>;
  }
}
