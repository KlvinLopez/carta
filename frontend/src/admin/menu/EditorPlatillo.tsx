import { lazy, Suspense, useId, useState, type FormEvent } from 'react';

import { Boton } from '../../compartido/componentes';
import { HojaInferior } from '../../compartido/componentes/HojaInferior';
import { ErrorApi } from '../../compartido/http';
import { leerPrecio } from '../alta/borrador';
import { AreaTexto, Campo } from '../alta/Campo';
import { EditorChips } from '../alta/EditorChips';
import c from './Menu.module.css';
import alta from '../alta/Alta.module.css';
import { Miniatura } from './Miniatura';
import { TOPES_MENU, type CambiosPlatillo, type Categoria, type Platillo, type PlatilloNuevo } from './tipos';

// El recorte y la guía sólo se descargan al tocar «Agregar foto».
const PasoFoto = lazy(() => import('./PasoFoto'));

const ALERGENOS_COMUNES = ['gluten', 'lacteos', 'huevo', 'cacahuate', 'frutos_secos', 'soya', 'pescado', 'mariscos'];
const ETIQUETAS_COMUNES = ['vegetariano', 'vegano', 'picante', 'sin_gluten'];

type Campos = 'nombre' | 'descripcion' | 'precio' | 'categoria';
type Errores = Partial<Record<Campos | 'general', string>>;

const CAMPO_DE_API: Record<string, Campos> = {
  nombre: 'nombre',
  descripcion: 'descripcion',
  precio: 'precio',
  categoria_id: 'categoria',
};

/** Pone cada error del servidor junto a su campo (`body.precio` → Precio); el resto, arriba de los botones. */
export function erroresDeApi(error: unknown): Errores {
  if (!(error instanceof ErrorApi)) return { general: 'No pudimos guardar el platillo. Inténtalo de nuevo.' };
  if (error.estado === 409) return { nombre: error.message };
  if (error.estado === 422) {
    const lista = (error.detalles as { errores?: { campo?: unknown; mensaje?: unknown }[] }).errores;
    const resultado: Errores = {};
    for (const item of Array.isArray(lista) ? lista : []) {
      const campo = typeof item.campo === 'string' ? CAMPO_DE_API[item.campo.split('.').pop() ?? ''] : undefined;
      const mensaje = typeof item.mensaje === 'string' && item.mensaje ? item.mensaje : error.message;
      if (campo && !resultado[campo]) resultado[campo] = mensaje;
    }
    return Object.keys(resultado).length > 0 ? resultado : { general: error.message };
  }
  return { general: error.message };
}

const mismos = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Editor de platillo en hoja inferior (US-16): nombre, descripción, precio, categoría, alérgenos y
 * etiquetas (los chips del asistente de alta) y la foto. `platillo = null` crea uno nuevo. El precio se
 * teclea como texto y se valida aquí y en el servidor; nunca viaja otra cosa que lo que escribe el operador.
 */
export function EditorPlatillo({
  platillo,
  categorias,
  categoriaInicial,
  alGuardar,
  alSubirFoto,
  alQuitarFoto,
  alCerrar,
}: {
  platillo: Platillo | null;
  categorias: Categoria[];
  categoriaInicial: string | null;
  alGuardar: (datos: PlatilloNuevo | CambiosPlatillo) => Promise<void>;
  alSubirFoto: (archivo: Blob, nombre: string) => Promise<void>;
  alQuitarFoto: () => Promise<void>;
  alCerrar: () => void;
}) {
  const idCategoria = useId();
  const [vista, setVista] = useState<'datos' | 'foto'>('datos');
  const [nombre, setNombre] = useState(platillo?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(platillo?.descripcion ?? '');
  const [precio, setPrecio] = useState(platillo ? String(platillo.precio).replace('.', ',') : '');
  const [categoria, setCategoria] = useState(platillo ? (platillo.categoria_id ?? '') : (categoriaInicial ?? ''));
  const [alergenos, setAlergenos] = useState<string[]>(platillo?.alergenos ?? []);
  const [etiquetas, setEtiquetas] = useState<string[]>(platillo?.etiquetas ?? []);
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);

  const nuevo = platillo === null;
  const activas = categorias.filter((x) => x.activa || x.id === platillo?.categoria_id);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const problemas: Errores = {};
    const limpio = nombre.trim();
    if (!limpio) problemas.nombre = 'Escribe el nombre del platillo.';
    else if ([...limpio].length > TOPES_MENU.nombre) problemas.nombre = `Máximo ${TOPES_MENU.nombre} letras.`;
    const valor = leerPrecio(precio);
    if (valor === null) problemas.precio = 'Escribe un precio válido, por ejemplo 85 o 85,50 (puede ser 0).';
    if ([...descripcion].length > TOPES_MENU.descripcion) problemas.descripcion = `Máximo ${TOPES_MENU.descripcion} letras.`;
    setErrores(problemas);
    if (Object.keys(problemas).length > 0 || valor === null) return;

    const completo = {
      nombre: limpio,
      descripcion: descripcion.trim() || null,
      precio: valor,
      categoria_id: categoria || null,
      alergenos,
      etiquetas,
    };
    let datos: PlatilloNuevo | CambiosPlatillo = completo;
    if (platillo) {
      // Sólo viajan los campos que cambiaron: un PATCH nunca pisa lo que otro editó mientras tanto.
      const cambios: CambiosPlatillo = {};
      if (completo.nombre !== platillo.nombre) cambios.nombre = completo.nombre;
      if (completo.descripcion !== (platillo.descripcion ?? null)) cambios.descripcion = completo.descripcion;
      if (completo.precio !== Number(platillo.precio)) cambios.precio = completo.precio;
      if (completo.categoria_id !== (platillo.categoria_id ?? null)) cambios.categoria_id = completo.categoria_id;
      if (!mismos(alergenos, platillo.alergenos)) cambios.alergenos = alergenos;
      if (!mismos(etiquetas, platillo.etiquetas)) cambios.etiquetas = etiquetas;
      if (Object.keys(cambios).length === 0) {
        alCerrar();
        return;
      }
      datos = cambios;
    }
    setGuardando(true);
    try {
      await alGuardar(datos);
      alCerrar();
    } catch (error) {
      setErrores(erroresDeApi(error));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <HojaInferior
      abierta
      onCerrar={alCerrar}
      titulo={vista === 'foto' ? 'Foto del platillo' : nuevo ? 'Nuevo platillo' : 'Editar platillo'}
      descripcion={vista === 'foto' ? undefined : nuevo ? 'Se agrega al final de su categoría.' : platillo.nombre}
    >
      {vista === 'foto' && platillo ? (
        <Suspense fallback={<p className={c.ayudaFoto} role="status">Preparando la cámara…</p>}>
          <PasoFoto
            nombre={platillo.nombre}
            conFoto={platillo.imagen_tipo === 'foto'}
            alSubir={alSubirFoto}
            alQuitar={alQuitarFoto}
            alVolver={() => setVista('datos')}
          />
        </Suspense>
      ) : (
        <form className={c.formulario} onSubmit={(ev) => void enviar(ev)} noValidate>
          <Campo
            etiqueta="Nombre"
            value={nombre}
            onChange={(ev) => setNombre(ev.target.value)}
            error={errores.nombre}
            maxLength={TOPES_MENU.nombre}
            autoComplete="off"
          />
          <AreaTexto
            etiqueta="Descripción"
            ayuda="Opcional. Lo que el comensal quiere saber antes de pedir."
            value={descripcion}
            onChange={(ev) => setDescripcion(ev.target.value)}
            error={errores.descripcion}
            maxLength={TOPES_MENU.descripcion}
            rows={3}
          />
          <Campo
            etiqueta="Precio"
            inputMode="decimal"
            value={precio}
            onChange={(ev) => setPrecio(ev.target.value)}
            error={errores.precio}
            placeholder="85,00"
            autoComplete="off"
          />
          <div className={alta.campo}>
            <label htmlFor={idCategoria} className={alta.etiqueta}>
              Categoría
            </label>
            <select
              id={idCategoria}
              className={[alta.entrada, c.selector].join(' ')}
              value={categoria}
              onChange={(ev) => setCategoria(ev.target.value)}
              aria-invalid={errores.categoria ? true : undefined}
            >
              <option value="">Sin categoría</option>
              {activas.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </select>
            {errores.categoria && (
              <p className={alta.mensajeError} role="alert">
                {errores.categoria}
              </p>
            )}
          </div>
          <EditorChips etiqueta="Alérgenos" valores={alergenos} sugerencias={ALERGENOS_COMUNES} alCambiar={setAlergenos} tono="alergeno" />
          <EditorChips etiqueta="Etiquetas" valores={etiquetas} sugerencias={ETIQUETAS_COMUNES} alCambiar={setEtiquetas} tono="etiqueta" />

          <div className={c.bloqueFoto}>
            {platillo ? (
              <Miniatura platillo={platillo} grande />
            ) : (
              <span className={c.marcadorFoto} aria-hidden="true">
                +
              </span>
            )}
            <div className={c.textoFoto}>
              <span className={alta.etiqueta}>Foto</span>
              {platillo ? (
                <Boton type="button" variante="secundario" compacto onClick={() => setVista('foto')}>
                  {platillo.imagen_tipo === 'foto' ? 'Cambiar foto' : 'Agregar foto'}
                </Boton>
              ) : (
                <p className={alta.ayuda}>Podrás agregar la foto en cuanto guardes el platillo.</p>
              )}
            </div>
          </div>

          {errores.general && (
            <p className={alta.mensajeError} role="alert">
              {errores.general}
            </p>
          )}
          <div className={c.accionesFormulario}>
            <Boton type="submit" ancho cargando={guardando}>
              {nuevo ? 'Agregar platillo' : 'Guardar cambios'}
            </Boton>
            <Boton type="button" variante="fantasma" ancho onClick={alCerrar} disabled={guardando}>
              Cancelar
            </Boton>
          </div>
        </form>
      )}
    </HojaInferior>
  );
}
