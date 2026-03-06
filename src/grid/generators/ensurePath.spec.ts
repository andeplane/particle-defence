import { describe, it, expect, vi, afterEach } from 'vitest';
import { ensurePathExists } from './ensurePath';

function makeAllWallCells(cols: number, rows: number): boolean[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(false));
}

describe(ensurePathExists.name, () => {
  const cols = 10;
  const rows = 6;
  const baseWidth = 2;
  const leftCol = baseWidth;
  const rightCol = cols - baseWidth - 1;
  const midY = Math.floor(rows / 2);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('carves horizontal corridor at midY from leftCol to rightCol', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const cells = makeAllWallCells(cols, rows);
    ensurePathExists(cells, cols, rows, baseWidth);

    for (let x = leftCol; x <= rightCol; x++) {
      expect(cells[midY][x]).toBe(true);
    }
  });

  it('opens leftCol and rightCol for midY row', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const cells = makeAllWallCells(cols, rows);
    ensurePathExists(cells, cols, rows, baseWidth);

    expect(cells[midY][leftCol]).toBe(true);
    expect(cells[midY][rightCol]).toBe(true);
  });

  it('opens additional boundary rows when Math.random < 0.5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const cells = makeAllWallCells(cols, rows);
    ensurePathExists(cells, cols, rows, baseWidth);

    for (let y = 0; y < rows; y++) {
      expect(cells[y][leftCol]).toBe(true);
      expect(cells[y][rightCol]).toBe(true);
    }
  });

  it('periodic boundary: top and bottom rows match after call', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const cells = makeAllWallCells(cols, rows);
    cells[0][3] = true;
    ensurePathExists(cells, cols, rows, baseWidth);

    for (let x = 0; x < cols; x++) {
      expect(cells[0][x]).toBe(cells[rows - 1][x]);
    }
  });

  it('periodic boundary: opens bottom if top is open', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const cells = makeAllWallCells(cols, rows);
    cells[0][5] = true;
    ensurePathExists(cells, cols, rows, baseWidth);

    expect(cells[rows - 1][5]).toBe(true);
  });

  it('periodic boundary: opens top if bottom is open', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const cells = makeAllWallCells(cols, rows);
    cells[rows - 1][4] = true;
    ensurePathExists(cells, cols, rows, baseWidth);

    expect(cells[0][4]).toBe(true);
  });

  it('mutates the input cells array in place', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const cells = makeAllWallCells(cols, rows);
    const ref = cells;
    ensurePathExists(cells, cols, rows, baseWidth);

    expect(cells).toBe(ref);
    expect(cells[midY][leftCol]).toBe(true);
  });
});
