import { CONFIG } from '../../config';
import { Grid } from '../Grid';
import { ensurePathExists } from './ensurePath';

export type HourglassGridParams = {
  cols: number;
  rows: number;
  baseWidth: number;
  gameWidth: number;
  gameHeight: number;
};

const defaultParams: HourglassGridParams = {
  cols: CONFIG.MAZE_COLS,
  rows: CONFIG.MAZE_ROWS,
  baseWidth: CONFIG.BASE_WIDTH_CELLS,
  gameWidth: CONFIG.GAME_WIDTH,
  gameHeight: CONFIG.GAME_HEIGHT,
};

/** Width of the center wall barrier in columns */
const CENTER_WALL_WIDTH = 8;
/** Min/max number of gaps through the center */
const MIN_GAPS = 2;
const MAX_GAPS = 4;
/** Min/max height of each gap in rows */
const MIN_GAP_HEIGHT = 2;
const MAX_GAP_HEIGHT = 4;

export function generateHourglassGrid(overrides?: Partial<HourglassGridParams>): Grid {
  const p = overrides ? { ...defaultParams, ...overrides } : defaultParams;

  let grid: Grid;
  let attempts = 0;

  do {
    const cells = createHourglassCells(p.cols, p.rows, p.baseWidth);
    ensurePathExists(cells, p.cols, p.rows, p.baseWidth);
    grid = new Grid(p.cols, p.rows, p.baseWidth, cells, p.gameWidth, p.gameHeight);
    attempts++;
    if (attempts > 20) break;
  } while (!grid.hasPath());

  return grid;
}

function createHourglassCells(cols: number, rows: number, baseWidth: number): boolean[][] {
  const cells: boolean[][] = [];
  const midY = Math.floor(rows / 2);
  const centerStart = Math.floor(cols / 2) - CENTER_WALL_WIDTH / 2;
  const centerEnd = centerStart + CENTER_WALL_WIDTH;

  for (let y = 0; y < rows; y++) {
    cells[y] = [];
    for (let x = 0; x < cols; x++) {
      const isBase = x < baseWidth || x >= cols - baseWidth;
      const isInCenter = x >= centerStart && x < centerEnd;
      cells[y][x] = isBase || !isInCenter;
    }
  }

  const numGaps = MIN_GAPS + Math.floor(Math.random() * (MAX_GAPS - MIN_GAPS + 1));
  let hasMidYGap = false;

  for (let g = 0; g < numGaps; g++) {
    const gapHeight = MIN_GAP_HEIGHT + Math.floor(Math.random() * (MAX_GAP_HEIGHT - MIN_GAP_HEIGHT + 1));
    const maxStartY = Math.max(0, rows - gapHeight);
    const startY = Math.floor(Math.random() * (maxStartY + 1));
    const endY = Math.min(rows, startY + gapHeight);

    if (startY <= midY && endY > midY) hasMidYGap = true;

    for (let y = startY; y < endY; y++) {
      for (let x = centerStart; x < centerEnd; x++) {
        cells[y][x] = true;
      }
    }
  }

  if (!hasMidYGap) {
    for (let x = centerStart; x < centerEnd; x++) {
      cells[midY][x] = true;
    }
  }

  return cells;
}
