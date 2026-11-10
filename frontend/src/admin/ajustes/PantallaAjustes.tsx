import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';

import { Boton } from '../../compartido/componentes';
import { estilosPantalla as e } from '../../compartido/pantalla/Pantalla';
import { useSesion } from '../acceso/Sesion';
import { useRestauranteActivo, type Restaurante } from '../armazon/RestauranteActivo';
import { Campo } from '../alta/Campo';
import { CopiarEnlace } from '../gestion/CopiarEnlace';
import c from '../gestion/Gestion.module.css';
import { LimiteGestion } from '../gestion/LimiteGestion';
import { errorDeCampo, fueAbortado, mensajeDe } from '../gestion/mensajes';
import {
  crearServicioAjustes,
  esCorreo,
  esUrlHttps,
  TOPES_AJUSTES,
  type CambiosRestaurante,
  type ServicioAjustes,
} from './servicio';

type Campos = 'nombre' | 'direccion' | 'telefono' | 'email' | 'logo_url';
type Errores = Partial<Record<Campos, string>>;

const valores = (r: Restaurante): Record<Campos, string> => ({
  nombre: r.nombre,
  direccion: r.direccion ?? '',
  telefono: r.telefono ?? '',
  email: r.email ?? '',
  logo_url: r.logo_url ?? '',
});

/** Valida en el cliente con las mismas reglas que el servidor para que un 422 sea raro, no la regla. */
function validar(v: Record<Campos, string>): Errores {
  const errores: Errores = {};
  if (!v.nombre.trim()) errores.nombre = 'Escribe el nombre de tu restaurante.';
  if (v.email.trim() && !esCorreo(v.email.trim())) errores.email = 'Escribe un correo válido, como hola@tu-restaurante.com.';
  if (v.logo_url.trim() && !esUrlHttps(v.logo_url.trim())) {
    errores.logo_url = 'El enlace del logo debe empezar con https:// y no llevar usuario ni contraseña.';
  }
  return errores;
}

/** Sólo los campos que cambiaron; vaciar un opcional lo borra (`null`). */
export function cambiosDe(original: Restaurante, v: Record<Campos, string>): CambiosRestaurante {
  const antes = valores(original);
  const cambios: CambiosRestaurante = {};
  if (v.nombre.trim() !== antes.nombre) cambios.nombre = v.nombre.trim();
  for (const campo of ['direccion', 'telefono', 'email', 'logo_url'] as const) {
    const nuevo = v[campo].trim();
    if (nuevo !== antes[campo]) cambios[campo] = nuevo === '' ? null : nuevo;
  }
  return cambios;
}

function Enlaces({ servicio, restaurante }: { servicio: ServicioAjustes; restaurante: Restaurante }) {
  const [mesa, setMesa] = useState<{ url: string } | null | 'cargando'>('cargando');
  useEffect(() => {
    const control = new AbortController();
    setMesa('cargando');
    servicio
      .primeraMesa(restaurante.id, control.signal)
      .then((m) => !control.signal.aborted && setMesa(m ? { url: m.url_publica } : null))
      .catch((error: unknown) => {
        if (!control.signal.aborted && !fueAbortado(error)) setMesa(null);
      });
    return () => control.abort();
  }, [servicio, restaurante.id]);

  const origen = mesa && mesa !== 'cargando' ? new URL(mesa.url).origin : window.location.origin;
  return (
    <section className={c.seccion} aria-labelledby="titulo-enlaces">
      <h2 id="titulo-enlaces" className={c.subtitulo}>
        Enlaces públicos
      </h2>
      <p className={c.ayuda}>
        Compártelos o imprímelos. El menú se abre desde el QR de cada mesa; el PDF con todos los QR se descarga en{' '}
        <a href="/admin/mesas">Mesas</a>.
      </p>
      <ul className={c.enlaces}>
        {mesa === 'cargando' ? (
          <li className={c.ayuda}>Buscando tu enlace…</li>
        ) : mesa ? (
          <CopiarEnlace etiqueta="Menú (ejemplo: la mesa 1)" url={mesa.url} />
        ) : (
          <li className={c.ayuda}>Aún no tienes mesas: crea una en la sección Mesas para obtener el enlace de tu menú.</li>
        )}
        <CopiarEnlace etiqueta="Entrada del personal" url={`${origen}/staff/${restaurante.slug}`} />
      </ul>
    </section>
  );
}

export function PantallaAjustesConServicio({
  servicio,
  restaurante,
  alGuardar,
  pie,
}: {
  servicio: ServicioAjustes;
  restaurante: Restaurante;
  alGuardar: (nuevo: Restaurante) => void;
  /** Lo que va al final de la pantalla (la cuenta y «Salir»). */
  pie?: ReactNode;
}) {
  const [v, setV] = useState(() => valores(restaurante));
  const [errores, setErrores] = useState<Errores>({});
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const cambios = cambiosDe(restaurante, v);
  const hayCambios = Object.keys(cambios).length > 0;
  const poner = (campo: Campos) => (ev: { target: { value: string } }) => {
    setV((previo) => ({ ...previo, [campo]: ev.target.value }));
    setGuardado(false);
  };

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    const malos = validar(v);
    setErrores(malos);
    setErrorEnvio(null);
    if (Object.keys(malos).length > 0 || !hayCambios) return;
    setEnviando(true);
    try {
      const nuevo = await servicio.cambiar(restaurante.id, cambios);
      alGuardar(nuevo);
      setV(valores(nuevo));
      setGuardado(true);
    } catch (error) {
      const deServidor: Errores = {};
      for (const campo of ['nombre', 'direccion', 'telefono', 'email', 'logo_url'] as const) {
        const m = errorDeCampo(error, campo);
        if (m) deServidor[campo] = m;
      }
      if (Object.keys(deServidor).length > 0) setErrores(deServidor);
      else setErrorEnvio(mensajeDe(error, 'No pudimos guardar tus cambios. Inténtalo de nuevo.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={c.pantalla}>
      <header className={e.encabezado}>
        <p className={e.sobretitulo}>{restaurante.nombre}</p>
        <h1 className={e.titulo}>Ajustes</h1>
      </header>

      <form className={c.seccion} onSubmit={(ev) => void guardar(ev)} noValidate aria-labelledby="titulo-datos">
        <h2 id="titulo-datos" className={c.subtitulo}>
          Tu restaurante
        </h2>
        <Campo etiqueta="Nombre" value={v.nombre} maxLength={TOPES_AJUSTES.nombre} onChange={poner('nombre')} error={errores.nombre} autoComplete="organization" />
        <Campo etiqueta="Dirección" value={v.direccion} maxLength={TOPES_AJUSTES.direccion} onChange={poner('direccion')} error={errores.direccion} autoComplete="street-address" />
        <Campo etiqueta="Teléfono" type="tel" inputMode="tel" value={v.telefono} maxLength={TOPES_AJUSTES.telefono} onChange={poner('telefono')} error={errores.telefono} autoComplete="tel" />
        <Campo etiqueta="Correo" type="email" inputMode="email" value={v.email} maxLength={TOPES_AJUSTES.email} onChange={poner('email')} error={errores.email} autoComplete="email" />
        <Campo
          etiqueta="Logo (enlace https)"
          type="url"
          inputMode="url"
          value={v.logo_url}
          maxLength={TOPES_AJUSTES.logo}
          onChange={poner('logo_url')}
          error={errores.logo_url}
          ayuda="Pega el enlace de una imagen que ya esté en internet. Subir el archivo llegará más adelante."
          autoComplete="off"
        />
        {errorEnvio && (
          <p className={c.error} role="alert">
            {errorEnvio}
          </p>
        )}
        {guardado && (
          <p className={c.exito} role="status">
            Cambios guardados.
          </p>
        )}
        <Boton type="submit" ancho cargando={enviando} disabled={!hayCambios}>
          Guardar cambios
        </Boton>
      </form>

      <Enlaces servicio={servicio} restaurante={restaurante} />

      {pie}
    </div>
  );
}

/** «Tu cuenta»: con qué correo entraste y cómo salir (T-1.10). */
function Cuenta() {
  const { estado, salir } = useSesion();
  const correo = estado.tipo === 'con-sesion' ? estado.usuario.correo : null;
  return (
    <section className={c.seccion} aria-label="Tu cuenta">
      {correo && <p className={e.texto}>Entraste como {correo}.</p>}
      <Boton variante="secundario" ancho onClick={() => void salir()}>
        Salir
      </Boton>
    </section>
  );
}

/** Pantalla Ajustes del panel (`/admin/ajustes`). */
export default function PantallaAjustes() {
  const { api } = useSesion();
  const { activo, reemplazar } = useRestauranteActivo();
  const servicio = useMemo(() => crearServicioAjustes(api), [api]);
  if (!activo) return null;
  return (
    <LimiteGestion key={activo.id} nombre="tus ajustes">
      <PantallaAjustesConServicio servicio={servicio} restaurante={activo} alGuardar={reemplazar} pie={<Cuenta />} />
    </LimiteGestion>
  );
}
