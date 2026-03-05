import { CONFIG } from '../../config';
import { Grid } from '../Grid';
import { ensurePathExists } from './ensurePath';

/** Fraction of extra walls to carve for additional paths (0.15 = 15%) */
const EXTRA_PATH_FRACTION = 0.15;

export function generateMazeGrid(): Grid {
  const { MAZE_COLS, MAZE_ROWS, BASE_WIDTH_CELLS } = CONFIG;

  let grid: Grid;
  let attempts = 0;

  do {
    const cells = createMazeCells(MAZE_COLS, MAZE_ROWS, BASE_WIDTH_CELLS);
    ensurePathExists(cells, MAZE_COLS, MAZE_ROWS, BASE_WIDTH_CELLS);
    grid = new Grid(MAZE_COLS, MAZE_ROWS, BASE_WIDTH_CELLS, cells);
    attempts++;
    if (attempts > 50) {
      break;
    }
  } while (!grid.hasPath());

  return grid;
}

function createMazeCells(cols: number, rows: number, baseWidth: number): boolean[][] {
  const cells: boolean[][] = [];
  const mazeLeft = baseWidth;
  const mazeRight = cols - baseWidth;
  const midCol = Math.floor(cols / 2);

  for (let y = 0; y < rows; y++) {
    cells[y] = [];
    for (let x = 0; x < cols; x++) {
      const isLeftBase = x < baseWidth;
      const isRightBase = x >= mazeRight;
      cells[y][x] = isLeftBase || isRightBase;
    }
  }

  // Two independent mazes with different random seeds (no mirroring)
  // Left: [baseWidth, midCol], Right: [midCol, mazeRight)
  const startY = Math.floor(rows / 2) & ~1;

  carve(cells, mazeLeft, startY, mazeLeft, midCol + 1, rows);
  carveExtraPaths(cells, rows, mazeLeft, midCol + 1);

  carve(cells, mazeRight - 1, startY, midCol, mazeRight, rows);
  carveExtraPaths(cells, rows, midCol, mazeRight);

  carveMiddleHoles(cells, cols, rows, midCol);

  return cells;
}

/** Carves extra openings in center columns for better connectivity. Works for even and odd widths. */
function carveMiddleHoles(
  cells: boolean[][],
  cols: number,
  rows: number,
  midCol: number
): void {
  const isEven = cols % 2 === 0;
  const centerCols = isEven ? [midCol - 1, midCol] : [midCol - 1, midCol, midCol + 1];

  for (const cx of centerCols) {
    for (let y = 0; y < rows; y++) {
      if (Math.random() < 0.4) {
        cells[y][cx] = true;
      }
    }
  }
}

function carve(
  cells: boolean[][],
  cx: number,
  cy: number,
  mazeLeft: number,
  mazeRight: number,
  rows: number
): void {
  cells[cy][cx] = true;

  const dirs: [number, number][] = [
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2],
  ];
  shuffle(dirs);

  for (const [dx, dy] of dirs) {
    const nx = cx + dx;
    const ny = cy + dy;
    if (nx >= mazeLeft && nx < mazeRight && ny >= 0 && ny < rows) {
      if (!cells[ny][nx]) {
        cells[cy + dy / 2][cx + dx / 2] = true;
        carve(cells, nx, ny, mazeLeft, mazeRight, rows);
      }
    }
  }
}

function carveExtraPaths(
  cells: boolean[][],
  rows: number,
  xMin: number,
  xMax: number
): void {
  const candidates: [number, number][] = [];

  for (let y = 1; y < rows - 1; y++) {
    for (let x = xMin + 1; x < xMax; x++) {
      if (cells[y][x]) continue;
      const walkableNeighbors =
        (cells[y - 1][x] ? 1 : 0) +
        (cells[y + 1][x] ? 1 : 0) +
        (cells[y][x - 1] ? 1 : 0) +
        (cells[y][x + 1] ? 1 : 0);
      if (walkableNeighbors >= 2) {
        candidates.push([x, y]);
      }
    }
  }

  shuffle(candidates);
  const toCarve = Math.floor(candidates.length * EXTRA_PATH_FRACTION);
  for (let i = 0; i < toCarve && i < candidates.length; i++) {
    const [x, y] = candidates[i];
    cells[y][x] = true;
  }
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
