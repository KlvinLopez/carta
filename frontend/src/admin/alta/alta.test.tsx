import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { crearServicioSimulado, type OpcionesSimulado } from '../../mocks/servicioSimulado';
import { ErrorApi } from '../../compartido/http';
import { AsistenteConServicio } from './Asistente';
import * as descarga from './descarga';
import { INTERVALO_MS, AVISO_LENTO_MS, TOPE_MS } from './useSondeo';

const PDF = () => new File(['%PDF-1.4 carta'], 'carta.pdf', { type: 'application/pdf' });

async function avanzar(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function montar(opciones: OpcionesSimulado = {}) {
  const sim = crearServicioSimulado(opciones);
  const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(
    <MemoryRouter>
      <AsistenteConServicio servicio={sim.servicio} />
    </MemoryRouter>,
  );
  return { sim, u };
}

type U = ReturnType<typeof userEvent.setup>;

async function paso1(u: U, nombre = 'Taquería El Paso') {
  await u.type(screen.getByLabelText('Nombre del restaurante'), nombre);
  await u.click(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByRole('heading', { name: 'Sube tu carta' });
}

async function subir(u: U) {
  await u.upload(screen.getByLabelText('Elegir archivo'), PDF());
  await u.click(screen.getByRole('button', { name: 'Subir y leer mi carta' }));
}

async function hastaRevision(u: U) {
  await paso1(u);
  await subir(u);
  await screen.findByRole('heading', { name: 'Estamos leyendo tu carta' });
  await avanzar(INTERVALO_MS * 4);
  await u.click(await screen.findByRole('button', { name: 'Revisar mi carta' }));
  await screen.findByRole('heading', { name: 'Revisa tu carta' });
}

/** Corrige el único hueco que deja el borrador de ejemplo (la cecina no trae precio). */
async function ponerPrecioCecina(u: U) {
  const campo = within(filaPlatillo('Cecina enchilada')).getByLabelText('Precio');
  await u.clear(campo);
  await u.type(campo, '38,50');
}

function filaPlatillo(nombre: string): HTMLElement {
  const campo = screen
    .getAllByLabelText('Platillo')
    .find((el) => (el as HTMLInputElement).value === nombre);
  if (!campo) throw new Error(`No hay un platillo «${nombre}»`);
  return campo.closest('li') as HTMLElement;
}

beforeEach(() => {
  // `shouldAdvanceTime`: el reloj falso avanza solo en tiempo real, así `findBy*` (que usa temporizadores) no se cuelga.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  window.localStorage.clear();
  window.sessionStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});

describe('paso 1 · tu restaurante', () => {
  it('pide el nombre, valida el logo y crea el restaurante con el contrato', async () => {
    const { sim, u } = montar();
    expect(screen.getByText('Paso 1 de 7', { exact: false })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Escribe el nombre de tu restaurante.')).toBeInTheDocument();
    await u.type(screen.getByLabelText('Nombre del restaurante'), 'La Cocina');
    await u.type(screen.getByLabelText(/Enlace a tu logo/), 'http://inseguro.mx/l.png');
    await u.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText(/empiece con https/)).toBeInTheDocument();
    expect(sim.veces('crearRestaurante')).toBe(0);
    await u.clear(screen.getByLabelText(/Enlace a tu logo/));
    await u.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByRole('heading', { name: 'Sube tu carta' });
    expect(sim.ultima('crearRestaurante')!.argumentos[0]).toEqual({ nombre: 'La Cocina', logo_url: undefined });
  });

  it('un error de la API se explica con su mensaje de la envoltura, nunca con `detail`', async () => {
    const { sim, u } = montar();
    sim.fallarUnaVez('crearRestaurante', new ErrorApi(409, 'CONFLICTO', 'Ya existe un restaurante con ese nombre.'));
    await u.type(screen.getByLabelText('Nombre del restaurante'), 'La Cocina');
    await u.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe un restaurante con ese nombre.');
    expect(screen.getByRole('heading', { name: '¿Cómo se llama tu restaurante?' })).toBeInTheDocument();
  });
});

describe('paso 2 · tu carta', () => {
  it('AC-25.1: comprueba el tipo y el tamaño en el cliente y no sube lo que el servidor rechazaría', async () => {
    const { sim, u } = montar();
    await paso1(u);
    const entrada = screen.getByLabelText('Elegir archivo');
    fireEvent.change(entrada, { target: { files: [new File(['x'], 'carta.docx', { type: 'application/msword' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Sólo podemos leer cartas en PDF, JPG o PNG.');
    const enorme = new File(['x'], 'enorme.pdf', { type: 'application/pdf' });
    Object.defineProperty(enorme, 'size', { value: 21 * 1024 * 1024 });
    fireEvent.change(entrada, { target: { files: [enorme] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('más de 20 MB');
    expect(screen.getByRole('button', { name: 'Subir y leer mi carta' })).toBeDisabled();
    expect(sim.veces('subirCarta')).toBe(0);
  });

  it('sondea cada 3 s, muestra el progreso y pasa al borrador sin crear nada en el menú (AC-25.3)', async () => {
    const { sim, u } = montar({ consultasAntesDeTerminar: 2 });
    await paso1(u);
    await subir(u);
    expect(await screen.findByRole('status')).toHaveTextContent('Leyendo tu carta');
    expect(screen.getByText('Estamos leyendo tu carta…')).toBeInTheDocument();
    expect(sim.veces('consultarImportacion')).toBe(0);
    await avanzar(INTERVALO_MS - 500);
    expect(sim.veces('consultarImportacion')).toBe(0);
    await avanzar(1000);
    expect(sim.veces('consultarImportacion')).toBe(1);
    await avanzar(INTERVALO_MS);
    expect(sim.veces('consultarImportacion')).toBe(2);
    await avanzar(INTERVALO_MS);
    expect(await screen.findByRole('heading', { name: '¡Ya leímos tu carta!' })).toBeInTheDocument();
    expect(screen.getByText(/Encontramos 6 platillos en 3 categorías/)).toBeInTheDocument();
    // Terminó: no se sigue preguntando.
    await avanzar(INTERVALO_MS * 3);
    expect(sim.veces('consultarImportacion')).toBe(3);
    expect(sim.veces('confirmarImportacion')).toBe(0);
  });

  it('ADR-004: con la pestaña en segundo plano no pregunta y al volver pregunta al instante', async () => {
    const { sim, u } = montar({ consultasAntesDeTerminar: 10 });
    await paso1(u);
    await subir(u);
    await avanzar(INTERVALO_MS);
    expect(sim.veces('consultarImportacion')).toBe(1);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    await avanzar(INTERVALO_MS * 5);
    expect(sim.veces('consultarImportacion')).toBe(1);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(sim.veces('consultarImportacion')).toBe(2);
    await avanzar(INTERVALO_MS);
    expect(sim.veces('consultarImportacion')).toBe(3);
  });

  it('AC-25.2: pasados 3 minutos avisa que tarda y ofrece capturar a mano; al tope deja de preguntar', async () => {
    const { sim, u } = montar({ sinTerminar: true });
    await paso1(u);
    await subir(u);
    await avanzar(AVISO_LENTO_MS - INTERVALO_MS);
    expect(screen.queryByText(/tardando más de lo normal/)).not.toBeInTheDocument();
    await avanzar(INTERVALO_MS * 2);
    expect(screen.getByText(/tardando más de lo normal/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Capturar a mano' })).toBeInTheDocument();
    await avanzar(TOPE_MS - AVISO_LENTO_MS + INTERVALO_MS);
    expect(await screen.findByText(/Dejamos de revisar/)).toBeInTheDocument();
    const consultas = sim.veces('consultarImportacion');
    await avanzar(INTERVALO_MS * 10);
    expect(sim.veces('consultarImportacion')).toBe(consultas);
    await u.click(screen.getByRole('button', { name: 'Seguir esperando' }));
    await avanzar(INTERVALO_MS);
    expect(sim.veces('consultarImportacion')).toBe(consultas + 1);
  });

  it('AC-25.4: si la extracción falla explica la causa y deja reintentar o capturar a mano', async () => {
    const { sim, u } = montar({ final: 'fallido', consultasAntesDeTerminar: 0, errorMensaje: 'La carta venía protegida con contraseña.' });
    await paso1(u);
    await subir(u);
    await avanzar(INTERVALO_MS);
    expect(await screen.findByRole('heading', { name: 'No pudimos leer tu carta' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('La carta venía protegida con contraseña.');
    expect(screen.getByRole('button', { name: 'Subir otro archivo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Capturar mis platillos a mano' })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(sim.veces('reintentarImportacion')).toBe(1);
    expect(await screen.findByRole('heading', { name: 'Estamos leyendo tu carta' })).toBeInTheDocument();
  });

  it('AC-25.4: «capturar a mano» sigue con las mesas y el final lo dice', async () => {
    const { u } = montar({ final: 'fallido', consultasAntesDeTerminar: 0 });
    await paso1(u);
    await u.click(screen.getByRole('button', { name: 'Prefiero capturarla a mano' }));
    expect(await screen.findByRole('heading', { name: '¿Cuántas mesas tienes?' })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Omitir por ahora' }));
    await u.click(screen.getByRole('button', { name: 'Omitir por ahora' }));
    expect(await screen.findByText(/Captura tus platillos a mano desde la sección Menú/)).toBeInTheDocument();
  });

  it('varias consultas sin red avisan sin abandonar la importación', async () => {
    const { sim, u } = montar({ consultasAntesDeTerminar: 1 });
    await paso1(u);
    await subir(u);
    for (let i = 0; i < 3; i += 1) {
      sim.fallarUnaVez('consultarImportacion', new ErrorApi(0, 'SIN_RED', 'sin red'));
    }
    await avanzar(INTERVALO_MS * 3);
    expect(await screen.findByText(/Perdimos la conexión/)).toBeInTheDocument();
    await avanzar(INTERVALO_MS * 3);
    expect(screen.queryByText(/Perdimos la conexión/)).not.toBeInTheDocument();
  });
});

describe('paso 3 · revisa', () => {
  it('AC-25.5: resalta el precio dudoso o ausente; «Está bien» o corregirlo quita el aviso', async () => {
    const { u } = montar();
    await hastaRevision(u);
    expect(screen.getByText(/2 precios por revisar/)).toBeInTheDocument();
    const suadero = filaPlatillo('Suadero');
    expect(within(suadero).getByRole('note')).toHaveTextContent('No estamos seguros de este precio');
    const cecina = filaPlatillo('Cecina enchilada');
    expect(within(cecina).getByRole('note')).toHaveTextContent('No pudimos leer este precio');
    // Sin precio no se ofrece «Está bien»: hay que escribirlo.
    expect(within(cecina).queryByRole('button', { name: /como correcto/ })).not.toBeInTheDocument();
    expect(within(filaPlatillo('Pastor')).queryByRole('note')).not.toBeInTheDocument();

    await u.click(within(suadero).getByRole('button', { name: 'Marcar el precio de Suadero como correcto' }));
    expect(within(filaPlatillo('Suadero')).queryByRole('note')).not.toBeInTheDocument();
    await ponerPrecioCecina(u);
    expect(within(filaPlatillo('Cecina enchilada')).queryByRole('note')).not.toBeInTheDocument();
    expect(screen.queryByText(/precios? por revisar/)).not.toBeInTheDocument();
  });

  it('AC-25.3: edita nombre, descripción, alérgenos y etiquetas como chips; nada se crea todavía', async () => {
    const { sim, u } = montar();
    await hastaRevision(u);
    const gringa = filaPlatillo('Gringa');
    await u.clear(within(gringa).getByLabelText('Descripción'));
    await u.type(within(gringa).getByLabelText('Descripción'), 'harina, queso y pastor');
    // Quitar un alérgeno sugerido y agregar uno nuevo por Enter.
    await u.click(within(gringa).getByRole('button', { name: 'Quitar Gluten de alérgenos' }));
    await u.type(within(gringa).getByRole('textbox', { name: 'Alérgenos' }), 'Frutos secos{Enter}');
    const chips = within(within(gringa).getByRole('list', { name: 'Alérgenos' }));
    expect(chips.getByText('Lacteos')).toBeInTheDocument();
    expect(chips.getByText('Frutos secos')).toBeInTheDocument();
    expect(chips.queryByText('Gluten')).not.toBeInTheDocument();
    // Etiqueta desde una sugerencia.
    await u.click(within(gringa).getByRole('textbox', { name: 'Etiquetas' }));
    await u.click(within(gringa).getByRole('button', { name: '+ Picante' }));
    expect(within(within(gringa).getByRole('list', { name: 'Etiquetas' })).getByText('Picante')).toBeInTheDocument();
    expect(sim.veces('confirmarImportacion')).toBe(0);
  });

  it('agrega y quita filas, reordena por categoría y confirma el JSON revisado', async () => {
    const { sim, u } = montar();
    await hastaRevision(u);
    await ponerPrecioCecina(u);
    // Reordenar: Suadero baja un lugar.
    await u.click(within(filaPlatillo('Suadero')).getByRole('button', { name: 'Bajar Suadero' }));
    // Quitar Pastor.
    await u.click(within(filaPlatillo('Pastor')).getByRole('button', { name: 'Quitar Pastor' }));
    // Agregar un platillo a Bebidas.
    await u.click(screen.getByRole('button', { name: 'Agregar platillo a Bebidas' }));
    const nuevos = screen.getAllByLabelText('Platillo').filter((el) => (el as HTMLInputElement).value === '');
    expect(nuevos).toHaveLength(1);
    await u.type(nuevos[0]!, 'Cerveza');
    await u.type(within(nuevos[0]!.closest('li') as HTMLElement).getByLabelText('Precio'), '45');
    // Categoría nueva, subida arriba del todo.
    await u.click(screen.getByRole('button', { name: 'Agregar categoría' }));
    const vacia = screen.getAllByLabelText('Categoría').at(-1)!;
    await u.type(vacia, 'Postres');
    for (let i = 0; i < 3; i += 1) {
      await u.click(screen.getByRole('button', { name: 'Subir Postres' }));
    }
    expect((screen.getAllByLabelText('Categoría')[0] as HTMLInputElement).value).toBe('Postres');
    // Una categoría sin platillos no llega al menú: se descarta al confirmar.
    await u.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByRole('heading', { name: '¿Todo listo para crear tu menú?' })).toBeInTheDocument();
    expect(sim.veces('confirmarImportacion')).toBe(0);
    expect(screen.getByText('Categorías').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('Platillos').nextSibling).toHaveTextContent('6');

    await u.click(screen.getByRole('button', { name: 'Confirmar y crear mi menú' }));
    await screen.findByRole('heading', { name: '¿Cuántas mesas tienes?' });
    const [, cuerpo] = sim.ultima('confirmarImportacion')!.argumentos as [string, { categorias: { nombre: string; orden: number; platillos: { nombre: string; precio: number | null; precio_confianza: string }[] }[] }];
    expect(cuerpo.categorias.map((c) => [c.nombre, c.orden])).toEqual([
      ['Tacos', 1],
      ['Especialidades', 2],
      ['Bebidas', 3],
    ]);
    expect(cuerpo.categorias[0]!.platillos.map((p) => p.nombre)).toEqual(['Cecina enchilada', 'Suadero']);
    expect(cuerpo.categorias[0]!.platillos[0]).toMatchObject({ nombre: 'Cecina enchilada', precio: 38.5, precio_confianza: 'alta' });
    expect(cuerpo.categorias[2]!.platillos.at(-1)).toMatchObject({ nombre: 'Cerveza', precio: 45 });
    // Suadero no se tocó: sigue dudoso y viaja con su confianza original.
    expect(cuerpo.categorias[0]!.platillos[1]).toMatchObject({ nombre: 'Suadero', precio_confianza: 'baja' });
    expect(JSON.stringify(cuerpo)).not.toContain('Postres');
  });

  it('quitar una categoría con platillos pide confirmar en una hoja inferior', async () => {
    const { u } = montar();
    await hastaRevision(u);
    await u.click(screen.getByRole('button', { name: 'Quitar Bebidas' }));
    const hoja = await screen.findByRole('dialog', { name: '¿Quitar «Bebidas»?' });
    await u.click(within(hoja).getByRole('button', { name: 'Conservar' }));
    expect(screen.getAllByLabelText('Categoría')).toHaveLength(3);
    await u.click(screen.getByRole('button', { name: 'Quitar Bebidas' }));
    await u.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sí, quitar' }));
    expect(screen.getAllByLabelText('Categoría')).toHaveLength(2);
  });

  it('no deja continuar con un precio vacío o inválido', async () => {
    const { u } = montar();
    await hastaRevision(u);
    await u.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Falta el precio.')).toBeInTheDocument();
    await u.type(within(filaPlatillo('Cecina enchilada')).getByLabelText('Precio'), 'mucho');
    expect(await screen.findByText(/precio válido/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '¿Todo listo para crear tu menú?' })).not.toBeInTheDocument();
  });
});

describe('paso 4 · confirmar', () => {
  async function hastaConfirmar(u: U) {
    await hastaRevision(u);
    await ponerPrecioCecina(u);
    await u.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByRole('heading', { name: '¿Todo listo para crear tu menú?' });
  }

  it('«Seguir editando» vuelve a la revisión sin perder los cambios', async () => {
    const { u } = montar();
    await hastaConfirmar(u);
    await u.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(within(filaPlatillo('Cecina enchilada')).getByLabelText('Precio')).toHaveValue('38,50');
  });

  it('un 409 por una respuesta perdida no atora: si ya está confirmada, sigue', async () => {
    const { sim, u } = montar();
    await hastaConfirmar(u);
    await u.click(screen.getByRole('button', { name: 'Confirmar y crear mi menú' }));
    await screen.findByRole('heading', { name: '¿Cuántas mesas tienes?' });
    expect(sim.veces('confirmarImportacion')).toBe(1);
  });

  it('un error al confirmar se explica y permite reintentar', async () => {
    const { sim, u } = montar();
    await hastaConfirmar(u);
    sim.fallarUnaVez('confirmarImportacion', new ErrorApi(422, 'PAYLOAD_INVALIDO', 'Hay un precio que no podemos guardar.'));
    await u.click(screen.getByRole('button', { name: 'Confirmar y crear mi menú' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Hay un precio que no podemos guardar.');
    await u.click(screen.getByRole('button', { name: 'Confirmar y crear mi menú' }));
    await screen.findByRole('heading', { name: '¿Cuántas mesas tienes?' });
  });
});

describe('pasos 5 a 7 · mesas, personal y listo', () => {
  async function hastaMesas(u: U) {
    await paso1(u);
    await u.click(screen.getByRole('button', { name: 'Prefiero capturarla a mano' }));
    await screen.findByRole('heading', { name: '¿Cuántas mesas tienes?' });
  }

  it('crea las mesas con la cantidad elegida y descarga el PDF de QR con el token', async () => {
    const guardar = vi.spyOn(descarga, 'guardarComoArchivo').mockImplementation(() => {});
    const { sim, u } = montar();
    await hastaMesas(u);
    await u.click(screen.getByRole('button', { name: 'Más mesas' }));
    await u.click(screen.getByRole('button', { name: 'Más mesas' }));
    expect(screen.getByRole('spinbutton', { name: 'Mesas' })).toHaveValue(10);
    await u.click(screen.getByRole('button', { name: 'Crear mesas' }));
    expect(await screen.findByText(/Creamos 10 mesas/)).toBeInTheDocument();
    expect(sim.ultima('crearMesas')!.argumentos[0]).toEqual({ cantidad: 10, capacidad: 4 });
    await u.click(screen.getByRole('button', { name: 'Descargar PDF de QR' }));
    await waitFor(() => expect(guardar).toHaveBeenCalledOnce());
    const [blob, nombre] = guardar.mock.calls[0]!;
    expect((blob as Blob).type).toBe('application/pdf');
    expect(nombre).toBe('qr-mesas.pdf');
  });

  it('acota la cantidad de mesas a 1–100', async () => {
    const { u } = montar();
    await hastaMesas(u);
    const campo = screen.getByRole('spinbutton', { name: 'Mesas' });
    fireEvent.change(campo, { target: { value: '500' } });
    expect(campo).toHaveValue(100);
    expect(screen.getByRole('button', { name: 'Más mesas' })).toBeDisabled();
    fireEvent.change(campo, { target: { value: '0' } });
    expect(campo).toHaveValue(1);
  });

  it('un fallo al crear o descargar se explica y no pierde el paso', async () => {
    vi.spyOn(descarga, 'guardarComoArchivo').mockImplementation(() => {});
    const { sim, u } = montar();
    await hastaMesas(u);
    sim.fallarUnaVez('crearMesas', new ErrorApi(0, 'SIN_RED', 'No pudimos conectar con Carta.'));
    await u.click(screen.getByRole('button', { name: 'Crear mesas' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar con Carta.');
    await u.click(screen.getByRole('button', { name: 'Crear mesas' }));
    await screen.findByText(/Creamos 8 mesas/);
    sim.fallarUnaVez('descargarQr', new ErrorApi(404, 'RECURSO_NO_ENCONTRADO', 'No encontramos tus mesas.'));
    await u.click(screen.getByRole('button', { name: 'Descargar PDF de QR' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No encontramos tus mesas.');
  });

  it('personal: valida el PIN de 4 a 6 dígitos y sólo acepta números', async () => {
    const { sim, u } = montar();
    await hastaMesas(u);
    await u.click(screen.getByRole('button', { name: 'Omitir por ahora' }));
    await screen.findByRole('heading', { name: 'Tu equipo' });
    await u.type(screen.getByLabelText('Nombre'), 'Luis');
    const pin = screen.getByLabelText('PIN (4 a 6 números)');
    expect(pin).toHaveAttribute('type', 'password');
    await u.type(pin, '12ab3');
    expect(pin).toHaveValue('123');
    await u.click(screen.getByRole('button', { name: 'Agregar persona' }));
    expect(await screen.findByText('El PIN lleva de 4 a 6 números.')).toBeInTheDocument();
    expect(sim.veces('crearPersonal')).toBe(0);
  });

  it('personal: el PIN se borra al enviarlo, no se guarda en el navegador ni se muestra', async () => {
    const { sim, u } = montar();
    await hastaMesas(u);
    await u.click(screen.getByRole('button', { name: 'Omitir por ahora' }));
    await u.type(screen.getByLabelText('Nombre'), 'Luis');
    await u.click(screen.getByRole('button', { name: 'Capitán' }));
    await u.type(screen.getByLabelText('PIN (4 a 6 números)'), '482913');
    await u.click(screen.getByRole('button', { name: 'Agregar persona' }));
    const lista = await screen.findByRole('list', { name: 'Personal agregado' });
    expect(within(lista).getByText('Luis')).toBeInTheDocument();
    expect(within(lista).getByText('Capitán')).toBeInTheDocument();
    expect(screen.getByLabelText('PIN (4 a 6 números)')).toHaveValue('');
    expect(screen.getByLabelText('Nombre')).toHaveValue('');
    expect(document.body.textContent).not.toContain('482913');
    expect(JSON.stringify([...Object.entries(window.localStorage), ...Object.entries(window.sessionStorage)])).not.toContain('482913');
    expect(JSON.stringify(sim.llamadas)).not.toContain('482913');
  });

  it('personal: si falla, vacía el PIN, explica y pide volver a escribirlo', async () => {
    const { sim, u } = montar();
    await hastaMesas(u);
    await u.click(screen.getByRole('button', { name: 'Omitir por ahora' }));
    sim.fallarUnaVez('crearPersonal', new ErrorApi(422, 'PAYLOAD_INVALIDO', 'Ese PIN es muy fácil de adivinar.'));
    await u.type(screen.getByLabelText('Nombre'), 'Luis');
    await u.type(screen.getByLabelText('PIN (4 a 6 números)'), '1234');
    await u.click(screen.getByRole('button', { name: 'Agregar persona' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ese PIN es muy fácil de adivinar. Vuelve a escribir el PIN.');
    expect(screen.getByLabelText('PIN (4 a 6 números)')).toHaveValue('');
  });

  it('recorre los siete pasos y termina con los enlaces del menú y del personal', async () => {
    vi.spyOn(descarga, 'guardarComoArchivo').mockImplementation(() => {});
    const { sim, u } = montar();
    await hastaRevision(u);
    await ponerPrecioCecina(u);
    await u.click(screen.getByRole('button', { name: 'Continuar' }));
    await u.click(await screen.findByRole('button', { name: 'Confirmar y crear mi menú' }));
    await u.click(await screen.findByRole('button', { name: 'Crear mesas' }));
    await u.click(await screen.findByRole('button', { name: 'Continuar' }));
    await u.type(await screen.findByLabelText('Nombre'), 'Luis');
    await u.type(screen.getByLabelText('PIN (4 a 6 números)'), '4821');
    await u.click(screen.getByRole('button', { name: 'Agregar persona' }));
    await u.click(await screen.findByRole('button', { name: 'Continuar' }));
    expect(await screen.findByRole('heading', { name: '¡Taquería El Paso está listo!' })).toBeInTheDocument();
    expect(screen.getByText('Paso 7 de 7', { exact: false })).toBeInTheDocument();
    const menu = screen.getByRole('link', { name: /carta\.cooking\/m\// });
    expect(menu).toHaveAttribute('href', 'https://carta.cooking/m/Jx3k9QwLmN2pR7sT4vY8z1');
    expect(screen.getByRole('link', { name: new RegExp(`/staff/taqueria-el-paso$`) })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a mi panel' })).toHaveAttribute('href', '/admin/menu');
    expect(sim.veces('confirmarImportacion')).toBe(1);
  });
});

describe('ruta /admin/alta', () => {
  it('se llega desde «Crear mi restaurante» y exige sesión: el asistente es un trozo aparte', async () => {
    vi.useRealTimers();
    const Area = (await import('../Area')).default;
    let alCambiar: (usuario: { correo: string; nombre: string } | null, token: string | null) => void = () => {};
    const proveedor = {
      entrarConGoogle: vi.fn(),
      enviarEnlace: vi.fn(),
      esEnlace: vi.fn(async () => false),
      completarEnlace: vi.fn(),
      renovar: vi.fn(async () => 'tok'),
      salir: vi.fn(async () => alCambiar(null, null)),
      suscribir: vi.fn((cambio: typeof alCambiar) => {
        alCambiar = cambio;
        return () => {};
      }),
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })),
    );
    render(
      <MemoryRouter initialEntries={['/admin/alta']}>
        <Routes>
          <Route path="/admin/*" element={<Area fabrica={async () => proveedor} />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(proveedor.suscribir).toHaveBeenCalled());
    act(() => alCambiar({ correo: 'ana@ejemplo.mx', nombre: 'Ana' }, 'tok'));
    // El trozo del asistente se descarga al entrar: la primera vez tarda más que un `findBy` normal.
    expect(
      await screen.findByRole('heading', { name: '¿Cómo se llama tu restaurante?' }, { timeout: 8000 }),
    ).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
