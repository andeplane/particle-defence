import { describe, it, expect } from 'vitest';
import { getLaserStats, getSlowStats } from './towers';
import { CONFIG } from '../config';

describe('getLaserStats', () => {
  it('returns base stats at level 0', () => {
    const stats = getLaserStats(0);
    expect(stats.damage).toBe(CONFIG.TOWER_LASER_BASE_DAMAGE);
    expect(stats.range).toBe(CONFIG.TOWER_LASER_BASE_RANGE);
    expect(stats.attackSpeed).toBe(CONFIG.TOWER_LASER_BASE_ATTACK_SPEED);
  });

  it('scales stats with level', () => {
    const stats = getLaserStats(3);
    expect(stats.damage).toBe(CONFIG.TOWER_LASER_BASE_DAMAGE + 3 * CONFIG.TOWER_LASER_DAMAGE_PER_LEVEL);
    expect(stats.range).toBe(CONFIG.TOWER_LASER_BASE_RANGE + 3 * CONFIG.TOWER_LASER_RANGE_PER_LEVEL);
    expect(stats.attackSpeed).toBe(CONFIG.TOWER_LASER_BASE_ATTACK_SPEED + 3 * CONFIG.TOWER_LASER_ATTACK_SPEED_PER_LEVEL);
  });
});

describe('getSlowStats', () => {
  it('returns base stats at level 0', () => {
    const stats = getSlowStats(0);
    expect(stats.slowFactor).toBe(CONFIG.TOWER_SLOW_BASE_FACTOR);
    expect(stats.range).toBe(CONFIG.TOWER_SLOW_BASE_RANGE);
  });

  it('scales stats with level', () => {
    const stats = getSlowStats(2);
    expect(stats.slowFactor).toBe(CONFIG.TOWER_SLOW_BASE_FACTOR + 2 * CONFIG.TOWER_SLOW_FACTOR_PER_LEVEL);
    expect(stats.range).toBe(CONFIG.TOWER_SLOW_BASE_RANGE + 2 * CONFIG.TOWER_SLOW_RANGE_PER_LEVEL);
  });

  it('caps slow factor at 0.9', () => {
    const stats = getSlowStats(100);
    expect(stats.slowFactor).toBeLessThanOrEqual(0.9);
  });
});
