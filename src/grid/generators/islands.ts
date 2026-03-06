import { CONFIG } from '../../config';
import { Grid } from '../Grid';
import { ensurePathExists } from './ensurePath';

export type IslandsGridParams = {
  cols: number;
  rows: number;
  baseWidth: number;
  gameWidth: number;
  gameHeight: number;
};

const defaultParams: IslandsGridParams = {
  cols: CONFIG.MAZE_COLS,
  rows: CONFIG.MAZE_ROWS,
  baseWidth: CONFIG.BASE_WIDTH_CELLS,
  gameWidth: CONFIG.GAME_WIDTH,
  gameHeight: CONFIG.GAME_HEIGHT,
};

const MIN_ISLANDS = 8;
const MAX_ISLANDS = 12;
const MIN_ISLAND_W = 3;
const MAX_ISLAND_W = 6;
const MIN_ISLAND_H = 3;
const MAX_ISLAND_H = 6;

export function generateIslandsGrid(overrides?: Partial<IslandsGridParams>): Grid {
  const p = overrides ? { ...defaultParams, ...overrides } : defaultParams;

  let grid: Grid;
  let attempts = 0;

  do {
    const cells = createIslandsCells(p.cols, p.rows, p.baseWidth);
    ensurePathExists(cells, p.cols, p.rows, p.baseWidth);
    grid = new Grid(p.cols, p.rows, p.baseWidth, cells, p.gameWidth, p.gameHeight);
    attempts++;
    if (attempts > 30) break;
  } while (!grid.hasPath());

  return grid;
}

function createIslandsCells(cols: number, rows: number, baseWidth: number): boolean[][] {
  const cells: boolean[][] = [];
  for (let y = 0; y < rows; y++) {
    cells[y] = [];
    for (let x = 0; x < cols; x++) {
      cells[y][x] = true;
    }
  }

  const midCol = Math.floor(cols / 2);
  const playLeft = baseWidth;
  const playRight = cols - baseWidth;
  const numIslands = MIN_ISLANDS + Math.floor(Math.random() * (MAX_ISLANDS - MIN_ISLANDS + 1));

  const islandShapes: { x: number; y: number; w: number; h: number }[] = [];

  for (let i = 0; i < numIslands; i++) {
    const w = MIN_ISLAND_W + Math.floor(Math.random() * (MAX_ISLAND_W - MIN_ISLAND_W + 1));
    const h = MIN_ISLAND_H + Math.floor(Math.random() * (MAX_ISLAND_H - MIN_ISLAND_H + 1));
    const x = playLeft + Math.floor(Math.random() * Math.max(1, midCol - playLeft - w - 2));
    const y = 1 + Math.floor(Math.random() * Math.max(1, rows - h - 2));
    islandShapes.push({ x, y, w, h });
  }

  for (const { x, y, w, h } of islandShapes) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const cx = x + dx;
        const cy = y + dy;
        if (cx >= playLeft && cx < playRight && cy >= 0 && cy < rows) {
          cells[cy][cx] = false;
        }
      }
    }
    const mirrorX = cols - 1 - x - w + 1;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const cx = mirrorX + dx;
        const cy = y + dy;
        if (cx >= playLeft && cx < playRight && cy >= 0 && cy < rows) {
          cells[cy][cx] = false;
        }
      }
    }
  }

  return cells;
}
