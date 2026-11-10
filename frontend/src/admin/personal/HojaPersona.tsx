import { useState, type FormEvent } from 'react';

import { Boton, Chip } from '../../compartido/componentes';
import { HojaInferior } from '../../compartido/componentes/HojaInferior';
import { Campo } from '../alta/Campo';
import c from '../gestion/Gestion.module.css';
import { errorDeCampo, mensajeDe } from '../gestion/mensajes';
import { ErrorApi } from '../../compartido/http';
import { PIN_VALIDO, soloDigitosAscii } from './pin';
import { TOPES_PERSONAL, type Personal, type RolPersonal } from './servicio';

function SelectorRol({ rol, alCambiar }: { rol: RolPersonal; alCambiar: (rol: RolPersonal) => void }) {
  return (
    <fieldset className={c.rol}>
      <legend className={c.etiqueta}>Rol</legend>
      <div className={c.fila}>
        <Chip activo={rol === 'mesero'} onClick={() => alCambiar('mesero')}>
          Mesero
        </Chip>
        <Chip activo={rol === 'capitan'} onClick={() => alCambiar('capitan')}>
          Capitán
        </Chip>
      </div>
    </fieldset>
  );
}

/** Campo de PIN: sólo dígitos ASCII (los de otras escrituras se convierten), 6 como máximo, sin autocompletar. */
function CampoPin({
  etiqueta,
  valor,
  alCambiar,
  error,
  ayuda,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  error?: string | null;
  ayuda?: string;
}) {
  const [filtrado, setFiltrado] = useState(false);
  return (
    <Campo
      etiqueta={etiqueta}
      type="password"
      inputMode="numeric"
      // `off` lo ignoran los gestores de contraseñas y ofrecerían guardar el PIN del equipo.
      autoComplete="new-password"
      data-lpignore="true"
      data-1p-ignore="true"
      maxLength={12}
      value={valor}
      onChange={(ev) => {
        const digitos = soloDigitosAscii(ev.target.value).slice(0, 6);
        setFiltrado(digitos.length < ev.target.value.length && ev.target.value.length <= 6);
        alCambiar(digitos);
      }}
      error={error}
      ayuda={filtrado ? 'El PIN sólo lleva números.' : ayuda}
    />
  );
}

/**
 * Alta de una persona (AC-26.1): nombre, rol y el PIN que el operador elige. El PIN sale del estado
 * antes de la llamada y nunca vuelve del servidor: si algo falla se pide escribirlo otra vez.
 */
export function HojaAlta({
  alCrear,
  alCerrar,
}: {
  alCrear: (datos: { nombre: string; rol: RolPersonal; pin: string }) => Promise<unknown>;
  alCerrar: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<RolPersonal>('mesero');
  const [pin, setPin] = useState('');
  const [errorNombre, setErrorNombre] = useState<string | null>(null);
  const [errorPin, setErrorPin] = useState<string | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const limpio = nombre.trim();
    const malNombre = limpio ? null : 'Escribe el nombre de la persona.';
    const malPin = PIN_VALIDO.test(pin) ? null : 'El PIN lleva de 4 a 6 números.';
    setErrorNombre(malNombre);
    setErrorPin(malPin);
    setErrorEnvio(null);
    if (malNombre || malPin) return;
    const enviado = pin;
    setPin('');
    setEnviando(true);
    try {
      await alCrear({ nombre: limpio, rol, pin: enviado });
      alCerrar();
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 409) setErrorNombre(e.message);
      else if (errorDeCampo(e, 'nombre')) setErrorNombre(errorDeCampo(e, 'nombre'));
      else if (errorDeCampo(e, 'pin')) setErrorPin(errorDeCampo(e, 'pin'));
      else setErrorEnvio(mensajeDe(e, 'No pudimos dar de alta a esta persona. Inténtalo de nuevo.'));
      // El PIN se borró al enviarlo: se pide escribirlo otra vez donde se escribe.
      setErrorPin((previo) => previo ?? 'Vuelve a escribir el PIN.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <HojaInferior
      abierta
      onCerrar={alCerrar}
      titulo="Agregar persona"
      descripcion="Entra con su PIN. Anótalo y entrégaselo: no podremos mostrártelo de nuevo."
    >
      <form className={c.formulario} onSubmit={(e) => void enviar(e)} noValidate>
        <Campo
          etiqueta="Nombre"
          value={nombre}
          maxLength={TOPES_PERSONAL.nombre}
          onChange={(ev) => setNombre(ev.target.value)}
          autoComplete="off"
          error={errorNombre}
        />
        <SelectorRol rol={rol} alCambiar={setRol} />
        <CampoPin etiqueta="PIN (4 a 6 números)" valor={pin} alCambiar={setPin} error={errorPin} />
        {errorEnvio && (
          <p className={c.error} role="alert">
            {errorEnvio}
          </p>
        )}
        <div className={c.accionesHoja}>
          <Boton type="submit" ancho cargando={enviando}>
            Agregar persona
          </Boton>
          <Boton variante="fantasma" ancho onClick={alCerrar} disabled={enviando}>
            Cancelar
          </Boton>
        </div>
      </form>
    </HojaInferior>
  );
}

/** Edición de nombre y rol: sólo viajan los campos que cambiaron. */
export function HojaEditar({
  persona,
  alGuardar,
  alCerrar,
}: {
  persona: Personal;
  alGuardar: (cambios: { nombre?: string; rol?: RolPersonal }) => Promise<unknown>;
  alCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(persona.nombre);
  const [rol, setRol] = useState<RolPersonal>(persona.rol);
  const [errorNombre, setErrorNombre] = useState<string | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const limpio = nombre.trim();
  const cambios: { nombre?: string; rol?: RolPersonal } = {};
  if (limpio && limpio !== persona.nombre) cambios.nombre = limpio;
  if (rol !== persona.rol) cambios.rol = rol;
  const hayCambios = Object.keys(cambios).length > 0;

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!limpio) {
      setErrorNombre('Escribe el nombre de la persona.');
      return;
    }
    if (!hayCambios) return;
    setErrorNombre(null);
    setErrorEnvio(null);
    setEnviando(true);
    try {
      await alGuardar(cambios);
      alCerrar();
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 409) setErrorNombre(e.message);
      else setErrorEnvio(mensajeDe(e, 'No pudimos guardar los cambios. Inténtalo de nuevo.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <HojaInferior abierta onCerrar={alCerrar} titulo={`Editar a ${persona.nombre}`}>
      <form className={c.formulario} onSubmit={(e) => void enviar(e)} noValidate>
        <Campo
          etiqueta="Nombre"
          value={nombre}
          maxLength={TOPES_PERSONAL.nombre}
          onChange={(ev) => setNombre(ev.target.value)}
          autoComplete="off"
          error={errorNombre}
        />
        <SelectorRol rol={rol} alCambiar={setRol} />
        {cambios.rol && (
          <p className={c.ayuda}>Al cambiar el rol se cierra su sesión actual: tendrá que volver a entrar con su PIN.</p>
        )}
        {errorEnvio && (
          <p className={c.error} role="alert">
            {errorEnvio}
          </p>
        )}
        <div className={c.accionesHoja}>
          <Boton type="submit" ancho cargando={enviando} disabled={!hayCambios}>
            Guardar cambios
          </Boton>
          <Boton variante="fantasma" ancho onClick={alCerrar} disabled={enviando}>
            Cancelar
          </Boton>
        </div>
      </form>
    </HojaInferior>
  );
}

/** Reasignar el PIN (AC-26.2): PIN nuevo y su confirmación; después no se muestra nunca. */
export function HojaPin({
  persona,
  alReasignar,
  alCerrar,
}: {
  persona: Personal;
  alReasignar: (pin: string) => Promise<unknown>;
  alCerrar: () => void;
}) {
  const [pin, setPin] = useState('');
  const [repetido, setRepetido] = useState('');
  const [errorPin, setErrorPin] = useState<string | null>(null);
  const [errorRepetido, setErrorRepetido] = useState<string | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const malPin = PIN_VALIDO.test(pin) ? null : 'El PIN lleva de 4 a 6 números.';
    const malRepetido = !malPin && repetido !== pin ? 'Los dos PIN deben ser iguales.' : null;
    setErrorPin(malPin);
    setErrorRepetido(malRepetido);
    setErrorEnvio(null);
    if (malPin || malRepetido) return;
    const enviado = pin;
    setPin('');
    setRepetido('');
    setEnviando(true);
    try {
      await alReasignar(enviado);
      alCerrar();
    } catch (e) {
      setErrorEnvio(`${mensajeDe(e, 'No pudimos cambiar el PIN. Inténtalo de nuevo.')} Vuelve a escribir el PIN.`);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <HojaInferior
      abierta
      onCerrar={alCerrar}
      titulo={`Nuevo PIN para ${persona.nombre}`}
      descripcion="Su sesión actual se cierra y entrará con el PIN nuevo. Entrégaselo: no podremos mostrártelo de nuevo."
    >
      <form className={c.formulario} onSubmit={(e) => void enviar(e)} noValidate>
        <CampoPin etiqueta="PIN nuevo (4 a 6 números)" valor={pin} alCambiar={setPin} error={errorPin} />
        <CampoPin etiqueta="Repite el PIN nuevo" valor={repetido} alCambiar={setRepetido} error={errorRepetido} />
        {errorEnvio && (
          <p className={c.error} role="alert">
            {errorEnvio}
          </p>
        )}
        <div className={c.accionesHoja}>
          <Boton type="submit" ancho cargando={enviando}>
            Cambiar PIN
          </Boton>
          <Boton variante="fantasma" ancho onClick={alCerrar} disabled={enviando}>
            Cancelar
          </Boton>
        </div>
      </form>
    </HojaInferior>
  );
}

/** Confirmación de «Dar de baja»: avisa de la revocación inmediata de su sesión (AC-26.3). */
export function HojaBajaPersona({
  persona,
  alConfirmar,
  alCerrar,
}: {
  persona: Personal;
  alConfirmar: () => void;
  alCerrar: () => void;
}) {
  return (
    <HojaInferior
      abierta
      onCerrar={alCerrar}
      titulo={`¿Dar de baja a ${persona.nombre}?`}
      descripcion="Su sesión se cierra al instante y no podrá volver a entrar. No se borra nada: puedes reactivarla desde «Dados de baja»; tendrá que entrar de nuevo con su PIN."
    >
      <div className={c.accionesHoja}>
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
