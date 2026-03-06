import { describe, it, expect, beforeEach } from 'vitest';
import { CellEffectMap, type CellEffectMapConfig } from './CellEffectMap';
import type {
  SlowEffect,
  DamageEffect,
  TempWallTimeEffect,
  TempWallHPEffect,
} from './CellEffect';

const config: CellEffectMapConfig = {
  cols: 8,
  rows: 4,
  cellW: 32,
  cellH: 32,
};

function pxCenter(col: number, row: number): { px: number; py: number } {
  return { px: col * config.cellW + config.cellW / 2, py: row * config.cellH + config.cellH / 2 };
}

describe(CellEffectMap.name, () => {
  let map: CellEffectMap;

  beforeEach(() => {
    map = new CellEffectMap(config);
  });

  describe('addEffect / getEffectsAt / removeEffect', () => {
    it('returns empty array for cell with no effects', () => {
      expect(map.getEffectsAt(0, 0)).toEqual([]);
    });

    it('adds and retrieves an effect', () => {
      const effect: SlowEffect = { type: 'slow', owner: 0, factor: 0.5 };
      map.addEffect(2, 1, effect);
      expect(map.getEffectsAt(2, 1)).toEqual([effect]);
    });

    it('supports multiple effects on the same cell', () => {
      const slow: SlowEffect = { type: 'slow', owner: 0, factor: 0.5 };
      const dmg: DamageEffect = { type: 'damage', owner: 1, damagePerSecond: 3 };
      map.addEffect(3, 2, slow);
      map.addEffect(3, 2, dmg);
      expect(map.getEffectsAt(3, 2)).toEqual([slow, dmg]);
    });

    it('removes a specific effect by reference', () => {
      const slow: SlowEffect = { type: 'slow', owner: 0, factor: 0.5 };
      const dmg: DamageEffect = { type: 'damage', owner: 1, damagePerSecond: 3 };
      map.addEffect(1, 0, slow);
      map.addEffect(1, 0, dmg);

      map.removeEffect(1, 0, slow);
      expect(map.getEffectsAt(1, 0)).toEqual([dmg]);
    });

    it('cleans up map entry when last effect is removed', () => {
      const effect: SlowEffect = { type: 'slow', owner: 0, factor: 0.5 };
      map.addEffect(0, 0, effect);
      map.removeEffect(0, 0, effect);
      expect(map.hasAnyEffects).toBe(false);
    });

    it('does nothing when removing a non-existent effect', () => {
      const effect: SlowEffect = { type: 'slow', owner: 0, factor: 0.5 };
      map.removeEffect(0, 0, effect);
      expect(map.getEffectsAt(0, 0)).toEqual([]);
    });
  });

  describe('getSlowFactor', () => {
    it.each([
      { owner: 0 as const, forPlayer: 1 as const, factor: 0.4, expected: 0.4, desc: 'enemy slow applies' },
      { owner: 0 as const, forPlayer: 0 as const, factor: 0.4, expected: 1, desc: 'own slow does not apply' },
    ])('$desc (owner=$owner, forPlayer=$forPlayer)', ({ owner, forPlayer, factor, expected }) => {
      const { px, py } = pxCenter(2, 1);
      map.addEffect(2, 1, { type: 'slow', owner, factor });
      expect(map.getSlowFactor(px, py, forPlayer)).toBeCloseTo(expected);
    });

    it('multiplies multiple enemy slow effects', () => {
      const { px, py } = pxCenter(3, 0);
      map.addEffect(3, 0, { type: 'slow', owner: 0, factor: 0.5 });
      map.addEffect(3, 0, { type: 'slow', owner: 0, factor: 0.5 });
      expect(map.getSlowFactor(px, py, 1)).toBeCloseTo(0.25);
    });

    it('returns 1 for cell with no effects', () => {
      expect(map.getSlowFactor(50, 50, 0)).toBe(1);
    });

    it('returns 1 for out-of-bounds pixel', () => {
      expect(map.getSlowFactor(-10, -10, 0)).toBe(1);
    });
  });

  describe('isTempWall', () => {
    it.each([
      { effectType: 'tempWallTime' as const, owner: 0 as const, forPlayer: 1 as const, expected: true, desc: 'enemy time wall blocks' },
      { effectType: 'tempWallTime' as const, owner: 0 as const, forPlayer: 0 as const, expected: false, desc: 'own time wall does not block' },
      { effectType: 'tempWallHP' as const, owner: 1 as const, forPlayer: 0 as const, expected: true, desc: 'enemy HP wall blocks' },
      { effectType: 'tempWallHP' as const, owner: 1 as const, forPlayer: 1 as const, expected: false, desc: 'own HP wall does not block' },
    ])('$desc', ({ effectType, owner, forPlayer, expected }) => {
      const { px, py } = pxCenter(4, 2);
      if (effectType === 'tempWallTime') {
        map.addEffect(4, 2, { type: 'tempWallTime', owner, remainingMs: 5000, totalMs: 10000 });
      } else {
        map.addEffect(4, 2, { type: 'tempWallHP', owner, hp: 10, maxHp: 20 });
      }
      expect(map.isTempWall(px, py, forPlayer)).toBe(expected);
    });

    it('returns false for cell with no effects', () => {
      expect(map.isTempWall(50, 50, 0)).toBe(false);
    });

    it('returns false for out-of-bounds pixel', () => {
      expect(map.isTempWall(-10, -10, 0)).toBe(false);
    });
  });

  describe('getDamagePerSecond', () => {
    it.each([
      { owner: 0 as const, forPlayer: 1 as const, dps: 5, expected: 5, desc: 'enemy damage applies' },
      { owner: 0 as const, forPlayer: 0 as const, dps: 5, expected: 0, desc: 'own damage does not apply' },
    ])('$desc', ({ owner, forPlayer, dps, expected }) => {
      const { px, py } = pxCenter(1, 1);
      map.addEffect(1, 1, { type: 'damage', owner, damagePerSecond: dps });
      expect(map.getDamagePerSecond(px, py, forPlayer)).toBe(expected);
    });

    it('sums damage from both players', () => {
      const { px, py } = pxCenter(2, 2);
      map.addEffect(2, 2, { type: 'damage', owner: 0, damagePerSecond: 3 });
      map.addEffect(2, 2, { type: 'damage', owner: 1, damagePerSecond: 4 });
      // Player 0 takes damage from owner=1 effects
      expect(map.getDamagePerSecond(px, py, 0)).toBe(4);
      // Player 1 takes damage from owner=0 effects
      expect(map.getDamagePerSecond(px, py, 1)).toBe(3);
    });

    it('returns 0 for cell with no effects', () => {
      expect(map.getDamagePerSecond(50, 50, 0)).toBe(0);
    });
  });

  describe('damageWallAt', () => {
    it('reduces HP of enemy tempWallHP effect', () => {
      const wall: TempWallHPEffect = { type: 'tempWallHP', owner: 0, hp: 10, maxHp: 10 };
      map.addEffect(3, 1, wall);
      const damaged = map.damageWallAt(3, 1, 3, 1);
      expect(damaged).toBe(true);
      expect(wall.hp).toBe(7);
    });

    it('removes wall when HP drops to 0', () => {
      const wall: TempWallHPEffect = { type: 'tempWallHP', owner: 0, hp: 5, maxHp: 10 };
      map.addEffect(3, 1, wall);
      map.damageWallAt(3, 1, 5, 1);
      expect(map.getEffectsAt(3, 1)).toEqual([]);
    });

    it('removes wall when HP drops below 0', () => {
      const wall: TempWallHPEffect = { type: 'tempWallHP', owner: 0, hp: 3, maxHp: 10 };
      map.addEffect(3, 1, wall);
      map.damageWallAt(3, 1, 10, 1);
      expect(map.getEffectsAt(3, 1)).toEqual([]);
    });

    it('does not damage own wall', () => {
      const wall: TempWallHPEffect = { type: 'tempWallHP', owner: 0, hp: 10, maxHp: 10 };
      map.addEffect(3, 1, wall);
      const damaged = map.damageWallAt(3, 1, 5, 0);
      expect(damaged).toBe(false);
      expect(wall.hp).toBe(10);
    });

    it('returns false for cell with no effects', () => {
      expect(map.damageWallAt(0, 0, 5, 1)).toBe(false);
    });

    it('preserves other effects when wall is destroyed', () => {
      const slow: SlowEffect = { type: 'slow', owner: 0, factor: 0.5 };
      const wall: TempWallHPEffect = { type: 'tempWallHP', owner: 0, hp: 1, maxHp: 10 };
      map.addEffect(2, 2, slow);
      map.addEffect(2, 2, wall);

      map.damageWallAt(2, 2, 5, 1);
      expect(map.getEffectsAt(2, 2)).toEqual([slow]);
    });
  });

  describe('update (timer expiry)', () => {
    it('decrements remainingMs on tempWallTime effects', () => {
      const wall: TempWallTimeEffect = { type: 'tempWallTime', owner: 0, remainingMs: 5000, totalMs: 10000 };
      map.addEffect(1, 1, wall);
      map.update(2000);
      expect(wall.remainingMs).toBe(3000);
    });

    it('removes tempWallTime when remainingMs reaches 0', () => {
      const wall: TempWallTimeEffect = { type: 'tempWallTime', owner: 0, remainingMs: 1000, totalMs: 5000 };
      map.addEffect(1, 1, wall);
      map.update(1000);
      expect(map.getEffectsAt(1, 1)).toEqual([]);
    });

    it('removes tempWallTime when remainingMs goes below 0', () => {
      const wall: TempWallTimeEffect = { type: 'tempWallTime', owner: 0, remainingMs: 500, totalMs: 5000 };
      map.addEffect(1, 1, wall);
      map.update(1000);
      expect(map.getEffectsAt(1, 1)).toEqual([]);
    });

    it('does not affect non-timed effects', () => {
      const slow: SlowEffect = { type: 'slow', owner: 0, factor: 0.5 };
      map.addEffect(1, 1, slow);
      map.update(5000);
      expect(map.getEffectsAt(1, 1)).toEqual([slow]);
    });

    it('cleans up map entry when last timed effect expires', () => {
      const wall: TempWallTimeEffect = { type: 'tempWallTime', owner: 0, remainingMs: 100, totalMs: 100 };
      map.addEffect(0, 0, wall);
      map.update(200);
      expect(map.hasAnyEffects).toBe(false);
    });
  });

  describe('hasAnyEffects', () => {
    it('returns false when empty', () => {
      expect(map.hasAnyEffects).toBe(false);
    });

    it('returns true when effects exist', () => {
      map.addEffect(0, 0, { type: 'slow', owner: 0, factor: 0.5 });
      expect(map.hasAnyEffects).toBe(true);
    });
  });

  describe('forEach', () => {
    it('iterates over all cells with effects', () => {
      map.addEffect(1, 0, { type: 'slow', owner: 0, factor: 0.5 });
      map.addEffect(3, 2, { type: 'damage', owner: 1, damagePerSecond: 2 });

      const visited: { col: number; row: number }[] = [];
      map.forEach((col, row) => visited.push({ col, row }));

      expect(visited).toHaveLength(2);
      expect(visited).toContainEqual({ col: 1, row: 0 });
      expect(visited).toContainEqual({ col: 3, row: 2 });
    });

    it('does not iterate when empty', () => {
      let count = 0;
      map.forEach(() => count++);
      expect(count).toBe(0);
    });
  });

  describe('cell ownership', () => {
    it.each([
      { entrant: 0 as const, expectedOwner: 0 as const, desc: 'A enters empty cell, A owns' },
      { entrant: 1 as const, expectedOwner: 1 as const, desc: 'B enters empty cell, B owns' },
    ])('$desc', ({ entrant, expectedOwner }) => {
      map.enterCell(2, 1, entrant);
      expect(map.getOwnerAt(pxCenter(2, 1).px, pxCenter(2, 1).py)).toBe(expectedOwner);
    });

    it('A leaves cell, A still owns', () => {
      map.enterCell(2, 1, 0);
      map.leaveCell(2, 1, 0);
      expect(map.getOwnerAt(pxCenter(2, 1).px, pxCenter(2, 1).py)).toBe(0);
    });

    it('B enters owned cell with no A occupants, B captures', () => {
      map.enterCell(2, 1, 0);
      map.leaveCell(2, 1, 0);
      map.enterCell(2, 1, 1);
      expect(map.getOwnerAt(pxCenter(2, 1).px, pxCenter(2, 1).py)).toBe(1);
    });

    it('B enters owned cell while A still present, A keeps ownership', () => {
      map.enterCell(2, 1, 0);
      map.enterCell(2, 1, 1);
      expect(map.getOwnerAt(pxCenter(2, 1).px, pxCenter(2, 1).py)).toBe(0);
    });

    it('returns null for unowned cell', () => {
      expect(map.getOwnerAt(50, 50)).toBeNull();
    });

    it('returns null for out-of-bounds', () => {
      expect(map.getOwnerAt(-10, -10)).toBeNull();
    });

    it('hasAnyOwnedCells is false when empty', () => {
      expect(map.hasAnyOwnedCells).toBe(false);
    });

    it('hasAnyOwnedCells is true when cells are owned', () => {
      map.enterCell(1, 0, 0);
      expect(map.hasAnyOwnedCells).toBe(true);
    });

    it('forEachOwnedCell iterates owned cells', () => {
      map.enterCell(1, 0, 0);
      map.enterCell(3, 2, 1);
      const visited: { col: number; row: number; owner: 0 | 1 }[] = [];
      map.forEachOwnedCell((col, row, owner) => visited.push({ col, row, owner }));
      expect(visited).toHaveLength(2);
      expect(visited).toContainEqual({ col: 1, row: 0, owner: 0 });
      expect(visited).toContainEqual({ col: 3, row: 2, owner: 1 });
    });

    it('capture flash present on new capture', () => {
      map.enterCell(2, 1, 0);
      let hasFlash = false;
      map.forEachOwnedCell((_col, _row, _owner, flash) => {
        hasFlash = flash;
      });
      expect(hasFlash).toBe(true);
    });

    it('capture flash expires after update', () => {
      map.enterCell(2, 1, 0);
      map.update(500);
      let hasFlash = false;
      map.forEachOwnedCell((_col, _row, _owner, flash) => {
        hasFlash = flash;
      });
      expect(hasFlash).toBe(false);
    });
  });

  describe('pixel-to-cell conversion', () => {
    it.each([
      { px: 0, py: 0, expectedCol: 0, expectedRow: 0 },
      { px: 31, py: 31, expectedCol: 0, expectedRow: 0 },
      { px: 32, py: 0, expectedCol: 1, expectedRow: 0 },
      { px: 64, py: 64, expectedCol: 2, expectedRow: 2 },
      { px: 255, py: 127, expectedCol: 7, expectedRow: 3 },
    ])('pixel ($px,$py) maps to cell ($expectedCol,$expectedRow)', ({ px, py, expectedCol, expectedRow }) => {
      const effect: SlowEffect = { type: 'slow', owner: 0, factor: 0.5 };
      map.addEffect(expectedCol, expectedRow, effect);
      expect(map.getSlowFactor(px, py, 1)).toBeCloseTo(0.5);
    });
  });
});
