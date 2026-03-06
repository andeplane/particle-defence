import { describe, it, expect } from 'vitest';
import { CONFIG, getUpgradeCost, type UpgradeType } from './config';

describe(getUpgradeCost.name, () => {
  const upgradeTypes: UpgradeType[] = ['health', 'attack', 'radius', 'spawnRate', 'speed', 'maxParticles', 'defense', 'interestRate'];

  it.each(upgradeTypes)('returns base cost at level 0 for %s', (type) => {
    const expected = CONFIG.UPGRADE_COSTS[type];
    expect(getUpgradeCost(type, 0)).toBe(expected);
  });

  it.each(upgradeTypes)('returns floor(base * 1.3^level) at level 5 for %s', (type) => {
    const base = CONFIG.UPGRADE_COSTS[type];
    const expected = Math.floor(base * Math.pow(CONFIG.UPGRADE_COST_MULTIPLIER, 5));
    expect(getUpgradeCost(type, 5)).toBe(expected);
  });

  it.each([
    { type: 'health' as UpgradeType, level: 0, expected: 5 },
    { type: 'health' as UpgradeType, level: 1, expected: Math.floor(5 * 1.3) },
    { type: 'health' as UpgradeType, level: 10, expected: Math.floor(5 * Math.pow(1.3, 10)) },
    { type: 'attack' as UpgradeType, level: 3, expected: Math.floor(5 * Math.pow(1.3, 3)) },
    { type: 'radius' as UpgradeType, level: 2, expected: Math.floor(3 * Math.pow(1.3, 2)) },
    { type: 'spawnRate' as UpgradeType, level: 4, expected: Math.floor(10 * Math.pow(1.3, 4)) },
    { type: 'maxParticles' as UpgradeType, level: 7, expected: Math.floor(10 * Math.pow(1.3, 7)) },
  ])('returns $expected for $type at level $level', ({ type, level, expected }) => {
    expect(getUpgradeCost(type, level)).toBe(expected);
  });

  it('cost increases with each level', () => {
    const costs = Array.from({ length: 10 }, (_, i) => getUpgradeCost('health', i));
    for (let i = 1; i < costs.length; i++) {
      expect(costs[i]).toBeGreaterThanOrEqual(costs[i - 1]);
    }
  });
});

describe('CONFIG', () => {
  it('has all expected upgrade cost keys', () => {
    expect(Object.keys(CONFIG.UPGRADE_COSTS)).toEqual(
      expect.arrayContaining(['health', 'attack', 'radius', 'spawnRate', 'speed', 'maxParticles', 'defense', 'interestRate']),
    );
  });

  it.each([
    { type: 'interestRate' as UpgradeType, level: 0, expected: 10 },
    { type: 'interestRate' as UpgradeType, level: 1, expected: Math.floor(10 * 1.3) },
    { type: 'interestRate' as UpgradeType, level: 5, expected: Math.floor(10 * Math.pow(1.3, 5)) },
  ])('getUpgradeCost($type, $level) = $expected', ({ type, level, expected }) => {
    expect(getUpgradeCost(type, level)).toBe(expected);
  });

  it('has interest interval and rate constants', () => {
    expect(CONFIG.INTEREST_INTERVAL_MS).toBe(30_000);
    expect(CONFIG.INTEREST_RATE_PER_LEVEL).toBe(0.0025);
    expect(CONFIG.MAX_INTEREST_RATE).toBe(0.05);
  });

  it('has positive game dimensions', () => {
    expect(CONFIG.GAME_WIDTH).toBeGreaterThan(0);
    expect(CONFIG.GAME_HEIGHT).toBeGreaterThan(0);
  });
});
