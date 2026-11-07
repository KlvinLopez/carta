import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { Boton } from '../../compartido/componentes';
import { HojaInferior } from '../../compartido/componentes/HojaInferior';
import c from './Alta.module.css';
import {
  contarPlatillos,
  leerPrecio,
  operaciones,
  preciosPorRevisar,
  validar,
  type Borrador,
  type CategoriaBorrador,
  type PlatilloBorrador,
  type Problema,
} from './borrador';
import { AreaTexto, Campo } from './Campo';
import { EditorChips } from './EditorChips';
import { TOPES } from './tipos';

const ALERGENOS_COMUNES = ['gluten', 'lacteos', 'huevo', 'cacahuate', 'frutos_secos', 'soya', 'pescado', 'mariscos'];
const ETIQUETAS_COMUNES = ['vegetariano', 'vegano', 'picante', 'sin_gluten'];
/** Con más platillos que esto sólo la primera categoría arranca abierta: montar cientos de filas a la vez pesa. */
const PLATILLOS_PARA_COLAPSAR = 40;
const SIN_PROBLEMAS: Problema[] = [];

/** Cuántas veces se ha renderizado una fila: la prueba comprueba que teclear no repinta la tabla entera. */
export const instrumentacion = { filas: 0 };

function BotonesFila({
  nombre,
  alSubir,
  alBajar,
  alQuitar,
  primero,
  ultimo,
}: {
  nombre: string;
  alSubir: () => void;
  alBajar: () => void;
  alQuitar: () => void;
  primero: boolean;
  ultimo: boolean;
}) {
  return (
    <div className={c.herramientas}>
      <button type="button" className={c.herramienta} onClick={alSubir} disabled={primero} aria-label={`Subir ${nombre}`}>
        <span aria-hidden="true">↑</span>
      </button>
      <button type="button" className={c.herramienta} onClick={alBajar} disabled={ultimo} aria-label={`Bajar ${nombre}`}>
        <span aria-hidden="true">↓</span>
      </button>
      <button type="button" className={`${c.herramienta} ${c.peligro}`} onClick={alQuitar} aria-label={`Quitar ${nombre}`}>
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
}

interface PropsFila {
  platillo: PlatilloBorrador;
  indice: number;
  total: number;
  problemas: Problema[];
  onCambiar: (clave: string, cambios: Partial<PlatilloBorrador>) => void;
  onMover: (clave: string, delta: -1 | 1) => void;
  onQuitar: (clave: string) => void;
}

function mismosProblemas(a: Problema[], b: Problema[]): boolean {
  return a === b || (a.length === b.length && a.every((p, i) => p.campo === b[i]!.campo && p.mensaje === b[i]!.mensaje));
}

const FilaPlatillo = memo(function FilaPlatillo({ platillo, indice, total, problemas, onCambiar, onMover, onQuitar }: PropsFila) {
  instrumentacion.filas += 1;
  const nombreVisible = platillo.nombre.trim() || `platillo ${indice + 1}`;
  const errorDe = (campo: Problema['campo']) => problemas.find((p) => p.campo === campo)?.mensaje ?? null;
  const dudoso = !platillo.precioRevisado;
  const cero = platillo.precio.trim() !== '' && leerPrecio(platillo.precio) === 0;
  const clave = platillo.clave;
  return (
    <li className={[c.platillo, dudoso ? c.platilloDudoso : ''].filter(Boolean).join(' ')}>
      <div className={c.platilloCabecera}>
        <Campo
          etiqueta="Platillo"
          value={platillo.nombre}
          onChange={(ev) => onCambiar(clave, { nombre: ev.target.value })}
          error={errorDe('nombre')}
        />
        <div className={c.precioBloque}>
          <Campo
            etiqueta="Precio"
            value={platillo.precio}
            inputMode="decimal"
            autoComplete="off"
            maxLength={12}
            onChange={(ev) => onCambiar(clave, { precio: ev.target.value, precioRevisado: true })}
            error={errorDe('precio')}
          />
        </div>
      </div>
      {dudoso && (
        <div className={c.avisoPrecio} role="note">
          <span>
            {leerPrecio(platillo.precio) === null
              ? 'No pudimos leer este precio. Escríbelo tú.'
              : cero
                ? 'Este precio es $0. ¿Es correcto?'
                : 'No estamos seguros de este precio. Compáralo con tu carta.'}
          </span>
          {leerPrecio(platillo.precio) !== null && (
            <button
              type="button"
              className={c.botonSecundarioChico}
              onClick={() => onCambiar(clave, { precioRevisado: true })}
              aria-label={`Marcar el precio de ${nombreVisible} como correcto`}
            >
              Está bien
            </button>
          )}
        </div>
      )}
      {platillo.variantes.length > 0 && (
        <div className={c.variantesLista}>
          {platillo.variantes.map((v) => (
            <div key={v.clave} className={c.varianteFila}>
              <Campo
                etiqueta="Variante"
                value={v.nombre}
                onChange={(ev) =>
                  onCambiar(clave, {
                    variantes: platillo.variantes.map((x) => (x.clave === v.clave ? { ...x, nombre: ev.target.value } : x)),
                  })
                }
              />
              <Campo
                etiqueta="Precio de la variante"
                value={v.precio}
                inputMode="decimal"
                autoComplete="off"
                maxLength={12}
                onChange={(ev) =>
                  onCambiar(clave, {
                    variantes: platillo.variantes.map((x) => (x.clave === v.clave ? { ...x, precio: ev.target.value } : x)),
                  })
                }
              />
            </div>
          ))}
          {errorDe('variante') && (
            <p className={c.mensajeError} role="alert">
              {errorDe('variante')}
            </p>
          )}
        </div>
      )}
      <AreaTexto
        etiqueta="Descripción"
        rows={2}
        value={platillo.descripcion}
        onChange={(ev) => onCambiar(clave, { descripcion: ev.target.value })}
        error={errorDe('descripcion')}
      />
      <div className={c.chipsPar}>
        <EditorChips
          etiqueta="Alérgenos"
          tono="alergeno"
          valores={platillo.alergenos}
          sugerencias={ALERGENOS_COMUNES}
          alCambiar={(alergenos) => onCambiar(clave, { alergenos })}
        />
        <EditorChips
          etiqueta="Etiquetas"
          tono="etiqueta"
          valores={platillo.etiquetas}
          sugerencias={ETIQUETAS_COMUNES}
          alCambiar={(etiquetas) => onCambiar(clave, { etiquetas })}
        />
      </div>
      <BotonesFila
        nombre={nombreVisible}
        primero={indice === 0}
        ultimo={indice === total - 1}
        alSubir={() => onMover(clave, -1)}
        alBajar={() => onMover(clave, 1)}
        alQuitar={() => onQuitar(clave)}
      />
    </li>
  );
}, (a, b) =>
  a.platillo === b.platillo &&
  a.indice === b.indice &&
  a.total === b.total &&
  mismosProblemas(a.problemas, b.problemas) &&
  a.onCambiar === b.onCambiar &&
  a.onMover === b.onMover &&
  a.onQuitar === b.onQuitar,
);

/** Paso 3 · Revisa: tabla editable por categoría. Nada se crea hasta el paso siguiente (AC-25.3). */
export default function PasoRevision({
  borrador,
  alCambiar,
  alContinuar,
}: {
  borrador: Borrador;
  /** Recibe una función `borrador → borrador`: así las filas no dependen del borrador entero y pueden memorizarse. */
  alCambiar: (cambio: (borrador: Borrador) => Borrador) => void;
  alContinuar: () => void;
}) {
  const [quitando, setQuitando] = useState<CategoriaBorrador | null>(null);
  const [intentoAvanzar, setIntentoAvanzar] = useState(false);
  const [cerradas, setCerradas] = useState<Set<string>>(() =>
    contarPlatillos(borrador) > PLATILLOS_PARA_COLAPSAR ? new Set(borrador.categorias.slice(1).map((c) => c.clave)) : new Set(),
  );
  const problemas = useMemo(() => validar(borrador), [borrador]);
  const porClave = useMemo(() => {
    const mapa = new Map<string, Problema[]>();
    for (const p of problemas) mapa.set(p.clave, [...(mapa.get(p.clave) ?? []), p]);
    return mapa;
  }, [problemas]);
  const porRevisar = preciosPorRevisar(borrador);
  const total = contarPlatillos(borrador);
  const generales = porClave.get('') ?? SIN_PROBLEMAS;

  // Callbacks estables: las filas memorizadas no se repintan al teclear en otra.
  const onCambiar = useCallback(
    (clave: string, cambios: Partial<PlatilloBorrador>) => alCambiar((b) => operaciones.editarPlatillo(b, clave, cambios)),
    [alCambiar],
  );
  const onMover = useCallback(
    (clave: string, delta: -1 | 1) => alCambiar((b) => operaciones.moverPlatillo(b, clave, delta)),
    [alCambiar],
  );
  const onQuitar = useCallback((clave: string) => alCambiar((b) => operaciones.quitarPlatillo(b, clave)), [alCambiar]);

  // Al intentar avanzar con errores se abren las categorías que los tienen.
  useEffect(() => {
    if (!intentoAvanzar) return;
    setCerradas((actual) => {
      const siguiente = new Set(actual);
      for (const categoria of borrador.categorias) {
        const tiene = categoria.platillos.some((p) => porClave.has(p.clave)) || porClave.has(categoria.clave);
        if (tiene) siguiente.delete(categoria.clave);
      }
      return siguiente.size === actual.size ? actual : siguiente;
    });
  }, [intentoAvanzar, borrador.categorias, porClave]);

  function continuar() {
    if (problemas.length > 0) {
      setIntentoAvanzar(true);
      return;
    }
    alContinuar();
  }

  return (
    <section className={c.paso} aria-labelledby="titulo-revision">
      <header className={c.encabezadoPaso}>
        <h2 id="titulo-revision" className={c.tituloPaso}>
          Revisa tu carta
        </h2>
        <p className={c.textoPaso}>
          Corrige lo que haga falta. {total} {total === 1 ? 'platillo' : 'platillos'}
          {porRevisar > 0 ? ` · ${porRevisar} ${porRevisar === 1 ? 'precio por revisar' : 'precios por revisar'}` : ''}
        </p>
      </header>

      {(borrador.avisos.length > 0 || borrador.notas.length > 0) && (
        <aside className={c.avisos} aria-label="Avisos de la lectura">
          {[...borrador.avisos, ...borrador.notas].map((a) => (
            <p key={a}>{a}</p>
          ))}
        </aside>
      )}

      {borrador.categorias.map((categoria, i) => {
        const delCategoria = porClave.get(categoria.clave) ?? SIN_PROBLEMAS;
        const cerrada = cerradas.has(categoria.clave);
        const nombre = categoria.nombre || `Categoría ${i + 1}`;
        return (
          <section key={categoria.clave} className={c.categoria} aria-label={nombre}>
            <div className={c.categoriaCabecera}>
              <Campo
                etiqueta="Categoría"
                value={categoria.nombre}
                onChange={(ev) => alCambiar((b) => operaciones.renombrarCategoria(b, categoria.clave, ev.target.value))}
                error={delCategoria.find((p) => p.campo === 'nombre')?.mensaje ?? null}
              />
              <BotonesFila
                nombre={categoria.nombre || `categoría ${i + 1}`}
                primero={i === 0}
                ultimo={i === borrador.categorias.length - 1}
                alSubir={() => alCambiar((b) => operaciones.moverCategoria(b, categoria.clave, -1))}
                alBajar={() => alCambiar((b) => operaciones.moverCategoria(b, categoria.clave, 1))}
                alQuitar={() =>
                  categoria.platillos.length === 0
                    ? alCambiar((b) => operaciones.quitarCategoria(b, categoria.clave))
                    : setQuitando(categoria)
                }
              />
            </div>
            {categoria.platillos.length > 0 && (
              <Boton
                variante="fantasma"
                compacto
                className={c.alternar}
                aria-expanded={!cerrada}
                onClick={() =>
                  setCerradas((actual) => {
                    const siguiente = new Set(actual);
                    if (siguiente.has(categoria.clave)) siguiente.delete(categoria.clave);
                    else siguiente.add(categoria.clave);
                    return siguiente;
                  })
                }
              >
                {cerrada
                  ? `Mostrar ${categoria.platillos.length} ${categoria.platillos.length === 1 ? 'platillo' : 'platillos'} de ${nombre}`
                  : `Ocultar los platillos de ${nombre}`}
              </Boton>
            )}
            {cerrada && categoria.platillos.some((p) => porClave.has(p.clave)) && (
              <p className={c.problemasCategoria}>Hay platillos por corregir en esta categoría.</p>
            )}
            {categoria.platillos.length === 0 ? (
              <p className={c.ayuda}>Esta categoría no tiene platillos todavía.</p>
            ) : (
              !cerrada && (
                <ul className={c.platillos}>
                  {categoria.platillos.map((p, j) => (
                    <FilaPlatillo
                      key={p.clave}
                      platillo={p}
                      indice={j}
                      total={categoria.platillos.length}
                      problemas={porClave.get(p.clave) ?? SIN_PROBLEMAS}
                      onCambiar={onCambiar}
                      onMover={onMover}
                      onQuitar={onQuitar}
                    />
                  ))}
                </ul>
              )
            )}
            <Boton
              variante="secundario"
              compacto
              disabled={categoria.platillos.length >= TOPES.platillosPorCategoria}
              onClick={() => {
                alCambiar((b) => operaciones.agregarPlatillo(b, categoria.clave));
                setCerradas((actual) => {
                  if (!actual.has(categoria.clave)) return actual;
                  const siguiente = new Set(actual);
                  siguiente.delete(categoria.clave);
                  return siguiente;
                });
              }}
            >
              Agregar platillo a {categoria.nombre.trim() || 'esta categoría'}
            </Boton>
          </section>
        );
      })}

      <Boton
        variante="secundario"
        disabled={borrador.categorias.length >= TOPES.categorias}
        onClick={() => alCambiar((b) => operaciones.agregarCategoria(b))}
      >
        Agregar categoría
      </Boton>

      {intentoAvanzar && problemas.length > 0 && (
        <div className={c.mensajeError} role="alert">
          <p>
            {`Antes de seguir, corrige ${problemas.length} ${problemas.length === 1 ? 'detalle' : 'detalles'}: los campos marcados en rojo.`}
          </p>
          {generales.map((g) => (
            <p key={g.mensaje}>{g.mensaje}</p>
          ))}
        </div>
      )}
      <div className={c.acciones}>
        <Boton ancho onClick={continuar}>
          Continuar
        </Boton>
      </div>

      <HojaInferior
        abierta={quitando !== null}
        onCerrar={() => setQuitando(null)}
        titulo={`¿Quitar «${quitando?.nombre.trim() || 'esta categoría'}»?`}
        descripcion={
          quitando
            ? `Se quitarán también sus ${quitando.platillos.length} ${quitando.platillos.length === 1 ? 'platillo' : 'platillos'} de este borrador.`
            : undefined
        }
      >
        <div className={c.acciones}>
          <Boton
            ancho
            onClick={() => {
              if (quitando) alCambiar((b) => operaciones.quitarCategoria(b, quitando.clave));
              setQuitando(null);
            }}
          >
            Sí, quitar
          </Boton>
          <Boton ancho variante="fantasma" onClick={() => setQuitando(null)}>
            Conservar
          </Boton>
        </div>
      </HojaInferior>
    </section>
  );
}
