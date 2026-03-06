import { CONFIG } from '../../config';
import { Grid } from '../Grid';
import { ensurePathExists } from './ensurePath';

export type FortressGridParams = {
  cols: number;
  rows: number;
  baseWidth: number;
  gameWidth: number;
  gameHeight: number;
};

const defaultParams: FortressGridParams = {
  cols: CONFIG.MAZE_COLS,
  rows: CONFIG.MAZE_ROWS,
  baseWidth: CONFIG.BASE_WIDTH_CELLS,
  gameWidth: CONFIG.GAME_WIDTH,
  gameHeight: CONFIG.GAME_HEIGHT,
};

/** Width of fortress zone on each side (in columns) */
const FORTRESS_WIDTH = 12;
/** Wall density in fortress (0-1, fraction of cells that are walls) */
const WALL_DENSITY = 0.55;
/** Min/max gate openings connecting fortress to center */
const MIN_GATES = 2;
const MAX_GATES = 4;

export function generateFortressGrid(overrides?: Partial<FortressGridParams>): Grid {
  const p = overrides ? { ...defaultParams, ...overrides } : defaultParams;

  let grid: Grid;
  let attempts = 0;

  do {
    const cells = createFortressCells(p.cols, p.rows, p.baseWidth);
    ensurePathExists(cells, p.cols, p.rows, p.baseWidth);
    grid = new Grid(p.cols, p.rows, p.baseWidth, cells, p.gameWidth, p.gameHeight);
    attempts++;
    if (attempts > 30) break;
  } while (!grid.hasPath());

  return grid;
}

function createFortressCells(cols: number, rows: number, baseWidth: number): boolean[][] {
  const cells: boolean[][] = [];
  const leftFortressEnd = baseWidth + FORTRESS_WIDTH;
  const rightFortressStart = cols - baseWidth - FORTRESS_WIDTH;

  for (let y = 0; y < rows; y++) {
    cells[y] = [];
    for (let x = 0; x < cols; x++) {
      const isBase = x < baseWidth || x >= cols - baseWidth;
      const isCenter = x >= leftFortressEnd && x < rightFortressStart;
      if (isBase || isCenter) {
        cells[y][x] = true;
      } else {
        cells[y][x] = Math.random() > WALL_DENSITY;
      }
    }
  }

  const numGatesLeft = MIN_GATES + Math.floor(Math.random() * (MAX_GATES - MIN_GATES + 1));
  const numGatesRight = MIN_GATES + Math.floor(Math.random() * (MAX_GATES - MIN_GATES + 1));

  for (let g = 0; g < numGatesLeft; g++) {
    const gateY = 2 + Math.floor(Math.random() * (rows - 4));
    const gateWidth = 2;
    for (let dx = 0; dx < gateWidth; dx++) {
      const cx = leftFortressEnd - 1 - dx;
      if (cx >= baseWidth) {
        cells[gateY][cx] = true;
        if (gateY > 0) cells[gateY - 1][cx] = true;
        if (gateY < rows - 1) cells[gateY + 1][cx] = true;
      }
    }
  }

  for (let g = 0; g < numGatesRight; g++) {
    const gateY = 2 + Math.floor(Math.random() * (rows - 4));
    const gateWidth = 2;
    for (let dx = 0; dx < gateWidth; dx++) {
      const cx = rightFortressStart + dx;
      if (cx < cols - baseWidth) {
        cells[gateY][cx] = true;
        if (gateY > 0) cells[gateY - 1][cx] = true;
        if (gateY < rows - 1) cells[gateY + 1][cx] = true;
      }
    }
  }

  return cells;
}
