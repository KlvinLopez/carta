import { useMemo, useState } from 'react';

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

function FilaPlatillo({
  platillo,
  indice,
  total,
  problemas,
  cambiar,
  alMover,
  alQuitar,
}: {
  platillo: PlatilloBorrador;
  indice: number;
  total: number;
  problemas: Problema[];
  cambiar: (cambios: Partial<PlatilloBorrador>) => void;
  alMover: (delta: -1 | 1) => void;
  alQuitar: () => void;
}) {
  const nombreVisible = platillo.nombre.trim() || `platillo ${indice + 1}`;
  const errorDe = (campo: Problema['campo']) => problemas.find((p) => p.campo === campo)?.mensaje ?? null;
  const dudoso = !platillo.precioRevisado;
  return (
    <li className={[c.platillo, dudoso ? c.platilloDudoso : ''].filter(Boolean).join(' ')}>
      <div className={c.platilloCabecera}>
        <Campo
          etiqueta="Platillo"
          value={platillo.nombre}
          maxLength={TOPES.nombrePlatillo}
          onChange={(ev) => cambiar({ nombre: ev.target.value })}
          error={errorDe('nombre')}
        />
        <div className={c.precioBloque}>
          <Campo
            etiqueta="Precio"
            value={platillo.precio}
            inputMode="decimal"
            autoComplete="off"
            maxLength={12}
            onChange={(ev) => cambiar({ precio: ev.target.value, precioRevisado: true })}
            error={errorDe('precio')}
          />
        </div>
      </div>
      {dudoso && (
        <div className={c.avisoPrecio} role="note">
          <span>
            {leerPrecio(platillo.precio) === null
              ? 'No pudimos leer este precio. Escríbelo tú.'
              : 'No estamos seguros de este precio. Compáralo con tu carta.'}
          </span>
          {leerPrecio(platillo.precio) !== null && (
            <button
              type="button"
              className={c.botonSecundarioChico}
              onClick={() => cambiar({ precioRevisado: true })}
              aria-label={`Marcar el precio de ${nombreVisible} como correcto`}
            >
              Está bien
            </button>
          )}
        </div>
      )}
      {platillo.variantes.length > 0 && (
        <p className={c.variantes}>
          Variantes:{' '}
          {platillo.variantes.map((v) => `${v.nombre} $${String(v.precio).replace('.', ',')}`).join(' · ')}
        </p>
      )}
      <AreaTexto
        etiqueta="Descripción"
        rows={2}
        value={platillo.descripcion}
        maxLength={TOPES.descripcion}
        onChange={(ev) => cambiar({ descripcion: ev.target.value })}
        error={errorDe('descripcion')}
      />
      <div className={c.chipsPar}>
        <EditorChips
          etiqueta="Alérgenos"
          tono="alergeno"
          valores={platillo.alergenos}
          sugerencias={ALERGENOS_COMUNES}
          alCambiar={(alergenos) => cambiar({ alergenos })}
        />
        <EditorChips
          etiqueta="Etiquetas"
          tono="etiqueta"
          valores={platillo.etiquetas}
          sugerencias={ETIQUETAS_COMUNES}
          alCambiar={(etiquetas) => cambiar({ etiquetas })}
        />
      </div>
      <BotonesFila
        nombre={nombreVisible}
        primero={indice === 0}
        ultimo={indice === total - 1}
        alSubir={() => alMover(-1)}
        alBajar={() => alMover(1)}
        alQuitar={alQuitar}
      />
    </li>
  );
}

/** Paso 3 · Revisa: tabla editable por categoría. Nada se crea hasta el paso siguiente (AC-25.3). */
export default function PasoRevision({
  borrador,
  alCambiar,
  alContinuar,
}: {
  borrador: Borrador;
  alCambiar: (borrador: Borrador) => void;
  alContinuar: () => void;
}) {
  const [quitando, setQuitando] = useState<CategoriaBorrador | null>(null);
  const [intentoAvanzar, setIntentoAvanzar] = useState(false);
  const problemas = useMemo(() => validar(borrador), [borrador]);
  const porRevisar = preciosPorRevisar(borrador);
  const total = contarPlatillos(borrador);
  const generales = problemas.filter((p) => p.clave === '');

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

      {borrador.avisos.length > 0 && (
        <aside className={c.avisos} aria-label="Avisos de la lectura">
          {borrador.avisos.map((a) => (
            <p key={a}>{a}</p>
          ))}
        </aside>
      )}

      {borrador.categorias.map((categoria, i) => {
        const delCategoria = problemas.filter((p) => p.clave === categoria.clave);
        return (
          <section key={categoria.clave} className={c.categoria} aria-label={categoria.nombre || `Categoría ${i + 1}`}>
            <div className={c.categoriaCabecera}>
              <Campo
                etiqueta="Categoría"
                value={categoria.nombre}
                maxLength={TOPES.nombreCategoria}
                onChange={(ev) => alCambiar(operaciones.renombrarCategoria(borrador, categoria.clave, ev.target.value))}
                error={delCategoria[0]?.mensaje ?? null}
              />
              <BotonesFila
                nombre={categoria.nombre || `categoría ${i + 1}`}
                primero={i === 0}
                ultimo={i === borrador.categorias.length - 1}
                alSubir={() => alCambiar(operaciones.moverCategoria(borrador, categoria.clave, -1))}
                alBajar={() => alCambiar(operaciones.moverCategoria(borrador, categoria.clave, 1))}
                alQuitar={() =>
                  categoria.platillos.length === 0
                    ? alCambiar(operaciones.quitarCategoria(borrador, categoria.clave))
                    : setQuitando(categoria)
                }
              />
            </div>
            {categoria.platillos.length === 0 ? (
              <p className={c.ayuda}>Esta categoría no tiene platillos todavía.</p>
            ) : (
              <ul className={c.platillos}>
                {categoria.platillos.map((p, j) => (
                  <FilaPlatillo
                    key={p.clave}
                    platillo={p}
                    indice={j}
                    total={categoria.platillos.length}
                    problemas={problemas.filter((x) => x.clave === p.clave)}
                    cambiar={(cambios) => alCambiar(operaciones.editarPlatillo(borrador, p.clave, cambios))}
                    alMover={(delta) => alCambiar(operaciones.moverPlatillo(borrador, p.clave, delta))}
                    alQuitar={() => alCambiar(operaciones.quitarPlatillo(borrador, p.clave))}
                  />
                ))}
              </ul>
            )}
            <Boton
              variante="secundario"
              compacto
              disabled={categoria.platillos.length >= TOPES.platillosPorCategoria}
              onClick={() => alCambiar(operaciones.agregarPlatillo(borrador, categoria.clave))}
            >
              Agregar platillo a {categoria.nombre.trim() || 'esta categoría'}
            </Boton>
          </section>
        );
      })}

      <Boton
        variante="secundario"
        disabled={borrador.categorias.length >= TOPES.categorias}
        onClick={() => alCambiar(operaciones.agregarCategoria(borrador))}
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
              if (quitando) alCambiar(operaciones.quitarCategoria(borrador, quitando.clave));
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
