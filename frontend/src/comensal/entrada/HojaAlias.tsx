import { useEffect, useId, useState, type FormEvent } from 'react';

import { Boton, HojaInferior } from '../../compartido/componentes';
import { estilosPantalla as e } from '../../compartido/pantalla/Pantalla';
import { MAX_ALIAS } from './errores';
import estilos from './Entrada.module.css';
import type { ResultadoAlias } from './useEntrada';

const MENSAJES: Record<Extract<ResultadoAlias, { ok: false }>['motivo'], string> = {
  alias_no_permitido: 'Ese nombre no está disponible. Prueba con otro.',
  invalido: `Usa entre 1 y ${MAX_ALIAS} caracteres.`,
  credencial: 'Renovamos tu lugar en la mesa. Vuelve a guardar tu nombre.',
  sin_conexion: 'Sin conexión. Tu nombre sigue como estaba; inténtalo de nuevo.',
  limite: 'Has cambiado tu nombre muchas veces seguidas. Espera un momento.',
  generico: 'No pudimos guardar tu nombre. Inténtalo de nuevo.',
  ocupado: '',
};

/** Largo en puntos de código (como cuenta el servidor), no en unidades UTF-16: un emoji es uno. */
export const largoAlias = (texto: string) => [...texto].length;

export interface PropsHojaAlias {
  abierta: boolean;
  aliasActual: string;
  onCerrar: () => void;
  onGuardar: (alias: string) => Promise<ResultadoAlias>;
}

/** Hoja inferior para cambiar el alias. Un error deja el alias anterior y el texto escrito. */
export function HojaAlias({ abierta, aliasActual, onCerrar, onGuardar }: PropsHojaAlias) {
  const [texto, setTexto] = useState(aliasActual);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const idCampo = useId();
  const idError = useId();

  useEffect(() => {
    if (abierta) {
      setTexto(aliasActual);
      setError(null);
    }
    // Sólo al abrir: un sondeo no debe pisar lo que la persona está escribiendo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta]);

  const limpio = texto.trim();
  const largo = largoAlias(limpio);
  const valido = largo >= 1 && largo <= MAX_ALIAS;

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (guardando || !valido) return;
    if (limpio === aliasActual) {
      onCerrar();
      return;
    }
    setGuardando(true);
    setError(null);
    const r = await onGuardar(limpio);
    setGuardando(false);
    if (r.ok) onCerrar();
    else if (r.motivo !== 'ocupado') setError(MENSAJES[r.motivo]);
  }

  return (
    <HojaInferior abierta={abierta} onCerrar={onCerrar} titulo="¿Cómo te llamamos?" descripcion="Tu nombre en la mesa lo ven quienes comen contigo.">
      <form className={estilos.formulario} onSubmit={(ev) => void enviar(ev)} noValidate>
        <div className={estilos.campo}>
          <label className={e.texto} htmlFor={idCampo}>
            Tu nombre
          </label>
          <input
            id={idCampo}
            className={estilos.entrada}
            value={texto}
            onChange={(ev) => setTexto(ev.target.value)}
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="done"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? idError : undefined}
          />
          <span className={estilos.contador} aria-hidden="true">
            {largo}/{MAX_ALIAS}
          </span>
          {error && (
            <p id={idError} className={estilos.error} role="alert">
              {error}
            </p>
          )}
          {largo > MAX_ALIAS && (
            <p className={estilos.error}>Usa {MAX_ALIAS} caracteres o menos.</p>
          )}
        </div>
        <Boton type="submit" ancho cargando={guardando} disabled={!valido}>
          Guardar
        </Boton>
        <Boton type="button" variante="fantasma" ancho onClick={onCerrar} disabled={guardando}>
          Cancelar
        </Boton>
      </form>
    </HojaInferior>
  );
}
