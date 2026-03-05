import type { IGrid } from '../grid';
import type { ISpatialHash } from '../spatial-hash';
import type { IPlayer } from '../player';
import type { IParticle } from './AbstractParticle';

export interface GameContext {
  grid: IGrid;
  spatialHash: ISpatialHash;
  particles: IParticle[];
  players: [IPlayer, IPlayer];
  gameTimeMs: number;
  killReward: number;
  spawnExplosion(x: number, y: number, color: number): void;
}
