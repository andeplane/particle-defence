import { CONFIG } from './config';
import type { GameParticle } from './particle';

export class SpatialHash {
  private cellSize: number;
  private cells: Map<number, GameParticle[]> = new Map();
  private cols: number;

  constructor() {
    this.cellSize = CONFIG.SPATIAL_CELL_SIZE;
    this.cols = Math.ceil(CONFIG.GAME_WIDTH / this.cellSize);
  }

  clear(): void {
    this.cells.clear();
  }

  private keyFor(px: number, py: number): number {
    const col = Math.floor(px / this.cellSize);
    const row = Math.floor(py / this.cellSize);
    return row * this.cols + col;
  }

  insert(p: GameParticle): void {
    const key = this.keyFor(p.x, p.y);
    let bucket = this.cells.get(key);
    if (!bucket) {
      bucket = [];
      this.cells.set(key, bucket);
    }
    bucket.push(p);
  }

  getNearby(p: GameParticle): GameParticle[] {
    const col = Math.floor(p.x / this.cellSize);
    const row = Math.floor(p.y / this.cellSize);
    const result: GameParticle[] = [];

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const key = (row + dy) * this.cols + (col + dx);
        const bucket = this.cells.get(key);
        if (bucket) {
          for (const other of bucket) {
            if (other !== p) result.push(other);
          }
        }
      }
    }

    return result;
  }
}
