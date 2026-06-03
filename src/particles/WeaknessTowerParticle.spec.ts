import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WeaknessTowerParticle } from './WeaknessTowerParticle';
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

describe(WeaknessTowerParticle.name, () => {
  beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0.5); });
  afterEach(() => { vi.restoreAllMocks(); resetParticleIds(); });

  it('has typeName "weaknessTower"', () => {
    const t = new WeaknessTowerParticle(100, 100, 0, createDeps());
    expect(t.typeName).toBe('weaknessTower');
  });

  it('canMove is false', () => {
    const t = new WeaknessTowerParticle(100, 100, 0, createDeps());
    expect(t.canMove).toBe(false);
  });

  it('isStuck returns false', () => {
    const t = new WeaknessTowerParticle(100, 100, 0, createDeps());
    t.age = 999;
    expect(t.isStuck()).toBe(false);
  });

  it('getBaseDamage returns 0', () => {
    const t = new WeaknessTowerParticle(100, 100, 0, createDeps());
    expect(t.getBaseDamage()).toBe(0);
  });

  it('initializes with base stats from config', () => {
    const t = new WeaknessTowerParticle(100, 100, 0, createDeps());
    expect(t.health).toBe(CONFIG.TOWER_WEAKNESS_BASE_HP);
    expect(t.drainDps).toBe(CONFIG.TOWER_WEAKNESS_BASE_DRAIN_DPS);
    expect(t.attackReduction).toBe(CONFIG.TOWER_WEAKNESS_BASE_ATTACK_REDUCTION);
    expect(t.range).toBe(CONFIG.TOWER_WEAKNESS_BASE_RANGE);
    expect(t.level).toBe(0);
  });

  it('drains HP from enemies in range', () => {
    const t = new WeaknessTowerParticle(100, 100, 0, createDeps());
    const enemy = createMockParticle({ x: 120, y: 100, owner: 1, health: 10, maxHealth: 10 });
    const ctx = createMockGameContext({ particles: [t, enemy] });

    t.onUpdate(1000, ctx); // 1 second = dt passed as ms (1000 ms)

    expect(enemy.health).toBeLessThan(10);
  });

  it('reduces attackFactor of enemies in range', () => {
    const t = new WeaknessTowerParticle(100, 100, 0, createDeps());
    const enemy = createMockParticle({ x: 120, y: 100, owner: 1, attackFactor: 1 });
    const ctx = createMockGameContext({ particles: [t, enemy] });

    t.onUpdate(100, ctx);

    expect(enemy.attackFactor).toBeLessThan(1);
    expect(enemy.attackFactor).toBeCloseTo(1 - CONFIG.TOWER_WEAKNESS_BASE_ATTACK_REDUCTION);
  });

  it('does not affect own particles', () => {
    const t = new WeaknessTowerParticle(100, 100, 0, createDeps());
    const friendly = createMockParticle({ x: 110, y: 100, owner: 0, health: 10, attackFactor: 1 });
    const ctx = createMockGameContext({ particles: [t, friendly] });

    t.onUpdate(1000, ctx);

    expect(friendly.health).toBe(10);
    expect(friendly.attackFactor).toBe(1);
  });

  it('does not affect enemies out of range', () => {
    const t = new WeaknessTowerParticle(100, 100, 0, createDeps());
    const far = createMockParticle({ x: 100 + t.range + 50, y: 100, owner: 1, health: 10, attackFactor: 1 });
    const ctx = createMockGameContext({ particles: [t, far] });

    t.onUpdate(1000, ctx);

    expect(far.health).toBe(10);
    expect(far.attackFactor).toBe(1);
  });

  it('upgrade increases drain and attack reduction', () => {
    const t = new WeaknessTowerParticle(100, 100, 0, createDeps());
    const origDrain = t.drainDps;
    const origReduction = t.attackReduction;

    t.upgrade();

    expect(t.level).toBe(1);
    expect(t.drainDps).toBeGreaterThan(origDrain);
    expect(t.attackReduction).toBeGreaterThan(origReduction);
  });

  it('attack reduction is capped at 0.9', () => {
    const t = new WeaknessTowerParticle(100, 100, 0, createDeps());
    for (let i = 0; i < 50; i++) t.upgrade();
    expect(t.attackReduction).toBeLessThanOrEqual(0.9);
  });
});
