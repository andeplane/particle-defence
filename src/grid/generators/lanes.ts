import { CONFIG } from '../../config';
import { Grid } from '../Grid';
import { ensurePathExists } from './ensurePath';

export type LanesGridParams = {
  cols: number;
  rows: number;
  baseWidth: number;
  gameWidth: number;
  gameHeight: number;
};

const defaultParams: LanesGridParams = {
  cols: CONFIG.MAZE_COLS,
  rows: CONFIG.MAZE_ROWS,
  baseWidth: CONFIG.BASE_WIDTH_CELLS,
  gameWidth: CONFIG.GAME_WIDTH,
  gameHeight: CONFIG.GAME_HEIGHT,
};

/** Number of horizontal lanes */
const NUM_LANES = 3;
/** Chance (0-1) that a wall cell between lanes becomes a crossover gap */
const CROSSOVER_GAP_CHANCE = 0.15;

export function generateLanesGrid(overrides?: Partial<LanesGridParams>): Grid {
  const p = overrides ? { ...defaultParams, ...overrides } : defaultParams;

  const cells = createLanesCells(p.cols, p.rows, p.baseWidth);
  ensurePathExists(cells, p.cols, p.rows, p.baseWidth);
  return new Grid(p.cols, p.rows, p.baseWidth, cells, p.gameWidth, p.gameHeight);
}

function createLanesCells(cols: number, rows: number, baseWidth: number): boolean[][] {
  const cells: boolean[][] = [];
  const wallRowCount = NUM_LANES - 1;
  const laneHeight = Math.floor((rows - wallRowCount) / NUM_LANES);
  const wallRows: number[] = [];

  for (let i = 0; i < wallRowCount; i++) {
    wallRows.push(laneHeight + i * (laneHeight + 1));
  }

  for (let y = 0; y < rows; y++) {
    cells[y] = [];
    const isWallRow = wallRows.includes(y);
    for (let x = 0; x < cols; x++) {
      const isBase = x < baseWidth || x >= cols - baseWidth;
      if (isBase) {
        cells[y][x] = true;
      } else if (isWallRow) {
        cells[y][x] = Math.random() < CROSSOVER_GAP_CHANCE;
      } else {
        cells[y][x] = true;
      }
    }
  }

  const midY = Math.floor(rows / 2);
  if (wallRows.includes(midY)) {
    for (let x = baseWidth; x < cols - baseWidth; x++) {
      cells[midY][x] = true;
    }
  }

  return cells;
}
