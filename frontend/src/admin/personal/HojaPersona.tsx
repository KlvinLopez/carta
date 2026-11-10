import { useState, type FormEvent } from 'react';

import { Boton, Chip } from '../../compartido/componentes';
import { HojaInferior } from '../../compartido/componentes/HojaInferior';
import { Campo } from '../alta/Campo';
import c from '../gestion/Gestion.module.css';
import { errorDeCampo, largoEnPuntos, mensajeDe, noSeAplico } from '../gestion/mensajes';
import { ErrorApi } from '../../compartido/http';
import { errorDePin } from './pin';
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

const MENSAJE_SOLO_NUMEROS = 'El PIN sólo lleva números del 0 al 9.';
const errorNombreLargo = `El nombre admite hasta ${TOPES_PERSONAL.nombre} caracteres.`;

/** Campo de PIN: no normaliza nada; lo que no sea un dígito ASCII se avisa al instante y se rechaza al enviar. */
function CampoPin({
  etiqueta,
  valor,
  alCambiar,
  error,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  error?: string | null;
}) {
  return (
    <Campo
      etiqueta={etiqueta}
      type="password"
      inputMode="numeric"
      // `off` lo ignoran los gestores de contraseñas y ofrecerían guardar el PIN del equipo.
      autoComplete="new-password"
      data-lpignore="true"
      data-1p-ignore="true"
      value={valor}
      onChange={(ev) => alCambiar(ev.target.value)}
      error={error}
      ayuda={/[^0-9]/.test(valor) ? MENSAJE_SOLO_NUMEROS : undefined}
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
  // Un intento anterior cayó por la red: quizá el alta sí se guardó y el 409 de ahora es de ella misma.
  const [huboRed, setHuboRed] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const limpio = nombre.trim();
    const malNombre = !limpio
      ? 'Escribe el nombre de la persona.'
      : largoEnPuntos(limpio) > TOPES_PERSONAL.nombre
        ? errorNombreLargo
        : null;
    const malPin = errorDePin(pin);
    setErrorNombre(malNombre);
    setErrorPin(malPin);
    setErrorEnvio(null);
    if (malNombre || malPin) return;
    const enviado = pin;
    // El PIN sale del estado antes de la llamada; sólo vuelve si el servidor no llegó a aplicar nada.
    setPin('');
    setEnviando(true);
    try {
      await alCrear({ nombre: limpio, rol, pin: enviado });
      alCerrar();
    } catch (e) {
      const conservar = noSeAplico(e);
      if (conservar) setPin(enviado);
      if (e instanceof ErrorApi && e.estado === 0) setHuboRed(true);
      let deshecho = conservar ? null : 'Vuelve a escribir el PIN.';
      if (e instanceof ErrorApi && e.estado === 409) {
        setErrorNombre(`${e.message}${huboRed ? ' Puede que el alta ya se haya guardado: revisa la lista.' : ''}`);
      } else if (errorDeCampo(e, 'nombre')) {
        setErrorNombre(errorDeCampo(e, 'nombre'));
      } else if (errorDeCampo(e, 'pin')) {
        deshecho = errorDeCampo(e, 'pin');
      } else {
        // Incluye el tope de 50 activos (`campo: "body"`): es un mensaje de la hoja, no de un campo.
        setErrorEnvio(mensajeDe(e, 'No pudimos dar de alta a esta persona. Inténtalo de nuevo.'));
      }
      setErrorPin(deshecho);
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
    if (!limpio || largoEnPuntos(limpio) > TOPES_PERSONAL.nombre) {
      setErrorNombre(limpio ? errorNombreLargo : 'Escribe el nombre de la persona.');
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
    const malPin = errorDePin(pin);
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
      // Si el servidor no aplicó nada (503, 408, red) el PIN vuelve a los campos; en los demás errores se pide otra vez.
      const mensaje = mensajeDe(e, 'No pudimos cambiar el PIN. Inténtalo de nuevo.');
      if (noSeAplico(e)) {
        setPin(enviado);
        setRepetido(enviado);
        setErrorEnvio(mensaje);
      } else {
        setErrorEnvio(`${mensaje} Vuelve a escribir el PIN.`);
      }
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
