import { describe, it, expect } from 'vitest';
import {
  upgradeCostAtLevel,
  cumulativeUpgradeCost,
  maxLevelsForBudget,
  maxUpgradeLevel,
  statAtLevel,
  upgradeEfficiencyTable,
  hitsToKill,
  duelOutcome,
  duelMatrix,
  lanchesterPower,
  lanchesterROIPerGold,
  spawnRateTable,
  laserTowerROI,
  interestBreakEvenTable,
  detectRedFlags,
  type BalanceConfig,
  type CombatStats,
} from './BalanceCalculator';

function createTestConfig(overrides?: Partial<BalanceConfig>): BalanceConfig {
  return {
    particleBaseHealth: 3,
    particleBaseAttack: 1,
    healthPerLevel: 1,
    attackPerLevel: 1,
    particleBaseRadius: 3,
    particleBaseSpeed: 180,
    spawnIntervalMs: 60,
    minSpawnInterval: 50,
    spawnRateReductionPerLevel: 20,
    speedPerLevel: 20,
    maxParticlesPerPlayer: 1000,
    maxParticlesPerLevel: 50,
    baseHP: 1000,
    baseDamageOnReach: 1,
    killReward: 1,
    upgradeCosts: {
      health: 5, attack: 5, radius: 3, spawnRate: 10,
      speed: 7, maxParticles: 10, defense: 200, interestRate: 10,
    },
    upgradeCostMultiplier: 1.3,
    ownershipDefenseBase: 0.05,
    ownershipDefensePerLevel: 0.025,
    ownershipDefenseMax: 0.25,
    interestRatePerLevel: 0.0025,
    maxInterestRate: 0.05,
    interestIntervalMs: 30_000,
    towerResearchCosts: { laser: 200, slow: 200 },
    towerConstructionCosts: { laser: 500, slow: 500 },
    laserBaseDamage: 2,
    laserBaseAttackSpeed: 2,
    laserBaseRange: 120,
    laserDamagePerLevel: 1,
    laserAttackSpeedPerLevel: 0.3,
    laserRangePerLevel: 10,
    laserUpgradeCost: 200,
    slowBaseFactor: 0.3,
    slowBaseRange: 100,
    slowFactorPerLevel: 0.05,
    slowRangePerLevel: 15,
    slowUpgradeCost: 200,
    towerUpgradeCostMultiplier: 1.4,
    ...overrides,
  };
}

describe('Gold & Cost Calculations', () => {
  describe(upgradeCostAtLevel.name, () => {
    it.each([
      { baseCost: 5, level: 0, multiplier: 1.3, expected: 5 },
      { baseCost: 5, level: 1, multiplier: 1.3, expected: 6 },
      { baseCost: 5, level: 2, multiplier: 1.3, expected: 8 },
      { baseCost: 10, level: 0, multiplier: 1.3, expected: 10 },
      { baseCost: 10, level: 5, multiplier: 1.3, expected: Math.floor(10 * 1.3 ** 5) },
      { baseCost: 200, level: 0, multiplier: 1.3, expected: 200 },
    ])('baseCost=$baseCost level=$level -> $expected', ({ baseCost, level, multiplier, expected }) => {
      expect(upgradeCostAtLevel(baseCost, level, multiplier)).toBe(expected);
    });
  });

  describe(cumulativeUpgradeCost.name, () => {
    it('sums costs from level 0 to 3', () => {
      const result = cumulativeUpgradeCost(5, 0, 3, 1.3);
      expect(result).toBe(5 + 6 + 8);
    });

    it('sums from non-zero start level', () => {
      const result = cumulativeUpgradeCost(5, 2, 4, 1.3);
      const expected = upgradeCostAtLevel(5, 2, 1.3) + upgradeCostAtLevel(5, 3, 1.3);
      expect(result).toBe(expected);
    });

    it('returns 0 for same from/to', () => {
      expect(cumulativeUpgradeCost(5, 3, 3, 1.3)).toBe(0);
    });
  });

  describe(maxLevelsForBudget.name, () => {
    it('returns 0 if budget is less than first level cost', () => {
      expect(maxLevelsForBudget(10, 5, 1.3)).toBe(0);
    });

    it('computes correct levels for a given budget', () => {
      const levels = maxLevelsForBudget(5, 19, 1.3);
      expect(levels).toBe(3);
    });

    it('accounts for start level', () => {
      const levels = maxLevelsForBudget(5, 100, 1.3, 5);
      const levelsCost = cumulativeUpgradeCost(5, 5, 5 + levels, 1.3);
      expect(levelsCost).toBeLessThanOrEqual(100);
    });
  });

  describe(maxUpgradeLevel.name, () => {
    const cfg = createTestConfig();

    it.each([
      { type: 'spawnRate' as const, expected: 1 },
      { type: 'defense' as const, expected: 8 },
      { type: 'interestRate' as const, expected: 20 },
      { type: 'health' as const, expected: Infinity },
      { type: 'attack' as const, expected: Infinity },
    ])('$type max level = $expected', ({ type, expected }) => {
      expect(maxUpgradeLevel(type, cfg)).toBe(expected);
    });
  });
});

describe('Stat Values', () => {
  const cfg = createTestConfig();

  describe(statAtLevel.name, () => {
    it.each([
      { type: 'health' as const, level: 0, expected: 3 },
      { type: 'health' as const, level: 5, expected: 8 },
      { type: 'attack' as const, level: 0, expected: 1 },
      { type: 'attack' as const, level: 2, expected: 3 },
      { type: 'spawnRate' as const, level: 0, expected: 1000 / 60 },
      { type: 'spawnRate' as const, level: 1, expected: 1000 / 50 },
      { type: 'speed' as const, level: 0, expected: 180 },
      { type: 'speed' as const, level: 3, expected: 240 },
      { type: 'defense' as const, level: 0, expected: 0.05 },
      { type: 'defense' as const, level: 8, expected: 0.25 },
      { type: 'interestRate' as const, level: 0, expected: 0 },
      { type: 'interestRate' as const, level: 4, expected: 0.01 },
    ])('$type at level $level = $expected', ({ type, level, expected }) => {
      expect(statAtLevel(type, level, cfg)).toBeCloseTo(expected, 5);
    });
  });
});

describe(upgradeEfficiencyTable.name, () => {
  const cfg = createTestConfig();

  it('produces correct number of rows', () => {
    const table = upgradeEfficiencyTable('attack', 5, cfg);
    expect(table).toHaveLength(5);
  });

  it('first row has correct values for attack', () => {
    const table = upgradeEfficiencyTable('attack', 3, cfg);
    const row = table[0];
    expect(row.level).toBe(0);
    expect(row.cost).toBe(5);
    expect(row.cumulativeCost).toBe(5);
    expect(row.statDelta).toBe(1);
    expect(row.efficiency).toBe(1 / 5);
  });

  it('cumulative cost accumulates', () => {
    const table = upgradeEfficiencyTable('health', 3, cfg);
    expect(table[2].cumulativeCost).toBe(5 + 6 + 8);
  });

  it('handles spawnRate delta becoming 0 at max level', () => {
    const table = upgradeEfficiencyTable('spawnRate', 2, cfg);
    expect(table[0].statDelta).toBeGreaterThan(0);
    expect(table[1].statDelta).toBe(0);
    expect(table[1].efficiency).toBe(0);
  });
});

describe('Combat Math', () => {
  describe(hitsToKill.name, () => {
    it.each([
      { hp: 3, atk: 1, def: 0, expected: 3 },
      { hp: 3, atk: 3, def: 0, expected: 1 },
      { hp: 3, atk: 2, def: 0, expected: 2 },
      { hp: 10, atk: 3, def: 0, expected: 4 },
      { hp: 3, atk: 1, def: 0.25, expected: 4 },
      { hp: 5, atk: 0, def: 0, expected: Infinity },
    ])('hp=$hp atk=$atk def=$def -> $expected hits', ({ hp, atk, def, expected }) => {
      expect(hitsToKill(hp, atk, def)).toBe(expected);
    });
  });

  describe(duelOutcome.name, () => {
    it('equal particles result in draw', () => {
      const p: CombatStats = { health: 3, attack: 1, defense: 0 };
      const result = duelOutcome(p, p);
      expect(result.winner).toBe('draw');
      expect(result.survivorHP).toBe(0);
    });

    it('higher attack wins', () => {
      const p1: CombatStats = { health: 3, attack: 3, defense: 0 };
      const p2: CombatStats = { health: 3, attack: 1, defense: 0 };
      const result = duelOutcome(p1, p2);
      expect(result.winner).toBe('p1');
      expect(result.hitsForP1ToKillP2).toBe(1);
      expect(result.hitsForP2ToKillP1).toBe(3);
      expect(result.survivorHP).toBe(2);
    });

    it('higher health wins', () => {
      const p1: CombatStats = { health: 10, attack: 1, defense: 0 };
      const p2: CombatStats = { health: 3, attack: 1, defense: 0 };
      const result = duelOutcome(p1, p2);
      expect(result.winner).toBe('p1');
      expect(result.survivorHP).toBe(7);
    });

    it('defense affects outcome', () => {
      const p1: CombatStats = { health: 5, attack: 2, defense: 0.25 };
      const p2: CombatStats = { health: 5, attack: 2, defense: 0 };
      const result = duelOutcome(p1, p2);
      // P1 kills P2 in ceil(5/2) = 3 hits; P2 kills P1 in ceil(5/1.5) = 4 hits
      expect(result.hitsForP1ToKillP2).toBe(3);
      expect(result.hitsForP2ToKillP1).toBe(4);
      expect(result.winner).toBe('p1');
    });
  });

  describe(duelMatrix.name, () => {
    const cfg = createTestConfig();

    it('produces correct dimensions', () => {
      const matrix = duelMatrix([0, 1, 2], [0, 1], cfg);
      expect(matrix).toHaveLength(3);
      expect(matrix[0]).toHaveLength(2);
    });

    it('attack level 2 one-shots base health', () => {
      const matrix = duelMatrix([2], [0], cfg);
      expect(matrix[0][0]).toBe(1);
    });
  });
});

describe('Lanchester Analysis', () => {
  describe(lanchesterPower.name, () => {
    it('scales quadratically with army size', () => {
      const p100 = lanchesterPower(100, 1, 3);
      const p200 = lanchesterPower(200, 1, 3);
      expect(p200 / p100).toBeCloseTo(4, 1);
    });

    it('scales linearly with attack', () => {
      const p1 = lanchesterPower(100, 1, 3);
      const p2 = lanchesterPower(100, 2, 3);
      expect(p2 / p1).toBeCloseTo(2, 5);
    });

    it('accounts for defense', () => {
      const pNoDef = lanchesterPower(100, 1, 3, 0);
      const pDef = lanchesterPower(100, 1, 3, 0.25);
      expect(pDef).toBeGreaterThan(pNoDef);
      expect(pDef / pNoDef).toBeCloseTo(1 / 0.75, 2);
    });
  });

  describe(lanchesterROIPerGold.name, () => {
    const cfg = createTestConfig();

    it('attack ROI is positive', () => {
      const roi = lanchesterROIPerGold('attack', 0, 300, cfg);
      expect(roi).toBeGreaterThan(0);
    });

    it('attack ROI exceeds health ROI at base stats', () => {
      const atkROI = lanchesterROIPerGold('attack', 0, 300, cfg);
      const hpROI = lanchesterROIPerGold('health', 0, 300, cfg);
      expect(atkROI).toBeGreaterThan(hpROI);
    });

    it('defense ROI is much lower than attack ROI', () => {
      const atkROI = lanchesterROIPerGold('attack', 0, 300, cfg);
      const defROI = lanchesterROIPerGold('defense', 0, 300, cfg);
      expect(atkROI / defROI).toBeGreaterThan(100);
    });

    it('returns 0 for spawnRate (handled separately)', () => {
      expect(lanchesterROIPerGold('spawnRate', 0, 300, cfg)).toBe(0);
    });
  });
});

describe(spawnRateTable.name, () => {
  const cfg = createTestConfig();

  it('produces rows from level 0 to max', () => {
    const table = spawnRateTable(cfg);
    expect(table).toHaveLength(2);
    expect(table[0].level).toBe(0);
    expect(table[1].level).toBe(1);
  });

  it('level 0 has base interval', () => {
    const table = spawnRateTable(cfg);
    expect(table[0].intervalMs).toBe(60);
    expect(table[0].spawnsPerSecond).toBeCloseTo(1000 / 60, 2);
  });

  it('max level respects minimum interval', () => {
    const table = spawnRateTable(cfg);
    const last = table[table.length - 1];
    expect(last.intervalMs).toBeGreaterThanOrEqual(cfg.minSpawnInterval);
  });
});

describe(laserTowerROI.name, () => {
  const cfg = createTestConfig();

  it('computes correct DPS', () => {
    const roi = laserTowerROI(3, cfg);
    expect(roi.dps).toBe(4);
  });

  it('computes correct kill rate', () => {
    const roi = laserTowerROI(3, cfg);
    expect(roi.killRatePerSec).toBeCloseTo(4 / 3, 5);
  });

  it('computes total first cost including research', () => {
    const roi = laserTowerROI(3, cfg);
    expect(roi.totalFirstCost).toBe(700);
    expect(roi.totalSubsequentCost).toBe(500);
  });

  it('break-even time is reasonable', () => {
    const roi = laserTowerROI(3, cfg);
    expect(roi.breakEvenFirstSec).toBeGreaterThan(100);
    expect(roi.breakEvenFirstSec).toBeLessThan(1000);
  });

  it('equivalent attack levels are computed', () => {
    const roi = laserTowerROI(3, cfg);
    expect(roi.equivalentAttackLevels).toBeGreaterThan(10);
  });
});

describe(interestBreakEvenTable.name, () => {
  const cfg = createTestConfig();

  it('produces rows for requested levels', () => {
    const table = interestBreakEvenTable([50, 100], cfg);
    expect(table.length).toBeGreaterThan(0);
    expect(table[0].level).toBe(1);
  });

  it('higher gold bank means faster break-even', () => {
    const table = interestBreakEvenTable([50, 500], cfg);
    const row = table[0];
    expect(row.breakEvenSecondsAtBank[500]).toBeLessThan(row.breakEvenSecondsAtBank[50]);
  });

  it('interest income scales with bank and level', () => {
    const table = interestBreakEvenTable([100, 200], cfg);
    const lvl1 = table[0];
    const lvl2 = table[1];
    expect(lvl2.incomePerIntervalAtBank[200]).toBeGreaterThan(lvl1.incomePerIntervalAtBank[200]);
  });
});

describe(detectRedFlags.name, () => {
  it('detects spawn rate cap with default config', () => {
    const cfg = createTestConfig();
    const flags = detectRedFlags(cfg);
    const spawnFlag = flags.find(f => f.category === 'Spawn Rate');
    expect(spawnFlag).toBeDefined();
    expect(spawnFlag!.severity).toBe('critical');
  });

  it('detects attack one-shot', () => {
    const cfg = createTestConfig();
    const flags = detectRedFlags(cfg);
    const attackFlag = flags.find(f => f.category === 'Attack vs Health');
    expect(attackFlag).toBeDefined();
  });

  it('detects defense cost imbalance', () => {
    const cfg = createTestConfig();
    const flags = detectRedFlags(cfg);
    const defFlag = flags.find(f => f.category === 'Defense vs Attack Cost');
    expect(defFlag).toBeDefined();
  });

  it('detects tower ROI issue', () => {
    const cfg = createTestConfig();
    const flags = detectRedFlags(cfg);
    const towerFlag = flags.find(f => f.category === 'Tower ROI');
    expect(towerFlag).toBeDefined();
  });

  it('no spawn rate flag when many levels available', () => {
    const cfg = createTestConfig({
      spawnIntervalMs: 200,
      minSpawnInterval: 30,
      spawnRateReductionPerLevel: 10,
    });
    const flags = detectRedFlags(cfg);
    const spawnFlag = flags.find(f => f.category === 'Spawn Rate');
    expect(spawnFlag).toBeUndefined();
  });
});
