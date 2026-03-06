import { CONFIG } from '../config';
import { AbstractParticle, type ParticleDependencies } from './AbstractParticle';
import type { GameContext } from './GameContext';
import { getSlowStats } from './towers';

export class SlowTowerParticle extends AbstractParticle {
  readonly typeName = 'slowTower';
  readonly towerType = 'slow' as const;

  level: number = 0;
  range: number;
  slowFactor: number;

  constructor(
    x: number, y: number, owner: 0 | 1,
    deps?: ParticleDependencies,
  ) {
    const hp = CONFIG.TOWER_SLOW_BASE_HP;
    super(x, y, owner, hp, 0, 6, 0, deps);
    const stats = getSlowStats(0);
    this.range = stats.range;
    this.slowFactor = stats.slowFactor;
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
    const stats = getSlowStats(this.level);
    this.range = stats.range;
    this.slowFactor = stats.slowFactor;
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
