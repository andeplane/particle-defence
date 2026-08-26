import { describe, it, expect, afterEach } from 'vitest';
import { ParticleSpawnerTower } from './ParticleSpawnerTower';
import { resetParticleIds, type ParticleDependencies, type ParticleConfig } from './AbstractParticle';

const testConfig: ParticleConfig = {
  gameWidth: 512, gameHeight: 256, baseWidthCells: 2, mazeCols: 16,
  driftStrength: 0, enemyBias: 0, stuckThresholdBlocks: 5,
  stuckThresholdSeconds: 10, baseDamageOnReach: 1,
};

function createDeps(): ParticleDependencies {
  let nextId = 0;
  return { nextId: () => nextId++, config: testConfig };
}

describe(ParticleSpawnerTower.name, () => {
  afterEach(() => { resetParticleIds(); });

  it('has typeName "spawnerTower"', () => {
    const t = new ParticleSpawnerTower(100, 100, 0, createDeps());
    expect(t.typeName).toBe('spawnerTower');
  });

  it('canMove is false', () => {
    const t = new ParticleSpawnerTower(100, 100, 0, createDeps());
    expect(t.canMove).toBe(false);
  });

  it('attack is 0', () => {
    const t = new ParticleSpawnerTower(100, 100, 0, createDeps());
    expect(t.attack).toBe(0);
  });

  it('remains alive after takeDamage', () => {
    const t = new ParticleSpawnerTower(100, 100, 0, createDeps());
    t.takeDamage(9999);
    expect(t.alive).toBe(true);
  });

  it('health does not decrease after takeDamage', () => {
    const t = new ParticleSpawnerTower(100, 100, 0, createDeps());
    const before = t.health;
    t.takeDamage(500);
    expect(t.health).toBe(before);
  });
});
