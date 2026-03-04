import { CONFIG } from './config';

export type MazeGrid = boolean[][];

export function generateMaze(): MazeGrid {
  const { MAZE_COLS, MAZE_ROWS, PERCOLATION_THRESHOLD, BASE_WIDTH_CELLS } = CONFIG;

  let grid: MazeGrid;
  let attempts = 0;

  do {
    grid = createPercolationGrid(MAZE_COLS, MAZE_ROWS, PERCOLATION_THRESHOLD, BASE_WIDTH_CELLS);
    attempts++;
    if (attempts > 100) {
      // Fallback: open more cells
      grid = createPercolationGrid(MAZE_COLS, MAZE_ROWS, 0.7, BASE_WIDTH_CELLS);
    }
  } while (!hasPath(grid, MAZE_COLS, MAZE_ROWS, BASE_WIDTH_CELLS));

  return grid;
}

function createPercolationGrid(
  cols: number,
  rows: number,
  threshold: number,
  baseWidth: number
): MazeGrid {
  const grid: MazeGrid = [];

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

function hasPath(
  grid: MazeGrid,
  cols: number,
  rows: number,
  baseWidth: number
): boolean {
  const visited = new Set<number>();
  const queue: number[] = [];

  const midY = Math.floor(rows / 2);
  const startKey = midY * cols + 0;
  queue.push(startKey);
  visited.add(startKey);

  const targetX = cols - 1;

  while (queue.length > 0) {
    const key = queue.shift()!;
    const cx = key % cols;
    const cy = Math.floor(key / cols);

    if (cx >= targetX - baseWidth) return true;

    const neighbors = [
      [cx - 1, cy], [cx + 1, cy],
      [cx, cy - 1], [cx, cy + 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      const nKey = ny * cols + nx;
      if (visited.has(nKey)) continue;
      if (!grid[ny][nx]) continue;
      visited.add(nKey);
      queue.push(nKey);
    }
  }

  return false;
}

export function getCellSize(): { cellW: number; cellH: number } {
  return {
    cellW: CONFIG.GAME_WIDTH / CONFIG.MAZE_COLS,
    cellH: CONFIG.GAME_HEIGHT / CONFIG.MAZE_ROWS,
  };
}

export function isWall(grid: MazeGrid, px: number, py: number): boolean {
  const { cellW, cellH } = getCellSize();
  const col = Math.floor(px / cellW);
  const row = Math.floor(py / cellH);
  if (col < 0 || col >= CONFIG.MAZE_COLS || row < 0 || row >= CONFIG.MAZE_ROWS) return true;
  return !grid[row][col];
}

export function isInBase(px: number, playerId: 0 | 1): boolean {
  const { cellW } = getCellSize();
  const basePixelWidth = CONFIG.BASE_WIDTH_CELLS * cellW;
  if (playerId === 0) {
    return px < basePixelWidth;
  } else {
    return px > CONFIG.GAME_WIDTH - basePixelWidth;
  }
}
