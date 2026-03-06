import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SlowTowerParticle } from './SlowTowerParticle';
import { resetParticleIds, type ParticleDependencies, type ParticleConfig } from './AbstractParticle';
import { createMockGameContext } from '../__mocks__/createMockGameContext';
import { createMockParticle } from '../__mocks__/createMockParticle';
import { CONFIG } from '../config';

const testConfig: ParticleConfig = {
  gameWidth: 512, gameHeight: 256, baseWidthCells: 2, mazeCols: 16,
  driftStrength: 0, enemyBias: 0, stuckThresholdBlocks: 5,
  stuckThresholdSeconds: 10, baseDamageOnReach: 1,
};

function createDeps(): ParticleDependencies {
  let nextId = 0;
  return { nextId: () => nextId++, config: testConfig };
}

describe(SlowTowerParticle.name, () => {
  beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0.5); });
  afterEach(() => { vi.restoreAllMocks(); resetParticleIds(); });

  it('has typeName "slowTower"', () => {
    const t = new SlowTowerParticle(100, 100, 0, createDeps());
    expect(t.typeName).toBe('slowTower');
  });

  it('canMove is false', () => {
    const t = new SlowTowerParticle(100, 100, 0, createDeps());
    expect(t.canMove).toBe(false);
  });

  it('isStuck returns false', () => {
    const t = new SlowTowerParticle(100, 100, 0, createDeps());
    t.age = 999;
    expect(t.isStuck()).toBe(false);
  });

  it('getBaseDamage returns 0', () => {
    const t = new SlowTowerParticle(100, 100, 0, createDeps());
    expect(t.getBaseDamage()).toBe(0);
  });

  it('initializes with base stats from config', () => {
    const t = new SlowTowerParticle(100, 100, 0, createDeps());
    expect(t.health).toBe(CONFIG.TOWER_SLOW_BASE_HP);
    expect(t.slowFactor).toBe(CONFIG.TOWER_SLOW_BASE_FACTOR);
    expect(t.range).toBe(CONFIG.TOWER_SLOW_BASE_RANGE);
    expect(t.level).toBe(0);
  });

  it('applies slow to enemies in range', () => {
    const t = new SlowTowerParticle(100, 100, 0, createDeps());
    const enemy = createMockParticle({ x: 120, y: 100, owner: 1, towerSlowFactor: 1 });
    const ctx = createMockGameContext({ particles: [t, enemy] });

    t.onUpdate(0.1, ctx);

    expect(enemy.towerSlowFactor).toBe(1 - t.slowFactor);
  });

  it('does not slow own particles', () => {
    const t = new SlowTowerParticle(100, 100, 0, createDeps());
    const friendly = createMockParticle({ x: 110, y: 100, owner: 0, towerSlowFactor: 1 });
    const ctx = createMockGameContext({ particles: [t, friendly] });

    t.onUpdate(0.1, ctx);

    expect(friendly.towerSlowFactor).toBe(1);
  });

  it('does not slow enemies out of range', () => {
    const t = new SlowTowerParticle(100, 100, 0, createDeps());
    const far = createMockParticle({ x: 100 + t.range + 50, y: 100, owner: 1, towerSlowFactor: 1 });
    const ctx = createMockGameContext({ particles: [t, far] });

    t.onUpdate(0.1, ctx);

    expect(far.towerSlowFactor).toBe(1);
  });

  it('stacks slow with existing tower slow (uses min)', () => {
    const t = new SlowTowerParticle(100, 100, 0, createDeps());
    const enemy = createMockParticle({ x: 110, y: 100, owner: 1, towerSlowFactor: 0.5 });
    const ctx = createMockGameContext({ particles: [t, enemy] });

    t.onUpdate(0.1, ctx);

    // Should use the lower (slower) value
    const towerSlow = 1 - t.slowFactor;
    expect(enemy.towerSlowFactor).toBe(Math.min(0.5, towerSlow));
  });

  it('upgrade increases stats', () => {
    const t = new SlowTowerParticle(100, 100, 0, createDeps());
    const origSlow = t.slowFactor;
    const origRange = t.range;

    t.upgrade();

    expect(t.level).toBe(1);
    expect(t.slowFactor).toBeGreaterThan(origSlow);
    expect(t.range).toBeGreaterThan(origRange);
  });

  it('slow factor is capped at 0.9', () => {
    const t = new SlowTowerParticle(100, 100, 0, createDeps());
    for (let i = 0; i < 50; i++) t.upgrade();
    expect(t.slowFactor).toBeLessThanOrEqual(0.9);
  });
});
