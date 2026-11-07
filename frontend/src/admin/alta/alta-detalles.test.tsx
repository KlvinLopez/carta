import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorApi, crearCliente } from '../../compartido/http';
import { menuSemilla } from '../../mocks/menuSemilla';
import { crearServicioSimulado } from '../../mocks/servicioSimulado';
import { AsistenteConServicio } from './Asistente';
import { validarArchivo, validarFirma } from './archivo';
import { aBorrador, operaciones, platilloVacio, categoriaVacia, type Borrador } from './borrador';
import { guardarComoArchivo } from './descarga';
import PasoConfirmar from './PasoConfirmar';
import PasoListo, { esUrlWeb } from './PasoListo';
import PasoRevision, { instrumentacion } from './PasoRevision';
import { crearServicioAlta } from './servicio';

type U = ReturnType<typeof userEvent.setup>;

function montar(opciones: Parameters<typeof crearServicioSimulado>[0] = {}) {
  const sim = crearServicioSimulado(opciones);
  const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(
    <MemoryRouter>
      <AsistenteConServicio servicio={sim.servicio} />
    </MemoryRouter>,
  );
  return { sim, u };
}
async function avanzar(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}
async function hastaCarta(u: U) {
  await u.type(screen.getByLabelText('Nombre del restaurante'), 'Taquería El Paso');
  await u.click(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByRole('heading', { name: 'Sube tu carta' });
}
async function hastaConfirmar(u: U) {
  await hastaCarta(u);
  await u.upload(screen.getByLabelText('Elegir archivo'), new File(['%PDF-1.4 x'], 'c.pdf', { type: 'application/pdf' }));
  await u.click(await screen.findByRole('button', { name: 'Subir y leer mi carta' }));
  await avanzar(4000);
  await u.click(await screen.findByRole('button', { name: 'Revisar mi carta' }));
  const cecina = (await screen.findAllByLabelText('Platillo')).find((el) => (el as HTMLInputElement).value === 'Cecina enchilada')!.closest('li') as HTMLElement;
  await u.type(within(cecina).getByLabelText('Precio'), '38');
  await u.click(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByRole('heading', { name: '¿Todo listo para crear tu menú?' });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  window.sessionStorage.clear();
  window.localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('B3 · el archivo se valida por contenido antes de subir', () => {
  it('tipo, tamaño exacto y extensión con `type` vacío', () => {
    expect(validarArchivo({ name: 'virus.exe', type: '', size: 10 })).toMatch(/PDF, JPG o PNG/);
    expect(validarArchivo({ name: 'sin-extension', type: '', size: 10 })).toMatch(/PDF, JPG o PNG/);
    expect(validarArchivo({ name: 'c.pdf', type: 'application/pdf', size: 20 * 1024 * 1024 - 1 })).toBeNull();
  });

  it('firma: %PDF-, JPEG y PNG pasan; un ejecutable renombrado a .pdf no', async () => {
    expect(await validarFirma(new Blob(['%PDF-1.7 hola']))).toBeNull();
    expect(await validarFirma(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])]))).toBeNull();
    expect(await validarFirma(new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d])]))).toBeNull();
    expect(await validarFirma(new Blob(['MZ\x90\x00 programa']))).toMatch(/no parece ser un PDF/);
    expect(await validarFirma(new Blob([]))).toMatch(/no parece ser un PDF/);
  });

  it('en pantalla: un .pdf que no lo es no se sube', async () => {
    const { sim, u } = montar();
    await hastaCarta(u);
    const entrada = screen.getByLabelText('Elegir archivo');
    fireEvent.change(entrada, { target: { files: [new File(['MZ binario'], 'carta.pdf', { type: 'application/pdf' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('no parece ser un PDF, JPG o PNG');
    expect(screen.getByRole('button', { name: 'Subir y leer mi carta' })).toBeDisabled();
    fireEvent.change(entrada, { target: { files: [new File(['x'], 'virus.exe', { type: '' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Sólo podemos leer cartas en PDF, JPG o PNG.');
    expect(sim.veces('subirCarta')).toBe(0);
  });
});

describe('B6 · subir y «capturar a mano» no se pisan', () => {
  it('mientras sube, «Prefiero capturarla a mano» está deshabilitado y el doble toque es un solo POST', async () => {
    let soltar: () => void = () => {};
    const sim = crearServicioSimulado();
    const original = sim.servicio.subirCarta;
    sim.servicio.subirCarta = (rid, archivo, signal) =>
      new Promise((resolver, rechazar) => {
        signal?.addEventListener('abort', () => rechazar(new DOMException('abortado', 'AbortError')));
        soltar = () => void original(rid, archivo, signal).then(resolver);
      });
    const llamadas = vi.spyOn(sim.servicio, 'subirCarta');
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <MemoryRouter>
        <AsistenteConServicio servicio={sim.servicio} />
      </MemoryRouter>,
    );
    await hastaCarta(u);
    await u.upload(screen.getByLabelText('Elegir archivo'), new File(['%PDF-1.4'], 'c.pdf', { type: 'application/pdf' }));
    const subir = await screen.findByRole('button', { name: 'Subir y leer mi carta' });
    await u.click(subir);
    await u.click(subir);
    expect(llamadas).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Prefiero capturarla a mano' })).toBeDisabled();
    // Cancelar al desmontar: la señal se aborta.
    const señal = llamadas.mock.calls[0]![2] as AbortSignal;
    expect(señal.aborted).toBe(false);
    soltar();
  });

  it('desmontar con la subida en vuelo aborta la petición', async () => {
    const sim = crearServicioSimulado();
    const llamadas = vi.spyOn(sim.servicio, 'subirCarta').mockImplementation(() => new Promise(() => {}));
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const vista = render(
      <MemoryRouter>
        <AsistenteConServicio servicio={sim.servicio} />
      </MemoryRouter>,
    );
    await hastaCarta(u);
    await u.upload(screen.getByLabelText('Elegir archivo'), new File(['%PDF-1.4'], 'c.pdf', { type: 'application/pdf' }));
    await u.click(await screen.findByRole('button', { name: 'Subir y leer mi carta' }));
    const señal = llamadas.mock.calls[0]![2] as AbortSignal;
    vista.unmount();
    expect(señal.aborted).toBe(true);
  });
});

describe('B10/B11 · confirmar con 409', () => {
  it('409 y la importación sí está confirmada: avisa «ya se había confirmado» y sigue a Mesas', async () => {
    const { sim, u } = montar({ consultasAntesDeTerminar: 0 });
    await hastaConfirmar(u);
    sim.fallarUnaVez('confirmarImportacion', new ErrorApi(409, 'CONFLICTO', 'Ya confirmada.'));
    sim.marcarConfirmada();
    await u.click(screen.getByRole('button', { name: 'Confirmar y crear mi menú' }));
    expect(await screen.findByRole('heading', { name: '¿Cuántas mesas tienes?' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('ya se había confirmado');
  });

  it('409 y la importación NO está confirmada: se queda y muestra el mensaje de la envoltura', async () => {
    const { sim, u } = montar({ consultasAntesDeTerminar: 0 });
    await hastaConfirmar(u);
    sim.fallarUnaVez('confirmarImportacion', new ErrorApi(409, 'CONFLICTO', 'Otra revisión está en curso.'));
    await u.click(screen.getByRole('button', { name: 'Confirmar y crear mi menú' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Otra revisión está en curso.');
    expect(screen.getByRole('heading', { name: '¿Todo listo para crear tu menú?' })).toBeInTheDocument();
  });

  it('con problemas en el borrador el botón de confirmar está deshabilitado', () => {
    const sim = crearServicioSimulado();
    const malo = aBorrador(menuSemilla); // la cecina no trae precio
    render(
      <PasoConfirmar
        servicio={sim.servicio}
        restaurante={{ id: 'r', nombre: 'X', slug: 'x', tema: 'vino', activo: true, creado_en: 'x' }}
        importacion={{ id: 'i', estado: 'listo', archivo_tipo: 'application/pdf', intentos: 1, creado_en: 'x' }}
        borrador={malo}
        alVolver={() => {}}
        alConfirmar={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Confirmar y crear mi menú' })).toBeDisabled();
  });
});

describe('B11 · errores de la subida con y sin envoltura', () => {
  const RID = 'r1';
  const archivo = () => new File(['%PDF-'], 'c.pdf', { type: 'application/pdf' });
  function servicioCon(respuesta: Response) {
    const cliente = crearCliente({ token: () => 't', fetch: (async () => respuesta) as typeof fetch });
    return crearServicioAlta(cliente);
  }
  const envoltura = (codigo: string, mensaje: string, estado: number) =>
    new Response(JSON.stringify({ error: { codigo, mensaje, detalles: {} } }), {
      status: estado,
      headers: { 'Content-Type': 'application/json' },
    });

  it('con envoltura: 413, 415, 422 y 503 conservan el mensaje del contrato', async () => {
    for (const [estado, mensaje] of [
      [413, 'La carta tiene más de 30 páginas.'],
      [415, 'Ese tipo de archivo no se puede leer.'],
      [422, 'El PDF está protegido con contraseña.'],
      [503, 'La importación no está disponible por ahora.'],
    ] as const) {
      await expect(servicioCon(envoltura('X', mensaje, estado)).subirCarta(RID, archivo())).rejects.toMatchObject({ estado, message: mensaje });
    }
  });

  it('sin envoltura (HTML del borde): 413, 415 y 503 dan un mensaje por estado, sin «Algo salió mal»', async () => {
    for (const [estado, trozo] of [
      [413, 'demasiado grande'],
      [415, 'tipo de archivo'],
      [503, 'no está disponible'],
    ] as const) {
      const html = new Response('<h1>borde</h1>', { status: estado, headers: { 'Retry-After': '30' } });
      await expect(servicioCon(html).subirCarta(RID, archivo())).rejects.toMatchObject({
        estado,
        message: expect.stringContaining(trozo),
        reintentarEn: 30,
      });
    }
  });

  it('en pantalla, un 413 al subir se explica y deja volver a intentar', async () => {
    const { sim, u } = montar();
    await hastaCarta(u);
    sim.fallarUnaVez('subirCarta', new ErrorApi(413, 'ARCHIVO_DEMASIADO_GRANDE', 'La carta tiene más de 30 páginas.'));
    await u.upload(screen.getByLabelText('Elegir archivo'), new File(['%PDF-1.4'], 'c.pdf', { type: 'application/pdf' }));
    await u.click(await screen.findByRole('button', { name: 'Subir y leer mi carta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La carta tiene más de 30 páginas.');
    expect(screen.getByRole('button', { name: 'Subir y leer mi carta' })).toBeEnabled();
  });

  it('B7: el QR servido como octet-stream se acepta si empieza por %PDF-; si no, no', async () => {
    const ok = servicioCon(new Response('%PDF-1.4 qr', { status: 200, headers: { 'Content-Type': 'application/octet-stream' } }));
    expect((await ok.descargarQr(RID)).type).toBe('application/pdf');
    const malo = servicioCon(new Response('<html>', { status: 200, headers: { 'Content-Type': 'application/octet-stream' } }));
    await expect(malo.descargarQr(RID)).rejects.toMatchObject({ codigo: 'RESPUESTA_INVALIDA' });
  });
});

describe('B11/B12 · descarga del PDF', () => {
  it('crea el <a download="qr-mesas.pdf">, lo retira y suelta la URL del blob', () => {
    const crear = vi.fn(() => 'blob:prueba');
    const soltar = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: crear, revokeObjectURL: soltar }));
    let anclaVista: HTMLAnchorElement | null = null;
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      anclaVista = this;
      expect(this.isConnected).toBe(true);
    });
    guardarComoArchivo(new Blob(['%PDF-'], { type: 'application/pdf' }), 'qr-mesas.pdf');
    expect(clic).toHaveBeenCalledOnce();
    expect(anclaVista!.getAttribute('download')).toBe('qr-mesas.pdf');
    expect(anclaVista!.isConnected).toBe(false);
    // No se suelta enseguida (iOS abre el PDF en otra pestaña): ni a los 10 s…
    vi.advanceTimersByTime(10_000);
    expect(soltar).not.toHaveBeenCalled();
    // …sí al salir de la página o a los 60 s.
    window.dispatchEvent(new Event('pagehide'));
    expect(soltar).toHaveBeenCalledWith('blob:prueba');
    vi.unstubAllGlobals();
  });

  it('a los 60 s suelta la URL aunque no haya pagehide', () => {
    const soltar = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:otra', revokeObjectURL: soltar }));
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    guardarComoArchivo(new Blob(['%PDF-']), 'qr-mesas.pdf');
    vi.advanceTimersByTime(59_000);
    expect(soltar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(soltar).toHaveBeenCalledWith('blob:otra');
    vi.unstubAllGlobals();
  });
});

describe('B4 · enlaces del paso Listo', () => {
  it('sólo http(s) se vuelve enlace; el resto se muestra como texto', () => {
    expect(esUrlWeb('https://carta.cooking/m/abc')).toBe(true);
    expect(esUrlWeb('http://localhost:5173/staff/x')).toBe(true);
    expect(esUrlWeb('javascript:alert(1)')).toBe(false);
    expect(esUrlWeb('data:text/html,<b>x</b>')).toBe(false);
    expect(esUrlWeb('/m/abc')).toBe(true); // relativo al origen: http(s)
  });

  it('una url_publica con javascript: no es un <a href>, y el slug se codifica', () => {
    const restaurante = { id: 'r', nombre: 'X', slug: 'a/b?c', tema: 'vino' as const, activo: true, creado_en: 'x' };
    const mesas = [{ id: 'm', numero: 1, codigo_publico: 'c', url_publica: 'javascript:alert(1)', capacidad: 4, activa: true }];
    render(
      <MemoryRouter>
        <PasoListo restaurante={restaurante} menuCreado mesas={mesas} hayPersonal alTerminar={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.getByText('javascript:alert(1)').closest('a')).toBeNull();
    const personal = screen.getByRole('link', { name: /\/staff\// });
    expect(personal.getAttribute('href')).toMatch(/\/staff\/a%2Fb%3Fc$/);
  });
});

describe('B5 · chips', () => {
  function Tabla({ inicial }: { inicial: Borrador }) {
    const [b, setB] = useState(inicial);
    return <PasoRevision borrador={b} alCambiar={(f) => setB(f)} alContinuar={() => {}} />;
  }

  it('pegar «Lácteos, huevo» crea dos chips; una clave vacía o recortada avisa', async () => {
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Tabla inicial={aBorrador(menuSemilla)} />);
    const pastor = screen.getAllByLabelText('Platillo').find((el) => (el as HTMLInputElement).value === 'Pastor')!.closest('li') as HTMLElement;
    const campo = within(pastor).getByRole('textbox', { name: 'Alérgenos' });
    await u.click(campo);
    await u.paste('Lácteos, huevo');
    await u.keyboard('{Enter}');
    const lista = within(within(pastor).getByRole('list', { name: 'Alérgenos' }));
    expect(lista.getByText('Lacteos')).toBeInTheDocument();
    expect(lista.getByText('Huevo')).toBeInTheDocument();
    await u.type(campo, '麩質{Enter}');
    expect(within(pastor).getByRole('status')).toHaveTextContent('No pudimos usar «麩質»');
    await u.paste('a'.repeat(50));
    await u.keyboard('{Enter}');
    expect(within(pastor).getByRole('status')).toHaveTextContent('se acortó a 40 letras');
  });

  it('al llegar a 30 chips avisa en lugar de ignorar en silencio', async () => {
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const base = aBorrador(menuSemilla);
    const pastor = base.categorias[0]!.platillos[0]!;
    const lleno = operaciones.editarPlatillo(base, pastor.clave, { alergenos: Array.from({ length: 29 }, (_, i) => `a${i}`) });
    render(<Tabla inicial={lleno} />);
    const fila = screen.getAllByLabelText('Platillo').find((el) => (el as HTMLInputElement).value === 'Pastor')!.closest('li') as HTMLElement;
    const campo = within(fila).getByRole('textbox', { name: 'Alérgenos' });
    await u.click(campo);
    await u.paste('uno, dos');
    await u.keyboard('{Enter}');
    expect(within(fila).getByRole('status')).toHaveTextContent('Máximo 30');
    expect(within(within(fila).getByRole('list', { name: 'Alérgenos' })).getAllByRole('listitem')).toHaveLength(30);
  });
});

describe('A2 · rendimiento de la tabla de revisión', () => {
  function grande(n: number): Borrador {
    const categorias = [categoriaVacia('Cat 1'), categoriaVacia('Cat 2')];
    for (let i = 0; i < n; i += 1) {
      categorias[i % 2]!.platillos.push({ ...platilloVacio(), nombre: `Plato ${i}`, precio: String(10 + i) });
    }
    return { moneda: 'MXN', avisos: [], notas: [], categorias };
  }
  function Tabla({ inicial }: { inicial: Borrador }) {
    const [b, setB] = useState(inicial);
    // `setB` es estable: las filas memorizadas no dependen del borrador entero.
    return <PasoRevision borrador={b} alCambiar={setB} alContinuar={() => {}} />;
  }

  it('teclear en un platillo vuelve a renderizar esa fila y ninguna otra', async () => {
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Tabla inicial={grande(30)} />);
    const antes = instrumentacion.filas;
    expect(antes).toBeGreaterThanOrEqual(30);
    const campo = screen.getAllByLabelText('Platillo').find((el) => (el as HTMLInputElement).value === 'Plato 7')!;
    await u.type(campo, 'abc');
    // 3 teclas → 3 renders de UNA fila (no 3 × 30).
    expect(instrumentacion.filas - antes).toBe(3);
  });

  it('con más de 40 platillos sólo la primera categoría arranca abierta y se puede abrir otra', async () => {
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    instrumentacion.filas = 0;
    render(<Tabla inicial={grande(60)} />);
    expect(instrumentacion.filas).toBe(30);
    expect(screen.getAllByLabelText('Platillo')).toHaveLength(30);
    await u.click(screen.getByRole('button', { name: /Mostrar 30 platillos de Cat 2/ }));
    expect(screen.getAllByLabelText('Platillo')).toHaveLength(60);
  });

  it('un error en una categoría cerrada la abre al intentar continuar', async () => {
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const b = grande(60);
    b.categorias[1]!.platillos[0]!.precio = '';
    render(<Tabla inicial={b} />);
    expect(screen.getAllByLabelText('Platillo')).toHaveLength(30);
    await u.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Falta el precio.')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Platillo')).toHaveLength(60);
  });

  it('con 400 platillos teclear sigue siendo ágil (una fila por tecla)', async () => {
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Tabla inicial={grande(400)} />);
    await u.click(screen.getByRole('button', { name: /Mostrar 200 platillos de Cat 2/ }));
    const antes = instrumentacion.filas;
    const campo = screen.getAllByLabelText('Platillo').find((el) => (el as HTMLInputElement).value === 'Plato 100')!;
    await u.type(campo, 'x');
    expect(instrumentacion.filas - antes).toBe(1);
  });
});
