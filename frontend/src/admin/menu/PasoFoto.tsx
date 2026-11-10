import { useEffect, useId, useRef, useState } from 'react';

import { Boton } from '../../compartido/componentes';
import { ErrorApi } from '../../compartido/http';
import { dibujarRecorte, esFotoValida, exportarRecorte, leerImagen, nombreRecortado, type ImagenLeida } from './foto';
import c from './Menu.module.css';
import { TOPES_MENU } from './tipos';

const LADO_VISTA = 560;

/** Las tres ideas de la guía de captura: encuadre, luz y fondo (ilustraciones en línea, sin imágenes). */
function Guia() {
  return (
    <ol className={c.guia} aria-label="Guía para una buena foto">
      <li className={c.guiaPaso}>
        <svg viewBox="0 0 96 96" className={c.guiaDibujo} aria-hidden="true" focusable="false">
          <rect x="10" y="10" width="76" height="76" rx="14" className={c.guiaMarco} />
          <path d="M10 28V18a8 8 0 0 1 8-8h10M68 10h10a8 8 0 0 1 8 8v10M86 68v10a8 8 0 0 1-8 8H68M28 86H18a8 8 0 0 1-8-8V68" className={c.guiaEsquinas} />
          <circle cx="48" cy="48" r="26" className={c.guiaPlato} />
          <circle cx="48" cy="48" r="16" className={c.guiaComida} />
        </svg>
        <span className={c.guiaTitulo}>Encuadre</span>
        <span className={c.guiaTexto}>Cuadrada y de cerca: el platillo llena casi todo el cuadro, visto desde arriba.</span>
      </li>
      <li className={c.guiaPaso}>
        <svg viewBox="0 0 96 96" className={c.guiaDibujo} aria-hidden="true" focusable="false">
          <rect x="8" y="12" width="34" height="44" rx="6" className={c.guiaMarco} />
          <path d="M25 12v44M8 34h34" className={c.guiaEsquinas} />
          <path d="M48 26l30 22M48 40l30 12M48 54l30 2" className={c.guiaRayo} />
          <ellipse cx="66" cy="72" rx="24" ry="9" className={c.guiaPlato} />
        </svg>
        <span className={c.guiaTitulo}>Luz</span>
        <span className={c.guiaTexto}>Junto a una ventana y sin flash: la luz natural la hace ver más rica.</span>
      </li>
      <li className={c.guiaPaso}>
        <svg viewBox="0 0 96 96" className={c.guiaDibujo} aria-hidden="true" focusable="false">
          <rect x="6" y="26" width="84" height="56" rx="10" className={c.guiaMesa} />
          <circle cx="48" cy="54" r="20" className={c.guiaPlato} />
          <circle cx="48" cy="54" r="12" className={c.guiaComida} />
          <path d="M76 40l8-8M80 46l8-8" className={c.guiaTacha} />
        </svg>
        <span className={c.guiaTitulo}>Fondo</span>
        <span className={c.guiaTexto}>Una mesa lisa y limpia, sin servilletas, vasos ni cubiertos alrededor.</span>
      </li>
    </ol>
  );
}

type Fase =
  | { tipo: 'guia' }
  | { tipo: 'recorte'; archivo: File; imagen: ImagenLeida }
  | { tipo: 'sin-vista'; archivo: File };

/**
 * Subida de foto (US-17): guía de captura → elegir → recorte cuadrado en el navegador (`canvas`, ≤ 2048 px,
 * JPEG) → subir. El recorte evita mandar 15 MB desde el teléfono y deja la foto lista para la miniatura 1:1.
 * Si el navegador no sabe leer el formato (un HEIC en Chrome) el archivo viaja tal cual y lo trata el servidor.
 */
export default function PasoFoto({
  nombre,
  conFoto,
  alSubir,
  alQuitar,
  alVolver,
}: {
  nombre: string;
  conFoto: boolean;
  alSubir: (archivo: Blob, nombreArchivo: string) => Promise<void>;
  alQuitar: () => Promise<void>;
  alVolver: () => void;
}) {
  const idArchivo = useId();
  const idPosicion = useId();
  const [fase, setFase] = useState<Fase>({ tipo: 'guia' });
  const [posicion, setPosicion] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [confirmaQuitar, setConfirmaQuitar] = useState(false);
  const refLienzo = useRef<HTMLCanvasElement>(null);
  const refEntrada = useRef<HTMLInputElement>(null);
  const imagenActual = fase.tipo === 'recorte' ? fase.imagen : null;

  useEffect(() => {
    if (imagenActual && refLienzo.current) dibujarRecorte(refLienzo.current, imagenActual, posicion / 100, LADO_VISTA);
  }, [imagenActual, posicion]);
  // Libera el mapa de bits al salir del recorte.
  useEffect(() => () => imagenActual?.liberar(), [imagenActual]);

  async function alElegir(archivo: File | undefined) {
    if (!archivo) return;
    setError(null);
    if (!esFotoValida(archivo)) {
      setError('Ese archivo no es una foto que podamos usar. Elige un JPG, PNG o HEIC.');
      return;
    }
    const imagen = await leerImagen(archivo);
    if (imagen) {
      setPosicion(50);
      setFase({ tipo: 'recorte', archivo, imagen });
    } else if (archivo.size > TOPES_MENU.fotoMaxBytes) {
      setError('La foto es demasiado grande y tu navegador no puede reducirla. Prueba con una de menos de 15 MB.');
    } else {
      setFase({ tipo: 'sin-vista', archivo });
    }
  }

  async function subir() {
    if (fase.tipo === 'guia') return;
    setError(null);
    setOcupado(true);
    try {
      if (fase.tipo === 'sin-vista') {
        await alSubir(fase.archivo, fase.archivo.name);
      } else {
        const blob = await exportarRecorte(fase.imagen, posicion / 100);
        if (!blob) {
          setError('No pudimos preparar la foto. Prueba con otra.');
          return;
        }
        await alSubir(blob, nombreRecortado(fase.archivo));
      }
      alVolver();
    } catch (fallo) {
      setError(fallo instanceof ErrorApi ? fallo.message : 'No pudimos subir la foto. Inténtalo de nuevo.');
    } finally {
      setOcupado(false);
    }
  }

  async function quitar() {
    setError(null);
    setOcupado(true);
    try {
      await alQuitar();
      alVolver();
    } catch (fallo) {
      setError(fallo instanceof ErrorApi ? fallo.message : 'No pudimos quitar la foto. Inténtalo de nuevo.');
      setConfirmaQuitar(false);
    } finally {
      setOcupado(false);
    }
  }

  const esCuadrada = imagenActual ? imagenActual.ancho === imagenActual.alto : true;

  return (
    <div className={c.pasoFoto}>
      <h3 className={c.subtitulo}>Foto de {nombre}</h3>
      {fase.tipo === 'guia' && <Guia />}

      {fase.tipo === 'recorte' && (
        <div className={c.recorte}>
          <canvas ref={refLienzo} className={c.vistaRecorte} role="img" aria-label="Vista previa de la foto recortada" />
          {!esCuadrada && (
            <div className={c.campoRango}>
              <label htmlFor={idPosicion} className={c.etiquetaRango}>
                Mover el encuadre
              </label>
              <input
                id={idPosicion}
                type="range"
                min={0}
                max={100}
                step={1}
                value={posicion}
                onChange={(ev) => setPosicion(Number(ev.target.value))}
                className={c.rango}
              />
            </div>
          )}
          <p className={c.ayudaFoto}>Se sube cuadrada y reducida; así carga rápido en el teléfono de tus comensales.</p>
        </div>
      )}

      {fase.tipo === 'sin-vista' && (
        <p className={c.ayudaFoto}>
          Tu navegador no puede mostrar «{fase.archivo.name}» aquí, pero la subiremos tal cual y Carta la prepara.
        </p>
      )}

      {error && (
        <p className={c.mensajeError} role="alert">
          {error}
        </p>
      )}

      {confirmaQuitar ? (
        <div className={c.confirmacion} role="group" aria-label="Quitar la foto">
          <p className={c.ayudaFoto}>Volverá la ilustración de la categoría. Puedes subir otra foto cuando quieras.</p>
          <Boton variante="primario" ancho onClick={() => void quitar()} cargando={ocupado}>
            Sí, quitar la foto
          </Boton>
          <Boton variante="fantasma" ancho onClick={() => setConfirmaQuitar(false)} disabled={ocupado}>
            Mejor no
          </Boton>
        </div>
      ) : (
        <div className={c.accionesFoto}>
          {fase.tipo !== 'guia' && (
            <Boton ancho onClick={() => void subir()} cargando={ocupado}>
              Usar esta foto
            </Boton>
          )}
          <input
            ref={refEntrada}
            id={idArchivo}
            type="file"
            accept="image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif"
            className={c.entradaArchivo}
            aria-label="Elegir foto"
            onChange={(ev) => {
              void alElegir(ev.target.files?.[0]);
              ev.target.value = '';
            }}
          />
          <Boton
            variante={fase.tipo === 'guia' ? 'primario' : 'secundario'}
            ancho
            disabled={ocupado}
            onClick={() => refEntrada.current?.click()}
          >
            {fase.tipo === 'guia' ? (conFoto ? 'Elegir otra foto' : 'Elegir o tomar una foto') : 'Elegir otra foto'}
          </Boton>
          {conFoto && fase.tipo === 'guia' && (
            <Boton variante="fantasma" ancho disabled={ocupado} onClick={() => setConfirmaQuitar(true)}>
              Quitar la foto
            </Boton>
          )}
          <Boton variante="fantasma" ancho disabled={ocupado} onClick={alVolver}>
            Volver a los datos
          </Boton>
        </div>
      )}
    </div>
  );
}
