import { memo, useEffect, useMemo, useRef, useState } from 'react';

import { Boton, Chip, Ilustracion } from '../../compartido/componentes';
import { Pantalla, estilosPantalla as e } from '../../compartido/pantalla/Pantalla';
import { analiticaDelComensal, type Analitica } from '../analitica/cola';
import { PantallaError } from '../entrada/PantallaError';
import { useFocoEnTitulo } from '../entrada/useFocoEnTitulo';
import { AVISO_ALERGENOS } from '../menu/avisos';
import { nombreDeClave } from '../menu/filtros';
import { urlDeFotoSegura } from '../menu/ImagenPlatillo';
import { formatearPrecio } from '../menu/precio';
import estilos from './Platillo.module.css';
import type { ServicioPlatillo } from './servicioPlatillo';
import { usePlatillo, type AvisoDetalle, type OpcionesPlatillo } from './usePlatillo';

type PlatilloVisto = NonNullable<OpcionesPlatillo['enMemoria']>;

export interface PropsPlatilloVista {
  /** El `:id` de la ruta. */
  id: string;
  servicio: ServicioPlatillo;
  /** Lo que el menú ya trae de este platillo (si se abrió desde ahí): se pinta al instante. */
  enMemoria?: PlatilloVisto | null;
  analitica?: Analitica;
  /** «Volver al menú»: el botón de la pantalla. */
  onVolver: () => void;
}

/**
 * `/m/:codigo/platillo/:id`: el detalle de un platillo. Cada apertura es una instancia (la ruta la monta
 * con la `key` de la navegación): un `dish_view` por instancia, sólo cuando se sabe que el platillo
 * existe, y nunca por render ni por el doble efecto de StrictMode.
 */
export function PlatilloVista({ id, servicio, enMemoria = null, analitica, onVolver }: PropsPlatilloVista) {
  const { estado, reintentar } = usePlatillo({ id, servicio, enMemoria });
  const cola = useMemo(() => analitica ?? analiticaDelComensal(), [analitica]);
  const registrado = useRef(false);
  const existe = estado.fase === 'listo' && estado.confirmado;
  useEffect(() => {
    if (!existe || registrado.current) return;
    registrado.current = true;
    cola.registrar('dish_view', id);
  }, [existe, cola, id]);

  if (estado.fase === 'cargando') return <EsqueletoPlatillo onVolver={onVolver} />;
  if (estado.fase === 'no_existe') return <PlatilloNoExiste onVolver={onVolver} />;
  if (estado.fase === 'error') {
    return (
      <PantallaError clase={estado.clase} reintentarEn={estado.reintentarEn} onReintentar={reintentar}>
        <Boton variante="secundario" onClick={onVolver}>
          Volver al menú
        </Boton>
      </PantallaError>
    );
  }
  return <DetalleListo platillo={estado.platillo} aviso={estado.aviso} onReintentar={reintentar} onVolver={onVolver} />;
}

function BotonVolver({ onVolver }: { onVolver: () => void }) {
  return (
    <Boton variante="secundario" compacto onClick={onVolver} aria-label="Volver al menú">
      <span aria-hidden="true">← </span>Menú
    </Boton>
  );
}

function EsqueletoPlatillo({ onVolver }: { onVolver: () => void }) {
  return (
    <Pantalla className={estilos.detalle}>
      <div className={estilos.barra}>
        <BotonVolver onVolver={onVolver} />
      </div>
      <div className={estilos.esqueleto} role="status" aria-live="polite">
        <span className={estilos.soloLectores}>Preparando el platillo…</span>
        <div className={estilos.contenido} aria-hidden="true">
          {/* El mismo marco 4:3 que la foto real: nada se mueve cuando llega. */}
          <div className={`${estilos.foto} ${estilos.bloque}`} />
          <div className={estilos.texto}>
            <div className={`${estilos.bloque} ${estilos.bloqueTitulo}`} />
            <div className={`${estilos.bloque} ${estilos.bloqueLinea}`} />
            <div className={`${estilos.bloque} ${estilos.bloqueLinea}`} />
          </div>
        </div>
      </div>
    </Pantalla>
  );
}

function PlatilloNoExiste({ onVolver }: { onVolver: () => void }) {
  const titulo = useFocoEnTitulo();
  return (
    <Pantalla>
      <div className={e.centrado} role="alert">
        <div className={e.ilustracion} aria-hidden="true">
          –
        </div>
        <h1 ref={titulo} tabIndex={-1} className={`${e.titulo} ${estilos.titulo}`}>
          Este platillo ya no está en el menú
        </h1>
        <p className={e.texto}>Puede que el restaurante lo haya quitado. Vuelve al menú para ver lo que hay hoy.</p>
        {/* Sin «Reintentar»: pedirlo otra vez no lo trae de vuelta. */}
        <Boton onClick={onVolver}>Volver al menú</Boton>
      </div>
    </Pantalla>
  );
}

/** La foto grande (4:3, con el tamaño reservado) o, sin ella o si no carga, la ilustración de la categoría. */
const FotoDetalle = memo(function FotoDetalle({ platillo }: { platillo: PlatilloVisto }) {
  const foto = platillo.imagen_tipo === 'foto' ? urlDeFotoSegura(platillo.foto_detalle_url) : null;
  // Se recuerda cuál foto falló: otra URL merece otro intento.
  const [rota, setRota] = useState<string | null>(null);
  const conFoto = foto !== null && rota !== foto;
  return (
    <div className={estilos.foto} data-con-foto={conFoto ? 'si' : 'no'} data-agotado={platillo.disponible ? 'no' : 'si'}>
      {conFoto ? (
        <img src={foto} alt={`Foto de ${platillo.nombre}`} width={800} height={600} decoding="async" className={estilos.imagen} referrerPolicy="no-referrer" onError={() => setRota(foto)} />
      ) : (
        <span className={estilos.ilustracion}>
          <Ilustracion clave={platillo.ilustracion_clave} />
        </span>
      )}
    </div>
  );
});

function Picante({ nivel }: { nivel: number }) {
  const total = Math.min(Math.max(Math.round(nivel), 0), 5);
  return (
    <span className={estilos.picante}>
      <span className={estilos.puntos} aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`${estilos.punto} ${n <= total ? estilos.puntoActivo : ''}`} />
        ))}
      </span>
      <span>Picante {total} de 5</span>
    </span>
  );
}

function AvisoReintento({ aviso, onReintentar }: { aviso: AvisoDetalle; onReintentar: () => void }) {
  const [falta, setFalta] = useState(aviso.clase === 'limite' ? Math.min(Math.ceil(aviso.reintentarEn ?? 5), 60) : 0);
  useEffect(() => {
    if (falta <= 0) return;
    const t = setTimeout(() => setFalta((f) => f - 1), 1000);
    return () => clearTimeout(t);
  }, [falta]);
  const texto =
    aviso.clase === 'sin_conexion'
      ? 'Sin conexión. Te mostramos lo que ya teníamos y lo intentamos de nuevo en cuanto vuelva.'
      : aviso.clase === 'limite'
        ? 'Vamos un poco rápido. Espera unos segundos para actualizar el platillo.'
        : 'No pudimos actualizar el platillo. Te mostramos lo que ya teníamos.';
  return (
    <div className={estilos.avisoRed} role="status">
      <p>{texto}</p>
      <Boton variante="secundario" compacto disabled={falta > 0} onClick={onReintentar}>
        {falta > 0 ? `Reintentar (${falta} s)` : 'Reintentar'}
      </Boton>
    </div>
  );
}

function DetalleListo({ platillo, aviso, onReintentar, onVolver }: { platillo: PlatilloVisto; aviso: AvisoDetalle | null; onReintentar: () => void; onVolver: () => void }) {
  const titulo = useFocoEnTitulo();
  // Al abrir, la página empieza arriba (la posición del menú es de la lista, no del detalle).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const agotado = !platillo.disponible;
  const alergenos = platillo.alergenos.map(nombreDeClave);
  return (
    <Pantalla className={estilos.detalle}>
      <div className={estilos.barra}>
        <BotonVolver onVolver={onVolver} />
      </div>

      {aviso && <AvisoReintento aviso={aviso} onReintentar={onReintentar} />}

      <article className={estilos.contenido} aria-labelledby="titulo-platillo">
        <FotoDetalle platillo={platillo} />
        <div className={estilos.texto}>
          {platillo.categoria_nombre && <p className={e.sobretitulo}>{platillo.categoria_nombre}</p>}
          <h1 id="titulo-platillo" ref={titulo} tabIndex={-1} className={estilos.nombre} data-agotado={agotado ? 'si' : 'no'}>
            {platillo.nombre}
          </h1>
          <div className={estilos.precioFila}>
            <span className={estilos.precio} data-agotado={agotado ? 'si' : 'no'}>
              {formatearPrecio(platillo.precio)}
            </span>
            {agotado && <Chip>Agotado hoy</Chip>}
            {platillo.etiquetas.map((t) => (
              <Chip key={t} tono="exito">
                {nombreDeClave(t)}
              </Chip>
            ))}
          </div>

          {platillo.descripcion && <p className={estilos.descripcion}>{platillo.descripcion}</p>}

          {(platillo.nivel_picante > 0 || platillo.calorias != null) && (
            <ul className={estilos.datos}>
              {platillo.nivel_picante > 0 && (
                <li>
                  <Picante nivel={platillo.nivel_picante} />
                </li>
              )}
              {platillo.calorias != null && <li>{platillo.calorias} kcal</li>}
            </ul>
          )}

          <section className={estilos.alergenos} aria-label="Alérgenos">
            <p className={estilos.contiene}>{alergenos.length > 0 ? `Contiene: ${alergenos.join(', ')}` : 'El restaurante no declaró alérgenos en este platillo.'}</p>
            {/* AC-05.3: siempre a la vista, sin forma de cerrarlo. */}
            <p className={estilos.aviso}>{AVISO_ALERGENOS}</p>
          </section>

          {agotado ? (
            <p className={estilos.agotadoAviso}>Hoy no se puede pedir este platillo.</p>
          ) : (
            // La orden llega con la Fase 3: mientras, el botón se ve y no hace nada.
            <Boton ancho disabled className={estilos.agregar}>
              Agregar a mi orden · Pronto
            </Boton>
          )}
        </div>
      </article>
    </Pantalla>
  );
}
