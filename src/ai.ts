import { CONFIG, type UpgradeType } from './config';
import type { Player } from './player';
import type { GameScene } from './scenes/GameScene';

const UPGRADE_TYPES: UpgradeType[] = ['health', 'attack', 'radius', 'spawnRate', 'speed'];

export class AIController {
  private readonly playerId: 0 | 1 = 1;
  private readonly decisionIntervalMs = 200;
  private timeSinceLastDecision = 0;

  update(delta: number, gameScene: GameScene): void {
    if (gameScene.gameOver) return;

    this.timeSinceLastDecision += delta;
    if (this.timeSinceLastDecision < this.decisionIntervalMs) return;
    this.timeSinceLastDecision = 0;

    this.tryNuke(gameScene);
    this.tryUpgrade(gameScene);
  }

  private tryNuke(gameScene: GameScene): void {
    const ai = gameScene.players[this.playerId];
    const human = gameScene.players[0];
    if (!ai.canUseNuke(gameScene.gameTimeMs)) return;

    const aiParticles = gameScene.particles.filter(p => p.alive && p.owner === this.playerId).length;
    const humanParticles = gameScene.particles.filter(p => p.alive && p.owner === 0).length;
    const aiHpPct = ai.baseHP / CONFIG.BASE_HP;
    const humanHpPct = human.baseHP / CONFIG.BASE_HP;

    const losingBadly = aiHpPct < 0.6 && humanHpPct > 0.8;
    const enemyFlood = humanParticles >= 2 * Math.max(1, aiParticles);
    const desperation = aiHpPct < 0.3;
    const valueNuke = humanParticles >= 400;

    if (losingBadly || enemyFlood || desperation || valueNuke) {
      gameScene.launchNuke(this.playerId);
    }
  }

  private tryUpgrade(gameScene: GameScene): void {
    const ai = gameScene.players[this.playerId];
    const human = gameScene.players[0];

    let bestType: UpgradeType | null = null;
    let bestScore = -1;

    for (const type of UPGRADE_TYPES) {
      if (!ai.canAfford(type)) continue;

      const score = this.scoreUpgrade(type, ai, human, gameScene);
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
    ai: Player,
    human: Player,
    gameScene: GameScene
  ): number {
    const level = ai.getUpgradeLevel(type);
    const cost = ai.getUpgradeCost(type);
    const gameTimeSec = gameScene.gameTimeMs / 1000;

    let score = 100;

    // Cost efficiency: prefer cheaper upgrades when gold is tight
    const costPenalty = cost / 50;
    score -= costPenalty;

    // Diminishing returns: prefer underleveled stats
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
    }

    return Math.max(0, score);
  }
}
