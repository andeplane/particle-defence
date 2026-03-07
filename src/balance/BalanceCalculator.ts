import { CONFIG, type UpgradeType, type TowerType } from '../config';

// ---------------------------------------------------------------------------
// Balance Config -- extracted from CONFIG for testability
// ---------------------------------------------------------------------------

export interface BalanceConfig {
  readonly particleBaseHealth: number;
  readonly particleBaseAttack: number;
  readonly particleBaseRadius: number;
  readonly particleBaseSpeed: number;
  readonly spawnIntervalMs: number;
  readonly minSpawnInterval: number;
  readonly spawnRateReductionPerLevel: number;
  readonly speedPerLevel: number;
  readonly maxParticlesPerPlayer: number;
  readonly maxParticlesPerLevel: number;
  readonly baseHP: number;
  readonly baseDamageOnReach: number;
  readonly killReward: number;
  readonly upgradeCosts: Record<UpgradeType, number>;
  readonly upgradeCostMultiplier: number;
  readonly ownershipDefenseBase: number;
  readonly ownershipDefensePerLevel: number;
  readonly ownershipDefenseMax: number;
  readonly interestRatePerLevel: number;
  readonly maxInterestRate: number;
  readonly interestIntervalMs: number;
  readonly towerResearchCosts: Record<string, number>;
  readonly towerConstructionCosts: Record<string, number>;
  readonly laserBaseDamage: number;
  readonly laserBaseAttackSpeed: number;
  readonly laserBaseRange: number;
  readonly laserDamagePerLevel: number;
  readonly laserAttackSpeedPerLevel: number;
  readonly laserRangePerLevel: number;
  readonly laserUpgradeCost: number;
  readonly slowBaseFactor: number;
  readonly slowBaseRange: number;
  readonly slowFactorPerLevel: number;
  readonly slowRangePerLevel: number;
  readonly slowUpgradeCost: number;
  readonly towerUpgradeCostMultiplier: number;
}

export function defaultBalanceConfig(): BalanceConfig {
  return {
    particleBaseHealth: CONFIG.PARTICLE_BASE_HEALTH,
    particleBaseAttack: CONFIG.PARTICLE_BASE_ATTACK,
    particleBaseRadius: CONFIG.PARTICLE_BASE_RADIUS,
    particleBaseSpeed: CONFIG.PARTICLE_SPEED,
    spawnIntervalMs: CONFIG.SPAWN_INTERVAL_MS,
    minSpawnInterval: CONFIG.MIN_SPAWN_INTERVAL,
    spawnRateReductionPerLevel: CONFIG.SPAWN_RATE_REDUCTION_PER_LEVEL,
    speedPerLevel: CONFIG.SPEED_PER_LEVEL,
    maxParticlesPerPlayer: CONFIG.MAX_PARTICLES_PER_PLAYER,
    maxParticlesPerLevel: CONFIG.MAX_PARTICLES_PER_LEVEL,
    baseHP: CONFIG.BASE_HP,
    baseDamageOnReach: CONFIG.BASE_DAMAGE_ON_REACH,
    killReward: CONFIG.KILL_REWARD,
    upgradeCosts: { ...CONFIG.UPGRADE_COSTS },
    upgradeCostMultiplier: CONFIG.UPGRADE_COST_MULTIPLIER,
    ownershipDefenseBase: CONFIG.OWNERSHIP_DEFENSE_BASE,
    ownershipDefensePerLevel: CONFIG.OWNERSHIP_DEFENSE_PER_LEVEL,
    ownershipDefenseMax: CONFIG.OWNERSHIP_DEFENSE_MAX,
    interestRatePerLevel: CONFIG.INTEREST_RATE_PER_LEVEL,
    maxInterestRate: CONFIG.MAX_INTEREST_RATE,
    interestIntervalMs: CONFIG.INTEREST_INTERVAL_MS,
    towerResearchCosts: { ...CONFIG.TOWER_RESEARCH_COSTS },
    towerConstructionCosts: { ...CONFIG.TOWER_CONSTRUCTION_COSTS },
    laserBaseDamage: CONFIG.TOWER_LASER_BASE_DAMAGE,
    laserBaseAttackSpeed: CONFIG.TOWER_LASER_BASE_ATTACK_SPEED,
    laserBaseRange: CONFIG.TOWER_LASER_BASE_RANGE,
    laserDamagePerLevel: CONFIG.TOWER_LASER_DAMAGE_PER_LEVEL,
    laserAttackSpeedPerLevel: CONFIG.TOWER_LASER_ATTACK_SPEED_PER_LEVEL,
    laserRangePerLevel: CONFIG.TOWER_LASER_RANGE_PER_LEVEL,
    laserUpgradeCost: CONFIG.TOWER_LASER_UPGRADE_COST,
    slowBaseFactor: CONFIG.TOWER_SLOW_BASE_FACTOR,
    slowBaseRange: CONFIG.TOWER_SLOW_BASE_RANGE,
    slowFactorPerLevel: CONFIG.TOWER_SLOW_FACTOR_PER_LEVEL,
    slowRangePerLevel: CONFIG.TOWER_SLOW_RANGE_PER_LEVEL,
    slowUpgradeCost: CONFIG.TOWER_SLOW_UPGRADE_COST,
    towerUpgradeCostMultiplier: CONFIG.TOWER_UPGRADE_COST_MULTIPLIER,
  };
}

// ---------------------------------------------------------------------------
// Gold & Cost Calculations
// ---------------------------------------------------------------------------

export function upgradeCostAtLevel(baseCost: number, level: number, multiplier: number): number {
  return Math.floor(baseCost * Math.pow(multiplier, level));
}

export function cumulativeUpgradeCost(baseCost: number, fromLevel: number, toLevel: number, multiplier: number): number {
  let total = 0;
  for (let i = fromLevel; i < toLevel; i++) {
    total += upgradeCostAtLevel(baseCost, i, multiplier);
  }
  return total;
}

export function maxLevelsForBudget(baseCost: number, budget: number, multiplier: number, startLevel: number = 0): number {
  let spent = 0;
  let levels = 0;
  let currentLevel = startLevel;
  while (true) {
    const cost = upgradeCostAtLevel(baseCost, currentLevel, multiplier);
    if (spent + cost > budget) break;
    spent += cost;
    levels++;
    currentLevel++;
  }
  return levels;
}

/** Max upgrade level for capped upgrades, Infinity for uncapped. */
export function maxUpgradeLevel(type: UpgradeType, cfg: BalanceConfig): number {
  switch (type) {
    case 'spawnRate':
      return Math.max(0, Math.ceil(
        (cfg.spawnIntervalMs - cfg.minSpawnInterval) / cfg.spawnRateReductionPerLevel
      ));
    case 'defense':
      return Math.max(0, Math.round(
        (cfg.ownershipDefenseMax - cfg.ownershipDefenseBase) / cfg.ownershipDefensePerLevel
      ));
    case 'interestRate':
      return Math.max(0, Math.round(cfg.maxInterestRate / cfg.interestRatePerLevel));
    default:
      return Infinity;
  }
}

// ---------------------------------------------------------------------------
// Stat values at upgrade level
// ---------------------------------------------------------------------------

export function statAtLevel(type: UpgradeType, level: number, cfg: BalanceConfig): number {
  switch (type) {
    case 'health': return cfg.particleBaseHealth + level;
    case 'attack': return cfg.particleBaseAttack + level;
    case 'radius': return cfg.particleBaseRadius + level;
    case 'spawnRate': {
      const interval = Math.max(cfg.minSpawnInterval, cfg.spawnIntervalMs - level * cfg.spawnRateReductionPerLevel);
      return 1000 / interval;
    }
    case 'speed': return cfg.particleBaseSpeed + level * cfg.speedPerLevel;
    case 'maxParticles': return cfg.maxParticlesPerPlayer + level * cfg.maxParticlesPerLevel;
    case 'defense': return Math.min(cfg.ownershipDefenseMax, cfg.ownershipDefenseBase + level * cfg.ownershipDefensePerLevel);
    case 'interestRate': return Math.min(cfg.maxInterestRate, level * cfg.interestRatePerLevel);
  }
}

// ---------------------------------------------------------------------------
// Gold Efficiency Table
// ---------------------------------------------------------------------------

export interface UpgradeEfficiencyRow {
  readonly type: UpgradeType;
  readonly level: number;
  readonly cost: number;
  readonly cumulativeCost: number;
  readonly statValue: number;
  readonly statDelta: number;
  readonly efficiency: number;
}

export function upgradeEfficiencyTable(type: UpgradeType, maxLevel: number, cfg: BalanceConfig): UpgradeEfficiencyRow[] {
  const baseCost = cfg.upgradeCosts[type];
  const rows: UpgradeEfficiencyRow[] = [];
  let cumCost = 0;

  for (let level = 0; level < maxLevel; level++) {
    const cost = upgradeCostAtLevel(baseCost, level, cfg.upgradeCostMultiplier);
    cumCost += cost;
    const statBefore = statAtLevel(type, level, cfg);
    const statAfter = statAtLevel(type, level + 1, cfg);
    const delta = statAfter - statBefore;
    rows.push({
      type,
      level,
      cost,
      cumulativeCost: cumCost,
      statValue: statAfter,
      statDelta: delta,
      efficiency: delta === 0 ? 0 : delta / cost,
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Duel / Combat Math
// ---------------------------------------------------------------------------

export function hitsToKill(targetHP: number, attackerAttack: number, targetDefense: number = 0): number {
  const effectiveDamage = attackerAttack * (1 - targetDefense);
  if (effectiveDamage <= 0) return Infinity;
  return Math.ceil(targetHP / effectiveDamage);
}

export interface CombatStats {
  readonly health: number;
  readonly attack: number;
  readonly defense: number;
}

export interface DuelResult {
  readonly hitsForP1ToKillP2: number;
  readonly hitsForP2ToKillP1: number;
  readonly winner: 'p1' | 'p2' | 'draw';
  readonly survivorHP: number;
}

/**
 * Simultaneous-damage duel: each collision both particles deal damage.
 * Winner = whoever takes more hits to die (outlasts the other).
 */
export function duelOutcome(p1: CombatStats, p2: CombatStats): DuelResult {
  const hitsP1Kills = hitsToKill(p2.health, p1.attack, p2.defense);
  const hitsP2Kills = hitsToKill(p1.health, p2.attack, p1.defense);

  if (hitsP1Kills === hitsP2Kills) {
    return { hitsForP1ToKillP2: hitsP1Kills, hitsForP2ToKillP1: hitsP2Kills, winner: 'draw', survivorHP: 0 };
  }

  if (hitsP1Kills < hitsP2Kills) {
    const damageToP1 = hitsP1Kills * p2.attack * (1 - p1.defense);
    return {
      hitsForP1ToKillP2: hitsP1Kills,
      hitsForP2ToKillP1: hitsP2Kills,
      winner: 'p1',
      survivorHP: p1.health - damageToP1,
    };
  }

  const damageToP2 = hitsP2Kills * p1.attack * (1 - p2.defense);
  return {
    hitsForP1ToKillP2: hitsP1Kills,
    hitsForP2ToKillP1: hitsP2Kills,
    winner: 'p2',
    survivorHP: p2.health - damageToP2,
  };
}

/**
 * Build a matrix of duel outcomes: rows = P1 attack levels, cols = P2 health levels.
 * Returns hits-for-P1-to-kill-P2 at each combination.
 */
export function duelMatrix(
  attackLevels: number[],
  healthLevels: number[],
  cfg: BalanceConfig,
): number[][] {
  return attackLevels.map(atkLvl => {
    const attack = statAtLevel('attack', atkLvl, cfg);
    return healthLevels.map(hpLvl => {
      const hp = statAtLevel('health', hpLvl, cfg);
      return hitsToKill(hp, attack);
    });
  });
}

// ---------------------------------------------------------------------------
// Lanchester's Square Law
// ---------------------------------------------------------------------------

/**
 * Lanchester combat power: P = N^2 * attack * effectiveHP
 * where effectiveHP = health / (1 - defense)
 */
export function lanchesterPower(armySize: number, attack: number, health: number, defense: number = 0): number {
  const effectiveHP = defense < 1 ? health / (1 - defense) : Infinity;
  return armySize * armySize * attack * effectiveHP;
}

/**
 * Marginal Lanchester power gain per gold for each upgrade type.
 * Allows direct cross-type comparison on a single "combat power per gold" axis.
 */
export function lanchesterROIPerGold(
  type: UpgradeType,
  currentLevel: number,
  armySize: number,
  cfg: BalanceConfig,
): number {
  const cost = upgradeCostAtLevel(cfg.upgradeCosts[type], currentLevel, cfg.upgradeCostMultiplier);
  if (cost === 0) return 0;

  const H = statAtLevel('health', currentLevel, cfg);
  const A = statAtLevel('attack', currentLevel, cfg);
  const D = statAtLevel('defense', 0, cfg);
  const N = armySize;

  const currentPower = lanchesterPower(N, A, H, D);
  let newPower: number;

  switch (type) {
    case 'attack':
      newPower = lanchesterPower(N, A + 1, H, D);
      break;
    case 'health':
      newPower = lanchesterPower(N, A, H + 1, D);
      break;
    case 'defense': {
      const newD = Math.min(cfg.ownershipDefenseMax, D + cfg.ownershipDefensePerLevel);
      newPower = lanchesterPower(N, A, H, newD);
      break;
    }
    case 'radius':
      // Larger radius = more collision opportunities; approximate as +10% encounter rate
      newPower = currentPower * 1.1;
      break;
    case 'speed':
      // Faster = more collisions + faster base reach; approximate as +5% effectiveness
      newPower = currentPower * 1.05;
      break;
    case 'spawnRate':
    case 'maxParticles':
    case 'interestRate':
      // These affect N over time, not per-unit stats; handled separately
      return 0;
  }

  return (newPower - currentPower) / cost;
}

// ---------------------------------------------------------------------------
// Spawn Rate / Army Growth Analysis
// ---------------------------------------------------------------------------

export interface SpawnRateAnalysis {
  readonly level: number;
  readonly intervalMs: number;
  readonly spawnsPerSecond: number;
  readonly cost: number;
  readonly deltaSpawnsPerSecond: number;
}

export function spawnRateTable(cfg: BalanceConfig): SpawnRateAnalysis[] {
  const maxLvl = maxUpgradeLevel('spawnRate', cfg);
  const rows: SpawnRateAnalysis[] = [];
  const baseSPS = 1000 / cfg.spawnIntervalMs;

  for (let level = 0; level <= maxLvl; level++) {
    const interval = Math.max(cfg.minSpawnInterval, cfg.spawnIntervalMs - level * cfg.spawnRateReductionPerLevel);
    const sps = 1000 / interval;
    const cost = level === 0 ? 0 : upgradeCostAtLevel(cfg.upgradeCosts.spawnRate, level - 1, cfg.upgradeCostMultiplier);
    const prevSPS = level === 0 ? baseSPS : 1000 / Math.max(cfg.minSpawnInterval, cfg.spawnIntervalMs - (level - 1) * cfg.spawnRateReductionPerLevel);
    rows.push({
      level,
      intervalMs: interval,
      spawnsPerSecond: sps,
      cost,
      deltaSpawnsPerSecond: sps - prevSPS,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Tower ROI
// ---------------------------------------------------------------------------

export interface TowerROIResult {
  readonly towerType: TowerType;
  readonly researchCost: number;
  readonly constructionCost: number;
  readonly totalFirstCost: number;
  readonly totalSubsequentCost: number;
  readonly dps: number;
  readonly killRatePerSec: number;
  readonly goldPerSec: number;
  readonly breakEvenFirstSec: number;
  readonly breakEvenSubsequentSec: number;
  readonly equivalentAttackLevels: number;
}

export function laserTowerROI(enemyHealth: number, cfg: BalanceConfig): TowerROIResult {
  const researchCost = cfg.towerResearchCosts['laser'];
  const constructionCost = cfg.towerConstructionCosts['laser'];
  const totalFirst = researchCost + constructionCost;

  const dps = cfg.laserBaseDamage * cfg.laserBaseAttackSpeed;
  const killRate = enemyHealth > 0 ? dps / enemyHealth : 0;
  const goldPerSec = killRate * cfg.killReward;

  return {
    towerType: 'laser',
    researchCost,
    constructionCost,
    totalFirstCost: totalFirst,
    totalSubsequentCost: constructionCost,
    dps,
    killRatePerSec: killRate,
    goldPerSec,
    breakEvenFirstSec: goldPerSec > 0 ? totalFirst / goldPerSec : Infinity,
    breakEvenSubsequentSec: goldPerSec > 0 ? constructionCost / goldPerSec : Infinity,
    equivalentAttackLevels: maxLevelsForBudget(cfg.upgradeCosts.attack, totalFirst, cfg.upgradeCostMultiplier),
  };
}

// ---------------------------------------------------------------------------
// Interest Rate Break-Even
// ---------------------------------------------------------------------------

export interface InterestBreakEven {
  readonly level: number;
  readonly rate: number;
  readonly costOfThisLevel: number;
  readonly cumulativeCost: number;
  readonly incomePerIntervalAtBank: Record<number, number>;
  readonly breakEvenSecondsAtBank: Record<number, number>;
}

export function interestBreakEvenTable(goldBanks: number[], cfg: BalanceConfig): InterestBreakEven[] {
  const maxLvl = maxUpgradeLevel('interestRate', cfg);
  const rows: InterestBreakEven[] = [];

  for (let level = 1; level <= Math.min(maxLvl, 10); level++) {
    const rate = Math.min(cfg.maxInterestRate, level * cfg.interestRatePerLevel);
    const costThisLevel = upgradeCostAtLevel(cfg.upgradeCosts.interestRate, level - 1, cfg.upgradeCostMultiplier);
    const cumCost = cumulativeUpgradeCost(cfg.upgradeCosts.interestRate, 0, level, cfg.upgradeCostMultiplier);

    const incomePerInterval: Record<number, number> = {};
    const breakEvenSeconds: Record<number, number> = {};

    for (const bank of goldBanks) {
      const income = Math.floor(bank * rate);
      incomePerInterval[bank] = income;
      const incomePerSec = income / (cfg.interestIntervalMs / 1000);
      breakEvenSeconds[bank] = incomePerSec > 0 ? cumCost / incomePerSec : Infinity;
    }

    rows.push({
      level,
      rate,
      costOfThisLevel: costThisLevel,
      cumulativeCost: cumCost,
      incomePerIntervalAtBank: incomePerInterval,
      breakEvenSecondsAtBank: breakEvenSeconds,
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Red Flags -- automated detection of obvious balance issues
// ---------------------------------------------------------------------------

export interface BalanceRedFlag {
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly category: string;
  readonly description: string;
  readonly details: string;
}

export function detectRedFlags(cfg: BalanceConfig): BalanceRedFlag[] {
  const flags: BalanceRedFlag[] = [];

  const spawnMaxLvl = maxUpgradeLevel('spawnRate', cfg);
  if (spawnMaxLvl <= 1) {
    flags.push({
      severity: 'critical',
      category: 'Spawn Rate',
      description: `Spawn rate caps at ${spawnMaxLvl} level(s)`,
      details: `Interval ${cfg.spawnIntervalMs}ms -> ${cfg.minSpawnInterval}ms with ${cfg.spawnRateReductionPerLevel}ms/level. ` +
        `Only ${spawnMaxLvl} upgrade(s) possible. By Lanchester's Square Law, army size has quadratic impact on combat power, ` +
        `making this the highest-value upgrade category -- yet it's nearly uncappable.`,
    });
  }

  const oneShotLevel = findOneShotLevel(cfg);
  if (oneShotLevel !== null && oneShotLevel <= 3) {
    const cost = cumulativeUpgradeCost(cfg.upgradeCosts.attack, 0, oneShotLevel, cfg.upgradeCostMultiplier);
    flags.push({
      severity: 'high',
      category: 'Attack vs Health',
      description: `Attack one-shots base-health enemies at level ${oneShotLevel} (${cost}g)`,
      details: `Base health = ${cfg.particleBaseHealth}, attack at level ${oneShotLevel} = ${cfg.particleBaseAttack + oneShotLevel}. ` +
        `One-shotting for only ${cost}g makes early attack upgrades vastly more impactful than health.`,
    });
  }

  const defenseToAttackRatio = cfg.upgradeCosts.defense / cfg.upgradeCosts.attack;
  if (defenseToAttackRatio > 10) {
    flags.push({
      severity: 'high',
      category: 'Defense vs Attack Cost',
      description: `Defense costs ${defenseToAttackRatio}x more than attack (${cfg.upgradeCosts.defense}g vs ${cfg.upgradeCosts.attack}g)`,
      details: `Defense only works in owned cells and gives +${(cfg.ownershipDefensePerLevel * 100).toFixed(1)}% per level. ` +
        `Attack gives +1 damage globally. The cost ratio makes defense nearly unviable.`,
    });
  }

  const laserROI = laserTowerROI(cfg.particleBaseHealth, cfg);
  if (laserROI.breakEvenFirstSec > 300) {
    flags.push({
      severity: 'medium',
      category: 'Tower ROI',
      description: `First laser tower takes ${(laserROI.breakEvenFirstSec / 60).toFixed(1)} min to break even`,
      details: `Total cost ${laserROI.totalFirstCost}g for ${laserROI.dps} DPS. ` +
        `Same gold buys ${laserROI.equivalentAttackLevels} attack levels applied to entire army.`,
    });
  }

  return flags;
}

function findOneShotLevel(cfg: BalanceConfig): number | null {
  for (let level = 0; level <= 20; level++) {
    const attack = cfg.particleBaseAttack + level;
    if (attack >= cfg.particleBaseHealth) return level;
  }
  return null;
}
