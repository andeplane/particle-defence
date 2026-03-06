import { vi } from 'vitest';
import type { ICellEffectMap } from '../grid/CellEffect';

export function createMockCellEffectMap(overrides: Partial<ICellEffectMap> = {}): ICellEffectMap {
  const defaults: ICellEffectMap = {
    addEffect: vi.fn(),
    removeEffect: vi.fn(),
    getEffectsAt: vi.fn(() => []),
    getSlowFactor: vi.fn(() => 1),
    isTempWall: vi.fn(() => false),
    getDamagePerSecond: vi.fn(() => 0),
    damageWallAt: vi.fn(() => false),
    update: vi.fn(),
    hasAnyEffects: false,
    forEach: vi.fn(),
  };

  return { ...defaults, ...overrides };
}
