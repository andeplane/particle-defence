import { CONFIG, type UpgradeType } from './config';
import type { IPlayer } from './player';
import type { IParticle } from './particles';

export interface AIGameState {
  readonly players: readonly [IPlayer, IPlayer];
  readonly particles: readonly IParticle[];
  readonly gameTimeMs: number;
  readonly gameOver: boolean;
  launchNuke(playerId: 0 | 1): boolean;
}

export type AIConfig = {
  baseHP: number;
};

const defaultAIConfig: AIConfig = {
  baseHP: CONFIG.BASE_HP,
};

const UPGRADE_TYPES: UpgradeType[] = ['health', 'attack', 'radius', 'spawnRate', 'speed', 'defense', 'maxParticles', 'interestRate'];

export class AIController {
  private readonly playerId: 0 | 1;
  private readonly config: AIConfig;
  private readonly decisionIntervalMs = 200;
  private timeSinceLastDecision = 0;

  constructor(playerId: 0 | 1 = 1, config: AIConfig = defaultAIConfig) {
    this.playerId = playerId;
    this.config = config;
  }

  update(delta: number, state: AIGameState): void {
    if (state.gameOver) return;

    this.timeSinceLastDecision += delta;
    if (this.timeSinceLastDecision < this.decisionIntervalMs) return;
    this.timeSinceLastDecision = 0;

    this.tryNuke(state);
    this.tryUpgrade(state);
  }

  private tryNuke(state: AIGameState): void {
    const ai = state.players[this.playerId];
    const human = state.players[0];
    if (!ai.canUseNuke(state.gameTimeMs)) return;

    const aiParticles = state.particles.filter(p => p.alive && p.owner === this.playerId).length;
    const humanParticles = state.particles.filter(p => p.alive && p.owner === 0).length;
    const aiHpPct = ai.baseHP / this.config.baseHP;
    const humanHpPct = human.baseHP / this.config.baseHP;

    const losingBadly = aiHpPct < 0.6 && humanHpPct > 0.8;
    const enemyFlood = humanParticles >= 2 * Math.max(1, aiParticles);
    const desperation = aiHpPct < 0.3;
    const valueNuke = humanParticles >= 400;

    if (losingBadly || enemyFlood || desperation || valueNuke) {
      state.launchNuke(this.playerId);
    }
  }

  private tryUpgrade(state: AIGameState): void {
    const ai = state.players[this.playerId];
    const human = state.players[0];

    let bestType: UpgradeType | null = null;
    let bestScore = -1;

    for (const type of UPGRADE_TYPES) {
      if (!ai.canAfford(type)) continue;

      const score = this.scoreUpgrade(type, ai, human, state);
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }

    if (bestType !== null) {
      ai.buyUpgrade(bestType);
    }
  }

  private scoreUpgrade(
    type: UpgradeType,
    ai: IPlayer,
    human: IPlayer,
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
        const spawnInterval = ai.spawnInterval;
        const nearMin = spawnInterval <= 55;
        if (nearMin) {
          score *= 0.3;
        } else {
          score *= 2.5;
        }
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
        const humanAttackLevel = human.getUpgradeLevel('attack');
        if (humanAttackLevel > aiHealthLevel) {
          score *= 2.0;
        } else {
          score *= 1.2;
        }
        break;
      }
      case 'speed': {
        score *= 1.0;
        if (gameTimeSec > 90) score *= 1.3;
        break;
      }
      case 'radius': {
        score *= 0.6;
        break;
      }
      case 'defense': {
        const humanAttackLevel = human.getUpgradeLevel('attack');
        if (humanAttackLevel > ai.getUpgradeLevel('defense')) {
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
