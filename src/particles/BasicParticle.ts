import type { GameObjectMeta } from '../research/types';
import { AbstractParticle } from './AbstractParticle';

export class BasicParticle extends AbstractParticle {
  static readonly TYPE_NAME = 'basic' as const;

  static readonly meta: GameObjectMeta<never> = {
    typeName: BasicParticle.TYPE_NAME,
    category: 'particle',
    upgradePaths: [],
  };

  readonly typeName = BasicParticle.TYPE_NAME;
}
