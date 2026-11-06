import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { Boton } from '../../compartido/componentes';
import { estilosPantalla as e } from '../../compartido/pantalla/Pantalla';
import { useSesion } from '../acceso/Sesion';
import estilos from './Armazon.module.css';
import { EstadoVacio } from './EstadoVacio';
import { IconoAjustes, IconoMenu, IconoMesas, IconoPedidos, IconoPersonal } from './iconos';
import { RestauranteProvider, useRestauranteActivo } from './RestauranteActivo';
import { SelectorRestaurante } from './SelectorRestaurante';

const SECCIONES: { ruta: string; etiqueta: string; icono: ReactNode }[] = [
  { ruta: 'menu', etiqueta: 'Menú', icono: <IconoMenu /> },
  { ruta: 'mesas', etiqueta: 'Mesas', icono: <IconoMesas /> },
  { ruta: 'personal', etiqueta: 'Personal', icono: <IconoPersonal /> },
  { ruta: 'pedidos', etiqueta: 'Pedidos', icono: <IconoPedidos /> },
  { ruta: 'ajustes', etiqueta: 'Ajustes', icono: <IconoAjustes /> },
];

function Contenido() {
  const { estado, reintentar } = useRestauranteActivo();
  const { salir } = useSesion();

  if (estado.tipo === 'cargando') {
    return (
      <div className={e.centrado} role="status" aria-live="polite">
        <div className={e.espera} aria-hidden="true" />
        <p className={e.texto}>Preparando tu panel…</p>
      </div>
    );
  }
  if (estado.tipo === 'error') {
    return (
      <EstadoVacio
        glifo="!"
        titulo="No pudimos cargar tu panel"
        accion={<Boton onClick={reintentar}>Reintentar</Boton>}
      >
        {estado.mensaje}
      </EstadoVacio>
    );
  }
  if (estado.restaurantes.length === 0) {
    return (
      <EstadoVacio
        glifo="C"
        titulo="Todavía no tienes un restaurante"
        accion={
          <Boton variante="fantasma" onClick={() => void salir()}>
            Salir
          </Boton>
        }
      >
        Cuando se cree tu restaurante verás aquí tu menú, tus mesas y tus pedidos.
      </EstadoVacio>
    );
  }
  return <Outlet />;
}

/** Armazón del panel del operador: cabecera con selector, contenido y navegación de cinco secciones. */
export default function Armazon() {
  return (
    <RestauranteProvider>
      <div className={estilos.armazon}>
        <nav className={estilos.navegacion} aria-label="Secciones del panel">
          {SECCIONES.map(({ ruta, etiqueta, icono }) => (
            <NavLink key={ruta} to={`/admin/${ruta}`} className={estilos.enlace}>
              {icono}
              {etiqueta}
            </NavLink>
          ))}
        </nav>
        <main className={`pantalla ${estilos.contenido}`}>
          <header className={estilos.cabecera}>
            <span className={estilos.marca}>Carta</span>
            <SelectorRestaurante />
          </header>
          <div className={e.lista}>
            <Contenido />
          </div>
        </main>
      </div>
    </RestauranteProvider>
  );
}
