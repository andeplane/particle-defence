import { describe, it, expect, vi } from 'vitest';
import { generateGrid, type GridType } from './index';
import { Grid } from '../Grid';

vi.mock(import('./random'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    generateRandomGrid: vi.fn(() => {
      const cells = Array.from({ length: 4 }, () => Array(8).fill(true));
      return new Grid(8, 4, 2, cells, 256, 128);
    }),
  };
});

vi.mock(import('./maze'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    generateMazeGrid: vi.fn(() => {
      const cells = Array.from({ length: 4 }, () => Array(8).fill(true));
      return new Grid(8, 4, 2, cells, 256, 128);
    }),
  };
});

describe(generateGrid.name, () => {
  it.each([
    { type: 'random' as GridType },
    { type: 'maze' as GridType },
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
});
