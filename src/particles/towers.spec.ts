import { describe, it, expect } from 'vitest';
import { CONFIG } from '../config';
import { LaserTowerParticle, getLaserStatsAtLevel } from './LaserTowerParticle';
import { WeaknessTowerParticle, getWeaknessStatsAtLevel } from './WeaknessTowerParticle';

describe('LaserTowerParticle.meta', () => {
  it('has the expected unlock id and cost', () => {
    expect(LaserTowerParticle.meta.unlock?.id).toBe('unlock_laser');
    expect(LaserTowerParticle.meta.unlock?.cost).toBe(CONFIG.TOWER_RESEARCH_COSTS.laser);
  });

  it('has a single upgrade path', () => {
    expect(LaserTowerParticle.meta.upgradePaths).toHaveLength(1);
    expect(LaserTowerParticle.meta.upgradePaths[0].id).toBe('laser_upgrades');
  });

  it('upgrade path requires unlock_laser', () => {
    expect(LaserTowerParticle.meta.upgradePaths[0].requires).toContain('unlock_laser');
  });
});

describe('getLaserStatsAtLevel', () => {
  it('returns base stats at level 0', () => {
    const stats = getLaserStatsAtLevel(0);
    expect(stats.damage).toBe(CONFIG.TOWER_LASER_BASE_DAMAGE);
    expect(stats.attackSpeed).toBe(CONFIG.TOWER_LASER_BASE_ATTACK_SPEED);
    expect(stats.hp).toBe(CONFIG.TOWER_LASER_BASE_HP);
  });

  it('scales stats with level', () => {
    const stats = getLaserStatsAtLevel(3);
    expect(stats.damage).toBe(CONFIG.TOWER_LASER_BASE_DAMAGE + 3 * CONFIG.TOWER_LASER_DAMAGE_PER_LEVEL);
    expect(stats.attackSpeed).toBe(CONFIG.TOWER_LASER_BASE_ATTACK_SPEED + 3 * CONFIG.TOWER_LASER_ATTACK_SPEED_PER_LEVEL);
  });
});

describe('WeaknessTowerParticle.meta', () => {
  it('has the expected unlock id and cost', () => {
    expect(WeaknessTowerParticle.meta.unlock?.id).toBe('unlock_weakness');
    expect(WeaknessTowerParticle.meta.unlock?.cost).toBe(CONFIG.TOWER_RESEARCH_COSTS.weakness);
  });

  it('has a single upgrade path', () => {
    expect(WeaknessTowerParticle.meta.upgradePaths).toHaveLength(1);
    expect(WeaknessTowerParticle.meta.upgradePaths[0].id).toBe('weakness_upgrades');
  });
});

describe('getWeaknessStatsAtLevel', () => {
  it('returns base stats at level 0', () => {
    const stats = getWeaknessStatsAtLevel(0);
    expect(stats.drainDps).toBe(CONFIG.TOWER_WEAKNESS_BASE_DRAIN_DPS);
    expect(stats.attackReduction).toBe(CONFIG.TOWER_WEAKNESS_BASE_ATTACK_REDUCTION);
    expect(stats.hp).toBe(CONFIG.TOWER_WEAKNESS_BASE_HP);
  });

  it('scales stats with level', () => {
    const stats = getWeaknessStatsAtLevel(2);
    expect(stats.drainDps).toBeCloseTo(CONFIG.TOWER_WEAKNESS_BASE_DRAIN_DPS + 2 * CONFIG.TOWER_WEAKNESS_FACTOR_PER_LEVEL);
  });

  it('caps attack reduction at 0.9 across all pre-built levels', () => {
    WeaknessTowerParticle.meta.upgradePaths[0].levels.forEach(({ effect }) => {
      expect(effect.attackReduction).toBeLessThanOrEqual(0.9);
    });
  });
});
