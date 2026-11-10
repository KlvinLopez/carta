import { useState } from 'react';

import { Boton } from '../../compartido/componentes';
import { ErrorApi } from '../../compartido/http';
import c from './Alta.module.css';
import { guardarComoArchivo } from './descarga';
import type { ServicioAlta } from './servicio';
import { TOPES, type Mesa, type Restaurante } from './tipos';

function Contador({
  etiqueta,
  valor,
  minimo,
  maximo,
  alCambiar,
  deshabilitado,
}: {
  etiqueta: string;
  valor: number;
  minimo: number;
  maximo: number;
  alCambiar: (valor: number) => void;
  deshabilitado?: boolean;
}) {
  // Mientras se teclea se conserva el texto crudo (vaciar el campo para escribir 12 es legítimo);
  // el rango se aplica al salir del campo o con los botones.
  const [texto, setTexto] = useState<string | null>(null);
  const acotar = (n: number) => Math.min(maximo, Math.max(minimo, Math.round(n) || minimo));
  const poner = (n: number) => {
    setTexto(null);
    alCambiar(acotar(n));
  };
  return (
    <div className={c.campo}>
      <span className={c.etiqueta} id={`et-${etiqueta}`}>
        {etiqueta}
      </span>
      <div className={c.contador} role="group" aria-labelledby={`et-${etiqueta}`}>
        <button
          type="button"
          className={c.herramienta}
          aria-label={`Menos ${etiqueta.toLowerCase()}`}
          disabled={deshabilitado || valor <= minimo}
          onClick={() => poner(valor - 1)}
        >
          <span aria-hidden="true">−</span>
        </button>
        <input
          className={`${c.entrada} ${c.numero}`}
          type="number"
          inputMode="numeric"
          min={minimo}
          max={maximo}
          value={texto ?? valor}
          aria-label={etiqueta}
          disabled={deshabilitado}
          onChange={(ev) => {
            setTexto(ev.target.value);
            const n = Number(ev.target.value);
            // Mientras el número sea válido, el valor real sigue lo que se teclea.
            if (ev.target.value !== '' && Number.isInteger(n) && n >= minimo && n <= maximo) alCambiar(n);
          }}
          onBlur={() => poner(Number(texto ?? valor))}
        />
        <button
          type="button"
          className={c.herramienta}
          aria-label={`Más ${etiqueta.toLowerCase()}`}
          disabled={deshabilitado || valor >= maximo}
          onClick={() => poner(valor + 1)}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </div>
  );
}

/** Paso 5 · Mesas: cuántas son y el PDF con los QR (descargado con el token, no con un enlace). */
export default function PasoMesas({
  servicio,
  restaurante,
  mesas,
  alCrear,
  alContinuar,
}: {
  servicio: ServicioAlta;
  restaurante: Restaurante;
  mesas: Mesa[];
  alCrear: (mesas: Mesa[]) => void;
  alContinuar: () => void;
}) {
  const [cantidad, setCantidad] = useState(8);
  const [capacidad, setCapacidad] = useState(4);
  const [creando, setCreando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const creadas = mesas.length > 0;

  async function crear() {
    setCreando(true);
    setError(null);
    try {
      alCrear(await servicio.crearMesas(restaurante.id, { cantidad, capacidad }));
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No pudimos crear tus mesas. Inténtalo de nuevo.');
    } finally {
      setCreando(false);
    }
  }

  async function descargar() {
    setDescargando(true);
    setError(null);
    try {
      guardarComoArchivo(await servicio.descargarQr(restaurante.id), 'qr-mesas.pdf');
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No pudimos descargar tus QR. Inténtalo de nuevo.');
    } finally {
      setDescargando(false);
    }
  }

  return (
    <section className={c.paso} aria-labelledby="titulo-mesas">
      <header className={c.encabezadoPaso}>
        <h2 id="titulo-mesas" className={c.tituloPaso}>
          ¿Cuántas mesas tienes?
        </h2>
        <p className={c.textoPaso}>
          Creamos un QR por mesa. Imprímelos y pégalos: tus comensales piden desde su teléfono.
        </p>
      </header>
      {creadas ? (
        <div className={c.exito} role="status">
          <p>
            Creamos {mesas.length} {mesas.length === 1 ? 'mesa' : 'mesas'}. Descarga el PDF con los QR listos para
            imprimir.
          </p>
        </div>
      ) : (
        <div className={c.contadores}>
          <Contador etiqueta="Mesas" valor={cantidad} minimo={1} maximo={TOPES.mesas} alCambiar={setCantidad} />
          <Contador
            etiqueta="Lugares por mesa"
            valor={capacidad}
            minimo={1}
            maximo={TOPES.capacidad}
            alCambiar={setCapacidad}
          />
        </div>
      )}
      {error && (
        <p className={c.mensajeError} role="alert">
          {error}
        </p>
      )}
      <div className={c.acciones}>
        {creadas ? (
          <>
            <Boton ancho cargando={descargando} onClick={() => void descargar()}>
              Descargar PDF de QR
            </Boton>
            <Boton ancho variante="secundario" onClick={alContinuar}>
              Continuar
            </Boton>
          </>
        ) : (
          <>
            <Boton ancho cargando={creando} onClick={() => void crear()}>
              Crear mesas
            </Boton>
            <Boton ancho variante="fantasma" onClick={alContinuar}>
              Omitir por ahora
            </Boton>
          </>
        )}
      </div>
    </section>
  );
}
