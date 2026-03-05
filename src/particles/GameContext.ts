import type { MazeGrid } from '../maze';
import type { SpatialHash } from '../spatial-hash';
import type { Player } from '../player';
import type { AbstractParticle } from './AbstractParticle';

export interface GameContext {
  maze: MazeGrid;
  spatialHash: SpatialHash;
  particles: AbstractParticle[];
  players: [Player, Player];
  gameTimeMs: number;
  spawnExplosion(x: number, y: number, color: number): void;
}
