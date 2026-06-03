import { describe, it, expect, beforeEach } from 'vitest';
import { CONFIG, TOWER_TYPE } from './config';
import { Player, createPlayer, computeMaxLevels, type PlayerConfig } from './player';
import type { UpgradeType, TowerType } from './config';

const testConfig: PlayerConfig = {
  baseHP: 100,
  startingGold: 50,
  particleBaseHealth: 3,
  particleBaseAttack: 1,
  healthPerLevel: 1,
  attackPerLevel: 1,
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
      applyUpgrade(player, upgradeType);
      expect(player[stat as keyof Player]).toBe(base + 1);
      applyUpgrade(player, upgradeType);
      expect(player[stat as keyof Player]).toBe(base + 2);
    });

    it('spawnInterval decreases with spawnRate upgrades, clamped to min', () => {
      expect(player.spawnInterval).toBe(200);
      player.gold = 9999;

      applyUpgrade(player, 'spawnRate');
      expect(player.spawnInterval).toBe(180);

      for (let i = 0; i < 20; i++) applyUpgrade(player, 'spawnRate');
      expect(player.spawnInterval).toBe(testConfig.minSpawnInterval);
    });

    it('particleSpeed increases with speed upgrades', () => {
      expect(player.particleSpeed).toBe(180);
      player.gold = 9999;
      applyUpgrade(player, 'speed');
      expect(player.particleSpeed).toBe(200);
    });

    it('maxParticles increases with maxParticles upgrades', () => {
      expect(player.maxParticles).toBe(100);
      player.gold = 9999;
      applyUpgrade(player, 'maxParticles');
      expect(player.maxParticles).toBe(150);
    });

    it.each([
      { level: 0, expected: CONFIG.OWNERSHIP_DEFENSE_BASE, desc: 'base at level 0' },
      { level: 1, expected: CONFIG.OWNERSHIP_DEFENSE_BASE + CONFIG.OWNERSHIP_DEFENSE_PER_LEVEL, desc: 'base + 1 level' },
      { level: 4, expected: CONFIG.OWNERSHIP_DEFENSE_BASE + 4 * CONFIG.OWNERSHIP_DEFENSE_PER_LEVEL, desc: '4 levels' },
      { level: 50, expected: CONFIG.OWNERSHIP_DEFENSE_MAX, desc: 'capped at max' },
    ])('particleDefense $desc', ({ level, expected }) => {
      player.gold = 99999;
      for (let i = 0; i < level; i++) applyUpgrade(player, 'defense');
      expect(player.particleDefense).toBeCloseTo(expected);
    });

    it.each([
      { level: 0, expected: 0, desc: '0 at level 0' },
      { level: 1, expected: CONFIG.GLOBAL_DEFENSE_PER_LEVEL, desc: '1 level' },
      { level: 5, expected: 5 * CONFIG.GLOBAL_DEFENSE_PER_LEVEL, desc: '5 levels' },
      { level: 50, expected: CONFIG.GLOBAL_DEFENSE_MAX, desc: 'capped at max' },
    ])('globalDefense $desc', ({ level, expected }) => {
      player.gold = 99999;
      for (let i = 0; i < level; i++) applyUpgrade(player, 'defense');
      expect(player.globalDefense).toBeCloseTo(expected);
    });

    it.each([
      { level: 0, expected: 0, desc: '0% at level 0' },
      { level: 1, expected: 0.0025, desc: '0.25% at level 1' },
      { level: 3, expected: 0.0075, desc: '0.75% at level 3' },
      { level: 20, expected: 0.05, desc: 'capped at 5%' },
      { level: 21, expected: 0.05, desc: 'stays capped at 5%' },
    ])('goldInterestRate $desc', ({ level, expected }) => {
      player.gold = 99999;
      for (let i = 0; i < level; i++) applyUpgrade(player, 'interestRate');
      expect(player.goldInterestRate).toBeCloseTo(expected);
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

    it('canAfford returns false when upgrade is pending', () => {
      player.gold = 9999;
      player.startUpgrade('health', 0, 5000);
      expect(player.canAfford('health')).toBe(false);
    });

    it('startUpgrade deducts gold immediately and level is not yet incremented', () => {
      player.gold = 9999;
      const cost = player.getUpgradeCost('health');
      const result = player.startUpgrade('health', 0, 3000);

      expect(result).toBe(true);
      expect(player.gold).toBe(9999 - cost);
      expect(player.getUpgradeLevel('health')).toBe(0); // not applied yet
    });

    it('tickUpgrades increments level after duration elapses', () => {
      player.gold = 9999;
      player.startUpgrade('health', 0, 3000);
      player.tickUpgrades(3001);
      expect(player.getUpgradeLevel('health')).toBe(1);
    });

    it('tickUpgrades does not increment level before duration', () => {
      player.gold = 9999;
      player.startUpgrade('health', 0, 3000);
      player.tickUpgrades(1000);
      expect(player.getUpgradeLevel('health')).toBe(0);
    });

    it('startUpgrade returns false when cannot afford', () => {
      player.gold = 0;
      expect(player.startUpgrade('health', 0, 3000)).toBe(false);
      expect(player.getUpgradeLevel('health')).toBe(0);
    });

    it('startUpgrade returns false while same type is already pending', () => {
      player.gold = 9999;
      player.startUpgrade('health', 0, 3000);
      expect(player.startUpgrade('health', 0, 3000)).toBe(false);
    });

    it.each([
      { type: 'interestRate' as UpgradeType, levelsBelowMax: 19, levelsAtMax: 20, statCheck: (p: Player) => expect(p.goldInterestRate).toBeCloseTo(CONFIG.MAX_INTEREST_RATE) },
      { type: 'defense' as UpgradeType, levelsBelowMax: Math.round((CONFIG.OWNERSHIP_DEFENSE_MAX - CONFIG.OWNERSHIP_DEFENSE_BASE) / CONFIG.OWNERSHIP_DEFENSE_PER_LEVEL) - 1, levelsAtMax: Math.round((CONFIG.OWNERSHIP_DEFENSE_MAX - CONFIG.OWNERSHIP_DEFENSE_BASE) / CONFIG.OWNERSHIP_DEFENSE_PER_LEVEL), statCheck: (p: Player) => expect(p.particleDefense).toBeCloseTo(CONFIG.OWNERSHIP_DEFENSE_MAX) },
      { type: 'spawnRate' as UpgradeType, levelsBelowMax: 7, levelsAtMax: 8, statCheck: (p: Player) => expect(p.spawnInterval).toBe(testConfig.minSpawnInterval) },
    ])('isUpgradeAtMax returns false when $type below max, true when at max', ({ type, levelsBelowMax, statCheck }) => {
      player.gold = 99999;
      expect(player.isUpgradeAtMax(type)).toBe(false);
      for (let i = 0; i < levelsBelowMax; i++) applyUpgrade(player, type);
      expect(player.isUpgradeAtMax(type)).toBe(false);
      applyUpgrade(player, type);
      expect(player.isUpgradeAtMax(type)).toBe(true);
      statCheck(player);
    });

    it.each(['health', 'attack', 'radius', 'speed', 'maxParticles'] as UpgradeType[])('isUpgradeAtMax returns false for uncapped %s', (type) => {
      player.gold = 99999;
      expect(player.isUpgradeAtMax(type)).toBe(false);
    });

    it.each([
      { type: 'interestRate' as UpgradeType, levelsToMax: 20 },
      { type: 'defense' as UpgradeType, levelsToMax: Math.round((CONFIG.OWNERSHIP_DEFENSE_MAX - CONFIG.OWNERSHIP_DEFENSE_BASE) / CONFIG.OWNERSHIP_DEFENSE_PER_LEVEL) },
      { type: 'spawnRate' as UpgradeType, levelsToMax: 8 },
    ])('startUpgrade returns false when $type is at max', ({ type, levelsToMax }) => {
      player.gold = 99999;
      for (let i = 0; i < levelsToMax; i++) applyUpgrade(player, type);
      const levelBefore = player.getUpgradeLevel(type);
      const goldBefore = player.gold;
      const result = player.startUpgrade(type, 0, 3000);

      expect(result).toBe(false);
      expect(player.getUpgradeLevel(type)).toBe(levelBefore);
      expect(player.gold).toBe(goldBefore);
    });

    it('upgrade cost increases with level', () => {
      player.gold = 9999;
      const cost0 = player.getUpgradeCost('health');
      applyUpgrade(player, 'health');
      const cost1 = player.getUpgradeCost('health');

      expect(cost1).toBeGreaterThan(cost0);
    });

    it('getUpgradeLevel starts at 0 for all types', () => {
      const types: UpgradeType[] = ['health', 'attack', 'radius', 'spawnRate', 'speed', 'maxParticles', 'defense', 'interestRate'];
      for (const type of types) {
        expect(player.getUpgradeLevel(type)).toBe(0);
      }
    });
  });

  describe('nuke system', () => {
    it.each([
      { researched: false, gameTimeMs: 2000, expected: false, scenario: 'not researched' },
      { researched: true, gameTimeMs: 500, expected: false, scenario: 'researched before first available time' },
      { researched: true, gameTimeMs: 1000, expected: true, scenario: 'researched at first available time' },
      { researched: true, gameTimeMs: 2000, expected: true, scenario: 'researched after first available time' },
    ])('canUseNuke returns $expected when $scenario', ({ researched, gameTimeMs, expected }) => {
      if (researched) {
        player.gold = 9999;
        player.researchNuke();
      }
      expect(player.canUseNuke(gameTimeMs)).toBe(expected);
    });

    it.each([
      { gameTimeMs: 1500, expected: false },
      { gameTimeMs: 5999, expected: false },
      { gameTimeMs: 6000, expected: true },
    ])('canUseNuke returns $expected at $gameTimeMs during/after cooldown', ({ gameTimeMs, expected }) => {
      player.gold = 9999;
      player.researchNuke();
      player.useNuke(1000);
      expect(player.canUseNuke(gameTimeMs)).toBe(expected);
    });

    it('getNukeCooldownRemainingMs returns correct values', () => {
      player.gold = 9999;
      player.researchNuke();

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

    it('getNukeCooldownRemainingMs returns 0 while nuke is locked by research', () => {
      expect(player.getNukeCooldownRemainingMs(0)).toBe(0);
    });

    it('researchNuke deducts gold and unlocks nuke once', () => {
      player.gold = 9999;
      const cost = player.getNukeResearchCost();

      expect(player.researchNuke()).toBe(true);
      expect(player.gold).toBe(9999 - cost);
      expect(player.hasResearchedNuke()).toBe(true);
      expect(player.canResearchNuke()).toBe(false);
      expect(player.researchNuke()).toBe(false);
    });

    it('researchNuke returns false when cannot afford', () => {
      player.gold = 0;
      expect(player.canResearchNuke()).toBe(false);
      expect(player.researchNuke()).toBe(false);
      expect(player.hasResearchedNuke()).toBe(false);
    });
  });

  describe('tower research', () => {
    it('hasResearched returns false initially', () => {
      expect(player.hasResearched(TOWER_TYPE.LASER)).toBe(false);
      expect(player.hasResearched(TOWER_TYPE.WEAKNESS)).toBe(false);
    });

    it.each([TOWER_TYPE.LASER, TOWER_TYPE.WEAKNESS] as TowerType[])('canResearchTower %s returns true when affordable', (type) => {
      player.gold = 9999;
      expect(player.canResearchTower(type)).toBe(true);
    });

    it('canResearchTower returns false when already researched', () => {
      player.gold = 9999;
      player.researchTower('laser');
      expect(player.canResearchTower('laser')).toBe(false);
    });

    it('canResearchTower returns false when cannot afford', () => {
      player.gold = 0;
      expect(player.canResearchTower('laser')).toBe(false);
    });

    it('researchTower deducts gold and marks as researched', () => {
      player.gold = 9999;
      const cost = player.getResearchCost('laser');
      const result = player.researchTower('laser');

      expect(result).toBe(true);
      expect(player.gold).toBe(9999 - cost);
      expect(player.hasResearched('laser')).toBe(true);
    });

    it('researchTower returns false when cannot afford', () => {
      player.gold = 0;
      expect(player.researchTower('laser')).toBe(false);
      expect(player.hasResearched('laser')).toBe(false);
    });
  });

  describe('research timers (startTowerResearch / tickResearch)', () => {
    it('startTowerResearch deducts gold and starts timer without completing', () => {
      player.gold = 9999;
      const cost = player.getResearchCost('laser');
      const goldBefore = player.gold;
      expect(player.startTowerResearch('laser', 0, 20_000)).toBe(true);
      expect(player.gold).toBe(goldBefore - cost);
      expect(player.hasResearched('laser')).toBe(false); // not yet done
      expect(player.isResearching('unlock_laser')).toBe(true);
    });

    it('startTowerResearch returns false when cannot afford', () => {
      player.gold = 0;
      expect(player.startTowerResearch('laser', 0, 20_000)).toBe(false);
      expect(player.isResearching('unlock_laser')).toBe(false);
    });

    it('startTowerResearch returns false when already researched', () => {
      player.gold = 9999;
      player.researchTower('laser'); // instant via legacy path
      expect(player.startTowerResearch('laser', 0, 20_000)).toBe(false);
    });

    it('startTowerResearch returns false while already in progress', () => {
      player.gold = 9999;
      expect(player.startTowerResearch('laser', 0, 20_000)).toBe(true);
      expect(player.startTowerResearch('laser', 0, 20_000)).toBe(false);
    });

    it('tickResearch completes research after duration elapses', () => {
      player.gold = 9999;
      player.startTowerResearch('laser', 0, 20_000);
      expect(player.hasResearched('laser')).toBe(false);
      const completed = player.tickResearch(20_001);
      expect(completed).toContain('unlock_laser');
      expect(player.hasResearched('laser')).toBe(true);
      expect(player.isResearching('unlock_laser')).toBe(false);
    });

    it('tickResearch does not complete before duration', () => {
      player.gold = 9999;
      player.startTowerResearch('laser', 0, 20_000);
      const completed = player.tickResearch(10_000);
      expect(completed).toHaveLength(0);
      expect(player.hasResearched('laser')).toBe(false);
    });

    it('getResearchProgress returns -1 before start, 0–1 during, 1 after', () => {
      player.gold = 9999;
      expect(player.getResearchProgress('unlock_laser', 0)).toBe(-1);
      player.startTowerResearch('laser', 0, 20_000);
      expect(player.getResearchProgress('unlock_laser', 10_000)).toBeCloseTo(0.5);
      player.tickResearch(20_001);
      expect(player.getResearchProgress('unlock_laser', 20_001)).toBe(1);
    });

    it('getResearchRemainingMs returns ms until completion', () => {
      player.gold = 9999;
      player.startTowerResearch('laser', 0, 20_000);
      expect(player.getResearchRemainingMs('unlock_laser', 5_000)).toBe(15_000);
      expect(player.getResearchRemainingMs('unlock_laser', 25_000)).toBe(0);
    });

    it('canResearchTower returns false while research timer is running', () => {
      player.gold = 9999;
      player.startTowerResearch('laser', 0, 20_000);
      expect(player.canResearchTower('laser')).toBe(false);
    });
  });

  describe('tower construction cost', () => {
    it('canAffordConstruction returns true when affordable', () => {
      player.gold = 9999;
      expect(player.canAffordConstruction('laser')).toBe(true);
    });

    it('canAffordConstruction returns false when cannot afford', () => {
      player.gold = 0;
      expect(player.canAffordConstruction('laser')).toBe(false);
    });

    it('payForConstruction deducts gold when researched and affordable', () => {
      player.gold = 9999;
      player.researchTower('laser');
      const cost = player.getConstructionCost('laser');
      const goldBefore = player.gold;

      const result = player.payForConstruction('laser');

      expect(result).toBe(true);
      expect(player.gold).toBe(goldBefore - cost);
    });

    it('payForConstruction returns false when not researched', () => {
      player.gold = 9999;
      expect(player.payForConstruction('laser')).toBe(false);
    });

    it('payForConstruction returns false when cannot afford', () => {
      player.gold = 0;
      player.researchTower('laser');
      expect(player.payForConstruction('laser')).toBe(false);
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

describe(computeMaxLevels.name, () => {
  it.each([
    { type: 'health' as UpgradeType, expected: Infinity },
    { type: 'attack' as UpgradeType, expected: Infinity },
    { type: 'radius' as UpgradeType, expected: Infinity },
    { type: 'speed' as UpgradeType, expected: Infinity },
    { type: 'maxParticles' as UpgradeType, expected: Infinity },
    { type: 'defense' as UpgradeType, expected: Math.round((CONFIG.OWNERSHIP_DEFENSE_MAX - CONFIG.OWNERSHIP_DEFENSE_BASE) / CONFIG.OWNERSHIP_DEFENSE_PER_LEVEL) },
    { type: 'interestRate' as UpgradeType, expected: 20 },
  ])('returns $expected for $type with default config', ({ type, expected }) => {
    const config: PlayerConfig = {
      baseHP: CONFIG.BASE_HP,
      startingGold: CONFIG.STARTING_GOLD,
      particleBaseHealth: CONFIG.PARTICLE_BASE_HEALTH,
      particleBaseAttack: CONFIG.PARTICLE_BASE_ATTACK,
      healthPerLevel: CONFIG.HEALTH_PER_LEVEL,
      attackPerLevel: CONFIG.ATTACK_PER_LEVEL,
      particleBaseRadius: CONFIG.PARTICLE_BASE_RADIUS,
      particleBaseSpeed: CONFIG.PARTICLE_SPEED,
      spawnIntervalMs: CONFIG.SPAWN_INTERVAL_MS,
      spawnRateReductionPerLevel: CONFIG.SPAWN_RATE_REDUCTION_PER_LEVEL,
      minSpawnInterval: CONFIG.MIN_SPAWN_INTERVAL,
      speedPerLevel: CONFIG.SPEED_PER_LEVEL,
      maxParticlesPerPlayer: CONFIG.MAX_PARTICLES_PER_PLAYER,
      maxParticlesPerLevel: CONFIG.MAX_PARTICLES_PER_LEVEL,
      nuclearFirstAvailableMs: CONFIG.NUCLEAR_FIRST_AVAILABLE_MS,
      nuclearCooldownMs: CONFIG.NUCLEAR_COOLDOWN_MS,
    };
    const maxLevels = computeMaxLevels(config);
    expect(maxLevels[type]).toBe(expected);
  });

  it('returns spawnRate max 8 for testConfig (spawnIntervalMs=200)', () => {
    const maxLevels = computeMaxLevels(testConfig);
    expect(maxLevels.spawnRate).toBe(8);
  });
});

/** Instantly apply one upgrade level — deducts gold and completes the timer in 1 ms. */
function applyUpgrade(player: Player, type: UpgradeType): void {
  player.startUpgrade(type, 0, 1);
  player.tickUpgrades(2);
}

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
