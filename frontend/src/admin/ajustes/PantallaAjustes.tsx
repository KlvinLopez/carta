import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Boton } from '../../compartido/componentes';
import { estilosPantalla as e } from '../../compartido/pantalla/Pantalla';
import { useSesion } from '../acceso/Sesion';
import { useRestauranteActivo, type Restaurante } from '../armazon/RestauranteActivo';
import { Campo } from '../alta/Campo';
import { CopiarEnlace } from '../gestion/CopiarEnlace';
import c from '../gestion/Gestion.module.css';
import { LimiteGestion } from '../gestion/LimiteGestion';
import { errorDeCampo, largoEnPuntos, mensajeDe } from '../gestion/mensajes';
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
  // Puntos de código, como `max_length` del servidor (el `maxLength` del DOM cuenta unidades UTF-16).
  const topes: [Campos, number][] = [
    ['nombre', TOPES_AJUSTES.nombre],
    ['direccion', TOPES_AJUSTES.direccion],
    ['telefono', TOPES_AJUSTES.telefono],
    ['email', TOPES_AJUSTES.email],
    ['logo_url', TOPES_AJUSTES.logo],
  ];
  for (const [campo, tope] of topes) {
    if (largoEnPuntos(v[campo].trim()) > tope) errores[campo] = `Admite hasta ${tope} caracteres.`;
  }
  if (!errores.email && v.email.trim() && !esCorreo(v.email.trim())) errores.email = 'Escribe un correo válido, como hola@tu-restaurante.com.';
  if (!errores.logo_url && v.logo_url.trim() && !esUrlHttps(v.logo_url.trim())) {
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

/**
 * Enlaces públicos. Ninguna URL de mesa es pública: el código de la mesa es su credencial (quien lo tiene
 * entra a su sesión y pide sin estar en el restaurante) y muere al regenerarla. Por eso aquí sólo está la
 * entrada del personal; el enlace del menú por `slug` llega con la Fase 2 (T-2.2).
 */
function Enlaces({ restaurante }: { restaurante: Restaurante }) {
  return (
    <section className={c.seccion} aria-labelledby="titulo-enlaces">
      <h2 id="titulo-enlaces" className={c.subtitulo}>
        Enlaces públicos
      </h2>
      <p className={c.ayuda}>
        El enlace público de tu menú llega con la Fase 2. Mientras tanto, tus comensales lo abren con el QR de cada mesa:
        descarga el PDF listo para imprimir en la sección Mesas.
      </p>
      <Link to="/admin/mesas" className={c.enlaceTocable}>
        Ir a Mesas
      </Link>
      <ul className={c.enlaces}>
        <CopiarEnlace etiqueta="Entrada del personal" url={`${window.location.origin}/staff/${restaurante.slug}`} />
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
        <Campo etiqueta="Nombre" value={v.nombre} onChange={poner('nombre')} error={errores.nombre} autoComplete="organization" />
        <Campo etiqueta="Dirección" value={v.direccion} onChange={poner('direccion')} error={errores.direccion} autoComplete="street-address" />
        <Campo etiqueta="Teléfono" type="tel" inputMode="tel" value={v.telefono} onChange={poner('telefono')} error={errores.telefono} autoComplete="tel" />
        <Campo etiqueta="Correo" type="email" inputMode="email" value={v.email} onChange={poner('email')} error={errores.email} autoComplete="email" />
        <Campo
          etiqueta="Logo (enlace https)"
          type="url"
          inputMode="url"
          value={v.logo_url}
         
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

      <Enlaces restaurante={restaurante} />

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
