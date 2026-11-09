import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ErrorApi } from '../../compartido/http';
import { uuid } from '../../mocks/servicioMenuSimulado';
import { montarMenu } from './utilesPrueba';

async function cargada() {
  const m = montarMenu();
  await screen.findByRole('heading', { name: /^Tacos/ });
  return m;
}
const hoja = () => screen.getByRole('dialog');

describe('editor de platillo en hoja inferior (AC-16.1, AC-16.2)', () => {
  it('crea un platillo: sólo viaja lo que escribe el operador, con el precio como número', async () => {
    const { sim, u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Agregar platillo' }));
    const h = await screen.findByRole('dialog', { name: 'Nuevo platillo' });
    await u.type(within(h).getByRole('textbox', { name: 'Nombre' }), '  Gringa ');
    await u.type(within(h).getByRole('textbox', { name: 'Descripción' }), 'Con queso');
    await u.type(within(h).getByRole('textbox', { name: 'Precio' }), '$85,50');
    await u.selectOptions(within(h).getByRole('combobox', { name: 'Categoría' }), 'Tacos');
    await u.type(within(h).getByRole('textbox', { name: 'Alérgenos' }), 'lácteos{Enter}');
    await u.type(within(h).getByRole('textbox', { name: 'Etiquetas' }), 'Sin gluten{Enter}');
    await u.click(within(h).getByRole('button', { name: 'Agregar platillo' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const [rid, cuerpo] = sim.llamadasDe('crearPlatillo')[0]!.argumentos as [string, Record<string, unknown>];
    expect(rid).toBe('11111111-1111-4111-8111-111111111111');
    expect(cuerpo).toEqual({
      nombre: 'Gringa',
      descripcion: 'Con queso',
      precio: 85.5,
      categoria_id: uuid(1),
      alergenos: ['lacteos'],
      etiquetas: ['sin_gluten'],
    });
    // Regla dura 5: el restaurante va en la ruta, nunca en el cuerpo.
    expect(cuerpo).not.toHaveProperty('restaurante_id');
    expect(await screen.findByRole('button', { name: 'Editar Gringa' })).toBeInTheDocument();
  });

  it('valida en el cliente: nombre obligatorio y precio válido (0 sí vale), sin llamar al servidor', async () => {
    const { sim, u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Agregar platillo' }));
    const h = await screen.findByRole('dialog');
    await u.click(within(h).getByRole('button', { name: 'Agregar platillo' }));
    expect(within(h).getByText('Escribe el nombre del platillo.')).toBeInTheDocument();
    expect(within(h).getByText(/Escribe un precio válido/)).toBeInTheDocument();
    await u.type(within(h).getByRole('textbox', { name: 'Nombre' }), 'Tortillas');
    await u.type(within(h).getByRole('textbox', { name: 'Precio' }), '12,345');
    await u.click(within(h).getByRole('button', { name: 'Agregar platillo' }));
    expect(within(h).getByText(/Escribe un precio válido/)).toBeInTheDocument();
    expect(sim.llamadasDe('crearPlatillo')).toHaveLength(0);
    await u.clear(within(h).getByRole('textbox', { name: 'Precio' }));
    await u.type(within(h).getByRole('textbox', { name: 'Precio' }), '0');
    await u.click(within(h).getByRole('button', { name: 'Agregar platillo' }));
    await waitFor(() => expect(sim.llamadasDe('crearPlatillo')).toHaveLength(1));
  });

  it('un 409 (nombre repetido) muestra el mensaje del servidor junto al campo y deja la hoja abierta', async () => {
    const { u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Agregar platillo' }));
    const h = await screen.findByRole('dialog');
    await u.type(within(h).getByRole('textbox', { name: 'Nombre' }), 'pastor');
    await u.type(within(h).getByRole('textbox', { name: 'Precio' }), '22');
    await u.click(within(h).getByRole('button', { name: 'Agregar platillo' }));
    const campo = within(h).getByRole('textbox', { name: 'Nombre' });
    await waitFor(() => expect(campo).toHaveAccessibleDescription('Ya tienes un platillo con ese nombre.'));
    expect(campo).toBeInvalid();
    expect(hoja()).toBeInTheDocument();
    // Nunca se muestra `detail` ni un texto técnico.
    expect(screen.queryByText(/detail/i)).not.toBeInTheDocument();
  });

  it('un 422 pone cada error junto a su campo (body.precio → Precio)', async () => {
    const { sim, u } = await cargada();
    sim.fallar(
      'crearPlatillo',
      new ErrorApi(422, 'PAYLOAD_INVALIDO', 'Revisa los datos.', {
        errores: [{ campo: 'body.precio', mensaje: 'El precio no puede pasar de 99,999,999.99.', tipo: 'less_than_equal' }],
      }),
    );
    await u.click(screen.getByRole('button', { name: 'Agregar platillo' }));
    const h = await screen.findByRole('dialog');
    await u.type(within(h).getByRole('textbox', { name: 'Nombre' }), 'Caro');
    await u.type(within(h).getByRole('textbox', { name: 'Precio' }), '99999999');
    await u.click(within(h).getByRole('button', { name: 'Agregar platillo' }));
    await waitFor(() =>
      expect(within(h).getByRole('textbox', { name: 'Precio' })).toHaveAccessibleDescription('El precio no puede pasar de 99,999,999.99.'),
    );
  });

  it('un error de red al guardar se dice sin cerrar la hoja ni perder lo escrito', async () => {
    const { sim, u } = await cargada();
    sim.fallar('crearPlatillo', new ErrorApi(0, 'SIN_RED', 'No pudimos conectar con Carta. Revisa tu conexión e inténtalo de nuevo.'));
    await u.click(screen.getByRole('button', { name: 'Agregar platillo' }));
    const h = await screen.findByRole('dialog');
    await u.type(within(h).getByRole('textbox', { name: 'Nombre' }), 'Gringa');
    await u.type(within(h).getByRole('textbox', { name: 'Precio' }), '85');
    await u.click(within(h).getByRole('button', { name: 'Agregar platillo' }));
    expect(await within(h).findByRole('alert')).toHaveTextContent('No pudimos conectar con Carta.');
    expect(within(h).getByRole('textbox', { name: 'Nombre' })).toHaveValue('Gringa');
  });

  it('edita con un PATCH que lleva sólo los campos que cambiaron', async () => {
    const { sim, u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Editar Pastor' }));
    const h = await screen.findByRole('dialog', { name: 'Editar platillo' });
    expect(within(h).getByRole('textbox', { name: 'Nombre' })).toHaveValue('Pastor');
    expect(within(h).getByRole('textbox', { name: 'Precio' })).toHaveValue('22');
    const precio = within(h).getByRole('textbox', { name: 'Precio' });
    await u.clear(precio);
    await u.type(precio, '24,5');
    await u.click(within(h).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(sim.llamadasDe('cambiarPlatillo')[0]!.argumentos).toEqual([uuid(101), { precio: 24.5 }]);
    expect(within(screen.getByRole('button', { name: 'Editar Pastor' })).getByText('$24.50')).toBeInTheDocument();
  });

  it('cambia la categoría de un platillo y sin cambios no llama al servidor', async () => {
    const { sim, u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Editar Pastor' }));
    let h = await screen.findByRole('dialog');
    await u.click(within(h).getByRole('button', { name: 'Guardar cambios' }));
    expect(sim.llamadasDe('cambiarPlatillo')).toHaveLength(0);
    await u.click(screen.getByRole('button', { name: 'Editar Pastor' }));
    h = await screen.findByRole('dialog');
    await u.selectOptions(within(h).getByRole('combobox', { name: 'Categoría' }), 'Postres');
    await u.click(within(h).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(sim.llamadasDe('cambiarPlatillo')).toHaveLength(1));
    expect(sim.llamadasDe('cambiarPlatillo')[0]!.argumentos).toEqual([uuid(101), { categoria_id: uuid(3) }]);
  });

  it('alérgenos y etiquetas se editan como chips (los del asistente de alta)', async () => {
    const { sim, u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Editar Cecina enchilada' }));
    const h = await screen.findByRole('dialog');
    expect(within(h).getByText('Gluten')).toBeInTheDocument();
    await u.click(within(h).getByRole('button', { name: 'Quitar Gluten de alérgenos' }));
    await u.click(within(h).getByRole('textbox', { name: 'Etiquetas' }));
    await u.click(within(h).getByRole('button', { name: '+ Vegano' }));
    await u.click(within(h).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(sim.llamadasDe('cambiarPlatillo')).toHaveLength(1));
    expect(sim.llamadasDe('cambiarPlatillo')[0]!.argumentos[1]).toEqual({ alergenos: [], etiquetas: ['vegano'] });
  });

  it('en un platillo nuevo la foto espera a que exista; cancelar cierra sin guardar', async () => {
    const { sim, u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Agregar platillo' }));
    const h = await screen.findByRole('dialog');
    expect(within(h).getByText(/Podrás agregar la foto en cuanto guardes/)).toBeInTheDocument();
    expect(within(h).queryByRole('button', { name: /foto/i })).not.toBeInTheDocument();
    await u.click(within(h).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sim.llamadasDe('crearPlatillo')).toHaveLength(0);
  });
});

describe('revisión de maestra: descartar cambios y errores al guardar', () => {
  it('Escape con cambios pide confirmar y conserva el borrador; «Seguir editando» vuelve al formulario', async () => {
    const { sim, u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Editar Pastor' }));
    const h = await screen.findByRole('dialog', { name: 'Editar platillo' });
    await u.type(within(h).getByRole('textbox', { name: 'Nombre' }), ' especial');
    await u.keyboard('{Escape}');
    const confirmacion = await screen.findByRole('dialog', { name: '¿Descartar los cambios?' });
    expect(within(confirmacion).getByText('Lo que escribiste no se ha guardado.')).toBeInTheDocument();
    await u.click(within(confirmacion).getByRole('button', { name: 'Seguir editando' }));
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveValue('Pastor especial');
    expect(sim.llamadasDe('cambiarPlatillo')).toHaveLength(0);
  });

  it('el fondo y «Cancelar» también preguntan; «Descartar» cierra sin guardar nada', async () => {
    const { sim, u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Editar Pastor' }));
    await screen.findByRole('dialog');
    await u.type(screen.getByRole('textbox', { name: 'Precio' }), '0');
    await u.click(screen.getByTestId('fondo-hoja'));
    await screen.findByRole('dialog', { name: '¿Descartar los cambios?' });
    await u.click(screen.getByRole('button', { name: 'Seguir editando' }));
    await u.click(screen.getByRole('button', { name: 'Cancelar' }));
    await u.click(await screen.findByRole('button', { name: 'Descartar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sim.llamadasDe('cambiarPlatillo')).toHaveLength(0);
  });

  it('sin cambios, Escape cierra directo', async () => {
    const { u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Editar Pastor' }));
    await screen.findByRole('dialog');
    await u.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('volver a dejar el formulario como estaba tampoco cuenta como cambio', async () => {
    const { u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Agregar platillo' }));
    await screen.findByRole('dialog');
    await u.type(screen.getByRole('textbox', { name: 'Nombre' }), 'x');
    await u.clear(screen.getByRole('textbox', { name: 'Nombre' }));
    await u.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('un precio negativo da error en el campo y no llama al servidor', async () => {
    const { sim, u } = await cargada();
    await u.click(screen.getByRole('button', { name: 'Agregar platillo' }));
    const h = await screen.findByRole('dialog');
    await u.type(within(h).getByRole('textbox', { name: 'Nombre' }), 'Gratis');
    await u.type(within(h).getByRole('textbox', { name: 'Precio' }), '-5');
    await u.click(within(h).getByRole('button', { name: 'Agregar platillo' }));
    expect(within(h).getByRole('textbox', { name: 'Precio' })).toHaveAccessibleDescription(/Escribe un precio válido/);
    expect(sim.llamadasDe('crearPlatillo')).toHaveLength(0);
  });

  it('un 404 al guardar (el platillo ya no existe) dice el mensaje del servidor y deja la hoja abierta', async () => {
    const { sim, u } = await cargada();
    sim.fallar('cambiarPlatillo', new ErrorApi(404, 'NO_ENCONTRADO', 'No encontramos ese platillo.'));
    await u.click(screen.getByRole('button', { name: 'Editar Pastor' }));
    const h = await screen.findByRole('dialog');
    await u.clear(within(h).getByRole('textbox', { name: 'Precio' }));
    await u.type(within(h).getByRole('textbox', { name: 'Precio' }), '30');
    await u.click(within(h).getByRole('button', { name: 'Guardar cambios' }));
    expect(await within(h).findByRole('alert')).toHaveTextContent('No encontramos ese platillo.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
