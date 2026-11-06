import { useState, type FormEvent } from 'react';

import { Boton } from '../../compartido/componentes';
import { ErrorApi } from '../../compartido/http';
import c from './Alta.module.css';
import { Campo } from './Campo';
import type { ServicioAlta } from './servicio';
import { TOPES, type Restaurante } from './tipos';

function logoValido(texto: string): boolean {
  try {
    const url = new URL(texto);
    return url.protocol === 'https:' && texto.length <= 500;
  } catch {
    return false;
  }
}

/** Paso 1 · Tu restaurante: nombre y, si lo tiene, el enlace a su logo. */
export default function PasoRestaurante({
  servicio,
  alCrear,
}: {
  servicio: ServicioAlta;
  alCrear: (restaurante: Restaurante) => void;
}) {
  const [nombre, setNombre] = useState('');
  const [logo, setLogo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorNombre, setErrorNombre] = useState<string | null>(null);
  const [errorLogo, setErrorLogo] = useState<string | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const nombreLimpio = nombre.trim();
    const logoLimpio = logo.trim();
    const malNombre = nombreLimpio ? null : 'Escribe el nombre de tu restaurante.';
    const malLogo = logoLimpio && !logoValido(logoLimpio) ? 'Pega un enlace que empiece con https://' : null;
    setErrorNombre(malNombre);
    setErrorLogo(malLogo);
    setErrorEnvio(null);
    if (malNombre || malLogo) return;
    setEnviando(true);
    try {
      alCrear(await servicio.crearRestaurante({ nombre: nombreLimpio, logo_url: logoLimpio || undefined }));
    } catch (e) {
      setErrorEnvio(e instanceof ErrorApi ? e.message : 'No pudimos crear tu restaurante. Inténtalo de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <form className={c.paso} onSubmit={(e) => void enviar(e)} noValidate>
      <header className={c.encabezadoPaso}>
        <h2 className={c.tituloPaso}>¿Cómo se llama tu restaurante?</h2>
        <p className={c.textoPaso}>Así lo verán tus comensales en el menú.</p>
      </header>
      <Campo
        etiqueta="Nombre del restaurante"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        maxLength={TOPES.nombreRestaurante}
        autoComplete="organization"
        autoFocus
        error={errorNombre}
      />
      <Campo
        etiqueta="Enlace a tu logo (opcional)"
        type="url"
        inputMode="url"
        value={logo}
        onChange={(e) => setLogo(e.target.value)}
        placeholder="https://"
        autoComplete="off"
        error={errorLogo}
        ayuda="Si aún no lo tienes a la mano, lo puedes poner después en Ajustes."
      />
      {errorEnvio && (
        <p className={c.mensajeError} role="alert">
          {errorEnvio}
        </p>
      )}
      <div className={c.acciones}>
        <Boton type="submit" ancho cargando={enviando}>
          Continuar
        </Boton>
      </div>
    </form>
  );
}
