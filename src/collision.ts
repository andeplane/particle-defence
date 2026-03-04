import type { GameParticle } from './particle';
import type { SpatialHash } from './spatial-hash';
import type { Player } from './player';
import { CONFIG } from './config';

export interface CollisionResult {
  kills: { killer: GameParticle; victim: GameParticle }[];
}

export function resolveCollisions(
  particles: GameParticle[],
  spatialHash: SpatialHash,
  players: [Player, Player]
): CollisionResult {
  const result: CollisionResult = { kills: [] };
  const processed = new Set<number>();

  for (const p of particles) {
    if (!p.alive) continue;

    const nearby = spatialHash.getNearby(p);
    for (const other of nearby) {
      if (!other.alive) continue;
      if (p.owner === other.owner) continue;

      // Cantor pairing function for unique, order-independent key
      const lo = Math.min(p.id, other.id);
      const hi = Math.max(p.id, other.id);
      const pairKey = (lo + hi) * (lo + hi + 1) / 2 + hi;

      if (processed.has(pairKey)) continue;

      const dx = other.x - p.x;
      const dy = other.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = p.radius + other.radius;

      if (dist < minDist && dist > 0) {
        processed.add(pairKey);

        // Both deal damage
        p.takeDamage(other.attack);
        other.takeDamage(p.attack);

        // Elastic bounce
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;

        p.x -= nx * overlap * 0.5;
        p.y -= ny * overlap * 0.5;
        other.x += nx * overlap * 0.5;
        other.y += ny * overlap * 0.5;

        const dvx = p.vx - other.vx;
        const dvy = p.vy - other.vy;
        const dot = dvx * nx + dvy * ny;

        p.vx -= dot * nx;
        p.vy -= dot * ny;
        other.vx += dot * nx;
        other.vy += dot * ny;

        // Track kills
        if (!p.alive) {
          result.kills.push({ killer: other, victim: p });
          players[other.owner].gold += CONFIG.KILL_REWARD;
          players[other.owner].kills++;
        }
        if (!other.alive) {
          result.kills.push({ killer: p, victim: other });
          players[p.owner].gold += CONFIG.KILL_REWARD;
          players[p.owner].kills++;
        }
      }
    }
  }

  return result;
}
