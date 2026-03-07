import { CONFIG } from '../config';
import { AbstractParticle, type IParticle, type ParticleDependencies } from './AbstractParticle';
import type { GameContext } from './GameContext';
import { getLaserStats } from './towers';

export class LaserTowerParticle extends AbstractParticle {
  readonly typeName = 'laserTower';
  readonly towerType = 'laser' as const;

  level: number = 0;
  range: number;
  damage: number;
  attackSpeed: number;
  private attackCooldown: number = 0;
  currentTargetId: number = -1;

  constructor(
    x: number, y: number, owner: 0 | 1,
    deps?: ParticleDependencies,
  ) {
    const hp = CONFIG.TOWER_LASER_BASE_HP;
    super(x, y, owner, hp, 0, CONFIG.TOWER_VISUAL_RADIUS, 0, deps);
    const stats = getLaserStats(0);
    this.range = stats.range;
    this.damage = stats.damage;
    this.attackSpeed = stats.attackSpeed;
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

  upgrade(): void {
    this.level++;
    const stats = getLaserStats(this.level);
    this.range = stats.range;
    this.damage = stats.damage;
    this.attackSpeed = stats.attackSpeed;
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
