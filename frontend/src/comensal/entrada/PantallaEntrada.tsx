import type { ReactNode } from 'react';

import type { AvisoSondeo } from './AvisoConexion';
import { Bienvenida } from './Bienvenida';
import { Esqueleto } from './Esqueleto';
import { PantallaError } from './PantallaError';
import { crearServicioEntrada, type ServicioEntrada } from './servicio';
import { useEntrada } from './useEntrada';

export const servicioEntradaReal = crearServicioEntrada();

export type EntradaEnCurso = ReturnType<typeof useEntrada>;

/** Lo que se ve mientras la mesa no está lista (cargando) o falló; `null` cuando ya hay mesa. */
export function pantallaSinMesa({ vista, reintentar }: EntradaEnCurso): ReactNode | null {
  if (vista.fase === 'cargando') return <Esqueleto />;
  if (vista.fase === 'error') {
    return (
      <PantallaError clase={vista.clase} restaurante={vista.restaurante} reintentarEn={vista.reintentarEn} onReintentar={() => void reintentar()} />
    );
  }
  return null;
}

export interface PropsVistaEntrada {
  entrada: EntradaEnCurso;
  /** El aviso único elegido por `SesionMesa`; sin él, el del sondeo de la mesa. */
  aviso?: AvisoSondeo;
  onVerMenu: () => void;
}

/** La bienvenida (o el fallo) de una entrada que ya corre en otro sitio: el área la sube y la comparte. */
export function VistaEntrada({ entrada, aviso, onVerMenu }: PropsVistaEntrada) {
  const sinMesa = pantallaSinMesa(entrada);
  if (sinMesa) return <>{sinMesa}</>;
  if (entrada.vista.fase !== 'lista') return null;
  return <Bienvenida datos={entrada.vista} aviso={aviso} onCambiarAlias={entrada.cambiarAlias} onVerMenu={onVerMenu} />;
}

export interface PropsPantallaEntrada {
  codigo: string;
  /** Pruebas y capturas inyectan el servicio simulado. */
  servicio?: ServicioEntrada;
  onVerMenu?: () => void;
}

/** `/m/:codigo`: entra a la mesa y muestra la bienvenida, o el fallo que corresponda. */
export function PantallaEntrada({ codigo, servicio = servicioEntradaReal, onVerMenu = () => undefined }: PropsPantallaEntrada) {
  const entrada = useEntrada(codigo, servicio);
  return <VistaEntrada entrada={entrada} onVerMenu={onVerMenu} />;
}
