import { vi } from 'vitest';
import type { IGrid } from '../grid/Grid';

export function createMockGrid(overrides: Partial<IGrid> = {}): IGrid {
  const defaults: IGrid = {
    cols: 16,
    rows: 8,
    baseWidthCells: 2,
    cells: [],
    cellW: 32,
    cellH: 32,
    isWall: vi.fn(() => false),
    isInBase: vi.fn(() => false),
    hasPath: vi.fn(() => true),
  };

  return { ...defaults, ...overrides };
}
