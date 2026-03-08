const RESOLUTION_SCALE = 2;

function getQueryParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

export const DEBUG_MODE = getQueryParam('debug') === 'true';

// Debug flag for making everything cost $1
let DEBUG_EVERYTHING_CHEAP = false;

export function setDebugEverythingCheap(enabled: boolean): void {
  DEBUG_EVERYTHING_CHEAP = enabled;
}

export function getDebugEverythingCheap(): boolean {
  return DEBUG_EVERYTHING_CHEAP;
}

export const CONFIG = {
  GAME_WIDTH: 1024 * RESOLUTION_SCALE,
  GAME_HEIGHT: 512 * RESOLUTION_SCALE,

  // Maze
  MAZE_COLS: 32 * RESOLUTION_SCALE,
  MAZE_ROWS: 16 * RESOLUTION_SCALE,
  PERCOLATION_THRESHOLD: 0.8,
  BASE_WIDTH_CELLS: 4,

  // Particles
  PARTICLE_BASE_HEALTH: 5,
  PARTICLE_BASE_ATTACK: 2,
  /** HP gained per health upgrade level (< 1.0 gives diminishing returns vs attack) */
  HEALTH_PER_LEVEL: 0.8,
  /** Damage gained per attack upgrade level (> 1.0 makes attack scale faster than health) */
  ATTACK_PER_LEVEL: 1.2,
  /** % max HP bonus scales attack multiplicatively: dmg = atk * (1 + scale * targetHP/baseHP) */
  PERCENT_HP_DAMAGE_SCALING: 0.06,
  /** Bonus damage multiplier per 100% speed advantage over target (speed combat mechanic) */
  SPEED_COMBAT_BONUS: 0.4,
  PARTICLE_BASE_RADIUS: 3,
  PARTICLE_SPEED: 180,
  SPAWN_INTERVAL_MS: 200,
  /** Minimum spawn interval (ms) - spawn rate upgrade cannot go below this */
  MIN_SPAWN_INTERVAL: 40,
  /** Spawn interval reduction (ms) per spawn rate upgrade level */
  SPAWN_RATE_REDUCTION_PER_LEVEL: 10,
  /** Speed increase per speed upgrade level */
  SPEED_PER_LEVEL: 20,
  MAX_PARTICLES_PER_PLAYER: 1000,
  /** Per-level increase for maxParticles upgrade */
  MAX_PARTICLES_PER_LEVEL: 50,
  MAX_PARTICLES_TOTAL: 2000,
  /** Random drift per second (fraction of speed) to prevent stuck particles */
  PARTICLE_DRIFT_STRENGTH: 0.3,
  /** Chance (0-1) that random drift pushes towards enemy base */
  PARTICLE_ENEMY_BIAS: 0.65,
  /** Stuck detection: respawn if particle moves less than this many blocks in this many seconds */
  STUCK_THRESHOLD_BLOCKS: 10,
  STUCK_THRESHOLD_SECONDS: 10,

  // Bases
  BASE_HP: 1000,
  BASE_DAMAGE_ON_REACH: 1,

  // Economy
  STARTING_GOLD: 25,
  KILL_REWARD: 1,
  /** Fraction of KILL_REWARD awarded per nuke kill (1/4) */
  NUCLEAR_KILL_REWARD_FRACTION: 0.25,
  NUCLEAR_FIRST_AVAILABLE_MS: 300_000,  // 5 minutes
  NUCLEAR_COOLDOWN_MS: 300_000,        // 5 minutes
  /** Interval (ms) between gold interest payouts */
  INTEREST_INTERVAL_MS: 30_000,
  /** Interest rate per upgrade level (e.g. 0.0025 = +0.25%) */
  INTEREST_RATE_PER_LEVEL: 0.0025,
  /** Max interest rate cap (e.g. 0.05 = 5%) */
  MAX_INTEREST_RATE: 0.05,
  UPGRADE_COSTS: {
    health: 5,
    attack: 5,
    radius: 3,
    spawnRate: 8,
    speed: 7,
    maxParticles: 10,
    defense: 15,
    interestRate: 10,
  },
  /** Cost multiplier per upgrade level: cost = baseCost * UPGRADE_COST_MULTIPLIER^level */
  UPGRADE_COST_MULTIPLIER: 1.3,

  // Spatial hash
  SPATIAL_CELL_SIZE: 16 * RESOLUTION_SCALE,

  // UI (scaled with resolution)
  UI_FONT_SMALL: 10 * RESOLUTION_SCALE,
  UI_FONT_MED: 13 * RESOLUTION_SCALE,
  UI_FONT_LARGE: 14 * RESOLUTION_SCALE,
  UI_BAR_WIDTH: 200 * RESOLUTION_SCALE,
  UI_BAR_HEIGHT: 14 * RESOLUTION_SCALE,
  UI_BTN_WIDTH: 52 * RESOLUTION_SCALE,
  UI_BTN_HEIGHT: 40 * RESOLUTION_SCALE,
  UI_GAP: 4 * RESOLUTION_SCALE,

  // Cell effects defaults
  SLOW_EFFECT_FACTOR: 0.4,
  DAMAGE_CELL_DPS: 2,
  TEMP_WALL_DEFAULT_TIME_MS: 10_000,
  TEMP_WALL_DEFAULT_HP: 20,

  // Visual
  PLAYER1_COLOR: 0x00ddff,
  PLAYER2_COLOR: 0xff4444,
  PLAYER1_COLOR_STR: '#00ddff',
  PLAYER2_COLOR_STR: '#ff4444',
  WALL_COLOR: 0x4a4a6e,
  FLOOR_COLOR: 0x0d0d1a,
  BG_COLOR: 0x0a0a0f,

  // Cell effect visual
  SLOW_EFFECT_ALPHA: 0.18,
  DAMAGE_EFFECT_ALPHA: 0.22,
  TEMP_WALL_ALPHA: 0.55,
  TEMP_WALL_HP_BAR_HEIGHT: 4,

  // Cell ownership
  /** Speed multiplier when moving through enemy-owned cells (0.8 = 20% slower) */
  OWNERSHIP_SLOW_FACTOR: 0.8,
  /** Base defense bonus (0-1) when standing in owned cell, before upgrade */
  OWNERSHIP_DEFENSE_BASE: 0.05,
  /** Per-level defense bonus increase from upgrade */
  OWNERSHIP_DEFENSE_PER_LEVEL: 0.02,
  /** Max total defense bonus (base + upgrade) */
  OWNERSHIP_DEFENSE_MAX: 0.30,
  /** Duration (ms) of capture flash overlay */
  OWNERSHIP_CAPTURE_FLASH_MS: 300,
  /** Alpha for subtle owned-cell tint */
  OWNERSHIP_EFFECT_ALPHA: 0.08,
  /** Alpha for brief capture flash (slightly stronger) */
  OWNERSHIP_CAPTURE_FLASH_ALPHA: 0.15,
  // Towers
  TOWER_MAX_PER_PLAYER: 5,
  TOWER_CARRIER_HP: 10,
  /** Damage reduction factor for placed towers (0.5 = towers take 50% less damage) */
  TOWER_DAMAGE_REDUCTION: 0.5,
  /** Visual and collision radius for placed towers (laser/slow) */
  TOWER_VISUAL_RADIUS: 14,
  TOWER_UPGRADE_COST_MULTIPLIER: 1.4,

  TOWER_RESEARCH_COSTS: {
    laser: 200,
    slow: 200,
  } as Record<string, number>,

  TOWER_CONSTRUCTION_COSTS: {
    laser: 500,
    slow: 500,
  } as Record<string, number>,

  TOWER_LASER_BASE_HP: 50,
  TOWER_LASER_BASE_DAMAGE: 5,
  TOWER_LASER_BASE_RANGE: 150,
  TOWER_LASER_BASE_ATTACK_SPEED: 2.5,
  TOWER_LASER_UPGRADE_COST: 200,
  TOWER_LASER_DAMAGE_PER_LEVEL: 2,
  TOWER_LASER_RANGE_PER_LEVEL: 15,
  TOWER_LASER_ATTACK_SPEED_PER_LEVEL: 0.4,
  TOWER_LASER_HP_PER_LEVEL: 10,

  TOWER_SLOW_BASE_HP: 40,
  TOWER_SLOW_BASE_FACTOR: 0.4,
  TOWER_SLOW_BASE_RANGE: 140,
  TOWER_SLOW_UPGRADE_COST: 200,
  TOWER_SLOW_FACTOR_PER_LEVEL: 0.07,
  TOWER_SLOW_RANGE_PER_LEVEL: 20,
  TOWER_SLOW_HP_PER_LEVEL: 8,
} as const;

export type TowerType = 'laser' | 'slow';
export const TOWER_TYPES: readonly TowerType[] = ['laser', 'slow'] as const;

export type UpgradeType = keyof typeof CONFIG.UPGRADE_COSTS;

export function getUpgradeCost(type: UpgradeType, level: number): number {
  if (DEBUG_EVERYTHING_CHEAP) return 1;
  const base = CONFIG.UPGRADE_COSTS[type];
  return Math.floor(base * Math.pow(CONFIG.UPGRADE_COST_MULTIPLIER, level));
}

export function getTowerUpgradeCost(towerType: TowerType, level: number): number {
  if (DEBUG_EVERYTHING_CHEAP) return 1;
  const base = towerType === 'laser' ? CONFIG.TOWER_LASER_UPGRADE_COST : CONFIG.TOWER_SLOW_UPGRADE_COST;
  return Math.floor(base * Math.pow(CONFIG.TOWER_UPGRADE_COST_MULTIPLIER, level));
}

export function getTowerResearchCost(towerType: TowerType): number {
  if (DEBUG_EVERYTHING_CHEAP) return 1;
  return CONFIG.TOWER_RESEARCH_COSTS[towerType];
}

export function getTowerConstructionCost(towerType: TowerType): number {
  if (DEBUG_EVERYTHING_CHEAP) return 1;
  return CONFIG.TOWER_CONSTRUCTION_COSTS[towerType];
}
