import { CONFIG, getTowerUpgradeCost, getDebugEverythingCheap } from '../config';
import type { GameObjectMeta, ResearchLevel } from '../research/types';
import { AbstractParticle, type IParticle, type ParticleDependencies } from './AbstractParticle';
import type { GameContext } from './GameContext';

type LaserEffect = {
  damage: number;
  range: number;
  attackSpeed: number;
  hp: number;
};

function buildLaserLevels(count = 20): ResearchLevel<LaserEffect>[] {
  return Array.from({ length: count }, (_, i) => ({
    cost: getTowerUpgradeCost('laser', i),
    effect: {
      damage: CONFIG.TOWER_LASER_BASE_DAMAGE + (i + 1) * CONFIG.TOWER_LASER_DAMAGE_PER_LEVEL,
      range: CONFIG.TOWER_LASER_BASE_RANGE + (i + 1) * CONFIG.TOWER_LASER_RANGE_PER_LEVEL,
      attackSpeed: CONFIG.TOWER_LASER_BASE_ATTACK_SPEED + (i + 1) * CONFIG.TOWER_LASER_ATTACK_SPEED_PER_LEVEL,
      hp: CONFIG.TOWER_LASER_BASE_HP + (i + 1) * CONFIG.TOWER_LASER_HP_PER_LEVEL,
    },
  }));
}

/** Stats at a given level (0 = base, 1+ = after that many upgrades). */
export function getLaserStatsAtLevel(level: number): LaserEffect {
  if (level === 0) {
    return {
      damage: CONFIG.TOWER_LASER_BASE_DAMAGE,
      range: CONFIG.TOWER_LASER_BASE_RANGE,
      attackSpeed: CONFIG.TOWER_LASER_BASE_ATTACK_SPEED,
      hp: CONFIG.TOWER_LASER_BASE_HP,
    };
  }
  return LaserTowerParticle.meta.upgradePaths[0].levels[level - 1].effect;
}

export class LaserTowerParticle extends AbstractParticle {
  static readonly meta: GameObjectMeta<LaserEffect> = {
    typeName: 'laserTower',
    category: 'tower',
    unlock: {
      id: 'unlock_laser',
      name: 'Laser Tower',
      description: 'Unlock laser towers that damage nearby enemies',
      cost: CONFIG.TOWER_RESEARCH_COSTS.laser,
    },
    upgradePaths: [{
      id: 'laser_upgrades',
      name: 'Laser Tower Upgrade',
      description: 'Improve damage, range, and attack speed',
      requires: ['unlock_laser'],
      levels: buildLaserLevels(),
    }],
  };

  readonly typeName = 'laserTower';
  readonly towerType = 'laser' as const;

  level: number = 0;
  range: number = CONFIG.TOWER_LASER_BASE_RANGE;
  damage: number = CONFIG.TOWER_LASER_BASE_DAMAGE;
  attackSpeed: number = CONFIG.TOWER_LASER_BASE_ATTACK_SPEED;
  private attackCooldown: number = 0;
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
    const { damage, range, attackSpeed, hp } = levelData.effect;
    this.damage = damage;
    this.range = range;
    this.attackSpeed = attackSpeed;
    const hpGain = hp - this.maxHealth;
    this.maxHealth = hp;
    this.health += hpGain;
  }

  override onCollide(other: IParticle, _context: GameContext): void {
    this.takeDamage(other.attack * (1 - CONFIG.TOWER_DAMAGE_REDUCTION));
  }

  override onUpdate(dt: number, context: GameContext): void {
    this.attackCooldown -= dt;
    if (this.attackCooldown > 0) return;

    const target = this.findNearestEnemy(context);
    if (!target) {
      this.currentTargetId = -1;
      return;
    }

    this.currentTargetId = target.id;
    target.takeDamage(this.damage);
    this.attackCooldown = 1 / this.attackSpeed;
  }

  private findNearestEnemy(context: GameContext): IParticle | null {
    let nearest: IParticle | null = null;
    let nearestDist = this.range * this.range;

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
