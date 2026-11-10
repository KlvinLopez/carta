import { useMemo, useState } from 'react';

import { Avatar, Boton, Chip } from '../../compartido/componentes';
import { estilosPantalla as e } from '../../compartido/pantalla/Pantalla';
import { useSesion } from '../acceso/Sesion';
import { EstadoVacio } from '../armazon/EstadoVacio';
import { useRestauranteActivo, type Restaurante } from '../armazon/RestauranteActivo';
import c from '../gestion/Gestion.module.css';
import { LimiteGestion } from '../gestion/LimiteGestion';
import { HojaAlta, HojaBajaPersona, HojaEditar, HojaPin } from './HojaPersona';
import { crearServicioPersonal, TOPES_PERSONAL, type Personal, type ServicioPersonal } from './servicio';
import { usePersonal } from './usePersonal';

type Vista = 'activos' | 'bajas';
type Hoja = { tipo: 'alta' } | { tipo: 'editar' | 'pin' | 'baja'; id: string };

const ROLES = { capitan: 'Capitán', mesero: 'Mesero' } as const;

function FilaPersona({
  persona,
  ocupada,
  alEditar,
  alPin,
  alBaja,
  alReactivar,
}: {
  persona: Personal;
  ocupada: boolean;
  alEditar: (p: Personal) => void;
  alPin: (p: Personal) => void;
  alBaja: (p: Personal) => void;
  alReactivar: (p: Personal) => void;
}) {
  return (
    <li className={`${c.tarjeta} ${persona.activo ? '' : c.apagada}`} aria-busy={ocupada || undefined}>
      <div className={c.principal}>
        <Avatar nombre={persona.nombre} />
        <div className={c.cuerpo}>
          <h3 className={c.nombre}>{persona.nombre}</h3>
          <div className={c.etiquetas}>
            <Chip tono={persona.rol === 'capitan' ? 'dorado' : 'neutro'}>{ROLES[persona.rol]}</Chip>
            {!persona.activo && <Chip>Dado de baja</Chip>}
          </div>
        </div>
      </div>
      <div className={c.acciones}>
        {persona.activo ? (
          <>
            <Boton variante="secundario" compacto disabled={ocupada} onClick={() => alEditar(persona)} aria-label={`Editar a ${persona.nombre}`}>
              Editar
            </Boton>
            <Boton variante="secundario" compacto disabled={ocupada} onClick={() => alPin(persona)} aria-label={`Cambiar el PIN de ${persona.nombre}`}>
              Cambiar PIN
            </Boton>
            <Boton variante="fantasma" compacto disabled={ocupada} onClick={() => alBaja(persona)} aria-label={`Dar de baja a ${persona.nombre}`}>
              Dar de baja
            </Boton>
          </>
        ) : (
          <>
            <Boton compacto disabled={ocupada} onClick={() => alReactivar(persona)} aria-label={`Reactivar a ${persona.nombre}`}>
              Reactivar
            </Boton>
            <Boton variante="secundario" compacto disabled={ocupada} onClick={() => alPin(persona)} aria-label={`Cambiar el PIN de ${persona.nombre}`}>
              Cambiar PIN
            </Boton>
          </>
        )}
      </div>
    </li>
  );
}

export function PantallaPersonalConServicio({
  servicio,
  restaurante,
}: {
  servicio: ServicioPersonal;
  restaurante: Restaurante;
}) {
  const p = usePersonal(servicio, restaurante.id);
  const [vista, setVista] = useState<Vista>('activos');
  const [hoja, setHoja] = useState<Hoja | null>(null);
  const [confirmacion, setConfirmacion] = useState<string | null>(null);

  const activos = useMemo(() => p.personal.filter((x) => x.activo), [p.personal]);
  const bajas = useMemo(() => p.personal.filter((x) => !x.activo), [p.personal]);
  const capitanes = useMemo(() => activos.filter((x) => x.rol === 'capitan'), [activos]);
  const meseros = useMemo(() => activos.filter((x) => x.rol === 'mesero'), [activos]);
  const enHoja = hoja && hoja.tipo !== 'alta' ? (p.personal.find((x) => x.id === hoja.id) ?? null) : null;

  const encabezado = (
    <header className={e.encabezado}>
      <p className={e.sobretitulo}>{restaurante.nombre}</p>
      <h1 className={e.titulo}>Personal</h1>
    </header>
  );

  if (p.estado.tipo === 'cargando') {
    return (
      <>
        {encabezado}
        <div className={e.centrado} role="status" aria-live="polite">
          <div className={e.espera} aria-hidden="true" />
          <p className={e.texto}>Cargando a tu equipo…</p>
        </div>
      </>
    );
  }
  if (p.estado.tipo === 'error') {
    return (
      <>
        {encabezado}
        <EstadoVacio glifo="!" titulo="No pudimos cargar a tu equipo" accion={<Boton onClick={p.reintentar}>Reintentar</Boton>}>
          {p.estado.mensaje}
        </EstadoVacio>
      </>
    );
  }

  const acciones = {
    alEditar: (x: Personal) => setHoja({ tipo: 'editar', id: x.id }),
    alPin: (x: Personal) => setHoja({ tipo: 'pin', id: x.id }),
    alBaja: (x: Personal) => setHoja({ tipo: 'baja', id: x.id }),
    alReactivar: (x: Personal) => void p.ponerActivo(x, true),
  };
  const grupo = (titulo: string, lista: Personal[]) =>
    lista.length > 0 && (
      <section aria-label={titulo}>
        <h2 className={c.subtitulo}>
          {titulo} ({lista.length})
        </h2>
        <ul className={c.lista}>
          {lista.map((x) => (
            <FilaPersona key={x.id} persona={x} ocupada={p.pendientes.has(x.id)} {...acciones} />
          ))}
        </ul>
      </section>
    );

  return (
    <>
      {encabezado}
      {p.personal.length === 0 ? (
        <EstadoVacio
          glifo="P"
          titulo="Aún no hay personal"
          accion={<Boton onClick={() => setHoja({ tipo: 'alta' })}>Agregar persona</Boton>}
        >
          Da de alta a tu equipo con un PIN para que reciba las comandas.
        </EstadoVacio>
      ) : (
        <div className={c.pantalla}>
          <div className={c.barra}>
            <p className={c.resumen}>
              {activos.length} de {TOPES_PERSONAL.activos} activas
            </p>
            <Boton compacto onClick={() => setHoja({ tipo: 'alta' })}>
              Agregar persona
            </Boton>
          </div>

          <div className={c.vistas} role="group" aria-label="Qué personas ver">
            <Chip activo={vista === 'activos'} onClick={() => setVista('activos')}>
              Activos ({activos.length})
            </Chip>
            <Chip activo={vista === 'bajas'} onClick={() => setVista('bajas')}>
              Dados de baja ({bajas.length})
            </Chip>
          </div>

          {confirmacion && (
            <div className={c.exito} role="status">
              <span>{confirmacion}</span>
              <button type="button" className={c.cerrarAviso} onClick={() => setConfirmacion(null)} aria-label="Cerrar aviso">
                <span aria-hidden="true">×</span>
              </button>
            </div>
          )}
          {p.aviso && (
            <div className={c.aviso} role="alert">
              <span>{p.aviso}</span>
              <button type="button" className={c.cerrarAviso} onClick={p.descartarAviso} aria-label="Cerrar aviso">
                <span aria-hidden="true">×</span>
              </button>
            </div>
          )}

          {vista === 'activos' ? (
            activos.length === 0 ? (
              <p className={c.vacio} role="status">
                No hay personal activo. Agrega a alguien o reactiva a una persona desde «Dados de baja».
              </p>
            ) : (
              <>
                {grupo('Capitanes', capitanes)}
                {grupo('Meseros', meseros)}
              </>
            )
          ) : bajas.length === 0 ? (
            <p className={c.vacio} role="status">
              No hay personal dado de baja.
            </p>
          ) : (
            <ul className={c.lista} aria-label="Personal dado de baja">
              {bajas.map((x) => (
                <FilaPersona key={x.id} persona={x} ocupada={p.pendientes.has(x.id)} {...acciones} />
              ))}
            </ul>
          )}
        </div>
      )}

      {hoja?.tipo === 'alta' && <HojaAlta alCrear={p.crear} alCerrar={() => setHoja(null)} />}
      {hoja?.tipo === 'editar' && enHoja && (
        <HojaEditar persona={enHoja} alGuardar={(cambios) => p.cambiar(enHoja.id, cambios)} alCerrar={() => setHoja(null)} />
      )}
      {hoja?.tipo === 'pin' && enHoja && (
        <HojaPin
          persona={enHoja}
          alReasignar={async (pin) => {
            await p.reasignarPin(enHoja.id, pin);
            setConfirmacion(`Listo: ${enHoja.nombre} entra con su PIN nuevo. Su sesión anterior se cerró.`);
          }}
          alCerrar={() => setHoja(null)}
        />
      )}
      {hoja?.tipo === 'baja' && enHoja && (
        <HojaBajaPersona
          persona={enHoja}
          alCerrar={() => setHoja(null)}
          alConfirmar={() => {
            void p.ponerActivo(enHoja, false);
            setHoja(null);
          }}
        />
      )}
    </>
  );
}

/** Pantalla Personal del panel (`/admin/personal`). */
export default function PantallaPersonal() {
  const { api } = useSesion();
  const { activo } = useRestauranteActivo();
  const servicio = useMemo(() => crearServicioPersonal(api), [api]);
  if (!activo) return null;
  return (
    <LimiteGestion key={activo.id} nombre="tu equipo">
      <PantallaPersonalConServicio servicio={servicio} restaurante={activo} />
    </LimiteGestion>
  );
}
