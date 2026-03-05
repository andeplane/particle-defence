const RESOLUTION_SCALE = 2;

export const CONFIG = {
  GAME_WIDTH: 1024 * RESOLUTION_SCALE,
  GAME_HEIGHT: 512 * RESOLUTION_SCALE,

  // Maze
  MAZE_COLS: 32 * RESOLUTION_SCALE,
  MAZE_ROWS: 16 * RESOLUTION_SCALE,
  PERCOLATION_THRESHOLD: 0.8,
  BASE_WIDTH_CELLS: 4,

  // Particles
  PARTICLE_BASE_HEALTH: 3,
  PARTICLE_BASE_ATTACK: 1,
  PARTICLE_BASE_RADIUS: 3,
  PARTICLE_SPEED: 180,
  SPAWN_INTERVAL_MS: 60,
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
  KILL_REWARD: 1,
  /** Fraction of KILL_REWARD awarded per nuke kill (1/4) */
  NUCLEAR_KILL_REWARD_FRACTION: 0.25,
  NUCLEAR_FIRST_AVAILABLE_MS: 0,  // 3 minutes
  NUCLEAR_COOLDOWN_MS: 600_000,        // 10 minutes
  UPGRADE_COSTS: {
    health: 5,
    attack: 5,
    radius: 3,
    spawnRate: 10,
    speed: 7,
    maxParticles: 10,
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

  // Visual
  PLAYER1_COLOR: 0x00ddff,
  PLAYER2_COLOR: 0xff4444,
  PLAYER1_COLOR_STR: '#00ddff',
  PLAYER2_COLOR_STR: '#ff4444',
  WALL_COLOR: 0x1a1a2e,
  FLOOR_COLOR: 0x0d0d1a,
  BG_COLOR: 0x0a0a0f,
} as const;

export type UpgradeType = keyof typeof CONFIG.UPGRADE_COSTS;

export function getUpgradeCost(type: UpgradeType, level: number): number {
  const base = CONFIG.UPGRADE_COSTS[type];
  return Math.floor(base * Math.pow(CONFIG.UPGRADE_COST_MULTIPLIER, level));
}
