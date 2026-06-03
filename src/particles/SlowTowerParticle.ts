import { CONFIG, getTowerUpgradeCost, getDebugEverythingCheap } from '../config';
import type { GameObjectMeta, ResearchLevel } from '../research/types';
import { AbstractParticle, type IParticle, type ParticleDependencies } from './AbstractParticle';
import type { GameContext } from './GameContext';

type SlowEffect = {
  slowFactor: number;
  range: number;
  hp: number;
};

function buildSlowLevels(count = 20): ResearchLevel<SlowEffect>[] {
  return Array.from({ length: count }, (_, i) => ({
    cost: getTowerUpgradeCost('slow', i),
    effect: {
      slowFactor: Math.min(0.9, CONFIG.TOWER_SLOW_BASE_FACTOR + (i + 1) * CONFIG.TOWER_SLOW_FACTOR_PER_LEVEL),
      range: CONFIG.TOWER_SLOW_BASE_RANGE + (i + 1) * CONFIG.TOWER_SLOW_RANGE_PER_LEVEL,
      hp: CONFIG.TOWER_SLOW_BASE_HP + (i + 1) * CONFIG.TOWER_SLOW_HP_PER_LEVEL,
    },
  }));
}

/** Stats at a given level (0 = base, 1+ = after that many upgrades). */
export function getSlowStatsAtLevel(level: number): SlowEffect {
  if (level === 0) {
    return {
      slowFactor: CONFIG.TOWER_SLOW_BASE_FACTOR,
      range: CONFIG.TOWER_SLOW_BASE_RANGE,
      hp: CONFIG.TOWER_SLOW_BASE_HP,
    };
  }
  return SlowTowerParticle.meta.upgradePaths[0].levels[level - 1].effect;
}

export class SlowTowerParticle extends AbstractParticle {
  static readonly meta: GameObjectMeta<SlowEffect> = {
    typeName: 'slowTower',
    category: 'tower',
    unlock: {
      id: 'unlock_slow',
      name: 'Slow Tower',
      description: 'Unlock slow towers that reduce nearby enemy speed',
      cost: CONFIG.TOWER_RESEARCH_COSTS.slow,
      durationMs: CONFIG.TOWER_RESEARCH_DURATION_MS.slow,
    },
    upgradePaths: [{
      id: 'slow_upgrades',
      name: 'Slow Tower Upgrade',
      description: 'Improve slow factor and range',
      requires: ['unlock_slow'],
      levels: buildSlowLevels(),
    }],
  };

  readonly typeName = 'slowTower';
  readonly towerType = 'slow' as const;

  pendingUpgrade: { startedAtMs: number; durationMs: number } | null = null;
  level: number = 0;
  range: number = CONFIG.TOWER_SLOW_BASE_RANGE;
  slowFactor: number = CONFIG.TOWER_SLOW_BASE_FACTOR;

  constructor(
    x: number, y: number, owner: 0 | 1,
    deps?: ParticleDependencies,
  ) {
    super(x, y, owner, CONFIG.TOWER_SLOW_BASE_HP, 0, CONFIG.TOWER_VISUAL_RADIUS, 0, deps);
  }

  override get canMove(): boolean {
    return false;
  }

  override isStuck(): boolean {
    return false;
  }

  override getBaseDamage(): number {
    return 0;
  }

  getUpgradeCost(): number {
    if (getDebugEverythingCheap()) return 1;
    return SlowTowerParticle.meta.upgradePaths[0].levels[this.level]?.cost ?? Infinity;
  }

  upgrade(): void {
    const levelData = SlowTowerParticle.meta.upgradePaths[0].levels[this.level];
    if (!levelData) return;
    this.level++;
    const { slowFactor, range, hp } = levelData.effect;
    this.slowFactor = slowFactor;
    this.range = range;
    const hpGain = hp - this.maxHealth;
    this.maxHealth = hp;
    this.health += hpGain;
  }

  override onCollide(other: IParticle, _context: GameContext): void {
    this.takeDamage(other.attack * (1 - CONFIG.TOWER_DAMAGE_REDUCTION));
  }

  override onUpdate(_dt: number, context: GameContext): void {
    const rangeSq = this.range * this.range;
    for (const p of context.particles) {
      if (!p.alive || p.owner === this.owner) continue;
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      if (dx * dx + dy * dy < rangeSq) {
        p.towerSlowFactor = Math.min(p.towerSlowFactor, 1 - this.slowFactor);
      }
    }
  }
}
