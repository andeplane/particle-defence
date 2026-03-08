import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CONFIG } from '../config';
import { TowerCarrierParticle } from './TowerCarrierParticle';
import { resetParticleIds, type ParticleDependencies, type ParticleConfig } from './AbstractParticle';
import { createMockGameContext } from '../__mocks__/createMockGameContext';
import { createMockParticle } from '../__mocks__/createMockParticle';

const testConfig: ParticleConfig = {
  gameWidth: 512, gameHeight: 256, baseWidthCells: 2, mazeCols: 16,
  driftStrength: 0, enemyBias: 0, stuckThresholdBlocks: 5,
  stuckThresholdSeconds: 10, baseDamageOnReach: 1,
};

function createDeps(): ParticleDependencies {
  let nextId = 0;
  return { nextId: () => nextId++, config: testConfig };
}

describe(TowerCarrierParticle.name, () => {
  beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0.5); });
  afterEach(() => { vi.restoreAllMocks(); resetParticleIds(); });

  it('has typeName "towerCarrier"', () => {
    const c = new TowerCarrierParticle(100, 100, 0, 5, 180, 'laser', createDeps());
    expect(c.typeName).toBe('towerCarrier');
  });

  it('stores towerType', () => {
    const c = new TowerCarrierParticle(100, 100, 0, 5, 180, 'slow', createDeps());
    expect(c.towerType).toBe('slow');
  });

  it('has zero attack', () => {
    const c = new TowerCarrierParticle(100, 100, 0, 5, 180, 'laser', createDeps());
    expect(c.attack).toBe(0);
  });

  it('canMove is true (it moves through maze)', () => {
    const c = new TowerCarrierParticle(100, 100, 0, 5, 180, 'laser', createDeps());
    expect(c.canMove).toBe(true);
  });

  it('takes damage on collision but does not retaliate', () => {
    const c = new TowerCarrierParticle(100, 100, 0, 5, 180, 'laser', createDeps());
    const enemy = createMockParticle({ attack: 3, owner: 1 });
    const ctx = createMockGameContext();

    c.onCollide(enemy, ctx);
    // hpScaling = 1 + 0.08 * (5/5) = 1.08; damage = 3 * 1.08 = 3.24
    expect(c.health).toBeCloseTo(5 - 3 * (1 + CONFIG.PERCENT_HP_DAMAGE_SCALING * (5 / CONFIG.PARTICLE_BASE_HEALTH)));
    expect(enemy.health).toBe(3);
  });
});
