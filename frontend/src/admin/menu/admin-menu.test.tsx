import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ErrorApi } from '../../compartido/http';
import { platilloDe, platillosSemilla, uuid } from '../../mocks/servicioMenuSimulado';
import { montarMenu } from './utilesPrueba';

const fila = (nombre: string) => screen.getByRole('button', { name: `Editar ${nombre}` }).closest('li')!;
const interruptor = (nombre: string, que: 'Disponible' | 'Activo') =>
  screen.getByRole('switch', { name: `${que}: ${nombre}` });

async function cargada(opciones?: Parameters<typeof montarMenu>[0]) {
  const m = montarMenu(opciones);
  await screen.findByRole('heading', { name: /^Tacos/ });
  return m;
}

describe('lista por categorías (US-16)', () => {
  it('agrupa por categoría en su orden, con precio, miniatura e interruptores', async () => {
    await cargada();
    const titulos = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titulos).toEqual(['Tacos3', 'Bebidas2', 'Postres1']);
    const pastor = fila('Pastor');
    expect(within(pastor).getByText('$22.00')).toBeInTheDocument();
    expect(within(pastor).getByRole('switch', { name: 'Disponible: Pastor' })).toHaveAttribute('aria-checked', 'true');
    expect(within(pastor).getByRole('switch', { name: 'Activo: Pastor' })).toHaveAttribute('aria-checked', 'true');
    // Sin foto: la ilustración de la categoría (no una imagen rota).
    expect(pastor.querySelector('img')).toBeNull();
    expect(pastor.querySelector('svg')).not.toBeNull();
    // El agotado se ve y se dice con palabras, no sólo con color.
    expect(within(fila('Agua de jamaica')).getByText('Agotado')).toBeInTheDocument();
    expect(interruptor('Agua de jamaica', 'Disponible')).toHaveAttribute('aria-checked', 'false');
  });

  it('muestra la foto del platillo cuando la tiene', async () => {
    await cargada({
      platillos: [platilloDe(1, { nombre: 'Pastor', imagen_tipo: 'foto', foto_thumb_url: '/f/pastor.webp' })],
    });
    expect(fila('Pastor').querySelector('img')).toHaveAttribute('src', '/f/pastor.webp');
  });

  it('una categoría se colapsa y se vuelve a abrir', async () => {
    const { u } = await cargada();
    const boton = screen.getByRole('button', { name: /Bebidas/ });
    expect(boton).toHaveAttribute('aria-expanded', 'true');
    await u.click(boton);
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Editar Horchata' })).not.toBeInTheDocument();
    await u.click(boton);
    expect(screen.getByRole('button', { name: 'Editar Horchata' })).toBeInTheDocument();
  });

  it('sin platillos muestra el estado vacío con salida al asistente y alta a mano', async () => {
    montarMenu({ platillos: [] });
    expect(await screen.findByRole('heading', { name: 'Tu carta aparecerá aquí' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Importar mi carta en PDF' })).toHaveAttribute('href', '/admin/alta');
    expect(screen.getByRole('button', { name: 'Agregar un platillo' })).toBeInTheDocument();
  });

  it('si la carga falla dice por qué y permite reintentar', async () => {
    const { sim, u } = montarMenu({ errores: { listarCategorias: new ErrorApi(500, 'ERROR_INTERNO', 'Falló del lado de Carta.') } });
    expect(await screen.findByRole('heading', { name: 'No pudimos cargar tu carta' })).toBeInTheDocument();
    expect(screen.getByText('Falló del lado de Carta.')).toBeInTheDocument();
    delete sim.errores.listarCategorias; // el servidor se recuperó
    await u.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: /^Tacos/ })).toBeInTheDocument();
  });

  it('pide las listas con skip/limit de 100 en 100 hasta que una venga corta', async () => {
    const muchos = Array.from({ length: 250 }, (_, i) => platilloDe(i + 1, { nombre: `P ${i + 1}`, orden: i + 1 }));
    const { sim } = montarMenu({ platillos: muchos });
    await screen.findByRole('heading', { name: /^Tacos/ });
    const paginas = sim.llamadasDe('listarPlatillos').map((l) => l.argumentos[1] as { activo: boolean; skip: number; limit: number });
    expect(paginas.filter((p) => p.activo)).toEqual([
      { activo: true, skip: 0, limit: 100 },
      { activo: true, skip: 100, limit: 100 },
      { activo: true, skip: 200, limit: 100 },
    ]);
    expect(paginas.filter((p) => !p.activo)).toEqual([{ activo: false, skip: 0, limit: 100 }]);
    expect(screen.getByRole('button', { name: /Activos \(250\)/ })).toBeInTheDocument();
  });
});

describe('interruptor «Disponible» (US-27, un toque, respuesta optimista)', () => {
  it('cambia al instante y deja el valor del servidor', async () => {
    const { sim, u } = await cargada();
    await u.click(interruptor('Pastor', 'Disponible'));
    // Optimista: la fila ya dice «Agotado» sin esperar nada más que el siguiente tick.
    await waitFor(() => expect(within(fila('Pastor')).getByText('Agotado')).toBeInTheDocument());
    expect(sim.llamadasDe('cambiarPlatillo').map((l) => l.argumentos)).toEqual([[uuid(101), { disponible: false }]]);
    await waitFor(() => expect(interruptor('Pastor', 'Disponible')).not.toBeDisabled());
    expect(interruptor('Pastor', 'Disponible')).toHaveAttribute('aria-checked', 'false');
  });

  it('si el servidor lo rechaza vuelve atrás y lo dice con el mensaje de la envoltura', async () => {
    const { sim, u } = await cargada();
    sim.fallar('cambiarPlatillo', new ErrorApi(404, 'NO_ENCONTRADO', 'No encontramos ese platillo.'));
    await u.click(interruptor('Pastor', 'Disponible'));
    expect(await screen.findByRole('alert')).toHaveTextContent('No encontramos ese platillo.');
    expect(interruptor('Pastor', 'Disponible')).toHaveAttribute('aria-checked', 'true');
    expect(within(fila('Pastor')).queryByText('Agotado')).not.toBeInTheDocument();
  });

  it('un platillo con una escritura en vuelo no acepta otro toque (la reversión nunca pisa un cambio nuevo)', async () => {
    const { sim, u } = await cargada();
    let soltar!: () => void;
    const original = sim.servicio.cambiarPlatillo;
    sim.servicio.cambiarPlatillo = (id, cambios, signal) =>
      new Promise((resolver) => {
        soltar = () => resolver(original(id, cambios, signal));
      });
    await u.click(interruptor('Pastor', 'Disponible'));
    expect(interruptor('Pastor', 'Disponible')).toBeDisabled();
    expect(interruptor('Pastor', 'Disponible')).toHaveAttribute('aria-busy', 'true');
    soltar();
    await waitFor(() => expect(interruptor('Pastor', 'Disponible')).not.toBeDisabled());
  });
});

describe('interruptor «Activo»: dar de baja con confirmación (AC-16.3, regla dura 9)', () => {
  it('pide confirmar en una hoja inferior y no llama al servidor hasta entonces', async () => {
    const { sim, u } = await cargada();
    await u.click(interruptor('Suadero', 'Activo'));
    const hoja = await screen.findByRole('dialog', { name: '¿Dar de baja Suadero?' });
    expect(within(hoja).getByText(/No se borra/)).toBeInTheDocument();
    expect(sim.llamadasDe('darDeBaja')).toHaveLength(0);
    await u.click(within(hoja).getByRole('button', { name: 'Mejor no' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sim.llamadasDe('darDeBaja')).toHaveLength(0);
    expect(interruptor('Suadero', 'Activo')).toHaveAttribute('aria-checked', 'true');
  });

  it('al confirmar da de baja (DELETE lógico), lo pasa a «Dados de baja» y se puede reactivar', async () => {
    const { sim, u } = await cargada();
    await u.click(interruptor('Suadero', 'Activo'));
    await u.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Dar de baja' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Editar Suadero' })).not.toBeInTheDocument());
    expect(sim.llamadasDe('darDeBaja').map((l) => l.argumentos)).toEqual([[uuid(102)]]);
    // El platillo sigue existiendo: está en «Dados de baja» (Tripa ya estaba).
    expect(screen.getByRole('button', { name: /Dados de baja \(2\)/ })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /Dados de baja/ }));
    expect(interruptor('Suadero', 'Activo')).toHaveAttribute('aria-checked', 'false');
    // Reactivar no destruye nada: un toque, sin confirmación.
    await u.click(interruptor('Suadero', 'Activo'));
    await waitFor(() =>
      expect(sim.llamadasDe('cambiarPlatillo').map((l) => l.argumentos)).toContainEqual([uuid(102), { activo: true }]),
    );
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Editar Suadero' })).not.toBeInTheDocument());
    await u.click(screen.getByRole('button', { name: /Activos/ }));
    expect(screen.getByRole('button', { name: 'Editar Suadero' })).toBeInTheDocument();
  });

  it('si la baja falla el platillo vuelve a estar activo y se avisa', async () => {
    const { sim, u } = await cargada();
    sim.fallar('darDeBaja', new ErrorApi(500, 'ERROR_INTERNO', 'Algo salió mal de nuestro lado.'));
    await u.click(interruptor('Suadero', 'Activo'));
    await u.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Dar de baja' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo salió mal de nuestro lado.');
    expect(interruptor('Suadero', 'Activo')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Editar Suadero' })).toBeInTheDocument();
  });

  it('nada de la pantalla borra un platillo: no hay botón «Eliminar»', async () => {
    await cargada();
    expect(screen.queryByRole('button', { name: /elimin|borrar/i })).not.toBeInTheDocument();
  });
});

describe('búsqueda por nombre (en el cliente, sobre lo cargado)', () => {
  it('ignora mayúsculas y acentos y abre las categorías con resultados', async () => {
    const { sim, u } = await cargada();
    const antes = sim.llamadasDe('listarPlatillos').length;
    await u.type(screen.getByRole('searchbox', { name: 'Buscar platillo' }), 'CECINA');
    expect(screen.getByRole('button', { name: 'Editar Cecina enchilada' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar Pastor' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Bebidas/ })).not.toBeInTheDocument();
    // Sin ir al servidor y sin asas de reordenar (el orden se enviaría incompleto).
    expect(sim.llamadasDe('listarPlatillos')).toHaveLength(antes);
    expect(screen.queryByRole('button', { name: /^Reordenar/ })).not.toBeInTheDocument();
  });

  it('encuentra «Horchata» tecleando «hórcháta» y dice cuando no hay nada', async () => {
    const { u } = await cargada();
    const caja = screen.getByRole('searchbox', { name: 'Buscar platillo' });
    await u.type(caja, 'hórcháta');
    expect(screen.getByRole('button', { name: 'Editar Horchata' })).toBeInTheDocument();
    await u.clear(caja);
    await u.type(caja, 'sushi');
    expect(await screen.findByText('No encontramos «sushi» en tu carta.')).toBeInTheDocument();
  });

  it('las bajas también se buscan', async () => {
    const { u } = await cargada();
    await u.click(screen.getByRole('button', { name: /Dados de baja/ }));
    expect(screen.getByRole('button', { name: 'Editar Tripa' })).toBeInTheDocument();
    expect(platillosSemilla.find((p) => p.nombre === 'Tripa')?.activo).toBe(false);
  });
});

describe('revisión de maestra: búsqueda, vistas y topes', () => {
  it('busqueda_con_varias_coincidencias_no_ofrece_asa: con búsqueda no se reordena aunque queden 2 o más', async () => {
    const { sim, u } = await cargada();
    expect(screen.getAllByRole('button', { name: /^Reordenar / }).length).toBeGreaterThan(0);
    await u.type(screen.getByRole('searchbox', { name: 'Buscar platillo' }), 'a');
    // «a» deja varias filas en Tacos (Pastor, Suadero, Cecina enchilada…) y en Bebidas.
    expect(screen.getAllByRole('button', { name: /^Editar / }).length).toBeGreaterThan(2);
    expect(screen.queryByRole('button', { name: /^Reordenar / })).not.toBeInTheDocument();
    expect(sim.llamadasDe('reordenarPlatillos')).toHaveLength(0);
  });

  it('un mensaje por vista: sin activos no dice que no hay bajas, y al revés', async () => {
    const soloBajas = [platilloDe(1, { nombre: 'Tripa', activo: false })];
    const { u } = montarMenu({ platillos: soloBajas });
    await u.click(await screen.findByRole('button', { name: /Activos \(0\)/ }));
    expect(screen.getByText(/No hay platillos activos/)).toBeInTheDocument();
    expect(screen.queryByText('No hay platillos dados de baja.')).not.toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /Dados de baja \(1\)/ }));
    expect(screen.queryByText(/No hay platillos activos/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar Tripa' })).toBeInTheDocument();
  });

  it('un nombre larguísimo se recorta en la lista (title con el completo) y va entero al editor', async () => {
    const largo = 'Súper '.repeat(30).trim();
    const { u } = montarMenu({ platillos: [platilloDe(1, { nombre: largo })] });
    const boton = await screen.findByRole('button', { name: `Editar ${largo}` });
    expect(boton).toHaveAttribute('title', largo);
    await u.click(boton);
    expect(within(await screen.findByRole('dialog')).getByRole('textbox', { name: 'Nombre' })).toHaveValue(largo);
  });

  it('al llegar al tope de páginas avisa que hay más y manda a la búsqueda', async () => {
    const enormes = Array.from({ length: 2100 }, (_, i) => platilloDe(i + 1, { nombre: `P ${i + 1}`, orden: i + 1 }));
    montarMenu({ platillos: enormes });
    // 21 páginas de 100: bajo carga tardan más que el plazo por defecto de `findBy`.
    expect(await screen.findByText(/Mostrando los primeros 2000 platillos/, undefined, { timeout: 15_000 })).toBeInTheDocument();
  }, 20_000);

  it('sin tope alcanzado no hay aviso', async () => {
    await cargada();
    expect(screen.queryByText(/Mostrando los primeros/)).not.toBeInTheDocument();
  });
});
