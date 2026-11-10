import { useMemo, useState } from 'react';

import { Boton, Chip } from '../../compartido/componentes';
import { estilosPantalla as e } from '../../compartido/pantalla/Pantalla';
import { useSesion } from '../acceso/Sesion';
import { EstadoVacio } from '../armazon/EstadoVacio';
import { useRestauranteActivo, type Restaurante } from '../armazon/RestauranteActivo';
import { guardarComoArchivo } from '../alta/descarga';
import { ErrorApi } from '../../compartido/http';
import { LimiteGestion } from '../gestion/LimiteGestion';
import c from '../gestion/Gestion.module.css';
import { mensajeDe } from '../gestion/mensajes';
import { HojaAgregarMesas } from './HojaAgregarMesas';
import { HojaRegenerar } from './HojaRegenerar';
import { crearServicioMesas, type Mesa, type ServicioMesas } from './servicio';
import { useMesas } from './useMesas';

/** Mensaje de la descarga del PDF: 409 y 503 tienen un texto que dice qué hacer (T-1.5). */
export function mensajeDeDescarga(error: unknown): string {
  if (error instanceof ErrorApi) {
    if (error.codigo === 'CODIGOS_CAMBIADOS') {
      return 'Se regeneró un código mientras preparábamos el PDF. Vuelve a pedirlo.';
    }
    if (error.estado === 503) {
      return 'Estamos preparando otro PDF. Inténtalo de nuevo en un momento.';
    }
  }
  return mensajeDe(error, 'No pudimos descargar tus QR. Inténtalo de nuevo.');
}

function TarjetaMesa({
  mesa,
  regenerando,
  bloqueada,
  alRegenerar,
}: {
  mesa: Mesa;
  regenerando: boolean;
  bloqueada: boolean;
  alRegenerar: (mesa: Mesa) => void;
}) {
  return (
    <li className={`${c.tarjeta} ${mesa.activa ? '' : c.apagada}`}>
      <div className={c.cuerpo}>
        <h3 className={c.nombre}>Mesa {mesa.numero}</h3>
        <div className={c.etiquetas}>
          <Chip>
            {mesa.capacidad} {mesa.capacidad === 1 ? 'lugar' : 'lugares'}
          </Chip>
          <Chip tono={mesa.activa ? 'exito' : 'neutro'}>{mesa.activa ? 'Activa' : 'Dada de baja'}</Chip>
        </div>
      </div>
      {mesa.activa && (
        <div className={c.acciones}>
          <Boton
            variante="secundario"
            compacto
            cargando={regenerando}
            disabled={bloqueada}
            onClick={() => alRegenerar(mesa)}
            aria-label={`Regenerar código de la mesa ${mesa.numero}`}
          >
            Regenerar código
          </Boton>
        </div>
      )}
    </li>
  );
}

export function PantallaMesasConServicio({ servicio, restaurante }: { servicio: ServicioMesas; restaurante: Restaurante }) {
  const m = useMesas(servicio, restaurante.id);
  const [hoja, setHoja] = useState<{ tipo: 'agregar' } | { tipo: 'regenerar'; id: string } | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  const activas = useMemo(() => m.mesas.filter((x) => x.activa), [m.mesas]);
  const bajas = useMemo(() => m.mesas.filter((x) => !x.activa), [m.mesas]);
  const aRegenerar = hoja?.tipo === 'regenerar' ? (m.mesas.find((x) => x.id === hoja.id) ?? null) : null;
  const hayRegeneracion = m.regenerando.size > 0;

  const encabezado = (
    <header className={e.encabezado}>
      <p className={e.sobretitulo}>{restaurante.nombre}</p>
      <h1 className={e.titulo}>Mesas</h1>
    </header>
  );

  if (m.estado.tipo === 'cargando') {
    return (
      <>
        {encabezado}
        <div className={e.centrado} role="status" aria-live="polite">
          <div className={e.espera} aria-hidden="true" />
          <p className={e.texto}>Cargando tus mesas…</p>
        </div>
      </>
    );
  }
  if (m.estado.tipo === 'error') {
    return (
      <>
        {encabezado}
        <EstadoVacio glifo="!" titulo="No pudimos cargar tus mesas" accion={<Boton onClick={m.reintentar}>Reintentar</Boton>}>
          {m.estado.mensaje}
        </EstadoVacio>
      </>
    );
  }

  async function descargar() {
    setDescargando(true);
    setErrorDescarga(null);
    try {
      guardarComoArchivo(await servicio.descargarQr(restaurante.id), 'qr-mesas.pdf');
    } catch (error) {
      setErrorDescarga(mensajeDeDescarga(error));
    } finally {
      setDescargando(false);
    }
  }

  const sinMesas = m.mesas.length === 0;
  return (
    <>
      {encabezado}
      {sinMesas ? (
        <EstadoVacio
          glifo="Q"
          titulo="Aún no hay mesas"
          accion={<Boton onClick={() => setHoja({ tipo: 'agregar' })}>Agregar mesas</Boton>}
        >
          Crea tus mesas y descarga los QR listos para imprimir.
        </EstadoVacio>
      ) : (
        <div className={c.pantalla}>
          <div className={c.barra}>
            <p className={c.resumen}>
              {activas.length} {activas.length === 1 ? 'mesa activa' : 'mesas activas'}
            </p>
            <Boton compacto onClick={() => setHoja({ tipo: 'agregar' })}>
              Agregar mesas
            </Boton>
            <Boton
              compacto
              variante="secundario"
              cargando={descargando}
              disabled={activas.length === 0 || hayRegeneracion}
              onClick={() => void descargar()}
            >
              Descargar QR (PDF)
            </Boton>
          </div>

          {errorDescarga && (
            <div className={c.aviso} role="alert">
              <span>{errorDescarga}</span>
              <button type="button" className={c.cerrarAviso} onClick={() => setErrorDescarga(null)} aria-label="Cerrar aviso">
                <span aria-hidden="true">×</span>
              </button>
            </div>
          )}

          {m.codigoNuevo && !hayRegeneracion && (
            <div className={c.nuevoCodigo} role="status">
              <span>
                Código nuevo para la mesa {m.codigoNuevo.numero}. El QR impreso anterior ya no sirve: descarga el PDF para
                imprimir el nuevo.
              </span>
              <span className={c.url}>{m.codigoNuevo.url}</span>
              <Boton variante="fantasma" compacto onClick={m.descartarCodigoNuevo}>
                Entendido
              </Boton>
            </div>
          )}

          <ul className={c.rejilla} aria-label="Mesas activas">
            {activas.map((mesa) => (
              <TarjetaMesa
                key={mesa.id}
                mesa={mesa}
                regenerando={m.regenerando.has(mesa.id)}
                bloqueada={m.regenerando.has(mesa.id)}
                alRegenerar={(x) => setHoja({ tipo: 'regenerar', id: x.id })}
              />
            ))}
          </ul>
          {activas.length === 0 && <p className={c.vacio}>No tienes mesas activas. Agrega algunas para generar sus QR.</p>}

          {bajas.length > 0 && (
            <>
              <h2 className={c.subtitulo}>Dadas de baja</h2>
              <ul className={c.rejilla} aria-label="Mesas dadas de baja">
                {bajas.map((mesa) => (
                  <TarjetaMesa key={mesa.id} mesa={mesa} regenerando={false} bloqueada alRegenerar={() => undefined} />
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {hoja?.tipo === 'agregar' && (
        <HojaAgregarMesas activas={activas.length} alCrear={m.crear} alCerrar={() => setHoja(null)} />
      )}
      {aRegenerar && (
        <HojaRegenerar
          numero={aRegenerar.numero}
          alConfirmar={async () => {
            try {
              await m.regenerar(aRegenerar.id);
            } catch (error) {
              if (error instanceof ErrorApi && error.codigo === 'MESA_INACTIVA') void m.recargar();
              throw error;
            }
          }}
          alCerrar={() => setHoja(null)}
        />
      )}
    </>
  );
}

/** Pantalla Mesas del panel (`/admin/mesas`). */
export default function PantallaMesas() {
  const { api } = useSesion();
  const { activo } = useRestauranteActivo();
  const servicio = useMemo(() => crearServicioMesas(api), [api]);
  if (!activo) return null;
  return (
    <LimiteGestion key={activo.id} nombre="tus mesas">
      <PantallaMesasConServicio servicio={servicio} restaurante={activo} />
    </LimiteGestion>
  );
}
