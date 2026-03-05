import { CONFIG } from './config';
import type { IParticle } from './particles';

export interface ISpatialHash {
  clear(): void;
  insert(p: IParticle): void;
  getNearby(p: IParticle): IParticle[];
}

export class SpatialHash implements ISpatialHash {
  private readonly cellSize: number;
  private readonly cells: Map<number, IParticle[]> = new Map();
  private readonly cols: number;

  constructor(cellSize: number = CONFIG.SPATIAL_CELL_SIZE, gameWidth: number = CONFIG.GAME_WIDTH) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(gameWidth / this.cellSize);
  }

  clear(): void {
    this.cells.clear();
  }

  private keyFor(px: number, py: number): number {
    const col = Math.floor(px / this.cellSize);
    const row = Math.floor(py / this.cellSize);
    return row * this.cols + col;
  }

  insert(p: IParticle): void {
    const key = this.keyFor(p.x, p.y);
    let bucket = this.cells.get(key);
    if (!bucket) {
      bucket = [];
      this.cells.set(key, bucket);
    }
    bucket.push(p);
  }

  getNearby(p: IParticle): IParticle[] {
    const col = Math.floor(p.x / this.cellSize);
    const row = Math.floor(p.y / this.cellSize);
    const result: IParticle[] = [];

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
