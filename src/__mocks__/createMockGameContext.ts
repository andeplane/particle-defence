import { vi } from 'vitest';
import type { GameContext } from '../particles/GameContext';
import type { IPlayer } from '../player';
import type { ISpatialHash } from '../spatial-hash';
import type { IParticle } from '../particles/AbstractParticle';
import { createMockGrid } from './createMockGrid';
import { createMockCellEffectMap } from './createMockCellEffectMap';

export function createMockGameContext(overrides: Partial<GameContext> = {}): GameContext {
  const defaults: GameContext = {
    grid: createMockGrid(),
    cellEffects: createMockCellEffectMap(),
    spatialHash: {
      clear: vi.fn(),
      insert: vi.fn(),
      getNearby: vi.fn(() => []),
    } satisfies ISpatialHash,
    particles: [] as IParticle[],
    players: [
      createMinimalMockPlayer(0),
      createMinimalMockPlayer(1),
    ],
    gameTimeMs: 0,
    killReward: 1,
    spawnExplosion: vi.fn(),
  };

  return { ...defaults, ...overrides };
}

function createMinimalMockPlayer(id: 0 | 1): IPlayer {
  return {
    id,
    baseHP: 1000,
    gold: 10,
    kills: 0,
    particleHealth: 3,
    particleAttack: 1,
    particleRadius: 3,
    spawnInterval: 60,
    particleSpeed: 180,
    maxParticles: 1000,
    particleDefense: 0,
    isAlive: true,
    getUpgradeLevel: vi.fn(() => 0),
    getUpgradeCost: vi.fn(() => 5),
    canAfford: vi.fn(() => true),
    buyUpgrade: vi.fn(() => true),
    canUseNuke: vi.fn(() => true),
    useNuke: vi.fn(),
    getNukeCooldownRemainingMs: vi.fn(() => 0),
    takeDamage: vi.fn(),
  };
}
