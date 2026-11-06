import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';

import { Boton } from '../../compartido/componentes';
import { ErrorApi } from '../../compartido/http';
import { estilosPantalla as e } from '../../compartido/pantalla/Pantalla';
import c from './Alta.module.css';
import { ACEPTAR, pesoLegible, validarArchivo } from './archivo';
import { contarPlatillos, aBorrador, type Borrador } from './borrador';
import type { ServicioAlta } from './servicio';
import type { Importacion, Restaurante } from './tipos';
import { useSondeoImportacion } from './useSondeo';

const MENSAJES_LECTURA = [
  'Estamos leyendo tu carta…',
  'Separando las categorías…',
  'Buscando nombres, descripciones y precios…',
  'Revisando que los precios se lean bien…',
];
const CADA_MENSAJE_MS = 6000;

function useMensajeRotativo(activo: boolean): string {
  const [indice, setIndice] = useState(0);
  useEffect(() => {
    if (!activo) return;
    const intervalo = setInterval(() => setIndice((i) => (i + 1) % MENSAJES_LECTURA.length), CADA_MENSAJE_MS);
    return () => clearInterval(intervalo);
  }, [activo]);
  return MENSAJES_LECTURA[indice]!;
}

/**
 * Paso 2 · Tu carta: sube el archivo, sondea la importación cada 3 s y, cuando está lista, entrega
 * el borrador al paso de revisión. Nada se crea en el menú hasta confirmar (AC-25.3).
 */
export default function PasoCarta({
  servicio,
  restaurante,
  alTenerBorrador,
  alCapturarAMano,
  importacionInicial,
  alCambiarImportacion,
}: {
  servicio: ServicioAlta;
  restaurante: Restaurante;
  alTenerBorrador: (borrador: Borrador, importacion: Importacion) => void;
  alCapturarAMano: () => void;
  importacionInicial: Importacion | null;
  alCambiarImportacion: (importacion: Importacion | null) => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const [reintentando, setReintentando] = useState(false);
  const [errorReintento, setErrorReintento] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [subida, setSubida] = useState<Importacion | null>(importacionInicial);
  const entrada = useRef<HTMLInputElement>(null);

  const sondeo = useSondeoImportacion(servicio, restaurante.id, subida?.id ?? null, subida);
  const estado = sondeo.importacion?.estado ?? subida?.estado;
  const leyendo = !!subida && (estado === 'pendiente' || estado === 'procesando') && !sondeo.agotado && !sondeo.error;
  const mensaje = useMensajeRotativo(leyendo);

  function elegir(nuevo: File | undefined) {
    if (!nuevo) return;
    const problema = validarArchivo(nuevo);
    setErrorArchivo(problema);
    setArchivo(problema ? null : nuevo);
    setErrorSubida(null);
  }

  function alElegir(evento: ChangeEvent<HTMLInputElement>) {
    elegir(evento.target.files?.[0]);
    evento.target.value = '';
  }

  function alSoltar(evento: DragEvent) {
    evento.preventDefault();
    setArrastrando(false);
    elegir(evento.dataTransfer.files[0]);
  }

  async function subir() {
    if (!archivo) return;
    setSubiendo(true);
    setErrorSubida(null);
    try {
      const nueva = await servicio.subirCarta(restaurante.id, archivo);
      setSubida(nueva);
      alCambiarImportacion(nueva);
    } catch (error) {
      setErrorSubida(
        error instanceof ErrorApi ? error.message : 'No pudimos subir tu carta. Inténtalo de nuevo.',
      );
    } finally {
      setSubiendo(false);
    }
  }

  async function reintentar() {
    if (!subida) return;
    setReintentando(true);
    setErrorReintento(null);
    try {
      const nueva = await servicio.reintentarImportacion(restaurante.id, subida.id);
      setSubida(nueva);
      alCambiarImportacion(nueva);
      sondeo.reiniciar(nueva);
    } catch (error) {
      setErrorReintento(
        error instanceof ErrorApi ? error.message : 'No pudimos reintentar. Inténtalo de nuevo.',
      );
    } finally {
      setReintentando(false);
    }
  }

  function empezarDeNuevo() {
    setSubida(null);
    setArchivo(null);
    setErrorSubida(null);
    setErrorReintento(null);
    alCambiarImportacion(null);
  }

  // ── Listo: el borrador espera su revisión ───────────────────────────────────────────────
  if (subida && sondeo.importacion?.estado === 'listo' && sondeo.importacion.resultado) {
    const borrador = aBorrador(sondeo.importacion.resultado);
    const platillos = contarPlatillos(borrador);
    return (
      <section className={c.paso} aria-labelledby="titulo-carta">
        <header className={c.encabezadoPaso}>
          <h2 id="titulo-carta" className={c.tituloPaso}>
            ¡Ya leímos tu carta!
          </h2>
          <p className={c.textoPaso}>
            Encontramos {platillos} {platillos === 1 ? 'platillo' : 'platillos'} en {borrador.categorias.length}{' '}
            {borrador.categorias.length === 1 ? 'categoría' : 'categorías'}. Todavía no es tu menú: revísalo y
            corrígelo antes de confirmar.
          </p>
        </header>
        <div className={c.acciones}>
          <Boton ancho onClick={() => alTenerBorrador(borrador, sondeo.importacion!)}>
            Revisar mi carta
          </Boton>
        </div>
      </section>
    );
  }

  // ── Fallida: se explica la causa y se puede reintentar o capturar a mano (AC-25.4) ───────
  if (subida && (sondeo.importacion?.estado === 'fallido' || sondeo.error)) {
    const causa =
      sondeo.importacion?.error_mensaje ?? sondeo.error ?? 'No pudimos leer tu carta.';
    return (
      <section className={c.paso} aria-labelledby="titulo-carta">
        <header className={c.encabezadoPaso}>
          <h2 id="titulo-carta" className={c.tituloPaso}>
            No pudimos leer tu carta
          </h2>
          <p className={c.mensajeError} role="alert">
            {causa}
          </p>
        </header>
        {errorReintento && (
          <p className={c.mensajeError} role="alert">
            {errorReintento}
          </p>
        )}
        <div className={c.acciones}>
          {sondeo.importacion?.estado === 'fallido' && (
            <Boton ancho cargando={reintentando} onClick={() => void reintentar()}>
              Reintentar
            </Boton>
          )}
          <Boton ancho variante="secundario" onClick={empezarDeNuevo}>
            Subir otro archivo
          </Boton>
          <Boton ancho variante="fantasma" onClick={alCapturarAMano}>
            Capturar mis platillos a mano
          </Boton>
        </div>
      </section>
    );
  }

  // ── Leyendo: progreso con sondeo ──────────────────────────────────────────────────────────
  if (subida) {
    return (
      <section className={c.paso} aria-labelledby="titulo-carta">
        <header className={c.encabezadoPaso}>
          <h2 id="titulo-carta" className={c.tituloPaso}>
            Estamos leyendo tu carta
          </h2>
          <p className={c.textoPaso}>Puedes dejar esta pantalla abierta; avisamos en cuanto esté lista.</p>
        </header>
        <div className={c.progreso} role="status">
          <div className={e.espera} aria-hidden="true" />
          <span className={c.srSolo}>Leyendo tu carta…</span>
          <p className={c.mensajeProgreso} aria-hidden="true">
            {mensaje}
          </p>
        </div>
        {sondeo.sinRed && (
          <p className={c.aviso} role="status">
            Perdimos la conexión un momento. Seguimos intentando; tu carta no se pierde.
          </p>
        )}
        {sondeo.lento && !sondeo.agotado && (
          <div className={c.aviso} role="status">
            <p>Está tardando más de lo normal. Puedes seguir esperando o capturar tus platillos a mano.</p>
            <Boton variante="secundario" compacto onClick={alCapturarAMano}>
              Capturar a mano
            </Boton>
          </div>
        )}
        {sondeo.agotado && (
          <div className={c.aviso} role="alert">
            <p>Dejamos de revisar porque ya pasó mucho tiempo. Tu carta puede seguir en proceso.</p>
            <div className={c.fila}>
              <Boton compacto onClick={sondeo.reanudar}>
                Seguir esperando
              </Boton>
              <Boton variante="secundario" compacto onClick={alCapturarAMano}>
                Capturar a mano
              </Boton>
            </div>
          </div>
        )}
      </section>
    );
  }

  // ── Elegir y subir ────────────────────────────────────────────────────────────────────────
  return (
    <section className={c.paso} aria-labelledby="titulo-carta">
      <header className={c.encabezadoPaso}>
        <h2 id="titulo-carta" className={c.tituloPaso}>
          Sube tu carta
        </h2>
        <p className={c.textoPaso}>
          Un PDF o una foto nítida de tu carta. Nosotros la leemos y tú revisas todo antes de publicar.
        </p>
      </header>
      <div
        className={[c.zona, arrastrando ? c.zonaActiva : ''].filter(Boolean).join(' ')}
        onDragOver={(ev) => {
          ev.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={alSoltar}
      >
        <input
          ref={entrada}
          id="archivo-carta"
          className={c.srSolo}
          type="file"
          accept={ACEPTAR}
          onChange={alElegir}
        />
        <label htmlFor="archivo-carta" className={c.botonArchivo}>
          {archivo ? 'Cambiar archivo' : 'Elegir archivo'}
        </label>
        {archivo ? (
          <p className={c.archivoElegido}>
            <strong>{archivo.name}</strong> · {pesoLegible(archivo.size)}
          </p>
        ) : (
          <p className={c.ayuda}>PDF, JPG o PNG · hasta 20 MB</p>
        )}
      </div>
      {errorArchivo && (
        <p className={c.mensajeError} role="alert">
          {errorArchivo}
        </p>
      )}
      {errorSubida && (
        <p className={c.mensajeError} role="alert">
          {errorSubida}
        </p>
      )}
      <div className={c.acciones}>
        <Boton ancho disabled={!archivo} cargando={subiendo} onClick={() => void subir()}>
          Subir y leer mi carta
        </Boton>
        <Boton ancho variante="fantasma" onClick={alCapturarAMano}>
          Prefiero capturarla a mano
        </Boton>
      </div>
    </section>
  );
}
