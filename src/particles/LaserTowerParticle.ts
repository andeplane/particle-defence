import { CONFIG, TOWER_TYPE, getTowerUpgradeCost, getDebugEverythingCheap } from '../config';
import type { GameObjectMeta, ResearchLevel } from '../research/types';
import { AbstractParticle, type IParticle, type ParticleDependencies } from './AbstractParticle';
import type { GameContext } from './GameContext';

type LaserEffect = {
  damage: number;
  attackSpeed: number;
  hp: number;
};

function buildLaserLevels(count = 20): ResearchLevel<LaserEffect>[] {
  return Array.from({ length: count }, (_, i) => ({
    cost: getTowerUpgradeCost(TOWER_TYPE.LASER, i),
    effect: {
      damage: CONFIG.TOWER_LASER_BASE_DAMAGE + (i + 1) * CONFIG.TOWER_LASER_DAMAGE_PER_LEVEL,
      attackSpeed: CONFIG.TOWER_LASER_BASE_ATTACK_SPEED + (i + 1) * CONFIG.TOWER_LASER_ATTACK_SPEED_PER_LEVEL,
      hp: CONFIG.TOWER_LASER_BASE_HP + (i + 1) * CONFIG.TOWER_LASER_HP_PER_LEVEL,
    },
  }));
}

/** Stats at a given level (0 = base, 1+ = after that many upgrades). Range not included — use effectiveRange(). */
export function getLaserStatsAtLevel(level: number): LaserEffect {
  if (level === 0) {
    return {
      damage: CONFIG.TOWER_LASER_BASE_DAMAGE,
      attackSpeed: CONFIG.TOWER_LASER_BASE_ATTACK_SPEED,
      hp: CONFIG.TOWER_LASER_BASE_HP,
    };
  }
  return LaserTowerParticle.meta.upgradePaths[0].levels[level - 1].effect;
}

export class LaserTowerParticle extends AbstractParticle {
  static readonly TYPE_NAME = 'laserTower' as const;

  static readonly meta: GameObjectMeta<LaserEffect> = {
    typeName: LaserTowerParticle.TYPE_NAME,
    category: 'tower',
    unlock: {
      id: 'unlock_laser',
      name: 'Laser Tower',
      description: 'Unlock laser towers that damage nearby enemies',
      cost: CONFIG.TOWER_RESEARCH_COSTS.laser,
      durationMs: CONFIG.TOWER_RESEARCH_DURATION_MS.laser,
    },
    upgradePaths: [{
      id: 'laser_upgrades',
      name: 'Laser Tower Upgrade',
      description: 'Improve damage, attack speed, and HP',
      requires: ['unlock_laser'],
      levels: buildLaserLevels(),
    }],
  };

  readonly typeName = LaserTowerParticle.TYPE_NAME;
  readonly towerType = TOWER_TYPE.LASER;

  pendingUpgrade: { startedAtMs: number; durationMs: number } | null = null;
  level: number = 0;
  /** Base range — does not increase per upgrade; global range research adds on top. */
  range: number = CONFIG.TOWER_LASER_BASE_RANGE;
  damage: number = CONFIG.TOWER_LASER_BASE_DAMAGE;
  attackSpeed: number = CONFIG.TOWER_LASER_BASE_ATTACK_SPEED;
  private attackCooldown: number = 0;
  private shotCount: number = 0;
  currentTargetId: number = -1;

  constructor(
    x: number, y: number, owner: 0 | 1,
    deps?: ParticleDependencies,
  ) {
    super(x, y, owner, CONFIG.TOWER_LASER_BASE_HP, 0, CONFIG.TOWER_VISUAL_RADIUS, 0, deps);
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
    return LaserTowerParticle.meta.upgradePaths[0].levels[this.level]?.cost ?? Infinity;
  }

  upgrade(): void {
    const levelData = LaserTowerParticle.meta.upgradePaths[0].levels[this.level];
    if (!levelData) return;
    this.level++;
    const { damage, attackSpeed, hp } = levelData.effect;
    this.damage = damage;
    this.attackSpeed = attackSpeed;
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
      this.health = Math.min(this.maxHealth, this.health + regenRate * dt);
    }

    this.attackCooldown -= dt;
    if (this.attackCooldown > 0) return;

    const rangeBonus = player.getPathLevel('tower_range') * CONFIG.TOWER_RANGE_BONUS_PER_LEVEL;
    const effectiveRange = this.range + rangeBonus;

    const target = this.findNearestEnemy(context, effectiveRange);
    if (!target) {
      this.currentTargetId = -1;
      return;
    }

    this.currentTargetId = target.id;
    this.attackCooldown = 1 / this.attackSpeed;
    this.shotCount++;

    const bounceLevel = player.getPathLevel('laser_bounce');
    const overchargeLevel = player.getPathLevel('laser_overcharge');

    const isOvercharge = overchargeLevel > 0
      && (CONFIG.LASER_OVERCHARGE_BASE_INTERVAL - overchargeLevel + 1) > 0
      && this.shotCount % Math.max(2, CONFIG.LASER_OVERCHARGE_BASE_INTERVAL - overchargeLevel + 1) === 0;
    const damageMultiplier = isOvercharge ? 3 : 1;

    target.takeDamage(this.damage * damageMultiplier, this);

    if (bounceLevel > 0) {
      this.fireBounces(context, target, effectiveRange, bounceLevel, this.damage * damageMultiplier);
    }
  }

  private fireBounces(
    context: GameContext,
    primary: IParticle,
    range: number,
    bounceCount: number,
    damage: number,
  ): void {
    const rangeSq = range * range;
    let excluded = primary.id;
    for (let b = 0; b < bounceCount; b++) {
      let nearest: IParticle | null = null;
      let nearestDist = rangeSq;
      for (const p of context.particles) {
        if (!p.alive || p.owner === this.owner || p.id === excluded) continue;
        const dx = p.x - this.x;
        const dy = p.y - this.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < nearestDist) {
          nearestDist = distSq;
          nearest = p;
        }
      }
      if (!nearest) break;
      nearest.takeDamage(damage * 0.7, this); // bounced shots deal 70% damage
      excluded = nearest.id;
    }
  }

  private findNearestEnemy(context: GameContext, range: number): IParticle | null {
    let nearest: IParticle | null = null;
    let nearestDist = range * range;

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

    return nearest;
  }
}
