import { CONFIG } from '../config';

export interface IGrid {
  readonly cols: number;
  readonly rows: number;
  readonly baseWidthCells: number;
  readonly cells: boolean[][];
  readonly cellW: number;
  readonly cellH: number;
  isWall(px: number, py: number): boolean;
  isInBase(px: number, playerId: 0 | 1): boolean;
  hasPath(): boolean;
}

export class Grid implements IGrid {
  readonly cols: number;
  readonly rows: number;
  readonly baseWidthCells: number;
  readonly cells: boolean[][];
  private readonly gameWidth: number;
  private readonly gameHeight: number;

  constructor(
    cols: number,
    rows: number,
    baseWidthCells: number,
    cells: boolean[][],
    gameWidth: number = CONFIG.GAME_WIDTH,
    gameHeight: number = CONFIG.GAME_HEIGHT,
  ) {
    this.cols = cols;
    this.rows = rows;
    this.baseWidthCells = baseWidthCells;
    this.cells = cells;
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;
  }

  get cellW(): number {
    return this.gameWidth / this.cols;
  }

  get cellH(): number {
    return this.gameHeight / this.rows;
  }

  isWall(px: number, py: number): boolean {
    const col = Math.floor(px / this.cellW);
    const row = Math.floor(py / this.cellH);
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return true;
    return !this.cells[row][col];
  }

  isInBase(px: number, playerId: 0 | 1): boolean {
    const basePixelWidth = this.baseWidthCells * this.cellW;
    if (playerId === 0) {
      return px < basePixelWidth;
    } else {
      return px > this.gameWidth - basePixelWidth;
    }
  }

  hasPath(): boolean {
    const visited = new Set<number>();
    const queue: number[] = [];

    const midY = Math.floor(this.rows / 2);
    const startKey = midY * this.cols + 0;
    queue.push(startKey);
    visited.add(startKey);

    const targetX = this.cols - 1;

    while (queue.length > 0) {
      const key = queue.shift()!;
      const cx = key % this.cols;
      const cy = Math.floor(key / this.cols);

      if (cx >= targetX - this.baseWidthCells) return true;

      const neighbors = [
        [cx - 1, cy],
        [cx + 1, cy],
        [cx, cy - 1],
        [cx, cy + 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;
        const nKey = ny * this.cols + nx;
        if (visited.has(nKey)) continue;
        if (!this.cells[ny][nx]) continue;
        visited.add(nKey);
        queue.push(nKey);
      }
    }

    return false;
  }
}
