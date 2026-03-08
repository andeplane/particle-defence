import type { TowerType } from '../config';
import { AbstractParticle, type ParticleDependencies } from './AbstractParticle';

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

}
