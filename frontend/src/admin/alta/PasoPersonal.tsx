import { useRef, useState, type FormEvent } from 'react';

import { Boton, Chip } from '../../compartido/componentes';
import { ErrorApi } from '../../compartido/http';
import { PIN_VALIDO, soloDigitosAscii } from '../personal/pin';
import c from './Alta.module.css';
import { Campo } from './Campo';
import type { MiembroEquipo } from './progreso';
import type { ServicioAlta } from './servicio';
import { TOPES, type Restaurante, type RolPersonal } from './tipos';

export type { MiembroEquipo } from './progreso';

/**
 * Paso 6 · Personal: nombre, rol y PIN de 4 a 6 dígitos. El PIN viaja una vez a la API y se
 * borra del campo en cuanto se envía: no se guarda en el navegador ni se vuelve a mostrar (regla 11).
 */
export default function PasoPersonal({
  servicio,
  restaurante,
  equipo,
  alAgregar,
  alContinuar,
}: {
  servicio: ServicioAlta;
  restaurante: Restaurante;
  equipo: MiembroEquipo[];
  alAgregar: (miembro: MiembroEquipo) => void;
  alContinuar: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<RolPersonal>('mesero');
  const [pin, setPin] = useState('');
  const [pinFiltrado, setPinFiltrado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorNombre, setErrorNombre] = useState<string | null>(null);
  const [errorPin, setErrorPin] = useState<string | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const formulario = useRef<HTMLFormElement>(null);

  async function agregar(evento: FormEvent) {
    evento.preventDefault();
    const nombreLimpio = nombre.trim();
    const malNombre = nombreLimpio ? null : 'Escribe el nombre de la persona.';
    const malPin = PIN_VALIDO.test(pin) ? null : 'El PIN lleva de 4 a 6 números.';
    setErrorNombre(malNombre);
    setErrorPin(malPin);
    setErrorEnvio(null);
    if (malNombre || malPin) return;
    const pinEnviado = pin;
    // El PIN sale del estado antes de la llamada: nada lo conserva si la petición tarda o falla.
    setPin('');
    setPinFiltrado(false);
    setEnviando(true);
    try {
      const creado = await servicio.crearPersonal(restaurante.id, { nombre: nombreLimpio, rol, pin: pinEnviado });
      alAgregar({ id: creado.id, nombre: creado.nombre, rol: creado.rol });
      setNombre('');
      setRol('mesero');
    } catch (e) {
      setErrorEnvio(
        (e instanceof ErrorApi ? e.message : 'No pudimos dar de alta a esta persona. Inténtalo de nuevo.') +
          ' Vuelve a escribir el PIN.',
      );
      formulario.current?.querySelector<HTMLInputElement>('input[data-pin]')?.focus();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className={c.paso} aria-labelledby="titulo-personal">
      <header className={c.encabezadoPaso}>
        <h2 id="titulo-personal" className={c.tituloPaso}>
          Tu equipo
        </h2>
        <p className={c.textoPaso}>
          Cada persona entra con su PIN. Lo verás sólo ahora: anótalo y entrégaselo, no podremos mostrártelo de nuevo.
        </p>
      </header>
      {equipo.length > 0 && (
        <ul className={c.equipo} aria-label="Personal agregado">
          {equipo.map((m) => (
            <li key={m.id} className={c.miembro}>
              <span className={c.nombreMiembro}>{m.nombre}</span>
              <Chip tono={m.rol === 'capitan' ? 'dorado' : 'neutro'}>{m.rol === 'capitan' ? 'Capitán' : 'Mesero'}</Chip>
            </li>
          ))}
        </ul>
      )}
      <form ref={formulario} className={c.formulario} onSubmit={(e) => void agregar(e)} noValidate>
        <Campo
          etiqueta="Nombre"
          value={nombre}
          maxLength={TOPES.nombrePersonal}
          onChange={(ev) => setNombre(ev.target.value)}
          autoComplete="off"
          error={errorNombre}
        />
        <fieldset className={c.rol}>
          <legend className={c.etiqueta}>Rol</legend>
          <div className={c.fila}>
            <Chip className={c.chipRol} activo={rol === 'mesero'} onClick={() => setRol('mesero')}>
              Mesero
            </Chip>
            <Chip className={c.chipRol} activo={rol === 'capitan'} onClick={() => setRol('capitan')}>
              Capitán
            </Chip>
          </div>
        </fieldset>
        <Campo
          etiqueta="PIN (4 a 6 números)"
          type="password"
          inputMode="numeric"
          // `off` lo ignoran los gestores de contraseñas y ofrecerían guardar el PIN del equipo.
          autoComplete="new-password"
          data-lpignore="true"
          data-1p-ignore="true"
          maxLength={12}
          value={pin}
          onChange={(ev) => {
            const digitos = soloDigitosAscii(ev.target.value).slice(0, 6);
            setPinFiltrado(digitos.length < ev.target.value.length && ev.target.value.length <= 6);
            setPin(digitos);
          }}
          error={errorPin}
          ayuda={pinFiltrado ? 'El PIN sólo lleva números.' : undefined}
          data-pin
        />
        {errorEnvio && (
          <p className={c.mensajeError} role="alert">
            {errorEnvio}
          </p>
        )}
        <Boton type="submit" variante="secundario" ancho cargando={enviando}>
          Agregar persona
        </Boton>
      </form>
      <div className={c.acciones}>
        <Boton ancho onClick={alContinuar}>
          {equipo.length > 0 ? 'Continuar' : 'Omitir por ahora'}
        </Boton>
      </div>
    </section>
  );
}
