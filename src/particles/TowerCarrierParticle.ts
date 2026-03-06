import type { TowerType } from '../config';
import { AbstractParticle, type IParticle, type ParticleDependencies } from './AbstractParticle';
import type { GameContext } from './GameContext';

export class TowerCarrierParticle extends AbstractParticle {
  readonly typeName = 'towerCarrier';
  readonly towerType: TowerType;

  constructor(
    x: number, y: number, owner: 0 | 1,
    health: number, speed: number,
    towerType: TowerType,
    deps?: ParticleDependencies,
  ) {
    super(x, y, owner, health, 0, 100, speed, deps);
    this.towerType = towerType;
  }

  override onCollide(other: IParticle, _context: GameContext): void {
    this.takeDamage(other.attack);
  }
}
