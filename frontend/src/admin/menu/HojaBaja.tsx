import { Boton } from '../../compartido/componentes';
import { HojaInferior } from '../../compartido/componentes/HojaInferior';
import c from './Menu.module.css';

/** Confirmación de «dar de baja» (US-16, regla dura 9): el platillo se oculta, nunca se borra. */
export function HojaBaja({ nombre, alConfirmar, alCerrar }: { nombre: string; alConfirmar: () => void; alCerrar: () => void }) {
  return (
    <HojaInferior
      abierta
      onCerrar={alCerrar}
      titulo={`¿Dar de baja ${nombre}?`}
      descripcion="Dejará de verse en el menú de tus comensales. No se borra: puedes reactivarlo cuando quieras desde «Dados de baja»."
    >
      <div className={c.accionesFormulario}>
        <Boton ancho onClick={alConfirmar}>
          Dar de baja
        </Boton>
        <Boton variante="fantasma" ancho onClick={alCerrar}>
          Mejor no
        </Boton>
      </div>
    </HojaInferior>
  );
}
