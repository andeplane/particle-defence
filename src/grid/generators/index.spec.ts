import { describe, it, expect, vi } from 'vitest';
import { generateGrid, type GridType } from './index';
import { Grid } from '../Grid';

const mockGrid = new Grid(8, 4, 2, Array.from({ length: 4 }, () => Array(8).fill(true)), 256, 128);

vi.mock(import('./random'), async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, generateRandomGrid: vi.fn(() => mockGrid) };
});
vi.mock(import('./maze'), async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, generateMazeGrid: vi.fn(() => mockGrid) };
});
vi.mock(import('./hourglass'), async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, generateHourglassGrid: vi.fn(() => mockGrid) };
});
vi.mock(import('./lanes'), async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, generateLanesGrid: vi.fn(() => mockGrid) };
});
vi.mock(import('./islands'), async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, generateIslandsGrid: vi.fn(() => mockGrid) };
});
vi.mock(import('./rooms'), async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, generateRoomsGrid: vi.fn(() => mockGrid) };
});
vi.mock(import('./fortress'), async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, generateFortressGrid: vi.fn(() => mockGrid) };
});

describe(generateGrid.name, () => {
  it.each<{ type: GridType }>([
    { type: 'random' },
    { type: 'maze' },
    { type: 'hourglass' },
    { type: 'lanes' },
    { type: 'islands' },
    { type: 'rooms' },
    { type: 'fortress' },
  ])('returns a grid for type=$type', ({ type }) => {
    const grid = generateGrid(type);
    expect(grid).toBeDefined();
    expect(grid.cols).toBe(8);
    expect(grid.rows).toBe(4);
  });

  it('dispatches to generateRandomGrid for "random"', async () => {
    const { generateRandomGrid } = await import('./random');
    generateGrid('random');
    expect(generateRandomGrid).toHaveBeenCalled();
  });

  it('dispatches to generateMazeGrid for "maze"', async () => {
    const { generateMazeGrid } = await import('./maze');
    generateGrid('maze');
    expect(generateMazeGrid).toHaveBeenCalled();
  });

  it('dispatches to generateHourglassGrid for "hourglass"', async () => {
    const { generateHourglassGrid } = await import('./hourglass');
    generateGrid('hourglass');
    expect(generateHourglassGrid).toHaveBeenCalled();
  });

  it('dispatches to generateLanesGrid for "lanes"', async () => {
    const { generateLanesGrid } = await import('./lanes');
    generateGrid('lanes');
    expect(generateLanesGrid).toHaveBeenCalled();
  });

  it('dispatches to generateIslandsGrid for "islands"', async () => {
    const { generateIslandsGrid } = await import('./islands');
    generateGrid('islands');
    expect(generateIslandsGrid).toHaveBeenCalled();
  });

  it('dispatches to generateRoomsGrid for "rooms"', async () => {
    const { generateRoomsGrid } = await import('./rooms');
    generateGrid('rooms');
    expect(generateRoomsGrid).toHaveBeenCalled();
  });

  it('dispatches to generateFortressGrid for "fortress"', async () => {
    const { generateFortressGrid } = await import('./fortress');
    generateGrid('fortress');
    expect(generateFortressGrid).toHaveBeenCalled();
  });
});
