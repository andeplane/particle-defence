import { CONFIG } from '../config';
import type {
  CellEffect,
  ICellEffectMap,
  TempWallTimeEffect,
} from './CellEffect';

interface CellOwnership {
  owner: 0 | 1;
  occupants: [number, number];
  captureFlash?: { owner: 0 | 1; remainingMs: number };
}

export type CellEffectMapConfig = {
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
};

const EMPTY_EFFECTS: readonly CellEffect[] = Object.freeze([]);

export class CellEffectMap implements ICellEffectMap {
  private readonly effects = new Map<number, CellEffect[]>();
  private readonly ownership = new Map<number, CellOwnership>();
  private readonly config: CellEffectMapConfig;

  constructor(config: CellEffectMapConfig) {
    this.config = config;
  }

  private key(col: number, row: number): number {
    return row * this.config.cols + col;
  }

  private pixelToCell(px: number, py: number): { col: number; row: number } {
    return {
      col: Math.floor(px / this.config.cellW),
      row: Math.floor(py / this.config.cellH),
    };
  }

  private isInBounds(col: number, row: number): boolean {
    return col >= 0 && col < this.config.cols && row >= 0 && row < this.config.rows;
  }

  addEffect(col: number, row: number, effect: CellEffect): void {
    const k = this.key(col, row);
    const list = this.effects.get(k);
    if (list) {
      list.push(effect);
    } else {
      this.effects.set(k, [effect]);
    }
  }

  removeEffect(col: number, row: number, effect: CellEffect): void {
    const k = this.key(col, row);
    const list = this.effects.get(k);
    if (!list) return;
    const idx = list.indexOf(effect);
    if (idx !== -1) {
      list.splice(idx, 1);
      if (list.length === 0) {
        this.effects.delete(k);
      }
    }
  }

  getEffectsAt(col: number, row: number): readonly CellEffect[] {
    return this.effects.get(this.key(col, row)) ?? EMPTY_EFFECTS;
  }

  getSlowFactor(px: number, py: number, forPlayer: 0 | 1): number {
    const { col, row } = this.pixelToCell(px, py);
    if (!this.isInBounds(col, row)) return 1;

    const list = this.effects.get(this.key(col, row));
    if (!list) return 1;

    let factor = 1;
    for (const e of list) {
      if (e.type === 'slow' && e.owner !== forPlayer) {
        factor *= e.factor;
      }
    }
    return factor;
  }

  isTempWall(px: number, py: number, forPlayer: 0 | 1): boolean {
    const { col, row } = this.pixelToCell(px, py);
    if (!this.isInBounds(col, row)) return false;

    const list = this.effects.get(this.key(col, row));
    if (!list) return false;

    for (const e of list) {
      if ((e.type === 'tempWallTime' || e.type === 'tempWallHP') && e.owner !== forPlayer) {
        return true;
      }
    }
    return false;
  }

  getDamagePerSecond(px: number, py: number, forPlayer: 0 | 1): number {
    const { col, row } = this.pixelToCell(px, py);
    if (!this.isInBounds(col, row)) return 0;

    const list = this.effects.get(this.key(col, row));
    if (!list) return 0;

    let dps = 0;
    for (const e of list) {
      if (e.type === 'damage' && e.owner !== forPlayer) {
        dps += e.damagePerSecond;
      }
    }
    return dps;
  }

  damageWallAt(col: number, row: number, damage: number, attackerOwner: 0 | 1): boolean {
    const k = this.key(col, row);
    const list = this.effects.get(k);
    if (!list) return false;

    let damaged = false;
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (e.type === 'tempWallHP' && e.owner !== attackerOwner) {
        e.hp -= damage;
        damaged = true;
        if (e.hp <= 0) {
          list.splice(i, 1);
        }
      }
    }

    if (list.length === 0) {
      this.effects.delete(k);
    }

    return damaged;
  }

  update(deltaMs: number): void {
    const toDelete: number[] = [];

    for (const [k, list] of this.effects) {
      for (let i = list.length - 1; i >= 0; i--) {
        const e = list[i];
        if (e.type === 'tempWallTime') {
          (e as TempWallTimeEffect).remainingMs -= deltaMs;
          if ((e as TempWallTimeEffect).remainingMs <= 0) {
            list.splice(i, 1);
          }
        }
      }
      if (list.length === 0) {
        toDelete.push(k);
      }
    }

    for (const k of toDelete) {
      this.effects.delete(k);
    }

    for (const [, data] of this.ownership) {
      if (data.captureFlash) {
        data.captureFlash.remainingMs -= deltaMs;
        if (data.captureFlash.remainingMs <= 0) {
          delete data.captureFlash;
        }
      }
    }
  }

  enterCell(col: number, row: number, owner: 0 | 1): void {
    if (!this.isInBounds(col, row)) return;
    const k = this.key(col, row);
    let data = this.ownership.get(k);
    if (!data) {
      data = {
        owner,
        occupants: [0, 0],
        captureFlash: { owner, remainingMs: CONFIG.OWNERSHIP_CAPTURE_FLASH_MS },
      };
      data.occupants[owner] = 1;
      this.ownership.set(k, data);
      return;
    }
    data.occupants[owner]++;
    const currentOwnerHasOccupants = data.occupants[data.owner] > 0;
    if (!currentOwnerHasOccupants && data.owner !== owner) {
      data.owner = owner;
      data.captureFlash = { owner, remainingMs: CONFIG.OWNERSHIP_CAPTURE_FLASH_MS };
    }
  }

  leaveCell(col: number, row: number, owner: 0 | 1): void {
    if (!this.isInBounds(col, row)) return;
    const k = this.key(col, row);
    const data = this.ownership.get(k);
    if (!data) return;
    data.occupants[owner] = Math.max(0, data.occupants[owner] - 1);
  }

  getOwnerAt(px: number, py: number): 0 | 1 | null {
    const { col, row } = this.pixelToCell(px, py);
    if (!this.isInBounds(col, row)) return null;
    const data = this.ownership.get(this.key(col, row));
    if (!data) return null;
    return data.owner;
  }

  get hasAnyOwnedCells(): boolean {
    return this.ownership.size > 0;
  }

  forEachOwnedCell(callback: (col: number, row: number, owner: 0 | 1, hasCaptureFlash: boolean) => void): void {
    for (const [k, data] of this.ownership) {
      const col = k % this.config.cols;
      const row = Math.floor(k / this.config.cols);
      callback(col, row, data.owner, !!data.captureFlash);
    }
  }

  get hasAnyEffects(): boolean {
    return this.effects.size > 0;
  }

  forEach(callback: (col: number, row: number, effects: readonly CellEffect[]) => void): void {
    for (const [k, list] of this.effects) {
      const col = k % this.config.cols;
      const row = Math.floor(k / this.config.cols);
      callback(col, row, list);
    }
  }
}
