import { describe, it, expect } from 'vitest';
import { Grid } from './Grid';

function makeAllOpenCells(cols: number, rows: number): boolean[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(true));
}

function makeAllWallCells(cols: number, rows: number): boolean[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(false));
}

describe(Grid.name, () => {
  const cols = 8;
  const rows = 4;
  const baseWidth = 2;
  const gameWidth = 256;
  const gameHeight = 128;

  describe('cellW / cellH', () => {
    it('computes cellW from gameWidth / cols', () => {
      const grid = new Grid(cols, rows, baseWidth, makeAllOpenCells(cols, rows), gameWidth, gameHeight);
      expect(grid.cellW).toBe(32);
    });

    it('computes cellH from gameHeight / rows', () => {
      const grid = new Grid(cols, rows, baseWidth, makeAllOpenCells(cols, rows), gameWidth, gameHeight);
      expect(grid.cellH).toBe(32);
    });
  });

  describe('isWall', () => {
    it('returns false for open cell', () => {
      const grid = new Grid(cols, rows, baseWidth, makeAllOpenCells(cols, rows), gameWidth, gameHeight);
      expect(grid.isWall(50, 50)).toBe(false);
    });

    it('returns true for wall cell', () => {
      const cells = makeAllOpenCells(cols, rows);
      cells[1][1] = false;
      const grid = new Grid(cols, rows, baseWidth, cells, gameWidth, gameHeight);
      expect(grid.isWall(35, 35)).toBe(true);
    });

    it.each([
      { px: -1, py: 0, label: 'negative x' },
      { px: 0, py: -1, label: 'negative y' },
      { px: 256, py: 0, label: 'x at game width' },
      { px: 0, py: 128, label: 'y at game height' },
    ])('returns true for out-of-bounds ($label)', ({ px, py }) => {
      const grid = new Grid(cols, rows, baseWidth, makeAllOpenCells(cols, rows), gameWidth, gameHeight);
      expect(grid.isWall(px, py)).toBe(true);
    });

    it('returns false for cell at origin (0,0) when open', () => {
      const grid = new Grid(cols, rows, baseWidth, makeAllOpenCells(cols, rows), gameWidth, gameHeight);
      expect(grid.isWall(0, 0)).toBe(false);
    });
  });

  describe('isInBase', () => {
    it('returns true for player 0 when x < baseWidth * cellW', () => {
      const grid = new Grid(cols, rows, baseWidth, makeAllOpenCells(cols, rows), gameWidth, gameHeight);
      expect(grid.isInBase(10, 0)).toBe(true);
    });

    it('returns false for player 0 when x > baseWidth * cellW', () => {
      const grid = new Grid(cols, rows, baseWidth, makeAllOpenCells(cols, rows), gameWidth, gameHeight);
      expect(grid.isInBase(128, 0)).toBe(false);
    });

    it('returns true for player 1 when x > gameWidth - baseWidth * cellW', () => {
      const grid = new Grid(cols, rows, baseWidth, makeAllOpenCells(cols, rows), gameWidth, gameHeight);
      expect(grid.isInBase(200, 1)).toBe(true);
    });

    it('returns false for player 1 when x < gameWidth - baseWidth * cellW', () => {
      const grid = new Grid(cols, rows, baseWidth, makeAllOpenCells(cols, rows), gameWidth, gameHeight);
      expect(grid.isInBase(128, 1)).toBe(false);
    });
  });

  describe('hasPath', () => {
    it('returns true for fully open grid', () => {
      const grid = new Grid(cols, rows, baseWidth, makeAllOpenCells(cols, rows), gameWidth, gameHeight);
      expect(grid.hasPath()).toBe(true);
    });

    it('returns false for fully walled grid', () => {
      const cells = makeAllWallCells(cols, rows);
      // Open left column so BFS can start
      for (let y = 0; y < rows; y++) cells[y][0] = true;
      const grid = new Grid(cols, rows, baseWidth, cells, gameWidth, gameHeight);
      expect(grid.hasPath()).toBe(false);
    });

    it('returns true for grid with corridor connecting bases', () => {
      const cells = makeAllWallCells(cols, rows);
      const midY = Math.floor(rows / 2);
      for (let x = 0; x < cols; x++) cells[midY][x] = true;
      const grid = new Grid(cols, rows, baseWidth, cells, gameWidth, gameHeight);
      expect(grid.hasPath()).toBe(true);
    });

    it('returns false when corridor is blocked in the middle', () => {
      const cells = makeAllWallCells(cols, rows);
      const midY = Math.floor(rows / 2);
      for (let x = 0; x < cols; x++) cells[midY][x] = true;
      cells[midY][4] = false;
      const grid = new Grid(cols, rows, baseWidth, cells, gameWidth, gameHeight);
      expect(grid.hasPath()).toBe(false);
    });
  });
});
