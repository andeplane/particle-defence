import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LaserTowerParticle } from './LaserTowerParticle';
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

describe(LaserTowerParticle.name, () => {
  beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0.5); });
  afterEach(() => { vi.restoreAllMocks(); resetParticleIds(); });

  it('has typeName "laserTower"', () => {
    const t = new LaserTowerParticle(100, 100, 0, createDeps());
    expect(t.typeName).toBe('laserTower');
  });

  it('canMove is false', () => {
    const t = new LaserTowerParticle(100, 100, 0, createDeps());
    expect(t.canMove).toBe(false);
  });

  it('isStuck returns false', () => {
    const t = new LaserTowerParticle(100, 100, 0, createDeps());
    t.age = 999;
    expect(t.isStuck()).toBe(false);
  });

  it('getBaseDamage returns 0', () => {
    const t = new LaserTowerParticle(100, 100, 0, createDeps());
    expect(t.getBaseDamage()).toBe(0);
  });

  it('initializes with base stats from config', () => {
    const t = new LaserTowerParticle(100, 100, 0, createDeps());
    expect(t.health).toBe(CONFIG.TOWER_LASER_BASE_HP);
    expect(t.damage).toBe(CONFIG.TOWER_LASER_BASE_DAMAGE);
    expect(t.range).toBe(CONFIG.TOWER_LASER_BASE_RANGE);
    expect(t.attackSpeed).toBe(CONFIG.TOWER_LASER_BASE_ATTACK_SPEED);
    expect(t.level).toBe(0);
  });

  it('fires at nearest enemy in range', () => {
    const t = new LaserTowerParticle(100, 100, 0, createDeps());
    const enemy = createMockParticle({ x: 150, y: 100, owner: 1, health: 10 });
    const ctx = createMockGameContext({ particles: [t, enemy] });

    t.onUpdate(1, ctx);

    expect(enemy.takeDamage).toHaveBeenCalledWith(t.damage);
    expect(t.currentTargetId).toBe(enemy.id);
  });

  it('does not fire at own particles', () => {
    const t = new LaserTowerParticle(100, 100, 0, createDeps());
    const friendly = createMockParticle({ x: 110, y: 100, owner: 0, health: 10 });
    const ctx = createMockGameContext({ particles: [t, friendly] });

    t.onUpdate(1, ctx);

    expect(friendly.takeDamage).not.toHaveBeenCalled();
    expect(t.currentTargetId).toBe(-1);
  });

  it('does not fire at enemies out of range', () => {
    const t = new LaserTowerParticle(100, 100, 0, createDeps());
    const far = createMockParticle({ x: 100 + t.range + 50, y: 100, owner: 1, health: 10 });
    const ctx = createMockGameContext({ particles: [t, far] });

    t.onUpdate(1, ctx);

    expect(far.takeDamage).not.toHaveBeenCalled();
  });

  it('respects attack speed cooldown', () => {
    const t = new LaserTowerParticle(100, 100, 0, createDeps());
    const enemy = createMockParticle({ x: 110, y: 100, owner: 1, health: 10 });
    const ctx = createMockGameContext({ particles: [t, enemy] });

    t.onUpdate(1, ctx);
    expect(enemy.takeDamage).toHaveBeenCalledTimes(1);

    // Immediately fire again - should be on cooldown
    t.onUpdate(0.1, ctx);
    expect(enemy.takeDamage).toHaveBeenCalledTimes(1);

    // Wait long enough for cooldown to expire
    t.onUpdate(1, ctx);
    expect(enemy.takeDamage).toHaveBeenCalledTimes(2);
  });

  it('targets nearest enemy when multiple in range', () => {
    const t = new LaserTowerParticle(100, 100, 0, createDeps());
    const farEnemy = createMockParticle({ id: 1, x: 180, y: 100, owner: 1, health: 10 });
    const nearEnemy = createMockParticle({ id: 2, x: 120, y: 100, owner: 1, health: 10 });
    const ctx = createMockGameContext({ particles: [t, farEnemy, nearEnemy] });

    t.onUpdate(1, ctx);

    expect(nearEnemy.takeDamage).toHaveBeenCalled();
    expect(farEnemy.takeDamage).not.toHaveBeenCalled();
    expect(t.currentTargetId).toBe(2);
  });

  it('upgrade increases stats', () => {
    const t = new LaserTowerParticle(100, 100, 0, createDeps());
    const origDamage = t.damage;
    const origRange = t.range;
    const origSpeed = t.attackSpeed;

    t.upgrade();

    expect(t.level).toBe(1);
    expect(t.damage).toBeGreaterThan(origDamage);
    expect(t.range).toBeGreaterThan(origRange);
    expect(t.attackSpeed).toBeGreaterThan(origSpeed);
  });
});
