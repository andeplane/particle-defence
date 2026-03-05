import { CONFIG, getUpgradeCost, type UpgradeType } from './config';

export class Player {
  readonly id: 0 | 1;
  baseHP: number;
  gold: number;
  kills: number;

  healthLevel: number = 0;
  attackLevel: number = 0;
  radiusLevel: number = 0;
  spawnRateLevel: number = 0;
  speedLevel: number = 0;
  maxParticlesLevel: number = 0;

  /** Time (ms) when nuke was last used; -1 if never used */
  lastNukeTimeMs: number = -1;

  constructor(id: 0 | 1) {
    this.id = id;
    this.baseHP = CONFIG.BASE_HP;
    this.gold = 0;
    this.kills = 0;
  }

  get particleHealth(): number {
    return CONFIG.PARTICLE_BASE_HEALTH + this.healthLevel;
  }

  get particleAttack(): number {
    return CONFIG.PARTICLE_BASE_ATTACK + this.attackLevel;
  }

  get particleRadius(): number {
    return CONFIG.PARTICLE_BASE_RADIUS + this.radiusLevel;
  }

  get spawnInterval(): number {
    const reduction = this.spawnRateLevel * 20;
    return Math.max(50, CONFIG.SPAWN_INTERVAL_MS - reduction);
  }

  get particleSpeed(): number {
    return CONFIG.PARTICLE_SPEED + this.speedLevel * 20;
  }

  get maxParticles(): number {
    return CONFIG.MAX_PARTICLES_PER_PLAYER + this.maxParticlesLevel * CONFIG.MAX_PARTICLES_PER_LEVEL;
  }

  getUpgradeLevel(upgrade: UpgradeType): number {
    switch (upgrade) {
      case 'health': return this.healthLevel;
      case 'attack': return this.attackLevel;
      case 'radius': return this.radiusLevel;
      case 'spawnRate': return this.spawnRateLevel;
      case 'speed': return this.speedLevel;
      case 'maxParticles': return this.maxParticlesLevel;
    }
  }

  getUpgradeCost(upgrade: UpgradeType): number {
    return getUpgradeCost(upgrade, this.getUpgradeLevel(upgrade));
  }

  canAfford(upgrade: UpgradeType): boolean {
    return this.gold >= this.getUpgradeCost(upgrade);
  }

  buyUpgrade(upgrade: UpgradeType): boolean {
    if (!this.canAfford(upgrade)) return false;
    const cost = this.getUpgradeCost(upgrade);
    this.gold -= cost;
    switch (upgrade) {
      case 'health': this.healthLevel++; break;
      case 'attack': this.attackLevel++; break;
      case 'radius': this.radiusLevel++; break;
      case 'spawnRate': this.spawnRateLevel++; break;
      case 'speed': this.speedLevel++; break;
      case 'maxParticles': this.maxParticlesLevel++; break;
    }
    return true;
  }

  canUseNuke(gameTimeMs: number): boolean {
    if (this.lastNukeTimeMs < 0) {
      return gameTimeMs >= CONFIG.NUCLEAR_FIRST_AVAILABLE_MS;
    }
    return gameTimeMs >= this.lastNukeTimeMs + CONFIG.NUCLEAR_COOLDOWN_MS;
  }

  useNuke(gameTimeMs: number): void {
    this.lastNukeTimeMs = gameTimeMs;
  }

  getNukeCooldownRemainingMs(gameTimeMs: number): number {
    if (this.canUseNuke(gameTimeMs)) return 0;
    if (this.lastNukeTimeMs < 0) {
      return Math.max(0, CONFIG.NUCLEAR_FIRST_AVAILABLE_MS - gameTimeMs);
    }
    return Math.max(0, this.lastNukeTimeMs + CONFIG.NUCLEAR_COOLDOWN_MS - gameTimeMs);
  }

  takeDamage(amount: number): void {
    this.baseHP = Math.max(0, this.baseHP - amount);
  }

  get isAlive(): boolean {
    return this.baseHP > 0;
  }
}
