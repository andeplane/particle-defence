import { CONFIG, TOWER_TYPE, TOWER_TYPES, type UpgradeType, type TowerType } from './config';
import type { IPlayer } from './player';
import type { IParticle } from './particles';
import type { LaserTowerParticle } from './particles/LaserTowerParticle';
import type { WeaknessTowerParticle } from './particles/WeaknessTowerParticle';
import type { TowerSite } from './grid';

export interface AIGameState {
  readonly players: readonly [IPlayer, IPlayer];
  readonly particles: readonly IParticle[];
  readonly gameTimeMs: number;
  readonly gameOver: boolean;
  launchNuke(playerId: 0 | 1): boolean;
  buyNukeResearch(playerId: 0 | 1): boolean;
  buyResearch(playerId: 0 | 1, towerType: TowerType): boolean;
  buyPathResearch(playerId: 0 | 1, pathId: string): boolean;
  constructTower(playerId: 0 | 1, towerType: TowerType, siteId: number): boolean;
  upgradeTower(playerId: 0 | 1, towerIndex: number): boolean;
  getEligibleTowerSites(playerId: 0 | 1): readonly TowerSite[];
  readonly towers: readonly [ReadonlyArray<LaserTowerParticle | WeaknessTowerParticle>, ReadonlyArray<LaserTowerParticle | WeaknessTowerParticle>];
}

export interface AIProfile {
  readonly name: string;
  /** Multiplier applied to each upgrade type's score (default 1.0, 0 = never buy) */
  readonly upgradeWeights?: Partial<Record<UpgradeType, number>>;
  /** Hard-disabled upgrades (for ablation testing) */
  readonly disabledUpgrades?: ReadonlySet<UpgradeType>;
  /** Whether tower research/construction/upgrades are allowed (default true) */
  readonly towersEnabled?: boolean;
  /** Whether nuke is allowed (default true) */
  readonly nukeEnabled?: boolean;
  /** Tower investment priority: 'high' researches/builds earlier and more aggressively */
  readonly towerPriority?: 'normal' | 'high';
}

export type AIConfig = {
  baseHP: number;
  profile?: AIProfile;
};

const defaultAIConfig: AIConfig = {
  baseHP: CONFIG.BASE_HP,
};

const UPGRADE_TYPES: UpgradeType[] = ['health', 'attack', 'radius', 'spawnRate', 'speed', 'defense', 'maxParticles', 'interestRate'];

export class AIController {
  private readonly playerId: 0 | 1;
  private readonly config: AIConfig;
  private readonly profile: AIProfile;
  private readonly decisionIntervalMs = 200;
  private timeSinceLastDecision = 0;

  constructor(playerId: 0 | 1 = 1, config: AIConfig = defaultAIConfig) {
    this.playerId = playerId;
    this.config = config;
    this.profile = config.profile ?? { name: 'default' };
  }

  get profileName(): string {
    return this.profile.name;
  }

  update(delta: number, state: AIGameState): void {
    if (state.gameOver) return;

    this.timeSinceLastDecision += delta;
    while (this.timeSinceLastDecision >= this.decisionIntervalMs) {
      this.timeSinceLastDecision -= this.decisionIntervalMs;

      this.tryNukeResearch(state);
      this.tryNuke(state);
      this.tryTowerActions(state);
      this.tryTier2Research(state);
      this.tryUpgrade(state);
    }
  }

  private get opponentId(): 0 | 1 {
    return this.playerId === 0 ? 1 : 0;
  }

  private tryNukeResearch(state: AIGameState): void {
    if (this.profile.nukeEnabled === false) return;
    const ai = state.players[this.playerId];
    if (ai.hasResearchedNuke()) return;
    if (state.gameTimeMs < CONFIG.NUCLEAR_FIRST_AVAILABLE_MS * 0.8) return;
    if (ai.canResearchNuke()) {
      state.buyNukeResearch(this.playerId);
    }
  }

  private tryNuke(state: AIGameState): void {
    if (this.profile.nukeEnabled === false) return;
    const ai = state.players[this.playerId];
    const opponent = state.players[this.opponentId];
    if (!ai.canUseNuke(state.gameTimeMs)) return;

    const aiParticles = state.particles.filter(p => p.alive && p.owner === this.playerId).length;
    const opponentParticles = state.particles.filter(p => p.alive && p.owner === this.opponentId).length;
    const aiHpPct = ai.baseHP / this.config.baseHP;
    const opponentHpPct = opponent.baseHP / this.config.baseHP;

    const losingBadly = aiHpPct < 0.6 && opponentHpPct > 0.8;
    const enemyFlood = opponentParticles >= 2 * Math.max(1, aiParticles);
    const desperation = aiHpPct < 0.3;
    const valueNuke = opponentParticles >= 400;

    if (losingBadly || enemyFlood || desperation || valueNuke) {
      state.launchNuke(this.playerId);
    }
  }

  private tryTowerActions(state: AIGameState): void {
    if (this.profile.towersEnabled === false) return;
    const ai = state.players[this.playerId];
    const gameTimeSec = state.gameTimeMs / 1000;
    const highPriority = this.profile.towerPriority === 'high';
    const minResearchTime = highPriority ? 60 : 120;

    if (gameTimeSec >= minResearchTime) {
      for (const towerType of TOWER_TYPES) {
        if (!ai.hasResearched(towerType) && ai.canResearchTower(towerType)) {
          state.buyResearch(this.playerId, towerType);
          return;
        }
      }
    }

    const towers = state.towers[this.playerId];
    const eligibleSites = state.getEligibleTowerSites(this.playerId);
    if (towers.length < CONFIG.TOWER_MAX_PER_PLAYER) {
      if (eligibleSites.length === 0) return;
      // Keep a small gold buffer after construction (1.0x = exact cost, no extra reserve needed now costs are lower)
      const constructionReserve = highPriority ? 1.0 : 1.2;
      const preferredType: TowerType = towers.length % 2 === 0 ? TOWER_TYPE.LASER : TOWER_TYPE.WEAKNESS;
      const siteId = eligibleSites[0].id;
      if (ai.hasResearched(preferredType) && ai.canAffordConstruction(preferredType)) {
        const cost = ai.getConstructionCost(preferredType);
        if (ai.gold >= cost * constructionReserve) {
          state.constructTower(this.playerId, preferredType, siteId);
          return;
        }
      }
      for (const t of TOWER_TYPES) {
        if (ai.hasResearched(t) && ai.canAffordConstruction(t)) {
          const cost = ai.getConstructionCost(t);
          if (ai.gold >= cost * constructionReserve) {
            state.constructTower(this.playerId, t, siteId);
            return;
          }
        }
      }
    }

    if (towers.length > 0) {
      let lowestLevel = Infinity;
      let lowestIdx = 0;
      for (let i = 0; i < towers.length; i++) {
        if (towers[i].level < lowestLevel) {
          lowestLevel = towers[i].level;
          lowestIdx = i;
        }
      }
      state.upgradeTower(this.playerId, lowestIdx);
    }
  }

  private tryTier2Research(state: AIGameState): void {
    if (this.profile.towersEnabled === false) return;
    const ai = state.players[this.playerId];
    const towers = state.towers[this.playerId];
    if (towers.length === 0) return;

    const hasLaser = ai.hasResearched(TOWER_TYPE.LASER);
    const hasWeakness = ai.hasResearched(TOWER_TYPE.WEAKNESS);

    // Priority: universal paths first, then type-specific
    const candidates: string[] = [];
    if (hasLaser || hasWeakness) {
      candidates.push('tower_regen', 'tower_range');
    }
    if (hasLaser) candidates.push('laser_bounce', 'laser_overcharge');
    if (hasWeakness) candidates.push('weakness_slow', 'weakness_stun');

    for (const pathId of candidates) {
      if (!ai.isResearching(pathId) && ai.canPurchasePath(pathId)) {
        state.buyPathResearch(this.playerId, pathId);
        return;
      }
    }
  }

  private tryUpgrade(state: AIGameState): void {
    const ai = state.players[this.playerId];
    const opponent = state.players[this.opponentId];

    let bestType: UpgradeType | null = null;
    let bestScore = -1;

    for (const type of UPGRADE_TYPES) {
      if (this.profile.disabledUpgrades?.has(type)) continue;
      if (!ai.canAfford(type)) continue;
      if (ai.isUpgradeAtMax(type)) continue;

      let score = this.scoreUpgrade(type, ai, opponent, state);
      const weight = this.profile.upgradeWeights?.[type];
      if (weight !== undefined) score *= weight;
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }

    if (bestType !== null) {
      ai.startUpgrade(bestType, state.gameTimeMs, CONFIG.PARTICLE_UPGRADE_DURATION_MS);
    }
  }

  private scoreUpgrade(
    type: UpgradeType,
    ai: IPlayer,
    opponent: IPlayer,
    state: AIGameState
  ): number {
    const level = ai.getUpgradeLevel(type);
    const cost = ai.getUpgradeCost(type);
    const gameTimeSec = state.gameTimeMs / 1000;

    let score = 100;

    const costPenalty = cost / 50;
    score -= costPenalty;

    const levelPenalty = level * 15;
    score -= levelPenalty;

    switch (type) {
      case 'spawnRate': {
        score *= 2.5;
        if (gameTimeSec < 60) score *= 1.5;
        break;
      }
      case 'attack': {
        score *= 1.8;
        if (gameTimeSec > 30) score *= 1.2;
        break;
      }
      case 'health': {
        const aiHealthLevel = ai.getUpgradeLevel('health');
        const opponentAttackLevel = opponent.getUpgradeLevel('attack');
        if (opponentAttackLevel > aiHealthLevel) {
          score *= 2.0;
        } else {
          score *= 1.2;
        }
        break;
      }
      case 'speed': {
        score *= 1.4;
        if (gameTimeSec > 60) score *= 1.2;
        break;
      }
      case 'radius': {
        score *= 0.6;
        break;
      }
      case 'defense': {
        const opponentAttackLevel = opponent.getUpgradeLevel('attack');
        if (opponentAttackLevel > ai.getUpgradeLevel('defense')) {
          score *= 1.8;
        } else {
          score *= 1.2;
        }
        break;
      }
      case 'maxParticles': {
        const aiParticles = state.particles.filter(p => p.alive && p.owner === this.playerId).length;
        const nearCap = aiParticles >= ai.maxParticles * 0.8;
        score *= nearCap ? 1.8 : 0.7;
        break;
      }
      case 'interestRate': {
        const hasGoldToSave = ai.gold >= 30;
        const notAtCap = !ai.isUpgradeAtMax('interestRate');
        score *= hasGoldToSave && notAtCap ? 1.2 : 0.5;
        if (gameTimeSec > 120) score *= 1.3;
        break;
      }
    }

    return Math.max(0, score);
  }
}
