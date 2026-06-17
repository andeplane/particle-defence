import { CONFIG, getUpgradeCost, getTowerConstructionCost, getNukeResearchCost, getDebugEverythingCheap, type UpgradeType, type TowerType } from './config';
import { ResearchRegistry } from './research/ResearchRegistry';

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
  /** Small defense bonus applied globally (outside owned cells) based on defense upgrade level */
  readonly globalDefense: number;
  /** Gold interest rate (0-0.05) from interest upgrade, applied every INTEREST_INTERVAL_MS */
  readonly goldInterestRate: number;
  readonly isAlive: boolean;
  getUpgradeLevel(upgrade: UpgradeType): number;
  getUpgradeCost(upgrade: UpgradeType): number;
  canAfford(upgrade: UpgradeType): boolean;
  isUpgradeAtMax(upgrade: UpgradeType): boolean;
  canUseNuke(gameTimeMs: number): boolean;
  useNuke(gameTimeMs: number): void;
  getNukeCooldownRemainingMs(gameTimeMs: number): number;
  takeDamage(amount: number): void;

  // Generic research API
  getLevel(id: string): number;
  hasUnlocked(nodeId: string): boolean;
  canPurchaseUnlock(nodeId: string): boolean;
  purchaseUnlock(nodeId: string): boolean;
  getUnlockCost(nodeId: string): number;
  getPathLevel(pathId: string): number;
  canPurchasePath(pathId: string): boolean;
  purchasePath(pathId: string): boolean;
  getPathCost(pathId: string): number;

  // Legacy wrappers — delegate to generic API
  hasResearchedNuke(): boolean;
  canResearchNuke(): boolean;
  researchNuke(): boolean;
  getNukeResearchCost(): number;
  hasResearched(towerType: TowerType): boolean;
  canResearchTower(towerType: TowerType): boolean;
  researchTower(towerType: TowerType): boolean;
  getResearchCost(towerType: TowerType): number;
  getConstructionCost(towerType: TowerType): number;
  canAffordConstruction(towerType: TowerType): boolean;
  payForConstruction(towerType: TowerType): boolean;

  // Timer-based research (used by GameEngine.buyResearch — deducts gold and starts timer)
  startTowerResearch(towerType: TowerType, gameTimeMs: number, durationMs: number): boolean;
  startNukeResearch(gameTimeMs: number, durationMs: number): boolean;
  /** Start a timer-based multi-level path research. Deducts cost for next level and starts timer. */
  startPathResearch(pathId: string, gameTimeMs: number, durationMs: number): boolean;
  /** Start a timer-based one-time unlock research for any arbitrary nodeId. */
  startUnlockResearch(nodeId: string, gameTimeMs: number, durationMs: number): boolean;
  isResearching(nodeId: string): boolean;
  getResearchProgress(nodeId: string, gameTimeMs: number): number;
  getResearchRemainingMs(nodeId: string, gameTimeMs: number): number;
  /** Completes any timers that have elapsed. Returns the nodeIds that finished. */
  tickResearch(gameTimeMs: number): string[];

  // Timer-based particle upgrades (deducts gold and starts timer; applies stat on completion)
  startUpgrade(type: UpgradeType, gameTimeMs: number, durationMs: number): boolean;
  isUpgradePending(type: UpgradeType): boolean;
  getUpgradeProgress(type: UpgradeType, gameTimeMs: number): number;
  getUpgradeRemainingMs(type: UpgradeType, gameTimeMs: number): number;
  /** Completes any elapsed upgrade timers. Returns the completed upgrade types. */
  tickUpgrades(gameTimeMs: number): UpgradeType[];
}

export type PlayerConfig = {
  baseHP: number;
  startingGold: number;
  particleBaseHealth: number;
  particleBaseAttack: number;
  healthPerLevel: number;
  attackPerLevel: number;
  particleBaseRadius: number;
  particleBaseSpeed: number;
  spawnRateBase: number;
  spawnRatePerLevel: number;
  speedPerLevel: number;
  maxParticlesPerPlayer: number;
  maxParticlesPerLevel: number;
  nuclearFirstAvailableMs: number;
  nuclearCooldownMs: number;
};

export const defaultPlayerConfig: PlayerConfig = {
  baseHP: CONFIG.BASE_HP,
  startingGold: CONFIG.STARTING_GOLD,
  particleBaseHealth: CONFIG.PARTICLE_BASE_HEALTH,
  particleBaseAttack: CONFIG.PARTICLE_BASE_ATTACK,
  healthPerLevel: CONFIG.HEALTH_PER_LEVEL,
  attackPerLevel: CONFIG.ATTACK_PER_LEVEL,
  particleBaseRadius: CONFIG.PARTICLE_BASE_RADIUS,
  particleBaseSpeed: CONFIG.PARTICLE_SPEED,
  spawnRateBase: CONFIG.SPAWN_RATE_BASE,
  spawnRatePerLevel: CONFIG.SPAWN_RATE_PER_LEVEL,
  speedPerLevel: CONFIG.SPEED_PER_LEVEL,
  maxParticlesPerPlayer: CONFIG.MAX_PARTICLES_PER_PLAYER,
  maxParticlesPerLevel: CONFIG.MAX_PARTICLES_PER_LEVEL,
  nuclearFirstAvailableMs: CONFIG.NUCLEAR_FIRST_AVAILABLE_MS,
  nuclearCooldownMs: CONFIG.NUCLEAR_COOLDOWN_MS,
};

export function computeMaxLevels(_config: PlayerConfig): Record<UpgradeType, number> {
  return {
    health: Infinity,
    attack: Infinity,
    radius: Infinity,
    speed: Infinity,
    maxParticles: Infinity,
    spawnRate: Infinity,
    defense: Math.round(
      (CONFIG.OWNERSHIP_DEFENSE_MAX - CONFIG.OWNERSHIP_DEFENSE_BASE) / CONFIG.OWNERSHIP_DEFENSE_PER_LEVEL + 1e-9
    ),
    interestRate: Math.round(CONFIG.MAX_INTEREST_RATE / CONFIG.INTEREST_RATE_PER_LEVEL),
  };
}

export class Player implements IPlayer {
  readonly id: 0 | 1;
  baseHP: number;
  gold: number;
  kills: number;

  private readonly config: PlayerConfig;
  private readonly maxLevels: Record<UpgradeType, number>;
  private readonly upgradeLevels: Record<UpgradeType, number> = {
    health: 0, attack: 0, radius: 0, spawnRate: 0, speed: 0, maxParticles: 0, defense: 0, interestRate: 0,
  };

  /** Time (ms) when nuke was last used; -1 if never used */
  lastNukeTimeMs: number = -1;

  /** Tracks purchased unlocks and upgrade path levels. Unlock IDs map to 1; path IDs map to level count. */
  private readonly _purchased: Map<string, number> = new Map();

  /** In-progress research timers keyed by nodeId. */
  private readonly _researchTimers: Map<string, { startedAtMs: number; durationMs: number }> = new Map();

  /** In-progress particle upgrade timers keyed by UpgradeType. */
  private readonly _pendingUpgrades: Map<UpgradeType, { startedAtMs: number; durationMs: number }> = new Map();

  constructor(id: 0 | 1, config: PlayerConfig = defaultPlayerConfig) {
    this.id = id;
    this.config = config;
    this.maxLevels = computeMaxLevels(config);
    this.baseHP = config.baseHP;
    this.gold = config.startingGold;
    this.kills = 0;
  }

  get particleHealth(): number {
    return this.config.particleBaseHealth + this.upgradeLevels.health * this.config.healthPerLevel;
  }

  get particleAttack(): number {
    return this.config.particleBaseAttack + this.upgradeLevels.attack * this.config.attackPerLevel;
  }

  get particleRadius(): number {
    return this.config.particleBaseRadius + this.upgradeLevels.radius;
  }

  get spawnInterval(): number {
    return 1000 / (this.config.spawnRateBase + this.upgradeLevels.spawnRate * this.config.spawnRatePerLevel);
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

  get globalDefense(): number {
    return Math.min(CONFIG.GLOBAL_DEFENSE_MAX, this.upgradeLevels.defense * CONFIG.GLOBAL_DEFENSE_PER_LEVEL);
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
    if (this._pendingUpgrades.has(upgrade)) return false;
    return this.gold >= this.getUpgradeCost(upgrade);
  }

  isUpgradeAtMax(upgrade: UpgradeType): boolean {
    return this.upgradeLevels[upgrade] >= this.maxLevels[upgrade];
  }

  canUseNuke(gameTimeMs: number): boolean {
    if (!this.hasResearchedNuke()) return false;
    if (this.lastNukeTimeMs < 0) {
      return gameTimeMs >= this.config.nuclearFirstAvailableMs;
    }
    return gameTimeMs >= this.lastNukeTimeMs + this.config.nuclearCooldownMs;
  }

  useNuke(gameTimeMs: number): void {
    this.lastNukeTimeMs = gameTimeMs;
  }

  getNukeCooldownRemainingMs(gameTimeMs: number): number {
    if (!this.hasResearchedNuke()) return 0;
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

  // ── Generic research API ───────────────────────────────────────────

  getLevel(id: string): number {
    return this._purchased.get(id) ?? 0;
  }

  hasUnlocked(nodeId: string): boolean {
    return this.getLevel(nodeId) >= 1;
  }

  getUnlockCost(nodeId: string): number {
    if (getDebugEverythingCheap()) return 1;
    return ResearchRegistry.findUnlock(nodeId)?.cost ?? 0;
  }

  canPurchaseUnlock(nodeId: string): boolean {
    if (this.hasUnlocked(nodeId)) return false;
    if (ResearchRegistry.findUnlock(nodeId) === undefined) return false;
    if (!ResearchRegistry.prerequisitesMet(nodeId, this._purchased)) return false;
    return this.gold >= this.getUnlockCost(nodeId);
  }

  purchaseUnlock(nodeId: string): boolean {
    if (!this.canPurchaseUnlock(nodeId)) return false;
    this.gold -= this.getUnlockCost(nodeId);
    this._purchased.set(nodeId, 1);
    return true;
  }

  getPathLevel(pathId: string): number {
    return this.getLevel(pathId);
  }

  getPathCost(pathId: string): number {
    if (getDebugEverythingCheap()) return 1;
    return ResearchRegistry.getNextLevelCost(pathId, this.getPathLevel(pathId)) ?? Infinity;
  }

  canPurchasePath(pathId: string): boolean {
    if (!ResearchRegistry.prerequisitesMet(pathId, this._purchased)) return false;
    const cost = ResearchRegistry.getNextLevelCost(pathId, this.getPathLevel(pathId));
    if (cost === undefined) return false;
    return this.gold >= (getDebugEverythingCheap() ? 1 : cost);
  }

  purchasePath(pathId: string): boolean {
    if (!this.canPurchasePath(pathId)) return false;
    const currentLevel = this.getPathLevel(pathId);
    this.gold -= this.getPathCost(pathId);
    this._purchased.set(pathId, currentLevel + 1);
    return true;
  }

  // ── Legacy wrappers ────────────────────────────────────────────────

  hasResearchedNuke(): boolean {
    return this.hasUnlocked('unlock_nuke');
  }

  canResearchNuke(): boolean {
    if (this.hasResearchedNuke()) return false;
    if (this.isResearching('unlock_nuke')) return false;
    return this.gold >= this.getNukeResearchCost();
  }

  researchNuke(): boolean {
    if (!this.canResearchNuke()) return false;
    this.gold -= this.getNukeResearchCost();
    this._purchased.set('unlock_nuke', 1);
    return true;
  }

  startNukeResearch(gameTimeMs: number, durationMs: number): boolean {
    if (this.hasResearchedNuke()) return false;
    if (this.isResearching('unlock_nuke')) return false;
    if (this.gold < this.getNukeResearchCost()) return false;
    this.gold -= this.getNukeResearchCost();
    this._researchTimers.set('unlock_nuke', { startedAtMs: gameTimeMs, durationMs });
    return true;
  }

  getNukeResearchCost(): number {
    return getNukeResearchCost();
  }

  hasResearched(towerType: TowerType): boolean {
    return this.hasUnlocked(`unlock_${towerType}`);
  }

  canResearchTower(towerType: TowerType): boolean {
    if (this.isResearching(`unlock_${towerType}`)) return false;
    return this.canPurchaseUnlock(`unlock_${towerType}`);
  }

  researchTower(towerType: TowerType): boolean {
    return this.purchaseUnlock(`unlock_${towerType}`);
  }

  getResearchCost(towerType: TowerType): number {
    return this.getUnlockCost(`unlock_${towerType}`);
  }

  getConstructionCost(towerType: TowerType): number {
    return getTowerConstructionCost(towerType);
  }

  canAffordConstruction(towerType: TowerType): boolean {
    return this.gold >= this.getConstructionCost(towerType);
  }

  payForConstruction(towerType: TowerType): boolean {
    if (!this.canAffordConstruction(towerType)) return false;
    if (!this.hasResearched(towerType)) return false;
    this.gold -= this.getConstructionCost(towerType);
    return true;
  }

  // ── Timer-based research ───────────────────────────────────────────

  startTowerResearch(towerType: TowerType, gameTimeMs: number, durationMs: number): boolean {
    const nodeId = `unlock_${towerType}`;
    if (this.hasUnlocked(nodeId)) return false;
    if (this._researchTimers.has(nodeId)) return false;
    if (this.gold < this.getUnlockCost(nodeId)) return false;
    this.gold -= this.getUnlockCost(nodeId);
    this._researchTimers.set(nodeId, { startedAtMs: gameTimeMs, durationMs });
    return true;
  }

  isResearching(nodeId: string): boolean {
    return this._researchTimers.has(nodeId);
  }

  getResearchProgress(nodeId: string, gameTimeMs: number): number {
    const timer = this._researchTimers.get(nodeId);
    if (!timer) return this.hasUnlocked(nodeId) ? 1 : -1;
    return Math.min(1, (gameTimeMs - timer.startedAtMs) / timer.durationMs);
  }

  getResearchRemainingMs(nodeId: string, gameTimeMs: number): number {
    const timer = this._researchTimers.get(nodeId);
    if (!timer) return 0;
    return Math.max(0, timer.startedAtMs + timer.durationMs - gameTimeMs);
  }

  startPathResearch(pathId: string, gameTimeMs: number, durationMs: number): boolean {
    if (this._researchTimers.has(pathId)) return false;
    if (!this.canPurchasePath(pathId)) return false;
    const cost = this.getPathCost(pathId);
    this.gold -= (getDebugEverythingCheap() ? 1 : cost);
    this._researchTimers.set(pathId, { startedAtMs: gameTimeMs, durationMs });
    return true;
  }

  startUnlockResearch(nodeId: string, gameTimeMs: number, durationMs: number): boolean {
    if (this.hasUnlocked(nodeId)) return false;
    if (this._researchTimers.has(nodeId)) return false;
    if (!this.canPurchaseUnlock(nodeId)) return false;
    this.gold -= this.getUnlockCost(nodeId);
    this._researchTimers.set(nodeId, { startedAtMs: gameTimeMs, durationMs });
    return true;
  }

  tickResearch(gameTimeMs: number): string[] {
    const completed: string[] = [];
    for (const [nodeId, timer] of this._researchTimers) {
      if (gameTimeMs - timer.startedAtMs >= timer.durationMs) {
        if (ResearchRegistry.findPath(nodeId)) {
          const currentLevel = this._purchased.get(nodeId) ?? 0;
          this._purchased.set(nodeId, currentLevel + 1);
        } else {
          this._purchased.set(nodeId, 1);
        }
        this._researchTimers.delete(nodeId);
        completed.push(nodeId);
      }
    }
    return completed;
  }

  // ── Timer-based particle upgrades ─────────────────────────────────

  startUpgrade(type: UpgradeType, gameTimeMs: number, durationMs: number): boolean {
    if (this._pendingUpgrades.has(type)) return false;
    if (this.isUpgradeAtMax(type)) return false;
    const cost = this.getUpgradeCost(type);
    if (this.gold < cost) return false;
    this.gold -= cost;
    this._pendingUpgrades.set(type, { startedAtMs: gameTimeMs, durationMs });
    return true;
  }

  isUpgradePending(type: UpgradeType): boolean {
    return this._pendingUpgrades.has(type);
  }

  getUpgradeProgress(type: UpgradeType, gameTimeMs: number): number {
    const timer = this._pendingUpgrades.get(type);
    if (!timer) return -1;
    return Math.min(1, (gameTimeMs - timer.startedAtMs) / timer.durationMs);
  }

  getUpgradeRemainingMs(type: UpgradeType, gameTimeMs: number): number {
    const timer = this._pendingUpgrades.get(type);
    if (!timer) return 0;
    return Math.max(0, timer.startedAtMs + timer.durationMs - gameTimeMs);
  }

  tickUpgrades(gameTimeMs: number): UpgradeType[] {
    const completed: UpgradeType[] = [];
    for (const [type, timer] of this._pendingUpgrades) {
      if (gameTimeMs - timer.startedAtMs >= timer.durationMs) {
        this.upgradeLevels[type]++;
        this._pendingUpgrades.delete(type);
        completed.push(type);
      }
    }
    return completed;
  }
}

export function createPlayer(id: 0 | 1, configOverrides?: Partial<PlayerConfig>): Player {
  const config = configOverrides ? { ...defaultPlayerConfig, ...configOverrides } : defaultPlayerConfig;
  return new Player(id, config);
}
