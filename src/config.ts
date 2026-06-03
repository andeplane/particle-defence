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
  PERCENT_HP_DAMAGE_SCALING: 0.05,
  /** Bonus damage multiplier per 100% speed advantage over target (speed combat mechanic) */
  SPEED_COMBAT_BONUS: 0.4,
  /** How strongly defense reduces HP scaling penalty (defense * factor reduces the HP scaling bonus) */
  DEFENSE_HP_SCALING_REDUCTION: 4.5,
  /** Per-level defense bonus applied globally (outside owned cells). Much smaller than cell-based. */
  GLOBAL_DEFENSE_PER_LEVEL: 0.018,
  /** Max global defense bonus (outside owned cells) */
  GLOBAL_DEFENSE_MAX: 0.18,
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
  NUKE_RESEARCH_COST: 2000,
  NUKE_RESEARCH_DURATION_MS: 300_000,   // 5 min to complete nuke research
  NUCLEAR_FIRST_AVAILABLE_MS: 0,        // immediately usable once research completes
  NUCLEAR_COOLDOWN_MS: 600_000,         // 10 min cooldown after each use
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
    weakness: 200,
  } as Record<string, number>,

  /** Time (ms) to complete tower research after paying */
  TOWER_RESEARCH_DURATION_MS: {
    laser: 20_000,
    weakness: 20_000,
  } as Record<string, number>,

  TOWER_CONSTRUCTION_COSTS: {
    laser: 500,
    weakness: 500,
  } as Record<string, number>,

  /** Time (ms) to build a tower after paying construction cost */
  TOWER_CONSTRUCTION_DURATION_MS: {
    laser: 3_000,
    weakness: 3_000,
  } as Record<string, number>,

  /** Time (ms) to apply a particle stat upgrade after paying */
  PARTICLE_UPGRADE_DURATION_MS: 500,
  /** Time (ms) to apply a tower upgrade after paying */
  TOWER_UPGRADE_DURATION_MS: 5_000,

  TOWER_LASER_BASE_HP: 50,
  TOWER_LASER_BASE_DAMAGE: 5,
  TOWER_LASER_BASE_RANGE: 150,
  TOWER_LASER_BASE_ATTACK_SPEED: 2.5,
  TOWER_LASER_UPGRADE_COST: 200,
  TOWER_LASER_DAMAGE_PER_LEVEL: 2,
  TOWER_LASER_ATTACK_SPEED_PER_LEVEL: 0.4,
  TOWER_LASER_HP_PER_LEVEL: 10,

  TOWER_WEAKNESS_BASE_HP: 40,
  /** Base HP drained per second from enemies in range */
  TOWER_WEAKNESS_BASE_DRAIN_DPS: 1.5,
  /** Base attack reduction applied to enemies in range (0.25 = 25% less damage) */
  TOWER_WEAKNESS_BASE_ATTACK_REDUCTION: 0.25,
  TOWER_WEAKNESS_BASE_RANGE: 140,
  TOWER_WEAKNESS_UPGRADE_COST: 200,
  /** Per-level increase to both drain DPS and attack reduction */
  TOWER_WEAKNESS_FACTOR_PER_LEVEL: 0.07,
  TOWER_WEAKNESS_HP_PER_LEVEL: 8,

  // Tier-2 research: universal tower researches
  TOWER_REGEN_COST_PER_LEVEL: 300,
  TOWER_REGEN_DURATION_MS: 10_000,
  /** HP/sec gained per regen research level */
  TOWER_REGEN_HP_PER_SEC_PER_LEVEL: 0.5,

  TOWER_RANGE_COST_PER_LEVEL: 250,
  TOWER_RANGE_DURATION_MS: 10_000,
  /** Extra range (pixels) per range research level */
  TOWER_RANGE_BONUS_PER_LEVEL: 25,

  // Tier-2 research: laser-specific
  LASER_BOUNCE_COST_PER_LEVEL: 400,
  LASER_BOUNCE_DURATION_MS: 15_000,

  LASER_OVERCHARGE_COST_PER_LEVEL: 350,
  LASER_OVERCHARGE_DURATION_MS: 12_000,
  /** Level 0 = no overcharge; level 1 = every 8th shot, decreasing by 1 per level */
  LASER_OVERCHARGE_BASE_INTERVAL: 8,

  // Tier-2 research: weakness-specific
  WEAKNESS_SLOW_COST_PER_LEVEL: 300,
  WEAKNESS_SLOW_DURATION_MS: 10_000,
  /** Slow factor applied per weakness slow research level */
  WEAKNESS_SLOW_FACTOR_PER_LEVEL: 0.12,

  WEAKNESS_STUN_COST_PER_LEVEL: 500,
  WEAKNESS_STUN_DURATION_MS: 20_000,
  /** Stun fires every N ms; decreases by 1500ms per level */
  WEAKNESS_STUN_BASE_INTERVAL_MS: 10_000,
  WEAKNESS_STUN_INTERVAL_REDUCTION_PER_LEVEL: 1_500,
  /** How long (ms) the stun effect lasts on target */
  WEAKNESS_STUN_EFFECT_DURATION_MS: 1_000,
} as const;

export type TowerType = 'laser' | 'weakness';
export const TOWER_TYPES: readonly TowerType[] = ['laser', 'weakness'] as const;
export const TOWER_TYPE = {
  LASER: 'laser',
  WEAKNESS: 'weakness',
} as const satisfies Record<string, TowerType>;

export type UpgradeType = keyof typeof CONFIG.UPGRADE_COSTS;

export function getUpgradeCost(type: UpgradeType, level: number): number {
  if (DEBUG_EVERYTHING_CHEAP) return 1;
  const base = CONFIG.UPGRADE_COSTS[type];
  return Math.floor(base * Math.pow(CONFIG.UPGRADE_COST_MULTIPLIER, level));
}

export function getTowerUpgradeCost(towerType: TowerType, level: number): number {
  if (DEBUG_EVERYTHING_CHEAP) return 1;
  const base = towerType === TOWER_TYPE.LASER ? CONFIG.TOWER_LASER_UPGRADE_COST : CONFIG.TOWER_WEAKNESS_UPGRADE_COST;
  return Math.floor(base * Math.pow(CONFIG.TOWER_UPGRADE_COST_MULTIPLIER, level));
}

export function getTowerResearchCost(towerType: TowerType): number {
  if (DEBUG_EVERYTHING_CHEAP) return 1;
  return CONFIG.TOWER_RESEARCH_COSTS[towerType];
}

export function getNukeResearchCost(): number {
  if (DEBUG_EVERYTHING_CHEAP) return 1;
  return CONFIG.NUKE_RESEARCH_COST;
}

export function getTowerConstructionCost(towerType: TowerType): number {
  if (DEBUG_EVERYTHING_CHEAP) return 1;
  return CONFIG.TOWER_CONSTRUCTION_COSTS[towerType];
}
