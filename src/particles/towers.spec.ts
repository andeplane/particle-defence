import { describe, it, expect } from 'vitest';
import { CONFIG } from '../config';
import { LaserTowerParticle, getLaserStatsAtLevel } from './LaserTowerParticle';
import { SlowTowerParticle, getSlowStatsAtLevel } from './SlowTowerParticle';

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
    expect(stats.range).toBe(CONFIG.TOWER_LASER_BASE_RANGE);
    expect(stats.attackSpeed).toBe(CONFIG.TOWER_LASER_BASE_ATTACK_SPEED);
    expect(stats.hp).toBe(CONFIG.TOWER_LASER_BASE_HP);
  });

  it('scales stats with level', () => {
    const stats = getLaserStatsAtLevel(3);
    expect(stats.damage).toBe(CONFIG.TOWER_LASER_BASE_DAMAGE + 3 * CONFIG.TOWER_LASER_DAMAGE_PER_LEVEL);
    expect(stats.range).toBe(CONFIG.TOWER_LASER_BASE_RANGE + 3 * CONFIG.TOWER_LASER_RANGE_PER_LEVEL);
    expect(stats.attackSpeed).toBe(CONFIG.TOWER_LASER_BASE_ATTACK_SPEED + 3 * CONFIG.TOWER_LASER_ATTACK_SPEED_PER_LEVEL);
  });
});

describe('SlowTowerParticle.meta', () => {
  it('has the expected unlock id and cost', () => {
    expect(SlowTowerParticle.meta.unlock?.id).toBe('unlock_slow');
    expect(SlowTowerParticle.meta.unlock?.cost).toBe(CONFIG.TOWER_RESEARCH_COSTS.slow);
  });

  it('has a single upgrade path', () => {
    expect(SlowTowerParticle.meta.upgradePaths).toHaveLength(1);
    expect(SlowTowerParticle.meta.upgradePaths[0].id).toBe('slow_upgrades');
  });
});

describe('getSlowStatsAtLevel', () => {
  it('returns base stats at level 0', () => {
    const stats = getSlowStatsAtLevel(0);
    expect(stats.slowFactor).toBe(CONFIG.TOWER_SLOW_BASE_FACTOR);
    expect(stats.range).toBe(CONFIG.TOWER_SLOW_BASE_RANGE);
    expect(stats.hp).toBe(CONFIG.TOWER_SLOW_BASE_HP);
  });

  it('scales stats with level', () => {
    const stats = getSlowStatsAtLevel(2);
    expect(stats.slowFactor).toBe(CONFIG.TOWER_SLOW_BASE_FACTOR + 2 * CONFIG.TOWER_SLOW_FACTOR_PER_LEVEL);
    expect(stats.range).toBe(CONFIG.TOWER_SLOW_BASE_RANGE + 2 * CONFIG.TOWER_SLOW_RANGE_PER_LEVEL);
  });

  it('caps slow factor at 0.9 across all pre-built levels', () => {
    SlowTowerParticle.meta.upgradePaths[0].levels.forEach(({ effect }) => {
      expect(effect.slowFactor).toBeLessThanOrEqual(0.9);
    });
  });
});
