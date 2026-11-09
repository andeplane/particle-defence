import type { GameObjectMeta } from '../research/types';
import { AbstractParticle } from './AbstractParticle';

export class BasicParticle extends AbstractParticle {
  static readonly meta: GameObjectMeta<never> = {
    typeName: 'basic',
    category: 'particle',
    upgradePaths: [],
  };

  readonly typeName = 'basic';
}
