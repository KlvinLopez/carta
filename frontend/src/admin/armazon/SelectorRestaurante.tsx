import { useState } from 'react';

import { Boton, HojaInferior, Tarjeta } from '../../compartido/componentes';
import { useRestauranteActivo } from './RestauranteActivo';
import estilos from './Armazon.module.css';

/** Nombre del restaurante activo; con más de uno abre una hoja inferior para cambiar. */
export function SelectorRestaurante() {
  const { estado, activo, elegir } = useRestauranteActivo();
  const [abierta, setAbierta] = useState(false);
  if (estado.tipo !== 'listo' || !activo) return null;

  const varios = estado.restaurantes.length > 1;
  return (
    <>
      <Boton
        variante="fantasma"
        compacto
        className={estilos.selector}
        disabled={!varios}
        aria-haspopup={varios ? 'dialog' : undefined}
        onClick={() => setAbierta(true)}
      >
        {activo.nombre}
        {varios && <span aria-hidden="true"> ▾</span>}
      </Boton>
      <HojaInferior
        abierta={abierta}
        onCerrar={() => setAbierta(false)}
        titulo="Tus restaurantes"
        descripcion="Elige cuál quieres administrar."
      >
        <ul className={estilos.restaurantes}>
          {estado.restaurantes.map((r) => (
            <li key={r.id}>
              <Tarjeta
                onClick={() => {
                  elegir(r.id);
                  setAbierta(false);
                }}
                aria-current={r.id === activo.id ? 'true' : undefined}
              >
                <strong>{r.nombre}</strong>
                {r.id === activo.id && <span> · activo</span>}
              </Tarjeta>
            </li>
          ))}
        </ul>
      </HojaInferior>
    </>
  );
}
