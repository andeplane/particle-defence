import { AbstractParticle, type ParticleDependencies } from './AbstractParticle';

export class ParticleSpawnerTower extends AbstractParticle {
  static readonly TYPE_NAME = 'spawnerTower' as const;
  readonly typeName = ParticleSpawnerTower.TYPE_NAME;

  get canMove(): boolean {
    return false;
  }

  constructor(x: number, y: number, owner: 0 | 1, deps?: ParticleDependencies) {
    super(x, y, owner, Infinity, 0, 14, 0, deps);
  }

  override isStuck(): boolean {
    return false;
  }

  takeDamage(_amount: number): void {
    // Indestructible — no-op
  }
}
