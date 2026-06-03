import { CONFIG, TOWER_TYPE, getTowerUpgradeCost, getDebugEverythingCheap } from '../config';
import type { GameObjectMeta, ResearchLevel } from '../research/types';
import { AbstractParticle, type IParticle, type ParticleDependencies } from './AbstractParticle';
import type { GameContext } from './GameContext';

type WeaknessEffect = {
  drainDps: number;
  attackReduction: number;
  hp: number;
};

function buildWeaknessLevels(count = 20): ResearchLevel<WeaknessEffect>[] {
  return Array.from({ length: count }, (_, i) => ({
    cost: getTowerUpgradeCost(TOWER_TYPE.WEAKNESS, i),
    effect: {
      drainDps: CONFIG.TOWER_WEAKNESS_BASE_DRAIN_DPS + (i + 1) * CONFIG.TOWER_WEAKNESS_FACTOR_PER_LEVEL,
      attackReduction: Math.min(0.9, CONFIG.TOWER_WEAKNESS_BASE_ATTACK_REDUCTION + (i + 1) * CONFIG.TOWER_WEAKNESS_FACTOR_PER_LEVEL),
      hp: CONFIG.TOWER_WEAKNESS_BASE_HP + (i + 1) * CONFIG.TOWER_WEAKNESS_HP_PER_LEVEL,
    },
  }));
}

export function getWeaknessStatsAtLevel(level: number): WeaknessEffect {
  if (level === 0) {
    return {
      drainDps: CONFIG.TOWER_WEAKNESS_BASE_DRAIN_DPS,
      attackReduction: CONFIG.TOWER_WEAKNESS_BASE_ATTACK_REDUCTION,
      hp: CONFIG.TOWER_WEAKNESS_BASE_HP,
    };
  }
  return WeaknessTowerParticle.meta.upgradePaths[0].levels[level - 1].effect;
}

export class WeaknessTowerParticle extends AbstractParticle {
  static readonly TYPE_NAME = 'weaknessTower' as const;

  static readonly meta: GameObjectMeta<WeaknessEffect> = {
    typeName: WeaknessTowerParticle.TYPE_NAME,
    category: 'tower',
    unlock: {
      id: 'unlock_weakness',
      name: 'Weakness Tower',
      description: 'Unlock weakness towers that drain enemy HP and reduce their attack',
      cost: CONFIG.TOWER_RESEARCH_COSTS.weakness,
      durationMs: CONFIG.TOWER_RESEARCH_DURATION_MS.weakness,
    },
    upgradePaths: [{
      id: 'weakness_upgrades',
      name: 'Weakness Tower Upgrade',
      description: 'Improve drain rate and attack reduction',
      requires: ['unlock_weakness'],
      levels: buildWeaknessLevels(),
    }],
  };

  readonly typeName = WeaknessTowerParticle.TYPE_NAME;
  readonly towerType = TOWER_TYPE.WEAKNESS;

  pendingUpgrade: { startedAtMs: number; durationMs: number } | null = null;
  level: number = 0;
  range: number = CONFIG.TOWER_WEAKNESS_BASE_RANGE;
  drainDps: number = CONFIG.TOWER_WEAKNESS_BASE_DRAIN_DPS;
  attackReduction: number = CONFIG.TOWER_WEAKNESS_BASE_ATTACK_REDUCTION;

  private stunCooldownMs: number = 0;

  constructor(
    x: number, y: number, owner: 0 | 1,
    deps?: ParticleDependencies,
  ) {
    super(x, y, owner, CONFIG.TOWER_WEAKNESS_BASE_HP, 0, CONFIG.TOWER_VISUAL_RADIUS, 0, deps);
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
    return WeaknessTowerParticle.meta.upgradePaths[0].levels[this.level]?.cost ?? Infinity;
  }

  upgrade(): void {
    const levelData = WeaknessTowerParticle.meta.upgradePaths[0].levels[this.level];
    if (!levelData) return;
    this.level++;
    const { drainDps, attackReduction, hp } = levelData.effect;
    this.drainDps = drainDps;
    this.attackReduction = attackReduction;
    const hpGain = hp - this.maxHealth;
    this.maxHealth = hp;
    this.health += hpGain;
  }

  override onCollide(other: IParticle, _context: GameContext): void {
    this.takeDamage(other.attack * (1 - CONFIG.TOWER_DAMAGE_REDUCTION));
  }

  override onUpdate(dt: number, context: GameContext): void {
    const player = context.players[this.owner];
    const regenLevel = player.getPathLevel('tower_regen');
    if (regenLevel > 0 && this.health < this.maxHealth) {
      const regenRate = regenLevel * CONFIG.TOWER_REGEN_HP_PER_SEC_PER_LEVEL;
      this.health = Math.min(this.maxHealth, this.health + regenRate * dt / 1000);
    }

    const rangeBonus = player.getPathLevel('tower_range') * CONFIG.TOWER_RANGE_BONUS_PER_LEVEL;
    const effectiveRange = this.range + rangeBonus;
    const rangeSq = effectiveRange * effectiveRange;

    const slowLevel = player.getPathLevel('weakness_slow');
    const stunLevel = player.getPathLevel('weakness_stun');

    for (const p of context.particles) {
      if (!p.alive || p.owner === this.owner) continue;
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      if (dx * dx + dy * dy >= rangeSq) continue;

      // HP drain
      p.takeDamage(this.drainDps * dt / 1000);

      // Attack reduction
      p.attackFactor = Math.min(p.attackFactor, 1 - this.attackReduction);

      // Slow (requires weakness_slow research)
      if (slowLevel > 0) {
        const slowFactor = Math.min(0.9, slowLevel * CONFIG.WEAKNESS_SLOW_FACTOR_PER_LEVEL);
        p.towerSlowFactor = Math.min(p.towerSlowFactor, 1 - slowFactor);
      }
    }

    // Stun shot (requires weakness_stun research)
    if (stunLevel > 0) {
      this.stunCooldownMs -= dt;
      if (this.stunCooldownMs <= 0) {
        const intervalMs = Math.max(
          2_000,
          CONFIG.WEAKNESS_STUN_BASE_INTERVAL_MS - stunLevel * CONFIG.WEAKNESS_STUN_INTERVAL_REDUCTION_PER_LEVEL,
        );
        this.stunCooldownMs = intervalMs;

        let nearest: IParticle | null = null;
        let nearestDist = rangeSq;
        for (const p of context.particles) {
          if (!p.alive || p.owner === this.owner) continue;
          const dx = p.x - this.x;
          const dy = p.y - this.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < nearestDist) {
            nearestDist = distSq;
            nearest = p;
          }
        }
        if (nearest) {
          nearest.stunnedUntilMs = context.gameTimeMs + CONFIG.WEAKNESS_STUN_EFFECT_DURATION_MS;
        }
      }
    }
  }
}
