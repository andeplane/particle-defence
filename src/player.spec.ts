import { describe, it, expect, beforeEach } from 'vitest';
import { Player, createPlayer, type PlayerConfig } from './player';
import type { UpgradeType } from './config';

const testConfig: PlayerConfig = {
  baseHP: 100,
  startingGold: 50,
  particleBaseHealth: 3,
  particleBaseAttack: 1,
  particleBaseRadius: 3,
  particleBaseSpeed: 180,
  spawnIntervalMs: 200,
  spawnRateReductionPerLevel: 20,
  minSpawnInterval: 50,
  speedPerLevel: 20,
  maxParticlesPerPlayer: 100,
  maxParticlesPerLevel: 50,
  nuclearFirstAvailableMs: 1000,
  nuclearCooldownMs: 5000,
};

describe(Player.name, () => {
  let player: Player;

  beforeEach(() => {
    player = new Player(0, testConfig);
  });

  describe('construction', () => {
    it('initializes with config values', () => {
      expect(player.id).toBe(0);
      expect(player.baseHP).toBe(100);
      expect(player.gold).toBe(50);
      expect(player.kills).toBe(0);
    });
  });

  describe('derived stats', () => {
    it.each([
      { stat: 'particleHealth', base: 3, upgradeType: 'health' as UpgradeType },
      { stat: 'particleAttack', base: 1, upgradeType: 'attack' as UpgradeType },
      { stat: 'particleRadius', base: 3, upgradeType: 'radius' as UpgradeType },
    ])('$stat increases by 1 per $upgradeType upgrade level', ({ stat, base, upgradeType }) => {
      expect(player[stat as keyof Player]).toBe(base);
      player.gold = 9999;
      player.buyUpgrade(upgradeType);
      expect(player[stat as keyof Player]).toBe(base + 1);
      player.buyUpgrade(upgradeType);
      expect(player[stat as keyof Player]).toBe(base + 2);
    });

    it('spawnInterval decreases with spawnRate upgrades, clamped to min', () => {
      expect(player.spawnInterval).toBe(200);
      player.gold = 9999;

      player.buyUpgrade('spawnRate');
      expect(player.spawnInterval).toBe(180);

      // Buy enough to hit the minimum
      for (let i = 0; i < 20; i++) player.buyUpgrade('spawnRate');
      expect(player.spawnInterval).toBe(testConfig.minSpawnInterval);
    });

    it('particleSpeed increases with speed upgrades', () => {
      expect(player.particleSpeed).toBe(180);
      player.gold = 9999;
      player.buyUpgrade('speed');
      expect(player.particleSpeed).toBe(200);
    });

    it('maxParticles increases with maxParticles upgrades', () => {
      expect(player.maxParticles).toBe(100);
      player.gold = 9999;
      player.buyUpgrade('maxParticles');
      expect(player.maxParticles).toBe(150);
    });

    it.each([
      { level: 0, expected: 0.05, desc: 'base 5% at level 0' },
      { level: 1, expected: 0.075, desc: '7.5% at level 1' },
      { level: 4, expected: 0.15, desc: '15% at level 4' },
      { level: 8, expected: 0.25, desc: 'capped at 25%' },
      { level: 20, expected: 0.25, desc: 'stays capped at 25%' },
    ])('particleDefense $desc', ({ level, expected }) => {
      player.gold = 99999;
      for (let i = 0; i < level; i++) player.buyUpgrade('defense');
      expect(player.particleDefense).toBeCloseTo(expected);
    });
  });

  describe('upgrade system', () => {
    it('canAfford returns true when gold is sufficient', () => {
      player.gold = 9999;
      expect(player.canAfford('health')).toBe(true);
    });

    it('canAfford returns false when gold is insufficient', () => {
      player.gold = 0;
      expect(player.canAfford('health')).toBe(false);
    });

    it('buyUpgrade deducts gold and increments level', () => {
      player.gold = 9999;
      const cost = player.getUpgradeCost('health');
      const result = player.buyUpgrade('health');

      expect(result).toBe(true);
      expect(player.gold).toBe(9999 - cost);
      expect(player.getUpgradeLevel('health')).toBe(1);
    });

    it('buyUpgrade returns false when cannot afford', () => {
      player.gold = 0;
      const result = player.buyUpgrade('health');

      expect(result).toBe(false);
      expect(player.getUpgradeLevel('health')).toBe(0);
    });

    it('upgrade cost increases with level', () => {
      player.gold = 9999;
      const cost0 = player.getUpgradeCost('health');
      player.buyUpgrade('health');
      const cost1 = player.getUpgradeCost('health');

      expect(cost1).toBeGreaterThan(cost0);
    });

    it('getUpgradeLevel starts at 0 for all types', () => {
      const types: UpgradeType[] = ['health', 'attack', 'radius', 'spawnRate', 'speed', 'maxParticles', 'defense'];
      for (const type of types) {
        expect(player.getUpgradeLevel(type)).toBe(0);
      }
    });
  });

  describe('nuke system', () => {
    it('cannot use nuke before first available time', () => {
      expect(player.canUseNuke(500)).toBe(false);
    });

    it('can use nuke after first available time when never used', () => {
      expect(player.canUseNuke(1000)).toBe(true);
      expect(player.canUseNuke(2000)).toBe(true);
    });

    it('cannot use nuke during cooldown', () => {
      player.useNuke(1000);
      expect(player.canUseNuke(1500)).toBe(false);
      expect(player.canUseNuke(5999)).toBe(false);
    });

    it('can use nuke after cooldown expires', () => {
      player.useNuke(1000);
      expect(player.canUseNuke(6000)).toBe(true);
    });

    it('getNukeCooldownRemainingMs returns correct values', () => {
      // Before first available
      expect(player.getNukeCooldownRemainingMs(0)).toBe(1000);

      // After first available, never used
      expect(player.getNukeCooldownRemainingMs(1000)).toBe(0);

      // During cooldown
      player.useNuke(2000);
      expect(player.getNukeCooldownRemainingMs(3000)).toBe(4000);

      // After cooldown
      expect(player.getNukeCooldownRemainingMs(7000)).toBe(0);
    });
  });

  describe('damage', () => {
    it('takeDamage reduces HP', () => {
      player.takeDamage(30);
      expect(player.baseHP).toBe(70);
    });

    it('takeDamage clamps at 0', () => {
      player.takeDamage(999);
      expect(player.baseHP).toBe(0);
    });

    it('isAlive is true when HP > 0', () => {
      expect(player.isAlive).toBe(true);
    });

    it('isAlive is false when HP is 0', () => {
      player.takeDamage(100);
      expect(player.isAlive).toBe(false);
    });
  });
});

describe(createPlayer.name, () => {
  it('creates a player with default config', () => {
    const player = createPlayer(1);
    expect(player.id).toBe(1);
    expect(player.isAlive).toBe(true);
  });

  it('applies config overrides', () => {
    const player = createPlayer(0, { baseHP: 42, startingGold: 999 });
    expect(player.baseHP).toBe(42);
    expect(player.gold).toBe(999);
  });
});
