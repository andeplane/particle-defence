import { CONFIG } from '../../config';
import { Grid } from '../Grid';
import { ensurePathExists } from './ensurePath';

export function generateRandomGrid(): Grid {
  const { MAZE_COLS, MAZE_ROWS, PERCOLATION_THRESHOLD, BASE_WIDTH_CELLS } = CONFIG;

  let grid: Grid;
  let attempts = 0;

  do {
    let cells = createPercolationCells(MAZE_COLS, MAZE_ROWS, PERCOLATION_THRESHOLD, BASE_WIDTH_CELLS);
    if (attempts > 100) {
      cells = createPercolationCells(MAZE_COLS, MAZE_ROWS, 0.7, BASE_WIDTH_CELLS);
    }
    ensurePathExists(cells, MAZE_COLS, MAZE_ROWS, BASE_WIDTH_CELLS);
    grid = new Grid(MAZE_COLS, MAZE_ROWS, BASE_WIDTH_CELLS, cells);
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
