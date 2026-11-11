import { Bienvenida } from './Bienvenida';
import { Esqueleto } from './Esqueleto';
import { PantallaError } from './PantallaError';
import { crearServicioEntrada, type ServicioEntrada } from './servicio';
import { useEntrada } from './useEntrada';

const servicioReal = crearServicioEntrada();

export interface PropsPantallaEntrada {
  codigo: string;
  /** Pruebas y capturas inyectan el servicio simulado. */
  servicio?: ServicioEntrada;
}

/** `/m/:codigo`: entra a la mesa y muestra la bienvenida, o el fallo que corresponda. */
export function PantallaEntrada({ codigo, servicio = servicioReal }: PropsPantallaEntrada) {
  const { vista, reintentar, cambiarAlias } = useEntrada(codigo, servicio);
  if (vista.fase === 'cargando') return <Esqueleto />;
  if (vista.fase === 'error') {
    return (
      <PantallaError clase={vista.clase} restaurante={vista.restaurante} reintentarEn={vista.reintentarEn} onReintentar={() => void reintentar()} />
    );
  }
  return <Bienvenida datos={vista} onCambiarAlias={cambiarAlias} />;
}
