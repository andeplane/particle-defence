import { CONFIG } from '../config';

export class Grid {
  readonly cols: number;
  readonly rows: number;
  readonly baseWidthCells: number;
  readonly cells: boolean[][]; // true = walkable

  constructor(cols: number, rows: number, baseWidthCells: number, cells: boolean[][]) {
    this.cols = cols;
    this.rows = rows;
    this.baseWidthCells = baseWidthCells;
    this.cells = cells;
  }

  get cellW(): number {
    return CONFIG.GAME_WIDTH / this.cols;
  }

  get cellH(): number {
    return CONFIG.GAME_HEIGHT / this.rows;
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
      return px > CONFIG.GAME_WIDTH - basePixelWidth;
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
