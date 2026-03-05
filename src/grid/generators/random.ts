import { CONFIG } from '../../config';
import { Grid } from '../Grid';
import { ensurePathExists } from './ensurePath';

export type RandomGridParams = {
  cols: number;
  rows: number;
  baseWidth: number;
  percolationThreshold: number;
  fallbackThreshold: number;
  maxAttemptsFallback: number;
  gameWidth: number;
  gameHeight: number;
};

const defaultParams: RandomGridParams = {
  cols: CONFIG.MAZE_COLS,
  rows: CONFIG.MAZE_ROWS,
  baseWidth: CONFIG.BASE_WIDTH_CELLS,
  percolationThreshold: CONFIG.PERCOLATION_THRESHOLD,
  fallbackThreshold: 0.7,
  maxAttemptsFallback: 100,
  gameWidth: CONFIG.GAME_WIDTH,
  gameHeight: CONFIG.GAME_HEIGHT,
};

export function generateRandomGrid(overrides?: Partial<RandomGridParams>): Grid {
  const p = overrides ? { ...defaultParams, ...overrides } : defaultParams;

  let grid: Grid;
  let attempts = 0;

  do {
    let cells = createPercolationCells(p.cols, p.rows, p.percolationThreshold, p.baseWidth);
    if (attempts > p.maxAttemptsFallback) {
      cells = createPercolationCells(p.cols, p.rows, p.fallbackThreshold, p.baseWidth);
    }
    ensurePathExists(cells, p.cols, p.rows, p.baseWidth);
    grid = new Grid(p.cols, p.rows, p.baseWidth, cells, p.gameWidth, p.gameHeight);
    attempts++;
  } while (!grid.hasPath());

  return grid;
}

function createPercolationCells(
  cols: number,
  rows: number,
  threshold: number,
  baseWidth: number
): boolean[][] {
  const grid: boolean[][] = [];

  for (let y = 0; y < rows; y++) {
    grid[y] = [];
    for (let x = 0; x < cols; x++) {
      const isLeftBase = x < baseWidth;
      const isRightBase = x >= cols - baseWidth;
      if (isLeftBase || isRightBase) {
        grid[y][x] = true;
      } else {
        grid[y][x] = Math.random() < threshold;
      }
    }
  }

  return grid;
}
