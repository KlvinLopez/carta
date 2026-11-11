import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { crearMenuGrande } from '../../mocks/servicioMenuComensalSimulado';
import { coincide, consultaEfectiva, normalizar } from './busqueda';
import { montarMenu, nombresEnLista } from './utilesPrueba';

const buscador = () => screen.getByRole('searchbox', { name: 'Buscar en el menú' });
const nombres = nombresEnLista;

describe('búsqueda: lógica', () => {
  it('normaliza acentos, mayúsculas y espacios', () => {
    expect(normalizar('  Piña   COLADA ')).toBe('pina colada');
    expect(normalizar('Jalapeño')).toBe('jalapeno');
    expect(normalizar('Crème Brûlée')).toBe('creme brulee');
  });

  it('desde 2 caracteres; con 0 o 1 no hay consulta', () => {
    expect(consultaEfectiva('')).toBeNull();
    expect(consultaEfectiva(' a ')).toBeNull();
    expect(consultaEfectiva('ta')).toBe('ta');
    // Dos puntos de código (un emoji cuenta como uno).
    expect(consultaEfectiva('🌮')).toBeNull();
  });

  it('cada palabra debe aparecer, en cualquier orden', () => {
    expect(coincide('tacos de pastor con pina', 'pina pastor')).toBe(true);
    expect(coincide('tacos de pastor', 'pastor suadero')).toBe(false);
  });
});

describe('búsqueda: pantalla', () => {
  // @ac AC-06.1
  it.each([
    ['atun', 'Tostadas de atún'],
    ['ATÚN', 'Tostadas de atún'],
    ['jalapeno', 'Chiles rellenos de queso'],
    ['pina', 'Piña colada sin alcohol'],
    ['achiote', 'Cochinita pibil'],
  ])('«%s» encuentra «%s» por nombre o descripción, sin importar acentos ni mayúsculas', async (texto, esperado) => {
    const { u } = montarMenu();
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    await u.type(buscador(), texto);
    expect(nombres()).toContain(esperado);
  });

  // @ac AC-06.1
  it('con un solo carácter no filtra todavía; al segundo sí', async () => {
    const { u } = montarMenu();
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    const antes = nombres().length;
    await u.type(buscador(), 'z');
    expect(nombres().length).toBe(antes);
    await u.type(buscador(), 'a');
    expect(nombres().length).toBeLessThan(antes);
  });

  // @ac AC-06.1
  it('responde en 300 ms o menos con una lista de 200 platillos', async () => {
    montarMenu({ menu: crearMenuGrande(200) });
    await screen.findByRole('heading', { name: 'Restaurante grande', level: 1 });
    expect(nombres()).toHaveLength(200);
    const inicio = performance.now();
    fireEvent.change(buscador(), { target: { value: 'platillo 17' } });
    const duracion = performance.now() - inicio;
    expect(nombres()).toContain('Platillo 17');
    expect(nombres().length).toBeLessThan(20);
    expect(duracion).toBeLessThan(300);
  });

  // @ac AC-06.1
  it('muestra el conteo y un estado vacío con salida cuando nada coincide', async () => {
    const { u } = montarMenu();
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    await u.type(buscador(), 'sushi');
    expect(screen.getByRole('status')).toHaveTextContent('Sin resultados');
    expect(screen.getByText(/No encontramos platillos con «sushi»/)).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Ver todo el menú' }));
    expect(buscador()).toHaveValue('');
    expect(nombres().length).toBeGreaterThan(20);
  });

  // @ac AC-06.1
  it('cuenta los resultados en singular y plural, y borra con la ×', async () => {
    const { u } = montarMenu();
    await screen.findByRole('heading', { name: 'La Ceiba', level: 1 });
    await u.type(buscador(), 'flan');
    expect(screen.getByRole('status')).toHaveTextContent('1 platillo');
    await u.clear(buscador());
    await u.type(buscador(), 'queso');
    expect(screen.getByRole('status')).toHaveTextContent(/\d+ platillos/);
    await u.click(screen.getByRole('button', { name: 'Borrar la búsqueda' }));
    expect(within(screen.getByRole('status')).queryByText(/platillo/)).toBeNull();
  });

  it('la búsqueda esconde el «Top 3 del chef»', async () => {
    const { u } = montarMenu();
    expect(await screen.findByRole('heading', { name: 'Top 3 del chef' })).toBeInTheDocument();
    await u.type(buscador(), 'guacamole');
    expect(screen.queryByRole('heading', { name: 'Top 3 del chef' })).toBeNull();
  });
});
