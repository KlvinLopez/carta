import { Pantalla, estilosPantalla as e } from './Pantalla';

/** Raíz del dominio. La página "Acerca de Carta" y el aviso de privacidad llegan en T-4.5. */
export function Inicio() {
  return (
    <Pantalla>
      <div className={e.centrado}>
        <div className={e.ilustracion} aria-hidden="true">
          C
        </div>
        <h1 className={e.titulo}>Carta</h1>
        <p className={e.texto}>
          Escanea el QR de tu mesa para ver el menú y pedir con quienes te acompañan.
        </p>
      </div>
      <p className={e.pie}>Sin cuentas, sin instalar nada.</p>
    </Pantalla>
  );
}
