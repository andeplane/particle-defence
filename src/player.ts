import { CONFIG, getUpgradeCost, type UpgradeType } from './config';

export interface IPlayer {
  readonly id: 0 | 1;
  baseHP: number;
  gold: number;
  kills: number;
  readonly particleHealth: number;
  readonly particleAttack: number;
  readonly particleRadius: number;
  readonly spawnInterval: number;
  readonly particleSpeed: number;
  readonly maxParticles: number;
  /** Defense bonus (0-0.25) from ownership upgrade, applied when in owned cell */
  readonly particleDefense: number;
  /** Gold interest rate (0-0.05) from interest upgrade, applied every INTEREST_INTERVAL_MS */
  readonly goldInterestRate: number;
  readonly isAlive: boolean;
  getUpgradeLevel(upgrade: UpgradeType): number;
  getUpgradeCost(upgrade: UpgradeType): number;
  canAfford(upgrade: UpgradeType): boolean;
  buyUpgrade(upgrade: UpgradeType): boolean;
  canUseNuke(gameTimeMs: number): boolean;
  useNuke(gameTimeMs: number): void;
  getNukeCooldownRemainingMs(gameTimeMs: number): number;
  takeDamage(amount: number): void;
}

export type PlayerConfig = {
  baseHP: number;
  startingGold: number;
  particleBaseHealth: number;
  particleBaseAttack: number;
  particleBaseRadius: number;
  particleBaseSpeed: number;
  spawnIntervalMs: number;
  spawnRateReductionPerLevel: number;
  minSpawnInterval: number;
  speedPerLevel: number;
  maxParticlesPerPlayer: number;
  maxParticlesPerLevel: number;
  nuclearFirstAvailableMs: number;
  nuclearCooldownMs: number;
};

const defaultPlayerConfig: PlayerConfig = {
  baseHP: CONFIG.BASE_HP,
  startingGold: CONFIG.STARTING_GOLD,
  particleBaseHealth: CONFIG.PARTICLE_BASE_HEALTH,
  particleBaseAttack: CONFIG.PARTICLE_BASE_ATTACK,
  particleBaseRadius: CONFIG.PARTICLE_BASE_RADIUS,
  particleBaseSpeed: CONFIG.PARTICLE_SPEED,
  spawnIntervalMs: CONFIG.SPAWN_INTERVAL_MS,
  spawnRateReductionPerLevel: 20,
  minSpawnInterval: 50,
  speedPerLevel: 20,
  maxParticlesPerPlayer: CONFIG.MAX_PARTICLES_PER_PLAYER,
  maxParticlesPerLevel: CONFIG.MAX_PARTICLES_PER_LEVEL,
  nuclearFirstAvailableMs: CONFIG.NUCLEAR_FIRST_AVAILABLE_MS,
  nuclearCooldownMs: CONFIG.NUCLEAR_COOLDOWN_MS,
};

export class Player implements IPlayer {
  readonly id: 0 | 1;
  baseHP: number;
  gold: number;
  kills: number;

  private readonly config: PlayerConfig;
  private readonly upgradeLevels: Record<UpgradeType, number> = {
    health: 0, attack: 0, radius: 0, spawnRate: 0, speed: 0, maxParticles: 0, defense: 0, interestRate: 0,
  };

  /** Time (ms) when nuke was last used; -1 if never used */
  lastNukeTimeMs: number = -1;

  constructor(id: 0 | 1, config: PlayerConfig = defaultPlayerConfig) {
    this.id = id;
    this.config = config;
    this.baseHP = config.baseHP;
    this.gold = config.startingGold;
    this.kills = 0;
  }

  get particleHealth(): number {
    return this.config.particleBaseHealth + this.upgradeLevels.health;
  }

  get particleAttack(): number {
    return this.config.particleBaseAttack + this.upgradeLevels.attack;
  }

  get particleRadius(): number {
    return this.config.particleBaseRadius + this.upgradeLevels.radius;
  }

  get spawnInterval(): number {
    const reduction = this.upgradeLevels.spawnRate * this.config.spawnRateReductionPerLevel;
    return Math.max(this.config.minSpawnInterval, this.config.spawnIntervalMs - reduction);
  }

  get particleSpeed(): number {
    return this.config.particleBaseSpeed + this.upgradeLevels.speed * this.config.speedPerLevel;
  }

  get maxParticles(): number {
    return this.config.maxParticlesPerPlayer + this.upgradeLevels.maxParticles * this.config.maxParticlesPerLevel;
  }

  get particleDefense(): number {
    const base = CONFIG.OWNERSHIP_DEFENSE_BASE;
    const fromUpgrade = this.upgradeLevels.defense * CONFIG.OWNERSHIP_DEFENSE_PER_LEVEL;
    return Math.min(CONFIG.OWNERSHIP_DEFENSE_MAX, base + fromUpgrade);
  }

  get goldInterestRate(): number {
    const raw = this.upgradeLevels.interestRate * CONFIG.INTEREST_RATE_PER_LEVEL;
    return Math.min(CONFIG.MAX_INTEREST_RATE, raw);
  }

  getUpgradeLevel(upgrade: UpgradeType): number {
    return this.upgradeLevels[upgrade];
  }

  getUpgradeCost(upgrade: UpgradeType): number {
    return getUpgradeCost(upgrade, this.upgradeLevels[upgrade]);
  }

  canAfford(upgrade: UpgradeType): boolean {
    return this.gold >= this.getUpgradeCost(upgrade);
  }

  buyUpgrade(upgrade: UpgradeType): boolean {
    if (!this.canAfford(upgrade)) return false;
    this.gold -= this.getUpgradeCost(upgrade);
    this.upgradeLevels[upgrade]++;
    return true;
  }

  canUseNuke(gameTimeMs: number): boolean {
    if (this.lastNukeTimeMs < 0) {
      return gameTimeMs >= this.config.nuclearFirstAvailableMs;
    }
    return gameTimeMs >= this.lastNukeTimeMs + this.config.nuclearCooldownMs;
  }

  useNuke(gameTimeMs: number): void {
    this.lastNukeTimeMs = gameTimeMs;
  }

  getNukeCooldownRemainingMs(gameTimeMs: number): number {
    if (this.canUseNuke(gameTimeMs)) return 0;
    if (this.lastNukeTimeMs < 0) {
      return Math.max(0, this.config.nuclearFirstAvailableMs - gameTimeMs);
    }
    return Math.max(0, this.lastNukeTimeMs + this.config.nuclearCooldownMs - gameTimeMs);
  }

  takeDamage(amount: number): void {
    this.baseHP = Math.max(0, this.baseHP - amount);
  }

  get isAlive(): boolean {
    return this.baseHP > 0;
  }
}

export function createPlayer(id: 0 | 1, configOverrides?: Partial<PlayerConfig>): Player {
  const config = configOverrides ? { ...defaultPlayerConfig, ...configOverrides } : defaultPlayerConfig;
  return new Player(id, config);
}
