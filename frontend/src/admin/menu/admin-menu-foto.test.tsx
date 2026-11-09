import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorApi } from '../../compartido/http';
import { uuid } from '../../mocks/servicioMenuSimulado';
import * as foto from './foto';
import { calcularRecorte, esFotoValida, nombreRecortado } from './foto';
import { montarMenu } from './utilesPrueba';

describe('recorte cuadrado en el navegador (US-17)', () => {
  it('conserva el cuadrado del lado corto, centrado, y reduce a ≤ 2048 px', () => {
    expect(calcularRecorte(4000, 3000)).toEqual({ x: 500, y: 0, lado: 3000, salida: 2048 });
    expect(calcularRecorte(3000, 4000)).toEqual({ x: 0, y: 500, lado: 3000, salida: 2048 });
    expect(calcularRecorte(800, 600)).toEqual({ x: 100, y: 0, lado: 600, salida: 600 });
    expect(calcularRecorte(1200, 1200)).toEqual({ x: 0, y: 0, lado: 1200, salida: 1200 });
  });

  it('el encuadre se desplaza a lo largo del lado largo y nunca se sale de la foto', () => {
    expect(calcularRecorte(4000, 3000, 0).x).toBe(0);
    expect(calcularRecorte(4000, 3000, 1).x).toBe(1000);
    expect(calcularRecorte(4000, 3000, 7).x).toBe(1000);
    expect(calcularRecorte(4000, 3000, -3).x).toBe(0);
    expect(calcularRecorte(4000, 3000, Number.NaN).x).toBe(500);
    expect(calcularRecorte(3000, 4000, 1).y).toBe(1000);
  });

  it('acepta JPG, PNG y HEIC (también el HEIC sin tipo MIME) y rechaza lo demás', () => {
    const f = (nombre: string, tipo: string) => new File(['x'], nombre, { type: tipo });
    expect(esFotoValida(f('a.jpg', 'image/jpeg'))).toBe(true);
    expect(esFotoValida(f('a.png', 'image/png'))).toBe(true);
    expect(esFotoValida(f('a.heic', 'image/heic'))).toBe(true);
    expect(esFotoValida(f('IMG_1.HEIC', ''))).toBe(true);
    expect(esFotoValida(f('a.gif', 'image/gif'))).toBe(false);
    expect(esFotoValida(f('a.pdf', 'application/pdf'))).toBe(false);
    expect(esFotoValida(f('a.exe', ''))).toBe(false);
  });

  it('el archivo recortado se llama .jpg', () => {
    expect(nombreRecortado(new File(['x'], 'IMG_2041.HEIC'))).toBe('IMG_2041.jpg');
    expect(nombreRecortado(new File(['x'], '.png'))).toBe('platillo.jpg');
  });
});

const JPEG = () => new File(['\xff\xd8 datos'], 'pastor.jpg', { type: 'image/jpeg' });
const imagenFalsa = (ancho = 4000, alto = 3000): foto.ImagenLeida => ({
  fuente: {} as CanvasImageSource,
  ancho,
  alto,
  liberar: vi.fn(),
});

async function abrirFoto(opciones?: Parameters<typeof montarMenu>[0]) {
  const m = montarMenu(opciones);
  await screen.findByRole('heading', { name: /^Tacos/ });
  await m.u.click(screen.getByRole('button', { name: 'Editar Pastor' }));
  const h = await screen.findByRole('dialog', { name: 'Editar platillo' });
  await m.u.click(within(h).getByRole('button', { name: /(Agregar|Cambiar) foto/ }));
  await screen.findByRole('dialog', { name: 'Foto del platillo' });
  await screen.findByLabelText('Elegir foto'); // el trozo del recorte es perezoso
  return m;
}

describe('subida de foto desde el editor (US-17)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(foto, 'dibujarRecorte').mockReturnValue(true);
  });

  it('muestra la guía de captura: encuadre, luz y fondo', async () => {
    await abrirFoto();
    const guia = screen.getByRole('list', { name: 'Guía para una buena foto' });
    const pasos = within(guia).getAllByRole('listitem');
    expect(pasos).toHaveLength(3);
    expect(pasos.map((p) => p.querySelector('span')!.textContent)).toEqual(['Encuadre', 'Luz', 'Fondo']);
    for (const p of pasos) expect(p.querySelector('svg')).not.toBeNull();
    expect(screen.getByText(/Junto a una ventana y sin flash/)).toBeInTheDocument();
  });

  it('elige, recorta a cuadrado y sube por multipart con el campo `archivo`', async () => {
    const lectura = vi.spyOn(foto, 'leerImagen').mockResolvedValue(imagenFalsa());
    const recorte = new Blob(['cuadrada'], { type: 'image/jpeg' });
    const exportar = vi.spyOn(foto, 'exportarRecorte').mockResolvedValue(recorte);
    const { sim, u } = await abrirFoto();
    await u.upload(screen.getByLabelText('Elegir foto'), JPEG());
    expect(await screen.findByRole('img', { name: 'Vista previa de la foto recortada' })).toBeInTheDocument();
    expect(lectura).toHaveBeenCalledOnce();
    // El encuadre se mueve con un control, no con adivinar.
    const rango = screen.getByRole('slider', { name: 'Mover el encuadre' });
    expect(rango).toHaveValue('50');
    await u.click(screen.getByRole('button', { name: 'Usar esta foto' }));
    await waitFor(() => expect(sim.llamadasDe('subirFoto')).toHaveLength(1));
    const [id, blob, nombre] = sim.llamadasDe('subirFoto')[0]!.argumentos as [string, Blob, string];
    expect(id).toBe(uuid(101));
    expect(blob).toBe(recorte);
    expect(nombre).toBe('pastor.jpg');
    expect(exportar).toHaveBeenCalledWith(expect.anything(), 0.5);
    // De vuelta en los datos, con la foto ya puesta.
    const h = await screen.findByRole('dialog', { name: 'Editar platillo' });
    expect(within(h).getByRole('button', { name: 'Cambiar foto' })).toBeInTheDocument();
    expect(within(h).getByText('Pastor', { selector: 'p' })).toBeInTheDocument();
  });

  it('una foto cuadrada no ofrece mover el encuadre', async () => {
    vi.spyOn(foto, 'leerImagen').mockResolvedValue(imagenFalsa(1200, 1200));
    const { u } = await abrirFoto();
    await u.upload(screen.getByLabelText('Elegir foto'), JPEG());
    await screen.findByRole('img', { name: 'Vista previa de la foto recortada' });
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('rechaza en el cliente lo que no es una foto, sin llamar al servidor', async () => {
    const lectura = vi.spyOn(foto, 'leerImagen');
    const { sim } = await abrirFoto();
    // Un selector de archivos que ignora `accept` (arrastrar, o «todos los archivos»): `change` directo.
    fireEvent.change(screen.getByLabelText('Elegir foto'), {
      target: { files: [new File(['%PDF'], 'carta.pdf', { type: 'application/pdf' })] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Elige un JPG, PNG o HEIC.');
    expect(lectura).not.toHaveBeenCalled();
    expect(sim.llamadasDe('subirFoto')).toHaveLength(0);
  });

  it('un 415 o un 413 del servidor se muestran con su mensaje y se puede elegir otra', async () => {
    vi.spyOn(foto, 'leerImagen').mockResolvedValue(imagenFalsa());
    vi.spyOn(foto, 'exportarRecorte').mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }));
    const { sim, u } = await abrirFoto();
    sim.fallar('subirFoto', new ErrorApi(415, 'TIPO_NO_SOPORTADO', 'Ese archivo no es una imagen válida.'));
    await u.upload(screen.getByLabelText('Elegir foto'), JPEG());
    await u.click(await screen.findByRole('button', { name: 'Usar esta foto' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ese archivo no es una imagen válida.');
    // Reintentar con el mismo recorte ya funciona.
    await u.click(screen.getByRole('button', { name: 'Usar esta foto' }));
    await waitFor(() => expect(sim.llamadasDe('subirFoto')).toHaveLength(2));
    await screen.findByRole('dialog', { name: 'Editar platillo' });
  });

  it('si el navegador no sabe leer el formato (HEIC en Chrome) sube el original tal cual', async () => {
    vi.spyOn(foto, 'leerImagen').mockResolvedValue(null);
    const { sim, u } = await abrirFoto();
    const heic = new File(['heic'], 'IMG_1.heic', { type: 'image/heic' });
    await u.upload(screen.getByLabelText('Elegir foto'), heic);
    expect(await screen.findByText(/la subiremos tal cual/)).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Usar esta foto' }));
    await waitFor(() => expect(sim.llamadasDe('subirFoto')).toHaveLength(1));
    expect(sim.llamadasDe('subirFoto')[0]!.argumentos[1]).toBe(heic);
    expect(sim.llamadasDe('subirFoto')[0]!.argumentos[2]).toBe('IMG_1.heic');
  });

  it('y si además pesa más de 15 MB no la sube: lo dice antes de gastar datos', async () => {
    vi.spyOn(foto, 'leerImagen').mockResolvedValue(null);
    const { sim, u } = await abrirFoto();
    const grande = new File(['x'], 'enorme.heic', { type: 'image/heic' });
    Object.defineProperty(grande, 'size', { value: 16 * 1024 * 1024 });
    await u.upload(screen.getByLabelText('Elegir foto'), grande);
    expect(await screen.findByRole('alert')).toHaveTextContent('menos de 15 MB');
    expect(sim.llamadasDe('subirFoto')).toHaveLength(0);
  });

  it('quitar la foto pide confirmar y vuelve a la ilustración de la categoría', async () => {
    const { sim, u } = await abrirFoto({
      platillos: [
        {
          ...(await import('../../mocks/servicioMenuSimulado')).platilloDe(1, {
            nombre: 'Pastor',
            imagen_tipo: 'foto',
            foto_thumb_url: '/f/p.webp',
          }),
        },
      ],
    });
    await u.click(screen.getByRole('button', { name: 'Quitar la foto' }));
    expect(sim.llamadasDe('quitarFoto')).toHaveLength(0);
    await u.click(screen.getByRole('button', { name: 'Sí, quitar la foto' }));
    await waitFor(() => expect(sim.llamadasDe('quitarFoto')).toHaveLength(1));
    const h = await screen.findByRole('dialog', { name: 'Editar platillo' });
    expect(within(h).getByRole('button', { name: 'Agregar foto' })).toBeInTheDocument();
  });
});

describe('errores del servidor al subir la foto (T-1.4)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(foto, 'dibujarRecorte').mockReturnValue(true);
    vi.spyOn(foto, 'leerImagen').mockResolvedValue(imagenFalsa());
    vi.spyOn(foto, 'exportarRecorte').mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }));
  });

  it.each([
    [400, 'PAYLOAD_INVALIDO', 'La subida llegó incompleta. Inténtalo de nuevo.'],
    [408, 'SUBIDA_INCOMPLETA', 'La subida tardó demasiado. Revisa tu conexión e inténtalo de nuevo.'],
    [413, 'ARCHIVO_EXCEDE_LIMITE', 'La foto es demasiado grande.'],
    [422, 'IMAGEN_NO_VALIDA', 'No pudimos leer esa imagen.'],
    [503, 'SERVICIO_OCUPADO', 'Estamos recibiendo muchas fotos. Inténtalo en un momento.'],
    [503, 'ALMACEN_NO_DISPONIBLE', 'No pudimos guardar la foto ahora. Inténtalo más tarde.'],
  ])('un %i (%s) muestra el mensaje de la envoltura y se reintenta con el mismo recorte', async (estado, codigo, mensaje) => {
    const { sim, u } = await abrirFoto();
    sim.fallar('subirFoto', new ErrorApi(estado, codigo, mensaje));
    await u.upload(screen.getByLabelText('Elegir foto'), JPEG());
    await u.click(await screen.findByRole('button', { name: 'Usar esta foto' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(mensaje);
    // Sigue en el recorte (no perdió la foto elegida) y el reintento sube el mismo archivo.
    const primero = sim.llamadasDe('subirFoto')[0]!.argumentos[1];
    await u.click(screen.getByRole('button', { name: 'Usar esta foto' }));
    await waitFor(() => expect(sim.llamadasDe('subirFoto')).toHaveLength(2));
    expect(sim.llamadasDe('subirFoto')[1]!.argumentos[1]).toBe(primero);
    await screen.findByRole('dialog', { name: 'Editar platillo' });
  });
});

describe('el lienzo del recorte (exportarRecorte)', () => {
  it('dibuja el cuadrado calculado en un lienzo de lado ≤ 2048 y lo exporta como JPEG 0.9', async () => {
    vi.restoreAllMocks();
    const dibujos: unknown[][] = [];
    const lienzo = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: (...args: unknown[]) => dibujos.push(args) }),
      toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(new Blob(['j'], { type: 'image/jpeg' }))),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(lienzo as unknown as HTMLElement);
    const imagen = imagenFalsa(4000, 3000);
    const blob = await foto.exportarRecorte(imagen, 1);
    expect(blob).toBeInstanceOf(Blob);
    const esperado = calcularRecorte(4000, 3000, 1);
    expect(esperado.salida).toBe(2048);
    expect([lienzo.width, lienzo.height]).toEqual([2048, 2048]);
    // drawImage(fuente, sx, sy, lado, lado, 0, 0, salida, salida): el origen y el lado salen del recorte.
    expect(dibujos[0]!.slice(1)).toEqual([esperado.x, esperado.y, esperado.lado, esperado.lado, 0, 0, 2048, 2048]);
    expect(lienzo.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.9);
  });

  it('una foto chica no se agranda: sale al lado del recorte', async () => {
    vi.restoreAllMocks();
    const lienzo = { width: 0, height: 0, getContext: () => ({ drawImage: vi.fn() }), toBlob: (cb: (b: Blob | null) => void) => cb(new Blob(['j'])) };
    vi.spyOn(document, 'createElement').mockReturnValue(lienzo as unknown as HTMLElement);
    await foto.exportarRecorte(imagenFalsa(800, 600), 0.5);
    expect([lienzo.width, lienzo.height]).toEqual([600, 600]);
  });

  it('sin contexto 2D devuelve null (el editor lo dice en vez de subir nada)', async () => {
    vi.restoreAllMocks();
    vi.spyOn(document, 'createElement').mockReturnValue({ getContext: () => null } as unknown as HTMLElement);
    expect(await foto.exportarRecorte(imagenFalsa(), 0.5)).toBeNull();
  });
});
